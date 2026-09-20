/**
 * Holes in the floor, and the reason the flight spell exists.
 *
 * Ivan: «полёту нечего перелетать. Есть заклинание полёта, но нет ям и
 * пропастей, ради которых оно нужно. Нужна локация с другой генерацией:
 * огромные ямы, провалы, куски пола, между которыми надо перелетать».
 *
 * A chasm is a cell you cannot stand on and can fly over. That is the whole
 * mechanic, and everything else here exists to keep it from becoming a wall
 * with extra steps:
 *
 * - **A floor is never cut in two.** Whatever a chasm does to a room, the
 *   stairs down stay reachable on foot. Flight is a shortcut and a key to
 *   places worth going, never the difference between playing and not playing:
 *   a hero who never learned it must still be able to finish the floor.
 * - **Something is on the far side.** A hole that only makes the walk longer
 *   teaches nothing. Each chasm room keeps one island — floor with no land
 *   route at all — and that is where the floor puts something worth the trip.
 * - **The edge is visible before it is fatal.** Walking into a chasm is
 *   refused the way walking into a wall is; nobody falls in by accident,
 *   because a roguelike that kills you for a misread tile is not being hard,
 *   it is being unreadable.
 */

/** The cell. One character, like water's `~`, so grids stay plain strings. */
export const CHASM_CELL = ':';

/** Rooms smaller than this have no room for a hole worth flying over. */
export const CHASM_MIN_ROOM = Object.freeze({ width: 6, height: 5 });

/** How often a floor deep enough gets one, and from which depth they start. */
export const CHASM_ROOM_CHANCE = 0.34;
export const CHASM_MIN_DEPTH = 4;

export function isChasmCell(grid, x, y) {
  return grid?.[y]?.[x] === CHASM_CELL;
}

/** Can this cell be stood on? A chasm takes flight; everything else does not. */
export function chasmAllowsCell(grid, x, y, { flying = false } = {}) {
  return flying || !isChasmCell(grid, x, y);
}

