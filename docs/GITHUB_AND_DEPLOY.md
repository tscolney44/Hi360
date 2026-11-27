# Put Hi360 on GitHub, deploy the web app, build the APK

## 1. Upload to GitHub
Use git or GitHub Desktop (browser drag-and-drop often skips hidden folders like `.github`):
```bash
cd Hi360-project
git init -b main && git add -A && git commit -m "Hi360"
git remote add origin https://github.com/<you>/Hi360.git
git push -u origin main
```
Create the repo **private**. Check that `.env` is not committed (it is git-ignored). After the first `npm install`, commit the generated `package-lock.json`.

## 2. Deploy the web app on Vercel
1. vercel.com → **Add New → Project** → import the repo (framework auto-detects as Vite).
2. Add **Environment Variables**: `DELTABASE_SCRIPT_URL` (your Apps Script `/exec` URL) and `DELTABASE_TOKEN` (a *new* secret). Never prefix them with `VITE_`.
3. Deploy. Every push to `main` redeploys automatically.
4. Test `https://<your-site>.vercel.app/api/catalogue` — it should return `{"ok":true,"tracks":[...]}`. If it says "not configured", the variables are missing; redeploy after adding them.

(Netlify also works: `netlify.toml` is included.)

## 3. Build the Android APK on GitHub
1. Repo → **Settings → Secrets and variables → Actions → Variables** → add `HI360_API_URL` = `https://<your-site>.vercel.app/api/catalogue`.
2. **Actions → Android APK → Run workflow** (it also runs on every push). Download **Hi360-debug-apk** from the run's Artifacts and install it on your phone (allow installs from unknown sources). Debug APKs are fine for testing.

### Signed release APK (optional)
Create a keystore once (keep it safe — losing it means you can't update the app):
```bash
keytool -genkeypair -v -keystore hi360.jks -alias hi360 -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 hi360.jks   # macOS: base64 -i hi360.jks
```
Add repo **Secrets**: `KEYSTORE_BASE64` (that output), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (`hi360`), `KEY_PASSWORD`. Then push a tag: `git tag v0.2.0 && git push --tags` — the signed APK is attached to a GitHub Release.

## 4. Checks
`Web CI` runs tests + build on every push/PR. `Android APK` runs the unit tests and builds. Nothing here has been run by the author yet — if the first run fails, open the failed step's log and send it over.
