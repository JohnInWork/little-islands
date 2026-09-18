import { rollMaterial } from './dcss-rpg-materials.js';
import { LOOT_CATALOG, lootById } from './dcss-rpg-content.js';
import {
  materializeItemAffixes,
  rollItemAffixes,
  validateItemAffixIds,
} from './dcss-rpg-affixes.js';
import {
  materializeProceduralArtifact,
  validateProceduralArtifactState,
} from './dcss-rpg-artifacts.js';
import { effectiveLootDepth, itemPowerScore } from './dcss-rpg-scaling.js';
import {
  commandAccepted,
  commandRejected,
  gameEvent,
} from './dcss-rpg-game-commands.js';

export const MERCHANT_ACTOR_PATH = 'mon/human.png';
export const MERCHANT_ICON_PATH = 'dngn/shops/shop_gadgets.png';
export const MERCHANT_STOCK_MIN = 4;
export const MERCHANT_STOCK_MAX = 6;
export const MERCHANT_INVENTORY_LIMIT = 12;
export const MERCHANT_BUYBACK_LIMIT = 8;
export const MERCHANT_COMMANDS = Object.freeze({
  buy: 'merchant-buy',
  buyback: 'merchant-buyback',
  sell: 'merchant-sell',
});

// One public profile keeps economy tuning out of the UI and room generator.
export const MERCHANT_ECONOMY = Object.freeze({
  buyMultiplier: 1,
  sellMultiplier: 0.34,
  buybackMultiplier: 0.68,
  nextDepthPreview: 1,
  startingGold: 60,
  goldPerDepth: 18,
});

export const MERCHANT_VARIANTS = Object.freeze({
  armourer: Object.freeze({
    id: 'armourer',
    labels: Object.freeze({ ru: 'Бронник', en: 'Armourer' }),
    accepts: (item) => ['body', 'head', 'boots', 'cloak', 'gloves', 'belt', 'hand2'].includes(item.slot),
  }),
  'relic-dealer': Object.freeze({
    id: 'relic-dealer',
    labels: Object.freeze({ ru: 'Реликварий', en: 'Relic dealer' }),
    accepts: (item) => Boolean(item.slot) && (
      ['ring1', 'ring2', 'amulet'].includes(item.slot)
      || Boolean(item.weaponFamily)
      || item.slot === 'hand2'
    ),
  }),
  provisioner: Object.freeze({
    id: 'provisioner',
    labels: Object.freeze({ ru: 'Снабженец', en: 'Provisioner' }),
    accepts: (item) => !item.gold && (!item.slot || ['boots', 'cloak'].includes(item.slot)),
  }),
});

function stableHash(...parts) {
  let value = 0x811c9dc5;
  for (const character of parts.join('|')) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 0x01000193) >>> 0;
    value ^= value >>> 13;
  }
  return value >>> 0;
}

function cloneItemRecord(item) {
  const definition = lootById(item?.id);
  return {
    id: item.id,
    uid: item.uid,
    ...(item.stack ? { stack: item.stack } : {}),
    ...(item.affixIds ? { affixIds: [...item.affixIds] } : {}),
    ...(item.artifactPowerId
      ? {
          artifactPowerId: item.artifactPowerId,
          artifactCurseId: item.artifactCurseId ?? null,
        }
      : definition?.slot
        ? { artifactPowerId: null, artifactCurseId: null }
        : {}),
  };
}

function validItemRecord(item) {
  const definition = lootById(item?.id);
  return Boolean(
    definition
    && typeof item.uid === 'string'
    && item.uid.length >= 1
    && item.uid.length <= 80
    && validateItemAffixIds(definition, item.affixIds, { required: Boolean(definition.slot) })
    && validateProceduralArtifactState(definition, item)
    && (item.stack === undefined || (
      Number.isInteger(item.stack)
      && item.stack >= 1
      && item.stack <= 999
    )),
  );
}

function materializeRecord(record) {
  const definition = lootById(record?.id);
  if (!definition) return null;
  return materializeProceduralArtifact(
    materializeItemAffixes(definition, record),
    record,
  );
}

function stableOrder(seed, depth, roomIndex, salt, item) {
  return stableHash('merchant-v1', seed, depth, roomIndex, salt, item.id);
}

