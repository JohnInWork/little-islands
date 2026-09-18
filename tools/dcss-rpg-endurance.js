/**
 * Endurance never makes the hero immune: it makes every debilitating state
 * pass sooner. A shortened effect still lasts at least a second, so poison is
 * always poison and a freeze is always a freeze — only briefer.
 */

/** No effect is ever shortened below this, unless it was briefer to begin with. */
export const ENDURANCE_MINIMUM_DURATION = 1;
/** Percent cut off a harmful duration at each rank. */
export const ENDURANCE_DURATION_PERCENT = Object.freeze([0, 20, 35, 50]);

const EMPTY_PROFILE = Object.freeze({ rank: 0, durationPercent: 0 });

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function enduranceProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.enduranceRank);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({ rank, durationPercent: ENDURANCE_DURATION_PERCENT[rank] });
}

/**
 * How long a harmful state lasts on this hero. A duration already shorter than
 * the floor is left alone, because endurance shortens suffering, never extends it.
 */
export function enduredDuration(duration, profile = EMPTY_PROFILE) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const percent = profile?.durationPercent ?? 0;
  if (percent <= 0) return duration;
  const shortened = (duration * (100 - percent)) / 100;
  return Math.max(Math.min(duration, ENDURANCE_MINIMUM_DURATION), shortened);
}
