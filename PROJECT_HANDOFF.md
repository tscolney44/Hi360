# HI360 — MASTER PRODUCT SPECIFICATION & DEVELOPER / AI HANDOFF

**Purpose:** This document is the authoritative brief for any AI coding assistant or developer continuing this project. Read it fully before modifying code.

**Current code snapshot:** GitHub repository `tscolney44/Hi360`, branch `main`, commit `54654329085b3145eb6bfe56e58c6f04b6af76e4` (2026-11 snapshot). This ZIP omits `.github/` workflows and GitHub-only write-test notes, but otherwise contains the source files listed in the repository tree.

**Critical distinction:** Requirements below describe the intended complete product. They are not a claim that the current source already implements them. The current source is an early foundation and must be audited, completed, built and tested.

---

## 1. Product vision

Build **Hi360**, a polished, real music-streaming platform for:
- Native Android app.
- Responsive web app usable on desktop/PC and mobile browsers.

This is not a static mock-up. Every visible control must perform its advertised action. Do not mark a feature complete until implemented, tested and documented.

The music catalogue is privately managed through the separate Deltabase/Google Sheets workflow. The consumer Hi360 app reads the catalogue; do not merge the catalogue-management tool into the consumer app.

## 2. Non-negotiable product requirements

### 2.1 Catalogue and source
- Catalogue source: user's VoidDrive-hosted audio URLs indexed in Google Sheets through the Deltabase Apps Script API.
- Sheet/tab is referred to as Deltabase. Do not scrape VoidDrive or infer tracks from filenames.
- Read metadata from the catalogue / embedded metadata when available. Display title, artist, featured artists, album, album artist, cover art, track/disc number, year, genre and duration from trusted metadata fields. Never show a random storage filename as the song title if a proper title exists.
- The current code expects an Apps Script JSON response shaped approximately as `{ "ok": true, "tracks": [...], "artists": [...] }`. Verify the real deployed script before relying on this contract.
- Existing `Tracks` tab schema (18 columns, in this exact order):
  1. `ID`
  2. `Title`
  3. `Artist`
  4. `Featured Artists`
  5. `Album`
  6. `Album Artist`
  7. `Cover Art URL`
  8. `Track No`
  9. `Disc No`
  10. `Year`
  11. `Genre`
  12. `Duration (sec)`
  13. `AAC 96 kbps URL`
  14. `AAC 256 kbps URL`
  15. `FLAC 16-bit (CD) URL`
  16. `FLAC 24-bit URL`
  17. `Video URL`
  18. `Date Added`
- Example track previously used for integration: “Lies” by Zach Bryan featuring Lana Del Rey. Do not hard-code it as production data.
- The current Android `CatalogueApi.kt` parses `tracks` as arrays. The web `src/api.ts` also maps arrays by column index. Confirm the actual Apps Script serializer returns arrays rather than objects.

### 2.2 One-track quality ladder
A song must appear **once** in the library even if it has multiple audio encodings. Provide one quality selector/ladder on the same track:
1. AAC 96 kbps
2. AAC 256 kbps
3. FLAC 16-bit (CD)
4. FLAC 24-bit (Hi-Res)

- No MP3.
- Use AAC/M4A-family lossy files as the source formats; FLAC for lossless tiers.
- Hide unavailable quality tiers; never show a dead option.
- User selected the **seamless** switching behavior. Implement source switching that preserves playback position and minimizes interruption. True gapless/instant switching across different encodings is technically constrained by decoder/network buffering; measure it and document limitations rather than promising impossible behavior.
- Handle failed URL, timeout, unsupported codec, expired link, and fallback to another available quality without silently restarting the song.
- Never claim bit-perfect output merely because FLAC is selected.

### 2.3 Playback
- Reliable playback, play/pause, seek, previous/next, repeat, shuffle, queue, autoplay-next and playback-state restoration.
- Android background playback with a foreground media playback service, MediaSession, notification controls, lock-screen controls, headset/Bluetooth controls and audio-focus handling.
- Audio continues when the Android Activity is backgrounded or screen turns off.
- Web playback with a persistent player and browser media controls where supported.
- Handle network loss, buffering, reconnect, malformed/expired links, and playback errors.
- Preload/buffer next track when appropriate without wasting mobile data.
- Persist queue and playback state appropriately.

### 2.4 Android exclusive / bit-perfect mode
- Android-only setting requested by user.
- Provide an honest “Exclusive / bit-perfect output” capability only when Android version, device audio path, USB DAC, format, sample rate and app/player API permit it.
- Explain when Android system mixer, Bluetooth, resampling, DSP, volume processing or device limitations prevent bit-perfect output.
- Detect/report actual output capability where possible. Do not fake an exclusive-mode toggle that does nothing.
- Provide normal compatible output fallback.
- Test with real devices and USB DACs. No universal bit-perfect guarantee.

### 2.5 Lyrics
- Integrate LRCLIB (`https://lrclib.net/`) for plain and synced lyrics.
- Query using track title, artist, album and duration.
- Prefer synced lyrics when available; show time-synchronised line highlighting and scroll.
- Plain lyrics should still display when synced lyrics do not exist.
- Handle instrumental/no-result/rate-limit/network errors.
- Do not block playback while lyrics load.
- Current web code retrieves lyrics but displays the raw text; synced line timing UI is not implemented.

