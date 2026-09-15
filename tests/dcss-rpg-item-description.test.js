import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { LOOT_CATALOG } from '../tools/dcss-rpg-content.js';
import {
  generatedItemDescription,
  ITEM_DESCRIPTION_VERSION,
  itemDescriptionLanguages,
} from '../tools/dcss-rpg-item-description.js';

test('every authored item gets a compact bilingual description from gameplay data', () => {
  for (const item of LOOT_CATALOG) {
    for (const language of itemDescriptionLanguages) {
      const result = generatedItemDescription(item, language);
      assert.equal(result.version, ITEM_DESCRIPTION_VERSION);
      assert.ok(result.type.length >= 3, `${item.id} ${language} type`);
      assert.ok(result.summary.startsWith(result.type), `${item.id} ${language} summary`);
      assert.ok(result.summary.length <= 180, `${item.id} ${language} summary is too verbose`);
      assert.ok(result.facts.length >= 1, `${item.id} ${language} facts`);
      assert.ok(result.facts.every(({ id, kind, icon, text }) => id && kind && icon && text));
      assert.ok(result.primary?.text, `${item.id} ${language} primary fact`);
    }
  }
});

test('a new item needs data, not a handwritten per-item description', () => {
  const item = {
    id: 'test-frost-gloves',
    slot: 'gloves',
    rarity: 2,
    stats: { attack: 2, moveSpeed: 0.07 },
    magic: { immunity: ['chilled'] },
  };

  assert.equal(
    generatedItemDescription(item, 'ru').summary,
    'Перчатки · Иммунитет: Озноб · +2 атака · +7% движение',
  );
  assert.equal(
    generatedItemDescription(item, 'en').summary,
    'Gloves · Immunity: Chilled · +2 attack · +7% move speed',
  );
});

test('unknown potions keep their real effect out of every description boundary', () => {
  const item = {
    id: 'secret-potion',
    unidentified: true,
    identification: { group: 'potion' },
    potionEffect: { type: 'power', amount: 99 },
  };
  const ru = generatedItemDescription(item, 'ru');
  const en = generatedItemDescription(item, 'en');

  assert.equal(ru.summary, 'Зелье · эффект неизвестен');
  assert.equal(en.summary, 'Potion · unknown effect');
  assert.doesNotMatch(JSON.stringify([ru, en]), /99|power|сила/i);
});

test('unsupported gameplay fields fail loudly instead of promising a fake effect', () => {
  assert.throws(
    () => generatedItemDescription({ id: 'future-gloves', slot: 'gloves', stats: { agility: 3 } }),
    /Missing item stat dictionary entry: agility/,
  );
  assert.throws(
    () => generatedItemDescription({ id: 'future-boots', slot: 'boots', magic: { timeStop: true } }),
    /Missing item magic dictionary entry: timeStop/,
  );
});

test('consumable descriptions and runtime read the same useEffect contract', async () => {
  const potion = LOOT_CATALOG.find(({ id }) => id === 'healing-potion');
  assert.deepEqual(potion.useEffect, { type: 'heal', amount: 32 });
  assert.equal(generatedItemDescription(potion, 'ru').summary, 'Зелье · Лечение: +32');

  const runtimeSource = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtimeSource, /item\.useEffect\?\.type === 'heal'/);
  assert.doesNotMatch(runtimeSource, /item\.id === 'healing-potion'/);
});

test('the legacy handwritten lore tables are gone from item presentation', async () => {
  const detailsSource = await readFile(new URL('../tools/dcss-rpg-item-details.js', import.meta.url), 'utf8');
  assert.doesNotMatch(detailsSource, /\bLORE\b|\bSPECIAL_EFFECTS\b/);
  assert.match(detailsSource, /generatedItemDescription/);
});
