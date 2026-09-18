import assert from 'node:assert/strict';
import test from 'node:test';

import { isCityDepth } from '../tools/dcss-rpg-city.js';

import {
  EVENT_CATALOG,
  LOOT_CATALOG,
  MONSTER_CATALOG,
  eventById,
  lootById,
  monsterById,
} from '../tools/dcss-rpg-content.js';
import {
  CONTENT_VERSION,
  LEGACY_SAVE_KEY,
  LEGACY_SAVE_KEYS,
  SAVE_KEY,
  SAVE_VERSION,
  advanceRunFloor,
  createRun,
  findGridPath,
  generateDungeon,
  hasLineOfSight,
  hydrateDungeon,
  migrateLegacyRun,
  revealAround,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import {
  CHAPTER_GUARDIANS,
  FINAL_BOSS_ID,
  FINAL_DEPTH,
} from '../tools/dcss-rpg-run.js';
import { DEFAULT_DIFFICULTY, SCALING_VERSION } from '../tools/dcss-rpg-scaling.js';
import { createSkillState } from '../tools/dcss-rpg-skills.js';
import { HUNGER_MAX } from '../tools/dcss-rpg-hunger.js';
import { createStartingMagic } from '../tools/dcss-rpg-build-presets.js';
import { createActorEffects } from '../tools/dcss-rpg-effects.js';
import { createSpellState } from '../tools/dcss-rpg-spells.js';

const EMPTY_FLOOR = Object.freeze({
  revealed: [],
  defeated: [],
  collected: [],
  resolved: [],
  resolvedFindIds: [],
  detectedTrapIds: [],
  disarmedTrapIds: [],
  placedTraps: [],
  opened: [],
  triggered: [],
  monsters: [],
  passives: [],
  camp: null,
});

function assertFreshFloor(floor, { depth = 1 } = {}) {
  const { chests, merchants, ...rest } = floor;
  assert.deepEqual(rest, EMPTY_FLOOR);
  // A city has traders instead of chests, and more than one of them.
  const city = isCityDepth(depth);
  assert.ok(Array.isArray(chests) && (city ? chests.length === 0 : chests.length > 0));
  assert.ok(chests.every((container) => !container.opened && !container.destroyed));
  assert.ok(Array.isArray(merchants) && merchants.length <= (city ? 4 : 1));
  assert.ok(merchants.every((merchant) => (
    merchant.gold > 0
    && merchant.purchasedEntryIds.length === 0
    && merchant.buyback.length === 0
  )));
}

test('RPG dungeon generation is deterministic and every exit is reachable across 100 seeds', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const first = generateDungeon({ seed, depth: 1 + (seed % 12) });
    const second = generateDungeon({ seed, depth: 1 + (seed % 12) });
    assert.deepEqual(first, second);
    assert.ok(first.rooms.length >= 6);
    assert.ok(findGridPath(first.grid, first.spawn, first.exit, { allowDoors: true }).length > 0);
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

test('the nine-floor run introduces one readable monster tier per depth', () => {
  const tiersByDepth = Array.from({ length: FINAL_DEPTH }, (_, index) => index + 1).map((depth) => {
    const seen = new Set();
    for (let seed = 1; seed <= 250; seed += 1) {
      if (isCityDepth(depth)) continue;
      for (const spawn of generateDungeon({ seed, depth }).monsters) {
        const definition = monsterById(spawn.id);
        // Water and chapter creatures are seated by their own streams, not the pool.
        if (definition.spawn || definition.chapter) continue;
        seen.add(definition.tier);
      }
    }
    return [...seen].sort((a, b) => a - b);
  });

  assert.deepEqual(
    tiersByDepth,
    Array.from({ length: FINAL_DEPTH }, (_, index) => (
      // The city floor meets no pool monster, so its tier list stays empty.
      isCityDepth(index + 1)
        ? []
        : Array.from({ length: index + 1 }, (_value, tierIndex) => tierIndex + 1)
    )),
  );
});

test('revealing is bounded, repeatable and never mutates the generated grid', () => {
  const dungeon = generateDungeon({ seed: 42, depth: 2 });
  const before = dungeon.grid.map((row) => row.join('')).join('\n');
  const revealed = new Set();
  assert.equal(revealAround(revealed, dungeon.grid, dungeon.spawn, 4), true);
  assert.equal(revealAround(revealed, dungeon.grid, dungeon.spawn, 4), false);
  assert.ok(revealed.size > 8 && revealed.size < 100);
  assert.equal(dungeon.grid.map((row) => row.join('')).join('\n'), before);
});

test('versioned run snapshots reject corruption and regenerate dynamic floor state from IDs', () => {
  const dungeon = generateDungeon({ seed: 88, depth: 1 });
  const run = createRun(88, dungeon);
  assert.equal(validateRun(run), true);
  const defeated = dungeon.monsters[0];
  const collected = dungeon.loot[0];
  const resolved = dungeon.events[0];
  run.floor.defeated.push(defeated.instanceId);
  run.floor.collected.push(collected.instanceId);
  run.floor.resolved.push(resolved.instanceId);
  const hydrated = hydrateDungeon(run);
  assert.equal(hydrated.monsters.length, dungeon.monsters.length - 1);
  assert.equal(hydrated.loot.length, dungeon.loot.length - 1);
  assert.equal(hydrated.events.length, dungeon.events.length - 1);
  assert.equal(validateRun({ ...run, version: 999 }), false);
  assert.equal(validateRun({ ...run, hero: { ...run.hero, hp: Number.NaN } }), false);
  assert.equal(validateRun({ ...run, inventory: ['missing-item'] }), false);
});

test('descending advances the deterministic floor while preserving persistent progression', () => {
  const run = createRun(991);
  run.hero.hp = 40;
  run.hero.level = 3;
  run.hero.skills = createSkillState(3);
  run.hero.xp = 17;
  run.gold = 9;
  run.items.push({
    id: 'long-sword',
    uid: 'test-sword',
    affixIds: [],
  });
  run.equipment.hand1 = 'test-sword';
  run.items = run.items.filter((item) => item.uid !== 'starter-sword');
  run.floor.revealed.push('1,1');

  const next = advanceRunFloor(run);
  const dungeon = generateDungeon({ seed: run.seed, depth: 2 });
  assert.equal(next.depth, 2);
  assert.deepEqual({ x: next.hero.x, y: next.hero.y }, dungeon.spawn);
  assert.equal(next.hero.hp, 40);
  assert.equal(next.hero.level, 3);
  assert.equal(next.hero.xp, 17);
  assert.equal(next.gold, 9);
  assert.equal(next.equipment.hand1, 'test-sword');
  assert.equal(next.inventory.length, run.inventory.length);
  assertFreshFloor(next.floor);
  assert.equal(run.depth, 1);
  assert.deepEqual(run.floor.revealed, ['1,1']);
  assert.ok(findGridPath(dungeon.grid, dungeon.spawn, dungeon.exit, { allowDoors: true }).length > 0);
  assert.equal(validateRun(next), true);
});

test('content catalogs already expose a broad first production set with stable unique IDs', () => {
  for (const catalog of [MONSTER_CATALOG, LOOT_CATALOG, EVENT_CATALOG]) {
    assert.equal(new Set(catalog.map(({ id }) => id)).size, catalog.length);
  }
  assert.ok(MONSTER_CATALOG.length >= 25);
  assert.ok(LOOT_CATALOG.length >= 37);
  assert.ok(EVENT_CATALOG.length >= 4);
});

test('starter encounter is visible and reserved cells never overlap across 1000 seeds', () => {
  for (let seed = 1; seed <= 1000; seed += 1) {
    const depth = 1 + (seed % 12);
    // A city greets the hero with streets, not with a starter fight and a drop.
    if (isCityDepth(depth)) continue;
    const dungeon = generateDungeon({ seed, depth });
    const visible = new Set();
    revealAround(visible, dungeon.grid, dungeon.spawn, 4);
    assert.ok(visible.has(`${dungeon.monsters[0].x},${dungeon.monsters[0].y}`));
    assert.ok(visible.has(`${dungeon.loot[0].x},${dungeon.loot[0].y}`));
    assert.ok(lootById(dungeon.loot[0].id).slot);
    assert.ok(!['rusty-sword', 'worn-tunic'].includes(dungeon.loot[0].id), 'the first drop never duplicates the bare start');

    const occupied = [
      dungeon.spawn,
      dungeon.exit,
      ...(dungeon.sanctuary ? [dungeon.sanctuary] : []),
      ...dungeon.events,
      ...dungeon.monsters,
      ...dungeon.loot,
    ].map(({ x, y }) => `${x},${y}`);
    assert.equal(new Set(occupied).size, occupied.length);
  }
});

test('line of sight and player navigation do not pass through closed corners or hidden cells', () => {
  const corner = [
    ['.', '#', '.'],
    ['#', '.', '.'],
    ['.', '.', '.'],
  ];
  assert.equal(hasLineOfSight(corner, { x: 0, y: 0 }, { x: 1, y: 1 }), false);

  const dungeon = generateDungeon({ seed: 6, depth: 1 });
  const revealed = new Set();
  revealAround(revealed, dungeon.grid, dungeon.spawn, 4);
  const visibleGrid = dungeon.grid.map((row, y) =>
    row.map((cell, x) => (revealed.has(`${x},${y}`) ? cell : '#')),
  );
  for (const targetKey of revealed) {
    const [x, y] = targetKey.split(',').map(Number);
    if (visibleGrid[y][x] !== '.') continue;
    assert.ok(
      findGridPath(visibleGrid, dungeon.spawn, { x, y }).every((cell) =>
        revealed.has(`${cell.x},${cell.y}`),
      ),
    );
  }
});

test('version 1 saves migrate deterministically to owned UID equipment', () => {
  assert.equal(LEGACY_SAVE_KEY.endsWith(':v1'), true);
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v4')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v5')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v6')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v8')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v2')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v3')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v9')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v10')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v11')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v12')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v14')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v15')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v16')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v17')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v18')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v19')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v20')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v21')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v22')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v23')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v26')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v28')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v29')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v30')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v31')));
  assert.ok(LEGACY_SAVE_KEYS.some((key) => key.endsWith(':v33')));
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v42');
  const dungeon = generateDungeon({ seed: 88, depth: 1 });
  const legacy = {
    version: 1,
    seed: 88,
    depth: 1,
    hero: { x: dungeon.spawn.x, y: dungeon.spawn.y, hp: 80, maxHp: 100, level: 1, xp: 0, power: 1 },
    shards: 3,
    equipment: { body: 0, head: 0, hand1: 1, hand2: 0, boots: 0, ring1: 0, ring2: 0, amulet: 0 },
    inventory: [
      { id: 'long-sword', uid: 'same' },
      { id: 'healing-potion', uid: 'same', stack: 2 },
    ],
    floor: { revealed: [], defeated: [], collected: [], resolved: [] },
  };
  const first = migrateLegacyRun(legacy);
  const second = migrateLegacyRun(legacy);
  assert.deepEqual(first, second);
  assert.equal(first.version, SAVE_VERSION);
  assert.equal(first.gold, 3);
  assert.equal(Object.hasOwn(first, 'shards'), false);
  assert.equal(validateRun(first), true);
  assert.equal(first.equipment.hand1, 'same');
  assert.equal(first.equipment.ring1, null);
  assert.equal(new Set(first.items.map((item) => item.uid)).size, first.items.length);
  assert.doesNotThrow(() => hydrateDungeon(first));
});

