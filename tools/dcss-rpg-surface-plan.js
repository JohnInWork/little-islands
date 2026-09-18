/**
 * Open country is not a dungeon with grass painted on it.
 *
 * A dungeon is carved: the world starts solid and rooms are cut out of it, so
 * everything is a box joined to another box by a one-tile corridor. Outside,
 * the world starts open and things are put **into** it — rock massifs, thickets,
 * a hut with a door, the mouth of a cave. The result winds instead of branching,
 * and there is no such thing as a wall you cannot walk around.
 *
 * What comes back is the same shape the dungeon builder returns — a grid and a
 * list of rectangles — because everything downstream (loot, monsters, finds,
 * room plans) is written against rooms and does not care how they came to be.
 */

/**
 * How much of what a place is made of. Two fields of grass with different
 * numbers here are not the same place with a different tint: a steppe is open
 * with a few great mesas in it, a heath is a thousand little rocks to pick a
 * way between, a hollow is half cave. The tiles say what it looks like; this
 * says how it is put together.
 */
export const SURFACE_PROFILES = Object.freeze({
  // massifs/huts/caves are counts; `acre` scales the massif count to the map,
  // `clump` is how wide one of them spreads — a boulder field and a wood differ
  // far more in that than in how many things are standing about.
  default: Object.freeze({ acre: [0.9, 1.5], massifSize: [2, 5], clump: [1, 2], huts: [3, 5], caves: [1, 2], massifKind: 'rock', streams: [0, 1], marsh: 0 }),
  'sunburnt-steppe': Object.freeze({ acre: [0.3, 0.55], massifSize: [5, 10], clump: [1, 2], huts: [4, 6], caves: [0, 0], massifKind: 'rock', streams: [0, 0], marsh: 0 }),
  'wild-heath': Object.freeze({ acre: [1.7, 2.6], massifSize: [1, 3], clump: [1, 2], huts: [2, 3], caves: [1, 1], massifKind: 'rock', streams: [0, 1], marsh: 0 }),
  'green-hollow': Object.freeze({ acre: [0.7, 1.1], massifSize: [3, 7], clump: [1, 2], huts: [1, 2], caves: [2, 3], massifKind: 'rock', streams: [1, 2], marsh: 0.2 }),
  // A wood is not a field with a few trees standing in it, and it is not a few
  // groves either. What blocks the way IS the trees, all of them, everywhere:
  // very many very small clumps, so the open ground left over is lanes between
  // trunks. Walking through a wood is a series of small choices about which gap
  // to take, and it is that — not the tint of the grass — that makes it a wood.
  'autumn-wood': Object.freeze({ acre: [7, 9], massifSize: [1, 2], clump: [0, 1], huts: [2, 3], caves: [0, 1], massifKind: 'thicket', streams: [1, 1], marsh: 0.1 }),
  'thornwood': Object.freeze({ acre: [7.5, 9.5], massifSize: [1, 2], clump: [0, 1], huts: [1, 2], caves: [0, 1], massifKind: 'thicket', streams: [0, 1], marsh: 0 }),
  // A mire is not a wood that happens to be damp. The water is the place: it
  // runs everywhere, it stands between the trunks, and the dry ground is what
  // is left over — which is the same bargain the trees make, one layer down.
  mire: Object.freeze({ acre: [8, 10], massifSize: [1, 2], clump: [0, 1], huts: [2, 3], caves: [0, 1], massifKind: 'thicket', streams: [3, 4], marsh: 0.62 }),
});

export function surfaceProfile(themeId) {
  return SURFACE_PROFILES[themeId] ?? SURFACE_PROFILES.default;
}

/** Daylight outside: wider sight than a cave, dimmer than a lit town. */
export const SURFACE_REVEAL_RADIUS = 7;
export const SURFACE_LIGHT_MULTIPLIER = 1.45;

export const SURFACE_WALL = '#';
export const SURFACE_FLOOR = '.';

/** Fewer places than this and there is nothing to find on the floor. */
export const MIN_CLEARINGS = 6;

export const WATER_CELL = '~';

/**
 * How much of a floor may be under water. Outside, water is not a flooded room
 * — it is a watercourse crossing the map — so the promise is about the floor as
 * a whole. The dry places keep their floor at zero on purpose: a burnt steppe
 * with a brook in it is not a burnt steppe.
 */
export const SURFACE_WATER = Object.freeze({ max: 0.42 });

