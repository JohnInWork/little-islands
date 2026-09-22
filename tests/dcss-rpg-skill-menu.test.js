import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { skillMenuModel } from '../tools/dcss-rpg-skill-menu.js';
import { createSkillState, learnSkill } from '../tools/dcss-rpg-skills.js';

const implementations = {
  'traps': {
    version: 1,
    modifiersByRank: [{}, {}, {}],
    capabilitiesByRank: [
      { trapDetectionRadius: 1 },
      { trapDetectionRadius: 2 },
      { trapDetectionRadius: 3 },
    ],
  },
};
const systems = ['trap-detection', 'trap-disarming', 'trap-placement'];
// Every skill's second and third rank now asks for an attribute; a fixture
// about levels and points hands over a hero who has grown into all three.
const GROWN = Object.freeze({ strength: 40, agility: 40, intelligence: 40 });
const options = (state = createSkillState(2), heroLevel = 2) => ({
  state, heroLevel, runStatus: 'playing', implementations, systems, attributes: GROWN,
});
const firstSkill = (model) => model.groups[0].skills[0];

test('production menu exposes implemented trap skills, with no empty categories', () => {
  const model = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing' });
  assert.equal(model.visible, true);
  assert.equal(model.groups.length, 6, 'exploration, combat, magic, survival, crafting and companions');
  assert.deepEqual(model.groups.flatMap(({ skills }) => skills.map(({ id }) => id)), [
    'traps',
    'secret-search',
    'lockpicking',
    'appraisal',
    'stealth',
    'daggers',
    'swords',
    'axes',
    'blunt-weapons',
    'spears',
    'marksmanship',
    'whip-control',
    'staff-channeling',
    'shield',
    'mobility',
    'pyromancy',
    'cryomancy',
    'storm-magic',
    'necromancy',
    'arcana',
    'cleansing',
    'cooking',
    'field-medicine',
    'portering',
    'endurance',
    'poisoncraft',
    'salvaging',
    'taming',
    'pack-leader',
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

/**
 * Точные числа рангов переехали из описания в лестницу: описание говорит, ЧТО
 * это за навык, лестница — что даёт каждая ступень. Проверки ниже поэтому
 * спрашивают лестницу; гарантия та же — игрок может прочитать точные числа, —
 * просто она больше не требует держать их в прозе дважды.
 */
const gainsAt = (skill, rank) => skill.ladder[rank - 1].gains
  .map(({ label, value }) => (value ? `${label} ${value}` : label))
  .join(' · ');

test('production appraisal explains safe item identification tiers in both languages', () => {
  const ru = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing' });
  const appraisal = ru.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'appraisal');
  assert.equal(appraisal.name, 'Оценка');
  assert.match(appraisal.description, /зелья, свитки, жезлы и книги/);
  assert.match(appraisal.description, /ничего не тратя/);
  for (const rank of [1, 2, 3]) assert.match(gainsAt(appraisal, rank), new RegExp(`ступень ${rank}`));
  const en = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', language: 'en',
  });
  const english = en.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'appraisal');
  assert.match(english.description, /potions, scrolls, wands and books/);
  assert.match(english.description, /using nothing up/);
  assert.match(gainsAt(english, 3), /tier 3/);
});

test('production shield skill explains exact block ranks and rank III stun in both languages', () => {
  const ru = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing' });
  const shield = ru.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'shield');
  assert.equal(shield.name, 'Щит');
  assert.match(shield.description, /заблокировать удар щитом/);
  assert.deepEqual([1, 2, 3].map((rank) => gainsAt(shield, rank)), [
    'шанс блока 15%',
    'шанс блока 25%',
    'шанс блока 35% · блок оглушает на 0.6 с',
  ]);
  const en = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', language: 'en',
  });
  const englishShield = en.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'shield');
  assert.match(englishShield.description, /block a hit completely/);
  assert.match(gainsAt(englishShield, 3), /block chance 35%.*a block stuns for 0\.6s/);
});