test('version 26 saves gain magic while the expanded-run boundary rebuilds only the floor', () => {
  const legacy = advanceRunFloor(createRun(2701));
  legacy.version = 26;
  legacy.contentVersion = 13;
  legacy.floor.revealed.push(`${legacy.hero.x},${legacy.hero.y}`);
  delete legacy.hero.intelligence;
  delete legacy.hero.spells;
  const migrated = migrateLegacyRun(legacy);
  // Pre-magic saves keep the historical wanderer kit rather than the new bare start.
  const startingMagic = createStartingMagic('wanderer');
  const dungeon = generateDungeon({ seed: migrated.seed, depth: migrated.depth });
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.hero.intelligence, startingMagic.intelligence);
  assert.deepEqual(migrated.hero.spells, startingMagic.spells);
  assertFreshFloor(migrated.floor);
  assert.deepEqual({ x: migrated.hero.x, y: migrated.hero.y }, dungeon.spawn);
  assert.equal(validateRun(migrated), true);
});

test('version 28 saves gain frozen timers without losing active actor conditions', () => {
  const legacy = createRun(2901);
  const level = generateDungeon({ seed: legacy.seed, depth: legacy.depth });
  const spawn = level.monsters[0];
  legacy.version = 28;
  legacy.contentVersion = 15;
  legacy.hero.effects = { burning: 0, wet: 3, chilled: 2, poison: 0 };
  legacy.floor.monsters.push({
    instanceId: spawn.instanceId,
    x: spawn.x,
    y: spawn.y,
    hp: 5,
    attackSequence: 2,
    effects: { burning: 0, wet: 0, chilled: 4, poison: 0 },
  });

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.contentVersion, CONTENT_VERSION);
  assert.deepEqual(migrated.hero.effects, createActorEffects({ wet: 3, chilled: 2 }));
  assertFreshFloor(migrated.floor);
  assert.equal(validateRun(migrated), true);
});

