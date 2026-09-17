import assert from 'node:assert/strict';
import test from 'node:test';

import { monsterById } from '../tools/dcss-rpg-content.js';

import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { ROOM_ENCOUNTER_KINDS } from '../tools/dcss-rpg-room-content.js';

const inside = (room, point) => (
  point.x >= room.x
  && point.x < room.x + room.width
  && point.y >= room.y
  && point.y < room.y + room.height
);

test('treasure room content is deterministic and consumes the existing floor budget', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const depth = 1 + (seed % 8);
    const dungeon = generateDungeon({ seed, depth });
    const again = generateDungeon({ seed, depth });
    assert.deepEqual(again.roomEncounters, dungeon.roomEncounters);
    assert.deepEqual(again.monsters, dungeon.monsters);
    assert.deepEqual(again.events, dungeon.events);
    const pooled = dungeon.monsters.filter(({ id }) => !monsterById(id).spawn);
    assert.ok(pooled.length <= dungeon.scaling.encounters.monsterCount);
    assert.equal(new Set(dungeon.monsters.map(({ instanceId }) => instanceId)).size, dungeon.monsters.length);
    for (const encounter of dungeon.roomEncounters) {
      assert.ok(ROOM_ENCOUNTER_KINDS.includes(encounter.kind));
      assert.equal(Object.isFrozen(encounter), true);
      assert.equal(encounter.roomPlanId, dungeon.roomPlans[encounter.roomIndex].id);
    }
  }
});

test('every chest variant materializes a distinct playable room scenario', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 1600; seed += 1) {
    const depth = 1 + (seed % 3);
    const dungeon = generateDungeon({ seed, depth });
    const chest = dungeon.finds.find(({ id }) => id === 'sealed-cache');
    const encounter = dungeon.roomEncounters.find(({ findId }) => findId === chest.instanceId);
    const room = dungeon.rooms[chest.roomIndex];
    seen.add(chest.cacheVariant);
    assert.ok(encounter);
    assert.equal(encounter.variantId, chest.cacheVariant === 'unlocked' ? 'unguarded' : chest.cacheVariant);

    if (chest.cacheVariant === 'locked') {
      assert.equal(encounter.kind, 'guarded');
      assert.ok(encounter.monsterIds.length >= 1);
      assert.deepEqual(chest.guardMonsterIds, encounter.monsterIds);
      assert.ok(dungeon.monsters
        .filter(({ instanceId }) => encounter.monsterIds.includes(instanceId))
        .every((monster) => inside(room, monster) && !monster.activationFindId));
    }
    if (chest.cacheVariant === 'trapped') {
      assert.equal(encounter.kind, 'trapped');
      assert.ok(encounter.trapEventIds.length >= 1);
      assert.ok(dungeon.events
        .filter(({ instanceId }) => encounter.trapEventIds.includes(instanceId))
        .every((event) => event.id === 'blade-trap' && inside(room, event)));
    }
    if (chest.cacheVariant === 'cursed') {
      assert.equal(encounter.kind, 'cursed');
      assert.ok(['poison', 'chilled'].includes(chest.curseEffectId));
      assert.ok(chest.curseDuration >= 5);
    }
    if (chest.cacheVariant === 'mimic') {
      assert.equal(encounter.kind, 'mimic');
      assert.equal(encounter.activation, 'find');
      assert.equal(encounter.monsterIds.length, 1);
      const mimic = dungeon.monsters.find(
        ({ instanceId }) => instanceId === encounter.monsterIds[0],
      );
      assert.equal(mimic.id, 'chest-mimic');
      assert.equal(mimic.activationFindId, chest.instanceId);
      assert.equal(mimic.vaultRewardGold, chest.rewardGold);
      assert.equal(mimic.x, chest.x);
      assert.equal(mimic.y, chest.y);
    }
    if (chest.cacheVariant === 'unlocked') {
      assert.equal(encounter.kind, 'unguarded');
      assert.deepEqual(encounter.monsterIds, []);
      assert.deepEqual(encounter.trapEventIds, []);
    }
  }
  assert.deepEqual([...seen].sort(), ['cursed', 'locked', 'mimic', 'trapped', 'unlocked']);
});

test('door treasure and mixed surprises use the same room encounter contract', () => {
  for (let seed = 1; seed <= 240; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 2 });
    for (const surprise of dungeon.surprises.filter(({ type }) => ['treasure', 'mixed'].includes(type))) {
      const encounter = dungeon.roomEncounters.find(({ surpriseId }) => surpriseId === surprise.id);
      assert.ok(encounter);
      assert.equal(encounter.activation, 'door');
      assert.equal(encounter.kind, surprise.type === 'mixed' ? 'ambush' : 'treasure-cache');
      assert.deepEqual(encounter.monsterIds, surprise.monsterIds);
      assert.deepEqual(encounter.rewardLootIds, surprise.lootIds);
    }
  }
});

test('merchant rooms are deterministic, calm and occupy a real free cell', () => {
  for (let seed = 1; seed <= 500; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 3 });
    const [merchant] = dungeon.merchants;
    assert.ok(merchant);
    assert.equal(Object.isFrozen(merchant), true);
    assert.equal(merchant.instanceId, `merchant-3-${merchant.roomIndex}`);
    assert.ok(['armourer', 'relic-dealer', 'provisioner'].includes(merchant.variantId));
    assert.ok(merchant.stock.length >= 4 && merchant.stock.length <= 6);
    const room = dungeon.rooms[merchant.roomIndex];
    assert.equal(inside(room, merchant), true);
    assert.equal(dungeon.grid[merchant.y][merchant.x], '.');
    assert.equal(dungeon.monsters.some((monster) => inside(room, monster)), false);
    assert.equal(dungeon.events.some((event) => inside(room, event)), false);
    assert.equal(dungeon.finds.some((find) => inside(room, find)), false);
  }
});
