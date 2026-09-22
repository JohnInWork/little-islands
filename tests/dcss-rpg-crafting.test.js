import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ENCHANT_ESSENCE_COST,
  ENCHANT_MAX_AFFIXES,
  ESSENCE_ITEM_ID,
  SALVAGE_BONUS_PERCENT,
  canEnchant,
  craftingRefusalText,
  isMagicalPiece,
  enchantItem,
  enchantProfile,
  salvageProfile,
  salvageYield,
} from '../tools/dcss-rpg-crafting.js';
import { MAX_RANDOM_AFFIXES, eligibleItemAffixes, validateItemAffixIds } from '../tools/dcss-rpg-affixes.js';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { SKILL_CAPABILITY_LIMITS, SKILL_IMPLEMENTATIONS, SKILL_SYSTEMS } from '../tools/dcss-rpg-skills.js';
import { skillById } from '../tools/dcss-rpg-skill-content.js';
import { itemDetails } from '../tools/dcss-rpg-item-details.js';
import { salvageInventoryItems } from '../tools/dcss-rpg-rules.js';

const sword = () => lootById('iron-sword') ?? LOOT_CATALOG.find(({ slot }) => slot === 'hand1');

test('salvaging pays better and takes the crystal out of the magic, not the metal', () => {
  const scrap = [
    { slot: 'hand1', affixIds: ['sharp'] },
    { slot: 'body', affixIds: [] },
    { slot: null, affixIds: ['sharp'] },
    { slot: 'hand2', affixIds: [], artifactPowerId: 'echo' },
  ];
  const plain = salvageYield({ reward: 20, items: scrap, profile: salvageProfile({}) });
  assert.deepEqual(plain, { gold: 20, essence: 0, bonus: 0 }, 'without the school nothing changes');

  const novice = salvageYield({ reward: 20, items: scrap, profile: salvageProfile({ salvagingRank: 1 }) });
  assert.equal(novice.gold, 20 + (20 * SALVAGE_BONUS_PERCENT[1]) / 100);
  assert.equal(novice.essence, 0, 'the first rank is only about the price');

  const adept = salvageYield({ reward: 20, items: scrap, profile: salvageProfile({ salvagingRank: 2 }) });
  assert.equal(adept.essence, 2, 'the affixed blade and the artifact, not the plain coat');
  const master = salvageYield({ reward: 20, items: scrap, profile: salvageProfile({ salvagingRank: 3 }) });
  assert.equal(master.gold, 40);
  assert.equal(master.essence, 4);
  assert.equal(isMagicalPiece({ slot: null, affixIds: ['sharp'] }), false, 'a tool is never gear');
  assert.equal(isMagicalPiece({ slot: 'body', affixIds: [] }), false);
});

test('the essence is a carried reagent the salvage rules can actually produce', () => {
  const essence = lootById(ESSENCE_ITEM_ID);
  assert.equal(essence.interactionResource, 'essence');
  assert.ok(essence.stack > 1);
  assert.equal(essence.slot, null);
  for (const language of ['ru', 'en']) {
    const details = itemDetails(essence, language);
    assert.ok(details.name.length > 0);
    assert.ok(details.effects.some(({ text }) => text.length > 0), `${language} says what it is for`);
  }
  // The gold side still comes from the shared rules, not from a second formula.
  const state = {
    items: [{ id: essence.id, uid: 'a', rarity: 2 }],
    inventory: ['a'],
    equipment: {},
  };
  assert.equal(salvageInventoryItems(state, ['a']).ok, true);
});

