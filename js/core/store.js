/**
 * Minimal observable state store.
 * Components subscribe to state changes; services write via setState().
 *
 * Offline-first: the `saved` collection is persisted to localStorage on every
 * write and rehydrated on startup, so it survives page refreshes and offline
 * sessions without a server round-trip.
 *
 * @typedef {Object} AppState
 * @property {import('../services/discoveryService.js').Artist[]} saved
 * @property {import('../services/discoveryService.js').Artist[]} feed
 * @property {import('../services/discoveryService.js').Artist[]} searchResults
 * @property {string|null} activeGenre
 */

const SAVED_KEY = 'velvet_saved';

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY)) ?? []; } catch (_) { return []; }
}

/** @type {AppState} */
const state = {
  saved: loadSaved(),
  feed: [],
  searchResults: [],
  activeGenre: null,
};

/** @type {Set<function(AppState): void>} */
const listeners = new Set();

/** @returns {AppState} */
export function getState() {
  return { ...state };
}

/**
 * @param {Partial<AppState>} patch
 */
export function setState(patch) {
  Object.assign(state, patch);
  if (patch.saved !== undefined) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(state.saved)); } catch (_) {}
  }
  listeners.forEach(fn => fn({ ...state }));
}

/**
 * @param {function(AppState): void} fn
 * @returns {function(): void} unsubscribe
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
