import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { lootById } from '../tools/dcss-rpg-content.js';
import {
  SKILL_IMPLEMENTATIONS,
  SKILL_SYSTEMS,
  createSkillState,
  deriveSkillCapabilities,
  isSkillReady,
} from '../tools/dcss-rpg-skills.js';
import { skillById } from '../tools/dcss-rpg-skill-content.js';
import { WHIP_REACH, whipProfile, whipPull } from '../tools/dcss-rpg-whips.js';
import { channelSpellCooldowns, isStaff, staffProfile } from '../tools/dcss-rpg-staves.js';

const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');

function trainedTo(skillId, rank) {
  const level = 1 + rank * 2;
  const state = createSkillState(level);
  state.ranks[skillId] = rank;
  state.points = level - 1 - rank;
  return deriveSkillCapabilities(state);
}

test('both families that had no skill now have one, and it is connected', () => {
  for (const id of ['whip-control', 'staff-channeling']) {
    const definition = skillById(id);
    assert.ok(definition, `${id} is missing from the catalog`);
    assert.equal(definition.category, 'combat');
    assert.ok(definition.name.ru.length > 2 && definition.name.en.length > 2);
    assert.ok(Object.hasOwn(SKILL_IMPLEMENTATIONS, id), `${id} has no implementation`);
    for (const system of definition.requiresSystems) {
      assert.ok(SKILL_SYSTEMS.includes(system), `${id} needs an unregistered system ${system}`);
    }
    assert.equal(isSkillReady(id), true, `${id} is declared but not shippable`);
  }
});

test('whip control breaks a raised attack, lengthens the lash, then drags twice', () => {
  assert.deepEqual(whipProfile({}), { rank: 0, interrupt: false, reach: WHIP_REACH, pullCells: 1 });
  const first = whipProfile(trainedTo('whip-control', 1));
  const second = whipProfile(trainedTo('whip-control', 2));
  const third = whipProfile(trainedTo('whip-control', 3));
  assert.equal(first.interrupt, true, 'rank I is the answer to a raised attack');
  assert.equal(first.reach, WHIP_REACH);
  assert.equal(second.reach, 3, 'rank II lengthens the lash');
  assert.equal(second.pullCells, 1);
  assert.equal(third.pullCells, 2, 'rank III drags twice as far');

  const whip = lootById('bullwhip');
  const open = { weapon: whip, attacker: { x: 4.5, y: 4.5 }, target: { x: 7.5, y: 4.5 }, isFree: () => true };
  assert.deepEqual(whipPull({ ...open, profile: first }).cell, { x: 6, y: 4 });
  assert.deepEqual(whipPull({ ...open, profile: third }).cell, { x: 5, y: 4 });
  assert.equal(whipPull({ ...open, profile: first }).interrupt, true);
  assert.equal(whipPull({ ...open, profile: whipProfile({}) }).interrupt, false);
});

test('the long drag stops at a wall instead of pulling a body through it', () => {
  const whip = lootById('bullwhip');
  const third = whipProfile(trainedTo('whip-control', 3));
  // Only the first step is clear; the second cell is wall, so the pull is short.
  const pull = whipPull({
    weapon: whip,
    attacker: { x: 4.5, y: 4.5 },
    target: { x: 7.5, y: 4.5 },
    isFree: (x) => x === 6,
    profile: third,
  });
  assert.deepEqual(pull.cell, { x: 6, y: 4 });
  // And it never drags a body onto the hero's own cell.
  const close = whipPull({
    weapon: whip,
    attacker: { x: 4.5, y: 4.5 },
    target: { x: 6.5, y: 4.5 },
    isFree: () => true,
    profile: third,
  });
  assert.deepEqual(close.cell, { x: 5, y: 4 });
});

test('a staff hit pays the caster back, and only a staff does', () => {
  const staff = lootById('apprentice-staff');
  const sword = lootById('long-sword');
  assert.equal(isStaff(staff), true);
  assert.equal(isStaff(sword), false);
  assert.equal(staffProfile(sword, trainedTo('staff-channeling', 3)).rank, 0, 'the skill is not a free buff');

  const first = staffProfile(staff, trainedTo('staff-channeling', 1));
  const second = staffProfile(staff, trainedTo('staff-channeling', 2));
  const third = staffProfile(staff, trainedTo('staff-channeling', 3));
  assert.ok(first.channelSeconds > 0);
  assert.ok(second.channelSeconds > first.channelSeconds);
  assert.equal(second.rangeBonus, 1, 'rank II lengthens the bolt');
  assert.equal(first.pierceTargets, 0);
  assert.equal(third.pierceTargets, 1, 'rank III passes through the first body');
});

test('channelling takes time off held spells without reviving a ready one', () => {
  const profile = staffProfile(lootById('apprentice-staff'), trainedTo('staff-channeling', 2));
  const before = { 'ember-bolt': 3, 'frost-lance': 0.4 };
  const after = channelSpellCooldowns(before, profile);
  assert.equal(after.changed, true);
  assert.ok(after.cooldowns['ember-bolt'] < 3);
  assert.equal(Object.hasOwn(after.cooldowns, 'frost-lance'), false, 'a spell that came back is simply ready');
  // Nothing to channel is not a change, and the same object comes back.
  const idle = channelSpellCooldowns({}, profile);
  assert.equal(idle.changed, false);
  assert.equal(channelSpellCooldowns(before, staffProfile(lootById('apprentice-staff'), {})).changed, false);
});

test('the runtime reads both skills where range and impact are actually decided', () => {
  // The reach two skills buy belongs in one place, not scattered over the checks.
  assert.match(runtime, /whipProfile\(capabilities\)\.reach/);
  assert.match(runtime, /staffProfile\(primary, capabilities\)\.rangeBonus/);
  assert.match(runtime, /profile: currentWhipProfile\(\)/);
  assert.match(runtime, /channelSpellCooldowns\(spellCooldowns/);
  assert.match(runtime, /pull\.interrupt && monster\.attackWindup > 0/);
});
