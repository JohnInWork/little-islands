import {
  EVENT_CATALOG,
  DEFAULT_RUN_BRANCH,
  LOOT_CATALOG,
  monsterSuitsBranch,
  validateRunBranch,
  MONSTER_CATALOG,
  eventById,
  lootById,
  monsterById,
} from './dcss-rpg-content.js';
import {
  EQUIPMENT_SLOTS,
  allowedSlotsForItem,
  deriveHeroStats,
  isTwoHandedItem,
} from './dcss-rpg-rules.js';
import { cloneSkillState, createSkillState, validateSkillState } from './dcss-rpg-skills.js';
import {
  trapsFromDungeon,
  validateDetectedTrapIds,
  validateDisarmedTrapIds,
} from './dcss-rpg-traps.js';
import { createActorEffects, validateActorEffects } from './dcss-rpg-effects.js';
import { validateMealState } from './dcss-rpg-cooking.js';
import {
  PASSIVE_CREATURE_CATALOG,
  passiveCreatureById,
} from './dcss-rpg-passive.js';
import {
  FINAL_BOSS_ID,
  FINAL_DEPTH,
  chapterGuardianForDepth,
} from './dcss-rpg-run.js';
import {
  DEFAULT_DIFFICULTY,
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  SCALING_VERSION,
  floorScaling,
  lootEligibleForFloor,
  monsterEligibleForFloor,
  monsterTier,
  scalingVersionSupported,
} from './dcss-rpg-scaling.js';
import {
  DEFAULT_LOOT_ABUNDANCE,
  createBalancedLootPicks,
  validateLootAbundance,
} from './dcss-rpg-loot-economy.js';
import {
  materializeItemAffixes,
  rollItemAffixes,
  validateItemAffixIds,
} from './dcss-rpg-affixes.js';
import {
  guaranteedArtifactDepth,
  materializeProceduralArtifact,
  validateProceduralArtifactState,
} from './dcss-rpg-artifacts.js';
import { MAX_FINDS_PER_FLOOR, createDungeonFinds } from './dcss-rpg-finds.js';
import {
  CITY_DUNGEON_THEME,
  createDungeonRoomPlans,
  dungeonThemeFor,
} from './dcss-rpg-room-plans.js';
import { materializeDungeonRoomContent } from './dcss-rpg-room-content.js';
import { lootBiomeWeight, monsterBiomeWeight } from './dcss-rpg-biome-content.js';
import { conditionEffects, conditionedFloor, runConditions } from './dcss-rpg-conditions.js';
import {
  MERCHANT_ACTOR_PATH,
  MERCHANT_ICON_PATH,
  createMerchantStates,
  createMerchantStock,
  validateMerchantPurchaseIds,
  validateMerchantStateShape,
  validateMerchantStates,
} from './dcss-rpg-merchant.js';
import { CITY_DEPTH, buildCityFloor, generateCityPlan, isCityDepth } from './dcss-rpg-city.js';
import { generateSurfacePlan } from './dcss-rpg-surface-plan.js';
import { createHouseState, validateHouseState } from './dcss-rpg-house.js';
import { createCrimeState, validateCrimeState } from './dcss-rpg-crime.js';
import { createCompanionParty, validateCompanionParty } from './dcss-rpg-companions.js';
import { validateReforgeState } from './dcss-rpg-smithing.js';
import { rollMaterial, validateItemMaterial } from './dcss-rpg-materials.js';
import { createCoatingState, validateCoatingState } from './dcss-rpg-poisoncraft.js';
import { validatePlacedTraps } from './dcss-rpg-player-traps.js';
import { HUNGER_MAX, validateHunger } from './dcss-rpg-hunger.js';
import {
  createItemKnowledge,
  identifiableItemIds,
  validateItemKnowledge,
} from './dcss-rpg-identification.js';
import {
  createBookStudy,
  guaranteedSpellBookPlacement,
  validateBookStudy,
} from './dcss-rpg-books.js';
import { LEGACY_BUILD_PRESET_ID, createStartingMagic } from './dcss-rpg-build-presets.js';
import { createSpellState, validateSpellState } from './dcss-rpg-spells.js';
import {
  createChestContainerStates,
  validateChestContainerStates,
} from './dcss-rpg-chest-containers.js';
import { WATER_ROOM_CHANCE, chooseFloodedRoom, floodRoom } from './dcss-rpg-terrain.js';
import { createCampStash, validateCampRunState } from './dcss-rpg-camp.js';
import { validateCampState } from './dcss-rpg-camp.js';
import { FLOORS_PER_CHAPTER } from './dcss-rpg-run.js';

export const SAVE_VERSION = 48;
export const SAVE_KEY = 'dng-codex:rpg:v48';
export const LEGACY_SAVE_KEY = 'little-islands:dcss-rpg:v1';
export const LEGACY_SAVE_KEYS = Object.freeze([
  'dng-codex:rpg:v47',
  'dng-codex:rpg:v46',
  'dng-codex:rpg:v45',
  'dng-codex:rpg:v44',
  'dng-codex:rpg:v43',
  'dng-codex:rpg:v42',
  'dng-codex:rpg:v41',
  'dng-codex:rpg:v40',
  'dng-codex:rpg:v39',
  'dng-codex:rpg:v38',
  'dng-codex:rpg:v37',
  'dng-codex:rpg:v36',
  'dng-codex:rpg:v35',
  'dng-codex:rpg:v34',
  'dng-codex:rpg:v33',
  'dng-codex:rpg:v32',
  'dng-codex:rpg:v31',
  'dng-codex:rpg:v30',
  'dng-codex:rpg:v29',
  'dng-codex:rpg:v28',
  'dng-codex:rpg:v27',
  'dng-codex:rpg:v26',
  'dng-codex:rpg:v25',
  'dng-codex:rpg:v24',
  'dng-codex:rpg:v23',
  'dng-codex:rpg:v22',
  'little-islands:dcss-rpg:v21',
  'little-islands:dcss-rpg:v20',
  'little-islands:dcss-rpg:v19',
  'little-islands:dcss-rpg:v18',
  'little-islands:dcss-rpg:v17',
  'little-islands:dcss-rpg:v16',
  'little-islands:dcss-rpg:v15',
  'little-islands:dcss-rpg:v14',
  'little-islands:dcss-rpg:v13',
  'little-islands:dcss-rpg:v12',
  'little-islands:dcss-rpg:v11',
  'little-islands:dcss-rpg:v10',
  'little-islands:dcss-rpg:v9',
  'little-islands:dcss-rpg:v8',
  'little-islands:dcss-rpg:v7',
  'little-islands:dcss-rpg:v6',
  'little-islands:dcss-rpg:v5',
  'little-islands:dcss-rpg:v4',
  'little-islands:dcss-rpg:v3',
  'little-islands:dcss-rpg:v2',
  LEGACY_SAVE_KEY,
]);
export const GENERATOR_VERSION = 15;
export const CONTENT_VERSION = 19;
export const MAP_WIDTH = 36;
export const MAP_HEIGHT = 26;

const IDENTIFIABLE_ITEM_IDS = identifiableItemIds(LOOT_CATALOG, null);

const DIRECTIONS = Object.freeze([
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]);

/**
 * What the ghost is standing over.
 *
 * The dead run's own kit is deliberately NOT the prize. Handing back gear the
 * hero may still be wearing duplicates it, and a dungeon that keeps returning
 * the same sword stops feeling generated. So the bones hold one ordinary drop
 * of this depth — rolled from the pool the floor itself rolls from, but with a
 * whole floor's quality spent on a single piece. That is what makes it worth
 * waking the thing that guards it.
 */
export function rollBonesReward({ seed, depth, key = '', scaling } = {}) {
  if (!Number.isInteger(depth) || depth < 1) return null;
  const floor = scaling ?? floorScaling(depth);
  const pool = LOOT_CATALOG.filter((item) => lootEligibleForFloor(item, floor));
  const equipment = pool.filter((item) => item.slot);
  if (equipment.length === 0) return null;
  const instanceId = `bones-${depth}`;
  const rng = createRng(mixSeed(mixSeed(seed, depth), `BONES:${key}`));
  const [picked] = createBalancedLootPicks({
    rng,
    pool: equipment,
    starterPool: equipment,
    count: 1,
    qualityBudget: Math.max(1, floor.rewards.qualityBudget),
  }).picks;
  if (!picked) return null;
  const materialId = rollMaterial({ seed, depth, instanceId: `${instanceId}:${key}`, item: picked });
  return Object.freeze({
    instanceId,
    id: picked.id,
    affixIds: Object.freeze([...rollItemAffixes({
      seed: mixSeed(seed, `BONES:${key}`),
      depth,
      instanceId,
      item: picked,
    })]),
    ...(materialId ? { materialId } : {}),
    artifactPowerId: null,
    artifactCurseId: null,
  });
}

export function mixSeed(seed, salt) {
  let value = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

export function createRng(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    pick(values) {
      return values[Math.floor(this.next() * values.length)];
    },
  };
}

export function weightedPick(rng, entries, weightOf = (entry) => entry.weight) {
  if (entries.length === 0) throw new Error('Cannot pick from an empty weighted table');
  const total = entries.reduce((sum, entry) => sum + Math.max(0, weightOf(entry)), 0);
  if (total <= 0) throw new Error('Weighted table must contain a positive weight');
  let roll = rng.next() * total;
  for (const entry of entries) {
    roll -= Math.max(0, weightOf(entry));
    if (roll < 0) return entry;
  }
  return entries.at(-1);
}

function shuffle(rng, values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = rng.int(0, index);
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

function roomOverlaps(room, other, padding = 1) {
  return !(
    room.x + room.width + padding <= other.x ||
    other.x + other.width + padding <= room.x ||
    room.y + room.height + padding <= other.y ||
    other.y + other.height + padding <= room.y
  );
}

function roomCenter(room) {
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  };
}

function carveRoom(grid, room) {
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) grid[y][x] = '.';
  }
}

function carveCorridor(grid, from, to, horizontalFirst) {
  const carveHorizontal = () => {
    for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x += 1) grid[from.y][x] = '.';
  };
  const carveVertical = () => {
    for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y += 1) grid[y][to.x] = '.';
  };
  if (horizontalFirst) {
    carveHorizontal();
    carveVertical();
    return;
  }
  for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y += 1) grid[y][from.x] = '.';
  for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x += 1) grid[to.y][x] = '.';
}

export function isWalkableCell(grid, x, y, { allowDoors = false } = {}) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return false;
  return grid[y][x] === '.' || grid[y][x] === '~' || (allowDoors && grid[y][x] === 'D');
}

export function hasLineOfSight(grid, start, end) {
  if (!grid.length || !grid[0]?.length) return false;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 4;
  if (steps === 0) return true;
  let previousX = start.x;
  let previousY = start.y;
  for (let step = 1; step <= steps; step += 1) {
    const x = Math.floor(start.x + 0.5 + (dx * step) / steps);
    const y = Math.floor(start.y + 0.5 + (dy * step) / steps);
    if (x < 0 || y < 0 || y >= grid.length || x >= grid[0].length) return false;
    if (x === previousX && y === previousY) continue;
    if (
      x !== previousX &&
      y !== previousY &&
      !isWalkableCell(grid, previousX, y) &&
      !isWalkableCell(grid, x, previousY)
    ) {
      return false;
    }
    const isTarget = x === end.x && y === end.y;
    if (!isTarget && !isWalkableCell(grid, x, y)) return false;
    previousX = x;
    previousY = y;
  }
  return true;
}

