import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  createRun,
  generateDungeon,
  hydrateDungeon,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import {
  PASSIVE_CREATURE_CATALOG,
  PASSIVE_CREATURE_PATHS,
  choosePassiveWanderTarget,
  createPassiveCreatureStates,
  passiveCreatureById,
  passiveWanderPause,
} from '../tools/dcss-rpg-passive.js';

test('passive wildlife has stable future-facing data and bundled sprites', () => {
  assert.deepEqual(PASSIVE_CREATURE_CATALOG.map(({ id }) => id), ['sheep', 'hog', 'yak']);
  assert.equal(new Set(PASSIVE_CREATURE_PATHS).size, PASSIVE_CREATURE_CATALOG.length);
  for (const creature of PASSIVE_CREATURE_CATALOG) {
    assert.equal(passiveCreatureById(creature.id), creature);
    assert.ok(creature.speed > 0 && creature.speed < 1);
    assert.ok(creature.tameDifficulty >= 1);
    assert.ok(creature.meatYield >= 1);
    assert.equal(
      existsSync(join(process.cwd(), 'public/assets/dcss-preview', creature.path)),
      true,
      `missing passive creature sprite ${creature.path}`,
    );
  }
});

test('passive wildlife generation is deterministic, separate and non-overlapping', () => {
  for (let seed = 1; seed <= 400; seed += 1) {
    const depth = 1 + (seed % 3);
    const first = generateDungeon({ seed, depth });
    const second = generateDungeon({ seed, depth });
    assert.deepEqual(first.passiveCreatures, second.passiveCreatures);
    assert.ok(first.passiveCreatures.length >= 2 && first.passiveCreatures.length <= 5);

    const occupied = new Set([
      `${first.spawn.x},${first.spawn.y}`,
      `${first.exit.x},${first.exit.y}`,
      ...first.monsters.map(({ x, y }) => `${x},${y}`),
      ...first.loot.map(({ x, y }) => `${x},${y}`),
      ...first.events.map(({ x, y }) => `${x},${y}`),
      ...first.doors.map(({ x, y }) => `${x},${y}`),
    ]);
    for (const creature of first.passiveCreatures) {
      const key = `${creature.x},${creature.y}`;
      const room = first.rooms[creature.roomIndex];
      const definition = passiveCreatureById(creature.id);
      assert.equal(occupied.has(key), false);
      assert.equal(first.grid[creature.y][creature.x], '.');
      assert.ok(creature.x > room.x && creature.x < room.x + room.width - 1);
      assert.ok(creature.y > room.y && creature.y < room.y + room.height - 1);
      assert.ok(definition.minDepth <= depth);
      occupied.add(key);
    }
  }
});

test('passive wandering is seeded, cardinal and stays inside its home room', () => {
  const grid = Array.from({ length: 7 }, () => Array(7).fill('.'));
  const creature = {
    seed: 9123,
    wanderStep: 4,
    wanderRadius: 3,
    homeX: 3,
    homeY: 3,
    bounds: { minX: 1, maxX: 5, minY: 1, maxY: 5 },
    x: 3.5 * 64,
    y: 3.5 * 64,
  };
  const input = {
    creature,
    grid,
    blockedCells: new Set(['3,2']),
    avoidCell: { x: 2, y: 3 },
    tileSize: 64,
  };
  const first = choosePassiveWanderTarget(input);
  const second = choosePassiveWanderTarget(input);
  assert.deepEqual(first, second);
  assert.ok(first);
  assert.equal(Math.abs(first.gridX - 3) + Math.abs(first.gridY - 3), 1);
  assert.ok(first.gridX >= 1 && first.gridX <= 5);
  assert.ok(first.gridY >= 1 && first.gridY <= 5);
  assert.ok(Math.abs(first.gridX - 2) + Math.abs(first.gridY - 3) > 1);
  assert.equal(passiveWanderPause(creature), passiveWanderPause(creature));
});

test('passive positions and wander sequence survive a validated save', () => {
  const dungeon = generateDungeon({ seed: 90125, depth: 2 });
  const run = createRun(90125, dungeon);
  const creature = dungeon.passiveCreatures[0];
  run.floor.passives = [{
    instanceId: creature.instanceId,
    x: creature.x + 0.2,
    y: creature.y,
    wanderStep: 7,
    facing: -1,
    hunted: false,
    defeated: false,
    hp: 1,
    attackSequence: 0,
  }];
  assert.equal(validateRun(run), true);
  const hydrated = hydrateDungeon(run);
  const restored = createPassiveCreatureStates(hydrated, 64)[0];
  assert.equal(restored.x, (creature.x + 0.7) * 64);
  assert.equal(restored.y, (creature.y + 0.5) * 64);
  assert.equal(restored.wanderStep, 7);
  assert.equal(restored.facing, -1);

  const corrupt = structuredClone(run);
  corrupt.floor.passives[0].instanceId = 'passive-2-999';
  assert.throws(() => hydrateDungeon(corrupt), /Unknown saved passive creature state/);
});

test('runtime preloads, renders, moves and persists passive wildlife outside combat', () => {
  const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const requiredAssets = readFileSync(new URL('../tools/dcss-rpg-required-assets.js', import.meta.url), 'utf8');
  assert.match(requiredAssets, /\.\.\.PASSIVE_CREATURE_PATHS/);
  assert.match(runtime, /const requiredPaths = requiredAssetPaths\(visualOverridePaths\(visualOverrides\)\);/);
  assert.match(runtime, /createPassiveCreatures\(dungeon\)/);
  assert.match(runtime, /createPassiveCreatureStates\(level, TILE\)\.map/);
  assert.match(runtime, /function updatePassiveCreatures\(delta\)/);
  assert.match(runtime, /run\.floor\.passives = passiveCreatures\.map/);
  assert.match(runtime, /\.\.\.passiveCreatures/);
  assert.doesNotMatch(runtime, /passiveCreatures\.find\([^\n]*pendingAttack/);
});