test('version 22 saves gain fresh merchant states and rebase onto the expanded run', () => {
  let legacy = advanceRunFloor(createRun(2302));
  legacy.version = 22;
  delete legacy.floor.merchants;
  delete legacy.floor.merchantPurchases;
  legacy.floor.revealed.push(`${legacy.hero.x},${legacy.hero.y}`);

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.ok(Array.isArray(migrated.floor.merchants));
  assert.equal(Object.hasOwn(migrated.floor, 'merchantPurchases'), false);
  assert.equal(migrated.hero.hunger, HUNGER_MAX);
  assertFreshFloor(migrated.floor);
  assert.equal(validateRun(migrated), true);
});

test('version 23 saves gain full satiety while obsolete floor purchases are safely cleared', () => {
  const legacy = advanceRunFloor(advanceRunFloor(createRun(2403)));
  const dungeon = generateDungeon({ seed: legacy.seed, depth: legacy.depth });
  delete legacy.floor.merchants;
  legacy.floor.merchantPurchases = [dungeon.merchants[0].stock[0].entryId];
  legacy.floor.revealed.push(`${legacy.hero.x},${legacy.hero.y}`);
  legacy.version = 23;
  delete legacy.hero.hunger;

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.hero.hunger, HUNGER_MAX);
  assertFreshFloor(migrated.floor);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
});

