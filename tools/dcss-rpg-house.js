/**
 * The house is the one place in the run that belongs to the hero. An empty
 * plot in the city is bought once; after that it is furnished piece by piece,
 * and a stone brings the hero home from anywhere below.
 *
 * Everything here is arithmetic over a small state: what is bought, what is
 * installed, and where the hero left the dungeon. The runtime supplies gold
 * and cells and gets a decision back.
 */

export const HOUSE_PRICE = 350;
/** The stone the deed comes with: the hero never has to buy the way home. */
export const HOME_STONE_ITEM_ID = 'home-stone';
/** A night at home is worth more than a bedroll, and the road there costs time. */
export const HOUSE_REST_PERCENT = 35;
export const HOUSE_TRAVEL_HUNGER_COST = 600;
/** Nothing follows the hero home: the road is closed while anything watches. */
export const HOUSE_SAFE_DISTANCE = 6;

const furniture = (id, price, ru, en) => Object.freeze({
  id,
  price,
  labels: Object.freeze({ ru, en }),
});

/** What can stand in the house, in the order the rooms are laid out. */
export const HOUSE_FURNITURE = Object.freeze({
  bed: furniture('bed', 120, 'Кровать', 'Bed'),
  chest: furniture('chest', 150, 'Сундук', 'Chest'),
  hearth: furniture('hearth', 90, 'Очаг', 'Hearth'),
});

export const HOUSE_FURNITURE_IDS = Object.freeze(Object.keys(HOUSE_FURNITURE));

const EMPTY_HOUSE = Object.freeze({ owned: false, furniture: Object.freeze([]), anchor: null });

function normalizedFurniture(values) {
  if (!Array.isArray(values)) return [];
  return HOUSE_FURNITURE_IDS.filter((id) => values.includes(id));
}

function normalizedAnchor(anchor) {
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) return null;
  const { depth, x, y } = anchor;
  if (![depth, x, y].every((value) => Number.isInteger(value) && value >= 0)) return null;
  return { depth, x, y };
}

export function createHouseState(source = null) {
  if (!source) return { owned: false, furniture: [], anchor: null };
  return {
    owned: source.owned === true,
    furniture: normalizedFurniture(source.furniture),
    anchor: normalizedAnchor(source.anchor),
  };
}

export function validateHouseState(house) {
  if (!house || typeof house !== 'object' || Array.isArray(house)) return false;
  if (Object.keys(house).sort().join(',') !== 'anchor,furniture,owned') return false;
  if (typeof house.owned !== 'boolean') return false;
  if (!Array.isArray(house.furniture)) return false;
  if (new Set(house.furniture).size !== house.furniture.length) return false;
  if (house.furniture.some((id) => !HOUSE_FURNITURE_IDS.includes(id))) return false;
  if (!house.owned && (house.furniture.length > 0 || house.anchor !== null)) return false;
  if (house.anchor === null) return true;
  const anchor = house.anchor;
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) return false;
  if (Object.keys(anchor).sort().join(',') !== 'depth,x,y') return false;
  return [anchor.depth, anchor.x, anchor.y].every((value) => (
    Number.isInteger(value) && value >= 0 && value <= 999
  ));
}

/**
 * Buying the deed. The stone comes with it, so the purchase needs a free hand
 * in the backpack; a hero who cannot carry the stone is told before paying.
 */
export function canBuyHouse({ house = EMPTY_HOUSE, gold = 0, backpackCount = 0, capacity = 12 } = {}) {
  if (house.owned) return Object.freeze({ ok: false, reason: 'already-owned' });
  if (!Number.isInteger(gold) || gold < HOUSE_PRICE) return Object.freeze({ ok: false, reason: 'no-gold' });
  if (backpackCount >= capacity) return Object.freeze({ ok: false, reason: 'full-bag' });
  return Object.freeze({ ok: true, reason: 'ready', price: HOUSE_PRICE });
}

export function buyHouse({ house = EMPTY_HOUSE, gold = 0, backpackCount = 0, capacity = 12 } = {}) {
  const decision = canBuyHouse({ house, gold, backpackCount, capacity });
  if (!decision.ok) return Object.freeze({ ...decision, house, gold });
  return Object.freeze({
    ok: true,
    reason: 'bought',
    price: HOUSE_PRICE,
    gold: gold - HOUSE_PRICE,
    house: { owned: true, furniture: [], anchor: null },
  });
}

export function furnitureById(id) {
  return HOUSE_FURNITURE[id] ?? null;
}

export function canInstallFurniture({ house = EMPTY_HOUSE, furnitureId, gold = 0 } = {}) {
  const piece = furnitureById(furnitureId);
  if (!piece) return Object.freeze({ ok: false, reason: 'unknown' });
  if (!house.owned) return Object.freeze({ ok: false, reason: 'no-house' });
  if (house.furniture.includes(piece.id)) return Object.freeze({ ok: false, reason: 'already-installed' });
  if (!Number.isInteger(gold) || gold < piece.price) {
    return Object.freeze({ ok: false, reason: 'no-gold', price: piece.price });
  }
  return Object.freeze({ ok: true, reason: 'ready', price: piece.price });
}

export function installFurniture({ house = EMPTY_HOUSE, furnitureId, gold = 0 } = {}) {
  const decision = canInstallFurniture({ house, furnitureId, gold });
  if (!decision.ok) return Object.freeze({ ...decision, house, gold });
  return Object.freeze({
    ok: true,
    reason: 'installed',
    price: decision.price,
    gold: gold - decision.price,
    house: {
      ...house,
      furniture: normalizedFurniture([...house.furniture, furnitureId]),
    },
  });
}

