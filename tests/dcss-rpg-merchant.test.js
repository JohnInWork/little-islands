import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { lootById } from '../tools/dcss-rpg-content.js';
import { materializeItemAffixes } from '../tools/dcss-rpg-affixes.js';
import {
  MERCHANT_COMMANDS,
  MERCHANT_STOCK_MAX,
  MERCHANT_STOCK_MIN,
  buybackMerchantItem,
  buyMerchantItem,
  createMerchantStates,
  createMerchantStock,
  merchantBuybackPrice,
  merchantBuyPrice,
  merchantPresentation,
  merchantSellPrice,
  sellMerchantItem,
  validateMerchantStates,
  validateMerchantPurchaseIds,
} from '../tools/dcss-rpg-merchant.js';
import { createGameCommand } from '../tools/dcss-rpg-game-commands.js';

const command = (sequence, type, merchantId, payload = {}) => createGameCommand({
  streamId: 'test:merchant',
  sequence,
  type,
  targetId: merchantId,
  payload,
});

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

test('unknown book identity cannot be inferred from merchant price', () => {
  const ids = ['practice-manual', 'tome-of-amnesia', 'blank-codex'];
  assert.equal(new Set(ids.map((id) => merchantBuyPrice(lootById(id)))).size, 1);
});

test('merchant trade controls have complete RU and EN copy', () => {
  assert.equal(merchantPresentation('armourer', 'ru').trade, 'Торговля');
  assert.equal(merchantPresentation('armourer', 'en').trade, 'Trade');
  assert.equal(merchantPresentation('relic-dealer', 'en').buyback, 'Buyback');
});

