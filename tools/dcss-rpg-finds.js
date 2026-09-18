import {
  CHEST_ASSET_PATHS,
  CHEST_DEFAULT_PATH,
  chestResultPresentation,
  createChestProfile,
  resolveChestInteraction,
} from './dcss-rpg-chests.js';
import {
  ACTOR_EFFECT_IDS,
  MAX_EFFECT_DURATION,
  clearActorEffects,
  createActorEffects,
} from './dcss-rpg-effects.js';
import { dungeonThemeForDepth } from './dcss-rpg-room-plans.js';
import { WATER_CELL } from './dcss-rpg-terrain.js';

const freezeCopy = (value) => Object.freeze({ ...value });

const defineFind = (definition) =>
  Object.freeze({
    wave: 'core',
    ...definition,
    ...(definition.skins ? { skins: Object.freeze({ ...definition.skins }) } : {}),
    ...(definition.outcomes
      ? { outcomes: Object.freeze(definition.outcomes.map((outcome) => Object.freeze({ ...outcome }))) }
      : {}),
    copy: Object.freeze({
      ru: freezeCopy(definition.copy.ru),
      en: freezeCopy(definition.copy.en),
    }),
  });

/** Three core finds share one stream; landmarks use a second one. */
export const CORE_FINDS_PER_FLOOR = 3;
export const LANDMARKS_PER_FLOOR = 1;
export const MAX_FINDS_PER_FLOOR = CORE_FINDS_PER_FLOOR + LANDMARKS_PER_FLOOR;

/**
 * Landmark outcomes are plain numbers rolled once at generation. The generic
 * resolver reads only these keys, so a fountain or rune later adds a catalog
 * entry with its own `outcomes` instead of a new command family.
 */
export const LANDMARK_OUTCOME_KEYS = Object.freeze([
  'costGold',
  'damage',
  'heal',
  'healRatio',
  'cleanse',
  'rewardGold',
  'rewardPower',
  'rewardMaxHp',
  'noise',
  'status',
]);

