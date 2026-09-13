import { CONTENT_PATHS, EXIT_PATH, eventById, lootById, monsterById } from './dcss-rpg-content.js';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  SAVE_KEY,
  advanceRunFloor,
  createRun,
  findGridPath,
  generateDungeon,
  hydrateDungeon,
  revealAround,
  validateRun,
} from './dcss-rpg-core.js';

const canvas = document.querySelector('#scene');
const context = canvas.getContext('2d', { alpha: false });
const status = document.querySelector('#status');
const gesture = document.querySelector('#gesture');
const bagButton = document.querySelector('#bag');
const inventory = document.querySelector('#inventory');
const closeInventoryButton = document.querySelector('#close-inventory');
const gearButtons = [...document.querySelectorAll('[data-equip]')];
const packGrid = document.querySelector('#pack-grid');
const selectionCard = document.querySelector('#selection-card');
const equipItemButton = document.querySelector('#equip-item');
const salvageButton = document.querySelector('#salvage');
const salvageCount = document.querySelector('#salvage-count');
const salvageConfirm = document.querySelector('#salvage-confirm');
const currency = document.querySelector('.currency');
const currencyValue = currency.querySelector('b');
const lootToast = document.querySelector('#loot-toast');
const paperdoll = document.querySelector('#paperdoll');
const paperContext = paperdoll.getContext('2d');
const healthSegments = [...document.querySelectorAll('.health i')];
const depthBadge = document.querySelector('.depth');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const assetRoot = new URL('../assets/dcss-preview/', document.baseURI);
const assetUrl = (path) => new URL(path, assetRoot).href;

const TILE = 64;
const ACTOR_SIZE = 82;
const WORLD_WIDTH = MAP_WIDTH;
const WORLD_HEIGHT = MAP_HEIGHT;
const rarityGlow = ['#9da39c', '#66b47a', '#62a9dc', '#b886d2'];

const floorPaths = Array.from({ length: 10 }, (_, index) => `dngn/floor/limestone${index}.png`);
const bloodPaths = [1, 4, 7].map((index) => `dngn/floor/cobble_blood${index}.png`);
const wallPaths = Array.from({ length: 4 }, (_, index) => `dngn/wall/brick_gray${index}.png`);
const vineWallPaths = Array.from(
  { length: 4 },
  (_, index) => `dngn/wall/brick_brown-vines${index + 1}.png`,
);
const waterPaths = ['dngn/water/deep_water.png', 'dngn/water/deep_water2.png'];
const biomeThemes = [
  { floors: floorPaths, walls: wallPaths, accentWalls: vineWallPaths },
  {
    floors: Array.from({ length: 7 }, (_, index) => `dngn/floor/sand${index + 1}.png`),
    walls: Array.from({ length: 8 }, (_, index) => `dngn/wall/sandstone_wall${index}.png`),
    accentWalls: ['dngn/wall/pebble_red0.png', 'dngn/wall/pebble_red1.png'],
  },
  {
    floors: Array.from({ length: 8 }, (_, index) => `dngn/floor/frozen${index}.png`),
    walls: Array.from({ length: 4 }, (_, index) => `dngn/wall/stone_dark${index}.png`),
    accentWalls: ['dngn/wall/crystal_wall_cyan.png', 'dngn/wall/crystal_wall_lightcyan.png'],
  },
  {
    floors: Array.from({ length: 7 }, (_, index) => `dngn/floor/demonic_red${index + 1}.png`),
    walls: Array.from({ length: 7 }, (_, index) => `dngn/wall/hell0${index + 1}.png`),
    accentWalls: ['dngn/wall/bars_red01.png', 'dngn/wall/bars_red02.png'],
  },
];

