import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, TrendingUp, Trophy, Target, Star } from 'lucide-react';
import { audioEngine } from '../utils/audio';
import careerExportData from '../data/career_export.json';

interface MatchRecord {
  id: string;
  date: string;
  result: 'W' | 'D' | 'L';
  myGoals: number;
  myAssists: number;
  rating: number;
  season: string;
  competition: string;
  homeAway: 'H' | 'A';
  notes: string;
}

interface TeamRecord {
  teamId: string;
  teamName: string;
  teamBadge: string;
  matches: MatchRecord[];
}

const COMPETITIONS = ['Serie A', 'Coppa Italia', 'Champions League', 'Europa League', 'Friendly'];

// Get dynamic teams from export data
const getLeagueTeams = () => {
  const exportData = careerExportData as any;
  const leagueTeams = exportData.league_teams || {};
  const userLeagueId = exportData.my_team_id ? 
    Object.keys(leagueTeams).find(lid => 
      leagueTeams[lid]?.some((t: any) => t.teamid === exportData.my_team_id)
    ) : '31';
  
  // Get teams from user's current league
  const teams = leagueTeams[userLeagueId || '31'] || [];
  
  // If no teams found, fallback to a basic list
  if (teams.length === 0) {
    return [
      { id: '113974', name: 'Spezia', badge: 'S' },
    ];
  }
  
  return teams.map((t: any) => ({
    id: t.teamid,
    name: t.teamname,
    badge: t.teamname.charAt(0),
  }));
};

