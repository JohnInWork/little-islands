/**
 * Two things got welded together in the catalogue: what an item IS and what it
 * is MADE OF. "Железный шлем" is a form (helm) and a material (iron) written as
 * one name, which is why a second material on top reads as nonsense — a bone
 * iron helm. Split them and both become axes the generator can turn.
 *
 * The split also separates the two promises the game makes about gear:
 *
 *   depth  → how good it is   (affixes, their tier, their magnitude)
 *   seed   → what it looks and sounds like  (form, material)
 *
 * They must not correlate. If the picture tells you the power, there is no
 * choice left: the player takes whatever glitters. So a material scales what an
 * item already does and adds one small signature of its own — it never turns a
 * helmet into a weapon, and its flat signature is never `attack`.
 *
 * Materials are allowed to outrank each other, but only downhill: if one is
 * strictly better than another, it must also be rarer and found no shallower.
 * That is the "deeper is better" promise. Among the common, shallow materials
 * nothing dominates — they trade, they do not lose.
 */

/** Grammatical gender of the form's noun; plural is its own case in Russian. */
export const FORM_GENDERS = Object.freeze(['m', 'f', 'n', 'p']);

export const MATERIALS = Object.freeze([
  Object.freeze({
    id: 'bone',
    tint: '#e9e3cd',
    filter: 'sepia(0.55) saturate(0.55) brightness(1.18)',
    // Light and quick, and it does not take a beating.
    scale: Object.freeze({ attackSpeed: 1.35, maxHp: 0.7 }),
    stats: Object.freeze({ attackSpeed: 0.04 }),
    labels: Object.freeze({
      ru: Object.freeze({ m: 'Костяной', f: 'Костяная', n: 'Костяное', p: 'Костяные' }),
      en: 'Bone',
    }),
    weight: 9,
    minDepth: 1,
  }),
  Object.freeze({
    id: 'bronze',
    tint: '#c68b46',
    filter: 'sepia(0.9) saturate(1.9) hue-rotate(-14deg)',
    scale: Object.freeze({ attack: 0.85, defense: 0.85 }),
    stats: Object.freeze({ maxHp: 2 }),
    labels: Object.freeze({
      ru: Object.freeze({ m: 'Бронзовый', f: 'Бронзовая', n: 'Бронзовое', p: 'Бронзовые' }),
      en: 'Bronze',
    }),
    weight: 10,
    minDepth: 1,
  }),
  Object.freeze({
    id: 'iron',
    tint: '#b9bec4',
    filter: null,
    // The baseline everything else is measured against: it changes nothing.
    scale: Object.freeze({}),
    stats: Object.freeze({}),
    labels: Object.freeze({
      ru: Object.freeze({ m: 'Железный', f: 'Железная', n: 'Железное', p: 'Железные' }),
      en: 'Iron',
    }),
    weight: 12,
    minDepth: 1,
  }),
  Object.freeze({
    id: 'living-wood',
    tint: '#93b06c',
    filter: 'sepia(0.85) saturate(1.5) hue-rotate(48deg) brightness(0.95)',
    scale: Object.freeze({ maxHp: 1.4, attackSpeed: 0.9 }),
    stats: Object.freeze({ maxHp: 4 }),
    labels: Object.freeze({
      ru: Object.freeze({ m: 'Древесный', f: 'Древесная', n: 'Древесное', p: 'Древесные' }),
      en: 'Living wood',
    }),
    weight: 7,
    minDepth: 2,
  }),
  Object.freeze({
    id: 'steel',
    tint: '#dde5ee',
    filter: 'saturate(0.45) brightness(1.18) contrast(1.05)',
    scale: Object.freeze({ attack: 1.2, defense: 1.2 }),
    stats: Object.freeze({ defense: 1 }),
    labels: Object.freeze({
      ru: Object.freeze({ m: 'Стальной', f: 'Стальная', n: 'Стальное', p: 'Стальные' }),
      en: 'Steel',
    }),
    weight: 9,
    minDepth: 3,
  }),
  Object.freeze({
    id: 'silver',
    tint: '#eaf2f6',
    filter: 'saturate(0.2) brightness(1.32)',
    scale: Object.freeze({ attackSpeed: 1.2 }),
    stats: Object.freeze({ defense: 1 }),
    labels: Object.freeze({
      ru: Object.freeze({ m: 'Серебряный', f: 'Серебряная', n: 'Серебряное', p: 'Серебряные' }),
      en: 'Silver',
    }),
    weight: 6,
    minDepth: 4,
  }),
  Object.freeze({
    id: 'blackened',
    tint: '#6f747e',
    filter: 'saturate(0.3) brightness(0.62) contrast(1.2)',
    // Heavy and mean: it hits harder and slows the hand that carries it.
    scale: Object.freeze({ attack: 1.45, moveSpeed: 0.8 }),
    stats: Object.freeze({ attackSpeed: -0.03 }),
    labels: Object.freeze({
      ru: Object.freeze({ m: 'Вороной', f: 'Вороная', n: 'Вороное', p: 'Вороные' }),
      en: 'Blackened',
    }),
    weight: 5,
    minDepth: 5,
  }),
  Object.freeze({
    id: 'moonsilver',
    tint: '#cdd7ff',
    filter: 'sepia(0.5) saturate(1.7) hue-rotate(186deg) brightness(1.2)',
    scale: Object.freeze({ intelligence: 1.5 }),
    stats: Object.freeze({ intelligence: 1 }),
    labels: Object.freeze({
      ru: Object.freeze({ m: 'Лунный', f: 'Лунная', n: 'Лунное', p: 'Лунные' }),
      en: 'Moonsilver',
    }),
    weight: 4,
    minDepth: 5,
  }),
  Object.freeze({
    id: 'obsidian',
    tint: '#57506b',
    filter: 'sepia(0.65) saturate(2.3) hue-rotate(216deg) brightness(0.78)',
    scale: Object.freeze({ attack: 1.6, maxHp: 0.6 }),
    stats: Object.freeze({ maxHp: -3 }),
    labels: Object.freeze({
      ru: Object.freeze({ m: 'Обсидиановый', f: 'Обсидиановая', n: 'Обсидиановое', p: 'Обсидиановые' }),
      en: 'Obsidian',
    }),
    weight: 3,
    minDepth: 6,
  }),
]);

