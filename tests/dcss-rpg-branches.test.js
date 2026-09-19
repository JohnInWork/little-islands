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
import {
  BRANCH_CHAPTER_GUARDIANS,
  GUARDIAN_LADDERS,
  CHAPTER_END_DEPTHS,
  STORY_DEPTH,
  chapterGuardianForDepth,
} from '../tools/dcss-rpg-run.js';
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
      for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
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
    assert.deepEqual(guardians.map(({ depth }) => depth), [...CHAPTER_END_DEPTHS]);
    assert.equal(guardians.filter(({ final }) => final).length, 1);
    for (const guardian of guardians) {
      const monster = byId.get(guardian.monsterId);
      assert.ok(monster, guardian.monsterId);
      assert.ok(monsterSuitsBranch(monster, branch), `${monster.id} guards the wrong road`);
      assert.equal(monster.unique, true, `${monster.id} would also join the ordinary pool`);
    }
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const depth of CHAPTER_END_DEPTHS) {
        const dungeon = generateDungeon({ seed, depth, branch });
        assert.ok(dungeon.objective, `seed ${seed} depth ${depth} on ${branch}: no guardian`);
        assert.equal(dungeon.objective.bossId, chapterGuardianForDepth(depth, branch).monsterId);
      }
      // And the artefact is still owed once, wherever the run went.
      const floors = [];
      for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
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

test('a fork asks, and stepping on it never answers for the hero', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  // Two tiles in the game are forks rather than stairs: the city gate, which
  // asks which road, and the last stair of the written road, which asks whether
  // the artefact ends the run. Both return before the descent.
  assert.match(runtime, /if \(artifactAvailable\(\)\) return;/);
  assert.match(runtime, /if \(isCityDepth\(dungeon\.depth\)\) return;\s*\n\s*descendFloor\(\);/);
  assert.match(runtime, /function nearbyCityGate\(\)[\s\S]*isCityDepth\(dungeon\.depth\)/);
  assert.match(runtime, /'city-gate'\(\{ action \}\)[\s\S]*switchRunBranch\(captureRun\(\), branch\)/);
  assert.match(runtime, /'road-end'\(\{ action \}\)[\s\S]*completeVictory\(\)[\s\S]*descendFloor\(\)/);
});

