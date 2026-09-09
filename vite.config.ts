import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // ponytail: GenerateSW — nessun service worker manuale, Workbox genera tutto
      strategies: 'generateSW',
      manifest: {
        name: 'AEA Consulenze Alimentari',
        short_name: 'AEA',
        description: 'Gestionale nutrizionale per PMI alimentari',
        theme_color: '#1a2340',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // App shell + assets: cache-first (aggiorna in background)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // ingredientsDB.json: cache-first con TTL 7gg (cambierà raramente)
        // Nota: dopo S0 deploy questa entry va rimossa (il DB sarà dietro API autenticata)
        runtimeCaching: [
          {
            // API Django: network-first (richiede auth fresca, no cache offline)
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      // In sviluppo: /api/* → http://127.0.0.1:8000/api/*  (niente CORS)
      '/api': {
        target:       'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'pdf': ['jspdf', 'html2canvas'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'node',
    exclude: ['e2e/**', 'node_modules/**', '.worktrees/**', '.claude/**'],
    // AUDIT T1 — vitest carica anche `.env.local`, dove sta VITE_DEV_MOCK_AUTH=true per
    // lo sviluppo senza backend. Quel flag attiva DEV_MOCK_ENABLED in AuthContext, che
    // cortocircuita login e verifica del token: i due test AUTH-2 ("un errore del backend
    // non deve MAI autenticare") fallivano su ogni macchina che avesse il mock attivo,
    // cioè proprio i controlli di sicurezza smettevano di proteggere.
    // Qui il flag è forzato a false per i soli test: lo sviluppo continua a usare il mock,
    // la suite verifica sempre il comportamento reale.
    env: {
      VITE_DEV_MOCK_AUTH: 'false',
    },
  },
})
