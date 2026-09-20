/**
 * The camp is a small place the hero makes, not one the dungeon provides.
 * A camping kit plus the Camp skill pitches it: a fire at the first rank, a
 * bedroll at the second, a personal chest at the third. Everything here is
 * pure: the runtime passes cells and numbers and gets a decision back.
 */

import {
  CAMP_STASH_CONTAINER_ID,
  validateChestContainerStates,
} from './dcss-rpg-chest-containers.js';

export { CAMP_STASH_CONTAINER_ID };

export const CAMP_KIT_ITEM_ID = 'camp-kit';
export const CAMP_FEATURE_IDS = Object.freeze(['fire', 'bedroll', 'chest']);

/**
 * The camp's own sprites, listed here so the packager ships them.
 *
 * The fire used to be an altar's flame — `makhleb_flame`, a pillar of fire on
 * a stone plinth, because Dungeon Crawl has no campfire: «костёр каменный, а
 * нужен обычный деревянный с дровами». And the bedroll was a folded cloak,
 * which is what a cloak looks like, not what a camp looks like. Both now come
 * from the village pack, which turned out to carry a whole camping section.
 */
export const CAMP_FIRE_FRAMES = Object.freeze(
  Array.from({ length: 5 }, (_, index) => `licensed/lpc-village/cut/campfire-${index + 1}.png`),
);
/** The same wood once the flame is gone, aligned to the burning frames. */
export const CAMP_FIRE_OUT_PATH = 'licensed/lpc-village/cut/campfire-out.png';
export const CAMP_BEDROLL_PATH = 'licensed/lpc-village/cut/tent.png';
export const CAMP_CHEST_PATH = 'licensed/cmski-chests/wooden/4.png';
export const CAMP_ASSET_PATHS = Object.freeze([
  ...CAMP_FIRE_FRAMES,
  CAMP_FIRE_OUT_PATH,
  CAMP_BEDROLL_PATH,
  CAMP_CHEST_PATH,
]);
/**
 * How long a camp fire lasts, in seconds of play.
 *
 * Ivan: «пусть он горит 1 или 2 минуты, потом он в потухший превращается и
 * использовать его нельзя». A fire that never goes out makes a camp a room:
 * pitch it once, cook forever, brew forever. Two minutes is long enough to
 * cook what the hero is carrying and short enough that the camp is a stop on
 * the way rather than a place to live. The clock is play time, not wall time,
 * so nothing burns down while the game is paused or the hero is a floor away.
 */
export const CAMP_FIRE_SECONDS = 120;
/** No camp within this many cells of anything alive that can see the spot. */
export const CAMP_SAFE_DISTANCE = 6;
/** Sleeping costs a real bite of the hunger bar, which is 3600 seconds wide. */
export const CAMP_REST_HUNGER_COST = 420;
/** The summoning spell brings a fire and a bedroll even to a hero who never learned to pitch one. */
export const CAMP_SPELL_RANK = 2;
export const CAMP_SPELL_REST_PERCENT = 30;

const EMPTY_PROFILE = Object.freeze({
  rank: 0,
  features: Object.freeze([]),
  restPercent: 0,
  stashSlots: 0,
});

const NEIGHBOURS = Object.freeze([
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 1, y: -1 }),
  Object.freeze({ x: 1, y: 1 }),
  Object.freeze({ x: -1, y: 1 }),
  Object.freeze({ x: -1, y: -1 }),
]);

function boundedInteger(value, min, max) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

/** Which features a rank pitches; the list only ever grows with the rank. */
export function campFeaturesForRank(rank) {
  const resolved = boundedInteger(rank, 0, 3);
  return Object.freeze(CAMP_FEATURE_IDS.slice(0, resolved));
}

export function campProfile(capabilities = {}) {
  const rank = boundedInteger(capabilities.campRank, 0, 3);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    features: campFeaturesForRank(rank),
    restPercent: boundedInteger(capabilities.campRestPercent, 0, 100),
    stashSlots: boundedInteger(capabilities.campStashSlots, 0, 12),
  });
}

/**
 * What the spell builds: never less than a fire and a bedroll, never less
 * comfortable than 30 percent, and the chest only for a hero who earned it.
 */
export function summonedCampProfile(capabilities = {}) {
  const learned = campProfile(capabilities);
  const rank = Math.max(CAMP_SPELL_RANK, learned.rank);
  return Object.freeze({
    rank,
    features: campFeaturesForRank(rank),
    restPercent: Math.max(CAMP_SPELL_REST_PERCENT, learned.restPercent),
    stashSlots: learned.stashSlots,
  });
}

function isOpenCell(grid, x, y) {
  return grid?.[y]?.[x] === '.';
}

