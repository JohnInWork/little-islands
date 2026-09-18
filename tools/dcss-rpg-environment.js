import { createRng, mixSeed } from './dcss-rpg-core.js';
import { createCityEnvironment, isCityDepth } from './dcss-rpg-city.js';

const numberedPaths = (prefix, values) => values.map((value) => `${prefix}${value}.png`);

const flameFrames = numberedPaths('dngn/altars/makhleb_flame', [1, 2, 3, 4, 5, 6, 7, 8]);
const blueFountainFrames = ['dngn/blue_fountain.png', 'dngn/blue_fountain2.png'];
const sparklingFountainFrames = [
  'dngn/sparkling_fountain.png',
  'dngn/sparkling_fountain2.png',
];

const prop = (path, options = {}) =>
  Object.freeze({
    path,
    frames: Object.freeze(options.frames ?? [path]),
    size: options.size ?? 68,
    screenOffsetY: options.screenOffsetY ?? -8,
    light: options.light ? Object.freeze(options.light) : null,
    interactionId: options.interactionId ?? null,
  });

const emberBrazier = prop(flameFrames[0], {
  frames: flameFrames,
  size: 66,
  screenOffsetY: -10,
  light: { color: '#d88447', radius: 2.35, beam: false },
  interactionId: 'campfire',
});

const roomTheme = (values) =>
  Object.freeze({
    ...values,
    features: Object.freeze(values.features),
    details: Object.freeze(values.details),
    floorAccents: Object.freeze(values.floorAccents),
  });

