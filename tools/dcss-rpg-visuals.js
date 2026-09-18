import { dungeonThemeForDepth } from './dcss-rpg-room-plans.js';

const numberedPaths = (prefix, values) => values.map((value) => `${prefix}${value}.png`);

export const PIXEL_EFFECT_SCALE = 4;

export const VISIBILITY_TUNING = Object.freeze({
  darknessOpacity: 0.14,
  heroBaseRadius: 118,
  heroRevealRadius: 290,
  heroViewportRatio: 0.58,
  heroCarveStrength: 0.96,
  sourceCarveStrength: 0.62,
  distantFogOpacity: 0.14,
  spriteFilter: 'brightness(0.88) saturate(0.78) contrast(0.94)',
});

const atmosphere = (values) => Object.freeze(values);

export const ATMOSPHERE_THEMES = Object.freeze({
  slate: atmosphere({
    darkness: '#05090c',
    heroLight: '#d6b36a',
    localLight: '#c67d46',
    fog: '#809395',
    dust: '#c5bd9d',
    drip: '#76949b',
    ray: '#d5bf86',
  }),
  ochre: atmosphere({
    darkness: '#0c0805',
    heroLight: '#e0b36b',
    localLight: '#c9783e',
    fog: '#9a8065',
    dust: '#d2b47d',
    drip: '#87694f',
    ray: '#e0bd78',
  }),
  ice: atmosphere({
    darkness: '#03090d',
    heroLight: '#a7d6d6',
    localLight: '#68b9c8',
    fog: '#8fb6bd',
    dust: '#c3e2e0',
    drip: '#7fceda',
    ray: '#b8e7e4',
  }),
  // The city is the only lit place in the run: lanterns, not torch-and-dark.
  town: atmosphere({
    darkness: '#0a0c12',
    heroLight: '#f0d79a',
    localLight: '#e0a44f',
    fog: '#7d8898',
    dust: '#d8cdb2',
    drip: '#8a9099',
    ray: '#f2dda6',
  }),
  ember: atmosphere({
    darkness: '#0d0303',
    heroLight: '#ef9a55',
    localLight: '#d95032',
    fog: '#8f4c42',
    dust: '#e5a05e',
    drip: '#a84e35',
    ray: '#ef9f58',
  }),
});

/**
 * Air of the chapter. `driftX`/`driftY` steer the same motes, `sway` is the
 * side-to-side wobble in pixels, `size` adds pixels and `alpha` scales opacity.
 */
const weather = (values) => Object.freeze({ driftX: 1, driftY: 0, sway: 18, size: 0, alpha: 1, ...values });

export const CHAPTER_WEATHER = Object.freeze({
  slate: weather({ id: 'ash', driftX: 0.6, driftY: 0.25, sway: 20 }),
  ochre: weather({ id: 'sand', driftX: 1.6, driftY: 0.06, sway: 8, alpha: 1.15 }),
  ice: weather({ id: 'snow', driftX: 0.22, driftY: 0.9, sway: 26, size: 1, alpha: 1.4 }),
  ember: weather({ id: 'sparks', driftX: 0.3, driftY: -0.7, sway: 14, alpha: 1.5 }),
  town: weather({ id: 'smoke', driftX: 0.45, driftY: -0.3, sway: 16, alpha: 0.85 }),
});

export function chapterWeather(paletteId) {
  return CHAPTER_WEATHER[paletteId] ?? CHAPTER_WEATHER.slate;
}

export const BLOOD_FLOOR_PATHS = numberedPaths('dngn/floor/cobble_blood', [8, 9, 10, 12]);

export const BIOME_THEMES = Object.freeze([
  Object.freeze({
    id: 'ashen-vault',
    palette: 'slate',
    floors: numberedPaths('dngn/floor/cobble_blood', [1, 2, 3, 4, 5, 6, 7, 11]),
    walls: numberedPaths('dngn/wall/brick_gray', [0, 1, 2, 3]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 61,
    world3d: Object.freeze({
      floorTint: '#ffffff',
      wallTint: '#ffffff',
      actorTint: '#eeeae1',
      background: '#040708',
      fog: '#05090c',
      fogDensity: 0.018,
      ambient: '#829094',
      keyLight: '#e4ca8d',
    }),
  }),
  Object.freeze({
    id: 'buried-sanctum',
    palette: 'ochre',
    floors: numberedPaths('dngn/floor/sand', [1, 2, 3, 4, 5, 6, 7]),
    walls: numberedPaths('dngn/wall/sandstone_wall', [0, 1, 2, 3, 4, 5, 6, 7]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fff8ef',
      wallTint: '#fff8ef',
      actorTint: '#edddc9',
      background: '#090604',
      fog: '#0c0805',
      fogDensity: 0.019,
      ambient: '#9a826a',
      keyLight: '#e6bd78',
    }),
  }),
  Object.freeze({
    id: 'frozen-depths',
    palette: 'ice',
    floors: numberedPaths('dngn/floor/frozen', [0, 1, 2, 3, 4, 5, 6, 7]),
    walls: numberedPaths('dngn/wall/stone_dark', [0, 1, 2, 3]),
    accentWalls: [
      'dngn/wall/crystal_wall_cyan.png',
      'dngn/wall/crystal_wall_lightcyan.png',
    ],
    accentModulo: 17,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#f2fbff',
      wallTint: '#f2fbff',
      actorTint: '#dcebed',
      background: '#03080c',
      fog: '#03090d',
      fogDensity: 0.021,
      ambient: '#779ca5',
      keyLight: '#b5e4df',
    }),
  }),
  Object.freeze({
    id: 'infernal-core',
    palette: 'ember',
    floors: numberedPaths('dngn/floor/demonic_red', [1, 2, 3, 4, 5, 6, 7]),
    walls: numberedPaths('dngn/wall/hell0', [1, 2, 3, 4, 5, 6, 7]),
    accentWalls: ['dngn/wall/bars_red01.png', 'dngn/wall/bars_red02.png'],
    accentModulo: 13,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fff2ed',
      wallTint: '#fff2ed',
      actorTint: '#e8cbc2',
      background: '#0b0303',
      fog: '#0d0303',
      fogDensity: 0.022,
      ambient: '#8e554b',
      keyLight: '#ef9c5b',
    }),
  }),
  Object.freeze({
    id: 'gate-town',
    palette: 'town',
    floors: numberedPaths('dngn/floor/pebble_brown', [0, 1, 2, 3, 4, 5, 6, 7, 8]),
    walls: numberedPaths('dngn/wall/brick_brown', [0, 1, 2, 3, 4, 5, 6, 7]),
    accentWalls: numberedPaths('dngn/wall/church', [0, 1, 2, 3, 4]),
    accentModulo: 13,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fff4e4',
      wallTint: '#fff1de',
      actorTint: '#f4ece0',
      background: '#080b12',
      fog: '#0b1018',
      fogDensity: 0.012,
      ambient: '#9aa6b4',
      keyLight: '#f4d79a',
    }),
  }),
]);

