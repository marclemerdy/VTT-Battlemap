/**
 * Toolbar.js — Construction et câblage de la toolbar VTT
 */
export class Toolbar {

  /**
   * Crée et insère la toolbar dans le DOM.
   *
   * @returns {{ fogToggle, fogReveal, fogReset, editorToggle, zoomReset }}
   */
  static init() {
    const bar = document.createElement('div');
    bar.id = 'vtt-toolbar';
    bar.innerHTML = `
      <div class="tb-header">
        <span class="tb-title">⬡ CARTE</span>
        <button class="tb-collapse-btn" id="tb-collapse-btn">−</button>
      </div>
      <div class="tb-body" id="tb-body">

        <div class="tb-section">
          <div class="tb-section-label">VIEWPORT</div>
          <div class="tb-row">
            <span class="tb-muted">Zoom</span>
            <span id="vp-zoom-val" class="tb-zoom-val">35%</span>
            <button class="tb-icon-btn" id="tb-zoom-reset" title="Zoom 100%">⊙</button>
          </div>
        </div>

        <div class="tb-section">
          <div class="tb-section-label">BROUILLARD</div>
          <div class="tb-row">
            <button class="tb-btn" id="fog-btn-toggle">◉ ON / OFF</button>
            <button class="tb-btn" id="fog-btn-reveal" disabled>✦ RÉVÉLER</button>
          </div>
          <div class="tb-row">
            <button class="tb-btn tb-btn-danger" id="fog-btn-reset" disabled>↺ RESET</button>
            <div class="tb-save-indicator" id="fog-save-indicator">
              <span class="tb-save-dot"></span>SAUVEGARDÉ
            </div>
          </div>
          <div class="tb-fog-hint" id="fog-hint">Clic = révéler / masquer une pièce</div>
        </div>

        <div class="tb-section tb-section-editor">
          <div class="tb-section-label">ÉDITEUR ROOMS <span class="tb-badge">EDIT</span></div>
          <div class="tb-row">
            <button class="tb-btn tb-btn-editor" id="editor-btn-toggle" style="width:100%">✎ MODE ÉDITION</button>
          </div>
          <div id="editor-controls" class="editor-controls hidden">
            <div class="tb-legend" style="margin-bottom:6px">
              <div class="tb-leg-row"><span class="tb-key">Clic</span><span class="tb-act">Ajouter point</span></div>
              <div class="tb-leg-row"><span class="tb-key">2× clic</span><span class="tb-act">Clore polygone</span></div>
            </div>
            <div class="tb-row">
              <span id="editor-point-count" class="editor-pt-count">0 pt</span>
              <button class="tb-btn"             id="editor-btn-close" disabled>⬡ Clore</button>
              <button class="tb-icon-btn"        id="editor-btn-undo"  title="Annuler dernier point">↩</button>
              <button class="tb-icon-btn tb-btn-danger-icon" id="editor-btn-clear" title="Effacer tracé">✕</button>
            </div>
            <div id="editor-form-area" style="display:none;margin-top:6px"></div>
          </div>
          <div id="editor-room-list" class="editor-room-list">
            <div class="editor-empty">Aucune room définie</div>
          </div>
          <div class="tb-row" style="margin-top:6px">
            <button class="tb-btn" id="editor-btn-export" style="width:100%">⬇ EXPORTER → CONSOLE</button>
          </div>
        </div>

      </div>`;

    document.body.appendChild(bar);

    // Collapse
    document.getElementById('tb-collapse-btn').addEventListener('click', () => {
      const body = document.getElementById('tb-body');
      body.classList.toggle('hidden');
      document.getElementById('tb-collapse-btn').textContent =
        body.classList.contains('hidden') ? '+' : '−';
    });

    // Retourner les références boutons (pas les IDs, les éléments)
    return {
      fogToggle   : document.getElementById('fog-btn-toggle'),
      fogReveal   : document.getElementById('fog-btn-reveal'),
      fogReset    : document.getElementById('fog-btn-reset'),
      editorToggle: document.getElementById('editor-btn-toggle'),
      zoomReset   : document.getElementById('tb-zoom-reset'),
    };
  }

  /**
   * Câble les boutons éditeur sur une instance RoomEditor.
   *
   * @param {import('./RoomEditor.js').RoomEditor} editor
   */
  static wireEditor(editor) {
    document.getElementById('editor-btn-toggle').addEventListener('click', () => {
      editor.toggle();
      document.getElementById('editor-controls').classList.toggle('hidden', !editor.active);
    });
    document.getElementById('editor-btn-close').addEventListener('click',  () => editor._closePolygon());
    document.getElementById('editor-btn-undo').addEventListener('click',   () => editor.undoPoint());
    document.getElementById('editor-btn-clear').addEventListener('click',  () => editor.clearCurrent());
    document.getElementById('editor-btn-export').addEventListener('click', () => editor.exportToConsole());
  }
}
