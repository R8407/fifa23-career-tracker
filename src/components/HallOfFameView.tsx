import React, { useState, useMemo, useEffect } from 'react';
import { PlayerData, HallOfFameRecord, RecordCategory, RankedLegend } from '../types';
import { HALL_OF_FAME_RECORDS, TOP_100_LEGENDS } from '../data/mockData';
import { Award, Trophy, CheckCircle, Target, Search, ArrowUp, Zap, Sparkles, Filter, ChevronRight, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioEngine } from '../utils/audio';
import { calculateLegendPoints } from '../utils/trophies';

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

  // Per-league stats: goals, assists, apps scored while in each league
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

  // Map record IDs to user's dynamic stats (club/league-aware)
  const getRecordUserCurrent = (rec: HallOfFameRecord): { value: number; isApplicable: boolean } => {
    // Career-wide records (always applicable)
    if (rec.id === 'rec_most_career_goals') return { value: totalUserGoals, isApplicable: true };
    if (rec.id === 'rec_most_career_assists') return { value: totalUserAssists, isApplicable: true };
    if (rec.id.includes('ballondor')) return { value: userBallonDor, isApplicable: true };

    // Club-specific records: only applicable if player has played for that club
    const clubMap: Record<string, string> = {
      'rec_real_madrid': 'Real Madrid', 'rec_barcelona': 'FC Barcelona',
      'rec_manchester_utd': 'Manchester United', 'rec_liverpool': 'Liverpool',
      'rec_bayern': 'Bayern Munich', 'rec_juventus': 'Juventus',
      'rec_ac_milan': 'AC Milan', 'rec_inter': 'Inter Milan',
      'rec_atletico': 'Atletico Madrid', 'rec_spezia': 'Spezia',
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

    // League-specific records: only applicable if player has played in that league
    const leagueMap: Record<string, string[]> = {
      'rec_pl_': ['Premier League', 'Premier League '],
      'rec_laliga_': ['La Liga', 'LaLiga'],
      'rec_bundesliga_': ['Bundesliga'],
      'rec_seriea_': ['Serie A', 'Serie A TIM'],
      'rec_ligue1_': ['Ligue 1', 'Ligue 1 '],
    };
    for (const [prefix, leagueNames] of Object.entries(leagueMap)) {
      if (rec.id.startsWith(prefix)) {
        // Check if user has played in any of the league name variants
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

    // International/UCL records: not applicable yet
    if (rec.id.includes('ghana') || rec.id.includes('worldcup') || rec.id.includes('world_cup')) return { value: 0, isApplicable: false };
    if (rec.id.includes('intl_') || rec.id.includes('international')) return { value: 0, isApplicable: false };
    // UCL records: applicable if player has played in any European competition
    if (rec.id.includes('ucl') || rec.id.includes('champions_league')) {
      // Check if player has European competition stats
      const hasEuropeanStats = Object.keys(leagueStats).some(league => 
        league.includes('Champions League') || league.includes('Europa League') || league.includes('Conference League')
      );
      if (hasEuropeanStats) {
        // Use career-wide stats for UCL records
        if (rec.id.includes('alltime_goals')) return { value: totalUserGoals, isApplicable: true };
        if (rec.id.includes('alltime_assists')) return { value: totalUserAssists, isApplicable: true };
        return { value: 0, isApplicable: true };
      }
      return { value: 0, isApplicable: false };
    }

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
  }, [player.seasons, player.trophies, brokenRecords, clubStats, leagueStats]);

  // Only show records that are applicable (clubs/leagues played in) + career records
  const records = allRecords.filter(r => r.isApplicable);

  // Auto-claim broken records that haven't been claimed yet
  useEffect(() => {
    for (const rec of allRecords) {
      if (rec.isBroken && !claimedRecords[rec.id]) {
        // First time detecting this record as broken - award points and generate news
        setBrokenRecords(prev => ({ ...prev, [rec.id]: true }));
        setClaimedRecords(prev => ({ ...prev, [rec.id]: true }));
        setTotalLegacyPoints(prev => prev + rec.legacyPoints);

        // Generate news
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
          image: 'record'
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

    // Generate news for record breaking
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
      image: 'record'
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
    popularOpinionBonus: 20,
    notableAchievement: `${userBallonDor > 0 ? 'Ballon d\'Or Winner' : 'Rising Football Prodigy'} & ${player.currentClub} Star`,
    isUser: true,
    points: userPoints
  };

  const legendsWithPoints = TOP_100_LEGENDS.map(leg => ({
    ...leg,
    isUser: false,
    points: calculateLegendPoints({
      goals: leg.goals, assists: leg.assists, ballondOr: leg.ballondOr,
      worldCup: leg.worldCup, championsLeague: 0, europaLeague: 0,
      leagueTitles: 0, cupTrophies: leg.clubTrophies, goldenBoot: 0,
      assistKing: 0, manOfTheMatch: 0, popularOpinionBonus: leg.popularOpinionBonus
    })
  }));

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
            <div className="text-sm font-black text-white">{totalLegacyPoints.toLocaleString()} Legacy Pts</div>
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
                        #{item.currentRank}
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
        <div className="space-y-4">
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2 items-center bg-zinc-900/80 border border-zinc-800 p-2 rounded-2xl">
            <span className="text-xs font-bold text-zinc-500 uppercase px-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter Category:
            </span>
            {(['All', 'UCL', 'Knockout', 'League', 'Club', 'International', 'Individual', 'Locked'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  audioEngine.playClick();
                  setActiveCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Hall of Fame Records Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecords.map((rec) => {
              const progressPercent = Math.min(100, Math.round((rec.userCurrent / rec.holderRecord) * 100));
              const isLocked = !rec.isApplicable;

              return (
                <div
                  key={rec.id}
                  className={`p-6 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between space-y-4 ${
                    isLocked
                      ? 'bg-zinc-950/80 border-zinc-800/50 opacity-60'
                      : rec.isBroken
                      ? 'bg-gradient-to-br from-zinc-950 via-amber-950/20 to-zinc-950 border-amber-400/80 shadow-lg shadow-amber-500/10'
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 border text-[10px] font-bold rounded uppercase font-mono ${
                        isLocked
                          ? 'bg-zinc-900 text-zinc-600 border-zinc-800'
                          : 'bg-zinc-950 text-amber-400 border-zinc-800'
                      }`}>
                        {rec.category} • {rec.difficulty}
                      </span>

                      {isLocked ? (
                        <span className="px-2.5 py-1 bg-zinc-800 text-zinc-500 font-black text-[10px] rounded-full uppercase flex items-center gap-1 shadow">
                          🔒 LOCKED
                        </span>
                      ) : rec.isBroken ? (
                        <span className="px-2.5 py-1 bg-amber-500 text-zinc-950 font-black text-[10px] rounded-full uppercase flex items-center gap-1 shadow">
                          <CheckCircle className="w-3 h-3" /> RECORD BROKEN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-zinc-950 text-zinc-400 font-bold text-[10px] rounded border border-zinc-800 uppercase">
                          CHASE ACTIVE
                        </span>
                      )}
                    </div>

                    <h3 className={`text-base font-black ${isLocked ? 'text-zinc-600' : 'text-white'}`}>{rec.title}</h3>
                    <p className={`text-xs mt-1 ${isLocked ? 'text-zinc-700' : 'text-zinc-400'}`}>{rec.description}</p>
                    
                    {isLocked && (
                      <p className="text-[10px] text-zinc-600 mt-2 font-mono">
                        🔒 Play for {rec.holderClub || 'this club'} to unlock this record
                      </p>
                    )}
                  </div>

                  <div className={`bg-zinc-950 p-3.5 rounded-xl border space-y-2 font-mono text-xs ${
                    isLocked ? 'border-zinc-900 opacity-50' : 'border-zinc-800'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Record Holder:</span>
                      <span className={`font-bold ${isLocked ? 'text-zinc-600' : 'text-white'}`}>
                        {rec.holderName} ({rec.holderRecord} {rec.unit})
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Your Current:</span>
                      <span className={`font-black ${isLocked ? 'text-zinc-700' : rec.isBroken ? 'text-amber-400' : 'text-zinc-200'}`}>
                        {isLocked ? '--' : `${rec.userCurrent} ${rec.unit}`}
                      </span>
                    </div>

                    {!isLocked && (
                      <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full transition-all duration-500 ${
                            rec.isBroken ? 'bg-gradient-to-r from-amber-400 to-yellow-300' : 'bg-blue-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[10px] font-mono font-bold ${isLocked ? 'text-zinc-700' : 'text-amber-400'}`}>
                      {isLocked ? '🔒 LOCKED' : `+${rec.legacyPoints} Legacy Points`}
                    </span>

                    {isLocked ? (
                      <span className="text-xs font-bold text-zinc-600 flex items-center gap-1">
                        🔒 LOCKED
                      </span>
                    ) : !rec.isBroken ? (
                      <button
                        onClick={() => handleSimulateRecordAttempt(rec)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <Target className="w-3.5 h-3.5" /> Chase Record
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> History Rewritten
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
