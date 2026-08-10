import React, { useState, useMemo, useEffect } from 'react';
import { MessageSquare, Heart, MessageCircle, Share2, Send, Star, Briefcase, Trophy, Lock, Unlock, ChevronDown, ChevronUp, PenLine, Smile } from 'lucide-react';
import careerExportData from '../data/career_export.json';
import { generateDMReply, isLLMAvailable } from '../utils/llm';
import { LEGENDS, LEGEND_TIERS, Legend, LegendTier } from '../data/legends';
import {
  isLegendUnlocked,
  getLegendConversation,
  saveLegendConversation,
  getUnlockedLegends,
  getClosestLockedLegends,
  LegendConversation,
} from '../utils/legendUnlock';
import { generateFanReactions, FanReaction } from '../utils/fanReactions';
import { FanComment } from '../utils/newsLlm';
import { TOP_100_LEGENDS } from '../data/mockData';

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
}

// Generate DMs from unlocked legends
// Generate a dynamic teammate DM from squad members with higher OVR
function generateTeammateDM(data: any, playerName: string, playerClub: string, playerAge: number): DirectMessage | null {
  const userOVR = parseInt(data.my_player_profile?.overallrating || '65');
  const squad = data.my_squad || [];
  
  // Filter for players with higher OVR (excluding user)
  const betterTeammates = squad.filter((p: any) => 
    p.isUserPlayer === false && 
    parseInt(p.overallrating || '0') > userOVR
  );
  
  if (betterTeammates.length === 0) return null;
  
  // Pick one at random using a seeded approach based on team ID
  const teamId = data.my_team_id || 'default';
  const seed = teamId.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
  const selected = betterTeammates[seed % betterTeammates.length];
  
  const firstName = selected.firstname || '';
  const lastName = selected.lastname || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Teammate';
  const nickname = selected.commonname || firstName || lastName || 'Teammate';
  const ovr = parseInt(selected.overallrating || '80');
  const position = selected.squad_position || 'CF';
  
  // Generate a casual handle
  const handle = `@${nickname.replace(/\s/g, '')}`;
  
  // Generate greeting based on position and OVR
  const greetings = [
    `Hey ${playerName}, heard you're joining the first team. Nice to meet you. I'm ${nickname}, play ${position} here. If you need anything, just ask.`,
    `Welcome to ${playerClub}, ${playerName}. I'm ${nickname} -- been here a few years now. Let's have a good season together.`,
    `${playerName} right? I'm ${nickname}. ${ovr} OVR, play ${position}. We should link up in training. The gaffer likes when we play together.`,
    `Yo ${playerName}, welcome. I'm ${nickname}. The squad's good here, you'll fit right in. Let's get some wins.`,
  ];
  
  const greeting = greetings[seed % greetings.length];
  
  // Generate transfer advice
  const transferAdvice = [
    `Look, if a bigger club wants you, that's a compliment. But think about it carefully. Playing time here is guaranteed.`,
    `I've seen players leave too early and regret it. Make sure you're ready before making any moves.`,
    `If you're playing well, the big clubs will come. Just focus on your game and the rest will follow.`,
  ];
  
  // Generate match reaction
  const matchReaction = (rating: number) => {
    if (rating >= 8.0) return `Great game today! You were class. The whole squad noticed.`;
    if (rating >= 7.0) return `Solid performance. Keep building on that.`;
    return `Tough one today. But we move. Next game's ours.`;
  };
  
  return {
    id: `teammate_${teamId}_${selected.playerid}`,
    sender: fullName,
    handle,
    flag: '🌍',
    role: 'teammate',
    content: greeting,
    timeAgo: 'Recently',
    read: true,
  };
}

