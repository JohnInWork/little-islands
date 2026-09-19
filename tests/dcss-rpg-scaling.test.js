import assert from 'node:assert/strict';
import test from 'node:test';

import { conditionEffects, conditionedFloor } from '../tools/dcss-rpg-conditions.js';

import { isCityDepth } from '../tools/dcss-rpg-city.js';

import { LOOT_CATALOG, MONSTER_CATALOG, monsterById } from '../tools/dcss-rpg-content.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import {
  DEFAULT_DIFFICULTY,
  SCALING_VERSION,
  effectiveLootDepth,
  floorScaling,
  itemPowerScore,
  monsterTier,
} from '../tools/dcss-rpg-scaling.js';
import { STORY_DEPTH, FLOORS_PER_CHAPTER } from '../tools/dcss-rpg-run.js';

test('one versioned floor profile owns every progression axis', () => {
  const shallow = floorScaling(1);
  const final = floorScaling(STORY_DEPTH);
  const endless = floorScaling(24);

  assert.equal(shallow.version, SCALING_VERSION);
  assert.equal(Object.isFrozen(shallow), true);
  assert.equal(Object.isFrozen(shallow.encounters), true);
  assert.deepEqual(
    {
      rooms: shallow.layout.roomCount,
      monsters: shallow.encounters.monsterCount,
      tier: shallow.encounters.maxMonsterTier,
      loot: shallow.rewards.lootCount,
    },
    { rooms: 9, monsters: 11, tier: 1, loot: 4 },
  );
  assert.deepEqual(
    {
      count: final.encounters.monsterCount,
      tier: final.encounters.maxMonsterTier,
    },
    { count: 24, tier: 9 },
  );
  assert.equal(final.chapter, 3);
  assert.equal(final.floorInChapter, FLOORS_PER_CHAPTER);
  assert.equal(final.chapterEnd, true);
  assert.equal(final.rewards.chapterBonus, true);
  assert.ok(final.dangerRating > shallow.dangerRating);
  assert.ok(final.monsters.hpMultiplier > shallow.monsters.hpMultiplier);
  assert.ok(final.monsters.damageMultiplier > shallow.monsters.damageMultiplier);
  assert.ok(final.boss.hpMultiplier > 1);
  assert.ok(final.boss.damageMultiplier > 1);
  assert.equal(endless.encounters.monsterCount, 24);
  assert.equal(endless.encounters.maxMonsterTier, 9);
  assert.ok(endless.dangerRating > final.dangerRating);
});

test('the curve is monotonic and bounded across future floors', () => {
  let previous = floorScaling(1);
  for (let depth = 2; depth <= 100; depth += 1) {
    const current = floorScaling(depth);
    assert.ok(current.dangerRating > previous.dangerRating);
    assert.ok(current.encounters.threatBudget >= previous.encounters.threatBudget);
    assert.ok(current.encounters.monsterCount >= previous.encounters.monsterCount);
    assert.ok(current.encounters.maxMonsterTier >= previous.encounters.maxMonsterTier);
    assert.ok(current.monsters.hpMultiplier > previous.monsters.hpMultiplier);
    assert.ok(current.monsters.damageMultiplier > previous.monsters.damageMultiplier);
    assert.ok(current.rewards.lootCount >= previous.rewards.lootCount);
    assert.ok(current.encounters.monsterCount <= 24);
    assert.ok(current.encounters.maxMonsterTier <= 9);
    assert.ok(current.rewards.lootCount <= 9);
    previous = current;
  }
  assert.throws(() => floorScaling(0), /positive integer/);
  assert.throws(() => floorScaling(1, 999), /Unsupported scaling version/);
});

