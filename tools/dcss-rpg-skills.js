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
  'trap-setting': Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ trapPlacementTier: 1 }),
      Object.freeze({ trapPlacementTier: 2 }),
      Object.freeze({ trapPlacementTier: 3 }),
    ]),
  }),
  appraisal: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ itemIdentificationTier: 1 }),
      Object.freeze({ itemIdentificationTier: 2 }),
      Object.freeze({ itemIdentificationTier: 3 }),
    ]),
  }),
  swords: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ swordRhythmRank: 1, swordRhythmHitInterval: 4, swordRhythmBonusPercent: 40 }),
      Object.freeze({ swordRhythmRank: 2, swordRhythmHitInterval: 3, swordRhythmBonusPercent: 60 }),
      Object.freeze({ swordRhythmRank: 3, swordRhythmHitInterval: 2, swordRhythmBonusPercent: 80 }),
    ]),
  }),
  axes: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({
        axeCleaveRank: 1,
        axeCleaveTwoHandDamagePercent: 35,
        axeCleaveTwoHandTargets: 1,
        axeCleaveOneHandDamagePercent: 25,
        axeCleaveOneHandTargets: 1,
      }),
      Object.freeze({
        axeCleaveRank: 2,
        axeCleaveTwoHandDamagePercent: 60,
        axeCleaveTwoHandTargets: 1,
        axeCleaveOneHandDamagePercent: 40,
        axeCleaveOneHandTargets: 1,
      }),
      Object.freeze({
        axeCleaveRank: 3,
        axeCleaveTwoHandDamagePercent: 80,
        axeCleaveTwoHandTargets: 2,
        axeCleaveOneHandDamagePercent: 55,
        axeCleaveOneHandTargets: 1,
      }),
    ]),
  }),
  camping: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ campRank: 1, campRestPercent: 0, campStashSlots: 0 }),
      Object.freeze({ campRank: 2, campRestPercent: 25, campStashSlots: 0 }),
      Object.freeze({ campRank: 3, campRestPercent: 40, campStashSlots: 8 }),
    ]),
  }),
  necromancy: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ necromancyRank: 1 }),
      Object.freeze({ necromancyRank: 2 }),
      Object.freeze({ necromancyRank: 3 }),
    ]),
  }),
  cooking: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ cookingRank: 1 }),
      Object.freeze({ cookingRank: 2 }),
      Object.freeze({ cookingRank: 3 }),
    ]),
  }),
  'field-medicine': Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ fieldMedicineRank: 1 }),
      Object.freeze({ fieldMedicineRank: 2 }),
      Object.freeze({ fieldMedicineRank: 3 }),
    ]),
  }),
  endurance: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ enduranceRank: 1 }),
      Object.freeze({ enduranceRank: 2 }),
      Object.freeze({ enduranceRank: 3 }),
    ]),
  }),
  darkvision: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ darkvisionRank: 1, darkvisionRadiusBonus: 1 }),
      Object.freeze({ darkvisionRank: 2, darkvisionRadiusBonus: 2 }),
      Object.freeze({ darkvisionRank: 3, darkvisionRadiusBonus: 3 }),
    ]),
  }),
  'secret-search': Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ secretSearchRank: 1, secretSearchRadius: 2 }),
      Object.freeze({ secretSearchRank: 2, secretSearchRadius: 3 }),
      Object.freeze({ secretSearchRank: 3, secretSearchRadius: 4 }),
    ]),
  }),
  stealth: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ stealthRank: 1, stealthVisionPercent: 15, stealthNoisePercent: 25 }),
      Object.freeze({ stealthRank: 2, stealthVisionPercent: 30, stealthNoisePercent: 45 }),
      Object.freeze({ stealthRank: 3, stealthVisionPercent: 45, stealthNoisePercent: 65 }),
    ]),
  }),
  daggers: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ daggerRank: 1, daggerAmbushPercent: 60, daggerBackstabPercent: 25 }),
      Object.freeze({ daggerRank: 2, daggerAmbushPercent: 95, daggerBackstabPercent: 40 }),
      Object.freeze({ daggerRank: 3, daggerAmbushPercent: 140, daggerBackstabPercent: 60 }),
    ]),
  }),
  'blunt-weapons': Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ bluntRank: 1, bluntArmorBreakPercent: 15, bluntArmorBreakSeconds: 4, bluntInterruptStunMs: 0 }),
      Object.freeze({ bluntRank: 2, bluntArmorBreakPercent: 22, bluntArmorBreakSeconds: 5, bluntInterruptStunMs: 200 }),
      Object.freeze({ bluntRank: 3, bluntArmorBreakPercent: 30, bluntArmorBreakSeconds: 6, bluntInterruptStunMs: 500 }),
    ]),
  }),
  spears: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ spearRank: 1, spearInterceptPercent: 55, spearHoldMs: 200, spearInterceptCooldownMs: 3200 }),
      Object.freeze({ spearRank: 2, spearInterceptPercent: 75, spearHoldMs: 350, spearInterceptCooldownMs: 2600 }),
      Object.freeze({ spearRank: 3, spearInterceptPercent: 100, spearHoldMs: 500, spearInterceptCooldownMs: 2000 }),
    ]),
  }),
  marksmanship: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ marksmanRank: 1, marksmanAimMs: 1200, marksmanAimBonusPercent: 45, marksmanPierceTargets: 0 }),
      Object.freeze({ marksmanRank: 2, marksmanAimMs: 1000, marksmanAimBonusPercent: 65, marksmanPierceTargets: 1 }),
      Object.freeze({ marksmanRank: 3, marksmanAimMs: 800, marksmanAimBonusPercent: 90, marksmanPierceTargets: 2 }),
    ]),
  }),
  mobility: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ mobilityRank: 1, mobilityDodgeSpeedPercent: 20, mobilityDodgeMs: 1200 }),
      Object.freeze({ mobilityRank: 2, mobilityDodgeSpeedPercent: 30, mobilityDodgeMs: 1600 }),
      Object.freeze({ mobilityRank: 3, mobilityDodgeSpeedPercent: 45, mobilityDodgeMs: 2000 }),
    ]),
  }),
  shield: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ shieldBlockChancePercent: 15, shieldBlockStunMs: 0 }),
      Object.freeze({ shieldBlockChancePercent: 25, shieldBlockStunMs: 0 }),
      Object.freeze({ shieldBlockChancePercent: 35, shieldBlockStunMs: 600 }),
    ]),
  }),
  pyromancy: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ pyromancyRank: 1 }),
      Object.freeze({ pyromancyRank: 2 }),
      Object.freeze({ pyromancyRank: 3 }),
    ]),
  }),
  cryomancy: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ cryomancyRank: 1 }),
      Object.freeze({ cryomancyRank: 2 }),
      Object.freeze({ cryomancyRank: 3 }),
    ]),
  }),
  'storm-magic': Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ stormMagicRank: 1 }),
      Object.freeze({ stormMagicRank: 2 }),
      Object.freeze({ stormMagicRank: 3 }),
    ]),
  }),
  cleansing: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ cleansingRank: 1 }),
      Object.freeze({ cleansingRank: 2 }),
      Object.freeze({ cleansingRank: 3 }),
    ]),
  }),
  salvaging: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ salvagingRank: 1 }),
      Object.freeze({ salvagingRank: 2 }),
      Object.freeze({ salvagingRank: 3 }),
    ]),
  }),
  taming: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ tamingRank: 1 }),
      Object.freeze({ tamingRank: 2 }),
      Object.freeze({ tamingRank: 3 }),
    ]),
  }),
  training: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ trainingRank: 1 }),
      Object.freeze({ trainingRank: 2 }),
      Object.freeze({ trainingRank: 3 }),
    ]),
  }),
  'animal-care': Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ animalCareRank: 1 }),
      Object.freeze({ animalCareRank: 2 }),
      Object.freeze({ animalCareRank: 3 }),
    ]),
  }),
  'beast-bond': Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ beastBondRank: 1 }),
      Object.freeze({ beastBondRank: 2 }),
      Object.freeze({ beastBondRank: 3 }),
    ]),
  }),
  'pack-leader': Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ packLeaderRank: 1 }),
      Object.freeze({ packLeaderRank: 2 }),
      Object.freeze({ packLeaderRank: 3 }),
    ]),
  }),
  alchemy: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ alchemyRank: 1 }),
      Object.freeze({ alchemyRank: 2 }),
      Object.freeze({ alchemyRank: 3 }),
    ]),
  }),
  weaponsmithing: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ weaponsmithingRank: 1 }),
      Object.freeze({ weaponsmithingRank: 2 }),
      Object.freeze({ weaponsmithingRank: 3 }),
    ]),
  }),
  armorsmithing: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ armorsmithingRank: 1 }),
      Object.freeze({ armorsmithingRank: 2 }),
      Object.freeze({ armorsmithingRank: 3 }),
    ]),
  }),
  enchanting: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ enchantingRank: 1 }),
      Object.freeze({ enchantingRank: 2 }),
      Object.freeze({ enchantingRank: 3 }),
    ]),
  }),
  arcana: Object.freeze({
    version: 1,
    modifiersByRank: Object.freeze([Object.freeze({}), Object.freeze({}), Object.freeze({})]),
    capabilitiesByRank: Object.freeze([
      Object.freeze({ arcanaRank: 1, scrollVariantTier: 1 }),
      Object.freeze({ arcanaRank: 2, scrollVariantTier: 2 }),
      Object.freeze({ arcanaRank: 3, scrollVariantTier: 3 }),
    ]),
  }),
});
// Add a system here only when its runtime consumer is connected and verified.
export const SKILL_SYSTEMS = Object.freeze([
  'trap-detection',
  'camp-rest',
  'summoned-servants',
  'cooking-recipes',
  'food-buffs',
  'medical-treatment',
  'condition-duration-scaling',
  'darkness-vision',
  'secret-discovery',
  'stealth-detection',
  'ambush-attacks',
  'backstab-attacks',
  'armor-break',
  'attack-interruption',
  'spear-interception',
  'aimed-shots',
  'piercing-shots',
  'evasion-reward',
  'trap-disarming',
  'lockpicking',
  'trap-placement',
  'item-identification',
  'sword-rhythm',
  'weapon-cleave',
  'shield-blocking',
  'fire-spread',
  'frost-buildup',
  'chain-lightning',
  'cleansing-ritual',
  'scroll-variants',
  'component-salvage',
  'enchantment-transfer',
  'alchemy-recipes',
  'weapon-reforging',
  'armor-reforging',
  'animal-taming',
  'companion-limits',
  'pet-behaviors',
  'pet-treatment',
  'companion-shared-vision',
  'companion-upkeep',
]);

