
export type AudioFormat = 'FLAC' | 'ALAC' | 'AAC' | 'OGG' | 'MP3';
export type BitDepth = 16 | 24 | 32;
export type RepeatMode = 'off' | 'all' | 'one';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  track_number?: number;
  format: AudioFormat;
  bit_depth: BitDepth;
  audio_url: string;
  cover_url: string;
  hi_res: boolean;
  downloadable: boolean;
  approved: boolean;
  submitted_by_uid: string;
  submitted_by_name: string;
  created_at: any;
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  playbackRate: number;
}
