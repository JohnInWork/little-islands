import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

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
  dungeonThemeForDepth,
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

function altarFixture(seed = 7, depth = 2) {
  return landmarkFixture('ancient-altar', seed, depth);
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

test('the altar is a landmark: catalog, themed skins and bundled assets', async () => {
  const altar = findById('ancient-altar');
  assert.equal(altar.wave, 'landmark');
  assert.deepEqual(LANDMARK_CATALOG.map(({ id }) => id), ['ancient-altar', 'sunken-fountain', 'warded-rune']);
  assert.equal(CORE_FIND_CATALOG.length, 3);
  assert.equal(MAX_FINDS_PER_FLOOR, 5);
  assert.deepEqual(altar.outcomes.map(({ id }) => id), ['pray', 'offer', 'plunder']);
  assert.ok(Object.isFrozen(altar.outcomes));
  for (const themeId of ['ashen-vault', 'buried-sanctum', 'frozen-depths', 'infernal-core']) {
    assert.ok(altar.skins[themeId], `skin for ${themeId}`);
    assert.ok(FIND_ASSET_PATHS.includes(altar.skins[themeId]));
  }
  await Promise.all(Object.values(altar.skins).map((path) => access(assetUrl(path))));
  assert.equal(findSkinPath({ id: 'ancient-altar', themeId: 'frozen-depths' }), altar.skins['frozen-depths']);
  assert.equal(findSkinPath({ id: 'ancient-altar', themeId: 'unknown' }), altar.path);
  assert.equal(findSkinPath({ id: 'crystal-vein' }), findById('crystal-vein').path);
  assert.equal(roomArchetypeIdForFind('ancient-altar'), 'altar-niche');
  assert.equal(roomArchetypeIdForFind('sealed-cache'), 'treasure-vault');
  assert.equal(roomArchetypeById('altar-niche').content.findId, 'ancient-altar');
});

test('every floor places at most one landmark in its own quiet room without blocking the route', () => {
  let placed = 0;
  for (let seed = 1; seed <= 600; seed += 1) {
    const depth = 1 + (seed % 9);
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
    assert.equal(altar.themeId, dungeonThemeForDepth(depth).id);
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
      roomArchetypeById(archetypeId).environmentThemeIds[dungeonThemeForDepth(depth).id],
    );
    const blocked = dungeon.grid.map((row) => [...row]);
    for (const find of dungeon.finds) blocked[find.y][find.x] = '#';
    assert.ok(findGridPath(blocked, dungeon.spawn, dungeon.exit, { allowDoors: true }).length > 0);
    if (altar.id === 'ancient-altar') {
      const { pray, offer, plunder } = altar.outcomes;
      assert.deepEqual(pray, { healRatio: 0.3, cleanse: true });
      assert.ok(offer.costGold >= 14 && offer.rewardMaxHp === 4 + depth && offer.heal === offer.rewardMaxHp);
      assert.ok(plunder.rewardGold > 0 && plunder.damage > 0 && plunder.noise > 0);
      assert.ok(['poison', 'chilled'].includes(plunder.status.id));
    }
  }
  assert.ok(placed >= 590, `landmark placed on ${placed} of 600 floors`);
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
  const level = { seed: 11, depth: 3, grid: rows, rooms, exit: { x: 3, y: 3 }, surprises: [] };
  const coreOnly = createDungeonFinds({ level, rng: createRng(5) });
  const withLandmark = createDungeonFinds({ level, rng: createRng(5), landmarkRng: createRng(9) });
  assert.equal(coreOnly.length, 3);
  assert.equal(withLandmark.length, 4);
  assert.deepEqual(withLandmark.slice(0, 3), coreOnly);
  assert.equal(isLandmarkFind(withLandmark[3]), true);
  assert.ok(coreOnly.every(({ roomIndex }) => roomIndex !== withLandmark[3].roomIndex));
  assert.deepEqual(
    createDungeonFinds({ level, rng: createRng(5), landmarkRng: createRng(9) }),
    withLandmark,
  );
});

