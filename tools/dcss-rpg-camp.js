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
/** No camp within this many cells of anything alive that can see the spot. */
export const CAMP_SAFE_DISTANCE = 6;
/** Sleeping costs a real bite of the hunger bar, which is 3600 seconds wide. */
export const CAMP_REST_HUNGER_COST = 420;

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

function isOpenCell(grid, x, y) {
  return grid?.[y]?.[x] === '.';
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
    taken.add(`${x},${y}`);
    places.push({ feature: features[places.length], x, y });
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
} = {}) {
  if (!profile || profile.rank === 0) return Object.freeze({ ok: false, reason: 'no-skill' });
  if (!Number.isInteger(kits) || kits < 1) return Object.freeze({ ok: false, reason: 'no-kit' });
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

export function createCampState({ cell, places = [], rank = 1 } = {}) {
  return Object.freeze({
    x: cell.x,
    y: cell.y,
    rank: boundedInteger(rank, 1, 3),
    rested: false,
    places: Object.freeze(places.map((place) => Object.freeze({ ...place }))),
  });
}

export function validateCampState(camp) {
  if (camp === null || camp === undefined) return true;
  if (typeof camp !== 'object' || Array.isArray(camp)) return false;
  const keys = Object.keys(camp).sort();
  if (keys.join(',') !== 'places,rank,rested,x,y') return false;
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
export function resolveCampRest({ profile = EMPTY_PROFILE, camp, hp, maxHp, hunger } = {}) {
  if (!camp) return Object.freeze({ ok: false, reason: 'no-camp' });
  if (!profile || profile.restPercent <= 0) return Object.freeze({ ok: false, reason: 'no-bedroll' });
  if (camp.rested) return Object.freeze({ ok: false, reason: 'already-rested' });
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp < 1) {
    return Object.freeze({ ok: false, reason: 'invalid' });
  }
  if (!Number.isInteger(hunger) || hunger < CAMP_REST_HUNGER_COST) {
    return Object.freeze({ ok: false, reason: 'too-hungry' });
  }
  if (hp >= maxHp) return Object.freeze({ ok: false, reason: 'nothing-to-heal' });
  const healed = Math.min(maxHp - hp, Math.max(1, Math.round((maxHp * profile.restPercent) / 100)));
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
