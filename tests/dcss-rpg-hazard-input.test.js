import assert from 'node:assert/strict';
import test from 'node:test';
import { createHazardInputState, hazardMoveIntent } from '../tools/dcss-rpg-hazard-input.js';

const origin = { x: 3, y: 2 };
const target = { x: 4, y: 2 };
const knownCells = new Set(['4,2', '3,3']);
const move = (state, gesture, overrides = {}) => hazardMoveIntent({ state, gesture, origin, target, knownCells, ...overrides });

test('one held gesture cannot confirm a trap warning, a new deliberate press can', () => {
  const initial = createHazardInputState();
  const first = move(initial, 1);
  assert.equal(first.allowed, false);
  assert.equal(first.warn, true);
  assert.deepEqual(initial, createHazardInputState());
  for (let tick = 0; tick < 50; tick += 1) {
    const repeated = move(first.state, 1);
    assert.equal(repeated.allowed, false);
    assert.equal(repeated.warn, false);
  }
  const confirmed = move(first.state, 2);
  assert.equal(confirmed.allowed, true);
  assert.equal(confirmed.permittedCell, '4,2');
  assert.equal(move(confirmed.state, 2).allowed, true);
});

test('safe movement clears consent and another trap needs its own warning', () => {
  const warned = move(createHazardInputState(), 1).state;
  const confirmed = move(warned, 2).state;
  assert.equal(move(confirmed, 2, { target: { x: 3, y: 3 } }).allowed, false);
  const safe = move(confirmed, 2, { target: { x: 2, y: 2 } });
  assert.equal(safe.allowed, true);
  assert.equal(safe.permittedCell, null);
  assert.deepEqual(safe.state, createHazardInputState());
  assert.equal(move(safe.state, 3).allowed, false);
});

test('distant taps never authorize danger and hidden traps do not leak into navigation', () => {
  const first = move(createHazardInputState(), 1, { origin: { x: 1, y: 2 } });
  assert.equal(first.allowed, false);
  assert.equal(move(first.state, 2, { origin: { x: 1, y: 2 } }).allowed, false);
  const hidden = move(createHazardInputState(), 1, { knownCells: new Set() });
  assert.equal(hidden.allowed, true);
  assert.equal(hidden.warn, false);
  assert.equal(hidden.permittedCell, null);
  assert.deepEqual([...knownCells], ['4,2', '3,3']);
});