test('a place belongs to one road and the shuffle never crosses over', () => {
  for (const branch of RUN_BRANCHES) {
    const places = DUNGEON_THEME_CATALOG.filter((theme) => theme.branch === branch);
    assert.ok(places.length >= 6, `${branch} ships only ${places.length} places`);
    for (let seed = 0; seed < 200; seed += 1) {
      for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
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

/**
 * «Поднялся наверх, попал в город — нет пути назад в подземелье.»
 *
 * The gate greyed out the road the run was already on. It was meant to say
 * «you are here»; what it said was «you cannot go back», and a hero who climbed
 * out of the caves found the way down shut. Both roads are always open — the
 * gate is a fork, not a one-way turnstile — and the way you came in is the way
 * you can leave.
 */
test('the gate never shuts the road the hero arrived by', async () => {
  const { contextActionModel } = await import('../tools/dcss-rpg-context-actions.js');
  for (const branch of ['deep', 'surface']) {
    const model = contextActionModel({ target: { kind: 'city-gate', branch, canRetire: true } });
    const byId = new Map(model.actions.map((action) => [action.id, action]));
    assert.ok(byId.has('goDeep') && byId.has('goSurface'), `${branch}: the gate lost a road`);
    assert.notEqual(byId.get('goDeep').enabled, false, `${branch}: the way down is shut`);
    assert.notEqual(byId.get('goSurface').enabled, false, `${branch}: the way out is shut`);
  }
});

/** Every trader keeps a shop; none of them stands in the open. */
test('the city puts its merchants indoors', async () => {
  const { generateDungeon } = await import('../tools/dcss-rpg-core.js');
  for (let seed = 1; seed <= 40; seed += 1) {
    const city = generateDungeon({ seed, depth: 0 });
    const indoors = new Set();
    for (const block of city.city.blocks) {
      if (block.kind !== 'shop' || !block.interior) continue;
      for (let y = block.interior.y; y < block.interior.y + block.interior.h; y += 1) {
        for (let x = block.interior.x; x < block.interior.x + block.interior.w; x += 1) {
          indoors.add(`${x},${y}`);
        }
      }
    }
    assert.ok(city.merchants.length >= 1, `seed ${seed} has a city with no trade`);
    for (const merchant of city.merchants) {
      assert.ok(
        indoors.has(`${merchant.x},${merchant.y}`),
        `seed ${seed}: a merchant at ${merchant.x},${merchant.y} is standing in the street`,
      );
    }
  }
});

/**
 * «Уйти с добычей или спуститься ещё» is only a decision if the stake is on
 * the screen. It was a number the player had to carry in their head.
 */
test('the gate says what walking away is worth', async () => {
  const { contextActionModel } = await import('../tools/dcss-rpg-context-actions.js');
  for (const purse of [0, 7, 254]) {
    const model = contextActionModel({
      target: { kind: 'city-gate', branch: 'deep', canRetire: true, purse },
    });
    const retire = model.actions.find((action) => action.id === 'retire');
    assert.ok(retire.hint.includes(String(purse)), `the stake ${purse} is not shown`);
  }
  // Nothing to bank and nowhere to do it: no promise is made.
  const shut = contextActionModel({ target: { kind: 'city-gate', branch: 'deep', canRetire: false } });
  assert.equal(shut.actions.find((action) => action.id === 'retire').hint, '');
});

/**
 * Two roads were natural — caves the water carved and country under open sky —
 * and a third natural one would have been more of the same. The vaults are what
 * somebody built and left: bars, cages and corridors that were designed rather
 * than worn, so the generator draws a different silhouette on them.
 */
test('the vaults are a road of their own, made rather than worn', () => {
  assert.ok(RUN_BRANCHES.includes('vaults'));
  const places = DUNGEON_THEME_CATALOG.filter(({ branch }) => branch === 'vaults');
  assert.ok(places.length >= 6, `подвалы везут только ${places.length} мест`);
  // Its places belong to it and to nothing else.
  for (const place of places) {
    assert.equal(
      DUNGEON_THEME_CATALOG.filter(({ id }) => id === place.id).length,
      1,
      `${place.id} записан дважды`,
    );
  }
  // A whole run of them is generated without a single place from another road.
  for (let seed = 1; seed <= 40; seed += 1) {
    for (let depth = 1; depth <= STORY_DEPTH; depth += 1) {
      const dungeon = generateDungeon({ seed, depth, branch: 'vaults' });
      const theme = DUNGEON_THEME_CATALOG.find(({ id }) => id === dungeon.themeId);
      assert.equal(theme.branch, 'vaults', `${dungeon.themeId} принадлежит другой дороге`);
      for (const spawn of dungeon.monsters) {
        assert.ok(
          monsterSuitsBranch(byId.get(spawn.id), 'vaults'),
          `${spawn.id} нечего делать в подвалах (seed ${seed}, этаж ${depth})`,
        );
      }
    }
  }
  // And every road has its own four guardians, sharing none.
  const ladders = Object.values(GUARDIAN_LADDERS).flat();
  assert.equal(new Set(ladders).size, ladders.length, 'две дороги делят хранителя');
  for (const monsterId of GUARDIAN_LADDERS.vaults) {
    const monster = byId.get(monsterId);
    assert.ok(monster, monsterId);
    assert.ok(monsterSuitsBranch(monster, 'vaults'), `${monsterId} сторожит не ту дорогу`);
    assert.equal(monster.unique, true, `${monsterId} попадёт и в общий пул`);
  }
});

test('the gate offers the third road, and taking it switches the run onto it', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /action\.id === 'goVaults' \? 'vaults' : 'deep'/);
  const { contextActionModel } = await import('../tools/dcss-rpg-context-actions.js');
  const model = contextActionModel({
    target: { kind: 'city-gate', branch: 'deep', canRetire: false, purse: 0 },
    language: 'ru',
  });
  const ids = model.actions.map(({ id }) => id);
  assert.deepEqual(ids, ['goDeep', 'goSurface', 'goVaults', 'retire']);
  for (const action of model.actions) {
    assert.ok(action.label && action.label.length > 0, action.id);
  }
});
