import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ATTRIBUTE_BASE,
  ATTRIBUTE_IDS,
  ATTRIBUTE_MAX,
  DEFAULT_RANK_REQUIREMENTS,
  SKILL_ATTRIBUTES,
  attributeCopy,
  attributeRefusalText,
  createAttributeState,
  meetsRequirement,
  raiseAttribute,
  skillRankRequirement,
  validateAttributeState,
} from '../tools/dcss-rpg-attributes.js';
import { SKILL_CATALOG, skillById } from '../tools/dcss-rpg-skill-content.js';
import {
  createSkillState,
  grantSkillPoints,
  learnSkill,
  skillAvailability,
  validateSkillState,
} from '../tools/dcss-rpg-skills.js';
import { createRun, validateRun } from '../tools/dcss-rpg-core.js';
import { deriveHeroStats } from '../tools/dcss-rpg-rules.js';

/**
 * «Три характеристики: сила, ловкость, интеллект. На новом уровне очки можно
 * вложить просто в характеристику, а не обязательно в навык. Первые уровни
 * навыков берутся свободно, дальше требуют характеристику по смыслу.»
 */
test('a new hero has three attributes at the base, and a preset may raise one', () => {
  const state = createAttributeState();
  assert.deepEqual(
    ATTRIBUTE_IDS.map((id) => state[id]),
    [ATTRIBUTE_BASE, ATTRIBUTE_BASE, ATTRIBUTE_BASE],
  );
  assert.equal(state.spent, 0);
  assert.equal(validateAttributeState(state), true);

  // A clever build starts cleverer, and that costs nobody a point.
  const clever = createAttributeState({ intelligence: 5 });
  assert.equal(clever.intelligence, 5);
  assert.equal(clever.spent, 0);

  // A save has to be a save: no extra keys, no values out of range.
  assert.equal(validateAttributeState({ ...state, luck: 4 }), false);
  assert.equal(validateAttributeState({ ...state, strength: 0 }), false);
  assert.equal(validateAttributeState({ ...state, strength: ATTRIBUTE_MAX + 1 }), false);
  assert.equal(validateAttributeState({ ...state, spent: -1 }), false);
  assert.equal(validateAttributeState(null), false);

  const run = createRun(9);
  assert.equal(validateRun(run), true);
  assert.equal(validateAttributeState(run.hero.attributes), true);
  assert.equal(run.hero.intelligence, undefined, 'the lone Intelligence field is still there');
});

test('a point can go into an attribute, and never comes back out', () => {
  const attributes = createAttributeState();
  const first = raiseAttribute({ attributes, points: 3, attribute: 'strength' });
  assert.equal(first.ok, true);
  assert.equal(first.attributes.strength, ATTRIBUTE_BASE + 1);
  assert.equal(first.attributes.spent, 1);
  assert.equal(first.points, 2, 'the pool did not pay for it');
  // The other two are untouched: a point buys one number, not a level.
  assert.equal(first.attributes.agility, ATTRIBUTE_BASE);
  assert.equal(first.attributes.intelligence, ATTRIBUTE_BASE);

  assert.equal(raiseAttribute({ attributes, points: 0, attribute: 'agility' }).reason, 'no-points');
  assert.equal(raiseAttribute({ attributes, points: 2, attribute: 'luck' }).reason, 'unknown-attribute');
  assert.equal(
    raiseAttribute({ attributes, points: 2, attribute: 'agility', runStatus: 'dead' }).reason,
    'not-playing',
  );
  const maxed = createAttributeState({ strength: ATTRIBUTE_MAX });
  assert.equal(raiseAttribute({ attributes: maxed, points: 5, attribute: 'strength' }).reason, 'at-maximum');
  for (const reason of ['no-points', 'at-maximum', 'not-playing']) {
    assert.ok(attributeRefusalText(reason, 'ru').length > 0, reason);
    assert.ok(attributeRefusalText(reason, 'en').length > 0, reason);
  }
  assert.notEqual(attributeRefusalText('no-points', 'ru'), attributeRefusalText('no-points', 'en'));
});

/**
 * The half of the rule that protects a new player: the first rank of anything
 * is free. Without it a hero who has chosen nothing yet could learn nothing at
 * all, which is the opposite of what an attribute is for.
 */
test('every skill leans on one attribute, the first rank is free and the rest are not', () => {
  const missing = SKILL_CATALOG.filter(({ id }) => !SKILL_ATTRIBUTES[id] && !skillById(id).attributeRequirements);
  assert.deepEqual(missing.map(({ id }) => id), [], 'these skills would be free for ever');
  for (const id of Object.keys(SKILL_ATTRIBUTES)) {
    assert.ok(skillById(id), `${id} is not a skill`);
    assert.ok(ATTRIBUTE_IDS.includes(SKILL_ATTRIBUTES[id]), `${id} leans on nothing`);
  }

  const axes = skillById('axes');
  assert.equal(skillRankRequirement(axes, 0), null, 'the first rank of axes is not free');
  assert.deepEqual(skillRankRequirement(axes, 1), {
    attribute: 'strength',
    value: DEFAULT_RANK_REQUIREMENTS[1],
  });
  assert.deepEqual(skillRankRequirement(axes, 2), {
    attribute: 'strength',
    value: DEFAULT_RANK_REQUIREMENTS[2],
  });

  // A school that authored its own ladder keeps it — magic asks from rank one.
  assert.deepEqual(skillRankRequirement(skillById('pyromancy'), 0), { attribute: 'intelligence', value: 4 });
  // Daggers are fingers, swords are shoulders, alchemy is a head.
  assert.equal(skillRankRequirement(skillById('daggers'), 1).attribute, 'agility');
  assert.equal(skillRankRequirement(skillById('swords'), 1).attribute, 'strength');
  assert.equal(skillRankRequirement(skillById('alchemy'), 1).attribute, 'intelligence');

  assert.equal(meetsRequirement(null, {}), true);
  assert.equal(meetsRequirement({ attribute: 'strength', value: 5 }, { strength: 5 }), true);
  assert.equal(meetsRequirement({ attribute: 'strength', value: 5 }, { strength: 4 }), false);
  assert.equal(meetsRequirement({ attribute: 'strength', value: 5 }, {}), false);
});

