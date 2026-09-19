import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { RUN_BRANCHES } from '../tools/dcss-rpg-content.js';
import { readFile } from 'node:fs/promises';

import { generateDungeon } from '../tools/dcss-rpg-core.js';

import {
  ATMOSPHERE_THEMES,
  BIOME_THEMES,
  BLOOD_FLOOR_PATHS,
  PIXEL_EFFECT_SCALE,
  VISIBILITY_TUNING,
  allBiomeAssetPaths,
  COMBAT_GLYPH_DRIFT,
  FOG_TUNING,
  combatGlyphDrift,
  atmosphereThemeFor,
  fogTileOpacity,
  biomeThemeFor,
  deterministicAtmosphereMote,
  fogAnchorsForDungeon,
} from '../tools/dcss-rpg-visuals.js';
import { dungeonThemeFor, OPENING_THEME_IDS } from '../tools/dcss-rpg-room-plans.js';
import { FLOORS_PER_CHAPTER, STORY_DEPTH } from '../tools/dcss-rpg-run.js';

const biomeAt = (seed, depth) => biomeThemeFor(dungeonThemeFor(seed, depth).id);

test('a chapter keeps one place for a whole chapter, and the places never run out', () => {
  // Where each chapter starts, well past the end of the written road: the
  // descent does not stop there, so neither does this.
  const chapterStarts = Array.from({ length: 12 }, (_c, index) => index * FLOORS_PER_CHAPTER + 1);
  for (const seed of [1, 7, 42, 4242]) {
    // One place for the whole chapter, then somewhere else: a chapter is still
    // a chapter, it simply is not the same chapter every run.
    for (const first of chapterStarts) {
      const chapter = biomeAt(seed, first);
      for (let step = 1; step < FLOORS_PER_CHAPTER; step += 1) {
        assert.equal(biomeAt(seed, first + step), chapter, `seed ${seed}, floor ${first + step}`);
      }
      // And the next chapter is somewhere else, every time, for as long as
      // anybody keeps going down.
      assert.notEqual(
        biomeAt(seed, first + FLOORS_PER_CHAPTER).id,
        chapter.id,
        `seed ${seed}: floor ${first + FLOORS_PER_CHAPTER} is the same place again`,
      );
    }
    // The written road shows three places and never the same one twice:
    // sixteen themes, three chapters, so most of the world stays behind.
    const road = chapterStarts.filter((depth) => depth <= STORY_DEPTH);
    const met = new Set(road.map((depth) => biomeAt(seed, depth).id));
    assert.equal(met.size, road.length, `seed ${seed} repeats a place on the road`);
  }
  // The surface is never shuffled: the town is the town.
  assert.equal(biomeThemeFor('gate-town').id, 'gate-town');
});

test('every place the game ships is actually met, the infernal core included', () => {
  const met = new Set();
  const openings = new Set();
  for (const branch of RUN_BRANCHES) {
    for (let seed = 0; seed < 400; seed += 1) {
      for (let depth = 1; depth <= STORY_DEPTH; depth += FLOORS_PER_CHAPTER) {
        met.add(dungeonThemeFor(seed, depth, branch).surfaceSetId);
      }
      openings.add(dungeonThemeFor(seed, 1, branch).surfaceSetId);
    }
  }
  // Everything the game ships has to be reachable. Before the shuffle the
  // fourth theme sat at a chapter index nine floors never reach, so nobody had
  // ever seen the infernal core; now sixteen places all turn up, the town aside.
  assert.equal(met.size, BIOME_THEMES.length - 1, 'a biome is still unreachable');
  assert.ok(met.has('infernal-core'), 'the infernal core is still shipped and never met');
  assert.ok(met.has('flesh-deep') && met.has('crystal-hollow') && met.has('deep-mine'));
  // And the first floor of a descent is always the same place, while the roads
  // out still open wherever the shuffle put them.
  assert.equal(dungeonThemeFor(7, 1, 'deep').id, OPENING_THEME_IDS[0]);
  assert.equal(dungeonThemeFor(999, 1, 'deep').id, OPENING_THEME_IDS[0]);
  assert.ok(openings.size > 2, 'no branch opens anywhere but its one place');
});

test('biome themes are deterministic, bounded and reference local assets', async () => {
  assert.throws(() => biomeThemeFor('nonsense'), /Unknown dungeon theme/);
  assert.equal(biomeAt(0, 9), biomeThemeFor(dungeonThemeFor(0, 9).id));
  const paths = allBiomeAssetPaths();
  assert.equal(new Set(paths).size, paths.length);
  await Promise.all(
    paths.map((path) =>
      access(new URL(`../public/assets/dcss-preview/${path}`, import.meta.url)),
    ),
  );
});

