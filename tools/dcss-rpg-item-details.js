import { itemTakesMaterial, materialItemName } from './dcss-rpg-materials.js';
import { affixSuffix } from './dcss-rpg-affixes.js';
import {
  generatedItemDescription,
  itemDescriptionLanguages,
} from './dcss-rpg-item-description.js';
import { proceduralArtifactName } from './dcss-rpg-artifacts.js';

const RUSSIAN_NAMES = Object.freeze({
  'short-blade': 'Короткий клинок',
  'camp-kit': 'Походный набор',
  bandage: 'Бинты',
  'poison-vial': 'Флакон яда',
  'poison-bait': 'Отравленная приманка',
  'book-of-wardens': 'Книга стражей',
  'book-of-embers-burst': 'Книга вспышки',
  'cleansing-salt': 'Очищающая соль',
  'flame-scroll': 'Свиток пламени',
  'frost-scroll': 'Свиток стужи',
  'insight-scroll': 'Свиток прозрения',
  'book-of-purity': 'Книга чистоты',
  'book-of-splinters': 'Книга осколков',
  'home-stone': 'Камень возвращения',
  'roast-meat': 'Жаркое',
  'hearty-stew': 'Похлёбка',
  'feast-platter': 'Пир',
  'bone-dirk': 'Костяной кинжал',
  'spriggan-knife': 'Нож спригана',
  'oak-club': 'Дубовая палица',
  'iron-mace': 'Железная булава',
  'morning-star': 'Моргенштерн',
  'hunting-spear': 'Охотничье копьё',
  'war-pike': 'Боевая пика',
  'hunting-bow': 'Охотничий лук',
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
  'swamp-dragon-scales': 'Болотная драконья чешуя',
  'mottled-dragon-scales': 'Пятнистая драконья чешуя',
  'blue-dragon-scales': 'Синяя драконья чешуя',
  'ice-dragon-scales': 'Ледяная драконья чешуя',
  'gold-dragon-scales': 'Золотая драконья чешуя',
  'quicksilver-dragon-scales': 'Ртутная драконья чешуя',
  'pearl-dragon-scales': 'Жемчужная драконья чешуя',
  'beef-jerky': 'Вяленое мясо',
  'wild-fruit': 'Дикие плоды',
  'royal-jelly': 'Королевское желе',
  'round-shield': 'Круглый щит',
  'tower-shield': 'Ростовой щит',
  'spiked-shield': 'Шипастый щит',
  'copper-charm': 'Медный оберег',
  'hush-amulet': 'Амулет тишины',
  arbalest: 'Арбалет',
  'hand-crossbow': 'Ручной арбалет',
  sling: 'Пастушья праща',
  greatsling: 'Большая праща',
  bullwhip: 'Кнут',
  'barbed-whip': 'Шипастый кнут',
  'apprentice-staff': 'Посох ученика',
  'channeling-staff': 'Посох проводника',
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
  'unbinding-scroll': 'Свиток снятия оков',
  'book-of-shackles': 'Книга оков',
  'warding-ring': 'Кольцо оберега',
  'swift-ring': 'Кольцо проворства',
  'mind-charm': 'Амулет разума',
  'might-charm': 'Амулет мощи',
  'sky-charm': 'Амулет небес',
  'veil-charm': 'Амулет покрова',
  'bone-charm': 'Костяной оберег',
  'green-eye': 'Зелёное око',
  'gold-face': 'Золотой лик',
  'elven-helm': 'Эльфийский шлем',
  'plumed-helm': 'Шлем с плюмажем',
  'horned-sallet': 'Рогатый салад',
  'scholar-hat': 'Шляпа книжника',
  'drake-helm': 'Драконий шлем',
  'iron-crown': 'Железная корона',
  'mesh-boots': 'Кольчужные сапоги',
  'strider-boots': 'Сапоги скорохода',
  'spidersilk-boots': 'Сапоги из паучьего шёлка',
  'gilded-greaves': 'Золочёные поножи',
  'hunt-hooves': 'Копыта охоты',
  'grey-mantle': 'Серая накидка',
  'crimson-cloak': 'Багряный плащ',
  'white-shroud': 'Белый саван',
  'amber-cloak': 'Янтарный плащ',
  'witch-mantle': 'Ведьмина мантия',
  'wrapped-hands': 'Обмотанные руки',
  'blue-gauntlets': 'Синие рукавицы',
  'bruiser-fists': 'Кулаки бойца',
  'scarlet-gloves': 'Алые перчатки',
  'white-gauntlets': 'Белые рукавицы',
  'bark-buckler': 'Кора-баклер',
  'kite-shield': 'Каплевидный щит',
  'sun-shield': 'Солнечный щит',
  'cross-pavise': 'Павеза',
  'bulwark': 'Бастион',
  'hatchet': 'Топорик',
  'broad-axe': 'Широкий топор',
  'double-axe': 'Двулезвийная секира',
  'battleaxe': 'Боевая секира',
  'blood-axe': 'Кровавая секира',
  'kitchen-knife': 'Кухонный нож',
  'enchantress-dagger': 'Кинжал чародейки',
  'hunting-bow': 'Охотничий лук',
  'great-bow': 'Большой лук',
  'black-whip': 'Чёрный кнут',
  'quarterstaff': 'Боевой посох',
  'iron-quarterstaff': 'Окованный посох',
  'giant-club': 'Великанья дубина',
  'great-mace': 'Большая булава',
  'ring-mail': 'Кольчатый доспех',
  'hide-armour': 'Шкуры',
  'silver-dragon-hide': 'Шкура серебряного дракона',
  'book-of-frost': 'Книга мороза',
  'book-of-storms': 'Книга бурь',
  'book-of-frost-burst': 'Книга морозной вспышки',
  'book-of-glaciate': 'Книга ледяных оков',
  'book-of-ice-armour': 'Книга ледяного доспеха',
  'book-of-storm-burst': 'Книга грозовой вспышки',
  'book-of-thunderclap': 'Книга раската',
  'book-of-shove': 'Книга толчка',
  'book-of-cauterising': 'Книга прижигания',
  'book-of-kindling': 'Книга запала',
  'book-of-sharing': 'Книга жертвы',
  'book-of-warding': 'Книга оберега',
  'book-of-tending': 'Книга ухода',
  'book-of-keys': 'Книга ключей',
  'book-of-translocation': 'Книга переноса',
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
  'book-of-bones': 'Книга костей',
  'book-of-hunger': 'Книга голода',
  'dead-book': 'Книга мёртвых',
  bread: 'Хлебный паёк',
  'raw-meat': 'Сырое мясо',
  'cooked-meat': 'Жареное мясо',
  'iron-key': 'Железный ключ',
  'master-key': 'Ключ от всех сундуков',
  'lockpick-set': 'Набор отмычек',
  'sapper-kit': 'Набор сапёра',
  'hunter-trap': 'Охотничий капкан',
  'coin-cache': 'Тайник с золотом',
});

