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

/** A town is lit: the hero sees the street, not a torch-lit corridor. */
export const CITY_REVEAL_RADIUS = 9;
export const CITY_LIGHT_MULTIPLIER = 1.7;

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

  for (const [index, block] of others.entries()) {
    const kind = roles[index] ?? 'house';
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
    records.push(buildBuilding({ grid, block, kind, rng }));
  }

  const gateRow = centre.y + Math.floor(centre.h / 2);
  const spawn = firstStreetCell(grid, { x: area.x, y: gateRow }, 1);
  const exit = firstStreetCell(grid, { x: area.x + area.w - 1, y: gateRow }, -1);

  return Object.freeze({
    grid,
    area: Object.freeze({ ...area }),
    plaza: Object.freeze({ ...centre }),
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
export function cityMerchantSpots(plan) {
  const spots = [];
  for (const block of plan.blocks) {
    if (block.kind === 'shop' && block.interior) {
      spots.push({ kind: 'shop', ...centreOf(block.interior) });
    }
  }
  return spots;
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

function insideAnyBuilding(plan, x, y) {
  return plan.blocks.some(({ interior, kind }) => (
    interior
    && kind !== 'plaza'
    && kind !== 'market'
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

  const merchants = [];
  for (const spot of cityMerchantSpots(plan)) {
    if (roomIndexAt(rooms, spot) < 0) continue;
    // Two stalls can share a block, so a trader is numbered by its own stall,
    // not by the room it stands in: the number keys its id, stock and prices.
    const stall = merchants.length;
    const variantId = MERCHANT_VARIANT_ORDER[stall % MERCHANT_VARIANT_ORDER.length];
    merchants.push({ roomIndex: stall, variantId, x: spot.x, y: spot.y });
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
  tree: Object.freeze({
    path: 'dngn/trees/tree1_yellow.png',
    frames: Object.freeze(['dngn/trees/tree1_yellow.png']),
    size: 78,
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
  stall: Object.freeze({
    path: 'dngn/shops/shop_gadgets.png',
    frames: Object.freeze(['dngn/shops/shop_gadgets.png']),
    size: 66,
    screenOffsetY: -10,
    light: null,
    interactionId: null,
  }),
  hearth: Object.freeze({
    path: 'dngn/altars/makhleb_flame1.png',
    frames: Object.freeze(Array.from({ length: 8 }, (_, index) => `dngn/altars/makhleb_flame${index + 1}.png`)),
    size: 64,
    screenOffsetY: -10,
    light: Object.freeze({ color: '#e0a44f', radius: 2.6, beam: false }),
    interactionId: 'campfire',
  }),
  lamp: Object.freeze({
    path: 'dngn/altars/makhleb_flame3.png',
    frames: Object.freeze(Array.from({ length: 8 }, (_, index) => `dngn/altars/makhleb_flame${index + 1}.png`)),
    size: 46,
    screenOffsetY: -22,
    light: Object.freeze({ color: '#f0c079', radius: 2.2, beam: false }),
    interactionId: null,
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
  TAVERN_PROPS.casks,
  CITY_PROPS.tree,
  TAVERN_PROPS.logs,
  TAVERN_PROPS.basket,
  TAVERN_PROPS.keg,
]);

/** What a working building keeps indoors, by what the building is for. */
const CITY_INTERIOR_PROPS = Object.freeze({
  shop: Object.freeze([TAVERN_PROPS.bar, TAVERN_PROPS.casks, TAVERN_PROPS.basket]),
  temple: Object.freeze([TAVERN_PROPS.candelabra, TAVERN_PROPS.candles, TAVERN_PROPS.book]),
  barracks: Object.freeze([TAVERN_PROPS.bench, TAVERN_PROPS.barrels, TAVERN_PROPS.chessboard]),
  jail: Object.freeze([TAVERN_PROPS.jug, TAVERN_PROPS.woodpile]),
});

export const CITY_ASSET_PATHS = Object.freeze([
  ...new Set([
    ...Object.values(CITY_PROPS).flatMap(({ frames }) => frames),
    ...TAVERN_ASSET_PATHS,
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
  const place = (visual, cell, roomIndex) => {
    if (!visual) return;
    const key = cellKey(cell);
    if (reserved.has(key)) return;
    if (level.grid[cell.y]?.[cell.x] !== CITY_FLOOR) return;
    reserved.add(key);
    props.push(Object.freeze({
      id: `environment-${level.depth}-${roomIndex}-${props.length}`,
      themeId: 'gate-town',
      ...visual,
      gridX: cell.x,
      gridY: cell.y,
      x: cell.x + 0.5,
      y: cell.y + 0.5,
      phase: props.length * 0.37,
    }));
  };

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
      place(CITY_PROPS.tree, corners[2], roomIndex);
      continue;
    }
    if (kind === 'market') {
      place(CITY_PROPS.hearth, { x: rect.x + Math.floor(rect.w / 2), y: rect.y }, roomIndex);
      place(CITY_PROPS.stall, corners[0], roomIndex);
      place(CITY_PROPS.stall, corners[3], roomIndex);
      place(CITY_PROPS.bush, corners[1], roomIndex);
      placeAlongStreet(place, rect, roomIndex);
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
    // A lamp on the street corner of every block, so the city is lit at night,
    // and then the things people actually leave outside their own walls.
    place(CITY_PROPS.lamp, { x: rect.x - 1, y: rect.y - 1 }, roomIndex);
    placeAlongStreet(place, rect, roomIndex);
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
function placeAlongStreet(place, rect, roomIndex) {
  // The far corner gets a second lamp. One lamp a block was enough to say the
  // city is lit; it is not enough to see the city by, and a street dressed with
  // barrels and woodpiles nobody can make out at night is a street with nothing
  // on it. Two diagonal lamps put light on both ends of every block.
  place(CITY_PROPS.lamp, { x: rect.x + rect.w, y: rect.y + rect.h }, roomIndex);
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
