import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Medal, Star, ChevronDown, Crown, Flame, Shield, TrendingUp, Award, Mic } from 'lucide-react';
import { PlayerData, SeasonData } from '../types';
import { audioEngine } from '../utils/audio';
import { PressConferenceModal, savePressQuote, hasPressQuote, PressQuote } from './PressConferenceModal';

const AWARDS_STORAGE_KEY = 'career_season_awards';
const PRESS_QUOTES_KEY = 'career_press_quotes';

// Full season length for major leagues
const FULL_SEASON_MATCHES = 38;

interface SeasonAwardData {
  goldenBoot: { goals: number; leagueGoals: number; won: boolean; rank: number };
  playerOfSeason: { rating: number; won: boolean; rank: number };
  bestXi: { position: string; rating: number; inducted: boolean };
  youngPlayer: { won: boolean; rank: number };
  assistKing: { assists: number; won: boolean; rank: number };
  isCompleted: boolean;
}

// League golden boot thresholds for "winning"
const LEAGUE_GOALS_TO_WIN_BOOT = 20;
const MIN_RATING_FOR_POTY = 8.0;

// A season is considered complete if the player has played 30+ matches
function isSeasonCompleted(season: SeasonData): boolean {
  return season.apps >= 30;
}

function computeSeasonAwards(season: SeasonData, allSeasons: SeasonData[]): SeasonAwardData {
  const leagueGoals = season.goals;
  const isCompleted = isSeasonCompleted(season);
  const isGoldenBootWinner = leagueGoals >= LEAGUE_GOALS_TO_WIN_BOOT;
  const isPOTY = season.avgRating >= MIN_RATING_FOR_POTY;

  // Rank goals vs other seasons
  const goalRanks = [...allSeasons].sort((a, b) => b.goals - a.goals);
  const goalRank = goalRanks.findIndex(s => s.id === season.id) + 1;

  // Rank rating vs other seasons
  const ratingRanks = [...allSeasons].sort((a, b) => b.avgRating - a.avgRating);
  const ratingRank = ratingRanks.findIndex(s => s.id === season.id) + 1;

  // Best XI determination based on avg rating
  const ratingThreshold = 7.2;
  const inBestXi = season.avgRating >= ratingThreshold;

  // Young player (age <= 23)
  const isYoungPlayer = season.age <= 23;

  // Assist king
  const assistRanks = [...allSeasons].sort((a, b) => b.assists - a.assists);
  const assistRank = assistRanks.findIndex(s => s.id === season.id) + 1;
  const isAssistKing = season.assists >= 10 && assistRank <= 3;

  return {
    goldenBoot: {
      goals: season.goals,
      leagueGoals,
      won: isGoldenBootWinner,
      rank: goalRank,
    },
    playerOfSeason: {
      rating: season.avgRating,
      won: isPOTY,
      rank: ratingRank,
    },
    bestXi: {
      position: 'RW',
      rating: season.avgRating,
      inducted: inBestXi,
    },
    youngPlayer: {
      won: isYoungPlayer && season.avgRating >= 7.5,
      rank: ratingRank,
    },
    assistKing: {
      assists: season.assists,
      won: isAssistKing,
      rank: assistRank,
    },
    isCompleted,
  };
}

interface SeasonAwardsViewProps {
  player: PlayerData;
}

