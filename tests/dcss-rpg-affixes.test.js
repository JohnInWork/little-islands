import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ITEM_AFFIXES,
  eligibleItemAffixes,
  itemAffixRarity,
  affixById,
  affixStats,
  materializeItemAffixes,
  rollItemAffixes,
  validateItemAffixIds,
} from '../tools/dcss-rpg-affixes.js';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { EQUIPMENT_STAT_KEYS } from '../tools/dcss-rpg-rules.js';
import { MAGIC_TRAIT_KEYS } from '../tools/dcss-rpg-magic.js';
import {
  SAVE_KEY,
  SAVE_VERSION,
  createRun,
  generateDungeon,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { generatedItemDescription } from '../tools/dcss-rpg-item-description.js';
import { deriveHeroStats } from '../tools/dcss-rpg-rules.js';

test('the affix catalog is unique, compatible and limited to implemented mechanics', () => {
  assert.equal(new Set(ITEM_AFFIXES.map(({ id }) => id)).size, ITEM_AFFIXES.length);
  assert.ok(ITEM_AFFIXES.length >= 9);
  for (const affix of ITEM_AFFIXES) {
    assert.ok(LOOT_CATALOG.some((item) => (
      item.slot && eligibleItemAffixes(item).some(({ id }) => id === affix.id)
    )), `no compatible equipment for ${affix.id}`);
    // An affix may only touch a stat equipment actually has — read from the
    // rules rather than from a hand-copied list that drifts out of date.
    assert.ok(Object.keys(affix.stats ?? {}).every((key) => EQUIPMENT_STAT_KEYS.includes(key)));
    // …and only promise a mechanic the aggregator actually reads. The list
    // comes from the implementation, not from a copy of it that goes stale.
    assert.ok(Object.keys(affix.magic ?? {}).every((key) => MAGIC_TRAIT_KEYS.includes(key)),
      `${affix.id} promises a mechanic nothing reads`);
  }
});

test('affix rolls are deterministic, separately seeded and tunable with one value', () => {
  const item = lootById('long-sword');
  const options = { seed: 4421, depth: 5, instanceId: 'loot-5-2', item };
  assert.deepEqual(rollItemAffixes(options), rollItemAffixes(options));
  assert.deepEqual(rollItemAffixes({ ...options, rate: 0 }), []);

  const outcomes = new Set(Array.from({ length: 300 }, (_, index) => (
    rollItemAffixes({ ...options, instanceId: `loot-5-${index}` }).join(',')
  )));
  assert.ok(outcomes.size >= 4);
  assert.ok([...outcomes].every((outcome) => outcome === '' || !outcome.includes(',')));
  assert.throws(() => rollItemAffixes({ ...options, rate: 3.01 }), /Affix rate/);
});

test('ordinary equipment remains common while magical properties create rarity', () => {
  const sword = lootById('long-sword');
  assert.equal(itemAffixRarity(sword, []), 0);
  assert.equal(itemAffixRarity(sword, ['forceful']), 1);
  assert.equal(itemAffixRarity(sword, ['forceful', 'quickened']), 1);
  assert.equal(itemAffixRarity(lootById('fire-ring'), []), 1);
  assert.equal(itemAffixRarity(lootById('sword-of-power'), []), 0);
  assert.equal(itemAffixRarity(sword, [], 'flight'), 3);
});

test('materialization combines stats and magic without mutating the base template', () => {
  const sword = lootById('long-sword');
  const baseStats = structuredClone(sword.stats);
  const item = materializeItemAffixes(sword, {
    uid: 'affixed-sword',
    affixIds: ['forceful', 'reaping'],
  });
  assert.deepEqual(sword.stats, baseStats);
  // The affix lands somewhere in its band rather than on one fixed number, so
  // the promise is that it helps and that the same sword helps the same amount.
  const bonus = item.stats.attack - sword.stats.attack;
  assert.ok(bonus > 0, 'an affix that adds nothing is an affix that lies');
  assert.deepEqual(
    affixStats(affixById('forceful'), 'affixed-sword'),
    { attack: bonus },
  );
  assert.equal(
    materializeItemAffixes(sword, { uid: 'affixed-sword', affixIds: ['forceful', 'reaping'] }).stats.attack,
    item.stats.attack,
    'the same sword rolls the same twice',
  );
  assert.equal(item.magic.healOnKill, 1);
  assert.equal(item.rarity, 1);
  assert.equal(item.baseRarity, sword.rarity);

  const ring = materializeItemAffixes(lootById('fire-ring'), {
    affixIds: ['frost-ward'],
  });
  assert.deepEqual(ring.magic.immunity.sort(), ['burning', 'chilled']);
  assert.equal(validateItemAffixIds(lootById('fire-ring'), ['ember-ward']), false);
  assert.equal(validateItemAffixIds(sword, ['forceful', 'forceful']), false);
  assert.equal(validateItemAffixIds(lootById('healing-potion'), []), false);
});

test('generated descriptions and real hero stats automatically use affix results', () => {
  const sword = materializeItemAffixes(lootById('long-sword'), {
    uid: 'affixed-sword',
    affixIds: ['forceful'],
  });
  const ordinary = materializeItemAffixes(lootById('long-sword'), {
    uid: 'ordinary-sword',
    affixIds: [],
  });
  const attack = sword.stats.attack;
  assert.match(generatedItemDescription(sword, 'ru').summary, new RegExp(`\\+${attack} атака`));
  assert.match(generatedItemDescription(sword, 'en').summary, new RegExp(`\\+${attack} attack`));
  // Two swords of force are no longer the same sword.
  const spread = new Set();
  for (let index = 0; index < 60; index += 1) {
    spread.add(materializeItemAffixes(lootById('long-sword'), {
      uid: `loot-3-${index}`,
      affixIds: ['forceful'],
    }).stats.attack);
  }
  assert.ok(spread.size > 1, 'every sword of force is still identical');
  assert.ok(
    deriveHeroStats({ power: 1 }, { hand1: sword.uid }, [sword]).attack
    > deriveHeroStats({ power: 1 }, { hand1: ordinary.uid }, [ordinary]).attack,
  );
});

test('the production generator yields mostly ordinary gear and some enchanted gear', () => {
  const counts = [0, 0, 0, 0];
  for (let seed = 1; seed <= 700; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 1 + (seed % 8) });
    for (const spawn of dungeon.loot) {
      const definition = lootById(spawn.id);
      if (!definition?.slot) continue;
      assert.equal(validateItemAffixIds(definition, spawn.affixIds), true);
      counts[itemAffixRarity(definition, spawn.affixIds, spawn.artifactPowerId)] += 1;
    }
  }
  const total = counts.reduce((sum, count) => sum + count, 0);
  // Порог — про размер выборки, а не про правило: носимого на этаже стало
  // в полтора раза меньше, и семьсот подземелий дают уже не полторы тысячи
  // вещей, а около тысячи. Для долей ниже этого с запасом хватает.
  assert.ok(total > 900, `выборка всего ${total} вещей`);
  assert.ok(counts[0] / total > 0.5);
  assert.ok(counts[1] > 200);
  assert.equal(counts[2], 0);
  // Nothing an artefact-tier item does is earned by walking over it, so the open
  // floor never carries one. They live in sealed caches; see the artifact tests.
  assert.equal(counts[3], 0);
});

