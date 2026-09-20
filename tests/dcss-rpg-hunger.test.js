import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  HUNGER_COST,
  HUNGER_MAX,
  HUNGER_TUNING,
  STARVATION_DAMAGE_PERCENT,
  STARVATION_TICK_SECONDS,
  advanceHunger,
  canEatNow,
  starvationToll,
  consumeFood,
  hungerPresentation,
  hungerStage,
  hungerStatModifiers,
  validateHunger,
} from '../tools/dcss-rpg-hunger.js';

test('one tuning profile creates a long hunger curve that ends in a clock', () => {
  assert.equal(HUNGER_MAX, 3600);
  assert.equal(hungerStage(HUNGER_MAX).id, 'fed');
  assert.equal(hungerStage(HUNGER_TUNING.mildAt).id, 'mild');
  assert.equal(hungerStage(HUNGER_TUNING.strongAt).id, 'strong');
  assert.equal(hungerStage(HUNGER_TUNING.starvingAt).id, 'starving');
  // Empty is its own state, and the screen has to be able to say so: this is
  // the one that is taking health, not the one that is merely low.
  assert.equal(hungerStage(1).id, 'starving');
  assert.equal(hungerStage(0).id, 'empty');
  assert.equal(advanceHunger(2, 30), 0);
  assert.equal(advanceHunger(0, 300), 0);
});

/**
 * The change that turned a debuff into a clock. Before this the bar bottomed
 * out and stopped: a hero could walk an entire road at zero, at −45 % attack,
 * and nothing ever forced the question. Now the bar keeps taking health until
 * something is eaten.
 */
test('an empty bar takes health, and only an empty one does', () => {
  assert.equal(starvationToll({ hunger: 1, maxHp: 100, seconds: 60 }).damage, 0, 'почти пустая не убивает');
  assert.equal(starvationToll({ hunger: 0, maxHp: 100, seconds: 1 }).damage, 0, 'меньше тика — ничего');

  const tick = starvationToll({ hunger: 0, maxHp: 100, seconds: STARVATION_TICK_SECONDS });
  assert.equal(tick.damage, STARVATION_DAMAGE_PERCENT);
  assert.equal(tick.remainder, 0);

  // The remainder is carried rather than rounded away: a tick that rounds down
  // never fires at all on a fast frame.
  const partial = starvationToll({ hunger: 0, maxHp: 100, seconds: STARVATION_TICK_SECONDS * 1.5 });
  assert.equal(partial.damage, STARVATION_DAMAGE_PERCENT);
  assert.ok(partial.remainder > 0);

  // It scales with the hero, so it stays a clock at level one and at level ten.
  assert.ok(
    starvationToll({ hunger: 0, maxHp: 400, seconds: STARVATION_TICK_SECONDS }).damage
      > starvationToll({ hunger: 0, maxHp: 100, seconds: STARVATION_TICK_SECONDS }).damage,
  );
  // About a minute from full health to dead if it is ignored completely:
  // a warning, not an ambush.
  const seconds = Math.ceil(100 / STARVATION_DAMAGE_PERCENT) * STARVATION_TICK_SECONDS;
  assert.ok(seconds > 40 && seconds < 90, `голод убивает за ${seconds} с`);
});

test('есть можно всегда, в том числе в драке', () => {
  // Запрет держался на честной мысли — жевать паёк на замахе не дело, — но
  // лечиться в бою тогда оказалось нечем: зелье в забеге одно, а еда лежала
  // в мешке и не давалась. Иван: «еда лечит в бою».
  assert.equal(canEatNow({ threatened: false }).ok, true);
  assert.equal(canEatNow({ threatened: true }).ok, true);
  assert.equal(canEatNow().reason, 'clear');
  // And a swing costs the clock on top of the second it took, so a long fight
  // is expensive and walking round a room is worth something.
  assert.ok(HUNGER_COST.strike > 0);
  assert.ok(HUNGER_COST.spell > HUNGER_COST.strike);
  assert.ok(HUNGER_COST.strike * 30 > 30, 'тридцать ударов дороже тридцати секунд');
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
  assert.match(hungerPresentation(HUNGER_TUNING.starvingAt, 'ru').description, /сильно снижены/);
  assert.match(hungerPresentation(HUNGER_TUNING.starvingAt, 'en').description, /heavily reduced/);
  // And an empty bar says what it is doing, not merely that it is low.
  assert.match(hungerPresentation(0, 'ru').description, /Здоровье уходит/);
  assert.match(hungerPresentation(0, 'en').description, /draining/);
});

