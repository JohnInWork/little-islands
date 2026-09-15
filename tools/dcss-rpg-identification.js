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

export function identifiableItemIds(catalog = []) {
  return Object.freeze(
    catalog
      .filter((item) => item?.identification?.group === 'potion')
      .map(({ id }) => id)
      .sort(),
  );
}

export function isIdentifiableItem(item) {
  return item?.identification?.group === 'potion'
    && Number.isInteger(item.identification.tier)
    && item.identification.tier >= 1
    && item.identification.tier <= 3;
}

function seededRng(seed) {
  let state = (Number.isInteger(seed) ? seed : 0) >>> 0;
  state = (state ^ 0x504f544e) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledAppearances(seed) {
  const result = [...POTION_APPEARANCES];
  const next = seededRng(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(next() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function potionAppearanceFor(seed, itemId, identityIds) {
  const ids = normalizedIds(identityIds);
  const index = ids.indexOf(itemId);
  if (index < 0) return null;
  if (ids.length > POTION_APPEARANCES.length) {
    throw new RangeError('Not enough authored potion appearances');
  }
  return shuffledAppearances(seed)[index];
}

export function itemIdentificationView({ item, seed, knowledge, identityIds } = {}) {
  if (!isIdentifiableItem(item)) return item;
  const appearance = potionAppearanceFor(seed, item.id, identityIds);
  if (!appearance) throw new Error(`Missing potion identity mapping for ${item.id}`);
  const identified = knowledge?.identifiedItemIds?.includes(item.id) ?? false;
  if (identified) {
    return Object.freeze({ ...item, icon: appearance.icon, appearanceId: appearance.id, identified: true });
  }
  return Object.freeze({
    id: 'unidentified-potion',
    uid: item.uid,
    stack: item.stack,
    slot: null,
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
  if (!isIdentifiableItem(item) || !item.potionEffect || typeof item.potionEffect !== 'object') {
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
