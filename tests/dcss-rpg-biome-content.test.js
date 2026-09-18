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
import { LOOT_CATALOG, MONSTER_CATALOG } from '../tools/dcss-rpg-content.js';
import { DUNGEON_THEME_CATALOG } from '../tools/dcss-rpg-room-plans.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';

const kinOf = new Map(MONSTER_CATALOG.map((monster) => [monster.id, monster.kin]));
const itemOf = new Map(LOOT_CATALOG.map((item) => [item.id, item]));

/** One sweep, reused by every measurement below; generation is seeded, so it is stable. */
const survey = (() => {
  const themes = new Map();
  // The whole run, not a slice of it: a dragon is tier six and never turns up
  // on a shallow floor, so a sweep that skips the deep ones would report an
  // empty place where there is only a shallow sample.
  for (let seed = 1; seed <= 260; seed += 1) {
    for (let depth = 1; depth <= 9; depth += 1) {
      const dungeon = generateDungeon({ seed, depth });
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
  // The numbers are shares of spawned monsters over 800 generated floors.
  assert.ok(
    kinShare('buried-sanctum', 'undead') > kinShare('ashen-vault', 'undead') * 2.5,
    'a sanctum is full of what was buried in it',
  );
  assert.ok(
    kinShare('infernal-core', 'demon') > kinShare('frozen-depths', 'demon') * 4,
    'demons belong to the fire, not to the ice',
  );
  assert.ok(kinShare('ashen-vault', 'humanoid') > kinShare('buried-sanctum', 'humanoid') * 1.5);
  assert.ok(kinShare('frozen-depths', 'beast') > kinShare('infernal-core', 'beast') * 1.8);
  // And no place is empty of anything: every kin still turns up everywhere.
  for (const themeId of Object.keys(BIOME_CONTENT)) {
    for (const kin of MONSTER_KINS) {
      assert.ok((survey.get(themeId).kin.get(kin) ?? 0) > 0, `${kin} never appears in ${themeId}`);
    }
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
  // And the floors of every place still feed the hero at about the same rate.
  const perFloor = [...survey.values()].map((entry) => entry.nutrition / entry.floors);
  const mean = perFloor.reduce((sum, value) => sum + value, 0) / perFloor.length;
  for (const value of perFloor) {
    assert.ok(
      Math.abs(value - mean) / mean < 0.45,
      `a floor of one place feeds ${value.toFixed(0)} against ${mean.toFixed(0)}`,
    );
  }
});