export const FIND_CATALOG = Object.freeze([
  defineFind({
    id: 'sealed-cache',
    category: 'useful',
    path: CHEST_DEFAULT_PATH,
    size: 76,
    screenOffsetY: -8,
    color: '#d9bd67',
    glyph: '+',
    copy: {
      ru: {
        name: 'Древний сундук',
        action: 'Осмотреть древний сундук',
        result: 'Содержимое сундука получено',
      },
      en: {
        name: 'Ancient chest',
        action: 'Inspect the ancient chest',
        result: 'The chest contents were recovered',
      },
    },
  }),
  defineFind({
    id: 'crystal-vein',
    category: 'useful',
    path: 'item/misc/misc_crystal.png',
    size: 66,
    screenOffsetY: -10,
    color: '#7fc8d2',
    glyph: '✦',
    light: Object.freeze({ color: '#6eb9c8', radius: 2.15, beam: false }),
    copy: {
      ru: {
        name: 'Живая кристальная жила',
        action: 'Извлечь кристалл',
        result: 'Сила героя выросла',
      },
      en: {
        name: 'Living crystal vein',
        action: 'Extract the crystal',
        result: 'The hero grew stronger',
      },
    },
  }),
  defineFind({
    id: 'forgotten-grave',
    category: 'warned-risk',
    path: 'dngn/vaults/sarcophagus_sealed.png',
    size: 72,
    screenOffsetY: -9,
    color: '#b45c58',
    glyph: '!',
    copy: {
      ru: {
        name: 'Древняя гробница',
        action: 'Осквернить древнюю гробницу',
        unsafe: 'Слишком опасно при таком здоровье',
        result: 'Проклятие ранило героя, но тайник найден',
      },
      en: {
        name: 'Ancient tomb',
        action: 'Defile the ancient tomb',
        unsafe: 'Too dangerous at this health',
        result: 'The curse wounded the hero, but the cache was found',
      },
    },
  }),
  defineFind({
    id: 'ancient-altar',
    category: 'choice',
    wave: 'landmark',
    path: 'dngn/altars/shining_one.png',
    skins: {
      'ashen-vault': 'dngn/altars/shining_one.png',
      'buried-sanctum': 'dngn/altars/gozag0.png',
      'frozen-depths': 'dngn/altars/dithmenos.png',
      'infernal-core': 'dngn/altars/lugonu.png',
    },
    size: 72,
    screenOffsetY: -9,
    color: '#e0c06a',
    glyph: '✚',
    light: Object.freeze({ color: '#d9b45c', radius: 1.9, beam: false }),
    // Each entry rolls concrete numbers once per floor. `pray` is free but only
    // meaningful while something can be healed or cleansed; `offer` trades gold
    // for permanent vitality; `plunder` is the advertised risk.
    outcomes: [
      {
        id: 'pray',
        roll: () => ({ healRatio: 0.3, cleanse: true }),
      },
      {
        id: 'offer',
        roll: (depth, rng) => ({
          costGold: 10 + depth * 4 + rng.int(0, 4),
          rewardMaxHp: 4 + depth,
          heal: 4 + depth,
        }),
      },
      {
        id: 'plunder',
        roll: (depth, rng) => ({
          rewardGold: 12 + depth * 4 + rng.int(0, 5),
          damage: 6 + depth * 3 + rng.int(0, 2),
          status: { id: rng.int(0, 1) ? 'poison' : 'chilled', duration: 4 + Math.min(6, depth) },
          noise: 6,
        }),
      },
    ],
    copy: {
      ru: {
        name: 'Древний алтарь',
        action: 'Подойти к древнему алтарю',
        inspected: 'Каменный алтарь. В чаше видны следы прежних подношений.',
        unsafe: 'Слишком опасно при таком здоровье',
        nothingToHeal: 'Нечего лечить',
        goldRequired: 'Нужно',
        result: 'Алтарь ответил герою',
        results: {
          pray: 'Алтарь очистил и исцелил героя',
          offer: 'Подношение принято, здоровье героя окрепло',
          plunder: 'Алтарь ограблен, проклятие пало на героя',
        },
      },
      en: {
        name: 'Ancient altar',
        action: 'Approach the ancient altar',
        inspected: 'A stone altar. The bowl holds traces of old offerings.',
        unsafe: 'Too dangerous at this health',
        nothingToHeal: 'Nothing to heal',
        goldRequired: 'Needs',
        result: 'The altar answered the hero',
        results: {
          pray: 'The altar cleansed and healed the hero',
          offer: 'The offering was accepted; the hero grew hardier',
          plunder: 'The altar was plundered and its curse fell on the hero',
        },
      },
    },
  }),
  defineFind({
    id: 'sunken-fountain',
    category: 'choice',
    wave: 'landmark',
    // The fountain looks for a flooded room first; standing water is its home.
    prefersWater: true,
    path: 'dngn/blue_fountain.png',
    skins: {
      'ashen-vault': 'dngn/blue_fountain.png',
      'buried-sanctum': 'dngn/sparkling_fountain.png',
      'frozen-depths': 'dngn/blue_fountain2.png',
      'infernal-core': 'dngn/blood_fountain.png',
    },
    size: 72,
    screenOffsetY: -7,
    color: '#63b8ca',
    glyph: '\u2248',
    light: Object.freeze({ color: '#5ea9c4', radius: 1.8, beam: false }),
    // Water is the fountain's currency: drinking restores but soaks, a tossed
    // coin buys lasting strength, and the coins on the bottom lie in the cold.
    outcomes: [
      {
        id: 'drink',
        roll: () => ({ healRatio: 0.25, status: { id: 'wet', duration: 6 } }),
      },
      {
        id: 'toss',
        roll: (depth, rng) => ({
          costGold: 8 + depth * 3 + rng.int(0, 3),
          rewardPower: 1,
        }),
      },
      {
        id: 'dive',
        roll: (depth, rng) => ({
          rewardGold: 10 + depth * 4 + rng.int(0, 5),
          damage: 4 + depth * 2 + rng.int(0, 2),
          status: { id: 'chilled', duration: 5 + Math.min(6, depth) },
        }),
      },
    ],
    copy: {
      ru: {
        name: 'Затопленный фонтан',
        action: 'Подойти к фонтану',
        inspected: 'Чаша полна тёмной воды. На дне поблёскивают монеты.',
        unsafe: 'Слишком опасно при таком здоровье',
        nothingToHeal: 'Нечего лечить',
        goldRequired: 'Нужно',
        result: 'Фонтан ответил герою',
        results: {
          drink: 'Герой напился и вымок',
          toss: 'Монета ушла на дно, рука стала твёрже',
          dive: 'Монеты добыты, вода выстудила героя',
        },
      },
      en: {
        name: 'Sunken fountain',
        action: 'Approach the fountain',
        inspected: 'The basin holds dark water. Coins glint at the bottom.',
        unsafe: 'Too dangerous at this health',
        nothingToHeal: 'Nothing to heal',
        goldRequired: 'Needs',
        result: 'The fountain answered the hero',
        results: {
          drink: 'The hero drank deep and came up soaked',
          toss: 'The coin sank and the hero grew steadier',
          dive: 'The coins were won and the water chilled the hero',
        },
      },
    },
  }),
  defineFind({
    id: 'warded-rune',
    category: 'choice',
    wave: 'landmark',
    path: 'dngn/altars/ashenzari.png',
    skins: {
      'ashen-vault': 'dngn/altars/ashenzari.png',
      'buried-sanctum': 'dngn/altars/kikubaaqudgha.png',
      'frozen-depths': 'dngn/altars/cheibriados.png',
      'infernal-core': 'dngn/altars/makhleb_flame1.png',
    },
    size: 70,
    screenOffsetY: -8,
    color: '#9b86d8',
    glyph: '\u25c8',
    light: Object.freeze({ color: '#8f7ad0', radius: 1.7, beam: false }),
    // The rune takes no gold at all: it is paid for in blood and in noise.
    outcomes: [
      {
        id: 'decipher',
        roll: (depth, rng) => ({ rewardPower: 1, damage: 3 + depth + rng.int(0, 2) }),
      },
      {
        id: 'attune',
        roll: (depth) => ({ heal: 5 + depth, cleanse: true }),
      },
      {
        id: 'break',
        roll: (depth, rng) => ({
          rewardGold: 14 + depth * 4 + rng.int(0, 5),
          noise: 9,
          status: { id: 'poison', duration: 4 + Math.min(6, depth) },
        }),
      },
    ],
    copy: {
      ru: {
        name: 'Запечатанная руна',
        action: 'Подойти к руне',
        inspected: 'Камень в цепях. Знаки на нём ещё держат тепло.',
        unsafe: 'Слишком опасно при таком здоровье',
        nothingToHeal: 'Нечего лечить',
        goldRequired: 'Нужно',
        result: 'Руна ответила герою',
        results: {
          decipher: 'Знаки прочтены, разум заплатил кровью',
          attune: 'Оберег руны затянул раны',
          break: 'Руна расколота, подземелье услышало',
        },
      },
      en: {
        name: 'Warded rune',
        action: 'Approach the rune',
        inspected: 'A stone bound in chains. Its marks still hold warmth.',
        unsafe: 'Too dangerous at this health',
        nothingToHeal: 'Nothing to heal',
        goldRequired: 'Needs',
        result: 'The rune answered the hero',
        results: {
          decipher: 'The marks were read and paid for in blood',
          attune: 'The ward of the rune closed the wounds',
          break: 'The rune was broken and the dungeon heard it',
        },
      },
    },
  }),
]);

