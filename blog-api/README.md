# tay-blog-api

Tiny Vercel serverless endpoints for dynamic data shown on Taylor's blog homepage.

## Endpoints

- `POST /api/location` - Overland ingest. Requires `Authorization: Bearer $LOCATION_INGEST_TOKEN`. Body is the standard Overland payload (`{ locations: [...] }`).
- `GET /api/location` - Public read. Returns `{ place, lat, lng, timestamp, receivedAt }`. Coordinates are rounded to ~1 km precision before storage and on read.
- `GET /api/spotify` - Public read. Returns a sanitized payload for the current track or most recently played track.
- `OPTIONS /api/location`
- `OPTIONS /api/spotify`

## Env vars

| Name | Who sets it | Notes |
| --- | --- | --- |
| `LOCATION_INGEST_TOKEN` | You | Random string. Used by Overland's Authorization header. |
| `SPOTIFY_CLIENT_ID` | You | Spotify app client id. |
| `SPOTIFY_CLIENT_SECRET` | You | Spotify app client secret. Store in Vercel env only. |
| `SPOTIFY_REFRESH_TOKEN` | You | Long-lived refresh token for your Spotify account. |
| `SPOTIFY_REDIRECT_URI` | You | Optional for the local helper script. Defaults to `http://127.0.0.1:8888/callback`. |
| `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN` | Vercel KV integration | Auto-injected when you connect a KV store. |

You can copy `.env.example` to `.env.local` for local helpers. Do not commit real credentials.
If your Spotify client secret has been shared anywhere outside Vercel env management, rotate it before deployment.

## Get a Spotify refresh token

Run the local helper after setting `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`:

```bash
npm install
npm run spotify:token
```

The script starts a temporary callback server on `127.0.0.1:8888`, opens the Spotify consent screen, and prints the `SPOTIFY_REFRESH_TOKEN` value you should add to Vercel.

## Deploy (Vercel)

This app is a small **Vercel** project: each file under [`api/`](api/) becomes a serverless route (`/api/location`, `/api/spotify`, etc.). Deploy from the **`blog-api` directory** (not the monorepo root), unless your Vercel project is configured with **Root Directory** set to `blog-api`.

### Prerequisites

- A [Vercel](https://vercel.com) account and the [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`, or use `npx vercel` without installing).
- **Vercel KV** attached to the project so `@vercel/kv` works for `/api/location` (create a KV store in the dashboard → **Storage** → link it to this project; Vercel injects `KV_*` variables).
- **Environment variables** set for **Production** (and **Preview** if you want previews to work): see [Env vars](#env-vars) below.

### First-time deploy

```bash
cd blog-api
npm install
npx vercel login
npx vercel link
```

`vercel link` connects this folder to a Vercel project (create a new one or pick an existing project, e.g. one already serving `tay-location-api.vercel.app`).

Then add secrets in the Vercel dashboard (**Project → Settings → Environment Variables**) or with the CLI, for example:

```bash
npx vercel env add LOCATION_INGEST_TOKEN production
```

Deploy to production:

```bash
npx vercel --prod
```

The CLI prints the production URL (for example `https://<project>.vercel.app`). Use that origin in the blog’s `CurrentLocation` / `ListeningStatus` `endpoint` props if it differs from your custom domain.

### Later deploys

From `blog-api`:

```bash
npx vercel --prod
```

For a **preview** deployment only (no production promotion):

```bash
npx vercel
```

If you change environment variables in the dashboard, trigger a **new deployment** (redeploy latest or push a commit) so running functions pick up the new values.

### Deploy from Git (optional)

In the Vercel project, connect the Git repository. If the repo root is the blog monorepo, set **Root Directory** to `blog-api` so builds only use this folder. Production branch deploys (e.g. `main`) then run `npx vercel`/`build` equivalent automatically.

### Smoke test

After deploy:

```bash
curl -sS "https://<your-deployment>.vercel.app/api/location" | head -c 400
```

You should see JSON with `place`, `lat`, `lng`, `timestamp`, and `receivedAt` (or `null` values if nothing has been posted to KV yet).

## Storage format

Single KV key `location:latest` contains the same fields returned by `GET /api/location` (rounded coordinates, city-level `place` from reverse geocode):

```json
{
  "lat": 37.76,
  "lng": -122.5,
  "place": "San Francisco, California",
  "timestamp": "2026-04-20T18:22:11.000Z",
  "receivedAt": "2026-04-20T18:22:14.112Z"
}
```

`place` is derived from city and region (US) or city and country elsewhere — not street- or neighborhood-level. Latitude and longitude are intentionally coarse (~1 km) for privacy; the blog builds an Apple Maps link from these values client-side.
