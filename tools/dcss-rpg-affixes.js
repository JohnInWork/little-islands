export const ITEM_AFFIX_VERSION = 1;
export const DEFAULT_AFFIX_RATE = 1;
export const MIN_AFFIX_RATE = 0;
export const MAX_AFFIX_RATE = 3;
export const MAX_RANDOM_AFFIXES = 2;
export const MAX_NEW_RANDOM_AFFIXES = 1;

const freezeAffix = (affix) => Object.freeze({
  ...affix,
  labels: Object.freeze({ ...affix.labels }),
  tags: Object.freeze([...affix.tags]),
  ...(affix.stats ? { stats: Object.freeze({ ...affix.stats }) } : {}),
  ...(affix.magic
    ? {
        magic: Object.freeze({
          ...affix.magic,
          ...(affix.magic.immunity
            ? { immunity: Object.freeze([...affix.magic.immunity]) }
            : {}),
        }),
      }
    : {}),
});

// Every entry uses mechanics already owned by the runtime. Adding an affix here
// is enough for generation, validation, stat derivation and item descriptions.
export const ITEM_AFFIXES = Object.freeze([
  freezeAffix({
    id: 'forceful',
    labels: { ru: 'мощи', en: 'of force' },
    tags: ['weapon', 'gloves', 'belt', 'jewellery'],
    stats: { attack: 2 },
    weight: 10,
  }),
  freezeAffix({
    id: 'quickened',
    labels: { ru: 'проворства', en: 'of swiftness' },
    tags: ['weapon', 'gloves', 'belt', 'boots', 'jewellery', 'focus'],
    stats: { attackSpeed: 0.06 },
    weight: 9,
  }),
  freezeAffix({
    id: 'guarded',
    labels: { ru: 'защиты', en: 'of guarding' },
    tags: ['armour', 'shield', 'focus'],
    stats: { defense: 2 },
    weight: 10,
  }),
  freezeAffix({
    id: 'vital',
    labels: { ru: 'жизни', en: 'of vitality' },
    tags: ['armour', 'shield', 'jewellery', 'focus'],
    stats: { maxHp: 8 },
    weight: 8,
  }),
  freezeAffix({
    id: 'fleet',
    labels: { ru: 'странника', en: 'of the wanderer' },
    tags: ['boots', 'cloak', 'jewellery'],
    stats: { moveSpeed: 0.07 },
    weight: 8,
  }),
  freezeAffix({
    id: 'ember-ward',
    labels: { ru: 'защиты от огня', en: 'of ember warding' },
    tags: ['armour', 'shield', 'jewellery'],
    magic: { immunity: ['burning'] },
    group: 'elemental-ward',
    weight: 4,
  }),
  freezeAffix({
    id: 'frost-ward',
    labels: { ru: 'защиты от холода', en: 'of frost warding' },
    tags: ['armour', 'shield', 'jewellery'],
    magic: { immunity: ['chilled'] },
    group: 'elemental-ward',
    weight: 4,
  }),
  freezeAffix({
    id: 'venom-ward',
    labels: { ru: 'защиты от яда', en: 'of venom warding' },
    tags: ['armour', 'shield', 'jewellery'],
    magic: { immunity: ['poison'] },
    group: 'elemental-ward',
    weight: 4,
  }),
  freezeAffix({
    id: 'reaping',
    labels: { ru: 'пожинания', en: 'of reaping' },
    tags: ['weapon', 'jewellery'],
    magic: { healOnKill: 1 },
    weight: 3,
  }),
]);

const AFFIX_BY_ID = new Map(ITEM_AFFIXES.map((affix) => [affix.id, affix]));

export function itemAffixTags(item) {
  if (!item?.slot) return Object.freeze([]);
  const tags = new Set([item.slot]);
  if (item.weaponFamily) tags.add('weapon');
  if (item.offhandKind === 'shield') tags.add('shield');
  if (['body', 'head', 'boots', 'cloak', 'gloves', 'belt'].includes(item.slot)) {
    tags.add('armour');
  }
  if (['ring1', 'ring2', 'amulet'].includes(item.slot)) tags.add('jewellery');
  return Object.freeze([...tags]);
}

export function affixById(id) {
  return AFFIX_BY_ID.get(id) ?? null;
}

function affixCompatible(item, affix) {
  const tags = itemAffixTags(item);
  if (!affix || !affix.tags.some((tag) => tags.includes(tag))) return false;
  const immunities = new Set(item.magic?.immunity ?? []);
  return !(affix.magic?.immunity ?? []).some((effect) => immunities.has(effect));
}