const FINDS_BY_ID = new Map(FIND_CATALOG.map((definition) => [definition.id, definition]));

export function findById(id) {
  return FINDS_BY_ID.get(id) ?? null;
}

export const CORE_FIND_CATALOG = Object.freeze(
  FIND_CATALOG.filter(({ wave }) => wave === 'core'),
);
export const LANDMARK_CATALOG = Object.freeze(
  FIND_CATALOG.filter(({ wave }) => wave === 'landmark'),
);

export const FIND_ASSET_PATHS = Object.freeze([
  ...new Set([
    ...FIND_CATALOG.flatMap(({ path, skins }) => [path, ...Object.values(skins ?? {})]),
    ...CHEST_ASSET_PATHS,
  ]),
]);

/** Themed skin for a generated find; falls back to the catalog path. */
export function findSkinPath(find) {
  const definition = findById(find?.id);
  if (!definition) return null;
  return definition.skins?.[find.themeId] ?? definition.path;
}

function roomSize(room, key) {
  return room[key] ?? room[key === 'width' ? 'w' : 'h'];
}

function roomContains(room, point) {
  return (
    point &&
    point.x >= room.x &&
    point.x < room.x + roomSize(room, 'width') &&
    point.y >= room.y &&
    point.y < room.y + roomSize(room, 'height')
  );
}

