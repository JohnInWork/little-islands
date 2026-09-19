/**
 * The tavern: the one room in the city that is furnished rather than decorated.
 *
 * Every other building the hero can walk into is a box with one man standing in
 * the middle of it. That reads as a place to press a button, not as a place, and
 * the city has been asking for somewhere to sit down since it stopped being a
 * corridor. A tavern is the cheapest honest answer: a counter, a fire, tables
 * with people already at them, and a keeper who will rent a bed.
 *
 * Everything here is geometry and a catalogue. The module is handed a room and
 * gives back a list of what stands where; it never touches a canvas, never
 * reads the run, and never decides whether the hero can afford anything.
 *
 * Two rules the layout obeys, and they are the whole design:
 *
 * - **The bar faces the door.** You walk in and the counter is the first thing
 *   in front of you, because that is what a tavern is for. Everything else
 *   arranges itself around that one fact.
 * - **A seat is a person or a stool, never both by accident.** The runtime
 *   seats the mercenaries first and furnishes afterwards, so a stool is never
 *   drawn under a man who is already sitting on one.
 */

import { MERCENARIES } from './dcss-rpg-mercenaries.js';

const ROOT = 'licensed/lpc-tavern/';

const prop = (path, options = {}) => Object.freeze({
  path: `${ROOT}${path}`,
  frames: Object.freeze((options.frames ?? [path]).map((frame) => `${ROOT}${frame}`)),
  size: options.size ?? 60,
  screenOffsetY: options.screenOffsetY ?? -6,
  light: options.light ? Object.freeze(options.light) : null,
  interactionId: options.interactionId ?? null,
});