test('enchanting adds one legal affix, priced in essence and capped by rank', () => {
  const item = sword();
  const candidates = eligibleItemAffixes(item, []).map(({ id }) => id);
  assert.ok(candidates.length > 0, 'a plain weapon can take something');

  assert.equal(canEnchant({ item, candidates, essence: 9, profile: enchantProfile({}) }).reason, 'rank-required');
  const novice = enchantProfile({ enchantingRank: 1 });
  assert.equal(novice.maxAffixes, ENCHANT_MAX_AFFIXES[1]);
  assert.equal(novice.essenceCost, ENCHANT_ESSENCE_COST[1]);
  assert.equal(
    canEnchant({ item, candidates, essence: novice.essenceCost - 1, profile: novice }).reason,
    'no-essence',
  );
  assert.equal(craftingRefusalText('no-essence'), 'Не хватает эссенции');
  assert.equal(
    canEnchant({ item: lootById('bandage'), candidates, essence: 9, profile: novice }).reason,
    'not-equipment',
  );
  assert.equal(
    canEnchant({ item: { ...item, artifactPowerId: 'x' }, candidates, essence: 9, profile: novice }).reason,
    'artifact',
  );

  const first = enchantItem({ item, candidates, essence: 5, profile: novice, seed: 12345 });
  assert.equal(first.ok, true);
  assert.equal(first.essence, 5 - novice.essenceCost);
  assert.deepEqual(first.affixIds, [first.affixId]);
  assert.ok(candidates.includes(first.affixId));
  assert.equal(validateItemAffixIds(item, [...first.affixIds]), true, 'the save will accept the result');
  // The same piece in the same run always takes the same turn.
  assert.equal(enchantItem({ item, candidates, essence: 5, profile: novice, seed: 12345 }).affixId, first.affixId);

  // A novice cannot put a second one on; an adept can, and never a third.
  assert.equal(canEnchant({ item, affixIds: first.affixIds, candidates, essence: 9, profile: novice }).reason, 'no-room');
  const adept = enchantProfile({ enchantingRank: 2 });
  const second = enchantItem({
    item,
    affixIds: [...first.affixIds],
    candidates: eligibleItemAffixes(item, first.affixIds).map(({ id }) => id),
    essence: 9,
    profile: adept,
    seed: 999,
  });
  assert.equal(second.ok, true);
  assert.equal(second.affixIds.length, 2);
  assert.ok(second.affixIds.length <= MAX_RANDOM_AFFIXES, 'never past the catalogue cap');
  assert.equal(
    canEnchant({ item, affixIds: second.affixIds, candidates, essence: 9, profile: enchantProfile({ enchantingRank: 3 }) }).reason,
    'no-room',
  );
});

test('Salvaging and Enchanting are wired as skills and performed by the runtime', async () => {
  for (const id of ['salvaging', 'enchanting']) {
    assert.ok(SKILL_IMPLEMENTATIONS[id], id);
    for (const system of skillById(id).requiresSystems) {
      assert.ok(SKILL_SYSTEMS.includes(system), `${system} is connected`);
    }
    for (const rank of SKILL_IMPLEMENTATIONS[id].capabilitiesByRank) {
      for (const [key, value] of Object.entries(rank)) {
        assert.ok(SKILL_CAPABILITY_LIMITS[key], `${key} has a declared limit`);
        assert.ok(Number.isInteger(value), `${key} stays an integer`);
      }
    }
  }
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const uses = (needle) => assert.ok(source.includes(needle), needle);
  uses("from './dcss-rpg-crafting.js'");
  uses('function grantEssence(');
  uses('function enchantSelectedItem(');
  uses('function secondaryItemAction(');
  uses('salvageYield({');
  uses("consumeInteractionResources([{ id: ESSENCE_ITEM_ID, amount: result.cost }])");
});

/**
 * Алхимии в игре нет, и остаться от неё не должно ничего.
 *
 * Варили у костра из аркановой эссенции, а эссенцию давал только второй ранг
 * разбора — и то по одной за магическую вещь. До первого зелья врачевания
 * выходило три уровня, по очку за уровень, ради бутылки, которая в городе
 * стоит копейки: навык был не плохой, а недостижимый. Иван: «убираем
 * алхимию». Эссенция осталась, но теперь у неё одно дело — зачарование.
 */
test('алхимии нет: костёр только готовит, а эссенция идёт в зачарование', async () => {
  await assert.rejects(() => import('../tools/dcss-rpg-alchemy.js'), 'модуль алхимии всё ещё на месте');
  for (const id of ['mending-potion', 'cleansing-potion', 'venom-potion']) {
    assert.ok(lootById(id), `${id}: зелье из каталога убирать не просили`);
  }
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  for (const needle of ['brewAtCampfire', "action.id === 'brew'", 'alchemyProfile']) {
    assert.equal(source.includes(needle), false, `${needle}: варка осталась в переходнике`);
  }
  const { skillById } = await import('../tools/dcss-rpg-skill-content.js');
  assert.equal(skillById('alchemy'), null, 'навык всё ещё в списке');
});
