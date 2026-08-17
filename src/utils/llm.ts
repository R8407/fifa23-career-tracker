import { buildPlayerContext } from './playerContext';
import { TOP_100_LEGENDS } from '../data/mockData';

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

interface PlayerData {
  name: string;
  ovr: number;
  goals: number;
  assists: number;
  avgRating: string;
  motm: number;
  club: string;
  age: number;
  apps?: number;
  position?: string;
}

// ============================================
// Legend DM generation — 4 contexts
// ============================================

function findLegend(legendId: string) {
  return TOP_100_LEGENDS.find(l => l.id === legendId) || null;
}

function positionAdvice(position: string): string {
  const advice: Record<string, string[]> = {
    ST: ['Stay clinical in the box. One chance is all you need.', 'Movement off the ball creates goals before the pass even comes.', 'Work on your weaker foot — it doubles your threat.'],
    RW: ['Use your pace to stretch defenses wide, then cut inside.', 'Crossing and dribbling in tight spaces will separate you from the rest.', 'Defenders fear unpredictability — change pace, change angle.'],
    LW: ['Take your man on 1v1 and deliver quality into the box.', 'The best wingers combine speed with decision-making.', 'Track back when you lose it — that is what elite wide players do.'],
    CAM: ['Dictate the tempo. See the pass before anyone else.', 'Your vision is your weapon — find pockets and exploit them.', 'Work on your long-range shooting. Midfielders who score from distance are feared.'],
    CM: ['Control the midfield. Keep it simple when needed, ambitious when the moment comes.', 'Box-to-box is about timing — know when to push and when to hold.', 'Your engine is everything. Fitness wins midfield battles.'],
    CDM: ['Read the game. Anticipation beats reaction every time.', 'Protect the back four. A good tackle changes the whole match.', 'Distribution from deep is underrated — start attacks with one pass.'],
    CB: ['Defending is about positioning, not just tackles.', 'Stay calm under pressure. The best defenders make it look easy.', 'Build from the back — modern centre-backs need good feet.'],
    LB: ['Overlaps can unlock entire defenses. Time your runs.', 'Defensive discipline first, attack second. That is the mark of a great fullback.', 'Your delivery into the box is as important as any midfielder.'],
    RB: ['Balance attack and defense — you need to do both at the highest level.', 'One-v-one defending is an art. Stay on your feet.', 'Getting forward creates overloads. Use it wisely.'],
    GK: ['Command your box. A goalkeeper who organizes is worth 10 outfield players.', 'Distribution is part of the modern game. Play with your feet.', 'Stay focused for 90 minutes. One moment of concentration wins matches.'],
  };
  const options = advice[position] || advice.CM;
  return options[Math.floor(Math.random() * options.length)];
}

function buildLegendContext4(legend: ReturnType<typeof findLegend> & object, player: PlayerData): {
  careerStats: string;
  roleAdvice: string;
  bestMoment: string;
  playerComparison: string;
} {
  const l = legend as NonNullable<ReturnType<typeof findLegend>>;
  const careerStats = `${l.name} played as ${l.position} from ${l.nationality}. Career: ${l.goals}G, ${l.assists}A in ${l.appearances} appearances. ${l.ballondOr}x Ballon d'Or, ${l.worldCup}x World Cup, ${l.clubTrophies} club trophies.`;
  const roleAdvice = positionAdvice(l.position);
  const bestMoment = l.notableAchievement;
  const playerComparison = buildPlayerComparison(l, player);
  return { careerStats, roleAdvice, bestMoment, playerComparison };
}

function buildPlayerComparison(l: NonNullable<ReturnType<typeof findLegend>>, player: PlayerData): string {
  const parts: string[] = [];

  parts.push(`${player.name} is ${player.age} years old, ${player.ovr} OVR at ${player.club}. Career so far: ${player.goals}G, ${player.assists}A in ${player.apps || '?'} apps.`);

  if (l.clubs && l.clubs.length > 0) {
    const clubMatch = l.clubs.some(c => c.toLowerCase().includes(player.club.toLowerCase()));
    if (clubMatch) {
      parts.push(`${player.club} is close to my heart. I had some of my best years there.`);
    } else if (player.age <= 22) {
      parts.push(`At your age I was still developing. You have time on your side — but don't waste it.`);
    }
  }

  if (player.goals > 30) {
    parts.push(`Those goal numbers at your age are impressive. I was scoring too at that stage.`);
  } else if (player.assists > 25) {
    parts.push(`Creating like that takes real vision. The goals will come if you keep pushing.`);
  }

  if (l.position === player.position || !player.position) {
    parts.push(`We play the same position. I know what it takes to reach the top from there.`);
  }

  return parts.join(' ');
}