/**
 * How much of a wood is standing timber. This is a promise, not a knob: under
 * the floor it is a field with a few groves in it and the place stops reading as
 * a wood at all; over the ceiling the lanes close and there is no way through.
 * A test holds every `thicket` profile to it across thousands of floors.
 */
export const THICKET_COVER = Object.freeze({ min: 0.12, max: 0.4 });

const inBounds = (grid, x, y) => (
  y > 0 && x > 0 && y < grid.length - 1 && x < grid[0].length - 1
);

const fill = (grid, rect, cell) => {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (inBounds(grid, x, y)) grid[y][x] = cell;
    }
  }
};

const overlaps = (a, b, pad = 1) => (
  a.x - pad < b.x + b.width && a.x + a.width + pad > b.x
  && a.y - pad < b.y + b.height && a.y + a.height + pad > b.y
);

/**
 * A massif: a clump of overlapping blots rather than a rectangle, so its edge
 * is ragged and walking round it is a decision about which way, not a corner.
 */
function raiseMassif(grid, rng, { x, y, size, clump = [1, 2], thicket }) {
  let cursorX = x;
  let cursorY = y;
  for (let step = 0; step < size; step += 1) {
    const radius = rng.int(clump[0], clump[1]);
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) + Math.abs(dy) > radius + 1) continue;
        if (!inBounds(grid, cursorX + dx, cursorY + dy)) continue;
        grid[cursorY + dy][cursorX + dx] = SURFACE_WALL;
        if (thicket) thicket.add(`${cursorX + dx},${cursorY + dy}`);
      }
    }
    cursorX += rng.int(-2, 2);
    cursorY += rng.int(-2, 2);
  }
}

/**
 * A cave: a chamber hollowed out inside a massif, with a mouth one cell wide
 * bored out to the open. It is the one place outside that is properly enclosed,
 * and the only enclosed place that was not built by anybody.
 */
function hollowCave(grid, rng, { width, height, rooms, hewn }) {
  const solid = (rect) => {
    for (let y = rect.y - 1; y <= rect.y + rect.height; y += 1) {
      for (let x = rect.x - 1; x <= rect.x + rect.width; x += 1) {
        if (grid[y]?.[x] !== SURFACE_WALL) return false;
      }
    }
    return true;
  };
  for (let attempt = 0; attempt < 260; attempt += 1) {
    const chamber = { width: rng.int(4, 5), height: rng.int(4, 5), x: 0, y: 0 };
    chamber.x = rng.int(3, width - chamber.width - 4);
    chamber.y = rng.int(3, height - chamber.height - 4);
    if (rooms.some((other) => overlaps(chamber, other, 2))) continue;
    // The hill comes with the cave. Waiting for a massif thick enough to hollow
    // leaves nine floors in ten without one, so the cave raises its own rock.
    if (!solid(chamber)) {
      const hill = {
        x: chamber.x - 2,
        y: chamber.y - 2,
        width: chamber.width + 4,
        height: chamber.height + 4,
      };
      fill(grid, hill, SURFACE_WALL);
      for (let y = hill.y; y < hill.y + hill.height; y += 1) {
        for (let x = hill.x; x < hill.x + hill.width; x += 1) hewn.add(`${x},${y}`);
      }
    }
    fill(grid, chamber, SURFACE_FLOOR);
    // Bore outward from the middle of one side until daylight.
    const side = rng.int(0, 3);
    const from = side === 0
      ? { x: chamber.x + Math.floor(chamber.width / 2), y: chamber.y + chamber.height, step: { x: 0, y: 1 } }
      : side === 1
        ? { x: chamber.x + Math.floor(chamber.width / 2), y: chamber.y - 1, step: { x: 0, y: -1 } }
        : side === 2
          ? { x: chamber.x - 1, y: chamber.y + Math.floor(chamber.height / 2), step: { x: -1, y: 0 } }
          : { x: chamber.x + chamber.width, y: chamber.y + Math.floor(chamber.height / 2), step: { x: 1, y: 0 } };
    let { x, y } = from;
    for (let bore = 0; bore < Math.max(width, height); bore += 1) {
      if (!inBounds(grid, x, y)) break;
      if (grid[y][x] === SURFACE_FLOOR) break;
      grid[y][x] = SURFACE_FLOOR;
      x += from.step.x;
      y += from.step.y;
    }
    return chamber;
  }
  return null;
}

/**
 * A hut: a ring of wall with one gap. The gap has wall on both sides, which is
 * exactly what the door planner calls a narrow passage, so huts get real doors
 * from the same code that gives the caves theirs.
 */
