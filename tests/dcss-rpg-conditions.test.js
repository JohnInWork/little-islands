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
import { FLOORS_PER_CHAPTER, STORY_DEPTH } from '../tools/dcss-rpg-run.js';

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

/**
 * The draw is dormant, not gone. Ivan asked to take the conditions out of the
 * start menu — «пока все забеги с одинаковыми условиями» — and «пока» is the
 * whole of it: `CONDITIONS_PER_RUN` is nought and everything behind it is
 * still here, still fair, and still tested by asking it for two.
 */
test('a run draws two rules from its own seed and never stacks them on one knob', () => {
  const pairs = new Set();
  for (let seed = 0; seed < 600; seed += 1) {
    const ids = runConditions(seed, 2);
    assert.equal(ids.length, 2);
    assert.deepEqual(ids, runConditions(seed, 2), 'the same seed is the same run');
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
  assert.deepEqual(runConditions(-1, 2), []);
  // And what the game itself deals today: nothing at all.
  assert.equal(CONDITIONS_PER_RUN, 0);
  for (const seed of [0, 1, 7, 4242]) assert.deepEqual(runConditions(seed), []);
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
  for (let seed = 1; seed <= 120; seed += 1) {
    seen.add(runConditions(seed).join('+'));
    const book = guaranteedSpellBookPlacement(seed);
    let bookPlaced = false;
    for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
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
      if (depth % FLOORS_PER_CHAPTER === 0) assert.ok(dungeon.objective, `seed ${seed} depth ${depth}: no guardian`);
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
  // Every run lives by the same rules today — that is the point of setting
  // CONDITIONS_PER_RUN to nought — so the sweep above covered one set: none.
  assert.deepEqual([...seen], [''], `runs differ by condition: ${[...seen].join(' / ')}`);
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
  /**
   * And the road as a whole feeds the hero for most of a bar, but not for the
   * road. That gap is the point: hunger became a clock rather than a debuff —
   * an empty bar takes health now — so the number is calibrated against what a
   * road costs, not against half a bar. Eighteen floors hand out about fifty
   * minutes of sixty, which means a hero who starts full lives the second half
   * close to empty and cannot also clear every room.
   */
  let nutrition = 0;
  const runs = 120;
  for (let seed = 1; seed <= runs; seed += 1) {
    for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
      nutrition += nutritionOn(generateDungeon({ seed, depth }));
    }
  }
  const minutes = nutrition / runs / 60;
  assert.ok(minutes > 42 && minutes < 58, `the road's supply is ${minutes.toFixed(1)} minutes of 60`);
  // The shallow half is never the hungry half: the teaching floors feed you.
  let early = 0;
  for (let seed = 1; seed <= runs; seed += 1) {
    for (let depth = 1; depth <= 6; depth += 1) early += nutritionOn(generateDungeon({ seed, depth }));
  }
  assert.ok(early / runs / 60 > 8, `the first chapter only feeds ${(early / runs / 60).toFixed(1)} minutes`);
});

test('the runtime reads the run it is standing on, and shows it before the first step', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  // Hunger is counted in whole seconds and says so. A multiplier makes a
  // fraction of them, and «Голодный год» threw on every single tick.
  assert.match(runtime, /Math\.round\(\s*\n\s*frugalHungerSeconds[\s\S]{0,140}?hungerScale/);
  // One reader, fed by the floor, so nothing has to know the run seed.
  assert.match(runtime, /function currentConditions\(\)[\s\S]*conditionEffects\(dungeon\.conditionIds \?\? \[\]\)/);
  for (const knob of ['goldScale', 'revealRadiusDelta', 'monsterVisionDelta', 'monsterSpeedScale', 'heroSpeedScale', 'hungerScale', 'foodHealingScale']) {
    assert.match(runtime, new RegExp(`currentConditions\\(\\)\\.${knob}`), `${knob} is declared and never read`);
  }
  // A condition the player cannot read is difficulty wearing a hat.
  assert.match(runtime, /function renderRunConditions\(label\)[\s\S]*conditionCopy\(id, itemDetailLanguage\)/);
  assert.match(runtime, /renderRunConditions\(labels\.conditions\)/);
});
