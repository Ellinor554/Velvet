/**
 * Async keyed cache with offline fallback.
 *
 * Strategy (in order):
 *   1. Return in-memory entry if still within TTL  (instant)
 *   2. Fetch fresh data, write to memory + localStorage  (online)
 *   3. On network failure, return stale memory entry if available
 *   4. On network failure, return stale localStorage entry if available
 *   5. Re-throw — caller decides how to handle a true offline+no-cache miss
 *
 * PWA integration path:
 *   When a service worker is introduced, it can intercept the underlying
 *   fetch() calls and populate CacheStorage independently. Alternatively,
 *   swap the localStorage writes below for CacheStorage.put() — the
 *   interface of this module (get / invalidate / invalidateAll) stays identical.
 */

const PREFIX = 'velvet_cache_';

/** @type {Map<string, {value: any, fetchedAt: number}>} */
const mem = new Map();

/**
 * Return a cached value for `key`, or call `fetcher` to produce one.
 *
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fetcher
 * @param {number} [ttlMs=600000]  10 minutes default
 * @returns {Promise<T>}
 */
export async function get(key, fetcher, ttlMs = 10 * 60 * 1000) {
  const now = Date.now();
  const hit = mem.get(key);

  if (hit && now - hit.fetchedAt < ttlMs) {
    return hit.value;
  }

  try {
    const value = await fetcher();
    const entry = { value, fetchedAt: now };
    mem.set(key, entry);
    try { localStorage.setItem(PREFIX + key, JSON.stringify(entry)); } catch (_) {}
    return value;
  } catch (err) {
    // Network failure — serve stale rather than crashing
    if (hit) return hit.value;

    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) {
        const entry = JSON.parse(raw);
        mem.set(key, entry);
        return entry.value;
      }
    } catch (_) {}

    throw err;
  }
}

/**
 * @param {string} key
 */
export function invalidate(key) {
  mem.delete(key);
  try { localStorage.removeItem(PREFIX + key); } catch (_) {}
}

export function invalidateAll() {
  mem.clear();
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch (_) {}
}
