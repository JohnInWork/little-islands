import { canCloseDoor } from './dcss-rpg-doors.js';
import {
  ARTIFACT_PATH,
  CONTENT_PATHS,
  EXIT_PATH,
  FINAL_GATE_PATH,
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
  salvageInventoryItems,
  unequipItem,
  weaponCombatProfile,
} from './dcss-rpg-rules.js';
import {
  FINAL_DEPTH,
  SANCTUARY_COST,
  canClaimFinalArtifact,
  isTerminalRunStatus,
  shardRewardForMonster,
  useSanctuary,
} from './dcss-rpg-run.js';
import {
  allPlayerFoundationAssetPaths,
  composePlayerLayers,
} from './dcss-rpg-player.js';
import {
  BLOOD_FLOOR_PATHS,
  PIXEL_EFFECT_SCALE,
  VISIBILITY_TUNING,
  allBiomeAssetPaths,
  atmosphereThemeForDepth,
  biomeThemeForDepth,
  deterministicAtmosphereMote,
  fogAnchorsForDungeon,
} from './dcss-rpg-visuals.js';
import { itemPresentation } from './dcss-rpg-item-details.js';
import { INVENTORY_FILTERS, inventorySections } from './dcss-rpg-inventory-ui.js';
import { characterSheetModel } from './dcss-rpg-character-sheet.js';
import { cloneSkillState, deriveSkillCapabilities, learnSkill } from './dcss-rpg-skills.js';
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
import { skillMenuModel } from './dcss-rpg-skill-menu.js';
import { awardHeroExperience } from './dcss-rpg-progression.js';
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
  resolveFindInteraction,
} from './dcss-rpg-finds.js';
import { contextActionModel } from './dcss-rpg-context-actions.js';
import { CHEST_RESOURCE_IDS } from './dcss-rpg-chests.js';
import {
  ACTOR_EFFECTS,
  activeActorEffects,
  actorEffectModifiers,
  createActorEffects,
  monsterInfliction,
  tickActorEffects,
} from './dcss-rpg-effects.js';
import {
  equipmentMagic,
  applyWardedEffect,
  wardActorEffects,
  resolveKillRecovery,
} from './dcss-rpg-magic.js';
import {
  attackCrossedContact,
  combatImpactProfile,
  heroAttackMotion,
  heroAttackTrail,
  monsterAttackMotion,
} from './dcss-rpg-combat-motion.js';
import {
  PASSIVE_CREATURE_PATHS,
  choosePassiveWanderTarget,
  createPassiveCreatureStates,
  passiveWanderPause,
} from './dcss-rpg-passive.js';

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
const startGameButton = document.querySelector('#start-game');
const startGameLabel = document.querySelector('#start-game-label');
const mainMenuHint = document.querySelector('#main-menu-hint');
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
const characterPaperdoll = document.querySelector('#character-paperdoll');
const characterPaperContext = characterPaperdoll.getContext('2d');
const characterIdentity = characterSheet.querySelector('.character-identity');
const moveControl = document.querySelector('#move-control');
const moveStick = document.querySelector('#move-stick');
const moveDirectionButtons = [...moveControl.querySelectorAll('[data-move]')];
const moveMarker = document.querySelector('#move-marker');
const bagButton = document.querySelector('#bag');
const inventory = document.querySelector('#inventory');
const inventoryShell = inventory.querySelector('.inventory-shell');
const packPanel = inventory.querySelector('.pack-panel');
const closeInventoryButton = document.querySelector('#close-inventory');
const inventoryTitle = document.querySelector('#inventory-title');
const inventoryFilters = document.querySelector('#inventory-filters');
const inventoryFilterButtons = [...inventoryFilters.querySelectorAll('[data-inventory-filter]')];
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
const lootName = document.querySelector('#loot-name');
const lootRarity = document.querySelector('#loot-rarity');
const lootSlot = document.querySelector('#loot-slot');
const lootEffect = document.querySelector('#loot-effect');
const lootValue = document.querySelector('#loot-value');
const healthSegments = [...document.querySelectorAll('.health i')];
const combatIndicators = [...document.querySelectorAll('.ailments i')];
const heroEffectsHud = document.querySelector('#hero-effects');
const depthBadge = document.querySelector('.depth');
const runEndScreen = document.querySelector('#run-end-screen');
const restartRunButton = document.querySelector('#restart-run');
const resultDepth = document.querySelector('#result-depth');
const resultShards = document.querySelector('#result-shards');
const resultLevel = document.querySelector('#result-level');
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
const assetRoot = new URL('../assets/dcss-preview/', document.baseURI);
const assetUrl = (path) => new URL(path, assetRoot).href;

const TILE = 64;
const ITEM_LANGUAGE_KEY = 'little-islands:2d:item-language:v1';
const ACTOR_SIZE = 82;
const WORLD_WIDTH = MAP_WIDTH;
const WORLD_HEIGHT = MAP_HEIGHT;
const rarityGlow = ['#9da39c', '#66b47a', '#62a9dc', '#b886d2'];
const combatGlyph = Object.freeze({
  unarmed: '·',
  blade: '⚔',
  heavy: '◆',
  spear: '↟',
  staff: '✦',
  bow: '➶',
});

const waterPaths = ['dngn/water/deep_water.png', 'dngn/water/deep_water2.png'];

