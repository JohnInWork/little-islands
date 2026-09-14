import { skillById } from './dcss-rpg-skill-content.js';

export const SKILL_STATE_VERSION = 1;

// Registration is a gameplay contract, not a catalogue/preview flag. Leave a skill
// absent until its consumer, save handling and integration tests actually exist.
export const SKILL_IMPLEMENTATIONS = Object.freeze({
  'trap-sense': Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ trapDetectionRadius: 2, trapDetectionTier: 1 }),
      Object.freeze({ trapDetectionRadius: 3, trapDetectionTier: 2 }),
      Object.freeze({ trapDetectionRadius: 4, trapDetectionTier: 3 }),
    ]),
  }),
  'trap-disarming': Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ trapDisarmTier: 1 }),
      Object.freeze({ trapDisarmTier: 2 }),
      Object.freeze({ trapDisarmTier: 3 }),
    ]),
  }),
  lockpicking: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ lockpickTier: 1 }),
      Object.freeze({ lockpickTier: 2 }),
      Object.freeze({ lockpickTier: 3 }),
    ]),
  }),
});
// Add a system here only when its runtime consumer is connected and verified.
export const SKILL_SYSTEMS = Object.freeze(['trap-detection', 'trap-disarming', 'lockpicking']);

export const SKILL_MODIFIER_LIMITS = Object.freeze({
  attack: Object.freeze([-1000, 1000]),
  defense: Object.freeze([-1000, 1000]),
  maxHp: Object.freeze([-10000, 10000]),
  moveSpeed: Object.freeze([-0.8, 3]),
  attackSpeed: Object.freeze([-0.8, 3]),
});

// Explicit numeric contracts for the first planned consumers. Extend with a
// tested mechanic, rather than allowing arbitrary keys/functions in saves.
export const SKILL_CAPABILITY_LIMITS = Object.freeze({
  trapDetectionRadius: Object.freeze([0, 32]),
  trapDetectionTier: Object.freeze([0, 3]),
  trapDisarmTier: Object.freeze([0, 3]),
  trapPlacementTier: Object.freeze([0, 3]),
  lockpickTier: Object.freeze([0, 3]),
});

function isRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Reflect.ownKeys(value).every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && descriptor.enumerable && 'value' in descriptor;
  });
}

