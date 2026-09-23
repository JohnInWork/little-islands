import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { HELP_SECTIONS, helpModel } from '../tools/dcss-rpg-help.js';
import { STARVATION_DAMAGE_PERCENT } from '../tools/dcss-rpg-hunger.js';
import { STORY_DEPTH } from '../tools/dcss-rpg-run.js';
import { STASH_PER_FLOOR } from '../tools/dcss-rpg-stash.js';

/*
 * Справка — единственное место, где игра учит. Иван: «в игре не надо ничего
 * обучать», а значит, справка обязана говорить правду и на обоих языках.
 */
test('справка говорит на обоих языках одинаково подробно', () => {
  assert.ok(HELP_SECTIONS.length >= 5);
  for (const section of HELP_SECTIONS) {
    assert.ok(section.ru.title && section.en.title, `${section.id}: нет заголовка`);
    assert.equal(section.ru.entries.length, section.en.entries.length, `${section.id}: языки разошлись`);
    for (const locale of ['ru', 'en']) {
      for (const item of section[locale].entries) {
        assert.ok(item.term.trim() && item.text.trim().length > 20, `${section.id}/${locale}: пустой пункт`);
      }
    }
  }
  assert.equal(helpModel('en').title, 'How to play');
  assert.equal(helpModel('xx').language, 'ru');
});

test('числа в справке — те же, что в правилах', () => {
  const text = (locale) => HELP_SECTIONS.flatMap((section) => section[locale].entries.map((item) => item.text)).join(' ');
  for (const locale of ['ru', 'en']) {
    assert.ok(text(locale).includes(`${STARVATION_DAMAGE_PERCENT}%`), `${locale}: голод`);
    assert.ok(text(locale).includes(`${STORY_DEPTH} `), `${locale}: число этажей`);
    assert.ok(text(locale).includes(`${STASH_PER_FLOOR} `), `${locale}: копилка`);
  }
});

test('клавиши из справки действительно работают, а кнопка «?» стоит в меню', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyM', 'Digit1', 'Escape', 'Space']) {
    assert.ok(runtime.includes(code), `в справке обещана клавиша ${code}, а игра её не слушает`);
  }
  assert.match(html, /id="main-menu"[\s\S]*?<button id="open-help"[\s\S]*?<article class="main-menu-card">/);
  assert.match(html, /id="help-screen"/);
  assert.match(runtime, /openHelpButton\.addEventListener\('click', openHelp\)/);
  assert.match(runtime, /event\.code === 'Escape' && uiScreen === 'help'/);
});