test('v19 migration preserves tuning and gear power without inventing affixes', () => {
  const legacy = createRun(2019);
  legacy.version = 19;
  legacy.contentVersion = 9;
  legacy.lootAbundance = 1.75;
  legacy.items = legacy.items.map(({ affixIds: _affixIds, ...item }) => item);

  const migrated = migrateLegacyRun(legacy);
  assert.equal(SAVE_VERSION, 51);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v51');
  assert.equal(migrated.lootAbundance, 1.75);
  assert.ok(migrated.items.filter(({ id }) => lootById(id).slot).every(
    ({ affixIds }) => Array.isArray(affixIds) && affixIds.length === 0,
  ));
  assert.equal(validateRun(migrated), true);
});

test('affix IDs survive the strict save contract and runtime adapter', () => {
  const run = createRun(2020);
  const blade = run.items.find(({ uid }) => uid === 'starter-sword');
  blade.affixIds = ['forceful'];
  const restored = JSON.parse(JSON.stringify(run));
  assert.equal(validateRun(restored), true);
  assert.deepEqual(restored.items.find(({ uid }) => uid === blade.uid).affixIds, ['forceful']);

  const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /materializeProceduralArtifact\(materializeItemAffixes\(definition, persisted\), persisted\)/);
  assert.match(runtime, /\.map\(\(\{ id, uid, stack, affixIds, artifactPowerId, artifactCurseId \}\)/);
  assert.match(runtime, /affixIds: \[\.\.\.affixIds\]/);
});
