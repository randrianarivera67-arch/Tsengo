const fs = require('fs');
const p = 'vite.config.js';
const content = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-core': ['firebase/app', 'firebase/auth'],
          'firebase-db':   ['firebase/firestore', 'firebase/database'],
          'firebase-storage': ['firebase/storage'],
          'react-core': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          'icons': ['react-icons/hi'],
        },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
  },
});
`;
fs.writeFileSync(p, content);
console.log('OK vite.config.js remis propre (sans externalize)');
