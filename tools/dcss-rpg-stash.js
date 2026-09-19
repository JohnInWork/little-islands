/**
 * The stash: what survives a run, and what you can do about the next one.
 *
 * It used to be loot you carried out. Walking away at the gate banked your
 * purse; dying banked nothing; so the game quietly asked, every floor, whether
 * to keep playing or to go and cash in. Ivan cut that out: «никакой добычи,
 * которую можно вынести — игрок просто получает очки за то, что играет, и
 * тратит их на старте следующего забега. Систему упростить.»
 *
 * So a run is paid for **being played**, and paid the same however it ends.
 * The purse you die with is gone like everything else you were carrying; what
 * you take home is the record of how far you got and what you met on the way.
 * Nobody has to decide when to stop, because stopping buys nothing.
 *
 * One rule keeps it from turning into permanent power: **what you buy lasts
 * one run.** You outfit yourself for the next descent; if it ends badly the
 * kit ends with it. Zero is still zero — it is just a zero you earned.
 *
 * The counter sells things the dungeon already has, at the price the merchants
 * already charge (`merchantBuyPrice`). A second economy living in its own room
 * is exactly what the merchant slice warned against.
 */

import { lootById } from './dcss-rpg-content.js';
import { itemPresentation } from './dcss-rpg-item-details.js';
import { merchantBuyPrice } from './dcss-rpg-merchant.js';

export const STASH_KEY = 'dng-codex:stash:v1';
export const STASH_VERSION = 1;

/** No hoarding a hundred bandages: the counter outfits, it does not supply. */
export const STASH_GOOD_LIMIT = 3;
/** Nobody carries more than this into a run, whatever they can afford. */
export const STASH_BASKET_LIMIT = 8;

/**
 * What the outfitter keeps on the counter: plain first-floor things. Nothing
 * here is better than what the dungeon drops — it is the difference between
 * arriving with a rusty sword and arriving ready.
 */
export const OUTFITTER_GOODS = Object.freeze([
  Object.freeze({ id: 'short-blade', row: 'arms' }),
  Object.freeze({ id: 'oak-club', row: 'arms' }),
  Object.freeze({ id: 'hunting-spear', row: 'arms' }),
  Object.freeze({ id: 'sling', row: 'arms' }),
  Object.freeze({ id: 'heavy-leather', row: 'armour' }),
  Object.freeze({ id: 'iron-helm', row: 'armour' }),
  Object.freeze({ id: 'jackboots', row: 'armour' }),
  Object.freeze({ id: 'travel-cloak', row: 'armour' }),
  Object.freeze({ id: 'leather-gloves', row: 'armour' }),
  Object.freeze({ id: 'camp-kit', row: 'kit' }),
  Object.freeze({ id: 'bandage', row: 'kit' }),
  Object.freeze({ id: 'lockpick-set', row: 'kit' }),
  Object.freeze({ id: 'healing-potion', row: 'kit' }),
  Object.freeze({ id: 'hunter-trap', row: 'traps' }),
  Object.freeze({ id: 'poison-bait', row: 'traps' }),
  Object.freeze({ id: 'bread', row: 'food' }),
  Object.freeze({ id: 'cooked-meat', row: 'food' }),
]);

export const STASH_ROWS = Object.freeze(['arms', 'armour', 'kit', 'traps', 'food']);

const GOOD_IDS = new Set(OUTFITTER_GOODS.map(({ id }) => id));

const boundedCount = (value, max = 9_999_999) => (
  Number.isInteger(value) && value > 0 ? Math.min(max, value) : 0
);

/** The price of one of these, today and every day: the merchants' own price. */
export function stashPrice(id) {
  const definition = lootById(id);
  if (!definition) return 0;
  return merchantBuyPrice(definition);
}

export function createStashState(source = null) {
  const goods = {};
  const raw = source?.goods;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const id of OUTFITTER_GOODS.map(({ id: good }) => good)) {
      const count = boundedCount(raw[id], STASH_GOOD_LIMIT);
      if (count > 0) goods[id] = count;
    }
  }
  return {
    version: STASH_VERSION,
    gold: boundedCount(source?.gold),
    goods,
  };
}

