import assert from 'node:assert/strict';
import test from 'node:test';

import { createRun, advanceRunFloor, generateDungeon, hydrateDungeon, migrateLegacyRun, validateRun, SAVE_KEY, SAVE_VERSION } from '../tools/dcss-rpg-core.js';
import { createSkillState, learnSkill } from '../tools/dcss-rpg-skills.js';
import { skillById } from '../tools/dcss-rpg-skill-content.js';
import { awardHeroExperience } from '../tools/dcss-rpg-progression.js';
import { deriveHeroStats } from '../tools/dcss-rpg-rules.js';
import { lootById } from '../tools/dcss-rpg-content.js';

const materialize = (run) => run.items.map((item) => ({ ...lootById(item.id), ...item }));
const v9Fixture = () => {
  const run = createRun(9913);
  run.version = 9;
  delete run.knowledge;
  run.hero.level = 4;
  run.hero.maxHp = 118;
  run.hero.hp = 79;
  run.hero.power = 4;
  delete run.hero.skills;
  delete run.floor.detectedTrapIds;
  delete run.floor.placedTraps;
  run.difficulty = 1.75;
  run.started = true;
  const level = generateDungeon({ seed: run.seed, depth: run.depth, difficulty: run.difficulty });
  run.floor.opened = level.doors.slice(0, 1).map(({ instanceId }) => instanceId);
  run.floor.revealed = [`${run.hero.x},${run.hero.y}`];
  run.floor.defeated = [level.monsters[0].instanceId];
  run.floor.collected = [level.loot[0].instanceId];
  run.floor.monsters = [{ ...level.monsters[1], hp: 3 }].map(({ instanceId, x, y, hp }) => ({ instanceId, x, y, hp }));
  run.floor.passives = level.passiveCreatures.slice(0, 1).map(({ instanceId, x, y }) => ({
    instanceId,
    x,
    y,
    facing: -1,
    wanderStep: 8,
    hunted: false,
    defeated: false,
    hp: 1,
    attackSequence: 0,
  }));
  return run;
};

test('v9 migration grants earned skill points and preserves difficulty across the floor rebase', () => {
  const legacy = v9Fixture();
  const before = structuredClone(legacy);
  const next = migrateLegacyRun(legacy);
  assert.equal(next.version, SAVE_VERSION);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v43');
  assert.deepEqual(next.hero.skills, createSkillState(4));
  assert.equal(next.difficulty, before.difficulty);
  assert.equal(next.hero.hp, before.hero.hp);
  assert.equal(next.hero.level, before.hero.level);
  assert.equal(next.hero.power, before.hero.power);
  assert.deepEqual(next.equipment, before.equipment);
  assert.deepEqual(next.inventory, before.inventory);
  const { chests, ...floorWithoutChests } = next.floor;
  assert.deepEqual(floorWithoutChests, {
    revealed: [], defeated: [], collected: [], resolved: [], resolvedFindIds: [],
    detectedTrapIds: [], disarmedTrapIds: [], placedTraps: [], opened: [],
    triggered: [], monsters: [], passives: [], camp: null, merchants: [],
  });
  assert.ok(chests.length > 0);
  assert.equal(next.started, false);
  assert.deepEqual(legacy, before);
  assert.equal(validateRun(next), true);
  assert.doesNotThrow(() => hydrateDungeon(next));
  assert.deepEqual(JSON.parse(JSON.stringify(next)).hero.skills, next.hero.skills);
});

test('save validation rejects unearned points, missing new skill state and corrupt ranks', () => {
  const run = createRun(813);
  assert.equal(validateRun(run), true);
  for (const skills of [undefined, null, { version: 1, points: 1, ranks: {} }, { version: 1, points: 0, ranks: { unknown: 1 } }]) {
    assert.equal(validateRun({ ...run, hero: { ...run.hero, skills } }), false);
  }
  const badLegacy = v9Fixture();
  badLegacy.hero.skills = { version: 1, points: 999, ranks: {} };
  assert.throws(() => migrateLegacyRun(badLegacy));
});

