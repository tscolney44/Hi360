# Hi360 — project source and AI handoff

Hi360 is a cross-platform music streaming project with a React/Vite web client, a native Android/Jetpack Compose client, and serverless catalogue proxies for a Google Apps Script / Google Sheets catalogue called Deltabase.

> **See `STATUS.md` for what was added after this snapshot — it is unbuilt and untested.**
>
> **Important status notice (original snapshot):** This ZIP is the exact source snapshot fetched from the `main` branch of `tscolney44/Hi360` at commit `54654329085b3145eb6bfe56e58c6f04b6af76e4`, with GitHub Actions/workflow files and GitHub-only test documentation omitted. It is **not** a finished production application. The handoff document explicitly describes the intended complete product and the known gaps. Do not assume a feature is complete just because it appears in the specification.

## Quick start: GitHub + Vercel + APK
See `docs/GITHUB_AND_DEPLOY.md`.

## Project folders

- `android/` — Android Studio project (Kotlin, Jetpack Compose, Media3).
- `src/` — React + TypeScript + Vite web application.
- `api/` — Vercel serverless catalogue proxy.
- `netlify/functions/` — Netlify catalogue proxy.
- `docs/` — deployment notes and implementation handoff.
- `PROJECT_HANDOFF.md` — full product requirements, architecture, data contract, feature map, known gaps, and instructions for another AI/developer.

## Web app: local run

Install Node.js 20+ and npm, then from the project root:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Android app: open in Android Studio

1. Open the `android/` folder (not the web project root) in Android Studio.
2. Use JDK 17.
3. Allow Gradle sync and Android SDK installation (compile SDK 35).
4. Set the production API endpoint in `android/app/build.gradle.kts`, replacing `https://YOUR-HI360-DOMAIN/api/catalogue` with the deployed HTTPS endpoint.
5. Build using **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

The Android source is a basic playback/catalogue foundation. Background playback, complete queue/session handling, secure offline downloads, lyrics UI, video playback and hardware-specific bit-perfect output still require implementation and testing.

## Deltabase configuration

For Vercel or Netlify, configure these **server-side environment variables**:

- `DELTABASE_SCRIPT_URL` — deployed Apps Script `/exec` URL.
- `DELTABASE_TOKEN` — secret token accepted by the Apps Script.

Never put the token in frontend variables such as `VITE_*`, commit it, or hard-code it into the Android application. Rotate any token previously exposed in screenshots or source. The Apps Script request/response contract must be verified against the actual deployed script.

## Do not mistake this snapshot for a release

The existing Android implementation pauses playback when the Activity stops and releases the player with the Activity; it does not yet implement a proper persistent MediaSessionService. The web downloads tab is a placeholder. The quality selector changes media source but does not guarantee gapless/seamless transitions. See `PROJECT_HANDOFF.md` for the detailed acceptance checklist.
