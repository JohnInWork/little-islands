/**
 * The city is the one floor that is not a dungeon. It is laid out the way a
 * town is: a lattice of streets, blocks of houses between them, a plaza in the
 * middle, a few buildings the hero can actually walk into, and guards on patrol.
 *
 * Everything here is pure geometry. The module takes a random function and a
 * map size and returns a plan; the generator turns that plan into an ordinary
 * level, so the rest of the game keeps working with the grid it always had.
 */

import {
  TAVERN_ASSET_PATHS,
  TAVERN_PROPS,
  tavernHireMonsterId,
  tavernKeeperSpot,
  tavernLayout,
  tavernSeatedMercenaries,
} from './dcss-rpg-tavern.js';

/** Дрова из деревенского пакета: тот же костёр, что в лагере героя. */
const CAMP_FIRE = 'licensed/lpc-village/cut/campfire-';

/** Which floors of the run are a city. One for now, easy to move. */
/**
 * The city is not a floor of the dungeon: it is the surface above it. Depth
 * zero keeps it out of the ladder entirely, so all nine floors below stay
 * dungeon and every "on every floor" promise applies to every one of them.
 */
export const CITY_DEPTH = 0;
export const CITY_DEPTHS = Object.freeze([CITY_DEPTH]);

export function isCityDepth(depth) {
  return depth === CITY_DEPTH;
}

/**
 * A town is lit: the hero sees the street, not a torch-lit corridor.
 *
 * The multiplier does two things at once — it widens the lit pool around the
 * hero and thins the veil of darkness by the same amount. At 1.7 the city was
 * still a night: the streets had barrels, woodpiles, bushes and trees on them
 * and the player walked past most of them without ever seeing one. Decoration
 * nobody can make out is decoration nobody added.
 */
export const CITY_REVEAL_RADIUS = 9;
export const CITY_LIGHT_MULTIPLIER = 2.6;

export const CITY_WALL = '#';
export const CITY_FLOOR = '.';

/**
 * What a block can be. `plaza` and `market` are open ground, `house` is a solid
 * body of the city, and the rest are buildings with a door and a room inside.
 */
export const CITY_BLOCK_KINDS = Object.freeze([
  'plaza',
  'market',
  'shop',
  'temple',
  'barracks',
  'jail',
  'plot',
  'tavern',
  'house',
]);

/** A block is at least this big, or the lattice is not worth drawing. */
const MIN_BLOCK = Object.freeze({ width: 4, height: 4 });

function filledGrid(width, height, cell) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => cell));
}

function roll(rng, min, max) {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

function carveRect(grid, rect, cell) {
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      if (grid[y]?.[x] !== undefined) grid[y][x] = cell;
    }
  }
}

function shuffled(values, rng) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** Walkable cells reachable from a cell; a city that splits in two is a bug. */
export function reachableCells(grid, start) {
  const seen = new Set();
  if (grid[start.y]?.[start.x] !== CITY_FLOOR) return seen;
  const queue = [start];
  seen.add(`${start.x},${start.y}`);
  while (queue.length > 0) {
    const cell = queue.shift();
    for (const next of [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 },
    ]) {
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || grid[next.y]?.[next.x] !== CITY_FLOOR) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen;
}

/** The lattice: where the blocks sit once the streets have taken their cells. */
export function cityBlockRects({ area, columns, rows }) {
  const blockWidth = Math.floor((area.w - (columns + 1)) / columns);
  const blockHeight = Math.floor((area.h - (rows + 1)) / rows);
  if (blockWidth < MIN_BLOCK.width || blockHeight < MIN_BLOCK.height) return [];
  // Whatever the lattice does not use becomes a wider street on both sides,
  // so the city sits in the middle of the map instead of hugging one corner.
  const offsetX = Math.floor((area.w - (columns * blockWidth + columns + 1)) / 2);
  const offsetY = Math.floor((area.h - (rows * blockHeight + rows + 1)) / 2);
  const rects = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      rects.push({
        column,
        row,
        x: area.x + 1 + offsetX + column * (blockWidth + 1),
        y: area.y + 1 + offsetY + row * (blockHeight + 1),
        w: blockWidth,
        h: blockHeight,
      });
    }
  }
  return rects;
}

/**
 * A building fills most of its block and keeps one cell of its wall open as a
 * door. The door always faces a street, because every block is ringed by one.
 */
function buildBuilding({ grid, block, kind, rng }) {
  // The plot is the house the hero buys: it always takes its whole block, so
  // there is room for a bed, a chest and a hearth with space left to walk.
  // The tavern takes its whole block for the same reason — a common room with
  // an inset wall is a cupboard with a fireplace in it.
  const roomy = kind === 'plot' || kind === 'tavern';
  const inset = !roomy && block.w > MIN_BLOCK.width && block.h > MIN_BLOCK.height && rng() < 0.5 ? 1 : 0;
  const rect = {
    x: block.x + inset,
    y: block.y + inset,
    w: block.w - inset * 2,
    h: block.h - inset * 2,
  };
  carveRect(grid, rect, CITY_WALL);
  const interior = { x: rect.x + 1, y: rect.y + 1, w: rect.w - 2, h: rect.h - 2 };
  carveRect(grid, interior, CITY_FLOOR);
  // South doors first: an entrance the player walks past reads as an entrance.
  //
  // `axis` is the direction of PASSAGE, not the direction of the wall. That is
  // what the dungeon's own doorways mean by it, it is what the hinge and the
  // frame posts are built from, and getting it backwards turns every door leaf
  // ninety degrees: a door lying across its own wall instead of filling the
  // opening. So a door in the north or south wall is walked through along y,
  // and a door in a side wall along x.
  const candidates = [
    { x: rect.x + roll(rng, 1, rect.w - 2), y: rect.y + rect.h - 1, axis: 'y', dx: 0, dy: 1 },
    { x: rect.x + rect.w - 1, y: rect.y + roll(rng, 1, rect.h - 2), axis: 'x', dx: 1, dy: 0 },
    { x: rect.x, y: rect.y + roll(rng, 1, rect.h - 2), axis: 'x', dx: -1, dy: 0 },
    { x: rect.x + roll(rng, 1, rect.w - 2), y: rect.y, axis: 'y', dx: 0, dy: -1 },
  ];
  const door = candidates.find(({ x, y, dx, dy }) => grid[y + dy]?.[x + dx] === CITY_FLOOR);
  if (!door) {
    carveRect(grid, rect, CITY_WALL);
    return { kind: 'house', rect, door: null, interior: null };
  }
  grid[door.y][door.x] = CITY_FLOOR;
  return {
    kind,
    rect,
    door: { x: door.x, y: door.y, axis: door.axis },
    interior,
  };
}

function cellsOf(rect) {
  const cells = [];
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) cells.push({ x, y });
  }
  return cells;
}

