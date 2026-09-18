import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  DEFAULT_RUN_BRANCH,
  MONSTER_CATALOG,
  MONSTER_HABITATS,
  RUN_BRANCHES,
  monsterSuitsBranch,
  validateRunBranch,
} from '../tools/dcss-rpg-content.js';
import { DUNGEON_THEME_CATALOG, dungeonThemeFor } from '../tools/dcss-rpg-room-plans.js';
import { BRANCH_CHAPTER_GUARDIANS, FINAL_DEPTH, chapterGuardianForDepth } from '../tools/dcss-rpg-run.js';
import { CITY_DEPTH } from '../tools/dcss-rpg-city.js';
import {
  SAVE_VERSION,
  createRun,
  generateDungeon,
  switchRunBranch,
  validateRun,
} from '../tools/dcss-rpg-core.js';

const byId = new Map(MONSTER_CATALOG.map((monster) => [monster.id, monster]));

test('every creature says where it lives, and the branch is the only thing that rules on it', () => {
  for (const monster of MONSTER_CATALOG) {
    assert.ok(MONSTER_HABITATS.includes(monster.habitat), `${monster.id} lives nowhere`);
  }
  assert.equal(monsterSuitsBranch({ habitat: 'any' }, 'surface'), true);
  assert.equal(monsterSuitsBranch({ habitat: 'deep' }, 'surface'), false);
  assert.equal(monsterSuitsBranch({ habitat: 'surface' }, 'deep'), false);
  assert.equal(monsterSuitsBranch(null, 'deep'), false);
  assert.equal(monsterSuitsBranch({}, 'deep'), false, 'an untagged creature lives nowhere');
  // Both roads have enough to populate a floor at every tier they reach.
  for (const branch of RUN_BRANCHES) {
    const pool = MONSTER_CATALOG.filter((monster) => (
      !monster.spawn && !monster.unique && !monster.chapter && monsterSuitsBranch(monster, branch)
    ));
    assert.ok(pool.length >= 12, `${branch} has only ${pool.length} ordinary creatures`);
    assert.ok(pool.some((monster) => monster.tier === 1), `${branch} has no tier one`);
    assert.ok(pool.some((monster) => monster.tier >= 5), `${branch} has nothing deep`);
  }
});

/**
 * The suite was fully green with a creature pointing at a sprite that does not
 * exist, and the game refused to boot. Nothing checked it, so now something does.
 */
test('every creature has a sprite that is actually in the pack', async () => {
  for (const monster of MONSTER_CATALOG) {
    await access(new URL(`../public/assets/dcss-preview/${monster.path}`, import.meta.url));
    if (monster.waterPath) {
      await access(new URL(`../public/assets/dcss-preview/${monster.waterPath}`, import.meta.url));
    }
  }
});

test('a sheep is never in a crypt, and a lich never in a meadow', () => {
  for (const branch of RUN_BRANCHES) {
    for (let seed = 1; seed <= 60; seed += 1) {
      for (let depth = 1; depth <= FINAL_DEPTH; depth += 1) {
        const dungeon = generateDungeon({ seed, depth, branch });
        assert.equal(dungeon.branch, branch, 'the floor carries the road it is on');
        const theme = DUNGEON_THEME_CATALOG.find(({ id }) => id === dungeon.themeId);
        assert.equal(theme.branch, branch, `${dungeon.themeId} belongs to the other road`);
        for (const spawn of dungeon.monsters) {
          assert.ok(
            monsterSuitsBranch(byId.get(spawn.id), branch),
            `${spawn.id} has no business on the ${branch} road (seed ${seed}, depth ${depth})`,
          );
        }
      }
    }
  }
});

