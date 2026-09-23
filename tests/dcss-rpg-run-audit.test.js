import assert from 'node:assert/strict';
import test from 'node:test';

import { generateDungeon } from '../tools/dcss-rpg-core.js';
import {
  AUDIT_BRANCHES,
  FIXED_SOFTLOCKS,
  KNOWN_SOFTLOCKS,
  MAX_AUDIT_DEPTH,
  auditFloor,
  auditTransitions,
  chasmLandingCell,
  floodFrom,
  isKnownSoftlock,
  seedFor,
} from '../scripts/run-audit.mjs';

/*
 * The fast half of `npm run audit:run`: a few seeds through every road and
 * every floor, with the same checks. A crash or a floor that cannot be
 * finished is a failure unless it is on the explicit list of known, unfixed
 * soft-locks in scripts/run-audit.mjs — and every entry of that list is
 * re-checked below, so a fixed bug has to be taken off it.
 */

const SEEDS = [0, 1, 2].map(seedFor);
const blocking = ({ severity }) => severity === 'crash' || severity === 'softlock';
const describe = (entry) => `${entry.severity} ${entry.code} seed ${entry.seed} ${entry.branch}/${entry.depth}: ${entry.detail}`;

test('every road can be walked from the city to the rune without a structural soft-lock', () => {
  const found = [];
  for (const seed of SEEDS) {
    for (const branch of AUDIT_BRANCHES) {
      let above = null;
      let twoAbove = null;
      for (let depth = 0; depth <= MAX_AUDIT_DEPTH; depth += 1) {
        const { level, issues } = auditFloor({ seed, branch, depth, levelAbove: above, levelTwoAbove: twoAbove });
        found.push(...issues.filter(blocking).filter((entry) => !isKnownSoftlock(entry)));
        twoAbove = above;
        above = level;
      }
    }
  }
  assert.deepEqual(found.map(describe), []);
});

test('the real save transitions carry a run down every road, through every branch gate and back up', () => {
  const found = auditTransitions(SEEDS[0]).filter(blocking);
  assert.deepEqual(found.map(describe), []);
});

test('the audit notices a stranded hero: a landing cut off from the stairs is reported', () => {
  // Wall the stairs in on a real floor: the floodfill must say so.
  const level = generateDungeon({ seed: SEEDS[0], depth: 3 });
  const grid = level.grid.map((row) => [...row]);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (grid[level.exit.y + dy]?.[level.exit.x + dx] !== undefined) grid[level.exit.y + dy][level.exit.x + dx] = '#';
  }
  assert.equal(floodFrom(grid, level.spawn).has(`${level.exit.x},${level.exit.y}`), false);
  assert.equal(floodFrom(level.grid, level.spawn).has(`${level.exit.x},${level.exit.y}`), true);
});

test('the twelve chasm strandings the audit found now land where the hero can walk out', () => {
  assert.equal(KNOWN_SOFTLOCKS.length, 0, 'no soft-lock is tolerated any more');
  for (const known of FIXED_SOFTLOCKS) {
    const floor = (depth) => generateDungeon({ seed: known.seed, depth, branch: known.branch });
    const { issues, level } = auditFloor({
      ...known,
      levelAbove: floor(known.depth - 1),
      levelTwoAbove: floor(known.depth - 2),
    });
    assert.equal(issues.some((entry) => entry.code === known.code), false, `${known.branch}/${known.depth} seed ${known.seed} still strands`);
    const landing = chasmLandingCell(level, known.seed, known.depth);
    const reach = floodFrom(level.grid, landing);
    assert.ok(reach.has(`${level.spawn.x},${level.spawn.y}`), 'the stair up is walkable from the landing');
  }
});

test('a chasm is no way round a guardian: the runtime locks the jump and stops a fall at the lair', async () => {
  const { readFile } = await import('node:fs/promises');
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /'chasm-jump'\(\{ target \}\) \{\s*closeContextActions\(\);\s*if \(!target\?\.value \|\| chasmGuarded\(\)\) return false;/);
  assert.match(runtime, /survivable: hero\.hp > cost && dungeon\.depth < DEEPEST_DEPTH && !guarded/);
  assert.match(runtime, /if \(chapterGuardianForDepth\(floor, run\.branch\)\) \{\s*target = floor;/);
});
