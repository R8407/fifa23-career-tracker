import llmContextData from '../data/llm_context.json';

export interface PlayerContextEntry {
  name: string;
  position: string;
  overall: number;
  team: string;
  goals: number;
  assists: number;
  appearances: number;
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
}

export function buildPlayerContext(): PlayerContext {
  const data = llmContextData as any;

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
  };
}

export function formatPlayerContextForLLM(context: PlayerContext): string {
  const lines: string[] = [];

  lines.push(`## YOUR PLAYER (${context.userPlayer.name})`);
  lines.push(`Team: ${context.userPlayer.team} | Position: ${context.userPlayer.position} | Age: ${context.userPlayer.age}`);
  lines.push(`Overall: ${context.userPlayer.overall} OVR | Avg Rating: ${context.userPlayer.avgRating}`);
  lines.push(`Season: ${context.userPlayer.goals} goals, ${context.userPlayer.assists} assists in ${context.userPlayer.appearances} apps`);
  lines.push('');

  lines.push('## TOP PLAYERS (86+ rated)');
  context.elitePlayers.slice(0, 15).forEach(p => {
    lines.push(`- ${p.name} (${p.position}, ${p.overall} OVR, ${p.team}) - ${p.goals}G ${p.assists}A`);
  });
  lines.push('');

  lines.push('## TOP SCORERS BY LEAGUE');
  Object.entries(context.topScorers).forEach(([league, players]) => {
    lines.push(`### ${league}`);
    players.slice(0, 3).forEach(p => {
      lines.push(`- ${p.name} (${p.overall} OVR, ${p.team}) - ${p.goals} goals`);
    });
  });

  return lines.join('\n');
}
