import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

import { runConditions } from '../tools/dcss-rpg-conditions.js';

import { MONSTER_CATALOG, CONTENT_PATHS, monsterById } from '../tools/dcss-rpg-content.js';
import {
  GENERATOR_VERSION,
  LEGACY_SAVE_KEYS,
  SAVE_KEY,
  SAVE_VERSION,
  createRng,
  createRun,
  findGridPath,
  generateDungeon,
  hasLineOfSight,
  hydrateDungeon,
  isWalkableCell,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { FLOOR_MAP_COLORS, createFloorMapModel } from '../tools/dcss-rpg-floor-map.js';
import { floorScaling, monsterEligibleForFloor } from '../tools/dcss-rpg-scaling.js';
import { RUN_END_SOURCE_NAMES } from '../tools/dcss-rpg-run-summary.js';
import {
  DEFAULT_TERRAIN_PROFILE,
  WATER_CELL,
  WATER_MELEE_MULTIPLIER,
  WATER_ROOM_CHANCE,
  chooseFloodedRoom,
  floodRoom,
  roomOpeningCells,
  selectWaterConductionTargets,
  terrainAllowsCell,
  terrainMeleeMultiplier,
  terrainSpeedMultiplier,
  waterPoolCells,
} from '../tools/dcss-rpg-terrain.js';
import { SOUND_SAMPLES } from '../tools/dcss-rpg-audio.js';

const TILE = 64;
const at = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });

test('the terrain rules: everyone in water is slow and hits softer, water creatures are not', () => {
  assert.equal(WATER_CELL, '~');
  assert.deepEqual(DEFAULT_TERRAIN_PROFILE, { water: 0.75, land: 1 });
  assert.equal(terrainSpeedMultiplier({ inWater: true }), 0.75);
  assert.equal(terrainSpeedMultiplier({ inWater: false }), 1);
  assert.equal(terrainSpeedMultiplier({ inWater: true, terrain: { water: 1.35, land: 0.7 } }), 1.35);
  assert.equal(terrainSpeedMultiplier({ inWater: false, terrain: { water: 1.35, land: 0.7 } }), 0.7);
  assert.equal(terrainMeleeMultiplier({ inWater: true }), WATER_MELEE_MULTIPLIER);
  assert.equal(terrainMeleeMultiplier({ inWater: false }), 1);
  assert.equal(terrainMeleeMultiplier({ inWater: true, terrain: { water: 1.25, land: 0 } }), 1, 'an eel bites at full strength');
  const grid = [['.', '~', '~'], ['#', '~', '.'], ['.', '.', '~']];
  assert.equal(terrainAllowsCell(grid, 0, 0, { water: 1.25, land: 0 }), false, 'water-bound creatures stay in water');
  assert.equal(terrainAllowsCell(grid, 1, 0, { water: 1.25, land: 0 }), true);
  assert.equal(terrainAllowsCell(grid, 0, 0, null), true);
  assert.deepEqual([...waterPoolCells(grid, { x: 1, y: 0 })].sort(), ['1,0', '1,1', '2,0']);
  assert.equal(waterPoolCells(grid, { x: 2, y: 2 }).size, 1, 'a diagonal cell is a separate pool');
  assert.equal(waterPoolCells(grid, { x: 0, y: 0 }).size, 0);
});

test('lightning conducts through a pool to everyone standing in it, in a stable order', () => {
  const grid = [['~', '~', '.', '~'], ['~', '.', '.', '~']];
  const origin = { instanceId: 'm-a', ...at(0, 0) };
  const inPool = { instanceId: 'm-c', ...at(1, 0) };
  const inPool2 = { instanceId: 'm-b', ...at(0, 1) };
  const otherPool = { instanceId: 'm-d', ...at(3, 0) };
  const dry = { instanceId: 'm-e', ...at(2, 0) };
  const dead = { instanceId: 'm-f', ...at(1, 0), dead: 0.3 };
  const hero = { ...at(0, 1) };
  const picked = selectWaterConductionTargets({ grid, origin, actors: [inPool, otherPool, dry, dead, inPool2, hero], tileSize: TILE });
  assert.deepEqual(picked.map((actor) => actor.instanceId ?? 'hero'), ['hero', 'm-b', 'm-c']);
  assert.deepEqual(selectWaterConductionTargets({ grid, origin: dry, actors: [inPool], tileSize: TILE }), [], 'a dry origin conducts nothing');
  assert.deepEqual(selectWaterConductionTargets({ grid, origin, actors: [inPool], tileSize: TILE, exclude: [inPool] }), []);
});

