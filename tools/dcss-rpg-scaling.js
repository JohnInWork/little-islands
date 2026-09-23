import {
  DEFAULT_LOOT_ABUNDANCE,
  floorLootEconomy,
} from './dcss-rpg-loot-economy.js';
import { STORY_DEPTH, FLOORS_PER_CHAPTER } from './dcss-rpg-run.js';

export const SCALING_VERSION = 4;

// Единственный общий регулятор сложности новых забегов. Значение 1 оставлено
// контрольной точкой прежнего баланса; 2.4 — новый основной профиль игры.
export const DEFAULT_DIFFICULTY = 2.4;
export const MIN_DIFFICULTY = 0.5;
export const MAX_DIFFICULTY = 4;

/**
 * The climb is written against the ROAD, not against the floor number.
 *
 * Version 2 was tuned on a nine-floor run: by its last floor the fight had
 * climbed eight steps, and those eight steps are the range the game actually
 * plays well over. When the road doubled to eighteen floors, keeping a step
 * per floor would have doubled the difficulty of the ending instead of
 * lengthening the journey — which is not what a longer chapter is for. So
 * version 3 spreads the same eight steps across however long the road is.
 *
 * Past the end of the road the climb keeps going, because that is the whole
 * point of an endless descent: it has to kill you eventually. What does NOT
 * keep going is the tempo — move speed, attack rate, windup, pursuit stop at
 * `tempoCeiling`. A fight has to stay readable at any depth; it is the numbers
 * that get out of reach, never the ability to see what is happening.
 */
const TUNED_CLIMB = 8;

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
    roadLength: null,
    tempoCeiling: null,
  }),
  // A version is a promise about the past: the numbers a v2 run was generated
  // with are written out here, not derived, so changing the road cannot reach
  // back and alter a floor somebody is standing on.
  2: Object.freeze({
    floorsPerChapter: 3,
    maximumMonsterCount: 24,
    maximumMonsterTier: 9,
    maximumLootCount: 9,
    baseMonsterCount: 8,
    monsterCountPerFloor: 2,
    baseRoomCount: 9,
    roomEveryFloors: 2,
    maximumRoomCount: 15,
    tierCurve: 'road',
    roadLength: 9,
    tempoCeiling: null,
  }),
  3: Object.freeze({
    floorsPerChapter: FLOORS_PER_CHAPTER,
    maximumMonsterCount: 24,
    maximumMonsterTier: 9,
    maximumLootCount: 9,
    baseMonsterCount: 8,
    monsterCountPerFloor: 2,
    baseRoomCount: 9,
    roomEveryFloors: 2,
    maximumRoomCount: 15,
    tierCurve: 'road',
    roadLength: STORY_DEPTH,
    tempoCeiling: TUNED_CLIMB,
    entryRamp: null,
  }),
  /*
   * Вход в подземелье.
   *
   * Бот, игравший в игру осторожно — колдовал, лечился, не бросался на всех,
   * — в семи забегах из восьми погибал на первом этаже за 17–38 секунд
   * игрового времени: герой первого уровня бьёт на 2, монстр — на 12–15, и
   * второй враг рядом означает смерть. Иван: «делай как лучше». Первые три
   * этажа теперь — вход: монстры слабее, их меньше, а с четвёртого этажа всё
   * как было. Прежние забеги остаются на версии 3 — у них ничего не меняется.
   */
  4: Object.freeze({
    floorsPerChapter: FLOORS_PER_CHAPTER,
    maximumMonsterCount: 24,
    maximumMonsterTier: 9,
    maximumLootCount: 9,
    baseMonsterCount: 8,
    monsterCountPerFloor: 2,
    baseRoomCount: 9,
    roomEveryFloors: 2,
    maximumRoomCount: 15,
    tierCurve: 'road',
    roadLength: STORY_DEPTH,
    tempoCeiling: TUNED_CLIMB,
    entryRamp: Object.freeze({
      damage: Object.freeze([0.5, 0.7, 0.85]),
      hp: Object.freeze([0.6, 0.75, 0.9]),
      count: Object.freeze([0.75, 0.85, 0.95]),
    }),
  }),
});

