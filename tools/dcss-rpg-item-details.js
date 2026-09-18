import {
  generatedItemDescription,
  itemDescriptionLanguages,
} from './dcss-rpg-item-description.js';
import { proceduralArtifactName } from './dcss-rpg-artifacts.js';

const RUSSIAN_NAMES = Object.freeze({
  'short-blade': 'Короткий клинок',
  'camp-kit': 'Походный набор',
  'bone-dirk': 'Костяной кинжал',
  'spriggan-knife': 'Нож спригана',
  'oak-club': 'Дубовая палица',
  'iron-mace': 'Железная булава',
  'morning-star': 'Моргенштерн',
  'hunting-spear': 'Охотничье копьё',
  'war-pike': 'Боевая пика',
  'short-bow': 'Короткий лук',
  'light-crossbow': 'Лёгкий арбалет',
  'long-sword': 'Длинный меч',
  'duelist-rapier': 'Рапира дуэлянта',
  'iron-falchion': 'Железный фальшион',
  'dungeon-greatsword': 'Подземный двуручник',
  'sword-of-power': 'Меч силы',
  'executioner-axe': 'Топор палача',
  'skull-staff': 'Черепной посох',
  'war-axe': 'Боевой топор',
  'storm-trident': 'Штормовой трезубец',
  firestarter: 'Пробудитель огня',
  longbow: 'Длинный лук',
  'heavy-leather': 'Тяжёлая кожа',
  'black-plate': 'Чёрный доспех',
  'shadow-scales': 'Теневая чешуя',
  'runic-robe': 'Руническая мантия',
  'half-plate': 'Полулаты',
  'blood-robe': 'Кровавая мантия',
  'silver-scales': 'Серебряная чешуя',
  'living-vines': 'Живые лозы',
  'iron-helm': 'Железный шлем',
  'horned-helm': 'Рогатый шлем',
  'golden-viking': 'Золотой шлем',
  'ancient-crown': 'Древняя корона',
  jackboots: 'Походные сапоги',
  'green-boots': 'Зелёные сапоги',
  'spider-boots': 'Паучьи сапоги',
  'golden-boots': 'Золотые сапоги',
  'travel-cloak': 'Походный плащ',
  'tide-cloak': 'Плащ прилива',
  'dragon-cloak': 'Драконий плащ',
  'ratskin-cloak': 'Плащ из крысиной шкуры',
  'leather-gloves': 'Кожаные перчатки',
  'iron-gloves': 'Железные перчатки',
  'golden-gauntlets': 'Золотые латные перчатки',
  'beast-claws': 'Звериные когти',
  'iron-belt': 'Железный пояс',
  'hunter-belt': 'Пояс охотника',
  'runic-belt': 'Рунический пояс',
  'titan-belt': 'Пояс титана',
  'regeneration-ring': 'Кольцо восстановления',
  'antidote-ring': 'Кольцо противоядия',
  'fire-ring': 'Кольцо огня',
  'ice-ring': 'Кольцо льда',
  'slaying-ring': 'Кольцо убийцы',
  'vitality-amulet': 'Амулет жизненной силы',
  'spirit-amulet': 'Амулет духа',
  'wood-buckler': 'Деревянный баклер',
  'healing-potion': 'Зелье исцеления',
  'mystery-potion': 'Зелье мощи',
  'mending-potion': 'Зелье исцеления ран',
  'cleansing-potion': 'Зелье очищения',
  'venom-potion': 'Зелье яда',
  'unidentified-potion': 'Неизвестное зелье',
  'blink-scroll': 'Свиток скачка',
  'book-of-frost': 'Книга мороза',
  'book-of-embers': 'Книга углей',
  'book-of-mending': 'Книга врачевания',
  'rusty-sword': 'Ржавый меч',
  'worn-tunic': 'Поношенная рубаха',
  'bone-wand': 'Костяной жезл',
  'tide-wand': 'Жезл прилива',
  'practice-manual': 'Учебник мастерства',
  'tome-of-amnesia': 'Книга забвения',
  'blank-codex': 'Пустой кодекс',
  'book-of-flight': 'Книга полёта',
  'book-of-invisibility': 'Книга невидимости',
  'book-of-camp-call': 'Книга зова лагеря',
  'dead-book': 'Книга мёртвых',
  bread: 'Хлебный паёк',
  'raw-meat': 'Сырое мясо',
  'cooked-meat': 'Жареное мясо',
  'iron-key': 'Железный ключ',
  'lockpick-set': 'Набор отмычек',
  'hunter-trap': 'Охотничий капкан',
  'coin-cache': 'Тайник с золотом',
});

