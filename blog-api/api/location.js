import { kv } from "@vercel/kv";

const KV_KEY = "location:latest";
// Public on GET; 5 dp ≈ 1.1 m latitude (~3.5 m longitude at 37°N).
const COORD_PRECISION = 5;

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

function round(n, digits) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function pickCityFromBigDataCloud(data) {
  if (data.city) return data.city;
  const admins = data.localityInfo?.administrative;
  if (!Array.isArray(admins)) return null;
  const byLevel = (lvl) => admins.find((a) => a.adminLevel === lvl)?.name;
  return byLevel(6) || byLevel(8) || byLevel(5) || null;
}

function isUnitedStates(data) {
  if (data.countryCode === "US") return true;
  const n = data.countryName || "";
  return /^United States/i.test(n);
}

function placeFromBigDataCloud(data) {
  const city = pickCityFromBigDataCloud(data);
  const region = data.principalSubdivision || null;
  const country = data.countryName || null;

  if (city && region && isUnitedStates(data)) {
    return `${city}, ${region}`;
  }
  if (city && country) {
    return `${city}, ${country}`;
  }
  return city || region || country || null;
}

async function reverseGeocodeBigDataCloud(lat, lng) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  const place = placeFromBigDataCloud(data);
  return place ? { place } : null;
}

/** Nominatim when BigDataCloud is empty or unreachable (usage policy: identifiable UA). */
async function reverseGeocodeNominatim(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TaylorBlogLocationAPI/1.0 (personal blog; reverse geocode for city label)",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const addr = data.address || {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.hamlet ||
    addr.county ||
    null;
  const state = addr.state || null;
  const countryCode = String(addr.country_code || "").toUpperCase();

  if (countryCode === "US" && city && state) {
    return { place: `${city}, ${state}` };
  }
  if (city && addr.country) {
    return { place: `${city}, ${addr.country}` };
  }
  if (data.display_name && typeof data.display_name === "string") {
    const parts = data.display_name.split(",").map((s) => s.trim());
    if (parts.length >= 2) {
      return { place: `${parts[0]}, ${parts[1]}` };
    }
  }
  return null;
}

async function reverseGeocode(lat, lng) {
  try {
    const primary = await reverseGeocodeBigDataCloud(lat, lng);
    if (primary?.place) return primary;
  } catch (_err) {
    // fall through to OSM
  }
  try {
    return await reverseGeocodeNominatim(lat, lng);
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

const emptyGetPayload = {
  place: null,
  lat: null,
  lng: null,
  timestamp: null,
  receivedAt: null,
};

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
      res.status(200).json(emptyGetPayload);
      return;
    }

    let place = record.place ?? null;
    const lat = record.lat ?? null;
    const lng = record.lng ?? null;
    if (
      (!place || typeof place !== "string") &&
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      const geo = await reverseGeocode(lat, lng);
      if (geo?.place) {
        place = geo.place;
        const updated = { ...record, place };
        try {
          await kv.set(KV_KEY, updated);
        } catch (_err) {
          // still return resolved place for this response
        }
      }
    }

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
    res.status(200).json({
      place: place ?? null,
      lat,
      lng,
      timestamp: record.timestamp ?? null,
      receivedAt: record.receivedAt ?? null,
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
      place: geo?.place ?? null,
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
