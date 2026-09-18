export const PROCEDURAL_ARTIFACT_VERSION = 1;
export const DEFAULT_ARTIFACT_RATE = 1;
export const MIN_ARTIFACT_RATE = 0;
export const MAX_ARTIFACT_RATE = 3;
export const CURSED_ARTIFACT_CHANCE = 0.2;

/**
 * An artefact is not something you trip over. It lives behind a cost: a lock
 * that wants a pick, a trap that wants a steady hand, a curse that takes
 * something on the way out, or a chest that turns out to be a mouth. A plain
 * unlocked cache never holds one, and neither does the open floor.
 */
export const ARTIFACT_CACHE_VARIANTS = Object.freeze(['locked', 'trapped', 'cursed', 'mimic']);

/** The first floor teaches; it does not hand out the run's best item. */
export const ARTIFACT_MIN_DEPTH = 2;

export function cacheCanHoldArtifact({ depth, cacheVariant } = {}) {
  return Number.isInteger(depth)
    && depth >= ARTIFACT_MIN_DEPTH
    && ARTIFACT_CACHE_VARIANTS.includes(cacheVariant);
}

const freezePower = (power) => Object.freeze({
  ...power,
  tags: Object.freeze([...power.tags]),
  suffix: Object.freeze({ ...power.suffix }),
  magic: Object.freeze({
    ...power.magic,
    ...(power.magic.immunity
      ? { immunity: Object.freeze([...power.magic.immunity]) }
      : {}),
  }),
});

const freezeCurse = (curse) => Object.freeze({
  ...curse,
  label: Object.freeze({ ...curse.label }),
  effect: Object.freeze({ ...curse.effect }),
  stats: Object.freeze({ ...curse.stats }),
});

// Major powers are binary. Their magnitude never rolls: flight is always
// flight, invisibility is always invisibility and vampirism always uses the
// one shared combat rule.
export const PROCEDURAL_ARTIFACT_POWERS = Object.freeze([
  freezePower({
    id: 'flight',
    tags: ['equipment'],
    suffix: { ru: 'Небес', en: 'of the Sky' },
    magic: { flight: true },
    weight: 5,
  }),
  freezePower({
    id: 'invisibility',
    tags: ['equipment'],
    suffix: { ru: 'Забвения', en: 'of Oblivion' },
    magic: { invisibility: true },
    weight: 4,
  }),
  freezePower({
    id: 'vampirism',
    tags: ['weapon'],
    suffix: { ru: 'Алой Жажды', en: 'of Crimson Thirst' },
    magic: { vampirism: true },
    weight: 5,
  }),
  freezePower({
    id: 'three-wards',
    tags: ['armour', 'shield', 'jewellery', 'focus'],
    suffix: { ru: 'Трёх Печатей', en: 'of the Three Seals' },
    magic: { immunity: ['burning', 'chilled', 'poison'] },
    weight: 3,
  }),
]);

// A cursed artefact is not the old hidden sanctity layer. It is an obvious,
// rare risk/reward variant: one major power plus one fixed visible drawback.
export const PROCEDURAL_ARTIFACT_CURSES = Object.freeze([
  freezeCurse({
    id: 'frailty',
    label: { ru: 'Хрупкость', en: 'Frailty' },
    effect: { ru: '−18 здоровья', en: '−18 health' },
    stats: { maxHp: -18 },
    weight: 4,
  }),
  freezeCurse({
    id: 'burden',
    label: { ru: 'Тяжесть', en: 'Burden' },
    effect: { ru: '−14% скорости движения', en: '−14% move speed' },
    stats: { moveSpeed: -0.14 },
    weight: 4,
  }),
  freezeCurse({
    id: 'exposure',
    label: { ru: 'Уязвимость', en: 'Exposure' },
    effect: { ru: '−3 защиты', en: '−3 defence' },
    stats: { defense: -3 },
    weight: 3,
  }),
]);

const POWER_BY_ID = new Map(PROCEDURAL_ARTIFACT_POWERS.map((power) => [power.id, power]));
const CURSE_BY_ID = new Map(PROCEDURAL_ARTIFACT_CURSES.map((curse) => [curse.id, curse]));

