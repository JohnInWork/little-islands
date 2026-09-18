import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SKILL_IMPLEMENTATIONS,
  SKILL_STATE_VERSION,
  SKILL_SYSTEMS,
  cloneSkillState,
  createSkillState,
  deriveSkillCapabilities,
  deriveSkillModifiers,
  grantSkillPoints,
  isSkillReady,
  learnSkill,
  skillAvailability,
  validateSkillState,
} from '../tools/dcss-rpg-skills.js';

// Test-only implementations. No production skill becomes available through these fixtures.
const TRAP_IMPLEMENTATION = {
  version: 1,
  modifiersByRank: [{}, {}, {}],
  capabilitiesByRank: [
    { trapDetectionRadius: 1, trapDetectionTier: 1 },
    { trapDetectionRadius: 2, trapDetectionTier: 2 },
    { trapDetectionRadius: 3, trapDetectionTier: 3 },
  ],
};
const implementations = { 'trap-sense': TRAP_IMPLEMENTATION };
const systems = ['trap-detection'];
const neutral = { attack: 0, defense: 0, maxHp: 0, moveSpeed: 0, attackSpeed: 0, intelligence: 0 };
const command = (state, heroLevel, expectedRank = 0, overrides = {}) => ({
  state,
  heroLevel,
  runStatus: 'playing',
  skillId: 'trap-sense',
  expectedRank,
  implementations,
  systems,
  ...overrides,
});

test('skill state starts neutral and grants exactly one point for each earned level', () => {
  const initial = createSkillState();
  assert.deepEqual(initial, { version: SKILL_STATE_VERSION, points: 0, ranks: {} });
  assert.ok(Object.isFrozen(SKILL_IMPLEMENTATIONS));
  assert.ok(Object.isFrozen(SKILL_SYSTEMS));
  assert.deepEqual(Object.keys(SKILL_IMPLEMENTATIONS), [
    'trap-sense', 'trap-disarming', 'lockpicking', 'trap-setting', 'appraisal', 'swords', 'axes',
    'camping', 'necromancy', 'cooking', 'field-medicine', 'endurance', 'darkvision', 'secret-search', 'stealth',
    'daggers', 'blunt-weapons', 'spears', 'marksmanship', 'mobility', 'shield',
    'pyromancy', 'cryomancy', 'storm-magic',
  ]);
  assert.deepEqual(SKILL_SYSTEMS, [
    'trap-detection', 'camp-rest', 'summoned-servants', 'cooking-recipes', 'food-buffs', 'medical-treatment',
    'condition-duration-scaling', 'darkness-vision',
    'secret-discovery', 'stealth-detection',
    'ambush-attacks', 'backstab-attacks', 'armor-break', 'attack-interruption',
    'spear-interception', 'aimed-shots', 'piercing-shots', 'evasion-reward',
    'trap-disarming', 'lockpicking', 'trap-placement', 'item-identification', 'sword-rhythm',
    'weapon-cleave', 'shield-blocking', 'fire-spread', 'frost-buildup', 'chain-lightning',
  ]);
  assert.ok(Object.isFrozen(SKILL_IMPLEMENTATIONS['trap-sense']));
  assert.ok(Object.isFrozen(SKILL_IMPLEMENTATIONS['trap-sense'].capabilitiesByRank));
  assert.ok(SKILL_IMPLEMENTATIONS['trap-sense'].capabilitiesByRank.every(Object.isFrozen));
  assert.deepEqual(deriveSkillModifiers(initial), neutral);
  const levelFour = grantSkillPoints(initial, 1, 4);
  assert.equal(levelFour.points, 3);
  assert.deepEqual(initial, createSkillState());
  assert.deepEqual(grantSkillPoints(levelFour, 4, 4), levelFour);
  assert.throws(() => grantSkillPoints(levelFour, 1, 4));
  assert.throws(() => grantSkillPoints(levelFour, 4, 3));
  for (const level of [0, 1.2, 1000, NaN, Infinity, '2']) {
    assert.throws(() => createSkillState(level));
    assert.throws(() => grantSkillPoints(initial, 1, level));
  }
});

test('saved ranks are strict, level-gated and conserve all earned points', () => {
  const valid = { version: 1, points: 2, ranks: { 'trap-sense': 1 } };
  assert.equal(validateSkillState(valid, 4), true);
  const invalid = [
    null, [], {}, { ...valid, version: 2 }, { ...valid, points: '2' },
    { ...valid, points: NaN }, { ...valid, points: Infinity },
    { ...valid, points: -1 }, { ...valid, points: 1.5 },
    { ...valid, points: 3 }, { ...valid, extra: true },
    { ...valid, ranks: [] }, { ...valid, ranks: { missing: 1 } },
    { ...valid, ranks: { 'trap-sense': 0 } },
    { ...valid, ranks: { 'trap-sense': 4 } },
    { ...valid, ranks: { 'trap-sense': 1.5 } },
    { ...valid, ranks: Object.create({ 'trap-sense': 1 }) },
    { ...valid, ranks: JSON.parse('{"__proto__":1}') },
  ];
  for (const state of invalid) assert.equal(validateSkillState(state, 4), false);
  assert.equal(validateSkillState({ version: 1, points: 0, ranks: { 'trap-sense': 2 } }, 3), false);
  assert.equal(validateSkillState({ version: 1, points: 2, ranks: { 'trap-sense': 3 } }, 6), true);
  assert.equal(validateSkillState(valid, '4'), false);
});

