import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CHASM_CELL } from '../tools/dcss-rpg-chasm.js';
import { readFile } from 'node:fs/promises';

import { equipmentMagic } from '../tools/dcss-rpg-magic.js';
import vm from 'node:vm';

import {
  blockingActorCells, canActorsMeleeContact, constrainActorMovement, meleeApproachPoint,
} from '../tools/dcss-rpg-actor-collision.js';
import { chooseCrowdPressureStep } from '../tools/dcss-rpg-monster-pressure.js';
import { attackCrossedContact, combatImpactProfile } from '../tools/dcss-rpg-combat-motion.js';
import {
  axeCleaveDamage, axeCleaveProfile, selectAxeCleaveTargets,
} from '../tools/dcss-rpg-cleave.js';
import { lootById } from '../tools/dcss-rpg-content.js';
import { createSkillState, deriveSkillCapabilities } from '../tools/dcss-rpg-skills.js';
import {
  createSwordRhythmState, resolveSwordRhythmStrike, swordRhythmSource,
} from '../tools/dcss-rpg-swords.js';
import { resolveShieldBlock, shieldBlockRoll } from '../tools/dcss-rpg-shield.js';
import { findGridPath, generateDungeon, hasLineOfSight } from '../tools/dcss-rpg-core.js';
import { choosePassiveWanderTarget, createPassiveCreatureStates } from '../tools/dcss-rpg-passive.js';
import { createHazardInputState, hazardMoveIntent } from '../tools/dcss-rpg-hazard-input.js';
import { directionVector } from '../tools/dcss-rpg-input.js';
import { createActorEffects, tickActorEffects } from '../tools/dcss-rpg-effects.js';
import {
  HERO_BASE_MOVE_SPEED, MONSTER_MIN_SEPARATION, canMeleeAttack, canMonsterAdvance,
  canWeaponAttack, REACH_STYLES, combatDamage, monsterCellKey, occupiedMonsterCells, weaponCombatProfile,
} from '../tools/dcss-rpg-rules.js';

const TILE = 64;
const separation = TILE * MONSTER_MIN_SEPARATION;
const source = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');

function installRuntime(context, names) {
  const functions = names.map((name) => {
    const start = source.indexOf(`function ${name}(`);
    const end = source.indexOf('\nfunction ', start + 1);
    assert.ok(start >= 0 && end > start, `Missing runtime function ${name}`);
    return source.slice(start, end);
  });
  vm.runInContext(functions.join('\n'), context, { timeout: 1000 });
}

function monsterAt(x, y, overrides = {}) {
  return {
    instanceId: `monster-${x}-${y}`, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE,
    dead: 0, hp: 1000, route: [], facing: -1, speed: 2, phase: 0,
    hit: 0, attackRecovery: 0, alertFlash: 0, attackCooldown: 0,
    repathCooldown: 0, alerted: 10, attackWindup: 0, pursuit: 10,
    windup: 0.2, attackRate: 1, damage: 1, attackSequence: 0,
    effects: createActorEffects(),
    ...overrides,
  };
}

