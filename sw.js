const CACHE_NAME = 'hospital-kpi-v3';
const ASSETS = [
  '/hospital-kpi-monitor/',
  '/hospital-kpi-monitor/index.html',
  '/hospital-kpi-monitor/manifest.json',
  '/hospital-kpi-monitor/hospital-kpi-guide.pdf',
  '/hospital-kpi-monitor/icon-192.png',
  '/hospital-kpi-monitor/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