function shuffle(rng, values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = rng.int(0, index);
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

function roomHoldsWater(grid, room) {
  for (let y = room.y; y < room.y + roomSize(room, 'height'); y += 1) {
    for (let x = room.x; x < room.x + roomSize(room, 'width'); x += 1) {
      if (grid[y]?.[x] === WATER_CELL) return true;
    }
  }
  return false;
}

function roomFindCells(level, room, occupied, avoided) {
  const cells = [];
  const right = room.x + roomSize(room, 'width') - 1;
  const bottom = room.y + roomSize(room, 'height') - 1;
  for (let y = room.y + 1; y < bottom; y += 1) {
    for (let x = room.x + 1; x < right; x += 1) {
      const key = `${x},${y}`;
      if (level.grid[y]?.[x] !== '.' || occupied.has(key) || avoided.has(key)) continue;
      const approaches = [
        `${x + 1},${y}`,
        `${x - 1},${y}`,
        `${x},${y + 1}`,
        `${x},${y - 1}`,
      ].filter((approach) => {
        const [nextX, nextY] = approach.split(',').map(Number);
        return level.grid[nextY]?.[nextX] === '.' && !occupied.has(approach);
      });
      if (approaches.length >= 2) cells.push({ x, y });
    }
  }
  return cells;
}

function outcomeFor(definition, depth, rng) {
  if (definition.id === 'crystal-vein') {
    return { rewardGold: 2 + depth + rng.int(0, 2), rewardPower: 1, riskDamage: 0 };
  }
  if (definition.id === 'forgotten-grave') {
    return {
      rewardGold: 8 + depth * 3 + rng.int(0, 4),
      rewardPower: 0,
      riskDamage: 8 + depth * 4 + rng.int(0, 3),
    };
  }
  return { rewardGold: 5 + depth * 2 + rng.int(0, 4), rewardPower: 0, riskDamage: 0 };
}

const isSeededRng = (rng) =>
  Boolean(rng) && typeof rng.next === 'function' && typeof rng.int === 'function';

function eligibleFindRooms(level) {
  const surpriseRooms = new Set(
    (level.surprises ?? [])
      .map(({ roomIndex }) => roomIndex)
      .filter(Number.isInteger),
  );
  return level.rooms
    .map((room, roomIndex) => ({ room, roomIndex }))
    .filter(
      ({ room, roomIndex }) =>
        roomIndex > 0 &&
        !surpriseRooms.has(roomIndex) &&
        !roomContains(room, level.exit),
    );
}

function landmarkOutcomes(definition, depth, rng) {
  return Object.fromEntries(
    definition.outcomes.map((outcome) => [outcome.id, outcome.roll(depth, rng)]),
  );
}

/**
 * Landmarks (altar today; fountain/rune later) are placed after the core
 * finds from their own seeded stream. Adding or retuning one therefore never
 * reshuffles the chest, crystal, grave, monsters, loot or doors of a floor.
 */
function placeLandmarks({ level, rng, roomEntries, occupied, avoided, usedRooms }) {
  if (!isSeededRng(rng) || LANDMARK_CATALOG.length === 0) return [];
  const themeId = dungeonThemeForDepth(level.depth).id;
  const rooms = shuffle(
    rng,
    roomEntries.filter(({ roomIndex }) => !usedRooms.has(roomIndex)),
  );
  const blueprints = shuffle(rng, [...LANDMARK_CATALOG]);
  const targetCount = Math.min(LANDMARKS_PER_FLOOR, rooms.length, blueprints.length);
  // A blueprint that wants water takes the flooded room when the floor has one.
  // The sort is stable, so every other floor keeps the shuffled order exactly.
  const ordered = blueprints[0]?.prefersWater
    ? [...rooms].sort((a, b) => (
      Number(roomHoldsWater(level.grid, b.room)) - Number(roomHoldsWater(level.grid, a.room))
    ))
    : rooms;
  const landmarks = [];
  for (const { room, roomIndex } of ordered) {
    if (landmarks.length >= targetCount) break;
    const candidates = shuffle(rng, roomFindCells(level, room, occupied, avoided));
    const cell = candidates[0];
    if (!cell) continue;
    const definition = blueprints[landmarks.length];
    occupied.add(`${cell.x},${cell.y}`);
    landmarks.push({
      instanceId: `find-${level.depth}-${roomIndex}`,
      id: definition.id,
      roomIndex,
      x: cell.x,
      y: cell.y,
      themeId,
      rewardGold: 0,
      rewardPower: 0,
      riskDamage: 0,
      outcomes: landmarkOutcomes(definition, level.depth, rng),
    });
  }
  return landmarks;
}

export function createDungeonFinds({
  level,
  rng,
  landmarkRng = null,
  occupiedCells = [],
  avoidCells = [],
}) {
  if (
    !level ||
    !Number.isInteger(level.depth) ||
    !Array.isArray(level.grid) ||
    !Array.isArray(level.rooms) ||
    !isSeededRng(rng)
  ) {
    throw new TypeError('Dungeon finds require a generated level and seeded RNG');
  }
  const occupied = new Set(occupiedCells);
  const avoided = new Set(avoidCells);
  const roomEntries = shuffle(rng, eligibleFindRooms(level));
  const blueprints = shuffle(rng, [...CORE_FIND_CATALOG]);
  const targetCount = Math.min(CORE_FINDS_PER_FLOOR, roomEntries.length);
  const finds = [];

  for (const { room, roomIndex } of roomEntries) {
    if (finds.length >= targetCount) break;
    const candidates = shuffle(rng, roomFindCells(level, room, occupied, avoided));
    const cell = candidates[0];
    if (!cell) continue;
    const definition = blueprints[finds.length % blueprints.length];
    const outcome = outcomeFor(definition, level.depth, rng);
    occupied.add(`${cell.x},${cell.y}`);
    finds.push({
      instanceId: `find-${level.depth}-${roomIndex}`,
      id: definition.id,
      roomIndex,
      x: cell.x,
      y: cell.y,
      ...outcome,
      ...(definition.id === 'sealed-cache'
        ? createChestProfile({
            seed: level.seed ?? 0,
            depth: level.depth,
            roomIndex,
            rewardGold: outcome.rewardGold,
          })
        : {}),
    });
  }
  return [
    ...finds,
    ...placeLandmarks({
      level,
      rng: landmarkRng,
      roomEntries,
      occupied,
      avoided,
      usedRooms: new Set(finds.map(({ roomIndex }) => roomIndex)),
    }),
  ];
}

const isNonNegativeNumber = (value) => Number.isFinite(value) && value >= 0;

function validLandmarkOutcome(outcome) {
  if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) return false;
  if (Object.keys(outcome).some((key) => !LANDMARK_OUTCOME_KEYS.includes(key))) return false;
  const {
    costGold = 0,
    damage = 0,
    heal = 0,
    healRatio = 0,
    cleanse = false,
    rewardGold = 0,
    rewardPower = 0,
    rewardMaxHp = 0,
    noise = 0,
    status = null,
  } = outcome;
  if (![costGold, damage, heal, rewardGold, rewardPower, rewardMaxHp, noise].every(Number.isInteger)) {
    return false;
  }
  if (![costGold, damage, heal, rewardGold, rewardPower, rewardMaxHp, noise].every(isNonNegativeNumber)) {
    return false;
  }
  if (!Number.isFinite(healRatio) || healRatio < 0 || healRatio > 1) return false;
  if (typeof cleanse !== 'boolean') return false;
  if (status !== null) {
    if (
      !status
      || !ACTOR_EFFECT_IDS.includes(status.id)
      || !Number.isFinite(status.duration)
      || status.duration <= 0
      || status.duration > MAX_EFFECT_DURATION
    ) return false;
  }
  return true;
}

