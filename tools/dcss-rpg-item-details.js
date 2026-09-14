import { magicItemEffects } from './dcss-rpg-magic.js';

const RUSSIAN_NAMES = Object.freeze({
  'short-blade': 'Короткий клинок',
  'long-sword': 'Длинный меч',
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
  'mystery-potion': 'Неизвестное зелье',
  'blink-scroll': 'Свиток скачка',
  'bone-wand': 'Костяной жезл',
  'dead-book': 'Книга мёртвых',
  bread: 'Хлебный паёк',
  'iron-key': 'Железный ключ',
  'lockpick-set': 'Набор отмычек',
  'coin-cache': 'Тайник с золотом',
});

const RARITY = Object.freeze({
  ru: ['Обычный', 'Необычный', 'Редкий', 'Артефакт'],
  en: ['Common', 'Uncommon', 'Rare', 'Artefact'],
});

const COMPARISON_STATS = Object.freeze([
  Object.freeze({ id: 'attack', icon: '⚔', ru: 'Урон', en: 'Attack', percent: false }),
  Object.freeze({ id: 'defense', icon: '◆', ru: 'Защита', en: 'Defence', percent: false }),
  Object.freeze({ id: 'maxHp', icon: '♥', ru: 'Здоровье', en: 'Health', percent: false }),
  Object.freeze({ id: 'moveSpeed', icon: '↟', ru: 'Движение', en: 'Move', percent: true }),
  Object.freeze({ id: 'attackSpeed', icon: '✦', ru: 'Темп', en: 'Tempo', percent: true }),
]);

const SLOT = Object.freeze({
  ru: {
    hand1: 'Оружие',
    hand2: 'Вторая рука',
    body: 'Доспех',
    head: 'Головной убор',
    boots: 'Сапоги',
    cloak: 'Плащ',
    gloves: 'Перчатки',
    belt: 'Пояс',
    ring1: 'Кольцо',
    ring2: 'Кольцо',
    amulet: 'Амулет',
    consumable: 'Расходуемое',
  },
  en: {
    hand1: 'Weapon',
    hand2: 'Off hand',
    body: 'Armour',
    head: 'Headwear',
    boots: 'Boots',
    cloak: 'Cloak',
    gloves: 'Gloves',
    belt: 'Belt',
    ring1: 'Ring',
    ring2: 'Ring',
    amulet: 'Amulet',
    consumable: 'Consumable',
  },
});

const SLOT_DESCRIPTION = Object.freeze({
  ru: {
    hand1: 'Определяет дистанцию, темп и силу автоматической атаки.',
    hand2: 'Дополняет оружие и помогает пережить ответный удар.',
    body: 'Защищает тело; все бонусы действуют, пока доспех надет.',
    head: 'Защищает голову и усиливает владельца, пока предмет надет.',
    boots: 'Меняют шаг героя; все бонусы действуют, пока сапоги надеты.',
    cloak: 'Накидка с постоянным эффектом, пока она надета.',
    gloves: 'Усиливают руки героя и его автоматические атаки.',
    belt: 'Удерживает силу в теле; бонус действует, пока пояс надет.',
    ring1: 'Малый волшебный предмет с постоянным эффектом.',
    ring2: 'Малый волшебный предмет с постоянным эффектом.',
    amulet: 'Сильный талисман с постоянным эффектом.',
    consumable: 'Исчезает или теряет заряд после использования.',
  },
  en: {
    hand1: 'Defines the range, tempo and power of automatic attacks.',
    hand2: 'Complements the weapon and helps survive a counterattack.',
    body: 'Protects the body; every bonus is active while equipped.',
    head: 'Protects and empowers its wearer while equipped.',
    boots: 'Change the hero’s step; every bonus is active while equipped.',
    cloak: 'A mantle with a constant effect while equipped.',
    gloves: 'Empower the hero’s hands and automatic attacks.',
    belt: 'Binds power to the body while equipped.',
    ring1: 'A small enchanted item with a constant effect.',
    ring2: 'A small enchanted item with a constant effect.',
    amulet: 'A powerful talisman with a constant effect.',
    consumable: 'Disappears or loses a charge when used.',
  },
});

