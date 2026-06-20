/**
 * Platform aggregator.
 *
 * Fans out to all platform adapters in parallel, tolerates individual
 * platform failures, and deduplicates results by artist name.
 *
 * This module knows about platforms. discoveryService does not.
 */

import * as spotify from './platforms/spotify.js';
import * as soundcloud from './platforms/soundcloud.js';
import * as bandcamp from './platforms/bandcamp.js';

const PLATFORMS = [spotify, soundcloud, bandcamp];

/**
 * Deduplicate artists by lowercase name, keeping the first occurrence
 * (earlier platforms in PLATFORMS take precedence).
 *
 * @param {import('./discoveryService.js').Artist[]} artists
 * @returns {import('./discoveryService.js').Artist[]}
 */
function dedupe(artists) {
  const seen = new Set();
  return artists.filter(a => {
    const key = a.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Search all platforms in parallel and return deduplicated results.
 * A platform that throws will be silently skipped.
 *
 * @param {string} query
 * @returns {Promise<import('./discoveryService.js').Artist[]>}
 */
export async function aggregate(query) {
  const settled = await Promise.allSettled(PLATFORMS.map(p => p.search(query)));
  const artists = settled
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
  return dedupe(artists);
}

/**
 * Fetch featured/trending artists from all platforms in parallel.
 * A platform that throws will be silently skipped.
 *
 * @returns {Promise<import('./discoveryService.js').Artist[]>}
 */
export async function getFeaturedFromAll() {
  const settled = await Promise.allSettled(PLATFORMS.map(p => p.getFeatured()));
  const artists = settled
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
  return dedupe(artists);
}

/**
 * Find underground artists similar to the named artist.
 * Uses genre-pivoting on platforms that support it (Spotify).
 * Platforms without findSimilarArtists() are silently skipped.
 *
 * @param {string} artistName
 * @returns {Promise<import('./discoveryService.js').Artist[]>}
 */
export async function findSimilarArtists(artistName) {
  const platforms = PLATFORMS.filter(p => typeof p.findSimilarArtists === 'function');
  const settled   = await Promise.allSettled(
    platforms.map(p => p.findSimilarArtists(artistName))
  );
  const artists = settled
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
  return dedupe(artists);
}
