/**
 * RoomEditor.js — Mode édition de polygones pour FogOfWar
 *
 * Workflow :
 *   1. "MODE ÉDITION" dans la toolbar
 *   2. Cliquer sur la carte pour poser des points
 *   3. Double-clic OU bouton "Clore" pour fermer le polygone
 *   4. Saisir id + label → Valider
 *   5. "EXPORTER → CONSOLE" : coller le bloc dans votre data file
 */
import { canvasNaturalCoords } from './utils.js';

export class RoomEditor {

  /**
   * @param {HTMLElement}     mapEl
   * @param {object}          options
   * @param {number}          options.mapWidth
   * @param {number}          options.mapHeight
   * @param {Array}           [options.rooms]      Rooms initiales (depuis data file)
   * @param {() => object}    options.getViewport  Retourne l'instance MapViewport
   */
  constructor(mapEl, options = {}) {
    this.map         = mapEl;
    this.mapWidth    = options.mapWidth;
    this.mapHeight   = options.mapHeight;
    this.getViewport = options.getViewport ?? (() => null);
    this.active      = false;
    this.points      = [];
    this.rooms       = (options.rooms ?? []).map(r => ({ ...r }));
    this.mousePos    = { x: 0, y: 0 };

    this._buildCanvas();
    this._buildOverlay();

    // Pré-charger la liste des rooms dans la toolbar (sans afficher le canvas)
    if (this.rooms.length > 0) {
      setTimeout(() => this._updateRoomList(), 250);
    }
  }

  /* ─── Canvas ────────────────────────────────────────────────── */

