/**
 * Spotify platform adapter — live Client Credentials implementation.
 *
 * Interface contract (shared by all platform adapters):
 *   getFeatured() → Promise<Artist[]>
 *   search(query) → Promise<Artist[]>
 *   getArtist(id) → Promise<Artist|null>
 *
 * All results are filtered to Spotify popularity < 30 (strictly underground).
 * Token lifecycle is managed internally and cached via storageService so it
 * survives page refreshes without a re-fetch until expiry.
 *
 * Offline fallback: both getFeatured() and search() are wrapped in cacheGet()
 * so stale results are served from localStorage when the network is unavailable.
 *
 * SECURITY NOTE: Client Credentials Flow embeds the client_secret in browser
 * JS. Before going public move the /api/token call to a backend proxy and
 * remove the secret from js/config.js.
 */

import { saveToCache, getFromCache, clearCache } from '../storageService.js';
import { get as cacheGet }                       from '../../core/cache.js';

// Credentials injected by js/config.js (plain <script> loaded before this module)
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = window.ENV ?? {};

const API      = 'https://api.spotify.com/v1';
const ACCOUNTS = 'https://accounts.spotify.com';
const TOKEN_KEY = 'sp_token';
const POPULARITY_CEILING = 30;   // Velvet filter: strictly underground only

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

  if (!resp.ok) {
    throw new Error(`[Spotify] Token request failed: ${resp.status} ${resp.statusText}`);
  }

  const { access_token } = await resp.json();
  saveToCache(TOKEN_KEY, access_token, 55); // token lives 60 min; cache for 55
  return access_token;
}

async function getToken() {
  return getFromCache(TOKEN_KEY) ?? fetchFreshToken();
}

// ── Authenticated fetch (auto-refreshes on 401) ───────────────────────────────

async function apiFetch(path) {
  const doFetch = (token) =>
    fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });

  let token = await getToken();
  let resp  = await doFetch(token);

  if (resp.status === 401) {
    clearCache(TOKEN_KEY);
    token = await fetchFreshToken();
    resp  = await doFetch(token);
  }

  if (!resp.ok) {
    throw new Error(`[Spotify] ${resp.status} ${resp.statusText} — ${path}`);
  }
  return resp.json();
}

// ── Data mapping ──────────────────────────────────────────────────────────────

const GENRE_ICONS = new Map([
  ['hip-hop',    'ti-writing'],
  ['rap',        'ti-writing'],
  ['folk',       'ti-leaf'],
  ['country',    'ti-leaf'],
  ['electronic', 'ti-wave-sine'],
  ['ambient',    'ti-wave-sine'],
  ['synth',      'ti-wave-sine'],
  ['punk',       'ti-guitar-pick'],
  ['rock',       'ti-guitar-pick'],
  ['indie',      'ti-microphone-2'],
  ['pop',        'ti-microphone-2'],
  ['jazz',       'ti-music'],
  ['classical',  'ti-music'],
  ['soul',       'ti-music'],
  ['r&b',        'ti-headphones'],
]);

const BG_PALETTE = [
  '#2A1F35', '#1A2A20', '#1A202A', '#2A1A1A',
  '#2A2A1A', '#1F1A2A', '#1A2515', '#200A0A',
];

const fmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * Map a raw Spotify artist object to our normalised Artist schema.
 * @param {object} a  Raw Spotify artist
 * @returns {import('../discoveryService.js').Artist}
 */
function mapArtist(a) {
  const genres = a.genres ?? [];

  const icon = [...GENRE_ICONS.entries()]
    .find(([key]) => genres.some(g => g.includes(key)))?.[1] ?? 'ti-music';

  // Derive a consistent background colour from the artist's Spotify ID
  const bg = BG_PALETTE[parseInt(a.id.slice(-2), 16) % BG_PALETTE.length];

  const followers = fmt.format(a.followers?.total ?? 0);
  const genreStr  = genres.length ? ` Sound: ${genres.slice(0, 3).join(', ')}.` : '';

  return {
    id:          `sp_${a.id}`,
    name:         a.name,
    genre:        genres.slice(0, 2).join(' · ') || 'Independent',
    bio:         `${followers} followers on Spotify.${genreStr}`,
    underground:  a.popularity,          // 0–29 after our filter; lower = more hidden
    icon,
    bg,
    tags:         genres.slice(0, 3).map(g => g.replace(/-/g, ' ')),
    platforms: {
      spotify: {
        id:  a.id,
        url: a.external_urls?.spotify ?? '',
      },
    },
    source: 'spotify',
  };
}

/**
 * Exclude artists above the popularity ceiling and without meaningful presence.
 * @param {object[]} artists  Raw Spotify artist objects
 */
function filterUnderground(artists) {
  return artists.filter(
    a => a.popularity < POPULARITY_CEILING && (a.followers?.total ?? 0) > 50
  );
}

// ── Platform adapter interface ─────────────────────────────────────────────────

// Genre queries used to build the discovery feed.
// Multiple queries → more variety without a personalisation token.
const FEED_QUERIES = [
  'bedroom pop',
  'lo-fi indie',
  'underground hip hop',
  'post-punk revival',
  'dark ambient',
];

const FEED_TTL_MS   = 10 * 60 * 1000;  // 10 min
const SEARCH_TTL_MS =  5 * 60 * 1000;  //  5 min

/**
 * Fetch a curated underground feed from Spotify.
 * Fans out across FEED_QUERIES in parallel; individual query failures are
 * tolerated so a single rate-limit or network hiccup doesn't kill the whole feed.
 *
 * @returns {Promise<import('../discoveryService.js').Artist[]>}
 */
export async function getFeatured() {
  return cacheGet('sp_featured', async () => {
    const settled = await Promise.allSettled(
      FEED_QUERIES.map(q =>
        apiFetch(`/search?q=${encodeURIComponent(q)}&type=artist&limit=20`)
      )
    );

    const seen = new Set();
    return settled
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => filterUnderground(r.value.artists.items))
      .filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      })
      .map(mapArtist);
  }, FEED_TTL_MS);
}

/**
 * Search Spotify for artists matching `query`, filtered to underground only.
 *
 * @param {string} query
 * @returns {Promise<import('../discoveryService.js').Artist[]>}
 */
export async function search(query) {
  const key = `sp_search:${query.toLowerCase().trim()}`;
  return cacheGet(key, async () => {
    const data = await apiFetch(
      `/search?q=${encodeURIComponent(query)}&type=artist&limit=50`
    );
    return filterUnderground(data.artists.items).map(mapArtist);
  }, SEARCH_TTL_MS);
}

/**
 * Fetch a single artist by our internal id (sp_<spotifyId>).
 * Returns null if the artist exceeds the popularity ceiling.
 *
 * @param {string} id  Internal artist id (e.g. 'sp_abc123')
 * @returns {Promise<import('../discoveryService.js').Artist|null>}
 */
export async function getArtist(id) {
  const spotifyId = id.replace(/^sp_/, '');
  const data      = await apiFetch(`/artists/${spotifyId}`);
  if (data.popularity >= POPULARITY_CEILING) return null;
  return mapArtist(data);
}
