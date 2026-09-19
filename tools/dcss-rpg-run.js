/**
 * How long a run is — and where it stops being written down.
 *
 * A chapter is one place: the biome is chosen per chapter, not per floor, so
 * `FLOORS_PER_CHAPTER` is also how many floors you spend in the same country
 * before it changes. Three floors was too short to feel like a place — you
 * arrived, met the guardian and left. Six is long enough to live there.
 *
 * `STORY_DEPTH` is the end of the **written** road: three chapters, three
 * guardians, the Warden of the Deep and the artefact he keeps. It is not the
 * bottom of the dungeon, because there is no bottom. Past it the ladder of
 * guardians simply begins again and the floors keep counting, so a run ends
 * two ways of its own: the hero dies, or the hero walks out at the gate with
 * the purse still full.
 *
 * Everything downstream — guardians, scaling, the artefact schedule — is
 * derived from these two numbers and nothing else.
 */
export const FLOORS_PER_CHAPTER = 6;
export const STORY_CHAPTERS = 3;
export const STORY_DEPTH = FLOORS_PER_CHAPTER * STORY_CHAPTERS;
export const FINAL_BOSS_ID = 'depth-warden';

/**
 * A far bound, not a design one: a depth no hand ever reaches, there so a
 * broken save cannot claim to stand on floor nine billion. The game itself
 * never stops the hero before it.
 */
export const DEEPEST_DEPTH = 999;

/** The last floor of each chapter of the written road, where its guardian stands. */
export const CHAPTER_END_DEPTHS = Object.freeze(
  Array.from({ length: STORY_CHAPTERS }, (_chapter, index) => (index + 1) * FLOORS_PER_CHAPTER),
);

/**
 * One guardian per chapter, and a different three for each branch: the thing
 * that holds a meadow is not the thing that holds a crypt. Past the written
 * road the same three stand again, in the same order — the ladder repeats, and
 * the trophy for each of them is still paid exactly once.
 */
const guardianLadder = (ids) => Object.freeze(CHAPTER_END_DEPTHS.map((depth, index) => Object.freeze({
  depth,
  monsterId: ids[index],
  final: depth === STORY_DEPTH,
})));

export const BRANCH_CHAPTER_GUARDIANS = Object.freeze({
  deep: guardianLadder(['ashen-guardian', 'sanctum-guardian', FINAL_BOSS_ID]),
  surface: guardianLadder(['grove-warden', 'moor-catoblepas', 'storm-raiju']),
});

export const CHAPTER_GUARDIANS = BRANCH_CHAPTER_GUARDIANS.deep;

/**
 * How often a trader stands on a floor. It used to be «once per chapter», which
 * tied it to how long you stay in one place — and once a chapter became six
 * floors that turned into a shop every six floors, which is a long way to carry
 * loot you cannot sell. The cadence is its own number now.
 */
export const FLOORS_PER_MERCHANT = 3;

export const SANCTUARY_COST = 3;
export const SANCTUARY_HEAL = 36;

/** Which chapter a floor belongs to, counting from one and never stopping. */
export function chapterForDepth(depth) {
  if (!Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Chapter depth must be a positive integer');
  }
  return Math.floor((depth - 1) / FLOORS_PER_CHAPTER) + 1;
}

/** True where the written road runs out and the unwritten one carries on. */
export function isBeyondStory(depth) {
  return Number.isInteger(depth) && depth > STORY_DEPTH;
}

/**
 * Who stands at the end of this chapter, or null mid-chapter. Past the written
 * road the ladder wraps: chapter four is guarded by the first guardian again.
 */
export function chapterGuardianForDepth(depth, branch = 'deep') {
  if (!Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Chapter guardian depth must be a positive integer');
  }
  if (depth % FLOORS_PER_CHAPTER !== 0) return null;
  const guardians = BRANCH_CHAPTER_GUARDIANS[branch] ?? BRANCH_CHAPTER_GUARDIANS.deep;
  const rung = (chapterForDepth(depth) - 1) % guardians.length;
  const guardian = guardians[rung];
  // `final` is a fact about the written road, so it is true once and only at
  // its end: the same warden met again on floor thirty-six ends nothing.
  return Object.freeze({ ...guardian, depth, rung, final: depth === STORY_DEPTH });
}

export function goldRewardForMonster(monster) {
  if (!monster || !Number.isFinite(monster.tier)) return 0;
  return 1 + Math.floor(Math.max(1, monster.tier) / 2) + (monster.boss ? 4 : 0);
}

export function useSanctuary({ depth, hp, maxHp, gold }) {
  const unchanged = { depth, hp, maxHp, gold };
  if (depth <= 1) return { ok: false, reason: 'unavailable', state: unchanged };
  if (hp >= maxHp) return { ok: false, reason: 'full-health', state: unchanged };
  if (gold < SANCTUARY_COST) {
    return { ok: false, reason: 'not-enough-gold', state: unchanged };
  }
  const healed = Math.min(SANCTUARY_HEAL, maxHp - hp);
  return {
    ok: true,
    healed,
    spent: SANCTUARY_COST,
    state: { depth, hp: hp + healed, maxHp, gold: gold - SANCTUARY_COST },
  };
}

/** The artefact at the end of the written road, offered once, to whoever gets there. */
export function canClaimFinalArtifact({ depth, status, bossDefeated }) {
  return depth === STORY_DEPTH && status === 'playing' && bossDefeated === true;
}

export function canLeaveDungeonFloor({ depth, status, guardianDefeated }) {
  // Depth zero is the town gate: nothing guards it, and it is always open.
  if (!Number.isInteger(depth) || depth < 0 || depth > DEEPEST_DEPTH) return false;
  if (status !== 'playing') return false;
  if (depth === 0) return true;
  return !chapterGuardianForDepth(depth) || guardianDefeated === true;
}

/**
 * A run is over three ways now. Dying and winning end it where the hero stands;
 * retiring ends it on purpose, at the gate, with the purse still full — that is
 * the whole point of it, and the stash is what makes it a decision.
 */
export function isTerminalRunStatus(status) {
  return status === 'dead' || status === 'victory' || status === 'retired';
}

/** Walking away is only offered where there is a gate to walk out of. */
export function canRetireRun({ depth, status } = {}) {
  return depth === 0 && status === 'playing';
}
