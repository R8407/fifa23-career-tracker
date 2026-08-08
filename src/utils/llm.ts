import { buildPlayerContext } from './playerContext';

const LLM_BASE_URL = '/llm-api';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Legend career facts - REAL-WORLD data (not from career DB)
const LEGEND_CAREERS: Record<string, {
  titles: string[], ucl: number, ballon: number, clubs: string[],
  caps?: number, goals?: number, nationality: string, position: string
}> = {
  cristiano_ronaldo: { titles: ['5x UCL', '7x League', '5x Ballon d\'Or', 'Euro 2016'], ucl: 5, ballon: 5, clubs: ['Sporting', 'Man United', 'Real Madrid', 'Juventus', 'Al Nassr'], caps: 217, goals: 130, nationality: 'Portugal', position: 'ST' },
  lionel_messi: { titles: ['4x UCL', '12x La Liga', '8x Ballon d\'Or', 'World Cup 2022'], ucl: 4, ballon: 8, clubs: ['Barcelona', 'PSG', 'Inter Miami'], caps: 187, goals: 108, nationality: 'Argentina', position: 'RW' },
  kylian_mbappe: { titles: ['1x UCL', '6x Ligue 1', 'World Cup 2018'], ucl: 1, ballon: 0, clubs: ['Monaco', 'PSG', 'Real Madrid'], caps: 80, goals: 48, nationality: 'France', position: 'ST' },
  erling_haaland: { titles: ['1x UCL', '2x PL', '1x Bundesliga'], ucl: 1, ballon: 0, clubs: ['Salzburg', 'Dortmund', 'Man City'], caps: 30, goals: 32, nationality: 'Norway', position: 'ST' },
  jude_bellingham: { titles: ['1x UCL', '1x La Liga', '1x Bundesliga'], ucl: 1, ballon: 0, clubs: ['Birmingham', 'Dortmund', 'Real Madrid'], caps: 40, goals: 6, nationality: 'England', position: 'CAM' },
  sergio_ramos: { titles: ['4x UCL', '5x La Liga', '2x Euro', '1x World Cup'], ucl: 4, ballon: 0, clubs: ['Sevilla', 'Real Madrid', 'PSG'], caps: 180, goals: 23, nationality: 'Spain', position: 'CB' },
  thierry_henry: { titles: ['1x UCL', '2x PL', '1x La Liga', 'World Cup 1998'], ucl: 1, ballon: 0, clubs: ['Monaco', 'Juventus', 'Arsenal', 'Barcelona'], caps: 123, goals: 51, nationality: 'France', position: 'ST' },
  ronaldinho: { titles: ['1x UCL', '2x La Liga', '1x Ballon d\'Or', 'World Cup 2002'], ucl: 1, ballon: 1, clubs: ['PSG', 'Barcelona', 'AC Milan'], caps: 97, goals: 33, nationality: 'Brazil', position: 'RW' },
  andrea_pirlo: { titles: ['2x UCL', '6x Serie A', '1x World Cup'], ucl: 2, ballon: 0, clubs: ['Brescia', 'Inter', 'AC Milan', 'Juventus'], caps: 116, goals: 13, nationality: 'Italy', position: 'CM' },
  zinedine_zidane: { titles: ['1x UCL', '1x La Liga', '2x Serie A', '1x Ballon d\'Or', 'World Cup 1998'], ucl: 1, ballon: 1, clubs: ['Bordeaux', 'Juventus', 'Real Madrid'], caps: 108, goals: 31, nationality: 'France', position: 'CAM' },
  paolo_maldini: { titles: ['5x UCL', '7x Serie A'], ucl: 5, ballon: 0, clubs: ['AC Milan'], caps: 126, goals: 7, nationality: 'Italy', position: 'CB' },
  xavi: { titles: ['4x UCL', '8x La Liga', 'World Cup 2010', 'Euro 2008', 'Euro 2012'], ucl: 4, ballon: 0, clubs: ['Barcelona', 'Al Sadd'], caps: 133, goals: 13, nationality: 'Spain', position: 'CM' },
  gary_lineker: { titles: ['1x FA Cup', '1x Copa del Rey', 'WC 1990 Golden Boot'], ucl: 0, ballon: 0, clubs: ['Leicester', 'Everton', 'Barcelona', 'Tottenham'], caps: 80, goals: 48, nationality: 'England', position: 'ST' },
  rio_ferdinand: { titles: ['1x UCL', '6x Premier League'], ucl: 1, ballon: 0, clubs: ['West Ham', 'Leeds', 'Man United', 'QPR'], caps: 81, goals: 3, nationality: 'England', position: 'CB' },
  david_brooks: { titles: [], ucl: 0, ballon: 0, clubs: ['Sheffield United', 'Bournemouth', 'Hibernian'], caps: 15, goals: 2, nationality: 'Wales', position: 'RW' },
  jorge_mendes: { titles: [], ucl: 0, ballon: 0, clubs: [], nationality: 'Portugal', position: 'Agent' },
  your_coach: { titles: [], ucl: 0, ballon: 0, clubs: [], nationality: 'Italy', position: 'Manager' },
};

