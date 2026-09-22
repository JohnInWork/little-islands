import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  SALVAGE_BONUS_PERCENT,
  isMagicalPiece,
  salvageProfile,
  salvageYield,
} from '../tools/dcss-rpg-crafting.js';
import { eligibleItemAffixes } from '../tools/dcss-rpg-affixes.js';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { SKILL_CAPABILITY_LIMITS, SKILL_IMPLEMENTATIONS, SKILL_SYSTEMS } from '../tools/dcss-rpg-skills.js';
import { skillById } from '../tools/dcss-rpg-skill-content.js';

const sword = () => lootById('iron-sword') ?? LOOT_CATALOG.find(({ slot }) => slot === 'hand1');

test('разбор платит больше за тот же лом, и это всё, что он делает', () => {
  const plain = salvageYield({ reward: 20, profile: salvageProfile({}) });
  assert.deepEqual(plain, { gold: 20, bonus: 0 }, 'без навыка ничего не меняется');

  for (const rank of [1, 2, 3]) {
    const yielded = salvageYield({ reward: 20, profile: salvageProfile({ salvagingRank: rank }) });
    assert.equal(yielded.gold, 20 + (20 * SALVAGE_BONUS_PERCENT[rank]) / 100, `ранг ${rank}`);
    assert.equal(yielded.bonus, yielded.gold - 20);
  }
  assert.equal(salvageYield({ reward: 20, profile: salvageProfile({ salvagingRank: 3 }) }).gold, 40);
});

/**
 * Эссенции в игре нет, и разбору больше нечего из лома доставать.
 *
 * Она кормила зачарование, алхимию и обе кузни — все трое ушли, каждый по
 * своей причине, и тратить её стало некому. Иван: «раз нам ни для чего они не
 * нужны, давай пока их просто уберём». Вместе с ней ушёл и порог: раньше
 * эссенцию давал только второй ранг разбора, то есть два очка вперёд ради
 * того, чтобы навык вообще заработал.
 */
test('эссенции нет: ни предмета, ни ресурса, ни второго ранга ради неё', async () => {
  assert.equal(lootById('arcane-essence'), null, 'предмет всё ещё в каталоге');
  const crafting = await import('../tools/dcss-rpg-crafting.js');
  for (const name of ['ESSENCE_ITEM_ID', 'SALVAGE_ESSENCE_PER_PIECE']) {
    assert.equal(name in crafting, false, `${name}: осталось в модуле`);
  }
  for (const item of LOOT_CATALOG) {
    assert.notEqual(item.interactionResource, 'essence', `${item.id} всё ещё просит эссенцию`);
  }
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  for (const needle of ['grantEssence', 'ESSENCE_ITEM_ID', 'reforge', 'smithing']) {
    assert.equal(source.includes(needle), false, `${needle}: осталось в переходнике`);
  }
  // Аффиксы никуда не делись: их приносит добыча, и она одна.
  assert.ok(eligibleItemAffixes(sword(), []).length > 0);
  // Магическую вещь всё ещё можно отличить — по ней считается цена лома.
  assert.equal(isMagicalPiece({ slot: 'hand1', affixIds: ['sharp'] }), true);
  assert.equal(isMagicalPiece({ slot: null, affixIds: ['sharp'] }), false, 'инструмент — не снаряжение');
  assert.equal(isMagicalPiece({ slot: 'body', affixIds: [] }), false);
});

/** Кузнечного дела нет: перековку убрали вместе с ресурсом, на котором она жила. */
test('перековки нет ни в навыках, ни в сохранении, ни в карточке предмета', async () => {
  await assert.rejects(() => import('../tools/dcss-rpg-smithing.js'), 'модуль кузни всё ещё на месте');
  for (const id of ['weaponsmithing', 'armorsmithing']) {
    assert.equal(skillById(id), null, `${id}: навык всё ещё в каталоге`);
    assert.equal(SKILL_IMPLEMENTATIONS[id], undefined, `${id}: реализация на месте`);
  }
  for (const system of ['weapon-reforging', 'armor-reforging']) {
    assert.equal(SKILL_SYSTEMS.includes(system), false, `${system}: система всё ещё объявлена`);
  }
  const html = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  assert.equal(html.includes('item-detail-craft'), false, 'кнопка перековки осталась в разметке');
});

test('разбор подключён как навык и выполняется переходником', async () => {
  assert.ok(SKILL_IMPLEMENTATIONS.salvaging);
  for (const system of skillById('salvaging').requiresSystems) {
    assert.ok(SKILL_SYSTEMS.includes(system), `${system} is connected`);
  }
  for (const rank of SKILL_IMPLEMENTATIONS.salvaging.capabilitiesByRank) {
    for (const [key, value] of Object.entries(rank)) {
      assert.ok(SKILL_CAPABILITY_LIMITS[key], `${key} has a declared limit`);
      assert.ok(Number.isInteger(value), `${key} stays an integer`);
    }
  }
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  for (const needle of ["from './dcss-rpg-crafting.js'", 'salvageYield({', 'function secondaryItemAction(']) {
    assert.ok(source.includes(needle), needle);
  }
});
