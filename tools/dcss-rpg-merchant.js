import { LOOT_CATALOG, lootById } from './dcss-rpg-content.js';
import { materializeItemAffixes, rollItemAffixes } from './dcss-rpg-affixes.js';
import { effectiveLootDepth, itemPowerScore } from './dcss-rpg-scaling.js';

export const MERCHANT_ACTOR_PATH = 'mon/human.png';
export const MERCHANT_ICON_PATH = 'dngn/shops/shop_gadgets.png';
export const MERCHANT_STOCK_MIN = 4;
export const MERCHANT_STOCK_MAX = 6;
export const MERCHANT_INVENTORY_LIMIT = 12;

// One public profile keeps economy tuning out of the UI and room generator.
export const MERCHANT_ECONOMY = Object.freeze({
  buyMultiplier: 1,
  sellMultiplier: 0.34,
  nextDepthPreview: 1,
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

function stableOrder(seed, depth, roomIndex, salt, item) {
  return stableHash('merchant-v1', seed, depth, roomIndex, salt, item.id);
}

function baseItemPrice(item) {
  if (!item) return 1;
  // Every unidentified potion must cost the same: prices cannot reveal its effect.
  if (item.id?.endsWith('-potion')) return 6;
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

function merchantItemRecord({ seed, depth, roomIndex, item, index }) {
  const uid = `merchant-${depth}-${roomIndex}-${index}`;
  return Object.freeze({
    id: item.id,
    uid,
    ...(item.slot
      ? {
          affixIds: [...rollItemAffixes({ seed, depth, instanceId: uid, item })],
          artifactPowerId: null,
          artifactCurseId: null,
        }
      : { stack: 1 }),
  });
}

export function createMerchantStock({ seed, depth, roomIndex, variantId } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Merchant stock requires a seed and positive depth');
  }
  if (!Number.isInteger(roomIndex) || roomIndex < 0 || !MERCHANT_VARIANTS[variantId]) {
    throw new TypeError('Merchant stock requires a room and known variant');
  }
  const maximumDepth = depth + MERCHANT_ECONOMY.nextDepthPreview;
  const eligible = LOOT_CATALOG.filter((item) => (
    !item.gold
    && item.id !== 'coin-cache'
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
    buy: locale === 'ru' ? 'Купить' : 'Buy',
    sell: locale === 'ru' ? 'Продать' : 'Sell',
    empty: locale === 'ru' ? 'Нечего продавать' : 'Nothing to sell',
    sold: locale === 'ru' ? 'Продано' : 'Sold',
    full: locale === 'ru' ? 'Рюкзак заполнен' : 'Backpack is full',
    poor: locale === 'ru' ? 'Недостаточно золота' : 'Not enough gold',
    close: locale === 'ru' ? 'Закрыть торговлю' : 'Close trade',
  });
}

export function buyMerchantItem({ merchant, entryId, purchasedIds = [], gold, items, inventory } = {}) {
  const entry = merchant?.stock?.find((candidate) => candidate.entryId === entryId);
  if (!entry) return Object.freeze({ ok: false, reason: 'unknown-item' });
  if (purchasedIds.includes(entryId)) return Object.freeze({ ok: false, reason: 'sold' });
  if (!Number.isInteger(gold) || gold < entry.price) return Object.freeze({ ok: false, reason: 'poor' });
  if (!Array.isArray(inventory) || inventory.length >= MERCHANT_INVENTORY_LIMIT) {
    return Object.freeze({ ok: false, reason: 'full' });
  }
  if (!Array.isArray(items) || items.some(({ uid }) => uid === entry.record.uid)) {
    return Object.freeze({ ok: false, reason: 'duplicate' });
  }
  return Object.freeze({
    ok: true,
    state: Object.freeze({
      gold: gold - entry.price,
      items: Object.freeze([...items.map((item) => ({ ...item })), { ...entry.record }]),
      inventory: Object.freeze([...inventory, entry.record.uid]),
      purchasedIds: Object.freeze([...purchasedIds, entryId]),
    }),
  });
}

export function sellMerchantItem({ uid, gold, items, inventory } = {}) {
  const record = items?.find((item) => item.uid === uid);
  const definition = lootById(record?.id);
  if (!record || !definition || !inventory?.includes(uid)) {
    return Object.freeze({ ok: false, reason: 'unknown-item' });
  }
  const item = materializeItemAffixes(definition, record);
  const price = merchantSellPrice(item);
  return Object.freeze({
    ok: true,
    price,
    state: Object.freeze({
      gold: gold + price,
      items: Object.freeze(items.filter((candidate) => candidate.uid !== uid).map((candidate) => ({ ...candidate }))),
      inventory: Object.freeze(inventory.filter((candidate) => candidate !== uid)),
    }),
  });
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