test('flooding keeps every opening dry with an apron, leaves islands and is rare', () => {
  const grid = Array.from({ length: 9 }, () => Array(11).fill('#'));
  for (let y = 1; y <= 7; y += 1) for (let x = 1; x <= 9; x += 1) grid[y][x] = '.';
  grid[4][10] = '.'; // corridor to the east
  grid[0][3] = 'D'; // door to the north
  const room = { x: 1, y: 1, width: 9, height: 7 };
  assert.deepEqual(roomOpeningCells(grid, room), [{ x: 3, y: 1 }, { x: 9, y: 4 }]);
  const water = floodRoom(grid, room, { rng: createRng(7), islands: 2 });
  assert.ok(water.length >= 30, `floods most of the room (${water.length})`);
  for (const [x, y] of [[3, 1], [2, 1], [4, 1], [3, 2], [9, 4], [8, 4], [9, 3], [9, 5]]) {
    assert.equal(grid[y][x], '.', `dry apron at ${x},${y}`);
  }
  assert.ok(water.every(({ x, y }) => grid[y][x] === '~'));
  const plain = Array.from({ length: 9 }, () => Array(11).fill('#'));
  for (let y = 1; y <= 7; y += 1) for (let x = 1; x <= 9; x += 1) plain[y][x] = '.';
  plain[4][10] = '.';
  plain[0][3] = 'D';
  const noIslands = floodRoom(plain, room, { rng: createRng(7), islands: 0 });
  assert.ok(noIslands.length > water.length, 'islands keep some interior cells dry');
  assert.equal(WATER_ROOM_CHANCE, 0.3);
  const rooms = Array.from({ length: 6 }, (_, index) => ({ x: index * 6, y: 1, width: 5, height: 5 }));
  let flooded = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const pick = chooseFloodedRoom({ rng: createRng(seed), rooms, excluded: new Set([0, 5]) });
    if (pick !== null) {
      flooded += 1;
      assert.ok(pick > 0 && pick < 5, 'never an excluded room');
    }
  }
  assert.ok(flooded > 80 && flooded < 160, `about a third of floors flood (${flooded}/400)`);
  assert.equal(chooseFloodedRoom({ rng: createRng(1), rooms: rooms.slice(0, 3), excluded: new Set(), chance: 1 }), null, 'tiny floors stay dry');
});