/**
 * The whole plan. Streets are carved first and never built over, so the city is
 * connected by construction and the checker below only confirms it.
 */
export function generateCityPlan({ rng, width, height, columns = 4, rows = 3 } = {}) {
  if (typeof rng !== 'function') throw new TypeError('The city plan needs a random function');
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 20 || height < 16) {
    throw new TypeError('The city plan needs a map at least 20 by 16');
  }

  const grid = filledGrid(width, height, CITY_WALL);
  // The rock around the map is the city wall; everything inside is street.
  const area = { x: 1, y: 1, w: width - 2, h: height - 2 };
  carveRect(grid, area, CITY_FLOOR);

  const blocks = cityBlockRects({ area, columns, rows });
  if (blocks.length === 0) throw new Error('The city plan has no room for blocks');

  // The plaza sits in the middle of the lattice; the roles spread out from it.
  const centre = blocks.reduce((best, block) => {
    const score = Math.abs(block.column - (columns - 1) / 2) + Math.abs(block.row - (rows - 1) / 2);
    return score < best.score ? { block, score } : best;
  }, { block: blocks[0], score: Number.POSITIVE_INFINITY }).block;

  const others = shuffled(blocks.filter((block) => block !== centre), rng);
  // Four shops, because there are four traders and every one of them keeps a
  // shop. Two of them used to stand out on the market square with no walls
  // around them, which is a stall, not a merchant.
  // The temple is a building like any other: a door, a room, and one man in it.
  // A priest standing on the square would be a preacher, not a temple.
  // The tavern is appended rather than inserted, and that is deliberate: every
  // block before it keeps the role it had, so its door, its shop and its
  // merchant keep the ids they were saved under. One block that used to be a
  // solid body of the city becomes a building — wall turning into floor, which
  // can strand nobody.
  const roles = ['market', 'shop', 'shop', 'shop', 'shop', 'temple', 'barracks', 'jail', 'plot', 'tavern'];
  const records = [{ kind: 'plaza', rect: { ...centre }, door: null, interior: { ...centre } }];

  /**
   * The tavern is two blocks wide.
   *
   * Every other building in the city is one man behind one counter and fits
   * on a single block. The tavern is a common room: a keeper, four seated
   * mercenaries and the furniture around them, in twenty cells — which came
   * out as a cupboard nobody could walk across. «Трактир сделать больше, с
   * проходами, чтобы можно было подойти ко всем и поспрашивать.»
   *
   * So it swallows the block beside it, street between them included. The
   * block it takes is the one that would have been a solid `house` — nothing
   * stands on it and nobody walks through it, so nothing is lost and nobody
   * is stranded. When the lattice offers no neighbouring pair, the tavern
   * stays one block wide and the room is furnished as it always was.
   */
  const tavernIndex = roles.indexOf('tavern');
  const spareIndex = roles.length; // the first block with no role: a `house`
  let tavernRect = null;
  if (tavernIndex >= 0 && spareIndex < others.length) {
    const pair = (() => {
      for (let a = 0; a < others.length; a += 1) {
        for (let b = 0; b < others.length; b += 1) {
          if (a === b) continue;
          if (others[a].row !== others[b].row) continue;
          if (others[b].column - others[a].column !== 1) continue;
          return [a, b];
        }
      }
      return null;
    })();
    if (pair) {
      const [left, right] = pair;
      const hold = [others[left], others[right]];
      // Put the pair where the tavern and the spare block are dealt, keeping
      // whatever was there by swapping rather than splicing.
      const displaced = [others[tavernIndex], others[spareIndex]];
      others[tavernIndex] = hold[0];
      others[spareIndex] = hold[1];
      others[left] = displaced[0] === hold[0] ? others[left] : displaced[0];
      others[right] = displaced[1] === hold[1] ? others[right] : displaced[1];
      tavernRect = {
        column: hold[0].column,
        row: hold[0].row,
        x: hold[0].x,
        y: hold[0].y,
        w: hold[1].x + hold[1].w - hold[0].x,
        h: Math.max(hold[0].h, hold[1].h),
      };
    }
  }

  for (const [index, block] of others.entries()) {
    const kind = roles[index] ?? 'house';
    // The spare block is inside the tavern now: it is neither wall nor house.
    if (tavernRect && index === roles.length) continue;
    if (kind === 'market') {
      // An open market: no walls, just ground the stalls stand on.
      records.push({ kind, rect: { ...block }, door: null, interior: { ...block } });
      continue;
    }
    if (kind === 'house') {
      carveRect(grid, block, CITY_WALL);
      records.push({ kind, rect: { ...block }, door: null, interior: null });
      continue;
    }
    records.push(buildBuilding({ grid, block: kind === 'tavern' && tavernRect ? tavernRect : block, kind, rng }));
  }

  /**
   * Three ways out, and each one goes where it says.
   *
   * The city used to have a single gate that asked which road you wanted. A
   * staircase that asks where it leads is not a staircase, and a hero who
   * climbed up out of the caves arrived at the far side of town from the hole
   * they came out of. Now the descent is west, the road out is east, and the
   * vaults are south — three places, three destinations, like three doors.
   */
  const gateRow = centre.y + Math.floor(centre.h / 2);
  const gateColumn = centre.x + Math.floor(centre.w / 2);
  const spawn = firstStreetCell(grid, { x: area.x, y: gateRow }, 1);
  const exit = firstStreetCell(grid, { x: area.x + area.w - 1, y: gateRow }, -1);
  const vault = firstStreetCellDown(grid, { x: gateColumn, y: area.y + area.h - 1 }, -1);

  return Object.freeze({
    grid,
    area: Object.freeze({ ...area }),
    plaza: Object.freeze({ ...centre }),
    gates: Object.freeze({
      deep: Object.freeze({ ...spawn }),
      surface: Object.freeze({ ...exit }),
      vaults: Object.freeze({ ...vault }),
    }),
    blocks: Object.freeze(records.map((record) => Object.freeze({
      kind: record.kind,
      rect: Object.freeze({ ...record.rect }),
      door: record.door ? Object.freeze({ ...record.door }) : null,
      interior: record.interior ? Object.freeze({ ...record.interior }) : null,
    }))),
    spawn: Object.freeze(spawn),
    exit: Object.freeze(exit),
  });
}

/** The same walk, along a column instead of a row. */
function firstStreetCellDown(grid, from, step) {
  const { x } = from;
  let { y } = from;
  for (let guard = 0; guard < grid.length; guard += 1) {
    if (grid[y]?.[x] === CITY_FLOOR) return { x, y };
    y += step;
  }
  throw new Error('The city plan has no street on the gate column');
}

function firstStreetCell(grid, from, step) {
  let { x } = from;
  const { y } = from;
  for (let guard = 0; guard < grid[y].length; guard += 1) {
    if (grid[y]?.[x] === CITY_FLOOR) return { x, y };
    x += step;
  }
  throw new Error('The city plan has no street on the gate row');
}