export const ENVIRONMENT_ROOM_THEMES = Object.freeze([
  roomTheme({
    id: 'fallen-hall',
    features: [
      prop('dngn/statues/statue_ancient_hero.png', { size: 74 }),
      prop('dngn/dry_fountain.png', { size: 72 }),
      prop('dngn/statues/statue_sword.png', { size: 72 }),
    ],
    details: numberedPaths('dngn/statues/crumbled_column_', [1, 2, 3, 4, 5, 6]).map(
      (path) => prop(path, { size: 68 }),
    ),
    floorAccents: numberedPaths('dngn/floor/grey_dirt', [0, 1, 2, 3]),
  }),
  roomTheme({
    id: 'forgotten-crypt',
    features: [
      prop('dngn/statues/statue_wraith.png', { size: 74 }),
      prop('dngn/statues/statue_demonic_bust.png', { size: 72 }),
      prop('dngn/statues/statue_iron.png', { size: 72 }),
    ],
    details: [
      prop('mon/fungi_plants/plant_crypt.png', { size: 62, screenOffsetY: -4 }),
      prop('dngn/statues/crumbled_column_3.png', { size: 66 }),
      prop('dngn/statues/crumbled_column_6.png', { size: 66 }),
    ],
    floorAccents: numberedPaths('dngn/floor/tomb', [0, 1, 2, 3]),
  }),
  roomTheme({
    id: 'ashen-shrine',
    features: [
      prop('dngn/altars/generic.png', { size: 76 }),
      prop('dngn/statues/statue_ancient_evil.png', { size: 74 }),
      prop('dngn/statues/statue_triangle.png', { size: 72 }),
    ],
    details: [
      emberBrazier,
      prop('dngn/statues/crumbled_column_1.png', { size: 68 }),
      prop('dngn/statues/crumbled_column_4.png', { size: 68 }),
    ],
    floorAccents: numberedPaths('dngn/floor/black_cobalt0', [1, 2, 3, 4]),
  }),
  roomTheme({
    // Room of the interactive altar: statues and candle braziers only, so the
    // decorative altar of the ashen shrine never stands next to the real one.
    id: 'altar-niche',
    features: [
      prop('dngn/statues/statue_angel.png', { size: 74 }),
      prop('dngn/statues/statue_orb.png', { size: 72 }),
      prop('dngn/statues/statue_triangle.png', { size: 72 }),
    ],
    details: [
      emberBrazier,
      prop('dngn/statues/crumbled_column_2.png', { size: 68 }),
      prop('dngn/statues/crumbled_column_4.png', { size: 68 }),
    ],
    floorAccents: numberedPaths('dngn/floor/black_cobalt0', [1, 2, 3, 4]),
  }),
  roomTheme({
    // The landmark fountain is the only fountain here: the court decorates with
    // statues so the interactive basin stays the one lit object in the room.
    id: 'fountain-court',
    features: [
      prop('dngn/statues/statue_mermaid.png', { size: 74 }),
      prop('dngn/statues/statue_naga.png', { size: 74 }),
      prop('dngn/statues/crumbled_column_3.png', { size: 70 }),
    ],
    details: [
      prop('mon/fungi_plants/plant_crypt.png', { size: 62, screenOffsetY: -4 }),
      prop('dngn/statues/crumbled_column_2.png', { size: 66 }),
      prop('dngn/statues/crumbled_column_5.png', { size: 66 }),
    ],
    floorAccents: numberedPaths('dngn/floor/black_cobalt0', [5, 6, 7, 8]),
  }),
  roomTheme({
    id: 'rune-vault',
    features: [
      prop('dngn/statues/statue_iron.png', { size: 72 }),
      prop('dngn/statues/statue_triangle.png', { size: 72 }),
      prop('dngn/statues/statue_orb.png', { size: 72 }),
    ],
    details: [
      prop('dngn/statues/crumbled_column_1.png', { size: 68 }),
      prop('dngn/statues/crumbled_column_6.png', { size: 68 }),
      emberBrazier,
    ],
    floorAccents: numberedPaths('dngn/floor/black_cobalt0', [1, 2, 3, 4]),
  }),
  roomTheme({
    id: 'drowned-chapel',
    features: [
      prop(blueFountainFrames[0], {
        frames: blueFountainFrames,
        size: 74,
        light: { color: '#679ea3', radius: 2.15, beam: false },
      }),
      prop(sparklingFountainFrames[0], {
        frames: sparklingFountainFrames,
        size: 74,
        light: { color: '#a8bea6', radius: 2.1, beam: false },
      }),
      prop('dngn/statues/statue_mermaid.png', { size: 74 }),
    ],
    details: [
      prop('mon/fungi_plants/plant_crypt.png', { size: 62, screenOffsetY: -4 }),
      prop('dngn/statues/crumbled_column_2.png', { size: 66 }),
      prop('dngn/statues/crumbled_column_5.png', { size: 66 }),
    ],
    floorAccents: numberedPaths('dngn/floor/black_cobalt0', [5, 6, 7, 8]),
  }),
  roomTheme({
    id: 'fungal-hollow',
    features: [
      prop('mon/fungi_plants/deathcap.png', { size: 66, screenOffsetY: -4 }),
      prop('mon/fungi_plants/bush2.png', { size: 64, screenOffsetY: -3 }),
      prop('mon/fungi_plants/bush3.png', { size: 64, screenOffsetY: -3 }),
    ],
    details: [
      prop('mon/fungi_plants/plant_crypt.png', { size: 60, screenOffsetY: -3 }),
      prop('mon/fungi_plants/briar_patch.png', { size: 60, screenOffsetY: -2 }),
      prop('dngn/statues/crumbled_column_6.png', { size: 64 }),
    ],
    floorAccents: numberedPaths('dngn/floor/grey_dirt', [4, 5, 6, 7]),
  }),
  // Outside. A tree is a thing standing on the ground, not a texture stretched
  // over a wall block — which is what it was, and why it looked wrong.
  roomTheme({
    id: 'open-wood',
    features: [
      prop('dngn/trees/tree1_yellow.png', { size: 96, screenOffsetY: -22 }),
      prop('dngn/trees/tree2_red.png', { size: 96, screenOffsetY: -22 }),
      prop('dngn/trees/tree1_lightred.png', { size: 92, screenOffsetY: -20 }),
    ],
    details: [
      prop('mon/fungi_plants/bush4.png', { size: 60, screenOffsetY: -3 }),
      prop('mon/fungi_plants/briar_patch.png', { size: 58, screenOffsetY: -2 }),
      prop('dngn/trees/tree2_yellow.png', { size: 88, screenOffsetY: -18 }),
    ],
    floorAccents: numberedPaths('dngn/floor/grass/grass', [0, 1, 2]),
  }),
  roomTheme({
    id: 'mangrove-shallows',
    features: [
      prop('dngn/trees/mangrove1.png', { size: 92, screenOffsetY: -20 }),
      prop('dngn/trees/mangrove2.png', { size: 92, screenOffsetY: -20 }),
      prop('dngn/trees/mangrove3.png', { size: 92, screenOffsetY: -20 }),
    ],
    details: [
      prop('mon/fungi_plants/bush2.png', { size: 58, screenOffsetY: -3 }),
      prop('mon/fungi_plants/wandering_mushroom.png', { size: 56, screenOffsetY: -2 }),
      prop('mon/fungi_plants/briar_patch.png', { size: 58, screenOffsetY: -2 }),
    ],
    floorAccents: numberedPaths('dngn/floor/swamp', [0, 1, 2, 3]),
  }),
  // A graveyard with no graves in it is a lawn.
  roomTheme({
    id: 'boneyard',
    features: [
      prop('dngn/vaults/sarcophagus_pedestal_left.png', { size: 72, screenOffsetY: -9 }),
      prop('dngn/statues/statue_angel.png', { size: 76, screenOffsetY: -12 }),
      prop('dngn/vaults/sarcophagus_pedestal_right.png', { size: 72, screenOffsetY: -9 }),
    ],
    details: [
      prop('dngn/statues/crumbled_column_1.png', { size: 62 }),
      prop('dngn/statues/crumbled_column_4.png', { size: 60 }),
      prop('dngn/trees/tree1_red.png', { size: 88, screenOffsetY: -18 }),
    ],
    floorAccents: numberedPaths('dngn/floor/moss', [0, 1, 2, 3]),
  }),
  roomTheme({
    id: 'ruined-yard',
    features: [
      prop('dngn/statues/crumbled_column_2.png', { size: 66 }),
      prop('dngn/vaults/brick_dark_skeleton.png', { size: 70, screenOffsetY: -8 }),
      prop('dngn/statues/crumbled_column_5.png', { size: 66 }),
    ],
    details: [
      prop('mon/fungi_plants/bush3.png', { size: 58, screenOffsetY: -3 }),
      prop('dngn/trees/tree2_lightred.png', { size: 86, screenOffsetY: -18 }),
      prop('dngn/statues/crumbled_column_3.png', { size: 60 }),
    ],
    floorAccents: numberedPaths('dngn/floor/grey_dirt_b_', [0, 1, 2, 3]),
  }),
]);

