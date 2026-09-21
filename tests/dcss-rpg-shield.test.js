import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRun,
  generateDungeon,
  hydrateDungeon,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { createMonsterStates } from '../tools/dcss-rpg-rules.js';
import {
  resolveShieldBlock,
  shieldBlockProfile,
  shieldBlockRoll,
} from '../tools/dcss-rpg-shield.js';
import { deriveSkillCapabilities } from '../tools/dcss-rpg-skills.js';
import { createActorEffects } from '../tools/dcss-rpg-effects.js';

const shieldCombat = Object.freeze({ style: 'blade', guard: 1 });
const noShieldCombat = Object.freeze({ style: 'heavy', guard: 0 });
const capabilitiesAtRank = (rank) => deriveSkillCapabilities({
  version: 1,
  points: 6 - rank,
  ranks: rank > 0 ? { shield: rank } : {},
});

test('shield ranks grant 15/25/35 percent without enabling stun before rank III', () => {
  assert.deepEqual(shieldBlockProfile(shieldCombat, capabilitiesAtRank(0)), {
    enabled: false, chancePercent: 0, stunSeconds: 0,
  });
  assert.deepEqual(shieldBlockProfile(shieldCombat, capabilitiesAtRank(1)), {
    enabled: true, chancePercent: 15, stunSeconds: 0,
  });
  assert.deepEqual(shieldBlockProfile(shieldCombat, capabilitiesAtRank(2)), {
    enabled: true, chancePercent: 25, stunSeconds: 0,
  });
  assert.deepEqual(shieldBlockProfile(shieldCombat, capabilitiesAtRank(3)), {
    enabled: true, chancePercent: 35, stunSeconds: 0.6,
  });
});

test('block chance requires an active shield and uses an exact inclusive boundary', () => {
  const rankThree = capabilitiesAtRank(3);
  assert.equal(resolveShieldBlock({ combat: noShieldCombat, capabilities: rankThree, roll: 0 }).blocked, false);
  assert.equal(resolveShieldBlock({ combat: shieldCombat, capabilities: rankThree, roll: 34 }).blocked, true);
  assert.equal(resolveShieldBlock({ combat: shieldCombat, capabilities: rankThree, roll: 35 }).blocked, false);
  assert.equal(resolveShieldBlock({ combat: shieldCombat, capabilities: rankThree, roll: 34 }).stunSeconds, 0.6);
  assert.equal(resolveShieldBlock({ combat: shieldCombat, capabilities: rankThree, roll: 35 }).stunSeconds, 0);
  assert.throws(() => resolveShieldBlock({ combat: shieldCombat, capabilities: rankThree, roll: 100 }));
});

test('block rolls are deterministic per attack command without mutable or visual RNG', () => {
  const command = { seed: 7319, depth: 2, attackerId: 'monster-2-4', attackSequence: 7 };

  /*
   * Город — нулевой этаж, и бьют в нём по-настоящему: стража, зверьё,
   * разбуженный капитан. Пока бросок требовал глубины от единицы, каждый
   * такой удар ронял кадр мира — в консоли «frame failed in world and was
   * skipped», на экране замершая картинка при живом бое.
   */
  assert.doesNotThrow(() => shieldBlockRoll({ ...command, depth: 0 }));
  assert.equal(Number.isInteger(shieldBlockRoll({ ...command, depth: 0 })), true);
  assert.notEqual(shieldBlockRoll({ ...command, depth: 0 }), shieldBlockRoll({ ...command, depth: 1 }));
  assert.throws(() => shieldBlockRoll({ ...command, depth: -1 }), RangeError);
  assert.throws(() => shieldBlockRoll({ ...command, depth: 1000 }), RangeError);
  const first = shieldBlockRoll(command);
  assert.equal(first, shieldBlockRoll(command));
  assert.ok(first >= 0 && first < 100);
  const rolls = new Set(Array.from({ length: 100 }, (_, attackSequence) => (
    shieldBlockRoll({ ...command, attackSequence })
  )));
  assert.ok(rolls.size > 50);
  assert.notEqual(
    shieldBlockRoll({ ...command, attackerId: 'monster-2-5' }),
    shieldBlockRoll(command),
  );
  assert.throws(() => shieldBlockRoll({ ...command, attackSequence: -1 }));
});

test('monster attack sequence survives save and hydration while old v16 states default to zero', () => {
  const run = createRun(8119);
  const generated = generateDungeon({ seed: run.seed, depth: run.depth });
  const spawn = generated.monsters[0];
  run.floor.monsters = [{
    instanceId: spawn.instanceId,
    x: spawn.x,
    y: spawn.y,
    hp: 1,
    attackSequence: 9,
    effects: createActorEffects(),
  }];
  assert.equal(validateRun(run), true);
  const restored = createMonsterStates(hydrateDungeon(run));
  assert.equal(restored.find(({ instanceId }) => instanceId === spawn.instanceId).attackSequence, 9);

  const legacyShape = structuredClone(run);
  delete legacyShape.floor.monsters[0].attackSequence;
  assert.equal(validateRun(legacyShape), true);
  const legacyRestored = createMonsterStates(hydrateDungeon(legacyShape));
  assert.equal(legacyRestored.find(({ instanceId }) => instanceId === spawn.instanceId).attackSequence, 0);

  for (const attackSequence of [-1, 1.5, Infinity, 1_000_000_001]) {
    const corrupt = structuredClone(run);
    corrupt.floor.monsters[0].attackSequence = attackSequence;
    assert.equal(validateRun(corrupt), false);
  }
});
