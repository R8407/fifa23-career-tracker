import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Flame, MessageCircle, Heart, Share2 } from 'lucide-react';
import careerExportData from '../data/career_export.json';

interface NewsItem {
  id: string;
  timestamp: string;
  category: string;
  headline: string;
  details: string;
  priority: string;
  image?: string;
}

interface PunditCard {
  id: string;
  pundit: string;
  network: string;
  flag: string;
  role: string;
  headline: string;
  detail: string;
  gradient: string;
  priority: 'high' | 'medium';
}

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

const FAN_COMMENTS = [
  { name: 'Marco T.', flag: '\u{1F1EE}\u{E0067}', text: 'This guy is the REAL DEAL!' },
  { name: 'Liam O\'Brien', flag: '\u{1F1EE}\u{E0067}', text: 'Best young player in the world right now!' },
  { name: 'Carlos Mendoza', flag: '\u{1F1EA}\u{E0067}', text: 'POV: You chose the right career mode save' },
  { name: 'Jean-Pierre D.', flag: '\u{1F1EB}\u{E0067}', text: 'Future Ballon d\'Or winner right here' },
  { name: 'Tommy Wright', flag: '\u{1F3F4}\u{E0067}\u{E0073}\u{E0063}\u{E007F}', text: 'This career mode save is a movie' },
];

const GRADIENTS: Record<string, string> = {
  high: 'from-red-900 via-amber-800 to-red-900',
  medium: 'from-blue-900 via-indigo-800 to-blue-900',
  milestone: 'from-amber-900 via-yellow-800 to-amber-900',
  legend: 'from-purple-900 via-pink-800 to-purple-900',
  record: 'from-emerald-900 via-green-800 to-emerald-900',
  default: 'from-zinc-800 via-zinc-700 to-zinc-800',
};

const RECORDS = [
  { id: 'rec_spezia_alltime_goals', title: 'Spezia All-Time Top Scorer', holder: 'Multiple Players', value: 45, unit: 'goals', difficulty: 'Easy' },
  { id: 'rec_spezia_single_season_goals', title: 'Spezia Most Goals in One Season', holder: 'M\'Bala Nzola', value: 11, unit: 'goals', difficulty: 'Easy' },
  { id: 'rec_spezia_single_season_assists', title: 'Spezia Most Assists in One Season', holder: 'Daniele Verde', value: 6, unit: 'assists', difficulty: 'Easy' },
  { id: 'rec_seriea_single_season_assists', title: 'Most Serie A Assists in One Season', holder: 'Francesco Totti', value: 17, unit: 'assists', difficulty: 'Elite' },
  { id: 'rec_seriea_single_season_goals', title: 'Most Serie A Goals in One Season', holder: 'Gonzalo Higuaín', value: 36, unit: 'goals', difficulty: 'Elite' },
  { id: 'rec_pl_single_season_assists', title: 'Most PL Assists in One Season', holder: 'Thierry Henry', value: 20, unit: 'assists', difficulty: 'Elite' },
  { id: 'rec_pl_single_season_goals', title: 'Most PL Goals in One Season', holder: 'Erling Haaland', value: 36, unit: 'goals', difficulty: 'Elite' },
  { id: 'rec_laliga_single_season_assists', title: 'Most La Liga Assists in One Season', holder: 'Lionel Messi', value: 21, unit: 'assists', difficulty: 'Elite' },
  { id: 'rec_bundesliga_single_season_assists', title: 'Most Bundesliga Assists in One Season', holder: 'Thomas Müller', value: 21, unit: 'assists', difficulty: 'Elite' },
  { id: 'rec_ligue1_single_season_assists', title: 'Most Ligue 1 Assists in One Season', holder: '\u00c1ngel Di Mar\u00eda', value: 18, unit: 'assists', difficulty: 'Elite' },
];

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

