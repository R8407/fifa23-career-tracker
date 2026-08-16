import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MessageSquare, Heart, MessageCircle, Share2, Send, Star, Lock, ChevronDown, PenLine, Users, Search, X, UserPlus } from 'lucide-react';
import careerExportData from '../data/career_export.json';
import { generateDMReply, isLLMAvailable } from '../utils/llm';
import { LEGENDS, Legend, LegendTier } from '../data/legends';
import { isLegendUnlocked, getLegendConversation, saveLegendConversation, getUnlockedLegends, LegendConversation } from '../utils/legendUnlock';
import { generateFanReactions, FanReaction, PostCategory, POST_CATEGORIES } from '../utils/fanReactions';
import { FanComment } from '../utils/newsLlm';
import { TOP_100_LEGENDS } from '../data/mockData';
import { calculateLegendPoints } from '../utils/trophies';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FeedPost {
  id: string;
  author: string;
  handle: string;
  flag: string;
  verified: boolean;
  content: string;
  likes: number;
  replies: number;
  timeAgo: string;
  fanComments?: FanComment[];
  type?: 'player' | 'league_star' | 'scorer' | 'teammate' | 'title_celebration';
}

interface SocialAccount {
  id: string;
  name: string;
  handle: string;
  flag: string;
  ovr: number;
  position: string;
  club: string;
  accountType: 'teammate' | 'star' | 'legend';
  legendId?: string;
  followers?: number;
}

