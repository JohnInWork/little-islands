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

import { mercenaryById } from './dcss-rpg-mercenaries.js';
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

/**
 * Приказов у зверя больше нет: он идёт рядом и дерётся.
 *
 * Дрессировка, уход и связь были тремя отдельными навыками — вместе с
 * приручением и вожаком стаи это пятнадцать очков из тридцати, которые
 * даёт весь забег, на одну подсистему. Иван: «Дрессировка, Уход, Звериная
 * связь — убираем». Поле `mode` осталось в сохранении, чтобы вчерашние
 * забеги не отвергались проверкой, но меняться ему больше нечем.
 */
export const COMPANION_MODES = Object.freeze(['guard', 'search', 'fetch']);
export const DEFAULT_COMPANION_MODE = 'guard';

/**
 * Сколько зверей идёт за героем — по рангу «Приручения».
 *
 * Было отдельным навыком «Вожак стаи», и половина его молчала: первый и
 * второй ранг разрешали по двое. Спутников и так ужали с пяти навыков до
 * двух, а второй существовал ради одного числа — теперь это число растёт
 * вместе с самим приручением.
 */
export const COMPANION_LIMIT = Object.freeze([1, 1, 2, 3]);

const EMPTY_TAMING = Object.freeze({ rank: 0, difficulty: 0, hpPercent: 0, damagePercent: 0 });

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

/** Сколько зверей разрешает этот ранг приручения. */
export function companionLimit(profile = EMPTY_TAMING) {
  if (Number.isInteger(profile?.limit)) return profile.limit;
  return COMPANION_LIMIT[boundedRank(profile?.rank)];
}

export function tamingProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.tamingRank);
  if (rank === 0) return EMPTY_TAMING;
  return Object.freeze({
    rank,
    // Rank one handles the meekest beast, rank three anything that grazes here.
    difficulty: rank,
    // Сколько зверей идёт следом — это тоже приручение, а не отдельный навык.
    limit: COMPANION_LIMIT[rank],
    hpPercent: COMPANION_HP_PERCENT[rank],
    damagePercent: COMPANION_DAMAGE_PERCENT[rank],
  });
}

/** What the beast is worth once it walks beside the hero. */
/**
 * Who may walk with the hero. Two kinds and one lookup: an animal you fed, and
 * a sword arm you paid for. Everything below — wounds, orders, the party limit,
 * the save — reads this and never learns there are two kinds.
 */
export function companionDefinitionById(id) {
  return mercenaryById(id) ?? passiveCreatureById(id);
}

export function companionStats({ creatureId = '', profile = EMPTY_TAMING } = {}) {
  const creature = companionDefinitionById(creatureId);
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
  const creature = companionDefinitionById(source.id);
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
  if (!companionDefinitionById(companion.id)) return false;
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
  foodCount = 0,
  party = [],
} = {}) {
  if (profile?.rank === 0) return Object.freeze({ ok: false, reason: 'rank-required' });
  if (!creature || !passiveCreatureById(creature.id)) return Object.freeze({ ok: false, reason: 'not-a-beast' });
  if (creature.defeated || creature.hunted) return Object.freeze({ ok: false, reason: 'frightened' });
  const limit = companionLimit(profile);
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

const COPY = Object.freeze({
  ru: Object.freeze({
    tame: 'Приручить',
    'rank-required': 'Нужен навык',
    'not-a-beast': 'Это не зверь',
    frightened: 'Зверь напуган',
    'already-bonded': 'Отряд уже полон',
    'too-wild': 'Слишком дикий для твоего ранга',
    'no-food': 'Нужна еда',
    'no-beast': 'Зверя нет',
    tamed: 'Зверь пошёл за тобой',
    lost: 'Зверь пал',
    modes: Object.freeze({ guard: 'Защищать', search: 'Искать', fetch: 'Приносить' }),
    names: Object.freeze({
      sheep: 'Овца', hog: 'Кабан', yak: 'Як',
      drifter: 'Бродяга', sellsword: 'Наёмный меч',
      veteran: 'Ветеранка', 'knight-errant': 'Странствующий рыцарь',
    }),
  }),
  en: Object.freeze({
    tame: 'Tame',
    'rank-required': 'The skill is required',
    'not-a-beast': 'That is not a beast',
    frightened: 'The beast is frightened',
    'already-bonded': 'The party is full',
    'too-wild': 'Too wild for your rank',
    'no-food': 'Food is required',
    'no-beast': 'There is no beast',
    tamed: 'The beast follows you',
    lost: 'Your beast has fallen',
    modes: Object.freeze({ guard: 'Defend', search: 'Search', fetch: 'Fetch' }),
    names: Object.freeze({
      sheep: 'Sheep', hog: 'Hog', yak: 'Yak',
      drifter: 'Drifter', sellsword: 'Sellsword',
      veteran: 'Veteran', 'knight-errant': 'Knight errant',
    }),
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

