
import React from 'react';
import { PlayerState } from '../types.ts';

interface PlayerBarProps {
  state: PlayerState;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClick: () => void;
}

const PlayerBar: React.FC<PlayerBarProps> = ({ state, onTogglePlay, onSeek, onNext, onPrevious, onClick }) => {
  const { currentSong, isPlaying, progress, duration } = state;

  if (!currentSong) return null;

  return (
    <div 
      className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] md:w-auto md:min-w-[600px] lg:min-w-[800px] h-20 md:h-24 glass-panel rounded-2xl md:rounded-[32px] border border-white/10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] z-[90] px-4 md:px-8 flex items-center justify-between group adaptive-transition mb-[env(safe-area-inset-bottom)]"
    >
      {/* Visual Seek Bar - Pill Style */}
      <div className="absolute -top-[1px] left-8 right-8 h-[2px] bg-white/5 rounded-full cursor-pointer overflow-hidden" onClick={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        onSeek(percent * duration);
      }}>
        <div 
          className="h-full bg-blue-500 transition-all duration-300" 
          style={{ width: `${(progress / (duration || 1)) * 100}%` }}
        />
      </div>

      {/* Left: Track Info */}
      <div className="flex items-center gap-3 md:gap-5 min-w-0 flex-1 md:flex-initial cursor-pointer" onClick={onClick}>
        <div className="relative shrink-0">
          <img 
            src={currentSong.cover_url} 
            className={`w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover shadow-xl transition-all duration-700 ${isPlaying ? 'scale-100' : 'scale-90 opacity-80'}`}
          />
        </div>
        <div className="overflow-hidden pr-4">
          <h4 className="font-black text-white text-[13px] md:text-[15px] truncate tracking-tight">{currentSong.title}</h4>
          <p className="text-zinc-500 text-[11px] md:text-[13px] truncate font-bold uppercase tracking-wider">{currentSong.artist}</p>
        </div>
      </div>

      {/* Center: Play Controls */}
      <div className="flex items-center gap-4 md:gap-8 mx-auto">
        <button onClick={(e) => { e.stopPropagation(); onPrevious(); }} className="hidden sm:block text-zinc-500 hover:text-white transition-colors">
          <i className="fas fa-backward-step text-xl"></i>
        </button>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-2xl"
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-lg ${isPlaying ? '' : 'ml-1'}`}></i>
        </button>

        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-zinc-500 hover:text-white transition-colors">
          <i className="fas fa-forward-step text-xl"></i>
        </button>
      </div>

      {/* Right: Quality Badge (Desktop) */}
      <div className="hidden md:flex items-center justify-end gap-6 flex-1 lg:flex-initial cursor-pointer" onClick={onClick}>
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
             {currentSong.hi_res ? (
               <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm">MASTER</span>
             ) : (
               <span className="border border-cyan-400 text-cyan-400 text-[9px] font-black px-1.5 py-0.5 rounded-sm">HI-FI</span>
             )}
          </div>
          <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1 tracking-widest">{currentSong.bit_depth}-BIT AUDIO</p>
        </div>
        <i className="fas fa-up-right-and-down-left-from-center text-zinc-700 hover:text-white transition-colors"></i>
      </div>
      
      {/* Right: Mobile expand hint */}
      <div className="md:hidden text-zinc-700 px-2" onClick={onClick}>
         <i className="fas fa-chevron-up"></i>
      </div>
    </div>
  );
};

export default PlayerBar;
