// Service Worker per dmto.me PWA
const CACHE_NAME = 'dmto-me-v1';
const urlsToCache = [
  '/',
  '/app/',
  '/app/index.html',
  '/app/chat.html',
  '/app/message.html',
  '/app/temp-chat.html',
  '/app/profile.html',
  '/app/edit-profile.html',
  '/app/privacy-policy.html',
  '/app/terms-conditions.html',
  '/app/style.css',
  '/app/script.js',
  '/app/chat.js',
  '/app/message.js',
  '/app/temp-chat.js',
  '/app/profile.js',
  '/app/edit-profile.js',
  '/app/manifest.json'
];

// Installazione del service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Attivazione del service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Gestione delle richieste fetch
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Ritorna dalla cache se disponibile
        if (response) {
          return response;
        }

        // Altrimenti fetch dalla rete
        return fetch(event.request).then(response => {
          // Non cachare risposte non valide
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clona la risposta per poterla usare sia per il browser che per la cache
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Se offline e non in cache, mostra pagina offline
          if (event.request.destination === 'document') {
            return caches.match('/app/index.html');
          }
        });
      })
  );
});

// Gestione delle notifiche push (per future implementazioni)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/app/icon-192x192.png',
      badge: '/app/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: data.data
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Gestione click sulle notifiche
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/app/chat.html')
  );
});