import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRun,
  generateDungeon,
  hasLineOfSight,
  hydrateDungeon,
  migrateLegacyRun,
  SAVE_VERSION,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { createSkillState, deriveSkillCapabilities, learnSkill } from '../tools/dcss-rpg-skills.js';
import {
  activeDetectedTrapCells,
  discoverTraps,
  trapsFromDungeon,
  validateDetectedTrapIds,
} from '../tools/dcss-rpg-traps.js';

const record = (x, y, suffix = 0, tier = 1) => ({
  instanceId: `event-1-${suffix}`, eventId: `event-1-${suffix}`, x, y, kind: 'blade', tier,
});
const allVisible = () => true;

function dungeonWithTraps() {
  for (let seed = 1; seed <= 100; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 1 });
    if (dungeon.events.some(({ id }) => id === 'blade-trap')) return { seed, dungeon };
  }
  throw new Error('No trap fixture in deterministic seed range');
}

test('trap records reuse existing event IDs and do not alter generation or consume randomness', () => {
  for (let seed = 1; seed <= 80; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 1 + (seed % 3) });
    const before = structuredClone(dungeon);
    const traps = trapsFromDungeon(dungeon);
    assert.equal(traps.length, dungeon.events.filter(({ id }) => id === 'blade-trap').length);
    for (const trap of traps) {
      const event = dungeon.events.find(({ instanceId }) => instanceId === trap.instanceId);
      assert.equal(event.id, 'blade-trap');
      assert.equal(trap.eventId, event.instanceId);
      assert.equal(trap.x, event.x);
      assert.equal(trap.y, event.y);
      assert.equal(trap.tier, 1);
    }
    assert.deepEqual(dungeon, before);
    assert.deepEqual(generateDungeon({ seed, depth: dungeon.depth }), before);
  }
});

test('production Trap Sense ranks detect at actual 2/3/4-cell Manhattan distances', () => {
  const traps = [record(3, 1, 0), record(4, 1, 1), record(5, 1, 2), record(6, 1, 3)];
  let state = createSkillState(6);
  const base = deriveSkillCapabilities(state);
  assert.deepEqual(discoverTraps({ traps, origin: { x: 1, y: 1 }, capabilities: base, hasLineOfSight: allVisible }), []);
  for (let rank = 1; rank <= 3; rank += 1) {
    const learned = learnSkill({ state, heroLevel: 6, runStatus: 'playing', skillId: 'trap-sense', expectedRank: rank - 1 });
    assert.equal(learned.ok, true);
    state = learned.state;
    const capabilities = deriveSkillCapabilities(state);
    assert.equal(capabilities.trapDetectionRadius, rank + 1);
    assert.equal(capabilities.trapDetectionTier, rank);
    assert.deepEqual(discoverTraps({ traps, origin: { x: 1, y: 1 }, capabilities, hasLineOfSight: allVisible }), traps.slice(0, rank).map(({ instanceId }) => instanceId));
  }
});

test('closed doors, walls and blocked corners stop trap detection until line of sight opens', () => {
  const grid = ['#######', '#..D..#', '#######'].map((row) => [...row]);
  const args = {
    traps: [record(5, 1)],
    origin: { x: 1, y: 1 },
    capabilities: { trapDetectionRadius: 4, trapDetectionTier: 3 },
    hasLineOfSight: (from, to) => hasLineOfSight(grid, from, to),
  };
  assert.deepEqual(discoverTraps(args), []);
  grid[1][3] = '#';
  assert.deepEqual(discoverTraps(args), []);
  grid[1][3] = '.';
  assert.deepEqual(discoverTraps(args), ['event-1-0']);
  const corner = [['.', '#'], ['#', '.']];
  assert.deepEqual(discoverTraps({
    ...args, traps: [record(1, 1)], origin: { x: 0, y: 0 },
    hasLineOfSight: (from, to) => hasLineOfSight(corner, from, to),
  }), []);
});

test('discovery is tier-gated, monotonic and deterministic; spent traps stop blocking paths', () => {
  const traps = [record(2, 1, 2), record(1, 2, 1, 2), record(1, 3, 0)];
  const detectedTrapIds = ['event-1-9']; // Previously discovered and now removed/resolved event.
  const resolvedEventIds = ['event-1-0', 'event-1-9'];
  const args = {
    traps, origin: { x: 1, y: 1 }, capabilities: { trapDetectionRadius: 4, trapDetectionTier: 1 },
    detectedTrapIds, resolvedEventIds, hasLineOfSight: allVisible,
  };
  const detected = discoverTraps(args);
  assert.deepEqual(detected, ['event-1-2', 'event-1-9']);
  assert.deepEqual(discoverTraps({ ...args, traps: [...traps].reverse(), detectedTrapIds: detected }), detected);
  assert.deepEqual(detectedTrapIds, ['event-1-9']);
  assert.deepEqual([...activeDetectedTrapCells({ traps, detectedTrapIds: [...detected, 'event-1-0'], resolvedEventIds })], ['2,1']);
  assert.deepEqual([...activeDetectedTrapCells({ traps, detectedTrapIds: [], resolvedEventIds: [] })], []);
});

