import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKILL_CATEGORIES,
  SKILL_CATALOG,
  skillById,
} from '../tools/dcss-rpg-skill-content.js';

test('skill catalog has 41 unique stable IDs and resolves its six categories', () => {
  assert.equal(SKILL_CATEGORIES.length, 6);
  assert.equal(SKILL_CATALOG.length, 41);
  const categories = new Set(SKILL_CATEGORIES.map(({ id }) => id));
  const ids = new Set(SKILL_CATALOG.map(({ id }) => id));
  assert.equal(categories.size, 6);
  assert.equal(ids.size, 41);
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
  assert.deepEqual(skillById('lockpicking').requiresSystems, ['lockpicking']);
  // Ловушечник снят: капканы ставит всякий, и системе больше не за что
  // держать навык.
  assert.equal(skillById('trap-setting'), null);
  assert.deepEqual(skillById('appraisal').requiresSystems, ['item-identification']);
  assert.deepEqual(skillById('swords').requiresSystems, ['sword-rhythm']);
  assert.deepEqual(skillById('axes').requiresSystems, ['weapon-cleave']);
  assert.deepEqual(skillById('shield').requiresSystems, ['shield-blocking']);
  assert.deepEqual(skillById('pyromancy').requiresSystems, ['fire-spread']);
  assert.deepEqual(skillById('pyromancy').attributeRequirements, { intelligence: [4, 7, 10] });
  assert.deepEqual(skillById('cryomancy').requiresSystems, ['frost-buildup']);
  assert.deepEqual(skillById('cryomancy').attributeRequirements, { intelligence: [4, 7, 10] });
  assert.deepEqual(skillById('storm-magic').requiresSystems, ['chain-lightning']);
  assert.deepEqual(skillById('storm-magic').attributeRequirements, { intelligence: [5, 8, 11] });
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
