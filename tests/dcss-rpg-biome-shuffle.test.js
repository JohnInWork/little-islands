import assert from 'node:assert/strict';
import test from 'node:test';

import { environmentThemeFor } from '../tools/dcss-rpg-room-plans.js';
import { FINAL_DEPTH, FLOORS_PER_CHAPTER } from '../tools/dcss-rpg-run.js';
import { CITY_DEPTH } from '../tools/dcss-rpg-city.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import {
  DUNGEON_THEME_CATALOG,
  chapterThemeOrder,
  dungeonThemeById,
  dungeonThemeFor,
  roomArchetypeById,
} from '../tools/dcss-rpg-room-plans.js';

test('the shuffle is a permutation, not a reshuffle that loses things', () => {
  for (let seed = 0; seed < 300; seed += 1) {
    const order = chapterThemeOrder(seed);
    assert.equal(order.length, DUNGEON_THEME_CATALOG.length);
    assert.equal(new Set(order).size, order.length, `seed ${seed} repeats a theme`);
    for (const theme of DUNGEON_THEME_CATALOG) assert.ok(order.includes(theme), theme.id);
  }
  assert.throws(() => chapterThemeOrder(-1), /run seed/);
  assert.throws(() => chapterThemeOrder(1.5), /run seed/);
});

test('one seed, one world: the same run always meets the same places', () => {
  for (const seed of [0, 1, 99, 65535]) {
    for (let depth = 1; depth <= FINAL_DEPTH; depth += 1) {
      assert.equal(dungeonThemeFor(seed, depth), dungeonThemeFor(seed, depth));
      // And the floor carries the answer, so nothing downstream recomputes it.
      assert.equal(generateDungeon({ seed, depth }).themeId, dungeonThemeFor(seed, depth).id);
    }
  }
});

test('every theme the game ships gets played, and no run sees them all', () => {
  const met = new Set();
  const openings = new Set();
  for (let seed = 0; seed < 400; seed += 1) {
    const chapters = [];
    for (let depth = 1; depth <= FINAL_DEPTH; depth += FLOORS_PER_CHAPTER) {
      chapters.push(dungeonThemeFor(seed, depth).id);
    }
    for (const id of chapters) met.add(id);
    openings.add(chapters[0]);
    // Three chapters out of four themes: something is always left for next time.
    assert.equal(new Set(chapters).size, chapters.length, `seed ${seed} repeats a chapter`);
    assert.ok(chapters.length < DUNGEON_THEME_CATALOG.length);
  }
  assert.equal(met.size, DUNGEON_THEME_CATALOG.length, 'a shipped theme is never reachable');
  assert.equal(openings.size, DUNGEON_THEME_CATALOG.length, 'the run always opens in the same place');
});

test('the surface is not shuffled, and a floor keeps its place for a whole chapter', () => {
  for (const seed of [2, 8, 77]) {
    assert.equal(dungeonThemeFor(seed, CITY_DEPTH).id, 'gate-town');
    assert.equal(generateDungeon({ seed, depth: CITY_DEPTH }).themeId, 'gate-town');
    for (let first = 1; first <= FINAL_DEPTH; first += FLOORS_PER_CHAPTER) {
      const chapter = dungeonThemeFor(seed, first);
      for (let step = 1; step < FLOORS_PER_CHAPTER && first + step <= FINAL_DEPTH; step += 1) {
        assert.equal(dungeonThemeFor(seed, first + step), chapter, `seed ${seed}, floor ${first + step}`);
      }
    }
  }
  assert.throws(() => dungeonThemeFor(1, -1), /positive integer/);
  assert.equal(dungeonThemeById('nonsense'), null);
});

test('the whole floor agrees on where it is: surfaces, rooms and finds', () => {
  for (let seed = 1; seed <= 80; seed += 1) {
    const depth = 1 + (seed % FINAL_DEPTH);
    const dungeon = generateDungeon({ seed, depth });
    const theme = dungeonThemeById(dungeon.themeId);
    assert.ok(theme, `seed ${seed}: floor ${depth} has no theme`);
    // The finds are skinned by the floor's theme, not by its number — this is
    // the join that used to be computed twice and could disagree silently.
    for (const find of dungeon.finds) {
      if (!find.themeId) continue;
      assert.equal(find.themeId, dungeon.themeId, `seed ${seed}: ${find.id} is from another place`);
    }
    // The real risk of shuffling: a room that has no idea how to look in the
    // place it now finds itself. Every archetype on the floor must have art for
    // this theme — including the infernal core, which until now appeared on no
    // floor at all and so was never checked against anything.
    for (const plan of dungeon.roomPlans) {
      if (!plan.archetypeId) continue;
      const archetype = roomArchetypeById(plan.archetypeId);
      assert.ok(archetype, `${plan.archetypeId} is not a known room`);
      assert.ok(
        environmentThemeFor(archetype, dungeon.themeId),
        `${plan.archetypeId} has no look for ${dungeon.themeId}`,
      );
    }
  }
});
