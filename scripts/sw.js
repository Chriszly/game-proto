// The service worker that lets the installed hub and every game play offline. `scripts/pwa.ts`
// copies it into the build as sw.js, with VERSION and FILES filled in: every file of the build,
// so a new deploy brings a new version, which caches the new build and drops the old one.
const VERSION = '__VERSION__';
const FILES = __FILES__;
// Other sites of the same owner share the origin, so only this hub's caches are ever touched.
const PREFIX = 'game-proto-';
const CACHE = PREFIX + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Pages come from the network while online, so a deploy shows up at once, and from the cache
// offline. Everything else (scripts, images) has a hashed name, so the cached copy is always right.
// Requests to other sites, like the play counter, are left to the browser.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => cached(request).then((r) => r ?? Response.error())));
    return;
  }
  event.respondWith(cached(request).then((r) => r ?? fetch(request)));
});

/** The cached copy of a request, ignoring its query (`?watch`, `?lang=`); a folder is its index.html. */
async function cached(request) {
  const cache = await caches.open(CACHE);
  const url = new URL(request.url);
  url.search = '';
  if (url.pathname.endsWith('/')) url.pathname += 'index.html';
  return cache.match(url.href);
}
