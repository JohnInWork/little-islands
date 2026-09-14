import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  VOID_STAR_LAYER_CONFIGS,
  VOID_STAR_SCALE,
  createVoidStarLayers,
  voidParallaxOffset,
} from '../tools/dcss-rpg-void-sky.js';

const htmlUrl = new URL('../tools/dcss.html', import.meta.url);
const cssUrl = new URL('../tools/dcss.css', import.meta.url);
const runtimeUrl = new URL('../tools/dcss.js', import.meta.url);

test('void stars are deterministic, pixel-sized and distributed inside each tile', () => {
  const first = createVoidStarLayers(731923);
  const second = createVoidStarLayers(731923);

  assert.equal(VOID_STAR_SCALE, 2);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, createVoidStarLayers(731924));
  assert.equal(Object.isFrozen(first), true);
  assert.equal(first.length, VOID_STAR_LAYER_CONFIGS.length);

  for (const layer of first) {
    assert.equal(layer.stars.length, layer.count);
    assert.ok(layer.tileSize * VOID_STAR_SCALE >= 400);
    assert.ok(
      layer.stars.every(
        ({ x, y, alpha, phase }) =>
          x > 0 &&
          x < layer.tileSize &&
          y > 0 &&
          y < layer.tileSize &&
          alpha >= 0.54 &&
          alpha <= 1 &&
          Number.isInteger(phase) &&
          phase >= 0 &&
          phase < 4,
      ),
    );
  }
});

test('near and far stars move at distinct restrained parallax speeds', () => {
  const [far, near] = createVoidStarLayers(731923);
  const farOffset = voidParallaxOffset(1, 1, far);
  const nearOffset = voidParallaxOffset(1, 1, near);

  assert.equal(farOffset.x, far.tileSize - far.parallaxX);
  assert.equal(farOffset.y, far.tileSize - far.parallaxY);
  assert.equal(nearOffset.x, near.tileSize - near.parallaxX);
  assert.equal(nearOffset.y, near.tileSize - near.parallaxY);
  assert.ok(near.parallaxX > far.parallaxX);
  assert.ok(near.parallaxY > far.parallaxY);
});

test('the runtime draws void stars on a dedicated pixel canvas and freezes motion when requested', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /<canvas id="void-sky" aria-hidden="true"><\/canvas>/);
  assert.match(css, /#void-sky\s*\{[\s\S]*mix-blend-mode:\s*screen/);
  assert.match(runtime, /function isVoidAtScreen\(screenX, screenY\)/);
  assert.match(runtime, /return !revealed\.has\(`\$\{cellX\},\$\{cellY\}`\)/);
  assert.match(runtime, /const cameraCellX = reducedMotion \? 0 : camera\.x \/ TILE/);
  assert.match(runtime, /const cameraCellY = reducedMotion \? 0 : camera\.y \/ TILE/);
  assert.match(runtime, /drawVoidSky\(\);\s*\n\}/);
});