### 2.6 Music videos
- A track may have an optional `Video URL`.
- Provide a separate music-video browsing/playback experience, not just a random external link if in-app playback is technically supported.
- Respect provider CORS, content type, redirects, codec support and URL access restrictions.
- If a URL cannot be embedded, show a clear open-external fallback.
- Video playback should not break audio playback state.

### 2.7 Offline and downloads
**Android:**
- Download selected quality for offline playback inside Hi360.
- Store in app-private storage; encrypt at rest using Android Keystore-backed key management.
- Provide download progress, pause/resume, retry, delete, storage usage and offline library.
- Offline files must not be exposed as ordinary browsable music files through a file manager.
- Handle app uninstall/key loss and corrupted downloads clearly.
- Rooted/compromised devices cannot be guaranteed secure; document realistic limits.
- Do not download a URL unless the user is authorised to do so.

**Web:**
- Allow the user to download a source file to their device where browser and host permissions allow.
- The web app must not offer playback of a downloaded local file. Web streaming remains through the catalogue URL.
- Explain cross-origin/download limitations where the host prevents direct downloads.

### 2.8 Library and UX
- Premium, polished dark visual design.
- Home, Explore, Search, Library, Artists, Albums, Playlists, Favorites, Downloads (Android), Queue, Lyrics, Settings.
- Search across title, artist, featured artist, album, genre and metadata.
- Sort and filter by title, artist, album, recently added, year, genre and track number.
- Artist/album detail pages, artwork, track lists.
- User-created playlists and favourites with persistent storage/account sync if backend exists.
- Every button, menu and selector must work. Empty/loading/error/offline states required.
- Responsive layouts for desktop and mobile web; accessible labels, keyboard navigation and contrast.
- Do not use fake counts or demo content in production.

### 2.9 Accounts and sync
- No verified account/authentication backend is present in the current repository.
- If multi-device accounts are added, design secure authentication and server-side persistence for playlists, favorites, settings and listening state.
- Do not invent an account service or store passwords locally in plaintext.
- If the first release is single-user/private, document that clearly.

## 3. Existing source architecture

### Web client
- `src/main.tsx` — React bootstrap and global stylesheet.
- `src/App.tsx` — current single-component UI, navigation, track list, audio element, player and lyrics lookup.
- `src/api.ts` — calls `/api/catalogue`, maps the 18-column track array into `Track` objects and derives artist counts.
- `src/lrclib.ts` — LRCLIB lookup.
- `src/types.ts` — track/catalogue/quality TypeScript types.
- `src/style.css` — responsive dark theme.
- `index.html` — Vite entry.
- `package.json`, `tsconfig.json`, `vite.config.ts` — build configuration.

### Backend / hosting
- `api/catalogue.ts` — Vercel GET endpoint; reads `DELTABASE_SCRIPT_URL` and `DELTABASE_TOKEN` from server environment, POSTs `{action:"read", token}` to Apps Script, returns JSON.
- `netlify/functions/catalogue.mjs` — equivalent Netlify function.
- `netlify.toml` — build, function and redirect config.
- `vercel.json` — Vercel build/SPA rewrite config.
- `.env.example` — placeholder variable names only. Never place real credentials here.

### Android
- `android/settings.gradle.kts` — Android Studio project setup.
- `android/build.gradle.kts` — Android Gradle/Kotlin plugin versions.
- `android/gradle.properties` — Gradle/AndroidX settings.
- `android/app/build.gradle.kts` — app config and dependencies.
- `android/app/src/main/AndroidManifest.xml` — permissions and launcher Activity.
- `android/app/src/main/java/com/hi360/app/MainActivity.kt` — current Compose screen and Activity-owned ExoPlayer.
- `android/app/src/main/java/com/hi360/app/CatalogueApi.kt` — synchronous HTTP catalogue fetch and track parsing.

## 4. Data model / quality identifiers

Current TypeScript model:
- `QualityKey`: `aac96 | aac256 | flac16 | flac24`.
- `Track`: id, title, artist, featured, album, albumArtist, cover, genre, duration, qualities, video.
- `Catalogue`: tracks and artists.

Suggested robust production model (AI/developer should migrate consistently across clients):
- Stable track ID.
- Title, primary artist, featured artists (array or normalized string), album, album artist.
- Cover URL, track number, disc number, year, genre, duration.
- Quality URL map keyed by the four identifiers.
- Optional video URL and date added.
- Optional metadata provenance and last-updated timestamp.
- Validate URLs as HTTPS and validate media type/redirect behavior.

