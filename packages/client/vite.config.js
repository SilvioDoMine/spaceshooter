import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src')
    }
  }
});
