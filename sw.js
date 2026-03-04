const CACHE_NAME = 'hospital-kpi-v5';
const ASSETS = [
  '/hospital-kpi-monitor/',
  '/hospital-kpi-monitor/index.html',
  '/hospital-kpi-monitor/manifest.json',
  '/hospital-kpi-monitor/icon-48.png',
  '/hospital-kpi-monitor/icon-72.png',
  '/hospital-kpi-monitor/icon-96.png',
  '/hospital-kpi-monitor/icon-144.png',
  '/hospital-kpi-monitor/icon-192.png',
  '/hospital-kpi-monitor/icon-512.png',
  '/hospital-kpi-monitor/hospital-kpi-guide.pdf',
];

// Install — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache first, fallback to network
self.addEventListener('fetch', e => {
  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache valid responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => {
        // Offline fallback — return cached index
        if (e.request.destination === 'document') {
          return caches.match('/hospital-kpi-monitor/');
        }
      });
    })
  );
});
