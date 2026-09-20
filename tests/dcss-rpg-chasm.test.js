import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHASM_CELL,
  CHASM_FALL_PERCENT,
  CHASM_FLOOR_INTERVAL,
  CHASM_MIN_DEPTH,
  carveRiftFloor,
  chasmAllowsCell,
  chasmIslands,
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

/**
 * An island with nothing on it teaches nothing. The floor's own loot is
 * rearranged rather than added to: the chasm changes where the richness is,
 * not how much of it there is.
 */
test('the far side is worth the crossing, and the floor is no richer for it', () => {
  let islandsSeen = 0;
  let islandsWithLoot = 0;
  for (const depth of [7, 14, 21]) {
    for (let seed = 1; seed <= 12; seed += 1) {
      const dungeon = generateDungeon({ seed, depth });
      const islands = chasmIslands(dungeon.grid, dungeon.spawn);
      if (islands.length === 0) continue;
      islandsSeen += 1;
      const cells = new Set(islands.flat().map(({ x, y }) => `${x},${y}`));
      const prize = dungeon.loot.filter(({ x, y }) => cells.has(`${x},${y}`));
      if (prize.length > 0) islandsWithLoot += 1;
      // The promised starting piece is never marooned.
      assert.ok(
        !cells.has(`${dungeon.loot[0].x},${dungeon.loot[0].y}`),
        `seed ${seed} depth ${depth}: the starter gear is on an island`,
      );
    }
  }
  assert.ok(islandsSeen >= 8, `only ${islandsSeen} floors had an island at all`);
  assert.equal(islandsWithLoot, islandsSeen, 'an island had nothing worth flying to');
});

test('flight cannot be switched off over a hole, and losing it is a fall', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  // Refused, not punished: the mistake the player could make is impossible.
  assert.match(
    runtime,
    /usedSpell\.id === 'flight'[\s\S]{0,240}?CHASM_CELL[\s\S]{0,120}?return false;/,
    'the hero can dispel their own flight in mid-air',
  );
  // But flight can end for reasons the hero did not choose, and then they fall
  // — down the shaft, onto the floor below, which is what a chasm is for.
  const footing = runtime.slice(runtime.indexOf('function updateHeroFooting() {'));
  assert.match(footing.slice(0, footing.indexOf('\n}')), /currentHeroMagic\(\)\.flight/);
  const falling = runtime.slice(runtime.indexOf('function fallIntoChasm(cell) {'));
  const body = falling.slice(0, falling.indexOf('\nfunction '));
  assert.match(body, /chasmFallFloors\(world, cell, dungeon\.seed\)/, 'every hole is the same depth');
  assert.match(body, /CHASM_FALL_PERCENT \* floors/, 'two floors cost the same as one');
  assert.match(body, /travelRunToDepth\(captureRun\(\), target/);
  assert.match(body, /if \(hero\.dead \|\| runStatus !== 'playing'\) return;/, 'a dead hero still lands');
  assert.match(body, /damageHero\(damage/);
  // And the check runs every frame the hero moves, not on some event.
  assert.match(runtime, /updateHeroEffects\(delta\);\s*\n\s*updateHeroFooting\(\);/);
  assert.ok(CHASM_FALL_PERCENT > 0 && CHASM_FALL_PERCENT <= 25, 'a fall should cost, not kill');
});

/**
 * «Пусть он падает на этаж или на два ниже в зависимости от дыры.» The depth
 * belongs to the hole, not to the cell: every square of one chasm answers the
 * same, or stepping off one side of a hole would drop you further than
 * stepping off the other.
 */
test('a hole has its own depth, and every cell of it agrees', async () => {
  const { chasmFallFloors, chasmShaft } = await import('../tools/dcss-rpg-chasm.js');
  const grid = [
    ['#', '#', '#', '#', '#', '#', '#', '#'],
    ['#', '.', CHASM_CELL, CHASM_CELL, CHASM_CELL, '.', '.', '#'],
    ['#', '.', CHASM_CELL, CHASM_CELL, CHASM_CELL, '.', '.', '#'],
    ['#', '.', '.', '.', '.', '.', CHASM_CELL, '#'],
    ['#', '#', '#', '#', '#', '#', '#', '#'],
  ];
  const big = chasmShaft(grid, { x: 2, y: 1 });
  assert.equal(big.size, 6, 'the shaft did not find its whole void');
  assert.deepEqual(big.anchor, { x: 2, y: 1 }, 'the anchor moved, so the depth would too');
  const depths = new Set();
  for (const cell of [{ x: 2, y: 1 }, { x: 4, y: 1 }, { x: 3, y: 2 }, { x: 4, y: 2 }]) {
    depths.add(chasmFallFloors(grid, cell, 7));
  }
  assert.equal(depths.size, 1, 'one hole gave two different drops');
  assert.ok([1, 2].includes([...depths][0]));

  // A single missing tile is a stumble, never a two-floor drop.
  assert.equal(chasmFallFloors(grid, { x: 6, y: 3 }, 7), 1);
  assert.equal(chasmFallFloors(grid, { x: 1, y: 1 }, 7), 0, 'floor is not a shaft');

  // Across many holes both depths actually occur.
  const seen = new Set();
  for (let seed = 0; seed < 60; seed += 1) seen.add(chasmFallFloors(grid, { x: 2, y: 1 }, seed));
  assert.deepEqual([...seen].sort(), [1, 2], 'every hole in the game is the same depth');
});

/**
 * A hole with a floor under it is a way down, so jumping in is offered as a
 * choice rather than left as an accident: «пусть он падает на этаж или на два
 * ниже в зависимости от дыры».
 */
test('the hole offers the jump, and refuses the one that would kill', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const registry = await readFile(new URL('../tools/dcss-rpg-context-actions.js', import.meta.url), 'utf8');
  // The card exists and says how far down and what it costs.
  // Между именем и командой стоит `confirm: true`: в яму не прыгают одним
  // касанием, даже когда действие у провала всего одно.
  assert.match(registry, /id: 'chasm',\s*\n\s*confirm: true,\s*\n\s*command: 'chasm-jump',/);
  assert.match(registry, /chasmDescription\(target\.floors, target\.cost\)/);
  // Standing next to one is what puts it in the column, and flying past it
  // does not — somebody in the air is not looking for a way down.
  const finder = runtime.slice(runtime.indexOf('function nearbyChasm() {'));
  const body = finder.slice(0, finder.indexOf('\n}'));
  assert.match(body, /currentHeroMagic\(\)\.flight/);
  assert.match(body, /revealed\.has/, 'an unseen hole is offered as a route');
  // A jump that kills is refused: a shortcut is not a way to die by mistake.
  const model = runtime.slice(runtime.indexOf("if (entry.kind === 'chasm') {"));
  assert.match(model.slice(0, 900), /survivable: hero\.hp > cost/);
  assert.match(model.slice(0, 900), /dungeon\.depth < DEEPEST_DEPTH/);
  // And the action falls through the same door an accident does.
  assert.match(runtime, /'chasm-jump'\(\{ target \}\)[\s\S]{0,200}?fallIntoChasm\(target\.value\)/);
});