export function validateStashState(stash) {
  if (!stash || typeof stash !== 'object' || Array.isArray(stash)) return false;
  if (stash.version !== STASH_VERSION) return false;
  if (!Number.isInteger(stash.gold) || stash.gold < 0) return false;
  if (!stash.goods || typeof stash.goods !== 'object') return false;
  return Object.entries(stash.goods).every(([id, count]) => (
    GOOD_IDS.has(id) && Number.isInteger(count) && count > 0 && count <= STASH_GOOD_LIMIT
  ));
}

/** How many things are waiting in the basket, counting stacks. */
export function stashBasketSize(stash) {
  return Object.values(createStashState(stash).goods).reduce((sum, count) => sum + count, 0);
}

/** Eight for every floor below the city, two for everything that died on it. */
export const STASH_PER_FLOOR = 8;
export const STASH_PER_KILL = 2;

/**
 * What a run pays into the stash, whatever ended it.
 *
 * Not the purse: the purse was loot, and loot is not carried out any more. A
 * run is paid for the ground it covered and the fights it survived, so dying
 * on the ninth floor is worth more than walking away from the second — which
 * is the shape Ivan asked for, and the end of deciding when to cash in.
 */
export function stashEarned({ depth = 0, kills = 0 } = {}) {
  const floors = boundedCount(Math.max(0, Math.floor(depth)));
  return boundedCount(floors * STASH_PER_FLOOR + boundedCount(kills) * STASH_PER_KILL);
}

export function stashDeposit(stash, gold) {
  const state = createStashState(stash);
  return Object.freeze({
    ...state,
    gold: boundedCount(state.gold + boundedCount(gold)),
    goods: { ...state.goods },
  });
}

/**
 * Buys one. The refusal says why, because the counter has three different ways
 * of saying no and a greyed-out button says none of them.
 */
export function stashBuy(stash, id) {
  const state = createStashState(stash);
  if (!GOOD_IDS.has(id)) return Object.freeze({ ok: false, reason: 'not-sold', stash: state });
  const price = stashPrice(id);
  const owned = state.goods[id] ?? 0;
  if (owned >= STASH_GOOD_LIMIT) return Object.freeze({ ok: false, reason: 'enough-of-those', stash: state });
  if (stashBasketSize(state) >= STASH_BASKET_LIMIT) {
    return Object.freeze({ ok: false, reason: 'hands-full', stash: state });
  }
  if (price > state.gold) return Object.freeze({ ok: false, reason: 'too-dear', stash: state });
  return Object.freeze({
    ok: true,
    reason: 'bought',
    price,
    stash: {
      version: STASH_VERSION,
      gold: state.gold - price,
      goods: { ...state.goods, [id]: owned + 1 },
    },
  });
}

/** Changed your mind, and nothing has been risked yet: the money comes back. */
export function stashReturn(stash, id) {
  const state = createStashState(stash);
  const owned = state.goods[id] ?? 0;
  if (owned <= 0) return Object.freeze({ ok: false, reason: 'not-yours', stash: state });
  const goods = { ...state.goods };
  if (owned === 1) delete goods[id];
  else goods[id] = owned - 1;
  return Object.freeze({
    ok: true,
    reason: 'returned',
    price: stashPrice(id),
    stash: { version: STASH_VERSION, gold: state.gold + stashPrice(id), goods },
  });
}

const SLOT_ORDER = Object.freeze([
  'hand1', 'hand2', 'body', 'head', 'boots', 'cloak', 'gloves', 'belt', 'ring1', 'ring2', 'amulet',
]);

/**
 * Turns the basket into the start of a run: what is worn is worn, the rest is
 * in the bag. Two things wanting one slot is a decision the counter does not
 * get to make twice — the first one wins and the second goes in the bag.
 *
 * The basket is emptied by the same call. A kit is spent when the run begins,
 * not when it ends, so quitting to the menu cannot duplicate it.
 */
