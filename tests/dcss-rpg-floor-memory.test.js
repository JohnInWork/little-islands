import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ASCENT_PATH,
  CONTENT_PATHS,
} from '../tools/dcss-rpg-content.js';
import { DEEPEST_DEPTH, STORY_DEPTH } from '../tools/dcss-rpg-run.js';
import { CITY_DEPTH } from '../tools/dcss-rpg-city.js';
import {
  FLOOR_MEMORY,
  SAVE_VERSION,
  advanceRunFloor,
  createRun,
  generateDungeon,
  hydrateDungeon,
  migrateLegacyRun,
  retreatRunFloor,
  travelRunToDepth,
  validateRun,
} from '../tools/dcss-rpg-core.js';

test('a floor the hero leaves is remembered exactly as it was', () => {
  assert.equal(SAVE_VERSION, 51);
  let run = createRun(7007);
  const first = generateDungeon({ seed: run.seed, depth: 1 });
  const victim = first.monsters[0].instanceId;
  const prize = first.loot[0].instanceId;
  run.floor.defeated.push(victim);
  run.floor.collected.push(prize);
  run.floor.revealed.push(`${run.hero.x},${run.hero.y}`);
  assert.equal(validateRun(run), true);

  run = advanceRunFloor(run);
  assert.equal(run.depth, 2);
  assert.deepEqual(Object.keys(run.floors), ['1'], 'the floor above is in the archive');
  assert.deepEqual(run.floors['1'].defeated, [victim]);
  assert.deepEqual(run.floor.defeated, [], 'and the new floor starts clean');
  assert.equal(validateRun(run), true);

  const back = retreatRunFloor(run);
  assert.equal(back.depth, 1);
  assert.deepEqual(back.floor.defeated, [victim], 'the dead stay dead');
  assert.deepEqual(back.floor.collected, [prize], 'and taken loot stays taken');
  assert.deepEqual(Object.keys(back.floors), ['2'], 'the floor below waits its turn');
  assert.equal(validateRun(back), true);

  // The hero climbs onto the stair they went down by.
  assert.deepEqual({ x: back.hero.x, y: back.hero.y }, { x: first.exit.x, y: first.exit.y });
  const hydrated = hydrateDungeon(back);
  assert.equal(hydrated.monsters.some(({ instanceId }) => instanceId === victim), false);
  assert.equal(hydrated.loot.some(({ instanceId }) => instanceId === prize), false);
});

test('the archive never holds the floor underfoot, and refuses nonsense', () => {
  let run = createRun(7008);
  run = advanceRunFloor(run);
  assert.equal(validateRun({ ...run, floors: { 2: run.floor } }), false, 'the current floor is not archived');
  assert.equal(validateRun({ ...run, floors: { 0: run.floors['1'] } }), false, 'there is no floor zero');
  assert.equal(
    validateRun({ ...run, floors: { [DEEPEST_DEPTH + 1]: run.floors['1'] } }),
    false,
    'nor a floor past the far bound',
  );
  assert.equal(validateRun({ ...run, floors: [] }), false, 'the archive is a map, not a list');
  assert.equal(
    validateRun({ ...run, floors: { 1: { ...run.floors['1'], defeated: ['monster-9-0'] } } }),
    false,
    'a floor is checked against its own depth',
  );
});

test('climbing and descending are the same move in two directions', () => {
  let run = createRun(7009);
  // The first floor now has somewhere to climb to: the city on the surface.
  const surface = retreatRunFloor(run);
  assert.equal(surface.depth, CITY_DEPTH);
  assert.throws(() => retreatRunFloor(surface), /nothing above the city/);
  assert.equal(advanceRunFloor(surface).depth, 1, 'and the gate leads back down');
  for (let step = 1; step < STORY_DEPTH; step += 1) run = advanceRunFloor(run);
  assert.equal(run.depth, STORY_DEPTH);
  // The end of the written road is a door, not a wall: the ladder still goes
  // down, and it keeps going for as long as anyone survives it.
  assert.equal(advanceRunFloor(run).depth, STORY_DEPTH + 1);
  assert.equal(validateRun(run), true);

  let up = run;
  for (let step = STORY_DEPTH; step > 1; step -= 1) up = retreatRunFloor(up);
  assert.equal(up.depth, 1);
  assert.equal(validateRun(up), true);
});

