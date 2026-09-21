import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { canCloseDoor } from '../tools/dcss-rpg-doors.js';
import { cellStepDistance } from '../tools/dcss-rpg-geometry.js';
import { createHazardInputState } from '../tools/dcss-rpg-hazard-input.js';
import { mainMenuModel } from '../tools/dcss-rpg-menu.js';

const source = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
function runtimeFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  const end = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, end);
}

function fixture({ open = false } = {}) {
  const door = { instanceId: 'door-1-0', x: 2, y: 2, axis: 'x', surpriseId: 'surprise-1-0' };
  const records = { saves: 0, feedback: [], progress: [], rebuilds: 0 };
  const context = vm.createContext({
    // Reach is one shared rule now; the sandbox borrows the real one.
    cellStepDistance,
    playSound: () => false,
    // Путь к монете интерфейса — модульная константа адаптера.
    GOLD_ICON_PATH: 'licensed/7soul-icons/coin-gold.png',
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
    stopAmbient: () => {},
    stopMusic: () => {},
    startAmbient: () => {},
    setAmbientLevel: () => {},
    ready: true, uiScreen: 'game', runStatus: 'playing', reducedMotion: false,
    TILE: 64, hero: { x: 96, y: 160, hp: 100, dead: false, path: [] },
    monsters: [], passiveCreatures: [], allies: [], openingDoor: null,
    world: ['#####', '#...#', open ? '#...#' : '#.D.#', '#...#', '#####'].map((row) => [...row]),
    run: { floor: { opened: open ? [door.instanceId] : [], triggered: [] }, crime: { wanted: 0, jailed: false } },
    dungeon: { doors: [door], surprises: [{ id: door.surpriseId, type: 'treasure', monsterIds: [] }] },
    doorDefinitions: [door], revealed: new Set(['1,2', '2,2', '3,2']),
    hazardInputState: createHazardInputState(), permittedHazardCell: '2,2', playerHasActed: false,
    doorAnnouncement: { textContent: '' },
    canCloseDoor, createHazardInputState, currentMainMenuModel: () => mainMenuModel({ language: 'ru' }),
    assetUrl: (path) => path,
    dungeonWorld3D: { setDoorOpenProgress: (x, y, progress) => records.progress.push(progress) },
    rebuildDungeonWorld3D: () => { records.rebuilds += 1; },
    persistRun: () => { records.saves += 1; },
    burst: () => {}, addImpactWave: () => {}, addCombatGlyph: () => {},
    revealAround: () => {}, discoverNearbyTraps: () => {}, updateHud: () => {},
    showLootToast: (item, text) => records.feedback.push(text),
  });
  vm.runInContext([
    'nearbyDoor', 'nearbyClosedDoor', 'beginDoorTransition',
    'beginOpenDoor', 'toggleNearbyDoor', 'updateDoorOpening', 'triggerDoorSurprise',
  ].map(runtimeFunction).join('\n'), context);
  return { context, door, records };
}

test('runtime open-close-open retains the door and never repeats its one-shot surprise', () => {
  const { context: c, door, records } = fixture();
  assert.equal(c.beginOpenDoor(door), true);
  assert.equal(c.toggleNearbyDoor(), false, 'repeated command cannot interrupt animation');
  c.updateDoorOpening(0.3);
  assert.equal(c.world[2][2], 'D');
  assert.equal(c.run.floor.opened.length, 0, 'opening is not committed early');
  c.updateDoorOpening(1);
  assert.equal(c.world[2][2], '.');
  assert.deepEqual(Array.from(c.run.floor.opened), [door.instanceId]);
  assert.equal(c.doorDefinitions.length, 1);
  assert.equal(c.dungeon.doors.length, 1);
  assert.deepEqual(Array.from(c.run.floor.triggered), ['surprise-1-0']);
  assert.equal(records.feedback.filter((text) => text === '●●●').length, 1);
  assert.equal(c.toggleNearbyDoor(), true);
  assert.equal(c.world[2][2], 'D', 'closing reserves threshold before any actor advances');
  assert.equal(c.run.floor.opened.length, 1, 'save still has old state until commit');
  c.updateDoorOpening(1);
  assert.equal(c.run.floor.opened.length, 0);
  assert.equal(c.beginOpenDoor(door), true);
  c.updateDoorOpening(1);
  assert.equal(c.world[2][2], '.');
  assert.equal(records.feedback.filter((text) => text === '●●●').length, 1);
  assert.equal(records.saves, 3);
});

