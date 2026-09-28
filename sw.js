const CACHE_NAME = 'linker-v1';
const ASSETS = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com/3.4.17',
  'https://files.catbox.moe/dkajo4.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  // Only cache GET requests, ignore API calls to script.google.com
  if (e.request.method !== 'GET' || e.request.url.includes('script.google.com')) return;
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, fetchRes.clone());
          return fetchRes;
        });
      });
    })
  );
});