/**
 * Where the merchants stand: each one inside his own shop, behind his own door.
 * The market square keeps its ground and loses its traders — a man standing in
 * the open with no walls around him is a stall, and the city has shops.
 */
/**
 * The boards inside the town's walls.
 *
 * A house with the street's own ground inside it is not a house, it is a fenced
 * piece of street — and once the town stands on earth, with trees and bushes in
 * it, an earthen floor indoors reads as a mistake rather than as poverty.
 * Every building somebody lives or works in gets a floor they laid.
 */
export function cityInteriorFloorCells(plan) {
  const cells = new Set();
  for (const block of plan?.blocks ?? []) {
    // The plaza carries an `interior` like every other block, so it was being
    // boarded like a house: Ivan found the middle of his town floored in
    // planks. A square is not a room and never had a roof.
    if (isOpenBlock(block.kind)) continue;
    const room = block.interior;
    if (!room) continue;
    const width = room.w ?? room.width;
    const height = room.h ?? room.height;
    for (let y = room.y; y < room.y + height; y += 1) {
      for (let x = room.x; x < room.x + width; x += 1) cells.add(`${x},${y}`);
    }
  }
  return cells;
}

/**
 * The green in the middle of the town.
 *
 * Ivan: «это центр города, деревянного пола там быть не должно… сделай
 * зелёную землю, чтобы там деревья росли, центральный парк». The square and
 * the market are the only open blocks, and open ground with trees on it is
 * grass, not the trodden earth of the streets around it.
 */
export function cityGreenCells(plan) {
  const cells = new Set();
  for (const block of plan?.blocks ?? []) {
    if (!isOpenBlock(block.kind)) continue;
    const area = block.interior ?? block.rect;
    if (!area) continue;
    const width = area.w ?? area.width;
    const height = area.h ?? area.height;
    for (let y = area.y; y < area.y + height; y += 1) {
      for (let x = area.x; x < area.x + width; x += 1) {
        // The stored city keeps no grid of its own — it is carved into the
        // level's — and an open block is carved open, so every cell of it is
        // ground. Filter by the grid only when somebody hands one over.
        if (plan.grid && plan.grid[y]?.[x] !== CITY_FLOOR) continue;
        cells.add(`${x},${y}`);
      }
    }
  }
  return cells;
}

/** The eight around a cell, in reading order, so the answer never wobbles. */
function neighboursOf({ x, y }) {
  const cells = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      cells.push({ x: x + dx, y: y + dy });
    }
  }
  return cells;
}

/**
 * Где стоит городской конец портала — посреди площади.
 *
 * Стоял он у ворот вниз, и это было ошибкой сразу с двух сторон. Игрок,
 * поднявшийся наверх другими воротами, находил кольцо у чужого выхода: «иду
 * как бы в другой проход, и там стоит портал, хотя его там как бы быть не
 * должно». А вернувшись в город своим порталом, он оказывался в углу и шёл
 * искать проход через весь город — Иван на этом и закончил забег: «подхожу к
 * порталу и не могу улететь обратно».
 *
 * Площадь — единственное место в городе, которое видно отовсюду и которое
 * одно. Иван: «давай сделаем, чтобы портал, который в город телепортировал
 * тебя, появлялся в центре города». Выводится из плана, а не хранится: портал
 * — это две координаты в подземелье, а эта сторона всегда одна и та же.
 */
export function cityPortalCell(level) {
  if (!Array.isArray(level?.grid)) return null;
  const площадь = level.city?.blocks?.find(({ kind }) => kind === 'plaza')?.interior ?? null;
  if (площадь) {
    const центр = {
      x: Math.floor(площадь.x + площадь.w / 2),
      y: Math.floor(площадь.y + площадь.h / 2),
    };
    if (level.grid[центр.y]?.[центр.x] === CITY_FLOOR) return центр;
    const рядом = neighboursOf(центр).find(({ x, y }) => level.grid[y]?.[x] === CITY_FLOOR);
    if (рядом) return рядом;
  }
  // План без площади — не бывает, но и падать из-за этого портал не должен.
  const gate = level?.gates?.deep;
  if (!gate) return null;
  const free = neighboursOf(gate).find(({ x, y }) => level.grid[y]?.[x] === CITY_FLOOR);
  return free ?? { x: gate.x, y: gate.y };
}

export function cityMerchantSpots(plan) {
  const spots = [];
  for (const block of plan.blocks) {
    if (block.kind === 'shop' && block.interior) {
      spots.push({ kind: 'shop', ...centreOf(block.interior) });
    }
  }
  return spots;
}

/** Стоит ли клетка внутри прямоугольника комнаты. */
function cellInside(rect, cell) {
  if (!rect || !cell) return false;
  const width = rect.w ?? rect.width;
  const height = rect.h ?? rect.height;
  return cell.x >= rect.x && cell.x < rect.x + width
    && cell.y >= rect.y && cell.y < rect.y + height;
}

function centreOf(rect) {
  return { x: rect.x + Math.floor(rect.w / 2), y: rect.y + Math.floor(rect.h / 2) };
}

/**
 * Guards walk the streets, never the insides of houses: a patrol post is a
 * street cell, and the runtime lets each guard wander around its own post.
 */
export function cityGuardPosts(plan, count = 5) {
  const streetCells = [];
  for (let y = plan.area.y; y < plan.area.y + plan.area.h; y += 1) {
    for (let x = plan.area.x; x < plan.area.x + plan.area.w; x += 1) {
      if (plan.grid[y][x] !== CITY_FLOOR) continue;
      if (insideAnyBuilding(plan, x, y)) continue;
      // A doorway is not a post: a guard standing in one corks the building.
      if (plan.blocks.some(({ door }) => door && door.x === x && door.y === y)) continue;
      streetCells.push({ x, y });
    }
  }
  if (streetCells.length === 0) return [];
  // Spread the posts evenly through the street list so the city is watched
  // everywhere rather than crowded in one quarter.
  const posts = [];
  const stride = Math.max(1, Math.floor(streetCells.length / count));
  for (let index = 0; posts.length < count && index < streetCells.length; index += stride) {
    posts.push(streetCells[index]);
  }
  // The first post is the captain's, and the captain belongs at his own door:
  // he is the desk where a fine is paid, so he has to be where it is looked for.
  const barracks = plan.blocks.find(({ kind }) => kind === 'barracks');
  if (barracks?.door && posts.length > 0) {
    const desk = streetCells.reduce((best, cell) => {
      const distance = Math.abs(cell.x - barracks.door.x) + Math.abs(cell.y - barracks.door.y);
      return distance < best.distance ? { cell, distance } : best;
    }, { cell: null, distance: Number.POSITIVE_INFINITY }).cell;
    if (desk) {
      const taken = posts.findIndex(({ x, y }) => x === desk.x && y === desk.y);
      if (taken > 0) posts.splice(taken, 1);
      if (taken !== 0) posts.unshift(desk);
    }
  }
  return posts;
}

