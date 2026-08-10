import React, { useState } from 'react';
import { PlayerData, RankedLegend } from '../types';
import { TOP_100_LEGENDS } from '../data/mockData';
import { Search, Trophy, Award, Flame, Zap, Star, ChevronDown, Check, User, Filter } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface CompareViewProps {
  player: PlayerData;
}

export function getLegendFullAttributes(legend: RankedLegend) {
  if (legend.attributes) return legend.attributes;

  const pos = legend.position;
  if (pos === 'ST' || pos === 'CF') {
    return { pace: 91, shooting: 94, passing: 80, dribbling: 88, defending: 40, physical: 82 };
  } else if (pos === 'RW' || pos === 'LW' || pos === 'CAM') {
    return { pace: 92, shooting: 89, passing: 92, dribbling: 94, defending: 46, physical: 76 };
  } else if (pos === 'CM' || pos === 'CDM') {
    return { pace: 82, shooting: 82, passing: 94, dribbling: 89, defending: 78, physical: 82 };
  } else if (pos === 'CB' || pos === 'RB' || pos === 'LB') {
    return { pace: 84, shooting: 62, passing: 78, dribbling: 76, defending: 95, physical: 90 };
  } else {
    return { pace: 68, shooting: 28, passing: 74, dribbling: 58, defending: 94, physical: 86 };
  }
}

