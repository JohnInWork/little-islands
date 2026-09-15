export const FLOORS_PER_CHAPTER = 3;
export const FINAL_DEPTH = 9;
export const FINAL_BOSS_ID = 'depth-warden';
export const CHAPTER_GUARDIANS = Object.freeze([
  Object.freeze({ depth: 3, monsterId: 'ashen-guardian', final: false }),
  Object.freeze({ depth: 6, monsterId: 'sanctum-guardian', final: false }),
  Object.freeze({ depth: FINAL_DEPTH, monsterId: FINAL_BOSS_ID, final: true }),
]);
export const SANCTUARY_COST = 3;
export const SANCTUARY_HEAL = 36;

export function chapterGuardianForDepth(depth) {
  if (!Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Chapter guardian depth must be a positive integer');
  }
  return CHAPTER_GUARDIANS.find((guardian) => guardian.depth === depth) ?? null;
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
  if (!Number.isInteger(depth) || depth < 1 || depth > FINAL_DEPTH) return false;
  if (status !== 'playing') return false;
  return !chapterGuardianForDepth(depth) || guardianDefeated === true;
}

export function isTerminalRunStatus(status) {
  return status === 'dead' || status === 'victory';
}
