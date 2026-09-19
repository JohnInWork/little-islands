import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { cellStepDistance, neighbouringCells } from '../tools/dcss-rpg-geometry.js';
import { canMeleeAttack } from '../tools/dcss-rpg-rules.js';
import { MELEE_CONTACT_RANGE, canActorsMeleeContact } from '../tools/dcss-rpg-actor-collision.js';

const TILE = 64;
const open = (width, height) => Array.from({ length: height }, () => Array(width).fill('.'));

test('next to means the ring of eight, not the cross of four', () => {
  const from = { x: 4, y: 4 };
  for (const cell of neighbouringCells(from)) {
    assert.equal(cellStepDistance(from, cell), 1, `${cell.x},${cell.y}`);
  }
  assert.equal(neighbouringCells(from).length, 8);
  assert.equal(new Set(neighbouringCells(from).map(({ x, y }) => `${x},${y}`)).size, 8);
  assert.ok(!neighbouringCells(from).some(({ x, y }) => x === from.x && y === from.y));

  assert.equal(cellStepDistance(from, from), 0);
  assert.equal(cellStepDistance(from, { x: 6, y: 5 }), 2, 'two along, one across, is two steps');
  assert.throws(() => cellStepDistance(from, null), /finite cells/);
  assert.throws(() => neighbouringCells({ x: 1 }), /finite cell/);
});

/**
 * The old rule was Manhattan distance 1, which is four cells out of eight. A
 * creature standing corner to corner with the hero could not be hit and could
 * not hit back: you walked up to it and the game did nothing. So could a chest,
 * and so could a door.
 */
test('a blow reaches the corners, needs somewhere to pass, and does not go through walls', () => {
  const grid = open(6, 6);
  const middle = { x: 3.5, y: 3.5 };
  for (const cell of neighbouringCells({ x: 3, y: 3 })) {
    const neighbour = { x: cell.x + 0.5, y: cell.y + 0.5 };
    assert.equal(canMeleeAttack(grid, middle, neighbour), true, `${cell.x},${cell.y}`);
    assert.equal(canMeleeAttack(grid, neighbour, middle), true, 'and back');
  }
  assert.equal(canMeleeAttack(grid, middle, { x: 5.5, y: 3.5 }), false, 'two cells is not a reach');

  // Shallow water is somewhere a fight happens; it always was somewhere the
  // hero could stand, and a monster wading through it was unhittable.
  const water = open(4, 4);
  water[1][2] = '~';
  assert.equal(canMeleeAttack(water, { x: 1.5, y: 1.5 }, { x: 2.5, y: 1.5 }), true);

  // A diagonal slips past a corner. It must not pass through one.
  const corner = open(4, 4);
  corner[1][2] = '#';
  corner[2][1] = '#';
  assert.equal(canMeleeAttack(corner, { x: 1.5, y: 1.5 }, { x: 2.5, y: 2.5 }), false, 'both ways blocked');
  corner[1][2] = '.';
  assert.equal(canMeleeAttack(corner, { x: 1.5, y: 1.5 }, { x: 2.5, y: 2.5 }), true, 'one open side is enough');
});

test('the coarse contact circle is wide enough for the diagonal it now has to allow', () => {
  // √2 is 1.415 cells apart; anything under 1.5 has to let a corner neighbour in.
  assert.ok(MELEE_CONTACT_RANGE > Math.SQRT2, 'the corner was out of reach at 1.15');
  assert.ok(MELEE_CONTACT_RANGE < 2, 'and a cell further away still is not');
  const grid = open(8, 8);
  const target = { x: 5.5 * TILE, y: 3.5 * TILE };
  assert.equal(canActorsMeleeContact(grid, { x: 4.5 * TILE, y: 2.5 * TILE }, target), true);
  assert.equal(canActorsMeleeContact(grid, { x: 3.5 * TILE, y: 1.5 * TILE }, target), false);
});

/**
 * One rule, asked in one place. Reach used to be written out by hand at every
 * call site, which is how half of them ended up orthogonal-only.
 */
test('nothing measures reach by hand any more', async () => {
  const directory = new URL('../tools/', import.meta.url);
  const byHand = [];
  for (const file of ['dcss.js', 'dcss-rpg-chests.js', 'dcss-rpg-finds.js']) {
    const source = await readFile(new URL(file, directory), 'utf8');
    for (const [line] of source.matchAll(/^.*Math\.abs\([^)]*\) \+ Math\.abs\([^)]*\).*$/gm)) {
      // Layout and spacing may still use Manhattan distance; reach may not.
      if (/hero|door|find|target|heroCell/.test(line)) byHand.push(`tools/${file}: ${line.trim()}`);
    }
  }
  assert.deepEqual(byHand, [], `\n${byHand.join('\n')}\n`);
});
