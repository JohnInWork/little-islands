/**
 * Две разные сущности не носят одно лицо.
 *
 * Иван: «проверь, есть ли у нас повторяющиеся ассеты какие-то? Не должно быть
 * такого — всё должно быть уникальное по ассетам».
 *
 * Обход каталогов нашёл семнадцать настоящих совпадений, и худшие из них — не
 * косметика. Босс главы выглядел как рядовой орк-воин, страж святилища — как
 * обычный лич, владыка ада — как обычный балруг из той же ветки. Игрок читает
 * картинку раньше имени, и такой босс — дезинформация, а не украшение.
 *
 * Тест устроен так, чтобы список мог только сокращаться:
 *
 * - **Новый дубль невозможен.** Любая картинка с двумя хозяевами, которой нет
 *   в списке ниже, валит тест.
 * - **Починенный дубль обязан уйти из списка.** Запись, которая больше не
 *   совпадает, тоже валит тест, иначе список зарастёт враньём.
 * - **Одно существо в разных ролях — не дубль.** Приручённая овца и дикая
 *   овца, наёмник за столом и он же нанятый обязаны выглядеть одинаково,
 *   поэтому приставки состояния срезаются.
 *
 * Отдельная грабля, ради которой это и написано: занятость нельзя искать
 * поиском по исходнику. Бестиарий собирает путь как `mon/${sprite}`, и в тексте
 * лежит только хвост — так «свободными» показались три картинки, занятые
 * второй волной. Считать надо по живым каталогам.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { LOOT_CATALOG, MONSTER_CATALOG } from '../tools/dcss-rpg-content.js';
import { BESTIARY_WAVE_TWO } from '../tools/dcss-rpg-bestiary.js';
import { RARE_MONSTERS } from '../tools/dcss-rpg-rare-encounters.js';
import { PASSIVE_CREATURE_CATALOG } from '../tools/dcss-rpg-passive.js';

/** Приставки состояния: та же тварь, другая роль. */
const baseId = (id) => id
  .replace(/^(tamed|hired|wild|raised|tavern)-/, '')
  .replace(/-water$/, '');

/**
 * Что пока делит картинку на двоих. Каждая строка — долг, а не разрешение.
 *
 * У существ долг закрыт весь: семь пар разведены, последняя — кабан против
 * домашней свиньи — перекраской, потому что кабаньих спрайтов в библиотеке
 * ровно два и второй адский.
 */
const KNOWN_CREATURE_PAIRS = Object.freeze({});

/** То же для предметов: неопознанные книги-близнецы — старая беда пака. */
const KNOWN_ITEM_PAIRS = Object.freeze({
  'derived/icon/potion-poison.png': ['poison-vial', 'venom-potion'],
  'item/book/parchment.png': ['blank-codex', 'book-of-purity'],
  'item/book/light_green.png': ['book-of-mending', 'book-of-tending'],
  'item/book/metal_blue.png': ['book-of-storms', 'book-of-wardens'],
  'item/book/metal_cyan.png': ['book-of-keys', 'book-of-splinters'],
  'item/book/dark_blue.png': ['book-of-invisibility', 'book-of-translocation'],
  'item/book/book_of_the_dead.png': ['book-of-bones', 'dead-book'],
  'item/food/bread_ration.png': ['bread', 'hearty-stew'],
  'item/food/meat_ration.png': ['cooked-meat', 'roast-meat'],
});

function shared(entries) {
  const owners = new Map();
  for (const [path, id] of entries) {
    if (typeof path !== 'string' || !path.endsWith('.png')) continue;
    if (!owners.has(path)) owners.set(path, new Set());
    owners.get(path).add(baseId(id));
  }
  return new Map(
    [...owners.entries()]
      .filter(([, ids]) => ids.size > 1)
      .map(([path, ids]) => [path, [...ids].sort()]),
  );
}

function assertOnlyKnown(found, known, what) {
  for (const [path, ids] of found) {
    assert.ok(
      known[path],
      `${what}: новый дубль — ${path} носят ${ids.join(', ')}. Каждой сущности своя картинка.`,
    );
    assert.deepEqual(ids, [...known[path]], `${what}: у ${path} сменился состав`);
  }
  for (const path of Object.keys(known)) {
    assert.ok(found.has(path), `${what}: ${path} больше не дубль — вычеркни строку из списка`);
  }
}

test('двух разных существ на одной картинке не бывает', () => {
  const entries = [
    ...MONSTER_CATALOG.map(({ path, id }) => [path, id]),
    ...BESTIARY_WAVE_TWO.map(({ path, id }) => [path, id]),
    ...RARE_MONSTERS.map(({ path, id }) => [path, id]),
    ...PASSIVE_CREATURE_CATALOG.map(({ path, id }) => [path, id]),
  ];
  assert.ok(entries.length > 250, `существ в каталогах всего ${entries.length}`);
  assertOnlyKnown(shared(entries), KNOWN_CREATURE_PAIRS, 'существа');
});

test('двух разных предметов с одной иконкой не бывает', () => {
  const entries = LOOT_CATALOG.map(({ icon, id }) => [icon, id]);
  assert.ok(entries.length > 100, `предметов в каталоге всего ${entries.length}`);
  assertOnlyKnown(shared(entries), KNOWN_ITEM_PAIRS, 'предметы');
});

test('долг по дублям только сокращается', () => {
  // Цифра меняется вниз вместе с починкой и служит счётчиком работы. Поднять её
  // можно только руками, и это будет видно в diff.
  const total = Object.keys(KNOWN_CREATURE_PAIRS).length + Object.keys(KNOWN_ITEM_PAIRS).length;
  assert.ok(total <= 9, `дублей стало больше: ${total}`);
});
