export const FLOORS_PER_CHAPTER = 3;
export const FINAL_DEPTH = 9;
export const FINAL_BOSS_ID = 'depth-warden';
/**
 * One guardian per chapter, and a different three for each branch: the thing
 * that holds a meadow is not the thing that holds a crypt. The depths and the
 * shape are identical, so every promise about chapter ends keeps holding.
 */
export const BRANCH_CHAPTER_GUARDIANS = Object.freeze({
  deep: Object.freeze([
    Object.freeze({ depth: 3, monsterId: 'ashen-guardian', final: false }),
    Object.freeze({ depth: 6, monsterId: 'sanctum-guardian', final: false }),
    Object.freeze({ depth: FINAL_DEPTH, monsterId: FINAL_BOSS_ID, final: true }),
  ]),
  surface: Object.freeze([
    Object.freeze({ depth: 3, monsterId: 'grove-warden', final: false }),
    Object.freeze({ depth: 6, monsterId: 'moor-catoblepas', final: false }),
    Object.freeze({ depth: FINAL_DEPTH, monsterId: 'storm-raiju', final: true }),
  ]),
});

export const CHAPTER_GUARDIANS = BRANCH_CHAPTER_GUARDIANS.deep;
export const SANCTUARY_COST = 3;
export const SANCTUARY_HEAL = 36;

export function chapterGuardianForDepth(depth, branch = 'deep') {
  if (!Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Chapter guardian depth must be a positive integer');
  }
  const guardians = BRANCH_CHAPTER_GUARDIANS[branch] ?? BRANCH_CHAPTER_GUARDIANS.deep;
  return guardians.find((guardian) => guardian.depth === depth) ?? null;
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

export function canClaimFinalArtifact({ depth, status, bossDefeated }) {
  return depth === FINAL_DEPTH && status === 'playing' && bossDefeated === true;
}

export function canLeaveDungeonFloor({ depth, status, guardianDefeated }) {
  // Depth zero is the town gate: nothing guards it, and it is always open.
  if (!Number.isInteger(depth) || depth < 0 || depth > FINAL_DEPTH) return false;
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
