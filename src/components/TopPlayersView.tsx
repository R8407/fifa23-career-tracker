import React, { useState, useEffect } from 'react';
import { Users, Trophy, Target, Medal, Handshake, TrendingUp, ArrowRight } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface PlayerStat {
  rank: number;
  playerid: number;
  teamid: number;
  teamname: string;
  playerName: string;
  apps: number;
  goals: number;
  assists: number;
  motm: number;
}

interface LeagueStats {
  exportDate: string;
  userTeamId: number;
  myPlayerId: number;
  topScorers: PlayerStat[];
  topAssists: PlayerStat[];
}

export const TopPlayersView: React.FC = () => {
  const [leagueStats, setLeagueStats] = useState<LeagueStats | null>(null);
  const [activeTab, setActiveTab] = useState<'scorers' | 'assists'>('scorers');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeagueStats();
  }, []);

  const loadLeagueStats = async () => {
    try {
      const resp = await fetch('/career_export.json');
      if (resp.ok) {
        const data = await resp.json();
        setLeagueStats(data.league_stats || null);
      }
    } catch (e) {
      console.error('Failed to load league stats:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 text-sm">Loading player stats...</div>
      </div>
    );
  }

  if (!leagueStats) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            TOP PLAYERS
          </h2>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 p-8 rounded-2xl text-center">
          <p className="text-zinc-400">No league data available. Run the Lua script first:</p>
          <code className="text-amber-400 text-xs mt-2 block">export_league_stats.lua</code>
        </div>
      </div>
    );
  }

  const players = activeTab === 'scorers' ? leagueStats.topScorers : leagueStats.topAssists;
  const statKey = activeTab === 'scorers' ? 'goals' : 'assists';
  const statColor = activeTab === 'scorers' ? 'text-amber-400' : 'text-blue-400';
  const statIcon = activeTab === 'scorers' ? Target : Handshake;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <h2 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Users className="w-6 h-6 text-amber-400" />
          TOP PLAYERS
        </h2>
        <p className="text-zinc-400 text-xs mt-1">
          League-wide rankings • Updated {leagueStats.exportDate}
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            audioEngine.playClick();
            setActiveTab('scorers');
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'scorers'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600'
          }`}
        >
          <Target className="w-4 h-4" />
          TOP SCORERS
        </button>
        <button
          onClick={() => {
            audioEngine.playClick();
            setActiveTab('assists');
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'assists'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600'
          }`}
        >
          <Handshake className="w-4 h-4" />
          TOP ASSISTS
        </button>
      </div>

      {/* Race Comparison Card */}
      {(() => {
        const leader = players[0];
        const userId = leagueStats.myPlayerId;
        const userPlayer = players.find(p => p.playerid === userId);
        if (!leader) return null;
        
        const leaderStat = leader[statKey];
        const userStat = userPlayer ? userPlayer[statKey] : 0;
        const gap = leaderStat - userStat;
        const progress = leaderStat > 0 ? Math.min(100, (userStat / leaderStat) * 100) : 0;
        const isUserLeading = userPlayer && userPlayer.rank === 1;
        
        return (
          <div className={`rounded-2xl p-5 border ${
            isUserLeading 
              ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/40'
              : 'bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-zinc-800'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              {isUserLeading ? (
                <Trophy className="w-5 h-5 text-amber-400" />
              ) : (
                <TrendingUp className="w-5 h-5 text-zinc-400" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {activeTab === 'scorers' ? 'GOLDEN BOOT RACE' : 'PLAYMAKER AWARD'} — YOUR POSITION
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {/* Leader */}
              <div className="text-center">
                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Leader</div>
                <div className="text-lg font-black text-white">{leader.playerName}</div>
                <div className="text-[10px] text-zinc-500">{leader.teamname}</div>
                <div className={`text-2xl font-black mt-1 ${statColor}`}>{leaderStat}</div>
              </div>
              
              {/* Gap */}
              <div className="flex flex-col items-center justify-center">
                {isUserLeading ? (
                  <div className="text-center">
                    <div className="text-2xl font-black text-amber-400">#1</div>
                    <div className="text-[10px] text-amber-400 font-bold">YOU LEAD!</div>
                  </div>
                ) : userPlayer ? (
                  <div className="text-center">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Gap</div>
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-black text-red-400">-{gap}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">to close</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-[10px] text-zinc-500">Not ranked yet</div>
                  </div>
                )}
              </div>
              
              {/* You */}
              <div className="text-center">
                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">You</div>
                <div className="text-lg font-black text-amber-300">
                  {userPlayer ? userPlayer.playerName : '—'}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {userPlayer ? `#${userPlayer.rank}` : '—'}
                </div>
                <div className={`text-2xl font-black mt-1 ${statColor}`}>{userStat}</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            {!isUserLeading && userPlayer && (
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Progress to leader</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      progress >= 80 ? 'bg-amber-400' : progress >= 50 ? 'bg-amber-500' : 'bg-amber-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Players List */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {activeTab === 'scorers' ? 'Golden Boot Race' : 'Playmaker Award'}
          </h3>
        </div>
        
        <div className="divide-y divide-zinc-800/50">
          {players.slice(0, 30).map((player) => {
            const isUserPlayer = player.playerid === leagueStats.myPlayerId;
            
            return (
              <div 
                key={player.playerid}
                className={`flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors ${
                  isUserPlayer ? 'bg-amber-500/10' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    player.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                    player.rank <= 3 ? 'bg-amber-500/20 text-amber-400' :
                    player.rank <= 10 ? 'bg-zinc-700 text-zinc-300' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    {player.rank}
                  </div>
                  
                  {/* Player Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isUserPlayer ? 'text-amber-300' : 'text-white'}`}>
                        {player.playerName || `Player ${player.playerid}`}
                      </span>
                      {isUserPlayer && (
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[8px] font-bold rounded">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {player.teamname || `Team ${player.teamid}`} • {player.apps} apps
                    </div>
                  </div>
                </div>
                
                {/* Stats - show primary stat first based on tab */}
                <div className="flex items-center gap-6">
                  {activeTab === 'assists' ? (
                    <>
                      <div className="text-center">
                        <div className="text-[9px] text-zinc-500 uppercase">Assists</div>
                        <div className={`text-sm font-bold ${player.assists > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>
                          {player.assists}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-zinc-500 uppercase">Goals</div>
                        <div className={`text-sm font-bold ${player.goals > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {player.goals}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="text-[9px] text-zinc-500 uppercase">Goals</div>
                        <div className={`text-sm font-bold ${player.goals > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {player.goals}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-zinc-500 uppercase">Assists</div>
                        <div className={`text-sm font-bold ${player.assists > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>
                          {player.assists}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="text-center">
                    <div className="text-[9px] text-zinc-500 uppercase">MOTM</div>
                    <div className={`text-sm font-bold ${player.motm > 0 ? 'text-purple-400' : 'text-zinc-500'}`}>
                      {player.motm}
                    </div>
                  </div>
                  <div className={`text-lg font-black ${statColor}`}>
                    {player[statKey]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your Position Card */}
      {(() => {
        const userPlayer = players.find(p => p.playerid === leagueStats.myPlayerId);
        if (!userPlayer) return null;
        
        return (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Medal className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-amber-300">YOUR RANKING</div>
                  <div className="text-sm text-white">
                    {userPlayer.playerName || 'You'} — #{userPlayer.rank}
                  </div>
                </div>
              </div>
              <div className="text-2xl font-black text-amber-400">
                {userPlayer[statKey]} {activeTab === 'scorers' ? 'goals' : 'assists'}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
