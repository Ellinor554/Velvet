/**
 * Spotify platform adapter — proxied through Cloudflare Worker.
 *
 * All Spotify auth (Client Credentials token exchange) now happens on the
 * Worker. This module makes simple GET requests to the Worker and normalises
 * the response into our internal Artist shape.
 *
 * Worker contract:
 *   GET {CLOUDFLARE_URL}?artist={name}  → { artists: SpotifyArtist[] }
 *   GET {CLOUDFLARE_URL}?genre={genre}  → { artists: SpotifyArtist[] }
 *
 * The Worker applies the underground popularity filter before responding.
 */

import { get as cacheGet } from '../../core/cache.js';

const WORKER_URL    = (window.ENV?.CLOUDFLARE_URL ?? '').replace(/\/$/, '');
const FEED_TTL_MS   = 10 * 60 * 1000;
const SEARCH_TTL_MS =  5 * 60 * 1000;

// ── Worker fetch ──────────────────────────────────────────────────────────────

async function workerFetch(params) {
  const url  = `${WORKER_URL}?${new URLSearchParams(params)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`[Worker] ${resp.status} — ${url}`);
  const { artists = [] } = await resp.json();
  return artists.map(normalise);
}

// ── Normalise to internal Artist shape ────────────────────────────────────────
// Handles both Spotify full-artist objects and pre-mapped Worker responses.

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

function normalise(a) {
  // Already in internal format (Worker pre-mapped the response)
  if (a.underground !== undefined && typeof a.icon === 'string') return a;

  // Spotify's search endpoint returns simplified objects — genres, popularity,
  // and followers are not included. Use image count as a rough underground proxy:
  // 0 images → very unknown, 3 images → more established.
  const genres     = a.genres ?? [];
  const imageCount = a.images?.length ?? 0;
  const underground = a.popularity ?? (imageCount === 0 ? 8 : imageCount < 3 ? 25 : 45);

  const icon = [...GENRE_ICONS.entries()]
    .find(([key]) => genres.some(g => g.includes(key)))?.[1] ?? 'ti-music';
  const bg   = BG_PALETTE[parseInt((a.id ?? '00').slice(-2), 16) % BG_PALETTE.length];

  const followers = a.followers?.total != null
    ? fmt.format(a.followers.total) + ' followers on Spotify.'
    : 'Found on Spotify.';

  return {
    id:          `sp_${a.id}`,
    name:         a.name,
    genre:        genres.slice(0, 2).join(' · ') || 'Independent',
    bio:          followers,
    underground,
    icon,
    bg,
    tags:         genres.slice(0, 3).map(g => g.replace(/-/g, ' ')),
    platforms: {
      spotify: { id: a.id, url: a.external_urls?.spotify ?? '' },
    },
    source: 'spotify',
  };
}

// ── Platform adapter interface ─────────────────────────────────────────────────

const FEED_GENRES = [
  'bedroom pop', 'lo-fi indie', 'underground hip hop', 'dark ambient',
];

export async function getFeatured() {
  return cacheGet('sp_featured', async () => {
    const settled = await Promise.allSettled(
      FEED_GENRES.map(g => workerFetch({ genre: g }))
    );
    const seen = new Set();
    return settled
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .filter(a => !seen.has(a.id) && seen.add(a.id));
  }, FEED_TTL_MS);
}

export async function search(query) {
  const key = `sp_search:${query.toLowerCase().trim()}`;
  return cacheGet(key, () => workerFetch({ artist: query }), SEARCH_TTL_MS);
}

export async function findSimilarArtists(artistName) {
  const key = `sp_similar:${artistName.toLowerCase().trim()}`;
  return cacheGet(key, () => workerFetch({ artist: artistName }), SEARCH_TTL_MS);
}

export async function searchByGenre(genre) {
  const key = `sp_genre:${genre.toLowerCase().trim()}`;
  return cacheGet(key, () => workerFetch({ genre }), SEARCH_TTL_MS);
}

export async function getArtist(id) {
  return null;
}
