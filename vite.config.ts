import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    // 1. Added the correct base path with forward slashes
    base: '/fifa23-career-tracker/', 
    
    // 2. Cleaned up the duplicate nested config blocks
    plugins: [react(), tailwindcss()],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/llm-api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/llm-api/, ''),
          timeout: 120000,
          proxyTimeout: 120000,
        },
      },
    },
  };
});
