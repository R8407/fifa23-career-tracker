import { getActiveCareerData } from './dataAdapter';
import { FIFA_POSITION_MAP } from './dataAdapter';

const LLM_BASE_URL = '/llm-api';

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
// HoF Legend Records - REAL data for the LLM
// ============================================
const LEGEND_RECORDS = [
  'Cristiano Ronaldo: 5 UCLs, 5 Ballon dOrs, 130 intl goals, 217 caps, clubs: Man United, Real Madrid, Juventus',
  'Lionel Messi: 4 UCLs, 8 Ballon dOrs, 108 intl goals, 187 caps, clubs: Barcelona, PSG',
  'Kylian Mbappe: 1 UCL, World Cup 2018 winner, 48 intl goals, 80 caps, clubs: Monaco, PSG, Real Madrid',
  'Erling Haaland: 1 UCL, 2 PL titles, 32 intl goals, 30 caps, clubs: Dortmund, Man City',
  'Jude Bellingham: 1 UCL, 1 La Liga, 6 intl goals, 40 caps, clubs: Dortmund, Real Madrid',
  'Thierry Henry: 1 UCL, 2 PL titles, World Cup 1998, 51 intl goals, 123 caps, clubs: Arsenal, Barcelona',
  'Ronaldinho: 1 UCL, 1 Ballon dOr, World Cup 2002, 33 intl goals, 97 caps, clubs: PSG, Barcelona',
  'Zinedine Zidane: 1 UCL, 1 Ballon dOr, World Cup 1998, 31 intl goals, 108 caps, clubs: Juventus, Real Madrid',
  'Paolo Maldini: 5 UCLs, 7 Serie A titles, 7 intl goals, 126 caps, only ever played for AC Milan',
  'Andrea Pirlo: 2 UCLs, 6 Serie A, World Cup 2010, 13 intl goals, 116 caps, clubs: AC Milan, Juventus',
  'Sergio Ramos: 4 UCLs, 2 Euro titles, World Cup 2010, 23 intl goals, 180 caps, clubs: Real Madrid, PSG',
  'Xavi: 4 UCLs, World Cup 2010, 13 intl goals, 133 caps, clubs: Barcelona',
  'Gary Lineker: WC 1990 Golden Boot, 48 intl goals, 80 caps, clubs: Barcelona, Tottenham',
  'Rio Ferdinand: 1 UCL, 6 PL titles, 3 intl goals, 81 caps, clubs: Man United, Leeds',
];