test('one persisted difficulty value scales the complete combat pressure', () => {
  assert.equal(floorScaling(STORY_DEPTH).difficulty, DEFAULT_DIFFICULTY);
  const relaxed = floorScaling(STORY_DEPTH, SCALING_VERSION, 0.7);
  const normal = floorScaling(STORY_DEPTH, SCALING_VERSION, 1);
  const brutal = floorScaling(STORY_DEPTH, SCALING_VERSION, 1.4);

  assert.ok(relaxed.encounters.threatBudget < normal.encounters.threatBudget);
  assert.ok(brutal.encounters.threatBudget > normal.encounters.threatBudget);
  assert.ok(relaxed.monsters.hpMultiplier < normal.monsters.hpMultiplier);
  assert.ok(brutal.monsters.hpMultiplier > normal.monsters.hpMultiplier);
  assert.ok(relaxed.monsters.damageMultiplier < normal.monsters.damageMultiplier);
  assert.ok(brutal.monsters.damageMultiplier > normal.monsters.damageMultiplier);
  assert.ok(relaxed.monsters.attackRateMultiplier < normal.monsters.attackRateMultiplier);
  assert.ok(brutal.monsters.attackRateMultiplier > normal.monsters.attackRateMultiplier);
  assert.equal(relaxed.boss.hpMultiplier, normal.boss.hpMultiplier);
  assert.equal(brutal.boss.hpMultiplier, normal.boss.hpMultiplier);
  assert.equal(relaxed.rewards.lootCount, brutal.rewards.lootCount);
  assert.throws(() => floorScaling(1, SCALING_VERSION, 0.49), /between/);
  assert.throws(() => floorScaling(1, SCALING_VERSION, 4.01), /between/);
});

test('the default profile is more than twice the previous combat pressure without double-scaling bosses', () => {
  const previous = floorScaling(1, SCALING_VERSION, 1);
  const current = floorScaling(1);
  assert.equal(DEFAULT_DIFFICULTY, 2.4);
  assert.ok(current.encounters.monsterCount > previous.encounters.monsterCount);
  assert.ok(current.monsters.hpMultiplier >= previous.monsters.hpMultiplier * 2.4);
  assert.ok(current.monsters.damageMultiplier >= previous.monsters.damageMultiplier * 2.4);
  assert.equal(current.boss.hpMultiplier, previous.boss.hpMultiplier);
  assert.equal(current.boss.damageMultiplier, previous.boss.damageMultiplier);
});

test('new loot and monsters can be classified from their own data', () => {
  const weakItem = {
    id: 'test-knife',
    slot: 'hand1',
    rarity: 0,
    stats: { attack: 1 },
    combat: { style: 'blade', range: 1, damageScale: 0.8, guard: 0 },
  };
  const strongItem = {
    id: 'test-relic',
    slot: 'hand1',
    rarity: 3,
    stats: { attack: 12, defense: 5, maxHp: 20, attackSpeed: 0.15 },
    combat: { style: 'staff', range: 6, damageScale: 1.3, projectile: 'arcane' },
  };
  assert.ok(itemPowerScore(strongItem) > itemPowerScore(weakItem));
  assert.equal(effectiveLootDepth(weakItem), 1);
  assert.ok(effectiveLootDepth(strongItem) >= 6);
  assert.equal(effectiveLootDepth({ ...strongItem, minDepth: 2 }), 2);

  const rat = {
    hp: 2,
    damage: 2,
    speed: 0.9,
    threat: { attackRate: 0.8, vision: 4, windup: 0.3, pursuit: 3 },
  };
  const dragon = {
    hp: 48,
    damage: 30,
    speed: 1.2,
    boss: true,
    threat: { attackRate: 1.1, vision: 9, windup: 0.2, pursuit: 9 },
  };
  assert.equal(monsterTier(rat), 1);
  assert.ok(monsterTier(dragon) >= 6);
  assert.equal(monsterTier({ ...dragon, tier: 2 }), 2);
});

