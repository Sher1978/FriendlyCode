import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Firebase gets its own chunk (~400KB gzipped) — cached by browser independently
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }
          // Framer Motion is large — isolate for caching
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // i18n stack
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n';
          }
          // FontAwesome icons
          if (id.includes('node_modules/@fortawesome')) {
            return 'vendor-icons';
          }
          // React core — smallest, most stable chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // Everything else in node_modules → shared vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
})