function baseItemPrice(item) {
  if (!item) return 1;
  if (Number.isFinite(item.value) && item.value > 0) return Math.ceil(item.value);
  // Unknown appearances must keep every effect inside a family at one price.
  // A merchant may hint at the family, never at the hidden identity.
  if (item.id?.endsWith('-potion')) return 6;
  if (item.identification?.group === 'scroll') return 8;
  if (item.identification?.group === 'wand') return 12;
  if (item.identification?.group === 'book') return 10;
  if (!item.slot) return Math.max(2, 3 + Math.ceil(effectiveLootDepth(item) * 1.5));
  return Math.max(
    4,
    3 + effectiveLootDepth(item) * 2 + (item.rarity ?? 0) * 3 + Math.ceil(itemPowerScore(item) * 0.7),
  );
}

export function merchantBuyPrice(item, economy = MERCHANT_ECONOMY) {
  return Math.max(1, Math.ceil(baseItemPrice(item) * economy.buyMultiplier));
}

export function merchantSellPrice(item, economy = MERCHANT_ECONOMY) {
  return Math.max(1, Math.floor(baseItemPrice(item) * economy.sellMultiplier))
    * Math.max(1, item?.stack ?? 1);
}

export function merchantBuybackPrice(item, economy = MERCHANT_ECONOMY) {
  const stack = Math.max(1, item?.stack ?? 1);
  return Math.max(
    merchantSellPrice(item, economy) + 1,
    Math.ceil(baseItemPrice(item) * economy.buybackMultiplier) * stack,
  );
}

export function merchantStartingGold(merchant, depth, economy = MERCHANT_ECONOMY) {
  // The surface is depth zero and still trades: a town trader is simply the
  // poorest one, because the purse grows with the floor below.
  if (!merchant || !Number.isInteger(depth) || depth < 0) {
    throw new TypeError('Merchant purse requires a merchant and a floor depth');
  }
  return economy.startingGold
    + depth * economy.goldPerDepth
    + stableHash('merchant-purse-v1', merchant.instanceId, merchant.variantId) % 17;
}

function merchantItemRecord({ seed, depth, roomIndex, item, index }) {
  const uid = `merchant-${depth}-${roomIndex}-${index}`;
  const materialId = rollMaterial({ seed, depth, instanceId: uid, item });
  return Object.freeze({
    id: item.id,
    uid,
    ...(item.slot
      ? {
          affixIds: [...rollItemAffixes({ seed, depth, instanceId: uid, item })],
          // A trader stocks made things too, so the shelf is never two of the same.
          ...(materialId ? { materialId } : {}),
          artifactPowerId: null,
          artifactCurseId: null,
        }
      : { stack: 1 }),
  });
}

export function createMerchantStock({ seed, depth, roomIndex, variantId } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(depth) || depth < 0) {
    throw new TypeError('Merchant stock requires a seed and a floor depth');
  }
  if (!Number.isInteger(roomIndex) || roomIndex < 0 || !MERCHANT_VARIANTS[variantId]) {
    throw new TypeError('Merchant stock requires a room and known variant');
  }
  const maximumDepth = depth + MERCHANT_ECONOMY.nextDepthPreview;
  const eligible = LOOT_CATALOG.filter((item) => (
    !item.gold
    && item.id !== 'coin-cache'
    && item.merchantStock !== false
    && effectiveLootDepth(item) <= maximumDepth
  ));
  const preferred = eligible.filter(MERCHANT_VARIANTS[variantId].accepts);
  const ordered = [...preferred].sort((a, b) => (
    stableOrder(seed, depth, roomIndex, variantId, a)
    - stableOrder(seed, depth, roomIndex, variantId, b)
  ));
  const selected = [];
  const seen = new Set();
  for (const item of [...ordered, ...eligible.sort((a, b) => (
    stableOrder(seed, depth, roomIndex, 'fallback', a)
    - stableOrder(seed, depth, roomIndex, 'fallback', b)
  ))]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    selected.push(item);
    if (selected.length >= MERCHANT_STOCK_MAX) break;
  }
  if (selected.length < MERCHANT_STOCK_MIN) throw new Error('Merchant stock pool is too small');
  return Object.freeze(selected.map((item, index) => {
    const record = merchantItemRecord({ seed, depth, roomIndex, item, index });
    const materialized = materializeItemAffixes(item, record);
    return Object.freeze({
      entryId: `merchant-entry-${depth}-${roomIndex}-${index}`,
      record,
      price: merchantBuyPrice(materialized),
    });
  }));
}

