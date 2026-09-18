import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHEST_ASSET_PATHS,
  CHEST_DEFAULT_PATH,
  CHEST_RESOURCE_IDS,
  CHEST_VARIANTS,
  CHEST_VISUAL_SKINS,
  chestActionRules,
  chestContextPresentation,
  chestFramesForSkin,
  chestVisualFrames,
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

test('licensed chest art exposes four deterministic animated 32x32 skins', () => {
  assert.equal(CHEST_VISUAL_SKINS.length, 4);
  assert.equal(CHEST_ASSET_PATHS.length, 16);
  assert.equal(CHEST_DEFAULT_PATH, 'licensed/cmski-chests/wooden/1.png');
  assert.ok(CHEST_ASSET_PATHS.every((path) => /^licensed\/cmski-chests\/.+\/[1-4]\.png$/.test(path)));
  const first = chestVisualFrames({ seed: 4401, depth: 2, roomIndex: 3 });
  assert.equal(first.length, 4);
  assert.deepEqual(first, chestVisualFrames({ seed: 4401, depth: 2, roomIndex: 3 }));
  assert.deepEqual(
    chestVisualFrames({ seed: 4401, depth: 2, roomIndex: 3, skinIds: ['pharaoh'] }),
    chestFramesForSkin('pharaoh'),
  );
  assert.throws(() => chestVisualFrames({ seed: 4401, depth: 2, roomIndex: 3, skinIds: ['missing'] }));
  assert.throws(() => chestVisualFrames({ seed: -1, depth: 2, roomIndex: 3 }));
});

const chest = (overrides = {}) => ({
  instanceId: 'find-1-2',
  id: 'sealed-cache',
  x: 4,
  y: 5,
  rewardGold: 12,
  rewardPower: 0,
  riskDamage: 0,
  cacheVariant: 'unlocked',
  lockTier: 0,
  trapTier: 0,
  hazardDamage: 0,
  curseEffectId: null,
  curseDuration: 0,
  ...overrides,
});

const command = (find, action, overrides = {}) => ({
  find,
  action,
  resolvedFindIds: [],
  runStatus: 'playing',
  hero: { x: find.x + 1, y: find.y, hp: 40, power: 2 },
  gold: 3,
  actor: { resources: {}, capabilities: {} },
  ...overrides,
});

test('chest profiles are deterministic, depth-scaled and include every authored variant', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 1000; seed += 1) {
    const first = createChestProfile({ seed, depth: 1 + (seed % 3), roomIndex: seed % 8, rewardGold: 10 });
    const second = createChestProfile({ seed, depth: 1 + (seed % 3), roomIndex: seed % 8, rewardGold: 10 });
    assert.deepEqual(first, second);
    assert.ok(first.rewardGold >= 10);
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
  const find = chest({ cacheVariant: 'locked', lockTier: 1, rewardGold: 15 });
  const keyed = resolveChestInteraction(command(find, 'use-key', {
    actor: { resources: { keyCount: 1 }, capabilities: {} },
  }));
  assert.equal(keyed.ok, true);
  assert.equal(keyed.rewardGold, 15);
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
  assert.equal(smashed.rewardGold, 8);
  assert.equal(smashed.destroyedGold, 7);
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
  assert.equal(disarmed.rewardGold, trapped.rewardGold);

  const cursed = chest({ cacheVariant: 'cursed', hazardDamage: 15 });
  cursed.curseEffectId = 'poison';
  cursed.curseDuration = 6;
  const cursedResult = resolveChestInteraction(command(cursed, 'open'));
  assert.deepEqual(cursedResult.status, { id: 'poison', duration: 6 });
  assert.equal(resolveChestInteraction(command(cursed, 'open', {
    hero: { x: 5, y: 5, hp: 15, power: 2 },
  })).reason, 'unsafe');

  const mimic = chest({ cacheVariant: 'mimic', hazardDamage: 14, mimicMonsterId: 'monster-1-4' });
  const ambush = resolveChestInteraction(command(mimic, 'open'));
  const prepared = resolveChestInteraction(command(mimic, 'attack'));
  assert.equal(ambush.damage, 14);
  assert.equal(prepared.damage, 7);
  assert.equal(prepared.rewardGold, 0);
  assert.equal(prepared.deferredRewardGold, mimic.rewardGold);
  assert.deepEqual(prepared.activatedMonsterIds, ['monster-1-4']);
});

test('inspection hides unknown hazards until the player chooses to examine the chest', () => {
  const find = chest({ cacheVariant: 'mimic', hazardDamage: 13 });
  const hidden = chestContextPresentation({ find, language: 'ru' });
  const known = chestContextPresentation({ find, language: 'en', inspected: true });
  assert.equal(hidden.name, 'Древний сундук');
  assert.doesNotMatch(hidden.description, /13/);
  assert.deepEqual(hidden.actions.map(({ id }) => id), ['inspect', 'open']);
  assert.equal(known.name, 'Living chest');
  assert.equal(known.description, 'The chest breathes.');
  assert.doesNotMatch(known.description, /13|reward|damage|loot/i);
  assert.deepEqual(known.actions.map(({ id }) => id), ['inspect', 'open', 'attack']);

  const opened = chestContextPresentation({
    find: chest({ containerOpened: true }),
    language: 'ru',
  });
  assert.equal(opened.description, '');
  assert.deepEqual(opened.actions.map(({ id }) => id), ['browse']);
});

test('v13 saves migrate without inventing starter tools across the expanded-run rebase', () => {
  const legacy = createRun(4401);
  legacy.version = 13;
  legacy.contentVersion = 4;
  legacy.items = legacy.items.filter(({ id }) =>
    !Object.values(CHEST_RESOURCE_IDS).includes(id) && id !== 'hunter-trap');
  legacy.inventory = legacy.inventory.filter((uid) =>
    !['starter-key', 'starter-lockpicks', 'starter-hunter-trap'].includes(uid));
  delete legacy.floor.placedTraps;
  legacy.started = true;
  legacy.floor.revealed.push(`${legacy.hero.x},${legacy.hero.y}`);
  const migrated = migrateLegacyRun(legacy);
  assert.equal(SAVE_VERSION, 44);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v44');
  assert.equal(migrated.items.some(({ id }) => Object.values(CHEST_RESOURCE_IDS).includes(id)), false);
  assert.deepEqual(migrated.floor.revealed, []);
  assert.equal(migrated.started, false);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
});

test('runtime consumes tools through registered world actions, never generic potion use', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /const CONTEXT_COMMAND_HANDLERS = Object\.freeze/);
  assert.match(runtime, /action\.command/);
  assert.match(runtime, /consumeInteractionResources\(result\.consumed\)/);
  assert.match(runtime, /if \(selection\.item\.interactionResource\)/);
  assert.match(runtime, /function useConsumable\(item, index, effectOverride = null\) \{[\s\S]{0,120}if \(item\.interactionResource\)/);
});
