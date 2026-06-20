/**
 * Discovery service — the only module the UI should ever import.
 *
 * Hides: platform aggregation, deduplication, ranking, saved-state management.
 * Exposes: a clean async API over normalized Artist objects.
 *
 * @typedef {Object} Artist
 * @property {string}   id           - Unique ID, prefixed by source (sp_, sc_, bc_)
 * @property {string}   name
 * @property {string}   genre        - Human-readable genre + location label
 * @property {string}   bio
 * @property {number}   underground  - 0–100; higher = less known
 * @property {string}   icon         - Tabler icon class (e.g. 'ti-microphone-2')
 * @property {string}   bg           - CSS color for card background
 * @property {string[]} tags
 * @property {{ spotify?: {id:string,url:string}, soundcloud?: {id:string,url:string}, bandcamp?: {url:string} }} platforms
 * @property {'spotify'|'soundcloud'|'bandcamp'} source
 *
 * @typedef {Object} FeedOptions
 * @property {string|null} [genre]  - Filter to a genre tag substring
 * @property {number}      [limit]  - Max results (default 20)
 *
 * @typedef {Object} SearchOptions
 * @property {number} [limit] - Max results (default 20)
 */

import { aggregate, getFeaturedFromAll } from './platformAggregator.js';
import { getState, setState } from '../core/store.js';

/**
 * Return a ranked feed of artists, optionally filtered by genre.
 * Ranking: higher underground score → earlier in list.
 *
 * @param {FeedOptions} [options]
 * @returns {Promise<Artist[]>}
 */
export async function getFeed({ genre = null, limit = 20 } = {}) {
  let artists = await getFeaturedFromAll();

  if (genre) {
    const g = genre.toLowerCase();
    artists = artists.filter(a =>
      a.tags.some(t => t.toLowerCase().includes(g)) ||
      a.genre.toLowerCase().includes(g)
    );
  }

  return artists
    .sort((a, b) => b.underground - a.underground)
    .slice(0, limit);
}

/**
 * Search all platforms for a query string.
 *
 * @param {string} query
 * @param {SearchOptions} [options]
 * @returns {Promise<Artist[]>}
 */
export async function search(query, { limit = 20 } = {}) {
  if (!query.trim()) return [];
  const results = await aggregate(query);
  return results.slice(0, limit);
}

/**
 * Return a short list of personalized recommendations for the home screen.
 * Currently returns the highest-underground-scored artists from the feed.
 *
 * @param {{ limit?: number }} [options]
 * @returns {Promise<Artist[]>}
 */
export async function getRecommendations({ limit = 3 } = {}) {
  return getFeed({ limit });
}

/**
 * Persist an artist to the saved collection.
 * No-ops silently if the artist is already saved.
 *
 * @param {Artist} artist
 */
export function saveArtist(artist) {
  const { saved } = getState();
  if (saved.some(a => a.id === artist.id)) return;
  setState({ saved: [...saved, artist] });
}

/**
 * Remove an artist from the saved collection.
 *
 * @param {string} artistId
 */
export function unsaveArtist(artistId) {
  const { saved } = getState();
  setState({ saved: saved.filter(a => a.id !== artistId) });
}

/**
 * @returns {Artist[]}
 */
export function getSaved() {
  return getState().saved;
}

/**
 * @param {string} artistId
 * @returns {boolean}
 */
export function isSaved(artistId) {
  return getState().saved.some(a => a.id === artistId);
}