function generatePunditCards(data: any): PunditCard[] {
  const cards: PunditCard[] = [];
  const profile = data.my_player_profile || {};
  const goals = data.total_goals || 0;
  const assists = data.total_assists || 0;
  const apps = data.total_appearances || 0;
  const ovr = parseInt(profile.overallrating || '65');
  const pot = parseInt(profile.potential || '81');
  const seasons = data.seasons || [];
  const playerName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Your Player';
  const motmTotal = seasons.reduce((sum: number, s: any) => sum + (s.motm || 0), 0);
  const avgRating = seasons.length > 0
    ? (seasons.reduce((sum: number, s: any) => sum + (parseFloat(s.avgRating) || 0), 0) / seasons.length).toFixed(2)
    : '0.00';
  const latestSeason = seasons.length > 0 ? seasons[seasons.length - 1] : null;
  const seasonGoals = latestSeason ? (latestSeason.goals || 0) : 0;
  const seasonAssists = latestSeason ? (latestSeason.assists || 0) : 0;
  const seed = Math.floor(Date.now() / 60000);

  // TEMPLATES: Each returns a PunditCard or null
  const templates: (() => PunditCard | null)[] = [
    // 1. Record chase — Spezia all-time goals
    () => {
      const rec = RECORDS[0];
      const remaining = rec.value - goals;
      if (remaining <= 0) return { id: 'rec-spezia-goals-broken', pundit: PUNDITS[0].name, network: PUNDITS[0].network, flag: PUNDITS[0].flag, role: PUNDITS[0].role, headline: `${playerName} BREAKS SPEZIA'S ALL-TIME GOALS RECORD!`, detail: `${goals} goals -- surpassing the record of ${rec.value}. A Spezia legend forever!`, gradient: GRADIENTS.record, priority: 'high' };
      if (remaining <= 10) return { id: 'rec-spezia-goals-chase', pundit: PUNDITS[1].name, network: PUNDITS[1].network, flag: PUNDITS[1].flag, role: PUNDITS[1].role, headline: `${remaining} GOALS FROM SPEZIA'S ALL-TIME RECORD!`, detail: `${goals} goals scored, ${remaining} more to surpass ${rec.holder}'s record of ${rec.value}. The chase is ON!`, gradient: GRADIENTS.milestone, priority: 'high' };
      return null;
    },
    // 2. Record chase — Spezia single season goals
    () => {
      const rec = RECORDS[1];
      const remaining = rec.value - seasonGoals;
      if (remaining <= 0) return { id: 'rec-spezia-ssg-broken', pundit: PUNDITS[2].name, network: PUNDITS[2].network, flag: PUNDITS[2].flag, role: PUNDITS[2].role, headline: `NEW SPEZIA SEASON GOALS RECORD!`, detail: `${seasonGoals} goals this season -- breaking ${rec.holder}'s record of ${rec.value}!`, gradient: GRADIENTS.record, priority: 'high' };
      if (remaining <= 4) return { id: 'rec-spezia-ssg-chase', pundit: PUNDITS[3].name, network: PUNDITS[3].network, flag: PUNDITS[3].flag, role: PUNDITS[3].role, headline: `${remaining} GOALS FROM SPEZIA'S SEASON RECORD!`, detail: `${seasonGoals} goals this season, ${remaining} more to beat ${rec.holder} (${rec.value}). Can he do it?`, gradient: GRADIENTS.milestone, priority: 'high' };
      return null;
    },
    // 3. Record chase — Spezia single season assists
    () => {
      const rec = RECORDS[2];
      const remaining = rec.value - seasonAssists;
      if (remaining <= 0) return { id: 'rec-spezia-ssa-broken', pundit: PUNDITS[4].name, network: PUNDITS[4].network, flag: PUNDITS[4].flag, role: PUNDITS[4].role, headline: `SPEZIA'S SEASON ASSISTS RECORD SHATTERED!`, detail: `${seasonAssists} assists this season -- breaking ${rec.holder}'s record of ${rec.value}!`, gradient: GRADIENTS.record, priority: 'high' };
      if (remaining <= 3) return { id: 'rec-spezia-ssa-chase', pundit: PUNDITS[5].name, network: PUNDITS[5].network, flag: PUNDITS[5].flag, role: PUNDITS[5].role, headline: `${remaining} ASSISTS FROM SPEZIA'S SEASON RECORD!`, detail: `${seasonAssists} assists this season, ${remaining} more to beat ${rec.holder} (${rec.value}). Pure vision!`, gradient: GRADIENTS.milestone, priority: 'high' };
      return null;
    },
    // 4. Record chase — Serie A season assists (Totti)
    () => {
      const rec = RECORDS[3];
      const remaining = rec.value - seasonAssists;
      if (seasonAssists >= rec.value - 5 && seasonAssists < rec.value) return { id: 'rec-seria-assists-chase', pundit: PUNDITS[0].name, network: PUNDITS[0].network, flag: PUNDITS[0].flag, role: PUNDITS[0].role, headline: `CHASING TOTTI'S SERIE A ASSISTS RECORD!`, detail: `${seasonAssists} assists -- just ${remaining} from matching Francesco Totti's legendary record of ${rec.value}. Serie A history beckons!`, gradient: GRADIENTS.legend, priority: 'high' };
      if (seasonAssists >= rec.value) return { id: 'rec-seria-assists-broken', pundit: PUNDITS[0].name, network: PUNDITS[0].network, flag: PUNDITS[0].flag, role: PUNDITS[0].role, headline: `SURPASSES TOTTI IN SERIE A ASSISTS!`, detail: `${seasonAssists} assists this season -- breaking Totti's record of ${rec.value}! Football immortality!`, gradient: GRADIENTS.record, priority: 'high' };
      return null;
    },
    // 5. Milestone — goal count
    () => {
      const milestones = [10, 25, 50, 100, 150, 200];
      for (let i = milestones.length - 1; i >= 0; i--) {
        const m = milestones[i];
        if (goals >= m) {
          const labels: Record<number, string> = { 10: '10th', 25: '25th', 50: '50th', 100: '100th', 150: '150th', 200: '200th' };
          const p = PUNDITS[m % PUNDITS.length];
          return { id: `milestone-goals-${m}`, pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: `${playerName} -- ${labels[m]} CAREER GOALS!`, detail: `${goals} goals and counting. The ${labels[m]} milestone is HISTORY!`, gradient: GRADIENTS.milestone, priority: 'high' };
        }
      }
      return null;
    },
    // 6. Milestone — assist count
    () => {
      const milestones = [10, 25, 50, 100];
      for (let i = milestones.length - 1; i >= 0; i--) {
        const m = milestones[i];
        if (assists >= m) {
          const labels: Record<number, string> = { 10: '10th', 25: '25th', 50: '50th', 100: '100th' };
          const p = PUNDITS[(m * 3) % PUNDITS.length];
          return { id: `milestone-assists-${m}`, pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: `${playerName} -- ${labels[m]} CAREER ASSISTS!`, detail: `${assists} assists -- the ${labels[m]} key pass. Pure creativity!`, gradient: GRADIENTS.milestone, priority: 'high' };
        }
      }
      return null;
    },
    // 7. OVR growth
    () => {
      if (ovr >= 65) {
        const p = PUNDITS[0];
        return { id: 'ovr-growth', pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: `${playerName} NOW RATED ${ovr} OVR -- ${ovr >= 80 ? 'WORLD CLASS!' : ovr >= 75 ? 'ELITE TERRITORY!' : 'RISING FAST!'}`, detail: `${ovr} overall with ${pot} potential. The growth trajectory is unstoppable!`, gradient: GRADIENTS.high, priority: 'medium' };
      }
      return null;
    },
    // 8. MOTM awards
    () => {
      if (motmTotal > 0) {
        const p = PUNDITS[2];
        return { id: 'motm-total', pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: `${motmTotal}x MAN OF THE MATCH -- BEST ON THE PITCH!`, detail: `${motmTotal} MOTM awards. Avg rating: ${avgRating}. Consistently dominant!`, gradient: GRADIENTS.milestone, priority: 'medium' };
      }
      return null;
    },
    // 9. Appearance milestone
    () => {
      const milestones = [10, 25, 50, 100];
      for (let i = milestones.length - 1; i >= 0; i--) {
        const m = milestones[i];
        if (apps >= m) {
          const labels: Record<number, string> = { 10: '10th', 25: '25th', 50: '50th', 100: '100th' };
          const p = PUNDITS[3];
          return { id: `apps-${m}`, pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: `${playerName} MAKES ${labels[m]} APPEARANCE!`, detail: `${apps} games played. The ${labels[m]} appearance -- loyalty and class!`, gradient: GRADIENTS.medium, priority: 'medium' };
        }
      }
      return null;
    },
    // 10-11. Pundit hot takes (rotating opinions)
    () => {
      const takes = [
        { headline: `THE MOST EXCITING YOUNG PLAYER IN WORLD FOOTBALL`, detail: `${playerName} at ${ovr} OVR with ${pot} potential. The ceiling is absolutely unlimited!` },
        { headline: `SERIE A HAS A NEW DANGER MAN`, detail: `${playerName} is terrorizing defenses week after week. The league isn't ready!` },
      ];
      const take = takes[seed % takes.length];
      const p = PUNDITS[(seed * 7) % PUNDITS.length];
      return { id: `hot-take-${seed % 2}`, pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: take.headline, detail: take.detail, gradient: GRADIENTS.default, priority: 'medium' };
    },
    // 12-13. Club legend angle
    () => {
      const takes = [
        { headline: `SPEZIA'S GREATEST EVER PLAYER?`, detail: `With ${goals} goals and ${assists} assists, ${playerName} is rewriting Spezia's history books!` },
        { headline: `FROM ACADEMY TO LEGEND`, detail: `${playerName}'s journey at Spezia is one for the ages. A true one-club story!` },
      ];
      const take = takes[(seed + 1) % takes.length];
      const p = PUNDITS[(seed * 3) % PUNDITS.length];
      return { id: `club-legend-${(seed + 1) % 2}`, pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: take.headline, detail: take.detail, gradient: GRADIENTS.legend, priority: 'medium' };
    },
    // 14-15. Wales international angle
    () => {
      const takes = [
        { headline: `WALES' GOLDEN BOY`, detail: `${playerName} is carrying Welsh football on his shoulders. A national treasure!` },
        { headline: `THE PRIDE OF WALES`, detail: `From Cardiff to the world stage -- ${playerName} is putting Wales on the football map!` },
      ];
      const take = takes[(seed + 2) % takes.length];
      const p = PUNDITS[(seed * 5) % PUNDITS.length];
      return { id: `wales-${(seed + 2) % 2}`, pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: take.headline, detail: take.detail, gradient: GRADIENTS.default, priority: 'medium' };
    },
    // 16-17. Performance analysis
    () => {
      const takes = [
        { headline: `THE NUMBERS DON'T LIE -- ${avgRating} AVG RATING`, detail: `${avgRating} average match rating this season. The consistency is what separates good from great!` },
        { headline: `${motmTotal}x MOTM -- THE COMPLETE PLAYER`, detail: `Goals, assists, AND man of the match awards. ${playerName} does it ALL!` },
      ];
      const take = takes[(seed + 3) % takes.length];
      const p = PUNDITS[(seed * 11) % PUNDITS.length];
      return { id: `perf-${(seed + 3) % 2}`, pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: take.headline, detail: take.detail, gradient: GRADIENTS.high, priority: 'medium' };
    },
    // 18-19. Transfer market / value
    () => {
      const takes = [
        { headline: `EVERY TOP CLUB IN EUROPE IS WATCHING`, detail: `${playerName} at ${ovr} OVR. The transfer rumors will only get louder!` },
        { headline: `UNTRANSFERABLE -- SPEZIA MUST BUILD AROUND HIM`, detail: `${playerName} is too important to let go. Build the team around this generational talent!` },
      ];
      const take = takes[(seed + 4) % takes.length];
      const p = PUNDITS[(seed * 13) % PUNDITS.length];
      return { id: `transfer-${(seed + 4) % 2}`, pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: take.headline, detail: take.detail, gradient: GRADIENTS.default, priority: 'medium' };
    },
    // 20. Next record proximity (generic)
    () => {
      const nextGoalMilestone = [10, 25, 50, 100, 150, 200].find(m => goals < m);
      if (nextGoalMilestone) {
        const remaining = nextGoalMilestone - goals;
        const p = PUNDITS[6];
        return { id: `next-goal-${nextGoalMilestone}`, pundit: p.name, network: p.network, flag: p.flag, role: p.role, headline: `${remaining} GOALS FROM ${nextGoalMilestone} -- THE MILESTONE AWAITS!`, detail: `${goals} goals scored. ${remaining} more to reach ${nextGoalMilestone}. The countdown is on!`, gradient: GRADIENTS.milestone, priority: 'medium' };
      }
      return null;
    },
  ];

  // Run templates and collect valid cards
  for (const template of templates) {
    const card = template();
    if (card) cards.push(card);
  }

  // Shuffle based on current minute for variety (changes every 60s)
  const shuffled = seededShuffle(cards, seed);
  return shuffled;
}

