const CACHE_NAME = 'inventory-ai-v1';
const ASSETS = [
  './index.html',
  './css/global.css',
  './js/store.js',
  './js/router.js',
  './js/components.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      // Offline-first PWA caching
      return res || fetch(e.request);
    })
  );
});