export const MATERIAL_IDS = Object.freeze(MATERIALS.map(({ id }) => id));

const MATERIALS_BY_ID = new Map(MATERIALS.map((material) => [material.id, material]));

export function materialById(id) {
  return MATERIALS_BY_ID.get(id) ?? null;
}

/** An item takes a material only when it declares the form it is made into. */
export function itemTakesMaterial(item) {
  return validateItemForm(item?.form);
}

export function validateItemForm(form) {
  if (form === undefined || form === null) return false;
  if (typeof form !== 'object' || Array.isArray(form)) return false;
  const keys = Object.keys(form).sort().join(',');
  if (keys !== 'en,gender,ru') return false;
  if (!FORM_GENDERS.includes(form.gender)) return false;
  return typeof form.ru === 'string' && form.ru.length > 1
    && typeof form.en === 'string' && form.en.length > 1;
}

export function validateMaterialId(materialId) {
  return materialId === null || materialId === undefined || MATERIALS_BY_ID.has(materialId);
}

/** Which materials a floor can make: the deep ones are simply not known yet. */
/**
 * A saved item may name a material only when its catalogue entry has a form to
 * make out of it. Everything else must say nothing rather than say null.
 */
export function validateItemMaterial(definition, record = {}) {
  const materialId = record?.materialId;
  if (materialId === undefined) return true;
  if (materialId === null) return !itemTakesMaterial(definition);
  return itemTakesMaterial(definition) && MATERIALS_BY_ID.has(materialId);
}

