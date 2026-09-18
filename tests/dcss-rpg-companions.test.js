import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  COMPANION_HP_PERCENT,
  TAME_FOOD_IDS,
  canTame,
  companionName,
  companionRefusalText,
  companionStats,
  createCompanionState,
  tameCreature,
  tamingProfile,
  validateCompanionState,
} from '../tools/dcss-rpg-companions.js';
import { PASSIVE_CREATURE_CATALOG, passiveCreatureById } from '../tools/dcss-rpg-passive.js';
import { LOOT_CATALOG, lootById, monsterById } from '../tools/dcss-rpg-content.js';
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

test('the rank decides which beast will come, and food is always the price', () => {
  assert.deepEqual(tamingProfile({}), { rank: 0, difficulty: 0, hpPercent: 0, damagePercent: 0 });
  assert.equal(canTame({ creature: { id: 'sheep' }, profile: tamingProfile({}), foodCount: 9 }).reason, 'rank-required');

  const novice = tamingProfile({ tamingRank: 1 });
  assert.equal(canTame({ creature: { id: 'sheep' }, profile: novice, foodCount: 1 }).ok, true);
  const wild = canTame({ creature: { id: 'yak' }, profile: novice, foodCount: 1 });
  assert.equal(wild.reason, 'too-wild');
  assert.equal(wild.required, passiveCreatureById('yak').tameDifficulty);
  assert.equal(canTame({ creature: { id: 'sheep' }, profile: novice, foodCount: 0 }).reason, 'no-food');
  assert.equal(canTame({ creature: { id: 'sheep', hunted: true }, profile: novice, foodCount: 1 }).reason, 'frightened');
  assert.equal(
    canTame({ creature: { id: 'sheep' }, profile: novice, foodCount: 1, companion: { id: 'hog', hp: 10 } }).reason,
    'already-bonded',
  );
  assert.equal(canTame({ creature: { id: 'dragon' }, profile: novice, foodCount: 1 }).reason, 'not-a-beast');
  assert.equal(companionRefusalText('too-wild'), 'Слишком дикий для твоего ранга');

  // Every beast in the catalogue can be reached by some rank, and no other.
  for (const creature of PASSIVE_CREATURE_CATALOG) {
    const rank = creature.tameDifficulty;
    assert.ok(rank >= 1 && rank <= 3, creature.id);
    assert.equal(canTame({ creature: { id: creature.id }, profile: tamingProfile({ tamingRank: rank }), foodCount: 1 }).ok, true);
    if (rank > 1) {
      assert.equal(
        canTame({ creature: { id: creature.id }, profile: tamingProfile({ tamingRank: rank - 1 }), foodCount: 1 }).reason,
        'too-wild',
      );
    }
  }
  // The price is a real meal from the catalogue.
  for (const id of TAME_FOOD_IDS) {
    assert.ok(lootById(id), id);
    assert.equal(lootById(id).useEffect?.type, 'food', `${id} is food`);
  }
});

test('a handler makes the beast tougher, and the beast has a body to wear', () => {
  const plain = companionStats({ creatureId: 'hog', profile: tamingProfile({ tamingRank: 1 }) });
  const trained = companionStats({ creatureId: 'hog', profile: tamingProfile({ tamingRank: 3 }) });
  assert.equal(plain.maxHp, passiveCreatureById('hog').maxHp);
  assert.equal(trained.maxHp, Math.round(plain.maxHp * (1 + COMPANION_HP_PERCENT[3] / 100)));
  assert.ok(trained.damage > plain.damage);
  assert.equal(companionStats({ creatureId: 'nothing' }), null);

  // The runtime raises it from the monster catalogue, like a servant.
  for (const creature of PASSIVE_CREATURE_CATALOG) {
    const body = monsterById(`tamed-${creature.id}`);
    assert.ok(body, `tamed-${creature.id}`);
    assert.equal(body.spawn, 'summon', 'a tamed beast never joins a dungeon pool');
    assert.equal(body.xp, 0, 'and never pays experience');
    assert.ok(companionName(creature.id, 'ru').length > 0);
    assert.ok(companionName(creature.id, 'en').length > 0);
  }
  const tamed = tameCreature({ creature: { id: 'yak' }, profile: tamingProfile({ tamingRank: 3 }), foodCount: 1 });
  assert.equal(tamed.ok, true);
  assert.equal(tamed.companion.hp, tamed.stats.maxHp, 'a new friend starts whole');
});

test(`save v${SAVE_VERSION} carries the beast, its wounds and its absence`, () => {
  const run = createRun(8801);
  assert.equal(run.companion, null, 'a run starts alone');
  assert.equal(validateRun(run), true);

  run.companion = { id: 'hog', hp: 12 };
  assert.equal(validateRun(run), true);
  const deeper = advanceRunFloor(run);
  assert.deepEqual(deeper.companion, { id: 'hog', hp: 12 }, 'the beast walks down with its wounds');

  assert.equal(validateCompanionState(null), true, 'no beast is a valid state');
  assert.equal(validateCompanionState({ id: 'hog', hp: 0 }), false, 'a dead beast is no beast');
  assert.equal(validateCompanionState({ id: 'dragon', hp: 5 }), false);
  assert.equal(validateCompanionState({ id: 'hog', hp: 5, name: 'Борис' }), false);
  assert.equal(validateRun({ ...run, companion: { id: 'hog', hp: -1 } }), false);
  assert.equal(createCompanionState({ id: 'hog', hp: 0 }), null);

  const legacy = createRun(8802);
  legacy.version = 43;
  delete legacy.companion;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.companion, null, 'an older run walks alone');
  assert.equal(validateRun(migrated), true);
});

test('Taming is a wired skill and the runtime keeps the bond', async () => {
  assert.ok(SKILL_IMPLEMENTATIONS.taming);
  for (const system of skillById('taming').requiresSystems) {
    assert.ok(SKILL_SYSTEMS.includes(system), `${system} is connected`);
  }
  assert.deepEqual(SKILL_CAPABILITY_LIMITS.tamingRank, [0, 3]);

  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const uses = (needle) => assert.ok(source.includes(needle), needle);
  uses("from './dcss-rpg-companions.js'");
  uses('function tameNearbyWildlife(');
  uses('function raiseCompanion(');
  uses("if (action.id === 'tame') return tameNearbyWildlife(creature);");
  uses('if (run.companion && !allies.some((ally) => ally.companion && ally.dead === 0)) raiseCompanion();');
  // A fallen friend is gone: nothing here starts a cooldown for it.
  uses('run.companion = null;');
});
