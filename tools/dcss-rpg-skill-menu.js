import { attributeCopy } from './dcss-rpg-attributes.js';
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
    language: 'ru',
    title: 'Навыки',
    points: 'Очки навыков',
    learn: 'Изучить',
    upgrade: 'Улучшить',
    mastered: 'Изучено',
    level: (level) => `Нужен уровень ${level}`,
    noPoints: 'Нет очков навыков',
    maxRank: 'Максимальный ранг',
    attribute: (name, value) => `Нужно: ${name} ${value}`,
    bookModified: 'Изменено книгой',
    notPlaying: 'Доступно во время забега',
    needsSleep: 'Сначала выспись: в лагере, дома или на постоялом дворе',
    unavailable: 'Недоступно',
    cancel: 'Отмена',
    cost: 'Стоит 1 очко навыка',
    nextRank: (rank) => `Следующая ступень — ${rank}-я`,
    rankNeeds: (rank, level) => `${rank}-я ступень открывается на ${level} уровне`,
  }),
  en: Object.freeze({
    language: 'en',
    title: 'Skills',
    points: 'Skill points',
    learn: 'Learn',
    upgrade: 'Upgrade',
    mastered: 'Mastered',
    level: (level) => `Requires level ${level}`,
    noPoints: 'No skill points',
    maxRank: 'Maximum rank',
    attribute: (name, value) => `Requires ${name} ${value}`,
    bookModified: 'Modified by a book',
    notPlaying: 'Available during a run',
    needsSleep: 'Sleep on it first: a camp, a bed at home, or an inn',
    unavailable: 'Unavailable',
    cancel: 'Cancel',
    cost: 'Costs 1 skill point',
    nextRank: (rank) => `Next step is rank ${rank}`,
    rankNeeds: (rank, level) => `Rank ${rank} opens at level ${level}`,
  }),
});

function reasonLabel(reason, definition, rank, copy, availability = {}) {
  switch (reason) {
    case 'available': return '';
    case 'level-required': return copy.level(definition.rankLevels[rank]);
    case 'no-points': return copy.noPoints;
    // One line for all three: the skill says which number it wants and how big.
    case 'strength-required':
    case 'agility-required':
    case 'intelligence-required':
      return copy.attribute(
        attributeCopy(copy.language)[availability.requiredAttribute].name,
        availability.requiredValue,
      );
    case 'max-rank': return copy.maxRank;
    case 'not-playing': return copy.notPlaying;
    // Nothing is lost — the points wait until the hero has slept on them.
    case 'needs-sleep': return copy.needsSleep;
    default: return copy.unavailable;
  }
}

/**
 * A school drawn as a straight branch.
 *
 * Ivan asked to see the ranks as a tree and said a straight branch is enough
 * for now. The branch is the honest shape of the rule: ranks are strictly
 * sequential, so the third rank of alchemy cannot exist without the second.
 * Each node says which of the four things it is — already trained, lent by a
 * book, reachable now, or waiting for a higher level — and the view draws it.
 */
function skillBranch({ definition, trainedRank, effectiveRank, heroLevel }) {
  const nodes = [];
  for (let rank = 1; rank <= definition.maxRank; rank += 1) {
    const needs = definition.rankLevels[rank - 1];
    const state = rank <= trainedRank
      ? 'trained'
      : rank <= effectiveRank
        ? 'granted'
        : rank === trainedRank + 1 && heroLevel >= needs
          ? 'open'
          : 'locked';
    nodes.push(Object.freeze({ rank, state, requiredLevel: needs }));
  }
  return Object.freeze(nodes);
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
  attributes = {},
  // Rest gates learning, not survival: an unrested hero keeps every point and
  // can spend none of them. The menu has to say that, or the greyed-out button
  // is a mystery.
  rested = true,
} = {}) {
  if (!validateSkillState(state, heroLevel, attributes?.spent ?? 0)) {
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
        const learned = skillAvailability({
          state,
          heroLevel,
          runStatus,
          skillId: definition.id,
          expectedRank: trainedRank,
          attributes,
          ...readiness,
        });
        const availability = learned.ok && !rested
          ? { ...learned, ok: false, reason: 'needs-sleep' }
          : learned;
        const isMaxRank = rank >= definition.maxRank;
        const canLearn = availability.ok && !isMaxRank;
        const branch = skillBranch({
          definition,
          trainedRank,
          effectiveRank: rank,
          heroLevel,
        });
        const upcoming = branch.find(({ state }) => state === 'open' || state === 'locked') ?? null;
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
          branch,
          // «Что я получу и когда» — the question a point is spent against.
          nextRankNote: upcoming === null
            ? copy.maxRank
            : upcoming.state === 'open'
              ? copy.nextRank(upcoming.rank)
              : copy.rankNeeds(upcoming.rank, upcoming.requiredLevel),
          costLabel: copy.cost,
          cancelLabel: copy.cancel,
          actionLabel: isMaxRank ? copy.mastered : trainedRank === 0 ? copy.learn : copy.upgrade,
          reasonLabel: isMaxRank
            ? copy.maxRank
            : reasonLabel(availability.reason, definition, trainedRank, copy, availability),
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
