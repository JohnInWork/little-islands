import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';

import { environmentThemeFor } from '../tools/dcss-rpg-room-plans.js';

import { isCityDepth } from '../tools/dcss-rpg-city.js';

import { contextActionModel } from '../tools/dcss-rpg-context-actions.js';
import { ACTOR_EFFECTS } from '../tools/dcss-rpg-effects.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { ENVIRONMENT_ROOM_THEMES } from '../tools/dcss-rpg-environment.js';
import {
  FIND_ASSET_PATHS,
  LANDMARK_CATALOG,
  LANDMARK_OUTCOME_KEYS,
  findById,
  isLandmarkFind,
  landmarkActionRules,
  landmarkOutcomeSummary,
  landmarkResultSummary,
  resolveFindInteraction,
} from '../tools/dcss-rpg-finds.js';
import {
  roomArchetypeById,
  roomArchetypeIdForFind,
} from '../tools/dcss-rpg-room-plans.js';

const THEME_IDS = ['ashen-vault', 'buried-sanctum', 'frozen-depths', 'infernal-core'];
const assetUrl = (path) => new URL(`../public/assets/dcss-preview/${path}`, import.meta.url);

/**
 * One landmark per floor: scan forward until the wanted one shows up. A road's
 * own landmark only ever appears on that road, so the search has to walk the
 * right one — looking for the wild shrine on the descent finds nothing, ever.
 */
function landmarkFixture(id, seed = 3, depth = 5) {
  const branch = findById(id)?.branch ?? 'deep';
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const dungeon = generateDungeon({ seed: seed + attempt, depth, branch });
    const find = dungeon.finds.find((candidate) => candidate.id === id);
    if (find) return { dungeon, find, seed: seed + attempt };
  }
  throw new Error(`No ${id} fixture near seed ${seed} on ${branch}`);
}

const GENERIC_LANDMARKS = LANDMARK_CATALOG.filter(({ branch }) => !branch);
const BRANCH_LANDMARKS = LANDMARK_CATALOG.filter(({ branch }) => branch);

const heroNear = (find, overrides = {}) => ({
  x: find.x + 1,
  y: find.y,
  hp: 30,
  maxHp: 60,
  power: 3,
  effects: {},
  ...overrides,
});

const resolve = (find, action, { hero = {}, gold = 100 } = {}) => resolveFindInteraction({
  find,
  resolvedFindIds: [],
  runStatus: 'playing',
  hero: heroNear(find, hero),
  gold,
  action,
  actor: { gold, vitals: { hp: heroNear(find, hero).hp, maxHp: heroNear(find, hero).maxHp, effects: heroNear(find, hero).effects } },
});

test('общие ориентиры держат один договор: темы, свет, исходы и два языка', async () => {
  // Древний алтарь убран: он путал сильнее, чем давал, и поднимать максимум
  // здоровья теперь умеет сила. Договор держат оставшиеся двое.
  assert.deepEqual(GENERIC_LANDMARKS.map(({ id }) => id), ['sunken-fountain', 'warded-rune']);
  const actionIds = new Set();
  for (const landmark of GENERIC_LANDMARKS) {
    assert.equal(landmark.wave, 'landmark');
    assert.equal(landmark.category, 'choice');
    assert.equal(landmark.outcomes.length, 3, `${landmark.id} offers three answers`);
    assert.ok(landmark.light?.color && landmark.light.radius > 0, `${landmark.id} is lit and therefore readable`);
    for (const themeId of THEME_IDS) {
      assert.ok(landmark.skins[themeId], `${landmark.id} skin for ${themeId}`);
      assert.ok(FIND_ASSET_PATHS.includes(landmark.skins[themeId]));
      await access(assetUrl(landmark.skins[themeId]));
    }
    // Action ids are unique across the catalog, so one glyph always means one thing.
    for (const { id } of landmark.outcomes) {
      assert.equal(actionIds.has(id), false, `${id} belongs to a single landmark`);
      actionIds.add(id);
    }
    for (const language of ['ru', 'en']) {
      const copy = landmark.copy[language];
      for (const key of ['name', 'action', 'inspected', 'unsafe', 'nothingToHeal', 'goldRequired', 'result']) {
        assert.ok(copy[key], `${landmark.id}.${language}.${key}`);
      }
      for (const { id } of landmark.outcomes) assert.ok(copy.results[id], `${landmark.id}.${language}.results.${id}`);
      assert.doesNotMatch(copy.inspected, /\d/, `${landmark.id} never spoils numbers before the choice`);
    }
    // Each landmark owns a room archetype and an environment theme of its own.
    const archetypeId = roomArchetypeIdForFind(landmark.id);
    const archetype = roomArchetypeById(archetypeId);
    assert.equal(archetype.content.findId, landmark.id);
    for (const themeId of THEME_IDS) {
      const environmentThemeId = environmentThemeFor(archetype, themeId);
      assert.ok(ENVIRONMENT_ROOM_THEMES.some(({ id }) => id === environmentThemeId), `${environmentThemeId} exists`);
    }
  }
  assert.deepEqual([...actionIds], [
    'drink', 'toss', 'dive', 'decipher', 'attune', 'break',
  ]);
});

