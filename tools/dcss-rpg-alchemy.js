/**
 * Brewing at the fire. Alchemy turns arcane essence into a bottle — the same
 * essence salvaging leaves behind, so a broken magic sword can become a
 * healing draught two floors later.
 *
 * The recipes are ordinary catalogue potions: nothing here invents an item.
 */

import { ESSENCE_ITEM_ID } from './dcss-rpg-crafting.js';

export { ESSENCE_ITEM_ID };

/** What a fire can brew, and the rank that knows the recipe. */
export const ALCHEMY_RECIPES = Object.freeze([
  Object.freeze({
    id: 'mending-potion',
    rank: 1,
    essence: 2,
    labels: Object.freeze({ ru: 'Зелье врачевания', en: 'Mending potion' }),
  }),
  Object.freeze({
    id: 'cleansing-potion',
    rank: 2,
    essence: 3,
    labels: Object.freeze({ ru: 'Зелье очищения', en: 'Cleansing potion' }),
  }),
  Object.freeze({
    id: 'venom-potion',
    rank: 3,
    essence: 3,
    labels: Object.freeze({ ru: 'Ядовитое зелье', en: 'Venom potion' }),
  }),
]);

const EMPTY_ALCHEMY = Object.freeze({ rank: 0, recipes: Object.freeze([]) });

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function alchemyProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.alchemyRank);
  if (rank === 0) return EMPTY_ALCHEMY;
  return Object.freeze({
    rank,
    recipes: Object.freeze(ALCHEMY_RECIPES.filter((recipe) => recipe.rank <= rank)),
  });
}

export function recipeById(id) {
  return ALCHEMY_RECIPES.find((recipe) => recipe.id === id) ?? null;
}

/** Brewing one bottle: the fire, the recipe the rank knows, the essence it costs. */
export function canBrew({ recipeId = '', essence = 0, backpackCount = 0, capacity = 12, profile = EMPTY_ALCHEMY } = {}) {
  const recipe = recipeById(recipeId);
  if (!recipe) return Object.freeze({ ok: false, reason: 'unknown-recipe' });
  if (!profile?.recipes?.includes(recipe)) return Object.freeze({ ok: false, reason: 'rank-required' });
  if (essence < recipe.essence) {
    return Object.freeze({ ok: false, reason: 'no-essence', cost: recipe.essence });
  }
  if (backpackCount >= capacity) return Object.freeze({ ok: false, reason: 'no-room' });
  return Object.freeze({ ok: true, reason: 'ready', cost: recipe.essence, itemId: recipe.id });
}

export function brew(options = {}) {
  const decision = canBrew(options);
  if (!decision.ok) return decision;
  return Object.freeze({
    ...decision,
    reason: 'brewed',
    essence: Math.max(0, (options.essence ?? 0) - decision.cost),
  });
}

/** The first recipe a hero can still afford, for the fire's own panel. */
export function nextBrew({ essence = 0, profile = EMPTY_ALCHEMY } = {}) {
  const affordable = profile.recipes.filter((recipe) => recipe.essence <= essence);
  return affordable.at(-1) ?? profile.recipes.at(-1) ?? null;
}

const COPY = Object.freeze({
  ru: Object.freeze({
    brew: 'Сварить',
    'unknown-recipe': 'Такого рецепта нет',
    'rank-required': 'Нужен навык',
    'no-essence': 'Не хватает эссенции',
    'no-room': 'Рюкзак полон',
    brewed: 'Сварено',
  }),
  en: Object.freeze({
    brew: 'Brew',
    'unknown-recipe': 'No such recipe',
    'rank-required': 'The skill is required',
    'no-essence': 'Not enough essence',
    'no-room': 'The backpack is full',
    brewed: 'Brewed',
  }),
});

export function alchemyCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function alchemyRefusalText(reason, language = 'ru') {
  const table = alchemyCopy(language);
  return typeof table[reason] === 'string' ? table[reason] : '';
}

export function recipeLabel(recipeId, language = 'ru') {
  const recipe = recipeById(recipeId);
  if (!recipe) return '';
  return recipe.labels[language === 'en' ? 'en' : 'ru'];
}
