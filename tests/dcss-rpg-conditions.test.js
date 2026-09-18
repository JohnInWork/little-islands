import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CONDITIONS_PER_RUN,
  CONDITION_CATALOG,
  CONDITION_IDS,
  FORBIDDEN_KNOBS,
  NEUTRAL_EFFECTS,
  conditionById,
  conditionCopy,
  conditionEffects,
  conditionProblems,
  conditionedFloor,
  runConditions,
} from '../tools/dcss-rpg-conditions.js';
import { LOOT_CATALOG } from '../tools/dcss-rpg-content.js';
import { guaranteedSpellBookPlacement } from '../tools/dcss-rpg-books.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { floorScaling } from '../tools/dcss-rpg-scaling.js';

const itemById = new Map(LOOT_CATALOG.map((item) => [item.id, item]));
const nutritionOf = (id) => {
  const item = itemById.get(id);
  return item?.useEffect?.type === 'food' ? item.useEffect.nutrition : 0;
};

/** Everything edible a floor holds, on the ground and inside its finds. */
const nutritionOn = (dungeon) => (
  dungeon.loot.reduce((sum, drop) => sum + nutritionOf(drop.id) * (drop.amount ?? 1), 0)
  + dungeon.finds.reduce(
    (sum, find) => sum + (find.items ?? []).reduce((total, item) => total + nutritionOf(item.id), 0),
    0,
  )
);

test('the catalogue can always be drawn from, and every rule gives as well as takes', () => {
  assert.deepEqual(conditionProblems(), []);
  assert.ok(CONDITION_CATALOG.length >= 6);
  for (const condition of CONDITION_CATALOG) {
    for (const language of ['ru', 'en']) {
      const copy = conditionCopy(condition.id, language);
      assert.ok(copy.name.length > 0 && copy.gives.length > 0 && copy.takes.length > 0);
    }
  }
  assert.equal(conditionById('nothing-of-the-sort'), null);
  assert.equal(conditionCopy('nothing-of-the-sort'), null);
});

test('a run draws two rules from its own seed and never stacks them on one knob', () => {
  const pairs = new Set();
  for (let seed = 0; seed < 600; seed += 1) {
    const ids = runConditions(seed);
    assert.equal(ids.length, CONDITIONS_PER_RUN);
    assert.deepEqual(ids, runConditions(seed), 'the same seed is the same run');
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => CONDITION_IDS.includes(id)));
    const [first, second] = ids.map((id) => Object.keys(conditionById(id).effects));
    assert.equal(
      first.some((knob) => second.includes(knob)),
      false,
      `${ids.join('+')} stack on one knob`,
    );
    pairs.add(ids.join('+'));
  }
  assert.ok(pairs.size >= 16, `only ${pairs.size} different runs`);
  // Every rule turns up; none is written and then never dealt.
  const dealt = new Set([...pairs].flatMap((pair) => pair.split('+')));
  assert.deepEqual([...dealt].sort(), [...CONDITION_IDS].sort());
  assert.deepEqual(runConditions(-1), []);
  assert.deepEqual(conditionEffects([]), NEUTRAL_EFFECTS);
  assert.deepEqual(conditionEffects(['nothing-of-the-sort']), NEUTRAL_EFFECTS);
});

/**
 * The rule the catalogue exists under: conditions bend danger, sight, speed,
 * water, mechanisms and gold. They do not touch the loot layer, because food is
 * drawn from the same pool and any hand on its size or its quality moves the
 * run's supply with it — measured, the first draft ran from 17 minutes to 66.
 */
test('no condition may reach into the loot layer', () => {
  for (const condition of CONDITION_CATALOG) {
    for (const knob of FORBIDDEN_KNOBS) {
      assert.equal(Object.hasOwn(condition.effects, knob), false, `${condition.id}:${knob}`);
    }
  }
  const scaling = floorScaling(5);
  for (const id of CONDITION_IDS) {
    const bent = conditionedFloor(scaling, conditionEffects([id]));
    assert.equal(bent.lootCount, scaling.rewards.lootCount, id);
    assert.equal(bent.qualityBudget, scaling.rewards.qualityBudget, id);
  }
});

