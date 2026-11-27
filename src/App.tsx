import { useEffect, useMemo, useRef, useState } from 'react';
import { Home, Compass, Library, Search, Download, Play, Pause, SkipBack, SkipForward, Heart, RefreshCw, Disc3, Music2, MonitorPlay, Volume2, Shuffle, Repeat, Repeat1, ListMusic, Mic2, Settings as Cog, Plus, X, ChevronLeft } from 'lucide-react';
import { loadCatalogue } from './api';
import { player, usePlayer } from './player';
import { activeLine, getLyrics, type Lyrics } from './lrclib';
import { downloadTrack } from './download';
import { usePersisted } from './storage';
import { QUALITY_LABELS, QUALITY_ORDER, type Album, type Artist, type Catalogue, type Playlist, type QualityKey, type Settings, type Track } from './types';

const time = (n: number) => { n = Math.max(0, Math.floor(n || 0)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
const avail = (t: Track) => QUALITY_ORDER.filter(k => t.qualities[k]);
type View = { name: 'Home' | 'Explore' | 'Search' | 'Library' | 'Downloads' | 'Queue' | 'Settings' } | { name: 'album'; key: string } | { name: 'artist'; artist: string } | { name: 'playlist'; id: string };
type SortKey = 'recent' | 'title' | 'artist' | 'album' | 'year' | 'trackNo';

export default function App() {
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>({ name: 'Home' });
  const [history, setHistory] = useState<View[]>([]);
  const [query, setQuery] = useState('');
  const [favs, setFavs] = usePersisted<string[]>('hi360.favs', []);
  const [playlists, setPlaylists] = usePersisted<Playlist[]>('hi360.playlists', []);
  const [settings, setSettings] = usePersisted<Settings>('hi360.settings', { preferredQuality: 'aac256', autoplayNext: true });
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [videoTrack, setVideoTrack] = useState<Track | null>(null);
  const [toast, setToast] = useState('');
  const [expanded, setExpanded] = useState(false);
  const p = usePlayer();
  const current = p.queue[p.index] ?? null;

  const inflight = useRef(false);
  /** silent = background live-sync: no spinner, and a failure keeps the current list instead of showing an error. */
  async function refresh(silent = false) {
    if (inflight.current) return; inflight.current = true;
    if (!silent) { setBusy(true); setError(''); }
    try {
      const r = await loadCatalogue();
      setCat(prev => { if (prev && r.catalogue.tracks.length > prev.tracks.length && silent) { setToast(`${r.catalogue.tracks.length - prev.tracks.length} new track(s) added`); setTimeout(() => setToast(''), 4000); } return r.catalogue; });
      setStale(r.stale); setError(''); player.restore(r.catalogue.tracks);
    } catch (e) { if (!silent) setError(e instanceof Error ? e.message : 'Could not load the catalogue'); }
    finally { inflight.current = false; if (!silent) setBusy(false); }
  }
  useEffect(() => {
    void refresh();
    const tick = () => { if (document.visibilityState === 'visible') void refresh(true); };
    const id = setInterval(tick, 30000);                       // live sync while the tab is open
    document.addEventListener('visibilitychange', tick); window.addEventListener('online', tick); window.addEventListener('focus', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); window.removeEventListener('online', tick); window.removeEventListener('focus', tick); };
  }, []);
  useEffect(() => { player.setPreferences(settings.preferredQuality, settings.autoplayNext); }, [settings]);
  useEffect(() => { if (p.notice) { setToast(p.notice); const t = setTimeout(() => { setToast(''); player.dismissNotice(); }, 5000); return () => clearTimeout(t); } }, [p.notice]);

  const go = (v: View) => { setHistory(h => [...h, view]); setView(v); };
  const back = () => setHistory(h => { const l = h[h.length - 1]; if (l) setView(l); return h.slice(0, -1); });
  const tab = (name: Extract<View, { name: string }>['name']) => { setHistory([]); setView({ name } as View); };
  const toggleFav = (id: string) => setFavs(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 4000); };
  const tracks = cat?.tracks ?? [];
  const byId = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks]);

  const rowProps = { current, playing: p.playing, favs, toggleFav, playlists, setPlaylists, go, say };
  const nav = [['Home', Home], ['Explore', Compass], ['Search', Search], ['Library', Library], ['Downloads', Download]] as const;
  const activeTab = 'name' in view && ['Home', 'Explore', 'Search', 'Library', 'Downloads', 'Queue', 'Settings'].includes(view.name) ? view.name : 'Library';

  return <div className="app">
    <aside className="sidebar"><div className="brand"><img src="/icons/icon-64.png" alt="" width="34" height="34" />Hi360</div><label>MENU</label>
      {nav.map(([n, I]) => <button key={n} aria-label={n} title={n} className={activeTab === n ? 'nav active' : 'nav'} onClick={() => tab(n)}><I size={19} />{n}</button>)}
      <button aria-label="Queue" title="Queue" className={activeTab === 'Queue' ? 'nav active' : 'nav'} onClick={() => tab('Queue')}><ListMusic size={19} />Queue</button>
      <button aria-label="Settings" title="Settings" className={activeTab === 'Settings' ? 'nav active' : 'nav'} onClick={() => tab('Settings')}><Cog size={19} />Settings</button>
      <div className="sidebottom"><b>Sound in every detail.</b><small>Your music, your way.</small></div></aside>
    <main>
      <header><div>{history.length > 0 && <button className="back" onClick={back}><ChevronLeft size={18} />Back</button>}<small>YOUR PERSONAL MUSIC SPACE</small><h1>{viewTitle(view, cat, playlists)}</h1></div>
        <button className="round" aria-label="Refresh catalogue" onClick={() => void refresh(false)}><RefreshCw className={busy ? 'spin' : ''} /></button></header>
      {error && <div className="error" role="alert">{error}<button onClick={() => void refresh(false)}>Retry</button></div>}
      {stale && !error && <div className="error" role="status">Showing your last saved catalogue — couldn’t reach the server.<button onClick={() => void refresh(false)}>Refresh</button></div>}
      {busy && !cat && <p className="muted">Loading your collection…</p>}
      {cat && !tracks.length && !busy && <div className="empty"><Music2 /><h3>No playable tracks yet</h3><p>Add tracks with at least one HTTPS audio URL in Deltabase, then refresh.</p></div>}

      {view.name === 'Home' && cat && <HomeView cat={cat} rowProps={rowProps} go={go} />}
      {view.name === 'Explore' && cat && <ExploreView cat={cat} go={go} setQuery={q => { setQuery(q); tab('Search'); }} />}
      {view.name === 'Search' && <SearchView tracks={tracks} query={query} setQuery={setQuery} rowProps={rowProps} />}
      {view.name === 'Library' && cat && <LibraryView cat={cat} favs={favs} playlists={playlists} setPlaylists={setPlaylists} byId={byId} rowProps={rowProps} go={go} />}
      {view.name === 'Downloads' && <DownloadsView tracks={tracks} say={say} />}
      {view.name === 'Queue' && <QueueView p={p} favs={favs} />}
      {view.name === 'Settings' && <SettingsView settings={settings} setSettings={setSettings} />}
      {view.name === 'album' && cat && <AlbumView album={cat.albums.find(a => a.key === view.key)} rowProps={rowProps} />}
      {view.name === 'artist' && cat && <ArtistView artist={cat.artists.find(a => a.name === view.artist)} cat={cat} rowProps={rowProps} go={go} />}
      {view.name === 'playlist' && <PlaylistView pl={playlists.find(x => x.id === view.id)} byId={byId} setPlaylists={setPlaylists} rowProps={rowProps} onGone={back} />}
    </main>

    {current && <div className={'player' + (expanded ? ' expanded' : '')}>
      <button className="collapse" aria-label="Collapse player" onClick={() => setExpanded(false)}>⌄ Close</button>
      <div className="now" onClick={e => { if (window.matchMedia('(max-width:620px)').matches && !(e.target as HTMLElement).closest('button')) setExpanded(true); }}><div className="cover">{current.cover ? <img src={current.cover} alt="" /> : <Disc3 />}</div>
        <div><b>{current.title}</b><small>{current.artist}{current.featured ? ' feat. ' + current.featured : ''}</small></div>
        <button aria-label={favs.includes(current.id) ? 'Remove from favourites' : 'Add to favourites'} onClick={() => toggleFav(current.id)}><Heart fill={favs.includes(current.id) ? 'currentColor' : 'none'} /></button></div>
      <div className="transport"><div>
        <button aria-label="Shuffle" aria-pressed={p.shuffle} className={p.shuffle ? 'on' : ''} onClick={() => player.toggleShuffle()}><Shuffle size={17} /></button>
        <button aria-label="Previous" onClick={() => player.prev()}><SkipBack /></button>
        <button className="play" aria-label={p.playing ? 'Pause' : 'Play'} onClick={() => player.toggle()}>{p.playing ? <Pause /> : <Play />}</button>
        <button aria-label="Next" onClick={() => player.next()}><SkipForward /></button>
        <button aria-label={'Repeat ' + p.repeat} className={p.repeat !== 'off' ? 'on' : ''} onClick={() => player.cycleRepeat()}>{p.repeat === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}</button></div>
        <div className="seek"><span>{time(p.position)}</span><input type="range" aria-label="Seek" min={0} max={Math.max(1, Math.floor(p.duration || current.duration))} value={Math.min(p.position, p.duration || current.duration)} onChange={e => player.seek(+e.target.value)} /><span>{time(p.duration || current.duration)}</span></div>
        {(p.buffering || p.error) && <small className={p.error ? 'perr' : 'muted'}>{p.error || 'Buffering…'}</small>}</div>
      <div className="tools">
        <select aria-label="Audio quality" disabled={p.switching} value={p.quality ?? ''} onChange={e => player.switchQuality(e.target.value as QualityKey)}>{avail(current).map(k => <option key={k} value={k}>{QUALITY_LABELS[k]}</option>)}</select>
        {current.video && <button aria-label="Music video" title="Music video" onClick={() => setVideoTrack(current)}><MonitorPlay /></button>}
        <button aria-label="Lyrics" className={lyricsOpen ? 'on' : ''} onClick={() => setLyricsOpen(o => !o)}><Mic2 /></button>
        <button aria-label="Queue" onClick={() => tab('Queue')}><ListMusic /></button>
        <Volume2 /><input type="range" aria-label="Volume" min="0" max="1" step=".01" value={p.volume} onChange={e => player.setVolume(+e.target.value)} /></div>
    </div>}

    {lyricsOpen && current && <LyricsPanel track={current} position={p.position} onClose={() => setLyricsOpen(false)} />}
    {videoTrack && <VideoModal track={videoTrack} onClose={() => setVideoTrack(null)} />}
    {toast && <div className="toast" role="status">{toast}</div>}
    <nav className="mobile">{nav.map(([n, I]) => <button key={n} className={activeTab === n ? 'active' : ''} onClick={() => tab(n)}><I /><small>{n}</small></button>)}<button className={activeTab === 'Queue' ? 'active' : ''} onClick={() => tab('Queue')}><ListMusic /><small>Queue</small></button><button className={activeTab === 'Settings' ? 'active' : ''} onClick={() => tab('Settings')}><Cog /><small>Settings</small></button></nav>
  </div>;
}

