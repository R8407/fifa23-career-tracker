import ballonDorImg from '../assets/images/ballon_dor_trophy_1786062497877.jpg';
import uclImg from '../assets/images/ucl_trophy_1786062511479.jpg';
import goldenBootImg from '../assets/images/golden_boot_trophy_1786062523925.jpg';
import worldCupImg from '../assets/images/world_cup_trophy_1786062536361.jpg';
import motmImg from '../assets/images/man_of_match_trophy_1786062547833.jpg';
import leagueImg from '../assets/images/league_trophy_1786062561960.jpg';
import cupImg from '../assets/images/cup_trophy_1786062576474.jpg';

export const TROPHY_IMAGES: Record<string, string> = {
  ballondor: ballonDorImg,
  champions: uclImg,
  goldenboot: goldenBootImg,
  assistking: goldenBootImg,
  worldcup: worldCupImg,
  manofmatch: motmImg,
  league: leagueImg,
  cup: cupImg,
  national: worldCupImg
};

/**
 * Formula to calculate Rank Points for Top 50 Leaderboard
 * Metrics:
 * - Goals: 1 pt each
 * - Assists: 0.75 pt each
 * - Ballon d'Ors: 120 pts each
 * - World Cups: 150 pts each
 * - Club Team Trophies: 30 pts each
 * - Popular Opinion / Legacy Prestige Bonus
 */
export function calculateLegendPoints(stats: {
  goals: number;
  assists: number;
  ballondOr: number;
  worldCup: number;
  clubTrophies: number;
  popularOpinionBonus?: number;
}): number {
  const g_a = stats.goals * 1.0 + stats.assists * 0.75;
  const bOr = stats.ballondOr * 120;
  const wc = stats.worldCup * 150;
  const trophies = stats.clubTrophies * 30;
  const opinion = stats.popularOpinionBonus || 0;

  return Math.round(g_a + bOr + wc + trophies + opinion);
}