function raiseBuilding(grid, rng, rect, built) {
  fill(grid, rect, SURFACE_WALL);
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) built.add(`${x},${y}`);
  }
  const interior = { x: rect.x + 1, y: rect.y + 1, width: rect.width - 2, height: rect.height - 2 };
  fill(grid, interior, SURFACE_FLOOR);
  const side = rng.int(0, 3);
  const door = side === 0
    ? { x: rect.x + rng.int(1, rect.width - 2), y: rect.y + rect.height - 1 }
    : side === 1
      ? { x: rect.x + rng.int(1, rect.width - 2), y: rect.y }
      : side === 2
        ? { x: rect.x, y: rect.y + rng.int(1, rect.height - 2) }
        : { x: rect.x + rect.width - 1, y: rect.y + rng.int(1, rect.height - 2) };
  if (inBounds(grid, door.x, door.y)) grid[door.y][door.x] = SURFACE_FLOOR;
  // A doorstep: two cells of cleared ground straight out from the door. A hut
  // whose door opens onto a rock face is both silly and useless — the doorway
  // stops being a doorway, and a floor whose only doorways are like that has
  // no doors at all.
  const step = side === 0 ? { x: 0, y: 1 } : side === 1 ? { x: 0, y: -1 }
    : side === 2 ? { x: -1, y: 0 } : { x: 1, y: 0 };
  for (let reach = 1; reach <= 2; reach += 1) {
    const cell = { x: door.x + step.x * reach, y: door.y + step.y * reach };
    if (inBounds(grid, cell.x, cell.y)) grid[cell.y][cell.x] = SURFACE_FLOOR;
  }
  return { rect, interior, door };
}

/**
 * Every cell reachable from a starting one. Ground is ground you can stand on,
 * and shallow water is ground: you wade it. Saying otherwise would make a brook
 * across a meadow read as a wall, which is the opposite of what it is.
 */
export const isOpenCell = (cell) => cell === SURFACE_FLOOR || cell === WATER_CELL;

export function reachableFrom(grid, start) {
  const seen = new Set();
  if (!isOpenCell(grid[start.y]?.[start.x])) return seen;
  const queue = [start];
  seen.add(`${start.x},${start.y}`);
  while (queue.length > 0) {
    const { x, y } = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: x + dx, y: y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || !isOpenCell(grid[next.y]?.[next.x])) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen;
}

/** Every separate patch of open ground on the floor, largest first. */
function openRegions(grid) {
  const seen = new Set();
  const regions = [];
  for (let y = 1; y < grid.length - 1; y += 1) {
    for (let x = 1; x < grid[0].length - 1; x += 1) {
      const key = `${x},${y}`;
      if (seen.has(key) || !isOpenCell(grid[y][x])) continue;
      const region = reachableFrom(grid, { x, y });
      for (const cell of region) seen.add(cell);
      regions.push(region);
    }
  }
  return regions.sort((left, right) => right.size - left.size);
}

/**
 * A trail worn from one patch of ground to another, digging only through rock
 * that nobody put there. A straight line would cut a hut in half — which is how
 * a road ends up broken, opening a wall on one side and a wall on the other —
 * so this is a breadth-first search through the massifs alone, and it takes the
 * shortest way round anything built.
 */
function wearTrail(grid, region, destination, protectedCells) {
  const queue = [...region].map((key) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, from: null };
  });
  const seen = new Set(region);
  let head = 0;
  while (head < queue.length) {
    const node = queue[head];
    head += 1;
    if (destination.has(`${node.x},${node.y}`)) {
      // Walk the trail back and open it.
      for (let step = node.from; step && !region.has(`${step.x},${step.y}`); step = step.from) {
        grid[step.y][step.x] = SURFACE_FLOOR;
      }
      return true;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: node.x + dx, y: node.y + dy, from: node };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || !inBounds(grid, next.x, next.y)) continue;
      // Rock may be dug. A wall somebody built or a hill a cave was cut from is
      // left alone: a trail through it would be a hole, not a road.
      if (grid[next.y][next.x] === SURFACE_WALL && protectedCells.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}

/** Ground nobody can ever stand on is not ground. */
function fillRegion(grid, region) {
  for (const key of region) {
    const [x, y] = key.split(',').map(Number);
    grid[y][x] = SURFACE_WALL;
  }
}