const START_ROOM_THEME = roomTheme({
  id: 'wayfarer-refuge',
  features: [emberBrazier, prop('dngn/dry_fountain.png', { size: 70 })],
  details: [
    prop('dngn/statues/crumbled_column_1.png', { size: 66 }),
    prop('dngn/statues/crumbled_column_5.png', { size: 66 }),
  ],
  floorAccents: numberedPaths('dngn/floor/grey_dirt', [0, 1, 2, 3]),
});

const ROOM_THEMES_BY_ID = new Map(
  [START_ROOM_THEME, ...ENVIRONMENT_ROOM_THEMES].map((theme) => [theme.id, theme]),
);

function roomSize(room, key) {
  return room[key] ?? room[key === 'width' ? 'w' : 'h'];
}

const CARDINAL_DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 }),
]);

function roomContainsCell(room, x, y) {
  return (
    x >= room.x &&
    x < room.x + roomSize(room, 'width') &&
    y >= room.y &&
    y < room.y + roomSize(room, 'height')
  );
}

function isTransitSurface(level, x, y) {
  return level.grid[y]?.[x] === '.' || level.grid[y]?.[x] === 'D';
}

export function environmentTransitCells(level) {
  const transit = new Set();
  const reserveWithClearance = (x, y) => {
    transit.add(`${x},${y}`);
    for (const direction of CARDINAL_DIRECTIONS) {
      const nextX = x + direction.x;
      const nextY = y + direction.y;
      if (isTransitSurface(level, nextX, nextY)) transit.add(`${nextX},${nextY}`);
    }
  };

  for (const door of level.doors ?? []) reserveWithClearance(door.x, door.y);
  for (const room of level.rooms) {
    const right = room.x + roomSize(room, 'width') - 1;
    const bottom = room.y + roomSize(room, 'height') - 1;
    for (let y = room.y; y <= bottom; y += 1) {
      for (let x = room.x; x <= right; x += 1) {
        if (level.grid[y]?.[x] !== '.') continue;
        const onEdge = x === room.x || x === right || y === room.y || y === bottom;
        if (!onEdge) continue;
        const opensIntoCorridor = CARDINAL_DIRECTIONS.some((direction) => {
          const outsideX = x + direction.x;
          const outsideY = y + direction.y;
          return (
            !roomContainsCell(room, outsideX, outsideY) &&
            isTransitSurface(level, outsideX, outsideY)
          );
        });
        if (opensIntoCorridor) reserveWithClearance(x, y);
      }
    }
  }
  return transit;
}

