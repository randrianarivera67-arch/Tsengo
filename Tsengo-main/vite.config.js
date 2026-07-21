import { defineConfig } from 'vite';
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
