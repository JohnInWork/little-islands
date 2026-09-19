/**
 * Marks: the same creature, met differently.
 *
 * The items in this game are procedural — a sword is a base, a material, up to
 * two affixes and maybe an artefact power, which is fifty-odd thousand things a
 * player might pick up. A monster was none of that. Sixty creatures in the
 * catalogue, about thirty met per run, and the second run met the same thirty
 * with bigger numbers. That gap is the most noticeable thing about the game
 * after two hours: the loot keeps surprising you and the fights stop.
 *
 * A mark closes it with the trick the items already use. It is derived from the
 * seed, never stored, and it is applied to the DEFINITION before the runtime
 * builds the creature — so everything downstream reads it without knowing marks
 * exist. Four of the nine do nothing but set a field the game already reads:
 * `inflicts`, `burst`, `shock`, `large` were all there, used by a handful of
 * hand-authored creatures.
 *
 * Three rules hold it honest:
 *
 * - **A mark changes the fight, not the number.** «Half again the health» is
 *   arithmetic; «it poisons you and bursts when it dies» is a different fight.
 * - **You can see it before it reaches you.** Every mark carries a tint, and
 *   the ones that change size change size. A surprise you could not have read
 *   is not difficulty, it is a dice roll.
 * - **Never on someone who is already special.** Guardians, the city watch and
 *   unique creatures take no marks: a marked guardian is a guardian whose own
 *   design is being talked over, and a rabid town priest is nonsense.
 */

import { ACTOR_EFFECTS } from './dcss-rpg-effects.js';

/** Below this the dungeon teaches; marks start once the hero can read a fight. */
export const MARK_MIN_DEPTH = 3;
export const MARK_BASE_CHANCE = 0.04;
export const MARK_CHANCE_PER_FLOOR = 0.022;
export const MARK_MAX_CHANCE = 0.34;

const freezeMark = (mark) => Object.freeze({
  ...mark,
  labels: Object.freeze({ ...mark.labels }),
  ...(mark.grants ? { grants: Object.freeze({ ...mark.grants }) } : {}),
  ...(mark.scale ? { scale: Object.freeze({ ...mark.scale }) } : {}),
});

/**
 * Nine of them. Each one reaches a rule the runtime already owns, and each one
 * says what it is from across the room.
 */
export const MONSTER_MARKS = Object.freeze([
  /**
   * The tints all start with `sepia(1)`, and that is the whole lesson of this
   * table. The first draft used `hue-rotate` alone, which does exactly nothing
   * to a grey pixel — and half the creature sprites in this library are grey or
   * brown. Measured on four of them, the plagued mark moved the average colour
   * by two units out of 255: invisible. Forcing a colour first and moving it
   * second works on anything.
   *
   * Calibrated against `mon/animals/spider.png`, `mon/goblin.png`,
   * `mon/undead/revenant.png` and `mon/animals/wolf.png`: every mark shifts the
   * sprite by at least 28 units on the sprite it shows up worst on, and the
   * closest two marks to each other are «опалённый» and «матёрый» — which also
   * differ in size, so they never collapse.
   */
  freezeMark({
    id: 'hardened',
    labels: { ru: 'закалённый', en: 'hardened' },
    // Cold steel: the one that must never read as merely «dark».
    filter: 'brightness(1.02) sepia(1) saturate(1.15) hue-rotate(185deg) contrast(1.2)',
    scale: { hp: 1.7, speed: 0.86 },
    weight: 10,
  }),
  freezeMark({
    id: 'rabid',
    labels: { ru: 'бешеный', en: 'rabid' },
    filter: 'brightness(0.9) sepia(1) saturate(7) hue-rotate(-55deg)',
    scale: { hp: 0.7, speed: 1.3, attackRate: 1.28 },
    weight: 10,
  }),
  freezeMark({
    id: 'plagued',
    labels: { ru: 'чумной', en: 'plagued' },
    filter: 'brightness(0.95) sepia(1) saturate(5) hue-rotate(55deg)',
    // Both fields already exist: the tomb revenant is built out of them.
    grants: {
      inflicts: { id: 'poison', duration: 6 },
      burst: { id: 'poison', duration: 5, radius: 1.6, color: '#9fb06a' },
    },
    scale: { hp: 1.15 },
    weight: 8,
  }),
  freezeMark({
    id: 'searing',
    labels: { ru: 'опалённый', en: 'searing' },
    filter: 'brightness(1.15) sepia(1) saturate(7) hue-rotate(10deg)',
    grants: { inflicts: { id: 'burning', duration: 5 }, immunity: ['burning'] },
    scale: { damage: 1.1 },
    weight: 8,
  }),
  freezeMark({
    id: 'frostbound',
    labels: { ru: 'стылый', en: 'frostbound' },
    filter: 'brightness(1.15) sepia(1) saturate(4) hue-rotate(150deg)',
    grants: { inflicts: { id: 'chilled', duration: 6 }, immunity: ['chilled', 'frozen'] },
    scale: { hp: 1.2, speed: 0.94 },
    weight: 8,
  }),
  freezeMark({
    id: 'storm',
    labels: { ru: 'громовой', en: 'storm-touched' },
    filter: 'brightness(1) sepia(1) saturate(6) hue-rotate(215deg)',
    // Water already carries a shock between everything standing in it.
    grants: { shock: { damage: 4, duration: 3 } },
    scale: { speed: 1.08 },
    weight: 6,
  }),
  freezeMark({
    id: 'elder',
    labels: { ru: 'матёрый', en: 'elder' },
    filter: 'brightness(1.12) sepia(1) saturate(3.4) hue-rotate(-12deg)',
    // The one mark you read by silhouette before you read it by colour.
    grants: { large: true },
    scale: { hp: 1.6, damage: 1.35, xp: 2, speed: 0.96 },
    weight: 6,
  }),
  freezeMark({
    id: 'mirrored',
    labels: { ru: 'зеркальный', en: 'mirrored' },
    filter: 'brightness(1.65) saturate(0.06) contrast(1.15)',
    // Thorns, pointed the other way: hitting it in melee costs something.
    grants: { reflect: 24 },
    scale: { hp: 1.25, damage: 0.85 },
    weight: 6,
  }),
  freezeMark({
    id: 'shadow',
    labels: { ru: 'теневой', en: 'shadowed' },
    filter: 'brightness(0.4) saturate(0.45)',
    grants: { dim: 0.62 },
    scale: { vision: 1.4, pursuit: 1.5, speed: 1.12, hp: 0.85 },
    weight: 6,
  }),
]);