test('merchant states remain valid save data only for the generated floor merchant', () => {
  const run = advanceRunFloor(advanceRunFloor(createRun(2303)));
  const dungeon = generateDungeon({ seed: run.seed, depth: run.depth });
  const entry = dungeon.merchants[0].stock[0];
  const merchantState = run.floor.merchants[0];
  run.gold = Math.max(run.gold, entry.price);
  run.items.push({ ...entry.record });
  run.inventory.push(entry.record.uid);
  run.floor.merchants[0] = {
    ...merchantState,
    gold: merchantState.gold + entry.price,
    purchasedEntryIds: [entry.entryId],
    buyback: [],
  };

  assert.equal(validateRun(run), true);
  assert.doesNotThrow(() => hydrateDungeon(run));
  run.floor.merchants[0].purchasedEntryIds[0] = `merchant-entry-${run.depth}-999-999`;
  assert.equal(validateRun(run), true);
  assert.throws(() => hydrateDungeon(run), /Unknown merchant state/);
});

test('v15 loadouts migrate two-handed weapons without losing their off-hand item', () => {
  const legacy = createRun(1616);
  legacy.version = 15;
  legacy.contentVersion = 6;
  legacy.items.push({ id: 'executioner-axe', uid: 'legacy-two-handed' });
  legacy.items.push({ id: 'wood-buckler', uid: 'starter-buckler' });
  legacy.equipment.hand2 = 'starter-buckler';
  legacy.inventory.push('starter-sword');
  legacy.equipment.hand1 = 'legacy-two-handed';

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.equipment.hand1, 'legacy-two-handed');
  assert.equal(migrated.equipment.hand2, null);
  assert.ok(migrated.inventory.includes('starter-buckler'));
  assert.equal(validateRun(migrated), true);

  const invalid = structuredClone(migrated);
  invalid.inventory = invalid.inventory.filter((uid) => uid !== 'starter-buckler');
  invalid.equipment.hand2 = 'starter-buckler';
  assert.equal(validateRun(invalid), false);
});

