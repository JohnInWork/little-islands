import assert from 'node:assert/strict';
import test from 'node:test';

import { isCityDepth } from '../tools/dcss-rpg-city.js';

import { createGameCommand } from '../tools/dcss-rpg-game-commands.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import {
  CHEST_CONTAINER_COMMANDS,
  createChestContainerStates,
  openChestContainer,
  storeChestItem,
  takeChestGold,
  takeChestItem,
  validateChestContainerStates,
} from '../tools/dcss-rpg-chest-containers.js';

const command = (type, targetId, sequence = 1) => createGameCommand({
  streamId: 'run:123:1',
  sequence,
  type,
  targetId,
});

test('every floor chest receives deterministic depth-scaled item contents and gold', () => {
  for (let depth = 1; depth <= 9; depth += 1) {
    // A city has traders instead of buried chests.
    if (isCityDepth(depth)) continue;
    const dungeon = generateDungeon({ seed: 1234, depth });
    const first = createChestContainerStates({
      seed: 1234,
      depth,
      finds: dungeon.finds,
      lootAbundance: dungeon.scaling.lootAbundance,
    });
    const second = createChestContainerStates({
      seed: 1234,
      depth,
      finds: dungeon.finds,
      lootAbundance: dungeon.scaling.lootAbundance,
    });
    assert.deepEqual(first, second);
    assert.equal(first.length, 1);
    assert.equal(first[0].opened, false);
    assert.ok(first[0].gold > 0);
    assert.ok(first[0].items.length >= 2);
    assert.equal(validateChestContainerStates(first, {
      depth,
      findIds: dungeon.finds.filter(({ id }) => id === 'sealed-cache').map(({ instanceId }) => instanceId),
    }), true);
  }
});

test('opening preserves contents while smashing destroys half and disables storage', () => {
  const dungeon = generateDungeon({ seed: 44, depth: 3 });
  const [closed] = createChestContainerStates({ seed: 44, depth: 3, finds: dungeon.finds });
  const opened = openChestContainer(closed);
  const smashed = openChestContainer(closed, { damaged: true });
  assert.equal(opened.items.length, closed.items.length);
  assert.equal(opened.gold, closed.gold);
  assert.equal(smashed.destroyed, true);
  assert.equal(smashed.gold, Math.ceil(closed.gold / 2));
  assert.equal(smashed.items.length, Math.ceil(closed.items.length / 2));
  const result = storeChestItem({
    command: command(CHEST_CONTAINER_COMMANDS.store, smashed.findId),
    container: smashed,
    uid: 'hero-bread',
    items: [{ id: 'bread', uid: 'hero-bread', stack: 1 }],
    inventory: ['hero-bread'],
  });
  assert.equal(result.reason, 'destroyed');
});

test('item transfers are atomic in both directions and gold is claimed separately', () => {
  const dungeon = generateDungeon({ seed: 72, depth: 2 });
  const [closed] = createChestContainerStates({ seed: 72, depth: 2, finds: dungeon.finds });
  const container = openChestContainer(closed);
  const stored = container.items[0];
  const taken = takeChestItem({
    command: command(CHEST_CONTAINER_COMMANDS.take, container.findId),
    container,
    uid: stored.uid,
    items: [{ id: 'bread', uid: 'hero-bread', stack: 2 }],
    inventory: ['hero-bread'],
  });
  assert.equal(taken.ok, true);
  assert.equal(taken.state.container.items.some(({ uid }) => uid === stored.uid), false);
  assert.equal(taken.state.inventory.length >= 1, true);

  const putUid = taken.state.inventory[0];
  const put = storeChestItem({
    command: command(CHEST_CONTAINER_COMMANDS.store, container.findId, 2),
    container: taken.state.container,
    uid: putUid,
    items: taken.state.items,
    inventory: taken.state.inventory,
  });
  assert.equal(put.ok, true);
  assert.equal(put.state.inventory.includes(putUid), false);

  const claimed = takeChestGold({
    command: command(CHEST_CONTAINER_COMMANDS.takeGold, container.findId, 3),
    container: put.state.container,
    gold: 7,
  });
  assert.equal(claimed.ok, true);
  assert.equal(claimed.state.gold, 7 + container.gold);
  assert.equal(claimed.state.container.gold, 0);
});

test('a full backpack rejects a new chest item without mutating either side', () => {
  const dungeon = generateDungeon({ seed: 93, depth: 2 });
  const [closed] = createChestContainerStates({ seed: 93, depth: 2, finds: dungeon.finds });
  const container = openChestContainer(closed);
  const items = Array.from({ length: 12 }, (_, index) => ({
    id: 'short-blade',
    uid: `owned-${index}`,
    affixIds: [],
    artifactPowerId: null,
    artifactCurseId: null,
  }));
  const inventory = items.map(({ uid }) => uid);
  const before = structuredClone({ container, items, inventory });
  const result = takeChestItem({
    command: command(CHEST_CONTAINER_COMMANDS.take, container.findId),
    container,
    uid: container.items[0].uid,
    items,
    inventory,
  });
  assert.equal(result.reason, 'full');
  assert.deepEqual({ container, items, inventory }, before);
});