const LORE = Object.freeze({
  'skull-staff': {
    ru: 'Холодный череп собирает волю владельца в летящий сгусток.',
    en: 'The cold skull gathers its bearer’s will into a flying bolt.',
  },
  'storm-trident': {
    ru: 'Зубцы продолжают выпад дальше обычного клинка.',
    en: 'Its tines carry a thrust farther than an ordinary blade.',
  },
  firestarter: {
    ru: 'Тяжёлое древко помнит жар кузни и требует точного замаха.',
    en: 'Its heavy haft remembers the forge and demands a measured swing.',
  },
  'shadow-scales': {
    ru: 'Чешуйки глушат свет и хранят часть жизненной силы владельца.',
    en: 'The scales swallow light and hold part of their wearer’s vitality.',
  },
  'living-vines': {
    ru: 'Лозы медленно затягивают повреждения и держатся за живое тело.',
    en: 'The vines cling to living flesh and slowly bind its wounds.',
  },
  'ancient-crown': {
    ru: 'Её металл холоден даже рядом с огнём глубин.',
    en: 'Its metal stays cold even beside the fires of the deep.',
  },
  'spider-boots': {
    ru: 'Мягкая подошва повторяет осторожную поступь пещерного охотника.',
    en: 'Soft soles echo the careful step of a cavern hunter.',
  },
  'golden-boots': {
    ru: 'Каждый шаг становится тяжелее, но увереннее.',
    en: 'Every step becomes heavier, yet more certain.',
  },
  'tide-cloak': {
    ru: 'Ткань движется так, будто помнит далёкое море.',
    en: 'The cloth moves as if it remembers a distant sea.',
  },
  'dragon-cloak': {
    ru: 'Редкие пластины защищают спину и направляют удар.',
    en: 'Rare plates guard the back and guide each strike.',
  },
  'ratskin-cloak': {
    ru: 'Неприглядная шкура пережила больше хозяев, чем помнит.',
    en: 'The ragged hide has outlived more owners than it remembers.',
  },
  'beast-claws': {
    ru: 'Когти отвечают на движение руки раньше, чем успевает мысль.',
    en: 'The claws answer the hand before thought can catch up.',
  },
  'runic-belt': {
    ru: 'Руны запирают дыхание и силу внутри тела.',
    en: 'The runes lock breath and strength inside the body.',
  },
  'titan-belt': {
    ru: 'Пряжка будто становится тяжелее перед опасностью.',
    en: 'Its buckle seems to grow heavier in the face of danger.',
  },
  'regeneration-ring': {
    ru: 'Камень впитывает угасающую силу поверженных врагов и затягивает раны.',
    en: 'The stone absorbs the fading strength of defeated enemies to mend wounds.',
  },
  'fire-ring': {
    ru: 'Тёплая печать укрепляет тело владельца.',
    en: 'A warm seal hardens the wearer’s body.',
  },
  'ice-ring': {
    ru: 'Холодная печать укрепляет тело владельца.',
    en: 'A cold seal hardens the wearer’s body.',
  },
  'slaying-ring': {
    ru: 'Кольцо тянет руку к уязвимому месту противника.',
    en: 'The ring draws the hand toward an enemy’s weak point.',
  },
  'vitality-amulet': {
    ru: 'Внутри камня мерцает второе, очень медленное сердце.',
    en: 'A second, very slow heartbeat flickers inside the stone.',
  },
  'spirit-amulet': {
    ru: 'Талисман связывает волю, силу и жизненный запас.',
    en: 'The talisman binds will, power and vitality together.',
  },
  'blink-scroll': {
    ru: 'Знак на бумаге складывает пройденный путь в одну точку.',
    en: 'The mark folds the travelled path into a single point.',
  },
  'dead-book': {
    ru: 'Страницы шелестят даже в закрытой книге.',
    en: 'Its pages whisper even while the book is closed.',
  },
});

const SPECIAL_EFFECTS = Object.freeze({
  ru: {
    'healing-potion': [{ icon: '♥', text: 'Восстанавливает до 32 здоровья.' }],
    'mystery-potion': [{ icon: '?', text: 'Свойство неизвестно и раскроется после использования.' }],
    'blink-scroll': [{ icon: '✦', text: 'Мгновенно возвращает героя ко входу на этаж.' }],
    'bone-wand': [{ icon: '✦', text: 'Расходует заряд и навсегда даёт 1 силу.' }],
    bread: [{ icon: '♥', text: 'Восстанавливает до 12 здоровья.' }],
    'iron-key': [{ icon: '⌑', text: 'Открывает любой обычный замок и расходуется.' }],
    'lockpick-set': [{ icon: '⌁', text: 'Расходуется при взломе; требуется навык подходящего ранга.' }],
    'coin-cache': [{ icon: '◆', text: 'Сразу превращается в осколки при подборе.' }],
  },
  en: {
    'healing-potion': [{ icon: '♥', text: 'Restores up to 32 health.' }],
    'mystery-potion': [{ icon: '?', text: 'Its effect is unknown until the potion is used.' }],
    'blink-scroll': [{ icon: '✦', text: 'Instantly returns the hero to the floor entrance.' }],
    'bone-wand': [{ icon: '✦', text: 'Consumes a charge and permanently grants 1 power.' }],
    bread: [{ icon: '♥', text: 'Restores up to 12 health.' }],
    'iron-key': [{ icon: '⌑', text: 'Opens any ordinary lock and is consumed.' }],
    'lockpick-set': [{ icon: '⌁', text: 'Consumed while picking; requires sufficient skill.' }],
    'coin-cache': [{ icon: '◆', text: 'Immediately becomes shards when collected.' }],
  },
});

