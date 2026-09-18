/**
 * Tamed beasts. The dungeon's wildlife already carries a `tameDifficulty`, so
 * this is the rule the catalogue was waiting for: a sheep will follow anyone
 * with a crust of bread, a yak only a real handler.
 *
 * Unlike a raised servant, a companion is a creature of the run: it is carried
 * in the save, it walks down the stairs with the hero, and when it dies it
 * stays dead. Four skills stand on that one fact — what the beast is told to
 * do, how it is patched up, what it shares, and how many may follow.
 */

import { passiveCreatureById } from './dcss-rpg-passive.js';

/** Any real meal will do; the hero gives one up to make a friend. */
export const TAME_FOOD_IDS = Object.freeze([
  'bread',
  'cooked-meat',
  'roast-meat',
  'hearty-stew',
  'feast-platter',
]);

/** A handler's own hands make the beast tougher and braver. */
export const COMPANION_HP_PERCENT = Object.freeze([0, 0, 30, 60]);
export const COMPANION_DAMAGE_PERCENT = Object.freeze([0, 0, 10, 25]);

/** What a trained beast can be told to do. Untrained, it simply follows. */
export const COMPANION_MODES = Object.freeze(['guard', 'search', 'fetch']);
export const DEFAULT_COMPANION_MODE = 'guard';
const MODES_BY_RANK = Object.freeze([
  Object.freeze([]),
  Object.freeze(['guard', 'search']),
  Object.freeze(['guard', 'search', 'fetch']),
  Object.freeze(['guard', 'search', 'fetch']),
]);

/** How far a searching beast lights the floor, and how far it fetches from. */
export const SEARCH_RADIUS = Object.freeze([0, 2, 2, 3]);
export const FETCH_RANGE = Object.freeze([0, 0, 4, 6]);

/** Care: a meal on the road, and a dressing for what the meal cannot fix. */
export const CARE_FEED_PERCENT = Object.freeze([0, 40, 55, 70]);
export const CARE_TREAT_RANK = 2;

/** The bond: what the beast sees, the hero sees — while it stays close. */
export const BOND_DISTANCE = Object.freeze([0, 4, 6, 8]);
export const BOND_RADIUS = Object.freeze([0, 2, 3, 4]);

/** How many beasts may follow, and what the next one costs in food. */
export const COMPANION_LIMIT = Object.freeze([1, 2, 2, 3]);

const EMPTY_TAMING = Object.freeze({ rank: 0, difficulty: 0, hpPercent: 0, damagePercent: 0 });
const EMPTY_TRAINING = Object.freeze({ rank: 0, modes: Object.freeze([]), searchRadius: 0, fetchRange: 0 });
const EMPTY_CARE = Object.freeze({ rank: 0, feedPercent: 0, treats: false });
const EMPTY_BOND = Object.freeze({ rank: 0, distance: 0, radius: 0 });
const EMPTY_PACK = Object.freeze({ rank: 0, limit: COMPANION_LIMIT[0] });

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function tamingProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.tamingRank);
  if (rank === 0) return EMPTY_TAMING;
  return Object.freeze({
    rank,
    // Rank one handles the meekest beast, rank three anything that grazes here.
    difficulty: rank,
    hpPercent: COMPANION_HP_PERCENT[rank],
    damagePercent: COMPANION_DAMAGE_PERCENT[rank],
  });
}

export function trainingProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.trainingRank);
  if (rank === 0) return EMPTY_TRAINING;
  return Object.freeze({
    rank,
    modes: MODES_BY_RANK[rank],
    searchRadius: SEARCH_RADIUS[rank],
    fetchRange: FETCH_RANGE[rank],
  });
}

export function careProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.animalCareRank);
  if (rank === 0) return EMPTY_CARE;
  return Object.freeze({ rank, feedPercent: CARE_FEED_PERCENT[rank], treats: rank >= CARE_TREAT_RANK });
}

export function bondProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.beastBondRank);
  if (rank === 0) return EMPTY_BOND;
  return Object.freeze({ rank, distance: BOND_DISTANCE[rank], radius: BOND_RADIUS[rank] });
}

export function packProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.packLeaderRank);
  return Object.freeze({ rank, limit: COMPANION_LIMIT[rank] });
}

/** What the beast is worth once it walks beside the hero. */
export function companionStats({ creatureId = '', profile = EMPTY_TAMING } = {}) {
  const creature = passiveCreatureById(creatureId);
  if (!creature) return null;
  return Object.freeze({
    id: creature.id,
    maxHp: Math.max(1, Math.round(creature.maxHp * (1 + (profile?.hpPercent ?? 0) / 100))),
    damage: Math.round(creature.damage * (1 + (profile?.damagePercent ?? 0) / 100)),
    defense: creature.defense,
    speed: creature.speed,
  });
}

