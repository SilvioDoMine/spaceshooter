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
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000, // Aumentar limite para 1MB
    minify: 'terser', // Melhor compressão
    terserOptions: {
      compress: {
        drop_console: true, // Remover console.log em produção
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar Three.js em chunk próprio
          'three': ['three'],
          // Separar shared em chunk próprio  
          'shared': ['@spaceshooter/shared']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src')
    }
  }
});