function stableHash(...parts) {
  let value = 0x811c9dc5;
  for (const character of parts.join('|')) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 0x01000193) >>> 0;
    value ^= value >>> 13;
  }
  return value >>> 0;
}

function createStableRng(seed) {
  let state = seed >>> 0 || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(random, entries) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight ?? 1), 0);
  if (entries.length === 0 || total <= 0) return null;
  let roll = random() * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight ?? 1);
    if (roll < 0) return entry;
  }
  return entries.at(-1) ?? null;
}

export function artifactPowerById(id) {
  return POWER_BY_ID.get(id) ?? null;
}

export function artifactCurseById(id) {
  return CURSE_BY_ID.get(id) ?? null;
}

export function artifactTags(item) {
  if (!item?.slot) return Object.freeze([]);
  const tags = new Set(['equipment', item.slot]);
  if (item.weaponFamily) tags.add('weapon');
  if (item.offhandKind === 'shield') tags.add('shield');
  if (item.offhandKind === 'focus') tags.add('focus');
  if (['body', 'head', 'boots', 'cloak', 'gloves', 'belt'].includes(item.slot)) {
    tags.add('armour');
  }
  if (['ring1', 'ring2', 'amulet'].includes(item.slot)) tags.add('jewellery');
  return Object.freeze([...tags]);
}

export function eligibleArtifactPowers(item) {
  const tags = artifactTags(item);
  return PROCEDURAL_ARTIFACT_POWERS.filter((power) => (
    power.tags.some((tag) => tags.includes(tag))
  ));
}

export function guaranteedArtifactDepth(seed, finalDepth = 3) {
  if (!Number.isInteger(seed) || seed < 0) throw new TypeError('Artifact schedule requires a seed');
  if (!Number.isInteger(finalDepth) || finalDepth < 1) {
    throw new TypeError('Artifact schedule requires a positive final depth');
  }
  if (finalDepth === 1) return 1;
  const firstEligibleDepth = Math.min(2, finalDepth);
  // Every floor of the dungeon can hold the promised artifact: the city is not
  // one of them any more, it is the surface above the ladder.
  const span = finalDepth - firstEligibleDepth + 1;
  return firstEligibleDepth + (stableHash('artifact-depth-v1', seed) % span);
}

function validateRoll({ seed, depth, item, instanceId, rate }) {
  if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Artifact roll requires a seed and positive depth');
  }
  if (!item?.slot || typeof instanceId !== 'string' || instanceId.length === 0) {
    throw new TypeError('Artifact roll requires stable equipment identity');
  }
  if (!Number.isFinite(rate) || rate < MIN_ARTIFACT_RATE || rate > MAX_ARTIFACT_RATE) {
    throw new RangeError(`Artifact rate must be between ${MIN_ARTIFACT_RATE} and ${MAX_ARTIFACT_RATE}`);
  }
}

export function rollProceduralArtifact({
  seed,
  depth,
  item,
  instanceId,
  guaranteed = false,
  rate = DEFAULT_ARTIFACT_RATE,
} = {}) {
  validateRoll({ seed, depth, item, instanceId, rate });
  const random = createStableRng(stableHash(
    `artifact-v${PROCEDURAL_ARTIFACT_VERSION}`,
    seed,
    depth,
    instanceId,
    item.id,
  ));
  const chance = Math.min(0.32, (0.055 + Math.min(12, depth) * 0.012) * rate);
  if (!guaranteed && (rate === 0 || random() >= chance)) {
    return Object.freeze({ artifactPowerId: null, artifactCurseId: null });
  }
  const power = weightedPick(random, eligibleArtifactPowers(item));
  if (!power) return Object.freeze({ artifactPowerId: null, artifactCurseId: null });
  const curse = random() < CURSED_ARTIFACT_CHANCE
    ? weightedPick(random, PROCEDURAL_ARTIFACT_CURSES)
    : null;
  return Object.freeze({
    artifactPowerId: power.id,
    artifactCurseId: curse?.id ?? null,
  });
}