test('runtime advances hunger only inside active gameplay and exposes a compact pixel meter', async () => {
  const [runtime, html, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  const update = runtime.match(/function updateHunger\(delta\) \{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';
  assert.match(update, /!playerHasActed \|\| runStatus !== 'playing' \|\| hero\.dead/);
  // Armour can slow hunger, but only the seconds actually lived are ever spent.
  assert.match(update, /advanceHunger\([\s\S]{0,40}?hero\.hunger,[\s\S]{0,160}?frugalHungerSeconds\(activeSeconds, currentArmourProfile\(\)\)[\s\S]{0,60}?currentConditions\(\)\.hungerScale/);
  assert.match(update, /HUNGER_TUNING\.autosaveEvery/);
  // The tick itself still does not touch health — `starve` does, and only at
  // zero. Keeping them apart is what stops «hunger hurt me» from ever meaning
  // «hunger ticked».
  assert.doesNotMatch(update, /damageHero|hero\.hp\s*[-=]/);
  assert.match(update, /starve\(activeSeconds\)/);
  const starve = runtime.match(/function starve\(activeSeconds\) \{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';
  assert.match(starve, /if \(hero\.hunger > 0\)/);
  assert.match(starve, /damageHero\(toll\.damage[\s\S]{0,80}?source: 'hunger'/);
  // Eating is refused in reach of something hostile.
  assert.match(runtime, /canEatNow\(\)/);
  assert.match(css, /\.hunger-meter\[data-stage='empty'\]/);
  assert.match(runtime, /if \(uiScreen === 'game'\)[\s\S]*updateHero\(delta\)/);
  assert.match(runtime, /effect\?\.type === 'food'/);
  assert.match(html, /id="hunger-meter"[^>]*data-stage="fed"[\s\S]*id="hunger-fill"/);
  assert.match(css, /\.hunger-meter\[data-stage='starving'\][\s\S]*--hunger-color:\s*#d6524c/);
});

/**
 * Hunger and tiredness both weaken the hero — a strong hunger takes a fifth off
 * attack and defence, being spent hides half of what a search would find — and
 * both were shown only as an unlabelled bar at the top of the screen. So the
 * hero got worse and the player had no way to learn why.
 */
test('hunger and tiredness stand beside the other states, with the sentence that explains them', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const fn = runtime.slice(runtime.indexOf('function standingHeroStates('));
  const body = fn.slice(0, fn.indexOf('\nfunction renderHeroEffectsHud'));
  assert.ok(body.length > 0, 'nothing stands');
  // Only when they are actually costing the hero something.
  assert.match(body, /hunger\.id !== 'fed'/);
  assert.match(body, /rest\.id !== 'rested'/);
  // And the badge carries the description, which the modules already wrote.
  assert.match(runtime, /`\$\{state\.label\}\. \$\{state\.description\}`/);
  assert.match(runtime, /heroEffectsHud\.hidden = effects\.length === 0 && standing\.length === 0;/);

  // The sentences exist for every stage that penalises, in both languages.
  for (const value of [2000, 900, 300, 0]) {
    const stage = hungerStage(value);
    if (stage.id === 'fed') continue;
    for (const language of ['ru', 'en']) {
      assert.ok(stage.descriptions[language].length > 10, `${stage.id}/${language}`);
      assert.ok(stage.labels[language].length > 2, `${stage.id}/${language}`);
    }
    assert.ok(
      Object.values(stage.modifiers).some((value) => value < 1),
      `${stage.id} is shown as a debuff but costs nothing`,
    );
  }
});
