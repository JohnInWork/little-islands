import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHEST_RESOURCE_IDS,
  CHEST_VARIANTS,
  chestActionRules,
  chestContextPresentation,
  createChestProfile,
  lockpickCost,
  resolveChestInteraction,
} from '../tools/dcss-rpg-chests.js';
import {
  SAVE_KEY,
  SAVE_VERSION,
  createRun,
  hydrateDungeon,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';

const chest = (overrides = {}) => ({
  instanceId: 'find-1-2',
  id: 'sealed-cache',
  x: 4,
  y: 5,
  rewardShards: 12,
  rewardPower: 0,
  riskDamage: 0,
  cacheVariant: 'unlocked',
  lockTier: 0,
  trapTier: 0,
  hazardDamage: 0,
  ...overrides,
});

const command = (find, action, overrides = {}) => ({
  find,
  action,
  resolvedFindIds: [],
  runStatus: 'playing',
  hero: { x: find.x + 1, y: find.y, hp: 40, power: 2 },
  shards: 3,
  actor: { resources: {}, capabilities: {} },
  ...overrides,
});

test('chest profiles are deterministic, depth-scaled and include every authored variant', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 1000; seed += 1) {
    const first = createChestProfile({ seed, depth: 1 + (seed % 3), roomIndex: seed % 8, rewardShards: 10 });
    const second = createChestProfile({ seed, depth: 1 + (seed % 3), roomIndex: seed % 8, rewardShards: 10 });
    assert.deepEqual(first, second);
    assert.ok(first.rewardShards >= 10);
    assert.ok(first.lockTier >= 0 && first.lockTier <= 3);
    assert.ok(first.trapTier >= 0 && first.trapTier <= 3);
    seen.add(first.cacheVariant);
  }
  assert.deepEqual([...seen].sort(), [...CHEST_VARIANTS].sort());
});

test('locked chest exposes key, skill-gated lockpicking and destructive fallback', () => {
  const find = chest({ cacheVariant: 'locked', lockTier: 1 });
  const blocked = chestActionRules({ find, actor: { resources: {}, capabilities: {} } });
  assert.deepEqual(blocked.actions.map(({ id }) => id), ['use-key', 'pick-lock', 'smash']);
  assert.equal(blocked.actions.find(({ id }) => id === 'use-key').enabled, false);
  assert.equal(blocked.actions.find(({ id }) => id === 'pick-lock').enabled, false);
  const keyed = chestActionRules({
    find,
    actor: { resources: { keyCount: 1 }, capabilities: {} },
  });
  assert.equal(keyed.actions.find(({ id }) => id === 'use-key').enabled, true);
  const picked = chestActionRules({
    find,
    actor: { resources: { lockpickCount: 2 }, capabilities: { lockpickTier: 1 } },
  });
  assert.equal(lockpickCost(1), 2);
  assert.equal(lockpickCost(2), 1);
  assert.equal(picked.actions.find(({ id }) => id === 'pick-lock').enabled, true);
});

test('key, lockpick and smash outcomes are atomic and economically distinct', () => {
  const find = chest({ cacheVariant: 'locked', lockTier: 1, rewardShards: 15 });
  const keyed = resolveChestInteraction(command(find, 'use-key', {
    actor: { resources: { keyCount: 1 }, capabilities: {} },
  }));
  assert.equal(keyed.ok, true);
  assert.equal(keyed.rewardShards, 15);
  assert.deepEqual(keyed.consumed, [{ id: CHEST_RESOURCE_IDS.key, amount: 1 }]);

  const pickedInput = command(find, 'pick-lock', {
    actor: { resources: { lockpickCount: 2 }, capabilities: { lockpickTier: 1 } },
  });
  const before = structuredClone(pickedInput);
  const picked = resolveChestInteraction(pickedInput);
  assert.equal(picked.ok, true);
  assert.deepEqual(picked.consumed, [{ id: CHEST_RESOURCE_IDS.lockpick, amount: 2 }]);
  assert.deepEqual(pickedInput, before);

  const smashed = resolveChestInteraction(command(find, 'smash'));
  assert.equal(smashed.ok, true);
  assert.equal(smashed.rewardShards, 8);
  assert.equal(smashed.destroyedShards, 7);
  assert.equal(smashed.noise, 7);
});

