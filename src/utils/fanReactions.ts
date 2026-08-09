import llmContextData from '../data/llm_context.json';

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
  hofPoints: number
): Promise<FanReaction[]> {
  const { baseLikes, baseShares } = calculateEngagement(hofPoints);
  const context = llmContextData as any;
  const user = context.user_player || {};
  const elite = context.elite_players || [];

  const userStats = [
    `Name: ${user.name || 'Unknown'}`,
    `Team: ${user.team || 'Unknown'}`,
    `Position: ${user.position || 'Unknown'}`,
    `Overall: ${user.overall || '??'} OVR`,
    `Goals: ${user.goals ?? 0}`,
    `Assists: ${user.assists ?? 0}`,
    `Appearances: ${user.appearances ?? 0}`,
    `Age: ${user.age ?? '??'}`,
  ].join(' | ');

  const eliteBlock = elite.slice(0, 10).map((p: any) =>
    `- ${p.name}: ${p.position}, ${p.overall} OVR, ${p.team}, ${p.goals ?? 0}G ${p.assists ?? 0}A`
  ).join('\n');

  const legendsBlock = LEGEND_RECORDS.join('\n');

  const prompt = `Generate 6 football fan comments reacting to a post. Be brutal, honest, funny.

Player: ${user.name}, ${user.team}, ${user.position}, ${user.overall} OVR, ${user.goals}G ${user.assists}A, age ${user.age}
Post: "${postContent}"

6th commenter Kai_H8R is a permanent hater who always finds something negative.

Return ONLY a JSON array of 6 objects with "text" field (under 20 words each):
[{"text":"..."},{"text":"..."},{"text":"..."},{"text":"..."},{"text":"..."},{"text":"...hating"}]`;

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
        let text = item.text || 'Great post!';
        // Strip leaked instruction labels from LLM output
        text = text.replace(/^(Kai_H8R|Marco T|Liam O'Brien|Carlos Mendoza|Jean-Pierre D|Tommy Wright)\s*[:]\s*/i, '');
        return {
          name: FAN_PERSONAS[i].name,
          handle: FAN_PERSONAS[i].handle,
          flag: FAN_PERSONAS[i].flag,
          text,
          likes: jitter(baseLikes, Math.floor(baseLikes * 0.15)),
          shares: jitter(baseShares, Math.floor(baseShares * 0.15)),
        };
      });
    }
  } catch (e) {
    console.log('[FanReactions] LLM unavailable, using fallback');
  }

  return getStatBasedFallback(postContent, user, elite, baseLikes, baseShares);
}

// ============================================
// Fallback when LLM is offline
// ============================================
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
  const apps = user.appearances ?? 0;
  const postLower = post.toLowerCase();

  // Detect which legend they mentioned
  const mentionedLegend = findMentionedLegend(postLower);

  let comments: string[];

  if (mentionedLegend) {
    comments = getLegendComments(mentionedLegend, name, goals, assists, ovr, team, age);
  } else if (isCompliment(postLower)) {
    comments = [
      `${goals} goals and ${assists} assists at ${age} years old. This kid is SPECIAL.`,
      `${name} at ${ovr} OVR doing this at ${team}. The rise is real.`,
      `${assists} assists — name another youngster with better output. I will wait.`,
      `The ${team} fans are witnessing history. ${name} is the real deal.`,
      `${age} years old with ${goals}G ${assists}A. The ceiling is SCARY.`,
    ];
  } else {
    // Generic post
    comments = [
      `${name} has ${goals} goals and ${assists} assists this season. Not bad at all.`,
      `${ovr} OVR at ${team} — room to grow but the talent is there.`,
      `${assists} assists shows real vision. The kid can play.`,
      `${age} years old putting up numbers at ${team}. Respect.`,
      `${goals}G ${assists}A in ${apps} appearances. Solid output for a youngster.`,
    ];
  }

  // 6th person is always the hater - always find something negative
  const haterComment = getHaterComment(name, goals, assists, ovr, team, age, apps, postLower, mentionedLegend);

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
      `Haaland broke the PL scoring record. ${name} plays for Spezia. Be real.`,
    ],
    'Kylian Mbappé': [
      `${name} has ${goals} goals. Mbappé has a World Cup winner's medal at 19. Sit down.`,
      `${assists} assists vs Mbappé's 48 international goals. Pipe down.`,
      `${ovr} OVR at ${team}. Mbappé was tearing up Ligue 1 at your age.`,
      `${goals}G ${assists}A and comparing to Mbappé? He has a World Cup. You have Spezia.`,
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
      `Zidane headbutted Materazzi in a World Cup Final. ${name} plays for Spezia. Log off.`,
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
      `${goals}G ${assists}A and people are acting like he invented football. It is ${team}, not Real Madrid.`,
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
