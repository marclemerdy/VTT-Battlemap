/**
 * utils.js — Utilitaires partagés entre modules
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {MouseEvent} e
 * @returns {{ x: number, y: number }}
 */
export function canvasNaturalCoords(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round((e.clientX - rect.left) * (canvas.width  / rect.width)),
    y: Math.round((e.clientY - rect.top)  * (canvas.height / rect.height)),
  };
}

/**
 * Génère un entier aléatoire entre min et max inclus.
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function genPos(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Tooltip partagé body-level (jamais rotaté avec la map).
 */
let _sharedTooltip = null;

export function attachTooltip(el, name) {
  if (!_sharedTooltip) {
    _sharedTooltip = document.createElement('div');
    _sharedTooltip.id = 'map-tooltip';
    document.body.appendChild(_sharedTooltip);
  }
  const tip = _sharedTooltip;
  el.addEventListener('mouseenter', ()  => { tip.textContent = name; tip.classList.add('visible'); });
  el.addEventListener('mousemove',  (e) => { tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY - 32) + 'px'; });
  el.addEventListener('mouseleave', ()  => tip.classList.remove('visible'));
}
