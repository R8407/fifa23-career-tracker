import React, { useState } from 'react';
import { PlayerData, IconicMoment } from '../types';
import { Sparkles, X, Plus, Trash2, Camera, Calendar, Trophy, Star, ShieldCheck } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface IconicMomentsModalProps {
  player: PlayerData;
  playerId?: string;
  isOpen: boolean;
  onClose: () => void;
  onAddMoment: (moment: IconicMoment) => void;
  onDeleteMoment: (id: string) => void;
}

export const IconicMomentsModal: React.FC<IconicMomentsModalProps> = ({
  player,
  playerId,
  isOpen,
  onClose,
  onAddMoment,
  onDeleteMoment
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');

  // New moment form state
  const [title, setTitle] = useState('');
  const [competition, setCompetition] = useState('UEFA Champions League');
  const [year, setYear] = useState('2029');
  const [opponent, setOpponent] = useState('');
  const [matchResult, setMatchResult] = useState('');
  const [impactTag, setImpactTag] = useState('CHAMPIONS LEAGUE WINNER');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    audioEngine.playGoldenFanfare();

    const newMoment: IconicMoment = {
      id: `im_${Date.now()}`,
      title: title.trim(),
      competition: competition.trim(),
      year: year.trim() || '2029',
      opponent: opponent.trim() || undefined,
      matchResult: matchResult.trim() || undefined,
      impactTag: impactTag.trim().toUpperCase() || 'CAREER HIGHLIGHT',
      description: description.trim(),
      imageUrl: mediaType === 'image' ? (imageUrl.trim() || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80') : undefined,
      videoUrl: mediaType === 'video' ? videoUrl.trim() || undefined : undefined,
      mediaType: mediaType
    };

    onAddMoment(newMoment);

    // Reset form
    setTitle('');
    setDescription('');
    setOpponent('');
    setMatchResult('');
    setImageUrl('');
    setVideoUrl('');
    setMediaType('image');
    setActiveTab('list');
  };

  const presetImages = [
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80'
  ];

  // Player-specific video folder: /assets/videos/{name}_{id}/
  const playerVideoFolder = (() => {
    const name = (player.name || 'unknown').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const id = playerId || '0';
    return `/assets/videos/${name}_${id}`;
  })();

  const presetVideos = [
    { name: 'La Liga Debut & Goal', path: `${playerVideoFolder}/first_la_liga_debut_and_goal.mp4` }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-zinc-950 border-2 border-amber-500/60 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-zinc-950 via-amber-950/50 to-zinc-950 border-b border-amber-500/40 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                CAREER ICONIC MOMENTS ARCHIVE
              </h2>
              <p className="text-xs text-amber-400 font-mono">
                Document history-defining goals, titles & legendary achievements
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/60">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'border-b-2 border-amber-400 text-amber-300 bg-amber-500/10'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" /> Documented Moments ({player.iconicMoments.length})
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'border-b-2 border-amber-400 text-amber-300 bg-amber-500/10'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" /> Document New Moment
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'list' && (
            <div className="space-y-3">
              {player.iconicMoments.map((m) => (
                <div
                  key={m.id}
                  className="bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/50 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {m.mediaType === 'video' && m.videoUrl ? (
                      <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-amber-500/30 shrink-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                    ) : m.imageUrl ? (
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover border border-amber-500/30 shrink-0"
                      />
                    ) : null}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold rounded uppercase font-mono">
                          {m.impactTag}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {m.competition} • {m.year}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white mt-1">{m.title}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                      {m.matchResult && (
                        <div className="text-[10px] text-amber-400/90 font-mono mt-1 font-bold">
                          Match: {m.matchResult}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      audioEngine.playClick();
                      onDeleteMoment(m.id);
                    }}
                    title="Delete moment"
                    className="p-2 bg-red-950/40 hover:bg-red-900 text-red-400 rounded-xl border border-red-800/50 cursor-pointer self-end sm:self-auto transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'add' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                  Moment Title <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scored winning goal in World Cup Final"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                    Competition
                  </label>
                  <select
                    value={competition}
                    onChange={(e) => setCompetition(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="FIFA World Cup">FIFA World Cup</option>
                    <option value="UEFA Champions League">UEFA Champions League</option>
                    <option value="La Liga EA Sports">La Liga EA Sports</option>
                    <option value="Premier League">Premier League</option>
                    <option value="Ballon d'Or Gala">Ballon d'Or Gala</option>
                    <option value="El Clásico">El Clásico</option>
                    <option value="Copa del Rey">Copa del Rey</option>
                    <option value="International Friendly">International Friendly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                    Year / Season
                  </label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 2026 or 2028/29"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                    Opponent / Rival
                  </label>
                  <input
                    type="text"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    placeholder="e.g. France or FC Barcelona"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                    Impact Tag / Headline
                  </label>
                  <input
                    type="text"
                    value={impactTag}
                    onChange={(e) => setImpactTag(e.target.value)}
                    placeholder="e.g. WORLD CUP FINAL WINNER"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                  Match Score / Result
                </label>
                <input
                  type="text"
                  value={matchResult}
                  onChange={(e) => setMatchResult(e.target.value)}
                  placeholder="e.g. Team A 2 - 1 Team B"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                  Detailed Story / Description <span className="text-amber-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the minute, shot trajectory, crowd atmosphere, and legendary importance of this moment..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1.5">
                  Media Type
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setMediaType('image')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      mediaType === 'image'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Camera className="w-4 h-4 inline mr-1" /> Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType('video')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      mediaType === 'video'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Video
                  </button>
                </div>

                {mediaType === 'image' ? (
                  <>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1.5">
                      Select Photo Backdrop
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {presetImages.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt=""
                          onClick={() => setImageUrl(img)}
                          className={`w-full h-14 object-cover rounded-xl cursor-pointer border-2 transition-all ${
                            imageUrl === img ? 'border-amber-400 scale-105 shadow-md' : 'border-zinc-800 opacity-60 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1.5">
                      Select Video
                    </label>
                    <div className="space-y-2">
                      {presetVideos.map((vid, idx) => (
                        <div
                          key={idx}
                          onClick={() => setVideoUrl(vid.path)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                            videoUrl === vid.path
                              ? 'bg-amber-500/20 border-amber-400'
                              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <svg className="w-5 h-5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          <div>
                            <div className="text-xs font-bold text-white">{vid.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{vid.path}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 fill-zinc-950" /> Immortalize Moment in Museum
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
