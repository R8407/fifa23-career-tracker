import careerExportData from '../data/career_export.json';
import playerNamesData from '../data/player_names.json';
import { PlayerData, Teammate, LeaguePlayerStat, TrophyItem, SeasonData } from '../types';
import { INITIAL_PLAYER, SQUAD_TEAMMATES, LEAGUE_UNIVERSE_DATA } from '../data/mockData';
import { calculateLegendPoints } from './trophies';
import { getActiveSaveData } from './saveManager';

/**
 * Returns the active career export data.
 * Priority: 1) active save (localStorage), 2) localStorage upload, 3) static import.
 * Components should use this instead of importing careerExportData directly.
 */
export function getActiveCareerData(): any {
  // 1. Check if a save is active
  const saveData = getActiveSaveData();
  if (saveData) return saveData;
  // 2. Check if user uploaded JSON via the upload button
  try {
    const uploaded = localStorage.getItem('career_export_json');
    if (uploaded) return JSON.parse(uploaded);
  } catch {}
  // 3. Fallback to static import
  return careerExportData;
}

// Player name lookup from FIFA database
const PLAYER_NAMES: Record<string, string> = playerNamesData as Record<string, string>;

// Cache for fetched career data
let _cachedCareerData: any = null;
let _fetchTimestamp = 0;

async function fetchCareerData(): Promise<any> {
  // Re-fetch every 5 seconds to pick up new unified.py runs
  const now = Date.now();
  if (_cachedCareerData && (now - _fetchTimestamp) < 5000) {
    return _cachedCareerData;
  }
  try {
    const resp = await fetch(`/career_export.json?t=${now}`);
    if (resp.ok) {
      _cachedCareerData = await resp.json();
      _fetchTimestamp = now;
      return _cachedCareerData;
    }
  } catch {}
  return null;
}

export function getPlayerNameById(playerId: string): string {
  return PLAYER_NAMES[playerId] || '';
}

// Position map from FIFA numeric position id to short text
export const FIFA_POSITION_MAP: Record<string, string> = {
  '0': 'GK',
  '1': 'SW',
  '2': 'RWB',
  '3': 'RB',
  '4': 'CB',
  '5': 'CB',
  '6': 'CB',
  '7': 'LB',
  '8': 'LWB',
  '9': 'RDM',
  '10': 'CDM',
  '11': 'LDM',
  '12': 'RM',
  '13': 'RCM',
  '14': 'CM',
  '15': 'LCM',
  '16': 'LM',
  '17': 'RAM',
  '18': 'CAM',
  '19': 'LAM',
  '20': 'RF',
  '21': 'CF',
  '22': 'LF',
  '23': 'RW',
  '24': 'ST',
  '25': 'ST',
  '26': 'LW',
  '27': 'LW'
};

export interface CareerExportSchema {
  my_player_id: string;
  my_player_profile: {
    playerid: string;
    firstname: string | null;
    lastname: string | null;
    commonname: string | null;
    overallrating: string;
    potential: string;
    height: string;
    weight: string;
    preferredfoot: string;
    birthdate: string;
    preferredposition1: string;
    nationality?: string;
    finishing?: string;
    shotpower?: string;
    longshots?: string;
    volleys?: string;
    penalties?: string;
    vision?: string;
    crossing?: string;
    shortpassing?: string;
    longpassing?: string;
    curve?: string;
    agility?: string;
    balance?: string;
    reactions?: string;
    ballcontrol?: string;
    dribbling?: string;
    composure?: string;
    interceptions?: string;
    headingaccuracy?: string;
    defensiveawareness?: string;
    standingtackle?: string;
    slidingtackle?: string;
    stamina?: string;
    strength?: string;
    jumping?: string;
    aggression?: string;
    acceleration?: string;
    sprintspeed?: string;
  };
  my_team_id: string;
  my_squad: Array<{
    squad_position: string;
    jerseynumber: string;
    form: string;
    leaguegoals: string;
    leagueappearances: string;
    playerid: string;
    firstname: string | null;
    lastname: string | null;
    commonname: string | null;
    overallrating: string;
    potential: string;
    height: string;
    weight: string;
    preferredfoot: string;
    birthdate: string;
    preferredposition1: string;
    nationality?: string;
  }>;
  elite_players_86_plus: Array<{
    playerid: string;
    firstname: string | null;
    lastname: string | null;
    commonname: string | null;
    overallrating: string;
    potential: string;
    height: string;
    weight: string;
    preferredfoot: string;
    birthdate: string;
    preferredposition1: string;
  }>;
  top_scorers_by_league: Record<string, Array<{
    teamname: string;
    leaguegoals: string;
    leagueappearances: string;
    playerid: string;
    firstname: string | null;
    lastname: string | null;
    commonname: string | null;
    overallrating: string;
    potential: string;
    height: string;
    weight: string;
    preferredfoot: string;
    birthdate: string;
    preferredposition1: string;
  }>>;
  known_gaps?: {
    ucl_scorers?: string;
    market_value?: string;
  };
}

export function formatPlayerName(p: { firstname: string | null; lastname: string | null; commonname: string | null }): string {
  if (p.commonname && p.commonname.trim()) return p.commonname.trim();
  const parts = [p.firstname, p.lastname].filter(Boolean).map(s => s?.trim());
  if (parts.length > 0) return parts.join(' ');
  return 'Unknown Player';
}

/**
 * Converts FIFA internal birthdate (days since 1583-01-01, Gregorian calendar start) to a real date and calculates age.
 * Example: 155198 → Jan 5, 2000 (Ethan Ampadu)
 */
