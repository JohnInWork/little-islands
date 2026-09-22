import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const корень = new URL('../tools/', import.meta.url);

/** Где кончается блок, начавшийся этой фигурной скобкой. */
function конецБлока(text, start) {
  let глубина = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '{') глубина += 1;
    else if (text[i] === '}') {
      глубина -= 1;
      if (глубина === 0) return i;
    }
  }
  return -1;
}

/** Выкинуть содержимое строк: внутри них слова, а не ключи. */
function безСтрок(text) {
  let out = '';
  for (let i = 0; i < text.length;) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') {
      i += 1;
      while (i < text.length && text[i] !== c) i += text[i] === '\\' ? 2 : 1;
      out += '""';
      i += 1;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

/** Ключи верхнего уровня объекта. */
function ключи(тело) {
  const text = безСтрок(тело);
  const найдено = new Set();
  let глубина = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '{' || c === '[' || c === '(') глубина += 1;
    else if (c === '}' || c === ']' || c === ')') глубина -= 1;
    else if (глубина === 0) {
      const m = /^\s*([A-Za-z_$][\w$-]*)\s*:/.exec(text.slice(i));
      if (m) {
        найдено.add(m[1]);
        i += m[0].length - 1;
      }
    }
  }
  return найдено;
}

/**
 * Два языка — один набор ключей.
 *
 * Правило пишется по-русски, английский дописывается следом, и пропущенная
 * строчка не падает нигде: игрок на английском просто видит `undefined` или,
 * что хуже, русское слово посреди своего языка. Иван: «проверь, что везде
 * нормально работает английский и русский язык».
 *
 * Поэтому каждая пара `ru`/`en`, стоящая рядом в одном объекте, сверяется по
 * ключам. Это ловит именно ту ошибку, которая случается: добавили в один
 * язык и забыли про второй.
 */
test('у русской и английской половины каждой таблицы один набор ключей', async () => {
  const файлы = (await readdir(корень)).filter((имя) => /^dcss-rpg-.*\.js$/.test(имя));
  assert.ok(файлы.length > 40, `модулей всего ${файлы.length}`);
  const расхождения = [];
  let пар = 0;
  for (const имя of файлы) {
    const text = await readFile(new URL(имя, корень), 'utf8');
    for (const m of text.matchAll(/\bru:\s*(?:Object\.freeze\()?\{/g)) {
      const нач = text.indexOf('{', m.index + m[0].length - 1);
      const кон = конецБлока(text, нач);
      if (кон < 0) continue;
      if (!/^\s*\)?\s*,\s*en:\s*(?:Object\.freeze\()?\{/.test(text.slice(кон + 1, кон + 40))) continue;
      const нач2 = text.indexOf('{', кон + 1);
      const кон2 = конецБлока(text, нач2);
      пар += 1;
      const ru = ключи(text.slice(нач + 1, кон));
      const en = ключи(text.slice(нач2 + 1, кон2));
      const нетВEn = [...ru].filter((ключ) => !en.has(ключ));
      const нетВRu = [...en].filter((ключ) => !ru.has(ключ));
      if (нетВEn.length || нетВRu.length) {
        расхождения.push(`${имя}:${text.slice(0, m.index).split('\n').length} нет в en: ${нетВEn} · нет в ru: ${нетВRu}`);
      }
    }
  }
  assert.ok(пар > 30, `пар ru/en нашлось всего ${пар} — разбор сломался`);
  assert.deepEqual(расхождения, []);
});

/**
 * Английское меню не говорит по-русски.
 *
 * Подпись, поставленная в разметке, переводом не занимается: она просто
 * остаётся русской навсегда. Так и было с кнопкой снаряжения, кнопкой
 * «Начать» на создании и заголовками его разделов — всё это правилось по
 * одному, потому что каждое из них ставилось руками в HTML.
 */
test('подписи в меню и на создании берутся из словаря, а не из разметки', async () => {
  const runtime = await readFile(new URL('dcss.js', корень), 'utf8');
  for (const строка of [
    'openOutfitLabel.textContent = stashCopy(itemDetailLanguage).title;',
    'confirmCreationLabel.textContent = copy.start;',
    'creationAttributesTitle.textContent = copy.attributes;',
    'creationSkillsTitle.textContent = copy.skills;',
  ]) {
    assert.ok(runtime.includes(строка), `подпись ставится мимо словаря: ${строка}`);
  }
});
