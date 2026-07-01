// Jarvis PWA service worker
// Caches the app shell for fast/offline loading; never caches API calls.

const CACHE = 'jarvis-v3';
const SHELL = [
  '/jarvis-voice/',
  '/jarvis-voice/manifest.json',
  '/jarvis-voice/icons/icon-192.png',
  '/jarvis-voice/icons/icon-512.png',
  '/jarvis-voice/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept API calls — always hit the server.
  if (url.pathname.startsWith('/jarvis-voice/api/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful GET responses for shell assets.
        if (e.request.method === 'GET' && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/jarvis-voice/'));
    })
  );
});
