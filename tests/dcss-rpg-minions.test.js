import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import test from 'node:test';

import {
  MINION_BLUEPRINTS,
  MINION_FOLLOW_DISTANCE,
  MINION_LEASH_DISTANCE,
  MINION_SPELL_IDS,
  NECROMANCY_POWER_PERCENT,
  isMinionSpell,
  minionBlueprint,
  minionCopy,
  minionIntent,
  minionRespawnSeconds,
  minionStats,
  necromancyProfile,
} from '../tools/dcss-rpg-minions.js';
import { SPELL_CATALOG, spellById } from '../tools/dcss-rpg-spells.js';
import { lootById, monsterById } from '../tools/dcss-rpg-content.js';
import { itemDetails } from '../tools/dcss-rpg-item-details.js';
import { floorScaling, monsterEligibleForFloor } from '../tools/dcss-rpg-scaling.js';
import {
  SKILL_CAPABILITY_LIMITS,
  SKILL_SYSTEMS,
  createSkillState,
  deriveSkillCapabilities,
  isSkillReady,
  learnSkill,
} from '../tools/dcss-rpg-skills.js';

const capabilitiesAt = (rank) => {
  let state = createSkillState(10);
  for (let step = 0; step < rank; step += 1) {
    state = learnSkill({
      state, heroLevel: 10, runStatus: 'playing', skillId: 'necromancy', expectedRank: step,
    }).state;
  }
  return deriveSkillCapabilities(state);
};

test('a servant is worth what the caster knows', () => {
  assert.deepEqual([...MINION_SPELL_IDS], ['raise-skeleton', 'raise-ghoul']);
  assert.equal(isMinionSpell('raise-skeleton'), true);
  assert.equal(isMinionSpell('ember-bolt'), false);

  const blueprint = minionBlueprint('raise-skeleton');
  const plain = minionStats({ blueprint, intelligence: 0, profile: necromancyProfile({}) });
  assert.equal(plain.maxHp, blueprint.baseHp);
  assert.equal(plain.respawnSeconds, blueprint.respawnSeconds);

  const clever = minionStats({ blueprint, intelligence: 8, profile: necromancyProfile({}) });
  assert.ok(clever.maxHp > plain.maxHp, 'intelligence raises a sturdier servant');
  assert.ok(clever.damage > plain.damage);

  const master = minionStats({ blueprint, intelligence: 8, profile: necromancyProfile(capabilitiesAt(3)) });
  assert.ok(master.maxHp > clever.maxHp, 'and the school raises it further');
  assert.ok(master.respawnSeconds < clever.respawnSeconds, 'and brings it back sooner');
  assert.equal(minionStats({ blueprint: null }), null);
});

test('the school is a ladder of numbers, never a promise of immortality', () => {
  assert.deepEqual(necromancyProfile({}), { rank: 0, powerPercent: 0, respawnPercent: 0 });
  for (const rank of [1, 2, 3]) {
    const profile = necromancyProfile({ necromancyRank: rank });
    assert.equal(profile.powerPercent, NECROMANCY_POWER_PERCENT[rank]);
    assert.ok(minionRespawnSeconds(minionBlueprint('raise-ghoul'), profile) >= 5, 'the wait never vanishes');
  }
  assert.equal(necromancyProfile({ necromancyRank: 9 }).rank, 3, 'ranks are bounded');
});

test('a servant fights what threatens the hero and otherwise keeps up', () => {
  const hero = { x: 10, y: 10 };
  const minion = { x: 11, y: 10 };
  const near = { instanceId: 'monster-1-0', x: 12, y: 10, dead: 0 };
  const far = { instanceId: 'monster-1-1', x: 10 + MINION_LEASH_DISTANCE + 3, y: 10, dead: 0 };

  assert.deepEqual(
    minionIntent({ minion, hero, enemies: [near, far] }),
    { mode: 'attack', targetId: 'monster-1-0' },
  );
  assert.deepEqual(
    minionIntent({ minion, hero, enemies: [far] }),
    { mode: 'hold', targetId: null },
    'a fight beyond the leash is not the servant’s business',
  );
  assert.deepEqual(
    minionIntent({ minion: { x: 20, y: 20 }, hero, enemies: [] }),
    { mode: 'follow', targetId: null },
  );
  assert.deepEqual(
    minionIntent({ minion, hero, enemies: [{ ...near, dead: 1 }] }),
    { mode: 'hold', targetId: null },
    'the dead are not targets',
  );
  assert.ok(MINION_FOLLOW_DISTANCE < MINION_LEASH_DISTANCE);
  assert.deepEqual(minionIntent({}), { mode: 'hold', targetId: null });
});

