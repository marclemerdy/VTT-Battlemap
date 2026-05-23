/**
 * launcher.js — Logique du launcher (index.html)
 *
 * Charge le registre des maps, génère les filtres et la grille de cartes.
 */
import { maps } from '../data/maps.js';

const grid    = document.getElementById('maps-grid');
const filters = document.getElementById('filters');
const counter = document.getElementById('footer-count');

// Collecte des tags uniques triés
const allTags = [...new Set(maps.flatMap(m => m.tags ?? []))].sort();
let activeTag = null;

/* ─── Filtres ────────────────────────────────────────────────────── */

function renderFilters() {
  filters.innerHTML = '';
  const makeBtn = (label, tag) => {
    const btn = document.createElement('button');
    btn.className   = 'filter-btn' + (activeTag === tag ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      activeTag = tag;
      renderFilters();
      renderGrid();
    });
    filters.appendChild(btn);
  };
  makeBtn('Toutes', null);
  allTags.forEach(tag => makeBtn(tag, tag));
}

/* ─── Grille ─────────────────────────────────────────────────────── */

function renderGrid() {
  const visible = activeTag
    ? maps.filter(m => m.tags?.includes(activeTag))
    : maps;

  grid.innerHTML = '';
  counter.textContent = visible.length + ' carte' + (visible.length > 1 ? 's' : '');

  if (visible.length === 0) {
    grid.innerHTML = '<div class="maps-empty">Aucune carte pour ce filtre.</div>';
    return;
  }

  visible.forEach(map => {
    const card = document.createElement('div');
    card.className = 'map-card';
    card.innerHTML = `
      <div class="card-border-top"></div>
      <div class="card-thumb">
        ${map.thumbnail
          ? `<img src="${map.thumbnail}" alt="${map.title}" loading="lazy">`
          : `<div class="card-thumb-placeholder">⬡</div>`}
        <div class="card-thumb-overlay"></div>
        <button class="card-launch">▶ LANCER</button>
      </div>
      <div class="card-body">
        ${map.system      ? `<div class="card-system">${map.system}</div>` : ''}
        <div class="card-title">${map.title}</div>
        ${map.description ? `<div class="card-desc">${map.description}</div>` : ''}
        ${map.tags?.length ? `<div class="card-tags">
          ${map.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}
        </div>` : ''}
      </div>`;

    const launch = () => { location.href = `battlemap.html?map=${map.id}`; };
    card.addEventListener('click', launch);
    card.querySelector('.card-launch').addEventListener('click', e => {
      e.stopPropagation();
      launch();
    });

    grid.appendChild(card);
  });
}

/* ─── Init ───────────────────────────────────────────────────────── */

renderFilters();
renderGrid();