/**
 * The room a cell belongs to, or null for the street. The runtime uses it to
 * keep a man who works indoors indoors: the city has always said the priest
 * stands in his temple and never leaves it, and until now only the generator
 * believed that — the patrol let him wander six cells in any direction, out of
 * the door and across the square. A place you can come back to has to have
 * somebody still in it.
 */
export function cityInteriorAt(plan, cell) {
  if (!plan || !cell) return null;
  const block = plan.blocks?.find(({ interior, kind }) => (
    interior
    && kind !== 'plaza'
    && kind !== 'market'
    && cell.x >= interior.x && cell.x < interior.x + interior.w
    && cell.y >= interior.y && cell.y < interior.y + interior.h
  ));
  return block ? block.interior : null;
}

/**
 * The two blocks that are not buildings. A plaza is a place, not a room, and
 * the market is the same place with stalls on it.
 */
export const CITY_OPEN_BLOCK_KINDS = Object.freeze(['plaza', 'market']);

const isOpenBlock = (kind) => CITY_OPEN_BLOCK_KINDS.includes(kind);

function insideAnyBuilding(plan, x, y) {
  return plan.blocks.some(({ interior, kind }) => (
    interior
    && !isOpenBlock(kind)
    && x >= interior.x && x < interior.x + interior.w
    && y >= interior.y && y < interior.y + interior.h
  ));
}

/** Every open cell of the plan, for the checks the generator runs once. */
export function cityFloorCells(plan) {
  return cellsOf(plan.area).filter(({ x, y }) => plan.grid[y][x] === CITY_FLOOR);
}

/**
 * The city's rooms: every block is a room, so fog, minimap and the runtime see
 * the same rectangles they see in a dungeon. Streets belong to no room, which
 * is exactly how a town works.
 */
export function cityRooms(plan) {
  return plan.blocks.map(({ rect }) => ({
    x: rect.x,
    y: rect.y,
    width: rect.w,
    height: rect.h,
  }));
}

/** The two guards' ranks: a watchman on the street, a captain by the barracks. */
export const CITY_GUARD_ID = 'city-guard';
export const CITY_CAPTAIN_ID = 'city-captain';
/** And the one man who is not the watch: the priest, inside the temple. */
export const CITY_PRIEST_ID = 'city-priest';
/** And the one who does not live here at all: the recruiter on the market. */
export const CITY_RECRUITER_ID = 'city-recruiter';
/** And the one who is selling the empty house and leaves once he has. */
export const CITY_BROKER_ID = 'city-broker';

/** The tavern block, when the plan had room for one. */
export function cityTavernBlock(plan) {
  return plan.blocks.find(({ kind, interior }) => kind === 'tavern' && interior) ?? null;
}

/**
 * Where hires are taken. The keeper stands at his own counter now: a man with
 * a hiring board on an open square is a recruiter, and the place you actually
 * meet people who will walk down a hole for money is a tavern. The market is
 * kept as the fallback, so a plan with no room for a tavern can still hire.
 */
export function cityRecruiterSpot(plan) {
  const tavern = cityTavernBlock(plan);
  const keeper = tavern
    ? tavernKeeperSpot({ interior: tavern.interior, door: tavern.door })
    : null;
  if (keeper) return keeper;
  const market = plan.blocks.find(({ kind, interior }) => kind === 'market' && interior);
  return market ? centreOf(market.interior) : null;
}

/** Who is sitting in the common room, and where, before anyone buys them. */
export function cityTavernHires(plan) {
  const tavern = cityTavernBlock(plan);
  if (!tavern) return [];
  return tavernSeatedMercenaries({ interior: tavern.interior, door: tavern.door });
}

/** Where the priest stands. Null when a small plan had no room for a temple. */
export function cityTempleSpot(plan) {
  const block = plan.blocks.find(({ kind, interior }) => kind === 'temple' && interior);
  return block ? centreOf(block.interior) : null;
}

/**
 * Где стоит маклер: внутри пустого дома, а не у его двери.
 *
 * Иван: «пусть будет какой-нибудь NPC в доме в этом стоять, ты к нему
 * подходишь, говоришь, и он тебе как бы продаёт этот дом». Внутри — это и есть
 * показ дома: чтобы поговорить о покупке, надо зайти и увидеть, что покупаешь.
 * У маленького плана дома может не быть вовсе, и тогда маклера тоже нет.
 */
export function cityHousePlotSpot(plan) {
  const block = plan.blocks.find(({ kind, interior }) => kind === 'plot' && interior);
  return block ? centreOf(block.interior) : null;
}

/**
 * Куда маклер уходит, продав дом.
 *
 * Не исчезает на месте: человек, растворившийся в воздухе посреди комнаты, —
 * это сбой, а не сделка. Ближайшие к дому ворота — то место, откуда он в этот
 * город пришёл и куда уйдёт с деньгами.
 */
export function cityDepartureCell(gates, from) {
  const выходы = Object.values(gates ?? {}).filter(Boolean);
  if (выходы.length === 0 || !from) return null;
  let ближайшие = null;
  let лучшее = Infinity;
  for (const gate of выходы) {
    const цена = Math.abs(gate.x - from.x) + Math.abs(gate.y - from.y);
    if (цена < лучшее) {
      лучшее = цена;
      ближайшие = gate;
    }
  }
  return ближайшие ? { x: ближайшие.x, y: ближайшие.y } : null;
}

const MERCHANT_VARIANT_ORDER = Object.freeze(['provisioner', 'armourer', 'relic-dealer']);

/**
 * Assembles a whole floor out of the plan. The shape is the same as any
 * dungeon floor, because everything downstream reads that shape: grid, rooms,
 * spawn, exit, doors, monsters, merchants.
 */
