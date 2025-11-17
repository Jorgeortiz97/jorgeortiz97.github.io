// Service Worker for Gremios PWA
const CACHE_NAME = 'gremios-v23';
const urlsToCache = [
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/cards.js',
  '/js/characters.js',
  '/js/player.js',
  '/js/events.js',
  '/js/ai.js',
  '/js/ui.js',
  '/js/game.js',
  '/js/main.js',
  '/manifest.json',
  // PWA Icons
  '/resources/icons/icon-192x192.png',
  '/resources/icons/icon-512x512.png',
  // PWA Screenshots
  '/resources/screenshots/1920x1080_desktop_03_game_board.png',
  '/resources/screenshots/portrait_game_board.png',
  '/resources/other/gold.png',
  '/resources/other/bronze.png',
  '/resources/other/silver.png',
  '/resources/other/Badge.png',
  '/resources/other/Land.png',
  '/resources/other/Cultivated_Land.png',
  '/resources/other/Inn.png',
  '/resources/other/Destroyed_Inn.png',
  '/resources/other/Treasure.png',
  '/resources/other/Treasure_1VP.png',
  '/resources/other/Treasure_2VP.png',
  '/resources/other/Wealth_3coins.png',
  '/resources/other/Wealth_4coins.png',
  '/resources/other/Event_Back.png',
  // Character images
  '/resources/characters/Archbishop.png',
  '/resources/characters/Artisan.png',
  '/resources/characters/Governor.png',
  '/resources/characters/Healer.png',
  '/resources/characters/Innkeeper.png',
  '/resources/characters/Master_Builder.png',
  '/resources/characters/Mercenary.png',
  '/resources/characters/Merchant.png',
  '/resources/characters/Peasant.png',
  '/resources/characters/Pirate.png',
  '/resources/characters/Shopkeeper.png',
  '/resources/characters/Stowaway.png'
];

// Install event - cache files
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(error => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the new resource
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // If both cache and network fail, return offline page
          console.log('[Service Worker] Fetch failed for:', event.request.url);
          // You could return a custom offline page here
        });
      })
  );
});