## 5. Security and reliability
- Deltabase token is a secret. It belongs only in server-side hosting environment variables. Rotate if it was previously exposed.
- Never ship the token in React bundles, APK, source control, logs, or screenshots.
- Use HTTPS only.
- Validate catalogue payloads and URL schemes; avoid arbitrary URL execution.
- Add request timeouts, retries with backoff, safe error messages and caching with clear freshness.
- Avoid leaking full signed VoidDrive URLs into analytics/logging.
- Review CORS, redirect and content-type behavior for VoidDrive and LRCLIB.
- Consider server-side proxying only where technically and legally appropriate; avoid turning the backend into an open proxy.
- Respect VoidDrive permissions, rate limits and user content rights.

## 6. Current implementation gaps (do not hide these)

The following are **not complete** in the current source snapshot:
- Apps Script/Deltabase API contract is not verified end-to-end.
- Android network call is synchronous inside `CatalogueApi.read()` (although called from an IO coroutine in current UI); needs robust repository layer, parsing, timeout/error handling and tests.
- Android Activity owns Exoplayer and pauses/releases it with Activity lifecycle. Proper MediaSessionService/background playback/notification/audio focus are missing.
- Android UI only has basic catalogue list, play/pause and a quality dropdown.
- Android has no complete search, artists/albums pages, playlists, favorites persistence, lyrics, video, downloads or offline library.
- Android seamless quality switching is not implemented; current selector swaps media source and restarts preparation.
- Android exclusive/bit-perfect output is not implemented.
- Web app is a basic UI. Queue management, repeat/shuffle, playlists, persistent favorites, full album/artist views, synced lyrics and complete downloads are missing.
- Web quality change switches the audio element source; it is not guaranteed seamless and may not correctly restore time for every browser/source.
- Web video opens an external URL; it is not an in-app video player.
- Web Downloads tab is explanatory placeholder only.
- No production-grade authentication, account sync, automated tests, telemetry, accessibility audit or full error-state coverage.
- No verified successful Android APK build or real-device test is included in this ZIP.
- No full backend service for playlist/favorites/account persistence is included.

## 7. Required implementation plan / acceptance criteria

Implement in this order and keep a checklist in the repository:

### Phase A — audit and make it build
- Verify all Gradle and npm dependencies and versions.
- Run `npm install && npm run build`.
- Open Android project, Gradle sync, `assembleDebug`.
- Fix compile/type errors; record exact toolchain.
- Verify deployed Apps Script contract using a safe test; never ask user to paste secrets.
- Add fixtures and schema validation for Deltabase rows.

### Phase B — data and playback foundations
- Create typed repository/data layer shared conceptually across platforms.
- Add robust catalogue loading, caching, refresh and error states.
- Build a proper Android MediaSessionService + ExoPlayer and web playback controller.
- Implement queue, next/previous, seek, shuffle, repeat, state restoration and audio focus.
- Test real audio links on Android and browsers.

### Phase C — seamless quality ladder
- One track record with four optional source URLs.
- Implement position-preserving switching with buffering strategy and rollback.
- Test transitions at multiple positions and network speeds.
- Confirm actual media container/codec of each URL (AAC/M4A vs FLAC).
- Show active tier and explain unavailable tiers. Never claim a transition is seamless until measured.

### Phase D — library features
- Search, artists, albums, genres, playlists, favorites, sorting and persistent settings.
- Responsive web and Android UI.
- Full metadata display.

### Phase E — lyrics and video
- Synced LRCLIB parser/timing/highlight UI; plain lyrics fallback.
- Video player and external fallback.
- Keep audio/video state separate and predictable.

### Phase F — Android offline and output modes
- Encrypted app-private download manager using Keystore.
- Offline library, progress, retry, delete, storage management.
- Hardware capability detection for exclusive/bit-perfect output; only expose mode when supported.
- Real-device tests, including USB DAC where available.

### Phase G — web downloads and production hardening
- Browser download flow (no local-file playback in web app).
- Security review, privacy, CORS, signed URL handling.
- Automated unit/integration/UI tests.
- Performance, accessibility, logging and release process.

### Release acceptance
A feature is only “done” when:
1. Code is implemented, not just a visual control.
2. Automated tests pass where practical.
3. It is manually tested on real supported devices/browsers.
4. Failure and offline cases are handled.
5. Docs explain setup and known limitations.
6. No secret or placeholder credential is committed.

## 8. Instructions to the next AI coding assistant

You are the lead engineer continuing Hi360. Do not throw away the current source or replace it with a static mockup. First inspect every file and run the builds. Preserve the product requirements in this document.

Work incrementally:
1. Audit the code and list actual build/runtime failures.
2. Fix build failures first.
3. Implement real functions end-to-end, with tests.
4. Keep Android and web feature parity where appropriate; clearly mark platform-specific behavior.
5. Do not fake exclusive audio, seamless switching, downloads, synced lyrics or background playback.
6. Do not claim completion without evidence.
7. Keep the UI premium and coherent; do not sacrifice working functionality for visual polish.
8. Ask the user only for information genuinely unavailable from the source (for example, the actual Apps Script response contract or deployment endpoint). Never request passwords or secret tokens.
9. Keep the Deltabase token server-side. Rotate previously exposed secrets.
10. At each milestone, report implemented, tested, pending and known limitations separately.

**First task:** perform a complete source/build audit, fix all compile/build errors, then implement a real Android background playback service and web playback queue before adding decorative features.
