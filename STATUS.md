# Hi360 — implementation status

**None of this has been compiled or run.** The environment this work was done in had no network, so `npm install`, `tsc`, `vite build`, Gradle and every test were *not* executed. Treat everything below as "written, unverified" until you run the commands in "First run".

## First run
```bash
npm install && npm test && npm run build      # web
cd android && ./gradlew testDebugUnitTest assembleDebug   # Android (JDK 17)
```
Expect to fix a few type/compile errors on first build. Then set `DELTABASE_SCRIPT_URL` / `DELTABASE_TOKEN` on the host and replace `YOUR-HI360-DOMAIN` in `android/app/build.gradle.kts`.

## Written (needs build + device testing)
**Web**
- Catalogue loader: accepts 18-column arrays or header-keyed objects, HTTPS-only URLs, drops tracks with no playable URL, 15 s timeout, 3 tries with backoff, last-good cache in localStorage (shown as "stale").
- Playback engine (`src/player.ts`): queue, play next / add to queue / remove / jump, shuffle, repeat off/all/one, prev/next, seek, volume, autoplay toggle, restore of queue + position after reload, Media Session (lock-screen/keyboard controls), next-track metadata preload (skipped on data-saver / ≤3G), offline/online handling.
- One-track quality ladder: unavailable tiers hidden; position-preserving switch on a second audio element with rollback after error or 15 s; automatic fallback to the nearest other tier at the same position when a source fails. The measured hand-over time is stored (`lastSwitchMs`) but **seamlessness has not been measured** — a small gap is possible.
- Library: Home, Explore (genres/albums/artists), Search with sort + genre filter, Library tabs (tracks/albums/artists/playlists/favourites), album/artist/playlist pages, playlists (create/rename/delete/add), favourites, queue view, settings.
- Synced lyrics from LRCLIB (line highlight, auto-scroll, click-to-seek), plain-text fallback, instrumental/not-found/rate-limit states; never blocks playback.
- In-app video player with external-link fallback; audio is paused while video plays and resumed on close.
- Web downloads: fetch→save, falls back to opening the file when the host blocks CORS. No local-file playback.
- Unit tests (`src/__tests__`): LRC parsing, row parsing/validation, album grouping, quality fallback.

**Android**
- `PlaybackService` (MediaSessionService + ExoPlayer): background playback, notification, lock-screen/Bluetooth controls, audio focus, becoming-noisy pause.
- ViewModel + MediaController: search, favourites (persisted), catalogue cache, queue, shuffle, repeat, seek bar, prev/next, quality menu with position-preserving switch and automatic fallback, notification-permission request, settings for the API URL and preferred quality.
- Parser/tier unit tests (`CatalogueParserTest`).

## Added in round 2 (also unbuilt/untested)
- **App icon:** your `ic_launcher.png` is wired in everywhere: Android adaptive launcher icon (`res/mipmap-*`, black background), web favicon, apple-touch-icon, and an installable-web-app manifest with maskable icons. Brand text is "Hi360" everywhere.
- **Live catalogue:** the server functions now send `Cache-Control: no-store`, so every read hits the Google Sheet. Web polls every 30 s while the tab is visible, plus on focus / back online. Android refreshes on every resume and every 30 s while visible. New songs appear in the list, and are streamable and downloadable, on the next poll (typically within ~30 s plus Apps Script response time) — it is polling, not push. Failed background syncs keep the current list; no placeholder or demo data exists in either app.
- **Web layouts by screen size:** phone (≤620 px: bottom tab bar, mini-player that expands to a full-screen player with seek, quality, lyrics, queue), tablet (621–1000 px: icon sidebar), desktop (>1000 px: full sidebar, wider grids, lyrics docked as a side panel). One site, responsive — not separate sites.
- **Android layouts:** phones locked to portrait; tablets (smallest width ≥600 dp) rotate freely including landscape; screens ≥720 dp width get a two-pane layout (library + big artwork/now-playing panel).

## Not implemented (deliberately not faked)
- **Android:** downloads / encrypted offline library, exclusive / bit-perfect output (needs native/USB-DAC work and real-device testing), lyrics UI, video, albums/artists/playlists screens, queue restore after process death. Android quality switching re-prepares the player, so it is **not gapless**.
- **Web:** exclusive/bit-perfect output (browsers can't offer it), accounts and cross-device sync (single-user, per-browser storage), accessibility audit, e2e tests.
- Apps Script response contract is still unverified against the deployed script.
- Token rotation is still on you if the old token was ever exposed.
