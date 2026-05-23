/**
 * TokenManager.js — Création et gestion des tokens (PCs et NPCs)
 *
 * Responsabilités :
 *   - Créer les éléments DOM tokens
 *   - Attacher drag (displacejs), tooltip, événements dblclick/contextmenu
 *   - Notifier le FogOfWar après chaque déplacement
 */
import { attachTooltip, genPos } from './utils.js';
import { makeDraggable         } from './drag.js';

export class TokenManager {

  /**
   * @param {object}          options
   * @param {HTMLElement}     options.pcContainer     .map__pc
   * @param {HTMLElement}     options.npcContainer    .map__npc
   * @param {Array}           options.players         Données joueurs
   * @param {Array}           options.npcs            Données PNJs
   * @param {object}          options.playersCoord    Coordonnées de spawn par défaut
   * @param {number}          options.mapWidth        Pour calcul position aléatoire
   * @param {() => object}    [options.getFog]        Retourne l'instance FogOfWar
   */
  constructor(options = {}) {
    this.pcContainer   = options.pcContainer;
    this.npcContainer  = options.npcContainer;
    this.players       = options.players       ?? [];
    this.npcs          = options.npcs          ?? [];
    this.playersCoord  = options.playersCoord  ?? { pc: 650, npc: 2250 };
    this.mapWidth      = options.mapWidth      ?? 1000;
    this.getFog        = options.getFog        ?? (() => null);
    this.getZoom       = options.getZoom       ?? (() => 1);

    /** @type {Array} Instances displacejs retournées */
    this.pcInstances  = [];
    this.npcInstances = [];
  }

  /* ─── Init ──────────────────────────────────────────────────── */

  init() {
    this._initPlayers();
    this._initNpcs();
  }

  _initPlayers() {
    this.pcContainer.innerHTML = '';
    this.pcInstances = this.players.map(p => this._createToken(p, this.pcContainer, false));
  }

  _initNpcs() {
    this.npcContainer.innerHTML = '';
    this.npcInstances = this.npcs.map(n => this._createToken(n, this.npcContainer, true));
  }

  /* ─── Factory token ─────────────────────────────────────────── */

  /**
   * Crée un token DOM, l'insère dans container, attache drag + events.
   *
   * @param {object}      entity   { id, name, type, x?, y? }
   * @param {HTMLElement} container
   * @param {boolean}     isFoe
   * @returns instance displacejs
   */
  _createToken(entity, container, isFoe) {
    const el = document.createElement('div');
    el.className = ['player', entity.id, entity.type, isFoe ? 'ennemi' : 'joueur'].join(' ');
    container.appendChild(el);

    // Position : explicite dans les données, sinon valeur par défaut
    const defaultY  = isFoe ? this.playersCoord.npc : this.playersCoord.pc;
    const defaultX  = genPos(this.mapWidth / 2 - 200, this.mapWidth / 2);
    el.style.top    = (entity.y ?? defaultY) + 'px';
    el.style.left   = (entity.x ?? defaultX) + 'px';

    attachTooltip(el, entity.name);

    // Double-clic : toggle mort
    el.addEventListener('dblclick', () => el.classList.toggle('kill'));
    // Clic droit : rotation (orientation)
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); el.classList.toggle('rotate'); });

    makeDraggable(el, {
      getZoom     : this.getZoom,
      onMouseDown : (el) => el.classList.add('active'),
      onMouseUp   : (el) => {
        el.classList.remove('active');
        this.getFog()?.refreshEnemyVisibility();
      },
    });
  }

  /* ─── Helpers publics ───────────────────────────────────────── */

  /** Remet tous les tokens à leur position initiale */
  resetPositions() {
    this._initPlayers();
    this._initNpcs();
  }
}