const gear = {
  cloak: [
    { layer: 'player/cloak/black.png', icon: 'item/armour/cloak1_leather.png', rarity: 0 },
    { layer: 'player/cloak/blue.png', icon: 'item/armour/cloak2.png', rarity: 1 },
    { layer: 'player/cloak/dragonskin.png', icon: 'item/armour/cloak3.png', rarity: 2 },
    {
      layer: 'player/cloak/ratskin.png',
      icon: 'item/armour/artefact/urand_ratskin_cloak.png',
      rarity: 3,
    },
  ],
  body: [
    {
      layer: 'player/body/leather_heavy.png',
      icon: 'item/armour/leather_armour1.png',
      rarity: 0,
    },
    { layer: 'player/body/plate_black.png', icon: 'item/armour/plate1.png', rarity: 1 },
    {
      layer: 'player/body/dragonarm_shadow.png',
      icon: 'item/armour/blue_dragon_scale_mail.png',
      rarity: 3,
    },
    {
      layer: 'player/body/robe_black_gold.png',
      icon: 'item/armour/robe_art1.png',
      rarity: 2,
    },
    { layer: 'player/body/half_plate.png', icon: 'item/armour/scale_mail1.png', rarity: 1 },
    { layer: 'player/body/robe_red_gold.png', icon: 'item/armour/robe_art2.png', rarity: 2 },
    {
      layer: 'player/body/dragonarm_white.png',
      icon: 'item/armour/silver_dragon_scale_mail.png',
      rarity: 3,
    },
    { layer: 'player/body/vines.png', icon: 'item/armour/artefact/urand_vines.png', rarity: 3 },
  ],
  head: [
    { layer: 'player/head/hood_gray.png', icon: 'item/armour/headgear/hat1.png', rarity: 0 },
    {
      layer: 'player/head/fhelm_gray3.png',
      icon: 'item/armour/headgear/helmet1.png',
      rarity: 1,
    },
    {
      layer: 'player/head/fhelm_horn2.png',
      icon: 'item/armour/headgear/helmet_art1.png',
      rarity: 3,
    },
    {
      layer: 'player/head/wizard_blackgold.png',
      icon: 'item/armour/headgear/hat1.png',
      rarity: 2,
    },
    {
      layer: 'player/head/viking_gold.png',
      icon: 'item/armour/headgear/helmet_art2.png',
      rarity: 2,
    },
    {
      layer: 'player/head/crown_gold2.png',
      icon: 'item/armour/headgear/helmet_art3.png',
      rarity: 3,
    },
    {
      layer: 'player/head/horn_evil.png',
      icon: 'item/armour/headgear/helmet_ego4.png',
      rarity: 2,
    },
    {
      layer: 'player/head/etheric_cage.png',
      icon: 'item/armour/headgear/helmet_ego3.png',
      rarity: 3,
    },
  ],
  hand1: [
    {
      layer: 'player/hand1/short_sword_slant.png',
      icon: 'item/weapon/long_sword1.png',
      rarity: 0,
    },
    {
      layer: 'player/hand1/long_sword_slant2.png',
      icon: 'item/weapon/long_sword1.png',
      rarity: 1,
    },
    {
      layer: 'player/hand1/axe_executioner2.png',
      icon: 'item/weapon/hand_axe1.png',
      rarity: 3,
    },
    {
      layer: 'player/hand1/staff_skull.png',
      icon: 'item/staff/staff00.png',
      rarity: 2,
    },
    { layer: 'player/hand1/battleaxe.png', icon: 'item/weapon/hand_axe2.png', rarity: 1 },
    { layer: 'player/hand1/trident_elec.png', icon: 'item/weapon/spear3.png', rarity: 2 },
    {
      layer: 'player/hand1/artefact/firestarter.png',
      icon: 'item/weapon/artefact/urand_firestarter.png',
      rarity: 3,
    },
    { layer: 'player/hand1/bow_three.png', icon: 'item/weapon/ranged/longbow1.png', rarity: 2 },
  ],
  hand2: [
    {
      layer: 'player/hand2/buckler_green.png',
      icon: 'item/armour/shields/buckler1.png',
      rarity: 0,
    },
    {
      layer: 'player/hand2/shield_knight_gray.png',
      icon: 'item/armour/shields/shield1.png',
      rarity: 1,
    },
    {
      layer: 'player/hand2/doll_only/shield_skull.png',
      icon: 'item/armour/shields/large_shield1.png',
      rarity: 3,
    },
    {
      layer: 'player/hand2/misc/book_red.png',
      icon: 'item/book/book_of_the_dead.png',
      rarity: 2,
    },
    {
      layer: 'player/hand2/shield_of_resistance.png',
      icon: 'item/armour/shields/shield2.png',
      rarity: 2,
    },
    {
      layer: 'player/hand2/lshield_gold.png',
      icon: 'item/armour/shields/large_shield2.png',
      rarity: 3,
    },
    { layer: 'player/hand2/misc/torch.png', icon: 'item/misc/misc_lantern.png', rarity: 1 },
    { layer: 'player/hand2/misc/lantern.png', icon: 'item/misc/misc_orb2.png', rarity: 2 },
  ],
  boots: [
    { layer: 'player/boots/middle_gray.png', icon: 'item/armour/boots2_jackboots.png', rarity: 0 },
    { layer: 'player/boots/middle_green.png', icon: 'item/armour/boots4_green.png', rarity: 1 },
    { layer: 'player/boots/middle_brown2.png', icon: 'item/armour/boots3_stripe.png', rarity: 2 },
    { layer: 'player/boots/middle_gold.png', icon: 'item/armour/boots1_brown.png', rarity: 3 },
  ],
  gloves: [
    { layer: 'player/gloves/glove_black.png', icon: 'item/armour/glove1.png', rarity: 0 },
    { layer: 'player/gloves/glove_gray.png', icon: 'item/armour/glove2.png', rarity: 1 },
    { layer: 'player/gloves/glove_gold.png', icon: 'item/armour/glove3.png', rarity: 2 },
    { layer: 'player/gloves/claws.png', icon: 'item/armour/glove5.png', rarity: 3 },
  ],
  belt: [
    { layer: 'player/legs/belt_gray.png', icon: 'player/legs/belt_gray.png', rarity: 0 },
    { layer: 'player/legs/belt_redbrown.png', icon: 'player/legs/belt_redbrown.png', rarity: 1 },
    { layer: 'player/body/belt1.png', icon: 'player/body/belt1.png', rarity: 2 },
    { layer: 'player/body/belt2.png', icon: 'player/body/belt2.png', rarity: 3 },
  ],
  ring1: [
    { layer: null, icon: 'item/ring/i-regeneration.png', rarity: 2 },
    { layer: null, icon: 'item/ring/i-fire.png', rarity: 1 },
    { layer: null, icon: 'item/ring/i-stealth.png', rarity: 2 },
  ],
  ring2: [
    { layer: null, icon: 'item/ring/i-ice.png', rarity: 1 },
    { layer: null, icon: 'item/ring/i-r-poison.png', rarity: 2 },
    { layer: null, icon: 'item/ring/i-slaying.png', rarity: 3 },
  ],
  amulet: [
    { layer: null, icon: 'item/amulet/artefact/urand_vitality.png', rarity: 3 },
    { layer: null, icon: 'item/amulet/i-spirit.png', rarity: 2 },
    { layer: null, icon: 'item/amulet/i-clarity.png', rarity: 2 },
  ],
};

const effectPaths = [
  ...Array.from({ length: 6 }, (_, index) => `effect/magic_dart${index}.png`),
  'effect/orb_glow0.png',
  'effect/orb_glow1.png',
  ...Array.from({ length: 4 }, (_, index) => `effect/cloud_magic_trail${index}.png`),
];
const requiredPaths = [
  ...waterPaths,
  ...allBiomeAssetPaths(),
  'dngn/doors/closed_door.png',
  'dngn/doors/open_door.png',
  DISARMED_TRAP_PATH,
  ...allPlayerFoundationAssetPaths(),
  ...Object.values(gear).flatMap((items) =>
    items.flatMap(({ layer, icon }) => [layer, icon].filter(Boolean)),
  ),
  ...CONTENT_PATHS,
  ...allEnvironmentAssetPaths(),
  ...FIND_ASSET_PATHS,
  ...effectPaths,
  ...PASSIVE_CREATURE_PATHS,
];

const images = new Map();
const restored = loadRun();
const storedRun = restored?.run ?? null;
const restoredDungeon = restored?.dungeon ?? null;
const freshSeed = createSeed();
let run = storedRun ?? createRun(freshSeed);
let dungeon = restoredDungeon ?? generateDungeon({
  seed: run.seed,
  depth: 1,
  scalingVersion: run.scalingVersion,
  difficulty: run.difficulty,
});
let world = dungeon.grid;
const selected = { ...run.equipment };
let itemInstances = new Map(run.items.map((record) => [record.uid, materializeInventoryItem(record)]));
let backpackItems = run.inventory.map((uid) => itemInstances.get(uid)).filter(Boolean);
const revealed = new Set(run.floor.revealed);
revealAround(revealed, world, { x: run.hero.x, y: run.hero.y }, 4);
let dungeonEnvironment = createDungeonEnvironment(dungeon);
let lootDefinitions = createLootDefinitions(dungeon);
let eventDefinitions = createEventDefinitions(dungeon);
let findDefinitions = createFindDefinitions(dungeon);
let trapDefinitions = trapsFromDungeon(dungeon);
let detectedTrapIds = new Set(run.floor.detectedTrapIds);
let hazardInputState = createHazardInputState();
let permittedHazardCell = null;
let inputGesture = 0;
let doorDefinitions = dungeon.doors.map((door) => ({ ...door }));

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
  hp: run.hero.hp,
  maxHp: run.hero.maxHp,
  level: run.hero.level,
  xp: run.hero.xp,
  power: run.hero.power,
  effects: createActorEffects(run.hero.effects),
  skills: cloneSkillState(run.hero.skills),
  hurt: 0,
  guardFlash: 0,
  dead: run.status === 'dead',
};
const camera = { x: hero.x, y: hero.y };
let monsters = createMonsters(dungeon);
let passiveCreatures = createPassiveCreatureStates(dungeon, TILE);
const sparks = [];
const impactWaves = [];
const projectiles = [];
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
let inventoryFilter = 'all';
let salvageMode = false;
let toastTimer = 0;
let toastVisible = false;
const lootToastQueue = [];
let itemDetailLanguage = loadItemDetailLanguage();
let itemDetailItem = null;
let itemDetailReturnTarget = null;
let shards = run.shards;
let deathTimer = 0;
let runStatus = run.status;
let playerHasActed = run.started;
let openingDoor = null;
let contextTarget = null;
let contextInspected = false;
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
  });
}

function renderMainMenu() {
  const model = currentMainMenuModel();
  const { labels } = model;
  document.documentElement.lang = model.language;
  document.title = `${model.title} · RPG`;
  mainMenuTitle.setAttribute('aria-label', model.title);
  startGameLabel.textContent = model.action;
  startGameButton.setAttribute('aria-label', model.action);
  mainMenuHint.textContent = model.hint;
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
  canvas.setAttribute('aria-label', labels.dungeon);
  hud.setAttribute('aria-label', labels.hud);
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
  updateInventoryFilterUi();
  salvageButton.setAttribute('aria-label', labels.salvage);
  salvageConfirm.setAttribute('aria-label', labels.salvageConfirm);
  salvageLabel.textContent = labels.salvageShort;
  salvageConfirmLabel.textContent = labels.salvageConfirmShort;
  sanctuaryAction.setAttribute('aria-label', labels.sanctuary);
  bossHud.setAttribute('aria-label', labels.guardian);
  bossHealth.setAttribute('aria-label', labels.guardianHealth);
  restartRunButton.setAttribute('aria-label', labels.restart);
}