/**
 * The cache decides whether an artefact exists before choosing which of its
 * contents becomes one. Abundance cannot multiply the chance: one cache makes
 * at most one artefact, and only a cache that cost something to open.
 */
export function rollCacheArtifact({
  seed,
  depth,
  findId,
  cacheVariant,
  items,
  guaranteed = false,
  rate = DEFAULT_ARTIFACT_RATE,
} = {}) {
  if (!Array.isArray(items)) throw new TypeError('Cache artifact roll requires container items');
  if (typeof findId !== 'string' || findId.length === 0) {
    throw new TypeError('Cache artifact roll requires a stable find id');
  }
  if (!cacheCanHoldArtifact({ depth, cacheVariant })) return null;
  const eligibleIndexes = items.flatMap((item, index) => item?.slot ? [index] : []);
  if (eligibleIndexes.length === 0 || rate === 0) return null;
  const random = createStableRng(stableHash(
    `artifact-cache-v${PROCEDURAL_ARTIFACT_VERSION}`,
    seed,
    depth,
    findId,
  ));
  // One artefact is promised per run; anything beyond it should feel like luck,
  // not like a schedule. Across eight eligible floors these odds add up to about
  // half an extra artefact, so most runs end with one and some with two.
  const cacheChance = Math.min(0.14, (0.015 + Math.min(12, depth) * 0.006) * rate);
  if (!guaranteed && random() >= cacheChance) return null;
  const itemIndex = eligibleIndexes[Math.floor(random() * eligibleIndexes.length)];
  const item = items[itemIndex];
  const instanceId = `${findId}-item-${itemIndex}`;
  return Object.freeze({
    itemIndex,
    ...rollProceduralArtifact({ seed, depth, item, instanceId, guaranteed: true, rate }),
  });
}

export function validateProceduralArtifactState(item, record = {}) {
  const powerId = record.artifactPowerId;
  const curseId = record.artifactCurseId;
  if (powerId === undefined || powerId === null) {
    return curseId === undefined || curseId === null;
  }
  const power = artifactPowerById(powerId);
  if (!power || !eligibleArtifactPowers(item).some(({ id }) => id === powerId)) return false;
  return curseId === undefined || curseId === null || Boolean(artifactCurseById(curseId));
}

export function materializeProceduralArtifact(item, record = item) {
  if (!item?.slot || !record?.artifactPowerId) return item;
  if (!validateProceduralArtifactState(item, record)) {
    throw new TypeError(`Invalid procedural artifact state on ${item.id}`);
  }
  const power = artifactPowerById(record.artifactPowerId);
  const curse = artifactCurseById(record.artifactCurseId);
  const stats = { ...(item.stats ?? {}) };
  for (const [key, value] of Object.entries(curse?.stats ?? {})) {
    stats[key] = (stats[key] ?? 0) + value;
  }
  const immunity = new Set([
    ...(item.magic?.immunity ?? []),
    ...(power.magic.immunity ?? []),
  ]);
  const magic = {
    ...(item.magic ?? {}),
    ...power.magic,
    ...(immunity.size > 0 ? { immunity: [...immunity] } : {}),
  };
  return {
    ...item,
    artifactPowerId: power.id,
    artifactCurseId: curse?.id ?? null,
    rarity: 3,
    stats,
    magic,
  };
}

export function proceduralArtifactName(item, baseName, requestedLanguage = 'ru') {
  if (!item?.artifactPowerId) return baseName;
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  const power = artifactPowerById(item.artifactPowerId);
  if (!power) return baseName;
  const powered = `${baseName} ${power.suffix[language]}`;
  if (!item.artifactCurseId) return powered;
  return language === 'ru' ? `Проклятие: ${powered}` : `Cursed ${powered}`;
}

export function artifactCursePresentation(item, requestedLanguage = 'ru') {
  const curse = artifactCurseById(item?.artifactCurseId);
  if (!curse) return null;
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  return Object.freeze({
    id: curse.id,
    label: curse.label[language],
    text: curse.effect[language],
  });
}