function runtime({ rows = ['#######', '#.....#', '#######'], monsters = [] } = {}) {
  const grid = rows.map((row) => [...row]);
  const hazards = new Set();
  const hero = {
    x: 96, y: 96, hp: 100, dead: false, path: [], effects: {}, skills: createSkillState(), facing: 1, stride: 0,
    attack: 0, attackDuration: 0.3, attackCooldown: 0, hurt: 0, guardFlash: 0, pendingAttack: null,
  };
  const context = vm.createContext({
    playSound: () => false,
    // Путь к монете интерфейса — модульная константа адаптера.
    GOLD_ICON_PATH: 'licensed/7soul-icons/coin-gold.png',
    // Weapon techniques are pure modules; the sandbox only needs them to be quiet.
    heroSteadySeconds: 0,
    findIsVisible: () => true,
    refreshVisibleSecrets: () => {},
    visibleSecretIds: new Set(),
    HERO_SIGHT_RADIUS: 5.2,
    isSecretFind: () => false,
    currentStealthProfile: () => ({ rank: 0, visionPercent: 0, noisePercent: 0 }),
    currentSecretSearchProfile: () => ({ rank: 0, radius: 0 }),
    stealthVisionRadius: (vision) => vision,
    stealthNoiseRadius: (radius) => radius,
    discoverSecrets: () => [],
    currentDaggerProfile: () => ({ rank: 0, ambushPercent: 0, backstabPercent: 0 }),
    currentBluntProfile: () => ({ rank: 0, armorBreakPercent: 0, armorBreakSeconds: 0, interruptStunSeconds: 0 }),
    currentSpearProfile: () => ({ rank: 0, reach: 0, interceptPercent: 0, holdSeconds: 0, cooldownSeconds: 0 }),
    currentMarksmanProfile: () => ({ rank: 0, aimSeconds: 0, aimBonusPercent: 0, pierceTargets: 0 }),
    currentMobilityProfile: () => ({ rank: 0, speedPercent: 0, seconds: 0 }),
    heroDodgeBoost: 0,
    resolveSpearGuard: () => {},
    applyBluntAftermath: () => {},
    showDaggerStrikeImpact: () => {},
    rewardHeroEvasion: () => {},
    accumulateSteadiness: () => 0,
    tickDodgeBoost: () => 0,
    dodgeSpeedMultiplier: () => 1,
    mobilityProfile: () => ({ rank: 0, speedPercent: 0, seconds: 0 }),
    refreshDodgeBoost: () => 0,
    daggerProfile: () => ({ rank: 0, ambushPercent: 0, backstabPercent: 0 }),
    resolveDaggerStrike: () => ({ percent: 0, kind: null }),
    applyStrikeBonus: (damage) => damage,
    bluntProfile: () => ({ rank: 0, armorBreakPercent: 0, armorBreakSeconds: 0, interruptStunSeconds: 0 }),
    resolveBluntStrike: () => ({ armorBreakPercent: 0, armorBreakSeconds: 0, interrupt: false, stunSeconds: 0 }),
    refreshArmorBreak: (current) => current ?? null,
    tickArmorBreak: (current) => current ?? null,
    armorBreakMultiplier: () => 1,
    spearProfile: () => ({ rank: 0, reach: 0, interceptPercent: 0, holdSeconds: 0, cooldownSeconds: 0 }),
    spearInterception: () => ({ triggered: false, damagePercent: 0, holdSeconds: 0, cooldownSeconds: 0 }),
    interceptionDamage: () => 0,
    marksmanProfile: () => ({ rank: 0, aimSeconds: 0, aimBonusPercent: 0, pierceTargets: 0 }),
    resolveMarksmanShot: () => ({ aimed: false, bonusPercent: 0, pierceTargets: 0 }),
    selectPiercedTargets: () => [],
    terrainSpeedMultiplier: () => 1,
    terrainMeleeMultiplier: () => 1,
    terrainAllowsCell: () => true,
    actorInWater: () => false,
    isWaterCell: () => false,
    updateHeroTerrain: () => {},
    updateCampFire: () => {},
    updateHeroFooting: () => {},
    heroWading: () => false,
    stopAmbient: () => {},
    stopMusic: () => {},
    startAmbient: () => {},
    setAmbientLevel: () => {},
    CHASM_CELL,
    TILE, HERO_BASE_MOVE_SPEED, hero, monsters, passiveCreatures: [], allies: [], placedTraps: [], world: grid,
    updateAllies: () => {},
    allyInMeleeOf: () => null,
    damageAlly: () => {},
    run: { seed: 1 }, dungeon: { depth: 1 },
    revealed: new Set(grid.flatMap((row, y) => row.map((_, x) => `${x},${y}`))),
    runStatus: 'playing', playerHasActed: false, openingDoor: null,
    findDefinitions: [],
    inputGesture: 1, permittedHazardCell: null, hazardInputState: createHazardInputState(),
    performance: { now: () => 0 },
    blockingActorCells, canActorsMeleeContact, constrainActorMovement, meleeApproachPoint,
    chooseCrowdPressureStep,
    monsterCellKey, occupiedMonsterCells,
    canMonsterAdvance, canMeleeAttack, canWeaponAttack, REACH_STYLES, findGridPath, hasLineOfSight,
    hazardMoveIntent, createHazardInputState, attackCrossedContact, combatDamage, combatImpactProfile,
    axeCleaveDamage, selectAxeCleaveTargets,
    createSwordRhythmState, resolveSwordRhythmStrike, swordRhythmSource,
    resolveShieldBlock, shieldBlockRoll,
    deriveSkillCapabilities,
    swordRhythmState: createSwordRhythmState(),
    currentHeroCombat: () => weaponCombatProfile(null),
    currentWeaponLoadout: () => ({ mode: 'unarmed', primary: null, secondary: null, shield: null }),
    currentHeroCleave: () => axeCleaveProfile(null, {}),
    currentHeroStats: () => ({ attack: 10, moveSpeed: 1 }),
    currentHeroMagic: () => equipmentMagic({}, []),
    // The clock a swing spends; the fixture only needs it to exist.
    hungerAccumulator: 0,
    HUNGER_COST: { strike: 1.5, spell: 4 },
    actorEffectModifiers: () => ({ moveSpeed: 1 }), tickActorEffects,
    equippedItem: () => null,
    rarityGlow: ['#ffffff'],
    knownTrapCells: () => new Set(hazards),
    isWalkable: (x, y) => grid[y]?.[x] === '.',
    updateHunger: () => {}, updateHeroEffects: () => {}, updateHeldMove: () => {}, resolveWorldInteractions: () => {},
    warnTrapStep: () => {}, updateDoorOpening: () => {}, monsterSeesHero: () => true,
    damageHero: () => null, monsterInfliction: () => null,
    triggerPlacedTrapForMonster: () => false,
    // Вор обчищает того, кто подошёл вплотную; здесь в песочнице он молчит.
    tickThief: () => false,
    // Копилка вампиризма живёт во времени; в песочнице времени нет.
    vampiricBudget: () => 0,
    vampiricPool: 0,
    // Дверь на пути открывает только тот путь, который её и наметил.
    heroPathOpensDoors: false,
    doorDefinitions: [],
    beginOpenDoor: () => false,
    burst: () => {}, addImpactWave: () => {}, addCombatGlyph: () => {},
    addBloodImpact: () => {}, beginHitStop: () => {}, updateBossHud: () => {},
    showSwordRhythmImpact: () => {},
    defeatMonster: (monster) => { monster.dead = 0.001; },
    choosePassiveWanderTarget: () => null, passiveWanderPause: () => 2,
    // This sandbox is about collision, not gear: nothing here wears thorns and
    // nobody carries a staff.
    returnThorns: () => {},
    // Kindle answers on the same hook as thorns; the sandbox speaks for neither.
    kindleAttacker: () => {},
    // The dungeon's own passers-by touch nothing this file is about.
    updateAmbientScene: () => {},
    // Neither does the column of things within reach.
    pollInteractionUi: () => {},
    // Nor the line that explains a state the hero is carrying.
    updateHeroEffectNote: () => {},
    // Nor the glow a new level leaves on the floor.
    updateLevelUpGlow: () => {},
    currentStaffProfile: () => ({ rank: 0, channelSeconds: 0, rangeBonus: 0, pierceTargets: 0 }),
    // A run always lives by two conditions; a sandbox lives by none.
    currentConditions: () => ({
      monsterCountScale: 1,
      eventScale: 1,
      lootCountDelta: 0,
      qualityScale: 1,
      waterChance: null,
      goldScale: 1,
      revealRadiusDelta: 0,
      monsterVisionDelta: 0,
      monsterSpeedScale: 1,
      heroSpeedScale: 1,
      hungerScale: 1,
      foodHealingScale: 1,
    }),
    projectiles: [], sparks: [], bloodDrops: [], combatGlyphs: [], impactWaves: [],
    renderShake: { amount: 0 }, camera: { x: 96, y: 96 },
    // A held direction is input, so the sandbox has to be able to accept input.
    ready: true, uiScreen: 'game', directionVector, heroRouteVisible: false,
    routeTowardCell: () => { throw new Error('a step must never ask for a route'); },
  });
  installRuntime(context, [
    'isHeroWalkable', 'isHeroConcealed', 'findPath', 'heroBlockingActors', 'heroBlockingCells', 'blockingFindCells', 'passiveOccupiedCells', 'requestHeroMove', 'commitHeroPath',
    'updateHero', 'canHeroAttack', 'isCurrentlyVisible', 'canActorsMelee',
    'resolvePendingHeroAttack', 'damageMonster', 'executionDamage', 'applyWeaponPowers',
    'surviveOnSecondWind', 'heroConditionalDamage', 'spendHunger',
    'updateWorld', 'updatePassiveCreatures',
    'stepHeroToward', 'queueDirectionalMove',
  ]);
  return { context, grid, hazards };
}

