import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BRANCH_DIFFICULTY,
  BRANCH_GATES,
  BRANCH_GATE_PATHS,
  branchDifficulty,
  branchGateCopy,
  branchGateFor,
  gatesInto,
} from '../tools/dcss-rpg-branch-gates.js';
import { RUN_BRANCHES } from '../tools/dcss-rpg-content.js';
import { DUNGEON_THEME_CATALOG } from '../tools/dcss-rpg-room-plans.js';
import {
  createRun,
  enterBranchThroughGate,
  generateDungeon,
  travelRunToDepth,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';

/**
 * «Из самого нижнего этажа этого спуска, когда там ветка заканчивается, там
 * идёт проход в ад <...> чтобы сверху был проход в какие-нибудь катакомбы.»
 */
test('a road can end in another road, and one has a side door partway along', () => {
  const hell = BRANCH_GATES.find(({ to }) => to === 'hell');
  const crypt = BRANCH_GATES.find(({ to }) => to === 'crypt');
  assert.ok(hell && crypt, 'hell and the catacombs have no mouths');
  assert.equal(hell.from, 'deep', 'the gate of hell is not at the end of the descent');
  assert.equal(crypt.from, 'surface', 'the catacombs are not entered from above');

  for (const gate of BRANCH_GATES) {
    assert.ok(RUN_BRANCHES.includes(gate.from) && RUN_BRANCHES.includes(gate.to));
    assert.notEqual(gate.from, gate.to, 'a gate onto the road it stands on');
    // A gate always leads somewhere harder: otherwise it is a shortcut, not a
    // decision about where to go.
    assert.ok(
      branchDifficulty(gate.to) > branchDifficulty(gate.from),
      `${gate.id} leads somewhere easier`,
    );
    // And both ends are real places with places of their own to be.
    for (const branch of [gate.from, gate.to]) {
      assert.ok(
        DUNGEON_THEME_CATALOG.some((theme) => theme.branch === branch),
        `${branch} has nowhere to be`,
      );
    }
  }

  assert.equal(branchGateFor('deep', hell.depth)?.to, 'hell');
  assert.equal(branchGateFor('deep', hell.depth - 1), null, 'the gate is on every floor');
  assert.equal(branchGateFor('hell', 1), null, 'hell leads on to something else again');
  assert.deepEqual(gatesInto('hell').map(({ id }) => id), [hell.id]);

  for (const language of ['ru', 'en']) {
    const copy = branchGateCopy(hell, language);
    assert.ok(copy.name.length > 0 && copy.description.length > 0 && copy.enter.length > 0);
  }
  assert.notEqual(branchGateCopy(hell, 'ru').name, branchGateCopy(hell, 'en').name);
  assert.equal(branchGateCopy(null), null);
});

test('the gate stands on the floor, with that road’s own mouth for a picture', () => {
  const loaded = requiredAssetPaths();
  const preview = new URL('../public/assets/dcss-preview/', import.meta.url);
  for (const path of BRANCH_GATE_PATHS) {
    assert.ok(existsSync(new URL(path, preview)), `${path} does not ship`);
    assert.ok(loaded.includes(path), `${path} is never loaded`);
  }
  // Two roads, two different mouths: the picture is how the player knows.
  assert.equal(new Set(BRANCH_GATE_PATHS).size, BRANCH_GATES.length);

  for (const gate of BRANCH_GATES) {
    let placed = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const level = generateDungeon({ seed, depth: gate.depth, branch: gate.from });
      if (!level.branchGate) continue;
      placed += 1;
      assert.equal(level.branchGate.to, gate.to);
      assert.equal(level.grid[level.branchGate.y][level.branchGate.x], '.', 'the gate is in a wall');
      // Never under the hero's feet on arrival, and never on the stairs.
      assert.notDeepEqual(
        { x: level.branchGate.x, y: level.branchGate.y },
        { x: level.spawn.x, y: level.spawn.y },
      );
      assert.notDeepEqual(
        { x: level.branchGate.x, y: level.branchGate.y },
        { x: level.exit.x, y: level.exit.y },
      );
    }
    assert.ok(placed >= 18, `${gate.id} only appeared on ${placed} of 20 floors`);
  }
  // And no other floor carries one.
  for (const depth of [1, 5, 12]) {
    assert.equal(generateDungeon({ seed: 3, depth, branch: 'deep' }).branchGate, null);
  }
});

