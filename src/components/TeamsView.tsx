import React from 'react';
import { PlayerData } from '../types';
import { Shield, ArrowRight, Trophy, Flame, Zap, Award } from 'lucide-react';
import { getLeagueLogo } from '../utils/logos';

interface TeamsViewProps {
  player: PlayerData;
}

export const TeamsView: React.FC<TeamsViewProps> = ({ player }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              CLUB JOURNEY ARCHIVE
            </h2>
            <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-full">
              {player.clubs.length} CLUBS
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Tracking club transfers, transfer fees, statistics, and trophies throughout your career.
          </p>
        </div>
      </div>

      {/* Visual Sequence Chain */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl overflow-x-auto">
        <div className="flex items-center justify-between min-w-[600px] gap-2">
          {player.clubs.slice().reverse().map((club, idx, arr) => (
            <React.Fragment key={club.id}>
              <div className="flex flex-col items-center text-center space-y-1.5 flex-1 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                  {club.clubName.charAt(0)}
                </div>
                <div className="text-xs font-bold text-white">{club.clubName}</div>
                <div className="text-[10px] text-zinc-500 font-mono">{club.years}</div>
                <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-bold rounded">
                  {club.transferFee}
                </span>
              </div>

              {idx < arr.length - 1 && (
                <ArrowRight className="w-5 h-5 text-amber-400 shrink-0 mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Detailed Club Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {player.clubs.map((club) => (
          <div
            key={club.id}
            className="bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 p-6 rounded-2xl space-y-4 transition-all"
          >
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-300">
                  {club.clubName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{club.clubName}</h3>
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                    <img src={getLeagueLogo(club.league)} alt="" className="w-3.5 h-3.5 object-contain" />
                    {club.league} • {club.years}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-zinc-950 text-amber-400 font-mono text-xs font-extrabold border border-zinc-800 rounded-lg">
                {club.transferFee}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-center font-mono text-xs">
              <div>
                <div className="text-[9px] text-zinc-500 uppercase">Apps</div>
                <div className="font-bold text-white text-sm">{club.apps}</div>
              </div>

              <div>
                <div className="text-[9px] text-zinc-500 uppercase">Goals</div>
                <div className="font-bold text-amber-400 text-sm">{club.goals}</div>
              </div>

              <div>
                <div className="text-[9px] text-zinc-500 uppercase">Assists</div>
                <div className="font-bold text-blue-400 text-sm">{club.assists}</div>
              </div>

              <div>
                <div className="text-[9px] text-zinc-500 uppercase">Rating</div>
                <div className="font-bold text-emerald-400 text-sm">{club.avgRating}</div>
              </div>
            </div>

            {/* Standout moment */}
            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 text-xs">
              <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block mb-0.5">
                Standout Memory
              </span>
              <p className="text-zinc-300 italic">
                "{club.notableMoment}"
              </p>
            </div>

            {/* Trophies Count */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800">
              <span className="text-zinc-500">Trophies Secured:</span>
              <span className="font-bold text-yellow-300 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" /> {club.trophiesWon} Silverware
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