export function biomeThemeForDepth(depth) {
  if (!Number.isInteger(depth) || depth < 0) throw new Error('Depth must be a positive integer');
  const dungeonTheme = dungeonThemeForDepth(depth);
  const biome = BIOME_THEMES.find(({ id }) => id === dungeonTheme.surfaceSetId);
  if (!biome) throw new Error(`Missing biome surfaces for ${dungeonTheme.surfaceSetId}`);
  return biome;
}

export function atmosphereThemeForDepth(depth) {
  return ATMOSPHERE_THEMES[biomeThemeForDepth(depth).palette];
}

export function deterministicAtmosphereMote(seed, index, width, height) {
  if (!Number.isInteger(seed) || !Number.isInteger(index) || width <= 0 || height <= 0) {
    throw new Error('Atmosphere mote requires integer seed/index and positive bounds');
  }
  const mix = (salt) => {
    let value = Math.imul(seed ^ (index + salt), 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return (value ^ (value >>> 16)) >>> 0;
  };
  return Object.freeze({
    x: (mix(17) / 0xffffffff) * width,
    y: (mix(31) / 0xffffffff) * height,
    phase: (mix(47) / 0xffffffff) * Math.PI * 2,
    speed: 0.045 + (mix(61) % 7) * 0.012,
    size: 1 + (mix(73) % 3),
    layer: mix(89) % 3,
  });
}

export function fogAnchorsForDungeon({ seed, spawn, rooms, tileSize = 64 }) {
  if (
    !Number.isInteger(seed) ||
    !spawn ||
    !Number.isInteger(spawn.x) ||
    !Number.isInteger(spawn.y) ||
    !Array.isArray(rooms) ||
    rooms.length === 0 ||
    !Number.isFinite(tileSize) ||
    tileSize <= 0
  ) {
    throw new Error('Fog anchors require a seeded dungeon with rooms');
  }
  const unit = (index, salt) => {
    let value = Math.imul(seed ^ (index + salt), 0x27d4eb2d);
    value = Math.imul(value ^ (value >>> 15), 0x85ebca6b);
    return ((value ^ (value >>> 13)) >>> 0) / 0xffffffff;
  };
  // Rooms carry width/height; reading w/h left every anchor at NaN, so the
  // mist has never actually been drawn.
  const spawnRoom = rooms.find(
    (room) =>
      spawn.x >= room.x &&
      spawn.x < room.x + room.width &&
      spawn.y >= room.y &&
      spawn.y < room.y + room.height,
  );
  const orderedRooms = spawnRoom
    ? [spawnRoom, ...rooms.filter((room) => room !== spawnRoom)]
    : rooms;
  const anchors = [];
  for (let roomIndex = 0; roomIndex < Math.min(8, orderedRooms.length); roomIndex += 1) {
    const room = orderedRooms[roomIndex];
    const copies = roomIndex === 0 ? 4 : 1;
    const inset = 0.82;
    const innerWidth = Math.max(0.4, room.width - inset * 2);
    const innerHeight = Math.max(0.4, room.height - inset * 2);
    for (let copy = 0; copy < copies; copy += 1) {
      const index = roomIndex * 7 + copy;
      anchors.push(
        Object.freeze({
          x: (room.x + inset + unit(index, 17) * innerWidth) * tileSize,
          y: (room.y + inset + unit(index, 31) * innerHeight) * tileSize,
          phase: unit(index, 47) * Math.PI * 2,
          drift: 18 + unit(index, 59) * 28,
          speed: 0.07 + unit(index, 71) * 0.08,
          size: 0.82 + unit(index, 83) * 0.36,
        }),
      );
    }
  }
  return Object.freeze(anchors);
}

export function allBiomeAssetPaths() {
  return [
    ...BLOOD_FLOOR_PATHS,
    ...BIOME_THEMES.flatMap(({ floors, walls, accentWalls }) => [
      ...floors,
      ...walls,
      ...accentWalls,
    ]),
  ];
}