export function findGridPath(grid, start, end, { allowDoors = false } = {}) {
  if (
    !isWalkableCell(grid, start.x, start.y, { allowDoors }) ||
    !isWalkableCell(grid, end.x, end.y, { allowDoors })
  ) return [];
  const width = grid[0].length;
  const key = (x, y) => y * width + x;
  const startKey = key(start.x, start.y);
  const endKey = key(end.x, end.y);
  const queue = [start];
  const previous = new Map([[startKey, -1]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const cell = queue[cursor];
    if (key(cell.x, cell.y) === endKey) break;
    for (const [dx, dy] of DIRECTIONS) {
      const x = cell.x + dx;
      const y = cell.y + dy;
      const cellKey = key(x, y);
      if (!isWalkableCell(grid, x, y, { allowDoors }) || previous.has(cellKey)) continue;
      previous.set(cellKey, key(cell.x, cell.y));
      queue.push({ x, y });
    }
  }
  if (!previous.has(endKey)) return [];
  const path = [];
  let cursor = endKey;
  while (cursor !== startKey) {
    path.push({ x: cursor % width, y: Math.floor(cursor / width) });
    cursor = previous.get(cursor);
  }
  return path.reverse();
}

function roomDoorwayCells(grid, room, roomIndex) {
  const right = room.x + room.width - 1;
  const bottom = room.y + room.height - 1;
  const candidates = new Map();
  const add = (x, y, axis, outsideX, outsideY) => {
    if (grid[outsideY]?.[outsideX] !== '.') return;
    const corridorIsNarrow = axis === 'x'
      ? grid[outsideY - 1]?.[outsideX] === '#' &&
        grid[outsideY + 1]?.[outsideX] === '#' &&
        grid[outsideY]?.[outsideX - 1] === '.' &&
        grid[outsideY]?.[outsideX + 1] === '.'
      : grid[outsideY]?.[outsideX - 1] === '#' &&
        grid[outsideY]?.[outsideX + 1] === '#' &&
        grid[outsideY - 1]?.[outsideX] === '.' &&
        grid[outsideY + 1]?.[outsideX] === '.';
    if (!corridorIsNarrow) return;
    candidates.set(`${outsideX},${outsideY}`, {
      x: outsideX,
      y: outsideY,
      axis,
      roomIndex,
    });
  };
  for (let y = room.y; y <= bottom; y += 1) {
    for (let x = room.x; x <= right; x += 1) {
      if (grid[y]?.[x] !== '.') continue;
      if (x === room.x) add(x, y, 'x', x - 1, y);
      if (x === right) add(x, y, 'x', x + 1, y);
      if (y === room.y) add(x, y, 'y', x, y - 1);
      if (y === bottom) add(x, y, 'y', x, y + 1);
    }
  }
  return [...candidates.values()];
}

function roomContains(room, point) {
  return Boolean(
    point &&
    point.x >= room.x &&
    point.x < room.x + room.width &&
    point.y >= room.y &&
    point.y < room.y + room.height
  );
}

function planDungeonDoors({
  grid, rooms, spawn, exit, sanctuary, objective, depth, floorSeed, doorsRequired = true,
}) {
  const rng = createRng(mixSeed(floorSeed, 0xd00d));
  const reserved = new Set(
    [spawn, exit, sanctuary, objective?.boss, objective?.artifact]
      .filter(Boolean)
      .map(({ x, y }) => `${x},${y}`),
  );
  const candidatesByRoom = rooms.map((room, roomIndex) =>
    roomDoorwayCells(grid, room, roomIndex).filter(({ x, y }) => {
      const distance = Math.abs(x - spawn.x) + Math.abs(y - spawn.y);
      return distance >= 4 && !reserved.has(`${x},${y}`);
    }),
  );
  const eligibleSurpriseRooms = rooms
    .map((room, roomIndex) => ({ room, roomIndex, doors: candidatesByRoom[roomIndex] }))
    .filter(({ room, roomIndex, doors }) =>
      roomIndex > 0 &&
      doors.length > 0 &&
      !roomContains(room, exit) &&
      !roomContains(room, objective?.boss),
    );
  const surpriseChoices = eligibleSurpriseRooms.filter(({ doors }) => doors.length === 1);
  const fallbackChoices = [...eligibleSurpriseRooms].sort(
    (a, b) => a.doors.length - b.doors.length,
  );
  const surpriseRoom = rng.pick(surpriseChoices.length > 0 ? surpriseChoices : fallbackChoices);
  const surpriseType = weightedPick(rng, [
    { id: 'horde', weight: 4 },
    { id: 'treasure', weight: 3 },
    { id: 'mixed', weight: 2 },
  ]).id;
  const targetDoorCount = Math.min(7, 4 + Math.floor(depth / 2));
  const selected = [...(surpriseRoom?.doors ?? [])];
  const selectedKeys = new Set(selected.map(({ x, y }) => `${x},${y}`));
  const allCandidates = shuffle(rng, candidatesByRoom.flat());
  const canAdd = (candidate, spacing) =>
    !selectedKeys.has(`${candidate.x},${candidate.y}`) &&
    selected.every(
      (door) => Math.abs(door.x - candidate.x) + Math.abs(door.y - candidate.y) >= spacing,
    );
  for (const spacing of [3, 1]) {
    for (const candidate of allCandidates) {
      if (selected.length >= targetDoorCount) break;
      if (!canAdd(candidate, spacing)) continue;
      selected.push(candidate);
      selectedKeys.add(`${candidate.x},${candidate.y}`);
    }
  }
  // A dungeon without a doorway is a broken dungeon. Open country without one
  // is just a field: nothing out there is obliged to have a door in it.
  if (selected.length === 0 && doorsRequired) {
    throw new Error('Dungeon generator could not place doors');
  }

  const surpriseId = `surprise-${depth}-0`;
  const surpriseDoor = surpriseRoom ? rng.pick(surpriseRoom.doors) : null;
  const surpriseDoorKey = surpriseDoor ? `${surpriseDoor.x},${surpriseDoor.y}` : null;
  const doors = selected.map((door, index) => ({
    instanceId: `door-${depth}-${index}`,
    ...door,
    surpriseId: `${door.x},${door.y}` === surpriseDoorKey ? surpriseId : null,
  }));
  for (const door of doors) grid[door.y][door.x] = 'D';
  return {
    doors,
    surprise: surpriseRoom
      ? {
          id: surpriseId,
          type: surpriseType,
          roomIndex: surpriseRoom.roomIndex,
          monsterIds: [],
          lootIds: [],
        }
      : null,
  };
}

function pickRoomSpawnCells(rng, grid, room, count, occupied) {
  const interior = [];
  const edge = [];
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      const cellKey = `${x},${y}`;
      if (!isWalkableCell(grid, x, y) || occupied.has(cellKey)) continue;
      const collection =
        x > room.x &&
        x < room.x + room.width - 1 &&
        y > room.y &&
        y < room.y + room.height - 1
          ? interior
          : edge;
      collection.push({ x, y });
    }
  }
  shuffle(rng, interior);
  shuffle(rng, edge);
  const picked = [...interior, ...edge].slice(0, count);
  for (const cell of picked) occupied.add(`${cell.x},${cell.y}`);
  return picked;
}

export function revealAround(revealed, grid, center, radius = 4) {
  let changed = false;
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) continue;
      if (Math.hypot(x - center.x, y - center.y) > radius + 0.35) continue;
      if (!hasLineOfSight(grid, center, { x, y })) continue;
      const key = `${x},${y}`;
      if (revealed.has(key)) continue;
      revealed.add(key);
      changed = true;
    }
  }
  return changed;
}

function pickSpawnCells(rng, grid, spawn, count, occupied) {
  const cells = [];
  for (let y = 1; y < grid.length - 1; y += 1) {
    for (let x = 1; x < grid[0].length - 1; x += 1) {
      const cellKey = `${x},${y}`;
      if (!isWalkableCell(grid, x, y) || occupied.has(cellKey)) continue;
      if (Math.abs(x - spawn.x) + Math.abs(y - spawn.y) < 7) continue;
      cells.push({ x, y });
    }
  }
  shuffle(rng, cells);
  const picked = cells.slice(0, Math.min(count, cells.length));
  for (const cell of picked) occupied.add(`${cell.x},${cell.y}`);
  return picked;
}

/**
 * A city floor: streets and blocks instead of rooms and corridors, traders
 * instead of loot, the watch instead of monsters. Its own seed stream means
 * the city can grow new features without moving anything in the dungeon.
 */
function generateCityDungeon({ floorSeed, conditionIds, branch, depth, width, height, scaling }) {
  const rng = createRng(mixSeed(floorSeed, 0x43495459));
  const plan = generateCityPlan({ rng: () => rng.next(), width, height });
  const city = buildCityFloor({ plan, depth, seed: floorSeed, width, height, scaling, rng });
  const merchants = city.merchants.map(({ roomIndex, variantId, x, y }) => Object.freeze({
    instanceId: `merchant-${depth}-${roomIndex}`,
    id: 'merchant',
    roomIndex,
    variantId,
    actorPath: MERCHANT_ACTOR_PATH,
    iconPath: MERCHANT_ICON_PATH,
    x,
    y,
    stock: createMerchantStock({ seed: floorSeed, depth, roomIndex, variantId }),
  }));
  return {
    seed: floorSeed,
    artifactFloor: false,
    themeId: CITY_DUNGEON_THEME.id,
    conditionIds,
    branch,
    depth,
    scaling,
    width,
    height,
    grid: city.grid,
    rooms: city.rooms,
    city: city.city,
    spawn: city.spawn,
    exit: city.exit,
    sanctuary: city.sanctuary,
    objective: null,
    doors: city.doors,
    surprises: [],
    events: [],
    monsters: city.monsters,
    passiveCreatures: [],
    finds: [],
    loot: [],
    roomPlans: [],
    roomEncounters: [],
    merchants: Object.freeze(merchants),
    floodedRoomIndex: null,
  };
}

