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
    weaponName: 'Rusty sword',
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
  /*
   * Подписи «Случайное подземелье» больше нет.
   *
   * Она стояла и под меню, и на кнопке «Начать забег» — дважды на одном
   * экране, и оба раза не сообщала ничего, чего игрок не знал бы и так. Иван:
   * «оно не нужно». Там, где сказать есть что — чем кончился забег, на каком
   * этаже герой, — подпись осталась, и это проверено ниже.
   */
  assert.equal(fresh.hint, '');
  assert.equal(fresh.actions[0].detail, '');
  assert.equal(fresh.labels.inventoryTitle, 'Рюкзак');
  assert.equal(fresh.labels.equippedItems, 'Надетое');
  assert.equal(continuing.title, 'DNG Codex');
  assert.equal(continuing.action, 'Continue');
  assert.equal(continuing.hint, 'Floor III · Level 4');
  assert.equal(continuing.labels.inventoryTitle, 'Backpack');
  assert.equal(continuing.labels.equippedItems, 'Equipped');
  assert.equal(terminal.action, 'Начать заново');
  assert.match(terminal.hint, /Этаж II · Уровень 3/);
  assert.equal(paused.state, 'Paused');
  assert.equal(paused.action, 'Continue');

  // «Главное: Начать заново и Продолжить, и во втором написано, кем играешь.»
  // A hero who has not taken a step has nothing to continue, so there is one
  // choice then — and it is not called «заново».
  assert.deepEqual(fresh.actions.map(({ id }) => id), ['start']);
  assert.equal(fresh.actions[0].label, 'Начать забег');
  assert.deepEqual(continuing.actions.map(({ id }) => id), ['continue', 'restart']);
  assert.equal(continuing.actions[0].detail, 'Level 4 · Rusty sword · Floor III');
  assert.equal(continuing.actions[1].label, 'Start over');
  assert.equal(continuing.actions[1].detail, '');
  // A run that is over cannot be continued, whatever the hero was carrying.
  assert.deepEqual(terminal.actions.map(({ id }) => id), ['start']);
  assert.equal(terminal.actions[0].label, 'Начать заново');
  // A bare-handed hero simply has no weapon in the line.
  const barehanded = mainMenuModel({ runStarted: true, depthLabel: 'V', level: 7 });
  assert.equal(barehanded.actions[0].detail, 'Уровень 7 · Этаж V');
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
  // Мир идёт только на экране игры; заставка прибытия и хит-стоп лишь придерживают его.
  assert.match(runtime, /if \(uiScreen === 'game'\) \{\s*if \(arrivalHold > 0\) \{[\s\S]{0,120}\} else if \(hitStop > 0\)/);
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

test('the front page offers two choices and the pause screen only what a pause needs', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
  ]);
  // Two keys of the same kind, each with a line under it saying what it is.
  for (const id of ['start-game', 'start-game-detail', 'restart-from-menu', 'restart-from-menu-detail']) {
    assert.ok(html.includes(`id="${id}"`), `${id} is missing`);
  }
  assert.ok(!html.includes('new-run-from-menu'), 'the old small secondary is still there');
  assert.match(runtime, /const \[first, second = null\] = model\.actions;/);
  assert.match(runtime, /startGameDetail\.textContent = first\.detail;/);
  assert.match(runtime, /newRunFromMenuButton\.hidden = second === null;/);
  // «Кем играешь» is the hero, so the weapon in hand goes into the model.
  assert.match(runtime, /weaponName: equippedItem\('hand1'\)/);
  /*
   * Пауза — это пауза: ни гардероба, ни лавки, ни записей. Одно исключение —
   * настройки: громкость убавляют ровно тогда, когда игра уже идёт, и раньше
   * ради этого регулятор висел прямо в карточке меню поверх подземелья.
   */
  assert.match(
    css,
    /\.main-menu\[data-mode='pause'\] \.main-menu-secondary > button:not\(#open-settings\) \{\s*display: none;/,
    'в паузе второстепенный ряд обязан прятаться весь, кроме настроек',
  );
  assert.ok(html.includes('id="open-settings"'), 'кнопки настроек нет в меню');
  assert.ok(html.includes('id="open-credits"'), 'кнопки авторов нет в меню');
  // Язык и звук переехали на экран настроек и в карточке меню больше не лежат.
  const menuCard = html.slice(html.indexOf('main-menu-card'), html.indexOf('id="appearance-editor"'));
  assert.ok(!menuCard.includes('id="main-menu-audio"'), 'звук всё ещё в карточке меню');
  assert.ok(!menuCard.includes('id="main-menu-languages"'), 'язык всё ещё в карточке меню');
  // And nothing anywhere ends a run by walking away with the haul.
  assert.ok(!runtime.includes("action.id === 'retire'"), 'the gate can still cash out');
});
