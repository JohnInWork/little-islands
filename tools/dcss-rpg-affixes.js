import { applyMaterialStats } from './dcss-rpg-materials.js';

export const ITEM_AFFIX_VERSION = 1;
export const DEFAULT_AFFIX_RATE = 1;
export const MIN_AFFIX_RATE = 0;
export const MAX_AFFIX_RATE = 3;
export const MAX_RANDOM_AFFIXES = 2;
export const MAX_NEW_RANDOM_AFFIXES = 1;

/**
 * How far an affix can miss its own name. "Of force" used to mean exactly +2
 * attack on every sword that ever carried it, so two swords of force were the
 * same sword. Now the same affix lands anywhere in this band, which is what
 * makes one of them worth keeping and the other worth selling.
 *
 * The magnitude is not stored. It is a hash of the item's own uid, so a
 * reloaded floor hands back the same sword and the save gains no field — the
 * same trick the material and the silhouette use.
 */
export const AFFIX_SPREAD_PERCENT = Object.freeze([55, 175]);

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
    tags: ['weapon', 'armour', 'shield', 'focus'],
    stats: { defense: 2 },
    weight: 10,
  }),
  freezeAffix({
    id: 'vital',
    labels: { ru: 'жизни', en: 'of vitality' },
    tags: ['weapon', 'armour', 'shield', 'jewellery', 'focus'],
    stats: { maxHp: 8 },
    weight: 8,
  }),
  freezeAffix({
    id: 'fleet',
    labels: { ru: 'странника', en: 'of the wanderer' },
    tags: ['weapon', 'boots', 'cloak', 'jewellery'],
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
    // A trade, not a bonus: the swing lands harder and comes back slower. The
    // spread scales both halves together, so a heavy roll is heavy both ways.
    id: 'weighted',
    labels: { ru: 'тяжести', en: 'of weight' },
    tags: ['weapon', 'gloves'],
    stats: { attack: 4, attackSpeed: -0.05 },
    weight: 7,
  }),
  freezeAffix({
    id: 'arcane',
    labels: { ru: 'разума', en: 'of the mind' },
    tags: ['weapon', 'focus', 'jewellery', 'head'],
    stats: { intelligence: 2 },
    weight: 6,
  }),
  /**
   * Six that are a trade, not a bonus.
   *
   * Every affix above this line is a flat plus: more attack, more health, more
   * speed. They are fine and they are forgettable — nothing about them is a
   * decision, so a sword of force and a sword of vitality feel like the same
   * sword with a different number. These six cost something, or only pay in a
   * particular place, which is what makes picking one up a thought.
   */
  freezeAffix({
    id: 'hungry',
    labels: { ru: 'голода', en: 'of hunger' },
    tags: ['weapon', 'gloves', 'belt'],
    stats: { attack: 3 },
    magic: { appetite: 0.5 },
    weight: 5,
  }),
  freezeAffix({
    id: 'greedy',
    labels: { ru: 'скупца', en: 'of the miser' },
    tags: ['jewellery', 'belt', 'cloak'],
    magic: { greed: 0.3 },
    weight: 5,
  }),
  freezeAffix({
    id: 'bloodthirsty',
    labels: { ru: 'ярости', en: 'of fury' },
    tags: ['weapon', 'jewellery'],
    magic: { bloodlust: 0.45 },
    weight: 5,
  }),
  freezeAffix({
    id: 'riverborn',
    labels: { ru: 'речной', en: 'of the river' },
    tags: ['weapon', 'boots', 'cloak'],
    magic: { riverborn: 0.35 },
    weight: 5,
  }),
  freezeAffix({
    id: 'reckless',
    labels: { ru: 'безрассудства', en: 'of recklessness' },
    tags: ['weapon', 'armour', 'gloves'],
    stats: { attack: 5, defense: -4 },
    weight: 5,
  }),
  freezeAffix({
    id: 'tireless',
    labels: { ru: 'неутомимости', en: 'of the long road' },
    tags: ['armour', 'boots', 'belt', 'cloak'],
    stats: { attackSpeed: -0.04 },
    magic: { satiety: 0.35 },
    weight: 5,
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

/**
 * What the affixes call the thing. Every affix in this file has carried a name
 * since the day it was written — "мощи", "of force" — and nothing ever drew it:
 * an enchanted sword differed from a plain one only by its numbers. Now the
 * name says it, which is the whole point of an affix having one.
 */
export function affixSuffix(affixIds = [], language = 'ru') {
  const labels = affixIds
    .map((id) => affixById(id)?.labels?.[language === 'en' ? 'en' : 'ru'])
    .filter(Boolean);
  if (labels.length === 0) return '';
  if (language === 'en') {
    // "of force" and "of swiftness" collapse into one "of": one preposition is
    // a name, two is a list.
    const stripped = labels.map((label) => label.replace(/^of /, ''));
    return ` of ${stripped.join(' and ')}`;
  }
  return ` ${labels.join(' и ')}`;
}

function spreadHash(text) {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return (value ^ (value >>> 15)) >>> 0;
}

/**
 * What this particular affix is worth on this particular item. Rounds away from
 * zero so a small stat never quietly rounds down to nothing — an affix that
 * gives +0 is an affix that lies in the item card.
 */
export function affixStats(affix, instanceId = '') {
  if (!affix?.stats) return {};
  const [low, high] = AFFIX_SPREAD_PERCENT;
  const percent = low + (spreadHash(`${instanceId}:${affix.id}`) % (high - low + 1));
  const rolled = {};
  for (const [key, value] of Object.entries(affix.stats)) {
    const scaled = (value * percent) / 100;
    rolled[key] = key === 'moveSpeed' || key === 'attackSpeed'
      ? Math.round(scaled * 100) / 100
      : Math.sign(value) * Math.max(1, Math.round(Math.abs(scaled)));
  }
  return rolled;
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
  // What the thing is made of shapes what it already does, before anything is
  // enchanted onto it: an affix improves a bronze sword, not an abstract one.
  const stats = applyMaterialStats(definition.stats ?? {}, record.materialId ?? null);
  const immunities = new Set(definition.magic?.immunity ?? []);
  let healOnKill = definition.magic?.healOnKill ?? 0;
  // Anything an affix says about the wearer beyond flat stats. The first three
  // affixes only ever needed wards and healing, so those two were spelled out
  // and the rest of the field was dropped on the floor — which meant a new
  // affix could promise something and quietly do nothing.
  const traits = {};
  for (const id of affixIds) {
    const affix = affixById(id);
    for (const [key, value] of Object.entries(affixStats(affix, record.uid ?? ''))) {
      stats[key] = (stats[key] ?? 0) + value;
    }
    for (const effect of affix.magic?.immunity ?? []) immunities.add(effect);
    healOnKill += affix.magic?.healOnKill ?? 0;
    for (const [key, value] of Object.entries(affix.magic ?? {})) {
      if (key === 'immunity' || key === 'healOnKill') continue;
      traits[key] = typeof value === 'number' ? (traits[key] ?? 0) + value : value;
    }
  }
  const magic = {
    ...(definition.magic ?? {}),
    ...traits,
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
