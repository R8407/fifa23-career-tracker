import ballonDorImg from '../assets/images/ballon_dor_trophy_1786062497877.jpg';
import uclImg from '../assets/images/ucl_trophy_1786062511479.jpg';
import goldenBootImg from '../assets/images/golden_boot_trophy_1786062523925.jpg';
import worldCupImg from '../assets/images/world_cup_trophy_1786062536361.jpg';
import motmImg from '../assets/images/man_of_match_trophy_1786062547833.jpg';
import leagueImg from '../assets/images/league_trophy_1786062561960.jpg';
import cupImg from '../assets/images/cup_trophy_1786062576474.jpg';
import europaleagueImg from '../../models/EUROPA-LEAGUE.jpg';

export const TROPHY_IMAGES: Record<string, string> = {
  ballondor: ballonDorImg,
  champions: uclImg,
  goldenboot: goldenBootImg,
  assistking: goldenBootImg,
  worldcup: worldCupImg,
  manofmatch: motmImg,
  league: leagueImg,
  cup: cupImg,
  national: worldCupImg,
  europaleague: europaleagueImg
};

/**
 * Formula to calculate Rank Points for Top 100 Leaderboard (Pure Merit)
 * Metrics:
 * - Goals: 1 pt each
 * - Assists: 0.75 pt each
 * - Ballon d'Ors: 50 pts each
 * - World Cups: 60 pts each
 * - Champions League: 30 pts each
 * - Europa League: 15 pts each
 * - League Titles: 20 pts each
 * - Cup Trophies: 10 pts each
 * - Golden Boot: 25 pts each
 * - Assist King: 15 pts each
 *
 * NOTE: MOTM and popularOpinionBonus are NOT included in ranking.
 * They are cosmetic stats only.
 */
export function calculateLegendPoints(stats: {
  goals: number;
  assists: number;
  ballondOr: number;
  worldCup: number;
  championsLeague: number;
  europaLeague: number;
  leagueTitles: number;
  cupTrophies: number;
  goldenBoot: number;
  assistKing: number;
  manOfTheMatch: number;
  popularOpinionBonus?: number;
}): number {
  const g_a = stats.goals * 1.0 + stats.assists * 0.75;
  const bOr = stats.ballondOr * 50;
  const wc = stats.worldCup * 60;
  const ucl = stats.championsLeague * 30;
  const uel = stats.europaLeague * 15;
  const leagues = stats.leagueTitles * 20;
  const cups = stats.cupTrophies * 10;
  const boot = stats.goldenBoot * 25;
  const assist = stats.assistKing * 15;
  const motm = stats.manOfTheMatch * 0.5;

  return Math.round(g_a + bOr + wc + ucl + uel + leagues + cups + boot + assist + motm);
}