export function buildCityFloor({ plan, depth, seed, width, height, scaling, rng }) {
  const grid = plan.grid.map((row) => [...row]);
  const rooms = cityRooms(plan);

  const doors = [];
  for (const [index, block] of plan.blocks.entries()) {
    if (!block.door) continue;
    grid[block.door.y][block.door.x] = 'D';
    doors.push(Object.freeze({
      instanceId: `door-${depth}-${doors.length}`,
      x: block.door.x,
      y: block.door.y,
      axis: block.door.axis,
      roomIndex: index,
      surpriseId: null,
    }));
  }

  /*
   * Торговцев в городе столько, сколько ремёсел, и все разные.
   *
   * Лавок план ставит четыре, а ремесла три — и четвёртая заворачивалась на
   * первое: в городе всегда оказывалось два снабженца. Иван: «в городе
   * заспаунилось два снабженца, кажется, это неправильно; пусть будет по
   * одному торговцу, пусть они не повторяются».
   *
   * Лишняя лавка теперь остаётся домом без торговли — и без вывески: вывеска
   * читается у того, кто за прилавком, а не считается отдельно. Раньше они
   * считались порознь, и стоило одной лавке не получить торговца, как вывески
   * разъезжались со своими хозяевами — отсюда и дом с вывеской кузнеца, в
   * котором никого нет.
   */
  const merchants = [];
  for (const spot of cityMerchantSpots(plan)) {
    if (roomIndexAt(rooms, spot) < 0) continue;
    if (merchants.length >= MERCHANT_VARIANT_ORDER.length) break;
    const stall = merchants.length;
    merchants.push({ roomIndex: stall, variantId: MERCHANT_VARIANT_ORDER[stall], x: spot.x, y: spot.y });
  }

  const monsters = [];
  const posts = cityGuardPosts(plan, 5);
  for (const [index, post] of posts.entries()) {
    monsters.push(Object.freeze({
      instanceId: `monster-${depth}-${index}`,
      id: index === 0 ? CITY_CAPTAIN_ID : CITY_GUARD_ID,
      x: post.x,
      y: post.y,
      post: Object.freeze({ ...post }),
    }));
  }
  // The priest keeps his own post and never leaves it: the temple is where the
  // altar is, and a man who wanders is not somewhere you can come back to.
  const recruiter = cityRecruiterSpot(plan);
  if (recruiter && roomIndexAt(rooms, recruiter) >= 0) {
    monsters.push(Object.freeze({
      instanceId: `monster-${depth}-${monsters.length}`,
      id: CITY_RECRUITER_ID,
      x: recruiter.x,
      y: recruiter.y,
      post: Object.freeze({ ...recruiter }),
    }));
  }
  const temple = cityTempleSpot(plan);
  if (temple) {
    monsters.push(Object.freeze({
      instanceId: `monster-${depth}-${monsters.length}`,
      id: CITY_PRIEST_ID,
      x: temple.x,
      y: temple.y,
      post: Object.freeze({ ...temple }),
    }));
  }
  // Маклер стоит в пустом доме, пока дом пустой. Этаж не знает, куплен ли он —
  // это состояние забега, — поэтому маклер в плане есть всегда, а вычёркивает
  // его `run.floor.defeated`, тот же список, которым таверна убирает нанятого.
  const plot = cityHousePlotSpot(plan);
  if (plot && roomIndexAt(rooms, plot) >= 0) {
    monsters.push(Object.freeze({
      instanceId: `monster-${depth}-${monsters.length}`,
      id: CITY_BROKER_ID,
      x: plot.x,
      y: plot.y,
      post: Object.freeze({ ...plot }),
    }));
  }
  // The common room. Four hires sit at the tables until somebody buys one, and
  // they are appended last on purpose: every id above them keeps its number,
  // so a floor saved before the tavern existed still knows who it had beaten.
  for (const hire of cityTavernHires(plan)) {
    if (roomIndexAt(rooms, hire) < 0) continue;
    monsters.push(Object.freeze({
      instanceId: `monster-${depth}-${monsters.length}`,
      id: tavernHireMonsterId(hire.mercenaryId),
      x: hire.x,
      y: hire.y,
      post: Object.freeze({ x: hire.x, y: hire.y }),
    }));
  }

  return {
    grid,
    rooms,
    city: Object.freeze({
      area: plan.area,
      plaza: plan.plaza,
      blocks: plan.blocks,
    }),
    doors: Object.freeze(doors),
    merchants,
    monsters: Object.freeze(monsters),
    spawn: { ...plan.spawn },
    exit: { ...plan.exit },
    gates: Object.freeze({
      deep: Object.freeze({ ...plan.gates.deep }),
      surface: Object.freeze({ ...plan.gates.surface }),
      vaults: Object.freeze({ ...plan.gates.vaults }),
    }),
    sanctuary: cityShrineCell(plan),
  };
}

function roomIndexAt(rooms, cell) {
  return rooms.findIndex((room) => (
    cell.x >= room.x && cell.x < room.x + room.width
    && cell.y >= room.y && cell.y < room.y + room.height
  ));
}

/** The shrine stands on the plaza, where a town puts the thing it prays to. */
export function cityShrineCell(plan) {
  const plaza = plan.plaza;
  return { x: plaza.x + Math.floor(plaza.w / 2), y: plaza.y + Math.floor(plaza.h / 2) };
}

/** The city's own furniture. The dungeon's prop builder never sees this floor. */
const VILLAGE = 'licensed/lpc-village/cut/';
const LAMPS = 'licensed/lpc-lamps/posts/';