test('whatever the run lives by, the dungeon still owes it everything it owed', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 240; seed += 1) {
    seen.add(runConditions(seed).join('+'));
    const book = guaranteedSpellBookPlacement(seed);
    let bookPlaced = false;
    for (let depth = 1; depth <= 9; depth += 1) {
      const dungeon = generateDungeon({ seed, depth });
      const budget = conditionedFloor(dungeon.scaling, conditionEffects(dungeon.conditionIds));
      assert.deepEqual(dungeon.conditionIds, runConditions(seed), 'the floor carries the run');

      // The promised opening gear, on the floor, as equipment.
      if (depth === 1) assert.ok(itemById.get(dungeon.loot[0]?.id)?.slot, `seed ${seed}: bare start`);
      if (depth === book.depth) {
        bookPlaced = dungeon.loot.some(({ id }) => id === book.bookId);
      }
      // The artefact lives in a sealed cache, and its floor still has one.
      if (dungeon.artifactFloor) {
        assert.ok(dungeon.finds.some(({ id }) => id === 'sealed-cache'), `seed ${seed} depth ${depth}`);
      }
      // A chapter ends with its guardian.
      if (depth % 3 === 0) assert.ok(dungeon.objective, `seed ${seed} depth ${depth}: no guardian`);
      // A floor is never emptied out or buried.
      assert.equal(dungeon.loot.length, budget.lootCount);
      assert.ok(dungeon.monsters.length >= 2);
      assert.ok(dungeon.events.length >= 2, 'a floor keeps mechanisms for its own scenarios');

      // A cache's scenario is always built: guards to guard, a trap to spring.
      const cache = dungeon.finds.find(({ id }) => id === 'sealed-cache');
      const encounter = dungeon.roomEncounters.find(({ findId }) => findId === cache?.instanceId);
      if (cache?.cacheVariant === 'locked') assert.ok(encounter.monsterIds.length >= 1, `seed ${seed} depth ${depth}`);
      if (cache?.cacheVariant === 'trapped') assert.ok(encounter.trapEventIds.length >= 1, `seed ${seed} depth ${depth}`);
    }
    assert.ok(bookPlaced, `seed ${seed}: the first spell book never landed`);
  }
  assert.ok(seen.size >= 16, `only ${seen.size} different runs were checked`);
});

/**
 * The supply is a promise about the length of a run, and it is kept by keeping
 * conditions out of the loot layer rather than by hoping the averages hold —
 * an average over seeds is too noisy to catch a leak, which is how the bread
 * rotted twice before. So this checks the mechanism: every path a condition
 * could reach the larder through, held shut.
 */
test('no rule can reach the larder', () => {
  // The two knobs that would move it are forbidden outright, checked above.
  // Water is the only other knob that touches placement, and it moves rooms,
  // not rations: the same floor holds the same food wet or dry.
  for (let seed = 1; seed <= 120; seed += 1) {
    for (const depth of [1, 4, 7, 9]) {
      const dry = generateDungeon({ seed, depth, waterChance: 0 });
      const wet = generateDungeon({ seed, depth, waterChance: 1 });
      assert.equal(nutritionOn(wet), nutritionOn(dry), `seed ${seed} depth ${depth}`);
    }
  }
  // And the run as a whole still feeds the hero for about half of a hunger bar,
  // which is what the number was before conditions existed.
  let nutrition = 0;
  const runs = 120;
  for (let seed = 1; seed <= runs; seed += 1) {
    for (let depth = 1; depth <= 9; depth += 1) nutrition += nutritionOn(generateDungeon({ seed, depth }));
  }
  const minutes = nutrition / runs / 60;
  assert.ok(minutes > 28 && minutes < 42, `the run's supply is ${minutes.toFixed(1)} minutes of 60`);
});

test('the runtime reads the run it is standing on, and shows it before the first step', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  // Hunger is counted in whole seconds and says so. A multiplier makes a
  // fraction of them, and «Голодный год» threw on every single tick.
  assert.match(runtime, /Math\.round\(\s*\n\s*frugalHungerSeconds[\s\S]{0,90}?hungerScale,/);
  // One reader, fed by the floor, so nothing has to know the run seed.
  assert.match(runtime, /function currentConditions\(\)[\s\S]*conditionEffects\(dungeon\.conditionIds \?\? \[\]\)/);
  for (const knob of ['goldScale', 'revealRadiusDelta', 'monsterVisionDelta', 'monsterSpeedScale', 'heroSpeedScale', 'hungerScale', 'foodHealingScale']) {
    assert.match(runtime, new RegExp(`currentConditions\\(\\)\\.${knob}`), `${knob} is declared and never read`);
  }
  // A condition the player cannot read is difficulty wearing a hat.
  assert.match(runtime, /function renderRunConditions\(label\)[\s\S]*conditionCopy\(id, itemDetailLanguage\)/);
  assert.match(runtime, /renderRunConditions\(labels\.conditions\)/);
});