test('pyromancy spends the same level point but also requires intelligence', () => {
  const blockedModel = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', attributes: { intelligence: 3 },
  });
  const blocked = blockedModel.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'pyromancy');
  assert.equal(blocked.canLearn, false);
  assert.equal(blocked.reasonLabel, 'Нужно: Интеллект 4');

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
  assert.equal(blocked.reasonLabel, 'Нужно: Интеллект 4');

  const availableModel = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', attributes: { intelligence: 4 },
  });
  const available = availableModel.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'cryomancy');
  assert.equal(available.canLearn, true);
  assert.match(available.description, /замораживает мокрых/);
  assert.match(available.description, /раскалывается по замороженным/);
  assert.match(gainsAt(available, 3), /раскалывает лёд/);
});

test('storm magic exposes its wet-chain rules and intelligence gate in both languages', () => {
  const state = createSkillState(8);
  const blockedModel = skillMenuModel({
    state, heroLevel: 8, runStatus: 'playing', language: 'ru', attributes: { intelligence: 4 },
  });
  const blocked = blockedModel.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'storm-magic');
  assert.equal(blocked.canLearn, false);
  assert.equal(blocked.reasonLabel, 'Нужно: Интеллект 5');
  assert.match(blocked.description, /перескакивает на мокрые цели/);

  const availableModel = skillMenuModel({
    state, heroLevel: 8, runStatus: 'playing', language: 'en', attributes: { intelligence: 5 },
  });
  const available = availableModel.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'storm-magic');
  assert.equal(available.canLearn, true);
  assert.deepEqual([1, 2, 3].map((rank) => gainsAt(available, rank)), [
    'targets 1 · damage to them 55% · the arc jumps 2.5 tiles',
    'targets 2 · damage to them 65% · the arc jumps 3 tiles',
    'targets 3 · damage to them 75% · the arc jumps 3.5 tiles',
  ]);
});

test('production axes specialization explains both grips and all three real cleave ranks', () => {
  const ru = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing' });
  const axes = ru.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'axes');
  assert.equal(axes.name, 'Топоры');
  assert.match(axes.description, /Размах топора задевает соседних врагов/);
  assert.match(gainsAt(axes, 1), /размах двумя руками 35%.*размах одной рукой 25%/);
  assert.match(gainsAt(axes, 3), /размах двумя руками 80% · двумя руками задевает 2 цел\./);
  const en = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', language: 'en',
  });
  const englishAxes = en.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'axes');
  assert.match(englishAxes.description, /An axe sweep catches/);
  assert.match(gainsAt(englishAxes, 3), /two-handed sweep 80% · two-handed hits 2/);
});

test('production sword specialization explains cadence, bonuses and target reset in both languages', () => {
  const ru = skillMenuModel({ state: createSkillState(8), heroLevel: 8, runStatus: 'playing' });
  const swords = ru.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'swords');
  assert.equal(swords.name, 'Мечи');
  assert.match(swords.description, /усиливает каждый следующий/);
  assert.match(swords.description, /Смена цели сбрасывает/);
  assert.deepEqual([1, 2, 3].map((rank) => gainsAt(swords, rank)), [
    'ритм каждые 4 удара · ритмовый удар 40%',
    'ритм каждые 3 удара · ритмовый удар 60%',
    'ритм каждые 2 удара · ритмовый удар 80%',
  ]);
  const en = skillMenuModel({
    state: createSkillState(8), heroLevel: 8, runStatus: 'playing', language: 'en',
  });
  const englishSwords = en.groups.flatMap(({ skills }) => skills).find(({ id }) => id === 'swords');
  assert.match(englishSwords.description, /empowers the next/);
  assert.match(englishSwords.description, /Changing targets resets/);
  assert.match(gainsAt(englishSwords, 3), /rhythm every 2 hits · rhythm strike 80%/);
});

