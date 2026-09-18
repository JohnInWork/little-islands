/**
 * Cooking turns the same raw meat into a real dish. The skill decides what
 * comes off the fire, the dish decides what the hero feels afterwards, and
 * the hero can feel only one dish at a time: a second meal replaces the first
 * instead of stacking with it.
 */

export const RAW_MEAT_ITEM_ID = 'raw-meat';
export const PLAIN_COOKED_ITEM_ID = 'cooked-meat';

/** What each rank takes off the fire, plain meat being the rank-zero case. */
export const COOKING_DISH_BY_RANK = Object.freeze([
  PLAIN_COOKED_ITEM_ID,
  'roast-meat',
  'hearty-stew',
  'feast-platter',
]);

/**
 * A meal is a small, honest bonus with a timer. Attack is flat, speed is a
 * fraction, and both are modest enough that a dish never replaces equipment.
 */
export const MEALS = Object.freeze({
  roast: Object.freeze({
    id: 'roast',
    duration: 120,
    attack: 2,
    moveSpeed: 0,
    icon: 'item/food/meat_ration.png',
    color: '#d8a15c',
    labels: Object.freeze({ ru: 'Жаркое', en: 'Roast' }),
  }),
  stew: Object.freeze({
    id: 'stew',
    duration: 150,
    attack: 2,
    moveSpeed: 0.06,
    icon: 'item/food/bread_ration.png',
    color: '#d9bd7a',
    labels: Object.freeze({ ru: 'Похлёбка', en: 'Stew' }),
  }),
  feast: Object.freeze({
    id: 'feast',
    duration: 180,
    attack: 3,
    moveSpeed: 0.1,
    icon: 'item/food/pizza.png',
    color: '#e6cf8f',
    labels: Object.freeze({ ru: 'Пир', en: 'Feast' }),
  }),
});

export const MEAL_IDS = Object.freeze(Object.keys(MEALS));
export const MAX_MEAL_DURATION = 600;

const EMPTY_PROFILE = Object.freeze({ rank: 0, dishId: PLAIN_COOKED_ITEM_ID });

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function cookingProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.cookingRank);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({ rank, dishId: COOKING_DISH_BY_RANK[rank] });
}

/** What a fire turns raw meat into for this hero. */
export function cookedItemId(profile = EMPTY_PROFILE) {
  return profile?.dishId ?? PLAIN_COOKED_ITEM_ID;
}

export function mealById(id) {
  return MEALS[id] ?? null;
}

export function createMealState(source = null) {
  const meal = mealById(source?.id);
  if (!meal) return null;
  const remaining = Number.isFinite(source?.remaining) ? source.remaining : 0;
  if (remaining <= 0) return null;
  return { id: meal.id, remaining: Math.min(MAX_MEAL_DURATION, remaining) };
}

export function validateMealState(meal) {
  if (meal === null || meal === undefined) return true;
  if (typeof meal !== 'object' || Array.isArray(meal)) return false;
  if (Object.keys(meal).sort().join(',') !== 'id,remaining') return false;
  if (!MEAL_IDS.includes(meal.id)) return false;
  return Number.isFinite(meal.remaining) && meal.remaining > 0 && meal.remaining <= MAX_MEAL_DURATION;
}

/** Eating starts the dish over, whatever the hero was still digesting. */
export function startMeal(id) {
  const meal = mealById(id);
  return meal ? { id: meal.id, remaining: meal.duration } : null;
}

export function tickMeal(meal, delta) {
  if (!Number.isFinite(delta) || delta < 0 || delta > 1) {
    throw new TypeError('A meal ticks with a delta between zero and one second');
  }
  const current = createMealState(meal);
  if (!current) return Object.freeze({ meal: null, expired: false });
  const remaining = current.remaining - delta;
  if (remaining <= 0) return Object.freeze({ meal: null, expired: true });
  return Object.freeze({ meal: { id: current.id, remaining }, expired: false });
}

const NO_MODIFIERS = Object.freeze({ attack: 0, moveSpeed: 0 });

export function mealStatModifiers(meal) {
  const current = createMealState(meal);
  if (!current) return NO_MODIFIERS;
  const definition = MEALS[current.id];
  return Object.freeze({ attack: definition.attack, moveSpeed: definition.moveSpeed });
}

/** What the HUD shows: the dish, its colour and how long it still helps. */
export function activeMeal(meal, language = 'ru') {
  const current = createMealState(meal);
  if (!current) return null;
  const definition = MEALS[current.id];
  return Object.freeze({
    ...definition,
    remaining: current.remaining,
    label: definition.labels[language === 'en' ? 'en' : 'ru'],
  });
}