test('actor occupancy reserves only current and next cells and immediately frees dead actors', () => {
  const monster = monsterAt(2, 1, { route: [{ x: 224, y: 96 }, { x: 288, y: 96 }] });
  const passive = { x: 96, y: 160, wanderTarget: { x: 160, y: 160 } };
  assert.deepEqual([...blockingActorCells([monster, passive])].sort(), ['1,2', '2,1', '2,2', '3,1']);
  monster.dead = 0.001;
  assert.deepEqual([...blockingActorCells([monster, passive])].sort(), ['1,2', '2,2']);
});

test('real idle and wandering passive states do not confuse sprite URLs with movement paths', () => {
  const dungeon = generateDungeon({ seed: 1, depth: 1 });
  const creatures = createPassiveCreatureStates(dungeon, TILE);
  assert.ok(creatures.length > 0);
  assert.equal(typeof creatures[0].path, 'string');
  assert.equal(blockingActorCells(creatures).size, creatures.length);
  const creature = creatures[0];
  creature.wanderTarget = choosePassiveWanderTarget({ creature, grid: dungeon.grid, tileSize: TILE });
  assert.ok(creature.wanderTarget);
  assert.equal(blockingActorCells([creature]).has(monsterCellKey(creature.wanderTarget)), true);
});

test('swept collisions stop tunnelling even if both endpoints lie beyond the collision radius', () => {
  const actor = { x: 0, y: 0 };
  const blocker = { x: 100, y: 0, dead: 0 };
  const movement = constrainActorMovement({ actor, next: { x: 250, y: 0 }, blockers: [blocker] });
  assert.equal(movement.blocked, true);
  assert.ok(Math.abs(movement.x - (100 - separation)) < 0.001);
  assert.equal(actor.x, 0, 'pure rule does not mutate the actor');
  assert.deepEqual(constrainActorMovement({
    actor, next: { x: 250, y: 0 }, blockers: [{ ...blocker, dead: 0.001 }],
  }), { x: 250, y: 0, blocked: false });
});

test('collision works symmetrically and allows sideways passage with sufficient clearance', () => {
  const hero = { x: 100, y: 0, dead: false };
  const monster = { x: 0, y: 0, dead: 0 };
  const movement = constrainActorMovement({ actor: monster, next: { x: 250, y: 0 }, blockers: [hero] });
  assert.ok(Math.abs(movement.x - (100 - separation)) < 0.001);
  assert.deepEqual(constrainActorMovement({
    actor: { x: 0, y: 64 }, next: { x: 250, y: 64 }, blockers: [hero],
  }), { x: 250, y: 64, blocked: false });
});

