import React, { useState } from 'react';
import { PlayerData } from '../types';
import { TrendingUp, Flame, Zap, AlertTriangle, ShieldAlert } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface GrowthCurveViewProps {
  player: PlayerData;
}

export const GrowthCurveView: React.FC<GrowthCurveViewProps> = ({ player }) => {
  const [selectedStat, setSelectedStat] = useState<'overall' | 'pace' | 'shooting' | 'passing' | 'dribbling' | 'physical'>('overall');
  const [targetAge, setTargetAge] = useState<number>(27);

  // Generate full career curve points including future projections up to age 38
  const fullProgression = [
    { age: 14, rating: 55, pace: 78, shooting: 45, passing: 48, dribbling: 62, physical: 52, phase: 'Youth Academy' },
    { age: 15, rating: 58, pace: 80, shooting: 48, passing: 52, dribbling: 65, physical: 55, phase: 'Youth Prospect' },
    { age: 16, rating: 62, pace: 82, shooting: 52, passing: 56, dribbling: 68, physical: 58, phase: 'Academy Graduate' },
    { age: 17, rating: 65, pace: 84, shooting: 56, passing: 60, dribbling: 72, physical: 62, phase: 'First Team Debut' },
    { age: 18, rating: 68, pace: 86, shooting: 60, passing: 64, dribbling: 75, physical: 65, phase: 'Debut' },
    { age: 19, rating: 72, pace: 88, shooting: 65, passing: 68, dribbling: 78, physical: 68, phase: 'Growth' },
    { age: 20, rating: 76, pace: 90, shooting: 70, passing: 72, dribbling: 82, physical: 71, phase: 'Breakthrough' },
    { age: 21, rating: 80, pace: 92, shooting: 75, passing: 76, dribbling: 85, physical: 74, phase: 'Rise' },
    { age: 22, rating: 84, pace: 94, shooting: 80, passing: 80, dribbling: 88, physical: 77, phase: 'Star' },
    { age: 23, rating: 87, pace: 95, shooting: 84, passing: 83, dribbling: 90, physical: 79, phase: 'World Class' },
    { age: 24, rating: 89, pace: 96, shooting: 87, passing: 85, dribbling: 92, physical: 80, phase: 'Elite' },
    { age: 25, rating: 90, pace: 96, shooting: 89, passing: 86, dribbling: 93, physical: 81, phase: 'Peak' },
    { age: 26, rating: 91, pace: 96, shooting: 90, passing: 87, dribbling: 94, physical: 82, phase: 'Peak' },
    { age: 27, rating: 91, pace: 96, shooting: 91, passing: 88, dribbling: 94, physical: 82, phase: 'Peak (Projected)' },
    { age: 28, rating: 92, pace: 95, shooting: 92, passing: 89, dribbling: 94, physical: 82, phase: 'Projected Peak' },
    { age: 29, rating: 92, pace: 94, shooting: 92, passing: 90, dribbling: 93, physical: 81, phase: 'Projected Peak' },
    { age: 30, rating: 91, pace: 92, shooting: 91, passing: 90, dribbling: 92, physical: 80, phase: 'Prime veteran' },
    { age: 31, rating: 90, pace: 89, shooting: 90, passing: 89, dribbling: 90, physical: 78, phase: 'Prime veteran' },
    { age: 32, rating: 88, pace: 85, shooting: 88, passing: 88, dribbling: 87, physical: 75, phase: 'Controlled decline' },
    { age: 33, rating: 86, pace: 81, shooting: 86, passing: 87, dribbling: 84, physical: 72, phase: 'Controlled decline' },
    { age: 34, rating: 83, pace: 76, shooting: 84, passing: 85, dribbling: 81, physical: 68, phase: 'Veteran maestro' },
    { age: 35, rating: 80, pace: 70, shooting: 81, passing: 83, dribbling: 77, physical: 64, phase: 'Twilight' },
    { age: 36, rating: 77, pace: 64, shooting: 78, passing: 80, dribbling: 73, physical: 60, phase: 'Retirement window' },
  ];

  const currentPoint = fullProgression.find(p => p.age === targetAge) || fullProgression[9];

  // SVG Chart Calculation
  const minVal = 60;
  const maxVal = 95;
  const chartHeight = 220;
  const chartWidth = 700;

  const getStatValue = (point: typeof fullProgression[0]) => {
    switch (selectedStat) {
      case 'pace': return point.pace;
      case 'shooting': return point.shooting;
      case 'passing': return point.passing;
      case 'dribbling': return point.dribbling;
      case 'physical': return point.physical;
      default: return point.rating;
    }
  };

  const pointsSvg = fullProgression.map((pt, i) => {
    const x = (i / (fullProgression.length - 1)) * chartWidth;
    const val = getStatValue(pt);
    const y = chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              CAREER GROWTH & PROGRESSION CURVE
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-full">
              PROJECTION ENGINE
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Tracking development trajectory, peak physical window, and projected retirement decline.
          </p>
        </div>

        {/* Toggle Stats */}
        <div className="flex flex-wrap gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-xl text-xs">
          {(['overall', 'pace', 'shooting', 'passing', 'dribbling', 'physical'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                audioEngine.playClick();
                setSelectedStat(st);
              }}
              className={`px-3 py-1.5 rounded-lg font-extrabold uppercase transition-all cursor-pointer ${
                selectedStat === st
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl relative">
        {player.isLoadedFromExportDB && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-mono flex items-center justify-between">
            <span>CAREER_EXPORT DB: Real rating extracted — Overall: <strong className="text-white">{player.overall}</strong> | Potential: <strong className="text-white">{player.potential}</strong></span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px] font-bold">HISTORICAL CURVE N/A</span>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Rating Trajectory by Age (18 → 36)
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            Selected Metric: <strong className="text-white uppercase">{selectedStat}</strong>
          </span>
        </div>

        {/* SVG Interactive Graph */}
        <div className="relative w-full overflow-x-auto py-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56 overflow-visible">
            {/* Grid lines */}
            {[65, 75, 85, 95].map((gridVal) => {
              const y = chartHeight - ((gridVal - minVal) / (maxVal - minVal)) * chartHeight;
              return (
                <g key={gridVal}>
                  <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#27272a" strokeDasharray="3 3" />
                  <text x="0" y={y - 4} fill="#71717a" fontSize="10" fontFamily="monospace">
                    {gridVal}
                  </text>
                </g>
              );
            })}

            {/* Peak Window Highlight Area (Age 26-29 -> indexes 8 to 11) */}
            <rect
              x={(8 / (fullProgression.length - 1)) * chartWidth}
              y="0"
              width={(3 / (fullProgression.length - 1)) * chartWidth}
              height={chartHeight}
              fill="#eab308"
              fillOpacity="0.08"
            />

            {/* Area gradient under line */}
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <polygon
              points={`0,${chartHeight} ${pointsSvg} ${chartWidth},${chartHeight}`}
              fill="url(#growthGrad)"
            />

            {/* Main Polyline */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsSvg}
            />

            {/* Data Dots */}
            {fullProgression.map((pt, i) => {
              const x = (i / (fullProgression.length - 1)) * chartWidth;
              const val = getStatValue(pt);
              const y = chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
              const isCurrent = pt.age === 27;
              const isSelectedAge = pt.age === targetAge;

              return (
                <g key={pt.age} className="cursor-pointer" onClick={() => { audioEngine.playClick(); setTargetAge(pt.age); }}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelectedAge ? "7" : isCurrent ? "6" : "4"}
                    fill={isCurrent ? "#f59e0b" : pt.age > 27 ? "#60a5fa" : "#3f3f46"}
                    stroke={isSelectedAge ? "#ffffff" : "#18181b"}
                    strokeWidth="2"
                  />
                  {isSelectedAge && (
                    <text x={x} y={y - 12} textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold" fontFamily="monospace">
                      {val}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Age labels along bottom */}
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-2 pt-2 border-t border-zinc-800">
            {fullProgression.map((pt) => (
              <span
                key={pt.age}
                onClick={() => setTargetAge(pt.age)}
                className={`cursor-pointer ${pt.age === targetAge ? 'text-amber-400 font-bold' : ''}`}
              >
                {pt.age}y
              </span>
            ))}
          </div>
        </div>

        {/* Interactive Slider */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-2/3 space-y-1">
            <div className="flex justify-between text-xs font-semibold text-zinc-300">
              <span>Inspect Age Milestone: <strong className="text-amber-400 font-mono">{targetAge} years old</strong></span>
              <span className="text-zinc-500 font-mono">Phase: {currentPoint.phase}</span>
            </div>
            <input
              type="range"
              min="18"
              max="36"
              value={targetAge}
              onChange={(e) => setTargetAge(Number(e.target.value))}
              className="w-full accent-amber-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          <div className="bg-zinc-950 border border-amber-500/30 px-4 py-2 rounded-xl text-center font-mono">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">Projected Stat</div>
            <div className="text-xl font-black text-amber-400">
              {getStatValue(currentPoint)} <span className="text-xs text-zinc-400 uppercase">({selectedStat})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Peak Window */}
        <div className="bg-zinc-900/80 border border-amber-500/30 p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase mb-2">
            <Flame className="w-4 h-4" /> PEAK PHYSICAL WINDOW
          </div>
          <div className="text-2xl font-black text-white font-mono">Age 26 - 29</div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Optimal balance of physical speed (96 Pace) and elite technical decision-making (91 Shooting / 88 Passing).
          </p>
        </div>

        {/* Fastest Growth */}
        <div className="bg-zinc-900/80 border border-emerald-500/30 p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2">
            <TrendingUp className="w-4 h-4" /> FASTEST IMPROVEMENT PERIOD
          </div>
          <div className="text-2xl font-black text-white font-mono">Age 19 → 22 (+11 OVR)</div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Explosive development during Spezia Calcio & Borussia Dortmund spell, rising from 76 to 87 OVR.
          </p>
        </div>

        {/* Natural Decline Prediction */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase mb-2">
            <ShieldAlert className="w-4 h-4" /> DECLINE PREDICTION
          </div>
          <div className="text-2xl font-black text-white font-mono">Age 33+</div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Pace projected to drop gradually (-1.5 / yr), but passing and vision attributes remain world-class into age 36.
          </p>
        </div>
      </div>
    </div>
  );
};
