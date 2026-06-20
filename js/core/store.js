/**
 * Minimal observable state store.
 *
 * Owns in-memory UI state only. Persistence is handled entirely by
 * storageService — this module never touches localStorage directly.
 *
 * @typedef {Object} AppState
 * @property {import('../services/discoveryService.js').Artist[]} saved
 * @property {import('../services/discoveryService.js').Artist[]} feed
 * @property {import('../services/discoveryService.js').Artist[]} searchResults
 * @property {string|null} activeGenre
 */

import { getFavorites } from '../services/storageService.js';

/** @type {AppState} */
const state = {
  saved: getFavorites(),
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

/** @param {Partial<AppState>} patch */
export function setState(patch) {
  Object.assign(state, patch);
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
