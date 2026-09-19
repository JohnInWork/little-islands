/**
 * The one answer to "is that next to me".
 *
 * The game asked it in a dozen places and answered it with Manhattan distance,
 * which means the cross of four: a creature, a chest or a door standing corner
 * to corner with the hero could be neither fought nor touched. You walked up to
 * a sheep on the diagonal and nothing happened at all. Ivan found it by playing.
 *
 * A step may be diagonal, so the distance between cells is the larger of the two
 * axes — the ring of eight around a cell is all at distance one.
 */

export function cellStepDistance(a, b) {
  if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(a.y)
    || !Number.isFinite(b.x) || !Number.isFinite(b.y)) {
    throw new TypeError('Cell distance requires two finite cells');
  }
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** The eight cells around one, in reading order. */
export function neighbouringCells({ x, y }) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError('Neighbours require a finite cell');
  }
  const cells = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      cells.push(Object.freeze({ x: x + dx, y: y + dy }));
    }
  }
  return Object.freeze(cells);
}
