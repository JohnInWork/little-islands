import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRun,
  generateDungeon,
  hydrateDungeon,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { deriveSkillCapabilities } from '../tools/dcss-rpg-skills.js';
import { trapsFromDungeon } from '../tools/dcss-rpg-traps.js';
import {
  disarmTrap,
  trapDisarmAvailability,
  trapDisarmPresentation,
} from '../tools/dcss-rpg-trap-disarming.js';

function trapFixture() {
  for (let seed = 1; seed < 100; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 1 });
    const trap = trapsFromDungeon(dungeon)[0];
    if (trap) return { dungeon, trap };
  }
  throw new Error('No generated trap fixture');
}

function command(overrides = {}) {
  const { trap } = trapFixture();
  return {
    trap,
    detectedTrapIds: [trap.instanceId],
    resolvedEventIds: [],
    disarmedTrapIds: [],
    runStatus: 'playing',
    hero: { x: trap.x + 1, y: trap.y, hp: 40 },
    capabilities: { trapDisarmTier: trap.tier },
    ...overrides,
  };
}

test('disarming is an atomic deterministic command gated by adjacency, knowledge and rank', () => {
  const input = command();
  const before = structuredClone(input);
  assert.equal(trapDisarmAvailability(input).ok, true);
  const result = disarmTrap(input);
  assert.equal(result.ok, true);
  assert.deepEqual(result.state.resolvedEventIds, [input.trap.eventId]);
  assert.deepEqual(result.state.disarmedTrapIds, [input.trap.instanceId]);
  assert.deepEqual(result.event, {
    type: 'trap-disarmed', trapId: input.trap.instanceId, tier: input.trap.tier, method: 'skill',
  });
  assert.deepEqual(input, before);
  assert.equal(disarmTrap({ ...input, detectedTrapIds: [] }).reason, 'undetected');
  assert.equal(disarmTrap({ ...input, hero: { ...input.hero, x: input.trap.x + 2 } }).reason, 'distance');
  assert.equal(disarmTrap({ ...input, capabilities: { trapDisarmTier: 0 } }).reason, 'skill-required');
  assert.equal(disarmTrap({ ...input, runStatus: 'dead' }).reason, 'inactive');
});

test('skill ranks and bilingual copy expose the exact trap tier', () => {
  const input = command();
  const skillState = { version: 1, points: 0, ranks: { 'trap-disarming': 1 } };
  const capabilities = deriveSkillCapabilities(skillState);
  assert.equal(capabilities.trapDisarmTier, 1);
  const availability = trapDisarmAvailability({ ...input, capabilities });
  assert.equal(availability.ok, input.trap.tier === 1);
  const ru = trapDisarmPresentation({ trap: input.trap, effectiveTier: 0, language: 'ru' });
  const en = trapDisarmPresentation({ trap: input.trap, effectiveTier: 0, language: 'en' });
  assert.match(ru.skillRequired ?? ru.unavailable, /Сапёр/);
  assert.match(en.unavailable, /Trap disarming/);
});

test('v12 migration adds disarmed history and v14 hydration rejects foreign disarmed traps', () => {
  const { dungeon, trap } = trapFixture();
  const legacy = createRun(dungeon.seed, dungeon);
  legacy.version = 12;
  delete legacy.floor.disarmedTrapIds;
  const migrated = migrateLegacyRun(legacy);
  assert.deepEqual(migrated.floor.disarmedTrapIds, []);
  assert.equal(validateRun(migrated), true);

  migrated.floor.detectedTrapIds.push(trap.instanceId);
  migrated.floor.resolved.push(trap.eventId);
  migrated.floor.disarmedTrapIds.push(trap.instanceId);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
  const foreign = structuredClone(migrated);
  foreign.floor.detectedTrapIds = ['event-1-99'];
  foreign.floor.resolved = ['event-1-99'];
  foreign.floor.disarmedTrapIds = ['event-1-99'];
  assert.equal(validateRun(foreign), true);
  assert.throws(() => hydrateDungeon(foreign), /Unknown (?:detected|disarmed) trap/);
});