test('learning is immutable and expectedRank prevents duplicate command spending', () => {
  const state = createSkillState(2);
  const before = structuredClone(state);
  const result = learnSkill(command(state, 2));
  assert.equal(result.ok, true);
  assert.deepEqual(state, before);
  assert.deepEqual(result.state, { version: 1, points: 0, ranks: { 'trap-sense': 1 } });
  assert.deepEqual(result.event, {
    type: 'skill-learned', skillId: 'trap-sense', previousRank: 0, rank: 1, pointsSpent: 1,
  });
  const repeated = learnSkill(command(result.state, 2));
  assert.equal(repeated.ok, false);
  assert.equal(repeated.reason, 'stale-rank');
  assert.equal(repeated.state, result.state);
  assert.equal(repeated.event, undefined);
});

test('terminal runs, bad commands and ranks above the hero level never spend points', () => {
  const state = createSkillState(4);
  for (const overrides of [
    { runStatus: 'dead' }, { runStatus: 'won' }, { runStatus: 'paused' },
    { skillId: 'unknown' }, { expectedRank: undefined }, { expectedRank: -1 },
    { expectedRank: 1.5 }, { expectedRank: 1 }, { heroLevel: 3 },
  ]) {
    const result = learnSkill(command(state, 4, 0, overrides));
    assert.equal(result.ok, false);
    assert.equal(result.state, state);
  }
  const first = learnSkill(command(createSkillState(2), 2)).state;
  assert.equal(learnSkill(command(first, 2, 1)).reason, 'level-required');
  const noPoints = { version: 1, points: 0, ranks: { 'trap-sense': 1, darkvision: 1, stealth: 1 } };
  assert.equal(learnSkill(command(noPoints, 4, 1)).reason, 'no-points');
});

test('all three ranks work at their level thresholds and stop at the ceiling', () => {
  let state = createSkillState(2);
  state = learnSkill(command(state, 2)).state;
  state = grantSkillPoints(state, 2, 4);
  state = learnSkill(command(state, 4, 1)).state;
  state = grantSkillPoints(state, 4, 6);
  const available = skillAvailability(command(state, 6, 2));
  assert.equal(available.ok, true);
  assert.equal(available.nextRank, 3);
  state = learnSkill(command(state, 6, 2)).state;
  assert.equal(state.ranks['trap-sense'], 3);
  assert.equal(state.points, 2);
  assert.equal(learnSkill(command(state, 6, 3)).reason, 'max-rank');
  assert.equal(deriveSkillCapabilities(state, { implementations, systems }).trapDetectionRadius, 3);
});

test('catalogue text alone cannot enable skills: real implementation and every system are mandatory', () => {
  const state = createSkillState(4);
  assert.equal(isSkillReady('trap-sense'), true);
  assert.equal(isSkillReady('trap-disarming'), true);
  assert.equal(isSkillReady('trap-setting'), true);
  assert.equal(isSkillReady('swords'), true);
  assert.equal(isSkillReady('axes'), true);
  assert.equal(isSkillReady('missing', { implementations, systems }), false);
  assert.equal(isSkillReady('trap-sense', { implementations, systems: [] }), false);
  assert.equal(isSkillReady('trap-sense', { implementations, systems: ['wrong-system'] }), false);
  assert.equal(isSkillReady('trap-sense', { implementations, systems: 'trap-detection' }), false);
  assert.equal(isSkillReady('trap-sense', { implementations, systems }), true);
  assert.equal(learnSkill(command(state, 4, 0, { implementations: {} })).reason, 'not-implemented');
  assert.equal(learnSkill(command(state, 4, 0, { systems: [] })).reason, 'missing-systems');
  for (const implementation of [
    null, true, () => true,
    { ...TRAP_IMPLEMENTATION, version: 2 },
    { version: 1, modifiersByRank: [{}, {}, {}], capabilitiesByRank: [{}, {}, {}] },
    { ...TRAP_IMPLEMENTATION, modifiersByRank: [{ attack: NaN }, {}, {}] },
    { ...TRAP_IMPLEMENTATION, modifiersByRank: [{ attack: 1e9 }, {}, {}] },
    { ...TRAP_IMPLEMENTATION, modifiersByRank: [{ arbitraryStat: 1 }, {}, {}] },
    { ...TRAP_IMPLEMENTATION, capabilitiesByRank: [{ trapDetectionRadius: Infinity }, {}, {}] },
    { ...TRAP_IMPLEMENTATION, capabilitiesByRank: [{ trapDetectionTier: 1.5 }, {}, {}] },
    { ...TRAP_IMPLEMENTATION, capabilitiesByRank: [{ trapDetectionTier: 4 }, {}, {}] },
    { ...TRAP_IMPLEMENTATION, capabilitiesByRank: [{ arbitraryAbility: 1 }, {}, {}] },
    { ...TRAP_IMPLEMENTATION, apply: () => {} },
  ]) {
    const invalidRegistry = { 'trap-sense': implementation };
    assert.equal(isSkillReady('trap-sense', { implementations: invalidRegistry, systems }), false);
    assert.equal(learnSkill(command(state, 4, 0, { implementations: invalidRegistry })).reason, 'not-implemented');
  }
});

