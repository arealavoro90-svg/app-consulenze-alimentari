import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
