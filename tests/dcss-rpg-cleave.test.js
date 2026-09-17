import assert from 'node:assert/strict';
import test from 'node:test';

import { lootById } from '../tools/dcss-rpg-content.js';
import { advanceRunFloor, createRun, hydrateDungeon, validateRun } from '../tools/dcss-rpg-core.js';
import {
  axeCleaveDamage,
  axeCleaveProfile,
  selectAxeCleaveTargets,
} from '../tools/dcss-rpg-cleave.js';
import { deriveSkillCapabilities } from '../tools/dcss-rpg-skills.js';

const TILE = 64;
const actor = (instanceId, x, y, dead = 0) => ({
  instanceId,
  x: (x + 0.5) * TILE,
  y: (y + 0.5) * TILE,
  dead,
});
const openGrid = () => Array.from({ length: 7 }, (_, y) =>
  Array.from({ length: 7 }, (_, x) => (x === 0 || y === 0 || x === 6 || y === 6 ? '#' : '.')));

function skillState(rank) {
  return { version: 1, points: 6 - rank, ranks: rank > 0 ? { axes: rank } : {} };
}

test('one-handed and two-handed axes share mastery but keep distinct cleave profiles', () => {
  const oneHanded = lootById('war-axe');
  const twoHanded = lootById('executioner-axe');
  const sword = lootById('long-sword');
  const empty = { rank: 0, damagePercent: 0, maxTargets: 0, grip: null };
  const oneHandedExpected = [
    empty,
    { rank: 1, damagePercent: 25, maxTargets: 1, grip: 'one-handed' },
    { rank: 2, damagePercent: 40, maxTargets: 1, grip: 'one-handed' },
    { rank: 3, damagePercent: 55, maxTargets: 1, grip: 'one-handed' },
  ];
  const twoHandedExpected = [
    empty,
    { rank: 1, damagePercent: 35, maxTargets: 1, grip: 'two-handed' },
    { rank: 2, damagePercent: 60, maxTargets: 1, grip: 'two-handed' },
    { rank: 3, damagePercent: 80, maxTargets: 2, grip: 'two-handed' },
  ];
  for (let rank = 0; rank <= 3; rank += 1) {
    const capabilities = deriveSkillCapabilities(skillState(rank));
    assert.deepEqual(axeCleaveProfile(oneHanded, capabilities), oneHandedExpected[rank]);
    assert.deepEqual(axeCleaveProfile(twoHanded, capabilities), twoHandedExpected[rank]);
    assert.deepEqual(axeCleaveProfile(sword, capabilities), empty);
  }
});

test('cleave damage is bounded, rounded and never turns a real hit into zero', () => {
  assert.equal(axeCleaveDamage(10, { damagePercent: 35 }), 4);
  assert.equal(axeCleaveDamage(1, { damagePercent: 35 }), 1);
  assert.equal(axeCleaveDamage(10, { damagePercent: 80 }), 8);
  assert.equal(axeCleaveDamage(0, { damagePercent: 80 }), 0);
});

test('cleave deterministically hits only nearby living enemies in the forward swing', () => {
  const grid = openGrid();
  const hero = actor('hero', 2, 3);
  const primary = actor('primary', 3, 3);
  const upper = actor('upper', 3, 2);
  const behindPrimary = actor('behind-primary', 4, 3);
  const lower = actor('lower', 3, 4);
  const behindHero = actor('behind-hero', 1, 3);
  const dead = actor('dead', 4, 4, 0.4);
  const profile = { rank: 3, damagePercent: 80, maxTargets: 2 };
  const candidates = [lower, dead, behindHero, primary, upper, behindPrimary];
  const selected = selectAxeCleaveTargets({
    grid, attacker: hero, primary, candidates, profile, tileSize: TILE,
  });
  const reversed = selectAxeCleaveTargets({
    grid, attacker: hero, primary, candidates: [...candidates].reverse(), profile, tileSize: TILE,
  });
  assert.deepEqual(selected.map(({ instanceId }) => instanceId), ['behind-primary', 'lower']);
  assert.deepEqual(reversed.map(({ instanceId }) => instanceId), ['behind-primary', 'lower']);
});

test('cleave cannot reach through dungeon walls and lower ranks stop after one target', () => {
  const grid = openGrid();
  grid[2][3] = '#';
  const hero = actor('hero', 1, 1);
  const primary = actor('primary', 2, 1);
  const blocked = actor('blocked', 3, 2);
  const open = actor('open', 2, 2);
  const selected = selectAxeCleaveTargets({
    grid,
    attacker: hero,
    primary,
    candidates: [blocked, open],
    profile: { rank: 1, damagePercent: 35, maxTargets: 1 },
    tileSize: TILE,
  });
  assert.deepEqual(selected.map(({ instanceId }) => instanceId), ['open']);
});

test('an owned axe rank survives JSON reload and floor descent without transient combat state', () => {
  const run = createRun(0xa8e5);
  run.hero.level = 6;
  run.hero.skills = { version: 1, points: 2, ranks: { axes: 3 } };
  assert.equal(validateRun(run), true);
  const reloaded = JSON.parse(JSON.stringify(run));
  assert.doesNotThrow(() => hydrateDungeon(reloaded));
  assert.deepEqual(reloaded.hero.skills, run.hero.skills);
  const next = advanceRunFloor(reloaded);
  assert.deepEqual(next.hero.skills, run.hero.skills);
  assert.deepEqual(
    axeCleaveProfile(lootById('executioner-axe'), deriveSkillCapabilities(next.hero.skills)),
    { rank: 3, damagePercent: 80, maxTargets: 2, grip: 'two-handed' },
  );
});

test('a saved one-handed axe keeps its off-hand item through reload and floor descent', () => {
  const run = createRun(0xa8e6);
  run.items.find(({ uid }) => uid === 'starter-sword').id = 'war-axe';
  // A run starts without a shield; give this hero a found buckler to keep.
  run.items.push({ id: 'wood-buckler', uid: 'found-buckler', affixIds: [], artifactPowerId: null, artifactCurseId: null });
  run.equipment.hand2 = 'found-buckler';
  assert.equal(validateRun(run), true);
  const reloaded = JSON.parse(JSON.stringify(run));
  assert.doesNotThrow(() => hydrateDungeon(reloaded));
  assert.equal(reloaded.equipment.hand1, 'starter-sword');
  assert.equal(reloaded.equipment.hand2, 'found-buckler');
  const next = advanceRunFloor(reloaded);
  assert.equal(next.equipment.hand1, 'starter-sword');
  assert.equal(next.equipment.hand2, 'found-buckler');
  assert.equal(next.items.find(({ uid }) => uid === 'starter-sword').id, 'war-axe');
});
