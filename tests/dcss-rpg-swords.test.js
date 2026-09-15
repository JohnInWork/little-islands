import assert from 'node:assert/strict';
import test from 'node:test';

import { lootById } from '../tools/dcss-rpg-content.js';
import { advanceRunFloor, createRun, hydrateDungeon, validateRun } from '../tools/dcss-rpg-core.js';
import { deriveSkillCapabilities } from '../tools/dcss-rpg-skills.js';
import {
  createSwordRhythmState,
  resolveSwordRhythmStrike,
  swordRhythmProfile,
  swordRhythmSource,
} from '../tools/dcss-rpg-swords.js';

function skillState(rank) {
  return { version: 1, points: 6 - rank, ranks: rank > 0 ? { swords: rank } : {} };
}

function strike({ state, rank, targetId = 'target-a', weapon = lootById('long-sword'), damage = 10 }) {
  return resolveSwordRhythmStrike({
    state,
    targetId,
    weapon,
    capabilities: deriveSkillCapabilities(skillState(rank)),
    baseDamage: damage,
  });
}

test('three sword ranks expose the promised hit intervals and damage bonuses', () => {
  const sword = lootById('long-sword');
  const expected = [
    { rank: 0, hitInterval: 0, bonusPercent: 0 },
    { rank: 1, hitInterval: 4, bonusPercent: 40 },
    { rank: 2, hitInterval: 3, bonusPercent: 60 },
    { rank: 3, hitInterval: 2, bonusPercent: 80 },
  ];
  for (let rank = 0; rank <= 3; rank += 1) {
    assert.deepEqual(
      swordRhythmProfile(sword, deriveSkillCapabilities(skillState(rank))),
      expected[rank],
    );
  }
  assert.deepEqual(
    swordRhythmProfile(lootById('war-axe'), deriveSkillCapabilities(skillState(3))),
    expected[0],
  );
});

test('rank I empowers exactly every fourth successful hit and then starts a new rhythm', () => {
  let state = createSwordRhythmState();
  const results = [];
  for (let hit = 0; hit < 8; hit += 1) {
    const result = strike({ state, rank: 1 });
    state = result.state;
    results.push({ empowered: result.empowered, damage: result.damage, chain: result.chain });
  }
  assert.deepEqual(results, [
    { empowered: false, damage: 10, chain: 1 },
    { empowered: false, damage: 10, chain: 2 },
    { empowered: false, damage: 10, chain: 3 },
    { empowered: true, damage: 14, chain: 4 },
    { empowered: false, damage: 10, chain: 1 },
    { empowered: false, damage: 10, chain: 2 },
    { empowered: false, damage: 10, chain: 3 },
    { empowered: true, damage: 14, chain: 4 },
  ]);
});

test('ranks II and III use their own cadence without rounding a real bonus to zero', () => {
  let rankTwo = createSwordRhythmState();
  for (let hit = 1; hit <= 3; hit += 1) {
    const result = strike({ state: rankTwo, rank: 2, damage: 1 });
    rankTwo = result.state;
    assert.equal(result.empowered, hit === 3);
    assert.equal(result.damage, hit === 3 ? 2 : 1);
  }
  let rankThree = createSwordRhythmState();
  const first = strike({ state: rankThree, rank: 3 });
  rankThree = first.state;
  const second = strike({ state: rankThree, rank: 3 });
  assert.equal(first.damage, 10);
  assert.equal(second.damage, 18);
  assert.equal(second.empowered, true);
});

test('changing target or the equipped sword restarts the chain while movement does not exist in the rule', () => {
  const sword = { ...lootById('long-sword'), uid: 'first-sword' };
  let state = createSwordRhythmState();
  state = strike({ state, rank: 3, weapon: sword }).state;
  const targetChanged = strike({ state, rank: 3, targetId: 'target-b', weapon: sword });
  assert.equal(targetChanged.empowered, false);
  assert.equal(targetChanged.chain, 1);

  const weaponChanged = strike({
    state: targetChanged.state,
    rank: 3,
    targetId: 'target-b',
    weapon: { ...lootById('iron-falchion'), uid: 'second-sword' },
  });
  assert.equal(weaponChanged.empowered, false);
  assert.equal(weaponChanged.chain, 1);
});

test('dual wield chooses one sword source per attack cycle', () => {
  const sword = lootById('long-sword');
  const rapier = lootById('duelist-rapier');
  const axe = lootById('war-axe');
  assert.deepEqual(swordRhythmSource(sword, rapier), { slot: 'primary', weapon: sword });
  assert.deepEqual(swordRhythmSource(axe, rapier), { slot: 'secondary', weapon: rapier });
  assert.equal(swordRhythmSource(axe, lootById('short-blade')), null);
});

test('owned sword mastery survives reload and descent while hit rhythm remains transient', () => {
  const run = createRun(0x5a0d);
  run.hero.level = 6;
  run.hero.skills = { version: 1, points: 2, ranks: { swords: 3 } };
  assert.equal(validateRun(run), true);
  const reloaded = JSON.parse(JSON.stringify(run));
  assert.doesNotThrow(() => hydrateDungeon(reloaded));
  assert.deepEqual(reloaded.hero.skills, run.hero.skills);
  assert.equal(Object.hasOwn(reloaded.hero, 'swordRhythm'), false);
  const next = advanceRunFloor(reloaded);
  assert.deepEqual(next.hero.skills, run.hero.skills);
  assert.equal(Object.hasOwn(next.hero, 'swordRhythm'), false);
});

test('the expanded sword family has visible one- and two-handed choices', () => {
  const swords = [
    lootById('long-sword'),
    lootById('duelist-rapier'),
    lootById('iron-falchion'),
    lootById('dungeon-greatsword'),
    lootById('sword-of-power'),
  ];
  assert.ok(swords.every((item) => item?.weaponFamily === 'sword'));
  assert.ok(swords.filter(({ hands }) => hands === 1).length >= 3);
  assert.ok(swords.filter(({ hands }) => hands === 2).length >= 2);
  assert.equal(new Set(swords.map(({ variant }) => variant)).size, swords.length);
});
