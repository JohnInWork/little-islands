import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUILD_ARCHETYPES,
  BUILD_ARCHETYPE_IDS,
  CREATION_ATTRIBUTE_POINTS,
  CREATION_SKILL_POINTS,
  adjustBuildAttribute,
  buildArchetypeById,
  buildAttributes,
  buildScreenModel,
  buildSkillPointsLeft,
  buildSkillRanks,
  createArchetypeBuild,
  createCustomBuild,
  createEmptyBuild,
  toggleBuildSkill,
  validateBuild,
} from '../tools/dcss-rpg-character-creation.js';
import { ATTRIBUTE_BASE, ATTRIBUTE_IDS } from '../tools/dcss-rpg-attributes.js';
import { SKILL_CATALOG, skillById } from '../tools/dcss-rpg-skill-content.js';
import { createSkillState, validateSkillState } from '../tools/dcss-rpg-skills.js';
import { createRun, generateDungeon, validateRun } from '../tools/dcss-rpg-core.js';

/**
 * Готовый герой — это заполненный свой.
 *
 * Если пресет даёт хоть что-нибудь сверх двух очков и двух навыков, выбор между
 * «собрать самому» и «взять готового» перестаёт быть выбором: один из вариантов
 * становится правильным. Проверяется именно это равенство, а не содержимое
 * конкретного набора.
 */
test('готовый герой не даёт ничего сверх того, что можно собрать руками', () => {
  assert.ok(BUILD_ARCHETYPES.length >= 3);
  assert.deepEqual([...BUILD_ARCHETYPE_IDS].sort(), ['archer', 'mage', 'scout', 'warrior']);
  for (const archetype of BUILD_ARCHETYPES) {
    const сумма = ATTRIBUTE_IDS.reduce((total, id) => total + archetype.attributes[id], 0);
    assert.equal(сумма, CREATION_ATTRIBUTE_POINTS, `${archetype.id}: очков не два`);
    assert.equal(archetype.skillIds.length, CREATION_SKILL_POINTS, `${archetype.id}: навыков не два`);
    assert.equal(new Set(archetype.skillIds).size, archetype.skillIds.length);
    for (const id of archetype.skillIds) assert.ok(skillById(id), `${archetype.id}: нет навыка ${id}`);
    for (const locale of ['ru', 'en']) {
      assert.ok(archetype[locale].name.length > 0, `${archetype.id}/${locale}: без имени`);
      assert.ok(archetype[locale].line.length > 0, `${archetype.id}/${locale}: без описания`);
    }
    assert.ok(validateBuild(createArchetypeBuild(archetype.id)));
  }
  // Заклинаний не раздаёт никто: магу их даёт ранг пиромантии, взятый здесь же.
  const сзаклинанием = BUILD_ARCHETYPES.filter(({ spellIds }) => spellIds.length > 0);
  assert.deepEqual(сзаклинанием.map(({ id }) => id), []);
  assert.ok(
    buildArchetypeById('mage').skillIds.some((id) => ['pyromancy', 'arcana'].includes(id)),
    'маг без школы — маг без заклинаний',
  );
  assert.equal(buildArchetypeById('нет такого'), null);
  assert.throws(() => createArchetypeBuild('нет такого'), TypeError);
});

