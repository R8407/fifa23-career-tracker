/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlayerData, SeasonData } from './types';
import { INITIAL_PLAYER } from './data/mockData';
import { getMergedPlayerData } from './utils/dataAdapter';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { PlayerProfileView } from './components/PlayerProfileView';
import { GrowthCurveView } from './components/GrowthCurveView';
import { SeasonHistoryView } from './components/SeasonHistoryView';
import { TeamsView } from './components/TeamsView';
import { TacticalSheetView } from './components/TacticalSheetView';
import { LeagueUniverseView } from './components/LeagueUniverseView';
import { CompareView } from './components/CompareView';
import { HeadToHeadView } from './components/HeadToHeadView';
import { NewsFeed } from './components/NewsFeed';
import { SocialMediaView } from './components/SocialMediaView';
import { HallOfFameView } from './components/HallOfFameView';
import { TrophyRoomView } from './components/TrophyRoomView';
import { RecordsProjectionsView } from './components/RecordsProjectionsView';
import { SeasonAwardsView } from './components/SeasonAwardsView';
import { IconicMomentsModal } from './components/IconicMomentsModal';
import { Trophy, Award, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioEngine } from './utils/audio';
import { IconicMoment } from './types';
import { CareerExportSchema } from './utils/dataAdapter';

const POSITION_MAP: Record<number, string> = {
  0: 'GK', 2: 'RWB', 3: 'RB', 4: 'CB', 5: 'CB', 6: 'CB',
  7: 'LB', 8: 'LWB', 10: 'CDM', 11: 'RM', 12: 'CM', 13: 'CM',
  14: 'CM', 15: 'CAM', 16: 'LM', 17: 'LW', 18: 'CAM', 19: 'ST',
  20: 'ST', 21: 'ST', 22: 'CF', 23: 'RW', 24: 'ST', 25: 'ST',
  26: 'LW', 27: 'CF', 28: 'CF', 29: 'RW', 30: 'LW'
};

const TOP_5_LEAGUE_IDS: Record<number, string> = {
  13: 'Premier League', 31: 'La Liga', 16: 'Bundesliga',
  33: 'Serie A', 56: 'Ligue 1'
};