test('the generator floods a rare room with its own stream and seats water creatures in it', () => {
  let flooded = 0;
  let ordinaryFloors = 0;
  let ordinaryFlooded = 0;
  for (let seed = 1; seed <= 90; seed += 1) {
    for (const depth of [1, 3, 6]) {
      // A run under «Большая вода» floods every floor on purpose, so the rate
      // is only meaningful on runs whose conditions leave the water alone.
      const tide = runConditions(seed * 101).includes('high-water');
      if (!tide) ordinaryFloors += 1;
      const dry = generateDungeon({ seed: seed * 101, depth, waterChance: 0 });
      const level = generateDungeon({ seed: seed * 101, depth });
      const water = [];
      level.grid.forEach((row, y) => row.forEach((cell, x) => { if (cell === '~') water.push({ x, y }); }));
      assert.equal(dry.grid.flat().filter((cell) => cell === '~').length, 0);
      if (level.floodedRoomIndex === null) {
        assert.equal(water.length, 0);
        continue;
      }
      flooded += 1;
      if (!tide) ordinaryFlooded += 1;
      const room = level.rooms[level.floodedRoomIndex];
      assert.ok(water.length > 0);
      assert.ok(water.every(({ x, y }) => x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height), 'water stays inside one room');
      for (const point of [level.spawn, level.exit, level.sanctuary, level.objective?.boss].filter(Boolean)) {
        assert.notEqual(level.grid[point.y][point.x], '~', 'spawn, exit, sanctuary and guardian stay dry');
      }
      assert.ok(level.floodedRoomIndex !== 0);
      // The water creatures are the only additions; on chapter floors the merchant
      // may move to a dry room, which re-seats its guards, so ids are compared
      // only where no merchant exists.
      const waterSpawns = level.monsters.filter(({ instanceId }) => instanceId.includes('-water-'));
      assert.ok(waterSpawns.length >= 1 && waterSpawns.length <= 2, 'one or two water creatures');
      assert.equal(waterSpawns[0].id, 'electric-eel');
      if (depth >= 3) assert.equal(waterSpawns[1]?.id, 'merfolk-impaler');
      for (const spawn of waterSpawns) assert.equal(level.grid[spawn.y][spawn.x], '~', 'water creatures spawn in water');
      if (depth % 3 !== 0) {
        const dryIds = dry.monsters.map(({ instanceId }) => instanceId);
        const levelIds = level.monsters.map(({ instanceId }) => instanceId);
        assert.ok(dryIds.every((id) => levelIds.includes(id)), 'no dry-floor monster is lost');
        assert.equal(levelIds.length, dryIds.length + waterSpawns.length);
      }
      assert.deepEqual(level.loot.map(({ instanceId }) => instanceId), dry.loot.map(({ instanceId }) => instanceId));
      // The three core finds never move; only the fountain landmark may relocate
      // into the pool, so compare the core wave and the landmark count separately.
      assert.deepEqual(level.finds.slice(0, 3).map(({ id }) => id), dry.finds.slice(0, 3).map(({ id }) => id));
      // The kinds are the promise; the numbering is not. A flood can reseat the
      // landmark, and everything placed after it is numbered one step along —
      // rare enough that no dry seed ever showed it, and visible once «Большая
      // вода» started flooding floors that used to stay dry.
      assert.equal(new Set(level.finds.map(({ instanceId }) => instanceId)).size, level.finds.length);
      // A flooded floor can lose the hidden stash: the fountain takes the pool
      // room and the remaining free rooms differ, so only the core wave is fixed.
      assert.ok(Math.abs(level.finds.length - dry.finds.length) <= 1);
      // The pool is still walkable and see-through for everyone.
      const cell = water[0];
      assert.equal(isWalkableCell(level.grid, cell.x, cell.y), true);
      assert.ok(findGridPath(level.grid, level.spawn, cell, { allowDoors: true }).length > 0, 'the pool is reachable through doors');
      assert.equal(hasLineOfSight(level.grid, cell, cell), true);
    }
  }
  assert.ok(
    ordinaryFlooded > ordinaryFloors * 0.2 && ordinaryFlooded < ordinaryFloors * 0.45,
    `roughly a third of ordinary floors (${ordinaryFlooded}/${ordinaryFloors})`,
  );
  assert.ok(flooded > ordinaryFlooded, 'a high-water run floods more than an ordinary one');
  // «Большая вода» is not a chance but not an absolute either: a floor whose
  // rooms are all spoken for — spawn, exit, sanctuary, guardian, surprise —
  // has nothing left to flood, and a tiny room is never flooded at all. The
  // copy says "nearly everywhere" because that is what it is.
  let tideFloors = 0;
  let tideWet = 0;
  for (let seed = 1; seed <= 120; seed += 1) {
    if (!runConditions(seed).includes('high-water')) continue;
    for (const depth of [2, 5, 8]) {
      tideFloors += 1;
      if (generateDungeon({ seed, depth }).floodedRoomIndex !== null) tideWet += 1;
    }
  }
  assert.ok(tideFloors > 30, `few high-water runs sampled (${tideFloors})`);
  assert.ok(tideWet > tideFloors * 0.75, `high water floods nearly every floor (${tideWet}/${tideFloors})`);
});

