/**
 * Storage service — single authoritative module for all localStorage I/O.
 *
 * Provides two distinct interfaces:
 *   1. Generic TTL cache  (saveToCache / getFromCache / clearCache)
 *   2. Favorites store    (toggleFavoriteArtist / getFavorites / isFavorite)
 *
 * All localStorage access in the app goes through here. No other module
 * reads or writes localStorage directly.
 *
 * IndexedDB upgrade path:
 *   When data volumes outgrow localStorage (5 MB limit), swap the
 *   _read() / _write() / _remove() primitives below for IndexedDB calls.
 *   The public interface — saveToCache, getFavorites, etc. — stays identical.
 */

const PREFIX   = 'velvet_';
const FAV_KEY  = `${PREFIX}favorites`;

// ── Storage primitives (swap these for IndexedDB later) ──────────────────────

function _write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function _read(key) {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

function _remove(key) {
  localStorage.removeItem(key);
}

// ── Error handling wrapper ───────────────────────────────────────────────────

function _safeWrite(key, value, context) {
  try {
    _write(key, value);
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.warn(`[Storage] Quota exceeded — write skipped (${context})`);
    } else {
      console.warn(`[Storage] Write failed (${context}):`, err);
    }
  }
}

function _safeRead(key, context) {
  try {
    return _read(key);
  } catch (err) {
    console.warn(`[Storage] Read failed (${context}):`, err);
    return null;
  }
}

// ── Generic TTL cache ────────────────────────────────────────────────────────

/**
 * Persist data under `key` with an expiry timestamp.
 *
 * @template T
 * @param {string} key
 * @param {T} data
 * @param {number} ttlInMinutes
 */
export function saveToCache(key, data, ttlInMinutes) {
  _safeWrite(
    PREFIX + key,
    { data, expiresAt: Date.now() + ttlInMinutes * 60 * 1000 },
    key,
  );
}

/**
 * Retrieve cached data. Returns `null` on miss or expiry.
 *
 * @template T
 * @param {string} key
 * @returns {T|null}
 */
export function getFromCache(key) {
  const entry = _safeRead(PREFIX + key, key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _remove(PREFIX + key);
    return null;
  }
  return entry.data;
}

/**
 * Evict one cache entry, or all cache entries if `key` is omitted.
 * Does not touch the favorites store.
 *
 * @param {string} [key]
 */
export function clearCache(key) {
  try {
    if (key) {
      _remove(PREFIX + key);
      return;
    }
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX) && k !== FAV_KEY)
      .forEach(k => _remove(k));
  } catch (err) {
    console.warn('[Storage] clearCache failed:', err);
  }
}

// ── Favorites store ──────────────────────────────────────────────────────────

/**
 * @returns {import('./discoveryService.js').Artist[]}
 */
export function getFavorites() {
  return _safeRead(FAV_KEY, 'favorites') ?? [];
}

/**
 * Saves the artist if not already a favorite; removes it if it is.
 * Returns the updated favorites list.
 *
 * @param {import('./discoveryService.js').Artist} artist
 * @returns {import('./discoveryService.js').Artist[]}
 */
export function toggleFavoriteArtist(artist) {
  const current = getFavorites();
  const updated = current.some(a => a.id === artist.id)
    ? current.filter(a => a.id !== artist.id)
    : [...current, artist];
  _safeWrite(FAV_KEY, updated, 'favorites');
  return updated;
}

/**
 * @param {string} artistId
 * @returns {boolean}
 */
export function isFavorite(artistId) {
  return getFavorites().some(a => a.id === artistId);
}
