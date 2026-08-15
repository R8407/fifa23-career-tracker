import React, { useState, useEffect, useMemo } from 'react';
import { Users, Trophy, Target, Medal, Handshake, TrendingUp, Shield, Star } from 'lucide-react';
import { audioEngine } from '../utils/audio';

const FIFA_COMP_NAMES: Record<number, string> = {
  819: 'Premier League', 13: 'Premier League',
  633: 'Carabao Cup', 18: 'Carabao Cup',
  16: 'Bundesliga', 31: 'La Liga', 33: 'Serie A TIM', 56: 'Ligue 1',
  14: 'Champions League', 15: 'Europa League', 1828: 'UEFA Europa Conference League',
  17: 'FA Cup', 19: 'Community Shield',
};

function compLabel(name: string, compobjid?: number): string {
  if (!name) return 'Unknown';
  if (compobjid && FIFA_COMP_NAMES[compobjid]) return FIFA_COMP_NAMES[compobjid];
  const m = name.match(/^Competition (\d+)$/);
  if (m) return FIFA_COMP_NAMES[parseInt(m[1])] || name;
  return name;
}

interface PlayerStat {
  rank: number;
  playerid: number;
  teamid: number;
  teamname: string;
  playerName: string;
  compname: string;
  apps: number;
  goals: number;
  assists: number;
  motm: number;
}

interface CompetitionStandings {
  compobjid: number;
  name: string;
  teams: {
    position: number;
    teamid: number;
    teamname: string;
    matchesPlayed: number;
    goals: number;
    assists: number;
    yellow: number;
    red: number;
    goalDifference: number;
  }[];
}

interface LeagueStats {
  exportDate: string;
  userTeamId: number;
  myPlayerId: number;
  competitions: CompetitionStandings[];
  topScorers: PlayerStat[];
  topAssists: PlayerStat[];
}

const COMP_ORDER = ['Premier League', 'UEFA Europa Conference League', 'Carabao Cup'];

export const TopPlayersView: React.FC = () => {
  const [leagueStats, setLeagueStats] = useState<LeagueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedComp, setExpandedComp] = useState<string | null>(null);

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

  // Group data by competition
  const compData = useMemo(() => {
    if (!leagueStats) return [];
    const compSet = new Map<string, { standings: CompetitionStandings | null; scorers: PlayerStat[]; assists: PlayerStat[] }>();

    // Initialize from competitions array
    for (const c of leagueStats.competitions) {
      compSet.set(compLabel(c.name, c.compobjid), { standings: c, scorers: [], assists: [] });
    }

    // Group scorers by compname
    for (const s of leagueStats.topScorers) {
      const name = compLabel(s.compname || 'Unknown');
      if (!compSet.has(name)) compSet.set(name, { standings: null, scorers: [], assists: [] });
      compSet.get(name)!.scorers.push(s);
    }

    // Group assists by compname
    for (const s of leagueStats.topAssists) {
      const name = compLabel(s.compname || 'Unknown');
      if (!compSet.has(name)) compSet.set(name, { standings: null, scorers: [], assists: [] });
      compSet.get(name)!.assists.push(s);
    }

    // Sort by predefined order, then alphabetically
    return Array.from(compSet.entries())
      .sort((a, b) => {
        const ai = COMP_ORDER.indexOf(a[0]);
        const bi = COMP_ORDER.indexOf(b[0]);
        const aOrd = ai >= 0 ? ai : COMP_ORDER.length;
        const bOrd = bi >= 0 ? bi : COMP_ORDER.length;
        return aOrd - bOrd || a[0].localeCompare(b[0]);
      });
  }, [leagueStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 text-sm">Loading player stats...</div>
      </div>
    );
  }

  if (!leagueStats || compData.length === 0) {
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

      {/* Per-competition sections */}
      {compData.map(([compName, data]) => (
        <CompetitionSection
          key={compName}
          compName={compName}
          data={data}
          userTeamId={leagueStats.userTeamId}
          myPlayerId={leagueStats.myPlayerId}
          isExpanded={expandedComp === compName}
          onToggle={() => {
            audioEngine.playClick();
            setExpandedComp(expandedComp === compName ? null : compName);
          }}
        />
      ))}
    </div>
  );
};

