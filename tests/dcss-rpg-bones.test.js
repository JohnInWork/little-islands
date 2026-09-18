import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BONES_LIMIT,
  BONES_SEARCH_RADIUS,
  bonesCopy,
  bonesForDepth,
  bonesKey,
  GHOST_LEVEL_CAP,
  bonesPlacement,
  createBonesRecord,
  createBonesState,
  ghostStats,
  rememberBones,
  validateBonesRecord,
} from '../tools/dcss-rpg-bones.js';
import {
  createMetaState,
  forgetBones,
  parseMeta,
  recordBones,
  serializeMeta,
  validateMetaState,
} from '../tools/dcss-rpg-meta.js';
import { rollBonesReward } from '../tools/dcss-rpg-core.js';
import { lootById } from '../tools/dcss-rpg-content.js';

const deathAt = (overrides = {}) => ({
  depth: 3,
  x: 12,
  y: 9,
  level: 6,
  killerId: 'gnoll',
  seed: 4242,
  at: '2026-09-19',
  appearance: { bodyId: 'human-female', hairId: 'long-black' },
  gear: [
    { slot: 'hand1', id: 'long-sword', materialId: 'steel', affixIds: ['keen'] },
    { slot: 'body', id: 'ring-mail', materialId: null, affixIds: [] },
  ],
  ...overrides,
});

test('a death becomes a record the dungeon can keep', () => {
  const record = createBonesRecord(deathAt());
  assert.ok(validateBonesRecord(record));
  assert.equal(record.depth, 3);
  assert.equal(record.gear.length, 2);
  assert.equal(record.gear[0].materialId, 'steel');
  // Junk in the gear list is dropped rather than carried into the runtime.
  const dirty = createBonesRecord(deathAt({
    gear: [{ slot: 'pocket', id: 'long-sword' }, { slot: 'head', id: 42 }, { slot: 'boots', id: 'boots' }],
  }));
  assert.deepEqual(dirty.gear.map(({ slot }) => slot), ['boots']);
  assert.equal(createBonesRecord({ depth: 0 })?.depth, 1);
});

test('the dungeon keeps one body per floor, newest first', () => {
  let bones = createBonesState();
  for (const depth of [1, 2, 3, 4, 5, 6]) {
    bones = rememberBones(bones, deathAt({ depth, seed: 100 + depth }));
  }
  assert.equal(bones.length, BONES_LIMIT);
  bones = rememberBones(bones, deathAt({ depth: bones[0].depth, seed: 999, level: 12 }));
  assert.equal(bones.length, BONES_LIMIT, 'a second death on a floor replaces the first');
  assert.equal(bones.filter((record) => record.depth === bones[0].depth).length, 1);
  assert.equal(bones[0].level, 12);
});

test('a run never meets its own body', () => {
  const bones = rememberBones([], deathAt({ seed: 4242 }));
  assert.equal(bonesForDepth(bones, 3, { excludeSeed: 4242 }), null);
  assert.equal(bonesForDepth(bones, 3, { excludeSeed: 7 })?.seed, 4242);
  assert.equal(bonesForDepth(bones, 4), null);
});

test('the body lies where it fell, or as near as the new floor allows', () => {
  const bones = createBonesRecord(deathAt());
  assert.deepEqual(
    bonesPlacement({ bones, isFree: () => true }),
    { x: 12, y: 9, moved: false },
  );
  // The fatal cell is solid rock in this run: the search spirals outward.
  const moved = bonesPlacement({ bones, isFree: (x, y) => x === 15 && y === 9 });
  assert.deepEqual(moved, { x: 15, y: 9, moved: true });
  assert.equal(bonesPlacement({ bones, isFree: () => false }), null);
  const tooFar = bonesPlacement({
    bones,
    isFree: (x) => x === bones.x + BONES_SEARCH_RADIUS + 1,
  });
  assert.equal(tooFar, null, 'a body is never dragged across the whole floor');
});

