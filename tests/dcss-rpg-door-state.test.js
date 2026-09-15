import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import { createRun, generateDungeon, hydrateDungeon, SAVE_VERSION, validateRun } from '../tools/dcss-rpg-core.js';
import { canCloseDoor } from '../tools/dcss-rpg-doors.js';
import { createMonsterStates } from '../tools/dcss-rpg-rules.js';
import { createPassiveCreatureStates } from '../tools/dcss-rpg-passive.js';
import {
  createDoorAssembly,
  setDoorAssemblyOpenProgress,
  WORLD_CAMERA_ELEVATION,
  WORLD_DOOR_HEIGHT,
} from '../tools/dcss-rpg-world3d.js';

const door = { x: 4, y: 3, axis: 'x', instanceId: 'door-1-0' };
const tileSize = 64;
const at = (x, y, extra = {}) => ({ x: (x + 0.5) * tileSize, y: (y + 0.5) * tileSize, ...extra });

test('live hero, hostile and fauna occupants prevent closing; dead bodies do not', () => {
  for (const extra of [{ dead: false }, { dead: 0 }, {}]) {
    assert.equal(canCloseDoor({ door, actors: [at(4, 3, extra)], tileSize }), false);
  }
  for (const dead of [true, 0.01, 1]) {
    assert.equal(canCloseDoor({ door, actors: [at(4, 3, { dead })], tileSize }), true);
  }
  assert.equal(canCloseDoor({ door, actors: [at(3, 3)], tileSize }), true);
  assert.equal(canCloseDoor({ door, actors: [], tileSize }), true);
});

test('a body overlapping the doorway edge prevents closing before its center enters', () => {
  for (const actor of [
    { x: 4 * tileSize - 4, y: 3.5 * tileSize },
    { x: 5 * tileSize + 4, y: 3.5 * tileSize },
    { x: 4.5 * tileSize, y: 3 * tileSize - 4 },
    { x: 4.5 * tileSize, y: 4 * tileSize + 4 },
  ]) assert.equal(canCloseDoor({ door, actors: [actor], tileSize }), false);
});

test('the immediate hero path, monster route and fauna wander target reserve a door', () => {
  for (const intent of [
    { path: [at(4, 3)] },
    { route: [at(4, 3)] },
    { wanderTarget: { ...at(4, 3), gridX: 4, gridY: 3 } },
  ]) {
    const actor = at(3, 3, intent);
    const before = JSON.stringify(actor);
    assert.equal(canCloseDoor({ door, actors: [actor], tileSize }), false);
    assert.equal(JSON.stringify(actor), before, 'query must not cancel or move actors');
  }
  assert.equal(canCloseDoor({ door, actors: [at(2, 3, { path: [at(3, 3), at(4, 3)] })], tileSize }), true);
});

test('door occupancy rejects ambiguous live positions and malformed closing requests', () => {
  assert.equal(canCloseDoor({ door, actors: [{ x: NaN, y: 0 }], tileSize }), false);
  assert.throws(() => canCloseDoor({ door, actors: [], tileSize: 0 }), TypeError);
  assert.throws(() => canCloseDoor({ door: {}, actors: [], tileSize }), TypeError);
});

test('v15 reload retains open doors, and reclosing does not rearm surprise encounters', () => {
  const dungeon = generateDungeon({ seed: 404, depth: 1 });
  const run = createRun(404, dungeon);
  const surpriseDoor = dungeon.doors.find(({ surpriseId }) => surpriseId);
  assert.ok(surpriseDoor);
  run.floor.opened = [surpriseDoor.instanceId];
  run.floor.triggered = [surpriseDoor.surpriseId];
  const originalVersion = run.version;
  for (let cycle = 0; cycle < 3; cycle += 1) {
    for (const open of [true, false]) {
      run.floor.opened = open ? [surpriseDoor.instanceId] : [];
      const loadedRun = JSON.parse(JSON.stringify(run));
      assert.equal(validateRun(loadedRun), true);
      const hydrated = hydrateDungeon(loadedRun);
      assert.equal(hydrated.grid[surpriseDoor.y][surpriseDoor.x], open ? '.' : 'D');
      assert.deepEqual(hydrated.doors, dungeon.doors);
      assert.equal(hydrated.surprises.find(({ id }) => id === surpriseDoor.surpriseId).triggered, true);
      assert.deepEqual(loadedRun.floor.triggered, [surpriseDoor.surpriseId]);
      assert.equal(loadedRun.version, originalVersion);
    }
  }
  assert.equal(SAVE_VERSION, 25, 'interaction state is persisted in the current save');
});

