/**
 * drag.js — Drag & drop natif pour tokens positionnés en absolu
 *
 * Remplace displace.js (lib externe minifiée) par du JS vanilla pur.
 * Supporte souris et touch.
 *
 * Usage :
 *   import { makeDraggable } from './drag.js';
 *   makeDraggable(el, { onMouseDown, onMouseUp });
 */

/**
 * Rend un élément déplaçable librement (position: absolute).
 *
 * @param {HTMLElement} el                  L'élément à rendre draggable
 * @param {object}      [opts]
 * @param {Function}    [opts.onMouseDown]  Callback au début du drag  (el) => void
 * @param {Function}    [opts.onMouseUp]    Callback à la fin du drag  (el) => void
 * @param {Function}    [opts.onMouseMove]  Callback pendant le drag   (el) => void
 */
export function makeDraggable(el, opts = {}) {
  el.addEventListener('mousedown', (e) => _startDrag(e, el, opts));
  el.addEventListener('touchstart', (e) => _startTouch(e, el, opts), { passive: false });
}

/* ─── Souris ────────────────────────────────────────────────────── */

function _startDrag(e, el, opts) {
  if (e.button !== 0) return;
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;

  e.preventDefault();

  const origLeft = parseFloat(el.style.left) || 0;
  const origTop  = parseFloat(el.style.top)  || 0;
  const startX   = e.clientX;
  const startY   = e.clientY;

  opts.onMouseDown?.(el);

  const onMove = (e) => {
    const zoom = opts.getZoom?.() ?? 1;
    _moveTo(el,
      origLeft + (e.clientX - startX) / zoom,
      origTop  + (e.clientY - startY) / zoom,
    );
    opts.onMouseMove?.(el);
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
    opts.onMouseUp?.(el);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
}

/* ─── Touch ─────────────────────────────────────────────────────── */

function _startTouch(e, el, opts) {
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;

  const touch    = e.targetTouches[0];
  const origLeft = parseFloat(el.style.left) || 0;
  const origTop  = parseFloat(el.style.top)  || 0;
  const startX   = touch.clientX;
  const startY   = touch.clientY;

  opts.onMouseDown?.(el);

  const onMove = (e) => {
    e.preventDefault();
    const t    = e.targetTouches[0];
    const zoom = opts.getZoom?.() ?? 1;
    _moveTo(el,
      origLeft + (t.clientX - startX) / zoom,
      origTop  + (t.clientY - startY) / zoom,
    );
    opts.onMouseMove?.(el);
  };

  const onEnd = () => {
    document.removeEventListener('touchmove',   onMove);
    document.removeEventListener('touchend',    onEnd);
    document.removeEventListener('touchcancel', onEnd);
    opts.onMouseUp?.(el);
  };

  document.addEventListener('touchmove',   onMove, { passive: false });
  document.addEventListener('touchend',    onEnd);
  document.addEventListener('touchcancel', onEnd);
}

/* ─── Helper ────────────────────────────────────────────────────── */

function _moveTo(el, left, top) {
  el.style.left = left + 'px';
  el.style.top  = top  + 'px';
}
