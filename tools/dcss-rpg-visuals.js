import { dungeonThemeById } from './dcss-rpg-room-plans.js';

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

/**
 * What the dark beyond the light looks like. It used to be one flat near-black
 * painted at one opacity on every unseen tile, which reads as *nothing* rather
 * than as *darkness*: on a tall phone that turned the lower half of the screen
 * into a hole.
 *
 * Two changes make it a place instead of a hole. The edge of knowledge fades
 * rather than cuts — just past the hero's sight the gloom is thinner, so a room
 * reads as continuing into the dark — and remembered ground dims with distance
 * instead of stepping down at one radius.
 */
export const FOG_TUNING = Object.freeze({
  nearRadius: 5.2,
  farRadius: 12,
  unknownOpacity: 0.96,
  unknownEdgeShare: 0.58,
  unknownSoftRadius: 8.5,
});

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * How much dark sits on one tile. `known` is whether the hero has ever seen it,
 * `distance` is in tiles from the hero.
 */
export function fogTileOpacity({ known, distance } = {}) {
  const span = Number.isFinite(distance) && distance > 0 ? distance : 0;
  const {
    nearRadius, farRadius, unknownOpacity, unknownEdgeShare, unknownSoftRadius,
  } = FOG_TUNING;
  if (!known) {
    const soft = clamp01((span - nearRadius) / Math.max(0.001, unknownSoftRadius - nearRadius));
    return unknownOpacity * (unknownEdgeShare + (1 - unknownEdgeShare) * soft);
  }
  if (span <= nearRadius) return 0;
  const ramp = clamp01((span - nearRadius) / Math.max(0.001, farRadius - nearRadius));
  return VISIBILITY_TUNING.distantFogOpacity * ramp;
}

/**
 * Where a damage number goes. They all used to rise straight up from the actor
 * they belonged to, so two actors standing on the same tile — which is exactly
 * what fighting means — stacked their numbers on one spot and neither could be
 * read.
 *
 * A number now leaves along the line the blow travelled, away from whoever
 * struck. Two actors trading hits throw their numbers in opposite directions,
 * which is the cheapest possible way to tell them apart.
 */
export const COMBAT_GLYPH_DRIFT = Object.freeze({ sideways: 30, lift: 26 });

