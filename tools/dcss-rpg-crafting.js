/**
 * Что герой ломает, то и кормит кузню: разбор превращает ненужное снаряжение в
 * золото и эссенцию, а эссенцию тратит перековка.
 *
 * Зачарование жило здесь же и вешало аффикс на вещь за ту же эссенцию. Иван:
 * «зачарование точно убираем». Аффиксы никуда не делись — их по-прежнему
 * приносит сама добыча, — но выбрать их рукой больше нельзя.
 *
 * Всё здесь — арифметика над тем, что уже есть: награда за лом и каталог
 * аффиксов. Второй экономики модуль не выдумывает.
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

const COPY = Object.freeze({
  ru: Object.freeze({
    'no-essence': 'Не хватает эссенции',
    salvage: (gold, essence) => (essence > 0 ? `+${gold} · эссенция ×${essence}` : `+${gold}`),
  }),
  en: Object.freeze({
    'no-essence': 'Not enough essence',
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