export function generateDungeon({
  seed,
  depth = 1,
  width = MAP_WIDTH,
  height = MAP_HEIGHT,
  scalingVersion = SCALING_VERSION,
  difficulty = DEFAULT_DIFFICULTY,
  lootAbundance = DEFAULT_LOOT_ABUNDANCE,
  waterChance = null,
  branch = DEFAULT_RUN_BRANCH,
}) {
  if (!Number.isInteger(seed) || seed < 0) throw new Error('Dungeon seed must be a uint32 integer');
  if (!Number.isInteger(depth) || depth < CITY_DEPTH)
    throw new Error('Dungeon depth must be a positive integer');
  if (width < 24 || height < 18) throw new Error('Dungeon dimensions are too small');
  // The surface has no difficulty curve of its own; it borrows the first floor's
  // numbers so every consumer still sees a complete scaling record.
  const scaling = floorScaling(
    isCityDepth(depth) ? 1 : depth,
    scalingVersion,
    difficulty,
    lootAbundance,
  );
  const floorSeed = mixSeed(seed, depth);
  // The two rules this run lives by. Drawn from the RUN seed like the order of
  // places is, and carried on the floor for the same reason: `dungeon.seed` is
  // the floor's seed and the run cannot be read back out of it.
  const conditionIds = runConditions(seed);
  const conditions = conditionEffects(conditionIds);
  const budget = conditionedFloor(scaling, conditions);
  // The floor that owes the run its artefact: its cache is always sealed, and
  // its cache is always the one that pays.
  const artifactFloor = depth === guaranteedArtifactDepth(seed, FINAL_DEPTH);
  // Which place this floor is. Decided from the RUN seed, then carried: the
  // floor seed below cannot be turned back into the run it came from.
  const themeId = dungeonThemeFor(seed, depth, branch).id;
  // The city is a floor of a different kind, built by its own plan. It returns
  // the same shape every other floor returns, so nothing downstream cares.
  if (isCityDepth(depth)) {
    return generateCityDungeon({ floorSeed, conditionIds, branch, depth, width, height, scaling });
  }
  const rng = createRng(floorSeed);
  // A dungeon is carved out of solid rock; open country is built into open
  // ground. Same output either way — a grid and a list of rectangles — because
  // everything past this point is written against rooms.
  const surfacePlan = branch === 'surface'
    ? generateSurfacePlan({ rng, width, height, roomCount: scaling.layout.roomCount })
    : null;
  const grid = surfacePlan
    ? surfacePlan.grid
    : Array.from({ length: height }, () => Array(width).fill('#'));
  const rooms = surfacePlan ? [...surfacePlan.rooms] : [];
  const desiredRooms = scaling.layout.roomCount;
  for (let attempt = 0; attempt < (surfacePlan ? 0 : 260) && rooms.length < desiredRooms; attempt += 1) {
    const room = {
      width: rng.int(4, 8),
      height: rng.int(4, 7),
      x: 0,
      y: 0,
    };
    room.x = rng.int(1, width - room.width - 2);
    room.y = rng.int(1, height - room.height - 2);
    if (rooms.some((other) => roomOverlaps(room, other))) continue;
    carveRoom(grid, room);
    if (rooms.length > 0) {
      carveCorridor(grid, roomCenter(rooms.at(-1)), roomCenter(room), rng.next() < 0.5);
    }
    rooms.push(room);
  }
  if (rooms.length < 6) throw new Error('Dungeon generator could not place enough rooms');
  for (let loop = 0; loop < (surfacePlan ? 0 : Math.min(3, rooms.length - 2)); loop += 1) {
    const from = rng.int(0, rooms.length - 1);
    let to = rng.int(0, rooms.length - 1);
    if (to === from) to = (to + 2) % rooms.length;
    carveCorridor(grid, roomCenter(rooms[from]), roomCenter(rooms[to]), rng.next() < 0.5);
  }

  const spawn = roomCenter(rooms[0]);
  const distanceFromSpawn = (room) => {
    const center = roomCenter(room);
    return Math.abs(center.x - spawn.x) + Math.abs(center.y - spawn.y);
  };
  const exit = roomCenter(
    [...rooms].sort((a, b) => distanceFromSpawn(b) - distanceFromSpawn(a))[0],
  );
  const route = findGridPath(grid, spawn, exit);
  if (route.length === 0) throw new Error('Generated dungeon has no route to the exit');
  const occupied = new Set([`${spawn.x},${spawn.y}`, `${exit.x},${exit.y}`]);

  const sanctuary = depth > 1 ? { ...route[0] } : null;
  if (sanctuary) occupied.add(`${sanctuary.x},${sanctuary.y}`);
  const chapterGuardian = chapterGuardianForDepth(depth, branch);
  const bossCell = chapterGuardian ? route.at(-2) : null;
  const objective = bossCell
    ? {
        kind: chapterGuardian.final ? 'final-artifact' : 'chapter-gate',
        bossId: chapterGuardian.monsterId,
        bossInstanceId: `monster-${depth}-boss`,
        boss: { ...bossCell },
        gate: { ...exit },
        artifact: chapterGuardian.final ? { ...exit } : null,
      }
    : null;
  if (bossCell) occupied.add(`${bossCell.x},${bossCell.y}`);

  const doorPlan = planDungeonDoors({
    grid,
    rooms,
    spawn,
    exit,
    sanctuary,
    objective,
    depth,
    floorSeed,
    doorsRequired: branch !== 'surface',
  });
  const surpriseRoom = doorPlan.surprise
    ? rooms[doorPlan.surprise.roomIndex]
    : null;

  const initialReveal = new Set();
  revealAround(initialReveal, grid, spawn, 4);
  const nearRoute = route.filter((cell) => {
    const distance = Math.abs(cell.x - spawn.x) + Math.abs(cell.y - spawn.y);
    return (
      distance >= 2 &&
      distance <= 3 &&
      initialReveal.has(`${cell.x},${cell.y}`) &&
      isWalkableCell(grid, cell.x, cell.y) &&
      !occupied.has(`${cell.x},${cell.y}`)
    );
  });
  const visibleFloorCells = [];
  for (const cellKey of initialReveal) {
    const [x, y] = cellKey.split(',').map(Number);
    const distance = Math.abs(x - spawn.x) + Math.abs(y - spawn.y);
    if (distance >= 2 && isWalkableCell(grid, x, y) && !occupied.has(cellKey)) {
      visibleFloorCells.push({ x, y });
    }
  }
  shuffle(rng, visibleFloorCells);
  const starterMonsterCell = nearRoute[0] ?? visibleFloorCells[0] ?? route[0];
  occupied.add(`${starterMonsterCell.x},${starterMonsterCell.y}`);
  const starterLootCell = visibleFloorCells.find(
    (cell) => !occupied.has(`${cell.x},${cell.y}`),
  );
  if (!starterLootCell) throw new Error('Dungeon generator could not place the starter reward');
  occupied.add(`${starterLootCell.x},${starterLootCell.y}`);

  const eventRooms = shuffle(rng, rooms.slice(1)).filter((room) => {
    const position = roomCenter(room);
    return !occupied.has(`${position.x},${position.y}`);
  }).slice(0, budget.eventCount);
  const events = eventRooms.map((room, index) => {
    const position = roomCenter(room);
    occupied.add(`${position.x},${position.y}`);
    const definition = weightedPick(rng, EVENT_CATALOG);
    return { instanceId: `event-${depth}-${index}`, id: definition.id, ...position };
  });

  // A sheep has no business in a crypt, and a lich none in a meadow.
  const monsterPool = MONSTER_CATALOG.filter((monster) =>
    monsterEligibleForFloor(monster, scaling) && monsterSuitsBranch(monster, branch),
  );
  // The tier says what CAN live on this floor; the place says what often does.
  // A multiplier, never a filter: nothing is ever taken out of the game.
  const monsterWeight = (monster) => (
    (12 / monsterTier(monster)) * monsterBiomeWeight(monster, themeId)
  );
  // Conditions bend what the floor is made of, never what it owes: the first
  // floor's gear, the promised book, the artefact cache and the chapter
  // guardian are placed elsewhere and none of them reads these numbers.
  const monsterCount = budget.monsterCount;
  const lootCount = budget.lootCount;
  const fixedMonsterCount = 1 + (objective ? 1 : 0);
  const desiredSurpriseMonsterCount = doorPlan.surprise?.type === 'horde'
    ? Math.min(4, monsterCount - fixedMonsterCount)
    : doorPlan.surprise?.type === 'mixed'
      ? Math.min(2, monsterCount - fixedMonsterCount)
      : 0;
  const surpriseMonsterCells = surpriseRoom
    ? pickRoomSpawnCells(
        rng,
        grid,
        surpriseRoom,
        desiredSurpriseMonsterCount,
        occupied,
      )
    : [];
  const monsterCells = pickSpawnCells(
    rng,
    grid,
    spawn,
    monsterCount - fixedMonsterCount - surpriseMonsterCells.length,
    occupied,
  );
  // The floor's first creature is an ordinary dungeon one: summoned bodies and
  // city watchmen have their own places and never open a floor.
  const starterMonster = weightedPick(
    rng,
    MONSTER_CATALOG.filter((monster) => (
      monster.tier === 1 && monster.spawn === undefined && monsterSuitsBranch(monster, branch)
    )),
    (monster) => monsterBiomeWeight(monster, themeId),
  );
  const monsters = [
    { instanceId: `monster-${depth}-0`, id: starterMonster.id, ...starterMonsterCell },
    ...(objective
      ? [
          {
            instanceId: objective.bossInstanceId,
            id: objective.bossId,
            ...objective.boss,
          },
        ]
      : []),
    ...monsterCells.map((position, index) => {
      const definition = weightedPick(rng, monsterPool, monsterWeight);
      return {
        instanceId: `monster-${depth}-${index + fixedMonsterCount}`,
        id: definition.id,
        ...position,
      };
    }),
    ...surpriseMonsterCells.map((position, index) => {
      const definition = weightedPick(rng, monsterPool, monsterWeight);
      return {
        instanceId: `monster-${depth}-${index + fixedMonsterCount + monsterCells.length}`,
        id: definition.id,
        ...position,
      };
    }),
  ];
  if (doorPlan.surprise) {
    doorPlan.surprise.monsterIds = monsters
      .slice(monsters.length - surpriseMonsterCells.length)
      .map(({ instanceId }) => instanceId);
  }

  // The same rule for what is left lying here: a sanctum keeps its books, a
  // forge-hot core keeps its steel. Weights only, folded into the pool so the
  // budgeted picker below needs to know nothing about biomes.
  const lootPool = LOOT_CATALOG
    .filter((item) => lootEligibleForFloor(item, scaling))
    .map((item) => ({ ...item, weight: (item.weight ?? 1) * lootBiomeWeight(item, themeId) }));
  // The guaranteed first drop must not duplicate what the hero already wears.
  const starterIds = new Set(['rusty-sword', 'worn-tunic']);
  const starterLootPool = lootPool.filter((item) => item.slot && !starterIds.has(item.id));
  // The treasure room takes from the floor's loot budget, never on top of it,
  // and it leaves two ordinary drops behind: the promised piece of gear, and
  // one slot for whatever else the run owes this floor. Eating the budget whole
  // used to leave nowhere to put a guaranteed item.
  const desiredSurpriseLootCount = doorPlan.surprise?.type === 'treasure'
    ? Math.min(3, lootCount - 2)
    : doorPlan.surprise?.type === 'mixed'
      ? Math.min(2, lootCount - 2)
      : 0;
  const surpriseLootCells = surpriseRoom
    ? pickRoomSpawnCells(rng, grid, surpriseRoom, desiredSurpriseLootCount, occupied)
    : [];
  const lootCells = pickSpawnCells(
    rng,
    grid,
    spawn,
    Math.max(0, lootCount - 1 - surpriseLootCells.length),
    occupied,
  );
  const selectedLoot = createBalancedLootPicks({
    rng: createRng(mixSeed(floorSeed, 0x4c4f4f54)),
    pool: lootPool,
    starterPool: starterLootPool,
    count: 1 + lootCells.length,
    qualityBudget: budget.qualityBudget,
  }).picks;
  const floorLootPicks = [...selectedLoot];
  // The run's first spell book is placed, not rolled: see the note on
  // `guaranteedSpellBookPlacement`. It never takes the first slot, because that
  // one is the promised piece of gear a bare hero starts from.
  const bookPlacement = guaranteedSpellBookPlacement(seed);
  if (depth === bookPlacement.depth && floorLootPicks.length > 1) {
    const book = lootById(bookPlacement.bookId);
    if (book && !floorLootPicks.some(({ id }) => id === book.id)) {
      floorLootPicks[1 + (floorSeed % (floorLootPicks.length - 1))] = book;
    }
  }
  // Nothing on the open floor is ever an artefact. The floor asks nothing of the
  // hero — they walk over it — and an artefact has to be earned. The run's one
  // artefact lives inside a sealed cache that cost something to open; the rule
  // is `rollCacheArtifact`.
  const equipmentSpawnState = (definition, instanceId) => {
    if (!definition.slot) return {};
    const materialId = rollMaterial({ seed, depth, instanceId, item: definition });
    return {
      affixIds: [...rollItemAffixes({
        seed: floorSeed,
        depth,
        instanceId,
        item: definition,
      })],
      ...(materialId ? { materialId } : {}),
      artifactPowerId: null,
      artifactCurseId: null,
    };
  };
  const loot = [
    {
      instanceId: `loot-${depth}-0`,
      id: floorLootPicks[0].id,
      ...equipmentSpawnState(floorLootPicks[0], `loot-${depth}-0`),
      ...starterLootCell,
    },
    ...lootCells.map((position, index) => {
      const definition = floorLootPicks[index + 1];
      const instanceId = `loot-${depth}-${index + 1}`;
      return {
        instanceId,
        id: definition.id,
        ...equipmentSpawnState(definition, instanceId),
        ...position,
      };
    }),
    ...surpriseLootCells.map((position, index) => ({
      instanceId: `loot-${depth}-${index + lootCells.length + 1}`,
      id: 'coin-cache',
      amount: 4 + depth * 2 + rng.int(0, 4),
      ...position,
    })),
  ];
  if (doorPlan.surprise) {
    doorPlan.surprise.lootIds = loot
      .slice(loot.length - surpriseLootCells.length)
      .map(({ instanceId }) => instanceId);
  }

  // Passive wildlife owns a separate RNG stream. Adding or tuning it therefore
  // cannot reshuffle rooms, hostile encounters, loot or door surprises.
  const passiveRng = createRng(mixSeed(floorSeed, 0x50415353));
  const passivePool = PASSIVE_CREATURE_CATALOG.filter(({ minDepth }) => minDepth <= depth);
  const desiredPassiveCount = Math.min(
    5,
    2 + Math.floor((depth - 1) / 2) + passiveRng.int(0, 1),
  );
  const passiveCreatures = [];
  for (
    let attempt = 0;
    attempt < 120 && passiveCreatures.length < desiredPassiveCount;
    attempt += 1
  ) {
    const roomIndex = passiveRng.int(1, rooms.length - 1);
    const room = rooms[roomIndex];
    const x = passiveRng.int(room.x + 1, room.x + room.width - 2);
    const y = passiveRng.int(room.y + 1, room.y + room.height - 2);
    const key = `${x},${y}`;
    if (grid[y]?.[x] !== '.' || occupied.has(key)) continue;
    const definition = weightedPick(passiveRng, passivePool);
    const index = passiveCreatures.length;
    occupied.add(key);
    passiveCreatures.push({
      instanceId: `passive-${depth}-${index}`,
      id: definition.id,
      x,
      y,
      roomIndex,
      seed: mixSeed(floorSeed, 0x57494c44 + index),
    });
  }
  // Shallow water owns its own stream too. A rare room floods after every
  // other placement, so a flooded floor keeps the rooms, monsters, loot and
  // fauna of the dry one; only the floor glyphs and two water creatures differ.
  const waterRng = createRng(mixSeed(floorSeed, 0x57415452));
  const chapterOfDepth = Math.floor((depth - 1) / FLOORS_PER_CHAPTER) + 1;
  // A creature tied to a chapter belongs to that chapter only; everything else
  // simply needs the floor to be deep enough.
  const belongsToFloor = (monster) => monsterSuitsBranch(monster, branch) && (
    Number.isInteger(monster.chapter)
      ? monster.chapter === chapterOfDepth
      : depth >= (monster.minDepth ?? 1)
  );
  const roomHolds = (room, point) => Boolean(point)
    && point.x >= room.x && point.x < room.x + room.width
    && point.y >= room.y && point.y < room.y + room.height;
  const dryRooms = new Set(
    rooms
      .map((room, index) => ({ room, index }))
      .filter(({ room, index }) => index === 0
        || room === surpriseRoom
        || roomHolds(room, spawn)
        || roomHolds(room, exit)
        || roomHolds(room, sanctuary)
        || roomHolds(room, objective?.boss))
      .map(({ index }) => index),
  );
  let floodedRoomIndex = chooseFloodedRoom({
    rng: waterRng,
    rooms,
    excluded: dryRooms,
    // An explicit argument wins over the run's conditions, and the conditions
    // win over the default: a caller asking for a dry floor gets a dry floor.
    chance: waterChance ?? conditions.waterChance ?? WATER_ROOM_CHANCE,
  });
  if (floodedRoomIndex !== null) {
    const keepCells = [...events, ...passiveCreatures].filter((entry) => roomHolds(rooms[floodedRoomIndex], entry));
    const water = shuffle(waterRng, floodRoom(grid, rooms[floodedRoomIndex], { rng: waterRng, keepCells }));
    if (water.length < 4) {
      // A room that is all doorway aprons is not worth a pool: dry it again.
      for (const { x, y } of water) grid[y][x] = '.';
      floodedRoomIndex = null;
    }
  }
  if (floodedRoomIndex !== null) {
    const water = [];
    const room = rooms[floodedRoomIndex];
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) if (grid[y][x] === '~') water.push({ x, y });
    }
    const waterSpawns = water.filter(({ x, y }) => !occupied.has(`${x},${y}`));
    const waterMonsters = MONSTER_CATALOG.filter((monster) => (
      monster.spawn === 'water' && belongsToFloor(monster)
    ));
    waterMonsters.forEach((monster, index) => {
      const cell = waterSpawns[index];
      if (!cell) return;
      occupied.add(`${cell.x},${cell.y}`);
      monsters.push({ instanceId: `monster-${depth}-water-${index}`, id: monster.id, x: cell.x, y: cell.y });
    });
  }
  // Each chapter past the first seats one signature creature from its own
  // stream. The shared pool and every earlier placement stay byte-identical,
  // so a saved floor simply gains the creature when it is regenerated.
  const chapterRng = createRng(mixSeed(floorSeed, 0x43484150));
  const chapterMonsters = MONSTER_CATALOG.filter((monster) => (
    monster.chapter === chapterOfDepth
    && monster.spawn !== 'water'
    && monsterSuitsBranch(monster, branch)
  ));
  chapterMonsters.forEach((monster, index) => {
    const cell = pickSpawnCells(chapterRng, grid, spawn, 4, occupied)
      .find(({ x, y }) => grid[y][x] === '.');
    if (!cell) return;
    occupied.add(`${cell.x},${cell.y}`);
    monsters.push({ instanceId: `monster-${depth}-chapter-${index}`, id: monster.id, x: cell.x, y: cell.y });
  });
  // Interactive finds own an independent stream. Adding a new find or changing
  // its presentation cannot reshuffle rooms, monsters, loot, fauna or doors.
  // Landmarks (altar and later fountain/rune) use a third stream, so they never
  // move the three core finds of an already saved floor.
  const findRng = createRng(mixSeed(floorSeed, 0x46494e44));
  const landmarkRng = createRng(mixSeed(floorSeed, 0x4c414e44));
  const secretRng = createRng(mixSeed(floorSeed, 0x53454352));
  const finds = createDungeonFinds({
    level: {
      seed: floorSeed,
      depth,
      grid,
      rooms,
      exit,
      surprises: doorPlan.surprise ? [doorPlan.surprise] : [],
      sealedCache: artifactFloor,
      themeId,
    },
    rng: findRng,
    landmarkRng,
    secretRng,
    occupiedCells: occupied,
    avoidCells: route.map(({ x, y }) => `${x},${y}`),
  });
  const roomPlans = createDungeonRoomPlans({
    seed: floorSeed,
    themeId,
    depth,
    scaling,
    grid,
    rooms,
    spawn,
    exit,
    sanctuary,
    objective,
    doors: doorPlan.doors,
    surprises: doorPlan.surprise ? [doorPlan.surprise] : [],
    events,
    monsters,
    passiveCreatures,
    finds,
    loot,
  });
  const roomContent = materializeDungeonRoomContent({
    seed: floorSeed,
    themeId,
    depth,
    scaling,
    grid,
    rooms,
    spawn,
    exit,
    sanctuary,
    objective,
    doors: doorPlan.doors,
    surprises: doorPlan.surprise ? [doorPlan.surprise] : [],
    events,
    monsters,
    passiveCreatures,
    finds,
    loot,
    roomPlans,
  });
  return {
    seed: floorSeed,
    // `seed` above is the FLOOR seed (`mixSeed(seed, depth)`), so nothing
    // downstream can recover the run seed from it. Everything that needs the
    // run seed is answered here and carried: which floor owes the artefact, and
    // which place this floor is.
    artifactFloor,
    themeId,
    conditionIds,
    branch,
    depth,
    scaling,
    width,
    height,
    grid,
    rooms,
    spawn,
    exit,
    sanctuary,
    objective,
    doors: doorPlan.doors,
    surprises: doorPlan.surprise ? [doorPlan.surprise] : [],
    events: roomContent.events,
    monsters: roomContent.monsters,
    passiveCreatures,
    finds: roomContent.finds,
    loot,
    roomPlans,
    roomEncounters: roomContent.encounters,
    merchants: roomContent.merchants,
    floodedRoomIndex,
  };
}

