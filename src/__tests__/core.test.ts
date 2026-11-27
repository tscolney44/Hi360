import { describe, expect, it } from 'vitest';
import { activeLine, parseLrc } from '../lrclib';
import { buildCatalogue, parseTrack } from '../api';
import { pickQuality } from '../quality';

const row = (o: Record<string, string>) => ['ID', 'Title', 'Artist', 'Featured Artists', 'Album', 'Album Artist', 'Cover Art URL', 'Track No', 'Disc No', 'Year', 'Genre', 'Duration (sec)', 'AAC 96 kbps URL', 'AAC 256 kbps URL', 'FLAC 16-bit (CD) URL', 'FLAC 24-bit URL', 'Video URL', 'Date Added'].map(h => o[h] ?? '');

describe('lrc', () => {
  it('parses multi-stamp lines and finds the active line', () => {
    const l = parseLrc('[00:01.50]a\n[00:03.00][00:05.00]b\nnoise');
    expect(l.map(x => x.time)).toEqual([1.5, 3, 5]);
    expect(activeLine(l, 0)).toBe(-1); expect(activeLine(l, 4)).toBe(1); expect(activeLine(l, 99)).toBe(2);
  });
});
describe('catalogue', () => {
  it('rejects rows with no https audio and drops http urls', () => {
    expect(parseTrack(row({ Title: 'x', 'AAC 96 kbps URL': 'http://a/b.m4a' }))).toBeNull();
    expect(parseTrack(row({ ID: '1', Title: 'x', 'AAC 96 kbps URL': 'https://a/b.m4a' }))?.qualities.aac96).toBeTruthy();
  });
  it('groups albums and orders by track number', () => {
    const c = buildCatalogue([
      row({ ID: '2', Title: 'B', Artist: 'A', Album: 'Al', 'Track No': '2', 'AAC 256 kbps URL': 'https://x/2' }),
      row({ ID: '1', Title: 'A', Artist: 'A', Album: 'Al', 'Track No': '1', 'AAC 256 kbps URL': 'https://x/1' })], []);
    expect(c.albums).toHaveLength(1); expect(c.albums[0].tracks.map(t => t.id)).toEqual(['1', '2']);
  });
});
describe('quality fallback', () => {
  it('prefers wanted, then lower, then higher', () => {
    const t: any = { qualities: { aac96: 'u', flac24: 'u' } };
    expect(pickQuality(t, 'flac16')).toBe('aac96'); expect(pickQuality(t, 'aac256')).toBe('aac96');
  });
});
