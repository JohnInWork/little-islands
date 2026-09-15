import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Keep the public URL clean while shipping the 2D game as an explicit MPA entry.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        game: resolve(import.meta.dirname, 'tools/dcss.html'),
        sprites: resolve(import.meta.dirname, 'tools/sprites.html'),
      },
    },
  },
});
