// A gesture is one physical press/drag. OS key repeats and held-stick ticks
// reuse its token: they cannot silently confirm the warning they just caused.
export function createHazardInputState() {
  return { cell: null, warningGesture: null, confirmedGesture: null };
}

export function hazardMoveIntent({ state, origin, target, knownCells, gesture }) {
  if (!Number.isSafeInteger(gesture) || gesture < 0) throw new RangeError('Invalid input gesture');
  const cell = `${target.x},${target.y}`;
  if (!knownCells.has(cell)) {
    return { allowed: true, warn: false, state: createHazardInputState(), permittedCell: null };
  }
  // A distant map tap must never confirm walking through a trap automatically.
  const adjacent = Math.abs(target.x - origin.x) + Math.abs(target.y - origin.y) === 1;
  if (!adjacent) {
    return { allowed: false, warn: false, state: createHazardInputState(), permittedCell: null };
  }
  if (state.cell === cell && (state.confirmedGesture === gesture || state.warningGesture !== gesture)) {
    return { allowed: true, warn: false, state: { ...state, confirmedGesture: gesture }, permittedCell: cell };
  }
  const warn = state.cell !== cell;
  return {
    allowed: false,
    warn,
    state: { cell, warningGesture: gesture, confirmedGesture: null },
    permittedCell: null,
  };
}
