import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { generateDungeon } from '../tools/dcss-rpg-core.js';
import {
  ENVIRONMENT_ROOM_THEMES,
  allEnvironmentAssetPaths,
  createDungeonEnvironment,
  environmentTransitCells,
} from '../tools/dcss-rpg-environment.js';

const assetUrl = (path) =>
  new URL(`../public/assets/dcss-preview/${path}`, import.meta.url);

const CARDINAL_APPROACHES = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 }),
]);

test('room environment is deterministic, seeded and varied', () => {
  const dungeon = generateDungeon({ seed: 731923, depth: 1 });
  const first = createDungeonEnvironment(dungeon);
  const second = createDungeonEnvironment(dungeon);
  const other = createDungeonEnvironment(generateDungeon({ seed: 731924, depth: 1 }));

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, other);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(first.roomThemes[0], 'wayfarer-refuge');
  assert.ok(new Set(first.roomThemes).size >= 4);
  assert.ok(first.props.length >= dungeon.rooms.length * 2);
  assert.ok(first.props.length <= dungeon.rooms.length * 4);
  assert.ok(first.floorAccents.length >= dungeon.rooms.length);
});

test('props stay on walkable room edges and never cover generated entities', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 1 + (seed % 3) });
    const environment = createDungeonEnvironment(dungeon);
    const transit = environmentTransitCells(dungeon);
    const reserved = new Set(
      [
        dungeon.spawn,
        dungeon.exit,
        dungeon.sanctuary,
        dungeon.objective?.boss,
        dungeon.objective?.artifact,
        ...dungeon.events,
        ...dungeon.monsters,
        ...dungeon.passiveCreatures,
        ...dungeon.finds,
        ...dungeon.loot,
      ]
        .filter(Boolean)
        .map(({ x, y }) => `${x},${y}`),
    );
    const occupied = new Set();
    for (const prop of environment.props) {
      const key = `${prop.gridX},${prop.gridY}`;
      assert.equal(dungeon.grid[prop.gridY]?.[prop.gridX], '.');
      assert.equal(reserved.has(key), false);
      assert.equal(transit.has(key), false, `prop ${prop.id} blocks transit at seed ${seed}`);
      assert.equal(occupied.has(key), false);
      assert.ok(prop.x > prop.gridX && prop.x < prop.gridX + 1);
      assert.ok(prop.y > prop.gridY && prop.y < prop.gridY + 1);
      occupied.add(key);
    }
    for (const accent of environment.floorAccents) {
      const key = `${accent.x},${accent.y}`;
      assert.equal(dungeon.grid[accent.y]?.[accent.x], '.');
      assert.equal(reserved.has(key), false);
      assert.equal(transit.has(key), false, `accent blocks transit at seed ${seed}`);
      assert.equal(occupied.has(key), false);
      occupied.add(key);
    }
  }
});

test('corridor mouths and door approaches are reserved before decoration placement', () => {
  for (let seed = 301; seed <= 700; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 1 + (seed % 3) });
    const transit = environmentTransitCells(dungeon);
    for (const door of dungeon.doors) {
      assert.equal(transit.has(`${door.x},${door.y}`), true);
      const clearApproaches = CARDINAL_APPROACHES
        .map(({ x, y }) => ({ x: door.x + x, y: door.y + y }))
        .filter(({ x, y }) => dungeon.grid[y]?.[x] === '.');
      assert.ok(clearApproaches.length >= 2);
      assert.ok(clearApproaches.every(({ x, y }) => transit.has(`${x},${y}`)));
    }
  }
});

test('environment catalog has distinct room identities and uses bundled assets', async () => {
  assert.ok(ENVIRONMENT_ROOM_THEMES.length >= 5);
  assert.equal(
    new Set(ENVIRONMENT_ROOM_THEMES.map(({ id }) => id)).size,
    ENVIRONMENT_ROOM_THEMES.length,
  );
  assert.ok(ENVIRONMENT_ROOM_THEMES.every(({ features, details }) => features.length >= 3 && details.length >= 3));
  const paths = allEnvironmentAssetPaths();
  assert.equal(paths.length, new Set(paths).size);
  assert.ok(paths.length >= 30);
  await Promise.all(paths.map((path) => access(assetUrl(path))));
});

test('runtime sends decorations through the depth-tested 3D world and gives lights to luminous props', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const world3d = await readFile(new URL('../tools/dcss-rpg-world3d.js', import.meta.url), 'utf8');
  assert.match(runtime, /createDungeonEnvironment\(dungeon\)/);
  assert.match(runtime, /decorations: \[/);
  assert.match(runtime, /\.\.\.dungeonEnvironment\.props/);
  assert.match(runtime, /decoration\.frames/);
  // The lift off the floor plane belongs to every billboard, not to decorations
  // alone: giving it to some sprites only reorders them in front of the hero.
  assert.doesNotMatch(runtime, /depthBias: WORLD_DECORATION_DEPTH_BIAS/);
  const world3dSource = readFileSync(new URL('../tools/dcss-rpg-world3d.js', import.meta.url), 'utf8');
  assert.match(world3dSource, /WORLD_BILLBOARD_DEPTH_BIAS \+ \(actor\.depthBias \?\? 0\)/);
  assert.match(runtime, /filter\(\(\{ light \}\) => light\)/);
  assert.match(world3d, /decorations = \[\]/);
  assert.match(world3d, /decoration:\$\{decoration\.id\}/);
  assert.doesNotMatch(runtime, /kind: 'decor'/);
});

/**
 * Every floor the generator can produce must be one the renderer can furnish.
 *
 * It could not. Out in the open a room is a clearing and every cell of a
 * clearing opens onto the next, so the search for a cooking site — which only
 * ever looked at cells that were not a walkway — came back empty on about one
 * surface floor in thirty, threw, and took the floor down with it. The hero
 * walked down a stair into an exception. A brazier standing in a thoroughfare
 * is a small ugliness; a floor nobody can enter is not, so the walkway is now
 * the second choice rather than a reason to give up.
 */
test('no floor the generator can build is one the environment refuses', async () => {
  const { generateDungeon } = await import('../tools/dcss-rpg-core.js');
  const { createDungeonEnvironment } = await import('../tools/dcss-rpg-environment.js');
  const failures = [];
  for (const branch of ['deep', 'surface', 'vaults']) {
    for (let seed = 1; seed <= 24; seed += 1) {
      for (let depth = 1; depth <= 20; depth += 1) {
        const level = generateDungeon({ seed, depth, branch });
        try {
          const environment = createDungeonEnvironment(level);
          // And a hero who can cook anywhere can cook on every floor.
          assert.ok(
            environment.props.some(({ interactionId }) => interactionId === 'campfire'),
            `${branch} seed ${seed} floor ${depth}: nowhere to cook`,
          );
        } catch (error) {
          failures.push(`${branch} seed ${seed} floor ${depth}: ${error.message}`);
        }
      }
    }
  }
  assert.deepEqual(failures, [], `\n${failures.slice(0, 5).join('\n')}\n`);
});
