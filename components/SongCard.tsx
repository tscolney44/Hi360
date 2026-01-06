
import React, { useState } from 'react';
import { Song } from '../types.ts';
import Badge from './Badge.tsx';
import { User } from 'firebase/auth';
import { firebaseService } from '../services/firebase.ts';

interface SongCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  isActive: boolean;
  isPlaying: boolean;
  currentUser: User | null;
}

const SongCard: React.FC<SongCardProps> = ({ song, onPlay, isActive, isPlaying, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: song.title, artist: song.artist });
  const isLossless = song.format === 'FLAC' || song.format === 'ALAC';
  const isOwner = currentUser && song.submitted_by_uid === currentUser.uid;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!song.downloadable) return;
    try {
      const response = await fetch(song.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${song.artist} - ${song.title}.${song.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert("Download blocked. This usually happens if the link doesn't allow direct file access.");
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently remove this track from Hi360?")) {
      try {
        await firebaseService.deleteSong(song.id);
      } catch (e) {
        alert("Delete failed.");
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await firebaseService.updateSong(song.id, editData);
      setIsEditing(false);
    } catch (e) {
      alert("Update failed.");
    }
  };

  if (isEditing) {
    return (
      <div className="bg-[#111] border border-zinc-800 rounded-2xl p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleUpdate} className="space-y-3">
          <input 
            className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none" 
            value={editData.title}
            onChange={e => setEditData({...editData, title: e.target.value})}
            placeholder="Title"
          />
          <input 
            className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none" 
            value={editData.artist}
            onChange={e => setEditData({...editData, artist: e.target.value})}
            placeholder="Artist"
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-white text-black py-2 rounded-lg text-xs font-black">SAVE</button>
            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-zinc-800 text-white py-2 rounded-lg text-xs font-bold">CANCEL</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div 
      onClick={() => onPlay(song)}
      className="group relative flex flex-col transition-all duration-500 cursor-pointer"
    >
      <div className="relative aspect-square mb-3 overflow-hidden rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] bg-zinc-900 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-all duration-500">
        <img 
          src={song.cover_url} 
          alt={song.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          loading="lazy"
        />
        
        {/* Play Overlay */}
        <div className={`absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive ? 'opacity-100 backdrop-blur-sm' : ''}`}>
           <div className={`w-14 h-14 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20 scale-90 group-hover:scale-100 transition-transform duration-300 ${isActive ? 'scale-100 bg-white/20' : ''}`}>
            <i className={`fas ${isActive && isPlaying ? 'fa-pause' : 'fa-play'} text-xl ${isActive && isPlaying ? '' : 'ml-1'}`}></i>
          </div>
        </div>

        {/* Owner Quick Actions */}
        {isOwner && (
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="w-9 h-9 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all border border-white/10"
            >
              <i className="fas fa-pencil-alt text-xs"></i>
            </button>
            <button 
              onClick={handleDelete}
              className="w-9 h-9 bg-red-600/80 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all border border-red-500/20"
            >
              <i className="fas fa-trash text-xs"></i>
            </button>
          </div>
        )}

        {/* Bottom Metadata Badges */}
        <div className="absolute bottom-3 left-3 flex gap-1.5 pointer-events-none">
          {song.hi_res && <Badge label="MAX" type="hi-res" />}
          {isLossless && !song.hi_res && <Badge label="HI-FI" type="lossless" />}
        </div>
      </div>

      <div className="px-1 space-y-0.5">
        <h3 className={`font-bold truncate text-[15px] tracking-tight leading-tight ${isActive ? 'text-blue-400' : 'text-zinc-100'}`}>
          {song.title}
        </h3>
        <p className="text-[13px] text-zinc-500 truncate font-medium group-hover:text-zinc-400 transition-colors">
          {song.artist}
        </p>
      </div>

      {song.downloadable && (
        <button 
          onClick={handleDownload}
          className="absolute bottom-16 right-3 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/10"
          title="Download Master"
        >
          <i className="fas fa-download text-sm"></i>
        </button>
      )}
    </div>
  );
};

export default SongCard;