test('the ghost is worth the level it died at, and names itself', () => {
  const weak = ghostStats(createBonesRecord(deathAt({ depth: 9, level: 2 })));
  const strong = ghostStats(createBonesRecord(deathAt({ depth: 9, level: 14 })));
  assert.ok(strong.hp > weak.hp * 2);
  assert.ok(strong.damage > weak.damage);
  // A first floor ground to level nine must not leave a level-nine ghost where
  // every later run arrives at level one.
  assert.equal(GHOST_LEVEL_CAP(1), 4);
  assert.deepEqual(
    ghostStats(createBonesRecord(deathAt({ depth: 1, level: 9 }))),
    ghostStats(createBonesRecord(deathAt({ depth: 1, level: 4 }))),
  );
  assert.ok(ghostStats(createBonesRecord(deathAt({ depth: 9, level: 9 }))).hp
    > ghostStats(createBonesRecord(deathAt({ depth: 1, level: 9 }))).hp);
  assert.equal(bonesKey(createBonesRecord(deathAt())), '3:4242:2026-09-19');
  assert.match(bonesCopy('ru').title(6), /^Призрак героя 6/);
  assert.equal(typeof bonesCopy('en').woken, 'string');
});

test('bones ride in meta, and are spent when the ghost is answered', () => {
  let meta = recordBones(createMetaState(), deathAt());
  assert.equal(meta.bones.length, 1);
  assert.ok(validateMetaState(meta));
  const reloaded = parseMeta(serializeMeta(meta));
  assert.equal(reloaded.bones.length, 1, 'a death survives the save it was written to');
  assert.equal(reloaded.bones[0].gear[0].id, 'long-sword');
  meta = forgetBones(meta, 3);
  assert.equal(meta.bones.length, 0);
  assert.ok(validateMetaState(meta));
  assert.equal(forgetBones(createMetaState(), 3).bones.length, 0);
});

test('the ghost guards a fresh find, not the kit it is wearing', () => {
  const key = bonesKey(createBonesRecord(deathAt()));
  const reward = rollBonesReward({ seed: 4242, depth: 3, key });
  assert.deepEqual(reward, rollBonesReward({ seed: 4242, depth: 3, key }), 'one body, one find');
  assert.equal(reward.instanceId, 'bones-3');
  // Always something to wear or swing: a fight is not paid for in bread.
  for (const depth of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const rolled = rollBonesReward({ seed: 909, depth, key: `${depth}:1:x` });
    assert.ok(lootById(rolled.id)?.slot, `depth ${depth} pays in equipment`);
  }
  // Deeper is better: the shallow pool cannot reach what the deep pool can.
  const shallow = new Set();
  const deep = new Set();
  for (let seed = 0; seed < 60; seed += 1) {
    shallow.add(rollBonesReward({ seed, depth: 1, key: 'k' }).id);
    deep.add(rollBonesReward({ seed, depth: 9, key: 'k' }).id);
  }
  assert.ok([...deep].some((id) => !shallow.has(id)));
  assert.equal(rollBonesReward({ seed: 1, depth: 0, key: 'k' }), null);
});

test('the runtime places the ghost without writing it into the floor', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  // The floor's id lists are generated; a ghost id in any of them fails the
  // save's own validation, so the bones are spent in meta instead.
  assert.match(runtime, /if \(monster\.ghost\) claimFloorBones\(\);\s*\n\s*else run\.floor\.defeated\.push/);
  assert.match(runtime, /if \(loot\.bones\) wakeFloorGhost\(\);\s*\n\s*else run\.floor\.collected\.push/);
  assert.match(runtime, /\.filter\(\(monster\) => monster\.dead === 0 && !monster\.ghost\)/);
  // Killing your own ghost is not a crime, and it never joins the city watch.
  assert.match(runtime, /if \(monster\.neutral && !monster\.ghost\) noteCrime\('killed-guard'\);/);
  assert.match(runtime, /function placeFloorGhost\(\)[\s\S]*monsters = monsters\.filter\(\(monster\) => !monster\.ghost\);/);
  assert.match(runtime, /function placeFloorGhost\(\)[\s\S]*seed: bones\.seed,/);
  assert.match(runtime, /function ghostActor3D\(\)[\s\S]*layers: ghost\.layers,/);
  assert.match(runtime, /function ghostLayers\(bones\)[\s\S]*composePlayerLayerStack\(/);
});