function findCareer(senderName: string) {
  const senderLower = senderName.toLowerCase();
  for (const [id, data] of Object.entries(LEGEND_CAREERS)) {
    const nameParts = id.split('_').join(' ');
    if (senderLower.includes(nameParts) || nameParts.includes(senderLower)) {
      return { id, ...data };
    }
  }
  return null;
}

// Build focused context for LLM
function buildFocusedContext(context: ReturnType<typeof buildPlayerContext>, senderName: string): string {
  const lines: string[] = [];
  const career = findCareer(senderName);

  // 1. User player info (compact)
  lines.push(`Player: ${context.userPlayer.name}, ${context.userPlayer.team}, ${context.userPlayer.position}, ${context.userPlayer.overall} OVR, age ${context.userPlayer.age}`);
  lines.push(`Stats: ${context.userPlayer.goals}G ${context.userPlayer.assists}A in ${context.userPlayer.appearances} apps, avg ${context.userPlayer.avgRating}`);

  // 2. Legend's own career (compact)
  if (career) {
    lines.push(`${senderName}: ${career.position}, ${career.nationality}, UCL:${career.ucl}, Ballon d'Or:${career.ballon}, clubs: ${career.clubs.slice(0, 3).join(', ')}`);
  }

  // 3. Top players (compact, only 5)
  lines.push('Top players:');
  context.elitePlayers.slice(0, 5).forEach(p => {
    lines.push(`- ${p.name} (${p.overall} OVR, ${p.team}) ${p.goals}G ${p.assists}A`);
  });

  return lines.join('\n');
}

// ============================================
// Exported Functions
// ============================================
export async function isLLMAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${LLM_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateDMReply(
  senderName: string,
  senderRole: string,
  originalMessage: string,
  playerReply: string,
  playerData: {
    name: string;
    ovr: number;
    goals: number;
    assists: number;
    avgRating: string;
    motm: number;
    club: string;
    age: number;
  },
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  personalityToken?: string
): Promise<string> {
  const context = buildPlayerContext();
  const focusedDB = buildFocusedContext(context, senderName);

  // Get persona from token
  const persona = personalityToken
    ? personalityToken.split('\n').filter((l: string) => l.trim()).slice(0, 3).join(' ')
    : `You are ${senderName}.`;

  const systemPrompt = `You are ${senderName}. Reply naturally in under 30 words. Use 1 emoji.`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'assistant', content: originalMessage },
    { role: 'user', content: `${playerReply}\n\nContext: ${focusedDB}` },
  ];

  if (chatHistory) {
    for (const msg of chatHistory.slice(-3)) {
      messages.splice(-1, 0, { role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3',
        messages,
        temperature: 0.7,
        max_tokens: 150,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('LLM request failed');
    const data: LLMResponse = await res.json();
    let content = data.choices[0]?.message?.content || getFallbackReply(senderRole);

    // Aggressive cleaning of Phi-3-mini output
    content = content
      // Remove special tokens
      .replace(/<\|assistant\|>/g, '')
      .replace(/<\|end\|>/g, '')
      .replace(/<\|user\|>/g, '')
      .replace(/<\|system\|>/g, '')
      .replace(/\|/g, '')
      // Remove answer prefixes
      .replace(/^-+\s*answer:?.*$/gm, '')
      // Remove meta-text Phi-3 likes to add
      .split(/\(Note:/i)[0]
      .split(/As\s+(Cristiano|Lionel|Rio|Gary|Thierry|Ronaldinho|Andrea|Zinedine|Paolo|Xavi|Kylian|Erling|Jude|Sergio|Jorge|David)/i)[0]
      // Remove everything after system prompt markers
      .split(/##\s*DATABASE/i)[0]
      .split(/##\s*YOUR PLAYER/i)[0]
      .split(/##\s*YOUR CAREER/i)[0]
      .split(/##\s*TOP PLAYERS/i)[0]
      .split(/##\s*RULES/i)[0]
      .split(/---------EXAMPLE---------/i)[0]
      .split(/-----------EXAMPLE-----------/i)[0]
      // Remove any remaining markdown headers
      .replace(/^##.*$/gm, '')
      // Clean up
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // If response is too short or empty, use fallback
    if (content.length < 5) {
      return getFallbackReply(senderRole);
    }

    return content;
  } catch {
    return getFallbackReply(senderRole);
  }
}

function getFallbackReply(role: string): string {
  const replies: Record<string, string[]> = {
    legend: [
      'Keep working hard. The best is yet to come ⚽🔥',
      'I see something special in you 💪',
      'Focus on what you can control 🎯',
      'The grind never stops. Keep going 🏆',
      'Trust the process, young king 👑',
    ],
    agent: [
      'Your value is increasing with every game 💰',
      'We have options on the table 📋',
      'Focus on your performances ⚽',
      'Big moves coming. Stay ready 🔥',
    ],
    coach: [
      'Good attitude. Keep this up 💪',
      'Stay focused and disciplined 🎯',
      'I am pleased with your development ⚽',
      'You are growing every day. Proud of you 🙌',
    ],
  };
  const options = replies[role] || replies.legend;
  return options[Math.floor(Math.random() * options.length)];
}
