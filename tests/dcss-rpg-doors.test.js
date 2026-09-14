import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createRun,
  findGridPath,
  generateDungeon,
  hasLineOfSight,
  hydrateDungeon,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { mainMenuModel } from '../tools/dcss-rpg-menu.js';

const htmlUrl = new URL('../tools/dcss.html', import.meta.url);
const runtimeUrl = new URL('../tools/dcss.js', import.meta.url);
const worldUrl = new URL('../tools/dcss-rpg-world3d.js', import.meta.url);

function passageSides(door) {
  return door.axis === 'x'
    ? [{ x: door.x - 1, y: door.y }, { x: door.x + 1, y: door.y }]
    : [{ x: door.x, y: door.y - 1 }, { x: door.x, y: door.y + 1 }];
}

test('every generated floor has ordinary doors placed only inside narrow passages', () => {
  const surpriseTypes = new Set();
  for (let seed = 1; seed <= 1000; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 1 + (seed % 3) });
    assert.ok(dungeon.doors.length >= 4);
    assert.ok(
      findGridPath(dungeon.grid, dungeon.spawn, dungeon.exit, { allowDoors: true }).length > 0,
    );
    surpriseTypes.add(dungeon.surprises[0]?.type);
    for (const door of dungeon.doors) {
      assert.equal(dungeon.grid[door.y][door.x], 'D');
      const perpendicularWalls = door.axis === 'x'
        ? dungeon.grid[door.y - 1][door.x] === '#' && dungeon.grid[door.y + 1][door.x] === '#'
        : dungeon.grid[door.y][door.x - 1] === '#' && dungeon.grid[door.y][door.x + 1] === '#';
      assert.equal(perpendicularWalls, true, `${seed}: ${door.x},${door.y}`);
      for (const side of passageSides(door)) {
        assert.ok(['.', 'D'].includes(dungeon.grid[side.y][side.x]));
      }
      const [from, to] = passageSides(door);
      assert.equal(hasLineOfSight(dungeon.grid, from, to), false);
    }
  }
  assert.deepEqual([...surpriseTypes].sort(), ['horde', 'mixed', 'treasure']);
});

test('most doors are ordinary while one sealed passage can conceal a deterministic surprise', () => {
  for (let seed = 1; seed <= 120; seed += 1) {
    const first = generateDungeon({ seed, depth: 2 });
    const second = generateDungeon({ seed, depth: 2 });
    assert.deepEqual(first.doors, second.doors);
    assert.deepEqual(first.surprises, second.surprises);
    assert.ok(first.doors.some(({ surpriseId }) => surpriseId === null));
    const surprise = first.surprises[0];
    const surpriseDoors = first.doors.filter(({ surpriseId }) => surpriseId === surprise.id);
    assert.ok(surpriseDoors.length >= 1);
    if (surprise.type === 'horde') assert.ok(surprise.monsterIds.length >= 3);
    if (surprise.type === 'treasure') assert.ok(surprise.lootIds.length >= 2);
    if (surprise.type === 'mixed') {
      assert.ok(surprise.monsterIds.length >= 1);
      assert.ok(surprise.lootIds.length >= 1);
    }
    for (const id of surprise.lootIds) {
      assert.equal(first.loot.find((loot) => loot.instanceId === id)?.id, 'coin-cache');
    }
  }
});

test('opened doors and triggered surprises survive save hydration', () => {
  const dungeon = generateDungeon({ seed: 404, depth: 1 });
  const run = createRun(404, dungeon);
  const door = dungeon.doors.find(({ surpriseId }) => surpriseId) ?? dungeon.doors[0];
  run.floor.opened.push(door.instanceId);
  if (door.surpriseId) run.floor.triggered.push(door.surpriseId);
  assert.equal(validateRun(run), true);

  const hydrated = hydrateDungeon(run);
  assert.equal(hydrated.grid[door.y][door.x], '.');
  assert.equal(hydrated.doors.some(({ instanceId }) => instanceId === door.instanceId), true);
  assert.deepEqual(hydrated.doors, dungeon.doors);
  if (door.surpriseId) {
    assert.equal(hydrated.surprises.find(({ id }) => id === door.surpriseId).triggered, true);
  }
});

test('door interaction stays in the world and keeps its real hinged 3D mesh', async () => {
  const [html, runtime, world] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
    readFile(worldUrl, 'utf8'),
  ]);
  assert.doesNotMatch(html, /id="door-action"/);
  assert.match(runtime, /function nearbyClosedDoor\(\)/);
  assert.match(runtime, /beginDoorTransition\(door, !isOpen\)/);
  assert.match(runtime, /function updateDoorOpening\(delta\)/);
  assert.match(runtime, /dungeonWorld3D\.setDoorOpenProgress/);
  assert.match(world, /const setDoorOpenProgress = \(x, y, progress\) =>/);
  assert.match(world, /new THREE\.BoxGeometry\(panelWidth, WORLD_DOOR_HEIGHT, panelDepth\)/);
  assert.match(world, /pivot\.rotation\.y/);
  assert.equal(mainMenuModel({ language: 'ru' }).labels.openDoor, 'Открыть дверь');
  assert.equal(mainMenuModel({ language: 'en' }).labels.openDoor, 'Open door');
});