test('water creatures live only in flooded rooms and have names for the death screen', () => {
  const eel = monsterById('electric-eel');
  const merfolk = monsterById('merfolk-impaler');
  assert.deepEqual(eel.terrain, { water: 1.25, land: 0 });
  assert.deepEqual(eel.shock, { radius: 2 });
  assert.deepEqual(merfolk.terrain, { water: 1.35, land: 0.7 });
  assert.equal(merfolk.waterPath, 'mon/merfolk_impaler_water.png');
  assert.ok(CONTENT_PATHS.includes(merfolk.waterPath));
  const scaling = floorScaling(9);
  for (const monster of MONSTER_CATALOG.filter(({ spawn }) => spawn === 'water')) {
    assert.equal(monsterEligibleForFloor(monster, scaling), false, `${monster.id} never joins the random pool`);
  }
  for (const id of ['electric-eel', 'merfolk-impaler', 'spell:storm']) {
    assert.ok(RUN_END_SOURCE_NAMES[id]?.ru && RUN_END_SOURCE_NAMES[id]?.en, id);
  }
  assert.ok(SOUND_SAMPLES.splash.files.length === 2);
});

test('the floor map paints water and save v37 regenerates older floors with the current generator', () => {
  assert.equal(FLOOR_MAP_COLORS.water, '#2b4f66');
  const grid = [['#', '#', '#'], ['#', '~', '#'], ['#', '#', '#']];
  const model = createFloorMapModel({ grid, revealed: new Set(['1,1']), hero: { x: 1, y: 1 }, markers: [] });
  assert.equal(model.cells[0].kind, 'water');
  assert.equal(SAVE_VERSION, 49);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v49');
  assert.equal(LEGACY_SAVE_KEYS[0], 'dng-codex:rpg:v48');
  assert.equal(GENERATOR_VERSION, 16);
  const run = createRun(36035);
  assert.equal(validateRun(run), true);
  const legacy = structuredClone(run);
  legacy.version = 35;
  legacy.generatorVersion = 7;
  assert.equal(validateRun(legacy), false);
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, 49);
  assert.equal(migrated.generatorVersion, GENERATOR_VERSION);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
});

test('the runtime wades, conducts, dampens fire and refuses books in water', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /return world\[y\]\[x\] === '\.' \|\| world\[y\]\[x\] === '~';/, 'the hero walks through water without flight');
  assert.match(runtime, /\(world\[y\]\[x\] === '\.' \|\| world\[y\]\[x\] === '~'\)/, 'monsters and wildlife too');
  assert.match(runtime, /function updateHeroTerrain\(\)[\s\S]*applyActorEffect\(hero\.effects, 'wet', WATER_WET_DURATION\)[\s\S]*playSound\('splash'\)/);
  assert.match(runtime, /updateDoorOpening\(delta\);\s+updateHeroTerrain\(\);/);
  assert.match(runtime, /terrainSpeedMultiplier\(\{ inWater: heroWading\(\) && !currentArmourProfile\(\)\.surefooted \}\)/);
  assert.match(runtime, /terrainSpeedMultiplier\(\{ inWater: actorInWater\(world, monster, TILE\), terrain: monster\.terrain \}\)/);
  assert.match(runtime, /terrainMeleeMultiplier\(\{ inWater: heroWading\(\) \}\)/);
  assert.match(runtime, /if \(hit && monster\.shock\) shockWetActorsAround\(monster\);/);
  assert.match(runtime, /terrain: monster\.terrain,\s+\}\);/, 'eel routes stay in water');
  assert.match(runtime, /if \(!terrainAllowsCell\(world, Math\.floor\(proposed\.x \/ TILE\), Math\.floor\(proposed\.y \/ TILE\), monster\.terrain\)\)/);
  assert.match(runtime, /actors: \[\.\.\.monsters, hero\],[\s\S]*damageHero\(conductionDamage, \{ direct: true, source: 'spell:storm' \}\)/, 'the hero is not exempt from conduction');
  assert.match(runtime, /projectile\.spellId === 'ember-bolt' && targetWading[\s\S]*WATER_FIRE_MULTIPLIER/);
  assert.match(runtime, /if \(heroWading\(\)\) \{\s+\/\/ Wet pages/);
  assert.match(runtime, /monster\.waterPath && actorInWater\(world, monster, TILE\) \? monster\.waterPath : monster\.spritePath/);
  // The water pass ends by rubbing itself off the figures standing in it — the
  // surface and the far half of the ripple both run behind them — so it has to
  // come before anything is drawn over the actors, or it would rub off their
  // health bars and damage numbers too.
  assert.match(runtime, /drawWorld\(\);[\s\S]{0,240}?drawWaterlines\(\);/);
  assert.match(runtime, /drawWaterlines\(\);[\s\S]*drawPlayer\(\);/);
  assert.match(runtime, /drawPixelRing\(position\.x, position\.y \+ 6[\s\S]{0,900}?eraseWashFromStanding\(standingInFrontOfWater\(\)\);/);
  assert.doesNotMatch(runtime, /cell === '~' \? '\.' : cell/, 'no flight-only water rewrite remains');
  for (const file of ['dngn/water/shallow_water.png', 'dngn/water/shallow_water2.png', 'mon/aquatic/electric_eel.png', 'mon/merfolk_impaler_water.png']) {
    assert.ok((await stat(new URL(`../public/assets/dcss-preview/${file}`, import.meta.url))).size > 0, file);
  }
});