test('the second rank of a skill waits for the number it leans on', () => {
  const base = { strength: ATTRIBUTE_BASE, agility: ATTRIBUTE_BASE, intelligence: ATTRIBUTE_BASE };
  const command = (state, heroLevel, expectedRank, attributes) => ({
    state, heroLevel, runStatus: 'playing', skillId: 'swords', expectedRank, attributes,
  });

  // Rank one on a hero who has put nothing anywhere.
  let state = createSkillState(2);
  const firstRank = learnSkill(command(state, 2, 0, base));
  assert.equal(firstRank.ok, true, 'the first rank asked for strength');
  state = firstRank.state;

  // Rank two does not, until the shoulders are there.
  state = grantSkillPoints(state, 2, 4);
  const tooWeak = skillAvailability(command(state, 4, 1, base));
  assert.equal(tooWeak.ok, false);
  assert.equal(tooWeak.reason, 'strength-required');
  assert.equal(tooWeak.requiredAttribute, 'strength');
  assert.equal(tooWeak.requiredValue, DEFAULT_RANK_REQUIREMENTS[1]);

  const strong = { ...base, strength: DEFAULT_RANK_REQUIREMENTS[1] };
  assert.equal(skillAvailability(command(state, 4, 1, strong)).ok, true);

  // And strength does nothing for a skill that leans on the head.
  const arcana = skillAvailability({
    state, heroLevel: 4, runStatus: 'playing', skillId: 'appraisal', expectedRank: 0, attributes: strong,
  });
  assert.notEqual(arcana.reason, 'strength-required');
});

/**
 * Every point a hero has ever earned is in exactly one of three places: the
 * pocket, a skill, or an attribute. The skill state used to hold the whole of
 * that sum and could check it alone; now it is told what left for an attribute.
 */
test('the level accounts for every point, including the ones that became attributes', () => {
  const state = createSkillState(5); // four points earned
  assert.equal(validateSkillState(state, 5), true);
  assert.equal(validateSkillState(state, 5, 1), false, 'a point went missing and nothing noticed');

  const spentTwo = { ...state, points: 2 };
  assert.equal(validateSkillState(spentTwo, 5), false);
  assert.equal(validateSkillState(spentTwo, 5, 2), true, 'two points in attributes do not add up');
  assert.equal(validateSkillState(spentTwo, 5, -1), false);

  // And the run says the same thing end to end.
  const run = createRun(11);
  run.hero.level = 3;
  run.hero.skills = createSkillState(3);
  assert.equal(validateRun(run), true);
  run.hero.skills = { ...run.hero.skills, points: 0 };
  assert.equal(validateRun(run), false, 'two points vanished and the save still loaded');
  run.hero.attributes = createAttributeState({ strength: 5, spent: 2 });
  assert.equal(validateRun(run), true);
});

test('an attribute is felt the moment it is raised, not only when it unlocks something', () => {
  const equipment = {};
  const items = [];
  const hero = {
    power: 1, maxHp: 20, hunger: 3600, meal: null,
    attributes: createAttributeState(),
  };
  const plain = deriveHeroStats(hero, equipment, items, {});
  const mighty = deriveHeroStats(
    { ...hero, attributes: createAttributeState({ strength: ATTRIBUTE_BASE + 8 }) },
    equipment, items, {},
  );
  assert.ok(mighty.attack > plain.attack, 'eight points of strength changed nothing');

  const quick = deriveHeroStats(
    { ...hero, attributes: createAttributeState({ agility: ATTRIBUTE_BASE + 8 }) },
    equipment, items, {},
  );
  assert.ok(quick.attackSpeed > plain.attackSpeed, 'eight points of agility changed nothing');

  // Intelligence still feeds magic, which is where it always went.
  const clever = deriveHeroStats(
    { ...hero, attributes: createAttributeState({ intelligence: 9 }) },
    equipment, items, {},
  );
  assert.equal(clever.intelligence, 9);
});

test('the sheet shows the three and spends the pool they share', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const markup = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  assert.match(markup, /id="character-attribute-rows"/);
  assert.match(runtime, /function renderCharacterAttributes\(\)/);
  // One pocket, two things to buy: raising an attribute spends a skill point.
  const raise = runtime.slice(runtime.indexOf('function raiseHeroAttribute(attribute)'));
  const body = raise.slice(0, raise.indexOf('\nfunction '));
  assert.match(body, /points: hero\.skills\.points/);
  assert.match(body, /hero\.skills = \{ \.\.\.hero\.skills, points: result\.points/);
  // Sleeping gates it exactly the way it gates a skill.
  assert.match(body, /if \(!canSpendSkillPoints\(hero\.rest\)\) return 'needs-sleep';/);
  assert.match(body, /persistRun\(\);/);
  // And the skill menu is told the hero's real three, not a guess.
  assert.ok(
    runtime.includes('attributes: hero.attributes'),
    'the skill menu still asks about intelligence alone',
  );
  const copy = attributeCopy('ru');
  for (const id of ATTRIBUTE_IDS) {
    assert.ok(copy[id].name.length > 0 && copy[id].description.length > 0, id);
  }
  assert.notEqual(attributeCopy('en').strength.name, copy.strength.name);
});
