import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Keep the public URL clean while shipping the 2D game as an explicit MPA entry.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        game: resolve(import.meta.dirname, 'tools/dcss.html'),
        sprites: resolve(import.meta.dirname, 'tools/sprites.html'),
        coop: resolve(import.meta.dirname, 'tools/coop.html'),
      },
    },
  },
});
