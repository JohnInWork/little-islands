/**
 * The first honest crafting loop: what the hero breaks down feeds what the
 * hero improves. Salvaging turns unwanted gear into gold and essence,
 * Enchanting spends that essence to put a real affix on a kept item.
 *
 * Both sides are arithmetic over things that already exist — the salvage
 * reward, the affix catalogue — so nothing here invents a second economy.
 */

export const ESSENCE_ITEM_ID = 'arcane-essence';

/** Salvaging: more gold for the same scrap, and essence out of what held magic. */
export const SALVAGE_BONUS_PERCENT = Object.freeze([0, 50, 75, 100]);
/**
 * How much essence one enchanted piece leaves. Plain iron leaves none at any
 * rank: the crystal comes out of the magic, not out of the metal.
 */
export const SALVAGE_ESSENCE_PER_PIECE = Object.freeze([0, 0, 1, 2]);

const EMPTY_SALVAGE = Object.freeze({ rank: 0, bonusPercent: 0, essencePerPiece: 0 });

/** A piece holds magic when something was put on it — an affix or a power. */
export function isMagicalPiece(item) {
  if (!item?.slot) return false;
  return Boolean(item.artifactPowerId) || (item.affixIds?.length ?? 0) > 0;
}

/** Enchanting: how many affixes a hand can hold, and what the work costs. */
export const ENCHANT_MAX_AFFIXES = Object.freeze([0, 1, 2, 2]);
export const ENCHANT_ESSENCE_COST = Object.freeze([0, 2, 3, 2]);

const EMPTY_ENCHANT = Object.freeze({ rank: 0, maxAffixes: 0, essenceCost: 0 });

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function salvageProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.salvagingRank);
  if (rank === 0) return EMPTY_SALVAGE;
  return Object.freeze({
    rank,
    bonusPercent: SALVAGE_BONUS_PERCENT[rank],
    essencePerPiece: SALVAGE_ESSENCE_PER_PIECE[rank],
  });
}

export function enchantProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.enchantingRank);
  if (rank === 0) return EMPTY_ENCHANT;
  return Object.freeze({
    rank,
    maxAffixes: ENCHANT_MAX_AFFIXES[rank],
    essenceCost: ENCHANT_ESSENCE_COST[rank],
  });
}

/**
 * What a pile of scrap is worth to this hero: the gold the rules already gave,
 * raised by the school, plus one essence for every piece worth the name.
 */
export function salvageYield({ reward = 0, items = [], profile = EMPTY_SALVAGE } = {}) {
  const base = Math.max(0, Math.round(reward));
  const gold = base + Math.round((base * (profile?.bonusPercent ?? 0)) / 100);
  const magical = items.filter(isMagicalPiece).length;
  return Object.freeze({
    gold,
    essence: magical * (profile?.essencePerPiece ?? 0),
    bonus: gold - base,
  });
}

/**
 * Whether this item can take another affix, and what it would cost. The list of
 * legal affixes comes from the affix module; this only counts and prices.
 */
export function canEnchant({
  item = null,
  affixIds = [],
  essence = 0,
  candidates = [],
  profile = EMPTY_ENCHANT,
} = {}) {
  if (profile?.rank === 0) return Object.freeze({ ok: false, reason: 'rank-required' });
  if (!item?.slot) return Object.freeze({ ok: false, reason: 'not-equipment' });
  if (item.artifactPowerId) return Object.freeze({ ok: false, reason: 'artifact' });
  if (affixIds.length >= profile.maxAffixes) return Object.freeze({ ok: false, reason: 'no-room' });
  if (candidates.length === 0) return Object.freeze({ ok: false, reason: 'no-affix' });
  if (essence < profile.essenceCost) {
    return Object.freeze({ ok: false, reason: 'no-essence', cost: profile.essenceCost });
  }
  return Object.freeze({ ok: true, reason: 'ready', cost: profile.essenceCost });
}

/**
 * The work itself. The chosen affix is picked by a seeded stream, so the same
 * item enchanted in the same run always takes the same turn — reloading the
 * save cannot reroll it.
 */
export function enchantItem({
  item = null,
  affixIds = [],
  essence = 0,
  candidates = [],
  profile = EMPTY_ENCHANT,
  seed = 0,
} = {}) {
  const decision = canEnchant({ item, affixIds, essence, candidates, profile });
  if (!decision.ok) return decision;
  const index = Math.abs(Math.trunc(seed)) % candidates.length;
  const affixId = candidates[index];
  return Object.freeze({
    ok: true,
    reason: 'enchanted',
    affixId,
    cost: decision.cost,
    essence: essence - decision.cost,
    affixIds: Object.freeze([...affixIds, affixId]),
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    'rank-required': 'Нужно «Зачарование»',
    'not-equipment': 'Зачаровывают только снаряжение',
    artifact: 'Артефакт не принимает чужую руку',
    'no-room': 'На предмете больше нет места',
    'no-affix': 'Нечего наложить на этот предмет',
    'no-essence': 'Не хватает эссенции',
    enchanted: 'Зачаровано',
    enchant: (cost) => `Зачаровать · ${cost} ◈`,
    salvage: (gold, essence) => (essence > 0 ? `+${gold} · эссенция ×${essence}` : `+${gold}`),
  }),
  en: Object.freeze({
    'rank-required': 'Enchanting is required',
    'not-equipment': 'Only gear can be enchanted',
    artifact: 'An artifact takes no other hand',
    'no-room': 'The piece has no room left',
    'no-affix': 'Nothing left to put on this piece',
    'no-essence': 'Not enough essence',
    enchanted: 'Enchanted',
    enchant: (cost) => `Enchant · ${cost} ◈`,
    salvage: (gold, essence) => (essence > 0 ? `+${gold} · essence ×${essence}` : `+${gold}`),
  }),
});

export function craftingCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function craftingRefusalText(reason, language = 'ru') {
  const table = craftingCopy(language);
  return typeof table[reason] === 'string' ? table[reason] : '';
}
