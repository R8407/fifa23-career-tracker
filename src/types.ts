export type Position = 'ST' | 'CF' | 'RW' | 'LW' | 'CAM' | 'CM' | 'CDM' | 'LB' | 'CB' | 'RB' | 'GK';

export interface AttributeBreakdown {
  // Main 6 FIFA attributes
  pace: number | string;
  shooting: number | string;
  passing: number | string;
  dribbling: number | string;
  defending: number | string;
  physical: number | string;

  // Sub-attributes
  acceleration: number | string;
  sprintSpeed: number | string;
  finishing: number | string;
  shotPower: number | string;
  longShots: number | string;
  volleys: number | string;
  penalties: number | string;
  vision: number | string;
  crossing: number | string;
  shortPassing: number | string;
  longPassing: number | string;
  curve: number | string;
  agility: number | string;
  balance: number | string;
  reactions: number | string;
  ballControl: number | string;
  dribblingStat: number | string;
  composure: number | string;
  interceptions: number | string;
  headingAcc: number | string;
  defAwareness: number | string;
  standingTackle: number | string;
  slidingTackle: number | string;
  stamina: number | string;
  strength: number | string;
  jumping: number | string;
  aggression: number | string;
}

export interface AttributeHistoryPoint {
  age: number;
  year: string;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  physical: number;
}

export type CompetitionType = 'League' | 'DomesticCup' | 'ContinentalCup' | 'International' | 'Friendly';

export interface CompetitionStat {
  compobjid: number;
  competition: string;
  teamid: number;
  apps: number;
  goals: number;
  assists: number;
  avgRating: number;
  yellow: number;
  red: number;
  motm: number;
  clean_sheets: number;
  goals_conceded: number;
  saves: number;
  type?: CompetitionType;
}

export interface SeasonData {
  id: string;
  season: string; // e.g., "2028/29"
  age: number;
  club: string;
  league: string;
  clubBadgeColor: string;
  apps: number;
  goals: number;
  assists: number;
  avgRating: number;
  yellowCards: number;
  redCards: number;
  trophies: string[];
  individualAwards: string[];
  highlights: string;
  xG: number;
  xA: number;
  keyPassesPerGame: number;
  dribblesPerGame: number;
  competitionStats?: CompetitionStat[];
  motm?: number;
}

export interface ClubHistory {
  id: string;
  clubName: string;
  league: string;
  logoBg: string;
  logoText: string;
  years: string;
  apps: number;
  goals: number;
  assists: number;
  avgRating: number;
  trophiesWon: number;
  transferFee: string;
  notableMoment: string;
}

export interface Teammate {
  id: string;
  name: string;
  position: Position;
  rating: number;
  nationality: string;
  flag: string;
  role: string;
  isUserPlayer?: boolean;
  appsThisSeason: number;
  goalsThisSeason: number;
  assistsThisSeason: number;
  chemistryLink: number; // 0 to 100
  avatarBg: string;
}

export interface LeaguePlayerStat {
  rank: number;
  player: string;
  team: string;
  nationality: string;
  flag: string;
  position: Position;
  value: number; // e.g. goals count or rating
  displayValue: string;
  matchesPlayed: number;
  isUserPlayer?: boolean;
}

export interface LegendComparison {
  id: string;
  name: string;
  era: string;
  peakOverall: number;
  retireAge: number;
  apps: number;
  goals: number;
  assists: number;
  ballondOr: number;
  uclTitles: number;
  leagueTitles: number;
  goldenBoots: number;
  avgRating: number;
  avatar: string;
  attributes: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
}

export type RecordDifficulty = 'Easy' | 'Elite' | 'Legendary';
export type RecordCategory = 'UCL' | 'Knockout' | 'League' | 'Club' | 'International' | 'Individual';

export interface HallOfFameRecord {
  id: string;
  title: string;
  category: RecordCategory;
  holderName: string;
  holderRecord: number;
  unit: string;
  userCurrent: number;
  difficulty: RecordDifficulty;
  isBroken: boolean;
  isApplicable?: boolean;
  remainingToBreak: number;
  legacyPoints: number;
  description: string;
  holderClub?: string;
}

export interface RankedLegend {
  id: string;
  rank?: number;
  name: string;
  era: string;
  nationality: string;
  flag: string;
  position: Position;
  avatarBg?: string;
  goals: number;
  assists: number;
  appearances?: number;
  ballondOr: number;
  worldCup: number;
  clubTrophies: number;
  popularOpinionBonus: number;
  notableAchievement: string;
  category?: 'legend' | 'modern';
  attributes?: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
}

export interface IconicMoment {
  id: string;
  title: string;
  description: string;
  year: string;
  competition: string;
  opponent?: string;
  impactTag: string;
  matchResult?: string;
  imageUrl?: string;
}

export interface TrophyItem {
  id: string;
  title: string;
  category: 'Club' | 'Individual' | 'International';
  quantity: number;
  yearsWon: string[];
  description: string;
  tier: 'Gold' | 'Platinum' | 'Diamond';
  iconType: 'champions' | 'ballondor' | 'league' | 'cup' | 'goldenboot' | 'national' | 'worldcup' | 'manofmatch' | 'assistking' | 'europaleague' | 'youngplayer' | 'bestxi';
  imagePath?: string;
}

export interface PlayerData {
  name: string;
  nickname: string;
  position: Position;
  overall: number;
  potential: number;
  age: number | string;
  careerStartYear?: number | string;
  currentClub: string;
  clubLogoBg: string;
  nationality: string;
  nationalityFlag: string;
  marketValue: string;
  weeklySalary: string;
  jerseyNumber: number | string;
  preferredFoot: 'Left' | 'Right' | 'Both';
  height: string;
  weight: string;
  debutYear: number | string;
  legacyScore: number | string; // e.g., 89/100 or N/A
  allTimeRank: number | string; // e.g., #32 or N/A
  historicalPercentile: number | string; // e.g. 98.4 or N/A
  recordsBrokenCount: number;
  totalRecordsCount: number;
  attributes: AttributeBreakdown;
  evolutionHistory: AttributeHistoryPoint[];
  seasons: SeasonData[];
  clubs: ClubHistory[];
  trophies: TrophyItem[];
  iconicMoments: IconicMoment[];
  isLoadedFromExportDB?: boolean;
  // Season tracking
  season_is_active?: boolean;
  days_until_season_end?: number;
  matches_played?: number;
  latest_match_date?: string;
  current_game_date?: string;
}