/**
 * A floor the hero left keeps its own state, so a dropped sword is still there
 * when you climb back. With no bottom to the dungeon that promise cannot be
 * unlimited: a save that grows with every floor ever made eventually stops
 * being saved at all. So the dungeon remembers the chapter around the hero,
 * and home.
 */
test('the dungeon remembers the chapter around the hero, and the city, and lets the rest go', () => {
  let run = createRun(7011);
  run = retreatRunFloor(run);
  assert.equal(run.depth, CITY_DEPTH);
  for (let step = 0; step < FLOOR_MEMORY * 2; step += 1) run = advanceRunFloor(run);
  assert.equal(run.depth, FLOOR_MEMORY * 2);

  const remembered = Object.keys(run.floors).map(Number).sort((a, b) => a - b);
  assert.ok(remembered.includes(CITY_DEPTH), 'home is always remembered');
  for (const depth of remembered) {
    assert.ok(
      depth === CITY_DEPTH || Math.abs(depth - run.depth) <= FLOOR_MEMORY,
      `floor ${depth} is further away than the dungeon remembers`,
    );
  }
  assert.ok(
    remembered.includes(run.depth - 1),
    'the floor directly above is always there: one step back is never a surprise',
  );
  assert.equal(remembered.includes(1), false, 'and the top of the dungeon has re-formed');
  assert.equal(validateRun(run), true);

  // The archive cannot grow past what the dungeon remembers, however deep it goes.
  for (let step = 0; step < FLOOR_MEMORY * 4; step += 1) run = advanceRunFloor(run);
  assert.ok(
    Object.keys(run.floors).length <= FLOOR_MEMORY * 2 + 1,
    `the archive grew to ${Object.keys(run.floors).length} floors`,
  );
  assert.equal(validateRun(run), true);
});

test('travelling home and back keeps the floor the hero left', () => {
  let run = createRun(7010);
  run = advanceRunFloor(advanceRunFloor(run));
  const marked = generateDungeon({ seed: run.seed, depth: 3 }).monsters[0].instanceId;
  run.floor.defeated.push(marked);
  const away = travelRunToDepth(run, 1, null);
  assert.equal(away.depth, 1);
  assert.deepEqual(away.floors['3'].defeated, [marked]);
  const home = travelRunToDepth(away, 3, null);
  assert.deepEqual(home.floor.defeated, [marked], 'the stone brings the hero back to the same floor');
  assert.equal(validateRun(home), true);
  assert.equal(travelRunToDepth(home, 3, null), home, 'travelling nowhere changes nothing');
});

test('a migrated run starts with an empty archive', () => {
  const legacy = structuredClone(createRun(7011));
  legacy.version = 41;
  delete legacy.floors;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, 51);
  assert.deepEqual(migrated.floors, {});
  assert.equal(validateRun(migrated), true);
});

/**
 * Этаж меняет кнопка, а не шаг.
 *
 * Раньше шаг на лестницу вниз (и на ворота города) сразу уводил с этажа, а
 * флаг `stairsArmed` не давал утащить героя обратно в момент прибытия. Иван
 * попросил лестницы как все прочие вещи: шаг ставит их в колонку «что рядом»,
 * а спуск и подъём — кнопка в карточке. Флаг ушёл вместе с шагом: на прибытии
 * срабатывать нечему.
 */
