import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { equipmentMagic } from '../tools/dcss-rpg-magic.js';
import vm from 'node:vm';

import { findGridPath } from '../tools/dcss-rpg-core.js';
import { cellStepDistance } from '../tools/dcss-rpg-geometry.js';
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
    // Бессмертие бота (?qa=1&god=1) в обычной игре выключено.
    qaGod: false,
    // Передышка помнит, когда по герою били (см. dcss-rpg-recovery.js).
    heroThreatAt: 0,
    elapsed: 0,
    playSound: () => false,
    // Копилка вампиризма живёт во времени; в песочнице времени нет.
    vampiricBudget: () => 0,
    vampiricPool: 0,
    // Путь к монете интерфейса — модульная константа адаптера.
    GOLD_ICON_PATH: 'licensed/7soul-icons/coin-gold.png',
    // The hero's own voice: the sandbox has no appearance, so it stays itself.
    heroVoice: (soundId) => soundId,
    // Weapon techniques are pure modules; the sandbox only needs them to be quiet.
    heroSteadySeconds: 0,
    findIsVisible: () => true,
    refreshVisibleSecrets: () => {},
    visibleSecretIds: new Set(),
    HERO_SIGHT_RADIUS: 5.2,
    heroSwiftness: () => 1,
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
    stopAmbient: () => {},
    stopMusic: () => {},
    startAmbient: () => {},
    setAmbientLevel: () => {},
    hero,
    runStatus: 'playing',
    run: {
      status: 'playing',
      floor: { resolved: [] },
      crime: { wanted: 0, jailed: false },
      stats: { kills: 0, activeSeconds: 0, killerId: null },
    },
    eventDefinitions: victory ? [] : [{
      id: 'blade-trap', instanceId: 'event-1-0', x: 96, y: 96,
      definition: { effect: 'damage', value: 14, path: 'dngn/traps/blade.png' },
    }],
    detectedTrapIds: new Set(),
    lootDefinitions: [],
    projectiles: [{ targetId: 'monster-1-0' }],
    monsters: [{ instanceId: 'monster-1-0', dead: 0, x: 160, y: 96 }],
    dungeon: { depth: 1, exit: victory ? { x: 1, y: 1 } : { x: 8, y: 8 }, spawn: { x: 9, y: 9 } },
    stairsArmed: true,
    // The city's ledger is a floor away from these fixtures; the stubs keep
    // damageHero honest without dragging the whole town in.
    isCityDepth: () => false,
    isWanted: () => false,
    jailHero: () => false,
    climbFloor: () => {},
    lastHeroCell: '1,1',
    openingDoor: null,
    swordRhythmState: createSwordRhythmState(),
    deathTimer: 0,
    TILE: 64,
    ARTIFACT_PATH: 'artifact.png',
    performance: { now: () => 0 },
    rarityGlow: ['#ffffff'],
    updateHunger: () => {},
    updateHeroFooting: () => {},
    updateHeroEffects: () => {},
    resolvePendingHeroAttack: () => {},
    updateHeldMove: () => {},
    currentHeroCombat: () => ({ style: 'blade', attackDuration: 0.3, cooldown: 0.8, guard: 0, damageScale: 1 }),
    currentHeroStats: () => ({ maxHp: 100, attack: 4, defense: 0 }),
    currentHeroMagic: () => equipmentMagic({}, []),
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
    // Столбик кнопок пересобирается после всего, что меняет пол; рисовать его
    // в песочнице нечем и незачем.
    updateInteractionUi: () => {},
    playerHasActed: false,
    eventGold: () => 0,
    showRunEndScreen: () => {},
    // Past the stair block the frame carries on through the rest of the world;
    // these keep it quiet without dragging the whole dungeon in.
    passiveCreatures: [],
    descents: 0,
    descendFloor() { context.descents += 1; },
    isCityDepth: () => false,
  });
  installFunctions(context, [
    // Ловушка срабатывает сама, и срабатывает тем же ходом, что и всё
    // остальное на полу, — поэтому сюда же едет и он.
    'updateHero', 'resolveWorldInteractions', 'triggerFloorEvent', 'damageHero',
    'surviveOnSecondWind', 'completeVictory',
  ]);
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

/**
 * Standing on the last stair with the warden down used to end the run then and
 * there. It is a fork now — the panel asks whether the artefact ends the run or
 * the stair keeps going — and the thing to guard is that walking onto the tile
 * answers nothing on the hero's behalf.
 */
test('the last stair asks instead of ending the run under the hero', () => {
  const context = terminalRuntime({ victory: true });
  // The stair block itself, not the whole combat frame: victory no longer
  // resolves inside a frame at all, so there is nothing further to stop.
  context.resolveWorldInteractions();
  assert.equal(context.runStatus, 'playing', 'the stair decided for the hero');
  assert.equal(context.hero.dead, false);
  assert.equal(context.descents, 0, 'and it did not walk them down either');
});

/**
 * Шаг на лестницу вниз никуда не уводит — даже открытую, без артефакта и со
 * стражем, которого уже нет. Спуск теперь только кнопка в карточке.
 */
test('standing on an open down stair does not change the floor', () => {
  const context = terminalRuntime({ victory: true });
  context.artifactAvailable = () => false;
  context.resolveWorldInteractions();
  context.resolveWorldInteractions();
  assert.equal(context.descents, 0, 'the step walked the hero down');
  assert.equal(context.runStatus, 'playing');
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
    // Бессмертие бота (?qa=1&god=1) в обычной игре выключено.
    qaGod: false,
    // Передышка помнит, когда по герою били (см. dcss-rpg-recovery.js).
    heroThreatAt: 0,
    elapsed: 0,
    playSound: () => false,
    // The hero's own voice: the sandbox has no appearance, so it stays itself.
    heroVoice: (soundId) => soundId,
    // Weapon techniques are pure modules; the sandbox only needs them to be quiet.
    heroSteadySeconds: 0,
    findIsVisible: () => true,
    refreshVisibleSecrets: () => {},
    visibleSecretIds: new Set(),
    HERO_SIGHT_RADIUS: 5.2,
    heroSwiftness: () => 1,
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
    run: { floor: { opened: [] }, crime: { wanted: 0, jailed: false } },
    world: ['###', '#D#', '#.#'].map((row) => [...row]),
    doorDefinitions: [{ instanceId: 'door-1-0', x: 1, y: 1 }],
    revealed: new Set(['1,1']),
    doorAnnouncement: { textContent: '' },
    createHazardInputState,
    // Дверь меряет расстояние тем же королевским шагом, что и взаимодействие.
    cellStepDistance,
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
    // Бессмертие бота (?qa=1&god=1) в обычной игре выключено.
    qaGod: false,
    // Передышка помнит, когда по герою били (см. dcss-rpg-recovery.js).
    heroThreatAt: 0,
    elapsed: 0,
    playSound: () => false,
    // The hero's own voice: the sandbox has no appearance, so it stays itself.
    heroVoice: (soundId) => soundId,
    // Weapon techniques are pure modules; the sandbox only needs them to be quiet.
    heroSteadySeconds: 0,
    findIsVisible: () => true,
    refreshVisibleSecrets: () => {},
    visibleSecretIds: new Set(),
    HERO_SIGHT_RADIUS: 5.2,
    heroSwiftness: () => 1,
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