function fifaBirthdateToAge(birthdate: string): number {
  const days = parseInt(birthdate, 10);
  if (isNaN(days) || days <= 0) return 0;
  // FIFA epoch is January 1, 1583 (start of Gregorian calendar)
  const epoch = new Date(1583, 0, 1);
  const birth = new Date(epoch.getTime() + days * 86400000);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * FIFA nationality ID to country name mapping (partial - covers common IDs)
 */
export const FIFA_NATIONALITY_MAP: Record<string, { name: string; flag: string }> = {
  '7': { name: 'Argentina', flag: '🇦🇷' },
  '11': { name: 'Belgium', flag: '🇧🇪' },
  '14': { name: 'Brazil', flag: '🇧🇷' },
  '18': { name: 'Colombia', flag: '🇨🇴' },
  '27': { name: 'Croatia', flag: '🇭🇷' },
  '38': { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  '45': { name: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  '46': { name: 'France', flag: '🇫🇷' },
  '50': { name: 'Germany', flag: '🇩🇪' },
  '54': { name: 'Netherlands', flag: '🇳🇱' },
  '58': { name: 'Portugal', flag: '🇵🇹' },
  '13': { name: 'Chile', flag: '🇨🇱' },
  '22': { name: 'Denmark', flag: '🇩🇰' },
  '34': { name: 'Egypt', flag: '🇪🇬' },
  '37': { name: 'Ghana', flag: '🇬🇭' },
  '52': { name: 'Nigeria', flag: '🇳🇬' },
  '55': { name: 'Norway', flag: '🇳🇴' },
  '60': { name: 'Poland', flag: '🇵🇱' },
  '62': { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  '68': { name: 'Spain', flag: '🇪🇸' },
  '75': { name: 'Turkey', flag: '🇹🇷' },
  '82': { name: 'Uruguay', flag: '🇺🇾' },
  '84': { name: 'USA', flag: '🇺🇸' },
  '86': { name: 'Senegal', flag: '🇸🇳' },
  '89': { name: 'Morocco', flag: '🇲🇦' },
  '95': { name: 'Japan', flag: '🇯🇵' },
  '97': { name: 'South Korea', flag: '🇰🇷' },
  '100': { name: 'China', flag: '🇨🇳' },
  '101': { name: 'Mexico', flag: '🇲🇽' },
  '103': { name: 'Ireland', flag: '🇮🇪' },
  '104': { name: 'Italy', flag: '🇮🇹' },
  '107': { name: 'Czech Republic', flag: '🇨🇿' },
  '110': { name: 'Sweden', flag: '🇸🇪' },
  '122': { name: 'Cameroon', flag: '🇨🇲' },
  '123': { name: 'Ivory Coast', flag: '🇨🇮' },
  '126': { name: 'Senegal', flag: '🇸🇳' },
  '130': { name: 'Algeria', flag: '🇩🇿' },
  '136': { name: 'Mali', flag: '🇲🇱' },
  '137': { name: 'DR Congo', flag: '🇨🇩' },
  '146': { name: 'Serbia', flag: '🇷🇸' },
  '150': { name: 'Austria', flag: '🇦🇹' },
  '155': { name: 'Ukraine', flag: '🇺🇦' },
  '157': { name: 'Tunisia', flag: '🇹🇳' },
  '162': { name: 'Burkina Faso', flag: '🇧🇫' },
  '165': { name: 'Montenegro', flag: '🇲🇪' },
  '167': { name: 'Georgia', flag: '🇬🇪' },
  '168': { name: 'Czech Republic', flag: '🇨🇿' },
  '169': { name: 'Bulgaria', flag: '🇧🇬' },
  '171': { name: 'Hungary', flag: '🇭🇺' },
  '172': { name: 'Finland', flag: '🇫🇮' },
  '173': { name: 'Romania', flag: '🇷🇴' },
  '176': { name: 'Bosnia', flag: '🇧🇦' },
  '179': { name: 'North Macedonia', flag: '🇲🇰' },
  '180': { name: 'Greece', flag: '🇬🇷' },
  '182': { name: 'Israel', flag: '🇮🇱' },
  '183': { name: 'Iceland', flag: '🇮🇸' },
  '184': { name: 'Slovakia', flag: '🇸🇰' },
  '186': { name: 'Slovenia', flag: '🇸🇮' },
  '187': { name: 'Albania', flag: '🇦🇱' },
  '188': { name: 'Armenia', flag: '🇦🇲' },
  '189': { name: 'Cyprus', flag: '🇨🇾' },
  '190': { name: 'Estonia', flag: '🇪🇪' },
  '191': { name: 'Latvia', flag: '🇱🇻' },
  '192': { name: 'Lithuania', flag: '🇱🇹' },
  '193': { name: 'Moldova', flag: '🇲🇩' },
  '194': { name: 'North Ireland', flag: '🇬🇧' },
  '195': { name: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  '196': { name: 'Zambia', flag: '🇿🇲' },
  '197': { name: 'Zimbabwe', flag: '🇿🇼' },
  '198': { name: 'Uganda', flag: '🇺🇬' },
  '199': { name: 'Kenya', flag: '🇰🇪' },
  '200': { name: 'Gambia', flag: '🇬🇲' },
  '201': { name: 'Madagascar', flag: '🇲🇬' },
  '202': { name: 'Tanzania', flag: '🇹🇿' },
  '203': { name: 'Sudan', flag: '🇸🇩' },
  '204': { name: 'Namibia', flag: '🇳🇦' },
  '205': { name: 'Angola', flag: '🇦🇴' },
  '206': { name: 'Libya', flag: '🇱🇾' },
  '207': { name: 'Benin', flag: '🇧🇯' },
  '208': { name: 'Gabon', flag: '🇬🇦' },
  '209': { name: 'Mauritania', flag: '🇲🇷' },
  '210': { name: 'Guinea', flag: '🇬🇳' },
  '211': { name: 'Sierra Leone', flag: '🇸🇱' },
  '212': { name: 'Togo', flag: '🇹🇬' },
  '213': { name: 'Burundi', flag: '🇧🇮' },
  '214': { name: 'Rwanda', flag: '🇷🇼' },
  '215': { name: 'Ethiopia', flag: '🇪🇹' },
  '216': { name: 'Somalia', flag: '🇸🇴' },
  '217': { name: 'Eritrea', flag: '🇪🇷' },
  '218': { name: 'Djibouti', flag: '🇩🇯' },
  '219': { name: 'Comoros', flag: '🇰🇲' },
  '220': { name: 'Mauritius', flag: '🇲🇺' },
  '221': { name: 'Seychelles', flag: '🇸🇨' },
  '222': { name: 'Reunion', flag: '🇷🇪' },
  '223': { name: 'Cape Verde', flag: '🇨🇻' },
  '224': { name: 'Sao Tome', flag: '🇸🇹' },
  '225': { name: 'Guinea-Bissau', flag: '🇬🇼' },
  '226': { name: 'Equatorial Guinea', flag: '🇬🇶' },
  '227': { name: 'Chad', flag: '🇹🇩' },
  '228': { name: 'Central African Republic', flag: '🇨🇫' },
  '229': { name: 'Republic of the Congo', flag: '🇨🇬' },
  '230': { name: 'Democratic Republic of the Congo', flag: '🇨🇩' },
  '231': { name: 'Uganda', flag: '🇺🇬' },
  '232': { name: 'Kenya', flag: '🇰🇪' },
  '233': { name: 'Tanzania', flag: '🇹🇿' },
  '234': { name: 'Rwanda', flag: '🇷🇼' },
  '235': { name: 'Burundi', flag: '🇧🇮' },
  '236': { name: 'South Sudan', flag: '🇸🇸' },
  '237': { name: 'Somalia', flag: '🇸🇴' },
  '238': { name: 'Djibouti', flag: '🇩🇯' },
  '239': { name: 'Eritrea', flag: '🇪🇷' },
  '240': { name: 'Ethiopia', flag: '🇪🇹' },
  '241': { name: 'Sudan', flag: '🇸🇩' },
  '242': { name: 'South Africa', flag: '🇿🇦' },
  '243': { name: 'Namibia', flag: '🇳🇦' },
  '244': { name: 'Botswana', flag: '🇧🇼' },
  '245': { name: 'Zimbabwe', flag: '🇿🇼' },
  '246': { name: 'Zambia', flag: '🇿🇲' },
  '247': { name: 'Malawi', flag: '🇲🇼' },
  '248': { name: 'Mozambique', flag: '🇲🇿' },
  '249': { name: 'Angola', flag: '🇦🇴' },
  '250': { name: 'Madagascar', flag: '🇲🇬' },
  '251': { name: 'Mauritius', flag: '🇲🇺' },
  '252': { name: 'Seychelles', flag: '🇸🇨' },
  '253': { name: 'Comoros', flag: '🇰🇲' },
  '254': { name: 'Lesotho', flag: '🇱🇸' },
  '255': { name: 'Eswatini', flag: '🇸🇿' },
  '256': { name: 'Libya', flag: '🇱🇾' },
  '257': { name: 'Tunisia', flag: '🇹🇳' },
  '258': { name: 'Algeria', flag: '🇩🇿' },
  '259': { name: 'Morocco', flag: '🇲🇦' },
  '260': { name: 'Egypt', flag: '🇪🇬' },
  '261': { name: 'Iraq', flag: '🇮🇶' },
  '262': { name: 'Iran', flag: '🇮🇷' },
  '263': { name: 'Saudi Arabia', flag: '🇸🇦' },
  '264': { name: 'Yemen', flag: '🇾🇪' },
  '265': { name: 'Oman', flag: '🇴🇲' },
  '266': { name: 'United Arab Emirates', flag: '🇦🇪' },
  '267': { name: 'Qatar', flag: '🇶🇦' },
  '268': { name: 'Kuwait', flag: '🇰🇼' },
  '269': { name: 'Bahrain', flag: '🇧🇭' },
  '270': { name: 'Jordan', flag: '🇯🇴' },
  '271': { name: 'Syria', flag: '🇸🇾' },
  '272': { name: 'Lebanon', flag: '🇱🇧' },
  '273': { name: 'Israel', flag: '🇮🇱' },
  '274': { name: 'Palestine', flag: '🇵🇸' },
  '275': { name: 'Turkey', flag: '🇹🇷' },
  '276': { name: 'Cyprus', flag: '🇨🇾' },
  '277': { name: 'Greece', flag: '🇬🇷' },
  '278': { name: 'Albania', flag: '🇦🇱' },
  '279': { name: 'North Macedonia', flag: '🇲🇰' },
  '280': { name: 'Kosovo', flag: '🇽🇰' },
  '281': { name: 'Montenegro', flag: '🇲🇪' },
  '282': { name: 'Serbia', flag: '🇷🇸' },
  '283': { name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  '284': { name: 'Croatia', flag: '🇭🇷' },
  '285': { name: 'Slovenia', flag: '🇸🇮' },
  '286': { name: 'Slovakia', flag: '🇸🇰' },
  '287': { name: 'Czech Republic', flag: '🇨🇿' },
  '288': { name: 'Poland', flag: '🇵🇱' },
  '289': { name: 'Hungary', flag: '🇭🇺' },
  '290': { name: 'Romania', flag: '🇷🇴' },
  '291': { name: 'Bulgaria', flag: '🇧🇬' },
  '292': { name: 'Moldova', flag: '🇲🇩' },
  '293': { name: 'Ukraine', flag: '🇺🇦' },
  '294': { name: 'Belarus', flag: '🇧🇾' },
  '295': { name: 'Lithuania', flag: '🇱🇹' },
  '296': { name: 'Latvia', flag: '🇱🇻' },
  '297': { name: 'Estonia', flag: '🇪🇪' },
  '298': { name: 'Finland', flag: '🇫🇮' },
  '299': { name: 'Sweden', flag: '🇸🇪' },
  '300': { name: 'Norway', flag: '🇳🇴' },
  '301': { name: 'Denmark', flag: '🇩🇰' },
  '302': { name: 'Iceland', flag: '🇮🇸' },
  '303': { name: 'Ireland', flag: '🇮🇪' },
  '304': { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  '305': { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  '306': { name: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  '307': { name: 'Northern Ireland', flag: '🇬🇧' },
  '308': { name: 'Germany', flag: '🇩🇪' },
  '309': { name: 'Austria', flag: '🇦🇹' },
  '310': { name: 'Switzerland', flag: '🇨🇭' },
  '311': { name: 'Netherlands', flag: '🇳🇱' },
  '312': { name: 'Belgium', flag: '🇧🇪' },
  '313': { name: 'France', flag: '🇫🇷' },
  '314': { name: 'Spain', flag: '🇪🇸' },
  '315': { name: 'Portugal', flag: '🇵🇹' },
  '316': { name: 'Italy', flag: '🇮🇹' },
  '317': { name: 'San Marino', flag: '🇸🇲' },
  '318': { name: 'Malta', flag: '🇲🇹' },
  '319': { name: 'Andorra', flag: '🇦🇩' },
  '320': { name: 'Liechtenstein', flag: '🇱🇮' },
  '321': { name: 'Monaco', flag: '🇲🇨' },
  '322': { name: 'Gibraltar', flag: '🇬🇮' },
  '323': { name: 'Vatican City', flag: '🇻🇦' },
  '324': { name: 'Luxembourg', flag: '🇱🇺' },
  '325': { name: 'Brazil', flag: '🇧🇷' },
  '326': { name: 'Argentina', flag: '🇦🇷' },
  '327': { name: 'Uruguay', flag: '🇺🇾' },
  '328': { name: 'Paraguay', flag: '🇵🇾' },
  '329': { name: 'Chile', flag: '🇨🇱' },
  '330': { name: 'Colombia', flag: '🇨🇴' },
  '331': { name: 'Ecuador', flag: '🇪🇨' },
  '332': { name: 'Peru', flag: '🇵🇪' },
  '333': { name: 'Bolivia', flag: '🇧🇴' },
  '334': { name: 'Venezuela', flag: '🇻🇪' },
  '335': { name: 'Guyana', flag: '🇬🇾' },
  '336': { name: 'Suriname', flag: '🇸🇷' },
  '337': { name: 'French Guiana', flag: '🇬🇫' },
  '338': { name: 'USA', flag: '🇺🇸' },
  '339': { name: 'Canada', flag: '🇨🇦' },
  '340': { name: 'Mexico', flag: '🇲🇽' },
  '341': { name: 'Jamaica', flag: '🇯🇲' },
  '342': { name: 'Trinidad and Tobago', flag: '🇹🇹' },
  '343': { name: 'Haiti', flag: '🇭🇹' },
  '344': { name: 'Dominican Republic', flag: '🇩🇴' },
  '345': { name: 'Cuba', flag: '🇨🇺' },
  '346': { name: 'Panama', flag: '🇵🇦' },
  '347': { name: 'Costa Rica', flag: '🇨🇷' },
  '348': { name: 'Honduras', flag: '🇭🇳' },
  '349': { name: 'Guatemala', flag: '🇬🇹' },
  '350': { name: 'El Salvador', flag: '🇸🇻' },
  '351': { name: 'Nicaragua', flag: '🇳🇮' },
  '352': { name: 'Belize', flag: '🇧🇿' },
  '353': { name: 'Barbados', flag: '🇧🇧' },
  '354': { name: 'Bahamas', flag: '🇧🇸' },
  '355': { name: 'Bermuda', flag: '🇧🇲' },
  '356': { name: 'Antigua and Barbuda', flag: '🇦🇬' },
  '357': { name: 'Saint Lucia', flag: '🇱🇨' },
  '358': { name: 'Grenada', flag: '🇬🇩' },
  '359': { name: 'Saint Kitts and Nevis', flag: '🇰🇳' },
  '360': { name: 'Saint Vincent and the Grenadines', flag: '🇻🇨' },
  '361': { name: 'Dominica', flag: '🇩🇲' },
  '362': { name: 'Australia', flag: '🇦🇺' },
  '363': { name: 'New Zealand', flag: '🇳🇿' },
  '364': { name: 'Japan', flag: '🇯🇵' },
  '365': { name: 'South Korea', flag: '🇰🇷' },
  '366': { name: 'China', flag: '🇨🇳' },
  '367': { name: 'India', flag: '🇮🇳' },
  '368': { name: 'Thailand', flag: '🇹🇭' },
  '369': { name: 'Vietnam', flag: '🇻🇳' },
  '370': { name: 'Indonesia', flag: '🇮🇩' },
  '371': { name: 'Malaysia', flag: '🇲🇾' },
  '372': { name: 'Philippines', flag: '🇵🇭' },
  '373': { name: 'Singapore', flag: '🇸🇬' },
  '374': { name: 'Taiwan', flag: '🇹🇼' },
  '375': { name: 'Hong Kong', flag: '🇭🇰' },
  '376': { name: 'Myanmar', flag: '🇲🇲' },
  '377': { name: 'Cambodia', flag: '🇰🇭' },
  '378': { name: 'Laos', flag: '🇱🇦' },
  '379': { name: 'Bangladesh', flag: '🇧🇩' },
  '380': { name: 'Pakistan', flag: '🇵🇰' },
  '381': { name: 'Sri Lanka', flag: '🇱🇰' },
  '382': { name: 'Nepal', flag: '🇳🇵' },
  '383': { name: 'Maldives', flag: '🇲🇻' },
  '384': { name: 'Bhutan', flag: '🇧🇹' },
  '385': { name: 'Mongolia', flag: '🇲🇳' },
  '386': { name: 'Kazakhstan', flag: '🇰🇿' },
  '387': { name: 'Uzbekistan', flag: '🇺🇿' },
  '388': { name: 'Turkmenistan', flag: '🇹🇲' },
  '389': { name: 'Kyrgyzstan', flag: '🇰🇬' },
  '390': { name: 'Tajikistan', flag: '🇹🇯' },
  '391': { name: 'Afghanistan', flag: '🇦🇫' },
  '392': { name: 'Russia', flag: '🇷🇺' },
  '393': { name: 'Israel', flag: '🇮🇱' },
  '394': { name: 'Cyprus', flag: '🇨🇾' },
  '395': { name: 'Greece', flag: '🇬🇷' },
  '396': { name: 'Turkey', flag: '🇹🇷' },
  '397': { name: 'Lebanon', flag: '🇱🇧' },
  '398': { name: 'Syria', flag: '🇸🇾' },
  '399': { name: 'Jordan', flag: '🇯🇴' },
  '400': { name: 'Iraq', flag: '🇮🇶' },
  '401': { name: 'Iran', flag: '🇮🇷' },
  '402': { name: 'Saudi Arabia', flag: '🇸🇦' },
  '403': { name: 'Yemen', flag: '🇾🇪' },
  '404': { name: 'Oman', flag: '🇴🇲' },
  '405': { name: 'United Arab Emirates', flag: '🇦🇪' },
  '406': { name: 'Qatar', flag: '🇶🇦' },
  '407': { name: 'Kuwait', flag: '🇰🇼' },
  '408': { name: 'Bahrain', flag: '🇧🇭' },
  '409': { name: 'Palestine', flag: '🇵🇸' },
  '410': { name: 'South Africa', flag: '🇿🇦' },
  '411': { name: 'Egypt', flag: '🇪🇬' },
  '412': { name: 'Morocco', flag: '🇲🇦' },
  '413': { name: 'Algeria', flag: '🇩🇿' },
  '414': { name: 'Tunisia', flag: '🇹🇳' },
  '415': { name: 'Libya', flag: '🇱🇾' },
  '416': { name: 'Sudan', flag: '🇸🇩' },
  '417': { name: 'Ghana', flag: '🇬🇭' },
  '418': { name: 'Nigeria', flag: '🇳🇬' },
  '419': { name: 'Senegal', flag: '🇸🇳' },
  '420': { name: 'Cameroon', flag: '🇨🇲' },
  '421': { name: 'Ivory Coast', flag: '🇨🇮' },
  '422': { name: 'Mali', flag: '🇲🇱' },
  '423': { name: 'Burkina Faso', flag: '🇧🇫' },
  '424': { name: 'Niger', flag: '🇳🇪' },
  '425': { name: 'Guinea', flag: '🇬🇳' },
  '426': { name: 'Chad', flag: '🇹🇩' },
  '427': { name: 'Benin', flag: '🇧🇯' },
  '428': { name: 'Togo', flag: '🇹🇬' },
  '429': { name: 'Sierra Leone', flag: '🇸🇱' },
  '430': { name: 'Liberia', flag: '🇱🇷' },
  '431': { name: 'Gambia', flag: '🇬🇲' },
  '432': { name: 'Guinea-Bissau', flag: '🇬🇼' },
  '433': { name: 'Cape Verde', flag: '🇨🇻' },
  '434': { name: 'Equatorial Guinea', flag: '🇬🇶' },
  '435': { name: 'Gabon', flag: '🇬🇦' },
  '436': { name: 'Republic of the Congo', flag: '🇨🇬' },
  '437': { name: 'Democratic Republic of the Congo', flag: '🇨🇩' },
  '438': { name: 'Uganda', flag: '🇺🇬' },
  '439': { name: 'Kenya', flag: '🇰🇪' },
  '440': { name: 'Tanzania', flag: '🇹🇿' },
  '441': { name: 'Rwanda', flag: '🇷🇼' },
  '442': { name: 'Burundi', flag: '🇧🇮' },
  '443': { name: 'Ethiopia', flag: '🇪🇹' },
  '444': { name: 'Somalia', flag: '🇸🇴' },
  '445': { name: 'Eritrea', flag: '🇪🇷' },
  '446': { name: 'Djibouti', flag: '🇩🇯' },
  '447': { name: 'Mauritius', flag: '🇲🇺' },
  '448': { name: 'Seychelles', flag: '🇸🇨' },
  '449': { name: 'Comoros', flag: '🇰🇲' },
  '450': { name: 'Madagascar', flag: '🇲🇬' },
  '451': { name: 'Mozambique', flag: '🇲🇿' },
  '452': { name: 'Angola', flag: '🇦🇴' },
  '453': { name: 'Zambia', flag: '🇿🇲' },
  '454': { name: 'Zimbabwe', flag: '🇿🇼' },
  '455': { name: 'Malawi', flag: '🇲🇼' },
  '456': { name: 'Namibia', flag: '🇳🇦' },
  '457': { name: 'Botswana', flag: '🇧🇼' },
  '458': { name: 'Lesotho', flag: '🇱🇸' },
  '459': { name: 'Eswatini', flag: '🇸🇿' },
  '460': { name: 'Mauritania', flag: '🇲🇷' },
  '461': { name: 'South Sudan', flag: '🇸🇸' }
};

/**
 * Builds the runtime PlayerData by integrating career_export.json into INITIAL_PLAYER.
 * Replaces real extracted player values (Overall, Potential, Height, Weight, Foot, Position, Name, Market Value -> N/A)
 * keeps rich historical career timeline and iconics intact while overwriting real-time properties safely.
 */
export function getMergedPlayerData(exportData?: CareerExportSchema): PlayerData {
  const data = exportData || getActiveCareerData() as CareerExportSchema;
  const exportDataFinal = data;
  const profile = exportDataFinal.my_player_profile;
  const rawOverall = parseInt(profile.overallrating, 10) || 0;
  const rawPotential = parseInt(profile.potential, 10) || 0;
  const rawHeight = profile.height ? `${profile.height} cm` : 'N/A';
  const rawWeight = profile.weight ? `${profile.weight} kg` : 'N/A';
  const prefFoot = profile.preferredfoot === '2' ? 'Left' : profile.preferredfoot === '1' ? 'Right' : 'Both';
  const posText = FIFA_POSITION_MAP[profile.preferredposition1] || 'Unknown';
  const nameText = formatPlayerName(profile) !== 'Unknown Player' ? formatPlayerName(profile) : '';

  // Calculate age from latest season data (career export tracks per-season age)
  const seasons = (exportDataFinal as any).seasons || [];
  const latestSeason = seasons.length > 0 ? seasons[seasons.length - 1] : null;
  const age = latestSeason?.age || 0;

  // Find squad entry for user player if available
  const userSquadEntry = exportDataFinal.my_squad?.find(p => p.playerid === exportDataFinal.my_player_id);
  const jerseyNo = userSquadEntry?.jerseynumber ? parseInt(userSquadEntry.jerseynumber, 10) : 0;

  // Use profile's currentClub if available, fall back to lookup
  const teamName = (exportDataFinal as any).my_player_profile?.currentClub || 'Unknown Club';

  // Map FIFA nationality ID to name and flag
  const nationalId = profile.nationality?.toString() || '';
  const nationalityData = FIFA_NATIONALITY_MAP[nationalId] || { name: 'Unknown', flag: '⚽' };

  // Calculate main 6 attributes from sub-attributes (FIFA style)
  const num = (val: string | undefined) => parseInt(val || '0', 10) || 0;

  const acceleration = num(profile.acceleration);
  const sprintSpeed = num(profile.sprintspeed);
  const finishing = num(profile.finishing);
  const shotPower = num(profile.shotpower);
  const longShots = num(profile.longshots);
  const volleys = num(profile.volleys);
  const penaltiesVal = num(profile.penalties);
  const vision = num(profile.vision);
  const crossing = num(profile.crossing);
  const shortPassing = num(profile.shortpassing);
  const longPassing = num(profile.longpassing);
  const curve = num(profile.curve);
  const agility = num(profile.agility);
  const balance = num(profile.balance);
  const reactions = num(profile.reactions);
  const ballControl = num(profile.ballcontrol);
  const dribblingStat = num(profile.dribbling);
  const composure = num(profile.composure);
  const interceptions = num(profile.interceptions);
  const headingAcc = num(profile.headingaccuracy);
  const defAwareness = num(profile.defensiveawareness);
  const standingTackle = num(profile.standingtackle);
  const slidingTackle = num(profile.slidingtackle);
  const stamina = num(profile.stamina);
  const strength = num(profile.strength);
  const jumping = num(profile.jumping);
  const aggression = num(profile.aggression);

  // Main 6 averages (FIFA style)
  const pace = Math.round((acceleration + sprintSpeed) / 2);
  const shooting = Math.round((finishing + shotPower + longShots + volleys + penaltiesVal) / 5);
  const passing = Math.round((vision + crossing + shortPassing + longPassing + curve) / 5);
  const dribbling = Math.round((agility + balance + reactions + ballControl + dribblingStat + composure) / 6);
  const defending = Math.round((interceptions + headingAcc + defAwareness + standingTackle + slidingTackle) / 5);
  const physical = Math.round((stamina + strength + jumping + aggression) / 4);

  return {
    name: nameText,
    nickname: '',
    position: posText as any,
    overall: rawOverall,
    potential: rawPotential,
    age: age || 0,
    careerStartYear: 0,
    currentClub: teamName,
    clubLogoBg: 'bg-zinc-800',
    nationality: nationalityData.name,
    nationalityFlag: nationalityData.flag,
    marketValue: (exportDataFinal as any).market_value ? `€${((exportDataFinal as any).market_value / 1000000).toFixed(1)}M` : 'No data yet',
    weeklySalary: (exportDataFinal as any).wage ? `€${parseInt((exportDataFinal as any).wage).toLocaleString()}/week` : 'No data yet',
    jerseyNumber: jerseyNo,
    preferredFoot: prefFoot as any,
    height: rawHeight,
    weight: rawWeight,
    debutYear: 0,
    legacyScore: (() => {
      const totalGoalsCalc = (exportDataFinal as any).total_goals || 0;
      const totalAssistsCalc = (exportDataFinal as any).total_assists || 0;
      return calculateLegendPoints({
        goals: totalGoalsCalc,
        assists: totalAssistsCalc,
        ballondOr: (exportDataFinal as any).trophies?.find((t: any) => t.iconType === 'ballondor')?.quantity || 0,
        worldCup: (exportDataFinal as any).trophies?.find((t: any) => t.iconType === 'worldcup')?.quantity || 0,
        championsLeague: (exportDataFinal as any).trophies?.find((t: any) => t.iconType === 'champions')?.quantity || 0,
        europaLeague: (exportDataFinal as any).trophies?.find((t: any) => t.iconType === 'europaleague')?.quantity || 0,
        leagueTitles: (exportDataFinal as any).trophies?.filter((t: any) => t.iconType === 'league').reduce((acc: number, t: any) => acc + t.quantity, 0) || 0,
        cupTrophies: (exportDataFinal as any).trophies?.filter((t: any) => t.iconType === 'cup').reduce((acc: number, t: any) => acc + t.quantity, 0) || 0,
        goldenBoot: (exportDataFinal as any).trophies?.find((t: any) => t.iconType === 'goldenboot')?.quantity || 0,
        assistKing: (exportDataFinal as any).trophies?.find((t: any) => t.iconType === 'assistking')?.quantity || 0,
        manOfTheMatch: (exportDataFinal as any).trophies?.find((t: any) => t.iconType === 'manofmatch')?.quantity || 0,
        popularOpinionBonus: 20
      });
    })(),
    allTimeRank: 0,
    historicalPercentile: 0,
    recordsBrokenCount: 0,
    totalRecordsCount: 0,
    attributes: {
      pace,
      shooting,
      passing,
      dribbling,
      defending,
      physical,
      acceleration,
      sprintSpeed,
      finishing,
      shotPower,
      longShots,
      volleys,
      penalties: penaltiesVal,
      vision,
      crossing,
      shortPassing,
      longPassing,
      curve,
      agility,
      balance,
      reactions,
      ballControl,
      dribblingStat,
      composure,
      interceptions,
      headingAcc,
      defAwareness,
      standingTackle,
      slidingTackle,
      stamina,
      strength,
      jumping,
      aggression
    },
    evolutionHistory: [],
    seasons: (exportDataFinal as any).seasons || [],
    season_is_active: (exportDataFinal as any).season_is_active ?? true,
    days_until_season_end: (exportDataFinal as any).days_until_season_end ?? 0,
    matches_played: (exportDataFinal as any).matches_played ?? 0,
    latest_match_date: (exportDataFinal as any).latest_match_date ?? '',
    current_game_date: (exportDataFinal as any).current_game_date ?? '',
    clubs: (() => {
      const clubHistory = (exportDataFinal as any).club_history || [];
      if (clubHistory.length === 0) {
        return [{
          id: teamName.toLowerCase().replace(/\s+/g, '-'),
          clubName: teamName,
          league: 'Unknown',
          logoBg: 'bg-zinc-800',
          logoText: teamName.charAt(0),
          years: (exportDataFinal as any).isOnLoan ? `On Loan from ${(exportDataFinal as any).parentClub || 'Parent Club'}` : 'Current',
          apps: (exportDataFinal as any).total_appearances || parseInt(userSquadEntry?.leagueappearances || '0', 10),
          goals: (exportDataFinal as any).total_goals || parseInt(userSquadEntry?.leaguegoals || '0', 10),
          assists: (exportDataFinal as any).total_assists || parseInt((userSquadEntry as any)?.assists || '0', 10) || 0,
          avgRating: 0,
          trophiesWon: 0,
          transferFee: (exportDataFinal as any).isOnLoan ? `Loan from ${(exportDataFinal as any).parentClub || 'Parent Club'}` : 'Permanent',
          notableMoment: 'First professional season'
        }];
      }
      return clubHistory.map((ch: any) => ({
        id: String(ch.teamid),
        clubName: ch.teamname || 'Unknown',
        league: ch.league || 'Unknown',
        logoBg: 'bg-zinc-800',
        logoText: (ch.teamname || 'U').charAt(0),
        years: ch.isCurrentClub ? 'Current' : ch.seasons?.map((s: any) => s.season).join(', ') || '',
        apps: ch.totalApps || 0,
        goals: ch.totalGoals || 0,
        assists: ch.totalAssists || 0,
        avgRating: (() => {
          const completedSeasons = (ch.seasons || []).filter((s: any) => s.apps > 0);
          if (completedSeasons.length === 0) return 0;
          const totalApps = completedSeasons.reduce((sum: number, s: any) => sum + s.apps, 0);
          if (totalApps === 0) return 0;
          const weighted = completedSeasons.reduce((sum: number, s: any) => sum + (s.avgRating || 0) * s.apps, 0);
          return Math.round((weighted / totalApps) * 100) / 100;
        })(),
        trophiesWon: (ch.trophiesWithPlayer?.league || 0) + (ch.trophiesWithPlayer?.domesticCup || 0) + (ch.trophiesWithPlayer?.ucl || 0) + (ch.trophiesWithPlayer?.uel || 0) + (ch.trophiesWithPlayer?.uecl || 0),
        transferFee: ch.isCurrentClub ? 'Permanent' : 'Permanent',
        notableMoment: ch.isCurrentClub ? 'Current Club' : `${ch.totalApps} appearances, ${ch.totalGoals} goals`
      }));
    })(),
    // Merge career export trophies with computed award trophies from seasons
    trophies: mergeTrophiesWithAwards(
      (exportDataFinal as any).trophies || [],
      (exportDataFinal as any).seasons || [],
      (exportDataFinal as any).days_until_season_end ?? 0,
      (exportDataFinal as any).season_is_active ?? true
    ),
    // Restore user-uploaded iconic moments from localStorage (they survive resyncs)
    iconicMoments: (() => {
      try {
        const stored = localStorage.getItem('career_iconic_moments');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
      return (exportDataFinal as any).iconicMoments || [];
    })(),
    isLoadedFromExportDB: true,
    isOnLoan: (exportDataFinal as any).isOnLoan || false,
    parentClub: (exportDataFinal as any).parentClub || '',
    isLoanToBuy: (exportDataFinal as any).isLoanToBuy || false,
    headassetid: (exportDataFinal as any).headassetid || (profile as any).headassetid || '',
  };
}

// League trophy cabinet images keyed by FIFA league competition ID.
// 13 = Premier League, 31 = Serie A.
const LEAGUE_TROPHY_IMAGES: Record<string, string> = {
  '13': '/assets/images/trophies/premier-league.webp',
  '31': '/assets/images/trophies/serie-a.webp',
};

/**
 * Merge career export trophies with award trophies.
 * Season-specific awards (Golden Boot, Player of the Season, Best XI, Young Player,
 * Assist King) come ONLY from the game's real individualAwards data — not rating
 * thresholds. MOTM quantity is recalculated from per-season motm totals.
 */
function mergeTrophiesWithAwards(
  baseTrophies: TrophyItem[],
  seasons: SeasonData[],
  currentDaysRemaining: number,
  seasonIsActive: boolean
): TrophyItem[] {
  // Build mutable trophy map from base trophies.
  // Season-specific award types (goldenboot, playerofseason, bestxi, youngplayer, assistking)
  // are excluded here and re-created ONLY from the game's real individualAwards data below —
  // NOT from rating thresholds, which aren't the game's source of truth.
  const COMPUTED_AWARD_TYPES = new Set(['goldenboot', 'playerofseason', 'bestxi', 'youngplayer', 'assistking']);
  const trophyMap = new Map<string, TrophyItem>();
  for (const t of baseTrophies) {
    if (!COMPUTED_AWARD_TYPES.has(t.iconType)) {
      trophyMap.set(t.iconType, { ...t });
    }
  }

  // Helper to get or create trophy
  function ensureTrophy(iconType: TrophyItem['iconType'], id: string, title: string, category: 'Club' | 'Individual' | 'International', description: string, tier: 'Gold' | 'Platinum' | 'Diamond' = 'Gold'): TrophyItem {
    if (trophyMap.has(iconType)) return trophyMap.get(iconType)!;
    const t: TrophyItem = { id, title, category, quantity: 0, yearsWon: [], description, tier, iconType };
    trophyMap.set(iconType, t);
    return t;
  }

  if (!seasons || seasons.length === 0) {
    return Array.from(trophyMap.values());
  }

  // Sort seasons chronologically
  const allSeasons = [...seasons].sort((a, b) => a.id.localeCompare(b.id));

  // Award trophies from the game's real individualAwards (season_cache / career_export data)
  const AWARD_TO_TROPHY: Record<string, { iconType: TrophyItem['iconType']; id: string; title: string; description: string; tier: TrophyItem['tier'] }> = {
    'Young Player of the Year': { iconType: 'youngplayer', id: 't_youngplayer', title: 'Young Player of the Season', description: 'Best young player award (under 23)', tier: 'Gold' },
    'League XI': { iconType: 'bestxi', id: 't_bestxi', title: 'League Best XI', description: 'Inducted into the League Best XI', tier: 'Gold' },
    'Assist King': { iconType: 'assistking', id: 't_assistking', title: 'Assist King', description: 'Led the league in assists', tier: 'Gold' },
    'Golden Boot': { iconType: 'goldenboot', id: 't_goldenboot', title: 'Golden Boot', description: 'Won the league Golden Boot for most goals', tier: 'Platinum' },
    'European Golden Shoe': { iconType: 'goldenboot', id: 't_goldenboot', title: 'Golden Boot', description: 'Won the league Golden Boot for most goals', tier: 'Platinum' },
    'Player of the Season': { iconType: 'playerofseason', id: 't_playerofseason', title: 'Player of the Season', description: 'Voted the best player of the season', tier: 'Diamond' },
  };
  for (const season of allSeasons) {
    const isLastSeason = season === allSeasons[allSeasons.length - 1];
    const isCompleted = isLastSeason
      ? (!seasonIsActive || currentDaysRemaining <= 25)
      : true;
    if (!isCompleted) continue;

    const awards = (season as any).individualAwards || [];
    for (const award of awards) {
      const awardName = typeof award === 'string' ? award : award.name;
      const meta = AWARD_TO_TROPHY[awardName];
      if (!meta) continue;
      const t = ensureTrophy(meta.iconType, meta.id, meta.title, 'Individual', meta.description, meta.tier);
      if (!t.yearsWon.includes(season.season)) {
        t.quantity += 1;
        t.yearsWon.push(season.season);
      }
    }
  }

  // Recalculate MOTM from season data (career_export.json has stale quantity)
  const motmTrophy = ensureTrophy('manofmatch', 't_manofmatch', 'Man of the Match Awards', 'Individual', 'Named Man of the Match in league matches', 'Gold');
  // Use career_export.json quantity as authoritative source (unified.py calculates from cache)
  // Only recalculate if seasons have motm data; otherwise keep the trophy's existing quantity
  let seasonMotmTotal = 0;
  for (const season of allSeasons) {
    const motmCount = season.motm || 0;
    if (motmCount > 0) {
      seasonMotmTotal += motmCount;
    }
  }
  // If seasons have MOTM data, use it; otherwise trust the trophy's base quantity
  if (seasonMotmTotal > 0) {
    motmTrophy.quantity = seasonMotmTotal;
    motmTrophy.yearsWon = allSeasons.filter(s => (s.motm || 0) > 0).map(s => s.season);
  }
  // else: keep existing quantity from career_export.json (set by unified.py from cache)

  // Resolve league trophy image from the season's league competition ID
  const leagueTrophy = trophyMap.get('league');
  if (leagueTrophy) {
    const wonSeason = allSeasons.find(s => leagueTrophy.yearsWon.includes(s.season));
    const leagueId = wonSeason ? String((wonSeason as any).leagueId ?? '') : '';
    if (LEAGUE_TROPHY_IMAGES[leagueId]) {
      leagueTrophy.imagePath = LEAGUE_TROPHY_IMAGES[leagueId];
    }
  }

  return Array.from(trophyMap.values());
}

/**
 * Transforms real squad array from career_export.json into full squad UI data
 */
export function getExportSquad(exportData?: CareerExportSchema): Teammate[] {
  const data = exportData || getActiveCareerData() as CareerExportSchema;
  const exportDataFinal = data;
  if (!exportDataFinal.my_squad || exportDataFinal.my_squad.length === 0) {
    return SQUAD_TEAMMATES;
  }

  return exportDataFinal.my_squad.map((member, idx) => {
    const isUser = member.playerid === exportDataFinal.my_player_id;
    const pos = (FIFA_POSITION_MAP[member.preferredposition1] || 'CM') as any;
    // Try formatPlayerName first, then lookup from player_names.json
    let name = formatPlayerName(member);
    if (name === 'Unknown Player' && member.playerid) {
      name = getPlayerNameById(member.playerid);
    }
    if (!name) {
      name = `${pos} #${member.jerseynumber || idx + 1}`;
    }
    const rating = parseInt(member.overallrating, 10) || 0;
    const goals = parseInt(member.leaguegoals, 10) || 0;
    const apps = parseInt(member.leagueappearances, 10) || 0;

    return {
      id: `export_tm_${member.playerid || idx}`,
      name: name,
      position: pos,
      rating: rating,
      nationality: FIFA_NATIONALITY_MAP[member.nationality]?.name || 'Unknown',
      flag: FIFA_NATIONALITY_MAP[member.nationality]?.flag || '⚽',
      role: pos === 'GK' ? 'Goalkeeper' : pos.includes('B') ? 'Defender' : pos.includes('M') ? 'Midfielder' : 'Attacker',
      isUserPlayer: isUser,
      appsThisSeason: apps,
      goalsThisSeason: isUser ? (exportDataFinal as any).total_goals || goals : goals,
      assistsThisSeason: isUser ? (exportDataFinal as any).total_assists || 0 : 0,
      chemistryLink: 90 + (rating % 10),
      avatarBg: isUser ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-zinc-800'
    };
  });
}

/**
 * Transforms League Universe data using real extracted top scorers from export JSON database.
 * Limits to First 4 top scorers per league as per user requirement.
 * Only updates leagues that have export data; clears assists/ratings (no data in export).
 */
export function getExportLeagueUniverse(exportData?: CareerExportSchema) {
  // Always use mock data for league universe (real 2022/23 stats)
  return { ...LEAGUE_UNIVERSE_DATA };
}
