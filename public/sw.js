const CACHE_NAME = 'aetherlearn-offline-v1';
const CORE_ASSETS = ['/', '/dashboard', '/offline', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/offline')))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'AETHER_NOTIFY') return;
  const { title, body, url } = event.data;
  event.waitUntil(
    self.registration.showNotification(title || 'AetherLearn reminder', {
      body,
      data: { url: url || '/study-plan' },
      icon: '/icon.svg',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/study-plan';
  event.waitUntil(self.clients.openWindow(url));
});
