const el = () => document.getElementById('toast');
let timer = null;

export function showToast(message) {
  const t = el();
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => t.classList.remove('show'), 2200);
}