export function eligibleItemAffixes(item, selectedIds = []) {
  const selected = selectedIds.map(affixById).filter(Boolean);
  const selectedGroups = new Set(selected.map(({ group }) => group).filter(Boolean));
  const selectedSet = new Set(selectedIds);
  return ITEM_AFFIXES.filter((affix) => (
    !selectedSet.has(affix.id)
    && (!affix.group || !selectedGroups.has(affix.group))
    && affixCompatible(item, affix)
  ));
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

function validateRollInput({ seed, depth, instanceId, item, rate }) {
  // Depth zero is the surface, where town stock is rolled the same way.
  if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(depth) || depth < 0) {
    throw new TypeError('Affix roll requires a seed and a floor depth');
  }
  if (typeof instanceId !== 'string' || instanceId.length === 0 || !item?.slot) {
    throw new TypeError('Affix roll requires stable equipment identity');
  }
  if (!Number.isFinite(rate) || rate < MIN_AFFIX_RATE || rate > MAX_AFFIX_RATE) {
    throw new RangeError(`Affix rate must be between ${MIN_AFFIX_RATE} and ${MAX_AFFIX_RATE}`);
  }
}

function randomAffixCount(item, depth, rate, random) {
  if (rate === 0) return 0;
  const tier = Math.max(0, Math.min(3, Math.floor(item.rarity ?? 0)));
  const baseOne = [0.18, 0.28, 0.42, 0.65][tier];
  const depthOne = Math.min(0.1, Math.max(0, depth - 1) * 0.01);
  const oneChance = Math.min(0.97, (baseOne + depthOne) * rate);
  return random() < oneChance ? MAX_NEW_RANDOM_AFFIXES : 0;
}

function weightedAffix(random, candidates) {
  const total = candidates.reduce((sum, affix) => sum + affix.weight, 0);
  let roll = random() * total;
  for (const affix of candidates) {
    roll -= affix.weight;
    if (roll <= 0) return affix;
  }
  return candidates.at(-1) ?? null;
}

export function rollItemAffixes({
  seed,
  depth,
  instanceId,
  item,
  rate = DEFAULT_AFFIX_RATE,
} = {}) {
  validateRollInput({ seed, depth, instanceId, item, rate });
  const random = createStableRng(stableHash('affix-v1', seed, depth, instanceId, item.id));
  const targetCount = randomAffixCount(item, depth, rate, random);
  const selected = [];
  while (selected.length < targetCount) {
    const candidates = eligibleItemAffixes(item, selected);
    const affix = weightedAffix(random, candidates);
    if (!affix) break;
    selected.push(affix.id);
  }
  return Object.freeze(selected);
}

export function validateItemAffixIds(item, affixIds, { required = Boolean(item?.slot) } = {}) {
  if (!required && affixIds === undefined) return true;
  if (!item?.slot || !Array.isArray(affixIds) || affixIds.length > MAX_RANDOM_AFFIXES) return false;
  if (new Set(affixIds).size !== affixIds.length) return false;
  const accepted = [];
  for (const id of affixIds) {
    if (typeof id !== 'string' || !eligibleItemAffixes(item, accepted).some((affix) => affix.id === id)) {
      return false;
    }
    accepted.push(id);
  }
  return true;
}

function intrinsicPropertyCount(item) {
  return (item.magic?.immunity?.length ?? 0) + (item.magic?.healOnKill ? 1 : 0);
}

export function itemAffixRarity(item, affixIds = [], artifactPowerId = null) {
  if (!item?.slot) return item?.rarity ?? 0;
  if (artifactPowerId) return 3;
  const propertyCount = intrinsicPropertyCount(item) + affixIds.length;
  return propertyCount > 0 ? 1 : 0;
}

export function materializeItemAffixes(definition, record = {}) {
  if (!definition) return null;
  if (!definition.slot) return { ...definition, ...record };
  const affixIds = record.affixIds ?? [];
  if (!validateItemAffixIds(definition, affixIds)) {
    throw new TypeError(`Invalid affixes on ${definition.id}`);
  }
  const stats = { ...(definition.stats ?? {}) };
  const immunities = new Set(definition.magic?.immunity ?? []);
  let healOnKill = definition.magic?.healOnKill ?? 0;
  for (const id of affixIds) {
    const affix = affixById(id);
    for (const [key, value] of Object.entries(affix.stats ?? {})) {
      stats[key] = (stats[key] ?? 0) + value;
    }
    for (const effect of affix.magic?.immunity ?? []) immunities.add(effect);
    healOnKill += affix.magic?.healOnKill ?? 0;
  }
  const magic = {
    ...(definition.magic ?? {}),
    ...(immunities.size > 0 ? { immunity: [...immunities] } : {}),
    ...(healOnKill > 0 ? { healOnKill } : {}),
  };
  const {
    stats: _recordStats,
    magic: _recordMagic,
    rarity: _recordRarity,
    baseRarity: _recordBaseRarity,
    ...identity
  } = record;
  return {
    ...definition,
    ...identity,
    baseRarity: definition.rarity ?? 0,
    rarity: itemAffixRarity(definition, affixIds, record.artifactPowerId),
    affixIds: [...affixIds],
    stats,
    ...(Object.keys(magic).length > 0 ? { magic } : {}),
  };
}