const CITY_PROPS = Object.freeze({
  fountain: Object.freeze({
    path: 'dngn/blue_fountain.png',
    frames: Object.freeze(['dngn/blue_fountain.png', 'dngn/blue_fountain2.png']),
    size: 66,
    screenOffsetY: -8,
    light: null,
    interactionId: null,
  }),
  statue: Object.freeze({
    path: 'dngn/statues/statue_ancient_hero.png',
    frames: Object.freeze(['dngn/statues/statue_ancient_hero.png']),
    size: 70,
    screenOffsetY: -12,
    light: null,
    interactionId: null,
  }),
  /*
   * Деревья в городе зелёные, и их три.
   *
   * Стояла одна осенняя жёлтая крона, и стояла она везде: на площади дважды,
   * на каждом третьем углу — один и тот же силуэт, да ещё жёлтый посреди
   * города, который Иван захотел зелёным. Зелёных крон в наборе ровно три —
   * мангры, — и город берёт все три: сквер перестаёт быть двумя копиями
   * одного дерева.
   */
  tree: Object.freeze({
    path: 'dngn/trees/mangrove1.png',
    frames: Object.freeze(['dngn/trees/mangrove1.png']),
    size: 78,
    screenOffsetY: -16,
    light: null,
    interactionId: null,
  }),
  treeBroad: Object.freeze({
    path: 'dngn/trees/mangrove2.png',
    frames: Object.freeze(['dngn/trees/mangrove2.png']),
    size: 80,
    screenOffsetY: -18,
    light: null,
    interactionId: null,
  }),
  treeOld: Object.freeze({
    path: 'dngn/trees/mangrove3.png',
    frames: Object.freeze(['dngn/trees/mangrove3.png']),
    size: 76,
    screenOffsetY: -16,
    light: null,
    interactionId: null,
  }),
  bush: Object.freeze({
    path: 'mon/fungi_plants/bush2.png',
    frames: Object.freeze(['mon/fungi_plants/bush2.png']),
    size: 58,
    screenOffsetY: -4,
    light: null,
    interactionId: null,
  }),
  // Кустов тоже три вида: один куст на весь город читается как декорация,
  // расставленная по линейке, а не как то, что вокруг домов растёт само.
  bushBroad: Object.freeze({
    path: 'mon/fungi_plants/bush3.png',
    frames: Object.freeze(['mon/fungi_plants/bush3.png']),
    size: 60,
    screenOffsetY: -4,
    light: null,
    interactionId: null,
  }),
  bushLow: Object.freeze({
    path: 'mon/fungi_plants/bush4.png',
    frames: Object.freeze(['mon/fungi_plants/bush4.png']),
    size: 54,
    screenOffsetY: -2,
    light: null,
    interactionId: null,
  }),
  stall: Object.freeze({
    path: 'dngn/shops/shop_gadgets.png',
    frames: Object.freeze(['dngn/shops/shop_gadgets.png']),
    size: 66,
    screenOffsetY: -10,
    light: null,
    interactionId: null,
  }),
  /*
   * Очаг на площади — деревянный костёр, а не алтарь.
   *
   * Здесь горел `makhleb_flame` — столб огня на каменном постаменте из
   * Dungeon Crawl. Лагерь героя от него уже избавили («костёр каменный, а
   * нужен обычный деревянный с дровами»), а город остался с алтарём посреди
   * улицы. Каменный огонь при этом никуда не делся: он по-прежнему горит там,
   * где к месту, — у святилищ, рун и идолов.
   */
  hearth: Object.freeze({
    path: `${CAMP_FIRE}1.png`,
    frames: Object.freeze(Array.from({ length: 5 }, (_, index) => `${CAMP_FIRE}${index + 1}.png`)),
    size: 64,
    screenOffsetY: -10,
    light: Object.freeze({ color: '#e0a44f', radius: 2.6, beam: false, flame: true }),
    interactionId: 'campfire',
  }),
  lamp: Object.freeze({
    // The path is replaced per city by `cityLampPath`; this is the fallback a
    // town with no palette would get, and it is a lamp either way.
    path: `${LAMPS}lamp-1-post-1/lamp-1-post-1-tall-single.png`,
    frames: Object.freeze([`${LAMPS}lamp-1-post-1/lamp-1-post-1-tall-single.png`]),
    size: 72,
    screenOffsetY: -30,
    // A street lamp that lights two cells lights the post it stands on. Its
    // reach is most of the way to the next corner, which is what a lamp on a
    // corner is for.
    light: Object.freeze({ color: '#f0c079', radius: 3.8, beam: false, flame: true }),
    interactionId: null,
  }),
  anvil: Object.freeze({
    path: `${VILLAGE}anvil-stump.png`,
    frames: Object.freeze([`${VILLAGE}anvil-stump.png`]),
    size: 52, screenOffsetY: -8, light: null, interactionId: null,
  }),
  anvilTools: Object.freeze({
    path: `${VILLAGE}anvil-tools.png`,
    frames: Object.freeze([`${VILLAGE}anvil-tools.png`]),
    size: 52, screenOffsetY: -8, light: null, interactionId: null,
  }),
  crate: Object.freeze({
    path: `${VILLAGE}crate.png`,
    frames: Object.freeze([`${VILLAGE}crate.png`]),
    size: 66, screenOffsetY: -6, light: null, interactionId: null,
  }),
  hay: Object.freeze({
    path: `${VILLAGE}hay-bale.png`,
    frames: Object.freeze([`${VILLAGE}hay-bale.png`]),
    size: 56, screenOffsetY: -6, light: null, interactionId: null,
  }),
  woodpile: Object.freeze({
    path: `${VILLAGE}woodpile-tall.png`,
    frames: Object.freeze([`${VILLAGE}woodpile-tall.png`]),
    size: 60, screenOffsetY: -14, light: null, interactionId: null,
  }),
  cart: Object.freeze({
    path: `${VILLAGE}cart.png`,
    frames: Object.freeze([`${VILLAGE}cart.png`]),
    size: 72, screenOffsetY: -10, light: null, interactionId: null,
  }),
  stumpBlock: Object.freeze({
    path: `${VILLAGE}stump.png`,
    frames: Object.freeze([`${VILLAGE}stump.png`]),
    size: 48, screenOffsetY: -4, light: null, interactionId: null,
  }),
});

/**
 * What stands on a street corner. The city used to put one lamp on one corner
 * of every block and call that a town; a street with nothing on it but a lamp
 * reads as a corridor with better lighting. These are the things people leave
 * outside their own walls, and each block draws from the list by its own index
 * so the same city furnishes itself the same way every time.
 */
const CITY_STREET_PROPS = Object.freeze([
  TAVERN_PROPS.barrels,
  CITY_PROPS.bush,
  TAVERN_PROPS.woodpile,
  CITY_PROPS.treeBroad,
  TAVERN_PROPS.casks,
  CITY_PROPS.bushLow,
  CITY_PROPS.tree,
  TAVERN_PROPS.logs,
  CITY_PROPS.bushBroad,
  TAVERN_PROPS.basket,
  CITY_PROPS.treeOld,
  TAVERN_PROPS.keg,
]);

/** What a working building keeps indoors, by what the building is for. */
const CITY_INTERIOR_PROPS = Object.freeze({
  shop: Object.freeze([TAVERN_PROPS.bar, TAVERN_PROPS.casks, TAVERN_PROPS.basket]),
  temple: Object.freeze([TAVERN_PROPS.candelabra, TAVERN_PROPS.candles, TAVERN_PROPS.book]),
  barracks: Object.freeze([TAVERN_PROPS.bench, TAVERN_PROPS.barrels, TAVERN_PROPS.chessboard]),
  jail: Object.freeze([TAVERN_PROPS.jug, TAVERN_PROPS.woodpile]),
});

/**
 * What a tradesman leaves outside his own door.
 *
 * Ivan: «у бронника наковальню можно поставить, и ещё что по смыслу
 * подходит». A door with an anvil beside it says what is behind it before the
 * sign does — and says it from further away, because the sign is small.
 */
const CITY_TRADE_PROPS = Object.freeze({
  armourer: Object.freeze([CITY_PROPS.anvil, CITY_PROPS.anvilTools, CITY_PROPS.stumpBlock]),
  'relic-dealer': Object.freeze([CITY_PROPS.crate, TAVERN_PROPS.basket, CITY_PROPS.stumpBlock]),
  provisioner: Object.freeze([CITY_PROPS.crate, CITY_PROPS.hay, TAVERN_PROPS.basket]),
  temple: Object.freeze([CITY_PROPS.bush, TAVERN_PROPS.candles]),
  barracks: Object.freeze([CITY_PROPS.woodpile, TAVERN_PROPS.barrels]),
  jail: Object.freeze([CITY_PROPS.woodpile, CITY_PROPS.stumpBlock]),
  tavern: Object.freeze([TAVERN_PROPS.keg, TAVERN_PROPS.barrels, CITY_PROPS.cart]),
  market: Object.freeze([CITY_PROPS.cart, CITY_PROPS.hay, CITY_PROPS.crate]),
});

/**
 * The square: grass, the paths worn across it, and a few flowers where nobody
 * walks. Mostly mixed tiles, so the green reads as a common people cross
 * rather than a lawn somebody mows.
 */
