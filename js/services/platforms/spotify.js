/**
 * Spotify platform adapter.
 *
 * Interface contract (all platform adapters must export these three functions
 * and return Artist[] in the normalized schema):
 *
 *   search(query: string)  → Promise<Artist[]>
 *   getFeatured()          → Promise<Artist[]>
 *   getArtist(id: string)  → Promise<Artist|null>
 *
 * TODO: Replace MOCK data + stubs with real Spotify Web API calls.
 *       Auth flow: Authorization Code + PKCE (no server needed for PWA).
 *       Base URL: https://api.spotify.com/v1
 */

/** @type {import('../discoveryService.js').Artist[]} */
const MOCK = [
  {
    id: 'sp_faye_webster',
    name: 'Faye Webster',
    genre: 'Indie Pop · Atlanta',
    bio: 'Blends smooth country guitar with bedroom-pop vocals. Toured with Bon Iver before most people had heard of her.',
    underground: 12,
    icon: 'ti-microphone-2',
    bg: '#2A1F35',
    tags: ['dreamy', 'lo-fi', 'introspective'],
    platforms: { spotify: { id: '6A4GRNmzBVMCKfgCy4QFNY', url: 'https://open.spotify.com/artist/6A4GRNmzBVMCKfgCy4QFNY' } },
    source: 'spotify',
  },
  {
    id: 'sp_horsegirl',
    name: 'Horsegirl',
    genre: 'Post-Punk · Chicago',
    bio: 'Three teenagers channeling Television and The Breeders through a fog of reverb and tape hiss.',
    underground: 8,
    icon: 'ti-guitar-pick',
    bg: '#1A2A20',
    tags: ['jangly', 'raw', 'angular'],
    platforms: { spotify: { id: '3TOUKlAkKOiTLSJLThUflx', url: 'https://open.spotify.com/artist/3TOUKlAkKOiTLSJLThUflx' } },
    source: 'spotify',
  },
  {
    id: 'sp_yves_tumor',
    name: 'Yves Tumor',
    genre: 'Art Rock · Turin/LA',
    bio: 'Shape-shifting across noise, glam, and R&B without settling anywhere. Every album sounds like a different artist.',
    underground: 18,
    icon: 'ti-flame',
    bg: '#2A1A10',
    tags: ['transgressive', 'glam', 'noise'],
    platforms: { spotify: { id: '4AdZV69tAoTN1TRCTzjNHb', url: 'https://open.spotify.com/artist/4AdZV69tAoTN1TRCTzjNHb' } },
    source: 'spotify',
  },
  {
    id: 'sp_julie_byrne',
    name: 'Julie Byrne',
    genre: 'Indie Folk · NYC',
    bio: 'Fingerpicked guitar and a voice like late-night driving. Her album Not Even Happiness is a landmark of the form.',
    underground: 7,
    icon: 'ti-leaf',
    bg: '#1A2515',
    tags: ['gentle', 'sparse', 'intimate'],
    platforms: { spotify: { id: '7rCsOGWMpFUJGpGK1eJnIy', url: 'https://open.spotify.com/artist/7rCsOGWMpFUJGpGK1eJnIy' } },
    source: 'spotify',
  },
];

/** @returns {Promise<import('../discoveryService.js').Artist[]>} */
export async function getFeatured() {
  // TODO: GET /browse/featured-playlists → extract artists
  return MOCK;
}

/**
 * @param {string} query
 * @returns {Promise<import('../discoveryService.js').Artist[]>}
 */
export async function search(query) {
  // TODO: GET /search?q={query}&type=artist
  const q = query.toLowerCase();
  return MOCK.filter(a =>
    a.name.toLowerCase().includes(q) ||
    a.genre.toLowerCase().includes(q) ||
    a.tags.some(t => t.includes(q))
  );
}

/**
 * @param {string} id
 * @returns {Promise<import('../discoveryService.js').Artist|null>}
 */
export async function getArtist(id) {
  // TODO: GET /artists/{id}
  return MOCK.find(a => a.id === id) ?? null;
}
