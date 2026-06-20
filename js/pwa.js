/**
 * PWA initialisation — service worker registration.
 *
 * Intentionally imports nothing from core/ or services/.
 * This module's only job is to register sw.js and log lifecycle events.
 * All discovery logic stays in discoveryService; all state stays in store.
 */

const SW_PATH = '/sw.js';

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported in this browser');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register(SW_PATH);

    if (reg.installing)  console.log('[PWA] Service worker installing');
    else if (reg.waiting)  console.log('[PWA] Service worker waiting to activate');
    else if (reg.active)   console.log('[PWA] Service worker active');

    reg.addEventListener('updatefound', () => {
      const next = reg.installing;
      next?.addEventListener('statechange', () => {
        console.log(`[PWA] Service worker state → ${next.state}`);
      });
    });
  } catch (err) {
    console.warn('[PWA] Registration failed:', err);
  }
}

registerServiceWorker();
