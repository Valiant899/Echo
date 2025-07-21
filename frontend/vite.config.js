import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  
  server: {
    host: '0.0.0.0', // Allows access from other devices
    port: 3000,
    strictPort: true, // Ensure port is strictly used
    hmr: {
      clientPort: 3000 // Important for HMR to work
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'simple-peer': 'simple-peer/simplepeer.min.js'
    }
  },

  define: {
    global: {},
    'process.env': {},
    'process.nextTick': () => {} // Simple mock
  },

  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});