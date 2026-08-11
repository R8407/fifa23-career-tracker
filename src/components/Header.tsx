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
      return parseInt(localStorage.getItem('career_legacy_points') || '0', 10);
    } catch { return 0; }
  });

  // Sync HoF points
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const stored = parseInt(localStorage.getItem('career_legacy_points') || '0', 10);
        setHofPoints(stored);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  // Calculate total career goals & assists
  const totalGoals = player.seasons.reduce((acc, s) => acc + s.goals, 0);
  const totalAssists = player.seasons.reduce((acc, s) => acc + s.assists, 0);
  const totalApps = player.seasons.reduce((acc, s) => acc + s.apps, 0);
  const totalTrophies = player.trophies.filter(t => !['manofmatch', 'assistking', 'youngplayer', 'bestxi'].includes(t.iconType)).reduce((acc, t) => acc + t.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-[#0f172a] border-b border-slate-800 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            <Trophy className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Career Legacy Hub
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-300 rounded">
                {hofPoints} HoF Pts
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>{player.nationalityFlag} {player.name}</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-medium">{player.position}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 flex items-center gap-1">
                <img src="/assets/clubs/113974.webp" alt="" className="w-3.5 h-3.5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                {player.currentClub}
              </span>
              {player.isOnLoan && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-400 text-[10px] font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">ON LOAN</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Center: Live Career Stats Quick Banner */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Apps:</span>
            <span className="font-medium text-white">{totalApps}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Goals:</span>
            <span className="font-medium text-emerald-400">{totalGoals}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Assists:</span>
            <span className="font-medium text-blue-400">{totalAssists}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Trophies:</span>
            <span className="font-medium text-amber-400">{totalTrophies}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute' : 'Unmute'}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload JSON</span>
          </button>

          {/* Iconic Moments Button */}
          <button
            onClick={onOpenIconicModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+ Iconic Moment</span>
          </button>

          {/* Simulate Season */}
          <button
            onClick={onSimulateSeason}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate</span>
          </button>
        </div>
      </div>
    </header>
  );
};