function interiorCells(room) {
  const cells = [];
  for (let y = room.y + 1; y < room.y + room.height - 1; y += 1) {
    for (let x = room.x + 1; x < room.x + room.width - 1; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}

function openingCells(grid, room) {
  const cells = [];
  const right = room.x + room.width - 1;
  const bottom = room.y + room.height - 1;
  for (let y = room.y; y <= bottom; y += 1) {
    for (let x = room.x; x <= right; x += 1) {
      if (x !== room.x && x !== right && y !== room.y && y !== bottom) continue;
      if (grid[y]?.[x] === '.') cells.push({ x, y });
    }
  }
  return cells;
}

/**
 * Walkable cells reachable from `start` on foot, as "x,y" keys. The chasm is
 * the only thing this refuses to cross, which is what makes it the test for
 * «the stairs are still reachable».
 */
export function walkableFrom(grid, start, { flying = false } = {}) {
  const seen = new Set();
  if (!start || !grid?.[start.y]) return seen;
  const passable = (x, y) => {
    const cell = grid[y]?.[x];
    if (cell === undefined) return false;
    if (cell === CHASM_CELL) return flying;
    return cell === '.' || cell === '~' || cell === 'D';
  };
  if (!passable(start.x, start.y)) return seen;
  const queue = [start];
  seen.add(`${start.x},${start.y}`);
  while (queue.length > 0) {
    const cell = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = cell.x + dx;
      const y = cell.y + dy;
      const key = `${x},${y}`;
      if (seen.has(key) || !passable(x, y)) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return seen;
}

/**
 * Cuts a hole across a room and leaves an island on the far side.
 *
 * The hole is a band, because a scatter of single holes reads as damage
 * rather than as a place: one strip of missing floor, wall to wall, with the
 * room's own doorways kept clear so the corridor still arrives somewhere.
 *
 * Returns the cells it opened and the island it left, or null when the room
 * could not take one without stranding something — the caller keeps the room
 * exactly as it was.
 */
export function carveChasm(grid, room, { rng, keepCells = [], reach = null } = {}) {
  if (!grid || !room || !rng) return null;
  if (room.width < CHASM_MIN_ROOM.width || room.height < CHASM_MIN_ROOM.height) return null;
  const protectedCells = new Set();
  /**
   * A doorway keeps its own cell and its four neighbours — an entrance that
   * opens onto a hole is a trap, not an entrance. It used to keep the whole
   * three-by-three around itself, and in a six-by-five room that is the band
   * gone: two thirds of the rooms refused a chasm for want of four cells.
   */
  const protect = (x, y) => {
    protectedCells.add(`${x},${y}`);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      protectedCells.add(`${x + dx},${y + dy}`);
    }
  };
  for (const cell of openingCells(grid, room)) protect(cell.x, cell.y);
  for (const cell of keepCells) protect(cell.x, cell.y);

  const horizontal = room.width >= room.height;
  const span = horizontal ? room.height : room.width;
  if (span < 5) return null;

  /**
   * Which line the hole runs along.
   *
   * It used to be the middle, full stop, and the middle is very often the row
   * a doorway opens onto — so the band came out chopped short at both ends by
   * the aprons that keep an entrance from ending in air, and what the player
   * saw was a puddle-shaped hole they could walk round without noticing. The
   * line is chosen instead: the one nearest the middle that no doorway
   * touches, so the hole runs wall to wall the way a chasm should.
   */
  const first = (horizontal ? room.y : room.x) + 2;
  const last = (horizontal ? room.y + room.height : room.x + room.width) - 3;
  const cellsOn = (line) => interiorCells(room).filter((cell) => (horizontal ? cell.y : cell.x) === line);
  const clearOn = (line) => cellsOn(line).filter((cell) => (
    !protectedCells.has(`${cell.x},${cell.y}`) && grid[cell.y][cell.x] === '.'
  ));
  const centre = horizontal
    ? room.y + Math.floor(room.height / 2)
    : room.x + Math.floor(room.width / 2);
  let middle = null;
  let best = -1;
  for (let line = first; line <= last; line += 1) {
    const free = clearOn(line).length;
    if (free < 4) continue;
    // The longest run of open floor wins, and the tie goes to the line
    // nearest the middle of the room — a hole along a wall is a ledge.
    const better = free > best
      || (free === best && Math.abs(line - centre) < Math.abs(middle - centre));
    if (better) {
      best = free;
      middle = line;
    }
  }
  if (middle === null) return null;
  const band = span >= 8 && middle + 1 <= last && clearOn(middle + 1).length >= 4
    ? [middle, middle + 1]
    : [middle];

  const candidates = band.flatMap((line) => clearOn(line));
  if (candidates.length < 4) return null;

  const stillReaches = () => {
    if (!reach?.from || !reach?.mustReach) return true;
    const walkable = walkableFrom(grid, reach.from);
    return reach.mustReach.every(({ x, y }) => walkable.has(`${x},${y}`));
  };

  /**
   * Cut it clean through first.
   *
   * A chasm wall to wall is what the thing wants to be, and when the floor
   * can still be finished without it — the stairs lie on this side, or a
   * corridor goes round — that is also where islands come from: whatever is
   * left on the far bank has no land route at all, and the only way to it is
   * to fly. That is the whole point of the room.
   */
  const opened = candidates.map(({ x, y }) => ({ x, y }));
  for (const cell of opened) grid[cell.y][cell.x] = CHASM_CELL;

  /**
   * And put a crossing back if that stranded the stairs.
   *
   * One cell of floor across the hole: a plank the player has to walk round
   * to. The floor stays finishable on foot, which is the rule flight must
   * never break, and the hole is still the shape of the room.
   */
  if (!stillReaches()) {
    const lines = [...new Set(candidates.map(({ x, y }) => (horizontal ? x : y)))].sort((a, b) => a - b);
    let bridged = false;
    for (let attempt = 0; attempt < lines.length && !bridged; attempt += 1) {
      const line = lines[(rng.int(0, lines.length - 1) + attempt) % lines.length];
      const plank = opened.filter(({ x, y }) => (horizontal ? x : y) === line);
      for (const cell of plank) grid[cell.y][cell.x] = '.';
      if (stillReaches()) {
        bridged = true;
        for (const cell of plank) {
          const at = opened.findIndex((other) => other.x === cell.x && other.y === cell.y);
          if (at >= 0) opened.splice(at, 1);
        }
      } else {
        for (const cell of plank) grid[cell.y][cell.x] = CHASM_CELL;
      }
    }
    if (!bridged) {
      for (const cell of opened) grid[cell.y][cell.x] = '.';
      return null;
    }
  }
  if (opened.length < 3) {
    for (const cell of opened) grid[cell.y][cell.x] = '.';
    return null;
  }

  /** Floor the hole has cut off from everything: the reason to fly. */
  const island = (() => {
    if (!reach?.from) return [];
    const walkable = walkableFrom(grid, reach.from);
    return interiorCells(room)
      .filter(({ x, y }) => grid[y][x] === '.' && !walkable.has(`${x},${y}`))
      .map(({ x, y }) => Object.freeze({ x, y }));
  })();

  return Object.freeze({
    cells: Object.freeze(opened.map(({ x, y }) => Object.freeze({ x, y }))),
    island: Object.freeze(island),
    horizontal,
  });
}

/**
 * Which rooms could take a hole, best first.
 *
 * It used to answer with one room, and one room is almost always a no: the
 * room has a doorway at every edge, or something is standing in the band, or
 * cutting it would strand the stairs. Perfectly good reasons, each of them,
 * and together they meant a chasm appeared on about one floor in a hundred —
 * which is the same as not having built it. The caller walks this list and
 * stops at the first room that accepts one.
 */
export function chasmRoomCandidates({
  rng, rooms = [], grid = null, depth = 1, excluded = new Set(), chance = CHASM_ROOM_CHANCE,
} = {}) {
  if (!rng || depth < CHASM_MIN_DEPTH || rooms.length < 4) return [];
  if (rng.next() >= chance) return [];
  const candidates = rooms
    .map((room, index) => ({
      room,
      index,
      // A room with one way in is a dead end, and a dead end is where a chasm
      // can be cut clean through: nothing beyond it needs crossing, so the far
      // bank becomes an island instead of a detour. Those go first.
      doors: grid ? openingCells(grid, room).length : 2,
    }))
    .filter(({ room, index }) => (
      !excluded.has(index)
      && room.width >= CHASM_MIN_ROOM.width
      && room.height >= CHASM_MIN_ROOM.height
    ));
  candidates.sort((left, right) => (
    left.doors - right.doors
    || (right.room.width * right.room.height) - (left.room.width * left.room.height)
  ));
  return Object.freeze(candidates.map(({ index }) => index));
}

/** One room, for callers that only want the first. */
export function chooseChasmRoom(options) {
  return chasmRoomCandidates(options)[0] ?? null;
}

/**
 * Every seventh floor is a broken one.
 *
 * Cutting holes into ordinary rooms gave ordinary holes: the rooms down here
 * are six by five, so the biggest chasm that fits is four cells wide and the
 * player walks round it without looking up. Ivan asked for a place, not a
 * decoration — «нужна локация с другой генерацией: огромные ямы, провалы,
 * куски пола, между которыми надо перелетать» — and a place means the whole
 * floor is the thing.
 *
 * So a rift floor takes the dungeon it was given and tears long faults across
 * it, wall to wall, through rooms and corridors alike. What is left is slabs
 * of floor with gaps between them. The rule that survives from the small
 * version is the important one: after every cut the stairs are still reachable
 * on foot, and a cut that would break that is put back cell by cell until it
 * is not. Flight crosses in a straight line; feet go the long way round.
 */
export const CHASM_FLOOR_INTERVAL = 7;

/** Is this one of them? Deep enough, and on the interval. */
export function isRiftDepth(depth) {
  return Number.isInteger(depth)
    && depth >= CHASM_MIN_DEPTH
    && depth % CHASM_FLOOR_INTERVAL === 0;
}

export function carveRiftFloor(grid, { rng, from, mustReach = [], keepCells = [], faults = 3 } = {}) {
  if (!grid || !rng || !from) return [];
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const keep = new Set();
  for (const cell of [from, ...mustReach, ...keepCells]) {
    if (!cell) continue;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) keep.add(`${cell.x + dx},${cell.y + dy}`);
    }
  }
  const reaches = () => {
    const walkable = walkableFrom(grid, from);
    return mustReach.every(({ x, y }) => walkable.has(`${x},${y}`));
  };
  /**
   * Keep tearing until the floor is visibly broken.
   *
   * A fixed three faults is a lottery: on a tight floor most of a fault goes
   * straight back as crossings and what is left is five cells, which is a
   * puddle rather than a place. So the count is a floor, not a ceiling — more
   * lines are tried until enough of the ground is actually missing, and the
   * attempts run out long before the loop can.
   */
  const WANTED_CELLS = 16;
  const MAX_ATTEMPTS = 14;
  const opened = [];
  const lines = [];
  for (let index = 0; index < MAX_ATTEMPTS; index += 1) {
    const horizontal = rng.int(0, 1) === 0;
    const limit = horizontal ? height : width;
    lines.push({ horizontal, line: rng.int(3, Math.max(3, limit - 4)) });
  }
  for (const { horizontal, line } of lines) {
    if (opened.length >= WANTED_CELLS) break;
    const cut = [];
    const length = horizontal ? width : height;
    for (let along = 1; along < length - 1; along += 1) {
      const x = horizontal ? along : line;
      const y = horizontal ? line : along;
      if (grid[y]?.[x] !== '.' || keep.has(`${x},${y}`)) continue;
      cut.push({ x, y });
    }
    if (cut.length < 4) continue;
    for (const cell of cut) grid[cell.y][cell.x] = CHASM_CELL;
    // Put the fault back, one cell at a time, until the floor is whole again.
    // The cells nearest the middle go back last: a crossing at the end of a
    // fault is a detour, a crossing in the middle is a bridge.
    if (!reaches()) {
      const order = [...cut].sort((left, right) => {
        const middle = (horizontal ? width : height) / 2;
        const at = (cell) => Math.abs((horizontal ? cell.x : cell.y) - middle);
        return at(right) - at(left);
      });
      for (const cell of order) {
        if (reaches()) break;
        grid[cell.y][cell.x] = '.';
        const at = cut.findIndex((other) => other.x === cell.x && other.y === cell.y);
        if (at >= 0) cut.splice(at, 1);
      }
    }
    if (!reaches()) {
      // The whole fault is impossible here: undo it and try the next line.
      for (const cell of cut) grid[cell.y][cell.x] = '.';
      continue;
    }
    opened.push(...cut);
  }
  return Object.freeze(opened.map(({ x, y }) => Object.freeze({ x, y })));
}