export function isLandmarkFind(find) {
  const definition = findById(find?.id);
  if (!definition || definition.wave !== 'landmark') return false;
  if (!find.outcomes || typeof find.outcomes !== 'object' || Array.isArray(find.outcomes)) return false;
  const expected = definition.outcomes.map(({ id }) => id);
  const actual = Object.keys(find.outcomes);
  return (
    actual.length === expected.length
    && expected.every((id) => actual.includes(id) && validLandmarkOutcome(find.outcomes[id]))
  );
}

function normalizedLandmarkActor(actor = {}) {
  const vitals = actor?.vitals ?? {};
  const hp = Number.isFinite(vitals.hp) ? vitals.hp : null;
  const healCap = Number.isFinite(vitals.maxHp) && vitals.maxHp >= 1 ? vitals.maxHp : null;
  const effects = createActorEffects(vitals.effects);
  return {
    gold: Number.isInteger(actor?.gold) && actor.gold >= 0 ? actor.gold : null,
    hp,
    healCap,
    hasEffects: ACTOR_EFFECT_IDS.some((id) => effects[id] > 0),
  };
}

const landmarkAction = (id, enabled = true, hint = '') => Object.freeze({ id, enabled, hint });

/** A free action whose only effect is restoration has no consequence when nothing needs restoring. */
function outcomeOnlyRestores(outcome) {
  return (outcome.heal ?? 0) + (outcome.healRatio ?? 0) > 0
    && !(outcome.rewardGold || outcome.rewardPower || outcome.rewardMaxHp)
    && (outcome.costGold ?? 0) === 0;
}