export function combatGlyphDrift({ x, y, sourceX, sourceY } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return Object.freeze({ dx: 0, dy: 0 });
  if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) return Object.freeze({ dx: 0, dy: 0 });
  const dx = x - sourceX;
  const dy = y - sourceY;
  const length = Math.hypot(dx, dy);
  // A blow with no direction — a trap underfoot, a poison tick — keeps rising
  // straight up, because there is nothing to move away from.
  if (length < 0.001) return Object.freeze({ dx: 0, dy: 0 });
  return Object.freeze({
    dx: (dx / length) * COMBAT_GLYPH_DRIFT.sideways,
    dy: (dy / length) * COMBAT_GLYPH_DRIFT.lift,
  });
}

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
  bone: atmosphere({
    darkness: '#07080a',
    heroLight: '#d8d2bd',
    localLight: '#b9a682',
    fog: '#8e8d85',
    dust: '#d5cdb6',
    drip: '#8d8c84',
    ray: '#ded7c2',
  }),
  prism: atmosphere({
    darkness: '#060810',
    heroLight: '#bfd0f0',
    localLight: '#8f7fd8',
    fog: '#8f9ec8',
    dust: '#cfd8f5',
    drip: '#9aa8e0',
    ray: '#c9d4f7',
  }),
  verdigris: atmosphere({
    darkness: '#040b0b',
    heroLight: '#9fd6c4',
    localLight: '#5fa898',
    fog: '#82aba0',
    dust: '#bfe0d4',
    drip: '#6fb9a6',
    ray: '#aee0cf',
  }),
  mold: atmosphere({
    darkness: '#060a05',
    heroLight: '#c2d38a',
    localLight: '#7f9a4c',
    fog: '#86976a',
    dust: '#cadd95',
    drip: '#86a05a',
    ray: '#cddd9c',
  }),
  viscera: atmosphere({
    darkness: '#0b040a',
    heroLight: '#d492b4',
    localLight: '#8e3f6c',
    fog: '#8a5470',
    dust: '#d8a0be',
    drip: '#a0537e',
    ray: '#dc9cbc',
  }),
  moss: atmosphere({
    darkness: '#050a06',
    heroLight: '#b6d69a',
    localLight: '#6f9a58',
    fog: '#7d9a72',
    dust: '#c4dfa8',
    drip: '#7fae74',
    ray: '#c2dfa6',
  }),
  cobalt: atmosphere({
    darkness: '#04070f',
    heroLight: '#9fb6e0',
    localLight: '#5f77c0',
    fog: '#7b8cb4',
    dust: '#b7c6e8',
    drip: '#6f88c4',
    ray: '#aec1ea',
  }),
  magma: atmosphere({
    darkness: '#0a0402',
    heroLight: '#f0a860',
    localLight: '#e0562a',
    fog: '#97563a',
    dust: '#f0b070',
    drip: '#b05a2e',
    ray: '#f6ae63',
  }),
  loam: atmosphere({
    darkness: '#080603',
    heroLight: '#d9bd88',
    localLight: '#a07a44',
    fog: '#8c7a5c',
    dust: '#d8c398',
    drip: '#94795a',
    ray: '#dcc394',
  }),
  iron: atmosphere({
    darkness: '#090806',
    heroLight: '#c9c2b0',
    localLight: '#9c7f52',
    fog: '#85857f',
    dust: '#c8bfa8',
    drip: '#8a867c',
    ray: '#cdc4ae',
  }),
  sepia: atmosphere({
    darkness: '#0a0705',
    heroLight: '#e2c58f',
    localLight: '#bb8a4c',
    fog: '#97836a',
    dust: '#dcc39a',
    drip: '#9c8466',
    ray: '#e4c894',
  }),
  coal: atmosphere({
    darkness: '#050505',
    heroLight: '#c3b79f',
    localLight: '#8d6f45',
    fog: '#77746e',
    dust: '#bdb2a0',
    drip: '#7c7870',
    ray: '#c5b9a2',
  }),
  autumn: atmosphere({
    darkness: '#0b0a06',
    heroLight: '#f0d2a0',
    localLight: '#c98a44',
    fog: '#9a8a63',
    dust: '#e6c489',
    drip: '#a08a5e',
    ray: '#f2d6a4',
  }),
  bog: atmosphere({
    darkness: '#060a08',
    heroLight: '#a8c49a',
    localLight: '#5e8460',
    fog: '#7a9280',
    dust: '#b6ceb0',
    drip: '#6f9480',
    ray: '#b2cca6',
  }),
  meadow: atmosphere({
    darkness: '#0a0b07',
    heroLight: '#f2e4ac',
    localLight: '#c8a44e',
    fog: '#9aa070',
    dust: '#e8e2a4',
    drip: '#9ba86e',
    ray: '#f4e8b0',
  }),
  dusk: atmosphere({
    darkness: '#070809',
    heroLight: '#c6c8d2',
    localLight: '#7e8496',
    fog: '#7f8490',
    dust: '#c2c6d0',
    drip: '#848a96',
    ray: '#c8cad4',
  }),
  hamlet: atmosphere({
    darkness: '#0a0907',
    heroLight: '#e6cfa2',
    localLight: '#bb8f55',
    fog: '#948568',
    dust: '#dcc79c',
    drip: '#96866a',
    ray: '#e8d2a6',
  }),
  bramble: atmosphere({
    darkness: '#060806',
    heroLight: '#bcc890',
    localLight: '#77874a',
    fog: '#7e8a66',
    dust: '#c6d29a',
    drip: '#849060',
    ray: '#c0cc94',
  }),
  frost: atmosphere({
    darkness: '#080a0d',
    heroLight: '#dfe9f2',
    localLight: '#9ab4cc',
    fog: '#9fb0c0',
    dust: '#e6eef6',
    drip: '#a8bccd',
    ray: '#e2ecf4',
  }),
  scorch: atmosphere({
    darkness: '#0c0a05',
    heroLight: '#f4dc9e',
    localLight: '#cf9a3e',
    fog: '#a08f58',
    dust: '#ecd68e',
    drip: '#a89060',
    ray: '#f6e0a4',
  }),
  heath: atmosphere({
    darkness: '#090a06',
    heroLight: '#dcdc9c',
    localLight: '#9aa054',
    fog: '#909464',
    dust: '#dade9e',
    drip: '#949a66',
    ray: '#dee2a2',
  }),
  verdant: atmosphere({
    darkness: '#061009',
    heroLight: '#b8e0aa',
    localLight: '#5f9a5a',
    fog: '#7ba074',
    dust: '#c6e8b6',
    drip: '#76a874',
    ray: '#c2e4b0',
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
  bone: weather({ id: 'dust', driftX: 0.5, driftY: 0.2, sway: 18 }),
  prism: weather({ id: 'glimmer', driftX: 0.3, driftY: -0.2, sway: 24, alpha: 1.3 }),
  verdigris: weather({ id: 'drip', driftX: 0.15, driftY: 0.85, sway: 12, alpha: 1.2 }),
  mold: weather({ id: 'spores', driftX: 0.4, driftY: -0.35, sway: 22, alpha: 1.2 }),
  viscera: weather({ id: 'pulse', driftX: 0.2, driftY: -0.2, sway: 16, size: 1 }),
  moss: weather({ id: 'pollen', driftX: 0.7, driftY: -0.25, sway: 20, alpha: 1.1 }),
  cobalt: weather({ id: 'dust', driftX: 0.5, driftY: 0.3, sway: 16 }),
  magma: weather({ id: 'sparks', driftX: 0.35, driftY: -0.8, sway: 14, alpha: 1.5 }),
  loam: weather({ id: 'spores', driftX: 0.45, driftY: -0.2, sway: 18 }),
  iron: weather({ id: 'ash', driftX: 0.55, driftY: 0.3, sway: 18 }),
  sepia: weather({ id: 'sand', driftX: 1.3, driftY: 0.08, sway: 9, alpha: 1.1 }),
  coal: weather({ id: 'ash', driftX: 0.6, driftY: 0.35, sway: 20, alpha: 0.9 }),
  autumn: weather({ id: 'leaves', driftX: 0.8, driftY: 0.45, sway: 26, size: 1, alpha: 1.2 }),
  bog: weather({ id: 'midges', driftX: 0.35, driftY: -0.15, sway: 24, alpha: 1.25 }),
  meadow: weather({ id: 'pollen', driftX: 0.9, driftY: -0.2, sway: 22, alpha: 1.15 }),
  dusk: weather({ id: 'mist', driftX: 0.4, driftY: 0.15, sway: 20, alpha: 1.1 }),
  hamlet: weather({ id: 'ash', driftX: 0.6, driftY: 0.3, sway: 18, alpha: 0.95 }),
  bramble: weather({ id: 'seeds', driftX: 0.55, driftY: -0.3, sway: 24, alpha: 1.1 }),
  frost: weather({ id: 'snow', driftX: 0.3, driftY: 0.95, sway: 24, size: 1, alpha: 1.35 }),
  scorch: weather({ id: 'grit', driftX: 1.5, driftY: 0.1, sway: 10, alpha: 1.2 }),
  heath: weather({ id: 'chaff', driftX: 1.1, driftY: -0.15, sway: 20, alpha: 1.1 }),
  verdant: weather({ id: 'spores', driftX: 0.4, driftY: -0.3, sway: 22, alpha: 1.2 }),
});

