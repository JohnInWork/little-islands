export const PLAYER_APPEARANCE_VERSION = 1;
export const PLAYER_APPEARANCE_STORAGE_KEY = 'dng-codex:player-appearance:v1';

export const PLAYER_BODY_OPTIONS = Object.freeze([
  Object.freeze({ id: 'human-m', layer: 'player/base/human_m.png' }),
  Object.freeze({ id: 'human-f', layer: 'player/base/human_f.png' }),
]);

export const PLAYER_HAIR_OPTIONS = Object.freeze([
  Object.freeze({ id: 'none', layer: null }),
  Object.freeze({ id: 'brown-short', layer: 'player/hair/brown1.png' }),
  Object.freeze({ id: 'brown-long', layer: 'player/hair/brown2.png' }),
  Object.freeze({ id: 'black', layer: 'player/hair/elf_black.png' }),
  Object.freeze({ id: 'black-long', layer: 'player/hair/fem_black.png' }),
  Object.freeze({ id: 'red', layer: 'player/hair/fem_red.png' }),
  Object.freeze({ id: 'white', layer: 'player/hair/fem_white.png' }),
  Object.freeze({ id: 'gold', layer: 'player/hair/fem_yellow.png' }),
  Object.freeze({ id: 'brown-tails', layer: 'player/hair/pigtails_brown.png' }),
]);

/**
 * Which voice a hero has. The body is chosen in the appearance editor and the
 * game has always drawn it; until now it did not listen to it, so a woman was
 * hurt and died in a man's voice. Nothing else about a body implies anything,
 * so this is the only thing derived from it.
 */
export function playerVoice(appearance) {
  return appearance?.bodyId === 'human-f' ? 'female' : 'male';
}

const bodies = new Map(PLAYER_BODY_OPTIONS.map((option) => [option.id, option]));
const hairs = new Map(PLAYER_HAIR_OPTIONS.map((option) => [option.id, option]));

function freezeAppearance(appearance) {
  return Object.freeze({
    version: PLAYER_APPEARANCE_VERSION,
    bodyId: appearance.bodyId,
    hairId: appearance.hairId,
  });
}

export function createPlayerAppearance({ bodyId = 'human-m', hairId = 'brown-short' } = {}) {
  const appearance = { version: PLAYER_APPEARANCE_VERSION, bodyId, hairId };
  if (!validatePlayerAppearance(appearance)) throw new TypeError('Invalid player appearance');
  return freezeAppearance(appearance);
}

export function validatePlayerAppearance(appearance) {
  return Boolean(appearance)
    && typeof appearance === 'object'
    && !Array.isArray(appearance)
    && Object.keys(appearance).length === 3
    && appearance.version === PLAYER_APPEARANCE_VERSION
    && bodies.has(appearance.bodyId)
    && hairs.has(appearance.hairId);
}

export function parsePlayerAppearance(raw) {
  if (typeof raw !== 'string' || raw.length > 2_000) return createPlayerAppearance();
  try {
    const parsed = JSON.parse(raw);
    return validatePlayerAppearance(parsed) ? freezeAppearance(parsed) : createPlayerAppearance();
  } catch {
    return createPlayerAppearance();
  }
}

export function loadPlayerAppearance(storage = globalThis.localStorage) {
  try {
    return parsePlayerAppearance(storage?.getItem(PLAYER_APPEARANCE_STORAGE_KEY));
  } catch {
    return createPlayerAppearance();
  }
}

export function savePlayerAppearance(appearance, storage = globalThis.localStorage) {
  if (!validatePlayerAppearance(appearance)) throw new TypeError('Cannot save invalid appearance');
  try {
    storage?.setItem(PLAYER_APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    return true;
  } catch {
    return false;
  }
}

export function resolvePlayerAppearance(appearance) {
  const safe = validatePlayerAppearance(appearance) ? appearance : createPlayerAppearance();
  return Object.freeze({
    body: bodies.get(safe.bodyId),
    hair: hairs.get(safe.hairId),
  });
}

export function cyclePlayerAppearance(appearance, kind, step) {
  if (!validatePlayerAppearance(appearance)) throw new TypeError('Invalid player appearance');
  const options = kind === 'body' ? PLAYER_BODY_OPTIONS : kind === 'hair' ? PLAYER_HAIR_OPTIONS : null;
  if (!options || !Number.isInteger(step) || step === 0) throw new TypeError('Invalid appearance cycle');
  const key = kind === 'body' ? 'bodyId' : 'hairId';
  const current = options.findIndex((option) => option.id === appearance[key]);
  const index = (current + step % options.length + options.length) % options.length;
  return createPlayerAppearance({ ...appearance, [key]: options[index].id });
}

export function playerAppearancePosition(appearance) {
  const safe = validatePlayerAppearance(appearance) ? appearance : createPlayerAppearance();
  return Object.freeze({
    body: PLAYER_BODY_OPTIONS.findIndex((option) => option.id === safe.bodyId),
    hair: PLAYER_HAIR_OPTIONS.findIndex((option) => option.id === safe.hairId),
  });
}

export function allPlayerAppearanceAssetPaths() {
  return [...new Set([
    ...PLAYER_BODY_OPTIONS.map(({ layer }) => layer),
    ...PLAYER_HAIR_OPTIONS.map(({ layer }) => layer),
  ].filter(Boolean))].sort();
}
