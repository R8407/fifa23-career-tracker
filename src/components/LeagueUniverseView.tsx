import React, { useState, useMemo } from 'react';
import { PlayerData } from '../types';
import careerExportData from '../data/career_export.json';
import { Globe, Trophy, Flame, Award, Star } from 'lucide-react';
import { audioEngine } from '../utils/audio';
import { getLeagueLogo } from '../utils/logos';

interface LeagueUniverseViewProps {
  player: PlayerData;
}

const TOP_5_LEAGUES = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'];

export const LeagueUniverseView: React.FC<LeagueUniverseViewProps> = ({ player }) => {
  const { leagueScorers, leagueKeys } = useMemo(() => {
    const exportData = careerExportData as any;
    const topScorers = exportData.top_scorers_by_league || {};
    const leagueStats = exportData.league_stats || {};
    
    const scorersByLeague: Record<string, any[]> = {};
    
    // First, use live API data from league_stats (user's league only)
    if (leagueStats.topScorers && leagueStats.topScorers.length > 0) {
      // Determine which league this is from the competition name
      const userLeague = leagueStats.competitions?.[0]?.name || '';
      const mappedScorers = leagueStats.topScorers.map((s: any, idx: number) => ({
        rank: idx + 1,
        player: s.playerName || `Player ${s.playerid}`,
        team: s.teamname || 'Unknown',
        nationality: '',
        flag: '⚽',
        position: '',
        value: s.goals || 0,
        displayValue: `${s.goals} goals`,
        isUserPlayer: s.playerid === parseInt(exportData.my_player_id),
        isLiveData: true,
      }));
      
      // Map to the correct league name
      if (userLeague.includes('Serie A')) scorersByLeague['Serie A'] = mappedScorers;
      else if (userLeague.includes('Premier')) scorersByLeague['Premier League'] = mappedScorers;
      else if (userLeague.includes('La Liga')) scorersByLeague['La Liga'] = mappedScorers;
      else if (userLeague.includes('Bundesliga')) scorersByLeague['Bundesliga'] = mappedScorers;
      else if (userLeague.includes('Ligue')) scorersByLeague['Ligue 1'] = mappedScorers;
    }
    
    // Then fill in other leagues from CSV data (stale but only option)
    for (const [leagueName, scorers] of Object.entries(topScorers)) {
      if (!TOP_5_LEAGUES.includes(leagueName)) continue;
      if (scorersByLeague[leagueName]) continue; // Skip if we already have live data
      
      const mappedScorers = (scorers as any[]).map((s: any, idx: number) => ({
        rank: idx + 1,
        player: s.commonname || `${s.firstname} ${s.lastname}`,
        team: s.teamname,
        nationality: '',
        flag: '⚽',
        position: '',
        value: parseInt(s.leaguegoals) || 0,
        displayValue: `${s.leaguegoals} goals`,
        isUserPlayer: s.playerid === exportData.my_player_id,
        isLiveData: false,
      }));
      
      scorersByLeague[leagueName] = mappedScorers;
    }
    
    const keys: string[] = TOP_5_LEAGUES.filter(l => scorersByLeague[l]);
    
    return { leagueScorers: scorersByLeague, leagueKeys: keys };
  }, [player.league]);
  
  const [selectedLeague, setSelectedLeague] = useState<string>(leagueKeys[0] || 'Premier League');
  const currentScorers = leagueScorers[selectedLeague] || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              LEAGUE UNIVERSE PORTAL
            </h2>
            <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-full">
              CURRENT SEASON
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Top scorers from your career save across the top 5 leagues.
          </p>
        </div>

        <div className="flex gap-1.5 bg-zinc-950 border border-zinc-800 p-1.5 rounded-xl text-xs font-bold">
          {leagueKeys.map((lg) => (
            <button
              key={lg}
              onClick={() => {
                audioEngine.playClick();
                setSelectedLeague(lg);
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer uppercase ${
                selectedLeague === lg
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {lg}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4" /> TOP GOALSCORERS ({selectedLeague.toUpperCase()})
          </h3>
          <div className="flex items-center gap-2">
            {currentScorers.some((s: any) => s.isLiveData) && (
              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[8px] font-bold rounded uppercase">Live</span>
            )}
            <span className="text-[10px] text-zinc-500 font-mono">GOLDEN BOOT RACE</span>
          </div>
        </div>

        <div className="space-y-2">
          {currentScorers.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-xs">
              No scorers data available for this league
            </div>
          ) : currentScorers.map((entry: any) => (
            <div
              key={entry.rank}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                entry.isUserPlayer
                  ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/5'
                  : 'bg-zinc-950 border-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                  entry.rank === 1 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  #{entry.rank}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{entry.player}</span>
                    {entry.isUserPlayer && (
                      <span className="px-1.5 py-0.2 bg-amber-400 text-zinc-950 text-[9px] font-black uppercase rounded">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <span>{entry.flag}</span>
                    <span>{entry.team}</span>
                  </p>
                </div>
              </div>

              <div className="font-mono font-black text-amber-400 text-sm">
                {entry.displayValue}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