/**
 * Water life used to be seated only when a *room* had been flooded. Outside,
 * water comes from the place's own profile instead, so a mire had open water
 * across half the floor and nothing living in it.
 */
test('whatever lives in water lives in the water there is, however it got there', async () => {
  const { dungeonThemeFor } = await import('../tools/dcss-rpg-room-plans.js');
  const { runConditions } = await import('../tools/dcss-rpg-conditions.js');
  let mires = 0;
  let inhabited = 0;
  let dryFloorsWithLife = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    for (let depth = 1; depth <= 3; depth += 1) {
      if (dungeonThemeFor(seed, depth, 'surface').id !== 'mire') continue;
      // «Большая вода» floods rooms on top of the profile; that is its job.
      if (runConditions(seed).includes('high-water')) continue;
      const level = generateDungeon({ seed, depth, branch: 'surface' });
      const water = level.grid.flat().filter((cell) => cell === '~').length;
      const life = level.monsters.filter(({ instanceId }) => instanceId.includes('-water-'));
      mires += 1;
      if (life.length > 0) inhabited += 1;
      if (water === 0 && life.length > 0) dryFloorsWithLife += 1;
      // Nothing that lives in water is ever seated on dry land.
      for (const spawn of life) {
        assert.equal(level.grid[spawn.y][spawn.x], '~', 'a water creature on dry ground');
      }
      // The mire is flooded by its profile, not by the flooded-room roll.
      assert.equal(level.floodedRoomIndex, null, 'open country floods itself');
    }
  }
  assert.ok(mires >= 20, `only ${mires} mires to look at`);
  assert.equal(dryFloorsWithLife, 0);
  assert.equal(inhabited, mires, `${mires - inhabited} mires have open water and nothing in it`);
});

/** A burnt steppe is the place with no water; that is what makes it one. */
test('the flooded-room roll does not water open country behind the profile’s back', async () => {
  const { dungeonThemeFor } = await import('../tools/dcss-rpg-room-plans.js');
  const { runConditions } = await import('../tools/dcss-rpg-conditions.js');
  let steppes = 0;
  for (let seed = 1; seed <= 600; seed += 1) {
    for (let depth = 1; depth <= 3; depth += 1) {
      if (dungeonThemeFor(seed, depth, 'surface').id !== 'sunburnt-steppe') continue;
      // «Большая вода» floods everywhere on purpose, the steppe included.
      if (runConditions(seed).includes('high-water')) continue;
      const level = generateDungeon({ seed, depth, branch: 'surface' });
      steppes += 1;
      assert.equal(level.grid.flat().filter((cell) => cell === '~').length, 0, `seed ${seed} watered the steppe`);
    }
  }
  assert.ok(steppes >= 20, `only ${steppes} steppes to look at`);
});
