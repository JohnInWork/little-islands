import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { characterSheetModel } from '../tools/dcss-rpg-character-sheet.js';

const sourceUrl = new URL('../tools/dcss.js', import.meta.url);
const htmlUrl = new URL('../tools/dcss.html', import.meta.url);
const cssUrl = new URL('../tools/dcss.css', import.meta.url);

test('character sheet explains the complete derived build in both languages', () => {
  const state = {
    hero: { level: 3, xp: 10, hp: 71 },
    stats: { attack: 9, defense: 6, maxHp: 112, moveSpeed: 1.2, attackSpeed: 1.15, intelligence: 7 },
    combat: { style: 'spear', range: 2, cooldown: 0.5 },
    damage: 9,
    baseMoveSpeed: 2.85,
    depthLabel: 'III',
  };
  const russian = characterSheetModel({ ...state, language: 'ru' });
  const english = characterSheetModel({ ...state, language: 'en' });
  assert.equal(russian.title, 'Персонаж');
  assert.equal(english.title, 'Character');
  assert.equal(russian.statRows.length, 7);
  assert.equal(russian.combatRows.length, 4);
  assert.equal(russian.statRows.find(({ id }) => id === 'health').value, '71/112');
  assert.equal(russian.statRows.find(({ id }) => id === 'movement').value, '3.42 кл/с');
  assert.equal(russian.statRows.find(({ id }) => id === 'intelligence').value, '7');
  assert.equal(russian.statRows.find(({ id }) => id === 'hunger').value, 'Сыт · 100%');
  assert.match(english.statRows.find(({ id }) => id === 'hunger').description, /never deals direct damage/);
  assert.equal(english.combatRows.find(({ id }) => id === 'rate').value, '2');
  assert.equal(english.combatRows.find(({ id }) => id === 'style').value, 'Spear');
  assert.equal(russian.experienceProgress, 10 / 54);
});

test('character sheet is a modal screen with responsive layout and trapped focus', async () => {
  const [source, html, css] = await Promise.all([
    readFile(sourceUrl, 'utf8'),
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
  ]);
  assert.match(html, /id="character-sheet-button"/);
  assert.match(html, /id="character-sheet"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(html, /id="character-paperdoll"/);
  assert.match(css, /\[data-screen='character'\] \.character-sheet/);
  assert.match(css, /@media \(min-width: 700px\) and \(max-height: 600px\)/);
  assert.match(source, /function openCharacterSheet\(\)/);
  assert.match(source, /function closeCharacterSheet\(\)/);
  assert.match(source, /event\.code === 'Tab' && uiScreen === 'character'/);
  assert.match(source, /characterSheetLanguageButton\.addEventListener/);
});
