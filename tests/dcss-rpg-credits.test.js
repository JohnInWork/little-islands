import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  CREDITED_PACK_DIRS,
  CREDITS_SECTIONS,
  LICENSED_ASSET_ROOT,
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
