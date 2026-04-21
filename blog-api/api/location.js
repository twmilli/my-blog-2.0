import { kv } from "@vercel/kv";

const KV_KEY = "location:latest";
// ~1km precision at mid-latitudes - we only display city-level anyway.
const COORD_PRECISION = 2;

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

function round(n, digits) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

async function reverseGeocode(lat, lng) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const neighborhood =
      data.locality ||
      data.localityInfo?.administrative?.find((a) => a.order >= 6)?.name ||
      null;
    const city =
      data.city ||
      data.localityInfo?.administrative?.find(
        (a) => a.adminLevel === 5 || a.adminLevel === 6,
      )?.name ||
      null;
    const region = data.principalSubdivision || null;
    const country = data.countryName || null;

    let label;
    if (neighborhood && city && neighborhood !== city) {
      label = `${neighborhood}, ${city}`;
    } else if (city && region && country === "United States") {
      label = `${city}, ${region}`;
    } else if (city && country) {
      label = `${city}, ${country}`;
    } else {
      label = city || region || country || null;
    }

    return { label, neighborhood, city, region, country };
  } catch (_err) {
    return null;
  }
}

function pickNewest(locations) {
  if (!Array.isArray(locations) || locations.length === 0) return null;
  let best = null;
  let bestTs = -Infinity;
  for (const loc of locations) {
    const ts = Date.parse(loc?.properties?.timestamp || "");
    if (!Number.isFinite(ts)) continue;
    if (ts > bestTs) {
      bestTs = ts;
      best = loc;
    }
  }
  return best || locations[locations.length - 1];
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    const record = await kv.get(KV_KEY);
    if (!record) {
      res.setHeader("Cache-Control", "public, max-age=30");
      res.status(200).json({ label: null, timestamp: null, receivedAt: null });
      return;
    }

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
    res.status(200).json({
      label: record.label,
      timestamp: record.timestamp,
      receivedAt: record.receivedAt,
    });
    return;
  }

  if (req.method === "POST") {
    const auth = req.headers.authorization || "";
    const expected = `Bearer ${process.env.LOCATION_INGEST_TOKEN || ""}`;
    if (!process.env.LOCATION_INGEST_TOKEN || auth !== expected) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const body = req.body || {};
    const newest = pickNewest(body.locations);
    if (!newest) {
      res
        .status(200)
        .json({ result: "ok", stored: false, reason: "no locations" });
      return;
    }

    const coords = newest.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      res.status(400).json({ error: "invalid coordinates" });
      return;
    }

    const [lng, lat] = coords;
    const timestamp =
      newest.properties?.timestamp || new Date().toISOString();
    const geo = await reverseGeocode(lat, lng);

    const record = {
      lat: round(lat, COORD_PRECISION),
      lng: round(lng, COORD_PRECISION),
      label: geo?.label || null,
      neighborhood: geo?.neighborhood || null,
      city: geo?.city || null,
      region: geo?.region || null,
      country: geo?.country || null,
      timestamp,
      receivedAt: new Date().toISOString(),
    };

    await kv.set(KV_KEY, record);
    res.status(200).json({ result: "ok", stored: true });
    return;
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  res.status(405).json({ error: "method not allowed" });
}
