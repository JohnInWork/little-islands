import { MONSTER_MIN_SEPARATION } from './dcss-rpg-rules.js';

/**
 * Closing is an intent, not an actor displacement. Runtime positions/targets
 * are in pixels, while generated door coordinates are grid cells. Reserve only
 * the immediate step so a distant planned route cannot lock a door forever.
 */
export function canCloseDoor({ door, actors, tileSize = 64 }) {
  if (
    !Number.isInteger(door?.x) || !Number.isInteger(door?.y) ||
    !Array.isArray(actors) || !Number.isFinite(tileSize) || tileSize <= 0
  ) throw new TypeError('Door closing requires a grid door, actors and a positive tile size');

  const minimumX = door.x * tileSize;
  const minimumY = door.y * tileSize;
  const maximumX = minimumX + tileSize;
  const maximumY = minimumY + tileSize;
  const radius = tileSize * MONSTER_MIN_SEPARATION / 2;
  const targetsDoor = (target) => target &&
    Math.floor(target.x / tileSize) === door.x &&
    Math.floor(target.y / tileSize) === door.y;

  return !actors.some((actor) => {
    if (!actor || actor.dead === true || (typeof actor.dead === 'number' && actor.dead > 0)) {
      return false;
    }
    // Refuse ambiguous live occupancy rather than closing onto a bad actor.
    if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return true;
    const nearestX = Math.max(minimumX, Math.min(maximumX, actor.x));
    const nearestY = Math.max(minimumY, Math.min(maximumY, actor.y));
    const overlapsOpening = Math.hypot(actor.x - nearestX, actor.y - nearestY) < radius;
    return overlapsOpening || targetsDoor(actor.path?.[0]) ||
      targetsDoor(actor.route?.[0]) || targetsDoor(actor.wanderTarget);
  });
}
