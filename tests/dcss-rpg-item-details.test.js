import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { LOOT_CATALOG } from '../tools/dcss-rpg-content.js';
import {
  itemDetailLanguages,
  itemDetails,
  itemPresentation,
  itemStatComparison,
} from '../tools/dcss-rpg-item-details.js';

test('a Russian name is written, never fabricated from the item id', () => {
  // The fallback turns 'hand-crossbow' into 'Hand Crossbow' and passes every
  // length check, so a forgotten translation used to ship looking finished.
  for (const item of LOOT_CATALOG) {
    const name = itemDetails(item, 'ru').name;
    assert.match(name, /[\u0410-\u044f\u0401\u0451]/, `${item.id} has no Russian name`);
  }
});

test('every inventory item has complete readable details in Russian and English', () => {
  assert.equal(LOOT_CATALOG.length, 203);
  assert.deepEqual(itemDetailLanguages, ['ru', 'en']);
  for (const item of LOOT_CATALOG) {
    for (const language of itemDetailLanguages) {
      const details = itemDetails(item, language);
      assert.equal(details.id, item.id);
      assert.ok(details.name.length >= 3, `${item.id} ${language} name`);
      assert.ok(details.rarity.length >= 4, `${item.id} ${language} rarity`);
      assert.ok(details.slot.length >= 3, `${item.id} ${language} slot`);
      assert.ok(details.description.length >= 12, `${item.id} ${language} description`);
      assert.ok(details.effects.length >= 1, `${item.id} ${language} effects`);
      assert.ok(details.effects.every(({ icon, text }) => icon && text.length >= 5));
    }
  }
});

test('details describe existing magic and combat mechanics without inventing inactive powers', () => {
  const byId = (id) => LOOT_CATALOG.find((item) => item.id === id);
  assert.match(itemDetails(byId('skull-staff'), 'ru').effects.find(({ id }) => id === 'combat:profile').text, /Дальность: 4\.5/);
  assert.match(itemDetails(byId('blink-scroll'), 'en').effects[0].text, /chosen tile/);
  assert.match(itemDetails(byId('tide-wand'), 'ru').effects[0].text, /Мокрый.*10 с.*дальность 6/);
  assert.match(itemDetails(byId('vitality-amulet'), 'ru').effects[0].text, /\+16/);
  assert.match(itemDetails(byId('mystery-potion'), 'ru').effects[0].text, /сила до конца забега: \+1/i);
  assert.match(itemDetails(byId('mystery-potion'), 'en').effects[0].text, /run power: \+1/i);
  assert.doesNotMatch(itemDetails(byId('golden-boots'), 'ru').effects.map(({ text }) => text).join(' '), /пол[её]т/i);
  assert.match(itemDetails(byId('spider-boots'), 'ru').effects.map(({ text }) => text).join(' '), /\+14% движение/);
  assert.match(itemDetails(byId('black-plate'), 'en').effects.map(({ text }) => text).join(' '), /−12% move speed/);
  assert.equal(itemDetails(byId('executioner-axe'), 'ru').slot, 'Двуручный топор');
  assert.equal(itemDetails(byId('war-axe'), 'ru').slot, 'Одноручный топор');
  assert.equal(itemDetails(byId('war-axe'), 'en').slot, 'One-handed axe');
  assert.match(itemDetails(byId('war-axe'), 'ru').effects.at(-1).text, /Вторая рука свободна/);
  assert.equal(itemDetails(byId('longbow'), 'en').slot, 'Two-handed bow');
  assert.match(itemDetails(byId('storm-trident'), 'ru').effects.at(-1).text, /Занимает обе руки/);
  assert.equal(itemDetails(byId('dungeon-greatsword'), 'ru').slot, 'Двуручный меч');
  assert.equal(itemDetails(byId('duelist-rapier'), 'en').slot, 'One-handed sword');
  assert.match(itemDetails(byId('sword-of-power'), 'ru').description, /^Двуручный меч · \+10 атака/);
});

test('compact item presentation reuses translated details and exposes rarity without color alone', () => {
  const boots = LOOT_CATALOG.find((item) => item.id === 'spider-boots');
  const ru = itemPresentation(boots, 'ru');
  const en = itemPresentation(boots, 'en');

  assert.equal(ru.name, 'Паучьи сапоги');
  assert.equal(ru.slot, 'Сапоги');
  assert.equal(ru.rarityMarks, '◆◆◆');
  assert.match(ru.primaryEffect.text, /\+14% движение/);
  assert.equal(en.name, 'Spider Boots');
  assert.equal(en.slot, 'Boots');
});