interface DirectMessage {
  id: string;
  sender: string;
  handle: string;
  flag: string;
  role: string;
  content: string;
  timeAgo: string;
  read: boolean;
  legendId?: string;
  isUser?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const FLAGS: Record<string, string> = {
  'Manchester City': '🩵', 'Man City': '🩵',
  'Manchester Utd': '🔴', 'Man Utd': '🔴',
  'Chelsea': '🔵', 'Liverpool': '🔴', 'Arsenal': '🔴',
  'Tottenham': '⚪', 'Barcelona': '🟡🔴', 'Real Madrid': '⚪',
  'Atletico Madrid': '🔴⚪', 'Bayern Munich': '🔴',
  'Dortmund': '🟡', 'PSG': '🔴🔵',
  'Juventus': '⚪⚫', 'AC Milan': '🔴⚫',
  'Inter Milan': '🔵⚫', 'Roma': '🟡🔴',
  'Lazio': '🔵', 'Napoli': '🔵', 'Spezia': '⚪',
  'default': '⚽',
};

function getFlag(club: string): string {
  return FLAGS[club] || FLAGS.default;
}

function generateTimeAgo(hoursAgo: number): string {
  if (hoursAgo < 1) return 'Just now';
  if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h`;
  const days = Math.floor(hoursAgo / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function timeAgoToHours(timeAgo: string): number {
  if (timeAgo === 'Just now') return 0;
  const n = parseInt(timeAgo, 10) || 0;
  if (timeAgo.endsWith('w')) return n * 168;
  if (timeAgo.endsWith('d')) return n * 24;
  if (timeAgo.endsWith('h')) return n;
  return 24;
}

// ─── Fame / Follower Count System ───────────────────────────────────────────
// Base followers grow with legacy points - higher fame = more followers

function calculateFollowerCount(legacyPoints: number, rank: number, ovr: number): number {
  // Base followers from OVR (a 73 OVR PL player gets ~8K)
  const ovrBase = Math.floor(Math.pow(ovr - 50, 2.5) * 10);
  // Growth from legacy points
  const legacyGrowth = Math.floor(legacyPoints * 50);
  // Rank bonus (top 100 gets massive boost)
  const rankBonus = rank <= 100 ? Math.floor((100 - rank) * 5000) : rank <= 500 ? Math.floor((500 - rank) * 50) : 0;
  return Math.max(100, ovrBase + legacyGrowth + rankBonus);
}

function formatFollowerCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// ─── Social Accounts Database ───────────────────────────────────────────────

function buildSocialAccounts(): SocialAccount[] {
  const data = careerExportData as any;
  const profile = data.my_player_profile || {};
  const currentClub = profile.currentClub || 'Chelsea';
  const accounts: SocialAccount[] = [];

  // Teammates
  const squad = data.my_squad || [];
  for (const tm of squad) {
    if (tm.isUserPlayer) continue;
    const tmName = tm.commonname || `${tm.firstname} ${tm.lastname}`;
    const ovr = parseInt(tm.overallrating || '0');
    accounts.push({
      id: `tm_${tm.playerid}`,
      name: tmName,
      handle: `@${tmName.replace(/\s/g, '')}`,
      flag: getFlag(currentClub),
      ovr,
      position: tm.squad_position || '??',
      club: currentClub,
      accountType: 'teammate',
      followers: ovr * 50000,
    });
  }

  // League top scorers (stars)
  const topScorersByLeague = data.top_scorers_by_league || {};
  const addedStars = new Set<string>();
  for (const [league, scorers] of Object.entries(topScorersByLeague)) {
    for (const s of (scorers as any[]).slice(0, 3)) {
      const sName = s.commonname || `${s.firstname} ${s.lastname}`;
      if (addedStars.has(s.playerid)) continue;
      addedStars.add(s.playerid);
      const ovr = parseInt(s.overallrating || '0');
      accounts.push({
        id: `star_${s.playerid}`,
        name: sName,
        handle: `@${sName.replace(/\s/g, '')}`,
        flag: getFlag(s.teamname),
        ovr,
        position: 'ST',
        club: s.teamname,
        accountType: 'star',
        followers: ovr * 80000,
      });
    }
  }

  // All living legends from TOP_100_LEGENDS (skip if already added as star/teammate)
  const existingNames = new Set(accounts.map(a => a.name.toLowerCase()));
  for (let i = 0; i < TOP_100_LEGENDS.length; i++) {
    const legend = TOP_100_LEGENDS[i];
    if (existingNames.has(legend.name.toLowerCase())) continue;
    accounts.push({
      id: `leg_${legend.id}`,
      name: legend.name,
      handle: `@${legend.name.replace(/\s/g, '')}`,
      flag: legend.flag,
      ovr: 99,
      position: legend.position,
      club: legend.nationality,
      accountType: 'legend',
      legendId: legend.id,
      followers: Math.floor((100 - i) * 200000),
    });
  }

  return accounts;
}

// ─── Feed Post Generation ───────────────────────────────────────────────────

function generateFeedPosts(): FeedPost[] {
  const data = careerExportData as any;
  const profile = data.my_player_profile || {};
  const playerName = `${profile.firstname || 'Ethan'} ${profile.lastname || 'Ampadu'}`.trim();
  const currentClub = profile.currentClub || 'Chelsea';
  const seasons = data.seasons || [];
  const prevSeason = seasons[1] || {};
  const posts: FeedPost[] = [];

  const totalGoals = seasons.reduce((s: number, sn: any) => s + (sn.goals || 0), 0);
  const totalAssists = seasons.reduce((s: number, sn: any) => s + (sn.assists || 0), 0);

  if (totalGoals > 0 || totalAssists > 0) {
    posts.push({
      id: 'player_career_stats',
      author: playerName,
      handle: `@${playerName.replace(/\s/g, '')}`,
      flag: '🏴󠁧󠁢󠁳󠁯󠁼󠁧󠁿',
      verified: true,
      content: `${totalGoals} goals and ${totalAssists} assists across ${seasons.length} season${seasons.length > 1 ? 's' : ''}. The journey continues at ${currentClub}. 🔥`,
      likes: Math.floor(Math.random() * 5000) + 500,
      replies: Math.floor(Math.random() * 300) + 50,
      timeAgo: '2h',
      type: 'player',
    });
  }

  if (prevSeason.apps > 0) {
    posts.push({
      id: 'prev_season_recap',
      author: playerName,
      handle: `@${playerName.replace(/\s/g, '')}`,
      flag: '🏴󠁧󠁢󠁳󠁯󠁼󠁧󠁿',
      verified: true,
      content: `Last season at ${prevSeason.club}: ${prevSeason.goals}G, ${prevSeason.assists}A in ${prevSeason.apps} apps. ${prevSeason.individualAwards?.length || 0} individual awards. Time to do it again. \u{1F4AA}`,
      likes: Math.floor(Math.random() * 8000) + 1000,
      replies: Math.floor(Math.random() * 500) + 100,
      timeAgo: '1d',
      type: 'player',
    });
  }

  // League top scorer posts — use real data from career_export
  const topScorersByLeague = data.top_scorers_by_league || {};
  for (const [league, scorers] of Object.entries(topScorersByLeague)) {
    const top = (scorers as any[])[0];
    if (!top) continue;
    const name = top.commonname || `${top.firstname} ${top.lastname}`;
    const goals = top.leaguegoals || top.goals || 0;
    const assists = top.assists || 0;
    const leaguePostTemplates = [
      `${name} (${top.teamname}) leads ${league} with ${goals} goals. The race is on. 🏆`,
      `${name} is on fire! ${goals} goals in ${league} this season. 🔥`,
      `${goals} goals, ${assists} assists — ${name} dominates ${league}. ⚽`,
      `${top.teamname}'s ${name} tops ${league} scoring charts with ${goals} goals. 👑`,
    ];
    posts.push({
      id: `scorer_${league.replace(/\s/g, '_')}`,
      author: `${league} Official`,
      handle: `@${league.replace(/\s/g, '')}`,
      flag: getFlag(top.teamname),
      verified: true,
      content: leaguePostTemplates[Math.floor(Math.random() * leaguePostTemplates.length)],
      likes: Math.floor(Math.random() * 50000) + 10000,
      replies: Math.floor(Math.random() * 2000) + 500,
      timeAgo: generateTimeAgo(Math.random() * 48),
      type: 'league_star',
    });
  }

  // Teammate posts — dynamic based on their stats and relationship
  const squad = data.my_squad || [];
  const betterTeammates = squad
    .filter((p: any) => parseInt(p.overallrating || '0') > parseInt(profile.overallrating || '0'))
    .slice(0, 3);

  const tmPostTemplates = [
    `Training with the squad. The team is looking sharp. Big season ahead. 💪`,
    `Great session today. ${currentClub} family is building something special. 🔵`,
    `Match day vibes. Ready to give everything for the badge. ⚽`,
    `Hard work in training pays off on the pitch. Let's go! 🔥`,
    `The chemistry in this squad is unreal. We're going to have a big season. 💙`,
    `Another win! The boys delivered today. On to the next one. 🏆`,
    `Recovery session after a tough match. Staying focused. 💪`,
    `Proud to wear this shirt. The fans deserve everything. 🔵`,
  ];

  for (const tm of betterTeammates) {
    const tmName = tm.commonname || `${tm.firstname} ${tm.lastname}`;
    posts.push({
      id: `tm_${tm.playerid}`,
      author: tmName,
      handle: `@${tmName.replace(/\s/g, '')}`,
      flag: getFlag(currentClub),
      verified: false,
      content: tmPostTemplates[Math.floor(Math.random() * tmPostTemplates.length)],
      likes: Math.floor(Math.random() * 10000) + 2000,
      replies: Math.floor(Math.random() * 500) + 100,
      timeAgo: generateTimeAgo(Math.random() * 24),
      type: 'teammate',
    });
  }

  // ── Title Celebration Posts (league, CL, major cups) ──
  const trophies = data.trophies || [];
  const titleTrophies = trophies.filter((t: any) =>
    t.quantity > 0 && (t.iconType === 'league' || t.iconType === 'champions' || t.iconType === 'europaleague' || t.iconType === 'cup')
  );

  for (const trophy of titleTrophies) {
    const isLeague = trophy.iconType === 'league';
    const isUCL = trophy.iconType === 'champions';
    const isUEL = trophy.iconType === 'europaleague';
    const isCup = trophy.iconType === 'cup';

    const titleName = isLeague ? 'league title' : isUCL ? 'Champions League' : isUEL ? 'Europa League' : 'cup trophy';

    // Teammate celebration posts (2-3 teammates)
    const celebrationTeammates = squad.slice(0, 3);
    const tmCelebTemplates = [
      `CHAMPIONS!! 🏆 What a feeling to lift the ${titleName} with ${currentClub}. This squad is special. We made history together. @${playerName.replace(/\s/g, '')} you were immense all season. 💙`,
      `We did it! ${titleName} winners! 🥇 From day one in pre-season, we believed. ${playerName} you carried us in the big moments. Proud to share this dressing room with you. 🔵🏆`,
      `${titleName} CHAMPIONS! 🎉 This is what we worked for. Every training session, every match — it all led to this moment. ${playerName} my brother, we did it! 💪🏆`,
      `INCOMING!! 🚨 ${titleName} winners! The celebrations start now. ${playerName} you're built different. This is just the beginning for this team. 🏆💙`,
    ];

    for (let i = 0; i < Math.min(3, celebrationTeammates.length); i++) {
      const tm = celebrationTeammates[i];
      const tmName = tm.commonname || `${tm.firstname} ${tm.lastname}`;
      posts.push({
        id: `title_tm_${tm.playerid}_${trophy.id}`,
        author: tmName,
        handle: `@${tmName.replace(/\s/g, '')}`,
        flag: getFlag(currentClub),
        verified: false,
        content: tmCelebTemplates[i % tmCelebTemplates.length],
        likes: Math.floor(Math.random() * 30000) + 10000,
        replies: Math.floor(Math.random() * 2000) + 500,
        timeAgo: 'Just now',
        type: 'title_celebration',
      });
    }

    // Legend celebration posts (1-2 legends who played for this club)
    const legendCelebTemplates = [
      `Congratulations to ${playerName} and ${currentClub} on winning the ${titleName}! 🏆 I know what it means to lift that trophy at this club. The fans, the history, the pressure — you delivered. Enjoy every second. Well deserved.`,
      `Champions! ${playerName} I wore this shirt with pride, and now you've added to its legacy. To win the ${titleName} at ${currentClub} is special. Keep this hunger. The great ones always want more. Proud of you. 🏆`,
      `${titleName} winners! ${playerName} you've joined an elite group of ${currentClub} legends. I know what this club demands — excellence every week. You delivered. This is just the start. 🏆⚽`,
    ];

    // Find legends who played for the user's current club
    const clubLegends = TOP_100_LEGENDS.filter(l => {
      if (!l.clubs) return false;
      return l.clubs.some(c => c.toLowerCase().includes(currentClub.toLowerCase()) ||
        currentClub.toLowerCase().includes(c.toLowerCase()));
    }).slice(0, 2);

    // Fallback if no club legends found
    const legendsToShow = clubLegends.length > 0 ? clubLegends : [
      { name: 'Thierry Henry', handle: '@TitiHenry', flag: '🇫🇷' },
      { name: 'Rio Ferdinand', handle: '@RioFerdinand', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    ];

    for (let i = 0; i < legendsToShow.length; i++) {
      const legend = legendsToShow[i];
      posts.push({
        id: `title_legend_${i}_${trophy.id}`,
        author: legend.name,
        handle: `@${legend.name.replace(/\s/g, '')}`,
        flag: legend.flag,
        verified: true,
        content: legendCelebTemplates[i % legendCelebTemplates.length],
        likes: Math.floor(Math.random() * 100000) + 50000,
        replies: Math.floor(Math.random() * 10000) + 2000,
        timeAgo: 'Just now',
        type: 'title_celebration',
      });
    }
  }

  // Newest events first — just-won trophies at the top of the feed
  posts.sort((a, b) => timeAgoToHours(a.timeAgo) - timeAgoToHours(b.timeAgo));

  return posts;
}