/**
 * Where each piece stands inside the plot. The order is fixed, so a bed bought
 * today is in the same corner tomorrow, and the doorway stays clear.
 */
export function houseSlots(plot) {
  const interior = plot?.interior;
  if (!interior || interior.w < 2 || interior.h < 2) return [];
  const door = plot.door ?? null;
  const corners = [
    { x: interior.x, y: interior.y },
    { x: interior.x + interior.w - 1, y: interior.y },
    { x: interior.x, y: interior.y + interior.h - 1 },
    { x: interior.x + interior.w - 1, y: interior.y + interior.h - 1 },
  ].filter((cell) => !door || Math.abs(cell.x - door.x) + Math.abs(cell.y - door.y) > 1);
  return HOUSE_FURNITURE_IDS
    .map((furnitureId, index) => (corners[index] ? { furnitureId, ...corners[index] } : null))
    .filter(Boolean);
}

/** Where the stone puts the hero down: the middle of the room, never a corner. */
export function houseArrivalCell(plot) {
  const interior = plot?.interior;
  if (!interior) return null;
  return {
    x: interior.x + Math.floor(interior.w / 2),
    y: interior.y + Math.floor(interior.h / 2),
  };
}

/** Sleeping at home: health for time, as often as the hero can afford the time. */
export function resolveHouseRest({ house = EMPTY_HOUSE, hp, maxHp, hunger } = {}) {
  if (!house.owned || !house.furniture.includes('bed')) {
    return Object.freeze({ ok: false, reason: 'no-bed' });
  }
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp < 1) {
    return Object.freeze({ ok: false, reason: 'invalid' });
  }
  if (!Number.isInteger(hunger) || hunger < HOUSE_TRAVEL_HUNGER_COST) {
    return Object.freeze({ ok: false, reason: 'too-hungry' });
  }
  if (hp >= maxHp) return Object.freeze({ ok: false, reason: 'nothing-to-heal' });
  const healed = Math.min(maxHp - hp, Math.max(1, Math.round((maxHp * HOUSE_REST_PERCENT) / 100)));
  return Object.freeze({
    ok: true,
    reason: 'rested',
    healed,
    hp: hp + healed,
    hunger: hunger - HOUSE_TRAVEL_HUNGER_COST,
  });
}

/**
 * The road home. It costs time, it is refused while anything is watching, and
 * it remembers where the hero stood so the door can send them back.
 */
export function canTravelHome({ house = EMPTY_HOUSE, depth, cell, hunger, watchers = 0 } = {}) {
  if (!house.owned) return Object.freeze({ ok: false, reason: 'no-house' });
  if (!Number.isInteger(depth) || depth < 1) return Object.freeze({ ok: false, reason: 'invalid' });
  if (!cell || !Number.isInteger(cell.x) || !Number.isInteger(cell.y)) {
    return Object.freeze({ ok: false, reason: 'invalid' });
  }
  if (watchers > 0) return Object.freeze({ ok: false, reason: 'enemies-near' });
  if (!Number.isInteger(hunger) || hunger < HOUSE_TRAVEL_HUNGER_COST) {
    return Object.freeze({ ok: false, reason: 'too-hungry' });
  }
  return Object.freeze({ ok: true, reason: 'ready' });
}

export function travelHome({ house = EMPTY_HOUSE, depth, cell, hunger, watchers = 0 } = {}) {
  const decision = canTravelHome({ house, depth, cell, hunger, watchers });
  if (!decision.ok) return Object.freeze({ ...decision, house, hunger });
  return Object.freeze({
    ok: true,
    reason: 'travelled',
    hunger: hunger - HOUSE_TRAVEL_HUNGER_COST,
    house: { ...house, anchor: { depth, x: cell.x, y: cell.y } },
  });
}

/** Walking back out of the door: free, and it forgets the way it came. */
export function returnFromHouse({ house = EMPTY_HOUSE } = {}) {
  if (!house.owned || !house.anchor) return Object.freeze({ ok: false, reason: 'no-anchor' });
  return Object.freeze({
    ok: true,
    reason: 'returned',
    anchor: { ...house.anchor },
    house: { ...house, anchor: null },
  });
}

const REFUSAL_TEXT = Object.freeze({
  ru: Object.freeze({
    'already-owned': 'Дом уже куплен',
    'no-gold': 'Не хватает реального золота',
    'full-bag': 'Нет места в рюкзаке',
    'no-house': 'Нужен свой дом',
    'already-installed': 'Уже стоит',
    'no-bed': 'Нужна кровать',
    'too-hungry': 'Слишком голоден',
    'nothing-to-heal': 'Нечего лечить',
    'enemies-near': 'Рядом враги',
    'no-anchor': 'Некуда возвращаться',
    invalid: 'Сейчас нельзя',
  }),
  en: Object.freeze({
    'already-owned': 'The house is already yours',
    'no-gold': 'Not enough gold',
    'full-bag': 'No room in the backpack',
    'no-house': 'A house of your own is required',
    'already-installed': 'Already installed',
    'no-bed': 'A bed is required',
    'too-hungry': 'Too hungry',
    'nothing-to-heal': 'Nothing to heal',
    'enemies-near': 'Enemies are near',
    'no-anchor': 'Nowhere to return to',
    invalid: 'Not right now',
  }),
});

export function houseRefusalText(reason, language = 'ru') {
  const table = REFUSAL_TEXT[language] ?? REFUSAL_TEXT.ru;
  return table[reason] ?? '';
}