test('legacy overlaps allow gradual separation but never inward travel or teleportation', () => {
  const actor = { x: 90, y: 0 };
  const blocker = { x: 100, y: 0 };
  assert.deepEqual(constrainActorMovement({
    actor, next: { x: 89, y: 0 }, blockers: [blocker],
  }), { x: 89, y: 0, blocked: false });
  assert.deepEqual(constrainActorMovement({
    actor, next: { x: 160, y: 0 }, blockers: [blocker],
  }), { x: 90, y: 0, blocked: true });
  assert.deepEqual(constrainActorMovement({
    actor: blocker, next: { x: 101, y: 0 }, blockers: [actor],
  }), { x: 101, y: 0, blocked: false });
});

test('held movement into an adjacent enemy stays blocked while real auto-attack contact deals damage', () => {
  const enemy = monsterAt(2, 1);
  const { context } = runtime({ monsters: [enemy] });
  for (let frame = 0; frame < 240; frame += 1) {
    context.requestHeroMove(2, 1);
    context.updateHero(0.016);
  }
  assert.equal(context.hero.x, 96);
  assert.equal(context.hero.y, 96);
  assert.equal(context.playerHasActed, true);
  assert.ok(enemy.hp < 980, 'repeated blocked input does not cancel the windup before contact');
  assert.ok(enemy.x - context.hero.x >= separation);
});

test('runtime contact applies an axe cleave only to the pure rule selected neighbour', () => {
  const primary = monsterAt(2, 2, { instanceId: 'primary' });
  const neighbour = monsterAt(2, 1, { instanceId: 'neighbour' });
  const behindHero = monsterAt(0, 2, { instanceId: 'behind-hero' });
  const { context } = runtime({
    rows: ['#####', '#...#', '#...#', '#...#', '#####'],
    monsters: [primary, neighbour, behindHero],
  });
  context.hero.x = 1.5 * TILE;
  context.hero.y = 2.5 * TILE;
  context.hero.attackDuration = 0.44;
  context.hero.attackStyle = 'heavy';
  context.hero.pendingAttack = {
    targetId: primary.instanceId,
    damage: 20,
    color: '#ffffff',
    combat: { style: 'heavy', range: 1, projectile: null },
    cleave: { rank: 1, damagePercent: 35, maxTargets: 1 },
  };
  context.resolvePendingHeroAttack(0.3, 0.19);
  assert.equal(primary.hp, 980);
  assert.equal(neighbour.hp, 993);
  assert.equal(behindHero.hp, 1000);
  assert.equal(context.hero.pendingAttack, null);

  context.runStatus = 'dead';
  context.hero.pendingAttack = {
    targetId: primary.instanceId,
    damage: 20,
    color: '#ffffff',
    combat: { style: 'heavy', range: 1, projectile: null },
    cleave: { rank: 3, damagePercent: 80, maxTargets: 2 },
  };
  context.resolvePendingHeroAttack(0.3, 0.19);
  assert.equal(primary.hp, 980);
  assert.equal(neighbour.hp, 993);
});

