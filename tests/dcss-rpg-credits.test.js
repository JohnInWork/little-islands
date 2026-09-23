import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  CREDITED_PACK_DIRS,
  CREDITS_SECTIONS,
  LICENSED_ASSET_ROOT,
  THIRD_PARTY_NOTICES_PATH,
  creditsCopy,
  creditsModel,
} from '../tools/dcss-rpg-credits.js';

const licensedRoot = new URL(`../${LICENSED_ASSET_ROOT}/`, import.meta.url);

/**
 * Титры — условие, на котором игру можно продавать.
 *
 * Часть графики лежит под CC-BY и CC-BY-SA: править и продавать они
 * разрешают, но требуют назвать автора там, где работу видно, — в самой игре.
 * Поэтому каталог сверяется с настоящими файлами лицензий: новый пакет,
 * добавленный без строки в титрах, обязан ронять этот тест, а не выходить в
 * продажу молча.
 */
test('каждый лицензированный пакет назван в титрах', async () => {
  const onDisk = (await readdir(licensedRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.ok(onDisk.length > 0, 'папка с лицензированным искусством пуста — проверять нечего');
  assert.deepEqual(
    [...CREDITED_PACK_DIRS].sort(),
    onDisk,
    'каталог титров разошёлся с тем, что лежит на диске',
  );
});

test('лицензия в титрах — та же строка, что в файле рядом с картинками', async () => {
  for (const entry of CREDITS_SECTIONS) {
    if (!entry.packDir) continue;
    const text = await readFile(new URL(`${entry.packDir}/LICENSE.md`, licensedRoot), 'utf8');
    assert.ok(entry.license, `${entry.packDir}: лицензия не названа`);
    // Демо-пакет описан словами автора, а не кодом лицензии: у него нет кода.
    const needle = entry.license.startsWith('Cmski') ? 'commercial' : entry.license.replace(/\+$/, '');
    assert.ok(
      text.includes(needle),
      `${entry.packDir}: «${entry.license}» не найдено в LICENSE.md`,
    );
    assert.ok(entry.source && entry.source.startsWith('http'), `${entry.packDir}: нет ссылки на источник`);
  }
});

test('каждый раздел говорит на обоих языках и ничего не теряет', () => {
  assert.ok(CREDITS_SECTIONS.length >= 6);
  const ids = new Set();
  for (const entry of CREDITS_SECTIONS) {
    assert.equal(ids.has(entry.id), false, `повтор раздела ${entry.id}`);
    ids.add(entry.id);
    for (const locale of ['ru', 'en']) {
      assert.ok(entry[locale].title.length > 0, `${entry.id}/${locale}: нет заголовка`);
      assert.ok(entry[locale].lines.length > 0, `${entry.id}/${locale}: нет строк`);
      for (const line of entry[locale].lines) {
        assert.ok(line.trim().length > 0, `${entry.id}/${locale}: пустая строка`);
      }
    }
  }
  // Тайлы подземелья и звук — не пакеты в `licensed/`, но назвать их всё равно надо.
  assert.ok(ids.has('dcss'), 'тайлы Dungeon Crawl Stone Soup не названы');
  assert.ok(ids.has('audio'), 'звук не назван');
  assert.ok(ids.has('game'), 'сама игра не названа');
});

test('модель экрана готова к отрисовке и переключает язык', () => {
  const ru = creditsModel('ru');
  const en = creditsModel('en');
  assert.equal(ru.language, 'ru');
  assert.equal(en.language, 'en');
  assert.equal(creditsModel('иное').language, 'ru', 'неизвестный язык — русский');
  assert.equal(ru.title, 'Авторы');
  assert.equal(en.title, 'Credits');
  // Вступления нет: Иван просил на экране только автора, паки и лицензии.
  assert.equal(ru.intro, undefined);
  assert.equal(ru.sections.length, CREDITS_SECTIONS.length);

  const floors = ru.sections.find(({ id }) => id === 'lpc-floors');
  assert.match(floors.licenseLabel, /^Лицензия: CC-BY-SA 4\.0$/);
  assert.match(en.sections.find(({ id }) => id === 'lpc-floors').licenseLabel, /^Licence: /);
  // У раздела без лицензии подпись пустая, а не «Лицензия: null».
  const game = ru.sections.find(({ id }) => id === 'game');
  assert.equal(game.licenseLabel, '');
  assert.equal(game.license, null);

  assert.equal(creditsCopy('en').title, 'Credits');
  assert.equal(creditsCopy().title, 'Авторы');
});

/*
 * Имени лицензии мало. CC-BY и CC-BY-SA требуют ссылку на её текст, а MIT —
 * чтобы сам текст путешествовал с каждой копией игры. Раньше в титрах были
 * только имена, а уведомление three.js минификатор вырезал из сборки.
 */
test('у каждой открытой лицензии в титрах есть ссылка на её текст', () => {
  for (const entry of CREDITS_SECTIONS) {
    if (!entry.license || entry.license.startsWith('Cmski')) continue;
    assert.ok(entry.licenseUrl, `${entry.id}: «${entry.license}» без ссылки на текст`);
  }
  assert.ok(CREDITS_SECTIONS.some(({ id }) => id === 'code'), 'three.js не назван в титрах');
  assert.ok(CREDITS_SECTIONS.some(({ id }) => id === 'privacy'), 'нет слова о приватности');
});

test('файлы, на которые ссылаются титры, действительно едут с игрой', async () => {
  const publicRoot = new URL('../public/', import.meta.url);
  const notices = CREDITS_SECTIONS.map(({ notice }) => notice).filter(Boolean);
  assert.ok(notices.includes(THIRD_PARTY_NOTICES_PATH));
  for (const path of notices) {
    const text = await readFile(new URL(path, publicRoot), 'utf8');
    assert.ok(text.length > 100, `${path}: пустой файл`);
  }
  const code = await readFile(new URL(THIRD_PARTY_NOTICES_PATH, publicRoot), 'utf8');
  assert.match(code, /three\.js authors/);
  assert.match(code, /Panayiotis Lipiridis/);
  assert.match(code, /Permission is hereby granted/);
});

/*
 * Шрифт выбран один на всю игру, и чёток он только на своей сетке. Стоит
 * вернуть 15 px или `clamp(…vw…)` — буквы расплывутся, а тесты правил этого
 * не заметят. Поэтому сетку держит этот тест.
 */
test('весь интерфейс набран одним пиксельным шрифтом на его сетке', async () => {
  const css = await readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  const fontFile = 'assets/fonts/fusion-pixel-12px/fusion-pixel-12px-proportional-latin.otf.woff2';
  assert.ok(css.includes(`url('../${fontFile}')`), 'шрифт не подключён в стилях');
  assert.ok(html.includes(`href="../${fontFile}"`), 'шрифт не загружается заранее');
  await readFile(new URL(`../public/${fontFile}`, import.meta.url));
  assert.match(css, /font-synthesis: none;/);
  const sizes = [...css.matchAll(/font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length > 100, 'размеры шрифта не найдены');
  for (const size of sizes) {
    assert.ok([12, 24, 36, 48, 72].includes(size), `размер ${size}px вне сетки шрифта`);
  }
  assert.doesNotMatch(css, /font-size:\s*clamp/, 'размер по vw размывает пиксельный шрифт');
  assert.doesNotMatch(css, /font-weight:\s*(?:[5-9]00|bold)/, 'у шрифта нет жирного начертания');
  assert.doesNotMatch(css, /letter-spacing:\s*-?[0-9.]+em/, 'межбуквенный интервал в em даёт дробные пиксели');
  const families = [...css.matchAll(/font-family:\s*([^;]+);/g)].map((m) => m[1].trim());
  for (const family of families) {
    assert.ok(family === 'var(--font-ui)' || family === "'Fusion Pixel 12px'", `чужое семейство: ${family}`);
  }
});
