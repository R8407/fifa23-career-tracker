import llmContextData from '../data/llm_context.json';
import { FIFA_NATIONALITY_MAP } from './dataAdapter';

const LLM_BASE_URL = '/llm-api';

interface LLMResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

export interface PunditCard {
  id: string;
  pundit: string;
  network: string;
  flag: string;
  role: string;
  headline: string;
  detail: string;
  gradient: string;
  priority: 'high' | 'medium';
}

export interface FanComment {
  name: string;
  handle: string;
  flag: string;
  text: string;
}

const PUNDITS = [
  { name: 'Thierry Henry', network: 'CBS Sports', flag: '\u{1F1EB}\u{1F1F7}', role: 'Analyst' },
  { name: 'Jamie Carragher', network: 'CBS Sports', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'Pundit' },
  { name: 'Micah Richards', network: 'CBS Sports', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'Pundit' },
  { name: 'Gary Neville', network: 'Sky Sports', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'Pundit' },
  { name: 'Peter Schmeichel', network: 'CBS Sports', flag: '\u{1F1E9}\u{E0067}', role: 'Analyst' },
  { name: 'Alex Scott', network: 'BBC', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'Pundit' },
  { name: 'Rio Ferdinand', network: 'TNT Sports', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', role: 'Pundit' },
  { name: 'Patrice Evra', network: 'CBS Sports', flag: '\u{1F1EB}\u{E0067}', role: 'Pundit' },
];

const FAN_PERSONAS = [
  { name: 'Marco T.', handle: '@MarcoT_Football', flag: '\u{1F1EE}\u{E0067}' },
  { name: 'Liam O\'Brien', handle: '@LiamOB_analyst', flag: '\u{1F1EE}\u{E0067}' },
];

const GRADIENTS: Record<string, string> = {
  high: 'from-red-900 via-amber-800 to-red-900',
  medium: 'from-blue-900 via-indigo-800 to-blue-900',
  milestone: 'from-amber-900 via-yellow-800 to-amber-900',
  legend: 'from-purple-900 via-pink-800 to-purple-900',
  record: 'from-emerald-900 via-green-800 to-emerald-900',
  default: 'from-zinc-800 via-zinc-700 to-zinc-800',
};

const LEGEND_RECORDS = [
  'Cristiano Ronaldo: 5 UCLs, 5 Ballon dOrs, 130 intl goals, 217 caps',
  'Lionel Messi: 4 UCLs, 8 Ballon dOrs, 108 intl goals, 187 caps',
  'Kylian Mbappe: 1 UCL, World Cup 2018 winner, 48 intl goals',
  'Erling Haaland: 1 UCL, 2 PL titles, 32 intl goals',
  'Thierry Henry: 1 UCL, 2 PL titles, World Cup 1998, 51 intl goals',
  'Paolo Maldini: 5 UCLs, 7 Serie A titles, 126 caps',
  'Andrea Pirlo: 2 UCLs, 6 Serie A, World Cup 2010',
  'Zinedine Zidane: 1 UCL, 1 Ballon dOr, World Cup 1998',
];

function buildPlayerStatsBlock(data: any): string {
  const profile = data.my_player_profile || {};
  const goals = data.total_goals || 0;
  const assists = data.total_assists || 0;
  const apps = data.total_appearances || 0;
  const ovr = parseInt(profile.overallrating || '0');
  const pot = parseInt(profile.potential || '0');
  const seasons = data.seasons || [];
  const playerName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Unknown';
  const motmTotal = seasons.reduce((sum: number, s: any) => sum + (s.motm || 0), 0);
  const avgRating = seasons.length > 0
    ? (seasons.reduce((sum: number, s: any) => sum + (parseFloat(s.avgRating) || 0), 0) / seasons.length).toFixed(2)
    : '0.00';
  const latestSeason = seasons.length > 0 ? seasons[seasons.length - 1] : null;
  const seasonGoals = latestSeason ? (latestSeason.goals || 0) : 0;
  const seasonAssists = latestSeason ? (latestSeason.assists || 0) : 0;
  const team = profile.currentClub || 'Unknown';
  const nationality = FIFA_NATIONALITY_MAP[profile.nationality?.toString() || '']?.name || profile.nationality || 'Unknown';

  return `PLAYER: ${playerName}
TEAM: ${team} | NATIONALITY: ${nationality}
CAREER: ${goals} goals, ${assists} assists in ${apps} appearances
SEASON: ${seasonGoals} goals, ${seasonAssists} assists
OVR: ${ovr} | POTENTIAL: ${pot}
MOTM: ${motmTotal} | AVG RATING: ${avgRating}`;
}

export async function generateLLMPunditCards(data: any): Promise<PunditCard[]> {
  const statsBlock = buildPlayerStatsBlock(data);
  const legendsBlock = LEGEND_RECORDS.join('\n');

  const prompt = `You are generating 4 football pundit hot-take cards for a news ticker. Each pundit has a distinct personality and network.

PLAYER STATS:
${statsBlock}

LEGEND BENCHMARKS:
${legendsBlock}

Generate 4 unique pundit takes. Each MUST reference real stats from the data. Be bold, opinionated, and specific. Use ALL CAPS for headlines.

Return ONLY a JSON array:
[
  {
    "pundit": "pundit name from the list below",
    "headline": "ALL CAPS headline under 12 words referencing real stats",
    "detail": "2 sentence analysis under 30 words with specific numbers",
    "priority": "high" or "medium"
  }
]

Available pundits: Thierry Henry (CBS Sports, Analyst), Jamie Carragher (CBS Sports, Pundit), Micah Richards (CBS Sports, Pundit), Gary Neville (Sky Sports, Pundit), Peter Schmeichel (CBS Sports, Analyst), Alex Scott (BBC, Pundit), Rio Ferdinand (TNT Sports, Pundit), Patrice Evra (CBS Sports, Pundit)

JSON array:`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 500,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('LLM request failed');
    const data2: LLMResponse = await res.json();
    let content = data2.choices[0]?.message?.content || '';

    content = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/<\|[^|]*\|>/g, '')
      .trim();

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const gradients = Object.values(GRADIENTS);
      return parsed.map((item: any, i: number) => {
        const p = PUNDITS.find(p => p.name === item.pundit) || PUNDITS[i % PUNDITS.length];
        return {
          id: `llm-pundit-${i}`,
          pundit: p.name,
          network: p.network,
          flag: p.flag,
          role: p.role,
          headline: item.headline || 'BREAKING NEWS',
          detail: item.detail || 'Big developments in the career.',
          gradient: gradients[i % gradients.length],
          priority: item.priority === 'high' ? 'high' as const : 'medium' as const,
        };
      });
    }
  } catch (e) {
    console.log('[NewsLlm] Pundit LLM unavailable, using fallback');
  }

  return [];
}

