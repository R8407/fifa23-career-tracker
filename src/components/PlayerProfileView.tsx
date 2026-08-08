import React, { useState } from 'react';
import { PlayerData } from '../types';
import { Activity, Zap, Shield, Target, Feather, Dumbbell, Award } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface PlayerProfileViewProps {
  player: PlayerData;
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({ player }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical'>('all');

  const mainStats = [
    { key: 'pace', label: 'PACE', value: player.attributes.pace, icon: Zap, color: 'from-amber-500 to-yellow-400' },
    { key: 'shooting', label: 'SHOOTING', value: player.attributes.shooting, icon: Target, color: 'from-red-500 to-amber-500' },
    { key: 'passing', label: 'PASSING', value: player.attributes.passing, icon: Activity, color: 'from-blue-500 to-cyan-400' },
    { key: 'dribbling', label: 'DRIBBLING', value: player.attributes.dribbling, icon: Feather, color: 'from-purple-500 to-pink-400' },
    { key: 'defending', label: 'DEFENDING', value: player.attributes.defending, icon: Shield, color: 'from-zinc-500 to-zinc-400' },
    { key: 'physical', label: 'PHYSICAL', value: player.attributes.physical, icon: Dumbbell, color: 'from-emerald-500 to-teal-400' },
  ];

  const subAttributeGroups = [
    {
      category: 'pace',
      title: 'Pace & Acceleration',
      items: [
        { name: 'Acceleration', val: player.attributes.acceleration },
        { name: 'Sprint Speed', val: player.attributes.sprintSpeed },
      ]
    },
    {
      category: 'shooting',
      title: 'Shooting & Finishing',
      items: [
        { name: 'Finishing', val: player.attributes.finishing },
        { name: 'Shot Power', val: player.attributes.shotPower },
        { name: 'Long Shots', val: player.attributes.longShots },
        { name: 'Volleys', val: player.attributes.volleys },
        { name: 'Penalties', val: player.attributes.penalties },
      ]
    },
    {
      category: 'passing',
      title: 'Passing & Vision',
      items: [
        { name: 'Vision', val: player.attributes.vision },
        { name: 'Crossing', val: player.attributes.crossing },
        { name: 'Short Passing', val: player.attributes.shortPassing },
        { name: 'Long Passing', val: player.attributes.longPassing },
        { name: 'Curve', val: player.attributes.curve },
      ]
    },
    {
      category: 'dribbling',
      title: 'Dribbling & Agility',
      items: [
        { name: 'Agility', val: player.attributes.agility },
        { name: 'Balance', val: player.attributes.balance },
        { name: 'Reactions', val: player.attributes.reactions },
        { name: 'Ball Control', val: player.attributes.ballControl },
        { name: 'Dribbling', val: player.attributes.dribblingStat },
        { name: 'Composure', val: player.attributes.composure },
      ]
    },
    {
      category: 'defending',
      title: 'Defending & Tackling',
      items: [
        { name: 'Interceptions', val: player.attributes.interceptions },
        { name: 'Heading Acc.', val: player.attributes.headingAcc },
        { name: 'Def. Awareness', val: player.attributes.defAwareness },
        { name: 'Standing Tackle', val: player.attributes.standingTackle },
        { name: 'Sliding Tackle', val: player.attributes.slidingTackle },
      ]
    },
    {
      category: 'physical',
      title: 'Physicality & Stamina',
      items: [
        { name: 'Stamina', val: player.attributes.stamina },
        { name: 'Strength', val: player.attributes.strength },
        { name: 'Jumping', val: player.attributes.jumping },
        { name: 'Aggression', val: player.attributes.aggression },
      ]
    }
  ];

  const filteredGroups = activeCategory === 'all'
    ? subAttributeGroups
    : subAttributeGroups.filter(g => g.category === activeCategory);

  const getStatBadgeColor = (val: number | string) => {
    if (typeof val === 'string') return 'text-zinc-500 bg-zinc-900 border-zinc-800';
    if (val >= 90) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (val >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (val >= 70) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    return 'text-zinc-400 bg-zinc-800 border-zinc-700';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              PLAYER ATTRIBUTE PROFILE
            </h2>
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full">
              FIFA/EAFC ENGINE
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Comprehensive physical, technical, and tactical skill breakdown for {player.name}.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-mono">
          <span className="text-zinc-500">OVERALL:</span>
          <span className="text-2xl font-black text-amber-400">{player.overall}</span>
        </div>
      </div>

      {/* Main 6 Attributes Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {mainStats.map((stat) => {
          const Icon = stat.icon;
          const isSelected = activeCategory === stat.key;

          return (
            <button
              key={stat.key}
              onClick={() => {
                audioEngine.playClick();
                setActiveCategory(isSelected ? 'all' : (stat.key as any));
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-zinc-800/90 border-amber-400 shadow-lg shadow-amber-500/10'
                  : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  {stat.label}
                </span>
                <Icon className="w-4 h-4 text-zinc-500" />
              </div>

              <div className="text-3xl font-black text-white font-mono mb-2">
                {stat.value}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${stat.color}`}
                  style={{ width: `${stat.value}%` }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Sub-attributes Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-zinc-300 uppercase tracking-wider">
            Detailed Skill Attributes {activeCategory !== 'all' && `(${activeCategory.toUpperCase()})`}
          </h3>

          {activeCategory !== 'all' && (
            <button
              onClick={() => setActiveCategory('all')}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Show All Categories
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <div
              key={group.title}
              className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl space-y-3"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-2 flex items-center justify-between">
                <span>{group.title}</span>
                <Award className="w-3.5 h-3.5 text-zinc-500" />
              </h4>

              <div className="space-y-2.5">
                {group.items.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-300">{item.name}</span>
                      <span className={`px-1.5 py-0.2 rounded border text-[10px] font-mono font-bold ${getStatBadgeColor(item.val)}`}>
                        {item.val}
                      </span>
                    </div>

                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          item.val >= 90
                            ? 'bg-amber-400'
                            : item.val >= 80
                            ? 'bg-emerald-400'
                            : item.val >= 70
                            ? 'bg-blue-400'
                            : 'bg-zinc-600'
                        }`}
                        style={{ width: `${item.val}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attribute Evolution Chart Preview */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl">
        <h3 className="text-sm font-extrabold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" /> ATTRIBUTE EVOLUTION TIMELINE (AGE 18 - 27)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-zinc-300 font-mono">
            <thead className="bg-zinc-950 text-zinc-500 text-[10px] uppercase">
              <tr>
                <th className="p-3">Age</th>
                <th className="p-3">Season</th>
                <th className="p-3 text-amber-400">Overall</th>
                <th className="p-3">Pace</th>
                <th className="p-3">Shooting</th>
                <th className="p-3">Passing</th>
                <th className="p-3">Dribbling</th>
                <th className="p-3">Physical</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {player.evolutionHistory.map((pt) => (
                <tr key={pt.age} className="hover:bg-zinc-800/40">
                  <td className="p-3 font-bold text-white">{pt.age} yrs</td>
                  <td className="p-3 text-zinc-400">{pt.year}</td>
                  <td className="p-3 font-bold text-amber-400">{pt.overall}</td>
                  <td className="p-3 text-zinc-300">{pt.pace}</td>
                  <td className="p-3 text-zinc-300">{pt.shooting}</td>
                  <td className="p-3 text-zinc-300">{pt.passing}</td>
                  <td className="p-3 text-zinc-300">{pt.dribbling}</td>
                  <td className="p-3 text-zinc-300">{pt.physical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