/**
 * One lamp for a whole town.
 *
 * Ivan: «фонари на каждый город свои, и чтобы подходили под цвет стен — а
 * форма случайная на город, а не так что один фонарь в городе такой, а другой
 * такой». Both halves matter. A street where every post is a different post is
 * not a street somebody built, it is a catalogue; and a blue lamp on a brown
 * wall is two decisions arguing. So the shape is drawn once, from the town's
 * own seed, and the colour is read off the walls.
 */
const LAMP_SHAPES = Object.freeze([
  'lamp-1-post-1-tall-single', 'lamp-1-post-1-short-single',
  'lamp-1-post-2-tall-single', 'lamp-1-post-2-short-single',
  'lamp-2-post-1-tall-single', 'lamp-2-post-1-short-single',
  // `lamp-2-post-2` ships short only: the pack has no tall version of it, and
  // a path to a picture that does not exist is the bug that froze the city.
  'lamp-2-post-2-short-single',
]);

/**
 * Which of the three metals a palette asks for. Warm stone takes bronze, cold
 * stone takes blue, and everything else keeps the iron grey the pack ships as
 * its default — a lamp is not supposed to be the brightest thing on a street.
 */
const LAMP_METAL_BY_PALETTE = Object.freeze({
  town: 'bronze', hamlet: 'bronze', loam: 'bronze', ochre: 'bronze',
  autumn: 'bronze', ember: 'bronze', magma: 'bronze', scorch: 'bronze',
  sepia: 'bronze', viscera: 'bronze',
  frost: 'blue', ice: 'blue', cobalt: 'blue', prism: 'blue',
  verdigris: 'blue', dusk: 'blue', bog: 'blue',
});

export function cityLampPath({ seed = 0, palette = 'town' } = {}) {
  const shape = LAMP_SHAPES[Math.abs(Number.isFinite(seed) ? seed : 0) % LAMP_SHAPES.length];
  const metal = LAMP_METAL_BY_PALETTE[palette] ?? '';
  const post = shape.slice(0, shape.indexOf('-tall') > 0 ? shape.indexOf('-tall') : shape.indexOf('-short'));
  return `${LAMPS}${post}/${shape}${metal ? `-${metal}` : ''}.png`;
}

/**
 * A sign over every door, and the right sign.
 *
 * The town had one picture for every shop in it — `shop_gadgets.png`, which is
 * the only shop tile Dungeon Crawl owns. A blade over the armourer and a loaf
 * over the provisioner is the cheapest thing a town can do to stop being a
 * grid of identical boxes.
 */
export const CITY_SIGN_PATHS = Object.freeze({
  armourer: `${VILLAGE}sign-smith.png`,
  'relic-dealer': `${VILLAGE}sign-jewellery.png`,
  provisioner: `${VILLAGE}sign-bread.png`,
  temple: `${VILLAGE}sign-book.png`,
  barracks: `${VILLAGE}sign-blade.png`,
  tavern: `${VILLAGE}sign-inn.png`,
  jail: `${VILLAGE}sign-blank.png`,
  plot: `${VILLAGE}sign-blank.png`,
  market: `${VILLAGE}sign-jar.png`,
});

/** Market stalls, both of the ones that come with a counter. */
export const CITY_STALL_PATHS = Object.freeze([
  `${VILLAGE}stall-grey.png`,
  `${VILLAGE}stall-red.png`,
]);

export const CITY_GREEN_PATHS = Object.freeze([
  /*
   * Одна трава на весь сквер.
   *
   * Тут была смесь: основная трава, пара оттенков посветлее и цветы «для
   * разнообразия», — и на глаз это складывалось не в лужайку, а в шахматную
   * доску из квадратов разной яркости. Иван, увидев её на телефоне: «мне не
   * нравится этот непонятный зелёный квадрат, давай везде одну текстуру, не
   * надо этих изъёбов». Он прав: пёстрый пол в центре города спорит со всем,
   * что на нём стоит, — с фонтаном, с деревьями, с памятником.
   */
  'dngn/floor/grass/grass0.png',
]);

/**
 * The three ways out of town, and the pictures that stand on them.
 *
 * These lived in the adapter as bare strings and were in no asset list at
 * all: the «вниз» gate only ever loaded because the dungeon's own down stair
 * happened to use the same file, and «наружу» never loaded at all. An actor
 * whose picture is missing used to throw from inside the render — every
 * frame, from the moment it came into view — so the town froze for Ivan while
 * his backpack kept opening. The picture belongs next to the gate it stands
 * on, and in the list that loads it.
 */
export const CITY_GATE_PATHS = Object.freeze({
  deep: 'dngn/gateways/enter_depths.png',
  surface: 'dngn/gateways/stone_arch.png',
  vaults: 'dngn/gateways/enter_vaults_open.png',
});

/** Every lamp the seed and the palettes can choose between. */
const CITY_LAMP_PATHS = Object.freeze([
  ...new Set(
    ['town', 'frost', 'slate'].flatMap((palette) => (
      LAMP_SHAPES.map((_, seed) => cityLampPath({ seed, palette }))
    )),
  ),
]);

export const CITY_ASSET_PATHS = Object.freeze([
  ...new Set([
    ...Object.values(CITY_PROPS).flatMap(({ frames }) => frames),
    ...TAVERN_ASSET_PATHS,
    ...CITY_GREEN_PATHS,
    ...Object.values(CITY_GATE_PATHS),
    ...Object.values(CITY_SIGN_PATHS),
    ...CITY_STALL_PATHS,
    ...CITY_LAMP_PATHS,
  ]),
]);

/**
 * The city's props: a fountain and trees on the plaza, stalls and a hearth on
 * the market, lamps along the streets. Placement is derived from the plan, so
 * the same city always furnishes itself the same way.
 */
