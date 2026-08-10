import React, { useState, useMemo } from 'react';
import { PlayerData, Teammate } from '../types';
import { getExportSquad } from '../utils/dataAdapter';
import { Shield, X } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface TacticalSheetViewProps {
  player: PlayerData;
}

// Fixed 4-3-3 formation positions
const FORMATION_POSITIONS = [
  // GK
  { slot: 'GK', top: '88%', left: '50%', row: 0 },
  // DEF (4) - all within visible bounds
  { slot: 'LB', top: '72%', left: '15%', row: 1 },
  { slot: 'CB', top: '72%', left: '35%', row: 1 },
  { slot: 'CB', top: '72%', left: '55%', row: 1 },
  { slot: 'RB', top: '72%', left: '70%', row: 1 },
  // MID (3)
  { slot: 'LCM', top: '50%', left: '25%', row: 2 },
  { slot: 'CDM', top: '50%', left: '50%', row: 2 },
  { slot: 'RCM', top: '50%', left: '70%', row: 2 },
  // FWD (3) - all within visible bounds
  { slot: 'LW', top: '24%', left: '20%', row: 3 },
  { slot: 'CF', top: '24%', left: '50%', row: 3 },
  { slot: 'RW', top: '24%', left: '70%', row: 3 },
];

function getPositionGroup(pos: string): 'GK' | 'DEF' | 'MID' | 'FWD' {
  if (pos === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(pos)) return 'MID';
  return 'FWD'; // ST, CF, LW, RW
}

