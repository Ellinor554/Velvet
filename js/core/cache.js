/**
 * In-memory async cache with persistent fallback via storageService.
 *
 * Lookup order:
 *   1. In-memory Map — instant, session-scoped
 *   2. storageService (localStorage) — survives page refresh
 *   3. fetcher() — live network call
 *
 * On network failure the same order applies in reverse:
 * stale memory → stale localStorage → re-throw.
 *
 * PWA upgrade path:
 *   When a caching service worker is active, its CacheStorage responses
 *   will fulfil fetch() before it rejects, so offline resilience improves
 *   automatically without changes here.
 */

import { saveToCache, getFromCache } from '../services/storageService.js';

/** @type {Map<string, {value: any, fetchedAt: number}>} */
const mem = new Map();

/**
 * @template T
 * @param {string}            key
 * @param {() => Promise<T>}  fetcher
 * @param {number}            [ttlMs=600000]  10 minutes
 * @returns {Promise<T>}
 */
export async function get(key, fetcher, ttlMs = 10 * 60 * 1000) {
  const now = Date.now();
  const hit = mem.get(key);

  if (hit && now - hit.fetchedAt < ttlMs) return hit.value;

  try {
    const value = await fetcher();
    mem.set(key, { value, fetchedAt: now });
    saveToCache(key, value, ttlMs / 60_000);
    return value;
  } catch (err) {
    if (hit) return hit.value;
    const stored = getFromCache(key);
    if (stored !== null) {
      mem.set(key, { value: stored, fetchedAt: now });
      return stored;
    }
    throw err;
  }
}

/**
 * @param {string} [key]  Omit to clear all in-memory entries.
 */
export function invalidate(key) {
  if (key) { mem.delete(key); return; }
  mem.clear();
}
