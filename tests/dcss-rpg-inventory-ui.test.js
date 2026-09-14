import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INVENTORY_FILTERS,
  inventoryCategory,
  inventorySections,
} from '../tools/dcss-rpg-inventory-ui.js';

const items = [
  { uid: 'sword', slot: 'hand1' },
  { uid: 'shield', slot: 'hand2' },
  { uid: 'ring', slot: 'ring1' },
  { uid: 'potion', stack: 2 },
  { uid: 'boots', slot: 'boots' },
];

test('inventory categories cover equipment and consumables without UI-specific data', () => {
  assert.equal(inventoryCategory(items[0]), 'weapons');
  assert.equal(inventoryCategory(items[1]), 'armour');
  assert.equal(inventoryCategory(items[2]), 'jewellery');
  assert.equal(inventoryCategory(items[3]), 'consumables');
  assert.equal(inventoryCategory(items[4]), 'armour');
  assert.deepEqual(INVENTORY_FILTERS, [
    'all',
    'equipped',
    'weapons',
    'armour',
    'jewellery',
    'consumables',
  ]);
});

test('all-items view puts equipped gear first and groups backpack items once', () => {
  const sections = inventorySections({
    inventory: ['boots', 'ring', 'potion'],
    equipment: { hand1: 'sword', hand2: 'shield' },
    items,
    filter: 'all',
    language: 'ru',
  });

  assert.deepEqual(sections.map((section) => section.id), [
    'equipped',
    'armour',
    'jewellery',
    'consumables',
  ]);
  assert.equal(sections[0].title, 'Надето');
  assert.deepEqual(sections[0].entries.map((entry) => entry.slot), ['hand1', 'hand2']);
  assert.deepEqual(
    sections.flatMap((section) => section.entries.map((entry) => entry.item.uid)),
    ['sword', 'shield', 'boots', 'ring', 'potion'],
  );
});

test('a category filter returns only its localized section', () => {
  const weapons = inventorySections({
    inventory: ['sword', 'boots', 'potion'],
    items,
    filter: 'weapons',
    language: 'en',
  });
  const equipped = inventorySections({
    inventory: ['potion'],
    equipment: { ring1: 'ring' },
    items,
    filter: 'equipped',
    language: 'en',
  });

  assert.equal(weapons.length, 1);
  assert.equal(weapons[0].title, 'Weapons');
  assert.equal(weapons[0].entries[0].item.uid, 'sword');
  assert.equal(equipped[0].title, 'Equipped');
  assert.equal(equipped[0].entries[0].source, 'equipment');
});