export const SKILL_MODIFIER_LIMITS = Object.freeze({
  attack: Object.freeze([-1000, 1000]),
  defense: Object.freeze([-1000, 1000]),
  maxHp: Object.freeze([-10000, 10000]),
  moveSpeed: Object.freeze([-0.8, 3]),
  attackSpeed: Object.freeze([-0.8, 3]),
  intelligence: Object.freeze([-100, 100]),
});

// Explicit numeric contracts for the first planned consumers. Extend with a
// tested mechanic, rather than allowing arbitrary keys/functions in saves.
export const SKILL_CAPABILITY_LIMITS = Object.freeze({
  trapDetectionRadius: Object.freeze([0, 32]),
  trapDetectionTier: Object.freeze([0, 3]),
  trapDisarmTier: Object.freeze([0, 3]),
  trapPlacementTier: Object.freeze([0, 3]),
  lockpickTier: Object.freeze([0, 3]),
  itemIdentificationTier: Object.freeze([0, 3]),
  swordRhythmRank: Object.freeze([0, 3]),
  swordRhythmHitInterval: Object.freeze([0, 8]),
  swordRhythmBonusPercent: Object.freeze([0, 100]),
  axeCleaveRank: Object.freeze([0, 3]),
  axeCleaveTwoHandDamagePercent: Object.freeze([0, 100]),
  axeCleaveTwoHandTargets: Object.freeze([0, 2]),
  axeCleaveOneHandDamagePercent: Object.freeze([0, 100]),
  axeCleaveOneHandTargets: Object.freeze([0, 2]),
  shieldBlockChancePercent: Object.freeze([0, 100]),
  shieldBlockStunMs: Object.freeze([0, 10_000]),
  campRank: Object.freeze([0, 3]),
  campRestPercent: Object.freeze([0, 100]),
  campStashSlots: Object.freeze([0, 12]),
  necromancyRank: Object.freeze([0, 3]),
  cookingRank: Object.freeze([0, 3]),
  fieldMedicineRank: Object.freeze([0, 3]),
  enduranceRank: Object.freeze([0, 3]),
  darkvisionRank: Object.freeze([0, 3]),
  darkvisionRadiusBonus: Object.freeze([0, 6]),
  secretSearchRank: Object.freeze([0, 3]),
  secretSearchRadius: Object.freeze([0, 8]),
  stealthRank: Object.freeze([0, 3]),
  stealthVisionPercent: Object.freeze([0, 60]),
  stealthNoisePercent: Object.freeze([0, 80]),
  daggerRank: Object.freeze([0, 3]),
  daggerAmbushPercent: Object.freeze([0, 200]),
  daggerBackstabPercent: Object.freeze([0, 200]),
  bluntRank: Object.freeze([0, 3]),
  bluntArmorBreakPercent: Object.freeze([0, 100]),
  bluntArmorBreakSeconds: Object.freeze([0, 20]),
  bluntInterruptStunMs: Object.freeze([0, 5000]),
  spearRank: Object.freeze([0, 3]),
  spearInterceptPercent: Object.freeze([0, 200]),
  spearHoldMs: Object.freeze([0, 5000]),
  spearInterceptCooldownMs: Object.freeze([0, 20_000]),
  marksmanRank: Object.freeze([0, 3]),
  marksmanAimMs: Object.freeze([0, 10_000]),
  marksmanAimBonusPercent: Object.freeze([0, 200]),
  marksmanPierceTargets: Object.freeze([0, 3]),
  mobilityRank: Object.freeze([0, 3]),
  mobilityDodgeSpeedPercent: Object.freeze([0, 100]),
  mobilityDodgeMs: Object.freeze([0, 10_000]),
  pyromancyRank: Object.freeze([0, 3]),
  cryomancyRank: Object.freeze([0, 3]),
  stormMagicRank: Object.freeze([0, 3]),
  cleansingRank: Object.freeze([0, 3]),
  salvagingRank: Object.freeze([0, 3]),
  alchemyRank: Object.freeze([0, 3]),
  weaponsmithingRank: Object.freeze([0, 3]),
  armorsmithingRank: Object.freeze([0, 3]),
  tamingRank: Object.freeze([0, 3]),
  trainingRank: Object.freeze([0, 3]),
  animalCareRank: Object.freeze([0, 3]),
  beastBondRank: Object.freeze([0, 3]),
  packLeaderRank: Object.freeze([0, 3]),
  enchantingRank: Object.freeze([0, 3]),
  arcanaRank: Object.freeze([0, 3]),
  scrollVariantTier: Object.freeze([0, 3]),
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

export function validateSkillRankAdjustments(adjustments) {
  if (!isRecord(adjustments)) return false;
  return Object.entries(adjustments).every(([skillId, amount]) => {
    const definition = skillById(skillId);
    return Boolean(
      definition
      && Number.isInteger(amount)
      && amount !== 0
      && amount >= -definition.maxRank
      && amount <= definition.maxRank
    );
  });
}

export function effectiveSkillRank(state, skillId, rankAdjustments = {}) {
  assertAndInferLevel(state);
  if (!validateSkillRankAdjustments(rankAdjustments)) {
    throw new TypeError('Invalid skill rank adjustments');
  }
  const definition = skillById(skillId);
  if (!definition) throw new Error(`Unknown skill: ${skillId}`);
  const trainedRank = state.ranks[skillId] ?? 0;
  return Math.max(0, Math.min(definition.maxRank, trainedRank + (rankAdjustments[skillId] ?? 0)));
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
  attributes = {},
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
  const intelligenceRequired = definition.attributeRequirements?.intelligence?.[rank];
  if (Number.isFinite(intelligenceRequired) && (attributes.intelligence ?? 0) < intelligenceRequired) {
    return {
      ...unavailable('intelligence-required', rank),
      requiredAttribute: 'intelligence',
      requiredValue: intelligenceRequired,
    };
  }
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
  const {
    implementations = SKILL_IMPLEMENTATIONS,
    systems = SKILL_SYSTEMS,
    rankAdjustments = {},
  } = options;
  if (!validateSkillRankAdjustments(rankAdjustments)) {
    throw new TypeError('Invalid skill rank adjustments');
  }
  const values = Object.fromEntries(Object.keys(limits).map((key) => [key, 0]));
  // Canonical order makes floating point accumulation independent of save/UI order.
  const skillIds = [...new Set([...Object.keys(state.ranks), ...Object.keys(rankAdjustments)])].sort();
  for (const id of skillIds) {
    const definition = skillById(id);
    const implementation = implementationFor(definition, implementations);
    if (!implementation || !hasRequiredSystems(definition, systems)) continue;
    const rank = effectiveSkillRank(state, id, rankAdjustments);
    if (rank === 0) continue;
    // Each row is the whole effect at that rank, not an increment over lower ranks.
    for (const [key, value] of Object.entries(implementation[field][rank - 1])) {
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
