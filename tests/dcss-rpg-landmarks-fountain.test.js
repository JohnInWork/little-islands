import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import { environmentThemeFor } from '../tools/dcss-rpg-room-plans.js';

import { isCityDepth } from '../tools/dcss-rpg-city.js';

import { contextActionModel } from '../tools/dcss-rpg-context-actions.js';
import {
  createRng,
  createRun,
  findGridPath,
  generateDungeon,
  hydrateDungeon,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import {
  CORE_FIND_CATALOG,
  FIND_ASSET_PATHS,
  LANDMARK_CATALOG,
  LANDMARK_OUTCOME_KEYS,
  MAX_FINDS_PER_FLOOR,
  createDungeonFinds,
  crystalAwakeOnFloor,
  findById,
  findPresentation,
  findResultPresentation,
  findSkinPath,
  isLandmarkFind,
  landmarkActionRules,
  landmarkResultSummary,
  resolveFindInteraction,
} from '../tools/dcss-rpg-finds.js';
import {
  roomArchetypeById,
  roomArchetypeIdForFind,
} from '../tools/dcss-rpg-room-plans.js';

const assetUrl = (path) =>
  new URL(`../public/assets/dcss-preview/${path}`, import.meta.url);

const inside = (room, point) => (
  point.x >= room.x
  && point.x < room.x + room.width
  && point.y >= room.y
  && point.y < room.y + room.height
);

/** One landmark per floor and three of them in the catalog: scan for the wanted one. */
function landmarkFixture(id, seed = 7, depth = 2) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const dungeon = generateDungeon({ seed: seed + attempt, depth });
    const find = dungeon.finds.find((candidate) => candidate.id === id);
    if (find) return { dungeon, find, seed: seed + attempt };
  }
  throw new Error(`No ${id} fixture near seed ${seed} depth ${depth}`);
}

function fountainFixture(seed = 7, depth = 2) {
  return landmarkFixture('sunken-fountain', seed, depth);
}

function heroNear(find, overrides = {}) {
  return {
    x: find.x + 1,
    y: find.y,
    hp: 40,
    maxHp: 100,
    power: 3,
    effects: {},
    ...overrides,
  };
}

test('фонтан — ориентир: каталог, темы этажей и вшитые ассеты', async () => {
  const fountain = findById('sunken-fountain');
  assert.equal(fountain.wave, 'landmark');
  // Общих для всех дорог ориентиров теперь два: древний алтарь убран — он
  // путал сильнее, чем давал. Остальные пять принадлежат по одной дороге и
  // проверяются в тесте событий ветки.
  assert.deepEqual(
    LANDMARK_CATALOG.filter(({ branch }) => !branch).map(({ id }) => id),
    ['sunken-fountain', 'warded-rune'],
  );
  assert.equal(findById('ancient-altar'), null, 'алтарь вернулся в каталог');
  assert.equal(CORE_FIND_CATALOG.length, 3);
  assert.equal(MAX_FINDS_PER_FLOOR, 5);
  assert.deepEqual(fountain.outcomes.map(({ id }) => id), ['drink', 'toss', 'dive']);
  assert.ok(Object.isFrozen(fountain.outcomes));
  for (const themeId of ['ashen-vault', 'buried-sanctum', 'frozen-depths', 'infernal-core']) {
    assert.ok(fountain.skins[themeId], `skin for ${themeId}`);
    assert.ok(FIND_ASSET_PATHS.includes(fountain.skins[themeId]));
  }
  await Promise.all(Object.values(fountain.skins).map((path) => access(assetUrl(path))));
  assert.equal(findSkinPath({ id: 'sunken-fountain', themeId: 'frozen-depths' }), fountain.skins['frozen-depths']);
  assert.equal(findSkinPath({ id: 'sunken-fountain', themeId: 'unknown' }), fountain.path);
  assert.equal(findSkinPath({ id: 'crystal-vein' }), findById('crystal-vein').path);
  assert.equal(roomArchetypeIdForFind('sunken-fountain'), 'fountain-court');
  assert.equal(roomArchetypeIdForFind('sealed-cache'), 'treasure-vault');
  assert.equal(roomArchetypeById('fountain-court').content.findId, 'sunken-fountain');
  assert.equal(roomArchetypeIdForFind('ancient-altar'), null, 'ниша алтаря пережила алтарь');
});