export function merchantPresentation(variantId, language = 'ru') {
  const variant = MERCHANT_VARIANTS[variantId];
  if (!variant) throw new TypeError('Unknown merchant variant');
  const locale = language === 'en' ? 'en' : 'ru';
  return Object.freeze({
    name: variant.labels[locale],
    trade: locale === 'ru' ? 'Торговля' : 'Trade',
    buy: locale === 'ru' ? 'Купить' : 'Buy',
    sell: locale === 'ru' ? 'Продать' : 'Sell',
    empty: locale === 'ru' ? 'Нечего продавать' : 'Nothing to sell',
    sold: locale === 'ru' ? 'Продано' : 'Sold',
    buyback: locale === 'ru' ? 'Обратный выкуп' : 'Buyback',
    full: locale === 'ru' ? 'Рюкзак заполнен' : 'Backpack is full',
    poor: locale === 'ru' ? 'Недостаточно золота' : 'Not enough gold',
    merchantPoor: locale === 'ru' ? 'У торговца недостаточно золота' : 'Merchant has insufficient gold',
    merchantFull: locale === 'ru' ? 'Торговец больше не принимает вещи' : 'Merchant cannot hold more items',
    playerGold: locale === 'ru' ? 'Твоё золото' : 'Your gold',
    merchantGold: locale === 'ru' ? 'Золото торговца' : 'Merchant gold',
    purchased: locale === 'ru' ? 'Куплено' : 'Purchased',
    close: locale === 'ru' ? 'Закрыть торговлю' : 'Close trade',
  });
}

export function createMerchantStates({ merchants, depth, purchasedIds = [] } = {}) {
  if (!Array.isArray(merchants) || !Number.isInteger(depth) || depth < 0 || !Array.isArray(purchasedIds)) {
    throw new TypeError('Merchant states require generated merchants and a floor depth');
  }
  return Object.freeze(merchants.map((merchant) => {
    const purchases = merchant.stock
      .filter(({ entryId }) => purchasedIds.includes(entryId))
      .map(({ entryId }) => entryId);
    const purchaseValue = merchant.stock
      .filter(({ entryId }) => purchases.includes(entryId))
      .reduce((sum, { price }) => sum + price, 0);
    return Object.freeze({
      merchantId: merchant.instanceId,
      gold: merchantStartingGold(merchant, depth) + purchaseValue,
      purchasedEntryIds: Object.freeze(purchases),
      buyback: Object.freeze([]),
    });
  }));
}

/** A dungeon floor holds one trader; the city holds a street of them. */
export const MAX_MERCHANTS_PER_FLOOR = 4;

export function validateMerchantStateShape(states, depth) {
  if (
    !Array.isArray(states)
    || !Number.isInteger(depth)
    // The town trades on the surface, which is depth zero.
    || depth < 0
    || states.length > MAX_MERCHANTS_PER_FLOOR
  ) return false;
  const merchantIds = states.map(({ merchantId } = {}) => merchantId);
  if (new Set(merchantIds).size !== merchantIds.length) return false;
  const storedUids = [];
  for (const state of states) {
    if (
      !state
      || !new RegExp(`^merchant-${depth}-\\d+$`).test(state.merchantId)
      || !Number.isSafeInteger(state.gold)
      || state.gold < 0
      || state.gold > 1_000_000_000
      || !Array.isArray(state.purchasedEntryIds)
      || state.purchasedEntryIds.length > MERCHANT_STOCK_MAX
      || new Set(state.purchasedEntryIds).size !== state.purchasedEntryIds.length
      || !Array.isArray(state.buyback)
      || state.buyback.length > MERCHANT_BUYBACK_LIMIT
    ) return false;
    if (state.purchasedEntryIds.some((entryId) => (
      typeof entryId !== 'string'
      || !new RegExp(`^merchant-entry-${depth}-\\d+-\\d+$`).test(entryId)
    ))) return false;
    for (const entry of state.buyback) {
      if (
        !entry
        || !validItemRecord(entry.record)
        || !Number.isSafeInteger(entry.price)
        || entry.price < 1
        || entry.price > 1_000_000_000
      ) return false;
      storedUids.push(entry.record.uid);
    }
  }
  return new Set(storedUids).size === storedUids.length;
}