const COUNTRY_MAP: Record<number, [string, string]> = {
  1: ['Argentina', '🇦🇷'], 3: ['Belgium', '🇧🇪'], 4: ['Brazil', '🇧🇷'],
  7: ['England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], 9: ['France', '🇫🇷'], 10: ['Germany', '🇩🇪'],
  14: ['Italy', '🇮🇹'], 15: ['Netherlands', '🇳🇱'], 17: ['Norway', '🇳🇴'],
  19: ['Portugal', '🇵🇹'], 23: ['Spain', '🇪🇸'], 25: ['Switzerland', '🇨🇭'],
  26: ['Turkey', '🇹🇷'], 28: ['Uruguay', '🇺🇾'], 29: ['USA', '🇺🇸'],
  30: ['Wales', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'], 55: ['Canada', '🇨🇦'],
};

function resolveName(p: any): string {
  const cn = (p.commonname || '').trim();
  if (cn) return cn;
  const fn = (p.firstname || '').trim();
  const ln = (p.lastname || '').trim();
  if (fn && ln) return `${fn} ${ln}`;
  if (ln) return ln;
  return `Player #${p.playerid || '?'}`;
}

function convertRawDump(raw: any): CareerExportSchema {
  const career = raw.career || {};
  const indexes = raw.indexes || {};
  const playerProfile = career.player_profile || {};
  const careerUser = career.career_user || {};
  const myPlayerId = String(career.playerid || '');
  const clubId = career.clubteamid || careerUser.clubteamid || 0;

  const allPlayers: Record<string, any> = {};
  (indexes.players || []).forEach((p: any) => { allPlayers[p.playerid] = p; });

  const allLinks: any[] = indexes.player_team_links || [];
  const leagueTeamLinks: any[] = indexes.league_team_links || [];
  const teamLeagueMap: Record<number, number> = {};
  leagueTeamLinks.forEach((l: any) => { teamLeagueMap[l.teamid] = l.leagueid || 0; });

  const natId = playerProfile.nationality || 0;
  const nat = COUNTRY_MAP[natId] || ['Unknown', '🏳️'];

  const myProfile = {
    playerid: myPlayerId,
    firstname: careerUser.firstname || playerProfile.firstname || '',
    lastname: careerUser.surname || playerProfile.lastname || 'Ampadu',
    commonname: careerUser.commonname || playerProfile.commonname || '',
    overallrating: String(playerProfile.overallrating || 65),
    potential: String(playerProfile.potential || 81),
    height: String(playerProfile.height || 181),
    weight: String(playerProfile.weight || 75),
    preferredfoot: String(playerProfile.preferredfoot || 1),
    birthdate: String(playerProfile.birthdate || 155198),
    preferredposition1: String(playerProfile.preferredposition1 || 23),
    nationality: nat[0],
  };

  // Squad
  const squadLinks = allLinks.filter((l: any) => l.teamid === clubId && String(l.playerid) !== myPlayerId);
  const mySquad = squadLinks.map((link: any) => {
    const full = allPlayers[link.playerid] || {};
    const posCode = link.position ?? full.preferredposition1 ?? 0;
    return {
      squad_position: POSITION_MAP[posCode] || 'CM',
      jerseynumber: String(link.jerseynumber || 0),
      form: String(link.form || 3),
      leaguegoals: String(link.leaguegoals || 0),
      leagueappearances: String(link.leagueappearances || 0),
      playerid: String(link.playerid),
      firstname: full.firstname || link.firstname,
      lastname: full.lastname || link.lastname,
      commonname: full.commonname || link.commonname,
      overallrating: String(full.overallrating || 70),
      potential: String(full.potential || 75),
      height: String(full.height || 180),
      weight: String(full.weight || 75),
      preferredfoot: String(full.preferredfoot || 1),
      birthdate: String(full.birthdate || 150000),
      preferredposition1: String(full.preferredposition1 || 14),
    };
  });

  // Elite 86+
  const elite: any[] = [];
  Object.values(allPlayers).forEach((p: any) => {
    if (p.overallrating >= 86) {
      const link = allLinks.find((l: any) => l.playerid === p.playerid);
      elite.push({
        playerid: String(p.playerid),
        firstname: p.firstname, lastname: p.lastname, commonname: p.commonname,
        overallrating: String(p.overallrating), potential: String(p.potential || p.overallrating),
        height: String(p.height || 180), weight: String(p.weight || 75),
        preferredfoot: String(p.preferredfoot || 1), birthdate: String(p.birthdate || 150000),
        preferredposition1: String(p.preferredposition1 || 0),
        teamname: link?.teamname || 'Unknown',
      });
    }
  });

  // Top scorers by league
  const leagueScorers: Record<string, any[]> = {};
  allLinks.forEach((link: any) => {
    const lid = teamLeagueMap[link.teamid];
    if (!lid || !TOP_5_LEAGUE_IDS[lid]) return;
    const goals = link.leaguegoals || 0;
    if (goals <= 0) return;
    const full = allPlayers[link.playerid] || {};
    const leagueName = TOP_5_LEAGUE_IDS[lid];
    if (!leagueScorers[leagueName]) leagueScorers[leagueName] = [];
    leagueScorers[leagueName].push({
      playerid: String(link.playerid),
      firstname: full.firstname, lastname: full.lastname, commonname: full.commonname,
      overallrating: String(full.overallrating || 70), potential: String(full.potential || 75),
      height: String(full.height || 180), weight: String(full.weight || 75),
      preferredfoot: String(full.preferredfoot || 1), birthdate: String(full.birthdate || 150000),
      preferredposition1: String(link.position ?? full.preferredposition1 ?? 0),
      teamname: link.teamname || 'Unknown',
      leaguegoals: String(goals),
      leagueappearances: String(link.leagueappearances || 0),
    });
  });

  const topScorers: Record<string, any[]> = {};
  Object.entries(leagueScorers).forEach(([league, players]) => {
    players.sort((a: any, b: any) => parseInt(b.leaguegoals) - parseInt(a.leaguegoals));
    topScorers[league] = players.slice(0, 4);
  });

  return {
    my_player_id: myPlayerId,
    my_team_id: String(clubId),
    my_player_profile: myProfile,
    my_squad: mySquad,
    elite_players_86_plus: elite,
    top_scorers_by_league: topScorers,
    seasons: [],
    total_goals: 0,
    total_assists: 0,
    total_appearances: 0,
  } as any;
}

export default function App() {
  const [player, setPlayer] = useState<PlayerData>(() => getMergedPlayerData());
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isIconicModalOpen, setIsIconicModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ title: string; subtitle: string; bonusPoints: number } | null>(null);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    audioEngine.enabled = next;
    setSoundEnabled(next);
  };

  const handleAddIconicMoment = (moment: IconicMoment) => {
    setPlayer(prev => ({
      ...prev,
      iconicMoments: [moment, ...(prev.iconicMoments || [])]
    }));
  };

  const handleDeleteIconicMoment = (id: string) => {
    setPlayer(prev => ({
      ...prev,
      iconicMoments: (prev.iconicMoments || []).filter(m => m.id !== id)
    }));
  };

  const handleUploadJson = (data: any) => {
    let finalData = data;

    // Auto-convert raw SQLite dump format to adapter format
    if (data?.career && data?.indexes && !data?.my_player_profile) {
      finalData = convertRawDump(data);
    }

    // Validate it looks like a career export
    if (!finalData?.my_player_profile?.firstname) {
      alert('Invalid career_export.json format');
      return;
    }
    // Clear old data and write new to localStorage
    try {
      localStorage.removeItem('career_export_json');
      localStorage.setItem('career_export_json', JSON.stringify(finalData));
    } catch {
      // Ignore storage errors
    }
    // Reload player data from the uploaded JSON
    setPlayer(getMergedPlayerData());
    setNotification({
      title: '📤 JSON UPLOADED',
      subtitle: `Successfully loaded career data for ${finalData.my_player_profile.firstname} ${finalData.my_player_profile.lastname}`,
      bonusPoints: 0
    });
  };

  const handleRecordBrokenTrigger = (recordTitle: string, bonusPoints: number) => {
    setPlayer(prev => ({
      ...prev,
      legacyScore: Math.min(100, prev.legacyScore + Math.ceil(bonusPoints / 2)),
      recordsBrokenCount: prev.recordsBrokenCount + 1
    }));

    setNotification({
      title: '🏆 RECORD BROKEN',
      subtitle: `Congratulations! You have surpassed: ${recordTitle}`,
      bonusPoints
    });
  };

  const handleSimulateSeason = () => {
    audioEngine.playGoldenFanfare();
    confetti({
      particleCount: 100,
      spread: 60,
      origin: { y: 0.5 }
    });

    const newAge = player.age + 1;
    const yearStart = 2020 + player.seasons.length;
    const nextSeasonStr = `${yearStart}/${(yearStart + 1).toString().slice(-2)}`;

    const simGoals = Math.floor(Math.random() * 15) + 30; // 30-45 goals
    const simAssists = Math.floor(Math.random() * 10) + 15; // 15-25 assists
    const simApps = 50;

    const newSeasonData: SeasonData = {
      id: `sim_${Date.now()}`,
      season: nextSeasonStr,
      age: newAge,
      club: player.currentClub,
      league: 'La Liga',
      clubBadgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      apps: simApps,
      goals: simGoals,
      assists: simAssists,
      avgRating: Number((8.4 + Math.random() * 0.4).toFixed(1)),
      yellowCards: 2,
      redCards: 0,
      trophies: ['La Liga', 'Supercopa de España'],
      individualAwards: ['Team of the Season'],
      highlights: `Simulated outstanding season for ${player.currentClub} with ${simGoals} goals and ${simAssists} assists.`,
      xG: simGoals - 3.2,
      xA: simAssists - 2.1,
      keyPassesPerGame: 3.3,
      dribblesPerGame: 4.4
    };

    setPlayer(prev => ({
      ...prev,
      age: newAge,
      legacyScore: Math.min(100, prev.legacyScore + 2),
      seasons: [newSeasonData, ...prev.seasons]
    }));

    setNotification({
      title: '⚽ SEASON SIMULATED',
      subtitle: `Advanced to age ${newAge} (${nextSeasonStr}): ${simGoals} Goals & ${simAssists} Assists logged!`,
      bonusPoints: 2
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Header */}
      <Header
        player={player}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenIconicModal={() => setIsIconicModalOpen(true)}
        onSimulateSeason={handleSimulateSeason}
        onUploadJson={handleUploadJson}
        activeTab={activeTab}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic View Panel */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto min-w-0">

          {activeTab === 'news' && (
            <NewsFeed />
          )}

          {activeTab === 'overview' && (
            <OverviewView
              player={player}
              onNavigateTab={setActiveTab}
              onOpenIconicModal={() => setIsIconicModalOpen(true)}
            />
          )}

          {activeTab === 'profile' && (
            <PlayerProfileView player={player} />
          )}

          {activeTab === 'growth' && (
            <GrowthCurveView player={player} />
          )}

          {activeTab === 'seasons' && (
            <SeasonHistoryView player={player} />
          )}

          {activeTab === 'teams' && (
            <TeamsView player={player} />
          )}

          {activeTab === 'tactical' && (
            <TacticalSheetView player={player} />
          )}

          {activeTab === 'league' && (
            <LeagueUniverseView player={player} />
          )}

          {activeTab === 'compare' && (
            <CompareView player={player} />
          )}

          {activeTab === 'h2h' && (
            <HeadToHeadView />
          )}

          {activeTab === 'halloffame' && (
            <HallOfFameView
              player={player}
              onRecordBrokenTrigger={handleRecordBrokenTrigger}
            />
          )}

          {activeTab === 'trophyroom' && (
            <TrophyRoomView player={player} />
          )}

          {activeTab === 'seasonawards' && (
            <SeasonAwardsView player={player} />
          )}

          {activeTab === 'projections' && (
            <RecordsProjectionsView player={player} />
          )}

          {activeTab === 'social' && (
            <SocialMediaView />
          )}
        </main>
      </div>

      {/* Custom Iconic Moments Documentation Modal */}
      <IconicMomentsModal
        player={player}
        isOpen={isIconicModalOpen}
        onClose={() => setIsIconicModalOpen(false)}
        onAddMoment={handleAddIconicMoment}
        onDeleteMoment={handleDeleteIconicMoment}
      />

      {/* Milestone Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-950 border-2 border-amber-400 rounded-2xl p-4 shadow-2xl max-w-sm animate-bounce">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  {notification.title}
                </h4>
                <p className="text-xs text-zinc-200 mt-0.5 leading-tight">
                  {notification.subtitle}
                </p>
                <span className="text-[10px] text-emerald-400 font-mono font-bold mt-1 block">
                  Legacy Score +{notification.bonusPoints}
                </span>
              </div>
            </div>

            <button
              onClick={() => setNotification(null)}
              className="text-zinc-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
