import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  REST_MAX,
  REST_TUNING,
  advanceRest,
  canSpendSkillPoints,
  restPresentation,
  restStage,
  sleep,
  validateRest,
} from '../tools/dcss-rpg-rest.js';
import { createRun, generateDungeon, validateRun } from '../tools/dcss-rpg-core.js';
import { skillMenuModel } from '../tools/dcss-rpg-skill-menu.js';

/**
 * Hunger is already a clock that ends a run. A second one of that kind would
 * make the player manage two meters instead of playing — which is exactly the
 * complaint levelled at survival systems. So rest gates LEARNING, not
 * survival: you never die of it, and you always want it.
 */
test('rest never kills and never takes anything away', () => {
  for (const value of [REST_MAX, REST_TUNING.wearyAt, REST_TUNING.spentAt, 0]) {
    const stage = restStage(value);
    assert.ok(stage.id.length > 0);
    // Not one stage touches health, damage or speed. It touches what you see.
    assert.equal(Object.hasOwn(stage, 'hp'), false, stage.id);
    assert.equal(Object.hasOwn(stage, 'damage'), false, stage.id);
    assert.equal(Object.hasOwn(stage, 'moveSpeed'), false, stage.id);
    assert.ok(stage.searchPercent > 0, `${stage.id}: мир перестал читаться совсем`);
  }
  // And the penalty is monotonic: it never gets better by staying awake.
  assert.ok(restStage(REST_MAX).searchPercent > restStage(REST_TUNING.wearyAt).searchPercent);
  assert.ok(restStage(REST_TUNING.wearyAt).searchPercent > restStage(0).searchPercent);
});

test('what you learn on the road waits until you have slept on it', () => {
  assert.equal(canSpendSkillPoints(REST_MAX), true);
  assert.equal(canSpendSkillPoints(REST_TUNING.wearyAt), false);
  assert.equal(canSpendSkillPoints(0), false);
  // Nothing is lost: the clock refills whole, and a full one refuses politely.
  const slept = sleep(60);
  assert.equal(slept.ok, true);
  assert.equal(slept.rest, REST_MAX);
  assert.equal(sleep(REST_MAX).reason, 'already-rested');
  assert.equal(advanceRest(30, 600), 0, 'усталость не уходит в минус');
});

test('the menu says why the button is grey, rather than leaving a mystery', () => {
  // Points come from levels, so the state has to say it earned them.
  const heroLevel = 4;
  const state = { version: 1, points: 3, ranks: {} };
  const rested = skillMenuModel({ state, heroLevel, runStatus: 'playing', rested: true });
  const tired = skillMenuModel({ state, heroLevel, runStatus: 'playing', rested: false });
  const learnable = rested.groups.flatMap((g) => g.skills).filter((s) => s.canLearn);
  assert.ok(learnable.length > 0, 'выспавшемуся нечего изучить');
  const sameTired = tired.groups.flatMap((g) => g.skills).filter((s) => learnable.some((l) => l.id === s.id));
  for (const skill of sameTired) {
    assert.equal(skill.canLearn, false, `${skill.id}: усталый всё равно вкладывает`);
    assert.match(skill.reasonLabel, /выспись/i, `${skill.id}: отказ ничего не объясняет`);
  }
});

test('a run carries its rest clock, and an older save simply wakes up sharp', () => {
  const run = createRun(78, generateDungeon({ seed: 78, depth: 1 }));
  assert.equal(run.hero.rest, REST_MAX);
  assert.equal(validateRun(run), true);
  assert.equal(validateRun({ ...run, hero: { ...run.hero, rest: -1 } }), false);
  // Optional on disk: a save from before rest existed is still a valid save.
  const older = { ...run, hero: { ...run.hero } };
  delete older.hero.rest;
  assert.equal(validateRun(older), true);
  assert.equal(validateRest(REST_MAX), true);
});

test('the runtime ticks rest with hunger, spends it on nothing, and shows it', async () => {
  const [runtime, html, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  const update = runtime.match(/function updateHunger\(delta\) \{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';
  // Same seconds as hunger — it is the same road walked, not a second thing to
  // watch — and it never reaches health.
  assert.match(update, /hero\.rest = advanceRest\(hero\.rest, activeSeconds\)/);
  assert.doesNotMatch(update, /hero\.rest[\s\S]{0,40}?damageHero/);
  // Points wait; they are never taken.
  assert.match(runtime, /if \(!canSpendSkillPoints\(hero\.rest\)\)[\s\S]{0,80}?'needs-sleep'/);
  // Sleeping is possible at full health, or the healthy could never learn.
  assert.match(runtime, /result\.reason === 'nothing-to-heal' \? sleepOnIt\(\) : false/);
  // And the bar is on screen beside hunger.
  assert.match(html, /id="rest-meter"[^>]*data-stage="rested"/);
  assert.match(css, /\.rest-meter\[data-stage='spent'\]/);
});