// Build rich system prompt for legend DMs (4 contexts)
function buildLegendSystemPrompt(
  senderName: string,
  legendData: NonNullable<ReturnType<typeof findLegend>>,
  contexts: ReturnType<typeof buildLegendContext4>
): string {
  return `You are ${senderName}, a football legend (${legendData.nationality}, ${legendData.position}, era ${legendData.era}).

YOUR CAREER:
${contexts.careerStats}
Your defining moment: ${contexts.bestMoment}

ADVICE FROM YOUR POSITION (${legendData.position}):
${contexts.roleAdvice}

THE PLAYER YOU ARE TALKING TO:
${contexts.playerComparison}

RULES:
- Speak as ${senderName} in first person, natural and conversational
- Reference YOUR career and achievements naturally
- Give career advice that fits YOUR position and experience
- Mention the player's stats and relate them to your own journey
- If the player plays at one of YOUR old clubs, mention it warmly
- Keep it under 40 words, use 1 emoji
- Never break character or mention being AI`;
}

// ============================================
// Template fallback (no LLM needed)
// ============================================

function getTemplateReply(
  legendData: NonNullable<ReturnType<typeof findLegend>>,
  player: PlayerData,
  _userMessage: string,
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): string {
  const l = legendData;
  const contexts = buildLegendContext4(l, player);
  const isFirstMessage = !chatHistory || chatHistory.length === 0;

  // Position-specific reply templates
  const replyTemplates: Record<string, string[]> = {
    ST: [
      `You scored ${player.goals} goals already? At your age I was hungry for more. Keep that instinct sharp ${player.goals > 20 ? '🔥' : '⚽'}`,
      `Goals win games, mentality wins titles. You've got the talent — now build the mindset ${player.ovr >= 80 ? '👑' : '💪'}`,
      `I know what it takes to lead the line. ${contexts.roleAdvice} The goals will follow ${player.goals > 30 ? '🏆' : '⚽'}`,
    ],
    RW: [
      `${player.assists} assists shows you see the game differently. I was the same way on the wing — pace and vision ${player.assists > 20 ? '🔥' : '💨'}`,
      `Out wide, you need to be fearless. Take your man on, deliver the ball, and never stop running ${contexts.roleAdvice} ${'⚽'}`,
      `I made my career beating defenders 1v1. At ${player.age} you're right on track ${player.ovr >= 80 ? '👑' : '🎯'}`,
    ],
    LW: [
      `Creativity on the left is a gift. ${contexts.roleAdvice} Your ${player.assists}A shows you're using it well ${player.assists > 20 ? '🔥' : '⚡'}`,
      `I remember being your age — everything felt possible. Use that energy, stay hungry ${player.goals > 20 ? '⚽' : '💪'}`,
      `The best wingers combine art with intensity. You've got ${player.goals}G and ${player.assists}A — keep building ${'🏆'}`,
    ],
    CAM: [
      `Dictating play from midfield is the hardest job in football. Your ${player.assists}A says you're doing it right ${player.assists > 25 ? '🧠' : '⚽'}`,
      `${contexts.roleAdvice} I spent years perfecting that balance between creativity and responsibility ${'🎯'}`,
      `At ${player.age}, controlling the tempo like that takes real intelligence. You remind me of myself at that age ${player.ovr >= 80 ? '👑' : '💪'}`,
    ],
    CM: [
      `Box-to-box is about knowing when to push and when to hold. Your ${player.goals}G and ${player.assists}A shows you're finding that balance ${'⚽'}`,
      `I was the same at your age — running everywhere, wanting to do everything. ${contexts.roleAdvice} ${player.ovr >= 80 ? '👑' : '💪'}`,
      `The midfield is the heart of the team. You're pumping life into yours ${'🔥'}`,
    ],
    CDM: [
      `Protecting the defense is a thankless job, but when done right, everyone notices. You're doing it right ${player.motm > 10 ? '🏆' : '🛡️'}`,
      `${contexts.roleAdvice} I learned that the hard way over 800+ appearances ${'💪'}`,
      `Reading the game at ${player.age} — that's rare. Keep developing that instinct ${player.ovr >= 80 ? '👑' : '🎯'}`,
    ],
    CB: [
      `Defending is about positioning, not just tackles. Your ${player.motm} MOTM awards show you're reading the game well ${player.motm > 10 ? '🛡️' : '💪'}`,
      `I spent my whole career at the back. ${contexts.roleAdvice} Stay hungry ${'🏆'}`,
      `Centre-backs don't always get the glory, but the best ones change matches. You're on that path ${player.ovr >= 80 ? '👑' : '💪'}`,
    ],
    LB: [
      `Overlapping from fullback can unlock entire defenses. ${contexts.roleAdvice} Your engine is what matters most ${'⚡'}`,
      `The modern fullback does everything. Attack, defend, deliver. You're building that complete game ${player.assists > 15 ? '🔥' : '💪'}`,
      `I know how demanding it is to play both ways. At ${player.age}, you're handling it well ${'⚽'}`,
    ],
    RB: [
      `${contexts.roleAdvice} Balance is everything on the right side ${player.assists > 15 ? '⚡' : '💪'}`,
      `Fullback is the hardest position in football today. You're taking it on at ${player.age} — respect ${'🏆'}`,
      `Defend first, attack second. But when you do get forward, make it count ${player.assists > 15 ? '🔥' : '⚽'}`,
    ],
    GK: [
      `Goalkeeping is about moments. Stay focused for the full 90 and you'll make the saves that matter ${'🧤'}`,
      `At ${player.age}, commanding your box like that takes confidence. You've got it ${player.motm > 5 ? '🏆' : '💪'}`,
      `${contexts.roleAdvice} Distribution from the back changes how the whole team plays ${'⚽'}`,
    ],
  };

  const templates = replyTemplates[l.position] || replyTemplates.CM;

  // Context-aware selection based on conversation state
  if (isFirstMessage) {
    // First reply after user's first message
    const idx = Math.abs(hashCode(player.name + l.name)) % templates.length;
    return templates[idx];
  }

  const lastUserMsg = chatHistory?.filter(m => m.role === 'user').slice(-1)[0]?.content?.toLowerCase() || '';

  // React to what the user said
  if (lastUserMsg.includes('career') || lastUserMsg.includes('stats') || lastUserMsg.includes('numbers')) {
    return `In my career I had ${l.goals}G and ${l.assists}A in ${l.appearances} appearances. ${l.clubTrophies} club trophies, ${l.ballondOr > 0 ? `${l.ballondOr}x Ballon d'Or, ` : ''}${l.worldCup > 0 ? `${l.worldCup}x World Cup` : 'no World Cup'}. ${l.notableAchievement} ${templates[0].slice(-2)}`;
  }

  if (lastUserMsg.includes('club') || lastUserMsg.includes('transfer') || lastUserMsg.includes('sign')) {
    if (l.clubs && l.clubs.length > 0) {
      const clubLine = l.clubs.some(c => c.toLowerCase().includes(player.club.toLowerCase()))
        ? `You're already at ${player.club} — I loved my time there.`
        : `If you ever get the chance to play for ${l.clubs[0]}, take it. It changed my life.`;
      return `${clubLine} ${templates[0].slice(-2)}`;
    }
  }

  if (lastUserMsg.includes('advice') || lastUserMsg.includes('tip') || lastUserMsg.includes('help')) {
    return `${contexts.roleAdvice} That's what got me through my career ${templates[0].slice(-2)}`;
  }

  if (lastUserMsg.includes('thanks') || lastUserMsg.includes('thank') || lastUserMsg.includes('🙏')) {
    return [
      `Anytime, young baller. The future is yours ${l.worldCup > 0 ? '🏆' : '⚽'}`,
      `Keep going. I'll be watching your progress ${player.ovr >= 80 ? '👑' : '💪'}`,
      `That's what legends are for. Reach out anytime ${'🤝'}`,
    ][Math.floor(Math.random() * 3)];
  }

  if (lastUserMsg.includes('best') || lastUserMsg.includes('peak') || lastUserMsg.includes('moment')) {
    return `My best moment? ${l.notableAchievement}. That feeling never leaves you ${'🏆'}`;
  }

  // Default: pick a template based on hash for variety
  const idx = Math.abs(hashCode(player.name + l.name + String(chatHistory?.length || 0))) % templates.length;
  return templates[idx];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// ============================================
// Non-legend fallbacks (coaches, teammates, etc.)
// ============================================

function getRoleFallbackReply(role: string, player: PlayerData): string {
  const replies: Record<string, string[]> = {
    legend: [
      `You scored ${player.goals}G and ${player.assists}A? At your age that's special. Keep pushing ${player.goals > 30 ? '🔥' : '⚽'}`,
      `I see something in you that reminds me of myself at that age. Stay hungry ${player.ovr >= 80 ? '👑' : '💪'}`,
      `The work you put in now determines where you end up. I've been there — trust the grind ${'🏆'}`,
    ],
    agent: [
      `Your value is going up with every performance. ${player.goals}G and ${player.assists}A at ${player.age} — we have options ${player.ovr >= 80 ? '💰' : '📋'}`,
      `Big moves coming. Stay ready and keep performing ${'🔥'}`,
      `Focus on your game. The transfers handle themselves when the numbers are this good ${player.goals > 20 ? '⚽' : '💪'}`,
    ],
    coach: [
      `Your development has been impressive. ${player.goals}G and ${player.assists}A — keep this trajectory ${player.ovr >= 80 ? '🏆' : '💪'}`,
      `Stay focused and disciplined. You're building something special at ${player.club} ${'🎯'}`,
      `I am pleased with your growth. At ${player.age}, you have time on your side ${player.ovr >= 80 ? '👑' : '🙌'}`,
    ],
  };
  const options = replies[role] || replies.legend;
  return options[Math.floor(Math.random() * options.length)];
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
  playerData: PlayerData,
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  personalityToken?: string,
  legendId?: string,
): Promise<string> {
  const legendData = legendId ? findLegend(legendId) : null;

  // ── Template fallback (always works, no LLM needed) ──
  if (!legendData) {
    // Non-legend roles: use role-based fallback
    return getRoleFallbackReply(senderRole, playerData);
  }

  // For legends, try LLM first with rich context, fall back to smart templates
  const contexts = buildLegendContext4(legendData, playerData);

  // Try LLM
  try {
    const context = buildPlayerContext();
    const systemPrompt = buildLegendSystemPrompt(senderName, legendData, contexts);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: originalMessage },
      { role: 'user', content: playerReply || 'What do you think about my career so far?' },
    ];

    if (chatHistory) {
      for (const msg of chatHistory.slice(-6)) {
        messages.splice(-1, 0, { role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3',
        messages,
        temperature: 0.8,
        max_tokens: 200,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('LLM request failed');
    const data: LLMResponse = await res.json();
    let content = data.choices[0]?.message?.content || '';

    // Aggressive cleaning of Phi-3-mini output
    content = content
      .replace(/<\|assistant\|>/g, '')
      .replace(/<\|end\|>/g, '')
      .replace(/<\|user\|>/g, '')
      .replace(/<\|system\|>/g, '')
      .replace(/\|/g, '')
      .replace(/^-+\s*answer:?.*$/gm, '')
      .split(/\(Note:/i)[0]
      .split(/##\s*DATABASE/i)[0]
      .split(/##\s*YOUR PLAYER/i)[0]
      .split(/##\s*YOUR CAREER/i)[0]
      .split(/##\s*TOP PLAYERS/i)[0]
      .split(/##\s*RULES/i)[0]
      .split(/---------EXAMPLE---------/i)[0]
      .split(/-----------EXAMPLE-----------/i)[0]
      .replace(/^##.*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (content.length >= 10) {
      return content;
    }
  } catch {
    // LLM unavailable — fall through to template
  }

  // ── Smart template fallback for legends ──
  return getTemplateReply(legendData, playerData, playerReply, chatHistory);
}
