import { searchByArtist, searchByGenre } from '../services/discoveryService.js';
import { getHistory } from '../core/history.js';
import { getSavedGenres } from '../core/genres.js';
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

function capitalize(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * @param {{ onSearch: (query: string) => void, onGenreSearch: (genre: string) => void }} [options]
 */
export async function initHomeScreen({ onSearch, onGenreSearch } = {}) {
  renderGenreChips(onGenreSearch);
  window.addEventListener('velvet:genreAdded', () => renderGenreChips(onGenreSearch));
  await renderRecommendations();
  initSearch(onSearch, onGenreSearch);
}

// ── Genre chips ──────────────────────────────────────────────────────────────

function renderGenreChips(onGenreSearch) {
  const container = document.getElementById('genreChips');
  if (!container) return;

  const genres = getSavedGenres();
  container.innerHTML = genres.length
    ? genres.map(g => `<button class="genre-chip" data-genre="${g}">${capitalize(g)}</button>`).join('')
    : DEFAULT_GENRES.map(g => `<button class="genre-chip" data-genre="${g}">${capitalize(g)}</button>`).join('');

  // Use event delegation so chips added later are handled automatically
  container.onclick = e => {
    const chip = e.target.closest('.genre-chip');
    if (!chip || !onGenreSearch) return;
    container.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    onGenreSearch(chip.dataset.genre);
  };
}

// ── "Picked for tonight" ─────────────────────────────────────────────────────

async function renderRecommendations() {
  const container = document.getElementById('recScroll');
  const label     = document.querySelector('.recs-label p');

  container.innerHTML = `
    <div style="padding:16px 0;display:flex;align-items:center;gap:10px;color:var(--esp-muted);font-size:13px">
      <i class="ti ti-loader-2" style="font-size:18px"></i> Finding picks…
    </div>`;

  try {
    // Build pool: saved genres (weighted by being explicit preferences)
    // plus recent search history, deduplicated
    const savedGenres = getSavedGenres().map(g => ({ term: g, type: 'genre' }));
    const history     = getHistory();
    const seen        = new Set(savedGenres.map(e => e.term.toLowerCase()));
    const historyNew  = history.filter(h => !seen.has(h.term.toLowerCase()));
    const pool        = [...savedGenres, ...historyNew];

    let artists = [];
    let sourceLabel = 'Based on your taste profile';

    if (pool.length > 0) {
      const pick = pickRandom(pool);
      const results = pick.type === 'artist'
        ? await searchByArtist(pick.term)
        : await searchByGenre(pick.term);
      artists = shuffle(results).slice(0, 3);
      sourceLabel = pick.type === 'artist'
        ? `Because you searched "${pick.term}"`
        : `Featuring ${capitalize(pick.term)}`;
    } else {
      const genre   = pickRandom(DEFAULT_GENRES);
      const results = await searchByGenre(genre);
      artists       = shuffle(results).slice(0, 3);
      sourceLabel   = `Featuring ${capitalize(genre)}`;
    }

    if (label) label.textContent = sourceLabel;

    if (!artists.length) {
      container.innerHTML = `<p style="font-size:13px;color:var(--esp-muted);padding:8px 0">No picks right now — search for an artist to get started.</p>`;
      return;
    }

    container.innerHTML = artists.map(a => {
      const spotifyUrl = a.platforms?.spotify?.url ?? '';
      return `
        <div class="rec-row">
          <div class="rec-avatar" style="background:${a.bg}">
            <i class="ti ${a.icon}" aria-hidden="true"></i>
          </div>
          <div class="rec-info">
            <h3>${a.name}</h3>
            <p>${a.genre}</p>
          </div>
          <div class="rec-row-right">
            <div class="rec-badge">${a.underground}% known</div>
            ${spotifyUrl ? `<button class="rec-spotify-btn" data-url="${spotifyUrl}" aria-label="Open on Spotify"><i class="ti ti-brand-spotify"></i></button>` : ''}
          </div>
        </div>`;
    }).join('');

    container.onclick = e => {
      const spotifyBtn = e.target.closest('.rec-spotify-btn');
      if (spotifyBtn) {
        e.stopPropagation();
        window.open(spotifyBtn.dataset.url, '_blank', 'noopener');
        return;
      }
      if (e.target.closest('.rec-row')) switchScreen('discover');
    };

  } catch (err) {
    console.error('[Home] Recs failed:', err);
    container.innerHTML = `<p style="font-size:13px;color:var(--esp-muted);padding:8px 0">Could not load picks — check your connection.</p>`;
  }
}

// ── Search wiring ─────────────────────────────────────────────────────────────

function initSearch(onArtistSearch, onGenreSearch) {
  const tabs        = document.querySelectorAll('.search-tab');
  const paneArtist  = document.getElementById('pane-artist');
  const paneGenre   = document.getElementById('pane-genre');
  const artistInput = document.getElementById('input-artist');
  const genreInput  = document.getElementById('input-genre');
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
    document.getElementById('genreChips').querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
    await onGenreSearch(g);
  }
  genreInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') runGenreSearch(genreInput.value);
  });
  if (genreIcon) genreIcon.addEventListener('click', () => runGenreSearch(genreInput.value));
}
