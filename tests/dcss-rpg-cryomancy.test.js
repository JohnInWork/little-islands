import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CRYOMANCY_RULES,
  cryomancyHitProfile,
  cryomancyShatterDamage,
  selectCryomancyShatterTargets,
} from '../tools/dcss-rpg-cryomancy.js';
import { createActorEffects } from '../tools/dcss-rpg-effects.js';

test('cryomancy ranks form the intended chill, freeze and shatter chain', () => {
  assert.equal(CRYOMANCY_RULES.length, 4);
  assert.deepEqual(cryomancyHitProfile({ rank: 0, baseChillDuration: 4 }), {
    rank: 0,
    chillDuration: 4,
    freezeDuration: 0,
    shatter: false,
    shatterDamagePercent: 0,
    shatterRadius: 0,
    shatterTargets: 0,
  });
  assert.equal(cryomancyHitProfile({ rank: 1, baseChillDuration: 4 }).chillDuration, 6);
  assert.equal(cryomancyHitProfile({
    rank: 2,
    effects: createActorEffects({ wet: 5 }),
    baseChillDuration: 4,
  }).freezeDuration, 1.25);
  assert.equal(cryomancyHitProfile({
    rank: 2,
    effects: createActorEffects({ chilled: 5 }),
    baseChillDuration: 4,
  }).freezeDuration, 0);
  assert.equal(cryomancyHitProfile({
    rank: 3,
    effects: createActorEffects({ chilled: 5 }),
    baseChillDuration: 4,
  }).freezeDuration, 1.5);
});

test('rank III consumes a pre-existing freeze into one bounded shatter', () => {
  const profile = cryomancyHitProfile({
    rank: 3,
    effects: createActorEffects({ frozen: 1 }),
    baseChillDuration: 8,
  });
  assert.equal(profile.shatter, true);
  assert.equal(profile.freezeDuration, 0);
  assert.equal(profile.shatterDamagePercent, 45);
  assert.equal(cryomancyShatterDamage(21, profile), 9);
  assert.equal(cryomancyShatterDamage(0, profile), 0);
  assert.equal(cryomancyShatterDamage(21, cryomancyHitProfile({ rank: 2 })), 0);
  assert.equal(cryomancyHitProfile({ rank: 99 }).rank, 3);
  assert.throws(() => cryomancyHitProfile({ baseChillDuration: 61 }), /bounded/);
});

test('shatter target selection is deterministic, limited and distance based', () => {
  const origin = { instanceId: 'origin', x: 64, y: 64 };
  const profile = cryomancyHitProfile({
    rank: 3,
    effects: createActorEffects({ frozen: 1 }),
    baseChillDuration: 4,
  });
  const candidates = [
    { instanceId: 'far', x: 64 + 1.7 * 64, y: 64 },
    { instanceId: 'same-b', x: 64, y: 96 },
    { instanceId: 'outside', x: 64 + 2 * 64, y: 64 },
    { instanceId: 'same-a', x: 96, y: 64 },
    { instanceId: 'near', x: 80, y: 64 },
  ];
  assert.deepEqual(
    selectCryomancyShatterTargets({ origin, candidates, profile }).map(({ instanceId }) => instanceId),
    ['near', 'same-a', 'same-b'],
  );
  assert.deepEqual(selectCryomancyShatterTargets({
    origin,
    candidates,
    profile: cryomancyHitProfile({ rank: 0 }),
  }), []);
});