test('trap discovery rejects non-finite or out-of-contract detection values', () => {
  const args = { traps: [record(1, 1)], origin: { x: 0, y: 1 }, hasLineOfSight: allVisible };
  for (const capabilities of [
    { trapDetectionRadius: Infinity, trapDetectionTier: 1 },
    { trapDetectionRadius: 2, trapDetectionTier: 4 },
    { trapDetectionRadius: 2, trapDetectionTier: -1 },
    { trapDetectionRadius: 2.5, trapDetectionTier: 1 },
  ]) assert.throws(() => discoverTraps({ ...args, capabilities }));
});

test('v10 migration preserves earned skills while the expanded-run boundary clears floor traps', () => {
  const { seed, dungeon } = dungeonWithTraps();
  const legacy = createRun(seed, dungeon);
  legacy.version = 10;
  delete legacy.knowledge;
  delete legacy.floor.detectedTrapIds;
  delete legacy.floor.disarmedTrapIds;
  delete legacy.floor.placedTraps;
  legacy.hero.level = 4;
  legacy.hero.skills = { version: 1, points: 2, ranks: { 'trap-sense': 1 } };
  legacy.hero.hp = 43;
  legacy.started = true;
  legacy.difficulty = dungeon.scaling.difficulty;
  const traps = trapsFromDungeon(dungeon);
  legacy.floor.revealed = [`${traps[0].x},${traps[0].y}`];
  legacy.floor.opened = dungeon.doors.slice(0, 1).map(({ instanceId }) => instanceId);
  legacy.floor.collected = dungeon.loot.slice(0, 1).map(({ instanceId }) => instanceId);
  legacy.floor.defeated = dungeon.monsters.slice(0, 1).map(({ instanceId }) => instanceId);
  const before = structuredClone(legacy);
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.deepEqual(migrated.floor.disarmedTrapIds, []);
  assert.deepEqual(migrated.floor.detectedTrapIds, []);
  assert.deepEqual(migrated.hero.skills, before.hero.skills);
  assert.equal(migrated.hero.hp, before.hero.hp);
  assert.equal(migrated.difficulty, before.difficulty);
  assert.equal(migrated.started, false);
  assert.deepEqual(legacy, before);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
});

test('v11 trap IDs round-trip including triggered traps, and foreign IDs fail exact hydration', () => {
  const { seed, dungeon } = dungeonWithTraps();
  const run = createRun(seed, dungeon);
  const traps = trapsFromDungeon(dungeon);
  run.floor.detectedTrapIds = [traps[0].instanceId];
  run.floor.resolved = [traps[0].eventId];
  assert.equal(validateDetectedTrapIds(run.floor.detectedTrapIds, traps), true);
  assert.equal(validateRun(run), true);
  const saved = JSON.parse(JSON.stringify(run));
  const restored = hydrateDungeon(saved);
  assert.equal(restored.events.some(({ instanceId }) => instanceId === traps[0].instanceId), false);
  assert.deepEqual(saved.floor.detectedTrapIds, run.floor.detectedTrapIds);
  for (const invalid of [undefined, null, {}, [traps[0].instanceId, traps[0].instanceId], [3], ['event-2-0']]) {
    assert.equal(validateRun({ ...run, floor: { ...run.floor, detectedTrapIds: invalid } }), false);
  }
  const foreign = dungeon.events.find(({ id }) => id !== 'blade-trap')?.instanceId ?? 'event-1-999';
  const corrupt = { ...run, floor: { ...run.floor, detectedTrapIds: [foreign] } };
  assert.equal(validateDetectedTrapIds([foreign], traps), false);
  // Cheap structural validation runs on autosave; generated references resolve only at hydration.
  assert.equal(validateRun(corrupt), true);
  assert.throws(() => hydrateDungeon(corrupt), /trap/i);
});

test('explicit corrupt legacy discovery and missing v10 skills are rejected rather than repaired', () => {
  const { seed, dungeon } = dungeonWithTraps();
  const legacy = createRun(seed, dungeon);
  legacy.version = 10;
  for (const detectedTrapIds of [null, ['event-1-999'], ['event-2-0']]) {
    assert.throws(() => migrateLegacyRun({ ...legacy, floor: { ...legacy.floor, detectedTrapIds } }));
  }
  const missingSkills = structuredClone(legacy);
  delete missingSkills.hero.skills;
  assert.throws(() => migrateLegacyRun(missingSkills));
});
