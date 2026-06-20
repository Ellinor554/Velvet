/**
 * Velvet Service Worker — development-friendly passthrough.
 *
 * Current strategy: network-first, no caching.
 * Every fetch goes straight to the network so that file edits
 * are visible immediately without cache busting.
 *
 * When ready to add caching, insert a CacheStorage strategy in the
 * fetch handler below. Our app-level cache.js module uses localStorage;
 * this worker uses CacheStorage (caches.*) — they are separate but
 * complementary layers. Add the static shell to SHELL_ASSETS and
 * switch the fetch handler to cache-first or stale-while-revalidate.
 */

const VERSION = 'velvet-v1';

// Populated when moving to a caching strategy:
// const SHELL_ASSETS = ['/', '/index.html', '/css/main.css', '/js/app.js'];

self.addEventListener('install', event => {
  console.log(`[SW ${VERSION}] install`);
  // skipWaiting activates this worker immediately instead of waiting for
  // existing tabs to close — safe during development, revisit for production.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log(`[SW ${VERSION}] activate`);
  // clients.claim() lets this worker control already-open pages without a reload.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Passthrough — no interception, no caching.
  // To add offline support later, replace this with a CacheStorage strategy.
  event.respondWith(fetch(event.request));
});