/** Доля силы монстров на входе в подземелье: 1 — за пределами входа. */
function entryShare(curve, depth, axis) {
  return curve.entryRamp?.[axis]?.[depth - 1] ?? 1;
}

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
  // How far up the tuned range this floor stands. On the legacy curve that is
  // the floor number itself; on a road curve the range is stretched over the
  // whole road, and keeps climbing past its end.
  const climb = curve.roadLength === null
    ? step
    : (step * TUNED_CLIMB) / (curve.roadLength - 1);
  // What a fight is allowed to do to the eye. Everything читаемое stops here.
  const tempo = curve.tempoCeiling === null ? climb : Math.min(curve.tempoCeiling, climb);
  const chapter = Math.floor(step / curve.floorsPerChapter) + 1;
  const floorInChapter = (step % curve.floorsPerChapter) + 1;
  const chapterEnd = floorInChapter === curve.floorsPerChapter;
  const baseMonsterCount = Math.min(
    curve.maximumMonsterCount,
    curve.baseMonsterCount + climb * curve.monsterCountPerFloor,
  );
  // Число врагов растёт заметно, но медленнее их силы: на мобильном экране
  // опасность должна исходить от читаемых противников, а не от визуальной свалки.
  const monsterCount = Math.min(
    curve.maximumMonsterCount,
    Math.round(baseMonsterCount * (0.72 + difficulty * 0.28) * entryShare(curve, depth, 'count')),
  );
  // The deepest creature the game owns stands at the end of the road, and the
  // pool has nothing deeper to offer after that: the tier ladder tops out and
  // stays there while the numbers on those same creatures keep climbing.
  const maxMonsterTier = curve.tierCurve === 'legacy'
    ? Math.min(curve.maximumMonsterTier, 1 + step * 2)
    : Math.min(
        curve.maximumMonsterTier,
        1 + Math.floor((climb * (curve.maximumMonsterTier - 1)) / TUNED_CLIMB),
      );
  const averageThreat = 1 + Math.min(curve.maximumMonsterTier - 1, climb * 0.6);
  const baseThreatBudget = Math.round(monsterCount * averageThreat);
  // Difficulty — честный линейный множитель основных боевых параметров.
  // Поэтому 2.4 действительно означает минимум ×2.4 к HP и урону относительно
  // прежней контрольной точки 1, а не скрыто ослабленную степень.
  const difficultyHp = difficulty;
  const difficultyDamage = difficulty;
  const difficultyTempo = 0.82 + difficulty * 0.18;
  const baseBossHp = 1.72 + Math.min(0.72, climb * 0.11);
  /*
   * Место, которое этаж отдаёт бою.
   *
   * С тех пор как с убитых падает своё, добро приходит из двух мест, а не из
   * одного: пол и бой. Если оставить пол прежним, к середине дороги станет
   * жирно — поэтому этаж отдаёт одно место с той глубины, где у монстров
   * вообще есть что ронять, и ещё одно там, где стоит страж: его вещь и есть
   * то, ради чего на этот этаж шли.
   *
   * Первые четыре этажа не трогаются вовсе. Там ронять пока некому, а голый
   * старт Иван уже ловил однажды, и второй раз заводить его не за чем.
   */
  /*
   * Одно место этаж отдал бою, второе — цене.
   *
   * Первое вычли, когда с убитых начало падать своё. Второе — когда стало
   * видно, что находка ничего не значит: Иван зачистил первый этаж, пришёл в
   * город и оделся с головы до ног за сорок четыре монеты. «Вещи в игре должны
   * быть дорогие, чтобы это была находка. <...> урежь всё-таки находки, если
   * сейчас 2.2, то сделаем 1.5».
   *
   * Вычитается после потолка, а не до: глубокие этажи давно упираются в
   * девять, и вычитание внутри `Math.min` на них не доходило бы.
   */
  const baseLootCount = Math.max(
    3,
    Math.min(curve.maximumLootCount, 4 + Math.floor(depth / 2))
      // Ровно одно место, а не два: на этаже стража его вещь заменяет надбавку
      // за главу, а не половину этажа. Резать глубже нельзя — по этому же
      // счёту отмерены и еда, и золото в сокровищнице.
      - (depth >= 5 || chapterEnd ? 1 : 0),
  );
  const baseQualityBudget = round(
    (4 + depth * 2.5)
      * (0.9 + difficulty * 0.1)
      // Надбавка на этаже стража была написана тогда, когда сам страж не
      // оставлял ничего. Теперь оставляет — и лучшее, что есть на этой
      // глубине, — так что пол добавляет к этому заметно меньше.
      * (chapterEnd ? 1.1 : 1),
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
    // Доля силы входа (1 — полная): её же берут правила, которые меряются
    // уроном этажа, например потолок вампиризма.
    entry: {
      // Давление этажа на героя: каждый бьёт слабее, и их меньше.
      pressure: round(entryShare(curve, depth, 'damage') * entryShare(curve, depth, 'count')),
      damage: entryShare(curve, depth, 'damage'),
      hp: entryShare(curve, depth, 'hp'),
      count: entryShare(curve, depth, 'count'),
    },
    dangerRating: round(
      (1 + climb * 0.62 + climb ** 1.18 * 0.08) * difficulty,
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
      // These are the numbers, and they never stop: sooner or later the deep
      // wins, and how far down that happened is the score.
      hpMultiplier: round((1.18 + climb * 0.2) * difficultyHp * entryShare(curve, depth, 'hp')),
      damageMultiplier: round((1.28 + climb * 0.18) * difficultyDamage * entryShare(curve, depth, 'damage')),
      xpMultiplier: round(1 + climb * 0.12),
      // And this is the tempo, which does stop. A creature eleven times faster
      // than the hero is not difficult, it is unreadable — you cannot flee it,
      // kite it or see it wind up, so the floor stops being a fight and becomes
      // a dice roll. The ceiling is the pace the game was tuned at.
      moveSpeedMultiplier: round((1.48 + tempo * 0.09) * (0.94 + difficulty * 0.06)),
      attackRateMultiplier: round((1 + tempo * 0.08) * difficultyTempo),
      visionBonus: round(Math.min(1.2, tempo * 0.25) * difficultyTempo),
      windupReduction: round(tempo * 0.01 * difficultyTempo),
      pursuitBonus: round(tempo * 0.35 * difficultyTempo),
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