function setInterfaceLanguage(language) {
  itemDetailLanguage = language === 'en' ? 'en' : 'ru';
  persistItemDetailLanguage();
  renderMainMenu();
  if (!ready) return;
  renderCharacterSheet();
  if (itemDetailItem) renderItemDetail(itemDetailItem);
  updateGearUi();
  renderPack();
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
  return {
    ...definition,
    uid: record.uid,
    stack: record.stack ?? definition.stack,
  };
}

function createMonsters(level) {
  return createMonsterStates(level, TILE);
}

function createLootDefinitions(level) {
  return level.loot.map((spawn) => ({
    ...spawn,
    definition: lootById(spawn.id),
    x: (spawn.x + 0.5) * TILE,
    y: (spawn.y + 0.5) * TILE,
  }));
}

function createEventDefinitions(level) {
  return level.events.map((spawn) => ({
    ...spawn,
    definition: eventById(spawn.id),
    x: (spawn.x + 0.5) * TILE,
    y: (spawn.y + 0.5) * TILE,
  }));
}

function createFindDefinitions(level) {
  return level.finds.map((find) => ({
    ...find,
    definition: findById(find.id),
    x: (find.x + 0.5) * TILE,
    y: (find.y + 0.5) * TILE,
    resolved: find.resolved || run.floor.resolvedFindIds.includes(find.instanceId),
  }));
}