const ENGLISH_NAMES = Object.freeze({
  'camp-kit': 'Camping kit',
  'bone-dirk': 'Bone dirk',
  'spriggan-knife': 'Spriggan knife',
  'oak-club': 'Oak club',
  'iron-mace': 'Iron mace',
  'morning-star': 'Morning star',
  'hunting-spear': 'Hunting spear',
  'war-pike': 'War pike',
  'short-bow': 'Short bow',
  'light-crossbow': 'Light crossbow',
  'mystery-potion': 'Potion of Might',
  'mending-potion': 'Potion of Mending',
  'cleansing-potion': 'Potion of Cleansing',
  'venom-potion': 'Potion of Venom',
  'raw-meat': 'Raw meat',
  'cooked-meat': 'Cooked meat',
  'practice-manual': 'Manual of Mastery',
  'tome-of-amnesia': 'Tome of Amnesia',
  'blank-codex': 'Blank Codex',
  'book-of-flight': 'Book of Flight',
  'book-of-invisibility': 'Book of Invisibility',
  'book-of-camp-call': 'Book of the Camp Call',
  'book-of-frost': 'Book of Frost',
  'book-of-embers': 'Book of Embers',
  'book-of-mending': 'Book of Mending',
  'rusty-sword': 'Rusty sword',
  'worn-tunic': 'Worn tunic',
  'tide-wand': 'Tide Wand',
});

const RARITY = Object.freeze({
  ru: Object.freeze(['Обычный', 'Необычный', 'Редкий', 'Артефакт']),
  en: Object.freeze(['Common', 'Uncommon', 'Rare', 'Artefact']),
});

const UNKNOWN_RARITY = Object.freeze({ ru: 'Неизвестно', en: 'Unknown' });

const COMPARISON_STATS = Object.freeze([
  Object.freeze({ id: 'attack', icon: '⚔', ru: 'Урон', en: 'Attack', percent: false }),
  Object.freeze({ id: 'defense', icon: '◆', ru: 'Защита', en: 'Defence', percent: false }),
  Object.freeze({ id: 'maxHp', icon: '♥', ru: 'Здоровье', en: 'Health', percent: false }),
  Object.freeze({ id: 'moveSpeed', icon: '↟', ru: 'Движение', en: 'Move', percent: true }),
  Object.freeze({ id: 'attackSpeed', icon: '✦', ru: 'Темп', en: 'Tempo', percent: true }),
  Object.freeze({ id: 'intelligence', icon: '✧', ru: 'Интеллект', en: 'Intelligence', percent: false }),
]);

function titleFromId(id) {
  return id
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function localizedItemName(item, language) {
  if (item.unidentified) {
    return item.unknownName?.[language]
      ?? (language === 'ru' ? 'Неизвестный предмет' : 'Unknown item');
  }
  if (item.name?.[language]) return item.name[language];
  return language === 'ru'
    ? RUSSIAN_NAMES[item.id] ?? titleFromId(item.id)
    : ENGLISH_NAMES[item.id] ?? titleFromId(item.id);
}

export function itemDetails(item, requestedLanguage = 'ru') {
  if (!item?.id) throw new TypeError('An item with a stable id is required');
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  const generated = generatedItemDescription(item, language);
  return Object.freeze({
    id: item.id,
    descriptionVersion: generated.version,
    name: proceduralArtifactName(item, localizedItemName(item, language), language),
    rarity: item.unidentified
      ? UNKNOWN_RARITY[language]
      : RARITY[language][item.rarity] ?? RARITY[language][0],
    slot: generated.type,
    description: generated.summary,
    primaryEffect: Object.freeze({
      icon: generated.primary.icon,
      text: generated.primary.text,
    }),
    effects: Object.freeze(generated.facts.map((fact) => Object.freeze({
      id: fact.id,
      kind: fact.kind,
      icon: fact.icon,
      text: fact.text,
    }))),
  });
}

function roundedStat(value, percent) {
  return Math.round(value * (percent ? 100 : 1));
}

export function itemStatComparison(before, after, requestedLanguage = 'ru') {
  if (!before || !after) return Object.freeze([]);
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  const rows = COMPARISON_STATS.flatMap((definition) => {
    const previous = before[definition.id];
    const next = after[definition.id];
    if (!Number.isFinite(previous) || !Number.isFinite(next)) return [];
    const from = roundedStat(previous, definition.percent);
    const to = roundedStat(next, definition.percent);
    const delta = to - from;
    if (delta === 0) return [];
    return [Object.freeze({
      id: definition.id,
      icon: definition.icon,
      label: definition[language],
      from,
      to,
      delta,
      suffix: definition.percent ? '%' : '',
      positive: delta > 0,
    })];
  });
  return Object.freeze(rows);
}

export function itemPresentation(item, requestedLanguage = 'ru', stats = null) {
  const details = itemDetails(item, requestedLanguage);
  const rarity = Math.max(0, Math.min(3, Number.isInteger(item.rarity) ? item.rarity : 0));
  return Object.freeze({
    ...details,
    rarityMarks: item.unidentified ? '?' : '◆'.repeat(rarity + 1),
    comparison: stats
      ? itemStatComparison(stats.before, stats.after, requestedLanguage)
      : Object.freeze([]),
  });
}

export const itemDetailLanguages = itemDescriptionLanguages;