function viewTitle(v: View, cat: Catalogue | null, pls: Playlist[]) {
  if (v.name === 'Home') return 'Good music. Better days.';
  if (v.name === 'album') return cat?.albums.find(a => a.key === v.key)?.name ?? 'Album';
  if (v.name === 'artist') return v.artist;
  if (v.name === 'playlist') return pls.find(p => p.id === v.id)?.name ?? 'Playlist';
  return v.name;
}

type RowProps = { current: Track | null; playing: boolean; favs: string[]; toggleFav: (id: string) => void; playlists: Playlist[]; setPlaylists: (f: (p: Playlist[]) => Playlist[]) => void; go: (v: View) => void; say: (m: string) => void };

function Section({ title, action, children }: { title: string; action?: () => void; children: React.ReactNode }) {
  return <section className="section"><div className="sectionhead"><h3>{title}</h3>{action && <button onClick={action}>View all ↗</button>}</div>{children}</section>;
}

function TrackRows({ tracks, rp, numbered = true, onRemove }: { tracks: Track[]; rp: RowProps; numbered?: boolean; onRemove?: (t: Track) => void }) {
  const [menu, setMenu] = useState<string | null>(null);
  if (!tracks.length) return <div className="empty"><p>Nothing here yet.</p></div>;
  return <div className="rows">{tracks.map((t, i) => <div key={t.id + i} className={'track ' + (rp.current?.id === t.id ? 'selected' : '')}>
    <span className="num">{String(i + 1).padStart(2, '0')}</span>
    <button className="thumb" aria-label={`Play ${t.title}`} onClick={() => player.playList(tracks, i)}>{t.cover ? <img src={t.cover} alt="" loading="lazy" /> : <Music2 />}</button>
    <button className="tracktext" onClick={() => player.playList(tracks, i)}><b>{t.title}</b><small>{t.artist}{t.featured ? ' feat. ' + t.featured : ''}{t.album ? ' · ' + t.album : ''}</small></button>
    <span className="qtag" title={avail(t).map(k => QUALITY_LABELS[k]).join(', ')}>{avail(t).length} {avail(t).length === 1 ? 'quality' : 'qualities'}</span>
    <span className="duration">{time(t.duration)}</span>
    <button className="like" aria-label="Favourite" onClick={() => rp.toggleFav(t.id)}><Heart fill={rp.favs.includes(t.id) ? 'currentColor' : 'none'} /></button>
    <div className="menuwrap"><button className="like" aria-label="More options" aria-expanded={menu === t.id} onClick={() => setMenu(menu === t.id ? null : t.id)}>⋯</button>
      {menu === t.id && <div className="menu" role="menu" onMouseLeave={() => setMenu(null)}>
        <button onClick={() => { player.playNext(t); setMenu(null); }}>Play next</button>
        <button onClick={() => { player.addToQueue(t); setMenu(null); }}>Add to queue</button>
        {t.album && <button onClick={() => { setMenu(null); rp.go({ name: 'album', key: `${t.albumArtist.toLowerCase()}::${t.album.toLowerCase()}` }); }}>Go to album</button>}
        <button onClick={() => { setMenu(null); rp.go({ name: 'artist', artist: t.artist }); }}>Go to artist</button>
        {rp.playlists.map(pl => <button key={pl.id} onClick={() => { rp.setPlaylists(ps => ps.map(x => x.id === pl.id && !x.trackIds.includes(t.id) ? { ...x, trackIds: [...x.trackIds, t.id] } : x)); rp.say(`Added to ${pl.name}.`); setMenu(null); }}>＋ {pl.name}</button>)}
        {onRemove && <button onClick={() => { onRemove(t); setMenu(null); }}>Remove from this list</button>}
      </div>}</div>
  </div>)}</div>;
}

