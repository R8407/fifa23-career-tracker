import React, { useState } from 'react';
import { PlayerData, TrophyItem } from '../types';
import { Trophy, Award, X, Sparkles, Info, Users, Globe } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface TrophyRoomViewProps {
  player: PlayerData;
}

type TrophyAsset =
  | { kind: 'svg'; src: string }
  | { kind: 'img'; src: string; blend: string };

const TROPHY_ASSETS: Record<string, TrophyAsset> = {
  manofmatch: { kind: 'img', src: '/assets/images/awards/MOTM.jpg', blend: 'multiply' },
  ballondor: { kind: 'img', src: '/assets/images/awards/ballon-dor.webp', blend: 'multiply' },
  league: { kind: 'img', src: '/assets/images/trophies/serie-a.webp', blend: 'multiply' },
  champions: { kind: 'img', src: '/assets/images/trophies/UCL.jpg', blend: 'screen' },
  goldenboot: { kind: 'img', src: '/assets/images/awards/Golden_boot.jpg', blend: 'multiply' },
  assistking: { kind: 'img', src: '/assets/images/awards/Top_assist.jpg', blend: 'multiply' },
  youngplayer: { kind: 'img', src: '/assets/images/awards/young-player.webp', blend: 'multiply' },
  bestxi: { kind: 'img', src: '/assets/images/awards/player-of-season.webp', blend: 'multiply' },
  worldcup: { kind: 'img', src: '/assets/images/awards/ballon-dor.webp', blend: 'multiply' },
  national: { kind: 'img', src: '/assets/images/awards/player-of-season.webp', blend: 'multiply' },
  cup: { kind: 'img', src: '/assets/images/competitions/copa-italia.webp', blend: 'multiply' },
  europaleague: { kind: 'img', src: '/assets/images/trophies/europa-league.jpg', blend: 'screen' },
  playerofseason: { kind: 'img', src: '/assets/images/awards/POTS.webp', blend: 'multiply' },
};

const TrophyVisual: React.FC<{
  iconType: string;
  imagePath?: string;
  className?: string;
}> = ({ iconType, imagePath, className = '' }) => {
  const asset = imagePath
    ? { kind: 'img' as const, src: imagePath, blend: 'multiply' }
    : (TROPHY_ASSETS[iconType] || TROPHY_ASSETS.league);

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
  const imagePath = trophy.imagePath;

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
                imagePath={imagePath}
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
                    imagePath={imagePath}
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
                <TrophyVisual iconType={trophy.iconType} imagePath={imagePath} className="w-full h-full" />
              </div>
            </div>
            <div className="relative -ml-4 z-0 opacity-50 transform rotate-8 scale-85">
              <div className="w-16 h-20 drop-shadow-lg">
                <TrophyVisual iconType={trophy.iconType} imagePath={imagePath} className="w-full h-full" />
              </div>
            </div>
            <div className="relative z-10 trophy-glow">
              <div className="w-24 h-28 flex items-center justify-center drop-shadow-[0_14px_24px_rgba(0,0,0,0.45)] group-hover:drop-shadow-[0_18px_32px_rgba(234,179,8,0.55)] transition-all duration-300">
                <TrophyVisual
                  iconType={trophy.iconType}
                  imagePath={imagePath}
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

const WOOD_SHELF_STYLE: React.CSSProperties = {
  background: 'linear-gradient(to bottom, #8a5a2b, #6b4423 45%, #4a2f17 55%, #3a2511)',
  boxShadow: 'inset 0 1px 0 rgba(255,215,150,0.35), inset 0 -1px 0 rgba(0,0,0,0.5), 0 6px 10px rgba(0,0,0,0.5)',
};

const WOOD_FRAME_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, #7a4e26 0%, #5a3717 45%, #3e2610 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,215,150,0.25), inset 0 -1px 0 rgba(0,0,0,0.6)',
};

const WOOD_POST_H_STYLE: React.CSSProperties = {
  background: 'linear-gradient(90deg, #7a4e26 0%, #5a3717 50%, #3e2610 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,215,150,0.2)',
};

