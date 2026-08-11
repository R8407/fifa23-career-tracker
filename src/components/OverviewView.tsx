import React, { useState, useEffect } from 'react';
import { PlayerData, IconicMoment } from '../types';
import { Trophy, Flame, Zap, Award, Star, TrendingUp, Shield, Crown, Sparkles, ChevronLeft, ChevronRight, Play, Pause, Plus } from 'lucide-react';
import { audioEngine } from '../utils/audio';
import { getLeagueLogo } from '../utils/logos';

interface OverviewViewProps {
  player: PlayerData;
  onNavigateTab: (tabId: string) => void;
  onOpenIconicModal?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ player, onNavigateTab, onOpenIconicModal }) => {
  const totalGoals = player.seasons.reduce((acc, s) => acc + s.goals, 0);
  const totalAssists = player.seasons.reduce((acc, s) => acc + s.assists, 0);
  const totalApps = player.seasons.reduce((acc, s) => acc + s.apps, 0);
  const totalTrophies = player.trophies.filter(t => !['manofmatch', 'assistking', 'youngplayer', 'bestxi'].includes(t.iconType)).reduce((acc, t) => acc + t.quantity, 0);

  // Iconic Moments Carousel state
  const moments = player.iconicMoments && player.iconicMoments.length > 0
    ? player.iconicMoments
    : [
        {
          id: 'im_default',
          title: 'Scored Winning Goal in FIFA World Cup Final',
          description: 'Curled a 118th-minute extra-time winner past the keeper to secure the trophy.',
          year: '2026',
          competition: 'FIFA World Cup',
          opponent: 'France',
          matchResult: 'Ghana 3 - 2 France (AET)',
          impactTag: 'WORLD CUP FINAL WINNER',
          imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80'
        }
      ];

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying || moments.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % moments.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, moments.length]);

  const handlePrevSlide = () => {
    audioEngine.playClick();
    setCurrentSlideIndex((prev) => (prev === 0 ? moments.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    audioEngine.playClick();
    setCurrentSlideIndex((prev) => (prev + 1) % moments.length);
  };

  const currentMoment = moments[currentSlideIndex] || moments[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Player Card Section */}
      <div className="relative overflow-hidden bg-[#1e293b] border border-slate-700 rounded-xl p-6">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: FIFA Style Player Card Badge */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative w-64 sm:w-72 bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 p-1 rounded-xl">
              <div className="bg-[#0f172a] rounded-[10px] p-5 text-center relative overflow-hidden">
                {/* FIFA Card Header */}
                <div className="flex items-start justify-between">
                  <div className="text-left">
                    <div className="text-4xl font-black text-white tracking-tight leading-none font-mono">
                      {player.overall}
                    </div>
                    <div className="text-sm font-bold text-slate-300 uppercase mt-0.5">
                      {player.position}
                    </div>
                    <div className="mt-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      POT: {player.potential}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-2xl">{player.nationalityFlag}</span>
                    <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded">{player.currentClub}</span>
                    {player.isOnLoan && (
                      <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        ON LOAN from {player.parentClub}
                      </span>
                    )}
                  </div>
                </div>

                {/* Player Avatar */}
                <div className="my-4 relative h-36 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center relative overflow-hidden">
                    {player.headassetid ? (
                      <img
                        src={`/miniface/${player.headassetid}.png`}
                        alt={player.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full items-center justify-center text-3xl font-bold text-emerald-400 ${player.headassetid ? 'hidden' : 'flex'}`}>
                      {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="absolute -bottom-2 bg-emerald-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
                      #{player.jerseyNumber}
                    </div>
                  </div>
                </div>

                {/* Player Name */}
                <h2 className="text-2xl font-bold text-white">
                  {player.name}
                </h2>
                <p className="text-xs text-emerald-400 font-medium mb-3">
                  "{player.nickname}"
                </p>

                {/* Core Attributes Line */}
                <div className="grid grid-cols-6 gap-1 pt-3 border-t border-slate-700 text-xs font-mono">
                  <div>
                    <div className="text-slate-500 text-xs">PAC</div>
                    <div className="font-medium text-white">{player.attributes.pace}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">SHO</div>
                    <div className="font-medium text-white">{player.attributes.shooting}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">PAS</div>
                    <div className="font-medium text-white">{player.attributes.passing}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">DRI</div>
                    <div className="font-medium text-white">{player.attributes.dribbling}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">DEF</div>
                    <div className="font-medium text-white">{player.attributes.defending}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">PHY</div>
                    <div className="font-medium text-white">{player.attributes.physical}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Detailed Career Metadata & Contract */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {parseInt(player.overall) >= 80 && (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" /> WORLD CLASS
                </span>
              )}
              <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded flex items-center gap-1">
                Age: <strong className="text-white">{player.age}</strong>
              </span>
              <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded flex items-center gap-1">
                Foot: <strong className="text-white">{player.preferredFoot}</strong>
              </span>
              <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded flex items-center gap-1">
                Debut: <strong className="text-white">{player.debutYear}</strong>
              </span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {player.name}
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-xl">
                Managing an elite career archive. From initial professional debut to world champion and Ballon d'Or glory with {player.currentClub}.
              </p>
            </div>

            {/* Financial & Club Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg">
                <div className="text-slate-500 text-xs font-medium">Current Club</div>
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={`/assets/clubs/113974.webp`}
                    alt={player.currentClub}
                    className="w-6 h-6 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="text-sm font-medium text-white">{player.currentClub}</div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg">
                <div className="text-slate-500 text-xs font-medium">Market Value</div>
                <div className="text-sm font-medium text-emerald-400 mt-1">
                  {player.marketValue}
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg">
                <div className="text-slate-500 text-xs font-medium">Contract Wage</div>
                <div className="text-sm font-medium text-white mt-1">
                  {player.weeklySalary}
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg">
                <div className="text-slate-500 text-xs font-medium">Height / Weight</div>
                <div className="text-sm font-medium text-white mt-1">
                  {player.height} • {player.weight}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  audioEngine.playClick();
                  onNavigateTab('halloffame');
                }}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Award className="w-4 h-4" />
                <span>CHASE HALL OF FAME RECORDS</span>
              </button>

              <button
                onClick={() => {
                  audioEngine.playClick();
                  onNavigateTab('compare');
                }}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Star className="w-4 h-4 text-amber-400" />
                <span>COMPARE VS 50 LEGENDS</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURED ICONIC MOMENTS SLIDESHOW CAROUSEL */}
      <div className="relative overflow-hidden bg-zinc-950 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Slideshow Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                CAREER ICONIC MOMENTS SLIDESHOW
              </h3>
              <p className="text-xs text-amber-300 font-mono">
                Slide {currentSlideIndex + 1} of {moments.length} • Documented career milestones & legendary matches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Play/Pause Toggle */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Slideshow' : 'Autoplay Slideshow'}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl cursor-pointer transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-zinc-400" />}
            </button>

            {/* Document Moment button */}
            {onOpenIconicModal && (
              <button
                onClick={onOpenIconicModal}
                className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Document Moment</span>
              </button>
            )}

            {/* Prev & Next Arrows */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={handlePrevSlide}
                className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextSlide}
                className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Slide Display Card */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-zinc-800 min-h-[220px] flex flex-col md:flex-row items-center gap-6 p-6 shadow-inner">
          {/* Photo Backdrop preview */}
          {currentMoment.imageUrl && (
            <div className="relative w-full md:w-72 h-48 rounded-xl overflow-hidden shrink-0 border border-amber-500/30 shadow-lg group">
              <img
                src={currentMoment.imageUrl}
                alt={currentMoment.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-amber-300 font-bold">
                <span>{currentMoment.competition}</span>
                <span>{currentMoment.year}</span>
              </div>
            </div>
          )}

          {/* Slide Description Details */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold rounded-full tracking-wider font-mono uppercase">
                {currentMoment.impactTag}
              </span>
              <span className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
                <img
                  src={getLeagueLogo(currentMoment.competition)}
                  alt=""
                  className="w-4 h-4 object-contain"
                />
                {currentMoment.competition} • {currentMoment.year}
              </span>
            </div>

            <h4 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              "{currentMoment.title}"
            </h4>

            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
              {currentMoment.description}
            </p>

            {currentMoment.matchResult && (
              <div className="inline-block px-3 py-1 bg-zinc-900 border border-amber-500/30 rounded-lg text-xs font-mono font-bold text-amber-400">
                Final Result: {currentMoment.matchResult}
              </div>
            )}
          </div>
        </div>

        {/* Carousel Slide Indicators */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {moments.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                audioEngine.playClick();
                setCurrentSlideIndex(idx);
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentSlideIndex === idx ? 'w-8 bg-amber-400' : 'w-2 bg-zinc-800 hover:bg-zinc-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Career Summary Big Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Career Apps */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Career Apps</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl lg:text-4xl font-black text-white font-mono">
            {totalApps}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-medium">
            {player.isLoadedFromExportDB
              ? `At ${player.currentClub}`
              : 'Across Serie A, Bundesliga, PL & La Liga'}
          </p>
        </div>

        {/* Goals */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-amber-500/30 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/60 transition-all shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Career Goals</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl lg:text-4xl font-black text-amber-400 font-mono">
            {totalGoals}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 font-medium">
            Ratio: <strong className="text-amber-300">{(totalGoals / (totalApps || 1)).toFixed(2)}</strong> goals / match
          </p>
        </div>

        {/* Assists */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Career Assists</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl lg:text-4xl font-black text-blue-400 font-mono">
            {totalAssists}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-medium">
            Key Goal Contributions: <strong className="text-blue-300">{totalGoals + totalAssists}</strong>
          </p>
        </div>

        {/* Trophies */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 border border-yellow-500/30 p-5 rounded-2xl relative overflow-hidden group hover:border-yellow-500/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-300">Trophies Won</span>
            <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl lg:text-4xl font-black text-yellow-300 font-mono">
            {totalTrophies}
          </div>
            <p className="text-[11px] text-zinc-400 mt-1 font-medium">
              {player.isLoadedFromExportDB
                ? 'Start your trophy collection'
                : 'Including World Cup, UCL & Ballon d\'Or'}
            </p>
        </div>
      </div>

      {/* Legacy Score & All-Time Ranking Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Legacy Score Section */}
        <div className="lg:col-span-5 bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950 border border-amber-500/30 p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                LEGACY SCORE INDEX
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">Footprint on Football</h3>
            </div>
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>

          <div className="my-6 flex items-center justify-around gap-4">
            {/* Circular Dial Visual */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-zinc-800"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-amber-400"
                  fill="transparent"
                  strokeDasharray="326.72"
                  strokeDashoffset={326.72 * (1 - player.legacyScore / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-amber-400 font-mono leading-none">
                  {player.legacyScore}
                </span>
                <span className="block text-[10px] text-zinc-400 font-bold uppercase mt-0.5">/ 100</span>
              </div>
            </div>

            {/* Rank details */}
            <div className="space-y-3">
              <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  ALL-TIME RANKING
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  #{player.allTimeRank}
                </div>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  HISTORICAL PERCENTILE
                </div>
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  Top {(100 - player.historicalPercentile).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-3">
            {player.isLoadedFromExportDB
              ? `Your journey at ${player.currentClub} begins now. Build your legacy through consistent performances.`
              : 'Your current GOAT trajectory puts you in company with icons like Kaká, Ronaldinho, and Henry. 14 records broken toward immortality.'}
          </p>
        </div>

        {/* Latest Season Highlights */}
        <div className="lg:col-span-7 bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                  CURRENT SEASON HIGHLIGHTS
                </h3>
                <p className="text-xs text-zinc-400">
                  {player.isLoadedFromExportDB
                    ? `First professional season at ${player.currentClub}`
                    : 'Peak performance campaign at Real Madrid'}
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg">
                {player.isLoadedFromExportDB ? 'SEASON 1' : 'AVG RATING: 8.6'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">League Goals</span>
                <div className="text-xl font-bold text-amber-400 font-mono">{player.seasons.length > 0 ? player.seasons[player.seasons.length - 1].goals : totalGoals}</div>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">League Apps</span>
                <div className="text-xl font-bold text-amber-400 font-mono">{player.seasons.length > 0 ? player.seasons[player.seasons.length - 1].apps : totalApps}</div>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Assists</span>
                <div className="text-xl font-bold text-blue-400 font-mono">{player.seasons.length > 0 ? player.seasons[player.seasons.length - 1].assists : totalAssists}</div>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Rating</span>
                <div className="text-xl font-bold text-zinc-200 font-mono">{player.seasons.length > 0 ? player.seasons[player.seasons.length - 1].avgRating.toFixed(1) : '—'}</div>
              </div>
            </div>

            {player.isLoadedFromExportDB ? (
              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-zinc-400">
                  <Trophy className="w-4 h-4" /> Season 1 in Progress
                </div>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Your first professional season at {player.currentClub}. Start playing matches to track your progress, goals, and highlights here.
                </p>
              </div>
            ) : (
              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-amber-500/20 text-xs text-zinc-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <Trophy className="w-4 h-4" /> Ballon d'Or Winner (2029)
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  "Scored a historic hat-trick in the Champions League Final against Manchester City; crowned Europe's best footballer."
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-between items-center text-xs">
            <span className="text-zinc-500">
              {player.isLoadedFromExportDB
                ? `Age ${player.age} (${player.overall} OVR) → Potential (${player.potential} OVR)`
                : 'Career Trajectory: Age 18 (72 OVR) → Age 27 (91 OVR)'}
            </span>
            <button
              onClick={() => onNavigateTab('seasons')}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              View Full Season History →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