function HomeView({ cat, rowProps, go }: { cat: Catalogue; rowProps: RowProps; go: (v: View) => void }) {
  const recent = useMemo(() => [...cat.tracks].sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')).slice(0, 8), [cat]);
  return <>
    <section className="hero"><div><small>THE HI360 EXPERIENCE</small><h2>Hear every<br /><em>little detail.</em></h2><p>Your collection, beautifully brought together.</p>
      <button className="primary" disabled={!cat.tracks.length} onClick={() => player.playList(cat.tracks, 0)}><Play size={16} /> Play your music</button></div><div className="vinyl"><span>HI<br />360</span></div></section>
    <Section title="Recently added"><TrackRows tracks={recent} rp={rowProps} /></Section>
    {cat.albums.length > 0 && <Section title="Albums"><AlbumGrid albums={cat.albums.slice(0, 12)} go={go} /></Section>}
    <Section title="Artists"><ArtistGrid artists={cat.artists} go={go} /></Section></>;
}
function AlbumGrid({ albums, go }: { albums: Album[]; go: (v: View) => void }) {
  return <div className="grid">{albums.map(a => <button key={a.key} className="card" onClick={() => go({ name: 'album', key: a.key })}><div className="art">{a.cover ? <img src={a.cover} alt="" loading="lazy" /> : <Disc3 />}</div><b>{a.name}</b><small>{a.artist}{a.year ? ' · ' + a.year : ''}</small></button>)}</div>;
}
function ArtistGrid({ artists, go }: { artists: Artist[]; go: (v: View) => void }) {
  return <div className="artists">{artists.map(a => <button key={a.name} className="artist" onClick={() => go({ name: 'artist', artist: a.name })}><div>{a.image ? <img src={a.image} alt="" loading="lazy" /> : a.name[0]}</div><b>{a.name}</b><small>{a.trackCount} {a.trackCount === 1 ? 'track' : 'tracks'}</small></button>)}</div>;
}

function ExploreView({ cat, go, setQuery }: { cat: Catalogue; go: (v: View) => void; setQuery: (q: string) => void }) {
  const genres = useMemo(() => [...new Set(cat.tracks.map(t => t.genre).filter(Boolean))].sort(), [cat]);
  return <>{genres.length > 0 && <Section title="Genres"><div className="genres">{genres.map(g => <button key={g} onClick={() => setQuery(g)}>{g}</button>)}</div></Section>}
    <Section title="Albums">{cat.albums.length ? <AlbumGrid albums={cat.albums} go={go} /> : <p className="muted">Albums appear when tracks share an album name.</p>}</Section>
    <Section title="Artists"><ArtistGrid artists={cat.artists} go={go} /></Section></>;
}

function SearchView({ tracks, query, setQuery, rowProps }: { tracks: Track[]; query: string; setQuery: (q: string) => void; rowProps: RowProps }) {
  const [sort, setSort] = useState<SortKey>('recent'); const [genre, setGenre] = useState('');
  const genres = useMemo(() => [...new Set(tracks.map(t => t.genre).filter(Boolean))].sort(), [tracks]);
  const out = useMemo(() => sortTracks(tracks.filter(t => (!genre || t.genre === genre) && matches(t, query)), sort), [tracks, query, sort, genre]);
  return <section><input className="search" autoFocus aria-label="Search" placeholder="Search title, artist, album, genre, year…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="filters"><SortSelect sort={sort} setSort={setSort} /><select aria-label="Genre filter" value={genre} onChange={e => setGenre(e.target.value)}><option value="">All genres</option>{genres.map(g => <option key={g}>{g}</option>)}</select><span className="muted">{out.length} results</span></div>
    {out.length ? <TrackRows tracks={out} rp={rowProps} /> : <div className="empty"><p>No matches.</p></div>}</section>;
}
const matches = (t: Track, q: string) => { const s = q.trim().toLowerCase(); return !s || [t.title, t.artist, t.featured, t.album, t.albumArtist, t.genre, t.year || ''].join(' ').toLowerCase().includes(s); };
function sortTracks(ts: Track[], k: SortKey) {
  const c = [...ts]; const s = (a: string, b: string) => a.localeCompare(b);
  switch (k) { case 'title': return c.sort((a, b) => s(a.title, b.title)); case 'artist': return c.sort((a, b) => s(a.artist, b.artist) || s(a.title, b.title)); case 'album': return c.sort((a, b) => s(a.album, b.album) || a.discNo - b.discNo || a.trackNo - b.trackNo); case 'year': return c.sort((a, b) => b.year - a.year); case 'trackNo': return c.sort((a, b) => a.trackNo - b.trackNo); default: return c.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')); }
}
function SortSelect({ sort, setSort }: { sort: SortKey; setSort: (s: SortKey) => void }) {
  return <select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value as SortKey)}><option value="recent">Recently added</option><option value="title">Title</option><option value="artist">Artist</option><option value="album">Album</option><option value="year">Year</option><option value="trackNo">Track number</option></select>;
}

