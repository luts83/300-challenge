const CACHE_NAME = 'dwriting-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon/android-icon-192x192.png',
  '/favicon/android-icon-144x144.png',
  '/favicon/apple-icon-180x180.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
