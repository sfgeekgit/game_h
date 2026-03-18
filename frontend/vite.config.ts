import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    allowedHosts: ['documentbrain.com'],
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT || '3002'}`,
        changeOrigin: true,
      },
    },
  },
  base: command === 'serve' ? '/game_h_dev/' : '/game_h/',
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
}));
