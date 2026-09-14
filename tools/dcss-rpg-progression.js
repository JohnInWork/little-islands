import { HERO_LEVEL_HP_GAIN, deriveHeroStats } from './dcss-rpg-rules.js';
import { cloneSkillState, grantSkillPoints, validateSkillState } from './dcss-rpg-skills.js';

export const MAX_HERO_LEVEL = 999;

export function experienceToNextLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > MAX_HERO_LEVEL) {
    throw new RangeError('Invalid hero level');
  }
  return level * 18;
}

// Awards are applied by the already guarded defeat action, never by rendering
// the level-up animation. State is replaced once even when several levels accrue.
export function awardHeroExperience({ hero, amount, equipment, items }) {
  if (!hero || !validateSkillState(hero.skills, hero.level)) throw new Error('Invalid hero skill progression');
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) throw new RangeError('Invalid experience award');
  if (!Number.isFinite(hero.xp) || hero.xp < 0 || !Number.isFinite(hero.hp) || hero.hp <= 0) {
    throw new Error('Experience requires a living hero with valid XP');
  }
  const next = { ...hero, skills: cloneSkillState(hero.skills), xp: hero.xp + amount };
  while (next.level < MAX_HERO_LEVEL && next.xp >= experienceToNextLevel(next.level)) {
    next.xp -= experienceToNextLevel(next.level);
    next.level += 1;
    next.power += 1;
    next.maxHp += HERO_LEVEL_HP_GAIN;
    next.hp = Math.min(deriveHeroStats(next, equipment, items).maxHp, next.hp + HERO_LEVEL_HP_GAIN);
  }
  if (next.level === MAX_HERO_LEVEL) next.xp = Math.min(next.xp, experienceToNextLevel(next.level) - 1);
  next.skills = grantSkillPoints(hero.skills, hero.level, next.level);
  const levelsGained = next.level - hero.level;
  return { hero: next, levelsGained, skillPointsGained: next.skills.points - hero.skills.points };
}
