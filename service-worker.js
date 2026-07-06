const CACHE_NAME = 'bwpl-mis-cache-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for live data (Firebase/Sheets), cache-first for app shell files
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for the app shell; let everything else
  // (Firebase auth, Google Sheets API, fonts, CDN libs) go straight to the network.
  const isSameOrigin = url.origin === self.location.origin;
  const isAppShellFile = APP_SHELL.some((f) => url.pathname.endsWith(f.replace('./', '')));

  if (event.request.method !== 'GET') return;

  if (isSameOrigin && isAppShellFile) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((res) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
  // else: default browser behavior (network), so live data is never stale
});