test('every floor places at most one landmark in its own quiet room without blocking the route', () => {
  let placed = 0;
  let dungeonFloors = 0;
  for (let seed = 1; seed <= 600; seed += 1) {
    const depth = 1 + (seed % 9);
    // The city has no rooms for a landmark to sit in.
    if (isCityDepth(depth)) continue;
    dungeonFloors += 1;
    const dungeon = generateDungeon({ seed, depth });
    const again = generateDungeon({ seed, depth });
    assert.deepEqual(again.finds, dungeon.finds);
    const landmarks = dungeon.finds.filter((find) => isLandmarkFind(find));
    assert.ok(landmarks.length <= 1);
    if (landmarks.length === 0) {
      assert.equal(dungeon.merchants.length, 1, 'only a merchant may reclaim the landmark room');
      continue;
    }
    placed += 1;
    const [altar] = landmarks;
    assert.equal(altar.instanceId, `find-${depth}-${altar.roomIndex}`);
    assert.equal(altar.themeId, dungeon.themeId);
    assert.equal(isLandmarkFind(altar), true);
    assert.equal(dungeon.grid[altar.y][altar.x], '.');
    assert.ok(altar.roomIndex > 0);
    const room = dungeon.rooms[altar.roomIndex];
    assert.equal(inside(room, altar), true);
    assert.equal(inside(room, dungeon.exit), false);
    assert.ok(dungeon.surprises.every(({ roomIndex }) => roomIndex !== altar.roomIndex));
    assert.ok(dungeon.finds.every((find) => find === altar || find.roomIndex !== altar.roomIndex));
    assert.ok(dungeon.merchants.every((merchant) => merchant.roomIndex !== altar.roomIndex));
    const occupied = [
      dungeon.spawn, dungeon.exit, dungeon.sanctuary, dungeon.objective?.boss,
      dungeon.objective?.artifact, ...dungeon.doors, ...dungeon.events, ...dungeon.monsters,
      ...dungeon.passiveCreatures, ...dungeon.loot, ...dungeon.merchants,
      ...dungeon.finds.filter((find) => find !== altar),
    ].filter(Boolean).map(({ x, y }) => `${x},${y}`);
    assert.equal(occupied.includes(`${altar.x},${altar.y}`), false);
    const plan = dungeon.roomPlans[altar.roomIndex];
    const archetypeId = roomArchetypeIdForFind(altar.id);
    assert.equal(plan.archetypeId, archetypeId);
    assert.equal(
      plan.environmentThemeId,
      environmentThemeFor(roomArchetypeById(archetypeId), dungeon.themeId),
    );
    const blocked = dungeon.grid.map((row) => [...row]);
    for (const find of dungeon.finds) blocked[find.y][find.x] = '#';
    assert.ok(findGridPath(blocked, dungeon.spawn, dungeon.exit, { allowDoors: true }).length > 0);
    if (altar.id === 'sunken-fountain') {
      const { drink, toss, dive } = altar.outcomes;
      assert.equal(drink.healRatio, 0.25);
      assert.equal(drink.status.id, 'wet');
      assert.ok(toss.costGold > 0 && toss.rewardMaxHp === 4);
      assert.ok(dive.rewardGold > 0 && dive.damage > 0);
      assert.equal(dive.status.id, 'chilled');
    }
  }
  assert.ok(placed >= dungeonFloors - 10, `landmark placed on ${placed} of ${dungeonFloors} dungeon floors`);
});

test('the landmark stream never moves the three core finds', () => {
  const rows = [];
  rows.push('#'.repeat(36));
  for (let y = 1; y <= 5; y += 1) {
    let row = '#';
    for (let room = 0; room < 5; room += 1) row += '.....##';
    rows.push(row.slice(0, 36).padEnd(36, '#'));
  }
  rows.push('#'.repeat(36));
  const rooms = Array.from({ length: 5 }, (_, index) => ({ x: 1 + index * 7, y: 1, width: 5, height: 5 }));
  // A hand-built level must say which place it is, exactly like a generated one.
  const level = { seed: 11, depth: 3, themeId: 'ashen-vault', grid: rows, rooms, exit: { x: 3, y: 3 }, surprises: [] };
  const coreOnly = createDungeonFinds({ level, rng: createRng(5) });
  const withLandmark = createDungeonFinds({ level, rng: createRng(5), landmarkRng: createRng(9) });
  // Три основные находки, но спящая кристальная жила на пол не выходит.
  const awake = crystalAwakeOnFloor(level.seed, level.depth);
  assert.equal(coreOnly.length, awake ? 3 : 2);
  assert.equal(withLandmark.length, coreOnly.length + 1);
  assert.deepEqual(withLandmark.slice(0, coreOnly.length), coreOnly);
  const landmark = withLandmark.at(-1);
  assert.equal(isLandmarkFind(landmark), true);
  assert.ok(coreOnly.every(({ roomIndex }) => roomIndex !== landmark.roomIndex));
  assert.deepEqual(
    createDungeonFinds({ level, rng: createRng(5), landmarkRng: createRng(9) }),
    withLandmark,
  );
});

