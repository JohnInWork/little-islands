import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MAX_RADIAL_SHADOW_LIGHTS,
  MAX_SPOT_SHADOW_LIGHTS,
  MAX_VISIBLE_WORLD_BEAMS,
  MAX_WORLD_LIGHTS,
  VOLUMETRIC_LIGHT_HEIGHT,
  selectWorldLights,
  worldShadowPlan,
  worldLightPulse,
} from '../tools/dcss-rpg-volumetric-lighting.js';

const source = (id, x, y, overrides = {}) => ({
  id,
  x,
  y,
  gridX: Math.floor(x / 64),
  gridY: Math.floor(y / 64),
  radius: 3,
  color: '#d8bd6c',
  phase: 0.5,
  beam: true,
  ...overrides,
});

test('the 3D light budget keeps only the nearest valid unique sources', () => {
  const sources = Array.from({ length: 9 }, (_, index) =>
    source(`light-${index}`, index * 64, 0),
  );
  sources.push(source('light-0', 1, 1));
  sources.push(source('invalid', 1, 1, { color: 'orange' }));
  const selected = selectWorldLights(sources, { x: 0, y: 0 });

  assert.equal(Object.isFrozen(selected), true);
  assert.equal(selected.length, MAX_WORLD_LIGHTS);
  assert.deepEqual(
    selected.map(({ id }) => id),
    ['light-0', 'light-1', 'light-2', 'light-3', 'light-4'],
  );
  assert.equal(new Set(selected.map(({ id }) => id)).size, selected.length);
});

test('volumetric pulse is restrained and freezes for reduced motion', () => {
  assert.ok(VOLUMETRIC_LIGHT_HEIGHT >= 4 && VOLUMETRIC_LIGHT_HEIGHT <= 7);
  const first = worldLightPulse(2.4, 0.8, false);
  const second = worldLightPulse(2.8, 0.8, false);
  assert.notDeepEqual(first, second);
  assert.ok(first.intensity >= 0.88 && first.intensity <= 1);
  assert.ok(first.opacity >= 0.8 && first.opacity <= 1);
  assert.ok(Math.abs(first.rotation) <= 0.04);
  assert.deepEqual(worldLightPulse(200, 9, true), {
    intensity: 1,
    opacity: 1,
    rotation: 0,
  });
});

test('real local shadows have a deterministic mobile budget', () => {
  const selected = selectWorldLights(
    [
      source('shaft-near', 0, 0, { beam: true }),
      source('torch', 64, 0, { beam: false }),
      source('shaft-far', 128, 0, { beam: true }),
      source('ember', 192, 0, { beam: false }),
    ],
    { x: 0, y: 0 },
  );
  const plan = worldShadowPlan(selected);
  assert.deepEqual(plan.radial, ['shaft-near']);
  assert.deepEqual(plan.spot, ['shaft-near', 'shaft-far']);
  assert.deepEqual(plan.beams, ['shaft-near']);
  assert.equal(plan.radial.length, MAX_RADIAL_SHADOW_LIGHTS);
  assert.equal(plan.spot.length, MAX_SPOT_SHADOW_LIGHTS);
  assert.equal(plan.beams.length, MAX_VISIBLE_WORLD_BEAMS);
  assert.equal(Object.isFrozen(plan), true);
});

test('world lighting is real Three.js geometry and replaces the painted 2D beam', async () => {
  const world = await readFile(new URL('../tools/dcss-rpg-world3d.js', import.meta.url), 'utf8');
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');

  assert.match(world, /new THREE\.PointLight/);
  assert.match(world, /new THREE\.SpotLight/);
  assert.match(world, /new THREE\.CylinderGeometry/);
  assert.match(world, /THREE\.AdditiveBlending/);
  assert.match(world, /point\.castShadow = radialShadowKeys\.has\(key\)/);
  assert.match(world, /spot\.castShadow = spotShadowKeys\.has\(key\)/);
  assert.match(world, /entry\.beam\.visible = visibleBeamKeys\.has\(key\)/);
  assert.match(world, /renderer\.shadowMap\.type = THREE\.PCFShadowMap/);
  assert.match(world, /point\.shadow\.mapSize\.set\(256, 256\)/);
  assert.match(world, /spot\.shadow\.mapSize\.set\(512, 512\)/);
  assert.match(world, /new THREE\.MeshDistanceMaterial/);
  assert.match(world, /caster\.customDepthMaterial = new THREE\.MeshDepthMaterial/);
  assert.match(world, /entry\.caster\.quaternion\.copy\(camera\.quaternion\)/);
  assert.match(world, /depthTest:\s*true/);
  assert.match(world, /depthWrite:\s*false/);
  assert.match(world, /syncLights/);
  assert.match(runtime, /dungeonWorld3D\.syncLights/);
  assert.doesNotMatch(runtime, /function drawLightBeam/);
});
