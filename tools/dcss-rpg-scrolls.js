/**
 * Arcana is not a stronger spell, it is a second reading of the same page. A
 * scroll a novice fires one way, a scholar can fire another: further, wider,
 * or over the whole floor instead of the room they stand in.
 *
 * Every variant is a complete use effect of its own, so the runtime does not
 * branch on "is this the clever version" — it just uses the effect it is given.
 */

/** The alternative reading of each scroll, and the rank that can see it. */
export const SCROLL_VARIANTS = Object.freeze({
  'blink-scroll': Object.freeze({
    itemId: 'blink-scroll',
    tier: 1,
    effect: Object.freeze({ type: 'blink', range: 8 }),
    labels: Object.freeze({ ru: 'Дальний скачок', en: 'Far blink' }),
  }),
  'insight-scroll': Object.freeze({
    itemId: 'insight-scroll',
    tier: 1,
    effect: Object.freeze({ type: 'insight', radius: 0, whole: true }),
    labels: Object.freeze({ ru: 'Весь этаж', en: 'The whole floor' }),
  }),
  'flame-scroll': Object.freeze({
    itemId: 'flame-scroll',
    tier: 2,
    effect: Object.freeze({ type: 'flame-burst', damage: 11, radius: 3, burnSeconds: 4 }),
    labels: Object.freeze({ ru: 'Кольцо огня', en: 'Ring of fire' }),
  }),
  'frost-scroll': Object.freeze({
    itemId: 'frost-scroll',
    tier: 3,
    effect: Object.freeze({ type: 'frost-bind', duration: 4, radius: 2, freeze: true }),
    labels: Object.freeze({ ru: 'Ледяной плен', en: 'Frozen hold' }),
  }),
});

export const SCROLL_VARIANT_IDS = Object.freeze(Object.keys(SCROLL_VARIANTS));

const EMPTY_PROFILE = Object.freeze({ rank: 0, variantTier: 0 });

function boundedTier(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function arcanaProfile(capabilities = {}) {
  const rank = boundedTier(capabilities.arcanaRank);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({ rank, variantTier: boundedTier(capabilities.scrollVariantTier) });
}

/** The second reading, or null when the hero cannot see one on this page. */
export function scrollVariant(itemId, profile = EMPTY_PROFILE) {
  const variant = SCROLL_VARIANTS[itemId];
  if (!variant) return null;
  return boundedTier(profile?.variantTier) >= variant.tier ? variant : null;
}

export function scrollVariantLabel(itemId, language = 'ru') {
  const variant = SCROLL_VARIANTS[itemId];
  if (!variant) return '';
  return variant.labels[language === 'en' ? 'en' : 'ru'];
}

/** Every scroll the school can reread at this rank, for menus and tests. */
export function knownScrollVariants(profile = EMPTY_PROFILE) {
  return SCROLL_VARIANT_IDS
    .map((itemId) => scrollVariant(itemId, profile))
    .filter((variant) => variant !== null);
}
