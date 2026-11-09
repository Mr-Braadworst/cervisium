const CACHE_NAME = 'cervisium-pwa-v4';
const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/icon.png',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;

  // Voor HTML en JS/TS modules altijd direct de nieuwste versie van de server ophalen
  const isCodeOrHtml =
    req.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.startsWith('/src/');

  const fetchReq = isCodeOrHtml ? new Request(req, { cache: 'no-cache' }) : req;

  event.respondWith(
    fetch(fetchReq)
      .then((networkRes) => {
        if (
          networkRes &&
          networkRes.status === 200 &&
          networkRes.type === 'basic' &&
          !url.pathname.endsWith('.webmanifest') &&
          !url.pathname.endsWith('/sw.js')
        ) {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return networkRes;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
  );
});