test('свой герой считает очки и не даёт потратить лишнее', () => {
  const пустой = createEmptyBuild();
  assert.ok(validateBuild(пустой));
  assert.deepEqual(buildAttributes(пустой), {
    strength: ATTRIBUTE_BASE, agility: ATTRIBUTE_BASE, intelligence: ATTRIBUTE_BASE,
  });
  assert.equal(buildSkillPointsLeft(пустой), CREATION_SKILL_POINTS);

  const собран = createCustomBuild({ attributes: { strength: 1, agility: 1 }, skillIds: ['daggers', 'stealth'] });
  assert.equal(buildAttributes(собран).strength, ATTRIBUTE_BASE + 1);
  assert.deepEqual(buildSkillRanks(собран), { daggers: 1, stealth: 1 });
  assert.equal(buildSkillPointsLeft(собран), 0);

  // Недобор — не ошибка: герой с очком в кармане такой же законный.
  const неполный = createCustomBuild({ attributes: { strength: 1 }, skillIds: ['daggers'] });
  assert.ok(validateBuild(неполный));
  assert.equal(buildSkillPointsLeft(неполный), 1);

  assert.throws(() => createCustomBuild({ attributes: { strength: 3 } }), TypeError);
  assert.throws(() => createCustomBuild({ attributes: { strength: 1, agility: 2 } }), TypeError);
  assert.throws(() => createCustomBuild({ attributes: { strength: -1 } }), TypeError);
  assert.throws(() => createCustomBuild({ skillIds: ['daggers', 'stealth', 'swords'] }), TypeError);
  assert.throws(() => createCustomBuild({ skillIds: ['daggers', 'daggers'] }), TypeError);
  assert.throws(() => createCustomBuild({ skillIds: ['нет такого'] }), TypeError);
});

test('кнопки экрана прибавляют по очку и не уводят в минус', () => {
  let build = createEmptyBuild();
  build = adjustBuildAttribute(build, 'strength', 1);
  assert.equal(build.attributes.strength, 1);
  build = adjustBuildAttribute(build, 'agility', 1);
  // Третье очко не проходит: их два.
  const третье = adjustBuildAttribute(build, 'intelligence', 1);
  assert.equal(третье.attributes.intelligence, 0, 'потратилось третье очко');
  build = adjustBuildAttribute(build, 'strength', -1);
  assert.equal(build.attributes.strength, 0);
  assert.equal(adjustBuildAttribute(build, 'strength', -1).attributes.strength, 0, 'ушли в минус');
  assert.throws(() => adjustBuildAttribute(build, 'luck', 1), TypeError);
  assert.throws(() => adjustBuildAttribute(build, 'strength', 2), TypeError);

  let навыки = createEmptyBuild();
  навыки = toggleBuildSkill(навыки, 'swords');
  навыки = toggleBuildSkill(навыки, 'shield');
  assert.deepEqual([...навыки.skillIds], ['swords', 'shield']);
  assert.deepEqual([...toggleBuildSkill(навыки, 'axes').skillIds], ['swords', 'shield'], 'взялся третий навык');
  assert.deepEqual([...toggleBuildSkill(навыки, 'swords').skillIds], ['shield'], 'навык не снимается');
  assert.throws(() => toggleBuildSkill(навыки, 'нет такого'), TypeError);

  // Тронул руками — герой перестал быть готовым, даже если начинал таким.
  const готовый = createArchetypeBuild('warrior');
  assert.equal(adjustBuildAttribute(готовый, 'strength', -1).archetypeId, null);
  assert.equal(toggleBuildSkill(готовый, 'swords').archetypeId, null);
  // Отклонённая правка не меняет ничего, в том числе и того, кем герой был:
  // у воина оба очка уже вложены, и третье просто не проходит.
  assert.equal(adjustBuildAttribute(готовый, 'agility', 1).archetypeId, 'warrior');
});

test('экран знает, сколько осталось, и говорит на двух языках', () => {
  const пусто = buildScreenModel({ build: createEmptyBuild(), language: 'ru' });
  assert.equal(пусто.attributePointsLeft, CREATION_ATTRIBUTE_POINTS);
  assert.equal(пусто.skillPointsLeft, CREATION_SKILL_POINTS);
  assert.equal(пусто.archetypes.length, BUILD_ARCHETYPES.length);
  assert.equal(пусто.archetypes.every(({ chosen }) => chosen === false), true);

  const воин = buildScreenModel({ build: createArchetypeBuild('warrior'), language: 'ru' });
  assert.equal(воин.attributePointsLeft, 0);
  assert.equal(воин.skillPointsLeft, 0);
  assert.equal(воин.attributes.strength, ATTRIBUTE_BASE + 2);
  assert.equal(воин.archetypes.find(({ id }) => id === 'warrior').chosen, true);
  assert.deepEqual([...воин.archetypes.find(({ id }) => id === 'warrior').skills], ['Мечи', 'Щит']);

  const en = buildScreenModel({ build: createArchetypeBuild('warrior'), language: 'en' });
  assert.deepEqual([...en.archetypes.find(({ id }) => id === 'warrior').skills], ['Swords', 'Shield']);
});

