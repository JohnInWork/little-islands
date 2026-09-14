import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';

import {
  ATMOSPHERE_THEMES,
  BIOME_THEMES,
  BLOOD_FLOOR_PATHS,
  PIXEL_EFFECT_SCALE,
  VISIBILITY_TUNING,
  allBiomeAssetPaths,
  atmosphereThemeForDepth,
  biomeThemeForDepth,
  deterministicAtmosphereMote,
  fogAnchorsForDungeon,
} from '../tools/dcss-rpg-visuals.js';

test('the complete three-floor run uses coherent early biome families', () => {
  const ash = biomeThemeForDepth(1);
  const buried = biomeThemeForDepth(3);
  assert.equal(biomeThemeForDepth(2), ash);
  assert.equal(ash.id, 'ashen-vault');
  assert.equal(buried.id, 'buried-sanctum');
  assert.equal(ash.accentModulo, 0);
  assert.equal(buried.accentModulo, 0);
  assert.ok(ash.floors.every((path) => path.startsWith('dngn/floor/cobble_blood')));
  assert.ok(ash.walls.every((path) => path.startsWith('dngn/wall/brick_gray')));
  assert.ok(buried.floors.every((path) => path.startsWith('dngn/floor/sand')));
  assert.ok(buried.walls.every((path) => path.startsWith('dngn/wall/sandstone_wall')));
  assert.ok(ash.floors.every((path) => !BLOOD_FLOOR_PATHS.includes(path)));
});

test('biome themes are deterministic, bounded and reference local assets', async () => {
  assert.throws(() => biomeThemeForDepth(0), /positive integer/);
  assert.equal(biomeThemeForDepth(9), BIOME_THEMES[0]);
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
    const biome = biomeThemeForDepth(depth);
    assert.equal(atmosphereThemeForDepth(depth), ATMOSPHERE_THEMES[biome.palette]);
    assert.match(atmosphereThemeForDepth(depth).fog, /^#[0-9a-f]{6}$/i);
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
  const rooms = [
    { x: 2, y: 3, w: 7, h: 6 },
    { x: 12, y: 8, w: 5, h: 5 },
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
      x < (rooms[0].x + rooms[0].w) * 64 &&
      y > rooms[0].y * 64 &&
      y < (rooms[0].y + rooms[0].h) * 64,
    ),
  );
  assert.notDeepEqual(
    first,
    fogAnchorsForDungeon({ ...options, seed: options.seed + 1 }),
  );
});
