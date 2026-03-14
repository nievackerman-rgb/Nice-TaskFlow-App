const CACHE_NAME = 'taskflow-v45-nlp-enhanced';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Install - cache files
self.addEventListener('install', event => {
  console.log('Service Worker installing, version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.log('Cache failed:', err))
  );
  // Force activate immediately (don't wait for old SW to stop)
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating, version:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch - NETWORK FIRST strategy (always try to get fresh content)
self.addEventListener('fetch', event => {
  // Skip non-GET requests and Firebase/external requests
  if (event.request.method !== 'GET') return;
  // Only handle http/https requests (skip chrome-extension:// and others)
  const reqUrl = new URL(event.request.url);
  if (!['http:', 'https:'].includes(reqUrl.protocol)) return;
  if (event.request.url.includes('firebaseio.com')) return;
  if (event.request.url.includes('gstatic.com')) return;
  if (event.request.url.includes('googleapis.com')) return;
  if (event.request.url.includes('cdnjs.cloudflare.com')) return;
  
  event.respondWith(
    // Try network first
    fetch(event.request)
      .then(response => {
        // Got fresh response - cache it and return
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed - try cache
        return caches.match(event.request)
          .then(cachedResponse => {
            return cachedResponse || caches.match('/index.html');
          });
      })
  );
});
