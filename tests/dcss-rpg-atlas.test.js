import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';

const корень = new URL('../public/assets/atlas/', import.meta.url);
const опись = JSON.parse(await readFile(new URL('atlas.json', корень), 'utf8'));

/**
 * Опись не расходится со списком нужных спрайтов.
 *
 * Атлас собирается руками — сборка не умеет запускать Python, — и потому
 * забыть пересобрать его после нового монстра проще всего на свете. Игра от
 * этого не сломается: чего нет в атласе, она возьмёт файлом. Но тихо вернётся
 * то, ради чего атлас и делался, и заметить это будет неоткуда.
 */
test('в атласе лежит всё, что игра просит нарисовать', () => {
  const нужно = [...new Set(requiredAssetPaths())];
  const есть = new Set(Object.keys(опись.frames));
  const пропущено = нужно.filter((путь) => !есть.has(путь));
  assert.deepEqual(
    пропущено,
    [],
    `пересобери атлас: ~/.claude/kag-venv/bin/python tools/atlas/pack.py`,
  );
  // И ничего лишнего: лист не должен возить то, что игре не нужно.
  const лишнее = [...есть].filter((путь) => !нужно.includes(путь));
  assert.deepEqual(лишнее, [], 'в атласе спрайты, которых игра не просит');
});

test('лист один, и он влезает в текстуру любого телефона', async () => {
  assert.equal(опись.version, 1);
  assert.ok(опись.side <= 2048, 'лист крупнее, чем берут мобильные браузеры');
  assert.ok(опись.sheets.length >= 1);
  for (const имя of опись.sheets) {
    const файл = await stat(new URL(имя, корень));
    assert.ok(файл.size > 0, `${имя}: пустой лист`);
  }
  // Каждый кадр лежит внутри своего листа целиком.
  for (const [путь, [лист, x, y, ширина, высота]] of Object.entries(опись.frames)) {
    assert.ok(лист >= 0 && лист < опись.sheets.length, `${путь}: нет такого листа`);
    assert.ok(ширина > 0 && высота > 0, `${путь}: пустой кадр`);
    assert.ok(x + ширина <= опись.side && y + высота <= опись.side, `${путь}: кадр вышел за лист`);
  }
});

/**
 * Игра просит атлас первым, а файлы — только за тем, чего в нём не нашлось.
 *
 * Запасной путь здесь не «на всякий случай», а рабочий: атлас собирается
 * руками, и забытый запуск упаковщика не должен ронять игру.
 */
test('атлас берётся первым, а без него игра грузит спрайты по-старому', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /const atlas = await loadSpriteAtlas\(\);/);
  assert.match(runtime, /if \(!atlas \|\| !sliceFromAtlas\(atlas, path\)\) порознь\.push\(path\);/);
  assert.match(runtime, /await loadImageQueue\(порознь\);/);
  // Вырезанный кусок выдаёт себя за картинку: отрисовка читает `naturalWidth`.
  assert.match(runtime, /Object\.defineProperty\(canvas, 'naturalWidth'/);
  assert.match(runtime, /Object\.defineProperty\(canvas, 'naturalHeight'/);
});
