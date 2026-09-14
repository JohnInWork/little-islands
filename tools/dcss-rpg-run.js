export const FINAL_DEPTH = 3;
export const FINAL_BOSS_ID = 'depth-warden';
export const SANCTUARY_COST = 3;
export const SANCTUARY_HEAL = 36;

export function shardRewardForMonster(monster) {
  if (!monster || !Number.isFinite(monster.tier)) return 0;
  return 1 + Math.floor(Math.max(1, monster.tier) / 2) + (monster.boss ? 4 : 0);
}

export function useSanctuary({ depth, hp, maxHp, shards }) {
  const unchanged = { depth, hp, maxHp, shards };
  if (depth <= 1) return { ok: false, reason: 'unavailable', state: unchanged };
  if (hp >= maxHp) return { ok: false, reason: 'full-health', state: unchanged };
  if (shards < SANCTUARY_COST) {
    return { ok: false, reason: 'not-enough-shards', state: unchanged };
  }
  const healed = Math.min(SANCTUARY_HEAL, maxHp - hp);
  return {
    ok: true,
    healed,
    spent: SANCTUARY_COST,
    state: { depth, hp: hp + healed, maxHp, shards: shards - SANCTUARY_COST },
  };
}

export function canClaimFinalArtifact({ depth, status, bossDefeated }) {
  return depth === FINAL_DEPTH && status === 'playing' && bossDefeated === true;
}

export function isTerminalRunStatus(status) {
  return status === 'dead' || status === 'victory';
}