// ============================================
// Fan Personas - 6 total
// ============================================
const FAN_PERSONAS = [
  { name: 'Marco T.',      handle: '@MarcoT_Football',   flag: '🇮🇹', type: 'hype' },
  { name: 'Liam O\'Brien',  handle: '@LiamOB_analyst',    flag: '🇮🇪', type: 'analyst' },
  { name: 'Carlos Mendoza', handle: '@CarlosM_Tactics',   flag: '🇪🇸', type: 'tactical' },
  { name: 'Jean-Pierre D.', handle: '@JPD_Football',      flag: '🇫🇷', type: 'elegant' },
  { name: 'Tommy Wright',   handle: '@TommyW_Underdogs',  flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', type: 'underdog' },
  { name: 'Kai_H8R',        handle: '@Kai_H8R',           flag: '🇵🇹', type: 'hater' },
];

// ============================================
// Get current player data from career_export.json
// ============================================
function getCurrentPlayerData() {
  const data = getActiveCareerData() as any;
  const profile = data.my_player_profile || {};
  const seasons = data.seasons || [];
  const latestSeason = seasons.length > 0 ? seasons[seasons.length - 1] : null;

  return {
    name: `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || 'Unknown',
    team: profile.currentClub || 'Unknown',
    position: profile.preferredposition1 ? (FIFA_POSITION_MAP[profile.preferredposition1] || 'CM') : 'CM',
    overall: parseInt(profile.overallrating || '0'),
    goals: latestSeason?.goals || 0,
    assists: latestSeason?.assists || 0,
    appearances: latestSeason?.apps || 0,
    age: latestSeason?.age || 0,
    totalGoals: data.total_goals || 0,
    totalAssists: data.total_assists || 0,
    totalApps: data.total_appearances || 0,
    season: latestSeason?.season || 'Current',
    motm: latestSeason?.motm || 0,
    avgRating: latestSeason?.avgRating || 0,
  };
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
export async function generateFanReactions(
  postContent: string,
  hofPoints: number,
  category?: PostCategory
): Promise<FanReaction[]> {
  const { baseLikes, baseShares } = calculateEngagement(hofPoints);
  const player = getCurrentPlayerData();

  // If LLM is available, try it first
  try {
    const resp = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'local',
        messages: [{
          role: 'user',
          content: `Generate 6 football fan comments reacting to a post. Be brutal, honest, funny.

Player: ${player.name}, ${player.team}, ${player.position}, ${player.overall} OVR
Season stats: ${player.goals}G ${player.assists}A in ${player.appearances} apps
Career stats: ${player.totalGoals}G ${player.totalAssists}A
Age: ${player.age}

Post: "${postContent}"
Category: ${category || 'general'}

Fan personas: ${FAN_PERSONAS.map(f => `${f.name} (${f.type})`).join(', ')}

Rules:
1. Each comment 1-2 sentences max
2. Mix of agree/disagree/hot takes
3. One hater always (Kai_H8R)
4. Use player's ACTUAL stats
5. Be realistic - some fans are harsh

Return JSON array of 6 objects with: name, handle, flag, text`
        }],
        temperature: 0.9,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (resp.ok) {
      const data: LLMResponse = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length >= 6) {
          return parsed.slice(0, 6).map((c: any, i: number) => ({
            name: c.name || FAN_PERSONAS[i].name,
            handle: c.handle || FAN_PERSONAS[i].handle,
            flag: c.flag || FAN_PERSONAS[i].flag,
            text: c.text || '',
            likes: jitter(baseLikes, Math.floor(baseLikes * 0.15)),
            shares: jitter(baseShares, Math.floor(baseShares * 0.15)),
          }));
        }
      }
    }
  } catch {
    console.log('[FanReactions] LLM unavailable, using category-based fallback');
  }

  return getCategoryBasedFallback(postContent, category || 'general', baseLikes, baseShares);
}

// ============================================
// Category-Based Fallback - context-aware reactions
// ============================================
function getCategoryBasedFallback(
  post: string,
  category: PostCategory,
  baseLikes: number,
  baseShares: number
): FanReaction[] {
  const player = getCurrentPlayerData();
  const { name, team, position, overall, goals, assists, appearances, age, totalGoals, totalAssists, motm, avgRating } = player;
  const postLower = post.toLowerCase();

  // Detect legend mentions — works across ALL categories
  const mentionedLegend = findMentionedLegend(postLower);

  let comments: string[];

  switch (category) {
    case 'legend_comparison':
      if (mentionedLegend) {
        comments = getLegendComments(mentionedLegend, name, goals, assists, overall, team, age);
      } else {
        comments = [
          `${name} comparing himself to legends? ${totalGoals}G ${totalAssists}A career. Legends have 500+ goals.`,
          `The disrespect to actual legends. ${name} has 0 Ballon d'Ors, 0 UCLs.`,
          `${goals} goals this season and you're talking about all-time greatness? Stay humble.`,
          `${age} years old with ${totalGoals} career goals. Messi had 91 in ONE year. Delete this.`,
          `${name} is good but let's not get carried away. Legends are built over decades.`,
          `Comparing ${overall} OVR to 90+ legends? The gap is MASSIVE. Facts don't lie.`,
        ];
      }
      break;

    case 'self_praise':
      comments = [
        `${name} celebrating ${goals}G ${assists}A at ${team}? DESERVED. The stats speak.`,
        `${motm}x MOTM this season. ${name} is putting in WORK. Let him cook!`,
        `${totalGoals}G ${totalAssists}A career total at age ${age}. The trajectory is INSANE.`,
        `${avgRating} average rating. Consistency is what separates good from GREAT.`,
        `${assists} assists shows elite vision. ${name} is the real deal at ${team}.`,
        `${age} years old and already a key player. The future is BRIGHT.`,
      ];
      break;

    case 'hot_take':
      comments = [
        `This is a SCORCHING take. ${name} at ${overall} OVR saying this? Wild.`,
        `Hot take alert! ${goals} goals and suddenly everyone's a philosopher.`,
        `The audacity! But... ${assists} assists does give him some credibility.`,
        `I respect the confidence but ${totalGoals}G doesn't make you an authority.`,
        `This take is so hot it's melting my screen. ${name} needs to relax.`,
        `Bold words from someone with ${totalGoals} career goals. I'm listening though.`,
      ];
      break;

    case 'club_loyalty':
      comments = [
        `${name} showing love to ${team}! The fans appreciate a loyal player.`,
        `This is what you want to see — a player who CARES about the badge.`,
        `${team} are lucky to have ${name}. ${goals}G ${assists}A this season proves it.`,
        `Loyalty in modern football is RARE. ${name} gets it.`,
        `${team} fans, cherish this man. ${totalGoals}G ${totalAssists}A and counting.`,
        `Building a legacy at ${team} — that's how you become a club LEGEND.`,
      ];
      break;

    case 'trophy_chase':
      comments = [
        `${name} hunting trophies at ${team}! ${goals}G ${assists}A to make it happen.`,
        `The trophy chase is ON. ${name} needs silverware to validate the talent.`,
        `${motm}x MOTM — ${name} is doing everything possible to win trophies.`,
        `${team} need to build around ${name}. ${totalGoals}G ${totalAssists}A shows he's the guy.`,
        `Trophies define legacy. ${name} has the talent, now he needs the hardware.`,
        `With ${goals} goals this season, ${name} is carrying ${team} towards silverware.`,
      ];
      break;

    case 'transfer_talk':
      comments = [
        `${name} at ${team} — but for how long? ${goals}G ${assists}A will attract suitors.`,
        `${overall} OVR and ${totalGoals}G ${totalAssists}A. Top clubs should be monitoring this.`,
        `If ${name} keeps putting up ${goals}G ${assists}A, bigger clubs will come calling.`,
        `${team} better lock ${name} down. This talent won't stay under the radar.`,
        `Transfer rumors incoming! ${age} years old with ${totalAssists} assists is ELITE potential.`,
        `${name} at ${team} is a stepping stone. The big clubs are watching.`,
      ];
      break;

    case 'form_check':
      comments = [
        `${name}'s form: ${goals}G ${assists}A in ${appearances} apps. That's ${avgRating} avg rating.`,
        `${motm}x MOTM this season. ${name} is in INCREDIBLE form.`,
        `${goals} goals in ${appearances} games — that's a goal every ${(appearances/goals || 1).toFixed(1)} games.`,
        `${assists} assists shows ${name} is creating chances consistently.`,
        `${avgRating} average rating. ${name}'s form is ELITE right now.`,
        `${totalGoals}G ${totalAssists}A career — ${name} is peaking at the right time.`,
      ];
      break;

    case 'rivalry':
      comments = [
        `${name} calling out rivals? With ${goals}G ${assists}A, he's got the stats to back it up.`,
        `The rivalry heats up! ${name} wants all the smoke.`,
        `${overall} OVR vs his rivals — ${name} is holding his own.`,
        `Competition breeds excellence. ${name} with ${goals} goals is stepping up.`,
        `${name} talking trash? ${totalAssists} assists says he can back it up.`,
        `Rivalry activated! ${name} is ready to prove he's the best.`,
      ];
      break;

    case 'international':
      comments = [
        `${name} representing ${player.team}! ${totalGoals}G ${totalAssists}A at club level — imagine for country.`,
        `${player.team}'s golden boy! ${age} years old and already a key player.`,
        `${name} putting ${player.team} on the map! ${goals}G at ${team} translates to international success.`,
        `International duty is where legends are made. ${name} has the talent.`,
        `${player.team} need ${name} to deliver. ${totalAssists} assists shows he can create.`,
        `${name} flying the flag! ${overall} OVR and rising.`,
      ];
      break;

    default: // general
      comments = [
        `${name} has ${goals} goals and ${assists} assists at ${team} this season. Not bad at all.`,
        `${overall} OVR at ${team} — room to grow but the talent is there.`,
        `${assists} assists shows real vision. The kid can play at the highest level.`,
        `${age} years old putting up numbers at ${team}. Respect.`,
        `${goals}G ${assists}A in ${appearances} appearances. Solid output for a youngster.`,
        `${totalGoals}G ${totalAssists}A career total. The trajectory is UP.`,
      ];
      break;
  }

  // If a legend is mentioned in ANY non-legend_comparison category, inject legend context into 2 comments
  // For form_check, only allow modern/active players
  if (mentionedLegend && category !== 'legend_comparison') {
    const shouldInject = category === 'form_check' ? isModernPlayer(mentionedLegend) : true;
    if (shouldInject) {
      const legendRoasts = getLegendComments(mentionedLegend, name, goals, assists, overall, team, age);
      // Replace comment index 1 and 4 with legend-specific ones
      comments[1] = legendRoasts[0];
      comments[4] = legendRoasts[1];
    }
  }

  // 6th person is always the hater
  const haterComment = getHaterComment(name, goals, assists, overall, team, age, appearances, postLower, mentionedLegend);

  const allComments = [...comments.slice(0, 5), haterComment];

  return allComments.map((text, i) => ({
    name: FAN_PERSONAS[i].name,
    handle: FAN_PERSONAS[i].handle,
    flag: FAN_PERSONAS[i].flag,
    text,
    likes: jitter(baseLikes, Math.floor(baseLikes * 0.15)),
    shares: jitter(baseShares, Math.floor(baseShares * 0.15)),
  }));
}

