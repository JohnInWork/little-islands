import { createSpellState } from './dcss-rpg-spells.js';

/*
 * Заготовки задают только начало забега — интеллект и ничего больше.
 *
 * Раньше они же выдавали стартовые заклинания. Теперь заклинание — это ранг
 * школы: взял на создании «Пиромантию» — получил огненную стрелу, и никакой
 * второй список не нужен. Иван: «магия должна быть в навыках».
 */
export const DEFAULT_BUILD_PRESET_ID = 'outcast';
// Saves created before manual magic existed keep the historical wanderer kit.
export const LEGACY_BUILD_PRESET_ID = 'wanderer';

// Presets only define the beginning of a run. They never restrict equipment,
// skills or spells after character creation.
export const BUILD_PRESETS = Object.freeze({
  outcast: Object.freeze({
    id: 'outcast',
    baseIntelligence: 3,
    knownSpellIds: Object.freeze([]),
    preparedSpellIds: Object.freeze([null, null, null]),
  }),
  wanderer: Object.freeze({
    id: 'wanderer',
    baseIntelligence: 4,
    knownSpellIds: Object.freeze([]),
    preparedSpellIds: Object.freeze([null, null, null]),
  }),
  'battle-mage': Object.freeze({
    id: 'battle-mage',
    baseIntelligence: 5,
    knownSpellIds: Object.freeze([]),
    preparedSpellIds: Object.freeze([null, null, null]),
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