test('purchase and sale are atomic and cannot create a trade loop', () => {
  const merchant = {
    instanceId: 'merchant-2-3',
    variantId: 'armourer',
    stock: createMerchantStock({ seed: 90, depth: 2, roomIndex: 3, variantId: 'armourer' }),
  };
  const initialMerchantState = createMerchantStates({ merchants: [merchant], depth: 2 })[0];
  const entry = merchant.stock[0];
  const bought = buyMerchantItem({
    command: command(1, MERCHANT_COMMANDS.buy, merchant.instanceId, { entryId: entry.entryId }),
    merchant,
    merchantState: initialMerchantState,
    entryId: entry.entryId,
    gold: 100,
    items: [],
    inventory: [],
  });
  assert.equal(bought.ok, true);
  assert.equal(bought.state.gold, 100 - entry.price);
  assert.deepEqual(bought.state.inventory, [entry.record.uid]);
  assert.deepEqual(bought.state.merchantState.purchasedEntryIds, [entry.entryId]);
  assert.equal(bought.events[0].type, 'merchant-item-bought');
  assert.equal(buyMerchantItem({
    command: command(2, MERCHANT_COMMANDS.buy, merchant.instanceId, { entryId: entry.entryId }),
    merchant,
    merchantState: bought.state.merchantState,
    entryId: entry.entryId,
    gold: bought.state.gold,
    items: bought.state.items,
    inventory: bought.state.inventory,
  }).reason, 'sold');

  const item = materializeItemAffixes(lootById(entry.record.id), entry.record);
  const sold = sellMerchantItem({
    command: command(3, MERCHANT_COMMANDS.sell, merchant.instanceId, { uid: entry.record.uid }),
    merchant,
    merchantState: bought.state.merchantState,
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
  assert.equal(sold.state.merchantState.buyback[0].record.uid, entry.record.uid);
  assert.equal(sold.state.merchantState.buyback[0].price, merchantBuybackPrice(item));
  assert.equal(sold.events[0].type, 'merchant-item-sold');

  const boughtBack = buybackMerchantItem({
    command: command(4, MERCHANT_COMMANDS.buyback, merchant.instanceId, { uid: entry.record.uid }),
    merchant,
    merchantState: sold.state.merchantState,
    uid: entry.record.uid,
    gold: sold.state.gold,
    items: sold.state.items,
    inventory: sold.state.inventory,
  });
  assert.equal(boughtBack.ok, true);
  assert.ok(boughtBack.state.gold < sold.state.gold);
  assert.deepEqual(boughtBack.state.inventory, [entry.record.uid]);
  assert.deepEqual(boughtBack.state.merchantState.buyback, []);
  assert.equal(validateMerchantStates([boughtBack.state.merchantState], [merchant], 2), true);
});

test('purchase ids are checked against the generated merchant', () => {
  const stock = createMerchantStock({ seed: 3, depth: 2, roomIndex: 7, variantId: 'provisioner' });
  const merchants = [{ stock }];
  assert.equal(validateMerchantPurchaseIds([stock[0].entryId], merchants, 2), true);
  assert.equal(validateMerchantPurchaseIds(['merchant-entry-2-7-99'], merchants, 2), false);
  assert.equal(validateMerchantPurchaseIds([stock[0].entryId, stock[0].entryId], merchants, 2), false);
});

test('merchant purse and buyback capacity reject sales without partial mutation', () => {
  const merchant = {
    instanceId: 'merchant-3-4',
    variantId: 'provisioner',
    stock: createMerchantStock({ seed: 19, depth: 3, roomIndex: 4, variantId: 'provisioner' }),
  };
  const baseState = createMerchantStates({ merchants: [merchant], depth: 3 })[0];
  const items = [{ id: 'healing-potion', uid: 'player-potion', stack: 1 }];
  const poorState = { ...baseState, gold: 0, purchasedEntryIds: [], buyback: [] };
  const poor = sellMerchantItem({
    command: command(1, MERCHANT_COMMANDS.sell, merchant.instanceId, { uid: 'player-potion' }),
    merchant,
    merchantState: poorState,
    uid: 'player-potion',
    gold: 4,
    items,
    inventory: ['player-potion'],
  });
  assert.equal(poor.ok, false);
  assert.equal(poor.reason, 'merchant-poor');
  assert.deepEqual(poorState.buyback, []);

  const fullState = {
    ...baseState,
    purchasedEntryIds: [],
    buyback: Array.from({ length: 8 }, (_, index) => ({
      record: { id: 'bread', uid: `sold-bread-${index}`, stack: 1 },
      price: 2,
    })),
  };
  assert.equal(validateMerchantStates([fullState], [merchant], 3), true);
  const full = sellMerchantItem({
    command: command(2, MERCHANT_COMMANDS.sell, merchant.instanceId, { uid: 'player-potion' }),
    merchant,
    merchantState: fullState,
    uid: 'player-potion',
    gold: 4,
    items,
    inventory: ['player-potion'],
  });
  assert.equal(full.ok, false);
  assert.equal(full.reason, 'merchant-full');
  assert.equal(fullState.buyback.length, 8);
});

/**
 * A tap used to be the purchase. Ivan touched a yellow potion to find out what
 * it was and found he had bought it: the shop spent his money to answer a
 * question. Now a tap picks the thing up off the shelf and the card underneath
 * says what it is; the money moves when he says so.
 */
test('the shop shows the thing before it takes the money', async () => {
  const [html, runtime, styles] = await Promise.all([
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /id="merchant-shop-detail"/);
  assert.match(html, /id="merchant-shop-confirm"/);
  assert.match(html, /id="merchant-shop-cancel"/);
  assert.match(styles, /\.merchant-shop-detail\s*\{/);

  // Every row selects; none of them transacts on its own any more.
  for (const call of ['transactMerchantPurchase', 'transactMerchantBuyback', 'transactMerchantSale']) {
    const direct = new RegExp(`onActivate: \\(\\) => ${call}\\(`);
    assert.doesNotMatch(runtime, direct, `${call} still fires straight from the list`);
    assert.match(runtime, new RegExp(`act: \\(\\) => ${call}\\(`), `${call} is not reachable at all`);
  }
  assert.match(runtime, /merchantShopConfirm\.addEventListener\('click', confirmMerchantSelection\)/);
  assert.match(runtime, /merchantShopCancel\.addEventListener\('click', clearMerchantSelection\)/);
  // Rebuilding the list drops a selection that no longer belongs to it.
  assert.match(runtime, /merchantShopList\.replaceChildren\(\);\s*\n\s*\/\/[^\n]*\n\s*clearMerchantSelection\(\);/);
  // And the card names the price on its own button, so the stake is never hidden.
  assert.match(runtime, /merchantShopConfirm\.textContent = `\$\{selection\.verb\} · \$\{selection\.price\}●`/);
});
