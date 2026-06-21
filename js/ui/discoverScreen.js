import { getFeed, saveArtist } from '../services/discoveryService.js';
import { showToast }            from './toast.js';

/** @type {import('../services/discoveryService.js').Artist[]} */
let feed       = [];
let currentIdx = 0;

// ── Card rendering ────────────────────────────────────────────────────────────

export async function initDiscoverScreen() {
  feed = await getFeed();

  document.getElementById('btn-skip').addEventListener('click', skipArtist);
  document.getElementById('btn-heart').addEventListener('click', heartArtist);
  document.getElementById('btn-info').addEventListener('click', () =>
    showToast('Tap the heart to save this artist')
  );
  document.getElementById('endCard').addEventListener('click', e => {
    if (e.target.closest('.btn-restart')) resetDeck();
  });

  // Event delegation — survives card re-renders
  document.getElementById('artistCard').addEventListener('click', e => {
    const btn = e.target.closest('.btn-spotify-open');
    if (!btn) return;
    const url = btn.dataset.spotifyUrl;
    if (url) window.open(url, '_blank', 'noopener');
  });

  renderCard();
}

function renderCard() {
  const card    = document.getElementById('artistCard');
  const endCard = document.getElementById('endCard');
  const hint    = document.getElementById('actionHint');
  const btns    = document.querySelectorAll('.action-row button');

  if (currentIdx >= feed.length) {
    card.style.display    = 'none';
    endCard.style.display = 'block';
    hint.style.display    = 'none';
    btns.forEach(b => b.style.opacity = '0.3');
    return;
  }

  card.style.display    = 'block';
  endCard.style.display = 'none';
  hint.style.display    = 'block';
  btns.forEach(b => b.style.opacity = '1');

  const a           = feed[currentIdx];
  const spotifyUrl  = a.platforms?.spotify?.url ?? '';

  card.innerHTML = `
    <div class="card-image" style="background:${a.bg}">
      <i class="ti ${a.icon} card-img-icon" aria-hidden="true"></i>
      <div class="card-underground">
        <div class="underground-label">Underground</div>
        <div class="underground-val">${a.underground}%</div>
      </div>
    </div>
    <div class="card-meter-wrap">
      <div class="card-meter-label"><span>Mainstream</span><span>Hidden gem</span></div>
      <div class="card-meter-track">
        <div class="card-meter-fill" style="width:${100 - a.underground * 2.5}%"></div>
      </div>
    </div>
    <div class="card-body">
      <div class="card-artist-name">${a.name}</div>
      <div class="card-genre">${a.genre}</div>
      <div class="card-bio">${a.bio}</div>
      <div class="card-tags">${a.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}</div>
      ${spotifyUrl ? `
      <button class="btn-spotify btn-spotify-open" data-spotify-url="${spotifyUrl}" aria-label="Open on Spotify">
        <i class="ti ti-brand-spotify"></i> Open on Spotify
      </button>` : ''}
    </div>
  `;

  document.getElementById('progDots').innerHTML = feed.map((_, i) =>
    `<div class="prog-dot ${i < currentIdx ? 'done' : i === currentIdx ? 'current' : ''}"></div>`
  ).join('');
  document.getElementById('cardCounter').textContent = `${currentIdx + 1} / ${feed.length}`;
}

function skipArtist() {
  if (currentIdx >= feed.length) return;
  animateCard('left');
  setTimeout(() => { currentIdx++; renderCard(); }, 220);
}

function heartArtist() {
  if (currentIdx >= feed.length) return;
  const artist = feed[currentIdx];
  const nowSaved = saveArtist(artist);
  showToast(nowSaved ? `Saved "${artist.name}"` : `Removed "${artist.name}"`);
  animateCard('right');
  setTimeout(() => { currentIdx++; renderCard(); }, 220);
}

function animateCard(dir) {
  const card = document.getElementById('artistCard');
  const x    = dir === 'left' ? '-80px' : '80px';
  const deg  = dir === 'left' ? '-4deg' : '4deg';
  card.style.transition = 'transform 0.22s, opacity 0.22s';
  card.style.transform  = `translateX(${x}) rotate(${deg})`;
  card.style.opacity    = '0';
  setTimeout(() => {
    card.style.transition = 'none';
    card.style.transform  = '';
    card.style.opacity    = '1';
  }, 240);
}

function resetDeck() {
  currentIdx = 0;
  renderCard();
}

export function loadArtists(artists) {
  feed       = artists;
  currentIdx = 0;
  renderCard();
}

export function setLoading(on) {
  const card = document.getElementById('artistCard');
  const hint = document.getElementById('actionHint');
  const btns = document.querySelectorAll('.action-row button');
  if (on) {
    card.style.display = 'block';
    card.innerHTML = `
      <div style="height:300px;display:flex;align-items:center;justify-content:center;
                  flex-direction:column;gap:12px;color:var(--esp-muted)">
        <i class="ti ti-loader-2" style="font-size:36px"></i>
        <p style="font-size:13px;letter-spacing:0.05em">Finding underground artists…</p>
      </div>`;
    document.getElementById('endCard').style.display = 'none';
    hint.style.display = 'none';
    btns.forEach(b => b.style.opacity = '0.3');
  }
}