export const SeasonAwardsView: React.FC<SeasonAwardsViewProps> = ({ player }) => {
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const seasonIsActive = player.season_is_active ?? true;
  const daysRemaining = player.days_until_season_end ?? 0;
  const matchesPlayed = player.matches_played ?? 0;

  // Sort seasons newest first
  const seasons = useMemo(() => {
    return [...player.seasons].sort((a, b) => {
      const aYear = parseInt(a.season.split('/')[0]) || 0;
      const bYear = parseInt(b.season.split('/')[0]) || 0;
      return bYear - aYear;
    });
  }, [player.seasons]);

  const currentSeason = seasons[selectedSeasonIdx];

  const awards = useMemo(() => {
    if (!currentSeason) return null;
    return computeSeasonAwards(currentSeason, seasons);
  }, [currentSeason, seasons]);

  // Persist awards
  const [persistedAwards, setPersistedAwards] = useState<Record<string, SeasonAwardData>>(() => {
    try {
      return JSON.parse(localStorage.getItem(AWARDS_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (currentSeason && awards) {
      setPersistedAwards(prev => {
        const next = { ...prev, [currentSeason.id]: awards };
        localStorage.setItem(AWARDS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [currentSeason?.id, awards]);

  // Press conference state
  const [pressModalOpen, setPressModalOpen] = useState(false);
  const [pressAward, setPressAward] = useState('');
  const [pressQuotes, setPressQuotes] = useState<PressQuote[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(PRESS_QUOTES_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(PRESS_QUOTES_KEY, JSON.stringify(pressQuotes));
  }, [pressQuotes]);

  // Check if player won any award this season
  const wonAnyAward = awards && (awards.goldenBoot.won || awards.playerOfSeason.won || awards.bestXi.inducted || awards.youngPlayer.won || awards.assistKing.won);
  const hasQuoteForThisSeason = currentSeason && pressQuotes.some(q => q.season === currentSeason.season);

  // All seasons with computed awards for the overview
  const allAwards = useMemo(() => {
    return seasons.map(s => ({
      season: s,
      awards: computeSeasonAwards(s, seasons),
    }));
  }, [seasons]);

  // Summary stats across all seasons
  const totalGoldenBoots = allAwards.filter(a => a.awards.goldenBoot.won).length;
  const totalPOTY = allAwards.filter(a => a.awards.playerOfSeason.won).length;
  const totalBestXi = allAwards.filter(a => a.awards.bestXi.inducted).length;
  const totalAssistKings = allAwards.filter(a => a.awards.assistKing.won).length;
  const totalYoungPlayer = allAwards.filter(a => a.awards.youngPlayer.won).length;

  if (seasons.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <h3 className="text-lg font-bold text-zinc-400 mb-2">NO SEASON DATA</h3>
          <p className="text-sm text-zinc-600">
            Complete seasons to see your end-of-season awards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className={`bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border p-6 rounded-2xl ${seasonIsActive ? 'border-zinc-700' : 'border-amber-500/40'}`}>
        <div className="flex items-center gap-2">
          {seasonIsActive ? (
            <>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                SEASON IN PROGRESS
              </h2>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-full flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> {daysRemaining} DAYS LEFT
              </span>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                END OF SEASON AWARDS
              </h2>
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-full flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> {seasons.length} SEASONS
              </span>
            </>
          )}
        </div>
        <p className="text-zinc-400 text-xs mt-1">
          {seasonIsActive 
            ? `${matchesPlayed} matches played • ${daysRemaining} days until season ends`
            : 'Golden Boot • Player of the Season • Best XI • Young Player • Assist King'
          }
        </p>
      </div>

      {/* Career Awards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-zinc-900 border border-amber-500/30 p-3 rounded-xl text-center">
          <div className="text-2xl font-black text-amber-400 font-mono">{totalGoldenBoots}</div>
          <div className="text-[10px] text-zinc-400 uppercase font-bold">Golden Boots</div>
        </div>
        <div className="bg-zinc-900 border border-purple-500/30 p-3 rounded-xl text-center">
          <div className="text-2xl font-black text-purple-400 font-mono">{totalPOTY}</div>
          <div className="text-[10px] text-zinc-400 uppercase font-bold">Player of Season</div>
        </div>
        <div className="bg-zinc-900 border border-emerald-500/30 p-3 rounded-xl text-center">
          <div className="text-2xl font-black text-emerald-400 font-mono">{totalBestXi}</div>
          <div className="text-[10px] text-zinc-400 uppercase font-bold">Best XI</div>
        </div>
        <div className="bg-zinc-900 border border-cyan-500/30 p-3 rounded-xl text-center">
          <div className="text-2xl font-black text-cyan-400 font-mono">{totalYoungPlayer}</div>
          <div className="text-[10px] text-zinc-400 uppercase font-bold">Young Player</div>
        </div>
        <div className="bg-zinc-900 border border-blue-500/30 p-3 rounded-xl text-center">
          <div className="text-2xl font-black text-blue-400 font-mono">{totalAssistKings}</div>
          <div className="text-[10px] text-zinc-400 uppercase font-bold">Assist King</div>
        </div>
      </div>

      {/* Season Selector Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            audioEngine.playClick();
            setDropdownOpen(!dropdownOpen);
          }}
          className="w-full sm:w-64 flex items-center justify-between gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold text-sm hover:border-amber-500/50 transition-colors cursor-pointer"
        >
          <span>{currentSeason?.season || 'Select Season'}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute z-50 mt-1 w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
            {seasons.map((s, idx) => {
              const sAwards = allAwards.find(a => a.season.id === s.id)?.awards;
              const hasAwards = sAwards && (
                sAwards.goldenBoot.won || sAwards.playerOfSeason.won || sAwards.bestXi.inducted
              );
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    audioEngine.playClick();
                    setSelectedSeasonIdx(idx);
                    setDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer flex items-center justify-between ${
                    idx === selectedSeasonIdx
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <div>
                    <div className="font-bold">{s.season}</div>
                    <div className="text-[10px] text-zinc-500">{s.club} • Age {s.age}</div>
                  </div>
                  {hasAwards && (
                    <div className="flex gap-1">
                      {sAwards.goldenBoot.won && <span className="text-amber-400">🏆</span>}
                      {sAwards.playerOfSeason.won && <span className="text-purple-400">⭐</span>}
                      {sAwards.bestXi.inducted && <span className="text-emerald-400">✨</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Season Awards Detail */}
      {currentSeason && awards && (
        <div className="space-y-4">
          {/* In Progress Banner */}
          {seasonIsActive && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-400">SEASON IN PROGRESS</h4>
                <p className="text-xs text-zinc-400">
                  {matchesPlayed} matches played • {daysRemaining} days remaining
                  • Awards are projected based on current form
                </p>
              </div>
            </div>
          )}

          {/* Season Header Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white">{currentSeason.season}</h3>
              <p className="text-xs text-zinc-400">
                {currentSeason.club} • {currentSeason.league} • Age {currentSeason.age}
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-xl font-black text-white font-mono">{currentSeason.goals}</div>
                <div className="text-[9px] text-zinc-500 uppercase">Goals</div>
              </div>
              <div>
                <div className="text-xl font-black text-white font-mono">{currentSeason.assists}</div>
                <div className="text-[9px] text-zinc-500 uppercase">Assists</div>
              </div>
              <div>
                <div className="text-xl font-black text-white font-mono">{currentSeason.apps}</div>
                <div className="text-[9px] text-zinc-500 uppercase">Apps</div>
              </div>
              <div>
                <div className="text-xl font-black text-amber-400 font-mono">{currentSeason.avgRating.toFixed(1)}</div>
                <div className="text-[9px] text-zinc-500 uppercase">Rating</div>
              </div>
            </div>
          </div>

          {/* Awards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Golden Boot */}
            <AwardCard
              title="Golden Boot"
              icon={<Trophy className="w-6 h-6" />}
              won={awards.goldenBoot.won}
              rank={awards.goldenBoot.rank}
              total={seasons.length}
              detail={`${awards.goldenBoot.goals} goals`}
              subtext={awards.goldenBoot.won ? 'Golden Boot Winner!' : `${LEAGUE_GOALS_TO_WIN_BOOT}+ goals to win`}
              color="amber"
              isCompleted={awards.isCompleted}
            />

            {/* Player of the Season */}
            <AwardCard
              title="Player of the Season"
              icon={<Star className="w-6 h-6" />}
              won={awards.playerOfSeason.won}
              rank={awards.playerOfSeason.rank}
              total={seasons.length}
              detail={`${awards.playerOfSeason.rating.toFixed(1)} avg rating`}
              subtext={awards.playerOfSeason.won ? 'Player of the Season!' : `${MIN_RATING_FOR_POTY}+ rating to win`}
              color="purple"
              isCompleted={awards.isCompleted}
            />

            {/* Best XI */}
            <AwardCard
              title="League Best XI"
              icon={<Shield className="w-6 h-6" />}
              won={awards.bestXi.inducted}
              rank={awards.bestXi.inducted ? 1 : 0}
              total={11}
              detail={`${awards.bestXi.position} • ${awards.bestXi.rating.toFixed(1)} rating`}
              subtext={awards.bestXi.inducted ? 'Inducted into Best XI!' : '7.2+ rating to earn spot'}
              color="emerald"
            />

            {/* Young Player */}
            <AwardCard
              title="Young Player of the Season"
              icon={<Flame className="w-6 h-6" />}
              won={awards.youngPlayer.won}
              rank={awards.youngPlayer.rank}
              total={seasons.length}
              detail={`Age ${currentSeason.age}`}
              subtext={awards.youngPlayer.won ? 'Young Player Award!' : 'Under 23 with 7.5+ rating'}
              color="cyan"
              isCompleted={awards.isCompleted}
            />

            {/* Assist King */}
            <AwardCard
              title="Assist King"
              icon={<TrendingUp className="w-6 h-6" />}
              won={awards.assistKing.won}
              rank={awards.assistKing.rank}
              total={seasons.length}
              detail={`${awards.assistKing.assists} assists`}
              subtext={awards.assistKing.won ? 'Assist King!' : '10+ assists to compete'}
              color="blue"
              isCompleted={awards.isCompleted}
            />

            {/* Season Trophies */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-xs font-bold text-white uppercase">Club Trophies</span>
              </div>
              {currentSeason.trophies.length > 0 ? (
                <div className="space-y-1.5">
                  {currentSeason.trophies.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className="text-yellow-400">🏆</span>
                      {t}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600">No trophies this season</p>
              )}
              {currentSeason.individualAwards.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1.5">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Individual Awards</div>
                  {currentSeason.individualAwards.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className="text-amber-400">⭐</span>
                      {a}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Press Conference Section - only show when season has ended */}
          {!seasonIsActive && awards.isCompleted && wonAnyAward && (
            <div className="bg-gradient-to-r from-zinc-900 via-amber-950/20 to-zinc-900 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">END OF SEASON PRESS CONFERENCE</h4>
                    <p className="text-[10px] text-zinc-400">
                      {hasQuoteForThisSeason 
                        ? 'Your quote has been submitted and is being discussed by pundits!'
                        : 'Share your thoughts on winning an award this season'}
                    </p>
                  </div>
                </div>
                {!hasQuoteForThisSeason && (
                  <button
                    onClick={() => {
                      audioEngine.playClick();
                      // Find the first award won
                      let awardName = '';
                      if (awards.goldenBoot.won) awardName = 'Golden Boot';
                      else if (awards.playerOfSeason.won) awardName = 'Player of the Season';
                      else if (awards.bestXi.inducted) awardName = 'Best XI';
                      else if (awards.youngPlayer.won) awardName = 'Young Player of the Season';
                      else if (awards.assistKing.won) awardName = 'Assist King';
                      setPressAward(awardName);
                      setPressModalOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-500 text-zinc-950 rounded-lg text-xs font-bold uppercase hover:bg-amber-400 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Give Press Conference
                  </button>
                )}
              </div>

              {/* Show existing quote if submitted */}
              {hasQuoteForThisSeason && (
                <div className="mt-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                  <div className="flex items-start gap-2">
                    <Mic className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Your Press Conference Quote</p>
                      <p className="text-xs text-zinc-300 italic">
                        "{pressQuotes.find(q => q.season === currentSeason.season)?.quote}"
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Season History Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h3 className="text-xs font-bold text-white uppercase">Season-by-Season Awards History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
                    <th className="px-4 py-2 text-left">Season</th>
                    <th className="px-4 py-2 text-center">Goals</th>
                    <th className="px-4 py-2 text-center">Assists</th>
                    <th className="px-4 py-2 text-center">Rating</th>
                    <th className="px-4 py-2 text-center">🏆</th>
                    <th className="px-4 py-2 text-center">⭐</th>
                    <th className="px-4 py-2 text-center">✨</th>
                  </tr>
                </thead>
                <tbody>
                  {allAwards.map((a, idx) => (
                    <tr
                      key={a.season.id}
                      className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                        idx === selectedSeasonIdx ? 'bg-amber-500/10' : 'hover:bg-zinc-800/50'
                      }`}
                      onClick={() => {
                        audioEngine.playClick();
                        setSelectedSeasonIdx(idx);
                      }}
                    >
                      <td className="px-4 py-2 font-bold text-white">{a.season.season}</td>
                      <td className="px-4 py-2 text-center font-mono text-zinc-300">{a.season.goals}</td>
                      <td className="px-4 py-2 text-center font-mono text-zinc-300">{a.season.assists}</td>
                      <td className="px-4 py-2 text-center font-mono text-zinc-300">{a.season.avgRating.toFixed(1)}</td>
                      <td className="px-4 py-2 text-center">
                        {a.awards.goldenBoot.won ? (
                          <span className="text-amber-400">🏆</span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {a.awards.playerOfSeason.won ? (
                          <span className="text-purple-400">⭐</span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {a.awards.bestXi.inducted ? (
                          <span className="text-emerald-400">✨</span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Press Conference Modal */}
      <PressConferenceModal
        isOpen={pressModalOpen}
        onClose={() => setPressModalOpen(false)}
        season={currentSeason?.season || ''}
        award={pressAward}
        playerName={player.name || 'Your Player'}
        onQuoteSubmitted={(quote) => {
          savePressQuote(quote);
          setPressQuotes(prev => [...prev, quote]);
        }}
      />
    </div>
  );
};

// Award Card Component
const AwardCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  won: boolean;
  rank: number;
  total: number;
  detail: string;
  subtext: string;
  color: string;
  isCompleted?: boolean;
}> = ({ title, icon, won, rank, total, detail, subtext, color, isCompleted = true }) => {
  const colorMap: Record<string, { border: string; bg: string; text: string; glow: string }> = {
    amber: { border: 'border-amber-500/40', bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    purple: { border: 'border-purple-500/40', bg: 'bg-purple-500/20', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
    emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    cyan: { border: 'border-cyan-500/40', bg: 'bg-cyan-500/20', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
    blue: { border: 'border-blue-500/40', bg: 'bg-blue-500/20', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
  };
  const c = colorMap[color] || colorMap.amber;

  return (
    <div className={`rounded-2xl p-4 border transition-all ${
      won
        ? `${c.border} ${c.bg} shadow-lg ${c.glow}`
        : 'border-zinc-800 bg-zinc-900'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`${c.text}`}>{icon}</div>
        <span className={`text-xs font-bold uppercase ${won ? c.text : 'text-zinc-400'}`}>{title}</span>
        {!isCompleted && (
          <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[7px] font-bold rounded uppercase">
            PROJECTED
          </span>
        )}
      </div>

      {won ? (
        <div>
          <div className={`text-2xl font-black ${c.text} mb-1`}>{isCompleted ? 'WINNER' : 'ON TRACK'}</div>
          <div className="text-[10px] text-zinc-300 font-mono">{detail}</div>
          <div className={`text-[10px] ${c.text} font-bold mt-1`}>{subtext}</div>
        </div>
      ) : (
        <div>
          <div className="text-sm font-bold text-zinc-500">#{rank} of {total}</div>
          <div className="text-[10px] text-zinc-600 font-mono">{detail}</div>
          <div className="text-[10px] text-zinc-600 mt-1">{subtext}</div>
        </div>
      )}
    </div>
  );
};