/**
 * A watercourse, drawn across the map rather than poured into a room.
 *
 * It wanders — one step along its own axis, sometimes one step sideways — and
 * whatever it meets it wears away: rock and thicket alike give in to running
 * water. What it will not touch is a wall somebody built or a hill a cave was
 * cut from, because a stream through a hut is a hole in a hut. Meeting one of
 * those it simply passes it by and picks the thread up on the far side.
 *
 * Water is walked through, not around, so a stream can never cut the floor in
 * two — which is why this runs after the ground has been mended and not before.
 */
function runStream(grid, rng, { width, height, spared }) {
  const down = rng.int(0, 1) === 0;
  const span = down ? height : width;
  let main = 1;
  let cross = rng.int(3, (down ? width : height) - 4);
  const cut = (x, y) => {
    if (!inBounds(grid, x, y)) return;
    if (spared.has(`${x},${y}`)) return;
    grid[y][x] = WATER_CELL;
  };
  const wide = rng.int(0, 2) > 0;
  for (let step = 0; step < span; step += 1) {
    const x = down ? cross : main;
    const y = down ? main : cross;
    if (!inBounds(grid, x, y)) break;
    cut(x, y);
    if (wide) cut(down ? x + 1 : x, down ? y : y + 1);
    // A sideways step is taken as its own cell, so the channel stays joined
    // edge to edge instead of pinching off into a diagonal chain.
    if (rng.next() < 0.42) {
      cross += rng.int(0, 1) === 0 ? 1 : -1;
      const sideX = down ? cross : main;
      const sideY = down ? main : cross;
      cut(sideX, sideY);
      if (wide) cut(down ? sideX + 1 : sideX, down ? sideY : sideY + 1);
    }
    main += 1;
  }
}

/**
 * Marsh: standing water that creeps out from the channel over whatever ground
 * lies beside it. It keeps off the clearings — a find at the bottom of a bog is
 * a find nobody picks up — and off everything anybody built.
 */
function spreadMarsh(grid, rng, { width, height, spared, share }) {
  if (share <= 0) return;
  for (let round = 0; round < 3; round += 1) {
    const soaked = [];
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        if (grid[y][x] !== SURFACE_FLOOR || spared.has(`${x},${y}`)) continue;
        const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .some(([dx, dy]) => grid[y + dy]?.[x + dx] === WATER_CELL);
        if (wet && rng.next() < share) soaked.push({ x, y });
      }
    }
    for (const { x, y } of soaked) grid[y][x] = WATER_CELL;
  }
}

const clearingFits = (grid, rect) => {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (grid[y]?.[x] !== SURFACE_FLOOR) return false;
    }
  }
  return true;
};

/**
 * One floor of open country.
 *
 * `rooms` are clearings and hut interiors — the places content is put. They are
 * rectangles of open ground, exactly what the dungeon hands downstream, and the
 * first one is where the hero arrives.
 */