test('action availability follows gold, health and the presence of anything to restore', () => {
  const { find } = altarFixture();
  const { offer, plunder } = find.outcomes;
  const poor = landmarkActionRules({
    find,
    actor: { gold: offer.costGold - 1, vitals: { hp: plunder.damage, maxHp: 100, effects: {} } },
    language: 'ru',
  });
  assert.deepEqual(poor.actions.map(({ id }) => id), ['pray', 'offer', 'plunder']);
  assert.equal(poor.actions[0].enabled, true);
  assert.equal(poor.actions[1].enabled, false);
  assert.equal(poor.actions[1].hint, `Нужно ${offer.costGold}●`);
  assert.equal(poor.actions[2].enabled, false);
  assert.equal(poor.actions[2].hint, 'Слишком опасно при таком здоровье');

  const healthy = landmarkActionRules({
    find,
    actor: { gold: offer.costGold, vitals: { hp: 100, maxHp: 100, effects: {} } },
    language: 'en',
  });
  assert.equal(healthy.actions[0].enabled, false);
  assert.equal(healthy.actions[0].hint, 'Nothing to heal');
  assert.equal(healthy.actions[1].enabled, true);
  assert.equal(healthy.actions[1].hint, `−${offer.costGold}●`);
  assert.equal(healthy.actions[2].enabled, true);

  const poisoned = landmarkActionRules({
    find,
    actor: { gold: 0, vitals: { hp: 100, maxHp: 100, effects: { poison: 3 } } },
  });
  assert.equal(poisoned.actions[0].enabled, true, 'cleansing is still worth a prayer');
  assert.ok(Object.isFrozen(poisoned.actions));
  assert.throws(() => landmarkActionRules({ find: { id: 'ancient-altar', outcomes: {} } }), TypeError);
});

test('praying heals a share of the effective maximum and clears statuses without touching gold', () => {
  const { find } = altarFixture();
  const input = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: heroNear(find, { effects: { poison: 5, wet: 2 } }),
    gold: 50,
    action: 'pray',
    actor: { vitals: { maxHp: 120 } },
  };
  const before = structuredClone(input);
  const result = resolveFindInteraction(input);
  assert.equal(result.ok, true);
  assert.equal(result.action, 'pray');
  assert.equal(result.heal, 36);
  assert.equal(result.state.hero.hp, 76);
  assert.equal(result.state.hero.maxHp, 100);
  assert.deepEqual([...result.cleansed].sort(), ['poison', 'wet']);
  assert.equal(result.state.hero.effects.poison, 0);
  assert.equal(result.state.gold, 50);
  assert.equal(result.costGold, 0);
  assert.equal(result.damage, 0);
  assert.equal(result.status, null);
  assert.deepEqual(result.state.resolvedFindIds, [find.instanceId]);
  assert.deepEqual(input, before, 'pure command must not mutate the caller state');

  const nearlyFull = resolveFindInteraction({
    ...input,
    hero: heroNear(find, { hp: 118, effects: {} }),
  });
  assert.equal(nearlyFull.state.hero.hp, 120, 'healing never exceeds the effective maximum');
  assert.equal(nearlyFull.heal, 2);

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

test('an offering costs gold up front and permanently raises maximum health', () => {
  const { find } = altarFixture(19, 5);
  const { costGold, rewardMaxHp } = find.outcomes.offer;
  const input = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: heroNear(find, { hp: 30, maxHp: 100 }),
    gold: costGold + 3,
    action: 'offer',
    actor: { gold: costGold + 3, vitals: { hp: 30, maxHp: 115, effects: {} } },
  };
  const result = resolveFindInteraction(input);
  assert.equal(result.ok, true);
  assert.equal(result.costGold, costGold);
  assert.equal(result.rewardMaxHp, rewardMaxHp);
  assert.equal(result.state.gold, 3);
  assert.equal(result.state.hero.maxHp, 100 + rewardMaxHp);
  assert.equal(result.state.hero.hp, 30 + rewardMaxHp);
  assert.equal(result.heal, rewardMaxHp);
  assert.equal(resolveFindInteraction({ ...input, gold: costGold - 1 }).reason, 'gold-required');
  assert.deepEqual(input.resolvedFindIds, []);
});

test('plundering pays gold but wounds, curses and alerts, and it is never lethal', () => {
  const { find } = altarFixture(23, 4);
  const { rewardGold, damage, status, noise } = find.outcomes.plunder;
  const base = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    gold: 4,
    action: 'plunder',
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
  assert.equal(result.noise, noise);
  assert.equal(result.heal, 0);
  assert.deepEqual(result.cleansed, []);
  assert.equal(result.state.hero.maxHp, 100);
});