/**
 * Выданное создание не берёт из уровневого бюджета.
 *
 * Сначала я подняла бюджет всем уровням сразу — и поехала половина тестов
 * экономики навыков, потому что цена уровня одинакова везде и на ней держится
 * весь счёт. Новое правило живёт в новом месте: выданные ступени помечены, и
 * проверка вычитает ровно их. Забег без создания остаётся прежним до байта.
 */
test('стартовые навыки не оплачиваются уровнем, а старые сохранения не портятся', () => {
  const выдано = createSkillState(1, ['swords', 'shield']);
  assert.deepEqual(выдано.ranks, { swords: 1, shield: 1 });
  assert.equal(выдано.points, 0);
  assert.deepEqual([...выдано.granted], ['swords', 'shield']);
  assert.equal(validateSkillState(выдано, 1, 0), true);

  // Без создания форма прежняя — без лишнего поля.
  const прежний = createSkillState();
  assert.deepEqual(прежний, { version: прежний.version, points: 0, ranks: {} });
  assert.equal(Object.hasOwn(прежний, 'granted'), false);
  assert.equal(validateSkillState(прежний, 1, 0), true);

  // Список без рангов ничего не даёт, и третий выданный навык не принимается.
  assert.equal(validateSkillState({ ...выдано, ranks: {} }, 1, 0), false);
  assert.equal(validateSkillState({ ...выдано, granted: ['swords', 'shield', 'axes'] }, 1, 0), false);
  assert.equal(validateSkillState({ ...выдано, granted: ['swords', 'swords'] }, 1, 0), false);
  assert.equal(validateSkillState({ ...выдано, granted: ['нет такого'] }, 1, 0), false);
  assert.throws(() => createSkillState(1, ['swords', 'shield', 'axes']), TypeError);
  assert.throws(() => createSkillState(1, ['нет такого']), TypeError);
});

/** Первая ступень открыта сразу — иначе выбранное при создании некуда класть. */
test('первая ступень любого навыка доступна на первом уровне', () => {
  for (const skill of SKILL_CATALOG) {
    assert.equal(skill.rankLevels[0], 1, `${skill.id}: первая ступень не на первом уровне`);
  }
});

test('забег выходит собранным, а забег без создания — прежним', () => {
  for (const id of BUILD_ARCHETYPE_IDS) {
    const build = createArchetypeBuild(id);
    const run = createRun(1, generateDungeon({ seed: 1, depth: 1 }), null, build);
    assert.equal(validateRun(run), true, `${id}: снимок невалиден`);
    assert.deepEqual(run.hero.skills.ranks, buildSkillRanks(build), `${id}: навыки не те`);
    for (const attribute of ATTRIBUTE_IDS) {
      assert.equal(run.hero.attributes[attribute], buildAttributes(build)[attribute], `${id}/${attribute}`);
    }
    // Очки уровня не тронуты: на первом уровне их и не было.
    assert.equal(run.hero.skills.points, 0, `${id}: очки взялись из ниоткуда`);
  }

  // Маг берёт пиромантию и арканистику — и рождается с первым заклинанием
  // каждой школы. Отдельного списка заклинаний у сборки больше нет.
  const маг = createRun(1, generateDungeon({ seed: 1, depth: 1 }), null, createArchetypeBuild('mage'));
  assert.deepEqual([...маг.hero.spells.knownSpellIds], ['ember-bolt', 'arcane-splinter']);

  const прежний = createRun(2, generateDungeon({ seed: 2, depth: 1 }));
  assert.equal(validateRun(прежний), true);
  assert.deepEqual(прежний.hero.skills.ranks, {});
  assert.equal(Object.hasOwn(прежний.hero.skills, 'granted'), false);
});
