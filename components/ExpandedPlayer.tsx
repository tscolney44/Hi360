
import React from 'react';
import { PlayerState, RepeatMode } from '../types.ts';

interface ExpandedPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  state: PlayerState;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onChangeSpeed: (speed: number) => void;
  onChangeVolume: (vol: number) => void;
}

const ExpandedPlayer: React.FC<ExpandedPlayerProps> = ({
  isOpen, onClose, state, onTogglePlay, onSeek, onNext, onPrevious, 
  onToggleShuffle, onToggleRepeat, onChangeSpeed, onChangeVolume
}) => {
  if (!isOpen || !state.currentSong) return null;

  const { currentSong, isPlaying, progress, duration, isShuffle, repeatMode, playbackRate, volume } = state;

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center p-6 md:p-12 animate-in fade-in slide-in-from-bottom-20 duration-500">
      {/* Dynamic Background Blur */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <img 
          src={currentSong.cover_url} 
          className="w-full h-full object-cover scale-150 blur-[150px] opacity-30 md:opacity-40 transition-opacity duration-1000"
        />
      </div>

      {/* Header Bar */}
      <div className="w-full max-w-7xl flex justify-between items-center mb-8 md:mb-16 pt-[env(safe-area-inset-top)]">
        <button onClick={onClose} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-90">
          <i className="fas fa-chevron-down text-zinc-400"></i>
        </button>
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-1">Now Streaming</p>
          <p className="text-xs md:text-sm font-bold text-white uppercase tracking-widest">{currentSong.format} LOSSLESS</p>
        </div>
        <button className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-white/5 border border-white/5 opacity-0 pointer-events-none">
          <i className="fas fa-ellipsis-h"></i>
        </button>
      </div>

      <div className="w-full max-w-7xl flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 overflow-y-auto no-scrollbar pb-12">
        {/* Artwork Section */}
        <div className="w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[550px] shrink-0">
          <div className={`relative aspect-square rounded-[32px] md:rounded-[60px] overflow-hidden shadow-[0_60px_120px_-20px_rgba(0,0,0,1)] transition-all duration-1000 cubic-bezier(0.19, 1, 0.22, 1) ${isPlaying ? 'scale-100' : 'scale-90 opacity-40 blur-sm'}`}>
            <img src={currentSong.cover_url} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Content Section */}
        <div className="w-full max-w-xl flex flex-col justify-center gap-8 md:gap-12">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-3 mb-4 bg-zinc-900/50 px-3 py-1 rounded-full border border-white/5">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{currentSong.bit_depth}-BIT / 192KHZ</span>
            </div>
            <h2 className="text-3xl md:text-6xl font-black tracking-tighter mb-4 text-white leading-[1.1]">{currentSong.title}</h2>
            <p className="text-lg md:text-3xl font-bold text-zinc-500 tracking-tight">{currentSong.artist}</p>
          </div>

          {/* Scrubber Area */}
          <div className="space-y-6">
            <div className="relative h-1.5 md:h-2 bg-white/5 rounded-full cursor-pointer group" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onSeek(((e.clientX - rect.left) / rect.width) * duration);
            }}>
              <div 
                className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-100" 
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${(progress / (duration || 1)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-black text-zinc-600 tracking-widest">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between px-4 lg:px-0">
            <button 
              onClick={onToggleShuffle} 
              className={`text-xl transition-all active:scale-90 ${isShuffle ? 'text-blue-500' : 'text-zinc-600 hover:text-white'}`}
            >
              <i className="fas fa-shuffle"></i>
            </button>
            
            <div className="flex items-center gap-8 md:gap-14">
              <button onClick={onPrevious} className="text-2xl md:text-4xl text-zinc-400 hover:text-white transition-all active:scale-90">
                <i className="fas fa-backward-step"></i>
              </button>
              <button 
                onClick={onTogglePlay}
                className="w-20 h-20 md:w-28 md:h-28 bg-white text-black rounded-full flex items-center justify-center text-3xl md:text-5xl shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-90 transition-all"
              >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} ${isPlaying ? '' : 'ml-2'}`}></i>
              </button>
              <button onClick={onNext} className="text-2xl md:text-4xl text-zinc-400 hover:text-white transition-all active:scale-90">
                <i className="fas fa-forward-step"></i>
              </button>
            </div>

            <button 
              onClick={onToggleRepeat} 
              className={`text-xl relative transition-all active:scale-90 ${repeatMode !== 'off' ? 'text-blue-500' : 'text-zinc-600 hover:text-white'}`}
            >
              <i className="fas fa-repeat"></i>
              {repeatMode === 'one' && <span className="absolute -top-2 -right-2 text-[8px] font-black bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center">1</span>}
            </button>
          </div>

          {/* Volume & Details Bar */}
          <div className="flex flex-col md:flex-row items-center gap-10 pt-4">
             <div className="flex-1 w-full flex items-center gap-4 group">
                <i className="fas fa-volume-low text-zinc-600 group-hover:text-white transition-colors"></i>
                <input 
                  type="range" min="0" max="1" step="0.01"
                  className="flex-1 accent-white h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                  value={volume}
                  onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                />
                <i className="fas fa-volume-high text-zinc-600 group-hover:text-white transition-colors"></i>
             </div>
             
             <div className="flex items-center gap-4 bg-white/5 border border-white/5 px-6 py-3 rounded-2xl">
               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Rate</span>
               <button 
                onClick={() => onChangeSpeed(playbackRate >= 2 ? 0.5 : playbackRate + 0.25)} 
                className="text-sm font-black text-white hover:text-blue-400 transition-colors"
               >
                {playbackRate}x
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedPlayer;
