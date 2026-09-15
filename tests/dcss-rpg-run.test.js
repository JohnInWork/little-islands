import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHAPTER_GUARDIANS,
  FINAL_DEPTH,
  FLOORS_PER_CHAPTER,
  SANCTUARY_COST,
  SANCTUARY_HEAL,
  canClaimFinalArtifact,
  canLeaveDungeonFloor,
  chapterGuardianForDepth,
  isTerminalRunStatus,
  goldRewardForMonster,
  useSanctuary,
} from '../tools/dcss-rpg-run.js';

test('three weak victories fund exactly one meaningful sanctuary heal', () => {
  const income = Array.from({ length: 3 }, () => goldRewardForMonster({ tier: 1 }))
    .reduce((sum, reward) => sum + reward, 0);
  assert.equal(income, SANCTUARY_COST);

  const result = useSanctuary({ depth: 2, hp: 40, maxHp: 100, gold: income });
  assert.equal(result.ok, true);
  assert.equal(result.healed, SANCTUARY_HEAL);
  assert.deepEqual(result.state, { depth: 2, hp: 76, maxHp: 100, gold: 0 });
});

test('sanctuary transactions reject unavailable, full-health and unaffordable use atomically', () => {
  for (const state of [
    { depth: 1, hp: 40, maxHp: 100, gold: 9 },
    { depth: 2, hp: 100, maxHp: 100, gold: 9 },
    { depth: 2, hp: 40, maxHp: 100, gold: SANCTUARY_COST - 1 },
  ]) {
    const result = useSanctuary(state);
    assert.equal(result.ok, false);
    assert.deepEqual(result.state, state);
  }
});

test('boss rewards are exceptional and the artifact closes only a final run', () => {
  assert.ok(goldRewardForMonster({ tier: 3, boss: true }) > goldRewardForMonster({ tier: 3 }));
  assert.equal(
    canClaimFinalArtifact({ depth: FINAL_DEPTH, status: 'playing', bossDefeated: true }),
    true,
  );
  assert.equal(
    canClaimFinalArtifact({ depth: FINAL_DEPTH - 1, status: 'playing', bossDefeated: true }),
    false,
  );
  assert.equal(isTerminalRunStatus('dead'), true);
  assert.equal(isTerminalRunStatus('victory'), true);
  assert.equal(isTerminalRunStatus('playing'), false);
});

test('nine floors form three guarded chapters and exits unlock only after their guardian', () => {
  assert.equal(FINAL_DEPTH, 9);
  assert.equal(FLOORS_PER_CHAPTER, 3);
  assert.deepEqual(CHAPTER_GUARDIANS.map(({ depth }) => depth), [3, 6, 9]);
  for (let depth = 1; depth <= FINAL_DEPTH; depth += 1) {
    const guardian = chapterGuardianForDepth(depth);
    assert.equal(Boolean(guardian), depth % FLOORS_PER_CHAPTER === 0);
    assert.equal(
      canLeaveDungeonFloor({ depth, status: 'playing', guardianDefeated: false }),
      !guardian,
    );
    assert.equal(
      canLeaveDungeonFloor({ depth, status: 'playing', guardianDefeated: true }),
      true,
    );
  }
  assert.equal(
    canLeaveDungeonFloor({ depth: 3, status: 'dead', guardianDefeated: true }),
    false,
  );
});

test('terminal screen CSS uses the same dead and victory statuses as the run state', async () => {
  const css = await readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8');
  assert.match(css, /\[data-screen='dead'\] \.run-end-screen/);
  assert.match(css, /\[data-screen='victory'\] \.run-end-screen/);
  assert.doesNotMatch(css, /\[data-screen='death'\] \.run-end-screen/);
});