const ENGLISH_NAMES = Object.freeze({
  'camp-kit': 'Camping kit',
  bandage: 'Bandages',
  'poison-vial': 'Vial of poison',
  'poison-bait': 'Poisoned bait',
  'book-of-wardens': 'Book of wardens',
  'book-of-embers-burst': 'Book of the burst',
  'cleansing-salt': 'Cleansing salt',
  'flame-scroll': 'Scroll of flame',
  'frost-scroll': 'Scroll of frost',
  'insight-scroll': 'Scroll of insight',
  'book-of-purity': 'Book of purity',
  'book-of-splinters': 'Book of splinters',
  'home-stone': 'Homing stone',
  'roast-meat': 'Roast',
  'hearty-stew': 'Hearty stew',
  'feast-platter': 'Feast platter',
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
  'book-of-bones': 'Book of Bones',
  'book-of-hunger': 'Book of Hunger',
  'book-of-frost': 'Book of Frost',
  'book-of-storms': 'Book of Storms',
  'book-of-frost-burst': 'Book of the Frost Burst',
  'book-of-glaciate': 'Book of Glaciation',
  'book-of-ice-armour': 'Book of Ice Armour',
  'book-of-storm-burst': 'Book of the Storm Burst',
  'book-of-thunderclap': 'Book of the Thunderclap',
  'book-of-shove': 'Book of the Shove',
  'book-of-cauterising': 'Book of Cauterising',
  'book-of-kindling': 'Book of Kindling',
  'book-of-sharing': 'Book of Sharing',
  'book-of-warding': 'Book of Warding',
  'book-of-tending': 'Book of Tending',
  'book-of-keys': 'Book of Keys',
  'book-of-translocation': 'Book of Translocation',
  'book-of-embers': 'Book of Embers',
  'book-of-mending': 'Book of Mending',
  'swamp-dragon-scales': 'Swamp dragon scales',
  'mottled-dragon-scales': 'Mottled dragon scales',
  'blue-dragon-scales': 'Blue dragon scales',
  'ice-dragon-scales': 'Ice dragon scales',
  'gold-dragon-scales': 'Gold dragon scales',
  'quicksilver-dragon-scales': 'Quicksilver dragon scales',
  'pearl-dragon-scales': 'Pearl dragon scales',
  'beef-jerky': 'Beef jerky',
  'wild-fruit': 'Wild fruit',
  'royal-jelly': 'Royal jelly',
  'round-shield': 'Round shield',
  'tower-shield': 'Tower shield',
  'spiked-shield': 'Spiked shield',
  'copper-charm': 'Copper charm',
  'hush-amulet': 'Amulet of hush',
  arbalest: 'Arbalest',
  'hand-crossbow': 'Hand crossbow',
  sling: "Shepherd's sling",
  greatsling: 'Greatsling',
  bullwhip: 'Bullwhip',
  'barbed-whip': 'Barbed whip',
  'apprentice-staff': 'Apprentice staff',
  'channeling-staff': 'Channeling staff',
  'rusty-sword': 'Rusty sword',
  'worn-tunic': 'Worn tunic',
  'tide-wand': 'Tide Wand',
  'iron-key': 'Iron key',
  'master-key': 'Key to every chest',
  'lockpick-set': 'Lockpick set',
  'sapper-kit': "Sapper's kit",
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
  const suffix = item.artifactPowerId ? '' : affixSuffix(item.affixIds ?? [], language);
  // A made thing is named by what it is, what it is made of and what was put on
  // it: adjective, noun, suffix. It has a form, so the material names it and the
  // hand-written name is not consulted at all.
  if (itemTakesMaterial(item) && !item.artifactPowerId) {
    return `${materialItemName(item, item.materialId ?? null, language)}${suffix}`;
  }
  // A named thing keeps the name written for it, and still admits what was
  // enchanted onto it. The last fallback builds a name from the id, and carries
  // the suffix too — a missing translation must not also lose the enchantment.
  const written = language === 'ru'
    ? RUSSIAN_NAMES[item.id] ?? titleFromId(item.id)
    : ENGLISH_NAMES[item.id] ?? titleFromId(item.id);
  return `${written}${suffix}`;
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
