// The service worker that lets the installed hub and every game play offline. `scripts/pwa.ts`
// copies it into the build as sw.js, with VERSION and FILES filled in: every file of the build with
// a hash of its content, so a new deploy brings a new version, which caches the new build and drops
// the old one. An update downloads only the files whose content changed and copies the rest from
// the cache of the version before, so it costs phones little data.
const VERSION = '__VERSION__';
const FILES = __FILES__;
// Other sites of the same owner share the origin, so only this hub's caches are ever touched.
const PREFIX = 'game-proto-';
const CACHE = PREFIX + VERSION;
// Where each cache keeps the FILES it was filled from, for the next version to compare against.
const INDEX = './__files__.json';

// The hub's Updates setting, which the pages copy here (`shared/install.ts`): `auto`, `wifi` or
// `off`, and an `update-now` entry while Update now lets one update through whatever it says.
const UPDATES_CACHE = 'game-proto.updates';

self.addEventListener('install', (event) => {
  event.waitUntil(fill().then(() => self.skipWaiting()));
});

/**
 * Whether a new version may download now. With updates held back (Off, or Wi-Fi only on mobile
 * data or Data Saver, which only Android browsers built on Chrome report), the install fails on
 * purpose: the version in place stays, and the browser tries again on a later visit.
 */
async function updatesAllowed() {
  const settings = await caches.open(UPDATES_CACHE);
  if (await settings.match('./update-now')) return true;
  const mode = (await (await settings.match('./updates'))?.text()) ?? 'wifi';
  if (mode === 'off') return false;
  const connection = self.navigator.connection;
  return mode !== 'wifi' || !connection || (connection.type !== 'cellular' && !connection.saveData);
}

/** Fills this version's cache, reusing every file an older cache holds with the same content. */
async function fill() {
  const older = await olderCaches();
  // The first install always goes ahead; only updates are held back.
  if (older.length && !(await updatesAllowed())) throw new Error('Updates are held back by the Updates setting');
  const cache = await caches.open(CACHE);
  await Promise.all(
    Object.entries(FILES).map(async ([path, hash]) => {
      for (const old of older) {
        const kept = old.files[path] === hash && (await old.cache.match(path));
        if (kept) return cache.put(path, kept);
      }
      // A file that failed to download fails the install, so the old version stays until next time.
      const response = await fetch(path, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      await cache.put(path, response);
    }),
  );
  await cache.put(INDEX, new Response(JSON.stringify(FILES)));
}

/** The caches of earlier versions, with the files each was filled from. */
async function olderCaches() {
  const names = (await caches.keys()).filter((k) => k.startsWith(PREFIX) && k !== CACHE);
  const found = await Promise.all(
    names.map(async (name) => {
      const cache = await caches.open(name);
      const index = await cache.match(INDEX);
      return index ? { cache, files: await index.json() } : null;
    }),
  );
  return found.filter(Boolean);
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Pages come from the network while online, so a deploy shows up at once, and from the cache
// offline or while updates are held back. Everything else (scripts, images) has a hashed name, so the cached copy is always right.
// Requests to other sites, like the play counter, are left to the browser.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  if (request.mode === 'navigate') {
    // While updates are held back, pages come from the cache too, since a newer page from the
    // network would download the newer files it uses.
    event.respondWith(
      updatesAllowed().then((allowed) =>
        allowed
          ? fetch(request).catch(() => cached(request).then((r) => r ?? Response.error()))
          : cached(request).then((r) => r ?? fetch(request)),
      ),
    );
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