test('walking through a gate starts the new road at its own first floor', () => {
  let run = createRun(21);
  for (let depth = 2; depth <= 6; depth += 1) run = travelRunToDepth(run, depth);
  assert.equal(run.branch, 'deep');
  const moved = enterBranchThroughGate(run, 'hell');
  assert.equal(moved.branch, 'hell');
  assert.equal(moved.depth, 1, 'hell inherited the descent’s numbering');
  // The descent's floors are gone: a road is a place you are on, not a stack,
  // and keeping them would mean climbing out of hell onto floor eighteen.
  assert.deepEqual(moved.floors, {}, `the descent came along: ${Object.keys(moved.floors).join(',')}`);
  assert.equal(validateRun(moved), true);
  // The hero themselves is untouched: a road is a place, not a new run.
  assert.equal(moved.hero.level, run.hero.level);
  assert.equal(moved.gold, run.gold);
  // Asking for the road you are already on changes nothing.
  assert.equal(enterBranchThroughGate(moved, 'hell'), moved);
  assert.throws(() => enterBranchThroughGate(moved, 'nowhere'));
});

/**
 * «Чтобы адская ветка была сложной, реально <...> чтобы там другие ветки были
 * попроще, другие посложнее, и логично их нужно расставить.»
 */
test('every road is harder than the one it opens off, and hell hardest of all', () => {
  const order = ['surface', 'deep', 'vaults', 'crypt', 'hell'];
  for (const branch of order) {
    assert.ok(BRANCH_DIFFICULTY[branch] > 0, `${branch} has no difficulty`);
  }
  assert.ok(BRANCH_DIFFICULTY.surface < BRANCH_DIFFICULTY.deep, 'the open country is not the gentle one');
  assert.ok(BRANCH_DIFFICULTY.deep < BRANCH_DIFFICULTY.crypt);
  assert.equal(
    Math.max(...Object.values(BRANCH_DIFFICULTY)),
    BRANCH_DIFFICULTY.hell,
    'something is harder than hell',
  );
  assert.equal(branchDifficulty('nowhere'), 1, 'an unknown road should be ordinary');

  // And it is felt on the floor, not just written in a table: the same depth
  // on a harder road carries more.
  const crowd = (branch) => {
    let total = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      total += generateDungeon({ seed, depth: 5, branch }).monsters.length;
    }
    return total / 10;
  };
  const gentle = crowd('surface');
  const ordinary = crowd('deep');
  const worst = crowd('hell');
  assert.ok(ordinary > gentle, `the descent (${ordinary}) is no worse than the meadow (${gentle})`);
  assert.ok(worst > ordinary, `hell (${worst}) is no worse than the descent (${ordinary})`);
});

test('the runtime draws the gate and offers exactly one way through it', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const registry = await readFile(new URL('../tools/dcss-rpg-context-actions.js', import.meta.url), 'utf8');
  assert.match(runtime, /id: 'marker:branch-gate'/, 'the gate is invisible');
  assert.match(runtime, /path: dungeon\.branchGate\.path/, 'every road’s mouth looks the same');
  const finder = runtime.slice(runtime.indexOf('function nearbyBranchGate() {'));
  assert.match(finder.slice(0, finder.indexOf('\n}')), /cellStepDistance\(cell, dungeon\.branchGate\) <= 1/);
  assert.match(registry, /id: 'branch-gate',\s*\n\s*command: 'branch-gate',/);
  assert.match(runtime, /'branch-gate'\(\{ target \}\)[\s\S]{0,220}?enterBranch\(target\.value\.to\)/);
  const move = runtime.slice(runtime.indexOf('function enterBranch(branch) {'));
  const body = move.slice(0, move.indexOf('\nfunction '));
  assert.match(body, /enterBranchThroughGate\(captureRun\(\), branch\)/);
  assert.match(body, /replaceFloor\(run\.depth\)/);
  assert.match(body, /persistRun\(\);/);
});
