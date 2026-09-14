import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createRun,
  findGridPath,
  generateDungeon,
  hydrateDungeon,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import {
  FIND_ASSET_PATHS,
  FIND_CATALOG,
  findPresentation,
  resolveFindInteraction,
} from '../tools/dcss-rpg-finds.js';

const assetUrl = (path) =>
  new URL(`../public/assets/dcss-preview/${path}`, import.meta.url);

function cacheByVariant(variant, depth = 2) {
  for (let seed = 1; seed <= 2000; seed += 1) {
    const dungeon = generateDungeon({ seed, depth });
    const find = dungeon.finds.find(({ id }) => id === 'sealed-cache');
    if (find?.cacheVariant === variant) return find;
  }
  throw new Error(`No ${variant} chest fixture`);
}

test('each floor deterministically places one of every first-wave find without overlaps', () => {
  for (let seed = 1; seed <= 800; seed += 1) {
    const depth = 1 + (seed % 3);
    const first = generateDungeon({ seed, depth });
    const second = generateDungeon({ seed, depth });
    assert.deepEqual(first.finds, second.finds);
    assert.equal(first.finds.length, 3);
    assert.deepEqual(
      [...first.finds.map(({ id }) => id)].sort(),
      [...FIND_CATALOG.map(({ id }) => id)].sort(),
    );
    assert.equal(new Set(first.finds.map(({ roomIndex }) => roomIndex)).size, first.finds.length);

    const reserved = new Set(
      [
        first.spawn,
        first.exit,
        first.sanctuary,
        first.objective?.boss,
        first.objective?.artifact,
        ...first.doors,
        ...first.events,
        ...first.monsters,
        ...first.passiveCreatures,
        ...first.loot,
      ]
        .filter(Boolean)
        .map(({ x, y }) => `${x},${y}`),
    );
    for (const find of first.finds) {
      assert.equal(first.grid[find.y]?.[find.x], '.');
      assert.equal(reserved.has(`${find.x},${find.y}`), false);
      assert.match(find.instanceId, new RegExp(`^find-${depth}-\\d+$`));
      assert.ok(find.rewardShards > 0);
      assert.ok(find.riskDamage >= 0);
      if (find.id === 'sealed-cache') {
        assert.match(find.cacheVariant, /^(?:unlocked|locked|trapped|cursed|mimic)$/);
        assert.ok(Number.isInteger(find.hazardDamage));
      }
    }

    const blocked = first.grid.map((row) => [...row]);
    for (const find of first.finds) blocked[find.y][find.x] = '#';
    assert.ok(findGridPath(blocked, first.spawn, first.exit, { allowDoors: true }).length > 0);
  }
});

test('find definitions expose bundled visuals and concise RU/EN actions', async () => {
  assert.equal(new Set(FIND_CATALOG.map(({ id }) => id)).size, FIND_CATALOG.length);
  assert.equal(FIND_ASSET_PATHS.length, FIND_CATALOG.length);
  await Promise.all(FIND_ASSET_PATHS.map((path) => access(assetUrl(path))));
  const dungeon = generateDungeon({ seed: 77, depth: 1 });
  for (const find of dungeon.finds) {
    const ru = findPresentation(find, 'ru');
    const en = findPresentation(find, 'en');
    assert.ok(ru.name && ru.action && ru.result);
    assert.ok(en.name && en.action && en.result);
    assert.equal(ru.path, en.path);
    if (find.id === 'forgotten-grave') assert.ok(ru.unsafe && en.unsafe);
  }
});

test('find resolution is atomic, range-bound and cannot duplicate a reward', () => {
  const find = cacheByVariant('unlocked');
  const input = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: { x: find.x + 1, y: find.y, hp: 53, power: 4 },
    shards: 7,
  };
  const before = structuredClone(input);
  const result = resolveFindInteraction(input);
  assert.equal(result.ok, true);
  assert.equal(result.state.shards, 7 + find.rewardShards);
  assert.equal(result.state.hero.hp, 53);
  assert.deepEqual(result.state.resolvedFindIds, [find.instanceId]);
  assert.deepEqual(input, before, 'pure command must not mutate the caller state');

  assert.equal(
    resolveFindInteraction({ ...input, resolvedFindIds: [find.instanceId] }).reason,
    'resolved',
  );
  assert.equal(
    resolveFindInteraction({ ...input, hero: { ...input.hero, x: find.x + 3 } }).reason,
    'distance',
  );
  assert.equal(resolveFindInteraction({ ...input, runStatus: 'dead' }).reason, 'inactive');
});