test('v16 runs keep owned gear while the nine-floor generator rebases the active floor', () => {
  const legacy = createRun(1617);
  legacy.version = 16;
  legacy.contentVersion = 7;
  legacy.floor.revealed.push(`${legacy.hero.x},${legacy.hero.y}`);
  const before = structuredClone(legacy);

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.contentVersion, CONTENT_VERSION);
  assert.deepEqual(migrated.knowledge, { version: 1, identifiedItemIds: [] });
  assertFreshFloor(migrated.floor);
  assert.deepEqual(migrated.items, before.items.map((item) => (
    lootById(item.id)?.slot
      ? { ...item, artifactPowerId: null, artifactCurseId: null }
      : item
  )));
  assert.deepEqual(migrated.equipment, before.equipment);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
  assert.deepEqual(legacy, before);
});

test('version 3 saves preserve owned gear and gain empty accessory slots', () => {
  const current = createRun(777);
  const legacy = structuredClone(current);
  legacy.version = 3;
  delete legacy.equipment.cloak;
  delete legacy.equipment.gloves;
  delete legacy.equipment.belt;

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.equipment.body, current.equipment.body);
  assert.equal(migrated.equipment.hand1, current.equipment.hand1);
  assert.equal(migrated.equipment.cloak, null);
  assert.equal(migrated.equipment.gloves, null);
  assert.equal(migrated.equipment.belt, null);
  assert.equal(validateRun(migrated), true);
});

test('version 4 saves gain a stable scaling profile and restart across the door generator boundary', () => {
  const current = createRun(779);
  const legacy = structuredClone(current);
  legacy.version = 4;
  delete legacy.scalingVersion;
  delete legacy.difficulty;
  legacy.floor.revealed.push('1,1');

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.scalingVersion, SCALING_VERSION);
  assert.equal(migrated.difficulty, DEFAULT_DIFFICULTY);
  assertFreshFloor(migrated.floor);
  assert.equal(validateRun(migrated), true);
});

test('version 5 saves adopt the current difficulty and gain an empty effect state on a fresh floor', () => {
  const current = createRun(780);
  const legacy = structuredClone(current);
  legacy.version = 5;
  legacy.difficulty = 1.4;
  delete legacy.hero.effects;
  legacy.floor.revealed.push('1,1');

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.difficulty, DEFAULT_DIFFICULTY);
  assert.deepEqual(migrated.hero.effects, {
    burning: 0,
    wet: 0,
    chilled: 0,
    frozen: 0,
    poison: 0,
  });
  assertFreshFloor(migrated.floor);
  assert.equal(validateRun(migrated), true);
});

test('version 6 saves preserve status effects and adopt the current difficulty', () => {
  const current = createRun(781);
  const legacy = structuredClone(current);
  legacy.version = 6;
  legacy.difficulty = 1.25;
  legacy.hero.effects.wet = 5;
  delete legacy.floor.opened;
  delete legacy.floor.triggered;

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.difficulty, DEFAULT_DIFFICULTY);
  assert.equal(migrated.hero.effects.wet, 5);
  assertFreshFloor(migrated.floor);
  assert.equal(validateRun(migrated), true);
});