function titleFromId(id) {
  return id
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function statEffects(item, language) {
  const labels = language === 'ru'
    ? {
        attack: 'к атаке',
        defense: 'к защите',
        maxHp: 'к максимуму здоровья',
        moveSpeed: 'к скорости движения',
        attackSpeed: 'к скорости атаки',
      }
    : {
        attack: 'attack',
        defense: 'defence',
        maxHp: 'maximum health',
        moveSpeed: 'movement speed',
        attackSpeed: 'attack speed',
      };
  const icons = { attack: '⚔', defense: '◆', maxHp: '♥', moveSpeed: '↟', attackSpeed: '✦' };
  const percentStats = new Set(['moveSpeed', 'attackSpeed']);
  return Object.entries(item.stats ?? {}).map(([stat, value]) => ({
    icon: icons[stat] ?? '·',
    text: `${value >= 0 ? '+' : '−'}${percentStats.has(stat) ? `${Math.round(Math.abs(value) * 100)}%` : Math.abs(value)} ${labels[stat] ?? stat}`,
  }));
}

function combatEffects(item, language) {
  if (!item.combat) return [];
  if (item.combat.guard) {
    return [{
      icon: '▣',
      text: language === 'ru'
        ? `Поглощает ${item.combat.guard} ед. входящего урона.`
        : `Absorbs ${item.combat.guard} incoming damage.`,
    }];
  }
  const range = item.combat.range;
  const tempo = item.combat.cooldown <= 0.62
    ? language === 'ru' ? 'быстрый' : 'fast'
    : item.combat.cooldown <= 0.9
      ? language === 'ru' ? 'средний' : 'balanced'
      : language === 'ru' ? 'тяжёлый' : 'heavy';
  if (item.combat.projectile) {
    return [{
      icon: item.combat.projectile === 'arrow' ? '➶' : '✦',
      text: language === 'ru'
        ? `Выпускает снаряд на дистанции до ${range} клеток; темп ${tempo}.`
        : `Fires a projectile up to ${range} tiles away; ${tempo} tempo.`,
    }];
  }
  return [{
    icon: item.combat.style === 'spear' ? '↟' : '⚔',
    text: language === 'ru'
      ? `Достаёт цель на дистанции до ${range} клеток; темп ${tempo}.`
      : `Reaches targets up to ${range} tiles away; ${tempo} tempo.`,
  }];
}

function primaryItemEffect(item, language, fallback) {
  const special = SPECIAL_EFFECTS[language][item.id]?.[0];
  if (special) return special;
  const magic = magicItemEffects(item, language)[0];
  if (magic) return magic;
  const combat = combatEffects(item, language)[0];
  if (combat) return combat;
  const weights = { attack: 4, defense: 3, maxHp: 0.5, moveSpeed: 100, attackSpeed: 100 };
  const primaryStat = Object.entries(item.stats ?? {})
    .sort(([leftId, left], [rightId, right]) => (
      Math.abs(right) * (weights[rightId] ?? 1) - Math.abs(left) * (weights[leftId] ?? 1)
    ))[0];
  if (!primaryStat) return fallback;
  return statEffects({ stats: { [primaryStat[0]]: primaryStat[1] } }, language)[0] ?? fallback;
}

export function itemDetails(item, requestedLanguage = 'ru') {
  if (!item?.id) throw new TypeError('An item with a stable id is required');
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  const slot = item.slot ?? 'consumable';
  const special = SPECIAL_EFFECTS[language][item.id] ?? [];
  const effects = special.length > 0
    ? special
    : [...statEffects(item, language), ...combatEffects(item, language), ...magicItemEffects(item, language)];
  return Object.freeze({
    id: item.id,
    name: language === 'ru' ? RUSSIAN_NAMES[item.id] ?? titleFromId(item.id) : titleFromId(item.id),
    rarity: RARITY[language][item.rarity] ?? RARITY[language][0],
    slot: SLOT[language][slot] ?? SLOT[language].consumable,
    description: LORE[item.id]?.[language] ?? SLOT_DESCRIPTION[language][slot] ?? SLOT_DESCRIPTION[language].consumable,
    effects: Object.freeze(effects.map((effect) => Object.freeze({ ...effect }))),
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
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  const rarity = Math.max(0, Math.min(3, Number.isInteger(item.rarity) ? item.rarity : 0));
  return Object.freeze({
    ...details,
    rarityMarks: '◆'.repeat(rarity + 1),
    primaryEffect: primaryItemEffect(
      item,
      language,
      details.effects[0] ?? Object.freeze({ icon: '·', text: details.description }),
    ),
    comparison: stats
      ? itemStatComparison(stats.before, stats.after, requestedLanguage)
      : Object.freeze([]),
  });
}

export const itemDetailLanguages = Object.freeze(['ru', 'en']);