test('the runtime draws the way up and changes floors only from the card', async () => {
  assert.ok(CONTENT_PATHS.includes(ASCENT_PATH), 'the sprite ships with the build');
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function climbFloor\(\)[\s\S]*retreatRunFloor\(captureRun\(\)\)/);
  const step = runtime.slice(runtime.indexOf('function resolveWorldInteractions()'));
  const stepBody = step.slice(0, step.indexOf('\n}'));
  for (const move of ['descendFloor(', 'climbFloor(', 'switchRunBranch(', 'enterBranch(']) {
    assert.ok(!stepBody.includes(move), `a step on a tile calls ${move}`);
  }
  assert.ok(!runtime.includes('stairsArmed'), 'the arming flag outlived the step that needed it');
  // Кнопки: вниз, наверх и развилки — каждая через свою карточку.
  assert.match(runtime, /'stair-down'\(\) \{\s*closeContextActions\(\);[\s\S]*?if \(!stairDownOpen\(\)\) return false;\s*descendFloor\(\);/);
  assert.match(runtime, /'stair-up'\(\) \{\s*closeContextActions\(\);\s*climbFloor\(\);/);
  // Поднявшись, герой выходит у спуска, как и считают правила, а не у подъёма.
  assert.match(runtime, /function climbFloor\(\)[\s\S]*?replaceFloor\(run\.depth, \{ x: run\.hero\.x, y: run\.hero\.y \}\);/);
  // Замок стража и развилки на месте.
  assert.match(runtime, /function stairDownOpen\(\) \{[\s\S]*?canLeaveDungeonFloor\(\{/);
  // Возвращается герой ровно в те ворота, которыми ушёл, а не в ворота своей
  // дороги: уйти можно одними, а дорога при этом выбирается другая.
  assert.match(runtime, /placeHeroAtCell\(run\.cityGate \?\? воротаДороги \?\? dungeon\.exit\);/, 'you come out where you went in');
  assert.match(runtime, /dungeon = hydrateDungeon\(run\);/, 'a floor change loads what the run remembers');
});

/**
 * Все трое ворот города — выход, а не два из трёх декорация.
 *
 * Город рисует три выхода, а развилку открывали только те, что совпали с
 * `dungeon.exit`, — и это всегда одни и те же, наружные. К двум остальным игрок
 * подходил и не получал ничего: ни окна, ни отказа. Хуже: поднявшись из пещер,
 * герой встаёт у ворот своей дороги — как раз у тех, которые молчали. Иван:
 * «нажимаю кнопку подняться наверх, и ничего не происходит».
 */
test('развилку открывают все ворота города, и возвращают они туда же', async () => {
  const { generateDungeon, validateCityGate } = await import('../tools/dcss-rpg-core.js');
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');

  // Ворот в плане трое, и `exit` — только одни из них.
  for (const seed of [5, 63, 77, 12345]) {
    const town = generateDungeon({ seed, depth: 0 });
    const ворота = Object.values(town.gates ?? {});
    assert.equal(ворота.length, 3, `сид ${seed}: ворот не три`);
    const совпало = ворота.filter((gate) => gate.x === town.exit.x && gate.y === town.exit.y);
    assert.equal(совпало.length, 1, `сид ${seed}: выход совпал не с одними воротами`);
  }

  // Поэтому развилка спрашивается у всех ворот, а не у клетки выхода.
  const поиск = runtime.slice(runtime.indexOf('function nearbyCityGate()'));
  const тело = поиск.slice(0, поиск.indexOf('\n}\n'));
  assert.match(тело, /Object\.values\(dungeon\.gates \?\? \{\}\)/, 'развилка снова только у одних ворот');

  // И клетка ухода — законное поле сохранения, а не что попало.
  assert.equal(validateCityGate(undefined), true, 'забег без выхода из города испорчен');
  assert.equal(validateCityGate({ x: 3, y: 4 }), true);
  assert.equal(validateCityGate({ x: -1, y: 4 }), false);
  assert.equal(validateCityGate({ x: 3 }), false);
  assert.equal(validateCityGate([3, 4]), false);
});
