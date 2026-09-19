import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CITY_ASSET_PATHS,
  CITY_CAPTAIN_ID,
  CITY_PRIEST_ID,
  CITY_RECRUITER_ID,
  CITY_DEPTHS,
  CITY_GUARD_ID,
  cityBlockRects,
  cityGuardPosts,
  cityMerchantSpots,
  createCityEnvironment,
  generateCityPlan,
  isCityDepth,
  reachableCells,
  CITY_DEPTH,
} from '../tools/dcss-rpg-city.js';
import {
  GENERATOR_VERSION,
  MAP_HEIGHT,
  MAP_WIDTH,
  advanceRunFloor,
  retreatRunFloor,
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
import { biomeThemeFor } from '../tools/dcss-rpg-visuals.js';
import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';
import { MAX_MERCHANTS_PER_FLOOR } from '../tools/dcss-rpg-merchant.js';
import { STORY_DEPTH, canLeaveDungeonFloor } from '../tools/dcss-rpg-run.js';
import { guaranteedArtifactDepth } from '../tools/dcss-rpg-artifacts.js';

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
    // One shop per trader, and every trader keeps a shop.
    assert.equal(plan.blocks.filter(({ kind }) => kind === 'shop').length, 4);
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
    assert.deepEqual(level.scaling, floorScaling(1), 'the surface borrows the first floor curve');
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
    assert.ok([CITY_GUARD_ID, CITY_CAPTAIN_ID, CITY_PRIEST_ID, CITY_RECRUITER_ID].includes(spawn.id));
    assert.deepEqual(spawn.post, { x: spawn.x, y: spawn.y });
    assert.equal(level.grid[spawn.y][spawn.x], '.');
  }
  assert.equal(level.monsters.filter(({ id }) => id === CITY_CAPTAIN_ID).length, 1, 'one captain');
});

/**
 * The temple is the reliable way out of a binding curse, so it has to be
 * somewhere the hero can reliably come back to: a building with a door, and
 * one man inside it who does not wander off.
 */
test('the city keeps a temple, and the priest stays in it', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const level = generateDungeon({ seed, depth: cityDepth });
    const temple = level.city.blocks.filter(({ kind }) => kind === 'temple');
    assert.equal(temple.length, 1, `seed ${seed}: ${temple.length} храмов`);
    assert.ok(temple[0].door, 'a temple without a door is a wall');
    assert.ok(temple[0].interior, 'and without a room it is not a building');

    const priests = level.monsters.filter(({ id }) => id === CITY_PRIEST_ID);
    assert.equal(priests.length, 1, `seed ${seed}: ${priests.length} жрецов`);
    const priest = priests[0];
    const { x, y, w, h } = temple[0].interior;
    assert.ok(
      priest.x >= x && priest.x < x + w && priest.y >= y && priest.y < y + h,
      `seed ${seed}: жрец стоит не в храме`,
    );
    // He is not the watch: nobody arrests you for talking to him.
    assert.equal(monsterById(CITY_PRIEST_ID).neutral, true);
  }
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
  const town = biomeThemeFor('gate-town');
  assert.equal(town.id, 'gate-town');
  for (const path of [...town.floors, ...town.walls, ...town.accentWalls]) {
    await access(new URL(`../public/assets/dcss-preview/${path}`, import.meta.url));
  }
});

test('the city is the surface above the ladder, not a floor of it', () => {
  assert.equal(CITY_DEPTH, 0);
  assert.equal(isCityDepth(0), true);
  assert.equal(isCityDepth(4), false, 'the fourth floor is dungeon again');
  // Nine dungeon floors, and the town gate is always open.
  assert.equal(canLeaveDungeonFloor({ depth: CITY_DEPTH, status: 'playing', guardianDefeated: false }), true);
  for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
    assert.equal(isCityDepth(depth), false, `floor ${depth} is dungeon`);
    assert.notEqual(generateDungeon({ seed: 515, depth }).city, undefined === null);
  }
  // The promised artifact is scheduled among real floors, with nothing skipped.
  const depths = new Set();
  for (let seed = 0; seed < 200; seed += 1) depths.add(guaranteedArtifactDepth(seed, STORY_DEPTH));
  assert.equal(Math.min(...depths), 2);
  assert.equal(Math.max(...depths), STORY_DEPTH);
  assert.equal(depths.size, STORY_DEPTH - 1, 'every floor from the second down can hold it');
});

test('a run walks into the city and out the other side', () => {
  assert.equal(GENERATOR_VERSION, 15, 'every run now lives by two conditions of its own');
  let run = createRun(891);
  // The city is above the ladder now: the hero climbs out of the first floor.
  run = retreatRunFloor(run);
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
  assert.match(
    runtime,
    /if \(monster\.neutral && !monster\.provoked\) \{[\s\S]{0,160}?else provokeCityWatch\(monster\);/,
    'striking a guard turns the watch; the dungeon ghost is the only other neutral',
  );
  assert.match(runtime, /const patrolling = monster\.alerted === 0;/);
});

/**
 * The dungeon has had this invariant since doors existed; the city never did,
 * and that is exactly how it came to tag every door with the wrong axis. `axis`
 * is the direction of PASSAGE — the hinge, the frame posts and the leaf are all
 * built from it — so a door tagged by the direction of its WALL is turned
 * ninety degrees and lies across its own doorway.
 */
test('a city door faces the street it opens onto', () => {
  let doors = 0;
  for (let seed = 1; seed <= 120; seed += 1) {
    const city = generateDungeon({ seed, depth: CITY_DEPTH });
    for (const door of city.doors) {
      doors += 1;
      assert.equal(city.grid[door.y][door.x], 'D', `${seed}: ${door.x},${door.y}`);
      const passage = door.axis === 'x'
        ? [{ x: door.x - 1, y: door.y }, { x: door.x + 1, y: door.y }]
        : [{ x: door.x, y: door.y - 1 }, { x: door.x, y: door.y + 1 }];
      const alongTheWall = door.axis === 'x'
        ? [{ x: door.x, y: door.y - 1 }, { x: door.x, y: door.y + 1 }]
        : [{ x: door.x - 1, y: door.y }, { x: door.x + 1, y: door.y }];
      for (const cell of passage) {
        assert.ok(
          ['.', 'D'].includes(city.grid[cell.y]?.[cell.x]),
          `${seed}: door ${door.x},${door.y} axis ${door.axis} is walled where it should open`,
        );
      }
      for (const cell of alongTheWall) {
        assert.equal(
          city.grid[cell.y]?.[cell.x],
          '#',
          `${seed}: door ${door.x},${door.y} axis ${door.axis} has no wall to hang from`,
        );
      }
    }
  }
  assert.ok(doors > 200, `only ${doors} city doors were checked`);
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
