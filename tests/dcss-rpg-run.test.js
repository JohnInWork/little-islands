import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BRANCH_CHAPTER_GUARDIANS,
  DEEPEST_DEPTH,
  GUARDIANS_ON_ROAD,
  GUARDIAN_LADDERS,
  STORY_CHAPTERS,
  CHAPTER_END_DEPTHS,
  CHAPTER_GUARDIANS,
  chapterForDepth,
  isBeyondStory,
  STORY_DEPTH,
  FLOORS_PER_CHAPTER,
  SANCTUARY_COOLDOWN_SECONDS,
  SANCTUARY_HEAL,
  canClaimFinalArtifact,
  canLeaveDungeonFloor,
  chapterGuardianForDepth,
  isTerminalRunStatus,
  goldRewardForMonster,
  sanctuaryReady,
  useSanctuary,
} from '../tools/dcss-rpg-run.js';

/*
 * Иван: алтарь бесплатный, но с отдыхом, и отдых в игре не пишут — герой
 * узнаёт лишь, что «волшебные свойства больше не действуют». Отдых меряется
 * активным временем забега и общий для всех камней.
 */
test('the altar heals for free, then rests before it works on the hero again', () => {
  const first = useSanctuary({ depth: 2, hp: 40, maxHp: 100, activeSeconds: 500, drunkAt: null });
  assert.equal(first.ok, true);
  assert.equal(first.healed, SANCTUARY_HEAL);
  assert.deepEqual(first.state, { depth: 2, hp: 40 + SANCTUARY_HEAL, maxHp: 100, drunkAt: 500 });
  assert.equal(Object.hasOwn(first.state, 'gold'), false, 'the altar takes no coins');

  const soon = useSanctuary({ depth: 5, hp: 20, maxHp: 100, activeSeconds: 500 + SANCTUARY_COOLDOWN_SECONDS - 1, drunkAt: 500 });
  assert.equal(soon.ok, false);
  assert.equal(soon.reason, 'recently-drunk');
  assert.deepEqual(soon.state, { depth: 5, hp: 20, maxHp: 100, drunkAt: 500 }, 'a refusal changes nothing');

  const later = useSanctuary({ depth: 5, hp: 20, maxHp: 100, activeSeconds: 500 + SANCTUARY_COOLDOWN_SECONDS, drunkAt: 500 });
  assert.equal(later.ok, true);
  assert.equal(sanctuaryReady({ activeSeconds: 0, drunkAt: undefined }), true, 'yesterday’s save has never drunk');
});

test('a hero at full health is not charged a drink', () => {
  const result = useSanctuary({ depth: 0, hp: 100, maxHp: 100, activeSeconds: 900, drunkAt: null });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'full-health');
  assert.equal(result.state.drunkAt, null, 'the rest does not start');
});

test('the town stone heals like any other', () => {
  const result = useSanctuary({ depth: 0, hp: 40, maxHp: 100, activeSeconds: 10, drunkAt: null });
  assert.equal(result.ok, true);
  assert.equal(result.state.hp, 40 + SANCTUARY_HEAL);
});

test('boss rewards are exceptional and the artifact closes only a final run', () => {
  assert.ok(goldRewardForMonster({ tier: 3, boss: true }) > goldRewardForMonster({ tier: 3 }));
  assert.equal(
    canClaimFinalArtifact({ depth: STORY_DEPTH, status: 'playing', bossDefeated: true }),
    true,
  );
  assert.equal(
    canClaimFinalArtifact({ depth: STORY_DEPTH - 1, status: 'playing', bossDefeated: true }),
    false,
  );
  assert.equal(isTerminalRunStatus('dead'), true);
  assert.equal(isTerminalRunStatus('victory'), true);
  assert.equal(isTerminalRunStatus('playing'), false);
});

