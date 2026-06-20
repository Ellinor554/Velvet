/**
 * Navigation module.
 *
 * initNav() is called once by app.js. After that, switchScreen() can be
 * imported and called directly by any UI module — no callback threading needed.
 */

let _onScreenChange = null;

/**
 * Wire nav button clicks and register a lifecycle callback.
 * @param {(screenId: string) => void} onScreenChange
 */
export function initNav(onScreenChange) {
  _onScreenChange = onScreenChange;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.id.replace('nav-', '')));
  });
}

/**
 * Activate a screen by id ('home' | 'discover' | 'saved').
 * Can be called from any UI module.
 * @param {string} id
 */
export function switchScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`screen-${id}`).classList.add('active');
  document.getElementById(`nav-${id}`).classList.add('active');
  _onScreenChange?.(id);
}

/**
 * @param {number} count
 */
export function updateSavedBadge(count) {
  document.getElementById('nav-saved').querySelector('span').textContent =
    count > 0 ? `Saved (${count})` : 'Saved';
}
