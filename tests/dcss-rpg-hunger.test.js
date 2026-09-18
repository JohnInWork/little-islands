import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  HUNGER_MAX,
  HUNGER_TUNING,
  advanceHunger,
  consumeFood,
  hungerPresentation,
  hungerStage,
  hungerStatModifiers,
  validateHunger,
} from '../tools/dcss-rpg-hunger.js';

test('one tuning profile creates a long nonlethal three-stage hunger curve', () => {
  assert.equal(HUNGER_MAX, 3600);
  assert.equal(hungerStage(HUNGER_MAX).id, 'fed');
  assert.equal(hungerStage(HUNGER_TUNING.mildAt).id, 'mild');
  assert.equal(hungerStage(HUNGER_TUNING.strongAt).id, 'strong');
  assert.equal(hungerStage(HUNGER_TUNING.starvingAt).id, 'starving');
  assert.equal(hungerStage(0).id, 'starving');
  assert.equal(advanceHunger(2, 30), 0);
  assert.equal(advanceHunger(0, 300), 0);
});

test('hunger penalties are monotonic and starvation cannot reduce health', () => {
  const fed = hungerStatModifiers(HUNGER_MAX);
  const mild = hungerStatModifiers(HUNGER_TUNING.mildAt);
  const strong = hungerStatModifiers(HUNGER_TUNING.strongAt);
  const starving = hungerStatModifiers(0);
  for (const key of ['attack', 'defense', 'moveSpeed', 'attackSpeed']) {
    assert.ok(fed[key] >= mild[key]);
    assert.ok(mild[key] >= strong[key]);
    assert.ok(strong[key] >= starving[key]);
    assert.ok(starving[key] > 0);
  }
  assert.equal(Object.hasOwn(starving, 'hp'), false);
  assert.equal(Object.hasOwn(starving, 'damage'), false);
});

test('food restores satiety and health atomically without wasting a full ration', () => {
  const eaten = consumeFood({ hunger: 300, hp: 70, maxHp: 100, nutrition: 1500, healing: 12 });
  assert.equal(eaten.ok, true);
  assert.deepEqual(eaten.state, { hunger: 1800, hp: 82 });
  assert.equal(eaten.restored, 1500);
  assert.equal(eaten.healed, 12);

  const capped = consumeFood({ hunger: 3500, hp: 96, maxHp: 100, nutrition: 1500, healing: 12 });
  assert.deepEqual(capped.state, { hunger: HUNGER_MAX, hp: 100 });
  assert.equal(capped.restored, 100);
  assert.equal(capped.healed, 4);
  assert.deepEqual(
    consumeFood({ hunger: HUNGER_MAX, hp: 100, maxHp: 100, nutrition: 1500, healing: 12 }),
    { ok: false, reason: 'full' },
  );
});

test('hunger validates its save value and presents every stage in RU and EN', () => {
  assert.equal(validateHunger(HUNGER_MAX), true);
  for (const invalid of [-1, HUNGER_MAX + 1, 3.5, null, '300']) assert.equal(validateHunger(invalid), false);
  assert.equal(hungerPresentation(HUNGER_TUNING.mildAt, 'ru').label, 'Лёгкий голод');
  assert.equal(hungerPresentation(HUNGER_TUNING.strongAt, 'en').label, 'Hungry');
  assert.match(hungerPresentation(0, 'ru').description, /сильно снижены/);
  assert.match(hungerPresentation(0, 'en').description, /heavily reduced/);
});

test('runtime advances hunger only inside active gameplay and exposes a compact pixel meter', async () => {
  const [runtime, html, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  const update = runtime.match(/function updateHunger\(delta\) \{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';
  assert.match(update, /!playerHasActed \|\| runStatus !== 'playing' \|\| hero\.dead/);
  assert.match(update, /advanceHunger\(hero\.hunger, activeSeconds\)/);
  assert.match(update, /HUNGER_TUNING\.autosaveEvery/);
  assert.doesNotMatch(update, /damageHero|hero\.hp\s*[-=]/);
  assert.match(runtime, /if \(uiScreen === 'game'\)[\s\S]*updateHero\(delta\)/);
  assert.match(runtime, /effect\?\.type === 'food'/);
  assert.match(html, /id="hunger-meter"[^>]*data-stage="fed"[\s\S]*id="hunger-fill"/);
  assert.match(css, /\.hunger-meter\[data-stage='starving'\][\s\S]*--hunger-color:\s*#d6524c/);
});
