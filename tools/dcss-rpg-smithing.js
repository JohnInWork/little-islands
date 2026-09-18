/**
 * Reforging. A smith does not make a blade stronger — a blade is what it is.
 * A smith changes what it is *for*: weight for speed, plate for footwork.
 *
 * One field on the item record carries the choice, and it can always be undone,
 * because a reforge is a shape, not a scar.
 */

/** The two ways a weapon can be rehung, and the two a harness can be rebuilt. */
export const REFORGE_KINDS = Object.freeze({
  heavy: Object.freeze({ id: 'heavy', family: 'weapon', labels: Object.freeze({ ru: 'Тяжелее', en: 'Heavier' }) }),
  swift: Object.freeze({ id: 'swift', family: 'weapon', labels: Object.freeze({ ru: 'Быстрее', en: 'Swifter' }) }),
  plated: Object.freeze({ id: 'plated', family: 'armor', labels: Object.freeze({ ru: 'Крепче', en: 'Sturdier' }) }),
  nimble: Object.freeze({ id: 'nimble', family: 'armor', labels: Object.freeze({ ru: 'Легче', en: 'Lighter' }) }),
});

/** Hammering a piece back to the shape it left the smith with. */
export const PLAIN_REFORGE = Object.freeze({
  id: 'plain',
  family: 'any',
  labels: Object.freeze({ ru: 'Как было', en: 'As it was' }),
});

export const REFORGE_IDS = Object.freeze(Object.keys(REFORGE_KINDS));

/** The shape a record carries, whichever form it is stored in. */
function shapeOf(item) {
  const reforge = item?.reforge;
  if (!reforge) return null;
  return typeof reforge === 'string' ? reforge : reforge.kind ?? null;
}

/** What each rank moves. The trade is always real: one number up, one down. */
export const REFORGE_STEPS = Object.freeze({
  heavy: Object.freeze([null,
    Object.freeze({ attack: 1, attackSpeed: -0.05 }),
    Object.freeze({ attack: 2, attackSpeed: -0.08 }),
    Object.freeze({ attack: 3, attackSpeed: -0.1 }),
  ]),
  swift: Object.freeze([null,
    Object.freeze({ attack: -1, attackSpeed: 0.06 }),
    Object.freeze({ attack: -1, attackSpeed: 0.1 }),
    Object.freeze({ attack: -2, attackSpeed: 0.16 }),
  ]),
  plated: Object.freeze([null,
    Object.freeze({ defense: 1, moveSpeed: -0.04 }),
    Object.freeze({ defense: 2, moveSpeed: -0.06 }),
    Object.freeze({ defense: 3, moveSpeed: -0.08 }),
  ]),
  nimble: Object.freeze([null,
    Object.freeze({ defense: -1, moveSpeed: 0.05 }),
    Object.freeze({ defense: -1, moveSpeed: 0.08 }),
    Object.freeze({ defense: -2, moveSpeed: 0.12 }),
  ]),
});

/** The fire costs essence; a better smith wastes less of it. */
export const REFORGE_ESSENCE_COST = Object.freeze([0, 3, 2, 2]);

/** Slots a weaponsmith may touch, and slots an armourer may. */
export const WEAPON_SLOTS = Object.freeze(['hand1', 'hand2']);
export const ARMOR_SLOTS = Object.freeze(['body', 'head', 'hands', 'boots', 'cloak']);

const EMPTY_SMITH = Object.freeze({ rank: 0, cost: 0 });

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

function profileFor(rank) {
  if (rank === 0) return EMPTY_SMITH;
  return Object.freeze({ rank, cost: REFORGE_ESSENCE_COST[rank] });
}

export function weaponSmithProfile(capabilities = {}) {
  return profileFor(boundedRank(capabilities.weaponsmithingRank));
}

export function armorSmithProfile(capabilities = {}) {
  return profileFor(boundedRank(capabilities.armorsmithingRank));
}

/** Which family this piece belongs to, or null for anything that is not gear. */
export function reforgeFamily(item) {
  if (!item?.slot) return null;
  if (WEAPON_SLOTS.includes(item.slot) && item.stats?.attack !== undefined) return 'weapon';
  if (ARMOR_SLOTS.includes(item.slot)) return 'armor';
  return null;
}

/** The shapes this piece could take next, given who is holding the hammer. */
/** The ring of shapes for this piece: its two forms, and plain steel. */
function reforgeRing(item) {
  const family = reforgeFamily(item);
  if (!family) return [];
  return [
    ...REFORGE_IDS.map((id) => REFORGE_KINDS[id]).filter((kind) => kind.family === family),
    // A reforged piece can always be hammered back to plain steel.
    PLAIN_REFORGE,
  ];
}

export function reforgeOptions({ item = null, weapon = EMPTY_SMITH, armor = EMPTY_SMITH } = {}) {
  const family = reforgeFamily(item);
  if (!family) return [];
  const profile = family === 'weapon' ? weapon : armor;
  if (profile.rank === 0) return [];
  const current = shapeOf(item) ?? PLAIN_REFORGE.id;
  return reforgeRing(item).filter((kind) => kind.id !== current);
}

