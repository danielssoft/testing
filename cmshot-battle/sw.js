/**
 * Offline cache for CMSHOT BATTLE.
 *
 * The arenas are not downloaded — they are generated in code and ship inside
 * the JS bundle — so there is nothing map-shaped to cache. What is worth
 * caching is the bundle itself, which is what this does: after one visit the
 * game loads from disk, and offline play works with no network at all.
 *
 * Assets are content-hashed by the build, so a cached file is never stale: a
 * new build simply requests new names. Anything live — the room list, the
 * health check, the WebSocket — is never cached.
 */
const CACHE = 'cmshot-v1';

// Only these are worth keeping. Everything else goes straight to the network.
const CACHEABLE = /\.(?:js|css|html|svg|png|woff2?)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/', '/index.html'])).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Live endpoints must never be served from a cache.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) return;

  const isDocument = req.mode === 'navigate';
  if (!isDocument && !CACHEABLE.test(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit && !isDocument) return hit;

    try {
      const res = await fetch(req);
      // Opaque and error responses are not worth keeping.
      if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => undefined);
      return res;
    } catch (err) {
      // Offline: the cached copy is the whole point.
      if (hit) return hit;
      if (isDocument) {
        const shell = await cache.match('/index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
