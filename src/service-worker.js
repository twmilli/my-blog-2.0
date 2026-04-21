import { build, files, version } from '$service-worker';

const ASSET_CACHE = `assets-${version}`;
const OFFLINE_CACHE = `offline-${version}`;
const toCache = [...build, ...files];
const cached = new Set(toCache);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      .then((cache) => cache.addAll(toCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      for (const key of keys) {
        if (key !== ASSET_CACHE && key !== OFFLINE_CACHE) {
          await caches.delete(key);
        }
      }

      self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.headers.has('range')) return;

  const url = new URL(event.request.url);

  if (!url.protocol.startsWith('http')) return;

  if (url.hostname === self.location.hostname && url.port !== self.location.port) return;

  if (url.origin === self.location.origin && cached.has(url.pathname)) {
    event.respondWith(caches.match(event.request));
    return;
  }

  if (event.request.cache === 'only-if-cached') return;

  event.respondWith(
    caches.open(OFFLINE_CACHE).then(async (cache) => {
      try {
        const response = await fetch(event.request);

        if (url.origin === self.location.origin) {
          cache.put(event.request, response.clone());
        }

        return response;
      } catch (err) {
        const response = await cache.match(event.request);
        if (response) return response;

        throw err;
      }
    })
  );
});
