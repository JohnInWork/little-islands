import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import {
  SAVE_KEY,
  SAVE_VERSION,
  advanceRunFloor,
  createRun,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import {
  POTION_APPEARANCES,
  appraiseItem,
  createItemKnowledge,
  identifiableItemIds,
  identifyItem,
  itemIdentificationView,
  potionAppearanceFor,
  potionOutcome,
  validateItemKnowledge,
} from '../tools/dcss-rpg-identification.js';
import { itemDetails, itemPresentation } from '../tools/dcss-rpg-item-details.js';

const identityIds = identifiableItemIds(LOOT_CATALOG);
const view = (item, seed = 1234, knowledge = createItemKnowledge()) => itemIdentificationView({
  item,
  seed,
  knowledge,
  identityIds,
});

test('potion identities receive one deterministic appearance permutation per run', () => {
  assert.ok(identityIds.length >= 4);
  assert.ok(identityIds.length <= POTION_APPEARANCES.length);
  const first = identityIds.map((id) => potionAppearanceFor(991, id, identityIds).id);
  const repeated = identityIds.map((id) => potionAppearanceFor(991, id, [...identityIds].reverse()).id);
  const anotherRun = identityIds.map((id) => potionAppearanceFor(992, id, identityIds).id);
  assert.deepEqual(repeated, first);
  assert.equal(new Set(first).size, identityIds.length);
  assert.notDeepEqual(anotherRun, first);
});

test('unknown item views leak neither identity, effect nor rarity into RU/EN presentation', () => {
  const potion = { ...lootById('venom-potion'), uid: 'venom-1' };
  const hidden = view(potion);
  assert.equal(hidden.id, 'unidentified-potion');
  assert.equal(hidden.rarity, 0);
  assert.equal(Object.hasOwn(hidden, 'potionEffect'), false);
  assert.equal(Object.hasOwn(hidden, 'identification'), false);
  for (const language of ['ru', 'en']) {
    const presentation = itemPresentation(hidden, language);
    const copy = JSON.stringify(presentation).toLowerCase();
    assert.equal(presentation.rarityMarks, '?');
    assert.doesNotMatch(copy, /venom|яд|14|poison|редк|rare/);
    assert.match(copy, language === 'ru' ? /эффект неизвестен/ : /effect stays unknown|unknown effect/);
  }
});

test('identifying one true type reveals every matching bottle but no other type', () => {
  const seed = 441;
  const might = { ...lootById('mystery-potion'), uid: 'might-a' };
  const secondMight = { ...lootById('mystery-potion'), uid: 'might-b' };
  const mending = { ...lootById('mending-potion'), uid: 'mending-a' };
  const hiddenIcon = view(might, seed).icon;
  const knowledge = identifyItem(createItemKnowledge(), might.id, identityIds);
  const known = view(might, seed, knowledge);
  assert.equal(known.id, 'mystery-potion');
  assert.equal(known.icon, hiddenIcon);
  assert.equal(view(secondMight, seed, knowledge).identified, true);
  assert.equal(view(mending, seed, knowledge).unidentified, true);
  assert.equal(itemDetails(known, 'ru').name, 'Зелье мощи');
  assert.equal(itemDetails(known, 'en').name, 'Potion of Might');
});

test('Appraisal ranks safely identify only authored potion tiers', () => {
  let knowledge = createItemKnowledge();
  const tierOne = lootById('mending-potion');
  const tierTwo = lootById('cleansing-potion');
  const tierThree = lootById('venom-potion');
  const blocked = appraiseItem({
    knowledge, item: tierTwo, capabilities: { itemIdentificationTier: 1 }, identifiableIds: identityIds,
  });
  assert.deepEqual(blocked, { ok: false, reason: 'rank-required', knowledge });
  const first = appraiseItem({
    knowledge, item: tierOne, capabilities: { itemIdentificationTier: 1 }, identifiableIds: identityIds,
  });
  assert.equal(first.ok, true);
  knowledge = first.knowledge;
  assert.deepEqual(knowledge.identifiedItemIds, ['mending-potion']);
  assert.equal(appraiseItem({
    knowledge, item: tierThree, capabilities: { itemIdentificationTier: 2 }, identifiableIds: identityIds,
  }).ok, false);
  assert.equal(appraiseItem({
    knowledge, item: tierThree, capabilities: { itemIdentificationTier: 3 }, identifiableIds: identityIds,
  }).ok, true);
});

test('all four mystery potion outcomes are bounded and data driven', () => {
  assert.deepEqual(potionOutcome(lootById('mending-potion')), { type: 'heal', amount: 28 });
  assert.deepEqual(potionOutcome(lootById('mystery-potion')), { type: 'power', amount: 1 });
  assert.deepEqual(potionOutcome(lootById('cleansing-potion')), { type: 'cleanse' });
  assert.deepEqual(
    potionOutcome(lootById('venom-potion')),
    { type: 'venom', damage: 14, duration: 6 },
  );
  assert.equal(potionOutcome(lootById('bread')), null);
});

test('item knowledge is strict, survives floors and migrates additively from v17', () => {
  const run = createRun(718);
  run.knowledge = identifyItem(run.knowledge, 'mystery-potion', identityIds);
  assert.equal(validateRun(run), true);
  assert.deepEqual(advanceRunFloor(run).knowledge, run.knowledge);
  assert.equal(validateItemKnowledge({ version: 1, identifiedItemIds: ['foreign'] }, identityIds), false);
  assert.equal(validateRun({ ...run, knowledge: { version: 1, identifiedItemIds: ['foreign'] } }), false);

  const legacy = structuredClone(run);
  legacy.version = 17;
  legacy.contentVersion = 8;
  delete legacy.knowledge;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(SAVE_VERSION, 41);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v41');
  assert.deepEqual(migrated.knowledge, createItemKnowledge());
  assert.equal(validateRun(migrated), true);
});

test('runtime uses the safe presentation at every visible item boundary', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function presentedItem\(item\)/);
  assert.match(runtime, /const displayItem = presentedItem\(loot\.definition\)/);
  assert.match(runtime, /const displayItem = presentedItem\(item\)/);
  assert.match(runtime, /const displayItem = definition \? presentedItem/);
  assert.match(runtime, /run\.knowledge = identifyItem\(/);
  assert.match(runtime, /const appraisal = selection\.source === 'pack' \? currentAppraisal/);
  assert.match(runtime, /if \(appraisal\?\.ok\)/);
  assert.match(runtime, /if \(toastVisible && activeLootToastEntry\) renderLootToast\(activeLootToastEntry\)/);
});
