/**
 * Authored skill directions. This catalog describes the target game; it does not
 * enable mechanics. Runtime implementations and their required systems decide
 * which entries a player can learn. Keep IDs stable: saves refer to them.
 */

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const SKILL_CATEGORIES = deepFreeze([
  { id: 'exploration', name: { ru: 'Исследование', en: 'Exploration' } },
  { id: 'combat', name: { ru: 'Бой', en: 'Combat' } },
  { id: 'magic', name: { ru: 'Магия', en: 'Magic' } },
  { id: 'survival', name: { ru: 'Выживание', en: 'Survival' } },
  { id: 'crafting', name: { ru: 'Ремесло', en: 'Crafting' } },
  { id: 'companions', name: { ru: 'Животные и спутники', en: 'Animals and companions' } },
]);

/**
 * Each rank needs its own explicit gameplay definition in the runtime registry.
 * Rank-level gates are initial balancing values, not attribute requirements.
 * Passive techniques run automatically; contextual actions need player intent.
 */
export const SKILL_CATALOG = deepFreeze([
  {
    id: 'trap-sense', category: 'exploration', mode: 'passive',
    name: { ru: 'Чутьё', en: 'Trap sense' },
    description: {
      ru: 'Показывает механические ловушки поблизости. Не видит сквозь стены и не обезвреживает.',
      en: 'Shows mechanical traps nearby. Cannot see through walls or disarm them.',
    },
    requiresSystems: ['trap-detection'],
  },
  {
    id: 'darkvision', category: 'exploration', mode: 'passive',
    name: { ru: 'Темнозрение', en: 'Darkvision' },
    description: {
      ru: 'Позволяет дальше видеть существ и предметы в темноте, сохраняя преграды и линию видимости.',
      en: 'Reveals creatures and items farther away in darkness while respecting obstacles and line of sight.',
    },
    requiresSystems: ['darkness-vision'],
  },
  {
    id: 'secret-search', category: 'exploration', mode: 'passive',
    name: { ru: 'Поиск тайников', en: 'Secret search' },
    description: {
      ru: 'Помогает замечать признаки потайных дверей, скрытых ниш и кладов.',
      en: 'Helps notice clues to secret doors, hidden alcoves and buried treasure.',
    },
    requiresSystems: ['secret-discovery'],
  },
  {
    id: 'trap-disarming', category: 'exploration', mode: 'contextual',
    name: { ru: 'Сапёр', en: 'Trap disarming' },
    description: {
      ru: 'Обезвреживает обнаруженные ловушки. Сложные механизмы требуют достаточного ранга или инструмента.',
      en: 'Disarms discovered traps. Complex mechanisms require sufficient skill or a suitable tool.',
    },
    requiresSystems: ['trap-disarming'],
  },
  {
    id: 'lockpicking', category: 'exploration', mode: 'contextual',
    name: { ru: 'Взлом', en: 'Lockpicking' },
    description: {
      ru: 'Открывает замки отмычками и бережнее расходует инструменты.',
      en: 'Opens locks with lockpicks and uses tools more efficiently.',
    },
    requiresSystems: ['lockpicking'],
  },
  {
    id: 'appraisal', category: 'exploration', mode: 'passive',
    name: { ru: 'Оценка', en: 'Appraisal' },
    description: {
      ru: 'Опознаёт неизвестные зелья, свитки, жезлы и книги прямо в рюкзаке, ничего не тратя.',
      en: 'Identifies unknown potions, scrolls, wands and books in the backpack, using nothing up.',
    },
    requiresSystems: ['item-identification'],
  },
  {
    id: 'stealth', category: 'exploration', mode: 'passive',
    name: { ru: 'Скрытность', en: 'Stealth' },
    description: {
      ru: 'Уменьшает шум и дистанцию обнаружения, позволяя обходить врагов и готовить засаду.',
      en: 'Reduces noise and detection distance, helping avoid enemies and prepare ambushes.',
    },
    requiresSystems: ['stealth-detection'],
  },
  {
    id: 'daggers', category: 'combat', mode: 'passive',
    name: { ru: 'Кинжалы', en: 'Daggers' },
    description: {
      ru: 'Усиливает первый удар кинжалом из засады и атаки в спину.',
      en: 'Strengthens a dagger ambush opener and attacks from behind.',
    },
    requiresSystems: ['ambush-attacks', 'backstab-attacks'],
  },
  {
    id: 'swords', category: 'combat', mode: 'passive',
    name: { ru: 'Мечи', en: 'Swords' },
    description: {
      ru: 'Серия ударов по одной цели усиливает каждый следующий. Смена цели сбрасывает ритм.',
      en: 'A chain of hits on one target empowers the next. Changing targets resets the rhythm.',
    },
    requiresSystems: ['sword-rhythm'],
  },
  {
    id: 'axes', category: 'combat', mode: 'passive',
    name: { ru: 'Топоры', en: 'Axes' },
    description: {
      ru: 'Размах топора задевает соседних врагов. Двуручный бьёт шире одноручного.',
      en: 'An axe sweep catches the enemies alongside. Two-handed reaches wider than one.',
    },
    requiresSystems: ['weapon-cleave'],
  },
  {
    id: 'blunt-weapons', category: 'combat', mode: 'passive',
    name: { ru: 'Дробящее оружие', en: 'Blunt weapons' },
    description: {
      ru: 'Тяжёлые попадания временно ослабляют броню и сбивают подготовку вражеской атаки.',
      en: 'Heavy hits temporarily weaken armor and interrupt enemy attack preparation.',
    },
    requiresSystems: ['armor-break', 'attack-interruption'],
  },
  {
    id: 'spears', category: 'combat', mode: 'passive',
    name: { ru: 'Копья', en: 'Spears' },
    description: {
      ru: 'Встречает приближающегося противника ударом копья и ненадолго сдерживает его продвижение.',
      en: 'Meets an approaching enemy with a spear strike that briefly checks their advance.',
    },
    requiresSystems: ['spear-interception'],
  },
  {
    id: 'marksmanship', category: 'combat', mode: 'passive',
    name: { ru: 'Стрельба', en: 'Marksmanship' },
    description: {
      ru: 'После короткой остановки даёт прицельный выстрел. Высокие ранги позволяют пробивать строй.',
      en: 'Grants an aimed shot after a brief stop. Higher ranks allow shots to pierce enemy ranks.',
    },
    requiresSystems: ['aimed-shots', 'piercing-shots'],
  },
  {
    id: 'whip-control', category: 'combat', mode: 'passive',
    name: { ru: 'Кнутовой бой', en: 'Whip control' },
    description: {
      ru: 'Рывок кнутом сбивает занесённый удар и тащит врага к себе.',
      en: 'A whip yank breaks a raised attack and drags the enemy in.',
    },
    requiresSystems: ['whip-control'],
  },
  {
    id: 'staff-channeling', category: 'combat', mode: 'passive',
    name: { ru: 'Посох', en: 'Staff channeling' },
    description: {
      ru: 'Попадание посохом сокращает откат заклинаний и копит заряд для болта.',
      en: 'A staff hit shortens spell cooldowns and gathers a charge for the bolt.',
    },
    requiresSystems: ['staff-channeling'],
  },
  {
    id: 'shield', category: 'combat', mode: 'passive',
    name: { ru: 'Щит', en: 'Shield' },
    description: {
      ru: 'Даёт шанс полностью заблокировать удар щитом.',
      en: 'Grants a chance to block a hit completely.',
    },
    requiresSystems: ['shield-blocking'],
  },
  {
    id: 'mobility', category: 'combat', mode: 'passive',
    name: { ru: 'Манёвренность', en: 'Mobility' },
    description: {
      ru: 'Своевременный выход из отмеченной зоны вражеского удара даёт короткое ускорение.',
      en: 'Leaving a telegraphed enemy attack in time grants a brief burst of speed.',
    },
    requiresSystems: ['evasion-reward'],
  },
  {
    id: 'pyromancy', category: 'magic', mode: 'passive',
    name: { ru: 'Пиромантия', en: 'Pyromancy' },
    description: {
      ru: 'Огненная стрела бьёт сильнее и перекидывает огонь на соседние цели.',
      en: 'Ember Bolt hits harder and throws fire onto the targets alongside.',
    },
    requiresSystems: ['fire-spread'],
    attributeRequirements: { intelligence: [4, 7, 10] },
  },
  {
    id: 'cryomancy', category: 'magic', mode: 'passive',
    name: { ru: 'Криомантия', en: 'Cryomancy' },
    description: {
      ru: 'Лёд сильнее замедляет, замораживает мокрых и раскалывается по замороженным.',
      en: 'The frost slows harder, freezes the wet and shatters across the frozen.',
    },
    requiresSystems: ['frost-buildup'],
    attributeRequirements: { intelligence: [4, 7, 10] },
  },
  {
    id: 'storm-magic', category: 'magic', mode: 'passive',
    name: { ru: 'Грозовая магия', en: 'Storm magic' },
    description: {
      ru: 'Разряд перескакивает на мокрые цели. Мокрота не расходуется.',
      en: 'The bolt chains onto wet targets. The wet is not used up.',
    },
    requiresSystems: ['chain-lightning'],
    attributeRequirements: { intelligence: [5, 8, 11] },
  },
  {
    id: 'necromancy', category: 'magic', mode: 'contextual',
    name: { ru: 'Некромантия', en: 'Necromancy' },
    description: {
      ru: 'Усиливает поднятых слуг и укорачивает их возвращение после гибели.',
      en: 'Strengthens raised servants and shortens the wait before they rise again.',
    },
    requiresSystems: ['summoned-servants'],
  },
  {
    id: 'arcana', category: 'magic', mode: 'contextual',
    name: { ru: 'Арканистика', en: 'Arcana' },
    description: {
      ru: 'Открывает альтернативное применение подходящих свитков, например действие по области вместо одной цели.',
      en: 'Unlocks alternative uses for compatible scrolls, such as an area effect instead of a single target.',
    },
    requiresSystems: ['scroll-variants'],
  },
  {
    id: 'cleansing', category: 'magic', mode: 'contextual',
    name: { ru: 'Очищение', en: 'Cleansing' },
    description: {
      ru: 'Снимает проклятия и опасные состояния ритуалом, расходующим реагент.',
      en: 'Removes curses and harmful conditions through a ritual that consumes a reagent.',
    },
    requiresSystems: ['cleansing-ritual'],
  },
  {
    id: 'tracking', category: 'survival', mode: 'passive',
    name: { ru: 'Следопыт', en: 'Tracking' },
    description: {
      ru: 'Различает следы животных и врагов, помогая понять, кто находится впереди.',
      en: 'Distinguishes animal and enemy tracks to reveal what may lie ahead.',
    },
    requiresSystems: ['creature-tracks'],
  },
  {
    id: 'hunting', category: 'survival', mode: 'contextual',
    name: { ru: 'Охотник', en: 'Hunting' },
    description: {
      ru: 'Извлекает пригодное мясо, шкуры и полезные части из подходящих туш.',
      en: 'Harvests usable meat, hides and useful parts from suitable carcasses.',
    },
    requiresSystems: ['carcass-harvesting'],
  },
  {
    id: 'herbalism', category: 'survival', mode: 'contextual',
    name: { ru: 'Травничество', en: 'Herbalism' },
    description: {
      ru: 'Помогает распознавать и собирать полезные растения и грибы для рецептов.',
      en: 'Identifies and gathers useful plants and mushrooms for recipes.',
    },
    requiresSystems: ['plant-gathering'],
  },
  {
    id: 'cooking', category: 'survival', mode: 'contextual',
    name: { ru: 'Кулинария', en: 'Cooking' },
    description: {
      ru: 'Готовит блюда с временными эффектами. Одновременно действует одно пищевое усиление.',
      en: 'Prepares meals with temporary effects. Only one food buff can be active at a time.',
    },
    requiresSystems: ['cooking-recipes', 'food-buffs'],
  },
  {
    id: 'field-medicine', category: 'survival', mode: 'contextual',
    name: { ru: 'Полевая медицина', en: 'Field medicine' },
    description: {
      ru: 'Расходует перевязочные материалы для лечения и остановки кровотечения.',
      en: 'Consumes medical dressings to heal wounds and stop bleeding.',
    },
    requiresSystems: ['medical-treatment'],
  },
  {
    id: 'portering', category: 'survival', mode: 'passive',
    name: { ru: 'Вьючник', en: 'Portering' },
    description: {
      ru: 'Учит укладывать поклажу: в рюкзак влезает больше.',
      en: 'Teaches how to pack: the backpack holds more.',
    },
    requiresSystems: ['carrying-capacity'],
  },
  {
    id: 'endurance', category: 'survival', mode: 'passive',
    name: { ru: 'Выносливость', en: 'Endurance' },
    description: {
      ru: 'Сокращает действие холода, отравления и других изнуряющих состояний, не давая полной неуязвимости.',
      en: 'Shortens cold, poison and other debilitating conditions without granting complete immunity.',
    },
    requiresSystems: ['condition-duration-scaling'],
  },
  {
    id: 'alchemy', category: 'crafting', mode: 'contextual',
    name: { ru: 'Алхимия', en: 'Alchemy' },
    description: {
      ru: 'Создаёт зелья и противоядия из собранных ингредиентов.',
      en: 'Brews potions and antidotes from gathered ingredients.',
    },
    requiresSystems: ['alchemy-recipes'],
  },
  {
    id: 'poisoncraft', category: 'crafting', mode: 'contextual',
    name: { ru: 'Ядовитые составы', en: 'Poisoncraft' },
    description: {
      ru: 'Готовит временные покрытия для оружия и отравленные приманки.',
      en: 'Prepares temporary weapon coatings and poisoned bait.',
    },
    requiresSystems: ['weapon-coatings', 'poison-bait'],
  },
  {
    id: 'weaponsmithing', category: 'crafting', mode: 'contextual',
    name: { ru: 'Оружейное дело', en: 'Weaponsmithing' },
    description: {
      ru: 'Перенастраивает оружие, выбирая между темпом и силой удара.',
      en: 'Retunes a weapon to trade attack speed for impact or vice versa.',
    },
    requiresSystems: ['weapon-reforging'],
  },
  {
    id: 'armorsmithing', category: 'crafting', mode: 'contextual',
    name: { ru: 'Бронное дело', en: 'Armorsmithing' },
    description: {
      ru: 'Переделывает броню в более защищённый тяжёлый или более подвижный лёгкий вариант.',
      en: 'Reworks armor into a heavier protective or lighter mobile variant.',
    },
    requiresSystems: ['armor-reforging'],
  },
  {
    id: 'salvaging', category: 'crafting', mode: 'contextual',
    name: { ru: 'Разбор механизмов', en: 'Salvaging' },
    description: {
      ru: 'Извлекает полезные детали и целые вставки из подходящих устройств и предметов.',
      en: 'Recovers useful components and intact inserts from suitable devices and items.',
    },
    requiresSystems: ['component-salvage'],
  },
  {
    id: 'enchanting', category: 'crafting', mode: 'contextual',
    name: { ru: 'Зачарование', en: 'Enchanting' },
    description: {
      ru: 'Переносит совместимое магическое свойство на предмет с затратой ресурсов и ограничением числа свойств.',
      en: 'Transfers a compatible magical property to an item, consuming resources and respecting its property limit.',
    },
    requiresSystems: ['enchantment-transfer'],
  },
  {
    id: 'taming', category: 'companions', mode: 'contextual',
    name: { ru: 'Приручение', en: 'Taming' },
    description: {
      ru: 'Приручает подходящих животных кормом. Сильные виды требуют подготовки.',
      en: 'Tames suitable animals with food. Stronger species require preparation.',
    },
    requiresSystems: ['animal-taming', 'companion-limits'],
  },
  {
    id: 'training', category: 'companions', mode: 'contextual',
    name: { ru: 'Дрессировка', en: 'Training' },
    description: {
      ru: 'Обучает питомца защищать, искать или приносить найденные предметы.',
      en: 'Trains a pet to defend, search or fetch discovered items.',
    },
    requiresSystems: ['pet-behaviors'],
  },
  {
    id: 'animal-care', category: 'companions', mode: 'contextual',
    name: { ru: 'Уход за животными', en: 'Animal care' },
    description: {
      ru: 'Лечит питомца и снимает его состояния кормом и перевязочными средствами.',
      en: 'Heals a pet and treats its conditions using food and medical dressings.',
    },
    requiresSystems: ['pet-treatment'],
  },
  {
    id: 'beast-bond', category: 'companions', mode: 'passive',
    name: { ru: 'Звериная связь', en: 'Beast bond' },
    description: {
      ru: 'Позволяет видеть разведанное питомцем поблизости. Дистанция связи ограничена.',
      en: 'Shares discoveries made by a nearby pet within a limited bond range.',
    },
    requiresSystems: ['companion-shared-vision'],
  },
  {
    id: 'pack-leader', category: 'companions', mode: 'passive',
    name: { ru: 'Вожак стаи', en: 'Pack leader' },
    description: {
      ru: 'Позволяет взять дополнительного спутника ценой большего расхода корма. Размер отряда ограничен.',
      en: 'Allows an additional companion at the cost of more food. Total party size remains limited.',
    },
    requiresSystems: ['companion-limits', 'companion-upkeep'],
  },
].map((skill) => ({ ...skill, maxRank: 3, rankLevels: [2, 4, 6] })));

const skillsById = new Map(SKILL_CATALOG.map((skill) => [skill.id, skill]));

export function skillById(id) {
  return skillsById.get(id) ?? null;
}
