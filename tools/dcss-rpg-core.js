import {
  EVENT_CATALOG,
  LOOT_CATALOG,
  MONSTER_CATALOG,
  eventById,
  lootById,
  monsterById,
} from './dcss-rpg-content.js';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'little-islands:dcss-rpg:v1';
export const MAP_WIDTH = 36;
export const MAP_HEIGHT = 26;

const DIRECTIONS = Object.freeze([
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]);

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

export function isWalkableCell(grid, x, y) {
  return y >= 0 && y < grid.length && x >= 0 && x < grid[0].length && grid[y][x] === '.';
}

export function findGridPath(grid, start, end) {
  if (!isWalkableCell(grid, start.x, start.y) || !isWalkableCell(grid, end.x, end.y)) return [];
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
      if (!isWalkableCell(grid, x, y) || previous.has(cellKey)) continue;
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

export function revealAround(revealed, grid, center, radius = 4) {
  let changed = false;
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) continue;
      if (Math.hypot(x - center.x, y - center.y) > radius + 0.35) continue;
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

export function generateDungeon({ seed, depth = 1, width = MAP_WIDTH, height = MAP_HEIGHT }) {
  if (!Number.isInteger(seed) || seed < 0) throw new Error('Dungeon seed must be a uint32 integer');
  if (!Number.isInteger(depth) || depth < 1)
    throw new Error('Dungeon depth must be a positive integer');
  if (width < 24 || height < 18) throw new Error('Dungeon dimensions are too small');
  const floorSeed = mixSeed(seed, depth);
  const rng = createRng(floorSeed);
  const grid = Array.from({ length: height }, () => Array(width).fill('#'));
  const rooms = [];
  const desiredRooms = Math.min(15, 9 + Math.floor(depth / 2));
  for (let attempt = 0; attempt < 260 && rooms.length < desiredRooms; attempt += 1) {
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
  for (let loop = 0; loop < Math.min(3, rooms.length - 2); loop += 1) {
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
  const occupied = new Set([`${spawn.x},${spawn.y}`, `${exit.x},${exit.y}`]);

  const eventRooms = shuffle(rng, rooms.slice(1, -1)).slice(0, Math.min(4, 3 + (depth % 2)));
  const events = eventRooms.map((room, index) => {
    const position = roomCenter(room);
    occupied.add(`${position.x},${position.y}`);
    const definition = weightedPick(rng, EVENT_CATALOG);
    return { instanceId: `event-${depth}-${index}`, id: definition.id, ...position };
  });

  const maxTier = Math.min(9, 1 + Math.floor((depth - 1) * 0.72));
  const monsterPool = MONSTER_CATALOG.filter((monster) => monster.tier <= maxTier);
  const monsterCells = pickSpawnCells(rng, grid, spawn, Math.min(24, 6 + depth * 2), occupied);
  const monsters = monsterCells.map((position, index) => {
    const definition = weightedPick(rng, monsterPool, (monster) => 12 / monster.tier);
    return { instanceId: `monster-${depth}-${index}`, id: definition.id, ...position };
  });

  const lootPool = LOOT_CATALOG.filter((item) => item.minDepth <= depth);
  const lootCells = pickSpawnCells(
    rng,
    grid,
    spawn,
    Math.min(9, 4 + Math.floor(depth / 2)),
    occupied,
  );
  const loot = lootCells.map((position, index) => {
    const definition = weightedPick(rng, lootPool);
    return { instanceId: `loot-${depth}-${index}`, id: definition.id, ...position };
  });

  const route = findGridPath(grid, spawn, exit);
  if (route.length === 0) throw new Error('Generated dungeon has no route to the exit');
  return {
    seed: floorSeed,
    depth,
    width,
    height,
    grid,
    rooms,
    spawn,
    exit,
    events,
    monsters,
    loot,
  };
}

export function createRun(seed, dungeon = generateDungeon({ seed, depth: 1 })) {
  return {
    version: SAVE_VERSION,
    seed: seed >>> 0,
    depth: dungeon.depth,
    hero: {
      x: dungeon.spawn.x,
      y: dungeon.spawn.y,
      hp: 100,
      maxHp: 100,
      level: 1,
      xp: 0,
      power: 1,
    },
    shards: 0,
    equipment: { body: 0, head: 0, hand1: 0, hand2: 0, boots: 0, ring1: 0, ring2: 0, amulet: 0 },
    inventory: [
      { id: 'healing-potion', uid: 'starter-potion', stack: 2 },
      { id: 'bread', uid: 'starter-bread', stack: 3 },
    ],
    floor: { revealed: [], defeated: [], collected: [], resolved: [] },
  };
}

function isFiniteInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function validateRun(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || snapshot.version !== SAVE_VERSION) return false;
  if (!isFiniteInteger(snapshot.seed, 0, 0xffffffff) || !isFiniteInteger(snapshot.depth, 1, 9999))
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
    hero.maxHp < 1 ||
    hero.hp > hero.maxHp
  )
    return false;
  if (!isFiniteInteger(hero.level, 1, 999) || !Number.isFinite(hero.xp) || hero.xp < 0)
    return false;
  if (!isFiniteInteger(hero.power, 1, 9999)) return false;
  if (!isFiniteInteger(snapshot.shards, 0, Number.MAX_SAFE_INTEGER)) return false;
  if (!snapshot.equipment || typeof snapshot.equipment !== 'object') return false;
  const slots = ['body', 'head', 'hand1', 'hand2', 'boots', 'ring1', 'ring2', 'amulet'];
  if (slots.some((slot) => !isFiniteInteger(snapshot.equipment[slot], 0, 31))) return false;
  if (!Array.isArray(snapshot.inventory) || snapshot.inventory.length > 12) return false;
  if (
    snapshot.inventory.some(
      (item) =>
        !item ||
        !lootById(item.id) ||
        typeof item.uid !== 'string' ||
        item.uid.length < 1 ||
        item.uid.length > 80 ||
        (item.stack !== undefined && !isFiniteInteger(item.stack, 1, 999)),
    )
  )
    return false;
  const floor = snapshot.floor;
  if (
    !floor ||
    !['revealed', 'defeated', 'collected', 'resolved'].every((key) => Array.isArray(floor[key]))
  )
    return false;
  if (
    floor.revealed.length > MAP_WIDTH * MAP_HEIGHT ||
    floor.revealed.some((cell) => !/^\d{1,2},\d{1,2}$/.test(cell))
  )
    return false;
  if (floor.defeated.some((id) => !/^monster-\d+-\d+$/.test(id))) return false;
  if (floor.collected.some((id) => !/^loot-\d+-\d+$/.test(id))) return false;
  if (floor.resolved.some((id) => !/^event-\d+-\d+$/.test(id))) return false;
  return true;
}

export function hydrateDungeon(snapshot) {
  if (!validateRun(snapshot)) throw new Error('Invalid RPG save snapshot');
  const dungeon = generateDungeon({ seed: snapshot.seed, depth: snapshot.depth });
  const defeated = new Set(snapshot.floor.defeated);
  const collected = new Set(snapshot.floor.collected);
  const resolved = new Set(snapshot.floor.resolved);
  return {
    ...dungeon,
    monsters: dungeon.monsters.filter((monster) => !defeated.has(monster.instanceId)),
    loot: dungeon.loot.filter((item) => !collected.has(item.instanceId)),
    events: dungeon.events.filter((event) => !resolved.has(event.instanceId)),
  };
}

export function advanceRunFloor(snapshot) {
  if (!validateRun(snapshot)) throw new Error('Invalid RPG save snapshot');
  if (snapshot.depth >= 9999) throw new Error('Maximum dungeon depth reached');

  const depth = snapshot.depth + 1;
  const dungeon = generateDungeon({ seed: snapshot.seed, depth });
  return {
    ...snapshot,
    depth,
    hero: {
      ...snapshot.hero,
      x: dungeon.spawn.x,
      y: dungeon.spawn.y,
      hp: Math.min(snapshot.hero.maxHp, snapshot.hero.hp + Math.ceil(snapshot.hero.maxHp * 0.18)),
    },
    equipment: { ...snapshot.equipment },
    inventory: snapshot.inventory.map((item) => ({ ...item })),
    floor: { revealed: [], defeated: [], collected: [], resolved: [] },
  };
}

export function assertCatalogReferences() {
  for (const monster of MONSTER_CATALOG)
    if (!monsterById(monster.id)) throw new Error(`Missing monster ${monster.id}`);
  for (const item of LOOT_CATALOG)
    if (!lootById(item.id)) throw new Error(`Missing loot ${item.id}`);
  for (const event of EVENT_CATALOG)
    if (!eventById(event.id)) throw new Error(`Missing event ${event.id}`);
  return true;
}
