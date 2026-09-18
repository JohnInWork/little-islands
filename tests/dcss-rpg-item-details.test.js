import assert from 'node:assert/strict';
import test from 'node:test';
import { LOOT_CATALOG } from '../tools/dcss-rpg-content.js';
import {
  itemDetailLanguages,
  itemDetails,
  itemPresentation,
  itemStatComparison,
} from '../tools/dcss-rpg-item-details.js';

test('every inventory item has complete readable details in Russian and English', () => {
  assert.equal(LOOT_CATALOG.length, 93);
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