test('experience awards one point per actual level, including multiple levels at once', () => {
  const run = createRun(127);
  run.hero.hp = 50;
  const original = structuredClone(run.hero);
  const result = awardHeroExperience({ hero: run.hero, amount: 60, equipment: run.equipment, items: materialize(run) });
  assert.equal(result.hero.level, 3);
  assert.equal(result.hero.xp, 6);
  assert.equal(result.hero.power, 3);
  assert.equal(result.hero.maxHp, 112);
  assert.equal(result.hero.hp, 62);
  assert.deepEqual(result.hero.skills, createSkillState(3));
  assert.equal(result.levelsGained, 2);
  assert.equal(result.skillPointsGained, 2);
  assert.deepEqual(run.hero, original);
  const idle = awardHeroExperience({ hero: result.hero, amount: 0, equipment: run.equipment, items: materialize(run) });
  assert.deepEqual(idle.hero, result.hero);
  assert.equal(idle.skillPointsGained, 0);
  assert.throws(() => awardHeroExperience({ hero: result.hero, amount: -1, equipment: run.equipment, items: materialize(run) }));
});

test('skill state survives floor descent and terminal reload, but a new run starts empty', () => {
  const run = migrateLegacyRun(v9Fixture());
  const next = advanceRunFloor(run);
  assert.deepEqual(next.hero.skills, run.hero.skills);
  assert.notEqual(next.hero.skills, run.hero.skills);
  next.hero.skills.points -= 1;
  assert.equal(run.hero.skills.points, 3);
  run.hero.hp = 0;
  run.status = 'dead';
  assert.equal(validateRun(run), true);
  assert.doesNotThrow(() => hydrateDungeon(JSON.parse(JSON.stringify(run))));
  assert.throws(() => advanceRunFloor(run));
  assert.deepEqual(createRun(run.seed).hero.skills, createSkillState());
});

test('dormant skill foundation keeps current gear and combat stats identical', () => {
  const run = createRun(411);
  const items = materialize(run);
  const withoutSkills = { ...run.hero };
  delete withoutSkills.skills;
  assert.deepEqual(deriveHeroStats(run.hero, run.equipment, items), deriveHeroStats(withoutSkills, run.equipment, items));
});

test('ready skill bonuses compose with gear without accumulating, and disabled ranks stay saved', () => {
  const run = createRun(411);
  run.hero.level = 2;
  run.hero.skills = createSkillState(2);
  const items = materialize(run);
  const before = deriveHeroStats(run.hero, run.equipment, items);
  // Test-only registration exercises the shared stat pipeline, not a released skill.
  const options = {
    systems: skillById('endurance').requiresSystems,
    implementations: {
      endurance: {
        version: 1,
        modifiersByRank: [{ maxHp: 12 }, { maxHp: 24 }, { maxHp: 36 }],
        capabilitiesByRank: [{}, {}, {}],
      },
    },
  };
  const learned = learnSkill({
    state: run.hero.skills, heroLevel: 2, runStatus: 'playing',
    skillId: 'endurance', expectedRank: 0, ...options,
  });
  assert.equal(learned.ok, true);
  run.hero.skills = learned.state;
  const withSkill = deriveHeroStats(run.hero, run.equipment, items, options);
  assert.deepEqual(withSkill, { ...before, maxHp: before.maxHp + 12 });
  assert.deepEqual(deriveHeroStats(run.hero, run.equipment, items, options), withSkill);
  assert.equal(deriveHeroStats(run.hero, {}, items, options).maxHp, run.hero.maxHp + 12);
  assert.deepEqual(deriveHeroStats(run.hero, run.equipment, items), before);
  assert.equal(validateRun(run), true);
  assert.deepEqual(advanceRunFloor(run).hero.skills, learned.state);
});
