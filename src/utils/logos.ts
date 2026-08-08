export const REAL_CLUB_LOGOS: Record<string, string> = {
  'Real Madrid': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
  'FC Barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  'Barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  'Manchester City': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  'PSG': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
  'Paris Saint-Germain': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
  'Bayern Munich': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
  'Juventus': 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_icon_%28black%29.svg',
  'Manchester United': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  'Liverpool': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
  'Arsenal': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
  'Chelsea': 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
  'AC Milan': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/AC_Milan_emblem.svg',
  'Inter Milan': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
  'Borussia Dortmund': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
  'Atletico Madrid': 'https://upload.wikimedia.org/wikipedia/en/c/c1/Atletico_Madrid_logo.svg',
};

export const REAL_LEAGUE_LOGOS: Record<string, string> = {
  'La Liga': 'https://upload.wikimedia.org/wikipedia/commons/0/0f/LaLiga_EA_Sports_2023_logo.svg',
  'Premier League': 'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg',
  'UEFA Champions League': 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2021.svg',
  'Champions League': 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2021.svg',
  'UCL': 'https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2021.svg',
  'Serie A': 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Serie_A_logo_2019.svg',
  'Ligue 1': 'https://upload.wikimedia.org/wikipedia/commons/4/49/Ligue1_McDonald%27s_logo.svg',
  'Bundesliga': 'https://upload.wikimedia.org/wikipedia/en/d/df/Bundesliga_logo_%282017%29.svg',
  'FIFA World Cup': 'https://upload.wikimedia.org/wikipedia/en/e/e3/2026_FIFA_World_Cup_official_logo.svg',
  'World Cup': 'https://upload.wikimedia.org/wikipedia/en/e/e3/2026_FIFA_World_Cup_official_logo.svg',
  'Copa del Rey': 'https://upload.wikimedia.org/wikipedia/en/b/bd/Copa_del_Rey_logo.svg',
  'FA Cup': 'https://upload.wikimedia.org/wikipedia/en/7/78/The_FA_Cup.svg'
};

export function getClubLogo(clubName: string): string {
  if (REAL_CLUB_LOGOS[clubName]) {
    return REAL_CLUB_LOGOS[clubName];
  }
  // Check substring match
  const lower = clubName.toLowerCase();
  if (lower.includes('real madrid')) return REAL_CLUB_LOGOS['Real Madrid'];
  if (lower.includes('barcelona')) return REAL_CLUB_LOGOS['FC Barcelona'];
  if (lower.includes('city')) return REAL_CLUB_LOGOS['Manchester City'];
  if (lower.includes('paris') || lower.includes('psg')) return REAL_CLUB_LOGOS['PSG'];
  if (lower.includes('bayern')) return REAL_CLUB_LOGOS['Bayern Munich'];
  if (lower.includes('juventus')) return REAL_CLUB_LOGOS['Juventus'];
  if (lower.includes('united')) return REAL_CLUB_LOGOS['Manchester United'];
  if (lower.includes('liverpool')) return REAL_CLUB_LOGOS['Liverpool'];
  if (lower.includes('arsenal')) return REAL_CLUB_LOGOS['Arsenal'];
  if (lower.includes('chelsea')) return REAL_CLUB_LOGOS['Chelsea'];
  if (lower.includes('milan')) return REAL_CLUB_LOGOS['AC Milan'];
  if (lower.includes('inter')) return REAL_CLUB_LOGOS['Inter Milan'];

  return REAL_CLUB_LOGOS['Real Madrid']; // Default high quality Real Madrid crest
}

export function getLeagueLogo(leagueName: string): string {
  if (REAL_LEAGUE_LOGOS[leagueName]) {
    return REAL_LEAGUE_LOGOS[leagueName];
  }
  const lower = leagueName.toLowerCase();
  if (lower.includes('la liga') || lower.includes('laliga')) return REAL_LEAGUE_LOGOS['La Liga'];
  if (lower.includes('premier')) return REAL_LEAGUE_LOGOS['Premier League'];
  if (lower.includes('champions') || lower.includes('ucl')) return REAL_LEAGUE_LOGOS['UEFA Champions League'];
  if (lower.includes('serie')) return REAL_LEAGUE_LOGOS['Serie A'];
  if (lower.includes('ligue')) return REAL_LEAGUE_LOGOS['Ligue 1'];
  if (lower.includes('bundesliga')) return REAL_LEAGUE_LOGOS['Bundesliga'];
  if (lower.includes('world cup')) return REAL_LEAGUE_LOGOS['FIFA World Cup'];

  return REAL_LEAGUE_LOGOS['La Liga'];
}