function LibraryView({ cat, favs, playlists, setPlaylists, byId, rowProps, go }: { cat: Catalogue; favs: string[]; playlists: Playlist[]; setPlaylists: RowProps['setPlaylists']; byId: Map<string, Track>; rowProps: RowProps; go: (v: View) => void }) {
  const [tab, setTab] = useState<'Tracks' | 'Albums' | 'Artists' | 'Playlists' | 'Favourites'>('Tracks'); const [sort, setSort] = useState<SortKey>('title'); const [name, setName] = useState('');
  const favTracks = favs.map(id => byId.get(id)).filter((t): t is Track => !!t);
  return <section><div className="tabs">{(['Tracks', 'Albums', 'Artists', 'Playlists', 'Favourites'] as const).map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'Tracks' && <><div className="filters"><SortSelect sort={sort} setSort={setSort} /><span className="muted">{cat.tracks.length} tracks</span></div><TrackRows tracks={sortTracks(cat.tracks, sort)} rp={rowProps} /></>}
    {tab === 'Albums' && (cat.albums.length ? <AlbumGrid albums={cat.albums} go={go} /> : <div className="empty"><p>No albums yet.</p></div>)}
    {tab === 'Artists' && <ArtistGrid artists={cat.artists} go={go} />}
    {tab === 'Favourites' && (favTracks.length ? <TrackRows tracks={favTracks} rp={rowProps} /> : <div className="empty"><Heart /><p>Tap the heart on any track to save it here.</p></div>)}
    {tab === 'Playlists' && <><form className="newpl" onSubmit={e => { e.preventDefault(); const n = name.trim(); if (!n) return; setPlaylists(p => [...p, { id: crypto.randomUUID(), name: n, trackIds: [] }]); setName(''); }}><input aria-label="New playlist name" placeholder="New playlist name" value={name} onChange={e => setName(e.target.value)} /><button className="primary" type="submit"><Plus size={16} />Create</button></form>
      {playlists.length ? <div className="rows">{playlists.map(pl => <button key={pl.id} className="plrow" onClick={() => go({ name: 'playlist', id: pl.id })}><ListMusic /><b>{pl.name}</b><small>{pl.trackIds.length} tracks</small></button>)}</div> : <div className="empty"><p>Create your first playlist above.</p></div>}</>}</section>;
}

