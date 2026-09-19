/**
 * Where a run ended, the next one finds the body.
 *
 * The dungeon already remembers runs — depth, level, killer, seed — so the only
 * thing missing was what the hero was wearing and where exactly they fell. With
 * those, a later run walking the same floor meets its own ghost: the same
 * silhouette, the same gear, standing roughly where it died.
 *
 * "Roughly" is the honest word. A new run is a new seed, so the floor is not the
 * floor that killed anyone — the cell may be solid rock now. The ghost goes to
 * the nearest place it could stand.
 *
 * The ghost does not attack first. It is a memory, not a monster: it stands
 * over one find and waits. Taking that find wakes it, and that is the whole
 * decision the bones offer — walk past your old self, or answer for what you
 * want out of it. The find lies in the open, so the choice is informed.
 *
 * What lies in the bundle is NOT the gear the ghost is wearing. Giving the kit
 * back would duplicate whatever the hero still has, and would show the same
 * sword on the same floor run after run. The ghost wears the dead run's gear;
 * it guards something the depth rolled fresh (`rollBonesReward`).
 */

export const BONES_VERSION = 1;
/** How many deaths the dungeon keeps. Older ones are simply forgotten. */
export const BONES_LIMIT = 4;

/**
 * How often a remembered death actually shows itself.
 *
 * The dungeon kept one body per depth and raised its ghost every single time
 * the hero walked that floor again, so meeting your own predecessor — which
 * ought to be the strangest thing that happens to you all evening — became the
 * ordinary furniture of every run. Rare is the whole point: one floor in four
 * where a body is remembered at all.
 */
export const GHOST_APPEARANCE_CHANCE = 0.25;

/**
 * Whether the body remembered on this floor stands up for this run. Decided by
 * the run and the depth, so a floor rebuilt from the same save says the same
 * thing twice — a ghost that flickers in and out on reload is a glitch.
 */
export function ghostWakes({ seed = 0, depth = 1, chance = GHOST_APPEARANCE_CHANCE } = {}) {
  if (!Number.isFinite(seed) || !Number.isFinite(depth)) return false;
  if (!(chance > 0)) return false;
  if (chance >= 1) return true;
  let value = (Math.imul(seed >>> 0, 0x9e3779b1) ^ Math.imul(depth + 1, 0xc2b2ae35)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296 < chance;
}
/** How far from the fatal cell the body may be laid instead. */
export const BONES_SEARCH_RADIUS = 6;

const GEAR_SLOTS = Object.freeze([
  'cloak', 'body', 'head', 'hand1', 'hand2', 'gloves', 'belt', 'boots', 'ring1', 'ring2', 'amulet',
]);

const boundedInteger = (value, min, max) => (
  Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : min
);

function normalizedGear(gear) {
  if (!Array.isArray(gear)) return [];
  return gear
    .filter((piece) => piece && typeof piece.id === 'string' && GEAR_SLOTS.includes(piece.slot))
    .slice(0, GEAR_SLOTS.length)
    .map((piece) => Object.freeze({
      slot: piece.slot,
      id: piece.id,
      materialId: typeof piece.materialId === 'string' ? piece.materialId : null,
      affixIds: Object.freeze(
        (Array.isArray(piece.affixIds) ? piece.affixIds : [])
          .filter((id) => typeof id === 'string')
          .slice(0, 2),
      ),
    }));
}

export function createBonesRecord(source = {}) {
  const depth = boundedInteger(source.depth, 1, 99);
  if (depth < 1) return null;
  return Object.freeze({
    version: BONES_VERSION,
    depth,
    x: boundedInteger(source.x, 0, 999),
    y: boundedInteger(source.y, 0, 999),
    level: Math.max(1, boundedInteger(source.level, 1, 999)),
    killerId: typeof source.killerId === 'string' && source.killerId.length <= 80
      ? source.killerId
      : null,
    at: typeof source.at === 'string' && source.at.length <= 40 ? source.at : '',
    seed: boundedInteger(source.seed, 0, 4_294_967_295),
    appearance: Object.freeze({
      bodyId: typeof source.appearance?.bodyId === 'string' ? source.appearance.bodyId : null,
      hairId: typeof source.appearance?.hairId === 'string' ? source.appearance.hairId : null,
    }),
    gear: Object.freeze(normalizedGear(source.gear)),
  });
}

export function validateBonesRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  if (record.version !== BONES_VERSION) return false;
  if (!Number.isInteger(record.depth) || record.depth < 1 || record.depth > 99) return false;
  if (!Number.isInteger(record.level) || record.level < 1) return false;
  if (!Array.isArray(record.gear)) return false;
  return record.gear.every((piece) => (
    piece && typeof piece.id === 'string' && GEAR_SLOTS.includes(piece.slot)
  ));
}

