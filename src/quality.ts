import { QUALITY_ORDER, type QualityKey, type Track } from './types';

/** Order of preference: wanted tier, then lower tiers (descending), then higher tiers. */
export function pickQuality(t: Track, want: QualityKey): QualityKey | null {
  const i = QUALITY_ORDER.indexOf(want);
  const order = [want, ...QUALITY_ORDER.slice(0, i).reverse(), ...QUALITY_ORDER.slice(i + 1)];
  return order.find(k => !!t.qualities[k]) ?? null;
}
