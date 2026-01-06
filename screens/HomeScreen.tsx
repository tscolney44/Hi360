
import React, { useState, useMemo } from 'react';
import { Song } from '../types.ts';
import SongCard from '../components/SongCard.tsx';
import DonateButton from '../components/DonateButton.tsx';
import { User } from 'firebase/auth';

interface HomeScreenProps {
  songs: Song[];
  loading: boolean;
  error: string | null;
  onPlay: (song: Song) => void;
  currentSongId?: string;
  isPlaying: boolean;
  currentUser: User | null;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ songs, loading, error, onPlay, currentSongId, isPlaying, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const lowerQuery = searchQuery.toLowerCase();
    return songs.filter(song => 
      song.title.toLowerCase().includes(lowerQuery) || 
      song.artist.toLowerCase().includes(lowerQuery)
    );
  }, [songs, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
        <div className="w-12 h-12 border-[3px] border-white/5 border-t-white rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Synchronizing Audio Stream</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto px-4 md:px-12 py-8 md:py-16">
      {/* Hero Section */}
      <section className="mb-12 md:mb-20">
        <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-[900] tracking-tighter mb-6 text-gradient leading-[0.9]">
          {currentUser ? `Hi, ${currentUser.displayName?.split(' ')[0]}` : 'Discover'}
        </h1>
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <p className="text-zinc-400 text-sm md:text-xl max-w-2xl font-medium leading-relaxed">
            Experience the studio master. Hi360 delivers bit-perfect, uncompressed audio directly to your ears. 
            <span className="hidden md:inline"> No processing. No compromises.</span>
          </p>
          
          <div className="relative group w-full lg:w-96">
            <input 
              type="text"
              placeholder="Search artist or title..."
              className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl py-4 pl-12 pr-4 text-[15px] font-medium focus:bg-zinc-800 focus:border-white/20 outline-none transition-all placeholder:text-zinc-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors"></i>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section>
        <div className="flex items-center justify-between mb-8 md:mb-12">
          <h2 className="text-lg md:text-2xl font-black tracking-tight uppercase">Latest Masters</h2>
          <div className="h-px flex-1 mx-4 md:mx-8 bg-zinc-900/50"></div>
          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">{filteredSongs.length} Tracks</span>
        </div>

        {songs.length === 0 ? (
          <div className="bg-zinc-900/20 rounded-[40px] p-16 md:p-32 text-center border border-zinc-900/50 border-dashed">
             <i className="fas fa-compact-disc text-4xl text-zinc-800 mb-6"></i>
             <h3 className="text-xl md:text-3xl font-black mb-2">The studio is quiet.</h3>
             <p className="text-zinc-600 text-sm md:text-lg">Be the first to publish a master-quality track.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-x-4 md:gap-x-10 gap-y-10 md:gap-y-16">
            {filteredSongs.map(song => (
              <SongCard 
                key={song.id} 
                song={song} 
                onPlay={onPlay} 
                isActive={currentSongId === song.id}
                isPlaying={isPlaying}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </section>

      {/* Donation Banner */}
      <section className="mt-24 md:mt-40 p-8 md:p-24 bg-gradient-to-tr from-blue-600/10 via-transparent to-transparent rounded-[40px] md:rounded-[60px] border border-white/5 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="max-w-2xl">
          <h3 className="text-3xl md:text-6xl font-black mb-6 tracking-tight">Preserve Original Sound.</h3>
          <p className="text-zinc-400 text-sm md:text-xl font-medium leading-relaxed">
            Hi360 is an independent project. Support the infrastructure.
          </p>
        </div>
        <div className="shrink-0">
          <DonateButton />
        </div>
      </section>

      <footer className="mt-32 pb-48 border-t border-zinc-900/50 pt-12 flex flex-col md:flex-row justify-between items-center gap-8 text-[11px] font-black text-zinc-600 tracking-[0.2em] uppercase">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
            <i className="fas fa-fingerprint text-[10px] text-white/40"></i>
          </div>
          <span>Hi360 Studio &copy; 2025</span>
        </div>
        <div className="flex gap-8">
          <a href="/export.html" className="text-blue-500 hover:text-white transition-colors">Export for GitHub</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="https://www.paypal.me/tscolney" target="_blank" className="hover:text-blue-500 transition-colors">Developer</a>
        </div>
      </footer>
    </div>
  );
};

export default HomeScreen;
