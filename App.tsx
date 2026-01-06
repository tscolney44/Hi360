
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen.tsx';
import SubmitScreen from './screens/SubmitScreen.tsx';
import PlayerBar from './components/PlayerBar.tsx';
import ExpandedPlayer from './components/ExpandedPlayer.tsx';
import DonateButton from './components/DonateButton.tsx';
import { firebaseService } from './services/firebase.ts';
import { Song, PlayerState, RepeatMode } from './types.ts';
import { User } from 'firebase/auth';

const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogin: (u: string, p: string) => void }> = ({ isOpen, onClose, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="bg-[#111] border border-zinc-800 w-full max-w-md rounded-[40px] p-12 shadow-[0_40px_100px_rgba(0,0,0,1)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400"></div>
        <button onClick={onClose} className="absolute top-6 right-8 text-zinc-500 hover:text-white transition-colors">
          <i className="fas fa-times text-xl"></i>
        </button>

        <h3 className="text-4xl font-[900] mb-2 tracking-tighter">Your Identity.</h3>
        <p className="text-zinc-500 font-medium mb-10">Enter your credentials to access the studio. We'll create your profile automatically if you're new.</p>
        
        <form onSubmit={(e) => { e.preventDefault(); setLoading(true); onLogin(username, password); }} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Username</label>
            <input 
              autoFocus required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-lg font-bold outline-none focus:border-white/20 transition-all placeholder:text-zinc-700"
              placeholder="alias"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Secret Key</label>
            <input 
              type="password" required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-lg font-bold outline-none focus:border-white/20 transition-all placeholder:text-zinc-700"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-white text-black hover:bg-zinc-200 py-5 rounded-2xl font-[900] text-lg transition-all active:scale-[0.98] mt-4 shadow-xl shadow-white/5"
          >
            {loading ? 'AUTHENTICATING...' : 'ENTER STUDIO'}
          </button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 1.0,
    isShuffle: false,
    repeatMode: 'off',
    playbackRate: 1.0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthChange((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const unsubscribe = firebaseService.getApprovedSongs((data) => {
        setSongs(data);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      setError("Network unstable.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => setPlayerState(prev => ({ ...prev, progress: audio.currentTime }));
    const handleLoadedMetadata = () => setPlayerState(prev => ({ ...prev, duration: audio.duration }));
    const handleEnded = () => {
      if (playerState.repeatMode === 'one') {
        audio.currentTime = 0;
        safePlay();
      } else {
        playNext();
      }
    };
    const handleError = () => setPlayerState(prev => ({ ...prev, isPlaying: false }));
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [songs, playerState.repeatMode]);

  const safePlay = async () => {
    if (!audioRef.current) return;
    try {
      playPromiseRef.current = audioRef.current.play();
      await playPromiseRef.current;
      setPlayerState(prev => ({ ...prev, isPlaying: true }));
    } catch (error: any) {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const safePause = async () => {
    if (!audioRef.current) return;
    if (playPromiseRef.current) {
      try { await playPromiseRef.current; } catch (e) {}
    }
    audioRef.current.pause();
    setPlayerState(prev => ({ ...prev, isPlaying: false }));
  };

  const playSong = async (song: Song) => {
    if (!audioRef.current) return;
    if (playerState.currentSong?.id === song.id) {
      playerState.isPlaying ? await safePause() : await safePlay();
    } else {
      await safePause();
      audioRef.current.src = song.audio_url;
      audioRef.current.playbackRate = playerState.playbackRate;
      audioRef.current.volume = playerState.volume;
      audioRef.current.load();
      setPlayerState(prev => ({ ...prev, currentSong: song, isPlaying: false, progress: 0, duration: 0 }));
      await safePlay();
    }
  };

  const playNext = () => {
    if (!playerState.currentSong || songs.length === 0) return;
    if (playerState.isShuffle) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      playSong(songs[randomIndex]);
    } else {
      const currentIndex = songs.findIndex(s => s.id === playerState.currentSong?.id);
      if (currentIndex === songs.length - 1 && playerState.repeatMode === 'off') return;
      const nextIndex = (currentIndex + 1) % songs.length;
      playSong(songs[nextIndex]);
    }
  };

  const playPrevious = () => {
    if (!playerState.currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === playerState.currentSong?.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    playSong(songs[prevIndex]);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setPlayerState(prev => ({ ...prev, progress: time }));
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current || !playerState.currentSong) return;
    playerState.isPlaying ? await safePause() : await safePlay();
  };

  const toggleShuffle = () => setPlayerState(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
  
  const toggleRepeat = () => {
    setPlayerState(prev => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const nextIndex = (modes.indexOf(prev.repeatMode) + 1) % modes.length;
      return { ...prev, repeatMode: modes[nextIndex] };
    });
  };

  const changeSpeed = (rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    setPlayerState(prev => ({ ...prev, playbackRate: rate }));
  };

  const changeVolume = (vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol;
    setPlayerState(prev => ({ ...prev, volume: vol }));
  };

  const handleLoginSubmit = async (username: string, pass: string) => {
    try { 
      await firebaseService.loginOrSignUp(username, pass); 
      setIsLoginOpen(false);
    } catch(e: any) { 
      alert(e.message); 
    }
  };

  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen bg-black text-white selection:bg-blue-500/30">
        <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLogin={handleLoginSubmit} />
        
        <ExpandedPlayer 
          isOpen={isExpanded}
          onClose={() => setIsExpanded(false)}
          state={playerState}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onNext={playNext}
          onPrevious={playPrevious}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onChangeSpeed={changeSpeed}
          onChangeVolume={changeVolume}
        />

        <header className="fixed top-0 left-0 right-0 z-[100] h-20 glass-panel border-b border-white/5 flex items-center justify-between px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white text-black rounded-lg flex items-center justify-center font-black text-xl shadow-lg">
              3
            </div>
            <span className="text-2xl font-[900] tracking-tighter uppercase">HI360</span>
          </Link>
          
          <nav className="flex items-center gap-8">
            <Link to="/" className="text-[13px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest">Discover</Link>
            {user && (
               <Link to="/submit" className="text-[13px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest">Publish</Link>
            )}
            <div className="h-4 w-px bg-zinc-800"></div>
            {user ? (
              <div className="flex items-center gap-4 group">
                <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-800 cursor-default">
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
                    {user.displayName?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">{user.displayName}</span>
                  <button onClick={() => firebaseService.logout()} className="text-zinc-600 hover:text-red-500 transition-colors ml-2">
                    <i className="fas fa-power-off text-[10px]"></i>
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="bg-white text-black px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
              >
                Log In
              </button>
            )}
          </nav>
        </header>

        <main className="flex-1 pt-20">
          <Routes>
            <Route path="/" element={
              <HomeScreen 
                songs={songs}
                loading={loading}
                error={error}
                onPlay={playSong} 
                currentSongId={playerState.currentSong?.id} 
                isPlaying={playerState.isPlaying}
                currentUser={user}
              />
            } />
            <Route path="/submit" element={<SubmitScreen currentUser={user} onOpenLogin={() => setIsLoginOpen(true)} />} />
          </Routes>
        </main>

        <PlayerBar 
          state={playerState} 
          onTogglePlay={togglePlay} 
          onSeek={seek}
          onNext={playNext}
          onPrevious={playPrevious}
          onClick={() => setIsExpanded(true)}
        />
      </div>
    </HashRouter>
  );
};

export default App;