test('runtime rejects closing on hero, monsters, fauna and their next step without mutating paths', () => {
  for (const kind of ['hero', 'monster', 'fauna', 'reservation']) {
    const { context: c, door } = fixture({ open: true });
    if (kind === 'hero') c.hero.x = 160;
    if (kind === 'monster') c.monsters.push({ x: 160, y: 160, dead: 0, hp: 10 });
    if (kind === 'fauna') c.passiveCreatures.push({ x: 160, y: 160 });
    if (kind === 'reservation') c.hero.path.push({ x: 160, y: 160 });
    assert.equal(c.beginDoorTransition(door, false), false, kind);
    assert.equal(c.world[2][2], '.', kind);
    assert.equal(c.run.floor.opened.length, 1, kind);
    assert.equal(c.openingDoor, null, kind);
    assert.ok(c.doorAnnouncement.textContent.includes('Проём занят'));
    if (kind === 'reservation') assert.equal(c.hero.path.length, 1);
  }
});

test('interrupted closing restores prior state and cannot commit after death', () => {
  const { context: c, door, records } = fixture({ open: true });
  assert.equal(c.beginDoorTransition(door, false), true);
  c.hero.dead = true;
  c.runStatus = 'dead';
  c.updateDoorOpening(1);
  assert.equal(c.world[2][2], '.');
  assert.deepEqual(Array.from(c.run.floor.opened), [door.instanceId]);
  assert.equal(c.openingDoor, null);
  assert.equal(records.saves, 0);
  assert.equal(c.toggleNearbyDoor(), false);
});

test('diegetic door command is range-checked and pause-safe without a HUD action', () => {
  const { context: c, door } = fixture({ open: true });
  c.uiScreen = 'menu';
  assert.equal(c.toggleNearbyDoor(), false);
  c.uiScreen = 'game';
  c.hero.x = 32;
  assert.equal(c.beginDoorTransition(door, false), false, 'remote forged command rejected');
});

/**
 * Открытая дверь — проём, а не кнопка.
 *
 * Касание двери было переключателем: нажал — открыл, нажал ещё раз — закрыл.
 * Пока дверь открыта, палец по ней означает ровно одно — «иду туда», — а игра
 * захлопывала её перед героем. Иван: «надо, чтобы если дверь открыта и туда
 * пальцем нажали, персонаж пошёл в открытую дверь, а не открывал-закрывал её».
 * Закрыть дверь остаётся возможным кнопкой действия: там это выбор, а не
 * промах пальцем.
 */
test('касание открытой двери ведёт героя сквозь неё, а не закрывает', async () => {
  const { readFile } = await import('node:fs/promises');
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const начало = runtime.indexOf('function moveFromPointer(event)');
  assert.ok(начало > 0, 'обработчик касания не найден');
  const тело = runtime.slice(начало, runtime.indexOf('\n}\n', начало));

  // Ветка двери срабатывает только для закрытой.
  assert.match(
    тело,
    /if \(door && revealed\.has\(`\$\{door\.x\},\$\{door\.y\}`\) && !run\.floor\.opened\.includes\(door\.instanceId\)\)/,
    'касание двери снова не смотрит, открыта ли она',
  );
  // И прежнего переключателя «открыта — тоже жмём» больше нет.
  assert.ok(!тело.includes('isOpen && distance <= 1'), 'открытая дверь всё ещё перехватывает касание');
  // Кнопка действия при этом остаётся: закрывать дверь по-прежнему можно.
  assert.match(runtime, /add\('door', nearbyDoor\(\)\)|kind: 'door'/, 'дверь пропала из кнопки действий');
});
