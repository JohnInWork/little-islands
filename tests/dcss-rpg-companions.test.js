import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  COMPANION_HP_PERCENT,
  COMPANION_LIMIT,
  DEFAULT_COMPANION_MODE,
  TAME_FOOD_IDS,
  canTame,
  companionName,
  companionRefusalText,
  companionStats,
  createCompanionParty,
  packProfile,
  tameCreature,
  tameFoodCost,
  tamingProfile,
  validateCompanionParty,
  validateCompanionState,
} from '../tools/dcss-rpg-companions.js';
import { PASSIVE_CREATURE_CATALOG, passiveCreatureById } from '../tools/dcss-rpg-passive.js';
import { lootById, monsterById } from '../tools/dcss-rpg-content.js';
import { floorScaling, monsterEligibleForFloor } from '../tools/dcss-rpg-scaling.js';
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
  generateDungeon,
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

/**
 * Приказов, ухода и связи у зверя больше нет.
 *
 * Дрессировка, Уход и Звериная связь были тремя навыками из пяти в этой
 * ветке: пятнадцать очков из тридцати, которые даёт весь забег, на одну
 * подсистему. Иван: «Дрессировка, Уход, Звериная связь тоже убираем».
 * Остались двое — Приручение и Вожак стаи, — а зверь просто идёт рядом.
 */
test('дрессировки, ухода и связи нет: зверь идёт рядом и дерётся', async () => {
  const companions = await import('../tools/dcss-rpg-companions.js');
  for (const name of [
    'trainingProfile', 'careProfile', 'bondProfile', 'bondReveal',
    'canFeed', 'canTreat', 'feedCompanion', 'treatCompanion', 'nextCompanionMode',
  ]) {
    assert.equal(name in companions, false, `${name}: осталось в модуле`);
  }
  for (const id of ['training', 'animal-care', 'beast-bond']) {
    assert.equal(skillById(id), null, `${id}: навык всё ещё в каталоге`);
    assert.equal(SKILL_IMPLEMENTATIONS[id], undefined, `${id}: реализация всё ещё на месте`);
  }
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  for (const needle of ['feedNearbyCompanion', 'treatNearbyCompanion', 'orderNearbyCompanion',
    'companionSearch', 'companionFetch', 'revealThroughCompanions']) {
    assert.equal(source.includes(needle), false, `${needle}: осталось в переходнике`);
  }
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
    assert.equal(
      monsterEligibleForFloor(body, floorScaling(Math.max(1, body.tier))),
      false,
      `${body.id} is never rolled onto a floor`,
    );
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

test('no tamed body ever opens a floor as its first creature', async () => {
  // The starter creature is picked by tier alone, so it must exclude anything
  // that belongs to a summon, a town or a flooded room.
  const source = await readFile(new URL('../tools/dcss-rpg-core.js', import.meta.url), 'utf8');
  assert.ok(
    source.includes("monster.tier === 1 && monster.spawn === undefined"),
    'the floor opener is an ordinary dungeon creature',
  );
  for (let seed = 1; seed < 40; seed += 1) {
    const level = generateDungeon({ seed, depth: 1 });
    for (const spawn of level.monsters) {
      const body = monsterById(spawn.id);
      assert.notEqual(body?.spawn, 'summon', `${spawn.id} on seed ${seed}`);
      assert.notEqual(body?.spawn, 'city', `${spawn.id} on seed ${seed}`);
    }
  }
});

test('both companion skills are wired, and the runtime keeps the party', async () => {
  for (const id of ['taming', 'pack-leader']) {
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
});

/**
 * A companion you can neither send away nor turn on is a companion you are
 * stuck with — and with no taming skills learned, the panel beside a hired
 * mercenary had no actions in it at all.
 */
test('a companion can always be let go, and can always be turned on', async () => {
  const { contextActionModel } = await import('../tools/dcss-rpg-context-actions.js');
  const bare = contextActionModel({
    target: { kind: 'companion', id: 'sellsword', icon: 'mon/unique/edmund.png' },
  });
  const ids = bare.actions.map(({ id }) => id);
  assert.ok(ids.includes('release'), 'nothing lets the beast go');
  assert.ok(ids.includes('attack'), 'nothing turns on it');
  assert.ok(bare.actions.every(({ label }) => (label ?? '').length > 0), 'an action with no name');

  // Двух слов и достаточно: кормить, лечить и приказывать больше нечем.
  assert.deepEqual(ids, ['release', 'attack']);

  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /if \(action\.id === 'release'\) return releaseCompanion\(beast\);/);
  assert.match(runtime, /return turnOnCompanion\(beast\);/);
  // Turning on it makes it an ordinary enemy that the hero has already hit once.
  const turn = runtime.slice(runtime.indexOf('function turnOnCompanion('));
  const body = turn.slice(0, turn.indexOf('\nfunction '));
  assert.match(body, /releaseCompanion\(beast\)/, 'the traitor stays in the party');
  assert.match(body, /monsters\.push\(turned\)/, 'nothing stands where the companion was');
  assert.match(body, /damageMonster\(turned/, 'the hero swung and missed entirely');
});
