import assert from 'node:assert/strict';
import test from 'node:test';
import { lootById } from '../tools/dcss-rpg-content.js';
import { createRun, generateDungeon, migrateLegacyRun, validateRun } from '../tools/dcss-rpg-core.js';
import { createEmptyEquipment, equipInventoryItem, unequipItem, resolveHeroDamage } from '../tools/dcss-rpg-rules.js';
import { createActorEffects, actorEffectModifiers, tickActorEffects } from '../tools/dcss-rpg-effects.js';
import { equipmentMagic, wardActorEffects, applyWardedEffect, resolveKillRecovery } from '../tools/dcss-rpg-magic.js';
import { itemDetails } from '../tools/dcss-rpg-item-details.js';
import { itemPowerScore } from '../tools/dcss-rpg-scaling.js';

const owned = (id, uid = id) => ({ ...lootById(id), uid });
const magicFor = (...ids) => equipmentMagic(
  Object.fromEntries(ids.map((id, index) => [String(index), `${id}-${index}`])),
  ids.map((id, index) => owned(id, `${id}-${index}`)),
);

test('wards only work in equipped slots and stop working when removed', () => {
  const item = owned('fire-ring');
  const initial = { items: [item], inventory: [item.uid], equipment: createEmptyEquipment() };
  assert.deepEqual(equipmentMagic(initial.equipment, initial.items).immunity, []);
  const equipped = equipInventoryItem(initial, item.uid).state;
  assert.deepEqual(equipmentMagic(equipped.equipment, equipped.items).immunity, ['burning']);
  const removed = unequipItem(equipped, 'ring1').state;
  assert.deepEqual(equipmentMagic(removed.equipment, removed.items).immunity, []);
});

test('each elemental ward blocks and cleanses its own status without erasing others', () => {
  for (const [itemId, status] of [['fire-ring', 'burning'], ['ice-ring', 'chilled'], ['antidote-ring', 'poison']]) {
    const initial = createActorEffects({ burning: 6, poison: 4, chilled: 3, wet: 8 });
    const magic = magicFor(itemId);
    const result = applyWardedEffect(initial, status, 7, magic);
    assert.equal(result.blocked, status);
    assert.equal(result.effects[status], 0);
    assert.equal(initial[status] > 0, true);
    for (const id of Object.keys(initial).filter((id) => id !== status)) {
      assert.equal(result.effects[id], initial[id]);
    }
    assert.equal(resolveHeroDamage({ hp: 20, amount: 8 }).damage, 8);
  }
});

test('without a ward fire/water reactions still work and invalid commands are rejected', () => {
  const noMagic = magicFor();
  const wet = createActorEffects({ wet: 9 });
  assert.equal(applyWardedEffect(wet, 'burning', 5, noMagic).reaction, 'steam');
  assert.equal(applyWardedEffect(wet, 'chilled', 4, noMagic).effects.chilled, 6);
  assert.throws(() => applyWardedEffect(wet, 'burning', -1, magicFor('fire-ring')));
});

test('warding poison prevents its damage and warding chill removes the speed penalty', () => {
  const poisoned = createActorEffects({ poison: 4 });
  const protectedEffects = wardActorEffects(poisoned, magicFor('antidote-ring')).effects;
  assert.equal(tickActorEffects(protectedEffects, 1).damage, 0);
  assert.equal(tickActorEffects(poisoned, 1).damage, 1);
  const chilled = createActorEffects({ chilled: 4 });
  assert.equal(actorEffectModifiers(wardActorEffects(chilled, magicFor('ice-ring')).effects).moveSpeed, 1);
  assert.ok(actorEffectModifiers(chilled).moveSpeed < 1);
});

test('kill recovery is capped by health and equipment, never revives or rewards repeated defeats', () => {
  const magic = magicFor('regeneration-ring');
  assert.deepEqual(resolveKillRecovery({ hp: 10, maxHp: 20, magic, newlyDefeated: true }), { hp: 12, healed: 2 });
  assert.deepEqual(resolveKillRecovery({ hp: 19, maxHp: 20, magic, newlyDefeated: true }), { hp: 20, healed: 1 });
  assert.deepEqual(resolveKillRecovery({ hp: 0, maxHp: 20, magic, newlyDefeated: true }), { hp: 0, healed: 0 });
  assert.equal(resolveKillRecovery({ hp: 10, maxHp: 20, magic, newlyDefeated: false }).healed, 0);
  assert.equal(magicFor('regeneration-ring', 'regeneration-ring', 'regeneration-ring').healOnKill, 4);
});

test('magic has readable RU/EN descriptions and contributes to the shared power score', () => {
  for (const id of ['fire-ring', 'ice-ring', 'antidote-ring', 'dragon-cloak', 'ratskin-cloak', 'regeneration-ring']) {
    const item = lootById(id);
    for (const language of ['ru', 'en']) assert.ok(itemDetails(item, language).effects.at(-1).text.length > 35);
    assert.ok(itemPowerScore(item) > itemPowerScore({ ...item, magic: undefined }));
  }
});

test('protective jewellery occurs in first-floor loot across seeded runs', () => {
  const found = new Set();
  for (let seed = 1; seed <= 150; seed++) {
    for (const loot of generateDungeon({ seed, depth: 1 }).loot) found.add(loot.id);
  }
  for (const id of ['fire-ring', 'ice-ring', 'antidote-ring']) assert.ok(found.has(id), id);
});

test('v7 gear survives the new loot pool migration with all wards derived on load', () => {
  const legacy = createRun(723);
  legacy.version = 7;
  legacy.generatorVersion = 2;
  legacy.contentVersion = 2;
  legacy.items.push({ id: 'fire-ring', uid: 'ward-ring' });
  legacy.equipment.ring1 = 'ward-ring';
  legacy.hero.effects.burning = 6;
  const next = migrateLegacyRun(legacy);
  assert.equal(validateRun(next), true);
  assert.equal(next.equipment.ring1, 'ward-ring');
  const items = next.items.map((item) => owned(item.id, item.uid));
  assert.equal(wardActorEffects(next.hero.effects, equipmentMagic(next.equipment, items)).effects.burning, 0);
});
