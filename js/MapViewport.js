/**
 * MapViewport.js — Zoom & pan de la carte
 */
export class MapViewport {

  /**
   * @param {object}          options
   * @param {number}          options.mapWidth      Largeur naturelle de la map (px)
   * @param {number}          options.mapHeight     Hauteur naturelle de la map (px)
   * @param {number}          [options.initialZoom] Zoom de départ (défaut 0.35)
   * @param {() => boolean}   [options.isFogActive]   Callback → fog tool actif ?
   * @param {() => boolean}   [options.isEditorActive] Callback → éditeur actif ?
   */
  constructor(options = {}) {
    this.mapWidth  = options.mapWidth;
    this.mapHeight = options.mapHeight;
    this.zoom  = options.initialZoom ?? 0.35;
    this.panX  = 0;
    this.panY  = 0;

    // Callbacks externes pour savoir si un autre outil est actif
    this._isFogActive    = options.isFogActive    ?? (() => false);
    this._isEditorActive = options.isEditorActive ?? (() => false);

    this._panReady       = false;
    this._isPanning      = false;
    this._movedDuringPan = false;
    this._lastX          = 0;
    this._lastY          = 0;
    this._panStartX      = 0;
    this._panStartY      = 0;

    this.content = document.querySelector('.content');
    this.map     = document.querySelector('.map');

    this._setup();
  }

  /* ─── Init ──────────────────────────────────────────────────── */

  _setup() {
    Object.assign(this.content.style, {
      position : 'fixed',
      top      : '0',
      left     : '0',
      width    : '100vw',
      height   : '100vh',
      overflow : 'hidden',
      margin   : '0',
      padding  : '0',
    });
    this.map.style.transformOrigin = '0 0';
    this.map.style.willChange      = 'transform';

    this._center();
    this._apply();

    this.content.addEventListener('wheel',     this._onWheel.bind(this),   { passive: false });
    this.content.addEventListener('mousedown', this._onMouseDown.bind(this));
    document.addEventListener('mousemove',     this._onMouseMove.bind(this));
    document.addEventListener('mouseup',       this._onMouseUp.bind(this));
  }

  _center() {
    const mapW = this.mapWidth  * this.zoom;
    const mapH = this.mapHeight * this.zoom;
    this.panX  = Math.max(20, (window.innerWidth  - mapW) / 2);
    this.panY  = Math.max(20, (window.innerHeight - mapH) / 2);
  }

  _apply() {
    this.map.style.transform = `translate(${this.panX}px,${this.panY}px) scale(${this.zoom})`;
    const el = document.getElementById('vp-zoom-val');
    if (el) el.textContent = Math.round(this.zoom * 100) + '%';
  }

  /* ─── Événements ────────────────────────────────────────────── */

  _onWheel(e) {
    e.preventDefault();
    const factor  = e.deltaY < 0 ? 1.1 : 0.909;
    const newZoom = Math.min(Math.max(this.zoom * factor, 0.08), 4);
    const nx = (e.clientX - this.panX) / this.zoom;
    const ny = (e.clientY - this.panY) / this.zoom;
    this.zoom = newZoom;
    this.panX = e.clientX - nx * this.zoom;
    this.panY = e.clientY - ny * this.zoom;
    this._apply();
  }

  _onMouseDown(e) {
    const onToken   = e.target.closest('.player, .tiles');
    const onToolbar = e.target.closest('#vtt-toolbar, #fog-room-label');
    const isPan = e.button === 1
      || (e.button === 0 && !onToken && !onToolbar && !this._isFogActive() && !this._isEditorActive());

    if (isPan) {
      this._panReady       = true;
      this._isPanning      = false;
      this._movedDuringPan = false;
      this._panStartX      = e.clientX;
      this._panStartY      = e.clientY;
      this._lastX          = e.clientX;
      this._lastY          = e.clientY;
      if (e.button === 1) e.preventDefault();
    }
  }

  _onMouseMove(e) {
    if (!this._panReady) return;
    const dx = e.clientX - this._panStartX;
    const dy = e.clientY - this._panStartY;
    if (!this._isPanning && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      this._isPanning      = true;
      this._movedDuringPan = true;
      this.content.style.cursor = 'grabbing';
    }
    if (this._isPanning) {
      this.panX += e.clientX - this._lastX;
      this.panY += e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this._apply();
    }
  }

  _onMouseUp() {
    this._panReady = false;
    if (this._isPanning) {
      this._isPanning = false;
      this.content.style.cursor = '';
    }
  }

  /* ─── API publique ──────────────────────────────────────────── */

  resetZoom() {
    this.zoom = 1;
    this._center();
    this._apply();
  }

  /** Convertit des coordonnées écran en coordonnées map naturelles */
  toMapCoords(clientX, clientY) {
    return {
      x: Math.round((clientX - this.panX) / this.zoom),
      y: Math.round((clientY - this.panY) / this.zoom),
    };
  }
}