test('a locked chest can use a key intact or be smashed for exactly half its loot', () => {
  const find = cacheByVariant('locked');
  const input = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: { x: find.x + 1, y: find.y, hp: 60, power: 3 },
    shards: 4,
  };
  const opened = resolveFindInteraction({
    ...input,
    action: 'use-key',
    actor: { resources: { keyCount: 1 }, capabilities: {} },
  });
  const smashed = resolveFindInteraction({ ...input, action: 'smash' });
  assert.equal(opened.ok, true);
  assert.equal(opened.rewardShards, find.rewardShards);
  assert.equal(opened.destroyedShards, 0);
  assert.deepEqual(opened.consumed, [{ id: 'iron-key', amount: 1 }]);
  assert.equal(smashed.ok, true);
  assert.equal(smashed.rewardShards, Math.ceil(find.rewardShards / 2));
  assert.equal(smashed.destroyedShards, Math.floor(find.rewardShards / 2));
  assert.equal(smashed.state.shards, 4 + Math.ceil(find.rewardShards / 2));
  assert.equal(resolveFindInteraction({ ...input, action: 'defile' }).reason, 'action');
  assert.deepEqual(input.resolvedFindIds, []);
});

test('the cursed grave advertises risk and refuses a lethal interaction', () => {
  const dungeon = generateDungeon({ seed: 92, depth: 3 });
  const find = dungeon.finds.find(({ id }) => id === 'forgotten-grave');
  const base = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    shards: 0,
  };
  const unsafe = resolveFindInteraction({
    ...base,
    hero: { x: find.x - 1, y: find.y, hp: find.riskDamage, power: 1 },
  });
  assert.equal(unsafe.reason, 'unsafe');

  const safe = resolveFindInteraction({
    ...base,
    hero: { x: find.x - 1, y: find.y, hp: find.riskDamage + 7, power: 1 },
  });
  assert.equal(safe.ok, true);
  assert.equal(safe.damage, find.riskDamage);
  assert.equal(safe.state.hero.hp, 7);
  assert.equal(safe.state.shards, find.rewardShards);
});

test('resolved finds survive v12 reload and foreign IDs are rejected during hydration', () => {
  const dungeon = generateDungeon({ seed: 314, depth: 1 });
  const run = createRun(314, dungeon);
  run.floor.resolvedFindIds.push(dungeon.finds[0].instanceId);
  assert.equal(validateRun(run), true);
  const hydrated = hydrateDungeon(run);
  assert.equal(
    hydrated.finds.find(({ instanceId }) => instanceId === dungeon.finds[0].instanceId).resolved,
    true,
  );
  const foreign = structuredClone(run);
  foreign.floor.resolvedFindIds = ['find-1-99'];
  assert.equal(validateRun(foreign), true, 'cheap autosave validation accepts the stable ID shape');
  assert.throws(() => hydrateDungeon(foreign), /Unknown resolved find/);
});

test('v11 runs gain empty find history without losing their active floor', () => {
  const current = createRun(2718);
  current.version = 11;
  current.generatorVersion = 3;
  current.contentVersion = 3;
  delete current.floor.resolvedFindIds;
  current.started = true;
  current.floor.revealed.push(`${current.hero.x},${current.hero.y}`);
  const migrated = migrateLegacyRun(current);
  assert.deepEqual(migrated.floor.resolvedFindIds, []);
  assert.equal(migrated.started, true);
  assert.deepEqual(migrated.floor.revealed, current.floor.revealed);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
});

test('runtime keeps finds diegetic, tappable and free of persistent HUD highlights', async () => {
  const [runtime, html, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  assert.match(runtime, /function nearbyFind\(\)/);
  assert.match(runtime, /resolveFindInteraction\(/);
  assert.match(runtime, /run\.floor\.resolvedFindIds/);
  assert.match(runtime, /blockingFindCells\(\)/);
  assert.match(runtime, /\.\.\.findDefinitions/);
  assert.match(runtime, /if \(find && !find\.resolved && revealed\.has/);
  assert.match(runtime, /if \(adjacent\) \{\s+openContextActions\(\{ kind: 'find', value: find \}\);/);
  assert.doesNotMatch(runtime, /drawFindSignals/);
  assert.doesNotMatch(html, /id="find-action"/);
  assert.match(html, /id="context-actions"/);
  assert.match(html, /id="find-announcement"/);
  assert.doesNotMatch(css, /\.find-action/);
});
