/**
 * main.js — Point d'entrée VTT Battlemap
 *
 * ─── Stack de layers (z-index croissant) ────────────────────────
 *  10 — .map__tile      (tuiles décoratives)
 *  11 — #fog-canvas     (rendu brouillard)
 *  12 — #fog-overlay    (clics fog)
 *  20 — #editor-canvas  (rendu éditeur)
 *  21 — #editor-overlay (clics éditeur)
 *  50 — #vtt-toolbar    (UI)
 * ─────────────────────────────────────────────────────────────────
 */

import { MapViewport  } from './MapViewport.js';
import { FogOfWar     } from './FogOfWar.js';
import { RoomEditor   } from './RoomEditor.js';
import { TokenManager } from './TokenManager.js';
import { Toolbar      } from './Toolbar.js';

/* ─── Résolution de la map depuis l'URL ─────────────────────────
   Exemples :
     battlemap.html?map=hollywood-sign  → hollywood-sign
     battlemap.html?map=memory-lab      → memory-lab
     battlemap.html?map=pharma-lab      → pharma-lab
*/
const MAP_NAME = new URLSearchParams(location.search).get('map');

if (!MAP_NAME) {
  document.body.innerHTML = `<div style="color:#fd8202;font-family:'Courier New',monospace;padding:2rem">
    Aucune map spécifiée.<br>
    Exemple : <code style="color:#72ff00">battlemap.html?map=hollywood-sign</code>
  </div>`;
  throw new Error('Paramètre ?map= manquant');
}

/* ─── Bootstrap ─────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {

  // 1. Import dynamique du fichier de données de la map
  //    Chaque data file exporte ses constantes nommées.
  let mapData;
  try {
    mapData = await import(`../data/${MAP_NAME}.js`);
  } catch (e) {
    document.body.innerHTML = `<div style="color:red;padding:2rem">
      Map introuvable : <strong>${MAP_NAME}</strong><br>
      Vérifier que <code>data/${MAP_NAME}.js</code> existe et utilise <code>export</code>.
    </div>`;
    throw e;
  }

  const {
    mapBg,
    tilesDir,
    players      = [],
    npcs         = [],
    playersCoord = [{ pc: 650, npc: 2250 }],
    rooms        = [],
    tiles        = [],
  } = mapData;

  // Si mapBg est undefined, le data file utilise l'ancien format sans "export"
  if (!mapBg || !tilesDir) {
    document.body.innerHTML = `<div style="color:#fd8202;font-family:'Courier New',monospace;padding:2rem">
      <strong>data/${MAP_NAME}.js</strong> ne contient pas d'exports.<br><br>
      Ajouter <code style="color:#72ff00">export</code> devant chaque <code>const</code> :<br><br>
      <code style="color:#72ff00">export const mapBg = [...];</code><br>
      <code style="color:#72ff00">export const tilesDir = [...];</code><br>
      <code style="color:#72ff00">export const players = [...];</code><br>
      <code style="color:#72ff00">... etc.</code>
    </div>`;
    throw new Error(`data/${MAP_NAME}.js : exports manquants`);
  }

  const mapCfg = mapBg[0];
  const mapW   = parseInt(mapCfg.width);
  const mapH   = parseInt(mapCfg.height);

  // 2. Mettre à jour le titre de la page
  document.title = `VTT — ${MAP_NAME}`;

  // 3. Fond de carte
  initBackground(mapCfg, tilesDir[0]);

  // 4. Toolbar (doit être dans le DOM avant fog et editor)
  const buttons = Toolbar.init();

  // 5. Viewport — reçoit des callbacks pour savoir si fog/editor sont actifs
  //    (on les définit après instanciation, donc on passe des lambdas)
  let fog    = null;
  let editor = null;

  const viewport = new MapViewport({
    mapWidth        : mapW,
    mapHeight       : mapH,
    isFogActive     : () => fog?.toolActive    ?? false,
    isEditorActive  : () => editor?.active     ?? false,
  });

  // 6. Zoom reset
  buttons.zoomReset.addEventListener('click', () => viewport.resetZoom());

  // 7. Tuiles
  initTiles(tiles, tilesDir[0]);

  // 8. Tokens
  const tokens = new TokenManager({
    pcContainer  : document.querySelector('.map__pc'),
    npcContainer : document.querySelector('.map__npc'),
    players,
    npcs,
    playersCoord : { pc: parseInt(playersCoord[0].pc), npc: parseInt(playersCoord[0].npc) },
    mapWidth     : mapW,
    getFog       : () => fog,
    getZoom      : () => viewport.zoom,
  });
  tokens.init();

  // 9. Fog of War
  fog = new FogOfWar(document.querySelector('.map'), {
    mapKey   : 'fog_' + MAP_NAME,
    mapWidth : mapW,
    mapHeight: mapH,
    rooms,
    getZoom  : () => viewport.zoom,
  });
  fog.bindToolbar({
    toggle : buttons.fogToggle,
    reveal : buttons.fogReveal,
    reset  : buttons.fogReset,
  });

  // 10. Éditeur de rooms
  editor = new RoomEditor(document.querySelector('.map'), {
    mapWidth    : mapW,
    mapHeight   : mapH,
    rooms,
    getViewport : () => viewport,
  });
  Toolbar.wireEditor(editor);
  editor._updateRoomList();

  // 11. Debug coords au clic (outil de placement)
  document.addEventListener('click', (e) => {
    if (e.target.closest('#vtt-toolbar, #fog-room-label')) return;
    if (editor?.active) return;
    const { x, y } = viewport.toMapCoords(e.clientX, e.clientY);
    console.log(`"x": ${x}, "y": ${y}`);
  }, true);

});

/* ─── Helpers DOM ────────────────────────────────────────────────── */

function initBackground(mapCfg, dir) {
  const map = document.querySelector('.map');
  const pc  = document.querySelector('.map__pc');
  pc.style.height = mapCfg.height + 'px';
  Object.assign(map.style, {
    width           : mapCfg.width + 'px',
    height          : mapCfg.height + 'px',
    position        : 'relative',
    background      : `url('assets/maps/${dir}/${mapCfg.img}') no-repeat center center`,
    backgroundSize  : 'cover',
    backgroundBlendMode : 'multiply',
    backgroundColor : `rgba(0,0,0,${mapCfg.overlay})`,
  });
}

function initTiles(tiles, dir) {
  const container = document.querySelector('.map__tile');
  container.innerHTML = '';
  tiles.forEach(t => {
    const a = document.createElement('a');
    a.href  = 'javascript:void(0);';
    a.title = String(t.number);

    const tile = document.createElement('div');
    tile.id = String(t.number);
    Object.assign(tile.style, {
      background : `url(assets/maps/${dir}/${t.img})`,
      width      : t.width + 'px',
      height     : t.height + 'px',
      opacity    : '1',
      top        : t.y + 'px',
      left       : t.x + 'px',
      position   : 'absolute',
    });
    tile.className = `tiles tile${t.number}`;

    // ✅ Event listener propre — plus de onclick inline ni de fonction globale
    a.addEventListener('click', () => tile.remove());
    a.appendChild(tile);
    container.appendChild(a);
  });
}