for (const kind of ['monster', 'passive']) {
  test(`closing and reload preserve a ${kind} just beyond the doorway without a half-cell shift`, () => {
    const axes = new Set();
    for (let seed = 1; seed <= 40 && axes.size < 2; seed += 1) {
      const dungeon = generateDungeon({ seed, depth: 1 });
      for (const doorway of dungeon.doors) {
        if (axes.has(doorway.axis)) continue;
        const run = createRun(seed, dungeon);
        const makeActors = kind === 'monster' ? createMonsterStates : createPassiveCreatureStates;
        const original = makeActors(dungeon, tileSize)[0];
        assert.ok(original);
        // The body is entirely clear of the threshold, but the old offset
        // validation would read the doorway cell and reject this valid save.
        const position = {
          x: doorway.x + (doorway.axis === 'x' ? 0.9 : 0),
          y: doorway.y + (doorway.axis === 'y' ? 0.9 : 0),
        };
        const runtimeActor = {
          ...original,
          x: (position.x + 0.5) * tileSize,
          y: (position.y + 0.5) * tileSize,
        };
        run.floor.opened = [doorway.instanceId];
        if (doorway.surpriseId) run.floor.triggered = [doorway.surpriseId];
        assert.equal(canCloseDoor({ door: doorway, actors: [runtimeActor], tileSize }), true);
        run.floor.opened = [];
        const state = { instanceId: original.instanceId, ...position };
        if (kind === 'monster') run.floor.monsters = [{ ...state, hp: original.hp }];
        else run.floor.passives = [{
          ...state,
          wanderStep: 3,
          facing: -1,
          hunted: false,
          defeated: false,
          hp: 1,
          attackSequence: 0,
        }];
        const serialized = JSON.stringify(run);
        const loadedRun = JSON.parse(serialized);
        assert.equal(validateRun(loadedRun), true);
        const hydrated = hydrateDungeon(loadedRun);
        assert.equal(hydrated.grid[doorway.y][doorway.x], 'D');
        const restored = makeActors(hydrated, tileSize).find(({ instanceId }) => instanceId === original.instanceId);
        assert.equal(restored.x, runtimeActor.x);
        assert.equal(restored.y, runtimeActor.y);
        assert.equal(JSON.stringify(loadedRun), serialized, 'hydration must not rewrite stored coordinates');

        // The inverse case must still be rejected: the offset looks like the
        // neighbouring floor, while the actual body center is inside the door.
        const blockedState = {
          ...state,
          x: doorway.x - (doorway.axis === 'x' ? 0.1 : 0),
          y: doorway.y - (doorway.axis === 'y' ? 0.1 : 0),
        };
        if (kind === 'monster') loadedRun.floor.monsters = [{ ...blockedState, hp: original.hp }];
        else loadedRun.floor.passives = [{
          ...blockedState,
          wanderStep: 3,
          facing: -1,
          hunted: false,
          defeated: false,
          hp: 1,
          attackSequence: 0,
        }];
        assert.throws(() => hydrateDungeon(loadedRun), /Saved (monster|passive creature) position is blocked/);
        axes.add(doorway.axis);
      }
    }
    assert.deepEqual([...axes].sort(), ['x', 'y']);
  });
}

test('both door axes keep a visible hinged leaf at 90 degrees beside the passage', () => {
  const scale = Math.sin(THREE.MathUtils.degToRad(WORLD_CAMERA_ELEVATION));
  for (const axis of ['x', 'y']) {
    const panelMaterial = new THREE.MeshBasicMaterial();
    const frameMaterial = new THREE.MeshBasicMaterial();
    const assembly = createDoorAssembly({ door: { ...door, axis }, panelMaterial, frameMaterial });
    const center = new THREE.Vector3((door.x + 0.5) * scale, WORLD_DOOR_HEIGHT / 2, door.y + 0.5);
    assembly.group.updateMatrixWorld(true);
    assert.equal(new THREE.Box3().setFromObject(assembly.panel).containsPoint(center), true);
    const closedMatrix = assembly.panel.matrixWorld.clone();
    const hinge = assembly.pivot.position.clone();
    const originalChildren = assembly.group.children.length;

    setDoorAssemblyOpenProgress(assembly, 1);
    assembly.group.updateMatrixWorld(true);
    assert.equal(Math.abs(assembly.pivot.rotation.y), Math.PI / 2);
    assert.equal(new THREE.Box3().setFromObject(assembly.panel).containsPoint(center), false);
    assert.ok(assembly.pivot.position.equals(hinge));
    assert.equal(assembly.panel.visible, true);
    assert.equal(assembly.panel.castShadow, true);
    assert.equal(assembly.group.children.length, originalChildren);
    assert.equal(assembly.panel.parent, assembly.pivot);
    assert.equal(assembly.panel.position.y, WORLD_DOOR_HEIGHT / 2);

    for (const progress of [0.8, 0.5, 0.2, 0]) setDoorAssemblyOpenProgress(assembly, progress);
    assembly.group.updateMatrixWorld(true);
    assert.ok(assembly.panel.matrixWorld.equals(closedMatrix), 'closing restores the exact original pose');
    assembly.group.traverse((child) => child.geometry?.dispose());
    panelMaterial.dispose();
    frameMaterial.dispose();
  }
});

test('reconstructed open geometry starts at the saved endpoint, not a closed flash', () => {
  const material = new THREE.MeshBasicMaterial();
  const assembly = createDoorAssembly({ door: { ...door, open: true }, panelMaterial: material, frameMaterial: material });
  assert.equal(assembly.pivot.rotation.y, Math.PI / 2);
  setDoorAssemblyOpenProgress(assembly, 4);
  assert.equal(assembly.pivot.rotation.y, Math.PI / 2);
  setDoorAssemblyOpenProgress(assembly, -1);
  assert.equal(assembly.pivot.rotation.y, 0);
  assembly.group.traverse((child) => child.geometry?.dispose());
  material.dispose();
});
