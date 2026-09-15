import { SKILL_CATEGORIES, SKILL_CATALOG } from './dcss-rpg-skill-content.js';
import {
  SKILL_IMPLEMENTATIONS,
  SKILL_SYSTEMS,
  effectiveSkillRank,
  isSkillReady,
  skillAvailability,
  validateSkillRankAdjustments,
  validateSkillState,
} from './dcss-rpg-skills.js';

const COPY = Object.freeze({
  ru: Object.freeze({
    title: 'Навыки',
    points: 'Очки навыков',
    learn: 'Изучить',
    upgrade: 'Улучшить',
    mastered: 'Изучено',
    level: (level) => `Нужен уровень ${level}`,
    noPoints: 'Нет очков навыков',
    maxRank: 'Максимальный ранг',
    bookModified: 'Изменено книгой',
    notPlaying: 'Доступно во время забега',
    unavailable: 'Недоступно',
  }),
  en: Object.freeze({
    title: 'Skills',
    points: 'Skill points',
    learn: 'Learn',
    upgrade: 'Upgrade',
    mastered: 'Mastered',
    level: (level) => `Requires level ${level}`,
    noPoints: 'No skill points',
    maxRank: 'Maximum rank',
    bookModified: 'Modified by a book',
    notPlaying: 'Available during a run',
    unavailable: 'Unavailable',
  }),
});

function reasonLabel(reason, definition, rank, copy) {
  switch (reason) {
    case 'available': return '';
    case 'level-required': return copy.level(definition.rankLevels[rank]);
    case 'no-points': return copy.noPoints;
    case 'max-rank': return copy.maxRank;
    case 'not-playing': return copy.notPlaying;
    default: return copy.unavailable;
  }
}

/**
 * The view uses the same availability decision as learning. Missing gameplay
 * implementations are omitted entirely, even when a save retains their ranks.
 * The caller hides this section when visible is false.
 */
export function skillMenuModel({
  state,
  heroLevel,
  runStatus,
  language = 'ru',
  implementations = SKILL_IMPLEMENTATIONS,
  systems = SKILL_SYSTEMS,
  rankAdjustments = {},
} = {}) {
  if (!validateSkillState(state, heroLevel)) {
    throw new TypeError('Skill menu requires valid skill state matching the hero level');
  }
  if (!validateSkillRankAdjustments(rankAdjustments)) {
    throw new TypeError('Skill menu requires valid book rank adjustments');
  }
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = COPY[locale];
  const readiness = { implementations, systems };
  const groups = [];
  for (const category of SKILL_CATEGORIES) {
    const skills = SKILL_CATALOG
      .filter((definition) => definition.category === category.id
        && isSkillReady(definition.id, readiness))
      .map((definition) => {
        const trainedRank = state.ranks[definition.id] ?? 0;
        const rankAdjustment = rankAdjustments[definition.id] ?? 0;
        const rank = effectiveSkillRank(state, definition.id, rankAdjustments);
        const availability = skillAvailability({
          state,
          heroLevel,
          runStatus,
          skillId: definition.id,
          expectedRank: trainedRank,
          ...readiness,
        });
        const isMaxRank = rank >= definition.maxRank;
        const canLearn = availability.ok && !isMaxRank;
        return Object.freeze({
          id: definition.id,
          name: definition.name[locale],
          description: definition.description[locale],
          rank,
          trainedRank,
          rankAdjustment,
          rankAdjustmentLabel: rankAdjustment === 0
            ? ''
            : `${rankAdjustment > 0 ? '+' : '−'}${Math.abs(rankAdjustment)} · ${copy.bookModified}`,
          maxRank: definition.maxRank,
          nextRank: isMaxRank ? null : rank + 1,
          canLearn,
          actionLabel: isMaxRank ? copy.mastered : trainedRank === 0 ? copy.learn : copy.upgrade,
          reasonLabel: isMaxRank
            ? copy.maxRank
            : reasonLabel(availability.reason, definition, trainedRank, copy),
        });
      });
    if (skills.length > 0) {
      groups.push(Object.freeze({
        id: category.id,
        label: category.name[locale],
        skills: Object.freeze(skills),
      }));
    }
  }
  return Object.freeze({
    visible: groups.length > 0,
    title: copy.title,
    pointsLabel: copy.points,
    points: state.points,
    groups: Object.freeze(groups),
  });
}