test('temporarily disabled owned skills survive cloning and have no gameplay effects', () => {
  const state = { version: 1, points: 2, ranks: { 'trap-sense': 3 } };
  const copy = cloneSkillState(state);
  assert.deepEqual(copy, state);
  assert.notEqual(copy.ranks, state.ranks);
  assert.deepEqual(deriveSkillModifiers(state), neutral);
  assert.deepEqual(deriveSkillCapabilities(state, { implementations: {} }), {
    trapDetectionRadius: 0, trapDetectionTier: 0, trapDisarmTier: 0, trapPlacementTier: 0,
    lockpickTier: 0, itemIdentificationTier: 0, swordRhythmRank: 0, swordRhythmHitInterval: 0,
    campRank: 0, campRestPercent: 0, campStashSlots: 0,
    necromancyRank: 0, cookingRank: 0, fieldMedicineRank: 0, enduranceRank: 0,
    darkvisionRank: 0, darkvisionRadiusBonus: 0,
    secretSearchRank: 0, secretSearchRadius: 0,
    stealthRank: 0, stealthVisionPercent: 0, stealthNoisePercent: 0,
    daggerRank: 0, daggerAmbushPercent: 0, daggerBackstabPercent: 0,
    bluntRank: 0, bluntArmorBreakPercent: 0, bluntArmorBreakSeconds: 0, bluntInterruptStunMs: 0,
    spearRank: 0, spearInterceptPercent: 0, spearHoldMs: 0, spearInterceptCooldownMs: 0,
    marksmanRank: 0, marksmanAimMs: 0, marksmanAimBonusPercent: 0, marksmanPierceTargets: 0,
    mobilityRank: 0, mobilityDodgeSpeedPercent: 0, mobilityDodgeMs: 0,
    swordRhythmBonusPercent: 0, axeCleaveRank: 0,
    axeCleaveTwoHandDamagePercent: 0, axeCleaveTwoHandTargets: 0,
    axeCleaveOneHandDamagePercent: 0, axeCleaveOneHandTargets: 0,
    shieldBlockChancePercent: 0, shieldBlockStunMs: 0,
    pyromancyRank: 0, cryomancyRank: 0, stormMagicRank: 0,
  });
  assert.equal(deriveSkillCapabilities(state).trapDetectionRadius, 4);
  assert.equal(deriveSkillCapabilities(state, { implementations, systems }).trapDetectionTier, 3);
  assert.equal(deriveSkillCapabilities(state, { implementations, systems: [] }).trapDetectionTier, 0);
  assert.throws(() => cloneSkillState({ ...state, points: -1 }));
  assert.throws(() => deriveSkillModifiers({ ...state, ranks: { unknown: 3 } }));
});

test('derived modifiers use the current rank once and ignore save insertion order', () => {
  const fixture = {
    'trap-sense': {
      version: 1,
      modifiersByRank: [{ attack: 1 }, { attack: 2 }, { attack: 3, moveSpeed: 0.1 }],
      capabilitiesByRank: [{}, {}, {}],
    },
    'trap-disarming': {
      version: 1,
      modifiersByRank: [{ defense: 2 }, { defense: 4 }, { defense: 6, moveSpeed: 0.2 }],
      capabilitiesByRank: [{}, {}, {}],
    },
  };
  const stateA = { version: 1, points: 1, ranks: { 'trap-sense': 3, 'trap-disarming': 3 } };
  const stateB = { ...stateA, ranks: { 'trap-disarming': 3, 'trap-sense': 3 } };
  const options = { implementations: fixture, systems: ['trap-detection', 'trap-disarming'] };
  const a = deriveSkillModifiers(stateA, options);
  assert.deepEqual(a, deriveSkillModifiers(stateB, options));
  assert.equal(a.attack, 3);
  assert.equal(a.defense, 6);
  assert.ok(Math.abs(a.moveSpeed - 0.3) < 1e-10);
  assert.equal(a.maxHp, 0);
  assert.equal(a.attackSpeed, 0);
  assert.deepEqual(deriveSkillModifiers(stateA, { ...options, systems: ['trap-detection'] }), {
    ...neutral, attack: 3, moveSpeed: 0.1,
  });
});