// ── Individual competition section ──
const CompetitionSection: React.FC<{
  compName: string;
  data: { standings: CompetitionStandings | null; scorers: PlayerStat[]; assists: PlayerStat[] };
  userTeamId: number;
  myPlayerId: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ compName, data, userTeamId, myPlayerId, isExpanded, onToggle }) => {
  const [activeTab, setActiveTab] = useState<'scorers' | 'assists'>('scorers');
  const players = activeTab === 'scorers' ? data.scorers : data.assists;
  const statKey = activeTab === 'scorers' ? 'goals' : 'assists';
  const statColor = activeTab === 'scorers' ? 'text-amber-400' : 'text-blue-400';
  const hasStandings = data.standings && data.standings.teams.length > 0;

  // Get competition icon
  const getCompIcon = () => {
    if (compName.includes('Premier')) return '\u{1F3C6}';
    if (compName.includes('Conference')) return '\u{1F3EF}';
    if (compName.includes('Carabao') || compName.includes('League Cup')) return '\u{1F947}';
    return '\u{26BD}';
  };

  // Get user's position in current stat
  const userPlayer = players.find(p => p.playerid === myPlayerId);
  const leader = players[0];

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Competition header - clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getCompIcon()}</span>
          <div className="text-left">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">{compName}</h3>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-0.5">
              {data.scorers.length > 0 && <span>{data.scorers.length} scorers</span>}
              {data.assists.length > 0 && <span>{data.assists.length} playmakers</span>}
              {hasStandings && <span>{data.standings!.teams.length} teams</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userPlayer && (
            <div className="text-right mr-2">
              <div className="text-[9px] text-zinc-500 uppercase">You</div>
              <div className="text-sm font-bold text-amber-400">
                {userPlayer[statKey]} {statKey}
              </div>
            </div>
          )}
          <Shield className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''} text-zinc-500`} />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-zinc-800">
          {/* Stat tabs */}
          <div className="flex gap-2 p-4 pb-0">
            <button
              onClick={() => { audioEngine.playClick(); setActiveTab('scorers'); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'scorers'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              TOP SCORERS
            </button>
            <button
              onClick={() => { audioEngine.playClick(); setActiveTab('assists'); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'assists'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
              TOP ASSISTS
            </button>
          </div>

          {/* User's race card */}
          {leader && userPlayer && (
            <RaceCard
              leader={leader}
              userPlayer={userPlayer}
              statKey={statKey}
              statColor={statColor}
              activeTab={activeTab}
              compName={compName}
            />
          )}

          {/* Player list */}
          <div className="divide-y divide-zinc-800/50">
            {players.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">No data yet</div>
            ) : (
              players.slice(0, 20).map((player) => (
                <PlayerRow
                  key={player.playerid}
                  player={player}
                  statKey={statKey}
                  statColor={statColor}
                  activeTab={activeTab}
                  isUser={player.playerid === myPlayerId}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Race comparison card ──
const RaceCard: React.FC<{
  leader: PlayerStat;
  userPlayer: PlayerStat;
  statKey: 'goals' | 'assists';
  statColor: string;
  activeTab: 'scorers' | 'assists';
  compName: string;
}> = ({ leader, userPlayer, statKey, statColor, activeTab, compName }) => {
  const leaderStat = leader[statKey];
  const userStat = userPlayer[statKey];
  const gap = leaderStat - userStat;
  const progress = leaderStat > 0 ? Math.min(100, (userStat / leaderStat) * 100) : 0;
  const isUserLeading = userPlayer.rank === 1;

  return (
    <div className={`mx-4 my-3 rounded-xl p-4 border ${
      isUserLeading
        ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/40'
        : 'bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800 border-zinc-700'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        {isUserLeading ? <Trophy className="w-4 h-4 text-amber-400" /> : <TrendingUp className="w-4 h-4 text-zinc-400" />}
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {activeTab === 'scorers' ? 'GOLDEN BOOT' : 'PLAYMAKER'} — {compName}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-[9px] text-zinc-500 uppercase font-bold">Leader</div>
          <div className="text-sm font-black text-white truncate">{leader.playerName}</div>
          <div className={`text-lg font-black mt-0.5 ${statColor}`}>{leaderStat}</div>
        </div>
        <div className="flex flex-col items-center justify-center">
          {isUserLeading ? (
            <div className="text-xl font-black text-amber-400">#1</div>
          ) : (
            <>
              <div className="text-lg font-black text-red-400">-{gap}</div>
              <div className="text-[9px] text-zinc-500">to close</div>
            </>
          )}
        </div>
        <div className="text-center">
          <div className="text-[9px] text-zinc-500 uppercase font-bold">You</div>
          <div className="text-sm font-black text-amber-300">#{userPlayer.rank}</div>
          <div className={`text-lg font-black mt-0.5 ${statColor}`}>{userStat}</div>
        </div>
      </div>
      {!isUserLeading && (
        <div className="mt-2">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
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
};

// ── Player row ──
const PlayerRow: React.FC<{
  player: PlayerStat;
  statKey: 'goals' | 'assists';
  statColor: string;
  activeTab: 'scorers' | 'assists';
  isUser: boolean;
}> = ({ player, statKey, statColor, activeTab, isUser }) => {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/30 transition-colors ${
      isUser ? 'bg-amber-500/10' : ''
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
          player.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
          player.rank <= 3 ? 'bg-amber-500/20 text-amber-400' :
          player.rank <= 10 ? 'bg-zinc-700 text-zinc-300' :
          'bg-zinc-800 text-zinc-500'
        }`}>
          {player.rank}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-semibold ${isUser ? 'text-amber-300' : 'text-white'}`}>
              {player.playerName || `Player ${player.playerid}`}
            </span>
            {isUser && (
              <span className="px-1 py-0.5 bg-amber-500/20 text-amber-400 text-[7px] font-bold rounded">YOU</span>
            )}
          </div>
          <div className="text-[10px] text-zinc-500">
            {player.teamname} \u2022 {player.apps} apps
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-[8px] text-zinc-500 uppercase">{activeTab === 'scorers' ? 'G' : 'A'}</div>
          <div className={`text-sm font-bold ${player[statKey] > 0 ? statColor : 'text-zinc-500'}`}>
            {player[statKey]}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-zinc-500 uppercase">{activeTab === 'scorers' ? 'A' : 'G'}</div>
          <div className={`text-sm font-bold ${player[activeTab === 'scorers' ? 'assists' : 'goals'] > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>
            {player[activeTab === 'scorers' ? 'assists' : 'goals']}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-zinc-500 uppercase">MOTM</div>
          <div className={`text-sm font-bold ${player.motm > 0 ? 'text-purple-400' : 'text-zinc-500'}`}>
            {player.motm}
          </div>
        </div>
      </div>
    </div>
  );
};