test('the resolver executes rolled outcome data, so a new landmark is data rather than code', () => {
  const { find } = altarFixture();
  const custom = {
    ...find,
    outcomes: {
      pray: { rewardPower: 2, noise: 3 },
      offer: { costGold: 5, heal: 7 },
      plunder: { damage: 1, rewardGold: 1 },
    },
  };
  assert.equal(isLandmarkFind(custom), true);
  const result = resolveFindInteraction({
    find: custom,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: heroNear(find),
    gold: 0,
    action: 'pray',
  });
  assert.equal(result.ok, true);
  assert.equal(result.rewardPower, 2);
  assert.equal(result.state.hero.power, 5);
  assert.equal(result.noise, 3);
  assert.match(landmarkResultSummary(result, 'ru'), /Сила \+2/);
  assert.match(landmarkResultSummary(result, 'en'), /Power \+2/);

  assert.equal(isLandmarkFind({ ...find, outcomes: { ...find.outcomes, pray: { bless: true } } }), false);
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

test('the shared registry presents the altar bilingually without spoiling outcomes', () => {
  const { find } = altarFixture();
  const { costGold } = find.outcomes.offer;
  const target = { kind: 'find', ...find };
  const actor = { gold: costGold, vitals: { hp: 50, maxHp: 100, effects: {} } };
  const ru = contextActionModel({ target, actor, language: 'ru' });
  assert.equal(ru.interactionId, 'landmark');
  assert.equal(ru.name, 'Древний алтарь');
  assert.equal(ru.description, '');
  assert.equal(ru.icon, findSkinPath(find));
  assert.deepEqual(ru.actions.map(({ id }) => id), ['inspect', 'pray', 'offer', 'plunder']);
  assert.deepEqual(ru.actions.map(({ label }) => label), ['Осмотреть', 'Молиться', 'Пожертвовать', 'Ограбить']);
  assert.ok(ru.actions.every(({ command }) => command === 'inspect' || command === 'find-interact'));
  assert.equal(ru.actions[2].hint, `−${costGold}●`);
  assert.equal(ru.actions[2].enabled, true);

  const inspected = contextActionModel({ target, actor, language: 'en', inspected: true });
  assert.equal(inspected.name, 'Ancient altar');
  assert.equal(inspected.description, 'A stone altar. The bowl holds traces of old offerings.');
  assert.doesNotMatch(inspected.description, /reward|treasure|danger|награ|ценност|получ|\d+◆|−\d+/i);
  assert.deepEqual(inspected.actions.map(({ label }) => label), ['Inspect', 'Pray', 'Offer', 'Plunder']);

  const broke = contextActionModel({
    target,
    actor: { gold: 0, vitals: { hp: 2, maxHp: 100, effects: {} } },
    language: 'en',
  });
  assert.equal(broke.actions[2].enabled, false);
  assert.equal(broke.actions[2].hint, `Needs ${costGold}●`);
  assert.equal(broke.actions[3].enabled, false);
  assert.equal(broke.actions[3].hint, 'Too dangerous at this health');
  assert.throws(() => contextActionModel({ target: { kind: 'find', id: 'ancient-altar', outcomes: {} } }), TypeError);

  const presentation = findPresentation(find, 'en');
  assert.equal(presentation.wave, 'landmark');
  assert.equal(presentation.path, findSkinPath(find));
  const prayed = resolveFindInteraction({
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: heroNear(find),
    gold: 0,
    action: 'pray',
  });
  const result = findResultPresentation(prayed, find, 'ru');
  assert.equal(result.message, 'Алтарь очистил и исцелил героя');
  assert.match(result.summary, /^Здоровье \+\d+$/);
  assert.match(landmarkResultSummary(prayed, 'en'), /^Health \+\d+$/);
  assert.equal(findResultPresentation(prayed, find, 'en').message, 'The altar cleansed and healed the hero');
  assert.equal(findResultPresentation({ ok: false, reason: 'unsafe' }, find, 'en').unsafe, 'Too dangerous at this health');
});

test('a resolved altar survives reload inside the v34 find history and old saves gain it unresolved', () => {
  const { dungeon, find, seed } = altarFixture(314, 1);
  const run = createRun(seed, dungeon);
  run.floor.resolvedFindIds = dungeon.finds.map(({ instanceId }) => instanceId);
  assert.ok(run.floor.resolvedFindIds.length <= MAX_FINDS_PER_FLOOR);
  assert.equal(validateRun(run), true);
  const hydrated = hydrateDungeon(run);
  assert.equal(hydrated.finds.find(({ instanceId }) => instanceId === find.instanceId).resolved, true);
  const overflow = structuredClone(run);
  overflow.floor.resolvedFindIds.push('find-1-99');
  assert.equal(validateRun(overflow), false, 'more IDs than a floor can hold is rejected');

  const legacy = createRun(4242);
  legacy.version = 33;
  legacy.floor.merchantPurchases = [];
  delete legacy.floor.merchants;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, 37);
  const restored = hydrateDungeon(migrated);
  const altar = restored.finds.find((find) => isLandmarkFind(find));
  assert.ok(altar);
  assert.equal(altar.resolved, false);
});

test('runtime binds the altar through the shared context panel and themed skins', async () => {
  const [runtime, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  assert.match(runtime, /findSkinPath\(find\) \?\? definition\.path/);
  assert.match(runtime, /vitals: \{\s+hp: hero\.hp,\s+maxHp: currentHeroStats\(\)\.maxHp/);
  assert.match(runtime, /const landmarkResult = result\.definition\?\.wave === 'landmark'/);
  assert.match(runtime, /hero\.maxHp = result\.state\.hero\.maxHp/);
  assert.match(runtime, /altar: 'ancient-altar'/);
  assert.doesNotMatch(runtime, /if \(find\.id === 'ancient-altar'\)/);
  assert.match(css, /\[data-action='plunder'\] > b/);
  assert.match(css, /\[data-action='pray'\] > b/);
});
