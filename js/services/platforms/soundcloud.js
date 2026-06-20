/**
 * SoundCloud platform adapter.
 *
 * Interface contract: see spotify.js header.
 *
 * TODO: Replace MOCK data + stubs with real SoundCloud API v2 calls.
 *       Auth flow: OAuth2 implicit grant.
 *       Base URL: https://api-v2.soundcloud.com
 */

/** @type {import('../discoveryService.js').Artist[]} */
const MOCK = [
  {
    id: 'sc_arca',
    name: 'Arca',
    genre: 'Avant-Club · Venezuela/London',
    bio: 'Sound designer for Björk and Kanye. Her solo work is fractured, beautiful, and genuinely alien.',
    underground: 9,
    icon: 'ti-wave-sine',
    bg: '#2A2A1A',
    tags: ['experimental', 'textural', 'futuristic'],
    platforms: { soundcloud: { id: '9918541', url: 'https://soundcloud.com/arca1000000' } },
    source: 'soundcloud',
  },
  {
    id: 'sc_mkgee',
    name: 'Mk.gee',
    genre: 'Dark Pop · New Jersey',
    bio: 'Liquid guitar tones and clouded vocals. Took four years to make his debut. It shows — in the best way.',
    underground: 22,
    icon: 'ti-headphones',
    bg: '#1F1A2A',
    tags: ['hazy', 'obsessive', 'tender'],
    platforms: { soundcloud: { id: '472473983', url: 'https://soundcloud.com/mkgee' } },
    source: 'soundcloud',
  },
  {
    id: 'sc_slauson_malone',
    name: 'Slauson Malone 1',
    genre: 'Avant Hip-Hop · NYC',
    bio: 'Formerly of Standing on the Corner. Makes collage music that treats hip-hop as raw material, not destination.',
    underground: 4,
    icon: 'ti-music',
    bg: '#1A1A2A',
    tags: ['collage', 'abstract', 'dense'],
    platforms: { soundcloud: { id: '288982862', url: 'https://soundcloud.com/slausonmalone' } },
    source: 'soundcloud',
  },
  {
    id: 'sc_crystallmess',
    name: 'Crystallmess',
    genre: 'Hyperpop · Paris',
    bio: 'DJ and producer blending Middle Eastern rhythms with club music and political urgency. Residency at Boiler Room.',
    underground: 3,
    icon: 'ti-planet',
    bg: '#2A1520',
    tags: ['club', 'global', 'urgent'],
    platforms: { soundcloud: { id: '141679240', url: 'https://soundcloud.com/crystallmess' } },
    source: 'soundcloud',
  },
];

/** @returns {Promise<import('../discoveryService.js').Artist[]>} */
export async function getFeatured() {
  // TODO: GET /charts?kind=trending&genre=all-music
  return MOCK;
}

/**
 * @param {string} query
 * @returns {Promise<import('../discoveryService.js').Artist[]>}
 */
export async function search(query) {
  // TODO: GET /search/users?q={query}
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
  // TODO: GET /users/{id}
  return MOCK.find(a => a.id === id) ?? null;
}
