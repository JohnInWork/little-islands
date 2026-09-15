import { createActorEffects } from './dcss-rpg-effects.js';

export const CRYOMANCY_RULES = Object.freeze([
  Object.freeze({
    rank: 0,
    chillDurationBonus: 0,
    freezeDuration: 0,
    shatterDamagePercent: 0,
    shatterRadius: 0,
    shatterTargets: 0,
  }),
  Object.freeze({
    rank: 1,
    chillDurationBonus: 2,
    freezeDuration: 0,
    shatterDamagePercent: 0,
    shatterRadius: 0,
    shatterTargets: 0,
  }),
  Object.freeze({
    rank: 2,
    chillDurationBonus: 2,
    freezeDuration: 1.25,
    shatterDamagePercent: 0,
    shatterRadius: 0,
    shatterTargets: 0,
  }),
  Object.freeze({
    rank: 3,
    chillDurationBonus: 2,
    freezeDuration: 1.5,
    shatterDamagePercent: 45,
    shatterRadius: 1.75,
    shatterTargets: 3,
  }),
]);

function boundedRank(rank) {
  return Math.max(0, Math.min(3, Number.isInteger(rank) ? rank : 0));
}

/** A hit is resolved from the target state before damage is applied. This makes
 * lethal hits on a frozen enemy shatter predictably and keeps the rule testable. */
export function cryomancyHitProfile({ rank = 0, effects = {}, baseChillDuration = 0 } = {}) {
  if (!Number.isFinite(baseChillDuration) || baseChillDuration < 0 || baseChillDuration > 60) {
    throw new RangeError('Cryomancy requires a bounded chill duration');
  }
  const resolvedRank = boundedRank(rank);
  const rule = CRYOMANCY_RULES[resolvedRank];
  const targetEffects = createActorEffects(effects);
  const frozen = targetEffects.frozen > 0;
  const wet = targetEffects.wet > 0;
  const chilled = targetEffects.chilled > 0;
  const shatter = resolvedRank >= 3 && frozen;
  const freeze = !shatter && (
    (resolvedRank >= 2 && wet)
    || (resolvedRank >= 3 && chilled)
  );

  return Object.freeze({
    rank: resolvedRank,
    chillDuration: Math.min(60, baseChillDuration + rule.chillDurationBonus),
    freezeDuration: freeze ? rule.freezeDuration : 0,
    shatter,
    shatterDamagePercent: shatter ? rule.shatterDamagePercent : 0,
    shatterRadius: shatter ? rule.shatterRadius : 0,
    shatterTargets: shatter ? rule.shatterTargets : 0,
  });
}

export function cryomancyShatterDamage(baseDamage, profile) {
  if (!Number.isFinite(baseDamage) || baseDamage < 0) {
    throw new RangeError('Shatter damage requires non-negative base damage');
  }
  if (!profile?.shatter || baseDamage === 0) return 0;
  return Math.max(1, Math.round(baseDamage * profile.shatterDamagePercent / 100));
}

export function selectCryomancyShatterTargets({
  origin,
  candidates = [],
  profile,
  tileSize = 64,
} = {}) {
  if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
    throw new TypeError('Shatter targeting requires an origin');
  }
  if (!Array.isArray(candidates) || !Number.isFinite(tileSize) || tileSize <= 0) {
    throw new TypeError('Shatter targeting requires candidates and a positive tile size');
  }
  if (!profile?.shatter || profile.shatterTargets < 1 || profile.shatterRadius <= 0) return [];

  return candidates
    .filter((candidate) => (
      candidate
      && candidate !== origin
      && typeof candidate.instanceId === 'string'
      && Number.isFinite(candidate.x)
      && Number.isFinite(candidate.y)
    ))
    .map((candidate) => ({
      candidate,
      distance: Math.hypot(candidate.x - origin.x, candidate.y - origin.y),
    }))
    .filter(({ distance }) => distance <= profile.shatterRadius * tileSize)
    .sort((left, right) => (
      left.distance - right.distance
      || left.candidate.instanceId.localeCompare(right.candidate.instanceId)
    ))
    .slice(0, profile.shatterTargets)
    .map(({ candidate }) => candidate);
}
