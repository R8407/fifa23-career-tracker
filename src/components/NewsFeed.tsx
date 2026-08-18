import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Flame, Trophy, TrendingUp, Star, Award, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { getActiveCareerData, FIFA_NATIONALITY_MAP } from '../utils/dataAdapter';
import { TOP_100_LEGENDS } from '../data/mockData';
import { generateLLMPunditCards, PunditCard } from '../utils/newsLlm';

import ballonDorImg from '../assets/images/ballon_dor_trophy_1786062497877.jpg';
import goldenBootImg from '../assets/images/golden_boot_trophy_1786062523925.jpg';
import uclImg from '../assets/images/ucl_trophy_1786062511479.jpg';
import worldCupImg from '../assets/images/world_cup_trophy_1786062536361.jpg';
import leagueImg from '../assets/images/league_trophy_1786062561960.jpg';
import cupImg from '../assets/images/cup_trophy_1786062576474.jpg';
import motmImg from '../assets/images/man_of_match_trophy_1786062547833.jpg';
import serieAImg from '../assets/images/serie_a_trophy.png';

const PUNDITS = [
  { name: 'Thierry Henry', network: 'CBS Sports', flag: '\u{1F1EB}\u{1F1F7}', role: 'Analyst' },
  { name: 'Jamie Carragher', network: 'CBS Sports', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'Pundit' },
  { name: 'Micah Richards', network: 'CBS Sports', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'Pundit' },
  { name: 'Gary Neville', network: 'Sky Sports', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'Pundit' },
  { name: 'Peter Schmeichel', network: 'CBS Sports', flag: '\u{1F1E9}\u{E0067}', role: 'Analyst' },
  { name: 'Alex Scott', network: 'BBC', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'Pundit' },
  { name: 'Rio Ferdinand', network: 'TNT Sports', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'Pundit' },
  { name: 'Patrice Evra', network: 'CBS Sports', flag: '\u{1F1EB}\u{E0067}', role: 'Pundit' },
];

const GRADIENTS: Record<string, string> = {
  high: 'from-red-900 via-amber-800 to-red-900',
  medium: 'from-blue-900 via-indigo-800 to-blue-900',
  milestone: 'from-amber-900 via-yellow-800 to-amber-900',
  legend: 'from-purple-900 via-pink-800 to-purple-900',
  record: 'from-emerald-900 via-green-800 to-emerald-900',
  default: 'from-zinc-800 via-zinc-700 to-zinc-800',
};

const SPOTLIGHT_SEEN_KEY = 'career_spotlight_seen_records';
const RECORD_NEWS_KEY = 'career_record_news';

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── Spotlight Likes System ──────────────────────────────────────────────────

interface SpotlightPlayer {
  name: string;
  flag: string;
  position: 'ST' | 'RW' | 'LW' | 'CAM' | 'CM' | 'CDM' | 'CB' | 'LB' | 'RB' | 'GK';
  club: string;
  nationality: string;
  ovr: number;
}

