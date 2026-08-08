import llmContextData from '../data/llm_context.json';

const LLM_BASE_URL = 'http://localhost:8080';

interface LLMResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

export interface FanReaction {
  name: string;
  handle: string;
  flag: string;
  text: string;
  likes: number;
  shares: number;
}

// ============================================
// Likes/Shares = Pure frontend math from HoF
// ============================================
function calculateEngagement(hofPoints: number): { baseLikes: number; baseShares: number } {
  if (hofPoints >= 500) return { baseLikes: 4200, baseShares: 380 };
  if (hofPoints >= 300) return { baseLikes: 3200, baseShares: 290 };
  if (hofPoints >= 200) return { baseLikes: 2400, baseShares: 210 };
  if (hofPoints >= 150) return { baseLikes: 1800, baseShares: 160 };
  if (hofPoints >= 100) return { baseLikes: 1200, baseShares: 100 };
  if (hofPoints >= 51)  return { baseLikes: 700,  baseShares: 60 };
  if (hofPoints >= 20)  return { baseLikes: 400,  baseShares: 35 };
  return { baseLikes: 200, baseShares: 18 };
}

function jitter(value: number, range: number): number {
  return Math.floor(value + (Math.random() * range * 2 - range));
}

// ============================================
// AI Comment Generation
// ============================================
const FAN_PERSONAS = [
  { name: 'Marco T.',     handle: '@MarcoT_Football',   flag: '🇮🇹' },
  { name: 'Liam O\'Brien', handle: '@LiamOB_analyst',    flag: '🇮🇪' },
  { name: 'Carlos Mendoza',handle: '@CarlosM Tactics',   flag: '🇪🇸' },
  { name: 'Jean-Pierre D.',handle: '@JPD_Football',      flag: '🇫🇷' },
  { name: 'Tommy Wright',  handle: '@TommyW_Underdogs',  flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
];

export async function generateFanReactions(
  postContent: string,
  hofPoints: number
): Promise<FanReaction[]> {
  const { baseLikes, baseShares } = calculateEngagement(hofPoints);
  const context = llmContextData as any;
  const user = context.user_player || {};
  const elite = context.elite_players || [];
  const topScorers = context.top_scorers || {};

  // Build real stats block for the LLM
  const userStats = [
    `Name: ${user.name || 'Unknown'}`,
    `Team: ${user.team || 'Unknown'}`,
    `Position: ${user.position || 'Unknown'}`,
    `Overall: ${user.overall || '??'} OVR`,
    `Goals: ${user.goals ?? 0}`,
    `Assists: ${user.assists ?? 0}`,
    `Appearances: ${user.appearances ?? 0}`,
    `Avg Rating: ${user.avgRating || '??'}`,
    `Age: ${user.age ?? '??'}`,
  ].join(' | ');

  const eliteBlock = elite.slice(0, 10).map((p: any) =>
    `- ${p.name}: ${p.position}, ${p.overall} OVR, ${p.team}, ${p.goals ?? 0}G ${p.assists ?? 0}A`
  ).join('\n');

  const scorersBlock = Object.entries(topScorers).slice(0, 3).map(([league, players]: [string, any]) =>
    `Top scorers (${league}):\n${(players || []).slice(0, 5).map((p: any) => `  ${p.name}: ${p.goals ?? 0} goals`).join('\n')}`
  ).join('\n');

  const prompt = `You are generating social media comments from 5 different football fans reacting to a player's post. Use the REAL data below to make comments that reference actual stats. Be brutal and honest — fans do not hold back.

PLAYER POSTING: ${userStats}

ELITE PLAYERS IN THE GAME:
${eliteBlock}

${scorersBlock}

POST CONTENT: "${postContent}"

Generate 5 comments. Each comment MUST reference at least one real stat from the data above. If the post is delusional (e.g. comparing himself to Messi), fans should call him out using his actual stats. If the post is impressive, fans should hype him up with real numbers.

Return ONLY a JSON array of 5 objects:
[
  { "text": "comment under 25 words referencing a real stat" },
  { "text": "comment under 25 words referencing a real stat" },
  { "text": "comment under 25 words referencing a real stat" },
  { "text": "comment under 25 words referencing a real stat" },
  { "text": "comment under 25 words referencing a real stat" }
]

JSON array:`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

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
      return parsed.map((item: any, i: number) => ({
        name: FAN_PERSONAS[i].name,
        handle: FAN_PERSONAS[i].handle,
        flag: FAN_PERSONAS[i].flag,
        text: item.text || 'Great post!',
        likes: jitter(baseLikes, Math.floor(baseLikes * 0.15)),
        shares: jitter(baseShares, Math.floor(baseShares * 0.15)),
      }));
    }
  } catch (e) {
    console.log('[FanReactions] LLM unavailable, using stat-based fallback');
  }

  // Stat-aware fallback when LLM is offline
  return getStatBasedFallback(postContent, user, elite, baseLikes, baseShares);
}

