/**
 * Гробница, которая не спит.
 *
 * Иван после игры: «осквернение гробницы может разбудить мумию». Гробница и
 * раньше била печатью по тому, кто её вскрыл; теперь изредка из неё ещё и
 * встаёт хозяин. Три правила держат это честным.
 *
 * - **Решает сид, а не общий генератор.** Встанет мумия или нет — это
 *   `stableHash(сид забега, этаж, id находки)`, отдельная от общего потока
 *   случайностей этажа. Ни одна комната, монстр или вещь на уже сохранённом
 *   этаже от этого не сдвигаются, а перезагрузка возвращает ту же гробницу с
 *   тем же исходом.
 * - **Мумия заранее лежит на этаже.** Она записана в `level.monsters` рядом с
 *   гробницей со ссылкой `activationFindId`, как спящий мимик у сундука, и
 *   просыпается только когда гробницу вскрыли. Поэтому бой, прерванный
 *   перезагрузкой, продолжается тем же существом с тем же здоровьем — через
 *   обычные `floor.monsters` и `floor.defeated`, без нового поля в сейве.
 * - **Её сила не знает про вход в подземелье.** Мумия сильна как существо
 *   шестого этажа и на первом этаже, и на третьем: смягчение входа не для
 *   тех, кого разбудили сами. Глубже она растёт вместе с этажом, как все, и
 *   становится обычной дракой.
 */

import { MONSTER_CATALOG, RUN_BRANCHES, monsterSuitsBranch } from './dcss-rpg-content.js';

/** Каталожный id. `spawn: 'tomb'` держит её вне любого случайного пула. */
export const TOMB_MUMMY_ID = 'tomb-mummy';

/**
 * Мёртвые встают только там, где мёртвые вообще водятся: в пещерах, склепах
 * и хранилищах. Гробница в аду или на поверхности остаётся просто гробницей —
 * нежить там не живёт, и мумия была бы чужой. Список выводится из каталога,
 * а не пишется руками.
 */
export const TOMB_MUMMY_BRANCHES = Object.freeze(RUN_BRANCHES.filter((branch) => (
  MONSTER_CATALOG.some((monster) => (
    monster.kin === 'undead' && !monster.spawn && monsterSuitsBranch(monster, branch)
  ))
)));

/** Доля гробниц, из которых поднимается мумия. */
export const TOMB_MUMMY_CHANCE = 0.09;

/** Ниже этой глубины мумия всё равно сильна как на ней. */
export const TOMB_MUMMY_STAT_DEPTH = 6;

/** Шум пробуждения: столько клеток вокруг слышат, как отъехала плита. */
export const TOMB_MUMMY_NOISE = 8;

export const tombMummyInstanceId = (depth) => `monster-${depth}-mummy`;

function stableHash(...parts) {
  let value = 0x811c9dc5;
  for (const character of parts.join('|')) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 0x01000193) >>> 0;
    value ^= value >>> 13;
  }
  // Перемешивание в конце (fmix32 из MurmurHash3): без него соседние сиды
  // 1, 2, 3… давали заметно меньше мумий, чем обещано.
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b) >>> 0;
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35) >>> 0;
  value ^= value >>> 16;
  return value >>> 0;
}

/**
 * Встанет ли мумия из этой гробницы. Чистая функция сида забега, глубины и
 * id находки: одна и та же гробница всегда отвечает одинаково.
 */
export function graveWakesMummy({ seed, depth, findInstanceId } = {}) {
  if (!Number.isInteger(seed) || !Number.isInteger(depth) || typeof findInstanceId !== 'string') {
    return false;
  }
  const roll = stableHash('tomb-mummy-v1', seed, depth, findInstanceId) / 0x100000000;
  return roll < TOMB_MUMMY_CHANCE;
}

const NEIGHBOURS = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 1, y: 1 }),
  Object.freeze({ x: -1, y: 1 }),
  Object.freeze({ x: 1, y: -1 }),
  Object.freeze({ x: -1, y: -1 }),
]);

/**
 * Где мумия ляжет ждать: свободная клетка пола вплотную к гробнице. Порядок
 * соседей задаёт тот же хеш, а не генератор этажа. Нет свободной клетки —
 * нет и мумии: гробница остаётся обычной.
 */
export function tombMummySpawn({ seed, depth, branch, grid, find, taken = new Set() } = {}) {
  if (!find || find.id !== 'forgotten-grave') return null;
  if (!TOMB_MUMMY_BRANCHES.includes(branch)) return null;
  if (!Array.isArray(grid) || !Number.isInteger(find.x) || !Number.isInteger(find.y)) return null;
  if (!graveWakesMummy({ seed, depth, findInstanceId: find.instanceId })) return null;
  const ordered = NEIGHBOURS
    .map((offset, index) => ({
      x: find.x + offset.x,
      y: find.y + offset.y,
      // Прямые соседи раньше диагональных, внутри — порядок от хеша.
      rank: (index < 4 ? 0 : 1) * 0x100000000
        + stableHash('tomb-mummy-cell-v1', seed, depth, find.instanceId, index),
    }))
    .sort((left, right) => left.rank - right.rank);
  const cell = ordered.find(({ x, y }) => (
    grid[y]?.[x] === '.' && !taken.has(`${x},${y}`)
  ));
  if (!cell) return null;
  return Object.freeze({
    instanceId: tombMummyInstanceId(depth),
    id: TOMB_MUMMY_ID,
    x: cell.x,
    y: cell.y,
    activationFindId: find.instanceId,
  });
}