export function stashOutfit(stash) {
  const state = createStashState(stash);
  const items = [];
  const inventory = [];
  const equipment = {};
  let index = 0;
  for (const { id } of OUTFITTER_GOODS) {
    const count = state.goods[id] ?? 0;
    if (count <= 0) continue;
    const definition = lootById(id);
    if (!definition) continue;
    if (definition.slot) {
      for (let copy = 0; copy < count; copy += 1) {
        const uid = `outfit-${index}`;
        index += 1;
        items.push({ id, uid, affixIds: [], artifactPowerId: null, artifactCurseId: null });
        if (SLOT_ORDER.includes(definition.slot) && !equipment[definition.slot]) {
          equipment[definition.slot] = uid;
        } else {
          inventory.push(uid);
        }
      }
      continue;
    }
    // Utility things stack: one entry, one count, the way the dungeon drops them.
    const uid = `outfit-${index}`;
    index += 1;
    items.push({ id, uid, stack: count });
    inventory.push(uid);
  }
  return Object.freeze({
    items: Object.freeze(items),
    inventory: Object.freeze(inventory),
    equipment: Object.freeze(equipment),
    stash: { version: STASH_VERSION, gold: state.gold, goods: {} },
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    title: 'Снаряжение',
    wallet: 'Очки забегов',
    empty: 'Пока пусто. Очки идут за пройденное: за каждый этаж вниз и за каждого встреченного.',
    basket: 'С собой',
    start: 'В забег',
    buy: 'Купить',
    give: 'Вернуть',
    close: 'Закрыть',
    owned: 'С собой уже',
    rows: Object.freeze({
      arms: 'Оружие', armour: 'Броня', kit: 'Снаряжение', traps: 'Ловушки', food: 'Припасы',
    }),
    refusal: Object.freeze({
      'too-dear': 'Не хватает очков',
      'enough-of-those': 'Больше этого не унести',
      'hands-full': 'Руки заняты',
      'not-sold': 'Этого тут не продают',
      'not-yours': 'Этого у тебя нет',
    }),
  }),
  en: Object.freeze({
    title: 'Outfit',
    wallet: 'Run points',
    empty: 'Empty for now. Points come from the ground covered: every floor down, and everything met on it.',
    basket: 'Taking along',
    start: 'Descend',
    buy: 'Buy',
    give: 'Return',
    close: 'Close',
    owned: 'Already taking',
    rows: Object.freeze({
      arms: 'Arms', armour: 'Armour', kit: 'Kit', traps: 'Traps', food: 'Supplies',
    }),
    refusal: Object.freeze({
      'too-dear': 'Not enough points',
      'enough-of-those': 'No room for more of those',
      'hands-full': 'Hands full',
      'not-sold': 'Not sold here',
      'not-yours': 'You do not have one',
    }),
  }),
});

export function stashCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

/** Everything the counter needs to draw itself, and nothing the screen decides. */
export function stashModel(stash, language = 'ru') {
  const state = createStashState(stash);
  const copy = stashCopy(language);
  const basket = stashBasketSize(state);
  const rows = STASH_ROWS.map((row) => Object.freeze({
    id: row,
    title: copy.rows[row],
    goods: Object.freeze(OUTFITTER_GOODS.filter((good) => good.row === row).map(({ id }) => {
      const definition = lootById(id);
      const price = stashPrice(id);
      const owned = state.goods[id] ?? 0;
      // Everything the counter says about a thing comes from the same place the
      // bag says it — the name, what it does, what it gives. Buying blind is
      // not a decision, and a shop that will not let you read first is a trap.
      const shown = definition ? itemPresentation({ ...definition, id }, language) : null;
      return Object.freeze({
        id,
        price,
        owned,
        name: shown?.name ?? id,
        icon: definition?.icon ?? null,
        slot: definition?.slot ?? null,
        slotLabel: shown?.slot ?? '',
        rarity: shown?.rarity ?? '',
        description: shown?.description ?? '',
        effects: Object.freeze((shown?.effects ?? []).map((effect) => Object.freeze({
          id: effect.id,
          icon: effect.icon,
          text: effect.text,
        }))),
        affordable: price <= state.gold && owned < STASH_GOOD_LIMIT && basket < STASH_BASKET_LIMIT,
      });
    })),
  }));
  return Object.freeze({
    gold: state.gold,
    basket,
    basketLimit: STASH_BASKET_LIMIT,
    rows: Object.freeze(rows),
    copy,
  });
}

export function serializeStash(stash) {
  return JSON.stringify(createStashState(stash));
}

export function parseStash(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return createStashState(null);
  try {
    const parsed = JSON.parse(raw);
    const state = createStashState(parsed);
    return validateStashState(state) ? state : createStashState(null);
  } catch {
    return createStashState(null);
  }
}

/** Every sprite the counter can ask for, so the preloader knows about them. */
export function stashAssetPaths() {
  return [...new Set(OUTFITTER_GOODS.map(({ id }) => lootById(id)?.icon).filter(Boolean))];
}
