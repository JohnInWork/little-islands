/**
 * Разбор: что герой ломает, то и превращается в золото.
 *
 * Рядом жила целая экономика: лом оставлял «аркановую эссенцию», а её тратили
 * зачарование, алхимия и обе кузни. Все трое ушли — по очереди и каждый по
 * своей причине, — и эссенцию стало некому тратить. Иван: «раз нам ни для
 * чего они не нужны, давай пока их просто уберём». Вместе с ней ушёл и второй
 * ранг разбора как порог: теперь навык делает одно и с первого ранга.
 */

/** Разбор: больше золота за тот же лом. */
export const SALVAGE_BONUS_PERCENT = Object.freeze([0, 50, 75, 100]);

const EMPTY_SALVAGE = Object.freeze({ rank: 0, bonusPercent: 0 });

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
  return Object.freeze({ rank, bonusPercent: SALVAGE_BONUS_PERCENT[rank] });
}

/**
 * What a pile of scrap is worth to this hero: the gold the rules already gave,
 * raised by the school.
 */
export function salvageYield({ reward = 0, profile = EMPTY_SALVAGE } = {}) {
  const base = Math.max(0, Math.round(reward));
  const gold = base + Math.round((base * (profile?.bonusPercent ?? 0)) / 100);
  return Object.freeze({ gold, bonus: gold - base });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    salvage: (gold) => `+${gold} {gold}`,
  }),
  en: Object.freeze({
    salvage: (gold) => `+${gold} {gold}`,
  }),
});

export function craftingCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function craftingRefusalText(reason, language = 'ru') {
  const table = craftingCopy(language);
  return typeof table[reason] === 'string' ? table[reason] : '';
}
