import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BIOME_CONTENT,
  BIOME_WEIGHT_RANGE,
  CONTENT_ELEMENTS,
  LOOT_CATEGORIES,
  MONSTER_KINS,
  biomeContentProblems,
  lootBiomeWeight,
  lootCategory,
  monsterBiomeWeight,
} from '../tools/dcss-rpg-biome-content.js';
import {
  LOOT_CATALOG,
  MONSTER_CATALOG,
  RUN_BRANCHES,
  monsterSuitsBranch,
} from '../tools/dcss-rpg-content.js';
import { DUNGEON_THEME_CATALOG, OPENING_THEME_IDS } from '../tools/dcss-rpg-room-plans.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { STORY_DEPTH } from '../tools/dcss-rpg-run.js';
import { SUPPLY_POOL_SHARE, balanceSupplyWeights } from '../tools/dcss-rpg-loot-economy.js';

const kinOf = new Map(MONSTER_CATALOG.map((monster) => [monster.id, monster.kin]));
const itemOf = new Map(LOOT_CATALOG.map((item) => [item.id, item]));

/** One sweep, reused by every measurement below; generation is seeded, so it is stable. */
const survey = (() => {
  const themes = new Map();
  // The whole road, not a slice of it: a dragon is tier six and never turns up
  // on a shallow floor, so a sweep that stops halfway would report an empty
  // place where there is only a shallow sample. The seed count is halved as
  // the road doubles, so the sample size stays what it was measured at.
  for (let seed = 1; seed <= 130; seed += 1) {
    for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
      for (const branch of RUN_BRANCHES) {
      const dungeon = generateDungeon({ seed, depth, branch });
      const entry = themes.get(dungeon.themeId)
        ?? { floors: 0, monsters: 0, kin: new Map(), loot: 0, category: new Map(), nutrition: 0 };
      entry.floors += 1;
      for (const spawn of dungeon.monsters) {
        const kin = kinOf.get(spawn.id);
        entry.monsters += 1;
        entry.kin.set(kin, (entry.kin.get(kin) ?? 0) + 1);
      }
      for (const drop of dungeon.loot) {
        const item = itemOf.get(drop.id);
        if (!item) continue;
        const category = lootCategory(item);
        entry.loot += 1;
        entry.category.set(category, (entry.category.get(category) ?? 0) + 1);
        if (item.useEffect?.type === 'food') {
          entry.nutrition += item.useEffect.nutrition * (drop.amount ?? 1);
        }
      }
      themes.set(dungeon.themeId, entry);
      }
    }
  }
  return themes;
})();

const kinShare = (themeId, kin) => (survey.get(themeId).kin.get(kin) ?? 0) / survey.get(themeId).monsters;
const lootShare = (themeId, category) =>
  (survey.get(themeId).category.get(category) ?? 0) / survey.get(themeId).loot;

test('every creature and every place is tagged', () => {
  assert.deepEqual(
    biomeContentProblems({
      monsters: MONSTER_CATALOG,
      loot: LOOT_CATALOG,
      themeIds: DUNGEON_THEME_CATALOG.map((theme) => theme.id),
    }),
    [],
  );
  assert.equal(Object.keys(BIOME_CONTENT).length, DUNGEON_THEME_CATALOG.length);
});

test('a biome weighs, it never gates', () => {
  const [low, high] = BIOME_WEIGHT_RANGE;
  assert.ok(low > 0, 'a multiplier of zero would take content out of the game');
  for (const themeId of Object.keys(BIOME_CONTENT)) {
    for (const monster of MONSTER_CATALOG) {
      const weight = monsterBiomeWeight(monster, themeId);
      assert.ok(weight >= low * low && weight <= high * high, `${monster.id} in ${themeId}`);
    }
    for (const item of LOOT_CATALOG) {
      assert.ok(lootBiomeWeight(item, themeId) > 0, `${item.id} in ${themeId}`);
    }
  }
  // The city, and any place added before its table: no opinion, not an empty floor.
  assert.equal(monsterBiomeWeight({ kin: 'demon', element: 'fire' }, 'gate-town'), 1);
  assert.equal(lootBiomeWeight({ kind: 'book' }, 'gate-town'), 1);
});

test('an item is sorted by what it is for', () => {
  assert.equal(lootCategory(itemOf.get('long-sword')), 'weapon');
  assert.equal(lootCategory(itemOf.get('black-plate')), 'armour');
  assert.equal(lootCategory(itemOf.get('ice-ring')), 'jewellery');
  assert.equal(lootCategory(itemOf.get('book-of-frost')), 'book');
  assert.equal(lootCategory(itemOf.get('bread')), 'supply');
  assert.ok(LOOT_CATALOG.every((item) => LOOT_CATEGORIES.includes(lootCategory(item))));
});

