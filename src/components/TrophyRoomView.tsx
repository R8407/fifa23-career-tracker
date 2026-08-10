import React, { useState } from 'react';
import { PlayerData, TrophyItem } from '../types';
import { Trophy, Award, X, Sparkles, Info, Users, User, Star } from 'lucide-react';
import { audioEngine } from '../utils/audio';

import motmImg from '../../models/MOTM.webp';
import ballondorSvg from '../../models/ballon-dor.svg';
import eplImg from '../../models/EPL.webp';
import uclImg from '../../models/UCL.webp';
import goldenbootImg from '../assets/images/golden_boot_trophy_1786062523925.jpg';

interface TrophyRoomViewProps {
  player: PlayerData;
}

type TrophyAsset =
  | { kind: 'svg'; src: string }
  | { kind: 'img'; src: string; blend: string };

const TROPHY_ASSETS: Record<string, TrophyAsset> = {
  manofmatch: { kind: 'img', src: motmImg, blend: 'multiply' },
  ballondor: { kind: 'svg', src: ballondorSvg },
  league: { kind: 'img', src: eplImg, blend: 'multiply' },
  champions: { kind: 'img', src: uclImg, blend: 'screen' },
  goldenboot: { kind: 'img', src: goldenbootImg, blend: 'multiply' },
  assistking: { kind: 'img', src: goldenbootImg, blend: 'multiply' },
  worldcup: { kind: 'img', src: eplImg, blend: 'multiply' },
  national: { kind: 'img', src: eplImg, blend: 'multiply' },
  cup: { kind: 'img', src: eplImg, blend: 'multiply' },
  europaleague: { kind: 'img', src: uclImg, blend: 'screen' },
};

const TrophyVisual: React.FC<{
  iconType: string;
  className?: string;
}> = ({ iconType, className = '' }) => {
  const asset = TROPHY_ASSETS[iconType] || TROPHY_ASSETS.league;

  if (asset.kind === 'svg') {
    return (
      <img
        src={asset.src}
        alt=""
        className={`${className} object-contain`}
        draggable={false}
      />
    );
  }

  return (
    <img
      src={asset.src}
      alt=""
      className={`${className} object-contain`}
      style={{ mixBlendMode: asset.blend }}
      draggable={false}
    />
  );
};

