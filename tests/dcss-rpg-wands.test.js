import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import {
  CONTENT_VERSION,
  SAVE_KEY,
  SAVE_VERSION,
  createRun,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { applyActorEffect, createActorEffects } from '../tools/dcss-rpg-effects.js';
import {
  createItemKnowledge,
  identifiableItemIds,
  identifyItem,
  itemIdentificationView,
} from '../tools/dcss-rpg-identification.js';
import { itemPresentation } from '../tools/dcss-rpg-item-details.js';
import { resolveTargetedItemUse } from '../tools/dcss-rpg-targeting.js';

const wand = lootById('tide-wand');
const wandIds = identifiableItemIds(LOOT_CATALOG, 'wand');

test('Tide Wand is a bounded data-driven target effect in the unknown wand pool', () => {
  assert.deepEqual(wand.useEffect, {
    type: 'target-effect',
    effectId: 'wet',
    duration: 10,
    range: 6,
  });
  assert.equal(wand.kind, 'wand');
  assert.equal(wand.stack, 3);
  assert.equal(wand.identification.group, 'wand');
  assert.ok(wandIds.includes('tide-wand'));
});

test('targeted items consume exactly one charge only after a valid explicit actor choice', () => {
  const command = {
    heroHp: 40,
    itemCount: 2,
    candidateTargetIds: ['monster-a', 'monster-b'],
    effect: wand.useEffect,
  };
  assert.deepEqual(resolveTargetedItemUse({ ...command, targetId: 'missing' }), {
    ok: false,
    reason: 'invalid-target',
    consumed: 0,
  });
  assert.deepEqual(resolveTargetedItemUse({ ...command, targetId: 'monster-a', itemCount: 0 }), {
    ok: false,
    reason: 'item-required',
    consumed: 0,
  });

  const result = resolveTargetedItemUse({ ...command, targetId: 'monster-b' });
  assert.equal(result.ok, true);
  assert.equal(result.consumed, 1);
  assert.equal(result.remainingItems, 1);
  assert.deepEqual(result.application, { id: 'wet', duration: 10 });
  assert.deepEqual(result.event, {
    type: 'actor-effect-item-used',
    targetId: 'monster-b',
    effectId: 'wet',
    duration: 10,
  });
});

test('Tide Wand enables cold synergy and extinguishes fire into steam', () => {
  const wet = applyActorEffect(createActorEffects(), 'wet', wand.useEffect.duration);
  assert.equal(wet.effects.wet, 10);

  const burning = applyActorEffect(createActorEffects(), 'burning', 8).effects;
  const steam = applyActorEffect(burning, 'wet', wand.useEffect.duration);
  assert.equal(steam.reaction, 'steam');
  assert.equal(steam.effects.burning, 0);
  assert.equal(steam.effects.wet, 10);
});

test('an unknown Tide Wand leaks no identity and becomes known run-wide after use', () => {
  const owned = { ...wand, uid: 'tide-qa', stack: 3 };
  const hidden = itemIdentificationView({
    item: owned,
    seed: 91,
    knowledge: createItemKnowledge(),
    identityIds: wandIds,
  });
  assert.equal(hidden.id, 'unidentified-wand');
  assert.equal(Object.hasOwn(hidden, 'useEffect'), false);
  assert.match(JSON.stringify(itemPresentation(hidden, 'ru')), /эффект неизвестен/i);

  const knowledge = identifyItem(createItemKnowledge(), wand.id, wandIds);
  const known = itemIdentificationView({ item: owned, seed: 91, knowledge, identityIds: wandIds });
  assert.equal(known.id, 'tide-wand');
  assert.equal(known.identified, true);
  assert.match(itemPresentation(known, 'en').description, /Wet.*10s.*range 6/i);
});

test('v30 migrates v29 additively when the wand pool expands', () => {
  const run = createRun(3030);
  const legacy = structuredClone(run);
  legacy.version = 29;
  legacy.contentVersion = 16;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(SAVE_VERSION, 40);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v40');
  assert.equal(CONTENT_VERSION, 19);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.contentVersion, CONTENT_VERSION);
  assert.equal(validateRun(migrated), true);
});

test('runtime routes the wand through shared targeting and a visible water projectile', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function beginTargetEffectItemTargeting\(itemUid\)/);
  assert.match(runtime, /resolveTargetedItemUse\(\{/);
  assert.match(runtime, /kind: 'tide-wand'/);
  assert.match(runtime, /projectile\.itemEffect && projectile\.status\.id === 'wet'/);
  assert.match(runtime, /applied\.reaction === 'steam'/);
});
