import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';

import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import {
  EQUIPMENT_VISUALS,
  allEquipmentVisualAssetPaths,
  equipmentVisualForItem,
  equipmentVisualProblems,
} from '../tools/dcss-rpg-equipment-visuals.js';

test('one id-keyed registry keeps every equipment icon and worn layer aligned', () => {
  assert.deepEqual(equipmentVisualProblems(LOOT_CATALOG), []);
  assert.equal(Object.keys(EQUIPMENT_VISUALS).length, LOOT_CATALOG.filter(({ slot }) => slot).length);
  assert.deepEqual(equipmentVisualForItem(lootById('iron-gloves')), {
    icon: 'item/armour/glove2.png',
    layer: 'player/gloves/glove_gray.png',
  });
});

test('one-handed weapons resolve an explicit or mirrored off-hand layer by item id', () => {
  assert.equal(
    equipmentVisualForItem(lootById('short-blade'), 'hand2').layer,
    'player/hand2/misc/dagger.png',
  );
  assert.equal(
    equipmentVisualForItem(lootById('war-axe'), 'hand2').layer,
    'mirror:player/hand1/hand_axe2.png',
  );
});

test('every registered equipment visual ships locally', async () => {
  await Promise.all(allEquipmentVisualAssetPaths().map((path) =>
    access(new URL(`../public/assets/dcss-preview/${path}`, import.meta.url))));
});
