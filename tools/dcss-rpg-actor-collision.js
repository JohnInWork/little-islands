import { MONSTER_MIN_SEPARATION, canMeleeAttack } from './dcss-rpg-rules.js';

const EPSILON = 0.000001;
/**
 * Far enough to reach a corner-to-corner neighbour (√2 ≈ 1.415 cells) and no
 * farther: at 1.15 the diagonal was out of reach and the fight simply did not
 * happen. `canMeleeAttack` is what actually decides who may hit whom; this is
 * the coarse circle that gets asked first.
 */
export const MELEE_CONTACT_RANGE = 1.5;

function assertPosition(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new TypeError('Actor collision requires finite positions');
  }
}

function assertTileSize(tileSize) {
  if (!Number.isFinite(tileSize) || tileSize <= 0) {
    throw new TypeError('Actor collision requires a positive tile size');
  }
}

/** Current cells and only the next in-progress step, never an actor's entire route. */
export function blockingActorCells(actors, tileSize = 64) {
  if (!Array.isArray(actors)) throw new TypeError('Actor collision requires a list');
  assertTileSize(tileSize);
  const cells = new Set();
  for (const actor of actors) {
    if (!actor || actor.dead) continue;
    assertPosition(actor);
    // Content definitions also use `path` for the sprite URL; it is not a route.
    const target = actor.wanderTarget ??
      (Array.isArray(actor.route) ? actor.route[0] : null) ??
      (Array.isArray(actor.path) ? actor.path[0] : null);
    for (const position of [actor, target]) {
      if (!position) continue;
      assertPosition(position);
      cells.add(`${Math.floor(position.x / tileSize)},${Math.floor(position.y / tileSize)}`);
    }
  }
  return cells;
}

/** Identical start/contact range for hero and monster melee, with stable edges. */
export function canActorsMeleeContact(grid, attacker, target, tileSize = 64) {
  assertPosition(attacker);
  assertPosition(target);
  assertTileSize(tileSize);
  return Math.hypot(attacker.x - target.x, attacker.y - target.y) <=
      tileSize * MELEE_CONTACT_RANGE + EPSILON &&
    canMeleeAttack(grid,
      { x: attacker.x / tileSize, y: attacker.y / tileSize },
      { x: target.x / tileSize, y: target.y / tileSize });
}

/**
 * A grid path to an adjacent enemy has no free next tile. Close the remaining
 * sub-tile gap inside the actor's own cell, rather than entering the enemy cell.
 * This also aligns off-centre saved actors without teleporting or grid rebasing.
 */
export function meleeApproachPoint(actor, target, tileSize = 64) {
  assertPosition(actor);
  assertPosition(target);
  assertTileSize(tileSize);
  const x = Math.floor(actor.x / tileSize);
  const y = Math.floor(actor.y / tileSize);
  const dx = Math.floor(target.x / tileSize) - x;
  const dy = Math.floor(target.y / tileSize) - y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  if (Math.hypot(actor.x - target.x, actor.y - target.y) <= tileSize * MELEE_CONTACT_RANGE + EPSILON) return null;
  const inset = tileSize * 0.01;
  const point = {
    x: Math.max(x * tileSize + inset, Math.min((x + 1) * tileSize - inset, target.x - dx * tileSize)),
    y: Math.max(y * tileSize + inset, Math.min((y + 1) * tileSize - inset, target.y - dy * tileSize)),
  };
  return Math.hypot(point.x - actor.x, point.y - actor.y) > EPSILON ? point : null;
}

/**
 * Sweep the whole proposed movement, not just its endpoint: a quick actor cannot
 * tunnel through a slower one. Old overlapping saves can separate continuously,
 * but may not move further inward or cross to the opposite side of an actor.
 * The shared separation is the existing monster crowding distance, not a buff.
 */
export function constrainActorMovement({ actor, next, blockers, tileSize = 64 }) {
  assertPosition(actor);
  assertPosition(next);
  assertTileSize(tileSize);
  if (!Array.isArray(blockers)) throw new TypeError('Actor collision requires blockers');
  const dx = next.x - actor.x;
  const dy = next.y - actor.y;
  const movementSquared = dx * dx + dy * dy;
  if (movementSquared <= EPSILON * EPSILON) {
    return { x: actor.x, y: actor.y, blocked: false };
  }
  const radius = tileSize * MONSTER_MIN_SEPARATION;
  let fraction = 1;
  for (const other of blockers) {
    if (!other || other === actor || other.dead) continue;
    assertPosition(other);
    const ox = actor.x - other.x;
    const oy = actor.y - other.y;
    const distanceSquared = ox * ox + oy * oy;
    const toward = ox * dx + oy * dy;
    if (distanceSquared < radius * radius - EPSILON) {
      // Dot >= 0 means distance never decreases along this entire segment.
      if (toward < -EPSILON) fraction = 0;
      continue;
    }
    if (toward >= 0) continue;
    const discriminant = toward * toward - movementSquared * (distanceSquared - radius * radius);
    if (discriminant <= 0) continue;
    const contact = (-toward - Math.sqrt(discriminant)) / movementSquared;
    if (contact >= 0 && contact <= fraction) {
      fraction = Math.max(0, contact - EPSILON / Math.sqrt(movementSquared));
    }
  }
  return {
    x: actor.x + dx * fraction,
    y: actor.y + dy * fraction,
    blocked: fraction < 1,
  };
}
