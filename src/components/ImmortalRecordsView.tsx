import React, { useState, useMemo } from 'react';
import { Trophy, Target, CheckCircle, Sparkles, Lock, ChevronDown, ChevronRight, Award, Pencil, Check } from 'lucide-react';
import { HallOfFameRecord, RecordCategory } from '../types';
import { audioEngine } from '../utils/audio';

interface ImmortalRecordsViewProps {
  records: HallOfFameRecord[];
  allRecords: HallOfFameRecord[];
  brokenRecords: Record<string, boolean>;
  onBreakRecord: (rec: HallOfFameRecord) => void;
  onEditValue?: (recId: string, value: number) => void;
}

// Competition groupings with icons and colors
const COMPETITION_GROUPS: { label: string; categories: RecordCategory[]; color: string; icon: string }[] = [
  { label: 'Premier League', categories: ['League'], color: 'from-purple-900 via-indigo-800 to-purple-900', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { label: 'UEFA Champions League', categories: ['UCL'], color: 'from-blue-900 via-indigo-800 to-blue-900', icon: '⭐' },
  { label: 'Europa League & Conference', categories: ['UEFA'], color: 'from-orange-900 via-amber-800 to-orange-900', icon: '🏆' },
  { label: 'Domestic Cups', categories: ['Cup'], color: 'from-emerald-900 via-green-800 to-emerald-900', icon: '🏆' },
  { label: 'International', categories: ['International'], color: 'from-red-900 via-rose-800 to-red-900', icon: '🌍' },
  { label: 'Club Legends', categories: ['Club'], color: 'from-zinc-800 via-zinc-700 to-zinc-800', icon: '🏟️' },
  { label: 'Knockout Stages', categories: ['Knockout'], color: 'from-yellow-900 via-amber-800 to-yellow-900', icon: '🔥' },
  { label: 'Individual Honours', categories: ['Individual'], color: 'from-amber-900 via-yellow-800 to-amber-900', icon: '👑' },
];

const RecordCard: React.FC<{
  rec: HallOfFameRecord;
  isBroken: boolean;
  onBreak: () => void;
  onEdit?: (value: number) => void;
}> = ({ rec, isBroken, onBreak, onEdit }) => {
  const progressPercent = Math.min(100, Math.round((rec.userCurrent / rec.holderRecord) * 100));
  const isClose = progressPercent >= 70 && !isBroken;
  const isGhanaRecord = rec.id.includes('ghana');
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(rec.userCurrent));

  const handleSave = () => {
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && num >= 0 && onEdit) {
      onEdit(num);
    }
    setEditing(false);
  };

  return (
    <div className={`relative p-4 rounded-xl border transition-all ${
      isBroken
        ? 'bg-gradient-to-br from-amber-950/40 via-zinc-900 to-amber-950/40 border-amber-500/50'
        : isClose
        ? 'bg-zinc-900 border-amber-500/30 shadow-lg shadow-amber-500/5'
        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
    }`}>
      {/* Status Badge */}
      <div className="absolute top-3 right-3">
        {isBroken ? (
          <span className="px-2 py-0.5 bg-amber-500 text-zinc-950 text-[9px] font-black rounded-full uppercase flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> BROKEN
          </span>
        ) : isClose ? (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-bold rounded-full uppercase border border-amber-500/30 animate-pulse">
            CLOSE
          </span>
        ) : null}
      </div>

      {/* Record Title */}
      <h4 className={`text-sm font-black pr-16 ${isBroken ? 'text-amber-300' : 'text-white'}`}>
        {rec.title}
      </h4>
      <p className="text-[10px] text-zinc-500 mt-0.5">{rec.description}</p>

      {/* Stats */}
      <div className="mt-3 space-y-1.5 font-mono text-xs">
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">Record Holder</span>
          <span className="text-white font-bold">{rec.holderName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">Record</span>
          <span className="text-white font-bold">{rec.holderRecord} {rec.unit}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">Your Best</span>
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
                className="w-16 px-1 py-0.5 bg-zinc-800 border border-zinc-600 rounded text-white text-xs font-mono text-right focus:outline-none focus:border-amber-500"
              />
              <button onClick={handleSave} className="p-0.5 text-amber-400 hover:text-amber-300 cursor-pointer">
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className={`font-black ${isBroken ? 'text-amber-400' : 'text-zinc-200'}`}>
                {rec.userCurrent} {rec.unit}
              </span>
              {isGhanaRecord && onEdit && (
                <button
                  onClick={() => { setEditValue(String(rec.userCurrent)); setEditing(true); }}
                  className="p-0.5 text-zinc-600 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Edit manually"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${
              isBroken
                ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                : isClose
                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-zinc-600 font-mono">{rec.userCurrent}/{rec.holderRecord}</span>
          <span className={`text-[9px] font-bold font-mono ${isBroken ? 'text-amber-400' : 'text-zinc-500'}`}>
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Action */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-zinc-600 font-mono">{rec.difficulty}</span>
        {!isBroken && rec.isApplicable && (
          <button
            onClick={onBreak}
            className="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-extrabold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 active:scale-95"
          >
            <Target className="w-3 h-3" /> Chase
          </button>
        )}
        {isBroken && (
          <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> History Made
          </span>
        )}
      </div>
    </div>
  );
};

export const ImmortalRecordsView: React.FC<ImmortalRecordsViewProps> = ({
  records,
  allRecords,
  brokenRecords,
  onBreakRecord,
  onEditValue,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    COMPETITION_GROUPS.forEach(g => { initial[g.label] = true; });
    return initial;
  });

  // Group records by competition
  const groupedRecords = useMemo(() => {
    const groups: Record<string, HallOfFameRecord[]> = {};
    for (const g of COMPETITION_GROUPS) {
      groups[g.label] = [];
    }
    groups['Other'] = [];

    for (const rec of records) {
      let placed = false;
      for (const g of COMPETITION_GROUPS) {
        if (g.categories.includes(rec.category)) {
          groups[g.label].push(rec);
          placed = true;
          break;
        }
      }
      if (!placed) {
        groups['Other'].push(rec);
      }
    }
    return groups;
  }, [records]);

  const brokenCount = records.filter(r => brokenRecords[r.id]).length;
  const totalRecords = records.length;

  const toggleGroup = (label: string) => {
    audioEngine.playClick();
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-zinc-950 via-amber-950/30 to-zinc-950 border border-amber-500/30 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Immortal Records
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Chase legends. Break records. Rewrite history.</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-amber-400">{brokenCount}/{totalRecords}</div>
            <div className="text-[10px] text-zinc-500 uppercase">Records Broken</div>
          </div>
        </div>
        {/* Overall Progress */}
        <div className="mt-3 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
            style={{ width: `${totalRecords > 0 ? (brokenCount / totalRecords) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Competition Groups */}
      {COMPETITION_GROUPS.map(group => {
        const groupRecords = groupedRecords[group.label] || [];
        if (groupRecords.length === 0) return null;

        const groupBroken = groupRecords.filter(r => brokenRecords[r.id]).length;
        const isExpanded = expandedGroups[group.label];

        return (
          <div key={group.label} className="border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.label)}
              className={`w-full p-4 bg-gradient-to-r ${group.color} flex items-center justify-between cursor-pointer transition-all hover:brightness-110`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{group.icon}</span>
                <div className="text-left">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">{group.label}</h4>
                  <p className="text-[10px] text-white/60">
                    {groupRecords.length} records • {groupBroken} broken
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {groupBroken > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full">
                    {groupBroken} broken
                  </span>
                )}
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-white/60" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-white/60" />
                )}
              </div>
            </button>

            {/* Records Grid */}
            {isExpanded && (
              <div className="p-4 bg-zinc-950/50 grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupRecords.map(rec => (
                  <RecordCard
                    key={rec.id}
                    rec={rec}
                    isBroken={!!brokenRecords[rec.id]}
                    onBreak={() => onBreakRecord(rec)}
                    onEdit={onEditValue ? (val) => onEditValue(rec.id, val) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty State */}
      {records.length === 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 text-center">
          <Lock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-400 mb-2">NO RECORDS AVAILABLE</h3>
          <p className="text-sm text-zinc-600">Play in more competitions to unlock record challenges.</p>
        </div>
      )}
    </div>
  );
};
