import llmContextData from '../data/llm_context.json';
import careerExportData from '../data/career_export.json';

export interface PlayerContextEntry {
  name: string;
  position: string;
  overall: number;
  team: string;
  goals: number;
  assists: number;
  appearances: number;
}

export interface LeaguePlayerStat {
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

export interface LeagueStanding {
  position: number;
  teamid: number;
  teamname: string;
  apps: number;
  goals: number;
  goalDifference: number;
  points: number;
}

export interface PlayerContext {
  userPlayer: {
    name: string;
    team: string;
    position: string;
    overall: number;
    potential: number;
    age: number;
    goals: number;
    assists: number;
    appearances: number;
    avgRating: number;
  };
  elitePlayers: PlayerContextEntry[];
  topScorers: Record<string, PlayerContextEntry[]>;
  leagueStats: {
    topScorers: LeaguePlayerStat[];
    topAssists: LeaguePlayerStat[];
    standings: LeagueStanding[];
  };
}

export function buildPlayerContext(): PlayerContext {
  const data = llmContextData as any;
  const careerData = careerExportData as any;
  const leagueStats = careerData?.league_stats || {};

  return {
    userPlayer: data.user_player || {
      name: 'Unknown',
      team: 'Unknown',
      position: 'MF',
      overall: 70,
      potential: 75,
      age: 16,
      goals: 0,
      assists: 0,
      appearances: 0,
      avgRating: 0,
    },
    elitePlayers: (data.elite_players || []).map((p: any) => ({
      name: p.name || 'Unknown',
      position: p.position || 'ST',
      overall: p.overall || 85,
      team: p.team || 'Unknown',
      goals: p.goals || 0,
      assists: p.assists || 0,
      appearances: p.appearances || 0,
    })),
    topScorers: data.top_scorers || {},
    leagueStats: {
      topScorers: leagueStats.topScorers || [],
      topAssists: leagueStats.topAssists || [],
      standings: leagueStats.competitions?.[0]?.teams || [],
    },
  };
}

export function formatPlayerContextForLLM(context: PlayerContext): string {
  const lines: string[] = [];

  lines.push(`## YOUR PLAYER (${context.userPlayer.name})`);
  lines.push(`Team: ${context.userPlayer.team} | Position: ${context.userPlayer.position} | Age: ${context.userPlayer.age}`);
  lines.push(`Overall: ${context.userPlayer.overall} OVR | Avg Rating: ${context.userPlayer.avgRating}`);
  lines.push(`Season: ${context.userPlayer.goals} goals, ${context.userPlayer.assists} assists in ${context.userPlayer.appearances} apps`);
  lines.push('');

  // Real league standings
  if (context.leagueStats.standings.length > 0) {
    lines.push('## CURRENT LEAGUE STANDINGS (Top 10)');
    context.leagueStats.standings.slice(0, 10).forEach(t => {
      const userMarker = t.teamname === context.userPlayer.team ? ' (YOUR TEAM)' : '';
      lines.push(`${t.position}. ${t.teamname}${userMarker} - ${t.points}pts, GD:${t.goalDifference > 0 ? '+' : ''}${t.goalDifference}`);
    });
    lines.push('');
  }

  // Real top scorers
  if (context.leagueStats.topScorers.length > 0) {
    lines.push('## GOLDEN BOOT RACE (Top 5)');
    context.leagueStats.topScorers.slice(0, 5).forEach(p => {
      const userMarker = p.playerName === context.userPlayer.name ? ' (YOU)' : '';
      lines.push(`${p.rank}. ${p.playerName}${userMarker} (${p.teamname}) - ${p.goals} goals in ${p.apps} apps`);
    });
    lines.push('');
  }

  // Real top assists
  if (context.leagueStats.topAssists.length > 0) {
    lines.push('## ASSIST LEADERS (Top 5)');
    context.leagueStats.topAssists.slice(0, 5).forEach(p => {
      const userMarker = p.playerName === context.userPlayer.name ? ' (YOU)' : '';
      lines.push(`${p.rank}. ${p.playerName}${userMarker} (${p.teamname}) - ${p.assists} assists`);
    });
    lines.push('');
  }

  // Fallback: static elite players
  lines.push('## OTHER TOP PLAYERS');
  context.elitePlayers.slice(0, 5).forEach(p => {
    lines.push(`- ${p.name} (${p.position}, ${p.overall} OVR, ${p.team}) - ${p.goals}G ${p.assists}A`);
  });

  return lines.join('\n');
}