function Detail({ title, sub, cover, tracks, rp, extra }: { title: string; sub: string; cover?: string; tracks: Track[]; rp: RowProps; extra?: React.ReactNode }) {
  return <section><div className="detailhead"><div className="art big">{cover ? <img src={cover} alt="" /> : <Disc3 />}</div><div><h2>{title}</h2><p className="muted">{sub}</p>
    <div className="actions"><button className="primary" disabled={!tracks.length} onClick={() => player.playList(tracks, 0)}><Play size={16} />Play</button><button className="ghost" disabled={!tracks.length} onClick={() => { const t = [...tracks].sort(() => Math.random() - 0.5); player.playList(t, 0); }}><Shuffle size={16} />Shuffle</button></div></div></div>{extra}<TrackRows tracks={tracks} rp={rp} /></section>;
}
function AlbumView({ album, rowProps }: { album?: Album; rowProps: RowProps }) {
  if (!album) return <div className="empty"><p>Album not found.</p></div>;
  const dur = album.tracks.reduce((s, t) => s + t.duration, 0);
  return <Detail title={album.name} sub={`${album.artist}${album.year ? ' · ' + album.year : ''} · ${album.tracks.length} tracks · ${time(dur)}`} cover={album.cover} tracks={album.tracks} rp={rowProps} />;
}
function ArtistView({ artist, cat, rowProps, go }: { artist?: Artist; cat: Catalogue; rowProps: RowProps; go: (v: View) => void }) {
  if (!artist) return <div className="empty"><p>Artist not found.</p></div>;
  const ts = cat.tracks.filter(t => t.artist.toLowerCase() === artist.name.toLowerCase()); const albums = cat.albums.filter(a => a.artist.toLowerCase() === artist.name.toLowerCase());
  return <Detail title={artist.name} sub={artist.bio || `${ts.length} tracks`} cover={artist.image} tracks={ts} rp={rowProps} extra={albums.length ? <Section title="Albums"><AlbumGrid albums={albums} go={go} /></Section> : null} />;
}
function PlaylistView({ pl, byId, setPlaylists, rowProps, onGone }: { pl?: Playlist; byId: Map<string, Track>; setPlaylists: RowProps['setPlaylists']; rowProps: RowProps; onGone: () => void }) {
  if (!pl) return <div className="empty"><p>Playlist not found.</p></div>;
  const ts = pl.trackIds.map(id => byId.get(id)).filter((t): t is Track => !!t);
  return <Detail title={pl.name} sub={`${ts.length} tracks`} tracks={ts} rp={rowProps} extra={<div className="actions" style={{ margin: '12px 0' }}>
    <button className="ghost" onClick={() => { const n = prompt('Rename playlist', pl.name)?.trim(); if (n) setPlaylists(p => p.map(x => x.id === pl.id ? { ...x, name: n } : x)); }}>Rename</button>
    <button className="ghost" onClick={() => { if (confirm(`Delete “${pl.name}”?`)) { setPlaylists(p => p.filter(x => x.id !== pl.id)); onGone(); } }}>Delete</button></div>} />;
}

