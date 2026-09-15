export const ITEM_KNOWLEDGE_VERSION = 1;

export const POTION_APPEARANCES = Object.freeze([
  Object.freeze({
    id: 'ruby',
    icon: 'item/potion/ruby.png',
    name: Object.freeze({ ru: 'Алое зелье', en: 'Ruby potion' }),
  }),
  Object.freeze({
    id: 'cloudy',
    icon: 'item/potion/cloudy.png',
    name: Object.freeze({ ru: 'Мутное зелье', en: 'Cloudy potion' }),
  }),
  Object.freeze({
    id: 'golden',
    icon: 'item/potion/golden.png',
    name: Object.freeze({ ru: 'Золотистое зелье', en: 'Golden potion' }),
  }),
  Object.freeze({
    id: 'murky',
    icon: 'item/potion/murky.png',
    name: Object.freeze({ ru: 'Тёмное зелье', en: 'Murky potion' }),
  }),
  Object.freeze({
    id: 'cyan',
    icon: 'item/potion/cyan.png',
    name: Object.freeze({ ru: 'Лазурное зелье', en: 'Cyan potion' }),
  }),
  Object.freeze({
    id: 'effervescent',
    icon: 'item/potion/effervescent.png',
    name: Object.freeze({ ru: 'Шипучее зелье', en: 'Effervescent potion' }),
  }),
]);

export const POTION_APPEARANCE_PATHS = Object.freeze(
  POTION_APPEARANCES.map(({ icon }) => icon),
);

export const SCROLL_APPEARANCES = Object.freeze([
  Object.freeze({ id: 'blue-runes', icon: 'item/scroll/scroll-blue.png', name: Object.freeze({ ru: 'Свиток с синими рунами', en: 'Blue-rune scroll' }) }),
  Object.freeze({ id: 'brown-runes', icon: 'item/scroll/scroll-brown.png', name: Object.freeze({ ru: 'Свиток с бурыми рунами', en: 'Brown-rune scroll' }) }),
  Object.freeze({ id: 'green-runes', icon: 'item/scroll/scroll-green.png', name: Object.freeze({ ru: 'Свиток с зелёными рунами', en: 'Green-rune scroll' }) }),
  Object.freeze({ id: 'purple-runes', icon: 'item/scroll/scroll-purple.png', name: Object.freeze({ ru: 'Свиток с лиловыми рунами', en: 'Purple-rune scroll' }) }),
]);

export const WAND_APPEARANCES = Object.freeze([
  Object.freeze({ id: 'brass', icon: 'item/wand/gem_brass.png', name: Object.freeze({ ru: 'Латунный жезл', en: 'Brass wand' }) }),
  Object.freeze({ id: 'glass', icon: 'item/wand/gem_glass.png', name: Object.freeze({ ru: 'Стеклянный жезл', en: 'Glass wand' }) }),
  Object.freeze({ id: 'ivory', icon: 'item/wand/gem_ivory.png', name: Object.freeze({ ru: 'Костяной жезл', en: 'Ivory wand' }) }),
  Object.freeze({ id: 'silver', icon: 'item/wand/gem_silver.png', name: Object.freeze({ ru: 'Серебряный жезл', en: 'Silver wand' }) }),
]);

export const BOOK_APPEARANCES = Object.freeze([
  Object.freeze({ id: 'cloth', icon: 'item/book/cloth.png', name: Object.freeze({ ru: 'Книга в тканевом переплёте', en: 'Clothbound book' }) }),
  Object.freeze({ id: 'dark-blue', icon: 'item/book/dark_blue.png', name: Object.freeze({ ru: 'Тёмно-синяя книга', en: 'Dark blue book' }) }),
  Object.freeze({ id: 'leather', icon: 'item/book/leather.png', name: Object.freeze({ ru: 'Книга в кожаном переплёте', en: 'Leatherbound book' }) }),
  Object.freeze({ id: 'metal', icon: 'item/book/metal_cyan.png', name: Object.freeze({ ru: 'Книга в металлическом переплёте', en: 'Metalbound book' }) }),
  Object.freeze({ id: 'pale-blue', icon: 'item/book/light_blue.png', name: Object.freeze({ ru: 'Бледно-синяя книга', en: 'Pale blue book' }) }),
  Object.freeze({ id: 'violet', icon: 'item/book/purple.png', name: Object.freeze({ ru: 'Фиолетовая книга', en: 'Violet book' }) }),
  Object.freeze({ id: 'yellow', icon: 'item/book/yellow.png', name: Object.freeze({ ru: 'Жёлтая книга', en: 'Yellow book' }) }),
]);

export const IDENTIFICATION_APPEARANCES = Object.freeze({
  potion: POTION_APPEARANCES,
  scroll: SCROLL_APPEARANCES,
  wand: WAND_APPEARANCES,
  book: BOOK_APPEARANCES,
});

export const IDENTIFICATION_APPEARANCE_PATHS = Object.freeze(
  Object.values(IDENTIFICATION_APPEARANCES).flatMap((appearances) => appearances.map(({ icon }) => icon)),
);

const EMPTY_IDS = Object.freeze([]);

const normalizedIds = (values) => (
  Array.isArray(values)
    ? [...new Set(values.filter((id) => typeof id === 'string' && id.length > 0))].sort()
    : []
);

export function createItemKnowledge(source = {}) {
  return Object.freeze({
    version: ITEM_KNOWLEDGE_VERSION,
    identifiedItemIds: Object.freeze(normalizedIds(source?.identifiedItemIds)),
  });
}

