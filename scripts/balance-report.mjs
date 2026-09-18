/**
 * A balance report over many seeds. It plays nothing: it reads what the
 * generator actually puts on each floor and adds it up, so the numbers are
 * the game's own rather than a model of it.
 *
 * Usage: node scripts/balance-report.mjs [seedCount] [--write]
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRun, generateDungeon } from '../tools/dcss-rpg-core.js';
import { FINAL_DEPTH } from '../tools/dcss-rpg-run.js';
import { CITY_DEPTH } from '../tools/dcss-rpg-city.js';
import { LOOT_CATALOG, lootById, monsterById } from '../tools/dcss-rpg-content.js';
import { HUNGER_MAX } from '../tools/dcss-rpg-hunger.js';

const here = dirname(fileURLToPath(import.meta.url));
const seedCount = Number.parseInt(process.argv[2] ?? '24', 10);
const shouldWrite = process.argv.includes('--write');

const FOOD_BY_ID = new Map(
  LOOT_CATALOG.filter((item) => item.useEffect?.type === 'food').map((item) => [item.id, item.useEffect.nutrition]),
);

function floorFacts(seed, depth) {
  const level = generateDungeon({ seed, depth });
  const monsters = level.monsters.map(({ id }) => monsterById(id)).filter(Boolean);
  // The same multipliers the runtime applies when it builds monster states.
  const threat = monsters.reduce((sum, monster) => {
    const bossHp = monster.boss ? level.scaling.boss.hpMultiplier : 1;
    const bossDamage = monster.boss ? level.scaling.boss.damageMultiplier : 1;
    return {
      hp: sum.hp + Math.round(monster.hp * level.scaling.monsters.hpMultiplier * bossHp),
      damage: sum.damage + Math.round(monster.damage * level.scaling.monsters.damageMultiplier * bossDamage),
      xp: sum.xp + (monster.xp ?? 0),
    };
  }, { hp: 0, damage: 0, xp: 0 });
  const loot = level.loot.map((entry) => ({ entry, item: lootById(entry.id) })).filter(({ item }) => item);
  return {
    depth,
    monsters: monsters.length,
    boss: level.objective ? 1 : 0,
    monsterHp: threat.hp,
    monsterDamage: threat.damage,
    xp: threat.xp,
    loot: loot.length,
    gold: loot.reduce((sum, { entry, item }) => sum + (item.gold ? entry.amount ?? 0 : 0), 0),
    food: loot.reduce((sum, { entry }) => sum + (FOOD_BY_ID.get(entry.id) ?? 0), 0),
    gear: loot.filter(({ item }) => item.slot).length,
    // Artefacts left the open floor and moved into sealed caches, so counting
    // `level.loot` now always reports zero. Read the caches the way the game
    // builds them — through createRun, not by rebuilding them here.
    artifacts: createRun(seed, level).floor.chests
      .reduce((sum, chest) => sum + chest.items.filter(({ artifactPowerId }) => artifactPowerId).length, 0),
    finds: level.finds.length,
    merchants: level.merchants.length,
    rooms: level.rooms.length,
    sanctuary: level.sanctuary ? 1 : 0,
  };
}

const depths = [CITY_DEPTH, ...Array.from({ length: FINAL_DEPTH }, (_, index) => index + 1)];
const totals = new Map(depths.map((depth) => [depth, []]));

for (let index = 0; index < seedCount; index += 1) {
  const seed = 1_000_003 * (index + 1) % 4_294_967_291;
  for (const depth of depths) totals.get(depth).push(floorFacts(seed, depth));
}

const average = (rows, key) => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
const round = (value, digits = 1) => Number(value.toFixed(digits));

const table = depths.map((depth) => {
  const rows = totals.get(depth);
  return {
    depth: depth === CITY_DEPTH ? 'город' : String(depth),
    monsters: round(average(rows, 'monsters')),
    hp: round(average(rows, 'monsterHp')),
    damage: round(average(rows, 'monsterDamage')),
    xp: round(average(rows, 'xp')),
    loot: round(average(rows, 'loot')),
    gear: round(average(rows, 'gear')),
    gold: round(average(rows, 'gold')),
    foodMinutes: round(average(rows, 'food') / 60),
    finds: round(average(rows, 'finds')),
    merchants: round(average(rows, 'merchants')),
    artifacts: round(average(rows, 'artifacts'), 2),
  };
});

const dungeonRows = table.filter(({ depth }) => depth !== 'город');
const foodTotal = dungeonRows.reduce((sum, row) => sum + row.foodMinutes, 0);
const artifactTotal = dungeonRows.reduce((sum, row) => sum + row.artifacts, 0);
const hungerMinutes = HUNGER_MAX / 60;

const header = ['этаж', 'монстры', 'их HP', 'их урон', 'опыт', 'лут', 'снаряга', 'золото', 'еда, мин', 'находки', 'торговцы', 'артефакты'];
const widths = header.map((label, column) => Math.max(
  label.length,
  ...table.map((row) => String(Object.values(row)[column]).length),
));
const line = (cells) => cells.map((cell, column) => String(cell).padStart(widths[column])).join('  ');

const report = [
  `# Баланс по ${seedCount} сидам`,
  '',
  'Отчёт ничего не играет: он считает то, что генератор кладёт на этаж.',
  '',
  '```',
  line(header),
  ...table.map((row) => line(Object.values(row))),
  '```',
  '',
  `- Голод полного героя: **${round(hungerMinutes)} мин**; еды на всё подземелье в среднем **${round(foodTotal)} мин** (${round(foodTotal / hungerMinutes, 2)} полных запаса).`,
  `- Артефактов за забег в среднем: **${round(artifactTotal, 2)}** (обещан один, лежит в запечатанном тайнике).`,
  `- Торговцев за забег: **${round(dungeonRows.reduce((sum, row) => sum + row.merchants, 0), 1)}**, находок: **${round(dungeonRows.reduce((sum, row) => sum + row.finds, 0), 1)}**.`,
  `- Суммарный опыт подземелья: **${round(dungeonRows.reduce((sum, row) => sum + row.xp, 0))}**.`,
  '',
].join('\n');

console.log(report);

if (shouldWrite) {
  const target = resolve(here, '../output/balance-report.md');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, report, 'utf8');
  console.log(`Записано: ${target}`);
}