test('runtime preserves the equipped grip impact style for secondary axe targets', () => {
  assert.match(
    source,
    /for \(const target of cleaveTargets\)[\s\S]*?damageMonster\(target, cleaveDamage, pending\.color, \{[\s\S]*?style: pending\.combat\.style/,
  );
});

test('runtime resolves one bounded off-hand hit for a dual-wield attack', () => {
  const target = monsterAt(2, 1, { instanceId: 'dual-target', hp: 100 });
  const { context } = runtime({ monsters: [target] });
  context.hero.attackDuration = 0.34;
  context.hero.attackStyle = 'blade';
  context.hero.pendingAttack = {
    targetId: target.instanceId,
    damage: 20,
    color: '#ffffff',
    combat: { style: 'blade', range: 1, projectile: null },
    cleave: { rank: 0, damagePercent: 0, maxTargets: 0 },
    secondary: { damage: 9, color: '#66b47a', style: 'blade' },
  };

  context.resolvePendingHeroAttack(0.25, 0.12);
  assert.equal(target.hp, 71);
  assert.equal(context.hero.pendingAttack, null);
});

test('runtime advances sword rhythm once per landed cycle and empowers the promised hit', () => {
  const target = monsterAt(2, 1, { instanceId: 'sword-target', hp: 100 });
  const { context } = runtime({ monsters: [target] });
  const sword = { ...lootById('long-sword'), uid: 'runtime-sword' };
  const capabilities = {
    swordRhythmRank: 3,
    swordRhythmHitInterval: 2,
    swordRhythmBonusPercent: 80,
  };
  const pendingAttack = () => ({
    targetId: target.instanceId,
    damage: 10,
    color: '#ffffff',
    combat: { style: 'blade', range: 1, projectile: null },
    cleave: { rank: 0, damagePercent: 0, maxTargets: 0 },
    sword: { slot: 'primary', weapon: sword, capabilities },
    secondary: { damage: 4, color: '#66b47a', style: 'blade' },
  });

  context.hero.attackDuration = 0.34;
  context.hero.attackStyle = 'blade';
  context.hero.pendingAttack = pendingAttack();
  context.resolvePendingHeroAttack(0.25, 0.12);
  assert.equal(target.hp, 86, 'first cycle deals 10 + one ordinary off-hand hit');

  context.hero.pendingAttack = pendingAttack();
  context.resolvePendingHeroAttack(0.25, 0.12);
  assert.equal(target.hp, 64, 'second cycle deals empowered 18 + one ordinary off-hand hit');
  assert.equal(context.swordRhythmState.hits, 0);
});

test('runtime paths cannot cross a corridor occupant but can route around a room occupant and its next step', () => {
  const enemy = monsterAt(3, 1);
  const corridor = runtime({ monsters: [enemy] }).context;
  assert.equal(corridor.findPath(5, 1).length, 0);
  assert.equal(corridor.findPath(3, 1).length, 0, 'tapping an occupied endpoint is not an exception');
  const room = runtime({
    rows: ['#######', '#.....#', '#.....#', '#.....#', '#######'],
    monsters: [monsterAt(3, 1, { route: [{ x: 224, y: 160 }] })],
  }).context;
  const path = Array.from(room.findPath(5, 1), (cell) => monsterCellKey(cell, TILE));
  assert.ok(path.length > 4);
  assert.equal(path.includes('3,1'), false);
  assert.equal(path.includes('3,2'), false);
});

test('an enemy entering a stale hero route stops movement without suppressing combat; death releases that route', () => {
  const enemy = monsterAt(2, 1);
  const { context } = runtime({ monsters: [enemy] });
  context.hero.path = [{ x: 160, y: 96 }];
  context.updateHero(0.04);
  assert.equal(context.hero.x, 96);
  assert.equal(context.hero.path.length, 0);
  assert.ok(context.hero.pendingAttack, 'collision must not return before auto-combat');
  enemy.dead = 0.001;
  assert.equal(context.requestHeroMove(2, 1), true);
  for (let frame = 0; frame < 30; frame += 1) context.updateHero(0.016);
  assert.equal(context.hero.x, 160);
});

test('runtime collision checks the whole hero segment when a neighbouring-cell actor overlaps its corridor edge', () => {
  const enemy = monsterAt(2, 2, { x: 182, y: 130 });
  const { context } = runtime({
    rows: ['#######', '#.....#', '#.....#', '#######'], monsters: [enemy],
  });
  context.hero.path = [{ x: 160, y: 96 }];
  context.updateHero(2); // Deliberately much larger than the normal 40 ms frame cap.
  assert.ok(context.hero.x < 160);
  assert.ok(Math.hypot(context.hero.x - enemy.x, context.hero.y - enemy.y) >= separation - 0.001);
});

test('a hero already overlapping an old save can leave the shared start cell continuously', () => {
  const { context } = runtime({
    rows: ['#######', '#.....#', '#.....#', '#######'],
    monsters: [monsterAt(1, 1, { x: 100 })],
  });
  assert.equal(context.requestHeroMove(1, 2), true);
  context.updateHero(0.016);
  assert.equal(context.hero.x, 96);
  assert.ok(context.hero.y > 96 && context.hero.y < 100);
});

test('legacy passive overlap also permits leaving a start cell listed in explicit path blockers', () => {
  const { context } = runtime({ rows: ['#######', '#.....#', '#.....#', '#######'] });
  context.passiveCreatures = [{ x: 100, y: 96, path: 'monsters/yak.png' }];
  assert.equal(context.requestHeroMove(1, 2), true);
  context.updateHero(0.016);
  assert.equal(context.hero.x, 96);
  assert.ok(context.hero.y > 96 && context.hero.y < 100);
});

test('a stale monster route cannot enter the hero cell or tunnel through the hero toward another cell', () => {
  const enemy = monsterAt(3, 1, { route: [{ x: 96, y: 96 }], repathCooldown: 10, speed: 10 });
  const { context } = runtime({ monsters: [enemy] });
  context.playerHasActed = true;
  context.updateWorld(0.04);
  assert.equal(enemy.x, 224);
  assert.equal(enemy.route.length, 0);
  enemy.route = [{ x: 32, y: 96 }];
  enemy.repathCooldown = 10;
  context.world[1][0] = '.';
  context.updateWorld(0.4);
  assert.ok(enemy.x >= context.hero.x + separation - 0.001);
  assert.ok(enemy.x < 224, 'sweep stops at contact instead of discarding all legal approach');
});

test('a dynamically closed door invalidates stale hero, monster and wildlife movement', () => {
  const enemy = monsterAt(3, 1, { route: [{ x: 160, y: 96 }], repathCooldown: 10 });
  const { context, grid } = runtime({ monsters: [enemy] });
  context.playerHasActed = true;
  context.hero.path = [{ x: 160, y: 96 }];
  grid[1][2] = 'D';
  context.updateHero(0.04);
  context.updateWorld(0.04);
  assert.equal(context.hero.x, 96);
  assert.equal(enemy.x, 224);
  assert.equal(enemy.route.length, 0);
  context.passiveCreatures = [{
    x: 224, y: 96, speed: 0.5, stride: 0, facing: -1, wanderCooldown: 0,
    wanderTarget: { x: 160, y: 96, gridX: 2, gridY: 1 },
  }];
  context.updatePassiveCreatures(0.04);
  assert.equal(context.passiveCreatures[0].x, 224);
  assert.equal(context.passiveCreatures[0].wanderTarget, null);
});

test('collision-aware navigation preserves an explicitly confirmed step onto a known trap', () => {
  const { context, hazards } = runtime();
  hazards.add('2,1');
  assert.equal(context.requestHeroMove(2, 1), false);
  context.inputGesture += 1;
  assert.equal(context.requestHeroMove(2, 1), true);
  assert.equal(context.permittedHazardCell, '2,1');
  context.updateHero(0.04);
  assert.ok(context.hero.x > 96);
});

test('melee reaches the whole ring of eight, both ways, and stops there', () => {
  const grid = Array.from({ length: 6 }, () => Array(8).fill('.'));
  const target = { x: 5.5 * TILE, y: 3.5 * TILE };
  for (const offset of [1, 1.4, 1.45, 1.5, 1.6, 2]) {
    const attacker = { x: (5.5 - offset) * TILE, y: 3.5 * TILE };
    const expected = offset <= 1.5;
    assert.equal(canActorsMeleeContact(grid, attacker, target), expected, `hero ${offset}`);
    assert.equal(canActorsMeleeContact(grid, target, attacker), expected, `monster ${offset}`);
  }
  // Corner to corner used to be a dead spot: you walked up to a creature and
  // nothing happened, in either direction.
  for (const corner of [
    { x: 4.5 * TILE, y: 2.5 * TILE },
    { x: 6.5 * TILE, y: 4.5 * TILE },
  ]) {
    assert.equal(canActorsMeleeContact(grid, corner, target), true, 'the diagonal is a fight');
    assert.equal(canActorsMeleeContact(grid, target, corner), true, 'and it is reciprocal');
  }
  // Two cells away on the diagonal is still two cells away.
  const far = { x: 3.5 * TILE, y: 1.5 * TILE };
  assert.equal(canActorsMeleeContact(grid, far, target), false);
});

test('a monster in the next tile is in reach at once, with no dead zone to cross', () => {
  const enemy = monsterAt(2, 1);
  const { context } = runtime({ monsters: [enemy] });
  context.hero.x = 1.1 * TILE;
  context.playerHasActed = true;
  // Anywhere in the neighbouring cell is contact: this corner of the cell used
  // to be a gap where the monster could not swing and the hero could not answer.
  assert.equal(context.canActorsMelee(enemy, context.hero), true);
  assert.equal(context.canHeroAttack(enemy, context.currentHeroCombat()), true);
  for (let frame = 0; frame < 100 && enemy.attackWindup === 0; frame += 1) context.updateWorld(0.016);
  assert.ok(enemy.attackWindup > 0, 'and the monster gets on with attacking');
});

test('an attack windup cannot hit a hero who has left the shared contact distance', () => {
  // Two cells apart, which is now the nearest place that is genuinely out of reach.
  const enemy = monsterAt(3, 1, { attackWindup: 0.1, attackCooldown: 0.8 });
  const { context } = runtime({ monsters: [enemy] });
  context.hero.x = 1.5 * TILE;
  context.playerHasActed = true;
  let hits = 0;
  context.damageHero = () => { hits += 1; return null; };
  context.updateWorld(0.11);
  assert.equal(enemy.attackWindup, 0);
  assert.equal(hits, 0);
});

test('a blocked room crowd keeps repositioning while the doorway fighter holds contact', () => {
  const doorwayFighter = monsterAt(4, 3, { instanceId: 'doorway-fighter' });
  const rearMonster = monsterAt(5, 3, { instanceId: 'rear-monster' });
  const { context } = runtime({
    rows: [
      '#########',
      '#...#...#',
      '#...#...#',
      '#.......#',
      '#...#...#',
      '#...#...#',
      '#########',
    ],
    monsters: [doorwayFighter, rearMonster],
  });
  context.hero.x = 3.5 * TILE;
  context.hero.y = 3.5 * TILE;
  context.playerHasActed = true;
  const start = { x: rearMonster.x, y: rearMonster.y };

  for (let frame = 0; frame < 90; frame += 1) context.updateWorld(0.04);

  assert.equal(Math.floor(doorwayFighter.x / TILE), 4);
  assert.equal(Math.floor(doorwayFighter.y / TILE), 3);
  assert.ok(
    Math.hypot(rearMonster.x - start.x, rearMonster.y - start.y) > TILE * 0.25,
    'the rear monster visibly searches for another angle instead of freezing',
  );
  assert.ok(
    Math.hypot(rearMonster.x - doorwayFighter.x, rearMonster.y - doorwayFighter.y) >= separation - 0.001,
    'pressure movement still respects the crowd collision radius',
  );
});

test('real approach, contact, retreat and return preserve movement priority and reciprocal combat', () => {
  const enemy = monsterAt(3, 1);
  const { context } = runtime({ monsters: [enemy] });
  context.hero.x = 2.1 * TILE;
  assert.equal(context.requestHeroMove(3, 1), true, 'tapping an enemy already in reach is still an action');
  for (let frame = 0; frame < 80; frame += 1) context.updateHero(0.016);
  assert.ok(enemy.hp < 1000);
  context.updateWorld(0.016);
  assert.ok(enemy.attackWindup > 0, 'the enemy shares the same attack distance');
  assert.equal(context.requestHeroMove(1, 1), true);
  assert.equal(context.hero.pendingAttack, null, 'an explicit retreat interrupts an old swing once');
  for (let frame = 0; frame < 45; frame += 1) context.updateHero(0.016);
  assert.equal(context.hero.x, 96, 'autobattle did not cancel retreat after one step');
  assert.equal(context.requestHeroMove(2, 1), true);
  for (let frame = 0; frame < 50; frame += 1) context.updateHero(0.016);
  assert.equal(context.hero.x, 160);
  assert.ok(context.hero.pendingAttack || context.hero.attackCooldown > 0);
});

/**
 * An enemy is a wall; a neighbour is not.
 *
 * Everything standing in a street used to block the hero the same way a wall
 * did — the watch, the priest, four traders and any sheep that wandered into a
 * doorway. The city is made of narrow streets with all of those in them, and
 * being stopped by a shopkeeper is not a decision anybody made. The rule is
 * hostility now, and it flips the moment a neighbour turns on you.
 */
test('the hero walks through neighbours and never through an enemy', () => {
  // A watchman standing in the middle of the street, minding his own business.
  const guard = monsterAt(3, 1, { neutral: true, alerted: 0, pursuit: 0 });
  const town = runtime({ monsters: [guard] });
  assert.equal(town.context.heroBlockingActors().length, 0, 'the watch is counted as an obstacle');
  assert.equal(town.context.requestHeroMove(5, 1), true, 'no route past a neighbour');
  for (let frame = 0; frame < 300; frame += 1) town.context.updateHero(0.016);
  assert.equal(town.context.hero.x, 352, 'the hero stopped at the watchman instead of passing him');

  // He draws, and the street is a corridor again.
  guard.provoked = true;
  assert.equal(town.context.heroBlockingActors().length, 1);
  assert.equal(town.context.heroBlockingCells().has('3,1'), true);

  // An enemy is a wall in the body, not only on the map: the route below leads
  // to a free cell on the far side, and the hero must never arrive at it.
  const fight = runtime({ monsters: [monsterAt(3, 1)] });
  fight.context.hero.path = [{ x: 352, y: 96 }];
  for (let frame = 0; frame < 300; frame += 1) fight.context.updateHero(0.016);
  assert.ok(fight.context.hero.x < 224 - separation + 1, `the hero walked through an enemy to ${fight.context.hero.x}`);

  // Grazing wildlife is a neighbour too, until it is hunted.
  const field = runtime();
  const deer = { instanceId: 'deer', x: 224, y: 96, defeated: false, hunted: false, path: 'mon/sheep.png' };
  field.context.passiveCreatures.push(deer);
  assert.equal(field.context.heroBlockingActors().length, 0);
  assert.equal(field.context.requestHeroMove(5, 1), true);
  for (let frame = 0; frame < 300; frame += 1) field.context.updateHero(0.016);
  assert.equal(field.context.hero.x, 352, 'a grazing deer stopped the hero');
});

/**
 * A run used to end on one bad frame.
 *
 * The next frame was requested by the last statement of `animate`, so anything
 * that threw above it stopped the loop for good: the world froze mid-step while
 * every DOM button kept working, and only a page reload brought it back. There
 * are three hundred deliberate `throw`s in the rule modules, so this was not a
 * hypothetical. Ivan hit it twice in one session.
 */
test('one failed frame cannot end the game, nor stop the picture', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const animate = runtime.slice(runtime.indexOf('function animate(time) {'));
  const body = animate.slice(0, animate.indexOf('\nfunction '));
  assert.match(body, /try \{/, 'the frame is not guarded');
  assert.match(body, /catch \(error\) \{\s*reportFrameFailure\('frame', error\);/, 'a failure is swallowed silently');
  assert.match(body, /finally \{\s*frameId = requestAnimationFrame\(animate\);/, 'the next frame is not guaranteed');
  // And the very last thing the loop does must be to ask for the next frame,
  // whatever happened: no early return may skip it.
  assert.doesNotMatch(body.slice(0, body.indexOf('} catch')), /\n {2}return[; ]/, 'an early return escapes the guard');

  // One guard around the whole frame kept the loop alive but not the picture:
  // a rule that throws while the hero moves skips `render()` too, and the
  // world sits frozen while the bag and the stick still work. Ivan reported
  // exactly that twice. Every phase now stands on its own.
  for (const phase of ['hero', 'world', 'onboarding', 'render']) {
    assert.ok(body.includes(`framePhase('${phase}'`), `${phase} shares its fate with the rest of the frame`);
  }
  assert.doesNotMatch(body, /\n {10}updateHero\(delta\);/, 'the hero update is unguarded');

  // And a phone has no console, so the game says out loud what broke.
  const report = runtime.slice(runtime.indexOf('function reportFrameFailure('));
  assert.match(report.slice(0, report.indexOf('\nfunction ')), /frameFailureBanner\.hidden = false/);
  const html = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="frame-failure"'));
  assert.ok(html.includes('id="frame-failure-text"'));
});

/**
 * A neighbour is not a wall — and that has to hold for the route, not only for
 * the collision. The hero could walk through a watchman but could not be routed
 * past one, so a guard standing in a two-tile city street stopped movement
 * outright: the tap was simply ignored.
 */
test('route finding pushes past neighbours and answers a tap into the dark', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const request = runtime.slice(runtime.indexOf('function requestHeroMove('));
  const body = request.slice(0, request.indexOf('\nfunction '));
  assert.doesNotMatch(body, /blockedCells: passiveOccupiedCells\(\)/, 'neighbours block the route again');
  assert.match(body, /routeTowardCell\(target\)/, 'a tap the map cannot answer exactly does nothing again');
  // The fallback walks toward the tap; it never silently walks somewhere else.
  const toward = runtime.slice(runtime.indexOf('function routeTowardCell('));
  assert.match(toward.slice(0, toward.indexOf('\nfunction ')), /left\.toTarget - right\.toTarget/);
});

/**
 * Wildlife that has turned on the hero is an enemy, and spells have to reach it.
 * It was left out of both target lists, so a charging boar walked through fire
 * and frost untouched while a stick still killed it.
 */
test('a hunted beast is a target for spells, not only for sticks', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const around = runtime.slice(runtime.indexOf('function monstersAroundHero('));
  assert.match(
    around.slice(0, around.indexOf('\nfunction ')),
    /passiveCreatures\.filter\(\(\{ hunted, defeated \}\) => hunted && !defeated\)/,
    'a burst spell misses the beast fighting you',
  );
  const candidates = runtime.slice(runtime.indexOf('function spellTargetCandidates('));
  assert.doesNotMatch(
    candidates.slice(0, candidates.indexOf('\nfunction ')),
    /targetMode === 'actor' && target\.actorKind === 'wildlife'/,
    'an aimed spell cannot be pointed at the beast biting you',
  );
});

/**
 * Holding a direction against a wall.
 *
 * The stick and the arrow keys went through `requestHeroMove`, the same
 * pathfinder a tap uses, so «вперёд» into a wall asked for a route to the cell
 * behind it — and `routeTowardCell` found one, around the corner. Ivan, playing
 * on a phone: «упираюсь в стену, а он начинает её обходить»; and in a corridor
 * ending in a closed door, the hero paced instead of standing at the handle.
 */
test('a held direction is one step or nothing, and never a detour', () => {
  const world = runtime({
    rows: [
      '#####',
      '#...#',
      '#.#.#',
      '#...#',
      '#####',
    ],
  });
  const at = (x, y) => { world.context.hero.x = (x + 0.5) * TILE; world.context.hero.y = (y + 0.5) * TILE; };
  const step = (direction) => {
    world.context.hero.path = [];
    return vm.runInContext(`queueDirectionalMove('${direction}')`, world.context);
  };

  // Into the wall above: nothing happens, and above all no route around it.
  at(1, 1);
  assert.equal(step('up'), false, 'the hero walked into a wall');
  assert.equal(world.context.hero.path.length, 0, 'a wall produced a path');

  // The same cell is reachable the long way round, and that is exactly the
  // detour the old code took. A step must not.
  at(1, 2);
  assert.equal(step('right'), false, 'stepped into the pillar');
  assert.equal(world.context.hero.path.length, 0);

  // And an open direction is one cell, not a plan — written in the same units
  // the walker reads. Путь героя измеряется в пикселях: ходок делит точку на
  // размер клетки, чтобы узнать клетку. Клетка, положенная сюда как есть,
  // делилась второй раз, попадала в угол карты и стиралась как стена — герой
  // стоял на месте при любом направленном вводе, и заметилось это только с
  // геймпадом.
  at(1, 1);
  assert.equal(step('right'), true);
  assert.equal(
    JSON.stringify(world.context.hero.path),
    JSON.stringify([{ x: 2.5 * TILE, y: 1.5 * TILE }]),
  );
  // И та же точка, прочитанная обратно, обязана дать соседнюю клетку.
  const [ahead] = world.context.hero.path;
  assert.deepEqual(
    { x: Math.floor(ahead.x / TILE), y: Math.floor(ahead.y / TILE) },
    { x: 2, y: 1 },
  );

  // Walking off the map is the same as walking into a wall.
  at(1, 1);
  assert.equal(step('left'), false);
  assert.equal(world.context.hero.path.length, 0);

  // The line on the floor belongs to point-and-click; a stick turns it off.
  world.context.heroRouteVisible = true;
  at(1, 1);
  step('right');
  assert.equal(world.context.heroRouteVisible, false, 'the route is drawn under a stick');
});
