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

export const SURFACE_WALL = '#';
export const SURFACE_FLOOR = '.';

/** How much of the map the rock and the thickets may take. */
export const SURFACE_COVER = Object.freeze({ min: 0.18, max: 0.34 });

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
function raiseMassif(grid, rng, { x, y, size }) {
  let cursorX = x;
  let cursorY = y;
  for (let step = 0; step < size; step += 1) {
    const radius = rng.int(1, 2);
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) + Math.abs(dy) > radius + 1) continue;
        if (inBounds(grid, cursorX + dx, cursorY + dy)) grid[cursorY + dy][cursorX + dx] = SURFACE_WALL;
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

/** Every open cell reachable from a starting one. */
export function reachableFrom(grid, start) {
  const seen = new Set();
  if (grid[start.y]?.[start.x] !== SURFACE_FLOOR) return seen;
  const queue = [start];
  seen.add(`${start.x},${start.y}`);
  while (queue.length > 0) {
    const { x, y } = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: x + dx, y: y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || grid[next.y]?.[next.x] !== SURFACE_FLOOR) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen;
}

/** A trail worn through the rock, straight and one cell wide. */
function wearTrail(grid, from, to) {
  let { x, y } = from;
  while (x !== to.x) {
    if (inBounds(grid, x, y)) grid[y][x] = SURFACE_FLOOR;
    x += x < to.x ? 1 : -1;
  }
  while (y !== to.y) {
    if (inBounds(grid, x, y)) grid[y][x] = SURFACE_FLOOR;
    y += y < to.y ? 1 : -1;
  }
  if (inBounds(grid, to.x, to.y)) grid[to.y][to.x] = SURFACE_FLOOR;
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
export function generateSurfacePlan({ rng, width, height, roomCount = 10 } = {}) {
  if (!rng || typeof rng.int !== 'function') throw new TypeError('Surface plan requires seeded RNG');
  if (width < 24 || height < 18) throw new TypeError('Surface plan needs room to breathe');
  const grid = Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => (
    x === 0 || y === 0 || x === width - 1 || y === height - 1 ? SURFACE_WALL : SURFACE_FLOOR
  )));

  // Rock and thicket first, so the huts are placed into a landscape.
  // Scaled to the map, not to a number that happened to look right once: the
  // same count on a smaller floor turns open country into a maze.
  const acres = (width * height) / 150;
  const massifs = rng.int(Math.round(acres * 0.9), Math.round(acres * 1.5));
  for (let index = 0; index < massifs; index += 1) {
    raiseMassif(grid, rng, {
      x: rng.int(2, width - 3),
      y: rng.int(2, height - 3),
      size: rng.int(2, 5),
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
  const wanted = rng.int(3, 5);
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
  for (let index = 0; index < rng.int(1, 2); index += 1) {
    const chamber = hollowCave(grid, rng, { width, height, rooms: [...rooms, ...caves], hewn });
    if (chamber) caves.push(chamber);
  }
  rooms.push(...caves);
  // A floor can come out so rocky that six clearings do not fit anywhere. Rather
  // than refuse it, the rock gives way where it is thinnest — which is what a
  // clearing is anyway.
  while (rooms.length < 6) {
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
    if (!best) throw new Error('Surface generator could not find enough open ground');
    fill(grid, best.rect, SURFACE_FLOOR);
    rooms.push(best.rect);
  }

  // Open country is connected by construction almost always — but a massif can
  // seal a hollow, and a hut can be walled in by one. Where that happened, a
  // trail is worn through.
  const centre = (room) => ({
    x: Math.floor(room.x + room.width / 2),
    y: Math.floor(room.y + room.height / 2),
  });
  const start = centre(rooms[0]);
  for (let pass = 0; pass < rooms.length; pass += 1) {
    const reached = reachableFrom(grid, start);
    const stranded = rooms.find((room) => !reached.has(`${centre(room).x},${centre(room).y}`));
    if (!stranded) break;
    wearTrail(grid, centre(stranded), start);
  }

  // Anything carved back open is no longer a wall of any kind.
  for (const set of [built, hewn]) {
    for (const key of [...set]) {
      const [x, y] = key.split(',').map(Number);
      if (grid[y]?.[x] !== SURFACE_WALL) set.delete(key);
    }
  }
  return {
    grid,
    rooms,
    structures,
    caves,
    builtWalls: Object.freeze([...built]),
    hewnWalls: Object.freeze([...hewn]),
  };
}
