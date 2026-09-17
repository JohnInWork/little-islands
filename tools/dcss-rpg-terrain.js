/**
 * Terrain: shallow water is the only liquid in the dungeon. Every actor can
 * wade through it, everyone in it is wet and slow and hits softer, and a pool
 * of connected water conducts lightning to everyone standing in it, the hero
 * included. This module holds the rules and the generation helper; `dcss.js`
 * only reads booleans from it.
 */

export const WATER_CELL = '~';
export const WATER_ROOM_CHANCE = 0.3;
export const WATER_WET_DURATION = 4;
export const WATER_WET_REFRESH_BELOW = 3.5;
export const WATER_FIRE_MULTIPLIER = 0.5;
export const WATER_CONDUCTION_PERCENT = 60;

/** Default land/water speed profile; catalog entries may override `terrain`. */
export const DEFAULT_TERRAIN_PROFILE = Object.freeze({ water: 0.75, land: 1 });
export const WATER_MELEE_MULTIPLIER = 0.85;

export function isWaterCell(grid, x, y) {
  return grid?.[y]?.[x] === WATER_CELL;
}

export function actorCell(actor, tileSize) {
  return { x: Math.floor(actor.x / tileSize), y: Math.floor(actor.y / tileSize) };
}

export function actorInWater(grid, actor, tileSize) {
  const cell = actorCell(actor, tileSize);
  return isWaterCell(grid, cell.x, cell.y);
}

/** Speed factor for an actor on its current cell; `terrain.land === 0` means water-bound. */
export function terrainSpeedMultiplier({ inWater, terrain = null } = {}) {
  const profile = terrain && Number.isFinite(terrain.water) && Number.isFinite(terrain.land)
    ? terrain
    : DEFAULT_TERRAIN_PROFILE;
  return inWater ? profile.water : profile.land;
}

export function terrainMeleeMultiplier({ inWater, terrain = null } = {}) {
  if (!inWater) return 1;
  // Creatures built for water (their water speed is not a penalty) swing at full strength.
  if (terrain && Number.isFinite(terrain.water) && terrain.water >= 1) return 1;
  return WATER_MELEE_MULTIPLIER;
}

/** Whether a creature with this profile may stand on the cell. */
export function terrainAllowsCell(grid, x, y, terrain = null) {
  const water = isWaterCell(grid, x, y);
  if (terrain && terrain.land === 0) return water;
  return true;
}

/** Connected water cells (4-neighbour) reachable from `cell`, as "x,y" keys. */
export function waterPoolCells(grid, cell) {
  const pool = new Set();
  if (!isWaterCell(grid, cell?.x, cell?.y)) return pool;
  const queue = [cell];
  pool.add(`${cell.x},${cell.y}`);
  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${x + dx},${y + dy}`;
      if (pool.has(key) || !isWaterCell(grid, x + dx, y + dy)) continue;
      pool.add(key);
      queue.push({ x: x + dx, y: y + dy });
    }
  }
  return pool;
}

/**
 * Everyone standing in the same pool as `origin` (except `exclude`), in a
 * stable order so the runtime and the tests agree on who gets shocked.
 */
export function selectWaterConductionTargets({ grid, origin, actors = [], tileSize, exclude = [] } = {}) {
  const pool = waterPoolCells(grid, actorCell(origin, tileSize));
  if (pool.size === 0) return [];
  const skipped = new Set(exclude);
  skipped.add(origin);
  return actors
    .filter((actor) => actor && !skipped.has(actor) && !(actor.dead > 0))
    .filter((actor) => {
      const cell = actorCell(actor, tileSize);
      return pool.has(`${cell.x},${cell.y}`);
    })
    .sort((a, b) => String(a.instanceId ?? '').localeCompare(String(b.instanceId ?? '')));
}

function roomInteriorCells(grid, room) {
  const cells = [];
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      if (grid[y]?.[x] === '.') cells.push({ x, y });
    }
  }
  return cells;
}

/** Room cells that open onto a corridor or door; they and their neighbours stay dry. */
export function roomOpeningCells(grid, room) {
  const openings = [];
  const inside = (x, y) => x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height;
  for (const cell of roomInteriorCells(grid, room)) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      if (inside(nx, ny)) continue;
      const outside = grid[ny]?.[nx];
      if (outside === '.' || outside === 'D') {
        openings.push(cell);
        break;
      }
    }
  }
  return openings;
}

/**
 * Floods a room in place: interior floor becomes water except a dry apron
 * around every opening, a dry ring around `keepCells` and a few random
 * islands. Returns the water cells written.
 */
export function floodRoom(grid, room, { rng, keepCells = [], islands = 2 } = {}) {
  const dry = new Set();
  const protect = (x, y, radius) => {
    for (let py = y - radius; py <= y + radius; py += 1) {
      for (let px = x - radius; px <= x + radius; px += 1) dry.add(`${px},${py}`);
    }
  };
  for (const cell of roomOpeningCells(grid, room)) protect(cell.x, cell.y, 1);
  for (const cell of keepCells) protect(cell.x, cell.y, 1);
  const candidates = roomInteriorCells(grid, room).filter(({ x, y }) => !dry.has(`${x},${y}`));
  const islandCount = Math.min(islands, Math.floor(candidates.length / 6));
  for (let index = 0; index < islandCount; index += 1) {
    const pick = candidates[rng.int(0, candidates.length - 1)];
    if (pick) dry.add(`${pick.x},${pick.y}`);
  }
  const water = [];
  for (const cell of candidates) {
    if (dry.has(`${cell.x},${cell.y}`)) continue;
    grid[cell.y][cell.x] = WATER_CELL;
    water.push(cell);
  }
  return water;
}

/** Picks the flooded room for a floor, or null: rare, never a room from `excluded`. */
export function chooseFloodedRoom({ rng, rooms = [], excluded = new Set(), chance = WATER_ROOM_CHANCE } = {}) {
  if (rooms.length < 4 || rng.next() >= chance) return null;
  const candidates = rooms
    .map((room, index) => ({ room, index }))
    .filter(({ room, index }) => !excluded.has(index) && room.width >= 5 && room.height >= 4);
  if (candidates.length === 0) return null;
  return candidates[rng.int(0, candidates.length - 1)].index;
}