test('every landmark rolls only known outcome keys and each one is a real choice', () => {
  for (let depth = 1; depth <= 9; depth += 1) {
    for (const landmark of GENERIC_LANDMARKS) {
      const rolled = landmark.outcomes.map(({ id, roll }) => [id, roll(depth, { int: (min, max) => Math.min(max, min + (depth % 2)) })]);
      for (const [id, outcome] of rolled) {
        for (const key of Object.keys(outcome)) {
          assert.ok(LANDMARK_OUTCOME_KEYS.includes(key), `${landmark.id}.${id}.${key}`);
        }
        const gain = (outcome.heal ?? 0) + (outcome.healRatio ?? 0) + (outcome.rewardGold ?? 0)
          + (outcome.rewardPower ?? 0) + (outcome.rewardMaxHp ?? 0) + (outcome.cleanse ? 1 : 0);
        assert.ok(gain > 0, `${landmark.id}.${id} gives something back`);
      }
      const costs = rolled.map(([, outcome]) => (outcome.costGold ?? 0) + (outcome.damage ?? 0));
      assert.ok(costs.some((cost) => cost === 0), `${landmark.id} keeps one free answer`);
      assert.ok(costs.some((cost) => cost > 0), `${landmark.id} keeps one priced answer`);
    }
  }
  // Each landmark trades in its own currency.
  const fountain = findById('sunken-fountain');
  const rune = findById('warded-rune');
  assert.equal(fountain.outcomes.find(({ id }) => id === 'toss').roll(3, { int: () => 0 }).rewardPower, 1);
  assert.equal(rune.outcomes.every(({ roll }) => (roll(5, { int: () => 0 }).costGold ?? 0) === 0), true, 'the rune never takes gold');
});

test('этажи берут оба общих ориентира, и фонтан тянется к затопленной комнате', () => {
  const seen = new Map();
  let flooded = 0;
  let fountainInPool = 0;
  let fountainWithPool = 0;
  let floors = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const depth = 1 + (seed % 9);
    // The city has no rooms for a landmark to sit in.
    if (isCityDepth(depth)) continue;
    const level = generateDungeon({ seed, depth });
    const landmarks = level.finds.filter((find) => isLandmarkFind(find));
    assert.ok(landmarks.length <= 1, 'never two landmarks on one floor');
    if (landmarks.length === 0) continue;
    floors += 1;
    const [landmark] = landmarks;
    seen.set(landmark.id, (seen.get(landmark.id) ?? 0) + 1);
    assert.equal(landmark.themeId, level.themeId);
    if (level.floodedRoomIndex === null) continue;
    flooded += 1;
    if (landmark.id !== 'sunken-fountain') continue;
    fountainWithPool += 1;
    if (landmark.roomIndex === level.floodedRoomIndex) fountainInPool += 1;
  }
  // Спуск делит свои этажи с собственным идолом, поэтому каждому общему
  // ориентиру достаётся около четверти. Оба обязаны встречаться достаточно
  // часто, чтобы забег увидел каждого.
  for (const id of ['sunken-fountain', 'warded-rune']) {
    assert.ok(seen.get(id) / floors > 0.1, `${id} appears on ${seen.get(id) ?? 0} of ${floors} landmark floors`);
  }
  // And the road's own landmark takes about half of them — often enough to be
  // the thing you expect on the descent, rare enough to still be a find.
  const own = seen.get('strangers-idol') ?? 0;
  assert.ok(own / floors > 0.4 && own / floors < 0.65, `the descent's idol took ${own} of ${floors}`);
  assert.ok(flooded > 50, `flooded floors in the sample: ${flooded}`);
  assert.ok(
    fountainInPool / Math.max(1, fountainWithPool) > 0.4,
    `the fountain took the pool room ${fountainInPool} of ${fountainWithPool} times`,
  );
});