test('доступность действий следует за золотом и здоровьем, и отказ объясняется', () => {
  const { find } = fountainFixture();
  const { toss, dive } = find.outcomes;
  const poor = landmarkActionRules({
    find,
    actor: { gold: toss.costGold - 1, vitals: { hp: dive.damage, maxHp: 100, effects: {} } },
    language: 'ru',
  });
  assert.deepEqual(poor.actions.map(({ id }) => id), ['drink', 'toss', 'dive']);
  assert.equal(poor.actions[0].enabled, true);
  assert.equal(poor.actions[1].enabled, false);
  // Отказ всё равно говорит, что дал бы: «зачем оно нужно» — вопрос, который
  // остаётся без ответа, когда напечатан один отказ.
  assert.match(poor.actions[1].hint, new RegExp(`Нужно ${toss.costGold} \\{gold\\}`));
  assert.equal(poor.actions[2].enabled, false);
  assert.equal(poor.actions[2].hint, `Слишком опасно при таком здоровье · +${dive.rewardGold} {gold}`);

  const healthy = landmarkActionRules({
    find,
    actor: { gold: toss.costGold, vitals: { hp: 100, maxHp: 100, effects: {} } },
    language: 'en',
  });
  assert.equal(healthy.actions[0].enabled, false);
  assert.equal(healthy.actions[0].hint, 'Nothing to heal');
  assert.equal(healthy.actions[1].enabled, true);
  // Доступное действие тратит подпись на обещание, а не на отказ.
  assert.match(healthy.actions[1].hint, new RegExp(`−${toss.costGold} \\{gold\\}`));
  assert.equal(healthy.actions[2].enabled, true);

  assert.ok(Object.isFrozen(healthy.actions));
  assert.throws(() => landmarkActionRules({ find: { id: 'sunken-fountain', outcomes: {} } }), TypeError);
});

test('глоток лечит долю настоящего запаса и не трогает кошелёк', () => {
  const { find } = fountainFixture();
  const input = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: heroNear(find, { effects: { poison: 5 } }),
    gold: 50,
    action: 'drink',
    actor: { vitals: { maxHp: 120 } },
  };
  const before = structuredClone(input);
  const result = resolveFindInteraction(input);
  assert.equal(result.ok, true);
  assert.equal(result.action, 'drink');
  assert.ok(result.heal > 0, 'глоток не вылечил ничего');
  assert.equal(result.state.hero.hp, input.hero.hp + result.heal);
  assert.equal(result.state.hero.maxHp, 100);
  assert.equal(result.state.gold, 50, 'вода взяла денег');
  assert.equal(result.costGold, 0);
  assert.equal(result.damage, 0);
  // Из фонтана выходят мокрыми: это его цена, а не подарок.
  assert.equal(result.status?.id, 'wet');
  assert.deepEqual(result.state.resolvedFindIds, [find.instanceId]);
  assert.deepEqual(input, before, 'pure command must not mutate the caller state');

  const wasted = resolveFindInteraction({ ...input, hero: heroNear(find, { hp: 120, effects: {} }) });
  assert.equal(wasted.reason, 'nothing-to-restore');
  assert.equal(
    resolveFindInteraction({ ...input, resolvedFindIds: [find.instanceId] }).reason,
    'resolved',
  );
  assert.equal(
    resolveFindInteraction({ ...input, hero: heroNear(find, { x: find.x + 2 }) }).reason,
    'distance',
  );
  assert.equal(resolveFindInteraction({ ...input, runStatus: 'dead' }).reason, 'inactive');
  assert.equal(resolveFindInteraction({ ...input, action: 'defile' }).reason, 'action');
});

test('брошенная монета стоит золота и покупает запас здоровья', () => {
  const { find } = fountainFixture(19, 5);
  const { costGold, rewardMaxHp } = find.outcomes.toss;
  const input = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: heroNear(find, { hp: 30, maxHp: 100 }),
    gold: costGold + 3,
    action: 'toss',
    actor: { gold: costGold + 3, vitals: { hp: 30, maxHp: 100, effects: {} } },
  };
  const result = resolveFindInteraction(input);
  assert.equal(result.ok, true);
  assert.equal(result.costGold, costGold);
  assert.equal(result.rewardMaxHp, rewardMaxHp);
  assert.equal(result.state.gold, 3);
  assert.equal(result.state.hero.maxHp, 100 + rewardMaxHp);
  assert.equal(result.state.hero.power, input.hero.power, 'скрытая сила не растёт');
  assert.equal(resolveFindInteraction({ ...input, gold: costGold - 1 }).reason, 'gold-required');
  assert.deepEqual(input.resolvedFindIds, []);
});