test('item stat comparison formats real before and after values in both languages', () => {
  const before = { attack: 4, defense: 5, maxHp: 100, moveSpeed: 1.08, attackSpeed: 1.05 };
  const after = { attack: 7, defense: 3, maxHp: 100, moveSpeed: 1.14, attackSpeed: 1.05 };
  const ru = itemStatComparison(before, after, 'ru');
  const en = itemStatComparison(before, after, 'en');

  assert.deepEqual(ru.map(({ label, from, to, delta, suffix }) => ({ label, from, to, delta, suffix })), [
    { label: 'Урон', from: 4, to: 7, delta: 3, suffix: '' },
    { label: 'Защита', from: 5, to: 3, delta: -2, suffix: '' },
    { label: 'Движение', from: 108, to: 114, delta: 6, suffix: '%' },
  ]);
  assert.deepEqual(en.map(({ label }) => label), ['Attack', 'Defence', 'Move']);
});

/**
 * «Я принял зелье и не понимаю, что со мной произошло.»
 *
 * A consumable reported a bare number — «12», «+2», «✓» — on a card that named
 * the bottle. So the player learned what they had drunk and never what it did.
 * A number is the size of a thing, not the thing.
 */
test('a consumable says what it did, not how much of it there was', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const table = runtime.slice(runtime.indexOf('const CONSUMABLE_REPORTS'));
  const body = table.slice(0, table.indexOf('\nfunction consumableReport'));
  assert.ok(body.length > 0, 'nothing reports anything');
  for (const key of ['healed', 'healedFull', 'power', 'cleansed', 'nothingToCleanse', 'venom', 'learned']) {
    assert.match(body, new RegExp(`${key}:`), `${key} has no wording`);
  }
  // Both languages, and they are not the same words.
  assert.match(body, /ru: Object\.freeze\(\{[\s\S]*en: Object\.freeze\(\{/);
  assert.match(body, /Исцеление/);
  assert.match(body, /Healed/);

  // And the bare numbers are gone from the places that used to return them.
  const potion = runtime.slice(runtime.indexOf('function applyIdentifiablePotion('));
  const potionBody = potion.slice(0, potion.indexOf('\nfunction applyBook('));
  assert.doesNotMatch(potionBody, /return healing;/, 'healing is a number again');
  assert.doesNotMatch(potionBody, /\? '✓' : '0'/, 'cleansing is a tick again');
  assert.match(potionBody, /consumableReport\(\)\.healed/);
  assert.match(potionBody, /consumableReport\(\)\.venom/);
});

/**
 * Which hand, and which hand is busy.
 *
 * A one-handed weapon fits either hand and the game used to pick — the first
 * empty slot, or the main hand, quietly displacing whatever was in it. A
 * two-handed weapon filled both and the off-hand slot looked empty, which
 * reads as room for a shield. Ivan asked for both: «спрашивать, в какую руку
 * надеть; а двуручное должно быть видно во второй руке полупрозрачной
 * иконкой — чтобы было понятно, что рука занята им же».
 */
test('the card asks which hand, and a busy hand shows what is holding it', async () => {
  const { readFile } = await import('node:fs/promises');
  const [html, css, runtime] = await Promise.all([
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
  ]);
  const { allowedSlotsForItem, isTwoHandedItem } = await import('../tools/dcss-rpg-rules.js');
  const { lootById } = await import('../tools/dcss-rpg-content.js');

  // The rule the question rests on: a one-hander really does fit either hand.
  assert.deepEqual(allowedSlotsForItem(lootById('rusty-sword')), ['hand1', 'hand2']);
  assert.equal(isTwoHandedItem(lootById('executioner-axe')), true);
  assert.deepEqual(allowedSlotsForItem(lootById('executioner-axe')), ['hand1']);

  assert.ok(html.includes('id="item-detail-offhand"'), 'there is no second hand to choose');
  assert.match(runtime, /itemDetailOffhand\.hidden = !handChoice;/);
  // Asked only when it is a question: with both hands empty there is none.
  assert.match(runtime, /&& Boolean\(selected\.hand1 \|\| selected\.hand2\);/);
  assert.match(runtime, /requestedSlot: 'hand2',/);
  assert.match(runtime, /requestedSlot: itemDetailOffhand\.hidden \? null : 'hand1',/);
  // And the slot really is passed through to the rule that places it.
  assert.match(runtime, /equipInventoryItem\(currentItemState\(\), selection\.item\.uid, requestedSlot\)/);

  // The busy hand shows the weapon holding it, faded.
  assert.match(runtime, /button\.dataset\.occupied = String\(Boolean\(twoHanded\)\);/);
  assert.match(runtime, /slot === 'hand2' && isTwoHandedItem\(equippedItem\('hand1'\)\)/);
  assert.match(css, /\[data-occupied='true'\] img \{[\s\S]*?opacity: 0\.38;/);
});