test('generated floors expose the same profile used for monsters and loot', () => {
  for (let depth = 1; depth <= 12; depth += 1) {
    const profile = floorScaling(depth);
    for (let seed = 1; seed <= 80; seed += 1) {
      const dungeon = generateDungeon({ seed, depth });
      assert.deepEqual(dungeon.scaling, profile);
      // The city shares the floor profile but not the dungeon's budgets.
      if (isCityDepth(depth)) continue;
      // The profile still governs; the run's two conditions bend it, and this is
      // the only thing they are allowed to bend.
      const budget = conditionedFloor(profile, conditionEffects(dungeon.conditionIds));
      const pooled = dungeon.monsters.filter(({ id }) => !monsterById(id).spawn && !monsterById(id).chapter);
      assert.ok(pooled.length <= budget.monsterCount);
      assert.ok(
        pooled.every(
          ({ id }) => monsterTier(monsterById(id)) <= profile.encounters.maxMonsterTier,
        ),
      );
      assert.equal(dungeon.loot.length, budget.lootCount);
      assert.ok(
        dungeon.loot.every(({ id }) => {
          const item = LOOT_CATALOG.find((candidate) => candidate.id === id);
          return effectiveLootDepth(item) <= depth;
        }),
      );
    }
  }

  assert.ok(MONSTER_CATALOG.every((monster) => monsterTier(monster) >= 1));
  assert.ok(LOOT_CATALOG.every((item) => effectiveLootDepth(item) >= 1));
});

/**
 * The descent has no bottom, so the curve has to answer a question it never had
 * to before: what happens on floor ninety?
 *
 * Two different answers, and keeping them apart is the whole design. The
 * NUMBERS — hp, damage, experience — keep climbing, because an endless descent
 * has to kill you eventually and how far down that happened is the score. The
 * TEMPO — how fast a creature moves, how often it strikes, how long it winds up,
 * how far it chases — stops at the pace the game was tuned at. A monster eleven
 * times faster than the hero is not difficult, it is unreadable: you cannot
 * flee it, kite it or see it swing, and the floor stops being a fight.
 */
test('past the road the numbers keep climbing and the tempo does not', () => {
  const end = floorScaling(STORY_DEPTH).monsters;
  const far = floorScaling(STORY_DEPTH * 5).monsters;

  for (const knob of ['moveSpeedMultiplier', 'attackRateMultiplier', 'visionBonus', 'windupReduction', 'pursuitBonus']) {
    assert.equal(far[knob], end[knob], `${knob} kept climbing past the end of the road`);
  }
  for (const knob of ['hpMultiplier', 'damageMultiplier', 'xpMultiplier']) {
    assert.ok(far[knob] > end[knob] * 2, `${knob} stopped growing`);
  }

  // And the tempo rises the whole way there — a ceiling is not a flat line.
  let previous = 0;
  for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
    const speed = floorScaling(depth).monsters.moveSpeedMultiplier;
    assert.ok(speed > previous, `floor ${depth} is no faster than the one above`);
    previous = speed;
  }
  // A creature never outruns the hero by more than it did at the tuned ending.
  assert.ok(end.moveSpeedMultiplier < 2.5, `the ceiling drifted to ${end.moveSpeedMultiplier}`);
  // The telegraph survives at any depth: a windup that reads is the whole of
  // this game's combat.
  assert.ok(far.windupReduction < 0.2, `the swing telegraph is gone: -${far.windupReduction}s`);
});

/**
 * The road doubled in length because a place needs longer than three floors to
 * feel like a place — not because the game should be twice as hard. So the
 * climb is stretched over the whole road instead of steepened: the last floor
 * of the new road is the last floor of the tuned nine-floor one.
 */
test('a longer road stretches the climb instead of steepening it', () => {
  const tuned = floorScaling(9, 2).monsters;
  const ending = floorScaling(STORY_DEPTH).monsters;
  for (const knob of Object.keys(tuned)) {
    assert.equal(ending[knob], tuned[knob], `${knob} ends somewhere else than the tuned run did`);
  }
  // And the first floor is untouched: the game starts where it always started.
  assert.deepEqual(floorScaling(1).monsters, floorScaling(1, 2).monsters);
  // Version two is a promise about the past and does not move when the road
  // does: its chapters stay three floors long, whatever a chapter is now.
  assert.equal(floorScaling(3, 2).chapterEnd, true);
  assert.equal(floorScaling(3).chapterEnd, false, 'a chapter is six floors now');
  assert.equal(floorScaling(FLOORS_PER_CHAPTER).chapterEnd, true);
});