export const CompareView: React.FC<CompareViewProps> = ({ player }) => {
  const [selectedLegend, setSelectedLegend] = useState<RankedLegend>(TOP_100_LEGENDS[0]); // Lionel Messi
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [positionFilter, setPositionFilter] = useState<string>('All');

  // Filter legends for search & filter dropdown
  const filteredLegends = TOP_100_LEGENDS.filter((leg) => {
    const matchesSearch =
      leg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leg.nationality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leg.era.toLowerCase().includes(searchQuery.toLowerCase());

    if (positionFilter === 'All') return matchesSearch;
    if (positionFilter === 'Forwards') return matchesSearch && ['ST', 'CF', 'RW', 'LW'].includes(leg.position);
    if (positionFilter === 'Midfield') return matchesSearch && ['CAM', 'CM', 'CDM'].includes(leg.position);
    if (positionFilter === 'Defense') return matchesSearch && ['CB', 'RB', 'LB', 'GK'].includes(leg.position);

    return matchesSearch;
  });

  const selectedAttributes = getLegendFullAttributes(selectedLegend);

  // Radar chart coordinates
  const categories = ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defending', 'Physical'];
  const userStats = [
    typeof player.attributes.pace === 'number' ? player.attributes.pace : 0,
    typeof player.attributes.shooting === 'number' ? player.attributes.shooting : 0,
    typeof player.attributes.passing === 'number' ? player.attributes.passing : 0,
    typeof player.attributes.dribbling === 'number' ? player.attributes.dribbling : 0,
    typeof player.attributes.defending === 'number' ? player.attributes.defending : 0,
    typeof player.attributes.physical === 'number' ? player.attributes.physical : 0
  ];
  const legendStats = [
    selectedAttributes.pace,
    selectedAttributes.shooting,
    selectedAttributes.passing,
    selectedAttributes.dribbling,
    selectedAttributes.defending,
    selectedAttributes.physical
  ];

  const size = 260;
  const center = size / 2;
  const radius = 95;

  const getCoordinates = (stats: number[]) => {
    return stats
      .map((val, idx) => {
        const angle = (Math.PI * 2 / 6) * idx - Math.PI / 2;
        const r = (val / 100) * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');
  };

  const userPath = getCoordinates(userStats);
  const legendPath = getCoordinates(legendStats);

  const totalUserGoals = player.seasons.reduce((acc, s) => acc + s.goals, 0);
  const totalUserAssists = player.seasons.reduce((acc, s) => acc + s.assists, 0);
  const totalUserApps = player.seasons.reduce((acc, s) => acc + s.apps, 0);
  const userBallonDor = player.trophies.find((t) => t.iconType === 'ballondor')?.quantity || 0;
  const userWorldCup = player.trophies.find((t) => t.iconType === 'worldcup')?.quantity || 0;
  const userClubTrophies = player.trophies
    .filter((t) => t.category === 'Club')
    .reduce((acc, t) => acc + t.quantity, 0);

  const handleSelectLegend = (leg: RankedLegend) => {
    audioEngine.playClick();
    setSelectedLegend(leg);
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Legend Selection Section */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-amber-500/40 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              HEAD-TO-HEAD LEGEND COMPARISON
            </h2>
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-full">
              50 ALL-TIME LEGENDS
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1 max-w-lg">
            Compare your career statistics, Ballon d'Or counts, trophies, and radar attributes against any of the top 50 legends in football history.
          </p>
        </div>

        {/* Searchable Dropdown Control */}
        <div className="relative w-full md:w-80">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-zinc-900 border-2 border-amber-500/60 hover:border-amber-400 text-white p-3 rounded-xl flex items-center justify-between gap-3 shadow-lg cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="text-xl">{selectedLegend.flag}</span>
              <div className="text-left truncate">
                <div className="text-xs font-black text-amber-300 truncate">{selectedLegend.name}</div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {selectedLegend.position} • {selectedLegend.era} • {selectedLegend.nationality}
                </div>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-amber-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Expanded Search & Selection Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-14 z-50 w-full sm:w-96 bg-zinc-950 border-2 border-amber-500/60 rounded-2xl p-3 shadow-2xl space-y-3 animate-fadeIn">
              {/* Search Bar inside menu */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search (e.g. Messi, Pele, Zidane)..."
                  className="w-full bg-zinc-900 border border-zinc-800 text-white pl-9 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>

              {/* Position Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pb-1">
                {['All', 'Forwards', 'Midfield', 'Defense'].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={`px-2.5 py-1 rounded-lg font-extrabold uppercase transition-colors cursor-pointer ${
                      positionFilter === pos ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              {/* Scrollable Legends List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-zinc-900 pr-1">
                {filteredLegends.length > 0 ? (
                  filteredLegends.map((leg, index) => (
                    <div
                      key={leg.id}
                      onClick={() => handleSelectLegend(leg)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 hover:bg-amber-500/10 ${
                        selectedLegend.id === leg.id ? 'bg-amber-500/20 border border-amber-500/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-xs font-mono font-bold text-zinc-500 w-5">#{index + 1}</span>
                        <span className="text-base">{leg.flag}</span>
                        <div className="truncate">
                          <div className="text-xs font-bold text-white truncate">{leg.name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {leg.position} • {leg.era} • {leg.goals} G
                          </div>
                        </div>
                      </div>

                      {selectedLegend.id === leg.id && (
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-zinc-500 text-xs">
                    No legend found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Quick-Select Bar for Popular Legends */}
      <div className="flex items-center gap-2 overflow-x-auto bg-zinc-900/80 p-2.5 rounded-2xl border border-zinc-800 text-xs">
        <span className="text-[10px] font-bold text-zinc-500 uppercase px-2 shrink-0 flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-400" /> Quick Select:
        </span>
        {TOP_100_LEGENDS.slice(0, 8).map((leg) => (
          <button
            key={leg.id}
            onClick={() => handleSelectLegend(leg)}
            className={`px-3 py-1.5 rounded-xl font-extrabold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedLegend.id === leg.id
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>{leg.flag}</span>
            <span>{leg.name.split(' ').pop()}</span>
          </button>
        ))}
      </div>

      {/* Head-to-Head Cards & Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* User Card */}
        <div className="lg:col-span-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-2 border-amber-500/50 p-6 rounded-2xl text-center space-y-4 relative shadow-2xl">
          <div className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-extrabold rounded-full border border-amber-500/40 uppercase">
            YOUR PLAYER
          </div>

          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-inner">
            👑
          </div>

          <div>
            <h3 className="text-xl font-black text-white">{player.name}</h3>
            <p className="text-xs text-amber-400 font-semibold">
              {player.position} • {player.currentClub} ({player.nationalityFlag})
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-950 p-3 rounded-xl border border-zinc-800">
            <div>
              <span className="text-zinc-500 uppercase text-[9px]">Overall</span>
              <div className="text-lg font-black text-amber-400">{player.overall}</div>
            </div>
            <div>
              <span className="text-zinc-500 uppercase text-[9px]">Potential</span>
              <div className="text-lg font-black text-emerald-400">{player.potential}</div>
            </div>
          </div>
        </div>

        {/* Center SVG Radar Chart */}
        <div className="lg:col-span-4 bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center shadow-xl">
          <div className="text-xs font-bold uppercase text-zinc-400 mb-2 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" /> Attribute Radar Battle
          </div>

          <svg viewBox={`0 0 ${size} ${size}`} className="w-64 h-64 overflow-visible">
            {/* Hexagon Background Webs */}
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((level) => {
              const hexPoints = categories
                .map((_, idx) => {
                  const angle = (Math.PI * 2 / 6) * idx - Math.PI / 2;
                  const r = radius * level;
                  return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                })
                .join(' ');

              return (
                <polygon
                  key={level}
                  points={hexPoints}
                  fill="none"
                  stroke="#27272a"
                  strokeWidth="1"
                />
              );
            })}

            {/* Radar Axes */}
            {categories.map((cat, idx) => {
              const angle = (Math.PI * 2 / 6) * idx - Math.PI / 2;
              const x2 = center + radius * Math.cos(angle);
              const y2 = center + radius * Math.sin(angle);
              const labelX = center + (radius + 18) * Math.cos(angle);
              const labelY = center + (radius + 18) * Math.sin(angle);

              return (
                <g key={cat}>
                  <line x1={center} y1={center} x2={x2} y2={y2} stroke="#3f3f46" strokeWidth="1" />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#a1a1aa"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {cat.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {/* Legend Radar Polygon */}
            <polygon
              points={legendPath}
              fill="#3b82f6"
              fillOpacity="0.25"
              stroke="#3b82f6"
              strokeWidth="2"
            />

            {/* User Radar Polygon */}
            <polygon
              points={userPath}
              fill="#f59e0b"
              fillOpacity="0.35"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
          </svg>

          {/* Legend key */}
          <div className="flex items-center gap-4 text-xs font-bold mt-2">
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-3 bg-amber-500 rounded-sm"></span> {player.name}
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-3 h-3 bg-blue-500 rounded-sm"></span> {selectedLegend.name}
            </span>
          </div>
        </div>

        {/* Selected Legend Card */}
        <div className="lg:col-span-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-2 border-blue-500/50 p-6 rounded-2xl text-center space-y-4 relative shadow-2xl">
          <div className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-extrabold rounded-full border border-blue-500/40 uppercase">
            FOOTBALL LEGEND
          </div>

          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-indigo-900 border-2 border-blue-300 flex items-center justify-center text-3xl shadow-inner">
            {selectedLegend.flag}
          </div>

          <div>
            <h3 className="text-xl font-black text-white">{selectedLegend.name}</h3>
            <p className="text-xs text-blue-400 font-semibold">
              {selectedLegend.position} • {selectedLegend.era} • {selectedLegend.nationality}
            </p>
          </div>

          <div className="bg-blue-950/40 p-2.5 rounded-xl border border-blue-500/30 text-[11px] text-blue-200 font-sans font-medium line-clamp-2">
            "{selectedLegend.notableAchievement}"
          </div>
        </div>
      </div>

      {/* Direct Metric Comparison Table */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-4">
        <h3 className="text-sm font-black text-white uppercase tracking-wider text-center flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> CAREER HEAD-TO-HEAD BREAKDOWN
        </h3>

        <div className="space-y-2.5 font-mono text-xs">
          {/* Appearances */}
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
            <span className="font-extrabold text-amber-400 text-sm w-28">{totalUserApps} Apps</span>
            <span className="text-zinc-300 uppercase font-sans font-bold text-xs text-center">Total Career Appearances</span>
            <span className="font-extrabold text-blue-400 text-sm w-28 text-right">{selectedLegend.appearances || 0} Apps</span>
          </div>

          {/* Goals */}
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
            <span className="font-extrabold text-amber-400 text-sm w-28">{totalUserGoals} Goals</span>
            <span className="text-zinc-300 uppercase font-sans font-bold text-xs text-center">Total Career Goals</span>
            <span className="font-extrabold text-blue-400 text-sm w-28 text-right">{selectedLegend.goals} Goals</span>
          </div>

          {/* Assists */}
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
            <span className="font-extrabold text-amber-400 text-sm w-28">{totalUserAssists} Assists</span>
            <span className="text-zinc-300 uppercase font-sans font-bold text-xs text-center">Total Career Assists</span>
            <span className="font-extrabold text-blue-400 text-sm w-28 text-right">{selectedLegend.assists} Assists</span>
          </div>

          {/* Ballon d'Or */}
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
            <span className="font-extrabold text-amber-400 text-sm w-28">{userBallonDor} {userBallonDor === 1 ? 'Winner' : 'Winners'}</span>
            <span className="text-zinc-300 uppercase font-sans font-bold text-xs text-center">Ballon d'Or Titles</span>
            <span className="font-extrabold text-blue-400 text-sm w-28 text-right">{selectedLegend.ballondOr} {selectedLegend.ballondOr === 1 ? 'Winner' : 'Winners'}</span>
          </div>

          {/* World Cup */}
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
            <span className="font-extrabold text-amber-400 text-sm w-28">{userWorldCup} Titles</span>
            <span className="text-zinc-300 uppercase font-sans font-bold text-xs text-center">FIFA World Cups</span>
            <span className="font-extrabold text-blue-400 text-sm w-28 text-right">{selectedLegend.worldCup} Titles</span>
          </div>

          {/* Club Trophies */}
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
            <span className="font-extrabold text-amber-400 text-sm w-28">{userClubTrophies} Trophies</span>
            <span className="text-zinc-300 uppercase font-sans font-bold text-xs text-center">Club Team Trophies</span>
            <span className="font-extrabold text-blue-400 text-sm w-28 text-right">{selectedLegend.clubTrophies} Trophies</span>
          </div>
        </div>
      </div>
    </div>
  );
};
