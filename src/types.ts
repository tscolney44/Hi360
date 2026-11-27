export type QualityKey = 'aac96' | 'aac256' | 'flac16' | 'flac24';
export const QUALITY_ORDER: QualityKey[] = ['aac96', 'aac256', 'flac16', 'flac24'];
export const QUALITY_LABELS: Record<QualityKey, string> = {
  aac96: 'AAC · 96 kbps',
  aac256: 'AAC · 256 kbps',
  flac16: 'FLAC · 16-bit CD',
  flac24: 'FLAC · 24-bit Hi-Res',
};
export const QUALITY_EXT: Record<QualityKey, string> = { aac96: 'm4a', aac256: 'm4a', flac16: 'flac', flac24: 'flac' };

export interface Track {
  id: string;
  title: string;
  artist: string;
  featured: string;
  album: string;
  albumArtist: string;
  cover: string;
  trackNo: number;
  discNo: number;
  year: number;
  genre: string;
  duration: number;
  qualities: Partial<Record<QualityKey, string>>;
  video: string;
  dateAdded: string;
}
export interface Artist { name: string; image: string; bio: string; trackCount: number }
export interface Album { key: string; name: string; artist: string; cover: string; year: number; tracks: Track[] }
export interface Catalogue { tracks: Track[]; artists: Artist[]; albums: Album[]; fetchedAt: number }
export interface Playlist { id: string; name: string; trackIds: string[] }
export type Repeat = 'off' | 'all' | 'one';
export interface Settings { preferredQuality: QualityKey; autoplayNext: boolean }
