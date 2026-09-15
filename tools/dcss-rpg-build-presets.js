import { createSpellState } from './dcss-rpg-spells.js';

export const DEFAULT_BUILD_PRESET_ID = 'wanderer';

// Presets only define the beginning of a run. They never restrict equipment,
// skills or spells after character creation.
export const BUILD_PRESETS = Object.freeze({
  wanderer: Object.freeze({
    id: 'wanderer',
    baseIntelligence: 4,
    knownSpellIds: Object.freeze(['ember-bolt', 'mending-light']),
    preparedSpellIds: Object.freeze(['ember-bolt', 'mending-light', null]),
  }),
  'battle-mage': Object.freeze({
    id: 'battle-mage',
    baseIntelligence: 5,
    knownSpellIds: Object.freeze(['ember-bolt']),
    preparedSpellIds: Object.freeze(['ember-bolt', null, null]),
  }),
  ranger: Object.freeze({
    id: 'ranger',
    baseIntelligence: 3,
    knownSpellIds: Object.freeze([]),
    preparedSpellIds: Object.freeze([null, null, null]),
  }),
});

export function buildPresetById(id) {
  return Object.hasOwn(BUILD_PRESETS, id) ? BUILD_PRESETS[id] : null;
}

export function createStartingMagic(presetId = DEFAULT_BUILD_PRESET_ID) {
  const preset = buildPresetById(presetId);
  if (!preset) throw new Error(`Unknown build preset: ${presetId}`);
  return Object.freeze({
    intelligence: preset.baseIntelligence,
    spells: createSpellState({
      knownSpellIds: preset.knownSpellIds,
      preparedSpellIds: preset.preparedSpellIds,
    }),
  });
}
