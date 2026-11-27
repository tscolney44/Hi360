import { QUALITY_EXT, QUALITY_LABELS, type QualityKey, type Track } from './types';

const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '_').trim();

/** Saves the chosen source to the user's device. Falls back to opening the URL when the host blocks cross-origin reads. */
export async function downloadTrack(t: Track, q: QualityKey): Promise<string> {
  const url = t.qualities[q]; if (!url) return 'That quality is not available for this track.';
  const name = `${safe(t.artist)} - ${safe(t.title)} (${QUALITY_LABELS[q].replace(/[·]/g, '-')}).${QUALITY_EXT[q]}`;
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error(String(r.status));
    const blob = await r.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    return `Saved “${t.title}” (${QUALITY_LABELS[q]}) to your device.`;
  } catch {
    window.open(url, '_blank', 'noopener');
    return 'The file host does not allow in-page downloads, so the file was opened in a new tab — use “Save as”.';
  }
}
