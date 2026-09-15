import { createActorEffects } from './dcss-rpg-effects.js';

export const STORM_CHAIN_RULES = Object.freeze([
  Object.freeze({ rank: 0, targets: 0, damagePercent: 0, jumpRange: 0 }),
  Object.freeze({ rank: 1, targets: 1, damagePercent: 55, jumpRange: 2.5 }),
  Object.freeze({ rank: 2, targets: 2, damagePercent: 65, jumpRange: 3 }),
  Object.freeze({ rank: 3, targets: 3, damagePercent: 75, jumpRange: 3.5 }),
]);

function boundedRank(rank) {
  return Math.max(0, Math.min(3, Number.isInteger(rank) ? rank : 0));
}

export function stormChainProfile(rank) {
  return STORM_CHAIN_RULES[boundedRank(rank)];
}

export function stormChainDamage(baseDamage, profile) {
  if (!Number.isFinite(baseDamage) || baseDamage < 0) {
    throw new RangeError('Chain lightning damage requires non-negative base damage');
  }
  if (!profile || !Number.isFinite(profile.damagePercent)) {
    throw new TypeError('Chain lightning damage requires a profile');
  }
  if (baseDamage === 0 || profile.targets < 1 || profile.damagePercent <= 0) return 0;
  return Math.max(1, Math.round(baseDamage * profile.damagePercent / 100));
}

function isWetActor(actor) {
  return createActorEffects(actor?.effects).wet > 0;
}

/** Chain lightning only propagates through wet actors. Each jump starts at the
 * previous victim, so positioning a wet group is more valuable than merely
 * having several wet enemies somewhere in the room. */
export function selectStormChainTargets({
  origin,
  candidates = [],
  profile,
  tileSize = 64,
  canLink = () => true,
} = {}) {
  if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
    throw new TypeError('Chain lightning requires an origin');
  }
  if (!Array.isArray(candidates) || !Number.isFinite(tileSize) || tileSize <= 0) {
    throw new TypeError('Chain lightning requires candidates and a positive tile size');
  }
  if (typeof canLink !== 'function') throw new TypeError('Chain lightning requires a link rule');
  if (
    !profile
    || !Number.isInteger(profile.targets)
    || !Number.isFinite(profile.jumpRange)
    || profile.targets < 0
    || profile.jumpRange < 0
  ) throw new TypeError('Chain lightning requires a bounded profile');
  if (!isWetActor(origin) || profile.targets < 1 || profile.jumpRange <= 0) return [];

  const available = candidates.filter((candidate) => (
    candidate
    && candidate !== origin
    && typeof candidate.instanceId === 'string'
    && Number.isFinite(candidate.x)
    && Number.isFinite(candidate.y)
    && !(Number(candidate.dead) > 0)
    && candidate.defeated !== true
    && isWetActor(candidate)
  ));
  const selected = [];
  const usedIds = new Set([origin.instanceId].filter(Boolean));
  let source = origin;

  while (selected.length < profile.targets) {
    const next = available
      .filter((candidate) => !usedIds.has(candidate.instanceId))
      .map((candidate) => ({
        candidate,
        distance: Math.hypot(candidate.x - source.x, candidate.y - source.y),
      }))
      .filter(({ candidate, distance }) => (
        distance <= profile.jumpRange * tileSize && canLink(source, candidate)
      ))
      .sort((left, right) => (
        left.distance - right.distance
        || left.candidate.instanceId.localeCompare(right.candidate.instanceId)
      ))[0]?.candidate;
    if (!next) break;
    selected.push(next);
    usedIds.add(next.instanceId);
    source = next;
  }

  return selected;
}
