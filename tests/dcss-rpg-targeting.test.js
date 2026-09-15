import assert from 'node:assert/strict';
import test from 'node:test';

import {
  blinkTargetCells,
  resolveBlink,
} from '../tools/dcss-rpg-targeting.js';

const grid = [
  ['#', '#', '#', '#', '#', '#'],
  ['#', '.', '.', '#', '.', '#'],
  ['#', '.', '.', '#', '.', '#'],
  ['#', '.', '.', '.', '.', '#'],
  ['#', '#', '#', '#', '#', '#'],
];

test('blink targeting crosses walls but lands only on revealed free floor', () => {
  const revealedCells = ['1,1', '2,1', '1,2', '2,2', '4,1', '4,2', '4,3'];
  const targets = blinkTargetCells({
    grid,
    origin: { x: 1, y: 1 },
    revealedCells,
    blockedCells: ['2,1', '4,2'],
    range: 4,
  });
  assert.deepEqual(targets.map(({ x, y }) => `${x},${y}`), ['1,2', '2,2', '4,1', '4,3']);
  assert.throws(() => blinkTargetCells({ grid, origin: { x: 1, y: 1 }, range: 99 }), /range/);
});

test('blink consumes exactly once only after a valid explicit target', () => {
  const candidates = [{ x: 2, y: 2 }, { x: 4, y: 1 }];
  const invalid = resolveBlink({
    hero: { x: 1, y: 1, hp: 20 },
    target: { x: 3, y: 3 },
    itemCount: 1,
    candidates,
  });
  assert.deepEqual(invalid, { ok: false, reason: 'invalid-target', consumed: 0 });

  const result = resolveBlink({
    hero: { x: 1, y: 1, hp: 20 },
    target: { x: 4, y: 1 },
    itemCount: 2,
    candidates,
  });
  assert.equal(result.ok, true);
  assert.equal(result.consumed, 1);
  assert.equal(result.remainingItems, 1);
  assert.deepEqual(result.hero, { x: 4, y: 1, hp: 20 });
  assert.deepEqual(result.event, { type: 'hero-blinked', x: 4, y: 1 });
});
