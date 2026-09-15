import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CROWD_ROOM_MIN_EXITS,
  chooseCrowdPressureStep,
} from '../tools/dcss-rpg-monster-pressure.js';

const TILE = 64;
const actorAt = (x, y, instanceId = 'crowd-monster') => ({
  instanceId,
  x: (x + 0.5) * TILE,
  y: (y + 0.5) * TILE,
});

test('a blocked room pursuer deterministically shuffles to a free side angle', () => {
  const target = chooseCrowdPressureStep({
    monster: actorAt(5, 3),
    hero: actorAt(3, 3, 'hero'),
    grid: [
      [...'#########'],
      [...'#...#...#'],
      [...'#...#...#'],
      [...'#.......#'],
      [...'#...#...#'],
      [...'#...#...#'],
      [...'#########'],
    ],
    blockedCells: new Set(['4,3', '6,3']),
    tileSize: TILE,
    step: 4,
  });
  assert.ok(target);
  assert.equal(target.gridX, 5);
  assert.ok([2, 4].includes(target.gridY));
  assert.equal(CROWD_ROOM_MIN_EXITS, 3);
});

test('pressure movement never makes a queue overtake inside a one-cell corridor', () => {
  const target = chooseCrowdPressureStep({
    monster: actorAt(4, 1),
    hero: actorAt(1, 1, 'hero'),
    grid: [
      [...'#######'],
      [...'#.....#'],
      [...'#######'],
    ],
    blockedCells: new Set(['3,1']),
    tileSize: TILE,
  });
  assert.equal(target, null);
});

test('a previous pressure cell is avoided when another honest room cell exists', () => {
  const options = {
    monster: actorAt(5, 3),
    hero: actorAt(3, 3, 'hero'),
    grid: [
      [...'#########'],
      [...'#...#...#'],
      [...'#...#...#'],
      [...'#.......#'],
      [...'#...#...#'],
      [...'#...#...#'],
      [...'#########'],
    ],
    blockedCells: new Set(['4,3', '6,3']),
    tileSize: TILE,
    step: 1,
  };
  const first = chooseCrowdPressureStep(options);
  const opposite = first.gridY === 2 ? '5,4' : '5,2';
  const second = chooseCrowdPressureStep({ ...options, previousCell: `${first.gridX},${first.gridY}` });
  assert.equal(`${second.gridX},${second.gridY}`, opposite);
});
