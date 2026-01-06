
import React, { useState } from 'react';
import { firebaseService } from '../services/firebase.ts';
import { SUPPORTED_FORMATS, SUPPORTED_BIT_DEPTHS } from '../constants.ts';
import { AudioFormat, BitDepth, Song } from '../types.ts';
import { User } from 'firebase/auth';

interface TrackEntry {
  title: string;
  track_number: string;
  audio_url: string;
}

interface SubmitScreenProps {
  currentUser: User | null;
  onOpenLogin: () => void;
}

const SubmitScreen: React.FC<SubmitScreenProps> = ({ currentUser, onOpenLogin }) => {
  const [sharedData, setSharedData] = useState({
    artist: '',
    album: '',
    cover_url: '',
    format: 'MP3' as AudioFormat,
    bit_depth: 16 as BitDepth,
    hi_res: false,
    downloadable: true,
  });

  const [tracks, setTracks] = useState<TrackEntry[]>([
    { title: '', track_number: '1', audio_url: '' }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-20 text-center">
        <i className="fas fa-user-lock text-6xl text-slate-700 mb-6"></i>
        <h2 className="text-3xl font-black mb-4">Login Required</h2>
        <p className="text-slate-400 mb-8 max-w-sm">Please log in to start publishing your music collection. Your account is tied to your username.</p>
        <button 
          onClick={onOpenLogin}
          className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95"
        >
          Open Login
        </button>
      </div>
    );
  }

  const addTrack = () => {
    setTracks([...tracks, { 
      title: '', 
      track_number: (tracks.length + 1).toString(), 
      audio_url: '',
    }]);
  };

  const updateTrack = (index: number, field: keyof TrackEntry, value: any) => {
    const newTracks = [...tracks];
    newTracks[index] = { ...newTracks[index], [field]: value };
    setTracks(newTracks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const validSongs: Omit<Song, 'id' | 'approved' | 'created_at'>[] = tracks.map(t => ({
      title: t.title,
      artist: sharedData.artist,
      album: sharedData.album || undefined,
      track_number: parseInt(t.track_number),
      format: sharedData.format,
      bit_depth: sharedData.bit_depth,
      audio_url: t.audio_url,
      cover_url: sharedData.cover_url,
      hi_res: sharedData.hi_res,
      downloadable: sharedData.downloadable,
      submitted_by_uid: currentUser.uid,
      submitted_by_name: currentUser.displayName || 'User',
    }));

    try {
      await firebaseService.submitSongs(validSongs);
      setMessage({ type: 'success', text: `Published ${validSongs.length} track(s)!` });
      setTracks([{ title: '', track_number: '1', audio_url: '' }]);
    } catch (err) {
      setMessage({ type: 'error', text: 'Submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-50 mb-2">Publish Music</h2>
        <p className="text-slate-400">Owner: <span className="text-blue-400 font-bold">{currentUser.displayName}</span></p>
      </div>

      {message && (
        <div className={`mb-8 p-4 rounded-xl flex gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
          <i className="fas fa-info-circle mt-1"></i>
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-slate-800/30 border border-slate-700 p-8 rounded-3xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Artist Name</label>
              <input 
                type="text" required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Tycho"
                value={sharedData.artist}
                onChange={e => setSharedData({...sharedData, artist: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Album Title</label>
              <input 
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Awake"
                value={sharedData.album}
                onChange={e => setSharedData({...sharedData, album: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cover URL</label>
            <input 
              type="url" required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="https://example.com/artwork.jpg"
              value={sharedData.cover_url}
              onChange={e => setSharedData({...sharedData, cover_url: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
             <select 
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none cursor-pointer"
                value={sharedData.format}
                onChange={e => setSharedData({...sharedData, format: e.target.value as AudioFormat})}
              >
                {SUPPORTED_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select 
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none cursor-pointer"
                value={sharedData.bit_depth}
                onChange={e => setSharedData({...sharedData, bit_depth: parseInt(e.target.value) as BitDepth})}
              >
                {SUPPORTED_BIT_DEPTHS.map(d => <option key={d} value={d}>{d}-bit</option>)}
              </select>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 rounded" checked={sharedData.hi_res} onChange={e => setSharedData({...sharedData, hi_res: e.target.checked})} />
              <span className="text-xs font-bold text-amber-500">Label Hi-Res</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 rounded" checked={sharedData.downloadable} onChange={e => setSharedData({...sharedData, downloadable: e.target.checked})} />
              <span className="text-xs font-bold text-emerald-500">Allow Downloads</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-2">Tracks</h4>
          {tracks.map((track, i) => (
            <div key={i} className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl flex flex-col md:flex-row gap-4 relative">
              <input 
                className="w-full md:w-12 bg-slate-900 border border-slate-700 rounded-lg text-center py-2 md:py-0"
                value={track.track_number}
                onChange={e => updateTrack(i, 'track_number', e.target.value)}
              />
              <input 
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2"
                placeholder="Track Title"
                value={track.title}
                onChange={e => updateTrack(i, 'title', e.target.value)}
              />
              <input 
                className="flex-[2] bg-slate-900 border border-slate-700 rounded-lg px-4 py-2"
                placeholder="Direct Audio URL (Dropbox/S3/CDN)"
                value={track.audio_url}
                onChange={e => updateTrack(i, 'audio_url', e.target.value)}
              />
            </div>
          ))}
          <button type="button" onClick={addTrack} className="text-blue-500 font-bold text-xs px-2 hover:underline">
            + ADD ANOTHER TRACK
          </button>
        </div>

        <button 
          type="submit" disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-[0.98]"
        >
          {submitting ? 'Publishing...' : `Publish ${tracks.length} Track(s) Now`}
        </button>
      </form>
    </div>
  );
};

export default SubmitScreen;
