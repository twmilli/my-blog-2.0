# tay-blog-api

Tiny Vercel serverless endpoints for dynamic data shown on Taylor's blog homepage.

## Endpoints

- `POST /api/location` - Overland ingest. Requires `Authorization: Bearer $LOCATION_INGEST_TOKEN`. Body is the standard Overland payload (`{ locations: [...] }`).
- `GET /api/location` - Public read. Returns `{ label, timestamp, receivedAt }`. No raw coordinates.
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

## Deploy

```bash
npm install
npx vercel --prod
```

## Storage format

Single KV key `location:latest` contains:

```json
{
  "lat": 37.76,
  "lng": -122.5,
  "label": "Outer Sunset, San Francisco",
  "neighborhood": "Outer Sunset",
  "city": "San Francisco",
  "region": "California",
  "country": "United States",
  "timestamp": "2026-04-20T18:22:11.000Z",
  "receivedAt": "2026-04-20T18:22:14.112Z"
}
```

The public `GET /api/location` response omits raw coordinates.