export function createBonesState(source = null) {
  if (!Array.isArray(source)) return [];
  return source.filter((record) => validateBonesRecord(record)).slice(0, BONES_LIMIT);
}

/**
 * One body per floor: the dungeon keeps the latest death on each depth rather
 * than a pile of them, so a bad evening does not fill the run with corpses.
 */
export function rememberBones(state, record) {
  const bones = createBonesState(state);
  const next = createBonesRecord(record);
  if (!next || !validateBonesRecord(next)) return bones;
  return [next, ...bones.filter((entry) => entry.depth !== next.depth)].slice(0, BONES_LIMIT);
}

export function bonesForDepth(state, depth, { excludeSeed = null } = {}) {
  return createBonesState(state).find((record) => (
    record.depth === depth && (excludeSeed === null || record.seed !== excludeSeed)
  )) ?? null;
}

/**
 * Where the body actually lies. The fatal cell belongs to a floor that no longer
 * exists, so it is a wish rather than an address: if nothing can stand there,
 * the search spirals outward and takes the nearest cell that can.
 */
export function bonesPlacement({ bones, isFree } = {}) {
  if (!bones || typeof isFree !== 'function') return null;
  if (isFree(bones.x, bones.y)) return Object.freeze({ x: bones.x, y: bones.y, moved: false });
  for (let radius = 1; radius <= BONES_SEARCH_RADIUS; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const x = bones.x + dx;
        const y = bones.y + dy;
        if (isFree(x, y)) return Object.freeze({ x, y, moved: true });
      }
    }
  }
  return null;
}

/** A stable name for one death, so its reward rolls the same every time. */
export function bonesKey(bones) {
  if (!bones) return '';
  return `${bones.depth}:${bones.seed}:${bones.at}`;
}

/**
 * What the ghost is worth. It is the hero as they were, so it answers to the
 * level they died at — not to the floor it is found on. Meeting your own
 * three-floor-ago self should feel like meeting something you already beat.
 *
 * With one ceiling. A run that grinds the first floor to level nine and dies
 * there would leave a level-nine ghost where every later run arrives at level
 * one, and the choice the bones offer stops being one. The depth caps it, and
 * in ordinary play the cap never binds: nobody reaches level nine on floor one.
 */
export const GHOST_LEVEL_CAP = (depth) => 2 + Math.max(1, depth) * 2;

export function ghostStats(bones) {
  const level = Math.min(
    Math.max(1, bones?.level ?? 1),
    GHOST_LEVEL_CAP(bones?.depth ?? 1),
  );
  return Object.freeze({
    hp: 18 + level * 7,
    damage: 3 + Math.round(level * 1.1),
    vision: 5,
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    name: 'Призрак',
    title: (level) => `Призрак героя ${level} уровня`,
    resting: 'Призрак стережёт находку',
    woken: 'Призрак проснулся',
  }),
  en: Object.freeze({
    name: 'Ghost',
    title: (level) => `Ghost of a level ${level} hero`,
    resting: 'A ghost is guarding this',
    woken: 'The ghost wakes',
  }),
});

export function bonesCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}
