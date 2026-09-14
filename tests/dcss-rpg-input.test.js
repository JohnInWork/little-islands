import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampedStickOffset,
  directionVector,
  dominantCardinalDirection,
} from '../tools/dcss-rpg-input.js';

test('hybrid stick resolves every gesture to one cardinal dungeon direction', () => {
  assert.equal(dominantCardinalDirection(9, 0, 10), null);
  assert.equal(dominantCardinalDirection(24, 5), 'right');
  assert.equal(dominantCardinalDirection(-24, 5), 'left');
  assert.equal(dominantCardinalDirection(4, -25), 'up');
  assert.equal(dominantCardinalDirection(4, 25), 'down');
  assert.deepEqual(directionVector('left'), [-1, 0]);
  assert.equal(directionVector('diagonal'), null);
});

test('hybrid stick feedback is clamped and aligned to the four-pixel art grid', () => {
  assert.deepEqual(clampedStickOffset(7, -10), { x: 8, y: -8 });
  const offset = clampedStickOffset(80, 0, 28, 4);
  assert.deepEqual(offset, { x: 28, y: 0 });
  assert.ok(Math.hypot(offset.x, offset.y) <= 28);
  assert.equal(offset.x % 4, 0);
  assert.equal(offset.y % 4, 0);
});
