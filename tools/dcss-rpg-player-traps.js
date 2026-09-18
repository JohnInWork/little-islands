export const PLAYER_TRAP_ITEM_ID = 'hunter-trap';
export const PLAYER_TRAP_KIND = 'jaw';
export const PLAYER_TRAP_PATH = 'dngn/traps/blade.png';
export const MAX_PLACED_TRAPS = 16;

const PLACEMENT_OFFSETS = Object.freeze(
  [-1, 0, 1].flatMap((dy) =>
    [-1, 0, 1]
      .filter((dx) => dx !== 0 || dy !== 0)
      .map((dx) => Object.freeze({ dx, dy }))),
);

const IMPACT_BY_TIER = Object.freeze({
  1: Object.freeze({ damage: 22, holdSeconds: 0.6 }),
  2: Object.freeze({ damage: 32, holdSeconds: 0.9 }),
  3: Object.freeze({ damage: 44, holdSeconds: 1.2 }),
});

const cellKey = (x, y) => `${x},${y}`;
const validCell = (value) => Number.isInteger(value?.x) && Number.isInteger(value?.y);
const validTier = (value) => Number.isInteger(value) && value >= 1 && value <= 3;

function stringSet(values, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
    throw new TypeError(`${label} must be an array of cell keys`);
  }
  return new Set(values);
}

function validOwnerId(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:[-:][a-z0-9]+)*$/.test(value) && value.length <= 48;
}

export function playerTrapImpact(tier) {
  if (!validTier(tier)) throw new RangeError('Player trap tier must be 1..3');
  return IMPACT_BY_TIER[tier];
}

/**
 * Returns only cells the player may explicitly choose. Placement never consumes
 * RNG: target coordinates are part of the player command and remain authoritative.
 */
export function playerTrapPlacementCells({
  grid,
  hero,
  revealedCells = [],
  blockedCells = [],
  placedTraps = [],
} = {}) {
  if (!Array.isArray(grid) || grid.length === 0 || !grid.every(Array.isArray) || !validCell(hero)) {
    throw new TypeError('Trap placement requires a grid and integer hero cell');
  }
  const revealed = stringSet(revealedCells, 'Revealed cells');
  const blocked = stringSet(blockedCells, 'Blocked cells');
  if (!Array.isArray(placedTraps)) throw new TypeError('Placed traps must be an array');
  for (const trap of placedTraps) {
    if (!validCell(trap)) throw new TypeError('Placed trap requires integer coordinates');
    blocked.add(cellKey(trap.x, trap.y));
  }

  return PLACEMENT_OFFSETS
    .map(({ dx, dy }) => ({ x: hero.x + dx, y: hero.y + dy, dx, dy }))
    .filter(({ x, y }) => (
      grid[y]?.[x] === '.'
      && revealed.has(cellKey(x, y))
      && !blocked.has(cellKey(x, y))
    ));
}

function nextTrapId(placedTraps, depth) {
  const pattern = new RegExp(`^placed-trap-${depth}-(\\d+)$`);
  const sequence = placedTraps.reduce((maximum, trap) => {
    const match = pattern.exec(trap.instanceId);
    return match ? Math.max(maximum, Number(match[1]) + 1) : maximum;
  }, 0);
  return `placed-trap-${depth}-${sequence}`;
}