const SPOTLIGHT_PLAYERS: SpotlightPlayer[] = [
  // Modern stars
  { name: 'Kylian Mbappé', flag: '🇫🇷', position: 'ST', club: 'Real Madrid', nationality: 'France', ovr: 92 },
  { name: 'Erling Haaland', flag: '🇳🇴', position: 'ST', club: 'Man City', nationality: 'Norway', ovr: 91 },
  { name: 'Mohamed Salah', flag: '🇪🇬', position: 'RW', club: 'Liverpool', nationality: 'Egypt', ovr: 89 },
  { name: 'Harry Kane', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'ST', club: 'Bayern Munich', nationality: 'England', ovr: 90 },
  { name: 'Jude Bellingham', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'CAM', club: 'Real Madrid', nationality: 'England', ovr: 90 },
  { name: 'Bukayo Saka', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'RW', club: 'Arsenal', nationality: 'England', ovr: 88 },
  { name: 'Cole Palmer', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'CAM', club: 'Chelsea', nationality: 'England', ovr: 87 },
  { name: 'Phil Foden', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', position: 'CAM', club: 'Man City', nationality: 'England', ovr: 88 },
  { name: 'Kevin De Bruyne', flag: '🇧🇪', position: 'CAM', club: 'Man City', nationality: 'Belgium', ovr: 91 },
  { name: 'Virgil van Dijk', flag: '🇳🇱', position: 'CB', club: 'Liverpool', nationality: 'Netherlands', ovr: 89 },
  { name: 'Luka Modrić', flag: '🇭🇷', position: 'CM', club: 'Real Madrid', nationality: 'Croatia', ovr: 86 },
  { name: 'Vinícius Jr.', flag: '🇧🇷', position: 'LW', club: 'Real Madrid', nationality: 'Brazil', ovr: 90 },
  { name: 'Rodri', flag: '🇪🇸', position: 'CDM', club: 'Man City', nationality: 'Spain', ovr: 91 },
  { name: 'Martin Ødegaard', flag: '🇳🇴', position: 'CAM', club: 'Arsenal', nationality: 'Norway', ovr: 88 },
  { name: 'Florian Wirtz', flag: '🇩🇪', position: 'CAM', club: 'Bayer Leverkusen', nationality: 'Germany', ovr: 87 },
  { name: 'Lamine Yamal', flag: '🇪🇸', position: 'RW', club: 'Barcelona', nationality: 'Spain', ovr: 86 },
  // Legends
  { name: 'Thierry Henry', flag: '🇫🇷', position: 'ST', club: 'Arsenal', nationality: 'France', ovr: 93 },
  { name: 'Cristiano Ronaldo', flag: '🇵🇹', position: 'ST', club: 'Al Nassr', nationality: 'Portugal', ovr: 92 },
  { name: 'Lionel Messi', flag: '🇦🇷', position: 'RW', club: 'Inter Miami', nationality: 'Argentina', ovr: 93 },
  { name: 'Zinedine Zidane', flag: '🇫🇷', position: 'CAM', club: 'Juventus', nationality: 'France', ovr: 94 },
  { name: 'Ronaldinho', flag: '🇧🇷', position: 'CAM', club: 'Barcelona', nationality: 'Brazil', ovr: 93 },
];

// Score how likely a player is to "like" a milestone
function scoreMilestoneLiker(player: SpotlightPlayer, milestoneId: string): number {
  let score = 0;

  // Position-based scoring
  const isAttacker = ['ST', 'RW', 'LW', 'CAM'].includes(player.position);
  const isMidfielder = ['CM', 'CDM', 'CAM'].includes(player.position);
  const isDefender = ['CB', 'LB', 'RB'].includes(player.position);

  switch (milestoneId) {
    // Goal milestones — attackers score high
    case 'goal_200': case 'goal_150': case 'goal_100': case 'goal_50': case 'goal_25':
    case 'golden_boot':
      score += isAttacker ? 40 : isMidfielder ? 15 : 5;
      // Strikers specifically
      if (player.position === 'ST') score += 15;
      break;

    // Assist milestones — midfielders score high
    case 'assist_100': case 'assist_50': case 'assist_25':
      score += isMidfielder ? 40 : isAttacker ? 15 : 5;
      if (player.position === 'CAM') score += 15;
      break;

    // Ballon d'Or — only elite players care
    case 'ballon_dor':
      score += player.ovr >= 90 ? 50 : player.ovr >= 85 ? 20 : 5;
      break;

    // UCL — big club players care more
    case 'ucl':
      score += ['Real Madrid', 'Barcelona', 'Bayern Munich', 'Man City', 'Liverpool', 'Arsenal'].includes(player.club) ? 35 : 15;
      break;

    // World Cup — everyone cares, but nationality matters
    case 'world_cup':
      score += 30;
      break;

    // League title
    case 'league_title':
      score += 20;
      break;

    // Record broken
    default:
      if (milestoneId.startsWith('record_')) {
        score += player.ovr >= 88 ? 25 : 10;
      }
      break;
  }

  // OVR tier bonus — elite players are more selective
  if (player.ovr >= 92) score += 10;
  else if (player.ovr >= 88) score += 5;

  // Add some randomness (±10)
  score += Math.floor(Math.random() * 20) - 10;

  return score;
}

function getSpotlightLikers(milestoneId: string, count: number = 5): SpotlightPlayer[] {
  const scored = SPOTLIGHT_PLAYERS.map(p => ({
    player: p,
    score: scoreMilestoneLiker(p, milestoneId),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.player);
}

interface SpotlightMilestone {
  id: string;
  stat: number;
  label: string;
  sub: string;
  image: any;
  priority: number;
  gradient: string;
  seasonLabel?: string;
}

function getSpotlightMilestones(data: any, count: number = 4): SpotlightMilestone[] {
  const profile = data.my_player_profile || {};
  const goals = data.total_goals || 0;
  const assists = data.total_assists || 0;
  const apps = data.total_appearances || 0;
  const seasons = data.seasons || [];
  const ovr = parseInt(profile.overallrating || '0');
  const motmTotal = seasons.reduce((sum: number, s: any) => sum + (s.motm || 0), 0);
  const avgRating = seasons.length > 0
    ? (seasons.reduce((sum: number, s: any) => sum + (parseFloat(s.avgRating) || 0), 0) / seasons.length)
    : 0;
  const seasonGoals = seasons.length > 0 ? (seasons[seasons.length - 1].goals || 0) : 0;
  const seasonAssists = seasons.length > 0 ? (seasons[seasons.length - 1].assists || 0) : 0;
  const totalGandA = goals + assists;

  const milestones: { id: string; stat: number; label: string; sub: string; image: any; priority: number; gradient: string; seasonLabel?: string }[] = [];

  // Check for recently broken records from Immortal Records chase (current season only).
  // NOTE: this function MUST stay pure (no localStorage writes) — it runs inside a
  // useMemo which StrictMode double-invokes in dev. Seen-marking happens in a
  // useEffect after the milestone is actually displayed (see NewsFeed component).
  try {
    const seenRecords: string[] = JSON.parse(localStorage.getItem(SPOTLIGHT_SEEN_KEY) || '[]');
    const recordNews = JSON.parse(localStorage.getItem(RECORD_NEWS_KEY) || '[]');

    // Get current season ID
    const currentSeason = seasons.length > 0 ? seasons[seasons.length - 1] : null;
    const currentSeasonId = currentSeason?.id || '';

    // Find the most recent un-seen broken record from CURRENT season only
    for (const news of recordNews) {
      if (news.category === 'record' && !seenRecords.includes(news.id)) {
        // Only show records from current season
        if (news.seasonId && news.seasonId !== currentSeasonId) {
          continue; // Skip old records from previous seasons
        }

        // Use the record title from the news item
        const recordTitle = news.recordTitle || news.headline?.replace(/BREAKS/i, '').replace(/!/g, '').trim() || 'RECORD BROKEN';

        milestones.push({
          id: `record_${news.id}`,
          stat: 1,
          label: recordTitle,
          sub: news.details || 'A legendary record has been shattered!',
          image: leagueImg, // Trophy image for records
          priority: 200, // Highest priority — always show broken records first
          gradient: 'from-amber-500 via-yellow-400 to-amber-500',
          seasonLabel: news.seasonLabel,
        });

        break; // Only show one at a time
      }
    }
  } catch { /* ignore */ }

  // Trophy wins come from the real data.trophies (trophy cabinet), not just
  // profile.individualAwards which the pipeline leaves empty.
  const trophies = data.trophies || [];
  const awards = profile.individualAwards || [];
  const hasTrophy = (iconType: string) => trophies.some((t: any) => t.iconType === iconType && (t.quantity || 0) > 0);

  // Ballon d'Or (from awards or trophy cabinet)
  if (hasTrophy('ballondor') || awards.includes('Ballon d\'Or') || awards.includes('ballon_d_or')) {
    milestones.push({
      id: 'ballon_dor',
      stat: 1,
      label: 'BALLON D\'OR',
      sub: 'The highest individual honour in world football',
      image: ballonDorImg,
      priority: 100,
      gradient: 'from-amber-600 via-yellow-500 to-amber-600',
    });
  }

  // Golden Boot
  if (hasTrophy('goldenboot') || awards.includes('Golden Boot') || (seasonGoals >= 20)) {
    milestones.push({
      id: 'golden_boot',
      stat: seasonGoals,
      label: 'GOLDEN BOOT',
      sub: `${seasonGoals} goals in one season — the league's deadliest striker`,
      image: goldenBootImg,
      priority: 95,
      gradient: 'from-amber-700 via-yellow-600 to-amber-700',
    });
  }

  // League title
  if (hasTrophy('league') || awards.includes('League Title') || awards.includes('league_title')) {
    milestones.push({
      id: 'league_title',
      stat: 1,
      label: 'LEAGUE CHAMPION',
      sub: 'Champions of the league — a season of dominance',
      image: leagueImg,
      priority: 96,
      gradient: 'from-blue-600 via-indigo-500 to-blue-600',
    });
  }

  // UCL
  if (hasTrophy('champions') || awards.includes('Champions League') || awards.includes('ucl')) {
    milestones.push({
      id: 'ucl',
      stat: 1,
      label: 'UCL GLORY',
      sub: 'Champions of Europe — the ultimate club competition',
      image: uclImg,
      priority: 92,
      gradient: 'from-indigo-700 via-purple-600 to-indigo-700',
    });
  }

  // UEL
  if (hasTrophy('europaleague') || awards.includes('Europa League') || awards.includes('uel')) {
    milestones.push({
      id: 'uel',
      stat: 1,
      label: 'UEFA EUROPA LEAGUE CHAMPION',
      sub: 'Kings of Europe\'s second tier — silverware secured on the continent',
      image: leagueImg,
      priority: 93,
      gradient: 'from-orange-700 via-amber-600 to-orange-700',
    });
  }

  // World Cup
  if (awards.includes('World Cup') || awards.includes('world_cup')) {
    milestones.push({
      id: 'world_cup',
      stat: 1,
      label: 'WORLD CHAMPION',
      sub: 'Champion of the world — football immortality',
      image: worldCupImg,
      priority: 100,
      gradient: 'from-blue-700 via-red-500 to-blue-700',
    });
  }

  // Career goal milestones
  const goalMilestones = [
    { at: 200, label: '200 CAREER GOALS', sub: 'Two centuries of goals — absolute legend', priority: 85, gradient: 'from-amber-600 via-orange-500 to-amber-600' },
    { at: 150, label: '150 CAREER GOALS', sub: 'One hundred and fifty and counting', priority: 80, gradient: 'from-amber-700 via-orange-600 to-amber-700' },
    { at: 100, label: '100 CAREER GOALS', sub: 'The century milestone — 100 career goals', priority: 78, gradient: 'from-amber-800 via-orange-700 to-amber-800' },
    { at: 50, label: '50 CAREER GOALS', sub: 'Half a century of goals — a major milestone', priority: 70, gradient: 'from-amber-900 via-orange-800 to-amber-900' },
    { at: 25, label: '25 CAREER GOALS', sub: 'Quarter century mark — building momentum', priority: 60, gradient: 'from-zinc-800 via-amber-900 to-zinc-800' },
  ];
  for (const m of goalMilestones) {
    if (goals >= m.at) {
      milestones.push({
        id: `goal_${m.at}`,
        stat: goals,
        label: m.label,
        sub: m.sub,
        image: goldenBootImg,
        priority: m.priority,
        gradient: m.gradient,
      });
      break;
    }
  }

  // Career assist milestones
  const assistMilestones = [
    { at: 100, label: '100 CAREER ASSISTS', sub: 'One hundred assists — the ultimate creator', priority: 77, gradient: 'from-purple-700 via-blue-600 to-purple-700' },
    { at: 50, label: '50 CAREER ASSISTS', sub: 'Half a century of assists — vision incarnate', priority: 68, gradient: 'from-purple-800 via-blue-700 to-purple-800' },
    { at: 25, label: '25 CAREER ASSISTS', sub: 'Quarter century of key passes', priority: 58, gradient: 'from-purple-900 via-blue-800 to-purple-900' },
  ];
  for (const m of assistMilestones) {
    if (assists >= m.at) {
      milestones.push({
        id: `assist_${m.at}`,
        stat: assists,
        label: m.label,
        sub: m.sub,
        image: motmImg,
        priority: m.priority,
        gradient: m.gradient,
      });
      break;
    }
  }

  // Career appearance milestones
  const appearanceMilestones = [
    { at: 200, label: '200 CAREER APPEARANCES', sub: 'Two hundred matches — an ironman', priority: 75, gradient: 'from-emerald-700 via-green-600 to-emerald-700' },
    { at: 100, label: '100 CAREER APPEARANCES', sub: 'The century of appearances — loyal servant', priority: 72, gradient: 'from-emerald-800 via-green-700 to-emerald-800' },
    { at: 50, label: '50 CAREER APPEARANCES', sub: 'Half a century of matches — ever-present', priority: 62, gradient: 'from-emerald-900 via-green-800 to-emerald-900' },
  ];
  for (const m of appearanceMilestones) {
    if (apps >= m.at) {
      milestones.push({
        id: `apps_${m.at}`,
        stat: apps,
        label: m.label,
        sub: m.sub,
        image: cupImg,
        priority: m.priority,
        gradient: m.gradient,
      });
      break;
    }
  }

  // MOTM milestone
  const motmMilestones = [
    { at: 30, label: '30x MAN OF THE MATCH', sub: 'Dominating matches week after week', priority: 65, gradient: 'from-yellow-700 via-amber-600 to-yellow-700' },
    { at: 20, label: '20x MAN OF THE MATCH', sub: 'Twenty man of the match awards', priority: 63, gradient: 'from-yellow-800 via-amber-700 to-yellow-800' },
    { at: 10, label: '10x MAN OF THE MATCH', sub: 'Double figures in MOTM awards', priority: 55, gradient: 'from-yellow-900 via-amber-800 to-yellow-900' },
  ];
  for (const m of motmMilestones) {
    if (motmTotal >= m.at) {
      milestones.push({
        id: `motm_${m.at}`,
        stat: motmTotal,
        label: m.label,
        sub: m.sub,
        image: motmImg,
        priority: m.priority,
        gradient: m.gradient,
      });
      break;
    }
  }

  // OVR milestones
  if (ovr >= 85) {
    milestones.push({
      id: 'ovr_85',
      stat: ovr,
      label: `${ovr} OVR — WORLD CLASS`,
      sub: 'Entering the upper echelon of world football',
      image: ballonDorImg,
      priority: 82,
      gradient: 'from-red-600 via-amber-500 to-red-600',
    });
  } else if (ovr >= 80) {
    milestones.push({
      id: 'ovr_80',
      stat: ovr,
      label: `${ovr} OVR — ELITE TERRITORY`,
      sub: 'Now ranked among the best in the world',
      image: goldenBootImg,
      priority: 76,
      gradient: 'from-red-700 via-amber-600 to-red-700',
    });
  }

  // Total G+A milestone
  if (totalGandA >= 200) {
    milestones.push({
      id: 'ga_200',
      stat: totalGandA,
      label: `${totalGandA} CAREER GOALS + ASSISTS`,
      sub: 'Two hundred goal involvements — elite production',
      image: leagueImg,
      priority: 73,
      gradient: 'from-cyan-700 via-blue-600 to-cyan-700',
    });
  } else if (totalGandA >= 100) {
    milestones.push({
      id: 'ga_100',
      stat: totalGandA,
      label: `${totalGandA} CAREER GOALS + ASSISTS`,
      sub: 'One hundred goal involvements — a century of production',
      image: leagueImg,
      priority: 71,
      gradient: 'from-cyan-800 via-blue-700 to-cyan-800',
    });
  }

  if (milestones.length === 0) return [];
  milestones.sort((a, b) => b.priority - a.priority);
  return milestones.slice(0, count);
}

// Pick a comparable legend by position for the spotlight comparison card
function getComparisonLegend(data: any) {
  const profile = data.my_player_profile || {};
  const posMap: Record<string, string> = {
    '20': 'RW', '21': 'CF', '22': 'LF', '23': 'RW', '24': 'ST', '25': 'ST', '26': 'LW', '27': 'LW'
  };
  const pos = posMap[profile.preferredposition1] || 'ST';
  const samePosition = TOP_100_LEGENDS.filter((l: any) => l.position === pos);
  const pool = samePosition.length > 0 ? samePosition : TOP_100_LEGENDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Legend-vs-player comparison card
const LegendCompareCard: React.FC<{ data: any; legend: any }> = ({ data, legend }) => {
  const profile = data.my_player_profile || {};
  const seasons = data.seasons || [];
  const playerName = `${profile.firstname || 'Your'} ${profile.lastname || 'Player'}`.trim();
  const goals = seasons.reduce((s: number, sn: any) => s + (sn.goals || 0), 0);
  const assists = seasons.reduce((s: number, sn: any) => s + (sn.assists || 0), 0);
  const apps = seasons.reduce((s: number, sn: any) => s + (sn.apps || 0), 0);

  const rows = [
    { label: 'Goals', player: goals, legend: legend.goals },
    { label: 'Assists', player: assists, legend: legend.assists },
    { label: 'Apps', player: apps, legend: legend.appearances || 0 },
  ];
  const playerCloser = rows.filter((r) => r.player > 0 && r.player / Math.max(1, r.legend) > 0.5).length;
  const ratio = playerCloser / rows.length;

  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border-2 border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 overflow-hidden shadow-2xl">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <Trophy className="w-4 h-4" /> Player vs Legend
        </span>
        <span className="text-[10px] text-zinc-500 font-bold">{legend.era}</span>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <div className="text-xs font-bold text-white">{playerName}</div>
            <div className="text-[10px] text-zinc-500 font-medium">Your Career</div>
          </div>
          <div className="text-[10px] font-black text-zinc-600">VS</div>
          <div className="text-right">
            <div className="text-xs font-bold text-white">{legend.name}</div>
            <div className="text-[10px] text-zinc-500 font-medium">{legend.flag} {legend.position}</div>
          </div>
        </div>

        {rows.map((r) => {
          const pct = r.legend > 0 ? Math.min(100, Math.round((r.player / r.legend) * 100)) : 0;
          const whoWins = r.player > r.legend ? 'bg-amber-400' : 'bg-zinc-600';
          return (
            <div key={r.label}>
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1">
                <span>{r.player}</span>
                <span className="text-zinc-600">{r.label}</span>
                <span>{r.legend}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex justify-end">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[9px] font-black text-zinc-600">P</span>
                <span className="text-[9px] font-black text-zinc-600">L</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-zinc-400" style={{ width: `${100 - pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}

        <div className={`rounded-xl px-3 py-2 text-center text-[11px] font-bold ${ratio >= 0.5 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'}`}>
          {ratio >= 0.5
            ? `${playerName} is already putting up ${legend.name} numbers. Early days, but the trajectory is real.`
            : `Still chasing ${legend.name}. Keep stacking goals and assists — the gap will close.`}
        </div>
      </div>
    </div>
  );
};

function generateTemplatePunditCards(data: any): PunditCard[] {
  const cards: PunditCard[] = [];
  const profile = data.my_player_profile || {};
  const goals = data.total_goals || 0;
  const assists = data.total_assists || 0;
  const ovr = parseInt(profile.overallrating || '0');
  const seasons = data.seasons || [];
  const playerName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Your Player';
  const playerClub = profile.currentClub || 'Unknown Club';
  const playerNationality = FIFA_NATIONALITY_MAP[profile.nationality?.toString() || '']?.name || profile.nationality || 'Unknown';
  const motmTotal = seasons.reduce((sum: number, s: any) => sum + (s.motm || 0), 0);
  const avgRating = seasons.length > 0
    ? (seasons.reduce((sum: number, s: any) => sum + (parseFloat(s.avgRating) || 0), 0) / seasons.length).toFixed(2)
    : '0.00';
  const latestSeason = seasons.length > 0 ? seasons[seasons.length - 1] : null;
  const seasonGoals = latestSeason ? (latestSeason.goals || 0) : 0;
  const seasonAssists = latestSeason ? (latestSeason.assists || 0) : 0;
  const seed = Math.floor(Date.now() / 60000); // Changes every 60 seconds

  const templates: (() => PunditCard | null)[] = [
    () => {
      if (goals >= 50) return { id: 'p50g', pundit: PUNDITS[0].name, network: PUNDITS[0].network, flag: PUNDITS[0].flag, role: PUNDITS[0].role, headline: `${goals} CAREER GOALS AND COUNTING!`, detail: `${playerName} has reached the half-century mark. A prolific scorer!`, gradient: GRADIENTS.milestone, priority: 'high' };
      return null;
    },
    () => {
      if (assists >= 50) return { id: 'p50a', pundit: PUNDITS[2].name, network: PUNDITS[2].network, flag: PUNDITS[2].flag, role: PUNDITS[2].role, headline: `${assists} CAREER ASSISTS — CREATIVITY MACHINE!`, detail: `${playerName} with ${assists} assists. The vision is world-class!`, gradient: GRADIENTS.legend, priority: 'high' };
      return null;
    },
    () => {
      if (goals >= 100) return { id: 'p100g', pundit: PUNDITS[1].name, network: PUNDITS[1].network, flag: PUNDITS[1].flag, role: PUNDITS[1].role, headline: `100 GOALS! CENTURY CLUB!`, detail: `${goals} career goals — ${playerName} joins the hundred club!`, gradient: GRADIENTS.record, priority: 'high' };
      return null;
    },
    () => {
      if (seasonGoals >= 20) return { id: 'sg20', pundit: PUNDITS[3].name, network: PUNDITS[3].network, flag: PUNDITS[3].flag, role: PUNDITS[3].role, headline: `${seasonGoals} GOALS THIS SEASON!`, detail: `${seasonGoals} league goals. Golden Boot contender!`, gradient: GRADIENTS.high, priority: 'high' };
      return null;
    },
    () => {
      if (seasonAssists >= 10) return { id: 'sa10', pundit: PUNDITS[5].name, network: PUNDITS[5].network, flag: PUNDITS[5].flag, role: PUNDITS[5].role, headline: `${seasonAssists} ASSISTS THIS SEASON!`, detail: `${seasonAssists} assists — the creative heartbeat!`, gradient: GRADIENTS.legend, priority: 'high' };
      return null;
    },
    () => {
      if (ovr >= 80) return { id: 'ovr80', pundit: PUNDITS[0].name, network: PUNDITS[0].network, flag: PUNDITS[0].flag, role: PUNDITS[0].role, headline: `${ovr} OVR — ELITE PLAYER!`, detail: `Rated ${ovr} overall. The trajectory is unbelievable!`, gradient: GRADIENTS.high, priority: 'medium' };
      return null;
    },
    () => {
      if (motmTotal > 0) return { id: 'motm', pundit: PUNDITS[2].name, network: PUNDITS[2].network, flag: PUNDITS[2].flag, role: PUNDITS[2].role, headline: `${motmTotal}x MAN OF THE MATCH!`, detail: `${motmTotal} MOTM awards. Avg rating: ${avgRating}.`, gradient: GRADIENTS.milestone, priority: 'medium' };
      return null;
    },
    () => {
      const takes = [
        { headline: `THE MOST EXCITING YOUNG PLAYER IN WORLD FOOTBALL`, detail: `${playerName} at ${ovr} OVR. The ceiling is unlimited!` },
        { headline: `${playerClub.toUpperCase()}'S GREATEST PLAYER`, detail: `${goals}G ${assists}A — rewriting history!` },
        { headline: `${playerNationality.toUpperCase()}'S FINEST`, detail: `Representing ${playerNationality} at the highest level!` },
        { headline: `THE NUMBERS DON'T LIE`, detail: `${avgRating} avg rating. Consistently dominant!` },
      ];
      const take = takes[seed % takes.length];
      const p = PUNDITS[(seed * 7) % PUNDITS.length];
      return { id: `hot-take-${seed % 4}`, pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: take.headline, detail: take.detail, gradient: GRADIENTS.default, priority: 'medium' };
    },
  ];

  for (const template of templates) {
    const card = template();
    if (card) cards.push(card);
  }

  return seededShuffle(cards, seed);
}

// Pundit horizontal ticker
const PunditSlide: React.FC<{ card: PunditCard }> = ({ card }) => (
  <div className={`flex-shrink-0 w-72 h-full bg-gradient-to-br ${card.gradient} rounded-xl overflow-hidden relative`}>
    <div className="absolute inset-0">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/30 to-transparent" />
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
    </div>
    <div className="absolute top-2 left-2 z-10">
      <div className="px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[8px] font-bold text-white uppercase">
        {card.network}
      </div>
    </div>
    {card.priority === 'high' && (
      <div className="absolute top-2 right-2 z-10">
        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[7px] font-black rounded-full uppercase animate-pulse">
          BREAKING
        </span>
      </div>
    )}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-white/5 border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
        <span className="text-2xl">{card.flag}</span>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
      <div className="text-[10px] font-bold text-white/60 mb-1">{card.pundit} &bull; {card.role}</div>
      <h4 className="text-[11px] font-black text-white leading-tight line-clamp-2">{card.headline}</h4>
      <p className="text-[9px] text-white/50 mt-1 line-clamp-2">{card.detail}</p>
    </div>
  </div>
);

const PunditTicker: React.FC<{ cards: PunditCard[]; loading: boolean }> = ({ cards, loading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || !scrollRef.current || cards.length === 0) return;
    const el = scrollRef.current;
    let animId: number;
    let pos = 0;
    const tick = () => {
      pos += 1;
      if (pos >= el.scrollWidth - el.clientWidth) pos = 0;
      el.scrollLeft = pos;
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, cards.length]);

  if (loading) {
    return (
      <div className="relative overflow-hidden bg-zinc-950 border border-zinc-800 rounded-2xl h-40 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500">
          <div className="w-4 h-4 border-2 border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-xs">Loading pundit takes...</span>
        </div>
      </div>
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className="relative overflow-hidden bg-zinc-950 border border-zinc-800 rounded-2xl h-40">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-hidden py-2 px-3 h-full"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {[...cards, ...cards].map((card, idx) => (
          <PunditSlide key={`${card.id}-${idx}`} card={card} />
        ))}
      </div>
    </div>
  );
};

// Spotlight phone-screen news card
const SpotlightCard: React.FC<{ milestone: SpotlightMilestone }> = ({ milestone }) => {
  const likers = useMemo(() => getSpotlightLikers(milestone.id, 5), [milestone.id]);
  const totalLikes = useMemo(() => {
    // Simulate a realistic like count based on milestone priority
    const base = milestone.priority * 50;
    return base + Math.floor(Math.random() * base * 0.3);
  }, [milestone.priority]);

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[9/16] max-h-[520px] rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl">
      {/* Background image */}
      <img
        src={milestone.image}
        alt={milestone.label}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Overlay gradient */}
      <div className={`absolute inset-0 bg-gradient-to-t ${milestone.gradient} opacity-80`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />

      {/* Top badge */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase border border-white/20">
            Spotlight
          </span>
          <span className="px-3 py-1 bg-amber-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-amber-300 uppercase border border-amber-500/30 animate-pulse">
            LIVE
          </span>
        </div>
      </div>

      {/* Central icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shadow-2xl">
          <img
            src={milestone.image}
            alt={milestone.label}
            className="w-20 h-20 object-contain drop-shadow-2xl"
          />
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">Career Milestone</span>
          </div>
          <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
            {milestone.label}
          </h2>
          {milestone.seasonLabel && (
            <span className="inline-block px-2 py-0.5 bg-amber-500/20 backdrop-blur-md rounded-full text-[10px] font-bold text-amber-300 uppercase border border-amber-500/30">
              {milestone.seasonLabel} Season
            </span>
          )}
          <p className="text-sm text-white/70 leading-relaxed">
            {milestone.sub}
          </p>
          <div className="pt-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-300 font-bold">ACHIEVED</span>
            </div>
            <span className="text-[10px] text-white/40">•</span>
            <span className="text-[10px] text-white/50 font-medium">{milestone.stat} total</span>
          </div>

          {/* Likes section */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
              <span className="text-[10px] text-white/60 font-medium">
                {totalLikes.toLocaleString()} likes
              </span>
            </div>
            <div className="flex items-center mt-1.5">
              <div className="flex -space-x-2">
                {likers.map((p, i) => (
                  <div
                    key={p.name}
                    className="w-6 h-6 rounded-full border border-black flex items-center justify-center text-[10px] shadow-md"
                    style={{ zIndex: likers.length - i, backgroundColor: i % 2 === 0 ? '#1a1a2e' : '#16213e' }}
                    title={p.name}
                  >
                    {p.flag}
                  </div>
                ))}
              </div>
              <span className="text-[9px] text-white/40 ml-2 truncate">
                Liked by {likers[0].name} and {totalLikes - 1 > 0 ? `${totalLikes - 1} others` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Season news item
const NewsCard: React.FC<{ item: any; isLatest: boolean }> = ({ item, isLatest }) => {
  const categoryColors: Record<string, string> = {
    performance: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    transfer: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    milestone: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    injury: 'bg-red-500/10 text-red-400 border-red-500/30',
    award: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    match: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    default: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  };
  const colorClass = categoryColors[item.category] || categoryColors.default;

  return (
    <div className={`bg-zinc-900/80 border rounded-2xl overflow-hidden transition-all hover:border-zinc-700 ${isLatest ? 'border-amber-500/30 shadow-lg shadow-amber-500/5' : 'border-zinc-800'}`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${colorClass}`}>
            {item.category}
          </span>
          {item.priority === 'high' && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full uppercase animate-pulse">
              BREAKING
            </span>
          )}
          {isLatest && (
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[8px] font-bold rounded-full uppercase">
              NEW
            </span>
          )}
        </div>
        <h3 className="text-sm font-bold text-white leading-tight">{item.headline}</h3>
        <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">{item.details}</p>
        <p className="text-[10px] text-zinc-600 mt-2">{item.timestamp}</p>
      </div>
    </div>
  );
};

export const NewsFeed: React.FC = () => {
  const [punditCards, setPunditCards] = useState<PunditCard[]>([]);
  const [punditLoading, setPunditLoading] = useState(true);
  const [spotlightVersion, setSpotlightVersion] = useState(0);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const data = getActiveCareerData() as any;
  const profile = data.my_player_profile || {};
  const seasons = data.seasons || [];
  const newsItems = useMemo(() => (data.news || []) as any[], [data]);

  const spotlights = useMemo(() => getSpotlightMilestones(data, 4), [data, spotlightVersion]);
  const spotlight = spotlights.length > 0 ? spotlights[Math.min(spotlightIndex, spotlights.length - 1)] : null;
  const comparisonLegend = useMemo(() => getComparisonLegend(data), [data]);

  // Once a record milestone is actually committed & displayed, mark its news as
  // "seen" so it doesn't re-appear. Side effect lives here (post-render), NOT
  // inside getSpotlightMilestones, which StrictMode would double-invoke in dev.
  useEffect(() => {
    for (const ms of spotlights) {
      if (ms.id.startsWith('record_')) {
        const newsId = ms.id.slice('record_'.length);
        try {
          const seenRecords: string[] = JSON.parse(localStorage.getItem(SPOTLIGHT_SEEN_KEY) || '[]');
          if (!seenRecords.includes(newsId)) {
            seenRecords.push(newsId);
            localStorage.setItem(SPOTLIGHT_SEEN_KEY, JSON.stringify(seenRecords));
          }
        } catch { /* ignore */ }
      }
    }
  }, [spotlights]);

  // Auto-advance the spotlight carousel
  useEffect(() => {
    if (spotlights.length <= 1) return;
    const t = setInterval(() => {
      setSpotlightIndex(i => (i + 1) % spotlights.length);
    }, 6000);
    return () => clearInterval(t);
  }, [spotlights.length]);

  // Listen for record news changes to refresh spotlight
  useEffect(() => {
    const handleRecordNews = () => {
      setSpotlightVersion(v => v + 1);
    };
    window.addEventListener('career-record-news-changed', handleRecordNews);
    return () => window.removeEventListener('career-record-news-changed', handleRecordNews);
  }, []);

  useEffect(() => {
    const load = async () => {
      setPunditLoading(true);
      const llmCards = await generateLLMPunditCards(data);
      if (llmCards.length > 0) {
        setPunditCards(llmCards);
      } else {
        setPunditCards(generateTemplatePunditCards(data));
      }
      setPunditLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-5 rounded-2xl">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">CAREER NEWS</h2>
          <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full">LIVE FEED</span>
        </div>
        <p className="text-zinc-400 text-xs mt-1">Milestones &bull; Pundit reactions &bull; Season updates</p>
      </div>

      {/* Section 1: Pundit Reactions (horizontal ticker) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-zinc-400 uppercase">Pundit Reactions</span>
          <span className="text-[10px] text-zinc-600">&bull; Hover to pause</span>
        </div>
        <PunditTicker cards={punditCards} loading={punditLoading} />
      </div>

      {/* Section 2: Spotlight milestone carousel */}
      {spotlight && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-zinc-400 uppercase">Spotlight</span>
            <span className="text-[10px] text-zinc-600">&bull; {spotlights.length} milestones</span>
          </div>
          <div className="relative">
            {spotlights.length > 1 && (
              <button
                onClick={() => setSpotlightIndex(i => (i - 1 + spotlights.length) % spotlights.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                aria-label="Previous spotlight"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div key={spotlight.id} className="animate-fadeIn">
              <SpotlightCard milestone={spotlight} />
            </div>
            {spotlights.length > 1 && (
              <button
                onClick={() => setSpotlightIndex(i => (i + 1) % spotlights.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                aria-label="Next spotlight"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            {spotlights.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {spotlights.map((ms, idx) => (
                  <button
                    key={ms.id}
                    onClick={() => setSpotlightIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${idx === spotlightIndex ? 'w-6 bg-amber-400' : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'}`}
                    aria-label={`Go to milestone ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="mt-3">
            <LegendCompareCard data={data} legend={comparisonLegend} />
          </div>
        </div>
      )}

      {/* Section 3: Other news */}
      {newsItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-zinc-400 uppercase">Season News</span>
            <span className="text-[10px] text-zinc-600">&bull; {newsItems.length} updates</span>
          </div>
          <div className="space-y-3">
            {newsItems.slice(0, 10).map((item, idx) => (
              <NewsCard key={item.id || idx} item={item} isLatest={idx === 0} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!spotlight && newsItems.length === 0 && punditCards.length === 0 && !punditLoading && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 text-center">
          <Award className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-400 mb-2">NO NEWS YET</h3>
          <p className="text-sm text-zinc-600">News will appear as your career progresses.</p>
        </div>
      )}
    </div>
  );
};
