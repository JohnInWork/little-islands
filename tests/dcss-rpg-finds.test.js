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
  CORE_FIND_CATALOG,
  CRYSTAL_FLOOR_CHANCE_PERCENT,
  FIND_ASSET_PATHS,
  FIND_CATALOG,
  LANDMARK_CATALOG,
  MAX_FINDS_PER_FLOOR,
  crystalAwakeOnFloor,
  findPresentation,
  resolveFindInteraction,
} from '../tools/dcss-rpg-finds.js';
import { CHEST_ASSET_PATHS } from '../tools/dcss-rpg-chests.js';
import { createAttributeState } from '../tools/dcss-rpg-attributes.js';
import { respecHero } from '../tools/dcss-rpg-respec.js';

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
    // Кристальная жила спит на большинстве этажей — тогда основных находок две.
    const coreCatalog = CORE_FIND_CATALOG
      .map(({ id }) => id)
      .filter((id) => id !== 'crystal-vein' || crystalAwakeOnFloor(first.seed, depth));
    const coreIds = first.finds.slice(0, coreCatalog.length).map(({ id }) => id);
    assert.deepEqual([...coreIds].sort(), [...coreCatalog].sort());
    // Past the core wave come the landmark and the hidden stash, in that order.
    const extraIds = first.finds.slice(coreCatalog.length).map(({ id }) => id);
    const landmarkIds = extraIds.filter((id) => LANDMARK_CATALOG.some((entry) => entry.id === id));
    assert.ok(first.finds.length <= MAX_FINDS_PER_FLOOR);
    assert.ok(extraIds.every((id) => LANDMARK_CATALOG.some((entry) => entry.id === id) || id === 'buried-stash'));
    // Only a chapter-end floor without a spare alcove lets the merchant reclaim
    // the landmark room; every other floor keeps its landmark.
    if (landmarkIds.length === 0) assert.equal(first.merchants.length, 1);
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
      const matchingDormantMimic = first.monsters.find(
        (monster) =>
          monster.x === find.x
          && monster.y === find.y
          && monster.id === 'chest-mimic'
          && monster.activationFindId === find.instanceId,
      );
      assert.equal(
        reserved.has(`${find.x},${find.y}`),
        Boolean(matchingDormantMimic),
      );
      assert.match(find.instanceId, new RegExp(`^find-${depth}-\\d+$`));
      if (LANDMARK_CATALOG.some((entry) => entry.id === find.id)) {
        assert.equal(find.rewardGold, 0);
        assert.ok(find.outcomes && typeof find.outcomes === 'object');
      } else if (find.id === 'crystal-vein') {
        // Кристалл платит очком характеристики, а не золотом.
        assert.equal(find.rewardGold, 0);
      } else {
        assert.ok(find.rewardGold > 0);
      }
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
  assert.equal(
    FIND_ASSET_PATHS.length,
    new Set([
      ...FIND_CATALOG.flatMap(({ path, skins }) => [path, ...Object.values(skins ?? {})]),
      ...CHEST_ASSET_PATHS,
    ]).size,
  );
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
  const find = cacheByVariant('locked');
  const input = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: { x: find.x + 1, y: find.y, hp: 53, power: 4 },
    gold: 7,
    // Замок есть у всякого ящика, так что и открыть его нечем, кроме ключа.
    action: 'use-key',
    actor: { resources: { keyCount: 1 }, capabilities: {} },
  };
  const before = structuredClone(input);
  const result = resolveFindInteraction(input);
  assert.equal(result.ok, true);
  assert.equal(result.state.gold, 7 + find.rewardGold);
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

/**
 * Замок открывают ключом или отмычкой — и всё, что было в ящике, достаётся
 * целым. Кувалды нет: она была бесплатным третьим путём и обесценивала оба
 * первых. Иван: «сундуки можно только взламывать».
 */
test('запертый ящик отдаёт добычу целиком тому, кто открыл замок', () => {
  const find = cacheByVariant('locked');
  const input = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: { x: find.x + 1, y: find.y, hp: 60, power: 3 },
    gold: 4,
  };
  const opened = resolveFindInteraction({
    ...input,
    action: 'use-key',
    actor: { resources: { keyCount: 1 }, capabilities: {} },
  });
  assert.equal(opened.ok, true);
  assert.equal(opened.rewardGold, find.rewardGold);
  assert.equal(opened.destroyedGold, 0);
  assert.deepEqual(opened.consumed, [{ id: 'iron-key', amount: 1 }]);
  assert.equal(opened.state.gold, 4 + find.rewardGold);
  for (const action of ['smash', 'defile', 'open']) {
    assert.equal(resolveFindInteraction({ ...input, action }).reason, 'action', action);
  }
  assert.deepEqual(input.resolvedFindIds, []);
});

