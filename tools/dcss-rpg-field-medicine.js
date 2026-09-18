/**
 * Field medicine is the skill that makes a roll of bandages worth carrying.
 * A dressing closes wounds at once and, with practice, stops what keeps them
 * open: poison first, then fire. Without the skill the bandages stay bandages
 * and the hero is told so, exactly like a camping kit without the camp.
 */

import { createActorEffects } from './dcss-rpg-effects.js';

export const BANDAGE_ITEM_ID = 'bandage';
/** Share of the hero's whole health a dressing returns at each rank. */
export const FIELD_MEDICINE_HEAL_PERCENT = Object.freeze([0, 12, 20, 30]);
/** What a dressing stops, rank by rank. */
export const FIELD_MEDICINE_TREATED_EFFECTS = Object.freeze([
  Object.freeze([]),
  Object.freeze([]),
  Object.freeze(['poison']),
  Object.freeze(['poison', 'burning']),
]);

const EMPTY_PROFILE = Object.freeze({
  rank: 0,
  healPercent: 0,
  treats: Object.freeze([]),
});

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function fieldMedicineProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.fieldMedicineRank);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    healPercent: FIELD_MEDICINE_HEAL_PERCENT[rank],
    treats: FIELD_MEDICINE_TREATED_EFFECTS[rank],
  });
}

/**
 * One dressing. A hero at full health with nothing burning or poisoning is
 * refused, so a scarce bandage is never spent on nothing.
 */
export function resolveBandage({ profile = EMPTY_PROFILE, hp, maxHp, effects = {} } = {}) {
  if (!profile || profile.rank === 0) return Object.freeze({ ok: false, reason: 'no-skill' });
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp < 1) {
    return Object.freeze({ ok: false, reason: 'invalid' });
  }
  const current = createActorEffects(effects);
  const cleared = profile.treats.filter((id) => current[id] > 0);
  const healed = Math.min(maxHp - hp, Math.max(1, Math.round((maxHp * profile.healPercent) / 100)));
  if (healed <= 0 && cleared.length === 0) {
    return Object.freeze({ ok: false, reason: 'nothing-to-treat' });
  }
  const next = createActorEffects(current);
  for (const id of cleared) next[id] = 0;
  return Object.freeze({
    ok: true,
    reason: 'treated',
    healed: Math.max(0, healed),
    hp: hp + Math.max(0, healed),
    cleared: Object.freeze([...cleared]),
    effects: next,
  });
}

const REFUSAL_TEXT = Object.freeze({
  ru: Object.freeze({
    'no-skill': 'Нужен навык «Полевая медицина»',
    'nothing-to-treat': 'Нечего лечить',
    invalid: 'Нечего лечить',
  }),
  en: Object.freeze({
    'no-skill': 'Field medicine is required',
    'nothing-to-treat': 'Nothing to treat',
    invalid: 'Nothing to treat',
  }),
});

export function bandageRefusalText(reason, language = 'ru') {
  const table = REFUSAL_TEXT[language] ?? REFUSAL_TEXT.ru;
  return table[reason] ?? '';
}