const MARK_BY_ID = new Map(MONSTER_MARKS.map((mark) => [mark.id, mark]));
const TOTAL_WEIGHT = MONSTER_MARKS.reduce((sum, mark) => sum + mark.weight, 0);

export function markById(id) {
  return MARK_BY_ID.get(id) ?? null;
}

/**
 * Who may never be marked. A guardian already has a design of its own and a
 * mark would talk over it; the city watch and the priest are residents, not
 * encounters; a mimic is a chest and reads as one on purpose.
 */
export function monsterTakesMark(definition) {
  return Boolean(definition)
    && definition.boss !== true
    && definition.unique !== true
    && definition.neutral !== true
    && definition.spawn !== 'city';
}

/** How much of a floor is marked. Rises with depth, then stops. */
export function markChanceAtDepth(depth) {
  if (!Number.isInteger(depth) || depth < MARK_MIN_DEPTH) return 0;
  return Math.min(
    MARK_MAX_CHANCE,
    MARK_BASE_CHANCE + (depth - MARK_MIN_DEPTH) * MARK_CHANCE_PER_FLOOR,
  );
}

function stableHash(...parts) {
  let value = 0x811c9dc5;
  for (const character of parts.join('|')) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 0x01000193) >>> 0;
    value ^= value >>> 13;
  }
  return value >>> 0;
}

/**
 * Which mark this particular creature carries, or null. Seeded from the floor
 * and the creature's own instance id, so a reloaded floor hands back the same
 * fight and the save gains no field — the same trick the material on a sword
 * and the affix on a helmet already use.
 */
export function markForSpawn({ seed, depth, instanceId, definition } = {}) {
  if (!monsterTakesMark(definition)) return null;
  if (!Number.isInteger(seed) || !Number.isInteger(depth) || typeof instanceId !== 'string') {
    return null;
  }
  const chance = markChanceAtDepth(depth);
  if (chance <= 0) return null;
  const roll = stableHash('monster-mark-v1', seed, depth, instanceId) / 0xffffffff;
  if (roll >= chance) return null;
  // A second, independent draw picks which one, so raising the rate never
  // reshuffles who gets what.
  let ticket = (stableHash('monster-mark-pick-v1', seed, depth, instanceId) % TOTAL_WEIGHT);
  for (const mark of MONSTER_MARKS) {
    ticket -= mark.weight;
    if (ticket < 0) return mark;
  }
  return MONSTER_MARKS[MONSTER_MARKS.length - 1];
}

/**
 * The marked creature, as a definition. Everything downstream — threat curves,
 * spawning, the billboard, the death screen — reads this and never learns that
 * marks exist.
 */