export function placePlayerTrap({
  runStatus,
  depth,
  hero,
  target,
  capabilities,
  itemCount,
  grid,
  revealedCells = [],
  blockedCells = [],
  placedTraps = [],
  ownerId = 'hero',
} = {}) {
  const unavailable = (reason) => ({ ok: false, reason, consumed: 0, placedTraps });
  if (runStatus !== 'playing' || !validCell(hero) || !Number.isFinite(hero.hp) || hero.hp <= 0) {
    return unavailable('inactive');
  }
  if (!Number.isInteger(depth) || depth < 1 || depth > 999 || !validOwnerId(ownerId)) {
    return unavailable('invalid-command');
  }
  if (!validCell(target) || !Number.isInteger(itemCount) || itemCount < 0) {
    return unavailable('invalid-command');
  }
  const tier = capabilities?.trapPlacementTier ?? 0;
  if (!Number.isInteger(tier) || tier < 0 || tier > 3) return unavailable('invalid-command');
  if (tier === 0) return unavailable('skill-required');
  if (itemCount === 0) return unavailable('item-required');
  if (!Array.isArray(placedTraps) || placedTraps.length >= MAX_PLACED_TRAPS) {
    return unavailable('limit');
  }
  if (!validatePlacedTraps(placedTraps, { depth, grid })) {
    return unavailable('invalid-command');
  }
  let choices;
  try {
    choices = playerTrapPlacementCells({ grid, hero, revealedCells, blockedCells, placedTraps });
  } catch {
    return unavailable('invalid-command');
  }
  if (!choices.some(({ x, y }) => x === target.x && y === target.y)) {
    return unavailable('invalid-target');
  }
  const impact = playerTrapImpact(tier);
  const trap = {
    instanceId: nextTrapId(placedTraps, depth),
    kind: PLAYER_TRAP_KIND,
    ownerId,
    x: target.x,
    y: target.y,
    tier,
    state: 'armed',
  };
  return {
    ok: true,
    reason: 'placed',
    consumed: 1,
    remainingItems: itemCount - 1,
    trap,
    impact,
    placedTraps: [...placedTraps.map((entry) => ({ ...entry })), trap],
    event: {
      type: 'player-trap-placed',
      trapId: trap.instanceId,
      ownerId,
      x: target.x,
      y: target.y,
      tier,
      itemId: PLAYER_TRAP_ITEM_ID,
      consumed: 1,
    },
  };
}

export function triggerPlayerTrap({ trap, target, runStatus = 'playing' } = {}) {
  const unavailable = (reason) => ({ ok: false, reason, trap, target });
  if (runStatus !== 'playing') return unavailable('inactive');
  if (!validPlacedTrap(trap) || trap.state !== 'armed') return unavailable('unarmed');
  if (!target || typeof target.instanceId !== 'string' || !Number.isFinite(target.hp) || target.hp <= 0) {
    return unavailable('invalid-target');
  }
  if (target.ownerId === trap.ownerId) return unavailable('friendly');
  const impact = playerTrapImpact(trap.tier);
  return {
    ok: true,
    reason: 'triggered',
    damage: impact.damage,
    holdSeconds: impact.holdSeconds,
    trap: { ...trap, state: 'spent' },
    target: { ...target, hp: Math.max(0, target.hp - impact.damage) },
    event: {
      type: 'player-trap-triggered',
      trapId: trap.instanceId,
      ownerId: trap.ownerId,
      targetId: target.instanceId,
      damage: impact.damage,
      holdSeconds: impact.holdSeconds,
    },
  };
}

export function validPlacedTrap(trap, depth = null) {
  if (!trap || typeof trap !== 'object' || Array.isArray(trap)) return false;
  const keys = ['instanceId', 'kind', 'ownerId', 'x', 'y', 'tier', 'state'];
  if (Object.keys(trap).length !== keys.length || !keys.every((key) => Object.hasOwn(trap, key))) return false;
  const match = /^placed-trap-(\d+)-(\d+)$/.exec(trap.instanceId);
  return Boolean(
    match
    && (depth === null || Number(match[1]) === depth)
    && trap.kind === PLAYER_TRAP_KIND
    && validOwnerId(trap.ownerId)
    && validCell(trap)
    && validTier(trap.tier)
    && ['armed', 'spent'].includes(trap.state),
  );
}

export function validatePlacedTraps(placedTraps, { depth, grid = null, reservedCells = [] } = {}) {
  // Depth zero is the surface: no traps are laid in a street, and an empty
  // list there is still a valid floor.
  if (!Array.isArray(placedTraps) || placedTraps.length > MAX_PLACED_TRAPS
    || !Number.isInteger(depth) || depth < 0 || depth > 999) return false;
  if (!Array.isArray(reservedCells) || reservedCells.some((cell) => typeof cell !== 'string')) return false;
  const ids = new Set();
  const cells = new Set();
  const reserved = new Set(reservedCells);
  for (const trap of placedTraps) {
    if (!validPlacedTrap(trap, depth) || ids.has(trap.instanceId)) return false;
    const key = cellKey(trap.x, trap.y);
    if (cells.has(key) || reserved.has(key) || (grid && grid[trap.y]?.[trap.x] !== '.')) return false;
    ids.add(trap.instanceId);
    cells.add(key);
  }
  return true;
}
