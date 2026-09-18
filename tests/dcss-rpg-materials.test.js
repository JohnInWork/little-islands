import assert from 'node:assert/strict';
import test from 'node:test';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { materializeItemAffixes } from '../tools/dcss-rpg-affixes.js';
import { assertEquipmentCatalog } from '../tools/dcss-rpg-rules.js';
import { itemDetailLanguages, itemDetails } from '../tools/dcss-rpg-item-details.js';
import {
  MATERIALS,
  MATERIAL_IDS,
  applyMaterialStats,
  itemTakesMaterial,
  materialById,
  materialFilter,
  materialItemName,
  materialsForDepth,
  rollMaterial,
  validateItemForm,
  validateItemMaterial,
} from '../tools/dcss-rpg-materials.js';

const made = LOOT_CATALOG.filter((item) => itemTakesMaterial(item));
const named = LOOT_CATALOG.filter((item) => item.slot && !itemTakesMaterial(item));

test('the catalogue is split into things that are made and things that are named', () => {
  assert.ok(made.length >= 40, `only ${made.length} items have a form`);
  assert.ok(named.length >= 20, 'the named things must not disappear');
  assert.equal(assertEquipmentCatalog(LOOT_CATALOG), true);
  // A form is a noun that has to decline, so it must say which way.
  for (const item of made) {
    assert.equal(validateItemForm(item.form), true, `${item.id} form`);
    assert.ok(item.form.ru.length > 2 && item.form.en.length > 2, item.id);
  }
  assert.equal(validateItemForm({ ru: 'меч', en: 'sword' }), false, 'gender is not optional');
  assert.equal(validateItemForm({ ru: 'меч', en: 'sword', gender: 'x' }), false);
  assert.equal(validateItemForm(undefined), false);
});

test('two things of the same form are told apart by what they are made of', () => {
  const sword = lootById('long-sword');
  const names = MATERIAL_IDS.map((id) => materialItemName(sword, id, 'ru'));
  assert.equal(new Set(names).size, names.length, 'every material reads differently');
  // The adjective agrees with the noun, which is the whole reason forms carry gender.
  assert.equal(materialItemName(lootById('long-sword'), 'bone', 'ru'), 'Костяной меч');
  assert.equal(materialItemName(lootById('war-pike'), 'bone', 'ru'), 'Костяная пика');
  assert.equal(materialItemName(lootById('hunting-spear'), 'bone', 'ru'), 'Костяное копьё');
  assert.equal(materialItemName(lootById('jackboots'), 'bone', 'ru'), 'Костяные сапоги');
  // Without a material the form still names the thing: nothing is ever nameless.
  assert.equal(materialItemName(sword, null, 'ru'), 'Меч');
  assert.equal(materialItemName(lootById('sword-of-power'), 'bone', 'ru'), null, 'a named thing is not made');
});

test('no two forms collapse onto the same name in either language', () => {
  for (const language of itemDetailLanguages) {
    const names = made.map((item) => materialItemName(item, null, language));
    assert.equal(new Set(names).size, names.length, `${language}: two forms share a name`);
  }
});

test('the material shapes what the item already does and never invents an attack', () => {
  const helm = lootById('iron-helm');
  for (const id of MATERIAL_IDS) {
    const stats = applyMaterialStats(helm.stats, id);
    assert.equal(stats.attack ?? 0, 0, `${id} gave a helmet an attack`);
  }
  // The flat signature lands even where the base had nothing of that stat.
  assert.equal(applyMaterialStats(lootById('war-axe').stats, 'moonsilver').intelligence, 1);
  assert.deepEqual(applyMaterialStats({ attack: 6 }, 'iron'), { attack: 6 }, 'iron is the baseline');
  assert.deepEqual(applyMaterialStats({ attack: 6 }, null), { attack: 6 });
  assert.deepEqual(applyMaterialStats({ attack: 6 }, 'nonsense'), { attack: 6 });
});