function findMentionedLegend(postLower: string): string | null {
  const legendMap: Record<string, string> = {
    'ronaldo': 'Cristiano Ronaldo',
    'cr7': 'Cristiano Ronaldo',
    'cristiano': 'Cristiano Ronaldo',
    'messi': 'Lionel Messi',
    'leo': 'Lionel Messi',
    'haaland': 'Erling Haaland',
    'mbappe': 'Kylian Mbappé',
    'mbappé': 'Kylian Mbappé',
    'neymar': 'Neymar',
    'henry': 'Thierry Henry',
    'zidane': 'Zinedine Zidane',
    'pirlo': 'Andrea Pirlo',
    'maldini': 'Paolo Maldini',
    'ronaldinho': 'Ronaldinho',
    'xavi': 'Xavi',
    'bellingham': 'Jude Bellingham',
    'ramos': 'Sergio Ramos',
    'lineker': 'Gary Lineker',
    'ferdinand': 'Rio Ferdinand',
    'salah': 'Mohamed Salah',
    'de bruyne': 'Kevin De Bruyne',
    'kdb': 'Kevin De Bruyne',
    'kane': 'Harry Kane',
    'son': 'Heung-min Son',
    'van dijk': 'Virgil van Dijk',
    'modric': 'Luka Modrić',
    'de gea': 'David De Gea',
    'benzema': 'Karim Benzema',
    'lewandowski': 'Robert Lewandowski',
    'pogba': 'Paul Pogba',
    'griezmann': 'Antoine Griezmann',
    'brahim': 'Brahim Díaz',
    'foden': 'Phil Foden',
    'saka': 'Bukayo Saka',
    'palmer': 'Cole Palmer',
  };
  for (const [key, value] of Object.entries(legendMap)) {
    if (postLower.includes(key)) return value;
  }
  return null;
}