export function validateMerchantStates(states, merchants, depth) {
  if (
    !validateMerchantStateShape(states, depth)
    || !Array.isArray(merchants)
    || states.length !== merchants.length
  ) return false;
  const merchantById = new Map(merchants.map((merchant) => [merchant.instanceId, merchant]));
  if (merchantById.size !== merchants.length) return false;
  for (const state of states) {
    const merchant = merchantById.get(state.merchantId);
    if (!merchant) return false;
    const stockById = new Map(merchant.stock.map((entry) => [entry.entryId, entry]));
    if (state.purchasedEntryIds.some((entryId) => !stockById.has(entryId))) return false;
    const stockByUid = new Map(merchant.stock.map((entry) => [entry.record.uid, entry]));
    for (const entry of state.buyback) {
      const stockEntry = stockByUid.get(entry.record.uid);
      if (stockEntry && !state.purchasedEntryIds.includes(stockEntry.entryId)) return false;
    }
  }
  return true;
}

export function merchantStateFor(states, merchantId) {
  return states?.find((state) => state.merchantId === merchantId) ?? null;
}

function validPlayerState(items, inventory) {
  return Array.isArray(items)
    && Array.isArray(inventory)
    && inventory.length <= MERCHANT_INVENTORY_LIMIT
    && new Set(items.map(({ uid } = {}) => uid)).size === items.length
    && new Set(inventory).size === inventory.length
    && inventory.every((uid) => items.some((item) => item.uid === uid));
}

function validMerchantCommand(command, merchant, merchantState, type) {
  const depth = Number(merchant?.instanceId?.split('-')[1]);
  return Boolean(
    command?.type === type
    && command.targetId === merchant?.instanceId
    && merchantState?.merchantId === merchant?.instanceId
    && validateMerchantStates([merchantState], [merchant], depth)
  );
}

function receiveItem({ record, items, inventory }) {
  const definition = lootById(record.id);
  const merge = !definition.slot
    ? items.find((item) => inventory.includes(item.uid) && item.id === record.id && !item.affixIds)
    : null;
  if (!merge && inventory.length >= MERCHANT_INVENTORY_LIMIT) return null;
  if (!merge && items.some((item) => item.uid === record.uid)) return null;
  return {
    items: merge
      ? items.map((item) => item.uid === merge.uid
        ? { ...item, stack: (item.stack ?? 1) + (record.stack ?? 1) }
        : { ...item })
      : [...items.map((item) => ({ ...item })), cloneItemRecord(record)],
    inventory: merge ? [...inventory] : [...inventory, record.uid],
    mergedInto: merge?.uid ?? null,
  };
}

export function buyMerchantItem({ command, merchant, merchantState, entryId, gold, items, inventory } = {}) {
  if (!validMerchantCommand(command, merchant, merchantState, MERCHANT_COMMANDS.buy)) {
    return commandRejected(command, 'invalid');
  }
  const entry = merchant?.stock?.find((candidate) => candidate.entryId === entryId);
  if (!entry) return commandRejected(command, 'unknown-item');
  if (merchantState.purchasedEntryIds.includes(entryId)) return commandRejected(command, 'sold');
  if (!validPlayerState(items, inventory) || !Number.isSafeInteger(gold) || gold < 0) {
    return commandRejected(command, 'invalid-state');
  }
  if (gold < entry.price) return commandRejected(command, 'poor');
  const received = receiveItem({ record: entry.record, items, inventory });
  if (!received) return commandRejected(command, inventory.length >= MERCHANT_INVENTORY_LIMIT ? 'full' : 'duplicate');
  return commandAccepted(command, {
    merchantState: {
      ...merchantState,
      gold: merchantState.gold + entry.price,
      purchasedEntryIds: [...merchantState.purchasedEntryIds, entryId],
      buyback: merchantState.buyback.map((candidate) => ({
        ...candidate,
        record: cloneItemRecord(candidate.record),
      })),
    },
    transactionAmount: entry.price,
    gold: gold - entry.price,
    items: received.items,
    inventory: received.inventory,
  }, [gameEvent(command, 0, 'merchant-item-bought', {
    entryId,
    uid: entry.record.uid,
    price: entry.price,
    mergedInto: received.mergedInto,
  })]);
}