export function chapterWeather(paletteId) {
  return CHAPTER_WEATHER[paletteId] ?? CHAPTER_WEATHER.slate;
}

export const BLOOD_FLOOR_PATHS = numberedPaths('dngn/floor/cobble_blood', [8, 9, 10, 12]);

/**
 * Two kinds of wall that are not the ground they stand on. A hut is timber
 * wherever it stands and a cave is granite wherever it is cut, so unlike the
 * terrain families these are shared on purpose — a hut that looked like the
 * meadow it sits in would not read as a hut at all.
 */
/**
 * What stands in a thicket. These are billboards on the ground, not wall faces:
 * a tree drawn on the side of a cube is the thing that looked wrong before.
 */
export const THICKET_PROPS = Object.freeze({
  'autumn-wood': Object.freeze([
    'dngn/trees/tree1_yellow.png',
    'dngn/trees/tree2_red.png',
    'dngn/trees/tree1_red.png',
    'dngn/trees/tree2_yellow.png',
    'dngn/trees/tree1_lightred.png',
  ]),
  mire: Object.freeze([
    'dngn/trees/mangrove1.png',
    'dngn/trees/mangrove2.png',
    'dngn/trees/mangrove3.png',
  ]),
  // Bramble is low, and a wood of nothing but low scrub reads as rough ground
  // rather than as a wood. The gaunt trees standing up out of it are what tells
  // the eye how tall the place is.
  thornwood: Object.freeze([
    'mon/fungi_plants/briar_patch.png',
    'mon/fungi_plants/bush2.png',
    'mon/fungi_plants/bush3.png',
    'mon/fungi_plants/bush4.png',
    'dngn/trees/tree1_lightred.png',
    'dngn/trees/tree2_lightred.png',
  ]),
});

export function thicketProps(themeId) {
  return THICKET_PROPS[themeId] ?? THICKET_PROPS['autumn-wood'];
}

/**
 * Scenery stands taller than the cell it occupies, so anything one step nearer
 * the camera than the hero paints straight over him — a tree, a sarcophagus, a
 * fallen column. That is honest depth order and it is meant to be there; what
 * is not meant to happen is the hero disappearing behind it. Nothing inanimate
 * hides him: what stands in the way thins out instead.
 *
 * Only the row in front matters: a prop two rows down reaches the row above it,
 * never the hero's own. Directly ahead it nearly vanishes; to either side it
 * only clips a shoulder, so it merely goes pale.
 */
export function sceneryOpacity(cell, heroCell) {
  if (!cell || !heroCell || cell.y !== heroCell.y + 1) return 1;
  const offset = Math.abs(cell.x - heroCell.x);
  if (offset === 0) return 0.3;
  if (offset === 1) return 0.68;
  return 1;
}

/**
 * A wall somebody built, and a wall cut out of a hill. There is no plank tile in
 * the set — `vault` was picked for one and turned out to be gold-and-red palace
 * stone, which is not what a hut in a wood is made of. Brown block with pale
 * mortar is the plainest dwelling wall we own: still not timber, but it reads as
 * somebody's house rather than as somebody's treasury.
 */
/**
 * A brook in the open runs clear and catches the light; water that stands —
 * a bog, a flooded cellar, a cistern underground — goes dark and murky. A place
 * says which of the two it has; everything that does not say keeps the still,
 * dark water the dungeon has always had.
 */
