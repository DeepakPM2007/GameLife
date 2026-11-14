/* sw.js — Cache-first service worker for ARISE
   Bump CACHE constant whenever you deploy new code to force refresh. */

const CACHE = 'arise-v1';

/* Core files: must all cache successfully on install. */
const CORE_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/engine.js',
  './js/data.js',
  './js/ui/components.js',
  './js/ui/status.js',
  './js/ui/quests.js',
  './js/ui/train.js',
  './js/ui/study.js',
  './js/ui/spirit.js',
  './js/ui/extras.js',
  './js/ui/settings.js',
];

/* Optional: cached best-effort (PNG icons may not exist yet). */
const OPTIONAL_FILES = [
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

/* ── Install ─ precache app shell ─────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      await cache.addAll(CORE_FILES);
      // Optional files: fail silently if missing
      await Promise.allSettled(
        OPTIONAL_FILES.map(url =>
          fetch(url).then(res => { if (res.ok) cache.put(url, res); })
                   .catch(() => { /* ignore */ })
        )
      );
    })
  );
  self.skipWaiting(); // activate immediately
});

/* ── Activate ─ delete stale caches ──────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of all open tabs
});

/* ── Fetch ─ cache-first, network fallback ────────────────────── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return; // skip non-GET

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached; // serve from cache

      // Not in cache: fetch from network, then cache fresh copy
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(event.request, clone));
        return response;
      });
    }).catch(() => {
      // Completely offline — serve index.html for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
