import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
].join(" ");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equals = trimmed.indexOf("=");
    if (equals === -1) continue;

    const key = trimmed.slice(0, equals).trim();
    if (!key || process.env[key]) continue;

    let value = trimmed.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function openBrowser(url) {
  if (process.env.NO_OPEN === "1") return;

  try {
    if (process.platform === "darwin") {
      execFileSync("open", [url], { stdio: "ignore" });
      return;
    }

    if (process.platform === "win32") {
      execFileSync("cmd", ["/c", "start", "", url], { stdio: "ignore" });
      return;
    }

    execFileSync("xdg-open", [url], { stdio: "ignore" });
  } catch (_err) {
    // Ignore open failures and fall back to printing the URL.
  }
}

function basicAuth(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

loadEnvFile(path.join(ROOT_DIR, ".env.local"));
loadEnvFile(path.join(ROOT_DIR, ".env"));

const clientId = process.env.SPOTIFY_CLIENT_ID || "";
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
const redirectUri =
  process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:8888/callback";

if (!clientId || !clientSecret) {
  console.error(
    "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET. Set them in the environment or blog-api/.env.local.",
  );
  process.exit(1);
}

const callbackUrl = new URL(redirectUri);
const state = crypto.randomBytes(16).toString("hex");
const authorizeUrl = new URL(AUTHORIZE_URL);

authorizeUrl.searchParams.set("response_type", "code");
authorizeUrl.searchParams.set("client_id", clientId);
authorizeUrl.searchParams.set("scope", SCOPES);
authorizeUrl.searchParams.set("redirect_uri", redirectUri);
authorizeUrl.searchParams.set("state", state);
authorizeUrl.searchParams.set("show_dialog", "true");

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", redirectUri);

  if (requestUrl.pathname !== callbackUrl.pathname) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found.");
    return;
  }

  const error = requestUrl.searchParams.get("error");
  if (error) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Spotify authorization failed</h1><p>${error}</p>`);
    console.error(`Spotify authorization failed: ${error}`);
    server.close();
    return;
  }

  const returnedState = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");

  if (!code || returnedState !== state) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Invalid callback</h1><p>State or code was missing.</p>");
    console.error("Invalid Spotify callback. State or code was missing.");
    server.close();
    return;
  }

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(JSON.stringify(data));
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h1>Spotify authorization complete</h1><p>You can close this tab and copy the refresh token from the terminal.</p>",
    );

    console.log("\nSpotify refresh token acquired.\n");
    console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token || ""}`);
    console.log(`SPOTIFY_CLIENT_ID=${clientId}`);
    console.log(`SPOTIFY_REDIRECT_URI=${redirectUri}\n`);

    if (!data.refresh_token) {
      console.warn(
        "Spotify did not return a refresh token. Remove this app from your Spotify account permissions and try again.",
      );
    }
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Token exchange failed</h1><p>Check the terminal for details.</p>");
    console.error("Spotify token exchange failed.");
    console.error(err instanceof Error ? err.message : String(err));
  } finally {
    setTimeout(() => {
      server.close();
    }, 100);
  }
});

server.listen(Number(callbackUrl.port || 80), callbackUrl.hostname, () => {
  console.log(`Waiting for Spotify callback on ${redirectUri}`);
  console.log(`Authorize URL:\n${authorizeUrl.toString()}\n`);
  openBrowser(authorizeUrl.toString());
});
