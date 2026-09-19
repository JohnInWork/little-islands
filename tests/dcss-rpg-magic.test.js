import assert from 'node:assert/strict';
import test from 'node:test';
import { lootById } from '../tools/dcss-rpg-content.js';
import { createRun, generateDungeon, migrateLegacyRun, validateRun } from '../tools/dcss-rpg-core.js';
import { createEmptyEquipment, equipInventoryItem, unequipItem, resolveHeroDamage } from '../tools/dcss-rpg-rules.js';
import { createActorEffects, actorEffectModifiers, tickActorEffects } from '../tools/dcss-rpg-effects.js';
import {
  MAGIC_TRAIT_KEYS,
  THORNS_CAP_PERCENT,
  applyWardedEffect,
  equipmentMagic,
  magicItemEffects,
  resolveKillRecovery,
  wardActorEffects,
} from '../tools/dcss-rpg-magic.js';
import {
  PROCEDURAL_ARTIFACT_CURSES,
  PROCEDURAL_ARTIFACT_POWERS,
} from '../tools/dcss-rpg-artifacts.js';
import { ITEM_AFFIXES } from '../tools/dcss-rpg-affixes.js';
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
    for (const language of ['ru', 'en']) {
      const magic = itemDetails(item, language).effects.find(({ kind }) => kind === 'magic');
      assert.ok(magic?.text.length >= 14);
    }
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

/**
 * The rule this whole layer stands on: a thing an item promises has to be read
 * by the aggregator and has to be describable to the player.
 *
 * Both halves matter. A power nothing reads is a suffix that does nothing —
 * which is what «of the Sky» was on a sword. A power nothing describes is a
 * power the player cannot weigh in a shop, and this game already learned that
 * one the hard way.
 */
test('every power, affix and curse is both read by the game and explainable to the player', () => {
  const promised = new Set();
  const collect = (magic) => {
    for (const key of Object.keys(magic ?? {})) promised.add(key);
  };
  for (const power of PROCEDURAL_ARTIFACT_POWERS) collect(power.magic);
  for (const curse of PROCEDURAL_ARTIFACT_CURSES) collect(curse.magic);
  for (const affix of ITEM_AFFIXES) collect(affix.magic);

  for (const key of promised) {
    assert.ok(MAGIC_TRAIT_KEYS.includes(key), `${key}: обещано и никем не читается`);
  }

  // And each one says something when it is on an item.
  for (const key of promised) {
    if (key === 'immunity') continue;
    const value = key === 'brand' ? 'burning' : true;
    const rows = magicItemEffects({ magic: { [key]: value } }, 'ru');
    assert.ok(rows.length > 0, `${key}: нечего показать игроку`);
    assert.ok(rows.every((row) => row.icon && row.text), key);
  }
});

test('the aggregator folds what is worn and never lets two of a thing run away', () => {
  const ring = (uid, magic) => ({ uid, magic });
  // Flags are ORed: two rings of flight are one flight.
  const two = equipmentMagic(
    { ring1: 'a', ring2: 'b' },
    [ring('a', { flight: true }), ring('b', { flight: true })],
  );
  assert.equal(two.flight, true);

  // Magnitudes add, and then stop: four thorny pieces are not an invincibility.
  const thorny = equipmentMagic(
    { body: 'a', head: 'b', boots: 'c', gloves: 'd' },
    ['a', 'b', 'c', 'd'].map((uid) => ring(uid, { thorns: 22 })),
  );
  assert.equal(thorny.thorns, THORNS_CAP_PERCENT);

  // The deepest threshold wins rather than adding up — two executioners must
  // not make a weapon that kills anything under thirty percent.
  const headsmen = equipmentMagic(
    { hand1: 'a', hand2: 'b' },
    [ring('a', { execute: 0.15 }), ring('b', { execute: 0.15 })],
  );
  assert.equal(headsmen.execute, 0.15);

  // Two branded weapons carry both brands; one weapon carries one.
  const branded = equipmentMagic(
    { hand1: 'a', hand2: 'b' },
    [ring('a', { brand: 'burning' }), ring('b', { brand: 'poison' })],
  );
  assert.deepEqual([...branded.brands].sort(), ['burning', 'poison']);
  assert.equal(equipmentMagic({}, []).brands.length, 0);
});
