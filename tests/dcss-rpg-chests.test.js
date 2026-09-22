import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHEST_ASSET_PATHS,
  CHEST_DEFAULT_PATH,
  CHEST_RESOURCE_IDS,
  CHEST_VARIANTS,
  CHEST_VISUAL_SKINS,
  chestActionRules,
  chestContextPresentation,
  chestFramesForSkin,
  chestVisualFrames,
  createChestProfile,
  lockpickCost,
  resolveChestInteraction,
} from '../tools/dcss-rpg-chests.js';
import {
  SAVE_KEY,
  SAVE_VERSION,
  createRun,
  hydrateDungeon,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';

test('licensed chest art exposes four deterministic animated 32x32 skins', () => {
  assert.equal(CHEST_VISUAL_SKINS.length, 4);
  assert.equal(CHEST_ASSET_PATHS.length, 16);
  assert.equal(CHEST_DEFAULT_PATH, 'licensed/cmski-chests/wooden/1.png');
  assert.ok(CHEST_ASSET_PATHS.every((path) => /^licensed\/cmski-chests\/.+\/[1-4]\.png$/.test(path)));
  const first = chestVisualFrames({ seed: 4401, depth: 2, roomIndex: 3 });
  assert.equal(first.length, 4);
  assert.deepEqual(first, chestVisualFrames({ seed: 4401, depth: 2, roomIndex: 3 }));
  assert.deepEqual(
    chestVisualFrames({ seed: 4401, depth: 2, roomIndex: 3, skinIds: ['pharaoh'] }),
    chestFramesForSkin('pharaoh'),
  );
  assert.throws(() => chestVisualFrames({ seed: 4401, depth: 2, roomIndex: 3, skinIds: ['missing'] }));
  assert.throws(() => chestVisualFrames({ seed: -1, depth: 2, roomIndex: 3 }));
});

const chest = (overrides = {}) => ({
  instanceId: 'find-1-2',
  id: 'sealed-cache',
  x: 4,
  y: 5,
  rewardGold: 12,
  rewardPower: 0,
  riskDamage: 0,
  cacheVariant: 'locked',
  lockTier: 1,
  trapTier: 0,
  hazardDamage: 0,
  curseEffectId: null,
  curseDuration: 0,
  ...overrides,
});

const command = (find, action, overrides = {}) => ({
  find,
  action,
  resolvedFindIds: [],
  runStatus: 'playing',
  hero: { x: find.x + 1, y: find.y, hp: 40, power: 2 },
  gold: 3,
  actor: { resources: {}, capabilities: {} },
  ...overrides,
});

test('chest profiles are deterministic, depth-scaled and include every authored variant', () => {
  const seen = new Set();
  // The whole road, not its first three floors: a mimic waits past the first
  // chapter now, so a sweep that stops at floor three reports it as missing
  // content when it is only the depth talking.
  for (let seed = 1; seed <= 1000; seed += 1) {
    const depth = 1 + (seed % 18);
    const first = createChestProfile({ seed, depth, roomIndex: seed % 8, rewardGold: 10 });
    const second = createChestProfile({ seed, depth, roomIndex: seed % 8, rewardGold: 10 });
    assert.deepEqual(first, second);
    assert.ok(first.rewardGold >= 10);
    assert.ok(first.lockTier >= 1 && first.lockTier <= 3, 'ящик без замка');
    assert.ok(first.trapTier >= 0 && first.trapTier <= 3);
    seen.add(first.cacheVariant);
  }
  assert.deepEqual([...seen].sort(), [...CHEST_VARIANTS].sort());
});

/**
 * Внутрь ведут два пути, и оба чего-то стоят.
 *
 * Третьим была кувалда: бесплатная, всегда доступная и потому обесценивавшая
 * и ключи, и навык «Взлом». Иван: «убираем, что сундук можно разбить и
 * открыть <...> сундуки можно только взламывать».
 */
test('у запертого ящика два пути внутрь: ключ и отмычка', () => {
  const find = chest({ cacheVariant: 'locked', lockTier: 1 });
  const blocked = chestActionRules({ find, actor: { resources: {}, capabilities: {} } });
  assert.deepEqual(blocked.actions.map(({ id }) => id), ['use-key', 'pick-lock']);
  assert.equal(blocked.actions.find(({ id }) => id === 'use-key').enabled, false);
  assert.equal(blocked.actions.find(({ id }) => id === 'pick-lock').enabled, false);
  const keyed = chestActionRules({
    find,
    actor: { resources: { keyCount: 1 }, capabilities: {} },
  });
  assert.equal(keyed.actions.find(({ id }) => id === 'use-key').enabled, true);
  const picked = chestActionRules({
    find,
    actor: { resources: { lockpickCount: 2 }, capabilities: { lockpickTier: 1 } },
  });
  assert.equal(lockpickCost(1), 2);
  assert.equal(lockpickCost(2), 1);
  assert.equal(picked.actions.find(({ id }) => id === 'pick-lock').enabled, true);
  assert.equal(resolveChestInteraction(command(find, 'smash')).reason, 'action', 'кувалда всё ещё работает');
});

/**
 * Ключ от всех сундуков отпирает любой замок и остаётся в сумке.
 *
 * Иван: «ключ от всех сундуков, вот у нас будет такой артефакт редкий,
 * классный, прикольный». Пока он есть, выбирать не из чего — и список
 * действий это показывает одной строкой вместо двух.
 */
test('ключ от всех сундуков открывает любой замок и не тратится', () => {
  const master = { resources: { masterKey: true }, capabilities: {} };
  for (const tier of [1, 2, 3]) {
    const find = chest({ cacheVariant: 'locked', lockTier: tier });
    const rules = chestActionRules({ find, actor: master });
    assert.deepEqual(rules.actions.map(({ id }) => id), ['master-key'], `замок ${tier}`);
    assert.equal(rules.actions[0].enabled, true);
    const opened = resolveChestInteraction(command(find, 'master-key', { actor: master }));
    assert.equal(opened.ok, true);
    assert.deepEqual(opened.consumed, [], 'ключ от всех сундуков израсходовался');
    assert.equal(opened.rewardGold, find.rewardGold);
  }
  // Он и есть ресурс: модуль знает его по имени, как ключ и отмычку.
  assert.equal(CHEST_RESOURCE_IDS.masterKey, 'master-key');
});

test('ключ и отмычка тратятся, а награда от способа не зависит', () => {
  const find = chest({ cacheVariant: 'locked', lockTier: 1, rewardGold: 15 });
  const keyed = resolveChestInteraction(command(find, 'use-key', {
    actor: { resources: { keyCount: 1 }, capabilities: {} },
  }));
  assert.equal(keyed.ok, true);
  assert.equal(keyed.rewardGold, 15);
  assert.deepEqual(keyed.consumed, [{ id: CHEST_RESOURCE_IDS.key, amount: 1 }]);

  const pickedInput = command(find, 'pick-lock', {
    actor: { resources: { lockpickCount: 2 }, capabilities: { lockpickTier: 1 } },
  });
  const before = structuredClone(pickedInput);
  const picked = resolveChestInteraction(pickedInput);
  assert.equal(picked.ok, true);
  assert.equal(picked.rewardGold, 15, 'вскрытый замок платит столько же, сколько отпертый');
  assert.equal(picked.destroyedGold, 0, 'портить добычу больше нечем');
  assert.deepEqual(picked.consumed, [{ id: CHEST_RESOURCE_IDS.lockpick, amount: 2 }]);
  assert.deepEqual(pickedInput, before);
});

test('traps, curses and mimics trade health for loot while skill creates a safe answer', () => {
  const opener = { resources: { masterKey: true }, capabilities: {} };
  const open = (find, overrides = {}) => resolveChestInteraction(command(find, 'master-key', {
    actor: opener, ...overrides,
  }));
  const trapped = chest({ cacheVariant: 'trapped', trapTier: 2, hazardDamage: 12 });
  const opened = open(trapped);
  assert.equal(opened.ok, true);
  assert.equal(opened.damage, 12);
  assert.equal(opened.state.hero.hp, 28);
  // Отдельной кнопки «Обезвредить» нет: она сама выдавала, что ящик с
  // ловушкой. Умение работает молча — кто разбирается в механизмах, поднимает
  // крышку и не получает по рукам.
  assert.equal(opened.defused, false);
  const disarmed = open(trapped, {
    actor: { resources: { masterKey: true }, capabilities: { trapDisarmTier: 2 } },
  });
  assert.equal(disarmed.ok, true);
  assert.equal(disarmed.defused, true);
  assert.equal(disarmed.damage, 0);
  assert.equal(disarmed.rewardGold, trapped.rewardGold);
  // А кому не хватает ранга — тому ловушка достаётся целиком.
  const weak = open(trapped, {
    actor: { resources: { masterKey: true }, capabilities: { trapDisarmTier: 1 } },
  });
  assert.equal(weak.defused, false);
  assert.equal(weak.damage, 12);

  const cursed = chest({ cacheVariant: 'cursed', hazardDamage: 15 });
  cursed.curseEffectId = 'poison';
  cursed.curseDuration = 6;
  assert.deepEqual(open(cursed).status, { id: 'poison', duration: 6 });
  assert.equal(open(cursed, { hero: { x: 5, y: 5, hp: 15, power: 2 } }).reason, 'unsafe');

  // Мимик открывается тем же способом, что и всякий ящик, и кусает того, кто
  // открыл: «либо нападает, либо нет» — это и есть вся его загадка.
  const mimic = chest({ cacheVariant: 'mimic', hazardDamage: 14, mimicMonsterId: 'monster-1-4' });
  const ambush = open(mimic);
  assert.equal(ambush.damage, 14);
  assert.deepEqual(ambush.struckMonsterIds, []);
  assert.deepEqual(ambush.activatedMonsterIds, ['monster-1-4']);
  assert.equal(ambush.rewardGold, 0);
  assert.equal(ambush.deferredRewardGold, mimic.rewardGold);

  // Список действий одинаков у всех: он не выдаёт, что перед тобой.
  for (const find of [
    chest({ cacheVariant: 'locked', lockTier: 1 }),
    chest({ cacheVariant: 'trapped', lockTier: 1, trapTier: 1, hazardDamage: 7 }),
    chest({ cacheVariant: 'cursed', lockTier: 1, hazardDamage: 7, curseEffectId: 'poison', curseDuration: 4 }),
    chest({ cacheVariant: 'mimic', lockTier: 1, hazardDamage: 7, mimicMonsterId: 'monster-1-4' }),
  ]) {
    assert.deepEqual(
      chestActionRules({ find }).actions.map(({ id }) => id),
      ['use-key', 'pick-lock'],
      `${find.cacheVariant} показывает другой список`,
    );
  }
});

test('нетронутый ящик ничем не выдаёт, что внутри', () => {
  const find = chest({ cacheVariant: 'mimic', lockTier: 1, hazardDamage: 13 });
  const hidden = chestContextPresentation({ find, language: 'ru' });
  assert.equal(hidden.name, 'Запертый сундук');
  assert.doesNotMatch(hidden.description, /13/);
  // Ни имя, ни описание, ни список действий не отвечают за игрока на вопрос,
  // что перед ним: запертый ящик выглядит запертым ящиком.
  assert.deepEqual(hidden.actions.map(({ id }) => id), ['use-key', 'pick-lock']);
  const trapped = chestContextPresentation({
    find: chest({ cacheVariant: 'trapped', lockTier: 1, trapTier: 2, hazardDamage: 9 }),
    language: 'ru',
  });
  assert.equal(trapped.name, hidden.name, 'ловушка выдаёт себя именем');
  assert.equal(trapped.description, hidden.description, 'ловушка выдаёт себя описанием');
  assert.deepEqual(trapped.actions.map(({ id }) => id), ['use-key', 'pick-lock']);

  const opened = chestContextPresentation({
    find: chest({ containerOpened: true }),
    language: 'ru',
  });
  assert.equal(opened.description, '');
  assert.deepEqual(opened.actions.map(({ id }) => id), ['browse']);
});

test('v13 saves migrate without inventing starter tools across the expanded-run rebase', () => {
  const legacy = createRun(4401);
  legacy.version = 13;
  legacy.contentVersion = 4;
  legacy.items = legacy.items.filter(({ id }) =>
    !Object.values(CHEST_RESOURCE_IDS).includes(id) && id !== 'hunter-trap');
  legacy.inventory = legacy.inventory.filter((uid) =>
    !['starter-key', 'starter-lockpicks', 'starter-hunter-trap'].includes(uid));
  delete legacy.floor.placedTraps;
  legacy.started = true;
  legacy.floor.revealed.push(`${legacy.hero.x},${legacy.hero.y}`);
  const migrated = migrateLegacyRun(legacy);
  assert.equal(SAVE_VERSION, 51);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v51');
  assert.equal(migrated.items.some(({ id }) => Object.values(CHEST_RESOURCE_IDS).includes(id)), false);
  assert.deepEqual(migrated.floor.revealed, []);
  assert.equal(migrated.started, false);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));
});

test('runtime consumes tools through registered world actions, never generic potion use', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /const CONTEXT_COMMAND_HANDLERS = Object\.freeze/);
  assert.match(runtime, /action\.command/);
  assert.match(runtime, /consumeInteractionResources\(result\.consumed\)/);
  assert.match(runtime, /if \(selection\.item\.interactionResource\)/);
  assert.match(runtime, /function useConsumable\(item, index, effectOverride = null\) \{[\s\S]{0,120}if \(item\.interactionResource\)/);
});
