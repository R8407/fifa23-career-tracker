import React, { useState, useRef } from 'react';
import { PlayerData, Position } from '../types';
import { X, Check, UserPen, Upload, Trash2 } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface EditPlayerModalProps {
  player: PlayerData;
  onSave: (updated: Partial<PlayerData>) => void;
  onClose: () => void;
}

export const EditPlayerModal: React.FC<EditPlayerModalProps> = ({ player, onSave, onClose }) => {
  const [name, setName] = useState(player.name);
  const [nickname, setNickname] = useState(player.nickname);
  const [position, setPosition] = useState<Position>(player.position);
  const [currentClub, setCurrentClub] = useState(player.currentClub);
  const [nationality, setNationality] = useState(player.nationality);
  const [jerseyNumber, setJerseyNumber] = useState(player.jerseyNumber);
  const [preferredFoot, setPreferredFoot] = useState<'Left' | 'Right' | 'Both'>(player.preferredFoot);
  const [previewImage, setPreviewImage] = useState<string | null>(() => localStorage.getItem('player_overview_image'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewImage(dataUrl);
      localStorage.setItem('player_overview_image', dataUrl);
      window.dispatchEvent(new Event('player-image-changed'));
      audioEngine.playClick();
    };
    reader.readAsDataURL(file);
  };

  const handleImageRemove = () => {
    setPreviewImage(null);
    localStorage.removeItem('player_overview_image');
    window.dispatchEvent(new Event('player-image-changed'));
    audioEngine.playClick();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    audioEngine.playClick();
    onSave({
      name,
      nickname,
      position,
      currentClub,
      nationality,
      jerseyNumber,
      preferredFoot
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <UserPen className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-black text-white uppercase tracking-wider">
            EDIT PLAYER ARCHIVE PROFILE
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Player Image Upload */}
          <div>
            <label className="block text-zinc-400 font-bold uppercase mb-1">Player Image</label>
            <div className="flex items-center gap-3">
              <div
                className="w-20 h-20 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewImage ? (
                  <img src={previewImage} alt="Player" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-6 h-6 text-zinc-600" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-zinc-900 text-zinc-300 font-bold rounded-xl border border-zinc-800 hover:border-amber-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> {previewImage ? 'Replace Image' : 'Upload Image'}
                </button>
                {previewImage && (
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    className="w-full py-2 bg-zinc-900 text-red-400 font-bold rounded-xl border border-zinc-800 hover:border-red-500 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Image
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-bold uppercase mb-1">Player Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-bold uppercase mb-1">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-bold uppercase mb-1">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 outline-none"
              >
                <option value="RW">RW (Right Winger)</option>
                <option value="ST">ST (Striker)</option>
                <option value="LW">LW (Left Winger)</option>
                <option value="CAM">CAM (Attacking Mid)</option>
                <option value="CM">CM (Central Mid)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-bold uppercase mb-1">Jersey Number</label>
              <input
                type="number"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-bold uppercase mb-1">Current Club</label>
              <input
                type="text"
                value={currentClub}
                onChange={(e) => setCurrentClub(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-bold uppercase mb-1">Nationality</label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white font-bold focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-bold uppercase mb-1">Preferred Foot</label>
            <div className="flex gap-2">
              {(['Left', 'Right', 'Both'] as const).map((ft) => (
                <button
                  type="button"
                  key={ft}
                  onClick={() => setPreferredFoot(ft)}
                  className={`flex-1 py-2 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                    preferredFoot === ft
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 text-zinc-300 font-bold rounded-xl border border-zinc-800 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl shadow cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
