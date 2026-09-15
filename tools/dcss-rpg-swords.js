const EMPTY_PROFILE = Object.freeze({
  rank: 0,
  hitInterval: 0,
  bonusPercent: 0,
});

const cleanState = (state) => ({
  targetId: typeof state?.targetId === 'string' ? state.targetId : null,
  weaponId: typeof state?.weaponId === 'string' ? state.weaponId : null,
  hits: Number.isInteger(state?.hits) && state.hits >= 0 ? state.hits : 0,
});

export function createSwordRhythmState() {
  return Object.freeze({ targetId: null, weaponId: null, hits: 0 });
}

export function swordRhythmProfile(weapon, capabilities = {}) {
  if (weapon?.weaponFamily !== 'sword') return EMPTY_PROFILE;
  const rank = Number.isInteger(capabilities.swordRhythmRank)
    ? Math.max(0, Math.min(3, capabilities.swordRhythmRank))
    : 0;
  const hitInterval = Number.isInteger(capabilities.swordRhythmHitInterval)
    ? Math.max(0, Math.min(8, capabilities.swordRhythmHitInterval))
    : 0;
  const bonusPercent = Number.isInteger(capabilities.swordRhythmBonusPercent)
    ? Math.max(0, Math.min(100, capabilities.swordRhythmBonusPercent))
    : 0;
  if (rank === 0 || hitInterval < 2 || bonusPercent === 0) return EMPTY_PROFILE;
  return Object.freeze({ rank, hitInterval, bonusPercent });
}

/**
 * A dual-wield cycle advances the rhythm once. The main-hand sword owns it;
 * an off-hand sword participates only when the main hand belongs to another family.
 */
export function swordRhythmSource(primary, secondary = null) {
  if (primary?.weaponFamily === 'sword') {
    return Object.freeze({ slot: 'primary', weapon: primary });
  }
  if (secondary?.weaponFamily === 'sword') {
    return Object.freeze({ slot: 'secondary', weapon: secondary });
  }
  return null;
}

/** Pure, deterministic hit resolution. Call it only when the selected sword
 * actually reaches the target; missed/cancelled windups must not advance rhythm. */
export function resolveSwordRhythmStrike({
  state,
  targetId,
  weapon,
  capabilities,
  baseDamage,
} = {}) {
  const damage = Number.isFinite(baseDamage) && baseDamage > 0
    ? Math.max(1, Math.round(baseDamage))
    : 0;
  const profile = swordRhythmProfile(weapon, capabilities);
  if (!targetId || damage === 0 || profile.rank === 0) {
    return Object.freeze({
      state: createSwordRhythmState(),
      damage,
      empowered: false,
      chain: 0,
      ...profile,
    });
  }

  const previous = cleanState(state);
  const weaponId = typeof weapon.uid === 'string' && weapon.uid
    ? weapon.uid
    : weapon.id;
  const continues = previous.targetId === targetId && previous.weaponId === weaponId;
  const chain = Math.min(continues ? previous.hits : 0, profile.hitInterval - 1) + 1;
  const empowered = chain >= profile.hitInterval;
  const nextState = Object.freeze({
    targetId,
    weaponId,
    hits: empowered ? 0 : chain,
  });
  return Object.freeze({
    state: nextState,
    damage: empowered
      ? Math.max(damage + 1, Math.round(damage * (100 + profile.bonusPercent) / 100))
      : damage,
    empowered,
    chain,
    ...profile,
  });
}
