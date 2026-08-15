import React, { useState, useMemo } from 'react';
import { PlayerData } from '../types';
import { getExportSquad } from '../utils/dataAdapter';
import { Shield, X, Trophy, Star, TrendingUp, ChevronRight, Crown, Target } from 'lucide-react';
import { audioEngine } from '../utils/audio';
import { HALL_OF_FAME_RECORDS } from '../data/mockData';
import careerExportData from '../data/career_export.json';
import { TacticalSheetView } from './TacticalSheetView';

const BASE_URL = import.meta.env.BASE_URL || '';

const trophyImages = {
  ucl: `${BASE_URL}assets/images/UCL.jpg`,
  uel: `${BASE_URL}assets/images/europa-league.jpg`,
  league: `${BASE_URL}assets/images/premier_league.webp`,
  cup: `${BASE_URL}assets/images/serie-a.webp`,
};

interface ClubViewProps {
  player: PlayerData;
}

type ClubTab = 'formation' | 'history' | 'post-departure' | 'records';

const CLUB_TABS: { id: ClubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'formation', label: 'Formation', icon: <Shield className="w-4 h-4" /> },
  { id: 'history', label: 'Club History', icon: <Trophy className="w-4 h-4" /> },
  { id: 'post-departure', label: 'Post-Departure', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'records', label: 'Club Records', icon: <Crown className="w-4 h-4" /> },
];

const TROPHY_IMAGES: Record<string, { src: string; label: string }> = {
  ucl: { src: uclImg, label: 'UCL' },
  uel: { src: uelImg, label: 'UEL' },
  league: { src: leagueImg, label: 'League' },
  cup: { src: cupImg, label: 'Cup' },
};

interface ClubHistoryEntry {
  teamid: string;
  teamname: string;
  league: string;
  leagueId: string;
  seasons: any[];
  totalGoals: number;
  totalAssists: number;
  totalApps: number;
  historicalTrophies?: {
    leagueTitles?: number;
    domesticCups?: number;
    uclWins?: number;
    uelWins?: number;
    ueclWins?: number;
  };
  trophiesWithPlayer?: {
    league?: number;
    domesticCup?: number;
    ucl?: number;
    uel?: number;
  };
  isCurrentClub: boolean;
}

interface ClubRecord {
  id: string;
  title: string;
  holderName: string;
  holderRecord: number;
  unit: string;
  userCurrent: number;
  remainingToBreak: number;
  isBroken: boolean;
  isApplicable: boolean;
}

export const ClubView: React.FC<ClubViewProps> = ({ player }) => {
  const [activeTab, setActiveTab] = useState<ClubTab>('formation');
  const exportData = careerExportData as any;
  const clubHistory: ClubHistoryEntry[] = exportData.club_history || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-zinc-950" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              {player.currentClub.toUpperCase()} FC
            </h2>
            <p className="text-zinc-400 text-xs mt-0.5">
              {clubHistory.length} club{clubHistory.length !== 1 ? 's' : ''} in career • {player.totalSeasons} season{player.totalSeasons !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1.5 mt-4 bg-zinc-950 border border-zinc-800 p-1.5 rounded-xl text-xs font-bold">
          {CLUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                audioEngine.playClick();
                setActiveTab(tab.id);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'formation' && <TacticalSheetView player={player} />}
      {activeTab === 'history' && <ClubHistoryTab clubHistory={clubHistory} player={player} />}
      {activeTab === 'post-departure' && <PostDepartureTab clubHistory={clubHistory} />}
      {activeTab === 'records' && <ClubRecordsTab clubHistory={clubHistory} player={player} />}
    </div>
  );
};

