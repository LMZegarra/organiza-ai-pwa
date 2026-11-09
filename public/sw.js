/**
 * sw.js - Service Worker para OrganizaAI PWA
 * Estrategia: Network-First para navegación principal (actualizaciones inmediatas)
 * y Cache-First para recursos estáticos (offline instantáneo).
 */

const CACHE_NAME = 'organiza-ai-cache-v3.2';
const STATIC_ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icon.svg',
  'js/config.js',
  'js/icons.js',
  'js/ai-service.js',
  'js/storage-service.js',
  'js/supabase-client.js',
  'js/calendar-component.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precargando caché estático de OrganizaAI v16');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purgando caché antiguo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No interceptar peticiones a la API del servidor ni a Supabase/OpenRouter
  if (
    url.pathname.includes('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('openrouter.ai')
  ) {
    return;
  }

  // 1. Navegación (HTML principal): Network-first con fallback a caché (evita quedarse congelado en versión vieja)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match('index.html');
        })
    );
    return;
  }

  // 2. Recursos Estáticos: Cache-first con fallback a network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