/**
 * A tent is not a bedroll: it is about two cells wide and two tall, so it needs
 * a room rather than a crack. Ivan asked the right question — «если коридор
 * узкий в одну клетку?» — and the honest answer was that nothing checked: the
 * camp would pitch in a one-cell corridor and the tent would be drawn standing
 * through the wall above it.
 *
 * So the tent's cell has to have open ground to the left, to the right and
 * behind it. Everything else in a camp is one cell and fits anywhere; when no
 * cell has the room, the whole camp refuses with «мало места», which is a
 * refusal that already exists and already explains itself. A corridor is a bad
 * place to sleep, and the game is allowed to say so.
 */
const TENT_CLEARANCE = Object.freeze([
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 0, y: -1 }),
]);

const WIDE_FEATURES = new Set(['bedroll']);

function hasRoomForTent(grid, x, y) {
  return TENT_CLEARANCE.every((offset) => isOpenCell(grid, x + offset.x, y + offset.y));
}

/**
 * Where the camp's things stand: around the hero, in a stable order, so the
 * same spot always produces the same little camp.
 */
export function campLayout({ cell, features = [], grid, occupied = [] } = {}) {
  if (!cell || !Array.isArray(features)) return [];
  const taken = new Set(occupied);
  taken.add(`${cell.x},${cell.y}`);
  const places = [];
  for (const offset of NEIGHBOURS) {
    if (places.length >= features.length) break;
    const x = cell.x + offset.x;
    const y = cell.y + offset.y;
    if (!isOpenCell(grid, x, y) || taken.has(`${x},${y}`)) continue;
    const feature = features[places.length];
    if (WIDE_FEATURES.has(feature) && !hasRoomForTent(grid, x, y)) continue;
    taken.add(`${x},${y}`);
    places.push({ feature, x, y });
  }
  return places.length === features.length ? Object.freeze(places.map(Object.freeze)) : [];
}

/**
 * Everything that must be true before a kit is spent. The reason is what the
 * player sees, so each one names a different thing to fix.
 */
export function canPitchCamp({
  profile = EMPTY_PROFILE,
  kits = 0,
  camp = null,
  grid,
  cell,
  occupied = [],
  threats = [],
  needsKit = true,
} = {}) {
  if (!profile || profile.rank === 0) return Object.freeze({ ok: false, reason: 'no-skill' });
  if (needsKit && (!Number.isInteger(kits) || kits < 1)) {
    return Object.freeze({ ok: false, reason: 'no-kit' });
  }
  if (camp) return Object.freeze({ ok: false, reason: 'already-pitched' });
  if (!cell || !isOpenCell(grid, cell.x, cell.y)) return Object.freeze({ ok: false, reason: 'unsafe-ground' });
  const near = threats.some((threat) => (
    threat
    && Math.abs(threat.x - cell.x) + Math.abs(threat.y - cell.y) <= CAMP_SAFE_DISTANCE
  ));
  if (near) return Object.freeze({ ok: false, reason: 'enemies-near' });
  const places = campLayout({ cell, features: profile.features, grid, occupied });
  if (places.length === 0) return Object.freeze({ ok: false, reason: 'no-room' });
  return Object.freeze({ ok: true, reason: 'ready', places });
}

/**
 * The camp carries its own comfort, so a camp the spell summoned still sleeps
 * well for a hero with no camping skill, and a learned camp is unaffected by
 * what the hero studies afterwards.
 */
export function createCampState({ cell, places = [], rank = 1, restPercent = 0 } = {}) {
  const laid = places.map((place) => Object.freeze({ ...place }));
  return Object.freeze({
    x: cell.x,
    y: cell.y,
    rank: boundedInteger(rank, 1, 3),
    restPercent: boundedInteger(restPercent, 0, 100),
    rested: false,
    // A camp without a fire has no fire to burn down.
    fire: laid.some(({ feature }) => feature === 'fire') ? CAMP_FIRE_SECONDS : 0,
    places: Object.freeze(laid),
  });
}

/**
 * The fire burning down, one frame's worth at a time.
 *
 * `wentOut` is true on the single step that spends the last second and never
 * again, because that is the moment worth saying out loud — and the moment the
 * runtime has to rebuild the camp's props so the flame becomes cold wood.
 */
export function burnCampFire(camp, seconds) {
  if (!camp || !Number.isFinite(seconds) || seconds <= 0) {
    return Object.freeze({ camp, wentOut: false });
  }
  const left = Number.isFinite(camp.fire) ? camp.fire : 0;
  if (left <= 0) return Object.freeze({ camp, wentOut: false });
  const next = Math.max(0, left - seconds);
  return Object.freeze({
    camp: Object.freeze({ ...camp, fire: next, places: camp.places }),
    wentOut: next === 0,
  });
}