function getStatBasedFallback(
  post: string,
  user: any,
  elite: any[],
  baseLikes: number,
  baseShares: number
): FanReaction[] {
  const name = user.name || 'this guy';
  const goals = user.goals ?? 0;
  const assists = user.assists ?? 0;
  const ovr = user.overall ?? 65;
  const team = user.team || 'Spezia';
  const age = user.age ?? 14;

  const postLower = post.toLowerCase();

  // Detect who they're comparing themselves to
  const mentionedLegends: string[] = [];
  if (postLower.includes('messi')) mentionedLegends.push('Messi');
  if (postLower.includes('ronaldo') || postLower.includes('cr7')) mentionedLegends.push('Ronaldo');
  if (postLower.includes('haaland')) mentionedLegends.push('Haaland');
  if (postLower.includes('mbappe') || postLower.includes('mbappé')) mentionedLegends.push('Mbappé');
  if (postLower.includes('neymar')) mentionedLegends.push('Neymar');
  if (postLower.includes('henry')) mentionedLegends.push('Henry');
  if (postLower.includes('zidane')) mentionedLegends.push('Zidane');
  if (postLower.includes('pirlo')) mentionedLegends.push('Pirlo');

  // Check if comparing to someone specific
  const isComparison = mentionedLegends.length > 0 ||
    postLower.includes('better than') || postLower.includes('goat') ||
    postLower.includes('best ever') || postLower.includes('greatest');

  // Find the matched elite player stats from DB
  const findLegend = (searchName: string) =>
    elite.find(p => p.name.toLowerCase().includes(searchName.toLowerCase())) || null;

  if (isComparison && mentionedLegends.length > 0) {
    // Build comments that reference the ACTUAL legend mentioned
    const legendName = mentionedLegends[0];
    const legendStats = findLegend(legendName);

    const legendFacts: Record<string, string[]> = {
      'Messi': [
        `${name} has ${goals} goals. Messi scored 91 in ONE year. Different species.`,
        `${assists} assists is cute. Messi has 8 Ballon d'Ors and 4 Champions Leagues. Sit down.`,
        `${ovr} OVR at ${team}? Messi won his first Ballon d'Or at 22. You're not close.`,
        `Bro said better than Messi with ${goals} career goals. The audacity.`,
        `Messi has 800+ career goals. ${name} has ${goals}. Math isn't mathing.`,
      ],
      'Ronaldo': [
        `${name} has ${goals} goals. Ronaldo has 900+. The gap is OCEANIC.`,
        `${assists} assists vs Ronaldo's 200+ Champions League goals. Delete this.`,
        `${ovr} OVR at ${team}. Ronaldo was at Manchester United winning Ballon d'Ors at this age.`,
        `${goals} goals and you're comparing to CR7? Ronaldo would eat you alive.`,
        `Ronaldo has 5 UCL titles, 5 Ballon d'Ors. ${name} has ${goals} goals. Log off.`,
      ],
      'Haaland': [
        `${name} has ${goals} goals. Haaland scored 52 in his debut season. Pipe down.`,
        `${assists} assists? Haaland has more goals than that in HALF a season.`,
        `${ovr} OVR at ${team}. Haaland was already at Dortmund dominating at your age.`,
        `${goals}G ${assists}A vs Haaland's 52 goals in 2022/23. Not the same tier.`,
        `Haaland broke the PL scoring record in year one. ${name} plays for Spezia. Be real.`,
      ],
      'Mbappé': [
        `${name} has ${goals} goals. Mbappé has a World Cup winner's medal. Pipe down.`,
        `${assists} assists is nothing when Mbappé has 200+ career goals already.`,
        `${ovr} OVR at ${team}. Mbappé was at Monaco tearing up the league at your age.`,
        `${goals} goals vs Mbappé's 250+ career goals. Different stratosphere.`,
        `Mbappé won a World Cup at 19. ${name} plays in Serie A. Not comparable.`,
      ],
    };

    // Use legend-specific comments if we have them, otherwise generic
    const comments = legendFacts[legendName] || [
      `${name} has ${goals} goals. ${legendName} has way more than that. Know your place.`,
      `${assists} assists is good but ${legendName} is a different level entirely.`,
      `${ovr} OVR at ${team} and you're comparing yourself to ${legendName}? Be humble.`,
      `${goals}G ${assists}A and you think you're better than ${legendName}? The stats say otherwise.`,
      `${legendName} has accomplished more by age 20 than ${name} will in his career. Facts.`,
    ];

    return comments.map((text, i) => ({
      name: FAN_PERSONAS[i].name,
      handle: FAN_PERSONAS[i].handle,
      flag: FAN_PERSONAS[i].flag,
      text,
      likes: jitter(baseLikes, Math.floor(baseLikes * 0.15)),
      shares: jitter(baseShares, Math.floor(baseShares * 0.15)),
    }));
  }

  // Non-comparison post: hype with real stats
  const hypeComments = [
    `${goals} goals and ${assists} assists at ${age} years old. This kid is something special.`,
    `${name} at ${ovr} OVR doing this at ${team}. Give this man his flowers.`,
    `${assists} assists — name another youngster with better output. I will wait.`,
    `The ${team} fans are witnessing history. ${name} is the real deal.`,
    `${age} years old with ${goals}G ${assists}A. The ceiling is SCARY.`,
  ];

  return hypeComments.map((text, i) => ({
    name: FAN_PERSONAS[i].name,
    handle: FAN_PERSONAS[i].handle,
    flag: FAN_PERSONAS[i].flag,
    text,
    likes: jitter(baseLikes, Math.floor(baseLikes * 0.15)),
    shares: jitter(baseShares, Math.floor(baseShares * 0.15)),
  }));
}