test('ready mechanic is shown with bilingual catalog copy and matching learn decision', () => {
  const ru = skillMenuModel(options());
  assert.equal(ru.visible, true);
  assert.equal(ru.title, 'Навыки');
  assert.equal(ru.pointsLabel, 'Очки навыков');
  assert.equal(ru.groups.length, 1);
  assert.equal(ru.groups[0].label, 'Исследование');
  // Лестница рангов проверяется отдельно ниже: она длинная, и вкладывать её
  // сюда значило бы прятать самое полезное внутрь сверки формы.
  const { ladder, ...shape } = firstSkill(ru);
  assert.deepEqual(shape, {
    id: 'traps', name: 'Ловушки',
    description: 'Видишь чужие ловушки, снимаешь их отмычкой и ставишь свои капканы. Третий ранг обходится без отмычек.',
    rank: 0, trainedRank: 0, rankAdjustment: 0, rankAdjustmentLabel: '', maxRank: 3, nextRank: 1,
    canLearn: true, actionLabel: 'Изучить', reasonLabel: '',
    // The straight branch Ivan asked to see: three nodes, the first reachable
    // now and the other two waiting for their level.
    branch: [
      { rank: 1, state: 'open', requiredLevel: 1 },
      { rank: 2, state: 'locked', requiredLevel: 4 },
      { rank: 3, state: 'locked', requiredLevel: 6 },
    ],
    nextRankNote: 'Следующая ступень — 1-я',
    costLabel: 'Стоит 1 очко навыка',
    cancelLabel: 'Отмена',
  });
  /**
   * «Суть в том, чтобы я удобно видел, что на каком уровне навыка я получаю.»
   * Одно слитное описание «радиус 2/3/4 клеток» этого не говорило: игрок сам
   * разбирался, какая цифра к какому рангу.
   */
  assert.deepEqual(ladder, [
    {
      rank: 1, heroLevel: 1, attribute: null, attributeValue: 0,
      gains: [
        { key: 'trapDetectionRadius', label: 'видит ловушки', value: '2 кл' },
        { key: 'trapDisarmTier', label: 'обезвреживает ловушки', value: 'ступень 3' },
        { key: 'trapPlacementTier', label: 'ставит ловушки', value: 'ступень 3' },
      ],
    },
    {
      rank: 2, heroLevel: 4, attribute: 'agility', attributeValue: 5,
      gains: [{ key: 'trapDetectionRadius', label: 'видит ловушки', value: '4 кл' }],
    },
    {
      rank: 3, heroLevel: 6, attribute: 'agility', attributeValue: 7,
      gains: [{ key: 'trapDisarmFree', label: 'снимает ловушки без отмычек', value: 'да' }],
    },
  ]);
  assert.equal(ru.ladderRankLabel, 'Ранг');
  assert.equal(ru.ladderLevelLabel, 'ур.');

  const en = skillMenuModel({ ...options(), language: 'en' });
  assert.equal(en.title, 'Skills');
  assert.equal(firstSkill(en).ladder[0].gains[0].label, 'sees traps');
  assert.equal(en.ladderRankLabel, 'Rank');
  assert.equal(en.pointsLabel, 'Skill points');
  assert.equal(en.groups[0].label, 'Exploration');
  assert.equal(firstSkill(en).name, 'Traps');
  assert.match(firstSkill(en).description, /^See enemy traps/);
  assert.equal(firstSkill(en).actionLabel, 'Learn');
});

