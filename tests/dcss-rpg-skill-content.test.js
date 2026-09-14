import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKILL_CATEGORIES,
  SKILL_CATALOG,
  skillById,
} from '../tools/dcss-rpg-skill-content.js';

test('skill catalog has 40 unique stable IDs and resolves its six categories', () => {
  assert.equal(SKILL_CATEGORIES.length, 6);
  assert.equal(SKILL_CATALOG.length, 40);
  const categories = new Set(SKILL_CATEGORIES.map(({ id }) => id));
  const ids = new Set(SKILL_CATALOG.map(({ id }) => id));
  assert.equal(categories.size, 6);
  assert.equal(ids.size, 40);
  for (const skill of SKILL_CATALOG) {
    assert.match(skill.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(categories.has(skill.category), `Unknown category of ${skill.id}`);
    assert.equal(skillById(skill.id), skill);
  }
  assert.equal(skillById('future-skill'), null);
  assert.equal(skillById('toString'), null);
  assert.equal(skillById(null), null);
});

test('every specialization has RU/EN explanations and three level-gated ranks', () => {
  for (const category of SKILL_CATEGORIES) {
    assert.ok(category.name.ru.trim());
    assert.ok(category.name.en.trim());
  }
  for (const skill of SKILL_CATALOG) {
    for (const field of ['name', 'description']) {
      assert.match(skill[field].ru, /[А-Яа-яЁё]/u, `${skill.id}.${field}.ru`);
      assert.match(skill[field].en, /[A-Za-z]/, `${skill.id}.${field}.en`);
    }
    assert.ok(['passive', 'contextual'].includes(skill.mode));
    assert.equal(skill.maxRank, 3);
    assert.deepEqual(skill.rankLevels, [2, 4, 6]);
    assert.ok(skill.rankLevels.every((level, i, levels) =>
      Number.isInteger(level) && level >= 2 && (i === 0 || level > levels[i - 1])));
  }
});

test('future skill availability requires explicit runtime system support', () => {
  for (const skill of SKILL_CATALOG) {
    assert.ok(skill.requiresSystems.length > 0, skill.id);
    assert.equal(new Set(skill.requiresSystems).size, skill.requiresSystems.length);
    for (const system of skill.requiresSystems) assert.match(system, /^[a-z]+(?:-[a-z]+)*$/);
    assert.equal(Object.hasOwn(skill, 'enabled'), false);
    assert.equal(Object.hasOwn(skill, 'ready'), false);
  }
  assert.deepEqual(skillById('trap-sense').requiresSystems, ['trap-detection']);
  assert.deepEqual(skillById('trap-disarming').requiresSystems, ['trap-disarming']);
  assert.deepEqual(skillById('trap-setting').requiresSystems, ['trap-placement']);
});

test('catalog is deeply immutable so consumers cannot alter global rules', () => {
  function assertDeepFrozen(value) {
    if (value === null || typeof value !== 'object') return;
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) assertDeepFrozen(child);
  }
  assertDeepFrozen(SKILL_CATEGORIES);
  assertDeepFrozen(SKILL_CATALOG);
  assert.throws(() => { skillById('trap-sense').rankLevels[0] = 1; }, TypeError);
  assert.throws(() => { skillById('trap-sense').name.ru = 'Изменено'; }, TypeError);
});
