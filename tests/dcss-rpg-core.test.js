import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EVENT_CATALOG,
  LOOT_CATALOG,
  MONSTER_CATALOG,
  eventById,
  lootById,
  monsterById,
} from '../tools/dcss-rpg-content.js';
import {
  advanceRunFloor,
  createRun,
  findGridPath,
  generateDungeon,
  hydrateDungeon,
  revealAround,
  validateRun,
} from '../tools/dcss-rpg-core.js';

test('RPG dungeon generation is deterministic and every exit is reachable across 100 seeds', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const first = generateDungeon({ seed, depth: 1 + (seed % 12) });
    const second = generateDungeon({ seed, depth: 1 + (seed % 12) });
    assert.deepEqual(first, second);
    assert.ok(first.rooms.length >= 6);
    assert.ok(findGridPath(first.grid, first.spawn, first.exit).length > 0);
    assert.ok(first.monsters.every((monster) => monsterById(monster.id)));
    assert.ok(first.loot.every((item) => lootById(item.id)));
    assert.ok(first.events.every((event) => eventById(event.id)));
  }
});

test('different seeds and depths create different layouts and progressively deeper monster pools', () => {
  const first = generateDungeon({ seed: 731_923, depth: 1 });
  const second = generateDungeon({ seed: 731_924, depth: 1 });
  const deep = generateDungeon({ seed: 731_923, depth: 12 });
  assert.notDeepEqual(first.grid, second.grid);
  assert.notEqual(first.seed, deep.seed);
  assert.ok(Math.max(...deep.monsters.map(({ id }) => monsterById(id).tier)) > 1);
  assert.ok(deep.monsters.length > first.monsters.length);
});

test('revealing is bounded, repeatable and never mutates the generated grid', () => {
  const dungeon = generateDungeon({ seed: 42, depth: 2 });
  const before = dungeon.grid.map((row) => row.join('')).join('\n');
  const revealed = new Set();
  assert.equal(revealAround(revealed, dungeon.grid, dungeon.spawn, 4), true);
  assert.equal(revealAround(revealed, dungeon.grid, dungeon.spawn, 4), false);
  assert.ok(revealed.size > 30 && revealed.size < 100);
  assert.equal(dungeon.grid.map((row) => row.join('')).join('\n'), before);
});

test('versioned run snapshots reject corruption and regenerate dynamic floor state from IDs', () => {
  const dungeon = generateDungeon({ seed: 88, depth: 1 });
  const run = createRun(88, dungeon);
  assert.equal(validateRun(run), true);
  run.floor.defeated.push(dungeon.monsters[0].instanceId);
  run.floor.collected.push(dungeon.loot[0].instanceId);
  run.floor.resolved.push(dungeon.events[0].instanceId);
  const hydrated = hydrateDungeon(run);
  assert.equal(hydrated.monsters.length, dungeon.monsters.length - 1);
  assert.equal(hydrated.loot.length, dungeon.loot.length - 1);
  assert.equal(hydrated.events.length, dungeon.events.length - 1);
  assert.equal(validateRun({ ...run, version: 999 }), false);
  assert.equal(validateRun({ ...run, hero: { ...run.hero, hp: Number.NaN } }), false);
  assert.equal(validateRun({ ...run, inventory: [{ id: 'missing-item' }] }), false);
});

test('descending advances the deterministic floor while preserving persistent progression', () => {
  const run = createRun(991);
  run.hero.hp = 40;
  run.hero.level = 3;
  run.hero.xp = 17;
  run.shards = 9;
  run.equipment.hand1 = 2;
  run.floor.revealed.push('1,1');

  const next = advanceRunFloor(run);
  const dungeon = generateDungeon({ seed: run.seed, depth: 2 });
  assert.equal(next.depth, 2);
  assert.deepEqual({ x: next.hero.x, y: next.hero.y }, dungeon.spawn);
  assert.equal(next.hero.hp, 58);
  assert.equal(next.hero.level, 3);
  assert.equal(next.hero.xp, 17);
  assert.equal(next.shards, 9);
  assert.equal(next.equipment.hand1, 2);
  assert.equal(next.inventory.length, run.inventory.length);
  assert.deepEqual(next.floor, { revealed: [], defeated: [], collected: [], resolved: [] });
  assert.equal(run.depth, 1);
  assert.deepEqual(run.floor.revealed, ['1,1']);
  assert.ok(findGridPath(dungeon.grid, dungeon.spawn, dungeon.exit).length > 0);
  assert.equal(validateRun(next), true);
});

test('content catalogs already expose a broad first production set with stable unique IDs', () => {
  for (const catalog of [MONSTER_CATALOG, LOOT_CATALOG, EVENT_CATALOG]) {
    assert.equal(new Set(catalog.map(({ id }) => id)).size, catalog.length);
  }
  assert.ok(MONSTER_CATALOG.length >= 24);
  assert.ok(LOOT_CATALOG.length >= 36);
  assert.ok(EVENT_CATALOG.length >= 4);
});
