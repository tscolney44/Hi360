import { useSyncExternalStore } from 'react';
import { QUALITY_LABELS, QUALITY_ORDER, type QualityKey, type Repeat, type Track } from './types';
import { pickQuality } from './quality';

export interface PlayerState {
  queue: Track[]; index: number; playing: boolean; buffering: boolean;
  position: number; duration: number; quality: QualityKey | null;
  shuffle: boolean; repeat: Repeat; error: string; notice: string;
  switching: boolean; lastSwitchMs: number | null; volume: number;
}
const SAVE_KEY = 'hi360.player.v1';

function shuffled<T>(a: T[]): T[] { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

class PlayerEngine {
  private el = new Audio();
  private ctl = new AbortController();
  private order: Track[] = [];
  private listeners = new Set<() => void>();
  private tried = new Set<QualityKey>();
  private preferred: QualityKey = 'aac256';
  private autoplayNext = true;
  private lastSave = 0;
  private preloadEl: HTMLAudioElement | null = null;
  private preloadedId = '';
  private switchToken = 0;
  state: PlayerState = { queue: [], index: -1, playing: false, buffering: false, position: 0, duration: 0, quality: null, shuffle: false, repeat: 'off', error: '', notice: '', switching: false, lastSwitchMs: null, volume: 0.8 };

  constructor() {
    this.el.preload = 'auto';
    this.bind(this.el);
    window.addEventListener('offline', () => this.set({ notice: 'You are offline. Playback will resume when the connection returns.' }));
    window.addEventListener('online', () => { this.set({ notice: '' }); if (this.state.error && this.current) this.load(this.current, this.state.position, true, this.state.quality ?? this.preferred); });
    window.addEventListener('pagehide', () => this.save(true));
    this.setupMediaSession();
  }

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getSnapshot = () => this.state;
  private set(p: Partial<PlayerState>) { this.state = { ...this.state, ...p }; this.listeners.forEach(l => l()); }
  get current(): Track | null { return this.state.queue[this.state.index] ?? null; }

  setPreferences(q: QualityKey, autoplay: boolean) { this.preferred = q; this.autoplayNext = autoplay; }

  // ---- element wiring -------------------------------------------------
  private bind(el: HTMLAudioElement) {
    this.ctl.abort(); this.ctl = new AbortController();
    const o = { signal: this.ctl.signal };
    el.addEventListener('play', () => { this.set({ playing: true }); this.updateSession(); }, o);
    el.addEventListener('pause', () => { if (!el.ended) this.set({ playing: false }); this.save(true); }, o);
    el.addEventListener('playing', () => this.set({ buffering: false, error: '' }), o);
    el.addEventListener('waiting', () => this.set({ buffering: true }), o);
    el.addEventListener('canplay', () => this.set({ buffering: false }), o);
    el.addEventListener('durationchange', () => { if (isFinite(el.duration)) this.set({ duration: el.duration }); }, o);
    el.addEventListener('timeupdate', () => {
      this.set({ position: el.currentTime });
      const d = el.duration;
      if (isFinite(d) && d - el.currentTime < 20) this.preloadNext();
      if (Date.now() - this.lastSave > 5000) this.save();
      this.updatePosition();
    }, o);
    el.addEventListener('ended', () => this.onEnded(), o);
    el.addEventListener('error', () => this.onError(), o);
  }

  private onEnded() {
    if (this.state.repeat === 'one') { this.el.currentTime = 0; void this.el.play(); return; }
    if (!this.autoplayNext) { this.set({ playing: false }); return; }
    this.next(true);
  }

  private onError() {
    const t = this.current; if (!t) return;
    const failed = this.state.quality; if (failed) this.tried.add(failed);
    const alt = QUALITY_ORDER.filter(k => t.qualities[k] && !this.tried.has(k));
    if (!alt.length) { this.set({ error: navigator.onLine ? 'This track could not be played (link expired or format unsupported).' : 'You are offline.', buffering: false, playing: false }); return; }
    // fall back to the closest remaining tier, keeping position
    const want = failed ?? this.preferred;
    const next = alt.sort((a, b) => Math.abs(QUALITY_ORDER.indexOf(a) - QUALITY_ORDER.indexOf(want)) - Math.abs(QUALITY_ORDER.indexOf(b) - QUALITY_ORDER.indexOf(want)))[0];
    this.set({ notice: `${failed ? QUALITY_LABELS[failed] : 'Source'} failed — continuing on ${QUALITY_LABELS[next]}.` });
    this.loadSource(t, next, this.state.position, this.state.playing || true);
  }

  // ---- queue ----------------------------------------------------------
  playList(tracks: Track[], start = 0) {
    if (!tracks.length) return;
    this.order = [...tracks];
    const first = tracks[start];
    const queue = this.state.shuffle ? [first, ...shuffled(tracks.filter(t => t !== first))] : [...tracks];
    this.set({ queue, index: this.state.shuffle ? 0 : start });
    this.load(first, 0, true);
  }
  playNext(t: Track) { const q = [...this.state.queue]; q.splice(this.state.index + 1, 0, t); this.order.push(t); this.set({ queue: q, notice: `“${t.title}” will play next.` }); if (this.state.index < 0) this.playList([t], 0); }
  addToQueue(t: Track) { this.order.push(t); this.set({ queue: [...this.state.queue, t], notice: `Added “${t.title}” to the queue.` }); if (this.state.index < 0) this.playList([t], 0); }
  removeAt(i: number) {
    if (i === this.state.index) return;
    const q = this.state.queue.filter((_, k) => k !== i);
    this.set({ queue: q, index: i < this.state.index ? this.state.index - 1 : this.state.index });
  }
  jump(i: number) { const t = this.state.queue[i]; if (!t) return; this.set({ index: i }); this.load(t, 0, true); }
  clearUpcoming() { this.set({ queue: this.state.queue.slice(0, this.state.index + 1) }); }

  toggleShuffle() {
    const on = !this.state.shuffle; const cur = this.current;
    if (!cur) { this.set({ shuffle: on }); return; }
    if (on) { const rest = shuffled(this.state.queue.filter((_, i) => i !== this.state.index)); this.set({ shuffle: true, queue: [cur, ...rest], index: 0 }); }
    else { const base = this.order.length ? this.order : this.state.queue; const idx = base.findIndex(t => t.id === cur.id); this.set({ shuffle: false, queue: [...base], index: Math.max(0, idx) }); }
  }
  cycleRepeat() { this.set({ repeat: this.state.repeat === 'off' ? 'all' : this.state.repeat === 'all' ? 'one' : 'off' }); }

  next(auto = false) {
    const { queue, index, repeat } = this.state;
    if (!queue.length) return;
    let i = index + 1;
    if (i >= queue.length) { if (repeat === 'all' || !auto) i = 0; else { this.set({ playing: false }); return; } }
    this.jump(i);
  }
  prev() {
    const { queue, index } = this.state;
    if (this.el.currentTime > 3 || index <= 0) { this.seek(0); return; }
    if (queue.length) this.jump(index - 1);
  }

  // ---- transport ------------------------------------------------------
  toggle() {
    if (!this.current) return;
    if (this.el.paused) { if (this.state.error) this.load(this.current, this.state.position, true, this.state.quality ?? this.preferred); else void this.el.play().catch(() => this.set({ error: 'Playback was blocked by the browser. Tap play again.' })); }
    else this.el.pause();
  }
  seek(t: number) { if (isFinite(t)) { this.el.currentTime = Math.max(0, t); this.set({ position: this.el.currentTime }); } }
  setVolume(v: number) { this.el.volume = v; this.set({ volume: v }); }
  dismissNotice() { this.set({ notice: '' }); }

  // ---- loading --------------------------------------------------------
  private load(t: Track, startAt: number, autoplay: boolean, want?: QualityKey) {
    this.tried.clear(); this.switchToken++;
    const q = pickQuality(t, want ?? this.preferred);
    if (!q) { this.set({ error: 'No playable source for this track.' }); return; }
    this.set({ error: '', switching: false, position: startAt, duration: t.duration });
    this.loadSource(t, q, startAt, autoplay);
    this.updateSession();
  }
  private loadSource(t: Track, q: QualityKey, startAt: number, autoplay: boolean) {
    const el = this.el; const url = t.qualities[q]!;
    el.src = url;
    if (startAt > 0) el.addEventListener('loadedmetadata', () => { el.currentTime = startAt; }, { once: true });
    this.set({ quality: q, buffering: true });
    if (autoplay) void el.play().catch(e => { if ((e as DOMException)?.name === 'NotAllowedError') this.set({ playing: false, buffering: false, error: 'Playback was blocked by the browser. Tap play.' }); });
  }

  /**
   * Position-preserving quality switch: the new source is buffered and seeked on a second element while the old one keeps
   * playing. Only when the new one can play at the same position does it take over; on failure/timeout we roll back.
   * This minimises — but cannot guarantee zero — audible gap; `lastSwitchMs` records the measured hand-over time.
   */
  switchQuality(q: QualityKey) {
    const t = this.current; if (!t || !t.qualities[q] || q === this.state.quality) return;
    this.preferred = q;
    const old = this.el; const token = ++this.switchToken; const began = performance.now();
    const wasPlaying = !old.paused;
    const n = new Audio(); n.preload = 'auto'; n.volume = old.volume;
    this.set({ switching: true, notice: '' });
    let done = false;
    const fail = (msg: string) => { if (done) return; done = true; clearTimeout(timer); n.removeAttribute('src'); n.load(); if (token === this.switchToken) this.set({ switching: false, notice: msg }); };
    const timer = setTimeout(() => fail(`Could not switch to ${QUALITY_LABELS[q]} in time — staying on ${QUALITY_LABELS[this.state.quality!]}.`), 15000);
    n.addEventListener('error', () => fail(`${QUALITY_LABELS[q]} could not be loaded — staying on ${QUALITY_LABELS[this.state.quality!]}.`), { once: true });
    n.addEventListener('loadedmetadata', () => { n.currentTime = old.currentTime + 0.25; }, { once: true });
    n.addEventListener('seeked', () => {
      if (done || token !== this.switchToken) return;
      // compensate for time spent buffering: land on the old element's live position
      n.currentTime = old.currentTime + 0.05;
      const start = wasPlaying ? n.play() : Promise.resolve();
      start.then(() => {
        if (done || token !== this.switchToken) { n.pause(); return; }
        done = true; clearTimeout(timer);
        this.ctl.abort(); old.pause(); old.removeAttribute('src'); old.load();
        this.el = n; this.bind(n); this.tried.clear();
        this.set({ quality: q, switching: false, lastSwitchMs: Math.round(performance.now() - began), position: n.currentTime, duration: isFinite(n.duration) ? n.duration : t.duration, playing: wasPlaying });
      }).catch(() => fail(`Could not start ${QUALITY_LABELS[q]} — staying on ${QUALITY_LABELS[this.state.quality!]}.`));
    }, { once: true });
    n.src = t.qualities[q]!;
  }

  private preloadNext() {
    const { queue, index } = this.state; const nt = queue[index + 1];
    if (!nt || this.preloadedId === nt.id || !this.autoplayNext || this.state.repeat === 'one') return;
    const c = (navigator as any).connection;
    if (c?.saveData || /^(slow-2g|2g|3g)$/.test(c?.effectiveType || '')) return; // don't burn mobile data
    const q = pickQuality(nt, this.preferred); if (!q) return;
    this.preloadedId = nt.id;
    this.preloadEl = new Audio(); this.preloadEl.preload = 'metadata'; this.preloadEl.src = nt.qualities[q]!;
  }

  // ---- persistence ----------------------------------------------------
  private save(force = false) {
    if (!force && Date.now() - this.lastSave < 5000) return; this.lastSave = Date.now();
    try {
      const s = this.state;
      localStorage.setItem(SAVE_KEY, JSON.stringify({ order: this.order.map(t => t.id), queue: s.queue.map(t => t.id), index: s.index, position: this.el.currentTime || s.position, shuffle: s.shuffle, repeat: s.repeat, volume: s.volume, quality: s.quality }));
    } catch { /* ignore */ }
  }
  restore(all: Track[]) {
    if (this.state.queue.length) return;
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (!s) return;
      const by = new Map(all.map(t => [t.id, t])); const pick = (ids: string[]) => (ids || []).map(i => by.get(i)).filter((t): t is Track => !!t);
      const queue = pick(s.queue); if (!queue.length) return;
      this.order = pick(s.order);
      const index = Math.min(Math.max(0, s.index | 0), queue.length - 1);
      this.el.volume = typeof s.volume === 'number' ? s.volume : 0.8;
      this.set({ queue, index, shuffle: !!s.shuffle, repeat: s.repeat === 'all' || s.repeat === 'one' ? s.repeat : 'off', volume: this.el.volume });
      const t = queue[index]; const q = pickQuality(t, (s.quality as QualityKey) || this.preferred);
      if (q) { this.set({ position: s.position || 0, duration: t.duration }); this.loadSource(t, q, s.position || 0, false); this.updateSession(); }
    } catch { /* corrupt state: ignore */ }
  }

  // ---- Media Session --------------------------------------------------
  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const h = (a: MediaSessionAction, f: MediaSessionActionHandler) => { try { ms.setActionHandler(a, f); } catch { /* unsupported */ } };
    h('play', () => { if (this.el.paused) this.toggle(); }); h('pause', () => this.el.pause());
    h('previoustrack', () => this.prev()); h('nexttrack', () => this.next());
    h('seekto', d => { if (d.seekTime != null) this.seek(d.seekTime); });
    h('seekbackward', d => this.seek(this.el.currentTime - (d.seekOffset || 10)));
    h('seekforward', d => this.seek(this.el.currentTime + (d.seekOffset || 10)));
  }
  private updateSession() {
    if (!('mediaSession' in navigator)) return; const t = this.current; if (!t) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.featured ? `${t.artist} feat. ${t.featured}` : t.artist, album: t.album, artwork: t.cover ? [{ src: t.cover, sizes: '512x512' }] : [] });
    navigator.mediaSession.playbackState = this.el.paused ? 'paused' : 'playing';
  }
  private updatePosition() {
    if (!('mediaSession' in navigator) || !isFinite(this.el.duration)) return;
    try { navigator.mediaSession.setPositionState({ duration: this.el.duration, position: Math.min(this.el.currentTime, this.el.duration), playbackRate: this.el.playbackRate }); } catch { /* ignore */ }
  }
}

export const player = new PlayerEngine();
export const usePlayer = () => useSyncExternalStore(player.subscribe, player.getSnapshot);