export async function generateLLMFanComments(headline: string, details: string): Promise<FanComment[]> {
  const context = llmContextData as any;
  const user = context.user_player || {};

  // Detect if news is negative or positive
  const negativeKeywords = ['drop', 'concern', 'fail', 'loss', 'injury', 'crisis', 'worst', 'decline', 'struggle', 'poor', 'bad'];
  const isNegative = negativeKeywords.some(kw => headline.toLowerCase().includes(kw) || details.toLowerCase().includes(kw));

  const prompt = `You are generating 2 fan comments reacting to a football news headline. Be authentic, varied, and reference real stats.

PLAYER: ${user.name || 'Unknown'} | ${user.team || 'Unknown'} | ${user.position || 'Unknown'} | ${user.overall || 0} OVR
STATS: ${user.goals ?? 0} goals, ${user.assists ?? 0} assists in ${user.appearances ?? 0} apps

NEWS: "${headline}"
DETAILS: "${details}"

${isNegative 
  ? 'This is NEGATIVE news. Generate 2 comments: 1 negative/critical fan and 1 encouraging/defensive fan defending the player. Mix criticism with support.'
  : 'This is POSITIVE news. Generate 2 comments: 1 hyped/excited fan and 1 analytical fan providing context. Be celebratory.'}

Under 20 words each. Reference real stats when possible.

Return ONLY a JSON array:
[
  { "text": "comment under 20 words" },
  { "text": "comment under 20 words" }
]

JSON array:`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 300,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('LLM request failed');
    const data: LLMResponse = await res.json();
    let content = data.choices[0]?.message?.content || '';

    content = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/<\|[^|]*\|>/g, '')
      .trim();

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any, i: number) => {
        let text = item.text || 'Great take!';
        text = text.replace(/^(Marco T|Liam O'Brien|Carlos Mendoza|Jean-Pierre D|Tommy Wright)\s*[:]\s*/i, '');
        return {
          name: FAN_PERSONAS[i % FAN_PERSONAS.length].name,
          handle: FAN_PERSONAS[i % FAN_PERSONAS.length].handle,
          flag: FAN_PERSONAS[i % FAN_PERSONAS.length].flag,
          text,
        };
      });
    }
  } catch (e) {
    console.log('[NewsLlm] Fan comment LLM unavailable, using fallback');
  }

  return [];
}

export function getStaticFanComments(): FanComment[] {
  return [
    { name: 'Marco T.', handle: '@MarcoT_Football', flag: '\u{1F1EE}\u{E0067}', text: 'This guy is the REAL DEAL!' },
    { name: 'Liam O\'Brien', handle: '@LiamOB_analyst', flag: '\u{1F1EE}\u{E0067}', text: 'Best young player in the world right now!' },
  ];
}
