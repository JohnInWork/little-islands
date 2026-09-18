import { FLOORS_PER_CHAPTER } from './dcss-rpg-run.js';
import { isCityDepth } from './dcss-rpg-city.js';

export { FLOORS_PER_CHAPTER };

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const defineDungeonTheme = (definition) => deepFreeze({
  ...definition,
  chestSkinIds: [...definition.chestSkinIds],
  roomArchetypeIds: [...definition.roomArchetypeIds],
});

/**
 * One dungeon theme owns every visual/content family for a chapter. Rendering
 * reads surfaceSetId; room planning reads roomArchetypeIds and chestSkinIds.
 * Future monster, merchant and loot pools can be added here without teaching
 * the renderer about gameplay rules.
 */
export const DUNGEON_THEME_CATALOG = Object.freeze([
  defineDungeonTheme({
    id: 'ashen-vault',
    surfaceSetId: 'ashen-vault',
    atmosphereId: 'slate',
    chestSkinIds: ['wooden', 'pirate'],
    roomArchetypeIds: [
      'fallen-hall',
      'forgotten-crypt',
      'ashen-shrine',
      'drowned-chapel',
      'fungal-hollow',
      'merchant-alcove',
    ],
  }),
  defineDungeonTheme({
    id: 'buried-sanctum',
    surfaceSetId: 'buried-sanctum',
    atmosphereId: 'ochre',
    chestSkinIds: ['pharaoh'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'ashen-shrine', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'frozen-depths',
    surfaceSetId: 'frozen-depths',
    atmosphereId: 'ice',
    chestSkinIds: ['jade-ruby'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'drowned-chapel', 'fungal-hollow', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'infernal-core',
    surfaceSetId: 'infernal-core',
    atmosphereId: 'ember',
    chestSkinIds: ['jade-ruby', 'pirate'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'ashen-shrine', 'merchant-alcove'],
  }),
]);

const defineRoomArchetype = (definition) => deepFreeze({
  implemented: true,
  minDepth: 1,
  maxDepth: Number.MAX_SAFE_INTEGER,
  weight: 0,
  requiresDoor: false,
  dangerMultiplier: 1,
  rewardMultiplier: 1,
  content: {},
  variants: ['default'],
  ...definition,
  environmentThemeIds: { ...definition.environmentThemeIds },
  content: { ...(definition.content ?? {}) },
  variants: [...(definition.variants ?? ['default'])],
});

const COMMON_ENVIRONMENT = Object.freeze({
  'ashen-vault': 'fallen-hall',
  'buried-sanctum': 'fallen-hall',
  'frozen-depths': 'drowned-chapel',
  'infernal-core': 'ashen-shrine',
});

/**
 * An archetype describes why a room exists. It never stores PNG paths. The
 * current dungeon theme resolves its compatible environment and chest family.
 * Service rooms use the same data contract as encounters and discoveries.
 */
export const ROOM_ARCHETYPE_CATALOG = Object.freeze([
  defineRoomArchetype({
    id: 'wayfarer-refuge',
    role: 'start',
    environmentThemeIds: {
      'ashen-vault': 'wayfarer-refuge',
      'buried-sanctum': 'wayfarer-refuge',
      'frozen-depths': 'wayfarer-refuge',
      'infernal-core': 'wayfarer-refuge',
    },
    dangerMultiplier: 0,
    rewardMultiplier: 0,
  }),
  defineRoomArchetype({
    id: 'descent-chamber',
    role: 'exit',
    environmentThemeIds: COMMON_ENVIRONMENT,
    dangerMultiplier: 1.2,
    rewardMultiplier: 0.5,
  }),
  defineRoomArchetype({
    id: 'treasure-vault',
    role: 'treasure',
    requiresDoor: true,
    environmentThemeIds: {
      'ashen-vault': 'fallen-hall',
      'buried-sanctum': 'forgotten-crypt',
      'frozen-depths': 'drowned-chapel',
      'infernal-core': 'ashen-shrine',
    },
    content: { findId: 'sealed-cache' },
    variants: ['unguarded', 'locked', 'ambush', 'trapped', 'cursed', 'mimic'],
    dangerMultiplier: 1.25,
    rewardMultiplier: 1.65,
  }),
  defineRoomArchetype({
    id: 'forgotten-crypt',
    role: 'discovery',
    weight: 4,
    environmentThemeIds: {
      'ashen-vault': 'forgotten-crypt',
      'buried-sanctum': 'forgotten-crypt',
      'frozen-depths': 'forgotten-crypt',
      'infernal-core': 'forgotten-crypt',
    },
    content: { findId: 'forgotten-grave' },
    variants: ['sealed', 'disturbed', 'royal'],
    dangerMultiplier: 1.1,
    rewardMultiplier: 1.2,
  }),
  defineRoomArchetype({
    id: 'crystal-grotto',
    role: 'discovery',
    weight: 3,
    environmentThemeIds: {
      'ashen-vault': 'drowned-chapel',
      'buried-sanctum': 'ashen-shrine',
      'frozen-depths': 'drowned-chapel',
      'infernal-core': 'ashen-shrine',
    },
    content: { findId: 'crystal-vein' },
    variants: ['quiet', 'resonant'],
    dangerMultiplier: 0.8,
    rewardMultiplier: 1.1,
  }),
  defineRoomArchetype({
    id: 'altar-niche',
    role: 'discovery',
    weight: 0,
    environmentThemeIds: {
      'ashen-vault': 'altar-niche',
      'buried-sanctum': 'altar-niche',
      'frozen-depths': 'altar-niche',
      'infernal-core': 'altar-niche',
    },
    content: { findId: 'ancient-altar' },
    variants: ['candlelit', 'silent'],
    dangerMultiplier: 0.9,
    rewardMultiplier: 1.3,
  }),
  defineRoomArchetype({
    id: 'fountain-court',
    role: 'discovery',
    environmentThemeIds: {
      'ashen-vault': 'fountain-court',
      'buried-sanctum': 'fountain-court',
      'frozen-depths': 'fountain-court',
      'infernal-core': 'fountain-court',
    },
    content: { findId: 'sunken-fountain' },
    variants: ['still', 'overflowing'],
    dangerMultiplier: 0.9,
    rewardMultiplier: 1.25,
  }),
  defineRoomArchetype({
    id: 'rune-vault',
    role: 'discovery',
    environmentThemeIds: {
      'ashen-vault': 'rune-vault',
      'buried-sanctum': 'rune-vault',
      'frozen-depths': 'rune-vault',
      'infernal-core': 'rune-vault',
    },
    content: { findId: 'warded-rune' },
    variants: ['sealed', 'cracked'],
    dangerMultiplier: 1,
    rewardMultiplier: 1.3,
  }),
  defineRoomArchetype({
    id: 'ambush-chamber',
    role: 'encounter',
    environmentThemeIds: COMMON_ENVIRONMENT,
    content: { surpriseType: 'horde' },
    variants: ['horde', 'mixed'],
    dangerMultiplier: 1.5,
    rewardMultiplier: 1.1,
  }),
  defineRoomArchetype({
    id: 'fallen-hall',
    role: 'ambient',
    weight: 5,
    environmentThemeIds: {
      'ashen-vault': 'fallen-hall',
      'buried-sanctum': 'fallen-hall',
      'frozen-depths': 'fallen-hall',
      'infernal-core': 'fallen-hall',
    },
    variants: ['pillars', 'ruins', 'empty'],
  }),
  defineRoomArchetype({
    id: 'ashen-shrine',
    role: 'ambient',
    weight: 3,
    environmentThemeIds: {
      'ashen-vault': 'ashen-shrine',
      'buried-sanctum': 'ashen-shrine',
      'frozen-depths': 'drowned-chapel',
      'infernal-core': 'ashen-shrine',
    },
    variants: ['altar', 'braziers', 'broken-idol'],
  }),
  defineRoomArchetype({
    id: 'drowned-chapel',
    role: 'ambient',
    minDepth: 2,
    weight: 2,
    environmentThemeIds: {
      'ashen-vault': 'drowned-chapel',
      'buried-sanctum': 'forgotten-crypt',
      'frozen-depths': 'drowned-chapel',
      'infernal-core': 'ashen-shrine',
    },
    variants: ['fountain', 'flooded', 'silent'],
  }),
  defineRoomArchetype({
    id: 'fungal-hollow',
    role: 'ambient',
    weight: 3,
    environmentThemeIds: {
      'ashen-vault': 'fungal-hollow',
      'buried-sanctum': 'forgotten-crypt',
      'frozen-depths': 'fungal-hollow',
      'infernal-core': 'ashen-shrine',
    },
    variants: ['spores', 'overgrown', 'deathcaps'],
  }),
  defineRoomArchetype({
    id: 'merchant-alcove',
    role: 'service',
    implemented: true,
    minDepth: 2,
    weight: 0,
    requiresDoor: false,
    environmentThemeIds: COMMON_ENVIRONMENT,
    content: { actorId: 'merchant', interactionId: 'trade' },
    variants: ['armourer', 'relic-dealer', 'provisioner'],
    dangerMultiplier: 0,
    rewardMultiplier: 0,
  }),
]);

/**
 * The city is not a chapter, so its theme stays out of the rotation and is
 * reached only through the depth it belongs to. Its room archetypes are empty:
 * a city plans its own blocks and never asks the dungeon planner for rooms.
 */
export const CITY_DUNGEON_THEME = defineDungeonTheme({
  id: 'gate-town',
  surfaceSetId: 'gate-town',
  atmosphereId: 'town',
  chestSkinIds: ['wooden'],
  roomArchetypeIds: [],
});

const DUNGEON_THEMES_BY_ID = new Map(
  [...DUNGEON_THEME_CATALOG, CITY_DUNGEON_THEME].map((theme) => [theme.id, theme]),
);
const ROOM_ARCHETYPES_BY_ID = new Map(
  ROOM_ARCHETYPE_CATALOG.map((archetype) => [archetype.id, archetype]),
);
// A find declares its room through `content.findId`; the planner never checks
// find IDs by hand, so a new landmark only needs its archetype entry.
const ARCHETYPE_ID_BY_FIND_ID = new Map(
  ROOM_ARCHETYPE_CATALOG
    .filter((archetype) => archetype.implemented && typeof archetype.content.findId === 'string')
    .map((archetype) => [archetype.content.findId, archetype.id]),
);
// Rooms the merchant may reclaim when a floor has no free alcove, in order of
// preference. The altar yields before the older discoveries.
const MERCHANT_FALLBACK_ARCHETYPE_IDS = Object.freeze([
  'altar-niche',
  'fountain-court',
  'rune-vault',
  'forgotten-crypt',
  'crystal-grotto',
]);

export function roomArchetypeIdForFind(findId) {
  return ARCHETYPE_ID_BY_FIND_ID.get(findId) ?? null;
}

export function dungeonThemeById(id) {
  return DUNGEON_THEMES_BY_ID.get(id) ?? null;
}

export function roomArchetypeById(id) {
  return ROOM_ARCHETYPES_BY_ID.get(id) ?? null;
}

export function dungeonThemeForDepth(depth) {
  if (!Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Dungeon theme depth must be a positive integer');
  }
  if (isCityDepth(depth)) return CITY_DUNGEON_THEME;
  const chapterIndex = Math.floor((depth - 1) / FLOORS_PER_CHAPTER);
  return DUNGEON_THEME_CATALOG[chapterIndex % DUNGEON_THEME_CATALOG.length];
}

function stableHash(seed, depth, roomIndex, salt = 0) {
  let value = (seed ^ Math.imul(depth + 1, 0x9e3779b1)) >>> 0;
  value ^= Math.imul(roomIndex + 1, 0x85ebca6b);
  value ^= salt >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

function roomContains(room, point) {
  return Boolean(
    point
    && point.x >= room.x
    && point.x < room.x + room.width
    && point.y >= room.y
    && point.y < room.y + room.height
  );
}

function roomIndexForPoint(rooms, point) {
  return rooms.findIndex((room) => roomContains(room, point));
}

function weightedArchetype(theme, depth, seed, roomIndex) {
  const eligible = theme.roomArchetypeIds
    .map(roomArchetypeById)
    .filter((archetype) =>
      archetype?.implemented
      && archetype.weight > 0
      && depth >= archetype.minDepth
      && depth <= archetype.maxDepth,
    );
  if (eligible.length === 0) throw new Error(`Dungeon theme ${theme.id} has no room archetypes`);
  const total = eligible.reduce((sum, archetype) => sum + archetype.weight, 0);
  let roll = (stableHash(seed, depth, roomIndex, 0x41524348) / 0x100000000) * total;
  for (const archetype of eligible) {
    roll -= archetype.weight;
    if (roll < 0) return archetype;
  }
  return eligible.at(-1);
}

function semanticArchetypes(level) {
  const assigned = new Map([[0, 'wayfarer-refuge']]);
  const exitRoomIndex = roomIndexForPoint(level.rooms, level.exit);
  if (exitRoomIndex > 0) assigned.set(exitRoomIndex, 'descent-chamber');

  for (const find of level.finds ?? []) {
    if (!Number.isInteger(find.roomIndex) || assigned.has(find.roomIndex)) continue;
    const archetypeId = roomArchetypeIdForFind(find.id);
    if (archetypeId) assigned.set(find.roomIndex, archetypeId);
  }

  for (const surprise of level.surprises ?? []) {
    if (!Number.isInteger(surprise.roomIndex) || assigned.has(surprise.roomIndex)) continue;
    assigned.set(
      surprise.roomIndex,
      ['treasure', 'mixed'].includes(surprise.type) ? 'treasure-vault' : 'ambush-chamber',
    );
  }

  // One service stop per chapter. It prefers a real door room and then the
  // calmest free alcove, so a rare map topology never loses its merchant.
  if (level.depth % FLOORS_PER_CHAPTER === 0) {
    const fallbackRank = (roomIndex) => (
      assigned.has(roomIndex)
        ? 1 + MERCHANT_FALLBACK_ARCHETYPE_IDS.indexOf(assigned.get(roomIndex))
        : 0
    );
    const candidates = level.rooms
      .map((_room, roomIndex) => roomIndex)
      .filter((roomIndex) => (
        roomIndex > 0
        && !roomHasWater(level, roomIndex)
        && (
          !assigned.has(roomIndex)
          || MERCHANT_FALLBACK_ARCHETYPE_IDS.includes(assigned.get(roomIndex))
        )
      ))
      .sort((a, b) => (
        fallbackRank(a) - fallbackRank(b)
        ||
        Number(!(level.doors ?? []).some((door) => door.roomIndex === a))
          - Number(!(level.doors ?? []).some((door) => door.roomIndex === b))
        ||
        stableHash(level.seed, level.depth, a, 0x4d455243)
          - stableHash(level.seed, level.depth, b, 0x4d455243)
      ));
    if (candidates.length > 0) assigned.set(candidates[0], 'merchant-alcove');
  }
  return assigned;
}

/** A merchant never sets up shop in a flooded room. */
function roomHasWater(level, roomIndex) {
  const room = level.rooms?.[roomIndex];
  if (!room || !Array.isArray(level.grid)) return false;
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      if (level.grid[y]?.[x] === '~') return true;
    }
  }
  return false;
}

function roundedBudget(value) {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function semanticVariant(level, roomIndex, archetype) {
  const chest = (level.finds ?? []).find(
    (find) => find.roomIndex === roomIndex && find.id === 'sealed-cache',
  );
  if (chest && archetype.id === 'treasure-vault') {
    return chest.cacheVariant === 'unlocked' ? 'unguarded' : chest.cacheVariant;
  }
  const surprise = (level.surprises ?? []).find((entry) => entry.roomIndex === roomIndex);
  if (surprise && archetype.id === 'treasure-vault') {
    return surprise.type === 'mixed' ? 'ambush' : 'unguarded';
  }
  if (surprise && archetype.id === 'ambush-chamber') return surprise.type;
  return null;
}

export function createDungeonRoomPlans(level) {
  if (
    !level
    || !Number.isInteger(level.seed)
    || !Number.isInteger(level.depth)
    || level.depth < 1
    || !Array.isArray(level.rooms)
    || level.rooms.length === 0
    || !level.spawn
    || !level.exit
  ) throw new TypeError('Room plans require a generated dungeon');

  const theme = dungeonThemeForDepth(level.depth);
  const semantic = semanticArchetypes(level);
  const plans = level.rooms.map((room, roomIndex) => {
    const archetype = semantic.has(roomIndex)
      ? roomArchetypeById(semantic.get(roomIndex))
      : weightedArchetype(theme, level.depth, level.seed, roomIndex);
    if (!archetype?.implemented) throw new Error(`Room archetype is not playable: ${archetype?.id}`);
    const environmentThemeId = archetype.environmentThemeIds[theme.id]
      ?? archetype.environmentThemeIds['ashen-vault'];
    if (!environmentThemeId) throw new Error(`Room archetype ${archetype.id} has no ${theme.id} visuals`);
    const variantId = semanticVariant(level, roomIndex, archetype)
      ?? archetype.variants[
        stableHash(level.seed, level.depth, roomIndex, 0x56415249) % archetype.variants.length
      ];
    const hasChest = (level.finds ?? []).some(
      (find) => find.roomIndex === roomIndex && find.id === 'sealed-cache',
    );
    const chestSkinId = hasChest || archetype.id === 'treasure-vault'
      ? theme.chestSkinIds[
          stableHash(level.seed, level.depth, roomIndex, 0x43484553) % theme.chestSkinIds.length
        ]
      : null;
    return deepFreeze({
      id: `room-${level.depth}-${roomIndex}`,
      roomIndex,
      dungeonThemeId: theme.id,
      surfaceSetId: theme.surfaceSetId,
      archetypeId: archetype.id,
      variantId,
      environmentThemeId,
      chestSkinId,
      dangerBudget: roundedBudget(
        (level.scaling?.dangerRating ?? level.depth) * archetype.dangerMultiplier,
      ),
      rewardBudget: roundedBudget(
        (level.scaling?.rewards?.qualityBudget ?? level.depth * 2) * archetype.rewardMultiplier,
      ),
    });
  });
  return Object.freeze(plans);
}

export function roomPlanForIndex(level, roomIndex) {
  return level?.roomPlans?.find((plan) => plan.roomIndex === roomIndex) ?? null;
}
