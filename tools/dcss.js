import { canCloseDoor } from './dcss-rpg-doors.js';
import {
  ARTIFACT_PATH,
  CONTENT_PATHS,
  EXIT_PATH,
  FINAL_GATE_PATH,
  LOOT_CATALOG,
  SANCTUARY_PATH,
  eventById,
  lootById,
} from './dcss-rpg-content.js';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  LEGACY_SAVE_KEYS,
  SAVE_KEY,
  advanceRunFloor,
  createRun,
  findGridPath,
  generateDungeon,
  hasLineOfSight,
  hydrateDungeon,
  migrateLegacyRun,
  revealAround,
  validateRun,
} from './dcss-rpg-core.js';
import {
  HERO_BASE_MOVE_SPEED,
  canMonsterAdvance,
  canWeaponAttack,
  combatDamage,
  createMonsterStates,
  deriveHeroStats,
  equipInventoryItem,
  monsterCellKey,
  occupiedMonsterCells,
  resolveHeroDamage,
  resolveWeaponLoadout,
  salvageInventoryItems,
  unequipItem,
  weaponCombatProfile,
} from './dcss-rpg-rules.js';
import {
  FINAL_DEPTH,
  SANCTUARY_COST,
  canClaimFinalArtifact,
  canLeaveDungeonFloor,
  isTerminalRunStatus,
  goldRewardForMonster,
  useSanctuary,
} from './dcss-rpg-run.js';
import {
  allPlayerFoundationAssetPaths,
  composePlayerLayers,
} from './dcss-rpg-player.js';
import {
  allEquipmentVisualAssetPaths,
  equipmentVisualForItem,
} from './dcss-rpg-equipment-visuals.js';
import {
  PLAYER_BODY_OPTIONS,
  PLAYER_HAIR_OPTIONS,
  allPlayerAppearanceAssetPaths,
  cyclePlayerAppearance,
  loadPlayerAppearance,
  playerAppearancePosition,
  resolvePlayerAppearance,
  savePlayerAppearance,
} from './dcss-rpg-appearance.js';
import {
  allBiomeAssetPaths,
  atmosphereThemeForDepth,
  biomeThemeForDepth,
  BLOOD_FLOOR_PATHS,
  chapterWeather,
  deterministicAtmosphereMote,
  fogAnchorsForDungeon,
  PIXEL_EFFECT_SCALE,
  VISIBILITY_TUNING,
} from './dcss-rpg-visuals.js';
import { itemPresentation } from './dcss-rpg-item-details.js';
import { fittedSpriteRect, opaquePixelBounds } from './dcss-rpg-item-sprites.js';
import { materializeItemAffixes } from './dcss-rpg-affixes.js';
import { materializeProceduralArtifact } from './dcss-rpg-artifacts.js';
import { INVENTORY_FILTERS, inventorySections } from './dcss-rpg-inventory-ui.js';
import { characterSheetModel } from './dcss-rpg-character-sheet.js';
import { cloneSkillState, deriveSkillCapabilities, learnSkill } from './dcss-rpg-skills.js';
import { skillById } from './dcss-rpg-skill-content.js';
import { activeDetectedTrapCells, discoverTraps, trapsFromDungeon } from './dcss-rpg-traps.js';
import {
  DISARMED_TRAP_PATH,
  disarmTrap,
  trapDisarmAvailability,
  trapDisarmPresentation,
} from './dcss-rpg-trap-disarming.js';
import { createHazardInputState, hazardMoveIntent } from './dcss-rpg-hazard-input.js';
import {
  blockingActorCells, canActorsMeleeContact, constrainActorMovement, meleeApproachPoint,
} from './dcss-rpg-actor-collision.js';
import { chooseCrowdPressureStep } from './dcss-rpg-monster-pressure.js';
import {
  loadVisualOverrides,
  resolveVisualBinding,
  visualBindingKey,
  visualOverridePaths,
} from './dcss-rpg-visual-overrides.js';
import { skillMenuModel } from './dcss-rpg-skill-menu.js';
import { awardHeroExperience } from './dcss-rpg-progression.js';
import {
  LEVEL_UP_PRESENTATION_MS,
  levelUpPresentation,
} from './dcss-rpg-level-up.js';
import { mainMenuModel } from './dcss-rpg-menu.js';
import {
  VOID_STAR_SCALE,
  createVoidStarLayers,
  voidParallaxOffset,
} from './dcss-rpg-void-sky.js';
import {
  clampedStickOffset,
  directionVector,
  dominantCardinalDirection,
} from './dcss-rpg-input.js';
import {
  WORLD_DECORATION_DEPTH_BIAS,
  WORLD_WALL_HEIGHT,
  createDungeonWorld3D,
} from './dcss-rpg-world3d.js';
import {
  allEnvironmentAssetPaths,
  createDungeonEnvironment,
} from './dcss-rpg-environment.js';
import {
  FIND_ASSET_PATHS,
  findById,
  findPresentation,
  findResultPresentation,
  findSkinPath,
  isSecretFind,
  resolveFindInteraction,
} from './dcss-rpg-finds.js';
import { contextActionModel } from './dcss-rpg-context-actions.js';
import {
  FLOOR_MAP_COLORS,
  FLOOR_MAP_MARKER_SHAPES,
  FLOOR_MAP_ZOOM,
  centerFloorMapView,
  createFloorMapModel,
  fitFloorMapView,
  floorMapCellAt,
  floorMapCopy,
  floorMapTapAction,
  panFloorMapView,
  zoomFloorMapView,
} from './dcss-rpg-floor-map.js';
import { runSummaryModel } from './dcss-rpg-run-summary.js';
import { applyStrikeBonus, daggerProfile, resolveDaggerStrike } from './dcss-rpg-daggers.js';
import {
  armorBreakMultiplier,
  bluntProfile,
  refreshArmorBreak,
  resolveBluntStrike,
  tickArmorBreak,
} from './dcss-rpg-blunt.js';
import { interceptionDamage, spearInterception, spearProfile } from './dcss-rpg-spears.js';
import {
  accumulateSteadiness,
  marksmanProfile,
  resolveMarksmanShot,
  selectPiercedTargets,
} from './dcss-rpg-marksmanship.js';
import { dodgeSpeedMultiplier, mobilityProfile, refreshDodgeBoost, tickDodgeBoost } from './dcss-rpg-mobility.js';
import {
  darkvisionProfile,
  discoverSecrets,
  heroRevealRadius,
  heroSightRadius,
  secretSearchProfile,
  stealthNoiseRadius,
  stealthProfile,
  stealthVisionRadius,
} from './dcss-rpg-scouting.js';
import {
  activeMeal,
  cookedItemId,
  cookingProfile,
  createMealState,
  startMeal,
  tickMeal,
} from './dcss-rpg-cooking.js';
import { enduranceProfile, enduredDuration } from './dcss-rpg-endurance.js';
import {
  bandageRefusalText,
  fieldMedicineProfile,
  resolveBandage,
} from './dcss-rpg-field-medicine.js';
import {
  CITY_LIGHT_MULTIPLIER,
  CITY_REVEAL_RADIUS,
  isCityDepth,
} from './dcss-rpg-city.js';
import {
  CAMP_BEDROLL_PATH,
  CAMP_CHEST_PATH,
  CAMP_FIRE_FRAMES,
  CAMP_KIT_ITEM_ID,
  CAMP_STASH_CONTAINER_ID,
  campLayout,
  campProfile,
  campRefusalText,
  canPitchCamp,
  createCampState,
  resolveCampRest,
  summonedCampProfile,
} from './dcss-rpg-camp.js';
import { EFFECT_PATHS, WATER_PATHS, requiredAssetPaths } from './dcss-rpg-required-assets.js';
import {
  WATER_CONDUCTION_PERCENT,
  WATER_FIRE_MULTIPLIER,
  WATER_WET_DURATION,
  WATER_WET_REFRESH_BELOW,
  actorInWater,
  isWaterCell,
  selectWaterConductionTargets,
  terrainAllowsCell,
  terrainMeleeMultiplier,
  terrainSpeedMultiplier,
} from './dcss-rpg-terrain.js';
import {
  ONBOARDING_KEY,
  advanceOnboarding,
  createOnboardingState,
  dismissOnboarding,
  markOnboardingSeen,
  onboardingComplete,
  onboardingHintCopy,
  parseOnboardingState,
  serializeOnboardingState,
} from './dcss-rpg-onboarding.js';
import {
  AUDIO_SAMPLE_FILES,
  AUDIO_SAMPLE_ROOT,
  AUDIO_SETTINGS_KEY,
  AUDIO_VOLUME_STEP,
  adjustAudioVolume,
  ambientSample,
  audioMenuModel,
  effectiveVolume,
  parseAudioSettings,
  pickSampleFile,
  serializeAudioSettings,
  soundSample,
  toggleAudioMute,
} from './dcss-rpg-audio.js';
import {
  MERCHANT_ACTOR_PATH,
  MERCHANT_COMMANDS,
  MERCHANT_ICON_PATH,
  buybackMerchantItem,
  buyMerchantItem,
  createMerchantStates,
  merchantPresentation,
  merchantSellPrice,
  merchantStateFor,
  sellMerchantItem,
} from './dcss-rpg-merchant.js';
import { CHEST_RESOURCE_IDS, chestVisualFrames } from './dcss-rpg-chests.js';
import {
  CHEST_CONTAINER_CAPACITY,
  CHEST_CONTAINER_COMMANDS,
  HERO_BACKPACK_CAPACITY,
  createChestContainerStates,
  openChestContainer as openChestContainerState,
  storeChestItem,
  takeChestGold,
  takeChestItem,
} from './dcss-rpg-chest-containers.js';
import {
  PLAYER_TRAP_ITEM_ID,
  PLAYER_TRAP_PATH,
  placePlayerTrap,
  playerTrapPlacementCells,
  triggerPlayerTrap,
} from './dcss-rpg-player-traps.js';
import {
  ACTOR_EFFECTS,
  activeActorEffects,
  actorEffectModifiers,
  applyActorEffect,
  clearActorEffects,
  createActorEffects,
  monsterInfliction,
  tickActorEffects,
} from './dcss-rpg-effects.js';
import {
  equipmentMagic,
  applyWardedEffect,
  wardActorEffects,
  INVISIBILITY_REVEAL_SECONDS,
  resolveKillRecovery,
  resolveVampiricRecovery,
} from './dcss-rpg-magic.js';
import {
  attackCrossedContact,
  combatImpactProfile,
  heroAttackMotion,
  heroAttackTrail,
  monsterAttackMotion,
} from './dcss-rpg-combat-motion.js';
import {
  axeCleaveDamage,
  axeCleaveProfile,
  selectAxeCleaveTargets,
} from './dcss-rpg-cleave.js';
import {
  resolveShieldBlock,
  shieldBlockRoll,
} from './dcss-rpg-shield.js';
import {
  createSwordRhythmState,
  resolveSwordRhythmStrike,
  swordRhythmSource,
} from './dcss-rpg-swords.js';
import {
  IDENTIFICATION_APPEARANCE_PATHS,
  appraiseItem,
  createItemKnowledge,
  identifiableItemIds,
  identifyItem,
  isIdentifiableItem,
  itemIdentificationView,
  potionOutcome,
} from './dcss-rpg-identification.js';
import {
  READ_BOOK_COMMAND,
  createBookStudy,
  bookOutcome,
  readSpellBook,
  readSkillBook,
} from './dcss-rpg-books.js';
import {
  createSpellState,
  knownSpellModel,
  prepareSpell,
  pyromancySpreadProfile,
  spellBarModel,
  spellById,
  spellDamage,
  spellHealing,
  spellMagic,
  spellStatus,
  spellUseAvailability,
  toggleSustainedSpell,
} from './dcss-rpg-spells.js';
import {
  cryomancyHitProfile,
  cryomancyShatterDamage,
  selectCryomancyShatterTargets,
} from './dcss-rpg-cryomancy.js';
import {
  selectStormChainTargets,
  stormChainDamage,
  stormChainProfile,
} from './dcss-rpg-storm-magic.js';
import {
  blinkTargetCells,
  resolveBlink,
  resolveTargetedItemUse,
} from './dcss-rpg-targeting.js';
import {
  PASSIVE_CREATURE_PATHS,
  choosePassiveWanderTarget,
  createPassiveCreatureStates,
  passiveWanderPause,
} from './dcss-rpg-passive.js';
import {
  HUNGER_TUNING,
  advanceHunger,
  consumeFood,
  hungerPresentation,
  hungerStage,
} from './dcss-rpg-hunger.js';
import { createGameCommand } from './dcss-rpg-game-commands.js';
import {
  COOKED_MEAT_ITEM_ID,
  RAW_MEAT_ITEM_ID,
  SURVIVAL_COMMANDS,
  beginWildlifeHunt,
  cookMeat,
  strikeWildlife,
} from './dcss-rpg-survival.js';

const worldCanvas = document.querySelector('#world-3d');
const canvas = document.querySelector('#scene');
const context = canvas.getContext('2d', { alpha: true });
const voidSkyCanvas = document.querySelector('#void-sky');
const voidSkyContext = voidSkyCanvas.getContext('2d', { alpha: true });
const dungeonWorld3D = createDungeonWorld3D({ canvas: worldCanvas });
const atmosphereCanvas = document.createElement('canvas');
const atmosphereContext = atmosphereCanvas.getContext('2d', { alpha: true });
const status = document.querySelector('#status');
const trapAnnouncement = document.querySelector('#trap-announcement');
const mainMenu = document.querySelector('#main-menu');
const mainMenuTitle = document.querySelector('#main-menu-title');
const mainMenuLanguages = document.querySelector('#main-menu-languages');
const mainMenuLanguageButtons = [...mainMenuLanguages.querySelectorAll('[data-language]')];
const mainMenuAudio = document.querySelector('#main-menu-audio');
const audioMuteButton = document.querySelector('#audio-mute');
const audioVolumeDownButton = document.querySelector('#audio-volume-down');
const audioVolumeUpButton = document.querySelector('#audio-volume-up');
const audioVolumeValue = document.querySelector('#audio-volume-value');
const audioMenuButtons = [audioMuteButton, audioVolumeDownButton, audioVolumeUpButton];
const startGameButton = document.querySelector('#start-game');
const startGameLabel = document.querySelector('#start-game-label');
const mainMenuHint = document.querySelector('#main-menu-hint');
const appVersionLabel = document.querySelector('#app-version');
const feedbackLink = document.querySelector('#feedback-link');
const mainMenuState = document.querySelector('#main-menu-state');
const editAppearanceButton = document.querySelector('#edit-appearance');
const editAppearanceLabel = document.querySelector('#edit-appearance-label');
const menuAppearanceIcon = document.querySelector('#menu-appearance-icon');
const newRunFromMenuButton = document.querySelector('#new-run-from-menu');
const newRunFromMenuLabel = document.querySelector('#new-run-from-menu-label');
const appearanceEditor = document.querySelector('#appearance-editor');
const closeAppearanceButton = document.querySelector('#close-appearance');
const appearanceEditorTitle = document.querySelector('#appearance-editor-title');
const appearancePaperdoll = document.querySelector('#appearance-paperdoll');
const appearancePaperContext = appearancePaperdoll.getContext('2d');
const appearanceBodyLabel = document.querySelector('#appearance-body-label');
const appearanceHairLabel = document.querySelector('#appearance-hair-label');
const appearanceBodyValue = document.querySelector('#appearance-body-value');
const appearanceHairValue = document.querySelector('#appearance-hair-value');
const appearanceCycleButtons = [...appearanceEditor.querySelectorAll('[data-appearance-kind]')];
const saveAppearanceButton = document.querySelector('#save-appearance');
const newRunConfirm = document.querySelector('#new-run-confirm');
const newRunConfirmTitle = document.querySelector('#new-run-confirm-title');
const newRunConfirmCopy = document.querySelector('#new-run-confirm-copy');
const cancelNewRunButton = document.querySelector('#cancel-new-run');
const confirmNewRunButton = document.querySelector('#confirm-new-run');
const hud = document.querySelector('.hud');
const characterSheetButton = document.querySelector('#character-sheet-button');
const skillPointsBadge = document.querySelector('#skill-points-badge');
const characterSheet = document.querySelector('#character-sheet');
const closeCharacterSheetButton = document.querySelector('#close-character-sheet');
const characterSheetLanguageButton = document.querySelector('#character-sheet-language');
const characterSheetTitle = document.querySelector('#character-sheet-title');
const characterLevel = document.querySelector('#character-level');
const characterFloor = document.querySelector('#character-floor');
const characterExperienceText = document.querySelector('#character-experience-text');
const characterExperienceBar = characterSheet.querySelector('[role="progressbar"]');
const characterExperienceFill = document.querySelector('#character-experience-fill');
const characterStatList = document.querySelector('#character-stat-list');
const characterCombatTitle = document.querySelector('#character-combat-title');
const characterCombatGrid = document.querySelector('#character-combat-grid');
const characterSkills = document.querySelector('#character-skills');
const characterSkillsTitle = document.querySelector('#character-skills-title');
const characterSkillPoints = document.querySelector('#character-skill-points');
const characterSkillGroups = document.querySelector('#character-skill-groups');
const characterSpells = document.querySelector('#character-spells');
const characterSpellsTitle = document.querySelector('#character-spells-title');
const characterSpellsHint = document.querySelector('#character-spells-hint');
const characterSpellsIntelligence = document.querySelector('#character-spells-intelligence');
const characterSpellSlots = document.querySelector('#character-spell-slots');
const characterKnownSpells = document.querySelector('#character-known-spells');
const characterPaperdoll = document.querySelector('#character-paperdoll');
const characterPaperContext = characterPaperdoll.getContext('2d');
const characterIdentity = characterSheet.querySelector('.character-identity');
const moveControl = document.querySelector('#move-control');
const moveStick = document.querySelector('#move-stick');
const moveDirectionButtons = [...moveControl.querySelectorAll('[data-move]')];
const moveMarker = document.querySelector('#move-marker');
const spellBar = document.querySelector('#spell-bar');
const spellActionButtons = [...spellBar.querySelectorAll('[data-spell-slot]')];
const bagButton = document.querySelector('#bag');
const interactActionButton = document.querySelector('#interact-action');
const interactActionIcon = document.querySelector('#interact-action-icon');
const inventory = document.querySelector('#inventory');
const inventoryShell = inventory.querySelector('.inventory-shell');
const packPanel = inventory.querySelector('.pack-panel');
const closeInventoryButton = document.querySelector('#close-inventory');
const inventoryTitle = document.querySelector('#inventory-title');
const inventoryViewSwitcher = inventory.querySelector('.inventory-view-switcher');
const inventoryViewButtons = [...inventoryViewSwitcher.querySelectorAll('[data-pack-view]')];
const inventoryFilters = document.querySelector('#inventory-filters');
const inventoryFilterButtons = [...inventoryFilters.querySelectorAll('[data-inventory-filter]')];
const inventoryPaperdoll = document.querySelector('#inventory-paperdoll');
const inventoryPaperContext = inventoryPaperdoll.getContext('2d');
const inventoryEquippedCount = document.querySelector('#inventory-equipped-count');
const inventoryEquipmentSlots = document.querySelector('#inventory-equipment-slots');
const inventoryEquipmentButtons = [...inventoryEquipmentSlots.querySelectorAll('[data-equip]')];
const inventoryEquipmentPlaceholderIcons = new Map(
  inventoryEquipmentButtons.map((button) => [button.dataset.equip, button.querySelector('img').getAttribute('src')]),
);
const packGrid = document.querySelector('#pack-grid');
const salvageButton = document.querySelector('#salvage');
const salvageCount = document.querySelector('#salvage-count');
const salvageConfirm = document.querySelector('#salvage-confirm');
const salvageLabel = document.querySelector('#salvage-label');
const salvageConfirmLabel = document.querySelector('#salvage-confirm-label');
const inventoryCount = document.querySelector('#inventory-count');
const currency = document.querySelector('.currency');
const currencyValue = currency.querySelector('b');
const lootToast = document.querySelector('#loot-toast');
const onboardingHint = document.querySelector('#onboarding-hint');
const onboardingGlyph = document.querySelector('#onboarding-glyph');
const onboardingTitle = document.querySelector('#onboarding-title');
const onboardingText = document.querySelector('#onboarding-text');
const onboardingDismissButton = document.querySelector('#onboarding-dismiss');
const onboardingSkipButton = document.querySelector('#onboarding-skip');
const lootName = document.querySelector('#loot-name');
const lootRarity = document.querySelector('#loot-rarity');
const lootSlot = document.querySelector('#loot-slot');
const lootEffect = document.querySelector('#loot-effect');
const lootValue = document.querySelector('#loot-value');
const levelUpCelebration = document.querySelector('#level-up-celebration');
const levelUpLabel = document.querySelector('#level-up-label');
const levelUpValue = document.querySelector('#level-up-value');
const levelUpPoints = document.querySelector('#level-up-points');
const healthSegments = [...document.querySelectorAll('.health i')];
const hungerMeter = document.querySelector('#hunger-meter');
const hungerFill = document.querySelector('#hunger-fill');
const combatIndicators = [...document.querySelectorAll('.ailments i')];
const heroEffectsHud = document.querySelector('#hero-effects');
const depthBadge = document.querySelector('.depth');
const floorMap = document.querySelector('#floor-map');
const floorMapCanvas = document.querySelector('#floor-map-canvas');
const floorMapTitle = document.querySelector('#floor-map-title');
const floorMapHint = document.querySelector('#floor-map-hint');
const closeFloorMapButton = document.querySelector('#close-floor-map');
const floorMapCenterButton = document.querySelector('#floor-map-center');
const floorMapZoomInButton = document.querySelector('#floor-map-zoom-in');
const floorMapZoomOutButton = document.querySelector('#floor-map-zoom-out');
const pauseGameButton = document.querySelector('#pause-game');
const runEndScreen = document.querySelector('#run-end-screen');
const restartRunButton = document.querySelector('#restart-run');
const runEndTitle = document.querySelector('#run-end-title');
const runSummaryList = document.querySelector('#run-summary');
const bossHud = document.querySelector('#boss-hud');
const bossHealth = bossHud.querySelector('.boss-health');
const sanctuaryAction = document.querySelector('#sanctuary-action');
const doorAnnouncement = document.querySelector('#door-announcement');
const findAnnouncement = document.querySelector('#find-announcement');
const contextActions = document.querySelector('#context-actions');
const contextActionBackdrop = document.querySelector('#context-action-backdrop');
const closeContextActionsButton = document.querySelector('#close-context-actions');
const contextActionIcon = document.querySelector('#context-action-icon');
const contextActionTitle = document.querySelector('#context-action-title');
const contextActionDescription = document.querySelector('#context-action-description');
const contextActionList = document.querySelector('#context-action-list');
const merchantShop = document.querySelector('#merchant-shop');
const merchantShopPortrait = document.querySelector('#merchant-shop-portrait');
const merchantShopTitle = document.querySelector('#merchant-shop-title');
const merchantShopGold = document.querySelector('#merchant-shop-gold');
const merchantShopFunds = document.querySelector('#merchant-shop-funds');
const merchantShopTabs = document.querySelector('#merchant-shop-tabs');
const merchantShopTabButtons = [...merchantShopTabs.querySelectorAll('[data-merchant-tab]')];
const merchantShopList = document.querySelector('#merchant-shop-list');
const merchantShopFeedback = document.querySelector('#merchant-shop-feedback');
const closeMerchantShopButton = document.querySelector('#close-merchant-shop');
const chestContainer = document.querySelector('#chest-container');
const chestContainerIcon = document.querySelector('#chest-container-icon');
const chestContainerTitle = document.querySelector('#chest-container-title');
const chestContainerStateLabel = document.querySelector('#chest-container-state');
const chestStorageTitle = document.querySelector('#chest-storage-title');
const chestStorageCount = document.querySelector('#chest-storage-count');
const chestStorageList = document.querySelector('#chest-storage-list');
const chestBackpackTitle = document.querySelector('#chest-backpack-title');
const chestBackpackCount = document.querySelector('#chest-backpack-count');
const chestBackpackList = document.querySelector('#chest-backpack-list');
const chestContainerFeedback = document.querySelector('#chest-container-feedback');
const closeChestContainerButton = document.querySelector('#close-chest-container');
const trapPlacement = document.querySelector('#trap-placement');
const trapPlacementLabel = document.querySelector('#trap-placement-label');
const trapPlacementTargets = document.querySelector('#trap-placement-targets');
const cancelTrapPlacementButton = document.querySelector('#cancel-trap-placement');
const abilityTargeting = document.querySelector('#ability-targeting');
const abilityTargetingPrompt = abilityTargeting.querySelector('.ability-targeting-prompt');
const abilityTargetingLabel = document.querySelector('#ability-targeting-label');
const abilityTargetingIcon = document.querySelector('#ability-targeting-icon');
const abilityTargetingTargets = document.querySelector('#ability-targeting-targets');
const cancelAbilityTargetingButton = document.querySelector('#cancel-ability-targeting');
const itemDetail = document.querySelector('#item-detail');
const itemDetailCard = itemDetail.querySelector('.item-detail-card');
const closeItemDetailButton = document.querySelector('#close-item-detail');
const itemDetailName = document.querySelector('#item-detail-name');
const itemDetailRarity = document.querySelector('#item-detail-rarity');
const itemDetailSlot = document.querySelector('#item-detail-slot');
const itemDetailIcon = document.querySelector('#item-detail-icon');
const itemDetailDescription = document.querySelector('#item-detail-description');
const itemDetailComparison = document.querySelector('#item-detail-comparison');
const itemDetailComparisonTitle = document.querySelector('#item-detail-comparison-title');
const itemDetailComparisonList = document.querySelector('#item-detail-comparison-list');
const itemDetailEffects = document.querySelector('#item-detail-effects');
const itemDetailEffectsRegion = itemDetail.querySelector('.item-detail-effects');
const itemDetailEffectsTitle = itemDetail.querySelector('.item-detail-effects h3');
const itemDetailAction = document.querySelector('#item-detail-action');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Injected by Vite from package.json; the dev server and tests fall back to a placeholder. */
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev';
const assetRoot = new URL('../assets/dcss-preview/', document.baseURI);
const assetUrl = (path) => new URL(path, assetRoot).href;
const visualOverrides = loadVisualOverrides();

function runtimeVisual(kind, id, channel, path, scale = 1, offsetY = 0) {
  return resolveVisualBinding(
    visualOverrides,
    visualBindingKey(kind, id, channel),
    { path, scale, offsetY },
  );
}

const TILE = 64;
const ITEM_LANGUAGE_KEY = 'little-islands:2d:item-language:v1';
const INVENTORY_VIEW_KEY = 'dng-codex:inventory-view:v1';
const IDENTIFIABLE_LOOT_IDS = identifiableItemIds(LOOT_CATALOG, null);
const IDENTIFIABLE_LOOT_IDS_BY_GROUP = Object.freeze(Object.fromEntries(
  ['potion', 'scroll', 'wand', 'book'].map((group) => [group, identifiableItemIds(LOOT_CATALOG, group)]),
));
const ACTOR_SIZE = 82;
const WORLD_WIDTH = MAP_WIDTH;
const WORLD_HEIGHT = MAP_HEIGHT;
const rarityGlow = ['#9da39c', '#66b47a', '#62a9dc', '#d0b45e'];
const combatGlyph = Object.freeze({
  unarmed: '·',
  blade: '⚔',
  heavy: '◆',
  spear: '↟',
  staff: '✦',
  bow: '➶',
});

const waterPaths = WATER_PATHS;

const sanctuaryVisual = runtimeVisual('system', 'sanctuary', 'world', SANCTUARY_PATH, 1, -5);
const exitVisual = runtimeVisual('system', 'exit', 'world', EXIT_PATH, 1, 0);
const finalGateVisual = runtimeVisual('system', 'final-gate', 'world', FINAL_GATE_PATH, 1, 0);
const artifactVisual = runtimeVisual('system', 'artifact', 'world', ARTIFACT_PATH, 1, -8);
const armedPlayerTrapVisual = runtimeVisual('trap', 'player-armed', 'world', PLAYER_TRAP_PATH, 1, 5);
const spentPlayerTrapVisual = runtimeVisual('trap', 'player-spent', 'world', PLAYER_TRAP_PATH, 0.86, 5);
const disarmedTrapVisual = runtimeVisual('trap', 'disarmed', 'world', DISARMED_TRAP_PATH, 1, 5);
const doorPanelVisual = runtimeVisual(
  'system', 'door-panel', 'world', 'dngn/doors/closed_door.png', 1, 0,
);

const effectPaths = EFFECT_PATHS;
const requiredPaths = requiredAssetPaths(visualOverridePaths(visualOverrides));

const images = new Map();
const floorLootSpritePaths = new Set([
  ...LOOT_CATALOG.map(({ icon }) => icon),
  ...IDENTIFICATION_APPEARANCE_PATHS,
  ...visualOverridePaths(visualOverrides),
]);
const floorLootSpriteBounds = new Map();
const requestedSeedValue = new URL(document.location.href).searchParams.get('seed');
// QA-only: `?preview=chest|altar` moves that find next to the spawn cell.
const previewFindIdNearSpawn = {
  chest: 'sealed-cache',
  altar: 'ancient-altar',
  fountain: 'sunken-fountain',
  rune: 'warded-rune',
}[new URL(document.location.href).searchParams.get('preview')] ?? null;
const previewChestNearSpawn = previewFindIdNearSpawn === 'sealed-cache';
const previewHuntNearSpawn = new URL(document.location.href).searchParams.get('preview') === 'hunt';
const requestedSeed = requestedSeedValue != null && /^\d+$/.test(requestedSeedValue)
  ? Number(requestedSeedValue)
  : null;
const fixedPreviewSeed = Number.isSafeInteger(requestedSeed) && requestedSeed >= 0
  ? requestedSeed >>> 0
  : null;
const restored = fixedPreviewSeed == null ? loadRun() : null;
const storedRun = restored?.run ?? null;
const restoredDungeon = restored?.dungeon ?? null;
const freshSeed = fixedPreviewSeed ?? createSeed();
let run = storedRun ?? createRun(freshSeed);
let dungeon = restoredDungeon ?? generateDungeon({
  seed: run.seed,
  depth: 1,
  scalingVersion: run.scalingVersion,
  difficulty: run.difficulty,
  lootAbundance: run.lootAbundance,
});
let world = dungeon.grid;
const selected = { ...run.equipment };
let itemInstances = new Map(run.items.map((record) => [record.uid, materializeInventoryItem(record)]));
let backpackItems = run.inventory.map((uid) => itemInstances.get(uid)).filter(Boolean);
const revealed = new Set(run.floor.revealed);
revealAround(revealed, world, { x: run.hero.x, y: run.hero.y }, 4);
let dungeonEnvironment = createDungeonEnvironment(dungeon);
if (previewHuntNearSpawn) {
  const cookingSite = dungeonEnvironment.props.find(({ interactionId }) => interactionId === 'campfire');
  const occupiedPreviewCells = new Set([
    ...dungeon.monsters,
    ...dungeon.loot,
    ...dungeon.events,
    ...dungeon.finds,
    ...dungeon.merchants,
  ].map(({ x, y }) => `${x},${y}`));
  const previewCell = [
    { x: dungeon.spawn.x + 1, y: dungeon.spawn.y },
    { x: dungeon.spawn.x - 1, y: dungeon.spawn.y },
    { x: dungeon.spawn.x, y: dungeon.spawn.y + 1 },
    { x: dungeon.spawn.x, y: dungeon.spawn.y - 1 },
  ].find(({ x, y }) => world[y]?.[x] === '.' && !occupiedPreviewCells.has(`${x},${y}`));
  if (cookingSite && previewCell) {
    dungeonEnvironment = Object.freeze({
      ...dungeonEnvironment,
      props: Object.freeze(dungeonEnvironment.props.map((prop) => prop !== cookingSite
        ? prop
        : Object.freeze({
            ...prop,
            gridX: previewCell.x,
            gridY: previewCell.y,
            x: previewCell.x + 0.25,
            y: previewCell.y + 0.5,
          }))),
    });
  }
}
let lootDefinitions = createLootDefinitions(dungeon);
let eventDefinitions = createEventDefinitions(dungeon);
let findDefinitions = createFindDefinitions(dungeon);
let trapDefinitions = trapsFromDungeon(dungeon);
let detectedTrapIds = new Set(run.floor.detectedTrapIds);
let hazardInputState = createHazardInputState();
let permittedHazardCell = null;
let inputGesture = 0;
let doorDefinitions = dungeon.doors.map((door) => ({ ...door }));
let merchantDefinitions = dungeon.merchants.map((merchant) => ({ ...merchant }));

const hero = {
  x: (run.hero.x + 0.5) * TILE,
  y: (run.hero.y + 0.5) * TILE,
  path: [],
  facing: 1,
  stride: 0,
  attack: 0,
  attackDuration: 0.34,
  attackStyle: 'blade',
  attackCooldown: 0.2,
  targetAngle: 0,
  pendingAttack: null,
  attackEmpowered: false,
  attackMasteryRank: 0,
  hp: run.hero.hp,
  maxHp: run.hero.maxHp,
  level: run.hero.level,
  xp: run.hero.xp,
  power: run.hero.power,
  hunger: run.hero.hunger,
  meal: createMealState(run.hero.meal),
  effects: createActorEffects(run.hero.effects),
  skills: cloneSkillState(run.hero.skills),
  skillStudy: createBookStudy(run.hero.skillStudy),
  intelligence: run.hero.intelligence,
  spells: createSpellState(run.hero.spells),
  hurt: 0,
  guardFlash: 0,
  invisibilityReveal: 0,
  dead: run.status === 'dead',
};
const camera = { x: hero.x, y: hero.y };
let monsters = createMonsters(dungeon);
let passiveCreatures = createPassiveCreatures(dungeon);
if (previewHuntNearSpawn && passiveCreatures[0]) {
  const occupiedPreviewCells = new Set([
    ...monsters.map((actor) => monsterCellKey(actor, TILE)),
    ...dungeonEnvironment.props.map(({ gridX, gridY }) => `${gridX},${gridY}`),
    ...findDefinitions.map((find) => `${Math.floor(find.x / TILE)},${Math.floor(find.y / TILE)}`),
  ]);
  const previewCell = [
    { x: dungeon.spawn.x + 1, y: dungeon.spawn.y },
    { x: dungeon.spawn.x - 1, y: dungeon.spawn.y },
    { x: dungeon.spawn.x, y: dungeon.spawn.y + 1 },
    { x: dungeon.spawn.x, y: dungeon.spawn.y - 1 },
  ].find(({ x, y }) => world[y]?.[x] === '.' && !occupiedPreviewCells.has(`${x},${y}`));
  if (previewCell) {
    passiveCreatures[0].x = (previewCell.x + 0.5) * TILE;
    passiveCreatures[0].y = (previewCell.y + 0.5) * TILE;
    passiveCreatures[0].wanderCooldown = 999;
    passiveCreatures[0].maxHp = 1;
    passiveCreatures[0].hp = 1;
    passiveCreatures[0].huntSpeed = 0.1;
  }
}
const sparks = [];
const impactWaves = [];
const projectiles = [];
const lightningArcs = [];
let lightningArcSequence = 0;
const spellCooldowns = Object.create(null);
let spellUiAccumulator = 0;
const combatGlyphs = [];
const bloodDrops = [];
const bloodStains = [];
const COMBAT_GLYPH_PATTERNS = Object.freeze({
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
  '!': ['010', '010', '010', '000', '010'],
  '*': ['101', '010', '111', '010', '101'],
});
const createAtmosphereMotes = (seed) =>
  Array.from({ length: 96 }, (_, index) =>
    deterministicAtmosphereMote(seed, index, WORLD_WIDTH * TILE, WORLD_HEIGHT * TILE),
  );
let motes = createAtmosphereMotes(run.seed);
const createMistAnchors = (level) =>
  fogAnchorsForDungeon({
    seed: level.seed,
    spawn: level.spawn,
    rooms: level.rooms,
    tileSize: TILE,
  });
let mistAnchors = createMistAnchors(dungeon);
const createVoidStars = (level) =>
  createVoidStarLayers(level.seed ^ Math.imul(level.depth, 0x632be59b));
let voidStarLayers = createVoidStars(dungeon);
const renderShake = { x: 0, y: 0, amount: 0 };
let hitStop = 0;
let swordRhythmState = createSwordRhythmState();
// Weapon-technique transients: how long the hero has stood still for an aimed
// shot, and how long a dodge still speeds them up. Neither belongs in the save.
let heroSteadySeconds = 0;
// Secrets in reach of Secret search right now; a hidden stash has no save state.
const visibleSecretIds = new Set();
let heroDodgeBoost = 0;

let viewportWidth = innerWidth;
let viewportHeight = innerHeight;
let deviceScale = 1;
let previousTime = performance.now();
let frameId = 0;
let elapsed = 0;
let sceneStartedAt = 0;
let ready = false;
let uiScreen = 'menu';
let selectedPackIndex = -1;
let selectedEquipmentSlot = null;
let selectedSpellSlot = 0;
let inventoryFilter = 'all';
let inventoryView = loadInventoryView();
let salvageMode = false;
let toastTimer = 0;
let toastVisible = false;
let activeLootToastEntry = null;
const lootToastQueue = [];
let levelUpTimer = 0;
let levelUpAudio = null;
let audioMasterGain = null;
let audioAmbient = { paletteId: null, file: null, nodes: [], gain: null, sampleGain: null, level: 1 };
let audioAmbientRequest = null;
const audioSampleRoot = new URL(AUDIO_SAMPLE_ROOT, document.baseURI);
/** file -> AudioBuffer once decoded, null once a load failed (never retried). */
const audioSampleBuffers = new Map();
const audioSamplePromises = new Map();
let audioSettings = (() => {
  try {
    return parseAudioSettings(localStorage.getItem(AUDIO_SETTINGS_KEY));
  } catch {
    return parseAudioSettings(null);
  }
})();
let itemDetailLanguage = loadItemDetailLanguage();
let playerAppearance = loadPlayerAppearance();
let appearanceDraft = playerAppearance;
let menuMode = 'title';
let modalReturnScreen = 'menu';
let itemDetailItem = null;
let itemDetailReturnTarget = null;
let gold = run.gold;
let deathTimer = 0;
let runStatus = run.status;
let playerHasActed = run.started;
/** Screens where the world keeps moving; every other screen gets one frame on entry. */
const LIVE_WORLD_SCREENS = new Set(['game', 'context', 'trap-placement', 'ability-targeting', 'chest', 'merchant']);
const RENDER_INTERVAL_MS = 15.5;
let lastRenderAt = Number.NEGATIVE_INFINITY;
let renderedScreen = null;

let onboardingState = (() => {
  try {
    return parseOnboardingState(localStorage.getItem(ONBOARDING_KEY));
  } catch {
    return createOnboardingState();
  }
})();
let onboardingHintId = null;
let onboardingInteracted = false;
let onboardingCheckedAt = Number.NEGATIVE_INFINITY;
let openingDoor = null;
let contextTarget = null;
let contextInspected = false;
let activeMerchant = null;
let merchantTab = 'buy';
let activeChestFindId = null;
let hungerAccumulator = 0;
let hungerAutosaveElapsed = 0;
let currentHungerStageId = hungerStage(hero.hunger).id;
let trapPlacementState = null;
let abilityTargetingState = null;
let placedTraps = run.floor.placedTraps.map((trap) => ({ ...trap }));
let lastHeroCell = `${Math.floor(hero.x / TILE)},${Math.floor(hero.y / TILE)}`;
const markedForSalvage = new Set();
const fullInventoryWarnings = new Set();
const moveControlState = {
  pointerId: null,
  startX: 0,
  startY: 0,
  direction: null,
  pressedDirection: null,
  dragged: false,
  repeatAt: 0,
  holdTimer: 0,
  visualTimer: 0,
  suppressClick: false,
};

function createSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0];
}

function loadItemDetailLanguage() {
  try {
    return localStorage.getItem(ITEM_LANGUAGE_KEY) === 'en' ? 'en' : 'ru';
  } catch {
    return 'ru';
  }
}

function persistItemDetailLanguage() {
  try {
    localStorage.setItem(ITEM_LANGUAGE_KEY, itemDetailLanguage);
  } catch {
    // Language remains active for this tab when storage is unavailable.
  }
}

function loadInventoryView() {
  try {
    return localStorage.getItem(INVENTORY_VIEW_KEY) === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
}

function persistInventoryView() {
  try {
    localStorage.setItem(INVENTORY_VIEW_KEY, inventoryView);
  } catch {
    // The chosen view remains active for this tab when storage is unavailable.
  }
}

function updateInventoryViewUi() {
  const labels = currentMainMenuModel().labels;
  inventoryViewSwitcher.setAttribute('aria-label', labels.inventoryView);
  packPanel.dataset.view = inventoryView;
  for (const button of inventoryViewButtons) {
    const active = button.dataset.packView === inventoryView;
    const label = button.dataset.packView === 'table'
      ? labels.inventoryTable
      : labels.inventoryGrid;
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', label);
    button.title = label;
  }
}

function setInventoryView(view) {
  const nextView = view === 'table' ? 'table' : 'grid';
  if (inventoryView === nextView) return false;
  inventoryView = nextView;
  persistInventoryView();
  updateInventoryViewUi();
  renderPack();
  return true;
}

function updateInventoryFilterUi() {
  const labels = currentMainMenuModel().labels;
  const labelKeys = {
    all: 'allItems',
    equipped: 'equippedItems',
    weapons: 'weapons',
    armour: 'armour',
    jewellery: 'jewellery',
    consumables: 'consumables',
  };
  inventoryTitle.textContent = labels.inventoryTitle;
  inventoryFilters.setAttribute('aria-label', labels.inventoryFilter);
  for (const button of inventoryFilterButtons) {
    const active = button.dataset.inventoryFilter === inventoryFilter;
    const label = labels[labelKeys[button.dataset.inventoryFilter]];
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', label);
    button.title = label;
  }
}

function setInventoryFilter(filter) {
  const nextFilter = INVENTORY_FILTERS.includes(filter) ? filter : 'all';
  if (inventoryFilter === nextFilter) return false;
  inventoryFilter = nextFilter;
  selectedPackIndex = -1;
  selectedEquipmentSlot = null;
  updateInventoryFilterUi();
  renderPack();
  return true;
}

function currentMainMenuModel() {
  return mainMenuModel({
    language: itemDetailLanguage,
    runStarted: playerHasActed,
    runStatus,
    depthLabel: romanDepth(dungeon.depth),
    level: hero.level,
    paused: menuMode === 'pause',
  });
}

function renderMainMenu() {
  const model = currentMainMenuModel();
  const { labels } = model;
  document.documentElement.lang = model.language;
  document.title = `${model.title} · RPG`;
  mainMenu.dataset.mode = menuMode;
  mainMenuTitle.setAttribute('aria-label', model.title);
  mainMenuState.hidden = !model.state;
  mainMenuState.textContent = model.state ?? '';
  startGameLabel.textContent = model.action;
  startGameButton.setAttribute('aria-label', model.action);
  mainMenuHint.textContent = model.hint;
  appVersionLabel.textContent = `${labels.version} ${APP_VERSION}`;
  feedbackLink.textContent = labels.feedback;
  feedbackLink.setAttribute('aria-label', labels.feedback);
  editAppearanceLabel.textContent = labels.appearance;
  editAppearanceButton.setAttribute('aria-label', labels.openAppearance);
  menuAppearanceIcon.src = assetUrl(resolvePlayerAppearance(playerAppearance).body.layer);
  newRunFromMenuLabel.textContent = labels.newRun;
  newRunFromMenuButton.setAttribute('aria-label', labels.newRun);
  newRunFromMenuButton.hidden = isTerminalRunStatus(runStatus)
    || (!playerHasActed && menuMode !== 'pause');
  mainMenu.setAttribute('aria-label', labels.menu);
  mainMenuLanguages.setAttribute('aria-label', labels.language);
  mainMenuLanguageButtons.forEach((button) => {
    const active = button.dataset.language === model.language;
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute(
      'aria-label',
      button.dataset.language === 'ru' ? labels.russian : labels.english,
    );
  });
  renderAudioMenu();
  canvas.setAttribute('aria-label', labels.dungeon);
  hud.setAttribute(
    'aria-label',
    `${labels.hud}. ${hungerPresentation(hero.hunger, itemDetailLanguage).ariaLabel}`,
  );
  characterSheetButton.setAttribute('aria-label', labels.character);
  moveControl.setAttribute('aria-label', labels.move);
  moveDirectionButtons.forEach((button) => {
    button.setAttribute('aria-label', labels[button.dataset.move]);
  });
  bagButton.setAttribute('aria-label', labels.bag);
  inventory.setAttribute('aria-label', labels.inventory);
  closeInventoryButton.setAttribute('aria-label', labels.closeInventory);
  characterIdentity.setAttribute('aria-label', labels.characterDevelopment);
  characterPaperdoll.setAttribute('aria-label', labels.equippedHero);
  packPanel.setAttribute('aria-label', labels.backpackItems);
  inventoryPaperdoll.setAttribute('aria-label', labels.equippedHero);
  inventoryEquipmentSlots.setAttribute('aria-label', labels.equippedGear);
  updateInventoryViewUi();
  updateInventoryFilterUi();
  salvageButton.setAttribute('aria-label', labels.salvage);
  salvageConfirm.setAttribute('aria-label', labels.salvageConfirm);
  salvageLabel.textContent = labels.salvageShort;
  salvageConfirmLabel.textContent = labels.salvageConfirmShort;
  sanctuaryAction.setAttribute('aria-label', labels.sanctuary);
  bossHud.setAttribute('aria-label', labels.guardian);
  bossHealth.setAttribute('aria-label', labels.guardianHealth);
  restartRunButton.setAttribute('aria-label', labels.restart);
  pauseGameButton.setAttribute('aria-label', labels.pauseGame);
  appearanceEditorTitle.textContent = labels.appearance;
  appearanceEditor.setAttribute('aria-label', labels.appearance);
  closeAppearanceButton.setAttribute('aria-label', labels.closeAppearance);
  appearancePaperdoll.setAttribute('aria-label', labels.appearancePreview);
  appearanceBodyLabel.textContent = labels.body;
  appearanceHairLabel.textContent = labels.hair;
  saveAppearanceButton.textContent = labels.appearanceDone;
  for (const button of appearanceCycleButtons) {
    const previous = Number(button.dataset.appearanceStep) < 0;
    const kind = button.dataset.appearanceKind;
    const key = `${previous ? 'previous' : 'next'}${kind === 'body' ? 'Body' : 'Hair'}`;
    button.setAttribute('aria-label', labels[key]);
  }
  newRunConfirmTitle.textContent = labels.newRunConfirmTitle;
  newRunConfirmCopy.textContent = labels.newRunConfirmCopy;
  cancelNewRunButton.textContent = labels.cancel;
  confirmNewRunButton.textContent = labels.confirmNewRun;
}

function setInterfaceLanguage(language) {
  itemDetailLanguage = language === 'en' ? 'en' : 'ru';
  persistItemDetailLanguage();
  renderMainMenu();
  if (uiScreen === 'appearance') renderAppearanceEditor();
  if (!ready) return;
  renderCharacterSheet();
  if (itemDetailItem) renderItemDetail(itemDetailItem);
  updateGearUi();
  renderPack();
  if (toastVisible && activeLootToastEntry) renderLootToast(activeLootToastEntry);
  if (uiScreen === 'merchant') renderMerchantShop();
  if (uiScreen === 'chest') renderChestContainer();
  renderOnboardingHint();
  updateHud();
}

function loadRun() {
  const candidates = [
    [SAVE_KEY, false],
    [`${SAVE_KEY}:backup`, false],
    ...LEGACY_SAVE_KEYS.flatMap((key) => [
      [key, true],
      [`${key}:backup`, true],
    ]),
  ];
  for (const [key, legacy] of candidates) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const snapshot = legacy ? migrateLegacyRun(parsed) : parsed;
      if (!validateRun(snapshot)) continue;
      const level = hydrateDungeon(snapshot);
      return { run: snapshot, dungeon: level };
    } catch {
      // A broken local snapshot must never prevent a fresh run.
    }
  }
  return null;
}

function materializeInventoryItem(record) {
  const definition = lootById(record.id);
  if (!definition) return null;
  const persisted = {
    ...record,
    stack: record.stack ?? definition.stack,
  };
  return materializeProceduralArtifact(materializeItemAffixes(definition, persisted), persisted);
}

function createRuntimeMonsters(level, spawns) {
  return createMonsterStates({ ...level, monsters: spawns }, TILE).map((monster) => {
    const visual = runtimeVisual('monster', monster.id, 'world', monster.spritePath, 1, -10);
    return {
      ...monster,
      spritePath: visual.path,
      visualScale: visual.scale,
      visualOffsetY: visual.offsetY,
    };
  });
}

function createMonsters(level) {
  const resolvedFindIds = new Set(run.floor.resolvedFindIds);
  return createRuntimeMonsters(
    level,
    level.monsters.filter(
      (spawn) => !spawn.activationFindId || resolvedFindIds.has(spawn.activationFindId),
    ),
  );
}

function createPassiveCreatures(level) {
  return createPassiveCreatureStates(level, TILE).map((creature) => {
    const visual = runtimeVisual('passive', creature.id, 'world', creature.spritePath, 1, -9);
    return {
      ...creature,
      spritePath: visual.path,
      visualScale: visual.scale,
      visualOffsetY: visual.offsetY,
    };
  });
}

function createLootDefinitions(level) {
  return level.loot.map((spawn) => {
    const definition = lootById(spawn.id);
    return {
      ...spawn,
      definition: materializeProceduralArtifact(materializeItemAffixes(definition, spawn), spawn),
      x: (spawn.x + 0.5) * TILE,
      y: (spawn.y + 0.5) * TILE,
    };
  });
}

function createEventDefinitions(level) {
  return level.events.map((spawn) => {
    const definition = eventById(spawn.id);
    const offsetY = spawn.id === 'blade-trap' ? 3 : -5;
    const visual = runtimeVisual('event', spawn.id, 'world', definition.path, 1, offsetY);
    return {
      ...spawn,
      definition: {
        ...definition,
        path: visual.path,
        visualScale: visual.scale,
        visualOffsetY: visual.offsetY,
      },
      x: (spawn.x + 0.5) * TILE,
      y: (spawn.y + 0.5) * TILE,
    };
  });
}

function previewChestCell(level, chest) {
  if (!previewFindIdNearSpawn || chest.id !== previewFindIdNearSpawn) return chest;
  const occupied = new Set([
    ...level.monsters,
    ...level.loot,
    ...level.events,
    ...(level.passives ?? []),
    ...level.finds.filter(({ instanceId }) => instanceId !== chest.instanceId),
  ].map(({ x, y }) => `${x},${y}`));
  const candidates = [
    { x: level.spawn.x + 1, y: level.spawn.y },
    { x: level.spawn.x - 1, y: level.spawn.y },
    { x: level.spawn.x, y: level.spawn.y + 1 },
    { x: level.spawn.x, y: level.spawn.y - 1 },
  ];
  const cell = candidates.find(({ x, y }) =>
    level.grid[y]?.[x] === '.' && !occupied.has(`${x},${y}`),
  );
  return cell ? { ...chest, ...cell } : chest;
}

function createFindDefinitions(level) {
  return level.finds.map((sourceFind) => {
    const find = previewChestCell(level, sourceFind);
    const definition = findById(find.id);
    const visual = runtimeVisual(
      'find', find.id, 'world', findSkinPath(find) ?? definition.path, 1, definition.screenOffsetY,
    );
    const roomPlan = level.roomPlans?.find((plan) => plan.roomIndex === find.roomIndex);
    const animationFrames = find.id === 'sealed-cache' && visual.path === definition.path
      ? chestVisualFrames({
          seed: run.seed,
          depth: level.depth,
          roomIndex: find.roomIndex,
          skinIds: roomPlan?.chestSkinId ? [roomPlan.chestSkinId] : null,
        })
      : null;
    const container = find.id === 'sealed-cache'
      ? run.floor.chests.find(({ findId }) => findId === find.instanceId)
      : null;
    return {
      ...find,
      definition: {
        ...definition,
        path: visual.path,
        visualScale: visual.scale,
        screenOffsetY: visual.offsetY,
        animationFrames,
      },
      x: (find.x + 0.5) * TILE,
      y: (find.y + 0.5) * TILE,
      resolved: find.resolved || run.floor.resolvedFindIds.includes(find.instanceId),
      containerOpened: container?.opened === true,
      containerDestroyed: container?.destroyed === true,
      consumedByMimic: container?.destroyed === true && find.cacheVariant === 'mimic',
    };
  });
}

function openedChestIsInteractable(find) {
  return Boolean(
    find?.id === 'sealed-cache'
    && find.containerOpened
    && !find.consumedByMimic,
  );
}

function findIsInteractable(find) {
  return Boolean(find && (!find.resolved || openedChestIsInteractable(find)));
}

function findSpritePath(find) {
  const frames = find.definition.animationFrames;
  if (!Array.isArray(frames) || frames.length === 0) return find.definition.path;
  if (!find.resolved) return frames[0];
  if (reducedMotion || !Number.isFinite(find.resolvedAt)) return frames.at(-1);
  const frameDuration = 0.09;
  const frame = Math.min(
    frames.length - 1,
    Math.max(0, Math.floor((elapsed - find.resolvedAt) / frameDuration)),
  );
  return frames[frame];
}

function captureRun() {
  run.depth = dungeon.depth;
  run.knowledge = createItemKnowledge(run.knowledge);
  run.hero = {
    x: Math.floor(hero.x / TILE),
    y: Math.floor(hero.y / TILE),
    hp: hero.hp,
    maxHp: hero.maxHp,
    level: hero.level,
    xp: hero.xp,
    power: hero.power,
    hunger: hero.hunger,
    meal: createMealState(hero.meal),
    effects: createActorEffects(hero.effects),
    skills: cloneSkillState(hero.skills),
    skillStudy: createBookStudy(hero.skillStudy),
    intelligence: hero.intelligence,
    spells: createSpellState(hero.spells),
  };
  run.gold = gold;
  run.status = runStatus;
  run.started = playerHasActed;
  run.equipment = { ...selected };
  run.inventory = backpackItems.filter(Boolean).map(({ uid }) => uid);
  const activeUids = new Set([...run.inventory, ...Object.values(selected).filter(Boolean)]);
  run.items = [...itemInstances.values()]
    .filter((item) => activeUids.has(item.uid))
    .map(({ id, uid, stack, affixIds, artifactPowerId, artifactCurseId }) => ({
      id,
      uid,
      ...(stack ? { stack } : {}),
      ...(affixIds ? { affixIds: [...affixIds] } : {}),
      ...(artifactPowerId ? { artifactPowerId, artifactCurseId: artifactCurseId ?? null } : {}),
    }));
  run.floor.revealed = [...revealed];
  run.floor.detectedTrapIds = [...detectedTrapIds].sort();
  run.floor.disarmedTrapIds = [...run.floor.disarmedTrapIds].sort();
  run.floor.placedTraps = placedTraps.map((trap) => ({ ...trap }));
  run.floor.resolvedFindIds = findDefinitions
    .filter(({ resolved }) => resolved)
    .map(({ instanceId }) => instanceId)
    .sort();
  run.floor.chests = run.floor.chests.map((container) => ({
    ...container,
    items: container.items.map((item) => ({
      id: item.id,
      uid: item.uid,
      ...(item.stack ? { stack: item.stack } : {}),
      ...(item.affixIds ? { affixIds: [...item.affixIds] } : {}),
      ...(item.artifactPowerId
        ? {
            artifactPowerId: item.artifactPowerId,
            artifactCurseId: item.artifactCurseId ?? null,
          }
        : lootById(item.id)?.slot
          ? { artifactPowerId: null, artifactCurseId: null }
          : {}),
    })),
  }));
  run.floor.merchants = run.floor.merchants.map((merchantState) => ({
    merchantId: merchantState.merchantId,
    gold: merchantState.gold,
    purchasedEntryIds: [...merchantState.purchasedEntryIds],
    buyback: merchantState.buyback.map(({ record, price }) => ({
      price,
      record: {
        id: record.id,
        uid: record.uid,
        ...(record.stack ? { stack: record.stack } : {}),
        ...(record.affixIds ? { affixIds: [...record.affixIds] } : {}),
        ...(record.artifactPowerId
          ? {
              artifactPowerId: record.artifactPowerId,
              artifactCurseId: record.artifactCurseId ?? null,
            }
          : lootById(record.id)?.slot
            ? { artifactPowerId: null, artifactCurseId: null }
            : {}),
      },
    })),
  }));
  run.floor.monsters = monsters
    .filter((monster) => monster.dead === 0)
    .map((monster) => ({
      instanceId: monster.instanceId,
      x: monster.x / TILE - 0.5,
      y: monster.y / TILE - 0.5,
      hp: monster.hp,
      attackSequence: monster.attackSequence,
      effects: createActorEffects(monster.effects),
    }));
  run.floor.passives = passiveCreatures.map((creature) => ({
    instanceId: creature.instanceId,
    x: creature.x / TILE - 0.5,
    y: creature.y / TILE - 0.5,
    wanderStep: creature.wanderStep,
    facing: creature.facing,
    hunted: creature.hunted,
    defeated: creature.defeated,
    hp: creature.hp,
    attackSequence: creature.attackSequence,
  }));
  return run;
}

function persistRun() {
  try {
    const snapshot = captureRun();
    if (!validateRun(snapshot)) return;
    const previous = localStorage.getItem(SAVE_KEY);
    if (previous) {
      try {
        const candidate = JSON.parse(previous);
        if (validateRun(candidate)) localStorage.setItem(`${SAVE_KEY}:backup`, previous);
      } catch {
        // Keep the existing last-good backup when primary is malformed.
      }
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  } catch {
    // Private browsing or a full quota should not interrupt the run.
  }
}

function hash(x, y, salt = 0) {
  let value = Math.imul(x + 41 + salt, 374761393) ^ Math.imul(y + 73 + dungeon.seed, 668265263);
  value = (value ^ (value >>> 13)) >>> 0;
  return value;
}

function image(path) {
  return images.get(path);
}

function equippedItem(slot) {
  const uid = selected[slot];
  return uid ? itemInstances.get(uid) ?? null : null;
}

function presentedItem(item) {
  const identificationGroup = item?.identification?.group;
  const presentation = itemIdentificationView({
    item,
    seed: run.seed,
    knowledge: run.knowledge,
    identityIds: IDENTIFIABLE_LOOT_IDS_BY_GROUP[identificationGroup] ?? [],
  });
  const iconPath = presentation.icon
    ?? item.icon
    ?? lootById(item.id)?.icon
    ?? 'item/misc/misc_orb.png';
  const visual = runtimeVisual(
    'loot', presentation.id, 'icon', iconPath, 1, -7,
  );
  return {
    ...presentation,
    icon: visual.path,
    visualScale: visual.scale,
    visualOffsetY: visual.offsetY,
  };
}

function currentAppraisal(item) {
  return appraiseItem({
    knowledge: run.knowledge,
    item,
    capabilities: currentSkillCapabilities(),
    identifiableIds: IDENTIFIABLE_LOOT_IDS,
  });
}

function currentSkillOptions() {
  return { rankAdjustments: hero.skillStudy.rankAdjustments };
}

function currentSkillCapabilities() {
  return deriveSkillCapabilities(hero.skills, currentSkillOptions());
}

function visualForItem(item, renderedSlot = item?.slot) {
  return equipmentVisualForItem(item, renderedSlot);
}

function currentHeroStats(equipment = selected, items = itemInstances) {
  return deriveHeroStats(hero, equipment, items, currentSkillOptions());
}

function currentWeaponLoadout() {
  return resolveWeaponLoadout(equippedItem('hand1'), equippedItem('hand2'));
}

function currentHeroMagic() {
  const gear = equipmentMagic(selected, itemInstances);
  const spells = spellMagic(hero.spells, currentHeroStats().intelligence);
  return Object.freeze({
    ...gear,
    flight: gear.flight || spells.flight,
    invisibility: gear.invisibility || spells.invisibility,
  });
}

function isHeroConcealed() {
  return currentHeroMagic().invisibility && hero.invisibilityReveal <= 0;
}

function currentHeroCombat() {
  const combat = weaponCombatProfile(equippedItem('hand1'), equippedItem('hand2'));
  const attackSpeed = currentHeroStats().attackSpeed;
  return {
    ...combat,
    cooldown: combat.cooldown / attackSpeed,
    attackDuration: combat.attackDuration / Math.sqrt(attackSpeed),
  };
}

function currentHeroCleave() {
  return axeCleaveProfile(currentWeaponLoadout().primary, currentSkillCapabilities());
}

// Weapon techniques read the equipped item, not the combat profile: the family
// lives on the item, exactly as the sword rhythm and the axe cleave expect.
function currentDaggerProfile() {
  return daggerProfile(currentWeaponLoadout().primary, currentSkillCapabilities());
}

function currentBluntProfile() {
  return bluntProfile(currentWeaponLoadout().primary, currentSkillCapabilities());
}

function currentSpearProfile() {
  return spearProfile(currentWeaponLoadout().primary, currentSkillCapabilities());
}

function currentMarksmanProfile() {
  return marksmanProfile(currentWeaponLoadout().primary, currentSkillCapabilities());
}

function currentMobilityProfile() {
  return mobilityProfile(currentSkillCapabilities());
}

function currentDarkvisionProfile() {
  return darkvisionProfile(currentSkillCapabilities());
}

function currentStealthProfile() {
  return stealthProfile(currentSkillCapabilities());
}

function currentSecretSearchProfile() {
  return secretSearchProfile(currentSkillCapabilities());
}

function currentCampProfile() {
  return campProfile(currentSkillCapabilities());
}

/** The camp's furniture: props the hero put there, not the dungeon. */
const CAMP_PROP_VISUALS = Object.freeze({
  fire: Object.freeze({
    path: CAMP_FIRE_FRAMES[0],
    frames: CAMP_FIRE_FRAMES,
    size: 62,
    screenOffsetY: -10,
    light: Object.freeze({ color: '#d88447', radius: 2.35, beam: false }),
    interactionId: 'campfire',
  }),
  bedroll: Object.freeze({
    path: CAMP_BEDROLL_PATH,
    frames: Object.freeze([CAMP_BEDROLL_PATH]),
    size: 58,
    screenOffsetY: -2,
    light: null,
    interactionId: 'camp-rest',
  }),
  chest: Object.freeze({
    path: CAMP_CHEST_PATH,
    frames: Object.freeze([CAMP_CHEST_PATH]),
    size: 60,
    screenOffsetY: -6,
    light: null,
    interactionId: 'camp-stash',
  }),
});

function campPropsFor(camp) {
  if (!camp) return [];
  return camp.places.map(({ feature, x, y }) => {
    const visual = CAMP_PROP_VISUALS[feature];
    return Object.freeze({
      id: `camp-${feature}`,
      ...visual,
      gridX: x,
      gridY: y,
      x: x + 0.5,
      y: y + 0.5,
      phase: 0,
    });
  });
}

/** Rebuilds the environment so the camp's things live beside the dungeon's. */
function applyCampProps() {
  const withoutCamp = dungeonEnvironment.props.filter(({ id }) => !String(id).startsWith('camp-'));
  const props = [...withoutCamp, ...campPropsFor(run.floor.camp)];
  dungeonEnvironment = Object.freeze({ ...dungeonEnvironment, props: Object.freeze(props) });
}

function campKitCount() {
  return interactionResourceCount(CAMP_KIT_ITEM_ID);
}

/** Spends one kit and puts a camp on the floor, or explains why it cannot. */
function pitchCamp() {
  return placeCamp(currentCampProfile(), { needsKit: true });
}

/** The spell builds the same camp the skill would, and asks for no kit. */
function summonCamp() {
  return placeCamp(summonedCampProfile(currentSkillCapabilities()), { needsKit: false });
}

function placeCamp(profile, { needsKit = true } = {}) {
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const occupied = [
    ...monsters.filter((monster) => monster.dead === 0).map((monster) => monsterCellKey(monster, TILE)),
    ...passiveCreatures.filter((creature) => !creature.defeated).map((creature) => monsterCellKey(creature, TILE)),
    ...dungeonEnvironment.props.map(({ gridX, gridY }) => `${gridX},${gridY}`),
    ...findDefinitions.map((find) => `${Math.floor(find.x / TILE)},${Math.floor(find.y / TILE)}`),
    ...doorDefinitions.map((door) => `${door.x},${door.y}`),
    `${dungeon.exit.x},${dungeon.exit.y}`,
  ];
  const decision = canPitchCamp({
    profile,
    kits: campKitCount(),
    camp: run.floor.camp,
    grid: world,
    cell,
    occupied,
    // A wall between them is enough: only what can watch the spot forbids it.
    threats: monsters
      .filter((monster) => monster.dead === 0)
      .map((monster) => ({ x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) }))
      .filter((threat) => hasLineOfSight(world, threat, cell)),
    needsKit,
  });
  if (!decision.ok) {
    addCombatGlyph(hero.x, hero.y, '\u2302', '#b9aaa0', -66);
    return campRefusalText(decision.reason, itemDetailLanguage);
  }
  run.floor.camp = createCampState({
    cell,
    places: decision.places,
    rank: profile.rank,
    restPercent: profile.restPercent,
  });
  applyCampProps();
  for (const place of run.floor.camp.places) {
    revealAround(revealed, world, { x: place.x, y: place.y }, 1);
    burst((place.x + 0.5) * TILE, (place.y + 0.5) * TILE, '#d8bf68', 12);
  }
  playSound('chest');
  playerHasActed = true;
  return '';
}

function nearbyCampProp(interactionId) {
  if (runStatus !== 'playing' || !run.floor.camp) return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return dungeonEnvironment.props.find((prop) => (
    prop.interactionId === interactionId
    && Math.abs(cell.x - prop.gridX) + Math.abs(cell.y - prop.gridY) <= 1
  )) ?? null;
}

function campRestDecision() {
  return resolveCampRest({
    camp: run.floor.camp,
    hp: hero.hp,
    maxHp: currentHeroStats().maxHp,
    hunger: hero.hunger,
  });
}

function restAtCamp() {
  const result = campRestDecision();
  if (!result.ok) return false;
  hero.hp = result.hp;
  hero.hunger = result.hunger;
  run.floor.camp = result.camp;
  currentHungerStageId = hungerStage(hero.hunger).id;
  hungerAutosaveElapsed = 0;
  playerHasActed = true;
  burst(hero.x, hero.y - 10, '#9db4c8', 14);
  addCombatGlyph(hero.x, hero.y, `+${result.healed}`, '#8bc59c', -70);
  playSound('spell-heal');
  updateHud();
  persistRun();
  return true;
}

/** A secret shows itself only while a hero who can notice it stands near. */
function findIsVisible(find) {
  return !isSecretFind(find) || visibleSecretIds.has(find.instanceId);
}

function refreshVisibleSecrets() {
  const secrets = findDefinitions.filter((find) => isSecretFind(find) && !find.resolved);
  if (secrets.length === 0) {
    if (visibleSecretIds.size > 0) visibleSecretIds.clear();
    return;
  }
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const within = new Set(discoverSecrets({
    profile: currentSecretSearchProfile(),
    hero: heroCell,
    secrets: secrets.map((find) => ({
      instanceId: find.instanceId,
      x: Math.floor(find.x / TILE),
      y: Math.floor(find.y / TILE),
    })),
  }));
  for (const id of visibleSecretIds) {
    if (!within.has(id)) visibleSecretIds.delete(id);
  }
  for (const id of within) {
    if (visibleSecretIds.has(id)) continue;
    visibleSecretIds.add(id);
    const find = secrets.find(({ instanceId }) => instanceId === id);
    if (!find) continue;
    burst(find.x, find.y - 6, '#d8bf68', 14);
    addCombatGlyph(find.x, find.y, '\u25c7', '#e6d79a', -54);
    playSound('ui-tap');
  }
}

function combatTempo(cooldown) {
  if (cooldown <= 0.62) return 3;
  if (cooldown <= 0.9) return 2;
  return 1;
}

function currentItemState() {
  return {
    items: [...itemInstances.values()],
    inventory: backpackItems.filter(Boolean).map((item) => item.uid),
    equipment: { ...selected },
  };
}

function nextGameCommand(type, targetId, payload = {}) {
  run.commandSequence += 1;
  return createGameCommand({
    streamId: `run:${run.seed}:${dungeon.depth}`,
    sequence: run.commandSequence,
    type,
    targetId,
    payload,
  });
}

function applySurvivalItemState(state) {
  if (!Array.isArray(state?.items) || !Array.isArray(state?.inventory)) return false;
  applyItemState({ ...state, equipment: { ...selected } });
  renderPack();
  return true;
}

function applyGameEvents(events) {
  for (const event of events) {
    if (event.type === 'wildlife-alerted') {
      addCombatGlyph(hero.x, hero.y, '!', '#d8bd68', -56);
      continue;
    }
    if (event.type === 'wildlife-defeated') {
      const definition = lootById(event.payload.itemId);
      showLootToast(
        definition,
        event.payload.stored ? event.payload.amount : 'full',
      );
      continue;
    }
    if (event.type === 'meat-cooked') {
      showLootToast(lootById(event.payload.itemId), event.payload.amount);
    }
  }
}

function heroNearSanctuary() {
  if (!dungeon.sanctuary || runStatus !== 'playing' || hero.dead) return false;
  const x = Math.floor(hero.x / TILE);
  const y = Math.floor(hero.y / TILE);
  return Math.abs(x - dungeon.sanctuary.x) + Math.abs(y - dungeon.sanctuary.y) <= 1;
}

function interactionResourceCount(itemId) {
  return backpackItems.reduce(
    (total, item) => total + (item?.id === itemId ? item.stack ?? 1 : 0),
    0,
  );
}

function currentInteractionActor() {
  return {
    resources: {
      keyCount: interactionResourceCount(CHEST_RESOURCE_IDS.key),
      lockpickCount: interactionResourceCount(CHEST_RESOURCE_IDS.lockpick),
      rawMeatCount: interactionResourceCount(RAW_MEAT_ITEM_ID),
    },
    capabilities: currentSkillCapabilities(),
    gold,
    vitals: {
      hp: hero.hp,
      maxHp: currentHeroStats().maxHp,
      effects: createActorEffects(hero.effects),
    },
  };
}

function consumeInteractionResources(consumed = []) {
  if (!Array.isArray(consumed)) return false;
  const required = new Map();
  for (const entry of consumed) {
    if (!entry || typeof entry.id !== 'string' || !Number.isInteger(entry.amount) || entry.amount < 0) {
      return false;
    }
    required.set(entry.id, (required.get(entry.id) ?? 0) + entry.amount);
  }
  if ([...required].some(([id, amount]) => interactionResourceCount(id) < amount)) return false;
  for (const [id, amount] of required) {
    let remaining = amount;
    for (let index = 0; index < backpackItems.length && remaining > 0; index += 1) {
      const item = backpackItems[index];
      if (item?.id !== id) continue;
      const stack = item.stack ?? 1;
      const used = Math.min(stack, remaining);
      remaining -= used;
      if (used < stack) {
        item.stack = stack - used;
      } else {
        itemInstances.delete(item.uid);
        backpackItems.splice(index, 1);
        index -= 1;
      }
    }
  }
  return true;
}

function selectedUiItem() {
  if (selectedEquipmentSlot) {
    const equipped = equippedItem(selectedEquipmentSlot);
    if (equipped) return { item: equipped, source: 'equipment', slot: selectedEquipmentSlot };
    selectedEquipmentSlot = null;
  }
  const packed = backpackItems[selectedPackIndex];
  if (packed) return { item: packed, source: 'pack', index: selectedPackIndex };
  return null;
}

function selectedActionModel(selection = selectedUiItem()) {
  const labels = currentMainMenuModel().labels;
  if (!selection) return { label: '', ariaLabel: '', glyph: '·', disabled: true };
  if (selection.source === 'equipment') {
    const disabled = currentItemState().inventory.length >= 12;
    return {
      label: disabled ? labels.inventoryFullShort : labels.unequipShort,
      ariaLabel: disabled ? labels.inventoryFullShort : labels.unequip,
      glyph: disabled ? '■' : '▼',
      disabled,
    };
  }
  if (selection.item.interactionResource) {
    return {
      label: itemDetailLanguage === 'ru' ? 'Для объектов' : 'For objects',
      ariaLabel: itemDetailLanguage === 'ru'
        ? 'Используется через действие объекта'
        : 'Used through a world object action',
      glyph: selection.item.interactionResource === 'key' ? '⌑' : '⌁',
      disabled: true,
    };
  }
  if (selection.item.placeableTrap) {
    const tier = currentSkillCapabilities().trapPlacementTier;
    const enabled = tier > 0 && runStatus === 'playing' && !hero.dead;
    return {
      label: enabled
        ? itemDetailLanguage === 'ru' ? 'Поставить' : 'Place'
        : itemDetailLanguage === 'ru' ? 'Нужен навык' : 'Skill required',
      ariaLabel: enabled
        ? itemDetailLanguage === 'ru' ? 'Выбрать клетку для капкана' : 'Choose a tile for the trap'
        : itemDetailLanguage === 'ru' ? 'Нужен навык «Ловушечник» 1' : 'Trap setting 1 required',
      glyph: '⌖',
      disabled: !enabled,
    };
  }
  if (isIdentifiableItem(selection.item)) {
    const appraisal = currentAppraisal(selection.item);
    if (appraisal.ok) {
      return {
        label: itemDetailLanguage === 'ru' ? 'Опознать' : 'Identify',
        ariaLabel: itemDetailLanguage === 'ru'
          ? 'Опознать предмет без использования'
          : 'Identify the item without using it',
        glyph: '?',
        disabled: false,
      };
    }
  }
  if (selection.item.kind === 'book') {
    return {
      label: itemDetailLanguage === 'ru' ? 'Читать' : 'Read',
      ariaLabel: itemDetailLanguage === 'ru' ? 'Прочитать выбранную книгу' : 'Read the selected book',
      glyph: '▤',
      disabled: false,
    };
  }
  if (selection.item.slot) {
    const result = equipInventoryItem(currentItemState(), selection.item.uid);
    const inventoryBlocked = !result.ok && result.reason === 'inventory-full';
    return {
      label: inventoryBlocked ? labels.inventoryFullShort : labels.equipShort,
      ariaLabel: inventoryBlocked ? labels.inventoryFullShort : labels.equip,
      glyph: inventoryBlocked ? '■' : '▲',
      disabled: !result.ok,
    };
  }
  return { label: labels.useShort, ariaLabel: labels.use, glyph: '●', disabled: false };
}

function selectedActionStats(selection = selectedUiItem()) {
  if (!selection?.item.slot) return null;
  const state = currentItemState();
  const result = selection.source === 'equipment'
    ? unequipItem(state, selection.slot)
    : equipInventoryItem(state, selection.item.uid);
  if (!result.ok) return null;
  return {
    before: currentHeroStats(),
    after: deriveHeroStats(hero, result.state.equipment, result.state.items, currentSkillOptions()),
  };
}

function comparisonCopy(row) {
  const sign = row.delta > 0 ? '+' : '−';
  return `${sign}${Math.abs(row.delta)}${row.suffix}`;
}

function renderItemDetail(item) {
  const selection = selectedUiItem();
  const displayItem = presentedItem(item);
  const presentation = itemPresentation(
    displayItem,
    itemDetailLanguage,
    selection?.item.uid === item.uid ? selectedActionStats(selection) : null,
  );
  const color = rarityGlow[displayItem.rarity] ?? rarityGlow[0];
  itemDetail.lang = itemDetailLanguage;
  itemDetailCard.style.setProperty('--rarity', color);
  itemDetailName.textContent = presentation.name;
  itemDetailRarity.textContent = `${presentation.rarity} ${presentation.rarityMarks}`;
  itemDetailSlot.textContent = presentation.slot;
  itemDetailIcon.src = assetUrl(displayItem.icon);
  itemDetailDescription.textContent = presentation.description;
  itemDetailComparison.hidden = presentation.comparison.length === 0;
  itemDetailComparisonTitle.textContent = selection?.source === 'equipment'
    ? itemDetailLanguage === 'ru' ? 'После снятия' : 'After unequipping'
    : itemDetailLanguage === 'ru' ? 'После надевания' : 'After equipping';
  itemDetailComparisonList.replaceChildren(
    ...presentation.comparison.map((row) => {
      const line = document.createElement('li');
      const glyph = document.createElement('b');
      const copy = document.createElement('span');
      glyph.textContent = row.icon;
      copy.textContent = `${row.label}: ${row.from}${row.suffix} → ${row.to}${row.suffix} (${comparisonCopy(row)})`;
      line.className = row.positive ? 'positive' : 'negative';
      line.append(glyph, copy);
      return line;
    }),
  );
  itemDetailEffectsTitle.textContent = itemDetailLanguage === 'ru' ? 'Свойства' : 'Effects';
  itemDetailEffectsRegion.setAttribute(
    'aria-label',
    itemDetailLanguage === 'ru' ? 'Свойства предмета' : 'Item effects',
  );
  itemDetailEffects.replaceChildren(
    ...presentation.effects.map(({ icon, text }) => {
      const row = document.createElement('li');
      const glyph = document.createElement('b');
      const copy = document.createElement('span');
      glyph.textContent = icon;
      copy.textContent = text;
      row.append(glyph, copy);
      return row;
    }),
  );
  const action = selectedActionModel(selection);
  itemDetailAction.textContent = action.label;
  itemDetailAction.setAttribute('aria-label', action.ariaLabel);
  itemDetailAction.disabled = action.disabled || !selection || selection.item.uid !== item.uid;
  closeItemDetailButton.setAttribute(
    'aria-label',
    itemDetailLanguage === 'ru' ? 'Закрыть описание' : 'Close item details',
  );
  itemDetail.setAttribute(
    'aria-label',
    itemDetailLanguage === 'ru' ? `Описание: ${presentation.name}` : `Details: ${presentation.name}`,
  );
}

function learnHeroSkill(skillId, expectedRank) {
  const result = learnSkill({
    state: hero.skills,
    heroLevel: hero.level,
    runStatus,
    skillId,
    expectedRank,
    attributes: { intelligence: currentHeroStats().intelligence },
  });
  if (!result.ok) return result;
  hero.skills = result.state;
  hero.hp = Math.min(hero.hp, currentHeroStats().maxHp);
  discoverNearbyTraps();
  updateGearUi();
  renderPack();
  updateHud();
  persistRun();
  return result;
}

function renderCharacterSkills() {
  const model = skillMenuModel({
    state: hero.skills,
    heroLevel: hero.level,
    runStatus,
    language: itemDetailLanguage,
    rankAdjustments: hero.skillStudy.rankAdjustments,
    attributes: { intelligence: currentHeroStats().intelligence },
  });
  characterSkills.hidden = !model.visible;
  characterSkillsTitle.textContent = model.title;
  characterSkillPoints.textContent = `${model.pointsLabel}: ${model.points}`;
  characterSkillGroups.replaceChildren(...model.groups.map((group) => {
    const section = document.createElement('section');
    section.className = 'character-skill-group';
    const heading = document.createElement('h4');
    heading.textContent = group.label;
    section.append(heading);
    for (const skill of group.skills) {
      const row = document.createElement('article');
      row.className = 'character-skill-row';
      const details = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = `${skill.name} ${skill.rank}/${skill.maxRank}${skill.rankAdjustmentLabel ? ` · ${skill.rankAdjustmentLabel}` : ''}`;
      const description = document.createElement('p');
      description.textContent = skill.description;
      details.append(name, description);
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.skillId = skill.id;
      button.disabled = !skill.canLearn;
      button.textContent = skill.canLearn ? skill.actionLabel : skill.reasonLabel;
      button.setAttribute('aria-label', `${skill.name}: ${button.textContent}`);
      button.addEventListener('click', () => {
        if (uiScreen !== 'character' || hero.dead || runStatus !== 'playing') return;
        const result = learnHeroSkill(skill.id, skill.trainedRank);
        if (!result.ok) return;
        renderCharacterSheet();
        const nextButton = [...characterSkills.querySelectorAll('button')]
          .find((candidate) => candidate.dataset.skillId === skill.id && !candidate.disabled);
        (nextButton ?? closeCharacterSheetButton).focus();
      });
      row.append(details, button);
      section.append(row);
    }
    return section;
  }));
}

function spellCooldownSnapshot() {
  return Object.fromEntries(Object.entries(spellCooldowns).map(([id, seconds]) => [id, seconds]));
}

function renderSpellBar() {
  const model = spellBarModel({
    state: hero.spells,
    intelligence: currentHeroStats().intelligence,
    cooldowns: spellCooldownSnapshot(),
    language: itemDetailLanguage,
  });
  spellBar.setAttribute('aria-label', model.label);
  // Hide the whole column until the hero prepares a first spell.
  spellBar.dataset.empty = String(model.slots.every((slot) => slot.empty));
  for (const slot of model.slots) {
    const button = spellActionButtons[slot.index];
    const icon = button.querySelector('img');
    const cooldown = button.querySelector('output');
    button.setAttribute('aria-label', `${slot.index + 1}. ${slot.label}`);
    button.title = slot.label;
    button.dataset.active = String(Boolean(slot.active));
    button.style.setProperty('--spell-color', slot.color ?? '#778284');
    button.style.setProperty('--cooldown', String(slot.cooldownProgress ?? 0));
    button.disabled = slot.empty || slot.intelligenceLocked || slot.cooldown > 0
      || runStatus !== 'playing' || hero.dead;
    icon.hidden = slot.empty;
    if (!slot.empty) icon.src = assetUrl(slot.icon);
    cooldown.textContent = slot.cooldown > 0 ? String(Math.ceil(slot.cooldown)) : '';
  }
}

function setPreparedSpell(slotIndex, spellId) {
  const result = prepareSpell(hero.spells, slotIndex, spellId);
  if (!result.ok) return false;
  hero.spells = result.state;
  selectedSpellSlot = slotIndex;
  renderSpellBar();
  renderCharacterSpells();
  persistRun();
  return true;
}

function renderCharacterSpells() {
  const stats = currentHeroStats();
  const bar = spellBarModel({
    state: hero.spells,
    intelligence: stats.intelligence,
    language: itemDetailLanguage,
  });
  const known = knownSpellModel(hero.spells, stats.intelligence, itemDetailLanguage);
  const ru = itemDetailLanguage !== 'en';
  characterSpells.hidden = known.length === 0;
  characterSpellsTitle.textContent = ru ? 'Заклинания' : 'Spells';
  characterSpellsHint.textContent = ru
    ? 'Выбери слот, затем заклинание'
    : 'Choose a slot, then a spell';
  characterSpellsIntelligence.textContent = `✧ ${stats.intelligence}`;
  characterSpellSlots.replaceChildren(...bar.slots.map((slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-spell-slot';
    button.dataset.spellSlot = String(slot.index);
    button.style.setProperty('--spell-color', slot.color ?? '#697577');
    button.setAttribute('aria-pressed', String(slot.index === selectedSpellSlot));
    button.setAttribute('aria-label', `${slot.index + 1}. ${slot.label}`);
    const number = document.createElement('b');
    number.textContent = String(slot.index + 1);
    const icon = document.createElement('img');
    icon.alt = '';
    icon.hidden = slot.empty;
    if (!slot.empty) icon.src = assetUrl(slot.icon);
    const copy = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = slot.empty ? (ru ? 'Пусто' : 'Empty') : slot.name;
    const kind = document.createElement('small');
    kind.textContent = slot.empty ? (ru ? 'Выбери заклинание' : 'Choose a spell') : slot.status;
    copy.append(name, kind);
    button.append(number, icon, copy);
    button.addEventListener('click', () => {
      selectedSpellSlot = slot.index;
      renderCharacterSpells();
      requestAnimationFrame(() => characterSpellSlots.querySelector(`[data-spell-slot="${slot.index}"]`)?.focus());
    });
    return button;
  }));
  characterKnownSpells.replaceChildren(...known.map((spell) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'known-spell';
    button.dataset.spellId = spell.id;
    button.dataset.locked = String(spell.intelligenceLocked);
    button.dataset.prepared = String(spell.preparedSlot >= 0);
    button.style.setProperty('--spell-color', spell.color);
    button.setAttribute(
      'aria-label',
      `${spell.name}. ${spell.description}. ${spell.requirement}`,
    );
    const icon = document.createElement('img');
    icon.alt = '';
    icon.src = assetUrl(spell.icon);
    const copy = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = spell.name;
    const details = document.createElement('small');
    details.textContent = `${spell.kind} · ${spell.requirement}`;
    copy.append(name, details);
    const slot = document.createElement('b');
    slot.textContent = spell.preparedSlot >= 0 ? ['I', 'II', 'III'][spell.preparedSlot] : '+';
    button.append(icon, copy, slot);
    button.addEventListener('click', () => {
      const shouldClear = spell.preparedSlot === selectedSpellSlot;
      setPreparedSpell(selectedSpellSlot, shouldClear ? null : spell.id);
      requestAnimationFrame(() => characterKnownSpells.querySelector(`[data-spell-id="${spell.id}"]`)?.focus());
    });
    return button;
  }));
}

function renderCharacterSheet() {
  const stats = currentHeroStats();
  const combat = currentHeroCombat();
  const model = characterSheetModel({
    language: itemDetailLanguage,
    hero,
    stats,
    combat,
    damage: combatDamage(stats, combat),
    baseMoveSpeed: HERO_BASE_MOVE_SPEED,
    depthLabel: romanDepth(dungeon.depth),
  });
  characterSheet.lang = model.language;
  characterSheetTitle.textContent = model.title;
  characterLevel.textContent = model.levelText;
  characterFloor.textContent = model.floorText;
  characterExperienceText.textContent = model.experienceText;
  characterExperienceFill.style.transform = `scaleX(${model.experienceProgress})`;
  characterExperienceBar.setAttribute('aria-valuenow', String(Math.round(model.experienceProgress * 100)));
  characterExperienceBar.setAttribute('aria-label', model.experienceText);
  characterStatList.replaceChildren(
    ...model.statRows.map((stat) => {
      const row = document.createElement('article');
      row.className = 'character-stat-row';
      row.dataset.stat = stat.id;
      row.setAttribute('role', 'listitem');
      const icon = document.createElement('b');
      const label = document.createElement('strong');
      const value = document.createElement('output');
      const description = document.createElement('p');
      icon.textContent = stat.icon;
      label.textContent = stat.label;
      value.textContent = stat.value;
      description.textContent = stat.description;
      row.append(icon, label, value, description);
      return row;
    }),
  );
  characterCombatTitle.textContent = model.combatTitle;
  renderCharacterSpells();
  renderCharacterSkills();
  characterCombatGrid.replaceChildren(
    ...model.combatRows.map((stat) => {
      const row = document.createElement('div');
      row.className = 'character-combat-stat';
      const label = document.createElement('span');
      const value = document.createElement('b');
      label.textContent = stat.label;
      value.textContent = stat.value;
      row.append(label, value);
      return row;
    }),
  );
  characterSheetLanguageButton.textContent = model.nextLanguage;
  characterSheetLanguageButton.setAttribute(
    'aria-label',
    model.nextLanguage === 'EN' ? 'Read in English' : 'Читать по-русски',
  );
  characterSheetButton.setAttribute(
    'aria-label',
    model.language === 'ru' ? 'Открыть характеристики персонажа' : 'Open character sheet',
  );
  characterSheet.setAttribute(
    'aria-label',
    model.language === 'ru' ? 'Характеристики персонажа' : 'Character sheet',
  );
  closeCharacterSheetButton.setAttribute(
    'aria-label',
    model.language === 'ru' ? 'Закрыть характеристики' : 'Close character sheet',
  );
}

function openItemDetail(item, returnTarget = null) {
  if (!item || salvageMode) return;
  itemDetailItem = item;
  itemDetailReturnTarget = returnTarget;
  renderItemDetail(item);
  inventoryShell.inert = true;
  itemDetail.inert = false;
  itemDetail.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => closeItemDetailButton.focus());
}

function itemDetailIsOpen() {
  return itemDetail.getAttribute('aria-hidden') === 'false';
}

function closeItemDetail({ restoreFocus = true } = {}) {
  if (!itemDetailIsOpen()) return false;
  itemDetail.setAttribute('aria-hidden', 'true');
  itemDetail.inert = true;
  inventoryShell.inert = false;
  const returnTarget = itemDetailReturnTarget;
  itemDetailItem = null;
  itemDetailReturnTarget = null;
  if (restoreFocus) {
    requestAnimationFrame(() => {
      const selector = returnTarget?.source === 'equipment'
        ? `[data-equipped-slot="${returnTarget.slot}"]`
        : returnTarget?.source === 'pack'
          ? `[data-pack-index="${returnTarget.index}"]`
          : null;
      (selector ? inventoryShell.querySelector(selector) : closeInventoryButton)?.focus();
    });
  }
  return true;
}

function applyItemState(state) {
  const normalizedItems = state.items
    .map((item) => (item?.icon ? item : materializeInventoryItem(item)))
    .filter(Boolean);
  itemInstances = new Map(normalizedItems.map((item) => [item.uid, item]));
  backpackItems = state.inventory.map((uid) => itemInstances.get(uid)).filter(Boolean);
  Object.assign(selected, state.equipment);
  hero.hp = Math.min(hero.hp, currentHeroStats().maxHp);
  cleanseEquippedWards();
  updateHud();
}

function objectiveBossDefeated() {
  return Boolean(
    dungeon.objective && run.floor.defeated.includes(dungeon.objective.bossInstanceId),
  );
}

function artifactAvailable() {
  return canClaimFinalArtifact({
    depth: dungeon.depth,
    status: runStatus,
    bossDefeated: objectiveBossDefeated(),
  });
}

function activeBoss() {
  if (!dungeon.objective) return null;
  return monsters.find(
    (monster) => monster.instanceId === dungeon.objective.bossInstanceId && monster.dead === 0,
  ) ?? null;
}

function resize() {
  renderedScreen = null;
  viewportWidth = innerWidth;
  viewportHeight = innerHeight;
  deviceScale = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(viewportWidth * deviceScale));
  canvas.height = Math.max(1, Math.floor(viewportHeight * deviceScale));
  canvas.style.width = `${viewportWidth}px`;
  canvas.style.height = `${viewportHeight}px`;
  context.imageSmoothingEnabled = false;
  dungeonWorld3D.resize(viewportWidth, viewportHeight, deviceScale);
  atmosphereCanvas.width = Math.max(1, Math.ceil(viewportWidth / PIXEL_EFFECT_SCALE));
  atmosphereCanvas.height = Math.max(1, Math.ceil(viewportHeight / PIXEL_EFFECT_SCALE));
  atmosphereContext.imageSmoothingEnabled = false;
  voidSkyCanvas.width = Math.max(1, Math.ceil(viewportWidth / VOID_STAR_SCALE));
  voidSkyCanvas.height = Math.max(1, Math.ceil(viewportHeight / VOID_STAR_SCALE));
  voidSkyContext.imageSmoothingEnabled = false;
  if (trapPlacementState) renderTrapPlacementTargets();
  if (abilityTargetingState) renderAbilityTargetingTargets();
}

function isWalkable(x, y) {
  return x >= 0 && y >= 0 && x < WORLD_WIDTH && y < WORLD_HEIGHT && (world[y][x] === '.' || world[y][x] === '~');
}

function isHeroWalkable(x, y) {
  if (x < 0 || y < 0 || x >= (world[0]?.length ?? 0) || y >= world.length) return false;
  return world[y][x] === '.' || world[y][x] === '~';
}

function heroInWater() {
  return isWaterCell(world, Math.floor(hero.x / TILE), Math.floor(hero.y / TILE));
}

/** Wading: in the water and not flying over it. */
function heroWading() {
  return heroInWater() && !currentHeroMagic().flight;
}

/** Keeps a wading hero wet and splashes on entry; leaving lets the timer run out. */
function updateHeroTerrain() {
  const wading = !hero.dead && heroWading();
  if (wading && (hero.effects.wet ?? 0) < WATER_WET_REFRESH_BELOW) {
    hero.effects = applyActorEffect(hero.effects, 'wet', WATER_WET_DURATION).effects;
  }
  if (wading && !hero.wading) {
    playSound('splash');
    burst(hero.x, hero.y + 6, '#8fd0dc', 10);
  }
  if (wading !== Boolean(hero.wading)) {
    hero.wading = wading;
    updateHud();
  }
}

/** A dying creature can leave a cloud behind: everyone in reach takes its effect. */
function burstEffectAround(source) {
  const { id, duration, radius, color = '#9fb06a' } = source.burst;
  const reach = TILE * radius;
  burst(source.x, source.y - 8, color, 16);
  addImpactWave(source.x, source.y - 6, color, 58, 1);
  if (!hero.dead && Math.hypot(hero.x - source.x, hero.y - source.y) <= reach) {
    applyHeroStatus(id, duration);
  }
  for (const other of monsters) {
    if (other === source || other.dead > 0) continue;
    if (Math.hypot(other.x - source.x, other.y - source.y) > reach) continue;
    other.effects = applyActorEffect(other.effects, id, duration).effects;
  }
}

/**
 * The siren's song: one step toward her, which is one step into the water she
 * lives in. The pull replaces the player's route, so it is felt, not hidden.
 */
function dragHeroToward(source) {
  const from = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const stepX = Math.sign(Math.floor(source.x / TILE) - from.x);
  const stepY = Math.sign(Math.floor(source.y / TILE) - from.y);
  const horizontalFirst = Math.abs(source.x - hero.x) >= Math.abs(source.y - hero.y);
  const candidates = (horizontalFirst
    ? [{ x: from.x + stepX, y: from.y }, { x: from.x, y: from.y + stepY }]
    : [{ x: from.x, y: from.y + stepY }, { x: from.x + stepX, y: from.y }])
    .filter(({ x, y }) => (x !== from.x || y !== from.y)
      && isHeroWalkable(x, y)
      && !heroBlockingCells().has(`${x},${y}`));
  const cell = candidates[0];
  if (!cell) return;
  hero.path = [{ x: (cell.x + 0.5) * TILE, y: (cell.y + 0.5) * TILE }];
  hero.pendingAttack = null;
  addCombatGlyph(hero.x, hero.y, '~', '#7fd0e0', -66);
  addImpactWave(hero.x, hero.y - 6, '#7fd0e0', 46, 0);
}

/** An electric eel's bite arcs to everyone wet nearby, its own kind included. */
function shockWetActorsAround(source) {
  const radius = TILE * (source.shock?.radius ?? 2);
  let count = 0;
  for (const candidate of monsters) {
    if (candidate === source || candidate.dead > 0) continue;
    if (Math.hypot(candidate.x - source.x, candidate.y - source.y) > radius) continue;
    if (!(candidate.effects.wet > 0) && !actorInWater(world, candidate, TILE)) continue;
    addLightningArc(source, candidate);
    damageMonster(candidate, source.damage, '#8fdff2', {
      style: 'staff',
      projectile: true,
      sourceX: source.x,
      sourceY: source.y,
      vampiric: false,
    });
    burst(candidate.x, candidate.y - 8, '#bdf7ff', 12);
    count += 1;
  }
  if (count > 0) playStormCrackle(count);
}

function canActorsMelee(attacker, target) {
  return canActorsMeleeContact(world, attacker, target, TILE);
}

/** How far from its post the watch will wander while the city is quiet. */
const PATROL_RADIUS = 6;

function patrolRoll(monster) {
  let value = (monster.phase * 1000) >>> 0;
  value ^= Math.imul((monster.patrolStep ?? 0) + 1, 0x9e3779b1);
  value = Math.imul(value ^ (value >>> 15), 0x85ebca6b);
  return ((value ^ (value >>> 13)) >>> 0) / 0xffffffff;
}

function patrolTargetCell(monster) {
  const candidates = [];
  for (let dy = -PATROL_RADIUS; dy <= PATROL_RADIUS; dy += 1) {
    for (let dx = -PATROL_RADIUS; dx <= PATROL_RADIUS; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) > PATROL_RADIUS) continue;
      const x = monster.post.x + dx;
      const y = monster.post.y + dy;
      if (!isWalkable(x, y)) continue;
      candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(patrolRoll(monster) * candidates.length)];
}

/**
 * Gives an unalerted guard somewhere to walk. Returns true when it has a route,
 * so the ordinary movement code below carries it there.
 */
function patrolMonster(monster, delta, blockedCells) {
  if (!monster.neutral || monster.provoked || !monster.post) return false;
  if (monster.route.length > 0) return true;
  monster.patrolPause = Math.max(0, (monster.patrolPause ?? 0) - delta);
  if (monster.patrolPause > 0) return false;
  monster.patrolStep = (monster.patrolStep ?? 0) + 1;
  monster.patrolPause = 0.9 + (monster.phase % 1.4);
  const target = patrolTargetCell(monster);
  if (!target) return false;
  monster.route = findPath(target.x + 0.5, target.y + 0.5, {
    allowHidden: true,
    start: { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) },
    blockedCells,
    terrain: monster.terrain,
  });
  return monster.route.length > 0;
}

/** Hitting one guard puts the whole street on the hero. */
function provokeCityWatch(target) {
  for (const monster of monsters) {
    if (!monster.neutral || monster.dead > 0) continue;
    const distance = Math.hypot(monster.x - target.x, monster.y - target.y);
    if (monster !== target && distance > TILE * 9) continue;
    if (monster.provoked) continue;
    monster.provoked = true;
    monster.alerted = monster.pursuit;
    monster.alertFlash = 0.5;
    addCombatGlyph(monster.x, monster.y, '!', '#e0603f', -68);
  }
}

function monsterSeesHero(monster, distanceToHero) {
  // A neutral guard notices the hero only once the hero has given it a reason.
  if (monster.neutral && !monster.provoked) return false;
  if (isHeroConcealed()) return false;
  if (distanceToHero > TILE * stealthVisionRadius(monster.vision, currentStealthProfile())) return false;
  const from = { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) };
  const to = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return hasLineOfSight(world, from, to);
}

function canHeroAttack(monster, combat) {
  if (!isCurrentlyVisible(monster.x, monster.y)) return false;
  if (!combat.projectile && combat.style !== 'spear' && !canActorsMelee(hero, monster)) return false;
  const from = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const to = { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) };
  return canWeaponAttack(
    world,
    { x: hero.x / TILE, y: hero.y / TILE },
    { x: monster.x / TILE, y: monster.y / TILE },
    combat,
    !combat.projectile || hasLineOfSight(world, from, to),
  );
}

function isCurrentlyVisible(x, y) {
  const from = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const to = { x: Math.floor(x / TILE), y: Math.floor(y / TILE) };
  return Math.hypot(to.x - from.x, to.y - from.y) <= heroSightRadius(currentDarkvisionProfile())
    && hasLineOfSight(world, from, to);
}

function findPath(
  targetX,
  targetY,
  { allowHidden = false, start = null, blockedCells = null, allowBlockedEnd = true, allowedHazardCell = null, heroMovement = false, terrain = null } = {},
) {
  const startCell = start ?? { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const end = { x: Math.floor(targetX), y: Math.floor(targetY) };
  if (!(heroMovement ? isHeroWalkable(end.x, end.y) : isWalkable(end.x, end.y))) return [];
  if (!allowHidden && !revealed.has(`${end.x},${end.y}`)) return [];
  let navigationGrid = allowHidden
    ? world
    : world.map((row, y) => row.map((cell, x) => (revealed.has(`${x},${y}`) ? cell : '#')));
  // Water-bound creatures (an eel) only ever route through water.
  if (terrain?.land === 0) {
    navigationGrid = navigationGrid.map((row) => row.map((cell) => (cell === '~' ? cell : '#')));
  }
  // Enemy paths still use their own occupancy rules. Only the player's known
  // traps are obstacles; hidden mechanisms must not leak through route finding.
  const hazards = allowHidden || (heroMovement && currentHeroMagic().flight)
    ? new Set()
    : knownTrapCells();
  if (allowedHazardCell) hazards.delete(allowedHazardCell);
  const actors = allowHidden ? new Set() : heroBlockingCells();
  const finds = blockingFindCells();
  // A legacy save may already have two actors in the start cell. Let the hero
  // leave it; the continuous collision check still forbids moving inward.
  actors.delete(`${startCell.x},${startCell.y}`);
  if (
    (blockedCells instanceof Set && blockedCells.size > 0) ||
    hazards.size > 0 ||
    actors.size > 0 ||
    finds.size > 0
  ) {
    navigationGrid = navigationGrid.map((row, y) =>
      row.map((cell, x) =>
        (x !== startCell.x || y !== startCell.y) && (
          hazards.has(`${x},${y}`) || actors.has(`${x},${y}`) || finds.has(`${x},${y}`) ||
          (blockedCells?.has(`${x},${y}`) &&
          (!allowBlockedEnd || x !== end.x || y !== end.y))
        )
          ? '#'
          : cell,
      ),
    );
  }
  return findGridPath(navigationGrid, startCell, end).map((cell) => ({
    x: (cell.x + 0.5) * TILE,
    y: (cell.y + 0.5) * TILE,
  }));
}

function passiveOccupiedCells() {
  return blockingActorCells(passiveCreatures.filter((creature) => !creature.defeated), TILE);
}

function heroBlockingCells() {
  const merchants = (typeof merchantDefinitions === 'undefined' ? [] : merchantDefinitions)
    .map((merchant) => ({
      x: (merchant.x + 0.5) * TILE,
      y: (merchant.y + 0.5) * TILE,
    }));
  return blockingActorCells([
    ...monsters,
    ...passiveCreatures.filter((creature) => !creature.defeated),
    ...merchants,
  ], TILE);
}

function blockingFindCells() {
  return new Set(
    findDefinitions
      .filter(findIsVisible)
      .filter(
        (find) => !find.resolved || (find.id !== 'crystal-vein' && !find.consumedByMimic),
      )
      .map((find) => `${Math.floor(find.x / TILE)},${Math.floor(find.y / TILE)}`),
  );
}

function knownTrapCells() {
  return activeDetectedTrapCells({
    traps: trapDefinitions,
    detectedTrapIds: [...detectedTrapIds],
    resolvedEventIds: run.floor.resolved,
  });
}

function nearbyDetectedTrap() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const resolved = new Set(run.floor.resolved);
  return trapDefinitions
    .filter((trap) =>
      detectedTrapIds.has(trap.instanceId)
      && !resolved.has(trap.eventId)
      && Math.abs(cell.x - trap.x) + Math.abs(cell.y - trap.y) === 1)
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId))[0] ?? null;
}

function trapDisarmState(trap = nearbyDetectedTrap()) {
  if (!trap) return null;
  return trapDisarmAvailability({
    trap,
    detectedTrapIds: [...detectedTrapIds],
    resolvedEventIds: run.floor.resolved,
    disarmedTrapIds: run.floor.disarmedTrapIds,
    runStatus,
    hero: {
      x: Math.floor(hero.x / TILE),
      y: Math.floor(hero.y / TILE),
      hp: hero.hp,
    },
    capabilities: currentSkillCapabilities(),
  });
}

function interactNearbyTrap(preferredTrap = null) {
  const trap = preferredTrap ?? nearbyDetectedTrap();
  if (!trap || !ready || uiScreen !== 'game' || hero.dead || openingDoor) return false;
  const result = disarmTrap({
    trap,
    detectedTrapIds: [...detectedTrapIds],
    resolvedEventIds: run.floor.resolved,
    disarmedTrapIds: run.floor.disarmedTrapIds,
    runStatus,
    hero: {
      x: Math.floor(hero.x / TILE),
      y: Math.floor(hero.y / TILE),
      hp: hero.hp,
    },
    capabilities: currentSkillCapabilities(),
  });
  const presentation = trapDisarmPresentation({
    trap,
    effectiveTier: result.effectiveTier,
    language: itemDetailLanguage,
  });
  if (!result.ok) {
    if (['skill-required', 'tier-required'].includes(result.reason)) {
      trapAnnouncement.textContent = presentation.unavailable;
      addCombatGlyph((trap.x + 0.5) * TILE, (trap.y + 0.5) * TILE, '!', '#dec982', -36);
      showLootToast({ path: 'dngn/traps/blade.png', rarity: 1 }, ['I', 'II', 'III'][trap.tier - 1]);
    }
    return false;
  }

  hero.path = [];
  hero.attack = 0;
  hero.pendingAttack = null;
  permittedHazardCell = null;
  hazardInputState = createHazardInputState();
  run.floor.resolved = [...result.state.resolvedEventIds];
  run.floor.disarmedTrapIds = [...result.state.disarmedTrapIds];
  eventDefinitions = eventDefinitions.filter(({ instanceId }) => instanceId !== trap.eventId);
  playerHasActed = true;
  const x = (trap.x + 0.5) * TILE;
  const y = (trap.y + 0.5) * TILE;
  burst(x, y, '#9db0a6', 12);
  addImpactWave(x, y, '#7e9188', 42, 1);
  addCombatGlyph(x, y, '✓', '#c9d4c7', -34);
  showLootToast({ path: DISARMED_TRAP_PATH, rarity: 1 }, '✓');
  trapAnnouncement.textContent = presentation.success;
  updateHud();
  persistRun();
  return true;
}

function discoverNearbyTraps({ feedback = true } = {}) {
  if (hero.dead || runStatus !== 'playing') return false;
  const next = discoverTraps({
    traps: trapDefinitions,
    origin: { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) },
    capabilities: currentSkillCapabilities(),
    detectedTrapIds: [...detectedTrapIds],
    resolvedEventIds: run.floor.resolved,
    hasLineOfSight: (from, to) => hasLineOfSight(world, from, to),
  });
  const newlyDetected = next.filter((id) => !detectedTrapIds.has(id));
  if (newlyDetected.length === 0) return false;
  detectedTrapIds = new Set(next);
  const hazards = currentHeroMagic().flight ? new Set() : knownTrapCells();
  if (hero.path.some((target) => hazards.has(monsterCellKey(target, TILE)))) {
    hero.path = [];
    permittedHazardCell = null;
  }
  for (const id of newlyDetected) {
    const trap = trapDefinitions.find((candidate) => candidate.instanceId === id);
    if (!trap || !feedback) continue;
    const x = (trap.x + 0.5) * TILE;
    const y = (trap.y + 0.5) * TILE;
    burst(x, y - 5, '#c7ad63', 10);
    addImpactWave(x, y, '#c7ad63', 40, 0);
    addCombatGlyph(x, y, '!', '#dec982', -36);
  }
  if (feedback) {
    showLootToast({ path: 'dngn/traps/blade.png', rarity: 1 }, '!');
    trapAnnouncement.textContent = itemDetailLanguage === 'ru' ? 'Чутьё: ловушка обнаружена' : 'Trap Sense: trap detected';
  }
  persistRun();
  return true;
}

function warnTrapStep(cell) {
  const [x, y] = cell.split(',').map(Number);
  addCombatGlyph((x + 0.5) * TILE, (y + 0.5) * TILE, '!', '#dec982', -36);
  showLootToast({ path: 'dngn/traps/blade.png', rarity: 1 }, '!');
  trapAnnouncement.textContent = itemDetailLanguage === 'ru'
    ? 'Ловушка. Отпусти управление и нажми снова, если хочешь наступить.'
    : 'Trap. Release the control and press again to step on it deliberately.';
}

function requestHeroMove(targetX, targetY) {
  const target = { x: Math.floor(targetX), y: Math.floor(targetY) };
  const intent = hazardMoveIntent({
    state: hazardInputState,
    origin: { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) },
    target,
    knownCells: currentHeroMagic().flight ? new Set() : knownTrapCells(),
    gesture: inputGesture,
  });
  hazardInputState = intent.state;
  if (!intent.allowed) {
    hero.path = [];
    permittedHazardCell = null;
    if (intent.warn) warnTrapStep(`${target.x},${target.y}`);
    return false;
  }
  // Bumping a living enemy is a real player action, even when no route exists:
  // start the encounter, keep the pending swing, and let auto-combat resolve it.
  if (isHeroWalkable(target.x, target.y) && revealed.has(`${target.x},${target.y}`)) {
    playerHasActed = true;
  }
  let path = findPath(targetX, targetY, {
    blockedCells: passiveOccupiedCells(),
    allowBlockedEnd: false,
    allowedHazardCell: intent.permittedCell,
    heroMovement: true,
  });
  if (path.length === 0 && isHeroWalkable(target.x, target.y) && revealed.has(`${target.x},${target.y}`)) {
    const enemy = monsters.find((monster) => !monster.dead &&
      monsterCellKey(monster, TILE) === `${target.x},${target.y}`);
    const approach = enemy && meleeApproachPoint(hero, enemy, TILE);
    if (approach) path = [approach];
  }
  return commitHeroPath(path, intent.permittedCell);
}

function commitHeroPath(nextPath, allowedHazardCell = null) {
  if (!nextPath.length) return false;
  if (hero.attack > 0) {
    hero.attack = 0;
    hero.pendingAttack = null;
  }
  hero.path = nextPath;
  permittedHazardCell = allowedHazardCell;
  if (allowedHazardCell === null) hazardInputState = createHazardInputState();
  playerHasActed = true;
  return true;
}

function queueDirectionalMove(direction) {
  if (!ready || uiScreen !== 'game' || runStatus !== 'playing' || openingDoor) return false;
  const vector = directionVector(direction);
  if (!vector) return false;
  const targetX = Math.floor(hero.x / TILE) + vector[0];
  const targetY = Math.floor(hero.y / TILE) + vector[1];
  return requestHeroMove(targetX, targetY);
}

function setMoveControlVisual(direction = null, offset = { x: 0, y: 0 }, active = false) {
  moveControl.dataset.active = String(active);
  if (direction) moveControl.dataset.direction = direction;
  else delete moveControl.dataset.direction;
  moveControl.style.setProperty('--stick-x', `${offset.x}px`);
  moveControl.style.setProperty('--stick-y', `${offset.y}px`);
}

function flashMoveControl(direction) {
  if (moveControlState.pointerId !== null) return;
  window.clearTimeout(moveControlState.visualTimer);
  const vector = directionVector(direction);
  if (!vector) return;
  setMoveControlVisual(direction, { x: vector[0] * 12, y: vector[1] * 12 }, true);
  moveControlState.visualTimer = window.setTimeout(() => {
    if (moveControlState.pointerId === null) setMoveControlVisual();
  }, 120);
}

function beginHeldMove(direction) {
  if (!direction || moveControlState.direction === direction) return;
  moveControlState.direction = direction;
  queueDirectionalMove(direction);
  moveControlState.repeatAt = performance.now() + 180;
}

function updateHeldMove(time) {
  if (!moveControlState.direction || time < moveControlState.repeatAt || hero.path.length > 0) return;
  queueDirectionalMove(moveControlState.direction);
  moveControlState.repeatAt = time + 80;
}

function clearMoveControl({ releasePointer = true } = {}) {
  window.clearTimeout(moveControlState.holdTimer);
  window.clearTimeout(moveControlState.visualTimer);
  if (
    releasePointer &&
    moveControlState.pointerId !== null &&
    moveControl.hasPointerCapture(moveControlState.pointerId)
  ) {
    moveControl.releasePointerCapture(moveControlState.pointerId);
  }
  moveControlState.pointerId = null;
  moveControlState.direction = null;
  moveControlState.pressedDirection = null;
  moveControlState.dragged = false;
  moveControlState.repeatAt = 0;
  setMoveControlVisual();
}

function showMoveMarker(clientX, clientY, valid) {
  moveMarker.style.left = `${clientX}px`;
  moveMarker.style.top = `${clientY}px`;
  moveMarker.dataset.valid = String(valid);
  moveMarker.classList.remove('visible');
  void moveMarker.offsetWidth;
  moveMarker.classList.add('visible');
}

function onMoveControlPointerDown(event) {
  if (
    event.button !== 0 ||
    !event.isPrimary ||
    !ready ||
    uiScreen !== 'game' ||
    runStatus !== 'playing'
  ) {
    return;
  }
  event.preventDefault();
  clearMoveControl();
  inputGesture += 1;
  moveControlState.pointerId = event.pointerId;
  moveControlState.startX = event.clientX;
  moveControlState.startY = event.clientY;
  moveControlState.pressedDirection = event.target.closest('[data-move]')?.dataset.move ?? null;
  moveControl.setPointerCapture(event.pointerId);
  if (moveControlState.pressedDirection) {
    const vector = directionVector(moveControlState.pressedDirection);
    setMoveControlVisual(
      moveControlState.pressedDirection,
      { x: vector[0] * 12, y: vector[1] * 12 },
      true,
    );
    moveControlState.holdTimer = window.setTimeout(() => {
      if (moveControlState.pointerId !== event.pointerId || moveControlState.dragged) return;
      moveControlState.dragged = true;
      moveControlState.suppressClick = true;
      beginHeldMove(moveControlState.pressedDirection);
    }, 180);
  } else {
    setMoveControlVisual(null, { x: 0, y: 0 }, true);
  }
}

function onMoveControlPointerMove(event) {
  if (event.pointerId !== moveControlState.pointerId) return;
  const deltaX = event.clientX - moveControlState.startX;
  const deltaY = event.clientY - moveControlState.startY;
  const direction = dominantCardinalDirection(deltaX, deltaY);
  if (!direction) {
    if (moveControlState.dragged) {
      moveControlState.direction = null;
      setMoveControlVisual(null, clampedStickOffset(deltaX, deltaY), true);
    }
    return;
  }
  event.preventDefault();
  window.clearTimeout(moveControlState.holdTimer);
  moveControlState.dragged = true;
  const offset = clampedStickOffset(deltaX, deltaY);
  setMoveControlVisual(direction, offset, true);
  beginHeldMove(direction);
}

function onMoveControlPointerEnd(event) {
  if (event.pointerId !== moveControlState.pointerId) return;
  event.preventDefault();
  const tappedDirection = !moveControlState.dragged && event.type === 'pointerup'
    ? moveControlState.pressedDirection : null;
  moveControlState.suppressClick = true;
  clearMoveControl({ releasePointer: false });
  if (tappedDirection) {
    queueDirectionalMove(tappedDirection);
    flashMoveControl(tappedDirection);
  }
  window.setTimeout(() => {
    moveControlState.suppressClick = false;
  }, 0);
}

function worldToScreen(x, y, height = 0) {
  const position = dungeonWorld3D.project(x, y, height);
  return { x: position.x + renderShake.x, y: position.y + renderShake.y };
}

function worldToAtmosphereScreen(x, y, parallax = 1) {
  return worldToScreen(
    camera.x + (x - camera.x) * parallax,
    camera.y + (y - camera.y) * parallax,
  );
}

function resetAtmosphereBuffer() {
  atmosphereContext.setTransform(1, 0, 0, 1, 0, 0);
  atmosphereContext.clearRect(0, 0, atmosphereCanvas.width, atmosphereCanvas.height);
  atmosphereContext.setTransform(
    1 / PIXEL_EFFECT_SCALE,
    0,
    0,
    1 / PIXEL_EFFECT_SCALE,
    0,
    0,
  );
  atmosphereContext.imageSmoothingEnabled = false;
}

function compositeAtmosphere(mode = 'source-over') {
  context.save();
  context.globalCompositeOperation = mode;
  context.imageSmoothingEnabled = false;
  context.drawImage(
    atmosphereCanvas,
    0,
    0,
    atmosphereCanvas.width,
    atmosphereCanvas.height,
    0,
    0,
    viewportWidth,
    viewportHeight,
  );
  context.restore();
}

function clipVisibleLight(origin, radius, { floorsOnly = false } = {}) {
  const minX = Math.max(0, Math.floor(origin.x - radius));
  const maxX = Math.min(WORLD_WIDTH - 1, Math.ceil(origin.x + radius));
  const minY = Math.max(0, Math.floor(origin.y - radius));
  const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil(origin.y + radius));
  atmosphereContext.beginPath();
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (Math.hypot(x - origin.x, y - origin.y) > radius + 0.5) continue;
      if (!revealed.has(`${x},${y}`) || !hasLineOfSight(world, origin, { x, y })) continue;
      if (floorsOnly && !isOpenSurface(x, y)) continue;
      const position = worldToScreen(x * TILE, y * TILE);
      atmosphereContext.rect(
        Math.floor(position.x / PIXEL_EFFECT_SCALE) * PIXEL_EFFECT_SCALE,
        Math.floor(position.y / PIXEL_EFFECT_SCALE) * PIXEL_EFFECT_SCALE,
        TILE + PIXEL_EFFECT_SCALE,
        TILE + PIXEL_EFFECT_SCALE,
      );
    }
  }
  atmosphereContext.clip();
}

function revealProgress() {
  if (reducedMotion) return 1;
  const progress = Math.min(1, Math.max(0, (elapsed - sceneStartedAt) / 1.4));
  return 1 - (1 - progress) ** 3;
}

function drawSprite(path, x, y, size = TILE, options = {}) {
  const sprite = image(path);
  if (!sprite) return;
  const position = worldToScreen(x, y);
  const fitted = options.trim
    ? fittedSpriteRect(
        floorLootSpriteBounds.get(path)
          ?? { x: 0, y: 0, width: sprite.naturalWidth, height: sprite.naturalHeight },
        size,
      )
    : null;
  const drawWidth = (fitted?.drawWidth ?? size) * (options.scaleX ?? 1);
  const drawHeight = (fitted?.drawHeight ?? size) * (options.scaleY ?? 1);
  context.save();
  context.globalAlpha = options.alpha ?? 1;
  context.filter = options.filter ?? VISIBILITY_TUNING.spriteFilter;
  if (options.glow) {
    context.shadowColor = options.glow;
    context.shadowBlur = options.blur ?? 18;
  }
  context.translate(Math.round(position.x), Math.round(position.y + (options.offsetY ?? 0)));
  if (options.rotation) context.rotate(options.rotation);
  context.scale(options.flip ? -1 : 1, 1);
  if (fitted) {
    context.drawImage(
      sprite,
      fitted.sourceX,
      fitted.sourceY,
      fitted.sourceWidth,
      fitted.sourceHeight,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight,
    );
  } else {
    context.drawImage(sprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  }
  context.restore();
}

function isOpenSurface(x, y) {
  const cell = world[y]?.[x];
  return cell !== undefined && cell !== '#' && cell !== 'D';
}

function playerLayers(profile = playerAppearance) {
  const mainHand = equippedItem('hand1');
  const offhand = equippedItem('hand2');
  const loadout = resolveWeaponLoadout(mainHand, offhand);
  const appearance = resolvePlayerAppearance(profile);
  return composePlayerLayers({
    baseVisual: appearance.body,
    hairVisual: appearance.hair,
    cloakVisual: visualForItem(equippedItem('cloak')),
    bodyVisual: visualForItem(equippedItem('body')),
    beltVisual: visualForItem(equippedItem('belt')),
    bootsVisual: visualForItem(equippedItem('boots')),
    glovesVisual: visualForItem(equippedItem('gloves')),
    headVisual: visualForItem(equippedItem('head')),
    hand1Visual: visualForItem(mainHand),
    hand2Visual: visualForItem(offhand, 'hand2'),
    twoHanded: loadout.mode === 'two-handed',
    hideHair: Boolean(equippedItem('head')),
  });
}

function playerMotion() {
  const position = worldToScreen(hero.x, hero.y);
  const walking = hero.path.length > 0;
  const bob = reducedMotion
    ? 0
    : walking
      ? Math.abs(Math.sin(hero.stride * 7)) * -3
      : Math.sin(elapsed * 2.7) * 1.2;
  const attackMotion = heroAttackMotion(
    hero.attack,
    hero.attackDuration,
    hero.attackStyle,
    reducedMotion,
  );
  const dx = Math.cos(hero.targetAngle) * attackMotion.lunge;
  const dy = Math.sin(hero.targetAngle) * attackMotion.lunge;
  return { attackMotion, attackProgress: attackMotion.progress, bob, dx, dy, position };
}

function monsterMotion(monster) {
  return monsterAttackMotion({
    windup: monster.attackWindup,
    windupDuration: monster.windup,
    recovery: monster.attackRecovery,
    angle: monster.attackTargetAngle,
    reducedMotion,
  });
}

function syncWorldActors3D() {
  const motion = playerMotion();
  const deathProgress = hero.dead ? 1 - Math.max(0, deathTimer) / 1.35 : 0;
  const heroMagic = currentHeroMagic();
  const concealed = heroMagic.invisibility && hero.invisibilityReveal <= 0;
  dungeonWorld3D.syncActors({
    hero: {
      layers: playerLayers(),
      x: hero.x + motion.dx,
      y: hero.y + motion.dy,
      size: ACTOR_SIZE,
      facing: hero.facing,
      screenOffsetY: (heroMagic.flight ? -23 : heroWading() ? -7 : -13) + motion.bob,
      opacity: hero.dead ? Math.max(0.2, 1 - deathProgress * 0.8) : concealed ? 0.38 : 1,
      rotation: deathProgress * hero.facing * 0.8,
      scaleX: motion.attackMotion.scaleX,
      scaleY: motion.attackMotion.scaleY,
      hit: hero.hurt > 0,
      shadowScale: heroMagic.flight ? 0.72 : 1,
      shadowOpacity: heroMagic.flight ? 0.18 : heroWading() ? 0.12 : 0.42,
    },
    monsters: [
      ...monsters
        .filter(
          (monster) =>
            monster.dead <= 0.72 &&
            revealed.has(`${Math.floor(monster.x / TILE)},${Math.floor(monster.y / TILE)}`),
        )
        .map((monster) => {
          const motion = monsterMotion(monster);
          const walking = (monster.movePulse ?? 0) > 0;
          const waiting = (monster.crowdPressure ?? 0) > 0 && !walking;
          const walkCycle = Math.sin((monster.stride ?? 0) * 8);
          const pressureCycle = Math.sin(elapsed * 8 + monster.phase);
          const bob = reducedMotion
            ? 0
            : Math.sin(elapsed * 2.4 + monster.phase) * (monster.flying ? 5 : 1.7) +
              (walking ? -Math.abs(walkCycle) * 2.2 : 0);
          const visualJostle = reducedMotion || !waiting ? 0 : pressureCycle * 1.25;
          return {
            id: monster.instanceId,
            path: monster.waterPath && actorInWater(world, monster, TILE) ? monster.waterPath : monster.spritePath,
            x: monster.x + motion.dx + visualJostle,
            y: monster.y + motion.dy,
            size:
              (monster.boss ? 100 : monster.large ? 90 : monster.flying ? 69 : 76) *
              (monster.visualScale ?? 1),
            facing: monster.facing,
            screenOffsetY: (monster.visualOffsetY ?? -10) + bob + (actorInWater(world, monster, TILE) && !monster.flying ? 6 : 0),
            opacity: monster.dead > 0 ? Math.max(0, 1 - monster.dead / 0.72) : 1,
            scaleX: motion.scaleX * (walking && !reducedMotion ? 1 + walkCycle * 0.025 : 1),
            scaleY: motion.scaleY * (walking && !reducedMotion ? 1 - walkCycle * 0.025 : 1),
            hit: monster.hit > 0,
          };
        }),
      ...passiveCreatures
        .filter((creature) => !creature.defeated &&
          revealed.has(`${Math.floor(creature.x / TILE)},${Math.floor(creature.y / TILE)}`))
        .map((creature) => {
          const attackMotion = monsterMotion(creature);
          const walking = creature.wanderTarget !== null;
          const bob = reducedMotion
            ? 0
            : Math.sin(elapsed * 1.7 + (creature.seed % 19)) * 0.7 +
              (walking ? -Math.abs(Math.sin(creature.stride * 6)) * 1.8 : 0);
          return {
            id: creature.instanceId,
            path: creature.spritePath,
            x: creature.x + attackMotion.dx,
            y: creature.y + attackMotion.dy,
            size: creature.size * (creature.visualScale ?? 1),
            facing: creature.facing,
            screenOffsetY: (creature.visualOffsetY ?? -9) + bob,
            opacity: 1,
            scaleX: attackMotion.scaleX * (walking && !reducedMotion ? 1 + Math.sin(creature.stride * 6) * 0.025 : 1),
            scaleY: attackMotion.scaleY * (walking && !reducedMotion ? 1 - Math.sin(creature.stride * 6) * 0.025 : 1),
            hit: creature.hit > 0,
            shadowScale: creature.large ? 0.95 : 0.72,
            shadowOpacity: 0.28,
          };
        }),
      ...merchantDefinitions
        .filter((merchant) => revealed.has(`${merchant.x},${merchant.y}`))
        .map((merchant) => ({
          id: merchant.instanceId,
          path: merchant.actorPath,
          x: (merchant.x + 0.5) * TILE,
          y: (merchant.y + 0.5) * TILE,
          size: 80,
          facing: hero.x < (merchant.x + 0.5) * TILE ? -1 : 1,
          screenOffsetY: -11 + (reducedMotion ? 0 : Math.sin(elapsed * 1.5) * 0.6),
          opacity: 1,
          hit: false,
          shadowScale: 0.86,
          shadowOpacity: 0.34,
        })),
    ],
    decorations: [
      ...dungeonEnvironment.props
        .filter(({ gridX, gridY }) => revealed.has(`${gridX},${gridY}`))
        .map((decoration) => ({
          id: decoration.id,
          path:
            decoration.frames[
              Math.floor(elapsed * 7 + decoration.phase) % decoration.frames.length
            ],
          x: decoration.x * TILE,
          y: decoration.y * TILE,
          size: decoration.size,
          facing: 1,
          screenOffsetY: decoration.screenOffsetY,
          opacity: 1,
          hit: false,
          depthBias: WORLD_DECORATION_DEPTH_BIAS,
          shadowScale: 0.72,
          shadowOpacity: 0.3,
        })),
      ...findDefinitions
        .filter(findIsVisible)
        .filter(({ x, y }) =>
          revealed.has(`${Math.floor(x / TILE)},${Math.floor(y / TILE)}`),
        )
        .filter((find) => !find.resolved || !find.consumedByMimic)
        .map((find) => ({
          id: find.instanceId,
          path: findSpritePath(find),
          x: find.x,
          y: find.y,
          size: find.definition.size * (find.definition.visualScale ?? 1),
          facing: 1,
          screenOffsetY: find.definition.screenOffsetY,
          opacity: find.resolved
            ? find.id === 'crystal-vein'
              ? 0.18
              : find.id === 'sealed-cache'
                ? 0.94
                : 0.48
            : 1,
          scaleX: find.resolved && find.id !== 'sealed-cache' ? 0.9 : 1,
          scaleY: find.resolved
            ? find.id === 'crystal-vein'
              ? 0.42
              : find.id === 'sealed-cache'
                ? 1
                : 1
            : 1,
          hit: false,
          depthBias: WORLD_DECORATION_DEPTH_BIAS,
          shadowScale: find.resolved && find.id !== 'sealed-cache' ? 0.52 : 0.78,
          shadowOpacity: find.resolved
            ? find.id === 'sealed-cache' ? 0.26 : 0.14
            : 0.34,
        })),
    ],
    imageForPath: image,
    spriteFilter: VISIBILITY_TUNING.spriteFilter,
  });
}

function drawPlayer() {
  const { attackMotion, attackProgress, dx, dy, position } = playerMotion();

  if (hero.attack > 0) {
    const rarity = Math.max(equippedItem('hand1')?.rarity ?? 0, equippedItem('body')?.rarity ?? 0);
    const color = hero.attackEmpowered ? '#f2d687' : rarityGlow[rarity];
    const alpha = attackMotion.swing * 0.92;
    context.save();
    context.translate(position.x + dx, position.y + dy - 4);
    context.rotate(hero.targetAngle);
    context.strokeStyle = color;
    context.fillStyle = color;
    context.globalAlpha = alpha;
    context.lineWidth = hero.attackStyle === 'heavy' ? 6 : hero.attackEmpowered ? 6 : 4;
    if (hero.attackStyle === 'spear') {
      const reach = 32 + attackProgress * 34;
      context.fillRect(16, -3, reach, 6);
      context.fillRect(16 + reach, -6, 7, 12);
    } else if (hero.attackStyle === 'staff') {
      context.translate(27, 0);
      context.rotate(attackProgress * Math.PI * 0.75);
      context.strokeRect(-8, -8, 16, 16);
      context.fillRect(-3, -3, 6, 6);
    } else if (hero.attackStyle === 'bow') {
      context.fillRect(15, -2, 34, 4);
      context.fillRect(43, -6, 4, 12);
    } else {
      const radius = (hero.attackStyle === 'heavy' ? 48 : 42)
        + (hero.attackEmpowered ? hero.attackMasteryRank * 3 : 0);
      const segments = (hero.attackStyle === 'heavy' ? 9 : 7)
        + (hero.attackEmpowered ? hero.attackMasteryRank : 0);
      for (let index = 0; index < segments; index += 1) {
        const angle = -0.92 + (index / (segments - 1)) * 1.84;
        const x = Math.round((Math.cos(angle) * radius) / 4) * 4;
        const y = Math.round((Math.sin(angle) * radius) / 4) * 4;
        const size = hero.attackStyle === 'heavy' && index % 2 === 0 ? 8 : 6;
        context.globalAlpha = alpha * (0.48 + index / segments / 2);
        context.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }
    context.restore();
  }

  if (hero.guardFlash > 0) {
    const guardProgress = hero.guardFlash / 0.32;
    context.save();
    context.translate(position.x, position.y - 4);
    context.rotate(Math.PI / 4);
    context.globalAlpha = Math.min(1, guardProgress) * 0.8;
    context.strokeStyle = '#9ed2d0';
    context.lineWidth = 5;
    context.strokeRect(-22, -22, 44, 44);
    context.restore();
  }
}

function pixelRound(value, unit = 2) {
  return Math.round(value / unit) * unit;
}

function drawPixelHalo(x, y, color, strength = 1) {
  context.save();
  context.globalCompositeOperation = 'screen';
  context.fillStyle = color;
  const layers = [
    { width: 82, height: 74, alpha: 0.018 },
    { width: 62, height: 58, alpha: 0.028 },
    { width: 42, height: 44, alpha: 0.04 },
  ];
  for (const layer of layers) {
    context.globalAlpha = layer.alpha * strength;
    context.fillRect(
      pixelRound(x - layer.width / 2, 4),
      pixelRound(y - layer.height / 2, 4),
      layer.width,
      layer.height,
    );
  }
  context.restore();
}

function drawBurningHero(centerX, centerY) {
  const color = ACTOR_EFFECTS.burning.color;
  const time = reducedMotion ? 0.42 : elapsed;
  drawPixelHalo(centerX, centerY + 4, color, 1.8);
  context.save();
  context.globalCompositeOperation = 'screen';
  const palette = ['#b73d25', '#ee7132', '#f2b44e', '#ffe08a'];
  for (let index = 0; index < 13; index += 1) {
    const phase = (time * (0.84 + (index % 4) * 0.09) + index * 0.173) % 1;
    const side = ((index * 17) % 11) / 10 - 0.5;
    const sway = reducedMotion ? 0 : Math.sin(time * 5.2 + index * 1.7) * 5;
    const x = centerX + side * 54 + sway;
    const y = centerY + 30 - phase * (62 + (index % 3) * 8);
    const size = phase < 0.32 ? 6 : phase < 0.74 ? 4 : 2;
    context.globalAlpha = Math.min(1, (1 - phase) * 1.25) * (index % 3 === 0 ? 0.95 : 0.72);
    context.fillStyle = palette[(index + Math.floor(phase * 5)) % palette.length];
    context.fillRect(pixelRound(x - size / 2), pixelRound(y - size / 2), size, size * 1.5);
    if (phase < 0.48 && index % 2 === 0) {
      context.fillStyle = '#ffe7a0';
      context.fillRect(pixelRound(x), pixelRound(y + 4), 2, 4);
    }
  }
  context.globalCompositeOperation = 'source-over';
  for (let index = 0; index < 4; index += 1) {
    const phase = (time * 0.29 + index * 0.24) % 1;
    context.globalAlpha = (1 - phase) * 0.16;
    context.fillStyle = '#283033';
    context.fillRect(
      pixelRound(centerX - 12 + index * 8 + Math.sin(time + index) * 5),
      pixelRound(centerY - 38 - phase * 28),
      phase > 0.55 ? 6 : 4,
      phase > 0.55 ? 6 : 4,
    );
  }
  context.restore();
}

function drawWetHero(centerX, centerY) {
  const color = ACTOR_EFFECTS.wet.color;
  const time = reducedMotion ? 0.36 : elapsed;
  drawPixelHalo(centerX, centerY + 11, color, 0.62);
  context.save();
  context.fillStyle = color;
  for (let index = 0; index < 9; index += 1) {
    const phase = (time * (0.58 + (index % 3) * 0.08) + index * 0.137) % 1;
    const x = centerX + ((((index * 19) % 13) / 12) - 0.5) * 56;
    const y = centerY - 31 + phase * 67;
    context.globalAlpha = 0.18 + (1 - phase) * 0.66;
    context.fillRect(pixelRound(x), pixelRound(y), index % 3 === 0 ? 4 : 2, 4 + (index % 2) * 2);
    if (index % 3 === 0) {
      context.fillStyle = '#b5edf0';
      context.fillRect(pixelRound(x), pixelRound(y), 2, 2);
      context.fillStyle = color;
    }
  }
  const ripple = (time * 0.62) % 1;
  const rippleWidth = pixelRound(18 + ripple * 42, 4);
  context.globalAlpha = (1 - ripple) * 0.56;
  context.strokeStyle = '#78cad4';
  context.lineWidth = 2;
  context.strokeRect(
    pixelRound(centerX - rippleWidth / 2),
    pixelRound(centerY + 34 - ripple * 2),
    rippleWidth,
    6,
  );
  context.restore();
}

function drawChilledHero(centerX, centerY, wet) {
  const color = ACTOR_EFFECTS.chilled.color;
  const time = reducedMotion ? 0.54 : elapsed;
  drawPixelHalo(centerX, centerY, color, wet ? 1.15 : 0.82);
  context.save();
  context.fillStyle = color;
  const anchors = [
    [-29, -21], [25, -13], [-22, 4], [30, 13], [-13, 29], [15, 31], [0, -35],
  ];
  anchors.forEach(([offsetX, offsetY], index) => {
    const pulse = reducedMotion ? 0.72 : (Math.sin(time * 3.1 + index * 1.9) + 1) / 2;
    const size = pulse > 0.58 ? 6 : 4;
    context.globalAlpha = 0.3 + pulse * 0.52;
    context.fillRect(pixelRound(centerX + offsetX), pixelRound(centerY + offsetY), size, 2);
    context.fillRect(pixelRound(centerX + offsetX + 2), pixelRound(centerY + offsetY - 2), 2, size);
  });
  const breathPhase = (time * 0.43) % 1;
  const direction = hero.facing < 0 ? -1 : 1;
  context.fillStyle = '#d8f6f2';
  for (let index = 0; index < 3; index += 1) {
    const phase = (breathPhase + index * 0.17) % 1;
    const size = phase > 0.55 ? 6 : 4;
    context.globalAlpha = (1 - phase) * 0.42;
    context.fillRect(
      pixelRound(centerX + direction * (12 + phase * 34)),
      pixelRound(centerY - 18 - phase * 8 + index * 3),
      size,
      size,
    );
  }
  context.restore();
}

function drawPoisonedHero(centerX, centerY) {
  const color = ACTOR_EFFECTS.poison.color;
  const time = reducedMotion ? 0.68 : elapsed;
  drawPixelHalo(centerX, centerY + 14, color, 0.7);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = '#b8d878';
  context.lineWidth = 2;
  for (let index = 0; index < 8; index += 1) {
    const phase = (time * (0.38 + (index % 3) * 0.06) + index * 0.19) % 1;
    const x = centerX + ((((index * 23) % 17) / 16) - 0.5) * 58 + Math.sin(time + index) * 3;
    const y = centerY + 30 - phase * 70;
    const size = index % 3 === 0 ? 6 : 4;
    context.globalAlpha = (1 - phase) * 0.62;
    context.strokeRect(pixelRound(x), pixelRound(y), size, size);
    if (phase < 0.42) context.fillRect(pixelRound(x + 2), pixelRound(y + 2), 2, 2);
  }
  context.globalAlpha = 0.14 + (reducedMotion ? 0 : (Math.sin(time * 2.2) + 1) * 0.045);
  context.fillStyle = color;
  context.fillRect(pixelRound(centerX - 29), pixelRound(centerY + 31), 58, 6);
  context.restore();
}

/** A ripple across the legs of everyone wading, so a sunken sprite reads as water. */
function drawWaterlines() {
  const waders = [
    ...(hero.dead || !heroWading() ? [] : [{ x: hero.x, y: hero.y, size: 1 }]),
    ...monsters
      .filter((monster) => monster.dead === 0 && !monster.flying && actorInWater(world, monster, TILE))
      .map((monster) => ({ x: monster.x, y: monster.y, size: monster.large || monster.boss ? 1.3 : 1 })),
    ...passiveCreatures
      .filter((creature) => !creature.defeated && actorInWater(world, creature, TILE))
      .map((creature) => ({ x: creature.x, y: creature.y, size: 0.8 })),
  ];
  if (waders.length === 0) return;
  context.save();
  context.lineWidth = 1;
  for (const wader of waders) {
    if (!revealed.has(`${Math.floor(wader.x / TILE)},${Math.floor(wader.y / TILE)}`)) continue;
    const position = worldToScreen(wader.x, wader.y);
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 3 + wader.x * 0.05) * 2;
    context.fillStyle = 'rgba(99, 184, 202, 0.34)';
    context.strokeStyle = 'rgba(178, 226, 236, 0.5)';
    context.beginPath();
    context.ellipse(position.x, position.y + 6, (18 + pulse) * wader.size, 6 * wader.size, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.restore();
}

function drawHeroEffects() {
  const active = activeActorEffects(hero.effects);
  const magic = currentHeroMagic();
  if ((active.length === 0 && !magic.flight && !magic.invisibility) || hero.dead) return;
  const motion = playerMotion();
  const centerX = motion.position.x + motion.dx;
  const centerY = motion.position.y + motion.dy - 13 + motion.bob;
  if (hero.effects.wet > 0) drawWetHero(centerX, centerY);
  if (hero.effects.poison > 0) drawPoisonedHero(centerX, centerY);
  if (hero.effects.chilled > 0) drawChilledHero(centerX, centerY, hero.effects.wet > 0);
  if (hero.effects.burning > 0) drawBurningHero(centerX, centerY);
  if (magic.flight) {
    context.save();
    context.fillStyle = '#d8d0ba';
    for (let index = 0; index < 5; index += 1) {
      const phase = reducedMotion ? index / 5 : (elapsed * 0.42 + index * 0.21) % 1;
      context.globalAlpha = 0.12 + (1 - phase) * 0.28;
      context.fillRect(
        pixelRound(centerX - 24 + ((index * 13) % 43)),
        pixelRound(centerY + 37 - phase * 18),
        index % 2 === 0 ? 4 : 2,
        2,
      );
    }
    context.restore();
  }
  if (magic.invisibility && hero.invisibilityReveal <= 0) {
    context.save();
    context.strokeStyle = '#8fc8c5';
    context.globalAlpha = 0.34;
    context.lineWidth = 2;
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 3) * 2;
    context.strokeRect(pixelRound(centerX - 24 - pulse), pixelRound(centerY - 37 - pulse), pixelRound(48 + pulse * 2), pixelRound(72 + pulse * 2));
    context.restore();
  }
}

function drawProjectiles() {
  for (const projectile of projectiles) {
    const position = worldToScreen(projectile.x, projectile.y);
    context.save();
    context.translate(Math.round(position.x), Math.round(position.y - 8));
    context.rotate(projectile.angle);
    context.globalAlpha = Math.min(1, projectile.life * 3);
    context.fillStyle = projectile.color;
    context.strokeStyle = projectile.color;
    if (projectile.kind === 'arrow') {
      context.globalAlpha *= 0.28;
      context.fillRect(-25, -1, 12, 2);
      context.globalAlpha = Math.min(1, projectile.life * 3);
      context.fillRect(-13, -2, 24, 4);
      context.fillRect(7, -5, 5, 10);
    } else if (projectile.kind === 'ember-bolt') {
      context.globalAlpha *= 0.22;
      context.fillStyle = '#7d3024';
      context.fillRect(-25, -4, 14, 8);
      context.fillStyle = '#c64d2d';
      context.fillRect(-17, -6, 12, 12);
      context.globalAlpha = Math.min(1, projectile.life * 3);
      context.fillStyle = '#ef7840';
      context.fillRect(-8, -8, 16, 16);
      context.fillStyle = '#ffd36e';
      context.fillRect(-3, -5, 9, 10);
      context.fillStyle = '#fff0a3';
      context.fillRect(1, -2, 5, 4);
    } else if (projectile.kind === 'frost-lance') {
      context.globalAlpha *= 0.22;
      context.fillStyle = '#386f82';
      context.fillRect(-28, -3, 18, 6);
      context.globalAlpha = Math.min(1, projectile.life * 3);
      context.fillStyle = '#69bfce';
      context.fillRect(-16, -5, 20, 10);
      context.fillStyle = '#b9f2ee';
      context.fillRect(-6, -7, 16, 14);
      context.fillStyle = '#effffc';
      context.fillRect(5, -3, 10, 6);
    } else if (projectile.kind === 'storm-bolt') {
      context.globalAlpha *= 0.24;
      context.fillStyle = '#315e79';
      context.fillRect(-30, -4, 18, 8);
      context.fillRect(-18, -7, 8, 4);
      context.globalAlpha = Math.min(1, projectile.life * 3);
      context.fillStyle = '#55a9cb';
      context.fillRect(-17, -7, 18, 14);
      context.fillStyle = '#9ceafa';
      context.fillRect(-7, -9, 17, 18);
      context.fillStyle = '#f4ffff';
      context.fillRect(3, -4, 12, 8);
      context.fillRect(-1, -13, 4, 5);
      context.fillRect(-5, 10, 4, 4);
    } else if (projectile.kind === 'tide-wand') {
      context.globalAlpha *= 0.2;
      context.fillStyle = '#285968';
      context.fillRect(-30, -4, 18, 8);
      context.globalAlpha = Math.min(1, projectile.life * 3);
      context.fillStyle = '#438ca0';
      context.fillRect(-18, -7, 18, 14);
      context.fillStyle = '#72c7d3';
      context.fillRect(-8, -9, 17, 18);
      context.fillStyle = '#d3fbf8';
      context.fillRect(4, -5, 12, 10);
      context.fillRect(-2, -12, 5, 5);
    } else {
      context.globalAlpha *= 0.22;
      context.fillRect(-22, -4, 10, 8);
      context.globalAlpha = Math.min(1, projectile.life * 3);
      context.rotate(elapsed * 8);
      context.fillRect(-7, -7, 14, 14);
      context.fillStyle = '#d9f3ef';
      context.fillRect(-3, -3, 6, 6);
    }
    context.restore();
  }
}

function drawLightningArcs() {
  for (const arc of lightningArcs) {
    const start = worldToScreen(arc.fromX, arc.fromY - 8);
    const end = worldToScreen(arc.toX, arc.toY - 8);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const segments = Math.max(5, Math.min(15, Math.ceil(distance / 18)));
    const fade = Math.max(0, arc.life / arc.maxLife);
    const points = [];
    for (let index = 0; index <= segments; index += 1) {
      const progress = index / segments;
      const atEnd = index === 0 || index === segments;
      const noise = atEnd
        ? 0
        : ((hash(arc.sequence, index, 347) % 9) - 4) * (reducedMotion ? 0.55 : 1);
      points.push({
        x: pixelRound(start.x + dx * progress + normalX * noise, 2),
        y: pixelRound(start.y + dy * progress + normalY * noise, 2),
      });
    }
    context.save();
    for (const layer of [
      { size: 8, color: '#3c98bd', alpha: fade * 0.42 },
      { size: 4, color: '#d8fbff', alpha: fade },
    ]) {
      context.globalAlpha = layer.alpha;
      context.fillStyle = layer.color;
      for (let index = 1; index < points.length; index += 1) {
        const from = points[index - 1];
        const to = points[index];
        const half = layer.size / 2;
        context.fillRect(
          Math.min(from.x, to.x) - half,
          from.y - half,
          Math.abs(to.x - from.x) + layer.size,
          layer.size,
        );
        context.fillRect(
          to.x - half,
          Math.min(from.y, to.y) - half,
          layer.size,
          Math.abs(to.y - from.y) + layer.size,
        );
      }
    }
    context.globalAlpha = fade;
    context.fillStyle = '#ffffff';
    for (let index = 0; index < points.length; index += 3) {
      context.fillRect(points[index].x - 2, points[index].y - 2, 4, 4);
    }
    context.restore();
  }
}

function drawMonster(monster) {
  if (monster.dead > 0.72) return;
  if (!revealed.has(`${Math.floor(monster.x / TILE)},${Math.floor(monster.y / TILE)}`)) return;
  const size = monster.boss ? 100 : monster.large ? 90 : monster.flying ? 69 : 76;
  const motion = monsterMotion(monster);
  const position = worldToScreen(monster.x + motion.dx, monster.y + motion.dy);

  if (monster.dead > 0) {
    const dissolve = Math.min(1, monster.dead / 0.72);
    const color = atmosphereThemeForDepth(dungeon.depth).dust;
    context.save();
    context.fillStyle = color;
    context.globalAlpha = Math.max(0, 0.72 - dissolve * 0.68);
    for (let index = 0; index < 10; index += 1) {
      const angle = index * 2.39 + monster.phase;
      const distance = 8 + dissolve * (24 + (index % 4) * 6);
      const fragmentX = position.x + Math.cos(angle) * distance;
      const fragmentY = position.y - 4 + Math.sin(angle) * distance - dissolve * 12;
      const fragmentSize = index % 3 === 0 ? 6 : 4;
      context.fillRect(
        Math.round(fragmentX / 2) * 2,
        Math.round(fragmentY / 2) * 2,
        fragmentSize,
        fragmentSize,
      );
    }
    context.restore();
  }

  if (monster.boss && monster.dead === 0) {
    context.save();
    context.translate(Math.round(position.x), Math.round(position.y + 22));
    context.rotate(Math.PI / 4);
    context.globalAlpha = 0.34 + Math.sin(elapsed * 3) * 0.08;
    context.strokeStyle = '#9c618a';
    context.lineWidth = 4;
    context.strokeRect(-22, -22, 44, 44);
    context.restore();
  }

  if (monster.hp < monster.maxHp && monster.dead === 0) {
    const width = monster.boss ? 46 : 34;
    context.fillStyle = '#050708';
    context.fillRect(
      Math.round(position.x - width / 2),
      Math.round(position.y - size / 2 - 15),
      width,
      6,
    );
    context.fillStyle = '#a03934';
    context.fillRect(
      Math.round(position.x - width / 2 + 2),
      Math.round(position.y - size / 2 - 13),
      Math.max(0, Math.round((width - 4) * (monster.hp / monster.maxHp))),
      2,
    );
  }
  if (monster.effects?.wet > 0 && monster.dead === 0) {
    context.save();
    const pulse = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 4.2 + monster.phase) * 2);
    context.fillStyle = ACTOR_EFFECTS.wet.color;
    context.globalAlpha = 0.58;
    for (let index = 0; index < 5; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = Math.round((position.x + side * (16 + (index % 3) * 6)) / 2) * 2;
      const y = Math.round((position.y - 26 + index * 11 + pulse) / 2) * 2;
      context.fillRect(x, y, index % 3 === 0 ? 6 : 4, index % 2 === 0 ? 8 : 6);
      context.fillStyle = index % 2 === 0 ? '#a9e8e7' : ACTOR_EFFECTS.wet.color;
    }
    context.restore();
  }
  if (monster.effects?.chilled > 0 && monster.dead === 0) {
    context.save();
    context.fillStyle = '#8de0e5';
    context.globalAlpha = 0.52;
    const pulse = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 5 + monster.phase) * 2);
    for (let index = 0; index < 6; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = Math.round((position.x + side * (18 + (index % 3) * 4)) / 2) * 2;
      const y = Math.round((position.y + 18 - index * 8 + pulse) / 2) * 2;
      context.fillRect(x, y, index % 3 === 0 ? 6 : 4, 8);
      context.fillStyle = index % 2 === 0 ? '#c9f7f3' : '#6fc8d5';
    }
    context.restore();
  }
  if (monster.effects?.frozen > 0 && monster.dead === 0) {
    context.save();
    const pulse = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 7 + monster.phase) * 2);
    const centerX = Math.round(position.x / 2) * 2;
    const baseY = Math.round((position.y + 31) / 2) * 2;
    context.globalAlpha = 0.72;
    context.fillStyle = '#6ec8d8';
    context.fillRect(centerX - 28, baseY - 8, 56, 8);
    context.fillRect(centerX - 22, baseY - 28, 8, 22);
    context.fillRect(centerX + 14, baseY - 28, 8, 22);
    context.fillStyle = '#c9fbf6';
    context.fillRect(centerX - 24, baseY - 10, 48, 4);
    for (let index = 0; index < 5; index += 1) {
      const x = centerX - 28 + index * 14;
      const height = 14 + ((index * 7) % 18) + pulse;
      context.fillRect(x, baseY - 8 - height, 4, height);
      context.fillStyle = index % 2 === 0 ? '#eafffb' : '#83d9e2';
    }
    context.restore();
  }
}

function floorTextureAt(x, y, cell, theme) {
  if (cell === '~') return waterPaths[0];
  const isBlood =
    cell === '.' && theme.bloodModulo > 0 && hash(x, y, 17) % theme.bloodModulo === 0;
  return isBlood
    ? BLOOD_FLOOR_PATHS[hash(x, y) % BLOOD_FLOOR_PATHS.length]
    : theme.floors[hash(x, y) % theme.floors.length];
}

function wallTextureAt(x, y, cell, theme) {
  if (cell === 'D') return doorPanelVisual.path;
  const accented =
    theme.accentModulo > 0 &&
    theme.accentWalls.length > 0 &&
    hash(x, y, 9) % theme.accentModulo === 0;
  const collection = accented ? theme.accentWalls : theme.walls;
  return collection[hash(x, y, 3) % collection.length];
}

function rebuildDungeonWorld3D() {
  const theme = biomeThemeForDepth(dungeon.depth);
  dungeonWorld3D.rebuild({
    grid: world,
    doors: doorDefinitions,
    theme,
    imageForPath: image,
    floorPathAt: (x, y, cell) => floorTextureAt(x, y, cell, theme),
    wallPathAt: (x, y, cell) => wallTextureAt(x, y, cell, theme),
  });
}

function clearActorCanvas() {
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.restore();
}

function drawWorld() {
  syncWorldActors3D();
  dungeonWorld3D.syncLights({
    sources: atmosphereLightSources(),
    focus: { x: hero.x, y: hero.y },
    elapsed,
    reducedMotion,
  });
  dungeonWorld3D.render({ worldX: camera.x, worldY: camera.y });
  clearActorCanvas();

  const minX = Math.max(0, Math.floor((camera.x - viewportWidth / 2) / TILE) - 1);
  const maxX = Math.min(WORLD_WIDTH - 1, Math.ceil((camera.x + viewportWidth / 2) / TILE) + 1);
  const minY = Math.max(0, Math.floor((camera.y - viewportHeight / 2) / TILE) - 1);
  const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil((camera.y + viewportHeight / 2) / TILE) + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (world[y][x] !== '~' || !revealed.has(`${x},${y}`)) continue;
      const wave = Math.floor(elapsed * 1.5 + hash(x, y)) % waterPaths.length;
      drawSprite(waterPaths[wave], (x + 0.5) * TILE, (y + 0.5) * TILE, TILE + 1, {
        alpha: 0.58,
      });
    }
  }
}

const beltGroundColors = Object.freeze(['#737977', '#78513c', '#687761', '#927543']);

function drawGroundBelt(position, rarity, pulse) {
  const x = Math.round(position.x / 2) * 2;
  const y = Math.round((position.y - 7 + pulse) / 2) * 2;
  context.save();
  context.imageSmoothingEnabled = false;
  context.fillStyle = '#080b0c';
  context.fillRect(x - 24, y - 8, 48, 16);
  context.fillStyle = beltGroundColors[rarity] ?? beltGroundColors[0];
  context.fillRect(x - 20, y - 4, 40, 8);
  context.fillStyle = '#171b1b';
  context.fillRect(x - 5, y - 6, 10, 12);
  context.fillStyle = rarity >= 2 ? '#b69b55' : '#9ba09b';
  context.fillRect(x - 3, y - 4, 6, 8);
  context.fillStyle = '#222727';
  context.fillRect(x - 1, y - 2, 2, 4);
  context.restore();
}

function drawLoot() {
  for (const loot of lootDefinitions) {
    const gridX = Math.floor(loot.x / TILE);
    const gridY = Math.floor(loot.y / TILE);
    if (!revealed.has(`${gridX},${gridY}`)) continue;
    const { x, y } = loot;
    const displayItem = presentedItem(loot.definition);
    const glow = rarityGlow[displayItem.rarity];
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 3.1 + gridX) * 2;
    const position = worldToScreen(x, y);
    const rarity = displayItem.rarity;
    context.save();
    context.fillStyle = glow;
    for (let step = 3; step >= 1; step -= 1) {
      const size = 20 + step * 12;
      context.globalAlpha = (4 - step) * 0.035 + rarity * 0.018;
      context.fillRect(
        Math.round((position.x - size / 2) / PIXEL_EFFECT_SCALE) * PIXEL_EFFECT_SCALE,
        Math.round((position.y + 12 - size / 3) / PIXEL_EFFECT_SCALE) * PIXEL_EFFECT_SCALE,
        size,
        Math.round(size * 0.56),
      );
    }
    if (rarity >= 2) {
      const height = 48 + rarity * 16 + pulse;
      context.globalAlpha = 0.1 + rarity * 0.035;
      context.fillRect(Math.round(position.x / 4) * 4 - 6, position.y - height, 12, height + 26);
      context.globalAlpha *= 0.5;
      context.fillRect(Math.round(position.x / 4) * 4 - 18, position.y - height + 14, 4, height - 8);
      context.fillRect(Math.round(position.x / 4) * 4 + 14, position.y - height + 26, 4, height - 18);
    }
    const orbit = reducedMotion ? 0 : elapsed * (1.2 + rarity * 0.22) + gridX;
    const orbitRadius = 19 + rarity * 3;
    for (let index = 0; index < Math.max(1, rarity + 1); index += 1) {
      const angle = orbit + (index / Math.max(1, rarity + 1)) * Math.PI * 2;
      const orbitX = position.x + Math.cos(angle) * orbitRadius;
      const orbitY = position.y - 5 + Math.sin(angle) * orbitRadius * 0.42;
      context.globalAlpha = 0.44 + rarity * 0.08;
      context.fillRect(Math.round(orbitX / 2) * 2 - 2, Math.round(orbitY / 2) * 2 - 2, 4, 4);
    }
    context.restore();
    const isBelt = displayItem.slot === 'belt';
    if (isBelt) drawGroundBelt(position, rarity, pulse);
    drawSprite(displayItem.icon, x, y, (isBelt ? 18 : 44) * (displayItem.visualScale ?? 1), {
      offsetY: (displayItem.visualOffsetY ?? -7) + pulse,
      trim: true,
    });
  }
}

function drawEvents() {
  if (
    dungeon.sanctuary &&
    revealed.has(`${dungeon.sanctuary.x},${dungeon.sanctuary.y}`)
  ) {
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 2.1) * 2;
    drawSprite(
      sanctuaryVisual.path,
      (dungeon.sanctuary.x + 0.5) * TILE,
      (dungeon.sanctuary.y + 0.5) * TILE,
      68 * sanctuaryVisual.scale,
      { offsetY: sanctuaryVisual.offsetY + pulse },
    );
  }
  for (const event of eventDefinitions) {
    const gridX = Math.floor(event.x / TILE);
    const gridY = Math.floor(event.y / TILE);
    if (!revealed.has(`${gridX},${gridY}`)) continue;
    if (event.id === 'blade-trap') {
      const known = detectedTrapIds.has(event.instanceId);
      const near = Math.hypot(event.x - hero.x, event.y - hero.y) <= TILE * 1.45;
      // A restrained physical clue remains readable without the skill, but no
      // floating icon or light gives away an undiscovered mechanism at range.
      if (!known && (!near || !isCurrentlyVisible(event.x, event.y))) continue;
      drawSprite(
        event.definition.path,
        event.x,
        event.y,
        (known ? 46 : 34) * (event.definition.visualScale ?? 1),
        {
          offsetY: event.definition.visualOffsetY ?? 3,
          alpha: known ? 1 : 0.28,
        },
      );
      continue;
    }
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 2.2 + gridX) * 2;
    drawSprite(
      event.definition.path,
      event.x,
      event.y,
      62 * (event.definition.visualScale ?? 1),
      { offsetY: (event.definition.visualOffsetY ?? -5) + pulse },
    );
  }
  for (const trap of trapDefinitions) {
    if (!run.floor.disarmedTrapIds.includes(trap.instanceId)) continue;
    if (!revealed.has(`${trap.x},${trap.y}`)) continue;
    drawSprite(
      disarmedTrapVisual.path,
      (trap.x + 0.5) * TILE,
      (trap.y + 0.5) * TILE,
      40 * disarmedTrapVisual.scale,
      { offsetY: disarmedTrapVisual.offsetY, alpha: 0.72 },
    );
  }
  for (const trap of placedTraps) {
    if (!revealed.has(`${trap.x},${trap.y}`)) continue;
    const armed = trap.state === 'armed';
    const visual = armed ? armedPlayerTrapVisual : spentPlayerTrapVisual;
    drawSprite(
      visual.path,
      (trap.x + 0.5) * TILE,
      (trap.y + 0.5) * TILE,
      (armed ? 44 : 38) * visual.scale,
      {
        offsetY: visual.offsetY,
        alpha: armed ? 1 : 0.5,
        rotation: armed ? 0 : Math.PI / 10,
      },
    );
    if (!armed) continue;
    const position = worldToScreen((trap.x + 0.5) * TILE, (trap.y + 0.5) * TILE);
    context.save();
    context.fillStyle = '#d8bf68';
    context.globalAlpha = 0.58;
    context.fillRect(pixelRound(position.x - 18), pixelRound(position.y + 13), 8, 4);
    context.fillRect(pixelRound(position.x + 10), pixelRound(position.y + 13), 8, 4);
    context.restore();
  }
  if (revealed.has(`${dungeon.exit.x},${dungeon.exit.y}`)) {
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 2.6) * 3;
    const finalFloor = dungeon.depth === FINAL_DEPTH;
    const chapterGateLocked = Boolean(
      dungeon.objective && !finalFloor && !objectiveBossDefeated(),
    );
    const visual = finalFloor
      ? artifactAvailable()
        ? artifactVisual
        : finalGateVisual
      : chapterGateLocked
        ? finalGateVisual
        : exitVisual;
    drawSprite(
      visual.path,
      (dungeon.exit.x + 0.5) * TILE,
      (dungeon.exit.y + 0.5) * TILE,
      (artifactAvailable() ? 54 : 64) * visual.scale,
      {
        offsetY: visual.offsetY + pulse,
      },
    );
  }
}

function drawMotes(layer = 1) {
  const theme = atmosphereThemeForDepth(dungeon.depth);
  // Each chapter breathes differently: ash drifts, sand races, snow falls.
  const weather = chapterWeather(biomeThemeForDepth(dungeon.depth).palette);
  const worldPixelWidth = WORLD_WIDTH * TILE;
  const worldPixelHeight = WORLD_HEIGHT * TILE;
  context.save();
  context.fillStyle = theme.dust;
  for (const mote of motes) {
    if (mote.layer !== layer) continue;
    const drift = reducedMotion ? 0 : elapsed * mote.speed * TILE * (layer + 1);
    const sway = reducedMotion ? 0 : Math.sin(elapsed * 0.7 + mote.phase) * weather.sway;
    const worldX = (mote.x + drift * weather.driftX + worldPixelWidth) % worldPixelWidth;
    const worldY = (mote.y + drift * weather.driftY + sway + worldPixelHeight) % worldPixelHeight;
    const cellX = Math.floor(worldX / TILE);
    const cellY = Math.floor(worldY / TILE);
    if (!revealed.has(`${cellX},${cellY}`) || !isCurrentlyVisible(worldX, worldY)) continue;
    const position = worldToScreen(worldX, worldY);
    if (
      position.x < -12 ||
      position.y < -12 ||
      position.x > viewportWidth + 12 ||
      position.y > viewportHeight + 12
    ) continue;
    const size = (layer === 2 ? mote.size + 1 : mote.size) + weather.size;
    context.globalAlpha =
      ((layer === 2 ? 0.18 : 0.1)
        + (reducedMotion ? 0 : (Math.sin(elapsed * 1.1 + mote.phase) + 1) * 0.04))
      * weather.alpha;
    context.fillRect(
      Math.round(position.x / 2) * 2,
      Math.round(position.y / 2) * 2,
      size,
      size,
    );
  }
  context.restore();
}

function isVoidAtScreen(screenX, screenY) {
  const target = dungeonWorld3D.unprojectGround(screenX, screenY);
  const cellX = Math.floor(target.x / TILE);
  const cellY = Math.floor(target.y / TILE);
  if (cellX < 0 || cellY < 0 || cellX >= WORLD_WIDTH || cellY >= WORLD_HEIGHT) return true;
  return !revealed.has(`${cellX},${cellY}`);
}

function drawVoidSky() {
  const width = voidSkyCanvas.width;
  const height = voidSkyCanvas.height;
  const theme = atmosphereThemeForDepth(dungeon.depth);
  const cameraCellX = reducedMotion ? 0 : camera.x / TILE;
  const cameraCellY = reducedMotion ? 0 : camera.y / TILE;
  voidSkyContext.setTransform(1, 0, 0, 1, 0, 0);
  voidSkyContext.clearRect(0, 0, width, height);
  voidSkyContext.save();

  for (const layer of voidStarLayers) {
    const offset = voidParallaxOffset(cameraCellX, cameraCellY, layer);
    voidSkyContext.fillStyle = layer.id === 'far' ? theme.dust : theme.ray;
    for (
      let tileY = offset.y - layer.tileSize;
      tileY < height + layer.tileSize;
      tileY += layer.tileSize
    ) {
      for (
        let tileX = offset.x - layer.tileSize;
        tileX < width + layer.tileSize;
        tileX += layer.tileSize
      ) {
        for (const star of layer.stars) {
          const x = Math.round(tileX + star.x);
          const y = Math.round(tileY + star.y);
          if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) continue;
          const screenX = (x + 0.5) * VOID_STAR_SCALE;
          const screenY = (y + 0.5) * VOID_STAR_SCALE;
          if (!isVoidAtScreen(screenX, screenY)) continue;
          const pulse = reducedMotion
            ? 1
            : [0.72, 1, 0.84, 0.92][(Math.floor(elapsed * 1.7) + star.phase) % 4];
          voidSkyContext.globalAlpha = layer.opacity * star.alpha * pulse;
          if (star.cross && layer.id === 'near') {
            voidSkyContext.fillRect(x - 1, y, 3, 1);
            voidSkyContext.fillRect(x, y - 1, 1, 3);
          } else {
            voidSkyContext.fillRect(x, y, 1, 1);
          }
        }
      }
    }
  }
  voidSkyContext.restore();
}

function drawGroundMist(foreground = false) {
  const theme = atmosphereThemeForDepth(dungeon.depth);
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  resetAtmosphereBuffer();
  atmosphereContext.save();
  clipVisibleLight(heroCell, 6, { floorsOnly: true });
  const drawCloud = (position, radiusX, radiusY, strength) => {
    atmosphereContext.save();
    atmosphereContext.translate(position.x, position.y);
    atmosphereContext.scale(1, radiusY / radiusX);
    const fog = atmosphereContext.createRadialGradient(0, 0, 0, 0, 0, radiusX);
    fog.addColorStop(0, `${theme.fog}${strength}`);
    fog.addColorStop(0.58, `${theme.fog}${foreground ? '0f' : '0b'}`);
    fog.addColorStop(1, `${theme.fog}00`);
    atmosphereContext.fillStyle = fog;
    atmosphereContext.fillRect(-radiusX, -radiusX, radiusX * 2, radiusX * 2);
    atmosphereContext.restore();
  };
  const parallax = foreground ? 0.78 : 1;
  for (const anchor of mistAnchors) {
    const phase = anchor.phase + (reducedMotion ? 0 : elapsed * anchor.speed);
    const worldX = anchor.x + Math.cos(phase) * anchor.drift;
    const worldY = anchor.y + Math.sin(phase * 0.74) * anchor.drift * 0.32;
    const position = worldToAtmosphereScreen(worldX, worldY, parallax);
    if (
      position.x < -170 ||
      position.y < -110 ||
      position.x > viewportWidth + 170 ||
      position.y > viewportHeight + 110
    ) continue;
    drawCloud(
      position,
      (foreground ? 118 : 92) * anchor.size,
      (foreground ? 40 : 29) * anchor.size,
      foreground ? '1d' : '18',
    );
  }
  const cloudLayer = foreground ? 2 : 0;
  for (let index = cloudLayer; index < motes.length; index += 9) {
    const mote = motes[index];
    const direction = index % 2 === 0 ? 1 : -1;
    const drift = reducedMotion ? 0 : elapsed * (5 + (index % 4) * 1.5) * direction;
    const worldX = (mote.x + drift + WORLD_WIDTH * TILE) % (WORLD_WIDTH * TILE);
    const worldY = mote.y + (reducedMotion ? 0 : Math.sin(elapsed * 0.24 + mote.phase) * 24);
    const position = worldToScreen(worldX, worldY);
    if (
      position.x < -140 ||
      position.y < -90 ||
      position.x > viewportWidth + 140 ||
      position.y > viewportHeight + 90
    ) continue;
    const radiusX = foreground ? 132 : 98;
    const radiusY = foreground ? 42 : 30;
    drawCloud(position, radiusX, radiusY, foreground ? '16' : '12');
  }
  atmosphereContext.restore();
  compositeAtmosphere();
}

function drawWallDrips() {
  const theme = atmosphereThemeForDepth(dungeon.depth);
  const minX = Math.max(0, Math.floor((camera.x - viewportWidth / 2) / TILE) - 1);
  const maxX = Math.min(WORLD_WIDTH - 1, Math.ceil((camera.x + viewportWidth / 2) / TILE) + 1);
  const minY = Math.max(0, Math.floor((camera.y - viewportHeight / 2) / TILE) - 1);
  const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil((camera.y + viewportHeight / 2) / TILE) + 1);
  context.save();
  context.fillStyle = theme.drip;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (world[y]?.[x] !== '#' || hash(x, y, 101) % 37 !== 0) continue;
      if (!revealed.has(`${x},${y}`)) continue;
      const phase = reducedMotion ? 0.42 : (elapsed * 0.38 + (hash(x, y, 103) % 100) / 100) % 1;
      const position = worldToScreen(
        (x + 0.5) * TILE,
        (y + 0.5) * TILE,
        WORLD_WALL_HEIGHT * 0.92,
      );
      const dropY = position.y + 12 + Math.floor(phase * 36);
      context.globalAlpha = 0.18 + phase * 0.32;
      context.fillRect(Math.round(position.x / 2) * 2, Math.round(dropY / 2) * 2, 2, 4);
      if (phase > 0.84) {
        const spread = 2 + Math.floor((phase - 0.84) * 24);
        context.fillRect(Math.round(position.x) - spread, Math.round(position.y + 51), spread * 2, 2);
      }
    }
  }
  context.restore();
}

function drawSparks() {
  for (const spark of sparks) {
    const position = worldToScreen(spark.x, spark.y);
    const progress = Math.max(0, spark.life / spark.maxLife);
    const size = progress > 0.55 ? 4 : 2;
    context.save();
    context.globalAlpha = progress;
    context.fillStyle = spark.color;
    context.fillRect(
      Math.round(position.x / 2) * 2 - size / 2,
      Math.round(position.y / 2) * 2 - size / 2,
      size,
      size,
    );
    context.restore();
  }
}

function drawHeroAttackTrail() {
  if (hero.attack <= 0 || reducedMotion) return;
  const motion = heroAttackMotion(hero.attack, hero.attackDuration, hero.attackStyle);
  if (motion.swing <= 0.04) return;
  const weapon = currentWeaponLoadout().primary;
  const color = hero.attackEmpowered ? '#f2d687' : rarityGlow[weapon?.rarity ?? 0];
  const cleaveRank = axeCleaveProfile(
    weapon,
    currentSkillCapabilities(),
  ).rank;
  const cosine = Math.cos(hero.targetAngle);
  const sine = Math.sin(hero.targetAngle);
  context.save();
  context.fillStyle = color;
  for (const point of heroAttackTrail(hero.attackStyle, motion.progress, cleaveRank)) {
    const position = worldToScreen(
      hero.x + point.x * cosine - point.y * sine,
      hero.y + point.x * sine + point.y * cosine,
    );
    const size = pixelRound(
      point.size + (hero.attackEmpowered ? 1 + hero.attackMasteryRank : 0),
    );
    context.globalAlpha = point.alpha * Math.min(1, motion.swing * 1.5);
    context.fillRect(pixelRound(position.x - size / 2), pixelRound(position.y - size / 2), size, size);
    if (hero.attackEmpowered) {
      context.globalAlpha *= 0.46;
      context.fillStyle = '#fff0b8';
      context.fillRect(
        pixelRound(position.x - size / 4),
        pixelRound(position.y - size / 4),
        Math.max(2, pixelRound(size / 2)),
        Math.max(2, pixelRound(size / 2)),
      );
      context.fillStyle = color;
    }
  }
  context.restore();
}

function drawBloodStains() {
  const pattern = [
    [-8, -2, 16, 6],
    [-4, -6, 10, 6],
    [7, 1, 8, 4],
    [-13, 3, 8, 4],
    [2, 6, 6, 4],
  ];
  context.save();
  for (const stain of bloodStains) {
    const position = worldToScreen(stain.x, stain.y);
    context.fillStyle = stain.color;
    context.globalAlpha = 0.38;
    for (const [index, block] of pattern.entries()) {
      const direction = (stain.seed >> index) & 1 ? 1 : -1;
      const [x, y, width, height] = block;
      context.fillRect(
        pixelRound(position.x + x * stain.size * direction),
        pixelRound(position.y + y * stain.size),
        pixelRound(width * stain.size),
        pixelRound(height * stain.size),
      );
    }
  }
  context.restore();
}

function drawBloodDrops() {
  context.save();
  for (const drop of bloodDrops) {
    const position = worldToScreen(drop.x, drop.y);
    context.globalAlpha = Math.min(1, drop.life / 0.12) * 0.82;
    context.fillStyle = drop.color;
    context.fillRect(pixelRound(position.x), pixelRound(position.y), drop.size, drop.size);
  }
  context.restore();
}

function drawPixelGlyphText(text, x, y, color, alpha) {
  const block = 3;
  const glyphWidth = block * 3;
  const advance = glyphWidth + block;
  const characters = [...text];
  const width = characters.length * advance - block;
  context.save();
  context.translate(pixelRound(x - width / 2), pixelRound(y));
  context.globalAlpha = alpha;
  context.fillStyle = '#050708';
  context.fillRect(-3, -3, width + 6, 21);
  context.fillStyle = color;
  for (const [characterIndex, character] of characters.entries()) {
    const pattern = COMBAT_GLYPH_PATTERNS[character];
    if (!pattern) continue;
    for (let row = 0; row < pattern.length; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        if (pattern[row][column] === '1') {
          context.fillRect(characterIndex * advance + column * block, row * block, block, block);
        }
      }
    }
  }
  context.restore();
}

function drawCombatGlyphs() {
  for (const glyph of combatGlyphs) {
    const position = worldToScreen(glyph.x, glyph.y);
    const progress = 1 - glyph.life / glyph.maxLife;
    const alpha = Math.min(1, glyph.life / 0.2);
    drawPixelGlyphText(
      glyph.text,
      position.x,
      position.y + glyph.offsetY - progress * (reducedMotion ? 0 : 24),
      glyph.color,
      alpha,
    );
  }
}

function drawEnemyTelegraphs() {
  for (const monster of monsters) {
    if (monster.dead > 0 || monster.attackWindup <= 0) continue;
    if (!revealed.has(`${Math.floor(monster.x / TILE)},${Math.floor(monster.y / TILE)}`)) continue;
    const progress = 1 - monster.attackWindup / monster.windup;
    const from = worldToScreen(monster.x, monster.y);
    const target = worldToScreen(monster.attackTargetX, monster.attackTargetY);
    const pulse = reducedMotion ? 1 : 0.72 + Math.sin(progress * Math.PI * 6) * 0.18;
    context.save();
    context.fillStyle = '#c24b3f';
    context.strokeStyle = '#d85d4d';
    context.globalAlpha = (0.28 + progress * 0.48) * pulse;
    for (let step = 1; step <= 4; step += 1) {
      const amount = step / 5;
      context.fillRect(
        pixelRound(from.x + (target.x - from.x) * amount) - 2,
        pixelRound(from.y + (target.y - from.y) * amount) - 2,
        4,
        4,
      );
    }
    const radius = pixelRound(22 + progress * 7, 4);
    context.translate(pixelRound(target.x), pixelRound(target.y + 5));
    context.rotate(Math.PI / 4);
    context.lineWidth = 4;
    context.strokeRect(-radius / 2, -radius / 2, radius, radius);
    context.restore();
  }
}

function drawImpactWaves() {
  for (const wave of impactWaves) {
    const position = worldToScreen(wave.x, wave.y);
    const progress = 1 - wave.life / wave.maxLife;
    const radius = Math.round((10 + progress * wave.size) / PIXEL_EFFECT_SCALE) * PIXEL_EFFECT_SCALE;
    context.save();
    context.translate(Math.round(position.x), Math.round(position.y));
    context.rotate(Math.PI / 4);
    context.globalAlpha = Math.max(0, wave.life / wave.maxLife) * 0.8;
    context.strokeStyle = wave.color;
    context.lineWidth = PIXEL_EFFECT_SCALE;
    context.strokeRect(-radius / 2, -radius / 2, radius, radius);
    context.restore();
  }
}

function atmosphereLightSources() {
  const theme = atmosphereThemeForDepth(dungeon.depth);
  const sources = [
    {
      id: 'refuge-shaft',
      x: (dungeon.spawn.x + 0.5) * TILE,
      y: (dungeon.spawn.y + 0.5) * TILE,
      gridX: dungeon.spawn.x,
      gridY: dungeon.spawn.y,
      color: theme.ray,
      radius: 3.4,
      phase: 0.6,
      beam: true,
    },
    ...eventDefinitions.filter((event) => event.id !== 'blade-trap').slice(0, 5).map((event, index) => ({
      id: `event-light:${event.instanceId}`,
      x: event.x,
      y: event.y,
      gridX: Math.floor(event.x / TILE),
      gridY: Math.floor(event.y / TILE),
      color: event.definition.effect === 'damage' ? '#a4464f' : theme.localLight,
      radius: 2.8,
      phase: index * 1.7,
      beam: event.definition.effect !== 'damage',
    })),
    ...dungeonEnvironment.props
      .filter(({ light }) => light)
      .map((decoration) => ({
        id: `environment-light:${decoration.id}`,
        x: decoration.x * TILE,
        y: decoration.y * TILE,
        gridX: decoration.gridX,
        gridY: decoration.gridY,
        color: decoration.light.color,
        radius: decoration.light.radius,
        phase: decoration.phase,
        beam: decoration.light.beam,
      })),
    ...findDefinitions
      .filter(findIsVisible)
      .filter(({ resolved, definition }) => !resolved && definition.light)
      .map((find) => ({
        id: `find-light:${find.instanceId}`,
        x: find.x,
        y: find.y,
        gridX: Math.floor(find.x / TILE),
        gridY: Math.floor(find.y / TILE),
        color: find.definition.light.color,
        radius: find.definition.light.radius,
        phase: find.roomIndex,
        beam: find.definition.light.beam,
      })),
  ];
  if (dungeon.sanctuary) {
    sources.push({
      id: 'sanctuary-light',
      x: (dungeon.sanctuary.x + 0.5) * TILE,
      y: (dungeon.sanctuary.y + 0.5) * TILE,
      gridX: dungeon.sanctuary.x,
      gridY: dungeon.sanctuary.y,
      color: '#d8bd6c',
      radius: 3.7,
      phase: 2.4,
      beam: true,
    });
  }
  for (const loot of lootDefinitions) {
    if (loot.definition.rarity < 2) continue;
    sources.push({
      id: `loot-light:${loot.instanceId}`,
      x: loot.x,
      y: loot.y,
      gridX: Math.floor(loot.x / TILE),
      gridY: Math.floor(loot.y / TILE),
      color: rarityGlow[loot.definition.rarity],
      radius: 1.8 + loot.definition.rarity * 0.35,
      phase: loot.x / TILE,
      beam: loot.definition.rarity >= 3,
    });
  }
  if (hero.effects.burning > 0 && !hero.dead) {
    sources.push({
      id: 'hero-burning',
      x: hero.x,
      y: hero.y,
      gridX: Math.floor(hero.x / TILE),
      gridY: Math.floor(hero.y / TILE),
      color: ACTOR_EFFECTS.burning.color,
      radius: 2.85,
      phase: 0.9,
      beam: false,
    });
  }
  for (const arc of lightningArcs.slice(-3)) {
    const x = (arc.fromX + arc.toX) / 2;
    const y = (arc.fromY + arc.toY) / 2;
    sources.push({
      id: `storm-arc:${arc.sequence}`,
      x,
      y,
      gridX: Math.floor(x / TILE),
      gridY: Math.floor(y / TILE),
      color: '#8fe8ff',
      radius: 2.4,
      phase: arc.sequence * 0.37,
      beam: false,
    });
  }
  return sources.filter(({ gridX, gridY }) => revealed.has(`${gridX},${gridY}`));
}

function carveLight(origin, screenPosition, radius, strength) {
  atmosphereContext.save();
  clipVisibleLight(origin, radius / TILE);
  atmosphereContext.globalCompositeOperation = 'destination-out';
  const gradient = atmosphereContext.createRadialGradient(
    screenPosition.x,
    screenPosition.y,
    12,
    screenPosition.x,
    screenPosition.y,
    radius,
  );
  gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
  gradient.addColorStop(0.46, `rgba(0, 0, 0, ${strength * 0.72})`);
  gradient.addColorStop(0.76, `rgba(0, 0, 0, ${strength * 0.28})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  atmosphereContext.fillStyle = gradient;
  atmosphereContext.fillRect(
    screenPosition.x - radius,
    screenPosition.y - radius,
    radius * 2,
    radius * 2,
  );
  atmosphereContext.restore();
}

/** How far the hero uncovers the map: darkvision below, daylight in town. */
function currentRevealRadius() {
  const base = heroRevealRadius(currentDarkvisionProfile());
  return isCityDepth(dungeon.depth) ? Math.max(base, CITY_REVEAL_RADIUS) : base;
}

function drawLighting() {
  const theme = atmosphereThemeForDepth(dungeon.depth);
  const heroPosition = worldToScreen(hero.x, hero.y);
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const sources = atmosphereLightSources();
  const reveal = revealProgress();
  const daylight = isCityDepth(dungeon.depth) ? CITY_LIGHT_MULTIPLIER : 1;
  const heroRadius = daylight * (
    VISIBILITY_TUNING.heroBaseRadius +
    reveal *
      Math.max(
        VISIBILITY_TUNING.heroRevealRadius,
        Math.min(viewportWidth, viewportHeight) * VISIBILITY_TUNING.heroViewportRatio,
      )
  );

  resetAtmosphereBuffer();
  atmosphereContext.save();
  atmosphereContext.globalAlpha = VISIBILITY_TUNING.darknessOpacity;
  atmosphereContext.fillStyle = theme.darkness;
  atmosphereContext.fillRect(0, 0, viewportWidth, viewportHeight);
  atmosphereContext.restore();
  carveLight(heroCell, heroPosition, heroRadius, VISIBILITY_TUNING.heroCarveStrength);
  for (const source of sources) {
    carveLight(
      { x: source.gridX, y: source.gridY },
      worldToScreen(source.x, source.y),
      source.radius * TILE,
      VISIBILITY_TUNING.sourceCarveStrength,
    );
  }
  compositeAtmosphere();

  resetAtmosphereBuffer();
  atmosphereContext.save();
  clipVisibleLight(heroCell, heroRadius / TILE);
  const heroGlow = atmosphereContext.createRadialGradient(
    heroPosition.x,
    heroPosition.y,
    0,
    heroPosition.x,
    heroPosition.y,
    Math.min(138, heroRadius),
  );
  heroGlow.addColorStop(0, `${theme.heroLight}20`);
  heroGlow.addColorStop(0.52, `${theme.heroLight}0c`);
  heroGlow.addColorStop(1, `${theme.heroLight}00`);
  atmosphereContext.fillStyle = heroGlow;
  atmosphereContext.fillRect(
    heroPosition.x - heroRadius,
    heroPosition.y - heroRadius,
    heroRadius * 2,
    heroRadius * 2,
  );
  atmosphereContext.restore();

  for (const source of sources) {
    const origin = { x: source.gridX, y: source.gridY };
    const position = worldToScreen(source.x, source.y);
    const radius = source.radius * TILE + (reducedMotion ? 0 : Math.sin(elapsed * 3.2 + source.phase) * 8);
    atmosphereContext.save();
    clipVisibleLight(origin, source.radius);
    const light = atmosphereContext.createRadialGradient(
      position.x,
      position.y,
      0,
      position.x,
      position.y,
      radius,
    );
    light.addColorStop(0, `${source.color}30`);
    light.addColorStop(0.24, `${source.color}17`);
    light.addColorStop(0.58, `${source.color}08`);
    light.addColorStop(1, `${source.color}00`);
    atmosphereContext.fillStyle = light;
    atmosphereContext.fillRect(position.x - radius, position.y - radius, radius * 2, radius * 2);
    atmosphereContext.restore();
  }
  compositeAtmosphere('screen');
}

function drawFog() {
  const heroX = Math.floor(hero.x / TILE);
  const heroY = Math.floor(hero.y / TILE);
  const minX = Math.max(0, Math.floor((camera.x - viewportWidth / 2) / TILE) - 1);
  const maxX = Math.min(WORLD_WIDTH - 1, Math.ceil((camera.x + viewportWidth / 2) / TILE) + 1);
  const minY = Math.max(0, Math.floor((camera.y - viewportHeight / 2) / TILE) - 1);
  const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil((camera.y + viewportHeight / 2) / TILE) + 1);
  context.save();
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const position = worldToScreen(x * TILE, y * TILE);
      if (!revealed.has(`${x},${y}`)) {
        context.fillStyle = '#020405';
        context.globalAlpha = 0.96;
      } else if (Math.hypot(x - heroX, y - heroY) > 5.2) {
        context.fillStyle = '#020405';
        context.globalAlpha = VISIBILITY_TUNING.distantFogOpacity;
      } else {
        continue;
      }
      context.fillRect(Math.floor(position.x), Math.floor(position.y), TILE + 1, TILE + 1);
    }
  }
  context.restore();
}

function updateGearUi() {
  drawPaperDoll();
  drawPaperDollTo(inventoryPaperContext, inventoryPaperdoll);
  renderEquippedPreview();
}

function drawPaperDollTo(targetContext, targetCanvas, profile = playerAppearance, withEquipment = true) {
  targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetContext.imageSmoothingEnabled = false;
  targetContext.fillStyle = '#02030499';
  targetContext.fillRect(46, 166, 100, 8);
  const resolvedAppearance = resolvePlayerAppearance(profile);
  const layers = withEquipment
    ? playerLayers(profile)
    : composePlayerLayers({
      baseVisual: resolvedAppearance.body,
      hairVisual: resolvedAppearance.hair,
    });
  for (const path of layers) {
    const mirrored = path.startsWith('mirror:');
    const sprite = image(mirrored ? path.slice('mirror:'.length) : path);
    if (!sprite) continue;
    targetContext.save();
    if (mirrored) {
      targetContext.translate(targetCanvas.width, 0);
      targetContext.scale(-1, 1);
    }
    targetContext.drawImage(sprite, 16, 28, 160, 160);
    targetContext.restore();
  }
}

function drawPaperDoll() {
  drawPaperDollTo(characterPaperContext, characterPaperdoll);
}

function renderEquippedPreview() {
  const labels = currentMainMenuModel().labels;
  let equippedCount = 0;

  for (const button of inventoryEquipmentButtons) {
    const slot = button.dataset.equip;
    const item = equippedItem(slot);
    const icon = button.querySelector('img');
    const slotLabel = labels.slots[slot] ?? slot;
    button.dataset.equippedSlot = slot;
    button.classList.toggle('selected', slot === selectedEquipmentSlot);
    button.classList.toggle('empty', !item);
    button.disabled = !item;

    if (!item) {
      delete button.dataset.rarity;
      icon.src = inventoryEquipmentPlaceholderIcons.get(slot);
      button.title = slotLabel;
      button.setAttribute('aria-label', `${slotLabel}: ${labels.emptySlot}`);
      button.onclick = null;
      continue;
    }

    equippedCount += 1;
    const displayItem = presentedItem(item);
    const presentation = itemPresentation(displayItem, itemDetailLanguage);
    button.dataset.rarity = String(displayItem.rarity);
    icon.src = assetUrl(displayItem.icon);
    button.title = presentation.name;
    button.setAttribute('aria-label', `${slotLabel}: ${presentation.name}`);
    button.onclick = () => {
      selectedPackIndex = -1;
      selectedEquipmentSlot = slot;
      renderEquippedPreview();
      renderPack();
      openItemDetail(item, { item, slot, source: 'equipment' });
    };
  }

  inventoryEquippedCount.textContent = String(equippedCount);
  inventoryEquippedCount.setAttribute('aria-label', `${labels.equippedTitle}: ${equippedCount}`);
}

function updateSalvageUi() {
  salvageButton.setAttribute('aria-pressed', String(salvageMode));
  document.body.dataset.salvage = String(salvageMode);
  salvageCount.textContent = String(markedForSalvage.size);
  salvageConfirm.querySelector('b').textContent = String(
    [...markedForSalvage].reduce((sum, index) => {
      const item = backpackItems[index];
      const displayItem = item ? presentedItem(item) : null;
      return sum + (displayItem ? 2 + displayItem.rarity * 4 : 0);
    }, 0),
  );
  salvageConfirm.disabled = markedForSalvage.size === 0;
}

function renderPack() {
  packGrid.replaceChildren();
  const labels = currentMainMenuModel().labels;
  const sections = inventorySections({
    inventory: backpackItems.filter(Boolean).map((item) => item.uid),
    equipment: selected,
    items: itemInstances,
    filter: inventoryFilter,
    language: itemDetailLanguage,
    includeEquipped: false,
  });

  for (const section of sections) {
    const heading = document.createElement('h3');
    const headingCopy = document.createElement('span');
    const headingCount = document.createElement('b');
    heading.className = 'inventory-section-title';
    heading.dataset.section = section.id;
    headingCopy.textContent = section.title;
    headingCount.textContent = String(section.entries.length);
    heading.append(headingCopy, headingCount);
    packGrid.append(heading);

    for (const entry of section.entries) {
      const { item } = entry;
      const displayItem = presentedItem(item);
      const index = entry.source === 'pack' ? entry.index : -1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pack-item inventory-row';
      button.dataset.rarity = String(displayItem.rarity);
      button.dataset.slot = displayItem.slot ?? 'consumable';
      if (entry.source === 'pack') button.dataset.packIndex = String(index);
      else {
        button.dataset.equippedSlot = entry.slot;
        button.classList.add('equipped-item-row');
        button.disabled = salvageMode;
      }
      if (salvageMode && entry.source === 'pack' && displayItem.unidentified) {
        button.disabled = true;
      }
      const presentation = itemPresentation(displayItem, itemDetailLanguage);
      button.setAttribute(
        'aria-label',
        `${presentation.name}. ${presentation.rarity}. ${presentation.slot}. ${presentation.primaryEffect.text}`,
      );
      button.title = presentation.name;
      if (
        (entry.source === 'pack' && !selectedEquipmentSlot && index === selectedPackIndex)
        || (entry.source === 'equipment' && entry.slot === selectedEquipmentSlot)
      ) button.classList.add('selected');
      if (entry.source === 'pack' && markedForSalvage.has(index)) button.classList.add('marked');

      const icon = document.createElement('img');
      icon.src = assetUrl(displayItem.icon);
      icon.alt = '';
      const copy = document.createElement('span');
      const name = document.createElement('strong');
      const metadata = document.createElement('span');
      const effect = document.createElement('small');
      copy.className = 'pack-item-copy';
      name.textContent = presentation.name;
      metadata.textContent = entry.source === 'equipment'
        ? `${labels.equipped} · ${item.hands === 2
          ? presentation.slot
          : labels.slots[entry.slot] ?? presentation.slot}`
        : `${presentation.rarity} · ${presentation.slot}`;
      effect.textContent = `${presentation.primaryEffect.icon} ${presentation.primaryEffect.text}`;
      copy.append(name, metadata, effect);
      const value = document.createElement('span');
      value.className = 'pack-item-value';
      value.textContent = item.stack
        ? `×${item.stack}`
        : presentation.rarityMarks;
      value.setAttribute('aria-hidden', 'true');
      button.append(icon, copy, value);

      button.addEventListener('click', () => {
        if (salvageMode) {
          if (entry.source !== 'pack') return;
          if (displayItem.unidentified) return;
          if (markedForSalvage.has(index)) markedForSalvage.delete(index);
          else markedForSalvage.add(index);
          updateSalvageUi();
          renderPack();
          return;
        }
        selectedPackIndex = entry.source === 'pack' ? index : -1;
        selectedEquipmentSlot = entry.source === 'equipment' ? entry.slot : null;
        updateGearUi();
        renderPack();
        openItemDetail(item, entry);
      });
      packGrid.append(button);
    }
  }

  if (sections.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'inventory-empty';
    empty.textContent = labels.emptyBackpack;
    packGrid.append(empty);
  }

  const itemCount = backpackItems.filter(Boolean).length;
  bagButton.querySelector('b').textContent = String(itemCount);
  inventoryCount.textContent = `${itemCount}/12`;
  inventoryCount.setAttribute('aria-label', `${labels.itemCount}: ${itemCount} / 12`);
  updateInventoryViewUi();
}

function focusSelectedInventoryRow() {
  requestAnimationFrame(() => {
    const selector = selectedEquipmentSlot
      ? `[data-equipped-slot="${selectedEquipmentSlot}"]`
      : selectedPackIndex >= 0
        ? `[data-pack-index="${selectedPackIndex}"]`
        : null;
    (selector ? inventoryShell.querySelector(selector) : closeInventoryButton)?.focus();
  });
}

function renderLootToast({ item, value }) {
  const definition = item?.id ? lootById(item.id) : null;
  const displayItem = definition ? presentedItem({ ...definition, ...item }) : item;
  const informative = Boolean(definition || displayItem?.unidentified);
  const color = rarityGlow[displayItem?.rarity ?? 1] ?? rarityGlow[1];
  lootToast.style.setProperty('--rarity', color);
  lootToast.dataset.informative = String(informative);
  lootToast.querySelector('img').src = assetUrl(displayItem?.icon ?? displayItem?.path);

  if (informative) {
    const presentation = itemPresentation(displayItem, itemDetailLanguage);
    const labels = currentMainMenuModel().labels;
    lootName.textContent = presentation.name;
    lootRarity.textContent = presentation.rarityMarks;
    lootRarity.setAttribute('aria-label', presentation.rarity);
    lootSlot.textContent = `${presentation.rarity} · ${presentation.slot}`;
    lootEffect.textContent = value === 'equipped'
      ? labels.equipped
      : value === 'full'
        ? labels.inventoryFullShort
        // A plain sentence means the runtime has something to say about this
        // very use, which beats repeating what the item always does.
        : typeof value === 'string' && value !== ''
          ? value
          : presentation.primaryEffect.text;
    if (definition?.gold && typeof value === 'number') lootValue.textContent = `+${value}`;
    else if (typeof value === 'number' && value > 1) lootValue.textContent = `+${value}`;
    else if ((item.stack ?? 0) > 1) lootValue.textContent = `×${item.stack}`;
    else lootValue.textContent = '';
    lootToast.setAttribute(
      'aria-label',
      `${presentation.name}. ${presentation.rarity}. ${presentation.slot}. ${lootEffect.textContent}`,
    );
    return;
  }

  lootName.textContent = typeof value === 'number' ? `${value >= 0 ? '+' : ''}${value}` : String(value);
  lootRarity.textContent = '';
  lootSlot.textContent = '';
  lootEffect.textContent = '';
  lootValue.textContent = '';
  lootToast.setAttribute('aria-label', lootName.textContent);
}

function showNextLootToast() {
  if (toastVisible || lootToastQueue.length === 0) return;
  const entry = lootToastQueue.shift();
  toastVisible = true;
  activeLootToastEntry = entry;
  renderLootToast(entry);
  lootToast.classList.add('visible');
  const informative = Boolean(entry.item?.id && lootById(entry.item.id));
  toastTimer = window.setTimeout(() => {
    lootToast.classList.remove('visible');
    toastTimer = window.setTimeout(() => {
      toastVisible = false;
      activeLootToastEntry = null;
      showNextLootToast();
    }, 180);
  }, informative ? 2100 : 1250);
}

function showLootToast(item, value = 12) {
  lootToastQueue.push({ item, value });
  if (lootToastQueue.length > 6) lootToastQueue.shift();
  showNextLootToast();
}

function unlockLevelUpAudio() {
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  if (!levelUpAudio || levelUpAudio.state === 'closed') {
    levelUpAudio = new AudioContextConstructor();
    preloadAudioSamples(levelUpAudio);
  }
  const begin = () => startAmbient(biomeThemeForDepth(dungeon.depth).palette);
  if (levelUpAudio.state === 'suspended') levelUpAudio.resume().then(begin).catch(() => {});
  else begin();
  return levelUpAudio;
}

/** Every voice, old or new, mixes through one master gain that the menu controls. */
function audioOutput(audio) {
  if (!audioMasterGain || audioMasterGain.context !== audio) {
    audioMasterGain = audio.createGain();
    audioMasterGain.gain.value = effectiveVolume(audioSettings);
    audioMasterGain.connect(audio.destination);
  }
  return audioMasterGain;
}

function applyAudioSettings() {
  if (levelUpAudio && audioMasterGain) {
    audioMasterGain.gain.setTargetAtTime(
      effectiveVolume(audioSettings),
      levelUpAudio.currentTime,
      0.02,
    );
  }
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, serializeAudioSettings(audioSettings));
  } catch {
    // Storage may be unavailable; the setting still applies to this session.
  }
  renderAudioMenu();
}

function renderAudioMenu() {
  const model = audioMenuModel(audioSettings, itemDetailLanguage);
  mainMenuAudio.setAttribute('aria-label', model.groupLabel);
  audioMuteButton.setAttribute('aria-pressed', String(model.muted));
  audioMuteButton.setAttribute('aria-label', model.muteLabel);
  audioMuteButton.title = model.muteLabel;
  audioMuteButton.textContent = model.muteGlyph;
  audioVolumeValue.textContent = model.volumeText;
  audioVolumeDownButton.setAttribute('aria-label', model.quieterLabel);
  audioVolumeUpButton.setAttribute('aria-label', model.louderLabel);
  audioVolumeDownButton.disabled = !model.canLower;
  audioVolumeUpButton.disabled = !model.canRaise;
}

function decodeAudioSample(audio, bytes) {
  return new Promise((resolve, reject) => {
    const result = audio.decodeAudioData(bytes, resolve, reject);
    if (result && typeof result.then === 'function') result.then(resolve, reject);
  });
}

/** Fetches and decodes one sample once; a failure leaves the synth voice in charge. */
function loadAudioSample(audio, file) {
  if (audioSampleBuffers.has(file)) return Promise.resolve(audioSampleBuffers.get(file));
  if (!audioSamplePromises.has(file)) {
    const promise = fetch(new URL(file, audioSampleRoot).href)
      .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
      .then((bytes) => decodeAudioSample(audio, bytes))
      .catch(() => null)
      .then((buffer) => {
        audioSampleBuffers.set(file, buffer);
        audioSamplePromises.delete(file);
        return buffer;
      });
    audioSamplePromises.set(file, promise);
  }
  return audioSamplePromises.get(file);
}

function preloadAudioSamples(audio) {
  if (typeof fetch !== 'function') return;
  for (const file of AUDIO_SAMPLE_FILES) loadAudioSample(audio, file);
}

function playSampleBuffer(audio, buffer, gainValue, start) {
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.value = gainValue;
  source.connect(gain);
  gain.connect(audioOutput(audio));
  source.start(start);
  return source;
}

/** A loaded sample shadows the synth recipe; anything else falls back to the voices. */
/** Plays one recorded variation; nothing is substituted while a file is still loading. */
function playSound(id, { volume = 1 } = {}) {
  const audio = levelUpAudio;
  if (!audio || audio.state !== 'running' || effectiveVolume(audioSettings) === 0) return false;
  const sample = soundSample(id);
  if (!sample) return false;
  const file = pickSampleFile(sample, Math.random());
  const buffer = audioSampleBuffers.get(file);
  if (!buffer) {
    if (buffer === undefined) loadAudioSample(audio, file);
    return false;
  }
  playSampleBuffer(audio, buffer, sample.gain * volume, audio.currentTime);
  return true;
}

function stopAmbient() {
  const fading = audioAmbient;
  audioAmbientRequest = null;
  audioAmbient = { paletteId: null, file: null, nodes: [], gain: null, sampleGain: null, level: fading.level };
  if (!fading.gain || !levelUpAudio) return;
  const now = levelUpAudio.currentTime;
  fading.gain.gain.setTargetAtTime(0.0001, now, 0.4);
  for (const node of fading.nodes) {
    try {
      node.stop(now + 2);
    } catch {
      // The node may already be stopped.
    }
  }
}

/** Loops the recorded bed of the palette; until it is decoded there is silence. */
function startAmbient(paletteId) {
  const audio = levelUpAudio;
  if (!audio || audio.state !== 'running') return;
  const sample = ambientSample(paletteId);
  const file = pickSampleFile(sample, 0);
  audioAmbientRequest = paletteId;
  if (audioAmbient.gain && audioAmbient.file === file) {
    // The same recording serves another palette: only the mix level moves.
    audioAmbient.paletteId = paletteId;
    audioAmbient.sampleGain.gain.setTargetAtTime(sample.gain, audio.currentTime, 0.8);
    return;
  }
  const buffer = audioSampleBuffers.get(file);
  if (!buffer) {
    if (buffer === undefined) {
      loadAudioSample(audio, file).then((loaded) => {
        if (loaded && audioAmbientRequest === paletteId && audioAmbient.file !== file) startAmbient(paletteId);
      });
    }
    return;
  }
  stopAmbient();
  audioAmbientRequest = paletteId;
  const now = audio.currentTime;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.setTargetAtTime(Math.max(0.0001, audioAmbient.level), now, 1.2);
  gain.connect(audioOutput(audio));
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  // Loop points sit inside the encoder padding so the seam stays silent.
  source.loopStart = Math.min(0.05, buffer.duration / 4);
  source.loopEnd = Math.max(source.loopStart + 0.1, buffer.duration - 0.05);
  const sampleGain = audio.createGain();
  sampleGain.gain.value = sample.gain;
  source.connect(sampleGain);
  sampleGain.connect(gain);
  source.start(now);
  audioAmbient = { paletteId, file, nodes: [source], gain, sampleGain, level: audioAmbient.level };
}

function setAmbientLevel(level) {
  audioAmbient.level = level;
  if (audioAmbient.gain && levelUpAudio) {
    audioAmbient.gain.gain.setTargetAtTime(Math.max(0.0001, level), levelUpAudio.currentTime, 0.5);
  }
}

/** Booleans the onboarding module needs; nothing here mutates game state. */
function currentOnboardingSignals() {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const gridOf = (actor) => ({ x: Math.floor(actor.x / TILE), y: Math.floor(actor.y / TILE) });
  const inSight = (actor) => {
    const cell = gridOf(actor);
    return Math.hypot(cell.x - heroCell.x, cell.y - heroCell.y) <= 4.5 && hasLineOfSight(world, heroCell, cell);
  };
  const liveMonsters = monsters.filter((monster) => !(monster.dead > 0));
  return {
    depth: dungeon.depth,
    inGame: runStatus === 'playing' && !hero.dead,
    moved: playerHasActed,
    enemyVisible: liveMonsters.some(inSight),
    engaged: run.stats.kills > 0
      || liveMonsters.some((monster) => Math.hypot(monster.x - hero.x, monster.y - hero.y) <= TILE * 1.6),
    lootVisible: lootDefinitions.some(inSight),
    pickedUp: run.floor.collected.length > 0,
    interactAvailable: !interactActionButton.hidden,
    interacted: onboardingInteracted || run.floor.opened.length > 0 || run.floor.resolved.length > 0,
    exitRevealed: revealed.has(`${dungeon.exit.x},${dungeon.exit.y}`),
    descended: dungeon.depth > 1,
  };
}

function persistOnboardingState() {
  try {
    localStorage.setItem(ONBOARDING_KEY, serializeOnboardingState(onboardingState));
  } catch {
    // Storage may be unavailable; the hint still behaves for this session.
  }
}

function renderOnboardingHint() {
  const copy = onboardingHintId ? onboardingHintCopy(onboardingHintId, itemDetailLanguage) : null;
  if (!copy) {
    onboardingHint.hidden = true;
    delete onboardingHint.dataset.hint;
    return;
  }
  onboardingHint.dataset.hint = copy.id;
  onboardingGlyph.textContent = copy.glyph;
  onboardingTitle.textContent = copy.title;
  onboardingText.textContent = copy.text;
  onboardingDismissButton.textContent = copy.dismiss;
  onboardingSkipButton.textContent = copy.skip;
  onboardingHint.setAttribute('aria-label', copy.ariaLabel);
  onboardingHint.hidden = false;
}

/** Runs a few times a second on the game screen; the pure module decides what is due. */
function updateOnboarding(time) {
  if (!ready || uiScreen !== 'game' || runStatus !== 'playing') return;
  if (onboardingComplete(onboardingState)) {
    if (onboardingHintId) {
      onboardingHintId = null;
      renderOnboardingHint();
    }
    return;
  }
  if (time - onboardingCheckedAt < 250) return;
  onboardingCheckedAt = time;
  const result = advanceOnboarding(onboardingState, currentOnboardingSignals());
  if (result.changed) {
    onboardingState = result.state;
    persistOnboardingState();
  }
  if (result.hintId !== onboardingHintId) {
    onboardingHintId = result.hintId;
    renderOnboardingHint();
  }
}

function dismissOnboardingHint() {
  if (!onboardingHintId) return;
  onboardingState = markOnboardingSeen(onboardingState, onboardingHintId);
  persistOnboardingState();
  onboardingHintId = null;
  onboardingCheckedAt = Number.NEGATIVE_INFINITY;
  renderOnboardingHint();
  playSound('ui-tap');
}

function skipOnboarding() {
  onboardingState = dismissOnboarding(onboardingState);
  persistOnboardingState();
  onboardingHintId = null;
  renderOnboardingHint();
  playSound('ui-close');
}

function playLevelUpChime(levelsGained) {
  playSound('level-up', { volume: levelsGained > 1 ? 1.15 : 1 });
}

function playSwordRhythmAccent(rank) {
  playSound('sword-accent', { volume: 0.7 + Math.max(1, Math.min(3, rank)) * 0.1 });
}

function playStormCrackle(chainTargets = 0) {
  playSound('storm', { volume: 0.8 + Math.max(0, Math.min(3, chainTargets)) * 0.07 });
}

function clearLevelUpCelebration() {
  window.clearTimeout(levelUpTimer);
  levelUpTimer = 0;
  levelUpCelebration.classList.remove('visible');
  levelUpCelebration.hidden = true;
  hud.classList.remove('skill-point-awarded');
}

function showLevelUpCelebration(progression) {
  const presentation = levelUpPresentation({
    level: hero.level,
    levelsGained: progression.levelsGained,
    skillPointsGained: progression.skillPointsGained,
    language: itemDetailLanguage,
  });
  if (!presentation) return;
  window.clearTimeout(levelUpTimer);
  levelUpLabel.textContent = itemDetailLanguage === 'ru' ? 'НОВЫЙ УРОВЕНЬ' : 'LEVEL UP';
  levelUpValue.textContent = presentation.level;
  levelUpPoints.textContent = presentation.points;
  levelUpCelebration.setAttribute('aria-label', presentation.announcement);
  levelUpCelebration.hidden = false;
  levelUpCelebration.classList.remove('visible');
  hud.classList.remove('skill-point-awarded');
  requestAnimationFrame(() => {
    levelUpCelebration.classList.add('visible');
    hud.classList.add('skill-point-awarded');
  });
  playLevelUpChime(progression.levelsGained);
  if (!reducedMotion) {
    burst(hero.x, hero.y - 10, '#e5c965', 24 + progression.levelsGained * 4);
    addImpactWave(hero.x, hero.y - 10, '#d4b653', 66, 2);
    beginHitStop(0.09);
  }
  levelUpTimer = window.setTimeout(clearLevelUpCelebration, LEVEL_UP_PRESENTATION_MS);
}

function romanDepth(value) {
  const symbols = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  if (value > 19) return String(value);
  let result = '';
  let remaining = value;
  for (const [amount, glyph] of symbols) {
    while (remaining >= amount) {
      result += glyph;
      remaining -= amount;
    }
  }
  return result;
}

function renderHeroEffectsHud() {
  // The dish sits beside the states, because it is one: a good one with a timer.
  const meal = activeMeal(hero.meal, itemDetailLanguage);
  const effects = [
    ...(meal ? [{ ...meal, duration: meal.remaining }] : []),
    ...activeActorEffects(hero.effects, itemDetailLanguage),
  ];
  const secondsLabel = itemDetailLanguage === 'ru' ? 'сек.' : 'sec.';
  heroEffectsHud.setAttribute(
    'aria-label',
    itemDetailLanguage === 'ru' ? 'Состояния героя' : 'Hero effects',
  );
  heroEffectsHud.replaceChildren(
    ...effects.map((effect) => {
      const badge = document.createElement('span');
      const icon = document.createElement('img');
      const duration = document.createElement('b');
      badge.className = 'hero-effect';
      badge.dataset.effect = effect.id;
      badge.style.setProperty('--effect-color', effect.color);
      badge.setAttribute('role', 'img');
      badge.setAttribute(
        'aria-label',
        `${effect.label}: ${Math.ceil(effect.duration)} ${secondsLabel}`,
      );
      badge.title = `${effect.label} · ${Math.ceil(effect.duration)} ${secondsLabel}`;
      icon.src = assetUrl(effect.icon);
      icon.alt = '';
      duration.textContent = String(Math.ceil(effect.duration));
      badge.append(icon, duration);
      return badge;
    }),
  );
  heroEffectsHud.hidden = effects.length === 0;
}

function renderHungerHud() {
  const presentation = hungerPresentation(hero.hunger, itemDetailLanguage);
  hungerMeter.dataset.stage = presentation.id;
  hungerFill.style.transform = `scaleX(${presentation.percent / 100})`;
  hungerMeter.title = `${presentation.label} · ${presentation.minutes} ${itemDetailLanguage === 'ru' ? 'мин' : 'min'}`;
  hud.setAttribute(
    'aria-label',
    `${currentMainMenuModel().labels.hud}. ${presentation.ariaLabel}`,
  );
}

function updateHud() {
  const stats = currentHeroStats();
  const combat = currentHeroCombat();
  const filled = Math.ceil((hero.hp / stats.maxHp) * healthSegments.length);
  skillPointsBadge.hidden = hero.skills.points === 0;
  skillPointsBadge.textContent = `+${hero.skills.points}`;
  skillPointsBadge.title = itemDetailLanguage === 'ru' ? 'Очки навыков' : 'Skill points';
  healthSegments.forEach((segment, index) => segment.classList.toggle('empty', index >= filled));
  combatIndicators[0].textContent = combatGlyph[combat.style] ?? '·';
  combatIndicators[1].textContent = combat.guard > 0 ? '▣' : String(combat.range);
  depthBadge.querySelector('span').textContent = romanDepth(dungeon.depth);
  refreshFloorMapCopy();
  bagButton.querySelector('b').textContent = String(
    backpackItems.filter(Boolean).length,
  );
  currencyValue.textContent = String(gold);
  currency.setAttribute(
    'aria-label',
    `${currentMainMenuModel().labels.gold}: ${gold}`,
  );
  renderHungerHud();
  renderHeroEffectsHud();
  renderSpellBar();
  updateSanctuaryUi();
  updateInteractionUi();
  updateBossHud();
}

function nearbyFind() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return findDefinitions
    .filter(findIsVisible)
    .filter(
      (find) =>
        findIsInteractable(find) &&
        revealed.has(`${Math.floor(find.x / TILE)},${Math.floor(find.y / TILE)}`),
    )
    .filter(
      (find) =>
        Math.abs(cell.x - Math.floor(find.x / TILE)) +
          Math.abs(cell.y - Math.floor(find.y / TILE)) <=
        1,
    )
    .sort(
      (a, b) =>
        Math.hypot(hero.x - a.x, hero.y - a.y) -
        Math.hypot(hero.x - b.x, hero.y - b.y),
    )[0] ?? null;
}

function interactNearbyFind(preferredFind = null, action = null) {
  const find = preferredFind ?? nearbyFind();
  if (!find || !ready || uiScreen !== 'game' || hero.dead || openingDoor) return false;
  const findContainer = find.id === 'sealed-cache'
    ? chestContainerState(find.instanceId)
    : null;
  if (find.id === 'sealed-cache' && action === 'browse' && findContainer?.opened) {
    return openChestContainerUi(find);
  }
  if (find.id === 'sealed-cache' && !findContainer) return false;
  const encounter = (dungeon.roomEncounters ?? []).find(({ findId }) => findId === find.instanceId);
  const livingGuards = encounter?.kind === 'guarded'
    ? monsters.filter(
        (monster) => encounter.monsterIds.includes(monster.instanceId) && monster.dead === 0,
      )
    : [];
  if (livingGuards.length > 0) {
    for (const guard of livingGuards) {
      guard.alerted = Math.max(guard.alerted, guard.pursuit + 2);
      guard.route = [];
      guard.repathCooldown = 0;
      guard.alertFlash = Math.max(guard.alertFlash, 0.35);
    }
    findAnnouncement.textContent = itemDetailLanguage === 'ru'
      ? 'Сундук охраняется'
      : 'The chest is guarded';
    addCombatGlyph(find.x, find.y, '!', '#d8bd68', -48);
    return false;
  }
  const result = resolveFindInteraction({
    find: {
      ...find,
      x: Math.floor(find.x / TILE),
      y: Math.floor(find.y / TILE),
    },
    resolvedFindIds: run.floor.resolvedFindIds,
    runStatus,
    hero: {
      x: Math.floor(hero.x / TILE),
      y: Math.floor(hero.y / TILE),
      hp: hero.hp,
      maxHp: hero.maxHp,
      power: hero.power,
      effects: createActorEffects(hero.effects),
    },
    gold,
    action,
    actor: currentInteractionActor(),
  });
  const presentation = findPresentation(find, itemDetailLanguage);
  const resultPresentation = findResultPresentation(result, find, itemDetailLanguage);
  if (!result.ok) {
    if (result.reason === 'unsafe') {
      findAnnouncement.textContent = resultPresentation?.unsafe || presentation.unsafe;
      addCombatGlyph(find.x, find.y, '!', presentation.color, -38);
      showLootToast({ path: presentation.path, rarity: 0 }, '!');
    }
    return false;
  }

  if (!consumeInteractionResources(result.consumed)) return false;

  hero.path = [];
  hero.pendingAttack = null;
  hero.attack = 0;
  const landmarkResult = result.definition?.wave === 'landmark';
  hero.hp = result.state.hero.hp;
  hero.power = result.state.hero.power;
  if (landmarkResult) {
    // The pure command already capped hp at the effective maximum plus the
    // permanent bonus; only mirror its snapshot back into the runtime hero.
    hero.maxHp = result.state.hero.maxHp;
    hero.effects = createActorEffects(result.state.hero.effects);
    hero.hp = Math.min(hero.hp, currentHeroStats().maxHp);
  }
  if (find.id !== 'sealed-cache') gold = result.state.gold;
  run.floor.resolvedFindIds = [...result.state.resolvedFindIds];
  find.resolved = true;
  if (find.id === 'sealed-cache') find.resolvedAt = elapsed;
  if (result.status) applyHeroStatus(result.status.id, result.status.duration);
  const activeMonsterIds = new Set(monsters.map(({ instanceId }) => instanceId));
  const awakenedSpawns = dungeon.monsters.filter(
    (spawn) =>
      result.activatedMonsterIds?.includes(spawn.instanceId)
      && !activeMonsterIds.has(spawn.instanceId)
      && !run.floor.defeated.includes(spawn.instanceId),
  ).map((spawn) => ({
    ...spawn,
    ...(previewChestNearSpawn && spawn.activationFindId === find.instanceId
      ? { x: Math.floor(find.x / TILE), y: Math.floor(find.y / TILE) }
      : {}),
  }));
  const awakened = createRuntimeMonsters(dungeon, awakenedSpawns);
  for (const monster of awakened) {
    monster.alerted = monster.pursuit + 3;
    monster.alertFlash = 0.55;
    monster.attackCooldown = Math.max(monster.attackCooldown, 0.28);
    monsters.push(monster);
    burst(monster.x, monster.y - 8, '#b45c58', 24);
    addImpactWave(monster.x, monster.y - 4, '#b45c58', 62, 3);
    addCombatGlyph(monster.x, monster.y, '!', '#e0c778', -58);
  }
  playerHasActed = true;
  if (result.damage > 0) {
    hero.hurt = 0.24;
    burst(hero.x, hero.y - 8, '#b45c58', 12);
    addImpactWave(hero.x, hero.y - 6, '#b45c58', 48, 2);
    addCombatGlyph(hero.x, hero.y, result.damage, '#c76a63');
    addBloodImpact({ ...hero, bloodColor: '#6a302b' }, find.x, find.y, false);
    beginHitStop(0.05);
  }
  if (find.id === 'sealed-cache') {
    const consumedByMimic = awakened.length > 0;
    const nextContainer = openChestContainerState(findContainer, {
      damaged: result.action === 'smash' && !consumedByMimic,
      consumedByMimic,
    });
    if (!nextContainer || !replaceChestContainerState(nextContainer)) return false;
    const damaged = nextContainer.destroyed && !consumedByMimic;
    burst(find.x, find.y - 10, consumedByMimic ? '#b45c58' : damaged ? '#b87b62' : presentation.color, 24);
    addImpactWave(find.x, find.y, presentation.color, 50, 1);
    if (damaged) addCombatGlyph(find.x, find.y, '✕', '#cf7068', -44);
    if (result.noise > 0) alertNearbyMonsters(find.x, find.y, result.noise);
    findAnnouncement.textContent = resultPresentation?.message ?? presentation.result;
    updateHud();
    persistRun();
    if (!consumedByMimic) openChestContainerUi(find);
    return true;
  }
  if (landmarkResult) {
    const restored = result.heal > 0 || result.cleansed.length > 0;
    if (restored) {
      burst(hero.x, hero.y - 8, result.cleansed.length > 0 ? '#87cad0' : '#7fbd86', 16);
      addImpactWave(hero.x, hero.y - 8, '#7fbd86', 48, 0);
      if (result.heal > 0) addCombatGlyph(hero.x, hero.y, `+${result.heal}`, '#8fd08c', -62);
    }
    if (result.rewardMaxHp > 0) {
      burst(hero.x, hero.y - 8, '#e0c778', 18);
      addImpactWave(hero.x, hero.y - 8, '#e0c778', 54, 1);
      addCombatGlyph(hero.x, hero.y, `+${result.rewardMaxHp} ♥`, '#e0c778', -74);
    }
    burst(find.x, find.y - 10, result.damage > 0 ? '#b45c58' : presentation.color, 20);
    addImpactWave(find.x, find.y, presentation.color, 54, 1);
    if (result.noise > 0) alertNearbyMonsters(find.x, find.y, result.noise);
    showLootToast(
      { path: presentation.path, rarity: result.damage > 0 ? 2 : 1 },
      result.rewardGold > 0
        ? result.rewardGold
        : result.rewardMaxHp > 0
          ? `+${result.rewardMaxHp} ♥`
          : result.heal > 0
            ? result.heal
            : '✓',
    );
    findAnnouncement.textContent = resultPresentation?.summary
      ? `${resultPresentation.message}. ${resultPresentation.summary}`
      : resultPresentation?.message ?? presentation.result;
    updateHud();
    persistRun();
    return true;
  }
  const damagedLoot = ['smash', 'attack'].includes(result.action);
  const chestDanger = find.id === 'sealed-cache' && result.damage > 0;
  burst(
    find.x,
    find.y - 10,
    damagedLoot ? '#b87b62' : chestDanger ? '#b45c58' : presentation.color,
    damagedLoot || chestDanger ? 24 : find.id === 'crystal-vein' ? 24 : 16,
  );
  addImpactWave(find.x, find.y, presentation.color, find.id === 'crystal-vein' ? 64 : 50, 1);
  if (damagedLoot) addCombatGlyph(find.x, find.y, result.action === 'attack' ? '⚔' : '✕', '#cf7068', -44);
  if (result.rewardPower > 0) {
    addCombatGlyph(hero.x, hero.y, `+${result.rewardPower}`, presentation.color, -62);
  }
  showLootToast(
    { path: presentation.path, rarity: find.id === 'forgotten-grave' ? 2 : 1 },
    awakened.length > 0
      ? '!'
      : result.rewardPower > 0
      ? `+${result.rewardPower} · ${result.rewardGold}●`
      : damagedLoot
        ? `${result.rewardGold}● −${result.destroyedGold}`
        : result.rewardGold,
  );
  if (result.noise > 0) alertNearbyMonsters(find.x, find.y, result.noise);
  const rewardCopy = itemDetailLanguage === 'ru'
    ? `${result.rewardGold} золота получено${result.destroyedGold > 0 ? `, ${result.destroyedGold} уничтожено` : ''}`
    : `${result.rewardGold} gold recovered${result.destroyedGold > 0 ? `, ${result.destroyedGold} destroyed` : ''}`;
  findAnnouncement.textContent = resultPresentation?.message
    ? awakened.length > 0
      ? resultPresentation.message
      : `${resultPresentation.message}. ${rewardCopy}`
    : presentation.result;
  updateHud();
  persistRun();
  return true;
}

function alertNearbyMonsters(x, y, radiusInTiles) {
  if (!Number.isFinite(radiusInTiles) || radiusInTiles <= 0) return 0;
  // Every deed here is the hero's, so stealth muffles all of them.
  const heard = stealthNoiseRadius(radiusInTiles, currentStealthProfile());
  if (heard <= 0) return 0;
  let alertedCount = 0;
  for (const monster of monsters) {
    if (monster.dead > 0 || Math.hypot(monster.x - x, monster.y - y) > heard * TILE) continue;
    monster.alerted = Math.max(monster.alerted, monster.pursuit + heard);
    monster.route = [];
    monster.repathCooldown = 0;
    monster.alertFlash = Math.max(monster.alertFlash, 0.24);
    alertedCount += 1;
  }
  return alertedCount;
}

function nearbyClosedDoor() {
  if (runStatus !== 'playing') return null;
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return doorDefinitions.find(
    (door) =>
      world[door.y]?.[door.x] === 'D' &&
      revealed.has(`${door.x},${door.y}`) &&
      Math.abs(heroCell.x - door.x) + Math.abs(heroCell.y - door.y) === 1,
  ) ?? null;
}

function nearbyDoor() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return doorDefinitions
    .filter((door) => revealed.has(`${door.x},${door.y}`) &&
      Math.abs(cell.x - door.x) + Math.abs(cell.y - door.y) <= 1)
    .sort((a, b) => Math.hypot(hero.x / TILE - a.x - 0.5, hero.y / TILE - a.y - 0.5) -
      Math.hypot(hero.x / TILE - b.x - 0.5, hero.y / TILE - b.y - 0.5))[0] ?? null;
}

function contextModelTarget(entry = contextTarget) {
  if (!entry) return null;
  if (entry.kind === 'merchant') {
    return {
      kind: 'merchant',
      variantId: entry.value.variantId,
      name: merchantPresentation(entry.value.variantId, itemDetailLanguage).name,
      iconPath: entry.value.iconPath,
    };
  }
  if (entry.kind === 'door') {
    return { kind: 'door', open: run.floor.opened.includes(entry.value.instanceId) };
  }
  if (entry.kind === 'campfire') {
    return {
      kind: 'campfire',
      rawMeatCount: interactionResourceCount(RAW_MEAT_ITEM_ID),
    };
  }
  if (entry.kind === 'camp-rest') {
    return { kind: 'camp-rest', reason: campRestDecision().reason };
  }
  if (entry.kind === 'camp-stash') {
    return { kind: 'camp-stash' };
  }
  if (entry.kind === 'guard') {
    return {
      kind: 'guard',
      id: entry.value.id,
      icon: entry.value.spritePath,
    };
  }
  if (entry.kind === 'wildlife') {
    return {
      kind: 'wildlife',
      id: entry.value.id,
      icon: entry.value.spritePath,
    };
  }
  if (entry.kind === 'find') {
    return {
      kind: 'find',
      id: entry.value.id,
      icon: entry.value.definition.animationFrames?.[0] ?? entry.value.definition.path,
      rewardGold: entry.value.rewardGold,
      rewardPower: entry.value.rewardPower,
      riskDamage: entry.value.riskDamage,
      cacheVariant: entry.value.cacheVariant,
      lockTier: entry.value.lockTier,
      trapTier: entry.value.trapTier,
      hazardDamage: entry.value.hazardDamage,
      curseEffectId: entry.value.curseEffectId ?? null,
      curseDuration: entry.value.curseDuration ?? 0,
      mimicMonsterId: entry.value.mimicMonsterId ?? null,
      containerOpened: entry.value.containerOpened === true,
      containerDestroyed: entry.value.containerDestroyed === true,
      ...(entry.value.outcomes ? { outcomes: entry.value.outcomes, themeId: entry.value.themeId } : {}),
    };
  }
  const availability = trapDisarmState(entry.value);
  const presentation = trapDisarmPresentation({
    trap: entry.value,
    effectiveTier: availability?.effectiveTier ?? 0,
    language: itemDetailLanguage,
  });
  return {
    kind: 'trap',
    tier: entry.value.tier,
    canDisarm: availability?.ok === true,
    unavailable: presentation?.unavailable ?? '',
  };
}

/** Props sit on a grid cell of their own; actors and finds carry pixel positions. */
const PROP_INTERACTION_KINDS = new Set(['campfire', 'camp-rest', 'camp-stash']);

function contextTargetIsAdjacent(entry) {
  if (!entry?.value || runStatus !== 'playing') return false;
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const propTarget = PROP_INTERACTION_KINDS.has(entry.kind);
  const pixelActor = entry.kind === 'find' || entry.kind === 'wildlife' || entry.kind === 'guard';
  const x = propTarget
    ? entry.value.gridX
    : pixelActor
      ? Math.floor(entry.value.x / TILE)
      : entry.value.x;
  const y = propTarget
    ? entry.value.gridY
    : pixelActor
      ? Math.floor(entry.value.y / TILE)
      : entry.value.y;
  const distance = Math.abs(heroCell.x - x) + Math.abs(heroCell.y - y);
  if (entry.kind === 'trap') {
    return distance === 1
      && detectedTrapIds.has(entry.value.instanceId)
      && !run.floor.resolved.includes(entry.value.eventId);
  }
  if (entry.kind === 'find') return distance <= 1 && findIsInteractable(entry.value);
  if (entry.kind === 'merchant') return distance <= 1;
  if (propTarget) return distance <= 1;
  if (entry.kind === 'guard') return distance <= 1 && entry.value.neutral && !entry.value.provoked;
  if (entry.kind === 'wildlife') return distance <= 1 && !entry.value.hunted && !entry.value.defeated;
  const open = run.floor.opened.includes(entry.value.instanceId);
  return open ? distance <= 1 : distance === 1;
}

function renderContextActions() {
  if (!contextTarget) return;
  const model = contextActionModel({
    target: contextModelTarget(),
    actor: currentInteractionActor(),
    language: itemDetailLanguage,
    inspected: contextInspected,
  });
  contextActions.style.setProperty('--context-accent', model.accent);
  contextActionList.style.setProperty('--action-count', String(model.actions.length));
  contextActionIcon.src = assetUrl(model.icon);
  contextActionTitle.textContent = model.name;
  contextActionDescription.textContent = model.description;
  closeContextActionsButton.setAttribute('aria-label', model.closeLabel);
  contextActionBackdrop.setAttribute('aria-label', model.closeLabel);
  contextActionList.replaceChildren(...model.actions.map((action) => {
    const button = document.createElement('button');
    const glyph = document.createElement('b');
    const label = document.createElement('span');
    button.type = 'button';
    button.className = 'context-action-button';
    button.dataset.action = action.id;
    button.disabled = !action.enabled;
    button.title = action.hint || action.label;
    button.setAttribute('aria-label', action.hint ? `${action.label}. ${action.hint}` : action.label);
    glyph.textContent = action.glyph;
    glyph.setAttribute('aria-hidden', 'true');
    label.textContent = action.label;
    button.append(glyph, label);
    if (action.hint) {
      const hint = document.createElement('small');
      hint.textContent = action.hint;
      button.classList.add('has-hint');
      button.append(hint);
    }
    button.addEventListener('click', () => performContextAction(action.id));
    return button;
  }));
}

function updateInteractionUi() {
  const target = ready
    && uiScreen === 'game'
    && runStatus === 'playing'
    && !hero.dead
    && !openingDoor
    ? nearbyContextTarget()
    : null;
  if (!target) {
    interactActionButton.hidden = true;
    interactActionButton.disabled = true;
    delete interactActionButton.dataset.interaction;
    return false;
  }
  const model = contextActionModel({
    target: contextModelTarget(target),
    actor: currentInteractionActor(),
    language: itemDetailLanguage,
    inspected: false,
  });
  interactActionButton.hidden = false;
  interactActionButton.disabled = false;
  interactActionButton.dataset.interaction = model.interactionId;
  interactActionButton.style.setProperty('--context-accent', model.accent);
  interactActionButton.setAttribute('aria-label', model.triggerLabel);
  interactActionButton.title = model.triggerLabel;
  interactActionIcon.src = assetUrl(model.icon);
  return true;
}

function openContextActions(nextTarget) {
  if (!ready || uiScreen !== 'game' || hero.dead || openingDoor || !contextTargetIsAdjacent(nextTarget)) {
    return false;
  }
  clearMoveControl();
  hero.path = [];
  hero.pendingAttack = null;
  contextTarget = nextTarget;
  contextInspected = false;
  onboardingInteracted = true;
  playSound('ui-tap');
  uiScreen = 'context';
  document.body.dataset.screen = uiScreen;
  contextActions.inert = false;
  contextActions.setAttribute('aria-hidden', 'false');
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  spellBar.inert = true;
  spellBar.setAttribute('aria-hidden', 'true');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  pauseGameButton.disabled = true;
  interactActionButton.hidden = true;
  interactActionButton.disabled = true;
  renderContextActions();
  requestAnimationFrame(() => contextActionList.querySelector('button:not(:disabled)')?.focus());
  return true;
}

function closeContextActions({ restoreFocus = false } = {}) {
  if (uiScreen !== 'context') return false;
  contextActions.inert = true;
  contextActions.setAttribute('aria-hidden', 'true');
  contextTarget = null;
  contextInspected = false;
  uiScreen = 'game';
  document.body.dataset.screen = uiScreen;
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  spellBar.inert = false;
  spellBar.removeAttribute('aria-hidden');
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  pauseGameButton.disabled = false;
  updateInteractionUi();
  if (restoreFocus) requestAnimationFrame(() => bagButton.focus());
  return true;
}

function activeMerchantState() {
  return merchantStateFor(run.floor.merchants, activeMerchant?.instanceId);
}

function replaceMerchantState(nextState) {
  if (!nextState) return false;
  let replaced = false;
  run.floor.merchants = run.floor.merchants.map((state) => {
    if (state.merchantId !== nextState.merchantId) return state;
    replaced = true;
    return {
      merchantId: nextState.merchantId,
      gold: nextState.gold,
      purchasedEntryIds: [...nextState.purchasedEntryIds],
      buyback: nextState.buyback.map(({ record, price }) => ({
        price,
        record: {
          ...record,
          ...(record.affixIds ? { affixIds: [...record.affixIds] } : {}),
        },
      })),
    };
  });
  return replaced;
}

function merchantItemButton({ item, price, disabled = false, sold = false, badge = null, onActivate }) {
  const displayItem = presentedItem(item);
  const presentation = itemPresentation(displayItem, itemDetailLanguage);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'merchant-item';
  button.dataset.rarity = String(displayItem.rarity ?? 0);
  button.disabled = disabled;
  button.setAttribute(
    'aria-label',
    `${presentation.name}. ${presentation.primaryEffect.text}. ${price} ${currentMainMenuModel().labels.gold}`,
  );
  const icon = document.createElement('img');
  icon.src = assetUrl(displayItem.icon);
  icon.alt = '';
  const copy = document.createElement('span');
  copy.className = 'merchant-item-copy';
  const name = document.createElement('strong');
  name.textContent = presentation.name;
  const effect = document.createElement('small');
  effect.textContent = `${presentation.rarity} · ${presentation.primaryEffect.text}`;
  copy.append(name, effect);
  if (badge) {
    const marker = document.createElement('em');
    marker.textContent = badge;
    copy.append(marker);
  }
  const value = document.createElement('span');
  value.className = 'merchant-item-price';
  value.innerHTML = sold ? `<b>${merchantPresentation(activeMerchant.variantId, itemDetailLanguage).sold}</b>` : `<b>${price}</b><i>●</i>`;
  button.append(icon, copy, value);
  button.addEventListener('click', onActivate);
  return button;
}

function renderMerchantShop() {
  if (!activeMerchant) return;
  const copy = merchantPresentation(activeMerchant.variantId, itemDetailLanguage);
  const merchantState = activeMerchantState();
  if (!merchantState) return;
  merchantShop.lang = itemDetailLanguage;
  merchantShopTitle.textContent = copy.name;
  merchantShopPortrait.src = assetUrl(activeMerchant.actorPath);
  merchantShopGold.querySelector('b').textContent = String(gold);
  merchantShopGold.setAttribute('aria-label', `${copy.playerGold}: ${gold}`);
  merchantShopFunds.querySelector('b').textContent = String(merchantState.gold);
  merchantShopFunds.setAttribute('aria-label', `${copy.merchantGold}: ${merchantState.gold}`);
  closeMerchantShopButton.setAttribute('aria-label', copy.close);
  merchantShop.setAttribute('aria-label', copy.name);
  merchantShopTabs.setAttribute('aria-label', copy.trade);
  merchantShopTabButtons.forEach((button) => {
    const selectedTab = button.dataset.merchantTab === merchantTab;
    button.setAttribute('aria-pressed', String(selectedTab));
    button.textContent = copy[button.dataset.merchantTab];
  });
  merchantShopList.replaceChildren();
  if (merchantTab === 'buy') {
    for (const entry of activeMerchant.stock) {
      const item = materializeInventoryItem(entry.record);
      const sold = merchantState.purchasedEntryIds.includes(entry.entryId);
      merchantShopList.append(merchantItemButton({
        item,
        price: entry.price,
        disabled: sold,
        sold,
        onActivate: () => transactMerchantPurchase(entry.entryId),
      }));
    }
    for (const entry of merchantState.buyback) {
      const item = materializeInventoryItem(entry.record);
      merchantShopList.append(merchantItemButton({
        item,
        price: entry.price,
        badge: copy.buyback,
        onActivate: () => transactMerchantBuyback(entry.record.uid),
      }));
    }
  } else {
    for (const item of backpackItems.filter(Boolean)) {
      merchantShopList.append(merchantItemButton({
        item,
        price: merchantSellPrice(item),
        onActivate: () => transactMerchantSale(item.uid),
      }));
    }
  }
  if (merchantShopList.childElementCount === 0) {
    const empty = document.createElement('p');
    empty.className = 'merchant-shop-empty';
    empty.textContent = copy.empty;
    merchantShopList.append(empty);
  }
}

function merchantFailureCopy(reason) {
  const copy = merchantPresentation(activeMerchant.variantId, itemDetailLanguage);
  if (reason === 'merchant-poor') return copy.merchantPoor;
  if (reason === 'merchant-full') return copy.merchantFull;
  return copy[reason] ?? (itemDetailLanguage === 'ru' ? 'Сделка невозможна' : 'Trade unavailable');
}

const CHEST_CONTAINER_COPY = Object.freeze({
  ru: Object.freeze({
    title: 'Сундук',
    campTitle: 'Сундук лагеря',
    destroyedTitle: 'Разбитый сундук',
    open: 'Открыт',
    destroyed: 'Повреждён · хранение недоступно',
    storage: 'Сундук',
    backpack: 'Рюкзак',
    emptyStorage: 'Пусто',
    emptyBackpack: 'В рюкзаке пусто',
    gold: 'Золото',
    takeGold: 'Забрать всё',
    taken: 'Предмет взят',
    stored: 'Предмет положен',
    full: 'Нет свободного места',
    broken: 'В разбитый сундук нельзя класть вещи',
    unavailable: 'Действие недоступно',
    close: 'Закрыть сундук',
  }),
  en: Object.freeze({
    title: 'Chest',
    campTitle: 'Camp chest',
    destroyedTitle: 'Broken chest',
    open: 'Open',
    destroyed: 'Damaged · storage unavailable',
    storage: 'Chest',
    backpack: 'Backpack',
    emptyStorage: 'Empty',
    emptyBackpack: 'Backpack is empty',
    gold: 'Gold',
    takeGold: 'Take all',
    taken: 'Item taken',
    stored: 'Item stored',
    full: 'No free space',
    broken: 'A broken chest cannot store items',
    unavailable: 'Action unavailable',
    close: 'Close chest',
  }),
});

function chestContainerCopy() {
  return CHEST_CONTAINER_COPY[itemDetailLanguage === 'en' ? 'en' : 'ru'];
}

function chestContainerState(findId = activeChestFindId) {
  if (findId === CAMP_STASH_CONTAINER_ID) return run.camp.stash;
  return run.floor.chests.find((container) => container.findId === findId) ?? null;
}

function replaceChestContainerState(nextContainer) {
  if (!nextContainer) return false;
  if (nextContainer.findId === CAMP_STASH_CONTAINER_ID) {
    // The camp chest belongs to the run, so it survives the descent with its
    // contents; only the camp around it is left behind on the old floor.
    run.camp = { stash: { ...nextContainer, items: nextContainer.items.map((item) => ({ ...item })) } };
    return true;
  }
  let replaced = false;
  run.floor.chests = run.floor.chests.map((container) => {
    if (container.findId !== nextContainer.findId) return container;
    replaced = true;
    return {
      ...nextContainer,
      items: nextContainer.items.map((item) => ({ ...item })),
    };
  });
  const find = findDefinitions.find(({ instanceId }) => instanceId === nextContainer.findId);
  if (find) {
    find.containerOpened = nextContainer.opened === true;
    find.containerDestroyed = nextContainer.destroyed === true;
    find.consumedByMimic = nextContainer.destroyed === true && find.cacheVariant === 'mimic';
  }
  return replaced;
}

function chestTransferItemButton({ item, direction, disabled = false, onActivate }) {
  const displayItem = presentedItem(item);
  const presentation = itemPresentation(displayItem, itemDetailLanguage);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chest-transfer-item';
  button.dataset.rarity = String(displayItem.rarity ?? 0);
  button.dataset.transfer = direction;
  button.disabled = disabled;
  const action = direction === 'take'
    ? (itemDetailLanguage === 'ru' ? 'Взять' : 'Take')
    : (itemDetailLanguage === 'ru' ? 'Положить' : 'Store');
  button.setAttribute(
    'aria-label',
    `${action}: ${presentation.name}. ${presentation.primaryEffect?.text ?? presentation.rarity}`,
  );
  const icon = document.createElement('img');
  icon.src = assetUrl(displayItem.icon);
  icon.alt = '';
  const copy = document.createElement('span');
  copy.className = 'chest-transfer-copy';
  const name = document.createElement('strong');
  name.textContent = presentation.name;
  const effect = document.createElement('small');
  effect.textContent = `${presentation.rarity} · ${presentation.primaryEffect?.text ?? ''}`;
  copy.append(name, effect);
  const arrow = document.createElement('span');
  arrow.className = 'chest-transfer-arrow';
  arrow.textContent = direction === 'take' ? '↓' : '↑';
  arrow.setAttribute('aria-hidden', 'true');
  button.append(icon, copy, arrow);
  button.addEventListener('click', onActivate);
  return button;
}

function chestTransferEmpty(copy) {
  const empty = document.createElement('p');
  empty.className = 'chest-transfer-empty';
  empty.textContent = copy;
  return empty;
}

function renderChestContainer() {
  const container = chestContainerState();
  if (!container) return false;
  const copy = chestContainerCopy();
  const find = findDefinitions.find(({ instanceId }) => instanceId === container.findId);
  const frames = find?.definition.animationFrames;
  chestContainer.lang = itemDetailLanguage;
  // The camp chest says so, or a player would take it for dungeon furniture.
  const plainTitle = container.findId === CAMP_STASH_CONTAINER_ID ? copy.campTitle : copy.title;
  chestContainerTitle.textContent = container.destroyed ? copy.destroyedTitle : plainTitle;
  chestContainerStateLabel.textContent = container.destroyed ? copy.destroyed : copy.open;
  chestStorageTitle.textContent = copy.storage;
  chestBackpackTitle.textContent = copy.backpack;
  chestStorageCount.textContent = `${container.items.length}/${CHEST_CONTAINER_CAPACITY}`;
  chestBackpackCount.textContent = `${backpackItems.length}/${HERO_BACKPACK_CAPACITY}`;
  chestContainer.setAttribute('aria-label', chestContainerTitle.textContent);
  closeChestContainerButton.setAttribute('aria-label', copy.close);
  chestContainerIcon.src = assetUrl(
    Array.isArray(frames) && frames.length > 0
      ? frames.at(-1)
      : find?.definition.path ?? 'licensed/cmski-chests/wooden/4.png',
  );

  chestStorageList.replaceChildren();
  if (container.gold > 0) {
    const goldButton = document.createElement('button');
    goldButton.type = 'button';
    goldButton.className = 'chest-transfer-gold';
    goldButton.dataset.transfer = 'take';
    goldButton.setAttribute('aria-label', `${copy.takeGold}: ${container.gold} ${copy.gold}`);
    const icon = document.createElement('img');
    icon.src = assetUrl('item/gold/16.png');
    icon.alt = '';
    const label = document.createElement('span');
    label.className = 'chest-transfer-copy';
    const name = document.createElement('strong');
    name.textContent = copy.gold;
    const amount = document.createElement('small');
    amount.textContent = `${container.gold} · ${copy.takeGold}`;
    label.append(name, amount);
    const arrow = document.createElement('span');
    arrow.className = 'chest-transfer-arrow';
    arrow.textContent = '↓';
    arrow.setAttribute('aria-hidden', 'true');
    goldButton.append(icon, label, arrow);
    goldButton.addEventListener('click', transactChestGold);
    chestStorageList.append(goldButton);
  }
  for (const record of container.items) {
    const item = materializeInventoryItem(record);
    if (!item) continue;
    const canMerge = !item.slot && backpackItems.some((candidate) => candidate.id === item.id);
    chestStorageList.append(chestTransferItemButton({
      item,
      direction: 'take',
      disabled: backpackItems.length >= HERO_BACKPACK_CAPACITY && !canMerge,
      onActivate: () => transactChestItem('take', record.uid),
    }));
  }
  if (chestStorageList.childElementCount === 0) {
    chestStorageList.append(chestTransferEmpty(copy.emptyStorage));
  }

  chestBackpackList.replaceChildren();
  for (const item of backpackItems.filter(Boolean)) {
    const canMerge = !item.slot && container.items.some((record) => record.id === item.id);
    chestBackpackList.append(chestTransferItemButton({
      item,
      direction: 'store',
      disabled: container.destroyed
        || (container.items.length >= CHEST_CONTAINER_CAPACITY && !canMerge),
      onActivate: () => transactChestItem('store', item.uid),
    }));
  }
  if (chestBackpackList.childElementCount === 0) {
    chestBackpackList.append(chestTransferEmpty(copy.emptyBackpack));
  }
  return true;
}

function chestFailureCopy(reason) {
  const copy = chestContainerCopy();
  if (reason === 'full') return copy.full;
  if (reason === 'destroyed') return copy.broken;
  return copy.unavailable;
}

function transactChestItem(direction, uid) {
  const container = chestContainerState();
  if (uiScreen !== 'chest' || !container) return false;
  const state = currentItemState();
  const type = direction === 'take' ? CHEST_CONTAINER_COMMANDS.take : CHEST_CONTAINER_COMMANDS.store;
  const command = nextGameCommand(type, container.findId, { uid });
  const result = direction === 'take'
    ? takeChestItem({ command, container, uid, items: state.items, inventory: state.inventory })
    : storeChestItem({ command, container, uid, items: state.items, inventory: state.inventory });
  if (!result.ok) {
    chestContainerFeedback.textContent = chestFailureCopy(result.reason);
    return false;
  }
  replaceChestContainerState(result.state.container);
  applyItemState({
    items: result.state.items,
    inventory: result.state.inventory,
    equipment: state.equipment,
  });
  chestContainerFeedback.textContent = direction === 'take'
    ? chestContainerCopy().taken
    : chestContainerCopy().stored;
  playerHasActed = true;
  applyGameEvents(result.events);
  renderChestContainer();
  persistRun();
  return true;
}

function transactChestGold() {
  const container = chestContainerState();
  if (uiScreen !== 'chest' || !container) return false;
  const command = nextGameCommand(CHEST_CONTAINER_COMMANDS.takeGold, container.findId);
  const result = takeChestGold({ command, container, gold });
  if (!result.ok) {
    chestContainerFeedback.textContent = chestFailureCopy(result.reason);
    return false;
  }
  const amount = result.state.gold - gold;
  gold = result.state.gold;
  replaceChestContainerState(result.state.container);
  chestContainerFeedback.textContent = `+${amount} ●`;
  playerHasActed = true;
  applyGameEvents(result.events);
  updateHud();
  renderChestContainer();
  persistRun();
  return true;
}

function openChestContainerUi(find) {
  const container = chestContainerState(find?.instanceId);
  if (
    !find
    || !container?.opened
    || uiScreen !== 'game'
    || hero.dead
    || runStatus !== 'playing'
    || find.consumedByMimic
  ) return false;
  playSound('chest');
  clearMoveControl();
  hero.path = [];
  hero.pendingAttack = null;
  activeChestFindId = find.instanceId;
  chestContainerFeedback.textContent = '';
  uiScreen = 'chest';
  document.body.dataset.screen = uiScreen;
  chestContainer.inert = false;
  chestContainer.setAttribute('aria-hidden', 'false');
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  spellBar.inert = true;
  spellBar.setAttribute('aria-hidden', 'true');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  pauseGameButton.disabled = true;
  renderChestContainer();
  requestAnimationFrame(() => (
    chestStorageList.querySelector('button:not(:disabled)')
    ?? chestBackpackList.querySelector('button:not(:disabled)')
    ?? closeChestContainerButton
  ).focus());
  return true;
}

/** The camp chest opens the same two-panel screen as any container. */
function openCampStashUi() {
  if (uiScreen !== 'game' || hero.dead || runStatus !== 'playing' || !run.floor.camp) return false;
  playSound('chest');
  clearMoveControl();
  hero.path = [];
  hero.pendingAttack = null;
  activeChestFindId = CAMP_STASH_CONTAINER_ID;
  chestContainerFeedback.textContent = '';
  uiScreen = 'chest';
  document.body.dataset.screen = uiScreen;
  chestContainer.inert = false;
  chestContainer.setAttribute('aria-hidden', 'false');
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  spellBar.inert = true;
  spellBar.setAttribute('aria-hidden', 'true');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  pauseGameButton.disabled = true;
  renderChestContainer();
  requestAnimationFrame(() => (
    chestStorageList.querySelector('button:not(:disabled)')
    ?? chestBackpackList.querySelector('button:not(:disabled)')
    ?? closeChestContainerButton
  ).focus());
  return true;
}

function closeChestContainerUi() {
  if (uiScreen !== 'chest') return false;
  chestContainer.inert = true;
  chestContainer.setAttribute('aria-hidden', 'true');
  activeChestFindId = null;
  uiScreen = 'game';
  document.body.dataset.screen = uiScreen;
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  spellBar.inert = false;
  spellBar.removeAttribute('aria-hidden');
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  pauseGameButton.disabled = false;
  updateInteractionUi();
  requestAnimationFrame(() => interactActionButton.focus());
  return true;
}

function transactMerchantPurchase(entryId) {
  if (uiScreen !== 'merchant' || !activeMerchant) return false;
  const state = currentItemState();
  const merchantState = activeMerchantState();
  if (!merchantState) return false;
  const command = nextGameCommand(MERCHANT_COMMANDS.buy, activeMerchant.instanceId, { entryId });
  const result = buyMerchantItem({
    command,
    merchant: activeMerchant,
    merchantState,
    entryId,
    gold,
    items: state.items,
    inventory: state.inventory,
  });
  if (!result.ok) {
    merchantShopFeedback.textContent = merchantFailureCopy(result.reason);
    return false;
  }
  replaceMerchantState(result.state.merchantState);
  applyItemState({ items: result.state.items, inventory: result.state.inventory, equipment: state.equipment });
  gold = result.state.gold;
  merchantShopFeedback.textContent = merchantPresentation(activeMerchant.variantId, itemDetailLanguage).purchased;
  playerHasActed = true;
  applyGameEvents(result.events);
  updateHud();
  renderMerchantShop();
  persistRun();
  return true;
}

function transactMerchantSale(uid) {
  if (uiScreen !== 'merchant' || !activeMerchant) return false;
  const state = currentItemState();
  const merchantState = activeMerchantState();
  if (!merchantState) return false;
  const command = nextGameCommand(MERCHANT_COMMANDS.sell, activeMerchant.instanceId, { uid });
  const result = sellMerchantItem({
    command,
    merchant: activeMerchant,
    merchantState,
    uid,
    gold,
    items: state.items,
    inventory: state.inventory,
  });
  if (!result.ok) {
    merchantShopFeedback.textContent = merchantFailureCopy(result.reason);
    return false;
  }
  replaceMerchantState(result.state.merchantState);
  applyItemState({ items: result.state.items, inventory: result.state.inventory, equipment: state.equipment });
  gold = result.state.gold;
  merchantShopFeedback.textContent = `+${result.state.transactionAmount} ●`;
  playerHasActed = true;
  applyGameEvents(result.events);
  updateHud();
  renderMerchantShop();
  persistRun();
  return true;
}

function transactMerchantBuyback(uid) {
  if (uiScreen !== 'merchant' || !activeMerchant) return false;
  const state = currentItemState();
  const merchantState = activeMerchantState();
  if (!merchantState) return false;
  const command = nextGameCommand(MERCHANT_COMMANDS.buyback, activeMerchant.instanceId, { uid });
  const result = buybackMerchantItem({
    command,
    merchant: activeMerchant,
    merchantState,
    uid,
    gold,
    items: state.items,
    inventory: state.inventory,
  });
  if (!result.ok) {
    merchantShopFeedback.textContent = merchantFailureCopy(result.reason);
    return false;
  }
  replaceMerchantState(result.state.merchantState);
  applyItemState({ items: result.state.items, inventory: result.state.inventory, equipment: state.equipment });
  gold = result.state.gold;
  merchantShopFeedback.textContent = merchantPresentation(activeMerchant.variantId, itemDetailLanguage).purchased;
  playerHasActed = true;
  applyGameEvents(result.events);
  updateHud();
  renderMerchantShop();
  persistRun();
  return true;
}

function openMerchantShop(merchant) {
  if (!merchant || uiScreen !== 'game' || hero.dead || runStatus !== 'playing') return false;
  clearMoveControl();
  hero.path = [];
  hero.pendingAttack = null;
  activeMerchant = merchant;
  merchantTab = 'buy';
  merchantShopFeedback.textContent = '';
  uiScreen = 'merchant';
  document.body.dataset.screen = uiScreen;
  merchantShop.inert = false;
  merchantShop.setAttribute('aria-hidden', 'false');
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  spellBar.inert = true;
  spellBar.setAttribute('aria-hidden', 'true');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  pauseGameButton.disabled = true;
  renderMerchantShop();
  requestAnimationFrame(() => merchantShopList.querySelector('button:not(:disabled)')?.focus() ?? closeMerchantShopButton.focus());
  return true;
}

function closeMerchantShop() {
  if (uiScreen !== 'merchant') return false;
  merchantShop.inert = true;
  merchantShop.setAttribute('aria-hidden', 'true');
  activeMerchant = null;
  uiScreen = 'game';
  document.body.dataset.screen = uiScreen;
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  spellBar.inert = false;
  spellBar.removeAttribute('aria-hidden');
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  pauseGameButton.disabled = false;
  updateInteractionUi();
  requestAnimationFrame(() => interactActionButton.focus());
  return true;
}

function nearbyMerchant() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return merchantDefinitions
    .filter((merchant) => revealed.has(`${merchant.x},${merchant.y}`))
    .filter((merchant) => Math.abs(cell.x - merchant.x) + Math.abs(cell.y - merchant.y) <= 1)
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId))[0] ?? null;
}

function nearbyCampfire() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return dungeonEnvironment.props
    .filter(({ interactionId, gridX, gridY }) =>
      interactionId === 'campfire'
      && revealed.has(`${gridX},${gridY}`)
      && Math.abs(cell.x - gridX) + Math.abs(cell.y - gridY) <= 1)
    .sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
}

function nearbyWildlife() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return passiveCreatures
    .filter((creature) => !creature.hunted && !creature.defeated)
    .filter((creature) => revealed.has(`${Math.floor(creature.x / TILE)},${Math.floor(creature.y / TILE)}`))
    .filter((creature) =>
      Math.abs(cell.x - Math.floor(creature.x / TILE))
      + Math.abs(cell.y - Math.floor(creature.y / TILE)) <= 1)
    .sort((left, right) => left.instanceId.localeCompare(right.instanceId))[0] ?? null;
}

function beginNearbyWildlifeHunt(creature) {
  if (!creature || hero.dead || runStatus !== 'playing') return false;
  const command = nextGameCommand(SURVIVAL_COMMANDS.hunt, creature.instanceId);
  const result = beginWildlifeHunt({ command, creature });
  if (!result.ok) return false;
  Object.assign(creature, result.state.creature, {
    wanderTarget: null,
    wanderCooldown: 0,
    route: [],
    repathCooldown: 0,
  });
  playerHasActed = true;
  applyGameEvents(result.events);
  persistRun();
  updateInteractionUi();
  return true;
}

function cookAtCampfire(site) {
  if (!site || hero.dead || runStatus !== 'playing') return false;
  const amount = interactionResourceCount(RAW_MEAT_ITEM_ID);
  if (amount < 1) return false;
  const command = nextGameCommand(SURVIVAL_COMMANDS.cook, site.id, { amount });
  const current = currentItemState();
  const outputId = cookedItemId(cookingProfile(currentSkillCapabilities()));
  const result = cookMeat({
    command,
    siteId: site.id,
    items: current.items,
    inventory: current.inventory,
    amount,
    outputId,
    outputUid: `${outputId}-${dungeon.depth}-${command.sequence}`,
  });
  if (!result.ok) return false;
  applySurvivalItemState(result.state);
  playerHasActed = true;
  burst(site.x * TILE, site.y * TILE - 10, '#d88447', 20);
  addImpactWave(site.x * TILE, site.y * TILE - 4, '#e3a25a', 56, 0);
  applyGameEvents(result.events);
  persistRun();
  return true;
}

/** The nearest guard still keeping the peace; a provoked one is just an enemy. */
function nearbyGuard() {
  if (runStatus !== 'playing' || hero.dead) return null;
  // The same neighbourhood the panel checks, so the button never lies.
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return monsters.find((monster) => (
    monster.neutral
    && !monster.provoked
    && monster.dead === 0
    && Math.abs(cell.x - Math.floor(monster.x / TILE)) + Math.abs(cell.y - Math.floor(monster.y / TILE)) <= 1
  )) ?? null;
}

function nearbyContextTarget() {
  const merchant = nearbyMerchant();
  if (merchant) return { kind: 'merchant', value: merchant };
  const find = nearbyFind();
  if (find) return { kind: 'find', value: find };
  const trap = nearbyDetectedTrap();
  if (trap) return { kind: 'trap', value: trap };
  const campfire = nearbyCampfire();
  if (campfire && interactionResourceCount(RAW_MEAT_ITEM_ID) > 0) {
    return { kind: 'campfire', value: campfire };
  }
  const bedroll = nearbyCampProp('camp-rest');
  if (bedroll) return { kind: 'camp-rest', value: bedroll };
  const campChest = nearbyCampProp('camp-stash');
  if (campChest) return { kind: 'camp-stash', value: campChest };
  const guard = nearbyGuard();
  if (guard) return { kind: 'guard', value: guard };
  const wildlife = nearbyWildlife();
  if (wildlife) return { kind: 'wildlife', value: wildlife };
  if (campfire) return { kind: 'campfire', value: campfire };
  const door = nearbyDoor();
  return door ? { kind: 'door', value: door } : null;
}

function openNearbyContextActions() {
  const target = nearbyContextTarget();
  return target ? openContextActions(target) : false;
}

const CONTEXT_COMMAND_HANDLERS = Object.freeze({
  inspect() {
    contextInspected = true;
    renderContextActions();
    contextActionDescription.setAttribute('aria-live', 'polite');
    return true;
  },
  'door-transition'({ target, action }) {
    closeContextActions();
    return beginDoorTransition(target.value, action.id === 'open');
  },
  'trap-disarm'({ target }) {
    closeContextActions();
    return interactNearbyTrap(target.value);
  },
  'find-interact'({ target, action }) {
    closeContextActions();
    return interactNearbyFind(target.value, action.id);
  },
  trade({ target }) {
    const merchant = target.value;
    closeContextActions();
    return openMerchantShop(merchant);
  },
  'provoke-guard'({ target }) {
    closeContextActions();
    if (!target?.value || !target.value.neutral || target.value.provoked) return false;
    provokeCityWatch(target.value);
    playSound('ui-tap');
    return true;
  },
  'hunt-wildlife'({ target }) {
    const creature = target.value;
    closeContextActions();
    return beginNearbyWildlifeHunt(creature);
  },
  'cook-meat'({ target }) {
    const site = target.value;
    closeContextActions();
    return cookAtCampfire(site);
  },
  'camp-rest'() {
    closeContextActions();
    return restAtCamp();
  },
  'camp-stash'() {
    closeContextActions();
    activeChestFindId = CAMP_STASH_CONTAINER_ID;
    return openCampStashUi();
  },
});

function performContextAction(actionId) {
  if (uiScreen !== 'context' || !contextTarget || !contextTargetIsAdjacent(contextTarget)) {
    closeContextActions();
    return false;
  }
  const model = contextActionModel({
    target: contextModelTarget(),
    actor: currentInteractionActor(),
    language: itemDetailLanguage,
    inspected: contextInspected,
  });
  const action = model.actions.find(({ id }) => id === actionId);
  const handler = action?.enabled ? CONTEXT_COMMAND_HANDLERS[action.command] : null;
  return typeof handler === 'function' ? handler({ target: contextTarget, action, model }) : false;
}

function triggerDoorSurprise(door) {
  if (!door.surpriseId || run.floor.triggered.includes(door.surpriseId)) return;
  const surprise = dungeon.surprises.find(({ id }) => id === door.surpriseId);
  if (!surprise) return;
  run.floor.triggered.push(surprise.id);
  for (const monster of monsters) {
    if (!surprise.monsterIds.includes(monster.instanceId) || monster.dead > 0) continue;
    monster.alerted = monster.pursuit + 2;
    monster.route = [];
    monster.repathCooldown = 0;
  }
  if (surprise.type === 'horde') {
    const monster = monsters.find((candidate) => surprise.monsterIds.includes(candidate.instanceId));
    showLootToast({ path: monster?.spritePath ?? 'dngn/doors/closed_door.png', rarity: 0 }, '!');
  } else if (surprise.type === 'treasure') {
    showLootToast({ icon: 'item/gold/16.png', rarity: 2 }, '●●●');
  } else {
    showLootToast({ icon: 'item/gold/16.png', rarity: 3 }, '!?');
  }
}

function beginOpenDoor(door = nearbyClosedDoor()) {
  return beginDoorTransition(door, true);
}

function toggleNearbyDoor() {
  const door = nearbyDoor();
  return door ? beginDoorTransition(door, !run.floor.opened.includes(door.instanceId)) : false;
}

function beginDoorTransition(door, targetOpen) {
  if (!ready || uiScreen !== 'game' || hero.dead || !door || openingDoor || runStatus !== 'playing') return false;
  if (!doorDefinitions.some(({ instanceId }) => instanceId === door.instanceId) ||
    !revealed.has(`${door.x},${door.y}`)) return false;
  const wasOpen = run.floor.opened.includes(door.instanceId);
  if (wasOpen === targetOpen) return false;
  const distance = Math.abs(Math.floor(hero.x / TILE) - door.x) +
    Math.abs(Math.floor(hero.y / TILE) - door.y);
  if (distance > 1 || (targetOpen && distance !== 1)) return false;
  const merchants = (typeof merchantDefinitions === 'undefined' ? [] : merchantDefinitions)
    .map((merchant) => ({ x: (merchant.x + 0.5) * TILE, y: (merchant.y + 0.5) * TILE }));
  if (!targetOpen && !canCloseDoor({
    door,
    actors: [hero, ...monsters, ...passiveCreatures.filter((creature) => !creature.defeated), ...merchants],
    tileSize: TILE,
  })) {
    doorAnnouncement.textContent = currentMainMenuModel().labels.doorBlocked;
    addCombatGlyph((door.x + 0.5) * TILE, (door.y + 0.5) * TILE, '!', '#dec982', -36);
    showLootToast({ path: 'dngn/doors/open_door.png', rarity: 0 }, '!');
    return false;
  }
  hero.path = [];
  playSound('door');
  hazardInputState = createHazardInputState();
  permittedHazardCell = null;
  playerHasActed = true;
  openingDoor = { door, wasOpen, targetOpen, elapsed: 0, duration: reducedMotion ? 0.16 : 0.62 };
  // Some pure runtime tests execute the door state machine without mounting the HUD.
  if (typeof updateInteractionUi === 'function') updateInteractionUi();
  // Reserve the empty threshold immediately. Saved state commits only when the
  // animation finishes, so an interrupted action reloads its previous state.
  if (!targetOpen) world[door.y][door.x] = 'D';
  doorAnnouncement.textContent = '';
  return true;
}

function updateDoorOpening(delta) {
  if (!openingDoor) return;
  const { door, targetOpen, wasOpen } = openingDoor;
  if (hero.dead || runStatus !== 'playing') {
    world[door.y][door.x] = wasOpen ? '.' : 'D';
    openingDoor = null;
    rebuildDungeonWorld3D();
    return;
  }
  openingDoor.elapsed = Math.min(openingDoor.duration, openingDoor.elapsed + delta);
  const progress = openingDoor.elapsed / openingDoor.duration;
  dungeonWorld3D.setDoorOpenProgress(door.x, door.y, targetOpen ? progress : 1 - progress);
  if (progress < 1) return;

  world[door.y][door.x] = targetOpen ? '.' : 'D';
  if (targetOpen) {
    if (!run.floor.opened.includes(door.instanceId)) run.floor.opened.push(door.instanceId);
  } else {
    run.floor.opened = run.floor.opened.filter((id) => id !== door.instanceId);
  }
  openingDoor = null;
  const worldX = (door.x + 0.5) * TILE;
  const worldY = (door.y + 0.5) * TILE;
  burst(worldX, worldY - 5, '#a99a72', 6);
  addImpactWave(worldX, worldY, '#746a52', 32, 0);
  revealAround(
    revealed,
    world,
    { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) },
    4,
  );
  if (targetOpen) {
    triggerDoorSurprise(door);
    discoverNearbyTraps();
  }
  doorAnnouncement.textContent = currentMainMenuModel().labels[targetOpen ? 'doorOpened' : 'doorClosed'];
  rebuildDungeonWorld3D();
  updateHud();
  persistRun();
}

function updateSanctuaryUi() {
  if (!dungeon.sanctuary || runStatus !== 'playing') {
    sanctuaryAction.hidden = true;
    return;
  }
  const injured = hero.hp < currentHeroStats().maxHp;
  sanctuaryAction.hidden = !heroNearSanctuary() || !injured;
  sanctuaryAction.disabled = gold < SANCTUARY_COST;
}

function updateBossHud() {
  const boss = activeBoss();
  const visible = boss && isCurrentlyVisible(boss.x, boss.y) && runStatus === 'playing';
  bossHud.hidden = !visible;
  if (!visible) return;
  const percent = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
  bossHud.querySelector('img').src = assetUrl(boss.spritePath);
  bossHealth.querySelector('i').style.transform = `scaleX(${percent})`;
  bossHealth.setAttribute('aria-valuenow', String(Math.round(percent * 100)));
}

function renderAppearanceEditor() {
  const position = playerAppearancePosition(appearanceDraft);
  appearanceBodyValue.textContent = `${position.body + 1}/${PLAYER_BODY_OPTIONS.length}`;
  appearanceHairValue.textContent = `${position.hair + 1}/${PLAYER_HAIR_OPTIONS.length}`;
  drawPaperDollTo(appearancePaperContext, appearancePaperdoll, appearanceDraft, false);
}

function openAppearanceEditor() {
  if (!ready || uiScreen !== 'menu') return false;
  appearanceDraft = playerAppearance;
  modalReturnScreen = 'menu';
  mainMenu.inert = true;
  mainMenu.setAttribute('aria-hidden', 'true');
  uiScreen = 'appearance';
  document.body.dataset.screen = uiScreen;
  appearanceEditor.inert = false;
  appearanceEditor.setAttribute('aria-hidden', 'false');
  renderAppearanceEditor();
  requestAnimationFrame(() => closeAppearanceButton.focus());
  return true;
}

function closeAppearanceEditor({ save = false } = {}) {
  if (uiScreen !== 'appearance') return false;
  if (save) {
    playerAppearance = appearanceDraft;
    savePlayerAppearance(playerAppearance);
    drawPaperDoll();
    syncWorldActors3D();
  }
  appearanceEditor.inert = true;
  appearanceEditor.setAttribute('aria-hidden', 'true');
  uiScreen = modalReturnScreen;
  document.body.dataset.screen = uiScreen;
  mainMenu.inert = false;
  mainMenu.setAttribute('aria-hidden', 'false');
  renderMainMenu();
  requestAnimationFrame(() => editAppearanceButton.focus());
  return true;
}

function cycleAppearance(kind, step) {
  if (uiScreen !== 'appearance') return false;
  appearanceDraft = cyclePlayerAppearance(appearanceDraft, kind, step);
  renderAppearanceEditor();
  return true;
}

function openNewRunConfirm() {
  if (uiScreen !== 'menu' || isTerminalRunStatus(runStatus)) return false;
  modalReturnScreen = 'menu';
  mainMenu.inert = true;
  mainMenu.setAttribute('aria-hidden', 'true');
  uiScreen = 'restart-confirm';
  document.body.dataset.screen = uiScreen;
  newRunConfirm.inert = false;
  newRunConfirm.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => cancelNewRunButton.focus());
  return true;
}

function closeNewRunConfirm() {
  if (uiScreen !== 'restart-confirm') return false;
  newRunConfirm.inert = true;
  newRunConfirm.setAttribute('aria-hidden', 'true');
  uiScreen = modalReturnScreen;
  document.body.dataset.screen = uiScreen;
  mainMenu.inert = false;
  mainMenu.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => newRunFromMenuButton.focus());
  return true;
}

function confirmNewRun() {
  if (uiScreen !== 'restart-confirm') return false;
  newRunConfirm.inert = true;
  newRunConfirm.setAttribute('aria-hidden', 'true');
  mainMenu.inert = true;
  mainMenu.setAttribute('aria-hidden', 'true');
  menuMode = 'pause';
  restartRun();
  pauseGameButton.disabled = false;
  return true;
}

function openMainMenu() {
  if (!ready || uiScreen !== 'game') return false;
  clearMoveControl();
  hero.path = [];
  menuMode = 'pause';
  uiScreen = 'menu';
  playSound('ui-close');
  setAmbientLevel(0.35);
  document.body.dataset.screen = uiScreen;
  mainMenu.inert = false;
  mainMenu.setAttribute('aria-hidden', 'false');
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  spellBar.inert = true;
  spellBar.setAttribute('aria-hidden', 'true');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  pauseGameButton.disabled = true;
  renderMainMenu();
  requestAnimationFrame(() => startGameButton.focus());
  return true;
}

function startGameFromMenu() {
  if (!ready || uiScreen !== 'menu') return false;
  unlockLevelUpAudio();
  mainMenu.inert = true;
  mainMenu.setAttribute('aria-hidden', 'true');
  if (isTerminalRunStatus(runStatus)) {
    restartRun();
    return true;
  }
  uiScreen = 'game';
  menuMode = 'pause';
  document.body.dataset.screen = uiScreen;
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  spellBar.inert = false;
  spellBar.removeAttribute('aria-hidden');
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  pauseGameButton.disabled = false;
  updateInteractionUi();
  setAmbientLevel(1);
  startGameButton.blur();
  return true;
}

// --- Floor map: pure model in dcss-rpg-floor-map.js, canvas and gestures here ---
let floorMapModel = null;
let floorMapView = null;
const floorMapPointers = new Map();
let floorMapGesture = null;

function floorMapViewport() {
  const rect = floorMapCanvas.getBoundingClientRect();
  return { width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)) };
}

function floorMapPoint(event) {
  const rect = floorMapCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

const FLOOR_MAP_FIND_KINDS = Object.freeze({
  'sealed-cache': 'chest',
  'crystal-vein': 'crystal',
  'forgotten-grave': 'grave',
  'ancient-altar': 'altar',
});

function currentFloorMapMarkers() {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const gridOf = (actor) => ({ x: Math.floor(actor.x / TILE), y: Math.floor(actor.y / TILE) });
  // Creatures are remembered nowhere: they appear only while the hero sees them.
  const inSight = (x, y) => Math.hypot(x - heroCell.x, y - heroCell.y) <= 4.5
    && hasLineOfSight(world, heroCell, { x, y });
  const sighted = (actor, kind) => {
    const cell = gridOf(actor);
    return { kind, ...cell, visible: inSight(cell.x, cell.y) };
  };
  return [
    { kind: 'exit', x: dungeon.exit.x, y: dungeon.exit.y },
    ...(dungeon.sanctuary ? [{ kind: 'sanctuary', x: dungeon.sanctuary.x, y: dungeon.sanctuary.y }] : []),
    ...doorDefinitions.map((door) => ({
      kind: run.floor.opened.includes(door.instanceId) ? 'door-open' : 'door',
      x: door.x,
      y: door.y,
    })),
    ...findDefinitions.filter(findIsVisible).map((find) => ({
      kind: FLOOR_MAP_FIND_KINDS[find.id] ?? 'chest',
      ...gridOf(find),
      muted: find.resolved === true,
    })),
    ...merchantDefinitions.map((merchant) => ({ kind: 'merchant', x: merchant.x, y: merchant.y })),
    ...dungeonEnvironment.props
      .filter(({ interactionId }) => interactionId === 'campfire')
      .map((prop) => ({ kind: 'campfire', x: prop.gridX, y: prop.gridY })),
    ...trapDefinitions
      .filter((trap) => detectedTrapIds.has(trap.instanceId) && !run.floor.resolved.includes(trap.eventId))
      .map((trap) => ({ kind: 'trap', x: trap.x, y: trap.y })),
    ...lootDefinitions.map((loot) => ({ kind: 'loot', ...gridOf(loot) })),
    ...passiveCreatures.filter((creature) => !creature.defeated).map((creature) => sighted(creature, 'wildlife')),
    ...monsters.filter((monster) => !(monster.dead > 0)).map((monster) => sighted(monster, monster.boss ? 'boss' : 'monster')),
  ];
}

function buildFloorMapModel() {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return createFloorMapModel({
    grid: world,
    revealed,
    hero: heroCell,
    markers: currentFloorMapMarkers(),
  });
}

function refreshFloorMapCopy() {
  const copy = floorMapCopy(itemDetailLanguage);
  const label = romanDepth(dungeon.depth);
  floorMapTitle.textContent = copy.title(label);
  floorMapHint.textContent = floorMapModel && floorMapModel.cells.length === 0 ? copy.empty : copy.hint;
  floorMapCanvas.setAttribute('aria-label', copy.canvas);
  closeFloorMapButton.setAttribute('aria-label', copy.close);
  floorMapCenterButton.setAttribute('aria-label', copy.center);
  floorMapZoomInButton.setAttribute('aria-label', copy.zoomIn);
  floorMapZoomOutButton.setAttribute('aria-label', copy.zoomOut);
  depthBadge.setAttribute('aria-label', copy.open(label));
  depthBadge.title = copy.open(label);
}

function drawFloorMapMarker(context, marker, zoom, pan) {
  const left = pan.x + marker.x * zoom;
  const top = pan.y + marker.y * zoom;
  const center = { x: left + zoom / 2, y: top + zoom / 2 };
  const color = FLOOR_MAP_COLORS[marker.kind];
  const shape = FLOOR_MAP_MARKER_SHAPES[marker.kind] ?? 'diamond';
  const inset = Math.max(1, Math.round(zoom * 0.18));
  context.globalAlpha = marker.muted ? 0.45 : 1;
  context.fillStyle = color;
  context.strokeStyle = '#05080a';
  context.lineWidth = Math.max(1, Math.round(zoom / 8));
  if (shape === 'hero') {
    context.fillRect(left + inset, top + inset, zoom - inset * 2, zoom - inset * 2);
    context.strokeRect(left + inset, top + inset, zoom - inset * 2, zoom - inset * 2);
  } else if (shape === 'dot') {
    context.beginPath();
    context.arc(center.x, center.y, Math.max(1.5, zoom * 0.34), 0, Math.PI * 2);
    context.fill();
    context.stroke();
  } else if (shape === 'small') {
    const size = Math.max(2, zoom * 0.4);
    context.fillRect(center.x - size / 2, center.y - size / 2, size, size);
  } else if (shape === 'cross') {
    context.strokeStyle = color;
    context.lineWidth = Math.max(1, Math.round(zoom / 6));
    context.beginPath();
    context.moveTo(left + inset, top + inset);
    context.lineTo(left + zoom - inset, top + zoom - inset);
    context.moveTo(left + zoom - inset, top + inset);
    context.lineTo(left + inset, top + zoom - inset);
    context.stroke();
  } else if (shape === 'stairs') {
    context.fillRect(left, top, zoom, zoom);
    context.fillStyle = '#05080a';
    const step = Math.max(1, Math.round(zoom / 5));
    for (let index = 1; index <= 3; index += 1) {
      context.fillRect(left + step, top + index * step + Math.round(step / 2), zoom - step * 2, Math.max(1, Math.round(step / 3)));
    }
  } else if (shape === 'door') {
    const size = Math.max(2, Math.round(zoom * 0.6));
    context.fillRect(center.x - size / 2, center.y - size / 2, size, size);
  } else if (shape === 'ring') {
    context.strokeStyle = color;
    context.lineWidth = Math.max(1.5, zoom / 6);
    context.beginPath();
    context.arc(center.x, center.y, Math.max(2, zoom * 0.32), 0, Math.PI * 2);
    context.stroke();
  } else {
    const radius = Math.max(2, zoom * 0.42);
    context.beginPath();
    context.moveTo(center.x, center.y - radius);
    context.lineTo(center.x + radius, center.y);
    context.lineTo(center.x, center.y + radius);
    context.lineTo(center.x - radius, center.y);
    context.closePath();
    context.fill();
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawFloorMap() {
  if (!floorMapModel || !floorMapView) return;
  const viewport = floorMapViewport();
  const scale = Math.min(3, window.devicePixelRatio || 1);
  const width = Math.round(viewport.width * scale);
  const height = Math.round(viewport.height * scale);
  if (floorMapCanvas.width !== width || floorMapCanvas.height !== height) {
    floorMapCanvas.width = width;
    floorMapCanvas.height = height;
  }
  const context = floorMapCanvas.getContext('2d');
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.imageSmoothingEnabled = false;
  context.fillStyle = FLOOR_MAP_COLORS.background;
  context.fillRect(0, 0, viewport.width, viewport.height);
  const { zoom, pan } = floorMapView;
  const gap = zoom >= 8 ? 1 : 0;
  for (const cell of floorMapModel.cells) {
    context.fillStyle = FLOOR_MAP_COLORS[cell.kind];
    context.fillRect(pan.x + cell.x * zoom, pan.y + cell.y * zoom, zoom - gap, zoom - gap);
  }
  for (const marker of floorMapModel.markers) drawFloorMapMarker(context, marker, zoom, pan);
}

function openFloorMap() {
  if (!ready || uiScreen !== 'game' || isTerminalRunStatus(runStatus) || openingDoor) return false;
  clearMoveControl();
  hero.path = [];
  hero.pendingAttack = null;
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  spellBar.inert = true;
  spellBar.setAttribute('aria-hidden', 'true');
  uiScreen = 'map';
  document.body.dataset.screen = uiScreen;
  floorMap.inert = false;
  floorMap.setAttribute('aria-hidden', 'false');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  pauseGameButton.disabled = true;
  depthBadge.disabled = true;
  interactActionButton.hidden = true;
  floorMapPointers.clear();
  floorMapGesture = null;
  floorMapModel = buildFloorMapModel();
  refreshFloorMapCopy();
  playSound('ui-tap');
  requestAnimationFrame(() => {
    if (uiScreen !== 'map') return;
    floorMapView = fitFloorMapView({ bounds: floorMapModel.bounds, viewport: floorMapViewport() });
    drawFloorMap();
    closeFloorMapButton.focus();
  });
  return true;
}

function closeFloorMap({ restoreFocus = true } = {}) {
  if (uiScreen !== 'map') return false;
  uiScreen = 'game';
  document.body.dataset.screen = uiScreen;
  floorMap.inert = true;
  floorMap.setAttribute('aria-hidden', 'true');
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  spellBar.inert = false;
  spellBar.removeAttribute('aria-hidden');
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  pauseGameButton.disabled = false;
  depthBadge.disabled = false;
  floorMapPointers.clear();
  floorMapGesture = null;
  updateInteractionUi();
  if (restoreFocus) requestAnimationFrame(() => depthBadge.focus());
  return true;
}

function toggleFloorMap() {
  return uiScreen === 'map' ? closeFloorMap() : openFloorMap();
}

function centerFloorMapOnHero() {
  if (!floorMapModel || !floorMapView) return;
  floorMapView = centerFloorMapView({
    view: floorMapView,
    cell: floorMapModel.hero,
    viewport: floorMapViewport(),
    bounds: floorMapModel.bounds,
  });
  drawFloorMap();
}

function zoomFloorMapBy(factor, anchor = null) {
  if (!floorMapModel || !floorMapView) return;
  floorMapView = zoomFloorMapView({
    view: floorMapView,
    factor,
    anchor,
    viewport: floorMapViewport(),
    bounds: floorMapModel.bounds,
  });
  drawFloorMap();
}

function travelFromFloorMap(point) {
  if (!floorMapModel || !floorMapView) return false;
  const cell = floorMapCellAt({ view: floorMapView, point });
  if (floorMapTapAction({ model: floorMapModel, cell }) === 'travel') {
    closeFloorMap({ restoreFocus: false });
    inputGesture += 1;
    return requestHeroMove(cell.x + 0.5, cell.y + 0.5);
  }
  return false;
}

function floorMapPointerDown(event) {
  if (uiScreen !== 'map' || !floorMapView) return;
  event.preventDefault();
  floorMapCanvas.setPointerCapture?.(event.pointerId);
  const point = floorMapPoint(event);
  floorMapPointers.set(event.pointerId, { ...point, startX: point.x, startY: point.y });
  if (floorMapPointers.size === 2) {
    const [a, b] = [...floorMapPointers.values()];
    floorMapGesture = {
      kind: 'pinch',
      startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      startMidpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      startView: floorMapView,
    };
  } else if (floorMapPointers.size === 1) {
    floorMapGesture = { kind: 'press', moved: false };
  }
}

function floorMapPointerMove(event) {
  const pointer = floorMapPointers.get(event.pointerId);
  if (!pointer || !floorMapView || !floorMapModel) return;
  const point = floorMapPoint(event);
  const previous = { x: pointer.x, y: pointer.y };
  pointer.x = point.x;
  pointer.y = point.y;
  const viewport = floorMapViewport();
  if (floorMapGesture?.kind === 'pinch' && floorMapPointers.size >= 2) {
    const [a, b] = [...floorMapPointers.values()];
    const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const zoomed = zoomFloorMapView({
      view: floorMapGesture.startView,
      factor: distance / floorMapGesture.startDistance,
      anchor: floorMapGesture.startMidpoint,
      viewport,
      bounds: floorMapModel.bounds,
    });
    floorMapView = panFloorMapView({
      view: zoomed,
      dx: midpoint.x - floorMapGesture.startMidpoint.x,
      dy: midpoint.y - floorMapGesture.startMidpoint.y,
      viewport,
      bounds: floorMapModel.bounds,
    });
    drawFloorMap();
    return;
  }
  if (floorMapGesture?.kind !== 'press') return;
  if (!floorMapGesture.moved) {
    if (Math.hypot(point.x - pointer.startX, point.y - pointer.startY) < 8) return;
    floorMapGesture.moved = true;
    previous.x = pointer.startX;
    previous.y = pointer.startY;
  }
  floorMapView = panFloorMapView({
    view: floorMapView,
    dx: point.x - previous.x,
    dy: point.y - previous.y,
    viewport,
    bounds: floorMapModel.bounds,
  });
  drawFloorMap();
}

function floorMapPointerUp(event) {
  const pointer = floorMapPointers.get(event.pointerId);
  if (!pointer) return;
  floorMapPointers.delete(event.pointerId);
  if (floorMapCanvas.hasPointerCapture?.(event.pointerId)) floorMapCanvas.releasePointerCapture(event.pointerId);
  const tapped = floorMapGesture?.kind === 'press' && !floorMapGesture.moved && floorMapPointers.size === 0
    && event.type === 'pointerup';
  if (floorMapPointers.size === 1) {
    const [remaining] = [...floorMapPointers.values()];
    remaining.startX = remaining.x;
    remaining.startY = remaining.y;
    floorMapGesture = { kind: 'press', moved: true };
  } else if (floorMapPointers.size === 0) {
    floorMapGesture = null;
  }
  if (tapped) travelFromFloorMap(floorMapPoint(event));
}

function floorMapWheel(event) {
  if (uiScreen !== 'map') return;
  event.preventDefault();
  zoomFloorMapBy(event.deltaY < 0 ? FLOOR_MAP_ZOOM.factor : 1 / FLOOR_MAP_ZOOM.factor, floorMapPoint(event));
}

function openCharacterSheet() {
  if (isTerminalRunStatus(runStatus)) return;
  clearMoveControl();
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  spellBar.inert = true;
  spellBar.setAttribute('aria-hidden', 'true');
  uiScreen = 'character';
  hero.path = [];
  document.body.dataset.screen = uiScreen;
  characterSheet.inert = false;
  characterSheet.setAttribute('aria-hidden', 'false');
  characterSheetButton.disabled = true;
  bagButton.disabled = true;
  renderCharacterSheet();
  drawPaperDoll();
  requestAnimationFrame(() => closeCharacterSheetButton.focus());
}

function closeCharacterSheet() {
  if (uiScreen !== 'character') return false;
  uiScreen = 'game';
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  spellBar.inert = false;
  spellBar.removeAttribute('aria-hidden');
  document.body.dataset.screen = uiScreen;
  characterSheet.setAttribute('aria-hidden', 'true');
  characterSheet.inert = true;
  characterSheetButton.disabled = false;
  bagButton.disabled = false;
  requestAnimationFrame(() => characterSheetButton.focus());
  return true;
}

function openInventory() {
  if (isTerminalRunStatus(runStatus)) return;
  playSound('ui-tap');
  clearMoveControl();
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  spellBar.inert = true;
  spellBar.setAttribute('aria-hidden', 'true');
  uiScreen = 'inventory';
  hero.path = [];
  document.body.dataset.screen = uiScreen;
  inventory.inert = false;
  inventory.setAttribute('aria-hidden', 'false');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  closeItemDetail({ restoreFocus: false });
  inventoryShell.inert = false;
  inventoryFilter = 'all';
  selectedPackIndex = -1;
  selectedEquipmentSlot = null;
  markedForSalvage.clear();
  salvageMode = false;
  updateInventoryViewUi();
  updateInventoryFilterUi();
  updateGearUi();
  renderPack();
  updateSalvageUi();
  closeInventoryButton.focus();
}

function closeInventory() {
  closeItemDetail({ restoreFocus: false });
  uiScreen = 'game';
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  spellBar.inert = false;
  spellBar.removeAttribute('aria-hidden');
  document.body.dataset.screen = uiScreen;
  inventory.setAttribute('aria-hidden', 'true');
  inventory.inert = true;
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  markedForSalvage.clear();
  salvageMode = false;
  updateSalvageUi();
  // Opening the bag hid the interact button; whatever stands beside the hero
  // is still there when the bag closes, so offer it again without a step.
  updateInteractionUi();
  bagButton.focus();
}

function trapPlacementBlockedCells() {
  const blocked = new Set(heroBlockingCells());
  for (const door of doorDefinitions) blocked.add(`${door.x},${door.y}`);
  for (const find of findDefinitions) {
    if (!find.resolved && findIsVisible(find)) blocked.add(`${Math.floor(find.x / TILE)},${Math.floor(find.y / TILE)}`);
  }
  for (const event of eventDefinitions) {
    if (event.id === 'blade-trap' && !detectedTrapIds.has(event.instanceId)) continue;
    blocked.add(`${Math.floor(event.x / TILE)},${Math.floor(event.y / TILE)}`);
  }
  for (const loot of lootDefinitions) {
    blocked.add(`${Math.floor(loot.x / TILE)},${Math.floor(loot.y / TILE)}`);
  }
  for (const prop of dungeonEnvironment.props) blocked.add(`${prop.gridX},${prop.gridY}`);
  if (dungeon.sanctuary) blocked.add(`${dungeon.sanctuary.x},${dungeon.sanctuary.y}`);
  blocked.add(`${dungeon.exit.x},${dungeon.exit.y}`);
  return [...blocked];
}

function currentTrapPlacementCells() {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return playerTrapPlacementCells({
    grid: world,
    hero: heroCell,
    revealedCells: [...revealed],
    blockedCells: trapPlacementBlockedCells(),
    placedTraps,
  });
}

function relativeTrapCellLabel({ dx, dy }) {
  const vertical = dy < 0 ? ['сверху', 'north'] : dy > 0 ? ['снизу', 'south'] : ['', ''];
  const horizontal = dx < 0 ? ['слева', 'west'] : dx > 0 ? ['справа', 'east'] : ['', ''];
  const parts = itemDetailLanguage === 'ru'
    ? [vertical[0], horizontal[0]].filter(Boolean)
    : [vertical[1], horizontal[1]].filter(Boolean);
  return itemDetailLanguage === 'ru'
    ? `Поставить капкан: ${parts.join(' ')}`
    : `Place trap: ${parts.join(' ')}`;
}

function renderTrapPlacementTargets() {
  if (!trapPlacementState) {
    trapPlacementTargets.replaceChildren();
    return;
  }
  const cells = currentTrapPlacementCells();
  trapPlacementTargets.replaceChildren(...cells.map((cell) => {
    const button = document.createElement('button');
    const position = worldToScreen((cell.x + 0.5) * TILE, (cell.y + 0.5) * TILE);
    button.type = 'button';
    button.className = 'trap-placement-target';
    button.dataset.x = String(cell.x);
    button.dataset.y = String(cell.y);
    button.style.left = `${Math.round(position.x)}px`;
    button.style.top = `${Math.round(position.y + 7)}px`;
    button.setAttribute('aria-label', relativeTrapCellLabel(cell));
    button.addEventListener('click', () => performTrapPlacement(cell.x, cell.y));
    return button;
  }));
}

function beginTrapPlacement(itemUid) {
  const item = itemInstances.get(itemUid);
  const capabilities = currentSkillCapabilities();
  if (
    uiScreen !== 'inventory'
    || runStatus !== 'playing'
    || hero.dead
    || item?.id !== PLAYER_TRAP_ITEM_ID
    || capabilities.trapPlacementTier < 1
  ) return false;
  const available = currentTrapPlacementCells();
  if (available.length === 0) {
    trapAnnouncement.textContent = itemDetailLanguage === 'ru'
      ? 'Рядом нет свободной клетки для капкана'
      : 'No free tile around the hero for a trap';
    showLootToast(item, 0);
    return false;
  }
  closeItemDetail({ restoreFocus: false });
  clearMoveControl();
  hero.path = [];
  hero.pendingAttack = null;
  hero.attack = 0;
  renderShake.amount = 0;
  renderShake.x = 0;
  renderShake.y = 0;
  inventory.setAttribute('aria-hidden', 'true');
  inventory.inert = true;
  trapPlacementState = { itemUid };
  uiScreen = 'trap-placement';
  document.body.dataset.screen = uiScreen;
  trapPlacement.inert = false;
  trapPlacement.setAttribute('aria-hidden', 'false');
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  trapPlacementLabel.textContent = itemDetailLanguage === 'ru' ? 'Выбери клетку' : 'Choose a tile';
  cancelTrapPlacementButton.setAttribute(
    'aria-label',
    itemDetailLanguage === 'ru' ? 'Отменить установку капкана' : 'Cancel trap placement',
  );
  renderTrapPlacementTargets();
  requestAnimationFrame(() => trapPlacementTargets.querySelector('button')?.focus());
  return true;
}

function closeTrapPlacement({ returnToInventory = false } = {}) {
  if (uiScreen !== 'trap-placement') return false;
  trapPlacementState = null;
  trapPlacementTargets.replaceChildren();
  trapPlacement.inert = true;
  trapPlacement.setAttribute('aria-hidden', 'true');
  if (returnToInventory) {
    uiScreen = 'inventory';
    inventory.inert = false;
    inventory.setAttribute('aria-hidden', 'false');
    inventoryShell.inert = false;
    moveControl.inert = true;
    moveControl.setAttribute('aria-hidden', 'true');
    bagButton.disabled = true;
    characterSheetButton.disabled = true;
    document.body.dataset.screen = uiScreen;
    renderPack();
    focusSelectedInventoryRow();
    return true;
  }
  uiScreen = 'game';
  document.body.dataset.screen = uiScreen;
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  spellBar.inert = false;
  spellBar.removeAttribute('aria-hidden');
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  requestAnimationFrame(() => bagButton.focus());
  return true;
}

function performTrapPlacement(x, y) {
  if (uiScreen !== 'trap-placement' || !trapPlacementState) return false;
  const item = itemInstances.get(trapPlacementState.itemUid);
  const itemIndex = backpackItems.findIndex((candidate) => candidate?.uid === trapPlacementState.itemUid);
  if (!item || itemIndex < 0 || item.id !== PLAYER_TRAP_ITEM_ID) {
    closeTrapPlacement();
    return false;
  }
  const result = placePlayerTrap({
    runStatus,
    depth: dungeon.depth,
    hero: { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE), hp: hero.hp },
    target: { x, y },
    capabilities: currentSkillCapabilities(),
    itemCount: item.stack ?? 1,
    grid: world,
    revealedCells: [...revealed],
    blockedCells: trapPlacementBlockedCells(),
    placedTraps,
    ownerId: 'hero',
  });
  if (!result.ok) {
    trapAnnouncement.textContent = itemDetailLanguage === 'ru'
      ? 'Эту клетку нельзя использовать'
      : 'That tile cannot be used';
    renderTrapPlacementTargets();
    return false;
  }
  placedTraps = result.placedTraps;
  if (result.remainingItems > 0) item.stack = result.remainingItems;
  else {
    itemInstances.delete(item.uid);
    backpackItems.splice(itemIndex, 1);
  }
  playerHasActed = true;
  const trapX = (x + 0.5) * TILE;
  const trapY = (y + 0.5) * TILE;
  burst(trapX, trapY, '#e0c76e', 14);
  addImpactWave(trapX, trapY, '#d6bd62', 42, 0);
  addCombatGlyph(trapX, trapY, ['I', 'II', 'III'][result.trap.tier - 1], '#e0c76e', -38);
  trapAnnouncement.textContent = itemDetailLanguage === 'ru'
    ? 'Капкан установлен'
    : 'Trap placed';
  showLootToast(item, '−1');
  selectedPackIndex = Math.max(0, Math.min(itemIndex, backpackItems.length - 1));
  closeTrapPlacement();
  updateHud();
  updateGearUi();
  renderPack();
  persistRun();
  return true;
}

function blinkBlockedCells() {
  const blocked = new Set(heroBlockingCells());
  for (const find of findDefinitions) {
    if (!find.resolved && findIsVisible(find)) blocked.add(`${Math.floor(find.x / TILE)},${Math.floor(find.y / TILE)}`);
  }
  for (const event of eventDefinitions) {
    blocked.add(`${Math.floor(event.x / TILE)},${Math.floor(event.y / TILE)}`);
  }
  for (const loot of lootDefinitions) {
    blocked.add(`${Math.floor(loot.x / TILE)},${Math.floor(loot.y / TILE)}`);
  }
  for (const prop of dungeonEnvironment.props) blocked.add(`${prop.gridX},${prop.gridY}`);
  if (dungeon.sanctuary) blocked.add(`${dungeon.sanctuary.x},${dungeon.sanctuary.y}`);
  blocked.add(`${dungeon.exit.x},${dungeon.exit.y}`);
  return [...blocked];
}

function currentBlinkTargetCells() {
  if (abilityTargetingState?.kind !== 'blink') return [];
  return blinkTargetCells({
    grid: world,
    origin: { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) },
    revealedCells: [...revealed],
    blockedCells: blinkBlockedCells(),
    range: abilityTargetingState.range,
  });
}

function abilityTargetLabel(target) {
  if (abilityTargetingState?.kind !== 'blink') {
    const monsterName = target.name?.[itemDetailLanguage]
      ?? target.name?.[itemDetailLanguage === 'ru' ? 'ru' : 'en']
      ?? target.id;
    if (abilityTargetingState.kind === 'target-item') {
      return itemDetailLanguage === 'ru'
        ? `Намочить: ${monsterName}`
        : `Drench: ${monsterName}`;
    }
    return itemDetailLanguage === 'ru'
      ? `Применить к цели: ${monsterName}`
      : `Cast on target: ${monsterName}`;
  }
  return itemDetailLanguage === 'ru'
    ? `Переместиться: ${target.x}, ${target.y}`
    : `Blink to: ${target.x}, ${target.y}`;
}

function currentAbilityTargets() {
  if (!abilityTargetingState) return [];
  if (abilityTargetingState.kind !== 'blink') {
    const source = abilityTargetingState.kind === 'spell'
      ? spellById(abilityTargetingState.spellId)
      : itemInstances.get(abilityTargetingState.itemUid)?.useEffect;
    return spellTargetCandidates({
      ...source,
      kind: 'projectile',
      targetMode: 'actor',
    }).filter(({ instanceId }) => (
      abilityTargetingState.targetIds.includes(instanceId)
    ));
  }
  return currentBlinkTargetCells();
}

function renderAbilityTargetingTargets() {
  if (!abilityTargetingState) {
    abilityTargetingTargets.replaceChildren();
    return;
  }
  const controls = [];
  for (const target of currentAbilityTargets()) {
    const actor = abilityTargetingState.kind !== 'blink';
    const worldX = actor ? target.x : (target.x + 0.5) * TILE;
    const worldY = actor ? target.y : (target.y + 0.5) * TILE;
    const position = worldToScreen(worldX, worldY);
    const halfWidth = actor ? 29 : 17;
    const halfHeight = actor ? 33 : 15;
    const targetTop = position.y + (actor ? -4 : 7);
    if (
      position.x - halfWidth < 0
      || position.x + halfWidth > viewportWidth
      || targetTop - halfHeight < 0
      || targetTop + halfHeight > viewportHeight
    ) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ability-targeting-target${actor ? ' actor' : ''}`;
    button.style.left = `${Math.round(position.x)}px`;
    button.style.top = `${Math.round(targetTop)}px`;
    button.style.setProperty('--targeting-color', abilityTargetingState.color);
    button.setAttribute('aria-label', abilityTargetLabel(target));
    if (actor) button.dataset.targetId = target.instanceId;
    else {
      button.dataset.x = String(target.x);
      button.dataset.y = String(target.y);
    }
    button.addEventListener('click', () => {
      if (actor) performAbilityTarget({ targetId: target.instanceId });
      else performAbilityTarget({ x: target.x, y: target.y });
    });
    controls.push(button);
  }
  abilityTargetingTargets.replaceChildren(...controls);
}

function openAbilityTargeting(nextState) {
  if (!nextState || !['spell', 'blink', 'target-item'].includes(nextState.kind)) return false;
  clearMoveControl();
  hero.path = [];
  hero.pendingAttack = null;
  hero.attack = 0;
  if (nextState.returnScreen === 'inventory') {
    closeItemDetail({ restoreFocus: false });
    inventory.setAttribute('aria-hidden', 'true');
    inventory.inert = true;
  }
  abilityTargetingState = nextState;
  uiScreen = 'ability-targeting';
  document.body.dataset.screen = uiScreen;
  abilityTargeting.inert = false;
  abilityTargeting.setAttribute('aria-hidden', 'false');
  abilityTargetingPrompt.style.setProperty('--targeting-color', nextState.color);
  abilityTargetingIcon.src = assetUrl(nextState.icon);
  abilityTargetingLabel.textContent = nextState.label;
  cancelAbilityTargetingButton.setAttribute('aria-label', nextState.cancelLabel);
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  spellBar.inert = true;
  spellBar.setAttribute('aria-hidden', 'true');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  renderAbilityTargetingTargets();
  requestAnimationFrame(() => (
    abilityTargetingTargets.querySelector('button') ?? cancelAbilityTargetingButton
  ).focus());
  return true;
}

function closeAbilityTargeting({ returnToSource = true } = {}) {
  if (uiScreen !== 'ability-targeting' || !abilityTargetingState) return false;
  const returnScreen = abilityTargetingState.returnScreen;
  abilityTargetingState = null;
  abilityTargetingTargets.replaceChildren();
  abilityTargeting.inert = true;
  abilityTargeting.setAttribute('aria-hidden', 'true');
  if (returnToSource && returnScreen === 'inventory') {
    uiScreen = 'inventory';
    inventory.inert = false;
    inventory.setAttribute('aria-hidden', 'false');
    inventoryShell.inert = false;
    document.body.dataset.screen = uiScreen;
    renderPack();
    focusSelectedInventoryRow();
    return true;
  }
  uiScreen = 'game';
  document.body.dataset.screen = uiScreen;
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  spellBar.inert = false;
  spellBar.removeAttribute('aria-hidden');
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  return true;
}

function beginBlinkTargeting(itemUid) {
  const item = itemInstances.get(itemUid);
  if (
    uiScreen !== 'inventory'
    || runStatus !== 'playing'
    || hero.dead
    || item?.useEffect?.type !== 'blink'
  ) return false;
  const nextState = {
    kind: 'blink',
    itemUid,
    range: item.useEffect.range,
    returnScreen: 'inventory',
    icon: presentedItem(item).icon,
    color: '#81d8dc',
    label: itemDetailLanguage === 'ru' ? 'Выбери клетку' : 'Choose a tile',
    cancelLabel: itemDetailLanguage === 'ru' ? 'Отменить скачок' : 'Cancel blink',
  };
  abilityTargetingState = nextState;
  const targets = currentBlinkTargetCells();
  abilityTargetingState = null;
  if (targets.length === 0) {
    showLootToast(item, 0);
    return false;
  }
  return openAbilityTargeting(nextState);
}

function beginSpellTargeting(slotIndex, spell, targets) {
  if (uiScreen !== 'game' || !spell || targets.length === 0) return false;
  return openAbilityTargeting({
    kind: 'spell',
    spellId: spell.id,
    slotIndex,
    targetIds: targets.map(({ instanceId }) => instanceId),
    returnScreen: 'game',
    icon: spell.icon,
    color: spell.color,
    label: itemDetailLanguage === 'ru' ? 'Выбери врага' : 'Choose an enemy',
    cancelLabel: itemDetailLanguage === 'ru' ? 'Отменить заклинание' : 'Cancel spell',
  });
}

function beginTargetEffectItemTargeting(itemUid) {
  const item = itemInstances.get(itemUid);
  if (
    uiScreen !== 'inventory'
    || runStatus !== 'playing'
    || hero.dead
    || item?.useEffect?.type !== 'target-effect'
  ) return false;
  const targets = spellTargetCandidates({
    ...item.useEffect,
    kind: 'projectile',
    targetMode: 'actor',
  });
  if (targets.length === 0) {
    showLootToast(item, 0);
    return false;
  }
  const definition = ACTOR_EFFECTS[item.useEffect.effectId];
  return openAbilityTargeting({
    kind: 'target-item',
    itemUid,
    targetIds: targets.map(({ instanceId }) => instanceId),
    returnScreen: 'inventory',
    icon: presentedItem(item).icon,
    color: definition?.color ?? '#63b8ca',
    label: itemDetailLanguage === 'ru' ? 'Выбери врага' : 'Choose an enemy',
    cancelLabel: itemDetailLanguage === 'ru' ? 'Отменить применение' : 'Cancel item use',
  });
}

function performBlinkTarget(target) {
  if (abilityTargetingState?.kind !== 'blink') return false;
  const item = itemInstances.get(abilityTargetingState.itemUid);
  const itemIndex = backpackItems.findIndex(({ uid }) => uid === abilityTargetingState.itemUid);
  if (!item || itemIndex < 0) {
    closeAbilityTargeting({ returnToSource: false });
    return false;
  }
  const source = { x: hero.x, y: hero.y };
  const result = resolveBlink({
    runStatus,
    hero: { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE), hp: hero.hp },
    target,
    itemCount: item.stack ?? 1,
    candidates: currentBlinkTargetCells(),
  });
  if (!result.ok) return false;
  run.knowledge = identifyItem(run.knowledge, item.id, IDENTIFIABLE_LOOT_IDS);
  if (result.remainingItems > 0) item.stack = result.remainingItems;
  else {
    itemInstances.delete(item.uid);
    backpackItems.splice(itemIndex, 1);
  }
  hero.x = (result.hero.x + 0.5) * TILE;
  hero.y = (result.hero.y + 0.5) * TILE;
  hero.path = [];
  camera.x = hero.x;
  camera.y = hero.y;
  revealAround(revealed, world, result.hero, currentRevealRadius());
  lastHeroCell = `${result.hero.x},${result.hero.y}`;
  playerHasActed = true;
  closeAbilityTargeting({ returnToSource: false });
  burst(source.x, source.y - 8, '#79c8cd', 20);
  addImpactWave(source.x, source.y, '#79c8cd', 54, 1);
  burst(hero.x, hero.y - 8, '#a3edf0', 24);
  addImpactWave(hero.x, hero.y, '#a3edf0', 68, 2);
  addCombatGlyph(hero.x, hero.y, '✦', '#bff7f3', -58);
  showLootToast(item, '−1');
  selectedPackIndex = Math.max(0, Math.min(itemIndex, backpackItems.length - 1));
  discoverNearbyTraps({ feedback: false });
  updateInteractionUi();
  updateHud();
  updateGearUi();
  renderPack();
  persistRun();
  return true;
}

function performTargetedItemUse(target) {
  if (abilityTargetingState?.kind !== 'target-item') return false;
  const item = itemInstances.get(abilityTargetingState.itemUid);
  const itemIndex = backpackItems.findIndex(({ uid }) => uid === abilityTargetingState.itemUid);
  const candidates = currentAbilityTargets();
  const monster = candidates.find(({ instanceId }) => instanceId === target.targetId);
  if (!item || itemIndex < 0 || !monster) return false;
  const result = resolveTargetedItemUse({
    runStatus,
    heroHp: hero.hp,
    targetId: target.targetId,
    itemCount: item.stack ?? 1,
    candidateTargetIds: candidates.map(({ instanceId }) => instanceId),
    effect: item.useEffect,
  });
  if (!result.ok) return false;
  const sourceItem = item;
  run.knowledge = identifyItem(run.knowledge, item.id, IDENTIFIABLE_LOOT_IDS);
  if (result.remainingItems > 0) item.stack = result.remainingItems;
  else {
    itemInstances.delete(item.uid);
    backpackItems.splice(itemIndex, 1);
  }
  hero.path = [];
  hero.attack = Math.max(hero.attack, 0.32);
  hero.attackDuration = 0.32;
  hero.attackStyle = 'staff';
  hero.attackCooldown = Math.max(hero.attackCooldown, 0.38);
  hero.targetAngle = Math.atan2(monster.y - hero.y, monster.x - hero.x);
  hero.facing = monster.x < hero.x ? -1 : 1;
  const angle = hero.targetAngle;
  const color = ACTOR_EFFECTS[result.application.id]?.color ?? '#63b8ca';
  projectiles.push({
    x: hero.x + Math.cos(angle) * 22,
    y: hero.y + Math.sin(angle) * 22,
    angle,
    targetId: monster.instanceId,
    damage: 0,
    speed: TILE * 6.6,
    life: 1.5,
    color,
    kind: 'tide-wand',
    style: 'staff',
    vampiric: false,
    itemEffect: true,
    status: result.application,
  });
  playerHasActed = true;
  closeAbilityTargeting({ returnToSource: false });
  burst(hero.x + Math.cos(angle) * 20, hero.y + Math.sin(angle) * 20 - 8, color, 14);
  addImpactWave(hero.x, hero.y - 8, color, 42, 0);
  showLootToast(sourceItem, '−1');
  selectedPackIndex = Math.max(0, Math.min(itemIndex, backpackItems.length - 1));
  updateHud();
  updateGearUi();
  renderPack();
  persistRun();
  return true;
}

function performAbilityTarget(target) {
  if (!abilityTargetingState) return false;
  if (abilityTargetingState.kind === 'blink') return performBlinkTarget(target);
  if (abilityTargetingState.kind === 'target-item') return performTargetedItemUse(target);
  const { slotIndex, spellId } = abilityTargetingState;
  const spell = spellById(spellId);
  const monster = currentAbilityTargets().find(({ instanceId }) => instanceId === target.targetId);
  if (!spell || !monster) return false;
  closeAbilityTargeting({ returnToSource: false });
  return castPreparedSpell(slotIndex, monster);
}

function performAbilityTargetAtCell(x, y) {
  if (abilityTargetingState?.kind === 'blink') return performAbilityTarget({ x, y });
  const target = currentAbilityTargets().find((actor) => (
    Math.floor(actor.x / TILE) === x && Math.floor(actor.y / TILE) === y
  ));
  return target ? performAbilityTarget({ targetId: target.instanceId }) : false;
}

function showRunEndScreen(result) {
  if (uiScreen === result) return;
  clearMoveControl();
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  uiScreen = result;
  deathTimer = 0;
  document.body.dataset.result = result;
  document.body.dataset.screen = uiScreen;
  runEndScreen.inert = false;
  runEndScreen.setAttribute('aria-hidden', 'false');
  const summary = runSummaryModel({
    status: result,
    depthLabel: romanDepth(dungeon.depth),
    stats: run.stats,
    level: hero.level,
    gold,
    seed: run.seed,
    language: itemDetailLanguage,
  });
  runEndScreen.setAttribute('aria-label', summary.ariaLabel);
  runEndTitle.textContent = summary.title;
  runSummaryList.replaceChildren(...summary.rows.flatMap((row) => {
    const label = document.createElement('dt');
    const value = document.createElement('dd');
    label.textContent = row.label;
    value.textContent = row.value;
    value.dataset.row = row.id;
    return [label, value];
  }));
  restartRunButton.setAttribute('aria-label', summary.restart);
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  pauseGameButton.disabled = true;
  sanctuaryAction.hidden = true;
  bossHud.hidden = true;
  restartRunButton.focus();
}

function hideRunEndScreen() {
  runEndScreen.inert = true;
  runEndScreen.setAttribute('aria-hidden', 'true');
  delete document.body.dataset.result;
  uiScreen = 'game';
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  document.body.dataset.screen = uiScreen;
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  pauseGameButton.disabled = false;
}

function consumeBackpackItem(item, index) {
  if ((item.stack ?? 1) > 1) item.stack -= 1;
  else {
    itemInstances.delete(item.uid);
    backpackItems.splice(index, 1);
  }
}

function applyIdentifiablePotion(item) {
  const outcome = potionOutcome(item);
  if (!outcome) return null;
  playerHasActed = true;
  if (outcome.type === 'heal') {
    const healing = Math.min(outcome.amount, currentHeroStats().maxHp - hero.hp);
    hero.hp += healing;
    burst(hero.x, hero.y - 8, '#7fbd86', 14);
    addImpactWave(hero.x, hero.y - 8, '#7fbd86', 46, 0);
    return healing;
  }
  if (outcome.type === 'power') {
    hero.power += outcome.amount;
    burst(hero.x, hero.y - 8, '#e0c778', 18);
    addImpactWave(hero.x, hero.y - 8, '#e0c778', 54, 1);
    return `+${outcome.amount}`;
  }
  if (outcome.type === 'cleanse') {
    const result = clearActorEffects(hero.effects);
    hero.effects = result.effects;
    burst(hero.x, hero.y - 8, '#87cad0', 16);
    addImpactWave(hero.x, hero.y - 8, '#87cad0', 52, 0);
    return result.cleared.length > 0 ? '✓' : '0';
  }
  const result = damageHero(outcome.damage, {
    direct: true,
    impactColor: '#83aa4b',
    source: 'potion:venom',
  });
  if (!hero.dead) applyHeroStatus('poison', outcome.duration);
  return `−${result?.damage ?? outcome.damage}`;
}

function applyBook(item) {
  const command = nextGameCommand(READ_BOOK_COMMAND, item.uid, { itemId: item.id });
  const outcome = bookOutcome(item);
  if (outcome?.type === 'learn-spell') {
    const result = readSpellBook({
      command,
      item,
      spells: hero.spells,
      intelligence: currentHeroStats().intelligence,
    });
    if (!result.ok) {
      const required = result.reason === 'intelligence-required'
        ? spellById(outcome.spellId)?.minimumIntelligence
        : null;
      if (Number.isFinite(required)) {
        addCombatGlyph(hero.x, hero.y, `✧${required}`, '#9abfc0', -62);
        showLootToast(item, `✧ ${required}`);
      }
      return null;
    }
    hero.spells = createSpellState(result.state.spells);
    const firstEmptySlot = hero.spells.preparedSpellIds.indexOf(null);
    if (firstEmptySlot >= 0) {
      hero.spells = prepareSpell(hero.spells, firstEmptySlot, outcome.spellId).state;
    }
    const spell = spellById(outcome.spellId);
    burst(hero.x, hero.y - 8, spell.color, 20);
    addImpactWave(hero.x, hero.y - 8, spell.color, 62, 1);
    renderSpellBar();
    return spell.name[itemDetailLanguage];
  }
  const result = readSkillBook({
    command,
    item,
    study: hero.skillStudy,
    skills: hero.skills,
    heroLevel: hero.level,
    attributes: { intelligence: currentHeroStats().intelligence },
  });
  if (!result.ok) return null;
  hero.skillStudy = createBookStudy(result.state.study);
  const adjustment = result.events.find(({ type }) => type === 'skill-rank-adjusted');
  if (!adjustment) {
    burst(hero.x, hero.y - 8, '#929b94', 10);
    return '0';
  }
  const { skillId, direction } = adjustment.payload;
  const skillName = skillById(skillId)?.name?.[itemDetailLanguage] ?? skillId;
  const color = direction > 0 ? '#d8c76c' : '#9b6d9f';
  burst(hero.x, hero.y - 8, color, 18);
  addImpactWave(hero.x, hero.y - 8, color, 54, direction > 0 ? 1 : 0);
  discoverNearbyTraps();
  return `${direction > 0 ? '+' : '−'}1 ${skillName}`;
}

function useConsumable(item, index) {
  if (item.interactionResource) {
    showLootToast(item, item.stack ?? 1);
    return;
  }
  const maxHp = currentHeroStats().maxHp;
  let feedback = 1;
  const identifiable = isIdentifiableItem(item);
  if (identifiable) {
    run.knowledge = identifyItem(run.knowledge, item.id, IDENTIFIABLE_LOOT_IDS);
  }
  if (item.identification?.group === 'potion') {
    feedback = applyIdentifiablePotion(item);
    playSound('drink');
  } else if (item.identification?.group === 'book') {
    if (heroWading()) {
      // Wet pages: the book stays in the bag until the hero is on dry floor.
      showLootToast(item, 0);
      addCombatGlyph(hero.x, hero.y, '~', '#63b8ca', -62);
      return;
    }
    feedback = applyBook(item);
    if (feedback === null) {
      showLootToast(item, 0);
      return;
    }
    playSound('read');
  } else if (item.useEffect?.type === 'heal') {
    feedback = Math.min(item.useEffect.amount, maxHp - hero.hp);
    if (feedback === 0) {
      showLootToast(item, 0);
      return;
    }
    hero.hp += feedback;
    playSound('drink');
  } else if (item.useEffect?.type === 'food') {
    const result = consumeFood({
      hunger: hero.hunger,
      hp: hero.hp,
      maxHp,
      nutrition: item.useEffect.nutrition,
      healing: item.useEffect.healing,
    });
    if (!result.ok) {
      showLootToast(item, 0);
      return;
    }
    hero.hunger = result.state.hunger;
    playSound('eat');
    hero.hp = result.state.hp;
    currentHungerStageId = hungerStage(hero.hunger).id;
    hungerAutosaveElapsed = 0;
    playerHasActed = true;
    // A cooked dish leaves something behind; a second dish replaces the first.
    const meal = startMeal(item.useEffect.mealId);
    if (meal) {
      hero.meal = meal;
      renderHeroEffectsHud();
      burst(hero.x, hero.y - 12, activeMeal(meal, itemDetailLanguage).color, 16);
    }
    feedback = `+${Math.ceil(result.restored / 60)}′`;
  } else if (item.useEffect?.type === 'camp') {
    const refusal = pitchCamp();
    if (refusal !== '') {
      showLootToast(item, refusal);
      return;
    }
  } else if (item.useEffect?.type === 'bandage') {
    const treatment = resolveBandage({
      profile: fieldMedicineProfile(currentSkillCapabilities()),
      hp: hero.hp,
      maxHp,
      effects: hero.effects,
    });
    if (!treatment.ok) {
      showLootToast(item, bandageRefusalText(treatment.reason, itemDetailLanguage));
      return;
    }
    hero.hp = treatment.hp;
    hero.effects = treatment.effects;
    // The bandage's own toast reports the treatment; the states only flash.
    for (const id of treatment.cleared) showEffectRelief(id);
    renderHeroEffectsHud();
    playSound('drink');
    burst(hero.x, hero.y - 10, '#d8c9b4', 18);
    addImpactWave(hero.x, hero.y - 8, '#d8c9b4', 58, 0);
    feedback = `+${treatment.healed}`;
  } else if (item.useEffect?.type === 'power') {
    hero.power += item.useEffect.amount;
    feedback = `+${item.useEffect.amount}`;
  } else {
    throw new Error(`Unsupported consumable effect: ${item.id}`);
  }
  playerHasActed = true;
  consumeBackpackItem(item, index);
  showLootToast(item, feedback);
  updateHud();
  updateGearUi();
  selectedPackIndex = Math.max(0, Math.min(index, backpackItems.length - 1));
  renderPack();
  if (hero.dead) closeInventory();
  else focusSelectedInventoryRow();
  persistRun();
}

function performSelectedItemAction({ fromDetail = false } = {}) {
  const selection = selectedUiItem();
  if (!selection) return false;
  const appraisal = selection.source === 'pack' ? currentAppraisal(selection.item) : null;
  if (appraisal?.ok) {
    run.knowledge = appraisal.knowledge;
    playerHasActed = true;
    renderPack();
    renderItemDetail(selection.item);
    itemDetailCard.classList.remove('identification-reveal');
    void itemDetailCard.offsetWidth;
    itemDetailCard.classList.add('identification-reveal');
    window.setTimeout(() => itemDetailCard.classList.remove('identification-reveal'), 420);
    showLootToast(selection.item, '✓');
    persistRun();
    itemDetailAction.focus();
    return true;
  }
  if (fromDetail) closeItemDetail({ restoreFocus: false });

  if (selection.source === 'equipment') {
    const result = unequipItem(currentItemState(), selection.slot);
    if (!result.ok) return false;
    const uid = selection.item.uid;
    applyItemState(result.state);
    selectedEquipmentSlot = null;
    selectedPackIndex = Math.max(0, backpackItems.findIndex((item) => item?.uid === uid));
    updateGearUi();
    renderPack();
    focusSelectedInventoryRow();
    persistRun();
    return true;
  }

  if (!selection.item.slot) {
    if (selection.item.placeableTrap) {
      return beginTrapPlacement(selection.item.uid);
    }
    if (selection.item.useEffect?.type === 'blink') {
      return beginBlinkTargeting(selection.item.uid);
    }
    if (selection.item.useEffect?.type === 'target-effect') {
      return beginTargetEffectItemTargeting(selection.item.uid);
    }
    useConsumable(selection.item, selection.index);
    return true;
  }

  const result = equipInventoryItem(currentItemState(), selection.item.uid);
  if (!result.ok) return false;
  applyItemState(result.state);
  selectedEquipmentSlot = result.slot;
  selectedPackIndex = Math.min(selectedPackIndex, Math.max(0, backpackItems.length - 1));
  updateGearUi();
  renderPack();
  focusSelectedInventoryRow();
  persistRun();
  return true;
}

function burst(x, y, color, count = 9) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + hash(index, count) * 0.00001;
    const speed = 45 + (index % 4) * 17;
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + (index % 3) * 0.08,
      maxLife: 0.61,
      color,
    });
  }
}

function addImpactWave(x, y, color, size = 42, shake = 2) {
  impactWaves.push({ x, y, color, size, life: 0.28, maxLife: 0.28 });
  if (!reducedMotion) renderShake.amount = Math.max(renderShake.amount, shake);
}

function addLightningArc(from, to) {
  lightningArcSequence += 1;
  lightningArcs.push({
    sequence: lightningArcSequence,
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
    life: 0.2,
    maxLife: 0.2,
  });
  if (lightningArcs.length > 12) lightningArcs.shift();
}

function beginHitStop(duration) {
  if (!reducedMotion) hitStop = Math.max(hitStop, duration);
}

function addCombatGlyph(x, y, text, color, offsetY = -48) {
  combatGlyphs.push({ x, y, text: String(text), color, offsetY, life: 0.62, maxLife: 0.62 });
}

function addBloodImpact(actor, sourceX, sourceY, lethal = false) {
  if (!actor.bloodColor) return;
  const angle = Math.atan2(actor.y - sourceY, actor.x - sourceX);
  const count = lethal ? 15 : 9;
  for (let index = 0; index < count; index += 1) {
    const spread = ((hash(Math.floor(actor.x / 4) + index, Math.floor(actor.y / 4), 211) % 1000) / 1000 - 0.5) * 1.15;
    const speed = 46 + (index % 5) * 12 + (lethal ? 18 : 0);
    bloodDrops.push({
      x: actor.x,
      y: actor.y - 7,
      vx: Math.cos(angle + spread) * speed,
      vy: Math.sin(angle + spread) * speed - 22 - (index % 3) * 8,
      color: actor.bloodColor,
      size: index % 4 === 0 ? 4 : 2,
      life: 0.38 + (index % 4) * 0.05,
      maxLife: 0.53,
    });
  }
  if (!lethal) return;
  bloodStains.push({
    x: actor.x,
    y: actor.y + 13,
    color: actor.bloodColor,
    seed: hash(Math.floor(actor.x), Math.floor(actor.y), 227),
    size: actor.boss ? 1.38 : actor.large ? 1.18 : 1,
  });
  if (bloodStains.length > 36) bloodStains.shift();
}

/** A mace leaves the target open and, from rank two, holds it where it stands. */
function applyBluntAftermath(monster, profile) {
  const outcome = resolveBluntStrike({ profile, targetWindingUp: monster.attackWindup > 0 });
  if (outcome.armorBreakPercent === 0) return;
  monster.armorBreak = refreshArmorBreak(monster.armorBreak, outcome);
  addCombatGlyph(monster.x, monster.y, '\u25a2', '#d0b45e', -52);
  if (!outcome.interrupt) return;
  monster.attackWindup = 0;
  monster.attackRecovery = Math.max(monster.attackRecovery, outcome.stunSeconds);
  monster.shieldStun = Math.max(monster.shieldStun ?? 0, outcome.stunSeconds);
  addImpactWave(monster.x, monster.y - 8, '#e0c778', 52, 2);
}

/** An ambush or a blade in the back reads differently from an honest swing. */
function showDaggerStrikeImpact(monster, bonus) {
  const ambush = bonus.kind === 'ambush';
  burst(monster.x, monster.y - 9, ambush ? '#c8e0a8' : '#e0b8c8', ambush ? 22 : 16);
  addImpactWave(monster.x, monster.y - 8, ambush ? '#d8f0b8' : '#f0c8d8', ambush ? 62 : 48, 2);
  addCombatGlyph(monster.x, monster.y, ambush ? '\u2726' : '\u2727', '#f2e2c2', -70);
  beginHitStop(0.05);
}

/** The spear answers a creature that just stepped into its reach. */
function resolveSpearGuard(monster, previousDistance, distance) {
  if (hero.dead || runStatus !== 'playing' || monster.dead > 0) return;
  const profile = currentSpearProfile();
  if (profile.rank === 0) return;
  const result = spearInterception({
    profile,
    previousDistance,
    distance,
    cooldownRemaining: monster.spearGuardCooldown ?? 0,
  });
  if (!result.triggered) return;
  const combat = currentHeroCombat();
  if (!canHeroAttack(monster, combat)) return;
  monster.spearGuardCooldown = result.cooldownSeconds;
  monster.attackRecovery = Math.max(monster.attackRecovery, result.holdSeconds);
  monster.route = [];
  hero.facing = monster.x < hero.x ? -1 : 1;
  addCombatGlyph(monster.x, monster.y, '\u2191', '#cfd8c0', -60);
  damageMonster(
    monster,
    interceptionDamage(combatDamage(currentHeroStats(), combat), result.damagePercent),
    '#cfd8c0',
    { style: 'spear', sourceX: hero.x, sourceY: hero.y, vampiric: currentHeroMagic().vampirism },
  );
}

/** Reading a telegraph and stepping out of it is worth a burst of speed. */
function rewardHeroEvasion() {
  if (hero.dead || runStatus !== 'playing') return;
  const profile = currentMobilityProfile();
  if (profile.rank === 0) return;
  const before = heroDodgeBoost;
  heroDodgeBoost = refreshDodgeBoost(heroDodgeBoost, profile);
  if (heroDodgeBoost <= before) return;
  addCombatGlyph(hero.x, hero.y, '\u00bb', '#a9d8c0', -70);
  burst(hero.x, hero.y - 6, '#a9d8c0', 10);
}

function showSwordRhythmImpact(monster, result) {
  if (!result?.empowered) return;
  const rank = Math.max(1, Math.min(3, result.rank));
  burst(monster.x, monster.y - 9, '#f2d687', 16 + rank * 4);
  addImpactWave(monster.x, monster.y - 8, '#ffe7a3', 54 + rank * 8, 2 + rank);
  addCombatGlyph(monster.x, monster.y, '*', '#ffe7a3', -66);
  beginHitStop(0.052 + rank * 0.01);
  playSwordRhythmAccent(rank);
}

/** The flash an ended state leaves behind; the toast is the caller's business. */
function showEffectRelief(id) {
  const definition = ACTOR_EFFECTS[id];
  burst(hero.x, hero.y - 8, definition.color, 7);
  addImpactWave(hero.x, hero.y - 6, definition.color, 44, 0);
}

function showWardPulse(id) {
  showEffectRelief(id);
  showLootToast({ icon: ACTOR_EFFECTS[id].icon, rarity: 1 }, '◇');
}

function cleanseEquippedWards() {
  const result = wardActorEffects(hero.effects, currentHeroMagic());
  hero.effects = result.effects;
  for (const id of result.cleared) showWardPulse(id);
  return result.cleared.length > 0;
}

function damageWildlife(
  creature,
  damage,
  color,
  { style = 'blade', projectile = false, sourceX = hero.x, sourceY = hero.y, vampiric = false } = {},
) {
  if (hero.dead || runStatus !== 'playing' || !creature?.hunted || creature.defeated) return;
  const command = nextGameCommand(SURVIVAL_COMMANDS.strike, creature.instanceId, { damage });
  const itemState = currentItemState();
  const result = strikeWildlife({
    command,
    creature,
    damage,
    items: itemState.items,
    inventory: itemState.inventory,
    meatUid: `raw-meat-${creature.instanceId}`,
  });
  if (!result.ok) return;
  const hit = result.events.find(({ type }) => type === 'wildlife-damaged');
  const dealt = hit?.payload.damage ?? 0;
  const lethal = result.state.creature.defeated;
  const profile = combatImpactProfile(style, { projectile, boss: false });
  Object.assign(creature, result.state.creature, {
    hit: 0.19,
    wanderTarget: null,
    route: [],
  });
  if (result.state.items) applySurvivalItemState(result.state);
  burst(creature.x, creature.y - 8, color, profile.particles);
  addImpactWave(creature.x, creature.y - 8, color, profile.waveSize, profile.shake);
  addCombatGlyph(creature.x, creature.y, dealt, color);
  addBloodImpact(creature, sourceX, sourceY, lethal);
  beginHitStop(profile.hitStop);
  if (vampiric && dealt > 0) {
    const recovery = resolveVampiricRecovery({
      hp: hero.hp,
      maxHp: currentHeroStats().maxHp,
      damage: dealt,
      magic: { vampirism: true },
    });
    hero.hp = recovery.hp;
    if (recovery.healed > 0) addCombatGlyph(hero.x, hero.y, `+${recovery.healed}`, '#d97873');
  }
  if (lethal) {
    const recovery = resolveKillRecovery({
      hp: hero.hp,
      maxHp: currentHeroStats().maxHp,
      magic: currentHeroMagic(),
      newlyDefeated: true,
    });
    hero.hp = recovery.hp;
  }
  applyGameEvents(result.events);
  updateHud();
  persistRun();
}

function applyHeroStatus(id, duration) {
  const previousDuration = hero.effects[id] ?? 0;
  // Endurance shortens what the hero suffers, and only what reaches the hero:
  // the same blow puts the same state on a monster for its full length.
  const endured = enduredDuration(duration, enduranceProfile(currentSkillCapabilities()));
  const result = applyWardedEffect(hero.effects, id, endured, currentHeroMagic());
  hero.effects = result.effects;
  if (result.blocked) {
    showWardPulse(result.blocked);
  } else if (result.reaction === 'steam') {
    burst(hero.x, hero.y - 18, '#c8d5d2', 16);
    addImpactWave(hero.x, hero.y - 5, '#8ebfc2', 52, 0);
  } else if (result.applied && hero.effects[id] > previousDuration) {
    const definition = ACTOR_EFFECTS[id];
    burst(hero.x, hero.y - 8, definition.color, id === 'burning' ? 16 : 10);
    addImpactWave(hero.x, hero.y - 6, definition.color, id === 'burning' ? 48 : 36, 0);
  }
  updateHud();
  persistRun();
  return result;
}

function damageMonster(
  monster,
  damage,
  color,
  {
    style = 'blade',
    projectile = false,
    sourceX = hero.x,
    sourceY = hero.y,
    vampiric = false,
    blunt = null,
  } = {},
) {
  if (monster?.actorKind === 'wildlife') {
    damageWildlife(monster, damage, color, { style, projectile, sourceX, sourceY, vampiric });
    return;
  }
  if (hero.dead || hero.hp <= 0 || runStatus !== 'playing') return;
  if (!monster || monster.dead > 0) return;
  if (monster.neutral && !monster.provoked) provokeCityWatch(monster);
  const profile = combatImpactProfile(style, { projectile, boss: monster.boss });
  // Broken armour amplifies every later source, not just the mace that made it.
  const amplified = Math.max(1, Math.round(damage * armorBreakMultiplier(monster.armorBreak)));
  damage = amplified;
  const dealt = Math.min(monster.hp, damage);
  monster.hit = 0.19;
  playSound(projectile ? 'hit-projectile' : style === 'heavy' ? 'hit-heavy' : 'hit-blade');
  monster.hp -= damage;
  const lethal = monster.hp <= 0;
  burst(monster.x, monster.y - 8, color, profile.particles);
  addImpactWave(monster.x, monster.y - 8, color, profile.waveSize, profile.shake);
  addCombatGlyph(monster.x, monster.y, dealt, color);
  addBloodImpact(monster, sourceX, sourceY, lethal);
  if (vampiric) {
    const recovery = resolveVampiricRecovery({
      hp: hero.hp,
      maxHp: currentHeroStats().maxHp,
      damage: dealt,
      magic: { vampirism: true },
    });
    hero.hp = recovery.hp;
    if (recovery.healed > 0) {
      burst(hero.x, hero.y - 12, '#b94d55', 6);
      addCombatGlyph(hero.x, hero.y, `+${recovery.healed}`, '#d97873');
      updateHud();
    }
  }
  beginHitStop(profile.hitStop);
  if (profile.staggers && monster.attackWindup > 0) {
    monster.attackWindup = 0;
    monster.attackRecovery = 0.18;
    addCombatGlyph(monster.x, monster.y, '!', '#e0c778', -66);
  }
  if (blunt && monster.hp > 0) applyBluntAftermath(monster, blunt);
  if (monster.hp <= 0) defeatMonster(monster);
  else if (monster.boss) updateBossHud();
}

function triggerPlacedTrapForMonster(monster) {
  if (!monster || monster.dead > 0 || runStatus !== 'playing') return false;
  const gridX = Math.floor(monster.x / TILE);
  const gridY = Math.floor(monster.y / TILE);
  const trapIndex = placedTraps.findIndex(
    (trap) => trap.state === 'armed' && trap.x === gridX && trap.y === gridY,
  );
  if (trapIndex < 0) return false;
  const result = triggerPlayerTrap({
    trap: placedTraps[trapIndex],
    target: { instanceId: monster.instanceId, ownerId: `monster:${monster.instanceId}`, hp: monster.hp },
    runStatus,
  });
  if (!result.ok) return false;
  placedTraps[trapIndex] = result.trap;
  monster.route = [];
  monster.repathCooldown = Math.max(monster.repathCooldown, result.holdSeconds);
  monster.trapStun = Math.max(monster.trapStun ?? 0, result.holdSeconds);
  monster.attackWindup = 0;
  monster.attackRecovery = Math.max(monster.attackRecovery, result.holdSeconds);
  const trapX = (result.trap.x + 0.5) * TILE;
  const trapY = (result.trap.y + 0.5) * TILE;
  damageMonster(monster, result.damage, '#d8bd68', {
    style: 'blade',
    sourceX: trapX,
    sourceY: trapY,
  });
  burst(trapX, trapY, '#d8bd68', 20);
  addImpactWave(trapX, trapY, '#c7574f', 54, 2);
  addCombatGlyph(trapX, trapY, '!', '#e0c778', -48);
  if (revealed.has(`${result.trap.x},${result.trap.y}`)) {
    trapAnnouncement.textContent = itemDetailLanguage === 'ru'
      ? 'Враг попал в капкан'
      : 'Enemy caught in the trap';
  }
  persistRun();
  return true;
}

function launchHeroProjectile(monster, damage, combat, color, shot = null) {
  const angle = Math.atan2(monster.y - hero.y, monster.x - hero.x);
  projectiles.push({
    x: hero.x + Math.cos(angle) * 22,
    y: hero.y + Math.sin(angle) * 22,
    angle,
    targetId: monster.instanceId,
    damage,
    speed: TILE * combat.projectileSpeed,
    life: 1.5,
    color: combat.projectile === 'arcane' ? '#78c9c5' : color,
    kind: combat.projectile,
    style: combat.style,
    pierceTargets: shot?.pierceTargets ?? 0,
    originX: hero.x,
    originY: hero.y,
    vampiric: currentHeroMagic().vampirism,
  });
}

function spellTargetCandidates(spell) {
  if (!spell || spell.kind !== 'projectile') return [];
  const candidates = [];
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  for (const target of [
    ...monsters,
    ...passiveCreatures.filter(({ hunted, defeated }) => hunted && !defeated),
  ]) {
    if (spell.targetMode === 'actor' && target.actorKind === 'wildlife') continue;
    if (target.actorKind === 'wildlife' ? target.defeated : target.dead > 0) continue;
    const targetCell = { x: Math.floor(target.x / TILE), y: Math.floor(target.y / TILE) };
    if (!revealed.has(`${targetCell.x},${targetCell.y}`)) continue;
    const distance = Math.hypot(target.x - hero.x, target.y - hero.y);
    if (distance > spell.range * TILE) continue;
    if (!hasLineOfSight(world, heroCell, targetCell)) continue;
    candidates.push({ target, distance });
  }
  return candidates
    .sort((left, right) => left.distance - right.distance || left.target.instanceId.localeCompare(right.target.instanceId))
    .map(({ target }) => target);
}

function nearestSpellTarget(spell) {
  return spellTargetCandidates(spell)[0] ?? null;
}

function rejectSpellUse(slotIndex, reason, text = '') {
  const button = spellActionButtons[slotIndex];
  button?.classList.remove('rejected');
  requestAnimationFrame(() => button?.classList.add('rejected'));
  window.setTimeout(() => button?.classList.remove('rejected'), 240);
  const glyph = reason === 'full-health' ? '♥' : reason === 'no-target' ? '?' : '!';
  addCombatGlyph(hero.x, hero.y, text === '' ? glyph : text, '#b9aaa0', -62);
}

const SPELL_CAST_SOUNDS = Object.freeze({
  'ember-bolt': 'spell-fire',
  'frost-lance': 'spell-ice',
  'storm-bolt': 'spell-ice',
});

function castPreparedSpell(slotIndex, explicitTarget = null) {
  if (!ready || uiScreen !== 'game' || hero.dead || openingDoor || runStatus !== 'playing') return false;
  const spellId = hero.spells.preparedSpellIds[slotIndex];
  const spell = spellById(spellId);
  const stats = currentHeroStats();
  const targets = spellTargetCandidates(spell);
  const target = spell?.kind === 'projectile'
    ? explicitTarget
      ? targets.find(({ instanceId }) => instanceId === explicitTarget.instanceId) ?? null
      : nearestSpellTarget(spell)
    : null;
  const availability = spellUseAvailability({
    state: hero.spells,
    slotIndex,
    intelligence: stats.intelligence,
    cooldown: spell ? spellCooldowns[spell.id] ?? 0 : 0,
    runStatus,
    heroHp: hero.hp,
    heroMaxHp: stats.maxHp,
    hasTarget: Boolean(target),
  });
  if (!availability.ok) {
    rejectSpellUse(slotIndex, availability.reason);
    return false;
  }

  const usedSpell = availability.spell;
  if (usedSpell.kind === 'projectile' && usedSpell.targetMode === 'actor' && !explicitTarget) {
    return beginSpellTargeting(slotIndex, usedSpell, targets);
  }
  if (usedSpell.kind === 'sustained') {
    const toggled = toggleSustainedSpell(hero.spells, usedSpell.id, stats.intelligence);
    if (!toggled.ok) {
      rejectSpellUse(slotIndex, toggled.reason);
      return false;
    }
    hero.spells = toggled.state;
    spellCooldowns[usedSpell.id] = usedSpell.cooldown;
    if (usedSpell.id === 'invisibility' && toggled.active) hero.invisibilityReveal = 0;
    playSound('spell-toggle');
    burst(hero.x, hero.y - 10, usedSpell.color, toggled.active ? 18 : 8);
    addImpactWave(hero.x, hero.y - 8, usedSpell.color, toggled.active ? 58 : 34, 0);
    addCombatGlyph(hero.x, hero.y, toggled.active ? '◆' : '◇', usedSpell.color, -62);
  } else if (usedSpell.kind === 'camp') {
    const refusal = summonCamp();
    if (refusal !== '') {
      rejectSpellUse(slotIndex, 'camp-refused', refusal);
      return false;
    }
    hero.path = [];
    hero.attack = Math.max(hero.attack, 0.3);
    hero.attackDuration = 0.3;
    hero.attackStyle = 'staff';
    hero.attackCooldown = Math.max(hero.attackCooldown, 0.34);
    spellCooldowns[usedSpell.id] = usedSpell.cooldown;
    burst(hero.x, hero.y - 12, usedSpell.color, 24);
    addImpactWave(hero.x, hero.y - 8, usedSpell.color, 70, 1);
  } else if (usedSpell.kind === 'heal') {
    hero.path = [];
    hero.attack = Math.max(hero.attack, 0.28);
    hero.attackDuration = 0.28;
    hero.attackStyle = 'staff';
    hero.attackCooldown = Math.max(hero.attackCooldown, 0.32);
    const amount = Math.min(
      spellHealing(usedSpell.id, stats.intelligence, currentSkillCapabilities().cleansingRank ?? 0),
      stats.maxHp - hero.hp,
    );
    hero.hp += amount;
    spellCooldowns[usedSpell.id] = usedSpell.cooldown;
    playSound('spell-heal');
    burst(hero.x, hero.y - 12, usedSpell.color, 22);
    addImpactWave(hero.x, hero.y - 8, usedSpell.color, 66, 1);
    addCombatGlyph(hero.x, hero.y, `+${amount}`, usedSpell.color, -62);
  } else {
    playSound(SPELL_CAST_SOUNDS[usedSpell.id] ?? 'spell-fire');
    hero.path = [];
    hero.attack = Math.max(hero.attack, 0.32);
    hero.attackDuration = 0.32;
    hero.attackStyle = 'staff';
    hero.attackCooldown = Math.max(hero.attackCooldown, 0.38);
    hero.targetAngle = Math.atan2(target.y - hero.y, target.x - hero.x);
    hero.facing = target.x < hero.x ? -1 : 1;
    hero.invisibilityReveal = currentHeroMagic().invisibility
      ? INVISIBILITY_REVEAL_SECONDS
      : hero.invisibilityReveal;
    const angle = hero.targetAngle;
    const skillCapabilities = currentSkillCapabilities();
    const schoolRank = usedSpell.schoolId === 'pyromancy'
      ? skillCapabilities.pyromancyRank ?? 0
      : usedSpell.schoolId === 'cryomancy'
        ? skillCapabilities.cryomancyRank ?? 0
        : usedSpell.schoolId === 'storm-magic'
          ? skillCapabilities.stormMagicRank ?? 0
          : 0;
    projectiles.push({
      x: hero.x + Math.cos(angle) * 22,
      y: hero.y + Math.sin(angle) * 22,
      sourceX: hero.x,
      sourceY: hero.y,
      angle,
      targetId: target.instanceId,
      damage: spellDamage(usedSpell.id, stats.intelligence, schoolRank),
      speed: TILE * 7.2,
      life: 1.5,
      color: usedSpell.color,
      kind: usedSpell.id,
      style: 'staff',
      vampiric: false,
      spellId: usedSpell.id,
      spread: pyromancySpreadProfile(skillCapabilities.pyromancyRank ?? 0),
      cryomancyRank: skillCapabilities.cryomancyRank ?? 0,
      stormMagicRank: skillCapabilities.stormMagicRank ?? 0,
      status: spellStatus(usedSpell.id, stats.intelligence),
    });
    spellCooldowns[usedSpell.id] = usedSpell.cooldown;
    burst(hero.x + Math.cos(angle) * 20, hero.y + Math.sin(angle) * 20 - 8, usedSpell.color, 10);
  }
  playerHasActed = true;
  renderSpellBar();
  updateHud();
  persistRun();
  return true;
}

function resolvePendingHeroAttack(previousRemaining, nextRemaining) {
  const pending = hero.pendingAttack;
  if (!pending) return;
  if (!attackCrossedContact(previousRemaining, nextRemaining, hero.attackDuration, hero.attackStyle)) {
    if (nextRemaining <= 0) hero.pendingAttack = null;
    return;
  }
  hero.pendingAttack = null;
  const monster = monsters.find(({ instanceId }) => instanceId === pending.targetId)
    ?? passiveCreatures.find(({ instanceId, hunted, defeated }) =>
      instanceId === pending.targetId && hunted && !defeated);
  if (
    !monster
    || (monster.actorKind === 'wildlife' ? monster.defeated : monster.dead > 0)
    || !canHeroAttack(monster, pending.combat)
  ) return;
  if (pending.combat.projectile) {
    const shot = resolveMarksmanShot({ profile: pending.marksman, steadySeconds: heroSteadySeconds });
    const shotDamage = applyStrikeBonus(pending.damage, shot.bonusPercent);
    launchHeroProjectile(monster, shotDamage, pending.combat, pending.color, shot);
    if (shot.aimed) {
      heroSteadySeconds = 0;
      addCombatGlyph(hero.x, hero.y, '\u25ce', '#dcc98a', -70);
    }
    return;
  }
  const cleaveTargets = selectAxeCleaveTargets({
    grid: world,
    attacker: hero,
    primary: monster,
    candidates: [
      ...monsters,
      ...passiveCreatures.filter(({ hunted, defeated }) => hunted && !defeated),
    ],
    profile: pending.cleave,
    tileSize: TILE,
  });
  let primaryDamage = pending.damage;
  let primarySwordResult = null;
  if (pending.sword?.slot === 'primary') {
    primarySwordResult = resolveSwordRhythmStrike({
      state: swordRhythmState,
      targetId: monster.instanceId,
      weapon: pending.sword.weapon,
      capabilities: pending.sword.capabilities,
      baseDamage: primaryDamage,
    });
    swordRhythmState = primarySwordResult.state;
    primaryDamage = primarySwordResult.damage;
  }
  const daggerBonus = resolveDaggerStrike({
    profile: pending.dagger,
    awareOfAttacker: (monster.alerted ?? 0) > 0,
    attackerX: hero.x,
    targetX: monster.x,
    targetFacing: monster.facing,
  });
  primaryDamage = applyStrikeBonus(primaryDamage, daggerBonus.percent);
  damageMonster(monster, primaryDamage, pending.color, {
    style: pending.combat.style,
    sourceX: hero.x,
    sourceY: hero.y,
    vampiric: pending.vampiric,
    blunt: pending.blunt,
  });
  if (daggerBonus.kind) showDaggerStrikeImpact(monster, daggerBonus);
  if (primarySwordResult?.empowered) showSwordRhythmImpact(monster, primarySwordResult);
  if (pending.secondary && (monster.actorKind === 'wildlife' ? !monster.defeated : monster.dead === 0)) {
    let secondaryDamage = pending.secondary.damage;
    let secondarySwordResult = null;
    if (pending.sword?.slot === 'secondary') {
      secondarySwordResult = resolveSwordRhythmStrike({
        state: swordRhythmState,
        targetId: monster.instanceId,
        weapon: pending.sword.weapon,
        capabilities: pending.sword.capabilities,
        baseDamage: secondaryDamage,
      });
      swordRhythmState = secondarySwordResult.state;
      secondaryDamage = secondarySwordResult.damage;
    }
    damageMonster(monster, secondaryDamage, pending.secondary.color, {
      style: pending.secondary.style,
      sourceX: hero.x,
      sourceY: hero.y,
      vampiric: pending.vampiric,
    });
    if (secondarySwordResult?.empowered) showSwordRhythmImpact(monster, secondarySwordResult);
  }
  const cleaveDamage = axeCleaveDamage(pending.damage, pending.cleave);
  for (const target of cleaveTargets) {
    damageMonster(target, cleaveDamage, pending.color, {
      style: pending.combat.style,
      sourceX: hero.x,
      sourceY: hero.y,
      vampiric: pending.vampiric,
    });
  }
}

function addInventoryItem(definition, uid) {
  if (!definition.slot) {
    const existing = backpackItems.find((item) => item.id === definition.id);
    if (existing) {
      existing.stack = (existing.stack ?? 1) + (definition.stack ?? 1);
      updateHud();
      return true;
    }
  }
  if (backpackItems.length >= 12 || itemInstances.has(uid)) return false;
  const item = { ...definition, uid, stack: definition.stack };
  itemInstances.set(uid, item);
  backpackItems.push(item);
  updateHud();
  return true;
}

function gainExperience(monster) {
  const progression = awardHeroExperience({
    hero,
    amount: monster.xp,
    equipment: selected,
    items: itemInstances,
  });
  Object.assign(hero, progression.hero);
  const goldReward = goldRewardForMonster(monster);
  gold += goldReward;
  for (let level = 0; level < progression.levelsGained; level += 1) {
    burst(hero.x, hero.y - 10, '#d4c27e', 18);
  }
  showLevelUpCelebration(progression);
  showLootToast({ icon: 'item/gold/16.png', rarity: Math.min(3, monster.tier >> 1) }, goldReward);
  updateHud();
}

function defeatMonster(monster) {
  if (hero.dead || hero.hp <= 0 || runStatus !== 'playing') return;
  if (monster.dead > 0 || run.floor.defeated.includes(monster.instanceId)) return;
  monster.dead = 0.01;
  run.floor.defeated.push(monster.instanceId);
  run.stats.kills += 1;
  playSound('kill');
  if (monster.burst) burstEffectAround(monster);
  gainExperience(monster);
  if (monster.vaultRewardGold > 0) {
    gold += monster.vaultRewardGold;
    showLootToast({ path: monster.spritePath, rarity: 3 }, monster.vaultRewardGold);
    findAnnouncement.textContent = itemDetailLanguage === 'ru'
      ? `Мимик повержен · ${monster.vaultRewardGold} золота`
      : `Mimic defeated · ${monster.vaultRewardGold} gold`;
  }
  const recovery = resolveKillRecovery({
    hp: hero.hp,
    maxHp: currentHeroStats().maxHp,
    magic: currentHeroMagic(),
    newlyDefeated: true,
  });
  hero.hp = recovery.hp;
  if (recovery.healed > 0) {
    burst(hero.x, hero.y - 12, '#8bc59c', 9);
    addImpactWave(hero.x, hero.y - 4, '#8bc59c', 38, 0);
    addCombatGlyph(hero.x, hero.y, `+${recovery.healed}`, '#8bc59c');
    showLootToast({ icon: 'item/ring/i-regeneration.png', rarity: 2 }, `+${recovery.healed} ♥`);
    updateHud();
  }
  if (monster.instanceId === dungeon.objective?.bossInstanceId) {
    const finalGuardian = dungeon.depth === FINAL_DEPTH;
    showLootToast(
      { path: finalGuardian ? ARTIFACT_PATH : EXIT_PATH, rarity: 3 },
      finalGuardian ? '◆' : romanDepth(dungeon.depth),
    );
    burst(monster.x, monster.y - 8, finalGuardian ? '#d83e82' : '#d4b653', 28);
    updateBossHud();
  }
  persistRun();
}

function damageHero(amount, {
  direct = false,
  impactColor = null,
  subtle = false,
  blocked = false,
  source = null,
} = {}) {
  if (hero.dead || hero.hp <= 0 || runStatus !== 'playing') return null;
  const combat = currentHeroCombat();
  const fullyBlocked = !direct && blocked && combat.guard > 0;
  const directDamage = Math.max(0, Math.ceil(amount));
  const result = fullyBlocked
    ? Object.freeze({ hp: hero.hp, damage: 0, dead: false, blocked: true })
    : direct
    ? Object.freeze({
        hp: Math.max(0, hero.hp - directDamage),
        damage: directDamage,
        dead: hero.hp - directDamage <= 0,
      })
    : resolveHeroDamage({
        hp: hero.hp,
        amount,
        defense: currentHeroStats().defense,
        guard: combat.guard,
      });
  hero.hp = result.hp;
  hero.hurt = fullyBlocked ? 0 : subtle ? 0.12 : 0.24;
  if (!subtle) playSound(fullyBlocked ? 'block' : 'hero-hurt');
  hero.guardFlash = fullyBlocked ? 0.32 : !direct && combat.guard > 0 ? 0.22 : 0;
  const color = impactColor ?? (combat.guard > 0 ? '#84b9b8' : '#c25a4f');
  burst(hero.x, hero.y - 8, color, fullyBlocked ? 16 : subtle ? 5 : 10);
  addImpactWave(
    hero.x,
    hero.y - 8,
    color,
    fullyBlocked ? 56 : subtle ? 28 : 46,
    fullyBlocked || subtle ? 0 : 3,
  );
  if (!subtle) {
    addCombatGlyph(hero.x, hero.y, result.damage, color);
    if (!fullyBlocked) {
      addBloodImpact({ ...hero, bloodColor: '#6a302b' }, hero.x - Math.cos(hero.targetAngle) * TILE, hero.y - Math.sin(hero.targetAngle) * TILE, result.dead);
    }
    beginHitStop(fullyBlocked ? 0.065 : result.dead ? 0.075 : 0.045);
  }
  updateHud();
  if (!result.dead) return result;
  hero.dead = true;
  runStatus = 'dead';
  hero.path = [];
  hero.pendingAttack = null;
  hero.attackEmpowered = false;
  hero.attackMasteryRank = 0;
  swordRhythmState = createSwordRhythmState();
  projectiles.length = 0;
  if (typeof lightningArcs !== 'undefined') lightningArcs.length = 0;
  deathTimer = 1.35;
  run.stats.killerId = typeof source === 'string' ? source : null;
  playSound('death');
  stopAmbient();
  persistRun();
  return result;
}

function resolveWorldInteractions() {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const heroCellKey = `${heroCell.x},${heroCell.y}`;
  if (heroCellKey !== lastHeroCell) {
    lastHeroCell = heroCellKey;
    if (revealAround(revealed, world, heroCell, currentRevealRadius())) persistRun();
    discoverNearbyTraps();
    updateSanctuaryUi();
    updateInteractionUi();
    updateBossHud();
  }

  for (let index = lootDefinitions.length - 1; index >= 0; index -= 1) {
    const loot = lootDefinitions[index];
    if (Math.hypot(loot.x - hero.x, loot.y - hero.y) > TILE * 0.54) continue;
    if (loot.definition.gold) {
      const reward = Math.max(1, loot.amount ?? 1);
      lootDefinitions.splice(index, 1);
      run.floor.collected.push(loot.instanceId);
      gold += reward;
      playSound('gold');
      burst(loot.x, loot.y - 8, rarityGlow[loot.definition.rarity], 16);
      addImpactWave(loot.x, loot.y - 8, rarityGlow[loot.definition.rarity], 52, 1);
      showLootToast(loot.definition, reward);
      updateHud();
      persistRun();
      continue;
    }
    if (!addInventoryItem(loot.definition, loot.instanceId)) {
      if (!fullInventoryWarnings.has(loot.instanceId)) {
        fullInventoryWarnings.add(loot.instanceId);
        showLootToast(loot.definition, 'full');
      }
      continue;
    }
    fullInventoryWarnings.delete(loot.instanceId);
    lootDefinitions.splice(index, 1);
    playSound('pickup');
    run.floor.collected.push(loot.instanceId);
    const displayItem = presentedItem(loot.definition);
    burst(loot.x, loot.y - 8, rarityGlow[displayItem.rarity], 8 + displayItem.rarity * 4);
    addImpactWave(
      loot.x,
      loot.y - 8,
      rarityGlow[displayItem.rarity],
      34 + displayItem.rarity * 10,
      displayItem.rarity >= 3 ? 2 : 0,
    );
    showLootToast(loot.definition, 1);
    persistRun();
  }

  for (let index = eventDefinitions.length - 1; index >= 0; index -= 1) {
    const event = eventDefinitions[index];
    if (Math.hypot(event.x - hero.x, event.y - hero.y) > TILE * 0.54) continue;
    if (event.id === 'blade-trap' && currentHeroMagic().flight) continue;
    const { effect, value, path } = event.definition;
    if (effect === 'heal') {
      const healed = Math.min(value, currentHeroStats().maxHp - hero.hp);
      eventDefinitions.splice(index, 1);
      run.floor.resolved.push(event.instanceId);
      if (healed > 0) hero.hp += healed;
      showLootToast({ path, rarity: 1 }, healed);
    } else if (effect === 'power') {
      eventDefinitions.splice(index, 1);
      run.floor.resolved.push(event.instanceId);
      hero.power += value;
      showLootToast({ path, rarity: 3 }, value);
    } else if (effect === 'damage') {
      if (event.id === 'blade-trap') {
        detectedTrapIds.add(event.instanceId);
        burst(event.x, event.y - 4, '#b4a597', 12);
        addImpactWave(event.x, event.y, '#aa6954', 38, 1);
      }
      eventDefinitions.splice(index, 1);
      run.floor.resolved.push(event.instanceId);
      showLootToast({ path, rarity: 0 }, -value);
      playSound('trap');
      damageHero(value, { source: `trap:${event.id}` });
    } else {
      eventDefinitions.splice(index, 1);
      run.floor.resolved.push(event.instanceId);
      const reward = value * 5 + dungeon.depth;
      gold += reward;
      showLootToast({ path, rarity: 2 }, reward);
    }
    if (event.definition.status && !hero.dead) {
      applyHeroStatus(event.definition.status.id, event.definition.status.duration);
    }
    updateHud();
    persistRun();
    if (hero.dead) return;
  }

  if (hero.dead || heroCell.x !== dungeon.exit.x || heroCell.y !== dungeon.exit.y) return;
  if (!canLeaveDungeonFloor({
    depth: dungeon.depth,
    status: runStatus,
    guardianDefeated: objectiveBossDefeated(),
  })) return;
  if (artifactAvailable()) {
    completeVictory();
    return;
  }
  if (dungeon.depth < FINAL_DEPTH) descendFloor();
}

function completeVictory() {
  if (!artifactAvailable()) return;
  runStatus = 'victory';
  run.status = runStatus;
  hero.path = [];
  hero.pendingAttack = null;
  hero.attackEmpowered = false;
  hero.attackMasteryRank = 0;
  swordRhythmState = createSwordRhythmState();
  projectiles.length = 0;
  if (typeof lightningArcs !== 'undefined') lightningArcs.length = 0;
  burst(hero.x, hero.y - 10, '#d83e82', 42);
  playSound('victory');
  stopAmbient();
  showLootToast({ path: ARTIFACT_PATH, rarity: 3 }, 'III');
  persistRun();
  showRunEndScreen('victory');
}

function healAtSanctuary() {
  const result = useSanctuary({
    depth: dungeon.depth,
    hp: hero.hp,
    maxHp: currentHeroStats().maxHp,
    gold,
  });
  if (!result.ok) {
    updateSanctuaryUi();
    return;
  }
  hero.hp = result.state.hp;
  gold = result.state.gold;
  burst(hero.x, hero.y - 8, '#d4c27e', 22);
  playSound('spell-heal');
  showLootToast({ path: SANCTUARY_PATH, rarity: 2 }, result.healed);
  updateHud();
  persistRun();
}

function replaceFloor(nextDepth) {
  dungeon = generateDungeon({
    seed: run.seed,
    depth: nextDepth,
    scalingVersion: run.scalingVersion,
    difficulty: run.difficulty,
    lootAbundance: run.lootAbundance,
  });
  world = dungeon.grid;
  startAmbient(biomeThemeForDepth(dungeon.depth).palette);
  mistAnchors = createMistAnchors(dungeon);
  voidStarLayers = createVoidStars(dungeon);
  const generatedChestIds = dungeon.finds
    .filter(({ id }) => id === 'sealed-cache')
    .map(({ instanceId }) => instanceId)
    .sort();
  const persistedChestIds = Array.isArray(run.floor?.chests)
    ? run.floor.chests.map(({ findId }) => findId).sort()
    : [];
  const keepPersistedChests = run.depth === nextDepth
    && generatedChestIds.length === persistedChestIds.length
    && generatedChestIds.every((id, index) => id === persistedChestIds[index]);
  const nextChests = keepPersistedChests
    ? run.floor.chests.map((container) => ({
        ...container,
        items: container.items.map((item) => ({ ...item })),
      }))
    : [...createChestContainerStates({
        seed: dungeon.seed,
        depth: dungeon.depth,
        finds: dungeon.finds,
        lootAbundance: run.lootAbundance,
      })];
  const generatedMerchantIds = dungeon.merchants.map(({ instanceId }) => instanceId).sort();
  const persistedMerchantIds = Array.isArray(run.floor?.merchants)
    ? run.floor.merchants.map(({ merchantId }) => merchantId).sort()
    : [];
  const keepPersistedMerchants = run.depth === nextDepth
    && generatedMerchantIds.length === persistedMerchantIds.length
    && generatedMerchantIds.every((id, index) => id === persistedMerchantIds[index]);
  const nextMerchants = keepPersistedMerchants
    ? run.floor.merchants.map((merchantState) => ({
        merchantId: merchantState.merchantId,
        gold: merchantState.gold,
        purchasedEntryIds: [...merchantState.purchasedEntryIds],
        buyback: merchantState.buyback.map(({ record, price }) => ({
          price,
          record: { ...record, ...(record.affixIds ? { affixIds: [...record.affixIds] } : {}) },
        })),
      }))
    : [...createMerchantStates({ merchants: dungeon.merchants, depth: dungeon.depth })];
  run.depth = nextDepth;
  run.floor = {
    revealed: [],
    defeated: [],
    collected: [],
    resolved: [],
    resolvedFindIds: [],
    opened: [],
    triggered: [],
    monsters: [],
    passives: [],
    detectedTrapIds: [],
    disarmedTrapIds: [],
    placedTraps: [],
    merchants: nextMerchants,
    chests: nextChests,
  };
  monsters = createMonsters(dungeon);
  passiveCreatures = createPassiveCreatures(dungeon);
  lootDefinitions = createLootDefinitions(dungeon);
  eventDefinitions = createEventDefinitions(dungeon);
  findDefinitions = createFindDefinitions(dungeon);
  visibleSecretIds.clear();
  applyCampProps();
  trapDefinitions = trapsFromDungeon(dungeon);
  placedTraps = [];
  detectedTrapIds = new Set();
  hazardInputState = createHazardInputState();
  permittedHazardCell = null;
  doorDefinitions = dungeon.doors.map((door) => ({ ...door }));
  merchantDefinitions = dungeon.merchants.map((merchant) => ({ ...merchant }));
  openingDoor = null;
  activeChestFindId = null;
  dungeonEnvironment = createDungeonEnvironment(dungeon);
  revealed.clear();
  revealAround(revealed, world, dungeon.spawn, currentRevealRadius());
  hero.x = (dungeon.spawn.x + 0.5) * TILE;
  hero.y = (dungeon.spawn.y + 0.5) * TILE;
  hero.path = [];
  hero.attack = 0;
  hero.pendingAttack = null;
  hero.attackEmpowered = false;
  hero.attackMasteryRank = 0;
  swordRhythmState = createSwordRhythmState();
  hero.guardFlash = 0;
  hero.invisibilityReveal = 0;
  projectiles.length = 0;
  if (typeof lightningArcs !== 'undefined') lightningArcs.length = 0;
  for (const id of Object.keys(spellCooldowns)) delete spellCooldowns[id];
  spellUiAccumulator = 0;
  impactWaves.length = 0;
  combatGlyphs.length = 0;
  bloodDrops.length = 0;
  bloodStains.length = 0;
  hitStop = 0;
  renderShake.amount = 0;
  hero.dead = false;
  runStatus = 'playing';
  run.status = 'playing';
  lastHeroCell = `${dungeon.spawn.x},${dungeon.spawn.y}`;
  camera.x = hero.x;
  camera.y = hero.y;
  sceneStartedAt = elapsed;
  if (ready) rebuildDungeonWorld3D();
  discoverNearbyTraps({ feedback: false });
  updateHud();
  persistRun();
}

function descendFloor() {
  if (isTerminalRunStatus(runStatus) || dungeon.depth >= FINAL_DEPTH) return;
  run = advanceRunFloor(captureRun());
  hero.hp = run.hero.hp;
  hero.hunger = run.hero.hunger;
  replaceFloor(run.depth);
  playSound('descend');
  showLootToast({ path: EXIT_PATH, rarity: 2 }, romanDepth(run.depth));
}

function restartRun() {
  clearMoveControl();
  clearLevelUpCelebration();
  onboardingInteracted = false;
  onboardingHintId = null;
  onboardingCheckedAt = Number.NEGATIVE_INFINITY;
  renderOnboardingHint();
  run = createRun(fixedPreviewSeed ?? createSeed());
  motes = createAtmosphereMotes(run.seed);
  gold = run.gold;
  itemInstances = new Map(run.items.map((record) => [record.uid, materializeInventoryItem(record)]));
  backpackItems = run.inventory.map((uid) => itemInstances.get(uid)).filter(Boolean);
  Object.assign(selected, run.equipment);
  hero.hp = run.hero.hp;
  hero.maxHp = run.hero.maxHp;
  hero.level = run.hero.level;
  hero.xp = run.hero.xp;
  hero.power = run.hero.power;
  hero.hunger = run.hero.hunger;
  hero.meal = createMealState(run.hero.meal);
  hero.intelligence = run.hero.intelligence;
  hero.spells = createSpellState(run.hero.spells);
  hungerAccumulator = 0;
  hungerAutosaveElapsed = 0;
  currentHungerStageId = hungerStage(hero.hunger).id;
  hero.effects = createActorEffects(run.hero.effects);
  hero.skills = cloneSkillState(run.hero.skills);
  hero.skillStudy = createBookStudy(run.hero.skillStudy);
  for (const id of Object.keys(spellCooldowns)) delete spellCooldowns[id];
  spellUiAccumulator = 0;
  hero.dead = false;
  runStatus = 'playing';
  playerHasActed = false;
  deathTimer = 0;
  hideRunEndScreen();
  replaceFloor(1);
  updateGearUi();
  renderPack();
}

/** A dish wears off on its own clock, and the hero is told when it does. */
function updateHeroMeal(delta) {
  if (!playerHasActed || runStatus !== 'playing' || hero.dead || !hero.meal) return;
  const tick = tickMeal(hero.meal, Math.min(1, delta));
  hero.meal = tick.meal;
  if (!tick.expired) return;
  renderHeroEffectsHud();
  renderCharacterSheet();
  persistRun();
}

function updateHeroEffects(delta) {
  updateHeroMeal(delta);
  if (cleanseEquippedWards()) {
    updateHud();
    persistRun();
  }
  if (!playerHasActed || activeActorEffects(hero.effects).length === 0) return;
  const tick = tickActorEffects(hero.effects, delta);
  hero.effects = tick.effects;
  const pulsed = Object.keys(tick.pulses).length > 0;
  if (tick.damage > 0) {
    const color = tick.pulses.burning
      ? ACTOR_EFFECTS.burning.color
      : ACTOR_EFFECTS.poison.color;
    damageHero(tick.damage, {
      direct: true,
      impactColor: color,
      subtle: true,
      source: tick.pulses.burning ? 'effect:burning' : 'effect:poison',
    });
  }
  if ((pulsed || tick.expired.length > 0) && !hero.dead) {
    updateHud();
    persistRun();
  }
}

function updateHunger(delta) {
  if (!playerHasActed || runStatus !== 'playing' || hero.dead) return;
  hungerAccumulator += delta;
  const activeSeconds = Math.floor(hungerAccumulator);
  if (activeSeconds < 1) return;
  hungerAccumulator -= activeSeconds;
  run.stats.activeSeconds += activeSeconds;
  const before = hero.hunger;
  hero.hunger = advanceHunger(hero.hunger, activeSeconds);
  if (hero.hunger === before) return;

  const nextStageId = hungerStage(hero.hunger).id;
  renderHungerHud();
  if (nextStageId !== currentHungerStageId) {
    currentHungerStageId = nextStageId;
    const presentation = hungerPresentation(hero.hunger, itemDetailLanguage);
    showLootToast({ path: 'item/food/bread_ration.png', rarity: nextStageId === 'starving' ? 3 : 1 }, presentation.label);
    renderCharacterSheet();
  }

  hungerAutosaveElapsed += activeSeconds;
  if (hungerAutosaveElapsed >= HUNGER_TUNING.autosaveEvery) {
    hungerAutosaveElapsed = 0;
    persistRun();
  }
}

function updateHero(delta) {
  const previousAttack = hero.attack;
  hero.attack = Math.max(0, hero.attack - delta);
  hero.attackCooldown = Math.max(0, hero.attackCooldown - delta);
  hero.hurt = Math.max(0, hero.hurt - delta);
  hero.guardFlash = Math.max(0, hero.guardFlash - delta);
  hero.invisibilityReveal = Math.max(0, hero.invisibilityReveal - delta);
  heroSteadySeconds = accumulateSteadiness(heroSteadySeconds, delta, hero.path.length > 0);
  heroDodgeBoost = tickDodgeBoost(heroDodgeBoost, delta);
  if (typeof spellCooldowns !== 'undefined' && typeof spellUiAccumulator !== 'undefined') {
    let cooldownChanged = false;
    for (const [spellId, remaining] of Object.entries(spellCooldowns)) {
      const next = Math.max(0, remaining - delta);
      if (next === 0) delete spellCooldowns[spellId];
      else spellCooldowns[spellId] = next;
      cooldownChanged = true;
    }
    if (cooldownChanged) {
      spellUiAccumulator += delta;
      if (spellUiAccumulator >= 0.1) {
        spellUiAccumulator = 0;
        if (typeof renderSpellBar === 'function') renderSpellBar();
      }
    }
  }
  if (runStatus !== 'playing') return;
  updateHunger(delta);
  updateHeroEffects(delta);
  if (hero.dead) return;
  resolvePendingHeroAttack(previousAttack, hero.attack);
  updateHeldMove(performance.now());
  if (hero.path.length > 0) {
    const target = hero.path[0];
    const targetCell = monsterCellKey(target, TILE);
    const currentCell = monsterCellKey(hero, TILE);
    const targetBlocked =
      !isHeroWalkable(Math.floor(target.x / TILE), Math.floor(target.y / TILE)) ||
      (!currentHeroMagic().flight && knownTrapCells().has(targetCell) && permittedHazardCell !== targetCell) ||
      (targetCell !== currentCell && heroBlockingCells().has(targetCell));
    if (targetBlocked) {
      hero.path = [];
    } else {
      const dx = target.x - hero.x;
      const dy = target.y - hero.y;
      const distance = Math.hypot(dx, dy);
      const movement = Math.min(
        distance,
        delta *
          TILE *
          HERO_BASE_MOVE_SPEED *
          currentHeroStats().moveSpeed *
          actorEffectModifiers(hero.effects).moveSpeed *
          terrainSpeedMultiplier({ inWater: heroWading() }) *
          dodgeSpeedMultiplier(heroDodgeBoost, currentMobilityProfile()),
      );
      if (distance > 0) {
        const next = constrainActorMovement({
          actor: hero,
          next: { x: hero.x + (dx / distance) * movement, y: hero.y + (dy / distance) * movement },
          blockers: [...monsters, ...passiveCreatures.filter((creature) => !creature.defeated)],
          tileSize: TILE,
        });
        hero.stride += Math.hypot(next.x - hero.x, next.y - hero.y) / TILE;
        hero.x = next.x;
        hero.y = next.y;
        hero.facing = dx < -0.1 ? -1 : dx > 0.1 ? 1 : hero.facing;
        if (next.blocked) hero.path = [];
      }
      if (distance < 2.5) hero.path.shift();
    }
  }
  resolveWorldInteractions();
  if (hero.dead || runStatus !== 'playing' || openingDoor) return;
  // A deliberate move/retreat owns the hero until the route finishes or meets
  // an obstacle. Auto-combat must not erase it again after a single tiny step.
  if (hero.path.length > 0) return;

  const combat = currentHeroCombat();
  let nearest = null;
  let nearestDistance = Infinity;
  for (const monster of [
    ...monsters,
    ...passiveCreatures.filter(({ hunted, defeated }) => hunted && !defeated),
  ]) {
    if (monster.actorKind !== 'wildlife' && monster.dead > 0) continue;
    // Standing next to the watch is not an attack: a guard is struck on purpose.
    if (monster.neutral && !monster.provoked) continue;
    if (!canHeroAttack(monster, combat)) continue;
    const distance = Math.hypot(monster.x - hero.x, monster.y - hero.y);
    if (distance < nearestDistance) {
      nearest = monster;
      nearestDistance = distance;
    }
  }
  if (nearest && hero.attackCooldown === 0) {
    hero.path = [];
    hero.attackDuration = combat.attackDuration;
    hero.attack = combat.attackDuration;
    hero.attackStyle = combat.style;
    hero.attackCooldown = combat.cooldown;
    hero.targetAngle = Math.atan2(nearest.y - hero.y, nearest.x - hero.x);
    hero.facing = nearest.x < hero.x ? -1 : 1;
    if (currentHeroMagic().invisibility) hero.invisibilityReveal = INVISIBILITY_REVEAL_SECONDS;
    const loadout = currentWeaponLoadout();
    const weapon = loadout.primary;
    const color = rarityGlow[weapon?.rarity ?? 0];
    const wadingMultiplier = terrainMeleeMultiplier({ inWater: heroWading() });
    const damage = Math.max(1, Math.round(combatDamage(currentHeroStats(), combat) * wadingMultiplier));
    const secondaryDamage = combat.secondary && loadout.secondary
      ? Math.max(1, Math.round(combatDamage(currentHeroStats(), combat.secondary) * wadingMultiplier))
      : 0;
    const swordSource = swordRhythmSource(loadout.primary, loadout.secondary);
    const swordCapabilities = swordSource
      ? hero.skillStudy
        ? deriveSkillCapabilities(hero.skills, { rankAdjustments: hero.skillStudy.rankAdjustments })
        : deriveSkillCapabilities(hero.skills)
      : null;
    const swordPreview = swordSource
      ? resolveSwordRhythmStrike({
          state: swordRhythmState,
          targetId: nearest.instanceId,
          weapon: swordSource.weapon,
          capabilities: swordCapabilities,
          baseDamage: swordSource.slot === 'primary' ? damage : secondaryDamage,
        })
      : null;
    if (!swordSource) swordRhythmState = createSwordRhythmState();
    hero.attackEmpowered = Boolean(swordPreview?.empowered);
    hero.attackMasteryRank = swordPreview?.rank ?? 0;
    hero.pendingAttack = {
      targetId: nearest.instanceId,
      damage,
      color,
      combat: { ...combat },
      cleave: currentHeroCleave(),
    dagger: currentDaggerProfile(),
    blunt: currentBluntProfile(),
    marksman: currentMarksmanProfile(),
      sword: swordSource
        ? {
            slot: swordSource.slot,
            weapon: swordSource.weapon,
            capabilities: swordCapabilities,
          }
        : null,
      secondary: combat.secondary && loadout.secondary
        ? {
            damage: secondaryDamage,
            color: rarityGlow[loadout.secondary.rarity ?? 0],
            style: combat.secondary.style,
          }
        : null,
      vampiric: currentHeroMagic().vampirism,
    };
  }
}

function updatePassiveCreatures(delta) {
  if (runStatus !== 'playing' || !playerHasActed || hero.dead) return;
  const heroCell = {
    x: Math.floor(hero.x / TILE),
    y: Math.floor(hero.y / TILE),
  };
  const heroCells = blockingActorCells([hero], TILE);
  const occupied = occupiedMonsterCells(monsters, TILE);
  for (const creature of passiveCreatures) {
    if (!creature.defeated) occupied.add(monsterCellKey(creature, TILE));
  }
  const reserved = new Set([
    ...blockingActorCells(monsters, TILE),
    ...heroCells,
    ...blockingFindCells(),
  ]);

  for (const creature of passiveCreatures) {
    creature.hit = Math.max(0, creature.hit - delta);
    creature.attackCooldown = Math.max(0, creature.attackCooldown - delta);
    creature.attackRecovery = Math.max(0, creature.attackRecovery - delta);
    creature.repathCooldown = Math.max(0, creature.repathCooldown - delta);
    const previousWindup = creature.attackWindup;
    creature.attackWindup = Math.max(0, creature.attackWindup - delta);
    if (creature.defeated) continue;
    creature.wanderCooldown = Math.max(0, creature.wanderCooldown - delta);
    const currentKey = monsterCellKey(creature, TILE);
    occupied.delete(currentKey);

    if (previousWindup > 0) {
      if (creature.attackWindup === 0 && canActorsMelee(creature, hero)) {
        const attackSequence = creature.attackSequence;
        creature.attackSequence += 1;
        const block = resolveShieldBlock({
          combat: currentHeroCombat(),
          capabilities: hero.skillStudy
            ? deriveSkillCapabilities(hero.skills, { rankAdjustments: hero.skillStudy.rankAdjustments })
            : deriveSkillCapabilities(hero.skills),
          roll: shieldBlockRoll({
            seed: run.seed,
            depth: dungeon.depth,
            attackerId: creature.instanceId,
            attackSequence,
          }),
        });
        damageHero(creature.damage, { blocked: block.blocked, source: `wildlife:${creature.id}` });
      }
      occupied.add(currentKey);
      continue;
    }

    if (creature.hunted && creature.huntResponse === 'fight') {
      if (canActorsMelee(creature, hero)) {
        creature.wanderTarget = null;
        creature.route = [];
        if (creature.attackCooldown === 0) {
          creature.attackCooldown = 1 / creature.attackRate;
          creature.attackWindup = creature.windup;
          creature.attackTargetX = hero.x;
          creature.attackTargetY = hero.y;
          creature.facing = hero.x < creature.x ? -1 : 1;
        }
        occupied.add(currentKey);
        continue;
      }
      if (!creature.wanderTarget && creature.repathCooldown === 0) {
        creature.repathCooldown = 0.28;
        const blockedCells = new Set([...occupied, ...reserved]);
        blockedCells.delete(currentKey);
        blockedCells.delete(monsterCellKey(hero, TILE));
        creature.route = findPath(hero.x / TILE, hero.y / TILE, {
          allowHidden: true,
          start: { x: Math.floor(creature.x / TILE), y: Math.floor(creature.y / TILE) },
          blockedCells,
        });
        if (creature.route.length > 0) creature.route.pop();
        if (creature.route.length === 0) {
          const approach = meleeApproachPoint(creature, hero, TILE);
          if (approach) creature.route = [approach];
        }
        creature.wanderTarget = creature.route[0]
          ? {
              ...creature.route[0],
              gridX: Math.floor(creature.route[0].x / TILE),
              gridY: Math.floor(creature.route[0].y / TILE),
            }
          : null;
      }
    }

    if (creature.wanderTarget) {
      const targetKey = `${creature.wanderTarget.gridX},${creature.wanderTarget.gridY}`;
      if (
        !isWalkable(creature.wanderTarget.gridX, creature.wanderTarget.gridY) ||
        heroCells.has(targetKey) || occupied.has(targetKey) || reserved.has(targetKey)
      ) {
        creature.wanderTarget = null;
        creature.wanderCooldown = 0.3;
      } else {
        const dx = creature.wanderTarget.x - creature.x;
        const dy = creature.wanderTarget.y - creature.y;
        const distance = Math.hypot(dx, dy);
        const movementSpeed = creature.hunted ? creature.huntSpeed : creature.speed;
        const movement = Math.min(distance, delta * TILE * movementSpeed);
        let blocked = false;
        if (distance > 0 && movement > 0) {
          const next = constrainActorMovement({
            actor: creature,
            next: { x: creature.x + (dx / distance) * movement, y: creature.y + (dy / distance) * movement },
            blockers: [
              hero,
              ...monsters,
              ...passiveCreatures.filter((other) => other !== creature && !other.defeated),
              ...(typeof merchantDefinitions === 'undefined' ? [] : merchantDefinitions)
                .map((merchant) => ({ x: (merchant.x + 0.5) * TILE, y: (merchant.y + 0.5) * TILE })),
            ],
            tileSize: TILE,
          });
          creature.stride += Math.hypot(next.x - creature.x, next.y - creature.y) / TILE;
          creature.x = next.x;
          creature.y = next.y;
          creature.facing = dx < -0.1 ? -1 : dx > 0.1 ? 1 : creature.facing;
          blocked = next.blocked;
        }
        if (blocked) {
          creature.wanderTarget = null;
          creature.wanderCooldown = 0.3;
        } else if (distance <= movement + 0.001) {
          creature.x = creature.wanderTarget.x;
          creature.y = creature.wanderTarget.y;
          creature.wanderTarget = null;
          if (creature.route.length > 0) creature.route.shift();
          creature.wanderCooldown = passiveWanderPause(creature);
        } else {
          reserved.add(targetKey);
        }
      }
    }

    if (
      !creature.wanderTarget
      && creature.wanderCooldown === 0
      && !(creature.hunted && creature.huntResponse === 'fight')
    ) {
      const distanceToHero =
        Math.abs(Math.floor(creature.x / TILE) - heroCell.x) +
        Math.abs(Math.floor(creature.y / TILE) - heroCell.y);
      const target = choosePassiveWanderTarget({
        creature,
        grid: world,
        blockedCells: new Set([...occupied, ...reserved, ...heroCells]),
        avoidCell: creature.hunted || distanceToHero <= 2 ? heroCell : null,
        tileSize: TILE,
      });
      creature.wanderStep += 1;
      creature.wanderTarget = target;
      if (target) reserved.add(`${target.gridX},${target.gridY}`);
      else creature.wanderCooldown = passiveWanderPause(creature);
    }

    occupied.add(monsterCellKey(creature, TILE));
  }
}

function updateWorld(delta) {
  updateDoorOpening(delta);
  updateHeroTerrain();
  refreshVisibleSecrets();
  const cryomancyRank = typeof currentSkillCapabilities === 'function'
    ? currentSkillCapabilities().cryomancyRank ?? 0
    : 0;
  if (hero.dead) {
    deathTimer -= delta;
    if (deathTimer <= 0) showRunEndScreen('dead');
  }
  const occupiedCells = occupiedMonsterCells(monsters, TILE);
  for (const creature of passiveCreatures) {
    if (!creature.defeated) occupiedCells.add(monsterCellKey(creature, TILE));
  }
  const reservedCells = passiveOccupiedCells();
  for (const merchant of (typeof merchantDefinitions === 'undefined' ? [] : merchantDefinitions)) {
    reservedCells.add(`${merchant.x},${merchant.y}`);
  }
  for (const cell of blockingFindCells()) reservedCells.add(cell);
  if (!hero.dead && hero.path[0]) reservedCells.add(monsterCellKey(hero.path[0], TILE));
  const heroCellKey = monsterCellKey(hero, TILE);
  for (const monster of monsters) {
    const effectTick = tickActorEffects(monster.effects, delta);
    monster.effects = effectTick.effects;
    if (actorInWater(world, monster, TILE) && (monster.effects.wet ?? 0) < WATER_WET_REFRESH_BELOW) {
      monster.effects = applyActorEffect(monster.effects, 'wet', WATER_WET_DURATION).effects;
    }
    monster.hit = Math.max(0, monster.hit - delta);
    monster.attackRecovery = Math.max(0, monster.attackRecovery - delta);
    monster.alertFlash = Math.max(0, monster.alertFlash - delta);
    monster.attackCooldown = Math.max(0, monster.attackCooldown - delta);
    monster.repathCooldown = Math.max(0, monster.repathCooldown - delta);
    monster.alerted = Math.max(0, monster.alerted - delta);
    monster.movePulse = Math.max(0, (monster.movePulse ?? 0) - delta);
    monster.crowdPressure = Math.max(0, (monster.crowdPressure ?? 0) - delta);
    monster.trapStun = Math.max(0, (monster.trapStun ?? 0) - delta);
    monster.shieldStun = Math.max(0, (monster.shieldStun ?? 0) - delta);
    monster.spearGuardCooldown = Math.max(0, (monster.spearGuardCooldown ?? 0) - delta);
    monster.armorBreak = tickArmorBreak(monster.armorBreak, delta);
    const previousWindup = monster.attackWindup;
    monster.attackWindup = Math.max(0, monster.attackWindup - delta);
    if (monster.dead > 0) {
      monster.dead += delta;
      continue;
    }
    if (runStatus !== 'playing' || !playerHasActed) continue;
    if (monster.effects.frozen > 0) {
      monster.route = [];
      monster.crowdPressure = 0;
      monster.attackWindup = 0;
      monster.attackRecovery = Math.max(monster.attackRecovery, monster.effects.frozen);
      continue;
    }
    if (triggerPlacedTrapForMonster(monster)) continue;
    if (monster.trapStun > 0 || monster.shieldStun > 0) continue;
    if (isHeroConcealed()) {
      monster.alerted = 0;
      monster.route = [];
      monster.crowdPressure = 0;
      monster.attackWindup = 0;
      monster.attackRecovery = 0;
      continue;
    }
    if (previousWindup > 0) {
      if (monster.attackWindup === 0) {
        monster.attackRecovery = 0.18;
        if (canActorsMelee(monster, hero)) {
          const attackSequence = monster.attackSequence;
          monster.attackSequence += 1;
          const block = resolveShieldBlock({
            combat: currentHeroCombat(),
            capabilities: hero.skillStudy
              ? deriveSkillCapabilities(hero.skills, { rankAdjustments: hero.skillStudy.rankAdjustments })
              : deriveSkillCapabilities(hero.skills),
            roll: shieldBlockRoll({
              seed: run.seed,
              depth: dungeon.depth,
              attackerId: monster.instanceId,
              attackSequence,
            }),
          });
          const strikeDamage = Math.max(1, Math.round(monster.damage * terrainMeleeMultiplier({
            inWater: actorInWater(world, monster, TILE),
            terrain: monster.terrain,
          })));
          const hit = damageHero(strikeDamage, { blocked: block.blocked, source: monster.id });
          if (hit && monster.shock) shockWetActorsAround(monster);
            if (hit && monster.pull > 0) dragHeroToward(monster);
          if (block.stunSeconds > 0) {
            monster.shieldStun = Math.max(monster.shieldStun, block.stunSeconds);
            monster.attackRecovery = Math.max(monster.attackRecovery, block.stunSeconds);
            monster.hit = Math.max(monster.hit, 0.18);
            addCombatGlyph(monster.x, monster.y, '!', '#9ed2d0', -66);
          }
          const infliction = monsterInfliction(monster);
          if (hit && hit.damage > 0 && !hit.dead && infliction) {
            applyHeroStatus(infliction.id, infliction.duration);
          }
        } else {
          addImpactWave(
            monster.attackTargetX,
            monster.attackTargetY,
            '#798382',
            34,
            0,
          );
          addCombatGlyph(monster.attackTargetX, monster.attackTargetY, '!', '#899392');
          rewardHeroEvasion();
        }
      }
      continue;
    }
    const distanceToHero = Math.hypot(monster.x - hero.x, monster.y - hero.y);
    if (monsterSeesHero(monster, distanceToHero)) {
      if (monster.alerted === 0) {
        monster.alertFlash = 0.5;
        addCombatGlyph(monster.x, monster.y, '!', '#d8bd68', -68);
      }
      monster.alerted = monster.pursuit;
    }
    const patrolling = monster.alerted === 0;
    if (patrolling) {
      const patrolBlocked = new Set([...occupiedCells, ...reservedCells]);
      patrolBlocked.delete(monsterCellKey(monster, TILE));
      if (!patrolMonster(monster, delta, patrolBlocked)) continue;
    }
    if (!patrolling && canActorsMelee(monster, hero)) {
      monster.route = [];
      monster.crowdPressure = 0;
      if (monster.attackCooldown === 0) {
        monster.attackCooldown = 1 / monster.attackRate;
        monster.attackWindup = monster.windup;
        monster.attackTargetAngle = Math.atan2(hero.y - monster.y, hero.x - monster.x);
        monster.attackTargetX = hero.x;
        monster.attackTargetY = hero.y;
        monster.facing = hero.x < monster.x ? -1 : 1;
      }
      continue;
    }
    if (!patrolling && monster.repathCooldown === 0) {
      monster.repathCooldown = Math.max(0.14, 0.3 - monster.speed * 0.045) + (monster.phase % 0.06);
      const blockedCells = new Set([...occupiedCells, ...reservedCells]);
      blockedCells.delete(monsterCellKey(monster, TILE));
      blockedCells.delete(heroCellKey);
      monster.route = findPath(hero.x / TILE, hero.y / TILE, {
        allowHidden: true,
        start: { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) },
        blockedCells,
        terrain: monster.terrain,
      });
      if (monster.route.length > 0) monster.route.pop();
      if (monster.route.length === 0) {
        const approach = meleeApproachPoint(monster, hero, TILE);
        if (approach) monster.route = [approach];
      }
      if (monster.route.length === 0) {
        const pressureTarget = chooseCrowdPressureStep({
          monster,
          hero,
          grid: world,
          blockedCells,
          tileSize: TILE,
          step: monster.pressureStep ?? 0,
          previousCell: monster.pressurePreviousCell ?? null,
        });
        monster.pressureStep = (monster.pressureStep ?? 0) + 1;
        monster.crowdPressure = 0.32;
        monster.facing = hero.x < monster.x ? -1 : 1;
        if (pressureTarget) {
          monster.pressurePreviousCell = monsterCellKey(monster, TILE);
          monster.route = [pressureTarget];
        }
      } else {
        monster.crowdPressure = 0;
      }
    }
    const target = monster.route[0];
    if (!target) continue;
    if (
      !isWalkable(Math.floor(target.x / TILE), Math.floor(target.y / TILE)) ||
      (!hero.dead && monsterCellKey(target, TILE) === heroCellKey)
    ) {
      monster.route = [];
      monster.repathCooldown = 0;
      continue;
    }
    const dx = target.x - monster.x;
    const dy = target.y - monster.y;
    const distance = Math.hypot(dx, dy);
    const movement = Math.min(
      distance,
      delta * TILE * monster.speed * actorEffectModifiers(monster.effects, {
        cryomancyRank,
      }).moveSpeed * terrainSpeedMultiplier({ inWater: actorInWater(world, monster, TILE), terrain: monster.terrain }),
    );
    if (distance > 0 && movement > 0) {
      const proposed = {
        x: monster.x + (dx / distance) * movement,
        y: monster.y + (dy / distance) * movement,
      };
      if (!terrainAllowsCell(world, Math.floor(proposed.x / TILE), Math.floor(proposed.y / TILE), monster.terrain)) {
        monster.route = [];
        monster.repathCooldown = Math.min(monster.repathCooldown, 0.2);
        continue;
      }
      if (
        !canMonsterAdvance({
          monster,
          next: proposed,
          target,
          monsters,
          reservations: reservedCells,
          tileSize: TILE,
        })
      ) {
        monster.crowdPressure = Math.max(monster.crowdPressure, 0.24);
        monster.facing = hero.x < monster.x ? -1 : 1;
        monster.repathCooldown = Math.min(monster.repathCooldown, 0.16);
        continue;
      }
      const next = constrainActorMovement({
        actor: monster,
        next: proposed,
        blockers: [
          hero,
          ...monsters,
          ...passiveCreatures.filter((creature) => !creature.defeated),
          ...(typeof merchantDefinitions === 'undefined' ? [] : merchantDefinitions)
            .map((merchant) => ({ x: (merchant.x + 0.5) * TILE, y: (merchant.y + 0.5) * TILE })),
        ],
        tileSize: TILE,
      });
      const travelled = Math.hypot(next.x - monster.x, next.y - monster.y);
      const guardDistanceBefore = Math.hypot(monster.x - hero.x, monster.y - hero.y) / TILE;
      monster.x = next.x;
      monster.y = next.y;
      if (travelled > 0.01) {
        resolveSpearGuard(monster, guardDistanceBefore, Math.hypot(monster.x - hero.x, monster.y - hero.y) / TILE);
      }
      if (travelled > 0.01) {
        monster.stride = (monster.stride ?? 0) + travelled / TILE;
        monster.movePulse = 0.12;
      }
      monster.facing = dx < -0.1 ? -1 : dx > 0.1 ? 1 : monster.facing;
      if (next.blocked) {
        monster.crowdPressure = Math.max(monster.crowdPressure, 0.24);
        monster.route = [];
        monster.repathCooldown = Math.min(monster.repathCooldown, 0.16);
      } else {
        reservedCells.add(monsterCellKey(target, TILE));
      }
    }
    if (triggerPlacedTrapForMonster(monster)) continue;
    if (distance < 2.5) monster.route.shift();
  }
  updatePassiveCreatures(delta);
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index];
    projectile.life -= delta;
    const target = monsters.find(({ instanceId }) => instanceId === projectile.targetId)
      ?? passiveCreatures.find(({ instanceId, hunted, defeated }) =>
        instanceId === projectile.targetId && hunted && !defeated);
    if (
      !target
      || (target.actorKind === 'wildlife' ? target.defeated : target.dead > 0)
      || projectile.life <= 0
    ) {
      projectiles.splice(index, 1);
      continue;
    }
    const projectileCell = {
      x: Math.floor(projectile.x / TILE),
      y: Math.floor(projectile.y / TILE),
    };
    const targetCell = { x: Math.floor(target.x / TILE), y: Math.floor(target.y / TILE) };
    if (!hasLineOfSight(world, projectileCell, targetCell)) {
      projectiles.splice(index, 1);
      continue;
    }
    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const distance = Math.hypot(dx, dy);
    const movement = Math.min(distance, delta * projectile.speed);
    if (distance > 0) {
      projectile.x += (dx / distance) * movement;
      projectile.y += (dy / distance) * movement;
      projectile.angle = Math.atan2(dy, dx);
    }
    if (distance > movement + 8) continue;
    const cryomancy = projectile.spellId === 'frost-lance'
      ? cryomancyHitProfile({
          rank: projectile.cryomancyRank,
          effects: target.effects,
          baseChillDuration: projectile.status?.duration ?? 0,
        })
      : null;
    // Fire fizzles against anyone standing in water: half damage and a puff of steam.
    const targetWading = actorInWater(world, target, TILE);
    const projectileDamage = projectile.spellId === 'ember-bolt' && targetWading
      ? Math.max(1, Math.round(projectile.damage * WATER_FIRE_MULTIPLIER))
      : projectile.damage;
    if (projectile.spellId === 'ember-bolt' && targetWading) burst(target.x, target.y - 10, '#d9e6e8', 12);
    if (projectileDamage > 0) {
      damageMonster(target, projectileDamage, projectile.color, {
        style: projectile.style,
        projectile: true,
        sourceX: projectile.x,
        sourceY: projectile.y,
        vampiric: projectile.vampiric,
      });
    }
    if (projectileDamage > 0 && projectile.pierceTargets > 0) {
      const pierced = selectPiercedTargets({
        origin: { x: projectile.originX ?? projectile.x, y: projectile.originY ?? projectile.y },
        target,
        candidates: monsters,
        pierceTargets: projectile.pierceTargets,
        tolerance: TILE * 0.55,
        range: TILE * 4,
      });
      for (const behind of pierced) {
        addLightningArc(target, behind);
        damageMonster(behind, projectileDamage, projectile.color, {
          style: projectile.style,
          projectile: true,
          sourceX: target.x,
          sourceY: target.y,
          vampiric: projectile.vampiric,
        });
      }
    }
    if (projectile.status && (target.actorKind === 'wildlife' ? !target.defeated : target.dead === 0)) {
      const preparedEffects = cryomancy?.shatter
        ? createActorEffects({ ...target.effects, frozen: 0 })
        : target.effects;
      const applied = applyActorEffect(
        preparedEffects,
        projectile.status.id,
        cryomancy?.chillDuration ?? projectile.status.duration,
      );
      target.effects = applied.effects;
      if (cryomancy?.freezeDuration > 0) {
        target.effects = applyActorEffect(
          target.effects,
          'frozen',
          cryomancy.freezeDuration,
        ).effects;
        target.attackWindup = 0;
        target.attackRecovery = Math.max(target.attackRecovery ?? 0, cryomancy.freezeDuration);
      }
      target.route = [];
      target.repathCooldown = Math.max(target.repathCooldown ?? 0, 0.18);
      if (projectile.itemEffect && projectile.status.id === 'wet') {
        const steam = applied.reaction === 'steam';
        const color = steam ? '#c8d5d2' : ACTOR_EFFECTS.wet.color;
        burst(target.x, target.y - 8, color, steam ? 28 : 22);
        addImpactWave(target.x, target.y, color, steam ? 70 : 54, steam ? 2 : 1);
        addCombatGlyph(target.x, target.y, '≈', steam ? '#eef4ed' : '#baf3ef', -58);
      } else {
        burst(target.x, target.y - 8, '#8de0e5', 18);
        addImpactWave(target.x, target.y, '#73cbd6', 50, 1);
        addCombatGlyph(target.x, target.y, cryomancy?.freezeDuration > 0 ? '◆' : '❄', '#c8f7f3', -58);
      }
      persistRun();
    }
    if (cryomancy?.shatter) {
      const sourceCell = { x: Math.floor(target.x / TILE), y: Math.floor(target.y / TILE) };
      const nearbyCandidates = [
        ...monsters,
        ...passiveCreatures.filter(({ hunted, defeated }) => hunted && !defeated),
      ]
        .filter((candidate) => candidate !== target)
        .filter((candidate) => candidate.actorKind === 'wildlife' ? !candidate.defeated : candidate.dead === 0)
        .filter((candidate) => hasLineOfSight(world, sourceCell, {
          x: Math.floor(candidate.x / TILE),
          y: Math.floor(candidate.y / TILE),
        }));
      const shatterTargets = selectCryomancyShatterTargets({
        origin: target,
        candidates: nearbyCandidates,
        profile: cryomancy,
        tileSize: TILE,
      });
      const shatterDamage = cryomancyShatterDamage(projectile.damage, cryomancy);
      burst(target.x, target.y - 8, '#d9fffb', 34);
      addImpactWave(target.x, target.y - 8, '#8ee5e9', 86, 3);
      addCombatGlyph(target.x, target.y, '✦', '#ecfffc', -70);
      for (const candidate of shatterTargets) {
        damageMonster(candidate, shatterDamage, '#a9f2ef', {
          style: 'staff',
          projectile: true,
          sourceX: target.x,
          sourceY: target.y,
          vampiric: false,
        });
        burst(candidate.x, candidate.y - 8, '#bdeeea', 14);
      }
      persistRun();
    }
    if (projectile.spellId === 'storm-bolt') {
      const profile = stormChainProfile(projectile.stormMagicRank);
      const chainTargets = selectStormChainTargets({
        origin: target,
        candidates: monsters.filter((candidate) => candidate !== target && candidate.dead === 0),
        profile,
        tileSize: TILE,
        canLink: (from, to) => hasLineOfSight(world, {
          x: Math.floor(from.x / TILE),
          y: Math.floor(from.y / TILE),
        }, {
          x: Math.floor(to.x / TILE),
          y: Math.floor(to.y / TILE),
        }),
      });
      const chainDamage = stormChainDamage(projectile.damage, profile);
      let previous = { x: projectile.sourceX ?? projectile.x, y: projectile.sourceY ?? projectile.y };
      addLightningArc(previous, target);
      previous = target;
      burst(target.x, target.y - 8, '#bdf7ff', 20);
      addImpactWave(target.x, target.y - 8, '#79cfe8', 62, chainTargets.length > 0 ? 2 : 1);
      for (const candidate of chainTargets) {
        addLightningArc(previous, candidate);
        damageMonster(candidate, chainDamage, '#8fdff2', {
          style: 'staff',
          projectile: true,
          sourceX: previous.x,
          sourceY: previous.y,
          vampiric: false,
        });
        burst(candidate.x, candidate.y - 8, '#bdf7ff', 16);
        addImpactWave(candidate.x, candidate.y - 8, '#79cfe8', 46, 0);
        previous = candidate;
      }
      // Water conducts: everyone standing in the target's pool takes a share,
      // the hero included. Standing in the water you strike is the mistake.
      const conducted = selectWaterConductionTargets({
        grid: world,
        origin: target,
        actors: [...monsters, hero],
        tileSize: TILE,
        exclude: chainTargets,
      });
      const conductionDamage = Math.max(1, Math.round((projectile.damage * WATER_CONDUCTION_PERCENT) / 100));
      for (const victim of conducted) {
        addLightningArc(target, victim);
        if (victim === hero) {
          damageHero(conductionDamage, { direct: true, source: 'spell:storm' });
          addCombatGlyph(hero.x, hero.y, '⚡', '#bdf7ff', -70);
        } else {
          damageMonster(victim, conductionDamage, '#8fdff2', {
            style: 'staff',
            projectile: true,
            sourceX: target.x,
            sourceY: target.y,
            vampiric: false,
          });
        }
        burst(victim.x, victim.y - 8, '#bdf7ff', 12);
      }
      playStormCrackle(chainTargets.length + conducted.length);
      persistRun();
    }
    if (projectile.spellId === 'ember-bolt' && projectile.spread?.targets > 0) {
      const sourceCell = { x: Math.floor(target.x / TILE), y: Math.floor(target.y / TILE) };
      const nearby = [
        ...monsters,
        ...passiveCreatures.filter(({ hunted, defeated }) => hunted && !defeated),
      ]
        .filter((candidate) => candidate !== target)
        .filter((candidate) => candidate.actorKind === 'wildlife' ? !candidate.defeated : candidate.dead === 0)
        .filter((candidate) => Math.hypot(candidate.x - target.x, candidate.y - target.y) <= projectile.spread.radius * TILE)
        .filter((candidate) => hasLineOfSight(world, sourceCell, {
          x: Math.floor(candidate.x / TILE),
          y: Math.floor(candidate.y / TILE),
        }))
        .sort((left, right) => (
          Math.hypot(left.x - target.x, left.y - target.y)
          - Math.hypot(right.x - target.x, right.y - target.y)
        ))
        .slice(0, projectile.spread.targets);
      const spreadDamage = Math.max(1, Math.round(projectile.damage * projectile.spread.ratio));
      for (const candidate of nearby) {
        damageMonster(candidate, spreadDamage, '#d85d34', {
          style: 'staff',
          projectile: true,
          sourceX: target.x,
          sourceY: target.y,
          vampiric: false,
        });
        burst(candidate.x, candidate.y - 8, '#ed7945', 12);
      }
    }
    projectiles.splice(index, 1);
  }
  if (typeof lightningArcs !== 'undefined') {
    for (let index = lightningArcs.length - 1; index >= 0; index -= 1) {
      lightningArcs[index].life -= delta;
      if (lightningArcs[index].life <= 0) lightningArcs.splice(index, 1);
    }
  }
  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const spark = sparks[index];
    spark.life -= delta;
    spark.x += spark.vx * delta;
    spark.y += spark.vy * delta;
    spark.vx *= 0.92;
    spark.vy = spark.vy * 0.92 + 24 * delta;
    if (spark.life <= 0) sparks.splice(index, 1);
  }
  for (let index = bloodDrops.length - 1; index >= 0; index -= 1) {
    const drop = bloodDrops[index];
    drop.life -= delta;
    drop.x += drop.vx * delta;
    drop.y += drop.vy * delta;
    drop.vx *= 0.9;
    drop.vy = drop.vy * 0.91 + 92 * delta;
    if (drop.life <= 0) bloodDrops.splice(index, 1);
  }
  for (let index = combatGlyphs.length - 1; index >= 0; index -= 1) {
    combatGlyphs[index].life -= delta;
    if (combatGlyphs[index].life <= 0) combatGlyphs.splice(index, 1);
  }
  for (let index = impactWaves.length - 1; index >= 0; index -= 1) {
    impactWaves[index].life -= delta;
    if (impactWaves[index].life <= 0) impactWaves.splice(index, 1);
  }
  renderShake.amount = Math.max(0, renderShake.amount - delta * 15);
  const cameraEase = 1 - Math.exp(-delta * 5.4);
  camera.x += (hero.x - camera.x) * cameraEase;
  camera.y += (hero.y - camera.y) * cameraEase;
}

function render() {
  if (reducedMotion || renderShake.amount <= 0) {
    renderShake.x = 0;
    renderShake.y = 0;
  } else {
    renderShake.x = Math.round((Math.sin(elapsed * 91) * renderShake.amount) / 2) * 2;
    renderShake.y = Math.round((Math.cos(elapsed * 73) * renderShake.amount * 0.62) / 2) * 2;
  }
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  context.imageSmoothingEnabled = false;
  drawWorld();
  drawBloodStains();
  drawGroundMist(false);
  drawWallDrips();
  drawMotes(0);
  drawEnemyTelegraphs();
  drawLoot();
  drawEvents();
  drawProjectiles();
  const actors = [
    ...monsters.map((monster) => ({ kind: 'monster', monster, y: monster.y })),
    { kind: 'hero', y: hero.y },
  ].sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    if (actor.kind === 'hero') drawPlayer();
    if (actor.kind === 'monster') drawMonster(actor.monster);
  }
  drawHeroEffects();
  drawWaterlines();
  drawLightningArcs();
  drawHeroAttackTrail();
  drawBloodDrops();
  drawMotes(1);
  drawSparks();
  drawImpactWaves();
  drawLighting();
  drawFog();
  drawGroundMist(true);
  drawMotes(2);
  drawCombatGlyphs();
  drawVoidSky();
}

function animate(time) {
  const delta = Math.min(0.04, Math.max(0, (time - previousTime) / 1000));
  previousTime = time;
  elapsed += delta;
  if (!document.hidden && ready) {
    if (uiScreen === 'game') {
      if (hitStop > 0) {
        hitStop = Math.max(0, hitStop - delta);
      } else {
        updateHero(delta);
        if (hitStop === 0) updateWorld(delta);
      }
      updateOnboarding(time);
    }
    // Static overlays (bag, map, menu…) keep the last frame; live screens render
    // at most ~60 Hz so 120 Hz phones do not double the GPU work.
    const liveWorld = LIVE_WORLD_SCREENS.has(uiScreen);
    if ((liveWorld && time - lastRenderAt >= RENDER_INTERVAL_MS) || renderedScreen !== uiScreen) {
      render();
      lastRenderAt = time;
      renderedScreen = uiScreen;
    }
  }
  frameId = requestAnimationFrame(animate);
}

function routeHeroBesideCell(cellX, cellY) {
  const routes = [
    { x: cellX + 1, y: cellY },
    { x: cellX - 1, y: cellY },
    { x: cellX, y: cellY + 1 },
    { x: cellX, y: cellY - 1 },
  ]
    .filter(({ x, y }) => isWalkable(x, y) && revealed.has(`${x},${y}`))
    .map(({ x, y }) => findPath(x, y, {
      blockedCells: passiveOccupiedCells(),
      allowBlockedEnd: false,
    }))
    .filter((route) => route.length > 0)
    .sort((a, b) => a.length - b.length);
  return commitHeroPath(routes[0] ?? []);
}

function moveFromPointer(event) {
  if (
    event.button !== 0 ||
    !event.isPrimary ||
    !ready ||
    runStatus !== 'playing'
  ) {
    return;
  }
  if (uiScreen === 'trap-placement') {
    const target = dungeonWorld3D.unprojectGround(event.clientX, event.clientY);
    performTrapPlacement(Math.floor(target.x / TILE), Math.floor(target.y / TILE));
    return;
  }
  if (uiScreen === 'ability-targeting') {
    const target = dungeonWorld3D.unprojectGround(event.clientX, event.clientY);
    performAbilityTargetAtCell(Math.floor(target.x / TILE), Math.floor(target.y / TILE));
    return;
  }
  if (uiScreen !== 'game' || openingDoor) return;
  inputGesture += 1;
  const target = dungeonWorld3D.unprojectGround(event.clientX, event.clientY);
  const worldX = target.x / TILE;
  const worldY = target.y / TILE;
  const cellX = Math.floor(worldX);
  const cellY = Math.floor(worldY);
  const door = doorDefinitions.find(
    (candidate) => candidate.x === cellX && candidate.y === cellY,
  );
  const find = findDefinitions.find(
    (candidate) =>
      Math.floor(candidate.x / TILE) === cellX && Math.floor(candidate.y / TILE) === cellY,
  );
  const merchant = merchantDefinitions.find(
    (candidate) => candidate.x === cellX && candidate.y === cellY,
  );
  const trap = trapDefinitions.find(
    (candidate) =>
      candidate.x === cellX
      && candidate.y === cellY
      && detectedTrapIds.has(candidate.instanceId)
      && !run.floor.resolved.includes(candidate.eventId),
  );
  if (merchant && revealed.has(`${cellX},${cellY}`)) {
    const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
    const adjacent = Math.abs(heroCell.x - cellX) + Math.abs(heroCell.y - cellY) <= 1;
    if (adjacent) {
      openContextActions({ kind: 'merchant', value: merchant });
      return;
    }
    routeHeroBesideCell(cellX, cellY);
    return;
  }
  if (find && findIsInteractable(find) && revealed.has(`${cellX},${cellY}`)) {
    const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
    const adjacent = Math.abs(heroCell.x - cellX) + Math.abs(heroCell.y - cellY) <= 1;
    if (adjacent) {
      openContextActions({ kind: 'find', value: find });
      return;
    }
    routeHeroBesideCell(cellX, cellY);
    return;
  }
  if (trap && revealed.has(`${cellX},${cellY}`)) {
    const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
    const adjacent = Math.abs(heroCell.x - cellX) + Math.abs(heroCell.y - cellY) === 1;
    if (adjacent) {
      openContextActions({ kind: 'trap', value: trap });
      return;
    }
    routeHeroBesideCell(cellX, cellY);
    return;
  }
  if (door && revealed.has(`${door.x},${door.y}`)) {
    const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
    const distance = Math.abs(heroCell.x - door.x) + Math.abs(heroCell.y - door.y);
    const isOpen = run.floor.opened.includes(door.instanceId);
    if ((!isOpen && distance === 1) || (isOpen && distance <= 1)) {
      openContextActions({ kind: 'door', value: door });
      return;
    }
    routeHeroBesideCell(door.x, door.y);
    return;
  }
  const moved = requestHeroMove(worldX, worldY);
  showMoveMarker(event.clientX, event.clientY, moved);
}

async function loadImage(path) {
  if (!path) throw new Error('Missing preview asset path');
  const sprite = new Image();
  sprite.decoding = 'async';
  await new Promise((resolve, reject) => {
    sprite.addEventListener('load', resolve, { once: true });
    sprite.addEventListener(
      'error',
      (error) => reject(new Error(`Cannot load ${path}`, { cause: error })),
      { once: true },
    );
    sprite.src = assetUrl(path);
  });
  images.set(path, sprite);
  if (floorLootSpritePaths.has(path)) {
    const readback = document.createElement('canvas');
    readback.width = sprite.naturalWidth;
    readback.height = sprite.naturalHeight;
    const readbackContext = readback.getContext('2d', { willReadFrequently: true });
    readbackContext.imageSmoothingEnabled = false;
    readbackContext.drawImage(sprite, 0, 0);
    floorLootSpriteBounds.set(
      path,
      opaquePixelBounds(readbackContext.getImageData(0, 0, readback.width, readback.height)),
    );
  }
}

async function loadImageQueue(paths, concurrency = 48) {
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < paths.length) {
      const index = nextIndex;
      nextIndex += 1;
      await loadImage(paths[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, paths.length) }, worker));
}

async function initialize() {
  try {
    resize();
    updateGearUi();
    const uniquePaths = [...new Set(requiredPaths)];
    await loadImageQueue(uniquePaths);
    rebuildDungeonWorld3D();
    ready = true;
    discoverNearbyTraps({ feedback: false });
    sceneStartedAt = elapsed;
    if (!reducedMotion) {
      burst(hero.x, hero.y - 8, atmosphereThemeForDepth(dungeon.depth).heroLight, 18);
      addImpactWave(hero.x, hero.y - 8, atmosphereThemeForDepth(dungeon.depth).heroLight, 54, 0);
    }
    updateGearUi();
    renderPack();
    renderCharacterSheet();
    renderAppearanceEditor();
    updateSalvageUi();
    updateHud();
    renderMainMenu();
    startGameButton.disabled = false;
    editAppearanceButton.disabled = false;
    document.body.dataset.state = 'ready';
    status.querySelector('span').textContent = '';
    requestAnimationFrame(() => startGameButton.focus());
  } catch (error) {
    status.querySelector('span').textContent = 'LOAD';
    status.title = error.message;
    document.body.dataset.state = 'error';
  }
}

canvas.addEventListener('pointerdown', moveFromPointer);
moveControl.addEventListener('pointerdown', onMoveControlPointerDown);
moveControl.addEventListener('pointermove', onMoveControlPointerMove);
moveControl.addEventListener('pointerup', onMoveControlPointerEnd);
moveControl.addEventListener('pointercancel', onMoveControlPointerEnd);
moveControl.addEventListener('contextmenu', (event) => event.preventDefault());
for (const button of moveDirectionButtons) {
  button.addEventListener('click', (event) => {
    // Physical taps are committed exactly once on pointerup, including touch
    // browsers which suppress the synthetic click after preventDefault().
    if (event.detail > 0 || moveControlState.suppressClick) {
      event.preventDefault();
      return;
    }
    const direction = button.dataset.move;
    if (event.detail === 0) inputGesture += 1;
    queueDirectionalMove(direction);
    flashMoveControl(direction);
  });
}
for (const button of spellActionButtons) {
  button.addEventListener('click', () => castPreparedSpell(Number(button.dataset.spellSlot)));
}
cancelAbilityTargetingButton.addEventListener('click', () => closeAbilityTargeting());
window.addEventListener('resize', resize);
window.addEventListener('blur', () => clearMoveControl());
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyM' && !event.repeat && (uiScreen === 'game' || uiScreen === 'map')) {
    event.preventDefault();
    toggleFloorMap();
    return;
  }
  const spellHotkeys = { Digit1: 0, Digit2: 1, Digit3: 2 };
  if (uiScreen === 'game' && Object.hasOwn(spellHotkeys, event.code)) {
    event.preventDefault();
    if (!event.repeat) castPreparedSpell(spellHotkeys[event.code]);
    return;
  }
  const focusedDirection = event.target.closest?.('[data-move]')?.dataset.move;
  if ((event.code === 'Enter' || event.code === 'Space') && focusedDirection && uiScreen === 'game') {
    event.preventDefault();
    if (!event.repeat) inputGesture += 1;
    queueDirectionalMove(focusedDirection);
    flashMoveControl(focusedDirection);
    return;
  }
  if (event.code === 'Tab' && uiScreen === 'menu') {
    event.preventDefault();
    const controls = [
      startGameButton,
      editAppearanceButton,
      ...(!newRunFromMenuButton.hidden ? [newRunFromMenuButton] : []),
      ...mainMenuLanguageButtons,
      ...audioMenuButtons,
    ].filter((control) => !control.disabled);
    const currentIndex = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex].focus();
    return;
  }
  if (event.code === 'Tab' && uiScreen === 'appearance') {
    event.preventDefault();
    const controls = [closeAppearanceButton, ...appearanceCycleButtons, saveAppearanceButton];
    const currentIndex = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex].focus();
    return;
  }
  if (event.code === 'Tab' && uiScreen === 'restart-confirm') {
    event.preventDefault();
    const controls = [cancelNewRunButton, confirmNewRunButton];
    const currentIndex = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex].focus();
    return;
  }
  if (event.code === 'Tab' && uiScreen === 'character') {
    event.preventDefault();
    const controls = [
      closeCharacterSheetButton,
      characterSheetLanguageButton,
      ...characterSpells.querySelectorAll('button:not(:disabled)'),
      ...characterSkills.querySelectorAll('button:not(:disabled)'),
    ];
    const currentIndex = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex].focus();
    return;
  }
  if (event.code === 'Tab' && uiScreen === 'inventory' && itemDetailIsOpen()) {
    event.preventDefault();
    const controls = [closeItemDetailButton, itemDetailAction].filter(
      (control) => !control.disabled,
    );
    const currentIndex = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex].focus();
    return;
  }
  if (event.code === 'Tab' && uiScreen === 'context') {
    event.preventDefault();
    const controls = [
      closeContextActionsButton,
      ...contextActionList.querySelectorAll('button:not(:disabled)'),
    ];
    const currentIndex = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex].focus();
    return;
  }
  if (event.code === 'Tab' && uiScreen === 'merchant') {
    event.preventDefault();
    const controls = [
      closeMerchantShopButton,
      ...merchantShopTabButtons,
      ...merchantShopList.querySelectorAll('button:not(:disabled)'),
    ];
    const currentIndex = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex].focus();
    return;
  }
  if (event.code === 'Tab' && uiScreen === 'chest') {
    event.preventDefault();
    const controls = [
      ...chestStorageList.querySelectorAll('button:not(:disabled)'),
      ...chestBackpackList.querySelectorAll('button:not(:disabled)'),
      closeChestContainerButton,
    ];
    const currentIndex = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex].focus();
    return;
  }
  if (event.code === 'Tab' && uiScreen === 'trap-placement') {
    event.preventDefault();
    const controls = [
      ...trapPlacementTargets.querySelectorAll('button'),
      cancelTrapPlacementButton,
    ];
    const currentIndex = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex].focus();
    return;
  }
  if (event.code === 'Tab' && uiScreen === 'ability-targeting') {
    event.preventDefault();
    const controls = [
      ...abilityTargetingTargets.querySelectorAll('button'),
      cancelAbilityTargetingButton,
    ];
    const currentIndex = controls.indexOf(document.activeElement);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex].focus();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'inventory') {
    event.preventDefault();
    if (closeItemDetail()) return;
    closeInventory();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'character') {
    event.preventDefault();
    closeCharacterSheet();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'map') {
    event.preventDefault();
    closeFloorMap();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'context') {
    event.preventDefault();
    closeContextActions();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'merchant') {
    event.preventDefault();
    closeMerchantShop();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'chest') {
    event.preventDefault();
    closeChestContainerUi();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'trap-placement') {
    event.preventDefault();
    closeTrapPlacement({ returnToInventory: true });
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'ability-targeting') {
    event.preventDefault();
    closeAbilityTargeting();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'appearance') {
    event.preventDefault();
    closeAppearanceEditor();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'restart-confirm') {
    event.preventDefault();
    closeNewRunConfirm();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'menu' && menuMode === 'pause') {
    event.preventDefault();
    startGameFromMenu();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'game') {
    event.preventDefault();
    openMainMenu();
    return;
  }
  if (uiScreen !== 'game' || runStatus !== 'playing') return;
  if ((event.code === 'KeyE' || event.code === 'Space') && nearbyContextTarget()) {
    event.preventDefault();
    if (!event.repeat) openNearbyContextActions();
    return;
  }
  const directions = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
  };
  const direction = directions[event.code];
  if (!direction) return;
  event.preventDefault();
  if (!event.repeat) inputGesture += 1;
  queueDirectionalMove(direction);
  flashMoveControl(direction);
});
mainMenuLanguageButtons.forEach((button) => {
  button.addEventListener('click', () => setInterfaceLanguage(button.dataset.language));
});
startGameButton.addEventListener('click', startGameFromMenu);
pauseGameButton.addEventListener('click', openMainMenu);
editAppearanceButton.addEventListener('click', openAppearanceEditor);
closeAppearanceButton.addEventListener('click', () => closeAppearanceEditor());
appearanceEditor.addEventListener('pointerdown', (event) => {
  if (event.target === appearanceEditor) closeAppearanceEditor();
});
for (const button of appearanceCycleButtons) {
  button.addEventListener('click', () => cycleAppearance(
    button.dataset.appearanceKind,
    Number(button.dataset.appearanceStep),
  ));
}
saveAppearanceButton.addEventListener('click', () => closeAppearanceEditor({ save: true }));
newRunFromMenuButton.addEventListener('click', openNewRunConfirm);
cancelNewRunButton.addEventListener('click', closeNewRunConfirm);
confirmNewRunButton.addEventListener('click', confirmNewRun);
characterSheetButton.addEventListener('click', openCharacterSheet);
closeCharacterSheetButton.addEventListener('click', closeCharacterSheet);
depthBadge.addEventListener('click', openFloorMap);
onboardingDismissButton.addEventListener('click', dismissOnboardingHint);
onboardingSkipButton.addEventListener('click', skipOnboarding);
audioMuteButton.addEventListener('click', () => {
  unlockLevelUpAudio();
  audioSettings = toggleAudioMute(audioSettings);
  applyAudioSettings();
  playSound('ui-tap');
});
audioVolumeDownButton.addEventListener('click', () => {
  unlockLevelUpAudio();
  audioSettings = adjustAudioVolume(audioSettings, -AUDIO_VOLUME_STEP);
  applyAudioSettings();
  playSound('ui-tap');
});
audioVolumeUpButton.addEventListener('click', () => {
  unlockLevelUpAudio();
  audioSettings = adjustAudioVolume(audioSettings, AUDIO_VOLUME_STEP);
  applyAudioSettings();
  playSound('ui-tap');
});
closeFloorMapButton.addEventListener('click', () => closeFloorMap());
floorMapCenterButton.addEventListener('click', centerFloorMapOnHero);
floorMapZoomInButton.addEventListener('click', () => zoomFloorMapBy(FLOOR_MAP_ZOOM.factor));
floorMapZoomOutButton.addEventListener('click', () => zoomFloorMapBy(1 / FLOOR_MAP_ZOOM.factor));
floorMapCanvas.addEventListener('pointerdown', floorMapPointerDown);
floorMapCanvas.addEventListener('pointermove', floorMapPointerMove);
floorMapCanvas.addEventListener('pointerup', floorMapPointerUp);
floorMapCanvas.addEventListener('pointercancel', floorMapPointerUp);
floorMapCanvas.addEventListener('wheel', floorMapWheel, { passive: false });
window.addEventListener('resize', () => {
  if (uiScreen === 'map') drawFloorMap();
});
characterSheet.addEventListener('pointerdown', (event) => {
  if (event.target === characterSheet) closeCharacterSheet();
});
characterSheetLanguageButton.addEventListener('click', () => {
  setInterfaceLanguage(itemDetailLanguage === 'ru' ? 'en' : 'ru');
});
bagButton.addEventListener('click', openInventory);
interactActionButton.addEventListener('click', openNearbyContextActions);
closeMerchantShopButton.addEventListener('click', closeMerchantShop);
closeChestContainerButton.addEventListener('click', closeChestContainerUi);
chestContainer.addEventListener('pointerdown', (event) => {
  if (event.target === chestContainer) closeChestContainerUi();
});
merchantShopTabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    merchantTab = button.dataset.merchantTab;
    merchantShopFeedback.textContent = '';
    renderMerchantShop();
    requestAnimationFrame(() => merchantShopList.querySelector('button:not(:disabled)')?.focus());
  });
});
closeInventoryButton.addEventListener('click', closeInventory);
inventoryViewButtons.forEach((button) => {
  button.addEventListener('click', () => setInventoryView(button.dataset.packView));
});
inventoryFilterButtons.forEach((button) => {
  button.addEventListener('click', () => setInventoryFilter(button.dataset.inventoryFilter));
});
closeItemDetailButton.addEventListener('click', () => closeItemDetail());
itemDetail.addEventListener('pointerdown', (event) => {
  if (event.target === itemDetail) closeItemDetail();
});
inventory.addEventListener('pointerdown', (event) => {
  if (event.target === inventory) closeInventory();
});
itemDetailAction.addEventListener('click', () => performSelectedItemAction({ fromDetail: true }));
salvageButton.addEventListener('click', () => {
  salvageMode = !salvageMode;
  if (salvageMode && inventoryFilter === 'equipped') {
    inventoryFilter = 'all';
    updateInventoryFilterUi();
  }
  markedForSalvage.clear();
  updateSalvageUi();
  renderPack();
});
salvageConfirm.addEventListener('click', () => {
  if (markedForSalvage.size === 0) return;
  const uids = [...markedForSalvage].map((index) => backpackItems[index]?.uid).filter(Boolean);
  const result = salvageInventoryItems(currentItemState(), uids);
  if (!result.ok) return;
  applyItemState(result.state);
  gold += result.reward;
  currencyValue.textContent = String(gold);
  currency.setAttribute(
    'aria-label',
    `${currentMainMenuModel().labels.gold}: ${gold}`,
  );
  markedForSalvage.clear();
  salvageMode = false;
  updateSalvageUi();
  renderPack();
  showLootToast({ icon: 'item/gold/16.png', rarity: 1 }, result.reward);
  persistRun();
});
restartRunButton.addEventListener('click', restartRun);
sanctuaryAction.addEventListener('click', healAtSanctuary);
closeContextActionsButton.addEventListener('click', () => closeContextActions({ restoreFocus: true }));
contextActionBackdrop.addEventListener('click', () => closeContextActions());
cancelTrapPlacementButton.addEventListener('click', () => closeTrapPlacement({ returnToInventory: true }));
window.addEventListener('pagehide', () => {
  clearLevelUpCelebration();
  persistRun();
  cancelAnimationFrame(frameId);
  frameId = 0;
});
window.addEventListener('pageshow', () => {
  if (frameId !== 0) return;
  previousTime = performance.now();
  frameId = requestAnimationFrame(animate);
});

frameId = requestAnimationFrame(animate);
initialize();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('../sw.js', document.baseURI)).catch(() => {
      // Offline support is optional; a registration failure must not block play.
    });
  });
}
