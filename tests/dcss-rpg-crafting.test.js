import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ESSENCE_ITEM_ID,
  SALVAGE_BONUS_PERCENT,
  craftingRefusalText,
  isMagicalPiece,
  salvageProfile,
  salvageYield,
} from '../tools/dcss-rpg-crafting.js';
import { eligibleItemAffixes } from '../tools/dcss-rpg-affixes.js';
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

/**
 * Зачарования в игре нет, и вешать аффикс рукой больше нельзя.
 *
 * Оно стоило 2–3 эссенции, а эссенцию даёт только второй ранг разбора: два
 * очка вперёд, прежде чем навык хоть что-то сделает. Иван: «зачарование
 * точно убираем». Сами аффиксы остались — их приносит добыча.
 */
test('зачарования нет: аффиксы приходят с добычей, а не с рук', async () => {
  const crafting = await import('../tools/dcss-rpg-crafting.js');
  for (const name of ['canEnchant', 'enchantItem', 'enchantProfile', 'ENCHANT_ESSENCE_COST']) {
    assert.equal(name in crafting, false, `${name}: зачарование всё ещё в модуле`);
  }
  const { skillById } = await import('../tools/dcss-rpg-skill-content.js');
  assert.equal(skillById('enchanting'), null, 'навык всё ещё в каталоге');
  // Аффиксы на месте: их вешает генератор добычи, и только он.
  assert.ok(eligibleItemAffixes(sword(), []).length > 0, 'аффиксы унесли вместе с зачарованием');
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  for (const needle of ['enchantSelectedItem', 'enchantDecision', 'enchantProfile']) {
    assert.equal(source.includes(needle), false, `${needle}: осталось в переходнике`);
  }
});

test('Salvaging is wired as a skill and performed by the runtime', async () => {
  for (const id of ['salvaging']) {
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