const gear = {
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

const fixedPlayerLayers = [
  'player/cloak/black.png',
  'player/base/human_m.png',
  'player/legs/metal_gray.png',
  'player/gloves/gauntlet_blue.png',
];
const alternativeLayers = ['player/cloak/dragonskin.png', 'player/gloves/glove_black.png'];
const decorPaths = [
  'dngn/statues/crumbled_column_2.png',
  'dngn/statues/crumbled_column_5.png',
  'dngn/statues/statue_sword.png',
  'dngn/statues/statue_ancient_evil.png',
  'dngn/statues/crumbled_column_1.png',
];
const effectPaths = [
  ...Array.from({ length: 6 }, (_, index) => `effect/magic_dart${index}.png`),
  'effect/orb_glow0.png',
  'effect/orb_glow1.png',
  ...Array.from({ length: 4 }, (_, index) => `effect/cloud_magic_trail${index}.png`),
];
const requiredPaths = [
  ...floorPaths,
  ...bloodPaths,
  ...wallPaths,
  ...vineWallPaths,
  ...waterPaths,
  ...biomeThemes.flatMap(({ floors, walls, accentWalls }) => [...floors, ...walls, ...accentWalls]),
  'dngn/doors/closed_door.png',
  ...fixedPlayerLayers,
  ...alternativeLayers,
  ...Object.values(gear).flatMap((items) =>
    items.flatMap(({ layer, icon }) => [layer, icon].filter(Boolean)),
  ),
  ...CONTENT_PATHS,
  ...decorPaths,
  ...effectPaths,
];

const images = new Map();
let storedRun = loadRun();
let restoredDungeon = null;
if (storedRun) {
  try {
    restoredDungeon = hydrateDungeon(storedRun);
    if (restoredDungeon.grid[storedRun.hero.y]?.[storedRun.hero.x] !== '.') {
      throw new Error('Saved hero position is blocked');
    }
  } catch {
    storedRun = null;
    restoredDungeon = null;
  }
}
const freshSeed = createSeed();
let run = storedRun ?? createRun(freshSeed);
let dungeon = restoredDungeon ?? generateDungeon({ seed: run.seed, depth: 1 });
let world = dungeon.grid;
const selected = Object.fromEntries(
  Object.keys(gear).map((slot) => [
    slot,
    Number.isInteger(run.equipment[slot]) && run.equipment[slot] < gear[slot].length
      ? run.equipment[slot]
      : 0,
  ]),
);
let backpackItems = run.inventory.map(materializeInventoryItem).filter(Boolean);
const revealed = new Set(run.floor.revealed);
revealAround(revealed, world, { x: run.hero.x, y: run.hero.y }, 4);
let decorDefinitions = createDecorDefinitions(dungeon);
let lootDefinitions = createLootDefinitions(dungeon);
let eventDefinitions = createEventDefinitions(dungeon);

const hero = {
  x: (run.hero.x + 0.5) * TILE,
  y: (run.hero.y + 0.5) * TILE,
  path: [],
  facing: 1,
  stride: 0,
  attack: 0,
  attackCooldown: 0.2,
  targetAngle: 0,
  hp: run.hero.hp,
  maxHp: run.hero.maxHp,
  level: run.hero.level,
  xp: run.hero.xp,
  power: run.hero.power,
  hurt: 0,
  dead: false,
};
const camera = { x: hero.x, y: hero.y };
let monsters = createMonsters(dungeon);
const sparks = [];
const motes = Array.from({ length: 70 }, (_, index) => ({
  x: ((index * 197) % (WORLD_WIDTH * 97)) / 97,
  y: ((index * 113) % (WORLD_HEIGHT * 89)) / 89,
  phase: index * 0.83,
  speed: 0.08 + (index % 5) * 0.018,
}));

let viewportWidth = innerWidth;
let viewportHeight = innerHeight;
let deviceScale = 1;
let previousTime = performance.now();
let frameId = 0;
let elapsed = 0;
let ready = false;
let pointerUsed = false;
let uiScreen = 'game';
let selectedPackIndex = 0;
let salvageMode = false;
let toastTimer = 0;
let shards = run.shards;
let deathTimer = 0;
let lastHeroCell = `${Math.floor(hero.x / TILE)},${Math.floor(hero.y / TILE)}`;
const markedForSalvage = new Set();

function createSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0];
}

function loadRun() {
  for (const key of [SAVE_KEY, `${SAVE_KEY}:backup`]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const snapshot = JSON.parse(raw);
      if (validateRun(snapshot)) return snapshot;
    } catch {
      // A broken local snapshot must never prevent a fresh run.
    }
  }
  return null;
}

function materializeInventoryItem(record, index) {
  const definition = lootById(record.id);
  if (!definition) return null;
  return {
    ...definition,
    uid: record.uid ?? `saved-${run.depth}-${index}`,
    stack: record.stack ?? definition.stack,
    removed: false,
  };
}

function createMonsters(level) {
  const hpScale = 1 + (level.depth - 1) * 0.13;
  const damageScale = 1 + (level.depth - 1) * 0.085;
  return level.monsters.map((spawn, index) => {
    const definition = monsterById(spawn.id);
    const hp = Math.max(1, Math.round(definition.hp * hpScale));
    return {
      ...definition,
      instanceId: spawn.instanceId,
      x: (spawn.x + 0.5) * TILE,
      y: (spawn.y + 0.5) * TILE,
      hp,
      maxHp: hp,
      damage: Math.max(1, Math.round(definition.damage * damageScale)),
      hit: 0,
      dead: 0,
      phase: index * 1.7,
      path: [],
      repathCooldown: index * 0.04,
      attackCooldown: 0.35 + (index % 3) * 0.12,
    };
  });
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

function createDecorDefinitions(level) {
  return level.rooms
    .slice(2, 2 + decorPaths.length)
    .map((room, index) => [decorPaths[index % decorPaths.length], room.x + 1.5, room.y + 1.5]);
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
  };
  run.shards = shards;
  run.equipment = { ...selected };
  run.inventory = backpackItems
    .filter((item) => item && !item.removed)
    .map(({ id, uid, stack }) => ({ id, uid, ...(stack ? { stack } : {}) }));
  run.floor.revealed = [...revealed];
  return run;
}