const PunditSlide: React.FC<{ card: PunditCard }> = ({ card }) => (
  <div className={`flex-shrink-0 w-80 h-full bg-gradient-to-br ${card.gradient} rounded-xl overflow-hidden relative`}>
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
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-white/5 border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
        <span className="text-3xl">{card.flag}</span>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
      <div className="text-[10px] font-bold text-white/60 mb-1">{card.pundit} &bull; {card.role}</div>
      <h4 className="text-xs font-black text-white leading-tight line-clamp-2">{card.headline}</h4>
      <p className="text-[9px] text-white/50 mt-1 line-clamp-2">{card.detail}</p>
    </div>
  </div>
);

const NewsTicker: React.FC<{ cards: PunditCard[] }> = ({ cards }) => {
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

  if (cards.length === 0) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl h-44">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />
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

export const NewsFeed: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const newsItems = useMemo(() => {
    const data = careerExportData as any;
    return (data.news || []) as NewsItem[];
  }, []);

  const punditCards = useMemo(() => {
    const data = careerExportData as any;
    return generatePunditCards(data);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(newsItems.map(n => n.category));
    return ['all', ...Array.from(cats)];
  }, [newsItems]);

  const filteredNews = useMemo(() => {
    if (selectedCategory === 'all') return newsItems;
    return newsItems.filter(n => n.category === selectedCategory);
  }, [newsItems, selectedCategory]);

  const getCategoryCount = (cat: string) => cat === 'all' ? newsItems.length : newsItems.filter(n => n.category === cat).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">CAREER NEWS</h2>
          <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full">LIVE FEED</span>
        </div>
        <p className="text-zinc-400 text-xs mt-1">Pundits react to your career milestones &bull; Fan reactions below</p>
      </div>

      {punditCards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-zinc-400 uppercase">Pundit Reactions</span>
            <span className="text-[10px] text-zinc-600">&bull; Hover to pause</span>
          </div>
          <NewsTicker cards={punditCards} />
        </div>
      )}

      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${selectedCategory === cat ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
            >
              {cat} <span className="text-[9px] opacity-70">({getCategoryCount(cat)})</span>
            </button>
          ))}
        </div>
      )}

      {filteredNews.length === 0 ? (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 text-center">
          <h3 className="text-lg font-bold text-zinc-400 mb-2">NO NEWS YET</h3>
          <p className="text-sm text-zinc-600">News will appear as your career progresses.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((item, idx) => (
            <div key={item.id || idx} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all">
              <div className="p-6">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-bold rounded uppercase border border-amber-500/30">
                    {item.category}
                  </span>
                  {item.priority === 'high' && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full uppercase animate-pulse">BREAKING</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mt-3">{item.headline}</h3>
                <p className="text-sm text-zinc-400 mt-2">{item.details}</p>
                <p className="text-[10px] text-zinc-600 mt-2">{item.timestamp}</p>
              </div>
              <div className="border-t border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-zinc-400 uppercase">Fan Reactions</span>
                </div>
                <div className="space-y-2">
                  {FAN_COMMENTS.map((fan, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-zinc-800/50">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-sm">
                        {fan.flag}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-zinc-300">{fan.name}</span>
                        <p className="text-xs text-zinc-400 mt-0.5">{fan.text}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-amber-400 transition-colors">
                            <Heart className="w-3 h-3" /> Like
                          </button>
                          <button className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-blue-400 transition-colors">
                            <MessageCircle className="w-3 h-3" /> Reply
                          </button>
                          <button className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-green-400 transition-colors">
                            <Share2 className="w-3 h-3" /> Share
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
