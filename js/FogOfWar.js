/**
 * FogOfWar.js — Brouillard de guerre par zones polygonales
 *
 * Définir les pièces dans le fichier data de la map :
 *
 *   export const rooms = [
 *     { id: "room_01", label: "Entrée",  points: [[x1,y1],[x2,y2],[x3,y3]] },
 *   ];
 */
import { canvasNaturalCoords } from './utils.js';

export class FogOfWar {

  /**
   * @param {HTMLElement} mapEl
   * @param {object}      options
   * @param {string}      options.mapKey          Clé localStorage
   * @param {number}      options.mapWidth         Largeur naturelle (px)
   * @param {number}      options.mapHeight        Hauteur naturelle (px)
   * @param {Array}       [options.rooms]          Définition des pièces
   * @param {string}      [options.fogColor]
   * @param {string}      [options.roomBorderFog]
   * @param {string}      [options.roomBorderVis]
   * @param {string}      [options.enemySelector]
   * @param {() => number} [options.getZoom]
   */
  constructor(mapEl, options = {}) {
    if (!mapEl) throw new Error('FogOfWar : élément map requis');

    this.map  = mapEl;
    this.opts = {
      mapKey        : 'fog_default',
      mapWidth      : 1000,
      mapHeight     : 1000,
      rooms         : [],
      fogColor      : 'rgba(6, 6, 10, 1)',
      roomBorderFog : 'rgba(255, 180, 0, 0.18)',
      roomBorderVis : 'rgba(255, 180, 0, 0.06)',
      enemySelector : '.ennemi',
      getZoom       : () => 1,
      ...options,
    };

    this.enabled    = false;
    this.toolActive = false;
    this.revealed   = new Set();
    this.hoveredId  = null;

    this._buildCanvas();
    this._buildFogOverlay();
    this._load();
    this._render();

    // Les boutons toolbar sont bindés depuis l'extérieur via bindToolbar()
    // pour éviter tout couplage temporel ou polling.
  }

  /* ─── Binding toolbar (appelé par main.js après initToolbar) ── */

  /**
   * Connecte les boutons de la toolbar au fog.
   * À appeler une fois que la toolbar est dans le DOM.
   *
   * @param {{ toggle: HTMLElement, reveal: HTMLElement, reset: HTMLElement }} buttons
   */
  bindToolbar({ toggle, reveal, reset }) {
    toggle?.addEventListener('click', () => this.toggle());
    reveal?.addEventListener('click', () => this.toggleTool());
    reset?.addEventListener('click',  () => this._confirmReset());
  }

  /* ─── Canvas ──────────────────────────────────────────────────── */

