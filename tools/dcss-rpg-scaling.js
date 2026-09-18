import {
  DEFAULT_LOOT_ABUNDANCE,
  floorLootEconomy,
} from './dcss-rpg-loot-economy.js';
import { FINAL_DEPTH, FLOORS_PER_CHAPTER } from './dcss-rpg-run.js';

export const SCALING_VERSION = 2;

// Единственный общий регулятор сложности новых забегов. Значение 1 оставлено
// контрольной точкой прежнего баланса; 2.4 — новый основной профиль игры.
export const DEFAULT_DIFFICULTY = 2.4;
export const MIN_DIFFICULTY = 0.5;
export const MAX_DIFFICULTY = 4;

const CURVES = Object.freeze({
  1: Object.freeze({
    floorsPerChapter: 2,
    maximumMonsterCount: 24,
    maximumMonsterTier: 9,
    maximumLootCount: 9,
    baseMonsterCount: 8,
    monsterCountPerFloor: 2,
    baseRoomCount: 9,
    roomEveryFloors: 2,
    maximumRoomCount: 15,
    tierCurve: 'legacy',
  }),
  2: Object.freeze({
    floorsPerChapter: FLOORS_PER_CHAPTER,
    maximumMonsterCount: 24,
    maximumMonsterTier: 9,
    maximumLootCount: 9,
    baseMonsterCount: 8,
    monsterCountPerFloor: 2,
    baseRoomCount: 9,
    roomEveryFloors: 2,
    maximumRoomCount: 15,
    tierCurve: 'nine-floor-run',
  }),
});

export function scalingVersionSupported(version) {
  return Object.hasOwn(CURVES, version);
}

const round = (value, precision = 3) => {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
};

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function assertDepth(depth) {
  if (!Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Floor depth must be a positive integer');
  }
}

function assertDifficulty(difficulty) {
  if (
    !Number.isFinite(difficulty) ||
    difficulty < MIN_DIFFICULTY ||
    difficulty > MAX_DIFFICULTY
  ) {
    throw new RangeError(
      `Difficulty must be between ${MIN_DIFFICULTY} and ${MAX_DIFFICULTY}`,
    );
  }
}

function freezeProfile(profile) {
  Object.values(profile).forEach((value) => {
    if (value && typeof value === 'object') Object.freeze(value);
  });
  return Object.freeze(profile);
}

export function floorScaling(
  depth,
  version = SCALING_VERSION,
  difficulty = DEFAULT_DIFFICULTY,
  lootAbundance = DEFAULT_LOOT_ABUNDANCE,
) {
  assertDepth(depth);
  assertDifficulty(difficulty);
  const curve = CURVES[version];
  if (!curve) throw new RangeError(`Unsupported scaling version: ${version}`);

  const step = depth - 1;
  const chapter = Math.floor(step / curve.floorsPerChapter) + 1;
  const floorInChapter = (step % curve.floorsPerChapter) + 1;
  const chapterEnd = floorInChapter === curve.floorsPerChapter;
  const baseMonsterCount = Math.min(
    curve.maximumMonsterCount,
    curve.baseMonsterCount + step * curve.monsterCountPerFloor,
  );
  // Число врагов растёт заметно, но медленнее их силы: на мобильном экране
  // опасность должна исходить от читаемых противников, а не от визуальной свалки.
  const monsterCount = Math.min(
    curve.maximumMonsterCount,
    Math.round(baseMonsterCount * (0.72 + difficulty * 0.28)),
  );
  const maxMonsterTier = curve.tierCurve === 'legacy'
    ? Math.min(curve.maximumMonsterTier, 1 + step * 2)
    : Math.min(
        curve.maximumMonsterTier,
        1 + Math.floor((step * (curve.maximumMonsterTier - 1)) / (FINAL_DEPTH - 1)),
      );
  const averageThreat = 1 + Math.min(curve.maximumMonsterTier - 1, step * 0.6);
  const baseThreatBudget = Math.round(monsterCount * averageThreat);
  // Difficulty — честный линейный множитель основных боевых параметров.
  // Поэтому 2.4 действительно означает минимум ×2.4 к HP и урону относительно
  // прежней контрольной точки 1, а не скрыто ослабленную степень.
  const difficultyHp = difficulty;
  const difficultyDamage = difficulty;
  const difficultyTempo = 0.82 + difficulty * 0.18;
  const baseBossHp = 1.72 + Math.min(0.72, step * 0.11);
  const baseLootCount = Math.min(
    curve.maximumLootCount,
    4 + Math.floor(depth / 2),
  );
  const baseQualityBudget = round(
    (4 + depth * 2.5)
      * (0.9 + difficulty * 0.1)
      * (chapterEnd ? 1.25 : 1),
    2,
  );
  const lootEconomy = floorLootEconomy({
    baseCount: baseLootCount,
    baseQualityBudget,
    abundance: lootAbundance,
  });

  return freezeProfile({
    version,
    difficulty,
    lootAbundance,
    depth,
    chapter,
    floorInChapter,
    chapterEnd,
    dangerRating: round(
      (1 + step * 0.62 + step ** 1.18 * 0.08) * difficulty,
      2,
    ),
    layout: {
      roomCount: Math.min(
        curve.maximumRoomCount,
        curve.baseRoomCount + Math.floor(depth / curve.roomEveryFloors),
      ),
      eventCount: Math.min(4, 3 + (depth % 2)),
    },
    encounters: {
      monsterCount,
      maxMonsterTier,
      threatBudget: Math.max(monsterCount, Math.round(baseThreatBudget * difficulty)),
    },
    monsters: {
      hpMultiplier: round((1.18 + step * 0.2) * difficultyHp),
      damageMultiplier: round((1.28 + step * 0.18) * difficultyDamage),
      moveSpeedMultiplier: round((1.48 + step * 0.09) * (0.94 + difficulty * 0.06)),
      attackRateMultiplier: round((1 + step * 0.08) * difficultyTempo),
      visionBonus: round(Math.min(1.2, step * 0.25) * difficultyTempo),
      windupReduction: round(step * 0.01 * difficultyTempo),
      pursuitBonus: round(step * 0.35 * difficultyTempo),
      xpMultiplier: round(1 + step * 0.12),
    },
    boss: {
      // Общий difficulty уже применён в monsters.*. Не умножаем босса второй
      // раз, чтобы усиление оставалось суровым, но не превращалось в ваншот.
      hpMultiplier: round(baseBossHp),
      damageMultiplier: round(1.12 + Math.min(0.28, step * 0.02)),
      attackRateMultiplier: 1.08,
    },
    rewards: {
      baseLootCount,
      lootCount: lootEconomy.count,
      lootAbundance,
      maximumItemDepth: depth,
      qualityBudget: lootEconomy.qualityBudget,
      chapterBonus: chapterEnd,
    },
  });
}

