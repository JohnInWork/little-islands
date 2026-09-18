import assert from 'node:assert/strict';
import test from 'node:test';

import { environmentThemeFor } from '../tools/dcss-rpg-room-plans.js';

import { chestFramesForSkin, chestVisualFrames } from '../tools/dcss-rpg-chests.js';
import { isCityDepth } from '../tools/dcss-rpg-city.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { createDungeonEnvironment } from '../tools/dcss-rpg-environment.js';
import {
  DUNGEON_THEME_CATALOG,
  FLOORS_PER_CHAPTER,
  ROOM_ARCHETYPE_CATALOG,
  createDungeonRoomPlans,
  chapterThemeOrder,
  dungeonThemeById,
  dungeonThemeFor,
  roomArchetypeById,
} from '../tools/dcss-rpg-room-plans.js';
import { floorScaling } from '../tools/dcss-rpg-scaling.js';
import { biomeThemeFor } from '../tools/dcss-rpg-visuals.js';

test('dungeon themes own compatible surfaces, chests and room families', () => {
  assert.equal(FLOORS_PER_CHAPTER, 3);
  assert.equal(new Set(DUNGEON_THEME_CATALOG.map(({ id }) => id)).size, DUNGEON_THEME_CATALOG.length);
  assert.equal(new Set(ROOM_ARCHETYPE_CATALOG.map(({ id }) => id)).size, ROOM_ARCHETYPE_CATALOG.length);
  for (const theme of DUNGEON_THEME_CATALOG) {
    assert.equal(Object.isFrozen(theme), true);
    assert.ok(theme.chestSkinIds.length >= 1);
    assert.ok(theme.chestSkinIds.every((id) => chestFramesForSkin(id)?.length === 4));
    assert.ok(theme.roomArchetypeIds.every((id) => roomArchetypeById(id)?.implemented));
  }
  const merchant = roomArchetypeById('merchant-alcove');
  assert.equal(merchant.implemented, true);
  assert.equal(merchant.role, 'service');
  assert.deepEqual(merchant.content, { actorId: 'merchant', interactionId: 'trade' });
});

test('visual theme and difficulty chapter advance on the same depth boundary', () => {
  for (const seed of [0, 3, 97]) {
    const order = chapterThemeOrder(seed);
    assert.equal(new Set(order).size, DUNGEON_THEME_CATALOG.length, 'the shuffle lost a theme');
    for (let depth = 1; depth <= 32; depth += 1) {
      // The city keeps its own surfaces and belongs to no chapter rotation.
      if (isCityDepth(depth)) {
        assert.equal(dungeonThemeFor(seed, depth).id, 'gate-town');
        assert.equal(biomeThemeFor('gate-town').id, 'gate-town');
        continue;
      }
      const scaling = floorScaling(depth);
      const theme = dungeonThemeFor(seed, depth);
      // The boundary is still the chapter boundary; only which place sits in
      // each chapter is the run's own.
      assert.equal(theme, order[(scaling.chapter - 1) % order.length]);
      assert.equal(biomeThemeFor(theme.id).id, theme.surfaceSetId);
      assert.ok(scaling.floorInChapter >= 1 && scaling.floorInChapter <= FLOORS_PER_CHAPTER);
    }
  }
});

test('room plans are deterministic, semantic and schedule one merchant per chapter', () => {
  for (let seed = 1; seed <= 250; seed += 1) {
    const depth = 1 + (seed % 8);
    if (isCityDepth(depth)) continue;
    const dungeon = generateDungeon({ seed, depth });
    const again = createDungeonRoomPlans(dungeon);
    const theme = dungeonThemeById(dungeon.themeId);
    assert.deepEqual(again, dungeon.roomPlans);
    assert.equal(dungeon.roomPlans.length, dungeon.rooms.length);
    assert.equal(new Set(dungeon.roomPlans.map(({ id }) => id)).size, dungeon.rooms.length);
    assert.equal(dungeon.roomPlans[0].archetypeId, 'wayfarer-refuge');
    assert.ok(dungeon.roomPlans.every((plan, roomIndex) => {
      const archetype = roomArchetypeById(plan.archetypeId);
      return (
        Object.isFrozen(plan)
        && plan.id === `room-${depth}-${roomIndex}`
        && plan.roomIndex === roomIndex
        && plan.dungeonThemeId === theme.id
        && plan.surfaceSetId === theme.surfaceSetId
        && archetype?.implemented
        && plan.environmentThemeId === environmentThemeFor(archetype, theme.id)
        && plan.dangerBudget >= 0
        && plan.rewardBudget >= 0
      );
    }));
    assert.equal(
      dungeon.roomPlans.filter(({ archetypeId }) => archetypeId === 'merchant-alcove').length,
      depth % FLOORS_PER_CHAPTER === 0 ? 1 : 0,
    );

    const chest = dungeon.finds.find(({ id }) => id === 'sealed-cache');
    const chestRoom = dungeon.roomPlans[chest.roomIndex];
    assert.equal(chestRoom.archetypeId, 'treasure-vault');
    assert.equal(
      chestRoom.variantId,
      chest.cacheVariant === 'unlocked' ? 'unguarded' : chest.cacheVariant,
    );
    assert.ok(theme.chestSkinIds.includes(chestRoom.chestSkinId));
    assert.deepEqual(
      chestVisualFrames({
        seed: dungeon.seed,
        depth,
        roomIndex: chest.roomIndex,
        skinIds: [chestRoom.chestSkinId],
      }),
      chestFramesForSkin(chestRoom.chestSkinId),
    );
  }
});

test('environment consumes the room plan instead of inventing another theme layer', () => {
  for (let seed = 501; seed <= 560; seed += 1) {
    const depth = 1 + (seed % 5);
    const dungeon = generateDungeon({ seed, depth });
    const environment = createDungeonEnvironment(dungeon);
    if (isCityDepth(depth)) {
      // A city furnishes itself: one theme per block, no dungeon room plans.
      assert.equal(dungeon.roomPlans.length, 0);
      assert.equal(environment.roomThemes.length, dungeon.rooms.length);
      assert.ok(environment.props.some(({ interactionId }) => interactionId === 'campfire'));
      continue;
    }
    assert.deepEqual(
      environment.roomThemes,
      dungeon.roomPlans.map(({ environmentThemeId }) => environmentThemeId),
    );
  }
});