function QueueView({ p, favs }: { p: ReturnType<typeof usePlayer>; favs: string[] }) {
  if (!p.queue.length) return <div className="empty"><ListMusic /><h3>Queue is empty</h3><p>Play a track or use “Add to queue”.</p></div>;
  return <section><div className="actions" style={{ marginBottom: 14 }}><button className="ghost" onClick={() => player.clearUpcoming()}>Clear upcoming</button></div>
    <div className="rows">{p.queue.map((t, i) => <div key={t.id + i} className={'track ' + (i === p.index ? 'selected' : '')}><span className="num">{i === p.index ? '▶' : String(i + 1).padStart(2, '0')}</span>
      <button className="thumb" onClick={() => player.jump(i)} aria-label={`Play ${t.title}`}>{t.cover ? <img src={t.cover} alt="" /> : <Music2 />}</button>
      <button className="tracktext" onClick={() => player.jump(i)}><b>{t.title}</b><small>{t.artist}</small></button><span className="duration">{time(t.duration)}</span>
      {favs.includes(t.id) && <Heart size={14} fill="currentColor" />}
      {i !== p.index ? <button className="like" aria-label="Remove from queue" onClick={() => player.removeAt(i)}><X size={16} /></button> : <span style={{ width: 24 }} />}</div>)}</div></section>;
}

