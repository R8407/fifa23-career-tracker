import React, { useState } from 'react';
import { PlayerData, SeasonData, CompetitionStat } from '../types';
import { Trophy, Award, Flame, Zap, Activity, Calendar, ChevronRight, X, Star } from 'lucide-react';
import { audioEngine } from '../utils/audio';
import { getLeagueLogo } from '../utils/logos';

interface SeasonHistoryViewProps {
  player: PlayerData;
}

export const SeasonHistoryView: React.FC<SeasonHistoryViewProps> = ({ player }) => {
  const [selectedSeason, setSelectedSeason] = useState<SeasonData | null>(null);

  const handleSelectSeason = (s: SeasonData) => {
    audioEngine.playClick();
    setSelectedSeason(s);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              SEASON-BY-SEASON HISTORY
            </h2>
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full">
              {player.seasons.length} CAMPAIGNS
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Complete career timeline tracking appearances, goal contributions, match ratings, and silverware.
          </p>
        </div>
      </div>

      {/* Season Cards Timeline List */}
      <div className="space-y-4">
        {player.seasons.length === 0 ? (
          <div className="bg-zinc-900/80 border border-zinc-800 p-8 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">SEASON TIMELINE DATA: N/A</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              No historical season-by-season log rows exist in the provided <code className="text-amber-400 font-mono">career_export.json</code>. Season stats, apps, goals, and ratings are marked as N/A until additional career tables are included in export.
            </p>
          </div>
        ) : (
          player.seasons.map((s) => (
          <div
            key={s.id}
            onClick={() => handleSelectSeason(s)}
            className="group bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 p-5 rounded-2xl transition-all duration-200 cursor-pointer shadow-md hover:shadow-amber-500/5"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Season & Club */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center font-mono shrink-0">
                  <span className="text-xs text-amber-400 font-extrabold">{s.season}</span>
                  <span className="text-[10px] text-zinc-500">{s.age} yrs</span>
                </div>

                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-sm font-bold text-zinc-300 shrink-0">
                  {s.club.charAt(0)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                      {s.club}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-amber-500/10 text-amber-300 border-amber-500/30 flex items-center gap-1">
                      <img src={getLeagueLogo(s.league)} alt="" className="w-3 h-3 object-contain" />
                      {s.league}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                    {s.highlights}
                  </p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-3 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 text-center font-mono">
                <div>
                  <div className="text-[9px] text-zinc-500 uppercase font-bold">Apps</div>
                  <div className="text-sm font-bold text-zinc-200">{s.apps}</div>
                </div>

                <div>
                  <div className="text-[9px] text-zinc-500 uppercase font-bold">Goals</div>
                  <div className="text-sm font-bold text-amber-400">{s.goals}</div>
                </div>

                <div>
                  <div className="text-[9px] text-zinc-500 uppercase font-bold">Assists</div>
                  <div className="text-sm font-bold text-blue-400">{s.assists}</div>
                </div>

                <div>
                  <div className="text-[9px] text-zinc-500 uppercase font-bold">Rating</div>
                  <div className="text-sm font-bold text-emerald-400">{s.avgRating}</div>
                </div>
              </div>

              {/* Silverware Pills */}
              <div className="flex flex-wrap items-center gap-1.5 lg:justify-end max-w-md">
                {s.trophies.map((tr) => (
                  <span
                    key={tr}
                    className="px-2.5 py-1 bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 text-[10px] font-bold rounded-lg flex items-center gap-1"
                  >
                    <Trophy className="w-3 h-3 text-yellow-400" /> {tr}
                  </span>
                ))}

                {s.individualAwards.map((aw) => (
                  <span
                    key={aw}
                    className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-lg flex items-center gap-1"
                  >
                    <Award className="w-3 h-3 text-amber-400" /> {aw}
                  </span>
                ))}

                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        ))
        )}
      </div>

      {/* Detailed Season Inspector Modal */}
      {selectedSeason && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl w-full max-w-2xl p-6 relative shadow-2xl space-y-5">
            {/* Close Button */}
            <button
              onClick={() => setSelectedSeason(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center font-mono font-bold text-amber-400 text-lg">
                {selectedSeason.season}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedSeason.club}</h3>
                <span className="text-xs text-amber-400 font-semibold">{selectedSeason.league} • Age {selectedSeason.age}</span>
              </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase">Appearances</div>
                <div className="text-xl font-black text-white">{selectedSeason.apps}</div>
              </div>
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase">Goals (xG {selectedSeason.xG})</div>
                <div className="text-xl font-black text-amber-400">{selectedSeason.goals}</div>
              </div>
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase">Assists (xA {selectedSeason.xA})</div>
                <div className="text-xl font-black text-blue-400">{selectedSeason.assists}</div>
              </div>
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase">Avg Match Rating</div>
                <div className="text-xl font-black text-emerald-400">{selectedSeason.avgRating}</div>
              </div>
            </div>

            {/* Tactical Per Game Metrics */}
            <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Performance Metrics</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-zinc-500">Goals:</span>
                  <div className="font-bold text-white font-mono">{selectedSeason.goals}</div>
                </div>
                <div>
                  <span className="text-zinc-500">Assists:</span>
                  <div className="font-bold text-white font-mono">{selectedSeason.assists}</div>
                </div>
                <div>
                  <span className="text-zinc-500">MOTM:</span>
                  <div className="font-bold text-white font-mono">{selectedSeason.motm || 0}</div>
                </div>
                <div>
                  <span className="text-zinc-500">Cards (Y / R):</span>
                  <div className="font-bold text-white font-mono">{selectedSeason.yellowCards} Y / {selectedSeason.redCards} R</div>
                </div>
              </div>
            </div>

            {/* Competition Breakdown */}
            {selectedSeason.competitionStats && selectedSeason.competitionStats.length > 0 && (
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Competition Breakdown</div>
                <div className="space-y-2">
                  {selectedSeason.competitionStats.map((comp, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          {comp.competition.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{comp.competition}</div>
                          <div className="text-[10px] text-zinc-500">{comp.apps} apps • {comp.motm || 0} MOTM</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-xs">
                        <div className="text-center">
                          <div className="text-[9px] text-zinc-500 uppercase">Goals</div>
                          <div className="font-bold text-amber-400">{comp.goals}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-zinc-500 uppercase">Assists</div>
                          <div className="font-bold text-blue-400">{comp.assists}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-zinc-500 uppercase">Rating</div>
                          <div className="font-bold text-emerald-400">{comp.avgRating?.toFixed(1) || '-'}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-zinc-500 uppercase">Cards</div>
                          <div className="font-bold text-zinc-300">{comp.yellow}🟡 {comp.red}🔴</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Season Summary</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {selectedSeason.highlights}
              </p>
            </div>

            {/* Trophies & Honors */}
            <div>
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Honors & Awards</div>
              <div className="flex flex-wrap gap-2">
                {selectedSeason.trophies.map(t => (
                  <span key={t} className="px-3 py-1 bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> {t}
                  </span>
                ))}
                {selectedSeason.individualAwards.map(a => (
                  <span key={a} className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" /> {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