/** Is there a fire to cook on? A camp that never had one answers no as well. */
export function campFireBurning(camp) {
  return Boolean(camp) && Number.isFinite(camp.fire) && camp.fire > 0;
}

export function validateCampState(camp) {
  if (camp === null || camp === undefined) return true;
  if (typeof camp !== 'object' || Array.isArray(camp)) return false;
  const keys = Object.keys(camp).sort();
  if (keys.join(',') !== 'fire,places,rank,restPercent,rested,x,y') return false;
  if (!Number.isFinite(camp.fire) || camp.fire < 0 || camp.fire > CAMP_FIRE_SECONDS) return false;
  if (!Number.isInteger(camp.restPercent) || camp.restPercent < 0 || camp.restPercent > 100) return false;
  if (!Number.isInteger(camp.x) || camp.x < 0 || camp.x > 200) return false;
  if (!Number.isInteger(camp.y) || camp.y < 0 || camp.y > 200) return false;
  if (!Number.isInteger(camp.rank) || camp.rank < 1 || camp.rank > 3) return false;
  if (typeof camp.rested !== 'boolean') return false;
  if (!Array.isArray(camp.places) || camp.places.length !== camp.rank) return false;
  return camp.places.every((place) => (
    place
    && CAMP_FEATURE_IDS.includes(place.feature)
    && Number.isInteger(place.x) && place.x >= 0 && place.x <= 200
    && Number.isInteger(place.y) && place.y >= 0 && place.y <= 200
  ));
}

/**
 * One sleep per camp: health back for hunger spent. A hero too hungry to
 * afford the sleep is told so instead of waking up starving.
 */
export function resolveCampRest({ camp, hp, maxHp, hunger } = {}) {
  if (!camp) return Object.freeze({ ok: false, reason: 'no-camp' });
  if (!Number.isInteger(camp.restPercent) || camp.restPercent <= 0) {
    return Object.freeze({ ok: false, reason: 'no-bedroll' });
  }
  if (camp.rested) return Object.freeze({ ok: false, reason: 'already-rested' });
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp < 1) {
    return Object.freeze({ ok: false, reason: 'invalid' });
  }
  if (!Number.isInteger(hunger) || hunger < CAMP_REST_HUNGER_COST) {
    return Object.freeze({ ok: false, reason: 'too-hungry' });
  }
  if (hp >= maxHp) return Object.freeze({ ok: false, reason: 'nothing-to-heal' });
  const healed = Math.min(maxHp - hp, Math.max(1, Math.round((maxHp * camp.restPercent) / 100)));
  return Object.freeze({
    ok: true,
    reason: 'rested',
    healed,
    hp: hp + healed,
    hunger: hunger - CAMP_REST_HUNGER_COST,
    camp: Object.freeze({ ...camp, rested: true, places: camp.places }),
  });
}

/** The camp stash is an ordinary container that lives in the run, not the floor. */
export function createCampStash(source = null) {
  return {
    findId: CAMP_STASH_CONTAINER_ID,
    opened: true,
    destroyed: false,
    gold: Number.isSafeInteger(source?.gold) && source.gold >= 0 ? source.gold : 0,
    items: Array.isArray(source?.items) ? source.items.map((item) => ({ ...item })) : [],
  };
}

export function validateCampRunState(camp) {
  if (!camp || typeof camp !== 'object' || Array.isArray(camp)) return false;
  if (Object.keys(camp).join(',') !== 'stash') return false;
  return validateChestContainerStates([camp.stash], { depth: 1 });
}

const REFUSAL_TEXT = Object.freeze({
  ru: Object.freeze({
    'no-skill': 'Нужен навык «Лагерь»',
    'no-kit': 'Нужен походный набор',
    'already-pitched': 'Лагерь уже разбит',
    'unsafe-ground': 'Здесь не встать',
    'enemies-near': 'Рядом враги',
    'no-room': 'Мало места',
  }),
  en: Object.freeze({
    'no-skill': 'Camping skill required',
    'no-kit': 'A camping kit is required',
    'already-pitched': 'The camp is already pitched',
    'unsafe-ground': 'No ground for a camp',
    'enemies-near': 'Enemies are near',
    'no-room': 'Not enough room',
  }),
});

/** A refused camp says what to fix, because the kit is too rare to waste guesses. */
export function campRefusalText(reason, language = 'ru') {
  const table = REFUSAL_TEXT[language] ?? REFUSAL_TEXT.ru;
  return table[reason] ?? '';
}