export const TacticalSheetView: React.FC<TacticalSheetViewProps> = ({ player }) => {
  const [selectedTeammate, setSelectedTeammate] = useState<Teammate | null>(null);
  const allTeammates = getExportSquad();

  // Assign players to fixed 4-3-3 slots
  const { assignedPlayers, pitchPositions } = useMemo(() => {
    const userPlayer = allTeammates.find(tm => tm.isUserPlayer);
    const nonUserPlayers = allTeammates.filter(tm => !tm.isUserPlayer);

    // Group by position group
    const groups: Record<string, Teammate[]> = {
      GK: [],
      DEF: [],
      MID: [],
      FWD: [],
    };
    nonUserPlayers.forEach(tm => {
      const group = getPositionGroup(tm.position);
      groups[group].push(tm);
    });

    // Sort each group by rating (descending)
    Object.values(groups).forEach(group => {
      group.sort((a, b) => b.rating - a.rating);
    });

    // Slot assignments
    const assignments: Record<string, Teammate> = {};
    const positions: Record<string, { top: string; left: string }> = {};
    const slotNames: Record<string, string> = {}; // player ID -> formation slot name

    // Assign GK
    if (groups.GK.length > 0) {
      const gk = groups.GK[0];
      assignments['GK'] = gk;
      positions[gk.id] = { top: '88%', left: '50%' };
      slotNames[gk.id] = 'GK';
    }

    // Assign DEF (4 slots: LB, CB, CB, RB)
    const defSlots = ['LB', 'CB', 'CB', 'RB'];
    defSlots.forEach((slot, i) => {
      if (groups.DEF.length > 0) {
        const defender = groups.DEF.shift()!;
        assignments[`${slot}_${i}`] = defender;
        const pos = FORMATION_POSITIONS.find(p => p.slot === slot && p.row === 1);
        if (pos) positions[defender.id] = { top: pos.top, left: pos.left };
        slotNames[defender.id] = slot;
      }
    });

    // Assign MID (3 slots: LCM, CDM, RCM)
    const midSlots = ['LCM', 'CDM', 'RCM'];
    midSlots.forEach((slot, i) => {
      if (groups.MID.length > 0) {
        const midfielder = groups.MID.shift()!;
        assignments[`${slot}_${i}`] = midfielder;
        const pos = FORMATION_POSITIONS.find(p => p.slot === slot && p.row === 2);
        if (pos) positions[midfielder.id] = { top: pos.top, left: pos.left };
        slotNames[midfielder.id] = slot;
      }
    });

    // Assign FWD (3 slots: LW, CF, RW) - but leave RW for user player
    const fwdSlots = ['LW', 'CF']; // Only assign LW and CF here
    fwdSlots.forEach((slot, i) => {
      if (groups.FWD.length > 0) {
        const forward = groups.FWD.shift()!;
        assignments[`${slot}_${i}`] = forward;
        const pos = FORMATION_POSITIONS.find(p => p.slot === slot && p.row === 3);
        if (pos) positions[forward.id] = { top: pos.top, left: pos.left };
        slotNames[forward.id] = slot;
      }
    });

    // Add user player to RW slot (always the 11th player)
    if (userPlayer) {
      const rwKey = 'RW_0';
      assignments[rwKey] = userPlayer;
      positions[userPlayer.id] = { top: '24%', left: '82%' };
      slotNames[userPlayer.id] = 'RW';
    }

    // Build final teammate list (11 players)
    const finalTeammates = Object.values(assignments).filter(Boolean);

    return {
      assignedPlayers: finalTeammates,
      pitchPositions: positions,
      slotNames,
    };
  }, [allTeammates]);

  const handlePlayerClick = (tm: Teammate) => {
    audioEngine.playClick();
    setSelectedTeammate(tm);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              {player.currentClub.toUpperCase()} TACTICAL TEAM SHEET
            </h2>
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full">
              4-3-3 FORMATION
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Best XI in a 4-3-3 system. Click any teammate to view season stats and chemistry links.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs">
          <span className="text-zinc-400 font-medium">Team Synergy:</span>
          <span className="text-emerald-400 font-extrabold font-mono text-sm">
            {assignedPlayers.length > 0 
              ? `${Math.round(assignedPlayers.reduce((sum, p) => sum + (p.chemistryLink || 75), 0) / assignedPlayers.length)}% CHEMISTRY`
              : '—'}
          </span>
        </div>
      </div>

      {/* Main Pitch Container */}
      <div className="relative bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 border-4 border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden min-h-[560px] flex items-center justify-center">
        {/* Pitch Lines Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white"></div>
          <div className="absolute top-1/2 left-1/2 w-40 h-40 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-0 left-1/2 w-80 h-32 border-2 border-white border-t-0 -translate-x-1/2"></div>
          <div className="absolute bottom-0 left-1/2 w-80 h-32 border-2 border-white border-b-0 -translate-x-1/2"></div>
        </div>

        {/* Pitch Player Nodes */}
        <div className="relative w-full h-[500px] px-4">
          {assignedPlayers.map((tm) => {
            const coords = pitchPositions[tm.id] || { top: '50%', left: '50%' };
            const isTargetUser = tm.isUserPlayer;

            return (
              <div
                key={tm.id}
                onClick={() => handlePlayerClick(tm)}
                style={{ top: coords.top, left: coords.left }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-transform group-hover:scale-115 shadow-xl ${
                      isTargetUser
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-600 border-amber-300 ring-4 ring-amber-400/40 animate-pulse'
                        : 'bg-zinc-900/90 border-zinc-400 hover:border-amber-400'
                    }`}
                  >
                    <span className="text-base">{tm.flag}</span>
                    <span className={`absolute -top-1 -right-1 px-1 py-0.2 rounded font-mono text-[9px] font-black ${
                      isTargetUser ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-amber-300 border border-zinc-700'
                    }`}>
                      {tm.rating}
                    </span>
                  </div>
                  <div className={`mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight shadow text-center whitespace-nowrap ${
                    isTargetUser
                      ? 'bg-amber-400 text-zinc-950 font-black uppercase'
                      : 'bg-zinc-950/90 text-zinc-200 border border-zinc-800'
                  }`}>
                    {tm.name.split(' ').pop()}
                    <span className="block text-[8px] opacity-80">{tm.position}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Teammates Grid */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">Full Squad ({allTeammates.length} Players)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {allTeammates.sort((a, b) => b.rating - a.rating).map((tm) => (
            <div
              key={tm.id}
              onClick={() => handlePlayerClick(tm)}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                tm.isUserPlayer
                  ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20'
                  : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-amber-400">{tm.position}</span>
                <span className="text-xs font-black font-mono text-zinc-200">{tm.rating}</span>
              </div>
              <div className="text-xs font-bold text-white truncate">{tm.name}</div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {tm.goalsThisSeason}G • {tm.assistsThisSeason}A
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teammate Detail Modal */}
      {selectedTeammate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setSelectedTeammate(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="text-3xl">{selectedTeammate.flag}</div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedTeammate.name}</h3>
                <p className="text-xs text-amber-400 font-semibold">
                  {selectedTeammate.position} • {selectedTeammate.role}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-center font-mono">
              <div>
                <div className="text-[9px] text-zinc-500 uppercase">Rating</div>
                <div className="text-lg font-black text-amber-400">{selectedTeammate.rating}</div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-500 uppercase">Goals</div>
                <div className="text-lg font-black text-white">{selectedTeammate.goalsThisSeason}</div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-500 uppercase">Assists</div>
                <div className="text-lg font-black text-blue-400">{selectedTeammate.assistsThisSeason}</div>
              </div>
            </div>

            <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Tactical Chemistry Link with {player.name}:</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">{selectedTeammate.chemistryLink}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
