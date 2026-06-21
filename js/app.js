import { initNav, switchScreen, updateSavedBadge } from './ui/nav.js';
import { initHomeScreen }                           from './ui/homeScreen.js';
import { initDiscoverScreen, loadArtists, setLoading } from './ui/discoverScreen.js';
import { initSavedScreen, renderSavedScreen }       from './ui/savedScreen.js';
import { subscribe, getState }                      from './core/store.js';
import { searchByArtist, searchByGenre }            from './services/discoveryService.js';
import { showToast }                                from './ui/toast.js';
import './pwa.js';

async function runSearch(label, fetcher) {
  switchScreen('discover');
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
  });

  updateSavedBadge(getState().saved.length);
  subscribe(state => updateSavedBadge(state.saved.length));

  initSavedScreen();

  await Promise.all([
    initHomeScreen({
      onSearch:      query => runSearch(query, () => searchByArtist(query)),
      onGenreSearch: genre => runSearch(genre, () => searchByGenre(genre)),
    }),
    initDiscoverScreen(),
  ]);
}

init().catch(err => console.error('[App] Init failed:', err));