/**
 * Floor the holes have cut off from everywhere: the pieces worth flying to.
 *
 * Returned as groups, one per island, so the caller can put something on each
 * of them rather than piling everything onto whichever cell came first.
 */
export function chasmIslands(grid, from) {
  const reachable = walkableFrom(grid, from);
  const seen = new Set();
  const islands = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
      const key = `${x},${y}`;
      if (grid[y][x] !== '.' || reachable.has(key) || seen.has(key)) continue;
      const island = [];
      const queue = [{ x, y }];
      seen.add(key);
      while (queue.length > 0) {
        const cell = queue.shift();
        island.push(Object.freeze({ x: cell.x, y: cell.y }));
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          const at = `${nx},${ny}`;
          if (seen.has(at) || grid[ny]?.[nx] !== '.') continue;
          seen.add(at);
          queue.push({ x: nx, y: ny });
        }
      }
      islands.push(Object.freeze(island));
    }
  }
  // Biggest first: a single stranded cell behind a doorway is not a place,
  // and the caller should spend its one good prize on the real island.
  return Object.freeze([...islands].sort((left, right) => right.length - left.length));
}

/** A tenth of the hero's health: a real cost, never a death sentence. */
export const CHASM_FALL_PERCENT = 10;

const COPY = Object.freeze({
  ru: Object.freeze({
    name: 'Провал',
    description: 'Пола нет. Обойти или перелететь.',
    refusal: 'Туда без полёта не шагнуть',
    overChasm: 'Не над пропастью',
    fell: 'Падение',
  }),
  en: Object.freeze({
    name: 'Chasm',
    description: 'No floor here. Go round, or fly.',
    refusal: 'No stepping into that without flight',
    overChasm: 'Not over a chasm',
    fell: 'A fall',
  }),
});

export function chasmCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}
