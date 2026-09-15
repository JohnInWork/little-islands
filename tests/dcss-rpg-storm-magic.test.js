import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  selectStormChainTargets,
  stormChainDamage,
  stormChainProfile,
} from '../tools/dcss-rpg-storm-magic.js';

const actor = (instanceId, x, y, wet = true, overrides = {}) => ({
  instanceId,
  x,
  y,
  effects: wet ? { wet: 5 } : {},
  ...overrides,
});

test('storm ranks have bounded monotonic chains and damage', () => {
  assert.deepEqual(stormChainProfile(0), { rank: 0, targets: 0, damagePercent: 0, jumpRange: 0 });
  assert.deepEqual(stormChainProfile(1), { rank: 1, targets: 1, damagePercent: 55, jumpRange: 2.5 });
  assert.deepEqual(stormChainProfile(3), { rank: 3, targets: 3, damagePercent: 75, jumpRange: 3.5 });
  assert.equal(stormChainProfile(99), stormChainProfile(3));
  assert.equal(stormChainDamage(11, stormChainProfile(1)), 6);
  assert.equal(stormChainDamage(11, stormChainProfile(3)), 8);
  assert.equal(stormChainDamage(0, stormChainProfile(3)), 0);
  assert.throws(() => stormChainDamage(-1, stormChainProfile(1)));
});

test('a dry primary target never starts a chain and wet is not consumed', () => {
  const origin = actor('origin', 0, 0, false);
  const wet = actor('wet', 32, 0);
  assert.deepEqual(selectStormChainTargets({
    origin,
    candidates: [wet],
    profile: stormChainProfile(3),
    tileSize: 64,
  }), []);
  assert.equal(wet.effects.wet, 5);
});

test('chain selection walks nearest wet actors sequentially with stable ties', () => {
  const origin = actor('origin', 0, 0);
  const firstById = actor('a', 64, 0);
  const tiedLater = actor('b', 0, 64);
  const hopOnly = actor('c', 0, 64 * 4);
  const dry = actor('dry', 32, 0, false);
  const selected = selectStormChainTargets({
    origin,
    candidates: [tiedLater, hopOnly, dry, firstById],
    profile: stormChainProfile(3),
    tileSize: 64,
  });
  assert.deepEqual(selected.map(({ instanceId }) => instanceId), ['a', 'b', 'c']);
  assert.equal(dry.effects.wet, undefined);
});

test('line of sight and terminal actors stop otherwise valid links', () => {
  const origin = actor('origin', 0, 0);
  const blocked = actor('blocked', 64, 0);
  const open = actor('open', 0, 64);
  const dead = actor('dead', 64, 64, true, { dead: true });
  const defeated = actor('defeated', -64, 0, true, { defeated: true });
  const selected = selectStormChainTargets({
    origin,
    candidates: [blocked, open, dead, defeated],
    profile: stormChainProfile(3),
    tileSize: 64,
    canLink: (_from, to) => to !== blocked,
  });
  assert.deepEqual(selected.map(({ instanceId }) => instanceId), ['open']);
});

test('runtime connects Storm Magic to targeting, combat, pixel arcs, light and sound', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /usedSpell\.schoolId === 'storm-magic'/);
  assert.match(runtime, /selectStormChainTargets\(\{/);
  assert.match(runtime, /stormChainDamage\(projectile\.damage, profile\)/);
  assert.match(runtime, /function drawLightningArcs\(\)/);
  assert.match(runtime, /id: `storm-arc:\$\{arc\.sequence\}`/);
  assert.match(runtime, /function playStormCrackle\(chainTargets = 0\)/);
});
