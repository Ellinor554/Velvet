import { getSavedGenres, addGenre } from '../core/genres.js';

const GENRE_OPTIONS = [
  'Post-punk', 'Shoegaze', 'Dream Pop', 'Darkwave', 'Lo-Fi',
  'Bedroom Pop', 'Ambient', 'Indie Folk', 'Neo-Psychedelic',
  'Noise Pop', 'Dark Jazz', 'Experimental', 'Slowcore', 'Coldwave',
  'Drone', 'Gothic Rock',
];

export function shouldShowOnboarding() {
  return getSavedGenres().length === 0;
}

/** Returns a Promise that resolves once the user finishes the onboarding flow. */
export function showOnboarding() {
  return new Promise(resolve => {
    const selected = new Set();

    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-card">
        <div class="onboarding-title">Build your late-night aesthetic</div>
        <p class="onboarding-sub">Select 3–5 genres to personalize your underground feed.</p>
        <div class="onboarding-genres" id="obGenres">
          ${GENRE_OPTIONS.map(g => `
            <button class="ob-chip" data-genre="${g.toLowerCase()}">${g}</button>
          `).join('')}
        </div>
        <p class="onboarding-counter" id="obCounter">0 of 3 selected</p>
        <button class="btn-ob-done" id="btnObDone" disabled>Continue</button>
      </div>`;

    document.body.appendChild(overlay);

    const counter = overlay.querySelector('#obCounter');
    const doneBtn = overlay.querySelector('#btnObDone');

    overlay.querySelector('#obGenres').addEventListener('click', e => {
      const chip = e.target.closest('.ob-chip');
      if (!chip) return;
      const genre = chip.dataset.genre;

      if (selected.has(genre)) {
        selected.delete(genre);
        chip.classList.remove('selected');
      } else {
        if (selected.size >= 5) return;
        selected.add(genre);
        chip.classList.add('selected');
      }

      const n = selected.size;
      counter.textContent = `${n} of 3–5 selected`;
      doneBtn.disabled = n < 3;
    });

    doneBtn.addEventListener('click', () => {
      selected.forEach(g => addGenre(g));
      overlay.remove();
      resolve();
    });
  });
}
