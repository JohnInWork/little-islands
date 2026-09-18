import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CITY_ASSET_PATHS,
  CITY_CAPTAIN_ID,
  CITY_DEPTHS,
  CITY_GUARD_ID,
  cityBlockRects,
  cityGuardPosts,
  cityMerchantSpots,
  createCityEnvironment,
  generateCityPlan,
  isCityDepth,
  reachableCells,
} from '../tools/dcss-rpg-city.js';
import {
  GENERATOR_VERSION,
  MAP_HEIGHT,
  MAP_WIDTH,
  advanceRunFloor,
  createRun,
  createRng,
  findGridPath,
  generateDungeon,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { createDungeonEnvironment } from '../tools/dcss-rpg-environment.js';
import { monsterById } from '../tools/dcss-rpg-content.js';
import { floorScaling, monsterEligibleForFloor } from '../tools/dcss-rpg-scaling.js';
import { createMonsterStates } from '../tools/dcss-rpg-rules.js';
import { biomeThemeForDepth } from '../tools/dcss-rpg-visuals.js';
import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';
import { MAX_MERCHANTS_PER_FLOOR } from '../tools/dcss-rpg-merchant.js';

const cityDepth = CITY_DEPTHS[0];
const planFor = (seed) => {
  const rng = createRng(seed);
  return generateCityPlan({ rng: () => rng.next(), width: MAP_WIDTH, height: MAP_HEIGHT });
};

test('a city is a lattice of streets, and every street reaches every other', () => {
  assert.equal(isCityDepth(cityDepth), true);
  assert.equal(isCityDepth(cityDepth + 1), false);
  assert.equal(isCityDepth('4'), false);

  for (let seed = 1; seed <= 60; seed += 1) {
    const plan = planFor(seed);
    const open = [];
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        if (plan.grid[y][x] === '.') open.push({ x, y });
      }
    }
    const reached = reachableCells(plan.grid, plan.spawn);
    assert.equal(reached.size, open.length, `seed ${seed} splits the city in two`);
    assert.ok(reached.has(`${plan.exit.x},${plan.exit.y}`), 'the gate out is walkable');
    assert.ok(plan.blocks.length >= 6, 'a city needs blocks');
    assert.ok(plan.blocks.some(({ kind }) => kind === 'plaza'));
    assert.ok(plan.blocks.some(({ kind }) => kind === 'market'));
    assert.equal(plan.blocks.filter(({ kind }) => kind === 'shop').length, 2);
  }
});

test('blocks never overlap and every door faces a street', () => {
  const rects = cityBlockRects({ area: { x: 1, y: 1, w: 34, h: 24 }, columns: 4, rows: 3 });
  assert.equal(rects.length, 12);
  for (const first of rects) {
    for (const second of rects) {
      if (first === second) continue;
      const overlap = first.x < second.x + second.w
        && first.x + first.w > second.x
        && first.y < second.y + second.h
        && first.y + first.h > second.y;
      assert.equal(overlap, false, 'two blocks share ground');
    }
  }

  const plan = planFor(11);
  for (const block of plan.blocks) {
    if (!block.door) continue;
    const { x, y } = block.door;
    const neighbours = [
      plan.grid[y + 1]?.[x], plan.grid[y - 1]?.[x], plan.grid[y]?.[x + 1], plan.grid[y]?.[x - 1],
    ];
    assert.ok(neighbours.filter((cell) => cell === '.').length >= 2, 'a door joins inside to outside');
  }
});

test('the city floor keeps the shape every other floor has', () => {
  for (let seed = 1; seed <= 25; seed += 1) {
    const level = generateDungeon({ seed, depth: cityDepth });
    assert.equal(level.depth, cityDepth);
    assert.deepEqual(level.scaling, floorScaling(cityDepth));
    assert.equal(level.grid.length, MAP_HEIGHT);
    assert.ok(level.rooms.length >= 6);
    assert.ok(level.rooms.every(({ width, height }) => width > 0 && height > 0));
    assert.equal(level.objective, null, 'no guardian keeps a town');
    assert.deepEqual(level.loot, [], 'nothing lies on the street');
    assert.deepEqual(level.events, [], 'no traps in a city');
    assert.deepEqual(level.finds, []);
    assert.deepEqual(level.passiveCreatures, []);
    assert.equal(level.floodedRoomIndex, null);
    assert.ok(level.doors.length >= 1, 'a city has doors');
    assert.ok(
      findGridPath(level.grid, level.spawn, level.exit, { allowDoors: true }).length > 0,
      'the hero can always walk from the gate to the stair',
    );
    assert.deepEqual(generateDungeon({ seed, depth: cityDepth }).grid, level.grid, 'a city is deterministic');
  }
});

test('traders keep a stall each, and the watch keeps the streets', () => {
  const level = generateDungeon({ seed: 7, depth: cityDepth });
  assert.ok(level.merchants.length >= 2, 'a city is more than one shop');
  assert.ok(level.merchants.length <= MAX_MERCHANTS_PER_FLOOR);
  const ids = level.merchants.map(({ instanceId }) => instanceId);
  assert.equal(new Set(ids).size, ids.length, 'two traders never share an id');
  const uids = level.merchants.flatMap(({ stock }) => stock.map(({ record }) => record.uid));
  assert.equal(new Set(uids).size, uids.length, 'and never share stock');
  assert.equal(new Set(level.merchants.map(({ variantId }) => variantId)).size >= 2, true);
  for (const merchant of level.merchants) {
    assert.match(merchant.instanceId, new RegExp(`^merchant-${cityDepth}-\\d+$`));
    assert.equal(level.grid[merchant.y][merchant.x], '.');
  }

  assert.ok(level.monsters.length >= 3, 'the watch is on duty');
  for (const spawn of level.monsters) {
    assert.match(spawn.instanceId, new RegExp(`^monster-${cityDepth}-\\d+$`));
    assert.ok([CITY_GUARD_ID, CITY_CAPTAIN_ID].includes(spawn.id));
    assert.deepEqual(spawn.post, { x: spawn.x, y: spawn.y });
    assert.equal(level.grid[spawn.y][spawn.x], '.');
  }
  assert.equal(level.monsters.filter(({ id }) => id === CITY_CAPTAIN_ID).length, 1, 'one captain');
});

