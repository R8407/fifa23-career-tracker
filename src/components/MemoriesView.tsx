import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Upload, X, Film, Image as ImageIcon, Trash2, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { IconicMoment } from '../types';
import { audioEngine } from '../utils/audio';

interface MemoriesViewProps {
  moments: IconicMoment[];
  onAddMoment: (moment: IconicMoment) => void;
  onDeleteMoment: (id: string) => void;
}

const COMPRESS_THRESHOLD = 50 * 1024 * 1024; // 50MB
const TARGET_SIZE_MB = 20;

async function compressVideo(file: File): Promise<string> {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm`, 'application/wasm'),
  });

  await ffmpeg.writeFile('input.mp4', new Uint8Array(await file.arrayBuffer()));

  // Calculate target bitrate: target_size_bits / duration
  const duration = await getVideoDuration(file);
  const targetBits = TARGET_SIZE_MB * 8 * 1024 * 1024;
  const videoBitrate = Math.floor((targetBits / duration) * 0.85); // 85% for video, 15% for audio

  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-c:v', 'libx264', '-b:v', `${videoBitrate}`,
    '-preset', 'fast',
    '-c:a', 'aac', '-b:a', '64k',
    '-y', 'output.mp4',
  ]);

  const data = await ffmpeg.readFile('output.mp4');
  const blob = new Blob([data], { type: 'video/mp4' });

  // Cleanup
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('output.mp4');
  ffmpeg.terminate();

  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => resolve(60); // fallback
    video.src = URL.createObjectURL(file);
  });
}

// Known video files in public/assets/videos/
const KNOWN_VIDEOS = [
  { filename: 'chelsea_1_epl.mp4', title: 'First Premier League Title', description: 'Lifted the Premier League trophy with Chelsea.', year: '2025', competition: 'Premier League', impactTag: 'EPL CHAMPION' },
  { filename: 'chelsea_1_UEL.mp4', title: 'Europa League Triumph', description: 'Chelsea lift the UEFA Europa League trophy.', year: '2025', competition: 'UEFA Europa League', impactTag: 'EUROPA CHAMPION' },
];

export const MemoriesView: React.FC<MemoriesViewProps> = ({ moments, onAddMoment, onDeleteMoment }) => {
  const [selectedMoment, setSelectedMoment] = useState<IconicMoment | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadYear, setUploadYear] = useState('');
  const [uploadCompetition, setUploadCompetition] = useState('');
  const [uploadImpactTag, setUploadImpactTag] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect videos from known list and merge with stored moments
  const allMoments: IconicMoment[] = [
    ...KNOWN_VIDEOS.map(v => ({
      id: `video_${v.filename}`,
      title: v.title,
      description: v.description,
      year: v.year,
      competition: v.competition,
      impactTag: v.impactTag,
      videoUrl: `/assets/videos/${v.filename}`,
      mediaType: 'video' as const,
    })),
    ...moments.filter(m => !KNOWN_VIDEOS.some(v => m.id === `video_${v.filename}`)),
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadFile(file);
    const isVideo = file.type.startsWith('video/');
    
    // Compress videos over 50MB
    if (isVideo && file.size > COMPRESS_THRESHOLD) {
      setIsCompressing(true);
      setCompressProgress('Compressing video...');
      try {
        const base64 = await compressVideo(file);
        setUploadPreview(base64);
        setCompressProgress(`Compressed from ${(file.size / 1024 / 1024).toFixed(0)}MB to ~${TARGET_SIZE_MB}MB`);
      } catch (err) {
        console.error('Compression failed:', err);
        setCompressProgress('Compression failed, using original');
        // Fallback to original
        const reader = new FileReader();
        reader.onload = () => setUploadPreview(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    } else {
      // Images and small videos: convert directly
      const reader = new FileReader();
      reader.onload = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (!uploadFile || !uploadTitle.trim()) return;

    const isVideo = uploadFile.type.startsWith('video/');
    const newMoment: IconicMoment = {
      id: `moment_${Date.now()}`,
      title: uploadTitle,
      description: uploadDesc,
      year: uploadYear || new Date().getFullYear().toString(),
      competition: uploadCompetition,
      impactTag: uploadImpactTag || 'ICONIC MOMENT',
      videoUrl: uploadPreview || undefined,
      imageUrl: !isVideo ? uploadPreview || undefined : undefined,
      mediaType: isVideo ? 'video' : 'image',
    };

    onAddMoment(newMoment);
    setShowUpload(false);
    setUploadTitle('');
    setUploadDesc('');
    setUploadYear('');
    setUploadCompetition('');
    setUploadImpactTag('');
    setUploadFile(null);
    setUploadPreview(null);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleMomentClick = (moment: IconicMoment) => {
    setSelectedMoment(moment);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-white">Iconic Moments</h3>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-zinc-950 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Moment
        </button>
      </div>

      {/* Moments Grid */}
      {allMoments.length === 0 ? (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 text-center">
          <Film className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">No iconic moments yet.</p>
          <p className="text-xs text-zinc-500 mt-1">Drop videos or images in public/assets/videos/ or upload below.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allMoments.map((moment) => (
            <button
              key={moment.id}
              onClick={() => handleMomentClick(moment)}
              className="relative group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                {moment.mediaType === 'video' && moment.videoUrl ? (
                  <>
                    <video
                      src={moment.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                      <Play className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                  </>
                ) : moment.imageUrl ? (
                  <img src={moment.imageUrl} alt={moment.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-zinc-600" />
                  </div>
                )}
                
                {/* Impact Tag */}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 bg-amber-500 text-zinc-950 text-[9px] font-black rounded uppercase">
                    {moment.impactTag}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5 text-left">
                <p className="text-xs font-bold text-white line-clamp-1">{moment.title}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{moment.competition} • {moment.year}</p>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMoment(moment.id);
                }}
                className="absolute top-2 right-2 p-1 bg-red-500/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Viewer Modal */}
      {selectedMoment && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => { setSelectedMoment(null); setIsPlaying(false); }}>
          <div className="relative max-w-4xl w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => { setSelectedMoment(null); setIsPlaying(false); }}
              className="absolute top-4 right-4 z-10 p-2 bg-zinc-800/80 text-white rounded-full hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video/Image */}
            <div className="aspect-video bg-black">
              {selectedMoment.mediaType === 'video' && selectedMoment.videoUrl ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    src={selectedMoment.videoUrl}
                    className="w-full h-full object-contain"
                    controls
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
              ) : selectedMoment.imageUrl ? (
                <img src={selectedMoment.imageUrl} alt={selectedMoment.title} className="w-full h-full object-contain" />
              ) : null}
            </div>

            {/* Info Bar */}
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="px-2 py-0.5 bg-amber-500 text-zinc-950 text-[9px] font-black rounded uppercase">
                    {selectedMoment.impactTag}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-2">{selectedMoment.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{selectedMoment.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                    <span>{selectedMoment.competition}</span>
                    <span>•</span>
                    <span>{selectedMoment.year}</span>
                    {selectedMoment.matchResult && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400">{selectedMoment.matchResult}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="relative max-w-lg w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">Add Iconic Moment</h3>
              <button onClick={() => setShowUpload(false)} className="p-1 text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              {/* File Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video bg-zinc-800 border-2 border-dashed border-zinc-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-amber-500/50 transition-colors cursor-pointer"
                >
                  {uploadPreview ? (
                    uploadFile?.type.startsWith('video/') ? (
                      <video src={uploadPreview} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    )
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-zinc-500" />
                      <p className="text-xs text-zinc-400">Click to upload video or image</p>
                      <p className="text-[10px] text-zinc-600">MP4, WebM, JPG, PNG</p>
                    </>
                  )}
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Title *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. First Premier League Title"
                  className="w-full mt-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Description</label>
                <textarea
                  value={uploadDesc}
                  onChange={e => setUploadDesc(e.target.value)}
                  placeholder="Describe the moment..."
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Year & Competition */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase">Year</label>
                  <input
                    type="text"
                    value={uploadYear}
                    onChange={e => setUploadYear(e.target.value)}
                    placeholder="2025"
                    className="w-full mt-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase">Competition</label>
                  <input
                    type="text"
                    value={uploadCompetition}
                    onChange={e => setUploadCompetition(e.target.value)}
                    placeholder="Premier League"
                    className="w-full mt-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Impact Tag */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Impact Tag</label>
                <input
                  type="text"
                  value={uploadImpactTag}
                  onChange={e => setUploadImpactTag(e.target.value)}
                  placeholder="e.g. EPL CHAMPION"
                  className="w-full mt-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Compression Progress */}
              {(isCompressing || compressProgress) && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isCompressing ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}`}>
                  {isCompressing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-emerald-400">&#10003;</span>}
                  {isCompressing ? compressProgress : compressProgress}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => { setShowUpload(false); setIsCompressing(false); setCompressProgress(''); }}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadTitle.trim() || isCompressing}
                className="px-4 py-2 bg-amber-500 text-zinc-950 rounded-lg text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isCompressing ? 'Compressing...' : 'Add Moment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