export function itemPowerScore(item) {
  if (!item || typeof item !== 'object') return 0;
  const stats = item.stats ?? {};
  const combat = item.combat ?? {};
  const score =
    Math.max(0, item.rarity ?? 0) * 2 +
    Math.max(0, stats.attack ?? 0) * 1.6 +
    Math.max(0, stats.defense ?? 0) * 1.2 +
    Math.max(0, stats.maxHp ?? 0) * 0.12 +
    Math.max(0, stats.moveSpeed ?? 0) * 10 +
    Math.max(0, stats.attackSpeed ?? 0) * 10 +
    Math.max(0, combat.guard ?? 0) * 1.5 +
    Math.max(0, (combat.range ?? 1) - 1) * 0.5 +
    Math.max(0, (combat.damageScale ?? 1) - 1) * 3 +
    (combat.projectile ? 1.5 : 0) +
    new Set(item.magic?.immunity ?? []).size * 3 +
    Math.max(0, item.magic?.healOnKill ?? 0) * 1.5 +
    (item.magic?.flight ? 9 : 0) +
    (item.magic?.invisibility ? 9 : 0) +
    (item.magic?.vampirism ? 9 : 0);
  return round(score, 2);
}

export function effectiveLootDepth(item) {
  if (Number.isInteger(item?.minDepth) && item.minDepth >= 1) return item.minDepth;
  return Math.max(1, Math.ceil(itemPowerScore(item) / 4));
}

export function monsterTier(monster) {
  if (Number.isInteger(monster?.tier) && monster.tier >= 1) {
    return clamp(monster.tier, 1, 9);
  }
  if (!monster || typeof monster !== 'object') return 1;
  const threat = monster.threat ?? {};
  const score =
    Math.max(0, monster.hp ?? 0) * 0.12 +
    Math.max(0, monster.damage ?? 0) * 0.22 +
    Math.max(0, (monster.speed ?? 0.75) - 0.75) * 1.2 +
    Math.max(0, threat.attackRate ?? 0) * 0.6 +
    Math.max(0, (threat.vision ?? 4) - 4) * 0.25 +
    Math.max(0, (threat.pursuit ?? 3) - 3) * 0.15 +
    (monster.boss ? 2 : 0);
  return clamp(Math.ceil(score / 2.4), 1, 9);
}

export function lootEligibleForFloor(item, profile) {
  return item?.randomDrop !== false
    && effectiveLootDepth(item) <= profile.rewards.maximumItemDepth;
}

export function monsterEligibleForFloor(monster, profile) {
  return !monster?.unique && !monster?.spawn && !monster?.chapter
    && monsterTier(monster) <= profile.encounters.maxMonsterTier;
}
