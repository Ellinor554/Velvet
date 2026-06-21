import { getRecommendations } from '../services/discoveryService.js';
import { switchScreen } from './nav.js';

/**
 * @param {{ onSearch: (query: string) => void, onGenreSearch: (genre: string) => void }} [options]
 */
export async function initHomeScreen({ onSearch, onGenreSearch } = {}) {
  await renderRecommendations();
  initSearch(onSearch, onGenreSearch);
}

async function renderRecommendations() {
  const recs = await getRecommendations({ limit: 3 });
  const container = document.getElementById('recScroll');

  container.innerHTML = recs.map(r => `
    <div class="rec-row" data-nav="discover">
      <div class="rec-avatar"><i class="ti ${r.icon}" aria-hidden="true"></i></div>
      <div class="rec-info">
        <h3>${r.name}</h3>
        <p>${r.genre}</p>
      </div>
      <div class="rec-badge">${r.underground}% known</div>
    </div>
  `).join('');

  container.addEventListener('click', e => {
    if (e.target.closest('[data-nav]')) switchScreen('discover');
  });
}

function initSearch(onArtistSearch, onGenreSearch) {
  const tabs        = document.querySelectorAll('.search-tab');
  const paneArtist  = document.getElementById('pane-artist');
  const paneGenre   = document.getElementById('pane-genre');
  const artistInput = document.getElementById('input-artist');
  const genreInput  = document.getElementById('input-genre');
  const genreChips  = document.querySelectorAll('.genre-chip');
  const artistIcon  = document.querySelector('#pane-artist .search-box i');
  const genreIcon   = document.querySelector('#pane-genre .search-box i');

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;
      paneArtist.classList.toggle('hidden', mode !== 'artist');
      paneGenre.classList.toggle('hidden', mode !== 'genre');
    });
  });

  // Artist search
  async function runArtistSearch() {
    const query = artistInput.value.trim();
    if (!query || !onArtistSearch) return;
    artistInput.blur();
    artistInput.value = '';
    await onArtistSearch(query);
  }
  artistInput.addEventListener('keydown', e => { if (e.key === 'Enter') runArtistSearch(); });
  if (artistIcon) artistIcon.addEventListener('click', runArtistSearch);

  // Genre search
  async function runGenreSearch(genre) {
    const g = genre?.trim();
    if (!g || !onGenreSearch) return;
    genreInput.blur();
    genreInput.value = '';
    genreChips.forEach(c => c.classList.remove('active'));
    await onGenreSearch(g);
  }
  genreInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') runGenreSearch(genreInput.value);
  });
  if (genreIcon) genreIcon.addEventListener('click', () => runGenreSearch(genreInput.value));

  genreChips.forEach(chip => {
    chip.addEventListener('click', () => {
      genreChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      runGenreSearch(chip.dataset.genre);
    });
  });
}
