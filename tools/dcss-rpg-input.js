export const CARDINAL_DIRECTIONS = Object.freeze({
  up: Object.freeze([0, -1]),
  right: Object.freeze([1, 0]),
  down: Object.freeze([0, 1]),
  left: Object.freeze([-1, 0]),
});

export function directionVector(direction) {
  return CARDINAL_DIRECTIONS[direction] ?? null;
}

export function dominantCardinalDirection(deltaX, deltaY, deadZone = 10) {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return null;
  if (Math.hypot(deltaX, deltaY) < Math.max(0, deadZone)) return null;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return deltaX >= 0 ? 'right' : 'left';
  return deltaY >= 0 ? 'down' : 'up';
}

export function clampedStickOffset(deltaX, deltaY, maxDistance = 28, pixelStep = 4) {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return { x: 0, y: 0 };
  const safeMaximum = Math.max(0, maxDistance);
  const distance = Math.hypot(deltaX, deltaY);
  const scale = distance > safeMaximum && distance > 0 ? safeMaximum / distance : 1;
  const step = Math.max(1, pixelStep);
  return {
    x: Math.round((deltaX * scale) / step) * step,
    y: Math.round((deltaY * scale) / step) * step,
  };
}