test('the place decides who lives there', () => {
  // The numbers are shares of spawned monsters over the sweep above.
  assert.ok(
    kinShare('buried-sanctum', 'undead') > kinShare('ashen-vault', 'undead') * 2.5,
    'a sanctum is full of what was buried in it',
  );
  // Hell and the descent are different roads now, so the fire is compared with
  // the fire: gehenna is the hottest place hell has, and the acid pits the
  // least demonic of the three.
  assert.ok(
    kinShare('gehenna-floor', 'demon') > kinShare('acid-pits', 'demon'),
    'demons belong to the fire',
  );
  assert.ok(kinShare('ashen-vault', 'humanoid') > kinShare('buried-sanctum', 'humanoid') * 1.5);
  assert.ok(
    kinShare('beast-lair', 'beast') > kinShare('frozen-depths', 'beast'),
    'a lair is what lives in it',
  );
  // And no place is empty of anything its branch can host. A demon never walks
  // a meadow — that is `habitat`, not the biome — but everything the branch
  // does have turns up in every one of its places.
  for (const [themeId, content] of Object.entries(BIOME_CONTENT)) {
    const branch = DUNGEON_THEME_CATALOG.find((theme) => theme.id === themeId).branch;
    // `unique` keeps a creature out of the ordinary pool, not out of the floor:
    // the mimic is placed by its own chest. Habitat is the only thing a branch
    // rules on.
    const hosted = new Set(MONSTER_CATALOG
      .filter((monster) => !monster.spawn && monsterSuitsBranch(monster, branch))
      .map((monster) => monster.kin));
    for (const kin of MONSTER_KINS) {
      const seen = survey.get(themeId).kin.get(kin) ?? 0;
      // The two places the descent always opens with are always shallow, so the
      // deep tiers never meet them inside the written road. That is the depth
      // schedule talking, not the biome table — the table is checked not to
      // silence anything by `a biome weighs, it never gates`.
      if (hosted.has(kin) && !OPENING_THEME_IDS.includes(themeId)) {
        assert.ok(seen > 0, `${kin} never appears in ${themeId}`);
      }
      if (!hosted.has(kin)) assert.equal(seen, 0, `${kin} has no business in ${themeId}`);
    }
    assert.ok(content.kin, themeId);
  }
});

test('the place decides what is left lying there', () => {
  assert.ok(lootShare('infernal-core', 'weapon') > lootShare('frozen-depths', 'weapon') * 1.5);
  assert.ok(lootShare('frozen-depths', 'armour') > lootShare('infernal-core', 'armour') * 1.5);
  assert.ok(lootShare('buried-sanctum', 'book') > lootShare('ashen-vault', 'book') * 1.8);
  assert.ok(CONTENT_ELEMENTS.every((element) =>
    LOOT_CATALOG.some((item) => item.element === element)));
});

/**
 * The bread has already rotted once: a promise resting on pool weights loses to
 * every content addition. Supplies are therefore outside this system — checked
 * at the mechanism, because an average over places is too noisy to catch a leak
 * and gets noisier with every place added.
 */
test('no biome is the hungry one', () => {
  for (const [themeId, content] of Object.entries(BIOME_CONTENT)) {
    assert.equal(content.loot.supply, undefined, `${themeId} puts a hand on the larder`);
    for (const item of LOOT_CATALOG) {
      if (lootCategory(item) !== 'supply') continue;
      assert.equal(lootBiomeWeight(item, themeId), 1, `${item.id} in ${themeId}`);
    }
  }
  /**
   * And every place draws the same share of food — checked at the mechanism,
   * exactly, rather than by averaging over seeds.
   *
   * The average was how this was checked before, and it was never able to say
   * much: food is rare enough that the noise of a sample is bigger than any
   * leak worth catching, and it got noisier every time the supply was tuned
   * down. `balanceSupplyWeights` makes the share an arithmetic fact, so it is
   * read as one.
   */
  const isSupply = (item) => item.useEffect?.type === 'food';
  for (const themeId of Object.keys(BIOME_CONTENT)) {
    const pool = LOOT_CATALOG.map((item) => ({
      ...item,
      weight: (item.weight ?? 1) * lootBiomeWeight(item, themeId),
    }));
    const balanced = balanceSupplyWeights(pool, isSupply);
    const total = balanced.reduce((sum, item) => sum + item.weight, 0);
    const supply = balanced.filter(isSupply).reduce((sum, item) => sum + item.weight, 0);
    assert.ok(
      Math.abs(supply / total - SUPPLY_POOL_SHARE) < 0.001,
      `${themeId} draws ${(supply / total * 100).toFixed(1)}% food against ${(SUPPLY_POOL_SHARE * 100).toFixed(1)}%`,
    );
  }
  // And the sweep still sees food everywhere, which no arithmetic can promise.
  for (const [themeId, entry] of survey) {
    assert.ok(entry.nutrition > 0, `${themeId} fed nobody in the whole sweep`);
  }
});
