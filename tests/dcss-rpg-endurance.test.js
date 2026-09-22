import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ENDURANCE_DURATION_PERCENT,
  ENDURANCE_MINIMUM_DURATION,
  enduranceProfile,
  enduredDuration,
} from '../tools/dcss-rpg-endurance.js';
import {
  SKILL_CAPABILITY_LIMITS,
  SKILL_SYSTEMS,
  createSkillState,
  deriveSkillCapabilities,
  isSkillReady,
  learnSkill,
} from '../tools/dcss-rpg-skills.js';
import { MAX_EFFECT_DURATION } from '../tools/dcss-rpg-effects.js';

const withRank = (rank) => {
  let state = createSkillState(8);
  for (let step = 0; step < rank; step += 1) {
    state = learnSkill({ state, heroLevel: 8, runStatus: 'playing', skillId: 'endurance', expectedRank: step, attributes: { strength: 40, agility: 40, intelligence: 40 } }).state;
  }
  return deriveSkillCapabilities(state);
};

test('«Очищение» сокращает состояние, но никогда не снимает его вовсе', () => {
  assert.equal(enduranceProfile({}).rank, 0);
  assert.equal(enduredDuration(10, enduranceProfile({})), 10, 'no skill changes nothing');

  const ranks = [1, 2, 3].map((rank) => enduranceProfile({ cleansingRank: rank }));
  assert.deepEqual(ranks.map(({ durationPercent }) => durationPercent), ENDURANCE_DURATION_PERCENT.slice(1));
  assert.equal(enduredDuration(10, ranks[0]), 8);
  assert.equal(enduredDuration(10, ranks[1]), 6.5);
  assert.equal(enduredDuration(10, ranks[2]), 5);

  assert.equal(enduredDuration(1.2, ranks[2]), ENDURANCE_MINIMUM_DURATION, 'suffering is shortened, not erased');
  assert.equal(enduredDuration(0.4, ranks[2]), 0.4, 'a state briefer than the floor is left alone');
  assert.equal(enduredDuration(0, ranks[2]), 0);
  assert.equal(enduredDuration(Number.NaN, ranks[2]), 0);
  assert.ok(enduredDuration(MAX_EFFECT_DURATION, ranks[2]) <= MAX_EFFECT_DURATION);
});

/**
 * «Выносливость» влилась в «Очищение»: оба навыка были про состояния, только
 * с разных концов — один снимал, другой сокращал. Отдельно сокращение никто
 * не замечал: минус двадцать процентов к длительности в бою не видно.
 */
test('сокращение состояний живёт в «Очищении», а «Выносливости» больше нет', async () => {
  const { skillById } = await import('../tools/dcss-rpg-skill-content.js');
  const { SKILL_IMPLEMENTATIONS, SKILL_SYSTEMS } = await import('../tools/dcss-rpg-skills.js');
  assert.equal(skillById('endurance'), null, 'навык всё ещё в каталоге');
  assert.equal(SKILL_IMPLEMENTATIONS.endurance, undefined, 'реализация всё ещё на месте');
  const cleansing = skillById('cleansing');
  assert.ok(cleansing.requiresSystems.includes('condition-duration-scaling'), 'система осталась без навыка');
  assert.ok(cleansing.requiresSystems.includes('cleansing-ritual'));
  for (const system of cleansing.requiresSystems) {
    assert.ok(SKILL_SYSTEMS.includes(system), system);
  }
  // Ранг очищения теперь работает обоими способами сразу.
  assert.ok(enduranceProfile({ cleansingRank: 3 }).durationPercent > 0);
  assert.equal(enduranceProfile({ cleansingRank: 0 }).durationPercent, 0);
});


test('only the hero endures; a monster suffers the full duration', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(
    runtime,
    /function applyHeroStatus\(id, duration\)[\s\S]*const endured = enduredDuration\(duration, enduranceProfile\(currentSkillCapabilities\(\)\)\);[\s\S]*applyWardedEffect\(hero\.effects, id, endured/,
  );
  assert.match(
    runtime,
    /other\.effects = applyActorEffect\(other\.effects, id, duration\)\.effects;/,
    'the monster branch keeps the raw duration',
  );
});
