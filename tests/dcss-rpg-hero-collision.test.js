import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import {
  blockingActorCells, canActorsMeleeContact, constrainActorMovement, meleeApproachPoint,
} from '../tools/dcss-rpg-actor-collision.js';
import { attackCrossedContact, combatImpactProfile } from '../tools/dcss-rpg-combat-motion.js';
import { findGridPath, generateDungeon, hasLineOfSight } from '../tools/dcss-rpg-core.js';
import { choosePassiveWanderTarget, createPassiveCreatureStates } from '../tools/dcss-rpg-passive.js';
import { createHazardInputState, hazardMoveIntent } from '../tools/dcss-rpg-hazard-input.js';
import {
  HERO_BASE_MOVE_SPEED, MONSTER_MIN_SEPARATION, canMeleeAttack, canMonsterAdvance,
  canWeaponAttack, combatDamage, monsterCellKey, occupiedMonsterCells, weaponCombatProfile,
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
    windup: 0.2, attackRate: 1, damage: 1,
    ...overrides,
  };
}

function runtime({ rows = ['#######', '#.....#', '#######'], monsters = [] } = {}) {
  const grid = rows.map((row) => [...row]);
  const hazards = new Set();
  const hero = {
    x: 96, y: 96, hp: 100, dead: false, path: [], effects: {}, facing: 1, stride: 0,
    attack: 0, attackDuration: 0.3, attackCooldown: 0, hurt: 0, guardFlash: 0, pendingAttack: null,
  };
  const context = vm.createContext({
    TILE, HERO_BASE_MOVE_SPEED, hero, monsters, passiveCreatures: [], world: grid,
    revealed: new Set(grid.flatMap((row, y) => row.map((_, x) => `${x},${y}`))),
    runStatus: 'playing', playerHasActed: false, openingDoor: null,
    findDefinitions: [],
    inputGesture: 1, permittedHazardCell: null, hazardInputState: createHazardInputState(),
    performance: { now: () => 0 },
    blockingActorCells, canActorsMeleeContact, constrainActorMovement, meleeApproachPoint,
    monsterCellKey, occupiedMonsterCells,
    canMonsterAdvance, canMeleeAttack, canWeaponAttack, findGridPath, hasLineOfSight,
    hazardMoveIntent, createHazardInputState, attackCrossedContact, combatDamage, combatImpactProfile,
    currentHeroCombat: () => weaponCombatProfile(null),
    currentHeroStats: () => ({ attack: 10, moveSpeed: 1 }),
    actorEffectModifiers: () => ({ moveSpeed: 1 }),
    equippedItem: () => null,
    rarityGlow: ['#ffffff'],
    knownTrapCells: () => new Set(hazards),
    isWalkable: (x, y) => grid[y]?.[x] === '.',
    updateHeroEffects: () => {}, updateHeldMove: () => {}, resolveWorldInteractions: () => {},
    warnTrapStep: () => {}, updateDoorOpening: () => {}, monsterSeesHero: () => true,
    damageHero: () => null, monsterInfliction: () => null,
    burst: () => {}, addImpactWave: () => {}, addCombatGlyph: () => {},
    addBloodImpact: () => {}, beginHitStop: () => {}, updateBossHud: () => {},
    defeatMonster: (monster) => { monster.dead = 0.001; },
    choosePassiveWanderTarget: () => null, passiveWanderPause: () => 2,
    projectiles: [], sparks: [], bloodDrops: [], combatGlyphs: [], impactWaves: [],
    renderShake: { amount: 0 }, camera: { x: 96, y: 96 },
  });
  installRuntime(context, [
    'findPath', 'heroBlockingCells', 'blockingFindCells', 'passiveOccupiedCells', 'requestHeroMove', 'commitHeroPath',
    'updateHero', 'canHeroAttack', 'isCurrentlyVisible', 'canActorsMelee',
    'resolvePendingHeroAttack', 'damageMonster', 'updateWorld', 'updatePassiveCreatures',
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