function captureRun() {
  run.depth = dungeon.depth;
  run.hero = {
    x: Math.floor(hero.x / TILE),
    y: Math.floor(hero.y / TILE),
    hp: hero.hp,
    maxHp: hero.maxHp,
    level: hero.level,
    xp: hero.xp,
    power: hero.power,
    effects: createActorEffects(hero.effects),
    skills: cloneSkillState(hero.skills),
  };
  run.shards = shards;
  run.status = runStatus;
  run.started = playerHasActed;
  run.equipment = { ...selected };
  run.inventory = backpackItems.filter(Boolean).map(({ uid }) => uid);
  const activeUids = new Set([...run.inventory, ...Object.values(selected).filter(Boolean)]);
  run.items = [...itemInstances.values()]
    .filter((item) => activeUids.has(item.uid))
    .map(({ id, uid, stack }) => ({ id, uid, ...(stack ? { stack } : {}) }));
  run.floor.revealed = [...revealed];
  run.floor.detectedTrapIds = [...detectedTrapIds].sort();
  run.floor.disarmedTrapIds = [...run.floor.disarmedTrapIds].sort();
  run.floor.resolvedFindIds = findDefinitions
    .filter(({ resolved }) => resolved)
    .map(({ instanceId }) => instanceId)
    .sort();
  run.floor.monsters = monsters
    .filter((monster) => monster.dead === 0)
    .map((monster) => ({
      instanceId: monster.instanceId,
      x: monster.x / TILE - 0.5,
      y: monster.y / TILE - 0.5,
      hp: monster.hp,
    }));
  run.floor.passives = passiveCreatures.map((creature) => ({
    instanceId: creature.instanceId,
    x: creature.x / TILE - 0.5,
    y: creature.y / TILE - 0.5,
    wanderStep: creature.wanderStep,
    facing: creature.facing,
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

function visualForItem(item) {
  return item?.slot && Number.isInteger(item.variant) ? gear[item.slot]?.[item.variant] ?? null : null;
}

function currentHeroStats(equipment = selected, items = itemInstances) {
  return deriveHeroStats(hero, equipment, items);
}

function currentHeroMagic() {
  return equipmentMagic(selected, itemInstances);
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
    },
    capabilities: deriveSkillCapabilities(hero.skills),
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
  if (selection.item.slot) {
    return { label: labels.equipShort, ariaLabel: labels.equip, glyph: '▲', disabled: false };
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
    after: deriveHeroStats(hero, result.state.equipment, result.state.items),
  };
}

function comparisonCopy(row) {
  const sign = row.delta > 0 ? '+' : '−';
  return `${sign}${Math.abs(row.delta)}${row.suffix}`;
}

function renderItemDetail(item) {
  const selection = selectedUiItem();
  const presentation = itemPresentation(
    item,
    itemDetailLanguage,
    selection?.item.uid === item.uid ? selectedActionStats(selection) : null,
  );
  const color = rarityGlow[item.rarity] ?? rarityGlow[0];
  itemDetail.lang = itemDetailLanguage;
  itemDetailCard.style.setProperty('--rarity', color);
  itemDetailName.textContent = presentation.name;
  itemDetailRarity.textContent = `${presentation.rarity} ${presentation.rarityMarks}`;
  itemDetailSlot.textContent = presentation.slot;
  itemDetailIcon.src = assetUrl(item.icon);
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

function renderCharacterSkills() {
  const model = skillMenuModel({
    state: hero.skills,
    heroLevel: hero.level,
    runStatus,
    language: itemDetailLanguage,
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
      name.textContent = `${skill.name} ${skill.rank}/${skill.maxRank}`;
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
        const result = learnSkill({
          state: hero.skills,
          heroLevel: hero.level,
          runStatus,
          skillId: skill.id,
          expectedRank: skill.rank,
        });
        if (!result.ok) return;
        hero.skills = result.state;
        hero.hp = Math.min(hero.hp, currentHeroStats().maxHp);
        discoverNearbyTraps();
        updateGearUi();
        renderPack();
        updateHud();
        persistRun();
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
      (selector ? packGrid.querySelector(selector) : closeInventoryButton)?.focus();
    });
  }
  return true;
}

function applyItemState(state) {
  itemInstances = new Map(state.items.map((item) => [item.uid, item]));
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
}

function isWalkable(x, y) {
  return x >= 0 && y >= 0 && x < WORLD_WIDTH && y < WORLD_HEIGHT && world[y][x] === '.';
}

function canActorsMelee(attacker, target) {
  return canActorsMeleeContact(world, attacker, target, TILE);
}

function monsterSeesHero(monster, distanceToHero) {
  if (distanceToHero > TILE * monster.vision) return false;
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
  return Math.hypot(to.x - from.x, to.y - from.y) <= 5.2 && hasLineOfSight(world, from, to);
}

function findPath(
  targetX,
  targetY,
  { allowHidden = false, start = null, blockedCells = null, allowBlockedEnd = true, allowedHazardCell = null } = {},
) {
  const startCell = start ?? { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const end = { x: Math.floor(targetX), y: Math.floor(targetY) };
  if (!isWalkable(end.x, end.y)) return [];
  if (!allowHidden && !revealed.has(`${end.x},${end.y}`)) return [];
  let navigationGrid = allowHidden
    ? world
    : world.map((row, y) => row.map((cell, x) => (revealed.has(`${x},${y}`) ? cell : '#')));
  // Enemy paths still use their own occupancy rules. Only the player's known
  // traps are obstacles; hidden mechanisms must not leak through route finding.
  const hazards = allowHidden ? new Set() : knownTrapCells();
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
  return blockingActorCells(passiveCreatures, TILE);
}

function heroBlockingCells() {
  return blockingActorCells([...monsters, ...passiveCreatures], TILE);
}

function blockingFindCells() {
  return new Set(
    findDefinitions
      .filter((find) => !find.resolved || find.id !== 'crystal-vein')
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
    capabilities: deriveSkillCapabilities(hero.skills),
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
    capabilities: deriveSkillCapabilities(hero.skills),
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
    capabilities: deriveSkillCapabilities(hero.skills),
    detectedTrapIds: [...detectedTrapIds],
    resolvedEventIds: run.floor.resolved,
    hasLineOfSight: (from, to) => hasLineOfSight(world, from, to),
  });
  const newlyDetected = next.filter((id) => !detectedTrapIds.has(id));
  if (newlyDetected.length === 0) return false;
  detectedTrapIds = new Set(next);
  const hazards = knownTrapCells();
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
    knownCells: knownTrapCells(),
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
  if (isWalkable(target.x, target.y) && revealed.has(`${target.x},${target.y}`)) {
    playerHasActed = true;
  }
  let path = findPath(targetX, targetY, {
    blockedCells: passiveOccupiedCells(),
    allowBlockedEnd: false,
    allowedHazardCell: intent.permittedCell,
  });
  if (path.length === 0 && isWalkable(target.x, target.y) && revealed.has(`${target.x},${target.y}`)) {
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
  const drawWidth = size * (options.scaleX ?? 1);
  const drawHeight = size * (options.scaleY ?? 1);
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
  context.drawImage(sprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
}

function isOpenSurface(x, y) {
  const cell = world[y]?.[x];
  return cell !== undefined && cell !== '#' && cell !== 'D';
}

function playerLayers() {
  return composePlayerLayers({
    cloakVisual: visualForItem(equippedItem('cloak')),
    bodyVisual: visualForItem(equippedItem('body')),
    beltVisual: visualForItem(equippedItem('belt')),
    bootsVisual: visualForItem(equippedItem('boots')),
    glovesVisual: visualForItem(equippedItem('gloves')),
    headVisual: visualForItem(equippedItem('head')),
    hand1Visual: visualForItem(equippedItem('hand1')),
    hand2Visual: visualForItem(equippedItem('hand2')),
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
  dungeonWorld3D.syncActors({
    hero: {
      layers: playerLayers(),
      x: hero.x + motion.dx,
      y: hero.y + motion.dy,
      size: ACTOR_SIZE,
      facing: hero.facing,
      screenOffsetY: -13 + motion.bob,
      opacity: hero.dead ? Math.max(0.2, 1 - deathProgress * 0.8) : 1,
      rotation: deathProgress * hero.facing * 0.8,
      scaleX: motion.attackMotion.scaleX,
      scaleY: motion.attackMotion.scaleY,
      hit: hero.hurt > 0,
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
          const bob = reducedMotion
            ? 0
            : Math.sin(elapsed * 2.4 + monster.phase) * (monster.flying ? 5 : 1.7);
          return {
            id: monster.instanceId,
            path: monster.spritePath,
            x: monster.x + motion.dx,
            y: monster.y + motion.dy,
            size: monster.boss ? 100 : monster.large ? 90 : monster.flying ? 69 : 76,
            facing: monster.facing,
            screenOffsetY: -10 + bob,
            opacity: monster.dead > 0 ? Math.max(0, 1 - monster.dead / 0.72) : 1,
            scaleX: motion.scaleX,
            scaleY: motion.scaleY,
            hit: monster.hit > 0,
          };
        }),
      ...passiveCreatures
        .filter((creature) =>
          revealed.has(`${Math.floor(creature.x / TILE)},${Math.floor(creature.y / TILE)}`),
        )
        .map((creature) => {
          const walking = creature.wanderTarget !== null;
          const bob = reducedMotion
            ? 0
            : Math.sin(elapsed * 1.7 + (creature.seed % 19)) * 0.7 +
              (walking ? -Math.abs(Math.sin(creature.stride * 6)) * 1.8 : 0);
          return {
            id: creature.instanceId,
            path: creature.spritePath,
            x: creature.x,
            y: creature.y,
            size: creature.size,
            facing: creature.facing,
            screenOffsetY: -9 + bob,
            opacity: 1,
            scaleX: walking && !reducedMotion ? 1 + Math.sin(creature.stride * 6) * 0.025 : 1,
            scaleY: walking && !reducedMotion ? 1 - Math.sin(creature.stride * 6) * 0.025 : 1,
            hit: false,
            shadowScale: creature.large ? 0.95 : 0.72,
            shadowOpacity: 0.28,
          };
        }),
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
        .filter(({ x, y }) =>
          revealed.has(`${Math.floor(x / TILE)},${Math.floor(y / TILE)}`),
        )
        .map((find) => ({
          id: find.instanceId,
          path: find.definition.path,
          x: find.x,
          y: find.y,
          size: find.definition.size,
          facing: 1,
          screenOffsetY: find.definition.screenOffsetY,
          opacity: find.resolved ? (find.id === 'crystal-vein' ? 0.18 : 0.48) : 1,
          scaleX: find.resolved ? 0.9 : 1,
          scaleY: find.resolved
            ? find.id === 'crystal-vein'
              ? 0.42
              : find.id === 'sealed-cache'
                ? 0.62
                : 1
            : 1,
          hit: false,
          depthBias: WORLD_DECORATION_DEPTH_BIAS,
          shadowScale: find.resolved ? 0.52 : 0.78,
          shadowOpacity: find.resolved ? 0.14 : 0.34,
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
    const color = rarityGlow[rarity];
    const alpha = attackMotion.swing * 0.92;
    context.save();
    context.translate(position.x + dx, position.y + dy - 4);
    context.rotate(hero.targetAngle);
    context.strokeStyle = color;
    context.fillStyle = color;
    context.globalAlpha = alpha;
    context.lineWidth = hero.attackStyle === 'heavy' ? 6 : 4;
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
      const radius = hero.attackStyle === 'heavy' ? 48 : 42;
      const segments = hero.attackStyle === 'heavy' ? 9 : 7;
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
    const guardProgress = hero.guardFlash / 0.22;
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

function drawHeroEffects() {
  const active = activeActorEffects(hero.effects);
  if (active.length === 0 || hero.dead) return;
  const motion = playerMotion();
  const centerX = motion.position.x + motion.dx;
  const centerY = motion.position.y + motion.dy - 13 + motion.bob;
  if (hero.effects.wet > 0) drawWetHero(centerX, centerY);
  if (hero.effects.poison > 0) drawPoisonedHero(centerX, centerY);
  if (hero.effects.chilled > 0) drawChilledHero(centerX, centerY, hero.effects.wet > 0);
  if (hero.effects.burning > 0) drawBurningHero(centerX, centerY);
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
  if (cell === 'D') return 'dngn/doors/closed_door.png';
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
      if (world[y][x] !== '~') continue;
      const wave = Math.floor(elapsed * 1.5 + hash(x, y)) % waterPaths.length;
      drawSprite(waterPaths[wave], (x + 0.5) * TILE, (y + 0.5) * TILE, TILE + 1, {
        alpha: 0.58,
      });
    }
  }
}

function drawLoot() {
  for (const loot of lootDefinitions) {
    const gridX = Math.floor(loot.x / TILE);
    const gridY = Math.floor(loot.y / TILE);
    if (!revealed.has(`${gridX},${gridY}`)) continue;
    const { x, y } = loot;
    const glow = rarityGlow[loot.definition.rarity];
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 3.1 + gridX) * 2;
    const position = worldToScreen(x, y);
    const rarity = loot.definition.rarity;
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
    drawSprite(loot.definition.icon, x, y, 44, { offsetY: -7 + pulse });
  }
}

function drawEvents() {
  if (
    dungeon.sanctuary &&
    revealed.has(`${dungeon.sanctuary.x},${dungeon.sanctuary.y}`)
  ) {
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 2.1) * 2;
    drawSprite(
      SANCTUARY_PATH,
      (dungeon.sanctuary.x + 0.5) * TILE,
      (dungeon.sanctuary.y + 0.5) * TILE,
      68,
      { offsetY: -5 + pulse },
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
      drawSprite(event.definition.path, event.x, event.y, known ? 46 : 34, {
        offsetY: 3,
        alpha: known ? 1 : 0.28,
      });
      continue;
    }
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 2.2 + gridX) * 2;
    drawSprite(event.definition.path, event.x, event.y, 62, {
      offsetY: -5 + pulse,
    });
  }
  for (const trap of trapDefinitions) {
    if (!run.floor.disarmedTrapIds.includes(trap.instanceId)) continue;
    if (!revealed.has(`${trap.x},${trap.y}`)) continue;
    drawSprite(
      DISARMED_TRAP_PATH,
      (trap.x + 0.5) * TILE,
      (trap.y + 0.5) * TILE,
      40,
      { offsetY: 5, alpha: 0.72 },
    );
  }
  if (revealed.has(`${dungeon.exit.x},${dungeon.exit.y}`)) {
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 2.6) * 3;
    const finalFloor = dungeon.depth === FINAL_DEPTH;
    const path = finalFloor
      ? artifactAvailable()
        ? ARTIFACT_PATH
        : FINAL_GATE_PATH
      : EXIT_PATH;
    drawSprite(
      path,
      (dungeon.exit.x + 0.5) * TILE,
      (dungeon.exit.y + 0.5) * TILE,
      artifactAvailable() ? 54 : 64,
      {
        offsetY: artifactAvailable() ? -8 + pulse : pulse,
      },
    );
  }
}

function drawMotes(layer = 1) {
  const theme = atmosphereThemeForDepth(dungeon.depth);
  const worldPixelWidth = WORLD_WIDTH * TILE;
  context.save();
  context.fillStyle = theme.dust;
  for (const mote of motes) {
    if (mote.layer !== layer) continue;
    const drift = reducedMotion ? 0 : elapsed * mote.speed * TILE * (layer + 1);
    const worldX = (mote.x + drift + worldPixelWidth) % worldPixelWidth;
    const worldY = mote.y + (reducedMotion ? 0 : Math.sin(elapsed * 0.7 + mote.phase) * 18);
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
    const size = layer === 2 ? mote.size + 1 : mote.size;
    context.globalAlpha =
      (layer === 2 ? 0.18 : 0.1) +
      (reducedMotion ? 0 : (Math.sin(elapsed * 1.1 + mote.phase) + 1) * 0.04);
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
  const weapon = equippedItem('hand1');
  const color = rarityGlow[weapon?.rarity ?? 0];
  const cosine = Math.cos(hero.targetAngle);
  const sine = Math.sin(hero.targetAngle);
  context.save();
  context.fillStyle = color;
  for (const point of heroAttackTrail(hero.attackStyle, motion.progress)) {
    const position = worldToScreen(
      hero.x + point.x * cosine - point.y * sine,
      hero.y + point.x * sine + point.y * cosine,
    );
    const size = pixelRound(point.size);
    context.globalAlpha = point.alpha * Math.min(1, motion.swing * 1.5);
    context.fillRect(pixelRound(position.x - size / 2), pixelRound(position.y - size / 2), size, size);
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

function drawLighting() {
  const theme = atmosphereThemeForDepth(dungeon.depth);
  const heroPosition = worldToScreen(hero.x, hero.y);
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const sources = atmosphereLightSources();
  const reveal = revealProgress();
  const heroRadius =
    VISIBILITY_TUNING.heroBaseRadius +
    reveal *
      Math.max(
        VISIBILITY_TUNING.heroRevealRadius,
        Math.min(viewportWidth, viewportHeight) * VISIBILITY_TUNING.heroViewportRatio,
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
}

function drawPaperDollTo(targetContext, targetCanvas) {
  targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetContext.imageSmoothingEnabled = false;
  targetContext.fillStyle = '#02030499';
  targetContext.fillRect(46, 166, 100, 8);
  for (const path of playerLayers()) {
    const sprite = image(path);
    if (sprite) targetContext.drawImage(sprite, 16, 28, 160, 160);
  }
}

function drawPaperDoll() {
  drawPaperDollTo(characterPaperContext, characterPaperdoll);
}

function updateSalvageUi() {
  salvageButton.setAttribute('aria-pressed', String(salvageMode));
  document.body.dataset.salvage = String(salvageMode);
  salvageCount.textContent = String(markedForSalvage.size);
  salvageConfirm.querySelector('b').textContent = String(
    [...markedForSalvage].reduce((sum, index) => {
      const item = backpackItems[index];
      return sum + (item ? 2 + item.rarity * 4 : 0);
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
      const index = entry.source === 'pack' ? entry.index : -1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pack-item inventory-row';
      button.dataset.rarity = String(item.rarity);
      button.dataset.slot = item.slot ?? 'consumable';
      if (entry.source === 'pack') button.dataset.packIndex = String(index);
      else {
        button.dataset.equippedSlot = entry.slot;
        button.classList.add('equipped-item-row');
        button.disabled = salvageMode;
      }
      const presentation = itemPresentation(item, itemDetailLanguage);
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
      icon.src = assetUrl(item.icon);
      icon.alt = '';
      const copy = document.createElement('span');
      const name = document.createElement('strong');
      const metadata = document.createElement('span');
      const effect = document.createElement('small');
      copy.className = 'pack-item-copy';
      name.textContent = presentation.name;
      metadata.textContent = entry.source === 'equipment'
        ? `${labels.equipped} · ${labels.slots[entry.slot] ?? presentation.slot}`
        : `${presentation.rarity} · ${presentation.slot}`;
      effect.textContent = `${presentation.primaryEffect.icon} ${presentation.primaryEffect.text}`;
      copy.append(name, metadata, effect);
      const value = document.createElement('span');
      value.className = 'pack-item-value';
      value.textContent = item.stack ? `×${item.stack}` : presentation.rarityMarks;
      value.setAttribute('aria-hidden', 'true');
      button.append(icon, copy, value);

      button.addEventListener('click', () => {
        if (salvageMode) {
          if (entry.source !== 'pack') return;
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
}

function focusSelectedInventoryRow() {
  requestAnimationFrame(() => {
    const selector = selectedEquipmentSlot
      ? `[data-equipped-slot="${selectedEquipmentSlot}"]`
      : selectedPackIndex >= 0
        ? `[data-pack-index="${selectedPackIndex}"]`
        : null;
    (selector ? packGrid.querySelector(selector) : closeInventoryButton)?.focus();
  });
}

function renderLootToast({ item, value }) {
  const definition = item?.id ? lootById(item.id) : null;
  const informative = Boolean(definition);
  const color = rarityGlow[item?.rarity ?? 1] ?? rarityGlow[1];
  lootToast.style.setProperty('--rarity', color);
  lootToast.dataset.informative = String(informative);
  lootToast.querySelector('img').src = assetUrl(item?.icon ?? item?.path);

  if (informative) {
    const presentation = itemPresentation({ ...definition, ...item }, itemDetailLanguage);
    const labels = currentMainMenuModel().labels;
    lootName.textContent = presentation.name;
    lootRarity.textContent = presentation.rarityMarks;
    lootRarity.setAttribute('aria-label', presentation.rarity);
    lootSlot.textContent = `${presentation.rarity} · ${presentation.slot}`;
    lootEffect.textContent = value === 'equipped'
      ? labels.equipped
      : value === 'full'
        ? labels.inventoryFullShort
        : presentation.primaryEffect.text;
    if (definition.shards && typeof value === 'number') lootValue.textContent = `+${value}`;
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
  renderLootToast(entry);
  lootToast.classList.add('visible');
  const informative = Boolean(entry.item?.id && lootById(entry.item.id));
  toastTimer = window.setTimeout(() => {
    lootToast.classList.remove('visible');
    toastTimer = window.setTimeout(() => {
      toastVisible = false;
      showNextLootToast();
    }, 180);
  }, informative ? 2100 : 1250);
}

function showLootToast(item, value = 12) {
  lootToastQueue.push({ item, value });
  if (lootToastQueue.length > 6) lootToastQueue.shift();
  showNextLootToast();
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
  const effects = activeActorEffects(hero.effects, itemDetailLanguage);
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
  depthBadge.setAttribute(
    'aria-label',
    `${currentMainMenuModel().labels.depth} ${dungeon.depth}`,
  );
  bagButton.querySelector('b').textContent = String(
    backpackItems.filter(Boolean).length,
  );
  currencyValue.textContent = String(shards);
  currency.setAttribute(
    'aria-label',
    `${currentMainMenuModel().labels.shards}: ${shards}`,
  );
  renderHeroEffectsHud();
  updateSanctuaryUi();
  updateBossHud();
}

function nearbyFind() {
  if (runStatus !== 'playing') return null;
  const cell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  return findDefinitions
    .filter(
      (find) =>
        !find.resolved &&
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
      power: hero.power,
    },
    shards,
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
  hero.hp = result.state.hero.hp;
  hero.power = result.state.hero.power;
  shards = result.state.shards;
  run.floor.resolvedFindIds = [...result.state.resolvedFindIds];
  find.resolved = true;
  playerHasActed = true;
  if (result.damage > 0) {
    hero.hurt = 0.24;
    burst(hero.x, hero.y - 8, '#b45c58', 12);
    addImpactWave(hero.x, hero.y - 6, '#b45c58', 48, 2);
    addCombatGlyph(hero.x, hero.y, result.damage, '#c76a63');
    addBloodImpact({ ...hero, bloodColor: '#6a302b' }, find.x, find.y, false);
    beginHitStop(0.05);
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
    result.rewardPower > 0
      ? `+${result.rewardPower} · ${result.rewardShards}◆`
      : damagedLoot
        ? `${result.rewardShards}◆ −${result.destroyedShards}`
        : result.rewardShards,
  );
  if (result.noise > 0) alertNearbyMonsters(find.x, find.y, result.noise);
  const rewardCopy = itemDetailLanguage === 'ru'
    ? `${result.rewardShards}◆ получено${result.destroyedShards > 0 ? `, ${result.destroyedShards}◆ уничтожено` : ''}`
    : `${result.rewardShards}◆ recovered${result.destroyedShards > 0 ? `, ${result.destroyedShards}◆ destroyed` : ''}`;
  findAnnouncement.textContent = resultPresentation?.message
    ? `${resultPresentation.message}. ${rewardCopy}`
    : presentation.result;
  updateHud();
  persistRun();
  return true;
}

function alertNearbyMonsters(x, y, radiusInTiles) {
  if (!Number.isFinite(radiusInTiles) || radiusInTiles <= 0) return 0;
  let alertedCount = 0;
  for (const monster of monsters) {
    if (monster.dead > 0 || Math.hypot(monster.x - x, monster.y - y) > radiusInTiles * TILE) continue;
    monster.alerted = Math.max(monster.alerted, monster.pursuit + radiusInTiles);
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
  if (entry.kind === 'door') {
    return { kind: 'door', open: run.floor.opened.includes(entry.value.instanceId) };
  }
  if (entry.kind === 'find') {
    return {
      kind: 'find',
      id: entry.value.id,
      rewardShards: entry.value.rewardShards,
      rewardPower: entry.value.rewardPower,
      riskDamage: entry.value.riskDamage,
      cacheVariant: entry.value.cacheVariant,
      lockTier: entry.value.lockTier,
      trapTier: entry.value.trapTier,
      hazardDamage: entry.value.hazardDamage,
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

function contextTargetIsAdjacent(entry) {
  if (!entry?.value || runStatus !== 'playing') return false;
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const x = entry.kind === 'find' ? Math.floor(entry.value.x / TILE) : entry.value.x;
  const y = entry.kind === 'find' ? Math.floor(entry.value.y / TILE) : entry.value.y;
  const distance = Math.abs(heroCell.x - x) + Math.abs(heroCell.y - y);
  if (entry.kind === 'trap') {
    return distance === 1
      && detectedTrapIds.has(entry.value.instanceId)
      && !run.floor.resolved.includes(entry.value.eventId);
  }
  if (entry.kind === 'find') return distance <= 1 && !entry.value.resolved;
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

function openContextActions(nextTarget) {
  if (!ready || uiScreen !== 'game' || hero.dead || openingDoor || !contextTargetIsAdjacent(nextTarget)) {
    return false;
  }
  clearMoveControl();
  hero.path = [];
  hero.pendingAttack = null;
  contextTarget = nextTarget;
  contextInspected = false;
  uiScreen = 'context';
  document.body.dataset.screen = uiScreen;
  contextActions.inert = false;
  contextActions.setAttribute('aria-hidden', 'false');
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
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
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  if (restoreFocus) requestAnimationFrame(() => bagButton.focus());
  return true;
}

function nearbyContextTarget() {
  const find = nearbyFind();
  if (find) return { kind: 'find', value: find };
  const trap = nearbyDetectedTrap();
  if (trap) return { kind: 'trap', value: trap };
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
    showLootToast({ icon: 'item/gold/16.png', rarity: 2 }, '◆◆◆');
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
  if (!targetOpen && !canCloseDoor({ door, actors: [hero, ...monsters, ...passiveCreatures], tileSize: TILE })) {
    doorAnnouncement.textContent = currentMainMenuModel().labels.doorBlocked;
    addCombatGlyph((door.x + 0.5) * TILE, (door.y + 0.5) * TILE, '!', '#dec982', -36);
    showLootToast({ path: 'dngn/doors/open_door.png', rarity: 0 }, '!');
    return false;
  }
  hero.path = [];
  hazardInputState = createHazardInputState();
  permittedHazardCell = null;
  playerHasActed = true;
  openingDoor = { door, wasOpen, targetOpen, elapsed: 0, duration: reducedMotion ? 0.16 : 0.62 };
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
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const distance =
    Math.abs(heroCell.x - dungeon.sanctuary.x) +
    Math.abs(heroCell.y - dungeon.sanctuary.y);
  const injured = hero.hp < currentHeroStats().maxHp;
  sanctuaryAction.hidden = distance > 1 || !injured;
  sanctuaryAction.disabled = shards < SANCTUARY_COST;
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

function openMainMenu() {
  if (!ready || uiScreen !== 'game') return false;
  clearMoveControl();
  hero.path = [];
  uiScreen = 'menu';
  document.body.dataset.screen = uiScreen;
  mainMenu.inert = false;
  mainMenu.setAttribute('aria-hidden', 'false');
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
  renderMainMenu();
  requestAnimationFrame(() => startGameButton.focus());
  return true;
}

function startGameFromMenu() {
  if (!ready || uiScreen !== 'menu') return false;
  mainMenu.inert = true;
  mainMenu.setAttribute('aria-hidden', 'true');
  if (isTerminalRunStatus(runStatus)) {
    restartRun();
    return true;
  }
  uiScreen = 'game';
  document.body.dataset.screen = uiScreen;
  moveControl.inert = false;
  moveControl.removeAttribute('aria-hidden');
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  startGameButton.blur();
  return true;
}

function openCharacterSheet() {
  if (isTerminalRunStatus(runStatus)) return;
  clearMoveControl();
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
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
  clearMoveControl();
  moveControl.inert = true;
  moveControl.setAttribute('aria-hidden', 'true');
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
  document.body.dataset.screen = uiScreen;
  inventory.setAttribute('aria-hidden', 'true');
  inventory.inert = true;
  bagButton.disabled = false;
  characterSheetButton.disabled = false;
  markedForSalvage.clear();
  salvageMode = false;
  updateSalvageUi();
  bagButton.focus();
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
  const labels = currentMainMenuModel().labels;
  runEndScreen.setAttribute('aria-label', result === 'victory' ? labels.victory : labels.runEnded);
  resultDepth.textContent = romanDepth(dungeon.depth);
  resultShards.textContent = String(shards);
  resultLevel.textContent = String(hero.level);
  bagButton.disabled = true;
  characterSheetButton.disabled = true;
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
}

function useConsumable(item, index) {
  if (item.interactionResource) {
    showLootToast(item, item.stack ?? 1);
    return;
  }
  const maxHp = currentHeroStats().maxHp;
  let feedback = 1;
  if (item.id === 'healing-potion') {
    feedback = Math.min(32, maxHp - hero.hp);
    if (feedback === 0) {
      showLootToast(item, 0);
      return;
    }
    hero.hp += feedback;
  } else if (item.id === 'bread') {
    feedback = Math.min(12, maxHp - hero.hp);
    if (feedback === 0) {
      showLootToast(item, 0);
      return;
    }
    hero.hp += feedback;
  } else if (item.id === 'blink-scroll') {
    hero.x = (dungeon.spawn.x + 0.5) * TILE;
    hero.y = (dungeon.spawn.y + 0.5) * TILE;
    hero.path = [];
    camera.x = hero.x;
    camera.y = hero.y;
  } else {
    hero.power += 1;
  }
  if ((item.stack ?? 1) > 1) item.stack -= 1;
  else {
    itemInstances.delete(item.uid);
    backpackItems.splice(index, 1);
  }
  showLootToast(item, feedback);
  updateHud();
  updateGearUi();
  selectedPackIndex = Math.max(0, Math.min(index, backpackItems.length - 1));
  renderPack();
  focusSelectedInventoryRow();
  persistRun();
}

function performSelectedItemAction({ fromDetail = false } = {}) {
  const selection = selectedUiItem();
  if (!selection) return false;
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

function showWardPulse(id) {
  const definition = ACTOR_EFFECTS[id];
  burst(hero.x, hero.y - 8, definition.color, 7);
  addImpactWave(hero.x, hero.y - 6, definition.color, 44, 0);
  showLootToast({ icon: definition.icon, rarity: 1 }, '◇');
}

function cleanseEquippedWards() {
  const result = wardActorEffects(hero.effects, currentHeroMagic());
  hero.effects = result.effects;
  for (const id of result.cleared) showWardPulse(id);
  return result.cleared.length > 0;
}

function applyHeroStatus(id, duration) {
  const previousDuration = hero.effects[id] ?? 0;
  const result = applyWardedEffect(hero.effects, id, duration, currentHeroMagic());
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
  { style = 'blade', projectile = false, sourceX = hero.x, sourceY = hero.y } = {},
) {
  if (hero.dead || hero.hp <= 0 || runStatus !== 'playing') return;
  if (!monster || monster.dead > 0) return;
  const profile = combatImpactProfile(style, { projectile, boss: monster.boss });
  const dealt = Math.min(monster.hp, damage);
  monster.hit = 0.19;
  monster.hp -= damage;
  const lethal = monster.hp <= 0;
  burst(monster.x, monster.y - 8, color, profile.particles);
  addImpactWave(monster.x, monster.y - 8, color, profile.waveSize, profile.shake);
  addCombatGlyph(monster.x, monster.y, dealt, color);
  addBloodImpact(monster, sourceX, sourceY, lethal);
  beginHitStop(profile.hitStop);
  if (profile.staggers && monster.attackWindup > 0) {
    monster.attackWindup = 0;
    monster.attackRecovery = 0.18;
    addCombatGlyph(monster.x, monster.y, '!', '#e0c778', -66);
  }
  if (monster.hp <= 0) defeatMonster(monster);
  else if (monster.boss) updateBossHud();
}

function launchHeroProjectile(monster, damage, combat, color) {
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
  });
}

function resolvePendingHeroAttack(previousRemaining, nextRemaining) {
  const pending = hero.pendingAttack;
  if (!pending) return;
  if (!attackCrossedContact(previousRemaining, nextRemaining, hero.attackDuration, hero.attackStyle)) {
    if (nextRemaining <= 0) hero.pendingAttack = null;
    return;
  }
  hero.pendingAttack = null;
  const monster = monsters.find(({ instanceId }) => instanceId === pending.targetId);
  if (!monster || monster.dead > 0 || !canHeroAttack(monster, pending.combat)) return;
  if (pending.combat.projectile) {
    launchHeroProjectile(monster, pending.damage, pending.combat, pending.color);
    return;
  }
  damageMonster(monster, pending.damage, pending.color, {
    style: pending.combat.style,
    sourceX: hero.x,
    sourceY: hero.y,
  });
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
  const shardReward = shardRewardForMonster(monster);
  shards += shardReward;
  for (let level = 0; level < progression.levelsGained; level += 1) {
    burst(hero.x, hero.y - 10, '#d4c27e', 18);
  }
  showLootToast({ icon: 'item/gold/16.png', rarity: Math.min(3, monster.tier >> 1) }, shardReward);
  updateHud();
}

function defeatMonster(monster) {
  if (hero.dead || hero.hp <= 0 || runStatus !== 'playing') return;
  if (monster.dead > 0 || run.floor.defeated.includes(monster.instanceId)) return;
  monster.dead = 0.01;
  run.floor.defeated.push(monster.instanceId);
  gainExperience(monster);
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
    showLootToast({ path: ARTIFACT_PATH, rarity: 3 }, '◆');
    burst(monster.x, monster.y - 8, '#d83e82', 28);
    updateBossHud();
  }
  persistRun();
}

function damageHero(amount, { direct = false, impactColor = null, subtle = false } = {}) {
  if (hero.dead || hero.hp <= 0 || runStatus !== 'playing') return null;
  const combat = currentHeroCombat();
  const directDamage = Math.max(0, Math.ceil(amount));
  const result = direct
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
  hero.hurt = subtle ? 0.12 : 0.24;
  hero.guardFlash = !direct && combat.guard > 0 ? 0.22 : 0;
  const color = impactColor ?? (combat.guard > 0 ? '#84b9b8' : '#c25a4f');
  burst(hero.x, hero.y - 8, color, subtle ? 5 : 10);
  addImpactWave(hero.x, hero.y - 8, color, subtle ? 28 : 46, subtle ? 0 : 3);
  if (!subtle) {
    addCombatGlyph(hero.x, hero.y, result.damage, color);
    addBloodImpact({ ...hero, bloodColor: '#6a302b' }, hero.x - Math.cos(hero.targetAngle) * TILE, hero.y - Math.sin(hero.targetAngle) * TILE, result.dead);
    beginHitStop(result.dead ? 0.075 : 0.045);
  }
  updateHud();
  if (!result.dead) return result;
  hero.dead = true;
  runStatus = 'dead';
  hero.path = [];
  hero.pendingAttack = null;
  projectiles.length = 0;
  deathTimer = 1.35;
  persistRun();
  return result;
}

function resolveWorldInteractions() {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const heroCellKey = `${heroCell.x},${heroCell.y}`;
  if (heroCellKey !== lastHeroCell) {
    lastHeroCell = heroCellKey;
    if (revealAround(revealed, world, heroCell, 4)) persistRun();
    discoverNearbyTraps();
    updateSanctuaryUi();
    updateBossHud();
  }

  for (let index = lootDefinitions.length - 1; index >= 0; index -= 1) {
    const loot = lootDefinitions[index];
    if (Math.hypot(loot.x - hero.x, loot.y - hero.y) > TILE * 0.54) continue;
    if (loot.definition.shards) {
      const reward = Math.max(1, loot.amount ?? 1);
      lootDefinitions.splice(index, 1);
      run.floor.collected.push(loot.instanceId);
      shards += reward;
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
    run.floor.collected.push(loot.instanceId);
    burst(loot.x, loot.y - 8, rarityGlow[loot.definition.rarity], 8 + loot.definition.rarity * 4);
    addImpactWave(
      loot.x,
      loot.y - 8,
      rarityGlow[loot.definition.rarity],
      34 + loot.definition.rarity * 10,
      loot.definition.rarity >= 3 ? 2 : 0,
    );
    showLootToast(loot.definition, 1);
    persistRun();
  }

  for (let index = eventDefinitions.length - 1; index >= 0; index -= 1) {
    const event = eventDefinitions[index];
    if (Math.hypot(event.x - hero.x, event.y - hero.y) > TILE * 0.54) continue;
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
      damageHero(value);
    } else {
      eventDefinitions.splice(index, 1);
      run.floor.resolved.push(event.instanceId);
      const reward = value * 5 + dungeon.depth;
      shards += reward;
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
  projectiles.length = 0;
  burst(hero.x, hero.y - 10, '#d83e82', 42);
  showLootToast({ path: ARTIFACT_PATH, rarity: 3 }, 'III');
  persistRun();
  showRunEndScreen('victory');
}

function healAtSanctuary() {
  const result = useSanctuary({
    depth: dungeon.depth,
    hp: hero.hp,
    maxHp: currentHeroStats().maxHp,
    shards,
  });
  if (!result.ok) {
    updateSanctuaryUi();
    return;
  }
  hero.hp = result.state.hp;
  shards = result.state.shards;
  burst(hero.x, hero.y - 8, '#d4c27e', 22);
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
  });
  world = dungeon.grid;
  mistAnchors = createMistAnchors(dungeon);
  voidStarLayers = createVoidStars(dungeon);
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
  };
  monsters = createMonsters(dungeon);
  passiveCreatures = createPassiveCreatureStates(dungeon, TILE);
  lootDefinitions = createLootDefinitions(dungeon);
  eventDefinitions = createEventDefinitions(dungeon);
  findDefinitions = createFindDefinitions(dungeon);
  trapDefinitions = trapsFromDungeon(dungeon);
  detectedTrapIds = new Set();
  hazardInputState = createHazardInputState();
  permittedHazardCell = null;
  doorDefinitions = dungeon.doors.map((door) => ({ ...door }));
  openingDoor = null;
  dungeonEnvironment = createDungeonEnvironment(dungeon);
  revealed.clear();
  revealAround(revealed, world, dungeon.spawn, 4);
  hero.x = (dungeon.spawn.x + 0.5) * TILE;
  hero.y = (dungeon.spawn.y + 0.5) * TILE;
  hero.path = [];
  hero.attack = 0;
  hero.pendingAttack = null;
  hero.guardFlash = 0;
  projectiles.length = 0;
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
  replaceFloor(run.depth);
  showLootToast({ path: EXIT_PATH, rarity: 2 }, romanDepth(run.depth));
}

function restartRun() {
  clearMoveControl();
  run = createRun(createSeed());
  motes = createAtmosphereMotes(run.seed);
  shards = run.shards;
  itemInstances = new Map(run.items.map((record) => [record.uid, materializeInventoryItem(record)]));
  backpackItems = run.inventory.map((uid) => itemInstances.get(uid)).filter(Boolean);
  Object.assign(selected, run.equipment);
  hero.hp = run.hero.hp;
  hero.maxHp = run.hero.maxHp;
  hero.level = run.hero.level;
  hero.xp = run.hero.xp;
  hero.power = run.hero.power;
  hero.effects = createActorEffects(run.hero.effects);
  hero.skills = cloneSkillState(run.hero.skills);
  hero.dead = false;
  runStatus = 'playing';
  playerHasActed = false;
  deathTimer = 0;
  hideRunEndScreen();
  replaceFloor(1);
  updateGearUi();
  renderPack();
}

function updateHeroEffects(delta) {
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
    damageHero(tick.damage, { direct: true, impactColor: color, subtle: true });
  }
  if ((pulsed || tick.expired.length > 0) && !hero.dead) {
    updateHud();
    persistRun();
  }
}

function updateHero(delta) {
  const previousAttack = hero.attack;
  hero.attack = Math.max(0, hero.attack - delta);
  hero.attackCooldown = Math.max(0, hero.attackCooldown - delta);
  hero.hurt = Math.max(0, hero.hurt - delta);
  hero.guardFlash = Math.max(0, hero.guardFlash - delta);
  if (runStatus !== 'playing') return;
  updateHeroEffects(delta);
  if (hero.dead) return;
  resolvePendingHeroAttack(previousAttack, hero.attack);
  updateHeldMove(performance.now());
  if (hero.path.length > 0) {
    const target = hero.path[0];
    const targetCell = monsterCellKey(target, TILE);
    const currentCell = monsterCellKey(hero, TILE);
    const targetBlocked =
      !isWalkable(Math.floor(target.x / TILE), Math.floor(target.y / TILE)) ||
      (knownTrapCells().has(targetCell) && permittedHazardCell !== targetCell) ||
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
          actorEffectModifiers(hero.effects).moveSpeed,
      );
      if (distance > 0) {
        const next = constrainActorMovement({
          actor: hero,
          next: { x: hero.x + (dx / distance) * movement, y: hero.y + (dy / distance) * movement },
          blockers: [...monsters, ...passiveCreatures],
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
  for (const monster of monsters) {
    if (monster.dead > 0) continue;
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
    const weapon = equippedItem('hand1');
    const color = rarityGlow[weapon?.rarity ?? 0];
    const damage = combatDamage(currentHeroStats(), combat);
    hero.pendingAttack = {
      targetId: nearest.instanceId,
      damage,
      color,
      combat: { ...combat },
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
  for (const creature of passiveCreatures) occupied.add(monsterCellKey(creature, TILE));
  const reserved = new Set([
    ...blockingActorCells(monsters, TILE),
    ...heroCells,
    ...blockingFindCells(),
  ]);

  for (const creature of passiveCreatures) {
    creature.wanderCooldown = Math.max(0, creature.wanderCooldown - delta);
    const currentKey = monsterCellKey(creature, TILE);
    occupied.delete(currentKey);

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
        const movement = Math.min(distance, delta * TILE * creature.speed);
        let blocked = false;
        if (distance > 0 && movement > 0) {
          const next = constrainActorMovement({
            actor: creature,
            next: { x: creature.x + (dx / distance) * movement, y: creature.y + (dy / distance) * movement },
            blockers: [hero, ...monsters, ...passiveCreatures],
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
          creature.wanderCooldown = passiveWanderPause(creature);
        } else {
          reserved.add(targetKey);
        }
      }
    }

    if (!creature.wanderTarget && creature.wanderCooldown === 0) {
      const distanceToHero =
        Math.abs(Math.floor(creature.x / TILE) - heroCell.x) +
        Math.abs(Math.floor(creature.y / TILE) - heroCell.y);
      const target = choosePassiveWanderTarget({
        creature,
        grid: world,
        blockedCells: new Set([...occupied, ...reserved, ...heroCells]),
        avoidCell: distanceToHero <= 2 ? heroCell : null,
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
  if (hero.dead) {
    deathTimer -= delta;
    if (deathTimer <= 0) showRunEndScreen('dead');
  }
  const occupiedCells = occupiedMonsterCells(monsters, TILE);
  for (const creature of passiveCreatures) occupiedCells.add(monsterCellKey(creature, TILE));
  const reservedCells = passiveOccupiedCells();
  for (const cell of blockingFindCells()) reservedCells.add(cell);
  if (!hero.dead && hero.path[0]) reservedCells.add(monsterCellKey(hero.path[0], TILE));
  const heroCellKey = monsterCellKey(hero, TILE);
  for (const monster of monsters) {
    monster.hit = Math.max(0, monster.hit - delta);
    monster.attackRecovery = Math.max(0, monster.attackRecovery - delta);
    monster.alertFlash = Math.max(0, monster.alertFlash - delta);
    monster.attackCooldown = Math.max(0, monster.attackCooldown - delta);
    monster.repathCooldown = Math.max(0, monster.repathCooldown - delta);
    monster.alerted = Math.max(0, monster.alerted - delta);
    const previousWindup = monster.attackWindup;
    monster.attackWindup = Math.max(0, monster.attackWindup - delta);
    if (monster.dead > 0) {
      monster.dead += delta;
      continue;
    }
    if (runStatus !== 'playing' || !playerHasActed) continue;
    if (previousWindup > 0) {
      if (monster.attackWindup === 0) {
        monster.attackRecovery = 0.18;
        if (canActorsMelee(monster, hero)) {
          const hit = damageHero(monster.damage);
          const infliction = monsterInfliction(monster);
          if (hit && !hit.dead && infliction) {
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
    if (monster.alerted === 0) continue;
    if (canActorsMelee(monster, hero)) {
      monster.route = [];
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
    if (monster.repathCooldown === 0) {
      monster.repathCooldown = Math.max(0.14, 0.3 - monster.speed * 0.045) + (monster.phase % 0.06);
      const blockedCells = new Set([...occupiedCells, ...reservedCells]);
      blockedCells.delete(monsterCellKey(monster, TILE));
      blockedCells.delete(heroCellKey);
      monster.route = findPath(hero.x / TILE, hero.y / TILE, {
        allowHidden: true,
        start: { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) },
        blockedCells,
      });
      if (monster.route.length > 0) monster.route.pop();
      if (monster.route.length === 0) {
        const approach = meleeApproachPoint(monster, hero, TILE);
        if (approach) monster.route = [approach];
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
    const movement = Math.min(distance, delta * TILE * monster.speed);
    if (distance > 0 && movement > 0) {
      const proposed = {
        x: monster.x + (dx / distance) * movement,
        y: monster.y + (dy / distance) * movement,
      };
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
        monster.repathCooldown = Math.min(monster.repathCooldown, 0.16);
        continue;
      }
      const next = constrainActorMovement({
        actor: monster,
        next: proposed,
        blockers: [hero, ...monsters, ...passiveCreatures],
        tileSize: TILE,
      });
      monster.x = next.x;
      monster.y = next.y;
      monster.facing = dx < -0.1 ? -1 : dx > 0.1 ? 1 : monster.facing;
      if (next.blocked) {
        monster.route = [];
        monster.repathCooldown = Math.min(monster.repathCooldown, 0.16);
      } else {
        reservedCells.add(monsterCellKey(target, TILE));
      }
    }
    if (distance < 2.5) monster.route.shift();
  }
  updatePassiveCreatures(delta);
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index];
    projectile.life -= delta;
    const target = monsters.find((monster) => monster.instanceId === projectile.targetId);
    if (!target || target.dead > 0 || projectile.life <= 0) {
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
    damageMonster(target, projectile.damage, projectile.color, {
      style: projectile.style,
      projectile: true,
      sourceX: projectile.x,
      sourceY: projectile.y,
    });
    projectiles.splice(index, 1);
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
    }
    render();
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
    uiScreen !== 'game' ||
    runStatus !== 'playing' ||
    openingDoor
  ) {
    return;
  }
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
  const trap = trapDefinitions.find(
    (candidate) =>
      candidate.x === cellX
      && candidate.y === cellY
      && detectedTrapIds.has(candidate.instanceId)
      && !run.floor.resolved.includes(candidate.eventId),
  );
  if (find && !find.resolved && revealed.has(`${cellX},${cellY}`)) {
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
}

async function loadImageQueue(paths, concurrency = 12) {
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
    updateSalvageUi();
    updateHud();
    renderMainMenu();
    startGameButton.disabled = false;
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
window.addEventListener('resize', resize);
window.addEventListener('blur', () => clearMoveControl());
window.addEventListener('keydown', (event) => {
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
    const controls = [...mainMenuLanguageButtons, startGameButton];
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
  if (event.code === 'Escape' && uiScreen === 'context') {
    event.preventDefault();
    closeContextActions();
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
characterSheetButton.addEventListener('click', openCharacterSheet);
closeCharacterSheetButton.addEventListener('click', closeCharacterSheet);
characterSheet.addEventListener('pointerdown', (event) => {
  if (event.target === characterSheet) closeCharacterSheet();
});
characterSheetLanguageButton.addEventListener('click', () => {
  setInterfaceLanguage(itemDetailLanguage === 'ru' ? 'en' : 'ru');
});
bagButton.addEventListener('click', openInventory);
closeInventoryButton.addEventListener('click', closeInventory);
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
  shards += result.reward;
  currencyValue.textContent = String(shards);
  currency.setAttribute(
    'aria-label',
    `${currentMainMenuModel().labels.shards}: ${shards}`,
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
window.addEventListener('pagehide', () => {
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
