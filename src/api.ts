import type { Album, Artist, Catalogue, QualityKey, Track } from './types';

const COLS = ['ID', 'Title', 'Artist', 'Featured Artists', 'Album', 'Album Artist', 'Cover Art URL', 'Track No', 'Disc No', 'Year', 'Genre', 'Duration (sec)', 'AAC 96 kbps URL', 'AAC 256 kbps URL', 'FLAC 16-bit (CD) URL', 'FLAC 24-bit URL', 'Video URL', 'Date Added'] as const;
const CACHE_KEY = 'hi360.catalogue.v1';

const httpsOnly = (u?: string): string => {
  try { const p = new URL((u || '').trim()); return p.protocol === 'https:' ? p.toString() : ''; } catch { return ''; }
};
const num = (v: unknown) => { const n = Number(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };

/** Accepts either an 18-column array (documented contract) or an object keyed by header names. */
function toRecord(row: unknown): Record<string, string> | null {
  if (Array.isArray(row)) return Object.fromEntries(COLS.map((h, i) => [h, String(row[i] ?? '').trim()]));
  if (row && typeof row === 'object') return Object.fromEntries(Object.entries(row as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '').trim()]));
  return null;
}
function hashId(s: string) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'g' + (h >>> 0).toString(36); }

export function parseTrack(row: unknown): Track | null {
  const v = toRecord(row);
  if (!v || !v['Title']) return null;
  const qualities: Partial<Record<QualityKey, string>> = {};
  const map: [QualityKey, string][] = [['aac96', 'AAC 96 kbps URL'], ['aac256', 'AAC 256 kbps URL'], ['flac16', 'FLAC 16-bit (CD) URL'], ['flac24', 'FLAC 24-bit URL']];
  for (const [k, col] of map) { const u = httpsOnly(v[col]); if (u) qualities[k] = u; }
  if (!Object.keys(qualities).length) return null; // nothing playable
  const artist = v['Artist'] || 'Unknown artist';
  return {
    id: v['ID'] || hashId(`${v['Title']}|${artist}|${v['Album']}`),
    title: v['Title'], artist, featured: v['Featured Artists'] || '', album: v['Album'] || '',
    albumArtist: v['Album Artist'] || artist, cover: httpsOnly(v['Cover Art URL']),
    trackNo: num(v['Track No']), discNo: num(v['Disc No']) || 1, year: num(v['Year']), genre: v['Genre'] || '',
    duration: num(v['Duration (sec)']), qualities, video: httpsOnly(v['Video URL']), dateAdded: v['Date Added'] || '',
  };
}

export function buildCatalogue(tracksRaw: unknown[], artistsRaw: unknown[], fetchedAt = Date.now()): Catalogue {
  const seen = new Set<string>();
  const tracks = tracksRaw.map(parseTrack).filter((t): t is Track => !!t && !seen.has(t.id) && !!seen.add(t.id));
  const groups = new Map<string, Track[]>();
  for (const t of tracks) {
    if (!t.album) continue;
    const key = `${t.albumArtist.toLowerCase()}::${t.album.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) || []), t]);
  }
  const albums: Album[] = [...groups.entries()].map(([key, ts]) => {
    ts.sort((a, b) => a.discNo - b.discNo || a.trackNo - b.trackNo || a.title.localeCompare(b.title));
    return { key, name: ts[0].album, artist: ts[0].albumArtist, cover: ts.find(t => t.cover)?.cover || '', year: Math.min(...ts.map(t => t.year || 9999)) % 9999, tracks: ts };
  });
  const names = new Map<string, Artist>();
  for (const r of artistsRaw) {
    const a = Array.isArray(r) ? r : [];
    if (a[0]) names.set(String(a[0]).toLowerCase(), { name: String(a[0]), image: httpsOnly(String(a[1] ?? '')), bio: String(a[2] ?? ''), trackCount: 0 });
  }
  for (const t of tracks) if (!names.has(t.artist.toLowerCase())) names.set(t.artist.toLowerCase(), { name: t.artist, image: '', bio: '', trackCount: 0 });
  const artists = [...names.values()].map(a => ({ ...a, trackCount: tracks.filter(t => t.artist.toLowerCase() === a.name.toLowerCase()).length })).filter(a => a.trackCount > 0).sort((a, b) => a.name.localeCompare(b.name));
  return { tracks, artists, albums, fetchedAt };
}

async function fetchJson(url: string, tries = 3): Promise<any> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
      if (!r.ok) throw new Error(`Catalogue unavailable (${r.status})`);
      const d = await r.json();
      if (!d || d.ok !== true) throw new Error(typeof d?.error === 'string' ? d.error : 'Catalogue returned an error');
      return d;
    } catch (e) { last = e; if (i < tries - 1) await new Promise(res => setTimeout(res, 500 * 2 ** i)); } finally { clearTimeout(timer); }
  }
  throw last instanceof Error ? last : new Error('Catalogue unavailable');
}

export async function loadCatalogue(): Promise<{ catalogue: Catalogue; stale: boolean }> {
  try {
    const d = await fetchJson('/api/catalogue');
    const catalogue = buildCatalogue(Array.isArray(d.tracks) ? d.tracks : [], Array.isArray(d.artists) ? d.artists : []);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ tracks: d.tracks, artists: d.artists, fetchedAt: catalogue.fetchedAt })); } catch { /* quota */ }
    return { catalogue, stale: false };
  } catch (e) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c?.tracks) return { catalogue: buildCatalogue(c.tracks, c.artists || [], c.fetchedAt), stale: true };
    } catch { /* ignore */ }
    throw e;
  }
}
