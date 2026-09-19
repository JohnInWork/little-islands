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
  assert.equal(SAVE_VERSION, 49);
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
  assert.equal(migrated.version, 49);
  assert.deepEqual(migrated.floors, {});
  assert.equal(validateRun(migrated), true);
});

test('the runtime draws the way up and only climbs once the hero steps off it', async () => {
  assert.ok(CONTENT_PATHS.includes(ASCENT_PATH), 'the sprite ships with the build');
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function climbFloor\(\)[\s\S]*retreatRunFloor\(captureRun\(\)\)/);
  // In town a third way out joins the two, so the arming check counts three.
  assert.match(runtime, /if \(!onStair\(dungeon\.exit\) && !onStair\(dungeon\.spawn\) && !cityGate\) \{\s+stairsArmed = true;/);
  // And each city gate goes one way, without asking which road.
  assert.match(runtime, /if \(run\.branch !== cityGate\) run = switchRunBranch\(captureRun\(\), cityGate\);/);
  assert.match(runtime, /if \(isCityDepth\(run\.depth\) && dungeon\.gates\?\.\[road\]\) placeHeroAtCell/, 'you come out where you went in');
  assert.match(runtime, /if \(!stairsArmed\) return;/);
  assert.match(runtime, /stairsArmed = false;/, 'arriving disarms both stairs');
  assert.match(runtime, /dungeon = hydrateDungeon\(run\);/, 'a floor change loads what the run remembers');
});