export const HeadToHeadView: React.FC = () => {
  const [records, setRecords] = useState<Record<string, TeamRecord>>(() => {
    const saved = localStorage.getItem('fifa_h2h_records');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<MatchRecord>>({
    date: new Date().toISOString().split('T')[0],
    result: 'W',
    myGoals: 0,
    myAssists: 0,
    rating: 7,
    season: '2023/2024',
    competition: 'Serie A',
    homeAway: 'H',
    notes: '',
  });

  useEffect(() => {
    localStorage.setItem('fifa_h2h_records', JSON.stringify(records));
  }, [records]);

  const getTeamName = (teamId: string) => {
    return getLeagueTeams().find(t => t.id === teamId)?.name || 'Unknown Team';
  };

  const getTeamBadge = (teamId: string) => {
    return getLeagueTeams().find(t => t.id === teamId)?.badge || '?';
  };

  const handleAddMatch = () => {
    if (!selectedTeam || !formData.date) return;

    const matchId = `match_${Date.now()}`;
    const newMatch: MatchRecord = {
      id: matchId,
      date: formData.date || '',
      result: formData.result || 'W',
      myGoals: formData.myGoals || 0,
      myAssists: formData.myAssists || 0,
      rating: formData.rating || 7,
      season: formData.season || '2023/2024',
      competition: formData.competition || 'Serie A',
      homeAway: formData.homeAway || 'H',
      notes: formData.notes || '',
    };

    setRecords(prev => {
      const existing = prev[selectedTeam] || {
        teamId: selectedTeam,
        teamName: getTeamName(selectedTeam),
        teamBadge: getTeamBadge(selectedTeam),
        matches: [],
      };
      return {
        ...prev,
        [selectedTeam]: {
          ...existing,
          matches: [...existing.matches, newMatch].sort((a, b) => b.date.localeCompare(a.date)),
        },
      };
    });

    audioEngine.playSuccess();
    setShowForm(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      result: 'W',
      myGoals: 0,
      myAssists: 0,
      rating: 7,
      season: '2023/2024',
      competition: 'Serie A',
      homeAway: 'H',
      notes: '',
    });
  };

  const handleDeleteMatch = (teamId: string, matchId: string) => {
    audioEngine.playClick();
    setRecords(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        matches: prev[teamId].matches.filter(m => m.id !== matchId),
      },
    }));
  };

  const getTeamStats = (teamId: string) => {
    const teamRecords = records[teamId]?.matches || [];
    const totalMatches = teamRecords.length;
    const wins = teamRecords.filter(m => m.result === 'W').length;
    const draws = teamRecords.filter(m => m.result === 'D').length;
    const losses = teamRecords.filter(m => m.result === 'L').length;
    const goals = teamRecords.reduce((sum, m) => sum + m.myGoals, 0);
    const assists = teamRecords.reduce((sum, m) => sum + m.myAssists, 0);
    const avgRating = totalMatches > 0
      ? (teamRecords.reduce((sum, m) => sum + m.rating, 0) / totalMatches).toFixed(1)
      : '0.0';

    return { totalMatches, wins, draws, losses, goals, assists, avgRating };
  };

  const getOverallStats = () => {
    const allMatches = Object.values(records).flatMap(t => t.matches);
    const totalMatches = allMatches.length;
    const wins = allMatches.filter(m => m.result === 'W').length;
    const goals = allMatches.reduce((sum, m) => sum + m.myGoals, 0);
    const assists = allMatches.reduce((sum, m) => sum + m.myAssists, 0);
    const avgRating = totalMatches > 0
      ? (allMatches.reduce((sum, m) => sum + m.rating, 0) / totalMatches).toFixed(1)
      : '0.0';

    return { totalMatches, wins, goals, assists, avgRating };
  };

  const currentTeam = selectedTeam ? records[selectedTeam] : null;
  const currentStats = selectedTeam ? getTeamStats(selectedTeam) : null;
  const overallStats = getOverallStats();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                HEAD-TO-HEAD RECORDS
              </h2>
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full">
                MATCH JOURNAL
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              Track your personal stats against every opponent
            </p>
          </div>
        </div>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Matches', value: overallStats.totalMatches, icon: Shield, color: 'text-white' },
          { label: 'Wins', value: overallStats.wins, icon: Trophy, color: 'text-emerald-400' },
          { label: 'Goals', value: overallStats.goals, icon: Target, color: 'text-amber-400' },
          { label: 'Assists', value: overallStats.assists, icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Avg Rating', value: overallStats.avgRating, icon: Star, color: 'text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl text-center">
            <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
            <div className={`text-lg font-black font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-[9px] text-zinc-500 uppercase">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Team Selector */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white uppercase">Select Opponent</h3>
          <button
            onClick={() => {
              audioEngine.playClick();
              setShowForm(true);
            }}
            className="px-3 py-1.5 bg-amber-500 text-zinc-950 text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            LOG MATCH
          </button>
        </div>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {getLeagueTeams().map((team) => {
            const stats = getTeamStats(team.id);
            const hasRecords = stats.totalMatches > 0;
            return (
              <button
                key={team.id}
                onClick={() => {
                  audioEngine.playClick();
                  setSelectedTeam(team.id === selectedTeam ? '' : team.id);
                }}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedTeam === team.id
                    ? 'bg-amber-500/20 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : hasRecords
                    ? 'bg-zinc-950 border-zinc-700 hover:border-zinc-600'
                    : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="w-8 h-8 mx-auto rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 mb-1">
                  {team.badge}
                </div>
                <div className="text-[9px] text-zinc-400 truncate">{team.name.split(' ').pop()}</div>
                {hasRecords && (
                  <div className="text-[8px] text-amber-400 font-mono mt-0.5">
                    {stats.wins}W {stats.goals}G
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Match Log Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">LOG MATCH RESULT</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Team & Competition */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Opponent</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white cursor-pointer"
                >
                  <option value="">Select team...</option>
                  {getLeagueTeams().map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Competition</label>
                <select
                  value={formData.competition}
                  onChange={(e) => setFormData({ ...formData, competition: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white cursor-pointer"
                >
                  {COMPETITIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date & Season */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Season</label>
                <input
                  type="text"
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  placeholder="2023/2024"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600"
                />
              </div>
            </div>

            {/* Result & Home/Away */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Result</label>
                <div className="flex gap-2">
                  {(['W', 'D', 'L'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setFormData({ ...formData, result: r })}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm cursor-pointer transition-all ${
                        formData.result === r
                          ? r === 'W' ? 'bg-emerald-500 text-white' : r === 'D' ? 'bg-zinc-500 text-white' : 'bg-red-500 text-white'
                          : 'bg-zinc-950 border border-zinc-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {r === 'W' ? 'WIN' : r === 'D' ? 'DRAW' : 'LOSS'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Home / Away</label>
                <div className="flex gap-2">
                  {(['H', 'A'] as const).map((ha) => (
                    <button
                      key={ha}
                      onClick={() => setFormData({ ...formData, homeAway: ha })}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm cursor-pointer transition-all ${
                        formData.homeAway === ha
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-950 border border-zinc-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {ha === 'H' ? 'HOME' : 'AWAY'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Goals, Assists, Rating */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">My Goals</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.myGoals}
                  onChange={(e) => setFormData({ ...formData, myGoals: parseInt(e.target.value) || 0 })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-center font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">My Assists</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.myAssists}
                  onChange={(e) => setFormData({ ...formData, myAssists: parseInt(e.target.value) || 0 })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-center font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Rating</label>
                <select
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-center cursor-pointer"
                >
                  {RATINGS.map(r => (
                    <option key={r} value={r}>{r.toFixed(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase block mb-1">Notes (optional)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Key moments, highlights..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleAddMatch}
              disabled={!selectedTeam}
              className="w-full py-3 bg-amber-500 text-zinc-950 font-black rounded-xl hover:bg-amber-400 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              SAVE MATCH RECORD
            </button>
          </div>
        </div>
      )}

      {/* Selected Team Detail */}
      {selectedTeam && currentTeam && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Team Header */}
          <div className="p-5 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center text-xl font-black text-zinc-300">
                  {getTeamBadge(selectedTeam)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{getTeamName(selectedTeam)}</h3>
                  <p className="text-xs text-zinc-500">
                    {currentStats?.totalMatches} matches played
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-black text-emerald-400 font-mono">{currentStats?.wins}</div>
                  <div className="text-[9px] text-zinc-500">WINS</div>
                </div>
                <div>
                  <div className="text-lg font-black text-zinc-400 font-mono">{currentStats?.draws}</div>
                  <div className="text-[9px] text-zinc-500">DRAWS</div>
                </div>
                <div>
                  <div className="text-lg font-black text-red-400 font-mono">{currentStats?.losses}</div>
                  <div className="text-[9px] text-zinc-500">LOSSES</div>
                </div>
                <div>
                  <div className="text-lg font-black text-amber-400 font-mono">{currentStats?.goals}G {currentStats?.assists}A</div>
                  <div className="text-[9px] text-zinc-500">CONTRIBUTIONS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Match History */}
          <div className="p-5">
            {currentTeam.matches.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No matches logged yet</p>
                <p className="text-xs mt-1">Click "LOG MATCH" to record your performance</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentTeam.matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${
                        match.result === 'W' ? 'bg-emerald-500/20 text-emerald-400' :
                        match.result === 'D' ? 'bg-zinc-500/20 text-zinc-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {match.result}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{getTeamName(selectedTeam)}</span>
                          <span className="text-[9px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                            {match.homeAway === 'H' ? 'HOME' : 'AWAY'}
                          </span>
                          <span className="text-[9px] text-zinc-500">{match.competition}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {match.date} • {match.season}
                          {match.notes && ` • ${match.notes}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-black text-amber-400 font-mono">
                          {match.myGoals}G {match.myAssists}A
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Rating: {match.rating.toFixed(1)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMatch(selectedTeam, match.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedTeam && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <h3 className="text-lg font-bold text-zinc-400 mb-2">SELECT AN OPPONENT</h3>
          <p className="text-sm text-zinc-600 max-w-md mx-auto">
            Choose a team above to view your head-to-head record, or click "LOG MATCH" to add a new result.
          </p>
        </div>
      )}

      {/* All Teams Summary */}
      {Object.keys(records).length > 0 && !selectedTeam && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-3">ALL OPPONENTS</h3>
          <div className="space-y-2">
            {Object.entries(records)
              .filter(([_, data]) => data.matches.length > 0)
              .sort((a, b) => b[1].matches.length - a[1].matches.length)
              .map(([teamId, data]) => {
                const stats = getTeamStats(teamId);
                return (
                  <button
                    key={teamId}
                    onClick={() => {
                      audioEngine.playClick();
                      setSelectedTeam(teamId);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                        {data.teamBadge}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white">{data.teamName}</div>
                        <div className="text-[10px] text-zinc-500">{stats.totalMatches} matches</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-emerald-400">{stats.wins}W</span>
                      <span className="text-zinc-400">{stats.draws}D</span>
                      <span className="text-red-400">{stats.losses}L</span>
                      <span className="text-amber-400">{stats.goals}G {stats.assists}A</span>
                      <span className="text-purple-400">★{stats.avgRating}</span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