function DownloadsView({ tracks, say }: { tracks: Track[]; say: (m: string) => void }) {
  const [q, setQ] = useState(''); const [busy, setBusy] = useState('');
  const list = tracks.filter(t => matches(t, q)).slice(0, 100);
  return <section><div className="note">Downloads save the source file to this device through your browser. The web app streams from the catalogue and never plays local files. Hosts that block cross-origin reads open the file in a new tab instead. Offline playback is available in the Android app only.</div>
    <input className="search" aria-label="Find a track to download" placeholder="Find a track…" value={q} onChange={e => setQ(e.target.value)} />
    <div className="rows">{list.map(t => <div className="track" key={t.id}><div className="thumb">{t.cover ? <img src={t.cover} alt="" /> : <Music2 />}</div><div className="tracktext"><b>{t.title}</b><small>{t.artist}</small></div>
      {avail(t).map(k => <button key={k} className="qtag dl" disabled={!!busy} onClick={async () => { setBusy(t.id + k); say(await downloadTrack(t, k)); setBusy(''); }}>{busy === t.id + k ? '…' : QUALITY_LABELS[k].replace('FLAC · ', 'FLAC ').replace('AAC · ', 'AAC ')}</button>)}</div>)}</div></section>;
}

function SettingsView({ settings, setSettings }: { settings: Settings; setSettings: (f: (s: Settings) => Settings) => void }) {
  return <section className="settings"><label>Preferred quality<select value={settings.preferredQuality} onChange={e => setSettings(s => ({ ...s, preferredQuality: e.target.value as QualityKey }))}>{QUALITY_ORDER.map(k => <option key={k} value={k}>{QUALITY_LABELS[k]}</option>)}</select></label>
    <p className="muted">Used when a track starts. If a track lacks that tier, the closest available one is used. Changing quality in the player switches the current track at the same position and becomes the new preference.</p>
    <label className="check"><input type="checkbox" checked={settings.autoplayNext} onChange={e => setSettings(s => ({ ...s, autoplayNext: e.target.checked }))} />Play next track automatically</label>
    <p className="muted">Hi360 on the web is a single-user private player: favourites, playlists and settings are stored in this browser only. There is no account or cross-device sync.</p></section>;
}