function isCompliment(postLower: string): boolean {
  const positive = ['great', 'amazing', 'good', 'best', 'love', 'proud', 'happy', 'record', 'break', 'top', 'scored', 'winning'];
  return positive.some(w => postLower.includes(w));
}

function isStatComparison(postLower: string): boolean {
  const comparison = ['better', 'worse', 'compare', 'vs', 'versus', 'than', 'best player', 'who is', 'overrated', 'underrated'];
  return comparison.some(w => postLower.includes(w));
}

function isAchievement(postLower: string): boolean {
  const achievement = ['assist', 'goal', 'career', 'milestone', 'record', 'broke', 'hit', 'reached', 'century', 'hat-trick', 'hattrick', 'motm', 'man of the match'];
  return achievement.some(w => postLower.includes(w));
}

// ============================================
// Post Categories for contextual fan reactions
// ============================================
export type PostCategory =
  | 'hot_take'
  | 'legend_comparison'
  | 'self_praise'
  | 'club_loyalty'
  | 'trophy_chase'
  | 'transfer_talk'
  | 'form_check'
  | 'rivalry'
  | 'international'
  | 'general';

export interface PostCategoryOption {
  id: PostCategory;
  label: string;
  description: string;
  icon: string;
}

export const POST_CATEGORIES: PostCategoryOption[] = [
  { id: 'hot_take', label: 'Hot Take', description: 'Bold opinion, controversial statement', icon: '🔥' },
  { id: 'legend_comparison', label: 'Legend Comparison', description: 'Comparing yourself to all-time greats', icon: '👑' },
  { id: 'self_praise', label: 'Self Praise', description: 'Celebrating your own achievements', icon: '⭐' },
  { id: 'club_loyalty', label: 'Club Loyalty', description: 'Love for your current or past club', icon: '🏟️' },
  { id: 'trophy_chase', label: 'Trophy Chase', description: 'Hunting silverware and records', icon: '🏆' },
  { id: 'transfer_talk', label: 'Transfer Talk', description: 'Rumours, moves, career decisions', icon: '✈️' },
  { id: 'form_check', label: 'Form Check', description: 'Current season performance discussion', icon: '📊' },
  { id: 'rivalry', label: 'Rivalry', description: 'Calling out competitors', icon: '⚔️' },
  { id: 'international', label: 'International Duty', description: 'National team pride', icon: '🌍' },
  { id: 'general', label: 'General', description: 'Casual football talk', icon: '💬' },
];

