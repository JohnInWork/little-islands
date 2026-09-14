import { experienceToNextLevel } from './dcss-rpg-progression.js';

const COPY = Object.freeze({
  ru: Object.freeze({
    title: 'Персонаж',
    level: 'Уровень',
    floor: 'Этаж',
    experience: 'Опыт',
    combat: 'Боевой профиль',
    stats: Object.freeze({
      attack: ['Атака', 'Сила до множителя выбранного оружия.'],
      defense: ['Защита', 'Каждые 2 очка поглощают примерно 1 урона.'],
      health: ['Здоровье', 'Текущий и максимальный запас жизни.'],
      movement: ['Движение', 'Реальная скорость перемещения по подземелью.'],
      tempo: ['Темп атаки', 'Экипировка сокращает паузу между автоатаками.'],
    }),
    combatStats: Object.freeze({
      style: 'Стиль',
      damage: 'Урон',
      range: 'Дальность',
      rate: 'Ударов/с',
    }),
    styles: Object.freeze({
      unarmed: 'Без оружия',
      blade: 'Клинок',
      heavy: 'Тяжёлое',
      spear: 'Копьё',
      staff: 'Посох',
      bow: 'Лук',
    }),
    tilesPerSecond: 'кл/с',
  }),
  en: Object.freeze({
    title: 'Character',
    level: 'Level',
    floor: 'Floor',
    experience: 'Experience',
    combat: 'Combat profile',
    stats: Object.freeze({
      attack: ['Attack', 'Power before the equipped weapon multiplier.'],
      defense: ['Defence', 'Every 2 points absorb roughly 1 damage.'],
      health: ['Health', 'Current and maximum life reserve.'],
      movement: ['Movement', 'Actual movement speed through the dungeon.'],
      tempo: ['Attack speed', 'Equipment shortens the pause between auto-attacks.'],
    }),
    combatStats: Object.freeze({
      style: 'Style',
      damage: 'Damage',
      range: 'Range',
      rate: 'Hits/s',
    }),
    styles: Object.freeze({
      unarmed: 'Unarmed',
      blade: 'Blade',
      heavy: 'Heavy',
      spear: 'Spear',
      staff: 'Staff',
      bow: 'Bow',
    }),
    tilesPerSecond: 'tiles/s',
  }),
});

const freezeRows = (rows) => Object.freeze(rows.map((row) => Object.freeze(row)));
const decimal = (value, places = 2) => Number(value.toFixed(places)).toString();

export function characterSheetModel({
  language = 'ru',
  hero,
  stats,
  combat,
  damage,
  baseMoveSpeed,
  depthLabel,
}) {
  if (!hero || !stats || !combat || !Number.isFinite(damage) || !Number.isFinite(baseMoveSpeed)) {
    throw new TypeError('Character sheet requires complete derived combat state');
  }
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = COPY[locale];
  const xpTarget = experienceToNextLevel(hero.level);
  const movement = baseMoveSpeed * stats.moveSpeed;
  const attacksPerSecond = 1 / combat.cooldown;
  const statRows = [
    { id: 'attack', icon: '⚔', label: copy.stats.attack[0], value: String(stats.attack), description: copy.stats.attack[1] },
    { id: 'defense', icon: '◆', label: copy.stats.defense[0], value: String(stats.defense), description: copy.stats.defense[1] },
    { id: 'health', icon: '♥', label: copy.stats.health[0], value: `${hero.hp}/${stats.maxHp}`, description: copy.stats.health[1] },
    { id: 'movement', icon: '↟', label: copy.stats.movement[0], value: `${decimal(movement)} ${copy.tilesPerSecond}`, description: copy.stats.movement[1] },
    { id: 'tempo', icon: '✦', label: copy.stats.tempo[0], value: `${Math.round(stats.attackSpeed * 100)}%`, description: copy.stats.tempo[1] },
  ];
  const combatRows = [
    { id: 'style', label: copy.combatStats.style, value: copy.styles[combat.style] ?? combat.style },
    { id: 'damage', label: copy.combatStats.damage, value: String(damage) },
    { id: 'range', label: copy.combatStats.range, value: decimal(combat.range, 1) },
    { id: 'rate', label: copy.combatStats.rate, value: decimal(attacksPerSecond, 1) },
  ];
  return Object.freeze({
    language: locale,
    nextLanguage: locale === 'ru' ? 'EN' : 'RU',
    title: copy.title,
    combatTitle: copy.combat,
    levelText: `${copy.level} ${hero.level}`,
    floorText: `${copy.floor} ${depthLabel}`,
    experienceText: `${copy.experience} ${hero.xp}/${xpTarget}`,
    experienceProgress: Math.max(0, Math.min(1, hero.xp / xpTarget)),
    statRows: freezeRows(statRows),
    combatRows: freezeRows(combatRows),
  });
}
