import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
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
    // Weapon techniques are pure modules; the sandbox only needs them to be quiet.
    heroSteadySeconds: 0,
    findIsVisible: () => true,
    refreshVisibleSecrets: () => {},
    visibleSecretIds: new Set(),
    heroSightRadius: () => 5.2,
    heroRevealRadius: () => 4,
    isSecretFind: () => false,
    currentDarkvisionProfile: () => ({ rank: 0, radiusBonus: 0 }),
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
    heroWading: () => false,
    stopAmbient: () => {},
    startAmbient: () => {},
    setAmbientLevel: () => {},
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
    burst: () => {}, addImpactWave: () => {}, addCombatGlyph: () => {},
    addBloodImpact: () => {}, beginHitStop: () => {}, updateBossHud: () => {},
    showSwordRhythmImpact: () => {},
    defeatMonster: (monster) => { monster.dead = 0.001; },
    choosePassiveWanderTarget: () => null, passiveWanderPause: () => 2,
    // This sandbox is about collision, not gear: nothing here wears thorns and
    // nobody carries a staff.
    returnThorns: () => {},
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
  });
  installRuntime(context, [
    'isHeroWalkable', 'isHeroConcealed', 'findPath', 'heroBlockingCells', 'blockingFindCells', 'passiveOccupiedCells', 'requestHeroMove', 'commitHeroPath',
    'updateHero', 'canHeroAttack', 'isCurrentlyVisible', 'canActorsMelee',
    'resolvePendingHeroAttack', 'damageMonster', 'executionDamage', 'applyWeaponPowers',
    'surviveOnSecondWind', 'heroConditionalDamage', 'spendHunger',
    'updateWorld', 'updatePassiveCreatures',
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

test('both melee sides share one contact radius, including the floating-point boundary', () => {
  const grid = Array.from({ length: 6 }, () => Array(8).fill('.'));
  const target = { x: 5.5 * TILE, y: 3.5 * TILE };
  for (const offset of [1.4, 1.45, 1.15, 1.1]) {
    const attacker = { x: (5.5 - offset) * TILE, y: 3.5 * TILE };
    const expected = offset <= 1.15;
    assert.equal(canActorsMeleeContact(grid, attacker, target), expected, `hero ${offset}`);
    assert.equal(canActorsMeleeContact(grid, target, attacker), expected, `monster ${offset}`);
  }
});

test('a monster in an adjacent tile closes the old dead zone instead of getting stuck with an empty route', () => {
  const enemy = monsterAt(2, 1);
  const { context } = runtime({ monsters: [enemy] });
  context.hero.x = 1.1 * TILE;
  context.playerHasActed = true;
  assert.equal(context.canActorsMelee(enemy, context.hero), false);
  assert.equal(context.canHeroAttack(enemy, context.currentHeroCombat()), false);
  for (let frame = 0; frame < 100 && enemy.attackWindup === 0; frame += 1) context.updateWorld(0.016);
  assert.ok(enemy.x < 160);
  assert.ok(enemy.attackWindup > 0, 'monster approached and started its real attack');
  assert.equal(context.canActorsMelee(enemy, context.hero), true);
  assert.equal(context.canHeroAttack(enemy, context.currentHeroCombat()), true);
});

test('an attack windup cannot hit a hero who has left the shared contact distance', () => {
  const enemy = monsterAt(2, 1, { attackWindup: 0.1, attackCooldown: 0.8 });
  const { context } = runtime({ monsters: [enemy] });
  context.hero.x = 1.05 * TILE;
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
  assert.equal(context.requestHeroMove(3, 1), true, 'an occupied next tile still permits sub-tile approach');
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
test('the hero walks through neighbours and never through an enemy', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const body = runtime.match(/function heroBlockingCells\(\) \{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';
  assert.ok(body.length > 0, 'heroBlockingCells пропала');
  // Hostile monsters block; neutral ones only once provoked.
  assert.match(body, /monsters\.filter\(\(monster\) => !monster\.neutral \|\| monster\.provoked\)/);
  // Wildlife blocks only once it is in the fight.
  assert.match(body, /passiveCreatures\.filter\(\(creature\) => !creature\.defeated && creature\.hunted\)/);
  // And a trader is never a wall: the shop is three tiles wide.
  assert.doesNotMatch(body, /merchant/i);
  // The rule that matters is still there for everything that wants you dead.
  assert.match(runtime, /heroBlockingCells\(\)/);
});