export function materialsForDepth(depth) {
  const floor = Number.isInteger(depth) && depth > 0 ? depth : 1;
  return MATERIALS.filter((material) => material.minDepth <= floor);
}

function stableHash(...parts) {
  let value = 0x811c9dc5;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index += 1) {
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 0x01000193);
    }
    value = Math.imul(value ^ (value >>> 13), 0x85ebca6b) >>> 0;
  }
  return value >>> 0;
}

/**
 * The material is a property of the instance, not of the catalogue entry: two
 * swords found on the same floor are made of different things. It is chosen by
 * a hash of the instance, so a reloaded floor hands back the same sword.
 */
export function rollMaterial({ seed, depth, instanceId, item } = {}) {
  if (!itemTakesMaterial(item)) return null;
  if (!Number.isInteger(seed) || seed < 0) throw new TypeError('Material roll requires a run seed');
  if (typeof instanceId !== 'string' || instanceId.length === 0) {
    throw new TypeError('Material roll requires a stable instance id');
  }
  const pool = materialsForDepth(depth);
  const total = pool.reduce((sum, material) => sum + material.weight, 0);
  if (total <= 0) return null;
  let cursor = stableHash('material-v1', seed, depth, instanceId, item.id) % total;
  for (const material of pool) {
    if (cursor < material.weight) return material.id;
    cursor -= material.weight;
  }
  return pool[pool.length - 1].id;
}

/**
 * What the material does to the numbers. It scales only stats the item already
 * has — bronze never gives a helmet an attack it did not have — and its own
 * flat signature lands on top.
 */
export function applyMaterialStats(stats = {}, materialId = null) {
  const material = materialById(materialId);
  if (!material) return { ...stats };
  const next = { ...stats };
  for (const [key, factor] of Object.entries(material.scale)) {
    if (!Number.isFinite(next[key]) || next[key] === 0) continue;
    const scaled = next[key] * factor;
    if (key === 'moveSpeed' || key === 'attackSpeed') {
      next[key] = Math.round(scaled * 100) / 100;
      continue;
    }
    // A reduction rounds down and an increase rounds to nearest, so that on the
    // small numbers armour actually carries, a cheap material really is cheaper
    // instead of rounding its own drawback away.
    next[key] = factor < 1 ? Math.floor(scaled) : Math.round(scaled);
  }
  // The flat signature lands even where the item had nothing of that stat —
  // that is what makes moonsilver worth noticing on an axe. It is deliberately
  // never `attack`, so no material turns armour into a weapon.
  for (const [key, value] of Object.entries(material.stats)) {
    const base = Number.isFinite(next[key]) ? next[key] : 0;
    next[key] = key === 'moveSpeed' || key === 'attackSpeed'
      ? Math.round((base + value) * 100) / 100
      : base + value;
  }
  return next;
}

/**
 * The name is assembled, not written: adjective agreeing with the form's noun,
 * then the noun. Without a material the form still names the thing, so an item
 * is never nameless.
 */
export function materialItemName(item, materialId = null, requestedLanguage = 'ru') {
  if (!itemTakesMaterial(item)) return null;
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  const form = language === 'en' ? item.form.en : item.form.ru;
  const material = materialById(materialId);
  if (!material) return capitalise(form);
  if (language === 'en') return `${material.labels.en} ${form}`;
  return `${material.labels.ru[item.form.gender]} ${form}`;
}

function capitalise(text) {
  return `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;
}

export function materialTint(materialId) {
  return materialById(materialId)?.tint ?? null;
}

/**
 * How the sprite is recoloured. Iron is the sprite as drawn, so it has no
 * filter at all: the pack's own art stays the baseline everything reads against.
 */
export function materialFilter(materialId) {
  return materialById(materialId)?.filter ?? null;
}