test('traps, curses and mimics trade health for loot while skill creates a safe answer', () => {
  const trapped = chest({ cacheVariant: 'trapped', trapTier: 2, hazardDamage: 12 });
  const opened = resolveChestInteraction(command(trapped, 'open'));
  assert.equal(opened.ok, true);
  assert.equal(opened.damage, 12);
  assert.equal(opened.state.hero.hp, 28);
  const blocked = resolveChestInteraction(command(trapped, 'disarm'));
  assert.equal(blocked.reason, 'disarm-skill-required');
  const disarmed = resolveChestInteraction(command(trapped, 'disarm', {
    actor: { resources: {}, capabilities: { trapDisarmTier: 2 } },
  }));
  assert.equal(disarmed.ok, true);
  assert.equal(disarmed.damage, 0);
  assert.equal(disarmed.rewardShards, trapped.rewardShards);

  const cursed = chest({ cacheVariant: 'cursed', hazardDamage: 15 });
  assert.equal(resolveChestInteraction(command(cursed, 'open', {
    hero: { x: 5, y: 5, hp: 15, power: 2 },
  })).reason, 'unsafe');

  const mimic = chest({ cacheVariant: 'mimic', hazardDamage: 14 });
  const ambush = resolveChestInteraction(command(mimic, 'open'));
  const prepared = resolveChestInteraction(command(mimic, 'attack'));
  assert.equal(ambush.damage, 14);
  assert.equal(prepared.damage, 7);
  assert.equal(prepared.rewardShards, Math.ceil(mimic.rewardShards / 2));
});

test('inspection hides unknown hazards until the player chooses to examine the chest', () => {
  const find = chest({ cacheVariant: 'mimic', hazardDamage: 13 });
  const hidden = chestContextPresentation({ find, language: 'ru' });
  const known = chestContextPresentation({ find, language: 'en', inspected: true });
  assert.equal(hidden.name, 'Древний сундук');
  assert.doesNotMatch(hidden.description, /13/);
  assert.deepEqual(hidden.actions.map(({ id }) => id), ['inspect', 'open']);
  assert.equal(known.name, 'Living chest');
  assert.match(known.description, /13/);
  assert.deepEqual(known.actions.map(({ id }) => id), ['inspect', 'open', 'attack']);
});

test('v13 saves migrate without inventing starter tools or rebuilding the active floor', () => {
  const legacy = createRun(4401);
  legacy.version = 13;
  legacy.contentVersion = 4;
  legacy.items = legacy.items.filter(({ id }) => !Object.values(CHEST_RESOURCE_IDS).includes(id));
  legacy.inventory = legacy.inventory.filter((uid) => !['starter-key', 'starter-lockpicks'].includes(uid));
  legacy.started = true;
  legacy.floor.revealed.push(`${legacy.hero.x},${legacy.hero.y}`);
  const migrated = migrateLegacyRun(legacy);
  assert.equal(SAVE_VERSION, 14);
  assert.equal(SAVE_KEY, 'little-islands:dcss-rpg:v14');
  assert.equal(migrated.items.some(({ id }) => Object.values(CHEST_RESOURCE_IDS).includes(id)), false);
  assert.deepEqual(migrated.floor.revealed, legacy.floor.revealed);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
});

test('runtime consumes tools through registered world actions, never generic potion use', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /const CONTEXT_COMMAND_HANDLERS = Object\.freeze/);
  assert.match(runtime, /action\.command/);
  assert.match(runtime, /consumeInteractionResources\(result\.consumed\)/);
  assert.match(runtime, /if \(selection\.item\.interactionResource\)/);
  assert.match(runtime, /function useConsumable\(item, index\) \{\s+if \(item\.interactionResource\)/);
});
