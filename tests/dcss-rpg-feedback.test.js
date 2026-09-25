import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { SOUND_SAMPLES } from '../tools/dcss-rpg-audio.js';
import {
  FEEDBACK_KINDS,
  FEEDBACK_TONES,
  feedbackCopy,
  feedbackFor,
  formatDeltas,
  parleyFeedbackKind,
  readSignedAmounts,
} from '../tools/dcss-rpg-feedback.js';

const adapterUrl = new URL('../tools/dcss.js', import.meta.url);
const cssUrl = new URL('../tools/dcss.css', import.meta.url);

/**
 * «Кристалл дал +5, а чего — непонятно.»
 *
 * Итог пишется метками, и у каждой метки есть картинка и слово. Строка без
 * языка: одна и та же для русского и английского.
 */
test('изменения героя пишутся метками, а не голыми числами', () => {
  assert.equal(formatDeltas({ gold: 5, attack: 1 }), '+1 {attack} · +5 {gold}');
  assert.equal(formatDeltas({ heal: -14 }), '−14 {heal}');
  assert.equal(formatDeltas({ maxhp: 3, heal: 0 }), '+3 {maxhp}');
  assert.equal(formatDeltas({}), '', 'ничего не случилось — ничего и не сказано');
  assert.equal(formatDeltas({ gold: Number.NaN }), '');
});

test('хорошо или плохо — решает одно место', () => {
  assert.equal(feedbackFor({ value: '+5 {gold}' }).tone, 'good');
  assert.equal(feedbackFor({ value: '+5 {gold}' }).sound, 'gold');
  assert.equal(feedbackFor({ value: '+12 {heal}' }).kind, 'heal');
  assert.equal(feedbackFor({ value: '+1 {attack} · +5 {gold}' }).kind, 'buff', 'рост важнее монет');
  assert.equal(feedbackFor({ value: '−14 {heal}' }).tone, 'bad');
  assert.equal(feedbackFor({ value: '−14 {heal}' }).kind, 'damage');
  assert.equal(feedbackFor({ value: '−14 {heal} · +20 {gold}' }).tone, 'neutral', 'золото ценой раны — размен');
  assert.equal(feedbackFor({ value: 'full' }).kind, 'refused');
  assert.equal(feedbackFor({ value: 'Просто слова' }).tone, 'neutral');
  assert.equal(feedbackFor({ value: 12 }).tone, 'neutral', 'число без метки ничего не говорит');
  // Место знает, что случилось, лучше строки.
  assert.equal(feedbackFor({ kind: 'skill-down', value: 'Забыто: Мечи −1' }).tone, 'bad');
  assert.equal(feedbackFor({ kind: 'spell', value: 'Изучено' }).tone, 'good');
  assert.equal(feedbackFor({ kind: 'poison' }).tone, 'bad');
  assert.equal(feedbackFor({ kind: 'nonsense', value: '+3 {gold}' }).kind, 'gold', 'неизвестный вид не ломает итог');
});

test('каждый вид итога — известный тон и уже записанный звук', () => {
  for (const [id, spec] of Object.entries(FEEDBACK_KINDS)) {
    assert.ok(FEEDBACK_TONES.includes(spec.tone), `${id}: тон ${spec.tone}`);
    if (spec.sound !== null) assert.ok(SOUND_SAMPLES[spec.sound], `${id}: нет звука ${spec.sound}`);
    if (spec.tone === 'neutral') assert.equal(spec.sound, null, `${id}: сведения не звенят`);
  }
  // Названные в задаче исходы — по свою сторону.
  for (const id of ['heal', 'gold', 'buff', 'spell', 'skill-up', 'item']) {
    assert.equal(FEEDBACK_KINDS[id].tone, 'good', id);
  }
  for (const id of ['damage', 'curse', 'poison', 'skill-down', 'trap']) {
    assert.equal(FEEDBACK_KINDS[id].tone, 'bad', id);
  }
});

test('знак читается и с дефисом, и с настоящим минусом', () => {
  assert.deepEqual(readSignedAmounts('-3 {gold} · −2 {heal} · +1 {attack}'), {
    gains: ['attack'],
    losses: ['gold', 'heal'],
  });
  assert.deepEqual(readSignedAmounts(null), { gains: [], losses: [] });
});

