/**
 * Hospital KPI Monitor — Service Worker
 * Enables full offline support via Cache-First strategy.
 * Update CACHE_VERSION when deploying new app versions.
 */

const CACHE_VERSION  = 'kpi-monitor-v1.0.0';
const STATIC_CACHE   = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE  = `${CACHE_VERSION}-dynamic`;

/* ── Files to pre-cache on install ───────────────────── */
const PRECACHE_URLS = [
  './hospital-kpi-monitor.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Google Fonts (cached on first fetch, listed here for clarity)
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap'
];

/* ── Install: pre-cache all static assets ─────────────── */
self.addEventListener('install', event => {
  console.log('[SW] Installing…');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

/* ── Activate: purge old caches ───────────────────────── */
self.addEventListener('activate', event => {
  console.log('[SW] Activating…');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // Take control of all pages
  );
});

/* ── Fetch: Cache-First with Network Fallback ─────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http(s) requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Strategy: Cache First → Network → Fallback
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Serve from cache, refresh in background (Stale-While-Revalidate)
        refreshCache(request);
        return cachedResponse;
      }

      // Not in cache — fetch from network and cache dynamically
      return fetch(request)
        .then(networkResponse => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type !== 'opaque' // Don't cache opaque responses blindly
          ) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback: return the main app HTML for navigation requests
          if (request.destination === 'document') {
            return caches.match('./hospital-kpi-monitor.html');
          }
          // For other assets, return a simple offline response
          return new Response(
            JSON.stringify({ error: 'offline', message: 'No network connection.' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        });
    })
  );
});

/* ── Background cache refresh (Stale-While-Revalidate) ── */
function refreshCache(request) {
  fetch(request)
    .then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const cacheName = PRECACHE_URLS.some(u => request.url.includes(u.replace('./', '')))
          ? STATIC_CACHE
          : DYNAMIC_CACHE;
        caches.open(cacheName).then(cache => {
          cache.put(request, networkResponse);
        });
      }
    })
    .catch(() => { /* Silently fail — cached version is still served */ });
}

/* ── Push Notifications (future use) ─────────────────── */
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'KPI Monitor', {
    body:  data.body  || 'You have a new KPI alert.',
    icon:  './icons/icon-192.png',
    badge: './icons/icon-96.png',
    data:  { url: data.url || './' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './')
  );
});
