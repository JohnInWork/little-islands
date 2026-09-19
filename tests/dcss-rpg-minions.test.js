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
  MINION_GUARD_RADIUS,
} from '../tools/dcss-rpg-minions.js';
import { SPELL_CATALOG, spellById, spellDamage, spellStatus } from '../tools/dcss-rpg-spells.js';
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
  assert.deepEqual([...MINION_SPELL_IDS], ['raise-skeleton', 'raise-ghoul', 'raise-warden']);
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
  assert.equal(SPELL_CATALOG.filter(({ kind }) => kind === 'minion').length, 3);
});

test('the third servant is a wall, and the burst is a spell of its own kind', () => {
  const warden = minionBlueprint('raise-warden');
  const ghoul = minionBlueprint('raise-ghoul');
  assert.ok(warden.baseHp > ghoul.baseHp, 'a warden holds more than a ghoul');
  assert.ok(warden.respawnSeconds > ghoul.respawnSeconds, 'and takes longer to return');
  assert.equal(spellById('raise-warden').minimumIntelligence, 9);
  assert.ok(monsterById(warden.monsterId), 'the body exists in the catalogue');
  assert.equal(monsterById(warden.monsterId).xp, 0, 'servants never pay experience');
  assert.equal(monsterById(warden.monsterId).spawn, 'summon', 'and never join a dungeon pool');

  // The burst is damage without a projectile, on the same damage ladder.
  const spell = spellById('ember-burst');
  assert.equal(spell.kind, 'burst');
  assert.equal(spell.schoolId, 'pyromancy');
  assert.ok(spell.range >= 2);
  assert.ok(spellDamage('ember-burst', 8, 3) > spellDamage('ember-burst', 8, 0), 'the school still matters');
  assert.equal(spellStatus('ember-burst', 8).id, 'burning');
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

/**
 * A bodyguard defends; it does not patrol.
 *
 * The leash was written on the wrong end: enemies further than seven cells
 * **from the hero** were ignored, and nothing ever measured how far the servant
 * itself had wandered. In a dungeon there is always something within seven
 * cells, so a raised beast — and a mercenary the hero had paid two hundred gold
 * for — spent the whole run away brawling and was never once beside the person
 * it was guarding. It could not even be spoken to: the panel needs two cells.
 */
test('a servant guards the hero instead of chasing the room', () => {
  const hero = { x: 10, y: 10 };
  const far = { instanceId: 'far', x: 16, y: 10, dead: 0 };
  const near = { instanceId: 'near', x: 12, y: 10, dead: 0 };

  // Six cells from the hero is somebody else's problem.
  assert.equal(minionIntent({ minion: { x: 10, y: 11 }, hero, enemies: [far] }).mode, 'hold');
  // Two cells from the hero is the thing the servant is for.
  assert.deepEqual(
    minionIntent({ minion: { x: 10, y: 11 }, hero, enemies: [near] }),
    { mode: 'attack', targetId: 'near' },
  );

  // And a servant that has strayed past the leash comes back, whatever it sees.
  const strayed = { x: hero.x + MINION_LEASH_DISTANCE + 1, y: hero.y };
  assert.equal(minionIntent({ minion: strayed, hero, enemies: [near] }).mode, 'follow');

  // Standing about: close enough is close enough, further than that is a walk.
  assert.equal(minionIntent({ minion: { x: 10, y: 11 }, hero, enemies: [] }).mode, 'hold');
  assert.equal(minionIntent({ minion: { x: 10, y: 14 }, hero, enemies: [] }).mode, 'follow');
  assert.ok(MINION_GUARD_RADIUS < MINION_LEASH_DISTANCE, 'a guard radius wider than the leash is not a leash');
});
