import { SKILL_CATALOG, skillById } from './dcss-rpg-skill-content.js';
import {
  effectiveSkillRank,
  isSkillReady,
  validateSkillRankAdjustments,
  validateSkillState,
} from './dcss-rpg-skills.js';
import {
  commandAccepted,
  commandRejected,
  gameEvent,
} from './dcss-rpg-game-commands.js';
import { learnSpell, spellById, validateSpellState } from './dcss-rpg-spells.js';

export const BOOK_STUDY_VERSION = 1;
export const READ_BOOK_COMMAND = 'read-book';

const BOOK_EFFECT_TYPES = Object.freeze(['study', 'forget', 'blank', 'learn-spell']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

export function validateBookStudy(study) {
  return exactKeys(study, ['version', 'rankAdjustments'])
    && study.version === BOOK_STUDY_VERSION
    && validateSkillRankAdjustments(study.rankAdjustments);
}

export function createBookStudy(source = {}) {
  const study = {
    version: BOOK_STUDY_VERSION,
    rankAdjustments: Object.fromEntries(
      Object.entries(source?.rankAdjustments ?? {}).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
  if (!validateBookStudy(study)) throw new TypeError('Invalid book study state');
  return Object.freeze({
    version: study.version,
    rankAdjustments: Object.freeze(study.rankAdjustments),
  });
}

export function bookOutcome(item) {
  if (item?.identification?.group !== 'book' || !isRecord(item.bookEffect)) return null;
  if (!BOOK_EFFECT_TYPES.includes(item.bookEffect.type)) {
    throw new Error(`Invalid book effect for ${item.id}`);
  }
  if (item.bookEffect.type === 'learn-spell') {
    if (!exactKeys(item.bookEffect, ['type', 'spellId']) || !spellById(item.bookEffect.spellId)) {
      throw new Error(`Invalid spell book effect for ${item.id}`);
    }
    return Object.freeze({ type: item.bookEffect.type, spellId: item.bookEffect.spellId });
  }
  if (!exactKeys(item.bookEffect, ['type'])) throw new Error(`Invalid book effect for ${item.id}`);
  return Object.freeze({ type: item.bookEffect.type });
}

function stableIndex(commandId, itemId, length) {
  let hash = 0x811c9dc5;
  for (const char of `${commandId}:${itemId}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % length;
}

function eligibleSkills({ skills, heroLevel, rankAdjustments, direction, attributes = {} }) {
  return SKILL_CATALOG
    .filter((definition) => isSkillReady(definition.id))
    .filter((definition) => {
      const rank = effectiveSkillRank(skills, definition.id, rankAdjustments);
      if (direction < 0) return rank > 0;
      if (rank >= definition.maxRank) return false;
      const intelligenceRequired = definition.attributeRequirements?.intelligence?.[rank];
      return !Number.isFinite(intelligenceRequired)
        || (attributes.intelligence ?? 0) >= intelligenceRequired;
    })
    .map(({ id }) => id)
    .sort();
}

function adjustedStudy(study, skillId, direction) {
  const rankAdjustments = { ...study.rankAdjustments };
  const next = (rankAdjustments[skillId] ?? 0) + direction;
  if (next === 0) delete rankAdjustments[skillId];
  else rankAdjustments[skillId] = next;
  return createBookStudy({ rankAdjustments });
}

/**
 * Books modify the effective rank for this run without touching earned points
 * or trained ranks. This keeps the level-up economy conserved and makes both a
 * blessing and amnesia reversible by a later book.
 */
export function readSkillBook({ command, item, study, skills, heroLevel, attributes = {} } = {}) {
  if (
    command?.type !== READ_BOOK_COMMAND
    || command.actorId !== 'hero'
    || command.targetId !== item?.uid
  ) return commandRejected(command, 'invalid-target');
  if (!validateBookStudy(study) || !validateSkillState(skills, heroLevel)) {
    return commandRejected(command, 'invalid-state');
  }
  const outcome = bookOutcome(item);
  if (!outcome) return commandRejected(command, 'not-a-book');
  if (outcome.type === 'learn-spell') return commandRejected(command, 'not-a-skill-book');

  const events = [gameEvent(command, 0, 'book-read', {
    itemId: item.id,
    outcome: outcome.type,
  })];
  if (outcome.type === 'blank') {
    events.push(gameEvent(command, 1, 'book-was-blank', { itemId: item.id }));
    return commandAccepted(command, { study }, events);
  }

  const direction = outcome.type === 'study' ? 1 : -1;
  const candidates = eligibleSkills({
    skills,
    heroLevel,
    rankAdjustments: study.rankAdjustments,
    direction,
    attributes,
  });
  if (candidates.length === 0) {
    events.push(gameEvent(command, 1, 'book-had-no-effect', { itemId: item.id }));
    return commandAccepted(command, { study }, events);
  }

  const skillId = candidates[stableIndex(command.id, item.id, candidates.length)];
  const previousRank = effectiveSkillRank(skills, skillId, study.rankAdjustments);
  const nextStudy = adjustedStudy(study, skillId, direction);
  const rank = effectiveSkillRank(skills, skillId, nextStudy.rankAdjustments);
  if (!skillById(skillId) || rank === previousRank) {
    return commandRejected(command, 'invalid-adjustment');
  }
  events.push(gameEvent(command, 1, 'skill-rank-adjusted', {
    skillId,
    previousRank,
    rank,
    direction,
  }));
  return commandAccepted(command, { study: nextStudy }, events);
}

export function readSpellBook({ command, item, spells, intelligence } = {}) {
  if (
    command?.type !== READ_BOOK_COMMAND
    || command.actorId !== 'hero'
    || command.targetId !== item?.uid
  ) return commandRejected(command, 'invalid-target');
  if (!validateSpellState(spells) || !Number.isFinite(intelligence)) {
    return commandRejected(command, 'invalid-state');
  }
  const outcome = bookOutcome(item);
  if (!outcome) return commandRejected(command, 'not-a-book');
  if (outcome.type !== 'learn-spell') return commandRejected(command, 'not-a-spell-book');
  const learned = learnSpell(spells, outcome.spellId, intelligence);
  if (!learned.ok) {
    return commandRejected(command, learned.reason);
  }
  return commandAccepted(command, { spells: learned.state }, [
    gameEvent(command, 0, 'book-read', { itemId: item.id, outcome: outcome.type }),
    gameEvent(command, 1, 'spell-learned', { spellId: outcome.spellId }),
  ]);
}