/**
 * Availability is decided from outcome data and the actor snapshot: a cost
 * needs the gold, damage must stay non-lethal, and a pure heal needs something
 * to heal. Unknown actor fields simply leave the action enabled; the resolver
 * re-validates before any mutation.
 */
export function landmarkActionRules({ find, actor, language = 'ru' } = {}) {
  const definition = findById(find?.id);
  if (!definition || !isLandmarkFind(find)) throw new TypeError('Landmark actions require a generated landmark');
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = definition.copy[locale];
  const access = normalizedLandmarkActor(actor);
  const actions = definition.outcomes.map(({ id }) => {
    const outcome = find.outcomes[id];
    const costGold = outcome.costGold ?? 0;
    const damage = outcome.damage ?? 0;
    const onlyRestores = outcomeOnlyRestores(outcome);
    if (costGold > 0 && access.gold !== null && access.gold < costGold) {
      // Short enough for a two-line thumb button in both languages: "Нужно 16●".
      return landmarkAction(id, false, `${copy.goldRequired} ${costGold}●`);
    }
    if (damage > 0 && access.hp !== null && access.hp <= damage) {
      return landmarkAction(id, false, copy.unsafe);
    }
    if (
      onlyRestores
      && access.hp !== null
      && access.healCap !== null
      && access.hp >= access.healCap
      && !(outcome.cleanse && access.hasEffects)
    ) {
      return landmarkAction(id, false, copy.nothingToHeal);
    }
    return landmarkAction(id, true, costGold > 0 ? `−${costGold}●` : '');
  });
  return Object.freeze({ access: Object.freeze(access), actions: Object.freeze(actions) });
}

export function landmarkContextPresentation({ find, actor, inspected = false, language = 'ru' } = {}) {
  const definition = findById(find?.id);
  if (!definition || !isLandmarkFind(find) || typeof inspected !== 'boolean') return null;
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = definition.copy[locale];
  const rules = landmarkActionRules({ find, actor, language: locale });
  return Object.freeze({
    name: copy.name,
    description: inspected ? copy.inspected : '',
    icon: typeof find.icon === 'string' && find.icon.length > 0 ? find.icon : findSkinPath(find),
    accent: definition.color,
    actions: Object.freeze([landmarkAction('inspect'), ...rules.actions]),
  });
}