function getLegendComments(
  legend: string,
  name: string,
  goals: number,
  assists: number,
  ovr: number,
  team: string,
  age: number
): string[] {
  const legendStats: Record<string, string[]> = {
    'Cristiano Ronaldo': [
      `${name} has ${goals} goals. Ronaldo has 900+ career goals. The gap is OCEANIC.`,
      `${assists} assists vs Ronaldo's 130 international goals. Delete this.`,
      `${ovr} OVR at ${team}. Ronaldo was at Man United winning Ballon d'Ors. Not close.`,
      `${goals}G ${assists}A and you mention CR7? He has 5 UCL titles. Know your place.`,
      `Ronaldo has 5 Ballon d'Ors, 5 UCLs. ${name} has ${goals} goals. Log off.`,
    ],
    'Lionel Messi': [
      `${name} has ${goals} goals. Messi scored 91 in ONE year. Different species.`,
      `${assists} assists is cute. Messi has 8 Ballon d'Ors. Sit down.`,
      `${ovr} OVR at ${team}? Messi won his first Ballon d'Or at 22. Not even close.`,
      `${goals} goals vs Messi's 800+ career goals. Math isn't mathing.`,
      `Messi has a World Cup, 4 UCLs, 8 Ballon d'Ors. ${name} has ${goals}. Be humble.`,
    ],
    'Erling Haaland': [
      `${name} has ${goals} goals. Haaland scored 52 in his debut PL season. Pipe down.`,
      `${assists} assists? Haaland has more goals than that in HALF a season.`,
      `${ovr} OVR at ${team}. Haaland was at Dortmund destroying Bundesliga at your age.`,
      `${goals}G ${assists}A vs Haaland's 52 goals in 2022/23. Different tier.`,
      `Haaland broke the PL scoring record. ${name} plays for ${team}. Be real.`,
    ],
    'Kylian Mbappé': [
      `${name} has ${goals} goals. Mbappé has a World Cup winner's medal at 19. Sit down.`,
      `${assists} assists vs Mbappé's 48 international goals. Pipe down.`,
      `${ovr} OVR at ${team}. Mbappé was tearing up Ligue 1 at your age.`,
      `${goals}G ${assists}A and comparing to Mbappé? He has a World Cup. You have ${team}.`,
      `Mbappé scored in a World Cup Final at 19. ${name} has ${goals} career goals. Stop.`,
    ],
    'Thierry Henry': [
      `${name} has ${goals} goals. Henry scored 228 Premier League goals. Different planet.`,
      `${assists} assists is nothing when Henry has 360+ career goals.`,
      `${ovr} OVR at ${team}. Henry was at Monaco dominating at 18.`,
      `${goals}G ${assists}A vs Henry's World Cup winner's medal and 123 France caps. Be humble.`,
      `Henry is a Premier League legend. ${name} plays in Serie A. Not comparable.`,
    ],
    'Zinedine Zidane': [
      `${name} has ${goals} goals. Zidane won the World Cup, Euro, and UCL as a player. Sit down.`,
      `${assists} assists vs Zidane's World Cup Final goal. Different level.`,
      `${ovr} OVR at ${team}. Zidane was running Juventus' midfield at your age.`,
      `${goals}G and you mention Zidane? He has a Ballon d'Or and World Cup. Be quiet.`,
      `Zidane headbutted Materazzi in a World Cup Final. ${name} plays for ${team}. Log off.`,
    ],
    'Mohamed Salah': [
      `${name} has ${goals} goals. Salah has 200+ PL goals. You're not close.`,
      `${assists} assists vs Salah's 160+ PL goals. Different tier entirely.`,
      `${ovr} OVR at ${team}. Salah was winning the Golden Boot at your age. Pipe down.`,
      `${goals}G ${assists}A and you think you're better than Salah? He has a PL, UCL, and 3x Golden Boots.`,
      `Salah has 3 Golden Boots and a UCL. ${name} has ${goals} goals. Be humble.`,
    ],
    'Kevin De Bruyne': [
      `${name} has ${assists} assists. KDB has 100+ PL assists. Sit down.`,
      `${assists} assists vs De Bruyne's 170+ career assists. Not comparable.`,
      `${ovr} OVR at ${team}. KDB was running Man City's midfield at your age.`,
      `${goals}G ${assists}A and comparing to KDB? He has 2 PL Player of the Years. Pipe down.`,
      `De Bruyne has 6 PL titles and a UCL. ${name} has ${assists} assists. Log off.`,
    ],
    'Harry Kane': [
      `${name} has ${goals} goals. Kane has 200+ PL goals and is Bayern's striker. Different level.`,
      `${assists} assists vs Kane's 213 PL goals. Not even close.`,
      `${ovr} OVR at ${team}. Kane was scoring 30+ PL seasons at your age.`,
      `${goals}G ${assists}A and comparing to Kane? He has 3 Golden Boots. Be quiet.`,
      `Kane has 300+ career goals. ${name} has ${goals}. The gap is MASSIVE.`,
    ],
  };

  return legendStats[legend] || [
    `${name} has ${goals} goals. ${legend} has accomplished way more than that.`,
    `${assists} assists is decent but ${legend} is a completely different tier.`,
    `${ovr} OVR at ${team} and comparing to ${legend}? The audacity.`,
    `${goals}G ${assists}A and you think you're on ${legend}'s level? Stats say no.`,
    `${legend} has trophies. ${name} has ${goals} goals. End the debate.`,
  ];
}

