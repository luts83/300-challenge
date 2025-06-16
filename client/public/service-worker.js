const CACHE_NAME = 'dwriting-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon/android-icon-192x192.png',
  '/favicon/android-icon-144x144.png',
  '/favicon/apple-icon-180x180.png',
];

// 캐시 정리 함수
const clearOldCaches = async () => {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
  );
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clearOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  // 세 개의 도메인 모두 처리
  if (
    !event.request.url.includes('dwriting.ai') &&
    !event.request.url.includes('dwriting.com') &&
    !event.request.url.includes('edu-ocean.com')
  ) {
    return;
  }

  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // HTML 요청은 Network First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 정적 리소스는 Cache First
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return (
        cachedResponse ||
        fetch(event.request).then(response => {
          // 응답 실패했거나 content-type 없음 → 캐시 안 함
          if (!response || !response.ok || !response.headers) {
            return response;
          }

          const contentType = response.headers.get('content-type') || '';
          const isCss = event.request.url.endsWith('.css');
          const isJs = event.request.url.endsWith('.js');

          if (
            (isCss && !contentType.includes('text/css')) ||
            (isJs && !contentType.includes('application/javascript'))
          ) {
            console.warn('Skipping cache: Invalid MIME', event.request.url);
            return response;
          }

          // 캐시에 저장
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
      );
    })
  );
});