test('both roads keep every promise the dungeon makes', () => {
  for (const branch of RUN_BRANCHES) {
    // One guardian per chapter, at the same depths, and it belongs to its road.
    const guardians = BRANCH_CHAPTER_GUARDIANS[branch];
    assert.deepEqual(guardians.map(({ depth }) => depth), [3, 6, FINAL_DEPTH]);
    assert.equal(guardians.filter(({ final }) => final).length, 1);
    for (const guardian of guardians) {
      const monster = byId.get(guardian.monsterId);
      assert.ok(monster, guardian.monsterId);
      assert.ok(monsterSuitsBranch(monster, branch), `${monster.id} guards the wrong road`);
      assert.equal(monster.unique, true, `${monster.id} would also join the ordinary pool`);
    }
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const depth of [3, 6, FINAL_DEPTH]) {
        const dungeon = generateDungeon({ seed, depth, branch });
        assert.ok(dungeon.objective, `seed ${seed} depth ${depth} on ${branch}: no guardian`);
        assert.equal(dungeon.objective.bossId, chapterGuardianForDepth(depth, branch).monsterId);
      }
      // And the artefact is still owed once, wherever the run went.
      const floors = [];
      for (let depth = 1; depth <= FINAL_DEPTH; depth += 1) {
        if (generateDungeon({ seed, depth, branch }).artifactFloor) floors.push(depth);
      }
      assert.equal(floors.length, 1, `seed ${seed} on ${branch} owes ${floors.length} artefacts`);
    }
  }
});

test('the run remembers its road, and only the city lets it change', () => {
  assert.equal(SAVE_VERSION, 48, 'the branch is new state, not a derivation');
  assert.ok(RUN_BRANCHES.includes(DEFAULT_RUN_BRANCH));
  assert.equal(validateRunBranch('sideways'), false);

  const city = generateDungeon({ seed: 7, depth: CITY_DEPTH });
  const run = { ...createRun(7, city), depth: CITY_DEPTH };
  assert.equal(run.branch, DEFAULT_RUN_BRANCH);
  assert.ok(validateRun(run));
  assert.ok(!validateRun({ ...run, branch: 'sideways' }), 'a run must know its road');

  const turned = switchRunBranch(run, 'surface');
  assert.equal(turned.branch, 'surface');
  assert.deepEqual(turned.floors, {}, 'the archived floors belong to the other road');
  assert.ok(validateRun(turned));
  assert.equal(switchRunBranch(turned, 'surface'), turned, 'turning the same way changes nothing');
  // Anywhere but the city, the road is already chosen.
  const below = createRun(7, generateDungeon({ seed: 7, depth: 2 }));
  assert.ok(validateRun(below));
  assert.throws(() => switchRunBranch(below, 'surface'), /in the city/);
  assert.throws(() => switchRunBranch(run, 'sideways'), /Unknown run branch/);
});

test('the gate asks, and stepping on it never answers for the hero', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /if \(isCityDepth\(dungeon\.depth\)\) return;\s*\n\s*if \(dungeon\.depth < FINAL_DEPTH\) descendFloor\(\);/);
  assert.match(runtime, /function nearbyCityGate\(\)[\s\S]*isCityDepth\(dungeon\.depth\)/);
  assert.match(runtime, /'city-gate'\(\{ action \}\)[\s\S]*switchRunBranch\(captureRun\(\), branch\)/);
});

test('a place belongs to one road and the shuffle never crosses over', () => {
  for (const branch of RUN_BRANCHES) {
    const places = DUNGEON_THEME_CATALOG.filter((theme) => theme.branch === branch);
    assert.ok(places.length >= 6, `${branch} ships only ${places.length} places`);
    for (let seed = 0; seed < 200; seed += 1) {
      for (let depth = 1; depth <= FINAL_DEPTH; depth += 1) {
        assert.equal(dungeonThemeFor(seed, depth, branch).branch, branch);
      }
    }
  }
  assert.equal(
    DUNGEON_THEME_CATALOG.filter((theme) => !RUN_BRANCHES.includes(theme.branch)).length,
    0,
    'a place belongs to no road',
  );
});