export function generateSurfacePlan({
  rng, width, height, roomCount = 10, profile = SURFACE_PROFILES.default,
} = {}) {
  if (!rng || typeof rng.int !== 'function') throw new TypeError('Surface plan requires seeded RNG');
  if (width < 24 || height < 18) throw new TypeError('Surface plan needs room to breathe');
  const grid = Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => (
    x === 0 || y === 0 || x === width - 1 || y === height - 1 ? SURFACE_WALL : SURFACE_FLOOR
  )));

  // What blocks the way here: rock to walk around, or standing timber to weave
  // between. The grid says '#' either way; only this says which it looks like.
  const thicket = profile.massifKind === 'thicket' ? new Set() : null;
  // Rock and thicket first, so the huts are placed into a landscape.
  // Scaled to the map, not to a number that happened to look right once: the
  // same count on a smaller floor turns open country into a maze.
  const acres = (width * height) / 150;
  const massifs = rng.int(
    Math.max(1, Math.round(acres * profile.acre[0])),
    Math.max(2, Math.round(acres * profile.acre[1])),
  );
  for (let index = 0; index < massifs; index += 1) {
    raiseMassif(grid, rng, {
      x: rng.int(2, width - 3),
      y: rng.int(2, height - 3),
      size: rng.int(profile.massifSize[0], profile.massifSize[1]),
      clump: profile.clump ?? [1, 2],
      thicket,
    });
  }

  // At least one building, always. Its doorway is the only narrow passage open
  // country has, and a floor with no doorway at all is one the door planner
  // refuses to build — so the field would simply have no doors anywhere.
  // A wall is not just a wall: one was built by somebody and one was cut out of
  // a hill, and they are drawn out of different stone. The plan is the only
  // place that knows which is which, so it says so.
  const built = new Set();
  const hewn = new Set();
  const structures = [];
  const wanted = rng.int(profile.huts[0], profile.huts[1]);
  for (let attempt = 0; attempt < 120 && structures.length < wanted; attempt += 1) {
    const rect = {
      width: rng.int(6, 9),
      height: rng.int(6, 8),
      x: 0,
      y: 0,
    };
    rect.x = rng.int(2, width - rect.width - 3);
    rect.y = rng.int(2, height - rect.height - 3);
    if (structures.some(({ rect: other }) => overlaps(rect, other, 2))) continue;
    structures.push(raiseBuilding(grid, rng, rect, built));
  }
  if (structures.length === 0) {
    // Nowhere fitted, so one is made to fit: a hut clears the ground it stands on.
    const rect = { width: 6, height: 6, x: Math.floor(width / 2) - 3, y: Math.floor(height / 2) - 3 };
    structures.push(raiseBuilding(grid, rng, rect, built));
  }

  // Clearings: open ground big enough to hold something worth finding.
  // Open ground first, so the hero arrives under the sky rather than indoors.
  // A rocky floor can leave little of it, so the search gives ground: big and
  // well spaced first, then smaller and closer together. Only if even the
  // modest pass comes up short is the floor genuinely unusable.
  const rooms = [];
  const passes = [
    { minWidth: 5, maxWidth: 7, minHeight: 4, maxHeight: 6, pad: 1 },
    { minWidth: 4, maxWidth: 5, minHeight: 4, maxHeight: 5, pad: 1 },
    { minWidth: 4, maxWidth: 4, minHeight: 4, maxHeight: 4, pad: 0 },
  ];
  for (const pass of passes) {
    for (let attempt = 0; attempt < 400 && rooms.length < roomCount; attempt += 1) {
      const room = {
        width: rng.int(pass.minWidth, pass.maxWidth),
        height: rng.int(pass.minHeight, pass.maxHeight),
        x: 0,
        y: 0,
      };
      room.x = rng.int(1, width - room.width - 2);
      room.y = rng.int(1, height - room.height - 2);
      if (rooms.some((other) => overlaps(room, other, pass.pad))) continue;
      if (!clearingFits(grid, room)) continue;
      rooms.push(room);
    }
    if (rooms.length >= roomCount) break;
  }
  for (const structure of structures) rooms.push({ ...structure.interior });
  // Caves come last: they need rock that nothing else has claimed.
  const caves = [];
  for (let index = 0; index < rng.int(profile.caves[0], profile.caves[1]); index += 1) {
    const chamber = hollowCave(grid, rng, { width, height, rooms: [...rooms, ...caves], hewn });
    if (chamber) caves.push(chamber);
  }
  rooms.push(...caves);

  // The floor must be one piece. Not "every clearing reachable" — every square
  // of open ground, or the map ends up with roads that lead into a sealed
  // pocket and stop. Whatever cannot be joined without breaking a hut open is
  // not left lying around as unreachable ground: it goes back to rock.
  const protectedCells = new Set([...built, ...hewn]);
  const mendGround = () => {
    for (let pass = 0; pass < 24; pass += 1) {
      const regions = openRegions(grid);
      if (regions.length <= 1) break;
      const main = regions[0];
      let joined = false;
      for (const region of regions.slice(1)) {
        if (wearTrail(grid, region, main, protectedCells)) joined = true;
        else fillRegion(grid, region);
      }
      if (!joined) break;
    }
    return openRegions(grid)[0] ?? new Set();
  };
  const clearedBy = (standing) => (room) => {
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        if (!standing.has(`${x},${y}`)) return false;
      }
    }
    return true;
  };
  // A floor can come out so rocky — or so wooded — that six clearings do not fit
  // anywhere. Rather than refuse it, the ground gives way where it is thinnest,
  // which is what a clearing is anyway. This runs *after* the mending and takes
  // the pruning into account: a glade the repair filled in never counted, and
  // topping up before the repair is how a wood ends up short of places.
  let standing = new Set();
  let isClear = clearedBy(standing);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    standing = mendGround();
    isClear = clearedBy(standing);
    for (let index = rooms.length - 1; index >= 0; index -= 1) {
      if (!isClear(rooms[index])) rooms.splice(index, 1);
    }
    if (rooms.length >= MIN_CLEARINGS) break;
    let best = null;
    for (let y = 1; y < height - 5; y += 1) {
      for (let x = 1; x < width - 5; x += 1) {
        const rect = { x, y, width: 4, height: 4 };
        if (rooms.some((other) => overlaps(rect, other, 0))) continue;
        let walls = 0;
        for (let inner = 0; inner < 16; inner += 1) {
          if (grid[y + Math.floor(inner / 4)][x + (inner % 4)] === SURFACE_WALL) walls += 1;
        }
        if (!best || walls < best.walls) best = { rect, walls };
      }
    }
    if (!best) break;
    fill(grid, best.rect, SURFACE_FLOOR);
    rooms.push(best.rect);
  }
  if (rooms.length < MIN_CLEARINGS) {
    throw new Error('Surface generator could not find enough open ground');
  }
  // A hut nobody could ever walk into was filled in with the rest of the
  // unreachable ground; it is no longer a hut, and saying otherwise would leave
  // the plan describing a building that is not there.
  const standingStructures = structures.filter(({ interior }) => isClear(interior));
  const standingCaves = caves.filter((chamber) => isClear(chamber));

  // Water comes last, once the ground is whole. It is waded through rather than
  // walked round, so a watercourse cannot cut the floor in two — but it is also
  // the one thing here that writes over finished work, which is why nothing is
  // allowed to depend on it having been written.
  const rectCells = (rect) => {
    const cells = [];
    for (let y = rect.y - 1; y <= rect.y + rect.height; y += 1) {
      for (let x = rect.x - 1; x <= rect.x + rect.width; x += 1) cells.push(`${x},${y}`);
    }
    return cells;
  };
  const spared = new Set([...built, ...hewn]);
  for (const structure of standingStructures) for (const key of rectCells(structure.rect)) spared.add(key);
  for (const chamber of standingCaves) for (const key of rectCells(chamber)) spared.add(key);
  // Whichever clearing the hero arrives in stays dry: waking up ankle-deep is
  // not an introduction to a place, it is an accident.
  if (rooms[0]) for (const key of rectCells(rooms[0])) spared.add(key);
  const streams = rng.int(profile.streams?.[0] ?? 0, profile.streams?.[1] ?? 0);
  for (let index = 0; index < streams; index += 1) {
    runStream(grid, rng, { width, height, spared });
  }
  // A brook may cross a glade; a bog may not swallow one.
  const marshSpared = new Set(spared);
  for (const room of rooms) for (const key of rectCells(room)) marshSpared.add(key);
  spreadMarsh(grid, rng, { width, height, spared: marshSpared, share: profile.marsh ?? 0 });
  // Erosion can leave a channel landlocked: a stream that started inside a rock
  // massif and ran up against a hut wall is water nobody will ever stand in.
  // Water only ever *adds* passable ground, so anything cut off from the main
  // body was made by this pass and by nothing else — it goes back to being the
  // rock it was a moment ago, thicket and all.
  const walkable = (x, y) => grid[y]?.[x] !== undefined && grid[y][x] !== SURFACE_WALL;
  const seen = new Set();
  const bodies = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (seen.has(`${x},${y}`) || !walkable(x, y)) continue;
      const body = new Set([`${x},${y}`]);
      const queue = [{ x, y }];
      while (queue.length > 0) {
        const node = queue.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const key = `${node.x + dx},${node.y + dy}`;
          if (body.has(key) || !walkable(node.x + dx, node.y + dy)) continue;
          body.add(key);
          queue.push({ x: node.x + dx, y: node.y + dy });
        }
      }
      for (const key of body) seen.add(key);
      bodies.push(body);
    }
  }
  bodies.sort((left, right) => right.size - left.size);
  for (const body of bodies.slice(1)) {
    for (const key of body) {
      const [x, y] = key.split(',').map(Number);
      grid[y][x] = SURFACE_WALL;
    }
  }
  const waterCells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) if (grid[y][x] === WATER_CELL) waterCells.push(`${x},${y}`);
  }

  // Anything carved back open is no longer a wall of any kind.
  for (const set of [built, hewn, thicket].filter(Boolean)) {
    for (const key of [...set]) {
      const [x, y] = key.split(',').map(Number);
      if (grid[y]?.[x] !== SURFACE_WALL) set.delete(key);
    }
  }
  return {
    grid,
    rooms,
    structures: standingStructures,
    caves: standingCaves,
    builtWalls: Object.freeze([...built]),
    hewnWalls: Object.freeze([...hewn]),
    thicketWalls: Object.freeze(thicket ? [...thicket] : []),
    waterCells: Object.freeze(waterCells),
  };
}
