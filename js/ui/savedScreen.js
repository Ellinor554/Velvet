import { getSaved } from '../services/discoveryService.js';
import { showToast } from './toast.js';

export function initSavedScreen() {
  // Single delegated listener on the stable container — survives innerHTML swaps.
  document.getElementById('savedList').addEventListener('click', e => {
    const btn = e.target.closest('.btn-spotify');
    if (btn) showToast(`Opening Spotify for ${btn.dataset.artist}…`);
  });
}

export function renderSavedScreen() {
  const saved = getSaved();

  document.getElementById('savedCount').textContent =
    `${saved.length} hidden gem${saved.length !== 1 ? 's' : ''} saved`;

  document.getElementById('savedList').innerHTML = saved.length
    ? saved.map(a => `
        <div class="saved-row">
          <div class="saved-icon"><i class="ti ${a.icon}" aria-hidden="true"></i></div>
          <div class="saved-info">
            <h3>${a.name}</h3>
            <p>${a.genre}</p>
            <div class="saved-underbar">
              <div class="saved-meter-mini">
                <div class="saved-meter-fill-mini" style="width:${100 - a.underground * 2.5}%"></div>
              </div>
              <span class="saved-pct">${a.underground}% known</span>
            </div>
          </div>
          <button class="btn-spotify" data-artist="${a.name}">
            <i class="ti ti-external-link" aria-hidden="true"></i> Spotify
          </button>
        </div>
      `).join('')
    : `<div class="empty-saved">
         <i class="ti ti-music-off" aria-hidden="true"></i>
         <p>Nothing saved yet — head to Discover and tap the heart</p>
       </div>`;
}
