/**
 * Bandcamp platform adapter.
 *
 * Interface contract: see spotify.js header.
 *
 * NOTE: Bandcamp has no public API. Production implementation options:
 *   A) Bandcamp Fan API (requires user OAuth, limited to their own purchases/follows)
 *   B) Server-side scraper with rate limiting + caching
 *   C) Partner API (requires formal Bandcamp partnership)
 *
 * TODO: Decide on approach before implementing. For now mock data reflects
 *       the kinds of artists discovered via Bandcamp's genre tags + Daily feature.
 */

/** @type {import('../discoveryService.js').Artist[]} */
const MOCK = [
  {
    id: 'bc_arooj_aftab',
    name: 'Arooj Aftab',
    genre: 'Neo-Sufi · Brooklyn',
    bio: 'Grammy-winner fusing Pakistani classical music with jazz and ambient electronics. Hauntingly original.',
    underground: 15,
    icon: 'ti-music',
    bg: '#1A202A',
    tags: ['ethereal', 'poetic', 'global'],
    platforms: { bandcamp: { url: 'https://aroojaftab.bandcamp.com' } },
    source: 'bandcamp',
  },
  {
    id: 'bc_billy_woods',
    name: 'billy woods',
    genre: 'Underground Hip-Hop · NYC',
    bio: 'Literary, opaque, relentless. Critics say he writes the best rap lyrics alive. The mainstream hasn\'t caught on.',
    underground: 6,
    icon: 'ti-writing',
    bg: '#2A1A1A',
    tags: ['dense', 'cinematic', 'lyrical'],
    platforms: { bandcamp: { url: 'https://billywoodsbackwoodsstudios.bandcamp.com' } },
    source: 'bandcamp',
  },
  {
    id: 'bc_lingua_ignota',
    name: 'Lingua Ignota',
    genre: 'Neoclassical · Providence',
    bio: 'Piano, screams, and liturgical Latin. Brutal, cathartic music about survival. Nothing else sounds like this.',
    underground: 5,
    icon: 'ti-crown',
    bg: '#200A0A',
    tags: ['cathartic', 'classical', 'extreme'],
    platforms: { bandcamp: { url: 'https://linguaignota.bandcamp.com' } },
    source: 'bandcamp',
  },
  {
    id: 'bc_leila_hassan',
    name: 'Leila Hassan',
    genre: 'Ambient Dub · Bristol',
    bio: 'Builds deep dub structures from field recordings made in Somali coastal towns. Patient, hypnotic, revelatory.',
    underground: 2,
    icon: 'ti-wave-square',
    bg: '#0A1520',
    tags: ['ambient', 'dub', 'field-recordings'],
    platforms: { bandcamp: { url: 'https://leilahassan.bandcamp.com' } },
    source: 'bandcamp',
  },
];

/** @returns {Promise<import('../discoveryService.js').Artist[]>} */
export async function getFeatured() {
  // TODO: Implement chosen Bandcamp access strategy (see module header note)
  return MOCK;
}

/**
 * @param {string} query
 * @returns {Promise<import('../discoveryService.js').Artist[]>}
 */
export async function search(query) {
  // TODO: Implement chosen Bandcamp access strategy
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
  return MOCK.find(a => a.id === id) ?? null;
}
