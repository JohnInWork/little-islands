import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { canCloseDoor } from '../tools/dcss-rpg-doors.js';
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
    ready: true, uiScreen: 'game', runStatus: 'playing', reducedMotion: false,
    TILE: 64, hero: { x: 96, y: 160, hp: 100, dead: false, path: [] },
    monsters: [], passiveCreatures: [], openingDoor: null,
    world: ['#####', '#...#', open ? '#...#' : '#.D.#', '#...#', '#####'].map((row) => [...row]),
    run: { floor: { opened: open ? [door.instanceId] : [], triggered: [] } },
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
  assert.equal(records.feedback.filter((text) => text === '◆◆◆').length, 1);
  assert.equal(c.toggleNearbyDoor(), true);
  assert.equal(c.world[2][2], 'D', 'closing reserves threshold before any actor advances');
  assert.equal(c.run.floor.opened.length, 1, 'save still has old state until commit');
  c.updateDoorOpening(1);
  assert.equal(c.run.floor.opened.length, 0);
  assert.equal(c.beginOpenDoor(door), true);
  c.updateDoorOpening(1);
  assert.equal(c.world[2][2], '.');
  assert.equal(records.feedback.filter((text) => text === '◆◆◆').length, 1);
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