function persistRun() {
  try {
    const previous = localStorage.getItem(SAVE_KEY);
    if (previous) localStorage.setItem(`${SAVE_KEY}:backup`, previous);
    localStorage.setItem(SAVE_KEY, JSON.stringify(captureRun()));
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

function resize() {
  viewportWidth = innerWidth;
  viewportHeight = innerHeight;
  deviceScale = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(viewportWidth * deviceScale));
  canvas.height = Math.max(1, Math.floor(viewportHeight * deviceScale));
  canvas.style.width = `${viewportWidth}px`;
  canvas.style.height = `${viewportHeight}px`;
  context.imageSmoothingEnabled = false;
}

function isWalkable(x, y) {
  return x >= 0 && y >= 0 && x < WORLD_WIDTH && y < WORLD_HEIGHT && world[y][x] === '.';
}

function findPath(targetX, targetY, { allowHidden = false, start = null } = {}) {
  const startCell = start ?? { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const end = { x: Math.floor(targetX), y: Math.floor(targetY) };
  if (!isWalkable(end.x, end.y)) return [];
  if (!allowHidden && !revealed.has(`${end.x},${end.y}`)) return [];
  return findGridPath(world, startCell, end).map((cell) => ({
    x: (cell.x + 0.5) * TILE,
    y: (cell.y + 0.5) * TILE,
  }));
}

function worldToScreen(x, y) {
  return {
    x: x - camera.x + viewportWidth / 2,
    y: y - camera.y + viewportHeight / 2,
  };
}

function drawSprite(path, x, y, size = TILE, options = {}) {
  const sprite = image(path);
  if (!sprite) return;
  const position = worldToScreen(x, y);
  const drawWidth = size * (options.scaleX ?? 1);
  const drawHeight = size * (options.scaleY ?? 1);
  context.save();
  context.globalAlpha = options.alpha ?? 1;
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

function playerLayers() {
  const bodyIndex = selected.body;
  return [
    bodyIndex === 2 ? 'player/cloak/dragonskin.png' : 'player/cloak/black.png',
    'player/base/human_m.png',
    'player/legs/metal_gray.png',
    gear.boots[selected.boots].layer,
    gear.body[bodyIndex].layer,
    bodyIndex === 0 || bodyIndex === 3
      ? 'player/gloves/glove_black.png'
      : 'player/gloves/gauntlet_blue.png',
    gear.head[selected.head].layer,
    gear.hand1[selected.hand1].layer,
    gear.hand2[selected.hand2].layer,
  ].filter(Boolean);
}

function drawPlayer() {
  const position = worldToScreen(hero.x, hero.y);
  const walking = hero.path.length > 0;
  const bob = reducedMotion
    ? 0
    : walking
      ? Math.abs(Math.sin(hero.stride * 7)) * -3
      : Math.sin(elapsed * 2.7) * 1.2;
  const attackProgress = hero.attack > 0 ? 1 - hero.attack / 0.34 : 0;
  const lunge = hero.attack > 0 ? Math.sin(attackProgress * Math.PI) * 10 : 0;
  const dx = Math.cos(hero.targetAngle) * lunge;
  const dy = Math.sin(hero.targetAngle) * lunge;

  context.save();
  context.translate(Math.round(position.x + dx), Math.round(position.y + dy));
  context.scale(hero.facing, 1);
  if (hero.hurt > 0) context.filter = 'brightness(2) sepia(0.7)';
  if (hero.dead) {
    context.globalAlpha = Math.max(0.2, deathTimer / 1.35);
    context.rotate((1 - deathTimer / 1.35) * hero.facing * 0.8);
  }
  context.fillStyle = '#02030399';
  context.beginPath();
  context.ellipse(0, 23, 22, 9, 0, 0, Math.PI * 2);
  context.fill();
  for (const path of playerLayers()) {
    const sprite = image(path);
    if (sprite)
      context.drawImage(
        sprite,
        -ACTOR_SIZE / 2,
        -ACTOR_SIZE / 2 - 13 + bob,
        ACTOR_SIZE,
        ACTOR_SIZE,
      );
  }
  context.restore();

  if (hero.attack > 0) {
    const rarity = Math.max(gear.hand1[selected.hand1].rarity, gear.body[selected.body].rarity);
    context.save();
    context.translate(position.x + dx, position.y + dy - 4);
    context.rotate(hero.targetAngle);
    context.strokeStyle = rarityGlow[rarity];
    context.globalAlpha = Math.sin(attackProgress * Math.PI) * 0.86;
    context.lineWidth = 3;
    context.shadowColor = rarityGlow[rarity];
    context.shadowBlur = 16;
    context.beginPath();
    context.arc(4, 0, 42, -0.9, 0.9);
    context.stroke();
    context.restore();
  }
}

function drawMonster(monster) {
  if (monster.dead > 0.72) return;
  if (!revealed.has(`${Math.floor(monster.x / TILE)},${Math.floor(monster.y / TILE)}`)) return;
  const bob = reducedMotion
    ? 0
    : Math.sin(elapsed * 2.4 + monster.phase) * (monster.flying ? 5 : 1.7);
  const alpha = monster.dead > 0 ? Math.max(0, 1 - monster.dead / 0.72) : 1;
  const size = monster.boss ? 100 : monster.large ? 90 : monster.flying ? 69 : 76;
  const position = worldToScreen(monster.x, monster.y);
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = '#0102038f';
  context.beginPath();
  context.ellipse(position.x, position.y + 22, size * 0.27, size * 0.1, 0, 0, Math.PI * 2);
  context.fill();
  if (monster.hit > 0) {
    context.filter = 'brightness(2.2) sepia(0.6)';
    context.globalAlpha *= 0.65 + monster.hit;
  }
  const sprite = image(monster.path);
  if (sprite)
    context.drawImage(sprite, position.x - size / 2, position.y - size / 2 - 10 + bob, size, size);
  context.restore();

  if (monster.boss && monster.dead === 0) {
    context.save();
    context.globalAlpha = 0.36 + Math.sin(elapsed * 3) * 0.09;
    context.strokeStyle = '#9c618a';
    context.lineWidth = 2;
    context.shadowColor = '#9c618a';
    context.shadowBlur = 18;
    context.beginPath();
    context.ellipse(position.x, position.y + 24, 32, 12, 0, 0, Math.PI * 2);
    context.stroke();
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

function drawWorld() {
  const theme = biomeThemes[Math.floor((dungeon.depth - 1) / 2) % biomeThemes.length];
  const minX = Math.max(0, Math.floor((camera.x - viewportWidth / 2) / TILE) - 1);
  const maxX = Math.min(WORLD_WIDTH - 1, Math.ceil((camera.x + viewportWidth / 2) / TILE) + 1);
  const minY = Math.max(0, Math.floor((camera.y - viewportHeight / 2) / TILE) - 1);
  const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil((camera.y + viewportHeight / 2) / TILE) + 1);
  context.fillStyle = '#040708';
  context.fillRect(0, 0, viewportWidth, viewportHeight);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const cell = world[y][x];
      const centerX = (x + 0.5) * TILE;
      const centerY = (y + 0.5) * TILE;
      const isBlood = cell === '.' && hash(x, y, 17) % 53 === 0;
      const floorPath = isBlood
        ? bloodPaths[hash(x, y) % bloodPaths.length]
        : theme.floors[hash(x, y) % theme.floors.length];
      drawSprite(floorPath, centerX, centerY, TILE + 1);
      if (cell === '~') {
        const wave = Math.floor(elapsed * 1.5 + hash(x, y)) % waterPaths.length;
        drawSprite(waterPaths[wave], centerX, centerY, TILE + 1, { alpha: 0.92 });
      }
    }
  }

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const cell = world[y][x];
      if (cell !== '#' && cell !== 'D') continue;
      const centerX = (x + 0.5) * TILE;
      const centerY = (y + 0.5) * TILE;
      if (cell === 'D') {
        drawSprite('dngn/doors/closed_door.png', centerX, centerY, TILE + 1);
      } else {
        const accented = hash(x, y, 9) % 7 === 0;
        const collection = accented ? theme.accentWalls : theme.walls;
        drawSprite(collection[hash(x, y, 3) % collection.length], centerX, centerY, TILE + 1);
      }
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
    const gradient = context.createRadialGradient(
      position.x,
      position.y + 11,
      2,
      position.x,
      position.y + 11,
      30,
    );
    gradient.addColorStop(0, `${glow}5e`);
    gradient.addColorStop(1, `${glow}00`);
    context.fillStyle = gradient;
    context.fillRect(position.x - 32, position.y - 22, 64, 64);
    drawSprite(loot.definition.icon, x, y, 44, { offsetY: -7 + pulse, glow, blur: 12 });
  }
}

function drawEvents() {
  for (const event of eventDefinitions) {
    const gridX = Math.floor(event.x / TILE);
    const gridY = Math.floor(event.y / TILE);
    if (!revealed.has(`${gridX},${gridY}`)) continue;
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 2.2 + gridX) * 2;
    drawSprite(event.definition.path, event.x, event.y, 62, {
      offsetY: -5 + pulse,
      glow: event.definition.effect === 'damage' ? '#a34b43' : '#b69a59',
      blur: 10,
    });
  }
  if (revealed.has(`${dungeon.exit.x},${dungeon.exit.y}`)) {
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 2.6) * 3;
    drawSprite(EXIT_PATH, (dungeon.exit.x + 0.5) * TILE, (dungeon.exit.y + 0.5) * TILE, 64, {
      offsetY: pulse,
      glow: '#8ea7a3',
      blur: 14,
    });
  }
}