  _buildCanvas() {
    this.canvas        = document.createElement('canvas');
    this.canvas.id     = 'fog-canvas';
    this.canvas.width  = this.opts.mapWidth;
    this.canvas.height = this.opts.mapHeight;
    Object.assign(this.canvas.style, {
      position      : 'absolute',
      top           : '0',
      left          : '0',
      zIndex        : '11',
      pointerEvents : 'none',
    });
    this.map.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  /* ─── Overlay clics ───────────────────────────────────────────── */

  _buildFogOverlay() {
    this.overlay    = document.createElement('div');
    this.overlay.id = 'fog-overlay';
    Object.assign(this.overlay.style, {
      position      : 'absolute',
      top           : '0',
      left          : '0',
      width         : '100%',
      height        : '100%',
      zIndex        : '12',
      display       : 'none',
      cursor        : 'crosshair',
    });
    this.map.appendChild(this.overlay);

    // Si un token est sous le curseur, lui céder l'événement
    this.overlay.addEventListener('mousedown', (e) => {
      this.overlay.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      this.overlay.style.pointerEvents = 'auto';

      if (under?.classList.contains('player')) {
        under.dispatchEvent(new MouseEvent('mousedown', {
          bubbles    : true,
          cancelable : true,
          clientX    : e.clientX,
          clientY    : e.clientY,
          button     : e.button,
          buttons    : e.buttons,
        }));
      }
    });

    this.overlay.addEventListener('click',      this._onOverlayClick.bind(this));
    this.overlay.addEventListener('mousemove',  this._onOverlayMove.bind(this));
    this.overlay.addEventListener('mouseleave', this._onOverlayLeave.bind(this));
  }

  /* ─── Rendu ───────────────────────────────────────────────────── */

  _render() {
    const { canvas, ctx, opts, enabled, revealed, hoveredId } = this;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    if (!enabled) {
      this._updateEnemyVisibility();
      return;
    }

    if (!opts.rooms || opts.rooms.length === 0) {
      ctx.fillStyle = opts.fogColor;
      ctx.fillRect(0, 0, width, height);
      this._updateEnemyVisibility();
      return;
    }

    // Pièces masquées
    opts.rooms.forEach(room => {
      if (revealed.has(room.id)) return;
      const isHovered = hoveredId === room.id;

      ctx.beginPath();
      this._tracePath(ctx, room.points);
      ctx.closePath();

      ctx.fillStyle = isHovered ? 'rgba(255, 180, 0, 0.35)' : opts.fogColor;
      ctx.fill();

      ctx.strokeStyle = isHovered ? 'rgba(255, 200, 50, 0.85)' : opts.roomBorderFog;
      ctx.lineWidth   = isHovered ? 2 : 1.5;
      ctx.stroke();
    });

    // Pièces révélées
    opts.rooms.forEach(room => {
      if (!revealed.has(room.id)) return;
      const isHovered = hoveredId === room.id;

      ctx.beginPath();
      this._tracePath(ctx, room.points);
      ctx.closePath();

      if (isHovered) {
        ctx.fillStyle   = 'rgba(255, 60, 60, 0.22)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.7)';
        ctx.lineWidth   = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = opts.roomBorderVis;
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
    });

    this._updateEnemyVisibility();
  }

  _tracePath(ctx, points) {
    if (!points || points.length < 2) return;
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  }

  /* ─── Hit-test polygone (ray casting) ────────────────────────── */

  _pointInRoom(x, y, room) {
    const pts = room.points;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1];
      const xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi))
        inside = !inside;
    }
    return inside;
  }

  _roomAt(x, y) {
    return this.opts.rooms.find(r => this._pointInRoom(x, y, r)) ?? null;
  }

  /* ─── Événements overlay ──────────────────────────────────────── */

  _onOverlayClick(e) {
    if (!this.toolActive || !this.enabled) return;

    // Ne pas traiter si un token est sous le curseur
    this.overlay.style.pointerEvents = 'none';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    this.overlay.style.pointerEvents = 'auto';
    if (under?.classList.contains('player')) return;

    const { x, y } = canvasNaturalCoords(this.canvas, e);
    const room = this._roomAt(x, y);
    if (!room) return;

    if (this.revealed.has(room.id)) this.revealed.delete(room.id);
    else                            this.revealed.add(room.id);

    this._render();
    this._save();
    this._flashSaveIndicator();
  }

  _onOverlayMove(e) {
    if (!this.enabled) return;
    const { x, y } = canvasNaturalCoords(this.canvas, e);
    const room  = this._roomAt(x, y);
    const newId = room?.id ?? null;

    if (newId !== this.hoveredId) {
      this.hoveredId = newId;
      this._render();
    }
  }

  _onOverlayLeave() {
    this.hoveredId = null;
    this._render();
  }

  /* ─── Visibilité ennemis ──────────────────────────────────────── */

  _isInFog(el) {
    if (!this.enabled) return false;
    if (!this.opts.rooms || this.opts.rooms.length === 0) return true;
    const cx   = parseFloat(el.style.left) + (el.offsetWidth  || 35) / 2;
    const cy   = parseFloat(el.style.top)  + (el.offsetHeight || 35) / 2;
    const room = this._roomAt(cx, cy);
    return room ? !this.revealed.has(room.id) : false;
  }

  _updateEnemyVisibility() {
    document.querySelectorAll(this.opts.enemySelector).forEach(el => {
      const hidden = this._isInFog(el);
      el.style.visibility    = hidden ? 'hidden' : 'visible';
      el.style.pointerEvents = hidden ? 'none'   : '';
    });
  }

  refreshEnemyVisibility() {
    this._updateEnemyVisibility();
  }

  /* ─── Contrôles publics ───────────────────────────────────────── */

  toggle() {
    this.enabled = !this.enabled;

    document.getElementById('fog-btn-toggle')?.classList.toggle('active', this.enabled);
    document.getElementById('fog-btn-reveal')?.toggleAttribute('disabled', !this.enabled);
    document.getElementById('fog-btn-reset')?.toggleAttribute('disabled',  !this.enabled);

    if (!this.enabled && this.toolActive) this.toggleTool();

    this._render();
    this._save();
  }

  toggleTool() {
    this.toolActive = !this.toolActive;
    document.getElementById('fog-btn-reveal')?.classList.toggle('active', this.toolActive);

    const hint = document.getElementById('fog-hint');
    if (hint) hint.style.opacity = this.toolActive ? '1' : '0';

    this.overlay.style.display = this.toolActive ? 'block' : 'none';

    if (!this.toolActive) {
      this.hoveredId = null;
      this._render();
    }
  }

  _confirmReset() {
    if (!this.enabled) return;
    const btn = document.getElementById('fog-btn-reset');
    if (!btn) return;
    if (btn.dataset.confirm === '1') {
      this.reset();
      btn.innerHTML = '↺ RESET';
      delete btn.dataset.confirm;
    } else {
      btn.innerHTML = '⚠ CONFIRMER ?';
      btn.dataset.confirm = '1';
      setTimeout(() => {
        if (btn.dataset.confirm) {
          btn.innerHTML = '↺ RESET';
          delete btn.dataset.confirm;
        }
      }, 2500);
    }
  }

  reset() {
    this.revealed.clear();
    this._render();
    this._save();
    this._flashSaveIndicator();
  }

  /* ─── Persistance ─────────────────────────────────────────────── */

  _save() {
    try {
      localStorage.setItem(this.opts.mapKey, JSON.stringify({
        revealed : [...this.revealed],
        enabled  : this.enabled,
      }));
    } catch (e) { console.warn('FogOfWar : échec sauvegarde', e); }
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.opts.mapKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.revealed)) this.revealed = new Set(data.revealed);
      if (data.enabled) { this.enabled = false; this.toggle(); }
    } catch (e) { console.warn('FogOfWar : échec lecture', e); }
  }

  /* ─── Indicateur sauvegarde ───────────────────────────────────── */

  _flashSaveIndicator() {
    const el = document.getElementById('fog-save-indicator');
    if (!el) return;
    el.classList.add('active');
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => el.classList.remove('active'), 2000);
  }
}
