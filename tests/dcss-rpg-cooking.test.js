import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  COOKING_DISH_BY_RANK,
  MAX_MEAL_DURATION,
  MEALS,
  activeMeal,
  cookedItemId,
  cookingProfile,
  createMealState,
  mealStatModifiers,
  startMeal,
  tickMeal,
  validateMealState,
} from '../tools/dcss-rpg-cooking.js';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { itemDetails } from '../tools/dcss-rpg-item-details.js';
import { createGameCommand } from '../tools/dcss-rpg-game-commands.js';
import { SURVIVAL_COMMANDS, cookMeat } from '../tools/dcss-rpg-survival.js';
import { deriveHeroStats } from '../tools/dcss-rpg-rules.js';
import {
  SAVE_VERSION,
  createRun,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import {
  SKILL_CAPABILITY_LIMITS,
  SKILL_SYSTEMS,
  createSkillState,
  deriveSkillCapabilities,
  isSkillReady,
  learnSkill,
} from '../tools/dcss-rpg-skills.js';

const capabilitiesAt = (rank) => {
  let state = createSkillState(8);
  for (let step = 0; step < rank; step += 1) {
    state = learnSkill({
      state, heroLevel: 8, runStatus: 'playing', skillId: 'cooking', expectedRank: step,
    }).state;
  }
  return deriveSkillCapabilities(state);
};

test('the cook decides what comes off the fire', () => {
  assert.equal(cookedItemId(cookingProfile({})), 'cooked-meat', 'no skill still feeds the hero');
  assert.equal(cookedItemId(cookingProfile(capabilitiesAt(1))), 'roast-meat');
  assert.equal(cookedItemId(cookingProfile(capabilitiesAt(2))), 'hearty-stew');
  assert.equal(cookedItemId(cookingProfile(capabilitiesAt(3))), 'feast-platter');
  assert.deepEqual([...COOKING_DISH_BY_RANK], ['cooked-meat', 'roast-meat', 'hearty-stew', 'feast-platter']);

  const command = createGameCommand({
    streamId: 'test', sequence: 1, type: SURVIVAL_COMMANDS.cook, targetId: 'fire-1', payload: { amount: 2 },
  });
  const cooked = cookMeat({
    command,
    siteId: 'fire-1',
    items: [{ id: 'raw-meat', uid: 'meat-1', stack: 2 }],
    inventory: ['meat-1'],
    amount: 2,
    outputId: 'hearty-stew',
    outputUid: 'stew-1',
  });
  assert.equal(cooked.ok, true, cooked.reason);
  assert.equal(cooked.state.items.find(({ uid }) => uid === 'stew-1').id, 'hearty-stew');
  assert.equal(cooked.events[0].payload.itemId, 'hearty-stew');
});

test('one dish at a time, and it runs out', () => {
  assert.equal(createMealState(null), null);
  assert.equal(createMealState({ id: 'nope', remaining: 10 }), null);
  assert.equal(createMealState({ id: 'roast', remaining: 0 }), null);

  const roast = startMeal('roast');
  assert.deepEqual(roast, { id: 'roast', remaining: MEALS.roast.duration });
  assert.equal(validateMealState(roast), true);
  assert.equal(validateMealState(null), true, 'an empty stomach is valid');
  assert.equal(validateMealState({ id: 'roast' }), false);
  assert.equal(validateMealState({ id: 'roast', remaining: MAX_MEAL_DURATION + 1 }), false);

  const halfway = tickMeal({ id: 'roast', remaining: 2 }, 0.5);
  assert.equal(halfway.meal.remaining, 1.5);
  assert.equal(halfway.expired, false);
  const done = tickMeal({ id: 'roast', remaining: 0.4 }, 0.5);
  assert.equal(done.meal, null);
  assert.equal(done.expired, true);
  assert.throws(() => tickMeal(roast, 4), TypeError);

  const feast = startMeal('feast');
  assert.deepEqual(mealStatModifiers(feast), { attack: MEALS.feast.attack, moveSpeed: MEALS.feast.moveSpeed });
  assert.deepEqual(mealStatModifiers(null), { attack: 0, moveSpeed: 0 });
  assert.equal(activeMeal(feast, 'ru').label, 'Пир');
  assert.equal(activeMeal(feast, 'en').label, 'Feast');
  assert.equal(activeMeal(null), null);
});

test('a dish makes the hero measurably stronger while it lasts', () => {
  const hero = {
    power: 1, maxHp: 60, hunger: 3000, intelligence: 3, skills: null, meal: null,
  };
  const equipment = {};
  const plain = deriveHeroStats(hero, equipment, []);
  const fed = deriveHeroStats({ ...hero, meal: startMeal('feast') }, equipment, []);
  assert.equal(fed.attack - plain.attack, MEALS.feast.attack, 'the dish adds its attack');
  assert.ok(fed.moveSpeed > plain.moveSpeed, 'and a little speed');
  const afterwards = deriveHeroStats({ ...hero, meal: null }, equipment, []);
  assert.deepEqual(afterwards, plain, 'and takes it all back when it ends');
});

test('dishes are real items only a fire produces', () => {
  for (const id of ['roast-meat', 'hearty-stew', 'feast-platter']) {
    const dish = lootById(id);
    assert.ok(dish, `${id} is in the catalog`);
    assert.equal(dish.kind, 'food');
    assert.equal(dish.randomDrop, false, 'a dish is cooked, never found');
    assert.equal(dish.merchantStock, false, 'and never bought');
    assert.ok(MEALS[dish.useEffect.mealId], `${id} carries a known meal`);
  }
  assert.equal(LOOT_CATALOG.filter(({ kind }) => kind === 'food').length >= 4, true);
  assert.equal(itemDetails(lootById('feast-platter'), 'ru').name, 'Пир');
  assert.match(itemDetails(lootById('roast-meat'), 'ru').description, /Блюдо «Жаркое»/);
  assert.match(itemDetails(lootById('roast-meat'), 'en').description, /Dish “Roast”/);
});

test('save v47 keeps the dish on the hero', () => {
  const run = createRun(4001);
  assert.equal(SAVE_VERSION, 47);
  assert.equal(run.hero.meal, null);
  assert.equal(validateRun(run), true);
  run.hero.meal = startMeal('stew');
  assert.equal(validateRun(run), true);
  run.hero.meal = { id: 'stew', remaining: -1 };
  assert.equal(validateRun(run), false, 'a finished dish is not a state');

  const legacy = structuredClone(createRun(4002));
  legacy.version = 39;
  delete legacy.hero.meal;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, 47);
  assert.equal(migrated.hero.meal, null);
  assert.equal(validateRun(migrated), true);
});

test('Cooking is a ready skill wired into the fire and the bag', async () => {
  assert.ok(SKILL_SYSTEMS.includes('cooking-recipes'));
  assert.ok(SKILL_SYSTEMS.includes('food-buffs'));
  assert.equal(isSkillReady('cooking'), true);
  assert.deepEqual(SKILL_CAPABILITY_LIMITS.cookingRank, [0, 3]);

  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /const outputId = cookedItemId\(cookingProfile\(currentSkillCapabilities\(\)\)\);/);
  assert.match(runtime, /const meal = startMeal\(effect\.mealId\);/);
  assert.match(runtime, /function updateHeroMeal\(delta\)[\s\S]*tickMeal\(hero\.meal/);
  assert.match(runtime, /meal: createMealState\(hero\.meal\),/, 'the save carries the dish');
});