  _buildCanvas() {
    this.canvas        = document.createElement('canvas');
    this.canvas.id     = 'editor-canvas';
    this.canvas.width  = this.mapWidth;
    this.canvas.height = this.mapHeight;
    Object.assign(this.canvas.style, {
      position      : 'absolute',
      top           : '0',
      left          : '0',
      zIndex        : '20',
      pointerEvents : 'none',
      display       : 'none',
    });
    this.map.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  /* ─── Overlay clics ─────────────────────────────────────────── */

  _buildOverlay() {
    this.overlay    = document.createElement('div');
    this.overlay.id = 'editor-overlay';
    Object.assign(this.overlay.style, {
      position : 'absolute',
      top      : '0',
      left     : '0',
      width    : '100%',
      height   : '100%',
      zIndex   : '21',
      display  : 'none',
      cursor   : 'crosshair',
    });
    this.map.appendChild(this.overlay);

    let lastClick = 0;
    this.overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastClick < 380) return; // ignore 2e clic du dblclick
      lastClick = now;
      const { x, y } = canvasNaturalCoords(this.canvas, e);
      this.points.push([x, y]);
      this._updateUI();
      this._render();
    });

    this.overlay.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this._closePolygon();
    });

    this.overlay.addEventListener('mousemove', (e) => {
      const { x, y } = canvasNaturalCoords(this.canvas, e);
      this.mousePos = { x, y };
      this._render();
    });
  }

  /* ─── Contrôles publics ─────────────────────────────────────── */

  toggle() {
    this.active = !this.active;
    document.getElementById('editor-btn-toggle')?.classList.toggle('active', this.active);

    if (this.active) {
      this.canvas.style.display  = 'block';
      this.overlay.style.display = 'block';
    } else {
      this.canvas.style.display  = 'none';
      this.overlay.style.display = 'none';
      this.points = [];
      this._updateUI();
      const formArea = document.getElementById('editor-form-area');
      if (formArea) formArea.style.display = 'none';
    }
    this._render();
  }

  undoPoint() {
    this.points.pop();
    this._updateUI();
    this._render();
  }

  clearCurrent() {
    this.points = [];
    this._updateUI();
    this._render();
  }

  _updateUI() {
    const n  = this.points.length;
    const el = document.getElementById('editor-point-count');
    if (el) el.textContent = n + ' pt' + (n > 1 ? 's' : '');
    const closeBtn = document.getElementById('editor-btn-close');
    if (closeBtn) closeBtn.disabled = n < 3;
  }

  /* ─── Fermeture polygone ────────────────────────────────────── */

  _closePolygon() {
    if (this.points.length < 3) return;
    this._showForm();
  }

  _showForm() {
    const area = document.getElementById('editor-form-area');
    if (!area) return;
    const nextId = 'room_' + String(this.rooms.length + 1).padStart(2, '0');
    area.style.display = 'block';
    area.innerHTML = `
      <div class="editor-form-title">Nommer la pièce</div>
      <input id="ed-input-id"    class="editor-input" type="text" value="${nextId}" placeholder="id" spellcheck="false"/>
      <input id="ed-input-label" class="editor-input" type="text" placeholder="Label (ex: Entrée)" spellcheck="false"/>
      <div class="tb-row" style="margin-top:4px">
        <button class="tb-btn"               id="ed-btn-ok">✔ Valider</button>
        <button class="tb-btn tb-btn-danger" id="ed-btn-cancel">✕</button>
      </div>`;

    setTimeout(() => document.getElementById('ed-input-label')?.focus(), 40);

    document.getElementById('ed-btn-ok').addEventListener('click', () => {
      const id    = document.getElementById('ed-input-id').value.trim()    || nextId;
      const label = document.getElementById('ed-input-label').value.trim() || id;
      this._validateRoom(id, label);
      area.style.display = 'none';
    });

    document.getElementById('ed-btn-cancel').addEventListener('click', () => {
      area.style.display = 'none';
    });
  }

  _validateRoom(id, label) {
    const room = { id, label, points: [...this.points] };
    const idx  = this.rooms.findIndex(r => r.id === id);
    if (idx >= 0) this.rooms.splice(idx, 1, room);
    else          this.rooms.push(room);
    this.points = [];
    this._updateUI();
    this._updateRoomList();
    this._render();
  }

  /* ─── Rendu canvas ──────────────────────────────────────────── */

  _render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ne rien afficher si l'éditeur est fermé
    if (!this.active) return;

    this._renderRooms();

    const pts = this.points;
    if (!this.active || pts.length === 0) return;

    // Remplissage polygone en cours
    if (pts.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,180,0,0.13)';
      ctx.fill();
    }

    // Contour tirets
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.strokeStyle = 'rgba(255,200,50,0.9)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Preview vers souris
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.moveTo(last[0], last[1]);
    ctx.lineTo(this.mousePos.x, this.mousePos.y);
    ctx.strokeStyle = 'rgba(255,200,50,0.4)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Snap circle sur 1er point
    const vp       = this.getViewport();
    const snapDist = 22 / (vp?.zoom ?? 1);
    if (pts.length >= 3 && Math.hypot(this.mousePos.x - pts[0][0], this.mousePos.y - pts[0][1]) < snapDist) {
      ctx.beginPath();
      ctx.arc(pts[0][0], pts[0][1], snapDist, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100,255,100,0.8)';
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    // Points
    pts.forEach(([x, y], i) => {
      ctx.beginPath();
      ctx.arc(x, y, i === 0 ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle   = i === 0 ? 'rgba(100,255,100,0.9)' : 'rgba(255,200,50,0.9)';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    });
  }

  _renderRooms() {
    const { ctx } = this;
    this.rooms.forEach(room => {
      if (!room.points || room.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(room.points[0][0], room.points[0][1]);
      room.points.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fillStyle   = 'rgba(114,255,0,0.07)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(114,255,0,0.6)';
      ctx.lineWidth   = 2;
      ctx.stroke();

      // Label centré
      const cx = room.points.reduce((s, p) => s + p[0], 0) / room.points.length;
      const cy = room.points.reduce((s, p) => s + p[1], 0) / room.points.length;
      ctx.fillStyle    = 'rgba(114,255,0,0.9)';
      ctx.font         = 'bold 20px Courier New';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.label || room.id, cx, cy);
    });
  }

  /* ─── Liste rooms dans toolbar ──────────────────────────────── */

  _updateRoomList() {
    const list = document.getElementById('editor-room-list');
    if (!list) return;

    if (this.rooms.length === 0) {
      list.innerHTML = '<div class="editor-empty">Aucune room définie</div>';
      return;
    }

    list.innerHTML = this.rooms.map(r => `
      <div class="editor-room-item">
        <span class="editor-room-lbl" title="${r.id}">${r.label}</span>
        <span class="editor-room-pts">${r.points.length}pts</span>
        <button class="editor-room-del" data-id="${r.id}">✕</button>
      </div>`).join('');

    list.querySelectorAll('.editor-room-del').forEach(btn =>
      btn.addEventListener('click', () => {
        this.rooms = this.rooms.filter(r => r.id !== btn.dataset.id);
        this._updateRoomList();
        this._render();
      })
    );
  }

  /* ─── Export ────────────────────────────────────────────────── */

  exportToConsole() {
    if (this.rooms.length === 0) { console.warn('RoomEditor : aucune room.'); return; }

    const lines = this.rooms.map(r => {
      const pts = r.points.map(([x, y]) => `      [${x}, ${y}]`).join(',\n');
      return `  {\n    id    : "${r.id}",\n    label : "${r.label}",\n    points: [\n${pts},\n    ],\n  }`;
    });
    const out = `export const rooms = [\n${lines.join(',\n\n')}\n];`;

    console.log('%c─── rooms export ───────────────────────────────────────────', 'color:#72ff00;font-weight:bold');
    console.log('%c' + out, 'color:#ffa500;font-family:monospace;font-size:12px');
    console.log('%c────────────────────────────────────────────────────────────', 'color:#72ff00;font-weight:bold');

    const btn = document.getElementById('editor-btn-export');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✔ COPIÉ CONSOLE';
      btn.classList.add('active');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('active'); }, 2000);
    }
  }
}