function drawMotes() {
  context.save();
  for (const mote of motes) {
    const x =
      (mote.x * TILE - camera.x + viewportWidth / 2 + elapsed * mote.speed * TILE) %
      (WORLD_WIDTH * TILE);
    const y = mote.y * TILE - camera.y + viewportHeight / 2 + Math.sin(elapsed + mote.phase) * 12;
    if (x < -10 || y < -10 || x > viewportWidth + 10 || y > viewportHeight + 10) continue;
    context.globalAlpha = 0.09 + (Math.sin(elapsed * 1.3 + mote.phase) + 1) * 0.055;
    context.fillStyle = '#d7d2b5';
    context.fillRect(Math.round(x), Math.round(y), 2, 2);
  }
  context.restore();
}

function drawSparks() {
  for (const spark of sparks) {
    const position = worldToScreen(spark.x, spark.y);
    context.save();
    context.globalAlpha = Math.max(0, spark.life / spark.maxLife);
    context.fillStyle = spark.color;
    context.shadowColor = spark.color;
    context.shadowBlur = 9;
    context.fillRect(position.x - 2, position.y - 2, 4, 4);
    context.restore();
  }
}

function drawLighting() {
  const heroPosition = worldToScreen(hero.x, hero.y);
  const darkness = context.createRadialGradient(
    heroPosition.x,
    heroPosition.y,
    70,
    heroPosition.x,
    heroPosition.y,
    Math.max(300, Math.min(viewportWidth, viewportHeight) * 0.68),
  );
  darkness.addColorStop(0, 'rgba(3, 7, 10, 0)');
  darkness.addColorStop(0.52, 'rgba(3, 7, 10, 0.13)');
  darkness.addColorStop(1, 'rgba(2, 5, 8, 0.68)');
  context.fillStyle = darkness;
  context.fillRect(0, 0, viewportWidth, viewportHeight);

  const lights = eventDefinitions
    .slice(0, 4)
    .map((event) => [
      event.x / TILE,
      event.y / TILE,
      event.definition.effect === 'damage' ? '#9a4050' : '#c17841',
    ]);
  for (const [gridX, gridY, color] of lights) {
    const position = worldToScreen(gridX * TILE, gridY * TILE);
    const radius = 96 + Math.sin(elapsed * 4.3 + gridX) * 8;
    const light = context.createRadialGradient(
      position.x,
      position.y,
      0,
      position.x,
      position.y,
      radius,
    );
    light.addColorStop(0, `${color}34`);
    light.addColorStop(0.32, `${color}17`);
    light.addColorStop(1, `${color}00`);
    context.save();
    context.globalCompositeOperation = 'screen';
    context.fillStyle = light;
    context.fillRect(position.x - radius, position.y - radius, radius * 2, radius * 2);
    context.restore();
  }
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
      } else if (Math.hypot(x - heroX, y - heroY) > 5.2) {
        context.fillStyle = '#0204059c';
      } else {
        continue;
      }
      context.fillRect(Math.floor(position.x), Math.floor(position.y), TILE + 1, TILE + 1);
    }
  }
  context.restore();
}

