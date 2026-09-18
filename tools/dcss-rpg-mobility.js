/**
 * Mobility pays for reading a telegraph. Leaving the marked tile before a blow
 * lands gives a short burst of speed, so one clean dodge sets up the next.
 * It is the only weapon-family-free technique: any hero can learn to move.
 */

const EMPTY_PROFILE = Object.freeze({ rank: 0, speedPercent: 0, seconds: 0 });
export const MAX_DODGE_SECONDS = 4;

function boundedInteger(value, min, max) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

export function mobilityProfile(capabilities = {}) {
  const rank = boundedInteger(capabilities.mobilityRank, 0, 3);
  const speedPercent = boundedInteger(capabilities.mobilityDodgeSpeedPercent, 0, 100);
  const dodgeMs = boundedInteger(capabilities.mobilityDodgeMs, 0, 10_000);
  if (rank === 0 || speedPercent === 0 || dodgeMs === 0) return EMPTY_PROFILE;
  return Object.freeze({ rank, speedPercent, seconds: dodgeMs / 1000 });
}

/** Refreshes the burst without letting repeated dodges pile it up forever. */
export function refreshDodgeBoost(remaining, profile) {
  const seconds = Math.max(0, profile?.seconds ?? 0);
  const current = Number.isFinite(remaining) && remaining > 0 ? remaining : 0;
  if (seconds <= 0) return current;
  return Math.min(MAX_DODGE_SECONDS, Math.max(seconds, current));
}

export function tickDodgeBoost(remaining, delta) {
  const current = Number.isFinite(remaining) && remaining > 0 ? remaining : 0;
  const step = Number.isFinite(delta) && delta > 0 ? delta : 0;
  return Math.max(0, current - step);
}

/** Speed multiplier while the burst lasts. */
export function dodgeSpeedMultiplier(remaining, profile) {
  if (!Number.isFinite(remaining) || remaining <= 0) return 1;
  return 1 + Math.max(0, profile?.speedPercent ?? 0) / 100;
}
