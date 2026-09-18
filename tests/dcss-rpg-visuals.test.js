import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { generateDungeon } from '../tools/dcss-rpg-core.js';

import {
  ATMOSPHERE_THEMES,
  BIOME_THEMES,
  BLOOD_FLOOR_PATHS,
  PIXEL_EFFECT_SCALE,
  VISIBILITY_TUNING,
  allBiomeAssetPaths,
  atmosphereThemeFor,
  biomeThemeFor,
  deterministicAtmosphereMote,
  fogAnchorsForDungeon,
} from '../tools/dcss-rpg-visuals.js';
import { dungeonThemeFor } from '../tools/dcss-rpg-room-plans.js';

const biomeAt = (seed, depth) => biomeThemeFor(dungeonThemeFor(seed, depth).id);

test('a chapter keeps one place for three floors, but which place is the run\'s own', () => {
  for (const seed of [1, 7, 42, 4242]) {
    // Three floors of one place, then somewhere else: the chapter is still a
    // chapter, it simply is not the same chapter every run.
    for (const first of [1, 4, 7]) {
      const chapter = biomeAt(seed, first);
      assert.equal(biomeAt(seed, first + 1), chapter, `seed ${seed}, floor ${first + 1}`);
      assert.equal(biomeAt(seed, first + 2), chapter, `seed ${seed}, floor ${first + 2}`);
    }
    // And one place is left out of every run: four themes, three chapters.
    const met = new Set([1, 4, 7].map((depth) => biomeAt(seed, depth).id));
    assert.equal(met.size, 3, `seed ${seed} repeats a place`);
  }
  // The surface is never shuffled: the town is the town.
  assert.equal(biomeThemeFor('gate-town').id, 'gate-town');
});

test('every place the game ships is actually met, the infernal core included', () => {
  const met = new Set();
  const openings = new Set();
  for (let seed = 0; seed < 400; seed += 1) {
    for (const depth of [1, 4, 7]) met.add(biomeAt(seed, depth).id);
    openings.add(biomeAt(seed, 1).id);
  }
  // Four themes ship; before the shuffle the fourth sat at a chapter index nine
  // floors never reach, so nobody had ever seen the infernal core.
  assert.equal(met.size, BIOME_THEMES.length - 1, 'a biome is still unreachable');
  assert.ok(met.has('infernal-core'), 'the infernal core is still shipped and never met');
  // And the run does not always open in the same place.
  assert.equal(openings.size, met.size, 'the first floor is always the same place');
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
