/**
 * The stash: what survives a run, and what you can do about the next one.
 *
 * A run starts from zero and ends at zero — that has been the rule since the
 * outcast preset, and it stays the rule for everybody who dies down there.
 * What it never answered is why anyone would climb back up. The stairs go both
 * ways, the city is a place, and leaving it all the same was the only sensible
 * play. So there is now a third way for a run to end: **walk away**. Whatever
 * is in your purse when you retire goes into the stash, and the stash is what
 * the outfitter at the gate will take.
 *
 * Two rules keep that from turning into permanent power:
 *
 * - **Death takes everything.** Dying banks nothing, so the descent stays a
 *   gamble and the shop is paid for by judgement, not by grinding.
 * - **What you buy lasts one run.** You outfit yourself for the next descent;
 *   if it ends badly the kit ends with it. Zero is still zero — it is just a
 *   zero you earned.
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

/**
 * What a run pays into the stash when it ends. Only walking away banks
 * anything: dying banks nothing, and winning ends the story rather than
 * funding the next chapter.
 */
export function stashEarned({ status, gold } = {}) {
  return status === 'retired' ? boundedCount(gold) : 0;
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
    wallet: 'Реальное золото',
    empty: 'Схрон пуст. Золото приносит тот, кто ушёл из подземелья живым.',
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
      'too-dear': 'Не хватает реального золота',
      'enough-of-those': 'Больше этого не унести',
      'hands-full': 'Руки заняты',
      'not-sold': 'Этого тут не продают',
      'not-yours': 'Этого у тебя нет',
    }),
  }),
  en: Object.freeze({
    title: 'Outfit',
    wallet: 'Real gold',
    empty: 'The stash is empty. Gold is carried out by whoever walks away alive.',
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
      'too-dear': 'Not enough real gold',
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
