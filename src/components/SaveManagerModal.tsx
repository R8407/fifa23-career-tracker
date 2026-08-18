import React, { useState, useRef } from 'react';
import { Save, Trash2, Upload, Download, Star, ArrowLeft, FolderOpen, Check, X } from 'lucide-react';
import { audioEngine } from '../utils/audio';
import {
  listSaves,
  getActiveSave,
  setActiveSave,
  saveCareerData,
  loadSave,
  deleteSave,
  renameSave,
  exportSaveAsJson,
  SaveMeta,
} from '../utils/saveManager';

interface SaveManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (careerExport: any) => void;
}

export const SaveManagerModal: React.FC<SaveManagerModalProps> = ({ isOpen, onClose, onDataLoaded }) => {
  const [saves, setSaves] = useState<SaveMeta[]>(listSaves());
  const [activeSave, setActiveSaveState] = useState<string | null>(getActiveSave());
  const [importing, setImporting] = useState(false);
  const [importingCache, setImportingCache] = useState(false);
  const [pendingCareer, setPendingCareer] = useState<any | null>(null);
  const [pendingCache, setPendingCache] = useState<any | null>(null);
  const [saveName, setSaveName] = useState('');
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const careerInputRef = useRef<HTMLInputElement>(null);
  const cacheInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const refresh = () => {
    setSaves(listSaves());
    setActiveSaveState(getActiveSave());
  };

  const handleImportCareer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        // Auto-convert raw SQLite dump format
        if (data?.career && data?.indexes && !data?.my_player_profile) {
          // raw dump format — try to extract player profile
          const profile = data.career?.my_player_profile?.[0];
          if (profile) {
            data.my_player_profile = profile;
          }
        }
        if (!data?.my_player_profile?.firstname) {
          setError('Invalid career_export.json — missing my_player_profile.firstname');
          return;
        }
        setPendingCareer(data);
        const name = `${data.my_player_profile.firstname || ''} ${data.my_player_profile.lastname || ''}`.trim();
        if (name && !saveName) setSaveName(name);
        setError('');
      } catch {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportCache = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setPendingCache(data);
        setError('');
      } catch {
        setError('Invalid cache JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!pendingCareer) return;
    const name = saveName.trim();
    if (!name) {
      setError('Enter a save name');
      return;
    }
    if (saves.some(s => s.name === name)) {
      setError('A save with this name already exists');
      return;
    }
    saveCareerData(name, pendingCareer, pendingCache);
    setPendingCareer(null);
    setPendingCache(null);
    setSaveName('');
    setImporting(false);
    refresh();
    audioEngine.playAchievement();
  };

  const handleLoad = (name: string) => {
    const save = loadSave(name);
    if (!save) return;
    setActiveSave(name);
    setActiveSaveState(name);
    onDataLoaded(save.careerExport);
    audioEngine.playClick();
  };

  const handleDelete = (name: string) => {
    if (!confirm(`Delete save "${name}"?`)) return;
    deleteSave(name);
    refresh();
  };

  const handleRename = (oldName: string) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      setRenaming(null);
      return;
    }
    if (saves.some(s => s.name === newName)) {
      setError('A save with this name already exists');
      return;
    }
    renameSave(oldName, newName);
    setRenaming(null);
    refresh();
  };

  const handleExport = (name: string) => {
    const blob = exportSaveAsJson(name);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `career_save_${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRevertToAutoSync = () => {
    setActiveSave(null);
    setActiveSaveState(null);
    refresh();
    // Reload from static import by clearing localStorage upload data
    try { localStorage.removeItem('career_export_json'); } catch {}
    // Import the static module to get fresh data
    import('../data/career_export.json').then(mod => {
      onDataLoaded(mod.default);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] rounded-2xl border border-slate-700 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Career Saves</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Active save indicator */}
          {activeSave && (
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm text-amber-300 font-medium">Active: {activeSave}</span>
              </div>
              <button
                onClick={handleRevertToAutoSync}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Revert to auto-sync
              </button>
            </div>
          )}

          {/* Import button */}
          {!importing && !pendingCareer && (
            <button
              onClick={() => setImporting(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-600 hover:border-amber-500 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Import Career Data</span>
            </button>
          )}

          {/* Import form */}
          {(importing || pendingCareer) && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Import Save</h3>
                <button
                  onClick={() => { setImporting(false); setPendingCareer(null); setPendingCache(null); setSaveName(''); setError(''); }}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Career file */}
              <div>
                <input ref={careerInputRef} type="file" accept=".json" className="hidden" onChange={handleImportCareer} />
                <button
                  onClick={() => careerInputRef.current?.click()}
                  className={`w-full text-left p-3 rounded-lg border text-sm cursor-pointer ${
                    pendingCareer ? 'border-green-500/50 bg-green-500/10 text-green-300' : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {pendingCareer
                    ? `✓ career_export.json loaded (${pendingCareer.my_player_profile?.firstname || 'unknown'})`
                    : 'Select career_export.json'}
                </button>
              </div>

              {/* Cache file (optional) */}
              <div>
                <input ref={cacheInputRef} type="file" accept=".json" className="hidden" onChange={handleImportCache} />
                <button
                  onClick={() => cacheInputRef.current?.click()}
                  className={`w-full text-left p-3 rounded-lg border text-sm cursor-pointer ${
                    pendingCache ? 'border-green-500/50 bg-green-500/10 text-green-300' : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {pendingCache ? '✓ season_cache.json loaded (optional)' : 'Select season_cache.json (optional)'}
                </button>
              </div>

              {/* Save name */}
              <div>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => { setSaveName(e.target.value); setError(''); }}
                  placeholder="Save name..."
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                onClick={handleSave}
                disabled={!pendingCareer || !saveName.trim()}
                className="w-full p-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Save
              </button>
            </div>
          )}

          {/* Saved items */}
          {saves.length === 0 && !importing && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No saves yet. Import a career_export.json to get started.
            </div>
          )}

          {saves.map((s) => (
            <div
              key={s.name}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                activeSave === s.name
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="flex-1 min-w-0">
                {renaming === s.name ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(s.name); if (e.key === 'Escape') setRenaming(null); }}
                      className="flex-1 p-1 rounded bg-slate-900 border border-slate-600 text-white text-sm focus:border-amber-500 focus:outline-none"
                      autoFocus
                    />
                    <button onClick={() => handleRename(s.name)} className="p-1 text-green-400 hover:text-green-300 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setRenaming(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium text-white truncate">{s.name}</div>
                    <div className="text-xs text-slate-500">
                      {s.playerName || 'Unknown'} {s.playerClub ? `• ${s.playerClub}` : ''} • {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>

              {renaming !== s.name && (
                <div className="flex items-center gap-1">
                  {activeSave !== s.name && (
                    <button onClick={() => handleLoad(s.name)} title="Load this save" className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-amber-400 cursor-pointer">
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => handleExport(s.name)} title="Download as JSON" className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-blue-400 cursor-pointer">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setRenaming(s.name); setRenameValue(s.name); }}
                    title="Rename"
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer text-xs"
                  >
                    ↻
                  </button>
                  <button onClick={() => handleDelete(s.name)} title="Delete" className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
