# Deploy Hi360

## Vercel
Import the repository root. Add server environment variables `DELTABASE_SCRIPT_URL` and `DELTABASE_TOKEN`. Deploy; `/api/catalogue` is served by the serverless function.

## Netlify
Build command: `npm run build`. Publish directory: `dist`. Add the same environment variables. `netlify.toml` routes `/api/catalogue` to the Netlify function.

## Security
Rotate the Deltabase token previously exposed in screenshots/code. Keep the new token only in hosting environment settings. Never put it in `VITE_` variables or public source.

## Data contract
Apps Script returns `{ ok, tracks, artists }`. Tracks are 18-column string arrays. Artists are 3-column arrays. Albums are derived from track rows because `readAll()` does not return the Albums tab. Verify this contract against the deployed script before relying on it.
