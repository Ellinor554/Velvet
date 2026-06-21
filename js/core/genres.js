const KEY = 'velvet_saved_genres';

/** @returns {string[]} */
export function getSavedGenres() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

/**
 * @param {string} genre
 * @returns {string[]} updated list
 */
export function addGenre(genre) {
  const norm   = genre.trim().toLowerCase();
  const genres = getSavedGenres().filter(g => g !== norm);
  genres.push(norm);
  try { localStorage.setItem(KEY, JSON.stringify(genres)); } catch {}
  return genres;
}

/**
 * @param {string} genre
 * @returns {string[]} updated list
 */
export function removeGenre(genre) {
  const norm   = genre.trim().toLowerCase();
  const genres = getSavedGenres().filter(g => g !== norm);
  try { localStorage.setItem(KEY, JSON.stringify(genres)); } catch {}
  return genres;
}

/** @param {string} genre @returns {boolean} */
export function hasGenre(genre) {
  return getSavedGenres().includes(genre.trim().toLowerCase());
}