export function createCompanionState(source = null) {
  if (!source || typeof source !== 'object') return null;
  const creature = passiveCreatureById(source.id);
  if (!creature) return null;
  const hp = Number.isFinite(source.hp) ? Math.round(source.hp) : 0;
  if (hp <= 0) return null;
  return {
    id: creature.id,
    hp: Math.min(hp, 9999),
    mode: COMPANION_MODES.includes(source.mode) ? source.mode : DEFAULT_COMPANION_MODE,
  };
}

/** The party as the save keeps it: a short list, every entry a living beast. */
export function createCompanionParty(source = null) {
  const list = Array.isArray(source) ? source : source ? [source] : [];
  return list
    .map(createCompanionState)
    .filter((companion) => companion !== null)
    .slice(0, COMPANION_LIMIT.at(-1));
}

export function validateCompanionState(companion) {
  if (!companion || typeof companion !== 'object' || Array.isArray(companion)) return false;
  if (Object.keys(companion).sort().join(',') !== 'hp,id,mode') return false;
  if (!passiveCreatureById(companion.id)) return false;
  if (!COMPANION_MODES.includes(companion.mode)) return false;
  return Number.isInteger(companion.hp) && companion.hp > 0 && companion.hp <= 9999;
}

export function validateCompanionParty(party) {
  if (!Array.isArray(party) || party.length > COMPANION_LIMIT.at(-1)) return false;
  return party.every(validateCompanionState);
}

/** Every beast eats: the next one to join costs a meal more than the last. */
export function tameFoodCost(partySize = 0) {
  return Math.max(1, Math.min(9, (Number.isInteger(partySize) ? partySize : 0) + 1));
}

/**
 * Whether this beast can be befriended right now. A creature that has already
 * been hunted will not come near, and the party has a size the pack allows.
 */
export function canTame({
  creature = null,
  profile = EMPTY_TAMING,
  pack = EMPTY_PACK,
  foodCount = 0,
  party = [],
} = {}) {
  if (profile?.rank === 0) return Object.freeze({ ok: false, reason: 'rank-required' });
  if (!creature || !passiveCreatureById(creature.id)) return Object.freeze({ ok: false, reason: 'not-a-beast' });
  if (creature.defeated || creature.hunted) return Object.freeze({ ok: false, reason: 'frightened' });
  const limit = pack?.limit ?? COMPANION_LIMIT[0];
  if (party.length >= limit) return Object.freeze({ ok: false, reason: 'already-bonded', limit });
  const definition = passiveCreatureById(creature.id);
  if (definition.tameDifficulty > profile.difficulty) {
    return Object.freeze({ ok: false, reason: 'too-wild', required: definition.tameDifficulty });
  }
  const cost = tameFoodCost(party.length);
  if (foodCount < cost) return Object.freeze({ ok: false, reason: 'no-food', cost });
  return Object.freeze({ ok: true, reason: 'ready', cost });
}

export function tameCreature(options = {}) {
  const decision = canTame(options);
  if (!decision.ok) return decision;
  const stats = companionStats({ creatureId: options.creature.id, profile: options.profile });
  return Object.freeze({
    ok: true,
    reason: 'tamed',
    stats,
    cost: decision.cost,
    companion: { id: stats.id, hp: stats.maxHp, mode: DEFAULT_COMPANION_MODE },
  });
}

/** The next order in the ring the handler knows; untrained beasts take none. */
export function nextCompanionMode(mode, profile = EMPTY_TRAINING) {
  const modes = profile?.modes ?? EMPTY_TRAINING.modes;
  if (modes.length === 0) return null;
  const index = modes.indexOf(mode);
  // An order the handler no longer knows falls back to the first one they do.
  if (index < 0) return modes[0];
  return modes[(index + 1) % modes.length];
}

/** A meal on the road. It is refused when the beast has nothing to mend. */
export function canFeed({ companion = null, maxHp = 1, profile = EMPTY_CARE, foodCount = 0 } = {}) {
  if (profile?.rank === 0) return Object.freeze({ ok: false, reason: 'rank-required' });
  if (!companion) return Object.freeze({ ok: false, reason: 'no-beast' });
  if (foodCount < 1) return Object.freeze({ ok: false, reason: 'no-food', cost: 1 });
  if (companion.hp >= maxHp) return Object.freeze({ ok: false, reason: 'not-hurt' });
  return Object.freeze({ ok: true, reason: 'ready', cost: 1 });
}

