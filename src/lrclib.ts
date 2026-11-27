export interface LyricLine { time: number; text: string }
export interface Lyrics { plain: string | null; synced: LyricLine[] | null; instrumental: boolean }

export function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{2}(?:[.:]\d{1,3})?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const s of stamps) out.push({ time: Number(s[1]) * 60 + Number(s[2].replace(':', '.')), text });
  }
  return out.sort((a, b) => a.time - b.time);
}

export function activeLine(lines: LyricLine[], t: number): number {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (lines[mid].time <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}

export async function getLyrics(track: string, artist: string, album?: string, duration?: number, signal?: AbortSignal): Promise<Lyrics | null> {
  const p = new URLSearchParams({ track_name: track, artist_name: artist });
  if (album) p.set('album_name', album);
  if (duration) p.set('duration', String(Math.round(duration)));
  const r = await fetch('https://lrclib.net/api/get?' + p, { signal });
  if (r.status === 404) return null;
  if (r.status === 429) throw new Error('Lyrics service is busy — try again shortly.');
  if (!r.ok) throw new Error('Lyrics unavailable');
  const d = await r.json();
  const synced = typeof d.syncedLyrics === 'string' && d.syncedLyrics ? parseLrc(d.syncedLyrics) : null;
  return { plain: d.plainLyrics ?? null, synced: synced && synced.length ? synced : null, instrumental: !!d.instrumental };
}