function updateGearUi() {
  for (const button of gearButtons) {
    const slot = button.dataset.equip;
    const item = gear[slot][selected[slot]];
    button.dataset.rarity = String(item.rarity);
    button.querySelector('img').src = assetUrl(item.icon);
  }
  const statValues = document.querySelectorAll('.stats b');
  statValues[0].textContent = String(24 + hero.power * 2 + gear.hand1[selected.hand1].rarity * 4);
  statValues[1].textContent = String(
    12 + gear.body[selected.body].rarity * 4 + gear.hand2[selected.hand2].rarity * 3,
  );
  statValues[2].textContent = String(hero.maxHp);
  document
    .querySelector('.stats')
    .setAttribute(
      'aria-label',
      `Сила ${statValues[0].textContent}, защита ${statValues[1].textContent}, здоровье ${statValues[2].textContent}`,
    );
  drawPaperDoll();
}

function drawPaperDoll() {
  paperContext.clearRect(0, 0, paperdoll.width, paperdoll.height);
  paperContext.imageSmoothingEnabled = false;
  paperContext.fillStyle = '#02030499';
  paperContext.fillRect(46, 166, 100, 8);
  for (const path of playerLayers()) {
    const sprite = image(path);
    if (sprite) paperContext.drawImage(sprite, 16, 28, 160, 160);
  }
}

function updateSelectionCard() {
  const item = backpackItems[selectedPackIndex];
  if (!item || item.removed) {
    const fallbackIndex = backpackItems.findIndex((candidate) => !candidate.removed);
    if (fallbackIndex < 0) {
      selectionCard.hidden = true;
      return;
    }
    selectedPackIndex = fallbackIndex;
    return updateSelectionCard();
  }
  selectionCard.hidden = false;
  const preview = selectionCard.querySelector('.selected-item');
  preview.dataset.rarity = String(item.rarity);
  preview.style.setProperty('--rarity', rarityGlow[item.rarity]);
  preview.querySelector('img').src = assetUrl(item.icon);
  if (item.slot) {
    const gain = 4 + item.rarity * 4;
    selectionCard.querySelector('.positive').textContent = `⚔ +${gain}`;
    selectionCard.querySelector('.negative').textContent = item.rarity > 1 ? '◆ −3' : '◆ −1';
  } else {
    const value = item.id === 'healing-potion' ? 32 : item.id === 'bread' ? 12 : 1;
    selectionCard.querySelector('.positive').textContent =
      `${item.id === 'blink-scroll' ? '✦' : '♥'} +${value}`;
    selectionCard.querySelector('.negative').textContent = '◆ 0';
  }
  equipItemButton.disabled = false;
  equipItemButton.setAttribute(
    'aria-label',
    item.slot ? 'Надеть выбранный предмет' : 'Использовать выбранный предмет',
  );
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
  Array.from({ length: 12 }, (_, index) => backpackItems[index] ?? null).forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pack-item';
    if (!item || item.removed) {
      button.classList.add('empty');
      button.disabled = true;
      button.setAttribute('aria-label', 'Пустой слот');
      packGrid.append(button);
      return;
    }
    button.dataset.rarity = String(item.rarity);
    button.setAttribute('aria-label', `Предмет ${index + 1}`);
    if (index === selectedPackIndex) button.classList.add('selected');
    if (markedForSalvage.has(index)) button.classList.add('marked');
    const icon = document.createElement('img');
    icon.src = assetUrl(item.icon);
    icon.alt = '';
    button.append(icon);
    if (item.stack) {
      const stack = document.createElement('span');
      stack.className = 'stack';
      stack.textContent = String(item.stack);
      button.append(stack);
    }
    button.addEventListener('click', () => {
      if (salvageMode) {
        if (markedForSalvage.has(index)) markedForSalvage.delete(index);
        else markedForSalvage.add(index);
        updateSalvageUi();
      } else {
        selectedPackIndex = index;
        updateSelectionCard();
      }
      renderPack();
    });
    packGrid.append(button);
  });
  bagButton.querySelector('b').textContent = String(
    backpackItems.filter((item) => item && !item.removed).length,
  );
  updateSelectionCard();
}

