/**
 * A tamed beast. The dungeon's wildlife already carries a `tameDifficulty`, so
 * this is the rule the catalogue was waiting for: a sheep will follow anyone
 * with a crust of bread, a yak only a real handler.
 *
 * Unlike a raised servant, a companion is a creature of the run: it is carried
 * in the save, it walks down the stairs with the hero, and when it dies it
 * stays dead.
 */

import { passiveCreatureById } from './dcss-rpg-passive.js';

/** Any real meal will do; the hero gives up one to make a friend. */
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

const EMPTY_PROFILE = Object.freeze({ rank: 0, difficulty: 0, hpPercent: 0, damagePercent: 0 });

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function tamingProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.tamingRank);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    // Rank one handles the meekest beast, rank three anything that grazes here.
    difficulty: rank,
    hpPercent: COMPANION_HP_PERCENT[rank],
    damagePercent: COMPANION_DAMAGE_PERCENT[rank],
  });
}

/** What the beast is worth once it walks beside the hero. */
export function companionStats({ creatureId = '', profile = EMPTY_PROFILE } = {}) {
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
  return { id: creature.id, hp: Math.min(hp, 9999) };
}

export function validateCompanionState(companion) {
  if (companion === null) return true;
  if (!companion || typeof companion !== 'object' || Array.isArray(companion)) return false;
  if (Object.keys(companion).sort().join(',') !== 'hp,id') return false;
  if (!passiveCreatureById(companion.id)) return false;
  return Number.isInteger(companion.hp) && companion.hp > 0 && companion.hp <= 9999;
}

/**
 * Whether this beast can be befriended right now. A creature that has already
 * been hunted will not come near, and a hero who already has a friend cannot
 * take a second: the bond is one at a time.
 */
export function canTame({
  creature = null,
  profile = EMPTY_PROFILE,
  foodCount = 0,
  companion = null,
} = {}) {
  if (profile?.rank === 0) return Object.freeze({ ok: false, reason: 'rank-required' });
  if (!creature || !passiveCreatureById(creature.id)) return Object.freeze({ ok: false, reason: 'not-a-beast' });
  if (creature.defeated || creature.hunted) return Object.freeze({ ok: false, reason: 'frightened' });
  if (companion) return Object.freeze({ ok: false, reason: 'already-bonded' });
  const definition = passiveCreatureById(creature.id);
  if (definition.tameDifficulty > profile.difficulty) {
    return Object.freeze({ ok: false, reason: 'too-wild', required: definition.tameDifficulty });
  }
  if (foodCount < 1) return Object.freeze({ ok: false, reason: 'no-food' });
  return Object.freeze({ ok: true, reason: 'ready' });
}

export function tameCreature(options = {}) {
  const decision = canTame(options);
  if (!decision.ok) return decision;
  const stats = companionStats({ creatureId: options.creature.id, profile: options.profile });
  return Object.freeze({
    ok: true,
    reason: 'tamed',
    stats,
    companion: { id: stats.id, hp: stats.maxHp },
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    tame: 'Приручить',
    'rank-required': 'Нужно «Приручение»',
    'not-a-beast': 'Это не зверь',
    frightened: 'Зверь напуган',
    'already-bonded': 'С тобой уже есть зверь',
    'too-wild': 'Слишком дикий для твоего ранга',
    'no-food': 'Нужна еда',
    tamed: 'Зверь пошёл за тобой',
    lost: 'Зверь пал',
    names: Object.freeze({ sheep: 'Овца', hog: 'Кабан', yak: 'Як' }),
  }),
  en: Object.freeze({
    tame: 'Tame',
    'rank-required': 'Taming is required',
    'not-a-beast': 'That is not a beast',
    frightened: 'The beast is frightened',
    'already-bonded': 'A beast already walks with you',
    'too-wild': 'Too wild for your rank',
    'no-food': 'Food is required',
    tamed: 'The beast follows you',
    lost: 'Your beast has fallen',
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