function LyricsPanel({ track, position, onClose }: { track: Track; position: number; onClose: () => void }) {
  const [lyr, setLyr] = useState<Lyrics | null | undefined>(undefined); const [err, setErr] = useState('');
  useEffect(() => {
    const ctl = new AbortController(); setLyr(undefined); setErr('');
    getLyrics(track.title, track.artist, track.album, track.duration, ctl.signal).then(setLyr).catch(e => { if (!ctl.signal.aborted) setErr(e instanceof Error ? e.message : 'Lyrics unavailable'); });
    return () => ctl.abort();
  }, [track.id]);
  const idx = lyr?.synced ? activeLine(lyr.synced, position + 0.15) : -1; const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [idx]);
  return <aside className="lyrics" aria-label="Lyrics"><button className="x" aria-label="Close lyrics" onClick={onClose}>×</button><small>LYRICS · LRCLIB</small><h3>{track.title}</h3>
    {err ? <p>{err}</p> : lyr === undefined ? <p className="muted">Looking up lyrics…</p> : lyr === null ? <p>No lyrics found.</p> : lyr.instrumental ? <p>♪ Instrumental</p>
      : lyr.synced ? <div className="lrc">{lyr.synced.map((l, i) => <p key={i} ref={i === idx ? ref : undefined} className={i === idx ? 'on' : ''} onClick={() => player.seek(l.time)}>{l.text || '♪'}</p>)}</div>
        : <p className="plain">{lyr.plain || 'No lyrics found.'}</p>}</aside>;
}

function VideoModal({ track, onClose }: { track: Track; onClose: () => void }) {
  const [failed, setFailed] = useState(false); const wasPlaying = useRef(false);
  useEffect(() => { wasPlaying.current = player.state.playing; if (wasPlaying.current) player.toggle(); return () => { if (wasPlaying.current && !player.state.playing) player.toggle(); }; }, []);
  return <div className="modal" role="dialog" aria-label="Music video" onClick={onClose}><div onClick={e => e.stopPropagation()}><button className="x" aria-label="Close video" onClick={onClose}>×</button><h3>{track.title}</h3>
    {failed ? <div className="empty"><p>This video can’t be played inside Hi360 (host, format or CORS restriction).</p><a className="primary" href={track.video} target="_blank" rel="noopener noreferrer">Open video in a new tab</a></div>
      : <video src={track.video} controls autoPlay playsInline onError={() => setFailed(true)} />}</div></div>;
}