function resolveLandmarkInteraction({
  definition,
  find,
  resolvedFindIds,
  hero,
  gold,
  action,
  actor,
}) {
  if (!isLandmarkFind(find) || typeof action !== 'string') return rejected('invalid');
  const outcome = find.outcomes[action];
  if (!outcome) return rejected('action');
  const costGold = outcome.costGold ?? 0;
  const damageRoll = outcome.damage ?? 0;
  if (costGold > gold) return rejected('gold-required');
  if (damageRoll > 0 && hero.hp <= damageRoll) return rejected('unsafe');
  const baseMaxHp = Number.isFinite(hero.maxHp) && hero.maxHp >= 1 ? hero.maxHp : hero.hp;
  const providedCap = Number.isFinite(actor?.vitals?.maxHp) && actor.vitals.maxHp >= 1
    ? actor.vitals.maxHp
    : baseMaxHp;
  const rewardMaxHp = outcome.rewardMaxHp ?? 0;
  const healCap = Math.max(1, providedCap) + rewardMaxHp;
  const effects = createActorEffects(hero.effects);
  const hasEffects = ACTOR_EFFECT_IDS.some((id) => effects[id] > 0);
  if (
    outcomeOnlyRestores(outcome)
    && hero.hp >= healCap
    && !(outcome.cleanse && hasEffects)
  ) return rejected('nothing-to-restore');
  const damage = Math.max(0, Math.min(damageRoll, hero.hp - 1));
  const wounded = hero.hp - damage;
  const requestedHeal = (outcome.heal ?? 0) + Math.round((outcome.healRatio ?? 0) * healCap);
  const hp = Math.min(healCap, wounded + requestedHeal);
  const heal = Math.max(0, hp - wounded);
  const cleansing = outcome.cleanse ? clearActorEffects(effects) : null;
  const rewardGold = outcome.rewardGold ?? 0;
  const rewardPower = outcome.rewardPower ?? 0;
  return Object.freeze({
    ok: true,
    definition,
    action,
    damage,
    heal,
    costGold,
    rewardGold,
    destroyedGold: 0,
    rewardPower,
    rewardMaxHp,
    cleansed: Object.freeze(cleansing ? [...cleansing.cleared] : []),
    status: outcome.status ? Object.freeze({ ...outcome.status }) : null,
    noise: outcome.noise ?? 0,
    consumed: Object.freeze([]),
    state: Object.freeze({
      hero: Object.freeze({
        ...hero,
        hp,
        maxHp: baseMaxHp + rewardMaxHp,
        power: hero.power + rewardPower,
        effects: Object.freeze(cleansing ? cleansing.effects : effects),
      }),
      gold: gold - costGold + rewardGold,
      resolvedFindIds: Object.freeze([...resolvedFindIds, find.instanceId]),
    }),
  });
}

/** Short RU/EN summary of what actually changed, for the toast/announcement. */
export function landmarkResultSummary(result, language = 'ru') {
  if (!result?.ok || !result.definition || result.definition.wave !== 'landmark') return '';
  const ru = language !== 'en';
  const parts = [];
  if (result.heal > 0) parts.push(ru ? `здоровье +${result.heal}` : `health +${result.heal}`);
  if (result.rewardMaxHp > 0) {
    parts.push(ru ? `максимум здоровья +${result.rewardMaxHp}` : `max health +${result.rewardMaxHp}`);
  }
  if (result.cleansed.length > 0) parts.push(ru ? 'статусы сняты' : 'effects cleared');
  if (result.rewardPower > 0) parts.push(ru ? `сила +${result.rewardPower}` : `power +${result.rewardPower}`);
  if (result.costGold > 0) parts.push(ru ? `золото −${result.costGold}` : `gold −${result.costGold}`);
  if (result.rewardGold > 0) parts.push(ru ? `золото +${result.rewardGold}` : `gold +${result.rewardGold}`);
  if (result.damage > 0) parts.push(ru ? `урон ${result.damage}` : `damage ${result.damage}`);
  if (result.status) {
    parts.push(ru ? `статус ${Math.ceil(result.status.duration)} сек.` : `status ${Math.ceil(result.status.duration)} sec.`);
  }
  const summary = parts.join(', ');
  return summary ? summary[0].toUpperCase() + summary.slice(1) : '';
}

