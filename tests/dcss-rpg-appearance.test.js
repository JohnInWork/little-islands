import assert from 'node:assert/strict';
import * as appearance from '../tools/dcss-rpg-appearance.js';
import { access } from 'node:fs/promises';
import test from 'node:test';

import {
  PLAYER_APPEARANCE_STORAGE_KEY,
  PLAYER_BODY_OPTIONS,
  PLAYER_HAIR_OPTIONS,
  allPlayerAppearanceAssetPaths,
  createPlayerAppearance,
  cyclePlayerAppearance,
  loadPlayerAppearance,
  parsePlayerAppearance,
  resolvePlayerAppearance,
  savePlayerAppearance,
} from '../tools/dcss-rpg-appearance.js';

/**
 * Только те тела, что носят нашу броню.
 *
 * Тел было два — человек мужской и женский, — а в библиотеке лежат десятки.
 * Иван спросил, всё ли это, и сразу очертил границу: «не будем добавлять
 * вампиров, мумий, всяких кобольдов, драконов, демонов; только
 * человекоподобные расы».
 *
 * Кентавров, наг и котов не пустит и сам движок: игра надевает поножи и сапоги
 * отдельными слоями поверх тела, а у них нет человеческих ног. Тест держит обе
 * границы сразу — и вкус, и техническую.
 */
test('в выборе тела только человекоподобные расы', () => {
  const initial = createPlayerAppearance();
  const nextBody = cyclePlayerAppearance(initial, 'body', 1);
  const nextHair = cyclePlayerAppearance(initial, 'hair', 1);

  /*
   * Четыре тела: человек и эльф, он и она.
   *
   * Их было шестнадцать, и половина различалась одним оттенком кожи. Иван: «у
   * нас слишком много рас в игре, они почти что все одинаковые, там только
   * цветами немного отличаются <...> четыре типа тела у нас будут, и всё».
   * Проверяется именно четыре: и добавленное пятое, и потерянное четвёртое —
   * одинаково не то, о чём договорились.
   */
  assert.equal(PLAYER_BODY_OPTIONS.length, 4, `тел всего ${PLAYER_BODY_OPTIONS.length}`);
  assert.ok(PLAYER_HAIR_OPTIONS.length >= 20);
  assert.notEqual(nextBody.bodyId, initial.bodyId);
  assert.notEqual(nextHair.hairId, initial.hairId);

  const запрещены = /centaur|naga|felid|draconian|demonspawn|mummy|vampire|kobold|spriggan|octopode/;
  for (const тело of PLAYER_BODY_OPTIONS) {
    assert.doesNotMatch(тело.layer, запрещены, `${тело.id}: такое тело не носит нашу броню`);
    assert.match(тело.layer, /^player\/base\/[a-z_]+_[mf]\.png$/);
    assert.ok(['male', 'female'].includes(тело.voice), `${тело.id}: нет голоса`);
  }

  // Круг замыкается: перебор возвращается туда, откуда начали.
  let шаг = initial;
  for (let i = 0; i < PLAYER_BODY_OPTIONS.length; i += 1) шаг = cyclePlayerAppearance(шаг, 'body', 1);
  assert.deepEqual(шаг, initial);
});

/**
 * Голос берётся у тела, а не угадывается по его имени.
 *
 * Раньше женским считалось единственное тело `human-f`; с приходом остальных
 * эльфийка кричала бы мужским голосом, и заметить это было бы некому.
 */
test('у каждого тела свой голос, и борода не ломает старые сохранения', () => {
  const { playerVoice, parsePlayerAppearance, PLAYER_BEARD_OPTIONS } = appearance;
  assert.equal(playerVoice({ bodyId: 'elf-f' }), 'female');
  assert.equal(playerVoice({ bodyId: 'dwarf-m' }), 'male');
  assert.equal(playerVoice({ bodyId: 'нет такого' }), 'male', 'неизвестное тело — мужской голос');

  assert.ok(PLAYER_BEARD_OPTIONS.length >= 2);
  assert.equal(PLAYER_BEARD_OPTIONS[0].id, 'none', 'без бороды — первый вариант');

  // Снимок прошлой версии дополняется, а не выбрасывается.
  const старый = parsePlayerAppearance('{"version":1,"bodyId":"human-f","hairId":"red"}');
  assert.equal(старый.bodyId, 'human-f', 'выбранное вчера тело потерялось');
  assert.equal(старый.hairId, 'red');
  assert.equal(старый.beardId, 'none');
  assert.equal(старый.version, 2);
});

test('appearance persists outside the run save and malformed profiles fall back safely', () => {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const appearance = createPlayerAppearance({ bodyId: 'human-f', hairId: 'red' });
  assert.equal(savePlayerAppearance(appearance, storage), true);
  assert.deepEqual(loadPlayerAppearance(storage), appearance);
  assert.deepEqual([...data.keys()], [PLAYER_APPEARANCE_STORAGE_KEY]);
  assert.deepEqual(parsePlayerAppearance('{broken'), createPlayerAppearance());
});

test('every curated appearance layer ships in the local CC0 library', async () => {
  await Promise.all(allPlayerAppearanceAssetPaths().map((path) =>
    access(new URL(`../public/assets/dcss-preview/${path}`, import.meta.url))));
});
