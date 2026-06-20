import { getRecommendations } from '../services/discoveryService.js';
import { switchScreen } from './nav.js';

export async function initHomeScreen() {
  await renderRecommendations();
  initPills();
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
