import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MARK_MAX_CHANCE,
  MARK_MIN_DEPTH,
  MONSTER_MARKS,
  applyMark,
  markChanceAtDepth,
  markEffects,
  markForSpawn,
  markedMonsterName,
  monsterGender,
  monsterTakesMark,
} from '../tools/dcss-rpg-monster-marks.js';
import { MONSTER_CATALOG, monsterById } from '../tools/dcss-rpg-content.js';
import { runEndSourceName } from '../tools/dcss-rpg-run-summary.js';
import { createMonsterStates } from '../tools/dcss-rpg-rules.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { STORY_DEPTH } from '../tools/dcss-rpg-run.js';

/**
 * A mark has to change the fight, not the number, and it has to be readable
 * from across the room. Both halves are checked here, because a mark that only
 * moves arithmetic is the thing this whole layer exists to replace.
 */
test('every mark changes something and says so from across the room', () => {
  assert.ok(MONSTER_MARKS.length >= 8, `меток только ${MONSTER_MARKS.length}`);
  assert.equal(new Set(MONSTER_MARKS.map(({ id }) => id)).size, MONSTER_MARKS.length);
  for (const mark of MONSTER_MARKS) {
    assert.ok(mark.filter, `${mark.id}: невидимая метка`);
    assert.ok(mark.labels.ru && mark.labels.en, mark.id);
    assert.ok(mark.weight > 0, mark.id);
    // Something real, not a label: either a scaled stat or a granted rule.
    const changes = Object.keys(mark.scale ?? {}).length + Object.keys(mark.grants ?? {}).length;
    assert.ok(changes > 0, `${mark.id}: обещает и ничего не делает`);
    // And it can be explained to the player.
    assert.ok(markEffects(mark.id, 'ru').length > 0, `${mark.id}: нечего сказать игроку`);
    assert.ok(markEffects(mark.id, 'en').length > 0, mark.id);
  }
  // More than half do something other than move a number.
  const mechanical = MONSTER_MARKS.filter((mark) => Object.keys(mark.grants ?? {}).length > 0);
  assert.ok(mechanical.length >= MONSTER_MARKS.length / 2, 'слишком много меток — просто числа');
});

/**
 * Russian adjectives decline, and «Бешеный летучая мышь» is what not declining
 * looks like. The gender is read off the head word of the written name, which
 * is right for every creature the game ships.
 */
test('a mark agrees with the name it stands in front of', () => {
  assert.equal(markedMonsterName('Волк', 'rabid'), 'Бешеный волк');
  assert.equal(markedMonsterName('Летучая мышь', 'rabid'), 'Бешеная летучая мышь');
  assert.equal(markedMonsterName('Анаконда', 'hardened'), 'Закалённая анаконда');
  // `-ой` is its own ending class and the masculine keeps it.
  assert.equal(markedMonsterName('Волк', 'shadow'), 'Теневой волк');
  assert.equal(markedMonsterName('Сирена', 'shadow'), 'Теневая сирена');
  assert.equal(markedMonsterName('Волк', 'not-a-mark'), 'Волк', 'неизвестная метка не портит имя');

  // Every name the game ships gets a gender, and every mark reads on it.
  for (const monster of MONSTER_CATALOG) {
    const name = runEndSourceName(monster.id, 'ru');
    assert.ok(name, `${monster.id} без имени`);
    assert.ok(['m', 'f', 'n'].includes(monsterGender(name)), name);
    for (const mark of MONSTER_MARKS) {
      const marked = markedMonsterName(name, mark.id);
      assert.ok(marked.endsWith(name.toLowerCase()), `${marked}: имя потерялось`);
      assert.doesNotMatch(marked, /(ыйый|ойый|ойая|ийый)/, `${marked}: склонение сломано`);
    }
  }
});

test('nobody who is already special gets a mark', () => {
  for (const monster of MONSTER_CATALOG) {
    const allowed = monsterTakesMark(monster);
    if (monster.boss || monster.unique || monster.neutral || monster.spawn === 'city') {
      assert.equal(allowed, false, `${monster.id}: помечен, хотя и так особенный`);
    }
  }
  // The rule holds at generation too, not only in the predicate.
  for (let seed = 1; seed <= 30; seed += 1) {
    for (const depth of [6, 12, 18, 24]) {
      for (const state of createMonsterStates(generateDungeon({ seed, depth }))) {
        if (!state.markId) continue;
        const base = monsterById(state.id);
        assert.ok(monsterTakesMark(base), `seed ${seed} этаж ${depth}: помечен ${state.id}`);
      }
    }
  }
});

/**
 * The mark is derived from the seed and never stored — the same trick the
 * material on a sword uses — so a reloaded floor hands back the same fight and
 * the save gains no field.
 */
