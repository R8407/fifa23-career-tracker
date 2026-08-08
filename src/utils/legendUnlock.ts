import { Legend, LEGENDS, LegendTier } from '../data/legends';

const LEGEND_CONVERSATIONS_KEY = 'career_legend_conversations';
const LEGEND_UNLOCK_KEY = 'career_legend_unlocks';

export interface LegendConversation {
  legendId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timeAgo: string }>;
  lastActivity: number;
  unlockedAt: number;
}

export interface LegendUnlockState {
  unlockedLegends: string[];
  hoFPoints: number;
}

// Get stored conversations
export function getLegendConversations(): Record<string, LegendConversation> {
  try {
    return JSON.parse(localStorage.getItem(LEGEND_CONVERSATIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

// Save conversation
export function saveLegendConversation(legendId: string, conversation: LegendConversation): void {
  const conversations = getLegendConversations();
  conversations[legendId] = conversation;
  localStorage.setItem(LEGEND_CONVERSATIONS_KEY, JSON.stringify(conversations));
}

// Get conversation for a legend
export function getLegendConversation(legendId: string): LegendConversation | null {
  const conversations = getLegendConversations();
  return conversations[legendId] || null;
}

// Check if a legend is unlocked based on HoF points
export function isLegendUnlocked(legend: Legend, hofPoints: number): boolean {
  // Bronze tier is always unlocked
  if (legend.tier === 'bronze') return true;

  // Check HoF points requirement
  return hofPoints >= legend.hofPointsRequired;
}

// Get unlock status for all legends
export function getLegendUnlockStatuses(hofPoints: number): Array<{
  legend: Legend;
  unlocked: boolean;
  pointsNeeded: number;
}> {
  return LEGENDS.map(legend => ({
    legend,
    unlocked: isLegendUnlocked(legend, hofPoints),
    pointsNeeded: Math.max(0, legend.hofPointsRequired - hofPoints),
  }));
}

// Get unlocked legends sorted by tier
export function getUnlockedLegends(hofPoints: number): Legend[] {
  return LEGENDS.filter(legend => isLegendUnlocked(legend, hofPoints))
    .sort((a, b) => {
      const tierOrder: Record<LegendTier, number> = {
        bronze: 0,
        silver: 1,
        gold: 2,
        platinum: 3,
        diamond: 4,
      };
      return tierOrder[a.tier] - tierOrder[b.tier];
    });
}

// Get locked legends that are closest to being unlocked
export function getClosestLockedLegends(hofPoints: number, limit: number = 3): Array<{
  legend: Legend;
  pointsNeeded: number;
}> {
  return LEGENDS
    .filter(legend => !isLegendUnlocked(legend, hofPoints))
    .map(legend => ({
      legend,
      pointsNeeded: legend.hofPointsRequired - hofPoints,
    }))
    .sort((a, b) => a.pointsNeeded - b.pointsNeeded)
    .slice(0, limit);
}

// Check if player has played against or with a legend
export function hasPlayedWithLegend(
  legendId: string,
  playerClubs: string[],
  playerOpponents: string[]
): boolean {
  const legend = LEGENDS.find(l => l.id === legendId);
  if (!legend) return false;

  // Check if player has been at any of the legend's clubs
  const hasBeenTeammate = legend.clubs.some(club =>
    playerClubs.some(playerClub =>
      playerClub.toLowerCase().includes(club.toLowerCase())
    )
  );

  return hasBeenTeammate;
}

// Generate first message for a newly unlocked legend
export function generateFirstMessage(
  legend: Legend,
  playerName: string,
  playerClub: string,
  playerAge: number
): string {
  return legend.greeting(playerName, playerClub, playerAge);
}

// Get transfer advice from a legend
export function getTransferAdvice(
  legend: Legend,
  playerName: string,
  currentClub: string,
  targetClub: string
): string {
  return legend.transferAdvice(playerName, currentClub, targetClub);
}

// Get match performance reaction
export function getMatchReaction(
  legend: Legend,
  playerName: string,
  rating: number
): string {
  return legend.matchPerformanceReaction(playerName, rating, legend.name);
}

// Get welcome message when becoming teammates
export function getTeammateWelcome(
  legend: Legend,
  playerName: string,
  club: string
): string {
  return legend.onBecameTeammate(playerName, club);
}

// Initialize legend conversations with first messages
export function initializeLegendConversations(
  playerName: string,
  playerClub: string,
  playerAge: number,
  hofPoints: number
): void {
  const existing = getLegendConversations();
  const unlockedLegends = getUnlockedLegends(hofPoints);

  for (const legend of unlockedLegends) {
    if (!existing[legend.id]) {
      const firstMessage = generateFirstMessage(legend, playerName, playerClub, playerAge);
      existing[legend.id] = {
        legendId: legend.id,
        messages: [{
          role: 'assistant',
          content: firstMessage,
          timeAgo: 'Recently',
        }],
        lastActivity: Date.now(),
        unlockedAt: Date.now(),
      };
    }
  }

  localStorage.setItem(LEGEND_CONVERSATIONS_KEY, JSON.stringify(existing));
}
