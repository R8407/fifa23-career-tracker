/**
 * Save Manager - handles career data saves in localStorage.
 * Each save stores: career_export.json, season_cache.json, and a metadata label.
 * Auto-sync data lives outside this system (static import + fetch).
 */

const SAVES_INDEX_KEY = 'career_saves_index';
const ACTIVE_SAVE_KEY = 'career_active_save';

export interface SaveMeta {
  name: string;
  createdAt: number;
  playerName?: string;
  playerClub?: string;
}

export interface SaveData {
  meta: SaveMeta;
  careerExport: any;
  seasonCache?: any;
  iconicMoments?: any[];
}

/** List all save names */
export function listSaves(): SaveMeta[] {
  try {
    return JSON.parse(localStorage.getItem(SAVES_INDEX_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Get the name of the currently active save (null = auto-sync) */
export function getActiveSave(): string | null {
  return localStorage.getItem(ACTIVE_SAVE_KEY);
}

/** Set the active save name (null = revert to auto-sync) */
export function setActiveSave(name: string | null): void {
  if (name) {
    localStorage.setItem(ACTIVE_SAVE_KEY, name);
  } else {
    localStorage.removeItem(ACTIVE_SAVE_KEY);
  }
}

/** Save career data under a given name */
export function saveCareerData(name: string, careerExport: any, seasonCache?: any): void {
  const meta: SaveMeta = {
    name,
    createdAt: Date.now(),
    playerName: careerExport?.my_player_profile
      ? `${careerExport.my_player_profile.firstname || ''} ${careerExport.my_player_profile.lastname || ''}`.trim() || undefined
      : undefined,
    playerClub: careerExport?.my_player_profile?.currentClub || undefined,
  };

  // Include iconic moments from localStorage
  let iconicMoments: any[] = [];
  try {
    const stored = localStorage.getItem('career_iconic_moments');
    if (stored) iconicMoments = JSON.parse(stored);
  } catch {}

  // Store the data
  localStorage.setItem(`career_save_${name}`, JSON.stringify({ meta, careerExport, seasonCache, iconicMoments }));

  // Update index
  const saves = listSaves().filter(s => s.name !== name);
  saves.unshift(meta);
  localStorage.setItem(SAVES_INDEX_KEY, JSON.stringify(saves));
}

/** Load a save by name */
export function loadSave(name: string): SaveData | null {
  try {
    const raw = localStorage.getItem(`career_save_${name}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Restore iconic moments to localStorage
    if (data.iconicMoments && Array.isArray(data.iconicMoments)) {
      localStorage.setItem('career_iconic_moments', JSON.stringify(data.iconicMoments));
    }
    return data;
  } catch {
    return null;
  }
}

/** Delete a save by name. If it was the active save, revert to auto-sync. */
export function deleteSave(name: string): void {
  localStorage.removeItem(`career_save_${name}`);
  const saves = listSaves().filter(s => s.name !== name);
  localStorage.setItem(SAVES_INDEX_KEY, JSON.stringify(saves));
  if (getActiveSave() === name) {
    setActiveSave(null);
  }
}

/** Rename a save */
export function renameSave(oldName: string, newName: string): void {
  const data = loadSave(oldName);
  if (!data) return;
  deleteSave(oldName);
  saveCareerData(newName, data.careerExport, data.seasonCache);
  if (getActiveSave() === oldName) {
    setActiveSave(newName);
  }
}

/** Get career export data from the active save, or null if using auto-sync */
export function getActiveSaveData(): any | null {
  const active = getActiveSave();
  if (!active) return null;
  const save = loadSave(active);
  return save?.careerExport || null;
}

/** Get season cache from the active save, or null */
export function getActiveSaveCache(): any | null {
  const active = getActiveSave();
  if (!active) return null;
  const save = loadSave(active);
  return save?.seasonCache || null;
}

/** Export a save as a downloadable JSON blob */
export function exportSaveAsJson(name: string): Blob | null {
  const save = loadSave(name);
  if (!save) return null;
  return new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
}

/** Check if a save name already exists */
export function saveExists(name: string): boolean {
  return listSaves().some(s => s.name === name);
}

/** Auto-save current state (iconic moments + player data) to a backup slot */
export function autoSaveCurrentState(careerExport: any, seasonCache?: any): void {
  const AUTO_SAVE_KEY = '__auto_backup';
  let iconicMoments: any[] = [];
  try {
    const stored = localStorage.getItem('career_iconic_moments');
    if (stored) iconicMoments = JSON.parse(stored);
  } catch {}

  const playerName = careerExport?.my_player_profile
    ? `${careerExport.my_player_profile.firstname || ''} ${careerExport.my_player_profile.lastname || ''}`.trim() || 'Unknown'
    : 'Unknown';
  const seasons = careerExport?.seasons || [];
  const currentSeason = seasons.length > 0 ? seasons[seasons.length - 1].season : 'unknown';

  const meta: SaveMeta = {
    name: AUTO_SAVE_KEY,
    createdAt: Date.now(),
    playerName,
    playerClub: careerExport?.my_player_profile?.currentClub || undefined,
  };

  localStorage.setItem(`career_save_${AUTO_SAVE_KEY}`, JSON.stringify({
    meta, careerExport, seasonCache, iconicMoments,
    _autoSaveSeason: currentSeason,
    _autoSaveDate: new Date().toISOString(),
  }));
}

/** Get the auto-save data */
export function getAutoSave(): SaveData | null {
  return loadSave('__auto_backup');
}
