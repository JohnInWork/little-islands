import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ARTIFACT_DROP_TIER,
  CHANCE_DROPS,
  DROP_MONSTER_IDS,
  SIGNATURE_DROPS,
  dropBand,
  dropForMonster,
  dropRoll,
} from '../tools/dcss-rpg-drops.js';
import { MONSTER_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { RARE_MONSTERS } from '../tools/dcss-rpg-rare-encounters.js';
import { eligibleArtifactPowers } from '../tools/dcss-rpg-artifacts.js';
import { floorScaling } from '../tools/dcss-rpg-scaling.js';
import { DEFAULT_LOOT_ABUNDANCE, floorLootEconomy } from '../tools/dcss-rpg-loot-economy.js';

const все = [...MONSTER_CATALOG, ...RARE_MONSTERS];
const существо = (id) => все.find((monster) => monster.id === id) ?? null;

/**
 * Вещь не выше того, кто её нёс.
 *
 * Это единственное, что отделяет «добычу с монстров» от сломанной игры.
 * Именной второго тира попадается с первого этажа, и вершина каталога с него
 * закончила бы забег на входе — а заметить такое в живой игре можно только
 * случайно, потому что редкая встреча на то и редкая.
 */
test('таблица добычи не выдаёт вещей выше тира того, кто их носит', () => {
  for (const id of DROP_MONSTER_IDS) {
    const monster = существо(id);
    assert.ok(monster, `${id}: такого существа в игре нет`);
    const запись = SIGNATURE_DROPS[id] ?? CHANCE_DROPS[id];
    const вещь = lootById(запись.id);
    assert.ok(вещь, `${id}: роняет несуществующее «${запись.id}»`);
    const потолок = dropBand(monster.tier, monster.boss === true);
    assert.ok(
      (вещь.rarity ?? 0) <= потолок,
      `${id} (тир ${monster.tier}): ${запись.id} редкости ${вещь.rarity} выше потолка ${потолок}`,
    );
    if (!запись.powerId) continue;
    assert.ok(
      monster.tier >= ARTIFACT_DROP_TIER || monster.boss === true,
      `${id}: сила артефакта на тире ${monster.tier}`,
    );
    assert.ok(
      eligibleArtifactPowers(вещь).some(({ id: powerId }) => powerId === запись.powerId),
      `${id}: сила ${запись.powerId} не ложится на ${запись.id}`,
    );
  }
  // Потолок растёт с тиром и даёт стражу ступень сверху: он и есть то, ради
  // чего на этаж шли.
  assert.ok(dropBand(2) < dropBand(5) && dropBand(5) < dropBand(8));
  assert.equal(dropBand(3, true), dropBand(3) + 1);
  assert.equal(dropBand(9, true), 3, 'потолок пробит выше каталога');
});

/**
 * Со стража забрать нельзя иначе, чем убив.
 *
 * Иван: «какой-нибудь самый жёсткий лут может быть как раз-таки именно с
 * босса, и ты не можешь никак у него его забрать, кроме как не убить». Это
 * и есть ответ кольцу невидимости: этаж можно обойти по стеночке, стража —
 * нельзя. Поэтому у каждого стража вещь есть, и падает она всегда.
 */
test('у каждого стража этажа своя вещь, и она не по жребию', () => {
  for (const monster of MONSTER_CATALOG.filter(({ boss }) => boss)) {
    assert.ok(SIGNATURE_DROPS[monster.id], `${monster.id}: страж без добычи`);
    const выпало = dropForMonster({
      monsterId: monster.id, instanceId: 'monster-1-boss', seed: 7, depth: 6,
    });
    assert.equal(выпало?.id, SIGNATURE_DROPS[monster.id].id);
  }
  assert.equal(dropForMonster({ monsterId: 'goblin', instanceId: 'monster-1-0', seed: 7 }), null);
});

/**
 * Жребий один и тот же при каждой загрузке — и свой у каждого убитого.
 *
 * Общий на всех означал бы, что два орка на этаже роняют одно и то же или оба
 * ничего; переигрываемый — что выпадение выбирается перезагрузкой, а не боем.
 */
test('выпадение не переигрывается и считается для каждого отдельно', () => {
  const первый = dropRoll(11, 4, 'monster-4-2');
  assert.equal(первый, dropRoll(11, 4, 'monster-4-2'), 'бросок переигрывается');
  assert.notEqual(первый, dropRoll(11, 4, 'monster-4-3'), 'у двоих один жребий');
  assert.notEqual(первый, dropRoll(11, 5, 'monster-4-2'), 'глубина ничего не меняет');
  assert.ok(первый >= 0 && первый < 1);

  // И обещанная доля — настоящая: по тысяче убитых разбойников четверть с
  // клинком, а не «иногда».
  const обещано = CHANCE_DROPS['highway-bandit'].chance;
  let выпало = 0;
  for (let i = 0; i < 2000; i += 1) {
    if (dropForMonster({ monsterId: 'highway-bandit', instanceId: `monster-3-${i}`, seed: 3, depth: 3 })) {
      выпало += 1;
    }
  }
  assert.ok(Math.abs(выпало / 2000 - обещано) < 0.04, `выпало ${выпало / 2000} вместо ${обещано}`);
});

/**
 * Упавшее лежит на полу и переживает перезагрузку.
 *
 * В рюкзак оно не уезжает: вещь видно в клетке убитого, и подобрать её —
 * отдельное решение. А раз она лежит — этаж обязан её помнить, иначе выход в
 * меню и возврат либо съедали бы добычу, либо выдавали бы её второй раз.
 */
test('добыча кладётся на пол и записывается в этаж', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function dropLootFromMonster\(monster\)/);
  assert.match(runtime, /run\.floor\.drops = \[\.\.\.run\.floor\.drops, запись\]/);
  assert.match(runtime, /lootDefinitions = \[\.\.\.lootDefinitions, \{ \.\.\.entry, drop: true \}\]/);
  // И уходит из этажа ровно тогда, когда её взяли в руки.
  assert.match(runtime, /else if \(loot\.drop\) run\.floor\.drops = run\.floor\.drops\.filter/);
  // Этаж собирается из обоих источников, иначе упавшее исчезло бы при входе.
  assert.match(runtime, /function createFloorLoot\(level\)/);
  assert.doesNotMatch(runtime, /lootDefinitions = createLootDefinitions\(dungeon\)/);
});