const TrophyDisplay: React.FC<{
  trophy: TrophyItem;
  onClick: () => void;
}> = ({ trophy, onClick }) => {
  const count = trophy.quantity;
  const alwaysOne = trophy.iconType === 'manofmatch';

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer trophy-3d"
    >
      <div className="absolute -inset-2 bg-gradient-to-b from-white/10 via-white/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none glass-reflect" />

      <div className="relative flex items-end justify-center">
        {alwaysOne || count === 1 ? (
          <div className="relative trophy-glow">
            <div className="w-24 h-28 flex items-center justify-center drop-shadow-[0_12px_20px_rgba(0,0,0,0.4)] group-hover:drop-shadow-[0_16px_28px_rgba(234,179,8,0.5)] transition-all duration-300">
              <TrophyVisual
                iconType={trophy.iconType}
                className="w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="w-24 h-2.5 bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 rounded-b-lg mx-auto shadow-lg" />
          </div>
        ) : count === 2 ? (
          <div className="flex items-end gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="relative trophy-glow">
                <div className="w-20 h-24 flex items-center justify-center drop-shadow-[0_10px_16px_rgba(0,0,0,0.35)] group-hover:drop-shadow-[0_14px_24px_rgba(234,179,8,0.45)] transition-all duration-300">
                  <TrophyVisual
                    iconType={trophy.iconType}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="w-20 h-2 bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 rounded-b-lg mx-auto shadow-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-end">
            <div className="relative -mr-4 z-0 opacity-50 transform -rotate-8 scale-85">
              <div className="w-16 h-20 drop-shadow-lg">
                <TrophyVisual iconType={trophy.iconType} className="w-full h-full" />
              </div>
            </div>
            <div className="relative -ml-4 z-0 opacity-50 transform rotate-8 scale-85">
              <div className="w-16 h-20 drop-shadow-lg">
                <TrophyVisual iconType={trophy.iconType} className="w-full h-full" />
              </div>
            </div>
            <div className="relative z-10 trophy-glow">
              <div className="w-24 h-28 flex items-center justify-center drop-shadow-[0_14px_24px_rgba(0,0,0,0.45)] group-hover:drop-shadow-[0_18px_32px_rgba(234,179,8,0.55)] transition-all duration-300">
                <TrophyVisual
                  iconType={trophy.iconType}
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="w-24 h-2.5 bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 rounded-b-lg mx-auto shadow-lg" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-center">
        <p className="text-[10px] font-bold text-zinc-300 group-hover:text-amber-400 transition-colors line-clamp-1">
          {trophy.title}
        </p>
        {count > 1 && (
          <p className="text-[9px] font-mono text-amber-400/80 font-bold mt-0.5">
            × {count}
          </p>
        )}
      </div>

      <div className="absolute -inset-4 bg-gradient-to-t from-amber-500/10 via-amber-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
};

const TrophyShelf: React.FC<{
  title: string;
  icon: React.ReactNode;
  trophies: TrophyItem[];
  onSelect: (t: TrophyItem) => void;
}> = ({ title, icon, trophies, onSelect }) => (
  <div className="bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl">
    <div className="relative p-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/15 blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
        <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
          {trophies.reduce((a, t) => a + t.quantity, 0)}
        </span>
      </div>

      <div className="relative mx-auto max-w-3xl border border-zinc-600/30 rounded-xl bg-zinc-950/50 p-6">
        <div className="absolute top-0 left-4 w-px h-full bg-gradient-to-b from-white/10 via-white/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-4 w-px h-full bg-gradient-to-b from-white/5 via-white/3 to-transparent pointer-events-none" />

        <div className="flex items-end justify-center gap-6 flex-wrap py-4">
          {trophies.map((trophy) => (
            <TrophyDisplay key={trophy.id} trophy={trophy} onClick={() => onSelect(trophy)} />
          ))}
        </div>
      </div>
    </div>

    <div className="h-4 bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border-t border-amber-800/20" />
  </div>
);

export const TrophyRoomView: React.FC<TrophyRoomViewProps> = ({ player }) => {
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyItem | null>(null);

  const handleSelectTrophy = (t: TrophyItem) => {
    audioEngine.playTrophyUnlock();
    setSelectedTrophy(t);
  };

  const wonTrophies = player.trophies.filter(t => t.quantity > 0);

  const teamTrophies = wonTrophies.filter(t => t.category === 'Club' || t.category === 'International');
  const individualTrophies = wonTrophies.filter(t => t.category === 'Individual');
  const hasAny = teamTrophies.length > 0 || individualTrophies.length > 0;

  const teamCount = teamTrophies.reduce((a, t) => a + t.quantity, 0);
  const individualCount = individualTrophies.reduce((a, t) => a + t.quantity, 0);
  const totalTrophyCount = teamCount + individualCount;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Room Header */}
      <div className="relative bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                TROPHY ROOM
              </h2>
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> {wonTrophies.length} TYPES WON
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              Your personal trophy cabinet — click any trophy to view details
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-950 border border-amber-500/40 px-4 py-2 rounded-xl">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[9px] text-zinc-500 font-bold uppercase">Trophies</div>
                <div className="text-lg font-black text-amber-300">{teamCount}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 border border-purple-500/40 px-4 py-2 rounded-xl">
              <Award className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-[9px] text-zinc-500 font-bold uppercase">Individual</div>
                <div className="text-lg font-black text-purple-300">{individualCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasAny && (
        <div className="bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl">
          <div className="relative p-8 min-h-[350px]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-amber-500/10 blur-2xl" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Trophy className="w-16 h-16 text-zinc-700/50 mx-auto mb-3" />
                <p className="text-sm font-bold text-zinc-500">Cabinet Empty</p>
                <p className="text-[10px] text-zinc-600 mt-1">Win trophies to fill the shelves</p>
              </div>
            </div>
          </div>
          <div className="h-4 bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border-t border-amber-800/20" />
        </div>
      )}

      {/* Team Trophies Shelf */}
      {teamTrophies.length > 0 && (
        <TrophyShelf
          title="Team Trophies"
          icon={<Users className="w-4 h-4 text-amber-400" />}
          trophies={teamTrophies}
          onSelect={handleSelectTrophy}
        />
      )}

      {/* Individual Awards Shelf */}
      {individualTrophies.length > 0 && (
        <TrophyShelf
          title="Individual Awards"
          icon={<Award className="w-4 h-4 text-purple-400" />}
          trophies={individualTrophies}
          onSelect={handleSelectTrophy}
        />
      )}

      {/* Trophy Detail Modal */}
      {selectedTrophy && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="relative h-48 bg-gradient-to-b from-zinc-800/50 to-zinc-900 flex items-center justify-center overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 blur-3xl" />
              
              <button
                onClick={() => setSelectedTrophy(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="relative z-10 w-36 h-40 drop-shadow-[0_15px_30px_rgba(234,179,8,0.5)]">
                <TrophyVisual iconType={selectedTrophy.iconType} className="w-full h-full" />
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/3 pointer-events-none" />
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-center">
                <span className={`inline-block px-3 py-1 text-[10px] font-bold rounded-full uppercase border ${
                  selectedTrophy.tier === 'Diamond'
                    ? 'bg-cyan-950/50 text-cyan-300 border-cyan-500/40'
                    : selectedTrophy.tier === 'Platinum'
                    ? 'bg-purple-950/50 text-purple-300 border-purple-500/40'
                    : 'bg-amber-950/50 text-amber-300 border-amber-500/40'
                }`}>
                  {selectedTrophy.tier} TIER
                </span>
                <h3 className="text-xl font-black text-white mt-2">{selectedTrophy.title}</h3>
                <p className="text-amber-400 font-mono font-bold text-sm mt-1">
                  WON {selectedTrophy.quantity} TIME{selectedTrophy.quantity > 1 ? 'S' : ''}
                </p>
              </div>
              
              <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">Details</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selectedTrophy.description}
                </p>
              </div>
              
              <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-xl p-3">
                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Seasons Won</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTrophy.yearsWon.map((year, i) => (
                    <span key={i} className="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold rounded border border-amber-500/20">
                      {year}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Category</span>
                <span className="text-zinc-300 font-bold">{selectedTrophy.category}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
