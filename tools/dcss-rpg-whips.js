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

const EMPTY_PROFILE = Object.freeze({ rank: 0, interrupt: false, reach: WHIP_REACH, pullCells: 1 });

function boundedInteger(value, min, max) {
  return Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : min;
}

/**
 * What the Whip control skill adds on top of the weapon. Without it a whip
 * still reaches and still pulls — the skill makes the pull a real answer to a
 * raised attack, then lengthens the lash, then drags twice as far.
 */
export function whipProfile(capabilities = {}) {
  const rank = boundedInteger(capabilities.whipRank, 0, 3);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    interrupt: boundedInteger(capabilities.whipInterrupt, 0, 1) === 1,
    reach: Math.max(WHIP_REACH, boundedInteger(capabilities.whipReach, 0, 4)),
    pullCells: Math.max(1, boundedInteger(capabilities.whipPullCells, 0, 3)),
  });
}

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
export function whipPull({ weapon, attacker, target, isFree, profile = EMPTY_PROFILE } = {}) {
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
  // A trained hand drags further, one cell at a time: the second step is taken
  // only if the first landed somewhere real, so nothing is ever pulled through
  // a wall or into another body.
  let cell = step;
  const cells = Math.max(1, profile?.pullCells ?? 1);
  for (let extra = 1; extra < cells; extra += 1) {
    const next = {
      x: cell.x + Math.sign(Math.round(dx)),
      y: cell.y + Math.sign(Math.round(dy)),
    };
    const closer = Math.hypot(attacker.x - (next.x + 0.5), attacker.y - (next.y + 0.5));
    if (closer < 1) break;
    if (typeof isFree === 'function' && !isFree(next.x, next.y)) break;
    cell = next;
  }
  return Object.freeze({
    ok: true,
    reason: 'pulled',
    cell: Object.freeze(cell),
    interrupt: profile?.interrupt === true,
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({ pulled: 'Рывок', 'too-heavy': 'Не сдвинуть' }),
  en: Object.freeze({ pulled: 'Yanked', 'too-heavy': 'Will not budge' }),
});

export function whipCopy(reason, language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'][reason] ?? '';
}