export function findPresentation(find, language = 'ru') {
  const definition = findById(find?.id);
  if (!definition) return null;
  const locale = language === 'en' ? 'en' : 'ru';
  return Object.freeze({
    ...definition.copy[locale],
    id: definition.id,
    wave: definition.wave,
    path: findSkinPath(find),
    color: definition.color,
    glyph: definition.glyph,
    riskDamage: find.riskDamage,
    rewardGold: find.rewardGold,
    rewardPower: find.rewardPower,
    ...(find.id === 'sealed-cache'
      ? {
          cacheVariant: find.cacheVariant,
          lockTier: find.lockTier,
          trapTier: find.trapTier,
          hazardDamage: find.hazardDamage,
        }
      : {}),
    ...(definition.wave === 'landmark' ? { outcomes: find.outcomes } : {}),
  });
}

const rejected = (reason) => Object.freeze({ ok: false, reason });

export function resolveFindInteraction({
  find,
  resolvedFindIds,
  runStatus,
  hero,
  gold,
  action,
  actor,
}) {
  const definition = findById(find?.id);
  if (
    !definition ||
    !Array.isArray(resolvedFindIds) ||
    !hero ||
    !Number.isInteger(hero.x) ||
    !Number.isInteger(hero.y) ||
    !Number.isFinite(hero.hp) ||
    !Number.isFinite(hero.power) ||
    !Number.isFinite(gold)
  ) return rejected('invalid');
  if (runStatus !== 'playing' || hero.hp <= 0) return rejected('inactive');
  if (resolvedFindIds.includes(find.instanceId)) return rejected('resolved');
  const distance = Math.abs(hero.x - find.x) + Math.abs(hero.y - find.y);
  if (distance > 1) return rejected('distance');
  if (definition.wave === 'landmark') {
    return resolveLandmarkInteraction({
      definition,
      find,
      resolvedFindIds,
      hero,
      gold,
      action,
      actor,
    });
  }
  if (find.id === 'sealed-cache') {
    return resolveChestInteraction({
      find,
      resolvedFindIds,
      runStatus,
      hero,
      gold,
      action: action ?? 'open',
      actor,
    });
  }
  const resolvedAction = action ?? (
    find.id === 'crystal-vein' ? 'extract' : 'defile'
  );
  const allowedActions = {
    'crystal-vein': ['extract'],
    'forgotten-grave': ['defile'],
  };
  if (!allowedActions[find.id].includes(resolvedAction)) return rejected('action');
  if (find.riskDamage > 0 && hero.hp <= find.riskDamage) return rejected('unsafe');

  const damage = Math.max(0, Math.min(find.riskDamage, hero.hp - 1));
  const rewardGold = find.rewardGold;
  return Object.freeze({
    ok: true,
    definition,
    action: resolvedAction,
    damage,
    rewardGold,
    destroyedGold: 0,
    rewardPower: find.rewardPower,
    state: Object.freeze({
      hero: Object.freeze({
        ...hero,
        hp: hero.hp - damage,
        power: hero.power + find.rewardPower,
      }),
      gold: gold + rewardGold,
      resolvedFindIds: Object.freeze([...resolvedFindIds, find.instanceId]),
    }),
  });
}

export function findResultPresentation(result, find, language = 'ru') {
  if (find?.id === 'sealed-cache') return chestResultPresentation(result, language);
  const presentation = findPresentation(find, language);
  if (!presentation) return null;
  if (presentation.wave === 'landmark') {
    return Object.freeze({
      message: result?.ok
        ? presentation.results?.[result.action] ?? presentation.result
        : '',
      unsafe: presentation.unsafe ?? '',
      summary: landmarkResultSummary(result, language),
    });
  }
  return Object.freeze({ message: presentation.result, unsafe: presentation.unsafe ?? '' });
}
