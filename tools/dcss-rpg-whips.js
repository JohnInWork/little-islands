/**
 * A whip is not a short spear. Both reach two cells, but a spear only keeps a
 * monster at arm's length — a whip drags it in. Catch something at reach and it
 * comes one cell closer, so the hero, not the monster, picks the distance of
 * the fight. Anything already standing next to you has nowhere to be pulled.
 *
 * Bosses do not budge. A fight you could reel in one cell at a time would stop
 * being a fight.
 */

export const WHIP_FAMILY = 'whip';
export const WHIP_REACH = 2;

const NO_PULL = Object.freeze({ ok: false, reason: 'no-pull', cell: null });

function cellOf(point) {
  return { x: Math.floor(point.x), y: Math.floor(point.y) };
}

export function isWhip(weapon) {
  return weapon?.weaponFamily === WHIP_FAMILY;
}

/**
 * Where the lash puts the target. One step along the line back to the hero,
 * and only if that step lands somewhere the target could have walked.
 *
 * `isFree(x, y)` answers for the world: walkable, and nobody standing there.
 */
export function whipPull({ weapon, attacker, target, isFree } = {}) {
  if (!isWhip(weapon) || !attacker || !target) return NO_PULL;
  const dx = attacker.x - target.x;
  const dy = attacker.y - target.y;
  const distance = Math.hypot(dx, dy);
  // Already next door: there is nothing between the two to pull across.
  if (!Number.isFinite(distance) || distance < 1.5) return NO_PULL;
  // The refusal comes only where a pull would otherwise have happened, so the
  // runtime can say "will not budge" without saying it to an empty corridor.
  if (target.boss === true) return Object.freeze({ ok: false, reason: 'too-heavy', cell: null });
  const from = cellOf(target);
  const step = {
    x: from.x + Math.sign(Math.round(dx)),
    y: from.y + Math.sign(Math.round(dy)),
  };
  if (step.x === from.x && step.y === from.y) return NO_PULL;
  if (typeof isFree === 'function' && !isFree(step.x, step.y)) {
    return Object.freeze({ ok: false, reason: 'blocked', cell: null });
  }
  return Object.freeze({ ok: true, reason: 'pulled', cell: Object.freeze(step) });
}

const COPY = Object.freeze({
  ru: Object.freeze({ pulled: 'Рывок', 'too-heavy': 'Не сдвинуть' }),
  en: Object.freeze({ pulled: 'Yanked', 'too-heavy': 'Will not budge' }),
});

export function whipCopy(reason, language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'][reason] ?? '';
}