test('a guard is neutral, stays out of every dungeon pool and carries its post', () => {
  for (const id of [CITY_GUARD_ID, CITY_CAPTAIN_ID]) {
    const definition = monsterById(id);
    assert.ok(definition, `${id} is in the catalog`);
    assert.equal(definition.neutral, true);
    assert.equal(definition.spawn, 'city');
    for (let depth = 1; depth <= 9; depth += 1) {
      assert.equal(monsterEligibleForFloor(definition, floorScaling(depth)), false);
    }
  }
  const level = generateDungeon({ seed: 7, depth: cityDepth });
  const [captain] = createMonsterStates(level, 64);
  assert.equal(captain.neutral, true);
  assert.equal(captain.provoked, false);
  assert.deepEqual(captain.post, { x: level.monsters[0].x, y: level.monsters[0].y });
});

test('the city furnishes itself and ships its own sprites', async () => {
  const level = generateDungeon({ seed: 7, depth: cityDepth });
  const environment = createDungeonEnvironment(level);
  assert.ok(environment.props.length >= 6);
  assert.equal(environment.roomThemes.length, level.rooms.length);
  assert.ok(
    environment.props.some(({ interactionId }) => interactionId === 'campfire'),
    'the hero can still cook in town',
  );
  for (const prop of environment.props) {
    assert.equal(level.grid[prop.gridY][prop.gridX], '.', 'a prop stands on open ground');
    assert.match(prop.id, new RegExp(`^environment-${cityDepth}-\\d+-\\d+$`));
  }
  const propCells = environment.props.map(({ gridX, gridY }) => `${gridX},${gridY}`);
  assert.equal(new Set(propCells).size, propCells.length, 'two props never share a cell');

  const required = requiredAssetPaths();
  for (const path of CITY_ASSET_PATHS) {
    assert.ok(required.includes(path), `${path} must reach the build`);
    await access(new URL(`../public/assets/dcss-preview/${path}`, import.meta.url));
  }
  const town = biomeThemeForDepth(cityDepth);
  assert.equal(town.id, 'gate-town');
  for (const path of [...town.floors, ...town.walls, ...town.accentWalls]) {
    await access(new URL(`../public/assets/dcss-preview/${path}`, import.meta.url));
  }
});

test('a run walks into the city and out the other side', () => {
  assert.equal(GENERATOR_VERSION, 10, 'the city changed what a floor can be');
  let run = createRun(891);
  while (run.depth < cityDepth) run = advanceRunFloor(run);
  assert.equal(run.depth, cityDepth);
  assert.equal(validateRun(run), true);
  assert.equal(run.floor.chests.length, 0, 'a city has no buried chests');
  assert.ok(run.floor.merchants.length >= 2);
  const next = advanceRunFloor(run);
  assert.equal(next.depth, cityDepth + 1);
  assert.equal(validateRun(next), true);
});

test('the runtime walks the watch and turns it on the hero who starts something', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(
    runtime,
    /if \(monster\.neutral && !monster\.provoked\) return false;/,
    'a guard does not hunt a hero who has done nothing',
  );
  assert.match(runtime, /function patrolMonster\(monster, delta, blockedCells\)[\s\S]*monster\.route = findPath\(/);
  assert.match(runtime, /function provokeCityWatch\(target\)[\s\S]*monster\.provoked = true;/);
  assert.match(runtime, /if \(monster\.neutral && !monster\.provoked\) provokeCityWatch\(monster\);/);
  assert.match(runtime, /const patrolling = monster\.alerted === 0;/);
});

test('the map knows the house, and the city hint points at it', async () => {
  const { FLOOR_MAP_COLORS, FLOOR_MAP_MARKER_KINDS, FLOOR_MAP_MARKER_SHAPES, createFloorMapModel } =
    await import('../tools/dcss-rpg-floor-map.js');
  assert.ok(FLOOR_MAP_MARKER_KINDS.includes('house'), 'a kind the model refuses is never drawn');
  assert.ok(FLOOR_MAP_COLORS.house, 'and it needs a colour of its own');
  assert.equal(FLOOR_MAP_MARKER_SHAPES.house, 'ring');

  const model = createFloorMapModel({
    grid: [['#', '#', '#'], ['#', '.', '#'], ['#', '#', '#']],
    revealed: new Set(['1,1']),
    hero: { x: 1, y: 1 },
    markers: [{ kind: 'house', x: 1, y: 1 }],
  });
  assert.equal(model.markers.some(({ kind }) => kind === 'house'), true);

  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function houseMapMarker\(\)[\s\S]*run\.house\.owned \? plot\.door : deedSignCell\(plot\)/);
  assert.match(runtime, /\.\.\.houseMapMarker\(\),/);
  assert.match(runtime, /inCity: isCityDepth\(dungeon\.depth\),\s+houseOwned: run\.house\.owned,/);
});