export function applyMark(definition, mark) {
  if (!definition || !mark) return definition;
  const scale = mark.scale ?? {};
  const grants = mark.grants ?? {};
  const threat = { ...definition.threat };
  if (scale.attackRate) threat.attackRate = round(threat.attackRate * scale.attackRate);
  if (scale.vision) threat.vision = round(threat.vision * scale.vision);
  if (scale.pursuit) threat.pursuit = round(threat.pursuit * scale.pursuit);
  return Object.freeze({
    ...definition,
    ...grants,
    hp: Math.max(1, Math.round(definition.hp * (scale.hp ?? 1))),
    damage: Math.max(1, Math.round(definition.damage * (scale.damage ?? 1))),
    speed: round(definition.speed * (scale.speed ?? 1)),
    xp: Math.max(1, Math.round(definition.xp * (scale.xp ?? 1))),
    threat: Object.freeze(threat),
    markId: mark.id,
    markFilter: mark.filter,
  });
}

const round = (value) => Math.round(value * 1000) / 1000;

/**
 * The name, with the mark agreeing with it.
 *
 * Russian adjectives decline, so «бешеный» in front of «Летучая мышь» would be
 * wrong. The gender is read off the head word of the written name — the first
 * token, which is the adjective when there is one and the noun when there is
 * not — and that is right for all sixty creatures the game ships. A creature
 * whose name breaks the rule goes in the exception table rather than into a
 * heuristic nobody can see.
 */
export const MONSTER_GENDER_EXCEPTIONS = Object.freeze({});

export function monsterGender(name) {
  if (typeof name !== 'string' || name.length === 0) return 'm';
  if (MONSTER_GENDER_EXCEPTIONS[name]) return MONSTER_GENDER_EXCEPTIONS[name];
  const head = name.split(/\s+/)[0];
  if (/[ая]$/i.test(head)) return 'f';
  if (/[ое]$/i.test(head)) return 'n';
  return 'm';
}

/**
 * The three adjective endings Russian needs here. A hard stem in `-ый` and a
 * stressed one in `-ой` agree the same way apart from the masculine itself;
 * a soft stem in `-ий` takes its own set. Written out rather than guessed,
 * because «теневойый» is what guessing looks like.
 */
const RU_ENDINGS = Object.freeze({
  ый: Object.freeze({ m: 'ый', f: 'ая', n: 'ое' }),
  ой: Object.freeze({ m: 'ой', f: 'ая', n: 'ое' }),
  ий: Object.freeze({ m: 'ий', f: 'яя', n: 'ее' }),
});

export function markedMonsterName(name, markId, language = 'ru') {
  const mark = markById(markId);
  if (!mark || typeof name !== 'string' || name.length === 0) return name;
  if (language === 'en') return `${mark.labels.en} ${name.toLowerCase()}`;
  const gender = monsterGender(name);
  const base = mark.labels.ru;
  const match = /(ый|ой|ий)$/.exec(base);
  if (!match) return `${base} ${name.toLowerCase()}`;
  const adjective = `${base.slice(0, -2)}${RU_ENDINGS[match[1]][gender]}`;
  return `${adjective.charAt(0).toUpperCase()}${adjective.slice(1)} ${name.toLowerCase()}`;
}

/** What the mark does, in words, for the panel that names the creature. */
export function markEffects(markId, language = 'ru') {
  const mark = markById(markId);
  if (!mark) return [];
  const ru = language !== 'en';
  const rows = [];
  const say = (text) => rows.push(text);
  const scale = mark.scale ?? {};
  const grants = mark.grants ?? {};
  const percent = (value) => `${value > 1 ? '+' : '−'}${Math.round(Math.abs(value - 1) * 100)}%`;
  if (scale.hp) say(ru ? `здоровье ${percent(scale.hp)}` : `health ${percent(scale.hp)}`);
  if (scale.damage) say(ru ? `урон ${percent(scale.damage)}` : `damage ${percent(scale.damage)}`);
  if (scale.speed) say(ru ? `скорость ${percent(scale.speed)}` : `speed ${percent(scale.speed)}`);
  if (scale.attackRate) say(ru ? `частота ударов ${percent(scale.attackRate)}` : `attack rate ${percent(scale.attackRate)}`);
  if (grants.inflicts) {
    const label = ACTOR_EFFECTS[grants.inflicts.id]?.labels?.[ru ? 'ru' : 'en'] ?? grants.inflicts.id;
    say(ru ? `накладывает «${label}»` : `inflicts ${label.toLowerCase()}`);
  }
  if (grants.burst) say(ru ? 'взрывается ядом, когда падает' : 'bursts into poison when it falls');
  if (grants.shock) say(ru ? 'бьёт током через воду' : 'shocks through water');
  if (grants.reflect) say(ru ? `возвращает ${grants.reflect}% урона в ближнем бою` : `returns ${grants.reflect}% of melee damage`);
  if (grants.large) say(ru ? 'крупнее своего вида' : 'larger than its kind');
  if (grants.dim) say(ru ? 'держится в темноте' : 'keeps to the dark');
  return rows;
}
