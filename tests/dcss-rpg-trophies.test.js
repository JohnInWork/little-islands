import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GUARDIAN_TROPHIES,
  TROPHY_BOUNTY,
  claimTrophy,
  createTrophyState,
  trophyFor,
  trophyModel,
  trophyTaken,
} from '../tools/dcss-rpg-trophies.js';
import { BRANCH_CHAPTER_GUARDIANS, GUARDIANS_ON_ROAD, GUARDIAN_LADDERS, STORY_DEPTH, chapterGuardianForDepth } from '../tools/dcss-rpg-run.js';
import { createMetaState, parseMeta, validateMetaState } from '../tools/dcss-rpg-meta.js';

/**
 * Six guardians stand in this dungeon, three on each road, and until now the
 * game never said so. The grid is the only place it does.
 */
test('every guardian on every road has exactly one trophy', () => {
  // The ladder is longer than the road: three rungs stand on it and the fourth
  // stands past it, so the grid has a row nobody fills without going deeper
  // than the game ever asks.
  const expected = Object.values(GUARDIAN_LADDERS).flat().length;
  assert.equal(GUARDIAN_TROPHIES.length, expected);
  assert.equal(new Set(GUARDIAN_TROPHIES.map(({ id }) => id)).size, expected, 'two roads share a guardian');
  for (const [branch, ladder] of Object.entries(GUARDIAN_LADDERS)) {
    for (const [rung, monsterId] of ladder.entries()) {
      const trophy = trophyFor(monsterId);
      assert.ok(trophy, `${monsterId} has no trophy`);
      assert.equal(trophy.branch, branch);
      assert.equal(trophy.rung, rung);
      assert.equal(trophy.depth, chapterGuardianForDepth(trophy.depth, branch).depth);
      assert.equal(trophy.bounty, TROPHY_BOUNTY[rung]);
      assert.equal(trophy.beyondRoad, rung >= GUARDIANS_ON_ROAD);
      assert.ok(trophy.bounty > 0);
    }
  }
  // Going past the warden is the best-paid thing in the grid, and the only row
  // a hero who stops at eighteen can never tick.
  const beyond = GUARDIAN_TROPHIES.filter(({ beyondRoad }) => beyondRoad);
  assert.equal(beyond.length, Object.keys(GUARDIAN_LADDERS).length, 'one past the road on each road');
  for (const trophy of beyond) {
    assert.ok(trophy.bounty > Math.max(...GUARDIAN_TROPHIES.filter((t) => !t.beyondRoad).map((t) => t.bounty)));
    assert.ok(trophy.depth > STORY_DEPTH);
  }
});

/** Once means once, or the grid stops pointing anywhere and becomes a grind. */
test('a first kill pays, and every kill after it pays nothing', () => {
  const first = claimTrophy([], 'grove-warden');
  assert.ok(first.ok);
  assert.equal(first.bounty, TROPHY_BOUNTY[0]);
  assert.deepEqual(first.taken, ['grove-warden']);

  const again = claimTrophy(first.taken, 'grove-warden');
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'already-taken');
  assert.equal(again.bounty, 0);
  assert.deepEqual(again.taken, first.taken, 'a repeat must not change the record');

  // The deepest guardian is worth more than the first one, or the grid gives no
  // reason to go past floor three.
  assert.ok(TROPHY_BOUNTY[2] > TROPHY_BOUNTY[1] && TROPHY_BOUNTY[1] > TROPHY_BOUNTY[0]);
  assert.equal(claimTrophy([], 'a-passing-rat').reason, 'not-a-guardian');
});

test('the record shrugs off nonsense instead of trusting it', () => {
  assert.deepEqual(createTrophyState(null), []);
  assert.deepEqual(createTrophyState('grove-warden'), []);
  assert.deepEqual(createTrophyState(['grove-warden', 'grove-warden', 'nothing']), ['grove-warden']);
  assert.equal(trophyTaken(['depth-warden'], 'depth-warden'), true);
  assert.equal(trophyTaken(['depth-warden'], 'storm-raiju'), false);
});

/**
 * Adding a field must not cost anybody their history: `parseMeta` throws away a
 * store whose version it does not recognise, so the marks ride along optional
 * exactly as the bones do.
 */
test('an older store keeps its records and simply has no marks yet', () => {
  const older = {
    version: 1,
    totals: { runs: 4, kills: 31, gold: 260, deepest: 5, victories: 0, seconds: 1800 },
    best: [],
    milestones: [],
  };
  const restored = parseMeta(JSON.stringify(older));
  assert.equal(restored.totals.runs, 4, 'the history was thrown away');
  assert.deepEqual(restored.trophies, []);
  assert.ok(validateMetaState(createMetaState({ ...older, trophies: ['moor-catoblepas'] })));
  assert.deepEqual(createMetaState({ ...older, trophies: ['moor-catoblepas'] }).trophies, ['moor-catoblepas']);
});

test('the grid names what you have beaten and hides what you have not', () => {
  const model = trophyModel(['grove-warden'], 'ru');
  assert.equal(model.total, GUARDIAN_TROPHIES.length);
  assert.equal(model.taken, 1);
  const grove = model.rows.find((row) => row.id === 'grove-warden');
  assert.equal(grove.taken, true);
  assert.ok(grove.name && grove.name !== grove.id, 'a guardian with no readable name');
  assert.equal(grove.road, model.copy.roads.surface);
  // Both roads are represented, so the grid can show that the other one differs.
  assert.ok(model.rows.some((row) => row.branch === 'deep'));
  assert.ok(model.rows.some((row) => row.branch === 'surface'));
  assert.notDeepEqual(trophyModel([], 'en').copy, trophyModel([], 'ru').copy);
});
