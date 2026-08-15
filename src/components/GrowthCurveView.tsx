import React, { useState, useMemo } from 'react';
import { PlayerData } from '../types';
import { TrendingUp, Flame, Zap, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import { audioEngine } from '../utils/audio';
import careerExportData from '../data/career_export.json';
import { AttributeRadar } from './AttributeRadar';

interface GrowthCurveViewProps {
  player: PlayerData;
}

// The "Expected" curve — what scouts/pundits predicted based on initial potential
// This is HARDCODED: a standard projection for a player with potential 81 starting at 55 OVR
function generateExpectedCurve(potential: number) {
  const curve = [];
  const peakAge = 27;
  const declineStart = 31;
  const maxAge = 38;
  const startOvr = 55;

  for (let age = 14; age <= maxAge; age++) {
    let rating: number;

    if (age <= 17) {
      // Youth phase: slow steady growth
      rating = Math.round(startOvr + (age - 14) * 3);
    } else if (age <= peakAge) {
      // Growth to potential
      const yearsFrom17 = age - 17;
      const yearsToPeak = peakAge - 17;
      const progress = yearsFrom17 / yearsToPeak;
      const smoothProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      rating = Math.round(64 + (potential - 64) * smoothProgress);
    } else if (age <= declineStart) {
      // Peak plateau
      const yearsPastPeak = age - peakAge;
      rating = Math.round(potential - yearsPastPeak * 0.5);
    } else {
      // Decline
      const yearsPastDecline = age - declineStart;
      rating = Math.round(potential - (declineStart - peakAge) * 0.5 - yearsPastDecline * 1.5);
    }

    rating = Math.max(45, Math.min(99, rating));
    curve.push({ age, rating });
  }
  return curve;
}

// The "Real" curve — your actual performance from career data
function generateRealCurve(seasons: any[], currentAge: number, currentOvr: number) {
  const curve = [];
  const maxAge = 38;

  // Build map of actual OVR ratings from season data
  const ratingsByAge: Record<number, number> = {};
  for (const s of seasons) {
    const age = s.age || (14 + parseInt(s.id?.split('_')[1] || '0'));
    const ovr = s.overall || (s.avgRating > 10 ? Math.round(s.avgRating) : null);
    if (ovr && ovr > 40) {
      ratingsByAge[age] = ovr;
    }
  }

  // Always use profile's current OVR for current age (season overall may be stale from Lua export)
  if (currentOvr > 40) {
    ratingsByAge[currentAge] = currentOvr;
  }

  for (let age = 14; age <= maxAge; age++) {
    const actualRating = ratingsByAge[age];
    curve.push({
      age,
      rating: actualRating || null,
      hasData: actualRating !== undefined && actualRating !== null,
    });
  }
  return curve;
}

export const GrowthCurveView: React.FC<GrowthCurveViewProps> = ({ player }) => {
  const [selectedStat, setSelectedStat] = useState<'overall' | 'pace' | 'shooting' | 'passing' | 'dribbling' | 'physical'>('overall');
  const [targetAge, setTargetAge] = useState<number>(player.age || 15);

  // Get real data from export
  const exportData = careerExportData as any;
  const playerProfile = exportData.my_player_profile || {};
  const seasons = exportData.seasons || [];
  const currentOvr = player.overall || playerProfile.overallrating || 69;
  const potential = player.potential || playerProfile.potential || 81;
  const currentAge = player.age || 15;

  // Generate both curves
  const expectedCurve = useMemo(() => generateExpectedCurve(potential), [potential]);
  const realCurve = useMemo(() => generateRealCurve(seasons, currentAge, currentOvr), [seasons, currentAge, currentOvr]);

  // Calculate stats for real curve
  const realPoints = realCurve.filter(p => p.hasData);
  const lastRealPoint = realPoints[realPoints.length - 1];
  const expectedAtSameAge = expectedCurve.find(p => p.age === lastRealPoint?.age);
  const deltaVsExpected = lastRealPoint && expectedAtSameAge
    ? lastRealPoint.rating - expectedAtSameAge.rating
    : 0;

  const inspectExpected = expectedCurve.find(p => p.age === targetAge);
  const inspectReal = realCurve.find(p => p.age === targetAge);

  // Find peak of expected curve
  const peakExpected = expectedCurve.reduce((max, p) => p.rating > max.rating ? p : max, expectedCurve[0]);

  // SVG Chart
  const minVal = 50;
  const maxVal = 95;
  const chartHeight = 220;
  const chartWidth = 700;

  const expectedPointsSvg = expectedCurve.map((pt, i) => {
    const x = (i / (expectedCurve.length - 1)) * chartWidth;
    const y = chartHeight - ((pt.rating - minVal) / (maxVal - minVal)) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const realPointsSvg = realCurve
    .filter(p => p.hasData)
    .map((pt, i, arr) => {
      const idx = pt.age - 14;
      const x = (idx / (expectedCurve.length - 1)) * chartWidth;
      const y = chartHeight - ((pt.rating! - minVal) / (maxVal - minVal)) * chartHeight;
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
              EXPECTED vs REAL
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            What pundits predicted vs what you actually delivered. Overall: <strong className="text-white">{currentOvr}</strong> | Potential: <strong className="text-white">{potential}</strong>
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

      {/* Legend */}
      <div className="flex items-center gap-6 px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-zinc-500 rounded" style={{ borderTop: '2px dashed #71717a' }} />
          <span className="text-xs text-zinc-400 font-bold">EXPECTED (Pundits' Projection)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-amber-500 rounded" />
          <span className="text-xs text-zinc-400 font-bold">REAL (Your Actual Rating)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-400 font-bold">Current Age</span>
        </div>
      </div>

      {/* Attribute Radar */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Current Attribute Profile
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            OVR <strong className="text-white">{currentOvr}</strong> | POT <strong className="text-emerald-400">{potential}</strong>
          </span>
        </div>
        <AttributeRadar attributes={{
          pace: player.attributes.pace,
          shooting: player.attributes.shooting,
          passing: player.attributes.passing,
          dribbling: player.attributes.dribbling,
          defending: player.attributes.defending,
          physical: player.attributes.physical,
        }} />
      </div>

      {/* Main Chart Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl relative">
        {/* Delta badge */}
        {deltaVsExpected !== 0 && (
          <div className={`mb-4 p-3 border rounded-xl text-xs font-mono flex items-center justify-between ${
            deltaVsExpected > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <span>
              vs EXPECTED at age {lastRealPoint?.age}: <strong className="text-white">
                {deltaVsExpected > 0 ? '+' : ''}{deltaVsExpected} OVR
              </strong> {deltaVsExpected > 0 ? 'above' : 'below'} projection
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              deltaVsExpected > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {deltaVsExpected > 0 ? 'OUTPERFORMING' : 'UNDERPERFORMING'}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Rating Trajectory by Age (14 → 38)
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            Selected: <strong className="text-white uppercase">{selectedStat}</strong>
          </span>
        </div>

        {/* SVG Graph */}
        <div className="relative w-full overflow-x-auto py-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56 overflow-visible">
            {/* Grid lines */}
            {[55, 65, 75, 85, 95].map((gridVal) => {
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

            {/* Peak Window Highlight */}
            <rect
              x={((peakExpected.age - 14) / (expectedCurve.length - 1)) * chartWidth}
              y="0"
              width={(4 / (expectedCurve.length - 1)) * chartWidth}
              height={chartHeight}
              fill="#eab308"
              fillOpacity="0.06"
            />

            {/* Area under expected */}
            <defs>
              <linearGradient id="expectedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#71717a" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#71717a" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Expected area */}
            <polygon
              points={`0,${chartHeight} ${expectedPointsSvg} ${chartWidth},${chartHeight}`}
              fill="url(#expectedGrad)"
            />

            {/* Expected line (dashed) */}
            <polyline
              fill="none"
              stroke="#71717a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 4"
              points={expectedPointsSvg}
            />

            {/* Real area (only up to current age) */}
            {realPointsSvg && (
              <polygon
                points={`0,${chartHeight} ${realPointsSvg} ${((realPoints[realPoints.length - 1]?.age || currentAge) - 14) / (expectedCurve.length - 1) * chartWidth},${chartHeight}`}
                fill="url(#realGrad)"
              />
            )}

            {/* Real line (solid, bold) */}
            {realPointsSvg && (
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={realPointsSvg}
              />
            )}

            {/* Real data dots */}
            {realPoints.map((pt) => {
              const idx = pt.age - 14;
              const x = (idx / (expectedCurve.length - 1)) * chartWidth;
              const y = chartHeight - ((pt.rating! - minVal) / (maxVal - minVal)) * chartHeight;
              const isCurrent = pt.age === currentAge;

              return (
                <g key={`real-${pt.age}`} className="cursor-pointer" onClick={() => { audioEngine.playClick(); setTargetAge(pt.age); }}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isCurrent ? "7" : "5"}
                    fill={isCurrent ? "#22c55e" : "#f59e0b"}
                    stroke={pt.age === targetAge ? "#ffffff" : "#18181b"}
                    strokeWidth="2"
                  />
                  {pt.age === targetAge && (
                    <text x={x} y={y - 14} textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold" fontFamily="monospace">
                      {pt.rating}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Expected dot at target age (for comparison) */}
            {inspectExpected && (
              <g>
                <circle
                  cx={((targetAge - 14) / (expectedCurve.length - 1)) * chartWidth}
                  cy={chartHeight - ((inspectExpected.rating - minVal) / (maxVal - minVal)) * chartHeight}
                  r={inspectReal?.hasData ? "4" : "6"}
                  fill="none"
                  stroke="#71717a"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                {!inspectReal?.hasData && (
                  <text
                    x={((targetAge - 14) / (expectedCurve.length - 1)) * chartWidth}
                    y={chartHeight - ((inspectExpected.rating - minVal) / (maxVal - minVal)) * chartHeight - 10}
                    textAnchor="middle"
                    fill="#71717a"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {inspectExpected.rating}
                  </text>
                )}
              </g>
            )}
          </svg>

          {/* Age labels */}
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-2 pt-2 border-t border-zinc-800">
            {expectedCurve.map((pt) => (
              <span
                key={pt.age}
                onClick={() => setTargetAge(pt.age)}
                className={`cursor-pointer ${
                  pt.age === targetAge ? 'text-amber-400 font-bold' :
                  pt.age === currentAge ? 'text-emerald-400 font-bold' : ''
                }`}
              >
                {pt.age}y
              </span>
            ))}
          </div>
        </div>

        {/* Slider */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-2/3 space-y-1">
            <div className="flex justify-between text-xs font-semibold text-zinc-300">
              <span>Inspect Age: <strong className="text-amber-400 font-mono">{targetAge} years old</strong></span>
              <span className="text-zinc-500 font-mono">
                Expected: <strong className="text-zinc-400">{inspectExpected?.rating}</strong>
                {inspectReal?.hasData && (
                  <> | Real: <strong className="text-amber-400">{inspectReal.rating}</strong></>
                )}
              </span>
            </div>
            <input
              type="range"
              min="14"
              max="38"
              value={targetAge}
              onChange={(e) => setTargetAge(Number(e.target.value))}
              className="w-full accent-amber-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex gap-2">
            <div className="bg-zinc-950 border border-zinc-700 px-3 py-2 rounded-xl text-center font-mono">
              <div className="text-[9px] text-zinc-500 uppercase font-bold">Expected</div>
              <div className="text-lg font-black text-zinc-400">{inspectExpected?.rating}</div>
            </div>
            {inspectReal?.hasData && (
              <div className="bg-zinc-950 border border-amber-500/30 px-3 py-2 rounded-xl text-center font-mono">
                <div className="text-[9px] text-amber-400 uppercase font-bold">Real</div>
                <div className="text-lg font-black text-amber-400">{inspectReal.rating}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Delta vs Expected */}
        <div className={`p-5 rounded-2xl border ${
          deltaVsExpected > 0
            ? 'bg-emerald-500/5 border-emerald-500/30'
            : deltaVsExpected < 0
            ? 'bg-red-500/5 border-red-500/30'
            : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase mb-2 ${
            deltaVsExpected > 0 ? 'text-emerald-400' : deltaVsExpected < 0 ? 'text-red-400' : 'text-zinc-400'
          }`}>
            <Activity className="w-4 h-4" /> vs EXPECTED
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {deltaVsExpected > 0 ? '+' : ''}{deltaVsExpected} OVR
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {deltaVsExpected > 0
              ? `Outperforming pundits' projection by ${deltaVsExpected} overall at age ${lastRealPoint?.age}.`
              : deltaVsExpected < 0
              ? `Currently ${Math.abs(deltaVsExpected)} below projection. Time to prove them wrong.`
              : 'No real data yet. Start playing to track your progress.'}
          </p>
        </div>

        {/* Peak Window */}
        <div className="bg-zinc-900/80 border border-amber-500/30 p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase mb-2">
            <Flame className="w-4 h-4" /> PEAK WINDOW
          </div>
          <div className="text-2xl font-black text-white font-mono">Age {peakExpected.age - 1} - {peakExpected.age + 1}</div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Expected peak at {peakExpected.rating} OVR. {deltaVsExpected > 0 ? 'You could peak higher.' : 'Push to exceed expectations.'}
          </p>
        </div>

        {/* Seasons Tracked */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase mb-2">
            <TrendingUp className="w-4 h-4" /> DATA POINTS
          </div>
          <div className="text-2xl font-black text-white font-mono">{realPoints.length} Seasons</div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {realPoints.length === 0
              ? 'No season data yet. Play matches to populate the real curve.'
              : `Tracking ${realPoints.length} season${realPoints.length !== 1 ? 's' : ''} of actual performance data.`}
          </p>
        </div>
      </div>
    </div>
  );
};