function showLootToast(item, value = 12) {
  lootToast.querySelector('img').src = assetUrl(item.icon ?? item.path);
  lootToast.querySelector('b').textContent =
    typeof value === 'number' ? `${value >= 0 ? '+' : ''}${value}` : value;
  lootToast.style.setProperty('--rarity', rarityGlow[item.rarity ?? 1]);
  lootToast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => lootToast.classList.remove('visible'), 1150);
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

function updateHud() {
  const filled = Math.ceil((hero.hp / hero.maxHp) * healthSegments.length);
  healthSegments.forEach((segment, index) => segment.classList.toggle('empty', index >= filled));
  depthBadge.querySelector('span').textContent = romanDepth(dungeon.depth);
  depthBadge.setAttribute('aria-label', `Глубина ${dungeon.depth}`);
  bagButton.querySelector('b').textContent = String(
    backpackItems.filter((item) => item && !item.removed).length,
  );
  currencyValue.textContent = String(shards);
  currency.setAttribute('aria-label', `Осколки: ${shards}`);
}

function openInventory() {
  uiScreen = 'inventory';
  hero.path = [];
  document.body.dataset.screen = uiScreen;
  inventory.inert = false;
  inventory.setAttribute('aria-hidden', 'false');
  bagButton.disabled = true;
  markedForSalvage.clear();
  salvageMode = false;
  updateGearUi();
  renderPack();
  updateSalvageUi();
  closeInventoryButton.focus();
}

function closeInventory() {
  uiScreen = 'game';
  document.body.dataset.screen = uiScreen;
  inventory.setAttribute('aria-hidden', 'true');
  inventory.inert = true;
  bagButton.disabled = false;
  markedForSalvage.clear();
  salvageMode = false;
  updateSalvageUi();
  bagButton.focus();
}

