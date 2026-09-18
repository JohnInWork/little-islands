/**
 * Blunt weapons trade speed for control. A heavy hit leaves the target easier
 * to wound for a few seconds, and from the second rank it holds a winding-up
 * creature in place instead of merely shaking the blow off. Both effects are
 * deterministic: a mace is something to plan around, not to gamble on.
 */

export const BLUNT_FAMILY = 'blunt';
export const MAX_ARMOR_BREAK_PERCENT = 100;

const EMPTY_PROFILE = Object.freeze({
  rank: 0,
  armorBreakPercent: 0,
  armorBreakSeconds: 0,
  interruptStunSeconds: 0,
});
const NO_OUTCOME = Object.freeze({
  armorBreakPercent: 0,
  armorBreakSeconds: 0,
  interrupt: false,
  stunSeconds: 0,
});

function boundedInteger(value, min, max) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

export function bluntProfile(weapon, capabilities = {}) {
  if (weapon?.weaponFamily !== BLUNT_FAMILY) return EMPTY_PROFILE;
  const rank = boundedInteger(capabilities.bluntRank, 0, 3);
  const armorBreakPercent = boundedInteger(capabilities.bluntArmorBreakPercent, 0, MAX_ARMOR_BREAK_PERCENT);
  const armorBreakSeconds = boundedInteger(capabilities.bluntArmorBreakSeconds, 0, 20);
  const stunMs = boundedInteger(capabilities.bluntInterruptStunMs, 0, 5000);
  if (rank === 0 || armorBreakPercent === 0 || armorBreakSeconds === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    armorBreakPercent,
    armorBreakSeconds,
    interruptStunSeconds: stunMs / 1000,
  });
}

/** What one blunt hit does beyond its damage. */
export function resolveBluntStrike({ profile = EMPTY_PROFILE, targetWindingUp = false } = {}) {
  if (!profile || profile.rank === 0) return NO_OUTCOME;
  const interrupt = profile.interruptStunSeconds > 0 && targetWindingUp === true;
  return Object.freeze({
    armorBreakPercent: profile.armorBreakPercent,
    armorBreakSeconds: profile.armorBreakSeconds,
    interrupt,
    stunSeconds: interrupt ? profile.interruptStunSeconds : 0,
  });
}

/** Refreshes a broken-armour mark; the strongest reading wins while it lasts. */
export function refreshArmorBreak(current, outcome) {
  const percent = Math.min(MAX_ARMOR_BREAK_PERCENT, Math.max(0, outcome?.armorBreakPercent ?? 0));
  const seconds = Math.max(0, outcome?.armorBreakSeconds ?? 0);
  if (percent <= 0 || seconds <= 0) return current ?? null;
  return Object.freeze({
    percent: Math.max(percent, current?.percent ?? 0),
    remaining: Math.max(seconds, current?.remaining ?? 0),
  });
}

export function tickArmorBreak(current, delta) {
  if (!current || !Number.isFinite(delta) || delta < 0) return current ?? null;
  const remaining = current.remaining - delta;
  if (remaining <= 0) return null;
  return Object.freeze({ percent: current.percent, remaining });
}

/** Damage multiplier a target carries while its armour is broken. */
export function armorBreakMultiplier(current) {
  const percent = Number.isFinite(current?.percent) && current.remaining > 0 ? current.percent : 0;
  return 1 + Math.min(MAX_ARMOR_BREAK_PERCENT, Math.max(0, percent)) / 100;
}