test('нырок платит золотом, но студит, и никогда не убивает', () => {
  const { find } = fountainFixture(23, 5);
  const { rewardGold, damage, status, noise } = find.outcomes.dive;
  const base = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    gold: 4,
    action: 'dive',
  };
  assert.equal(
    resolveFindInteraction({ ...base, hero: heroNear(find, { hp: damage }) }).reason,
    'unsafe',
  );
  const result = resolveFindInteraction({ ...base, hero: heroNear(find, { hp: damage + 5 }) });
  assert.equal(result.ok, true);
  assert.equal(result.damage, damage);
  assert.equal(result.state.hero.hp, 5);
  assert.equal(result.rewardGold, rewardGold);
  assert.equal(result.state.gold, 4 + rewardGold);
  assert.deepEqual(result.status, status);
  assert.equal(result.noise, noise ?? 0);
  assert.equal(result.heal, 0);
  assert.deepEqual(result.cleansed, []);
  assert.equal(result.state.hero.maxHp, 100);
});

test('the resolver executes rolled outcome data, so a new landmark is data rather than code', () => {
  const { find } = fountainFixture();
  const custom = {
    ...find,
    outcomes: {
      drink: { rewardMaxHp: 2, noise: 3 },
      toss: { costGold: 5, heal: 7 },
      dive: { damage: 1, rewardGold: 1 },
    },
  };
  assert.equal(isLandmarkFind(custom), true);
  const result = resolveFindInteraction({
    find: custom,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: heroNear(find),
    gold: 0,
    action: 'drink',
  });
  assert.equal(result.ok, true);
  assert.equal(result.rewardMaxHp, 2);
  assert.equal(result.noise, 3);
  assert.match(landmarkResultSummary(result, 'ru'), /Максимум здоровья \+2/);
  assert.match(landmarkResultSummary(result, 'en'), /Max health \+2/);
  // Скрытой силы больше нет — такой исход не проходит проверку.
  assert.equal(isLandmarkFind({ ...custom, outcomes: { ...custom.outcomes, drink: { rewardPower: 1 } } }), false);

  assert.equal(isLandmarkFind({ ...find, outcomes: { ...find.outcomes, drink: { bless: true } } }), false);
  assert.equal(isLandmarkFind({ ...find, outcomes: { pray: find.outcomes.pray } }), false);
  assert.equal(isLandmarkFind({ ...find, outcomes: { ...find.outcomes, plunder: { damage: -3 } } }), false);
  assert.equal(
    isLandmarkFind({ ...find, outcomes: { ...find.outcomes, plunder: { status: { id: 'blessed', duration: 3 } } } }),
    false,
  );
  assert.ok(LANDMARK_OUTCOME_KEYS.includes('healRatio'));
  assert.equal(
    resolveFindInteraction({
      find: { ...find, outcomes: {} },
      resolvedFindIds: [],
      runStatus: 'playing',
      hero: heroNear(find),
      gold: 0,
      action: 'pray',
    }).reason,
    'invalid',
  );
});

