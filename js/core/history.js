const KEY = 'velvet_search_history';
const MAX = 10;

/**
 * @param {string} term
 * @param {'artist'|'genre'} type
 */
export function addToHistory(term, type) {
  const prev = getHistory().filter(h => h.term.toLowerCase() !== term.toLowerCase());
  prev.unshift({ term, type });
  try {
    localStorage.setItem(KEY, JSON.stringify(prev.slice(0, MAX)));
  } catch {}
}

/** @returns {{ term: string, type: 'artist'|'genre' }[]} */
export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