const numbered = (prefix, count) => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}.png`);

// Frames one and two are embers. A tavern hearth that keeps dying down to
// embers reads as a cold room, so the burning four are the whole loop.
const FIREPLACE_FRAMES = Object.freeze([3, 4, 5, 6].map((n) => `hearth/fireplace${n}.png`));
const CAULDRON_FRAMES = numbered('hearth/cauldron', 6);
const TORCH_FRAMES = numbered('deco/torch', 3);

/**
 * What a tavern is made of. The keys are what the layout speaks in; the values
 * are what the renderer draws, in the same shape every other prop already uses.
 */
export const TAVERN_PROPS = Object.freeze({
  bar: prop('furniture/bar.png', { size: 104, screenOffsetY: -12 }),
  // A bare round top is a tree stump. What makes it a table is that somebody
  // was drinking at it — so the tables ship laid, and the stools stay bare.
  table: prop('furniture/table-set.png', { size: 64, screenOffsetY: -8 }),
  tableJug: prop('furniture/table-jug.png', { size: 66, screenOffsetY: -8 }),
  tableBare: prop('furniture/table.png', { size: 56, screenOffsetY: -6 }),
  stool: prop('furniture/stool.png', { size: 34, screenOffsetY: -2 }),
  stoolTall: prop('furniture/stool-tall.png', { size: 38, screenOffsetY: -4 }),
  chair: prop('furniture/chair.png', { size: 50, screenOffsetY: -8 }),
  chairHigh: prop('furniture/chair-high.png', { size: 52, screenOffsetY: -10 }),
  bench: prop('furniture/bench.png', { size: 58, screenOffsetY: -8 }),
  // The hearth is one prop, not a stone box with a fire balanced on top of it:
  // the six frames are the surround with the fire already burning inside.
  fireplace: prop(FIREPLACE_FRAMES[0], {
    frames: FIREPLACE_FRAMES,
    size: 92,
    screenOffsetY: -20,
    light: { color: '#e09a4c', radius: 3.1, beam: false },
  }),
  // And the pot over the fire is the cooking site, because a hero who can cook
  // anywhere can cook here, and a tavern with no pot on is a room with chairs.
  cauldron: prop(CAULDRON_FRAMES[0], {
    frames: CAULDRON_FRAMES,
    size: 58,
    screenOffsetY: -10,
    light: { color: '#d88447', radius: 2.1, beam: false },
    interactionId: 'campfire',
  }),
  oven: prop('hearth/oven.png', { size: 86, screenOffsetY: -22 }),
  woodpile: prop('hearth/woodpile.png', { size: 48, screenOffsetY: -4 }),
  logs: prop('hearth/logs.png', { size: 62, screenOffsetY: -6 }),
  keg: prop('deco/keg.png', { size: 52, screenOffsetY: -8 }),
  kegTapped: prop('deco/keg-tapped.png', { size: 50, screenOffsetY: -6 }),
  barrels: prop('deco/barrels.png', { size: 68, screenOffsetY: -8 }),
  casks: prop('deco/casks.png', { size: 68, screenOffsetY: -6 }),
  torch: prop(TORCH_FRAMES[0], {
    frames: TORCH_FRAMES,
    size: 40,
    screenOffsetY: -26,
    light: { color: '#f0bf6d', radius: 2.4, beam: false },
  }),
  candelabra: prop('deco/candelabra.png', {
    size: 54,
    screenOffsetY: -14,
    light: { color: '#f2d79a', radius: 1.9, beam: false },
  }),
  candles: prop('deco/candles.png', {
    size: 34,
    screenOffsetY: -6,
    light: { color: '#f2d79a', radius: 1.5, beam: false },
  }),
  lantern: prop('deco/lantern.png', { size: 40, screenOffsetY: -14 }),
  mug: prop('deco/mug.png', { size: 28, screenOffsetY: -4 }),
  mugAle: prop('deco/mug-ale.png', { size: 28, screenOffsetY: -4 }),
  jug: prop('deco/jug.png', { size: 30, screenOffsetY: -5 }),
  plate: prop('deco/plate.png', { size: 26, screenOffsetY: -2 }),
  bottle: prop('deco/bottle.png', { size: 34, screenOffsetY: -6 }),
  basket: prop('deco/basket.png', { size: 38, screenOffsetY: -5 }),
  book: prop('deco/book.png', { size: 34, screenOffsetY: -3 }),
  chessboard: prop('deco/chessboard.png', { size: 36, screenOffsetY: -3 }),
  lute: prop('deco/lute.png', { size: 38, screenOffsetY: -8 }),
  drum: prop('deco/drum.png', { size: 44, screenOffsetY: -6 }),
});

export const TAVERN_PROP_KINDS = Object.freeze(Object.keys(TAVERN_PROPS));

/**
 * The boards underfoot. A tavern standing on the moss of the moor it was built
 * on is a table somebody carried outside, and the one thing the whole room was
 * missing. Dungeon Crawl's tile library has no wooden floor at all, so these
 * four are cut from the planking of the pack's own door — same wood, same
 * palette, darkened a little so a barrel standing on them still reads as a
 * barrel. Four of them, because one board repeated is a pattern, not a floor.
 */
export const TAVERN_FLOOR_PATHS = Object.freeze(
  [1, 2, 3, 4].map((index) => `${ROOT}floor/planks${index}.png`),
);

/**
 * Which cells are boarded. Derived from the plan every time rather than stored:
 * a floor knows where its tavern is, and a second copy of that in the save is a
 * second thing that can be wrong.
 */
export function tavernFloorCells(level) {
  const cells = new Set();
  const claim = (rect) => {
    if (!rect) return;
    const width = rect.w ?? rect.width;
    const height = rect.h ?? rect.height;
    for (let y = rect.y; y < rect.y + height; y += 1) {
      for (let x = rect.x; x < rect.x + width; x += 1) cells.add(`${x},${y}`);
    }
  };
  // The city's tavern, which knows itself as a block.
  for (const block of level?.city?.blocks ?? []) {
    if (block.kind === 'tavern') claim(block.interior);
  }
  // And every inn on the road, which knows itself as a room plan.
  for (const plan of level?.roomPlans ?? []) {
    if (plan.archetypeId === 'wayside-inn') claim(level.rooms?.[plan.roomIndex]);
  }
  return cells;
}

export const TAVERN_ASSET_PATHS = Object.freeze([
  ...new Set([
    ...Object.values(TAVERN_PROPS).flatMap(({ frames }) => frames),
    ...TAVERN_FLOOR_PATHS,
  ]),
]);

/** The keeper: the recruiter moved indoors, where a hiring board belongs. */
export const TAVERN_KEEPER_ID = 'city-recruiter';

/** A bed for the night, and what it is worth. */
export const TAVERN_BED_PRICE = 25;

/**
 * Which wall the door is in, named by where it stands relative to the room.
 * `null` when the room has no door, which only happens in tests.
 */
export function tavernDoorSide({ interior, door }) {
  if (!interior || !door) return null;
  if (door.y < interior.y) return 'north';
  if (door.y >= interior.y + interior.h) return 'south';
  if (door.x < interior.x) return 'west';
  return 'east';
}

/**
 * The room in its own terms: `u` runs along the wall the bar stands against and
 * `v` runs away from it, towards the door. Writing the layout once in this
 * space and mapping it back is the only way four door directions stay one
 * layout instead of four that drift apart.
 */
function mapper({ interior, door }) {
  const side = tavernDoorSide({ interior, door }) ?? 'south';
  const { x, y, w, h } = interior;
  if (side === 'south') return { w, h, at: (u, v) => ({ x: x + u, y: y + v }) };
  if (side === 'north') return { w, h, at: (u, v) => ({ x: x + w - 1 - u, y: y + h - 1 - v }) };
  if (side === 'east') return { w: h, h: w, at: (u, v) => ({ x: x + v, y: y + h - 1 - u }) };
  return { w: h, h: w, at: (u, v) => ({ x: x + w - 1 - v, y: y + u }) };
}

/**
 * The way into a room, as a cell just outside it. A dungeon room has no door
 * record the way a city block does, so the first edge cell that opens onto a
 * corridor is answer enough: the layout only needs to know which wall the
 * guests come through, and any entrance puts the counter on a far wall.
 */
export function tavernEntranceCell({ grid, interior }) {
  if (!Array.isArray(grid) || !interior) return null;
  const walkable = (x, y) => grid[y]?.[x] === '.' || grid[y]?.[x] === 'D';
  const right = interior.x + interior.w - 1;
  const bottom = interior.y + interior.h - 1;
  for (let y = interior.y; y <= bottom; y += 1) {
    for (let x = interior.x; x <= right; x += 1) {
      if (x !== interior.x && x !== right && y !== interior.y && y !== bottom) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const outX = x + dx;
        const outY = y + dy;
        const outside = outX < interior.x || outX > right || outY < interior.y || outY > bottom;
        if (outside && walkable(outX, outY)) return { x: outX, y: outY };
      }
    }
  }
  return null;
}

/** A tavern needs a room, not a cupboard: below this it is furnished as one. */
export const TAVERN_MIN_ROOM = Object.freeze({ w: 4, h: 3 });

function roomIsTooSmall({ w, h }) {
  return w < TAVERN_MIN_ROOM.w || h < TAVERN_MIN_ROOM.h;
}

/**
 * Where the mercenaries sit. Four chairs around two tables, and the order is
 * fixed so the cheapest hire is always the one nearest the door: a player who
 * walks in with seventy coins meets the man he can afford first.
 */
export function tavernSeats({ interior, door }) {
  if (!interior) return [];
  const { w, h, at } = mapper({ interior, door });
  if (roomIsTooSmall({ w, h })) return [];
  const front = h - 1;
  const back = h - 2;
  return [
    at(1, front),
    at(w - 2, front),
    at(0, back),
    at(w - 1, back),
  ];
}

/**
 * A seated mercenary is an ordinary neutral townsman as far as the floor is
 * concerned, so the id is derived rather than kept in a second table: one
 * prefix, and the catalogue entry is the only thing that has to exist.
 */
export function tavernHireMonsterId(mercenaryId) {
  return `tavern-${mercenaryId}`;
}

export function mercenaryIdForHireMonster(monsterId) {
  return typeof monsterId === 'string' && monsterId.startsWith('tavern-')
    ? monsterId.slice('tavern-'.length)
    : null;
}

export const TAVERN_HIRE_MONSTER_IDS = Object.freeze(
  MERCENARIES.map(({ id }) => tavernHireMonsterId(id)),
);

/** Who sits in which chair: the roster in price order, nearest the door first. */
export function tavernSeatedMercenaries({ interior, door }) {
  const seats = tavernSeats({ interior, door });
  return MERCENARIES
    .map((tier, index) => (seats[index] ? Object.freeze({ mercenaryId: tier.id, ...seats[index] }) : null))
    .filter(Boolean);
}

/** The keeper's own cell: in front of his counter, facing the room. */
export function tavernKeeperSpot({ interior, door }) {
  if (!interior) return null;
  const { w, h, at } = mapper({ interior, door });
  if (roomIsTooSmall({ w, h })) return null;
  return at(Math.floor(w / 2), 1);
}

/**
 * The furniture. Cells the runtime has already given to someone — the keeper,
 * the mercenaries, the doorway — are its problem, not this function's: it
 * describes a full room and the placer drops whatever is taken.
 */
export function tavernLayout({ interior, door }) {
  if (!interior) return [];
  const { w, h, at } = mapper({ interior, door });
  if (roomIsTooSmall({ w, h })) return [];
  const middle = Math.floor(w / 2);
  const front = h - 1;
  const back = h - 2;
  // A room only three deep has the tables against the back wall's own row, and
  // then there is no working row to put barrels in. Asking for one anyway is
  // how two things end up on the same cell and one of them silently vanishes.
  const workRow = back > 1 ? 1 : null;
  const pieces = [
    // The back wall: fire in one corner, the counter in the middle, ale in the
    // other corner. This is the view from the doorway and it is composed.
    ['fireplace', 0, 0],
    ['bar', middle, 0],
    ['kegTapped', w - 1, 0],
    // The near wall, where a room shows it is lived in rather than furnished.
    ['chair', 0, front],
    ['chairHigh', w - 1, front],
    ['candelabra', middle, front],
  ];
  // Tables. A narrow room gets one, because two of them touching is a bench.
  if (w >= 5) pieces.push(['table', 1, back], ['tableJug', w - 2, back]);
  else pieces.push(['table', 1, back]);
  if (workRow !== null) {
    pieces.push(['barrels', 0, workRow], ['cauldron', w - 1, workRow]);
    pieces.push(['stool', 1, workRow], ['stoolTall', w - 2, workRow]);
  } else {
    // No working row: the pot goes beside the fire, which is where it would
    // hang anyway. The back corners are seats, and a seat wins over a prop.
    pieces.push(['cauldron', 1, 0]);
  }
  // Anything wider gets the things a bigger room can hold: more light, more
  // ale, and the evidence that people were here before the hero walked in.
  if (w >= 6) {
    pieces.push(['torch', 1, 0], ['torch', w - 2, 0], ['bench', middle, back]);
  }
  if (w >= 7 && workRow !== null) {
    pieces.push(['casks', middle - 1, workRow], ['lute', middle + 1, front]);
  }
  if (h >= 5) {
    pieces.push(['woodpile', 0, 2], ['chessboard', w - 1, 2]);
  }
  // One thing per cell. Two pieces landing on the same square is a layout bug,
  // and the placer downstream would hide it by quietly dropping the second.
  const taken = new Set();
  return pieces
    .filter(([kind]) => TAVERN_PROPS[kind])
    .map(([kind, u, v]) => Object.freeze({ kind, ...at(u, v) }))
    .filter(({ x, y }) => {
      const key = `${x},${y}`;
      if (taken.has(key)) return false;
      taken.add(key);
      return true;
    });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    name: 'Таверна',
    keeper: 'Трактирщик',
    idle: 'Свободных рук сейчас нет',
    bed: (price) => `Комната на ночь — ${price}●`,
    slept: 'Ты выспался',
    refusals: Object.freeze({
      'too-dear': 'Не хватает золота',
      'not-tired': 'Спать ещё не хочется',
      'no-room': 'Свободных комнат нет',
    }),
  }),
  en: Object.freeze({
    name: 'Tavern',
    keeper: 'Innkeeper',
    idle: 'Nobody is free just now',
    bed: (price) => `A room for the night — ${price}●`,
    slept: 'You slept it off',
    refusals: Object.freeze({
      'too-dear': 'Not enough gold',
      'not-tired': 'Not tired yet',
      'no-room': 'No rooms free',
    }),
  }),
});

export function tavernCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

/**
 * The bed: gold for a full night, refused when there is nothing to buy. Sleep
 * itself belongs to the rest module — this only says whether the keeper will
 * take the money.
 */
export function bedOffer({ gold = 0, rest = 0, restMax = 1, language = 'ru' } = {}) {
  const copy = tavernCopy(language);
  const price = TAVERN_BED_PRICE;
  if (rest >= restMax) {
    return Object.freeze({ ok: false, reason: 'not-tired', price, text: copy.refusals['not-tired'] });
  }
  if (!Number.isFinite(gold) || gold < price) {
    return Object.freeze({ ok: false, reason: 'too-dear', price, text: copy.refusals['too-dear'] });
  }
  return Object.freeze({ ok: true, reason: 'ready', price, text: copy.bed(price) });
}
