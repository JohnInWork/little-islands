import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import { findGridPath } from '../tools/dcss-rpg-core.js';
import { createHazardInputState, hazardMoveIntent } from '../tools/dcss-rpg-hazard-input.js';
import { combatDamage, resolveHeroDamage } from '../tools/dcss-rpg-rules.js';
import { createSwordRhythmState } from '../tools/dcss-rpg-swords.js';
import { activeDetectedTrapCells } from '../tools/dcss-rpg-traps.js';

const source = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');

function runtimeFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing runtime function ${name}`);
  const end = source.indexOf('\nfunction ', start + 1);
  assert.ok(end > start, `Missing runtime function boundary after ${name}`);
  return source.slice(start, end);
}

function installFunctions(context, names) {
  vm.runInContext(names.map(runtimeFunction).join('\n'), context, { timeout: 1000 });
}

function terminalRuntime({ victory = false } = {}) {
  const hero = {
    x: 96, y: 96, hp: 1, maxHp: 100, dead: false, path: [],
    attack: 0, attackCooldown: 0, hurt: 0, guardFlash: 0, targetAngle: 0,
    pendingAttack: null,
  };
  const context = vm.createContext({
    playSound: () => false,
    stopAmbient: () => {},
    startAmbient: () => {},
    setAmbientLevel: () => {},
    hero,
    runStatus: 'playing',
    run: { status: 'playing', floor: { resolved: [] }, stats: { kills: 0, activeSeconds: 0, killerId: null } },
    eventDefinitions: victory ? [] : [{
      id: 'blade-trap', instanceId: 'event-1-0', x: 96, y: 96,
      definition: { effect: 'damage', value: 14, path: 'dngn/traps/blade.png' },
    }],
    detectedTrapIds: new Set(),
    lootDefinitions: [],
    projectiles: [{ targetId: 'monster-1-0' }],
    monsters: [{ instanceId: 'monster-1-0', dead: 0, x: 160, y: 96 }],
    dungeon: { depth: 1, exit: victory ? { x: 1, y: 1 } : { x: 8, y: 8 } },
    lastHeroCell: '1,1',
    openingDoor: null,
    swordRhythmState: createSwordRhythmState(),
    deathTimer: 0,
    TILE: 64,
    ARTIFACT_PATH: 'artifact.png',
    performance: { now: () => 0 },
    rarityGlow: ['#ffffff'],
    updateHunger: () => {},
    updateHeroEffects: () => {},
    resolvePendingHeroAttack: () => {},
    updateHeldMove: () => {},
    currentHeroCombat: () => ({ style: 'blade', attackDuration: 0.3, cooldown: 0.8, guard: 0, damageScale: 1 }),
    currentHeroStats: () => ({ maxHp: 100, attack: 4, defense: 0 }),
    currentHeroMagic: () => ({ flight: false, invisibility: false, vampirism: false, immunity: [], healOnKill: 0 }),
    canHeroAttack: () => true, // A live enemy is deliberately in attack range.
    equippedItem: () => null,
    combatDamage,
    resolveHeroDamage,
    createSwordRhythmState,
    artifactAvailable: () => victory,
    canLeaveDungeonFloor: () => true,
    objectiveBossDefeated: () => true,
    persistRun: () => {},
    burst: () => {},
    addImpactWave: () => {},
    addCombatGlyph: () => {},
    addBloodImpact: () => {},
    beginHitStop: () => {},
    showLootToast: () => {},
    updateHud: () => {},
    showRunEndScreen: () => {},
  });
  installFunctions(context, ['updateHero', 'resolveWorldInteractions', 'damageHero', 'completeVictory']);
  return context;
}

test('an actual trap resolving inside updateHero cannot restart attacks after killing the hero', () => {
  const context = terminalRuntime();
  context.updateHero(0.016);
  assert.equal(context.runStatus, 'dead');
  assert.equal(context.hero.hp, 0);
  assert.equal(context.hero.dead, true);
  assert.equal(context.hero.attack, 0);
  assert.equal(context.hero.pendingAttack, null);
  assert.equal(context.projectiles.length, 0);
  assert.deepEqual(context.run.floor.resolved, ['event-1-0']);
  assert.equal(context.detectedTrapIds.has('event-1-0'), true);
});

test('victory resolving inside updateHero also stops the remainder of that combat frame', () => {
  const context = terminalRuntime({ victory: true });
  context.updateHero(0.016);
  assert.equal(context.runStatus, 'victory');
  assert.equal(context.hero.dead, false);
  assert.equal(context.hero.attack, 0);
  assert.equal(context.hero.pendingAttack, null);
  assert.equal(context.projectiles.length, 0);
});

const hazardOrigin = { x: 1, y: 2 };
const hazardTarget = { x: 2, y: 2 };
const hazardCells = new Set(['2,2']);
function warningState() {
  return hazardMoveIntent({
    state: createHazardInputState(), origin: hazardOrigin, target: hazardTarget,
    knownCells: hazardCells, gesture: 1,
  }).state;
}

function movementRuntime() {
  const context = vm.createContext({
    playSound: () => false,
    stopAmbient: () => {},
    startAmbient: () => {},
    setAmbientLevel: () => {},
    hero: { x: 96, y: 160, attack: 0, path: [], pendingAttack: null },
    hazardInputState: warningState(),
    permittedHazardCell: '2,2',
    playerHasActed: false,
    runStatus: 'playing',
    openingDoor: null,
    reducedMotion: true,
    ready: true,
    uiScreen: 'game',
    TILE: 64,
    run: { floor: { opened: [] } },
    world: ['###', '#D#', '#.#'].map((row) => [...row]),
    doorDefinitions: [{ instanceId: 'door-1-0', x: 1, y: 1 }],
    revealed: new Set(['1,1']),
    doorAnnouncement: { textContent: '' },
    createHazardInputState,
  });
  installFunctions(context, ['commitHeroPath', 'beginOpenDoor', 'beginDoorTransition']);
  return context;
}

function assertNextHazardPressWarns(context) {
  const intent = hazardMoveIntent({
    state: context.hazardInputState,
    origin: hazardOrigin, target: hazardTarget, knownCells: hazardCells, gesture: 2,
  });
  assert.equal(intent.allowed, false);
  assert.equal(intent.warn, true);
  assert.equal(context.permittedHazardCell, null);
}

test('safe path commits, including direct routes to doors, clear old trap warnings and consent', () => {
  const context = movementRuntime();
  assert.equal(context.commitHeroPath([{ x: 96, y: 96 }]), true);
  assert.deepEqual(context.hazardInputState, createHazardInputState());
  assertNextHazardPressWarns(context);
});

test('opening a door cancels trap consent before its animation or surprise starts', () => {
  const context = movementRuntime();
  const door = { instanceId: 'door-1-0', x: 1, y: 1 };
  assert.equal(context.beginOpenDoor(door), true);
  assert.equal(context.openingDoor.door, door);
  assert.equal(context.hero.path.length, 0);
  assert.deepEqual(context.hazardInputState, createHazardInputState());
  assertNextHazardPressWarns(context);
});

test('an explicitly confirmed hazardous path retains its permission instead of being reset as safe', () => {
  const context = movementRuntime();
  const warning = structuredClone(context.hazardInputState);
  assert.equal(context.commitHeroPath([{ x: 160, y: 160 }], '2,2'), true);
  assert.equal(context.permittedHazardCell, '2,2');
  assert.deepEqual(context.hazardInputState, warning);
});

test('runtime navigation avoids discovered traps without revealing hidden traps to player paths or enemy AI', () => {
  const grid = ['#######', '#.....#', '#.....#', '#.....#', '#######'].map((row) => [...row]);
  const trap = { instanceId: 'event-1-0', eventId: 'event-1-0', x: 3, y: 2, kind: 'blade', tier: 1 };
  const context = vm.createContext({
    playSound: () => false,
    stopAmbient: () => {},
    startAmbient: () => {},
    setAmbientLevel: () => {},
    TILE: 64,
    hero: { x: 96, y: 160 },
    world: grid,
    revealed: new Set(grid.flatMap((row, y) => row.map((_, x) => `${x},${y}`))),
    trapDefinitions: [trap],
    detectedTrapIds: new Set(),
    run: { floor: { resolved: [] }, stats: { kills: 0, activeSeconds: 0, killerId: null } },
    activeDetectedTrapCells,
    findGridPath,
    heroBlockingCells: () => new Set(),
    findDefinitions: [],
    isWalkable: (x, y) => grid[y]?.[x] === '.',
  });
  installFunctions(context, ['findPath', 'blockingFindCells', 'knownTrapCells']);
  const cells = (path) => Array.from(path, ({ x, y }) => `${Math.floor(x / 64)},${Math.floor(y / 64)}`);
  const hiddenPath = cells(context.findPath(5, 2));
  assert.equal(hiddenPath.includes('3,2'), true);
  context.detectedTrapIds.add(trap.instanceId);
  const discoveredPath = cells(context.findPath(5, 2));
  assert.equal(discoveredPath.includes('3,2'), false);
  assert.ok(discoveredPath.length > hiddenPath.length);
  assert.deepEqual(cells(context.findPath(5, 2, { allowHidden: true })), hiddenPath);
  assert.deepEqual(cells(context.findPath(5, 2, { allowedHazardCell: '3,2' })), hiddenPath);
  context.run.floor.resolved.push(trap.instanceId);
  assert.deepEqual(cells(context.findPath(5, 2)), hiddenPath);
});