test('atmosphere keeps a four-pixel render grid and a complete biome palette', () => {
  assert.equal(PIXEL_EFFECT_SCALE, 4);
  for (let depth = 1; depth <= 8; depth += 1) {
    const biome = biomeAt(11, depth);
    const themeId = dungeonThemeFor(11, depth).id;
    assert.equal(atmosphereThemeFor(themeId), ATMOSPHERE_THEMES[biome.palette]);
    assert.match(atmosphereThemeFor(themeId).fog, /^#[0-9a-f]{6}$/i);
    assert.match(biome.world3d.actorTint, /^#[0-9a-f]{6}$/i);
    assert.ok(Object.values(biome.world3d).every((value) => typeof value === 'number' || /^#[0-9a-f]{6}$/i.test(value)));
  }
});

test('visibility keeps the dungeon readable without removing the fog-of-war mood', () => {
  assert.ok(VISIBILITY_TUNING.darknessOpacity >= 0.08);
  assert.ok(VISIBILITY_TUNING.darknessOpacity <= 0.18);
  assert.ok(VISIBILITY_TUNING.heroRevealRadius >= 280);
  assert.ok(VISIBILITY_TUNING.heroCarveStrength >= 0.9);
  assert.ok(VISIBILITY_TUNING.distantFogOpacity <= 0.18);
  assert.match(VISIBILITY_TUNING.spriteFilter, /brightness\(0\.[7-9]/);
  assert.match(VISIBILITY_TUNING.spriteFilter, /saturate\(0\.[67]/);
  assert.match(VISIBILITY_TUNING.spriteFilter, /contrast\(0\.9/);
});

test('ambient motes are seeded, bounded and distributed across three depth layers', () => {
  const first = Array.from({ length: 96 }, (_, index) =>
    deterministicAtmosphereMote(731923, index, 34 * 64, 24 * 64),
  );
  const second = Array.from({ length: 96 }, (_, index) =>
    deterministicAtmosphereMote(731923, index, 34 * 64, 24 * 64),
  );
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map(({ layer }) => layer)).size, 3);
  assert.ok(first.every(({ x, y, size }) => x >= 0 && x <= 34 * 64 && y >= 0 && y <= 24 * 64 && size >= 1 && size <= 3));
});

test('fog anchors belong to dungeon rooms instead of following the hero', () => {
  // Real rooms carry width/height; the old w/h fixture hid a NaN for months.
  const rooms = [
    { x: 2, y: 3, width: 7, height: 6 },
    { x: 12, y: 8, width: 5, height: 5 },
  ];
  const options = { seed: 731923, spawn: { x: 4, y: 5 }, rooms, tileSize: 64 };
  const first = fogAnchorsForDungeon(options);
  const second = fogAnchorsForDungeon(options);
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(first.length, 5);
  assert.ok(
    first.slice(0, 4).every(({ x, y }) =>
      x > rooms[0].x * 64 &&
      x < (rooms[0].x + rooms[0].width) * 64 &&
      y > rooms[0].y * 64 &&
      y < (rooms[0].y + rooms[0].height) * 64,
    ),
  );
  assert.notDeepEqual(
    first,
    fogAnchorsForDungeon({ ...options, seed: options.seed + 1 }),
  );
  // And the rooms a real floor produces must give real coordinates.
  const level = generateDungeon({ seed: 5, depth: 1 });
  const live = fogAnchorsForDungeon({
    seed: level.seed,
    spawn: level.spawn,
    rooms: level.rooms,
    tileSize: 64,
  });
  assert.ok(live.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)), 'mist needs a place to be');
});

test('the renderer filters each sprite once instead of once per draw', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(
    runtime,
    /function filteredSprite\(path, sprite, filter\)[\s\S]*filteredSprites\.set\(key, canvas\)/,
    'a filtered copy is kept, not recomputed',
  );
  assert.doesNotMatch(runtime, /context\.filter = options\.filter/, 'no per-draw filter remains');
  assert.match(runtime, /context\.drawImage\(source, -drawWidth \/ 2/);
});

test('the shadow budget is a named pair, sized for a phone', async () => {
  const world3d = await readFile(new URL('../tools/dcss-rpg-world3d.js', import.meta.url), 'utf8');
  assert.match(world3d, /export const WORLD_SHADOW_MAP_SIZE = 512;/);
  assert.match(world3d, /export const WORLD_SHADOW_EXTENT = 7;/);
  assert.match(world3d, /keyLight\.shadow\.mapSize\.set\(WORLD_SHADOW_MAP_SIZE, WORLD_SHADOW_MAP_SIZE\);/);
  assert.match(world3d, /keyLight\.shadow\.camera\.left = -WORLD_SHADOW_EXTENT;/);
});

test('the dark beyond the light is a place, not a hole', () => {
  const near = fogTileOpacity({ known: true, distance: 1 });
  assert.equal(near, 0, 'ground the hero is standing on is not fogged');
  // Remembered ground dims with distance instead of stepping down at one radius.
  const steps = [6, 8, 10, 12].map((distance) => fogTileOpacity({ known: true, distance }));
  for (let index = 1; index < steps.length; index += 1) {
    assert.ok(steps[index] > steps[index - 1], `remembered fog is flat at ${index}`);
  }
  assert.ok(steps.at(-1) <= VISIBILITY_TUNING.distantFogOpacity + 1e-9, 'remembered ground never goes black');

  // Just past the edge of sight the dark is thinner, so a room reads as
  // continuing rather than ending.
  const edge = fogTileOpacity({ known: false, distance: FOG_TUNING.nearRadius });
  const deep = fogTileOpacity({ known: false, distance: 40 });
  assert.ok(edge > 0 && edge < deep, 'the edge of knowledge still cuts');
  assert.ok(edge / deep > 0.4 && edge / deep < 0.8, 'the softening is either invisible or a hole');
  assert.equal(deep, FOG_TUNING.unknownOpacity);
  // Unknown ground is always darker than remembered ground at the same distance.
  for (const distance of [6, 9, 14]) {
    assert.ok(
      fogTileOpacity({ known: false, distance }) > fogTileOpacity({ known: true, distance }),
      `unknown and remembered look the same at ${distance}`,
    );
  }
  assert.equal(fogTileOpacity({}), fogTileOpacity({ known: false, distance: 0 }));
});

test('every biome owns its own darkness instead of one shared black', () => {
  // The fog used to be a hard-coded near-black, so the infernal core was unlit
  // in exactly the colour of the frozen depths.
  const darks = Object.values(ATMOSPHERE_THEMES).map(({ darkness }) => darkness);
  assert.equal(new Set(darks).size, darks.length, 'two biomes share a darkness');
  for (const dark of darks) assert.match(dark, /^#[0-9a-f]{6}$/i);
  const source = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const fog = source.slice(source.indexOf('function drawFog()'));
  assert.match(fog.slice(0, 900), /atmosphereThemeFor\(dungeon\.themeId\)\.darkness/);
  assert.doesNotMatch(fog.slice(0, 900), /#020405/, 'the fog still paints a hard-coded black');
});

test('two actors on one tile no longer stack their numbers on one spot', () => {
  // The hero is struck from the left; the monster is struck from the right.
  const heroDrift = combatGlyphDrift({ x: 100, y: 100, sourceX: 40, sourceY: 100 });
  const monsterDrift = combatGlyphDrift({ x: 100, y: 100, sourceX: 160, sourceY: 100 });
  assert.ok(heroDrift.dx > 0 && monsterDrift.dx < 0, 'both numbers still go the same way');
  assert.ok(Math.abs(heroDrift.dx - monsterDrift.dx) > COMBAT_GLYPH_DRIFT.sideways, 'they barely separate');
  // The drift is a direction, not a distance: a blow from far away pushes the
  // number exactly as far as a blow from next door.
  const near = combatGlyphDrift({ x: 0, y: 0, sourceX: -10, sourceY: 0 });
  const far = combatGlyphDrift({ x: 0, y: 0, sourceX: -900, sourceY: 0 });
  assert.equal(near.dx, far.dx);
  assert.equal(Math.round(Math.hypot(near.dx, near.dy)), COMBAT_GLYPH_DRIFT.sideways);
  // A blow with no direction — a trap underfoot, a poison tick — still rises
  // straight up, because there is nothing to move away from.
  assert.deepEqual(combatGlyphDrift({ x: 5, y: 5, sourceX: 5, sourceY: 5 }), { dx: 0, dy: 0 });
  assert.deepEqual(combatGlyphDrift({ x: 5, y: 5 }), { dx: 0, dy: 0 });
  assert.deepEqual(combatGlyphDrift(), { dx: 0, dy: 0 });
});

/**
 * A place has one ground, not a chequerboard of two. Mixing families — grass
 * with bare earth, moss with dirt, swamp with bog — reads as patchwork rather
 * than variety, which is exactly what the surface looked like when it shipped.
 *
 * A colour in the name is not a second ground: `grass_flowers_blue` and
 * `grass_flowers_red` are the same grass with different flowers in it.
 */
test('the ground of a place is all one tone', () => {
  // `lair3b` is the third tile of the `lair…b` set, not a family of its own.
  const groundOf = (path) => path
    .replace(/[0-9]+([a-z])?\.png$/, '$1')
    .replace(/_(blue|red|yellow|green|cyan|white|gray|grey|brown|magenta|light[a-z]+)_?$/, '');
  for (const theme of BIOME_THEMES) {
    const grounds = new Set(theme.floors.map(groundOf));
    assert.equal(
      grounds.size,
      1,
      `${theme.id} mixes ${[...grounds].join(' and ')}: two grounds make a chequerboard`,
    );
  }
});
