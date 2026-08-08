import React, { useRef, useState, useEffect } from 'react';
import { Trophy, Volume2, VolumeX, Sparkles, UserPen, Flame, Zap, Upload } from 'lucide-react';
import { PlayerData } from '../types';
import { audioEngine } from '../utils/audio';

interface HeaderProps {
  player: PlayerData;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenIconicModal: () => void;
  onSimulateSeason: () => void;
  onUploadJson: (data: any) => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  player,
  soundEnabled,
  onToggleSound,
  onOpenIconicModal,
  onSimulateSeason,
  onUploadJson,
  activeTab
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hofPoints, setHofPoints] = useState<number>(() => {
    try {
      const stored = parseInt(localStorage.getItem('career_legacy_points') || '0', 10);
      if (stored < 80) {
        localStorage.setItem('career_legacy_points', '80');
        return 80;
      }
      return stored;
    } catch { return 80; }
  });

  // Sync HoF points
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const stored = parseInt(localStorage.getItem('career_legacy_points') || '0', 10);
        if (stored < 80) {
          localStorage.setItem('career_legacy_points', '80');
          setHofPoints(80);
        } else {
          setHofPoints(stored);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  // Calculate total career goals & assists
  const totalGoals = player.seasons.reduce((acc, s) => acc + s.goals, 0);
  const totalAssists = player.seasons.reduce((acc, s) => acc + s.assists, 0);
  const totalApps = player.seasons.reduce((acc, s) => acc + s.apps, 0);
  const totalTrophies = player.trophies.filter(t => t.iconType !== 'manofmatch').reduce((acc, t) => acc + t.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => audioEngine.playClick()}>
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative w-10 h-10 bg-zinc-900 border border-amber-500/50 rounded-xl flex items-center justify-center text-amber-400 font-extrabold text-xl shadow-inner">
              <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wider text-zinc-100 uppercase font-sans">
                CAREER LEGACY <span className="text-amber-400">HUB</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                {hofPoints} HoF Pts
              </span>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
              <span>{player.nationalityFlag} {player.name}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-amber-300/90 font-semibold">{player.position}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-300">{player.currentClub}</span>
            </p>
          </div>
        </div>

        {/* Center: Live Career Stats Quick Banner */}
        <div className="hidden lg:flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 rounded-full px-4 py-1.5 text-xs shadow-inner">
          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Apps:</span>
            <span className="font-bold text-zinc-100">{totalApps}</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Goals:</span>
            <span className="font-bold text-amber-400">{totalGoals}</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Assists:</span>
            <span className="font-bold text-blue-400">{totalAssists}</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Trophies:</span>
            <span className="font-bold text-yellow-300">{totalTrophies}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Stadium Audio' : 'Unmute Stadium Audio'}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          {/* JSON Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const data = JSON.parse(ev.target?.result as string);
                    onUploadJson(data);
                  } catch {
                    alert('Invalid JSON file');
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload career_export.json"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload JSON</span>
          </button>

          {/* Iconic Moments Button */}
          <button
            onClick={onOpenIconicModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">+ Iconic Moment</span>
          </button>

          {/* Simulate Next Match/Season */}
          <button
            onClick={onSimulateSeason}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 rounded-lg shadow-md hover:shadow-amber-500/20 transition-all transform active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-950 fill-zinc-950" />
            <span>Simulate Season</span>
          </button>
        </div>
      </div>
    </header>
  );
};
