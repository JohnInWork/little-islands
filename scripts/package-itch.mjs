/**
 * Builds the itch.io upload: a copy of dist/ without the unused DCSS sprites
 * (itch.io rejects HTML archives with more than 1 000 files) and without the
 * sprite workbench, zipped with index.html at the root.
 *
 * Usage: npm run package:itch  (runs `vite build` first)
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';

import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const dist = join(root, 'dist');
const release = join(root, 'release');
const stage = join(release, 'itch');
const archive = join(release, 'dng-codex-itch.zip');
const FILE_LIMIT = 1000;

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found: run `npm run build` first');
  process.exit(1);
}

const required = new Set(requiredAssetPaths().map((path) => `assets/dcss-preview/${path}`));

/*
 * Атлас сделал отдельные файлы лишними. Игра режет каждый используемый спрайт
 * из одного листа — и поле, и картинки меню (`spriteUrl` отдаёт кусок листа).
 * Отдельным файлом едет только то, чего в листе нет, и то, что разметка и
 * стили называют прямо по адресу. Без этого архив раздувался до 1 700 файлов,
 * а itch.io принимает не больше тысячи.
 */
const atlasFrames = new Set(Object.keys(
  JSON.parse(readFileSync(join(dist, 'assets/atlas/atlas.json'), 'utf8')).frames,
).map((path) => `assets/dcss-preview/${path}`));
const namedInMarkup = new Set();
for (const file of walkText(dist)) {
  for (const match of readFileSync(file, 'utf8').matchAll(/assets\/dcss-preview\/[A-Za-z0-9_./+-]+\.png/g)) {
    namedInMarkup.add(match[0]);
  }
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function walkText(dir) {
  return walk(dir).filter((file) => /\.(?:html|css)$/.test(file));
}

function keep(path) {
  if (path === 'tools/sprites.html' || /^assets\/sprites-[^/]+\.js$/.test(path)) return false;
  if (path.startsWith('assets/dcss-preview/')) {
    if (!path.endsWith('.png')) return true; // licence notices and manifests stay
    if (path.startsWith('assets/dcss-preview/licensed/')) return true; // chest frames are a separate, small pack
    // Разметка просит файл напрямую — он едет, даже если игра о нём не знает.
    if (namedInMarkup.has(path)) return true;
    if (!required.has(path)) return false;
    return !atlasFrames.has(path);
  }
  return true;
}

rmSync(stage, { recursive: true, force: true });
rmSync(archive, { force: true });
mkdirSync(stage, { recursive: true });
let kept = 0;
let dropped = 0;
let bytes = 0;
for (const file of walk(dist)) {
  const path = relative(dist, file).split('\\').join('/');
  if (!keep(path)) {
    dropped += 1;
    continue;
  }
  cpSync(file, join(stage, path), { recursive: false });
  kept += 1;
  bytes += statSync(file).size;
}
if (kept > FILE_LIMIT) {
  console.error(`${kept} files exceed the itch.io limit of ${FILE_LIMIT}`);
  process.exit(1);
}
// Самопроверка: всё, что разметка и стили называют по адресу, лежит в архиве.
// Картинка, пропавшая из сборки, — это битый значок у покупателя.
const lost = [...namedInMarkup].filter((path) => !existsSync(join(stage, path)));
if (lost.length > 0) {
  console.error(`missing from the package: ${lost.join(', ')}`);
  process.exit(1);
}
execFileSync('zip', ['-q', '-r', '-X', archive, '.'], { cwd: stage });
const zipBytes = statSync(archive).size;
console.log(`itch package: ${kept} files (${dropped} dropped), ${(bytes / 1024 / 1024).toFixed(1)} MB unpacked, ${(zipBytes / 1024 / 1024).toFixed(1)} MB zip`);
console.log(`→ ${relative(root, archive)}`);
