import test from 'node:test';
import assert from 'node:assert/strict';
import { skillMenuModel } from '../tools/dcss-rpg-skill-menu.js';
import { createSkillState, learnSkill } from '../tools/dcss-rpg-skills.js';

const implementations = {
  'trap-sense': {
    version: 1,
    modifiersByRank: [{}, {}, {}],
    capabilitiesByRank: [
      { trapDetectionRadius: 1 },
      { trapDetectionRadius: 2 },
      { trapDetectionRadius: 3 },
    ],
  },
};
const systems = ['trap-detection'];
const options = (state = createSkillState(2), heroLevel = 2) => ({
  state, heroLevel, runStatus: 'playing', implementations, systems,
});
const firstSkill = (model) => model.groups[0].skills[0];

test('production menu exposes implemented trap skills, with no empty categories', () => {
  const model = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing' });
  assert.equal(model.visible, true);
  assert.equal(model.groups.length, 1);
  assert.deepEqual(model.groups.flatMap(({ skills }) => skills.map(({ id }) => id)), [
    'trap-sense',
    'trap-disarming',
    'lockpicking',
  ]);
  assert.equal(firstSkill(model).canLearn, true);
  assert.equal(model.points, 7);
  const dormant = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing', implementations: {} });
  assert.equal(dormant.visible, false);
  assert.deepEqual(dormant.groups, []);
  const unsupported = skillMenuModel({ ...options(), systems: [] });
  assert.equal(unsupported.visible, false);
  assert.deepEqual(unsupported.groups, []);
});

test('ready mechanic is shown with bilingual catalog copy and matching learn decision', () => {
  const ru = skillMenuModel(options());
  assert.equal(ru.visible, true);
  assert.equal(ru.title, 'Навыки');
  assert.equal(ru.pointsLabel, 'Очки навыков');
  assert.equal(ru.groups.length, 1);
  assert.equal(ru.groups[0].label, 'Исследование');
  assert.deepEqual(firstSkill(ru), {
    id: 'trap-sense', name: 'Чутьё',
    description: 'Обнаруживает механические ловушки в радиусе 2/3/4 клеток. Не видит сквозь стены и не обезвреживает.',
    rank: 0, maxRank: 3, nextRank: 1,
    canLearn: true, actionLabel: 'Изучить', reasonLabel: '',
  });
  const en = skillMenuModel({ ...options(), language: 'en' });
  assert.equal(en.title, 'Skills');
  assert.equal(en.pointsLabel, 'Skill points');
  assert.equal(en.groups[0].label, 'Exploration');
  assert.equal(firstSkill(en).name, 'Trap sense');
  assert.match(firstSkill(en).description, /^Detects mechanical traps within 2\/3\/4 tiles/);
  assert.equal(firstSkill(en).actionLabel, 'Learn');
});

test('rank advancement, level requirements and points use current gameplay rules', () => {
  const initialOptions = options();
  const learned = learnSkill({ ...initialOptions, skillId: 'trap-sense', expectedRank: 0 });
  assert.equal(learned.ok, true);
  const rankOne = firstSkill(skillMenuModel(options(learned.state)));
  assert.equal(rankOne.rank, 1);
  assert.equal(rankOne.nextRank, 2);
  assert.equal(rankOne.canLearn, false);
  assert.equal(rankOne.actionLabel, 'Улучшить');
  assert.equal(rankOne.reasonLabel, 'Нужен уровень 4');

  const levelFour = { version: 1, points: 2, ranks: { 'trap-sense': 1 } };
  assert.equal(firstSkill(skillMenuModel(options(levelFour, 4))).canLearn, true);
  const noPoints = { version: 1, points: 0, ranks: { 'trap-sense': 1, 'trap-disarming': 2 } };
  const blocked = firstSkill(skillMenuModel({ ...options(noPoints, 4), language: 'en' }));
  assert.equal(blocked.rank, 1);
  assert.equal(blocked.canLearn, false);
  assert.equal(blocked.reasonLabel, 'No skill points');
  assert.equal(blocked.actionLabel, 'Upgrade');

  const masteredState = { version: 1, points: 2, ranks: { 'trap-sense': 3 } };
  const mastered = firstSkill(skillMenuModel(options(masteredState, 6)));
  assert.equal(mastered.rank, 3);
  assert.equal(mastered.nextRank, null);
  assert.equal(mastered.canLearn, false);
  assert.equal(mastered.actionLabel, 'Изучено');
  assert.equal(mastered.reasonLabel, 'Максимальный ранг');
});

test('finished run keeps learned rank visible but blocks spending', () => {
  const state = { version: 1, points: 2, ranks: { 'trap-sense': 1 } };
  const model = skillMenuModel({ ...options(state, 4), runStatus: 'dead', language: 'en' });
  assert.equal(firstSkill(model).rank, 1);
  assert.equal(firstSkill(model).canLearn, false);
  assert.equal(firstSkill(model).reasonLabel, 'Available during a run');
});

test('model is deeply frozen without mutating or freezing caller state', () => {
  const state = createSkillState(2);
  const before = structuredClone(state);
  const model = skillMenuModel(options(state));
  function assertDeepFrozen(value) {
    if (value === null || typeof value !== 'object') return;
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) assertDeepFrozen(child);
  }
  assertDeepFrozen(model);
  assert.deepEqual(state, before);
  assert.equal(Object.isFrozen(state), false);
  assert.equal(Object.isFrozen(state.ranks), false);
  assert.equal(Object.isFrozen(implementations), false);
  assert.throws(() => skillMenuModel(options(state, 10)), /skill state/i);
});