// ============================================
// CLUB HISTORY TAB
// ============================================
const ClubHistoryTab: React.FC<{ clubHistory: ClubHistoryEntry[]; player: PlayerData }> = ({ clubHistory, player }) => {
  const hasHistoricalTrophies = (club: ClubHistoryEntry) => {
    const t = club.historicalTrophies || {};
    return (t.leagueTitles || 0) + (t.domesticCups || 0) + (t.uclWins || 0) + (t.uelWins || 0) + (t.ueclWins || 0) > 0;
  };

  const hasPlayerTrophies = (club: ClubHistoryEntry) => {
    const t = club.trophiesWithPlayer || {};
    return (t.league || 0) + (t.domesticCup || 0) + (t.ucl || 0) + (t.uel || 0) > 0;
  };

  const renderTrophy = (count: number, type: 'ucl' | 'uel' | 'league' | 'cup') => {
    if (count === 0) return null;
    const trophy = TROPHY_IMAGES[type];
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-950/60 rounded-lg">
        <img src={trophy.src} alt={trophy.label} className="w-4 h-4 object-contain" style={{ mixBlendMode: 'screen' }} />
        <span className="text-xs font-bold text-amber-400">{count}</span>
        <span className="text-[10px] text-zinc-500">{trophy.label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-zinc-300 mb-4 uppercase tracking-wider">Career Timeline</h3>
        
        {clubHistory.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">No club history available yet.</p>
        ) : (
          <div className="space-y-4">
            {clubHistory.map((club, idx) => (
              <div
                key={club.teamid}
                className={`relative p-4 rounded-xl border transition-all ${
                  club.isCurrentClub
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Club Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black ${
                      club.isCurrentClub
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {club.teamname.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{club.teamname}</h4>
                      <p className="text-[10px] text-zinc-500 uppercase">{club.league}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {club.isCurrentClub && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30">
                        CURRENT
                      </span>
                    )}
                    {idx > 0 && (
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                </div>

                {/* Historical Trophies (Before You) */}
                <div className="mb-3">
                  <p className="text-[10px] text-zinc-500 uppercase mb-1.5">Before You</p>
                  {hasHistoricalTrophies(club) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {renderTrophy(club.historicalTrophies?.uclWins || 0, 'ucl')}
                      {renderTrophy(club.historicalTrophies?.uelWins || 0, 'uel')}
                      {renderTrophy(club.historicalTrophies?.leagueTitles || 0, 'league')}
                      {renderTrophy(club.historicalTrophies?.domesticCups || 0, 'cup')}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">NO trophies</p>
                  )}
                </div>

                {/* Trophies With Player */}
                {club.isCurrentClub && (
                  <div className="mb-3">
                    <p className="text-[10px] text-amber-400 uppercase mb-1.5 font-bold">With You</p>
                    {hasPlayerTrophies(club) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {renderTrophy(club.trophiesWithPlayer?.ucl || 0, 'ucl')}
                        {renderTrophy(club.trophiesWithPlayer?.uel || 0, 'uel')}
                        {renderTrophy(club.trophiesWithPlayer?.league || 0, 'league')}
                        {renderTrophy(club.trophiesWithPlayer?.domesticCup || 0, 'cup')}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-600 italic">No trophies yet — keep pushing!</p>
                    )}
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="bg-zinc-950/60 p-2 rounded-lg text-center">
                    <div className="text-[9px] text-zinc-500 uppercase">Seasons</div>
                    <div className="text-sm font-black text-white">{club.seasons.length}</div>
                  </div>
                  <div className="bg-zinc-950/60 p-2 rounded-lg text-center">
                    <div className="text-[9px] text-zinc-500 uppercase">Goals</div>
                    <div className="text-sm font-black text-amber-400">{club.totalGoals}</div>
                  </div>
                  <div className="bg-zinc-950/60 p-2 rounded-lg text-center">
                    <div className="text-[9px] text-zinc-500 uppercase">Assists</div>
                    <div className="text-sm font-black text-blue-400">{club.totalAssists}</div>
                  </div>
                  <div className="bg-zinc-950/60 p-2 rounded-lg text-center">
                    <div className="text-[9px] text-zinc-500 uppercase">Apps</div>
                    <div className="text-sm font-black text-zinc-300">{club.totalApps}</div>
                  </div>
                </div>

                {/* Season-by-Season Breakdown */}
                <div className="space-y-1.5">
                  {club.seasons.map((season) => (
                    <div
                      key={season.id}
                      className="flex items-center justify-between px-3 py-1.5 bg-zinc-950/40 rounded-lg text-xs"
                    >
                      <span className="text-zinc-400 font-mono">{season.season}</span>
                      <span className="text-zinc-300">Age {season.age}</span>
                      <span className="text-amber-400 font-bold">{season.goals}G</span>
                      <span className="text-blue-400 font-bold">{season.assists}A</span>
                      <span className="text-zinc-500">{season.apps} apps</span>
                      {season.avgRating > 0 && (
                        <span className="text-emerald-400 font-mono">{season.avgRating}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// POST-DEPARTURE TAB
// ============================================
const PostDepartureTab: React.FC<{ clubHistory: ClubHistoryEntry[] }> = ({ clubHistory }) => {
  const exportData = careerExportData as any;
  const postDeparture = exportData.post_departure || {};
  
  const departedClubs = clubHistory.filter(c => !c.isCurrentClub);

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-zinc-300 mb-2 uppercase tracking-wider">After You Left</h3>
        <p className="text-zinc-500 text-xs mb-4">Trophies and achievements at clubs you departed from.</p>
        
        {departedClubs.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">You haven't left any clubs yet.</p>
            <p className="text-zinc-600 text-xs mt-1">Post-departure data appears here after you transfer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {departedClubs.map((club) => {
              const departureData = postDeparture[club.teamid] || {};
              const trophies = departureData.trophies || [];
              
              return (
                <div key={club.teamid} className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
                        {club.teamname.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{club.teamname}</h4>
                        <p className="text-[10px] text-zinc-500">{club.seasons.length} season{club.seasons.length !== 1 ? 's' : ''} • Left after {club.seasons[club.seasons.length - 1]?.season}</p>
                      </div>
                    </div>
                  </div>

                  {trophies.length > 0 ? (
                    <div className="space-y-2">
                      {trophies.map((trophy: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-zinc-950/40 rounded-lg">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span className="text-xs text-white">{trophy.title}</span>
                          <span className="text-[10px] text-zinc-500 ml-auto">{trophy.season}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-600 text-xs text-center py-4">No post-departure data yet. Run --sync after future seasons to update.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// CLUB RECORDS TAB
// ============================================
const ClubRecordsTab: React.FC<{ clubHistory: ClubHistoryEntry[]; player: PlayerData }> = ({ clubHistory, player }) => {
  const clubRecords = useMemo(() => {
    const records: { club: ClubHistoryEntry; records: ClubRecord[] }[] = [];
    
    for (const club of clubHistory) {
      const clubNameLower = club.teamname.toLowerCase();
      
      // Filter IMMORTAL RECORD CHASE records for this club
      const relevantRecords = HALL_OF_FAME_RECORDS
        .filter(r => {
          const id = r.id.toLowerCase();
          // Match club-specific records (e.g., rec_spezia_alltime_goals)
          if (id.includes(`_${clubNameLower.replace(/\s+/g, '_')}_`)) return true;
          // Match generic club records by title
          if (r.title.toLowerCase().includes(clubNameLower)) return true;
          return false;
        })
        .map(r => {
          // Calculate user's progress at this club
          let userAtClub = 0;
          if (r.unit === 'goals') {
            userAtClub = club.totalGoals;
          } else if (r.unit === 'assists') {
            userAtClub = club.totalAssists;
          }
          
          const remaining = Math.max(0, r.holderRecord - userAtClub);
          const isBroken = userAtClub >= r.holderRecord;
          
          return {
            ...r,
            userCurrent: userAtClub,
            remainingToBreak: remaining,
            isBroken,
            isApplicable: true,
          };
        })
        .sort((a, b) => a.remainingToBreak - b.remainingToBreak);
      
      if (relevantRecords.length > 0) {
        records.push({ club, records: relevantRecords });
      }
    }
    
    return records;
  }, [clubHistory]);

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-zinc-300 mb-2 uppercase tracking-wider">Club Records Chase</h3>
        <p className="text-zinc-500 text-xs mb-4">All-time records at clubs you've played for. Break them to earn Legacy Points.</p>
        
        {clubRecords.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No club records found for your teams.</p>
            <p className="text-zinc-600 text-xs mt-1">Records appear once you've played for clubs with tracked records.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {clubRecords.map(({ club, records }) => (
              <div key={club.teamid}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    club.isCurrentClub
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {club.teamname.charAt(0)}
                  </div>
                  <h4 className="text-sm font-bold text-white">{club.teamname}</h4>
                  {club.isCurrentClub && (
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded">CURRENT</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className={`p-3 rounded-xl border transition-all ${
                        record.isBroken
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-zinc-900/80 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {record.isBroken ? (
                            <Crown className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Target className="w-4 h-4 text-zinc-500" />
                          )}
                          <span className="text-xs font-bold text-white">{record.title}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{record.difficulty}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="text-zinc-500">Record: </span>
                          <span className="text-zinc-300 font-bold">{record.holderName} — {record.holderRecord} {record.unit}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-zinc-500">You: </span>
                          <span className={`font-bold ${record.isBroken ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {record.userCurrent} {record.unit}
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            record.isBroken ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${Math.min(100, (record.userCurrent / record.holderRecord) * 100)}%` }}
                        />
                      </div>
                      
                      {!record.isBroken && (
                        <p className="text-[10px] text-zinc-500 mt-1">
                          {record.remainingToBreak} more {record.unit} to break the record
                        </p>
                      )}
                      {record.isBroken && (
                        <p className="text-[10px] text-emerald-400 mt-1 font-bold">
                          RECORD BROKEN! +{record.legacyPoints} Legacy Points
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