test('the run is chapters of six floors, each guarded, and exits unlock only after their guardian', () => {
  // Length is two numbers now: how long you stay in one place, and how many
  // places a run walks through. Everything else is derived from those.
  assert.equal(FLOORS_PER_CHAPTER, 6);
  assert.equal(STORY_DEPTH, FLOORS_PER_CHAPTER * STORY_CHAPTERS);
  assert.deepEqual(CHAPTER_GUARDIANS.map(({ depth }) => depth), [...CHAPTER_END_DEPTHS]);
  for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
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

/**
 * The run used to end at a wall: floor eighteen, warden, credits. It ends two
 * ways of its own now — the hero dies, or the hero walks out at the gate — and
 * the ladder itself has no bottom. These are the promises that makes.
 */
test('the ladder of guardians repeats, and only the road ends', () => {
  // A guardian stands at every chapter end, for as long as anybody keeps going.
  for (let depth = 1; depth <= FLOORS_PER_CHAPTER * 12; depth += 1) {
    const guardian = chapterGuardianForDepth(depth);
    assert.equal(
      guardian !== null,
      depth % FLOORS_PER_CHAPTER === 0,
      `floor ${depth} disagrees about whether something guards it`,
    );
  }

  // The same ladder, in the same order, road after road — and it is LONGER
  // than the road: three rungs stand on it, the fourth stands past it, so the
  // only way to meet that one is to keep going after the warden falls.
  const ladder = GUARDIAN_LADDERS.deep;
  assert.ok(ladder.length > GUARDIANS_ON_ROAD, 'the road shows the whole ladder');
  for (let chapter = 1; chapter <= 16; chapter += 1) {
    const depth = chapter * FLOORS_PER_CHAPTER;
    const guardian = chapterGuardianForDepth(depth);
    assert.equal(guardian.monsterId, ladder[(chapter - 1) % ladder.length], `chapter ${chapter}`);
    assert.equal(guardian.depth, depth);
  }
  // The road's own three are the first three rungs, and the fourth is a name
  // nothing on the road ever says.
  assert.deepEqual(
    BRANCH_CHAPTER_GUARDIANS.deep.map(({ monsterId }) => monsterId),
    ladder.slice(0, GUARDIANS_ON_ROAD),
  );
  const beyond = ladder[GUARDIANS_ON_ROAD];
  for (let depth = FLOORS_PER_CHAPTER; depth <= STORY_DEPTH; depth += FLOORS_PER_CHAPTER) {
    assert.notEqual(chapterGuardianForDepth(depth).monsterId, beyond, `${beyond} стоит на дороге`);
  }
  assert.equal(chapterGuardianForDepth(STORY_DEPTH + FLOORS_PER_CHAPTER).monsterId, beyond);

  // «Final» is a fact about the written road, and it is true exactly once: the
  // same warden met again on floor thirty-six ends nothing.
  const finals = [];
  for (let depth = FLOORS_PER_CHAPTER; depth <= FLOORS_PER_CHAPTER * 12; depth += FLOORS_PER_CHAPTER) {
    if (chapterGuardianForDepth(depth).final) finals.push(depth);
  }
  assert.deepEqual(finals, [STORY_DEPTH]);
  assert.equal(isBeyondStory(STORY_DEPTH), false);
  assert.equal(isBeyondStory(STORY_DEPTH + 1), true);
  assert.equal(chapterForDepth(STORY_DEPTH + 1), STORY_CHAPTERS + 1);
});

test('past the road the stair still opens, and the artefact is still owed once', () => {
  // Nothing about the end of the road closes a floor that is past it.
  for (const depth of [STORY_DEPTH, STORY_DEPTH + 1, STORY_DEPTH * 4, DEEPEST_DEPTH]) {
    const guarded = depth % FLOORS_PER_CHAPTER === 0;
    assert.equal(
      canLeaveDungeonFloor({ depth, status: 'playing', guardianDefeated: false }),
      !guarded,
      `floor ${depth}`,
    );
    assert.equal(canLeaveDungeonFloor({ depth, status: 'playing', guardianDefeated: true }), true);
  }
  assert.equal(canLeaveDungeonFloor({ depth: DEEPEST_DEPTH + 1, status: 'playing' }), false);

  // The artefact belongs to the end of the written road and to nowhere else:
  // going deeper is its own reward, not a second ending.
  for (const depth of [STORY_DEPTH - 1, STORY_DEPTH + 1, STORY_DEPTH * 2]) {
    assert.equal(canClaimFinalArtifact({ depth, status: 'playing', bossDefeated: true }), false);
  }
  assert.equal(canClaimFinalArtifact({ depth: STORY_DEPTH, status: 'playing', bossDefeated: true }), true);
});