test('исход разговора читается по полям', () => {
  assert.equal(parleyFeedbackKind({ hostile: true, goldDelta: 900 }), 'hostile');
  assert.equal(parleyFeedbackKind({ grantsItemId: 'x', goldDelta: -40 }), 'item');
  assert.equal(parleyFeedbackKind({ grantsItemId: 'junk', goldDelta: -40 }, { junk: true }), 'loss');
  assert.equal(parleyFeedbackKind({ goldDelta: 12 }), 'gold');
  assert.equal(parleyFeedbackKind({ heal: 7 }), 'heal');
  assert.equal(parleyFeedbackKind({ goldDelta: -20 }), 'info');
  assert.equal(parleyFeedbackKind(null), 'info');
});

test('короткие слова есть на обоих языках', () => {
  const ru = feedbackCopy('ru');
  const en = feedbackCopy('en');
  assert.deepEqual(Object.keys(ru).sort(), Object.keys(en).sort());
  for (const key of Object.keys(ru)) {
    const a = typeof ru[key] === 'function' ? ru[key](2) : ru[key];
    const b = typeof en[key] === 'function' ? en[key](2) : en[key];
    assert.notEqual(a, b, `${key} не переведено`);
  }
  assert.equal(feedbackCopy('de'), ru);
});

/**
 * Переходник обязан пользоваться этим решением, а не своим.
 */
test('строка итога поверх окон и с тоном из одного места', async () => {
  const [runtime, css] = await Promise.all([readFile(adapterUrl, 'utf8'), readFile(cssUrl, 'utf8')]);
  assert.match(runtime, /lootToastQueue\.push\(\{ item, value, feedback: feedbackFor\(\{ kind, value \}\) \}\)/);
  assert.match(runtime, /lootToast\.dataset\.tone = feedback\.tone;/);
  assert.match(runtime, /fillTextWithIcons\(lootName, text, \{ words: true \}\)/);
  // Метки для роста, которые картинкой одной не объяснить.
  const icons = runtime.slice(runtime.indexOf('const TEXT_ICONS = Object.freeze({'));
  for (const id of ['maxhp', 'attack', 'food', 'map']) {
    assert.match(icons.slice(0, 1600), new RegExp(`${id}: Object\\.freeze\\(\\{ path: `), id);
  }

  const toastRule = css.slice(css.indexOf('.loot-toast {'));
  const zIndex = Number(/z-index:\s*(\d+)/.exec(toastRule.slice(0, toastRule.indexOf('}')))[1]);
  for (const dialog of ['.inventory', '.item-detail', '.character-sheet', '.context-actions', '.chest-container', '.merchant-shop', '.lore']) {
    const rule = css.slice(css.indexOf(`\n${dialog} {`));
    const dialogZ = Number(/z-index:\s*(\d+)/.exec(rule.slice(0, rule.indexOf('}')))[1]);
    assert.ok(zIndex > dialogZ, `${dialog} (${dialogZ}) закрывает итог (${zIndex})`);
  }
  // Ступенчатая анимация и уважение к просьбе не двигать.
  assert.match(css, /\.loot-toast\.visible\.announce\[data-tone='good'\][^}]*steps\(/s);
  assert.match(css, /\.loot-toast\.visible\.announce\[data-tone='bad'\][^}]*steps\(/s);
  assert.match(css, /prefers-reduced-motion: reduce\)\s*\{[^@]*\.loot-toast\.visible\.announce\[data-tone\]\s*\{\s*animation: none;/s);
});

/**
 * Голые числа из итогов ушли: там, где раньше передавали `goldReward` или
 * `+${value}`, теперь строка с меткой.
 */
test('в итогах не осталось голых чисел и типографских значков', async () => {
  const runtime = await readFile(adapterUrl, 'utf8');
  for (const bare of [
    'showLootToast({ icon: GOLD_ICON_PATH, rarity: Math.min(3, monster.tier >> 1) }, goldReward)',
    'showLootToast({ path, rarity: 3 }, `+${value}`)',
    'showLootToast({ path, rarity: 0 }, -value)',
    'showLootToast({ path: SANCTUARY_PATH, rarity: 2 }, result.healed)',
    'showLootToast({ path: monster.spritePath, rarity: 3 }, monster.vaultRewardGold)',
    '`+${result.rewardPower} · ${result.rewardGold}●`',
    '`+${recovery.healed} ♥`',
    "'●●●'",
  ]) {
    assert.ok(!runtime.includes(bare), `осталось: ${bare}`);
  }
});
