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

/**
 * «Мне не нравятся линии в эффектах — они всегда неправильно работают».
 *
 * They did. Every ring in the game was `rotate(45°)` plus `strokeRect`: a
 * hairline the canvas anti-aliases into grey mush, landing between pixels, with
 * four diagonal spikes where the corners are. Next to a 32×32 sprite it read as
 * something borrowed from another drawing. Effects in the world are drawn in
 * pixels now — studs on the effect grid — and this keeps it that way.
 */
test('effects in the world are drawn in pixels, not in lines', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  assert.match(runtime, /function drawPixelRing/, 'the pixel ring is where the rule lives');
  // The floor map is a diagram on a panel, not a picture of the world, and a
  // stroke belongs there. Everything before it is the world.
  const mapStart = runtime.indexOf('function drawFloorMapMarker');
  assert.ok(mapStart > 0, 'the floor map moved; this split no longer separates world from panel');
  const world = runtime.slice(0, mapStart);
  for (const line of ['strokeRect', 'context.ellipse', 'context.stroke()', 'context.lineTo']) {
    assert.ok(!world.includes(`  ${line}`), `${line} is back in the world drawing`);
  }
  assert.ok(!world.includes('rotate(Math.PI / 4)'), 'a tilted square is a hairline diamond again');
});

/**
 * Tapping a far cell sent the hero off with nothing to show for it — no mark on
 * the target, no line of travel — so the player watched a figure walk and
 * guessed whether it had understood them.
 */
test('the hero shows where they are going, in studs like everything else', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  const fn = runtime.slice(runtime.indexOf('function drawHeroRoute('));
  const body = fn.slice(0, fn.indexOf('\nfunction drawSparks('));
  assert.ok(body.length > 0, 'nothing draws the route');
  // Only while a route is live, and never over a corpse or a menu.
  assert.match(body, /hero\.path\.length === 0\) return;/);
  assert.match(body, /runStatus !== 'playing'/);
  // The destination is ringed with the shared pixel ring, not a hairline box.
  assert.match(body, /drawPixelRing\(target\.x, target\.y/);
  assert.doesNotMatch(body, /strokeRect|lineTo/, 'the world is drawn in pixels');
  // Under the actors: a route must never cover the fight it leads into.
  const order = runtime.slice(runtime.indexOf('drawProjectiles();'));
  assert.match(order.slice(0, 200), /drawProjectiles\(\);\s*\n\s*drawHeroRoute\(\);\s*\n\s*const actors/);
});
