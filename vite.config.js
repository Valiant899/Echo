import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Add these if you're using any Node.js polyfills
      'util': 'rollup-plugin-node-polyfills/polyfills/util',
      'events': 'rollup-plugin-node-polyfills/polyfills/events',
    },
    extensions: ['.js', '.jsx', '.json'] // Add this line
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  }
});