/** The next shape in the ring, including the plain one the piece started as. */
export function nextReforge({ item = null, weapon = EMPTY_SMITH, armor = EMPTY_SMITH } = {}) {
  const family = reforgeFamily(item);
  if (!family) return null;
  const profile = family === 'weapon' ? weapon : armor;
  if (profile.rank === 0) return null;
  // One button walks the ring: heavy, swift, plain, heavy again.
  const ring = reforgeRing(item);
  const current = shapeOf(item) ?? PLAIN_REFORGE.id;
  const index = ring.findIndex((kind) => kind.id === current);
  return ring[(index + 1) % ring.length] ?? null;
}

export function canReforge({
  item = null,
  kind = '',
  essence = 0,
  weapon = EMPTY_SMITH,
  armor = EMPTY_SMITH,
} = {}) {
  const family = reforgeFamily(item);
  if (!family) return Object.freeze({ ok: false, reason: 'not-gear' });
  const profile = family === 'weapon' ? weapon : armor;
  if (profile.rank === 0) return Object.freeze({ ok: false, reason: 'rank-required' });
  if (item.artifactPowerId) return Object.freeze({ ok: false, reason: 'artifact' });
  const shape = kind === PLAIN_REFORGE.id ? PLAIN_REFORGE : REFORGE_KINDS[kind];
  if (!shape || (shape.family !== 'any' && shape.family !== family)) {
    return Object.freeze({ ok: false, reason: 'wrong-shape' });
  }
  const current = shapeOf(item);
  if (shape.id === (current ?? PLAIN_REFORGE.id)) return Object.freeze({ ok: false, reason: 'already-shaped' });
  if (essence < profile.cost) {
    return Object.freeze({ ok: false, reason: 'no-essence', cost: profile.cost });
  }
  return Object.freeze({ ok: true, reason: 'ready', cost: profile.cost, kind: shape.id, rank: profile.rank });
}

export function reforgeItem(options = {}) {
  const decision = canReforge(options);
  if (!decision.ok) return decision;
  return Object.freeze({
    ...decision,
    reason: 'reforged',
    essence: Math.max(0, (options.essence ?? 0) - decision.cost),
    // Plain steel is stored as no shape at all, not as a shape called plain.
    reforge: decision.kind === PLAIN_REFORGE.id ? null : { kind: decision.kind, rank: decision.rank },
  });
}

export function createReforgeState(source = null) {
  if (!source || typeof source !== 'object') return null;
  const kind = REFORGE_KINDS[source.kind];
  const rank = boundedRank(source.rank);
  if (!kind || rank === 0) return null;
  return { kind: kind.id, rank };
}

export function validateReforgeState(definition, record) {
  const reforge = record?.reforge;
  if (reforge === undefined || reforge === null) return true;
  if (typeof reforge !== 'object' || Array.isArray(reforge)) return false;
  if (Object.keys(reforge).sort().join(',') !== 'kind,rank') return false;
  const kind = REFORGE_KINDS[reforge.kind];
  if (!kind || !Number.isInteger(reforge.rank) || reforge.rank < 1 || reforge.rank > 3) return false;
  // A shape only fits the family it was made for.
  return kind.family === reforgeFamily(definition);
}

/** The piece as it is carried: base numbers plus whatever the hammer moved. */
export function applyReforge(item, record = null) {
  const reforge = createReforgeState(record?.reforge ?? item?.reforge);
  if (!item || !reforge) return item;
  const step = REFORGE_STEPS[reforge.kind][reforge.rank];
  const stats = { ...(item.stats ?? {}) };
  for (const [key, value] of Object.entries(step)) {
    stats[key] = Number(((stats[key] ?? 0) + value).toFixed(3));
  }
  return { ...item, stats, reforge };
}

const COPY = Object.freeze({
  ru: Object.freeze({
    reforge: 'Перековать',
    'not-gear': 'Перековывают только снаряжение',
    'rank-required': 'Нужен кузнечный навык',
    artifact: 'Артефакт не перекуёшь',
    'wrong-shape': 'Такая форма не для этой вещи',
    'already-shaped': 'Вещь уже такая',
    'no-essence': 'Не хватает эссенции',
    reforged: 'Перековано',
    shape: (label, cost) => `${label} · ${cost} ◈`,
  }),
  en: Object.freeze({
    reforge: 'Reforge',
    'not-gear': 'Only gear can be reforged',
    'rank-required': 'A smithing skill is required',
    artifact: 'An artifact cannot be reforged',
    'wrong-shape': 'That shape is not for this piece',
    'already-shaped': 'The piece is already like that',
    'no-essence': 'Not enough essence',
    reforged: 'Reforged',
    shape: (label, cost) => `${label} · ${cost} ◈`,
  }),
});

export function smithingCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function smithingRefusalText(reason, language = 'ru') {
  const table = smithingCopy(language);
  return typeof table[reason] === 'string' ? table[reason] : '';
}

export function reforgeLabel(kind, language = 'ru') {
  const shape = kind === PLAIN_REFORGE.id ? PLAIN_REFORGE : REFORGE_KINDS[kind];
  return shape ? shape.labels[language === 'en' ? 'en' : 'ru'] : '';
}
