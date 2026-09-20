import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHASM_CELL,
  CHASM_FLOOR_INTERVAL,
  CHASM_MIN_DEPTH,
  carveRiftFloor,
  chasmAllowsCell,
  chasmCopy,
  isChasmCell,
  isRiftDepth,
  walkableFrom,
} from '../tools/dcss-rpg-chasm.js';
import { createRng, generateDungeon } from '../tools/dcss-rpg-core.js';

/**
 * «Полёту нечего перелетать. Есть заклинание полёта, но нет ям и пропастей,
 * ради которых оно нужно. Нужна локация с другой генерацией: огромные ямы,
 * провалы, куски пола, между которыми надо перелетать.»
 */
test('a chasm is floor to somebody flying and a wall to everybody else', () => {
  const grid = [
    ['#', '#', '#', '#', '#'],
    ['#', '.', CHASM_CELL, '.', '#'],
    ['#', '#', '#', '#', '#'],
  ];
  assert.equal(isChasmCell(grid, 2, 1), true);
  assert.equal(isChasmCell(grid, 1, 1), false);
  assert.equal(chasmAllowsCell(grid, 2, 1), false);
  assert.equal(chasmAllowsCell(grid, 2, 1, { flying: true }), true);
  assert.equal(chasmAllowsCell(grid, 1, 1), true);

  // On foot the two sides are two places; in the air they are one.
  const onFoot = walkableFrom(grid, { x: 1, y: 1 });
  assert.equal(onFoot.has('1,1'), true);
  assert.equal(onFoot.has('3,1'), false, 'the hero walked across the hole');
  const flying = walkableFrom(grid, { x: 1, y: 1 }, { flying: true });
  assert.equal(flying.has('3,1'), true, 'flight did not cross it');

  for (const language of ['ru', 'en']) {
    const copy = chasmCopy(language);
    assert.ok(copy.name.length > 0 && copy.refusal.length > 0);
  }
  assert.notEqual(chasmCopy('ru').name, chasmCopy('en').name);
});

test('every seventh floor deep enough is a broken one, and no other is', () => {
  assert.equal(isRiftDepth(CHASM_FLOOR_INTERVAL), true);
  assert.equal(isRiftDepth(CHASM_FLOOR_INTERVAL * 2), true);
  assert.equal(isRiftDepth(CHASM_FLOOR_INTERVAL + 1), false);
  assert.equal(isRiftDepth(0), false, 'the city is not a rift');
  assert.equal(isRiftDepth(1), false);
  assert.ok(CHASM_FLOOR_INTERVAL >= CHASM_MIN_DEPTH, 'the first rift comes before the spell can');
});

/**
 * The rule flight must never break: a hero who never learned it can still
 * finish the floor. A chasm opens places and shortens roads; it is never the
 * difference between playing and not playing.
 */
test('a rift floor is torn across but its stairs are always reachable on foot', () => {
  let floorsWithHoles = 0;
  let floorsWithIslands = 0;
  for (const depth of [7, 14, 21]) {
    for (let seed = 1; seed <= 12; seed += 1) {
      const dungeon = generateDungeon({ seed, depth });
      const holes = dungeon.grid.flat().filter((cell) => cell === CHASM_CELL).length;
      if (holes === 0) continue;
      floorsWithHoles += 1;
      assert.ok(holes >= 8, `seed ${seed} depth ${depth}: ${holes} cells is a puddle, not a rift`);
      const onFoot = walkableFrom(dungeon.grid, dungeon.spawn);
      assert.ok(
        onFoot.has(`${dungeon.exit.x},${dungeon.exit.y}`),
        `seed ${seed} depth ${depth}: the stairs are behind a hole`,
      );
      // Nothing living or standing was dropped into the void. The holes are
      // cut after the floor is furnished precisely so this can be required.
      for (const thing of [
        ...dungeon.loot, ...dungeon.events, ...dungeon.finds,
        ...dungeon.monsters, ...(dungeon.passives ?? []),
        dungeon.spawn, dungeon.exit,
      ]) {
        assert.notEqual(
          dungeon.grid[thing.y]?.[thing.x],
          CHASM_CELL,
          `seed ${seed} depth ${depth}: ${thing.x},${thing.y} fell in`,
        );
      }
      const stranded = dungeon.grid.reduce((total, row, y) => total + row.reduce(
        (count, cell, x) => count + (cell === '.' && !onFoot.has(`${x},${y}`) ? 1 : 0),
        0,
      ), 0);
      if (stranded > 0) floorsWithIslands += 1;
    }
  }
  assert.ok(floorsWithHoles >= 30, `only ${floorsWithHoles} rift floors in 36`);
  // The islands are the reason to cast it: floor with no way to it on foot.
  assert.ok(floorsWithIslands >= 10, `only ${floorsWithIslands} floors had anywhere worth flying to`);
});

test('a fault that would strand the stairs gives a crossing back, cell by cell', () => {
  // One room, one way out, and the stairs on the far side of the fault.
  const width = 15;
  const height = 9;
  const grid = Array.from({ length: height }, () => Array(width).fill('#'));
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) grid[y][x] = '.';
  }
  const rng = createRng(4);
  const from = { x: 2, y: 2 };
  const exit = { x: width - 3, y: height - 3 };
  const opened = carveRiftFloor(grid, { rng, from, mustReach: [exit], faults: 3 });
  assert.ok(opened.length > 0, 'nothing was torn at all');
  const onFoot = walkableFrom(grid, from);
  assert.ok(onFoot.has(`${exit.x},${exit.y}`), 'the only room was cut in two');
  // And the hole is real: flying is shorter than walking round it.
  const flying = walkableFrom(grid, from, { flying: true });
  assert.ok(flying.size > onFoot.size, 'flight reaches nothing the feet do not');
});

test('the runtime lets flight over a chasm and nothing else', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const walkable = runtime.slice(runtime.indexOf('function isHeroWalkable(x, y) {'));
  const body = walkable.slice(0, walkable.indexOf('\n}'));
  assert.match(body, /world\[y\]\[x\] === CHASM_CELL/);
  assert.match(body, /currentHeroMagic\(\)\.flight === true/);
  // And the world draws no tile there, so the gap is a gap.
  const world = await readFile(new URL('../tools/dcss-rpg-world3d.js', import.meta.url), 'utf8');
  assert.match(world, /if \(grid\[y\]\[x\] !== CHASM_CELL\) \{\s*\n\s*floorRecords\.push/);
});
