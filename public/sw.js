/* Localdropshippinggh service worker.
 * - Static build files and photos: cached after first use, so repeat visits are fast on slow networks.
 * - Pages: always from the network (never cached, so signed-in pages and prices are never stale or shared);
 *   only when offline do we show a small "you're offline" page.
 * - API, auth and Supabase requests are never touched. */
const STATIC = 'lds-static-v1';
const IMAGES = 'lds-images-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, IMAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
    cache.put(request, res.clone());
    if (maxEntries) {
      const keys = await cache.keys();
      if (keys.length > maxEntries) await cache.delete(keys[0]);
    }
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return;
    if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
      event.respondWith(cacheFirst(req, STATIC));
      return;
    }
    if (req.mode === 'navigate') {
      event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    }
    return;
  }

  // Product photos (uploads and stock photos). Everything else cross-origin goes straight to the network.
  if (req.destination === 'image' && (url.pathname.includes('/storage/v1/object/public/product-images/') || url.hostname === 'images.unsplash.com')) {
    event.respondWith(cacheFirst(req, IMAGES, 150).catch(() => fetch(req)));
  }
});
