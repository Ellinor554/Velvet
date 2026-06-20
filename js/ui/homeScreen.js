import { getRecommendations } from '../services/discoveryService.js';
import { switchScreen } from './nav.js';

/**
 * @param {{ onSearch: (query: string) => void }} [options]
 */
export async function initHomeScreen({ onSearch } = {}) {
  await renderRecommendations();
  initPills();
  initSearch(onSearch);
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

function initPills() {
  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

function initSearch(onSearch) {
  const input = document.querySelector('.search-input');
  if (!input || !onSearch) return;

  input.addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    const query = input.value.trim();
    if (!query) return;
    input.blur();
    input.value = '';
    await onSearch(query);
  });
}
