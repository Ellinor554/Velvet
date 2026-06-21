import { searchByArtist, searchByGenre } from '../services/discoveryService.js';
import { getHistory } from '../core/history.js';
import { switchScreen } from './nav.js';

const DEFAULT_GENRES = ['shoegaze', 'post-punk', 'darkwave', 'lo-fi', 'dream pop', 'bedroom pop'];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {{ onSearch: (query: string) => void, onGenreSearch: (genre: string) => void }} [options]
 */
export async function initHomeScreen({ onSearch, onGenreSearch } = {}) {
  await renderRecommendations();
  initSearch(onSearch, onGenreSearch);
}

async function renderRecommendations() {
  const container = document.getElementById('recScroll');
  const label     = document.querySelector('.recs-label p');

  container.innerHTML = `
    <div style="padding:16px 0;display:flex;align-items:center;gap:10px;color:var(--esp-muted);font-size:13px">
      <i class="ti ti-loader-2" style="font-size:18px"></i> Finding picks…
    </div>`;

  try {
    const history = getHistory();
    let artists = [];
    let sourceLabel = 'Based on your taste profile';

    if (history.length > 0) {
      const pick = pickRandom(history);
      const results = pick.type === 'artist'
        ? await searchByArtist(pick.term)
        : await searchByGenre(pick.term);
      artists = shuffle(results).slice(0, 3);
      sourceLabel = `Because you searched "${pick.term}"`;
    } else {
      const genre = pickRandom(DEFAULT_GENRES);
      const results = await searchByGenre(genre);
      artists = shuffle(results).slice(0, 3);
      sourceLabel = `Featuring ${genre}`;
    }

    if (label) label.textContent = sourceLabel;

    if (!artists.length) {
      container.innerHTML = `<p style="font-size:13px;color:var(--esp-muted);padding:8px 0">No picks right now — search for an artist to get started.</p>`;
      return;
    }

    container.innerHTML = artists.map(a => {
      const spotifyUrl = a.platforms?.spotify?.url ?? '';
      return `
        <div class="rec-row" ${spotifyUrl ? `data-spotify-url="${spotifyUrl}"` : ''}>
          <div class="rec-avatar" style="background:${a.bg}">
            <i class="ti ${a.icon}" aria-hidden="true"></i>
          </div>
          <div class="rec-info">
            <h3>${a.name}</h3>
            <p>${a.genre}</p>
          </div>
          <div class="rec-row-right">
            <div class="rec-badge">${a.underground}% known</div>
            ${spotifyUrl ? `<button class="rec-spotify-btn" data-spotify-url="${spotifyUrl}" aria-label="Open on Spotify"><i class="ti ti-brand-spotify"></i></button>` : ''}
          </div>
        </div>`;
    }).join('');

    container.addEventListener('click', e => {
      const spotifyBtn = e.target.closest('.rec-spotify-btn');
      if (spotifyBtn) {
        e.stopPropagation();
        window.open(spotifyBtn.dataset.spotifyUrl, '_blank', 'noopener');
        return;
      }
      if (e.target.closest('.rec-row')) switchScreen('discover');
    });

  } catch (err) {
    console.error('[Home] Recs failed:', err);
    container.innerHTML = `<p style="font-size:13px;color:var(--esp-muted);padding:8px 0">Could not load picks — check your connection.</p>`;
  }
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