test('version 8 saves keep hero progression and gear while adopting the harder v9 run', () => {
  const dungeon = generateDungeon({ seed: 782, depth: 2, difficulty: 1 });
  const legacy = createRun(782, dungeon);
  legacy.version = 8;
  legacy.difficulty = 1;
  legacy.hero.level = 4;
  delete legacy.hero.skills;
  legacy.hero.power = 5;
  delete legacy.gold;
  legacy.shards = 17;
  legacy.floor.revealed.push(`${legacy.hero.x},${legacy.hero.y}`);

  const migrated = migrateLegacyRun(legacy);
  const harderFloor = generateDungeon({
    seed: migrated.seed,
    depth: migrated.depth,
    difficulty: DEFAULT_DIFFICULTY,
  });
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.difficulty, DEFAULT_DIFFICULTY);
  assert.equal(migrated.hero.level, 4);
  assert.equal(migrated.hero.power, 5);
  assert.equal(migrated.gold, 17);
  assert.deepEqual(migrated.items, legacy.items);
  assert.deepEqual(migrated.equipment, legacy.equipment);
  assert.deepEqual(migrated.inventory, legacy.inventory);
  assert.deepEqual({ x: migrated.hero.x, y: migrated.hero.y }, harderFloor.spawn);
  assertFreshFloor(migrated.floor);
  assert.equal(validateRun(migrated), true);
});

test('all eleven equipment slots can coexist with a full twelve-item backpack', () => {
  const run = createRun(778);
  const equipped = [
    ['hand2', 'wood-buckler'],
    ['boots', 'jackboots'],
    ['cloak', 'travel-cloak'],
    ['gloves', 'leather-gloves'],
    ['belt', 'iron-belt'],
    ['head', 'iron-helm'],
    ['ring1', 'fire-ring'],
    ['ring2', 'ice-ring'],
    ['amulet', 'spirit-amulet'],
  ];
  for (const [slot, id] of equipped) {
    const uid = `full-${slot}`;
    run.items.push({ id, uid, affixIds: [] });
    run.equipment[slot] = uid;
  }
  for (let index = 0; index < 12; index += 1) {
    const uid = `full-pack-${index}`;
    run.items.push({ id: 'mystery-potion', uid });
    run.inventory.push(uid);
  }
  assert.equal(Object.values(run.equipment).filter(Boolean).length, 11);
  assert.equal(run.inventory.length, 12);
  assert.equal(run.items.length, 23);
  assert.equal(validateRun(run), true);
});

test('save validation rejects duplicated ownership, dead-state mismatches and foreign floor IDs', () => {
  const run = createRun(41);
  assert.equal(validateRun({ ...run, difficulty: 0.49 }), false);
  assert.equal(validateRun({ ...run, difficulty: 4.01 }), false);
  assert.equal(validateRun({ ...run, inventory: [...run.inventory, run.inventory[0]] }), false);
  assert.equal(validateRun({ ...run, status: 'dead' }), false);
  assert.equal(
    validateRun({ ...run, hero: { ...run.hero, effects: { ...run.hero.effects, burning: 99 } } }),
    false,
  );
  assert.equal(
    validateRun({ ...run, floor: { ...run.floor, defeated: ['monster-99-0'] } }),
    false,
  );
  const duplicatedChestOwnership = structuredClone(run);
  duplicatedChestOwnership.floor.chests[0].items[0].uid = run.inventory[0];
  assert.equal(validateRun(duplicatedChestOwnership), false);
  const merchantRun = advanceRunFloor(advanceRunFloor(createRun(413)));
  const duplicatedMerchantOwnership = structuredClone(merchantRun);
  duplicatedMerchantOwnership.floor.merchants[0].buyback.push({
    record: structuredClone(merchantRun.items.find(({ uid }) => uid === merchantRun.inventory[0])),
    price: 4,
  });
  assert.equal(validateRun(duplicatedMerchantOwnership), false);
  const blocked = structuredClone(run);
  blocked.hero.x = 0;
  blocked.hero.y = 0;
  assert.throws(() => hydrateDungeon(blocked), /blocked/);
});

