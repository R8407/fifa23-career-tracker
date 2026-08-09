import React from 'react';
import {
  LayoutDashboard,
  User,
  TrendingUp,
  Calendar,
  Shield,
  Building2,
  Globe,
  GitCompare,
  Award,
  Trophy,
  LineChart,
  Newspaper,
  Medal,
  MessageSquare
} from 'lucide-react';
import { audioEngine } from '../utils/audio';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  hasNotification?: boolean;
}

export const TABS: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'news', label: 'Career News', icon: Newspaper },
  { id: 'profile', label: 'Player Profile', icon: User },
  { id: 'growth', label: 'Growth Curve', icon: TrendingUp },
  { id: 'seasons', label: 'Season History', icon: Calendar },
  { id: 'teams', label: 'Team Journey', icon: Shield },
  { id: 'tactical', label: 'Club', icon: Building2 },
  { id: 'league', label: 'League Universe', icon: Globe },
  { id: 'compare', label: 'Compare Legends', icon: GitCompare },
  { id: 'h2h', label: 'Head-to-Head', icon: Shield },
  { id: 'halloffame', label: 'Hall of Fame', icon: Award },
  { id: 'trophyroom', label: 'Trophy Room', icon: Trophy },
  { id: 'seasonawards', label: 'Season Awards', icon: Medal },
  { id: 'projections', label: 'Records & Projections', icon: LineChart },
  { id: 'social', label: 'Social Hub', icon: MessageSquare },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  notifications?: Record<string, boolean>;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, notifications = {} }) => {
  const handleTabClick = (id: string) => {
    audioEngine.playClick();
    setActiveTab(id);
  };

  return (
    <aside className="w-full lg:w-64 bg-zinc-950/80 border-r border-zinc-800/80 p-3 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto shrink-0 scrollbar-none">
      <div className="hidden lg:block px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Navigation Archive
      </div>

      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer group ${
              isActive
                ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent text-amber-300 border-l-2 border-amber-400 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-amber-400' : 'text-zinc-500 group-hover:text-zinc-300'
                }`}
              />
              <span>{tab.label}</span>
            </div>

            {notifications[tab.id] && (
              <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        );
      })}

      <div className="hidden lg:block mt-auto p-3.5 bg-gradient-to-b from-zinc-900/60 to-zinc-900 border border-zinc-800/60 rounded-xl text-center">
        <div className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
          <Trophy className="w-3.5 h-3.5" /> Immortality Index
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Tracking every goal, assist, and trophy on the road to football history.
        </p>
      </div>
    </aside>
  );
};
