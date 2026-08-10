import React, { useState } from 'react';
import { PlayerData } from '../types';
import { LineChart, Sparkles, TrendingUp, Trophy, Flame, Zap, Award, Crown } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface RecordsProjectionsViewProps {
  player: PlayerData;
}

export const RecordsProjectionsView: React.FC<RecordsProjectionsViewProps> = ({ player }) => {
  const [retireAge, setRetireAge] = useState<number>(36);
  const [playstyleFocus, setPlaystyleFocus] = useState<'scorer' | 'balanced' | 'playmaker'>('balanced');

  const currentAge = player.age;
  const remainingYears = Math.max(1, retireAge - currentAge);

  // Projected math per year based on focus
  let goalsPerYear = 35;
  let assistsPerYear = 18;
  let trophiesPerYear = 2;

  if (playstyleFocus === 'scorer') {
    goalsPerYear = 42;
    assistsPerYear = 12;
  } else if (playstyleFocus === 'playmaker') {
    goalsPerYear = 24;
    assistsPerYear = 28;
  }

  const currentGoals = player.seasons.reduce((acc, s) => acc + s.goals, 0);
  const currentAssists = player.seasons.reduce((acc, s) => acc + s.assists, 0);
  const currentTrophies = player.trophies.filter(t => !['manofmatch', 'assistking', 'youngplayer', 'bestxi'].includes(t.iconType)).reduce((acc, t) => acc + t.quantity, 0);

  const projectedGoals = currentGoals + Math.round(goalsPerYear * remainingYears * 0.9); // slight decline factor
  const projectedAssists = currentAssists + Math.round(assistsPerYear * remainingYears * 0.95);
  const projectedTrophies = currentTrophies + Math.round(trophiesPerYear * remainingYears);

  // GOAT probability calculation
  const goatProbability = Math.min(98, Math.round(70 + (retireAge - 32) * 3 + (projectedGoals > 650 ? 12 : 5)));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950/30 to-zinc-900 border border-indigo-500/30 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              RETIREMENT PREDICTION & FUTURE PROJECTION
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-full">
              SIMULATOR ALGORITHM
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Predicting your total career trajectory, expected goals, trophies, and all-time GOAT status up to retirement.
          </p>
        </div>
      </div>

      {/* Simulator Control Panel */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl space-y-5">
        <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> SIMULATE CAREER HORIZON
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Retirement Age Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-zinc-300">
              <span>Target Retirement Age:</span>
              <span className="text-amber-400 font-mono text-sm">{retireAge} Years Old</span>
            </div>
            <input
              type="range"
              min="32"
              max="40"
              value={retireAge}
              onChange={(e) => {
                audioEngine.playClick();
                setRetireAge(Number(e.target.value));
              }}
              className="w-full accent-amber-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>32y (Early)</span>
              <span>36y (Standard)</span>
              <span>40y (Longevity Legend)</span>
            </div>
          </div>

          {/* Tactical Role Focus */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-300">Late Career Playstyle Focus:</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { audioEngine.playClick(); setPlaystyleFocus('scorer'); }}
                className={`p-2 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer ${
                  playstyleFocus === 'scorer'
                    ? 'bg-amber-500 text-zinc-950 shadow'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                }`}
              >
                Goal Hunter
              </button>

              <button
                onClick={() => { audioEngine.playClick(); setPlaystyleFocus('balanced'); }}
                className={`p-2 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer ${
                  playstyleFocus === 'balanced'
                    ? 'bg-amber-500 text-zinc-950 shadow'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                }`}
              >
                Balanced
              </button>

              <button
                onClick={() => { audioEngine.playClick(); setPlaystyleFocus('playmaker'); }}
                className={`p-2 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer ${
                  playstyleFocus === 'playmaker'
                    ? 'bg-amber-500 text-zinc-950 shadow'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                }`}
              >
                Playmaker
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Projected Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Goals */}
        <div className="bg-zinc-900/80 border border-amber-500/30 p-5 rounded-2xl">
          <div className="text-[10px] font-bold text-zinc-500 uppercase">Projected Goals</div>
          <div className="text-3xl font-black text-amber-400 font-mono mt-1">
            ~{projectedGoals}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Current: <strong className="text-white">{currentGoals}</strong> (+{projectedGoals - currentGoals} projected)
          </p>
        </div>

        {/* Assists */}
        <div className="bg-zinc-900/80 border border-blue-500/30 p-5 rounded-2xl">
          <div className="text-[10px] font-bold text-zinc-500 uppercase">Projected Assists</div>
          <div className="text-3xl font-black text-blue-400 font-mono mt-1">
            ~{projectedAssists}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Current: <strong className="text-white">{currentAssists}</strong> (+{projectedAssists - currentAssists} projected)
          </p>
        </div>

        {/* Trophies */}
        <div className="bg-zinc-900/80 border border-yellow-500/30 p-5 rounded-2xl">
          <div className="text-[10px] font-bold text-zinc-500 uppercase">Expected Trophies</div>
          <div className="text-3xl font-black text-yellow-300 font-mono mt-1">
            ~{projectedTrophies}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Current: <strong className="text-white">{currentTrophies}</strong> silverware
          </p>
        </div>

        {/* GOAT Probability */}
        <div className="bg-zinc-900/80 border border-emerald-500/30 p-5 rounded-2xl">
          <div className="text-[10px] font-bold text-zinc-500 uppercase">GOAT Probability</div>
          <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
            {goatProbability}%
          </div>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${goatProbability}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
