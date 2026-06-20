/**
 * Spotify platform adapter — live Client Credentials implementation.
 *
 * IMPORTANT: The Spotify search endpoint returns simplified artist objects
 * (no popularity / genres / followers). Full details must be fetched via
 * GET /artists?ids=... before filtering or mapping. All internal helpers
 * that hit the search endpoint call enrichArtists() before returning.
 *
 * Underground filter: popularity strictly < 30. Applied after enrichment.
 */

import { saveToCache, getFromCache, clearCache } from '../storageService.js';
import { get as cacheGet }                       from '../../core/cache.js';

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = window.ENV ?? {};

const API      = 'https://api.spotify.com/v1';
const ACCOUNTS = 'https://accounts.spotify.com';
const TOKEN_KEY            = 'sp_token';
const POPULARITY_CEILING   = 30;

// ── Token management ─────────────────────────────────────────────────────────

async function fetchFreshToken() {
  const creds = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  const resp  = await fetch(`${ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      Authorization:  `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) throw new Error(`[Spotify] Token failed: ${resp.status}`);
  const { access_token } = await resp.json();
  saveToCache(TOKEN_KEY, access_token, 55);
  return access_token;
}

async function getToken() {
  return getFromCache(TOKEN_KEY) ?? fetchFreshToken();
}

async function apiFetch(path) {
  const doFetch = token =>
    fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });

  let token = await getToken();
  let resp  = await doFetch(token);

  if (resp.status === 401) {
    clearCache(TOKEN_KEY);
    token = await fetchFreshToken();
    resp  = await doFetch(token);
  }

  if (!resp.ok) throw new Error(`[Spotify] ${resp.status} — ${path}`);
  return resp.json();
}

// ── Enrich simplified search results with full artist details ─────────────────
// The search endpoint omits popularity, genres, and followers.
// /artists?ids= returns full objects for up to 50 IDs at once.

async function enrichArtists(simpleArtists) {
  if (!simpleArtists.length) return [];
  const ids     = [...new Set(simpleArtists.map(a => a.id))];
  const batches = [];
  for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i, i + 50));

  const results = await Promise.all(
    batches.map(batch => apiFetch(`/artists?ids=${batch.join(',')}`))
  );
  return results.flatMap(r => r.artists ?? []);
}

// ── Data mapping ──────────────────────────────────────────────────────────────

const GENRE_ICONS = new Map([
  ['hip-hop',    'ti-writing'],   ['rap',        'ti-writing'],
  ['folk',       'ti-leaf'],      ['country',    'ti-leaf'],
  ['electronic', 'ti-wave-sine'], ['ambient',    'ti-wave-sine'],
  ['synth',      'ti-wave-sine'], ['punk',       'ti-guitar-pick'],
  ['rock',       'ti-guitar-pick'],['indie',     'ti-microphone-2'],
  ['pop',        'ti-microphone-2'],['jazz',     'ti-music'],
  ['classical',  'ti-music'],     ['soul',       'ti-music'],
  ['r&b',        'ti-headphones'],
]);

const BG_PALETTE = [
  '#2A1F35', '#1A2A20', '#1A202A', '#2A1A1A',
  '#2A2A1A', '#1F1A2A', '#1A2515', '#200A0A',
];

const fmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

function mapArtist(a) {
  const genres = a.genres ?? [];
  const icon   = [...GENRE_ICONS.entries()]
    .find(([key]) => genres.some(g => g.includes(key)))?.[1] ?? 'ti-music';
  const bg         = BG_PALETTE[parseInt(a.id.slice(-2), 16) % BG_PALETTE.length];
  const followers  = fmt.format(a.followers?.total ?? 0);
  const genreStr   = genres.length ? ` Sound: ${genres.slice(0, 3).join(', ')}.` : '';

  return {
    id:          `sp_${a.id}`,
    name:         a.name,
    genre:        genres.slice(0, 2).join(' · ') || 'Independent',
    bio:         `${followers} followers on Spotify.${genreStr}`,
    underground:  a.popularity,
    icon,
    bg,
    tags:         genres.slice(0, 3).map(g => g.replace(/-/g, ' ')),
    platforms: {
      spotify: { id: a.id, url: a.external_urls?.spotify ?? '' },
    },
    source: 'spotify',
  };
}

function isUnderground(a) {
  return typeof a.popularity === 'number' &&
         a.popularity < POPULARITY_CEILING &&
         (a.followers?.total ?? 0) > 50;
}

// ── Platform adapter interface ─────────────────────────────────────────────────

const FEED_QUERIES = [
  'bedroom pop', 'lo-fi indie', 'underground hip hop',
  'post-punk revival', 'dark ambient',
];

const FEED_TTL_MS   = 10 * 60 * 1000;
const SEARCH_TTL_MS =  5 * 60 * 1000;

export async function getFeatured() {
  return cacheGet('sp_featured', async () => {
    // Step 1: search each genre query for artist IDs
    const settled = await Promise.allSettled(
      FEED_QUERIES.map(q =>
        apiFetch(`/search?q=${encodeURIComponent(q)}&type=artist&limit=20`)
      )
    );
    const simple = settled
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value.artists?.items ?? []);

    // Step 2: enrich with full details (popularity, genres, followers)
    const full = await enrichArtists(simple);

    // Step 3: filter underground and deduplicate
    const seen = new Set();
    return full
      .filter(a => isUnderground(a) && !seen.has(a.id) && seen.add(a.id))
      .map(mapArtist);
  }, FEED_TTL_MS);
}

export async function search(query) {
  const key = `sp_search:${query.toLowerCase().trim()}`;
  return cacheGet(key, async () => {
    const data   = await apiFetch(`/search?q=${encodeURIComponent(query)}&type=artist&limit=50`);
    const simple = data.artists?.items ?? [];
    const full   = await enrichArtists(simple);
    return full.filter(isUnderground).map(mapArtist);
  }, SEARCH_TTL_MS);
}

/**
 * Given an artist name the user typed, find underground artists with a
 * similar sound by using the seed artist's genres as a search pivot.
 *
 * @param {string} artistName
 * @returns {Promise<import('../discoveryService.js').Artist[]>}
 */
export async function findSimilarArtists(artistName) {
  const key = `sp_similar:${artistName.toLowerCase().trim()}`;
  return cacheGet(key, async () => {
    // 1. Find the seed artist (can be mainstream — we just need their genres)
    const seedSearch = await apiFetch(
      `/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`
    );
    const seedSimple = seedSearch.artists?.items?.[0];
    if (!seedSimple) return [];

    // 2. Enrich to get genres
    const [seed] = await enrichArtists([seedSimple]);
    const genres  = seed?.genres ?? [];

    // 3. Build a genre-based query to find similar underground artists
    const query = genres.length
      ? genres.slice(0, 2).map(g => `genre:"${g}"`).join(' ')
      : artistName;

    const data   = await apiFetch(`/search?q=${encodeURIComponent(query)}&type=artist&limit=50`);
    const simple = (data.artists?.items ?? []).filter(a => a.id !== seedSimple.id);
    const full   = await enrichArtists(simple);

    return full.filter(isUnderground).map(mapArtist);
  }, SEARCH_TTL_MS);
}

export async function getArtist(id) {
  const spotifyId = id.replace(/^sp_/, '');
  const data      = await apiFetch(`/artists/${spotifyId}`);
  return isUnderground(data) ? mapArtist(data) : null;
}