export function sellMerchantItem({ command, merchant, merchantState, uid, gold, items, inventory } = {}) {
  if (!validMerchantCommand(command, merchant, merchantState, MERCHANT_COMMANDS.sell)) {
    return commandRejected(command, 'invalid');
  }
  if (!validPlayerState(items, inventory) || !Number.isSafeInteger(gold) || gold < 0) {
    return commandRejected(command, 'invalid-state');
  }
  const record = items?.find((item) => item.uid === uid);
  const item = materializeRecord(record);
  if (!record || !item || !inventory.includes(uid)) return commandRejected(command, 'unknown-item');
  const price = merchantSellPrice(item);
  if (merchantState.gold < price) return commandRejected(command, 'merchant-poor');
  if (merchantState.buyback.length >= MERCHANT_BUYBACK_LIMIT) {
    return commandRejected(command, 'merchant-full');
  }
  const buybackPrice = merchantBuybackPrice(item);
  return commandAccepted(command, {
    merchantState: {
      ...merchantState,
      gold: merchantState.gold - price,
      purchasedEntryIds: [...merchantState.purchasedEntryIds],
      buyback: [
        ...merchantState.buyback.map((entry) => ({ ...entry, record: cloneItemRecord(entry.record) })),
        { record: cloneItemRecord(record), price: buybackPrice },
      ],
    },
    transactionAmount: price,
    gold: gold + price,
    items: items.filter((candidate) => candidate.uid !== uid).map((candidate) => ({ ...candidate })),
    inventory: inventory.filter((candidate) => candidate !== uid),
  }, [gameEvent(command, 0, 'merchant-item-sold', { uid, price, buybackPrice })]);
}

export function buybackMerchantItem({ command, merchant, merchantState, uid, gold, items, inventory } = {}) {
  if (!validMerchantCommand(command, merchant, merchantState, MERCHANT_COMMANDS.buyback)) {
    return commandRejected(command, 'invalid');
  }
  if (!validPlayerState(items, inventory) || !Number.isSafeInteger(gold) || gold < 0) {
    return commandRejected(command, 'invalid-state');
  }
  const entry = merchantState.buyback.find(({ record }) => record.uid === uid);
  if (!entry) return commandRejected(command, 'unknown-item');
  if (gold < entry.price) return commandRejected(command, 'poor');
  const received = receiveItem({ record: entry.record, items, inventory });
  if (!received) return commandRejected(command, inventory.length >= MERCHANT_INVENTORY_LIMIT ? 'full' : 'duplicate');
  return commandAccepted(command, {
    merchantState: {
      ...merchantState,
      gold: merchantState.gold + entry.price,
      purchasedEntryIds: [...merchantState.purchasedEntryIds],
      buyback: merchantState.buyback
        .filter(({ record }) => record.uid !== uid)
        .map((candidate) => ({ ...candidate, record: cloneItemRecord(candidate.record) })),
    },
    transactionAmount: entry.price,
    gold: gold - entry.price,
    items: received.items,
    inventory: received.inventory,
  }, [gameEvent(command, 0, 'merchant-item-bought-back', {
    uid,
    price: entry.price,
    mergedInto: received.mergedInto,
  })]);
}

export function validateMerchantPurchaseIds(ids, merchants, depth) {
  if (!Array.isArray(ids) || ids.length > MERCHANT_STOCK_MAX || new Set(ids).size !== ids.length) {
    return false;
  }
  const known = new Set((merchants ?? []).flatMap(({ stock = [] }) => stock.map(({ entryId }) => entryId)));
  return ids.every((id) => (
    typeof id === 'string'
    && new RegExp(`^merchant-entry-${depth}-\\d+-\\d+$`).test(id)
    && known.has(id)
  ));
}