test('a material may outrank another only downhill: rarer and no shallower', () => {
  const dominant = [];
  for (const a of MATERIALS) {
    for (const b of MATERIALS) {
      if (a === b) continue;
      const alwaysBetter = made.every((item) => {
        const left = applyMaterialStats(item.stats ?? {}, a.id);
        const right = applyMaterialStats(item.stats ?? {}, b.id);
        const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
        let better = false;
        for (const key of keys) {
          const lv = left[key] ?? 0;
          const rv = right[key] ?? 0;
          if (lv < rv) return false;
          if (lv > rv) better = true;
        }
        return better;
      });
      if (alwaysBetter) dominant.push([a, b]);
    }
  }
  for (const [a, b] of dominant) {
    assert.ok(a.weight < b.weight, `${a.id} beats ${b.id} without being rarer`);
    assert.ok(a.minDepth >= b.minDepth, `${a.id} beats ${b.id} and is found no deeper`);
  }
});

test('deeper floors know more materials, and the shallow ones are always there', () => {
  assert.ok(materialsForDepth(1).length >= 3);
  assert.ok(materialsForDepth(9).length > materialsForDepth(1).length);
  assert.equal(materialsForDepth(9).length, MATERIALS.length);
  for (const material of materialsForDepth(1)) assert.equal(material.minDepth, 1);
  // Iron is the pack's own art: it is the one material that recolours nothing.
  assert.equal(materialFilter('iron'), null);
  for (const id of MATERIAL_IDS.filter((x) => x !== 'iron')) {
    assert.ok(materialFilter(id).length > 8, `${id} looks like iron`);
  }
});

test('a saved item may name a material only when it has a form to be made into', () => {
  const sword = lootById('long-sword');
  const unique = lootById('sword-of-power');
  assert.equal(validateItemMaterial(sword, { materialId: 'bone' }), true);
  assert.equal(validateItemMaterial(sword, { materialId: 'invented' }), false);
  assert.equal(validateItemMaterial(sword, {}), true, 'an older save simply says nothing');
  assert.equal(validateItemMaterial(unique, { materialId: 'bone' }), false);
  assert.equal(validateItemMaterial(unique, { materialId: null }), true);
  assert.equal(validateItemMaterial(sword, { materialId: null }), false, 'a made thing is made of something');
  assert.equal(rollMaterial({ seed: 1, depth: 3, instanceId: 'x', item: unique }), null);
  assert.throws(() => rollMaterial({ seed: 1, depth: 3, instanceId: '', item: sword }), /instance id/);
});

test('one floor no longer hands out the same item twice over', () => {
  let made0 = 0;
  let distinct = 0;
  const seenMaterials = new Set();
  for (let seed = 1; seed <= 60; seed += 1) {
    for (let depth = 1; depth <= 9; depth += 1) {
      const dungeon = generateDungeon({ seed, depth });
      const names = new Set();
      for (const spawn of dungeon.loot) {
        const definition = lootById(spawn.id);
        if (!itemTakesMaterial(definition)) continue;
        made0 += 1;
        if (spawn.materialId) seenMaterials.add(spawn.materialId);
        names.add(itemDetails(materializeItemAffixes(definition, spawn), 'ru').name);
      }
      distinct += names.size;
    }
  }
  assert.ok(made0 > 400, `only ${made0} made items across the sweep`);
  // Every material actually reaches the floor; none is written and never rolled.
  assert.deepEqual([...seenMaterials].sort(), [...MATERIAL_IDS].sort());
  assert.ok(distinct / made0 > 0.7, 'floors still repeat themselves');
});

test('a material rolls the same way twice, so a reloaded floor is the same floor', () => {
  const sword = lootById('long-sword');
  const input = { seed: 4242, depth: 4, instanceId: 'loot-4-2', item: sword };
  assert.equal(rollMaterial(input), rollMaterial(input));
  assert.notEqual(
    rollMaterial(input),
    rollMaterial({ ...input, instanceId: 'loot-4-3' }),
    'two swords on one floor are not the same sword',
  );
  assert.ok(materialById(rollMaterial(input)));
  // Nothing deeper than the floor is known on it.
  for (let depth = 1; depth <= 9; depth += 1) {
    for (let index = 0; index < 20; index += 1) {
      const id = rollMaterial({ seed: 7, depth, instanceId: `loot-${depth}-${index}`, item: sword });
      assert.ok(materialById(id).minDepth <= depth, `${id} surfaced on floor ${depth}`);
    }
  }
});