test('the fountain restores, buys strength and pays for a cold dive', () => {
  const { find } = landmarkFixture('sunken-fountain');
  const { costGold } = find.outcomes.toss;
  const drank = resolve(find, 'drink');
  assert.equal(drank.ok, true);
  assert.ok(drank.heal > 0 && drank.costGold === 0 && drank.rewardGold === 0);
  assert.deepEqual(drank.status, { id: 'wet', duration: 6 });
  assert.equal(drank.state.gold, 100);

  const tossed = resolve(find, 'toss');
  assert.equal(tossed.rewardPower, 1);
  assert.equal(tossed.state.hero.power, 4);
  assert.equal(tossed.state.gold, 100 - costGold);
  assert.equal(resolve(find, 'toss', { gold: costGold - 1 }).reason, 'gold-required');

  const dived = resolve(find, 'dive');
  assert.ok(dived.rewardGold > 0 && dived.damage > 0);
  assert.equal(dived.status.id, 'chilled');
  assert.equal(dived.state.hero.hp, 30 - dived.damage);
  assert.ok(dived.state.hero.hp >= 1, 'a dive is never lethal');
  assert.equal(resolve(find, 'dive', { hero: { hp: find.outcomes.dive.damage } }).reason, 'unsafe');
  assert.match(landmarkResultSummary(dived, 'ru'), /Золото \+\d+/);
  assert.match(landmarkResultSummary(dived, 'en'), /damage \d+/);
});

test('the rune pays in blood and noise, never in gold', () => {
  const { find } = landmarkFixture('warded-rune');
  const deciphered = resolve(find, 'decipher');
  assert.equal(deciphered.rewardPower, 1);
  assert.ok(deciphered.damage > 0 && deciphered.costGold === 0);
  assert.equal(deciphered.state.gold, 100);

  const attuned = resolve(find, 'attune', { hero: { hp: 10, effects: { poison: 5 } } });
  assert.ok(attuned.heal > 0);
  assert.deepEqual(attuned.cleansed, ['poison']);
  assert.equal(attuned.costGold, 0);
  const rested = landmarkActionRules({
    find,
    actor: { gold: 100, vitals: { hp: 60, maxHp: 60, effects: {} } },
  });
  assert.equal(rested.actions.find(({ id }) => id === 'attune').enabled, false, 'nothing to heal, nothing to attune');
  assert.equal(rested.actions.find(({ id }) => id === 'decipher').enabled, true);

  const broken = resolve(find, 'break');
  assert.ok(broken.rewardGold > 0);
  assert.equal(broken.noise, 9, 'breaking a rune is the loudest landmark answer');
  assert.equal(broken.status.id, 'poison');
  assert.equal(broken.damage, 0);
});

test('the shared registry speaks for every landmark in both languages', () => {
  const expected = {
    'sunken-fountain': {
      ru: { name: 'Затопленный фонтан', actions: ['Испить', 'Бросить', 'Нырнуть'] },
      en: { name: 'Sunken fountain', actions: ['Drink', 'Toss', 'Dive'] },
    },
    'warded-rune': {
      ru: { name: 'Запечатанная руна', actions: ['Разобрать', 'Настроиться', 'Расколоть'] },
      en: { name: 'Warded rune', actions: ['Decipher', 'Attune', 'Break'] },
    },
  };
  for (const [id, copy] of Object.entries(expected)) {
    const { find } = landmarkFixture(id);
    const target = { kind: 'find', ...find };
    const actor = { gold: 200, vitals: { hp: 20, maxHp: 60, effects: {} } };
    for (const language of ['ru', 'en']) {
      const model = contextActionModel({ target, actor, language });
      assert.equal(model.interactionId, 'landmark');
      assert.equal(model.name, copy[language].name);
      assert.deepEqual(model.actions.map(({ label }) => label), copy[language].actions);
      assert.ok(model.actions.every(({ glyph }) => typeof glyph === 'string' && glyph.length > 0));
      // Four buttons share one row on a 390px phone: keep every label short.
      assert.ok(model.actions.every(({ label }) => label.length <= 12), `labels fit: ${model.actions.map(({ label }) => label).join(', ')}`);
      // Окно и есть осмотр: ориентир объясняет себя целиком в момент открытия,
      // и объяснение, и приметная строка — сразу, без лишнего нажатия.
      const copyFor = findById(id).copy[language];
      assert.equal(model.description, `${copyFor.summary} ${copyFor.inspected}`);
      assert.ok(copyFor.summary.length > 40, `${id}/${language}: the summary explains nothing`);
      // And each available choice carries its own numbers on the button.
      for (const action of model.actions) {
        assert.ok(action.hint.length > 0, `${id}/${language}/${action.id} promises nothing`);
      }
    }
  }
});

