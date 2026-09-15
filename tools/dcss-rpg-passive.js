export const PASSIVE_CREATURE_CATALOG = Object.freeze([
  Object.freeze({
    id: 'sheep',
    path: 'mon/animals/sheep.png',
    weight: 12,
    minDepth: 1,
    speed: 0.5,
    size: 68,
    wanderRadius: 4,
    tameDifficulty: 1,
    meatYield: 2,
    maxHp: 18,
    defense: 0,
    huntResponse: 'flee',
    huntSpeed: 0.92,
    damage: 0,
    attackRate: 0,
    windup: 0,
    bloodColor: '#6d3030',
  }),
  Object.freeze({
    id: 'hog',
    path: 'mon/animals/hog.png',
    weight: 9,
    minDepth: 1,
    speed: 0.62,
    size: 70,
    wanderRadius: 4,
    tameDifficulty: 2,
    meatYield: 3,
    maxHp: 34,
    defense: 1,
    huntResponse: 'fight',
    huntSpeed: 0.82,
    damage: 7,
    attackRate: 0.72,
    windup: 0.42,
    bloodColor: '#74342f',
  }),
  Object.freeze({
    id: 'yak',
    path: 'mon/animals/yak.png',
    weight: 5,
    minDepth: 2,
    speed: 0.44,
    size: 82,
    wanderRadius: 3,
    tameDifficulty: 3,
    meatYield: 5,
    large: true,
    maxHp: 58,
    defense: 3,
    huntResponse: 'fight',
    huntSpeed: 0.68,
    damage: 11,
    attackRate: 0.58,
    windup: 0.54,
    bloodColor: '#60332b',
  }),
]);

export const PASSIVE_CREATURE_PATHS = Object.freeze(
  PASSIVE_CREATURE_CATALOG.map(({ path }) => path),
);

const DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: -1 }),
]);

export function passiveCreatureById(id) {
  return PASSIVE_CREATURE_CATALOG.find((creature) => creature.id === id) ?? null;
}

function mix(value) {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
  return (mixed ^ (mixed >>> 15)) >>> 0;
}

function passiveRoll(creature, salt = 0) {
  return mix(
    (creature.seed >>> 0) ^
      Math.imul((creature.wanderStep ?? 0) + 1, 0x9e3779b1) ^
      salt,
  );
}

export function passiveWanderPause(creature) {
  return 0.75 + (passiveRoll(creature, 0x50415553) % 1100) / 1000;
}

export function createPassiveCreatureStates(level, tileSize = 64) {
  if (!Array.isArray(level?.passiveCreatures) || !Array.isArray(level.rooms)) {
    throw new TypeError('Passive creature state requires a generated dungeon');
  }
  return level.passiveCreatures.map((spawn, index) => {
    const definition = passiveCreatureById(spawn.id);
    const room = level.rooms[spawn.roomIndex];
    if (!definition || !room) throw new Error(`Unknown passive creature: ${spawn.id}`);
    const state = spawn.state ?? {};
    const x = state.x ?? spawn.x;
    const y = state.y ?? spawn.y;
    const scaling = level.scaling?.monsters ?? {};
    const maxHp = Math.max(1, Math.round(definition.maxHp * (scaling.hpMultiplier ?? 1)));
    const damage = Math.max(0, Math.round(definition.damage * (scaling.damageMultiplier ?? 1)));
    const huntSpeed = Math.min(1.8, definition.huntSpeed * (scaling.moveSpeedMultiplier ?? 1));
    return {
      ...definition,
      maxHp,
      damage,
      huntSpeed,
      instanceId: spawn.instanceId,
      spritePath: definition.path,
      seed: spawn.seed >>> 0,
      roomIndex: spawn.roomIndex,
      homeX: spawn.x,
      homeY: spawn.y,
      bounds: {
        minX: room.x + 1,
        maxX: room.x + room.width - 2,
        minY: room.y + 1,
        maxY: room.y + room.height - 2,
      },
      x: (x + 0.5) * tileSize,
      y: (y + 0.5) * tileSize,
      facing: state.facing === -1 ? -1 : 1,
      actorKind: 'wildlife',
      hunted: state.hunted === true,
      defeated: state.defeated === true,
      hp: state.defeated === true
        ? 0
        : Number.isFinite(state.hp)
        ? Math.min(maxHp, Math.max(1, state.hp))
          : maxHp,
      hit: 0,
      attackSequence: Number.isInteger(state.attackSequence) ? state.attackSequence : 0,
      attackCooldown: 0,
      attackWindup: 0,
      attackRecovery: 0,
      attackTargetX: 0,
      attackTargetY: 0,
      route: [],
      repathCooldown: 0,
      stride: 0,
      wanderStep: Number.isInteger(state.wanderStep) ? state.wanderStep : 0,
      wanderCooldown: 0.45 + ((spawn.seed + index * 97) % 900) / 1000,
      wanderTarget: null,
    };
  });
}

export function choosePassiveWanderTarget({
  creature,
  grid,
  blockedCells = new Set(),
  avoidCell = null,
  tileSize = 64,
}) {
  if (!creature || !Array.isArray(grid) || !(blockedCells instanceof Set)) {
    throw new TypeError('Passive wandering requires a creature, grid and blocked cells');
  }
  const current = {
    x: Math.floor(creature.x / tileSize),
    y: Math.floor(creature.y / tileSize),
  };
  const bounds = creature.bounds;
  const candidates = DIRECTIONS.map((direction) => ({
    x: current.x + direction.x,
    y: current.y + direction.y,
  })).filter((candidate) => {
    if (grid[candidate.y]?.[candidate.x] !== '.') return false;
    if (blockedCells.has(`${candidate.x},${candidate.y}`)) return false;
    if (
      candidate.x < bounds.minX ||
      candidate.x > bounds.maxX ||
      candidate.y < bounds.minY ||
      candidate.y > bounds.maxY
    ) return false;
    return (
      Math.abs(candidate.x - creature.homeX) + Math.abs(candidate.y - creature.homeY) <=
      creature.wanderRadius
    );
  });
  if (candidates.length === 0) return null;

  let pool = candidates;
  if (avoidCell) {
    const currentDistance = Math.abs(current.x - avoidCell.x) + Math.abs(current.y - avoidCell.y);
    const safer = candidates.filter(
      (candidate) =>
        Math.abs(candidate.x - avoidCell.x) + Math.abs(candidate.y - avoidCell.y) >
        currentDistance,
    );
    if (safer.length > 0) pool = safer;
  }
  const target = pool[passiveRoll(creature, 0x57414e44) % pool.length];
  return Object.freeze({
    x: (target.x + 0.5) * tileSize,
    y: (target.y + 0.5) * tileSize,
    gridX: target.x,
    gridY: target.y,
  });
}
