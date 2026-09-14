export const MAX_WORLD_LIGHTS = 5;
export const MAX_RADIAL_SHADOW_LIGHTS = 1;
export const MAX_SPOT_SHADOW_LIGHTS = 2;
export const MAX_VISIBLE_WORLD_BEAMS = 1;
export const VOLUMETRIC_LIGHT_HEIGHT = 5.4;

function validSource(source) {
  return (
    source &&
    Number.isFinite(source.x) &&
    Number.isFinite(source.y) &&
    Number.isFinite(source.radius) &&
    source.radius > 0 &&
    typeof source.color === 'string' &&
    /^#[0-9a-f]{6}$/i.test(source.color)
  );
}

export function selectWorldLights(sources, focus, limit = MAX_WORLD_LIGHTS) {
  if (!Array.isArray(sources) || !focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.y)) {
    throw new Error('World lights require sources and a finite focus point');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_WORLD_LIGHTS) {
    throw new Error(`World light budget must be between 1 and ${MAX_WORLD_LIGHTS}`);
  }
  const unique = new Map();
  for (const source of sources) {
    if (!validSource(source)) continue;
    const key = source.id ?? `${source.gridX}:${source.gridY}:${source.color}`;
    if (!unique.has(key)) unique.set(key, { ...source, id: String(key) });
  }
  return Object.freeze(
    [...unique.values()]
      .sort((left, right) => {
        const leftDistance = Math.hypot(left.x - focus.x, left.y - focus.y);
        const rightDistance = Math.hypot(right.x - focus.x, right.y - focus.y);
        return leftDistance - rightDistance || left.id.localeCompare(right.id);
      })
      .slice(0, limit)
      .map((source) => Object.freeze(source)),
  );
}

export function worldShadowPlan(selectedSources) {
  if (!Array.isArray(selectedSources)) throw new Error('Shadow planning requires selected lights');
  return Object.freeze({
    radial: Object.freeze(
      selectedSources.slice(0, MAX_RADIAL_SHADOW_LIGHTS).map(({ id }) => id),
    ),
    spot: Object.freeze(
      selectedSources
        .filter(({ beam }) => beam)
        .slice(0, MAX_SPOT_SHADOW_LIGHTS)
        .map(({ id }) => id),
    ),
    beams: Object.freeze(
      selectedSources
        .filter(({ beam }) => beam)
        .slice(0, MAX_VISIBLE_WORLD_BEAMS)
        .map(({ id }) => id),
    ),
  });
}

export function worldLightPulse(elapsed, phase = 0, reducedMotion = false) {
  if (reducedMotion) return Object.freeze({ intensity: 1, opacity: 1, rotation: 0 });
  const time = Number.isFinite(elapsed) ? elapsed : 0;
  return Object.freeze({
    intensity: 0.94 + Math.sin(time * 3.1 + phase) * 0.06,
    opacity: 0.9 + Math.sin(time * 1.7 + phase * 1.3) * 0.1,
    rotation: Math.sin(time * 0.23 + phase) * 0.035,
  });
}