export function createCityEnvironment(level) {
  const plan = level.city;
  if (!plan) throw new Error('A city floor carries its own plan');
  const reserved = new Set([
    cellKey(level.spawn),
    cellKey(level.exit),
    ...(level.sanctuary ? [cellKey(level.sanctuary)] : []),
    ...level.merchants.map(cellKey),
    ...level.monsters.map(cellKey),
    ...level.doors.flatMap((door) => [
      cellKey(door),
      `${door.x + 1},${door.y}`,
      `${door.x - 1},${door.y}`,
      `${door.x},${door.y + 1}`,
      `${door.x},${door.y - 1}`,
    ]),
  ]);
  const props = [];
  /**
   * `hangs` is for the things that are not on the ground: a sign over a door
   * takes the doorway's cell, which is reserved precisely so nothing stands in
   * it. Nothing stands in it — the sign is above head height.
   */
  const place = (visual, cell, roomIndex, { hangs = false } = {}) => {
    if (!visual) return;
    const key = cellKey(cell);
    if (!hangs && reserved.has(key)) return;
    if (!hangs && level.grid[cell.y]?.[cell.x] !== CITY_FLOOR) return;
    if (!hangs) reserved.add(key);
    props.push(Object.freeze({
      id: `environment-${level.depth}-${roomIndex}-${props.length}`,
      themeId: 'gate-town',
      // A hanging thing is over the cell, not on it: it may share a doorway,
      // and nothing should draw a shadow under it.
      hangs,
      ...visual,
      gridX: cell.x,
      gridY: cell.y,
      x: cell.x + 0.5,
      y: cell.y + 0.5,
      phase: props.length * 0.37,
    }));
  };

  // One lamp for the whole town, drawn from its own seed and coloured by the
  // walls it stands against; and a counter of shops, so the first is the
  // provisioner, the second the armourer, the third the relic dealer — the
  // same order the merchants themselves are dealt in.
  const lamp = Object.freeze({
    ...CITY_PROPS.lamp,
    path: cityLampPath({ seed: level.seed ?? 0, palette: 'town' }),
    frames: Object.freeze([cityLampPath({ seed: level.seed ?? 0, palette: 'town' })]),
  });
  const signVisual = (path) => Object.freeze({
    path, frames: Object.freeze([path]),
    // Над притолокой, не на ней: вывеска должна читаться, не споря с дверью.
    size: 52, screenOffsetY: -48, light: null, interactionId: null,
  });
  const stallVisual = (path) => Object.freeze({
    path, frames: Object.freeze([path]),
    size: 74, screenOffsetY: -26, light: null, interactionId: null,
  });

  for (const [roomIndex, block] of plan.blocks.entries()) {
    const { rect, kind } = block;
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.w - 1, y: rect.y },
      { x: rect.x, y: rect.y + rect.h - 1 },
      { x: rect.x + rect.w - 1, y: rect.y + rect.h - 1 },
    ];
    if (kind === 'plaza') {
      place(CITY_PROPS.fountain, { x: rect.x + 1, y: rect.y + 1 }, roomIndex);
      place(CITY_PROPS.statue, { x: rect.x + rect.w - 2, y: rect.y + rect.h - 2 }, roomIndex);
      place(CITY_PROPS.tree, corners[1], roomIndex);
      place(CITY_PROPS.treeBroad, corners[2], roomIndex);
      place(CITY_PROPS.bushBroad, corners[3], roomIndex);
      continue;
    }
    if (kind === 'market') {
      place(CITY_PROPS.hearth, { x: rect.x + Math.floor(rect.w / 2), y: rect.y }, roomIndex);
      // Both stalls the pack ships with a counter, so the market is a market
      // and not the same awning twice.
      place(stallVisual(CITY_STALL_PATHS[0]), corners[0], roomIndex);
      place(stallVisual(CITY_STALL_PATHS[1]), corners[3], roomIndex);
      place(CITY_PROPS.treeOld, corners[1], roomIndex);
      placeAlongStreet(place, rect, roomIndex, lamp);
      continue;
    }
    if (kind === 'tavern' && block.interior) {
      for (const piece of tavernLayout({ interior: block.interior, door: block.door })) {
        place(TAVERN_PROPS[piece.kind], piece, roomIndex);
      }
    } else if (block.interior && CITY_INTERIOR_PROPS[kind]) {
      // Every other working building used to be four walls around one man.
      // Two or three things he keeps indoors say more about what he does than
      // the sign over his door, which the city does not have.
      const indoors = CITY_INTERIOR_PROPS[kind];
      const inside = block.interior;
      const spots = [
        { x: inside.x, y: inside.y },
        { x: inside.x + inside.w - 1, y: inside.y },
        { x: inside.x, y: inside.y + inside.h - 1 },
        { x: inside.x + inside.w - 1, y: inside.y + inside.h - 1 },
      ];
      for (const [index, visual] of indoors.entries()) {
        place(visual, spots[(roomIndex + index) % spots.length], roomIndex);
      }
    }
    // The sign over the door, and the two or three things the trade behind it
    // leaves out in the street. A shop that says what it sells from across the
    // square is a shop the player walks to on purpose.
    // Ремесло дома — то, чем торгует стоящий в нём человек. Нет человека —
    // нет и ремесла: дом остаётся жилым, и вывески над ним не будет.
    const хозяин = kind === 'shop'
      ? (level.merchants ?? []).find((merchant) => cellInside(block.interior, merchant))
      : null;
    const trade = kind === 'shop' ? хозяин?.variantId ?? null : kind;
    if (block.door && CITY_SIGN_PATHS[trade]) {
      place(signVisual(CITY_SIGN_PATHS[trade]), block.door, roomIndex, { hangs: true });
    }
    for (const [index, visual] of (CITY_TRADE_PROPS[trade] ?? []).entries()) {
      place(visual, { x: rect.x + index, y: rect.y + rect.h }, roomIndex);
    }
    // A lamp on the street corner of every block, so the city is lit at night,
    // and then the things people actually leave outside their own walls.
    place(lamp, { x: rect.x - 1, y: rect.y - 1 }, roomIndex);
    placeAlongStreet(place, rect, roomIndex, lamp);
  }

  // Cooking needs a fire the hero can reach; the market hearth is that fire.
  if (!props.some(({ interactionId }) => interactionId === 'campfire')) {
    const fallback = cityFloorCells({ ...plan, grid: level.grid })
      .find((cell) => !reserved.has(cellKey(cell)));
    if (!fallback) throw new Error('The city has nowhere to put a hearth');
    place(CITY_PROPS.hearth, fallback, 0);
  }

  return Object.freeze({
    props: Object.freeze(props),
    floorAccents: Object.freeze([]),
    roomThemes: Object.freeze(plan.blocks.map(({ kind }) => `gate-town-${kind}`)),
  });
}

/**
 * The three street corners the lamp does not take. Which prop lands on which
 * corner is decided by the block's own index, so it is the same city twice and
 * two neighbouring blocks never put out the same three things.
 */
function placeAlongStreet(place, rect, roomIndex, lamp = CITY_PROPS.lamp) {
  // The far corner gets a second lamp. One lamp a block was enough to say the
  // city is lit; it is not enough to see the city by, and a street dressed with
  // barrels and woodpiles nobody can make out at night is a street with nothing
  // on it. Two diagonal lamps put light on both ends of every block.
  place(lamp, { x: rect.x + rect.w, y: rect.y + rect.h }, roomIndex);
  const outside = [
    { x: rect.x + rect.w, y: rect.y - 1 },
    { x: rect.x - 1, y: rect.y + rect.h },
    { x: rect.x + rect.w, y: rect.y + rect.h },
  ];
  for (const [index, cell] of outside.entries()) {
    const visual = CITY_STREET_PROPS[(roomIndex * 3 + index) % CITY_STREET_PROPS.length];
    place(visual, cell, roomIndex);
  }
}

function cellKey({ x, y }) {
  return `${x},${y}`;
}
