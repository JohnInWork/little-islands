/**
 * A spear answers the approach. When a creature crosses into the weapon's
 * reach it eats a free thrust and is briefly held off, so a corridor becomes a
 * real tactic instead of a queue. The thrust has its own cooldown per creature,
 * which keeps a monster pinned at the edge from being a damage treadmill.
 */

export const SPEAR_FAMILY = 'spear';

const EMPTY_PROFILE = Object.freeze({
  rank: 0,
  reach: 0,
  interceptPercent: 0,
  holdSeconds: 0,
  cooldownSeconds: 0,
});
const NO_INTERCEPTION = Object.freeze({
  triggered: false,
  damagePercent: 0,
  holdSeconds: 0,
  cooldownSeconds: 0,
});

function boundedInteger(value, min, max) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

/** The reach is the weapon's own range; the skill only decides what happens there. */
export function spearProfile(weapon, capabilities = {}) {
  if (weapon?.weaponFamily !== SPEAR_FAMILY) return EMPTY_PROFILE;
  const reach = Number.isFinite(weapon?.combat?.range) ? weapon.combat.range : 0;
  const rank = boundedInteger(capabilities.spearRank, 0, 3);
  const interceptPercent = boundedInteger(capabilities.spearInterceptPercent, 0, 200);
  const holdMs = boundedInteger(capabilities.spearHoldMs, 0, 5000);
  const cooldownMs = boundedInteger(capabilities.spearInterceptCooldownMs, 0, 20_000);
  if (rank === 0 || reach <= 0 || interceptPercent === 0 || cooldownMs === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    reach,
    interceptPercent,
    holdSeconds: holdMs / 1000,
    cooldownSeconds: cooldownMs / 1000,
  });
}

/**
 * Fires on the step where a creature crosses from outside the reach to inside
 * it. Distances are in tiles; `cooldownRemaining` belongs to that one creature.
 */
export function spearInterception({
  profile = EMPTY_PROFILE,
  previousDistance = Number.POSITIVE_INFINITY,
  distance = Number.POSITIVE_INFINITY,
  cooldownRemaining = 0,
} = {}) {
  if (!profile || profile.rank === 0) return NO_INTERCEPTION;
  if (!Number.isFinite(distance) || distance > profile.reach) return NO_INTERCEPTION;
  if (Number.isFinite(previousDistance) && previousDistance <= profile.reach) return NO_INTERCEPTION;
  if (Number.isFinite(cooldownRemaining) && cooldownRemaining > 0) return NO_INTERCEPTION;
  return Object.freeze({
    triggered: true,
    damagePercent: profile.interceptPercent,
    holdSeconds: profile.holdSeconds,
    cooldownSeconds: profile.cooldownSeconds,
  });
}

/** Damage of the free thrust, rounded to at least one point. */
export function interceptionDamage(baseDamage, damagePercent) {
  if (!Number.isFinite(baseDamage) || baseDamage <= 0) return 0;
  const percent = Number.isFinite(damagePercent) && damagePercent > 0 ? damagePercent : 0;
  if (percent === 0) return 0;
  return Math.max(1, Math.round((baseDamage * percent) / 100));
}
