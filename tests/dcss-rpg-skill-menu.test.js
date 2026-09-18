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
  assert.equal(model.groups.length, 4, 'exploration, combat, magic and now survival');
  assert.deepEqual(model.groups.flatMap(({ skills }) => skills.map(({ id }) => id)), [
    'trap-sense',
    'darkvision',
    'secret-search',
    'trap-disarming',
    'lockpicking',
    'trap-setting',
    'appraisal',
    'stealth',
    'daggers',
    'swords',
    'axes',
    'blunt-weapons',
    'spears',
    'marksmanship',
    'shield',
    'mobility',
    'pyromancy',
    'cryomancy',
    'storm-magic',
    'field-medicine',
    'camping',
    'endurance',
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

test('production appraisal explains safe item identification tiers in both languages', () => {
  const ru = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing' });
  const appraisal = ru.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'appraisal');
  assert.equal(appraisal.name, 'Оценка');
  assert.match(appraisal.description, /зелья, свитки, жезлы и книги сложности I\/II\/III/);
  assert.match(appraisal.description, /Без расхода/);
  const en = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', language: 'en',
  });
  const english = en.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'appraisal');
  assert.match(english.description, /tier I\/II\/III potions, scrolls, wands and books/);
  assert.match(english.description, /without consuming/);
});

test('production shield skill explains exact block ranks and rank III stun in both languages', () => {
  const ru = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing' });
  const shield = ru.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'shield');
  assert.equal(shield.name, 'Щит');
  assert.match(shield.description, /15%\/25%\/35%/);
  assert.match(shield.description, /III ранге.*оглушает/);
  const en = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', language: 'en',
  });
  const englishShield = en.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'shield');
  assert.match(englishShield.description, /15%\/25%\/35%/);
  assert.match(englishShield.description, /rank III.*stuns/);
});

test('pyromancy spends the same level point but also requires intelligence', () => {
  const blockedModel = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', attributes: { intelligence: 3 },
  });
  const blocked = blockedModel.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'pyromancy');
  assert.equal(blocked.canLearn, false);
  assert.equal(blocked.reasonLabel, 'Нужен интеллект 4');

  const availableModel = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', attributes: { intelligence: 4 },
  });
  const available = availableModel.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'pyromancy');
  assert.equal(available.canLearn, true);
});

test('cryomancy is an implemented intelligence-gated three-stage mechanic', () => {
  const blockedModel = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', attributes: { intelligence: 3 },
  });
  const blocked = blockedModel.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'cryomancy');
  assert.equal(blocked.canLearn, false);
  assert.equal(blocked.reasonLabel, 'Нужен интеллект 4');

  const availableModel = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', attributes: { intelligence: 4 },
  });
  const available = availableModel.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'cryomancy');
  assert.equal(available.canLearn, true);
  assert.match(available.description, /замораживает мокрые цели/);
  assert.match(available.description, /раскалывает лёд/);
});

test('storm magic exposes its wet-chain rules and intelligence gate in both languages', () => {
  const state = createSkillState(8);
  const blockedModel = skillMenuModel({
    state, heroLevel: 8, runStatus: 'playing', language: 'ru', attributes: { intelligence: 4 },
  });
  const blocked = blockedModel.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'storm-magic');
  assert.equal(blocked.canLearn, false);
  assert.equal(blocked.reasonLabel, 'Нужен интеллект 5');
  assert.match(blocked.description, /1\/2\/3 мокрые цели/);

  const availableModel = skillMenuModel({
    state, heroLevel: 8, runStatus: 'playing', language: 'en', attributes: { intelligence: 5 },
  });
  const available = availableModel.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'storm-magic');
  assert.equal(available.canLearn, true);
  assert.match(available.description, /55%\/65%\/75%/);
});

test('production axes specialization explains both grips and all three real cleave ranks', () => {
  const ru = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing' });
  const axes = ru.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'axes');
  assert.equal(axes.name, 'Топоры');
  assert.match(axes.description, /25%\/40%\/55%/);
  assert.match(axes.description, /35%\/60%/);
  assert.match(axes.description, /две цели по 80%/);
  const en = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', language: 'en',
  });
  const englishAxes = en.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'axes');
  assert.match(englishAxes.description, /One-handed axes/);
  assert.match(englishAxes.description, /two targets for 80% at rank III/);
});

test('production sword specialization explains cadence, bonuses and target reset in both languages', () => {
  const ru = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing' });
  const swords = ru.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'swords');
  assert.equal(swords.name, 'Мечи');
  assert.match(swords.description, /4-й\/3-й\/2-й/);
  assert.match(swords.description, /40%\/60%\/80%/);
  assert.match(swords.description, /Смена цели сбрасывает/);
  const en = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', language: 'en',
  });
  const englishSwords = en.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'swords');
  assert.match(englishSwords.description, /4th\/3rd\/2nd/);
  assert.match(englishSwords.description, /Changing targets resets/);
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
    rank: 0, trainedRank: 0, rankAdjustment: 0, rankAdjustmentLabel: '', maxRank: 3, nextRank: 1,
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

test('book adjustments are visible without corrupting trained ranks or point spending', () => {
  const state = createSkillState(2);
  const boosted = firstSkill(skillMenuModel({
    ...options(state, 2),
    rankAdjustments: { 'trap-sense': 1 },
  }));
  assert.equal(boosted.rank, 1);
  assert.equal(boosted.trainedRank, 0);
  assert.equal(boosted.rankAdjustment, 1);
  assert.match(boosted.rankAdjustmentLabel, /\+1.*книг/);
  assert.equal(boosted.canLearn, true);
  assert.equal(state.points, 1);
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
