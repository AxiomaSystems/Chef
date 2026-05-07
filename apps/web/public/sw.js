const SHELL_CACHE = 'butter-me-shell-v2';
const IMAGE_CACHE = 'butter-me-images-v2';

// On install, take control immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// On activate, delete stale caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip Next.js HMR and internal data routes
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/_next/data')
  ) return;

  // Unsplash images: cache-first (they don't change for a given URL)
  if (url.hostname === 'images.unsplash.com') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ??
            fetch(request).then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }

  // Next.js static assets (JS/CSS chunks): cache-first, they're content-hashed
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(SHELL_CACHE).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ??
            fetch(request).then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }

  // API routes: network-only (authenticated, always fresh)
  if (url.pathname.startsWith('/api/')) return;

  // External requests (fonts, etc.): network-only
  if (url.hostname !== self.location.hostname) return;

  // App pages: network-first, fall back to cache for offline
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request)),
  );
});