test('rank advancement, level requirements and points use current gameplay rules', () => {
  const initialOptions = options();
  const learned = learnSkill({ ...initialOptions, skillId: 'traps', expectedRank: 0, attributes: { strength: 40, agility: 40, intelligence: 40 } });
  assert.equal(learned.ok, true);
  const rankOne = firstSkill(skillMenuModel(options(learned.state)));
  assert.equal(rankOne.rank, 1);
  assert.equal(rankOne.nextRank, 2);
  assert.equal(rankOne.canLearn, false);
  assert.equal(rankOne.actionLabel, 'Улучшить');
  assert.equal(rankOne.reasonLabel, 'Нужен уровень 4');

  const levelFour = { version: 1, points: 2, ranks: { 'traps': 1 } };
  assert.equal(firstSkill(skillMenuModel(options(levelFour, 4))).canLearn, true);
  const noPoints = { version: 1, points: 0, ranks: { traps: 1, lockpicking: 2 } };
  const blocked = firstSkill(skillMenuModel({ ...options(noPoints, 4), language: 'en' }));
  assert.equal(blocked.rank, 1);
  assert.equal(blocked.canLearn, false);
  assert.equal(blocked.reasonLabel, 'No skill points');
  assert.equal(blocked.actionLabel, 'Upgrade');

  const masteredState = { version: 1, points: 2, ranks: { 'traps': 3 } };
  const mastered = firstSkill(skillMenuModel(options(masteredState, 6)));
  assert.equal(mastered.rank, 3);
  assert.equal(mastered.nextRank, null);
  assert.equal(mastered.canLearn, false);
  assert.equal(mastered.actionLabel, 'Изучено');
  assert.equal(mastered.reasonLabel, 'Максимальный ранг');
});

test('finished run keeps learned rank visible but blocks spending', () => {
  const state = { version: 1, points: 2, ranks: { 'traps': 1 } };
  const model = skillMenuModel({ ...options(state, 4), runStatus: 'dead', language: 'en' });
  assert.equal(firstSkill(model).rank, 1);
  assert.equal(firstSkill(model).canLearn, false);
  assert.equal(firstSkill(model).reasonLabel, 'Available during a run');
});