export const WATER_TILES = Object.freeze({
  still: Object.freeze(['dngn/water/shallow_water.png', 'dngn/water/shallow_water2.png']),
  running: numberedPaths('dngn/water/shoals_shallow_water', [0, 2, 4, 6, 8, 10]),
});

/**
 * Under the shimmer every body of water is the same dark bed. The bright, lively
 * frames belong on the surface and not underneath it: laid down as the floor
 * they lit the whole lake like a lamp, and next to that light the wall standing
 * at its edge read as a hole cut through the water rather than as a wall.
 */
export const WATER_BED = WATER_TILES.still;

export function waterTiles(themeId) {
  const theme = BIOME_THEMES.find((entry) => entry.id === themeId);
  return WATER_TILES[theme?.water ?? 'still'] ?? WATER_TILES.still;
}

export const BUILT_WALLS = numberedPaths('dngn/wall/stone2_brown', [0, 1, 2, 3]);
export const HEWN_WALLS = numberedPaths('dngn/wall/stone_gray', [0, 1, 2, 3]);

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
      background: '#0f141d',
      fog: '#141b26',
      fogDensity: 0.008,
      ambient: '#9aa6b4',
      // A town is the one place that is not a cave: it is lit before the hero
      // gets there, and everything people left on its streets can be seen.
      ambientIntensity: 1.05,
      keyLight: '#f4d79a',
    }),
  }),
  Object.freeze({
    id: 'catacomb-tiers',
    palette: 'bone',
    floors: numberedPaths('dngn/floor/limestone', [0, 1, 2, 4, 5, 6, 7, 9]),
    walls: numberedPaths('dngn/wall/catacombs', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fbf9f2',
      wallTint: '#f6f3ea',
      actorTint: '#eae6da',
      background: '#06070a',
      fog: '#080a0c',
      fogDensity: 0.019,
      ambient: '#8d8b80',
      keyLight: '#ded3ad',
    }),
  }),
  Object.freeze({
    id: 'crystal-hollow',
    palette: 'prism',
    floors: numberedPaths('dngn/floor/crystal_floor', [0, 1, 2, 3, 4, 5]),
    walls: numberedPaths('dngn/wall/crystal_wall', ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']),
    accentWalls: [
      'dngn/wall/crystal_wall_lightmagenta.png',
      'dngn/wall/crystal_wall_magenta.png',
    ],
    accentModulo: 15,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#f2f4ff',
      wallTint: '#eef1ff',
      actorTint: '#e2e6f6',
      background: '#050712',
      fog: '#080b18',
      fogDensity: 0.02,
      ambient: '#8493bd',
      keyLight: '#c3cdf2',
    }),
  }),
  Object.freeze({
    id: 'drowned-palace',
    palette: 'verdigris',
    floors: numberedPaths('dngn/floor/mosaic', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
    walls: numberedPaths('dngn/wall/marble_wall', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#f0fbf6',
      wallTint: '#edf8f3',
      actorTint: '#dceee6',
      background: '#030b0b',
      fog: '#061010',
      fogDensity: 0.021,
      ambient: '#6f9a8e',
      keyLight: '#a6d8c6',
    }),
  }),
  Object.freeze({
    id: 'bone-fields',
    palette: 'mold',
    floors: numberedPaths('dngn/floor/green_bones', ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']),
    walls: numberedPaths('dngn/wall/undead', [0, 1, 2, 3]),
    accentWalls: [
      'dngn/wall/stone_black_marked0.png',
    ],
    accentModulo: 19,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#f6fbea',
      wallTint: '#f1f7e4',
      actorTint: '#e2ead2',
      background: '#050803',
      fog: '#070b06',
      fogDensity: 0.02,
      ambient: '#7c8c60',
      keyLight: '#c2d189',
    }),
  }),
  Object.freeze({
    id: 'flesh-deep',
    palette: 'viscera',
    floors: numberedPaths('dngn/floor/floor_nerves', [0, 1, 2, 3, 4, 5, 6]),
    walls: numberedPaths('dngn/wall/wall_flesh', [0, 1, 2, 3, 4, 5, 6]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 29,
    world3d: Object.freeze({
      floorTint: '#ffeef7',
      wallTint: '#ffe8f2',
      actorTint: '#eed4e2',
      background: '#0a030a',
      fog: '#100610',
      fogDensity: 0.022,
      ambient: '#874f6b',
      keyLight: '#d28fae',
    }),
  }),
  Object.freeze({
    id: 'overgrown-ruin',
    palette: 'moss',
    floors: numberedPaths('dngn/floor/floor_vines', [0, 1, 2, 3, 4, 5, 6]),
    walls: numberedPaths('dngn/wall/wall_vines', [0, 1, 2, 3, 4, 5, 6]),
    accentWalls: [
      'dngn/wall/slime_stone0.png',
    ],
    accentModulo: 21,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#f3fbee',
      wallTint: '#eff8e9',
      actorTint: '#dfebd4',
      background: '#040903',
      fog: '#070d07',
      fogDensity: 0.02,
      ambient: '#6d8c63',
      keyLight: '#b4d195',
    }),
  }),
  Object.freeze({
    id: 'cobalt-mine',
    palette: 'cobalt',
    floors: numberedPaths('dngn/floor/black_cobalt', ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']),
    walls: numberedPaths('dngn/wall/cobalt_stone', ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']),
    accentWalls: [
      'dngn/wall/cobalt_rock1.png',
    ],
    accentModulo: 23,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#eef3ff',
      wallTint: '#e9eefc',
      actorTint: '#dae1f1',
      background: '#03060f',
      fog: '#060a14',
      fogDensity: 0.019,
      ambient: '#6c7ea8',
      keyLight: '#a3b8e2',
    }),
  }),
  Object.freeze({
    id: 'magma-shelf',
    palette: 'magma',
    floors: numberedPaths('dngn/floor/volcanic_floor', [0, 1, 2, 3, 4, 5, 6]),
    walls: numberedPaths('dngn/wall/volcanic_wall', [0, 1, 2, 3, 4, 5, 6]),
    accentWalls: [
      'dngn/wall/permarock_red0.png',
    ],
    accentModulo: 17,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fff3e8',
      wallTint: '#ffece0',
      actorTint: '#f2d9c4',
      background: '#0a0302',
      fog: '#120603',
      fogDensity: 0.022,
      ambient: '#95523a',
      keyLight: '#f0a05c',
    }),
  }),
  Object.freeze({
    id: 'beast-lair',
    palette: 'loam',
    floors: numberedPaths('dngn/floor/lair', [0, 1, 2, 3, 4, 5, 6, 7]),
    walls: numberedPaths('dngn/wall/lair', [0, 1, 2, 3]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 43,
    world3d: Object.freeze({
      floorTint: '#fcf6ea',
      wallTint: '#f8f1e3',
      actorTint: '#eadfc9',
      background: '#070503',
      fog: '#0a0705',
      fogDensity: 0.019,
      ambient: '#8a7452',
      keyLight: '#d6b884',
    }),
  }),
  Object.freeze({
    id: 'orc-stronghold',
    palette: 'iron',
    floors: numberedPaths('dngn/floor/orc', [0, 1, 2, 3, 4, 5, 6, 7]),
    walls: numberedPaths('dngn/wall/orc', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 53,
    world3d: Object.freeze({
      floorTint: '#f7f5ee',
      wallTint: '#f2efe6',
      actorTint: '#e4dfd2',
      background: '#06070a',
      fog: '#090a0c',
      fogDensity: 0.019,
      ambient: '#807e74',
      keyLight: '#c6b892',
    }),
  }),
  Object.freeze({
    id: 'funeral-hall',
    palette: 'sepia',
    floors: numberedPaths('dngn/floor/sandstone_floor', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    walls: numberedPaths('dngn/wall/tomb', [0, 1, 2, 3]),
    accentWalls: [
      'dngn/wall/relief_brown0.png',
    ],
    accentModulo: 25,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fff8ec',
      wallTint: '#fdf4e6',
      actorTint: '#eddfc7',
      background: '#090604',
      fog: '#0d0906',
      fogDensity: 0.02,
      ambient: '#96805f',
      keyLight: '#e2bf85',
    }),
  }),
  Object.freeze({
    id: 'deep-mine',
    palette: 'coal',
    floors: numberedPaths('dngn/floor/grey_dirt', [0, 1, 2, 3, 4, 5, 6, 7]),
    walls: numberedPaths('dngn/wall/lab-rock', [0, 1, 2, 3]),
    accentWalls: [
      'dngn/wall/lab-stone0.png',
      'dngn/wall/lab-metal0.png',
    ],
    accentModulo: 13,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#f4f2ec',
      wallTint: '#efece5',
      actorTint: '#e0dbcf',
      background: '#040404',
      fog: '#070707',
      fogDensity: 0.021,
      ambient: '#736f66',
      keyLight: '#bfae8a',
    }),
  }),
  Object.freeze({
    id: 'autumn-wood',
    water: 'running',
    palette: 'autumn',
    floors: Object.freeze([
      'dngn/floor/grass/grass0.png',
      'dngn/floor/grass/grass1.png',
      'dngn/floor/grass/grass2.png',
    ]),
    walls: numberedPaths('dngn/wall/pebble_red', [0, 1, 2, 3]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fdf6e6',
      wallTint: '#f8f1e0',
      actorTint: '#eee2c8',
      background: '#0a0906',
      fog: '#0e0c08',
      fogDensity: 0.014,
      ambient: '#a08f68',
      keyLight: '#f4d69f',
    }),
  }),
  Object.freeze({
    id: 'mire',
    palette: 'bog',
    floors: Object.freeze([
      'dngn/floor/swamp0.png',
      'dngn/floor/swamp1.png',
      'dngn/floor/swamp2.png',
      'dngn/floor/swamp3.png',
    ]),
    walls: numberedPaths('dngn/wall/shoals_wall', [1, 2, 3, 4]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#ffffff',
      wallTint: '#f6fbf4',
      actorTint: '#e8f0e4',
      background: '#080e0c',
      fog: '#0c1411',
      fogDensity: 0.015,
      ambient: '#a8bfa8',
      keyLight: '#d8e6cc',
    }),
  }),
  Object.freeze({
    id: 'flower-meadow',
    water: 'running',
    palette: 'meadow',
    floors: Object.freeze([
      'dngn/floor/grass/grass_flowers_blue1.png',
      'dngn/floor/grass/grass_flowers_blue2.png',
      'dngn/floor/grass/grass_flowers_blue3.png',
      'dngn/floor/grass/grass_flowers_red1.png',
      'dngn/floor/grass/grass_flowers_red2.png',
      'dngn/floor/grass/grass_flowers_red3.png',
      'dngn/floor/grass/grass_flowers_yellow1.png',
      'dngn/floor/grass/grass_flowers_yellow2.png',
      'dngn/floor/grass/grass_flowers_yellow3.png',
    ]),
    walls: numberedPaths('dngn/wall/brick_brown-vines', [1, 2, 3, 4]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fdfcec',
      wallTint: '#f9f7e6',
      actorTint: '#efeccf',
      background: '#090a06',
      fog: '#0d0e09',
      fogDensity: 0.013,
      ambient: '#9ea472',
      keyLight: '#f2e6a8',
    }),
  }),
  Object.freeze({
    id: 'old-graveyard',
    water: 'running',
    palette: 'dusk',
    floors: Object.freeze([
      'dngn/floor/moss0.png',
      'dngn/floor/moss1.png',
      'dngn/floor/moss2.png',
      'dngn/floor/moss3.png',
    ]),
    walls: numberedPaths('dngn/wall/undead_brown', [0, 1, 2, 3]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#ffffff',
      wallTint: '#f7f8fd',
      actorTint: '#e6e8f0',
      background: '#0a0b0d',
      fog: '#0e1014',
      fogDensity: 0.015,
      ambient: '#a3a9ba',
      keyLight: '#dadee8',
    }),
  }),
  Object.freeze({
    id: 'abandoned-hamlet',
    water: 'running',
    palette: 'hamlet',
    floors: Object.freeze([
      'dngn/floor/grey_dirt_b_0.png',
      'dngn/floor/grey_dirt_b_1.png',
      'dngn/floor/grey_dirt_b_2.png',
      'dngn/floor/grey_dirt_b_3.png',
      'dngn/floor/grey_dirt_b_4.png',
      'dngn/floor/grey_dirt_b_5.png',
      'dngn/floor/grey_dirt_b_6.png',
      'dngn/floor/grey_dirt_b_7.png',
    ]),
    walls: numberedPaths('dngn/wall/stone2_brown', [0, 1, 2, 3]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 37,
    world3d: Object.freeze({
      floorTint: '#fbf6ea',
      wallTint: '#f6f0e2',
      actorTint: '#e9dec6',
      background: '#080705',
      fog: '#0b0a07',
      fogDensity: 0.016,
      ambient: '#95856a',
      keyLight: '#e4cb9c',
    }),
  }),
  Object.freeze({
    id: 'thornwood',
    water: 'running',
    palette: 'bramble',
    floors: Object.freeze([
      'dngn/floor/lair0b.png',
      'dngn/floor/lair1b.png',
      'dngn/floor/lair2b.png',
      'dngn/floor/lair3b.png',
      'dngn/floor/lair4b.png',
      'dngn/floor/lair5b.png',
      'dngn/floor/lair6b.png',
      'dngn/floor/lair7b.png',
    ]),
    // Where the brambles end the ground turns to mossy rock. Honeycomb was the
    // first pick and it read as exactly that: a wall of beehives round a wood.
    walls: numberedPaths('dngn/wall/lair', [0, 1, 2, 3]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#ffffff',
      wallTint: '#fbfdf2',
      actorTint: '#eaf0da',
      background: '#0a0d08',
      fog: '#0e120b',
      fogDensity: 0.013,
      ambient: '#b4c091',
      keyLight: '#e0e8bc',
    }),
  }),
  Object.freeze({
    id: 'snowfield',
    water: 'running',
    palette: 'frost',
    floors: numberedPaths('dngn/floor/white_marble', [0, 1, 2, 4, 5, 6, 7, 9]),
    walls: numberedPaths('dngn/wall/stone2_gray', [0, 1, 2, 3]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#f6fbff',
      wallTint: '#f2f7fd',
      actorTint: '#e6edf5',
      background: '#070a0d',
      fog: '#0a0e12',
      fogDensity: 0.016,
      ambient: '#93a6b8',
      keyLight: '#dbe8f4',
    }),
  }),
  Object.freeze({
    id: 'sunburnt-steppe',
    water: 'running',
    palette: 'scorch',
    floors: Object.freeze([
      'dngn/floor/snake-d0.png',
      'dngn/floor/snake-d1.png',
      'dngn/floor/snake-d2.png',
      'dngn/floor/snake-d3.png',
    ]),
    walls: numberedPaths('dngn/wall/relief', [0, 1, 2, 3]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#ffffff',
      wallTint: '#fffcf0',
      actorTint: '#f6ecd2',
      background: '#12100a',
      fog: '#17140d',
      fogDensity: 0.008,
      ambient: '#d6c089',
      keyLight: '#fff0bc',
    }),
  }),
  Object.freeze({
    id: 'wild-heath',
    water: 'running',
    palette: 'heath',
    floors: Object.freeze([
      'dngn/floor/snake-c0.png',
      'dngn/floor/snake-c1.png',
      'dngn/floor/snake-c2.png',
      'dngn/floor/snake-c3.png',
    ]),
    walls: numberedPaths('dngn/wall/snake', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#ffffff',
      wallTint: '#fdfdf2',
      actorTint: '#f0f0d8',
      background: '#0e0f09',
      fog: '#12140c',
      fogDensity: 0.01,
      ambient: '#c2c688',
      keyLight: '#f0f4b8',
    }),
  }),
  Object.freeze({
    id: 'green-hollow',
    water: 'running',
    palette: 'verdant',
    floors: Object.freeze([
      'dngn/floor/snake-a0.png',
      'dngn/floor/snake-a1.png',
      'dngn/floor/snake-a2.png',
      'dngn/floor/snake-a3.png',
    ]),
    walls: numberedPaths('dngn/wall/slime', [0, 1, 2, 3, 4, 5, 6, 7]),
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#ffffff',
      wallTint: '#f8fdf4',
      actorTint: '#e8f2e0',
      background: '#0a120c',
      fog: '#0e1710',
      fogDensity: 0.012,
      ambient: '#a2c698',
      keyLight: '#d8f0c8',
    }),
  }),
  // ── Подвалы: третья дорога ──────────────────────────────────────────────
  // Две прежние дороги природные: пещеры, которые промыло, и земля под небом.
  // Эта — рукотворная: лабиринт, мастерская, зверинец, хранилище. Отсюда и
  // другой силуэт — решётки, клетки и коридоры, которые спроектировали.
  Object.freeze({
    id: 'sunken-labyrinth',
    palette: 'slate',
    floors: ['dngn/floor/labyrinth0.png', 'dngn/floor/labyrinth1.png', 'dngn/floor/labyrinth2.png', 'dngn/floor/labyrinth3.png'],
    walls: ['dngn/wall/lab-stone1.png', 'dngn/wall/lab-stone2.png', 'dngn/wall/lab-stone3.png', 'dngn/wall/lab-stone4.png', 'dngn/wall/lab-stone5.png'],
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#e8eef2',
      wallTint: '#dfe7ec',
      actorTint: '#dde4e8',
      background: '#04070a',
      fog: '#070c11',
      fogDensity: 0.021,
      ambient: '#6f8494',
      keyLight: '#b9cede',
    }),
  }),
  Object.freeze({
    id: 'iron-workshop',
    palette: 'iron',
    floors: ['dngn/floor/mesh0.png', 'dngn/floor/mesh1.png', 'dngn/floor/mesh2.png', 'dngn/floor/mesh3.png'],
    walls: ['dngn/wall/lab-metal1.png', 'dngn/wall/lab-metal2.png', 'dngn/wall/lab-metal3.png', 'dngn/wall/lab-metal4.png', 'dngn/wall/lab-metal5.png', 'dngn/wall/lab-metal6.png'],
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#f2f0ea',
      wallTint: '#eceae4',
      actorTint: '#e2ded4',
      background: '#070707',
      fog: '#0a0a0a',
      fogDensity: 0.02,
      ambient: '#7e8188',
      keyLight: '#cfc9b4',
    }),
  }),
  Object.freeze({
    id: 'menagerie',
    palette: 'viscera',
    floors: ['dngn/floor/cage0.png', 'dngn/floor/cage1.png', 'dngn/floor/cage2.png', 'dngn/floor/cage3.png', 'dngn/floor/cage4.png', 'dngn/floor/cage5.png'],
    walls: ['dngn/wall/bars_red03.png', 'dngn/wall/bars_red04.png', 'dngn/wall/bars_red05.png', 'dngn/wall/bars_red06.png', 'dngn/wall/bars_red07.png', 'dngn/wall/bars_red08.png'],
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#ffe9e6',
      wallTint: '#f6dcd8',
      actorTint: '#eccfca',
      background: '#0a0505',
      fog: '#0e0707',
      fogDensity: 0.022,
      ambient: '#8c5f5c',
      keyLight: '#d99a86',
    }),
  }),
  Object.freeze({
    id: 'marble-sanctum',
    palette: 'bone',
    floors: ['dngn/floor/marble_floor1.png', 'dngn/floor/marble_floor2.png', 'dngn/floor/marble_floor3.png', 'dngn/floor/marble_floor4.png', 'dngn/floor/marble_floor5.png', 'dngn/floor/marble_floor6.png'],
    walls: ['dngn/wall/relief_brown1.png', 'dngn/wall/relief_brown2.png', 'dngn/wall/relief_brown3.png'],
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fffdf8',
      wallTint: '#fffdf8',
      actorTint: '#f4eee2',
      background: '#0a0908',
      fog: '#0d0c0a',
      fogDensity: 0.016,
      ambient: '#9a9384',
      keyLight: '#e8d9b4',
    }),
  }),
  Object.freeze({
    id: 'emerald-gallery',
    palette: 'verdigris',
    floors: ['dngn/floor/mosaic14.png', 'dngn/floor/mosaic15.png'],
    walls: ['dngn/wall/emerald1.png', 'dngn/wall/emerald2.png', 'dngn/wall/emerald3.png', 'dngn/wall/emerald4.png', 'dngn/wall/emerald5.png', 'dngn/wall/emerald6.png', 'dngn/wall/emerald7.png', 'dngn/wall/emerald8.png'],
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#eafff4',
      wallTint: '#e0f7ec',
      actorTint: '#d6ecdf',
      background: '#040a07',
      fog: '#070f0b',
      fogDensity: 0.019,
      ambient: '#5f9480',
      keyLight: '#a9e0c2',
    }),
  }),
  Object.freeze({
    id: 'hive-vault',
    palette: 'ochre',
    floors: ['dngn/floor/etched0.png', 'dngn/floor/etched1.png', 'dngn/floor/etched2.png', 'dngn/floor/etched3.png', 'dngn/floor/etched4.png', 'dngn/floor/etched5.png'],
    walls: ['dngn/wall/beehives0.png', 'dngn/wall/beehives1.png', 'dngn/wall/beehives2.png', 'dngn/wall/beehives3.png', 'dngn/wall/beehives4.png', 'dngn/wall/beehives5.png', 'dngn/wall/beehives6.png', 'dngn/wall/beehives7.png'],
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fff4d9',
      wallTint: '#fbe9c6',
      actorTint: '#efdcb6',
      background: '#0b0803',
      fog: '#0f0b05',
      fogDensity: 0.021,
      ambient: '#9c8348',
      keyLight: '#e3bd6a',
    }),
  }),
  Object.freeze({
    id: 'sand-archive',
    palette: 'sepia',
    floors: ['dngn/floor/limestone3.png', 'dngn/floor/limestone8.png'],
    walls: ['dngn/wall/sandstone_wall8.png', 'dngn/wall/sandstone_wall9.png'],
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#fff6e8',
      wallTint: '#f8ecda',
      actorTint: '#ecdcc4',
      background: '#0a0805',
      fog: '#0e0b07',
      fogDensity: 0.018,
      ambient: '#96826a',
      keyLight: '#dfc192',
    }),
  }),
  Object.freeze({
    id: 'zot-cells',
    palette: 'cobalt',
    floors: ['dngn/floor/rect_gray0.png', 'dngn/floor/rect_gray1.png', 'dngn/floor/rect_gray2.png', 'dngn/floor/rect_gray3.png'],
    walls: ['dngn/wall/zot_blue0.png', 'dngn/wall/zot_blue1.png', 'dngn/wall/zot_blue2.png', 'dngn/wall/zot_blue3.png'],
    accentWalls: [],
    accentModulo: 0,
    bloodModulo: 0,
    world3d: Object.freeze({
      floorTint: '#eef3ff',
      wallTint: '#e6ecfb',
      actorTint: '#dbe2f0',
      background: '#03060f',
      fog: '#060a14',
      fogDensity: 0.02,
      ambient: '#6c7ea8',
      keyLight: '#a6b8e0',
    }),
  }),
]);