function hasExactKeys(value, keys) {
  return isRecord(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function validLevel(level) {
  return Number.isInteger(level) && level >= 1 && level <= 999;
}

function validPoints(points) {
  return Number.isInteger(points) && points >= 0 && points <= 998;
}

export function createSkillState(level = 1) {
  if (!validLevel(level)) throw new RangeError('Skill state requires hero level 1..999');
  return { version: SKILL_STATE_VERSION, points: level - 1, ranks: {} };
}

/** Readiness is intentionally NOT a save validation rule: disabling an unfinished
 * consumer must not delete an owned rank or silently refund progress. */
export function validateSkillState(state, level) {
  if (!validLevel(level) || !hasExactKeys(state, ['version', 'points', 'ranks'])) return false;
  if (state.version !== SKILL_STATE_VERSION || !validPoints(state.points) || !isRecord(state.ranks)) {
    return false;
  }
  let spent = 0;
  for (const [skillId, rank] of Object.entries(state.ranks)) {
    const definition = skillById(skillId);
    if (!definition || !Number.isInteger(rank) || rank < 1 || rank > definition.maxRank) return false;
    if (level < definition.rankLevels[rank - 1]) return false;
    spent += rank;
  }
  return state.points + spent === level - 1;
}

function assertAndInferLevel(state) {
  if (!hasExactKeys(state, ['version', 'points', 'ranks']) || !validPoints(state.points)
    || !isRecord(state.ranks)) throw new TypeError('Invalid skill state');
  const ranks = Object.values(state.ranks);
  if (!ranks.every((rank) => Number.isInteger(rank) && rank >= 1 && rank <= 3)) {
    throw new TypeError('Invalid skill ranks');
  }
  const level = 1 + state.points + ranks.reduce((sum, rank) => sum + rank, 0);
  if (!validateSkillState(state, level)) throw new TypeError('Invalid skill state');
  return level;
}

export function cloneSkillState(state) {
  assertAndInferLevel(state);
  return {
    version: SKILL_STATE_VERSION,
    points: state.points,
    ranks: Object.fromEntries(Object.keys(state.ranks).sort().map((id) => [id, state.ranks[id]])),
  };
}

/** The caller must supply the actual before/after hero levels. Conservation makes
 * replaying a stale level-up fail instead of granting the same points twice. */
export function grantSkillPoints(state, fromLevel, toLevel) {
  if (!validLevel(fromLevel) || !validLevel(toLevel) || toLevel < fromLevel) {
    throw new RangeError('Skill points require a monotonic level transition within 1..999');
  }
  if (!validateSkillState(state, fromLevel)) throw new TypeError('Skill state does not match starting level');
  const next = cloneSkillState(state);
  next.points += toLevel - fromLevel;
  return next;
}

function validValues(values, limits, integer = false) {
  if (!isRecord(values)) return false;
  return Object.entries(values).every(([key, value]) => (
    Object.hasOwn(limits, key)
    && Number.isFinite(value)
    && (!integer || Number.isInteger(value))
    && value >= limits[key][0]
    && value <= limits[key][1]
  ));
}

function validImplementation(implementation, maxRank) {
  if (!hasExactKeys(implementation, ['version', 'modifiersByRank', 'capabilitiesByRank'])
    || implementation.version !== 1) return false;
  const { modifiersByRank, capabilitiesByRank } = implementation;
  if (!Array.isArray(modifiersByRank) || modifiersByRank.length !== maxRank
    || !Array.isArray(capabilitiesByRank) || capabilitiesByRank.length !== maxRank) return false;
  for (let rank = 0; rank < maxRank; rank += 1) {
    const modifiers = modifiersByRank[rank];
    const capabilities = capabilitiesByRank[rank];
    if (!validValues(modifiers, SKILL_MODIFIER_LIMITS)
      || !validValues(capabilities, SKILL_CAPABILITY_LIMITS, true)) return false;
    if (![...Object.values(modifiers), ...Object.values(capabilities)].some((value) => value !== 0)) {
      return false;
    }
  }
  return true;
}

function implementationFor(definition, implementations) {
  if (!isRecord(implementations)) return null;
  const candidate = Object.getOwnPropertyDescriptor(implementations, definition.id)?.value;
  return validImplementation(candidate, definition.maxRank) ? candidate : null;
}

function hasRequiredSystems(definition, systems) {
  return Array.isArray(systems)
    && systems.every((system) => typeof system === 'string')
    && definition.requiresSystems.every((system) => systems.includes(system));
}

export function isSkillReady(skillId, { implementations = SKILL_IMPLEMENTATIONS, systems = SKILL_SYSTEMS } = {}) {
  const definition = skillById(skillId);
  return Boolean(definition && implementationFor(definition, implementations)
    && hasRequiredSystems(definition, systems));
}

/** Preview and mutation use exactly the same decision, including rank CAS. */
export function skillAvailability({
  state,
  heroLevel,
  runStatus,
  skillId,
  expectedRank,
  implementations = SKILL_IMPLEMENTATIONS,
  systems = SKILL_SYSTEMS,
} = {}) {
  const unavailable = (reason, rank = 0) => ({ ok: false, reason, rank, nextRank: rank + 1 });
  if (!validateSkillState(state, heroLevel)) return unavailable('invalid-state');
  if (runStatus !== 'playing') return unavailable('not-playing');
  const definition = typeof skillId === 'string' ? skillById(skillId) : null;
  if (!definition) return unavailable('unknown-skill');
  const rank = state.ranks[skillId] ?? 0;
  if (!Number.isInteger(expectedRank) || expectedRank < 0 || expectedRank > definition.maxRank) {
    return unavailable('invalid-command', rank);
  }
  if (expectedRank !== rank) return unavailable('stale-rank', rank);
  if (rank >= definition.maxRank) return unavailable('max-rank', rank);
  if (!implementationFor(definition, implementations)) return unavailable('not-implemented', rank);
  if (!hasRequiredSystems(definition, systems)) return unavailable('missing-systems', rank);
  if (heroLevel < definition.rankLevels[rank]) return unavailable('level-required', rank);
  if (state.points < 1) return unavailable('no-points', rank);
  return { ok: true, reason: 'available', rank, nextRank: rank + 1 };
}

export function learnSkill(options = {}) {
  const availability = skillAvailability(options);
  if (!availability.ok) return { ok: false, reason: availability.reason, state: options.state };
  const state = cloneSkillState(options.state);
  state.ranks[options.skillId] = availability.nextRank;
  state.points -= 1;
  return {
    ok: true,
    reason: 'learned',
    state,
    event: {
      type: 'skill-learned',
      skillId: options.skillId,
      previousRank: availability.rank,
      rank: availability.nextRank,
      pointsSpent: 1,
    },
  };
}

function deriveValues(state, options, field, limits, combine) {
  assertAndInferLevel(state);
  const { implementations = SKILL_IMPLEMENTATIONS, systems = SKILL_SYSTEMS } = options;
  const values = Object.fromEntries(Object.keys(limits).map((key) => [key, 0]));
  // Canonical order makes floating point accumulation independent of save/UI order.
  for (const id of Object.keys(state.ranks).sort()) {
    const definition = skillById(id);
    const implementation = implementationFor(definition, implementations);
    if (!implementation || !hasRequiredSystems(definition, systems)) continue;
    // Each row is the whole effect at that rank, not an increment over lower ranks.
    for (const [key, value] of Object.entries(implementation[field][state.ranks[id] - 1])) {
      values[key] = combine(values[key], value);
    }
  }
  for (const [key, [min, max]] of Object.entries(limits)) {
    values[key] = Math.max(min, Math.min(max, values[key]));
  }
  return values;
}

export function deriveSkillModifiers(state, options = {}) {
  return deriveValues(state, options, 'modifiersByRank', SKILL_MODIFIER_LIMITS, (a, b) => a + b);
}

export function deriveSkillCapabilities(state, options = {}) {
  return deriveValues(state, options, 'capabilitiesByRank', SKILL_CAPABILITY_LIMITS, Math.max);
}