const RUN_END_SOURCE_ID = /^[a-z][a-z0-9:-]{0,39}$/;

/** Whole-run statistics for the death/victory screen; nothing here is derivable from one floor. */
export function createRunStats(source = null) {
  const kills = Number.isInteger(source?.kills) && source.kills >= 0 ? source.kills : 0;
  const activeSeconds = Number.isFinite(source?.activeSeconds) && source.activeSeconds >= 0
    ? source.activeSeconds
    : 0;
  const killerId = typeof source?.killerId === 'string' && RUN_END_SOURCE_ID.test(source.killerId)
    ? source.killerId
    : null;
  return { kills, activeSeconds, killerId };
}

export function validateRunStats(stats) {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return false;
  if (!Object.hasOwn(stats, 'killerId')) return false;
  if (!isFiniteInteger(stats.kills, 0, 1_000_000)) return false;
  if (!Number.isFinite(stats.activeSeconds) || stats.activeSeconds < 0 || stats.activeSeconds > 10_000_000) return false;
  return stats.killerId === null || (typeof stats.killerId === 'string' && RUN_END_SOURCE_ID.test(stats.killerId));
}

export function createRun(seed, dungeon = generateDungeon({ seed, depth: 1 })) {
  const startingMagic = createStartingMagic();
  // A run starts from zero: worn clothes, a rusty sword, an empty bag and no
  // spells. Everything else — armour, tools, food, books — is found below.
  const items = [
    { id: 'rusty-sword', uid: 'starter-sword', affixIds: [], artifactPowerId: null, artifactCurseId: null },
    { id: 'worn-tunic', uid: 'starter-tunic', affixIds: [], artifactPowerId: null, artifactCurseId: null },
  ];
  return {
    version: SAVE_VERSION,
    generatorVersion: GENERATOR_VERSION,
    contentVersion: CONTENT_VERSION,
    scalingVersion: dungeon.scaling?.version ?? SCALING_VERSION,
    difficulty: dungeon.scaling?.difficulty ?? DEFAULT_DIFFICULTY,
    lootAbundance: dungeon.scaling?.lootAbundance ?? DEFAULT_LOOT_ABUNDANCE,
    seed: seed >>> 0,
    depth: dungeon.depth,
    // Which way this run went out of the city: down into the caves, or out
    // through the gate. It decides the places and who lives in them, and it
    // is not derivable from the seed — the hero chose it.
    branch: dungeon.branch ?? DEFAULT_RUN_BRANCH,
    hero: {
      x: dungeon.spawn.x,
      y: dungeon.spawn.y,
      hp: 100,
      maxHp: 100,
      level: 1,
      xp: 0,
      power: 1,
      hunger: HUNGER_MAX,
      meal: null,
      coating: null,
      effects: createActorEffects(),
      skills: createSkillState(),
      skillStudy: createBookStudy(),
      intelligence: startingMagic.intelligence,
      spells: startingMagic.spells,
    },
    gold: 0,
    status: 'playing',
    started: false,
    commandSequence: 0,
    stats: createRunStats(),
    knowledge: createItemKnowledge(),
    items,
    equipment: {
      cloak: null,
      body: 'starter-tunic',
      head: null,
      hand1: 'starter-sword',
      hand2: null,
      gloves: null,
      belt: null,
      boots: null,
      ring1: null,
      ring2: null,
      amulet: null,
    },
    inventory: [],
    camp: { stash: createCampStash() },
    house: createHouseState(),
    crime: createCrimeState(),
    companions: [],
    floors: {},
    floor: createEmptyFloorState(dungeon),
  };
}

function createEmptyFloorState(dungeon = null) {
  return {
    revealed: [],
    defeated: [],
    collected: [],
    resolved: [],
    resolvedFindIds: [],
    detectedTrapIds: [],
    disarmedTrapIds: [],
    placedTraps: [],
    opened: [],
    triggered: [],
    monsters: [],
    passives: [],
    camp: null,
    merchants: dungeon
      ? [...createMerchantStates({ merchants: dungeon.merchants, depth: dungeon.depth })]
      : [],
    chests: dungeon
      ? [...createChestContainerStates({
          seed: dungeon.seed,
          depth: dungeon.depth,
          finds: dungeon.finds,
          lootAbundance: dungeon.scaling?.lootAbundance ?? DEFAULT_LOOT_ABUNDANCE,
          guaranteedArtifact: dungeon.artifactFloor === true,
        })]
      : [],
  };
}

function normalizeEquipment(equipment) {
  return Object.fromEntries(
    EQUIPMENT_SLOTS.map((slot) => [slot, equipment?.[slot] ?? null]),
  );
}

