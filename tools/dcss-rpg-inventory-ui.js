export const INVENTORY_FILTERS = Object.freeze([
  'all',
  'equipped',
  'weapons',
  'armour',
  'jewellery',
  'consumables',
]);

export const EQUIPMENT_SLOT_ORDER = Object.freeze([
  'hand1',
  'hand2',
  'body',
  'head',
  'cloak',
  'gloves',
  'belt',
  'boots',
  'ring1',
  'ring2',
  'amulet',
]);

const ARMOUR_SLOTS = new Set(['hand2', 'body', 'head', 'cloak', 'gloves', 'belt', 'boots']);
const JEWELLERY_SLOTS = new Set(['ring1', 'ring2', 'amulet']);

const SECTION_COPY = Object.freeze({
  ru: Object.freeze({
    equipped: 'Надето',
    weapons: 'Оружие',
    armour: 'Броня',
    jewellery: 'Украшения',
    consumables: 'Расходуемое',
  }),
  en: Object.freeze({
    equipped: 'Equipped',
    weapons: 'Weapons',
    armour: 'Armour',
    jewellery: 'Jewellery',
    consumables: 'Consumables',
  }),
});

export function inventoryCategory(item) {
  if (!item?.slot) return 'consumables';
  if (item.slot === 'hand1') return 'weapons';
  if (JEWELLERY_SLOTS.has(item.slot)) return 'jewellery';
  if (ARMOUR_SLOTS.has(item.slot)) return 'armour';
  return 'consumables';
}

function itemMapFrom(items) {
  return items instanceof Map ? items : new Map((items ?? []).map((item) => [item.uid, item]));
}

export function inventorySections({
  inventory = [],
  equipment = {},
  items = [],
  filter = 'all',
  language = 'ru',
  includeEquipped = true,
} = {}) {
  const locale = language === 'en' ? 'en' : 'ru';
  const activeFilter = INVENTORY_FILTERS.includes(filter) ? filter : 'all';
  const itemByUid = itemMapFrom(items);
  const sections = [];

  if (includeEquipped && (activeFilter === 'all' || activeFilter === 'equipped')) {
    const entries = EQUIPMENT_SLOT_ORDER.flatMap((slot) => {
      const item = itemByUid.get(equipment[slot]);
      return item ? [{ item, source: 'equipment', slot }] : [];
    });
    if (entries.length > 0) sections.push({ id: 'equipped', entries });
  }

  if (activeFilter !== 'equipped') {
    const packed = inventory.flatMap((uid, index) => {
      const item = itemByUid.get(uid);
      return item ? [{ item, source: 'pack', index, category: inventoryCategory(item) }] : [];
    });
    for (const category of ['weapons', 'armour', 'jewellery', 'consumables']) {
      if (activeFilter !== 'all' && activeFilter !== category) continue;
      const entries = packed.filter((entry) => entry.category === category);
      if (entries.length > 0) sections.push({ id: category, entries });
    }
  }

  return Object.freeze(sections.map((section) => Object.freeze({
    id: section.id,
    title: SECTION_COPY[locale][section.id],
    entries: Object.freeze(section.entries.map((entry) => Object.freeze(entry))),
  })));
}

/**
 * Когда фильтры и переключатель вида перестают быть лишними.
 *
 * Иван, посмотрев на рюкзак с телефона: «интерфейс перегружен». Считать
 * кнопки было бесполезно — их двадцать, как и в любом рогалике. Перегружало
 * другое: над **двумя** предметами висели семь управляющих кнопок — два вида
 * отображения и пять вкладок-фильтров. Фильтр по двум вещам не экономит ни
 * одного движения, он только занимает верх экрана и просит разобраться.
 *
 * Порог в восемь вещей взят по экрану: до восьми рюкзак помещается целиком и
 * искать в нём нечего, с восьми начинается прокрутка — и вот тогда и вкладка,
 * и таблица впервые окупаются.
 */
export const INVENTORY_CONTROLS_THRESHOLD = 8;

export function inventoryControlsUseful(count) {
  return Number.isInteger(count) && count >= INVENTORY_CONTROLS_THRESHOLD;
}
