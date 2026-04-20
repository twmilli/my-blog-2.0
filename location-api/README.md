# tay-location-api

Tiny Vercel serverless endpoint that receives iPhone location pushes from the [Overland](https://overland.p3k.io/) iOS app, reverse-geocodes them, stores the latest point in Vercel KV, and exposes a read endpoint for the blog to display a city/neighborhood label.

## Endpoints

- `POST /api/location` — Overland ingest. Requires `Authorization: Bearer $LOCATION_INGEST_TOKEN`. Body is the standard Overland payload (`{ locations: [...] }`).
- `GET /api/location` — Public read. Returns `{ label, timestamp, receivedAt }`. No raw coordinates.
- `OPTIONS /api/location` — CORS preflight.

## Env vars

| Name | Who sets it | Notes |
| --- | --- | --- |
| `LOCATION_INGEST_TOKEN` | You | Random string. Used by Overland's Authorization header. |
| `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN` | Vercel KV integration | Auto-injected when you connect a KV store. |

## Deploy

See the parent repo's setup notes or run:

```bash
npm i
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

The public `GET` response omits raw coordinates.