function shuffle(rng, values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = rng.int(0, index);
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

function reservedCellsFor(level) {
  const reserved = new Set();
  const reserve = (point) => {
    if (point && Number.isInteger(point.x) && Number.isInteger(point.y)) {
      reserved.add(`${point.x},${point.y}`);
    }
  };
  reserve(level.spawn);
  reserve(level.exit);
  reserve(level.sanctuary);
  reserve(level.objective?.boss);
  reserve(level.objective?.artifact);
  for (const collection of [level.events, level.monsters, level.passiveCreatures, level.merchants, level.finds, level.loot]) {
    for (const point of collection ?? []) reserve(point);
  }
  return reserved;
}

function roomEdgeCells(level, room, reserved) {
  const width = roomSize(room, 'width');
  const height = roomSize(room, 'height');
  const right = room.x + width - 1;
  const bottom = room.y + height - 1;
  const cells = [];
  for (let y = room.y; y <= bottom; y += 1) {
    for (let x = room.x; x <= right; x += 1) {
      if (level.grid[y]?.[x] !== '.' || reserved.has(`${x},${y}`)) continue;
      if (x !== room.x && x !== right && y !== room.y && y !== bottom) continue;
      cells.push({ x, y });
    }
  }
  return cells;
}

function propPosition(rng, room, cell) {
  const right = room.x + roomSize(room, 'width') - 1;
  const bottom = room.y + roomSize(room, 'height') - 1;
  const distances = [
    { side: 'left', value: cell.x - room.x },
    { side: 'right', value: right - cell.x },
    { side: 'top', value: cell.y - room.y },
    { side: 'bottom', value: bottom - cell.y },
  ];
  const minimum = Math.min(...distances.map(({ value }) => value));
  const nearest = distances.filter(({ value }) => value === minimum);
  const side = rng.pick(nearest).side;
  const jitter = (rng.next() - 0.5) * 0.22;
  const position = { x: cell.x + 0.5, y: cell.y + 0.5 };
  if (side === 'left') {
    position.x = cell.x + 0.22;
    position.y += jitter;
  } else if (side === 'right') {
    position.x = cell.x + 0.78;
    position.y += jitter;
  } else if (side === 'top') {
    position.x += jitter;
    position.y = cell.y + 0.22;
  } else {
    position.x += jitter;
    position.y = cell.y + 0.78;
  }
  return position;
}

function themeForRoom(level, roomIndex, offset, stride) {
  const plannedThemeId = level.roomPlans?.find(
    (plan) => plan.roomIndex === roomIndex,
  )?.environmentThemeId;
  if (plannedThemeId) {
    const plannedTheme = ROOM_THEMES_BY_ID.get(plannedThemeId);
    if (!plannedTheme) throw new Error(`Unknown planned room environment: ${plannedThemeId}`);
    return plannedTheme;
  }
  if (roomIndex === 0) return START_ROOM_THEME;
  return ENVIRONMENT_ROOM_THEMES[
    (offset + (roomIndex - 1) * stride) % ENVIRONMENT_ROOM_THEMES.length
  ];
}

export function createDungeonEnvironment(level) {
  // A city furnishes itself: streets, stalls and lamps, not braziers and bones.
  if (isCityDepth(level.depth)) return createCityEnvironment(level);
  if (
    !level ||
    !Number.isInteger(level.seed) ||
    !Number.isInteger(level.depth) ||
    !Array.isArray(level.grid) ||
    !Array.isArray(level.rooms)
  ) {
    throw new Error('Dungeon environment requires a generated level');
  }
  const rng = createRng(mixSeed(level.seed, 0x454e56 + level.depth));
  const reserved = reservedCellsFor(level);
  const transit = environmentTransitCells(level);
  const occupied = new Set(reserved);
  const props = [];
  const floorAccents = [];
  const roomThemes = [];
  const themeOffset = rng.int(0, ENVIRONMENT_ROOM_THEMES.length - 1);
  const themeStride = rng.next() < 0.5 ? 1 : ENVIRONMENT_ROOM_THEMES.length - 1;

  for (const [roomIndex, room] of level.rooms.entries()) {
    const theme = themeForRoom(level, roomIndex, themeOffset, themeStride);
    roomThemes.push(theme.id);
    const candidates = shuffle(rng, roomEdgeCells(level, room, occupied)).filter(
      ({ x, y }) => !transit.has(`${x},${y}`),
    );
    const area = roomSize(room, 'width') * roomSize(room, 'height');
    const desiredProps = roomIndex === 0 ? 3 : 2 + (area >= 30 ? 1 : 0) + rng.int(0, 1);
    // The refuge always exposes one deterministic cooking site. It remains an
    // ordinary environment prop, so it cannot perturb dungeon geometry/RNG.
    const blueprints = [
      roomIndex === 0 ? emberBrazier : rng.pick(theme.features),
      ...shuffle(rng, [...theme.details]),
    ];
    for (let index = 0; index < Math.min(desiredProps, candidates.length); index += 1) {
      const cell = candidates[index];
      const blueprint = blueprints[index % blueprints.length];
      const position = propPosition(rng, room, cell);
      occupied.add(`${cell.x},${cell.y}`);
      props.push(
        Object.freeze({
          id: `environment-${level.depth}-${roomIndex}-${index}`,
          themeId: theme.id,
          gridX: cell.x,
          gridY: cell.y,
          x: position.x,
          y: position.y,
          path: blueprint.path,
          frames: blueprint.frames,
          size: blueprint.size,
          screenOffsetY: blueprint.screenOffsetY,
          light: blueprint.light,
          interactionId: blueprint.interactionId,
          phase: rng.next() * 8,
        }),
      );
    }

    const accentCandidates = shuffle(
      rng,
      roomEdgeCells(level, room, occupied).filter(({ x, y }) =>
        !transit.has(`${x},${y}`) &&
        Math.abs(x - level.spawn.x) + Math.abs(y - level.spawn.y) > 1
      ),
    );
    const accentCount = Math.min(accentCandidates.length, area >= 30 ? 2 : 1);
    for (let index = 0; index < accentCount; index += 1) {
      const cell = accentCandidates[index];
      occupied.add(`${cell.x},${cell.y}`);
      floorAccents.push(
        Object.freeze({
          themeId: theme.id,
          x: cell.x,
          y: cell.y,
          path: theme.floorAccents[(roomIndex + index) % theme.floorAccents.length],
        }),
      );
    }
  }

  if (!props.some(({ interactionId }) => interactionId === 'campfire')) {
    const fallback = level.rooms.map((room, roomIndex) => ({
      room,
      roomIndex,
      cell: roomEdgeCells(level, room, occupied)
        .find(({ x, y }) => !transit.has(`${x},${y}`)),
    })).find(({ cell }) => cell);
    if (!fallback) throw new Error('Dungeon has no safe cooking-site cell');
    const { room, roomIndex, cell } = fallback;
    const position = propPosition(rng, room, cell);
    props.push(Object.freeze({
      id: `environment-${level.depth}-${roomIndex}-cook`,
      themeId: roomThemes[roomIndex],
      gridX: cell.x,
      gridY: cell.y,
      x: position.x,
      y: position.y,
      path: emberBrazier.path,
      frames: emberBrazier.frames,
      size: emberBrazier.size,
      screenOffsetY: emberBrazier.screenOffsetY,
      light: emberBrazier.light,
      interactionId: emberBrazier.interactionId,
      phase: rng.next() * 8,
    }));
  }

  return Object.freeze({
    props: Object.freeze(props),
    floorAccents: Object.freeze(floorAccents),
    roomThemes: Object.freeze(roomThemes),
  });
}

export function allEnvironmentAssetPaths() {
  const themes = [START_ROOM_THEME, ...ENVIRONMENT_ROOM_THEMES];
  return [
    ...new Set(
      themes.flatMap((theme) => [
        ...theme.features.flatMap(({ frames }) => frames),
        ...theme.details.flatMap(({ frames }) => frames),
        ...theme.floorAccents,
      ]),
    ),
  ];
}
