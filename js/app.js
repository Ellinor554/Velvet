import { initNav, switchScreen, updateSavedBadge } from './ui/nav.js';
import { initHomeScreen }                           from './ui/homeScreen.js';
import { initDiscoverScreen, loadArtists, setLoading, showSearchHeader, hideSearchHeader } from './ui/discoverScreen.js';
import { initSavedScreen, renderSavedScreen }       from './ui/savedScreen.js';
import { subscribe, getState }                      from './core/store.js';
import { searchByArtist, searchByGenre }            from './services/discoveryService.js';
import { addToHistory }                             from './core/history.js';
import { shouldShowOnboarding, showOnboarding }     from './ui/onboarding.js';
import { showToast }                                from './ui/toast.js';
import './pwa.js';

async function runSearch(label, fetcher, type) {
  addToHistory(label, type);
  switchScreen('discover');
  showSearchHeader(label, type);
  setLoading(true);
  try {
    const artists = await fetcher();
    if (!artists.length) showToast(`No underground artists found for "${label}"`);
    loadArtists(artists);
  } catch (err) {
    console.error('[App] Search failed:', err);
    showToast('Could not reach Spotify — check your connection');
    setLoading(false);
  }
}

async function init() {
  initNav(id => {
    if (id === 'saved') renderSavedScreen();
    if (id !== 'discover') hideSearchHeader();
  });

  updateSavedBadge(getState().saved.length);
  subscribe(state => updateSavedBadge(state.saved.length));

  initSavedScreen();

  if (shouldShowOnboarding()) {
    await showOnboarding();
  }

  await Promise.all([
    initHomeScreen({
      onSearch:      query => runSearch(query, () => searchByArtist(query), 'artist'),
      onGenreSearch: genre => runSearch(genre, () => searchByGenre(genre), 'genre'),
    }),
    initDiscoverScreen(),
  ]);
}

init().catch(err => console.error('[App] Init failed:', err));
