import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OUTFITTER_GOODS,
  STASH_BASKET_LIMIT,
  STASH_GOOD_LIMIT,
  createStashState,
  parseStash,
  serializeStash,
  stashBasketSize,
  stashBuy,
  stashDeposit,
  STASH_PER_FLOOR,
  STASH_PER_KILL,
  stashEarned,
  stashModel,
  stashOutfit,
  stashPrice,
  stashReturn,
  validateStashState,
} from '../tools/dcss-rpg-stash.js';
import { createRun, generateDungeon, validateRun } from '../tools/dcss-rpg-core.js';
import { lootById } from '../tools/dcss-rpg-content.js';

const full = (gold = 500) => stashDeposit(createStashState(null), gold);

/**
 * A run is paid for being played.
 *
 * It used to be paid at the gate, out of the purse, and only if the hero
 * walked away on purpose — so every floor asked whether to keep going or to
 * cash in. Ivan cut that out: «никакой добычи, которую можно вынести — игрок
 * просто получает очки за то, что играет». Dying on the ninth floor is now
 * worth more than turning back on the second, and nobody has to decide when
 * to stop, because stopping buys nothing.
 */
test('a run is paid for the ground it covered, however it ended', () => {
  assert.equal(stashEarned({ depth: 0, kills: 0 }), 0, 'standing in the city earns nothing');
  assert.equal(stashEarned({ depth: 1, kills: 0 }), STASH_PER_FLOOR);
  assert.equal(stashEarned({ depth: 0, kills: 5 }), STASH_PER_KILL * 5);
  assert.equal(stashEarned({ depth: 9, kills: 22 }), 9 * STASH_PER_FLOOR + 22 * STASH_PER_KILL);

  // Two endings, one payment: how it ended is no longer part of the sum.
  const deep = { depth: 9, kills: 22 };
  assert.equal(stashEarned({ ...deep, status: 'dead' }), stashEarned({ ...deep, status: 'retired' }));
  assert.equal(stashEarned({ ...deep, status: 'victory' }), stashEarned(deep));
  // And the purse is no longer part of it either.
  assert.equal(stashEarned({ ...deep, gold: 900 }), stashEarned(deep));

  // Going deeper always pays more than staying shallow, whatever the fight.
  assert.ok(stashEarned({ depth: 9, kills: 0 }) > stashEarned({ depth: 2, kills: 3 }));

  assert.equal(stashEarned({ depth: -4, kills: -9 }), 0);
  assert.equal(stashEarned({ depth: 2.7, kills: 1 }), 2 * STASH_PER_FLOOR + STASH_PER_KILL);
  assert.equal(stashEarned(), 0);
});

test('the counter sells at the merchants’ own price, not one of its own', async () => {
  const { merchantBuyPrice } = await import('../tools/dcss-rpg-merchant.js');
  for (const { id } of OUTFITTER_GOODS) {
    const definition = lootById(id);
    assert.ok(definition, `${id} is not in the catalog`);
    assert.equal(stashPrice(id), merchantBuyPrice(definition), `${id} has a second price`);
    assert.ok(stashPrice(id) > 0);
  }
});

test('buying takes the money, and every refusal says which one it is', () => {
  let stash = full(20);
  const bought = stashBuy(stash, 'short-blade');
  assert.ok(bought.ok);
  assert.equal(bought.stash.gold, 20 - stashPrice('short-blade'));
  assert.equal(bought.stash.goods['short-blade'], 1);
  // The money is really gone: the same purchase twice costs twice.
  stash = bought.stash;
  assert.equal(stashBuy(stash, 'hunting-spear').reason, 'too-dear');
  assert.equal(stashBuy(stash, 'nothing-like-it').reason, 'not-sold');

  let many = full(5000);
  for (let index = 0; index < STASH_GOOD_LIMIT; index += 1) many = stashBuy(many, 'bandage').stash;
  assert.equal(stashBuy(many, 'bandage').reason, 'enough-of-those');

  let heavy = full(5000);
  const ids = OUTFITTER_GOODS.map(({ id }) => id);
  for (let index = 0; index < STASH_BASKET_LIMIT; index += 1) {
    heavy = stashBuy(heavy, ids[index % ids.length]).stash;
  }
  assert.equal(stashBasketSize(heavy), STASH_BASKET_LIMIT);
  assert.equal(stashBuy(heavy, 'bread').reason, 'hands-full');
});

