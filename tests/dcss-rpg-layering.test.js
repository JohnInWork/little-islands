import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  WORLD_BILLBOARD_DEPTH_BIAS,
  WORLD_SCENERY_DEPTH_STEP,
} from '../tools/dcss-rpg-world3d.js';

const runtimeUrl = new URL('../tools/dcss.js', import.meta.url);
const worldUrl = new URL('../tools/dcss-rpg-world3d.js', import.meta.url);

/**
 * The hero arrived every single run standing inside the ascent arch with the
 * arch painted over them: the arch was drawn on the overlay canvas, which sits
 * above the whole world, and once it moved into the world it still tied with
 * the hero on their shared cell. Both halves of that fix are pinned here.
 */
test('nothing on the floor is drawn over what is standing on it', async () => {
  assert.ok(WORLD_SCENERY_DEPTH_STEP > 0, 'scenery must yield to actors, not tie with them');
  assert.ok(
    WORLD_SCENERY_DEPTH_STEP < WORLD_BILLBOARD_DEPTH_BIAS,
    'a step big enough to reorder whole tiles would put scenery inside walls',
  );
  const world = await readFile(worldUrl, 'utf8');
  assert.match(
    world,
    /depthBias: \(decoration\.depthBias \?\? 0\) - WORLD_SCENERY_DEPTH_STEP/,
    'the decoration pass is where the rule lives',
  );

  const runtime = await readFile(runtimeUrl, 'utf8');
  // The three fixed markers are world objects with a footprint, so they ride
  // the billboard pass and sort against actors like everything else does.
  assert.match(runtime, /function worldMarkers3D\(\)[\s\S]*id: 'marker:sanctuary'/);
  assert.match(runtime, /function worldMarkers3D\(\)[\s\S]*id: 'marker:exit'/);
  assert.match(runtime, /function worldMarkers3D\(\)[\s\S]*id: 'marker:ascent'/);
  assert.match(runtime, /decorations: \[[\s\S]{0,600}?\.\.\.worldMarkers3D\(\),/);
  for (const visual of ['ascentVisual', 'sanctuaryVisual', 'exitVisual']) {
    assert.doesNotMatch(
      runtime,
      new RegExp(`drawSprite\\(\\s*\\n?\\s*${visual}\\.path`),
      `${visual} belongs to the world, not to the overlay above it`,
    );
  }
});

/** A rectangle drawn over the hero reads as a rendering fault, because it is one. */
test('invisibility is shown by the air, not by a box', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  const effects = runtime.slice(
    runtime.indexOf('function drawHeroEffects()'),
    runtime.indexOf('function drawProjectiles()'),
  );
  assert.ok(effects.includes('magic.invisibility'));
  assert.doesNotMatch(effects, /strokeRect/, 'no frame is drawn around the hero');
  assert.match(effects, /INVISIBILITY_MOTES/);
  // The hero themself is what fades; the motes only say why.
  assert.match(runtime, /concealed \? 0\.38 : 1/);
});
