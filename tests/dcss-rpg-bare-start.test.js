import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';

import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import {
  createRun,
  generateDungeon,
  hydrateDungeon,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import {
  BUILD_PRESETS,
  DEFAULT_BUILD_PRESET_ID,
  LEGACY_BUILD_PRESET_ID,
  createStartingMagic,
} from '../tools/dcss-rpg-build-presets.js';
import {
  allEquipmentVisualAssetPaths,
  equipmentVisualForItem,
  equipmentVisualProblems,
} from '../tools/dcss-rpg-equipment-visuals.js';
import { BOOK_APPEARANCES, itemAppearanceFor } from '../tools/dcss-rpg-identification.js';
import { itemDetails } from '../tools/dcss-rpg-item-details.js';
import { createMerchantStock } from '../tools/dcss-rpg-merchant.js';
import { composePlayerLayers } from '../tools/dcss-rpg-player.js';
import {
  BASIC_SPELL_BOOK_IDS,
  BASIC_SPELL_BOOK_MAX_DEPTH,
  guaranteedSpellBookPlacement,
} from '../tools/dcss-rpg-books.js';
import { lootEligibleForFloor, floorScaling } from '../tools/dcss-rpg-scaling.js';
import { spellBarModel } from '../tools/dcss-rpg-spells.js';

const assetUrl = (path) => new URL(`../public/assets/dcss-preview/${path}`, import.meta.url);
/** What the hero wears, and what they carry. The two have different promises. */
const STARTER_GEAR_IDS = ['rusty-sword', 'worn-tunic'];
const STARTER_SUPPLY_IDS = ['mending-potion', 'wild-fruit'];
const STARTER_IDS = [...STARTER_GEAR_IDS, ...STARTER_SUPPLY_IDS];

test('a new run starts with worn clothes, a rusty sword, one potion, one meal and no spells', () => {
  const run = createRun(4242);
  assert.deepEqual(run.items.map(({ id }) => id), STARTER_IDS);
  // «Дать одно-два зелья лечения и немного еды — но не слишком»: one of each,
  // in the bag rather than worn, and the potion is known so it can be leaned on.
  assert.deepEqual(run.inventory, ['starter-potion', 'starter-food']);
  assert.deepEqual([...run.knowledge.identifiedItemIds], ['mending-potion']);
  assert.equal(run.equipment.hand1, 'starter-sword');
  assert.equal(run.equipment.body, 'starter-tunic');
  for (const slot of ['cloak', 'head', 'hand2', 'gloves', 'belt', 'boots', 'ring1', 'ring2', 'amulet']) {
    assert.equal(run.equipment[slot], null, `${slot} starts empty`);
  }
  assert.equal(run.hero.attributes.intelligence, 3);
  assert.deepEqual(run.hero.spells.knownSpellIds, []);
  assert.deepEqual(run.hero.spells.preparedSpellIds, [null, null, null]);
  assert.equal(validateRun(run), true);
  assert.doesNotThrow(() => hydrateDungeon(run));
  const bar = spellBarModel({ state: run.hero.spells, intelligence: run.hero.attributes.intelligence, language: 'ru' });
  assert.ok(bar.slots.every((slot) => slot.empty), 'the HUD column has nothing to show');
});

test('the bare preset is the default while the wanderer kit only serves old saves', () => {
  assert.equal(DEFAULT_BUILD_PRESET_ID, 'outcast');
  assert.equal(LEGACY_BUILD_PRESET_ID, 'wanderer');
  assert.deepEqual(BUILD_PRESETS.outcast.knownSpellIds, []);
  assert.equal(createStartingMagic().intelligence, 3);
  assert.deepEqual(createStartingMagic(LEGACY_BUILD_PRESET_ID).spells.knownSpellIds, ['ember-bolt', 'mending-light']);
});

/**
 * The gear and the supplies are two different things. The sword and the tunic
 * are deliberately worse than anything the dungeon holds, so they must never
 * be found in it. The potion and the fruit are ordinary — being able to find
 * more of them is the whole point of handing them over.
 */
test('starter gear is weaker than any drop and never appears as loot or stock', () => {
  const sword = lootById('rusty-sword');
  const tunic = lootById('worn-tunic');
  const dagger = lootById('short-blade');
  assert.equal(sword.weaponFamily, 'sword');
  assert.ok(sword.stats.attack < dagger.stats.attack);
  assert.ok(sword.combat.damageScale < dagger.combat.damageScale);
  assert.ok(sword.combat.cooldown > dagger.combat.cooldown);
  assert.equal(tunic.slot, 'body');
  assert.ok(tunic.stats.defense < lootById('heavy-leather').stats.defense);
  for (const item of [sword, tunic]) {
    assert.equal(item.randomDrop, false);
    assert.equal(item.merchantStock, false);
    assert.equal(lootEligibleForFloor(item, floorScaling(9)), false);
  }
  for (let seed = 1; seed <= 200; seed += 1) {
    const depth = 1 + (seed % 9);
    const dungeon = generateDungeon({ seed, depth });
    assert.ok(dungeon.loot.every(({ id }) => !STARTER_GEAR_IDS.includes(id)), `seed ${seed} floor loot`);
    if (depth % 3 === 0) {
      for (const variantId of ['armourer', 'relic-dealer', 'provisioner']) {
        const stock = createMerchantStock({ seed, depth, roomIndex: 1, variantId });
        assert.ok(stock.every(({ itemId, id }) => !STARTER_GEAR_IDS.includes(itemId ?? id)), `seed ${seed} ${variantId}`);
      }
    }
  }
});

test('the former starting spells are ordinary unknown books with enough authored looks', () => {
  const embers = lootById('book-of-embers');
  const mending = lootById('book-of-mending');
  assert.deepEqual(embers.bookEffect, { type: 'learn-spell', spellId: 'ember-bolt' });
  assert.deepEqual(mending.bookEffect, { type: 'learn-spell', spellId: 'mending-light' });
  assert.equal(embers.identification.tier, 1);
  assert.equal(mending.identification.tier, 1);
  assert.equal(lootEligibleForFloor(embers, floorScaling(1)), true);
  assert.equal(lootEligibleForFloor(mending, floorScaling(1)), true);
  const bookIds = LOOT_CATALOG.filter((item) => item.identification?.group === 'book').map(({ id }) => id);
  assert.ok(bookIds.length <= BOOK_APPEARANCES.length, 'every book type needs its own look');
  assert.equal(new Set(BOOK_APPEARANCES.map(({ icon }) => icon)).size, BOOK_APPEARANCES.length);
  for (let seed = 1; seed <= 50; seed += 1) {
    const looks = bookIds.map((id) => itemAppearanceFor(seed, 'book', id, bookIds).id);
    assert.equal(new Set(looks).size, bookIds.length, `seed ${seed} keeps looks one-to-one`);
  }
  // This used to be a rate, and a rate is a promise that decays: every batch of
  // new content thinned the early pool and starved the books a little further,
  // three times over. Now the placement is a promise, so the check is one too.
  for (let seed = 1; seed <= 400; seed += 1) {
    const placement = guaranteedSpellBookPlacement(seed);
    assert.ok(placement.depth >= 1 && placement.depth <= BASIC_SPELL_BOOK_MAX_DEPTH);
    assert.ok(BASIC_SPELL_BOOK_IDS.includes(placement.bookId));
    const dungeon = generateDungeon({ seed, depth: placement.depth });
    assert.ok(
      dungeon.loot.some(({ id }) => id === placement.bookId),
      `seed ${seed}: the promised ${placement.bookId} is not on floor ${placement.depth}`,
    );
    // And the floor's first drop is still the piece of gear a bare hero needs.
    assert.ok(lootById(dungeon.loot[0].id).slot, `seed ${seed}: the first drop stopped being gear`);
  }
  // Every run meets both books eventually; neither is written and never placed.
  const placed = new Set();
  for (let seed = 1; seed <= 400; seed += 1) placed.add(guaranteedSpellBookPlacement(seed).bookId);
  assert.deepEqual([...placed].sort(), [...BASIC_SPELL_BOOK_IDS].sort());
  assert.throws(() => guaranteedSpellBookPlacement(-1), /run seed/);
});

test('worn clothes draw a shirt over trousers on the hero and every layer ships locally', async () => {
  const tunic = lootById('worn-tunic');
  const visual = equipmentVisualForItem(tunic);
  assert.equal(visual.layer, 'player/body/shirt_white1.png');
  assert.equal(visual.legsLayer, 'player/legs/pants_brown.png');
  const layers = composePlayerLayers({ bodyVisual: visual, bootsVisual: { layer: 'boots' } });
  assert.ok(layers.indexOf(visual.legsLayer) < layers.indexOf('boots'));
  assert.ok(layers.indexOf('boots') < layers.indexOf(visual.layer));
  assert.ok(allEquipmentVisualAssetPaths().includes(visual.legsLayer));
  assert.deepEqual(equipmentVisualProblems(LOOT_CATALOG), []);
  const sword = equipmentVisualForItem(lootById('rusty-sword'));
  assert.equal(sword.layer, 'player/hand1/short_sword_slant3.png');
  await Promise.all([
    visual.layer, visual.legsLayer, visual.icon, sword.layer, sword.offhandLayer, sword.icon,
  ].map((path) => access(assetUrl(path))));
});

test('the new items read naturally in both languages', () => {
  assert.equal(itemDetails(lootById('rusty-sword'), 'ru').name, 'Ржавый меч');
  assert.equal(itemDetails(lootById('rusty-sword'), 'en').name, 'Rusty sword');
  assert.equal(itemDetails(lootById('worn-tunic'), 'ru').name, 'Поношенная рубаха');
  assert.equal(itemDetails(lootById('worn-tunic'), 'en').name, 'Worn tunic');
  assert.equal(itemDetails(lootById('book-of-embers'), 'ru').name, 'Книга углей');
  assert.equal(itemDetails(lootById('book-of-mending'), 'en').name, 'Book of Mending');
});

test('the starting supplies are ordinary things the dungeon also gives out', () => {
  for (const id of STARTER_SUPPLY_IDS) {
    const item = lootById(id);
    assert.ok(item, `${id} is not in the catalogue`);
    assert.equal(item.slot, null, `${id} is worn, not carried`);
    assert.notEqual(item.randomDrop, false, `${id} can never be found again`);
  }
  // One potion and one meal: enough to survive a mistake, not enough to stop
  // the hero looking for more. «Но не слишком, чтобы не сломать сложность.»
  const run = createRun(1);
  assert.equal(run.inventory.length, 2);
  const supplies = run.items.filter(({ id }) => STARTER_SUPPLY_IDS.includes(id));
  assert.equal(supplies.reduce((total, { stack }) => total + (stack ?? 1), 0), 3);
});
