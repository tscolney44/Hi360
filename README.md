# Hi360

Hi360 is a private-friends music streaming platform for Android and the web.

**Development status:** active build; not yet a production release.

## Product
- Deltabase Google Sheets catalogue through a server-side Apps Script proxy.
- Seamless quality ladder: AAC 96 kbps, AAC 256 kbps, FLAC 16-bit CD, FLAC 24-bit. Only available links are shown.
- LRCLIB lyrics, including synced and plain lyrics.
- Optional music video links.
- Premium dark interface, search, library, artists, queue, favourites and mini-player.
- Native Android playback and app-private offline downloads.
- Vercel and Netlify deployment configuration.
- GitHub Actions build workflow.

## Web deployment
Set server-side environment variables:
- `DELTABASE_SCRIPT_URL`: deployed Apps Script /exec URL.
- `DELTABASE_TOKEN`: Deltabase secret (rotate the previously exposed token before sharing).

Vercel: import repository root and deploy. Netlify: build command `npm run build`, publish directory `dist`.

## Local development
```bash
npm install
npm run dev
```

GitHub Releases will only contain APKs created by a successful build and tested on a real device.