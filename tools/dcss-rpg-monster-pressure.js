const CARDINAL_DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: -1 }),
]);

export const CROWD_ROOM_MIN_EXITS = 3;

function cellKey(x, y) {
  return `${x},${y}`;
}

function isOpenCell(grid, x, y) {
  return grid[y]?.[x] === '.' || grid[y]?.[x] === '~';
}

function openExitCount(grid, x, y) {
  return CARDINAL_DIRECTIONS.reduce(
    (count, direction) => count + Number(isOpenCell(grid, x + direction.x, y + direction.y)),
    0,
  );
}

function deterministicOrder(instanceId, x, y, step) {
  const source = `${instanceId}:${x}:${y}:${step}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Gives a blocked pursuer something honest to do inside a room: shuffle to another
 * free angle without entering a one-cell corridor, walking through an actor, or
 * moving farther away indefinitely. Real pathfinding always gets first refusal.
 */
export function chooseCrowdPressureStep({
  monster,
  hero,
  grid,
  blockedCells = new Set(),
  tileSize = 64,
  step = 0,
  previousCell = null,
}) {
  if (!monster || !hero || !Array.isArray(grid) || tileSize <= 0) return null;
  const origin = {
    x: Math.floor(monster.x / tileSize),
    y: Math.floor(monster.y / tileSize),
  };
  const heroCell = {
    x: Math.floor(hero.x / tileSize),
    y: Math.floor(hero.y / tileSize),
  };
  const currentDistance = Math.abs(origin.x - heroCell.x) + Math.abs(origin.y - heroCell.y);

  const candidates = CARDINAL_DIRECTIONS.map((direction) => ({
    x: origin.x + direction.x,
    y: origin.y + direction.y,
  }))
    .filter(({ x, y }) => {
      const key = cellKey(x, y);
      const distance = Math.abs(x - heroCell.x) + Math.abs(y - heroCell.y);
      return (
        isOpenCell(grid, x, y) &&
        key !== cellKey(heroCell.x, heroCell.y) &&
        !blockedCells.has(key) &&
        openExitCount(grid, x, y) >= CROWD_ROOM_MIN_EXITS &&
        distance <= currentDistance + 1
      );
    })
    .map(({ x, y }) => {
      const key = cellKey(x, y);
      const distance = Math.abs(x - heroCell.x) + Math.abs(y - heroCell.y);
      return {
        x,
        y,
        score:
          distance * 100 +
          (key === previousCell ? 48 : 0) +
          deterministicOrder(monster.instanceId ?? 'monster', x, y, step) / 0xffffffff,
      };
    })
    .sort((left, right) => left.score - right.score);

  const target = candidates[0];
  if (!target) return null;
  return Object.freeze({
    x: (target.x + 0.5) * tileSize,
    y: (target.y + 0.5) * tileSize,
    gridX: target.x,
    gridY: target.y,
  });
}
