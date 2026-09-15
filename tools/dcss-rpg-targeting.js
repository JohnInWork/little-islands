import { ACTOR_EFFECT_IDS, MAX_EFFECT_DURATION } from './dcss-rpg-effects.js';

export const BLINK_MIN_RANGE = 1;
export const BLINK_MAX_RANGE = 8;

const cellKey = (x, y) => `${x},${y}`;
const validCell = (cell) => Number.isInteger(cell?.x) && Number.isInteger(cell?.y);

function stringSet(values, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
    throw new TypeError(`${label} must be an array of cell keys`);
  }
  return new Set(values);
}

function validateGrid(grid) {
  if (
    !Array.isArray(grid)
    || grid.length === 0
    || !grid.every((row) => Array.isArray(row) && row.length === grid[0].length)
  ) throw new TypeError('Blink targeting requires a rectangular grid');
}

/**
 * Teleportation may cross walls, but may only end on a revealed, unoccupied
 * floor tile. Returning a sorted finite list keeps UI and replay commands
 * deterministic without storing transient reticles in the save.
 */
export function blinkTargetCells({
  grid,
  origin,
  revealedCells = [],
  blockedCells = [],
  range = 5,
} = {}) {
  validateGrid(grid);
  if (!validCell(origin)) throw new TypeError('Blink origin must use integer coordinates');
  if (!Number.isInteger(range) || range < BLINK_MIN_RANGE || range > BLINK_MAX_RANGE) {
    throw new RangeError(`Blink range must be ${BLINK_MIN_RANGE}..${BLINK_MAX_RANGE}`);
  }
  const revealed = stringSet(revealedCells, 'Revealed cells');
  const blocked = stringSet(blockedCells, 'Blocked cells');
  const candidates = [];
  for (let y = Math.max(0, origin.y - range); y <= Math.min(grid.length - 1, origin.y + range); y += 1) {
    for (let x = Math.max(0, origin.x - range); x <= Math.min(grid[0].length - 1, origin.x + range); x += 1) {
      const distance = Math.hypot(x - origin.x, y - origin.y);
      if (
        distance < BLINK_MIN_RANGE
        || distance > range
        || grid[y][x] !== '.'
        || !revealed.has(cellKey(x, y))
        || blocked.has(cellKey(x, y))
      ) continue;
      candidates.push(Object.freeze({ x, y, distance }));
    }
  }
  return Object.freeze(candidates.sort((left, right) => (
    left.distance - right.distance || left.y - right.y || left.x - right.x
  )));
}

export function resolveBlink({
  runStatus = 'playing',
  hero,
  target,
  itemCount,
  candidates = [],
} = {}) {
  const unavailable = (reason) => Object.freeze({ ok: false, reason, consumed: 0 });
  if (
    runStatus !== 'playing'
    || !validCell(hero)
    || !Number.isFinite(hero.hp)
    || hero.hp <= 0
  ) return unavailable('inactive');
  if (!validCell(target) || !Number.isInteger(itemCount) || itemCount < 0 || !Array.isArray(candidates)) {
    return unavailable('invalid-command');
  }
  if (itemCount === 0) return unavailable('item-required');
  if (!candidates.every(validCell)) return unavailable('invalid-command');
  if (!candidates.some((cell) => cell.x === target.x && cell.y === target.y)) {
    return unavailable('invalid-target');
  }
  return Object.freeze({
    ok: true,
    reason: 'blinked',
    consumed: 1,
    remainingItems: itemCount - 1,
    hero: Object.freeze({ ...hero, x: target.x, y: target.y }),
    event: Object.freeze({ type: 'hero-blinked', x: target.x, y: target.y }),
  });
}

/**
 * Resolves the shared command contract for a consumable that applies an actor
 * condition. The caller supplies the authoritative candidates produced by the
 * world/visibility layer; no charge is consumed before a valid explicit target
 * has been selected. Keeping this independent from rendering lets future wands
 * reuse the same deterministic rule without adding UI-specific exceptions.
 */
export function resolveTargetedItemUse({
  runStatus = 'playing',
  heroHp,
  targetId,
  itemCount,
  candidateTargetIds = [],
  effect,
} = {}) {
  const unavailable = (reason) => Object.freeze({ ok: false, reason, consumed: 0 });
  if (runStatus !== 'playing' || !Number.isFinite(heroHp) || heroHp <= 0) {
    return unavailable('inactive');
  }
  if (
    typeof targetId !== 'string'
    || targetId.length === 0
    || !Number.isInteger(itemCount)
    || itemCount < 0
    || !Array.isArray(candidateTargetIds)
    || candidateTargetIds.some((id) => typeof id !== 'string' || id.length === 0)
    || effect?.type !== 'target-effect'
    || !ACTOR_EFFECT_IDS.includes(effect.effectId)
    || !Number.isFinite(effect.duration)
    || effect.duration <= 0
    || effect.duration > MAX_EFFECT_DURATION
    || !Number.isInteger(effect.range)
    || effect.range < BLINK_MIN_RANGE
    || effect.range > BLINK_MAX_RANGE
  ) return unavailable('invalid-command');
  if (itemCount === 0) return unavailable('item-required');
  if (!candidateTargetIds.includes(targetId)) return unavailable('invalid-target');
  return Object.freeze({
    ok: true,
    reason: 'targeted-item-used',
    consumed: 1,
    remainingItems: itemCount - 1,
    targetId,
    application: Object.freeze({ id: effect.effectId, duration: effect.duration }),
    event: Object.freeze({
      type: 'actor-effect-item-used',
      targetId,
      effectId: effect.effectId,
      duration: effect.duration,
    }),
  });
}
