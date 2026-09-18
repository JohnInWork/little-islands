/**
 * Daggers reward position instead of attrition. A strike against a creature
 * that has not noticed the hero, and any strike taken from behind, hit far
 * harder than the blade itself deserves. Like every weapon technique the
 * profile comes from the skill capabilities and the equipped item, never from
 * game state, so the rule is testable on its own.
 */

export const DAGGER_FAMILY = 'dagger';

const EMPTY_PROFILE = Object.freeze({ rank: 0, ambushPercent: 0, backstabPercent: 0 });
const NO_BONUS = Object.freeze({ percent: 0, kind: null });

function boundedInteger(value, min, max) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

export function daggerProfile(weapon, capabilities = {}) {
  if (weapon?.weaponFamily !== DAGGER_FAMILY) return EMPTY_PROFILE;
  const rank = boundedInteger(capabilities.daggerRank, 0, 3);
  const ambushPercent = boundedInteger(capabilities.daggerAmbushPercent, 0, 200);
  const backstabPercent = boundedInteger(capabilities.daggerBackstabPercent, 0, 200);
  if (rank === 0 || ambushPercent + backstabPercent === 0) return EMPTY_PROFILE;
  return Object.freeze({ rank, ambushPercent, backstabPercent });
}

/**
 * True when the attacker stands on the side the target is turned away from.
 * `facing` is -1 (looking left) or 1 (looking right), as actors carry it.
 */
export function isBehindTarget({ attackerX, targetX, facing } = {}) {
  if (!Number.isFinite(attackerX) || !Number.isFinite(targetX)) return false;
  if (facing !== -1 && facing !== 1) return false;
  const delta = attackerX - targetX;
  if (Math.abs(delta) < 1e-6) return false;
  return Math.sign(delta) !== facing;
}

/**
 * The bonus for one dagger strike. An unaware target is always an ambush, even
 * face to face; an aware one has to be struck from behind. The two never stack.
 */
export function resolveDaggerStrike({
  profile = EMPTY_PROFILE,
  awareOfAttacker = true,
  attackerX = 0,
  targetX = 0,
  targetFacing = 1,
} = {}) {
  if (!profile || profile.rank === 0) return NO_BONUS;
  if (awareOfAttacker !== true) {
    return Object.freeze({ percent: profile.ambushPercent, kind: 'ambush' });
  }
  if (isBehindTarget({ attackerX, targetX, facing: targetFacing })) {
    return Object.freeze({ percent: profile.backstabPercent, kind: 'backstab' });
  }
  return NO_BONUS;
}

/** Applies a bonus percentage to a rolled damage value, never below the original. */
export function applyStrikeBonus(damage, percent) {
  if (!Number.isFinite(damage) || damage <= 0) return 0;
  const bonus = Number.isFinite(percent) && percent > 0 ? percent : 0;
  return Math.max(Math.round(damage), Math.round(damage * (1 + bonus / 100)));
}
