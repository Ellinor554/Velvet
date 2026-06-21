import { getFeed, saveArtist } from '../services/discoveryService.js';
import { WORKER_URL }          from '../services/platforms/spotify.js';
import { showToast }            from './toast.js';

/** @type {import('../services/discoveryService.js').Artist[]} */
let feed       = [];
let currentIdx = 0;

// ── Audio state ───────────────────────────────────────────────────────────────
let audio      = null;   // current HTMLAudioElement
let playingId  = null;   // Spotify artist ID currently playing/paused

function stopCurrentAudio() {
  if (audio) {
    audio.pause();
    audio = null;
  }
  playingId = null;
  document.querySelectorAll('.btn-preview').forEach(resetBtn);
}

function resetBtn(btn) {
  btn.classList.remove('playing', 'loading');
  btn.querySelector('.preview-icon').className = 'ti ti-player-play preview-icon';
  btn.querySelector('.preview-label').textContent = 'Preview';
}

async function handlePreview(btn, artistId) {
  if (!artistId) { showToast('No preview available'); return; }

  // Same artist — toggle pause / resume
  if (playingId === artistId && audio) {
    if (audio.paused) {
      audio.play();
      btn.classList.add('playing');
      btn.querySelector('.preview-icon').className = 'ti ti-player-pause preview-icon';
      btn.querySelector('.preview-label').textContent = 'Playing';
    } else {
      audio.pause();
      btn.classList.remove('playing');
      btn.querySelector('.preview-icon').className = 'ti ti-player-play preview-icon';
      btn.querySelector('.preview-label').textContent = 'Preview';
    }
    return;
  }

  // New artist — stop whatever was playing
  stopCurrentAudio();
  playingId = artistId;

  // Loading state
  btn.classList.add('loading');
  btn.querySelector('.preview-icon').className = 'ti ti-loader-2 preview-icon';
  btn.querySelector('.preview-label').textContent = 'Loading…';

  try {
    const resp = await fetch(`${WORKER_URL}?tracks_for_artist_id=${artistId}`);
    if (!resp.ok) throw new Error('Worker error');
    const { tracks = [] } = await resp.json();
    const track = tracks.find(t => t.preview_url);

    if (!track) {
      showToast('No preview available for this artist');
      resetBtn(btn);
      playingId = null;
      return;
    }

    audio = new Audio(track.preview_url);
    audio.volume = 0.8;
    await audio.play();

    btn.classList.remove('loading');
    btn.classList.add('playing');
    btn.querySelector('.preview-icon').className = 'ti ti-player-pause preview-icon';
    btn.querySelector('.preview-label').textContent = 'Playing';

    audio.addEventListener('ended', () => {
      resetBtn(btn);
      audio     = null;
      playingId = null;
    });

  } catch {
    showToast('Preview unavailable');
    resetBtn(btn);
    playingId = null;
  }
}

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
    const btn = e.target.closest('.btn-preview');
    if (!btn) return;
    handlePreview(btn, btn.dataset.artistId);
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

  const a          = feed[currentIdx];
  const spotifyId  = a.platforms?.spotify?.id ?? '';
  const isPlaying  = playingId === spotifyId && audio && !audio.paused;
  const isLoading  = playingId === spotifyId && btn => btn?.classList.contains('loading');

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
      ${spotifyId ? `
      <button class="btn-preview ${isPlaying ? 'playing' : ''}" data-artist-id="${spotifyId}" aria-label="Play preview">
        <i class="ti ${isPlaying ? 'ti-player-pause' : 'ti-player-play'} preview-icon"></i>
        <span class="preview-label">${isPlaying ? 'Playing' : 'Preview'}</span>
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
  stopCurrentAudio();
  animateCard('left');
  setTimeout(() => { currentIdx++; renderCard(); }, 220);
}

function heartArtist() {
  if (currentIdx >= feed.length) return;
  const artist = feed[currentIdx];
  const nowSaved = saveArtist(artist);
  showToast(nowSaved ? `Saved "${artist.name}"` : `Removed "${artist.name}"`);
  stopCurrentAudio();
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
  stopCurrentAudio();
  feed       = artists;
  currentIdx = 0;
  renderCard();
}

export function setLoading(on) {
  const card = document.getElementById('artistCard');
  const hint = document.getElementById('actionHint');
  const btns = document.querySelectorAll('.action-row button');
  if (on) {
    stopCurrentAudio();
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
