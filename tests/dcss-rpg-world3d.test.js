import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MAX_SHADOWED_WORLD_LIGHTS,
  WALL_FACE_TEXTURE_HEIGHT,
  WALL_FACE_SAMPLE_HEIGHT,
  WALL_FACE_SAMPLE_WIDTH,
  WALL_FACE_TEXTURE_WIDTH,
  WORLD_CAMERA_ELEVATION,
  WORLD_AMBIENT_INTENSITY,
  WORLD_DECORATION_DEPTH_BIAS,
  WORLD_KEY_LIGHT_INTENSITY,
  WORLD_RENDER_PIXEL_SIZE,
  WORLD_WALL_HEIGHT,
} from '../tools/dcss-rpg-world3d.js';

const runtimeUrl = new URL('../tools/dcss-rpg-world3d.js', import.meta.url);

test('the dungeon uses real WebGL boxes with a shallow near-top-down camera', async () => {
  const source = await readFile(runtimeUrl, 'utf8');
  assert.ok(WORLD_CAMERA_ELEVATION > 60 && WORLD_CAMERA_ELEVATION < 75);
  assert.ok(WORLD_WALL_HEIGHT > 0.4 && WORLD_WALL_HEIGHT < 0.8);
  assert.equal(WORLD_RENDER_PIXEL_SIZE, 2);
  assert.ok(WORLD_DECORATION_DEPTH_BIAS > 0.12 && WORLD_DECORATION_DEPTH_BIAS < 0.25);
  assert.equal(MAX_SHADOWED_WORLD_LIGHTS, 2);
  assert.ok(WORLD_KEY_LIGHT_INTENSITY > WORLD_AMBIENT_INTENSITY);
  assert.match(source, /new THREE\.BoxGeometry/);
  assert.match(source, /shadowMap\.enabled = true/);
  assert.match(source, /new THREE\.DirectionalLight/);
  assert.match(source, /THREE\.NoToneMapping/);
  assert.match(source, /new THREE\.AmbientLight/);
  assert.match(source, /new THREE\.SpriteMaterial/);
  assert.match(source, /depthTest:\s*true/);
  assert.match(source, /depthWrite:\s*true/);
  assert.match(source, /actorTint\.set\(theme\.world3d\.actorTint\)/);
  assert.match(source, /material\.color\.copy\(actor\.hit \? actorHitTint : actorTint\)/);
  assert.match(source, /depthBias \* Math\.sin\(elevationRadians\)/);
  assert.match(source, /depthBias \* Math\.cos\(elevationRadians\)/);
  assert.match(source, /scene\.add\(worldRoot, actorRoot, volumetricLightRoot\)/);
  assert.match(source, /raycaster\.ray\.intersectPlane/);
  assert.match(source, /renderer\.setPixelRatio\(1\)/);
  assert.match(source, /Math\.ceil\(viewportWidth \/ WORLD_RENDER_PIXEL_SIZE\)/);
  assert.match(source, /Math\.round\(worldX \/ WORLD_RENDER_PIXEL_SIZE\)/);
});

test('vertical wall faces use a dedicated pixel texture without squashed masonry', async () => {
  const source = await readFile(runtimeUrl, 'utf8');
  const cameraRadians = (WORLD_CAMERA_ELEVATION * Math.PI) / 180;
  const physicalFaceRatio = WORLD_WALL_HEIGHT / Math.sin(cameraRadians);
  const textureFaceRatio = WALL_FACE_TEXTURE_HEIGHT / WALL_FACE_TEXTURE_WIDTH;

  assert.ok(Math.abs(physicalFaceRatio - textureFaceRatio) < 0.02);
  assert.equal(WALL_FACE_TEXTURE_WIDTH, 32);
  assert.equal(WALL_FACE_TEXTURE_HEIGHT, 21);
  assert.equal(WALL_FACE_SAMPLE_WIDTH, 16);
  assert.equal(WALL_FACE_SAMPLE_HEIGHT, 10);
  assert.match(source, /new THREE\.CanvasTexture\(sideCanvas\)/);
  assert.match(source, /sideContext\.imageSmoothingEnabled = false/);
  assert.match(source, /sampleContext\.filter = 'brightness\(0\.82\) saturate\(0\.7\) contrast\(0\.72\)'/);
  assert.match(source, /const wallMaterialSetFor = \(path\) =>/);
  assert.match(source, /materialFor: wallMaterialSetFor/);
  assert.match(source, /const wallFaceMaterialFor = \(path\) =>/);
  assert.match(source, /map: wallFaceTextureFor\(path, imageForPath\)/);
});