function useConsumable(item, index) {
  let feedback = 1;
  if (item.id === 'healing-potion') {
    feedback = Math.min(32, hero.maxHp - hero.hp);
    if (feedback === 0) {
      showLootToast(item, 0);
      return;
    }
    hero.hp += feedback;
  } else if (item.id === 'bread') {
    feedback = Math.min(12, hero.maxHp - hero.hp);
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
  else item.removed = true;
  showLootToast(item, feedback);
  updateHud();
  updateGearUi();
  selectedPackIndex = Math.min(index, backpackItems.length - 1);
  renderPack();
  persistRun();
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

function addInventoryItem(definition, uid) {
  if (backpackItems.filter((item) => item && !item.removed).length >= 12) return false;
  const item = { ...definition, uid, removed: false };
  const emptyIndex = backpackItems.findIndex((candidate) => !candidate || candidate.removed);
  if (emptyIndex >= 0) backpackItems[emptyIndex] = item;
  else backpackItems.push(item);
  updateHud();
  return true;
}

function gainExperience(monster) {
  hero.xp += monster.xp;
  const shardReward = 1 + Math.floor(monster.tier / 2);
  shards += shardReward;
  while (hero.xp >= hero.level * 18) {
    hero.xp -= hero.level * 18;
    hero.level += 1;
    hero.power += 1;
    hero.maxHp += 6;
    hero.hp = Math.min(hero.maxHp, hero.hp + 18);
    burst(hero.x, hero.y - 10, '#d4c27e', 18);
  }
  showLootToast({ icon: 'item/gold/16.png', rarity: Math.min(3, monster.tier >> 1) }, shardReward);
  updateHud();
}

function defeatMonster(monster) {
  monster.dead = 0.01;
  run.floor.defeated.push(monster.instanceId);
  gainExperience(monster);
  persistRun();
}

function damageHero(amount) {
  if (hero.dead) return;
  hero.hp = Math.max(0, hero.hp - amount);
  hero.hurt = 0.24;
  burst(hero.x, hero.y - 8, '#c25a4f', 10);
  updateHud();
  if (hero.hp > 0) return;
  hero.dead = true;
  hero.path = [];
  deathTimer = 1.35;
}

function resolveWorldInteractions() {
  const heroCell = { x: Math.floor(hero.x / TILE), y: Math.floor(hero.y / TILE) };
  const heroCellKey = `${heroCell.x},${heroCell.y}`;
  if (heroCellKey !== lastHeroCell) {
    lastHeroCell = heroCellKey;
    if (revealAround(revealed, world, heroCell, 4)) persistRun();
  }

  for (let index = lootDefinitions.length - 1; index >= 0; index -= 1) {
    const loot = lootDefinitions[index];
    if (Math.hypot(loot.x - hero.x, loot.y - hero.y) > TILE * 0.54) continue;
    if (!addInventoryItem(loot.definition, loot.instanceId)) continue;
    lootDefinitions.splice(index, 1);
    run.floor.collected.push(loot.instanceId);
    showLootToast(loot.definition, 1);
    persistRun();
  }

  for (let index = eventDefinitions.length - 1; index >= 0; index -= 1) {
    const event = eventDefinitions[index];
    if (Math.hypot(event.x - hero.x, event.y - hero.y) > TILE * 0.54) continue;
    eventDefinitions.splice(index, 1);
    run.floor.resolved.push(event.instanceId);
    const { effect, value, path } = event.definition;
    if (effect === 'heal') {
      const healed = Math.min(value, hero.maxHp - hero.hp);
      hero.hp += healed;
      showLootToast({ path, rarity: 1 }, healed);
    } else if (effect === 'power') {
      hero.power += value;
      showLootToast({ path, rarity: 3 }, value);
    } else if (effect === 'damage') {
      showLootToast({ path, rarity: 0 }, -value);
      damageHero(value);
    } else {
      const reward = value * 5 + dungeon.depth;
      shards += reward;
      showLootToast({ path, rarity: 2 }, reward);
    }
    updateHud();
    persistRun();
  }

  if (heroCell.x === dungeon.exit.x && heroCell.y === dungeon.exit.y) descendFloor();
}

function replaceFloor(nextDepth) {
  dungeon = generateDungeon({ seed: run.seed, depth: nextDepth });
  world = dungeon.grid;
  run.depth = nextDepth;
  run.floor = { revealed: [], defeated: [], collected: [], resolved: [] };
  monsters = createMonsters(dungeon);
  lootDefinitions = createLootDefinitions(dungeon);
  eventDefinitions = createEventDefinitions(dungeon);
  decorDefinitions = createDecorDefinitions(dungeon);
  revealed.clear();
  revealAround(revealed, world, dungeon.spawn, 4);
  hero.x = (dungeon.spawn.x + 0.5) * TILE;
  hero.y = (dungeon.spawn.y + 0.5) * TILE;
  hero.path = [];
  hero.attack = 0;
  hero.dead = false;
  lastHeroCell = `${dungeon.spawn.x},${dungeon.spawn.y}`;
  camera.x = hero.x;
  camera.y = hero.y;
  updateHud();
  persistRun();
}

function descendFloor() {
  run = advanceRunFloor(captureRun());
  hero.hp = run.hero.hp;
  replaceFloor(run.depth);
  showLootToast({ path: EXIT_PATH, rarity: 2 }, romanDepth(run.depth));
}

function restartRun() {
  run = createRun(createSeed());
  shards = run.shards;
  backpackItems = run.inventory.map(materializeInventoryItem).filter(Boolean);
  Object.assign(selected, run.equipment);
  hero.hp = run.hero.hp;
  hero.maxHp = run.hero.maxHp;
  hero.level = run.hero.level;
  hero.xp = run.hero.xp;
  hero.power = run.hero.power;
  deathTimer = 0;
  replaceFloor(1);
  updateGearUi();
  renderPack();
}

function updateHero(delta) {
  hero.attack = Math.max(0, hero.attack - delta);
  hero.attackCooldown = Math.max(0, hero.attackCooldown - delta);
  hero.hurt = Math.max(0, hero.hurt - delta);
  if (hero.dead) return;
  if (hero.path.length > 0) {
    const target = hero.path[0];
    const dx = target.x - hero.x;
    const dy = target.y - hero.y;
    const distance = Math.hypot(dx, dy);
    const movement = Math.min(distance, delta * TILE * 3.25);
    if (distance > 0) {
      hero.x += (dx / distance) * movement;
      hero.y += (dy / distance) * movement;
      hero.facing = dx < -0.1 ? -1 : dx > 0.1 ? 1 : hero.facing;
      hero.stride += movement / TILE;
    }
    if (distance < 2.5) hero.path.shift();
  }
  resolveWorldInteractions();

  let nearest = null;
  let nearestDistance = Infinity;
  for (const monster of monsters) {
    if (monster.dead > 0) continue;
    const distance = Math.hypot(monster.x - hero.x, monster.y - hero.y);
    if (distance < nearestDistance) {
      nearest = monster;
      nearestDistance = distance;
    }
  }
  if (nearest && nearestDistance < TILE * 1.42 && hero.attackCooldown === 0) {
    hero.path = [];
    hero.attack = 0.34;
    hero.attackCooldown = 0.76;
    hero.targetAngle = Math.atan2(nearest.y - hero.y, nearest.x - hero.x);
    hero.facing = nearest.x < hero.x ? -1 : 1;
    nearest.hit = 0.19;
    const damage = 1 + hero.power + gear.hand1[selected.hand1].rarity * 2;
    nearest.hp -= damage;
    burst(nearest.x, nearest.y - 8, rarityGlow[gear.hand1[selected.hand1].rarity]);
    if (nearest.hp <= 0) defeatMonster(nearest);
  }
}

function updateWorld(delta) {
  if (hero.dead) {
    deathTimer -= delta;
    if (deathTimer <= 0) restartRun();
  }
  for (const monster of monsters) {
    monster.hit = Math.max(0, monster.hit - delta);
    monster.attackCooldown = Math.max(0, monster.attackCooldown - delta);
    monster.repathCooldown = Math.max(0, monster.repathCooldown - delta);
    if (monster.dead > 0) {
      monster.dead += delta;
      continue;
    }
    if (hero.dead) continue;
    const distanceToHero = Math.hypot(monster.x - hero.x, monster.y - hero.y);
    if (distanceToHero > TILE * 7) continue;
    if (distanceToHero < TILE * 1.08) {
      monster.path = [];
      if (monster.attackCooldown === 0) {
        monster.attackCooldown = 1.05 + monster.tier * 0.025;
        damageHero(monster.damage);
      }
      continue;
    }
    if (monster.repathCooldown === 0) {
      monster.repathCooldown = 0.36 + (monster.phase % 0.12);
      monster.path = findPath(hero.x / TILE, hero.y / TILE, {
        allowHidden: true,
        start: { x: Math.floor(monster.x / TILE), y: Math.floor(monster.y / TILE) },
      });
      if (monster.path.length > 1) monster.path.pop();
    }
    const target = monster.path[0];
    if (!target) continue;
    const dx = target.x - monster.x;
    const dy = target.y - monster.y;
    const distance = Math.hypot(dx, dy);
    const movement = Math.min(distance, delta * TILE * monster.speed);
    if (distance > 0) {
      monster.x += (dx / distance) * movement;
      monster.y += (dy / distance) * movement;
    }
    if (distance < 2.5) monster.path.shift();
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
  const cameraEase = 1 - Math.exp(-delta * 5.4);
  camera.x += (hero.x - camera.x) * cameraEase;
  camera.y += (hero.y - camera.y) * cameraEase;
}

function render() {
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  context.imageSmoothingEnabled = false;
  drawWorld();
  drawMotes();
  drawLoot();
  drawEvents();
  const actors = [
    ...decorDefinitions.map((definition) => ({
      kind: 'decor',
      definition,
      y: definition[2] * TILE,
    })),
    ...monsters.map((monster) => ({ kind: 'monster', monster, y: monster.y })),
    { kind: 'hero', y: hero.y },
  ].sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    if (actor.kind === 'hero') drawPlayer();
    if (actor.kind === 'monster') drawMonster(actor.monster);
    if (actor.kind === 'decor') {
      const [path, x, y] = actor.definition;
      if (revealed.has(`${Math.floor(x)},${Math.floor(y)}`)) {
        drawSprite(path, x * TILE, y * TILE, 72, { offsetY: -5 });
      }
    }
  }
  drawSparks();
  drawLighting();
  drawFog();
}

function animate(time) {
  const delta = Math.min(0.04, Math.max(0, (time - previousTime) / 1000));
  previousTime = time;
  elapsed += delta;
  if (!document.hidden && ready) {
    if (uiScreen === 'game') {
      updateHero(delta);
      updateWorld(delta);
    }
    render();
  }
  frameId = requestAnimationFrame(animate);
}

function moveFromPointer(event) {
  if (!ready || uiScreen !== 'game') return;
  const worldX = (event.clientX - viewportWidth / 2 + camera.x) / TILE;
  const worldY = (event.clientY - viewportHeight / 2 + camera.y) / TILE;
  const nextPath = findPath(worldX, worldY);
  if (nextPath.length) hero.path = nextPath;
  if (!pointerUsed) {
    pointerUsed = true;
    gesture.classList.add('hidden');
  }
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
    ready = true;
    updateGearUi();
    renderPack();
    updateSalvageUi();
    updateHud();
    document.body.dataset.state = 'ready';
    status.querySelector('span').textContent = '';
  } catch (error) {
    status.querySelector('span').textContent = 'LOAD';
    status.title = error.message;
    document.body.dataset.state = 'error';
  }
}

canvas.addEventListener('pointerdown', moveFromPointer);
window.addEventListener('resize', resize);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && uiScreen === 'inventory') {
    event.preventDefault();
    closeInventory();
    return;
  }
  if (uiScreen !== 'game') return;
  const directions = {
    ArrowLeft: [-1, 0],
    KeyA: [-1, 0],
    ArrowRight: [1, 0],
    KeyD: [1, 0],
    ArrowUp: [0, -1],
    KeyW: [0, -1],
    ArrowDown: [0, 1],
    KeyS: [0, 1],
  };
  const direction = directions[event.code];
  if (!direction) return;
  event.preventDefault();
  const targetX = Math.floor(hero.x / TILE) + direction[0];
  const targetY = Math.floor(hero.y / TILE) + direction[1];
  const nextPath = findPath(targetX, targetY);
  if (nextPath.length) hero.path = nextPath;
  gesture.classList.add('hidden');
});
bagButton.addEventListener('click', openInventory);
closeInventoryButton.addEventListener('click', closeInventory);
inventory.addEventListener('pointerdown', (event) => {
  if (event.target === inventory) closeInventory();
});
equipItemButton.addEventListener('click', () => {
  const item = backpackItems[selectedPackIndex];
  if (!item || item.removed) return;
  if (!item.slot) {
    useConsumable(item, selectedPackIndex);
    return;
  }
  selected[item.slot] = item.variant;
  updateGearUi();
  showLootToast(item, 4 + item.rarity * 4);
  persistRun();
});
salvageButton.addEventListener('click', () => {
  salvageMode = !salvageMode;
  markedForSalvage.clear();
  updateSalvageUi();
  renderPack();
});
salvageConfirm.addEventListener('click', () => {
  if (markedForSalvage.size === 0) return;
  const reward = [...markedForSalvage].reduce((sum, index) => {
    const item = backpackItems[index];
    return sum + (item ? 2 + item.rarity * 4 : 0);
  }, 0);
  for (const index of markedForSalvage) backpackItems[index].removed = true;
  shards += reward;
  currencyValue.textContent = String(shards);
  currency.setAttribute('aria-label', `Осколки: ${shards}`);
  markedForSalvage.clear();
  salvageMode = false;
  updateSalvageUi();
  renderPack();
  showLootToast({ icon: 'item/gold/16.png', rarity: 1 }, reward);
  persistRun();
});
window.addEventListener(
  'pagehide',
  () => {
    persistRun();
    cancelAnimationFrame(frameId);
  },
  { once: true },
);

frameId = requestAnimationFrame(animate);
initialize();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('../sw.js', document.baseURI)).catch(() => {
      // Offline support is optional; a registration failure must not block play.
    });
  });
}