const CabinetShelf: React.FC<{
  title: string;
  icon: React.ReactNode;
  trophies: TrophyItem[];
  onSelect: (t: TrophyItem) => void;
  emptyText: string;
}> = ({ title, icon, trophies, onSelect, emptyText }) => (
  <div className="relative rounded-lg overflow-hidden">
    {/* alcove back wall */}
    <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/90 via-zinc-900/70 to-zinc-950/90 border-x border-zinc-700/40" />

    {/* label bar */}
    <div className="relative flex items-center gap-2 px-3 pt-2 pb-1">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest text-amber-100/90">{title}</span>
      <span className="ml-auto px-2 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
        {trophies.reduce((a, t) => a + t.quantity, 0)}
      </span>
    </div>

    {/* trophy area */}
    <div className="relative flex items-end justify-center gap-4 flex-wrap px-4 pb-2 min-h-[150px]">
      {trophies.length > 0 ? (
        trophies.map((trophy) => (
          <TrophyDisplay key={trophy.id} trophy={trophy} onClick={() => onSelect(trophy)} />
        ))
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center opacity-70">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{emptyText}</p>
            <p className="text-[9px] text-zinc-700 mt-1">Empty shelf</p>
          </div>
        </div>
      )}
    </div>

    {/* wooden shelf board */}
    <div className="relative h-2.5 mx-1 mb-1 rounded-sm" style={WOOD_SHELF_STYLE} />
  </div>
);

export const TrophyRoomView: React.FC<TrophyRoomViewProps> = ({ player }) => {
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyItem | null>(null);

  const handleSelectTrophy = (t: TrophyItem) => {
    audioEngine.playTrophyUnlock();
    setSelectedTrophy(t);
  };

  // All-time club trophies (League, Cup, UCL, Europa League, etc.)
  const clubTrophies = player.trophies.filter(t =>
    t.category === 'Club' && t.quantity > 0
  );

  // All-time international trophies (World Cup, National, etc.)
  const internationalTrophies = player.trophies.filter(t =>
    t.category === 'International' && t.quantity > 0
  );

  // All-time individual awards (MOTM + season awards + Ballon d'Or, etc.)
  const individualAwards = player.trophies.filter(t =>
    t.category === 'Individual' && t.quantity > 0
  );

  const clubCount = clubTrophies.reduce((a, t) => a + t.quantity, 0);
  const internationalCount = internationalTrophies.reduce((a, t) => a + t.quantity, 0);
  const individualCount = individualAwards.reduce((a, t) => a + t.quantity, 0);

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
                <Sparkles className="w-3.5 h-3.5" /> {clubTrophies.length + internationalTrophies.length + individualAwards.length} TYPES WON
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
                <div className="text-[9px] text-zinc-500 font-bold uppercase">Club Trophies</div>
                <div className="text-lg font-black text-amber-300">{clubCount}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 border border-sky-500/40 px-4 py-2 rounded-xl">
              <Globe className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-[9px] text-zinc-500 font-bold uppercase">International</div>
                <div className="text-lg font-black text-sky-300">{internationalCount}</div>
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

      {/* Trophy Room */}
      <div
        className="relative overflow-hidden rounded-3xl border border-zinc-800 shadow-2xl"
        style={{ background: 'radial-gradient(ellipse at 50% -10%, #2c2318 0%, #17130e 55%, #0e0b08 100%)' }}
      >
        {/* floor glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,215,150,0.06))' }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, #2a1d10, #150d06)' }}
        />

        {/* cabinet */}
        <div className="relative mx-auto max-w-4xl px-3 sm:px-6 py-8">
          {/* crown */}
          <div className="rounded-t-2xl border border-black/60 h-4" style={WOOD_FRAME_STYLE} />

          {/* body */}
          <div className="flex border-x border-black/50">
            {/* left post */}
            <div className="w-3 sm:w-5" style={WOOD_POST_H_STYLE} />

            {/* shelves */}
            <div
              className="flex-1 space-y-3 px-1.5 sm:px-3 py-2.5"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.35))' }}
            >
              <CabinetShelf
                title="Club Trophies"
                icon={<Users className="w-3.5 h-3.5 text-amber-400" />}
                trophies={clubTrophies}
                onSelect={handleSelectTrophy}
                emptyText="No club trophies yet"
              />
              <CabinetShelf
                title="International Trophies"
                icon={<Globe className="w-3.5 h-3.5 text-sky-400" />}
                trophies={internationalTrophies}
                onSelect={handleSelectTrophy}
                emptyText="No international trophies yet"
              />
              <CabinetShelf
                title="Individual Awards"
                icon={<Award className="w-3.5 h-3.5 text-purple-400" />}
                trophies={individualAwards}
                onSelect={handleSelectTrophy}
                emptyText="No individual awards yet"
              />
            </div>

            {/* right post */}
            <div className="w-3 sm:w-5" style={WOOD_POST_H_STYLE} />
          </div>

          {/* base */}
          <div className="rounded-b-2xl border border-black/60 h-6" style={WOOD_FRAME_STYLE} />
        </div>
      </div>

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
                <TrophyVisual iconType={selectedTrophy.iconType} imagePath={selectedTrophy.imagePath} className="w-full h-full" />
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