const MODERN_PLAYERS = new Set([
  'Mohamed Salah', 'Erling Haaland', 'Kylian Mbappé', 'Kevin De Bruyne',
  'Harry Kane', 'Heung-min Son', 'Virgil van Dijk', 'Luka Modrić',
  'David De Gea', 'Karim Benzema', 'Robert Lewandowski', 'Paul Pogba',
  'Antoine Griezmann', 'Brahim Díaz', 'Phil Foden', 'Bukayo Saka',
  'Cole Palmer', 'Jude Bellingham', 'Neymar',
]);

function isModernPlayer(legend: string): boolean {
  return MODERN_PLAYERS.has(legend);
}

function getHaterComment(
  name: string,
  goals: number,
  assists: number,
  ovr: number,
  team: string,
  age: number,
  apps: number,
  postLower: string,
  legend: string | null
): string {
  // Always finds something negative
  if (legend) {
    const haterLegends: Record<string, string> = {
      'Cristiano Ronaldo': `Ronaldo has 5 UCLs and you play for ${team}. Stay in your lane, ${name}.`,
      'Lionel Messi': `Messi has 8 Ballon d'Ors. ${name} has ${goals} goals. Why are we even talking about this?`,
      'Erling Haaland': `Haaland scored 52 goals last season. ${name} has ${goals} career goals. Delete this.`,
      'Kylian Mbappé': `Mbappé has a World Cup. ${name} has a Serie B mentality. Pipe down.`,
      'Thierry Henry': `Henry is a legend. ${name} is a LinkedIn motivational poster. Different worlds.`,
      'Zinedine Zidane': `Zidane won everything. ${name} plays for ${team}. The comparison is offensive.`,
    };
    return haterLegends[legend] || `${legend} is untouchable. ${name} is mid at best. Move on.`;
  }

  // Non-legend posts - still finds something negative
  if (isCompliment(postLower)) {
    const haterCompliments = [
      `${ovr} OVR at ${team}. That is a mid rating for a mid team. But sure, celebrate.`,
      `${goals}G ${assists}A and people are acting like he invented football. It is ${team}, not one of the elite clubs.`,
      `${assists} assists? Half of those are probably simple passes. Do not hype this up.`,
      `${age} years old at ${team}. If he was at a real club, he would be benched. Facts.`,
      `${apps} appearances and ${goals} goals. That is a goal every ${Math.round(apps / Math.max(goals, 1))} games. Not impressive.`,
    ];
    return haterCompliments[Math.floor(Math.random() * haterCompliments.length)];
  }

  // Generic hater responses
  const genericHater = [
    `${name} is the most overrated youngster in football right now and I am tired of pretending he is not.`,
    `${ovr} OVR is generous. He is a 60 OVR player in a decent system. The hype is manufactured.`,
    `${goals} goals at ${team} is like scoring in the schoolyard. Show me Champions League goals.`,
    `People hyping ${name} clearly do not watch football. ${assists} assists at ${team} means nothing.`,
    `${age} years old at ${team} and people call him the next big thing. The bar is underground.`,
  ];
  return genericHater[Math.floor(Math.random() * genericHater.length)];
}

