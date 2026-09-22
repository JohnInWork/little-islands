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
  DISARM_TOOL_COST,
  DISARM_TOOL_ITEM_ID,
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
    // Механизм снимают набором сапёра: у всех, кроме третьего ранга.
    sapperKitCount: 2,
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
    type: 'trap-disarmed', trapId: input.trap.instanceId, tier: input.trap.tier, method: 'tool',
  });
  assert.deepEqual(result.consumed, [{ id: DISARM_TOOL_ITEM_ID, amount: DISARM_TOOL_COST }]);
  // Без отмычки механизм не снять — и это отдельный отказ, а не «нет навыка».
  assert.equal(disarmTrap({ ...input, sapperKitCount: 0 }).reason, 'tool-required');
  // Третий ранг обходится без них: рука уже знает, куда нажать.
  const мастер = disarmTrap({
    ...input,
    sapperKitCount: 0,
    capabilities: { trapDisarmTier: 3, trapDisarmFree: 1 },
  });
  assert.equal(мастер.ok, true);
  assert.deepEqual(мастер.consumed, []);
  assert.equal(мастер.event.method, 'skill');
  assert.deepEqual(input, before);
  assert.equal(disarmTrap({ ...input, detectedTrapIds: [] }).reason, 'undetected');
  assert.equal(disarmTrap({ ...input, hero: { ...input.hero, x: input.trap.x + 2 } }).reason, 'distance');
  assert.equal(disarmTrap({ ...input, capabilities: { trapDisarmTier: 0 } }).reason, 'skill-required');
  assert.equal(disarmTrap({ ...input, runStatus: 'dead' }).reason, 'inactive');
});

test('первый ранг «Ловушек» снимает любой механизм, и отказы названы по-человечески', () => {
  const input = command();
  const skillState = { version: 1, points: 0, ranks: { traps: 1 } };
  const capabilities = deriveSkillCapabilities(skillState);
  // Все напольные ловушки первого тира, поэтому первый ранг берёт любую.
  assert.equal(capabilities.trapDisarmTier, 3);
  assert.equal(trapDisarmAvailability({ ...input, capabilities }).ok, true);
  const ru = trapDisarmPresentation({ trap: input.trap, effectiveTier: 0, language: 'ru' });
  const en = trapDisarmPresentation({ trap: input.trap, effectiveTier: 0, language: 'en' });
  assert.match(ru.unavailable, /Ловушки/);
  assert.match(en.unavailable, /Traps/);
  assert.match(ru.toolRequired, /сапёра/);
  assert.match(en.toolRequired, /sapper/);
});

test('v12 migration adds disarmed history and v15 hydration rejects foreign disarmed traps', () => {
  const { dungeon, trap } = trapFixture();
  const legacy = createRun(dungeon.seed, dungeon);
  legacy.version = 12;
  delete legacy.floor.disarmedTrapIds;
  delete legacy.floor.placedTraps;
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
