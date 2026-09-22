import assert from 'node:assert/strict';
import test from 'node:test';

import {
  conditionEffects,
  conditionedFloor,
} from '../tools/dcss-rpg-conditions.js';

/** The profile bent by the run's own two conditions: what the floor really got. */
const floorBudget = (floor) => conditionedFloor(floor.scaling, conditionEffects(floor.conditionIds));

import { lootById } from '../tools/dcss-rpg-content.js';
import { createRng, generateDungeon } from '../tools/dcss-rpg-core.js';
import {
  DEFAULT_LOOT_ABUNDANCE,
  MAX_LOOT_ABUNDANCE,
  MIN_LOOT_ABUNDANCE,
  createBalancedLootPicks,
  floorLootEconomy,
  lootQualityCost,
  validateLootAbundance,
} from '../tools/dcss-rpg-loot-economy.js';

const POOL = Object.freeze([
  Object.freeze({ id: 'cloth', slot: 'body', rarity: 0, weight: 16 }),
  Object.freeze({ id: 'bread', slot: null, rarity: 0, weight: 18 }),
  Object.freeze({ id: 'iron', slot: 'body', rarity: 1, weight: 9 }),
  Object.freeze({ id: 'rune', slot: 'ring1', rarity: 2, weight: 4 }),
  Object.freeze({ id: 'crown', slot: 'head', rarity: 3, weight: 1 }),
]);

test('one abundance value controls count while preserving a playable floor', () => {
  assert.equal(DEFAULT_LOOT_ABUNDANCE, 1);
  assert.equal(validateLootAbundance(MIN_LOOT_ABUNDANCE), true);
  assert.equal(validateLootAbundance(MAX_LOOT_ABUNDANCE), true);
  assert.equal(validateLootAbundance(MIN_LOOT_ABUNDANCE - 0.01), false);
  assert.equal(validateLootAbundance(MAX_LOOT_ABUNDANCE + 0.01), false);

  const lean = floorLootEconomy({ baseCount: 4, baseQualityBudget: 7.5, abundance: 0.25 });
  const normal = floorLootEconomy({ baseCount: 4, baseQualityBudget: 7.5, abundance: 1 });
  const rich = floorLootEconomy({ baseCount: 4, baseQualityBudget: 7.5, abundance: 2.5 });
  assert.deepEqual([lean.count, normal.count, rich.count], [2, 4, 9]);
  assert.ok(lean.qualityBudget >= lean.count);
  assert.ok(rich.qualityBudget >= rich.count);
  assert.ok(rich.qualityBudget < normal.qualityBudget * 2);
});

test('quality budget bounds a deterministic varied floor instead of multiplying rare drops', () => {
  const options = {
    pool: POOL,
    starterPool: POOL.filter(({ slot }) => slot),
    count: 7,
    qualityBudget: 10,
  };
  const first = createBalancedLootPicks({ ...options, rng: createRng(991) });
  const second = createBalancedLootPicks({ ...options, rng: createRng(991) });
  assert.deepEqual(first, second);
  assert.equal(first.picks.length, 7);
  assert.ok(first.picks[0].slot);
  assert.ok(first.spentQuality <= first.qualityBudget);
  assert.ok(new Set(first.picks.map(({ id }) => id)).size >= 3);
  assert.equal(
    first.picks.reduce((total, item) => total + lootQualityCost(item), 0),
    first.spentQuality,
  );
});

test('abundance changes only the loot layer of a seeded dungeon', () => {
  const options = { seed: 44191, depth: 3 };
  const lean = generateDungeon({ ...options, lootAbundance: MIN_LOOT_ABUNDANCE });
  const normal = generateDungeon({ ...options, lootAbundance: DEFAULT_LOOT_ABUNDANCE });
  const rich = generateDungeon({ ...options, lootAbundance: MAX_LOOT_ABUNDANCE });

  assert.ok(lean.loot.length < normal.loot.length);
  assert.ok(normal.loot.length < rich.loot.length);
  assert.deepEqual(lean.grid, rich.grid);
  assert.deepEqual(lean.rooms, rich.rooms);
  assert.deepEqual(lean.monsters, rich.monsters);
  assert.deepEqual(lean.doors, rich.doors);
  assert.ok(lean.loot.some(({ id }) => id !== 'coin-cache'));
  for (const floor of [lean, normal, rich]) {
    assert.equal(floor.loot.length, floorBudget(floor).lootCount);
    assert.equal(Object.hasOwn(floor.loot[0], 'sanctity'), false);
    assert.equal(Object.hasOwn(floor.loot[0], 'sanctityKnown'), false);
  }
});

test('high abundance stays mostly common across a seed sweep', () => {
  let total = 0;
  let rare = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 3, lootAbundance: MAX_LOOT_ABUNDANCE });
    for (const spawn of dungeon.loot) {
      if (spawn.id === 'coin-cache') continue;
      total += 1;
      const definition = lootById(spawn.id);
      if ((definition?.rarity ?? 0) >= 2) rare += 1;
    }
  }
  // The real catalog is broader than the small fixture above. This assertion
  // guards the player-facing outcome: abundance adds variety, not rare-item rain.
  assert.ok(total > 1000);
  assert.ok(rare / total < 0.12);
});

/**
 * Носимое — находка, а не третья штука за этаж.
 *
 * Иван: «очень легко зачистить первый этаж, пойти в город и купить себе фулл
 * сет брони. <...> вещи в игре должны быть дорогие, чтобы это была находка.
 * <...> урежь всё-таки находки, если сейчас 2.2, то сделаем 1.5».
 *
 * Резать сам счёт мест нельзя: по нему отмерены и еда — час полосы голода на
 * дорогу, — и золото сокровищницы. Поэтому мест столько же, а вес железа в
 * лотерее прижат. Здесь заперт итог: полторы вещи на ранний этаж, и золото с
 * едой при этом на месте.
 */
test('на раннем этаже носимого около полутора штук, а золото и еда на месте', async () => {
  const { generateDungeon } = await import('../tools/dcss-rpg-core.js');
  const { lootById } = await import('../tools/dcss-rpg-content.js');
  let носимых = 0;
  let золота = 0;
  let этажей = 0;
  for (const depth of [1, 2, 3]) {
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const branch of ['deep', 'surface', 'crypt']) {
        const dungeon = generateDungeon({ seed, depth, branch });
        этажей += 1;
        for (const spawn of dungeon.loot) {
          const item = lootById(spawn.id);
          if (!item) continue;
          if (item.gold) золота += spawn.amount ?? 1;
          else if (item.slot) носимых += 1;
        }
      }
    }
  }
  const наЭтаж = носимых / этажей;
  assert.ok(наЭтаж > 1.2 && наЭтаж < 1.8, `носимого на этаж: ${наЭтаж.toFixed(2)}`);
  // И сокровищница не осушена: без золота под ногами ранние этажи оставались,
  // когда счёт мест резали напрямую.
  assert.ok(золота / этажей > 3, `золота на этаж: ${(золота / этажей).toFixed(1)}`);
});