function uniqueLegacyUid(uid, used, fallback) {
  const base = typeof uid === 'string' && uid.length > 0 && uid.length <= 70 ? uid : fallback;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function legacySkillState(hero) {
  // Only absence is migrated. Explicit corrupt skill data must remain an error.
  if (!Object.hasOwn(hero ?? {}, 'skills')) return createSkillState(hero?.level);
  if (!validateSkillState(hero.skills, hero.level)) throw new Error('Invalid legacy skill state');
  return cloneSkillState(hero.skills);
}

function stripLegacyItemSanctity(items) {
  return items.map((item) => {
    const { sanctity: _sanctity, sanctityKnown: _known, ...record } = item;
    return record;
  });
}

function migrateOwnedItemAffixes(items, preserve = false) {
  return items.map((item) => {
    const definition = lootById(item?.id);
    if (!definition?.slot) {
      const { affixIds: _affixIds, ...record } = item;
      return record;
    }
    const affixIds = preserve && validateItemAffixIds(definition, item.affixIds)
      ? [...item.affixIds]
      : [];
    return { ...item, affixIds };
  });
}

function migrateOwnedItemArtifacts(items, preserve = false) {
  return items.map((item) => {
    const definition = lootById(item?.id);
    if (!definition?.slot) {
      const { artifactPowerId: _power, artifactCurseId: _curse, ...record } = item;
      return record;
    }
    if (preserve && validateProceduralArtifactState(definition, item)) return { ...item };
    return { ...item, artifactPowerId: null, artifactCurseId: null };
  });
}

function migrateLegacyGold(snapshot) {
  return snapshot.gold ?? snapshot.shards ?? 0;
}

function migrateTwoHandedEquipment(snapshot) {
  const mainUid = snapshot.equipment?.hand1;
  const offhandUid = snapshot.equipment?.hand2;
  if (!mainUid || !offhandUid) return;
  const records = new Map(snapshot.items.map((item) => [item.uid, item]));
  const mainDefinition = lootById(records.get(mainUid)?.id);
  if (!isTwoHandedItem(mainDefinition)) return;

  if (snapshot.inventory.length < 12) {
    snapshot.equipment.hand2 = null;
    snapshot.inventory.push(offhandUid);
    return;
  }

  // A full legacy backpack cannot accept the displaced off-hand item. First
  // fill any genuinely empty equipment slot from the backpack, preserving all
  // owned items and freeing exactly one inventory cell.
  for (const candidateUid of snapshot.inventory) {
    const candidate = lootById(records.get(candidateUid)?.id);
    const target = allowedSlotsForItem(candidate).find((slot) => (
      !['hand1', 'hand2'].includes(slot) && snapshot.equipment[slot] === null
    ));
    if (!target) continue;
    snapshot.inventory = snapshot.inventory.filter((uid) => uid !== candidateUid);
    snapshot.equipment[target] = candidateUid;
    snapshot.equipment.hand2 = null;
    snapshot.inventory.push(offhandUid);
    return;
  }

  // If every wearable slot is filled, swap the two-handed weapon for a packed
  // one-handed main-hand weapon. This keeps the old off hand active and loses
  // neither item even at the absolute ownership cap.
  const replacementUid = snapshot.inventory.find((candidateUid) => {
    const candidate = lootById(records.get(candidateUid)?.id);
    return candidate?.slot === 'hand1' && !isTwoHandedItem(candidate);
  });
  if (!replacementUid) throw new Error('Cannot migrate full two-handed loadout');
  snapshot.inventory = snapshot.inventory.filter((uid) => uid !== replacementUid);
  snapshot.inventory.push(mainUid);
  snapshot.equipment.hand1 = replacementUid;
}

function rebaseLegacyRunForExpandedDungeon(migrated, legacyStatus) {
  const continuesCompletedPrologue = legacyStatus === 'victory' && migrated.depth < FINAL_DEPTH;
  const depth = Math.min(
    FINAL_DEPTH,
    continuesCompletedPrologue ? migrated.depth + 1 : migrated.depth,
  );
  migrated.depth = depth;
  migrated.generatorVersion = GENERATOR_VERSION;
  migrated.contentVersion = CONTENT_VERSION;
  migrated.scalingVersion = SCALING_VERSION;
  const dungeon = generateDungeon({
    seed: migrated.seed,
    depth,
    scalingVersion: migrated.scalingVersion,
    difficulty: migrated.difficulty,
    lootAbundance: migrated.lootAbundance,
  });
  migrated.hero.x = dungeon.spawn.x;
  migrated.hero.y = dungeon.spawn.y;
  migrated.status = migrated.hero.hp === 0 ? 'dead' : 'playing';
  migrated.started = migrated.hero.hp === 0;
  migrated.floor = createEmptyFloorState(dungeon);
}

/** What a night was worth at each camp rank before v39 wrote it into the save. */
const LEGACY_CAMP_REST_PERCENT = Object.freeze({ 1: 0, 2: 25, 3: 40 });

/** Keeps only well-formed floors, and never the one the hero stands on. */
function normalizedFloorArchive(source, currentDepth) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const archive = {};
  for (const [key, floor] of Object.entries(source)) {
    const depth = Number(key);
    if (!isFiniteInteger(depth, CITY_DEPTH, FINAL_DEPTH) || depth === currentDepth) continue;
    if (!validateFloorShape(floor, depth)) continue;
    archive[key] = floor;
  }
  return archive;
}

