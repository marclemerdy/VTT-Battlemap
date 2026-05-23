import { defineConfig } from 'vite';
import { resolve }      from 'path';

export default defineConfig({

  // ── Racine du projet ────────────────────────────────────────────
  root: '.',

  // ── Assets statiques (images, favicon...) ───────────────────────
  // Vite copie le contenu de publicDir tel quel dans dist/
  // Structure : public/assets/tokens/, public/assets/maps/
  publicDir: 'public',

  // ── Multi-page : deux points d'entrée HTML ───────────────────────
  build: {
    outDir   : 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        launcher  : resolve(__dirname, 'index.html'),
        battlemap : resolve(__dirname, 'battlemap.html'),
      },

      output: {
        // ── Nommage des chunks ──────────────────────────────────────
        // JS applicatif → js/[name]-[hash].js
        entryFileNames : 'js/[name]-[hash].js',
        chunkFileNames : 'js/[name]-[hash].js',
        // CSS → css/[name]-[hash].css
        assetFileNames : (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'css/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        },

        // ── Chunking manuel ─────────────────────────────────────────
        // Chaque data file = son propre chunk (chargé à la demande)
        manualChunks(id) {
          if (id.includes('/data/') && !id.includes('maps.js')) {
            // data/hollywood-sign.js → chunk "map-hollywood-sign"
            const name = id.split('/data/')[1].replace('.js', '');
            return `map-${name}`;
          }
        },
      },
    },

    // Seuil d'avertissement chunk (maps peuvent être grosses)
    chunkSizeWarningLimit: 600,
  },

  // ── Serveur de dev ───────────────────────────────────────────────
  server: {
    port: 3000,
    open: true,   // ouvre le navigateur automatiquement
  },
});