// ============================================
// Legend Comments (triggered on 9.0+ match ratings)
// ============================================
export interface LegendComment {
  name: string;
  handle: string;
  flag: string;
  text: string;
  isLegend: boolean;
}

const LEGEND_COMMENTERS = [
  { name: 'Rio Ferdinand', handle: '@RioFerdy5', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Respectful but direct. Mentions his own career. Short sentences.' },
  { name: 'Thierry Henry', handle: '@ThierryHenry', flag: '🇫🇷', personality: 'Elegant, analytical. References Arsenal/Barcelona. Visionary.' },
  { name: 'Gary Neville', handle: '@GNev2', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Tactical, honest. References Man United. Sky Sports pundit style.' },
  { name: 'Paolo Maldini', handle: '@PaoloMaldini', flag: '🇮🇹', personality: 'Calm, legendary. References AC Milan. Italian elegance.' },
  { name: 'Xavi Hernandez', handle: '@XaviHernandez', flag: '🇪🇸', personality: 'Tactical genius. References Barcelona tiki-taka. Philosophy.' },
  { name: 'Ronaldinho', handle: '@Ronaldinho', flag: '🇧🇷', personality: 'Joyful, playful. References Barcelona/PSG. Smile and football.' },
  { name: 'Zinedine Zidane', handle: '@Zidane', flag: '🇫🇷', personality: 'Mysterious, class. References Real Madrid/Juventus. Minimal words.' },
  { name: 'Andrea Pirlo', handle: '@AndreaPirlo', flag: '🇮🇹', personality: 'Calm, elegant. References AC Milan/Juventus. Wine and football.' },
];

export function generateMatchRatingLegendComments(
  matchRating: number,
  playerName: string,
  playerStats: { goals: number; assists: number; age: number; team: string },
  hofPoints: number
): LegendComment[] {
  if (matchRating < 9) return [];

  // Select legends based on HoF points (more points = more legends)
  const maxLegends = hofPoints >= 200 ? 4 : hofPoints >= 100 ? 3 : hofPoints >= 50 ? 2 : 1;
  const shuffled = [...LEGEND_COMMENTERS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, maxLegends);

  return selected.map(legend => {
    let text = '';

    if (matchRating >= 10) {
      // Perfect 10 - legendary reactions
      const perfectReactions: Record<string, string[]> = {
        'Rio Ferdinand': [
          `A 10.0 at ${playerStats.age}? I was still in the reserves at that age. This kid is DIFFERENT.`,
          `Absolute perfection. I have seen a lot of young players. This one is special.`,
          `10.0. Remember this name. ${playerName} is going to be the best in the world.`,
        ],
        'Thierry Henry': [
          `A 10.0 performance at ${playerStats.age} years old. This is not normal. This is a generational talent.`,
          `I scored my first senior goal at 19. ${playerName} is getting 10.0 ratings at ${playerStats.age}. Different level.`,
          `Perfect. Simply perfect. ${playerName} at ${playerStats.team} is appointment viewing.`,
        ],
        'Gary Neville': [
          `10.0. I have given maybe 3 of those in my entire career analysis. ${playerName} is world class.`,
          `That was the best individual performance I have seen from a youngster in years. Outstanding.`,
          `I do not give 10.0 lightly. ${playerName} earned every bit of that. Phenomenal.`,
        ],
        'Paolo Maldini': [
          `Perfetto. ${playerName} at ${playerStats.age}. This is what football is about.`,
          `A 10.0 at ${playerStats.age}. I retired at 41 and never got a 10.0. This kid is special.`,
          `Class. Pure class. ${playerName} reminds me of myself at that age. Maybe better.`,
        ],
        'Xavi Hernandez': [
          `A 10.0 at ${playerStats.age}. This is tiki-taka meets raw talent. Beautiful.`,
          `${playerName} at ${playerStats.team} is playing football from another dimension. 10.0 deserved.`,
          `I have never seen a youngster with this game intelligence. 10.0 is an understatement.`,
        ],
        'Ronaldinho': [
          `10.0! Haha! ${playerName} is having FUN out there. That is what matters! 😄`,
          `A 10.0 at ${playerStats.age}? This kid smiles like me and plays like me. SPECIAL!`,
          `Football is joy. ${playerName} at ${playerStats.team} is pure joy. 10.0! 🎉`,
        ],
        'Zinedine Zidane': [
          `10.0. Class. ${playerName} has something you cannot teach.`,
          `Perfection. At ${playerStats.age}. Remember this night.`,
          `${playerName}. Remember the name. 10.0. That is all.`,
        ],
        'Andrea Pirlo': [
          `A 10.0. Like a fine wine, ${playerName} gets better with every match. Beautiful.`,
          `Perfetto. ${playerName} at ${playerStats.age} is playing with the elegance of a veteran. 10.0.`,
          `I have seen many great players. ${playerName} at ${playerStats.team} is one of them. 10.0.`,
        ],
      };
      const reactions = perfectReactions[legend.name] || [`10.0 at ${playerStats.age}. Special.`];
      text = reactions[Math.floor(Math.random() * reactions.length)];
    } else {
      // 9.0 - great performance
      const greatReactions: Record<string, string[]> = {
        'Rio Ferdinand': [
          `9.0 at ${playerStats.age}. I was marking strikers at that age. ${playerName} is running the game.`,
          `Outstanding. ${playerName} at ${playerStats.team} is developing into something special.`,
          `That was a captain's performance from a ${playerStats.age}-year-old. Remarkable.`,
        ],
        'Thierry Henry': [
          `9.0. At ${playerStats.age}. Remember when people doubted him? Not anymore.`,
          `${playerName} at ${playerStats.team} with 9.0. The Premier League will come calling soon.`,
          `A 9.0 performance at ${playerStats.age}. I had hair when I was this good. Impressive.`,
        ],
        'Gary Neville': [
          `9.0 at ${playerStats.age}. That is an elite performance. Not good. ELITE.`,
          `I have been watching football for 30 years. ${playerName} at ${playerStats.age} is the real deal.`,
          `9.0. At ${playerStats.age}. At ${playerStats.team}. Remember this night.`,
        ],
        'Paolo Maldini': [
          `9.0. ${playerName} at ${playerStats.age} is playing with the composure of a veteran.`,
          `Bene. ${playerName} at ${playerStats.team}. The Italian leagues will fight for him.`,
          `A 9.0 at ${playerStats.age}. This is what AC Milan dreams of signing.`,
        ],
        'Xavi Hernandez': [
          `9.0 at ${playerStats.age}. This is football intelligence. You cannot teach this.`,
          `${playerName} at ${playerStats.team} is playing the beautiful game. 9.0 deserved.`,
          `I love watching ${playerName}. 9.0 at ${playerStats.age}. The future is bright.`,
        ],
        'Ronaldinho': [
          `9.0! ${playerName} is playing with JOY! That is what football is about! 😄`,
          `A 9.0 at ${playerStats.age}? This kid has the smile and the skill! LOVE IT!`,
          `${playerName} at ${playerStats.team} with 9.0! Football needs more players like this!`,
        ],
        'Zinedine Zidane': [
          `9.0. ${playerName}. Class. Remember this name.`,
          `At ${playerStats.age}. 9.0. ${playerName} has the touch.`,
          `Beautiful performance. ${playerName} at ${playerStats.team}. 9.0.`,
        ],
        'Andrea Pirlo': [
          `9.0. Like a fine wine. ${playerName} at ${playerStats.age} is pure elegance.`,
          `Bene. ${playerName} at ${playerStats.team}. 9.0. The midfield maestro.`,
          `I see myself in ${playerName}. 9.0 at ${playerStats.age}. Beautiful.`,
        ],
      };
      const reactions = greatReactions[legend.name] || [`9.0 at ${playerStats.age}. Impressive.`];
      text = reactions[Math.floor(Math.random() * reactions.length)];
    }

    return {
      name: legend.name,
      handle: legend.handle,
      flag: legend.flag,
      text,
      isLegend: true,
    };
  });
}
