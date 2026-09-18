import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BOND_DISTANCE,
  CARE_FEED_PERCENT,
  COMPANION_HP_PERCENT,
  COMPANION_LIMIT,
  COMPANION_MODES,
  DEFAULT_COMPANION_MODE,
  TAME_FOOD_IDS,
  bondProfile,
  bondReveal,
  canFeed,
  canTame,
  canTreat,
  careProfile,
  companionModeLabel,
  companionName,
  companionRefusalText,
  companionStats,
  createCompanionParty,
  feedCompanion,
  nextCompanionMode,
  packProfile,
  tameCreature,
  tameFoodCost,
  tamingProfile,
  trainingProfile,
  treatCompanion,
  validateCompanionParty,
  validateCompanionState,
} from '../tools/dcss-rpg-companions.js';
import { PASSIVE_CREATURE_CATALOG, passiveCreatureById } from '../tools/dcss-rpg-passive.js';
import { lootById, monsterById } from '../tools/dcss-rpg-content.js';
import {
  SKILL_CAPABILITY_LIMITS,
  SKILL_IMPLEMENTATIONS,
  SKILL_SYSTEMS,
} from '../tools/dcss-rpg-skills.js';
import { skillById } from '../tools/dcss-rpg-skill-content.js';
import {
  SAVE_VERSION,
  advanceRunFloor,
  createRun,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';

const master = tamingProfile({ tamingRank: 3 });

test('the rank decides which beast will come, and food is always the price', () => {
  assert.equal(canTame({ creature: { id: 'sheep' }, profile: tamingProfile({}), foodCount: 9 }).reason, 'rank-required');

  const novice = tamingProfile({ tamingRank: 1 });
  assert.equal(canTame({ creature: { id: 'sheep' }, profile: novice, foodCount: 1 }).ok, true);
  const wild = canTame({ creature: { id: 'yak' }, profile: novice, foodCount: 1 });
  assert.equal(wild.reason, 'too-wild');
  assert.equal(wild.required, passiveCreatureById('yak').tameDifficulty);
  assert.equal(canTame({ creature: { id: 'sheep' }, profile: novice, foodCount: 0 }).reason, 'no-food');
  assert.equal(canTame({ creature: { id: 'sheep', hunted: true }, profile: novice, foodCount: 1 }).reason, 'frightened');
  assert.equal(canTame({ creature: { id: 'dragon' }, profile: novice, foodCount: 1 }).reason, 'not-a-beast');
  assert.equal(companionRefusalText('too-wild'), 'Слишком дикий для твоего ранга');

  for (const creature of PASSIVE_CREATURE_CATALOG) {
    const rank = creature.tameDifficulty;
    assert.equal(canTame({ creature: { id: creature.id }, profile: tamingProfile({ tamingRank: rank }), foodCount: 1 }).ok, true);
    if (rank > 1) {
      assert.equal(
        canTame({ creature: { id: creature.id }, profile: tamingProfile({ tamingRank: rank - 1 }), foodCount: 1 }).reason,
        'too-wild',
      );
    }
  }
  for (const id of TAME_FOOD_IDS) {
    assert.ok(lootById(id), id);
    assert.equal(lootById(id).useEffect?.type, 'food', `${id} is food`);
  }
});

test('the pack decides how many follow, and every extra beast eats more', () => {
  const alone = packProfile({});
  assert.equal(alone.limit, COMPANION_LIMIT[0]);
  assert.equal(tameFoodCost(0), 1);
  assert.equal(tameFoodCost(1), 2, 'the second beast costs a meal more');
  assert.equal(tameFoodCost(2), 3);

  const first = tameCreature({ creature: { id: 'hog' }, profile: master, pack: alone, foodCount: 1, party: [] });
  assert.equal(first.ok, true);
  assert.equal(first.cost, 1);
  assert.equal(first.companion.mode, DEFAULT_COMPANION_MODE, 'a new friend guards by default');

  // Without Pack leader the party is full at one.
  const full = canTame({ creature: { id: 'sheep' }, profile: master, pack: alone, foodCount: 9, party: [first.companion] });
  assert.equal(full.reason, 'already-bonded');
  assert.equal(full.limit, 1);

  const leader = packProfile({ packLeaderRank: 1 });
  assert.equal(leader.limit, 2);
  const second = canTame({ creature: { id: 'sheep' }, profile: master, pack: leader, foodCount: 1, party: [first.companion] });
  assert.equal(second.reason, 'no-food', 'a second mouth needs a second meal');
  assert.equal(second.cost, 2);
  assert.equal(
    canTame({ creature: { id: 'sheep' }, profile: master, pack: leader, foodCount: 2, party: [first.companion] }).ok,
    true,
  );
  assert.equal(packProfile({ packLeaderRank: 3 }).limit, COMPANION_LIMIT[3]);
});

test('training gives orders, and only the ones the handler has learned', () => {
  const untrained = trainingProfile({});
  assert.deepEqual(untrained.modes, [], 'an untrained beast simply follows');
  assert.equal(nextCompanionMode('guard', untrained), null);

  const novice = trainingProfile({ trainingRank: 1 });
  assert.deepEqual([...novice.modes], ['guard', 'search']);
  assert.equal(nextCompanionMode('guard', novice), 'search');
  assert.equal(nextCompanionMode('search', novice), 'guard', 'the orders make a ring');
  assert.equal(nextCompanionMode('fetch', novice), 'guard', 'an order the handler forgot falls back to the first');

  const adept = trainingProfile({ trainingRank: 2 });
  assert.deepEqual([...adept.modes], [...COMPANION_MODES]);
  assert.ok(adept.fetchRange > 0, 'fetching needs a reach');
  assert.ok(trainingProfile({ trainingRank: 3 }).searchRadius >= adept.searchRadius);
  for (const mode of COMPANION_MODES) {
    assert.ok(companionModeLabel(mode, 'ru').length > 0, mode);
    assert.ok(companionModeLabel(mode, 'en').length > 0, mode);
  }
});

test('care feeds and bandages a beast, and refuses when there is nothing to mend', () => {
  const beast = { id: 'hog', hp: 10, mode: 'guard' };
  assert.equal(canFeed({ companion: beast, maxHp: 40, profile: careProfile({}), foodCount: 9 }).reason, 'rank-required');

  const care = careProfile({ animalCareRank: 1 });
  assert.equal(care.feedPercent, CARE_FEED_PERCENT[1]);
  assert.equal(care.treats, false, 'bandaging comes later');
  assert.equal(canFeed({ companion: beast, maxHp: 40, profile: care, foodCount: 0 }).reason, 'no-food');
  assert.equal(canFeed({ companion: { ...beast, hp: 40 }, maxHp: 40, profile: care, foodCount: 1 }).reason, 'not-hurt');
  const fed = feedCompanion({ companion: beast, maxHp: 40, profile: care, foodCount: 1 });
  assert.equal(fed.ok, true);
  assert.equal(fed.hp, 10 + Math.round((40 * CARE_FEED_PERCENT[1]) / 100));
  assert.equal(feedCompanion({ companion: { ...beast, hp: 39 }, maxHp: 40, profile: care, foodCount: 1 }).hp, 40, 'never past whole');

  const nurse = careProfile({ animalCareRank: 2 });
  assert.equal(canTreat({ companion: beast, effects: { burning: 3 }, profile: care, bandageCount: 1 }).reason, 'rank-required');
  assert.equal(canTreat({ companion: beast, effects: {}, profile: nurse, bandageCount: 1 }).reason, 'nothing-to-treat');
  assert.equal(canTreat({ companion: beast, effects: { poison: 5 }, profile: nurse, bandageCount: 0 }).reason, 'no-bandage');
  const treated = treatCompanion({ companion: beast, effects: { poison: 5, wet: 2 }, profile: nurse, bandageCount: 1 });
  assert.equal(treated.ok, true);
  assert.deepEqual(treated.effects, { poison: 0, wet: 0 });
  assert.equal(companionRefusalText('no-bandage'), 'Нужны бинты');
});

test('the bond shares what a nearby beast sees, and nothing from a distant one', () => {
  const hero = { x: 10, y: 10 };
  assert.equal(bondReveal({ hero, beast: { x: 11, y: 10 }, profile: bondProfile({}) }), null);

  const bond = bondProfile({ beastBondRank: 1 });
  assert.equal(bond.distance, BOND_DISTANCE[1]);
  const close = bondReveal({ hero, beast: { x: 13, y: 10 }, profile: bond });
  assert.deepEqual(close, { x: 13, y: 10, radius: bond.radius });
  assert.equal(bondReveal({ hero, beast: { x: 30, y: 10 }, profile: bond }), null, 'too far to share');
  assert.ok(bondProfile({ beastBondRank: 3 }).distance > bond.distance);
  assert.ok(bondProfile({ beastBondRank: 3 }).radius > bond.radius);
});

test('a handler makes the beast tougher, and the beast has a body to wear', () => {
  const plain = companionStats({ creatureId: 'hog', profile: tamingProfile({ tamingRank: 1 }) });
  const trained = companionStats({ creatureId: 'hog', profile: master });
  assert.equal(plain.maxHp, passiveCreatureById('hog').maxHp);
  assert.equal(trained.maxHp, Math.round(plain.maxHp * (1 + COMPANION_HP_PERCENT[3] / 100)));
  assert.ok(trained.damage > plain.damage);
  assert.equal(companionStats({ creatureId: 'nothing' }), null);

  for (const creature of PASSIVE_CREATURE_CATALOG) {
    const body = monsterById(`tamed-${creature.id}`);
    assert.ok(body, `tamed-${creature.id}`);
    assert.equal(body.spawn, 'summon', 'a tamed beast never joins a dungeon pool');
    assert.equal(body.xp, 0, 'and never pays experience');
    assert.ok(companionName(creature.id, 'ru').length > 0);
    assert.ok(companionName(creature.id, 'en').length > 0);
  }
});

test(`save v${SAVE_VERSION} carries the party, its wounds and its orders`, () => {
  const run = createRun(8801);
  assert.deepEqual(run.companions, [], 'a run starts alone');
  assert.equal(validateRun(run), true);

  run.companions = [{ id: 'hog', hp: 12, mode: 'search' }];
  assert.equal(validateRun(run), true);
  const deeper = advanceRunFloor(run);
  assert.deepEqual(deeper.companions, [{ id: 'hog', hp: 12, mode: 'search' }], 'wounds and orders walk down too');

  assert.equal(validateCompanionParty([]), true, 'an empty party is a valid party');
  assert.equal(validateCompanionState({ id: 'hog', hp: 0, mode: 'guard' }), false, 'a dead beast is no beast');
  assert.equal(validateCompanionState({ id: 'dragon', hp: 5, mode: 'guard' }), false);
  assert.equal(validateCompanionState({ id: 'hog', hp: 5, mode: 'dance' }), false);
  assert.equal(validateCompanionState({ id: 'hog', hp: 5 }), false, 'an order is part of the record');
  assert.equal(validateRun({ ...run, companions: [{ id: 'hog', hp: -1, mode: 'guard' }] }), false);
  assert.equal(validateCompanionParty(new Array(9).fill({ id: 'hog', hp: 5, mode: 'guard' })), false);
  assert.deepEqual(createCompanionParty([{ id: 'hog', hp: 5, mode: 'guard' }, { id: 'ghost', hp: 5 }]).length, 1);

  // A single beast from v44 becomes a party of one, health and all.
  const legacy = createRun(8802);
  legacy.version = 44;
  delete legacy.companions;
  legacy.companion = { id: 'yak', hp: 30 };
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.deepEqual(migrated.companions, [{ id: 'yak', hp: 30, mode: DEFAULT_COMPANION_MODE }]);
  assert.equal(validateRun(migrated), true);
});

test('all five companion skills are wired, and the runtime keeps the party', async () => {
  for (const id of ['taming', 'training', 'animal-care', 'beast-bond', 'pack-leader']) {
    assert.ok(SKILL_IMPLEMENTATIONS[id], id);
    for (const system of skillById(id).requiresSystems) {
      assert.ok(SKILL_SYSTEMS.includes(system), `${system} is connected`);
    }
    for (const rank of SKILL_IMPLEMENTATIONS[id].capabilitiesByRank) {
      for (const [key, value] of Object.entries(rank)) {
        assert.ok(SKILL_CAPABILITY_LIMITS[key], `${key} has a declared limit`);
        assert.ok(Number.isInteger(value), `${key} stays an integer`);
      }
    }
  }

  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const uses = (needle) => assert.ok(source.includes(needle), needle);
  uses("from './dcss-rpg-companions.js'");
  uses('function tameNearbyWildlife(');
  uses('function raiseCompanion(index)');
  uses('function nearbyCompanion(');
  uses('function spendCompanionFood(');
  uses('run.companions = [...run.companions, result.companion];');
  uses('function searchTargetsFor(');
  uses('function companionFetch(');
  uses('function revealThroughCompanions(');
  uses('function feedNearbyCompanion(');
  uses('function treatNearbyCompanion(');
  uses('function orderNearbyCompanion(');
  // A scout and a fetcher mind the errand instead of chasing a fight they
  // cannot reach; only a guard runs after it.
  uses("const chasing = target !== null && !errandMode;");
});