export function feedCompanion(options = {}) {
  const decision = canFeed(options);
  if (!decision.ok) return decision;
  const { companion, maxHp = 1, profile = EMPTY_CARE } = options;
  const healed = Math.max(1, Math.round((maxHp * profile.feedPercent) / 100));
  return Object.freeze({
    ok: true,
    reason: 'fed',
    healed: Math.min(healed, maxHp - companion.hp),
    hp: Math.min(maxHp, companion.hp + healed),
    cost: decision.cost,
  });
}

/** A dressing for what a meal cannot fix: burning, venom, the cold. */
export function canTreat({ companion = null, effects = {}, profile = EMPTY_CARE, bandageCount = 0 } = {}) {
  if (!profile?.treats) return Object.freeze({ ok: false, reason: 'rank-required' });
  if (!companion) return Object.freeze({ ok: false, reason: 'no-beast' });
  if (bandageCount < 1) return Object.freeze({ ok: false, reason: 'no-bandage', cost: 1 });
  const carried = Object.entries(effects).filter(([, seconds]) => seconds > 0).map(([id]) => id);
  if (carried.length === 0) return Object.freeze({ ok: false, reason: 'nothing-to-treat' });
  return Object.freeze({ ok: true, reason: 'ready', cost: 1, cleared: Object.freeze(carried) });
}

export function treatCompanion(options = {}) {
  const decision = canTreat(options);
  if (!decision.ok) return decision;
  const next = { ...(options.effects ?? {}) };
  for (const id of decision.cleared) next[id] = 0;
  return Object.freeze({ ...decision, reason: 'treated', effects: next });
}

/** What the hero learns from a beast that is close enough to shout to. */
export function bondReveal({ hero = null, beast = null, profile = EMPTY_BOND } = {}) {
  if (!hero || !beast || (profile?.rank ?? 0) === 0) return null;
  const distance = Math.hypot(beast.x - hero.x, beast.y - hero.y);
  if (distance > profile.distance) return null;
  return Object.freeze({ x: beast.x, y: beast.y, radius: profile.radius });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    tame: 'Приручить',
    feed: 'Покормить',
    treat: 'Перевязать',
    order: 'Приказ',
    'rank-required': 'Нужен навык',
    'not-a-beast': 'Это не зверь',
    frightened: 'Зверь напуган',
    'already-bonded': 'Отряд уже полон',
    'too-wild': 'Слишком дикий для твоего ранга',
    'no-food': 'Нужна еда',
    'no-bandage': 'Нужны бинты',
    'no-beast': 'Зверя нет',
    'not-hurt': 'Зверь цел',
    'nothing-to-treat': 'Лечить нечего',
    tamed: 'Зверь пошёл за тобой',
    fed: 'Зверь поел',
    treated: 'Зверь перевязан',
    lost: 'Зверь пал',
    modes: Object.freeze({ guard: 'Защищать', search: 'Искать', fetch: 'Приносить' }),
    names: Object.freeze({ sheep: 'Овца', hog: 'Кабан', yak: 'Як' }),
  }),
  en: Object.freeze({
    tame: 'Tame',
    feed: 'Feed',
    treat: 'Bandage',
    order: 'Order',
    'rank-required': 'The skill is required',
    'not-a-beast': 'That is not a beast',
    frightened: 'The beast is frightened',
    'already-bonded': 'The party is full',
    'too-wild': 'Too wild for your rank',
    'no-food': 'Food is required',
    'no-bandage': 'Bandages are required',
    'no-beast': 'There is no beast',
    'not-hurt': 'The beast is whole',
    'nothing-to-treat': 'Nothing to treat',
    tamed: 'The beast follows you',
    fed: 'The beast has eaten',
    treated: 'The beast is bandaged',
    lost: 'Your beast has fallen',
    modes: Object.freeze({ guard: 'Defend', search: 'Search', fetch: 'Fetch' }),
    names: Object.freeze({ sheep: 'Sheep', hog: 'Hog', yak: 'Yak' }),
  }),
});

export function companionCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function companionRefusalText(reason, language = 'ru') {
  const table = companionCopy(language);
  return typeof table[reason] === 'string' ? table[reason] : '';
}

export function companionName(creatureId, language = 'ru') {
  return companionCopy(language).names[creatureId] ?? creatureId;
}

export function companionModeLabel(mode, language = 'ru') {
  return companionCopy(language).modes[mode] ?? '';
}
