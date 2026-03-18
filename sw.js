// ── TEXT CLEANER — Service Worker ──
// Caches all app files so it works 100% offline after first load.

const CACHE_NAME = 'text-cleaner-v1';

// Files to cache on install
const PRECACHE = [
  './index.html',
  './manifest.json'
  // Note: Google Fonts are fetched from network when online;
  // the app falls back to system fonts (SF Mono / monospace) when offline — works fine.
];

// ── INSTALL: cache core files ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  // Activate immediately without waiting for old SW to die
  self.skipWaiting();
});

// ── ACTIVATE: clean up old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first for app files, network-first for fonts ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Fonts: try network, fall back to cache
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App files: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        // Cache successful responses for app origin
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
