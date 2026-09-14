import {
  chestResultPresentation,
  createChestProfile,
  resolveChestInteraction,
} from './dcss-rpg-chests.js';

const freezeCopy = (value) => Object.freeze({ ...value });

const defineFind = (definition) =>
  Object.freeze({
    ...definition,
    copy: Object.freeze({
      ru: freezeCopy(definition.copy.ru),
      en: freezeCopy(definition.copy.en),
    }),
  });

export const FIND_CATALOG = Object.freeze([
  defineFind({
    id: 'sealed-cache',
    category: 'useful',
    path: 'item/misc/misc_box.png',
    size: 64,
    screenOffsetY: -7,
    color: '#d9bd67',
    glyph: '+',
    copy: {
      ru: {
        name: 'Древний сундук',
        action: 'Разобраться с древним сундуком',
        result: 'Содержимое сундука получено',
      },
      en: {
        name: 'Ancient chest',
        action: 'Deal with the ancient chest',
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
        action: 'Извлечь силу кристалла',
        result: 'Сила героя выросла',
      },
      en: {
        name: 'Living crystal vein',
        action: 'Draw power from the crystal',
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
        name: 'Проклятая гробница',
        action: 'Осквернить гробницу: опасность и награда',
        unsafe: 'Слишком опасно при таком здоровье',
        result: 'Проклятие ранило героя, но тайник найден',
      },
      en: {
        name: 'Cursed tomb',
        action: 'Defile the tomb: danger and reward',
        unsafe: 'Too dangerous at this health',
        result: 'The curse wounded the hero, but the cache was found',
      },
    },
  }),
]);

const FINDS_BY_ID = new Map(FIND_CATALOG.map((definition) => [definition.id, definition]));

export function findById(id) {
  return FINDS_BY_ID.get(id) ?? null;
}

export const FIND_ASSET_PATHS = Object.freeze([
  ...new Set(FIND_CATALOG.map(({ path }) => path)),
]);

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
    return { rewardShards: 2 + depth + rng.int(0, 2), rewardPower: 1, riskDamage: 0 };
  }
  if (definition.id === 'forgotten-grave') {
    return {
      rewardShards: 8 + depth * 3 + rng.int(0, 4),
      rewardPower: 0,
      riskDamage: 8 + depth * 4 + rng.int(0, 3),
    };
  }
  return { rewardShards: 5 + depth * 2 + rng.int(0, 4), rewardPower: 0, riskDamage: 0 };
}

export function createDungeonFinds({ level, rng, occupiedCells = [], avoidCells = [] }) {
  if (
    !level ||
    !Number.isInteger(level.depth) ||
    !Array.isArray(level.grid) ||
    !Array.isArray(level.rooms) ||
    !rng ||
    typeof rng.next !== 'function' ||
    typeof rng.int !== 'function'
  ) {
    throw new TypeError('Dungeon finds require a generated level and seeded RNG');
  }
  const occupied = new Set(occupiedCells);
  const avoided = new Set(avoidCells);
  const surpriseRooms = new Set(
    (level.surprises ?? [])
      .map(({ roomIndex }) => roomIndex)
      .filter(Number.isInteger),
  );
  const roomEntries = shuffle(
    rng,
    level.rooms
      .map((room, roomIndex) => ({ room, roomIndex }))
      .filter(
        ({ room, roomIndex }) =>
          roomIndex > 0 &&
          !surpriseRooms.has(roomIndex) &&
          !roomContains(room, level.exit),
      ),
  );
  const blueprints = shuffle(rng, [...FIND_CATALOG]);
  const targetCount = Math.min(3, roomEntries.length);
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
            rewardShards: outcome.rewardShards,
          })
        : {}),
    });
  }
  return finds;
}

export function findPresentation(find, language = 'ru') {
  const definition = findById(find?.id);
  if (!definition) return null;
  const locale = language === 'en' ? 'en' : 'ru';
  return Object.freeze({
    ...definition.copy[locale],
    id: definition.id,
    path: definition.path,
    color: definition.color,
    glyph: definition.glyph,
    riskDamage: find.riskDamage,
    rewardShards: find.rewardShards,
    rewardPower: find.rewardPower,
    ...(find.id === 'sealed-cache'
      ? {
          cacheVariant: find.cacheVariant,
          lockTier: find.lockTier,
          trapTier: find.trapTier,
          hazardDamage: find.hazardDamage,
        }
      : {}),
  });
}

const rejected = (reason) => Object.freeze({ ok: false, reason });

export function resolveFindInteraction({
  find,
  resolvedFindIds,
  runStatus,
  hero,
  shards,
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
    !Number.isFinite(shards)
  ) return rejected('invalid');
  if (runStatus !== 'playing' || hero.hp <= 0) return rejected('inactive');
  if (resolvedFindIds.includes(find.instanceId)) return rejected('resolved');
  const distance = Math.abs(hero.x - find.x) + Math.abs(hero.y - find.y);
  if (distance > 1) return rejected('distance');
  if (find.id === 'sealed-cache') {
    return resolveChestInteraction({
      find,
      resolvedFindIds,
      runStatus,
      hero,
      shards,
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
  const rewardShards = find.rewardShards;
  return Object.freeze({
    ok: true,
    definition,
    action: resolvedAction,
    damage,
    rewardShards,
    destroyedShards: 0,
    rewardPower: find.rewardPower,
    state: Object.freeze({
      hero: Object.freeze({
        ...hero,
        hp: hero.hp - damage,
        power: hero.power + find.rewardPower,
      }),
      shards: shards + rewardShards,
      resolvedFindIds: Object.freeze([...resolvedFindIds, find.instanceId]),
    }),
  });
}

export function findResultPresentation(result, find, language = 'ru') {
  if (find?.id === 'sealed-cache') return chestResultPresentation(result, language);
  const presentation = findPresentation(find, language);
  return presentation ? Object.freeze({ message: presentation.result, unsafe: presentation.unsafe ?? '' }) : null;
}
