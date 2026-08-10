import React from 'react';
import {
  LayoutDashboard,
  User,
  TrendingUp,
  Calendar,
  Shield,
  Building2,
  GitCompare,
  Award,
  Trophy,
  LineChart,
  Newspaper,
  Medal,
  Users,
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
  { id: 'topplayers', label: 'Top Players', icon: Users },
  { id: 'compare', label: 'Compare Legends', icon: GitCompare },
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
    <aside className="w-full lg:w-56 bg-[#0f172a] border-r border-slate-800 p-2 flex flex-row lg:flex-col gap-0.5 overflow-x-auto lg:overflow-y-auto shrink-0 scrollbar-none">
      <div className="hidden lg:block px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
        Menu
      </div>

      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex items-center justify-between px-3 py-2 rounded text-sm transition-colors whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </div>

            {notifications[tab.id] && (
              <span className="ml-2 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        );
      })}

      <div className="hidden lg:block mt-auto p-3 bg-slate-800/50 border border-slate-700/50 rounded text-center">
        <div className="text-emerald-400 text-xs font-medium mb-1">
          Career Legacy Hub
        </div>
        <p className="text-xs text-slate-500">
          Track your journey to football history.
        </p>
      </div>
    </aside>
  );
};