export function validateItemKnowledge(knowledge, identifiableIds = EMPTY_IDS) {
  if (!knowledge || typeof knowledge !== 'object' || Array.isArray(knowledge)) return false;
  if (knowledge.version !== ITEM_KNOWLEDGE_VERSION) return false;
  if (!Array.isArray(knowledge.identifiedItemIds)) return false;
  if (knowledge.identifiedItemIds.some((id) => typeof id !== 'string' || id.length === 0 || id.length > 80)) {
    return false;
  }
  if (new Set(knowledge.identifiedItemIds).size !== knowledge.identifiedItemIds.length) return false;
  const allowed = new Set(identifiableIds);
  return knowledge.identifiedItemIds.every((id) => allowed.has(id));
}

export function identifiableItemIds(catalog = [], group = 'potion') {
  return Object.freeze(
    catalog
      .filter((item) => isIdentifiableItem(item) && (group === null || item.identification.group === group))
      .map(({ id }) => id)
      .sort(),
  );
}

export function isIdentifiableItem(item) {
  return Boolean(IDENTIFICATION_APPEARANCES[item?.identification?.group])
    && Number.isInteger(item.identification.tier)
    && item.identification.tier >= 1
    && item.identification.tier <= 3;
}

function seededRng(seed, group) {
  let state = (Number.isInteger(seed) ? seed : 0) >>> 0;
  for (const char of group) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledAppearances(seed, group) {
  const result = [...(IDENTIFICATION_APPEARANCES[group] ?? [])];
  const next = seededRng(seed, group);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(next() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function potionAppearanceFor(seed, itemId, identityIds) {
  return itemAppearanceFor(seed, 'potion', itemId, identityIds);
}

export function itemAppearanceFor(seed, group, itemId, identityIds) {
  const ids = normalizedIds(identityIds);
  const index = ids.indexOf(itemId);
  if (index < 0) return null;
  const appearances = IDENTIFICATION_APPEARANCES[group] ?? [];
  if (ids.length > appearances.length) {
    throw new RangeError(`Not enough authored ${group} appearances`);
  }
  return shuffledAppearances(seed, group)[index];
}

export function itemIdentificationView({ item, seed, knowledge, identityIds } = {}) {
  if (!isIdentifiableItem(item)) return item;
  const group = item.identification.group;
  const appearance = itemAppearanceFor(seed, group, item.id, identityIds);
  if (!appearance) throw new Error(`Missing ${group} identity mapping for ${item.id}`);
  const identified = knowledge?.identifiedItemIds?.includes(item.id) ?? false;
  if (identified) {
    return Object.freeze({ ...item, icon: appearance.icon, appearanceId: appearance.id, identified: true });
  }
  return Object.freeze({
    id: `unidentified-${group}`,
    uid: item.uid,
    stack: item.stack,
    slot: null,
    kind: group,
    rarity: 0,
    icon: appearance.icon,
    appearanceId: appearance.id,
    unknownName: appearance.name,
    unidentified: true,
  });
}

export function identifyItem(knowledge, itemId, identifiableIds) {
  if (!validateItemKnowledge(knowledge, identifiableIds)) {
    throw new TypeError('Identification requires valid item knowledge');
  }
  if (!identifiableIds.includes(itemId)) throw new Error(`Item cannot be identified: ${itemId}`);
  return createItemKnowledge({
    identifiedItemIds: [...knowledge.identifiedItemIds, itemId],
  });
}

export function appraiseItem({ knowledge, item, capabilities, identifiableIds } = {}) {
  if (!isIdentifiableItem(item)) return Object.freeze({ ok: false, reason: 'not-identifiable', knowledge });
  if (!validateItemKnowledge(knowledge, identifiableIds)) {
    return Object.freeze({ ok: false, reason: 'invalid-knowledge', knowledge });
  }
  if (knowledge.identifiedItemIds.includes(item.id)) {
    return Object.freeze({ ok: false, reason: 'already-identified', knowledge });
  }
  const tier = Number.isInteger(capabilities?.itemIdentificationTier)
    ? capabilities.itemIdentificationTier
    : 0;
  if (tier < item.identification.tier) {
    return Object.freeze({ ok: false, reason: 'rank-required', knowledge });
  }
  return Object.freeze({
    ok: true,
    reason: null,
    knowledge: identifyItem(knowledge, item.id, identifiableIds),
    itemId: item.id,
  });
}

export function potionOutcome(item) {
  if (item?.identification?.group !== 'potion' || !isIdentifiableItem(item)
    || !item.potionEffect || typeof item.potionEffect !== 'object') {
    return null;
  }
  const effect = item.potionEffect;
  if (effect.type === 'heal' && Number.isInteger(effect.amount) && effect.amount > 0) {
    return Object.freeze({ type: 'heal', amount: effect.amount });
  }
  if (effect.type === 'power' && Number.isInteger(effect.amount) && effect.amount > 0) {
    return Object.freeze({ type: 'power', amount: effect.amount });
  }
  if (effect.type === 'cleanse') {
    return Object.freeze({ type: 'cleanse' });
  }
  if (
    effect.type === 'venom'
    && Number.isInteger(effect.damage)
    && effect.damage > 0
    && Number.isFinite(effect.duration)
    && effect.duration > 0
  ) {
    return Object.freeze({ type: 'venom', damage: effect.damage, duration: effect.duration });
  }
  throw new Error(`Invalid potion effect for ${item.id}`);
}