test('the cursed grave advertises risk and refuses a lethal interaction', () => {
  const dungeon = generateDungeon({ seed: 92, depth: 3 });
  const find = dungeon.finds.find(({ id }) => id === 'forgotten-grave');
  const base = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    gold: 0,
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
  assert.equal(safe.state.gold, find.rewardGold);
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

test('v11 runs gain empty find history on the safely rebased expanded floor', () => {
  const current = createRun(2718);
  current.version = 11;
  current.generatorVersion = 3;
  current.contentVersion = 3;
  delete current.floor.resolvedFindIds;
  current.started = true;
  current.floor.revealed.push(`${current.hero.x},${current.hero.y}`);
  const migrated = migrateLegacyRun(current);
  assert.deepEqual(migrated.floor.resolvedFindIds, []);
  assert.equal(migrated.started, false);
  assert.deepEqual(migrated.floor.revealed, []);
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
  assert.match(runtime, /if \(find && findIsInteractable\(find\) && revealed\.has/);
  assert.match(runtime, /if \(adjacent\) \{\s+openContextActions\(\{ kind: 'find', value: find \}\);/);
  assert.doesNotMatch(runtime, /drawFindSignals/);
  assert.doesNotMatch(html, /id="find-action"/);
  assert.match(html, /id="context-actions"/);
  assert.match(html, /id="find-announcement"/);
  assert.doesNotMatch(css, /\.find-action/);
});

/**
 * Одна картинка — одна вещь.
 *
 * Саркофаг означал два разных правила: находка «Древняя гробница» — золото
 * ценой раны, событие — просто добыча под ногами. Фонтан того хуже: целебный
 * и фонтан-выбор были одной синей чашей, а водой в игре ничего не отличишь.
 * Иван: «пускай они не повторяются, чтобы у всех были разные ассеты»,
 * «фонтаны у нас ещё одинаковые». Спрайт — единственное, по чему игрок
 * заранее понимает, с чем имеет дело.
 */
test('у каждой находки и каждого события своя картинка', async () => {
  const { FIND_CATALOG } = await import('../tools/dcss-rpg-finds.js');
  const content = await import('../tools/dcss-rpg-content.js');
  const events = Object.values(content).find((value) => Array.isArray(value) && value[0]?.effect);
  assert.ok(events?.length >= 4, 'каталог событий не найден');

  const пути = new Map();
  for (const entry of [...FIND_CATALOG, ...events]) {
    const прежний = пути.get(entry.path);
    assert.equal(прежний, undefined, `«${entry.id}» и «${прежний}» нарисованы одним и тем же: ${entry.path}`);
    пути.set(entry.path, entry.id);
  }

  // Светлая вода закреплена за исцелением и больше нигде не встречается.
  const целебный = events.find(({ effect }) => effect === 'heal');
  assert.match(целебный.path, /sparkling_fountain/, 'исцеление перестало быть светлым');
  const фонтан = FIND_CATALOG.find(({ id }) => id === 'sunken-fountain');
  const шкуры = Object.values(фонтан.skins ?? {});
  for (const шкура of [фонтан.path, ...шкуры]) {
    assert.ok(!/sparkling/.test(шкура), `фонтан-выбор надел светлую воду исцеления: ${шкура}`);
  }
});

/**
 * Кристалл — очень редкий подарок одного очка характеристики.
 *
 * Иван 26.09.2026: «+1 очко характеристики… оно должно быть каким-то
 * очень-очень редким». Раньше жила стояла почти на каждом этаже и молча
 * прибавляла скрытую силу.
 */
test('кристальная жила редка, а на этаже решает стабильный хэш, а не общий генератор', () => {
  let floors = 0;
  let crystals = 0;
  for (let seed = 1; seed <= 600; seed += 1) {
    const depth = 1 + (seed % 12);
    const dungeon = generateDungeon({ seed, depth });
    floors += 1;
    const crystal = dungeon.finds.filter(({ id }) => id === 'crystal-vein');
    assert.ok(crystal.length <= 1);
    assert.equal(crystal.length === 1, crystalAwakeOnFloor(dungeon.seed, depth), `seed ${seed}`);
    crystals += crystal.length;
  }
  const percent = (crystals / floors) * 100;
  assert.ok(percent > 1 && percent < CRYSTAL_FLOOR_CHANCE_PERCENT * 2, `кристаллов ${percent.toFixed(1)}%`);
  assert.equal(crystalAwakeOnFloor(12345, 0), false, 'в городе жилы нет');
});

test('кристалл поднимает выбранную характеристику на единицу и переживает сброс у жреца', () => {
  let found = null;
  for (let seed = 1; seed <= 4000 && !found; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 2 });
    found = dungeon.finds.find(({ id }) => id === 'crystal-vein') ?? null;
  }
  assert.ok(found, 'на каком-то этаже жила проснулась');
  assert.equal(found.rewardGold, 0, 'золота кристалл больше не даёт');
  const attributes = createAttributeState({ strength: 4, agility: 3, intelligence: 3, spent: 1 });
  const input = {
    find: found,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: { x: found.x + 1, y: found.y, hp: 40, power: 1, attributes },
    gold: 5,
  };
  assert.equal(resolveFindInteraction({ ...input, action: 'extract' }).reason, 'action', 'без выбора не трогается');
  const result = resolveFindInteraction({ ...input, action: 'crystal-agility' });
  assert.equal(result.ok, true);
  assert.equal(result.rewardAttribute, 'agility');
  assert.equal(result.state.hero.attributes.agility, 4);
  assert.equal(result.state.hero.attributes.spent, 1, 'подарок не тратит очко уровня');
  assert.deepEqual(result.state.hero.attributeGifts, { strength: 0, agility: 1, intelligence: 0 });
  assert.equal(result.state.hero.power, 1, 'скрытая сила не растёт');
  assert.equal(result.state.gold, 5);
  // Сброс возвращает вложенные очки, но подарок кристалла остаётся.
  const respec = respecHero({ level: 2, gifts: result.state.hero.attributeGifts });
  assert.equal(respec.attributes.agility, 4);
  assert.equal(respec.attributes.strength, 3);
  assert.equal(respec.attributes.spent, 0);
});
