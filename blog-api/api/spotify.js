const TOKEN_URL = "https://accounts.spotify.com/api/token";
const CURRENTLY_PLAYING_URL =
  "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_URL =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function basicAuth(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

function pickImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  return images[Math.min(1, images.length - 1)]?.url || images[0]?.url || null;
}

function pickArtist(item) {
  if (Array.isArray(item?.artists) && item.artists.length > 0) {
    return item.artists.map((artist) => artist.name).filter(Boolean).join(", ");
  }
  if (item?.show?.name) return item.show.name;
  return null;
}

function pickAlbum(item) {
  return item?.album?.name || item?.show?.name || null;
}

function pickAlbumArt(item) {
  return (
    pickImage(item?.album?.images) ||
    pickImage(item?.images) ||
    pickImage(item?.show?.images)
  );
}

function toPublicPayload(item, state, playedAt = null) {
  if (!item?.name) return { state: "empty" };

  return {
    state,
    kind: item.type || "track",
    track: item.name,
    artist: pickArtist(item),
    album: pickAlbum(item),
    albumArtUrl: pickAlbumArt(item),
    spotifyUrl: item?.external_urls?.spotify || null,
    playedAt,
    isPlaying: state === "playing",
  };
}

async function refreshAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID || "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN || "";

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`token_refresh_failed:${res.status}`);
  }

  const data = await res.json();
  return data.access_token || null;
}

async function spotifyRequest(url, accessToken) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (res.status === 204) return null;
  if (!res.ok) {
    throw new Error(`spotify_request_failed:${res.status}`);
  }

  return res.json();
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const accessToken = await refreshAccessToken();
    if (!accessToken) {
      res
        .status(503)
        .json({ error: "spotify_not_configured" });
      return;
    }

    const current = await spotifyRequest(CURRENTLY_PLAYING_URL, accessToken);
    if (current?.is_playing && current.item) {
      res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30");
      res.status(200).json(toPublicPayload(current.item, "playing"));
      return;
    }

    const recent = await spotifyRequest(RECENTLY_PLAYED_URL, accessToken);
    const mostRecent = recent?.items?.[0];

    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30");
    if (mostRecent?.track) {
      res
        .status(200)
        .json(toPublicPayload(mostRecent.track, "recent", mostRecent.played_at));
      return;
    }

    res.status(200).json({ state: "empty" });
  } catch (_err) {
    res.setHeader("Cache-Control", "public, max-age=10, s-maxage=10");
    res.status(502).json({ error: "spotify_unavailable" });
  }
}