/**
 * Столько же добра, но часть его надо отбить.
 *
 * Добыча с убитых — прибавка, и если пол оставить прежним, к середине дороги
 * станет жирно. Поэтому этаж отдаёт одно место бою с той глубины, где у
 * монстров вообще есть что ронять. Первые четыре этажа не трогаются: там
 * ронять некому, а голый старт Иван уже ловил однажды.
 */
test('этаж отдаёт одно место бою, и только там, где бою есть что дать', () => {
  for (const depth of [1, 2, 3, 4]) {
    assert.equal(
      floorScaling(depth).rewards.lootCount,
      floorLootEconomy({
        baseCount: Math.min(9, 4 + Math.floor(depth / 2)),
        baseQualityBudget: 10,
        abundance: DEFAULT_LOOT_ABUNDANCE,
      }).count,
      `этаж ${depth}: начало дороги обеднело`,
    );
  }
  // Глубже — ровно одно место, и на этаже стража тоже одно: его вещь
  // заменяет надбавку за главу, а не половину этажа.
  for (const depth of [5, 9, 12, 15, 18]) {
    const прежде = floorLootEconomy({
      baseCount: Math.min(9, 4 + Math.floor(depth / 2)),
      baseQualityBudget: 10,
      abundance: DEFAULT_LOOT_ABUNDANCE,
    }).count;
    const теперь = floorScaling(depth).rewards.lootCount;
    assert.equal(теперь, прежде - 1, `этаж ${depth}: отдано не одно место`);
  }
});