function generateLegendDMs(hofPoints: number, playerName: string, playerClub: string, playerAge: number): DirectMessage[] {
  const dms: DirectMessage[] = [];
  const unlockedLegends = getUnlockedLegends(hofPoints);

  for (const legend of unlockedLegends) {
    let conversation = getLegendConversation(legend.id);

    // Auto-create first message if no conversation exists
    if (!conversation || conversation.messages.length === 0) {
      const firstMessage = legend.greeting(playerName, playerClub, playerAge);
      conversation = {
        legendId: legend.id,
        messages: [{ role: 'assistant', content: firstMessage, timeAgo: 'Recently' }],
        lastActivity: Date.now(),
        unlockedAt: Date.now(),
      };
      saveLegendConversation(legend.id, conversation);
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    dms.push({
      id: `legend_${legend.id}`,
      sender: legend.name,
      handle: legend.handle,
      flag: legend.flag,
      role: legend.tier === 'bronze' ? (legend.id === 'your_coach' ? 'coach' : 'agent') : 'legend',
      content: lastMessage.content,
      timeAgo: 'Recently',
      read: true,
      legendId: legend.id,
    });
  }

  return dms;
}

// Static agent/coach DMs
const STATIC_DMS: DirectMessage[] = [
  { id: 'dm_agent', sender: 'Your Agent', handle: '@PlayerAgent', flag: '\u{1F1FA}\u{E0067}', role: 'agent', content: 'Season review: Excellent debut. 4G 16A with avg rating 7.67. Market value will increase significantly.', timeAgo: '2d', read: true },
];

// Generate performance-triggered DMs from unlocked legends
function generatePerformanceDMs(
  matchRating: number,
  hofPoints: number,
  playerName: string,
  playerClub: string,
  playerAge: number
): DirectMessage[] {
  if (matchRating === 0) return [];
  
  const dms: DirectMessage[] = [];
  const unlockedLegends = getUnlockedLegends(hofPoints);
  
  // Pick legends that would react to this performance
  const reactingLegends = unlockedLegends.filter(legend => {
    // Coach always reacts
    if (legend.id === 'your_coach') return true;
    // Agent reacts to very high or very low
    if (legend.id === 'jorge_mendes') return matchRating >= 9 || matchRating <= 6;
    // Other legends react to extreme performances
    return matchRating >= 9 || matchRating <= 6;
  });
  
  for (const legend of reactingLegends) {
    const reaction = legend.matchPerformanceReaction(playerName, matchRating, legend.name);
    
    // Check if we already sent a DM about this rating
    const existing = getLegendConversation(legend.id);
    if (existing && existing.messages.some(m => m.content === reaction)) continue;
    
    // Save to conversation
    const conversation = existing || {
      legendId: legend.id,
      messages: [],
      lastActivity: Date.now(),
      unlockedAt: Date.now(),
    };
    conversation.messages.push({
      role: 'assistant',
      content: reaction,
      timeAgo: 'Just now',
    });
    conversation.lastActivity = Date.now();
    saveLegendConversation(legend.id, conversation);
    
    dms.push({
      id: `perf_${legend.id}_${matchRating}`,
      sender: legend.name,
      handle: legend.handle,
      flag: legend.flag,
      role: legend.tier === 'bronze' ? (legend.id === 'your_coach' ? 'coach' : 'agent') : 'legend',
      content: reaction,
      timeAgo: 'Just now',
      read: false,
      legendId: legend.id,
    });
  }
  
  return dms;
}

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Milestone comparison post types
interface MilestonePost {
  id: string;
  type: 'milestone_comparison';
  author: string;
  handle: string;
  flag: string;
  verified: boolean;
  content: string;
  likes: number;
  replies: number;
  timeAgo: string;
  fanComments?: FanComment[];
  comparison: {
    playerName: string;
    playerGoals: number;
    playerAssists: number;
    playerApps: number;
    legendName: string;
    legendGoals: number;
    legendAssists: number;
    legendApps: number;
    legendFlag: string;
    legendEra: string;
    legendAchievement: string;
    milestoneType: 'goals' | 'assists' | 'apps' | 'club_legend';
    milestoneValue: number;
  };
}

// Find the best legend to compare against
function findBestLegendComparison(
  playerGoals: number,
  playerAssists: number,
  playerApps: number,
  playerClub: string,
  legends: any[]
): { legend: any; type: 'goals' | 'assists' | 'apps' | 'club_legend'; value: number } | null {
  // First, try to find a legend who played at the same club
  const clubLegends = legends.filter(l => {
    const name = l.name.toLowerCase();
    const club = playerClub.toLowerCase();
    // Check if legend is associated with the club
    if (club.includes('spezia') && (name.includes('nzola') || name.includes('verde'))) return true;
    if (club.includes('real madrid') && (name.includes('ronaldo') || name.includes('raul') || name.includes('puskas') || name.includes('di stefano'))) return true;
    if (club.includes('barcelona') && (name.includes('messi') || name.includes('ronaldinho') || name.includes('cruyff') || name.includes('xavi') || name.includes('iniesta'))) return true;
    if (club.includes('manchester') && (name.includes('rooney') || name.includes('giggs') || name.includes('beckham') || name.includes('best'))) return true;
    if (club.includes('liverpool') && (name.includes('gerrard') || name.includes('rush') || name.includes('dalglish'))) return true;
    if (club.includes('bayern') && (name.includes('müller') || name.includes('beckenbauer') || name.includes('rummenigge'))) return true;
    if (club.includes('juventus') && (name.includes('del piero') || name.includes('trezeguet') || name.includes('nedved') || name.includes('buffon'))) return true;
    if (club.includes('milan') && (name.includes('maldini') || name.includes('van basten') || name.includes('shevchenko') || name.includes('pirlo'))) return true;
    if (club.includes('inter') && (name.includes('meazza') || name.includes('zanetti') || name.includes('ronaldo naz'))) return true;
    return false;
  });

  if (clubLegends.length > 0) {
    // Pick the closest legend in terms of goals
    const sorted = clubLegends.sort((a, b) => 
      Math.abs(a.goals - playerGoals) - Math.abs(b.goals - playerGoals)
    );
    return { legend: sorted[0], type: 'club_legend', value: playerGoals };
  }

  // Otherwise, find legend closest in goals
  const goalSorted = [...legends].sort((a, b) => 
    Math.abs(a.goals - playerGoals) - Math.abs(b.goals - playerGoals)
  );
  
  // Find legend closest in assists
  const assistSorted = [...legends].sort((a, b) => 
    Math.abs(a.assists - playerAssists) - Math.abs(b.assists - playerAssists)
  );

  // Pick the better match
  const goalDiff = Math.abs(goalSorted[0].goals - playerGoals);
  const assistDiff = Math.abs(assistSorted[0].assists - playerAssists);

  if (goalDiff <= assistDiff) {
    return { legend: goalSorted[0], type: 'goals', value: playerGoals };
  } else {
    return { legend: assistSorted[0], type: 'assists', value: playerAssists };
  }
}

// Check for milestones and generate comparison posts
function generateMilestonePosts(
  data: any,
  legends: any[]
): MilestonePost[] {
  const profile = data.my_player_profile || {};
  const seasons = data.seasons || [];
  const playerName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Your Player';
  const playerClub = data.my_player_profile?.currentclub || 'Unknown';
  const totalGoals = data.total_goals || 0;
  const totalAssists = data.total_assists || 0;
  const totalApps = seasons.reduce((sum: number, s: any) => sum + (s.apps || 0), 0);

  const milestonePosts: MilestonePost[] = [];
  const milestones = [25, 50, 100, 150, 200, 300, 500];
  
  // Check if we've hit any milestones
  for (const milestone of milestones) {
    if (totalApps >= milestone) {
      const comparison = findBestLegendComparison(totalGoals, totalAssists, totalApps, playerClub, legends);
      if (comparison) {
        const { legend, type, value } = comparison;
        
        let content = '';
        if (type === 'club_legend') {
          content = `${playerName} has reached ${totalApps} appearances for ${playerClub}! The last player to hit this milestone at the club was ${legend.name} (${legend.era}). Fan debate: Is ${playerName} on track to match ${legend.name}'s legacy?`;
        } else if (type === 'goals') {
          content = `${playerName} hits ${totalGoals} career goals at just ${totalApps} appearances! For comparison, ${legend.name} had ${legend.goals} goals at the same stage of his career. The chase is ON.`;
        } else {
          content = `${playerName} reaches ${totalAssists} career assists! ${legend.name} finished his career with ${legend.assists} assists. Can ${playerName} surpass the legend?`;
        }

        milestonePosts.push({
          id: `milestone_${milestone}_${type}`,
          type: 'milestone_comparison',
          author: 'Football Daily',
          handle: '@FootballDaily',
          flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
          verified: true,
          content,
          likes: Math.floor(seededRandom(`milestone_${milestone}`) % 8000) + 1000,
          replies: Math.floor(seededRandom(`milestone_replies_${milestone}`) % 500) + 100,
          timeAgo: '2h',
          fanComments: [
            { name: 'Marcus R.', handle: '@MarcusR_Football', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', text: `${playerName} is ${type === 'goals' ? 'scoring' : type === 'assists' ? 'creating' : 'playing'} at a legendary pace!` },
            { name: 'Luca B.', handle: '@LucaB_Tactics', flag: '\u{1F1EE}\u{E0067}', text: `At ${legend.name}'s age, he had ${type === 'goals' ? legend.goals : type === 'assists' ? legend.assists : legend.appearances} ${type === 'goals' ? 'goals' : type === 'assists' ? 'assists' : 'appearances'}. The comparison is real.` },
            { name: 'Jake T.', handle: '@JakeT_Sports', flag: '\u{1F1FA}\u{E0067}', text: `This is why we watch football. History in the making.` },
          ],
          comparison: {
            playerName,
            playerGoals: totalGoals,
            playerAssists: totalAssists,
            playerApps: totalApps,
            legendName: legend.name,
            legendGoals: legend.goals,
            legendAssists: legend.assists,
            legendApps: legend.appearances,
            legendFlag: legend.flag,
            legendEra: legend.era,
            legendAchievement: legend.notableAchievement,
            milestoneType: type,
            milestoneValue: value,
          },
        });
      }
    }
  }

  return milestonePosts;
}

function generatePosts(data: any, hofPoints: number = 0): FeedPost[] {
  const profile = data.my_player_profile || {};
  const goals = data.total_goals || 0;
  const assists = data.total_assists || 0;
  const ovr = parseInt(profile.overallrating || '65');
  const seasons = data.seasons || [];
  const playerName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Your Player';
  const motmTotal = seasons.reduce((sum: number, s: any) => sum + (s.motm || 0), 0);
  const avgRating = seasons.length > 0
    ? (seasons.reduce((sum: number, s: any) => sum + (parseFloat(s.avgRating) || 0), 0) / seasons.length).toFixed(1)
    : '0.0';
  const seasonGoals = seasons.length > 0 ? (seasons[0].goals || 0) : 0;
  const seasonAssists = seasons.length > 0 ? (seasons[0].assists || 0) : 0;

  // Post authors: modern players, legends, and news accounts
  const postAuthors = [
    { name: 'Football Daily', handle: '@FootballDaily', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', verified: true },
    { name: 'Jude Bellingham', handle: '@JudeBellingham', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', verified: true },
    { name: 'Lionel Messi', handle: '@LeoMessi', flag: '\u{1F1E6}\u{E0067}', verified: true },
    { name: 'Erling Haaland', handle: '@ErlingHaaland', flag: '\u{1F1F3}\u{E0067}', verified: true },
  ];

  // Post templates based on career news
  const postTemplates = [
    // News account about stats
    () => `${playerName} is the most underrated player in Serie A right now. ${goals} goals and ${assists} assists -- name another youngster doing this!`,
    // Modern player reaction
    () => `Leadership is not about age. It is about attitude. I see a leader in the making. @${playerName.replace(/\s/g, '')}`,
    // Legend insight
    () => `Football is about passion. I see passion in this young player. That is the most important thing.`,
    // Modern player comment on potential
    () => `The next generation is coming. I see someone who could be special. Keep pushing.`,
  ];

  // Fan comments for each post (2-3 fans debating)
  const fanCommentSets: FanComment[][] = [
    // Post 1: Stats debate
    [
      { name: 'Marcus R.', handle: '@MarcusR_Football', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', text: `Facts! ${goals}G ${assists}A speaks for itself.` },
      { name: 'Luca B.', handle: '@LucaB_Tactics', flag: '\u{1F1EE}\u{E0067}', text: 'Best young player in Serie A and it is not even close.' },
      { name: 'Jake T.', handle: '@JakeT_Sports', flag: '\u{1F1FA}\u{E0067}', text: 'Compare his stats to Haaland at the same age. I will wait.' },
    ],
    // Post 2: Leadership debate
    [
      { name: 'Ahmed K.', handle: '@AhmedK_Analyst', flag: '\u{1F1F8}\u{E0067}', text: 'The kid is special. End of debate.' },
      { name: 'Sophie M.', handle: '@SophieM_Football', flag: '\u{1F1EB}\u{E0067}', text: 'Age is just a number. This kid leads by example.' },
    ],
    // Post 3: Passion debate
    [
      { name: 'Carlos G.', handle: '@CarlosG_LaLiga', flag: '\u{1F1EA}\u{E0067}', text: 'The eye test passes. The stats pass. What more do you want?' },
      { name: 'Marcus R.', handle: '@MarcusR_Football', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', text: 'He is 14 doing this. Let that sink in.' },
      { name: 'Luca B.', handle: '@LucaB_Tactics', flag: '\u{1F1EE}\u{E0067}', text: 'People said the same about Sancho. Let us wait.' },
    ],
    // Post 4: Potential debate
    [
      { name: 'Jake T.', handle: '@JakeT_Sports', flag: '\u{1F1FA}\u{E0067}', text: 'Serie A defenders are terrified. You love to see it.' },
      { name: 'Ahmed K.', handle: '@AhmedK_Analyst', flag: '\u{1F1F8}\u{E0067}', text: 'This aged well. The haters are quiet now.' },
    ],
  ];

  const posts: FeedPost[] = [];

  // Generate 4 posts
  for (let i = 0; i < 4; i++) {
    const author = postAuthors[i % postAuthors.length];
    const content = postTemplates[i % postTemplates.length]();
    const fanComments = fanCommentSets[i % fanCommentSets.length];

    posts.push({
      id: String(i),
      author: author.name,
      handle: author.handle,
      flag: author.flag,
      verified: author.verified,
      content,
      likes: Math.floor(seededRandom(String(i + 100)) % 5000) + 200,
      replies: Math.floor(seededRandom(String(i + 200)) % 200) + 30,
      timeAgo: `${i + 1}h`,
      fanComments,
    });
  }

  return posts;
}

const formatNumber = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

// DM types are defined in the component

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timeAgo: string;
}

const QUICK_EMOJIS = ['⚽', '🔥', '💪', '🙌', '😤', '😂', '🤯', '🏆', '🎯', '❤️', '💯', '🙏', '👑', '💀', '🫡', '🤝'];

const ChatView: React.FC<{ selectedDM: DirectMessage; onBack: () => void; hofPoints: number }> = ({ selectedDM, onBack, hofPoints }) => {
  const [reply, setReply] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [generatingGreeting, setGeneratingGreeting] = useState(false);

  // Load conversation or generate LLM greeting
  useEffect(() => {
    if (selectedDM.legendId) {
      const conversation = getLegendConversation(selectedDM.legendId);
      if (conversation && conversation.messages.length > 0) {
        setMessages(conversation.messages);
      } else {
        // No conversation yet - generate LLM greeting
        generateInitialGreeting();
      }
    }
  }, [selectedDM.legendId]);

  const generateInitialGreeting = async () => {
    setGeneratingGreeting(true);
    try {
      const data = careerExportData as any;
      const profile = data.my_player_profile || {};
      const seasons = data.seasons || [];
      const avgRating = seasons.length > 0
        ? (seasons.reduce((s: number, x: any) => s + (parseFloat(x.avgRating) || 0), 0) / seasons.length).toFixed(1)
        : '0.0';

      let personalityToken: string | undefined;
      if (selectedDM.legendId) {
        const legend = LEGENDS.find(l => l.id === selectedDM.legendId);
        if (legend) {
          personalityToken = legend.personalityToken;
        }
      }

      // Generate greeting using LLM
      const response = await generateDMReply(
        selectedDM.sender,
        selectedDM.role,
        '',  // No original message for greeting
        'Hello! Nice to meet you.',  // Simple opener
        {
          name: `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Ethan Ampadu',
          ovr: parseInt(profile.overallrating || '65'),
          goals: data.total_goals || 0,
          assists: data.total_assists || 0,
          avgRating,
          motm: seasons.reduce((s: number, x: any) => s + (x.motm || 0), 0),
          club: profile.currentClub || 'Spezia',
          age: seasons.length > 0 ? (seasons[0].age || 14) : 14,
        },
        [],
        personalityToken
      );

      const greetingMsg = { role: 'assistant' as const, content: response, timeAgo: 'Recently' };
      setMessages([greetingMsg]);

      // Save to localStorage
      if (selectedDM.legendId) {
        saveLegendConversation(selectedDM.legendId, {
          legendId: selectedDM.legendId,
          messages: [greetingMsg],
          lastActivity: Date.now(),
          unlockedAt: Date.now(),
        });
      }
    } catch {
      // Fallback to static greeting
      const fallbackMsg = { role: 'assistant' as const, content: selectedDM.content, timeAgo: 'Recently' };
      setMessages([fallbackMsg]);
    }
    setGeneratingGreeting(false);
  };

  const handleSend = async () => {
    if (!reply.trim() || loading) return;
    const userMessage = reply.trim();
    setReply('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timeAgo: 'Just now' }]);
    setLoading(true);

    try {
      const data = careerExportData as any;
      const profile = data.my_player_profile || {};
      const seasons = data.seasons || [];
      const avgRating = seasons.length > 0
        ? (seasons.reduce((s: number, x: any) => s + (parseFloat(x.avgRating) || 0), 0) / seasons.length).toFixed(1)
        : '0.0';

      let personalityToken: string | undefined;
      if (selectedDM.legendId) {
        const legend = LEGENDS.find(l => l.id === selectedDM.legendId);
        if (legend) {
          personalityToken = legend.personalityToken;
        }
      }

      const response = await generateDMReply(
        selectedDM.sender,
        selectedDM.role,
        selectedDM.content,
        userMessage,
        {
          name: `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Ethan Ampadu',
          ovr: parseInt(profile.overallrating || '65'),
          goals: data.total_goals || 0,
          assists: data.total_assists || 0,
          avgRating,
          motm: seasons.reduce((s: number, x: any) => s + (x.motm || 0), 0),
          club: profile.currentClub || 'Spezia',
          age: seasons.length > 0 ? (seasons[0].age || 14) : 14,
        },
        messages,
        personalityToken
      );
      setMessages(prev => {
        const newMessages = [...prev, { role: 'assistant' as const, content: response, timeAgo: 'Just now' }];
        if (selectedDM.legendId) {
          saveLegendConversation(selectedDM.legendId, {
            legendId: selectedDM.legendId,
            messages: newMessages,
            lastActivity: Date.now(),
            unlockedAt: Date.now(),
          });
        }
        return newMessages;
      });
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Thank you for your message. Keep working hard.', timeAgo: 'Just now' }]);
    }
    setLoading(false);
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer">
          <ChevronDown className="w-5 h-5 text-zinc-400 rotate-90" />
        </button>
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">{selectedDM.flag}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{selectedDM.sender}</span>
            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border ${
              selectedDM.role === 'legend' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
              selectedDM.role === 'coach' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
              'bg-blue-500/10 text-blue-400 border-blue-500/30'
            }`}>{selectedDM.role}</span>
          </div>
          <span className="text-xs text-zinc-500">{selectedDM.handle}</span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {/* Initial greeting from DM */}
        <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-white">{selectedDM.sender}</span>
            <span className="text-[10px] text-zinc-600">{selectedDM.timeAgo}</span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{selectedDM.content}</p>
        </div>

        {/* LLM-generated greeting (if different from static) */}
        {messages.length > 0 && messages[0].content !== selectedDM.content && (
          <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-2xl p-4 mr-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-white">{selectedDM.sender}</span>
              <span className="text-[10px] text-zinc-600">Recently</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{messages[0].content}</p>
          </div>
        )}

        {/* Chat history (excluding first message if it's the greeting) */}
        {messages.slice(messages.length > 0 && messages[0].content !== selectedDM.content ? 1 : 0).map((msg, idx) => (
          <div key={idx} className={`rounded-2xl p-4 ${msg.role === 'user' ? 'bg-amber-500/10 border border-amber-500/30 ml-8' : 'bg-zinc-800/50 border border-zinc-700/30 mr-8'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-white">{msg.role === 'user' ? 'You' : selectedDM.sender}</span>
              <span className="text-[10px] text-zinc-600">{msg.timeAgo}</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-2xl p-4 mr-8">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-zinc-500">{selectedDM.sender} is typing...</span>
            </div>
          </div>
        )}

        {generatingGreeting && (
          <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-2xl p-4 mr-8">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-zinc-500">{selectedDM.sender} is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-800">
        {showEmojiPicker && (
          <div className="mb-3 p-2 bg-zinc-800 border border-zinc-700 rounded-xl flex flex-wrap gap-1">
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { setReply(prev => prev + emoji); setShowEmojiPicker(false); }}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="px-2 py-2 text-zinc-500 hover:text-amber-400 transition-colors cursor-pointer">
            <Smile className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!reply.trim() || loading}
            className="px-3 py-2 bg-amber-500 text-zinc-950 rounded-lg font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const SocialMediaView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'dms'>('feed');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [selectedDM, setSelectedDM] = useState<DirectMessage | null>(null);
  const [expandedTiers, setExpandedTiers] = useState<Set<LegendTier>>(new Set(['bronze']));
  const [userPost, setUserPost] = useState('');
  const [isGeneratingReactions, setIsGeneratingReactions] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Persistent user post from localStorage
  const [userFeedPost, setUserFeedPost] = useState<{ content: string; reactions: FanReaction[] } | null>(() => {
    try {
      const saved = localStorage.getItem('social_user_post');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Notification tracking
  const [newFeedCount, setNewFeedCount] = useState(0);
  const [newDMCount, setNewDMCount] = useState(0);

  // Get HoF points from localStorage (same key as HallOfFameView)
  const hofPoints = useMemo(() => {
    try {
      return parseInt(localStorage.getItem('career_legacy_points') || '0', 10);
    } catch {
      return 0;
    }
  }, []);

  const handlePostSubmit = async () => {
    if (!userPost.trim()) return;
    
    setIsGeneratingReactions(true);
    try {
      const reactions = await generateFanReactions(userPost, hofPoints);
      const newPost = { content: userPost, reactions };
      setUserFeedPost(newPost);
      localStorage.setItem('social_user_post', JSON.stringify(newPost));
    } catch (e) {
      console.log('[Post] Error generating reactions:', e);
      const newPost = { content: userPost, reactions: [] };
      setUserFeedPost(newPost);
      localStorage.setItem('social_user_post', JSON.stringify(newPost));
    }
    setIsGeneratingReactions(false);
    setUserPost('');
  };

  const posts = useMemo(() => {
    const data = careerExportData as any;
    const regularPosts = generatePosts(data, hofPoints);
    const milestonePosts = generateMilestonePosts(data, TOP_100_LEGENDS);
    // Interleave milestone posts with regular posts
    const allPosts: (FeedPost | MilestonePost)[] = [];
    let milestoneIdx = 0;
    for (let i = 0; i < regularPosts.length; i++) {
      allPosts.push(regularPosts[i]);
      if (milestoneIdx < milestonePosts.length && (i === 1 || i === 3)) {
        allPosts.push(milestonePosts[milestoneIdx]);
        milestoneIdx++;
      }
    }
    // Add any remaining milestone posts
    while (milestoneIdx < milestonePosts.length) {
      allPosts.push(milestonePosts[milestoneIdx]);
      milestoneIdx++;
    }
    return allPosts;
  }, [hofPoints]);

  // Generate all DMs (legend + static + performance-triggered)
  const allDMs = useMemo(() => {
    const data = careerExportData as any;
    const profile = data.my_player_profile || {};
    const playerName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Ethan Ampadu';
    const playerClub = profile.currentClub || 'Spezia';
    const playerAge = data.seasons?.[0]?.age || 14;
    const matchRating = data.latest_match_rating || 0;
    const legendDMs = generateLegendDMs(hofPoints, playerName, playerClub, playerAge);
    const perfDMs = generatePerformanceDMs(matchRating, hofPoints, playerName, playerClub, playerAge);
    const teammateDM = generateTeammateDM(data, playerName, playerClub, playerAge);
    const dms = [...perfDMs, ...legendDMs, ...STATIC_DMS];
    if (teammateDM) dms.unshift(teammateDM);
    return dms;
  }, [hofPoints]);

  const unreadCount = allDMs.filter(d => !d.read).length;

  // Track new notifications
  useEffect(() => {
    const lastVisit = parseInt(localStorage.getItem('social_last_visit') || '0');
    const now = Date.now();
    
    // Count new unread DMs
    const newDMs = allDMs.filter(d => !d.read).length;
    setNewDMCount(newDMs);
    
    // Count new feed posts (posts with recent timestamps)
    const recentPosts = posts.filter(p => {
      const timeStr = p.timeAgo;
      // Consider "Just now", "Xm", "Xh" as new
      return timeStr.includes('Just now') || timeStr.includes('m') || timeStr.includes('h');
    }).length;
    setNewFeedCount(recentPosts > 0 ? recentPosts : 0);
    
    // Update last visit
    localStorage.setItem('social_last_visit', now.toString());
  }, [allDMs, posts]);

  // Clear notifications when tab is viewed
  const clearNotifications = (tab: 'feed' | 'dms') => {
    if (tab === 'feed') setNewFeedCount(0);
    if (tab === 'dms') setNewDMCount(0);
  };

  // Get legend unlock statuses by tier
  const legendStatusesByTier = useMemo(() => {
    const byTier: Record<LegendTier, Array<{ legend: Legend; unlocked: boolean; pointsNeeded: number }>> = {
      bronze: [], silver: [], gold: [], platinum: [], diamond: [],
    };
    for (const legend of LEGENDS) {
      const unlocked = isLegendUnlocked(legend, hofPoints);
      byTier[legend.tier].push({
        legend,
        unlocked,
        pointsNeeded: Math.max(0, legend.hofPointsRequired - hofPoints),
      });
    }
    return byTier;
  }, [hofPoints]);

  const toggleTier = (tier: LegendTier) => {
    setExpandedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">SOCIAL HUB</h2>
          <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-full">LIVE</span>
        </div>
        <p className="text-zinc-400 text-xs mt-1">Fan debates, pundit reactions, and direct messages</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => { setActiveSubTab('feed'); clearNotifications('feed'); }} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${activeSubTab === 'feed' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}>
          Feed
          {newFeedCount > 0 && activeSubTab !== 'feed' && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">{newFeedCount}</span>
          )}
        </button>
        <button onClick={() => { setActiveSubTab('dms'); clearNotifications('dms'); }} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${activeSubTab === 'dms' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}>
          DMs
          {unreadCount > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">{unreadCount}</span>}
        </button>
      </div>

      {activeSubTab === 'feed' && (
        <div className="space-y-3">
          {/* User Post Creation */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <PenLine className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-zinc-400 uppercase">Create Post</span>
            </div>
            <textarea
              value={userPost}
              onChange={(e) => setUserPost(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handlePostSubmit())}
              placeholder="What's on your mind about your career? Share your thoughts..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 resize-none h-20"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handlePostSubmit}
                disabled={!userPost.trim() || isGeneratingReactions}
                className="px-4 py-2 bg-amber-500 text-zinc-950 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingReactions ? 'Generating...' : 'Post'}
              </button>
            </div>
          </div>

          {/* User's posted card with AI fan reactions */}
          {userFeedPost && (
            <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-lg">🏴󠁧󠁢󠁷󠁬󠁳󠁿</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Ethan Ampadu</span>
                      <span className="text-xs text-zinc-500">@EthanAmpadu</span>
                      <span className="text-xs text-amber-400">Just now</span>
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Fan Reactions as comments */}
              {userFeedPost.reactions.length > 0 && (
                <div className="border-t border-zinc-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Fan Reactions</span>
                  </div>
                  {userFeedPost.reactions.map((reaction, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-zinc-800/50">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-sm">
                        {reaction.flag}
                      </div>
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
                </div>
              )}
            </div>
          )}

          {posts.map(post => {
            const isMilestone = 'type' in post && post.type === 'milestone_comparison';
            const isLiked = likedPosts.has(post.id);
            const likeCount = isLiked ? post.likes + 1 : post.likes;
            const hasFanComments = post.fanComments && post.fanComments.length > 0;
            const isCommentsExpanded = expandedComments.has(post.id);
            
            // Milestone comparison post (phone-sized)
            if (isMilestone) {
              const milestone = post as MilestonePost;
              return (
                <div key={milestone.id} className="bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-amber-500/40 rounded-3xl overflow-hidden shadow-lg shadow-amber-500/10">
                  {/* Header */}
                  <div className="p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg">{milestone.flag}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{milestone.author}</span>
                          {milestone.verified && <span className="text-blue-400 text-xs">&#10003;</span>}
                          <span className="text-xs text-zinc-500">{milestone.handle}</span>
                        </div>
                        <span className="text-[10px] text-zinc-600">{milestone.timeAgo}</span>
                      </div>
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30">
                        MILESTONE
                      </span>
                    </div>
                  </div>

                  {/* Comparison Content */}
                  <div className="p-5">
                    <p className="text-sm text-zinc-300 mb-4">{milestone.content}</p>
                    
                    {/* Side-by-side comparison */}
                    <div className="bg-zinc-950/80 rounded-2xl p-4 border border-zinc-800">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {/* Player */}
                        <div>
                          <div className="text-xs text-zinc-500 mb-1">YOU</div>
                          <div className="text-2xl font-black text-white">{milestone.comparison.playerGoals}</div>
                          <div className="text-[10px] text-zinc-500">Goals</div>
                          <div className="text-lg font-bold text-amber-400 mt-1">{milestone.comparison.playerAssists}</div>
                          <div className="text-[10px] text-zinc-500">Assists</div>
                          <div className="text-xs text-zinc-400 mt-1">{milestone.comparison.playerApps} Apps</div>
                        </div>

                        {/* VS */}
                        <div className="flex items-center justify-center">
                          <div className="text-3xl font-black text-zinc-700">VS</div>
                        </div>

                        {/* Legend */}
                        <div>
                          <div className="text-xs text-zinc-500 mb-1">LEGEND</div>
                          <div className="text-lg font-bold text-white">{milestone.comparison.legendName}</div>
                          <div className="text-xs text-zinc-400">{milestone.comparison.legendFlag} {milestone.comparison.legendEra}</div>
                          <div className="text-2xl font-black text-zinc-300 mt-1">{milestone.comparison.legendGoals}</div>
                          <div className="text-[10px] text-zinc-500">Goals</div>
                          <div className="text-lg font-bold text-zinc-400 mt-1">{milestone.comparison.legendAssists}</div>
                          <div className="text-[10px] text-zinc-500">Assists</div>
                        </div>
                      </div>

                      {/* Achievement */}
                      <div className="mt-4 pt-3 border-t border-zinc-800 text-center">
                        <div className="text-[10px] text-zinc-500 uppercase">Legend Achievement</div>
                        <div className="text-xs text-amber-400 mt-1">{milestone.comparison.legendAchievement}</div>
                      </div>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-6">
                      <button
                        onClick={() => toggleLike(milestone.id)}
                        className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${isLiked ? 'text-red-400' : 'text-zinc-500 hover:text-red-400'}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-400' : ''}`} /> {formatNumber(likeCount)}
                      </button>
                      <button 
                        onClick={() => {
                          if (hasFanComments) {
                            setExpandedComments(prev => {
                              const next = new Set(prev);
                              if (next.has(milestone.id)) {
                                next.delete(milestone.id);
                              } else {
                                next.add(milestone.id);
                              }
                              return next;
                            });
                          }
                        }}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${hasFanComments ? 'text-amber-400 hover:text-amber-300 cursor-pointer' : 'text-zinc-500 hover:text-blue-400'}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> {formatNumber(milestone.replies)}
                        {hasFanComments && (
                          <span className="ml-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded-full">
                            {milestone.fanComments!.length} COMMENT{milestone.fanComments!.length > 1 ? 'S' : ''}
                          </span>
                        )}
                      </button>
                      <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-green-400 transition-colors">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                    </div>

                    {/* Expandable Fan Comments */}
                    {hasFanComments && isCommentsExpanded && (
                      <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Fan Comments</div>
                        {milestone.fanComments!.map((comment, idx) => (
                          <div key={idx} className="flex gap-2 pl-2">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-sm">
                              {comment.flag}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{comment.name}</span>
                                <span className="text-[10px] text-zinc-500">{comment.handle}</span>
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Regular post
            return (
              <div key={post.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-all">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-lg">{post.flag}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{post.author}</span>
                      {post.verified && <span className="text-blue-400 text-xs">&#10003;</span>}
                      <span className="text-xs text-zinc-500">{post.handle}</span>
                      <span className="text-xs text-zinc-600">&bull; {post.timeAgo}</span>
                    </div>
                    <p className="text-sm text-zinc-300 mt-1">{post.content}</p>
                    <div className="flex items-center gap-6 mt-3">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${isLiked ? 'text-red-400' : 'text-zinc-500 hover:text-red-400'}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-400' : ''}`} /> {formatNumber(likeCount)}
                      </button>
                      <button 
                        onClick={() => {
                          if (hasFanComments) {
                            setExpandedComments(prev => {
                              const next = new Set(prev);
                              if (next.has(post.id)) {
                                next.delete(post.id);
                              } else {
                                next.add(post.id);
                              }
                              return next;
                            });
                          }
                        }}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${hasFanComments ? 'text-amber-400 hover:text-amber-300 cursor-pointer' : 'text-zinc-500 hover:text-blue-400'}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> {formatNumber(post.replies)}
                        {hasFanComments && (
                          <span className="ml-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded-full">
                            {post.fanComments!.length} COMMENT{post.fanComments!.length > 1 ? 'S' : ''}
                          </span>
                        )}
                      </button>
                      <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-green-400 transition-colors">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Expandable Fan Comments */}
                {hasFanComments && isCommentsExpanded && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Fan Comments</div>
                    {post.fanComments!.map((comment, idx) => (
                      <div key={idx} className="flex gap-2 pl-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-sm">
                          {comment.flag}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{comment.name}</span>
                            <span className="text-[10px] text-zinc-500">{comment.handle}</span>
                          </div>
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

      {activeSubTab === 'dms' && !selectedDM && (
        <div className="space-y-2">
          {/* Phone-style contact list */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Messages</div>
            </div>
            
            {/* Coach & Teammate (Bronze tier - always unlocked) */}
            {allDMs.filter(dm => dm.role === 'coach' || dm.role === 'teammate').map(dm => (
              <button
                key={dm.id}
                onClick={() => setSelectedDM(dm)}
                className="w-full p-4 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-b-0"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">
                  {dm.flag}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{dm.sender}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border ${
                      dm.role === 'coach' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}>{dm.role}</span>
                    {!dm.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{dm.content}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{dm.timeAgo}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-600 -rotate-90" />
              </button>
            ))}

            {/* Unlocked Legend DMs */}
            {allDMs.filter(dm => dm.legendId && dm.role === 'legend').map(dm => {
              const legend = LEGENDS.find(l => l.id === dm.legendId);
              if (!legend || !isLegendUnlocked(legend, hofPoints)) return null;
              return (
                <button
                  key={dm.id}
                  onClick={() => setSelectedDM(dm)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-b-0"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">
                    {dm.flag}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{dm.sender}</span>
                      <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border bg-amber-500/10 text-amber-400 border-amber-500/30">legend</span>
                      {!dm.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{dm.content}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{dm.timeAgo}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-zinc-600 -rotate-90" />
                </button>
              );
            })}

            {/* Locked Legends - shown as unavailable */}
            {LEGENDS.filter(l => !isLegendUnlocked(l, hofPoints) && l.tier !== 'bronze').slice(0, 3).map(legend => (
              <div
                key={legend.id}
                className="p-4 flex items-center gap-3 opacity-40 border-b border-zinc-800/50 last:border-b-0"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center text-xl flex-shrink-0">
                  {legend.flag}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-500">{legend.name}</span>
                    <Lock className="w-3 h-3 text-zinc-600" />
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Unlock at {legend.hofPointsRequired} HoF points
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat View */}
      {activeSubTab === 'dms' && selectedDM && (
        <ChatView selectedDM={selectedDM} onBack={() => setSelectedDM(null)} hofPoints={hofPoints} />
      )}
    </div>
  );
};