/**
 * The surfaces a floor is built from. Keyed by the floor's own theme, because
 * which place a floor is now depends on the run seed and cannot be read off its
 * depth any more.
 */
export function biomeThemeFor(themeId) {
  const dungeonTheme = dungeonThemeById(themeId);
  if (!dungeonTheme) throw new Error(`Unknown dungeon theme: ${themeId}`);
  const biome = BIOME_THEMES.find(({ id }) => id === dungeonTheme.surfaceSetId);
  if (!biome) throw new Error(`Missing biome surfaces for ${dungeonTheme.surfaceSetId}`);
  return biome;
}

export function atmosphereThemeFor(themeId) {
  return ATMOSPHERE_THEMES[biomeThemeFor(themeId).palette];
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

/**
 * Everything the biomes draw with, each file once. Two places may well stand the
 * same tree — a gaunt red trunk suits both an autumn wood and a thorn wood — and
 * the answer to "what must be loaded" is a set, not a tally of mentions.
 */
export function allBiomeAssetPaths() {
  return [...new Set([
    ...Object.values(WATER_TILES).flat(),
    ...BLOOD_FLOOR_PATHS,
    ...BUILT_WALLS,
    ...HEWN_WALLS,
    ...Object.values(THICKET_PROPS).flat(),
    ...BIOME_THEMES.flatMap(({ floors, walls, accentWalls }) => [
      ...floors,
      ...walls,
      ...accentWalls,
    ]),
  ])];
}
