import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlayerData, HallOfFameRecord, RecordCategory, RankedLegend } from '../types';
import { HALL_OF_FAME_RECORDS, TOP_100_LEGENDS } from '../data/mockData';
import { Award, Trophy, CheckCircle, Target, Search, ArrowUp, Zap, Sparkles, Filter, ChevronRight, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioEngine } from '../utils/audio';
import { calculateLegendPoints } from '../utils/trophies';
import careerExportData from '../data/career_export.json';
import { ImmortalRecordsView } from './ImmortalRecordsView';

interface HallOfFameViewProps {
  player: PlayerData;
  onRecordBrokenTrigger: (recordTitle: string, bonusPoints: number) => void;
}

const LEGACY_STORAGE_KEY = 'career_broken_records';
const LEGACY_POINTS_KEY = 'career_legacy_points';
const RECORD_NEWS_KEY = 'career_record_news';
const CLAIMED_RECORDS_KEY = 'career_claimed_records';

export const HallOfFameView: React.FC<HallOfFameViewProps> = ({ player, onRecordBrokenTrigger }) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'records'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'points' | 'goals_assists' | 'ballondor' | 'trophies'>('points');
  const [activeCategory, setActiveCategory] = useState<RecordCategory | 'All'>('All');
  const [leaderboardFilter, setLeaderboardFilter] = useState<'all' | 'modern' | 'legends'>('all');

  // Persist broken records in localStorage
  const [brokenRecords, setBrokenRecords] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '{}'); } catch { return {}; }
  });
  const [totalLegacyPoints, setTotalLegacyPoints] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(LEGACY_POINTS_KEY) || '0', 10);
    } catch { return 0; }
  });
  // Track which broken records have had their points/news already claimed
  const [claimedRecords, setClaimedRecords] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(CLAIMED_RECORDS_KEY) || '{}'); } catch { return {}; }
  });

  useEffect(() => { localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(brokenRecords)); }, [brokenRecords]);
  useEffect(() => { localStorage.setItem(LEGACY_POINTS_KEY, String(totalLegacyPoints)); }, [totalLegacyPoints]);
  useEffect(() => { localStorage.setItem(CLAIMED_RECORDS_KEY, JSON.stringify(claimedRecords)); }, [claimedRecords]);

  // User stats calculation
  const totalUserGoals = player.seasons.reduce((acc, s) => acc + s.goals, 0);
  const totalUserAssists = player.seasons.reduce((acc, s) => acc + s.assists, 0);
  const totalUserApps = player.seasons.reduce((acc, s) => acc + s.apps, 0);
  const userBallonDor = player.trophies.find(t => t.iconType === 'ballondor')?.quantity || 0;
  const userWorldCup = player.trophies.find(t => t.iconType === 'worldcup')?.quantity || 0;
  const userClubTrophies = player.trophies.filter(t => t.category === 'Club').reduce((acc, t) => acc + t.quantity, 0);

  // Per-club stats: goals, assists, apps scored while at each club
  const clubStats = useMemo(() => {
    const stats: Record<string, { goals: number; assists: number; apps: number; bestSeasonGoals: number; bestSeasonAssists: number }> = {};
    for (const s of player.seasons) {
      const club = s.club || 'Unknown';
      if (!stats[club]) stats[club] = { goals: 0, assists: 0, apps: 0, bestSeasonGoals: 0, bestSeasonAssists: 0 };
      stats[club].goals += s.goals;
      stats[club].assists += s.assists;
      stats[club].apps += s.apps;
      stats[club].bestSeasonGoals = Math.max(stats[club].bestSeasonGoals, s.goals);
      stats[club].bestSeasonAssists = Math.max(stats[club].bestSeasonAssists, s.assists);
    }
    return stats;
  }, [player.seasons]);

  // Per-competition stats using competitionStats from career export (compobjid keyed)
  const compStats = useMemo(() => {
    const stats: Record<number, { goals: number; assists: number; apps: number; bestSeasonGoals: number; bestSeasonAssists: number }> = {};
    for (const s of player.seasons) {
      const csArr = (s as any).competitionStats || [];
      for (const cs of csArr) {
        const cid = cs.compobjid;
        if (!cid) continue;
        if (!stats[cid]) stats[cid] = { goals: 0, assists: 0, apps: 0, bestSeasonGoals: 0, bestSeasonAssists: 0 };
        stats[cid].goals += cs.goals || 0;
        stats[cid].assists += cs.assists || 0;
        stats[cid].apps += cs.apps || 0;
        stats[cid].bestSeasonGoals = Math.max(stats[cid].bestSeasonGoals, cs.goals || 0);
        stats[cid].bestSeasonAssists = Math.max(stats[cid].bestSeasonAssists, cs.assists || 0);
      }
    }
    return stats;
  }, [player.seasons]);

  // Per-league stats: goals, assists, apps scored while in each league (fallback for records without compobjid)
  const leagueStats = useMemo(() => {
    const stats: Record<string, { goals: number; assists: number; apps: number; bestSeasonGoals: number; bestSeasonAssists: number }> = {};
    for (const s of player.seasons) {
      const league = s.league || 'Unknown';
      if (!stats[league]) stats[league] = { goals: 0, assists: 0, apps: 0, bestSeasonGoals: 0, bestSeasonAssists: 0 };
      stats[league].goals += s.goals;
      stats[league].assists += s.assists;
      stats[league].apps += s.apps;
      stats[league].bestSeasonGoals = Math.max(stats[league].bestSeasonGoals, s.goals);
      stats[league].bestSeasonAssists = Math.max(stats[league].bestSeasonAssists, s.assists);
    }
    return stats;
  }, [player.seasons]);

  // Current club and league
  const currentClub = player.currentClub || 'Spezia';
  const currentLeague = player.seasons.length > 0 ? player.seasons[player.seasons.length - 1].league : '';

  // Current season context (used to tag every broken record so old records don't replay)
  const currentSeasonData = player.seasons.length > 0 ? player.seasons[player.seasons.length - 1] : null;
  const currentSeasonId = currentSeasonData?.id || 'season_unknown';
  const currentSeasonLabel = currentSeasonData?.season || 'Unknown';

  // Map record IDs to user's dynamic stats (club/league/competition-aware)
  const getRecordUserCurrent = (rec: HallOfFameRecord): { value: number; isApplicable: boolean } => {
    // Career-wide records (always applicable)
    if (rec.id === 'rec_most_career_goals') return { value: totalUserGoals, isApplicable: true };
    if (rec.id === 'rec_most_career_assists') return { value: totalUserAssists, isApplicable: true };
    if (rec.id.includes('ballondor')) return { value: userBallonDor, isApplicable: true };
    if (rec.id === 'rec_most_motm') {
      const motmCount = player.trophies.find(t => t.iconType === 'manofmatch')?.quantity || 0;
      return { value: motmCount, isApplicable: true };
    }
    if (rec.id === 'rec_golden_boot_alltime') {
      const goldenBootCount = player.trophies.find(t => t.iconType === 'goldenboot')?.quantity || 0;
      return { value: goldenBootCount, isApplicable: true };
    }

    // Competition-specific records (using compobjid from career export competitionStats)
    if (rec.compobjid && compStats[rec.compobjid]) {
      const cs = compStats[rec.compobjid];
      if (rec.id.includes('single_season_goals')) return { value: cs.bestSeasonGoals, isApplicable: true };
      if (rec.id.includes('single_season_assists')) return { value: cs.bestSeasonAssists, isApplicable: true };
      if (rec.id.includes('alltime_goals')) return { value: cs.goals, isApplicable: true };
      if (rec.id.includes('alltime_assists')) return { value: cs.assists, isApplicable: true };
      if (rec.id.includes('most_caps') || rec.id.includes('alltime_caps')) return { value: cs.apps, isApplicable: true };
      return { value: cs.goals, isApplicable: true };
    }
    // Record has compobjid but user hasn't played that competition
    if (rec.compobjid) return { value: 0, isApplicable: false };

    // Club-specific records: only applicable if player has played for that club
    const clubMap: Record<string, string> = {
      'rec_real_madrid': 'Real Madrid', 'rec_barcelona': 'FC Barcelona',
      'rec_manchester_utd': 'Manchester United', 'rec_liverpool': 'Liverpool',
      'rec_bayern': 'Bayern Munich', 'rec_juventus': 'Juventus',
      'rec_ac_milan': 'AC Milan', 'rec_inter': 'Inter Milan',
      'rec_atletico': 'Atletico Madrid', 'rec_spezia': 'Spezia', 'rec_chelsea': 'Chelsea',
    };
    for (const [prefix, clubName] of Object.entries(clubMap)) {
      if (rec.id.startsWith(prefix)) {
        const stats = clubStats[clubName];
        if (!stats) return { value: 0, isApplicable: false };
        if (rec.id.includes('single_season_goals')) return { value: stats.bestSeasonGoals, isApplicable: true };
        if (rec.id.includes('single_season_assists')) return { value: stats.bestSeasonAssists, isApplicable: true };
        return { value: stats.goals, isApplicable: true };
      }
    }

    // League-specific records (fallback using league name)
    const leagueMap: Record<string, string[]> = {
      'rec_pl_': ['Premier League', 'Premier League '],
      'rec_laliga_': ['La Liga', 'LaLiga'],
      'rec_bundesliga_': ['Bundesliga'],
      'rec_seriea_': ['Serie A', 'Serie A TIM'],
      'rec_ligue1_': ['Ligue 1', 'Ligue 1 '],
    };
    for (const [prefix, leagueNames] of Object.entries(leagueMap)) {
      if (rec.id.startsWith(prefix)) {
        let foundStats = null;
        for (const leagueName of leagueNames) {
          if (leagueStats[leagueName]) {
            foundStats = leagueStats[leagueName];
            break;
          }
        }
        if (!foundStats) return { value: 0, isApplicable: false };
        if (rec.id.includes('single_season_goals')) return { value: foundStats.bestSeasonGoals, isApplicable: true };
        if (rec.id.includes('single_season_assists')) return { value: foundStats.bestSeasonAssists, isApplicable: true };
        if (rec.id.includes('alltime_goals')) return { value: foundStats.goals, isApplicable: true };
        if (rec.id.includes('alltime_assists')) return { value: foundStats.assists, isApplicable: true };
        if (rec.id.includes('most_caps')) return { value: foundStats.apps, isApplicable: true };
        return { value: 0, isApplicable: true };
      }
    }

    // International records: not applicable yet
    if (rec.id.includes('ghana') || rec.id.includes('worldcup') || rec.id.includes('world_cup')) return { value: 0, isApplicable: false };
    if (rec.id.includes('intl_') || rec.id.includes('international')) return { value: 0, isApplicable: false };

    return { value: 0, isApplicable: false };
  };

  // Compute records with dynamic userCurrent, filtered by applicability
  const allRecords: HallOfFameRecord[] = useMemo(() => {
    return HALL_OF_FAME_RECORDS.map(rec => {
      const { value: userCurrent, isApplicable } = getRecordUserCurrent(rec);
      const isNowBroken = userCurrent >= rec.holderRecord || !!brokenRecords[rec.id];
      return {
        ...rec,
        userCurrent,
        isBroken: isNowBroken,
        isApplicable,
        remainingToBreak: Math.max(0, rec.holderRecord - userCurrent)
      };
    });
  }, [player.seasons, player.trophies, brokenRecords, clubStats, leagueStats, compStats]);

  // Only show records that are applicable (clubs/leagues played in) + career records
  const records = allRecords.filter(r => r.isApplicable);

  // Auto-claim broken records that haven't been claimed yet.
  // Guarded with a ref because StrictMode double-runs effects in dev — without it,
  // each newly broken record would be claimed twice (double legacy points + 2 news).
  const autoClaimedOnce = useRef(false);
  useEffect(() => {
    if (autoClaimedOnce.current) return;
    autoClaimedOnce.current = true;

    for (const rec of allRecords) {
      if (rec.isBroken && !claimedRecords[rec.id]) {
        // First time detecting this record as broken - award points and generate news
        setBrokenRecords(prev => ({ ...prev, [rec.id]: true }));
        setClaimedRecords(prev => ({ ...prev, [rec.id]: true }));
        setTotalLegacyPoints(prev => prev + rec.legacyPoints);

        // Generate news with season context (tagged so old records don't replay)
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const recordNews = {
          id: `record_${rec.id}_${Date.now()}`,
          timestamp: now,
          category: 'record',
          icon: '🏆',
          headline: `${player.name} BREAKS ${rec.title.toUpperCase()}!`,
          details: `RECORD BROKEN! ${player.name} has broken the ${rec.title} record! ` +
            `Previous record: ${rec.holderName} (${rec.holderRecord} ${rec.unit}). ` +
            `Your achievement: ${rec.userCurrent} ${rec.unit}. +${rec.legacyPoints} Legacy Points earned!`,
          priority: 'high',
          image: 'record',
          seasonId: currentSeasonId,
          seasonLabel: currentSeasonLabel,
          recordTitle: rec.title,
          brokenAt: now
        };

        try {
          const existing = JSON.parse(localStorage.getItem(RECORD_NEWS_KEY) || '[]');
          existing.unshift(recordNews);
          localStorage.setItem(RECORD_NEWS_KEY, JSON.stringify(existing.slice(0, 50)));
          // Notify NewsFeed to re-read localStorage
          window.dispatchEvent(new Event('career-record-news-changed'));
        } catch { /* ignore */ }

        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        audioEngine.playGoldenFanfare();
      }
    }
  }, [allRecords]);

  const handleSimulateRecordAttempt = (rec: HallOfFameRecord) => {
    audioEngine.playClick();
    if (rec.isBroken) return;

    setBrokenRecords(prev => ({ ...prev, [rec.id]: true }));
    setClaimedRecords(prev => ({ ...prev, [rec.id]: true }));
    setTotalLegacyPoints(prev => prev + rec.legacyPoints);
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    audioEngine.playGoldenFanfare();
    onRecordBrokenTrigger(rec.title, rec.legacyPoints);

    // Generate news for record breaking (tagged with season so old records don't replay)
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const recordNews = {
      id: `record_${rec.id}_${Date.now()}`,
      timestamp: now,
      category: 'record',
      icon: '🏆',
      headline: `${player.name} BREAKS ${rec.title.toUpperCase()}!`,
      details: `RECORD BROKEN! ${player.name} has broken the ${rec.title} record! ` +
        `Previous record: ${rec.holderName} (${rec.holderRecord} ${rec.unit}). ` +
        `Your achievement: ${rec.userCurrent} ${rec.unit}. +${rec.legacyPoints} Legacy Points earned!`,
      priority: 'high',
      image: 'record',
      seasonId: currentSeasonId,
      seasonLabel: currentSeasonLabel,
      recordTitle: rec.title,
      brokenAt: now
    };

    try {
      const existing = JSON.parse(localStorage.getItem(RECORD_NEWS_KEY) || '[]');
      existing.unshift(recordNews);
      localStorage.setItem(RECORD_NEWS_KEY, JSON.stringify(existing.slice(0, 50)));
      // Notify NewsFeed to re-read localStorage
      window.dispatchEvent(new Event('career-record-news-changed'));
    } catch { /* ignore */ }
  };

  const userPoints = calculateLegendPoints({
    goals: totalUserGoals,
    assists: totalUserAssists,
    ballondOr: userBallonDor,
    worldCup: userWorldCup,
    championsLeague: player.trophies.find(t => t.iconType === 'champions')?.quantity || 0,
    europaLeague: player.trophies.find(t => t.iconType === 'europaleague')?.quantity || 0,
    leagueTitles: player.trophies.filter(t => t.iconType === 'league').reduce((acc, t) => acc + t.quantity, 0),
    cupTrophies: player.trophies.filter(t => t.iconType === 'cup').reduce((acc, t) => acc + t.quantity, 0),
    goldenBoot: player.trophies.find(t => t.iconType === 'goldenboot')?.quantity || 0,
    assistKing: player.trophies.find(t => t.iconType === 'assistking')?.quantity || 0,
    manOfTheMatch: player.trophies.find(t => t.iconType === 'manofmatch')?.quantity || 0,
    popularOpinionBonus: 20
  });

  const userLegendItem: RankedLegend & { isUser: boolean; points: number } = {
    id: 'user_player',
    name: player.name,
    era: `${player.careerStartYear}-Pres`,
    nationality: player.nationality,
    flag: player.nationalityFlag,
    position: player.position,
    goals: totalUserGoals,
    assists: totalUserAssists,
    ballondOr: userBallonDor,
    worldCup: userWorldCup,
    clubTrophies: userClubTrophies,
    popularOpinionBonus: 0,
    notableAchievement: `${userBallonDor > 0 ? 'Ballon d\'Or Winner' : 'Rising Football Prodigy'} & ${player.currentClub} Star`,
    isUser: true,
    points: userPoints  // Pure merit only — no record points in ranking
  };

  // Update modern active players with real game data (goals + assists)
  const exportData = careerExportData as any;
  const leagueStatsData = exportData.league_stats || {};
  const topScorersList = leagueStatsData.topScorers || [];
  const topAssistsList = leagueStatsData.topAssists || [];
  const topScorersByLeague = exportData.top_scorers_by_league || {};

  // Build lookup of real game stats for active players
  const gameStatsMap = new Map<string, { goals: number; assists: number }>();
  for (const s of [...topScorersList, ...topAssistsList]) {
    const name = s.playerName || '';
    if (!name) continue;
    const goals = parseInt(s.goals || '0');
    const assists = parseInt(s.assists || '0');
    if (!gameStatsMap.has(name) || (goals + assists) > ((gameStatsMap.get(name)?.goals || 0) + (gameStatsMap.get(name)?.assists || 0))) {
      gameStatsMap.set(name, { goals, assists });
    }
  }
  // Also check top_scorers_byLeague for goals (no assists)
  for (const [league, scorers] of Object.entries(topScorersByLeague)) {
    for (const s of (scorers as any[])) {
      const name = s.commonname || `${s.firstname || ''} ${s.lastname || ''}`.trim();
      if (!name) continue;
      const goals = parseInt(s.leaguegoals || '0');
      if (goals <= 0) continue;
      if (!gameStatsMap.has(name)) {
        gameStatsMap.set(name, { goals, assists: 0 });
      } else if (goals > (gameStatsMap.get(name)?.goals || 0)) {
        gameStatsMap.get(name)!.goals = goals;
      }
    }
  }

  // Override goals/assists for modern active players found in game data
  const legendsWithPoints = TOP_100_LEGENDS.map(leg => {
    let goals = leg.goals;
    let assists = leg.assists;
    // Only add game data if player is a modern active player found in game data
    if (leg.category === 'modern' && gameStatsMap.has(leg.name)) {
      const gameStats = gameStatsMap.get(leg.name)!;
      // Add current season stats to career totals
      goals = leg.goals + gameStats.goals;
      assists = leg.assists + gameStats.assists;
    }
    return {
      ...leg,
      goals,
      assists,
      isUser: false,
      notableAchievement: leg.category === 'modern' && gameStatsMap.has(leg.name)
        ? `${leg.notableAchievement} | +${gameStatsMap.get(leg.name)!.goals}G ${gameStatsMap.get(leg.name)!.assists}A this season`
        : leg.notableAchievement,
      points: calculateLegendPoints({
        goals, assists, ballondOr: leg.ballondOr,
        worldCup: leg.worldCup, championsLeague: 0, europaLeague: 0,
        leagueTitles: 0, cupTrophies: leg.clubTrophies, goldenBoot: 0,
        assistKing: 0, manOfTheMatch: 0, popularOpinionBonus: leg.popularOpinionBonus
      })
    };
  });

  const combinedLeaderboard = [...legendsWithPoints, userLegendItem].sort((a, b) => {
    if (sortBy === 'goals_assists') return (b.goals + b.assists) - (a.goals + a.assists);
    if (sortBy === 'ballondor') return b.ballondOr - a.ballondOr;
    if (sortBy === 'trophies') return b.clubTrophies - a.clubTrophies;
    return b.points - a.points;
  });

  const rankedList = combinedLeaderboard.map((item, idx) => ({ ...item, currentRank: idx + 1 }));
  const userRankIndex = rankedList.findIndex(i => i.isUser);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : 51;
  const overtakenCount = rankedList.filter(i => !i.isUser && i.currentRank > userRank).length;

  const filteredLeaderboard = rankedList.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.nationality.toLowerCase().includes(q) || item.era.toLowerCase().includes(q);
  }).filter(item => {
    if (leaderboardFilter === 'all') return true;
    if (leaderboardFilter === 'modern') return item.category === 'modern' || item.isUser;
    // legends filter
    return item.category !== 'modern' || item.isUser;
  });

  const filteredRecords = activeCategory === 'All'
    ? records
    : activeCategory === 'Locked'
    ? allRecords.filter(r => !r.isApplicable)
    : records.filter(r => r.category === activeCategory);

  const lockedRecords = allRecords.filter(r => !r.isApplicable);
  const brokenCount = records.filter(r => r.isBroken).length;
  const legacyPercentage = records.length > 0 ? Math.round((brokenCount / records.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-amber-950/40 to-zinc-950 border border-amber-500/40 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              ALL-TIME FOOTBALL HALL OF FAME
            </h2>
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-full flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> TOP 100 LEGENDS
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1 max-w-xl">
            Track your place in football history. Compare your career total against the top 100 legends of all time and climb the ranks as you break records.
          </p>
        </div>

        {/* User Rank Card */}
        <div className="bg-zinc-900/90 border border-amber-500/50 p-4 rounded-xl flex items-center gap-4 shadow-2xl font-mono">
          <div className="w-12 h-12 bg-amber-500 text-zinc-950 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
            #{userRank}
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Your History Rank</div>
            <div className="text-sm font-black text-white">{(totalLegacyPoints + userPoints).toLocaleString()} Legacy Pts</div>
            <div className="text-[10px] text-emerald-400 font-bold">
              {overtakenCount} Legends Overtaken
            </div>
          </div>
        </div>
      </div>

      {/* Main Sub-Navigation Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => {
            audioEngine.playClick();
            setActiveTab('leaderboard');
          }}
          className={`px-6 py-3 font-extrabold text-sm uppercase flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" /> Top 100 Legends Leaderboard
        </button>

        <button
          onClick={() => {
            audioEngine.playClick();
            setActiveTab('records');
          }}
          className={`px-6 py-3 font-extrabold text-sm uppercase flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'records'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4" /> Immortal Records Chase ({brokenCount}/{records.length})
        </button>
      </div>

      {/* SUB-TAB 1: TOP 50 LEGENDS LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* Controls bar: Search & Sorting */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search legend, country, or era..."
                className="w-full bg-zinc-950 border border-zinc-800 text-white pl-9 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Metric Sorting */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
              <span className="text-zinc-500 font-bold uppercase text-[10px]">Rank By:</span>
              <button
                onClick={() => setSortBy('points')}
                className={`px-3 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer ${
                  sortBy === 'points' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-950 text-zinc-400 hover:text-white'
                }`}
              >
                Overall Legacy
              </button>
              <button
                onClick={() => setSortBy('goals_assists')}
                className={`px-3 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer ${
                  sortBy === 'goals_assists' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-950 text-zinc-400 hover:text-white'
                }`}
              >
                Goals + Assists
              </button>
              <button
                onClick={() => setSortBy('ballondor')}
                className={`px-3 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer ${
                  sortBy === 'ballondor' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-950 text-zinc-400 hover:text-white'
                }`}
              >
                Ballon d'Ors
              </button>
              <button
                onClick={() => setSortBy('trophies')}
                className={`px-3 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer ${
                  sortBy === 'trophies' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-950 text-zinc-400 hover:text-white'
                }`}
              >
                Club Trophies
              </button>
            </div>

            {/* Modern/Legends Filter */}
            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto text-[10px]">
              <span className="text-zinc-500 font-bold uppercase">Show:</span>
              <button
                onClick={() => setLeaderboardFilter('all')}
                className={`px-2 py-0.5 rounded font-bold uppercase transition-colors cursor-pointer ${
                  leaderboardFilter === 'all' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-950 text-zinc-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setLeaderboardFilter('modern')}
                className={`px-2 py-0.5 rounded font-bold uppercase transition-colors cursor-pointer ${
                  leaderboardFilter === 'modern' ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-950 text-zinc-400 hover:text-white'
                }`}
              >
                Modern
              </button>
              <button
                onClick={() => setLeaderboardFilter('legends')}
                className={`px-2 py-0.5 rounded font-bold uppercase transition-colors cursor-pointer ${
                  leaderboardFilter === 'legends' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-950 text-zinc-400 hover:text-white'
                }`}
              >
                Legends
              </button>
            </div>
          </div>

          {/* Ranking Matrix Summary Legend */}
          <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-[11px] font-mono text-zinc-400 flex items-center justify-between flex-wrap gap-2">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Ranking Formula:
            </span>
            <span>Goals (1.0x) + Assists (0.75x) + Ballon d'Or (120pts) + World Cup (150pts) + Trophies (30pts)</span>
          </div>

          {/* Ranked List Table */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="divide-y divide-zinc-800/60">
              {filteredLeaderboard.map((item) => {
                const isOvertaken = !item.isUser && item.currentRank > userRank;
                const isTargetToBeat = !item.isUser && item.currentRank < userRank;

                return (
                  <div
                    key={item.id}
                    className={`p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      item.isUser
                        ? 'bg-gradient-to-r from-amber-950/60 via-zinc-900 to-amber-950/40 border-y-2 border-amber-400 shadow-xl'
                        : isOvertaken
                        ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                        : 'hover:bg-zinc-900/60'
                    }`}
                  >
                    {/* Rank & Player Info */}
                    <div className="flex items-center gap-4 min-w-[280px]">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow font-mono ${
                          item.currentRank === 1
                            ? 'bg-gradient-to-br from-amber-300 to-yellow-500 text-zinc-950'
                            : item.currentRank === 2
                            ? 'bg-zinc-300 text-zinc-950'
                            : item.currentRank === 3
                            ? 'bg-amber-700 text-white'
                            : item.isUser
                            ? 'bg-amber-500 text-zinc-950 ring-2 ring-amber-300'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        #{item.currentRank === 1 ? 'GOAT' : item.currentRank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white flex items-center gap-1.5">
                            {item.name} <span className="text-sm">{item.flag}</span>
                          </span>
                          {item.isUser && (
                            <span className="px-2 py-0.5 bg-amber-400 text-zinc-950 font-black text-[9px] rounded uppercase font-mono shadow">
                              YOU (LIVE PLAYER)
                            </span>
                          )}
                          {isOvertaken && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold rounded-full uppercase flex items-center gap-1 font-mono">
                              <CheckCircle className="w-3 h-3" /> OVERTAKEN
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-zinc-400 mt-0.5 font-mono">
                          {item.nationality} • {item.position} • Era: {item.era}
                        </div>
                      </div>
                    </div>

                    {/* Key Metric Columns */}
                    <div className="grid grid-cols-4 gap-3 text-center text-xs font-mono w-full md:w-auto bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
                      <div>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold">G + A</div>
                        <div className="font-extrabold text-white">{item.goals + item.assists}</div>
                        <div className="text-[9px] text-zinc-500">({item.goals}G/{item.assists}A)</div>
                      </div>

                      <div>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold">Ballon d'Or</div>
                        <div className="font-extrabold text-amber-400">
                          {item.ballondOr > 0 ? `⚽ x${item.ballondOr}` : '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold">World Cup</div>
                        <div className="font-extrabold text-blue-400">
                          {item.worldCup > 0 ? `🏆 x${item.worldCup}` : '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold">Club Cups</div>
                        <div className="font-extrabold text-zinc-300">
                          🏆 {item.clubTrophies}
                        </div>
                      </div>
                    </div>

                    {/* Total Score & Gap */}
                    <div className="text-right font-mono min-w-[140px]">
                      <div className="text-xs text-zinc-500 font-bold uppercase">Legacy Points</div>
                      <div className={`text-base font-black ${item.isUser ? 'text-amber-300' : 'text-white'}`}>
                        {item.points.toLocaleString()} pts
                      </div>

                      {isTargetToBeat && (
                        <div className="text-[10px] text-amber-400/90 font-bold flex items-center justify-end gap-1 mt-0.5">
                          <ArrowUp className="w-3 h-3" /> Gap: {(item.points - userPoints).toLocaleString()} pts
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: IMMORTAL RECORDS CHASE */}
      {activeTab === 'records' && (
        <ImmortalRecordsView
          records={records}
          allRecords={allRecords}
          brokenRecords={brokenRecords}
          onBreakRecord={handleSimulateRecordAttempt}
        />
      )}
    </div>
  );
};
