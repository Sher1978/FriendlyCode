import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }
          if (id.includes('node_modules/@fortawesome')) {
            return 'vendor-fontawesome';
          }
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/@react-google-maps')) {
            return 'vendor-maps';
          }
        }
      }
    }
  }
});
