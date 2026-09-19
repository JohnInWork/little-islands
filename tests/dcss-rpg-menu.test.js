import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { mainMenuModel } from '../tools/dcss-rpg-menu.js';

const htmlUrl = new URL('../tools/dcss.html', import.meta.url);
const cssUrl = new URL('../tools/dcss.css', import.meta.url);
const runtimeUrl = new URL('../tools/dcss.js', import.meta.url);

test('main menu localizes fresh, continuing and terminal runs', () => {
  const fresh = mainMenuModel({ language: 'ru', depthLabel: 'I', level: 1 });
  const continuing = mainMenuModel({
    language: 'en',
    runStarted: true,
    depthLabel: 'III',
    level: 4,
  });
  const terminal = mainMenuModel({
    language: 'ru',
    runStarted: true,
    runStatus: 'dead',
    depthLabel: 'II',
    level: 3,
  });
  const paused = mainMenuModel({ language: 'en', paused: true, depthLabel: 'II', level: 2 });

  assert.equal(fresh.title, 'DNG Codex');
  assert.equal(fresh.action, 'Начать забег');
  assert.equal(fresh.hint, 'Случайное подземелье');
  assert.equal(fresh.labels.inventoryTitle, 'Рюкзак');
  assert.equal(fresh.labels.equippedItems, 'Надетое');
  assert.equal(continuing.title, 'DNG Codex');
  assert.equal(continuing.action, 'Continue');
  assert.equal(continuing.hint, 'Floor III · Level 4');
  assert.equal(continuing.labels.inventoryTitle, 'Backpack');
  assert.equal(continuing.labels.equippedItems, 'Equipped');
  assert.equal(terminal.action, 'Новый забег');
  assert.match(terminal.hint, /Этаж II · Уровень 3/);
  assert.equal(paused.state, 'Paused');
  assert.equal(paused.action, 'Continue');
  assert.equal(paused.labels.appearance, 'Appearance');
});

test('main menu owns input until play and keeps language selection persistent', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
    readFile(runtimeUrl, 'utf8'),
  ]);

  assert.match(html, /<body[^>]*data-screen="menu"/);
  assert.match(html, /id="main-menu"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.equal((html.match(/data-language="(?:ru|en)"/g) ?? []).length, 2);
  assert.match(html, /id="start-game"[^>]*disabled/);
  assert.match(html, /id="pause-game"[^>]*disabled/);
  assert.match(html, /id="appearance-editor"[\s\S]*role="dialog"/);
  assert.match(html, /id="new-run-confirm"[\s\S]*role="alertdialog"/);
  assert.match(css, /\[data-screen='menu'\] \.main-menu/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 520px\)/);
  assert.match(runtime, /let uiScreen = 'menu'/);
  assert.match(runtime, /function startGameFromMenu\(\)/);
  assert.match(runtime, /function setInterfaceLanguage\(language\)/);
  assert.match(runtime, /localStorage\.setItem\(ITEM_LANGUAGE_KEY, itemDetailLanguage\)/);
  assert.match(runtime, /if \(uiScreen === 'game'\) \{\s*if \(hitStop > 0\)/);
  assert.match(runtime, /framePhase\('hero', \(\) => updateHero\(delta\)\);\s*if \(hitStop === 0\) framePhase\('world'/);
  assert.match(runtime, /event\.code === 'Tab' && uiScreen === 'menu'/);
  assert.match(runtime, /event\.code === 'Tab' && uiScreen === 'appearance'/);
  assert.match(runtime, /function openNewRunConfirm\(\)/);
});

test('main menu keeps one visual signature and one dominant action', async () => {
  const [html, css] = await Promise.all([
    readFile(htmlUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
  ]);
  const card = css.match(/\.main-menu-card\s*{(?<body>[^}]*)}/)?.groups?.body ?? '';
  const action = css.match(/\.start-game\s*{(?<body>[^}]*)}/)?.groups?.body ?? '';
  const language =
    css.match(/\.main-menu-languages button\s*{(?<body>[^}]*)}/)?.groups?.body ?? '';

  assert.match(html, /class="main-menu-brand"/);
  assert.match(html, /class="main-menu-actions"/);
  assert.doesNotMatch(html, /class="main-menu-card pixel-frame"/);
  assert.match(card, /background:\s*transparent/);
  assert.match(card, /border:\s*0/);
  assert.match(card, /box-shadow:\s*none/);
  assert.match(action, /min-height:\s*68px/);
  assert.match(language, /min-height:\s*48px/);
  assert.match(css, /\.main-menu-brand\s*{/);
  assert.match(css, /\.main-menu-actions\s*{/);
});
