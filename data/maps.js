/**
 * data/maps.js — Registre des maps disponibles
 * Champs :
 *   id          {string}  — nom du fichier data (sans .js), utilisé dans ?map=
 *   title       {string}  — titre affiché dans le launcher
 *   description {string}  — courte description (lieu, ambiance...)
 *   thumbnail   {string}  — chemin vers une image de preview (optionnel)
 *   system      {string}  — système de jeu (optionnel)
 *   tags        {Array}   — tags libres (optionnel)
 */
export const maps = [
  {
    id          : 'memory-lab',
    title       : 'Memory Lab',
    description : 'Laboratoire d\'implants mnésiques.',
    thumbnail   : 'assets/maps/memory-lab/thumbnail.webp',
    system      : 'Blade Runner',
    tags        : ['intérieur', 'labo'],
  },
];
