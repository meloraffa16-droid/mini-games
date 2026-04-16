const CACHE_NAME = 'minigames-v2.1';

const ASSETS_TO_CACHE = [
  '/mini-games/',
  '/mini-games/index.html',
  '/mini-games/styles/main.css',
  '/mini-games/src/main.js',
  '/mini-games/src/changelog.js',
  '/mini-games/src/engine/GameBase.js',
  '/mini-games/src/games/game-a/game.js',
  '/mini-games/src/games/game-a/index.html',
  '/mini-games/src/games/game-b/game.js',
  '/mini-games/src/games/game-b/index.html',
  '/mini-games/src/games/game-c/game.js',
  '/mini-games/src/games/game-c/index.html',
  '/mini-games/src/games/game-d/game.js',
  '/mini-games/src/games/game-d/index.html',
  '/mini-games/src/games/game-e/game.js',
  '/mini-games/src/games/game-e/index.html',
  '/mini-games/src/games/game-f/game.js',
  '/mini-games/src/games/game-f/index.html',
  '/mini-games/icons/icon.svg',
  '/mini-games/manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