export function migrateLegacyRun(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47].includes(snapshot.version)) {
    throw new Error('Not a supported legacy RPG save');
  }
  if ([31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47].includes(snapshot.version)) {
    // v32 activates Storm Magic. v33 turns each generated chest into a real
    // persisted container. A previously resolved chest migrates as an empty,
    // already-open container so an update can never duplicate its old reward.
    // v34 replaces the flat purchase ledger with an authoritative merchant
    // purse and buyback inventory. Existing purchases stay sold and also fund
    // the migrated merchant; no owned item changes hands during migration.
    const migrated = structuredClone(snapshot);
    migrated.version = SAVE_VERSION;
    migrated.branch = migrated.branch ?? DEFAULT_RUN_BRANCH;
    migrated.contentVersion = CONTENT_VERSION;
    const dungeon = generateDungeon({
      seed: migrated.seed,
      depth: migrated.depth,
      scalingVersion: migrated.scalingVersion,
      difficulty: migrated.difficulty,
      lootAbundance: migrated.lootAbundance,
    });
    if (snapshot.version < 33) {
      migrated.floor.chests = [...createChestContainerStates({
        seed: dungeon.seed,
        depth: migrated.depth,
        finds: dungeon.finds,
        lootAbundance: migrated.lootAbundance,
        resolvedFindIds: migrated.floor.resolvedFindIds,
        guaranteedArtifact: dungeon.artifactFloor === true,
      })];
    }
    if (snapshot.version < 34) {
      const legacyMerchantPurchases = migrated.floor.merchantPurchases ?? [];
      if (!validateMerchantPurchaseIds(legacyMerchantPurchases, dungeon.merchants, migrated.depth)) {
        throw new Error('Cannot migrate unknown merchant purchase');
      }
      migrated.floor.merchants = [...createMerchantStates({
        merchants: dungeon.merchants,
        depth: migrated.depth,
        purchasedIds: legacyMerchantPurchases,
      })];
      delete migrated.floor.merchantPurchases;
    }
    // v35 adds whole-run statistics; an older run simply starts counting now.
    // v36 (generator 8) floods a rare room with shallow water and v37
    // (generator 9) adds the fountain and rune landmarks: both regenerate the
    // floor from the same seed, and every saved position stays walkable.
    migrated.stats = createRunStats(snapshot.stats);
    // v38 lets the hero pitch a camp; an older floor simply has none yet and
    // the stash starts empty, so nothing an old run owned changes hands.
    migrated.generatorVersion = GENERATOR_VERSION;
    // Every migrated run gets the camp fields v38 introduced: no pitched camp
    // on the floor and an empty stash in the run.
    // v40 adds the cooked-dish timer; a migrated hero simply has not eaten one.
    migrated.hero.meal = migrated.hero.meal ?? null;
    migrated.hero.coating = createCoatingState(migrated.hero.coating);
    migrated.floor.camp = migrated.floor.camp ?? null;
    migrated.camp = migrated.camp ?? { stash: createCampStash() };
    // v41 gives the hero a house to buy; a migrated run simply has no deed yet.
    migrated.house = createHouseState(migrated.house);
    // v42 remembers the floors the hero has left; a migrated run remembers none.
    migrated.floors = normalizedFloorArchive(migrated.floors, migrated.depth);
    // v43 lets the city keep a record; a migrated hero has none.
    migrated.crime = createCrimeState(migrated.crime);
    migrated.companions = createCompanionParty(migrated.companions ?? migrated.companion);
    // v39 keeps the camp's comfort in the camp itself, so a summoned camp
    // sleeps well for a hero with no camping skill. A v38 camp inherits the
    // value its rank always had.
    if (migrated.floor.camp && !Number.isInteger(migrated.floor.camp.restPercent)) {
      migrated.floor.camp = {
        ...migrated.floor.camp,
        restPercent: LEGACY_CAMP_REST_PERCENT[migrated.floor.camp.rank] ?? 0,
      };
    }
    if (!validateRun(migrated)) throw new Error(`Cannot migrate invalid version ${snapshot.version} RPG save`);
    return migrated;
  }
  if ([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].includes(snapshot.version)) {
    // v15 adds explicitly targeted player traps; v16 makes long weapons truly
    // two-handed; v17 expands the sword loot family; v18 adds per-run item
    // knowledge; v19 adds item sanctity and a persistent loot-abundance knob;
    // v20 adds deterministic affixes; v21 replaces hidden sanctity with clear,
    // seeded procedural artefacts; v22 renames the only currency to gold and
    // removes obsolete sanctity; v23 persists merchant stock purchases;
    // v24 adds a long, nonlethal hunger clock; v25 adds the shared command
    // sequence and persistent wildlife combat state; v26 adds persistent book
    // rank adjustments and unknown scroll/wand/book families; v27 adds the
    // intelligence stat and three prepared spell slots; v28 persists actor
    // conditions on monsters and adds targeted frost/blink content; v29 adds
    // the persisted frozen condition and the full Cryomancy I-III chain;
    // v30 adds the targeted Tide Wand to the unknown wand pool; v31 expands a
    // run to three three-floor chapters; v32 activates Storm Magic and its
    // spellbook; v33 persists real chest containers; v34 persists merchant
    // purses and buyback stock. The generator/scaling boundary rebuilds
    // only the active floor. Character progression, gear, gold, hunger, spells
    // and knowledge survive. A completed old three-floor run continues on floor
    // four instead of remaining a false victory under the new nine-floor rules.
    if (Object.hasOwn(snapshot.floor ?? {}, 'detectedTrapIds')) {
      const legacyDungeon = generateDungeon({
        seed: snapshot.seed,
        depth: snapshot.depth,
        branch: snapshot.branch ?? DEFAULT_RUN_BRANCH,
        scalingVersion: scalingVersionSupported(snapshot.scalingVersion)
          ? snapshot.scalingVersion
          : SCALING_VERSION,
        difficulty: snapshot.difficulty,
        lootAbundance: validateLootAbundance(snapshot.lootAbundance)
          ? snapshot.lootAbundance
          : DEFAULT_LOOT_ABUNDANCE,
      });
      if (!validateDetectedTrapIds(
        snapshot.floor.detectedTrapIds,
        trapsFromDungeon(legacyDungeon),
      )) throw new Error('Cannot migrate unknown detected trap');
    }
    const migrated = structuredClone(snapshot);
    migrated.version = SAVE_VERSION;
    migrated.branch = migrated.branch ?? DEFAULT_RUN_BRANCH;
    migrated.generatorVersion = GENERATOR_VERSION;
    migrated.contentVersion = CONTENT_VERSION;
    migrated.gold = migrateLegacyGold(snapshot);
    migrated.commandSequence = snapshot.version >= 25 ? snapshot.commandSequence : 0;
    delete migrated.shards;
    migrated.knowledge = snapshot.version >= 18
      ? createItemKnowledge(snapshot.knowledge)
      : createItemKnowledge();
    migrated.lootAbundance = snapshot.version >= 19
      ? snapshot.lootAbundance
      : DEFAULT_LOOT_ABUNDANCE;
    migrated.items = migrateOwnedItemArtifacts(migrateOwnedItemAffixes(
      stripLegacyItemSanctity(migrated.items),
      snapshot.version >= 20,
    ), snapshot.version >= 21);
    if (snapshot.version < 24) migrated.hero.hunger = HUNGER_MAX;
    if (snapshot.version === 9) migrated.hero.skills = legacySkillState(snapshot.hero);
    migrated.hero.skillStudy = snapshot.version >= 26
      ? createBookStudy(snapshot.hero.skillStudy)
      : createBookStudy();
    // Saves that predate manual magic keep the historical wanderer kit; only
    // brand-new runs start without spells.
    const startingMagic = createStartingMagic(LEGACY_BUILD_PRESET_ID);
    migrated.hero.intelligence = snapshot.version >= 27
      ? snapshot.hero.intelligence
      : startingMagic.intelligence;
    migrated.hero.spells = snapshot.version >= 27
      ? createSpellState(snapshot.hero.spells)
      : startingMagic.spells;
    migrated.hero.effects = createActorEffects(snapshot.hero.effects);
    const missingDiscovery = !Object.hasOwn(migrated.floor ?? {}, 'detectedTrapIds');
    if (missingDiscovery && migrated.floor) migrated.floor.detectedTrapIds = [];
    if (migrated.floor && snapshot.version < 12) migrated.floor.resolvedFindIds = [];
    if (migrated.floor && snapshot.version < 13) migrated.floor.disarmedTrapIds = [];
    if (migrated.floor && snapshot.version < 15) migrated.floor.placedTraps = [];
    if (migrated.floor && snapshot.version < 23) migrated.floor.merchantPurchases = [];
    if (migrated.floor) {
      migrated.floor.monsters = (migrated.floor.monsters ?? []).map((monster) => ({
        ...monster,
        effects: createActorEffects(monster.effects),
      }));
      migrated.floor.passives = (migrated.floor.passives ?? []).map((creature) => ({
        ...creature,
        ...(snapshot.version < 25
          ? {
              hunted: false,
              defeated: false,
              hp: 1,
              attackSequence: 0,
            }
          : {}),
      }));
    }
    if (snapshot.version < 16) migrateTwoHandedEquipment(migrated);
    rebaseLegacyRunForExpandedDungeon(migrated, snapshot.status);
    delete migrated.floor.merchantPurchases;
    migrated.stats = createRunStats(migrated.stats);
    // Every migrated run gets the camp fields v38 introduced: no pitched camp
    // on the floor and an empty stash in the run.
    // v40 adds the cooked-dish timer; a migrated hero simply has not eaten one.
    migrated.hero.meal = migrated.hero.meal ?? null;
    migrated.hero.coating = createCoatingState(migrated.hero.coating);
    migrated.floor.camp = migrated.floor.camp ?? null;
    migrated.camp = migrated.camp ?? { stash: createCampStash() };
    // v41 gives the hero a house to buy; a migrated run simply has no deed yet.
    migrated.house = createHouseState(migrated.house);
    // v42 remembers the floors the hero has left; a migrated run remembers none.
    migrated.floors = normalizedFloorArchive(migrated.floors, migrated.depth);
    // v43 lets the city keep a record; a migrated hero has none.
    migrated.crime = createCrimeState(migrated.crime);
    migrated.companions = createCompanionParty(migrated.companions ?? migrated.companion);
    if (!validateRun(migrated)) throw new Error(`Cannot migrate invalid version ${snapshot.version} RPG save`);
    const dungeon = generateDungeon({
      seed: migrated.seed,
      depth: migrated.depth,
      scalingVersion: migrated.scalingVersion,
      difficulty: migrated.difficulty,
      lootAbundance: migrated.lootAbundance,
    });
    const traps = trapsFromDungeon(dungeon);
    if (missingDiscovery) {
      // Old releases drew every trap on a revealed tile. Preserve that knowledge,
      // including already-triggered ones; unseen tiles remain genuinely unknown.
      const revealed = new Set(migrated.floor.revealed);
      migrated.floor.detectedTrapIds = traps
        .filter(({ x, y }) => revealed.has(`${x},${y}`))
        .map(({ instanceId }) => instanceId)
        .sort();
    }
    if (!validateDetectedTrapIds(migrated.floor.detectedTrapIds, traps)) {
      throw new Error('Cannot migrate unknown detected trap');
    }
    if (!validateDisarmedTrapIds(
      migrated.floor.disarmedTrapIds,
      traps,
      migrated.floor.detectedTrapIds,
      migrated.floor.resolved,
    )) throw new Error('Cannot migrate unknown disarmed trap');
    return migrated;
  }
  if ([2, 3, 4, 5, 6, 7, 8].includes(snapshot.version)) {
    const crossesGeneratorBoundary = true;
    const depth = Math.min(snapshot.depth, FINAL_DEPTH);
    const scalingVersion = SCALING_VERSION;
    // v9 intentionally rebases every existing local run onto the new combat
    // pressure. Hero progression and owned gear survive; the current floor is
    // rebuilt so living monsters cannot retain obsolete HP and damage.
    const difficulty = DEFAULT_DIFFICULTY;
    const lootAbundance = DEFAULT_LOOT_ABUNDANCE;
    const dungeon = generateDungeon({ seed: snapshot.seed, depth, scalingVersion, difficulty, lootAbundance });
    const migrated = {
      ...snapshot,
      version: SAVE_VERSION,
      branch: snapshot.branch ?? DEFAULT_RUN_BRANCH,
      generatorVersion: GENERATOR_VERSION,
      contentVersion: CONTENT_VERSION,
      scalingVersion,
      difficulty,
      lootAbundance,
      gold: migrateLegacyGold(snapshot),
      depth,
      hero: crossesGeneratorBoundary
        ? {
            ...snapshot.hero,
            x: dungeon.spawn.x,
            y: dungeon.spawn.y,
            hunger: HUNGER_MAX,
            effects: createActorEffects(snapshot.hero?.effects),
            skills: legacySkillState(snapshot.hero),
            skillStudy: createBookStudy(),
            intelligence: createStartingMagic(LEGACY_BUILD_PRESET_ID).intelligence,
            spells: createStartingMagic(LEGACY_BUILD_PRESET_ID).spells,
          }
        : {
            ...snapshot.hero,
            hunger: HUNGER_MAX,
            effects: createActorEffects(snapshot.hero?.effects),
            skills: legacySkillState(snapshot.hero),
            skillStudy: createBookStudy(),
            intelligence: createStartingMagic(LEGACY_BUILD_PRESET_ID).intelligence,
            spells: createStartingMagic(LEGACY_BUILD_PRESET_ID).spells,
          },
      status: crossesGeneratorBoundary
        ? snapshot.hero?.hp === 0
          ? 'dead'
          : 'playing'
        : snapshot.status,
      started: crossesGeneratorBoundary ? snapshot.hero?.hp === 0 : snapshot.started,
      commandSequence: 0,
      stats: createRunStats(),
      knowledge: createItemKnowledge(),
      items: migrateOwnedItemArtifacts(migrateOwnedItemAffixes(stripLegacyItemSanctity(snapshot.items))),
      equipment: normalizeEquipment(snapshot.equipment),
      inventory: [...snapshot.inventory],
      // Loot pool changes can attach an old collected ID to a different item.
      // Only persistent hero/gear progression crosses the generator boundary.
      floor: crossesGeneratorBoundary
        ? {
            revealed: [],
            defeated: [],
            collected: [],
            resolved: [],
            resolvedFindIds: [],
            detectedTrapIds: [],
            disarmedTrapIds: [],
            placedTraps: [],
            opened: [],
            triggered: [],
            monsters: [],
            passives: [],
            merchants: [...createMerchantStates({ merchants: dungeon.merchants, depth })],
          }
        : {
            revealed: [...snapshot.floor.revealed],
            defeated: [...snapshot.floor.defeated],
            collected: [...snapshot.floor.collected],
            resolved: [...snapshot.floor.resolved],
            resolvedFindIds: [],
            detectedTrapIds: [],
            disarmedTrapIds: [],
            placedTraps: [],
            opened: [],
            triggered: [],
            monsters: snapshot.floor.monsters.map((monster) => ({ ...monster })),
            passives: (snapshot.floor.passives ?? []).map((creature) => ({ ...creature })),
            merchants: [...createMerchantStates({ merchants: dungeon.merchants, depth })],
          },
    };
    migrated.floor.chests = [...createChestContainerStates({
      seed: dungeon.seed,
      depth,
      finds: dungeon.finds,
      lootAbundance,
          guaranteedArtifact: dungeon.artifactFloor === true,
    })];
    delete migrated.shards;
    // Every migrated run gets the camp fields v38 introduced: no pitched camp
    // on the floor and an empty stash in the run.
    // v40 adds the cooked-dish timer; a migrated hero simply has not eaten one.
    migrated.hero.meal = migrated.hero.meal ?? null;
    migrated.hero.coating = createCoatingState(migrated.hero.coating);
    migrated.floor.camp = migrated.floor.camp ?? null;
    migrated.camp = migrated.camp ?? { stash: createCampStash() };
    // v41 gives the hero a house to buy; a migrated run simply has no deed yet.
    migrated.house = createHouseState(migrated.house);
    // v42 remembers the floors the hero has left; a migrated run remembers none.
    migrated.floors = normalizedFloorArchive(migrated.floors, migrated.depth);
    // v43 lets the city keep a record; a migrated hero has none.
    migrated.crime = createCrimeState(migrated.crime);
    migrated.companions = createCompanionParty(migrated.companions ?? migrated.companion);
    if (!validateRun(migrated)) {
      throw new Error(`Cannot migrate invalid version ${snapshot.version} RPG save`);
    }
    return migrated;
  }
  const used = new Set();
  const items = [];
  const inventory = [];
  for (const [index, record] of (Array.isArray(snapshot.inventory) ? snapshot.inventory : []).entries()) {
    const definition = lootById(record?.id);
    if (!definition) continue;
    const uid = uniqueLegacyUid(record.uid, used, `legacy-item-${index}`);
    items.push({
      id: definition.id,
      uid,
      ...(record.stack ? { stack: record.stack } : {}),
      ...(definition.slot
        ? { affixIds: [], artifactPowerId: null, artifactCurseId: null }
        : {}),
    });
    inventory.push(uid);
  }
  const equipment = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null]));
  for (const slot of EQUIPMENT_SLOTS) {
    const variant = snapshot.equipment?.[slot];
    if (!Number.isInteger(variant)) continue;
    const definition = LOOT_CATALOG.find(
      (item) => item.variant === variant && allowedSlotsForItem(item).includes(slot),
    );
    if (!definition) continue;
    let uid = inventory.find((candidate) => items.find((item) => item.uid === candidate)?.id === definition.id);
    const mayRestoreAppearance = !slot.startsWith('ring') && slot !== 'amulet';
    if (!uid && mayRestoreAppearance) {
      uid = uniqueLegacyUid('', used, `migrated-${slot}-${definition.id}`);
      items.push({
        id: definition.id,
        uid,
        affixIds: [],
        artifactPowerId: null,
        artifactCurseId: null,
      });
    }
    if (!uid) continue;
    equipment[slot] = uid;
    const index = inventory.indexOf(uid);
    if (index >= 0) inventory.splice(index, 1);
  }
  const depth = Math.min(snapshot.depth, FINAL_DEPTH);
  const dungeon = generateDungeon({ seed: snapshot.seed, depth });
  const migrated = {
    ...snapshot,
    version: SAVE_VERSION,
    branch: snapshot.branch ?? DEFAULT_RUN_BRANCH,
    generatorVersion: GENERATOR_VERSION,
    contentVersion: CONTENT_VERSION,
    scalingVersion: SCALING_VERSION,
    difficulty: DEFAULT_DIFFICULTY,
    lootAbundance: DEFAULT_LOOT_ABUNDANCE,
    gold: migrateLegacyGold(snapshot),
    depth,
    hero: {
      ...snapshot.hero,
      x: dungeon.spawn.x,
      y: dungeon.spawn.y,
      hunger: HUNGER_MAX,
      effects: createActorEffects(snapshot.hero?.effects),
      skills: legacySkillState(snapshot.hero),
      skillStudy: createBookStudy(),
      intelligence: createStartingMagic().intelligence,
      spells: createStartingMagic().spells,
    },
    status: snapshot.hero?.hp === 0 ? 'dead' : 'playing',
    started: true,
    commandSequence: 0,
    stats: createRunStats(),
    knowledge: createItemKnowledge(),
    items,
    equipment,
    inventory,
    floor: {
      revealed: [],
      defeated: [],
      collected: [],
      resolved: [],
      resolvedFindIds: [],
      detectedTrapIds: [],
      disarmedTrapIds: [],
      placedTraps: [],
      opened: [],
      triggered: [],
      monsters: [],
      passives: [],
      merchants: [...createMerchantStates({ merchants: dungeon.merchants, depth })],
    },
  };
  migrated.floor.chests = [...createChestContainerStates({
    seed: dungeon.seed,
    depth,
    finds: dungeon.finds,
    lootAbundance: DEFAULT_LOOT_ABUNDANCE,
      guaranteedArtifact: dungeon.artifactFloor === true,
  })];
  delete migrated.shards;
  // Every migrated run gets the camp fields v38 introduced: no pitched camp
  // on the floor and an empty stash in the run.
  // v40 adds the cooked-dish timer; a migrated hero simply has not eaten one.
  migrated.hero.meal = migrated.hero.meal ?? null;
  migrated.hero.coating = createCoatingState(migrated.hero.coating);
  migrated.floor.camp = migrated.floor.camp ?? null;
  migrated.camp = migrated.camp ?? { stash: createCampStash() };
  // v41 gives the hero a house to buy; a migrated run simply has no deed yet.
  migrated.house = createHouseState(migrated.house);
  // v42 remembers the floors the hero has left; a migrated run remembers none.
  migrated.floors = normalizedFloorArchive(migrated.floors, migrated.depth);
  // v43 lets the city keep a record; a migrated hero has none.
  migrated.crime = createCrimeState(migrated.crime);
  // v44 lets a beast walk with the hero; a migrated run walks alone.
  migrated.companions = createCompanionParty(migrated.companions ?? migrated.companion);
  if (!validateRun(migrated)) throw new Error('Cannot migrate invalid version 1 RPG save');
  return migrated;
}

function isFiniteInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Every id the generator can hand a monster: the ordinary pool, the guardian,
 * the creatures seated by the water stream and the ones a chapter owns. The
 * water and chapter families were missing here, which quietly invalidated any
 * save standing on a floor that had one alive.
 */
const MONSTER_INSTANCE_ID_PATTERN = (depth) => (
  new RegExp(`^monster-${depth}-(?:\\d+|boss|water-\\d+|chapter-\\d+)$`)
);

/**
 * One floor's own state: ids that belong to its depth, actors inside the map,
 * nothing counted twice. The run keeps several of these now, so the check
 * takes the depth it belongs to instead of reading the hero's.
 */
function validateFloorShape(floor, depth) {
  if (
    !floor ||
    !['revealed', 'defeated', 'collected', 'resolved', 'resolvedFindIds', 'detectedTrapIds', 'disarmedTrapIds', 'placedTraps', 'opened', 'triggered', 'monsters', 'passives', 'merchants', 'chests'].every(
      (key) => Array.isArray(floor[key]),
    )
  )
    return false;
  if (!validateCampState(floor.camp)) return false;
  if (!validateChestContainerStates(floor.chests, { depth: depth })) return false;
  if (!validateMerchantStateShape(floor.merchants, depth)) return false;
  if (
    floor.revealed.length > MAP_WIDTH * MAP_HEIGHT ||
    floor.revealed.some((cell) => {
      if (!/^\d{1,2},\d{1,2}$/.test(cell)) return true;
      const [x, y] = cell.split(',').map(Number);
      return x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT;
    })
  )
    return false;
  for (const key of ['revealed', 'defeated', 'collected', 'resolved', 'resolvedFindIds', 'detectedTrapIds', 'disarmedTrapIds', 'opened', 'triggered']) {
    if (new Set(floor[key]).size !== floor[key].length) return false;
  }
  if (
    floor.defeated.some(
      (id) => !MONSTER_INSTANCE_ID_PATTERN(depth).test(id),
    )
  ) return false;
  if (floor.collected.some((id) => !new RegExp(`^loot-${depth}-\\d+$`).test(id))) return false;
  if (floor.resolved.some((id) => !new RegExp(`^event-${depth}-\\d+$`).test(id))) return false;
  if (
    floor.resolvedFindIds.length > MAX_FINDS_PER_FLOOR ||
    floor.resolvedFindIds.some(
      (id) => typeof id !== 'string' || !new RegExp(`^find-${depth}-\\d+$`).test(id),
    )
  ) return false;
  // Cheap autosave validation; hydrateDungeon resolves exact blade-trap IDs from
  // the generated floor, as it already does for other event/actor references.
  if (floor.detectedTrapIds.length > MAP_WIDTH * MAP_HEIGHT || floor.detectedTrapIds.some(
    (id) => typeof id !== 'string' || !new RegExp(`^event-${depth}-\\d+$`).test(id),
  )) return false;
  if (
    floor.disarmedTrapIds.length > floor.detectedTrapIds.length
    || floor.disarmedTrapIds.some((id) =>
      !floor.detectedTrapIds.includes(id) || !floor.resolved.includes(id))
  ) return false;
  if (!validatePlacedTraps(floor.placedTraps, { depth: depth })) return false;
  if (floor.opened.some((id) => !new RegExp(`^door-${depth}-\\d+$`).test(id))) return false;
  if (floor.triggered.some((id) => !new RegExp(`^surprise-${depth}-\\d+$`).test(id))) return false;
  if (floor.monsters.length > 24) return false;
  if (new Set(floor.monsters.map((monster) => monster?.instanceId)).size !== floor.monsters.length)
    return false;
  if (
    floor.monsters.some(
      (monster) =>
        !monster ||
        !MONSTER_INSTANCE_ID_PATTERN(depth).test(monster.instanceId) ||
        !Number.isFinite(monster.x) ||
        !Number.isFinite(monster.y) ||
        monster.x < 0 || monster.y < 0 || monster.x >= MAP_WIDTH || monster.y >= MAP_HEIGHT ||
        !Number.isFinite(monster.hp) || monster.hp <= 0 || monster.hp > 100000 ||
        !isFiniteInteger(monster.attackSequence ?? 0, 0, 1_000_000_000) ||
        !validateActorEffects(monster.effects),
    )
  ) return false;
  const passiveStates = floor.passives;
  if (passiveStates.length > 5) return false;
  if (new Set(passiveStates.map((creature) => creature?.instanceId)).size !== passiveStates.length)
    return false;
  if (
    passiveStates.some(
      (creature) =>
        !creature ||
        !new RegExp(`^passive-${depth}-\\d+$`).test(creature.instanceId) ||
        !Number.isFinite(creature.x) ||
        !Number.isFinite(creature.y) ||
        creature.x < 0 || creature.y < 0 || creature.x >= MAP_WIDTH || creature.y >= MAP_HEIGHT ||
        !isFiniteInteger(creature.wanderStep, 0, 1_000_000_000) ||
        ![-1, 1].includes(creature.facing) ||
        typeof creature.hunted !== 'boolean' ||
        typeof creature.defeated !== 'boolean' ||
        !Number.isFinite(creature.hp) || creature.hp < 0 || creature.hp > 100000 ||
        (creature.defeated !== (creature.hp === 0)) ||
        (!creature.hunted && creature.defeated) ||
        !isFiniteInteger(creature.attackSequence, 0, 1_000_000_000),
    )
  ) return false;
  return true;
}

export function validateRun(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || snapshot.version !== SAVE_VERSION) return false;
  if (
    snapshot.generatorVersion !== GENERATOR_VERSION ||
    snapshot.contentVersion !== CONTENT_VERSION ||
    !scalingVersionSupported(snapshot.scalingVersion) ||
    !Number.isFinite(snapshot.difficulty) ||
    snapshot.difficulty < MIN_DIFFICULTY ||
    snapshot.difficulty > MAX_DIFFICULTY ||
    !validateLootAbundance(snapshot.lootAbundance)
  ) return false;
  if (
    !isFiniteInteger(snapshot.seed, 0, 0xffffffff) ||
    !validateRunBranch(snapshot.branch)
    || !isFiniteInteger(snapshot.depth, CITY_DEPTH, FINAL_DEPTH)
  )
    return false;
  const hero = snapshot.hero;
  if (
    !hero ||
    !isFiniteInteger(hero.x, 0, MAP_WIDTH - 1) ||
    !isFiniteInteger(hero.y, 0, MAP_HEIGHT - 1)
  )
    return false;
  if (
    !Number.isFinite(hero.hp) ||
    !Number.isFinite(hero.maxHp) ||
    hero.hp < 0 ||
    hero.maxHp < 1
  )
    return false;
  if (!isFiniteInteger(hero.level, 1, 999) || !Number.isFinite(hero.xp) || hero.xp < 0)
    return false;
  if (!isFiniteInteger(hero.power, 1, 9999)) return false;
  if (!isFiniteInteger(hero.intelligence, 0, 999)) return false;
  if (!validateHunger(hero.hunger)) return false;
  if (!validateActorEffects(hero.effects)) return false;
  if (!validateMealState(hero.meal)) return false;
  if (!validateCoatingState(hero.coating ?? null)) return false;
  if (!validateSkillState(hero.skills, hero.level)) return false;
  if (!validateBookStudy(hero.skillStudy)) return false;
  if (!validateSpellState(hero.spells)) return false;
  if (!isFiniteInteger(snapshot.gold, 0, Number.MAX_SAFE_INTEGER)) return false;
  if (!['playing', 'dead', 'victory'].includes(snapshot.status)) return false;
  if (typeof snapshot.started !== 'boolean') return false;
  if (!isFiniteInteger(snapshot.commandSequence, 0, 1_000_000_000)) return false;
  if (!validateRunStats(snapshot.stats)) return false;
  if (!validateItemKnowledge(snapshot.knowledge, IDENTIFIABLE_ITEM_IDS)) return false;
  if ((snapshot.status === 'dead') !== (hero.hp === 0)) return false;
  if (!snapshot.equipment || typeof snapshot.equipment !== 'object') return false;
  if (!Array.isArray(snapshot.items) || snapshot.items.length > EQUIPMENT_SLOTS.length + 12) {
    return false;
  }
  if (
    snapshot.items.some(
      (item) =>
        !item ||
        !lootById(item.id) ||
        typeof item.uid !== 'string' ||
        item.uid.length < 1 ||
        item.uid.length > 80 ||
        !validateItemAffixIds(
          lootById(item.id),
          item.affixIds,
          { required: Boolean(lootById(item.id)?.slot) },
        ) ||
        !validateProceduralArtifactState(lootById(item.id), item) ||
        !validateReforgeState(lootById(item.id), item) ||
        !validateItemMaterial(lootById(item.id), item) ||
        (item.stack !== undefined && !isFiniteInteger(item.stack, 1, 999)),
    )
  ) return false;
  const itemIds = snapshot.items.map((item) => item.uid);
  if (new Set(itemIds).size !== itemIds.length) return false;
  const itemByUid = new Map(snapshot.items.map((item) => [item.uid, item]));
  if (!Array.isArray(snapshot.inventory) || snapshot.inventory.length > 12) return false;
  if (snapshot.inventory.some((uid) => typeof uid !== 'string' || !itemByUid.has(uid))) return false;
  if (new Set(snapshot.inventory).size !== snapshot.inventory.length) return false;
  const equippedUids = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const uid = snapshot.equipment[slot];
    if (uid === null) continue;
    if (typeof uid !== 'string' || !itemByUid.has(uid)) return false;
    const definition = lootById(itemByUid.get(uid).id);
    if (!allowedSlotsForItem(definition).includes(slot)) return false;
    equippedUids.push(uid);
  }
  const mainHandRecord = itemByUid.get(snapshot.equipment.hand1);
  if (
    snapshot.equipment.hand2 !== null &&
    isTwoHandedItem(lootById(mainHandRecord?.id))
  ) return false;
  if (new Set(equippedUids).size !== equippedUids.length) return false;
  const owned = [...snapshot.inventory, ...equippedUids];
  if (new Set(owned).size !== owned.length || owned.length !== snapshot.items.length) return false;
  const items = snapshot.items.map((record) => materializeProceduralArtifact(
    materializeItemAffixes(lootById(record.id), record),
    record,
  ));
  if (hero.hp > deriveHeroStats(hero, snapshot.equipment, items).maxHp) return false;
  const floor = snapshot.floor;
  if (!validateCampRunState(snapshot.camp)) return false;
  if (!validateHouseState(snapshot.house)) return false;
  if (!validateCrimeState(snapshot.crime)) return false;
  if (!validateCompanionParty(snapshot.companions ?? [])) return false;
  if (!validateFloorShape(floor, snapshot.depth)) return false;
  // Floors the hero has left keep their own state, each checked against its
  // own depth. The floor underfoot is never in the archive as well.
  if (!snapshot.floors || typeof snapshot.floors !== 'object' || Array.isArray(snapshot.floors)) {
    return false;
  }
  const archivedDepths = Object.keys(snapshot.floors);
  if (archivedDepths.length > FINAL_DEPTH + 1) return false;
  for (const key of archivedDepths) {
    const archivedDepth = Number(key);
    if (!isFiniteInteger(archivedDepth, CITY_DEPTH, FINAL_DEPTH)) return false;
    if (archivedDepth === snapshot.depth) return false;
    if (!validateFloorShape(snapshot.floors[key], archivedDepth)) return false;
  }
  const everyFloor = [floor, ...archivedDepths.map((key) => snapshot.floors[key])];
  const storedItemRecords = [
    ...snapshot.camp.stash.items,
    ...everyFloor.flatMap(({ chests }) => chests.flatMap((container) => container.items)),
    ...everyFloor.flatMap(({ merchants }) => merchants.flatMap(
      ({ buyback }) => buyback.map(({ record }) => record),
    )),
  ];
  const storedItemUids = storedItemRecords.map(({ uid }) => uid);
  if (
    new Set(storedItemUids).size !== storedItemUids.length
    || storedItemUids.some((uid) => itemByUid.has(uid))
    || storedItemRecords.some((item) => (
      !item
      || !lootById(item.id)
      || typeof item.uid !== 'string'
      || item.uid.length < 1
      || item.uid.length > 80
      || !validateItemAffixIds(
        lootById(item.id),
        item.affixIds,
        { required: Boolean(lootById(item.id)?.slot) },
      )
      || !validateProceduralArtifactState(lootById(item.id), item)
      || !validateReforgeState(lootById(item.id), item)
      || !validateItemMaterial(lootById(item.id), item)
      || (item.stack !== undefined && !isFiniteInteger(item.stack, 1, 999))
    ))
  ) return false;
  if (
    snapshot.status === 'victory' &&
    (
      snapshot.depth !== FINAL_DEPTH ||
      !floor.defeated.includes(`monster-${FINAL_DEPTH}-boss`)
    )
  ) return false;
  return true;
}

