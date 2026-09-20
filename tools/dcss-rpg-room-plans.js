import { FLOORS_PER_CHAPTER, FLOORS_PER_MERCHANT } from './dcss-rpg-run.js';
import { isCityDepth } from './dcss-rpg-city.js';
import { TAVERN_KEEPER_ID, TAVERN_MIN_ROOM } from './dcss-rpg-tavern.js';

export { FLOORS_PER_CHAPTER };

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const defineDungeonTheme = (definition) => deepFreeze({
  ...definition,
  chestSkinIds: [...definition.chestSkinIds],
  roomArchetypeIds: [...definition.roomArchetypeIds],
});

/**
 * One dungeon theme owns every visual/content family for a chapter. Rendering
 * reads surfaceSetId; room planning reads roomArchetypeIds and chestSkinIds.
 * Future monster, merchant and loot pools can be added here without teaching
 * the renderer about gameplay rules.
 */
export const DUNGEON_THEME_CATALOG = Object.freeze([
  defineDungeonTheme({
    id: 'ashen-vault',
    surfaceSetId: 'ashen-vault',
    branch: 'deep',
    atmosphereId: 'slate',
    chestSkinIds: ['wooden', 'pirate'],
    roomArchetypeIds: [
      'fallen-hall',
      'forgotten-crypt',
      'ashen-shrine',
      'drowned-chapel',
      'fungal-hollow',
      'merchant-alcove',
    ],
  }),
  defineDungeonTheme({
    id: 'buried-sanctum',
    surfaceSetId: 'buried-sanctum',
    branch: 'deep',
    atmosphereId: 'ochre',
    chestSkinIds: ['pharaoh'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'ashen-shrine', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'frozen-depths',
    surfaceSetId: 'frozen-depths',
    branch: 'deep',
    atmosphereId: 'ice',
    chestSkinIds: ['jade-ruby'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'drowned-chapel', 'fungal-hollow', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'infernal-core',
    surfaceSetId: 'infernal-core',
    branch: 'hell',
    atmosphereId: 'ember',
    chestSkinIds: ['jade-ruby', 'pirate'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'ashen-shrine', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'catacomb-tiers',
    surfaceSetId: 'catacomb-tiers',
    branch: 'crypt',
    atmosphereId: 'bone',
    chestSkinIds: ['wooden'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'ashen-shrine', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'crystal-hollow',
    surfaceSetId: 'crystal-hollow',
    branch: 'deep',
    atmosphereId: 'prism',
    chestSkinIds: ['jade-ruby'],
    roomArchetypeIds: ['fallen-hall', 'drowned-chapel', 'fungal-hollow', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'drowned-palace',
    surfaceSetId: 'drowned-palace',
    branch: 'deep',
    atmosphereId: 'verdigris',
    chestSkinIds: ['jade-ruby', 'pirate'],
    roomArchetypeIds: ['fallen-hall', 'drowned-chapel', 'forgotten-crypt', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'bone-fields',
    surfaceSetId: 'bone-fields',
    branch: 'crypt',
    atmosphereId: 'mold',
    chestSkinIds: ['wooden', 'pharaoh'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'fungal-hollow', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'flesh-deep',
    surfaceSetId: 'flesh-deep',
    branch: 'hell',
    atmosphereId: 'viscera',
    chestSkinIds: ['pirate'],
    roomArchetypeIds: ['fallen-hall', 'ashen-shrine', 'fungal-hollow', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'overgrown-ruin',
    surfaceSetId: 'overgrown-ruin',
    branch: 'deep',
    atmosphereId: 'moss',
    chestSkinIds: ['wooden'],
    roomArchetypeIds: ['fallen-hall', 'fungal-hollow', 'drowned-chapel', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'cobalt-mine',
    surfaceSetId: 'cobalt-mine',
    branch: 'deep',
    atmosphereId: 'cobalt',
    chestSkinIds: ['wooden', 'jade-ruby'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'ashen-shrine', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'magma-shelf',
    surfaceSetId: 'magma-shelf',
    branch: 'hell',
    atmosphereId: 'magma',
    chestSkinIds: ['jade-ruby', 'pirate'],
    roomArchetypeIds: ['fallen-hall', 'ashen-shrine', 'forgotten-crypt', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'beast-lair',
    surfaceSetId: 'beast-lair',
    branch: 'deep',
    atmosphereId: 'loam',
    chestSkinIds: ['wooden'],
    roomArchetypeIds: ['fallen-hall', 'fungal-hollow', 'drowned-chapel', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'orc-stronghold',
    surfaceSetId: 'orc-stronghold',
    branch: 'deep',
    atmosphereId: 'iron',
    chestSkinIds: ['wooden', 'pirate'],
    roomArchetypeIds: ['fallen-hall', 'ashen-shrine', 'forgotten-crypt', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'funeral-hall',
    surfaceSetId: 'funeral-hall',
    branch: 'crypt',
    atmosphereId: 'sepia',
    chestSkinIds: ['pharaoh'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'ashen-shrine', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'deep-mine',
    surfaceSetId: 'deep-mine',
    branch: 'deep',
    atmosphereId: 'coal',
    chestSkinIds: ['wooden'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'fungal-hollow', 'merchant-alcove'],
  }),
  // Beyond the gate. The same dungeon in every way that matters — floors,
  // chapters, guardians, promises — under an open sky.
  defineDungeonTheme({
    id: 'autumn-wood',
    surfaceSetId: 'autumn-wood',
    branch: 'surface',
    atmosphereId: 'autumn',
    chestSkinIds: ['wooden'],
    roomArchetypeIds: ['fallen-hall', 'fungal-hollow', 'drowned-chapel', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'mire',
    surfaceSetId: 'mire',
    branch: 'surface',
    atmosphereId: 'bog',
    chestSkinIds: ['pirate'],
    roomArchetypeIds: ['fallen-hall', 'drowned-chapel', 'fungal-hollow', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'flower-meadow',
    surfaceSetId: 'flower-meadow',
    branch: 'surface',
    atmosphereId: 'meadow',
    chestSkinIds: ['wooden', 'jade-ruby'],
    roomArchetypeIds: ['fallen-hall', 'fungal-hollow', 'ashen-shrine', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'old-graveyard',
    surfaceSetId: 'old-graveyard',
    branch: 'crypt',
    atmosphereId: 'dusk',
    chestSkinIds: ['pharaoh'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'ashen-shrine', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'abandoned-hamlet',
    surfaceSetId: 'abandoned-hamlet',
    branch: 'surface',
    atmosphereId: 'hamlet',
    chestSkinIds: ['wooden', 'pirate'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'fungal-hollow', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'sunburnt-steppe',
    surfaceSetId: 'sunburnt-steppe',
    branch: 'surface',
    atmosphereId: 'scorch',
    chestSkinIds: ['pirate'],
    roomArchetypeIds: ['fallen-hall', 'fungal-hollow', 'drowned-chapel', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'wild-heath',
    surfaceSetId: 'wild-heath',
    branch: 'surface',
    atmosphereId: 'heath',
    chestSkinIds: ['wooden'],
    roomArchetypeIds: ['fallen-hall', 'fungal-hollow', 'drowned-chapel', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'green-hollow',
    surfaceSetId: 'green-hollow',
    branch: 'surface',
    atmosphereId: 'verdant',
    chestSkinIds: ['jade-ruby', 'wooden'],
    roomArchetypeIds: ['fallen-hall', 'fungal-hollow', 'drowned-chapel', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'snowfield',
    surfaceSetId: 'snowfield',
    branch: 'surface',
    atmosphereId: 'frost',
    chestSkinIds: ['jade-ruby'],
    roomArchetypeIds: ['fallen-hall', 'forgotten-crypt', 'drowned-chapel', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'thornwood',
    surfaceSetId: 'thornwood',
    branch: 'surface',
    atmosphereId: 'bramble',
    chestSkinIds: ['wooden'],
    roomArchetypeIds: ['fallen-hall', 'fungal-hollow', 'drowned-chapel', 'merchant-alcove'],
  }),
  // ── Подвалы ─────────────────────────────────────────────────────────────
  // Рукотворная дорога: всё это кто-то построил и бросил.
  defineDungeonTheme({
    id: 'sunken-labyrinth',
    surfaceSetId: 'sunken-labyrinth',
    branch: 'vaults',
    atmosphereId: 'slate',
    chestSkinIds: ['wooden', 'pirate'],
    roomArchetypeIds: [
      'fallen-hall',
      'forgotten-crypt',
      'drowned-chapel',
      'merchant-alcove',
    ],
  }),
  defineDungeonTheme({
    id: 'iron-workshop',
    surfaceSetId: 'iron-workshop',
    branch: 'vaults',
    atmosphereId: 'iron',
    chestSkinIds: ['wooden', 'jade-ruby'],
    roomArchetypeIds: [
      'fallen-hall',
      'ashen-shrine',
      'forgotten-crypt',
      'merchant-alcove',
    ],
  }),
  defineDungeonTheme({
    id: 'menagerie',
    surfaceSetId: 'menagerie',
    branch: 'vaults',
    atmosphereId: 'viscera',
    chestSkinIds: ['wooden', 'pirate'],
    roomArchetypeIds: [
      'fallen-hall',
      'fungal-hollow',
      'forgotten-crypt',
      'merchant-alcove',
    ],
  }),
  defineDungeonTheme({
    id: 'marble-sanctum',
    surfaceSetId: 'marble-sanctum',
    branch: 'crypt',
    atmosphereId: 'bone',
    chestSkinIds: ['jade-ruby', 'pharaoh'],
    roomArchetypeIds: [
      'fallen-hall',
      'ashen-shrine',
      'crystal-grotto',
      'merchant-alcove',
    ],
  }),
  defineDungeonTheme({
    id: 'emerald-gallery',
    surfaceSetId: 'emerald-gallery',
    branch: 'vaults',
    atmosphereId: 'verdigris',
    chestSkinIds: ['jade-ruby', 'pharaoh'],
    roomArchetypeIds: [
      'crystal-grotto',
      'fallen-hall',
      'ashen-shrine',
      'merchant-alcove',
    ],
  }),
  defineDungeonTheme({
    id: 'hive-vault',
    surfaceSetId: 'hive-vault',
    branch: 'vaults',
    atmosphereId: 'ochre',
    chestSkinIds: ['wooden', 'jade-ruby'],
    roomArchetypeIds: [
      'fungal-hollow',
      'fallen-hall',
      'crystal-grotto',
      'merchant-alcove',
    ],
  }),
  defineDungeonTheme({
    id: 'sand-archive',
    surfaceSetId: 'sand-archive',
    branch: 'crypt',
    atmosphereId: 'sepia',
    chestSkinIds: ['pharaoh', 'wooden'],
    roomArchetypeIds: [
      'forgotten-crypt',
      'fallen-hall',
      'ashen-shrine',
      'merchant-alcove',
    ],
  }),
  defineDungeonTheme({
    id: 'gehenna-floor',
    surfaceSetId: 'gehenna-floor',
    branch: 'hell',
    atmosphereId: 'ember',
    chestSkinIds: ['pharaoh', 'pirate'],
    roomArchetypeIds: ['ashen-shrine', 'fallen-hall', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'acid-pits',
    surfaceSetId: 'acid-pits',
    branch: 'hell',
    atmosphereId: 'verdant',
    chestSkinIds: ['jade-ruby', 'pirate'],
    roomArchetypeIds: ['fungal-hollow', 'drowned-chapel', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'cinder-waste',
    surfaceSetId: 'cinder-waste',
    branch: 'hell',
    atmosphereId: 'scorch',
    chestSkinIds: ['pharaoh', 'wooden'],
    roomArchetypeIds: ['ashen-shrine', 'forgotten-crypt', 'merchant-alcove'],
  }),
  defineDungeonTheme({
    id: 'zot-cells',
    surfaceSetId: 'zot-cells',
    branch: 'vaults',
    atmosphereId: 'cobalt',
    chestSkinIds: ['jade-ruby', 'pirate'],
    roomArchetypeIds: [
      'fallen-hall',
      'forgotten-crypt',
      'crystal-grotto',
      'merchant-alcove',
    ],
  }),
]);

/**
 * `environmentThemeIds` holds only the places where a room looks different from
 * its usual self; `defaultEnvironmentThemeId` is that usual self. Before this,
 * an unlisted theme silently borrowed ashen-vault's look — which meant a new
 * place looked finished while quietly wearing the first one's clothes, and
 * adding a biome meant editing fourteen maps.
 */
export function environmentThemeFor(archetype, themeId) {
  if (!archetype) return null;
  return archetype.environmentThemeIds[themeId] ?? archetype.defaultEnvironmentThemeId;
}

const defineRoomArchetype = (definition) => deepFreeze({
  implemented: true,
  minDepth: 1,
  maxDepth: Number.MAX_SAFE_INTEGER,
  weight: 0,
  requiresDoor: false,
  dangerMultiplier: 1,
  rewardMultiplier: 1,
  content: {},
  variants: ['default'],
  ...definition,
  environmentThemeIds: { ...definition.environmentThemeIds },
  content: { ...(definition.content ?? {}) },
  variants: [...(definition.variants ?? ['default'])],
});

const COMMON_ENVIRONMENT = Object.freeze({
  'ashen-vault': 'fallen-hall',
  'buried-sanctum': 'fallen-hall',
  'frozen-depths': 'drowned-chapel',
  'infernal-core': 'ashen-shrine',
  'autumn-wood': 'open-wood',
  'flower-meadow': 'open-wood',
  'thornwood': 'open-wood',
  'snowfield': 'open-wood',
  'mire': 'mangrove-shallows',
  'old-graveyard': 'boneyard',
  'abandoned-hamlet': 'ruined-yard',
  'sunburnt-steppe': 'open-wood',
  'wild-heath': 'open-wood',
  'green-hollow': 'open-wood',
});

/**
 * An archetype describes why a room exists. It never stores PNG paths. The
 * current dungeon theme resolves its compatible environment and chest family.
 * Service rooms use the same data contract as encounters and discoveries.
 */
export const ROOM_ARCHETYPE_CATALOG = Object.freeze([
  defineRoomArchetype({
    id: 'wayfarer-refuge',
    defaultEnvironmentThemeId: 'wayfarer-refuge',
    role: 'start',
    environmentThemeIds: {
      'ashen-vault': 'wayfarer-refuge',
      'buried-sanctum': 'wayfarer-refuge',
      'frozen-depths': 'wayfarer-refuge',
      'infernal-core': 'wayfarer-refuge',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    dangerMultiplier: 0,
    rewardMultiplier: 0,
  }),
  defineRoomArchetype({
    id: 'descent-chamber',
    defaultEnvironmentThemeId: 'fallen-hall',
    role: 'exit',
    environmentThemeIds: COMMON_ENVIRONMENT,
    dangerMultiplier: 1.2,
    rewardMultiplier: 0.5,
  }),
  defineRoomArchetype({
    id: 'treasure-vault',
    defaultEnvironmentThemeId: 'fallen-hall',
    role: 'treasure',
    requiresDoor: true,
    environmentThemeIds: {
      'ashen-vault': 'fallen-hall',
      'buried-sanctum': 'forgotten-crypt',
      'frozen-depths': 'drowned-chapel',
      'infernal-core': 'ashen-shrine',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    content: { findId: 'sealed-cache' },
    variants: ['unguarded', 'locked', 'ambush', 'trapped', 'cursed', 'mimic'],
    dangerMultiplier: 1.25,
    rewardMultiplier: 1.65,
  }),
  defineRoomArchetype({
    id: 'forgotten-crypt',
    defaultEnvironmentThemeId: 'forgotten-crypt',
    role: 'discovery',
    weight: 4,
    environmentThemeIds: {
      'ashen-vault': 'forgotten-crypt',
      'buried-sanctum': 'forgotten-crypt',
      'frozen-depths': 'forgotten-crypt',
      'infernal-core': 'forgotten-crypt',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    content: { findId: 'forgotten-grave' },
    variants: ['sealed', 'disturbed', 'royal'],
    dangerMultiplier: 1.1,
    rewardMultiplier: 1.2,
  }),
  defineRoomArchetype({
    id: 'crystal-grotto',
    defaultEnvironmentThemeId: 'drowned-chapel',
    role: 'discovery',
    weight: 3,
    environmentThemeIds: {
      'ashen-vault': 'drowned-chapel',
      'buried-sanctum': 'ashen-shrine',
      'frozen-depths': 'drowned-chapel',
      'infernal-core': 'ashen-shrine',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    content: { findId: 'crystal-vein' },
    variants: ['quiet', 'resonant'],
    dangerMultiplier: 0.8,
    rewardMultiplier: 1.1,
  }),
  defineRoomArchetype({
    id: 'altar-niche',
    defaultEnvironmentThemeId: 'altar-niche',
    role: 'discovery',
    weight: 0,
    environmentThemeIds: {
      'ashen-vault': 'altar-niche',
      'buried-sanctum': 'altar-niche',
      'frozen-depths': 'altar-niche',
      'infernal-core': 'altar-niche',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    content: { findId: 'ancient-altar' },
    variants: ['candlelit', 'silent'],
    dangerMultiplier: 0.9,
    rewardMultiplier: 1.3,
  }),
  defineRoomArchetype({
    id: 'fountain-court',
    defaultEnvironmentThemeId: 'fountain-court',
    role: 'discovery',
    environmentThemeIds: {
      'ashen-vault': 'fountain-court',
      'buried-sanctum': 'fountain-court',
      'frozen-depths': 'fountain-court',
      'infernal-core': 'fountain-court',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    content: { findId: 'sunken-fountain' },
    variants: ['still', 'overflowing'],
    dangerMultiplier: 0.9,
    rewardMultiplier: 1.25,
  }),
  defineRoomArchetype({
    id: 'rune-vault',
    defaultEnvironmentThemeId: 'rune-vault',
    role: 'discovery',
    environmentThemeIds: {
      'ashen-vault': 'rune-vault',
      'buried-sanctum': 'rune-vault',
      'frozen-depths': 'rune-vault',
      'infernal-core': 'rune-vault',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    content: { findId: 'warded-rune' },
    variants: ['sealed', 'cracked'],
    dangerMultiplier: 1,
    rewardMultiplier: 1.3,
  }),
  // ── A room apiece for the five branch events ────────────────────────────
  // These carry no `environmentThemeIds` map on purpose. Every other archetype
  // needs one because it can turn up on any road and must dress itself for
  // fourteen different places; each of these belongs to exactly one road, and
  // on that road there is only one way its room should look.
  defineRoomArchetype({
    id: 'shrine-glade',
    defaultEnvironmentThemeId: 'shrine-glade',
    role: 'discovery',
    weight: 0,
    content: { findId: 'wild-shrine' },
    variants: ['flowering', 'overgrown'],
    dangerMultiplier: 0.8,
    rewardMultiplier: 1.2,
  }),
  defineRoomArchetype({
    id: 'idol-cut',
    defaultEnvironmentThemeId: 'idol-cut',
    role: 'discovery',
    weight: 0,
    content: { findId: 'strangers-idol' },
    variants: ['propped', 'leaning'],
    dangerMultiplier: 0.9,
    rewardMultiplier: 1.25,
  }),
  defineRoomArchetype({
    id: 'treasury-alcove',
    defaultEnvironmentThemeId: 'treasury-alcove',
    role: 'discovery',
    weight: 0,
    content: { findId: 'golden-idol' },
    variants: ['guarded', 'ransacked'],
    dangerMultiplier: 1.1,
    rewardMultiplier: 1.45,
  }),
  defineRoomArchetype({
    id: 'named-plot',
    defaultEnvironmentThemeId: 'named-plot',
    role: 'discovery',
    weight: 0,
    content: { findId: 'named-grave' },
    variants: ['tended', 'sunken'],
    dangerMultiplier: 1.1,
    rewardMultiplier: 1.35,
  }),
  defineRoomArchetype({
    id: 'speaking-wall',
    defaultEnvironmentThemeId: 'speaking-wall',
    role: 'discovery',
    weight: 0,
    content: { findId: 'stone-face' },
    variants: ['watching', 'silent'],
    dangerMultiplier: 1.3,
    rewardMultiplier: 1.4,
  }),
  defineRoomArchetype({
    id: 'ambush-chamber',
    defaultEnvironmentThemeId: 'fallen-hall',
    role: 'encounter',
    environmentThemeIds: COMMON_ENVIRONMENT,
    content: { surpriseType: 'horde' },
    variants: ['horde', 'mixed'],
    dangerMultiplier: 1.5,
    rewardMultiplier: 1.1,
  }),
  defineRoomArchetype({
    id: 'fallen-hall',
    defaultEnvironmentThemeId: 'fallen-hall',
    role: 'ambient',
    weight: 5,
    environmentThemeIds: {
      'ashen-vault': 'fallen-hall',
      'buried-sanctum': 'fallen-hall',
      'frozen-depths': 'fallen-hall',
      'infernal-core': 'fallen-hall',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    variants: ['pillars', 'ruins', 'empty'],
  }),
  defineRoomArchetype({
    id: 'ashen-shrine',
    defaultEnvironmentThemeId: 'ashen-shrine',
    role: 'ambient',
    weight: 3,
    environmentThemeIds: {
      'ashen-vault': 'ashen-shrine',
      'buried-sanctum': 'ashen-shrine',
      'frozen-depths': 'drowned-chapel',
      'infernal-core': 'ashen-shrine',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    variants: ['altar', 'braziers', 'broken-idol'],
  }),
  defineRoomArchetype({
    id: 'drowned-chapel',
    defaultEnvironmentThemeId: 'drowned-chapel',
    role: 'ambient',
    minDepth: 2,
    weight: 2,
    environmentThemeIds: {
      'ashen-vault': 'drowned-chapel',
      'buried-sanctum': 'forgotten-crypt',
      'frozen-depths': 'drowned-chapel',
      'infernal-core': 'ashen-shrine',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    variants: ['fountain', 'flooded', 'silent'],
  }),
  defineRoomArchetype({
    id: 'fungal-hollow',
    defaultEnvironmentThemeId: 'fungal-hollow',
    role: 'ambient',
    weight: 3,
    environmentThemeIds: {
      'ashen-vault': 'fungal-hollow',
      'buried-sanctum': 'forgotten-crypt',
      'frozen-depths': 'fungal-hollow',
      'infernal-core': 'ashen-shrine',
      'autumn-wood': 'open-wood',
      'flower-meadow': 'open-wood',
      'thornwood': 'open-wood',
      'snowfield': 'open-wood',
      'mire': 'mangrove-shallows',
      'old-graveyard': 'boneyard',
      'abandoned-hamlet': 'ruined-yard',
      'sunburnt-steppe': 'open-wood',
      'wild-heath': 'open-wood',
      'green-hollow': 'open-wood',
    },
    variants: ['spores', 'overgrown', 'deathcaps'],
  }),
  defineRoomArchetype({
    id: 'merchant-alcove',
    defaultEnvironmentThemeId: 'fallen-hall',
    role: 'service',
    implemented: true,
    minDepth: 2,
    weight: 0,
    requiresDoor: false,
    environmentThemeIds: COMMON_ENVIRONMENT,
    content: { actorId: 'merchant', interactionId: 'trade' },
    variants: ['armourer', 'relic-dealer', 'provisioner'],
    dangerMultiplier: 0,
    rewardMultiplier: 0,
  }),
  defineRoomArchetype({
    /**
     * A wayside inn. It belongs to the road **out** and nowhere else: a lit room
     * with beer in it and swords for hire is a thing you find on a road through
     * woods, moor and an abandoned hamlet, and is not a thing three hundred
     * metres down in a burning core. The surface road was also the thinnest of
     * the three — four places that differed by tiles — and this is the first
     * thing that is only its own.
     *
     * It is furnished by `dcss-rpg-tavern.js`, exactly like the city's, so the
     * two rooms cannot drift apart.
     */
    id: 'wayside-inn',
    defaultEnvironmentThemeId: 'tavern-hall',
    role: 'service',
    minDepth: 2,
    weight: 0,
    requiresDoor: false,
    environmentThemeIds: Object.fromEntries(
      Object.keys(COMMON_ENVIRONMENT).map((themeId) => [themeId, 'tavern-hall']),
    ),
    content: { actorId: TAVERN_KEEPER_ID, interactionId: 'recruiter' },
    dangerMultiplier: 0,
    rewardMultiplier: 0,
  }),
]);

/**
 * How often the road out passes an inn. A promise, not a dice roll: a player who
 * knows one is coming can decide to walk past this fire and rest at the next.
 * Offset from the merchant's own rhythm so a floor rarely has to host both.
 */
export const FLOORS_PER_INN = 4;

/**
 * How much of the ring around a room has to be rock before it counts as a
 * building. Not all of it: an inn has a door, and a hut on the moor has two.
 */
const INN_ENCLOSURE = 0.75;

/**
 * The city is not a chapter, so its theme stays out of the rotation and is
 * reached only through the depth it belongs to. Its room archetypes are empty:
 * a city plans its own blocks and never asks the dungeon planner for rooms.
 */
export const CITY_DUNGEON_THEME = defineDungeonTheme({
  id: 'gate-town',
  surfaceSetId: 'gate-town',
  atmosphereId: 'town',
  chestSkinIds: ['wooden'],
  roomArchetypeIds: [],
});

const DUNGEON_THEMES_BY_ID = new Map(
  [...DUNGEON_THEME_CATALOG, CITY_DUNGEON_THEME].map((theme) => [theme.id, theme]),
);
const ROOM_ARCHETYPES_BY_ID = new Map(
  ROOM_ARCHETYPE_CATALOG.map((archetype) => [archetype.id, archetype]),
);
// A find declares its room through `content.findId`; the planner never checks
// find IDs by hand, so a new landmark only needs its archetype entry.
const ARCHETYPE_ID_BY_FIND_ID = new Map(
  ROOM_ARCHETYPE_CATALOG
    .filter((archetype) => archetype.implemented && typeof archetype.content.findId === 'string')
    .map((archetype) => [archetype.content.findId, archetype.id]),
);
// Rooms the merchant may reclaim when a floor has no free alcove, in order of
// preference. The altar yields before the older discoveries.
const MERCHANT_FALLBACK_ARCHETYPE_IDS = Object.freeze([
  'altar-niche',
  'fountain-court',
  'rune-vault',
  'forgotten-crypt',
  'crystal-grotto',
]);

export function roomArchetypeIdForFind(findId) {
  return ARCHETYPE_ID_BY_FIND_ID.get(findId) ?? null;
}

export function dungeonThemeById(id) {
  return DUNGEON_THEMES_BY_ID.get(id) ?? null;
}

export function roomArchetypeById(id) {
  return ROOM_ARCHETYPES_BY_ID.get(id) ?? null;
}

function themeOrderHash(seed, index) {
  let value = ((seed >>> 0) ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

/**
 * The order the run meets its places in. It used to be no order at all: floors
 * 1-3 were always the ashen vault, 4-6 always the buried sanctum, and the
 * infernal core — a finished theme shipped with the game — sat at chapter index
 * three, which nine floors never reach. Nobody ever saw it.
 *
 * Now the run seed shuffles the catalogue, so a chapter still keeps its
 * identity for three floors but which place that is changes between runs, and
 * with four themes across three chapters one of them is always left out.
 */
/**
 * The descent always begins the same way: plain grey caves, then the sandy
 * ones, and only after that does the shuffle take over.
 *
 * Shuffling everything made the first screen of a run a lottery — one run opened
 * in a blue cobalt mine, the next in a frozen deep — and a player has no footing
 * to judge any of it against. The first two places are the game teaching you
 * what ordinary looks like; everything past them is the game surprising you.
 */
export const OPENING_THEME_IDS = Object.freeze(['ashen-vault', 'buried-sanctum']);

export function chapterThemeOrder(seed, branch = 'deep') {
  if (!Number.isInteger(seed) || seed < 0) throw new TypeError('Theme order requires a run seed');
  // A branch shuffles only its own places: the caves never open onto a meadow.
  const places = DUNGEON_THEME_CATALOG.filter((theme) => theme.branch === branch);
  if (places.length === 0) throw new TypeError(`No places for branch ${branch}`);
  // Only the descent has a fixed opening; the roads out and the vaults are
  // places you choose to go, and they owe the player no introduction.
  const opening = branch === 'deep'
    ? OPENING_THEME_IDS.map((id) => places.find((theme) => theme.id === id)).filter(Boolean)
    : [];
  const order = places.filter((theme) => !opening.includes(theme));
  // Fisher-Yates from the run seed: deterministic, and adding a theme later
  // reshuffles nothing that came before it in the list.
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = themeOrderHash(seed, index) % (index + 1);
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return Object.freeze([...opening, ...order]);
}

/**
 * Which place a floor is. Takes the RUN seed, never the floor seed: the floor
 * seed is `mixSeed(seed, depth)` and cannot be turned back into the run.
 */
export function dungeonThemeFor(seed, depth, branch = 'deep') {
  if (isCityDepth(depth)) return CITY_DUNGEON_THEME;
  if (!Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Dungeon theme depth must be a positive integer');
  }
  const order = chapterThemeOrder(seed, branch);
  const chapterIndex = Math.floor((depth - 1) / FLOORS_PER_CHAPTER);
  return order[chapterIndex % order.length];
}



function stableHash(seed, depth, roomIndex, salt = 0) {
  let value = (seed ^ Math.imul(depth + 1, 0x9e3779b1)) >>> 0;
  value ^= Math.imul(roomIndex + 1, 0x85ebca6b);
  value ^= salt >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

function roomContains(room, point) {
  return Boolean(
    point
    && point.x >= room.x
    && point.x < room.x + room.width
    && point.y >= room.y
    && point.y < room.y + room.height
  );
}

function roomIndexForPoint(rooms, point) {
  return rooms.findIndex((room) => roomContains(room, point));
}

function weightedArchetype(theme, depth, seed, roomIndex) {
  const eligible = theme.roomArchetypeIds
    .map(roomArchetypeById)
    .filter((archetype) =>
      archetype?.implemented
      && archetype.weight > 0
      && depth >= archetype.minDepth
      && depth <= archetype.maxDepth,
    );
  if (eligible.length === 0) throw new Error(`Dungeon theme ${theme.id} has no room archetypes`);
  const total = eligible.reduce((sum, archetype) => sum + archetype.weight, 0);
  let roll = (stableHash(seed, depth, roomIndex, 0x41524348) / 0x100000000) * total;
  for (const archetype of eligible) {
    roll -= archetype.weight;
    if (roll < 0) return archetype;
  }
  return eligible.at(-1);
}

function semanticArchetypes(level) {
  const assigned = new Map([[0, 'wayfarer-refuge']]);
  const exitRoomIndex = roomIndexForPoint(level.rooms, level.exit);
  if (exitRoomIndex > 0) assigned.set(exitRoomIndex, 'descent-chamber');

  for (const find of level.finds ?? []) {
    if (!Number.isInteger(find.roomIndex) || assigned.has(find.roomIndex)) continue;
    const archetypeId = roomArchetypeIdForFind(find.id);
    if (archetypeId) assigned.set(find.roomIndex, archetypeId);
  }

  for (const surprise of level.surprises ?? []) {
    if (!Number.isInteger(surprise.roomIndex) || assigned.has(surprise.roomIndex)) continue;
    assigned.set(
      surprise.roomIndex,
      ['treasure', 'mixed'].includes(surprise.type) ? 'treasure-vault' : 'ambush-chamber',
    );
  }

  // One service stop every few floors. It prefers a real door room and then the
  // calmest free alcove, so a rare map topology never loses its merchant.
  if (level.depth % FLOORS_PER_MERCHANT === 0) {
    const fallbackRank = (roomIndex) => (
      assigned.has(roomIndex)
        ? 1 + MERCHANT_FALLBACK_ARCHETYPE_IDS.indexOf(assigned.get(roomIndex))
        : 0
    );
    const candidates = level.rooms
      .map((_room, roomIndex) => roomIndex)
      .filter((roomIndex) => (
        roomIndex > 0
        && !roomHasWater(level, roomIndex)
        && (
          !assigned.has(roomIndex)
          || MERCHANT_FALLBACK_ARCHETYPE_IDS.includes(assigned.get(roomIndex))
        )
      ))
      .sort((a, b) => (
        fallbackRank(a) - fallbackRank(b)
        ||
        Number(!(level.doors ?? []).some((door) => door.roomIndex === a))
          - Number(!(level.doors ?? []).some((door) => door.roomIndex === b))
        ||
        stableHash(level.seed, level.depth, a, 0x4d455243)
          - stableHash(level.seed, level.depth, b, 0x4d455243)
      ));
    if (candidates.length > 0) assigned.set(candidates[0], 'merchant-alcove');
  }

  // And the inn, on the road out only.
  if (
    level.depth % FLOORS_PER_INN === 0
    && dungeonThemeById(level.themeId)?.branch === 'surface'
  ) {
    const room = level.rooms
      .map((_room, roomIndex) => roomIndex)
      .filter((roomIndex) => (
        roomIndex > 0
        && !assigned.has(roomIndex)
        && !roomHasWater(level, roomIndex)
        // A common room needs a common room's worth of floor.
        && level.rooms[roomIndex].width >= TAVERN_MIN_ROOM.w + 1
        && level.rooms[roomIndex].height >= TAVERN_MIN_ROOM.h + 1
        && roomIsEnclosed(level, level.rooms[roomIndex])
      ))
      .sort((a, b) => (
        stableHash(level.seed, level.depth, a, 0x494e4e21)
          - stableHash(level.seed, level.depth, b, 0x494e4e21)
      ))[0];
    if (room !== undefined) assigned.set(room, 'wayside-inn');
  }
  return assigned;
}

/**
 * Whether a room is a building rather than a clearing. Out in the open a room
 * is a patch of ground with grass on every side, and furniture standing in a
 * field is not an inn — it is a table somebody left outside. An inn needs walls
 * around it and a way in, so most of the ring outside the room has to be rock.
 */
function roomIsEnclosed(level, room) {
  if (!Array.isArray(level.grid) || !room) return false;
  let solid = 0;
  let total = 0;
  const open = (x, y) => level.grid[y]?.[x] === '.' || level.grid[y]?.[x] === '~' || level.grid[y]?.[x] === 'D';
  for (let x = room.x - 1; x <= room.x + room.width; x += 1) {
    for (const y of [room.y - 1, room.y + room.height]) {
      total += 1;
      if (!open(x, y)) solid += 1;
    }
  }
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (const x of [room.x - 1, room.x + room.width]) {
      total += 1;
      if (!open(x, y)) solid += 1;
    }
  }
  return total > 0 && solid / total >= INN_ENCLOSURE;
}

/** A merchant never sets up shop in a flooded room. */
function roomHasWater(level, roomIndex) {
  const room = level.rooms?.[roomIndex];
  if (!room || !Array.isArray(level.grid)) return false;
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      if (level.grid[y]?.[x] === '~') return true;
    }
  }
  return false;
}

function roundedBudget(value) {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function semanticVariant(level, roomIndex, archetype) {
  const chest = (level.finds ?? []).find(
    (find) => find.roomIndex === roomIndex && find.id === 'sealed-cache',
  );
  if (chest && archetype.id === 'treasure-vault') {
    return chest.cacheVariant === 'unlocked' ? 'unguarded' : chest.cacheVariant;
  }
  const surprise = (level.surprises ?? []).find((entry) => entry.roomIndex === roomIndex);
  if (surprise && archetype.id === 'treasure-vault') {
    return surprise.type === 'mixed' ? 'ambush' : 'unguarded';
  }
  if (surprise && archetype.id === 'ambush-chamber') return surprise.type;
  return null;
}

export function createDungeonRoomPlans(level) {
  if (
    !level
    || !Number.isInteger(level.seed)
    || !Number.isInteger(level.depth)
    || level.depth < 1
    || !Array.isArray(level.rooms)
    || level.rooms.length === 0
    || !level.spawn
    || !level.exit
  ) throw new TypeError('Room plans require a generated dungeon');

  const theme = dungeonThemeById(level.themeId);
  const semantic = semanticArchetypes(level);
  const plans = level.rooms.map((room, roomIndex) => {
    const archetype = semantic.has(roomIndex)
      ? roomArchetypeById(semantic.get(roomIndex))
      : weightedArchetype(theme, level.depth, level.seed, roomIndex);
    if (!archetype?.implemented) throw new Error(`Room archetype is not playable: ${archetype?.id}`);
    const environmentThemeId = environmentThemeFor(archetype, theme.id);
    if (!environmentThemeId) throw new Error(`Room archetype ${archetype.id} has no ${theme.id} visuals`);
    const variantId = semanticVariant(level, roomIndex, archetype)
      ?? archetype.variants[
        stableHash(level.seed, level.depth, roomIndex, 0x56415249) % archetype.variants.length
      ];
    const hasChest = (level.finds ?? []).some(
      (find) => find.roomIndex === roomIndex && find.id === 'sealed-cache',
    );
    const chestSkinId = hasChest || archetype.id === 'treasure-vault'
      ? theme.chestSkinIds[
          stableHash(level.seed, level.depth, roomIndex, 0x43484553) % theme.chestSkinIds.length
        ]
      : null;
    return deepFreeze({
      id: `room-${level.depth}-${roomIndex}`,
      roomIndex,
      dungeonThemeId: theme.id,
      surfaceSetId: theme.surfaceSetId,
      archetypeId: archetype.id,
      variantId,
      environmentThemeId,
      chestSkinId,
      dangerBudget: roundedBudget(
        (level.scaling?.dangerRating ?? level.depth) * archetype.dangerMultiplier,
      ),
      rewardBudget: roundedBudget(
        (level.scaling?.rewards?.qualityBudget ?? level.depth * 2) * archetype.rewardMultiplier,
      ),
    });
  });
  return Object.freeze(plans);
}

export function roomPlanForIndex(level, roomIndex) {
  return level?.roomPlans?.find((plan) => plan.roomIndex === roomIndex) ?? null;
}
