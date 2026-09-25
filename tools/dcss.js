import { canCloseDoor } from './dcss-rpg-doors.js';
import {
  ARTIFACT_PATH,
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
  adoptRun,
  advanceRunFloor,
  retreatRunFloor,
  enterBranchThroughGate,
  switchRunBranch,
  travelRunToDepth,
  createRun,
  findGridPath,
  generateDungeon,
  hasLineOfSight,
  hydrateDungeon,
  guardianRemembered,
  rememberGuardian,
  migrateLegacyRun,
  revealAround,
  rollBonesReward,
  validateRun,
} from './dcss-rpg-core.js';
import { creditsModel } from './dcss-rpg-credits.js';
import { helpModel } from './dcss-rpg-help.js';
import { floorArrivalModel } from './dcss-rpg-floor-arrival.js';
import { calmRecovery } from './dcss-rpg-recovery.js';
import {
  DISPLAY_SETTINGS_KEY,
  createDisplaySettings,
  displayMenuModel,
  stepBrightness,
} from './dcss-rpg-display.js';
import {
  HERO_BASE_MOVE_SPEED,
  canMonsterAdvance,
  canWeaponAttack,
  EQUIPMENT_SLOTS,
  REACH_STYLES,
  combatDamage,
  createMonsterStates,
  deriveHeroStats,
  allowedSlotsForItem,
  equipInventoryItem,
  isTwoHandedItem,
  monsterCellKey,
  occupiedMonsterCells,
  resolveHeroDamage,
  resolveWeaponLoadout,
  salvageInventoryItems,
  unequipItem,
  weaponCombatProfile,
} from './dcss-rpg-rules.js';
import {
  DEEPEST_DEPTH,
  roadEndingAt,
  SANCTUARY_HEAL,
  canClaimFinalArtifact,
  canLeaveDungeonFloor,
  canRetireRun,
  chapterGuardianForDepth,
  isTerminalRunStatus,
  goldRewardForMonster,
  sanctuaryReady,
  useSanctuary,
} from './dcss-rpg-run.js';
import {
  CREATION_SKILL_POINTS,
  adjustBuildAttribute,
  buildScreenModel,
  createArchetypeBuild,
  createEmptyBuild,
  toggleBuildSkill,
} from './dcss-rpg-character-creation.js';
import {
  PARLEY_SOUL_POWER,
  PARLEY_WARES,
  PARLEY_SOUL_PRIZE,
  parleyFor,
  parleyModel,
  parleyRoll,
  resolveParley,
} from './dcss-rpg-parley.js';
import { canRespec, respecHero } from './dcss-rpg-respec.js';
import { dropForMonster } from './dcss-rpg-drops.js';
import {
  DOUBLE_MONSTER_ID,
  REVIVING_MONSTER_ID,
  THIEF_MONSTER_ID,
} from './dcss-rpg-rare-encounters.js';
import { claimTrophy, trophyCopy, trophyModel } from './dcss-rpg-trophies.js';
import { feedbackCopy, feedbackFor, formatDeltas, parleyFeedbackKind } from './dcss-rpg-feedback.js';
import {
  STASH_KEY,
  createStashState,
  parseStash,
  serializeStash,
  stashBuy,
  stashDeposit,
  stashEarned,
  stashModel,
  stashCopy,
  stashOutfit,
  stashReturn,
} from './dcss-rpg-stash.js';
import {
  composePlayerLayerStack,
} from './dcss-rpg-player.js';
import {
  equipmentVisualForItem,
  itemSpriteVariants,
} from './dcss-rpg-equipment-visuals.js';
import { floorPicture, itemPicture } from './dcss-rpg-item-picture.js';
import {
  PLAYER_BEARD_OPTIONS,
  PLAYER_BODY_OPTIONS,
  PLAYER_HAIR_OPTIONS,
  cyclePlayerAppearance,
  loadPlayerAppearance,
  playerAppearancePosition,
  playerVoice,
  resolvePlayerAppearance,
  savePlayerAppearance,
} from './dcss-rpg-appearance.js';
import {
  atmosphereThemeFor,
  BUILT_WALLS,
  HEWN_WALLS,
  biomeThemeFor,
  sceneryOpacity,
  thicketProps,
  WATER_BED,
  waterTiles,
  BLOOD_FLOOR_PATHS,
  chapterWeather,
  deterministicAtmosphereMote,
  fogAnchorsForDungeon,
  PIXEL_EFFECT_SCALE,
  VISIBILITY_TUNING,
  combatGlyphDrift,
  fogTileOpacity,
} from './dcss-rpg-visuals.js';
import { itemPresentation } from './dcss-rpg-item-details.js';
import { fittedSpriteRect, opaquePixelBounds } from './dcss-rpg-item-sprites.js';
import {
  chooseTarget,
  createPadState,
  padDpadDirection,
  padReport,
  padStickDirection,
  readPad,
} from './dcss-rpg-gamepad.js';
import {
  ghostSpeech,
  graveyardCopy,
  graveyardOnFloor,
  graveyardRoomIndex,
} from './dcss-rpg-graveyard.js';
import { materializeItemAffixes } from './dcss-rpg-affixes.js';
import { materializeProceduralArtifact } from './dcss-rpg-artifacts.js';
import { INVENTORY_FILTERS, inventoryControlsUseful, inventorySections } from './dcss-rpg-inventory-ui.js';
import { characterSheetModel } from './dcss-rpg-character-sheet.js';
import {
  cloneSkillState,
  createSkillState,
  deriveSkillCapabilities,
  effectiveSkillRank,
  learnSkill,
} from './dcss-rpg-skills.js';
import { skillById } from './dcss-rpg-skill-content.js';
import { activeDetectedTrapCells, discoverTraps, trapsFromDungeon } from './dcss-rpg-traps.js';
import {
  DISARMED_TRAP_PATH,
  DISARM_TOOL_ITEM_ID,
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
import {
  SHOWREEL_SCENES,
  showreelCameraAt,
  showreelCameraPath,
  showreelFrame,
} from './dcss-rpg-menu-showreel.js';
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
  WORLD_CAMERA_ELEVATION,
  WORLD_WALL_HEIGHT,
  createDungeonWorld3D,
} from './dcss-rpg-world3d.js';
import {
  createDungeonEnvironment,
} from './dcss-rpg-environment.js';
import { cellStepDistance, neighbouringCells } from './dcss-rpg-geometry.js';
import {
  AMBIENT_SCENES,
  ambientActors,
  ambientLightScale,
  ambientLine,
  ambientPhaseAt,
  ambientSceneById,
  ambientSeenModel,
  ambientSmokeScale,
  scheduleAmbientScene,
} from './dcss-rpg-ambient.js';
import {
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
  floorMapLegend,
  floorMapTapAction,
  panFloorMapView,
  zoomFloorMapView,
} from './dcss-rpg-floor-map.js';
import { runEndSourceName, runSummaryModel } from './dcss-rpg-run-summary.js';
import {
  META_KEY,
  createMetaState,
  metaCopy,
  metaModel,
  parseMeta,
  forgetBones,
  recordBones,
  recordRunResult,
  rememberScene,
  serializeMeta,
} from './dcss-rpg-meta.js';
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
import { resolveRangedShot } from './dcss-rpg-ranged.js';
import { materialFilter } from './dcss-rpg-materials.js';
import {
  bonesCopy,
  bonesForDepth,
  bonesKey,
  bonesPlacement,
  ghostStats,
  ghostWakes,
} from './dcss-rpg-bones.js';
import { SURFACE_LIGHT_MULTIPLIER, SURFACE_REVEAL_RADIUS } from './dcss-rpg-surface-plan.js';
import { conditionCopy, conditionEffects } from './dcss-rpg-conditions.js';
import {
  armourProfile,
  focusedCooldown,
  frugalHungerSeconds,
  thornsDamage,
} from './dcss-rpg-armour.js';
import { whipCopy, whipProfile, whipPull } from './dcss-rpg-whips.js';
import { channelSpellCooldowns, staffProfile } from './dcss-rpg-staves.js';
import { dodgeSpeedMultiplier, mobilityProfile, refreshDodgeBoost, tickDodgeBoost } from './dcss-rpg-mobility.js';
import {
  HERO_SIGHT_RADIUS,
  discoverSecrets,
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
  MINION_FOLLOW_DISTANCE,
  isMinionSpell,
  minionBlueprint,
  minionCopy,
  minionIntent,
  minionStats,
  necromancyProfile,
} from './dcss-rpg-minions.js';
import {
  bandageRefusalText,
  fieldMedicineProfile,
  resolveBandage,
} from './dcss-rpg-field-medicine.js';
import {
  hireMercenary,
  mercenaryById,
  mercenaryCopy,
  isMercenary,
  mercenaryModel,
  mercenaryName,
} from './dcss-rpg-mercenaries.js';
import {
  TAVERN_FLOOR_PATHS,
  bedOffer,
  buyTavernFood,
  tavernMenuModel,
  mercenaryIdForHireMonster,
  tavernFloorCells,
  tavernHireMonsterId,
} from './dcss-rpg-tavern.js';
import {
  boundSlots,
  curseCopy,
  templeOffer,
  unbindItem,
} from './dcss-rpg-curse.js';
import {
  PORTAL_PATH,
  canOpenPortal,
  createPortalState,
  openPortalAt,
  portalCopy,
} from './dcss-rpg-portal.js';
import {
  CITY_CAPTAIN_ID,
  CITY_DEPTH,
  CITY_DEPTHS,
  CITY_LIGHT_MULTIPLIER,
  CITY_BROKER_ID,
  CITY_PRIEST_ID,
  cityInteriorAt,
  CITY_GATE_PATHS,
  CITY_GREEN_PATHS,
  cityGreenCells,
  cityInteriorFloorCells,
  cityPortalCell,
  CITY_RECRUITER_ID,
  CITY_REVEAL_RADIUS,
  cityDepartureCell,
  isCityDepth,
} from './dcss-rpg-city.js';
import {
  cleansingProfile,
  cleansingReport,
  resolveCleansing,
} from './dcss-rpg-cleansing.js';
import {
  arcanaProfile,
  scrollVariant,
  scrollVariantLabel,
} from './dcss-rpg-scrolls.js';
import {
  TAME_FOOD_IDS,

  canTame,
  createCompanionParty,
  companionName,
  companionRefusalText,
  companionStats,
  tameCreature,
  tamingProfile,
} from './dcss-rpg-companions.js';
import {
  craftingCopy,
  salvageProfile,
  salvageYield,
} from './dcss-rpg-crafting.js';
import {
  arrestHero,
  breakOut,
  canPickCell,
  crimeFine,
  crimeRefusalText,
  isWanted,
  payFine,
  recordCrime,
  serveSentence,
  wantedLabel,
} from './dcss-rpg-crime.js';
import {
  HOME_STONE_ITEM_ID,
  HOUSE_FURNITURE,
  HOUSE_PRICE,
  HOUSE_SAFE_DISTANCE,
  buyHouse,
  canBuyHouse,
  canInstallFurniture,
  houseArrivalCell,
  houseRefusalText,
  houseSlots,
  installFurniture,
  resolveHouseRest,
  returnFromHouse,
  travelHome,
} from './dcss-rpg-house.js';
import {
  CAMP_BEDROLL_PATH,
  CAMP_CHEST_PATH,
  CAMP_FIRE_FRAMES,
  CAMP_FIRE_OUT_PATH,
  CAMP_KIT_ITEM_ID,
  CAMP_STASH_CONTAINER_ID,
  burnCampFire,
  campFireBurning,
  campProfile,
  campRefusalText,
  canPitchCamp,
  createCampState,
  resolveCampRest,
  summonedCampProfile,
} from './dcss-rpg-camp.js';
import {
  ATTRIBUTE_BASE,
  ATTRIBUTE_COPY,
  ATTRIBUTE_IDS,
  attributeCopy,
  attributeRefusalText,
  cloneAttributeState,
  createAttributeGifts,
  createAttributeState,
  raiseAttribute,
} from './dcss-rpg-attributes.js';
import { BRANCH_GATES, BRANCH_STAIRS, branchGateCopy, branchRune } from './dcss-rpg-branch-gates.js';
import {
  CHASM_CELL,
  CHASM_FALL_PERCENT,
  chasmCopy,
  chasmFallFloors,
  chasmLandingCell as pickChasmLanding,
} from './dcss-rpg-chasm.js';
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
  ONBOARDING_ENABLED,
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
  musicMenuModel,
  musicSample,
  adjustMusicVolume,
  audioMenuModel,
  effectiveMusicVolume,
  effectiveVolume,
  parseAudioSettings,
  heroVoiceSound,
  pickSampleFile,
  serializeAudioSettings,
  soundSample,
  toggleAudioMute,
  toggleMusicMute,
} from './dcss-rpg-audio.js';
import {
  MERCHANT_COMMANDS,
  buybackMerchantItem,
  buyMerchantItem,
  merchantActorPath,
  merchantPresentation,
  merchantSellPrice,
  merchantStateFor,
  sellMerchantItem,
} from './dcss-rpg-merchant.js';
import { CHEST_RESOURCE_IDS, chestVisualFrames } from './dcss-rpg-chests.js';
import {
  CHEST_CONTAINER_CAPACITY,
  CHEST_CONTAINER_COMMANDS,
  backpackCapacity,
  openChestContainer as openChestContainerState,
  storeChestItem,
  takeChestGold,
  takeChestItem,
} from './dcss-rpg-chest-containers.js';
import {
  PLAYER_BAIT_KIND,
  PLAYER_BAIT_PATH,
  PLAYER_TRAP_ITEM_ID,
  PLAYER_TRAP_KIND,
  PLAYER_TRAP_PATH,
  placePlayerTrap,
  playerTrapPlacementCells,
  triggerPlayerTrap,
} from './dcss-rpg-player-traps.js';
import {
  POISON_BAIT_ITEM_ID,
  POISON_VIAL_ITEM_ID,
  coatWeapon,
  poisonProfile,
  poisonRefusalText,
  spendCoating,
} from './dcss-rpg-poisoncraft.js';
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
  BRAND_SECONDS,
  SUNDER_PERCENT,
  SUNDER_SECONDS,
  SWIFT_STEP_PERCENT,
  CLAMOUR_MULTIPLIER,
  wardActorEffects,
  INVISIBILITY_REVEAL_SECONDS,
  resolveKillRecovery,
  resolveVampiricRecovery,
  vampiricBudget,
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
  readSkillBook,
} from './dcss-rpg-books.js';
import {
  SPELL_SCHOOL_IDS,
  createSpellState,
  knownSpellModel,
  spellIdsForRanks,
  prepareSpell,
  pyromancySpreadProfile,
  spellBarModel,
  spellById,
  spellDamage,
  spellHealing,
  ICE_ARMOUR_SOAK,
  TARGETED_SPELL_KINDS,
  shareLifeAmount,
  spellMagic,
  spellSelfCost,
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
  choosePassiveWanderTarget,
  createPassiveCreatureStates,
  passiveWanderPause,
} from './dcss-rpg-passive.js';
import {
  HUNGER_COST,
  HUNGER_TUNING,
  advanceHunger,
  canEatNow,
  hungerCopy,
  starvationToll,
  consumeFood,
  hungerPresentation,
  hungerStage,
} from './dcss-rpg-hunger.js';
import {
  REST_MAX,
  advanceRest,
  canSpendSkillPoints,
  restCopy,
  restPresentation,
  restStage,
  sleep,
  validateRest,
} from './dcss-rpg-rest.js';
import { createGameCommand } from './dcss-rpg-game-commands.js';
import {
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
const menuBackdrop = document.querySelector('#menu-backdrop');
const mainMenu = document.querySelector('#main-menu');
const mainMenuTitle = document.querySelector('#main-menu-title');
const mainMenuLanguages = document.querySelector('#main-menu-languages');
const mainMenuLanguageButtons = [...mainMenuLanguages.querySelectorAll('[data-language]')];
const mainMenuAudio = document.querySelector('#main-menu-audio');
const audioMuteButton = document.querySelector('#audio-mute');
const audioVolumeDownButton = document.querySelector('#audio-volume-down');
const audioVolumeUpButton = document.querySelector('#audio-volume-up');
const audioVolumeValue = document.querySelector('#audio-volume-value');
const mainMenuMusic = document.querySelector('#main-menu-music');
const musicMuteButton = document.querySelector('#music-mute');
const musicVolumeDownButton = document.querySelector('#music-volume-down');
const musicVolumeUpButton = document.querySelector('#music-volume-up');
const musicVolumeValue = document.querySelector('#music-volume-value');
const audioMenuButtons = [
  audioMuteButton, audioVolumeDownButton, audioVolumeUpButton,
  musicMuteButton, musicVolumeDownButton, musicVolumeUpButton,
];
const startGameButton = document.querySelector('#start-game');
const startGameLabel = document.querySelector('#start-game-label');
const mainMenuHint = document.querySelector('#main-menu-hint');
const menuConditions = document.querySelector('#main-menu-conditions');
const appVersionLabel = document.querySelector('#app-version');
const feedbackLink = document.querySelector('#feedback-link');
const mainMenuState = document.querySelector('#main-menu-state');
const editAppearanceButton = document.querySelector('#edit-appearance');
const editAppearanceLabel = document.querySelector('#edit-appearance-label');
const menuAppearanceIcon = document.querySelector('#menu-appearance-icon');
const startGameDetail = document.querySelector('#start-game-detail');
const newRunFromMenuButton = document.querySelector('#restart-from-menu');
const characterCreation = document.querySelector('#character-creation');
const creationArchetypes = document.querySelector('#creation-archetypes');
const confirmCreationLabel = document.querySelector('#confirm-creation-label');
const creationAttributesTitle = document.querySelector('#creation-attributes-title');
const creationSkillsTitle = document.querySelector('#creation-skills-title');
const creationAttributeRows = document.querySelector('#creation-attribute-rows');
const creationAttributePoints = document.querySelector('#creation-attribute-points');
const creationSkillGroups = document.querySelector('#creation-skill-groups');
const creationSkillPoints = document.querySelector('#creation-skill-points');
const creationSkillDetail = document.querySelector('#creation-skill-detail');
const creationSkillDetailName = document.querySelector('#creation-skill-detail-name');
const creationSkillDetailBranch = document.querySelector('#creation-skill-detail-branch');
const creationSkillDetailText = document.querySelector('#creation-skill-detail-text');
const creationSkillLadder = document.querySelector('#creation-skill-ladder');
const creationSkillDetailNext = document.querySelector('#creation-skill-detail-next');
const creationSkillTake = document.querySelector('#creation-skill-take');
const creationSkillClose = document.querySelector('#creation-skill-close');
const creationCard = document.querySelector('.character-creation-card');
const creationOwnButton = document.querySelector('#creation-open-custom');
const creationHint = document.querySelector('#character-creation-hint');
const cancelCreationButton = document.querySelector('#cancel-creation');
const confirmCreationButton = document.querySelector('#confirm-creation');
const newRunFromMenuLabel = document.querySelector('#restart-from-menu-label');
const newRunFromMenuDetail = document.querySelector('#restart-from-menu-detail');
const appearanceEditor = document.querySelector('#appearance-editor');
const closeAppearanceButton = document.querySelector('#close-appearance');
const appearanceEditorTitle = document.querySelector('#appearance-editor-title');
const appearancePaperdoll = document.querySelector('#appearance-paperdoll');
const appearancePaperContext = appearancePaperdoll.getContext('2d');
const appearanceBodyLabel = document.querySelector('#appearance-body-label');
const appearanceHairLabel = document.querySelector('#appearance-hair-label');
const appearanceBodyValue = document.querySelector('#appearance-body-value');
const appearanceHairValue = document.querySelector('#appearance-hair-value');
const appearanceBeardValue = document.querySelector('#appearance-beard-value');
const appearanceBeardLabel = document.querySelector('#appearance-beard-label');
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
const characterAttributes = document.querySelector('#character-attributes');
const characterAttributeTitle = document.querySelector('#character-attributes-title');
const characterAttributePoints = document.querySelector('#character-attribute-points');
const characterAttributeRows = document.querySelector('#character-attribute-rows');
const characterSkillPoints = document.querySelector('#character-skill-points');
const characterSkillGroups = document.querySelector('#character-skill-groups');
const characterSkillLadder = document.querySelector('#character-skill-ladder');
/** Подписи лестницы приходят из модели навыков — слова принадлежат правилам. */
let skillLadderCopy = { rank: 'Ранг', level: 'ур.' };
const characterSkillDetail = document.querySelector('#character-skill-detail');
const characterSkillDetailName = document.querySelector('#character-skill-detail-name');
const characterSkillDetailBranch = document.querySelector('#character-skill-detail-branch');
const characterSkillDetailText = document.querySelector('#character-skill-detail-text');
const characterSkillDetailNext = document.querySelector('#character-skill-detail-next');
const characterSkillDetailCost = document.querySelector('#character-skill-detail-cost');
const characterSkillLearn = document.querySelector('#character-skill-learn');
const characterSkillCancel = document.querySelector('#character-skill-cancel');
const characterSpells = document.querySelector('#character-spells');
const characterSpellsTitle = document.querySelector('#character-spells-title');
const characterSpellsHint = document.querySelector('#character-spells-hint');
const characterSpellsIntelligence = document.querySelector('#character-spells-intelligence');
const characterSpellSlots = document.querySelector('#character-spell-slots');
const characterKnownSpells = document.querySelector('#character-known-spells');
const characterPaperdoll = document.querySelector('#character-paperdoll');
const characterPaperContext = characterPaperdoll.getContext('2d');
const characterIdentity = characterSheet.querySelector('.character-identity');
const openPortalButton = document.querySelector('#open-portal');
const frameFailureBanner = document.querySelector('#frame-failure');
const frameFailureText = document.querySelector('#frame-failure-text');
const frameFailureClose = document.querySelector('#frame-failure-close');
frameFailureClose?.addEventListener('click', () => { frameFailureBanner.hidden = true; });
const moveControl = document.querySelector('#move-control');
const moveStick = document.querySelector('#move-stick');
const moveDirectionButtons = [...moveControl.querySelectorAll('[data-move]')];
const moveMarker = document.querySelector('#move-marker');
const spellBar = document.querySelector('#spell-bar');
const spellActionButtons = [...spellBar.querySelectorAll('[data-spell-slot]')];
const bagButton = document.querySelector('#bag');
const interactActions = document.querySelector('#interact-actions');
/**
 * Геймпад для одиночной игры.
 *
 * Иван играет в это и на телевизоре: с полутора метров пальцем по экрану не
 * потыкаешь, а пад в руке — привычнее мыши. Раскладка PlayStation, потому что
 * геймпады у него эти; Chrome отдаёт DualShock 4 и DualSense одинаково
 * «стандартными», так что таблица одна на обе приставки.
 */
const heroPad = createPadState();
/** Пауза после выданного шага: спасает от спама, когда впереди стена и путь
 *  остаётся пустым — тогда условие «дошёл» выполняется каждый кадр. */
const PAD_WALK_COOLDOWN = 0.08;
let padWalkCooldown = 0;
const padReportLine = document.querySelector('#pad-report');
/** `?pad=1` показывает, что именно шлёт геймпад: в киоске консоли нет, и
 *  «у меня не работает» без этой строки — гадание. */
const padDebug = new URL(document.location.href).searchParams.get('pad') === '1';
/*
 * `?shot=1` — кадр для страницы магазина: мир без единой кнопки поверх.
 * Игра при этом та же самая; прячется только интерфейс, и только в этом режиме.
 */
if (new URL(document.location.href).searchParams.get('shot') === '1') document.body.dataset.shot = 'true';
/*
 * `?qa=1` — глаза и касание для бота, который играет в игру целиком.
 *
 * Бот видит состояние героя и этажа, узнаёт, где на экране клетка, и жмёт
 * туда мышью — касание идёт тем же путём, что у игрока. Всё остальное он
 * делает кнопками интерфейса. `&speed=N` прогоняет мир N шагами за кадр, чтобы
 * забег не занимал час. Без параметра режима нет вовсе.
 */
const qaMode = new URL(document.location.href).searchParams.get('qa') === '1';
// `&god=1` — только для бота: герой не получает урона, чтобы дойти до
// поздних этажей и проверить переходы, стражей и город. Баланс так не меряют.
const qaGod = qaMode && new URL(document.location.href).searchParams.get('god') === '1';
const qaSpeed = qaMode
  ? Math.max(1, Math.min(8, Number.parseInt(new URL(document.location.href).searchParams.get('speed') ?? '1', 10) || 1))
  : 1;
let padLastStep = '—';
/** Что сейчас выбрано стиком на экране игры. Хранится по селектору, не по узлу:
 *  колонка взаимодействия перестраивается сама, и ссылка на узел протухает. */
let padTargetKey = null;
let padStick = null;
/** Что стояло в колонке взаимодействия в прошлом кадре: по разнице видно, к
 *  чему герой только что подошёл. */
let padInteractKeys = '';
const inventory = document.querySelector('#inventory');
const inventoryShell = inventory.querySelector('.inventory-shell');
const packPanel = inventory.querySelector('.pack-panel');
const closeInventoryButton = document.querySelector('#close-inventory');
const inventoryTitle = document.querySelector('#inventory-title');
const inventoryCapacity = document.querySelector('#inventory-capacity');
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
const inventoryVitals = document.querySelector('#inventory-vitals');
const inventoryHealth = document.querySelector('#inventory-health');
const inventoryHungerMeter = document.querySelector('#inventory-hunger-meter');
const inventoryRestMeter = document.querySelector('#inventory-rest-meter');
const inventoryHungerFill = document.querySelector('#inventory-hunger-fill');
const inventoryRestFill = document.querySelector('#inventory-rest-fill');
const inventoryHunger = document.querySelector('#inventory-hunger');
const inventoryRest = document.querySelector('#inventory-rest');
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
/*
 * Полоска здоровья есть и в панели, и в рюкзаке.
 *
 * Иван: «это всё должно отображаться так же, как в игре, с такими же
 * индикаторами, чтобы было привычней». Поэтому они не копии по виду, а те же
 * самые деления: список хранится по полоскам, чтобы каждая заполнялась своей
 * долей, а не общей на двенадцать делений.
 */
const healthBars = [...document.querySelectorAll('.health')].map((bar) => [...bar.querySelectorAll('i')]);
const hungerMeter = document.querySelector('#hunger-meter');
const restMeter = document.querySelector('#rest-meter');
const restFill = document.querySelector('#rest-fill');
const hungerFill = document.querySelector('#hunger-fill');
/**
 * Голод и сон названы картинкой, а не словом.
 *
 * Слово тут уже было — и появилось оно не просто так: до него стоял значок
 * «◆», и Иван справедливо сказал, что он не читается. Но не читался именно
 * текстовый ромбик, а не рисунок: кусок мяса и палатка называют шкалу с
 * одного взгляда и на любом языке, а СКОЛЬКО осталось по-прежнему говорит
 * полоска рядом — она для того и выросла тогда во всю ширину.
 *
 * Имя состояния никуда не делось: оно в `aria-label` кнопки и в подсказке,
 * а нажатие печатает фразу целиком — ровно как раньше.
 */
const hungerIcon = document.querySelector('#hunger-icon');
const restIcon = document.querySelector('#rest-icon');
const heroEffectsHud = document.querySelector('#hero-effects');
const loreDialog = document.querySelector('#lore');
const loreCard = document.querySelector('.lore-card');
const loreTitle = document.querySelector('#lore-title');
const loreSubtitle = document.querySelector('#lore-subtitle');
const loreIcon = document.querySelector('#lore-icon');
const loreGlyph = document.querySelector('.lore-portrait > i');
const loreBody = document.querySelector('#lore-body');
const closeLoreButton = document.querySelector('#close-lore');
const hudGold = document.querySelector('#hud-gold');
const characterSheetFace = document.querySelector('#character-sheet-face');
const depthBadge = document.querySelector('.depth');
const depthHome = document.querySelector('#depth-home');
const floorMap = document.querySelector('#floor-map');
const floorMapCanvas = document.querySelector('#floor-map-canvas');
const floorMapTitle = document.querySelector('#floor-map-title');
const floorMapHint = document.querySelector('#floor-map-hint');
const closeFloorMapButton = document.querySelector('#close-floor-map');
const floorMapCenterButton = document.querySelector('#floor-map-center');
const floorMapLegendList = document.querySelector('#floor-map-legend');
const floorMapLegendToggle = document.querySelector('#floor-map-legend-toggle');
const floorMapZoomInButton = document.querySelector('#floor-map-zoom-in');
const floorMapZoomOutButton = document.querySelector('#floor-map-zoom-out');
const pauseGameButton = document.querySelector('#pause-game');
const runEndScreen = document.querySelector('#run-end-screen');
const restartRunButton = document.querySelector('#restart-run');
const restartRunLabel = document.querySelector('#restart-run-label');
const runEndTitle = document.querySelector('#run-end-title');
const runSummaryList = document.querySelector('#run-summary');
const settingsScreen = document.querySelector('#settings-screen');
const openSettingsButton = document.querySelector('#open-settings');
const openOutfitLabel = document.querySelector('#open-outfit-label');
const openSettingsLabel = document.querySelector('#open-settings-label');
const closeSettingsButton = document.querySelector('#close-settings');
const settingsTitle = document.querySelector('#settings-title');
const settingsLanguageTitle = document.querySelector('#settings-language-title');
const settingsMusicTitle = document.querySelector('#settings-music-title');
const settingsAudioTitle = document.querySelector('#settings-audio-title');
const settingsWipeTitle = document.querySelector('#settings-wipe-title');
const settingsWipeNote = document.querySelector('#settings-wipe-note');
const wipeProgressButton = document.querySelector('#wipe-progress');
const creditsScreen = document.querySelector('#credits-screen');
const openCreditsButton = document.querySelector('#open-credits');
const openCreditsLabel = document.querySelector('#open-credits-label');
const closeCreditsButton = document.querySelector('#close-credits');
const creditsTitle = document.querySelector('#credits-title');
const creditsBody = document.querySelector('#credits-body');
const helpScreen = document.querySelector('#help-screen');
const openHelpButton = document.querySelector('#open-help');
const closeHelpButton = document.querySelector('#close-help');
const helpTitle = document.querySelector('#help-title');
const helpBody = document.querySelector('#help-body');
const floorArrival = document.querySelector('#floor-arrival');
const settingsBrightnessTitle = document.querySelector('#settings-brightness-title');
const settingsBrightnessGroup = document.querySelector('#settings-brightness');
const brightnessDownButton = document.querySelector('#brightness-down');
const brightnessUpButton = document.querySelector('#brightness-up');
const brightnessValue = document.querySelector('#brightness-value');
const floorArrivalTitle = document.querySelector('#floor-arrival-title');
const floorArrivalSubtitle = document.querySelector('#floor-arrival-subtitle');
const recordsScreen = document.querySelector('#records-screen');
const openRecordsButton = document.querySelector('#open-records');
const openRecordsLabel = document.querySelector('#open-records-label');
const closeRecordsButton = document.querySelector('#close-records');
const recordsTitle = document.querySelector('#records-title');
const recordsDaily = document.querySelector('#records-daily');
const playDailyButton = document.querySelector('#play-daily');
const recordsBest = document.querySelector('#records-best');
const recordsEmpty = document.querySelector('#records-empty');
const recordsTotals = document.querySelector('#records-totals');
const recordsMilestones = document.querySelector('#records-milestones');
const bossHud = document.querySelector('#boss-hud');
const bossHealth = bossHud.querySelector('.boss-health');
const ambientNote = document.querySelector('#ambient-note');
const ambientNoteText = document.querySelector('#ambient-note-text');
const ambientSeenList = document.querySelector('#records-scenes-list');
const ambientSeenTitle = document.querySelector('#records-scenes-title');
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
const merchantShopCard = document.querySelector('.merchant-shop-card');
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
const itemDetailOffhand = document.querySelector('#item-detail-offhand');
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
const itemDetailVariant = document.querySelector('#item-detail-variant');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Injected by Vite from package.json; the dev server and tests fall back to a placeholder. */
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev';
/** Хеш коммита и дата сборки: по ним видно, из кэша страница или свежая. */
const BUILD_STAMP = typeof __BUILD_STAMP__ === 'string' ? __BUILD_STAMP__ : 'dev';
const assetRoot = new URL('../assets/dcss-preview/', document.baseURI);
const assetUrl = (path) => new URL(path, assetRoot).href;
const atlasRoot = new URL('../assets/atlas/', document.baseURI);

/**
 * Адрес картинки для интерфейса.
 *
 * Игровое поле рисует спрайты из атласа, а `<img>` в меню и карточках просит
 * файл по адресу — и это последние полсотни отдельных запросов, которые
 * оставались после атласа. Вырезанный кусок листа отдаётся им строкой, и
 * файлов игре больше не нужно вовсе.
 */
const uiSpriteUrls = new Map();
/**
 * Пока лист не разрезан, картинке интерфейса нечего показать. Раньше она
 * просила отдельный файл — а в сборке для itch.io отдельных файлов нет, и
 * первые кадры сыпали ошибками 404. Прозрачная точка честнее: после загрузки
 * атласа интерфейс перерисовывается целиком.
 */
let spriteSheetSettled = false;
const EMPTY_PICTURE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
function spriteUrl(path) {
  const готовый = uiSpriteUrls.get(path);
  if (готовый) return готовый;
  const вырезанный = images.get(path);
  if (!вырезанный && !spriteSheetSettled) return EMPTY_PICTURE;
  if (typeof вырезанный?.toDataURL !== 'function') return assetUrl(path);
  const адрес = вырезанный.toDataURL();
  uiSpriteUrls.set(path, адрес);
  return адрес;
}
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
/** The water of the place the run is standing in; still and dark by default. */
let waterPaths = WATER_PATHS;

const sanctuaryVisual = runtimeVisual('system', 'sanctuary', 'world', SANCTUARY_PATH, 1, -5);
/**
 * Every road's own stairs, resolved once each.
 *
 * The binding key is the same for all of them — a player who replaces «the
 * stair down» replaces it on every road, which is what they meant — but the
 * picture behind that binding is the one this road actually uses. Ivan asked
 * for this so a player can tell at a glance that they are somewhere new.
 */
function branchStairVisuals(id, side) {
  return Object.freeze(Object.fromEntries(
    Object.entries(BRANCH_STAIRS).map(([branch, stairs]) => [
      branch,
      runtimeVisual('system', id, 'world', stairs[side], 1, 0),
    ]),
  ));
}
const exitVisuals = branchStairVisuals('exit', 'down');
const ascentVisuals = branchStairVisuals('ascent', 'up');
/** The stair of the road the run is on right now. */
const exitVisual = () => exitVisuals[run?.branch] ?? exitVisuals.deep;
const ascentVisual = () => ascentVisuals[run?.branch] ?? ascentVisuals.deep;
/**
 * The city's three ways out. One gate that asked which road is not a gate, it
 * is a menu; three places that each go somewhere are three decisions a player
 * makes by walking. The pictures are placeholders until Ivan picks the real ones.
 */
const CITY_GATE_VISUALS = Object.freeze({
  deep: Object.freeze({ path: CITY_GATE_PATHS.deep, ru: 'Вниз', en: 'Down' }),
  surface: Object.freeze({ path: CITY_GATE_PATHS.surface, ru: 'Наружу', en: 'Out' }),
  vaults: Object.freeze({ path: CITY_GATE_PATHS.vaults, ru: 'Хранилища', en: 'Vaults' }),
});
const finalGateVisual = runtimeVisual('system', 'final-gate', 'world', FINAL_GATE_PATH, 1, 0);
const artifactVisual = runtimeVisual('system', 'artifact', 'world', ARTIFACT_PATH, 1, -8);
/**
 * Приз, который лежит на лестнице этого этажа. На восемнадцатом — артефакт,
 * один на все дороги: он про забег. На двадцать четвёртом — руна своей
 * дороги: она про то, где именно ты дошёл до конца.
 */
function roadPrize() {
  if (roadEndingAt(dungeon.depth) !== 'beyond') {
    return { path: artifactVisual.path, name: null, scale: artifactVisual.scale, offsetY: artifactVisual.offsetY };
  }
  const rune = branchRune(dungeon.branch);
  return {
    path: rune.path,
    name: rune.name[itemDetailLanguage === 'en' ? 'en' : 'ru'],
    scale: artifactVisual.scale,
    offsetY: artifactVisual.offsetY,
  };
}
/** Одна картинка на все ловушки: и на чужие под ногами, и на свои капканы. */
const TRAP_PATH = PLAYER_TRAP_PATH;

const armedPlayerTrapVisual = runtimeVisual('trap', 'player-armed', 'world', PLAYER_TRAP_PATH, 1, 5);
const spentPlayerTrapVisual = runtimeVisual('trap', 'player-spent', 'world', PLAYER_TRAP_PATH, 0.86, 5);
// A bait is not a machine: it looks like what it is, a piece of bad meat.
const armedBaitVisual = runtimeVisual('trap', 'bait-armed', 'world', PLAYER_BAIT_PATH, 1, 5);
const spentBaitVisual = runtimeVisual('trap', 'bait-spent', 'world', PLAYER_BAIT_PATH, 0.86, 5);
const disarmedTrapVisual = runtimeVisual('trap', 'disarmed', 'world', DISARMED_TRAP_PATH, 1, 5);
const doorPanelVisual = runtimeVisual(
  'system', 'door-panel', 'world', 'dngn/doors/closed_door.png', 1, 0,
);

const effectPaths = EFFECT_PATHS;
const requiredPaths = requiredAssetPaths(visualOverridePaths(visualOverrides));

const images = new Map();
const floorLootSpritePaths = new Set([
  ...LOOT_CATALOG.map(({ icon }) => icon),
  // Alternate silhouettes are floor loot too: without their own alpha bounds
  // they would be drawn untrimmed and sit differently on the tile.
  ...LOOT_CATALOG.flatMap((item) => itemSpriteVariants(item)),
  ...IDENTIFICATION_APPEARANCE_PATHS,
  ...visualOverridePaths(visualOverrides),
]);
const floorLootSpriteBounds = new Map();
const requestedSeedValue = new URL(document.location.href).searchParams.get('seed');
// QA-only: `?preview=chest|altar` moves that find next to the spawn cell.
const previewFindIdNearSpawn = {
  chest: 'sealed-cache',
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
// Только целые клетки: сохранения успели набрать дробных ключей «3.8,8.8»
// (см. revealAround), и тащить их дальше незачем.
const isCellKey = (key) => /^\d+,\d+$/.test(key);
const revealed = new Set(run.floor.revealed.filter(isCellKey));
revealAround(revealed, world, { x: run.hero.x, y: run.hero.y }, 4);
/**
 * Комната этажа, ставшая кладбищем, и смерть, которую она хоронит.
 *
 * Решение принимается здесь, а не в генераторе: кладбище зависит от того,
 * умирал ли игрок раньше, а это знание живёт в метасостоянии, которого этаж
 * не видит и видеть не должен — иначе один и тот же сейв собирал бы разные
 * этажи. Обстановка и туман — единственное, на что влияет ответ, поэтому
 * сохранение остаётся нетронутым.
 *
 * Стоит выше первой постройки обстановки намеренно: `let` в мёртвой зоне
 * бросает при чтении, и объявление ниже по файлу валило первый кадр.
 */
let activeGraveyardRoom = null;
let activeGraveyardBones = null;

let dungeonEnvironment = createDungeonEnvironment(dungeon, { graveyardRoom: activeGraveyardRoom });
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
let lootDefinitions = createFloorLoot(dungeon);
let eventDefinitions = createEventDefinitions(dungeon);
let findDefinitions = createFindDefinitions(dungeon);
let trapDefinitions = trapsFromDungeon(dungeon);
let detectedTrapIds = new Set(run.floor.detectedTrapIds);
// Stairs under the hero on arrival must not fire until they step off them.
/** Raised servants: one per prepared summoning spell, never in the save. */
let allies = [];
let hazardInputState = createHazardInputState();
let permittedHazardCell = null;
let inputGesture = 0;
let doorDefinitions = dungeon.doors.map((door) => ({ ...door }));
let merchantDefinitions = dungeon.merchants.map((merchant) => ({ ...merchant }));
let builtWallCells = new Set(dungeon.builtWalls ?? []);
let thicketCells = new Set(dungeon.thicketWalls ?? []);
let hewnWallCells = new Set(dungeon.hewnWalls ?? []);
let boardedFloorCells = new Set([
  ...tavernFloorCells(dungeon),
  ...cityInteriorFloorCells(dungeon.city),
]);
let greenFloorCells = new Set(cityGreenCells(dungeon.city));
waterPaths = waterTiles(dungeon.themeId);
// The body a past run left on this floor, placed once when the floor is built.
let floorGhost = null;
/** Добрый призрак с кладбища: он не дерётся, он рассказывает. */
let graveyardGhost = null;

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
  rest: validateRest(run.hero.rest) ? run.hero.rest : REST_MAX,
  meal: createMealState(run.hero.meal),
  effects: createActorEffects(run.hero.effects),
  skills: cloneSkillState(run.hero.skills),
  skillStudy: createBookStudy(run.hero.skillStudy),
  attributes: createAttributeState(run.hero.attributes),
  attributeGifts: createAttributeGifts(run.hero.attributeGifts),
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
// Guards, beasts and wildlife walk up to a standing hero; the button has to
// notice them, not only the cells the hero steps on.
let interactionUiAccumulator = 0;
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
  // Потеря со знаком: без него «−6» над героем читалось как «6» — то ли удар,
  // то ли лечение.
  '\u2212': ['000', '000', '111', '000', '000'],
  '-': ['000', '000', '111', '000', '000'],
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
    denseRoom: activeGraveyardRoom == null ? null : level.rooms[activeGraveyardRoom] ?? null,
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
// The history of finished runs. It lives beside the save, never inside it.
let metaState = createMetaState();
/** What survived past runs and what has been bought for the next one. */
let stashState = createStashState(null);
let recordsReturnScreen = 'menu';
let settingsReturnScreen = 'menu';
let creditsReturnScreen = 'menu';
let helpReturnScreen = 'menu';
/**
 * Сколько секунд мир ещё стоит, пока экран не открыл новый этаж. Монстры не
 * должны бить героя, пока игрок смотрит на чёрный экран с цифрой.
 */
let arrivalHold = 0;
let toastTimer = 0;
let toastVisible = false;
let activeLootToastEntry = null;
const lootToastQueue = [];
let levelUpTimer = 0;
let levelUpAudio = null;
let audioMasterGain = null;
let audioAmbient = { paletteId: null, file: null, nodes: [], gain: null, sampleGain: null, level: 1 };
let audioAmbientRequest = null;
/*
 * Второй слой: мелодия дороги. Она живёт отдельно от гула, потому что меняется
 * по другому поводу — гул следует за палитрой этажа, мелодия за дорогой, — и
 * при переходе с этажа на этаж внутри одной дороги она не должна обрываться.
 */
let audioMusic = { branchId: null, file: null, nodes: [], gain: null, sampleGain: null, level: 1 };
let audioMusicRequest = null;
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
let displaySettings = (() => {
  try {
    return createDisplaySettings(JSON.parse(localStorage.getItem(DISPLAY_SETTINGS_KEY) ?? 'null'));
  } catch {
    return createDisplaySettings();
  }
})();
let playerAppearance = loadPlayerAppearance();
let appearanceDraft = playerAppearance;
let menuMode = 'title';
let modalReturnScreen = 'menu';
let itemDetailItem = null;
let itemDetailReturnTarget = null;
/** Set while somebody other than the backpack is showing an item: the shop. */
let itemDetailOffer = null;
let gold = run.gold;
let deathTimer = 0;
let runStatus = run.status;
let playerHasActed = run.started;
/** Сколько вампиризм ещё может вернуть в этой секунде. Копится временем. */
let vampiricPool = 0;
/** Наметил ли игрок этим путём пройти сквозь дверь. */
let heroPathOpensDoors = false;
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
let activeMerchant = null;
let merchantTab = 'buy';
let activeChestFindId = null;
let hungerAccumulator = 0;
/** Когда по герою последний раз били или за ним гнались — для передышки. */
let heroThreatAt = Number.NEGATIVE_INFINITY;
let calmCarry = 0;
let hungerAutosaveElapsed = 0;
let currentHungerStageId = hungerStage(hero.hunger).id;
let trapPlacementState = null;
let abilityTargetingState = null;
let placedTraps = run.floor.placedTraps.map((trap) => ({ ...trap }));
let lastHeroCell = `${Math.floor(hero.x / TILE)},${Math.floor(hero.y / TILE)}`;
const markedForSalvage = new Set();
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
  renderInventoryCapacity();
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
    // «Кем играешь»: the weapon in hand is the shortest true answer the game has.
    weaponName: equippedItem('hand1')
      ? itemPresentation(presentedItem(equippedItem('hand1')), itemDetailLanguage).name
      : '',
    paused: menuMode === 'pause',
  });
}

/**
 * The two rules this run lives by, shown before the first step rather than
 * discovered on floor four: a condition the player cannot read is difficulty
 * wearing a hat.
 */
function renderRunConditions(label) {
  const ids = dungeon.conditionIds ?? [];
  menuConditions.setAttribute('aria-label', label);
  menuConditions.hidden = ids.length === 0;
  menuConditions.replaceChildren(...ids.map((id) => {
    const copy = conditionCopy(id, itemDetailLanguage);
    const row = document.createElement('li');
    const name = document.createElement('b');
    name.textContent = copy.name;
    const gives = document.createElement('span');
    gives.className = 'gives';
    gives.textContent = copy.gives;
    const takes = document.createElement('span');
    takes.className = 'takes';
    takes.textContent = copy.takes;
    // The cost first, then what it buys: every «зато» has to answer something.
    row.append(name, takes, gives);
    return row;
  }));
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
  // Two choices, each saying what it is. «Продолжить» carries the hero.
  const [first, second = null] = model.actions;
  startGameLabel.textContent = first.label;
  startGameDetail.textContent = first.detail;
  startGameButton.setAttribute('aria-label', `${first.label}. ${first.detail}`);
  mainMenuHint.textContent = model.hint;
  renderRunConditions(labels.conditions);
  /*
   * В строке — хеш, в подсказке — ещё и время сборки.
   *
   * Полная отметка в одну строку на телефоне не влезает и рвётся посередине.
   * Хеша достаточно, чтобы сверить экран с тем, что выкачено; время нужно
   * реже, и живёт оно во всплывающей подписи.
   */
  const [коммит] = BUILD_STAMP.split(' · ');
  appVersionLabel.textContent = `${labels.version} ${APP_VERSION} · ${коммит}`;
  appVersionLabel.title = BUILD_STAMP;
  feedbackLink.textContent = labels.feedback;
  feedbackLink.setAttribute('aria-label', labels.feedback);
  editAppearanceLabel.textContent = labels.appearance;
  editAppearanceButton.setAttribute('aria-label', labels.openAppearance);
  menuAppearanceIcon.src = spriteUrl(resolvePlayerAppearance(playerAppearance).body.layer);
  // Your own face on the key that opens your own sheet.
  characterSheetFace.src = spriteUrl(resolvePlayerAppearance(playerAppearance).body.layer);
  newRunFromMenuButton.hidden = second === null;
  if (second) {
    newRunFromMenuLabel.textContent = second.label;
    newRunFromMenuDetail.textContent = second.detail;
    newRunFromMenuButton.setAttribute('aria-label', `${second.label}. ${second.detail}`);
  }
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
  // Подписи двух отдельных экранов живут там же, где остальное меню: язык
  // переключается в одном месте, а меняется везде.
  renderSettings();
  renderCredits();
  renderHelp();
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
  appearanceBeardLabel.textContent = labels.beard;
  saveAppearanceButton.textContent = labels.appearanceDone;
  for (const button of appearanceCycleButtons) {
    const previous = Number(button.dataset.appearanceStep) < 0;
    const kind = button.dataset.appearanceKind;
    const хвост = kind === 'body' ? 'Body' : kind === 'hair' ? 'Hair' : 'Beard';
    const key = `${previous ? 'previous' : 'next'}${хвост}`;
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
  renderRecords();
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
      // Сейв прошлой версии чинит миграция, сейв сегодняшней — приём: снятый
      // навык возвращается очками, иначе вчерашний забег молча пропадёт.
      const snapshot = legacy ? migrateLegacyRun(parsed) : adoptRun(parsed);
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

/**
 * Raising a servant. It is built from the same catalog every monster comes
 * from, so it walks, bleeds and dies through the code that already exists;
 * only its strength comes from the caster instead of the floor.
 */
function raiseAlly(spellId) {
  const blueprint = minionBlueprint(spellId);
  if (!blueprint) return null;
  const cell = freeCellNearHero();
  if (!cell) return null;
  const [ally] = createRuntimeMonsters(dungeon, [{
    instanceId: `ally-${spellId}`,
    id: blueprint.monsterId,
    x: cell.x,
    y: cell.y,
  }]);
  if (!ally) return null;
  const stats = minionStats({
    blueprint,
    intelligence: currentHeroStats().intelligence,
    profile: necromancyProfile(currentSkillCapabilities()),
  });
  ally.ally = true;
  ally.spellId = spellId;
  ally.maxHp = stats.maxHp;
  ally.hp = stats.maxHp;
  ally.damage = stats.damage;
  ally.xp = 0;
  ally.alerted = ally.pursuit;
  allies = [...allies.filter((other) => other.spellId !== spellId), ally];
  burst(ally.x, ally.y - 10, '#9ad3b8', 18);
  addImpactWave(ally.x, ally.y - 6, '#9ad3b8', 52, 0);
  playSound('spell-toggle');
  return ally;
}

/**
 * The tamed beast takes its place beside the hero. Unlike a servant it is not
 * born from a slot: it comes out of the run and keeps the health it had.
 */
function raiseCompanion(index) {
  const record = run.companions[index];
  if (!record) return null;
  const stats = companionStats({
    creatureId: record.id,
    profile: tamingProfile(currentSkillCapabilities()),
  });
  const cell = freeCellNearHero();
  if (!stats || !cell) return null;
  const [beast] = createRuntimeMonsters(dungeon, [{
    instanceId: `ally-companion-${index}`,
    id: `${isMercenary(record.id) ? 'hired' : 'tamed'}-${record.id}`,
    x: cell.x,
    y: cell.y,
  }]);
  if (!beast) return null;
  beast.ally = true;
  beast.companion = true;
  beast.companionIndex = index;
  beast.mode = record.mode;
  beast.spellId = null;
  beast.maxHp = stats.maxHp;
  beast.hp = Math.min(record.hp, stats.maxHp);
  beast.damage = stats.damage;
  beast.xp = 0;
  beast.alerted = beast.pursuit;
  allies = [...allies.filter((other) => other.companionIndex !== index), beast];
  return beast;
}

/**
 * Взять вещь с пола.
 *
 * Иван: «может быть такое, что игроку что-то выпало, и он сразу это поднял, и
 * он даже не успел понять, что случилось». Поэтому это отдельное действие с
 * отдельной кнопкой, на которой нарисована сама вещь, — а не то, что
 * случается само, пока ты бежишь мимо.
 */
function takeGroundLoot(loot) {
  const index = lootDefinitions.indexOf(loot);
  if (index < 0 || runStatus !== 'playing' || hero.dead) return false;
  if (!addInventoryItem(loot.definition, freeItemUid(loot.instanceId))) {
    showLootToast(loot.definition, 'full');
    return false;
  }
  lootDefinitions.splice(index, 1);
  playSound('pickup');
  // What a ghost was guarding is remembered by the bones, not by the floor:
  // the floor's own loot ids are the only ones `collected` may hold.
  if (loot.bones) wakeFloorGhost();
  // Упавшее с убитого этаж носил сам — и перестаёт, как только его подобрали.
  else if (loot.drop) run.floor.drops = run.floor.drops.filter(({ instanceId }) => instanceId !== loot.instanceId);
  else run.floor.collected.push(loot.instanceId);
  const displayItem = presentedItem(loot.definition);
  burst(loot.x, loot.y - 8, rarityGlow[displayItem.rarity], 8 + displayItem.rarity * 4);
  addImpactWave(
    loot.x,
    loot.y - 8,
    rarityGlow[displayItem.rarity],
    34 + displayItem.rarity * 10,
    displayItem.rarity >= 3 ? 2 : 0,
  );
  showLootToast(loot.definition, 1, 'item');
  playerHasActed = true;
  updateInteractionUi();
  renderPack();
  persistRun();
  return true;
}


/** The beast the hero is standing next to, if it is one of their own. */
const COMPANION_REACH = MINION_FOLLOW_DISTANCE;

function nearbyCompanion() {
  if (runStatus !== 'playing' || hero.dead) return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return allies.find((ally) => (
    ally.companion
    && ally.dead === 0
    && cellStepDistance(cell, { x: Math.floor(ally.x / TILE), y: Math.floor(ally.y / TILE) }) <= COMPANION_REACH
  )) ?? null;
}

/** A cell beside the hero that nothing else stands on. */
function freeCellNearHero() {
  const origin = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const taken = new Set([
    ...occupiedMonsterCells(monsters, TILE),
    ...allies.filter(({ dead }) => dead === 0).map((ally) => monsterCellKey(ally, TILE)),
    `${origin.x},${origin.y}`,
  ]);
  const ring = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
  ];
  for (const offset of ring) {
    const cell = { x: origin.x + offset.x, y: origin.y + offset.y };
    if (!isWalkable(cell.x, cell.y) || taken.has(`${cell.x},${cell.y}`)) continue;
    return cell;
  }
  return null;
}

/** Every prepared summoning spell wants a servant standing; this keeps it so. */
function updateAllySlots() {
  if (runStatus !== 'playing' || hero.dead) return;
  const prepared = hero.spells.preparedSpellIds.filter((id) => id && isMinionSpell(id));
  allies = allies.filter((ally) => ally.companion || prepared.includes(ally.spellId));
  // The tamed beast follows the hero down the stairs, health and all.
  // Every beast in the party keeps a place beside the hero, floor after floor.
  for (const [index] of run.companions.entries()) {
    if (allies.some((ally) => ally.companionIndex === index && ally.dead === 0)) continue;
    raiseCompanion(index);
  }
  const stats = currentHeroStats();
  for (const spellId of prepared) {
    const spell = spellById(spellId);
    if (!spell || stats.intelligence < spell.minimumIntelligence) continue;
    if (allies.some((ally) => ally.spellId === spellId && ally.dead === 0)) continue;
    if ((spellCooldowns[spellId] ?? 0) > 0) continue;
    raiseAlly(spellId);
  }
}

function allyInMeleeOf(monster) {
  return allies.find((ally) => ally.dead === 0 && canActorsMelee(monster, ally)) ?? null;
}

/** A servant dies like anything else, and its slot starts counting it back. */
function damageAlly(ally, amount) {
  if (!ally || ally.dead > 0) return;
  const dealt = Math.max(1, Math.round(amount));
  ally.hp -= dealt;
  ally.hit = 0.19;
  burst(ally.x, ally.y - 8, ally.bloodColor ?? '#cfc6ad', 8);
  addCombatGlyph(ally.x, ally.y, dealt, '#d8b6a6');
  if (ally.hp > 0) return;
  ally.hp = 0;
  ally.dead = 0.01;
  if (ally.companion) {
    // A friend is not a spell: when the beast falls, it stays fallen.
    const name = companionName(run.companions[ally.companionIndex]?.id ?? '', itemDetailLanguage);
    run.companions = run.companions.filter((_, index) => index !== ally.companionIndex);
    // The party closed ranks, so the beasts still standing are raised afresh.
    allies = allies.filter((other) => !other.companion);
    showLootToast({ path: ally.spritePath, rarity: 2 }, `${name}: ${companionRefusalText('lost', itemDetailLanguage)}`, 'loss');
    persistRun();
    return;
  }
  const blueprint = minionBlueprint(ally.spellId);
  const seconds = minionStats({
    blueprint,
    intelligence: currentHeroStats().intelligence,
    profile: necromancyProfile(currentSkillCapabilities()),
  })?.respawnSeconds ?? 60;
  spellCooldowns[ally.spellId] = seconds;
  const copy = minionCopy(ally.spellId, itemDetailLanguage);
  if (copy) showLootToast({ icon: spellById(ally.spellId)?.icon, rarity: 2 }, copy.fell);
  renderSpellBar();
}

function createMonsters(level) {
  const resolvedFindIds = new Set(run.floor.resolvedFindIds);
  const spawned = createRuntimeMonsters(
    level,
    level.monsters.filter(
      (spawn) => (!spawn.activationFindId || resolvedFindIds.has(spawn.activationFindId))
        // Дом продан — маклер уехал. Возвращаться в город и снова заставать его
        // у той же двери, торгующим тем, что уже твоё, игрок не должен.
        && !(spawn.id === CITY_BROKER_ID && run.house.owned),
    ),
  );
  // A wanted hero is met by the watch instead of ignored by it. The captain is
  // the exception: he is the desk where the fine is paid, so he keeps the peace.
  if (isWanted(run.crime)) {
    for (const monster of spawned) {
      if (monster.neutral && monster.id !== CITY_CAPTAIN_ID) monster.provoked = true;
    }
  }
  /*
   * Проданную душу забирают везде.
   *
   * Сделка лежит на забеге, а не на этаже, поэтому демон, встреченный после
   * неё — хоть тот же после перезагрузки, хоть другой тремя этажами ниже, —
   * уже не предлагает и не ждёт ответа. Перезагрузка отменяет драку ровно на
   * столько, сколько нужно, чтобы она началась заново.
   */
  if (run.soulSold) {
    for (const monster of spawned) {
      if (parleyFor(monster.id)?.kind !== 'soul') continue;
      monster.provoked = true;
      monster.neutral = false;
      monster.damage = Math.max(1, Math.round(monster.damage * PARLEY_SOUL_POWER));
      monster.hp = Math.round(monster.hp * PARLEY_SOUL_POWER);
      monster.maxHp = Math.round(monster.maxHp * PARLEY_SOUL_POWER);
    }
  }
  return [...spawned, ...thiefOnFloor(level, spawned)];
}

/**
 * Вор, унёсший чужое, идёт следом.
 *
 * Иван: «нужно сделать так, чтобы ты мог его и на следующем этаже догнать; а
 * то, что если он у тебя какой-нибудь важный предмет навсегда заберёт, это не
 * круто по отношению к игроку». Поэтому пока украденное при нём, он ставится
 * на каждый следующий этаж — не жребием, а наверняка. Догнать можно всегда;
 * вопрос только в том, пойдёт ли герой за ним.
 */
function thiefOnFloor(level, spawned) {
  if (!run.thief || isCityDepth(level.depth)) return [];
  const instanceId = `monster-${level.depth}-thief`;
  if (run.floor.defeated.includes(instanceId)) return [];
  if (spawned.some((monster) => monster.id === THIEF_MONSTER_ID)) return [];
  const cell = thiefCellFor(level);
  if (!cell) return [];
  return createRuntimeMonsters(level, [{
    instanceId,
    id: THIEF_MONSTER_ID,
    x: cell.x,
    y: cell.y,
  }]).map((monster) => {
    // Он уже с добычей: красть ему больше нечего, и подходить к герою незачем.
    monster.stole = true;
    return monster;
  });
}

/** Где он стоит на новом этаже: подальше от входа, чтобы не наткнуться сразу. */
function thiefCellFor(level) {
  const spawn = level.spawn;
  const свободные = [];
  for (let y = 0; y < level.grid.length; y += 1) {
    for (let x = 0; x < level.grid[y].length; x += 1) {
      if (level.grid[y][x] !== '.') continue;
      if (Math.abs(x - spawn.x) + Math.abs(y - spawn.y) < 8) continue;
      свободные.push({ x, y });
    }
  }
  if (свободные.length === 0) return null;
  const бросок = parleyRoll(run.seed, level.depth, THIEF_MONSTER_ID);
  return свободные[Math.min(свободные.length - 1, Math.floor(бросок * свободные.length))];
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

/**
 * Всё, что лежит на полу: и положенное генератором, и упавшее с убитых.
 *
 * Второе этаж носит сам — в `floor.drops`, — потому что генератор про него
 * ничего не знает: оно появилось в бою. Записи одинаковые, поэтому дальше
 * никто не различает, откуда вещь взялась: подбирается она одинаково.
 */
function createFloorLoot(level) {
  return [
    ...createLootDefinitions(level),
    ...createLootDefinitions({ loot: run.floor.drops }).map((entry) => ({ ...entry, drop: true })),
  ];
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
  // Every beast carries its wounds and its orders down the stairs.
  run.companions = run.companions.map((record, index) => {
    const beast = allies.find((ally) => ally.companionIndex === index && ally.dead === 0);
    return beast
      ? { id: record.id, hp: Math.max(1, Math.round(beast.hp)), mode: beast.mode ?? record.mode }
      : record;
  });
  run.hero = {
    x: Math.floor(hero.x / TILE),
    y: Math.floor(hero.y / TILE),
    hp: hero.hp,
    maxHp: hero.maxHp,
    level: hero.level,
    xp: hero.xp,
    power: hero.power,
    hunger: hero.hunger,
    rest: hero.rest,
    meal: createMealState(hero.meal),
    effects: createActorEffects(hero.effects),
    skills: cloneSkillState(hero.skills),
    skillStudy: createBookStudy(hero.skillStudy),
    attributes: cloneAttributeState(hero.attributes),
    attributeGifts: createAttributeGifts(hero.attributeGifts),
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
    .filter((monster) => monster.dead === 0 && !monster.ghost)
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

/**
 * What an item is made of is shown by recolouring its own sprite, never by a
 * different sprite: the silhouette has to stay readable, or the icon stops
 * telling the player what the thing is.
 *
 * The sprite and the recolouring both come from `itemPicture` — the one answer
 * to «what does this very thing look like». Floor, «что рядом», the pickup
 * toast, backpack, item card and worn slot all draw that answer and nothing
 * else (Ivan saw one helmet as three different pictures).
 */
function spriteForItem(item) {
  return itemPicture(item)?.path ?? null;
}

/**
 * DOM icons carry the material as a custom property rather than as `filter`, so
 * the drop-shadow the stylesheet gives them survives the recolouring.
 */
function paintMaterial(icon, item) {
  if (!icon) return;
  const filter = itemPicture(item)?.filter ?? null;
  if (filter) icon.style.setProperty('--material-filter', filter);
  else icon.style.removeProperty('--material-filter');
}

/** An `<img>` showing one item instance: its sprite and its material, together. */
function paintItemIcon(icon, item) {
  if (!icon) return;
  icon.src = spriteUrl(spriteForItem(item));
  paintMaterial(icon, item);
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
  // `floorScale` is the catalogue's own word on how big the thing lies on the
  // floor; the visual-override editor still has the last say on top of it.
  const visual = runtimeVisual(
    'loot', presentation.id, 'icon', iconPath, presentation.floorScale ?? 1, -7,
  );
  return {
    ...presentation,
    icon: visual.path,
    visualScale: visual.scale,
    visualOffsetY: visual.offsetY,
  };
}

/**
 * Arcana's second reading of a page — but only of a page the hero can already
 * name. An unknown scroll must not give itself away through the button on it.
 */
function variantForItem(item) {
  if (!item) return null;
  if (isIdentifiableItem(item) && !run.knowledge.identifiedItemIds.includes(item.id)) return null;
  return scrollVariant(item.id, arcanaProfile(currentSkillCapabilities()));
}

/**
 * The card's second action: a scroll an arcanist can reread offers the other
 * reading. Зачарования здесь больше нет — вторая кнопка осталась одна.
 */
function secondaryItemAction(selection) {
  if (!selection?.item) return null;
  const variant = selection.source === 'pack' ? variantForItem(selection.item) : null;
  if (!variant) return null;
  return {
    kind: 'variant',
    label: scrollVariantLabel(selection.item.id, itemDetailLanguage),
    enabled: true,
    hint: '',
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

/**
 * Заклинания героя — это его ранги школ, и ничего кроме.
 *
 * Список известного лежит в сохранении, но истиной больше не является: его
 * пересобирают отсюда всякий раз, когда ранг мог измениться — очком, книгой
 * или сбросом. Заклинание, под которое ранга больше нет, уходит и с панели:
 * «Книга забвения» умеет отнимать ранг, и держать на панели то, чего герой
 * уже не умеет, было бы обманом.
 */
function syncKnownSpells() {
  const ranks = Object.fromEntries(SPELL_SCHOOL_IDS.map((schoolId) => [
    schoolId,
    effectiveSkillRank(hero.skills, schoolId, hero.skillStudy.rankAdjustments),
  ]));
  const known = spellIdsForRanks(ranks);
  const prepared = hero.spells.preparedSpellIds.map((id) => (known.includes(id) ? id : null));
  // Новое заклинание само ложится в пустую ячейку: открыть школу и потом
  // искать, куда нажать, — лишний шаг там, где выбора ещё нет.
  for (const id of known) {
    if (prepared.includes(id)) continue;
    const slot = prepared.indexOf(null);
    if (slot < 0) break;
    prepared[slot] = id;
  }
  hero.spells = createSpellState({
    ...hero.spells,
    knownSpellIds: known,
    preparedSpellIds: prepared,
    activeSustainedSpellIds: hero.spells.activeSustainedSpellIds.filter((id) => prepared.includes(id)),
  });
  return hero.spells;
}

/** How wide this hero's bag is: thirty, plus whatever «Вьючник» adds. */
function currentBackpackCapacity() {
  return backpackCapacity(currentSkillCapabilities());
}

function currentSkillCapabilities() {
  return deriveSkillCapabilities(hero.skills, currentSkillOptions());
}

function visualForItem(item, renderedSlot = item?.slot) {
  const visual = equipmentVisualForItem(item, renderedSlot);
  if (!visual) return visual;
  const filter = materialFilter(item?.materialId ?? null);
  return filter ? { ...visual, filter } : visual;
}

function currentHeroStats(equipment = selected, items = itemInstances) {
  return deriveHeroStats(hero, equipment, items, currentSkillOptions());
}

function currentWeaponLoadout() {
  return resolveWeaponLoadout(equippedItem('hand1'), equippedItem('hand2'));
}

const SPELL_SCHOOL_RANKS = Object.freeze({
  pyromancy: 'pyromancyRank',
  cryomancy: 'cryomancyRank',
  'storm-magic': 'stormMagicRank',
  arcana: 'arcanaRank',
  cleansing: 'cleansingRank',
  necromancy: 'necromancyRank',
});

/** How far the school behind a spell has been learned. Zero for an unknown one. */
function spellSchoolRank(schoolId) {
  const key = SPELL_SCHOOL_RANKS[schoolId];
  return key ? currentSkillCapabilities()[key] ?? 0 : 0;
}

/**
 * Why a spell refused. A greyed-out button that says nothing is the thing
 * players complain about, so every new refusal gets a sentence of its own.
 */
/** How long a kindled hero's fire clings to whatever touched them. */
const KINDLE_BURN_SECONDS = 4;

const SPELL_REFUSALS = Object.freeze({
  ru: Object.freeze({
    nothingToBurn: 'Нечего выжигать',
    tooWeak: 'Слишком мало здоровья',
    nobodyToMend: 'Некого лечить',
    nothingLocked: 'Рядом нет замка',
    nowhereToGo: 'Переносить некуда',
  }),
  en: Object.freeze({
    nothingToBurn: 'Nothing to burn away',
    tooWeak: 'Not enough health',
    nobodyToMend: 'Nobody to mend',
    nothingLocked: 'No lock within reach',
    nowhereToGo: 'Nowhere to land',
  }),
});

function spellRefusalCopy(language) {
  return SPELL_REFUSALS[language === 'en' ? 'en' : 'ru'];
}

/**
 * Throws a creature one tile directly away from the hero. Returns false when
 * the tile behind it is wall or taken — and that refusal is the point: a shove
 * into a wall hurts more than a shove into a corridor.
 */
function shoveActorFromHero(actor) {
  if (!actor) return false;
  const from = { x: Math.floor(actor.x / TILE), y: Math.floor(actor.y / TILE) };
  const dx = actor.x - hero.x;
  const dy = actor.y - hero.y;
  const step = Math.abs(dx) >= Math.abs(dy)
    ? { x: Math.sign(dx) || 1, y: 0 }
    : { x: 0, y: Math.sign(dy) || 1 };
  const landing = { x: from.x + step.x, y: from.y + step.y };
  if (!isWalkable(landing.x, landing.y)) return false;
  const taken = [...monsters, ...allies].some((other) => (
    other !== actor
    && other.dead === 0
    && Math.floor(other.x / TILE) === landing.x
    && Math.floor(other.y / TILE) === landing.y
  ));
  if (taken) return false;
  actor.x = (landing.x + 0.5) * TILE;
  actor.y = (landing.y + 0.5) * TILE;
  actor.route = [];
  actor.repathCooldown = 0;
  return true;
}

/**
 * Where a translocation drops the hero. Anywhere walkable and empty that is not
 * within arm's reach of where they stood — landing next to the thing you were
 * running from is not a teleport, it is a stumble.
 */
function randomTeleportCell() {
  const from = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const taken = new Set([...monsters, ...allies]
    .filter((actor) => actor.dead === 0)
    .map((actor) => `${Math.floor(actor.x / TILE)},${Math.floor(actor.y / TILE)}`));
  const candidates = [];
  for (let y = 0; y < world.length; y += 1) {
    for (let x = 0; x < world[y].length; x += 1) {
      if (!isHeroWalkable(x, y)) continue;
      if (taken.has(`${x},${y}`)) continue;
      if (Math.abs(x - from.x) + Math.abs(y - from.y) < 6) continue;
      candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function currentHeroMagic() {
  const gear = equipmentMagic(selected, itemInstances);
  const spells = spellMagic(hero.spells, currentHeroStats().intelligence);
  // Gear and spells grant the same kinds of thing, so they are folded rather
  // than listed: a sustained spell added later must not need a line here too.
  const merged = { ...gear };
  for (const [flag, granted] of Object.entries(spells)) {
    merged[flag] = merged[flag] || granted;
  }
  return Object.freeze(merged);
}

function isHeroConcealed() {
  return currentHeroMagic().invisibility && hero.invisibilityReveal <= 0;
}

function currentHeroCombat() {
  const primary = equippedItem('hand1');
  const combat = weaponCombatProfile(primary, equippedItem('hand2'));
  const attackSpeed = currentHeroStats().attackSpeed;
  const capabilities = currentSkillCapabilities();
  // Two skills lengthen a weapon rather than sharpen it, so the reach they buy
  // belongs here, where every range check already reads from.
  const reach = combat.style === 'whip'
    ? Math.max(combat.range, whipProfile(capabilities).reach)
    : combat.range + staffProfile(primary, capabilities).rangeBonus;
  return {
    ...combat,
    range: reach,
    cooldown: combat.cooldown / attackSpeed,
    attackDuration: combat.attackDuration / Math.sqrt(attackSpeed),
  };
}

function currentWhipProfile() {
  return whipProfile(currentSkillCapabilities());
}

function currentStaffProfile() {
  return staffProfile(currentWeaponLoadout().primary, currentSkillCapabilities());
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

/** Everything worn, folded once: the armour traits the hero is carrying. */
function currentArmourProfile() {
  return armourProfile(EQUIPMENT_SLOTS.map((slot) => equippedItem(slot)).filter(Boolean));
}

function currentStealthProfile() {
  const skill = stealthProfile(currentSkillCapabilities());
  const quiet = currentArmourProfile().quiet;
  // A miser's jewellery is the other half of its own bargain: gold for being
  // easier to spot. It eats the concealment the school and the armour bought.
  const greed = currentHeroMagic().greed;
  if (greed > 0) {
    return Object.freeze({
      rank: skill.rank,
      visionPercent: Math.max(0, Math.round((Math.min(60, (skill.visionPercent ?? 0) + quiet)) * (1 - greed))),
      noisePercent: skill.noisePercent ?? 0,
    });
  }
  if (quiet === 0) return skill;
  // Quiet armour works on its own; with the skill the two add up, bounded by
  // the same ceiling the skill already respects.
  return Object.freeze({
    rank: skill.rank,
    visionPercent: Math.min(60, (skill.visionPercent ?? 0) + quiet),
    noisePercent: skill.noisePercent ?? 0,
  });
}

/**
 * The part of the hero's damage that depends on where they are and how badly
 * they are hurt. It multiplies the blow rather than the sheet, because both of
 * these change between one swing and the next and a character sheet that jumps
 * around while you fight is a sheet nobody can read.
 */
function heroConditionalDamage() {
  const magic = currentHeroMagic();
  let multiplier = 1;
  if (magic.bloodlust && hero.hp <= currentHeroStats().maxHp / 3) multiplier += magic.bloodlust;
  if (magic.riverborn && heroWading()) multiplier += magic.riverborn;
  return multiplier;
}

function currentSecretSearchProfile() {
  return secretSearchProfile(senseCapabilities());
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
  // Cold wood on the same spot: no light, and nothing to interact with, which
  // is what «использовать его нельзя» means in a sentence the runtime can read.
  'fire-out': Object.freeze({
    path: CAMP_FIRE_OUT_PATH,
    frames: Object.freeze([CAMP_FIRE_OUT_PATH]),
    size: 62,
    screenOffsetY: -10,
    light: null,
    interactionId: null,
  }),
  bedroll: Object.freeze({
    path: CAMP_BEDROLL_PATH,
    frames: Object.freeze([CAMP_BEDROLL_PATH]),
    // Ivan picked the smallest of the four: a tent the height of the hero
    // standing beside it. That is one cell and a little, which is what lets the
    // camp layout treat it like everything else — the camp module holds the
    // limit this number has to stay under, and a test reads both.
    size: 72,
    screenOffsetY: -14,
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
  const burning = campFireBurning(camp);
  return camp.places.map(({ feature, x, y }) => {
    const visual = CAMP_PROP_VISUALS[feature === 'fire' && !burning ? 'fire-out' : feature];
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

/**
 * The camp fire burning down. Only the floor the hero is standing on burns:
 * a camp two floors up is not on fire while nobody is there to watch it.
 */
function updateCampFire(delta) {
  const camp = run.floor.camp;
  if (!camp || !campFireBurning(camp)) return;
  const burnt = burnCampFire(camp, delta);
  run.floor.camp = burnt.camp;
  if (!burnt.wentOut) return;
  applyCampProps();
  const place = camp.places.find(({ feature }) => feature === 'fire');
  if (place) {
    burst((place.x + 0.5) * TILE, (place.y + 0.5) * TILE, '#6f6a63', 14);
    addCombatGlyph((place.x + 0.5) * TILE, (place.y + 0.5) * TILE, '\u2022', '#9a9188', -58);
  }
  if (typeof updateInteractionUi === 'function') updateInteractionUi();
}

/** The plot the city sells, or null on every floor that is not the city. */
function cityHousePlot() {
  if (!isCityDepth(dungeon.depth)) return null;
  return dungeon.city?.blocks.find(({ kind }) => kind === 'plot') ?? null;
}

/** The jail, and the one door it has, on the floor the city stands on. */
function cityJailBlock() {
  if (!isCityDepth(dungeon.depth)) return null;
  return dungeon.city?.blocks.find(({ kind }) => kind === 'jail') ?? null;
}

function cityJailDoor() {
  const blocks = dungeon.city?.blocks;
  if (!blocks) return null;
  const index = blocks.findIndex(({ kind }) => kind === 'jail');
  if (index < 0) return null;
  return doorDefinitions.find((door) => door.roomIndex === index) ?? null;
}

/** What stands in the house: bought furniture, and a marker where it could go. */
const HOUSE_PROP_VISUALS = Object.freeze({
  bed: Object.freeze({
    path: CAMP_BEDROLL_PATH,
    frames: Object.freeze([CAMP_BEDROLL_PATH]),
    size: 58,
    screenOffsetY: -2,
    light: null,
    interactionId: 'house-rest',
  }),
  chest: Object.freeze({
    path: CAMP_CHEST_PATH,
    frames: Object.freeze([CAMP_CHEST_PATH]),
    size: 60,
    screenOffsetY: -6,
    light: null,
    interactionId: 'camp-stash',
  }),
  hearth: Object.freeze({
    path: CAMP_FIRE_FRAMES[0],
    frames: CAMP_FIRE_FRAMES,
    size: 60,
    screenOffsetY: -10,
    light: Object.freeze({ color: '#d88447', radius: 2.3, beam: false }),
    interactionId: 'campfire',
  }),
  slot: Object.freeze({
    path: 'item/misc/misc_box.png',
    frames: Object.freeze(['item/misc/misc_box.png']),
    size: 48,
    screenOffsetY: -4,
    light: null,
    interactionId: 'house-slot',
  }),
});

function housePropsFor() {
  const plot = cityHousePlot();
  if (!plot) return [];
  // Пустой дом пуст: в нём только маклер, и он не реквизит, а горожанин.
  if (!run.house.owned) return [];
  return houseSlots(plot).map(({ furnitureId, x, y }) => {
    const installed = run.house.furniture.includes(furnitureId);
    const visual = HOUSE_PROP_VISUALS[installed ? furnitureId : 'slot'];
    return Object.freeze({
      id: `house-${furnitureId}`,
      furnitureId,
      ...visual,
      gridX: x,
      gridY: y,
      x: x + 0.5,
      y: y + 0.5,
      phase: 0,
    });
  });
}

/** Rebuilds the environment so the hero's own things live beside the dungeon's. */
function applyCampProps() {
  const withoutPlaced = dungeonEnvironment.props.filter(({ id }) => (
    !String(id).startsWith('camp-') && !String(id).startsWith('house-')
  ));
  const props = [...withoutPlaced, ...campPropsFor(run.floor.camp), ...housePropsFor()];
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

/**
 * Именной, с которым ещё не поговорили.
 *
 * Разговорчивый именной нейтрален до ответа: пока герой не выбрал, он не
 * нападает. Иван: «не делать так, что у игрока идеальный забег, но его убил
 * очень сильный враг просто из ниоткуда». Стоит герою отказать — монстр
 * становится обычным врагом и из этого списка пропадает.
 */
/** Как называется то, что у героя в руке. Пусто — руки пусты. */
function equippedWeaponName() {
  const held = equippedItem('hand1');
  return held ? itemPresentation(presentedItem(held), itemDetailLanguage).name : '';
}

function nearbyParley() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return monsters.find((monster) => (
    parleyFor(monster.id)
    && parleyStillOpen(monster)
    && monster.dead === 0
    && !monster.provoked
    && cellStepDistance(cell, { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) }) <= 1
  )) ?? null;
}

/**
 * Что на этаже ждёт нажатия, а что срабатывает само.
 *
 * Ловушка — на то и ловушка: на неё наступают, и она бьёт. Всё остальное на
 * полу — источник, алтарь, вскрытый саркофаг — вещи, к которым подходят, и
 * подошедший должен сперва прочитать, что это.
 */
const EVENT_ACTIONS = Object.freeze({
  fountain: 'drink',
  'blood-altar': 'attune',
  sarcophagus: 'plunder',
});

/** Столько золота лежит во вскрытом саркофаге на этой глубине. */
const eventGold = (event) => event.definition.value * 5 + dungeon.depth;

function eventCardValue(event) {
  if (event.definition.effect === 'heal') {
    return Math.min(event.definition.value, currentHeroStats().maxHp - hero.hp);
  }
  if (event.definition.effect === 'maxHp') return event.definition.value;
  return eventGold(event);
}

function nearbyFloorEvent() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return eventDefinitions.find((event) => (
    EVENT_ACTIONS[event.id]
    && cellStepDistance(cell, { x: Math.floor(event.x / TILE), y: Math.floor(event.y / TILE) }) <= 1
  )) ?? null;
}

/**
 * Что стоящее на этаже делает, когда его трогают.
 *
 * Один и тот же ход и для ловушки, наступившей сама, и для источника, из
 * которого решили напиться: событие исчезает с пола, записывается в этаж и
 * оставляет после себя то, ради чего оно там стояло.
 */
function triggerFloorEvent(event) {
  const index = eventDefinitions.indexOf(event);
  if (index < 0 || runStatus !== 'playing' || hero.dead) return false;
  const { effect, value, path } = event.definition;
  eventDefinitions.splice(index, 1);
  run.floor.resolved.push(event.instanceId);
  if (effect === 'heal') {
    const healed = Math.min(value, currentHeroStats().maxHp - hero.hp);
    if (healed > 0) hero.hp += healed;
    playSound('spell-heal');
    showLootToast(
      { icon: 'derived/hud/heart.png', rarity: 1 },
      healed > 0 ? formatDeltas({ heal: healed }) : consumableReport().healedFull,
      healed > 0 ? 'heal' : 'info',
    );
  } else if (effect === 'maxHp') {
    raiseHeroMaxHp(value);
    playSound('spell-toggle');
    showLootToast({ icon: 'derived/hud/heart.png', rarity: 3 }, formatDeltas({ maxhp: value }), 'buff');
  } else if (effect === 'damage') {
    if (event.id === 'blade-trap') {
      detectedTrapIds.add(event.instanceId);
      burst(event.x, event.y - 4, '#b4a597', 12);
      addImpactWave(event.x, event.y, '#aa6954', 38, 1);
    }
    showLootToast({ path, rarity: 0 }, formatDeltas({ heal: -value }), 'trap');
    playSound('trap');
    damageHero(value, { source: `trap:${event.id}` });
  } else {
    // Монета в подписи, а не картинка саркофага: «+11» рядом с гробницей
    // читается как одиннадцать гробниц, и ровно так его и прочитали.
    const reward = eventGold(event);
    gold += reward;
    playSound('gold');
    showLootToast({ icon: GOLD_ICON_PATH, rarity: 2 }, formatDeltas({ gold: reward }));
  }
  if (event.definition.status && !hero.dead) {
    applyHeroStatus(event.definition.status.id, event.definition.status.duration);
  }
  playerHasActed = true;
  updateInteractionUi();
  updateHud();
  persistRun();
  return true;
}

/** Кого ведьма может купить: первый зверь в отряде, если он есть. */
function firstCompanionName() {
  const record = run.companions[0];
  return record ? companionName(record.id, itemDetailLanguage) : '';
}

/**
 * Зверь уходит за ведьмой.
 *
 * Отряд пересобирается целиком: место в нём — это индекс, и оставшиеся должны
 * встать заново, иначе второй зверь остался бы стоять на месте первого.
 */
function surrenderCompanion() {
  if (run.companions.length === 0) return false;
  run.companions = run.companions.slice(1);
  allies = allies.filter((ally) => !ally.companion);
  updateAllySlots();
  return true;
}

/**
 * Осталось ли о чём говорить.
 *
 * Разговор бывает один. Уже отвеченный этаж помнит в `spoken`, и перезагрузка
 * не открывает его заново — иначе благословение Роки, нож Джори и пять тысяч
 * демона брались бы столько раз, сколько игрок готов перезагружаться. Душа же
 * продаётся один раз на забег: предлагать второй раз нечего.
 */
function parleyStillOpen(monster) {
  if (run.floor.spoken?.includes(monster.instanceId)) return false;
  return !(run.soulSold && parleyFor(monster.id)?.kind === 'soul');
}

/**
 * Что лежит под ногами и рядом.
 *
 * Монеты сюда не попадают: их не с чем перепутать и не на что посмотреть, а
 * кнопка на каждой горсти превратила бы дорогу в перечисление. Всё остальное
 * — вещь, у которой есть имя, редкость и картинка, и она ждёт нажатия.
 */
function nearbyGroundLoot() {
  if (runStatus !== 'playing') return [];
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return lootDefinitions.filter((loot) => (
    !loot.definition.gold
    && cellStepDistance(cell, {
      x: Math.floor(loot.x / TILE),
      y: Math.floor(loot.y / TILE),
    }) <= 1
  ));
}

function nearbyCampProp(interactionId) {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return dungeonEnvironment.props.find((prop) => (
    prop.interactionId === interactionId
    && cellStepDistance(cell, { x: prop.gridX, y: prop.gridY }) <= 1
  )) ?? null;
}

function houseDeedDecision() {
  return canBuyHouse({
    house: run.house,
    gold,
    backpackCount: backpackItems.filter(Boolean).length,
    capacity: currentBackpackCapacity(),
  });
}

/** The hero's own voice: the body chosen in the editor decides who cries out. */
function heroVoice(soundId) {
  return heroVoiceSound(soundId, playerVoice(playerAppearance));
}

/** A night's sleep, wherever it was taken. Always fills the clock. */
function sleepOnIt() {
  const slept = sleep(hero.rest);
  if (!slept.ok) return false;
  hero.rest = slept.rest;
  playerHasActed = true;
  renderHungerHud();
  renderCharacterSheet();
  updateHud();
  persistRun();
  showLootToast({ path: CAMP_BEDROLL_PATH, rarity: 2 }, restCopy(itemDetailLanguage).slept, 'restore');
  return true;
}

function houseRestDecision() {
  return resolveHouseRest({
    house: run.house,
    hp: hero.hp,
    maxHp: currentHeroStats().maxHp,
    hunger: hero.hunger,
  });
}


/** Puts one authored item straight into the backpack, if there is room for it. */
function grantItem(id, requestedUid, powerId = null) {
  if (backpackItems.filter(Boolean).length >= currentBackpackCapacity()) return false;
  const state = currentItemState();
  // Номер обещанного тоже может быть занят: подарки именных и призы считаются
  // от того, кто их дал, а встретить его дважды за забег никто не запрещал.
  const uid = freeItemUid(requestedUid);
  // Only gear carries affixes; a tool's record is the item and its uid.
  const definition = lootById(id);
  const record = definition?.slot
    ? { id, uid, affixIds: [], artifactPowerId: powerId, artifactCurseId: null }
    : { id, uid };
  applyItemState({
    ...state,
    items: [...state.items, record],
    inventory: [...state.inventory, uid],
  });
  renderPack();
  return true;
}

/** Paying for the deed also hands over the stone that leads back to it. */
function purchaseHouse() {
  const result = buyHouse({
    house: run.house,
    gold,
    backpackCount: backpackItems.filter(Boolean).length,
    capacity: currentBackpackCapacity(),
  });
  if (!result.ok) return false;
  gold = result.gold;
  run.house = result.house;
  grantItem(HOME_STONE_ITEM_ID, `home-stone-${run.seed}`);
  applyCampProps();
  sendBrokerAway();
  playerHasActed = true;
  playSound('gold');
  burst(hero.x, hero.y - 10, '#d8bf68', 22);
  updateHud();
  updateGearUi();
  persistRun();
  return true;
}

/**
 * Ответ именному.
 *
 * Всё, что решает исход, решено в чистом модуле; здесь только применяется:
 * монеты, здоровье, оружие из руки и то, злится он или уходит.
 *
 * Договорившийся уходит с этажа и записывается в `floor.defeated` сразу, а не
 * когда дойдёт: перезагрузка посреди его дороги не должна вернуть его обратно
 * с тем же требованием.
 */
function answerParley(target, option) {
  const monster = target?.value;
  if (target?.kind !== 'parley' || !monster || monster.dead > 0) return false;
  let result = null;
  try {
    result = resolveParley({
      monsterId: monster.id,
      option,
      depth: dungeon.depth,
      // Жребий выводится из сида забега: слепую покупку нельзя переиграть
      // перезагрузкой, иначе это не выбор, а процедура.
      seed: run.seed,
      gold,
      hp: hero.hp,
      maxHp: currentHeroStats().maxHp,
      weaponName: equippedWeaponName(),
      companionName: firstCompanionName(),
      foodCount: interactionResourceCount(RAW_MEAT_ITEM_ID),
      skills: hero.skills,
      attributes: hero.attributes,
      language: itemDetailLanguage,
    });
  } catch (error) {
    reportFrameFailure(`parley:${monster.id}`, error);
    return false;
  }
  if (!result.ok) return false;
  // Отдать нечего — значит и разговор не состоялся: лучше ничего, чем монстр,
  // ушедший с платой, которой герой не внёс.
  if (result.takesWeapon && !surrenderWeapon()) return false;
  if (result.takesCompanion && !surrenderCompanion()) return false;
  if (result.takesFood && !consumeInteractionResources([{ id: RAW_MEAT_ITEM_ID, amount: 1 }])) return false;
  /*
   * Некуда положить — значит и покупать нечего.
   *
   * Иначе золото ушло бы, а вещь не пришла: в полном рюкзаке `grantItem`
   * молча отказывает, и игрок увидел бы только пустой кошелёк.
   */
  if (result.grantsItemId && backpackItems.filter(Boolean).length >= currentBackpackCapacity()) {
    playSound('ui-close');
    showLootToast(
      { path: monster.spritePath, rarity: 0 },
      itemDetailLanguage === 'en' ? 'Your pack is full' : 'Рюкзак полон',
      'refused',
    );
    return false;
  }
  gold = Math.max(0, gold + result.goldDelta);
  if (result.heal > 0) hero.hp = Math.min(currentHeroStats().maxHp, hero.hp + result.heal);
  // Плата кровью берётся сразу и никогда не убивает: разговор — не ловушка.
  if (result.hpCost > 0) {
    hero.hp = Math.max(1, hero.hp - result.hpCost);
    addCombatGlyph(hero.x, hero.y, `\u2212${result.hpCost}{heal}`, '#c2453c', -60);
  }
  if (result.grantsItemId) {
    grantItem(
      result.grantsItemId,
      `parley-${monster.id}-${run.seed}-${dungeon.depth}`,
      result.grantsPowerId,
    );
  }
  if (result.respec) applyRespec();
  if (result.revealsFloor) {
    revealFromScroll({ whole: true });
    refreshVisibleSecrets();
  }
  /*
   * Услышали все.
   *
   * Череп говорит правду бесплатно, и в этом вся цена: этаж открывается
   * целиком, но встаёт тоже целиком. Нейтральных это не касается — им нечего
   * будить, они и так не спят.
   */
  if (result.wakesFloor) {
    for (const other of monsters) {
      if (other.dead > 0 || other.neutral) continue;
      other.alerted = other.pursuit;
      other.alertFlash = 0.5;
    }
  }
  // Сделка есть сделка: она переживает и этаж, и смерть, и перезагрузку.
  if (result.soldSoul) run.soulSold = true;
  if (result.damageMultiplier > 1) {
    // Проигранное пари злит по-настоящему: тот же Юф, но бьёт заметно больнее.
    monster.damage = Math.max(1, Math.round(monster.damage * result.damageMultiplier));
  }
  if (result.hpMultiplier > 1) {
    monster.hp = Math.round(monster.hp * result.hpMultiplier);
    monster.maxHp = Math.round(monster.maxHp * result.hpMultiplier);
  }
  if (result.hostile) {
    monster.provoked = true;
    monster.alerted = monster.pursuit;
    monster.alertFlash = 0.5;
    addCombatGlyph(monster.x, monster.y, '!', '#e0603f', -68);
  }
  if (result.leaves) sendNamedAway(monster);
  else if (!run.floor.spoken.includes(monster.instanceId)) run.floor.spoken.push(monster.instanceId);
  playerHasActed = true;
  playSound(result.goldDelta !== 0 ? 'gold' : result.heal > 0 ? 'spell-heal' : 'ui-tap');
  showLootToast(
    { path: monster.spritePath, rarity: result.hostile ? 0 : 2 },
    result.message,
    parleyFeedbackKind(result, { junk: result.grantsItemId === PARLEY_WARES.junk }),
  );
  updateHud();
  renderPack();
  persistRun();
  return true;
}

const PRIZE_COPY = Object.freeze({
  ru: 'Из того, что осталось от Глоркса, забрать можно ровно одно.',
  en: 'One thing can be taken from what is left of Gloorx.',
});

/**
 * Что остаётся от того, кто приходил за душой.
 *
 * Роняет он это всегда, а не только за сделку: тир девять и примета «здесь
 * очень тихо» — тот, кто такое свалил, заслужил лучшее в игре и без «да».
 * Места в рюкзаке может не быть, и тогда вещь ждёт на забеге, а не пропадает.
 */
function claimNamedPrize(monster) {
  if (parleyFor(monster.id)?.kind !== 'soul') return;
  run.prize = {
    id: PARLEY_SOUL_PRIZE.id,
    powerId: PARLEY_SOUL_PRIZE.powerId,
    uid: `prize-${monster.instanceId}`,
  };
}

/** Выдать обещанное, как только в рюкзаке появилось место. */
function claimPendingPrize() {
  const prize = run.prize;
  if (!prize) return;
  if (!grantItem(prize.id, prize.uid, prize.powerId)) {
    showLootToast({ id: prize.id }, 'full');
    return;
  }
  run.prize = null;
  showLootToast({ id: prize.id, rarity: 3 }, PRIZE_COPY[itemDetailLanguage === 'en' ? 'en' : 'ru'], 'item');
}

const THIEF_COPY = Object.freeze({
  ru: Object.freeze({
    robbed: (item) => `Морис срезает ${item} с твоего пояса и бросается прочь.`,
    nothing: 'Морис заглядывает в пустой рюкзак и уходит разочарованный.',
    recovered: (item) => `Морис падает, и ${item} возвращается тебе.`,
    full: 'Морис падает, но рюкзак полон — освободи место и подбери.',
  }),
  en: Object.freeze({
    robbed: (item) => `Maurice cuts the ${item} off your belt and bolts.`,
    nothing: 'Maurice looks into an empty pack and leaves, disappointed.',
    recovered: (item) => `Maurice goes down, and the ${item} is yours again.`,
    full: 'Maurice goes down, but your pack is full — make room and pick it up.',
  }),
});

const thiefCopy = () => THIEF_COPY[itemDetailLanguage === 'en' ? 'en' : 'ru'];

/**
 * Вор обчищает того, кто подошёл вплотную.
 *
 * Берёт из рюкзака и только из рюкзака: оружие в руке и надетая броня его не
 * интересуют. Иван: «самое ценное — то, что в руках и на теле — он не трогает».
 * Что именно он возьмёт, решает тот же несменяемый жребий: перезагрузкой
 * выбрать себе потерю полегче не выйдет.
 */
function robHero(monster) {
  monster.stole = true;
  const pack = backpackItems.filter(Boolean);
  if (pack.length === 0) {
    playSound('ui-close');
    showLootToast({ path: monster.spritePath, rarity: 0 }, thiefCopy().nothing);
    sendNamedAway(monster);
    return true;
  }
  const бросок = parleyRoll(run.seed, dungeon.depth, THIEF_MONSTER_ID);
  const добыча = pack[Math.min(pack.length - 1, Math.floor(бросок * pack.length))];
  const record = itemInstances.get(добыча.uid);
  if (!record) return false;
  const state = currentItemState();
  applyItemState({
    ...state,
    items: state.items.filter((item) => item.uid !== record.uid),
    inventory: state.inventory.filter((uid) => uid !== record.uid),
  });
  run.thief = {
    record: {
      id: record.id,
      uid: record.uid,
      affixIds: [...(record.affixIds ?? [])],
      artifactPowerId: record.artifactPowerId ?? null,
      artifactCurseId: record.artifactCurseId ?? null,
      ...(record.stack !== undefined ? { stack: record.stack } : {}),
    },
    floors: 0,
  };
  playSound('ui-close');
  showLootToast(
    { path: monster.spritePath, rarity: 0 },
    thiefCopy().robbed(itemPresentation(presentedItem(record), itemDetailLanguage).name),
    'loss',
  );
  // Уходит он не «своей дорогой», а с добычей: в `floor.defeated` его пишет
  // тот же `sendNamedAway`, а `run.thief` переносит его на следующий этаж.
  sendNamedAway(monster);
  updateHud();
  persistRun();
  return true;
}

/** Подошёл ли герой вплотную к тому, кто ещё не обчистил его. */
function tickThief(monster) {
  if (monster.id !== THIEF_MONSTER_ID || monster.stole || monster.provoked) return false;
  if (runStatus !== 'playing' || !playerHasActed) return false;
  const рядом = cellStepDistance(
    { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) },
    { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) },
  ) <= 1;
  return рядом ? robHero(monster) : false;
}

/** Догнал — вернул. Украденное отдаётся целиком, со всеми своими свойствами. */
function recoverStolenItem(monster) {
  if (monster.id !== THIEF_MONSTER_ID || !run.thief) return;
  const record = run.thief.record;
  if (backpackItems.filter(Boolean).length >= currentBackpackCapacity()) {
    showLootToast({ path: monster.spritePath, rarity: 1 }, thiefCopy().full, 'refused');
    return;
  }
  const state = currentItemState();
  applyItemState({
    ...state,
    items: [...state.items, { ...record }],
    inventory: [...state.inventory, record.uid],
  });
  run.thief = null;
  const вещь = itemInstances.get(record.uid);
  showLootToast(
    { path: monster.spritePath, rarity: 2 },
    thiefCopy().recovered(вещь ? itemPresentation(presentedItem(вещь), itemDetailLanguage).name : ''),
    'item',
  );
}

/** Та же служба, но в городе и дороже: жрец всегда на месте, и это удобство. */
function payPriestForForgetting() {
  const decision = canRespec({
    skills: hero.skills,
    attributes: hero.attributes,
    gold,
    source: 'priest',
  });
  if (!decision.ok) return false;
  gold -= decision.price;
  applyRespec();
  playerHasActed = true;
  playSound('spell-heal');
  burst(hero.x, hero.y - 8, '#9ab6d8', 20);
  showLootToast(
    { path: 'mon/deep_elf_high_priest.png', rarity: 2 },
    itemDetailLanguage === 'en'
      ? 'The priest lays a palm on your brow. The points are yours again.'
      : 'Жрец кладёт ладонь на лоб. Очки снова твои.',
    'restore',
  );
  updateHud();
  persistRun();
  return true;
}

/**
 * Забыть выученное.
 *
 * Возвращает героя туда, кем он вышел из ворот: те же два очка создания и те
 * же два навыка, а всё вложенное сверх — обратно в карман. Уровень, опыт и
 * вещи сделка не трогает.
 */
function applyRespec() {
  const before = respecHero({ level: hero.level, build: run.build ?? null, gifts: hero.attributeGifts });
  hero.skills = cloneSkillState(before.skills);
  syncKnownSpells();
  hero.attributes = cloneAttributeState(before.attributes);
  hero.hp = Math.min(hero.hp, currentHeroStats().maxHp);
  renderCharacterAttributes();
  renderCharacterSkills();
  return true;
}

/** Отдать то, что в руке. Рюкзак может быть полон — тогда отдать не выйдет. */
function surrenderWeapon() {
  const held = equippedItem('hand1');
  if (!held) return false;
  const unequipped = unequipItem(currentItemState(), 'hand1');
  if (!unequipped.ok) return false;
  const stripped = salvageInventoryItems(unequipped.state, [held.uid]);
  if (!stripped.ok) return false;
  applyItemState(stripped.state);
  return true;
}

/**
 * Договорившийся именной уходит своей дорогой — тем же шагом, что и маклер,
 * продавший дом. Исчезнуть на месте разговора он не должен: с этим уже
 * разбирались, и вывод был тот же.
 */
function sendNamedAway(monster) {
  if (!run.floor.defeated.includes(monster.instanceId)) {
    run.floor.defeated.push(monster.instanceId);
  }
  const exit = dungeon.exit;
  if (!exit) {
    monster.dead = 0.01;
    return;
  }
  monster.leaving = { x: exit.x, y: exit.y };
  monster.route = [];
  monster.patrolPause = 0;
  monster.leavingPatience = 0;
}

/**
 * Дом продан — маклеру здесь больше нечего делать.
 *
 * Уходит он к ближайшим воротам; если города вокруг него почему-то нет —
 * плана без ворот не бывает, но код не должен на это рассчитывать — он просто
 * уходит из виду. В сохранении его уже нет: `createMonsters` не ставит
 * маклера, когда дом куплен, так что перезагрузка посреди его дороги не
 * вернёт его обратно к двери.
 */
function sendBrokerAway() {
  const broker = monsters.find((monster) => monster.id === CITY_BROKER_ID && monster.dead === 0);
  if (!broker) return false;
  const from = { x: Math.floor(broker.x / TILE), y: Math.floor(broker.y / TILE) };
  const достижимо = (cell) => Boolean(cell) && findPath(cell.x + 0.5, cell.y + 0.5, {
    allowHidden: true,
    start: from,
    terrain: broker.terrain,
  }).length > 0;
  /*
   * Ворота — если до них есть дорога. Закрытую дверь собственного дома он не
   * откроет: двери в игре открывает только герой, и человек, запертый в
   * комнате, растворился бы прямо посреди неё — ровно то, чего Иван просил не
   * делать. Тогда он доходит до порога и выходит за него; дверь за ним
   * закрыта, но ушёл он в неё, а не в воздух.
   */
  for (const цель of [cityDepartureCell(dungeon.gates, from), houseDoorstepCell(cityHousePlot())]) {
    if (!достижимо(цель)) continue;
    broker.leaving = цель;
    broker.route = [];
    broker.patrolPause = 0;
    broker.leavingPatience = 0;
    return true;
  }
  broker.dead = 0.01;
  return true;
}

/** Клетка внутри дома, примыкающая к его двери: порог, с которого выходят. */
function houseDoorstepCell(plot) {
  const door = plot?.door;
  const interior = plot?.interior;
  if (!door || !interior) return null;
  const candidates = [
    { x: door.x, y: door.y - 1 },
    { x: door.x, y: door.y + 1 },
    { x: door.x - 1, y: door.y },
    { x: door.x + 1, y: door.y },
  ];
  return candidates.find(({ x, y }) => isWalkable(x, y)
    && x >= interior.x && x < interior.x + interior.w
    && y >= interior.y && y < interior.y + interior.h) ?? null;
}

function installHouseFurniture(furnitureId) {
  const result = installFurniture({ house: run.house, furnitureId, gold });
  if (!result.ok) return false;
  gold = result.gold;
  run.house = result.house;
  applyCampProps();
  playerHasActed = true;
  playSound('gold');
  burst(hero.x, hero.y - 10, '#c8b184', 18);
  updateHud();
  persistRun();
  return true;
}

function restAtHouse() {
  const result = houseRestDecision();
  // A hero at full health used to be refused the bed entirely — which, now
  // that sleep is what unlocks what you learned, would have meant the healthy
  // could never spend a skill point. Lying down is worth it for the night even
  // when there is nothing to mend.
  if (!result.ok) return result.reason === 'nothing-to-heal' ? sleepOnIt() : false;
  sleepOnIt();
  hero.hp = result.hp;
  hero.hunger = result.hunger;
  currentHungerStageId = hungerStage(hero.hunger).id;
  hungerAutosaveElapsed = 0;
  playerHasActed = true;
  burst(hero.x, hero.y - 10, '#9db4c8', 16);
  addCombatGlyph(hero.x, hero.y, `+${result.healed}{heal}`, '#8bc59c', -70);
  playSound('spell-heal');
  updateHud();
  persistRun();
  return true;
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
  if (!result.ok) return result.reason === 'nothing-to-heal' ? sleepOnIt() : false;
  sleepOnIt();
  hero.hp = result.hp;
  hero.hunger = result.hunger;
  run.floor.camp = result.camp;
  currentHungerStageId = hungerStage(hero.hunger).id;
  hungerAutosaveElapsed = 0;
  playerHasActed = true;
  burst(hero.x, hero.y - 10, '#9db4c8', 14);
  addCombatGlyph(hero.x, hero.y, `+${result.healed}{heal}`, '#8bc59c', -70);
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
        event.payload.stored ? 'item' : 'refused',
      );
      continue;
    }
    if (event.type === 'meat-cooked') {
      showLootToast(lootById(event.payload.itemId), event.payload.amount, 'item');
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
      // Ключ от всех сундуков носят, а не тратят: важно только, есть ли он.
      masterKey: interactionResourceCount(CHEST_RESOURCE_IDS.masterKey) > 0,
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
    const capabilities = currentSkillCapabilities();
    // A jaw trap answers to the trapper, a bait to the poisoner.
    const tier = selection.item.placeableTrap === PLAYER_BAIT_KIND
      ? capabilities.poisoncraftRank ?? 0
      : capabilities.trapPlacementTier ?? 0;
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

/**
 * Что уходит с тела, если надеть выбранное.
 *
 * Сравнение показывало цифры «после надевания», но не говорило, с чем
 * сравнивает. С одноручным оружием это угадывалось, с двуручным — нет: оно
 * занимает обе руки и снимает заодно щит. Иван: «когда я надеваю новое оружие,
 * но держу при этом двуручное, как мне понять, с чем сравнивается оружие,
 * которое я нажал?».
 *
 * Считается оно тем же способом, каким считаются и сами цифры: примеркой. Что
 * из надетого исчезло после неё — то и уходит.
 */
function replacedItemNames(selection) {
  if (!selection?.item.slot || selection.source === 'equipment') return [];
  const state = currentItemState();
  const result = equipInventoryItem(state, selection.item.uid);
  if (!result.ok) return [];
  const было = new Set(Object.values(state.equipment).filter(Boolean));
  const стало = new Set(Object.values(result.state.equipment).filter(Boolean));
  return [...было]
    .filter((uid) => !стало.has(uid))
    .map((uid) => itemInstances.get(uid))
    .filter(Boolean)
    .map((item) => itemPresentation(presentedItem(item), itemDetailLanguage).name);
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
  paintItemIcon(itemDetailIcon, displayItem);
  itemDetailDescription.textContent = presentation.description;
  itemDetailComparison.hidden = presentation.comparison.length === 0;
  const уходит = selection?.item.uid === item.uid ? replacedItemNames(selection) : [];
  itemDetailComparisonTitle.textContent = selection?.source === 'equipment'
    ? itemDetailLanguage === 'ru' ? 'После снятия' : 'After unequipping'
    : уходит.length > 0
      ? itemDetailLanguage === 'ru'
        ? `Вместо: ${уходит.join(', ')}`
        : `Replaces: ${уходит.join(', ')}`
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
  const secondary = !itemDetailOffer && selection && selection.item.uid === item.uid
    ? secondaryItemAction(selection)
    : null;
  itemDetailVariant.hidden = !secondary;
  if (secondary) {
    itemDetailVariant.textContent = secondary.label;
    itemDetailVariant.disabled = !secondary.enabled;
    itemDetailVariant.dataset.secondary = secondary.kind;
    const prefix = secondary.kind === 'variant'
      ? (itemDetailLanguage === 'ru' ? 'Иначе' : 'Alternative')
      : (itemDetailLanguage === 'ru' ? 'Ремесло' : 'Craft');
    itemDetailVariant.setAttribute(
      'aria-label',
      `${prefix}: ${secondary.label}${secondary.hint ? `. ${secondary.hint}` : ''}`,
    );
  }
  /**
   * Which hand.
   *
   * A one-handed weapon fits either, and the game used to pick — the first
   * empty slot, or the main hand, silently displacing whatever was there.
   * Ivan asked it to ask. With both hands empty there is nothing to ask
   * about, so the question appears exactly when it is one.
   */
  const menuLabels = currentMainMenuModel().labels;
  const handChoice = !itemDetailOffer
    && selection?.source === 'pack'
    && selection.item.uid === item.uid
    && allowedSlotsForItem(presentedItem(item)).join() === 'hand1,hand2'
    && Boolean(selected.hand1 || selected.hand2);
  itemDetailOffhand.hidden = !handChoice;
  if (handChoice) {
    itemDetailOffhand.textContent = menuLabels.offHand;
    itemDetailOffhand.setAttribute('aria-label', `${menuLabels.whichHand} ${menuLabels.offHand}`);
  }

  const action = itemDetailOffer ?? selectedActionModel(selection);
  fillTextWithIcons(itemDetailAction, handChoice ? menuLabels.mainHand : action.label);
  // У выбора руки своя подпись для чтения вслух: общая говорит «Надеть», а
  // кнопок здесь две, и надо знать, в какую именно.
  itemDetailAction.setAttribute(
    'aria-label',
    handChoice ? `${menuLabels.whichHand} ${menuLabels.mainHand}` : action.ariaLabel,
  );
  itemDetailAction.disabled = itemDetailOffer
    ? false
    : action.disabled || !selection || selection.item.uid !== item.uid;
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
  // The whole of the rest mechanic: nothing is lost, nothing is at risk, and
  // what you learned on the road waits until you have slept on it.
  if (!canSpendSkillPoints(hero.rest)) {
    return { ok: false, reason: 'needs-sleep', state: hero.skills };
  }
  const result = learnSkill({
    state: hero.skills,
    heroLevel: hero.level,
    runStatus,
    skillId,
    expectedRank,
    attributes: hero.attributes,
  });
  if (!result.ok) return result;
  hero.skills = result.state;
  // Новый ранг школы — новые заклинания на панели.
  syncKnownSpells();
  renderSpellBar();
  hero.hp = Math.min(hero.hp, currentHeroStats().maxHp);
  discoverNearbyTraps();
  updateGearUi();
  renderPack();
  updateHud();
  persistRun();
  return result;
}

/**
 * The three numbers, and the one button each of them has.
 *
 * A point spent here never comes back, so the button is the only way in and it
 * says what it costs by going dark when the pocket is empty. Sleep gates it for
 * the same reason it gates a skill: what you learned on the road waits until
 * you have slept on it.
 */
/** Какая характеристика сейчас раскрыта; ничего — обычное состояние. */
let openAttributeId = null;

function renderCharacterAttributes() {
  const copy = attributeCopy(itemDetailLanguage);
  const rested = canSpendSkillPoints(hero.rest);
  const points = hero.skills.points;
  characterAttributeTitle.textContent = itemDetailLanguage === 'ru' ? 'Характеристики' : 'Attributes';
  characterAttributePoints.textContent = `${copy.pointsLeft}: ${points}`;
  characterAttributeRows.replaceChildren(...ATTRIBUTE_IDS.map((id) => {
    const row = document.createElement('div');
    row.className = 'character-attribute-row';
    row.setAttribute('role', 'listitem');
    /**
     * Объяснение — по запросу, а не всегда.
     *
     * Три описания характеристик — двести тридцать пять знаков, и это две
     * трети всего текста экрана. Прочесть их нужно один раз, а висели они
     * каждый раз. Тап по названию раскрывает и прячет — тем же движением,
     * каким уже объясняются шкалы голода и сна.
     */
    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'character-attribute-name';
    name.textContent = copy[id].name;
    name.setAttribute('aria-expanded', String(openAttributeId === id));
    name.addEventListener('click', () => {
      openAttributeId = openAttributeId === id ? null : id;
      renderCharacterAttributes();
    });
    const description = document.createElement('span');
    description.textContent = copy[id].description;
    description.hidden = openAttributeId !== id;
    const value = document.createElement('output');
    value.textContent = String(hero.attributes[id]);
    const raise = document.createElement('button');
    raise.type = 'button';
    raise.className = 'character-attribute-raise';
    raise.textContent = '+';
    raise.dataset.attribute = id;
    raise.disabled = points < 1 || !rested || runStatus !== 'playing';
    raise.setAttribute('aria-label', `${copy.raise}: ${copy[id].name}`);
    row.append(name, description, value, raise);
    return row;
  }));
}

/** Spending one. The pool is the skill pool: one pocket, two things to buy. */
function raiseHeroAttribute(attribute) {
  if (!canSpendSkillPoints(hero.rest)) return 'needs-sleep';
  const result = raiseAttribute({
    attributes: hero.attributes,
    points: hero.skills.points,
    attribute,
    runStatus,
  });
  if (!result.ok) return result.reason;
  hero.attributes = result.attributes;
  hero.skills = { ...hero.skills, points: result.points, ranks: { ...hero.skills.ranks } };
  hero.hp = Math.min(hero.hp, currentHeroStats().maxHp);
  renderCharacterAttributes();
  renderCharacterSkills();
  updateHud();
  persistRun();
  return '';
}

/** Which skill the player is reading about. A point is spent on purpose, not by a stray tap. */
let selectedSkillId = null;

/** The branch of a school, drawn as pixel nodes joined by a line. */
function renderSkillBranch(target, branch) {
  target.replaceChildren(...branch.map((node) => {
    const pip = document.createElement('i');
    pip.dataset.node = node.state;
    return pip;
  }));
}

function clearSkillSelection() {
  selectedSkillId = null;
  characterSkillDetail.hidden = true;
}

function renderCharacterSkills() {
  const model = skillMenuModel({
    state: hero.skills,
    heroLevel: hero.level,
    runStatus,
    language: itemDetailLanguage,
    rankAdjustments: hero.skillStudy.rankAdjustments,
    attributes: hero.attributes,
    rested: canSpendSkillPoints(hero.rest),
  });
  characterSkills.hidden = !model.visible;
  characterSkillsTitle.textContent = model.title;
  characterSkillPoints.textContent = `${model.pointsLabel}: ${model.points}`;
  skillLadderCopy = { rank: model.ladderRankLabel, level: model.ladderLevelLabel };
  characterSkillGroups.replaceChildren(...model.groups.map((group) => {
    const section = document.createElement('section');
    section.className = 'character-skill-group';
    const heading = document.createElement('h4');
    heading.textContent = group.label;
    section.append(heading);
    for (const skill of group.skills) {
      // A row is now a choice, not a purchase: the tap opens the card below and
      // the point leaves the pocket only on «Изучить». The same fix the shop
      // got — «магазин: тап покупает мгновенно» was the same complaint.
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'character-skill-row';
      row.dataset.skillId = skill.id;
      row.setAttribute('aria-pressed', String(selectedSkillId === skill.id));
      const details = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = `${skill.name} ${skill.rank}/${skill.maxRank}${skill.rankAdjustmentLabel ? ` · ${skill.rankAdjustmentLabel}` : ''}`;
      const branch = document.createElement('div');
      branch.className = 'skill-branch';
      branch.setAttribute('aria-hidden', 'true');
      renderSkillBranch(branch, skill.branch);
      details.append(name, branch);
      const state = document.createElement('p');
      state.textContent = skill.canLearn ? skill.actionLabel : skill.reasonLabel;
      details.append(state);
      row.setAttribute('aria-label', `${skill.name}. ${skill.nextRankNote}. ${state.textContent}`);
      row.append(details);
      row.addEventListener('click', () => selectSkill(skill));
      section.append(row);
    }
    return section;
  }));
  const selected = model.groups
    .flatMap(({ skills }) => skills)
    .find(({ id }) => id === selectedSkillId) ?? null;
  if (selected) showSkillCard(selected);
  else clearSkillSelection();
}

/** Reading about a skill costs nothing; that is the whole point of the step. */
function selectSkill(skill) {
  selectedSkillId = skill.id;
  for (const row of characterSkillGroups.querySelectorAll('.character-skill-row')) {
    row.setAttribute('aria-pressed', String(row.dataset.skillId === skill.id));
  }
  showSkillCard(skill);
  requestAnimationFrame(() => {
    // Без прокрутки: карточка уже там, куда смотрит игрок.
    (skill.canLearn ? characterSkillLearn : characterSkillCancel).focus({ preventScroll: true });
  });
}

/**
 * Лестница рангов: по строке на ступень, и в каждой — что она даёт.
 *
 * До этого карточка показывала одно слитное описание («радиус 2/3/4 клеток»),
 * и игрок сам разбирался, какая цифра к какому рангу. Иван: «суть в том,
 * чтобы я удобно видел, что на каком уровне навыка я получаю». Ступень, на
 * которой герой уже стоит, помечена: тогда видно не только куда идти, но и
 * что уже куплено.
 */
function renderSkillLadder(skill, copy, list = characterSkillLadder) {
  if (!list) return;
  const attributes = attributeCopy(itemDetailLanguage);
  list.replaceChildren(...skill.ladder.map((step) => {
    const row = document.createElement('li');
    row.className = 'skill-ladder-step';
    row.dataset.state = step.rank <= skill.rank ? 'taken' : step.rank === skill.rank + 1 ? 'next' : 'later';
    const head = document.createElement('b');
    const need = [`${copy.rank} ${step.rank}`];
    if (Number.isInteger(step.heroLevel)) need.push(`${copy.level} ${step.heroLevel}`);
    if (step.attribute) need.push(`${attributes[step.attribute].short} ${step.attributeValue}`);
    head.textContent = need.join(' · ');
    const gains = document.createElement('span');
    gains.textContent = step.gains
      .map(({ label, value }) => (value ? `${label} ${value}` : label))
      .join(' · ');
    row.append(head, gains);
    return row;
  }));
}

function showSkillCard(skill) {
  /*
   * Карточка раскрывается под выбранной строкой, а не внизу списка.
   *
   * Она жила отдельным окошком в конце свитка, и нажатие на навык уводило туда
   * — через сорок строк от того места, куда смотрел игрок. Иван: «нажимаю на
   * какой-то скилл, и меня перематывает куда-то вниз; должно раскрываться вот
   * это конкретное поле, которое я нажал; я теряюсь в этом».
   *
   * Разметка остаётся одна: то же окошко просто переезжает под строку. Так
   * ничего не дублируется, и закрыть его — по-прежнему одна кнопка.
   */
  const строка = characterSkillGroups.querySelector(`[data-skill-id="${skill.id}"]`);
  if (строка && characterSkillDetail.previousElementSibling !== строка) {
    строка.after(characterSkillDetail);
  }
  characterSkillDetail.hidden = false;
  characterSkillDetailName.textContent = `${skill.name} ${skill.rank}/${skill.maxRank}`;
  renderSkillBranch(characterSkillDetailBranch, skill.branch);
  characterSkillDetailText.textContent = skill.description;
  renderSkillLadder(skill, skillLadderCopy);
  characterSkillDetailNext.textContent = skill.nextRankNote;
  characterSkillDetailCost.textContent = skill.costLabel;
  characterSkillLearn.textContent = skill.canLearn ? skill.actionLabel : skill.reasonLabel;
  characterSkillLearn.disabled = !skill.canLearn;
  characterSkillLearn.dataset.skillId = skill.id;
  characterSkillLearn.dataset.expectedRank = String(skill.trainedRank);
  characterSkillCancel.textContent = skill.cancelLabel;
}

characterSkillCancel.addEventListener('click', () => {
  clearSkillSelection();
  for (const row of characterSkillGroups.querySelectorAll('.character-skill-row')) {
    row.setAttribute('aria-pressed', 'false');
  }
  closeCharacterSheetButton.focus();
});

characterAttributeRows.addEventListener('click', (event) => {
  if (uiScreen !== 'character' || hero.dead || runStatus !== 'playing') return;
  const button = event.target.closest('.character-attribute-raise');
  if (!button || button.disabled) return;
  const refusal = raiseHeroAttribute(button.dataset.attribute);
  if (refusal) {
    // The same voice a refused camp uses: say the reason where the eye is.
    const said = attributeRefusalText(refusal, itemDetailLanguage);
    addCombatGlyph(hero.x, hero.y, said || '\u2191', '#9abfc0', -62);
    return;
  }
  playSound('chest');
  renderCharacterSheet();
});

characterSkillLearn.addEventListener('click', () => {
  if (uiScreen !== 'character' || hero.dead || runStatus !== 'playing') return;
  const skillId = characterSkillLearn.dataset.skillId;
  const expectedRank = Number(characterSkillLearn.dataset.expectedRank);
  if (!skillId || !Number.isInteger(expectedRank)) return;
  const result = learnHeroSkill(skillId, expectedRank);
  if (!result.ok) return;
  // The card stays open on the skill just learned, now showing the next step.
  renderCharacterSheet();
  characterSkillLearn.focus();
});

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
    if (!slot.empty) icon.src = spriteUrl(slot.icon);
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
    if (!slot.empty) icon.src = spriteUrl(slot.icon);
    const copy = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = slot.empty ? (ru ? 'Пусто' : 'Empty') : slot.name;
    const kind = document.createElement('small');
    // A slot is 56px wide on a 320px phone: «Выбери заклинание» was cut in half
    // there. One word says the same thing and fits.
    kind.textContent = slot.empty ? (ru ? 'Выбрать' : 'Choose') : slot.status;
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
    icon.src = spriteUrl(spell.icon);
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
  renderCharacterAttributes();
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

/**
 * The one window that describes a thing.
 *
 * `offer` is how somebody other than the backpack borrows it: the shop passes
 * its own verb, its own price and what to do if the player agrees, and gets
 * the same full-screen card with the same picture and the same type line.
 */
function openItemDetail(item, returnTarget = null, offer = null) {
  if (!item || salvageMode) return;
  itemDetailItem = item;
  itemDetailReturnTarget = returnTarget;
  itemDetailOffer = offer;
  renderItemDetail(item);
  // Whichever shell the window opened over is the one that must stop taking taps.
  (offer ? merchantShopCard : inventoryShell).inert = true;
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
  const offer = itemDetailOffer;
  itemDetailOffer = null;
  (offer ? merchantShopCard : inventoryShell).inert = false;
  const returnTarget = itemDetailReturnTarget;
  itemDetailItem = null;
  itemDetailReturnTarget = null;
  if (offer) {
    if (restoreFocus) requestAnimationFrame(() => closeMerchantShopButton.focus());
    return true;
  }
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

/**
 * Стоит ли герой на лестнице вниз или рядом с ней.
 *
 * Лестница — такая же вещь на этаже, как дверь: шаг на неё никуда не уводит,
 * он только ставит её в колонку «что рядом». Спуск — кнопка в карточке.
 */
function nearExitStair() {
  return runStatus === 'playing'
    && cellStepDistance({ x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) }, dungeon.exit) <= 1;
}

/** Клетка прибытия — она же лестница наверх; в городе её нет. */
function nearAscentStair() {
  return dungeon.depth > CITY_DEPTH
    && runStatus === 'playing'
    && cellStepDistance({ x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) }, dungeon.spawn) <= 1;
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
  // Nothing in the dungeon flies yet, so a chasm is simply not floor here.
  return x >= 0 && y >= 0 && x < WORLD_WIDTH && y < WORLD_HEIGHT && (world[y][x] === '.' || world[y][x] === '~');
}

function isHeroWalkable(x, y) {
  if (x < 0 || y < 0 || x >= (world[0]?.length ?? 0) || y >= world.length) return false;
  // A chasm is floor to somebody who is flying and a wall to everybody else.
  if (world[y][x] === CHASM_CELL) return currentHeroMagic().flight === true;
  return world[y][x] === '.' || world[y][x] === '~';
}

/**
 * What happens when the floor is not there any more.
 *
 * Flight can end for reasons the hero did not choose — a ring unequipped, a
 * dispel, a save reloaded next to a rule change — and the honest answer to
 * standing in mid-air is to fall. The fall is a real cost and never a death
 * sentence: a share of the hero's health and a landing on the nearest ground,
 * which is exactly what a hole in the floor should be worth.
 *
 * Switching flight off yourself is refused instead, so this can only ever fire
 * for something that happened to the hero rather than something they did.
 */
function updateHeroFooting() {
  if (hero.dead || runStatus !== 'playing') return;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  if (world[cell.y]?.[cell.x] !== CHASM_CELL || currentHeroMagic().flight) return;
  fallIntoChasm(cell);
}

/**
 * Down the hole.
 *
 * «Пусть он падает на этаж или на два ниже в зависимости от дыры.» So a
 * chasm is a shaft, not a hazard tile: the floor underneath is a real floor
 * and the hero arrives on it, somewhere the fall put them rather than at the
 * stairs. Which floor is the hole's own answer — every cell of one hole gives
 * the same one — and a two-floor drop costs twice as much health, because it
 * skipped twice as much dungeon.
 *
 * The bottom of the written road is still the bottom: at the deepest floor
 * the shaft has nowhere to lead, and the fall is a hard landing in place.
 */
/**
 * Пропасть на этаже стража — не обходная лестница. Аудит забега нашёл её на
 * каждом двадцатом таком этаже: прыжок уводил вниз мимо живого стража, хотя
 * лестница была заперта. Пока лестница заперта, заперт и провал.
 */
function chasmGuarded() {
  return !canLeaveDungeonFloor({
    depth: dungeon.depth,
    status: runStatus,
    guardianDefeated: objectiveBossDefeated(),
  });
}

function fallIntoChasm(cell) {
  const floors = Math.max(1, chasmFallFloors(world, cell, dungeon.seed));
  const damage = Math.max(1, Math.round(currentHeroStats().maxHp * CHASM_FALL_PERCENT * floors / 100));
  // Полёт кончился над провалом на этаже стража: удар есть, спуска нет.
  let target = chasmGuarded() ? dungeon.depth : Math.min(DEEPEST_DEPTH, dungeon.depth + floors);
  // Двойное падение не перелетает логово: кто падает мимо этажа стража, тот
  // приземляется у него.
  for (let floor = dungeon.depth + 1; floor < target; floor += 1) {
    if (chapterGuardianForDepth(floor, run.branch)) {
      target = floor;
      break;
    }
  }
  addCombatGlyph(hero.x, hero.y, chasmCopy(itemDetailLanguage).fell, '#9aa4ad', -64);
  burst(hero.x, hero.y, '#6f6a63', 18);
  // `hurt` в каталоге нет — герой стонет голосом своего пола.
  playSound(heroVoice('hero-hurt'));
  damageHero(damage, { direct: true, source: 'chasm', impactColor: '#6f6a63' });
  // Dying in the shaft ends the run where the run was: nobody lands dead on a
  // floor they never saw.
  if (hero.dead || runStatus !== 'playing') return;
  if (target === dungeon.depth) {
    // Nowhere further to fall: put the hero back on the nearest solid ground.
    const landing = nearestFooting(cell);
    if (landing) placeHeroAtCell(landing);
    hero.path = [];
    return;
  }
  run = travelRunToDepth(captureRun(), target, chasmLandingCell(target));
  hero.hp = run.hero.hp;
  hero.hunger = run.hero.hunger;
  replaceFloor(run.depth);
  hero.path = [];
  hero.pendingAttack = null;
  playSound('hit-heavy');
  announceFloor();
}

/** Where a fall puts you: not the stairs — somewhere the floor had room. */
function chasmLandingCell(depth) {
  const level = generateDungeon({
    seed: run.seed,
    depth,
    branch: run.branch,
    scalingVersion: run.scalingVersion,
    difficulty: run.difficulty,
    lootAbundance: run.lootAbundance,
  });
  // Только туда, откуда пешком доходят до лестницы: островок за пропастью
  // был ловушкой без выхода.
  return pickChasmLanding(level, run.seed, depth);
}

/** The closest cell that is actually floor, searched outwards from the hole. */
function nearestFooting(cell) {
  for (let radius = 1; radius <= 8; radius += 1) {
    const ring = [];
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        ring.push({ x: cell.x + dx, y: cell.y + dy });
      }
    }
    const found = ring.find(({ x, y }) => world[y]?.[x] === '.' || world[y]?.[x] === '~');
    if (found) return found;
  }
  return null;
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
  // A sodden curse never dries: lightning through water hurts more, fire less,
  // and the hero carries the puddle with them.
  if (!hero.dead && currentHeroMagic().sodden && (hero.effects.wet ?? 0) < WATER_WET_REFRESH_BELOW) {
    hero.effects = applyActorEffect(hero.effects, 'wet', WATER_WET_DURATION).effects;
  }
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
  // An anchored hero stays where they chose to stand. The siren still sings.
  if (currentHeroMagic().anchored) {
    addCombatGlyph(hero.x, hero.y, '⚓', '#9fc6c4', -64);
    return false;
  }
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
      weaponMagic: null,
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
  // A post inside a building is a job, not a starting point. The priest, the
  // keeper and the four hires drinking at his tables all work indoors, and a
  // man you came back for is no use to anybody out on the square.
  const room = isCityDepth(dungeon.depth)
    ? cityInteriorAt(dungeon.city, monster.post)
    : null;
  const candidates = [];
  for (let dy = -PATROL_RADIUS; dy <= PATROL_RADIUS; dy += 1) {
    for (let dx = -PATROL_RADIUS; dx <= PATROL_RADIUS; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) > PATROL_RADIUS) continue;
      const x = monster.post.x + dx;
      const y = monster.post.y + dy;
      if (!isWalkable(x, y)) continue;
      if (room && (x < room.x || x >= room.x + room.w || y < room.y || y >= room.y + room.h)) continue;
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
/**
 * Горожанин, которому здесь больше нечего делать, уходит своими ногами.
 *
 * Маклер, продавший дом, исчезал бы прямо посреди комнаты. Иван: «желательно,
 * чтобы он уходил куда-нибудь просто, а не просто исчезал». Он идёт к
 * ближайшим воротам обычным шагом и пропадает там, где из города выходят все.
 *
 * Дорогу может перекрыть чужое тело, и тогда он не растворяется на месте, а
 * ждёт и пробует снова; терпение конечно, иначе запертый в углу человек стоял
 * бы там до конца забега.
 */
function walkAwayMonster(monster, delta, blockedCells) {
  const cell = { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) };
  if (cellStepDistance(cell, monster.leaving) === 0) {
    monster.leaving = null;
    monster.route = [];
    monster.dead = 0.01;
    return false;
  }
  if (monster.route.length > 0) return true;
  monster.route = findPath(monster.leaving.x + 0.5, monster.leaving.y + 0.5, {
    allowHidden: true,
    start: cell,
    blockedCells,
    terrain: monster.terrain,
  });
  if (monster.route.length > 0) {
    monster.leavingPatience = 0;
    return true;
  }
  monster.leavingPatience = (monster.leavingPatience ?? 0) + delta;
  if (monster.leavingPatience < 12) return false;
  monster.leaving = null;
  monster.dead = 0.01;
  return false;
}

function patrolMonster(monster, delta, blockedCells) {
  if (monster.leaving) return walkAwayMonster(monster, delta, blockedCells);
  // Маклер ждёт покупателя и с места не сходит. Он ходил по своему дому, как
  // все горожане, — и покупателю приходилось за ним гоняться: подошёл, кнопка
  // появилась, он шагнул — кнопка исчезла. Человек, пришедший продать дом,
  // стоит там, где его видно с порога.
  if (monster.id === CITY_BROKER_ID) return false;
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

/** Hitting one guard puts the whole street on the hero, and into the ledger. */
function provokeCityWatch(target) {
  noteCrime('struck-guard');
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
  const sight = Math.max(1.5, stealthVisionRadius(monster.vision, currentStealthProfile())
    + currentConditions().monsterVisionDelta);
  if (distanceToHero > TILE * sight) return false;
  const from = { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) };
  const to = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return hasLineOfSight(world, from, to);
}

function canHeroAttack(monster, combat) {
  if (!isCurrentlyVisible(monster.x, monster.y)) return false;
  if (!combat.projectile && !REACH_STYLES.includes(combat.style) && !canActorsMelee(hero, monster)) return false;
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
  return Math.hypot(to.x - from.x, to.y - from.y) <= HERO_SIGHT_RADIUS
    && hasLineOfSight(world, from, to);
}

function findPath(
  targetX,
  targetY,
  { allowHidden = false, start = null, blockedCells = null, allowBlockedEnd = true, allowedHazardCell = null, heroMovement = false, terrain = null, throughDoors = false } = {},
) {
  const startCell = start ?? { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const end = { x: Math.floor(targetX), y: Math.floor(targetY) };
  const проходима = (cx, cy) => (throughDoors && world[cy]?.[cx] === 'D')
    || (heroMovement ? isHeroWalkable(cx, cy) : isWalkable(cx, cy));
  if (!проходима(end.x, end.y)) return [];
  if (!allowHidden && !revealed.has(`${end.x},${end.y}`)) return [];
  /*
   * Неразведанная клетка — не стена.
   *
   * Для поиска пути она ею была, и герой обходил неразведанное по уже
   * пройденному: тычок на три клетки в темноту уводил его в длинный крюк по
   * освещённому. Иван: «когда я тыкаю, чтобы персонаж пошёл на короткое
   * расстояние в тень, он начинает идти по какой-то абсолютно другой, более
   * длинной, но освещённой территории».
   *
   * Знания это не выдаёт: стены нарисованы на экране всегда, темнота их
   * только притемняет. Правило остаётся у цели — идти можно туда, что игрок
   * уже видел, — а вот дорога к ней считается по настоящему этажу.
   */
  let navigationGrid = allowHidden || heroMovement
    ? world
    : world.map((row, y) => row.map((cell, x) => (revealed.has(`${x},${y}`) ? cell : '#')));
  /*
   * Закрытая дверь — не стена.
   *
   * Для поиска пути она была ровно стеной, и всё, что за ней, становилось
   * недостижимым: герой, стоящий в доме, не мог дойти никуда наружу. Игра при
   * этом не отказывала, а шла к ближайшей досягаемой клетке — то есть утыкалась
   * в стену рядом с тем местом, куда ткнули пальцем. Иван: «нажимаю герою идти
   * в тень, а он тупо упирается в стену».
   *
   * Дверь проходима только когда её об этом просят, и просит один
   * `requestHeroMove` — вторым заходом, когда обычного пути не нашлось.
   */
  if (throughDoors) {
    navigationGrid = navigationGrid.map((row) => row.map((cell) => (cell === 'D' ? '.' : cell)));
  }
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

/**
 * What the hero cannot walk through.
 *
 * An enemy is a wall — walking past something that is trying to kill you is not
 * a thing this game allows, and it is what makes a corridor a corridor. But
 * everything ELSE standing in the street was a wall too, and the city is made
 * of narrow streets with a watchman, a priest and four traders in them. A sheep
 * in a doorway stopped the hero the same way a wall did, and nothing about that
 * was a decision anybody made.
 *
 * So the rule is hostility, not existence. The watch, the priest, the traders
 * and the wildlife are people and animals: you push past them. The moment one
 * of them turns on you it becomes a wall like any other enemy.
 */
function heroBlockingActors() {
  return [
    ...monsters.filter((monster) => !monster.neutral || monster.provoked),
    ...passiveCreatures.filter((creature) => !creature.defeated && creature.hunted),
  ];
}

/**
 * The same list as cells, for routing. Routing was the only half that ever got
 * the rule: a path could be drawn through a watchman, and then the hero walked
 * into him and stopped, because the collision circle below knew nothing about
 * hostility. One list now answers both, so a neighbour cannot be a wall in the
 * one place nobody thought to look.
 */
function heroBlockingCells() {
  return blockingActorCells(heroBlockingActors(), TILE);
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
      && cellStepDistance(cell, trap) === 1)
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
    sapperKitCount: interactionResourceCount(DISARM_TOOL_ITEM_ID),
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
    sapperKitCount: interactionResourceCount(DISARM_TOOL_ITEM_ID),
  });
  const presentation = trapDisarmPresentation({
    trap,
    effectiveTier: result.effectiveTier,
    language: itemDetailLanguage,
  });
  if (!result.ok) {
    if (['skill-required', 'tier-required', 'tool-required'].includes(result.reason)) {
      trapAnnouncement.textContent = result.reason === 'tool-required'
        ? presentation.toolRequired
        : presentation.unavailable;
      addCombatGlyph((trap.x + 0.5) * TILE, (trap.y + 0.5) * TILE, '!', '#dec982', -36);
      showLootToast({ path: TRAP_PATH, rarity: 1 }, trapAnnouncement.textContent, 'refused');
    }
    return false;
  }
  // Отмычка уходит на механизм — кроме третьего ранга, который обходится сам.
  if (!consumeInteractionResources(result.consumed)) return false;

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
  showLootToast({ path: DISARMED_TRAP_PATH, rarity: 1 }, feedbackCopy(itemDetailLanguage).trapDisarmed, 'restore');
  trapAnnouncement.textContent = presentation.success;
  updateHud();
  persistRun();
  return true;
}

/**
 * The keen sense does not search harder — it searches from further away. So it
 * lends the existing search a radius, instead of being a second way to find
 * things that could disagree with the first.
 */
/** How long until a spell comes back: the armour's focus, then worn quickening. */
const SENSE_RADIUS = 5;
const SENSE_TIER = 3;

/** Сапоги Лёгкого Шага и есть вся прибавка к скорости: либо они, либо ничего. */
function heroSwiftness() {
  return currentHeroMagic().swiftness ? 1 + SWIFT_STEP_PERCENT / 100 : 1;
}

function heroSpellCooldown(spell) {
  const focused = focusedCooldown(spell.cooldown, currentArmourProfile());
  const quickening = currentHeroMagic().quickening;
  if (!quickening) return focused;
  return Math.max(0.2, focused * (1 - quickening / 100));
}

function senseCapabilities() {
  const capabilities = currentSkillCapabilities();
  const sense = currentHeroMagic().sense;
  const lent = sense
    ? {
        ...capabilities,
        trapDetectionRadius: Math.max(capabilities.trapDetectionRadius ?? 0, SENSE_RADIUS),
        trapDetectionTier: Math.max(capabilities.trapDetectionTier ?? 0, SENSE_TIER),
        secretSearchRadius: Math.max(capabilities.secretSearchRadius ?? 0, SENSE_RADIUS),
        secretSearchTier: Math.max(capabilities.secretSearchTier ?? 0, SENSE_TIER),
      }
    : capabilities;
  // And the tired half: a hero who has been awake too long notices less. It
  // takes no health and traps nobody — the floor simply stops giving things
  // away until the next bedroll.
  const share = restStage(hero.rest).searchPercent / 100;
  if (share >= 1) return lent;
  return {
    ...lent,
    trapDetectionRadius: Math.floor((lent.trapDetectionRadius ?? 0) * share),
    secretSearchRadius: Math.floor((lent.secretSearchRadius ?? 0) * share),
  };
}

function discoverNearbyTraps({ feedback = true } = {}) {
  if (hero.dead || runStatus !== 'playing') return false;
  const next = discoverTraps({
    traps: trapDefinitions,
    origin: { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) },
    capabilities: senseCapabilities(),
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
    showLootToast({ path: TRAP_PATH, rarity: 1 }, feedbackCopy(itemDetailLanguage).trapDetected);
    trapAnnouncement.textContent = itemDetailLanguage === 'ru' ? 'Чутьё: ловушка обнаружена' : 'Trap Sense: trap detected';
  }
  persistRun();
  return true;
}

function warnTrapStep(cell) {
  const [x, y] = cell.split(',').map(Number);
  addCombatGlyph((x + 0.5) * TILE, (y + 0.5) * TILE, '!', '#dec982', -36);
  showLootToast({ path: TRAP_PATH, rarity: 1 }, feedbackCopy(itemDetailLanguage).trapWarning);
  trapAnnouncement.textContent = itemDetailLanguage === 'ru'
    ? 'Ловушка. Отпусти управление и нажми снова, если хочешь наступить.'
    : 'Trap. Release the control and press again to step on it deliberately.';
}

/**
 * A tap the known map cannot answer exactly is still a tap.
 *
 * Route finding treats everything the hero has never seen as a wall, so tapping
 * into the dark — or past a corner the hero has not turned yet — used to do
 * nothing at all: the player taps, the hero stands there, and the game looks
 * broken. Walking as far that way as the known ground allows is what the player
 * meant, and it is how they explore.
 */
/**
 * Whether the hero's route should be drawn: true only after a tap on a cell.
 * Set where the input arrives, because that is the only place that knows how
 * the player asked.
 */
let heroRouteVisible = false;

function routeTowardCell(target) {
  const from = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const candidates = [];
  const reach = 9;
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      const x = target.x + dx;
      const y = target.y + dy;
      if (!isHeroWalkable(x, y) || !revealed.has(`${x},${y}`)) continue;
      if (x === from.x && y === from.y) continue;
      candidates.push({ x, y, toTarget: Math.hypot(dx, dy) });
    }
  }
  // Nearest to where the player pointed, and among equals the one that is not a
  // detour: walking away from the tap to get closer to it reads as a bug.
  candidates.sort((left, right) => (left.toTarget - right.toTarget)
    || (cellStepDistance(from, left) - cellStepDistance(from, right)));
  for (const cell of candidates.slice(0, 14)) {
    const path = findPath(cell.x, cell.y, { allowBlockedEnd: false, heroMovement: true });
    if (path.length > 0) return path;
  }
  return [];
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
    allowBlockedEnd: false,
    allowedHazardCell: intent.permittedCell,
    heroMovement: true,
  });
  if (path.length === 0 && isHeroWalkable(target.x, target.y) && revealed.has(`${target.x},${target.y}`)) {
    const enemy = monsters.find((monster) => !monster.dead &&
      monsterCellKey(monster, TILE) === `${target.x},${target.y}`);
    const approach = enemy && meleeApproachPoint(hero, enemy, TILE);
    if (approach) path = [approach];
    else if (enemy && canActorsMelee(hero, enemy)) {
      // Already touching it. There is nowhere to step, but the tap was still a
      // real action: stop walking and let the swing land.
      hero.path = [];
      return true;
    }
  }
  /*
   * Второй заход — через двери.
   *
   * Обычный путь их не видит, и всё за закрытой дверью недостижимо. Прежде чем
   * сдаваться и идти «примерно туда», игра спрашивает ещё раз: а если дверь
   * открыть? Откроет её сам герой, дойдя до неё, — как открыл бы рукой.
   */
  let черезДвери = false;
  if (path.length === 0) {
    path = findPath(targetX, targetY, {
      allowBlockedEnd: false,
      allowedHazardCell: intent.permittedCell,
      heroMovement: true,
      throughDoors: true,
    });
    черезДвери = path.length > 0;
  }
  if (path.length === 0) path = routeTowardCell(target);
  const пошёл = commitHeroPath(path, intent.permittedCell);
  /*
   * Открывать двери разрешено только тому пути, который об этом просил.
   *
   * Дверь, захлопнувшаяся перед идущим героем, обязана его остановить — это
   * чужое действие, и переигрывать его за игрока нельзя. А дверь, которую
   * игрок сам наметил пройти, герой открывает сам.
   */
  heroPathOpensDoors = пошёл && черезДвери;
  return пошёл;
}

function commitHeroPath(nextPath, allowedHazardCell = null) {
  if (!nextPath.length) return false;
  if (hero.attack > 0) {
    /*
     * Шаг отменяет замах, но не выстрел.
     *
     * Меч, от которого ушли, не бьёт, — это честно: замахнулся и ушёл значит
     * не ударил. Стрела, уже наложенная на тетиву, от шага не исчезает: её
     * отпускают. Гасло же и то, и другое, а на телефоне ходят пальцем по полу
     * — и лук оказывался бесполезен. Иван: «стреляю, начинаю двигаться, и
     * выстрел отменяется».
     *
     * Досрочное разрешение отдаёт стрелу тем же путём, каким её отдал бы
     * доигравший замах: попадание считается один раз и по тем же правилам.
     */
    if (hero.pendingAttack?.combat?.projectile) resolvePendingHeroAttack(hero.attack, 0);
    hero.attack = 0;
    hero.pendingAttack = null;
  }
  hero.path = nextPath;
  permittedHazardCell = allowedHazardCell;
  if (allowedHazardCell === null) hazardInputState = createHazardInputState();
  playerHasActed = true;
  return true;
}

/**
 * A direction is a step, not a destination.
 *
 * The stick and the arrow keys went through the same pathfinder as a tap, so
 * holding «вперёд» against a wall asked for a route to the cell behind it —
 * and when no route existed, `routeTowardCell` obligingly found a way round.
 * Ivan: «упираюсь в стену, а он начинает её обходить»; the same thing in a
 * corridor with a closed door at the end, where the hero paced left and right
 * instead of standing at the handle.
 *
 * Holding a direction now does exactly one thing: the next cell, or nothing.
 * Walking into a wall is a hero leaning on a wall.
 */
function stepHeroToward(cellX, cellY) {
  const target = { x: cellX, y: cellY };
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
  /*
   * В мирного не бьют — с ним меняются местами.
   *
   * Путь героя жителей и зверьё уже не считает преградой: «сквозь них
   * проходят». А направленный шаг в жителя считался ударом, герой вставал и
   * стоял — и стражник, забредший в дверной проём лавки, запирал её насмерть.
   * Иван поймал это в городе: «стражники просто стоят и не хотят уходить, я
   * не могу пройти к торговцу — это softlock».
   *
   * Разойтись в дверях — обычное дело: житель занимает клетку, с которой
   * герой уходит. Тот, кого спровоцировали, меняться местами уже не станет.
   */
  const occupant = monsters.find((monster) => !monster.dead
    && monsterCellKey(monster, TILE) === `${target.x},${target.y}`);
  const bystander = occupant && occupant.neutral && !occupant.provoked
    ? occupant
    : passiveCreatures.find((creature) => !creature.defeated && !creature.hunted
      && monsterCellKey(creature, TILE) === `${target.x},${target.y}`);
  if (bystander && isHeroWalkable(target.x, target.y)) {
    const from = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
    bystander.x = (from.x + 0.5) * TILE;
    bystander.y = (from.y + 0.5) * TILE;
    // Житель шёл куда-то своей дорогой — пусть проложит её заново с нового места.
    bystander.route = [];
    bystander.repathCooldown = 0;
    playerHasActed = true;
    return commitHeroPath(
      [{ x: (target.x + 0.5) * TILE, y: (target.y + 0.5) * TILE }],
      intent.permittedCell,
    );
  }
  // Walking into a living thing is a swing, whether or not there is room to
  // step: the same rule a tap on an enemy follows.
  const enemy = occupant ?? null;
  if (enemy) {
    playerHasActed = true;
    const approach = meleeApproachPoint(hero, enemy, TILE);
    if (approach) return commitHeroPath([approach], intent.permittedCell);
    if (canActorsMelee(hero, enemy)) {
      hero.path = [];
      return true;
    }
    return false;
  }
  // Unlike a tap, a step may go into the dark: pressing forward is how the
  // dark gets explored, and the pathfinder treats everything unseen as wall.
  if (!isHeroWalkable(target.x, target.y)) {
    hero.path = [];
    return false;
  }
  playerHasActed = true;
  /*
   * Путь героя измеряется в пикселях, а не в клетках.
   *
   * `findPath` отдаёт точки как `(клетка + 0.5) * TILE`, и ходок делит их
   * обратно, чтобы узнать клетку. Здесь в путь клали саму клетку — ходок делил
   * её ещё раз, попадал в левый верхний угол карты, видел там стену и стирал
   * путь. Шаг «удавался» и тут же отменялся, поэтому герой стоял на месте при
   * любом направленном вводе: крестовине, экранных стрелках и клавиатуре.
   * Нашлось это только с геймпадом — тапом по полу игра ходит другим путём.
   */
  return commitHeroPath(
    [{ x: (target.x + 0.5) * TILE, y: (target.y + 0.5) * TILE }],
    intent.permittedCell,
  );
}

function queueDirectionalMove(direction) {
  if (!ready || uiScreen !== 'game' || runStatus !== 'playing' || openingDoor) return false;
  const vector = directionVector(direction);
  if (!vector) return false;
  heroRouteVisible = false;
  const targetX = Math.floor(hero.x / TILE) + vector[0];
  const targetY = Math.floor(hero.y / TILE) + vector[1];
  return stepHeroToward(targetX, targetY);
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

/**
 * A filtered copy of a sprite, drawn once into an offscreen canvas and kept.
 * Setting `context.filter` runs the filter over the image on every single
 * draw call; the copy pays for it once per sprite and per look.
 */
const filteredSprites = new Map();

function filteredSprite(path, sprite, filter) {
  if (!filter || filter === 'none') return sprite;
  const key = `${path}|${filter}`;
  const cached = filteredSprites.get(key);
  if (cached) return cached;
  const width = sprite.naturalWidth;
  const height = sprite.naturalHeight;
  if (!width || !height) return sprite;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const copy = canvas.getContext('2d');
  if (!copy) return sprite;
  // Pixel art: the copy is drawn 1:1, so the scaling on screen stays nearest
  // neighbour exactly as it was when the filter ran at draw time.
  copy.imageSmoothingEnabled = false;
  copy.filter = filter;
  copy.drawImage(sprite, 0, 0);
  filteredSprites.set(key, canvas);
  return canvas;
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
  const source = filteredSprite(path, sprite, options.filter ?? VISIBILITY_TUNING.spriteFilter);
  context.save();
  context.globalAlpha = options.alpha ?? 1;
  if (options.glow) {
    context.shadowColor = options.glow;
    context.shadowBlur = options.blur ?? 18;
  }
  context.translate(Math.round(position.x), Math.round(position.y + (options.offsetY ?? 0)));
  if (options.rotation) context.rotate(options.rotation);
  context.scale(options.flip ? -1 : 1, 1);
  if (fitted) {
    context.drawImage(
      source,
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
    context.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  }
  context.restore();
}

/**
 * The two rules this run lives by. The floor carries them, so nothing here has
 * to know the run seed — and a floor is always at hand.
 */
function currentConditions() {
  return conditionEffects(dungeon.conditionIds ?? []);
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
  return composePlayerLayerStack({
    baseVisual: appearance.body,
    hairVisual: appearance.hair,
    beardVisual: appearance.beard,
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

/**
 * The dead run's own silhouette: its body, its hair, the gear it fell in. Built
 * by the same stack the hero is built from, because it is the hero.
 */
function ghostLayers(bones) {
  const worn = new Map(bones.gear.map((piece) => [piece.slot, piece]));
  const definitionFor = (slot) => {
    const piece = worn.get(slot);
    if (!piece) return null;
    const definition = lootById(piece.id);
    return definition ? { ...definition, materialId: piece.materialId ?? null } : null;
  };
  const visualFor = (slot, renderedSlot = slot) => {
    const definition = definitionFor(slot);
    return definition ? visualForItem(definition, renderedSlot) : null;
  };
  const loadout = resolveWeaponLoadout(definitionFor('hand1'), definitionFor('hand2'));
  const appearance = resolvePlayerAppearance({
    bodyId: bones.appearance.bodyId,
    hairId: bones.appearance.hairId,
  });
  return composePlayerLayerStack({
    baseVisual: appearance.body,
    hairVisual: appearance.hair,
    cloakVisual: visualFor('cloak'),
    bodyVisual: visualFor('body'),
    beltVisual: visualFor('belt'),
    bootsVisual: visualFor('boots'),
    glovesVisual: visualFor('gloves'),
    headVisual: visualFor('head'),
    hand1Visual: visualFor('hand1'),
    hand2Visual: visualFor('hand2', 'hand2'),
    twoHanded: loadout.mode === 'two-handed',
    hideHair: worn.has('head'),
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

/**
 * The ghost rides its own billboard because it is the only actor besides the
 * hero built out of layers instead of a single sprite. Sleeping it is barely
 * there; woken, it is nearly solid.
 */
/**
 * The three fixed markers of a floor: the stair the hero came down by, the way
 * on, and the altar. They used to be painted on the overlay canvas, which sits
 * above the whole world — so the arch the hero arrives standing inside covered
 * them from the shoulders down on the first frame of every run. They are world
 * objects with a footprint, so they belong in the world, where sorting is real.
 */
/**
 * A wood is what blocks the way in it. Every thicket cell is a trunk standing on
 * the ground rather than a block of stone, so walking through is weaving between
 * them — and only the ones nearby are drawn, or a late floor would hand the
 * renderer three hundred billboards at once.
 */
const THICKET_DRAW_RADIUS = 11;

function thicketActors3D() {
  if (thicketCells.size === 0) return [];
  const props = thicketProps(dungeon.themeId);
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const standing = [];
  for (const key of thicketCells) {
    if (!revealed.has(key)) continue;
    const [x, y] = key.split(',').map(Number);
    if (Math.abs(x - heroCell.x) > THICKET_DRAW_RADIUS) continue;
    if (Math.abs(y - heroCell.y) > THICKET_DRAW_RADIUS) continue;
    const pick = hash(x, y, 11) % props.length;
    standing.push({
      id: `thicket:${key}`,
      path: props[pick],
      x: (x + 0.5) * TILE,
      y: (y + 0.5) * TILE,
      size: 84 + (hash(x, y, 13) % 3) * 6,
      facing: hash(x, y, 17) % 2 === 0 ? 1 : -1,
      screenOffsetY: -18,
      opacity: 1,
      hit: false,
      shadowScale: 0.66,
      shadowOpacity: 0.26,
    });
  }
  return standing;
}

/**
 * Nothing inanimate hides the hero. The rule lives in `sceneryOpacity`; this is
 * where every piece of scenery is held to it, once, instead of each list of
 * props remembering to do it for itself.
 */
function stepAsideForHero(scenery) {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return scenery.map((prop) => {
    const fade = sceneryOpacity(
      { x: Math.floor(prop.x / TILE), y: Math.floor(prop.y / TILE) },
      heroCell,
    );
    return fade === 1 ? prop : { ...prop, opacity: prop.opacity * fade };
  });
}

/**
 * How high a sprite has to sit to stand on its cell instead of in it.
 *
 * A billboard is centred on its position, so a gateway placed at floor level
 * is buried to the waist — Ivan saw the down stair «провалится сквозь пол
 * наполовину». Half the sprite, foreshortened by the camera's tilt, is exactly
 * the lift that puts its base on the ground. Actors carry hand-tuned offsets
 * of their own because their feet are not at the bottom of their frame; a
 * doorway's are.
 */
function groundLift(size) {
  return -(size / 2) * Math.cos((WORLD_CAMERA_ELEVATION * Math.PI) / 180);
}

function worldMarkers3D() {
  const markers = [];
  if (dungeon.sanctuary && revealed.has(`${dungeon.sanctuary.x},${dungeon.sanctuary.y}`)) {
    // Камень стоит. Святилище качалось на синусе, и Иван спросил, почему
    // алтарь левитирует. Правило для всего мира держит тест «ничто
    // неподвижное не парит»: по вертикали качаются только живые.
    markers.push({
      id: 'marker:sanctuary',
      path: sanctuaryVisual.path,
      x: (dungeon.sanctuary.x + 0.5) * TILE,
      y: (dungeon.sanctuary.y + 0.5) * TILE,
      size: 68 * sanctuaryVisual.scale,
      facing: 1,
      screenOffsetY: sanctuaryVisual.offsetY,
      opacity: 1,
      hit: false,
      shadowScale: 0.7,
      shadowOpacity: 0.28,
    });
  }
  if (revealed.has(`${dungeon.exit.x},${dungeon.exit.y}`)) {
    const finalFloor = roadEndingAt(dungeon.depth) !== null;
    const chapterGateLocked = Boolean(
      dungeon.objective && !finalFloor && !objectiveBossDefeated(),
    );
    const visual = finalFloor
      ? artifactAvailable()
        ? { ...artifactVisual, path: roadPrize().path }
        : finalGateVisual
      : chapterGateLocked
        ? finalGateVisual
        : exitVisual();
    markers.push({
      id: 'marker:exit',
      path: visual.path,
      x: (dungeon.exit.x + 0.5) * TILE,
      y: (dungeon.exit.y + 0.5) * TILE,
      size: (artifactAvailable() ? 54 : 64) * visual.scale,
      facing: 1,
      // Masonry does not hover. The stair used to bob on a sine like the
      // artifact does, which read as a bug rather than as a beacon — and the
      // stair up, right beside it, never bobbed at all.
      screenOffsetY: visual.offsetY + groundLift((artifactAvailable() ? 54 : 64) * visual.scale),
      opacity: 1,
      hit: false,
      shadowScale: 0.7,
      shadowOpacity: 0.3,
    });
  }
  // The town portal. One picture for both mouths, because it is one portal —
  // the only thing in the game that is in two places at once.
  const portalCell = portalCellHere();
  if (portalCell && revealed.has(`${portalCell.x},${portalCell.y}`)) {
    const visual = portalVisual();
    const shimmer = reducedMotion ? 0 : Math.sin(elapsed * 3.1) * 0.06;
    markers.push({
      id: 'marker:portal',
      path: visual.path,
      x: (portalCell.x + 0.5) * TILE,
      y: (portalCell.y + 0.5) * TILE,
      size: 60 * visual.scale,
      facing: 1,
      screenOffsetY: visual.offsetY + groundLift(60 * visual.scale),
      opacity: 0.94 + shimmer,
      hit: false,
      shadowScale: 0.62,
      shadowOpacity: 0.26,
    });
  }
  // The city's three gates, each drawn where it stands. The ordinary exit
  // marker above is skipped there: in town the east gate is one of these three.
  if (isCityDepth(dungeon.depth) && dungeon.gates) {
    for (const [branch, gate] of Object.entries(dungeon.gates)) {
      if (!revealed.has(`${gate.x},${gate.y}`)) continue;
      const visual = CITY_GATE_VISUALS[branch];
      if (!visual) continue;
      markers.push({
        id: `marker:gate:${branch}`,
        path: visual.path,
        x: (gate.x + 0.5) * TILE,
        y: (gate.y + 0.5) * TILE,
        size: 62,
        facing: 1,
        screenOffsetY: groundLift(62),
        opacity: 1,
        hit: false,
        shadowScale: 0.7,
        shadowOpacity: 0.3,
      });
    }
  }
  // The stair the hero came down by. It leads up everywhere below the surface,
  // and on the first floor that means out of the dungeon and into the city.
  if (
    dungeon.depth > CITY_DEPTH
    && isCurrentlyVisible((dungeon.spawn.x + 0.5) * TILE, (dungeon.spawn.y + 0.5) * TILE)
  ) {
  // The way onto another road, standing where the floor put it.
  if (dungeon.branchGate && isCurrentlyVisible((dungeon.branchGate.x + 0.5) * TILE, (dungeon.branchGate.y + 0.5) * TILE)) {
    markers.push({
      id: 'marker:branch-gate',
      path: dungeon.branchGate.path,
      x: (dungeon.branchGate.x + 0.5) * TILE,
      y: (dungeon.branchGate.y + 0.5) * TILE,
      size: 72,
      facing: 1,
      screenOffsetY: -6 + groundLift(72),
      opacity: 1,
      hit: false,
      shadowScale: 0.75,
      shadowOpacity: 0.32,
    });
  }
    markers.push({
      id: 'marker:ascent',
      path: ascentVisual().path,
      x: (dungeon.spawn.x + 0.5) * TILE,
      y: (dungeon.spawn.y + 0.5) * TILE,
      size: 64 * ascentVisual().scale,
      facing: 1,
      screenOffsetY: ascentVisual().offsetY + groundLift(64 * ascentVisual().scale),
      opacity: 1,
      hit: false,
      shadowScale: 0.7,
      shadowOpacity: 0.3,
    });
  }
  return markers;
}

function ghostActor3D() {
  const ghost = floorGhost;
  if (!ghost || ghost.dead > 0.72) return null;
  if (!revealed.has(`${Math.floor(ghost.x / TILE)},${Math.floor(ghost.y / TILE)}`)) return null;
  // This is the one place that already knows the ghost has been seen, so it is
  // where the floor says so — once, the first time it comes into the light.
  if (!ghost.announced) {
    ghost.announced = true;
    showLootToast({ path: ghost.spritePath, rarity: 2 }, bonesCopy(itemDetailLanguage).resting);
  }
  const motion = monsterMotion(ghost);
  const bob = reducedMotion ? 0 : Math.sin(elapsed * 1.9 + ghost.phase) * 2.6;
  const fading = ghost.dead > 0 ? Math.max(0, 1 - ghost.dead / 0.72) : 1;
  return {
    layers: ghost.layers,
    x: ghost.x + motion.dx,
    y: ghost.y + motion.dy,
    size: ACTOR_SIZE,
    facing: ghost.facing,
    screenOffsetY: -15 + bob,
    // Washed out and lit from nowhere: a hero's silhouette that the room's own
    // darkness does not touch. Waking brings the colour part of the way back.
    filter: ghost.provoked
      ? 'saturate(0.55) brightness(1.2)'
      : 'saturate(0.2) brightness(1.5)',
    opacity: (ghost.provoked ? 0.82 : 0.58) * fading,
    scaleX: motion.scaleX,
    scaleY: motion.scaleY,
    hit: ghost.hit > 0,
    shadowOpacity: 0.16,
  };
}

/**
 * Двойник героя.
 *
 * Мара не носит своей картинки: она собирается из тех же слоёв снаряжения,
 * что и герой, и потому едет в кадре отдельно от остальных монстров — ровно
 * как призрак прошлого забега, и по той же причине.
 *
 * Слои берутся каждый кадр: сменил герой оружие — сменила и она, и увидеть
 * это игрок должен сразу, а не после этажа.
 */
function doubleActor3D() {
  const twin = monsters.find((monster) => (
    monster.id === DOUBLE_MONSTER_ID && monster.dead <= 0.72
  ));
  if (!twin) return null;
  if (!revealed.has(`${Math.floor(twin.x / TILE)},${Math.floor(twin.y / TILE)}`)) return null;
  const motion = monsterMotion(twin);
  const bob = reducedMotion ? 0 : Math.sin(elapsed * 2.4 + twin.phase) * 1.7;
  const fading = twin.dead > 0 ? Math.max(0, 1 - twin.dead / 0.72) : 1;
  return {
    layers: playerLayers(),
    x: twin.x + motion.dx,
    y: twin.y + motion.dy,
    size: ACTOR_SIZE,
    facing: twin.facing,
    screenOffsetY: -15 + bob,
    // Тот же силуэт, но холодный и тёмный: чтобы в бою было видно, где ты, а
    // где не ты, — и чтобы это читалось на глаз, а не по полоске здоровья.
    filter: 'saturate(0.45) brightness(0.62) hue-rotate(200deg)',
    opacity: fading,
    scaleX: motion.scaleX,
    scaleY: motion.scaleY,
    hit: twin.hit > 0,
    shadowOpacity: 0.3,
  };
}

/** The last frame's standing billboards, as the world was told to draw them. */
let standingBillboards = null;

function syncWorldActors3D() {
  const motion = playerMotion();
  const deathProgress = hero.dead ? 1 - Math.max(0, deathTimer) / 1.35 : 0;
  const heroMagic = currentHeroMagic();
  const concealed = heroMagic.invisibility && hero.invisibilityReveal <= 0;
  const frame = {
    hero: {
      layers: playerLayers(),
      x: hero.x + motion.dx,
      y: hero.y + motion.dy,
      size: ACTOR_SIZE,
      facing: hero.facing,
      screenOffsetY: (heroMagic.flight ? -23 : heroWading() ? -7 : -13) + motion.bob,
      // За меню герой едет вместо камеры и не показывается: свет и туман
      // считаются от него, а видеть там его нечего.
      opacity: showreelActive() ? 0
        : hero.dead ? Math.max(0.2, 1 - deathProgress * 0.8) : concealed ? 0.38 : 1,
      rotation: deathProgress * hero.facing * 0.8,
      scaleX: motion.attackMotion.scaleX,
      scaleY: motion.attackMotion.scaleY,
      hit: hero.hurt > 0,
      shadowScale: heroMagic.flight ? 0.72 : 1,
      shadowOpacity: heroMagic.flight ? 0.18 : heroWading() ? 0.12 : 0.42,
    },
    ghost: ghostActor3D(),
    double: doubleActor3D(),
    monsters: [
      ...monsters
        .filter(
          (monster) =>
            !monster.ghost &&
            // Двойник едет своей фигурой, а не картинкой: здесь его нет.
            monster.id !== DOUBLE_MONSTER_ID &&
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
            filter: monster.markFilter ?? null,
            x: monster.x + motion.dx + visualJostle,
            y: monster.y + motion.dy,
            size:
              (monster.boss ? 100 : monster.large ? 90 : monster.flying ? 69 : 76) *
              (monster.visualScale ?? 1),
            facing: monster.facing,
            screenOffsetY: (monster.visualOffsetY ?? -10) + bob + (actorInWater(world, monster, TILE) && !monster.flying ? 6 : 0),
            opacity: (monster.dead > 0 ? Math.max(0, 1 - monster.dead / 0.72) : 1) * (monster.dim ?? 1),
            scaleX: motion.scaleX * (walking && !reducedMotion ? 1 + walkCycle * 0.025 : 1),
            scaleY: motion.scaleY * (walking && !reducedMotion ? 1 - walkCycle * 0.025 : 1),
            hit: monster.hit > 0,
          };
        }),
      // The dungeon's own passers-by ride it too, and are the only actors in it
      // that nothing can touch.
      ...ambientSceneActors(),
      // Raised servants ride the same billboard pass as everything else alive.
      ...allies
        .filter((ally) => ally.dead <= 0.72
          && revealed.has(`${Math.floor(ally.x / TILE)},${Math.floor(ally.y / TILE)}`))
        .map((ally) => {
          const motion = monsterMotion(ally);
          const bob = reducedMotion ? 0 : Math.sin(elapsed * 2.4 + ally.phase) * 1.7;
          return {
            id: ally.instanceId,
            path: ally.spritePath,
            x: ally.x + motion.dx,
            y: ally.y + motion.dy,
            size: 76 * (ally.visualScale ?? 1),
            facing: ally.facing,
            screenOffsetY: (ally.visualOffsetY ?? -10) + bob,
            opacity: ally.dead > 0 ? Math.max(0, 1 - ally.dead / 0.72) : 1,
            scaleX: motion.scaleX,
            scaleY: motion.scaleY,
            hit: ally.hit > 0,
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
      // Scenery first, and all of it steps aside for the hero: see
      // `sceneryOpacity`. Finds come after and keep their own opacity, which
      // already means something — a pale chest is an emptied chest.
      ...stepAsideForHero([
      ...thicketActors3D(),
      ...worldMarkers3D(),
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
          shadowScale: 0.72,
          shadowOpacity: 0.3,
        })),
      ]),
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
          shadowScale: find.resolved && find.id !== 'sealed-cache' ? 0.52 : 0.78,
          shadowOpacity: find.resolved
            ? find.id === 'sealed-cache' ? 0.26 : 0.14
            : 0.34,
        })),
    ],
    imageForPath: image,
    spriteFilter: VISIBILITY_TUNING.spriteFilter,
  };
  dungeonWorld3D.syncActors(frame);
  // Kept for the water pass, which has to rub its own paint back off whatever
  // is standing in front of the water — see `eraseWashFromStanding`.
  standingBillboards = frame;
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
      // Four studs at the corners: the spin stays visible, the hairline goes.
      for (const [studX, studY] of [[-8, -8], [8, -8], [8, 8], [-8, 8]]) {
        context.fillRect(studX - 2, studY - 2, 4, 4);
      }
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
    context.globalAlpha = Math.min(1, guardProgress) * 0.8;
    context.fillStyle = '#9ed2d0';
    drawPixelRing(position.x, position.y - 4, 26, { stud: 6 });
    context.restore();
  }
}

function pixelRound(value, unit = 2) {
  return Math.round(value / unit) * unit;
}

/**
 * A ring of pixels, because in a pixel game there are no lines.
 *
 * Every ring in the effects used to be `rotate(45°)` plus `strokeRect`: a
 * hairline the canvas anti-aliases into grey mush, landing between pixels, with
 * four diagonal spikes where the corners are. It never looked like it belonged
 * to the same picture as the sprites. Studs stepped around a circle and snapped
 * to the effect grid read as the same ring and do belong — it is the idiom the
 * melee arc, the halo and the motes here already use.
 */
function drawPixelRing(x, y, radius, { squash = 1, stud = 4, gap = 1.2 } = {}) {
  const steps = Math.max(8, Math.round((Math.PI * 2 * radius) / (stud * gap)));
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    context.fillRect(
      pixelRound(x + Math.cos(angle) * radius - stud / 2),
      pixelRound(y + Math.sin(angle) * radius * squash - stud / 2),
      stud,
      stud,
    );
  }
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
  context.fillStyle = '#78cad4';
  // Two bars, not the outline of a rectangle: a 2px stroke on an integer edge
  // straddles the pixel boundary and comes out half-lit on both sides.
  const rippleY = pixelRound(centerY + 34 - ripple * 2);
  context.fillRect(pixelRound(centerX - rippleWidth / 2), rippleY, rippleWidth, 2);
  context.fillRect(pixelRound(centerX - rippleWidth / 2), rippleY + 4, rippleWidth, 2);
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
    // A hollow square drawn as four filled edges keeps its corners square.
    const bubbleX = pixelRound(x);
    const bubbleY = pixelRound(y);
    context.fillRect(bubbleX, bubbleY, size, 2);
    context.fillRect(bubbleX, bubbleY + size - 2, size, 2);
    context.fillRect(bubbleX, bubbleY, 2, size);
    context.fillRect(bubbleX + size - 2, bubbleY, 2, size);
    if (phase < 0.42) context.fillRect(bubbleX + 2, bubbleY + 2, 2, 2);
  }
  context.globalAlpha = 0.14 + (reducedMotion ? 0 : (Math.sin(time * 2.2) + 1) * 0.045);
  context.fillStyle = color;
  context.fillRect(pixelRound(centerX - 29), pixelRound(centerY + 31), 58, 6);
  context.restore();
}

/**
 * Standing in water is not a blue wash over the whole figure.
 *
 * The animated surface is painted on the overlay, which is above every actor,
 * so it used to wash whatever was standing in it from head to foot. Water does
 * not work that way: above the line you are simply out of it, below the line
 * you are simply not visible. So the surface is drawn **around** a wading
 * figure rather than over it, and then the water of the place is drawn back
 * over the legs — opaque, following the body rather than the cell, so it does
 * not step from tile to tile while somebody walks. The ripple goes on top as
 * the line where the two meet.
 */
/** Where the surface cuts a standing figure, in screen pixels below its anchor. */
const WADE_SURFACE_Y = 4;
/** How far below that line water is painted — far enough to reach past the boots. */
const WADE_SKIRT = 32;
/** How far above the anchor a standing figure can reach; the part kept dry. */
const WADE_HEAD_ROOM = 58;

/**
 * Everyone standing in water, hero included; flying does not count as wading.
 * Each one carries how to paint its own silhouette, because the overlay has to
 * rub its paint back off them and the hero has no single sprite path — he is
 * composed layer by layer onto a canvas of his own.
 */
function wadingActors() {
  const motion = playerMotion();
  return [
    ...(hero.dead || !heroWading() ? [] : [{
      x: hero.x + motion.dx,
      y: hero.y + motion.dy,
      size: 1,
      paint: () => {
        const silhouette = dungeonWorld3D.heroSilhouette();
        if (!silhouette) return;
        const position = worldToScreen(hero.x + motion.dx, hero.y + motion.dy);
        context.save();
        context.translate(Math.round(position.x), Math.round(position.y - 13 + motion.bob));
        context.scale(hero.facing < 0 ? -1 : 1, 1);
        context.drawImage(silhouette, -ACTOR_SIZE / 2, -ACTOR_SIZE / 2, ACTOR_SIZE, ACTOR_SIZE);
        context.restore();
      },
    }]),
    ...monsters
      .filter((monster) => monster.dead === 0 && !monster.flying && actorInWater(world, monster, TILE))
      .map((monster) => {
        const size = (monster.boss ? 100 : monster.large ? 90 : 76) * (monster.visualScale ?? 1);
        const path = monster.waterPath && actorInWater(world, monster, TILE)
          ? monster.waterPath
          : monster.spritePath;
        return {
          x: monster.x,
          y: monster.y,
          size: monster.large || monster.boss ? 1.3 : 1,
          paint: () => drawSprite(path, monster.x, monster.y, size, {
            flip: monster.facing < 0,
            offsetY: (monster.visualOffsetY ?? -10) + 6,
          }),
        };
      }),
    ...passiveCreatures
      .filter((creature) => !creature.defeated && actorInWater(world, creature, TILE))
      .map((creature) => ({
        x: creature.x,
        y: creature.y,
        size: 0.8,
        paint: () => drawSprite(creature.spritePath, creature.x, creature.y, 64, {
          flip: creature.facing < 0,
          offsetY: -8,
        }),
      })),
  ].filter((wader) => revealed.has(`${Math.floor(wader.x / TILE)},${Math.floor(wader.y / TILE)}`));
}

/**
 * Whether the shimmer of some water cell can reach this one. A sprite stands
 * taller than its own tile, so the water a step or two to the north paints over
 * its head — which is how a sheep on the bank ended up with a waterline across
 * its back, and how the tops of walls at the edge of a lake looked like glass.
 */
function underWaterWash(cellX, cellY) {
  for (let back = 0; back <= 2; back += 1) {
    const key = `${cellX},${cellY - back}`;
    if (world[cellY - back]?.[cellX] === '~' && revealed.has(key)) return true;
  }
  return false;
}

/**
 * Everything the world drew standing up, that the shimmer can reach. Each one
 * knows how to paint its own silhouette and where its waterline is: a figure in
 * the water keeps the wash below the line, because that is the part that should
 * look submerged, and everything on dry land keeps none of it at all.
 */
function standingInFrontOfWater() {
  if (!standingBillboards) return [];
  const standing = [];
  const add = (actor, paint) => {
    const cellX = Math.floor(actor.x / TILE);
    const cellY = Math.floor(actor.y / TILE);
    if (!underWaterWash(cellX, cellY) || (actor.opacity ?? 1) <= 0.02) return;
    standing.push({ x: actor.x, y: actor.y, paint, wading: world[cellY]?.[cellX] === '~' });
  };
  const motion = playerMotion();
  add(standingBillboards.hero, () => {
    const silhouette = dungeonWorld3D.heroSilhouette();
    if (!silhouette) return;
    const position = worldToScreen(hero.x + motion.dx, hero.y + motion.dy);
    context.save();
    context.globalAlpha = standingBillboards.hero.opacity ?? 1;
    context.translate(Math.round(position.x), Math.round(position.y - 13 + motion.bob));
    context.scale(hero.facing < 0 ? -1 : 1, 1);
    context.drawImage(silhouette, -ACTOR_SIZE / 2, -ACTOR_SIZE / 2, ACTOR_SIZE, ACTOR_SIZE);
    context.restore();
  });
  for (const actor of [...standingBillboards.monsters, ...standingBillboards.decorations]) {
    if (!actor.path) continue;
    add(actor, () => drawSprite(actor.path, actor.x, actor.y, actor.size, {
      flip: (actor.facing ?? 1) < 0,
      offsetY: actor.screenOffsetY ?? 0,
      scaleX: actor.scaleX ?? 1,
      scaleY: actor.scaleY ?? 1,
      alpha: actor.opacity ?? 1,
    }));
  }
  return standing;
}

/**
 * The surface is painted on the overlay, which sits above every actor, so it
 * used to wash whatever stood in it — or merely in front of it — from head to
 * foot. Water does not do that: above the line you are simply out of it, and if
 * you are on the bank you were never in it at all. So the wash is rubbed off
 * each figure's own silhouette — `destination-out` with the very sprite the
 * world drew — down to its waterline, or all the way if it is standing dry.
 *
 * A rectangular hole was tried first and was worse: the floor under the wash is
 * lit by the biome and much darker than the wash makes it look, so everything
 * carried a dark box around its head.
 */
function eraseWashFromStanding(standing) {
  if (standing.length === 0) return;
  context.save();
  context.globalCompositeOperation = 'destination-out';
  for (const actor of standing) {
    const position = worldToScreen(actor.x, actor.y);
    const cut = actor.wading ? WADE_SURFACE_Y : TILE;
    context.save();
    context.beginPath();
    context.rect(position.x - TILE, position.y - WADE_HEAD_ROOM, TILE * 2, WADE_HEAD_ROOM + cut);
    context.clip();
    actor.paint();
    context.restore();
  }
  context.restore();
}

/** A ripple across the legs of everyone wading, so a sunken sprite reads as water. */
function drawWaterlines() {
  const waders = wadingActors();
  for (const wader of waders) {
    const skirt = WADE_SKIRT * wader.size;
    const wave = Math.floor(elapsed * 1.5 + hash(Math.floor(wader.x), Math.floor(wader.y)))
      % waterPaths.length;
    drawSprite(waterPaths[wave], wader.x, wader.y, TILE + 1, {
      scaleY: skirt / (TILE + 1),
      scaleX: wader.size,
      offsetY: WADE_SURFACE_Y + skirt / 2,
    });
  }
  context.save();
  context.lineWidth = 1;
  for (const wader of waders) {
    const position = worldToScreen(wader.x, wader.y);
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 3 + wader.x * 0.05) * 2;
    context.fillStyle = 'rgba(186, 230, 240, 0.62)';
    drawPixelRing(position.x, position.y + 6, (18 + pulse) * wader.size, {
      squash: 0.34,
      stud: 2,
    });
  }
  context.restore();
  // The far half of a ripple runs behind the figure standing in it, exactly as
  // the surface does — a ring painted over somebody's waist is a ring lying on
  // top of them, which is why this is the last thing the water pass does and
  // why the whole pass happens before anything is drawn on top of the actors.
  // Everything else the shimmer can reach goes with it: a sheep on the bank is
  // in front of the water, not under it.
  eraseWashFromStanding(standingInFrontOfWater());
}

/** Fixed offsets, so the motes read as one column of disturbed air. */
const INVISIBILITY_MOTES = Object.freeze([-16, 9, -5, 17, -12, 3]);

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
    // Not a frame around the hero. A rectangle is a widget, and the hero is not
    // one: a box drawn on top of them reads as a rendering fault, which is what
    // it looked like. Invisibility is the air closing over someone — a few pale
    // motes that drift up through the silhouette and go out.
    context.save();
    context.fillStyle = '#8fc8c5';
    const time = reducedMotion ? 0.35 : elapsed;
    INVISIBILITY_MOTES.forEach((offsetX, index) => {
      const phase = reducedMotion ? 0.45 : (time * 0.5 + index * 0.17) % 1;
      context.globalAlpha = Math.sin(phase * Math.PI) * 0.42;
      context.fillRect(
        pixelRound(centerX + offsetX),
        pixelRound(centerY + 26 - phase * 62),
        phase > 0.5 ? 2 : 3,
        2,
      );
    });
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
    } else if (projectile.kind === 'bolt') {
      // Shorter and thicker than an arrow, with a steel head and no fletching.
      context.globalAlpha *= 0.26;
      context.fillRect(-20, -1, 9, 2);
      context.globalAlpha = Math.min(1, projectile.life * 3);
      context.fillStyle = '#6b5a45';
      context.fillRect(-10, -3, 17, 6);
      context.fillStyle = '#cdd6dd';
      context.fillRect(5, -4, 7, 8);
      context.fillRect(10, -2, 4, 4);
    } else if (projectile.kind === 'stone') {
      // A tumbling pebble: no point, no direction, just mass going forward.
      context.globalAlpha *= 0.24;
      context.fillRect(-18, -3, 8, 6);
      context.globalAlpha = Math.min(1, projectile.life * 3);
      context.rotate(elapsed * 11);
      context.fillStyle = '#8d8579';
      context.fillRect(-5, -5, 10, 10);
      context.fillStyle = '#b3aa9b';
      context.fillRect(-3, -3, 5, 5);
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
    const color = atmosphereThemeFor(dungeon.themeId).dust;
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
    context.globalAlpha = 0.34 + Math.sin(elapsed * 3) * 0.08;
    context.fillStyle = '#9c618a';
    // It lies on the ground at the boss's feet, so it is squashed, not tilted.
    drawPixelRing(position.x, position.y + 22, 26, { squash: 0.46, stud: 4 });
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
  if (cell === '~') return WATER_BED[hash(x, y, 23) % WATER_BED.length];
  // A tavern has a floor somebody laid. Without this the common room stands on
  // whatever the place around it is made of — moss on the moor, cobbles in the
  // city — and reads as furniture left outside rather than a room.
  if (boardedFloorCells.has(`${x},${y}`)) {
    return TAVERN_FLOOR_PATHS[hash(x, y, 29) % TAVERN_FLOOR_PATHS.length];
  }
  // The green in the middle of the town. Streets stay trodden earth, so the
  // square reads as a place people keep rather than a place they walk over.
  if (greenFloorCells.has(`${x},${y}`)) {
    return CITY_GREEN_PATHS[hash(x, y, 31) % CITY_GREEN_PATHS.length];
  }
  const isBlood =
    cell === '.' && theme.bloodModulo > 0 && hash(x, y, 17) % theme.bloodModulo === 0;
  return isBlood
    ? BLOOD_FLOOR_PATHS[hash(x, y) % BLOOD_FLOOR_PATHS.length]
    : theme.floors[hash(x, y) % theme.floors.length];
}

function wallTextureAt(x, y, cell, theme) {
  if (cell === 'D') return doorPanelVisual.path;
  // A wall somebody put up is not the ground it stands on, and neither is the
  // rock a cave was cut from. Both come from the floor, which is the only place
  // that knows; the grid is just '#' either way.
  const key = `${x},${y}`;
  if (builtWallCells.has(key)) return BUILT_WALLS[hash(x, y, 5) % BUILT_WALLS.length];
  if (hewnWallCells.has(key)) return HEWN_WALLS[hash(x, y, 7) % HEWN_WALLS.length];
  const accented =
    theme.accentModulo > 0 &&
    theme.accentWalls.length > 0 &&
    hash(x, y, 9) % theme.accentModulo === 0;
  const collection = accented ? theme.accentWalls : theme.walls;
  return collection[hash(x, y, 3) % collection.length];
}

function rebuildDungeonWorld3D() {
  const theme = biomeThemeFor(dungeon.themeId);
  dungeonWorld3D.rebuild({
    grid: world,
    doors: doorDefinitions,
    theme,
    imageForPath: image,
    floorPathAt: (x, y, cell) => floorTextureAt(x, y, cell, theme),
    wallPathAt: (x, y, cell) => wallTextureAt(x, y, cell, theme),
    skipWallAt: (x, y) => thicketCells.has(`${x},${y}`),
  });
}

/**
 * Подземелья за главным меню.
 *
 * Меню стояло на застывшем кадре первого этажа — одном и том же у каждого,
 * кто открывал игру. Иван: «на фоне я хочу, чтобы были подземелья вот наши и
 * чтобы там по ним как-нибудь клёво камера летала, а потом оно сменяется на
 * другое подземелье».
 *
 * Мир при этом не живёт: в меню кадр не обновляется, монстры не ходят. Летит
 * только камера, а этаж стоит — и это ровно то, что нужно: за меню видно
 * место, а не бой.
 *
 * Герой едет вместе с камерой, невидимый: свет, туман и глубина считаются от
 * него, и без этого фонарь остался бы стоять там, где его бросили.
 */
let showreelSeconds = 0;
let showreelTurn = -1;
let showreelPath = null;
let showreelFade = 0;
/** Этаж забега, на который надо вернуться, когда меню закроется. */
let showreelBorrowedFloor = false;

const showreelActive = () => uiScreen === 'menu' && menuMode !== 'pause' && ready;

/** Крайние проходимые клетки — по ним и летит камера. */
function walkableBounds(grid) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      if (grid[y][x] === '#') continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, maxX: grid[0].length - 1, minY: 0, maxY: grid.length - 1 };
  return { minX, maxX, minY, maxY };
}

/** Собрать показываемый этаж. Забег при этом не трогается — только картинка. */
function buildShowreelFloor(scene, turn) {
  dungeon = generateDungeon({ seed: scene.seed, depth: scene.depth, branch: scene.branch });
  world = dungeon.grid;
  doorDefinitions = dungeon.doors.map((door) => ({ ...door }));
  builtWallCells = new Set(dungeon.builtWalls ?? []);
  thicketCells = new Set(dungeon.thicketWalls ?? []);
  hewnWallCells = new Set(dungeon.hewnWalls ?? []);
  greenFloorCells = new Set(cityGreenCells(dungeon.city));
  waterPaths = waterTiles(dungeon.themeId);
  dungeonEnvironment = createDungeonEnvironment(dungeon, { graveyardRoom: null });
  mistAnchors = createMistAnchors(dungeon);
  voidStarLayers = createVoidStars(dungeon);
  /*
   * Этаж показывают целым, а не пустым.
   *
   * Сперва я вычистила с него всё живое и всё лежащее — и получила чёрный
   * коридор: свет в игре идёт от находок, костров и фонтанов, и без них
   * смотреть не на что. Мир в меню всё равно не тикает, так что стоящий
   * монстр — это картинка места, а не бой.
   */
  monsters = createMonsters(dungeon);
  passiveCreatures = createPassiveCreatures(dungeon);
  lootDefinitions = createFloorLoot(dungeon);
  eventDefinitions = createEventDefinitions(dungeon);
  findDefinitions = createFindDefinitions(dungeon);
  trapDefinitions = [];
  placedTraps = [];
  floorGhost = null;
  allies = [];
  // Показывают целое место, а не то, что успели разведать.
  revealed.clear();
  for (let y = 0; y < world.length; y += 1) {
    for (let x = 0; x < world[y].length; x += 1) {
      if (world[y][x] !== '#') revealed.add(`${x},${y}`);
    }
  }
  showreelPath = showreelCameraPath(walkableBounds(world), turn);
  showreelBorrowedFloor = true;
  rebuildDungeonWorld3D();
}

/** Вернуть этаж забега — тот самый, с того же места. */
function returnBorrowedFloor() {
  if (!showreelBorrowedFloor) return;
  showreelBorrowedFloor = false;
  showreelTurn = -1;
  showreelFade = 0;
  menuBackdrop.style.opacity = '0';
  replaceFloor(run.depth, { x: run.hero.x, y: run.hero.y });
}

function updateMenuShowreel(delta) {
  if (!showreelActive()) return;
  // Спокойный режим смотрит одно место и не летает: смена вида и движение
  // камеры — ровно то, от чего он и защищает.
  const frame = showreelFrame(reducedMotion ? 0 : showreelSeconds, SHOWREEL_SCENES);
  if (frame.turn !== showreelTurn) {
    showreelTurn = frame.turn;
    buildShowreelFloor(frame.scene, frame.turn);
  }
  showreelSeconds += delta;
  showreelFade = frame.fade;
  menuBackdrop.style.opacity = String(frame.fade);
  if (!showreelPath) return;
  const точка = showreelCameraAt(showreelPath, reducedMotion ? 0.5 : frame.progress);
  camera.x = (точка.x + 0.5) * TILE;
  camera.y = (точка.y + 0.5) * TILE;
  hero.x = camera.x;
  hero.y = camera.y;
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

  // The shimmer is drawn a pixel wider than its cell so that neighbouring tiles
  // leave no seam between them — which also means it spills half a tile past
  // the last one. Inside a lake nobody can tell; at the shore it washed over
  // the grass and over the tops of the walls standing south of the water, and
  // those walls looked like glass. So the whole pass is held to the water: the
  // cells themselves, edge to edge, and not a pixel of anything else.
  const shore = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (world[y][x] !== '~' || !revealed.has(`${x},${y}`)) continue;
      shore.push({ x, y });
    }
  }
  if (shore.length === 0) return;
  context.save();
  context.beginPath();
  for (const { x, y } of shore) {
    const corner = worldToScreen(x * TILE, y * TILE);
    context.rect(corner.x, corner.y, TILE, TILE);
  }
  context.clip();
  // The world is lit by real lights and dims with distance; this sprite is not,
  // so far-off water stayed bright daylight blue while the grass beside it went
  // black — and a wall standing in that water read as a hole cut through it.
  // The shimmer fades by the same fog the cell is about to be given.
  const heroCellX = Math.floor(hero.x / TILE);
  const heroCellY = Math.floor(hero.y / TILE);
  for (const { x, y } of shore) {
    const wave = Math.floor(elapsed * 1.5 + hash(x, y)) % waterPaths.length;
    const fog = fogTileOpacity({
      known: true,
      distance: Math.hypot(x - heroCellX, y - heroCellY),
    });
    drawSprite(waterPaths[wave], (x + 0.5) * TILE, (y + 0.5) * TILE, TILE + 1, {
      alpha: 0.58 * Math.max(0, 1 - fog),
    });
  }
  context.restore();
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

/**
 * A gold pile is a whole 32px Dungeon Crawl tile drawn untrimmed, so a handful
 * of coins stays small and a heap fills the cell. Slightly under a full tile,
 * low on it: it lies on the floor, it does not stand.
 */
const GOLD_PILE_SIZE = 56;
const GOLD_PILE_OFFSET_Y = -2;

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
    // Вещь лежит на полу, а не висит над ним: дышит только её свечение.
    if (isBelt) drawGroundBelt(position, rarity, 0);
    // The same picture the backpack, the toast and «что рядом» show — see
    // `itemPicture`. Gold is the one exception: a pile tile chosen by amount.
    const picture = floorPicture(displayItem);
    const size = picture.trim
      ? (isBelt ? 18 : 44) * (displayItem.visualScale ?? 1)
      : GOLD_PILE_SIZE;
    drawSprite(picture.path, x, y, size, {
      offsetY: picture.trim ? displayItem.visualOffsetY ?? -7 : GOLD_PILE_OFFSET_Y,
      ...(picture.filter ? { filter: `${VISIBILITY_TUNING.spriteFilter} ${picture.filter}` } : {}),
      trim: picture.trim,
    });
  }
}

function drawEvents() {
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
    /*
     * Ничто неподвижное не парит.
     *
     * Сперва качалось всё, что лежит на этаже, и саркофаг плыл над полом.
     * Потом качание оставили воде и пламени — и вместе с ними поплыли
     * каменный фонтан и кровавый алтарь. Иван: «это алтарь, он должен стоять
     * на месте… такое правило для всего, что стоит на месте». Спрайт события
     * стоит; вода и огонь живут светом, а не прыжками камня.
     */
    drawSprite(
      event.definition.path,
      event.x,
      event.y,
      62 * (event.definition.visualScale ?? 1),
      { offsetY: event.definition.visualOffsetY ?? -5 },
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
    const bait = trap.kind === PLAYER_BAIT_KIND;
    const visual = bait
      ? (armed ? armedBaitVisual : spentBaitVisual)
      : (armed ? armedPlayerTrapVisual : spentPlayerTrapVisual);
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
}

function drawMotes(layer = 1) {
  const theme = atmosphereThemeFor(dungeon.themeId);
  // Each chapter breathes differently: ash drifts, sand races, snow falls.
  const weather = chapterWeather(biomeThemeFor(dungeon.themeId).palette);
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
  const theme = atmosphereThemeFor(dungeon.themeId);
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
  const theme = atmosphereThemeFor(dungeon.themeId);
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
  const theme = atmosphereThemeFor(dungeon.themeId);
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

/**
 * Where the hero is going, drawn on the floor.
 *
 * Tapping a far cell sent the hero off with nothing to show for it: no mark on
 * the target, no line of travel, so the player watched a figure walk and
 * guessed whether it had understood them. Ivan asked for both, and he is right
 * that it is mostly a comfort — but a comfort on every single move.
 *
 * It is drawn under the actors and only while a route is live, so it never
 * competes with a fight.
 */
function drawHeroRoute() {
  if (hero.dead || runStatus !== 'playing' || hero.path.length === 0) return;
  // Only for the player who pointed at a cell. Under a stick or the arrow keys
  // the hero walks one cell at a time and the line is just litter on the floor.
  if (!heroRouteVisible) return;
  const steps = hero.path;
  const destination = steps.at(-1);
  const pulse = reducedMotion ? 0.5 : 0.5 + Math.sin(elapsed * 4.4) * 0.22;
  context.save();
  context.fillStyle = '#e8dcbb';
  // The route still to walk, one stud per cell. Nearer steps are firmer: the
  // far end of a long route is a suggestion, not a promise.
  for (let index = 0; index < steps.length - 1; index += 1) {
    const point = worldToScreen(steps[index].x, steps[index].y);
    context.globalAlpha = Math.max(0.12, 0.42 - (index / Math.max(1, steps.length)) * 0.2);
    context.fillRect(pixelRound(point.x - 2), pixelRound(point.y - 2), 4, 4);
  }
  // And the cell the player actually pointed at, ringed in studs like every
  // other mark in the world: a hairline rectangle is not this game's drawing.
  const target = worldToScreen(destination.x, destination.y);
  context.globalAlpha = 0.34 + pulse * 0.3;
  context.fillStyle = '#f0e3bd';
  drawPixelRing(target.x, target.y, TILE * 0.38, { squash: 0.62, stud: 3, gap: 1.6 });
  context.restore();
}

function drawSparks() {
  for (const spark of sparks) {
    const position = worldToScreen(spark.x, spark.y);
    const progress = Math.max(0, spark.life / spark.maxLife);
    const size = spark.size ?? (progress > 0.55 ? 4 : 2);
    context.save();
    context.globalAlpha = progress * (spark.alpha ?? 1);
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

/**
 * Число над героем с тем, ЧЕГО оно: «+12» и сердце, «+1» и меч.
 *
 * Метка в конце строки — та же, что в подписях (`{heal}`, `{maxhp}`,
 * `{attack}`), только здесь вместо слова рисуется сам значок: пиксельный
 * шрифт над головой знает одни цифры, а слово скажет всплывающая строка.
 */
const GLYPH_ICON_SIZE = 18;
const GLYPH_ICON_SUFFIX = /\{([a-z]+)\}$/;

function drawPixelGlyphText(source, x, y, color, alpha) {
  const block = 3;
  const glyphWidth = block * 3;
  const advance = glyphWidth + block;
  const iconMatch = GLYPH_ICON_SUFFIX.exec(source);
  const iconPath = iconMatch ? TEXT_ICONS[iconMatch[1]]?.path : null;
  const text = iconMatch ? source.slice(0, iconMatch.index) : source;
  const icon = iconPath ? image(iconPath) : null;
  const characters = [...text];
  const textWidth = characters.length * advance - block;
  const width = textWidth + (icon ? GLYPH_ICON_SIZE + block : 0);
  context.save();
  context.translate(pixelRound(x - width / 2), pixelRound(y));
  context.globalAlpha = alpha;
  context.fillStyle = '#050708';
  context.fillRect(-3, -3, width + 6, 21);
  if (icon) {
    context.imageSmoothingEnabled = false;
    context.drawImage(icon, textWidth + block, -2, GLYPH_ICON_SIZE, GLYPH_ICON_SIZE);
  }
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
    const travel = reducedMotion ? 0 : progress;
    drawPixelGlyphText(
      glyph.text,
      position.x + (glyph.drift?.dx ?? 0) * travel,
      position.y + glyph.offsetY + (glyph.drift?.dy ?? 0) * travel - travel * 24,
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
    drawPixelRing(pixelRound(target.x), pixelRound(target.y + 5), radius * 0.72, { stud: 4 });
    context.restore();
  }
}

function drawImpactWaves() {
  for (const wave of impactWaves) {
    const position = worldToScreen(wave.x, wave.y);
    const progress = 1 - wave.life / wave.maxLife;
    const radius = Math.round((10 + progress * wave.size) / PIXEL_EFFECT_SCALE) * PIXEL_EFFECT_SCALE;
    context.save();
    context.globalAlpha = Math.max(0, wave.life / wave.maxLife) * 0.8;
    context.fillStyle = wave.color;
    drawPixelRing(position.x, position.y, radius * 0.72, { stud: PIXEL_EFFECT_SCALE * 2 });
    context.restore();
  }
}

function atmosphereLightSources() {
  const theme = atmosphereThemeFor(dungeon.themeId);
  const sources = [
    /*
     * Свет показа: три фонаря, летящих с камерой.
     *
     * Один не справляется — у источника постоянная яркость, и радиус только
     * растягивает её тоньше. Трое, расставленные вокруг центра кадра, держат
     * освещённой всю видимую полосу, а не пятно под собой.
     */
    ...(showreelActive() ? [[0, 0], [-3.2, -2.2], [3.2, 2.2]].map(([dx, dy], index) => ({
      id: `showreel-lantern-${index}`,
      x: camera.x + dx * TILE,
      y: camera.y + dy * TILE,
      gridX: Math.floor(camera.x / TILE + dx),
      gridY: Math.floor(camera.y / TILE + dy),
      color: theme.heroLight,
      radius: 8.5,
      phase: index * 1.3,
      beam: false,
    })) : []),
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
        flame: decoration.light.flame === true,
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
  if (levelUpGlow > 0 && !hero.dead) {
    sources.push({
      id: 'hero-level-up',
      x: hero.x,
      y: hero.y,
      gridX: Math.floor(hero.x / TILE),
      gridY: Math.floor(hero.y / TILE),
      color: '#f5dd9a',
      radius: 1.4 + levelUpGlow * 2.6,
      phase: 0.2,
      beam: false,
      flame: false,
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
  return applyAmbientLight(sources.filter(({ gridX, gridY }) => revealed.has(`${gridX},${gridY}`)));
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

/** How far the hero uncovers the map: one radius below, daylight in town. */
function currentRevealRadius() {
  /*
   * Что видно — то и разведано.
   *
   * Радиус памяти был четыре клетки, а зрения — пять с лишним, и между ними
   * жила полоса: игрок видел клетку на экране, а игра считала её
   * неразведанной. Тычок туда не делал ничего вовсе, а путь мимо неё уходил в
   * обход. Полосы больше нет.
   */
  const base = Math.max(2, HERO_SIGHT_RADIUS + currentConditions().revealRadiusDelta);
  if (isCityDepth(dungeon.depth)) return Math.max(base, CITY_REVEAL_RADIUS);
  // Outside, the sky does the work the torch does below.
  if (dungeon.branch === 'surface') return Math.max(base, SURFACE_REVEAL_RADIUS);
  return base;
}

function drawLighting() {
  const theme = atmosphereThemeFor(dungeon.themeId);
  const heroPosition = worldToScreen(hero.x, hero.y);
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const sources = atmosphereLightSources();
  const reveal = revealProgress();
  const daylight = isCityDepth(dungeon.depth)
    ? CITY_LIGHT_MULTIPLIER
    : dungeon.branch === 'surface' ? SURFACE_LIGHT_MULTIPLIER : 1;
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
  // The veil of darkness is what makes a cave a cave. Outside it is daytime:
  // the same veil at full strength turned a sunlit steppe into another cavern,
  // so the daylight that widens the lit pool thins the veil by as much.
  atmosphereContext.globalAlpha = VISIBILITY_TUNING.darknessOpacity / daylight;
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
  // The dark belongs to the place it is in: the infernal core is not unlit in
  // the same colour as the frozen depths.
  const darkness = atmosphereThemeFor(dungeon.themeId).darkness;
  const minX = Math.max(0, Math.floor((camera.x - viewportWidth / 2) / TILE) - 1);
  const maxX = Math.min(WORLD_WIDTH - 1, Math.ceil((camera.x + viewportWidth / 2) / TILE) + 1);
  const minY = Math.max(0, Math.floor((camera.y - viewportHeight / 2) / TILE) - 1);
  const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil((camera.y + viewportHeight / 2) / TILE) + 1);
  context.save();
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const opacity = fogTileOpacity({
        known: revealed.has(`${x},${y}`),
        distance: Math.hypot(x - heroX, y - heroY),
      });
      if (opacity <= 0) continue;
      const position = worldToScreen(x * TILE, y * TILE);
      context.fillStyle = darkness;
      context.globalAlpha = opacity;
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
    : composePlayerLayerStack({
      baseVisual: resolvedAppearance.body,
      hairVisual: resolvedAppearance.hair,
    });
  for (const { path, filter } of layers) {
    const mirrored = path.startsWith('mirror:');
    const sprite = image(mirrored ? path.slice('mirror:'.length) : path);
    if (!sprite) continue;
    targetContext.save();
    targetContext.filter = filter ?? 'none';
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

    // A two-handed weapon occupies the off hand too, and an empty-looking
    // second slot beside it reads as room for a shield. Ivan asked to see the
    // weapon itself there, faded: the hand is busy, and busy with this.
    const twoHanded = slot === 'hand2' && isTwoHandedItem(equippedItem('hand1'))
      ? equippedItem('hand1')
      : null;
    button.dataset.occupied = String(Boolean(twoHanded));

    if (!item && twoHanded) {
      const held = presentedItem(twoHanded);
      delete button.dataset.rarity;
      paintItemIcon(icon, held);
      const name = itemPresentation(held, itemDetailLanguage).name;
      button.title = `${slotLabel}: ${name}`;
      button.setAttribute('aria-label', `${slotLabel}: ${labels.bothHands} — ${name}`);
      button.onclick = null;
      continue;
    }

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
    paintItemIcon(icon, displayItem);
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
  const marked = [...markedForSalvage].map((index) => backpackItems[index]).filter(Boolean);
  const preview = salvageYield({
    reward: marked.reduce((sum, item) => {
      const displayItem = presentedItem(item);
      return sum + (displayItem ? 2 + displayItem.rarity * 4 : 0);
    }, 0),
    profile: salvageProfile(currentSkillCapabilities()),
  });
  salvageConfirm.querySelector('b').textContent = String(preview.gold);
  salvageConfirm.disabled = markedForSalvage.size === 0;
}

/**
 * Сколько мест занято — рядом со словом «Рюкзак».
 *
 * Иван: «мне не нравится, как у нас отображаются сколько свободно в
 * инвентаре. Я бы это отображал возле слова рюкзак, когда открываешь меню
 * инвентаря. То есть рюкзак. И показываем, что 2 из 30» (мест теперь двадцать).
 */
function renderInventoryCapacity() {
  const занято = backpackItems.filter(Boolean).length;
  const всего = currentBackpackCapacity();
  inventoryCapacity.textContent = `${занято}/${всего}`;
  inventoryCapacity.setAttribute(
    'aria-label',
    itemDetailLanguage === 'en' ? `${занято} of ${всего} slots` : `Занято ${занято} из ${всего}`,
  );
}

function renderPack() {
  packGrid.replaceChildren();
  const labels = currentMainMenuModel().labels;
  /**
   * Фильтры и переключатель вида появляются только когда в рюкзаке есть что
   * искать. Над двумя вещами они не экономили ни одного движения — только
   * занимали верх экрана и просили в себе разобраться.
   */
  const carried = backpackItems.filter(Boolean).length;
  const controls = inventoryControlsUseful(carried);
  // Разбирать нечего — и кнопки разбора нет. Пустой рюкзак не предлагает
  // действий над тем, чего в нём не лежит.
  salvageButton.hidden = carried === 0;
  inventoryFilters.hidden = !controls;
  inventoryViewSwitcher.hidden = !controls;
  // Спрятанная вкладка не должна оставлять рюкзак отфильтрованным: иначе вещи
  // пропадают, а кнопки, которая это объяснит, на экране больше нет.
  if (!controls && inventoryFilter !== 'all') {
    inventoryFilter = 'all';
    updateInventoryFilterUi();
  }
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
      paintItemIcon(icon, displayItem);
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

  renderInventoryVitals();
  const itemCount = backpackItems.filter(Boolean).length;
  bagButton.querySelector('b').textContent = String(itemCount);
  const capacity = currentBackpackCapacity();
  // Занятые места показываются в заголовке рюкзака — там, где их ищут.
  renderInventoryCapacity();
  updateInventoryViewUi();
}

/**
 * Здоровье, сытость и бодрость — числами, в шапке рюкзака.
 *
 * Иван: «я должен в инвентаре видеть своё хп, голод и сон, а то не понимаю,
 * сколько мне прибавит еда». Карточка обещает «+10 ❤» и «+5 мин», и сравнить
 * это обещание было не с чем: полоски в верхней панели показывают долю, а не
 * счёт, и на них не написано ни сколько есть, ни сколько всего.
 */
function renderInventoryVitals() {
  const maxHp = currentHeroStats().maxHp;
  inventoryHealth.textContent = `${Math.max(0, Math.round(hero.hp))}/${maxHp}`;
  const hunger = hungerPresentation(hero.hunger, itemDetailLanguage);
  const rest = restPresentation(hero.rest, itemDetailLanguage);
  const short = itemDetailLanguage === 'ru' ? 'мин' : 'min';
  inventoryHunger.textContent = `${hunger.minutes} ${short}`;
  inventoryRest.textContent = `${rest.minutes} ${short}`;
  // Полоски наполняет `renderHungerHud`, но рюкзак могут открыть раньше, чем
  // она успеет пройти следующий раз.
  renderHungerHud();
  const health = itemDetailLanguage === 'ru' ? 'Здоровье' : 'Health';
  inventoryVitals.setAttribute(
    'aria-label',
    `${health} ${inventoryHealth.textContent}`
      + ` · ${hunger.label} ${hunger.minutes} ${short}`
      + ` · ${rest.label} ${rest.minutes} ${short}`,
  );
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

function renderLootToast({ item, value, feedback = feedbackFor({ value }) }) {
  const definition = item?.id ? lootById(item.id) : null;
  const displayItem = definition ? presentedItem({ ...definition, ...item }) : item;
  const informative = Boolean(definition || displayItem?.unidentified);
  const color = rarityGlow[displayItem?.rarity ?? 1] ?? rarityGlow[1];
  lootToast.style.setProperty('--rarity', color);
  lootToast.dataset.informative = String(informative);
  const toastIcon = lootToast.querySelector('img');
  // Gold is counted, not looked at: its toast keeps the interface coin, the
  // same one as the purse. Every other item shows its own picture — the one on
  // the floor a moment ago and in the backpack a moment later.
  if (definition && !definition.gold) paintItemIcon(toastIcon, displayItem);
  else {
    toastIcon.src = spriteUrl(displayItem?.icon ?? displayItem?.path);
    paintMaterial(toastIcon, null);
  }
  // A refusal must not look like a gift. The full backpack used to be shown on
  // exactly the card a pickup uses — same icon, same name, same rarity, with
  // one small line changed — so the player read «taken» and then found the
  // thing still lying there. Ivan hit it twice before saying so.
  lootToast.dataset.refused = String(value === 'full');
  // Тон решает `feedbackFor` — здесь его только показывают.
  lootToast.dataset.tone = feedback.tone;
  lootToast.dataset.accent = feedback.accent ?? '';

  if (informative) {
    const presentation = itemPresentation(displayItem, itemDetailLanguage);
    const labels = currentMainMenuModel().labels;
    lootName.textContent = presentation.name;
    lootRarity.textContent = presentation.rarityMarks;
    lootRarity.setAttribute('aria-label', presentation.rarity);
    lootSlot.textContent = `${presentation.rarity} · ${presentation.slot}`;
    const effectText = value === 'equipped'
      ? labels.equipped
      : value === 'full'
        ? labels.inventoryFullShort
        // «−1» было голым числом: вещь ушла, и это надо сказать словами.
        : value === '\u22121'
          ? feedbackCopy(itemDetailLanguage).spent
          // A plain sentence means the runtime has something to say about this
          // very use, which beats repeating what the item always does.
          : typeof value === 'string' && value !== ''
            ? value
            : presentation.primaryEffect.text;
    fillTextWithIcons(lootEffect, effectText, { words: true });
    if (typeof value === 'number' && value > 1) lootValue.textContent = `+${value}`;
    else if ((item.stack ?? 0) > 1) lootValue.textContent = `×${item.stack}`;
    else lootValue.textContent = '';
    lootToast.setAttribute(
      'aria-label',
      `${presentation.name}. ${presentation.rarity}. ${presentation.slot}. ${textIconsToWords(effectText)}`,
    );
    return;
  }

  /*
   * Итог без карточки вещи: картинка слева говорит, откуда он, а строка —
   * что именно пришло или ушло. Голое число сюда больше не попадает: места,
   * что приносят золото или здоровье, пишут «+5 {gold}», и метка становится
   * монетой со словом.
   */
  const text = typeof value === 'number' ? `${value >= 0 ? '+' : ''}${value}` : String(value);
  fillTextWithIcons(lootName, text, { words: true });
  lootRarity.textContent = '';
  lootSlot.textContent = '';
  lootEffect.textContent = '';
  lootValue.textContent = '';
  lootToast.setAttribute('aria-label', textIconsToWords(text));
}

function showNextLootToast() {
  if (toastVisible || lootToastQueue.length === 0) return;
  const entry = lootToastQueue.shift();
  toastVisible = true;
  activeLootToastEntry = entry;
  renderLootToast(entry);
  lootToast.classList.add('visible');
  // Появление проигрывается заново для каждого итога, даже подряд.
  lootToast.classList.remove('announce');
  void lootToast.offsetWidth;
  lootToast.classList.add('announce');
  if (entry.feedback.sound) playFeedbackSound(entry.feedback.sound);
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

/**
 * Сказать игроку, что с ним случилось.
 *
 * `kind` — что это было (см. `FEEDBACK_KINDS`): «gold», «heal», «skill-down»…
 * Хорошо это или плохо, как выглядит и как звучит — решает `feedbackFor`, в
 * одном месте на всю игру, а не каждое место по-своему.
 */
function showLootToast(item, value = 12, kind = null) {
  lootToastQueue.push({ item, value, feedback: feedbackFor({ kind, value }) });
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
  // Звук заводится тем же касанием: браузер пускает его только после жеста,
  // и второго такого жеста может не случиться.
  const begin = () => refreshRoadAudio();
  if (levelUpAudio.state === 'suspended') levelUpAudio.resume().then(begin).catch(() => {});
  else begin();
  return levelUpAudio;
}

/**
 * Выход мелодии: своя ручка, включённая в общую.
 *
 * Иван: «надо отдельную настройку для неё — громкость и мут». Узел стоит
 * между мелодией и общим выходом, поэтому выключенный звук по-прежнему
 * выключает всё, а музыкальная ручка убирает только её.
 */
let audioMusicGain = null;

function musicOutput(audio) {
  if (!audioMusicGain || audioMusicGain.context !== audio) {
    audioMusicGain = audio.createGain();
    audioMusicGain.gain.value = effectiveMusicVolume(audioSettings);
    audioMusicGain.connect(audioOutput(audio));
  }
  return audioMusicGain;
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
  if (levelUpAudio && audioMusicGain) {
    audioMusicGain.gain.setTargetAtTime(
      effectiveMusicVolume(audioSettings),
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
  renderMusicMenu();
  const model = audioMenuModel(audioSettings, itemDetailLanguage);
  mainMenuAudio.setAttribute('aria-label', model.groupLabel);
  audioMuteButton.setAttribute('aria-pressed', String(model.muted));
  audioMuteButton.setAttribute('aria-label', model.muteLabel);
  audioMuteButton.title = model.muteLabel;
  /*
   * Значок звука — рисунок, а не буква.
   *
   * Сюда писалась нота или крестик текстом. Иван: «мне вот эта нота не
   * нравится — тонкая, не подходит по стилю», и она вдобавок обещала музыку,
   * которой в игре нет: кнопка глушит весь звук разом. Теперь в кнопке два
   * значка из набора, а видно тот, что отвечает состоянию `aria-pressed`;
   * текст сюда писать нельзя — он сотрёт разметку.
   */
  audioVolumeValue.textContent = model.volumeText;
  audioVolumeDownButton.setAttribute('aria-label', model.quieterLabel);
  audioVolumeUpButton.setAttribute('aria-label', model.louderLabel);
  audioVolumeDownButton.disabled = !model.canLower;
  audioVolumeUpButton.disabled = !model.canRaise;
}

/** Та же строка, но про мелодию: модель общая, узлы свои. */
function renderMusicMenu() {
  const model = musicMenuModel(audioSettings, itemDetailLanguage);
  mainMenuMusic.setAttribute('aria-label', model.groupLabel);
  // Заголовок блока жил только в разметке и оставался русским в английском меню.
  settingsMusicTitle.textContent = model.groupLabel;
  musicMuteButton.setAttribute('aria-pressed', String(model.muted));
  musicMuteButton.setAttribute('aria-label', model.muteLabel);
  musicMuteButton.title = model.muteLabel;
  musicVolumeValue.textContent = model.volumeText;
  musicVolumeDownButton.setAttribute('aria-label', model.quieterLabel);
  musicVolumeUpButton.setAttribute('aria-label', model.louderLabel);
  musicVolumeDownButton.disabled = !model.canLower;
  musicVolumeUpButton.disabled = !model.canRaise;
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

/**
 * Вперёд грузятся только короткие звуки.
 *
 * Раньше при первом касании игра тянула вообще всё, что есть в каталоге. Пока
 * там лежали полсотни ударов по сорок килобайт, это было незаметно. Гул и
 * мелодии — файлы на сотни килобайт каждый, и качать их все разом на телефоне
 * ради одного, который сейчас зазвучит, незачем: оба проигрывателя умеют
 * дождаться своего файла и завестись, когда он приедет.
 */
function preloadAudioSamples(audio) {
  if (typeof fetch !== 'function') return;
  for (const file of AUDIO_SAMPLE_FILES) {
    if (file.startsWith('sfx/')) loadAudioSample(audio, file);
  }
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
/** Когда какой звук звучал в последний раз: итог не повторяет звук действия. */
const recentSoundAt = new Map();

/**
 * Звук итога. Если то же самое прозвучало только что — монеты при подборе,
 * лечение у источника, — второй раз его не играют: это одно событие.
 */
function playFeedbackSound(id) {
  const now = performance.now();
  if (now - (recentSoundAt.get(id) ?? -Infinity) < 400) return false;
  return playSound(id);
}

function playSound(id, { volume = 1 } = {}) {
  recentSoundAt.set(id, performance.now());
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
  // Палитры нет — значит, гула быть не должно: `ambientSample` на неизвестный
  // ключ отдаёт запасную палитру, и тишина превратилась бы в каменный зал.
  if (paletteId === null) {
    stopAmbient();
    return;
  }
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

function stopMusic() {
  const fading = audioMusic;
  audioMusicRequest = null;
  audioMusic = { branchId: null, file: null, nodes: [], gain: null, sampleGain: null, level: fading.level };
  if (!fading.gain || !levelUpAudio) return;
  const now = levelUpAudio.currentTime;
  fading.gain.gain.setTargetAtTime(0.0001, now, 0.6);
  for (const node of fading.nodes) {
    try {
      node.stop(now + 3);
    } catch {
      // Узел мог остановиться сам.
    }
  }
}

/**
 * Мелодия дороги: тише гула и длиннее его.
 *
 * Заводится тем же способом, что и гул, но по другому ключу — по ветке. Пока
 * герой идёт вниз по одной дороге, петля не прерывается ни на одном этаже:
 * обрыв на каждой лестнице превратил бы тему в назойливый отрывок.
 */
/**
 * Чью мелодию заводить.
 *
 * Мелодия спрашивается у дороги, но у города своей дороги нет: он стоит на той
 * же ветке, что и спуск под ним, и в подземелье играла бы городская тема. Город
 * — место, а не ветка, и ключ у него свой.
 */
function musicRoad() {
  /*
   * У меню своя тема, и она не зависит от того, что за ним показывают.
   *
   * Иначе мелодия менялась бы вместе с видом каждые тринадцать секунд — пять
   * тем по кругу, ни одна не успевает начаться. Иван выбрал одну: «Ancient
   * Power of Serpents».
   */
  if (showreelActive()) return 'menu';
  if (bossMusicOn) return 'boss';
  return isCityDepth(run.depth) ? 'city' : run.branch;
}

/**
 * Чей гул заводить.
 *
 * Гул принадлежит этажу, а за меню показывают чужой: на лугу из показа в
 * главном меню пели птицы. Иван: «там были какие-то лишние шумы, типа птички
 * почему-то щебетали». У показа своего воздуха нет — за ним звучит одна
 * мелодия, и `null` означает ровно это: тишину, а не запасную палитру.
 */
function ambientPalette() {
  if (showreelActive()) return null;
  return biomeThemeFor(dungeon.themeId).palette;
}

/**
 * Музыка боя со стражем.
 *
 * Начинается, когда полоса стража появляется на экране, — то есть по тому же
 * условию, по которому игрок понимает, что бой начался. Дальше она держится,
 * пока страж жив, и не мигает от того, что он зашёл за колонну: событие
 * кончается смертью, а не потерей из виду.
 */
let bossMusicOn = false;

function refreshBossMusic() {
  const boss = activeBoss();
  const идёт = bossMusicOn
    ? Boolean(boss)
    : Boolean(boss) && runStatus === 'playing' && isCurrentlyVisible(boss.x, boss.y);
  if (идёт === bossMusicOn) return;
  bossMusicOn = идёт;
  startMusic(musicRoad());
}

function startMusic(branchId) {
  const audio = levelUpAudio;
  if (!audio || audio.state !== 'running') return;
  const sample = musicSample(branchId);
  if (!sample) {
    stopMusic();
    return;
  }
  const file = pickSampleFile(sample, 0);
  audioMusicRequest = branchId;
  if (audioMusic.gain && audioMusic.file === file) {
    audioMusic.branchId = branchId;
    audioMusic.sampleGain.gain.setTargetAtTime(sample.gain, audio.currentTime, 1.2);
    return;
  }
  const buffer = audioSampleBuffers.get(file);
  if (!buffer) {
    if (buffer === undefined) {
      loadAudioSample(audio, file).then((loaded) => {
        if (loaded && audioMusicRequest === branchId && audioMusic.file !== file) startMusic(branchId);
      });
    }
    return;
  }
  stopMusic();
  audioMusicRequest = branchId;
  const now = audio.currentTime;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  // Мелодия входит медленнее гула: она заметнее, и резкое появление слышно.
  gain.gain.setTargetAtTime(Math.max(0.0001, audioMusic.level), now, 2.4);
  gain.connect(musicOutput(audio));
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = Math.min(0.05, buffer.duration / 4);
  source.loopEnd = Math.max(source.loopStart + 0.1, buffer.duration - 0.05);
  const sampleGain = audio.createGain();
  sampleGain.gain.value = sample.gain;
  source.connect(sampleGain);
  sampleGain.connect(gain);
  source.start(now);
  audioMusic = { branchId, file, nodes: [source], gain, sampleGain, level: audioMusic.level };
}

function setMusicLevel(level) {
  audioMusic.level = level;
  if (audioMusic.gain && levelUpAudio) {
    audioMusic.gain.gain.setTargetAtTime(Math.max(0.0001, level), levelUpAudio.currentTime, 0.6);
  }
}

function setAmbientLevel(level) {
  audioAmbient.level = level;
  if (audioAmbient.gain && levelUpAudio) {
    audioAmbient.gain.gain.setTargetAtTime(Math.max(0.0001, level), levelUpAudio.currentTime, 0.5);
  }
}

/**
 * Звук догоняет место — сам, каждый кадр.
 *
 * Раньше оба слоя будились в трёх местах, и любой переход, о котором забыли,
 * оставлял игрока с чужим звуком. Иван: «когда я нажал „Продолжить играть“,
 * музыка из меню не остановилась, а продолжилась в игре» — выход из меню как
 * раз и был таким местом: показ кончался, а тему никто не переспрашивал.
 *
 * Спрашивать стоит дёшево: пока ответ тот же, что уже играет, обе проверки
 * ничего не делают, а `startMusic`/`startAmbient` и сами не перезаводят
 * звучащую петлю.
 */
function refreshRoadAudio() {
  const road = musicRoad();
  if (road !== audioMusicRequest) startMusic(road);
  const palette = ambientPalette();
  if (palette !== audioAmbientRequest) startAmbient(palette);
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
    interactAvailable: interactActions.childElementCount > 0,
    interacted: onboardingInteracted || run.floor.opened.length > 0 || run.floor.resolved.length > 0,
    inCity: isCityDepth(dungeon.depth),
    houseOwned: run.house.owned,
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
  // Обучение выключено (`ONBOARDING_ENABLED`). Выходим до всего остального:
  // ни подсказки на экране, ни записи в localStorage.
  if (!ONBOARDING_ENABLED) return;
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

/**
 * A new level should feel like something.
 *
 * It had a panel, a chime and one puff of sparks — correct, and over before the
 * player had looked up. Ivan asked for it to be an occasion. So the hero stands
 * in a column of light for a moment: gold rises off them, two rings go out at
 * different speeds, and the floor around them is genuinely brighter while it
 * lasts. Nothing here is new art; it is the particle system and the lighting
 * the game already has, used properly for one second.
 */
let levelUpGlow = 0;

function updateLevelUpGlow(delta) {
  if (levelUpGlow <= 0) return;
  levelUpGlow = Math.max(0, levelUpGlow - delta);
}

function levelUpFlare(levelsGained) {
  levelUpGlow = 1.6;
  const studs = 34 + levelsGained * 10;
  for (let index = 0; index < studs; index += 1) {
    const spread = (index / studs - 0.5) * TILE * 1.5;
    sparks.push({
      x: hero.x + spread,
      y: hero.y + 6 - Math.random() * 10,
      vx: spread * 0.18,
      vy: -34 - Math.random() * 30,
      life: 0.7 + Math.random() * 0.9,
      maxLife: 1.6,
      color: index % 3 === 0 ? '#fff0bd' : '#e5c965',
      drift: true,
      size: index % 4 === 0 ? 4 : 3,
      alpha: 0.9,
    });
  }
  // Two rings at different speeds read as one thing expanding, not as a blink.
  addImpactWave(hero.x, hero.y - 10, '#f2dc94', 58, 2);
  addImpactWave(hero.x, hero.y - 10, '#d4b653', 104, 0);
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
    levelUpFlare(progression.levelsGained);
    beginHitStop(0.09);
  }
  levelUpTimer = window.setTimeout(clearLevelUpCelebration, LEVEL_UP_PRESENTATION_MS);
}

function romanDepth(value) {
  // The surface has no number: the badge shows the town instead of a numeral.
  if (isCityDepth(value)) return itemDetailLanguage === 'ru' ? 'ГОРОД' : 'TOWN';
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

/**
 * Hunger and tiredness as states you can see.
 *
 * Both already weakened the hero — a strong hunger takes a fifth off attack and
 * defence, being spent hides half of what a search would find — and both were
 * shown only as an unlabelled bar at the top of the screen. So the hero got
 * worse and the player had no way to learn why. Ivan asked for them as debuffs,
 * and they already carry the sentence that explains them; they only needed a
 * place to stand.
 *
 * They have no timer: a state that lasts until you eat or sleep is not counted
 * in seconds, so these badges carry a glyph instead of a number.
 */
function standingHeroStates() {
  const states = [];
  const ru = itemDetailLanguage === 'ru';
  const left = (minutes) => (ru ? `Хватит примерно на ${minutes} мин.` : `About ${minutes} min left.`);
  const hunger = hungerPresentation(hero.hunger, itemDetailLanguage);
  if (hunger.id !== 'fed') {
    states.push({
      id: `hunger:${hunger.id}`,
      label: hunger.label,
      description: hunger.description,
      // A state without a timer still has a horizon, and the window has room
      // for it: «ещё примерно двенадцать минут» is the difference between
      // «eat now» and «eat when convenient».
      kind: ru ? 'Голод' : 'Hunger',
      remaining: left(hunger.minutes),
      glyph: '◔',
      color: hunger.id === 'mild' ? '#c2a765' : hunger.id === 'strong' ? '#cf8a4d' : '#c25a4a',
    });
  }
  const rest = restPresentation(hero.rest, itemDetailLanguage);
  if (rest.id !== 'rested') {
    states.push({
      id: `rest:${rest.id}`,
      label: rest.label,
      description: rest.description,
      kind: ru ? 'Усталость' : 'Tiredness',
      remaining: left(rest.minutes),
      glyph: '☾',
      color: rest.id === 'weary' ? '#8f92c0' : '#6f72a8',
    });
  }
  return states;
}

/**
 * Reading a state you are carrying.
 *
 * First answer was a line in the corner that erased itself after six seconds.
 * Ivan, on his phone: «пускай открывается модалка на всё окно, чтобы нормально
 * почитать, а не вот это вот маленькое окошко». A complicated state needs room,
 * and an encyclopedia is going to want the same room later — so the window is
 * one window, not a lean-to on the badges.
 */
let loreReturnFocus = null;

function openLore({ title, subtitle = '', icon = null, glyph = '', color = null, body = [] }) {
  if (!loreDialog) return false;
  loreReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  loreTitle.textContent = title;
  loreSubtitle.textContent = subtitle;
  loreSubtitle.hidden = subtitle.length === 0;
  loreCard.style.setProperty('--lore-color', color ?? '#c9a84f');
  // A state may be a sprite or a glyph; the frame holds either.
  loreIcon.hidden = !icon;
  if (icon) loreIcon.src = spriteUrl(icon);
  loreGlyph.textContent = icon ? '' : glyph;
  loreGlyph.hidden = Boolean(icon);
  loreBody.replaceChildren(...body.flatMap((entry) => {
    if (!entry) return [];
    if (typeof entry === 'string') {
      const line = document.createElement('p');
      line.textContent = entry;
      return [line];
    }
    const heading = document.createElement('h3');
    heading.textContent = entry.heading;
    const line = document.createElement('p');
    line.textContent = entry.text;
    return [heading, line];
  }));
  loreDialog.inert = false;
  loreDialog.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => closeLoreButton.focus());
  return true;
}

function loreIsOpen() {
  return loreDialog?.getAttribute('aria-hidden') === 'false';
}

function closeLore() {
  if (!loreIsOpen()) return false;
  loreDialog.setAttribute('aria-hidden', 'true');
  loreDialog.inert = true;
  const target = loreReturnFocus;
  loreReturnFocus = null;
  if (target?.isConnected) requestAnimationFrame(() => target.focus());
  return true;
}

function updateHeroEffectNote() {}

function renderHeroEffectsHud() {
  // The dish sits beside the states, because it is one: a good one with a timer.
  const meal = activeMeal(hero.meal, itemDetailLanguage);
  const effects = [
    ...(meal ? [{ ...meal, duration: meal.remaining }] : []),
    ...activeActorEffects(hero.effects, itemDetailLanguage),
  ];
  const secondsLabel = itemDetailLanguage === 'ru' ? 'сек.' : 'sec.';
  const standing = standingHeroStates();
  heroEffectsHud.setAttribute(
    'aria-label',
    itemDetailLanguage === 'ru' ? 'Состояния героя' : 'Hero effects',
  );
  heroEffectsHud.replaceChildren(
    ...standing.map((state) => {
      const badge = document.createElement('button');
      const mark = document.createElement('b');
      const caption = document.createElement('i');
      badge.type = 'button';
      badge.className = 'hero-effect hero-effect-standing tappable';
      badge.dataset.effect = state.id;
      badge.style.setProperty('--effect-color', state.color);
      badge.setAttribute('aria-label', `${state.label}. ${state.description}`);
      badge.title = `${state.label} · ${state.description}`;
      badge.addEventListener('click', () => openLore({
        title: state.label,
        subtitle: state.kind,
        glyph: state.glyph,
        color: state.color,
        body: [state.description, state.remaining].filter(Boolean),
      }));
      mark.textContent = state.glyph;
      caption.textContent = state.label;
      badge.append(mark, caption);
      return badge;
    }),
    ...effects.map((effect) => {
      const badge = document.createElement('button');
      const icon = document.createElement('img');
      const duration = document.createElement('b');
      badge.type = 'button';
      badge.className = 'hero-effect tappable';
      badge.dataset.effect = effect.id;
      badge.style.setProperty('--effect-color', effect.color);
      const spell = `${effect.label}: ${Math.ceil(effect.duration)} ${secondsLabel}`;
      badge.setAttribute('aria-label', spell);
      badge.title = spell;
      // What the state actually does to the hero, not only how long it lasts.
      badge.addEventListener('click', () => openLore({
        title: effect.label,
        subtitle: itemDetailLanguage === 'ru'
          ? `Осталось ${Math.ceil(effect.duration)} ${secondsLabel}`
          : `${Math.ceil(effect.duration)} ${secondsLabel} left`,
        icon: effect.icon,
        color: effect.color,
        body: [effect.description].filter(Boolean),
      }));
      icon.src = spriteUrl(effect.icon);
      icon.alt = '';
      duration.textContent = String(Math.ceil(effect.duration));
      badge.append(icon, duration);
      return badge;
    }),
  );
  heroEffectsHud.hidden = effects.length === 0 && standing.length === 0;
}

/**
 * What the meter says out loud when it is pressed.
 *
 * The bar knows the stage, the sentence that explains it and how long the hero
 * has left; none of that reached the screen. On a phone there is no hover, so
 * a `title` is a promise to nobody.
 */
function meterNote(presentation) {
  const minutes = itemDetailLanguage === 'ru'
    ? `Хватит примерно на ${presentation.minutes} мин.`
    : `About ${presentation.minutes} min left.`;
  return `${presentation.label}. ${presentation.description} ${minutes}`;
}

// Полоска — такая же кнопка, как значок состояния, и открывает то же окно.
function openMeterLore(presentation, glyph, color) {
  const left = itemDetailLanguage === 'ru'
    ? `Хватит примерно на ${presentation.minutes} мин.`
    : `About ${presentation.minutes} min left.`;
  openLore({
    title: presentation.label,
    subtitle: `${presentation.percent}%`,
    glyph,
    color,
    body: [presentation.description, left],
  });
}

hungerMeter.addEventListener('click', () => {
  openMeterLore(hungerPresentation(hero.hunger, itemDetailLanguage), '◔', '#c2a765');
});
restMeter.addEventListener('click', () => {
  openMeterLore(restPresentation(hero.rest, itemDetailLanguage), '☾', '#8f92c0');
});
closeLoreButton.addEventListener('click', closeLore);
loreDialog.addEventListener('pointerdown', (event) => {
  if (event.target === loreDialog) closeLore();
});

function renderHungerHud() {
  const presentation = hungerPresentation(hero.hunger, itemDetailLanguage);
  hungerMeter.dataset.stage = presentation.id;
  hungerFill.style.transform = `scaleX(${presentation.percent / 100})`;
  hungerMeter.title = meterNote(presentation);
  hungerMeter.setAttribute('aria-label', presentation.ariaLabel);
  const rest = restPresentation(hero.rest, itemDetailLanguage);
  restMeter.dataset.stage = rest.id;
  restFill.style.transform = `scaleX(${rest.percent / 100})`;
  restMeter.title = meterNote(rest);
  restMeter.setAttribute('aria-label', rest.ariaLabel);
  // Те же две полоски стоят в рюкзаке и наполняются отсюда же.
  inventoryHungerMeter.dataset.stage = presentation.id;
  inventoryHungerFill.style.transform = `scaleX(${presentation.percent / 100})`;
  inventoryRestMeter.dataset.stage = rest.id;
  inventoryRestFill.style.transform = `scaleX(${rest.percent / 100})`;
  hud.setAttribute(
    'aria-label',
    `${currentMainMenuModel().labels.hud}. ${presentation.ariaLabel}`,
  );
}

function updateHud() {
  updatePortalButton();
  const stats = currentHeroStats();
  const combat = currentHeroCombat();
  const share = stats.maxHp > 0 ? hero.hp / stats.maxHp : 0;
  skillPointsBadge.hidden = hero.skills.points === 0;
  skillPointsBadge.textContent = `+${hero.skills.points}`;
  skillPointsBadge.title = itemDetailLanguage === 'ru' ? 'Очки навыков' : 'Skill points';
  for (const segments of healthBars) {
    const filled = Math.ceil(share * segments.length);
    segments.forEach((segment, index) => segment.classList.toggle('empty', index >= filled));
  }
  // Style and reach used to sit here as two 12px pictograms with no label —
  // crossed swords at that size read as a typo, and nothing said what the
  // number meant. The character sheet spells both out in words, one tap away
  // on the key with the hero's own face on it.
  // What you are carrying belongs on the screen you are carrying it on. It was
  // only ever visible inside the bag, which is the one place you do not need to
  // be told: the decision to spend or to go one floor deeper is taken out here.
  hudGold.textContent = String(gold);
  /**
   * В городе на значке этажа не цифра, а домик.
   *
   * Иван: «эта кнопка ломается в городе — надо ставить иконку домика». Ломалась
   * буквально: значок размером с римскую цифру, а `romanDepth` отдаёт там слово
   * «ГОРОД» — пять букв в квадрате под одну-две. Домик говорит то же самое и
   * занимает ровно столько, сколько есть.
   */
  const inCity = isCityDepth(dungeon.depth);
  const numeral = depthBadge.querySelector('span');
  numeral.textContent = inCity ? '' : romanDepth(dungeon.depth);
  numeral.hidden = inCity;
  /*
   * Длинной цифре — мельче шрифт.
   *
   * Значок рассчитан на две-три буквы, а римское восемнадцать — это XVIII,
   * пять: пятьдесят шесть пикселей в сорок шесть. Обрезался при этом самый
   * важный этаж игры — тот, на котором стоит хранитель и лежит артефакт.
   * Считать буквы в CSS нельзя, поэтому их считает тот, кто их пишет.
   */
  depthBadge.dataset.long = numeral.textContent.length >= 5 ? 'true' : 'false';
  depthHome.hidden = !inCity;
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
    /*
     * Дотянуться можно и наискосок.
     *
     * Здесь оставалась старая мерка — сумма по осям, — и она диагональ не
     * считает соседством: стоящий углом к фонтану не мог его тронуть, хотя до
     * всего остального в игре дотягивался. Иван: «стою наискосок клеточки от
     * фонтана и не могу с ним взаимодействовать, хотя помню, мы это фиксили».
     * Чинили действительно — но одну эту проверку тогда пропустили.
     */
    .filter((find) => cellStepDistance(cell, {
      x: Math.floor(find.x / TILE),
      y: Math.floor(find.y / TILE),
    }) <= 1)
    .sort(
      (a, b) =>
        Math.hypot(hero.x - a.x, hero.y - a.y) -
        Math.hypot(hero.x - b.x, hero.y - b.y),
    )[0] ?? null;
}

function interactNearbyFind(preferredFind = null, action = null, { magicKey = false } = {}) {
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
      attributes: hero.attributes,
      attributeGifts: hero.attributeGifts,
      effects: createActorEffects(hero.effects),
    },
    gold,
    action,
    actor: magicKey
      ? (() => {
          const base = currentInteractionActor();
          // Заклинание — тот же ключ от всех сундуков, только на один раз.
          return { ...base, resources: { ...base.resources, masterKey: true } };
        })()
      : currentInteractionActor(),
  });
  const presentation = findPresentation(find, itemDetailLanguage);
  const resultPresentation = findResultPresentation(result, find, itemDetailLanguage);
  if (!result.ok) {
    if (result.reason === 'unsafe') {
      findAnnouncement.textContent = resultPresentation?.unsafe || presentation.unsafe;
      addCombatGlyph(find.x, find.y, '!', presentation.color, -38);
      showLootToast({ path: presentation.path, rarity: 0 }, findAnnouncement.textContent, 'refused');
    }
    return false;
  }

  // A key that was never in the bag cannot come out of it.
  if (!magicKey && !consumeInteractionResources(result.consumed)) return false;

  hero.path = [];
  hero.pendingAttack = null;
  hero.attack = 0;
  const landmarkResult = result.definition?.wave === 'landmark';
  hero.hp = result.state.hero.hp;
  if (result.rewardAttribute) {
    hero.attributes = createAttributeState(result.state.hero.attributes);
    hero.attributeGifts = createAttributeGifts(result.state.hero.attributeGifts);
  }
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
  const struck = new Set(result.struckMonsterIds ?? []);
  for (const monster of awakened) {
    monster.alerted = monster.pursuit + 3;
    monster.alertFlash = 0.55;
    monster.attackCooldown = Math.max(monster.attackCooldown, 0.28);
    monsters.push(monster);
    // Guessed right: the hero hit it before it knew it had been found out.
    if (struck.has(monster.instanceId)) {
      damageMonster(monster, currentHeroCombat().attack, '#d8bf68', { style: 'blade' });
    }
    burst(monster.x, monster.y - 8, '#b45c58', 24);
    addImpactWave(monster.x, monster.y - 4, '#b45c58', 62, 3);
    addCombatGlyph(monster.x, monster.y, '!', '#e0c778', -58);
  }
  playerHasActed = true;
  if (result.damage > 0) {
    hero.hurt = 0.24;
    burst(hero.x, hero.y - 8, '#b45c58', 12);
    addImpactWave(hero.x, hero.y - 6, '#b45c58', 48, 2);
    addCombatGlyph(hero.x, hero.y, result.damage, '#c76a63', -48, { x: find.x, y: find.y });
    addBloodImpact({ ...hero, bloodColor: '#6a302b' }, find.x, find.y, false);
    beginHitStop(0.05);
  }
  if (find.id === 'sealed-cache') {
    const consumedByMimic = awakened.length > 0;
    const nextContainer = openChestContainerState(findContainer, {
      // Ломать ящик больше нечем: замок либо поддался, либо нет.
      damaged: false,
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
      if (result.heal > 0) addCombatGlyph(hero.x, hero.y, `+${result.heal}{heal}`, '#8fd08c', -62);
    }
    if (result.rewardMaxHp > 0) {
      burst(hero.x, hero.y - 8, '#e0c778', 18);
      addImpactWave(hero.x, hero.y - 8, '#e0c778', 54, 1);
      addCombatGlyph(hero.x, hero.y, `+${result.rewardMaxHp}{maxhp}`, '#e0c778', -74);
    }
    burst(find.x, find.y - 10, result.damage > 0 ? '#b45c58' : presentation.color, 20);
    addImpactWave(find.x, find.y, presentation.color, 54, 1);
    if (result.noise > 0) alertNearbyMonsters(find.x, find.y, result.noise);
    /*
     * Всё, что источник или алтарь дал и взял, — одной строкой с метками:
     * «+3 [сердце] к пределу здоровья · −10 [сердце] здоровья». Раньше здесь
     * было одно число без единицы, а если ничего не пришло — галочка.
     */
    const landmarkDeltas = formatDeltas({
      gold: (result.rewardGold ?? 0) - (result.costGold ?? 0),
      maxhp: result.rewardMaxHp,
      heal: (result.heal ?? 0) - (result.damage ?? 0),
    });
    showLootToast(
      { path: presentation.path, rarity: result.damage > 0 ? 2 : 1 },
      landmarkDeltas || resultPresentation?.message || presentation.result,
      landmarkDeltas ? null : result.cleansed.length > 0 ? 'restore' : 'info',
    );
    findAnnouncement.textContent = resultPresentation?.summary
      ? `${resultPresentation.message}. ${resultPresentation.summary}`
      : resultPresentation?.message ?? presentation.result;
    updateHud();
    persistRun();
    return true;
  }
  const damagedLoot = false;
  const chestDanger = find.id === 'sealed-cache' && result.damage > 0;
  burst(
    find.x,
    find.y - 10,
    damagedLoot ? '#b87b62' : chestDanger ? '#b45c58' : presentation.color,
    damagedLoot || chestDanger ? 24 : find.id === 'crystal-vein' ? 24 : 16,
  );
  addImpactWave(find.x, find.y, presentation.color, find.id === 'crystal-vein' ? 64 : 50, 1);
  if (damagedLoot) addCombatGlyph(find.x, find.y, result.action === 'attack' ? '⚔' : '✕', '#cf7068', -44);
  // Кристалл называет, что именно вырос: «Сила +1», а не безымянное «+1».
  const attributeGain = result.rewardAttribute
    ? `${attributeCopy(itemDetailLanguage)[result.rewardAttribute].name} +1`
    : '';
  if (attributeGain) {
    addCombatGlyph(hero.x, hero.y, attributeGain, presentation.color, -62);
    renderCharacterAttributes();
  }
  /*
   * Иван: кристалл дал ему «+5», и он не понял, чего. Строка была
   * «+1 · 5●»: единица скрытой силы без слова и золото типографским
   * кружком. Теперь кристалл говорит «Ловкость +1», а золото — «+5 [монета]
   * золота».
   */
  const findDeltas = formatDeltas({
    gold: result.rewardGold,
    heal: -(result.damage ?? 0),
  });
  showLootToast(
    { path: presentation.path, rarity: find.id === 'forgotten-grave' ? 2 : find.id === 'crystal-vein' ? 3 : 1 },
    awakened.length > 0
      ? feedbackCopy(itemDetailLanguage).findGuarded
      : attributeGain || findDeltas || feedbackCopy(itemDetailLanguage).nothingFound,
    awakened.length > 0 ? 'hostile' : attributeGain ? 'buff' : null,
  );
  if (result.noise > 0) alertNearbyMonsters(find.x, find.y, result.noise);
  // Плита отъехала, и хозяин гробницы встаёт (`dcss-rpg-tomb.js`).
  if (result.awakensMummy && awakened.length > 0) {
    playSound('hit-heavy');
    beginHitStop(0.08);
  }
  const rewardCopy = attributeGain || (itemDetailLanguage === 'ru'
    ? `${result.rewardGold} золота получено${result.destroyedGold > 0 ? `, ${result.destroyedGold} уничтожено` : ''}`
    : `${result.rewardGold} gold recovered${result.destroyedGold > 0 ? `, ${result.destroyedGold} destroyed` : ''}`);
  findAnnouncement.textContent = resultPresentation?.message
    ? awakened.length > 0
      // Золото гробница отдаёт и с мумией, поэтому о нём говорится тоже.
      ? result.awakensMummy
        ? `${resultPresentation.message} ${rewardCopy}`
        : resultPresentation.message
      : `${resultPresentation.message}. ${rewardCopy}`
    : presentation.result;
  updateHud();
  persistRun();
  return true;
}

function alertNearbyMonsters(x, y, radiusInTiles) {
  if (!Number.isFinite(radiusInTiles) || radiusInTiles <= 0) return 0;
  // Every deed here is the hero's, so stealth muffles all of them.
  const magic = currentHeroMagic();
  // Quiet gear is worth as much as the school; a cursed one is worth the
  // opposite, and loudly — a shouted step is the drawback you feel.
  const heard = stealthNoiseRadius(radiusInTiles, currentStealthProfile())
    * (magic.hushed ? 0.5 : 1)
    * (magic.clamour ? CLAMOUR_MULTIPLIER : 1);
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
      cellStepDistance(heroCell, door) === 1,
  ) ?? null;
}

function nearbyDoor() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return doorDefinitions
    .filter((door) => revealed.has(`${door.x},${door.y}`) && cellStepDistance(cell, door) <= 1)
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
      /*
       * На кнопке — лицо, а не вывеска.
       *
       * У всех торговцев стоял один и тот же значок лавки `shop_gadgets`, и
       * подойдя к человеку, игрок видел картинку магазина: непонятно, с кем
       * он вообще говорит. Иван: «поставим иконку того персонажа, с кем ты
       * взаимодействуешь; и для всех торговцев так же». Лицо у каждого своё и
       * давно есть — им он и нарисован на этаже.
       */
      iconPath: merchantActorPath(entry.value.variantId),
    };
  }
  if (entry.kind === 'event') {
    const событие = entry.value;
    const лечение = событие.definition.effect === 'heal';
    const есть = !лечение || hero.hp < currentHeroStats().maxHp;
    return {
      kind: 'event',
      id: событие.id,
      icon: событие.definition.path,
      value: eventCardValue(событие),
      action: EVENT_ACTIONS[событие.id],
      enabled: есть,
      hint: есть ? '' : (itemDetailLanguage === 'en' ? 'Not wounded' : 'Раны нет'),
    };
  }
  if (entry.kind === 'loot') {
    const вещь = presentedItem(entry.value.definition);
    const карточка = itemPresentation(вещь, itemDetailLanguage);
    const место = backpackItems.filter(Boolean).length < currentBackpackCapacity();
    return {
      kind: 'loot',
      name: карточка.name,
      description: `${карточка.rarity} · ${карточка.slot}`,
      icon: spriteForItem(вещь),
      accent: rarityGlow[вещь.rarity ?? 1] ?? rarityGlow[1],
      roomInPack: место,
      fullHint: место ? '' : currentMainMenuModel().labels.inventoryFullShort,
    };
  }
  if (entry.kind === 'door') {
    return { kind: 'door', open: run.floor.opened.includes(entry.value.instanceId) };
  }
  if (entry.kind === 'sanctuary') {
    // Цифры настоящие: сколько здоровья герой реально доберёт этим камнем, а не
    // сколько святилище лечит в принципе.
    return {
      kind: 'sanctuary',
      icon: SANCTUARY_PATH,
      heal: Math.min(SANCTUARY_HEAL, currentHeroStats().maxHp - hero.hp),
      ready: sanctuaryReady({ activeSeconds: run.stats.activeSeconds, drunkAt: run.sanctuaryDrunkAt ?? null }),
    };
  }
  if (entry.kind === 'branch-gate') {
    const gate = BRANCH_GATES.find(({ id }) => id === entry.value.id) ?? null;
    const copy = branchGateCopy(gate, itemDetailLanguage);
    return gate && copy
      ? { kind: 'branch-gate', to: gate.to, path: gate.path, ...copy }
      : null;
  }
  if (entry.kind === 'chasm') {
    const floors = Math.max(1, chasmFallFloors(world, entry.value, dungeon.seed));
    const cost = Math.max(1, Math.round(currentHeroStats().maxHp * CHASM_FALL_PERCENT * floors / 100));
    const guarded = chasmGuarded();
    return {
      kind: 'chasm',
      floors,
      cost,
      // A jump that kills is not a shortcut, and the game says so instead of
      // taking the hero's last three points of health for a staircase. Nor is
      // a hole a way round the guardian: the stair is locked, so is the shaft.
      survivable: hero.hp > cost && dungeon.depth < DEEPEST_DEPTH && !guarded,
      hint: dungeon.depth >= DEEPEST_DEPTH
        ? chasmCopy(itemDetailLanguage).bottom
        : guarded ? chasmCopy(itemDetailLanguage).guarded : chasmCopy(itemDetailLanguage).tooHurt,
    };
  }
  if (entry.kind === 'portal') {
    return {
      kind: 'portal',
      end: isCityDepth(dungeon.depth) ? 'city' : 'dungeon',
      depth: createPortalState(run.portal ?? null)?.depth ?? dungeon.depth,
    };
  }
  if (entry.kind === 'campfire') {
    return { kind: 'campfire', rawMeatCount: interactionResourceCount(RAW_MEAT_ITEM_ID) };
  }
  if (entry.kind === 'camp-rest') {
    return { kind: 'camp-rest', reason: campRestDecision().reason };
  }
  if (entry.kind === 'parley') {
    const model = parleyModel({
      monsterId: entry.value.id,
      depth: dungeon.depth,
      gold,
      hp: hero.hp,
      maxHp: currentHeroStats().maxHp,
      weaponName: equippedWeaponName(),
      companionName: firstCompanionName(),
      foodCount: interactionResourceCount(RAW_MEAT_ITEM_ID),
      skills: hero.skills,
      attributes: hero.attributes,
      language: itemDetailLanguage,
    });
    return {
      kind: 'parley',
      id: model.id,
      name: model.name,
      line: model.line,
      options: model.options,
      icon: entry.value.spritePath,
    };
  }
  if (entry.kind === 'house-deed') {
    const decision = houseDeedDecision();
    return {
      kind: 'house-deed',
      price: HOUSE_PRICE,
      reason: decision.reason,
      hint: houseRefusalText(decision.reason, itemDetailLanguage),
      icon: entry.value.spritePath ?? entry.value.path,
    };
  }
  if (entry.kind === 'house-slot') {
    const piece = HOUSE_FURNITURE[entry.value.furnitureId];
    const decision = canInstallFurniture({
      house: run.house,
      furnitureId: entry.value.furnitureId,
      gold,
    });
    return {
      kind: 'house-slot',
      furnitureId: entry.value.furnitureId,
      label: piece.labels[itemDetailLanguage === 'en' ? 'en' : 'ru'],
      price: piece.price,
      reason: decision.reason,
      hint: houseRefusalText(decision.reason, itemDetailLanguage),
      icon: entry.value.path,
    };
  }
  if (entry.kind === 'house-rest') {
    const decision = houseRestDecision();
    return {
      kind: 'house-rest',
      reason: decision.reason,
      hint: houseRefusalText(decision.reason, itemDetailLanguage),
    };
  }
  if (entry.kind === 'camp-stash') {
    return { kind: 'camp-stash' };
  }
  if (entry.kind === 'stair-up') {
    // С первого этажа — в город, ниже — на этаж выше: карточка говорит правду.
    return { kind: 'stair-up', icon: ascentVisual().path, toCity: dungeon.depth - 1 <= CITY_DEPTH };
  }
  if (entry.kind === 'stair-down') {
    return { kind: 'stair-down', icon: exitVisual().path, locked: !stairDownOpen() };
  }
  if (entry.kind === 'graveyard-ghost') {
    const copy = graveyardCopy(itemDetailLanguage);
    return {
      kind: 'graveyard-ghost',
      name: copy.name,
      summary: copy.summary,
      action: copy.action,
      icon: 'mon/undead/ghost.png',
    };
  }
  if (entry.kind === 'road-end') {
    const prize = roadPrize();
    return {
      kind: 'road-end',
      ending: roadEndingAt(dungeon.depth),
      prizeIcon: prize.path,
      prizeName: prize.name,
    };
  }
  if (entry.kind === 'tavern-hire') {
    const mercenaryId = mercenaryIdForHireMonster(entry.value.id);
    const model = mercenaryModel({
      gold,
      party: run.companions,
      partyLimit: currentPartyLimit(),
      language: itemDetailLanguage,
    });
    const row = model.rows.find(({ id }) => id === mercenaryId);
    if (!row) return null;
    return { kind: 'tavern-hire', mercenaryId, row, icon: entry.value.spritePath };
  }
  if (entry.kind === 'recruiter') {
    // The keeper sells supper and a bed. Hiring moved to the men who would be
    // hired — they are sitting at his tables.
    const menu = tavernMenuModel({
      gold,
      backpackCount: backpackItems.filter(Boolean).length,
      capacity: currentBackpackCapacity(),
      language: itemDetailLanguage,
    });
    const bed = bedOffer({
      gold,
      rest: hero.rest,
      restMax: REST_MAX,
      language: itemDetailLanguage,
    });
    return {
      kind: 'recruiter',
      hireElsewhere: menu.hireElsewhere,
      menu: menu.rows.map((row) => {
        const definition = lootById(row.itemId);
        const presented = definition
          ? itemPresentation(presentedItem(materializeInventoryItem({ id: row.itemId, uid: `menu-${row.itemId}` })), itemDetailLanguage)
          : null;
        return {
          ...row,
          name: presented?.name ?? row.itemId,
          hint: presented?.summary ?? '',
        };
      }),
      bed,
    };
  }
  if (entry.kind === 'priest') {
    // One decision, made once: the price, whether there is anything to lift and
    // the line the priest says all come out of the same answer.
    const offer = templeOffer({
      equipment: selected,
      items: itemInstances,
      gold,
      level: hero.level,
      language: itemDetailLanguage,
    });
    const forget = canRespec({ skills: hero.skills, attributes: hero.attributes, gold, source: 'priest' });
    const ru = itemDetailLanguage !== 'en';
    return {
      kind: 'priest',
      canUnbind: offer.ok,
      price: offer.price,
      text: offer.text,
      canForget: forget.ok,
      forgetHint: forget.ok
        ? `${forget.price} {gold}`
        : forget.reason === 'nothing-spent'
          ? (ru ? 'Забывать пока нечего' : 'Nothing to unlearn yet')
          : (ru ? `Нужно ${forget.price} {gold}` : `Needs ${forget.price} {gold}`),
    };
  }
  if (entry.kind === 'city-gate') {
    return {
      kind: 'city-gate',
      branch: run.branch,
      canRetire: canRetireRun({ depth: run.depth, status: runStatus }),
      purse: gold,
    };
  }
  if (entry.kind === 'jail-door') {
    const decision = canPickCell({
      crime: run.crime,
      lockpickTier: currentSkillCapabilities().lockpickTier ?? 0,
    });
    return {
      kind: 'jail-door',
      fine: crimeFine(run.crime),
      canPick: decision.ok,
      hint: decision.ok ? '' : crimeRefusalText(decision.reason, itemDetailLanguage),
    };
  }
  if (entry.kind === 'guard') {
    const fine = crimeFine(run.crime);
    const takesFine = entry.value.id === CITY_CAPTAIN_ID;
    return {
      kind: 'guard',
      id: entry.value.id,
      // Имя существа, а не его идентификатор. Карточка знала по имени только
      // двух городских стражников, и всякий другой нейтральный — тот же вор
      // Морис — представлялся игроку строкой «maurice».
      name: runEndSourceName(entry.value.id, itemDetailLanguage) ?? '',
      icon: entry.value.spritePath,
      wantedLabel: isWanted(run.crime) ? wantedLabel(run.crime, itemDetailLanguage) : '',
      fine,
      takesFine,
      canPay: takesFine && gold >= fine,
      hint: crimeRefusalText('no-gold', itemDetailLanguage),
    };
  }
  if (entry.kind === 'companion') {
    const beast = entry.value;
    const record = run.companions[beast.companionIndex];
    return {
      kind: 'companion',
      id: record?.id ?? beast.id.replace(/^(tamed|hired)-/, ''),
      icon: beast.spritePath,
    };
  }
  if (entry.kind === 'wildlife') {
    const profile = tamingProfile(currentSkillCapabilities());
    const decision = canTame({
      creature: entry.value,
      profile,
      foodCount: tameFoodCount(),
      party: run.companions,
    });
    return {
      kind: 'wildlife',
      id: entry.value.id,
      icon: entry.value.spritePath,
      tameKnown: profile.rank > 0,
      canTame: decision.ok,
      tameHint: decision.ok ? '' : companionRefusalText(decision.reason, itemDetailLanguage),
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
const PROP_INTERACTION_KINDS = new Set([
  'campfire', 'camp-rest', 'camp-stash', 'house-slot', 'house-rest',
]);

function contextTargetIsAdjacent(entry) {
  if (!entry?.value || runStatus !== 'playing') return false;
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const propTarget = PROP_INTERACTION_KINDS.has(entry.kind);
  // Actors carry pixel positions; props and tiles carry grid ones. A creature
  // read as a tile lands a hundred cells away and never looks adjacent.
  // Живое хранит своё место в пикселях, неживое — в клетках. Забыть здесь
  // новое существо значит получить кнопку, которая появляется и не нажимается:
  // расстояние до него посчитается в пикселях и выйдет в сотни клеток.
  const pixelActor = entry.kind === 'find'
    // Вещь на полу тоже хранит своё место в пикселях: она сделана из той же
    // записи этажа, что и всё остальное живое в этом списке. Событие — тоже.
    || entry.kind === 'loot'
    || entry.kind === 'event'
    || entry.kind === 'wildlife'
    || entry.kind === 'guard'
    || entry.kind === 'graveyard-ghost'
    || entry.kind === 'priest'
    || entry.kind === 'parley'
    || entry.kind === 'house-deed'
    || entry.kind === 'recruiter'
    || entry.kind === 'tavern-hire'
    || entry.kind === 'companion';
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
  const distance = cellStepDistance(heroCell, { x, y });
  if (entry.kind === 'trap') {
    return distance === 1
      && detectedTrapIds.has(entry.value.instanceId)
      && !run.floor.resolved.includes(entry.value.eventId);
  }
  if (entry.kind === 'find') return distance <= 1 && findIsInteractable(entry.value);
  if (entry.kind === 'merchant') return distance <= 1;
  if (propTarget) return distance <= 1;
  if (entry.kind === 'companion') return distance <= COMPANION_REACH && entry.value.dead === 0;
  if (entry.kind === 'city-gate') return distance <= 1;
  if (entry.kind === 'sanctuary') return distance <= 1 && heroNearSanctuary();
  if (entry.kind === 'portal') return distance <= 1 && Boolean(run.portal);
  // Лестницы — на клетке или рядом, как дверь: «что рядом», а не «под ногами».
  if (entry.kind === 'road-end' || entry.kind === 'stair-down' || entry.kind === 'stair-up') return distance <= 1;
  if (entry.kind === 'graveyard-ghost') return distance <= 1 && entry.value.dead === 0;
  if (entry.kind === 'priest') return distance <= 1 && entry.value.dead === 0;
  if (entry.kind === 'recruiter') return distance <= 1 && entry.value.dead === 0;
  if (entry.kind === 'tavern-hire') return distance <= 1 && entry.value.dead === 0;
  if (entry.kind === 'jail-door') return distance <= 1 && run.crime.jailed;
  if (entry.kind === 'guard') return distance <= 1 && entry.value.neutral && !entry.value.ghost && !entry.value.provoked;
  if (entry.kind === 'wildlife') return distance <= 1 && !entry.value.hunted && !entry.value.defeated;
  /*
   * На клетке или рядом — и то и другое считается.
   *
   * Без этой строки вещь и источник падали в правило двери внизу, а дверь
   * открывают только с соседней клетки: стоя прямо на вещи, игрок видел
   * кнопку, которая не нажимается. Ровно этим кончилась первая попытка.
   */
  if (entry.kind === 'loot' || entry.kind === 'event') return distance <= 1;
  const open = run.floor.opened.includes(entry.value.instanceId);
  return open ? distance <= 1 : distance === 1;
}

/**
 * Золото и здоровье в строках обещаний — рисунками.
 *
 * Карточка писала «+26● · −10 ❤ · шум на весь этаж», и Иван читал это так:
 * «максимально непонятно, что эти кнопки означают, какая-то иконка». Значки
 * были типографские — кружок и сердце из шрифта, — и рядом с пиксельной
 * игрой они не значили ничего. Теперь монета та же, что в кошельке наверху, а
 * сердце нарисовано цветом полоски здоровья.
 *
 * Правила остаются текстом: они ставят метки `{gold}` и `{heal}`, а картинки
 * подставляет переходник — он один имеет право трогать DOM.
 */
const GOLD_ICON_PATH = 'licensed/7soul-icons/coin-gold.png';

const TEXT_ICONS = Object.freeze({
  gold: Object.freeze({ path: GOLD_ICON_PATH, ru: 'золота', en: 'gold' }),
  heal: Object.freeze({ path: 'derived/hud/heart.png', ru: 'здоровья', en: 'health' }),
  /*
   * Всё, что не золото и не здоровье, одной картинкой не объяснить: меч рядом
   * с «+1» можно прочитать и как «меч», и как «удар». Иван: кристалл дал ему
   * «+5», и он не понял, чего. Поэтому у этих меток слово идёт за значком
   * всегда (`spoken`), а не только во всплывающей подписи.
   */
  maxhp: Object.freeze({ path: 'derived/hud/heart.png', ru: 'к пределу здоровья', en: 'max health', spoken: true }),
  attack: Object.freeze({ path: 'item/weapon/long_sword1.png', ru: 'к силе удара', en: 'attack', spoken: true }),
  food: Object.freeze({ path: 'item/food/bread_ration.png', ru: 'мин сытости', en: 'min fed', spoken: true }),
  map: Object.freeze({ path: 'derived/icon/scroll-magic_mapping.png', ru: 'клеток карты', en: 'map tiles', spoken: true }),
});

const TEXT_ICON_PATTERN = new RegExp(`\\{(${Object.keys(TEXT_ICONS).join('|')})\\}`, 'g');

/** Та же строка словами: для чтения вслух и всплывающей подписи. */
function textIconsToWords(text) {
  if (typeof text !== 'string') return '';
  return text.replace(TEXT_ICON_PATTERN, (_, id) => TEXT_ICONS[id][itemDetailLanguage === 'en' ? 'en' : 'ru']);
}

/**
 * Разложить строку с метками в узел: куски текста и картинки между ними.
 *
 * `words` — итог, а не обещание: во всплывающем сообщении за значком всегда
 * идёт слово («+5 [монета] золота»), потому что читают его на бегу и один раз.
 */
function fillTextWithIcons(node, text, { words = false } = {}) {
  const source = typeof text === 'string' ? text : '';
  const parts = [];
  let last = 0;
  for (const match of source.matchAll(TEXT_ICON_PATTERN)) {
    if (match.index > last) parts.push(document.createTextNode(source.slice(last, match.index)));
    const entry = TEXT_ICONS[match[1]];
    const icon = document.createElement('img');
    icon.className = 'text-icon';
    icon.src = spriteUrl(entry.path);
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    parts.push(icon);
    if (words || entry.spoken) {
      parts.push(document.createTextNode(` ${entry[itemDetailLanguage === 'en' ? 'en' : 'ru']}`));
    }
    last = match.index + match[0].length;
  }
  if (last < source.length) parts.push(document.createTextNode(source.slice(last)));
  node.replaceChildren(...parts);
  return node;
}

/**
 * The item a context target is, as the rest of the UI shows it — or null for a
 * door, a merchant, a fire. The button and the card recolour it by material
 * exactly like the floor does, or a gold helmet on the floor is a grey one on
 * the button.
 */
function contextTargetItem(target) {
  return target?.kind === 'loot' && target.value?.definition
    ? presentedItem(target.value.definition)
    : null;
}

function renderContextActions() {
  if (!contextTarget) return;
  const model = contextActionModel({
    target: contextModelTarget(),
    actor: currentInteractionActor(),
    language: itemDetailLanguage,
  });
  contextActions.style.setProperty('--context-accent', model.accent);
  contextActionList.style.setProperty('--action-count', String(model.actions.length));
  contextActionIcon.src = spriteUrl(model.icon);
  paintMaterial(contextActionIcon, contextTargetItem(contextTarget));
  contextActionTitle.textContent = model.name;
  fillTextWithIcons(contextActionDescription, model.description);
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
    button.title = textIconsToWords(action.hint || action.label);
    button.setAttribute('aria-label', textIconsToWords(action.hint ? `${action.label}. ${action.hint}` : action.label));
    glyph.textContent = action.glyph;
    glyph.setAttribute('aria-hidden', 'true');
    fillTextWithIcons(label, action.label);
    button.append(glyph, label);
    if (action.hint) {
      const hint = document.createElement('small');
      fillTextWithIcons(hint, action.hint);
      button.classList.add('has-hint');
      button.append(hint);
    }
    button.addEventListener('click', () => performContextAction(action.id));
    return button;
  }));
}

/**
 * How many things the hero may be offered at once. Standing in a corner of a
 * camp with a door behind them, five is already every reachable thing on the
 * floor; more than that would be a wall of icons rather than a choice.
 */
const INTERACT_COLUMN_LIMIT = 5;

/**
 * The column used to be rebuilt only when the hero changed cell, which was
 * enough while it held one button for one thing the hero had walked up to. It
 * is not enough now: a companion walks up on its own, a beast turns hostile, a
 * fire burns out. So the list is checked on a light cadence and the DOM is
 * touched only when its contents actually differ.
 */
let interactSignature = '';
let interactPollTimer = 0;
const INTERACT_POLL_SECONDS = 0.25;

function pollInteractionUi(delta) {
  interactPollTimer -= delta;
  if (interactPollTimer > 0) return;
  interactPollTimer = INTERACT_POLL_SECONDS;
  updateInteractionUi();
}

function updateInteractionUi() {
  const targets = ready
    && uiScreen === 'game'
    && runStatus === 'playing'
    && !hero.dead
    && !openingDoor
    ? nearbyContextTargets().slice(0, INTERACT_COLUMN_LIMIT)
    : [];
  const signature = targets
    .map(({ kind, value }) => `${kind}:${value?.instanceId ?? value?.id ?? ''}:${value?.x ?? ''},${value?.y ?? ''}`)
    .join('|');
  if (signature === interactSignature) return targets.length > 0;
  interactSignature = signature;
  if (targets.length === 0) {
    interactActions.replaceChildren();
    // The column above it closes the gap rather than leaving a hole.
    document.body.dataset.interact = 'off';
    return false;
  }
  document.body.dataset.interact = 'on';
  interactActions.replaceChildren(...targets.flatMap((target) => {
    // This runs every quarter-second inside the frame, once for every thing the
    // hero is standing next to. `contextActionModel` throws when a target does
    // not match its registry entry — and a throw here used to take the whole
    // frame with it, which is a frozen world beside a working backpack. One
    // button that fails to build is one button missing, not a dead game.
    let model = null;
    try {
      model = contextActionModel({
        target: contextModelTarget(target),
        actor: currentInteractionActor(),
        language: itemDetailLanguage,
      });
    } catch (error) {
      reportFrameFailure(`interact:${target.kind}`, error);
      return [];
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'interact-action pixel-frame tappable';
    button.dataset.interaction = model.interactionId;
    button.style.setProperty('--context-accent', model.accent);
    button.setAttribute('aria-label', model.triggerLabel);
    button.title = model.triggerLabel;
    const icon = document.createElement('img');
    icon.alt = '';
    icon.src = spriteUrl(model.icon);
    paintMaterial(icon, contextTargetItem(target));
    const mark = document.createElement('b');
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '+';
    button.append(icon, mark);
    button.addEventListener('click', () => openContextActions(target));
    return [button];
  }));
  return true;
}

/**
 * Одним касанием — только подобрать.
 *
 * Раньше любое единственное действие исполнялось от касания, и окно не
 * появлялось: алтарь лечил, костёр жарил, дверь открывалась. Иван после игры
 * попросил обратное: сначала карточка — что это, что будет, — потом кнопка.
 * Без карточки остался один случай, помеченный в реестре `instant`: вещь с
 * пола. Если её не поднять — рюкзак полон, — карточка всё же открывается:
 * там написана причина.
 */
function runLoneAction(nextTarget) {
  let model = null;
  try {
    model = contextActionModel({
      target: contextModelTarget(nextTarget),
      actor: currentInteractionActor(),
      language: itemDetailLanguage,
    });
  } catch (error) {
    reportFrameFailure(`interact:${nextTarget.kind}`, error);
    return false;
  }
  if (!model.instant) return false;
  const [only, ...rest] = model.actions;
  if (rest.length > 0 || !only?.enabled) return false;
  const handler = CONTEXT_COMMAND_HANDLERS[only.command];
  if (typeof handler !== 'function') return false;
  const previous = contextTarget;
  clearMoveControl();
  hero.path = [];
  hero.pendingAttack = null;
  onboardingInteracted = true;
  playSound('ui-tap');
  // Обработчики читают цель из `contextTarget`, как при открытом окне.
  contextTarget = nextTarget;
  const done = handler({ target: nextTarget, action: only, model }) !== false;
  if (!done) {
    contextTarget = previous;
    return false;
  }
  if (uiScreen !== 'context') contextTarget = null;
  return true;
}

function openContextActions(nextTarget) {
  if (!ready || uiScreen !== 'game' || hero.dead || openingDoor || !contextTargetIsAdjacent(nextTarget)) {
    return false;
  }
  if (runLoneAction(nextTarget)) return true;
  clearMoveControl();
  hero.path = [];
  hero.pendingAttack = null;
  contextTarget = nextTarget;
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
  /*
   * Колонка убирается под окном — и забывает, что в ней было.
   *
   * Перерисовка сравнивает новый состав со старым отпечатком и молчит, если он
   * тот же. Окно чистило разметку, не трогая отпечаток, — и при закрытии
   * игра честно решала, что перерисовывать нечего: кнопки не возвращались,
   * пока игрок не отойдёт и не подойдёт снова. Иван: «взаимодействую с одним,
   * отменяю, иконки пропадают; надо отойти и снова подойти».
   */
  interactActions.replaceChildren();
  interactSignature = '';
  document.body.dataset.interact = 'off';
  renderContextActions();
  requestAnimationFrame(() => contextActionList.querySelector('button:not(:disabled)')?.focus());
  return true;
}

function closeContextActions({ restoreFocus = false } = {}) {
  if (uiScreen !== 'context') return false;
  contextActions.inert = true;
  contextActions.setAttribute('aria-hidden', 'true');
  contextTarget = null;
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

/**
 * What the shop is about to do, once the player has read what it is.
 *
 * A tap used to be the purchase: touch the yellow potion to find out what it is
 * and it was bought and paid for. Now a tap only picks the thing up off the
 * shelf — the card below the list says what it does and what it costs, and the
 * money moves when the player says so.
 */
/**
 * The shop reads an item in the same big window everything else does.
 *
 * The first answer to «тап покупает мгновенно» was a strip of card under the
 * list. On a phone that strip was a sixth child in a five-row grid: the list
 * collapsed and the whole shop came apart. Ivan, testing on his phone: «ты всё
 * сделал неправильно… должна открываться модалка поверх, огромная, с нормальными
 * цифрами, кнопками купить и отменить, с картинкой».
 *
 * So the list is the list again, and a tap opens the item window the backpack
 * already uses — full screen, real picture, real type — with the shop's own
 * verb and price on its one action.
 */
function selectMerchantItem(selection) {
  openItemDetail(selection.item, null, {
    label: `${selection.verb} · ${selection.price} {gold}`,
    ariaLabel: `${selection.verb}: ${itemPresentation(presentedItem(selection.item), itemDetailLanguage).name}, ${selection.price}`,
    act: selection.act,
  });
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
  paintItemIcon(icon, displayItem);
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
  if (sold) {
    value.textContent = merchantPresentation(activeMerchant.variantId, itemDetailLanguage).sold;
  } else {
    // Монета та же, что в кошельке: кружок из шрифта её не заменяет.
    fillTextWithIcons(value, `${price} {gold}`);
  }
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
  merchantShopPortrait.src = spriteUrl(activeMerchant.actorPath);
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
        onActivate: () => selectMerchantItem({
          item, price: entry.price, verb: copy.buy, act: () => transactMerchantPurchase(entry.entryId),
        }),
      }));
    }
    for (const entry of merchantState.buyback) {
      const item = materializeInventoryItem(entry.record);
      merchantShopList.append(merchantItemButton({
        item,
        price: entry.price,
        badge: copy.buyback,
        onActivate: () => selectMerchantItem({
          item, price: entry.price, verb: copy.buy, act: () => transactMerchantBuyback(entry.record.uid),
        }),
      }));
    }
  } else {
    for (const item of backpackItems.filter(Boolean)) {
      merchantShopList.append(merchantItemButton({
        item,
        price: merchantSellPrice(item),
        onActivate: () => selectMerchantItem({
          item, price: merchantSellPrice(item), verb: copy.sell, act: () => transactMerchantSale(item.uid),
        }),
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
  paintItemIcon(icon, displayItem);
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
  chestBackpackCount.textContent = `${backpackItems.length}/${currentBackpackCapacity()}`;
  chestContainer.setAttribute('aria-label', chestContainerTitle.textContent);
  closeChestContainerButton.setAttribute('aria-label', copy.close);
  chestContainerIcon.src = spriteUrl(
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
    icon.src = spriteUrl(GOLD_ICON_PATH);
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
      disabled: backpackItems.length >= currentBackpackCapacity() && !canMerge,
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
    ? takeChestItem({
      command, container, uid, items: state.items, inventory: state.inventory,
      capacity: currentBackpackCapacity(),
    })
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
  fillTextWithIcons(chestContainerFeedback, `+${amount} {gold}`);
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
  requestAnimationFrame(() => interactActions.querySelector('button')?.focus());
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
  fillTextWithIcons(merchantShopFeedback, `+${result.state.transactionAmount} {gold}`);
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
  // Nobody sells to a face on the watch's list.
  if (isWanted(run.crime)) {
    showLootToast({ path: CRIME_TOAST_ICON, rarity: 3 }, wantedLabel(run.crime, itemDetailLanguage), 'hostile');
    return false;
  }
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
  requestAnimationFrame(() => interactActions.querySelector('button')?.focus());
  return true;
}

function nearbyMerchant() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return merchantDefinitions
    .filter((merchant) => revealed.has(`${merchant.x},${merchant.y}`))
    .filter((merchant) => cellStepDistance(cell, merchant) <= 1)
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId))[0] ?? null;
}

function nearbyCampfire() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return dungeonEnvironment.props
    .filter(({ interactionId, gridX, gridY }) =>
      interactionId === 'campfire'
      && revealed.has(`${gridX},${gridY}`)
      && cellStepDistance(cell, { x: gridX, y: gridY }) <= 1)
    .sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
}

/** Any real meal in the bag will do to make — or keep — a friend. */
function tameFoodCount() {
  return TAME_FOOD_IDS.reduce((total, id) => total + interactionResourceCount(id), 0);
}

/** Beasts eat what the bag holds, in whatever order it holds it. */
function spendCompanionFood(amount) {
  let remaining = Math.max(0, Math.round(amount));
  for (const id of TAME_FOOD_IDS) {
    if (remaining <= 0) break;
    const carried = interactionResourceCount(id);
    if (carried <= 0) continue;
    const taken = Math.min(carried, remaining);
    if (!consumeInteractionResources([{ id, amount: taken }])) return false;
    remaining -= taken;
  }
  return remaining === 0;
}

/**
 * Bread instead of a blade. The beast leaves the wildlife of the floor and
 * joins the run: from here it walks with the hero and dies only once.
 */
function tameNearbyWildlife(creature) {
  if (!creature || hero.dead || runStatus !== 'playing') return false;
  const result = tameCreature({
    creature,
    profile: tamingProfile(currentSkillCapabilities()),
    foodCount: tameFoodCount(),
    party: run.companions,
  });
  if (!result.ok) {
    showLootToast(
      { path: creature.spritePath, rarity: 1 },
      companionRefusalText(result.reason, itemDetailLanguage),
      'refused',
    );
    return false;
  }
  if (!spendCompanionFood(result.cost)) return false;
  run.companions = [...run.companions, result.companion];
  // The tamed beast is no longer part of the floor's wildlife.
  creature.defeated = true;
  creature.hunted = true;
  creature.hp = 0;
  passiveCreatures = passiveCreatures.filter((other) => other !== creature);
  raiseCompanion(run.companions.length - 1);
  playerHasActed = true;
  playSound('eat');
  burst(creature.x, creature.y - 10, '#9ad3b8', 20);
  showLootToast(
    { path: creature.spritePath, rarity: 2 },
    companionRefusalText('tamed', itemDetailLanguage),
    'ally',
  );
  updateHud();
  renderPack();
  persistRun();
  return true;
}

/**
 * Let it go. The party record is dropped and the beast walks off the floor —
 * nothing follows the hero down, and nothing has to be killed to be rid of.
 */
function releaseCompanion(beast) {
  const index = beast?.companionIndex;
  const record = run.companions[index];
  if (!record || beast.dead > 0) return false;
  run.companions = createCompanionParty(run.companions.filter((entry, at) => at !== index));
  // Indices are positions in that list, so everybody below the gap moves up.
  allies = allies
    .filter((ally) => ally.companionIndex !== index)
    .map((ally) => (ally.companionIndex > index
      ? { ...ally, companionIndex: ally.companionIndex - 1 }
      : ally));
  playerHasActed = true;
  playSound('ui-tap');
  burst(beast.x, beast.y - 8, '#9ad3b8', 16);
  addCombatGlyph(beast.x, beast.y, '↩', '#9ad3b8', -58);
  updateHud();
  persistRun();
  return true;
}

/**
 * Turn on it. The beast leaves the party the same way it would if released, and
 * then stands on the floor as an ordinary hostile creature: the hero struck
 * first, and from here it is a fight like any other.
 */
function turnOnCompanion(beast) {
  const index = beast?.companionIndex;
  const record = run.companions[index];
  if (!record || beast.dead > 0) return false;
  const { x, y, hp, maxHp, spritePath } = beast;
  if (!releaseCompanion(beast)) return false;
  const [turned] = createRuntimeMonsters(dungeon, [{
    instanceId: `monster-${dungeon.depth}-turned-${index}`,
    id: isMercenary(record.id) ? `hired-${record.id}` : `tamed-${record.id}`,
    x: Math.floor(x / TILE),
    y: Math.floor(y / TILE),
  }]);
  if (!turned) return false;
  turned.hp = Math.min(hp, turned.maxHp ?? maxHp);
  turned.spritePath = spritePath ?? turned.spritePath;
  turned.alerted = turned.pursuit + 4;
  turned.alertFlash = 0.6;
  monsters.push(turned);
  damageMonster(turned, currentHeroCombat().attack, '#c76a63', { style: 'blade' });
  return true;
}

function nearbyWildlife() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return passiveCreatures
    .filter((creature) => !creature.hunted && !creature.defeated)
    .filter((creature) => revealed.has(`${Math.floor(creature.x / TILE)},${Math.floor(creature.y / TILE)}`))
    .filter((creature) => cellStepDistance(cell, {
      x: Math.floor(creature.x / TILE),
      y: Math.floor(creature.y / TILE),
    }) <= 1)
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


/** The two roads out of the city, offered where they part. */
/**
 * Ворота города — все три, а не одни.
 *
 * Город рисует три выхода: вниз в пещеры, наружу за ворота и вниз в подвалы. А
 * развилку открывали только те, что совпали с `dungeon.exit`, — и это всегда
 * одни и те же ворота, наружные. К двум остальным игрок подходил и не получал
 * ничего: ни окна, ни отказа, ни подсказки.
 *
 * Хуже: поднявшись из пещер, герой встаёт у ворот своей дороги — то есть как
 * раз у тех, которые не работали. Иван: «нажимаю кнопку подняться наверх, и
 * ничего не происходит; портал тоже не работает». Ворота были мёртвые, а
 * портал в городе и не должен вести никуда, кроме как обратно вниз.
 *
 * Развилка у всех трёх одна и та же — она и так предлагает все дороги, — так
 * что достаточно перестать спрашивать, те ли это ворота.
 */
function nearbyCityGate() {
  if (!isCityDepth(dungeon.depth) || runStatus !== 'playing' || hero.dead) return null;
  if (run.crime.jailed) return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const ворота = Object.values(dungeon.gates ?? {}).filter(Boolean);
  const рядом = ворота.find((gate) => cellStepDistance(cell, gate) <= 1);
  if (рядом) return рядом;
  // Выход этажа остаётся выходом даже там, где ворот в плане нет.
  return cellStepDistance(cell, dungeon.exit) <= 1 ? dungeon.exit : null;
}

/** The nearest guard still keeping the peace; a provoked one is just an enemy. */
/**
 * The watch, and only the watch.
 *
 * Every townsman is neutral, so «neutral and standing next to you» also
 * catches the priest, the keeper and the four sellswords at his tables — and
 * each of them then appeared twice in the interaction column: once as
 * themselves and once as a nameless guard. The people who have their own
 * card are named here and skipped.
 */
const CITY_OWN_CARD_IDS = new Set([CITY_PRIEST_ID, CITY_RECRUITER_ID, CITY_BROKER_ID]);

/** Призрак кладбища, если герой стоит рядом с ним. */
function nearbyGraveyardGhost() {
  if (runStatus !== 'playing' || hero.dead || !graveyardGhost || graveyardGhost.dead > 0) return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const at = { x: Math.floor(graveyardGhost.x / TILE), y: Math.floor(graveyardGhost.y / TILE) };
  return cellStepDistance(cell, at) <= 1 ? graveyardGhost : null;
}

function nearbyGuard() {
  if (runStatus !== 'playing' || hero.dead) return null;
  // The same neighbourhood the panel checks, so the button never lies.
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return monsters.find((monster) => (
    monster.neutral
    && !monster.ghost
    && !monster.provoked
    && monster.dead === 0
    && !CITY_OWN_CARD_IDS.has(monster.id)
    && !mercenaryIdForHireMonster(monster.id)
    && cellStepDistance(cell, { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) }) <= 1
  )) ?? null;
}

/**
 * Everything the hero can reach from where they stand, best first.
 *
 * This used to answer with one target and stop looking. Standing between a
 * chest, a companion and a door, the game chose the chest and the other two
 * simply did not exist — you could not talk to the beast beside you without
 * walking away from the box first. Ivan asked for the obvious thing: show them
 * all and let the player pick.
 *
 * The order is still the old priority order, so whatever answered before is
 * still the first answer and the keyboard shortcut still finds it.
 */
function nearbyContextTargets() {
  const targets = [];
  const add = (kind, value) => { if (value) targets.push({ kind, value }); };
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const withinReach = (monster) => monster.dead === 0 && cellStepDistance(heroCell, {
    x: Math.floor(monster.x / TILE),
    y: Math.floor(monster.y / TILE),
  }) <= 1;

  for (const loot of nearbyGroundLoot()) add('loot', loot);
  add('event', nearbyFloorEvent());
  add('parley', nearbyParley());
  add('merchant', nearbyMerchant());
  add('find', nearbyFind());
  add('trap', nearbyDetectedTrap());
  const campfire = nearbyCampfire();
  const canCook = campfire && interactionResourceCount(RAW_MEAT_ITEM_ID) > 0;
  if (canCook) add('campfire', campfire);
  add('house-deed', monsters.find((monster) => monster.id === CITY_BROKER_ID && withinReach(monster)));
  add('house-slot', nearbyCampProp('house-slot'));
  add('house-rest', nearbyCampProp('house-rest'));
  add('camp-rest', nearbyCampProp('camp-rest'));
  add('camp-stash', nearbyCampProp('camp-stash'));
  add('companion', nearbyCompanion());
  add('city-gate', nearbyCityGate());
  if (!isCityDepth(dungeon.depth) && nearExitStair()) {
    // На конце написанной дороги та же лестница — развилка, а не спуск.
    add(artifactAvailable() ? 'road-end' : 'stair-down', dungeon.exit);
  }
  if (nearAscentStair()) add('stair-up', dungeon.spawn);
  add('jail-door', nearbyJailDoor());
  add('priest', monsters.find((monster) => monster.id === CITY_PRIEST_ID && withinReach(monster)));
  add('tavern-hire', monsters.find((monster) => mercenaryIdForHireMonster(monster.id) && withinReach(monster)));
  add('recruiter', monsters.find((monster) => monster.id === CITY_RECRUITER_ID && withinReach(monster)));
  add('sanctuary', nearbySanctuary());
  add('graveyard-ghost', nearbyGraveyardGhost());
  add('guard', nearbyGuard());
  add('wildlife', nearbyWildlife());
  // A cold campfire is still something to sit at, it is just not cooking.
  if (campfire && !canCook) add('campfire', campfire);
  add('branch-gate', nearbyBranchGate());
  add('chasm', nearbyChasm());
  add('portal', nearbyPortal());
  add('door', nearbyDoor());
  return targets;
}

/**
 * The town portal, both ends of it.
 *
 * Two coordinates in the run decide everything: which floor its dungeon mouth
 * stands on, and where. The town mouth is derived from the city itself, beside
 * the stairs down, so only one end ever has to be remembered. Neither is a
 * thing on a floor — that is the whole point, because a floor can be forgotten
 * and a run cannot.
 */
function portalVisual() {
  return runtimeVisual('system', 'portal', 'world', PORTAL_PATH, 1, 0);
}

/** Where the portal stands on the floor the hero is on, if it stands here. */
function portalCellHere() {
  const portal = createPortalState(run.portal ?? null);
  if (!portal) return null;
  if (isCityDepth(dungeon.depth)) return cityPortalCell(dungeon);
  return portal.depth === dungeon.depth ? { x: portal.x, y: portal.y } : null;
}

/** The gate onto another road, when the hero is standing next to it. */
function nearbyBranchGate() {
  if (runStatus !== 'playing' || hero.dead || !dungeon.branchGate) return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return cellStepDistance(cell, dungeon.branchGate) <= 1 ? dungeon.branchGate : null;
}

/** A hole within reach. The nearest one, so the card is about that hole. */
function nearbyChasm() {
  if (runStatus !== 'playing' || hero.dead || currentHeroMagic().flight) return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const x = cell.x + dx;
    const y = cell.y + dy;
    if (world[y]?.[x] === CHASM_CELL && revealed.has(`${x},${y}`)) return { x, y };
  }
  return null;
}

function nearbyPortal() {
  if (runStatus !== 'playing' || hero.dead) return null;
  const cell = portalCellHere();
  if (!cell) return null;
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return cellStepDistance(heroCell, cell) <= 1 ? cell : null;
}

/**
 * Opening one. It goes on a free cell beside the hero, the way Diablo has
 * always placed them: a ring under your own feet is a ring you cannot see,
 * and stepping into it should be something you decide to do rather than
 * something you are already standing in. If the hero is boxed in, it opens
 * where they stand — a portal you cannot see beats a portal you cannot have.
 */
function openHeroPortal() {
  const beside = freeCellNearHero() ?? {
    x: Math.floor(hero.x / TILE),
    y: Math.floor(hero.y / TILE),
  };
  const result = openPortalAt({
    depth: dungeon.depth,
    x: beside.x,
    y: beside.y,
    status: runStatus,
    portal: run.portal ?? null,
  });
  if (!result.ok) {
    const refusal = portalCopy(itemDetailLanguage).refusal[result.reason] ?? '';
    if (refusal) showLootToast({ path: PORTAL_PATH, rarity: 0 }, refusal, 'refused');
    return false;
  }
  const copy = portalCopy(itemDetailLanguage);
  run.portal = result.portal;
  playerHasActed = true;
  playSound('portal');
  const at = { x: (beside.x + 0.5) * TILE, y: (beside.y + 0.5) * TILE };
  burst(at.x, at.y - 8, '#5aa8e0', 18);
  addImpactWave(at.x, at.y - 2, '#5aa8e0', 46, 0);
  // A ring going out on a floor nobody can see deserves a word.
  if (result.reason === 'replaced') showLootToast({ path: PORTAL_PATH, rarity: 1 }, copy.replaced);
  updatePortalButton();
  persistRun();
  return true;
}

/**
 * Stepping through, either way.
 *
 * The portal is spent by *arriving* on the dungeon side, never by leaving —
 * so nothing that could go wrong in between can eat it. Going down to the city
 * leaves it standing, which is what makes the tea Ivan asked about safe: close
 * the game in town, come back a week later, the ring is still by the stairs.
 */
function stepThroughPortal() {
  const portal = createPortalState(run.portal ?? null);
  if (!portal || runStatus !== 'playing') return false;
  const goingHome = !isCityDepth(dungeon.depth);
  const arrival = goingHome ? cityPortalCell(dungeon) : { x: portal.x, y: portal.y };
  const depth = goingHome ? CITY_DEPTH : portal.depth;
  run = travelRunToDepth(captureRun(), depth, arrival ?? undefined);
  // Coming back is what closes it. Leaving never does.
  if (!goingHome) run.portal = null;
  hero.hp = run.hero.hp;
  hero.hunger = run.hero.hunger;
  // `replaceFloor` is the one place that knows how to land a hero on a floor.
  replaceFloor(run.depth, arrival ?? undefined);
  playSound('portal');
  announceFloor();
  updatePortalButton();
  persistRun();
  return true;
}

/**
 * Always carried, never spent, and never greyed out.
 *
 * It used to go dark while a portal stood open. Ivan: «надо чтобы можно было
 * новый открыть и чтобы старый закрывался — мы делаем не душную игру.» A key
 * that refuses is a key the player has to think about; this one never does.
 */
function updatePortalButton() {
  if (!openPortalButton) return;
  const decision = canOpenPortal({ depth: dungeon.depth, status: runStatus });
  const copy = portalCopy(itemDetailLanguage);
  openPortalButton.hidden = isCityDepth(dungeon.depth) || isTerminalRunStatus(runStatus);
  openPortalButton.disabled = !decision.ok;
  openPortalButton.setAttribute('aria-label', decision.ok ? copy.open : copy.refusal[decision.reason] ?? copy.open);
  openPortalButton.title = openPortalButton.getAttribute('aria-label');
}

function nearbyContextTarget() {
  return nearbyContextTargets()[0] ?? null;
}

/**
 * Who is standing on that cell, if they are somebody the hero can talk to.
 *
 * Tapping a creature used to mean «walk there», which for a sheep meant walking
 * into it and for a watchman meant walking through him. Ivan asked for the
 * obvious thing: «я хотел бы нажать на овцу и взаимодействовать с ней». An
 * enemy is not in this list — tapping one is still an attack, which is the
 * interaction it offers.
 */
function contextTargetAtCell(cellX, cellY) {
  const onCell = (actor) => Math.floor(actor.x / TILE) === cellX && Math.floor(actor.y / TILE) === cellY;
  const beast = allies.find((ally) => ally.companion && ally.dead === 0 && onCell(ally));
  if (beast) return { kind: 'companion', value: beast };
  const creature = passiveCreatures.find((entry) => !entry.defeated && !entry.hunted && onCell(entry));
  if (creature) return { kind: 'wildlife', value: creature };
  const person = monsters.find((monster) => monster.dead === 0 && onCell(monster));
  if (!person) return null;
  if (parleyFor(person.id) && !person.provoked) return { kind: 'parley', value: person };
  if (person.id === CITY_BROKER_ID) return { kind: 'house-deed', value: person };
  if (person.id === CITY_PRIEST_ID) return { kind: 'priest', value: person };
  if (person.id === CITY_RECRUITER_ID) return { kind: 'recruiter', value: person };
  if (mercenaryIdForHireMonster(person.id)) return { kind: 'tavern-hire', value: person };
  // A guard keeping the peace can be spoken to; one that has drawn on you is a
  // fight, and a fight is answered by walking into it.
  if (person.neutral && !person.ghost && !person.provoked) return { kind: 'guard', value: person };
  return null;
}

function openNearbyContextActions() {
  const target = nearbyContextTarget();
  return target ? openContextActions(target) : false;
}

const CONTEXT_COMMAND_HANDLERS = Object.freeze({
  'door-transition'({ target, action }) {
    closeContextActions();
    return beginDoorTransition(target.value, action.id === 'open');
  },
  'pick-up'({ target }) {
    closeContextActions();
    return takeGroundLoot(target.value);
  },
  'floor-event'({ target }) {
    closeContextActions();
    return triggerFloorEvent(target.value);
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
  'provoke-guard'({ target, action }) {
    closeContextActions();
    if (!target?.value || !target.value.neutral || target.value.provoked) return false;
    // The captain's panel has two answers: settle the fine, or make it worse.
    if (action.id === 'pay') return payWatchFine();
    provokeCityWatch(target.value);
    playSound('ui-tap');
    return true;
  },
  sanctuary() {
    healAtSanctuary();
    return true;
  },
  'ghost-speak'({ target }) {
    closeContextActions();
    return speakWithGraveyardGhost(target?.value ?? graveyardGhost);
  },
  'stair-up'() {
    closeContextActions();
    climbFloor();
    return true;
  },
  'stair-down'() {
    closeContextActions();
    // Кнопку проверили, когда рисовали; команда проверяет ещё раз сама.
    if (!stairDownOpen()) return false;
    descendFloor();
    return true;
  },
  'road-end'({ action }) {
    closeContextActions();
    if (action.id === 'claim') return completeVictory();
    descendFloor();
    return true;
  },
  recruiter({ action }) {
    closeContextActions();
    if (action.id === 'bed') return rentTavernBed();
    if (!action.id.startsWith('buy:')) return false;
    return buyKeeperFood(action.id.slice('buy:'.length));
  },
  'tavern-hire'({ action }) {
    closeContextActions();
    if (!action.id.startsWith('hire:')) return false;
    return hireIntoParty(action.id.slice('hire:'.length));
  },
  priest({ action }) {
    closeContextActions();
    if (action.id === 'forget') return payPriestForForgetting();
    if (action.id !== 'unbind') return false;
    return payPriestForUnbinding();
  },
  'city-gate'({ target, action }) {
    closeContextActions();
    /*
     * Вернёшься — встанешь там же, откуда ушёл.
     *
     * Раньше подъём ставил героя у ворот его дороги, а ушёл он мог другими:
     * Иван: «спустился на второй этаж и поднялся наверх, а он меня заспаунил
     * не там, где я спустился, а возле другой двери». Теперь клетка ворот
     * запоминается, и дорога обратно кончается ровно там, где началась.
     */
    if (target?.value) run.cityGate = { x: target.value.x, y: target.value.y };
    // «Уйти с добычей» is gone: a run ends by dying, by winning, or by the
    // player starting the next one.
    const branch = action.id === 'goSurface'
      ? 'surface'
      : action.id === 'goVaults' ? 'vaults' : 'deep';
    if (run.branch !== branch) {
      run = switchRunBranch(captureRun(), branch);
    }
    descendFloor();
    return true;
  },
  'branch-gate'({ target }) {
    closeContextActions();
    if (!target?.value?.to) return false;
    return enterBranch(target.value.to);
  },
  'chasm-jump'({ target }) {
    closeContextActions();
    if (!target?.value || chasmGuarded()) return false;
    fallIntoChasm(target.value);
    return true;
  },
  'portal-step'() {
    closeContextActions();
    return stepThroughPortal();
  },
  'jail-door'({ action }) {
    closeContextActions();
    return action.id === 'serve' ? serveJailSentence() : pickJailLock();
  },
  'companion-care'({ target, action }) {
    const beast = target.value;
    closeContextActions();
    if (action.id === 'release') return releaseCompanion(beast);
    return turnOnCompanion(beast);
  },
  'hunt-wildlife'({ target, action }) {
    const creature = target.value;
    closeContextActions();
    if (action.id === 'tame') return tameNearbyWildlife(creature);
    return beginNearbyWildlifeHunt(creature);
  },
  'cook-meat'({ target }) {
    const site = target.value;
    closeContextActions();
    return cookAtCampfire(site);
  },
  'buy-house'() {
    closeContextActions();
    return purchaseHouse();
  },
  parley({ target, action }) {
    closeContextActions();
    return answerParley(target, action?.id);
  },
  'install-furniture'({ target }) {
    closeContextActions();
    return installHouseFurniture(target?.value?.furnitureId);
  },
  'house-rest'() {
    closeContextActions();
    return restAtHouse();
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
    showLootToast(
      { path: monster?.spritePath ?? 'dngn/doors/closed_door.png', rarity: 0 },
      feedbackCopy(itemDetailLanguage).ambush,
      'hostile',
    );
  } else if (surprise.type === 'treasure') {
    showLootToast({ icon: GOLD_ICON_PATH, rarity: 2 }, feedbackCopy(itemDetailLanguage).treasure);
  } else {
    showLootToast({ icon: GOLD_ICON_PATH, rarity: 3 }, feedbackCopy(itemDetailLanguage).strange);
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
  // The cell door does not answer to hands, only to the fine or the lockpick.
  if (run.crime.jailed && door && door.instanceId === cityJailDoor()?.instanceId) {
    showLootToast({ path: CRIME_TOAST_ICON, rarity: 3 }, crimeRefusalText('lock-too-good', itemDetailLanguage), 'refused');
    return false;
  }
  if (!ready || uiScreen !== 'game' || hero.dead || !door || openingDoor || runStatus !== 'playing') return false;
  if (!doorDefinitions.some(({ instanceId }) => instanceId === door.instanceId) ||
    !revealed.has(`${door.x},${door.y}`)) return false;
  const wasOpen = run.floor.opened.includes(door.instanceId);
  if (wasOpen === targetOpen) return false;
  /*
   * Мерить надо тем же, чем меряет само взаимодействие.
   *
   * Кнопку «Открыть» игра предлагает по королевскому шагу — по диагонали дверь
   * считается соседней. Открывала же по ладейному: сумма по осям, и на
   * диагонали выходило два. Игрок подходил к лавке углом, получал карточку,
   * жал «Открыть» — и не происходило ничего, молча. В городе двери стоят в
   * стене вдоль улицы, и угол — самый естественный подход: три лавки из
   * четырёх оказывались наглухо закрыты, а выглядело это как «в магазинах не
   * спавнятся торговцы».
   *
   * Правило простое: если игра дала нажать — она обязана открыть.
   */
  const distance = cellStepDistance(
    { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) },
    door,
  );
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
    showLootToast({ path: 'dngn/doors/open_door.png', rarity: 0 }, doorAnnouncement.textContent, 'refused');
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

/** Святилище в шаге от героя — теперь такая же цель, как дверь или торговец. */
function nearbySanctuary() {
  return heroNearSanctuary() ? dungeon.sanctuary : null;
}

function updateBossHud() {
  refreshBossMusic();
  const boss = activeBoss();
  const visible = boss && isCurrentlyVisible(boss.x, boss.y) && runStatus === 'playing';
  bossHud.hidden = !visible;
  if (!visible) return;
  const percent = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
  bossHud.querySelector('img').src = spriteUrl(boss.spritePath);
  bossHealth.querySelector('i').style.transform = `scaleX(${percent})`;
  bossHealth.setAttribute('aria-valuenow', String(Math.round(percent * 100)));
}

function renderAppearanceEditor() {
  const position = playerAppearancePosition(appearanceDraft);
  appearanceBodyValue.textContent = `${position.body + 1}/${PLAYER_BODY_OPTIONS.length}`;
  appearanceHairValue.textContent = `${position.hair + 1}/${PLAYER_HAIR_OPTIONS.length}`;
  appearanceBeardValue.textContent = `${position.beard + 1}/${PLAYER_BEARD_OPTIONS.length}`;
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

/*
 * Кем выйти из ворот.
 *
 * Собираемый герой живёт здесь и нигде больше: экран его показывает, кнопки
 * правят, а `restartRun` получает готовым. Пока экран закрыт, он пуст.
 */
let pendingBuild = null;

/**
 * На каком шаге игрок.
 *
 * `archetypes` — выбор готового, `custom` — сборка своего. Иван: «сначала выбор
 * класса и в этом выборе кнопка „Создать свой“, и только потом уже создавать
 * свой класс, а не мешать это всё в одно окно».
 */
let creationStep = 'archetypes';

const CREATION_COPY = Object.freeze({
  ru: Object.freeze({
    pickTitle: 'Кем выйти',
    pickHint: 'Возьми готового героя или собери своего.',
    ownTitle: 'Свой герой',
    /*
     * Сколько очков — говорит счётчик, а не подпись под заголовком.
     *
     * Иван: «„Два очка характеристик и два навыка“ — это надо убрать из
     * создания персонажа. Просто надо более явно показать, сколько у игрока
     * очков, которые можно потратить». Счётчики стоят в заголовках обоих
     * разделов и меняются по ходу — подпись повторяла их и врала, как только
     * первое очко потрачено.
     */
    ownHint: '',
    skillHint: 'Нажми на навык, чтобы прочитать, что он делает.',
    own: 'Создать своего',
    back: 'Назад',
    cancel: 'Отмена',
    start: 'Начать',
    attributes: 'Характеристики',
    skills: 'Навыки',
  }),
  en: Object.freeze({
    pickTitle: 'Who walks out',
    pickHint: 'Take a ready hero or build your own.',
    ownTitle: 'Your own hero',
    ownHint: '',
    skillHint: 'Tap a skill to read what it does.',
    own: 'Build your own',
    back: 'Back',
    cancel: 'Cancel',
    start: 'Begin',
    attributes: 'Attributes',
    skills: 'Skills',
  }),
});

function renderCharacterCreation() {
  const model = buildScreenModel({ build: pendingBuild, language: itemDetailLanguage });
  const ru = itemDetailLanguage !== 'en';
  const copy = CREATION_COPY[ru ? 'ru' : 'en'];
  const свой = creationStep === 'custom';
  creationCard.dataset.step = creationStep;
  creationCard.querySelector('#character-creation-title').textContent = свой ? copy.ownTitle : copy.pickTitle;
  creationHint.textContent = свой ? copy.ownHint : copy.pickHint;
  // Подпись ставится в свою вставку, а не в кнопку целиком: `textContent`
  // на кнопке стирает вместе с прежним текстом и значок внутри неё.
  creationOwnButton.querySelector('b').textContent = copy.own;
  confirmCreationLabel.textContent = copy.start;
  creationAttributesTitle.textContent = copy.attributes;
  creationSkillsTitle.textContent = copy.skills;
  cancelCreationButton.textContent = свой ? copy.back : copy.cancel;
  /*
   * На первом шаге «Начать» ждёт выбора.
   *
   * Иначе нажать её можно было бы, не выбрав никого, — и забег начинался бы
   * героем без единого очка, хотя игроку их предлагали. Кто хочет такого
   * героя, доберётся до него через «Создать своего»: там пустой набор —
   * законное решение, а не промах.
   */
  confirmCreationButton.disabled = !свой && !model.archetypes.some(({ chosen }) => chosen);

  creationArchetypes.replaceChildren(...model.archetypes.map((archetype) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'creation-archetype';
    card.dataset.archetype = archetype.id;
    card.setAttribute('aria-pressed', String(archetype.chosen));
    const icon = document.createElement('img');
    icon.className = 'creation-archetype-icon';
    icon.src = spriteUrl(archetype.icon);
    icon.alt = '';
    icon.decoding = 'async';
    const name = document.createElement('b');
    name.textContent = archetype.name;
    const skills = document.createElement('i');
    skills.textContent = archetype.skills.join(' · ');
    /*
     * Две характеристики — двумя значками, а не строкой текста.
     *
     * Иван: «можно ещё только как-нибудь очень минималистично, прикольно
     * указать, что две ловкости или два интеллекта… ловкость, очевидно,
     * зелёная, интеллект синий, а сила красная». Цвет здесь и есть подпись:
     * читается раньше, чем буквы, и не отнимает у карточки высоту.
     */
    const stats = document.createElement('u');
    stats.className = 'creation-archetype-stats';
    for (const id of ATTRIBUTE_IDS) {
      const amount = archetype.attributes[id];
      if (!amount) continue;
      const pip = document.createElement('em');
      pip.dataset.attribute = id;
      pip.textContent = `+${amount} ${ATTRIBUTE_COPY[ru ? 'ru' : 'en'][id].short}`;
      stats.append(pip);
    }
    card.append(icon, name, stats, skills);
    return card;
  }));

  renderCreationAttributes(model, ru);
  renderCreationSkills(model);
}

/**
 * Характеристики — теми же строками, что и при прокачке.
 *
 * Разница ровно одна: взятое здесь можно вернуть. На уровне очко ложится
 * навсегда, а на создании герой ещё не вышел из города, и передумать — не
 * ошибка, а часть выбора.
 */
function renderCreationAttributes(model, ru) {
  const copy = attributeCopy(itemDetailLanguage);
  creationAttributePoints.textContent = `${copy.pointsLeft}: ${model.attributePointsLeft}`;
  creationAttributeRows.replaceChildren(...ATTRIBUTE_IDS.map((id) => {
    const row = document.createElement('div');
    row.className = 'character-attribute-row';
    row.dataset.attribute = id;
    row.setAttribute('role', 'listitem');
    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'character-attribute-name';
    name.textContent = copy[id].name;
    name.dataset.explain = id;
    name.setAttribute('aria-expanded', String(openCreationAttributeId === id));
    const description = document.createElement('span');
    description.textContent = copy[id].description;
    description.hidden = openCreationAttributeId !== id;
    const value = document.createElement('output');
    value.textContent = String(model.attributes[id]);
    const lower = document.createElement('button');
    lower.type = 'button';
    lower.className = 'character-attribute-raise creation-attribute-lower';
    lower.textContent = '−';
    lower.dataset.attribute = id;
    lower.dataset.step = '-1';
    lower.disabled = model.attributes[id] <= ATTRIBUTE_BASE;
    lower.setAttribute('aria-label', `${ru ? 'Вернуть очко' : 'Take the point back'}: ${copy[id].name}`);
    const raise = document.createElement('button');
    raise.type = 'button';
    raise.className = 'character-attribute-raise';
    raise.textContent = '+';
    raise.dataset.attribute = id;
    raise.dataset.step = '1';
    raise.disabled = model.attributePointsLeft <= 0;
    raise.setAttribute('aria-label', `${copy.raise}: ${copy[id].name}`);
    row.append(name, description, value, lower, raise);
    return row;
  }));
}

/**
 * Навыки — тем же списком и той же карточкой, что и при прокачке.
 *
 * Модель меню навыков считает всё сама: ступени, требования, что даст
 * следующий ранг. Чтобы она заработала до первого этажа, ей даётся временный
 * герой ровно такого уровня, чтобы у него было два очка, — этот герой никуда
 * не сохраняется, из него берётся только список выбранного.
 *
 * Дальше одно отличие от прокачки: на создании берут навык целиком, а не
 * ступень. Поэтому у взятого кнопка говорит «Убрать», а вторая ступень тут
 * не предлагается вовсе — до неё ещё надо дожить.
 */
function creationSkillState() {
  const выбрано = buildScreenModel({ build: pendingBuild }).skillIds;
  const state = createSkillState(CREATION_SKILL_POINTS + 1);
  for (const id of выбрано) state.ranks[id] = 1;
  state.points = CREATION_SKILL_POINTS - выбрано.length;
  return state;
}

function renderCreationSkills(model) {
  const ru = itemDetailLanguage !== 'en';
  const меню = skillMenuModel({
    state: creationSkillState(),
    heroLevel: CREATION_SKILL_POINTS + 1,
    runStatus: 'playing',
    language: itemDetailLanguage,
    attributes: { ...model.attributes, spent: 0 },
    rested: true,
  });
  creationSkillPoints.textContent = `${меню.pointsLabel}: ${model.skillPointsLeft}`;
  skillLadderCopy = { rank: меню.ladderRankLabel, level: меню.ladderLevelLabel };
  creationSkillGroups.replaceChildren(...меню.groups.map((group) => {
    const section = document.createElement('section');
    section.className = 'character-skill-group';
    const heading = document.createElement('h4');
    heading.textContent = group.label;
    section.append(heading);
    for (const skill of group.skills) {
      const взят = model.skillIds.includes(skill.id);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'character-skill-row';
      row.dataset.skillId = skill.id;
      row.dataset.taken = String(взят);
      row.setAttribute('aria-pressed', String(creationSkillId === skill.id));
      const details = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = `${skill.name} ${взят ? 1 : 0}/${skill.maxRank}`;
      const branch = document.createElement('div');
      branch.className = 'skill-branch';
      branch.setAttribute('aria-hidden', 'true');
      renderSkillBranch(branch, skill.branch);
      details.append(name, branch);
      const state = document.createElement('p');
      state.textContent = взят
        ? (ru ? 'Взят' : 'Taken')
        : model.skillPointsLeft > 0
          ? (ru ? 'Можно взять' : 'Can be taken')
          : (ru ? 'Очки кончились' : 'No points left');
      details.append(state);
      row.setAttribute('aria-label', `${skill.name}. ${skill.nextRankNote}. ${state.textContent}`);
      row.append(details);
      section.append(row);
    }
    return section;
  }));
  const выбранный = меню.groups.flatMap(({ skills }) => skills)
    .find(({ id }) => id === creationSkillId) ?? null;
  if (выбранный) showCreationSkillCard(выбранный, model);
  else creationSkillDetail.hidden = true;
}

function showCreationSkillCard(skill, model) {
  const ru = itemDetailLanguage !== 'en';
  const взят = model.skillIds.includes(skill.id);
  const строка = creationSkillGroups.querySelector(`[data-skill-id="${skill.id}"]`);
  if (строка && creationSkillDetail.previousElementSibling !== строка) строка.after(creationSkillDetail);
  creationSkillDetail.hidden = false;
  creationSkillDetailName.textContent = `${skill.name} ${взят ? 1 : 0}/${skill.maxRank}`;
  renderSkillBranch(creationSkillDetailBranch, skill.branch);
  creationSkillDetailText.textContent = skill.description;
  renderSkillLadder({ ...skill, rank: взят ? 1 : 0 }, skillLadderCopy, creationSkillLadder);
  creationSkillDetailNext.textContent = skill.nextRankNote;
  creationSkillTake.textContent = взят
    ? (ru ? 'Убрать' : 'Drop')
    : (ru ? 'Взять' : 'Take');
  creationSkillTake.disabled = !взят && model.skillPointsLeft <= 0;
  creationSkillTake.dataset.skillId = skill.id;
  creationSkillClose.textContent = ru ? 'Закрыть' : 'Close';
}

/** Что раскрыто и что выбрано на экране создания — между перерисовками. */
let openCreationAttributeId = null;
let creationSkillId = null;

function openCharacterCreation() {
  if (uiScreen !== 'menu' && uiScreen !== 'restart-confirm') return false;
  returnBorrowedFloor();
  creationStep = 'archetypes';
  openCreationAttributeId = null;
  creationSkillId = null;
  if (uiScreen === 'restart-confirm') {
    newRunConfirm.inert = true;
    newRunConfirm.setAttribute('aria-hidden', 'true');
  }
  unlockLevelUpAudio();
  pendingBuild = createEmptyBuild();
  mainMenu.inert = true;
  mainMenu.setAttribute('aria-hidden', 'true');
  uiScreen = 'creation';
  document.body.dataset.screen = uiScreen;
  characterCreation.inert = false;
  characterCreation.setAttribute('aria-hidden', 'false');
  renderCharacterCreation();
  playSound('ui-tap');
  requestAnimationFrame(() => confirmCreationButton.focus());
  return true;
}

/** «Назад» со второго шага возвращает к выбору, а не закрывает всё окно. */
function backFromCreation() {
  if (uiScreen !== 'creation') return false;
  if (creationStep !== 'custom') return closeCharacterCreation();
  creationStep = 'archetypes';
  pendingBuild = createEmptyBuild();
  playSound('ui-close');
  renderCharacterCreation();
  return true;
}

function closeCharacterCreation() {
  if (uiScreen !== 'creation') return false;
  characterCreation.inert = true;
  characterCreation.setAttribute('aria-hidden', 'true');
  pendingBuild = null;
  uiScreen = 'menu';
  document.body.dataset.screen = uiScreen;
  mainMenu.inert = false;
  mainMenu.setAttribute('aria-hidden', 'false');
  playSound('ui-close');
  requestAnimationFrame(() => startGameButton.focus());
  return true;
}

/** Собранный герой уходит в новый забег, и экран закрывается за ним. */
function startRunFromCreation() {
  if (uiScreen !== 'creation') return false;
  const build = pendingBuild;
  characterCreation.inert = true;
  characterCreation.setAttribute('aria-hidden', 'true');
  pendingBuild = null;
  menuMode = 'pause';
  restartRun(null, build);
  pauseGameButton.disabled = false;
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
  // Согласился потерять прогресс — теперь выбирает, кем идти заново.
  return openCharacterCreation();
}

function openMainMenu() {
  if (!ready || uiScreen !== 'game') return false;
  clearMoveControl();
  hero.path = [];
  menuMode = 'pause';
  uiScreen = 'menu';
  playSound('ui-close');
  setAmbientLevel(0.35);
  setMusicLevel(0.35);
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
  /*
   * Забег, которого ещё не начинали, начинается с выбора героя.
   *
   * Продолжение — нет: герой у него уже есть. Отличает их то же, что и надпись
   * на кнопке: сделал ли игрок хоть один ход.
   */
  if (!playerHasActed || isTerminalRunStatus(runStatus)) return openCharacterCreation();
  // Показ занимал картинку — этаж забега возвращается до первого кадра игры.
  returnBorrowedFloor();
  mainMenu.inert = true;
  mainMenu.setAttribute('aria-hidden', 'true');
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
  // Кладбище решается по метасостоянию, а оно загружается позже, чем этаж
  // обставляется в первый раз: на первом кадре обстановку надо пересобрать.
  resolveGraveyard();
  dungeonEnvironment = createDungeonEnvironment(dungeon, { graveyardRoom: activeGraveyardRoom });
  mistAnchors = createMistAnchors(dungeon);
  // A loaded save can already own a camp or a house; their things belong on
  // the floor before the first frame, not only after the next descent.
  applyCampProps();
  placeFloorGhost();
  placeGraveyardGhost();
  // И примета — тоже. Она показывается при входе на этаж, а забег, начатый
  // или продолженный из меню, входит на свой этаж именно здесь: без этого
  // первый этаж забега был единственным, о котором игру не предупреждали.
  showOmenNote(dungeon.rareEncounter?.omen);
  updateInteractionUi();
  setAmbientLevel(1);
  setMusicLevel(1);
  /*
   * Звук будится последним — когда этаж уже возвращён, а экран уже игровой.
   *
   * Разбудить его раньше значило бы завести тему меню ровно тем касанием,
   * которым из меню выходят.
   */
  unlockLevelUpAudio();
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
});

/**
 * Дом на карте — всегда его дверь.
 *
 * Пока участок продавался, метка стояла на вывеске у стены: вывески больше
 * нет, дом показывает маклер внутри, и войти к нему можно только в дверь. Без
 * метки игрок пройдёт мимо собственного дома и не узнает, что город его
 * продаёт.
 */
function houseMapMarker() {
  const plot = cityHousePlot();
  if (!plot?.door) return [];
  return [{ kind: 'house', x: plot.door.x, y: plot.door.y }];
}

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
    ...(dungeon.depth > CITY_DEPTH
      ? [{ kind: 'ascent', x: dungeon.spawn.x, y: dungeon.spawn.y }]
      : []),
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
    ...houseMapMarker(),
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
  renderFloorMapLegend();
  depthBadge.setAttribute('aria-label', copy.open(label));
  depthBadge.title = copy.open(label);
}

/**
 * What the marks on the map mean.
 *
 * Fourteen kinds of thing were drawn as coloured shapes and none of them said
 * which was which, so the only way to learn that the orange cross is a trap was
 * to walk onto one. Ivan asked for a legend that is not always in the way, so
 * it lives behind a «?» and remembers nothing: closing the map closes it.
 */
function renderFloorMapLegend() {
  const copy = floorMapCopy(itemDetailLanguage);
  const open = floorMapLegendToggle.getAttribute('aria-pressed') === 'true';
  floorMapLegendToggle.setAttribute('aria-label', open ? copy.legendClose : copy.legend);
  floorMapLegendToggle.title = open ? copy.legendClose : copy.legend;
  floorMapLegendList.setAttribute('aria-label', copy.legend);
  floorMapLegendList.hidden = !open;
  if (!open) return;
  floorMapLegendList.replaceChildren(...floorMapLegend(itemDetailLanguage).map((entry) => {
    const row = document.createElement('li');
    const swatch = document.createElement('canvas');
    const label = document.createElement('span');
    swatch.width = 18;
    swatch.height = 18;
    swatch.setAttribute('aria-hidden', 'true');
    // Drawn by the same code that draws the map, so the legend cannot describe
    // a map the game does not paint.
    drawFloorMapMarker(
      swatch.getContext('2d'),
      { kind: entry.kind, shape: entry.shape, color: entry.color, x: 0, y: 0 },
      18,
      { x: 0, y: 0 },
    );
    label.textContent = entry.label;
    row.append(swatch, label);
    return row;
  }));
}

function toggleFloorMapLegend() {
  const open = floorMapLegendToggle.getAttribute('aria-pressed') === 'true';
  floorMapLegendToggle.setAttribute('aria-pressed', String(!open));
  renderFloorMapLegend();
  return true;
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
  interactActions.replaceChildren();
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
  const bait = item?.id === POISON_BAIT_ITEM_ID;
  const known = bait
    ? (capabilities.poisoncraftRank ?? 0) >= 1
    : (capabilities.trapPlacementTier ?? 0) >= 1;
  if (
    uiScreen !== 'inventory'
    || runStatus !== 'playing'
    || hero.dead
    || (item?.id !== PLAYER_TRAP_ITEM_ID && !bait)
    || !known
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
    kind: item.id === POISON_BAIT_ITEM_ID ? PLAYER_BAIT_KIND : PLAYER_TRAP_KIND,
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
  abilityTargetingIcon.src = spriteUrl(nextState.icon);
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

function beginBlinkTargeting(itemUid, effectOverride = null) {
  const item = itemInstances.get(itemUid);
  const effect = effectOverride ?? item?.useEffect ?? null;
  if (
    uiScreen !== 'inventory'
    || runStatus !== 'playing'
    || hero.dead
    || effect?.type !== 'blink'
  ) return false;
  const nextState = {
    kind: 'blink',
    itemUid,
    range: effect.range,
    returnScreen: 'inventory',
    icon: spriteForItem(presentedItem(item)),
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
    icon: spriteForItem(presentedItem(item)),
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
    weaponMagic: null,
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

function loadMetaState() {
  try {
    metaState = parseMeta(localStorage.getItem(META_KEY));
  } catch {
    metaState = createMetaState();
  }
  renderRecords();
}

function persistMetaState() {
  try {
    localStorage.setItem(META_KEY, serializeMeta(metaState));
  } catch {
    // A full or private storage must never interrupt the end of a run.
  }
}

function loadStashState() {
  try {
    stashState = parseStash(localStorage.getItem(STASH_KEY));
  } catch {
    stashState = createStashState(null);
  }
}

function persistStash() {
  try {
    localStorage.setItem(STASH_KEY, serializeStash(stashState));
  } catch {
    // Same promise as the records: storage must never eat a finished run.
  }
}

/** One finished run enters the history: totals, best runs and milestones. */
/**
 * What the hero was wearing when they fell, in the shape the bones keep: enough
 * to draw the ghost and to hand the gear back if the player earns it.
 */
function heroGearForBones() {
  return EQUIPMENT_SLOTS
    .map((slot) => {
      const item = equippedItem(slot);
      if (!item) return null;
      return {
        slot,
        id: item.id,
        materialId: item.materialId ?? null,
        affixIds: [...(item.affixIds ?? [])],
      };
    })
    .filter(Boolean);
}

/**
 * Every ending pays the same way, in the one place every ending goes through.
 *
 * It used to be paid at the gate, out of the purse, and only if the hero
 * walked away on purpose — which turned every floor into a question about
 * cashing in. Now the run is paid for having been played, and dying on the
 * ninth floor is worth more than turning back on the second.
 */
function bankRunEarnings() {
  const earned = stashEarned({ depth: dungeon.depth, kills: run.stats.kills });
  if (earned <= 0) return 0;
  stashState = stashDeposit(stashState, earned);
  persistStash();
  return earned;
}

function recordFinishedRun(result) {
  bankRunEarnings();
  const outcome = recordRunResult(metaState, {
    depth: dungeon.depth,
    status: result,
    kills: run.stats.kills,
    gold,
    level: hero.level,
    seconds: Math.round(run.stats.activeSeconds),
    seed: run.seed,
    killerId: run.stats.killerId,
    at: new Date().toISOString().slice(0, 10),
    house: run.house.owned,
    wanted: run.crime.wanted,
  });
  if (!outcome.ok) return null;
  metaState = outcome.meta;
  // A victory walks out; only a death leaves a body for the next run to meet.
  if (result === 'dead') {
    metaState = recordBones(metaState, {
      depth: dungeon.depth,
      x: Math.floor(hero.x / TILE),
      y: Math.floor(hero.y / TILE),
      level: hero.level,
      killerId: run.stats.killerId,
      seed: run.seed,
      at: new Date().toISOString().slice(0, 10),
      appearance: {
        bodyId: playerAppearance.bodyId,
        hairId: playerAppearance.hairId,
      },
      gear: heroGearForBones(),
    });
  }
  persistMetaState();
  renderRecords();
  return outcome;
}

function renderRecords() {
  const model = metaModel(metaState, itemDetailLanguage);
  recordsTitle.textContent = model.title;
  openRecordsLabel.textContent = model.title;
  openRecordsButton.setAttribute('aria-label', model.title);
  closeRecordsButton.setAttribute('aria-label', model.close);
  recordsScreen.setAttribute('aria-label', model.title);
  recordsDaily.textContent = model.daily;
  playDailyButton.textContent = model.playDaily;
  playDailyButton.setAttribute('aria-label', `${model.playDaily}: ${model.dailySeed}`);
  recordsEmpty.textContent = model.empty;
  recordsEmpty.hidden = model.empty === '';
  recordsBest.replaceChildren(...model.best.map((entry) => {
    const row = document.createElement('li');
    const place = document.createElement('b');
    const depth = document.createElement('span');
    const detail = document.createElement('span');
    place.textContent = `${entry.place}.`;
    // Every row is a floor number now, with a sign for how it ended: a victory
    // on eighteen and a death on forty have to be readable side by side.
    depth.textContent = `${entry.mark} ${entry.depth}`.trim();
    detail.textContent = `${entry.kills} ⚔ · ${entry.gold} ◆ · ${entry.time}`;
    row.dataset.result = entry.status;
    row.append(place, depth, detail);
    return row;
  }));
  recordsTotals.replaceChildren(...model.totals.flatMap((row) => {
    const label = document.createElement('dt');
    const value = document.createElement('dd');
    label.textContent = row.label;
    value.textContent = row.value;
    return [label, value];
  }));
  recordsMilestones.replaceChildren(...model.milestones.map((milestone) => {
    const row = document.createElement('li');
    const mark = document.createElement('b');
    const body = document.createElement('div');
    const label = document.createElement('span');
    mark.textContent = milestone.earned ? '✔' : '·';
    body.textContent = milestone.label;
    label.textContent = milestone.hint;
    body.append(label);
    row.append(mark, body);
    row.dataset.earned = String(milestone.earned);
    return row;
  }));
  // Twelve lines for twelve things the dungeon does when nobody asked it to.
  // This list is the reason none of them reads as a bug: a glitch does not turn
  // up in a record of what you have seen, and it survives the run that showed it.
  const scenes = ambientSeenModel(metaState.scenes, itemDetailLanguage);
  ambientSeenTitle.textContent = `${scenes.title} ${scenes.progress}`;
  ambientSeenList.replaceChildren(...scenes.entries.map((entry) => {
    const row = document.createElement('li');
    const mark = document.createElement('b');
    const body = document.createElement('div');
    mark.textContent = entry.seen ? '✔' : '·';
    body.textContent = entry.text;
    row.style.setProperty('--scene-colour', entry.colour);
    row.dataset.seen = String(entry.seen);
    row.append(mark, body);
    return row;
  }));
  // Six names, six marks. The empty ones are the point: they are the only place
  // the game says out loud that the other road has a different guardian on it.
  const trophies = trophyModel(metaState.trophies, itemDetailLanguage);
  recordsTrophiesTitle.textContent = `${trophies.copy.title} ${trophies.taken}/${trophies.total}`;
  recordsTrophies.replaceChildren(...trophies.rows.map((trophy) => {
    const row = document.createElement('li');
    const mark = document.createElement('b');
    const body = document.createElement('div');
    const label = document.createElement('span');
    mark.textContent = trophy.taken ? '✔' : '·';
    body.textContent = trophy.taken ? trophy.name : '???';
    fillTextWithIcons(label, `${trophy.road} · ${trophy.floor} · ${trophy.bounty} {gold}`);
    body.append(label);
    row.append(mark, body);
    row.dataset.earned = String(trophy.taken);
    return row;
  }));
}

const recordsTrophies = document.querySelector('#records-trophies');
const recordsTrophiesTitle = document.querySelector('#records-trophies-title');
const outfitScreen = document.querySelector('#outfit-screen');
const openOutfitButton = document.querySelector('#open-outfit');
const closeOutfitButton = document.querySelector('#close-outfit');
const outfitRows = document.querySelector('#outfit-rows');
const outfitFigure = document.querySelector('#outfit-figure');
const outfitBasket = document.querySelector('#outfit-basket');
const outfitWallet = document.querySelector('#outfit-wallet');
const outfitWalletLabel = document.querySelector('#outfit-wallet-label');
const outfitEmpty = document.querySelector('#outfit-empty');
const outfitStartButton = document.querySelector('#outfit-start');
const outfitDetail = document.querySelector('#outfit-detail');
const outfitDetailIcon = document.querySelector('#outfit-detail-icon');
const outfitDetailName = document.querySelector('#outfit-detail-name');
const outfitDetailKind = document.querySelector('#outfit-detail-kind');
const outfitDetailPrice = document.querySelector('#outfit-detail-price');
const outfitDetailEffects = document.querySelector('#outfit-detail-effects');
const outfitDetailOwned = document.querySelector('#outfit-detail-owned');
const outfitDetailClose = document.querySelector('#outfit-detail-close');
const outfitDetailReturn = document.querySelector('#outfit-detail-return');
const outfitDetailBuy = document.querySelector('#outfit-detail-buy');
const outfitTitle = document.querySelector('#outfit-title');
let outfitReturnScreen = 'menu';

/**
 * The counter at the gate. Everything it knows comes from `stashModel`; the
 * screen decides nothing but where to put it, which is why a refusal here can
 * say *which* refusal it is instead of greying a button out in silence.
 */
function renderOutfit() {
  const model = stashModel(stashState, itemDetailLanguage);
  outfitTitle.textContent = model.copy.title;
  outfitWalletLabel.textContent = model.copy.wallet;
  outfitWallet.textContent = String(model.gold);
  outfitStartButton.textContent = model.copy.start;
  outfitBasket.textContent = `${model.copy.basket}: ${model.basket}/${model.basketLimit}`;
  outfitEmpty.hidden = model.gold > 0 || model.basket > 0;
  outfitEmpty.textContent = model.copy.empty;

  // The figure is what you will walk in as: only what is worn shows up on it.
  outfitFigure.replaceChildren(...model.rows
    .flatMap((row) => row.goods)
    .filter((good) => good.owned > 0 && good.slot)
    .map((good) => {
      const worn = document.createElement('img');
      worn.className = 'outfit-worn';
      worn.src = spriteUrl(good.icon);
      worn.alt = good.name;
      worn.title = good.name;
      return worn;
    }));

  outfitRows.replaceChildren(...model.rows.map((row) => {
    const section = document.createElement('section');
    section.className = 'outfit-row';
    const title = document.createElement('h3');
    title.textContent = row.title;
    section.append(title);
    const list = document.createElement('div');
    list.className = 'outfit-goods';
    for (const good of row.goods) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outfit-good';
      button.dataset.goodId = good.id;
      if (good.owned > 0) button.dataset.owned = String(good.owned);
      button.disabled = !good.affordable && good.owned === 0;
      const icon = document.createElement('img');
      icon.src = spriteUrl(good.icon);
      icon.alt = '';
      const name = document.createElement('b');
      name.textContent = good.name;
      const price = document.createElement('span');
      price.className = 'outfit-price';
      fillTextWithIcons(price, `${good.price} {gold}`);
      button.append(icon, name, price);
      if (good.owned > 0) {
        const owned = document.createElement('i');
        owned.className = 'outfit-owned';
        owned.textContent = `×${good.owned}`;
        button.append(owned);
      }
      list.append(button);
    }
    section.append(list);
    return section;
  }));
}

/**
 * Buying without reading is not a decision. A tap on the counter opens the
 * thing — the same name, the same description, the same list of what it does
 * that the bag shows — and the money only moves from inside that card.
 */
let outfitDetailId = null;

function renderOutfitDetail() {
  if (!outfitDetailId) return;
  const model = stashModel(stashState, itemDetailLanguage);
  const good = model.rows.flatMap((row) => row.goods).find((entry) => entry.id === outfitDetailId);
  if (!good) return;
  outfitDetailIcon.src = spriteUrl(good.icon);
  outfitDetailIcon.alt = good.name;
  outfitDetailName.textContent = good.name;
  outfitDetailKind.textContent = [good.rarity, good.slotLabel].filter(Boolean).join(' · ');
  fillTextWithIcons(outfitDetailPrice, `${good.price} {gold}`);
  outfitDetailEffects.replaceChildren(...good.effects.map((effect) => {
    const row = document.createElement('li');
    const icon = document.createElement('i');
    icon.textContent = effect.icon;
    const text = document.createElement('span');
    text.textContent = effect.text;
    row.append(icon, text);
    return row;
  }));
  outfitDetailOwned.hidden = good.owned === 0;
  outfitDetailOwned.textContent = `${model.copy.owned}: ${good.owned}`;
  // The cross is what every other panel here closes with; the word did not fit
  // its column and is the name the screen reader hears instead.
  outfitDetailClose.textContent = '×';
  outfitDetailClose.setAttribute('aria-label', model.copy.close);
  outfitDetailReturn.textContent = model.copy.give;
  outfitDetailReturn.hidden = good.owned === 0;
  fillTextWithIcons(outfitDetailBuy, `${model.copy.buy} · ${good.price} {gold}`);
  outfitDetailBuy.disabled = !good.affordable;
}

function openOutfitDetail(id) {
  outfitDetailId = id;
  renderOutfitDetail();
  outfitDetail.inert = false;
  outfitDetail.setAttribute('aria-hidden', 'false');
  playSound('ui-tap');
  requestAnimationFrame(() => outfitDetailBuy.focus());
}

function closeOutfitDetail() {
  if (outfitDetail.getAttribute('aria-hidden') === 'true') return false;
  outfitDetail.setAttribute('aria-hidden', 'true');
  outfitDetail.inert = true;
  const id = outfitDetailId;
  outfitDetailId = null;
  playSound('ui-close');
  requestAnimationFrame(() => {
    outfitRows.querySelector(`button[data-good-id="${id}"]`)?.focus();
  });
  return true;
}

function toggleOutfitGood(id, wantsReturn) {
  const result = wantsReturn ? stashReturn(stashState, id) : stashBuy(stashState, id);
  if (!result.ok) {
    showLootToast({ icon: GOLD_ICON_PATH, rarity: 0 }, stashCopy(itemDetailLanguage).refusal[result.reason] ?? '', 'refused');
    playSound('ui-close');
    return false;
  }
  stashState = result.stash;
  persistStash();
  renderOutfit();
  renderOutfitDetail();
  playSound(wantsReturn ? 'ui-close' : 'gold');
  return true;
}

function openOutfit() {
  if (uiScreen === 'outfit') return false;
  outfitReturnScreen = uiScreen;
  renderOutfit();
  uiScreen = 'outfit';
  document.body.dataset.screen = uiScreen;
  outfitScreen.inert = false;
  outfitScreen.setAttribute('aria-hidden', 'false');
  playSound('ui-tap');
  requestAnimationFrame(() => closeOutfitButton.focus());
  return true;
}

function closeOutfit() {
  if (uiScreen !== 'outfit') return false;
  closeOutfitDetail();
  outfitScreen.inert = true;
  outfitScreen.setAttribute('aria-hidden', 'true');
  uiScreen = outfitReturnScreen === 'outfit' ? 'menu' : outfitReturnScreen;
  document.body.dataset.screen = uiScreen;
  playSound('ui-close');
  requestAnimationFrame(() => openOutfitButton.focus());
  return true;
}

function openRecords() {
  if (uiScreen === 'records') return false;
  recordsReturnScreen = uiScreen;
  renderRecords();
  uiScreen = 'records';
  document.body.dataset.screen = uiScreen;
  recordsScreen.inert = false;
  recordsScreen.setAttribute('aria-hidden', 'false');
  playSound('ui-tap');
  requestAnimationFrame(() => closeRecordsButton.focus());
  return true;
}

function closeRecords() {
  if (uiScreen !== 'records') return false;
  recordsScreen.inert = true;
  recordsScreen.setAttribute('aria-hidden', 'true');
  uiScreen = recordsReturnScreen === 'records' ? 'menu' : recordsReturnScreen;
  document.body.dataset.screen = uiScreen;
  playSound('ui-close');
  requestAnimationFrame(() => openRecordsButton.focus());
  return true;
}

/**
 * Настройки: язык и звук, и одно необратимое действие под ними.
 *
 * Раньше язык и громкость лежали прямо в карточке меню — отнимали место у
 * того, ради чего меню и открывают, и в паузе висели поверх игры. Здесь они
 * стоят там, где их ищут, и подписаны словами, а не значками.
 */
/**
 * Яркость ложится фильтром на оба холста мира. При 100% фильтра нет вовсе:
 * на слабом телефоне полноэкранный фильтр стоит кадров, и платить за него
 * должен только тот, кто его включил.
 */
function applyDisplaySettings() {
  const model = displayMenuModel(displaySettings, itemDetailLanguage);
  if (model.filter == null) {
    delete document.body.dataset.bright;
    document.body.style.removeProperty('--world-brightness');
  } else {
    document.body.dataset.bright = 'true';
    document.body.style.setProperty('--world-brightness', String(model.filter));
  }
  settingsBrightnessTitle.textContent = model.groupLabel;
  settingsBrightnessGroup.setAttribute('aria-label', model.groupLabel);
  brightnessValue.textContent = model.valueText;
  brightnessDownButton.setAttribute('aria-label', model.darkerLabel);
  brightnessUpButton.setAttribute('aria-label', model.brighterLabel);
  brightnessDownButton.disabled = !model.canLower;
  brightnessUpButton.disabled = !model.canRaise;
}

function changeBrightness(direction) {
  displaySettings = stepBrightness(displaySettings, direction);
  try {
    localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(displaySettings));
  } catch {
    // Без хранилища яркость живёт до перезагрузки — это не повод ломать меню.
  }
  applyDisplaySettings();
  playSound('ui-tap');
}

function renderSettings() {
  applyDisplaySettings();
  const { labels } = currentMainMenuModel();
  settingsTitle.textContent = labels.settings;
  openSettingsLabel.textContent = labels.settings;
  // Подпись кнопки снаряжения жила только в разметке и оставалась русской на
  // английском меню. Берётся оттуда же, откуда заголовок самого экрана.
  openOutfitLabel.textContent = stashCopy(itemDetailLanguage).title;
  openSettingsButton.setAttribute('aria-label', labels.openSettings);
  closeSettingsButton.setAttribute('aria-label', labels.closeSettings);
  settingsScreen.setAttribute('aria-label', labels.settings);
  settingsLanguageTitle.textContent = labels.settingsLanguage;
  settingsAudioTitle.textContent = labels.settingsAudio;
  settingsWipeTitle.textContent = labels.wipeTitle;
  settingsWipeNote.textContent = labels.wipeNote;
  // Кнопка помнит, спрашивали уже или нет: взведённая говорит «точно?».
  const armed = wipeProgressButton.dataset.armed === 'true';
  wipeProgressButton.textContent = armed ? labels.wipeConfirm : labels.wipe;
  wipeProgressButton.setAttribute('aria-label', armed ? labels.wipeConfirm : labels.wipe);
}

function openSettings() {
  if (uiScreen === 'settings') return false;
  settingsReturnScreen = uiScreen;
  disarmWipe();
  renderSettings();
  uiScreen = 'settings';
  document.body.dataset.screen = uiScreen;
  settingsScreen.inert = false;
  settingsScreen.setAttribute('aria-hidden', 'false');
  playSound('ui-tap');
  requestAnimationFrame(() => closeSettingsButton.focus());
  return true;
}

function closeSettings() {
  if (uiScreen !== 'settings') return false;
  disarmWipe();
  settingsScreen.inert = true;
  settingsScreen.setAttribute('aria-hidden', 'true');
  uiScreen = settingsReturnScreen === 'settings' ? 'menu' : settingsReturnScreen;
  document.body.dataset.screen = uiScreen;
  playSound('ui-close');
  requestAnimationFrame(() => openSettingsButton.focus());
  return true;
}

function disarmWipe() {
  if (wipeProgressButton.dataset.armed !== 'true') return;
  wipeProgressButton.dataset.armed = 'false';
  renderSettings();
}

/**
 * Стереть всё — единственное необратимое действие в меню.
 *
 * Поэтому первое касание только взводит кнопку, а стирает второе. Уходя с
 * экрана, кнопка разряжается сама: вернуться к взведённой и снести записи
 * случайным тычком игрок не должен.
 */
function wipeProgress() {
  if (wipeProgressButton.dataset.armed !== 'true') {
    wipeProgressButton.dataset.armed = 'true';
    renderSettings();
    playSound('ui-tap');
    return;
  }
  wipeProgressButton.dataset.armed = 'false';
  try {
    for (const key of [SAVE_KEY, `${SAVE_KEY}:backup`, META_KEY, STASH_KEY, ...LEGACY_SAVE_KEYS]) {
      localStorage.removeItem(key);
    }
  } catch {
    // Приватный режим и переполненное хранилище — не повод падать.
  }
  const { labels } = currentMainMenuModel();
  wipeProgressButton.textContent = labels.wipeDone;
  wipeProgressButton.disabled = true;
  playSound('ui-close');
  // Перезагрузка — самый честный способ начать с чистого листа: половина
  // состояния живёт в модулях, и склеивать её вручную значит забыть про часть.
  setTimeout(() => window.location.reload(), 420);
}

/**
 * Авторы: не вежливость, а условие.
 *
 * Часть графики лежит под CC-BY и CC-BY-SA. Они разрешают и правку, и
 * продажу, но требуют назвать автора там, где работу видно, — в игре, а не
 * только в файле репозитория. Каталог сверяется с настоящими лицензиями
 * тестом, поэтому здесь остаётся только разложить его по карточкам.
 */
function renderCredits() {
  const model = creditsModel(itemDetailLanguage);
  creditsTitle.textContent = model.title;
  openCreditsLabel.textContent = model.title;
  openCreditsButton.setAttribute('aria-label', model.title);
  closeCreditsButton.setAttribute('aria-label', model.close);
  creditsScreen.setAttribute('aria-label', model.title);
  creditsBody.replaceChildren(...model.sections.map((entry) => {
    const block = document.createElement('section');
    block.className = 'credits-block';
    const title = document.createElement('h3');
    title.textContent = entry.title;
    block.append(title);
    if (entry.licenseLabel) {
      const license = document.createElement('p');
      license.className = 'credits-license';
      // CC-BY и CC-BY-SA требуют ссылку на текст лицензии, а не только её имя.
      if (entry.licenseUrl) license.append(creditsLink(entry.licenseUrl, entry.licenseLabel));
      else license.textContent = entry.licenseLabel;
      block.append(license);
    }
    for (const line of entry.lines) {
      const text = document.createElement('p');
      text.className = 'credits-line';
      text.textContent = line;
      block.append(text);
    }
    if (entry.source) {
      const link = document.createElement('a');
      link.className = 'credits-source';
      link.href = entry.source;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = entry.source.replace(/^https?:\/\//, '');
      block.append(link);
    }
    if (entry.notice) {
      const notice = creditsLink(entry.notice, entry.noticeLabel);
      notice.classList.add('credits-source');
      block.append(notice);
    }
    return block;
  }));
}

/** Ссылка титров: внешняя — как есть, файл рядом с игрой — от корня сборки. */
function creditsLink(path, label) {
  const link = document.createElement('a');
  link.href = /^https?:\/\//.test(path) ? path : new URL(`../${path}`, document.baseURI).href;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = label;
  return link;
}

function openCredits() {
  if (uiScreen === 'credits') return false;
  creditsReturnScreen = uiScreen;
  renderCredits();
  uiScreen = 'credits';
  document.body.dataset.screen = uiScreen;
  creditsScreen.inert = false;
  creditsScreen.setAttribute('aria-hidden', 'false');
  playSound('ui-tap');
  requestAnimationFrame(() => closeCreditsButton.focus());
  return true;
}

function closeCredits() {
  if (uiScreen !== 'credits') return false;
  creditsScreen.inert = true;
  creditsScreen.setAttribute('aria-hidden', 'true');
  uiScreen = creditsReturnScreen === 'credits' ? 'menu' : creditsReturnScreen;
  document.body.dataset.screen = uiScreen;
  playSound('ui-close');
  requestAnimationFrame(() => openCreditsButton.focus());
  return true;
}

/**
 * Справка «Как играть». Иван: обучать не в самой игре, а за кнопкой «?» в
 * меню. Текст и числа приходят из правил; здесь их только раскладывают.
 */
function renderHelp() {
  const model = helpModel(itemDetailLanguage);
  helpTitle.textContent = model.title;
  openHelpButton.setAttribute('aria-label', model.open);
  openHelpButton.title = model.open;
  closeHelpButton.setAttribute('aria-label', model.close);
  helpScreen.setAttribute('aria-label', model.title);
  helpBody.replaceChildren(...model.sections.map((section) => {
    const block = document.createElement('section');
    block.className = 'help-block';
    const title = document.createElement('h3');
    title.textContent = section.title;
    const list = document.createElement('dl');
    list.className = 'help-entries';
    for (const item of section.entries) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = item.term;
      const text = document.createElement('dd');
      text.textContent = item.text;
      row.append(term, text);
      list.append(row);
    }
    block.append(title, list);
    return block;
  }));
}

function openHelp() {
  if (uiScreen === 'help') return false;
  helpReturnScreen = uiScreen;
  renderHelp();
  uiScreen = 'help';
  document.body.dataset.screen = uiScreen;
  helpScreen.inert = false;
  helpScreen.setAttribute('aria-hidden', 'false');
  helpBody.scrollTop = 0;
  playSound('ui-tap');
  requestAnimationFrame(() => closeHelpButton.focus());
  return true;
}

function closeHelp() {
  if (uiScreen !== 'help') return false;
  helpScreen.inert = true;
  helpScreen.setAttribute('aria-hidden', 'true');
  uiScreen = helpReturnScreen === 'help' ? 'menu' : helpReturnScreen;
  document.body.dataset.screen = uiScreen;
  playSound('ui-close');
  requestAnimationFrame(() => openHelpButton.focus());
  return true;
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
  const outcome = recordFinishedRun(result);
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
  // Строки итога проявляются по одной: номер строки задаёт её задержку в CSS.
  runSummaryList.replaceChildren(...summary.rows.flatMap((row, index) => {
    const label = document.createElement('dt');
    const value = document.createElement('dd');
    label.textContent = row.label;
    value.textContent = row.value;
    value.dataset.row = row.id;
    label.style.setProperty('--row', String(index));
    value.style.setProperty('--row', String(index));
    return [label, value];
  }));
  // A run that stands above every run before it says so, right on the screen.
  if (outcome?.isRecord) {
    const label = document.createElement('dt');
    const value = document.createElement('dd');
    label.textContent = metaCopy(itemDetailLanguage).record;
    value.textContent = '★';
    value.dataset.row = 'record';
    label.style.setProperty('--row', String(summary.rows.length));
    value.style.setProperty('--row', String(summary.rows.length));
    runSummaryList.append(label, value);
  }
  runEndScreen.style.setProperty('--rows', String(summary.rows.length + (outcome?.isRecord ? 1 : 0)));
  restartRunButton.setAttribute('aria-label', summary.restart);
  restartRunLabel.textContent = itemDetailLanguage === 'en' ? 'New run' : 'Новый забег';
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  pauseGameButton.disabled = true;
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

/**
 * What just happened to you, in words.
 *
 * A consumable used to report a bare number — «12», «+2», «✓» — on a card that
 * named the bottle. So the player learned what they had drunk and never what it
 * did: Ivan drank a potion and could not tell. A number is the size of a thing,
 * not the thing.
 */
const CONSUMABLE_REPORTS = Object.freeze({
  ru: Object.freeze({
    // Метки рисуют сердце и меч со словом: «Исцеление +12 [♥] здоровья».
    healed: (amount) => `Исцеление +${amount} {heal}`,
    healedFull: 'Уже полное здоровье',
    maxHp: (amount) => `+${amount} {maxhp}`,
    cleansed: 'Состояния сняты',
    nothingToCleanse: 'Снимать было нечего',
    venom: (damage, seconds) => `Яд: −${damage} {heal} · отравление на ${Math.round(seconds)} с`,
    learned: (name) => `Изучено: ${name}`,
    /*
     * Книга обязана сказать, что в ней было.
     *
     * Иван: «я прочитал какую-то чёрную книгу, эффект неизвестен. И опять же,
     * она просто исчезла, я не понял, что случилось. Что она мне дала, что
     * произошло». Она была пустой — и говорила об этом нулём в углу экрана.
     */
    blankBook: 'Страницы пусты. Ничего в них не было.',
    skillUp: (name) => `Изучено: ${name} +1`,
    skillDown: (name) => `Забыто: ${name} −1`,
    spellKnown: (name) => `Это уже знакомо: ${name}`,
    newSpell: (name) => `новое заклинание: ${name}`,
  }),
  en: Object.freeze({
    healed: (amount) => `Healed +${amount} {heal}`,
    healedFull: 'Already at full health',
    maxHp: (amount) => `+${amount} {maxhp}`,
    cleansed: 'Conditions cleared',
    nothingToCleanse: 'Nothing to clear',
    venom: (damage, seconds) => `Venom: −${damage} {heal} · poisoned for ${Math.round(seconds)}s`,
    learned: (name) => `Learned: ${name}`,
    blankBook: 'The pages are blank. There was nothing in them.',
    skillUp: (name) => `Learned: ${name} +1`,
    skillDown: (name) => `Forgotten: ${name} −1`,
    spellKnown: (name) => `Already known: ${name}`,
    newSpell: (name) => `new spell: ${name}`,
  }),
});

function consumableReport() {
  return CONSUMABLE_REPORTS[itemDetailLanguage === 'en' ? 'en' : 'ru'];
}

/**
 * Постоянная прибавка к запасу здоровья: и предел, и сами раны сразу.
 *
 * Сюда ушло всё, что раньше молча прибавляло скрытую «силу»: Иван увидел
 * «+5» и не понял, чего. Здоровье видно на плашке — прибавка читается.
 */
function raiseHeroMaxHp(amount) {
  hero.maxHp += amount;
  hero.hp = Math.min(currentHeroStats().maxHp, hero.hp + amount);
}

/** Что случилось от зелья — для `feedbackFor`, который решит, хорошо ли это. */
const POTION_FEEDBACK_KINDS = Object.freeze({
  heal: 'heal',
  maxHp: 'buff',
  cleanse: 'restore',
  venom: 'poison',
});

function applyIdentifiablePotion(item) {
  const outcome = potionOutcome(item);
  if (!outcome) return null;
  playerHasActed = true;
  if (outcome.type === 'heal') {
    const healing = Math.min(outcome.amount, currentHeroStats().maxHp - hero.hp);
    hero.hp += healing;
    burst(hero.x, hero.y - 8, '#7fbd86', 14);
    addImpactWave(hero.x, hero.y - 8, '#7fbd86', 46, 0);
    return healing > 0 ? consumableReport().healed(healing) : consumableReport().healedFull;
  }
  if (outcome.type === 'maxHp') {
    raiseHeroMaxHp(outcome.amount);
    burst(hero.x, hero.y - 8, '#e0c778', 18);
    addImpactWave(hero.x, hero.y - 8, '#e0c778', 54, 1);
    return consumableReport().maxHp(outcome.amount);
  }
  if (outcome.type === 'cleanse') {
    const result = clearActorEffects(hero.effects);
    hero.effects = result.effects;
    burst(hero.x, hero.y - 8, '#87cad0', 16);
    addImpactWave(hero.x, hero.y - 8, '#87cad0', 52, 0);
    return result.cleared.length > 0
      ? consumableReport().cleansed
      : consumableReport().nothingToCleanse;
  }
  const result = damageHero(outcome.damage, {
    direct: true,
    impactColor: '#83aa4b',
    source: 'potion:venom',
  });
  if (!hero.dead) applyHeroStatus('poison', outcome.duration);
  return consumableReport().venom(result?.damage ?? outcome.damage, outcome.duration);
}

/**
 * Книга поднимает ранг школы, а заклинания приходят вместе с рангом.
 *
 * Раньше книга учила одному заклинанию навсегда, и школьный навык только
 * усиливал уже известное. Иван перевернул: «магия должна быть в навыках <...>
 * книга прокачивает тебе какой-то определённый навык, не тратя очко навыков».
 */
function applyBook(item) {
  const command = nextGameCommand(READ_BOOK_COMMAND, item.uid, { itemId: item.id });
  const result = readSkillBook({
    command,
    item,
    study: hero.skillStudy,
    skills: hero.skills,
    heroLevel: hero.level,
    attributes: hero.attributes,
  });
  if (!result.ok) return null;
  hero.skillStudy = createBookStudy(result.state.study);
  const adjustment = result.events.find(({ type }) => type === 'skill-rank-adjusted');
  if (!adjustment) {
    // Пустая книга: сказать словами, а не нулём в углу экрана.
    burst(hero.x, hero.y - 8, '#929b94', 10);
    return { text: consumableReport().blankBook, kind: 'info' };
  }
  const { skillId, direction } = adjustment.payload;
  const knownBefore = new Set(hero.spells.knownSpellIds);
  // Ранг школы мог открыть или закрыть заклинания — панель узнаёт об этом тут.
  syncKnownSpells();
  const newSpellNames = hero.spells.knownSpellIds
    .filter((id) => !knownBefore.has(id))
    .map((id) => spellById(id)?.name?.[itemDetailLanguage] ?? id);
  const skillName = skillById(skillId)?.name?.[itemDetailLanguage] ?? skillId;
  const color = direction > 0 ? '#d8c76c' : '#9b6d9f';
  burst(hero.x, hero.y - 8, color, 18);
  addImpactWave(hero.x, hero.y - 8, color, 54, direction > 0 ? 1 : 0);
  discoverNearbyTraps();
  // Названием навыка, а не знаком с цифрой: «−1 Мечи» читается как урон.
  if (direction <= 0) return { text: consumableReport().skillDown(skillName), kind: 'skill-down' };
  // Ранг, который открыл заклинание, говорит и о нём: это и есть награда.
  const spells = newSpellNames.map((name) => consumableReport().newSpell(name));
  return {
    text: [consumableReport().skillUp(skillName), ...spells].join(' · '),
    kind: spells.length > 0 ? 'spell' : 'skill-up',
  };
}

/** Everything the hero can see within a radius, in cells, and still alive. */
/**
 * Everything hostile the hero can see within a radius — and a boar that is
 * charging you is hostile. Wildlife used to be left out of this list entirely,
 * so a hunted beast walked through fire and frost untouched while the same hero
 * could kill it with a stick. Ivan ran from a pig and found out.
 */
function monstersAroundHero(radius) {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const hostile = [
    ...monsters.filter((monster) => monster.dead === 0 && !monster.ally),
    ...passiveCreatures.filter(({ hunted, defeated }) => hunted && !defeated),
  ];
  return hostile.filter((actor) => {
    const cell = { x: Math.floor(actor.x / TILE), y: Math.floor(actor.y / TILE) };
    if (Math.hypot(cell.x - heroCell.x, cell.y - heroCell.y) > radius) return false;
    return hasLineOfSight(world, heroCell, cell);
  });
}

/** The scroll of flame: everything around the reader, the reader excepted. */
function burnAroundHero(effect) {
  const targets = monstersAroundHero(effect.radius);
  burst(hero.x, hero.y - 8, '#ee783f', 26);
  addImpactWave(hero.x, hero.y - 8, '#ee783f', 40 + effect.radius * 26, 3);
  for (const monster of targets) {
    damageMonster(monster, effect.damage, '#ee783f', { style: 'staff' });
    if (effect.burnSeconds > 0 && monster.dead === 0) {
      monster.effects = applyActorEffect(monster.effects, 'burning', effect.burnSeconds).effects;
    }
  }
  return feedbackCopy(itemDetailLanguage).struck(targets.length);
}

/** The scroll of frost: the same circle, but it holds instead of hurting. */
function bindAroundHero(effect) {
  const targets = monstersAroundHero(effect.radius);
  const statusId = effect.freeze ? 'frozen' : 'chilled';
  burst(hero.x, hero.y - 8, '#9edfe4', 24);
  addImpactWave(hero.x, hero.y - 8, '#9edfe4', 40 + effect.radius * 26, 1);
  for (const monster of targets) {
    monster.effects = applyActorEffect(monster.effects, statusId, effect.duration).effects;
    addCombatGlyph(monster.x, monster.y, '❄', ACTOR_EFFECTS[statusId].color, -60);
  }
  return feedbackCopy(itemDetailLanguage).held(targets.length);
}

/** The scroll of insight: the floor around, or the whole floor for a scholar. */
function revealFromScroll(effect) {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const before = revealed.size;
  if (effect.whole) {
    for (let y = 0; y < world.length; y += 1) {
      for (let x = 0; x < world[y].length; x += 1) {
        if (world[y][x] !== '#') revealed.add(`${x},${y}`);
      }
    }
  } else {
    revealAround(revealed, world, heroCell, effect.radius);
  }
  discoverNearbyTraps();
  burst(hero.x, hero.y - 10, '#d8d2a8', 16);
  return formatDeltas({ map: revealed.size - before }) || feedbackCopy(itemDetailLanguage).nothingFound;
}

function useConsumable(item, index, effectOverride = null) {
  const effect = effectOverride ?? item.useEffect ?? null;
  if (item.interactionResource) {
    showLootToast(item, item.stack ?? 1);
    return;
  }
  const maxHp = currentHeroStats().maxHp;
  let feedback = 1;
  // Что случилось; хорошо это или плохо, решит `feedbackFor`.
  let feedbackKind = null;
  const identifiable = isIdentifiableItem(item);
  if (identifiable) {
    run.knowledge = identifyItem(run.knowledge, item.id, IDENTIFIABLE_LOOT_IDS);
  }
  if (item.identification?.group === 'potion') {
    feedbackKind = POTION_FEEDBACK_KINDS[potionOutcome(item)?.type] ?? null;
    feedback = applyIdentifiablePotion(item);
    if (feedback === consumableReport().healedFull) feedbackKind = 'info';
    playSound('drink');
  } else if (item.identification?.group === 'book') {
    if (heroWading()) {
      // Wet pages: the book stays in the bag until the hero is on dry floor.
      showLootToast(item, 0);
      addCombatGlyph(hero.x, hero.y, '~', '#63b8ca', -62);
      return;
    }
    const reading = applyBook(item);
    if (reading === null) {
      showLootToast(item, 0);
      return;
    }
    feedback = reading.text;
    feedbackKind = reading.kind;
    playSound('read');
  } else if (effect?.type === 'heal') {
    feedback = Math.min(effect.amount, maxHp - hero.hp);
    if (feedback === 0) {
      showLootToast(item, 0);
      return;
    }
    hero.hp += feedback;
    feedback = consumableReport().healed(feedback);
    feedbackKind = 'heal';
    playSound('drink');
  } else if (effect?.type === 'food') {
    // Еда лечит и в драке: зелье в забеге одно, и без этого лечиться в бою
    // было нечем — а еда лежала в мешке и не давалась.
    const mayEat = canEatNow();
    if (!mayEat.ok) {
      showLootToast(item, hungerCopy(itemDetailLanguage).threatened);
      return;
    }
    const hpBeforeMeal = hero.hp;
    const result = consumeFood({
      hunger: hero.hunger,
      hp: hero.hp,
      maxHp,
      nutrition: effect.nutrition,
      healing: Math.round(effect.healing * currentConditions().foodHealingScale),
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
    const meal = startMeal(effect.mealId);
    if (meal) {
      hero.meal = meal;
      renderHeroEffectsHud();
      burst(hero.x, hero.y - 12, activeMeal(meal, itemDetailLanguage).color, 16);
    }
    // Сытость в минутах и здоровье — каждое со своим значком и словом.
    feedback = formatDeltas({ food: Math.ceil(result.restored / 60), heal: result.state.hp - hpBeforeMeal });
    feedbackKind = 'food';
  } else if (effect?.type === 'unbind') {
    const slots = boundSlots(selected, itemInstances);
    if (slots.length === 0) {
      // A scroll spent on nothing is a scroll wasted, so it is not spent.
      showLootToast(item, curseCopy(itemDetailLanguage).nothingBound);
      return;
    }
    // Read plainly it frees one thing; read by a scholar, everything at once.
    const chosen = effect.whole ? slots : [slots[0]];
    const lifted = liftBindings(chosen.map((slot) => selected[slot]).filter(Boolean));
    if (lifted === 0) {
      showLootToast(item, 0);
      return;
    }
    feedback = feedbackCopy(itemDetailLanguage).curseLifted(lifted);
    feedbackKind = 'restore';
    playSound('read');
  } else if (effect?.type === 'camp') {
    const refusal = pitchCamp();
    if (refusal !== '') {
      showLootToast(item, refusal);
      return;
    }
  } else if (effect?.type === 'home-travel') {
    const refusal = useHomeStone();
    if (refusal !== '') {
      showLootToast(item, refusal);
      return;
    }
    // The stone is the deed's companion: it is spent on nothing and stays.
    showLootToast(item, feedbackCopy(itemDetailLanguage).homeStone);
    updateHud();
    persistRun();
    return;
  } else if (effect?.type === 'bandage') {
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
    feedback = consumableReport().healed(treatment.healed);
    feedbackKind = 'heal';
  } else if (effect?.type === 'coat') {
    const result = coatWeapon({
      weapon: itemInstances.get(selected.hand1) ?? null,
      profile: poisonProfile(currentSkillCapabilities()),
      coating: hero.coating,
      vials: interactionResourceCount(POISON_VIAL_ITEM_ID),
    });
    if (!result.ok) {
      showLootToast(item, poisonRefusalText(result.reason, itemDetailLanguage));
      return;
    }
    hero.coating = { ...result.coating };
    playSound('drink');
    burst(hero.x, hero.y - 10, '#86b84f', 16);
    feedback = poisonRefusalText('coated', itemDetailLanguage);
    feedbackKind = 'buff';
  } else if (effect?.type === 'cleanse-ritual') {
    const ritual = resolveCleansing({
      effects: hero.effects,
      hp: hero.hp,
      maxHp,
      profile: cleansingProfile(currentSkillCapabilities()),
    });
    if (!ritual.ok) {
      showLootToast(item, cleansingReport(ritual, itemDetailLanguage));
      return;
    }
    hero.hp = ritual.hp;
    hero.effects = ritual.effects;
    for (const id of ritual.cleared) showEffectRelief(id);
    renderHeroEffectsHud();
    playSound('spell-heal');
    burst(hero.x, hero.y - 10, '#cfe6ea', 18);
    addImpactWave(hero.x, hero.y - 8, '#cfe6ea', 58, 0);
    feedback = cleansingReport(ritual, itemDetailLanguage);
    feedbackKind = 'restore';
  } else if (effect?.type === 'flame-burst') {
    feedback = burnAroundHero(effect);
    feedbackKind = feedback === feedbackCopy(itemDetailLanguage).struck(0) ? 'info' : 'strike';
    playSound('spell-fire');
  } else if (effect?.type === 'frost-bind') {
    feedback = bindAroundHero(effect);
    feedbackKind = feedback === feedbackCopy(itemDetailLanguage).held(0) ? 'info' : 'strike';
    playSound('spell-ice');
  } else if (effect?.type === 'insight') {
    feedback = revealFromScroll(effect);
    playSound('read');
  } else if (effect?.type === 'maxHp') {
    raiseHeroMaxHp(effect.amount);
    feedback = consumableReport().maxHp(effect.amount);
    feedbackKind = 'buff';
  } else {
    throw new Error(`Unsupported consumable effect: ${item.id}`);
  }
  playerHasActed = true;
  consumeBackpackItem(item, index);
  showLootToast(item, feedback, feedbackKind);
  updateHud();
  updateGearUi();
  selectedPackIndex = Math.max(0, Math.min(index, backpackItems.length - 1));
  renderPack();
  if (hero.dead) closeInventory();
  else focusSelectedInventoryRow();
  persistRun();
}

function performSelectedItemAction({ fromDetail = false, secondary = false, requestedSlot = null } = {}) {
  const selection = selectedUiItem();
  if (!selection) return false;
  // The card's second button: an arcanist's other reading.
  const second = secondary ? secondaryItemAction(selection) : null;
  if (secondary && !second?.enabled) return false;
  const variantEffect = secondary ? variantForItem(selection.item)?.effect ?? null : null;
  if (secondary && !variantEffect) return false;
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
    showLootToast(selection.item, feedbackCopy(itemDetailLanguage).identified, 'reveal');
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
      return beginBlinkTargeting(selection.item.uid, variantEffect);
    }
    if (selection.item.useEffect?.type === 'target-effect') {
      return beginTargetEffectItemTargeting(selection.item.uid);
    }
    useConsumable(selection.item, selection.index, variantEffect);
    return true;
  }

  const result = equipInventoryItem(currentItemState(), selection.item.uid, requestedSlot);
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

function addCombatGlyph(x, y, text, color, offsetY = -48, from = null) {
  const drift = from ? combatGlyphDrift({ x, y, sourceX: from.x, sourceY: from.y }) : { dx: 0, dy: 0 };
  combatGlyphs.push({
    x, y, text: String(text), color, offsetY, drift, life: 0.62, maxLife: 0.62,
  });
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
    { style: 'spear', sourceX: hero.x, sourceY: hero.y, weaponMagic: currentHeroMagic() },
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
  showLootToast({ icon: ACTOR_EFFECTS[id].icon, rarity: 1 }, feedbackCopy(itemDetailLanguage).wardHeld, 'restore');
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
  { style = 'blade', projectile = false, sourceX = hero.x, sourceY = hero.y, weaponMagic = null } = {},
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
  /*
   * Охота звучала как немое кино.
   *
   * Удар по монстру давно играет сталью, стрелой или тяжестью, а тот же удар
   * по зверю проходил молча: здесь были и вспышка, и волна, и число урона, и
   * кровь — всё, кроме звука. Иван: «когда я охотился, звука не было, атаки,
   * урона, там нету звуков». Строка та же, что у монстров, — и звук должен
   * быть тот же: бьют одним и тем же оружием.
   */
  playSound(projectile ? 'hit-projectile' : style === 'heavy' ? 'hit-heavy' : 'hit-blade');
  if (lethal) playSound('kill');
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
  if (weaponMagic?.vampirism && dealt > 0) {
    const recovery = resolveVampiricRecovery({
      hp: hero.hp,
      maxHp: currentHeroStats().maxHp,
      damage: dealt,
      magic: { vampirism: true },
      budget: vampiricPool,
    });
    hero.hp = recovery.hp;
    vampiricPool = recovery.budget;
    if (recovery.healed > 0) addCombatGlyph(hero.x, hero.y, `+${recovery.healed}{heal}`, '#d97873');
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

/**
 * The venom on the blade. One strike spends one charge, and the hero is told
 * when the edge runs clean again.
 */
function applyWeaponCoating(monster) {
  if (!hero.coating || !monster || monster.dead > 0) return;
  const spent = spendCoating(hero.coating);
  if (!spent.applied) return;
  hero.coating = spent.coating;
  monster.effects = applyActorEffect(monster.effects, 'poison', spent.seconds).effects;
  addCombatGlyph(monster.x, monster.y, '☠', ACTOR_EFFECTS.poison.color, -62);
  if (!hero.coating) {
    showLootToast(
      { path: lootById(POISON_VIAL_ITEM_ID)?.icon ?? 'derived/icon/potion-poison.png', rarity: 1 },
      poisonRefusalText('spent', itemDetailLanguage),
    );
  }
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
    weaponMagic = null,
    blunt = null,
  } = {},
) {
  if (monster?.actorKind === 'wildlife') {
    damageWildlife(monster, damage, color, { style, projectile, sourceX, sourceY, weaponMagic });
    return;
  }
  if (hero.dead || hero.hp <= 0 || runStatus !== 'playing') return;
  if (!monster || monster.dead > 0) return;
  if (monster.neutral && !monster.provoked) {
    // Кладбищенский призрак не дерётся даже за себя: ударить его можно, но
    // отвечать он не станет — он уже своё отходил.
    if (monster.graveyardGhost) monster.provoked = false;
    else if (monster.ghost) wakeFloorGhost();
    else provokeCityWatch(monster);
  }
  const profile = combatImpactProfile(style, { projectile, boss: monster.boss });
  // Broken armour amplifies every later source, not just the mace that made it.
  const amplified = Math.max(1, Math.round(damage * armorBreakMultiplier(monster.armorBreak)));
  damage = executionDamage(monster, amplified, weaponMagic);
  const dealt = Math.min(monster.hp, damage);
  monster.hit = 0.19;
  playSound(projectile ? 'hit-projectile' : style === 'heavy' ? 'hit-heavy' : 'hit-blade');
  monster.hp -= damage;
  const lethal = monster.hp <= 0;
  burst(monster.x, monster.y - 8, color, profile.particles);
  addImpactWave(monster.x, monster.y - 8, color, profile.waveSize, profile.shake);
  addCombatGlyph(monster.x, monster.y, dealt, color, -48, { x: sourceX, y: sourceY });
  addBloodImpact(monster, sourceX, sourceY, lethal);
  if (weaponMagic?.vampirism) {
    const recovery = resolveVampiricRecovery({
      hp: hero.hp,
      maxHp: currentHeroStats().maxHp,
      damage: dealt,
      magic: { vampirism: true },
      budget: vampiricPool,
    });
    hero.hp = recovery.hp;
    vampiricPool = recovery.budget;
    if (recovery.healed > 0) {
      burst(hero.x, hero.y - 12, '#b94d55', 6);
      addCombatGlyph(hero.x, hero.y, `+${recovery.healed}{heal}`, '#d97873');
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
  if (monster.hp > 0) applyWeaponPowers(monster, { dealt, weaponMagic, sourceX, sourceY });
  // A mirrored creature answers a melee blow with part of it. Only melee: a
  // reflection that reached across the room would make archery the only answer.
  if (monster.reflect && dealt > 0 && !projectile && weaponMagic) {
    damageHero(Math.max(1, Math.round((dealt * monster.reflect) / 100)), {
      direct: true,
      impactColor: '#cfd6dc',
      source: `${monster.id}@mirrored`,
      from: monster,
    });
  }
  if (monster.hp <= 0) defeatMonster(monster);
  else if (monster.boss) updateBossHud();
}

/**
 * What an artefact weapon does on top of the damage.
 *
 * Every one of these reaches a rule the game already owned and only the dungeon
 * could use: the water carries a shock, marksmanship picks the target behind
 * the target, the mace strips armour, monsters set you on fire. A weapon power
 * hands one of those to the hero.
 *
 * The follow-up hits carry `weaponMagic: null` on purpose — a chain that
 * re-triggers its own powers is a chain that never stops.
 */
function applyWeaponPowers(monster, { dealt, weaponMagic, sourceX, sourceY }) {
  if (!weaponMagic || dealt <= 0 || monster.dead > 0 || runStatus !== 'playing') return;
  for (const brand of weaponMagic.brands ?? []) {
    const applied = applyWardedEffect(monster.effects, brand, BRAND_SECONDS, { immunity: [] });
    monster.effects = applied.effects;
    addCombatGlyph(monster.x, monster.y, '✶', ACTOR_EFFECTS[brand]?.color ?? '#e0c778', -60);
  }
  if (weaponMagic.sundering) {
    monster.armorBreak = refreshArmorBreak(monster.armorBreak, {
      armorBreakPercent: SUNDER_PERCENT,
      armorBreakSeconds: SUNDER_SECONDS,
    });
    addCombatGlyph(monster.x, monster.y, '◱', '#d0b45e', -54);
  }
  if (weaponMagic.piercing) {
    const behind = selectPiercedTargets({
      origin: { x: sourceX, y: sourceY },
      target: monster,
      candidates: monsters,
      pierceTargets: 1,
      tolerance: TILE * 0.6,
      range: TILE * 2.2,
    });
    for (const victim of behind) {
      damageMonster(victim, Math.max(1, Math.round(dealt * 0.6)), '#e6d8b4', {
        style: 'blade',
        sourceX: monster.x,
        sourceY: monster.y,
        weaponMagic: null,
      });
    }
  }
  if (weaponMagic.conductor && isWaterCell(world, Math.floor(monster.x / TILE), Math.floor(monster.y / TILE))) {
    const conducted = selectWaterConductionTargets({
      grid: world,
      origin: monster,
      actors: [...monsters, hero],
      tileSize: TILE,
      exclude: [monster],
    });
    const share = Math.max(1, Math.round((dealt * WATER_CONDUCTION_PERCENT) / 100));
    for (const victim of conducted) {
      addLightningArc(monster, victim);
      // Standing in the water you strike is the mistake, and the weapon does
      // not make an exception for the hand that holds it.
      if (victim === hero) {
        damageHero(share, { direct: true, source: 'artifact:conductor' });
        addCombatGlyph(hero.x, hero.y, '⌁', '#bdf7ff', -70);
      } else {
        damageMonster(victim, share, '#8fdff2', {
          style: 'staff',
          sourceX: monster.x,
          sourceY: monster.y,
          weaponMagic: null,
        });
      }
      burst(victim.x, victim.y - 8, '#bdf7ff', 12);
    }
  }
}

/** The headsman's rule: anything already this close to dead is dead. */
function executionDamage(monster, damage, weaponMagic) {
  if (!weaponMagic?.execute || !monster?.maxHp || monster.dead > 0) return damage;
  if (monster.boss) return damage;
  const remaining = monster.hp - damage;
  if (remaining <= 0 || remaining > monster.maxHp * weaponMagic.execute) return damage;
  addCombatGlyph(monster.x, monster.y, '⚔', '#e8dcc0', -74);
  return monster.hp;
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
  if (result.poisonSeconds > 0 && monster.dead === 0) {
    monster.effects = applyActorEffect(monster.effects, 'poison', result.poisonSeconds).effects;
    addCombatGlyph(monster.x, monster.y, '☠', ACTOR_EFFECTS.poison.color, -58);
  }
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

/**
 * Spiked plate and clawed gloves answer for themselves. A blow that the shield
 * ate never reached the spikes, so a blocked hit gets nothing back.
 */
function returnThorns(attacker, hit) {
  if (!attacker || !hit || hit.blocked || hit.damage <= 0) return;
  // Two sources, one rule: the spikes on the plate answer in a flat number, a
  // thorn-set artefact answers in a share of the blow, and the attacker feels
  // the sum rather than being hit twice.
  const artefact = Math.round((hit.damage * currentHeroMagic().thorns) / 100);
  const damage = thornsDamage(currentArmourProfile(), hit.damage) + artefact;
  if (damage <= 0) return;
  damageMonster(attacker, damage, '#c9b98a', {
    style: 'blade',
    sourceX: hero.x,
    sourceY: hero.y,
    weaponMagic: null,
  });
  addCombatGlyph(attacker.x, attacker.y, '\u2736', '#c9b98a', -54);
}

/** Kindle: whatever strikes the hero in melee walks away burning. */
function kindleAttacker(attacker, hit) {
  if (!attacker || !hit || hit.blocked || hit.damage <= 0) return;
  if (!currentHeroMagic().kindled || attacker.dead > 0) return;
  attacker.effects = applyActorEffect(attacker.effects, 'burning', KINDLE_BURN_SECONDS).effects;
  addCombatGlyph(attacker.x, attacker.y, '\u2668', '#ef8a45', -48);
}

let whipRefusalAt = -Infinity;

/**
 * The lash landed; now the target comes a cell closer. The pure rule decides
 * whether and where; this only asks the world whether that cell is empty and
 * slides the body there.
 */
function yankWithWhip(monster, weapon) {
  if (!weapon || monster.dead > 0 || monster.defeated) return;
  const occupied = heroBlockingCells();
  const pull = whipPull({
    weapon,
    attacker: { x: hero.x / TILE, y: hero.y / TILE },
    target: { x: monster.x / TILE, y: monster.y / TILE, boss: monster.boss === true },
    isFree: (x, y) => isWalkable(x, y)
      && !occupied.has(`${x},${y}`)
      && !(Math.floor(hero.x / TILE) === x && Math.floor(hero.y / TILE) === y),
    profile: currentWhipProfile(),
  });
  if (pull.reason === 'too-heavy') {
    // Said once, not on every swing: a boss is hit many times a fight.
    if (elapsed - whipRefusalAt > 6) {
      whipRefusalAt = elapsed;
      addCombatGlyph(monster.x, monster.y, whipCopy('too-heavy', itemDetailLanguage), '#9aa4ad', -62);
    }
    return;
  }
  if (!pull.ok) return;
  monster.x = (pull.cell.x + 0.5) * TILE;
  monster.y = (pull.cell.y + 0.5) * TILE;
  monster.route = [];
  monster.repathCooldown = Math.max(monster.repathCooldown ?? 0, 0.25);
  if (pull.interrupt && monster.attackWindup > 0) {
    // Pulled off its feet mid-swing: the blow it had raised never lands.
    monster.attackWindup = 0;
    monster.attackRecovery = Math.max(monster.attackRecovery ?? 0, 0.35);
    addCombatGlyph(monster.x, monster.y, '!', '#e0c778', -72);
  }
  addCombatGlyph(monster.x, monster.y, '\u21d0', '#e0c778', -60);
  burst(monster.x, monster.y - 8, '#e0c778', 10);
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
    staggerSeconds: shot?.staggerSeconds ?? 0,
    channelSeconds: shot?.channelSeconds ?? 0,
    originX: hero.x,
    originY: hero.y,
    weaponMagic: currentHeroMagic(),
  });
}

function spellTargetCandidates(spell) {
  if (!spell || !TARGETED_SPELL_KINDS.includes(spell.kind)) return [];
  const candidates = [];
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  for (const target of [
    ...monsters,
    ...passiveCreatures.filter(({ hunted, defeated }) => hunted && !defeated),
  ]) {
    // A beast already fighting the hero is a target like any other. Excluding
    // wildlife here meant the aimed spells could not be pointed at the animal
    // currently biting you.
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
  const target = TARGETED_SPELL_KINDS.includes(spell?.kind)
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
  if (TARGETED_SPELL_KINDS.includes(usedSpell.kind) && usedSpell.targetMode === 'actor' && !explicitTarget) {
    return beginSpellTargeting(slotIndex, usedSpell, targets);
  }
  if (usedSpell.kind === 'sustained') {
    // Nobody switches their own flight off over a hole. The refusal is the
    // kind a game owes the player: the mistake is impossible, not punished.
    if (
      usedSpell.id === 'flight'
      && currentHeroMagic().flight
      && world[Math.floor(hero.y / TILE)]?.[Math.floor(hero.x / TILE)] === CHASM_CELL
    ) {
      addCombatGlyph(hero.x, hero.y, chasmCopy(itemDetailLanguage).overChasm, '#9fc6c4', -62);
      return false;
    }
    const toggled = toggleSustainedSpell(hero.spells, usedSpell.id, stats.intelligence);
    if (!toggled.ok) {
      rejectSpellUse(slotIndex, toggled.reason);
      return false;
    }
    hero.spells = toggled.state;
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
    if (usedSpell.id === 'invisibility' && toggled.active) hero.invisibilityReveal = 0;
    playSound('spell-toggle');
    burst(hero.x, hero.y - 10, usedSpell.color, toggled.active ? 18 : 8);
    addImpactWave(hero.x, hero.y - 8, usedSpell.color, toggled.active ? 58 : 34, 0);
    addCombatGlyph(hero.x, hero.y, toggled.active ? '◆' : '◇', usedSpell.color, -62);
  } else if (usedSpell.kind === 'minion') {
    // The slot already keeps the servant standing; pressing it calls them back
    // to the hero, which is the only order a raised thing needs.
    const standing = allies.find((ally) => ally.spellId === usedSpell.id && ally.dead === 0);
    if (!standing) {
      if (!raiseAlly(usedSpell.id)) {
        rejectSpellUse(slotIndex, 'no-room');
        return false;
      }
    } else {
      const cell = freeCellNearHero();
      if (cell) {
        standing.x = (cell.x + 0.5) * TILE;
        standing.y = (cell.y + 0.5) * TILE;
        standing.route = [];
        burst(standing.x, standing.y - 8, usedSpell.color, 12);
      }
      const copy = minionCopy(usedSpell.id, itemDetailLanguage);
      if (copy) showLootToast({ icon: usedSpell.icon, rarity: 2 }, copy.called, 'ally');
    }
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
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
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
    burst(hero.x, hero.y - 12, usedSpell.color, 24);
    addImpactWave(hero.x, hero.y - 8, usedSpell.color, 70, 1);
  } else if (usedSpell.kind === 'burst') {
    // A burst has no flight: everything the hero can see within its radius is
    // hit at once, so a wall between them is the only shelter there is.
    const targets = monstersAroundHero(usedSpell.range);
    if (targets.length === 0) {
      rejectSpellUse(slotIndex, 'no-target');
      return false;
    }
    hero.path = [];
    hero.attack = Math.max(hero.attack, 0.3);
    hero.attackDuration = 0.3;
    hero.attackStyle = 'staff';
    hero.attackCooldown = Math.max(hero.attackCooldown, 0.36);
    const damage = spellDamage(usedSpell.id, stats.intelligence, spellSchoolRank(usedSpell.schoolId));
    const status = spellStatus(usedSpell.id, stats.intelligence);
    playSound(usedSpell.schoolId === 'cryomancy' ? 'spell-ice' : 'spell-fire');
    burst(hero.x, hero.y - 8, usedSpell.color, 30);
    addImpactWave(hero.x, hero.y - 8, usedSpell.color, 44 + usedSpell.range * 28, 4);
    for (const monster of targets) {
      // Water conducts, and the storm lives on that: a wet target takes the
      // blow twice. It is the one thing storm magic has that fire does not.
      const conducted = usedSpell.schoolId === 'storm-magic'
        && (monster.effects?.wet > 0 || isWaterCell(world, Math.floor(monster.x / TILE), Math.floor(monster.y / TILE)));
      damageMonster(monster, conducted ? damage * 2 : damage, usedSpell.color, { style: 'staff' });
      const alive = monster.actorKind === 'wildlife' ? !monster.defeated : monster.dead === 0;
      if (status && alive) {
        monster.effects = applyActorEffect(monster.effects, status.id, status.duration).effects;
      }
    }
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
  } else if (usedSpell.kind === 'unbind') {
    const slots = boundSlots(selected, itemInstances);
    if (slots.length === 0) {
      rejectSpellUse(slotIndex, 'unbind-refused', curseCopy(itemDetailLanguage).nothingBound);
      return false;
    }
    if (liftBindings(slots.map((slot) => selected[slot]).filter(Boolean)) === 0) return false;
    hero.path = [];
    hero.attack = Math.max(hero.attack, 0.28);
    hero.attackDuration = 0.28;
    hero.attackStyle = 'staff';
    hero.attackCooldown = Math.max(hero.attackCooldown, 0.32);
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
  } else if (usedSpell.kind === 'purge') {
    const ritual = resolveCleansing({
      effects: hero.effects,
      hp: hero.hp,
      maxHp: stats.maxHp,
      profile: cleansingProfile(currentSkillCapabilities()),
    });
    if (!ritual.ok) {
      rejectSpellUse(slotIndex, 'purge-refused', cleansingReport(ritual, itemDetailLanguage));
      return false;
    }
    hero.path = [];
    hero.attack = Math.max(hero.attack, 0.28);
    hero.attackDuration = 0.28;
    hero.attackStyle = 'staff';
    hero.attackCooldown = Math.max(hero.attackCooldown, 0.32);
    // The light mends as well as it cleans, on top of what the ritual restored.
    const mended = Math.min(
      spellHealing(usedSpell.id, stats.intelligence, currentSkillCapabilities().cleansingRank ?? 0),
      stats.maxHp - ritual.hp,
    );
    hero.hp = ritual.hp + Math.max(0, mended);
    hero.effects = ritual.effects;
    for (const id of ritual.cleared) showEffectRelief(id);
    renderHeroEffectsHud();
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
    playSound('spell-heal');
    burst(hero.x, hero.y - 12, usedSpell.color, 22);
    addImpactWave(hero.x, hero.y - 8, usedSpell.color, 66, 1);
    addCombatGlyph(hero.x, hero.y, cleansingReport(ritual, itemDetailLanguage), usedSpell.color, -62);
  } else if (usedSpell.kind === 'shove') {
    // Not damage: distance. The bruise is what the wall does, not the spell.
    hero.path = [];
    hero.attack = Math.max(hero.attack, 0.3);
    hero.attackDuration = 0.3;
    hero.attackStyle = 'staff';
    hero.attackCooldown = Math.max(hero.attackCooldown, 0.34);
    const pushed = shoveActorFromHero(target);
    damageMonster(
      target,
      spellDamage(usedSpell.id, stats.intelligence, spellSchoolRank(usedSpell.schoolId)) * (pushed ? 1 : 2),
      usedSpell.color,
      { style: 'staff' },
    );
    playSound('spell-toggle');
    burst(target.x, target.y - 8, usedSpell.color, 16);
    addCombatGlyph(target.x, target.y, pushed ? '\u21e2' : '\u2716', usedSpell.color, -58);
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
  } else if (usedSpell.kind === 'cauterise') {
    const burned = ['chilled', 'frozen', 'poison', 'wet'].filter((id) => (hero.effects[id] ?? 0) > 0);
    if (burned.length === 0) {
      rejectSpellUse(slotIndex, 'purge-refused', spellRefusalCopy(itemDetailLanguage).nothingToBurn);
      return false;
    }
    const cost = spellSelfCost(usedSpell.id, spellSchoolRank(usedSpell.schoolId));
    if (hero.hp <= cost) {
      rejectSpellUse(slotIndex, 'purge-refused', spellRefusalCopy(itemDetailLanguage).tooWeak);
      return false;
    }
    hero.path = [];
    hero.attack = Math.max(hero.attack, 0.28);
    hero.attackDuration = 0.28;
    hero.attackStyle = 'staff';
    hero.attackCooldown = Math.max(hero.attackCooldown, 0.32);
    hero.effects = clearActorEffects(hero.effects, burned).effects;
    for (const id of burned) showEffectRelief(id);
    hero.hp = Math.max(1, hero.hp - cost);
    renderHeroEffectsHud();
    playSound('spell-fire');
    burst(hero.x, hero.y - 12, usedSpell.color, 24);
    addCombatGlyph(hero.x, hero.y, `\u2212${cost}{heal}`, usedSpell.color, -62);
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
  } else if (usedSpell.kind === 'share-life') {
    const wounded = allies.filter((ally) => ally.dead === 0 && ally.hp < ally.maxHp);
    if (wounded.length === 0) {
      rejectSpellUse(slotIndex, 'purge-refused', spellRefusalCopy(itemDetailLanguage).nobodyToMend);
      return false;
    }
    const cost = spellSelfCost(usedSpell.id, spellSchoolRank(usedSpell.schoolId));
    if (hero.hp <= cost) {
      rejectSpellUse(slotIndex, 'purge-refused', spellRefusalCopy(itemDetailLanguage).tooWeak);
      return false;
    }
    hero.path = [];
    hero.attack = Math.max(hero.attack, 0.28);
    hero.attackDuration = 0.28;
    hero.attackStyle = 'staff';
    hero.attackCooldown = Math.max(hero.attackCooldown, 0.32);
    // What the hero pays is fixed; what the servants receive is divided, so
    // one wounded skeleton is mended far better than four are.
    const moved = shareLifeAmount(usedSpell.id, stats.intelligence, spellSchoolRank(usedSpell.schoolId));
    const share = Math.max(1, Math.round(moved / wounded.length));
    hero.hp = Math.max(1, hero.hp - cost);
    for (const ally of wounded) {
      ally.hp = Math.min(ally.maxHp, ally.hp + share);
      burst(ally.x, ally.y - 8, usedSpell.color, 12);
      addCombatGlyph(ally.x, ally.y, `+${share}{heal}`, usedSpell.color, -54);
    }
    playSound('spell-heal');
    addCombatGlyph(hero.x, hero.y, `\u2212${cost}{heal}`, usedSpell.color, -62);
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
  } else if (usedSpell.kind === 'cleanse-ally') {
    const touched = allies.filter((ally) => ally.dead === 0);
    if (touched.length === 0) {
      rejectSpellUse(slotIndex, 'purge-refused', spellRefusalCopy(itemDetailLanguage).nobodyToMend);
      return false;
    }
    hero.path = [];
    hero.attack = Math.max(hero.attack, 0.28);
    hero.attackDuration = 0.28;
    hero.attackStyle = 'staff';
    hero.attackCooldown = Math.max(hero.attackCooldown, 0.32);
    const mended = spellHealing(usedSpell.id, stats.intelligence, spellSchoolRank(usedSpell.schoolId));
    for (const ally of touched) {
      ally.effects = clearActorEffects(ally.effects).effects;
      ally.hp = Math.min(ally.maxHp, ally.hp + mended);
      burst(ally.x, ally.y - 8, usedSpell.color, 14);
      addCombatGlyph(ally.x, ally.y, `+${mended}{heal}`, usedSpell.color, -54);
    }
    playSound('spell-heal');
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
  } else if (usedSpell.kind === 'unlock') {
    const locked = nearbyFind();
    // Заперт теперь всякий сундук, так что заклинанию годится любой.
    if (!locked || locked.id !== 'sealed-cache' || locked.containerOpened === true) {
      rejectSpellUse(slotIndex, 'purge-refused', spellRefusalCopy(itemDetailLanguage).nothingLocked);
      return false;
    }
    if (!interactNearbyFind(locked, 'master-key', { magicKey: true })) return false;
    playSound('spell-toggle');
    burst(locked.x, locked.y - 10, usedSpell.color, 20);
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
  } else if (usedSpell.kind === 'teleport') {
    const landing = randomTeleportCell();
    if (!landing) {
      rejectSpellUse(slotIndex, 'purge-refused', spellRefusalCopy(itemDetailLanguage).nowhereToGo);
      return false;
    }
    burst(hero.x, hero.y - 10, usedSpell.color, 26);
    addImpactWave(hero.x, hero.y - 8, usedSpell.color, 62, 1);
    hero.x = (landing.x + 0.5) * TILE;
    hero.y = (landing.y + 0.5) * TILE;
    hero.path = [];
    hero.route = [];
    camera.x = hero.x;
    camera.y = hero.y;
    revealAround(revealed, world, landing, CITY_DEPTHS.includes(dungeon.depth) ? CITY_REVEAL_RADIUS : 4);
    burst(hero.x, hero.y - 10, usedSpell.color, 26);
    playSound('spell-toggle');
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
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
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
    playSound('spell-heal');
    burst(hero.x, hero.y - 12, usedSpell.color, 22);
    addImpactWave(hero.x, hero.y - 8, usedSpell.color, 66, 1);
    addCombatGlyph(hero.x, hero.y, `+${amount}{heal}`, usedSpell.color, -62);
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
          : usedSpell.schoolId === 'arcana'
            ? skillCapabilities.arcanaRank ?? 0
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
      weaponMagic: null,
      spellId: usedSpell.id,
      spread: pyromancySpreadProfile(skillCapabilities.pyromancyRank ?? 0),
      cryomancyRank: skillCapabilities.cryomancyRank ?? 0,
      stormMagicRank: skillCapabilities.stormMagicRank ?? 0,
      status: spellStatus(usedSpell.id, stats.intelligence),
    });
    spellCooldowns[usedSpell.id] = heroSpellCooldown(usedSpell);
    spendHunger('spell');
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
    const ranged = resolveRangedShot({
      weapon: pending.weapon,
      shot: resolveMarksmanShot({ profile: pending.marksman, steadySeconds: heroSteadySeconds }),
    });
    // A staff answers to its own skill, not to Marksmanship: the bolt carries
    // the channel it will hand back, and from rank III it passes through a body.
    const staff = pending.staff ?? null;
    const shot = staff && staff.rank > 0
      ? { ...ranged, pierceTargets: Math.max(ranged.pierceTargets, staff.pierceTargets), channelSeconds: staff.channelSeconds }
      : ranged;
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
    weaponMagic: pending.weaponMagic,
    blunt: pending.blunt,
  });
  // The pure runtime tests swing with only part of the adapter mounted, so both
  // of these answer for themselves rather than assuming their module is here.
  if (typeof applyWeaponCoating === 'function') applyWeaponCoating(monster);
  if (typeof yankWithWhip === 'function') yankWithWhip(monster, pending.weapon);
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
      weaponMagic: pending.weaponMagic,
    });
    if (secondarySwordResult?.empowered) showSwordRhythmImpact(monster, secondarySwordResult);
  }
  const cleaveDamage = axeCleaveDamage(pending.damage, pending.cleave);
  for (const target of cleaveTargets) {
    damageMonster(target, cleaveDamage, pending.color, {
      style: pending.combat.style,
      sourceX: hero.x,
      sourceY: hero.y,
      weaponMagic: pending.weaponMagic,
    });
  }
}

/**
 * Свободный номер для вещи, которая ложится в рюкзак.
 *
 * Номер вещи на полу — это `loot-<этаж>-<по счёту>`, и дорога в нём не
 * участвует: четвёртый этаж спуска и четвёртый этаж поверхности раздают одни
 * и те же номера. Подобрал шлем на спуске, поднялся воротами наверх, нашёл
 * там шлем под тем же номером — и второй не берётся.
 *
 * Иван: «нашёл шлем какой-то наверху, на поверхности. Не могу его взять,
 * рюкзак полон пишет. Хотя у меня два из тридцати». Рюкзак был ни при чём:
 * отказ приходил от занятого номера, а сказать об этом было некому.
 */
function freeItemUid(uid) {
  if (!itemInstances.has(uid)) return uid;
  for (let n = 2; n < 999; n += 1) {
    const candidate = `${uid}#${n}`;
    if (!itemInstances.has(candidate)) return candidate;
  }
  return `${uid}#${Math.floor(Math.random() * 1e6)}`;
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
  // Сколько влезет, спрашивают у самого рюкзака. Здесь когда-то стояла
  // двенадцать: купленное и подаренное входило, поднятое с пола — нет, и тот
  // же рюкзак отвечал по-разному, смотря откуда пришла вещь.
  if (backpackItems.filter(Boolean).length >= currentBackpackCapacity() || itemInstances.has(uid)) {
    return false;
  }
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
  const goldReward = Math.round(
    goldRewardForMonster(monster) * currentConditions().goldScale * (1 + currentHeroMagic().greed),
  );
  gold += goldReward;
  for (let level = 0; level < progression.levelsGained; level += 1) {
    burst(hero.x, hero.y - 10, '#d4c27e', 18);
  }
  showLevelUpCelebration(progression);
  if (goldReward > 0) {
    showLootToast({ icon: GOLD_ICON_PATH, rarity: Math.min(3, monster.tier >> 1) }, formatDeltas({ gold: goldReward }));
  }
  updateHud();
}

/**
 * The first time a guardian goes down, and only the first time. What it pays
 * goes to the stash like any other gold; what it really does is tick one of six
 * names off a list, so the next run knows which road it has not taken.
 */
function claimGuardianTrophy(monster) {
  const result = claimTrophy(metaState.trophies, monster.id);
  if (!result.ok) return;
  metaState = { ...metaState, trophies: result.taken };
  persistMetaState();
  stashState = stashDeposit(stashState, result.bounty);
  persistStash();
  renderRecords();
  showLootToast(
    { icon: GOLD_ICON_PATH, rarity: 3 },
    trophyCopy(itemDetailLanguage).claimed(result.bounty),
  );
}

const REVIVE_COPY = Object.freeze({
  ru: 'Наташа поднимается и облизывает лапу. Это была не последняя жизнь.',
  en: 'Natasha gets up and licks a paw. That was not the last life.',
});

/**
 * Удар, который должен был закончить драку.
 *
 * Полоса дошла до нуля, и вместо смерти кошка встаёт целой. Один раз за
 * встречу: `revived` живёт на существе, а не в сохранении, — перезагрузка
 * возвращает её живой в любом случае, и отнимать этим нечего.
 */
function reviveNamed(monster) {
  if (monster.id !== REVIVING_MONSTER_ID || monster.revived) return false;
  monster.revived = true;
  monster.hp = monster.maxHp;
  monster.alerted = monster.pursuit;
  monster.alertFlash = 0.6;
  burst(monster.x, monster.y - 8, '#d8d0a8', 18);
  addCombatGlyph(monster.x, monster.y, '↑', '#d8d0a8', -64);
  playSound('spell-heal');
  showLootToast(
    { path: monster.spritePath, rarity: 1 },
    REVIVE_COPY[itemDetailLanguage === 'en' ? 'en' : 'ru'],
    'ally',
  );
  return true;
}

/**
 * Что осталось лежать после боя.
 *
 * Падает в клетку убитого, а не в рюкзак: вещь видно на полу, и подобрать её
 * — отдельное решение. Записывается в этаж сразу, поэтому переживает и
 * перезагрузку, и спуск с возвратом; жребий выводится из сида, поэтому
 * перезагрузкой его не переиграть.
 */
function dropLootFromMonster(monster) {
  const выпало = dropForMonster({
    monsterId: monster.id,
    instanceId: monster.instanceId,
    seed: run.seed,
    depth: dungeon.depth,
  });
  if (!выпало) return;
  const запись = {
    instanceId: `drop-${monster.instanceId}`,
    id: выпало.id,
    x: Math.floor(monster.x / TILE),
    y: Math.floor(monster.y / TILE),
    affixIds: [],
    artifactPowerId: выпало.powerId ?? null,
    artifactCurseId: null,
  };
  if (run.floor.drops.some(({ instanceId }) => instanceId === запись.instanceId)) return;
  run.floor.drops = [...run.floor.drops, запись];
  const [entry] = createLootDefinitions({ loot: [запись] });
  if (!entry) return;
  lootDefinitions = [...lootDefinitions, { ...entry, drop: true }];
  const вещь = presentedItem(entry.definition);
  burst(entry.x, entry.y - 8, rarityGlow[вещь.rarity] ?? rarityGlow[1], 10 + вещь.rarity * 4);
  addImpactWave(entry.x, entry.y - 8, rarityGlow[вещь.rarity] ?? rarityGlow[1], 30 + вещь.rarity * 8, 0);
  updateInteractionUi();
}

function defeatMonster(monster) {
  if (hero.dead || hero.hp <= 0 || runStatus !== 'playing') return;
  if (monster.dead > 0 || run.floor.defeated.includes(monster.instanceId)) return;
  if (reviveNamed(monster)) return;
  monster.dead = 0.01;
  // The ghost is not one of the floor's monsters, and `floor.defeated` may only
  // ever hold ids the floor itself generated.
  if (monster.ghost) claimFloorBones();
  else run.floor.defeated.push(monster.instanceId);
  run.stats.kills += 1;
  recoverStolenItem(monster);
  dropLootFromMonster(monster);
  claimNamedPrize(monster);
  // И сразу же выдать — или, если рюкзак полон, с первым освободившимся местом.
  claimPendingPrize();
  if (monster.neutral && !monster.ghost) noteCrime('killed-guard');
  playSound('kill');
  if (monster.burst) burstEffectAround(monster);
  gainExperience(monster);
  if (monster.vaultRewardGold > 0) {
    gold += monster.vaultRewardGold;
    showLootToast({ path: monster.spritePath, rarity: 3 }, formatDeltas({ gold: monster.vaultRewardGold }));
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
    addCombatGlyph(hero.x, hero.y, `+${recovery.healed}{heal}`, '#8bc59c');
    showLootToast({ icon: 'derived/icon/ring-regeneration.png', rarity: 2 }, formatDeltas({ heal: recovery.healed }));
    updateHud();
  }
  if (monster.instanceId === dungeon.objective?.bossInstanceId) {
    const finalGuardian = roadEndingAt(dungeon.depth) !== null;
    showLootToast(
      { path: finalGuardian ? roadPrize().path : exitVisual().path, rarity: 3 },
      `${feedbackCopy(itemDetailLanguage).guardianDown} · ${finalGuardian ? '◆' : romanDepth(dungeon.depth)}`,
      'victory',
    );
    burst(monster.x, monster.y - 8, finalGuardian ? '#d83e82' : '#d4b653', 28);
    updateBossHud();
    claimGuardianTrophy(monster);
    run.guardians = rememberGuardian(run.guardians, run.branch, dungeon.depth);
  }
  persistRun();
}

/**
 * Second wind: once a floor, a killing blow leaves one point of health.
 *
 * Once a FLOOR, not once a fight — the floor has to be left and a new one
 * entered for it to come back, so it buys a single mistake and never a habit.
 * The spend is remembered on the floor state, which means it survives a reload
 * and cannot be farmed by going back up the stairs and down again.
 */
function surviveOnSecondWind(result) {
  if (!result.dead || !currentHeroMagic().secondWind) return result;
  if (run.floor.secondWindSpent) return result;
  run.floor.secondWindSpent = true;
  burst(hero.x, hero.y - 10, '#e8dcc0', 30);
  addImpactWave(hero.x, hero.y - 8, '#f0e4c8', 70, 3);
  addCombatGlyph(hero.x, hero.y, '♥', '#e8dcc0', -76);
  playSound('spell-heal');
  persistRun();
  return Object.freeze({ ...result, hp: 1, dead: false, secondWind: true });
}

function damageHero(amount, {
  direct = false,
  impactColor = null,
  subtle = false,
  blocked = false,
  source = null,
  // Where the blow came from, when the caller knows. It only steers the damage
  // number away from the attacker, so a hero and a monster on the same tile do
  // not stack their numbers on one spot.
  from = null,
} = {}) {
  if (hero.dead || hero.hp <= 0 || runStatus !== 'playing') return null;
  if (amount > 0) heroThreatAt = elapsed;
  if (qaGod) return null;
  const combat = currentHeroCombat();
  const magic = currentHeroMagic();
  if (magic.warded && amount > 0) {
    // The ward holds one blow entirely and goes out. It is switched off rather
    // than counted down, so the bar shows the truth without a second number.
    hero.spells = toggleSustainedSpell(hero.spells, 'ward', currentHeroStats().intelligence).state;
    renderSpellBar();
    playSound('block');
    addCombatGlyph(hero.x, hero.y, '\u25c7', '#ded3a6', -60);
    burst(hero.x, hero.y - 10, '#ded3a6', 14);
    return Object.freeze({ hp: hero.hp, damage: 0, dead: false, blocked: true });
  }
  const softened = magic.iceArmour ? amount * (1 - ICE_ARMOUR_SOAK) : amount;
  const fullyBlocked = !direct && blocked && combat.guard > 0;
  const directDamage = Math.max(0, Math.ceil(softened));
  const rolled = fullyBlocked
    ? Object.freeze({ hp: hero.hp, damage: 0, dead: false, blocked: true })
    : direct
    ? Object.freeze({
        hp: Math.max(0, hero.hp - directDamage),
        damage: directDamage,
        dead: hero.hp - directDamage <= 0,
      })
    : resolveHeroDamage({
        hp: hero.hp,
        amount: softened,
        defense: currentHeroStats().defense,
        guard: combat.guard,
      });
  // One mistake a floor, and only if something worn pays for it.
  const result = surviveOnSecondWind(rolled);
  hero.hp = result.hp;
  hero.hurt = fullyBlocked ? 0 : subtle ? 0.12 : 0.24;
  if (!subtle) playSound(fullyBlocked ? 'block' : heroVoice('hero-hurt'));
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
    addCombatGlyph(hero.x, hero.y, result.damage, color, -48, from);
    if (!fullyBlocked) {
      addBloodImpact({ ...hero, bloodColor: '#6a302b' }, hero.x - Math.cos(hero.targetAngle) * TILE, hero.y - Math.sin(hero.targetAngle) * TILE, result.dead);
    }
    beginHitStop(fullyBlocked ? 0.065 : result.dead ? 0.075 : 0.045);
  }
  updateHud();
  if (!result.dead) return result;
  // In the city a wanted hero does not fall: the watch picks them up.
  if (isCityDepth(dungeon.depth) && isWanted(run.crime) && !run.crime.jailed && jailHero()) {
    return Object.freeze({ ...result, dead: false, arrested: true });
  }
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
  playSound(heroVoice('death'));
  stopAmbient();
  stopMusic();
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
    updateInteractionUi();
    updateBossHud();
  }

  /*
   * Монеты подбираются сами, вещи — руками.
   *
   * Горсть золота — это число, которое некуда рассматривать: кнопка на каждой
   * превратила бы дорогу в перечисление. Всё остальное ждёт нажатия, и ждёт
   * на полу, — за это отвечает `takeGroundLoot`.
   */
  for (let index = lootDefinitions.length - 1; index >= 0; index -= 1) {
    const loot = lootDefinitions[index];
    if (!loot.definition.gold) continue;
    if (Math.hypot(loot.x - hero.x, loot.y - hero.y) > TILE * 0.54) continue;
    const reward = Math.max(1, loot.amount ?? 1);
    lootDefinitions.splice(index, 1);
    run.floor.collected.push(loot.instanceId);
    gold += reward;
    playSound('gold');
    burst(loot.x, loot.y - 8, rarityGlow[loot.definition.rarity], 16);
    addImpactWave(loot.x, loot.y - 8, rarityGlow[loot.definition.rarity], 52, 1);
    // Монета и слово, а не имя кучки: «+5 [монета] золота».
    showLootToast({ icon: GOLD_ICON_PATH, rarity: loot.definition.rarity }, formatDeltas({ gold: reward }));
    updateHud();
    persistRun();
  }

  /*
   * Само срабатывает только то, что и должно: ловушка.
   *
   * Источник, алтарь и саркофаг открывают карточку по нажатию — см.
   * `triggerFloorEvent`. Раньше они срабатывали от шага по клетке, и игрок
   * видел только всплывшее «+11» с картинкой саркофага рядом.
   */
  for (let index = eventDefinitions.length - 1; index >= 0; index -= 1) {
    const event = eventDefinitions[index];
    if (event.definition.effect !== 'damage') continue;
    if (Math.hypot(event.x - hero.x, event.y - hero.y) > TILE * 0.54) continue;
    if (event.id === 'blade-trap' && currentHeroMagic().flight) continue;
    triggerFloorEvent(event);
    if (hero.dead) return;
  }

  /*
   * Шаг по лестнице больше никуда не уводит.
   *
   * Лестница вниз, лестница наверх, ворота города, конец написанной дороги —
   * всё это вещи на этаже, как дверь или сундук. Шаг на клетку только ставит
   * их в колонку «что рядом»; этаж меняет кнопка в карточке. Иван: спуск от
   * шага уводил его ниже, когда он просто шёл мимо за добычей. Заодно ушёл и
   * флаг «лестница взведена»: на прибытии нечему срабатывать, герой стоит на
   * лестнице и видит её кнопку.
   */
}

/**
 * Открыта ли лестница вниз прямо сейчас.
 *
 * Все прежние замки на месте: пока жив страж этажа, спуска нет; на конце
 * написанной дороги лестница — развилка с артефактом, а не спуск; в городе
 * выход — развилка трёх дорог.
 */
function stairDownOpen() {
  if (runStatus !== 'playing' || hero.dead) return false;
  if (isCityDepth(dungeon.depth) || artifactAvailable()) return false;
  if (dungeon.depth >= DEEPEST_DEPTH) return false;
  return canLeaveDungeonFloor({
    depth: dungeon.depth,
    status: runStatus,
    guardianDefeated: objectiveBossDefeated(),
  });
}

function completeVictory() {
  if (!artifactAvailable()) return false;
  runStatus = 'victory';
  run.status = runStatus;
  run.gold = gold;
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
  stopMusic();
  showLootToast({ path: roadPrize().path, rarity: 3 }, feedbackCopy(itemDetailLanguage).roadPrize, 'victory');
  persistRun();
  showRunEndScreen('victory');
  return true;
}

/**
 * Lifting a binding. The one thing that has to be right here is that the money
 * and the shackle move together: a purse that empties without the curse coming
 * off is the worst bug this feature could have, so the offer is re-checked and
 * the item is replaced before the gold is spent.
 */
function liftBindings(uids) {
  let changed = 0;
  for (const uid of uids) {
    const item = itemInstances.get(uid);
    const result = unbindItem(item);
    if (!result.ok) continue;
    itemInstances.set(uid, { ...item, ...result.item });
    changed += 1;
  }
  if (changed === 0) return 0;
  applyItemState(currentItemState());
  burst(hero.x, hero.y - 10, '#e8dcc0', 26);
  addCombatGlyph(hero.x, hero.y, '⛓', '#e8dcc0', -70);
  playSound('spell-toggle');
  showLootToast({ icon: 'derived/icon/scroll-remove_curse.png', rarity: 2 }, curseCopy(itemDetailLanguage).lifted, 'restore');
  updateGearUi();
  renderPack();
  updateHud();
  persistRun();
  return changed;
}

/** How many may walk with the hero right now: the taming school decides. */
function currentPartyLimit() {
  return packProfile(currentSkillCapabilities()).limit;
}

/**
 * Taking a hire. The money leaves only after the companion is standing there,
 * the same order the priest uses: a purse that empties with nothing to show for
 * it is the worst kind of bug a paid thing can have.
 */
function hireIntoParty(mercenaryId) {
  const result = hireMercenary({
    mercenaryId,
    gold,
    party: run.companions,
    partyLimit: currentPartyLimit(),
  });
  if (!result.ok) return false;
  run.companions = createCompanionParty([...run.companions, result.companion]);
  const index = run.companions.length - 1;
  if (!raiseCompanion(index)) {
    run.companions = createCompanionParty(run.companions.slice(0, index));
    return false;
  }
  gold -= result.price;
  emptySeatOf(mercenaryId);
  playSound('ui-tap');
  showLootToast(
    { path: mercenaryById(mercenaryId).path, rarity: 2 },
    mercenaryCopy(itemDetailLanguage).hired(mercenaryName(mercenaryId, itemDetailLanguage)),
    'ally',
  );
  updateHud();
  persistRun();
  return true;
}

/**
 * The chair a hire got up from. `floor.defeated` is the floor's list of who is
 * no longer standing on it — the runtime reads it for nothing else — so a man
 * who walked out with the hero belongs in it exactly as much as one who fell.
 */
function emptySeatOf(mercenaryId) {
  const seated = monsters.find((monster) => (
    monster.id === tavernHireMonsterId(mercenaryId) && monster.dead === 0
  ));
  if (!seated) return;
  seated.dead = 0.01;
  if (!run.floor.defeated.includes(seated.instanceId)) {
    run.floor.defeated.push(seated.instanceId);
  }
}

/** The room upstairs: gold for a whole night, and the clock fills. */
/** Supper. The keeper takes the coin and the dish goes into the bag. */
function buyKeeperFood(itemId) {
  const result = buyTavernFood({
    itemId,
    gold,
    backpackCount: backpackItems.filter(Boolean).length,
    capacity: currentBackpackCapacity(),
  });
  if (!result.ok) return false;
  if (!grantItem(result.itemId, `tavern-${result.itemId}-${run.seed}-${run.commandSequence}`)) return false;
  gold = result.gold;
  run.commandSequence += 1;
  playerHasActed = true;
  playSound('gold');
  updateHud();
  persistRun();
  return true;
}

function rentTavernBed() {
  const offer = bedOffer({
    gold,
    rest: hero.rest,
    restMax: REST_MAX,
    language: itemDetailLanguage,
  });
  if (!offer.ok) return false;
  if (!sleepOnIt()) return false;
  gold -= offer.price;
  updateHud();
  persistRun();
  return true;
}

function payPriestForUnbinding() {
  const offer = templeOffer({
    equipment: selected,
    items: itemInstances,
    gold,
    level: hero.level,
    language: itemDetailLanguage,
  });
  if (!offer.ok) return false;
  const uids = offer.slots.map((slot) => selected[slot]).filter(Boolean);
  if (liftBindings(uids) === 0) return false;
  gold -= offer.price;
  updateHud();
  persistRun();
  return true;
}

function healAtSanctuary() {
  const result = useSanctuary({
    depth: dungeon.depth,
    hp: hero.hp,
    maxHp: currentHeroStats().maxHp,
    activeSeconds: run.stats.activeSeconds,
    drunkAt: run.sanctuaryDrunkAt ?? null,
  });
  if (!result.ok) {
    renderContextActions();
    /*
     * Отказ обязан звучать.
     *
     * Раньше здесь была одна перерисовка: игрок видел цену, жал — и не
     * происходило ровным счётом ничего, ни звука, ни строки. Понять, что
     * камень отказал и почему, было неоткуда. Причину карточка уже знает —
     * её и показываем.
     */
    const hint = contextTarget?.kind === 'sanctuary'
      ? contextActionModel({
          target: contextModelTarget(),
          actor: currentInteractionActor(),
          language: itemDetailLanguage,
              }).actions[0]?.hint
      : null;
    if (hint) showLootToast({ path: SANCTUARY_PATH, rarity: 0 }, hint, 'refused');
    return;
  }
  hero.hp = result.state.hp;
  run.sanctuaryDrunkAt = result.state.drunkAt;
  burst(hero.x, hero.y - 8, '#d4c27e', 22);
  playSound('spell-heal');
  showLootToast(
    { path: SANCTUARY_PATH, rarity: 2 },
    formatDeltas({ heal: result.healed }) || consumableReport().healedFull,
    result.healed > 0 ? 'heal' : 'restore',
  );
  updateHud();
  persistRun();
  // Окно остаётся открытым: лечение повторяемое, и закрывать его после каждой
  // монеты — значит заставлять подходить к камню заново на каждые двадцать восемь
  // единиц здоровья.
  if (contextTarget?.kind === 'sanctuary') renderContextActions();
}

/**
 * Loads the floor the run is standing on. The run has already decided what
 * that floor is — freshly built or remembered from an earlier visit — so this
 * hydrates the same way loading a save does, and never invents a new floor.
 */
/**
 * The body a past run left on this floor, if there is one. It is never the
 * current run's own death — a run that ended is over — and it only appears on
 * the depth it fell on.
 */
function placeFloorGhost() {
  // Both the descent and the first frame of a loaded save call this, so it has
  // to be able to run twice on the same floor without leaving two ghosts.
  monsters = monsters.filter((monster) => !monster.ghost);
  lootDefinitions = lootDefinitions.filter((loot) => !loot.bones);
  floorGhost = null;
  if (isCityDepth(dungeon.depth)) return;
  const bones = bonesForDepth(metaState.bones, dungeon.depth, { excludeSeed: run.seed });
  if (!bones) return;
  // Remembered is not the same as met. Most floors keep their body to themselves.
  if (!ghostWakes({ seed: run.seed, depth: dungeon.depth })) return;
  // На кладбище стоит добрый призрак, и второй, злой, там лишний: тело лежит
  // в этом зале, и его тень успокоилась рядом с ним.
  if (activeGraveyardBones) return;
  const spawnCell = { x: Math.floor(dungeon.spawn.x), y: Math.floor(dungeon.spawn.y) };
  const busy = new Set([
    `${spawnCell.x},${spawnCell.y}`,
    ...lootDefinitions.map((loot) => `${Math.floor(loot.x / TILE)},${Math.floor(loot.y / TILE)}`),
    ...findDefinitions.map((find) => `${find.x},${find.y}`),
    ...monsters.map((monster) => `${Math.floor(monster.x / TILE)},${Math.floor(monster.y / TILE)}`),
  ]);
  const isFree = (x, y) => isWalkable(x, y) && !busy.has(`${x},${y}`);
  const spot = bonesPlacement({ bones, isFree });
  if (!spot) return;
  // The find lies where the run fell; the ghost stands beside it, so the hero
  // can always reach what it guards without going through it first.
  const stand = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]
    .map(([dx, dy]) => ({ x: spot.x + dx, y: spot.y + dy }))
    .find((cell) => isFree(cell.x, cell.y));
  if (!stand) return;
  const stats = ghostStats(bones);
  const [ghost] = createRuntimeMonsters(dungeon, [{
    instanceId: `ghost-${dungeon.depth}`,
    id: 'player-ghost',
    x: stand.x,
    y: stand.y,
  }]);
  if (!ghost) return;
  ghost.ghost = true;
  ghost.bones = bones;
  ghost.layers = ghostLayers(bones);
  ghost.maxHp = stats.hp;
  ghost.hp = stats.hp;
  ghost.damage = stats.damage;
  ghost.vision = stats.vision;
  ghost.xp = 6 + bones.level * 5;
  monsters = [...monsters, ghost];
  floorGhost = ghost;
  const reward = rollBonesReward({
    // The dead run's own seed, carried on the bones: the same body always holds
    // the same thing, whichever run walks in on it.
    seed: bones.seed,
    depth: dungeon.depth,
    key: bonesKey(bones),
    scaling: dungeon.scaling,
  });
  if (!reward) return;
  const [entry] = createLootDefinitions({ loot: [{ ...reward, x: spot.x, y: spot.y }] });
  if (!entry) return;
  lootDefinitions = [...lootDefinitions, { ...entry, bones: true }];
}

/**
 * Разговор с призраком: где он кончился и что с этим делать.
 *
 * Речь собирают правила кладбища — два урока из разбора смерти, не больше:
 * «совет из восьми пунктов — это не совет». Показывает её то же окно, каким
 * игра объясняет сытость и усталость, поэтому читается привычно и закрывается
 * привычно.
 *
 * Если рассказать нечего — а так бывает, когда о смерти нечего сказать, —
 * призрак молчит, и это тоже ответ, а не пустое окно.
 */
function speakWithGraveyardGhost(ghost) {
  const bones = ghost?.bones ?? activeGraveyardBones;
  const copy = graveyardCopy(itemDetailLanguage);
  const speech = ghostSpeech({ bones, language: itemDetailLanguage });
  playSound('ui-tap');
  if (!speech) {
    showLootToast({ path: 'mon/undead/ghost.png', rarity: 1 }, copy.silent);
    return true;
  }
  openLore({
    title: copy.name,
    subtitle: copy.spoken,
    icon: 'mon/undead/ghost.png',
    color: '#9fc7d8',
    body: [speech.where, ...speech.lessons, speech.parting],
  });
  return true;
}

/**
 * Призрак на кладбище — тот, кто уже своё отходил.
 *
 * Иван: «пусть там ходит добрый НПС, призрак игрока, которого убили, и даёт
 * совет, что делать, чтобы не повторить прошлую ошибку». Он не сторожит
 * добычу и не нападает: единственное, что он умеет, — рассказать, где и от
 * чего кончился прошлый забег.
 *
 * Тот, что сторожит кости, — существо другой породы, и на кладбище его нет:
 * тело лежит здесь, и его призрак здесь же успокоился. Два призрака одного
 * покойника на одном этаже читались бы как сбой.
 */
function placeGraveyardGhost() {
  monsters = monsters.filter((monster) => !monster.graveyardGhost);
  graveyardGhost = null;
  const bones = activeGraveyardBones;
  const room = Number.isInteger(activeGraveyardRoom) ? dungeon.rooms?.[activeGraveyardRoom] : null;
  if (!bones || !room) return;
  const busy = new Set([
    `${Math.floor(dungeon.spawn.x)},${Math.floor(dungeon.spawn.y)}`,
    `${dungeon.exit.x},${dungeon.exit.y}`,
    ...lootDefinitions.map((loot) => `${Math.floor(loot.x / TILE)},${Math.floor(loot.y / TILE)}`),
    ...findDefinitions.map((find) => `${find.x},${find.y}`),
    ...monsters.map((monster) => `${Math.floor(monster.x / TILE)},${Math.floor(monster.y / TILE)}`),
  ]);
  // Ближе к середине зала: призрак стоит между саркофагов, а не у стены.
  const centre = { x: room.x + Math.floor(room.width / 2), y: room.y + Math.floor(room.height / 2) };
  const cells = [];
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      if (!isWalkable(x, y) || busy.has(`${x},${y}`)) continue;
      cells.push({ x, y });
    }
  }
  cells.sort((a, b) => (
    Math.abs(a.x - centre.x) + Math.abs(a.y - centre.y)
    - (Math.abs(b.x - centre.x) + Math.abs(b.y - centre.y))
  ));
  const [spot] = cells;
  if (!spot) return;
  const [ghost] = createRuntimeMonsters(dungeon, [{
    instanceId: `graveyard-ghost-${dungeon.depth}`,
    id: 'player-ghost',
    x: spot.x,
    y: spot.y,
  }]);
  if (!ghost) return;
  ghost.ghost = true;
  ghost.graveyardGhost = true;
  ghost.neutral = true;
  ghost.bones = bones;
  ghost.layers = ghostLayers(bones);
  monsters = [...monsters, ghost];
  graveyardGhost = ghost;
}

/**
 * Taking what the ghost was standing over is the only thing that wakes it, and
 * it spends the bones: one body, one visit. Nothing about either is written to
 * the floor — the bones live in meta, where deaths already live.
 */
function claimFloorBones() {
  if (!floorGhost?.bones) return;
  const depth = floorGhost.bones.depth;
  if (!bonesForDepth(metaState.bones, depth, { excludeSeed: run.seed })) return;
  metaState = forgetBones(metaState, depth);
  persistMetaState();
}

function wakeFloorGhost() {
  const ghost = floorGhost;
  if (!ghost || ghost.provoked || ghost.dead > 0) return;
  ghost.provoked = true;
  ghost.alerted = ghost.pursuit;
  claimFloorBones();
  burst(ghost.x, ghost.y - 10, '#9fc7d8', 22);
  addImpactWave(ghost.x, ghost.y - 6, '#9fc7d8', 58, 0);
  showLootToast({ path: ghost.spritePath, rarity: 2 }, bonesCopy(itemDetailLanguage).woken, 'hostile');
  playSound('spell-toggle');
}

/**
 * Есть ли на этом этаже кладбище, и если да — в какой комнате.
 *
 * Иван выбрал самое строгое из трёх правил: «нет смерти — нет кладбища».
 * Место существует только тогда, когда есть кому там лежать, поэтому пустой
 * список костей выключает его целиком, а не оставляет пустые гробы.
 */
function resolveGraveyard() {
  activeGraveyardBones = graveyardOnFloor({
    branch: run.branch,
    seed: run.seed,
    depth: dungeon.depth,
    bones: metaState.bones,
  });
  activeGraveyardRoom = activeGraveyardBones ? graveyardRoomIndex(dungeon) : null;
}

function replaceFloor(nextDepth, arrival = null) {
  run.depth = nextDepth;
  dungeon = hydrateDungeon(run);
  // Этаж отстроен заново, а страж на нём уже побеждён: запись об этом
  // возвращается на этаж, и лестница вниз остаётся открытой.
  const bossId = dungeon.objective?.bossInstanceId;
  if (bossId && guardianRemembered(run.guardians, run.branch, run.depth) && !run.floor.defeated.includes(bossId)) {
    run.floor.defeated.push(bossId);
  }
  world = dungeon.grid;
  resolveGraveyard();
  // Дорога могла смениться вратами — мелодия спрашивается заново. Бой со
  // стражем остаётся на том этаже, где шёл: новый начинается без него.
  bossMusicOn = false;
  refreshRoadAudio();
  mistAnchors = createMistAnchors(dungeon);
  voidStarLayers = createVoidStars(dungeon);
  monsters = createMonsters(dungeon);
  passiveCreatures = createPassiveCreatures(dungeon);
  lootDefinitions = createFloorLoot(dungeon);
  eventDefinitions = createEventDefinitions(dungeon);
  findDefinitions = createFindDefinitions(dungeon);
  visibleSecretIds.clear();
  trapDefinitions = trapsFromDungeon(dungeon);
  // Traps the hero already found and laid are part of the floor's memory.
  placedTraps = run.floor.placedTraps.map((trap) => ({ ...trap }));
  detectedTrapIds = new Set(run.floor.detectedTrapIds);
  hazardInputState = createHazardInputState();
  permittedHazardCell = null;
  doorDefinitions = dungeon.doors.map((door) => ({ ...door }));
  merchantDefinitions = dungeon.merchants.map((merchant) => ({ ...merchant }));
  builtWallCells = new Set(dungeon.builtWalls ?? []);
  thicketCells = new Set(dungeon.thicketWalls ?? []);
  hewnWallCells = new Set(dungeon.hewnWalls ?? []);
  greenFloorCells = new Set(cityGreenCells(dungeon.city));
  boardedFloorCells = new Set([
    ...tavernFloorCells(dungeon),
    // And every other roof in town: a house with the street's own ground
    // inside it is a fenced piece of street, not a house.
    ...cityInteriorFloorCells(dungeon.city),
  ]);
  waterPaths = waterTiles(dungeon.themeId);
  openingDoor = null;
  activeChestFindId = null;
  dungeonEnvironment = createDungeonEnvironment(dungeon, { graveyardRoom: activeGraveyardRoom });
  // After the dungeon's own props, never before: the hero's camp and house
  // are added on top of the environment the floor just built.
  applyCampProps();
  placeFloorGhost();
  placeGraveyardGhost();
  // Этаж успел собраться — можно сказать, что на нём не так.
  showOmenNote(dungeon.rareEncounter?.omen);
  revealed.clear();
  for (const cell of run.floor.revealed) if (isCellKey(cell)) revealed.add(cell);
  hero.x = (dungeon.spawn.x + 0.5) * TILE;
  hero.y = (dungeon.spawn.y + 0.5) * TILE;
  if (arrival && isWalkable(arrival.x, arrival.y)) {
    hero.x = (arrival.x + 0.5) * TILE;
    hero.y = (arrival.y + 0.5) * TILE;
  }
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
  lastHeroCell = `${Math.floor(hero.x / TILE)},${Math.floor(hero.y / TILE)}`;
  revealAround(
    revealed,
    world,
    { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) },
    currentRevealRadius(),
  );
  // Герой приходит, стоя на лестнице, и ничего от этого не случается: этаж
  // меняет только кнопка в карточке.
  allies = [];
  camera.x = hero.x;
  camera.y = hero.y;
  sceneStartedAt = elapsed;
  armAmbientScene();
  /*
   * Звук следует за этажом: гул спрашивают у палитры, мелодию — у дороги.
   *
   * Слоёв стало два, и просыпаться они обязаны в одних и тех же местах, иначе
   * один поедет за героем, а второй останется на прежнем этаже.
   */
  refreshRoadAudio();
  if (ready) rebuildDungeonWorld3D();
  discoverNearbyTraps({ feedback: false });
  updateHud();
  persistRun();
}

/** Puts the hero on a cell after a floor was rebuilt, with the map and camera. */
function placeHeroAtCell(cell) {
  if (!cell || !isWalkable(cell.x, cell.y)) return false;
  hero.x = (cell.x + 0.5) * TILE;
  hero.y = (cell.y + 0.5) * TILE;
  hero.path = [];
  lastHeroCell = `${cell.x},${cell.y}`;
  camera.x = hero.x;
  camera.y = hero.y;
  revealAround(revealed, world, cell, currentRevealRadius());
  updateInteractionUi();
  persistRun();
  return true;
}

/** Anything alive that can see the hero right now; the road home refuses these. */
function watchersOnHero() {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return monsters.filter((monster) => (
    monster.dead === 0
    && (!monster.neutral || monster.provoked)
    && Math.hypot(monster.x - hero.x, monster.y - hero.y) <= TILE * HOUSE_SAFE_DISTANCE
    && hasLineOfSight(world, { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) }, heroCell)
  )).length;
}

/** The face of the city's ledger in a toast. */
const CRIME_TOAST_ICON = 'mon/vault_warden.png';

/**
 * One deed, one line in the ledger. Nothing here is undone by leaving the
 * floor: the record lives in the run, so the street remembers a returning face.
 */
function noteCrime(deed) {
  const result = recordCrime(run.crime, deed);
  if (!result.ok) return false;
  run.crime = result.crime;
  showLootToast({ path: CRIME_TOAST_ICON, rarity: 3 }, wantedLabel(run.crime, itemDetailLanguage), 'hostile');
  persistRun();
  return true;
}

/** Where the watch puts a hero it has caught: the middle of the cell. */
function jailAnchorCell(jail) {
  if (!jail?.interior) return null;
  return {
    x: jail.interior.x + Math.floor(jail.interior.w / 2),
    y: jail.interior.y + Math.floor(jail.interior.h / 2),
  };
}

/**
 * Falling in the city while wanted is not a death. The watch takes the hero to
 * a cell, the street calms down, and the record waits inside with them.
 */
function jailHero() {
  const anchor = jailAnchorCell(cityJailBlock());
  if (!anchor) return false;
  const arrest = arrestHero({ crime: run.crime, maxHp: currentHeroStats().maxHp });
  if (!arrest.ok) return false;
  run.crime = arrest.crime;
  hero.hp = arrest.hp;
  hero.path = [];
  hero.pendingAttack = null;
  hero.attackEmpowered = false;
  hero.attackMasteryRank = 0;
  projectiles.length = 0;
  // The chase is over the moment the cell door shuts.
  for (const monster of monsters) {
    if (!monster.neutral) continue;
    monster.provoked = false;
    monster.alerted = 0;
    monster.route = [];
  }
  const cellDoor = cityJailDoor();
  if (cellDoor) {
    run.floor.opened = run.floor.opened.filter((id) => id !== cellDoor.instanceId);
    openingDoor = null;
  }
  placeHeroAtCell(anchor);
  closeContextActions();
  playSound('door');
  showLootToast({ path: CRIME_TOAST_ICON, rarity: 3 }, crimeRefusalText('arrested', itemDetailLanguage), 'loss');
  updateHud();
  persistRun();
  return true;
}

/** The cell door the hero is locked behind, when they are behind one. */
function nearbyJailDoor() {
  if (!run.crime.jailed || runStatus !== 'playing') return null;
  const door = cityJailDoor();
  if (!door) return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return cellStepDistance(cell, door) <= 1 ? door : null;
}

/** Serving the sentence: the purse pays what it can and the record closes. */
function serveJailSentence() {
  const result = serveSentence({ crime: run.crime, gold });
  if (!result.ok) return false;
  run.crime = result.crime;
  gold = result.gold;
  showLootToast({ path: CRIME_TOAST_ICON, rarity: 2 }, crimeRefusalText('served', itemDetailLanguage));
  updateHud();
  updateInteractionUi();
  persistRun();
  return true;
}

/** Picking the cell lock: quick, and it writes one more line in the ledger. */
function pickJailLock() {
  const result = breakOut({
    crime: run.crime,
    lockpickTier: currentSkillCapabilities().lockpickTier ?? 0,
  });
  if (!result.ok) return false;
  run.crime = result.crime;
  playSound('chest');
  showLootToast({ path: CRIME_TOAST_ICON, rarity: 3 }, crimeRefusalText('escaped', itemDetailLanguage));
  updateHud();
  updateInteractionUi();
  persistRun();
  return true;
}

/** Settling up with the captain while still on your feet. */
function payWatchFine() {
  const result = payFine({ crime: run.crime, gold });
  if (!result.ok) return false;
  run.crime = result.crime;
  gold = result.gold;
  for (const monster of monsters) {
    if (monster.neutral && !monster.ghost) monster.provoked = false;
  }
  playSound('gold');
  showLootToast({ path: CRIME_TOAST_ICON, rarity: 2 }, crimeRefusalText('paid', itemDetailLanguage));
  updateHud();
  updateInteractionUi();
  persistRun();
  return true;
}

/**
 * The stone works both ways: from the dungeon it opens the door home and
 * remembers the spot, from home it puts the hero back on that spot.
 */
function useHomeStone() {
  if (run.crime.jailed) return crimeRefusalText('in-cell', itemDetailLanguage);
  // The thread back is pulled from town, not from one particular room. Making
  // the hero walk into their own bedroom to use it was friction with no
  // decision in it — and the refusal they got out in the street said only
  // «сейчас нельзя», which explains nothing.
  if (isCityDepth(dungeon.depth) && run.house.anchor) {
    const back = returnFromHouse({ house: run.house });
    if (!back.ok) return houseRefusalText(back.reason, itemDetailLanguage);
    run.house = back.house;
    run = travelRunToDepth(captureRun(), back.anchor.depth, { x: back.anchor.x, y: back.anchor.y });
    replaceFloor(run.depth, { x: back.anchor.x, y: back.anchor.y });
    playSound('portal');
    announceFloor();
    return '';
  }
  const cityDepth = CITY_DEPTHS[0];
  const result = travelHome({
    house: run.house,
    depth: dungeon.depth,
    cell: { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) },
    hunger: hero.hunger,
    watchers: watchersOnHero(),
  });
  if (!result.ok) return houseRefusalText(result.reason, itemDetailLanguage);
  hero.hunger = result.hunger;
  currentHungerStageId = hungerStage(hero.hunger).id;
  run.house = result.house;
  run = travelRunToDepth(captureRun(), cityDepth, null);
  replaceFloor(cityDepth);
  // The plot only exists once the city itself does, so the hero is put down
  // inside their own walls after the floor is built, not before.
  const arrival = houseArrivalCell(cityHousePlot());
  if (arrival) placeHeroAtCell(arrival);
  announceFloor();
  playSound('spell-toggle');
  burst(hero.x, hero.y - 12, '#d8bf68', 24);
  return '';
}

/**
 * Stepping onto another road. The new one starts at its own first floor, and
 * the floors of the one left behind are forgotten the way the city forgets
 * them — a road is a place you are on, not a stack you can climb back up.
 */
function enterBranch(branch) {
  if (isTerminalRunStatus(runStatus)) return false;
  run = enterBranchThroughGate(captureRun(), branch);
  hero.hp = run.hero.hp;
  hero.hunger = run.hero.hunger;
  replaceFloor(run.depth);
  playerHasActed = true;
  playSound('descend');
  announceFloor();
  persistRun();
  return true;
}

/**
 * Экран гаснет, называет этаж и открывает его. Смена самого этажа уже
 * случилась: заставка — только то, как игрок её видит, поэтому мир на это
 * время стоит, а правила ничего не ждут.
 */
function announceFloor() {
  const model = floorArrivalModel({ depth: run.depth, branch: run.branch, language: itemDetailLanguage });
  floorArrivalTitle.textContent = model.title;
  floorArrivalSubtitle.textContent = model.subtitle;
  floorArrival.dataset.guardian = String(model.guardian);
  floorArrival.classList.remove('is-on');
  // Перезапуск анимации: без чтения размера класс вернётся в том же кадре.
  void floorArrival.offsetWidth;
  floorArrival.classList.add('is-on');
  arrivalHold = reducedMotion ? 0.2 : 0.65;
}

function descendFloor() {
  // No bottom: past the written road the stair simply keeps going.
  if (isTerminalRunStatus(runStatus) || dungeon.depth >= DEEPEST_DEPTH) return;
  run = advanceRunFloor(captureRun());
  hero.hp = run.hero.hp;
  hero.hunger = run.hero.hunger;
  replaceFloor(run.depth);
  playSound('descend');
  announceFloor();
}

/** The way back up. The floor above is the one the hero left, not a new one. */
function climbFloor() {
  if (isTerminalRunStatus(runStatus) || dungeon.depth <= CITY_DEPTH) return;
  const road = run.branch;
  run = retreatRunFloor(captureRun());
  hero.hp = run.hero.hp;
  hero.hunger = run.hero.hunger;
  /*
   * Поднявшись, герой выходит у лестницы вниз — той, по которой спускался.
   *
   * Правила так и считали (`retreatRunFloor` ставит его на выход этажа), а
   * переходник их не слушал и ставил на лестницу наверх: подъём на этаж
   * отбрасывал героя через весь этаж. Пока спуск срабатывал от шага, это
   * прятало ещё и риск тут же уехать обратно; теперь этаж меняет только
   * кнопка, и стоять на спуске после подъёма безопасно.
   */
  replaceFloor(run.depth, { x: run.hero.x, y: run.hero.y });
  // Come out of the caves and you are standing at the hole you came out of, not
  // at the far side of town. The gate you used is the gate you arrive by.
  if (isCityDepth(run.depth)) {
    const воротаДороги = dungeon.gates?.[road] ?? null;
    placeHeroAtCell(run.cityGate ?? воротаДороги ?? dungeon.exit);
  }
  playSound('descend');
  announceFloor();
}

function restartRun(seed = null, build = null) {
  clearMoveControl();
  clearLevelUpCelebration();
  onboardingInteracted = false;
  onboardingHintId = null;
  onboardingCheckedAt = Number.NEGATIVE_INFINITY;
  renderOnboardingHint();
  // Whatever was bought at the counter is handed over here and nowhere else:
  // a kit is spent when a run begins, so backing out of the menu cannot copy it.
  const runSeed = Number.isInteger(seed) ? seed : fixedPreviewSeed ?? createSeed();
  const outfit = stashOutfit(stashState);
  stashState = outfit.stash;
  persistStash();
  run = createRun(runSeed, generateDungeon({ seed: runSeed, depth: 1 }), outfit, build);
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
  hero.attributes = createAttributeState(run.hero.attributes);
  hero.attributeGifts = createAttributeGifts(run.hero.attributeGifts);
  hero.spells = createSpellState(run.hero.spells);
  hungerAccumulator = 0;
  hungerAutosaveElapsed = 0;
  currentHungerStageId = hungerStage(hero.hunger).id;
  hero.effects = createActorEffects(run.hero.effects);
  hero.skills = cloneSkillState(run.hero.skills);
  syncKnownSpells();
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

/**
 * An empty bar is not a debuff, it is a clock. It keeps taking health until
 * something is eaten, and it names itself on the death screen — «Голод» is a
 * cause of death a player can learn from, «неизвестно» is not.
 */
let starvationCarry = 0;
function starve(activeSeconds) {
  if (hero.hunger > 0) {
    starvationCarry = 0;
    return;
  }
  const toll = starvationToll({
    hunger: hero.hunger,
    maxHp: currentHeroStats().maxHp,
    seconds: starvationCarry + activeSeconds,
  });
  starvationCarry = toll.remainder;
  if (toll.damage <= 0) return;
  damageHero(toll.damage, { direct: true, impactColor: '#c9a45f', source: 'hunger' });
  addCombatGlyph(hero.x, hero.y, '✘', '#c9a45f', -66);
}

/**
 * A swing and a spell cost the clock on top of the second they took. Thirty
 * swings is close to a minute of the bar, which is what makes «go round that
 * room» an answer rather than cowardice.
 */
function spendHunger(action) {
  if (runStatus !== 'playing' || hero.dead) return;
  hungerAccumulator += HUNGER_COST[action] ?? 0;
}

/**
 * Передышка: раны затягиваются, пока вокруг тихо (см. dcss-rpg-recovery.js).
 * Тихо — никто не гонится за героем ближе восьми клеток и по нему шесть
 * секунд не били.
 */
function recoverInQuiet(activeSeconds) {
  const chased = monsters.some((monster) => (
    monster.dead === 0
    && (!monster.neutral || monster.provoked)
    && monster.alerted > 0
    && Math.hypot(monster.x - hero.x, monster.y - hero.y) <= TILE * 8
  ));
  if (chased) heroThreatAt = elapsed;
  const recovery = calmRecovery({
    hp: hero.hp,
    maxHp: currentHeroStats().maxHp,
    seconds: activeSeconds,
    calmSeconds: elapsed - heroThreatAt,
    hungerStageId: hungerStage(hero.hunger).id,
    carry: calmCarry,
  });
  calmCarry = recovery.carry;
  if (recovery.healed > 0) {
    hero.hp += recovery.healed;
    updateHud();
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
  // `advanceHunger` takes whole seconds and says so; a condition's multiplier
  // turns them into a fraction, and the tick threw on every «Голодный год».
  const appetite = currentHeroMagic();
  hero.hunger = advanceHunger(
    hero.hunger,
    Math.round(
      frugalHungerSeconds(activeSeconds, currentArmourProfile())
        * currentConditions().hungerScale
        * (1 - appetite.satiety)
        * (1 + appetite.appetite)
        * (appetite.gluttony ? 2 : 1),
    ),
  );
  starve(activeSeconds);
  recoverInQuiet(activeSeconds);
  // Rest runs off the same seconds hunger does — it is the same road walked,
  // not a second thing to watch — but it never touches health.
  const wasRested = restStage(hero.rest).id;
  hero.rest = advanceRest(hero.rest, activeSeconds);
  if (restStage(hero.rest).id !== wasRested) {
    renderHungerHud();
    renderCharacterSheet();
    const presentation = restPresentation(hero.rest, itemDetailLanguage);
    showLootToast({ path: CAMP_BEDROLL_PATH, rarity: 1 }, presentation.label);
  }
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
  /*
   * Копилка вампиризма.
   *
   * Наполняется временем и тратится ударами, и больше секундного запаса в ней
   * не лежит: иначе герой копил бы лечение, стоя без дела, и выливал его одним
   * залпом — ровно то бессмертие, от которого потолок и ставился.
   */
  {
    const запас = vampiricBudget(currentHeroStats().maxHp, dungeon.depth, dungeon.scaling?.entry?.pressure ?? 1);
    vampiricPool = Math.min(запас, vampiricPool + запас * delta);
  }
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
  // The pure runtime tests drive updateHero without the HUD, so the clock is
  // guarded the same way the spell bar's is.
  if (typeof interactionUiAccumulator !== 'undefined') {
    interactionUiAccumulator += delta;
    if (interactionUiAccumulator >= 0.25) {
      interactionUiAccumulator = 0;
      if (uiScreen === 'game' && typeof updateInteractionUi === 'function') updateInteractionUi();
    }
  }
  updateHunger(delta);
  updateHeroEffects(delta);
  updateHeroFooting();
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
      /*
       * Дверь на пути открывают, а не упираются в неё.
       *
       * Путь сохраняется целиком: дверь откроется за свою долю секунды, и
       * герой пойдёт дальше с того же места, вместо того чтобы остановиться и
       * ждать второго касания.
       */
      const клетка = { x: Math.floor(target.x / TILE), y: Math.floor(target.y / TILE) };
      const дверь = world[клетка.y]?.[клетка.x] === 'D'
        ? doorDefinitions.find((door) => door.x === клетка.x && door.y === клетка.y)
        : null;
      if (!heroPathOpensDoors || !дверь || openingDoor || !beginOpenDoor(дверь)) hero.path = [];
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
          terrainSpeedMultiplier({ inWater: heroWading() && !currentArmourProfile().surefooted }) *
          dodgeSpeedMultiplier(heroDodgeBoost, currentMobilityProfile()) *
          heroSwiftness() *
          currentConditions().heroSpeedScale,
      );
      if (distance > 0) {
        const next = constrainActorMovement({
          actor: hero,
          next: { x: hero.x + (dx / distance) * movement, y: hero.y + (dy / distance) * movement },
          blockers: heroBlockingActors(),
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
    spendHunger('strike');
    hero.targetAngle = Math.atan2(nearest.y - hero.y, nearest.x - hero.x);
    hero.facing = nearest.x < hero.x ? -1 : 1;
    if (currentHeroMagic().invisibility) hero.invisibilityReveal = INVISIBILITY_REVEAL_SECONDS;
    const loadout = currentWeaponLoadout();
    const weapon = loadout.primary;
    const color = rarityGlow[weapon?.rarity ?? 0];
    const wadingMultiplier = terrainMeleeMultiplier({ inWater: heroWading() }) * heroConditionalDamage();
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
      weapon: currentWeaponLoadout().primary,
      staff: currentStaffProfile(),
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
      weaponMagic: currentHeroMagic(),
    };
  }
}

// --- Ambient scenes: the dungeon getting on without the hero -----------------
//
// The catalogue, the roll and the choreography live in `dcss-rpg-ambient.js`.
// What is here is only the staging — which corner of this floor a scene plays
// in, and how it reaches the screen. None of it is written to the save: a scene
// is a moment, and a moment you can reload is not one.

/** Near enough to be seen from where the hero stands, far enough not to be underfoot. */
const AMBIENT_STAGE_RADIUS = 10;
/** How long a scene keeps looking for somewhere to happen before the floor drops it. */
const AMBIENT_GIVE_UP = 150;
/** The line naming the scene never leaves before the scene itself does. */
const AMBIENT_NOTE_SECONDS = 4.5;

let ambientScene = null;
let ambientNoteTimer = 0;

/** The lights on this floor that are a flame, and so are a draught's business. */
function ambientFlameSources() {
  return atmosphereLightSources().filter(({ flame }) => flame === true);
}

/**
 * What this floor could stage at all. There is no point in the dungeon promising
 * a draught where nothing is burning or fireflies where there is no water: the
 * roll only ever chooses between scenes this floor can actually put on.
 */
function possibleAmbientScenes() {
  // Asked of the floor, not of what the hero can see from the stairs: at the
  // moment a floor is entered almost nothing is revealed yet, and a floor full
  // of braziers would rule out the draught every time.
  const flames = dungeonEnvironment.props.some(({ light }) => light?.flame === true);
  const doors = doorDefinitions.some(({ x, y }) => world[y]?.[x] === 'D');
  const water = world.some((row) => row.includes('~'));
  return AMBIENT_SCENES
    .filter(({ needs }) => needs === 'none'
      || needs === 'room'
      || (needs === 'lit' && flames)
      || (needs === 'door' && doors)
      || (needs === 'water' && water))
    .map(({ id }) => id);
}

function armAmbientScene() {
  ambientScene = null;
  ambientNoteTimer = 0;
  if (ambientNote) ambientNote.classList.remove('visible');
  const rolled = scheduleAmbientScene({
    seed: run.seed,
    depth: run.depth,
    possible: possibleAmbientScenes(),
  });
  if (!rolled) return;
  ambientScene = {
    ...rolled,
    armedAt: elapsed,
    startedAt: null,
    stage: null,
    lights: [],
    smoke: [],
    door: null,
  };
}

function ambientHeroCell() {
  return { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
}

/** Cells around the hero that the player can see right now, nearest first. */
function ambientVisibleCells(match) {
  const from = ambientHeroCell();
  const found = [];
  for (let dy = -AMBIENT_STAGE_RADIUS; dy <= AMBIENT_STAGE_RADIUS; dy += 1) {
    for (let dx = -AMBIENT_STAGE_RADIUS; dx <= AMBIENT_STAGE_RADIUS; dx += 1) {
      const x = from.x + dx;
      const y = from.y + dy;
      if (y < 0 || y >= world.length || x < 0 || x >= world[y].length) continue;
      const distance = Math.hypot(dx, dy);
      // Never on top of the hero, never past the edge of what they can see.
      if (distance < 2.5 || distance > AMBIENT_STAGE_RADIUS) continue;
      if (!revealed.has(`${x},${y}`)) continue;
      if (!hasLineOfSight(world, from, { x, y })) continue;
      if (!match(x, y)) continue;
      found.push({ x, y, distance });
    }
  }
  return found.sort((left, right) => left.distance - right.distance);
}

/** A straight run of cells to walk along, or null if this corner has none. */
function ambientCellRun(match, length) {
  const cells = ambientVisibleCells(match);
  const open = new Set(cells.map(({ x, y }) => `${x},${y}`));
  for (const cell of cells) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      let count = 0;
      while (count < length && open.has(`${cell.x + dx * count},${cell.y + dy * count}`)) count += 1;
      if (count < length) continue;
      return {
        x0: (cell.x + 0.5) * TILE,
        y0: (cell.y + 0.5) * TILE,
        dx: dx * (length - 1) * TILE,
        dy: dy * (length - 1) * TILE,
      };
    }
  }
  return null;
}

/**
 * A ghost walks through walls, so it needs no floor — only a line across what
 * the hero is looking at, a couple of tiles clear of their feet.
 */
function ambientDriftLine(variant) {
  const side = variant % 2 === 0 ? 1 : -1;
  const across = (2 + (variant >> 1) % 2) * (variant >> 3 & 1 ? 1 : -1);
  return {
    x0: hero.x - side * 9 * TILE,
    y0: hero.y + across * TILE,
    dx: side * 18 * TILE,
    dy: 0,
  };
}

function stageAmbientScene() {
  const definition = ambientSceneById(ambientScene.id);
  if (!definition) return false;
  if (definition.kind === 'sound') return true;

  if (definition.needs === 'none') {
    ambientScene.stage = ambientDriftLine(ambientScene.variant);
    return true;
  }
  if (definition.needs === 'room') {
    const run = ambientCellRun((x, y) => isWalkable(x, y), ambientScene.id === 'bats' ? 4 : 5);
    if (!run) return false;
    ambientScene.stage = run;
    return true;
  }
  if (definition.needs === 'lit') {
    const from = ambientHeroCell();
    const flames = ambientFlameSources().filter(({ gridX, gridY }) =>
      Math.hypot(gridX - from.x, gridY - from.y) <= AMBIENT_STAGE_RADIUS
      && revealed.has(`${gridX},${gridY}`));
    if (flames.length === 0) return false;
    ambientScene.lights = flames.map(({ id }) => id);
    ambientScene.smoke = flames.map(({ x, y }) => ({ x, y }));
    return true;
  }
  if (definition.needs === 'door') {
    const from = ambientHeroCell();
    const door = doorDefinitions.find(({ x, y }) =>
      world[y]?.[x] === 'D'
      && Math.hypot(x - from.x, y - from.y) > 3
      && Math.hypot(x - from.x, y - from.y) <= AMBIENT_STAGE_RADIUS
      && revealed.has(`${x},${y}`)
      && hasLineOfSight(world, from, { x, y }));
    if (!door) return false;
    ambientScene.door = door;
    return true;
  }
  if (definition.needs === 'water') {
    // Two cells is enough water to hang over: insisting on three ruled the
    // scene out beside every puddle and most of the shorelines.
    const run = ambientCellRun((x, y) => world[y][x] === '~', 2);
    if (!run) return false;
    ambientScene.stage = run;
    return true;
  }
  return false;
}

/**
 * The line that says what just happened. Without it a rare, unexplained sight is
 * indistinguishable from a glitch — and the whole point of these is that the
 * player knows the dungeon meant it.
 */
function showAmbientNote(id) {
  if (!ambientNote) return;
  ambientNoteText.textContent = ambientLine(id, itemDetailLanguage);
  ambientNote.style.setProperty('--ambient-colour', ambientSceneById(id)?.colour ?? '#9fb6d8');
  ambientNote.classList.add('visible');
  ambientNoteTimer = Math.max(AMBIENT_NOTE_SECONDS, (ambientScene?.duration ?? 0) + 1);
}

/**
 * Примета редкой встречи.
 *
 * Дракон, выпавший на третьем этаже, убивает героя с одного удара. Это честно
 * ровно в том случае, если игрок увидел знак раньше, чем зубы: обойти этаж —
 * тоже решение, но его надо дать принять. Канал тот же, что у прочих заметок
 * об обстановке, только текст приходит с самого этажа, а не из каталога сцен.
 */
function showOmenNote(copy) {
  if (!ambientNote || !copy) return;
  const text = copy[itemDetailLanguage === 'en' ? 'en' : 'ru'];
  if (!text) return;
  ambientNoteText.textContent = text;
  ambientNote.style.setProperty('--ambient-colour', '#c4705a');
  ambientNote.classList.add('visible');
  ambientNoteTimer = Math.max(AMBIENT_NOTE_SECONDS, 6);
}

function rememberAmbientSceneSeen(id) {
  const next = rememberScene(metaState, id);
  if (next.scenes.length === metaState.scenes.length) return;
  metaState = next;
  persistMetaState();
  renderRecords();
}

function finishAmbientScene() {
  ambientScene = null;
}

function updateAmbientScene(delta) {
  if (ambientNoteTimer > 0) {
    ambientNoteTimer = Math.max(0, ambientNoteTimer - delta);
    if (ambientNoteTimer === 0 && ambientNote) ambientNote.classList.remove('visible');
  }
  if (!ambientScene || runStatus !== 'playing' || !playerHasActed || hero.dead) return;

  if (ambientScene.startedAt === null) {
    const waited = elapsed - ambientScene.armedAt;
    if (waited < ambientScene.at) return;
    // A scene that never found a stage is dropped rather than saved up: the
    // floor had its chance, and a hoarded surprise arrives at the wrong moment.
    if (waited > ambientScene.at + AMBIENT_GIVE_UP) {
      ambientScene = null;
      return;
    }
    if (uiScreen !== 'game' || !stageAmbientScene()) return;
    ambientScene.startedAt = elapsed;
    // Sound first, picture second: the ear is what makes the player look up.
    playSound(ambientSceneById(ambientScene.id).sound);
    showAmbientNote(ambientScene.id);
    rememberAmbientSceneSeen(ambientScene.id);
  }

  const age = elapsed - ambientScene.startedAt;
  if (age > ambientScene.duration) {
    finishAmbientScene();
    return;
  }
  runAmbientSceneEffects(age, delta);
}

function ambientStagePoint(u, v) {
  const stage = ambientScene?.stage;
  if (!stage) return null;
  // `v` runs across the walk, so it needs the perpendicular of the same vector.
  const acrossX = -stage.dy;
  const acrossY = stage.dx;
  const length = Math.hypot(acrossX, acrossY) || 1;
  const spread = TILE * 0.9;
  return {
    x: stage.x0 + stage.dx * u + (acrossX / length) * (v - 0.5) * spread,
    y: stage.y0 + stage.dy * u + (acrossY / length) * (v - 0.5) * spread,
  };
}

function runAmbientSceneEffects(age, delta) {
  const id = ambientScene.id;

  if (id === 'draught') {
    // Smoke off dead wicks, which is the whole reason the room goes dark rather
    // than simply dimming: you can see that the fire was put out.
    const thickness = ambientSmokeScale(id, age);
    if (thickness > 0) {
      for (const point of ambientScene.smoke) {
        if (Math.random() > thickness * delta * 26) continue;
        sparks.push({
          x: point.x + (Math.random() - 0.5) * 10,
          y: point.y - 6,
          vx: (Math.random() - 0.5) * 6,
          vy: -13 - Math.random() * 9,
          life: 1.4 + Math.random() * 0.9,
          maxLife: 2.3,
          color: '#6d6a63',
          drift: true,
          size: 3,
          alpha: 0.5,
        });
      }
    }
    return;
  }

  if (id === 'cave-in') {
    const phase = ambientPhaseAt(id, age);
    if (!phase || !ambientScene.stage) return;
    const centre = ambientStagePoint(0.5, 0.5);
    const busy = phase.id === 'fall' ? 34 : phase.id === 'rumble' ? 9 : 5;
    for (let index = 0; index < Math.ceil(busy * delta); index += 1) {
      sparks.push({
        x: centre.x + (Math.random() - 0.5) * TILE * 3.2,
        y: centre.y - 40 - Math.random() * 16,
        vx: (Math.random() - 0.5) * 8,
        vy: 30 + Math.random() * 50,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color: phase.id === 'fall' ? '#8d8175' : '#6f665c',
        size: phase.id === 'fall' ? 3 : 2,
        alpha: 0.7,
      });
    }
    if (phase.id === 'fall' && !ambientScene.shook) {
      ambientScene.shook = true;
      renderShake.amount = Math.max(renderShake.amount, reducedMotion ? 0 : 2.4);
    }
    return;
  }

  if (id === 'far-door' && ambientScene.door) {
    const { x, y } = ambientScene.door;
    const phase = ambientPhaseAt(id, age);
    if (!phase) return;
    dungeonWorld3D.setDoorOpenProgress(x, y, Math.min(1, phase.progress * 1.15));
    if (phase.progress > 0.85 && world[y][x] === 'D') {
      // It really is open afterwards. A door that swings and then is shut again
      // is the one thing here that would genuinely be a bug.
      world[y][x] = '.';
      rebuildDungeonWorld3D();
      dungeonWorld3D.setDoorOpenProgress(x, y, 1);
    }
    return;
  }

  if (id === 'fireflies') {
    for (const actor of ambientActors(id, age, ambientScene.variant)) {
      const point = ambientStagePoint(actor.u, actor.v);
      if (!point || Math.random() > 0.55) continue;
      sparks.push({
        x: point.x,
        y: point.y + actor.lift,
        vx: 0,
        vy: 0,
        life: 0.55 + Math.random() * 0.35,
        maxLife: 0.9,
        color: '#e6f0b4',
        drift: true,
        size: 4,
        alpha: actor.opacity,
      });
    }
  }
}

/** The scene's people, handed to the same billboard pass as everything alive. */
function ambientSceneActors() {
  if (!ambientScene?.startedAt || !ambientScene.stage) return [];
  const age = elapsed - ambientScene.startedAt;
  const actors = [];
  for (const actor of ambientActors(ambientScene.id, age, ambientScene.variant)) {
    if (actor.spark || !actor.sprite || actor.opacity <= 0.01) continue;
    const point = ambientStagePoint(actor.u, actor.v);
    if (!point) continue;
    actors.push({
      id: `ambient:${ambientScene.id}:${actor.key}`,
      path: actor.sprite,
      x: point.x,
      y: point.y,
      size: actor.size,
      facing: actor.facing,
      screenOffsetY: actor.lift,
      opacity: actor.opacity,
      scaleX: 1,
      scaleY: 1,
      hit: false,
    });
  }
  return actors;
}

/** A draught dims the flames it reached; fireflies bring a small light of their own. */
function applyAmbientLight(sources) {
  if (!ambientScene?.startedAt) return sources;
  if (ambientScene.id === 'fireflies' && ambientScene.stage) {
    const glow = ambientActors('fireflies', elapsed - ambientScene.startedAt, ambientScene.variant);
    const strength = glow.reduce((total, actor) => total + actor.opacity, 0) / Math.max(1, glow.length);
    const centre = ambientStagePoint(0.5, 0.5);
    if (centre && strength > 0.05) {
      return [...sources, {
        id: 'ambient-fireflies',
        x: centre.x,
        y: centre.y,
        gridX: Math.floor(centre.x / TILE),
        gridY: Math.floor(centre.y / TILE),
        color: '#cfe08f',
        radius: 1.1 + strength * 1.1,
        phase: 1.7,
        beam: false,
        flame: false,
      }];
    }
  }
  if (ambientScene.lights.length === 0) return sources;
  const scale = ambientLightScale(ambientScene.id, elapsed - ambientScene.startedAt);
  if (scale >= 1) return sources;
  const dimmed = new Set(ambientScene.lights);
  return sources
    .map((source) => (dimmed.has(source.id) ? { ...source, radius: source.radius * scale } : source))
    // A light with no reach left is a light that is out, and the renderer should
    // not spend a shadow map on it.
    .filter(({ radius }) => radius > 0.12);
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
        returnThorns(
          creature,
          damageHero(creature.damage, {
            blocked: block.blocked,
            source: `wildlife:${creature.id}`,
            from: creature,
          }),
        );
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
              // Passing through goes both ways: a hero the deer is ignoring is
              // no more solid to it than it is to the hero. Otherwise a grazing
              // deer the hero has walked into can be pinned where it stands.
              ...(creature.hunted ? [hero] : []),
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

/**
 * A servant's turn. It attacks what is already near the hero, and otherwise
 * walks back to them: the leash is measured from the hero, so a raised thing
 * never wanders off to die alone in the dark.
 */
function updateAllies(delta) {
  updateAllySlots();
  if (allies.length === 0) return;
  const blocked = new Set([
    ...occupiedMonsterCells(monsters, TILE),
    ...allies.filter(({ dead }) => dead === 0).map((ally) => monsterCellKey(ally, TILE)),
  ]);
  for (const ally of allies) {
    ally.hit = Math.max(0, ally.hit - delta);
    ally.attackCooldown = Math.max(0, ally.attackCooldown - delta);
    ally.repathCooldown = Math.max(0, ally.repathCooldown - delta);
    if (ally.dead > 0) {
      ally.dead += delta;
      continue;
    }
    if (runStatus !== 'playing' || hero.dead || !playerHasActed) continue;
    const intent = minionIntent({
      minion: { x: ally.x / TILE, y: ally.y / TILE },
      hero: { x: hero.x / TILE, y: hero.y / TILE },
      enemies: monsters
        .filter((monster) => monster.dead === 0 && (!monster.neutral || monster.provoked))
        .map((monster) => ({
          instanceId: monster.instanceId,
          x: monster.x / TILE,
          y: monster.y / TILE,
          dead: 0,
        })),
    });
    const target = intent.mode === 'attack'
      ? monsters.find(({ instanceId }) => instanceId === intent.targetId) ?? null
      : null;
    if (target && canActorsMelee(ally, target)) {
      ally.route = [];
      if (ally.attackCooldown === 0) {
        ally.attackCooldown = 1 / ally.attackRate;
        ally.facing = target.x < ally.x ? -1 : 1;
        damageMonster(target, ally.damage, '#cfc6ad', {
          style: 'blade',
          sourceX: ally.x,
          sourceY: ally.y,
        });
      }
      continue;
    }
    // Приказов у зверя больше нет — дрессировку убрали. Он идёт рядом и лезет
    // в драку: это всё, что он умеет, и всё, чего от него ждут.
    const chasing = target !== null;
    const errands = [];
    if (intent.mode === 'hold' && !chasing && errands.length === 0) {
      ally.route = [];
      continue;
    }
    if (ally.repathCooldown === 0 || ally.route.length === 0) {
      ally.repathCooldown = 0.28;
      const cells = new Set(blocked);
      cells.delete(monsterCellKey(ally, TILE));
      const routeTo = (point) => findPath(point.x / TILE, point.y / TILE, {
        allowHidden: true,
        start: { x: Math.floor(ally.x / TILE), y: Math.floor(ally.y / TILE) },
        blockedCells: cells,
      });
      let route = chasing ? routeTo(target) : [];
      let onErrand = false;
      for (const errand of route.length > 0 ? [] : errands) {
        route = routeTo(errand);
        if (route.length > 0) {
          onErrand = true;
          break;
        }
      }
      // Nothing to chase and nowhere to go: the beast walks back to the hero.
      if (route.length === 0) {
        route = routeTo(hero);
        if (route.length > 0) route.pop();
      }
      ally.route = route;
    }
    const step = ally.route[0];
    if (!step) continue;
    const dx = step.x - ally.x;
    const dy = step.y - ally.y;
    const distance = Math.hypot(dx, dy);
    const movement = Math.min(distance, delta * TILE * ally.speed);
    if (distance <= 0 || movement <= 0) continue;
    ally.x += (dx / distance) * movement;
    ally.y += (dy / distance) * movement;
    ally.facing = dx < 0 ? -1 : 1;
    if (Math.hypot(step.x - ally.x, step.y - ally.y) < 2) ally.route.shift();
  }
  allies = allies.filter((ally) => ally.dead === 0 || ally.dead < 0.9);
}

function updateWorld(delta) {
  updateDoorOpening(delta);
  updateHeroTerrain();
  refreshVisibleSecrets();
  updateCampFire(delta);
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
  for (const ally of allies) {
    if (ally.dead === 0) occupiedCells.add(monsterCellKey(ally, TILE));
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
        // A raised servant in the way takes the blow meant for the hero.
        const guarding = allyInMeleeOf(monster);
        if (guarding && !canActorsMelee(monster, hero)) {
          damageAlly(guarding, monster.damage);
          continue;
        }
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
          const hit = damageHero(strikeDamage, {
            blocked: block.blocked,
            source: monster.markId ? `${monster.id}@${monster.markId}` : monster.id,
            from: monster,
          });
          returnThorns(monster, hit);
          kindleAttacker(monster, hit);
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
    if (tickThief(monster)) continue;
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
      delta * TILE * monster.speed * currentConditions().monsterSpeedScale * actorEffectModifiers(monster.effects, {
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
          // The watch walks its round through the hero the same way the hero
          // walks through it; the moment it draws, it is an enemy and the hero
          // is a wall again.
          ...(!monster.neutral || monster.provoked ? [hero] : []),
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
  updateAmbientScene(delta);
  pollInteractionUi(delta);
  updateHeroEffectNote(delta);
  updateLevelUpGlow(delta);
  updateAllies(delta);
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
        weaponMagic: projectile.weaponMagic,
      });
    }
    if (projectileDamage > 0 && projectile.channelSeconds > 0) {
      const channelled = channelSpellCooldowns(spellCooldowns, { channelSeconds: projectile.channelSeconds });
      if (channelled.changed) {
        for (const id of Object.keys(spellCooldowns)) delete spellCooldowns[id];
        Object.assign(spellCooldowns, channelled.cooldowns);
        addCombatGlyph(hero.x, hero.y, '\u273f', '#9fd7d2', -74);
        renderSpellBar();
      }
    }
    if (
      projectile.staggerSeconds > 0
      && (target.actorKind === 'wildlife' ? !target.defeated : target.dead === 0)
    ) {
      // A stone does not kill; it buys the hero another step back.
      target.route = [];
      target.attackWindup = 0;
      target.attackRecovery = Math.max(target.attackRecovery ?? 0, projectile.staggerSeconds);
      target.repathCooldown = Math.max(target.repathCooldown ?? 0, projectile.staggerSeconds);
      addCombatGlyph(target.x, target.y, '\u00b7', '#cfd6dc', -52);
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
          weaponMagic: projectile.weaponMagic,
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
          weaponMagic: null,
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
          weaponMagic: null,
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
            weaponMagic: null,
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
          weaponMagic: null,
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
    if (spark.drift) {
      // Smoke off a dead wick and the glow of a firefly both rise and thin out;
      // the ordinary spark pops and falls, and that is not this.
      spark.vx *= 0.99;
      spark.vy *= 0.995;
    } else {
      spark.vx *= 0.92;
      spark.vy = spark.vy * 0.92 + 24 * delta;
    }
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
  // Before anything else lands on the overlay: the water pass ends by rubbing
  // itself off the figures standing in it, and it must not rub off their
  // health bars and damage numbers along with it.
  drawWaterlines();
  drawBloodStains();
  drawGroundMist(false);
  drawWallDrips();
  drawMotes(0);
  drawEnemyTelegraphs();
  drawLoot();
  drawEvents();
  drawProjectiles();
  drawHeroRoute();
  const actors = [
    ...monsters.map((monster) => ({ kind: 'monster', monster, y: monster.y })),
    ...allies.map((ally) => ({ kind: 'monster', monster: ally, y: ally.y })),
    { kind: 'hero', y: hero.y },
  ].sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    if (actor.kind === 'hero') drawPlayer();
    if (actor.kind === 'monster') drawMonster(actor.monster);
  }
  drawHeroEffects();
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

/**
 * One bad frame used to end the game.
 *
 * The next frame was requested by the last line of `animate`, so anything that
 * threw above it — and there are three hundred deliberate `throw`s in the rule
 * modules — stopped the loop for good. The world froze mid-step while the bag,
 * the character sheet and every other DOM button kept working, which reads to a
 * player as "the game hung" and is cured only by reloading the page. Ivan hit it
 * twice in one session, in two unrelated places.
 *
 * A frame is now allowed to fail. The error is reported once and the loop goes
 * on: a single dropped update is a hiccup, a dead loop is a lost run.
 */
let frameFailures = 0;
let frameFailureShown = false;

function reportFrameFailure(phase, error) {
  frameFailures += 1;
  // Loud for the first few, then quiet: a fault that repeats every frame must
  // not bury the message that says what it was.
  if (frameFailures <= 3 || frameFailures % 240 === 0) {
    console.error(`DNG Codex: frame ${frameFailures} failed in ${phase} and was skipped`, {
      screen: uiScreen,
      depth: run?.depth,
      status: runStatus,
      error,
    });
  }
  // Ivan plays on a phone, where the console does not exist. A fault that
  // repeats silently is a fault we never find out about: the game has to say
  // what broke, in words he can photograph.
  if (frameFailureShown || !frameFailureBanner) return;
  frameFailureShown = true;
  frameFailureText.textContent = `${phase}: ${error?.message ?? error} · ${uiScreen}, этаж ${run?.depth ?? '?'}`;
  frameFailureBanner.hidden = false;
}

/**
 * Each phase of a frame stands on its own.
 *
 * Wrapping the whole frame in one `try` kept the loop alive but not the
 * picture: a rule that throws in `updateHero` skips `render()` too, so the
 * world freezes mid-step while the bag and the stick keep working — exactly
 * what Ivan reported twice. Now a broken update costs the update, and the
 * screen still draws.
 */
/**
 * Фокус по кнопкам открытого экрана.
 *
 * Пальцем ходят касанием, геймпадом — фокусом; браузер умеет второе сам,
 * поэтому стик просто двигает по списку того, что можно нажать. Экран, который
 * можно открыть и нельзя тронуть, — половина экрана.
 */
function moveScreenFocus(direction) {
  const screen = document.querySelector(`[data-screen='${uiScreen}']`) ?? document.body;
  const targets = [...screen.querySelectorAll('button, [tabindex]:not([tabindex="-1"])')]
    .filter((node) => !node.disabled && node.offsetParent !== null);
  if (targets.length === 0) return;
  const at = targets.indexOf(document.activeElement);
  const forward = direction === 'down' || direction === 'right';
  const next = at < 0 ? 0 : (at + (forward ? 1 : -1) + targets.length) % targets.length;
  targets[next].focus();
}

/** Полный экран по кнопке: на телевизоре рамка браузера — потерянная треть. */
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

/**
 * Круг — «назад»: закрывает тот экран, который сейчас открыт.
 *
 * Список закрывателей перечислен руками намеренно. Соблазн послать в окно
 * Escape и положиться на клавиатурный обработчик велик, но он знает не все
 * экраны — карту этажа, например, закрывает своя кнопка, — и «назад», который
 * иногда не работает, хуже, чем «назад», которого нет.
 */
function closeTopScreen() {
  if (uiScreen === 'inventory') closeInventory();
  else if (uiScreen === 'character') closeCharacterSheet();
  else if (uiScreen === 'context') closeContextActions({ restoreFocus: true });
  else if (uiScreen === 'map') closeFloorMap();
  // На паузе «назад» означает «продолжить»: кнопки выхода из неё нет, а
  // запереть игрока на паузе с падом в руках — худшее, что может сделать ввод.
  else if (uiScreen === 'menu' && menuMode === 'pause') startGameFromMenu();
  else {
    const close = document.querySelector(`[data-screen='${uiScreen}'] [data-close]`)
      ?? document.querySelector(`[data-screen='${uiScreen}'] [aria-label^='Закрыть']`);
    close?.click();
  }
}

/**
 * Геймпад, раз в кадр.
 *
 * Браузер отдаёт состояние, а не события, поэтому нажатие от удержания отличает
 * модуль ввода, а не этот код. Здесь только раздача: что какая кнопка делает.
 */
/**
 * Кнопки экрана, между которыми ходит выбор стика.
 *
 * Берётся всё видимое, а не список имён и не декоративный класс. Список
 * пришлось бы помнить: добавили завтра кнопку в HUD — пад её не увидит, и
 * никто не заметит, потому что пальцем она нажимается. Класс тоже подвёл бы:
 * у подсказки новичку своё оформление, и вешать на неё чужой класс ради
 * доступности — платить видом за ввод.
 *
 * Поэтому правило простое и не требует дисциплины: кнопка на экране игры
 * доступна стику. Экраны-накладки сюда не попадают — на них выбор уходит в
 * фокус, и до этого места дело не доходит.
 *
 * Стрелки ходьбы исключены намеренно: ходьба на крестовине, и выбирать стиком
 * кнопку «влево», чтобы нажать её крестиком, — это две кнопки вместо одной.
 * Порядок не важен: выбор пространственный и считает по месту на экране.
 */
function padTargets() {
  return [...document.querySelectorAll('button')]
    .filter((node) => !node.closest('[data-move]') && !node.matches('[data-move]'))
    .filter((node) => !node.hidden && !node.disabled && !node.inert)
    .filter((node) => {
      const box = node.getBoundingClientRect();
      if (box.width < 4 || box.height < 4) return false;
      // Спрятанный экран гасит себя прозрачностью на обёртке, а не на каждой
      // кнопке: у самой кнопки и видимость, и прозрачность остаются своими, и
      // наивная проверка тащила в выбор слоты рюкзака из-под закрытого экрана.
      // `checkVisibility` смотрит на всех предков разом.
      if (typeof node.checkVisibility === 'function') {
        return node.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      }
      const style = getComputedStyle(node);
      return style.visibility !== 'hidden' && Number(style.opacity) > 0.05;
    });
}

/** Ключ кнопки: у постоянных — их id, у пересобираемых — их подпись. */
const padKeyOf = (node) => node.id || node.getAttribute('aria-label') || '';

function paintPadTarget(chosen) {
  for (const node of document.querySelectorAll('[data-pad-target]')) {
    if (node !== chosen) delete node.dataset.padTarget;
  }
  if (chosen) chosen.dataset.padTarget = 'true';
}

/**
 * Стик выбирает окно, крестовина ходит.
 *
 * Иван: «кнопок в игре мало — он только ходит и кастует; сделать игру чисто на
 * крестовине, а на стике — выбор окна, которое он хочет нажать, и нижней правой
 * кнопкой открывает». Ходьба — это шаг по клетке, ей нужен щелчок крестовины;
 * стик тогда освобождается под то, чего в игре с тремя кнопками всегда не
 * хватает, — под сам интерфейс.
 */
function pollGamepads(delta) {
  if (typeof navigator.getGamepads !== 'function') return;
  const [pad] = [...navigator.getGamepads()].filter((entry) => entry && entry.connected !== false);
  if (padDebug) {
    padReportLine.hidden = false;
    // Клетка героя стоит в той же строке: «работает ли крестовина» — это
    // вопрос о том, меняется ли она, и глазами по карте его не решить.
    const cell = `${Math.floor(hero.x / TILE)},${Math.floor(hero.y / TILE)}`;
    // Кладбищенский призрак — тоже в строке: найти его глазами в тумане
    // нельзя, а проверять, что он сел куда надо, приходится каждый раз.
    const ghost = graveyardGhost
      ? ` · призрак: ${Math.floor(graveyardGhost.x / TILE)},${Math.floor(graveyardGhost.y / TILE)}`
      : ` · кладбище: ${activeGraveyardRoom ?? 'нет'}`;
    padReportLine.textContent = `герой: ${cell}${ghost} · шаг: ${padLastStep} · экран: ${uiScreen}/${runStatus} · ${padReport(pad)}`;
  }
  if (!pad) {
    paintPadTarget(null);
    padWalkCooldown = 0;
    return;
  }
  const { edge } = readPad(heroPad, pad, delta);
  const walk = padDpadDirection(pad);
  const aim = padStickDirection(pad);
  // Наклон считается один раз на движение стика, а не каждый кадр: иначе выбор
  // пролетает через весь экран за одно движение большого пальца.
  const aimed = aim && aim !== padStick ? aim : null;
  padStick = aim;

  if (uiScreen !== 'game') {
    paintPadTarget(null);
    if (aimed) moveScreenFocus(aimed);
    if (edge.has('cross')) document.activeElement?.click?.();
    if (edge.has('circle') || edge.has('square')) closeTopScreen();
    return;
  }

  /*
   * Новый шаг — только когда прошлый дошёл.
   *
   * Иван: «не работает при движении на моём DualShock 4 на крестовине, всё
   * остальное работает». И правда не работало, причём вызов шага честно
   * возвращал «да»: я выдавал новый шаг каждые сто шестьдесят миллисекунд, а
   * клетка проходится за триста с лишним — герой бесконечно начинал один и тот
   * же шаг заново и стоял на месте. Экранный джойстик не зря молчит, пока
   * `hero.path` не пуст; здесь теперь то же условие.
   *
   * Счётчик жестов растёт на каждый шаг: `stepHeroToward` спрашивает разрешение
   * у защиты от ловушек, а та отличает намерения по нему — «шагни ещё раз, если
   * правда хочешь на ловушку». Касание, мышь и клавиатура его увеличивают,
   * геймпад не увеличивал ни разу.
   */
  const walkReady = walk && hero.path.length === 0 && padWalkCooldown <= 0;
  padWalkCooldown = Math.max(0, padWalkCooldown - delta);
  if (walkReady) {
    padWalkCooldown = PAD_WALK_COOLDOWN;
    inputGesture += 1;
    padLastStep = `${walk}=${queueDirectionalMove(walk)}`;
  }
  const targets = padTargets();
  const rects = targets.map((node) => {
    const box = node.getBoundingClientRect();
    return { id: padKeyOf(node), x: box.left + box.width / 2, y: box.top + box.height / 2 };
  });

  /*
   * Подошёл — выбрано.
   *
   * Иван: «а как выбрать действие с юнитом или объектом?» Целиться стиком в
   * кнопку, которая появилась ровно потому, что ты к ней подошёл, — лишнее
   * движение: игра уже знает, что рядом. Поэтому как только в колонке
   * взаимодействия появляется новое, выбор прыгает туда сам, и крестик
   * открывает карточку без единого наклона. Хочешь не его, а рюкзак — увёл
   * стик, и выбор твой: подсказка не спорит с намерением.
   */
  const interact = [...interactActions.querySelectorAll('.interact-action')];
  const interactKeys = interact.map(padKeyOf).join('|');
  if (interactKeys && interactKeys !== padInteractKeys) padTargetKey = padKeyOf(interact[0]);
  padInteractKeys = interactKeys;

  if (aimed) padTargetKey = chooseTarget({ rects, from: padTargetKey, direction: aimed });
  let chosen = targets.find((node) => padKeyOf(node) === padTargetKey) ?? null;
  // Выбранное исчезло — например, ушла колонка взаимодействия. Не молчим:
  // переносим выбор на рюкзак, он есть всегда.
  if (!chosen && padTargetKey) {
    chosen = bagButton;
    padTargetKey = padKeyOf(bagButton);
  }
  paintPadTarget(chosen);
  if (edge.has('cross')) chosen?.click();
  // Треугольник — полный экран. Ссылкой его не включить: браузер требует
  // действия игрока, а на телевизоре мышью до кнопки не дотянешься.
  if (edge.has('triangle')) toggleFullscreen();
  if (edge.has('options')) openMainMenu();
}

function framePhase(phase, work) {
  try {
    work();
    return true;
  } catch (error) {
    reportFrameFailure(phase, error);
    return false;
  }
}

function animate(time) {
  try {
    const delta = Math.min(0.04, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;
    elapsed += delta;
    if (!document.hidden && ready) {
      framePhase('pads', () => pollGamepads(delta));
      if (uiScreen === 'game') {
        if (arrivalHold > 0) {
          arrivalHold = Math.max(0, arrivalHold - delta);
        } else if (hitStop > 0) {
          hitStop = Math.max(0, hitStop - delta);
        } else {
          for (let step = 0; step < qaSpeed && hitStop === 0 && arrivalHold === 0 && uiScreen === 'game'; step += 1) {
            framePhase('hero', () => updateHero(delta));
            if (hitStop === 0) framePhase('world', () => updateWorld(delta));
          }
        }
        framePhase('onboarding', () => updateOnboarding(time));
      }
      // Static overlays (bag, map, menu…) keep the last frame; live screens render
      // at most ~60 Hz so 120 Hz phones do not double the GPU work.
      framePhase('showreel', () => updateMenuShowreel(delta));
      // Сразу за показом: он и решает, меню сейчас или этаж.
      framePhase('audio', () => refreshRoadAudio());
      const liveWorld = LIVE_WORLD_SCREENS.has(uiScreen) || showreelActive();
      if ((liveWorld && time - lastRenderAt >= RENDER_INTERVAL_MS) || renderedScreen !== uiScreen) {
        if (framePhase('render', render)) renderedScreen = uiScreen;
        lastRenderAt = time;
      }
    }
  } catch (error) {
    reportFrameFailure('frame', error);
  } finally {
    frameId = requestAnimationFrame(animate);
  }
}

function routeHeroBesideCell(cellX, cellY) {
  const routes = neighbouringCells({ x: cellX, y: cellY })
    .filter(({ x, y }) => isWalkable(x, y) && revealed.has(`${x},${y}`))
    .map(({ x, y }) => findPath(x, y, { allowBlockedEnd: false }))
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
  heroRouteVisible = true;
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
    const adjacent = cellStepDistance(heroCell, { x: cellX, y: cellY }) <= 1;
    if (adjacent) {
      openContextActions({ kind: 'merchant', value: merchant });
      return;
    }
    routeHeroBesideCell(cellX, cellY);
    return;
  }
  if (find && findIsInteractable(find) && revealed.has(`${cellX},${cellY}`)) {
    const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
    const adjacent = cellStepDistance(heroCell, { x: cellX, y: cellY }) <= 1;
    if (adjacent) {
      openContextActions({ kind: 'find', value: find });
      return;
    }
    routeHeroBesideCell(cellX, cellY);
    return;
  }
  if (trap && revealed.has(`${cellX},${cellY}`)) {
    const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
    const adjacent = cellStepDistance(heroCell, { x: cellX, y: cellY }) === 1;
    if (adjacent) {
      openContextActions({ kind: 'trap', value: trap });
      return;
    }
    routeHeroBesideCell(cellX, cellY);
    return;
  }
  /*
   * Открытая дверь — проём, а не кнопка.
   *
   * Касание двери было переключателем: нажал — открыл, нажал ещё раз — закрыл.
   * И пока дверь открыта, палец по ней означал ровно одно: «иду туда», — а
   * игра захлопывала её перед героем. Иван: «надо, чтобы если дверь открыта и
   * туда пальцем нажали, персонаж пошёл в открытую дверь, а не открывал-
   * закрывал её; это неудобно». Закрыть дверь по-прежнему можно кнопкой
   * действия слева внизу — там это осознанный выбор, а не промах пальцем.
   */
  if (door && revealed.has(`${door.x},${door.y}`) && !run.floor.opened.includes(door.instanceId)) {
    const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
    if (cellStepDistance(heroCell, door) === 1) {
      openContextActions({ kind: 'door', value: door });
      return;
    }
    routeHeroBesideCell(door.x, door.y);
    return;
  }
  // Somebody standing there who is not an enemy: talk to them if they are in
  // reach, and walk over to them if they are not.
  const person = contextTargetAtCell(cellX, cellY);
  if (person && revealed.has(`${cellX},${cellY}`)) {
    if (contextTargetIsAdjacent(person)) {
      openContextActions(person);
      return;
    }
    routeHeroBesideCell(cellX, cellY);
    return;
  }
  const moved = requestHeroMove(worldX, worldY);
  showMoveMarker(event.clientX, event.clientY, moved);
}

/** Одна картинка по её адресу. Ниже этого уровня грузить нечего. */
function fetchPicture(url) {
  return new Promise((resolve, reject) => {
    const sprite = new Image();
    sprite.decoding = 'async';
    sprite.addEventListener('load', () => resolve(sprite), { once: true });
    sprite.addEventListener(
      'error',
      (error) => reject(new Error(`Cannot load ${url}`, { cause: error })),
      { once: true },
    );
    sprite.src = url;
  });
}

/**
 * Подобранная добыча узнаётся по силуэту, а не по кадру.
 *
 * Спрайт в файле почти всегда меньше своего холста, и вещь на полу, нарисованная
 * по границам кадра, плавает в воздухе. Поэтому у всего, что может лежать на
 * полу, читаются настоящие границы непрозрачных пикселей — один раз, при
 * загрузке.
 */
function measureFloorLoot(path, source, width, height, context = null) {
  if (!floorLootSpritePaths.has(path)) return;
  let readbackContext = context;
  if (!readbackContext) {
    const readback = document.createElement('canvas');
    readback.width = width;
    readback.height = height;
    readbackContext = readback.getContext('2d', { willReadFrequently: true });
    readbackContext.imageSmoothingEnabled = false;
    readbackContext.drawImage(source, 0, 0);
  }
  floorLootSpriteBounds.set(path, opaquePixelBounds(readbackContext.getImageData(0, 0, width, height)));
}

async function loadImage(path) {
  if (!path) throw new Error('Missing preview asset path');
  const sprite = await fetchPicture(assetUrl(path));
  images.set(path, sprite);
  measureFloorLoot(path, sprite, sprite.naturalWidth, sprite.naturalHeight);
}

/**
 * Атлас: полторы тысячи спрайтов одним листом.
 *
 * Каждый спрайт лежал отдельным файлом, и запуск игры был полутора тысячами
 * запросов подряд. На телефоне время съедает не размер — спрайт весит пару
 * килобайт, — а сама очередь. Плюс itch.io не берёт в html-сборку больше
 * тысячи файлов, и в это игра упёрлась.
 *
 * Атлас — это лист со всеми спрайтами и опись, где какой лежит. Запуск
 * становится двумя запросами вместо полутора тысяч.
 *
 * Если атласа нет или он не читается — игра грузит спрайты по-старому. Это не
 * запасной путь на всякий случай, а рабочий: атлас собирается руками, и
 * забытый запуск упаковщика не должен ронять игру.
 */
async function loadSpriteAtlas() {
  let опись = null;
  try {
    const ответ = await fetch(new URL('atlas.json', atlasRoot).href);
    if (!ответ.ok) return null;
    опись = await ответ.json();
  } catch {
    return null;
  }
  if (!опись?.frames || !Array.isArray(опись.sheets) || опись.sheets.length === 0) return null;
  try {
    const листы = await Promise.all(
      опись.sheets.map((имя) => fetchPicture(new URL(имя, atlasRoot).href)),
    );
    return { frames: опись.frames, sheets: листы };
  } catch (error) {
    reportFrameFailure('atlas', error);
    return null;
  }
}

/**
 * Вырезать спрайт из листа.
 *
 * Возвращается холст, а не картинка, и он выдаёт себя за картинку: всё, что
 * рисует спрайты, читает у них `naturalWidth`. Подменить это здесь один раз
 * честнее, чем дописывать «или ширина» в двадцати местах отрисовки.
 */
function sliceFromAtlas(atlas, path) {
  const кадр = atlas.frames[path];
  if (!Array.isArray(кадр)) return false;
  const [лист, x, y, ширина, высота] = кадр;
  const source = atlas.sheets[лист];
  if (!source || !(ширина > 0) || !(высота > 0)) return false;
  const canvas = document.createElement('canvas');
  canvas.width = ширина;
  canvas.height = высота;
  const cut = canvas.getContext('2d', { willReadFrequently: floorLootSpritePaths.has(path) });
  if (!cut) return false;
  cut.imageSmoothingEnabled = false;
  cut.drawImage(source, x, y, ширина, высота, 0, 0, ширина, высота);
  Object.defineProperty(canvas, 'naturalWidth', { value: ширина });
  Object.defineProperty(canvas, 'naturalHeight', { value: высота });
  images.set(path, canvas);
  measureFloorLoot(path, canvas, ширина, высота, cut);
  return true;
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
    // Сначала атлас, и по файлу — только за тем, чего в нём не нашлось.
    const atlas = await loadSpriteAtlas();
    const порознь = [];
    for (const path of uniquePaths) {
      if (!atlas || !sliceFromAtlas(atlas, path)) порознь.push(path);
    }
    await loadImageQueue(порознь);
    spriteSheetSettled = true;
    rebuildDungeonWorld3D();
    ready = true;
    discoverNearbyTraps({ feedback: false });
    sceneStartedAt = elapsed;
    armAmbientScene();
    if (!reducedMotion) {
      burst(hero.x, hero.y - 8, atmosphereThemeFor(dungeon.themeId).heroLight, 18);
      addImpactWave(hero.x, hero.y - 8, atmosphereThemeFor(dungeon.themeId).heroLight, 54, 0);
    }
    updateGearUi();
    renderPack();
    renderCharacterSheet();
    renderAppearanceEditor();
    updateSalvageUi();
    updateHud();
    loadMetaState();
    loadStashState();
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
    // Язык и звук давно живут в настройках; Tab ходит по тому, что видно в меню.
    const controls = [
      startGameButton,
      ...(!newRunFromMenuButton.hidden ? [newRunFromMenuButton] : []),
      editAppearanceButton,
      openOutfitButton,
      openRecordsButton,
      openSettingsButton,
      openCreditsButton,
      openHelpButton,
    ].filter((control) => !control.disabled && !control.hidden);
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
    const controls = [closeItemDetailButton, itemDetailVariant, itemDetailAction].filter(
      (control) => !control.disabled && !control.hidden,
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
  // The reading window floats above whatever screen opened it, so it answers
  // Escape before that screen does.
  if (event.code === 'Escape' && loreIsOpen()) {
    event.preventDefault();
    closeLore();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'inventory') {
    event.preventDefault();
    if (closeItemDetail()) return;
    closeInventory();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'records') {
    event.preventDefault();
    closeRecords();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'settings') {
    event.preventDefault();
    closeSettings();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'credits') {
    event.preventDefault();
    closeCredits();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'help') {
    event.preventDefault();
    closeHelp();
    return;
  }
  if (event.code === 'Escape' && uiScreen === 'outfit') {
    event.preventDefault();
    if (!closeOutfitDetail()) closeOutfit();
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
  /*
   * За открытым окном герой не ходит.
   *
   * Стрелки двигали его при любом экране: при титульном меню, при открытом
   * рюкзаке, при карточке действия. Игрок видел меню, нажимал стрелку «чтобы
   * выбрать пункт» — а герой в это время шёл по этажу за картинкой, мог
   * дойти до развилки и спуститься. Ходить можно только там, где видно, куда
   * идёшь.
   */
  if (uiScreen !== 'game') return;
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
cancelCreationButton.addEventListener('click', backFromCreation);
creationOwnButton.addEventListener('click', () => {
  if (uiScreen !== 'creation') return;
  creationStep = 'custom';
  pendingBuild = createEmptyBuild();
  playSound('ui-tap');
  renderCharacterCreation();
});
confirmCreationButton.addEventListener('click', startRunFromCreation);
/*
 * Один слушатель на все карточки: плитки перерисовываются на каждый выбор, и
 * вешать обработчик на каждую заново — верный способ однажды забыть снять
 * старый.
 */
creationArchetypes.addEventListener('click', (event) => {
  const id = event.target.closest('[data-archetype]')?.dataset.archetype;
  if (!id || uiScreen !== 'creation') return;
  // Повторное касание снимает выбор: иначе от готового героя нельзя уйти к
  // своему, не начав забег.
  pendingBuild = pendingBuild?.archetypeId === id ? createEmptyBuild() : createArchetypeBuild(id);
  playSound('ui-tap');
  renderCharacterCreation();
});
creationAttributeRows.addEventListener('click', (event) => {
  if (uiScreen !== 'creation') return;
  // Название раскрывает объяснение — тем же движением, что и при прокачке.
  const explain = event.target.closest('[data-explain]');
  if (explain) {
    openCreationAttributeId = openCreationAttributeId === explain.dataset.explain
      ? null
      : explain.dataset.explain;
    playSound('ui-tap');
    renderCharacterCreation();
    return;
  }
  const button = event.target.closest('[data-step]');
  if (!button || button.disabled) return;
  pendingBuild = adjustBuildAttribute(pendingBuild, button.dataset.attribute, Number(button.dataset.step));
  playSound('ui-tap');
  renderCharacterCreation();
});
/*
 * Строка открывает карточку, а не покупает.
 *
 * Тот же порядок, что и в прокачке: сперва прочитать, что навык делает и что
 * даст каждая ступень, и только потом решить. Иван про прежний экран: «я вижу
 * кучу навыков, но я в них теряюсь».
 */
creationSkillGroups.addEventListener('click', (event) => {
  const row = event.target.closest('.character-skill-row');
  if (!row || uiScreen !== 'creation') return;
  creationSkillId = creationSkillId === row.dataset.skillId ? null : row.dataset.skillId;
  playSound('ui-tap');
  renderCharacterCreation();
});
creationSkillTake.addEventListener('click', () => {
  if (uiScreen !== 'creation' || creationSkillTake.disabled) return;
  pendingBuild = toggleBuildSkill(pendingBuild, creationSkillTake.dataset.skillId);
  playSound('ui-tap');
  renderCharacterCreation();
});
creationSkillClose.addEventListener('click', () => {
  creationSkillId = null;
  playSound('ui-close');
  renderCharacterCreation();
});
characterSheetButton.addEventListener('click', openCharacterSheet);
closeCharacterSheetButton.addEventListener('click', closeCharacterSheet);
depthBadge.addEventListener('click', openFloorMap);
onboardingDismissButton.addEventListener('click', dismissOnboardingHint);
onboardingSkipButton.addEventListener('click', skipOnboarding);
/*
 * Первое же касание заводит звук.
 *
 * Браузер не пускает звук без жеста, а жест до сих пор считался только на
 * кнопках звука, создании героя и «Продолжить». Открыв игру и слушая меню,
 * игрок не слышал ничего, пока не нажмёт что-то из этого списка — а теперь за
 * меню играет своя тема, и её нужно услышать сразу.
 */
for (const событие of ['pointerdown', 'keydown']) {
  window.addEventListener(событие, () => unlockLevelUpAudio(), { once: true, passive: true });
}

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
musicMuteButton.addEventListener('click', () => {
  unlockLevelUpAudio();
  audioSettings = toggleMusicMute(audioSettings);
  applyAudioSettings();
  playSound('ui-tap');
});
musicVolumeDownButton.addEventListener('click', () => {
  unlockLevelUpAudio();
  audioSettings = adjustMusicVolume(audioSettings, -AUDIO_VOLUME_STEP);
  applyAudioSettings();
  playSound('ui-tap');
});
musicVolumeUpButton.addEventListener('click', () => {
  unlockLevelUpAudio();
  audioSettings = adjustMusicVolume(audioSettings, AUDIO_VOLUME_STEP);
  applyAudioSettings();
  playSound('ui-tap');
});
closeFloorMapButton.addEventListener('click', () => closeFloorMap());
floorMapCenterButton.addEventListener('click', centerFloorMapOnHero);
floorMapLegendToggle.addEventListener('click', toggleFloorMapLegend);
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
openPortalButton.addEventListener('click', openHeroPortal);

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
itemDetailOffhand.addEventListener('click', () => performSelectedItemAction({
  fromDetail: true,
  requestedSlot: 'hand2',
}));
itemDetailAction.addEventListener('click', () => {
  // When the window was opened by the shop, its one button is the shop's.
  if (itemDetailOffer) {
    const { act } = itemDetailOffer;
    closeItemDetail({ restoreFocus: false });
    act();
    return;
  }
  performSelectedItemAction({
    fromDetail: true,
    requestedSlot: itemDetailOffhand.hidden ? null : 'hand1',
  });
});
itemDetailVariant.addEventListener('click', () => performSelectedItemAction({ fromDetail: true, secondary: true }));
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
  const yielded = salvageYield({
    reward: result.reward,
    profile: salvageProfile(currentSkillCapabilities()),
  });
  applyItemState(result.state);
  gold += yielded.gold;
  currencyValue.textContent = String(gold);
  currency.setAttribute(
    'aria-label',
    `${currentMainMenuModel().labels.gold}: ${gold}`,
  );
  markedForSalvage.clear();
  salvageMode = false;
  updateSalvageUi();
  renderPack();
  showLootToast(
    { icon: GOLD_ICON_PATH, rarity: 1 },
    craftingCopy(itemDetailLanguage).salvage(yielded.gold),
  );
  persistRun();
});
restartRunButton.addEventListener('click', () => restartRun());
/** The seed of the day is the same dungeon for everyone until midnight UTC. */
playDailyButton.addEventListener('click', () => {
  const seed = metaModel(metaState, itemDetailLanguage).dailySeed;
  closeRecords();
  if (uiScreen === 'menu') startGameFromMenu();
  restartRun(seed);
  showLootToast({ path: exitVisual().path, rarity: 2 }, feedbackCopy(itemDetailLanguage).dailySeed(seed));
});
openOutfitButton.addEventListener('click', openOutfit);
closeOutfitButton.addEventListener('click', closeOutfit);
outfitRows.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-good-id]');
  if (!button) return;
  openOutfitDetail(button.dataset.goodId);
});
outfitDetailClose.addEventListener('click', closeOutfitDetail);
outfitDetailBuy.addEventListener('click', () => toggleOutfitGood(outfitDetailId, false));
outfitDetailReturn.addEventListener('click', () => toggleOutfitGood(outfitDetailId, true));
outfitStartButton.addEventListener('click', () => {
  closeOutfit();
  if (uiScreen === 'menu') startGameFromMenu();
  restartRun();
});
openRecordsButton.addEventListener('click', openRecords);
closeRecordsButton.addEventListener('click', closeRecords);
openSettingsButton.addEventListener('click', openSettings);
closeSettingsButton.addEventListener('click', closeSettings);
wipeProgressButton.addEventListener('click', wipeProgress);
openCreditsButton.addEventListener('click', openCredits);
closeCreditsButton.addEventListener('click', closeCredits);
openHelpButton.addEventListener('click', openHelp);
brightnessDownButton.addEventListener('click', () => changeBrightness(-1));
brightnessUpButton.addEventListener('click', () => changeBrightness(1));
closeHelpButton.addEventListener('click', closeHelp);
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

if (qaMode) {
  const cellOf = (actor) => ({ x: Math.floor(actor.x / TILE), y: Math.floor(actor.y / TILE) });
  window.__dngQA = Object.freeze({
    state() {
      const stats = currentHeroStats();
      return {
        ready,
        screen: uiScreen,
        runStatus,
        seed: run.seed,
        depth: dungeon.depth,
        branch: run.branch,
        gold,
        hero: {
          ...cellOf(hero),
          hp: Math.round(hero.hp),
          maxHp: stats.maxHp,
          level: hero.level,
          hunger: hero.hunger,
          rest: hero.rest,
          dead: hero.dead,
          skillPoints: hero.skills.points,
          pathLength: hero.path.length,
        },
        exit: { ...dungeon.exit },
        spawn: { ...dungeon.spawn },
        guardianAlive: Boolean(dungeon.objective) && !objectiveBossDefeated(),
        canLeave: canLeaveDungeonFloor({ depth: dungeon.depth, status: runStatus, guardianDefeated: objectiveBossDefeated() }),
        artifact: artifactAvailable(),
        monsters: monsters
          .filter((monster) => monster.dead === 0 && revealed.has(`${cellOf(monster).x},${cellOf(monster).y}`))
          .map((monster) => ({
            id: monster.id,
            ...cellOf(monster),
            hp: Math.round(monster.hp),
            neutral: Boolean(monster.neutral && !monster.provoked),
            boss: monster.instanceId === dungeon.objective?.bossInstanceId,
          })),
        loot: lootDefinitions
          .filter((loot) => revealed.has(`${cellOf(loot).x},${cellOf(loot).y}`))
          .map((loot) => ({ id: loot.definition.id, ...cellOf(loot) })),
        finds: findDefinitions
          .filter((find) => findIsInteractable(find) && revealed.has(`${cellOf(find).x},${cellOf(find).y}`))
          .map((find) => ({ id: find.id, ...cellOf(find) })),
        grid: world.map((row) => row.join('')),
        revealed: [...revealed],
        nearby: nearbyContextTarget()?.kind ?? null,
        bag: { used: backpackItems.filter(Boolean).length, capacity: currentBackpackCapacity() },
      };
    },
    /** Где на экране центр клетки — туда бот и кликает. */
    cellToScreen(x, y) {
      const point = worldToScreen((x + 0.5) * TILE, (y + 0.5) * TILE);
      const inside = point.x > 8 && point.y > 8 && point.x < innerWidth - 8 && point.y < innerHeight - 8;
      // Клетка под крестовиной или кнопкой видна, но касание достанется им.
      const under = inside ? document.elementFromPoint(point.x, point.y) : null;
      return { x: point.x, y: point.y, onScreen: inside && under === canvas };
    },
    /** Длина пешего пути до клетки по правилам героя; 0 — не дойти. */
    pathLength(x, y) {
      return findPath(x, y, { heroMovement: true, allowHidden: true }).length;
    },
    /** Положить вещь в рюкзак: проверить книгу или зелье, не ища их по этажам. */
    grant(id) {
      return grantItem(id, `qa-${id}-${Math.round(elapsed * 1000)}`);
    },
    /** Ранить героя, не убивая: проверить, как выглядит лечение. */
    wound(amount) {
      hero.hp = Math.max(1, hero.hp - Math.max(0, Number(amount) || 0));
      updateHud();
      return Math.round(hero.hp);
    },
  });
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('../sw.js', document.baseURI)).catch(() => {
      // Offline support is optional; a registration failure must not block play.
    });
  });
}
