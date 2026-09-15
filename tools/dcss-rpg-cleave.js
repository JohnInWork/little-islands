import { hasLineOfSight } from './dcss-rpg-core.js';

const EMPTY_PROFILE = Object.freeze({ rank: 0, damagePercent: 0, maxTargets: 0, grip: null });

function actorCell(actor, tileSize) {
  return {
    x: Math.floor(actor.x / tileSize),
    y: Math.floor(actor.y / tileSize),
  };
}

function validActor(actor) {
  return actor
    && Number.isFinite(actor.x)
    && Number.isFinite(actor.y);
}

/**
 * Cleave is enabled by an explicit weapon family and derived skill capabilities.
 * This keeps new axes data-driven: adding one never requires another ID check.
 */
export function axeCleaveProfile(weapon, capabilities = {}) {
  if (weapon?.weaponFamily !== 'axe') return EMPTY_PROFILE;
  const rank = Number.isInteger(capabilities.axeCleaveRank)
    ? Math.max(0, Math.min(3, capabilities.axeCleaveRank))
    : 0;
  const twoHanded = weapon.hands === 2;
  const damageCapability = twoHanded
    ? capabilities.axeCleaveTwoHandDamagePercent
    : capabilities.axeCleaveOneHandDamagePercent;
  const targetCapability = twoHanded
    ? capabilities.axeCleaveTwoHandTargets
    : capabilities.axeCleaveOneHandTargets;
  const damagePercent = Number.isInteger(damageCapability)
    ? Math.max(0, Math.min(100, damageCapability))
    : 0;
  const maxTargets = Number.isInteger(targetCapability)
    ? Math.max(0, Math.min(2, targetCapability))
    : 0;
  if (rank === 0 || damagePercent === 0 || maxTargets === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    damagePercent,
    maxTargets,
    grip: twoHanded ? 'two-handed' : 'one-handed',
  });
}

export function axeCleaveDamage(primaryDamage, profile) {
  if (!Number.isFinite(primaryDamage) || primaryDamage <= 0 || profile?.damagePercent <= 0) return 0;
  return Math.max(1, Math.round(primaryDamage * profile.damagePercent / 100));
}

/**
 * Selects only living enemies next to the primary target, in the forward half of
 * the swing and visible through open dungeon cells. Stable sorting makes replay
 * and future authoritative multiplayer resolution deterministic.
 */
export function selectAxeCleaveTargets({
  grid,
  attacker,
  primary,
  candidates,
  profile,
  tileSize = 64,
} = {}) {
  if (
    !Array.isArray(grid)
    || !validActor(attacker)
    || !validActor(primary)
    || !Array.isArray(candidates)
    || !Number.isInteger(tileSize)
    || tileSize <= 0
    || !profile
    || profile.maxTargets <= 0
  ) return [];

  const attackerCell = actorCell(attacker, tileSize);
  const primaryCell = actorCell(primary, tileSize);
  const forwardX = primary.x - attacker.x;
  const forwardY = primary.y - attacker.y;
  const forwardLength = Math.hypot(forwardX, forwardY);
  if (forwardLength === 0) return [];

  return candidates
    .filter((candidate) => {
      if (!validActor(candidate) || candidate === primary || candidate.dead > 0) return false;
      if (candidate.instanceId !== undefined && candidate.instanceId === primary.instanceId) return false;
      const cell = actorCell(candidate, tileSize);
      if (grid[cell.y]?.[cell.x] !== '.') return false;
      const adjacentX = Math.abs(cell.x - primaryCell.x);
      const adjacentY = Math.abs(cell.y - primaryCell.y);
      if (Math.max(adjacentX, adjacentY) !== 1) return false;
      if (Math.max(Math.abs(cell.x - attackerCell.x), Math.abs(cell.y - attackerCell.y)) > 2) {
        return false;
      }
      const candidateX = candidate.x - attacker.x;
      const candidateY = candidate.y - attacker.y;
      const candidateLength = Math.hypot(candidateX, candidateY);
      if (candidateLength === 0) return false;
      const facingDot = (forwardX * candidateX + forwardY * candidateY)
        / (forwardLength * candidateLength);
      return facingDot >= -0.05 && hasLineOfSight(grid, attackerCell, cell);
    })
    .sort((left, right) => {
      const leftDistance = Math.hypot(left.x - primary.x, left.y - primary.y);
      const rightDistance = Math.hypot(right.x - primary.x, right.y - primary.y);
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return String(left.instanceId ?? '').localeCompare(String(right.instanceId ?? ''));
    })
    .slice(0, profile.maxTargets);
}