test('book adjustments are visible without corrupting trained ranks or point spending', () => {
  const state = createSkillState(2);
  const boosted = firstSkill(skillMenuModel({
    ...options(state, 2),
    rankAdjustments: { 'traps': 1 },
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

test('a skill point is spent on purpose: the row reads, the card confirms', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
  ]);
  // «Тап по навыку открывает описание, потом изучить или отмена» — the same
  // complaint the shop got, and the same answer.
  for (const id of ['character-skill-detail', 'character-skill-learn', 'character-skill-cancel']) {
    assert.ok(html.includes(`id="${id}"`), `${id} is missing`);
  }
  assert.match(runtime, /row\.addEventListener\('click', \(\) => selectSkill\(skill\)\)/);
  assert.match(runtime, /characterSkillLearn\.addEventListener\('click'/);
  assert.match(runtime, /characterSkillCancel\.addEventListener\('click'/);
  // Selecting must not learn: only the confirm button may call learnHeroSkill.
  const select = runtime.slice(runtime.indexOf('function selectSkill('), runtime.indexOf('function showSkillCard('));
  assert.doesNotMatch(select, /learnHeroSkill/, 'reading about a skill spends a point');
  // And the branch is drawn from the model rather than invented in the view.
  assert.match(runtime, /function renderSkillBranch\(/);
  assert.match(runtime, /pip\.dataset\.node = node\.state/);
  for (const state of ['trained', 'granted', 'open']) {
    assert.ok(css.includes(`.skill-branch i[data-node='${state}']`), `${state} node has no look`);
  }
});

/**
 * Главный инвариант лестницы: **ранг не имеет права молчать.**
 *
 * Молчащая ступень — это либо ранг, который ничего не даёт (ошибка баланса),
 * либо ключ без подписи (ошибка в модуле лестницы). Игроку разницы нет: он
 * платит очко и не узнаёт за что.
 */
test('ни один ранг навыка не молчит, и каждое число подписано', async () => {
  const { skillRankLadder, skillRankProblems, unlabelledRankKeys } =
    await import('../tools/dcss-rpg-skill-ranks.js');
  const { SKILL_CATALOG } = await import('../tools/dcss-rpg-skill-content.js');
  const { SKILL_IMPLEMENTATIONS } = await import('../tools/dcss-rpg-skills.js');
  // Навыки без реализации в меню не показываются — с них и спроса нет.
  const shown = SKILL_CATALOG.filter(({ id }) => SKILL_IMPLEMENTATIONS[id]).map(({ id }) => id);
  assert.ok(shown.length >= 29, `навыков с реализацией всего ${shown.length}`);
  assert.deepEqual(unlabelledRankKeys(shown), [], 'эти числа игра покажет, но назвать не сможет');
  assert.deepEqual(
    skillRankProblems(shown),
    [
      // Известные дыры баланса, а не UI: на этих ступенях профиль отдаёт ровно
      // то же, что и на предыдущей. Строка здесь — чтобы они не потерялись.
      'pack-leader: ранг 2 ничего не обещает',
    ],
    'появился новый молчащий ранг',
  );
  for (const id of shown) {
    const ladder = skillRankLadder({ skillId: id });
    const definition = SKILL_CATALOG.find((skill) => skill.id === id);
    assert.equal(ladder.length, definition.maxRank, `${id}: ступеней не столько, сколько рангов`);
    for (const [index, step] of ladder.entries()) {
      assert.equal(step.rank, index + 1);
      assert.equal(step.heroLevel, definition.rankLevels[index], `${id}: ступень ${step.rank} врёт про уровень`);
      // Первый ранг свободен — но только у тех, кто идёт по общей лестнице.
      // Три школы магии написали себе собственную, и она просит интеллект
      // сразу: без него заклинание не прочесть вовсе.
      if (step.rank === 1 && !definition.attributeRequirements) {
        assert.equal(step.attribute, null, `${id}: за первый ранг просят характеристику`);
      }
      for (const gain of step.gains) {
        assert.ok(gain.label.length > 0, `${id}/${step.rank}: подпись пустая`);
        assert.equal(typeof gain.value, 'string');
      }
    }
    // И обе лестницы переведены.
    const en = skillRankLadder({ skillId: id, language: 'en' });
    for (const [index, step] of en.entries()) {
      for (const [slot, gain] of step.gains.entries()) {
        const ru = ladder[index].gains[slot];
        assert.equal(gain.key, ru.key);
        assert.notEqual(gain.label, ru.label, `${id}/${gain.key}: подпись не переведена`);
      }
    }
  }
});

/** Карточка навыка рисует лестницу, а не только слитное описание. */
test('карточка навыка показывает лестницу', async () => {
  const { readFile } = await import('node:fs/promises');
  const [runtime, html, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /id="character-skill-ladder"/);
  // Список ступеней — тот, который дали: одна и та же лестница рисуется и в
  // листе персонажа, и на экране создания.
  assert.match(runtime, /function renderSkillLadder\(skill, copy, list = characterSkillLadder\) \{/);
  assert.match(runtime, /renderSkillLadder\(skill, skillLadderCopy\);/);
  // Купленная ступень, следующая и дальние отличаются — иначе лестница не
  // говорит, где ты сейчас стоишь.
  assert.match(runtime, /step\.rank <= skill\.rank \? 'taken' : step\.rank === skill\.rank \+ 1 \? 'next' : 'later'/);
  for (const state of ['taken', 'next', 'later']) {
    assert.match(css, new RegExp(`\\.skill-ladder-step\\[data-state='${state}'\\]`), state);
  }
  // На телефоне в вертикали ступень складывается в две строки: в два столбца
  // «Ранг 2 · ур. 4 · ЛОВ 5» съедает половину карточки, и эффекты ломаются в
  // пять строк лапши на оставшихся ста пикселях.
  const narrow = css.slice(css.indexOf('@media (max-width: 640px) and (orientation: portrait) {', css.indexOf('.skill-ladder-step')));
  assert.match(narrow.slice(0, 220), /\.skill-ladder-step \{\s*grid-template-columns: 1fr;/);
});