// ─── Fan Reactions (from LLM) ───────────────────────────────────────────────

const generateFanReactionsLLM = async (postContent: string, hofPoints: number, category?: PostCategory): Promise<FanReaction[]> => {
  if (!isLLMAvailable()) {
    return [
      { name: 'FootballFan_UK', handle: '@FootballFan_UK', flag: '🇬🇧', text: 'This is incredible! Keep pushing!', likes: Math.floor(Math.random() * 1000), shares: Math.floor(Math.random() * 50) },
      { name: 'TacticsNerd', handle: '@TacticsNerd', flag: '🧠', text: 'The stats back it up. Elite performance.', likes: Math.floor(Math.random() * 800), shares: Math.floor(Math.random() * 30) },
    ];
  }
  return generateFanReactions(postContent, hofPoints, category);
};

// ─── Main Component ─────────────────────────────────────────────────────────

type SocialTab = 'feed' | 'followers' | 'dms';

export function SocialMediaView() {
  const [activeTab, setActiveTab] = useState<SocialTab>('feed');
  const [followerSubTab, setFollowerSubTab] = useState<'followers' | 'following'>('followers');
  const [selectedDM, setSelectedDM] = useState<DirectMessage | null>(null);
  const [userPost, setUserPost] = useState('');
  const [postCategory, setPostCategory] = useState<PostCategory | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isGeneratingReactions, setIsGeneratingReactions] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [dmInput, setDmInput] = useState('');
  const [dmTyping, setDmTyping] = useState(false);
  const [legendConversations, setLegendConversations] = useState<Record<string, LegendConversation>>(() => {
    try {
      const saved = localStorage.getItem('career_legend_conversations');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [searchQuery, setSearchQuery] = useState('');

  // User feed post
  const [userFeedPost, setUserFeedPost] = useState<{ content: string; reactions: FanReaction[]; category?: PostCategory; id?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('social_user_post');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [visibleReactionCount, setVisibleReactionCount] = useState(0);

  // Following list (who I follow)
  const [followingList, setFollowingList] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('career_social_following');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });

  // Follower list (who follows me - computed from followingList + mutual logic)
  const [manualFollowers, setManualFollowers] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('career_social_manual_followers');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });

  // Notification tracking
  const [newFeedCount, setNewFeedCount] = useState(0);
  const [newDMCount, setNewDMCount] = useState(0);

  // Legacy points — pure merit (G+A + trophies only)
  const legendPoints = useMemo(() => {
    try {
      const d = careerExportData as any;
      const seasons = d.seasons || [];
      const trophies = d.trophies || [];
      const totalGoals = seasons.reduce((s: number, sn: any) => s + (sn.goals || 0), 0);
      const totalAssists = seasons.reduce((s: number, sn: any) => s + (sn.assists || 0), 0);
      const findTrophy = (name: string) => {
        const t = trophies.find((tr: any) => tr.title?.toLowerCase().includes(name.toLowerCase()));
        return t ? (t.quantity || t.yearsWon?.length || 0) : 0;
      };
      return calculateLegendPoints({
        goals: totalGoals,
        assists: totalAssists,
        ballondOr: findTrophy('ballon'),
        worldCup: findTrophy('world cup'),
        championsLeague: findTrophy('champions'),
        europaLeague: findTrophy('europa'),
        leagueTitles: findTrophy('league'),
        cupTrophies: findTrophy('cup'),
        goldenBoot: findTrophy('golden boot'),
        assistKing: findTrophy('assist king'),
        manOfTheMatch: findTrophy('man of match'),
        popularOpinionBonus: 20  // Same as HallOfFameView
      });
    } catch { return 0; }
  }, []);

  // Pure merit only — no record points
  const totalLegacyPoints = legendPoints;

  // Player data
  const data = careerExportData as any;
  const profile = data.my_player_profile || {};
  const playerName = `${profile.firstname || 'Ethan'} ${profile.lastname || 'Ampadu'}`.trim();
  const currentClub = profile.currentClub || 'Chelsea';
  const userOVR = parseInt(profile.overallrating || '73');

  // Feed posts
  const posts = useMemo(() => generateFeedPosts(), []);

  // Staggered fan reaction reveal
  useEffect(() => {
    if (!userFeedPost || userFeedPost.reactions.length === 0) return;
    setVisibleReactionCount(0);
    const total = userFeedPost.reactions.length;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleReactionCount(count);
      if (count >= total) clearInterval(interval);
    }, 1200 + Math.random() * 800); // 1.2–2s per comment
    return () => clearInterval(interval);
  }, [userFeedPost?.id]);

  // Build all social accounts
  const allAccounts = useMemo(() => buildSocialAccounts(), []);

  // User's rank based on legacy points
  const userRank = useMemo(() => {
    const pts = totalLegacyPoints;
    if (pts >= 3000) return 1;
    if (pts >= 2000) return 10;
    if (pts >= 1500) return 25;
    if (pts >= 1000) return 50;
    if (pts >= 500) return 150;
    if (pts >= 200) return 300;
    if (pts >= 50) return 500;
    return 999;
  }, [totalLegacyPoints]);

  // My total follower count (fame-based)
  const myFollowerCount = useMemo(() => calculateFollowerCount(totalLegacyPoints, userRank, userOVR), [totalLegacyPoints, userRank, userOVR]);

  // Filtered social accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return allAccounts;
    const q = searchQuery.toLowerCase();
    return allAccounts.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.handle.toLowerCase().includes(q) ||
      a.club.toLowerCase().includes(q) ||
      a.position.toLowerCase().includes(q) ||
      a.accountType.toLowerCase().includes(q)
    );
  }, [allAccounts, searchQuery]);

  // ── Legend mutual follow logic: if I follow them AND my legacy >= theirs, they follow me back ──
  const isLegendMutual = useCallback((legendId: string): boolean => {
    if (!followingList.has(`leg_${legendId}`)) return false;
    const legend = TOP_100_LEGENDS.find(l => l.id === legendId);
    if (!legend) return false;
    // Use same formula as HallOfFameView leaderboard
    const legendLegacy = calculateLegendPoints({
      goals: legend.goals,
      assists: legend.assists,
      ballondOr: legend.ballondOr,
      worldCup: legend.worldCup,
      championsLeague: 0,
      europaLeague: 0,
      leagueTitles: 0,
      cupTrophies: legend.clubTrophies,
      goldenBoot: 0,
      assistKing: 0,
      manOfTheMatch: 0,
      popularOpinionBonus: legend.popularOpinionBonus,
    });
    return totalLegacyPoints >= legendLegacy;
  }, [followingList, totalLegacyPoints]);

  // Teammates follow based on OVR proximity (within 10)
  const isTeammateMutual = useCallback((accountId: string): boolean => {
    if (!followingList.has(accountId)) return false;
    const account = allAccounts.find(a => a.id === accountId);
    if (!account) return false;
    return Math.abs(account.ovr - userOVR) <= 10;
  }, [followingList, userOVR, allAccounts]);

  // Stars follow based on OVR tier proximity (within 5)
  const isStarMutual = useCallback((accountId: string): boolean => {
    if (!followingList.has(accountId)) return false;
    const account = allAccounts.find(a => a.id === accountId);
    if (!account) return false;
    const userTier = Math.floor(userOVR / 5) * 5;
    const starTier = Math.floor(account.ovr / 5) * 5;
    return Math.abs(userTier - starTier) <= 5;
  }, [followingList, userOVR, allAccounts]);

  // All mutual follows (for DM eligibility)
  const isMutualFollow = useCallback((accountId: string): boolean => {
    const account = allAccounts.find(a => a.id === accountId);
    if (!account) return false;
    if (account.accountType === 'legend') return isLegendMutual(account.legendId!);
    if (account.accountType === 'teammate') return isTeammateMutual(accountId);
    if (account.accountType === 'star') return isStarMutual(accountId);
    return false;
  }, [allAccounts, isLegendMutual, isTeammateMutual, isStarMutual]);

  // ── Compute followers list (who follows ME) ──
  const myFollowers = useMemo(() => {
    const followers: SocialAccount[] = [];
    for (const account of allAccounts) {
      if (isMutualFollow(account.id) || manualFollowers.has(account.id)) {
        followers.push(account);
      }
    }
    return followers;
  }, [allAccounts, isMutualFollow, manualFollowers]);

  // Following list (accounts I follow)
  const myFollowing = useMemo(() => {
    return allAccounts.filter(a => followingList.has(a.id));
  }, [allAccounts, followingList]);

  // DM conversation history for all DMs
  const [dmConversations, setDmConversations] = useState<Record<string, Array<{ role: 'user' | 'assistant'; content: string }>>>(() => {
    try {
      const saved = localStorage.getItem('career_dm_conversations');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Persist read status for DMs
  const [readDMs, setReadDMs] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('career_dm_read');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  // ── DMs: Only mutual follows + coach + unlocked legends ──
  const allDMs = useMemo(() => {
    const seasons = data.seasons || [];
    const prevSeason = seasons[1] || {};
    const dms: DirectMessage[] = [];

    // Coach DM
    dms.push({
      id: 'dm_coach',
      sender: 'Coach',
      handle: '@Coach',
      flag: '👔',
      role: 'coach',
      content: `Welcome to ${currentClub}. I have been watching your performances. The team needs your energy.`,
      timeAgo: '3d',
      read: readDMs.has('dm_coach'),
    });

    // Mutual follow teammates
    for (const tm of allAccounts.filter(a => a.accountType === 'teammate' && isMutualFollow(a.id))) {
      const dmId = `dm_${tm.id}`;
      dms.push({
        id: dmId,
        sender: tm.name,
        handle: tm.handle,
        flag: tm.flag,
        role: 'teammate',
        content: `Hey, saw your highlights from last season. Impressive numbers. Let's connect on the pitch.`,
        timeAgo: '2d',
        read: readDMs.has(dmId),
      });
    }

    // Mutual follow stars
    for (const star of allAccounts.filter(a => a.accountType === 'star' && isMutualFollow(a.id))) {
      const dmId = `dm_${star.id}`;
      dms.push({
        id: dmId,
        sender: star.name,
        handle: star.handle,
        flag: star.flag,
        role: 'star',
        content: `Respect your game. Keep working hard, the talent is there.`,
        timeAgo: '1w',
        read: readDMs.has(dmId),
      });
    }

    // Legend DMs: trigger when player surpasses them in legacy (no follow required)
    for (const legend of allAccounts.filter(a => a.accountType === 'legend')) {
      if (!legend.legendId) continue;
      const legendLegacy = calculateLegendPoints({
        goals: (TOP_100_LEGENDS.find(l => l.id === legend.legendId)?.goals || 0),
        assists: (TOP_100_LEGENDS.find(l => l.id === legend.legendId)?.assists || 0),
        ballondOr: (TOP_100_LEGENDS.find(l => l.id === legend.legendId)?.ballondOr || 0),
        worldCup: (TOP_100_LEGENDS.find(l => l.id === legend.legendId)?.worldCup || 0),
        championsLeague: 0,
        europaLeague: 0,
        leagueTitles: 0,
        cupTrophies: (TOP_100_LEGENDS.find(l => l.id === legend.legendId)?.clubTrophies || 0),
        goldenBoot: 0,
        assistKing: 0,
        manOfTheMatch: 0,
      });
      if (totalLegacyPoints < legendLegacy) continue;
      const dmId = `dm_${legend.id}`;
      dms.push({
        id: dmId,
        sender: legend.name,
        handle: legend.handle,
        flag: legend.flag,
        role: 'legend',
        content: `I have been watching your career. At your age with your numbers, you remind me of myself. Keep going.`,
        timeAgo: '1w',
        read: readDMs.has(dmId),
        legendId: legend.legendId,
      });
    }

    return dms;
  }, [totalLegacyPoints, currentClub, allAccounts, isMutualFollow, readDMs]);

  const unreadCount = allDMs.filter(d => !d.read).length;

  // Save following to localStorage
  useEffect(() => {
    localStorage.setItem('career_social_following', JSON.stringify([...followingList]));
  }, [followingList]);

  useEffect(() => {
    localStorage.setItem('career_social_manual_followers', JSON.stringify([...manualFollowers]));
  }, [manualFollowers]);

  useEffect(() => {
    localStorage.setItem('career_legend_conversations', JSON.stringify(legendConversations));
  }, [legendConversations]);

  useEffect(() => {
    localStorage.setItem('career_dm_conversations', JSON.stringify(dmConversations));
  }, [dmConversations]);

  useEffect(() => {
    localStorage.setItem('career_dm_read', JSON.stringify([...readDMs]));
  }, [readDMs]);

  // Save all state on unmount (safety net for rapid tab switches)
  useEffect(() => {
    return () => {
      try {
        localStorage.setItem('career_social_following', JSON.stringify([...followingList]));
        localStorage.setItem('career_social_manual_followers', JSON.stringify([...manualFollowers]));
        localStorage.setItem('career_legend_conversations', JSON.stringify(legendConversations));
        localStorage.setItem('career_dm_conversations', JSON.stringify(dmConversations));
        localStorage.setItem('career_dm_read', JSON.stringify([...readDMs]));
      } catch { /* ignore quota errors */ }
    };
  }, [followingList, manualFollowers, legendConversations, dmConversations, readDMs]);

  const toggleFollow = (id: string) => {
    setFollowingList(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // Post handlers
  const handlePostSubmit = async () => {
    if (!userPost.trim()) return;
    // Show category picker before posting
    setShowCategoryPicker(true);
  };

  const handlePostWithCategory = async (category: PostCategory) => {
    setShowCategoryPicker(false);
    setPostCategory(category);
    setIsGeneratingReactions(true);
    try {
      const reactions = await generateFanReactionsLLM(userPost, totalLegacyPoints, category);
      const newPost = { content: userPost, reactions, category, id: `user_post_${Date.now()}` };
      setUserFeedPost(newPost);
      localStorage.setItem('social_user_post', JSON.stringify(newPost));
    } catch (e) {
      const newPost = { content: userPost, reactions: [], category, id: `user_post_${Date.now()}` };
      setUserFeedPost(newPost);
      localStorage.setItem('social_user_post', JSON.stringify(newPost));
    }
    setIsGeneratingReactions(false);
    setUserPost('');
    setPostCategory(null);
  };

  const handleDeletePost = () => {
    setUserFeedPost(null);
    localStorage.removeItem('social_user_post');
  };

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) { next.delete(postId); } else { next.add(postId); }
      return next;
    });
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) { next.delete(postId); } else { next.add(postId); }
      return next;
    });
  };

  // DM handlers
  const handleDMSend = async () => {
    if (!dmInput.trim() || !selectedDM) return;
    const sentMessage = dmInput;
    setDmInput('');
    setDmTyping(true);

    // Store user message for ALL DM types
    const dmId = selectedDM.id;
    setDmConversations(prev => {
      const next = { ...prev };
      next[dmId] = [...(next[dmId] || []), { role: 'user' as const, content: sentMessage }];
      return next;
    });

    try {
      if (selectedDM.legendId) {
        const reply = await generateDMReply(
          selectedDM.sender,
          selectedDM.role,
          sentMessage,
          '',
          { name: playerName, ovr: userOVR, goals: 0, assists: 0, avgRating: '0', motm: 0, club: currentClub, age: 16 }
        );
        const newConv: LegendConversation = {
          legendId: selectedDM.legendId,
          messages: [
            ...((legendConversations[selectedDM.legendId]?.messages) || []),
            { role: 'user' as const, content: sentMessage, timeAgo: 'Just now' },
            { role: 'assistant' as const, content: reply, timeAgo: 'Just now' },
          ],
          lastActivity: Date.now(),
          unlockedAt: Date.now(),
        };
        saveLegendConversation(selectedDM.legendId, newConv);
        setLegendConversations(prev => ({ ...prev, [selectedDM.legendId!]: newConv }));
      } else {
        // Coach, teammates, stars — generate reply and store in dmConversations
        const reply = await generateDMReply(
          selectedDM.sender,
          selectedDM.role,
          sentMessage,
          '',
          { name: playerName, ovr: userOVR, goals: 0, assists: 0, avgRating: '0', motm: 0, club: currentClub, age: 16 }
        );
        setDmConversations(prev => {
          const next = { ...prev };
          next[dmId] = [...(next[dmId] || []), { role: 'assistant' as const, content: reply }];
          return next;
        });
        // Persist to localStorage
        const allConvs = { ...dmConversations, [dmId]: [...(dmConversations[dmId] || []), { role: 'user' as const, content: sentMessage }, { role: 'assistant' as const, content: reply }] };
        localStorage.setItem('career_dm_conversations', JSON.stringify(allConvs));
      }
    } catch (e) {
      console.log('[DM] Error:', e);
    }
    setDmTyping(false);
  };

  const clearNotifications = (tab: SocialTab) => {
    if (tab === 'feed') setNewFeedCount(0);
    if (tab === 'dms') setNewDMCount(0);
  };

  // ── Render ──
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">SOCIAL HUB</h2>
              <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-full">LIVE</span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">Fan debates, pundit reactions, and direct messages</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-amber-400">{formatFollowerCount(myFollowerCount)}</div>
            <div className="text-[10px] text-zinc-500 uppercase">Followers</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button onClick={() => { setActiveTab('feed'); clearNotifications('feed'); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'feed' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}>
          Feed
          {newFeedCount > 0 && activeTab !== 'feed' && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">{newFeedCount}</span>}
        </button>
        <button onClick={() => setActiveTab('followers')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'followers' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}>
          <Users className="w-3.5 h-3.5" />
          {followerSubTab === 'followers' ? 'Followers' : 'Following'}
        </button>
        <button onClick={() => { setActiveTab('dms'); clearNotifications('dms'); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'dms' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}>
          <MessageSquare className="w-3.5 h-3.5" />
          Messages
          {unreadCount > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">{unreadCount}</span>}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FEED TAB                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'feed' && (
        <div className="space-y-3">
          {/* User Post Creation */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <PenLine className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-zinc-400 uppercase">Create Post</span>
            </div>
            <textarea value={userPost} onChange={(e) => setUserPost(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handlePostSubmit())}
              placeholder="What's on your mind about your career?"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 resize-none h-20" />
            <div className="flex justify-end mt-2">
              <button onClick={handlePostSubmit} disabled={!userPost.trim() || isGeneratingReactions}
                className="px-4 py-2 bg-amber-500 text-zinc-950 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isGeneratingReactions ? 'Generating...' : 'Post'}
              </button>
            </div>
          </div>

          {/* Category Picker Modal */}
          {showCategoryPicker && (
            <div className="bg-zinc-900/95 border border-amber-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase">Choose Post Category</span>
                <button onClick={() => setShowCategoryPicker(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-zinc-500">This helps fans react contextually to your post.</p>
              <div className="grid grid-cols-2 gap-2">
                {POST_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handlePostWithCategory(cat.id)}
                    className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-left hover:border-amber-500/50 hover:bg-zinc-700/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-xs font-bold text-white">{cat.label}</span>
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-1">{cat.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* User's posted card with AI fan reactions */}
          {userFeedPost && (
            <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-lg">{'🏴󠁧󠁢󠁳󠁯󠁼󠁧󠁿'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{playerName}</span>
                      <span className="text-xs text-zinc-500">@{playerName.replace(/\s/g, '')}</span>
                      <span className="text-xs text-amber-400">Just now</span>
                      {userFeedPost.category && (
                        <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] font-bold rounded uppercase border border-zinc-700">
                          {POST_CATEGORIES.find(c => c.id === userFeedPost.category)?.icon} {POST_CATEGORIES.find(c => c.id === userFeedPost.category)?.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 mt-1">{userFeedPost.content}</p>
                    <div className="flex items-center gap-6 mt-3">
                      <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <Heart className="w-3.5 h-3.5" /> {userFeedPost.reactions.reduce((s, r) => s + r.likes, 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-blue-400">
                        <MessageCircle className="w-3.5 h-3.5" /> {userFeedPost.reactions.length}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <Share2 className="w-3.5 h-3.5" /> {userFeedPost.reactions.reduce((s, r) => s + r.shares, 0).toLocaleString()}
                      </span>
                      <button onClick={handleDeletePost} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors ml-auto">
                        <X className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {userFeedPost.reactions.length > 0 && (
                <div className="border-t border-zinc-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Fan Reactions</span>
                  </div>
                  {userFeedPost.reactions.slice(0, visibleReactionCount).map((reaction, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-zinc-800/50 animate-fadeIn">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-sm">{reaction.flag}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-300">{reaction.name}</span>
                          <span className="text-[10px] text-zinc-600">&bull; Just now</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{reaction.text}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <button className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-red-400 transition-colors">
                            <Heart className="w-3 h-3" /> {reaction.likes.toLocaleString()}
                          </button>
                          <button className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-blue-400 transition-colors">
                            <MessageCircle className="w-3 h-3" /> Reply
                          </button>
                          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <Share2 className="w-3 h-3" /> {reaction.shares.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {visibleReactionCount < userFeedPost.reactions.length && (
                    <div className="flex gap-3 p-3 rounded-xl bg-zinc-800/30 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-zinc-700/50 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce ml-1" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce ml-1" style={{ animationDelay: '300ms' }} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-zinc-600 italic">typing...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feed Posts */}
          {posts.map(post => {
            const isLiked = likedPosts.has(post.id);
            const likeCount = isLiked ? post.likes + 1 : post.likes;
            return (
              <div key={post.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-lg">{post.flag}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{post.author}</span>
                        {post.verified && <span className="text-blue-400 text-xs">{'\u2713'}</span>}
                        <span className="text-xs text-zinc-500">{post.handle}</span>
                        <span className="text-xs text-zinc-600">{post.timeAgo}</span>
                      </div>
                      <p className="text-sm text-zinc-300 mt-1">{post.content}</p>
                      <div className="flex items-center gap-6 mt-3">
                        <button onClick={() => toggleLike(post.id)}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${isLiked ? 'text-red-400' : 'text-zinc-500 hover:text-red-400'}`}>
                          <Heart className="w-3.5 h-3.5" /> {likeCount.toLocaleString()}
                        </button>
                        <button onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-400 transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" /> {post.replies.toLocaleString()}
                        </button>
                        <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-green-400 transition-colors">
                          <Share2 className="w-3.5 h-3.5" /> {Math.floor(post.replies * 0.3).toLocaleString()}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {expandedComments.has(post.id) && post.fanComments && post.fanComments.length > 0 && (
                  <div className="border-t border-zinc-800 p-4 space-y-2">
                    {post.fanComments.map((comment, i) => (
                      <div key={i} className="flex gap-2 p-2 rounded-lg bg-zinc-800/50">
                        <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs">{comment.flag}</div>
                        <div>
                          <span className="text-xs font-bold text-zinc-400">{comment.name}</span>
                          <span className="text-[10px] text-zinc-600 ml-2">{comment.handle}</span>
                          <p className="text-xs text-zinc-400 mt-0.5">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FOLLOWERS TAB                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'followers' && (
        <div className="space-y-3">
          {/* Sub-tabs: Followers | Following */}
          <div className="flex gap-2">
            <button onClick={() => setFollowerSubTab('followers')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${followerSubTab === 'followers' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}>
              <Users className="w-3.5 h-3.5" /> Followers
              <span className="text-[9px] bg-zinc-700 px-1.5 py-0.5 rounded-full">{myFollowers.length} + {Math.max(0, myFollowerCount - myFollowers.length)}</span>
            </button>
            <button onClick={() => setFollowerSubTab('following')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${followerSubTab === 'following' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}>
              <UserPlus className="w-3.5 h-3.5" /> Following
              <span className="text-[9px] bg-zinc-700 px-1.5 py-0.5 rounded-full">{myFollowing.length}</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-500" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players, legends, stars..."
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none" />
              {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-4 h-4 text-zinc-500 hover:text-white" /></button>}
            </div>
          </div>

          {/* Followers Sub-Tab */}
          {followerSubTab === 'followers' && (
            <div className="space-y-3">
              {/* Follower Stats */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{formatFollowerCount(myFollowerCount)}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Total Followers</div>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">#{userRank <= 999 ? userRank : '999+'}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Global Rank</div>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{totalLegacyPoints}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Legacy Pts</div>
                  </div>
                </div>
              </div>

              {/* Important people who follow me */}
              {myFollowers.length > 0 && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-800">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notable Followers</div>
                  </div>
                  {myFollowers.slice(0, 10).map(follower => (
                    <div key={follower.id} className="p-4 flex items-center gap-3 border-b border-zinc-800/50 last:border-b-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${follower.accountType === 'legend' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-zinc-800'}`}>
                        {follower.flag}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${follower.accountType === 'legend' ? 'text-amber-400' : 'text-white'}`}>{follower.name}</span>
                          {follower.accountType === 'legend' && <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-amber-500/10 text-amber-400 border-amber-500/30">legend</span>}
                          {follower.accountType === 'star' && <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-blue-500/10 text-blue-400 border-blue-500/30">star</span>}
                          <span className="text-[10px] text-zinc-600">{follower.position}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{follower.club} &bull; {follower.ovr} OVR</p>
                      </div>
                      <span className="text-[10px] text-zinc-500">{formatFollowerCount(follower.followers || 0)} followers</span>
                    </div>
                  ))}
                  {/* Padding: "X others" */}
                  {myFollowers.length > 0 && (
                    <div className="p-4 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 text-center">
                        & {Math.max(0, myFollowerCount - myFollowers.length).toLocaleString()} others follow you
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Search results (all accounts) */}
              {searchQuery && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-800">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Search Results ({filteredAccounts.length})</div>
                  </div>
                  {filteredAccounts.slice(0, 20).map(account => (
                    <div key={account.id} className="p-4 flex items-center gap-3 border-b border-zinc-800/50 last:border-b-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${account.accountType === 'legend' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-zinc-800'}`}>
                        {account.flag}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${account.accountType === 'legend' ? 'text-amber-400' : 'text-white'}`}>{account.name}</span>
                          {account.accountType === 'legend' && <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-amber-500/10 text-amber-400 border-amber-500/30">legend</span>}
                          {account.accountType === 'star' && <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-blue-500/10 text-blue-400 border-blue-500/30">star</span>}
                          <span className="text-[10px] text-zinc-600">{account.ovr} OVR</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{account.club} &bull; {account.position}</p>
                      </div>
                      <button onClick={() => toggleFollow(account.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                          followingList.has(account.id)
                            ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                            : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                        }`}>
                        {followingList.has(account.id) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Following Sub-Tab */}
          {followerSubTab === 'following' && (
            <div className="space-y-3">
              {myFollowing.length === 0 && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 text-center">
                  <UserPlus className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">You are not following anyone yet.</p>
                  <p className="text-xs text-zinc-600 mt-1">Search for players and legends to follow them.</p>
                </div>
              )}
              {myFollowing.length > 0 && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-800">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Following ({myFollowing.length})</div>
                  </div>
                  {myFollowing.map(account => {
                    const mutual = isMutualFollow(account.id);
                    return (
                      <div key={account.id} className="p-4 flex items-center gap-3 border-b border-zinc-800/50 last:border-b-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${account.accountType === 'legend' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-zinc-800'}`}>
                          {account.flag}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${account.accountType === 'legend' ? 'text-amber-400' : 'text-white'}`}>{account.name}</span>
                            {account.accountType === 'legend' && <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-amber-500/10 text-amber-400 border-amber-500/30">legend</span>}
                            {account.accountType === 'star' && <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-blue-500/10 text-blue-400 border-blue-500/30">star</span>}
                            {mutual && <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-green-500/10 text-green-400 border-green-500/30">mutual</span>}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{account.club} &bull; {account.position} &bull; {account.ovr} OVR</p>
                        </div>
                        <button onClick={() => toggleFollow(account.id)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors bg-zinc-700 text-zinc-300 hover:bg-zinc-600">
                          Unfollow
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search in Following */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Discover More</div>
                </div>
                {filteredAccounts.filter(a => !followingList.has(a.id)).slice(0, 10).map(account => (
                  <div key={account.id} className="p-4 flex items-center gap-3 border-b border-zinc-800/50 last:border-b-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${account.accountType === 'legend' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-zinc-800'}`}>
                      {account.flag}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${account.accountType === 'legend' ? 'text-amber-400' : 'text-white'}`}>{account.name}</span>
                        {account.accountType === 'legend' && <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-amber-500/10 text-amber-400 border-amber-500/30">legend</span>}
                        {account.accountType === 'star' && <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-blue-500/10 text-blue-400 border-blue-500/30">star</span>}
                        <span className="text-[10px] text-zinc-600">{account.ovr} OVR</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{account.club} &bull; {account.position}</p>
                    </div>
                    <button onClick={() => toggleFollow(account.id)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors bg-amber-500 text-zinc-950 hover:bg-amber-400">
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DMs TAB                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dms' && !selectedDM && (
        <div className="space-y-2">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Messages - Mutual Follows Only</div>
            </div>

            {/* Coach (always available) */}
            {allDMs.filter(dm => dm.role === 'coach').map(dm => {
              const conv = dmConversations[dm.id] || [];
              const lastMsg = conv.length > 0 ? conv[conv.length - 1].content : dm.content;
              return (
              <button key={dm.id} onClick={() => { setSelectedDM({ ...dm, read: true }); setReadDMs(prev => new Set([...prev, dm.id])); }}
                className="w-full p-4 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-b-0">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">{dm.flag}</div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{dm.sender}</span>
                    <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">coach</span>
                    {!dm.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{lastMsg}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{dm.timeAgo}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-600 -rotate-90" />
              </button>
              );
            })}

            {/* Mutual Follow DMs */}
            {allDMs.filter(dm => dm.role !== 'coach').map(dm => {
              const conv = dmConversations[dm.id] || [];
              const lastMsg = conv.length > 0 ? conv[conv.length - 1].content : dm.content;
              return (
              <button key={dm.id} onClick={() => { setSelectedDM({ ...dm, read: true }); setReadDMs(prev => new Set([...prev, dm.id])); }}
                className="w-full p-4 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-b-0">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">{dm.flag}</div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{dm.sender}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border ${
                      dm.role === 'legend' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}>{dm.role}</span>
                    {!dm.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{lastMsg}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{dm.timeAgo}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-600 -rotate-90" />
              </button>
              );
            })}

            {allDMs.length === 1 && (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No mutual follows yet.</p>
                <p className="text-xs text-zinc-600 mt-1">Follow players and have them follow you back to unlock DMs.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat View */}
      {activeTab === 'dms' && selectedDM && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
            <button onClick={() => setSelectedDM(null)} className="text-zinc-400 hover:text-white transition-colors">
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg">{selectedDM.flag}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{selectedDM.sender}</span>
                <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border ${
                  selectedDM.role === 'legend' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  selectedDM.role === 'coach' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>{selectedDM.role}</span>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm flex-shrink-0">{selectedDM.flag}</div>
              <div className="flex-1">
                <div className="bg-zinc-800 rounded-2xl rounded-tl-sm p-3 max-w-[85%]">
                  <p className="text-sm text-zinc-300">{selectedDM.content}</p>
                </div>
                <span className="text-[10px] text-zinc-600 mt-1 block">{selectedDM.timeAgo}</span>
              </div>
            </div>

            {(dmConversations[selectedDM.id] || []).map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm flex-shrink-0">
                  {msg.role === 'user' ? '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E006F}\u{E007C}\u{E0067}\u{E007F}' : selectedDM.flag}
                </div>
                <div className="flex-1">
                  <div className={`rounded-2xl p-3 max-w-[85%] ${
                    msg.role === 'user' ? 'bg-amber-500 text-zinc-950 rounded-tr-sm ml-auto' : 'bg-zinc-800 rounded-tl-sm'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {dmTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm flex-shrink-0">{selectedDM.flag}</div>
                <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-zinc-800">
            <div className="flex gap-2">
              <input type="text" value={dmInput} onChange={(e) => setDmInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDMSend()}
                placeholder={`Message ${selectedDM.sender}...`}
                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50" />
              <button onClick={handleDMSend} disabled={!dmInput.trim() || dmTyping}
                className="px-4 py-2 bg-amber-500 text-zinc-950 rounded-lg text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