test('living monster position and health survive hydration', () => {
  const run = createRun(512);
  const dungeon = generateDungeon({ seed: run.seed, depth: run.depth });
  const monster = dungeon.monsters[0];
  run.floor.monsters.push({
    instanceId: monster.instanceId,
    x: monster.x,
    y: monster.y,
    hp: 1,
    effects: createActorEffects({ chilled: 3 }),
  });

  const hydrated = hydrateDungeon(run);
  const restored = hydrated.monsters.find(({ instanceId }) => instanceId === monster.instanceId);
  assert.deepEqual(restored.state, {
    instanceId: monster.instanceId,
    x: monster.x,
    y: monster.y,
    hp: 1,
    effects: createActorEffects({ chilled: 3 }),
  });
});

test('a dead run cannot descend and cannot be revived by floor healing', () => {
  const run = createRun(712);
  run.hero.hp = 0;
  run.status = 'dead';
  assert.equal(validateRun(run), true);
  assert.throws(() => advanceRunFloor(run), /run has ended/);
});

test('each three-floor chapter ends with a reachable guardian and only floor nine has the artifact', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    for (const expected of CHAPTER_GUARDIANS) {
      const dungeon = generateDungeon({ seed, depth: expected.depth });
      assert.ok(dungeon.sanctuary);
      assert.equal(dungeon.objective.bossId, expected.monsterId);
      assert.deepEqual(dungeon.objective.gate, dungeon.exit);
      assert.deepEqual(dungeon.objective.artifact, expected.final ? dungeon.exit : null);
      const guardian = dungeon.monsters.find(
        ({ instanceId }) => instanceId === dungeon.objective.bossInstanceId,
      );
      assert.equal(guardian.id, expected.monsterId);
      assert.equal(
        Math.abs(guardian.x - dungeon.exit.x) + Math.abs(guardian.y - dungeon.exit.y),
        1,
      );
      assert.ok(
        findGridPath(dungeon.grid, dungeon.spawn, dungeon.exit, { allowDoors: true }).length > 0,
      );
    }
  }
});

test('victory is valid only after the final guardian is defeated', () => {
  let run = createRun(891);
  while (run.depth < FINAL_DEPTH) run = advanceRunFloor(run);
  const dungeon = generateDungeon({ seed: run.seed, depth: FINAL_DEPTH });
  run.status = 'victory';
  assert.equal(validateRun(run), false);
  run.floor.defeated.push(dungeon.objective.bossInstanceId);
  assert.equal(validateRun(run), true);
  assert.doesNotThrow(() => hydrateDungeon(run));
  assert.throws(() => advanceRunFloor(run), /run has ended/);
});

test('version 2 saves can resume on a valid expanded-run floor without losing owned gear', () => {
  const current = createRun(321);
  const legacy = structuredClone(current);
  legacy.version = 2;
  delete legacy.generatorVersion;
  delete legacy.contentVersion;
  legacy.depth = 5;
  legacy.hero.x = 1;
  legacy.hero.y = 1;
  const migrated = migrateLegacyRun(legacy);
  const resumedFloor = generateDungeon({ seed: migrated.seed, depth: 5 });
  assert.equal(migrated.depth, 5);
  assert.deepEqual(
    { x: migrated.hero.x, y: migrated.hero.y },
    resumedFloor.spawn,
  );
  assert.deepEqual(migrated.equipment, current.equipment);
  assert.deepEqual(migrated.inventory, current.inventory);
  assertFreshFloor(migrated.floor);
  assert.equal(validateRun(migrated), true);
  assert.equal(legacy.depth, 5);
});

test('a completed v30 prologue continues on floor four instead of becoming a false victory', () => {
  let legacy = createRun(3031);
  legacy = advanceRunFloor(advanceRunFloor(legacy));
  const oldFinal = generateDungeon({ seed: legacy.seed, depth: legacy.depth });
  legacy.version = 30;
  legacy.generatorVersion = 6;
  legacy.contentVersion = 17;
  legacy.scalingVersion = 1;
  legacy.status = 'victory';
  legacy.floor.defeated.push(oldFinal.objective.bossInstanceId);

  const migrated = migrateLegacyRun(legacy);
  const fourthFloor = generateDungeon({ seed: migrated.seed, depth: 4 });
  assert.equal(migrated.depth, 4);
  assert.equal(migrated.status, 'playing');
  assert.deepEqual({ x: migrated.hero.x, y: migrated.hero.y }, fourthFloor.spawn);
  assertFreshFloor(migrated.floor, { depth: migrated.depth });
  assert.equal(validateRun(migrated), true);
});

