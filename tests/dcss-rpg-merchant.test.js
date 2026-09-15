import assert from 'node:assert/strict';
import test from 'node:test';

import { lootById } from '../tools/dcss-rpg-content.js';
import { materializeItemAffixes } from '../tools/dcss-rpg-affixes.js';
import {
  MERCHANT_STOCK_MAX,
  MERCHANT_STOCK_MIN,
  buyMerchantItem,
  createMerchantStock,
  merchantBuyPrice,
  merchantSellPrice,
  sellMerchantItem,
  validateMerchantPurchaseIds,
} from '../tools/dcss-rpg-merchant.js';

test('merchant stock is seeded, bounded and offers distinct valid items', () => {
  for (const variantId of ['armourer', 'relic-dealer', 'provisioner']) {
    const input = { seed: 417, depth: 2, roomIndex: 4, variantId };
    const stock = createMerchantStock(input);
    assert.deepEqual(createMerchantStock(input), stock);
    assert.ok(stock.length >= MERCHANT_STOCK_MIN && stock.length <= MERCHANT_STOCK_MAX);
    assert.equal(new Set(stock.map(({ record }) => record.id)).size, stock.length);
    assert.equal(new Set(stock.map(({ entryId }) => entryId)).size, stock.length);
    for (const entry of stock) {
      assert.ok(lootById(entry.record.id));
      assert.ok(Number.isInteger(entry.price) && entry.price > 0);
      assert.equal(entry.record.artifactPowerId ?? null, null);
    }
  }
});

test('unknown potion identity cannot be inferred from merchant price', () => {
  const ids = ['healing-potion', 'mystery-potion', 'mending-potion', 'cleansing-potion', 'venom-potion'];
  assert.equal(new Set(ids.map((id) => merchantBuyPrice(lootById(id)))).size, 1);
});

test('purchase and sale are atomic and cannot create a trade loop', () => {
  const merchant = {
    stock: createMerchantStock({ seed: 90, depth: 2, roomIndex: 3, variantId: 'armourer' }),
  };
  const entry = merchant.stock[0];
  const bought = buyMerchantItem({
    merchant,
    entryId: entry.entryId,
    purchasedIds: [],
    gold: 100,
    items: [],
    inventory: [],
  });
  assert.equal(bought.ok, true);
  assert.equal(bought.state.gold, 100 - entry.price);
  assert.deepEqual(bought.state.inventory, [entry.record.uid]);
  assert.deepEqual(bought.state.purchasedIds, [entry.entryId]);
  assert.equal(buyMerchantItem({
    merchant,
    entryId: entry.entryId,
    purchasedIds: bought.state.purchasedIds,
    gold: bought.state.gold,
    items: bought.state.items,
    inventory: bought.state.inventory,
  }).reason, 'sold');

  const item = materializeItemAffixes(lootById(entry.record.id), entry.record);
  const sold = sellMerchantItem({
    uid: entry.record.uid,
    gold: bought.state.gold,
    items: bought.state.items,
    inventory: bought.state.inventory,
  });
  assert.equal(sold.ok, true);
  assert.ok(merchantSellPrice(item) < entry.price);
  assert.ok(sold.state.gold < 100);
  assert.deepEqual(sold.state.items, []);
  assert.deepEqual(sold.state.inventory, []);
});

test('purchase ids are checked against the generated merchant', () => {
  const stock = createMerchantStock({ seed: 3, depth: 2, roomIndex: 7, variantId: 'provisioner' });
  const merchants = [{ stock }];
  assert.equal(validateMerchantPurchaseIds([stock[0].entryId], merchants, 2), true);
  assert.equal(validateMerchantPurchaseIds(['merchant-entry-2-7-99'], merchants, 2), false);
  assert.equal(validateMerchantPurchaseIds([stock[0].entryId, stock[0].entryId], merchants, 2), false);
});
