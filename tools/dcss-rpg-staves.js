/**
 * A staff is the only weapon whose owner would rather be casting. So the skill
 * that answers to it does not make the staff hit harder — it makes hitting
 * worth something to the caster: every landed bolt takes time off every spell
 * the hero is holding. Fight to cast, then cast.
 *
 * The later ranks lengthen the bolt and finally let it pass through the first
 * body, which is what makes a staff worth both hands in a corridor.
 */

export const STAFF_FAMILY = 'staff';

const EMPTY_PROFILE = Object.freeze({
  rank: 0, channelSeconds: 0, rangeBonus: 0, pierceTargets: 0,
});

function boundedInteger(value, min, max) {
  return Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : min;
}

export function isStaff(weapon) {
  return weapon?.weaponFamily === STAFF_FAMILY;
}

export function staffProfile(weapon, capabilities = {}) {
  if (!isStaff(weapon)) return EMPTY_PROFILE;
  const rank = boundedInteger(capabilities.staffRank, 0, 3);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    channelSeconds: boundedInteger(capabilities.staffChannelMs, 0, 5000) / 1000,
    rangeBonus: boundedInteger(capabilities.staffRangeBonus, 0, 3),
    pierceTargets: boundedInteger(capabilities.staffPierceTargets, 0, 3),
  });
}

/**
 * Applies one landed hit to the spells the hero is holding. Returns a new map:
 * the caller decides whether anything changed, and nothing here can push a
 * cooldown below zero or resurrect a spell that was already ready.
 */
export function channelSpellCooldowns(cooldowns = {}, profile = EMPTY_PROFILE) {
  const seconds = profile?.channelSeconds ?? 0;
  if (seconds <= 0) return { changed: false, cooldowns };
  let changed = false;
  const next = {};
  for (const [spellId, value] of Object.entries(cooldowns)) {
    if (!Number.isFinite(value) || value <= 0) continue;
    const cut = Math.max(0, value - seconds);
    if (cut !== value) changed = true;
    if (cut > 0) next[spellId] = cut;
  }
  return { changed, cooldowns: changed ? next : cooldowns };
}

const COPY = Object.freeze({
  ru: Object.freeze({ channelled: 'Проведено' }),
  en: Object.freeze({ channelled: 'Channelled' }),
});

export function staffCopy(key, language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'][key] ?? '';
}
