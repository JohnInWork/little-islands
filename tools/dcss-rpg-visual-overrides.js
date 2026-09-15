export const VISUAL_OVERRIDES_VERSION = 1;
export const VISUAL_OVERRIDES_STORAGE_KEY = 'dng-codex:visual-overrides:v1';

export const VISUAL_BINDING_KINDS = Object.freeze([
  'monster',
  'passive',
  'loot',
  'event',
  'find',
  'trap',
  'system',
]);

const KIND_SET = new Set(VISUAL_BINDING_KINDS);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const CHANNEL_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
const PATH_PATTERN = /^[A-Za-z0-9_./+-]+\.png$/;
const SCALE_MIN = 0.5;
const SCALE_MAX = 2.5;
const OFFSET_MIN = -40;
const OFFSET_MAX = 40;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validPath(path) {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    path.length <= 240 &&
    !path.startsWith('/') &&
    !path.includes('..') &&
    PATH_PATTERN.test(path)
  );
}

function validScale(scale) {
  return Number.isFinite(scale) && scale >= SCALE_MIN && scale <= SCALE_MAX;
}

function validOffset(offsetY) {
  return Number.isInteger(offsetY) && offsetY >= OFFSET_MIN && offsetY <= OFFSET_MAX;
}

function freezeDocument(document) {
  const bindings = Object.fromEntries(
    Object.entries(document.bindings)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, binding]) => [key, Object.freeze({ ...binding })]),
  );
  return Object.freeze({ version: VISUAL_OVERRIDES_VERSION, bindings: Object.freeze(bindings) });
}

export function visualBindingKey(kind, id, channel = 'world') {
  if (!KIND_SET.has(kind) || !ID_PATTERN.test(id ?? '') || !CHANNEL_PATTERN.test(channel ?? '')) {
    throw new TypeError('Visual binding requires a stable kind, id and channel');
  }
  return `${kind}:${id}:${channel}`;
}

export function createVisualOverrides(bindings = {}) {
  const document = { version: VISUAL_OVERRIDES_VERSION, bindings: { ...bindings } };
  if (!validateVisualOverrides(document)) throw new TypeError('Invalid visual override document');
  return freezeDocument(document);
}

export function validateVisualOverrides(document) {
  if (!isRecord(document) || document.version !== VISUAL_OVERRIDES_VERSION) return false;
  if (!isRecord(document.bindings) || Object.keys(document).length !== 2) return false;
  if (Object.keys(document.bindings).length > 512) return false;
  for (const [key, binding] of Object.entries(document.bindings)) {
    const [kind, id, channel, ...extra] = key.split(':');
    if (
      extra.length > 0 ||
      !KIND_SET.has(kind) ||
      !ID_PATTERN.test(id ?? '') ||
      !CHANNEL_PATTERN.test(channel ?? '') ||
      !isRecord(binding) ||
      Object.keys(binding).some((field) => !['path', 'scale', 'offsetY'].includes(field)) ||
      !validPath(binding.path) ||
      !validScale(binding.scale) ||
      !validOffset(binding.offsetY)
    ) return false;
  }
  return true;
}

export function parseVisualOverrides(raw) {
  if (typeof raw !== 'string' || raw.length > 250_000) return createVisualOverrides();
  try {
    const parsed = JSON.parse(raw);
    return validateVisualOverrides(parsed) ? freezeDocument(parsed) : createVisualOverrides();
  } catch {
    return createVisualOverrides();
  }
}

export function loadVisualOverrides(storage = globalThis.localStorage) {
  try {
    return parseVisualOverrides(storage?.getItem(VISUAL_OVERRIDES_STORAGE_KEY));
  } catch {
    return createVisualOverrides();
  }
}

export function saveVisualOverrides(document, storage = globalThis.localStorage) {
  if (!validateVisualOverrides(document)) throw new TypeError('Cannot save invalid visual overrides');
  try {
    storage?.setItem(VISUAL_OVERRIDES_STORAGE_KEY, JSON.stringify(document));
    return true;
  } catch {
    return false;
  }
}

export function setVisualOverride(document, key, binding) {
  if (!validateVisualOverrides(document)) throw new TypeError('Invalid visual override document');
  const candidate = {
    version: VISUAL_OVERRIDES_VERSION,
    bindings: {
      ...document.bindings,
      [key]: {
        path: binding?.path,
        scale: Number(binding?.scale),
        offsetY: Number(binding?.offsetY),
      },
    },
  };
  if (!validateVisualOverrides(candidate)) throw new TypeError('Invalid visual binding');
  return freezeDocument(candidate);
}

export function removeVisualOverride(document, key) {
  if (!validateVisualOverrides(document)) throw new TypeError('Invalid visual override document');
  const bindings = { ...document.bindings };
  delete bindings[key];
  return freezeDocument({ version: VISUAL_OVERRIDES_VERSION, bindings });
}

export function resolveVisualBinding(document, key, fallback) {
  if (!validPath(fallback?.path)) throw new TypeError('Visual fallback requires a local PNG path');
  const base = {
    path: fallback.path,
    scale: validScale(fallback.scale) ? fallback.scale : 1,
    offsetY: validOffset(fallback.offsetY) ? fallback.offsetY : 0,
  };
  if (!validateVisualOverrides(document)) return Object.freeze(base);
  const override = document.bindings[key];
  return Object.freeze(override ? { ...override } : base);
}

export function visualOverridePaths(document) {
  if (!validateVisualOverrides(document)) return [];
  return [...new Set(Object.values(document.bindings).map(({ path }) => path))].sort();
}
