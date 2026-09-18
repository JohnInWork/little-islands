/**
 * Three weapons shoot, and they must not feel like one weapon with three
 * sprites. A bow is the balanced answer: it rewards a held breath and the arrow
 * keeps going. A crossbow is one heavy bolt — aiming it is worth far more, but
 * a bolt buries itself in the first body. A sling is the cheap, quick one: a
 * stone is bad at everything except keeping a monster off you, so it staggers.
 *
 * The skill (Marksmanship) is the same for all three; what differs is what the
 * family does with the shot the skill hands it.
 */

import { RANGED_WEAPON_FAMILIES } from './dcss-rpg-rules.js';

/** What each shooting family does with an aimed shot. */
export const RANGED_TRAITS = Object.freeze({
  bow: Object.freeze({ aimScalePercent: 100, pierces: true, staggerSeconds: 0 }),
  crossbow: Object.freeze({ aimScalePercent: 155, pierces: false, staggerSeconds: 0 }),
  sling: Object.freeze({ aimScalePercent: 60, pierces: false, staggerSeconds: 0.55 }),
});

const NO_TRAITS = Object.freeze({ aimScalePercent: 0, pierces: false, staggerSeconds: 0 });

export function isRangedWeapon(weapon) {
  return RANGED_WEAPON_FAMILIES.includes(weapon?.weaponFamily);
}

export function rangedTraits(weapon) {
  return RANGED_TRAITS[weapon?.weaponFamily] ?? NO_TRAITS;
}

/**
 * Folds the marksman's shot through the family. The skill decides whether the
 * hero stood still long enough; the weapon decides what that stillness buys.
 */
export function resolveRangedShot({ weapon, shot } = {}) {
  const traits = rangedTraits(weapon);
  if (!shot) {
    return Object.freeze({ aimed: false, bonusPercent: 0, pierceTargets: 0, staggerSeconds: traits.staggerSeconds });
  }
  const bonusPercent = Math.max(0, Math.round((shot.bonusPercent ?? 0) * traits.aimScalePercent / 100));
  return Object.freeze({
    aimed: shot.aimed === true && bonusPercent > 0,
    bonusPercent,
    pierceTargets: traits.pierces ? (shot.pierceTargets ?? 0) : 0,
    staggerSeconds: traits.staggerSeconds,
  });
}
