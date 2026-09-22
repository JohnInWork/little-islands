import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/**
 * Отметка сборки: по ней видно, ту ли версию открыл браузер.
 *
 * Номер в `package.json` меняется раз в месяц, а выкатов за день бывает
 * шесть, и телефон охотно показывает вчерашнюю страницу из кэша. Иван: «подпиши
 * версию игры в меню, чтобы я не терялся и понимал, что тестирую именно то, что
 * нужно (а то эти куки и кеш бесят)».
 *
 * Поэтому в подпись едет короткий хеш коммита и дата сборки: их достаточно,
 * чтобы сверить экран с тем, что было сказано, и сразу понять, что перед
 * тобой — свежее или из кэша.
 */
function buildStamp() {
  const commit = process.env.GITHUB_SHA
    ?? (() => {
      try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      } catch {
        return '';
      }
    })();
  const дата = new Date().toISOString().slice(5, 16).replace('T', ' ');
  return commit ? `${commit.slice(0, 7)} · ${дата}` : дата;
}

// Keep the public URL clean while shipping the 2D game as an explicit MPA entry.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_STAMP__: JSON.stringify(buildStamp()),
  },
  build: {
    rollupOptions: {
      // Кооперативный клиент (`tools/coop.*`) лежит в дереве, но не собирается:
      // мультиплеер отложен, а витрина должна быть одиночной игрой. Вернуть —
      // одна строка входа.
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        game: resolve(import.meta.dirname, 'tools/dcss.html'),
        sprites: resolve(import.meta.dirname, 'tools/sprites.html'),
      },
    },
  },
});
