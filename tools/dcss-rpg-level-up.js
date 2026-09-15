export const LEVEL_UP_PRESENTATION_MS = 1450;

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function russianSkillPointLabel(value) {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'очков навыка';
  const last = value % 10;
  if (last === 1) return 'очко навыка';
  if (last >= 2 && last <= 4) return 'очка навыка';
  return 'очков навыка';
}

/**
 * One earned level always grants one freely spendable skill point. Keeping this
 * as a pure presentation contract prevents the HUD from inventing progression.
 */
export function levelUpPresentation({
  level,
  levelsGained,
  skillPointsGained,
  language = 'ru',
} = {}) {
  if (levelsGained === 0 && skillPointsGained === 0) return null;
  if (
    !positiveInteger(level)
    || !positiveInteger(levelsGained)
    || skillPointsGained !== levelsGained
    || level < levelsGained + 1
  ) {
    throw new TypeError('Level-up presentation requires one skill point per earned level');
  }
  const locale = language === 'en' ? 'en' : 'ru';
  const pointWord = locale === 'ru'
    ? russianSkillPointLabel(skillPointsGained)
    : skillPointsGained === 1 ? 'skill point' : 'skill points';
  return Object.freeze({
    level: String(level),
    points: `+${skillPointsGained}`,
    announcement: locale === 'ru'
      ? `Новый уровень ${level}. Получено ${skillPointsGained} ${pointWord}.`
      : `Level ${level}. Gained ${skillPointsGained} ${pointWord}.`,
  });
}