test('both summons are spells with a body in the catalog and a book to learn', async () => {
  for (const spellId of MINION_SPELL_IDS) {
    const spell = spellById(spellId);
    assert.ok(spell, `${spellId} is a spell`);
    assert.equal(spell.kind, 'minion');
    assert.equal(spell.schoolId, 'necromancy');
    const blueprint = MINION_BLUEPRINTS[spellId];
    const definition = monsterById(blueprint.monsterId);
    assert.ok(definition, `${blueprint.monsterId} is in the monster catalog`);
    assert.equal(definition.spawn, 'summon', 'a servant never spawns as an enemy');
    assert.equal(definition.xp, 0, 'and killing one rewards nobody');
    for (let depth = 1; depth <= 9; depth += 1) {
      assert.equal(monsterEligibleForFloor(definition, floorScaling(depth)), false);
    }
    await access(new URL(`../public/assets/dcss-preview/${definition.path}`, import.meta.url));
  }
  const bones = lootById('book-of-bones');
  assert.deepEqual(bones.bookEffect, { type: 'learn-spell', spellId: 'raise-skeleton' });
  assert.equal(itemDetails(bones, 'ru').name, 'Книга костей');
  const hunger = lootById('book-of-hunger');
  assert.deepEqual(hunger.bookEffect, { type: 'learn-spell', spellId: 'raise-ghoul' });
  assert.equal(itemDetails(hunger, 'en').name, 'Book of Hunger');
  assert.equal(SPELL_CATALOG.filter(({ kind }) => kind === 'minion').length, 2);
});

test('Necromancy is a ready skill now that servants exist', () => {
  assert.ok(SKILL_SYSTEMS.includes('summoned-servants'));
  assert.equal(isSkillReady('necromancy'), true);
  assert.deepEqual(SKILL_CAPABILITY_LIMITS.necromancyRank, [0, 3]);
  assert.equal(capabilitiesAt(2).necromancyRank, 2);

  const copy = minionCopy('raise-skeleton', 'ru');
  assert.equal(copy.name, 'Скелет');
  assert.match(copy.fell, /пал/);
  assert.match(copy.returns(12.2), /13/);
  assert.equal(minionCopy('raise-skeleton', 'en').name, 'Skeleton');
  assert.equal(minionCopy('ember-bolt'), null);
});

test('the runtime raises, walks, guards and buries its servants', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function updateAllySlots\(\)[\s\S]*if \(\(spellCooldowns\[spellId\] \?\? 0\) > 0\) continue;[\s\S]*raiseAlly\(spellId\)/);
  assert.match(runtime, /function damageAlly\(ally, amount\)[\s\S]*spellCooldowns\[ally\.spellId\] = seconds;/);
  assert.match(runtime, /const guarding = allyInMeleeOf\(monster\);[\s\S]*damageAlly\(guarding, monster\.damage\);/);
  assert.match(runtime, /function updateAllies\(delta\)[\s\S]*damageMonster\(target, ally\.damage/);
  assert.match(runtime, /\.\.\.allies\n\s+\.filter\(\(ally\) => ally\.dead <= 0\.72/, 'servants are drawn with the living');
  assert.match(runtime, /usedSpell\.kind === 'minion'[\s\S]*copy\.called/, 'pressing the slot calls the servant back');
  assert.doesNotMatch(runtime, /floor\.allies|run\.allies/, 'servants never reach the save');
});