test('changing your mind before the descent costs nothing', () => {
  const bought = stashBuy(full(100), 'iron-helm');
  const returned = stashReturn(bought.stash, 'iron-helm');
  assert.ok(returned.ok);
  assert.equal(returned.stash.gold, 100);
  assert.deepEqual(returned.stash.goods, {});
  assert.equal(stashReturn(returned.stash, 'iron-helm').reason, 'not-yours');
});

/**
 * What was bought is worn, not carried in a bag nobody opens — the point of
 * outfitting is arriving ready. What it displaces goes into the bag instead of
 * disappearing, because the rusty sword is still yours.
 */
test('the basket becomes a hero: worn where it fits, in the bag where it does not', () => {
  let stash = full(400);
  for (const id of ['short-blade', 'heavy-leather', 'oak-club', 'camp-kit', 'bandage', 'bandage']) {
    const result = stashBuy(stash, id);
    assert.ok(result.ok, `${id}: ${result.reason}`);
    stash = result.stash;
  }
  const outfit = stashOutfit(stash);
  // A kit is spent when it is handed over, so leaving the menu cannot copy it.
  assert.deepEqual(outfit.stash.goods, {});
  assert.equal(outfit.stash.gold, stash.gold);

  const run = createRun(7, generateDungeon({ seed: 7, depth: 1 }), outfit);
  assert.ok(validateRun(run), 'an outfitted run is still a valid run');
  const byUid = new Map(run.items.map((item) => [item.uid, item]));
  assert.equal(byUid.get(run.equipment.hand1)?.id, 'short-blade', 'the blade is in hand');
  assert.equal(byUid.get(run.equipment.body)?.id, 'heavy-leather', 'the jacket is worn');
  // The club wanted the same hand and lost; it is in the bag, not gone.
  const bagged = run.inventory.map((uid) => byUid.get(uid)?.id);
  assert.ok(bagged.includes('oak-club'));
  assert.ok(bagged.includes('camp-kit'));
  // And so is everything the outfit took off the hero.
  assert.ok(run.inventory.includes('starter-sword'), 'the rusty sword went to the bag');
  assert.ok(run.inventory.includes('starter-tunic'), 'the worn tunic went to the bag');
  // Two bandages are one stack of two, the way the dungeon drops them.
  const bandage = run.items.find((item) => item.id === 'bandage');
  assert.equal(bandage?.stack, 2);
});

test('a run with nothing bought is the run that was there before', () => {
  const dungeon = generateDungeon({ seed: 11, depth: 1 });
  const bare = createRun(11, dungeon);
  const empty = createRun(11, dungeon, stashOutfit(createStashState(null)));
  assert.deepEqual(empty.items, bare.items);
  assert.deepEqual(empty.equipment, bare.equipment);
  assert.deepEqual(empty.inventory, bare.inventory);
});

test('the stash survives a reload, and refuses to come back broken', () => {
  const stash = stashBuy(full(90), 'jackboots').stash;
  const restored = parseStash(serializeStash(stash));
  assert.ok(validateStashState(restored));
  assert.deepEqual(restored, createStashState(stash));
  // Nonsense on disk is an empty stash, never a crash and never free money.
  for (const raw of ['', 'not json', '{"gold":-4}', '{"gold":10,"goods":{"a-sword":99}}', null]) {
    const parsed = parseStash(raw);
    assert.ok(validateStashState(parsed));
    assert.deepEqual(parsed.goods, {});
  }
  assert.equal(parseStash('{"version":1,"gold":12,"goods":{}}').gold, 12);
});

test('the counter can draw itself without the screen deciding anything', () => {
  const model = stashModel(full(9), 'ru');
  assert.equal(model.gold, 9);
  assert.equal(model.basketLimit, STASH_BASKET_LIMIT);
  const goods = model.rows.flatMap((row) => row.goods);
  assert.equal(goods.length, OUTFITTER_GOODS.length, 'every good belongs to a row');
  for (const good of goods) {
    assert.ok(good.name && good.name !== good.id, `${good.id} has no readable name`);
    assert.ok(good.icon, `${good.id} has no icon`);
    assert.equal(good.affordable, good.price <= 9);
  }
  assert.notDeepEqual(stashModel(full(9), 'en').copy, stashModel(full(9), 'ru').copy);
});