test('v31 gains Storm Magic content without rebuilding the active floor', () => {
  const current = createRun(3132);
  current.started = true;
  current.floor.revealed.push(`${current.hero.x},${current.hero.y}`);
  current.hero.spells = createSpellState({
    knownSpellIds: ['ember-bolt', 'mending-light', 'frost-lance'],
    preparedSpellIds: ['frost-lance', 'mending-light', null],
  });
  const legacy = structuredClone(current);
  legacy.version = 31;
  legacy.contentVersion = 18;
  delete legacy.floor.chests;
  delete legacy.floor.merchants;
  legacy.floor.merchantPurchases = [];
  const beforeFloor = structuredClone(legacy.floor);

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, 42);
  assert.equal(migrated.contentVersion, 19);
  const { chests, merchants, ...persistentFloor } = migrated.floor;
  const { merchantPurchases: _legacyPurchases, ...legacyPersistentFloor } = beforeFloor;
  assert.deepEqual(persistentFloor, legacyPersistentFloor);
  assert.ok(chests.length > 0);
  assert.deepEqual(merchants, []);
  assert.deepEqual(migrated.hero.spells, legacy.hero.spells);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
  assert.equal(legacy.version, 31);
});

test('v32 creates persistent chest contents without duplicating a resolved reward', () => {
  const legacy = createRun(32033);
  const dungeon = generateDungeon({ seed: legacy.seed, depth: legacy.depth });
  const chest = dungeon.finds.find(({ id }) => id === 'sealed-cache');
  legacy.version = 32;
  delete legacy.floor.chests;
  delete legacy.floor.merchants;
  legacy.floor.merchantPurchases = [];
  legacy.floor.resolvedFindIds.push(chest.instanceId);

  const migrated = migrateLegacyRun(legacy);
  const container = migrated.floor.chests.find(({ findId }) => findId === chest.instanceId);
  assert.equal(migrated.version, 42);
  assert.equal(container.opened, true);
  assert.equal(container.gold, 0);
  assert.deepEqual(container.items, []);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
});

test('v33 merchant purchases become a funded persistent v34 merchant state', () => {
  const current = advanceRunFloor(advanceRunFloor(createRun(33034)));
  const dungeon = generateDungeon({ seed: current.seed, depth: current.depth });
  const entry = dungeon.merchants[0].stock[0];
  const legacy = structuredClone(current);
  legacy.version = 33;
  legacy.floor.merchantPurchases = [entry.entryId];
  delete legacy.floor.merchants;

  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, 42);
  assert.equal(Object.hasOwn(migrated.floor, 'merchantPurchases'), false);
  assert.deepEqual(migrated.floor.merchants[0].purchasedEntryIds, [entry.entryId]);
  assert.ok(migrated.floor.merchants[0].gold > entry.price);
  assert.deepEqual(migrated.floor.merchants[0].buyback, []);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
});

test('version 2 migration restarts the current floor across the generator boundary', () => {
  let legacy = createRun(654);
  legacy = advanceRunFloor(legacy);
  legacy.version = 2;
  delete legacy.generatorVersion;
  delete legacy.contentVersion;
  legacy.started = true;
  legacy.hero.x += 1;
  legacy.floor.revealed.push('1,1');
  legacy.floor.defeated.push('monster-2-1');

  const migrated = migrateLegacyRun(legacy);
  const dungeon = generateDungeon({ seed: migrated.seed, depth: 2 });
  assert.deepEqual({ x: migrated.hero.x, y: migrated.hero.y }, dungeon.spawn);
  assert.equal(migrated.started, false);
  assertFreshFloor(migrated.floor);
  assert.deepEqual(migrated.equipment, legacy.equipment);
  assert.deepEqual(migrated.inventory, legacy.inventory);
  assert.equal(validateRun(migrated), true);
});