test('общий реестр показывает фонтан на двух языках и подписывает каждый выбор', () => {
  const { find } = fountainFixture();
  const { costGold } = find.outcomes.toss;
  const target = { kind: 'find', ...find };
  const actor = { gold: costGold, vitals: { hp: 50, maxHp: 100, effects: {} } };
  const ru = contextActionModel({ target, actor, language: 'ru' });
  assert.equal(ru.interactionId, 'landmark');
  assert.equal(ru.name, 'Затопленный фонтан');
  // «Что это, зачем, как — непонятно» было всей жалобой: карточка открывалась
  // пустой и оставалась пустой, пока игрок не догадается осмотреть.
  const copy = findById('sunken-fountain').copy.ru;
  assert.equal(ru.description, `${copy.summary} ${copy.inspected}`);
  assert.ok(ru.description.length > 40);
  assert.equal(ru.icon, findSkinPath(find));
  // Осмотра больше нет: окно и есть осмотр, текст в нём полный сразу.
  assert.deepEqual(ru.actions.map(({ id }) => id), ['drink', 'toss', 'dive']);
  assert.ok(ru.actions.every(({ command }) => command === 'find-interact'));
  assert.match(ru.actions[1].hint, new RegExp(`−${costGold} \\{gold\\}`));
  assert.equal(ru.actions[1].enabled, true);

  const english = findById('sunken-fountain').copy.en;
  const en = contextActionModel({ target, actor, language: 'en' });
  assert.equal(en.name, 'Sunken fountain');
  assert.equal(en.description, `${english.summary} ${english.inspected}`);
  // The flavour text still keeps its mouth shut; the numbers live on the buttons.
  assert.doesNotMatch(english.inspected, /reward|treasure|danger|\d+◆|−\d+/i);

  const broke = contextActionModel({
    target,
    actor: { gold: 0, vitals: { hp: 2, maxHp: 100, effects: {} } },
    language: 'en',
  });
  assert.equal(broke.actions[1].enabled, false);
  assert.match(broke.actions[1].hint, new RegExp(`Needs ${costGold} \\{gold\\}`));
  assert.equal(broke.actions[2].enabled, false);
  assert.equal(broke.actions[2].hint, `Too dangerous at this health · +${find.outcomes.dive.rewardGold} {gold}`);
  assert.throws(() => contextActionModel({ target: { kind: 'find', id: 'sunken-fountain', outcomes: {} } }), TypeError);

  const presentation = findPresentation(find, 'en');
  assert.equal(presentation.wave, 'landmark');
  assert.equal(presentation.path, findSkinPath(find));
  const drank = resolveFindInteraction({
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: heroNear(find),
    gold: 0,
    action: 'drink',
  });
  const result = findResultPresentation(drank, find, 'ru');
  assert.equal(result.message, findById('sunken-fountain').copy.ru.results.drink);
  assert.match(result.summary, /Здоровье \+\d+/);
  assert.match(landmarkResultSummary(drank, 'en'), /Health \+\d+/);
  assert.equal(findResultPresentation(drank, find, 'en').message, findById('sunken-fountain').copy.en.results.drink);
  assert.equal(findResultPresentation({ ok: false, reason: 'unsafe' }, find, 'en').unsafe, 'Too dangerous at this health');
});

test('a resolved altar survives reload inside the v34 find history and old saves gain it unresolved', () => {
  const { dungeon, find, seed } = fountainFixture(314, 1);
  const run = createRun(seed, dungeon);
  run.floor.resolvedFindIds = dungeon.finds.map(({ instanceId }) => instanceId);
  assert.ok(run.floor.resolvedFindIds.length <= MAX_FINDS_PER_FLOOR);
  assert.equal(validateRun(run), true);
  const hydrated = hydrateDungeon(run);
  assert.equal(hydrated.finds.find(({ instanceId }) => instanceId === find.instanceId).resolved, true);
  const overflow = structuredClone(run);
  // Спящая жила оставляет этаж на одну находку короче, поэтому переполнение
  // строится от предела, а не от числа находок этого этажа.
  overflow.floor.resolvedFindIds = Array.from(
    { length: MAX_FINDS_PER_FLOOR + 1 },
    (_, index) => `find-1-${90 + index}`,
  );
  assert.equal(validateRun(overflow), false, 'more IDs than a floor can hold is rejected');

  const legacy = createRun(4242);
  legacy.version = 33;
  legacy.floor.merchantPurchases = [];
  delete legacy.floor.merchants;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, 51);
  const restored = hydrateDungeon(migrated);
  const altar = restored.finds.find((find) => isLandmarkFind(find));
  assert.ok(altar);
  assert.equal(altar.resolved, false);
});

test('рантайм держит ориентиры через общий реестр, а не по именам', async () => {
  const [runtime, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  assert.match(runtime, /findSkinPath\(find\) \?\? definition\.path/);
  assert.match(runtime, /vitals: \{\s+hp: hero\.hp,\s+maxHp: currentHeroStats\(\)\.maxHp/);
  assert.match(runtime, /const landmarkResult = result\.definition\?\.wave === 'landmark'/);
  assert.match(runtime, /hero\.maxHp = result\.state\.hero\.maxHp/);
  // Ни одной находки по имени: всё идёт через общий реестр.
  assert.doesNotMatch(runtime, /if \(find\.id === 'sunken-fountain'\)/);
  assert.doesNotMatch(runtime, /ancient-altar/, 'алтарь остался в рантайме');
  // Опасное — красным, целебное — зелёным, и это про действия, а не про находку.
  assert.match(css, /\[data-action='dive'\] > b/);
  assert.match(css, /\[data-action='drink'\] > b/);
});