test('a mark is the same fight after a reload, and never written down', () => {
  const input = { seed: 41, depth: 12, definition: monsterById('goblin') };
  for (const instanceId of ['monster-12-0', 'monster-12-4', 'monster-12-9']) {
    const first = markForSpawn({ ...input, instanceId });
    assert.deepEqual(markForSpawn({ ...input, instanceId }), first);
  }
  // Nothing about a marked creature reaches the floor state.
  const dungeon = generateDungeon({ seed: 41, depth: 12 });
  assert.ok(dungeon.monsters.every((spawn) => !Object.hasOwn(spawn, 'markId')));
});

test('marks arrive with depth and then stop arriving faster', () => {
  for (let depth = 1; depth < MARK_MIN_DEPTH; depth += 1) {
    assert.equal(markChanceAtDepth(depth), 0, `этаж ${depth} учит, а не удивляет`);
  }
  let previous = 0;
  for (let depth = MARK_MIN_DEPTH; depth <= STORY_DEPTH; depth += 1) {
    const chance = markChanceAtDepth(depth);
    assert.ok(chance >= previous, `этаж ${depth} потерял метки`);
    previous = chance;
  }
  assert.equal(markChanceAtDepth(STORY_DEPTH), MARK_MAX_CHANCE);
  // Past the road it holds: a floor where everything is marked is a floor
  // where nothing is.
  assert.equal(markChanceAtDepth(STORY_DEPTH * 5), MARK_MAX_CHANCE);

  // Measured, not assumed: the deep half of the road is visibly different.
  let marked = 0;
  let total = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    for (const state of createMonsterStates(generateDungeon({ seed, depth: STORY_DEPTH }))) {
      if (!monsterTakesMark(monsterById(state.id))) continue;
      total += 1;
      if (state.markId) marked += 1;
    }
  }
  const share = marked / total;
  assert.ok(share > 0.2 && share < 0.45, `на последнем этаже дороги помечено ${(share * 100).toFixed(0)}%`);
});

test('a marked creature is a creature, with its mark folded in', () => {
  const goblin = monsterById('goblin');
  const elder = applyMark(goblin, MONSTER_MARKS.find(({ id }) => id === 'elder'));
  assert.equal(elder.id, goblin.id, 'это тот же гоблин');
  assert.ok(elder.hp > goblin.hp);
  assert.ok(elder.xp > goblin.xp);
  assert.equal(elder.large, true, 'матёрый читается по силуэту');
  assert.equal(elder.markId, 'elder');
  assert.ok(elder.markFilter);
  // The granted fields are ones the runtime already read before marks existed.
  const plagued = applyMark(goblin, MONSTER_MARKS.find(({ id }) => id === 'plagued'));
  assert.equal(plagued.inflicts.id, 'poison');
  assert.equal(plagued.burst.id, 'poison');
  assert.equal(applyMark(goblin, null), goblin);
});

test('the runtime tints a marked creature and lets the mirrored one answer back', () => {
  const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /filter: monster\.markFilter \?\? null,/);
  assert.match(runtime, /\(monster\.dim \?\? 1\)/);
  assert.match(runtime, /if \(monster\.reflect && dealt > 0 && !projectile/);
  const world = readFileSync(new URL('../tools/dcss-rpg-world3d.js', import.meta.url), 'utf8');
  // Two goblins, one marked, must be two pictures — the cache is keyed by both.
  assert.match(world, /actorTextureFor\(monster\.path, imageForPath, filter\)/);
  assert.match(world, /entry\.filter !== filter/);
});

/**
 * The tint has to survive a grey sprite.
 *
 * The first draft of this table used `hue-rotate` on its own, which does
 * nothing at all to a grey pixel — and half the creature art in this library is
 * grey or brown. Measured in a browser, the plagued mark moved the average
 * colour of a spider by two units out of 255. A mark you cannot see is a label.
 *
 * A canvas filter cannot run here, so what is pinned is the shape that made it
 * work: every mark either forces a colour first (`sepia`) or moves brightness
 * far enough to read as light or dark on its own.
 */
test('every tint works on a grey creature, not only a colourful one', () => {
  for (const mark of MONSTER_MARKS) {
    const forcesColour = mark.filter.includes('sepia(');
    const brightness = /brightness\(([0-9.]+)\)/.exec(mark.filter);
    const movesLight = brightness ? Math.abs(Number(brightness[1]) - 1) >= 0.3 : false;
    assert.ok(
      forcesColour || movesLight,
      `${mark.id}: «${mark.filter}» ничего не сделает с серым спрайтом`,
    );
    // A hue rotation with nothing to rotate is the exact bug this catches.
    if (mark.filter.includes('hue-rotate(')) {
      assert.ok(forcesColour, `${mark.id}: hue-rotate без sepia`);
    }
  }
});
