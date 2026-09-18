/**
 * Shooting rewards stillness. Standing for a moment loads an aimed shot, and
 * from the second rank the arrow keeps going through the body it finds. The
 * hero has to choose between kiting and hitting hard, which is the whole point
 * of a ranged weapon.
 *
 * The skill answers to every family that shoots — bow, crossbow and sling. What
 * each of them makes of an aimed shot is the weapon's business, not the skill's:
 * that lives in `dcss-rpg-ranged.js`.
 */

import { isRangedWeapon } from './dcss-rpg-ranged.js';

export const BOW_FAMILY = 'bow';

const EMPTY_PROFILE = Object.freeze({ rank: 0, aimSeconds: 0, aimBonusPercent: 0, pierceTargets: 0 });
const NO_SHOT = Object.freeze({ aimed: false, bonusPercent: 0, pierceTargets: 0 });
export const MAX_STEADY_SECONDS = 10;

function boundedInteger(value, min, max) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

export function marksmanProfile(weapon, capabilities = {}) {
  if (!isRangedWeapon(weapon)) return EMPTY_PROFILE;
  const rank = boundedInteger(capabilities.marksmanRank, 0, 3);
  const aimMs = boundedInteger(capabilities.marksmanAimMs, 0, 10_000);
  const aimBonusPercent = boundedInteger(capabilities.marksmanAimBonusPercent, 0, 200);
  const pierceTargets = boundedInteger(capabilities.marksmanPierceTargets, 0, 3);
  if (rank === 0 || aimMs === 0 || aimBonusPercent === 0) return EMPTY_PROFILE;
  return Object.freeze({ rank, aimSeconds: aimMs / 1000, aimBonusPercent, pierceTargets });
}

/** Standing still fills the aim; any movement empties it at once. */
export function accumulateSteadiness(steadySeconds, delta, moving) {
  if (moving === true) return 0;
  const current = Number.isFinite(steadySeconds) && steadySeconds > 0 ? steadySeconds : 0;
  const step = Number.isFinite(delta) && delta > 0 ? delta : 0;
  return Math.min(MAX_STEADY_SECONDS, current + step);
}

/** What the next arrow carries, given how long the hero has been still. */
export function resolveMarksmanShot({ profile = EMPTY_PROFILE, steadySeconds = 0 } = {}) {
  if (!profile || profile.rank === 0) return NO_SHOT;
  const aimed = Number.isFinite(steadySeconds) && steadySeconds >= profile.aimSeconds;
  return Object.freeze({
    aimed,
    bonusPercent: aimed ? profile.aimBonusPercent : 0,
    pierceTargets: profile.pierceTargets,
  });
}

/**
 * Picks the creatures an arrow passes through after its first target: those
 * roughly along the same line, nearest first, at most `pierceTargets` of them.
 * Ties break on instanceId so a replay hits exactly the same bodies.
 */
export function selectPiercedTargets({
  origin,
  target,
  candidates = [],
  pierceTargets = 0,
  tolerance = 0.6,
  range = Number.POSITIVE_INFINITY,
} = {}) {
  if (!Number.isInteger(pierceTargets) || pierceTargets <= 0) return [];
  if (!origin || !target) return [];
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0) return [];
  const unit = { x: dx / length, y: dy / length };
  return candidates
    .filter((candidate) => candidate && candidate !== target && !(candidate.dead > 0) && !candidate.defeated)
    .map((candidate) => {
      const offsetX = candidate.x - target.x;
      const offsetY = candidate.y - target.y;
      return {
        candidate,
        along: offsetX * unit.x + offsetY * unit.y,
        across: Math.abs(offsetX * unit.y - offsetY * unit.x),
      };
    })
    .filter(({ along, across }) => along > 0 && along <= range && across <= tolerance)
    .sort((a, b) => a.along - b.along
      || String(a.candidate.instanceId ?? '').localeCompare(String(b.candidate.instanceId ?? '')))
    .slice(0, pierceTargets)
    .map(({ candidate }) => candidate);
}