/**
 * Every answer on every landmark needs a word on its button, not just figures.
 * The five road landmarks shipped without one: the buttons in hell read
 * «+23● · шум на весь этаж» with no verb in front of them, because their action
 * ids were never added to the shared registry. A hard-coded list of two
 * landmarks could not catch that, so this walks the whole catalogue.
 */
test('every answer on every landmark has a word on its button', () => {
  for (const landmark of LANDMARK_CATALOG) {
    const { find } = landmarkFixture(landmark.id);
    const target = { kind: 'find', ...find };
    const actor = { gold: 4000, vitals: { hp: 20, maxHp: 800, effects: {} } };
    for (const language of ['ru', 'en']) {
      const model = contextActionModel({ target, actor, language });
      assert.equal(model.interactionId, 'landmark');
      assert.equal(model.name, landmark.copy[language].name);
      assert.deepEqual(
        model.actions.map(({ id }) => id),
        [...landmark.outcomes.map(({ id }) => id)],
      );
      for (const action of model.actions) {
        assert.ok(action.label?.length > 0, `${landmark.id}/${language}/${action.id} has no label`);
        assert.ok(action.glyph?.length > 0, `${landmark.id}/${language}/${action.id} has no glyph`);
        // Every button shares one row on a 390px phone.
        assert.ok(
          action.label.length <= 12,
          `${landmark.id}/${language}/${action.id}: «${action.label}» will not fit`,
        );
      }
      // Two answers with the same word on them are one answer twice.
      const labels = model.actions.map(({ label }) => label);
      assert.equal(new Set(labels).size, labels.length, `${landmark.id}/${language} repeats a label`);
    }
  }
});

test('a landmark choice states its price and its payoff before it is taken', () => {
  for (const id of LANDMARK_CATALOG.map(({ id: found }) => found)) {
    const { find } = landmarkFixture(id);
    for (const key of Object.keys(find.outcomes)) {
      const outcome = find.outcomes[key];
      const ru = landmarkOutcomeSummary(outcome, 'ru');
      const en = landmarkOutcomeSummary(outcome, 'en');
      assert.ok(ru.length > 0, `${id}/${key} says nothing in Russian`);
      // Words have to be translated; a summary that is only figures and hearts
      // — «+35% {heal}» — reads the same in both languages and should. Метки
      // значков состоят из латиницы, но словами не являются: их снимаем.
      const безМеток = (text) => text.replace(/\{(gold|heal)\}/g, '');
      if (/\p{L}/u.test(безМеток(ru))) assert.notEqual(ru, en, `${id}/${key} was never translated`);
      // Every number the outcome carries has to reach the button. A cost that
      // is not shown is the whole reason the altar felt like a lottery.
      for (const [field, needle] of [
        ['costGold', `\u2212${outcome.costGold} {gold}`],
        ['rewardGold', `+${outcome.rewardGold} {gold}`],
        ['damage', `\u2212${outcome.damage} {heal}`],
        ['heal', `+${outcome.heal} {heal}`],
        ['rewardMaxHp', `+${outcome.rewardMaxHp} `],
        ['rewardPower', `+${outcome.rewardPower} `],
      ]) {
        if ((outcome[field] ?? 0) > 0) assert.ok(ru.includes(needle), `${id}/${key}: ${field} is not on the button — «${ru}»`);
      }
      if (outcome.status) {
        const effect = ACTOR_EFFECTS[outcome.status.id];
        assert.ok(ru.includes(effect.labels.ru.toLowerCase()), `${id}/${key}: the curse is not named`);
      }
      if (outcome.cleanse) assert.ok(ru.includes('снимает эффекты'));
      if ((outcome.noise ?? 0) > 0) assert.ok(ru.includes('шум'));
    }
  }
  assert.equal(landmarkOutcomeSummary(null), '');
  assert.equal(landmarkOutcomeSummary({}), '', 'an outcome with no consequence promises none');
});