export function hydrateDungeon(snapshot) {
  if (!validateRun(snapshot)) throw new Error('Invalid RPG save snapshot');
  const dungeon = generateDungeon({
    seed: snapshot.seed,
    depth: snapshot.depth,
    branch: snapshot.branch ?? DEFAULT_RUN_BRANCH,
    scalingVersion: snapshot.scalingVersion,
    difficulty: snapshot.difficulty,
    lootAbundance: snapshot.lootAbundance,
  });
  const opened = new Set(snapshot.floor.opened);
  const triggered = new Set(snapshot.floor.triggered);
  const doorIds = new Set(dungeon.doors.map((door) => door.instanceId));
  const surpriseIds = new Set(dungeon.surprises.map((surprise) => surprise.id));
  if ([...opened].some((id) => !doorIds.has(id))) throw new Error('Unknown opened door');
  if ([...triggered].some((id) => !surpriseIds.has(id))) throw new Error('Unknown door surprise');
  const grid = dungeon.grid.map((row) => [...row]);
  for (const door of dungeon.doors) {
    if (opened.has(door.instanceId)) grid[door.y][door.x] = '.';
  }
  if (!isWalkableCell(grid, snapshot.hero.x, snapshot.hero.y)) {
    throw new Error('Saved hero position is blocked');
  }
  const defeated = new Set(snapshot.floor.defeated);
  const collected = new Set(snapshot.floor.collected);
  const resolved = new Set(snapshot.floor.resolved);
  const resolvedFindIds = new Set(snapshot.floor.resolvedFindIds);
  const monsterIds = new Set(dungeon.monsters.map((monster) => monster.instanceId));
  const lootIds = new Set(dungeon.loot.map((item) => item.instanceId));
  const eventIds = new Set(dungeon.events.map((event) => event.instanceId));
  const findIds = new Set(dungeon.finds.map((find) => find.instanceId));
  const chestFindIds = dungeon.finds
    .filter(({ id }) => id === 'sealed-cache')
    .map(({ instanceId }) => instanceId);
  if (!validateChestContainerStates(snapshot.floor.chests, {
    depth: snapshot.depth,
    findIds: chestFindIds,
  })) throw new Error('Unknown chest container');
  if (!validateMerchantStates(snapshot.floor.merchants, dungeon.merchants, snapshot.depth)) {
    throw new Error('Unknown merchant state');
  }
  const traps = trapsFromDungeon(dungeon);
  if (!validateDetectedTrapIds(snapshot.floor.detectedTrapIds, traps)) {
    throw new Error('Unknown detected trap');
  }
  if (!validateDisarmedTrapIds(
    snapshot.floor.disarmedTrapIds,
    traps,
    snapshot.floor.detectedTrapIds,
    snapshot.floor.resolved,
  )) throw new Error('Unknown disarmed trap');
  const passiveIds = new Set(dungeon.passiveCreatures.map((creature) => creature.instanceId));
  if ([...defeated].some((id) => !monsterIds.has(id))) throw new Error('Unknown defeated monster');
  if ([...collected].some((id) => !lootIds.has(id))) throw new Error('Unknown collected loot');
  if ([...resolved].some((id) => !eventIds.has(id))) throw new Error('Unknown resolved event');
  if ([...resolvedFindIds].some((id) => !findIds.has(id))) throw new Error('Unknown resolved find');
  const placedTrapReservedCells = [
    dungeon.exit,
    dungeon.sanctuary,
    ...dungeon.doors,
    ...dungeon.loot.filter((item) => !collected.has(item.instanceId)),
    ...dungeon.events.filter((event) => !resolved.has(event.instanceId)),
    ...dungeon.finds.filter((find) => !resolvedFindIds.has(find.instanceId)),
    ...dungeon.merchants,
  ].filter(Boolean).map(({ x, y }) => `${x},${y}`);
  if (!validatePlacedTraps(snapshot.floor.placedTraps, {
    depth: snapshot.depth,
    grid: dungeon.grid,
    reservedCells: placedTrapReservedCells,
  })) throw new Error('Invalid placed player trap');
  const savedMonsters = new Map(snapshot.floor.monsters.map((monster) => [monster.instanceId, monster]));
  for (const state of savedMonsters.values()) {
    if (!monsterIds.has(state.instanceId) || defeated.has(state.instanceId)) {
      throw new Error('Unknown saved monster state');
    }
    // NPC saves store center-offset coordinates (runtime / TILE - 0.5),
    // unlike the hero's integer cell. Validate the cell the hydrated center
    // actually occupies, not the previous cell when an actor is mid-step.
    if (!isWalkableCell(grid, Math.floor(state.x + 0.5), Math.floor(state.y + 0.5))) {
      throw new Error('Saved monster position is blocked');
    }
  }
  const savedPassives = new Map(
    (snapshot.floor.passives ?? []).map((creature) => [creature.instanceId, creature]),
  );
  for (const state of savedPassives.values()) {
    if (!passiveIds.has(state.instanceId)) throw new Error('Unknown saved passive creature state');
    if (!isWalkableCell(grid, Math.floor(state.x + 0.5), Math.floor(state.y + 0.5))) {
      throw new Error('Saved passive creature position is blocked');
    }
  }
  return {
    ...dungeon,
    grid,
    // An open door is still an interactive world object. The grid and opened
    // IDs own passability; triggered IDs independently own one-time surprises.
    doors: dungeon.doors,
    surprises: dungeon.surprises.map((surprise) => ({
      ...surprise,
      triggered: triggered.has(surprise.id),
    })),
    monsters: dungeon.monsters
      .filter((monster) => !defeated.has(monster.instanceId))
      .map((monster) => ({ ...monster, ...(savedMonsters.has(monster.instanceId) ? { state: savedMonsters.get(monster.instanceId) } : {}) })),
    passiveCreatures: dungeon.passiveCreatures.map((creature) => ({
      ...creature,
      ...(savedPassives.has(creature.instanceId)
        ? { state: savedPassives.get(creature.instanceId) }
        : {}),
    })),
    loot: dungeon.loot.filter((item) => !collected.has(item.instanceId)),
    events: dungeon.events.filter((event) => !resolved.has(event.instanceId)),
    finds: dungeon.finds.map((find) => ({
      ...find,
      resolved: resolvedFindIds.has(find.instanceId),
    })),
  };
}

/**
 * Travel that is not a descent: the homing stone down to the city, the door
 * back up to where the hero stood. The floor is built fresh either way, so a
 * trip home is a real decision and never a free pause.
 */
export function travelRunToDepth(snapshot, depth, arrival = null) {
  if (!validateRun(snapshot)) throw new Error('Invalid RPG save snapshot');
  if (snapshot.status !== 'playing') throw new Error('Cannot travel after the run has ended');
  if (!Number.isInteger(depth) || depth < CITY_DEPTH || depth > FINAL_DEPTH) {
    throw new Error('Travel needs a depth inside the dungeon');
  }
  if (depth === snapshot.depth) return snapshot;
  return moveRunToFloor(snapshot, depth, arrival);
}

/**
 * Moving between floors, in either direction. The floor the hero leaves goes
 * into the archive exactly as it was, and the floor they arrive on comes back
 * out of it if they have been there before. A floor the run never saw is built
 * fresh. Nothing regenerates behind the hero's back.
 */
function moveRunToFloor(snapshot, depth, arrival = null) {
  const dungeon = generateDungeon({
    seed: snapshot.seed,
    depth,
    branch: snapshot.branch ?? DEFAULT_RUN_BRANCH,
    scalingVersion: snapshot.scalingVersion,
    difficulty: snapshot.difficulty,
    lootAbundance: snapshot.lootAbundance,
  });
  const floors = { ...snapshot.floors };
  floors[String(snapshot.depth)] = snapshot.floor;
  const remembered = floors[String(depth)] ?? null;
  delete floors[String(depth)];
  const landing = arrival && isWalkableCell(dungeon.grid, arrival.x, arrival.y)
    ? { x: arrival.x, y: arrival.y }
    : { x: dungeon.spawn.x, y: dungeon.spawn.y };
  return {
    ...snapshot,
    depth,
    knowledge: createItemKnowledge(snapshot.knowledge),
    hero: {
      ...snapshot.hero,
      x: landing.x,
      y: landing.y,
      skills: cloneSkillState(snapshot.hero.skills),
      skillStudy: createBookStudy(snapshot.hero.skillStudy),
      spells: createSpellState(snapshot.hero.spells),
    },
    equipment: { ...snapshot.equipment },
    items: snapshot.items.map((item) => ({ ...item })),
    inventory: [...snapshot.inventory],
    // The pitched camp belongs to the floor; the stash inside it belongs to the run.
    camp: { stash: { ...snapshot.camp.stash, items: snapshot.camp.stash.items.map((item) => ({ ...item })) } },
    // The deed, the furniture and the way home all belong to the run.
    house: createHouseState(snapshot.house),
    // The city's memory is the run's, not the floor's.
    crime: createCrimeState(snapshot.crime),
    companions: createCompanionParty(snapshot.companions),
    floor: remembered ?? createEmptyFloorState(dungeon),
    floors,
    commandSequence: snapshot.commandSequence,
  };
}

/**
 * The fork at the gate. The city is the only place a run can change its mind
 * about which way it is going, and changing it forgets every floor the run has
 * archived: those floors belong to the other road, and the dungeon has moved on
 * anyway — the same rule the Return Stone already lives by.
 */
export function switchRunBranch(snapshot, branch) {
  if (!validateRun(snapshot)) throw new Error('Invalid RPG save snapshot');
  if (!validateRunBranch(branch)) throw new Error('Unknown run branch');
  if (!isCityDepth(snapshot.depth)) throw new Error('A run only turns around in the city');
  if (snapshot.status !== 'playing') throw new Error('Cannot turn around after the run has ended');
  if (snapshot.branch === branch) return snapshot;
  return { ...snapshot, branch, floors: {} };
}

export function advanceRunFloor(snapshot) {
  if (!validateRun(snapshot)) throw new Error('Invalid RPG save snapshot');
  if (snapshot.status !== 'playing') throw new Error('Cannot descend after the run has ended');
  if (snapshot.depth >= FINAL_DEPTH) throw new Error('Final dungeon floor reached');
  const depth = snapshot.depth + 1;
  const dungeon = generateDungeon({
    seed: snapshot.seed,
    depth,
    branch: snapshot.branch ?? DEFAULT_RUN_BRANCH,
    scalingVersion: snapshot.scalingVersion,
    difficulty: snapshot.difficulty,
    lootAbundance: snapshot.lootAbundance,
  });
  return moveRunToFloor(snapshot, depth, dungeon.spawn);
}

/**
 * Climbing back. The hero comes up onto the stair they went down by, and the
 * floor is the one they left: the same open doors, the same emptied chests.
 */
export function retreatRunFloor(snapshot) {
  if (!validateRun(snapshot)) throw new Error('Invalid RPG save snapshot');
  if (snapshot.status !== 'playing') throw new Error('Cannot climb after the run has ended');
  if (snapshot.depth <= CITY_DEPTH) throw new Error('There is nothing above the city');
  const depth = snapshot.depth - 1;
  const dungeon = generateDungeon({
    seed: snapshot.seed,
    depth,
    branch: snapshot.branch ?? DEFAULT_RUN_BRANCH,
    scalingVersion: snapshot.scalingVersion,
    difficulty: snapshot.difficulty,
    lootAbundance: snapshot.lootAbundance,
  });
  return moveRunToFloor(snapshot, depth, dungeon.exit);
}

export function assertCatalogReferences() {
  for (const monster of MONSTER_CATALOG)
    if (!monsterById(monster.id)) throw new Error(`Missing monster ${monster.id}`);
  for (const item of LOOT_CATALOG)
    if (!lootById(item.id)) throw new Error(`Missing loot ${item.id}`);
  for (const event of EVENT_CATALOG)
    if (!eventById(event.id)) throw new Error(`Missing event ${event.id}`);
  for (const creature of PASSIVE_CREATURE_CATALOG)
    if (!passiveCreatureById(creature.id)) throw new Error(`Missing passive creature ${creature.id}`);
  return true;
}
