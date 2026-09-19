import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { DEEPEST_DEPTH } from '../tools/dcss-rpg-run.js';

import {
  HOME_STONE_ITEM_ID,
  HOUSE_FURNITURE,
  HOUSE_FURNITURE_IDS,
  HOUSE_PRICE,
  HOUSE_REST_PERCENT,
  HOUSE_TRAVEL_HUNGER_COST,
  buyHouse,
  canBuyHouse,
  canInstallFurniture,
  canTravelHome,
  createHouseState,
  houseArrivalCell,
  houseRefusalText,
  houseSlots,
  installFurniture,
  resolveHouseRest,
  returnFromHouse,
  travelHome,
  validateHouseState,
} from '../tools/dcss-rpg-house.js';
import { CITY_DEPTHS } from '../tools/dcss-rpg-city.js';
import { lootById } from '../tools/dcss-rpg-content.js';
import { itemDetails } from '../tools/dcss-rpg-item-details.js';
import { generatedItemDescription } from '../tools/dcss-rpg-item-description.js';
import {
  SAVE_VERSION,
  advanceRunFloor,
  createRun,
  generateDungeon,
  migrateLegacyRun,
  travelRunToDepth,
  validateRun,
} from '../tools/dcss-rpg-core.js';

const owned = (furniture = [], anchor = null) => ({ owned: true, furniture: [...furniture], anchor });
const cityDepth = CITY_DEPTHS[0];

test('the deed costs gold and a free hand, and it is bought once', () => {
  const empty = createHouseState();
  assert.deepEqual(empty, { owned: false, furniture: [], anchor: null });
  assert.equal(validateHouseState(empty), true);
  assert.equal(canBuyHouse({ house: empty, gold: HOUSE_PRICE - 1 }).reason, 'no-gold');
  assert.equal(canBuyHouse({ house: empty, gold: HOUSE_PRICE, backpackCount: 12 }).reason, 'full-bag');
  assert.equal(canBuyHouse({ house: owned(), gold: 9999 }).reason, 'already-owned');

  const bought = buyHouse({ house: empty, gold: 400 });
  assert.equal(bought.ok, true);
  assert.equal(bought.gold, 400 - HOUSE_PRICE);
  assert.deepEqual(bought.house, { owned: true, furniture: [], anchor: null });
  assert.equal(validateHouseState(bought.house), true);
});

test('furniture is bought piece by piece and never twice', () => {
  assert.deepEqual([...HOUSE_FURNITURE_IDS], ['bed', 'chest', 'hearth']);
  for (const id of HOUSE_FURNITURE_IDS) {
    assert.ok(HOUSE_FURNITURE[id].price > 0);
    assert.ok(HOUSE_FURNITURE[id].labels.ru && HOUSE_FURNITURE[id].labels.en);
  }
  assert.equal(canInstallFurniture({ house: createHouseState(), furnitureId: 'bed', gold: 999 }).reason, 'no-house');
  assert.equal(canInstallFurniture({ house: owned(), furnitureId: 'sofa', gold: 999 }).reason, 'unknown');
  assert.equal(canInstallFurniture({ house: owned(), furnitureId: 'bed', gold: 0 }).reason, 'no-gold');

  const withBed = installFurniture({ house: owned(), furnitureId: 'bed', gold: 500 });
  assert.equal(withBed.ok, true);
  assert.equal(withBed.gold, 500 - HOUSE_FURNITURE.bed.price);
  assert.deepEqual(withBed.house.furniture, ['bed']);
  assert.equal(validateHouseState(withBed.house), true);
  assert.equal(installFurniture({ house: withBed.house, furnitureId: 'bed', gold: 500 }).reason, 'already-installed');

  const full = ['bed', 'chest', 'hearth'].reduce(
    (state, id) => installFurniture({ house: state.house, furnitureId: id, gold: state.gold }),
    { house: owned(), gold: 900 },
  );
  assert.deepEqual(full.house.furniture, HOUSE_FURNITURE_IDS.slice());
});

test('a house state is strict about what it can hold', () => {
  assert.equal(validateHouseState(null), false);
  assert.equal(validateHouseState({ owned: true }), false);
  assert.equal(validateHouseState({ owned: false, furniture: ['bed'], anchor: null }), false, 'no furniture without a house');
  assert.equal(validateHouseState({ owned: false, furniture: [], anchor: { depth: 2, x: 1, y: 1 } }), false);
  assert.equal(validateHouseState(owned(['bed', 'bed'])), false, 'a piece is installed once');
  assert.equal(validateHouseState(owned(['sofa'])), false);
  assert.equal(validateHouseState(owned([], { depth: 2, x: 1 })), false);
  assert.equal(validateHouseState(owned([], { depth: 2, x: 1, y: 1 })), true);
});

test('the bed pays health for time, and only a bed does', () => {
  assert.equal(resolveHouseRest({ house: owned(), hp: 10, maxHp: 80, hunger: 3000 }).reason, 'no-bed');
  const house = owned(['bed']);
  assert.equal(resolveHouseRest({ house, hp: 80, maxHp: 80, hunger: 3000 }).reason, 'nothing-to-heal');
  assert.equal(resolveHouseRest({ house, hp: 10, maxHp: 80, hunger: 100 }).reason, 'too-hungry');
  const rested = resolveHouseRest({ house, hp: 10, maxHp: 80, hunger: 3000 });
  assert.equal(rested.ok, true);
  assert.equal(rested.healed, Math.round((80 * HOUSE_REST_PERCENT) / 100));
  assert.equal(rested.hp, 10 + rested.healed);
  assert.equal(rested.hunger, 3000 - HOUSE_TRAVEL_HUNGER_COST);
});

test('the stone remembers where the hero left, and the way back is one use', () => {
  const house = owned(['bed']);
  const cell = { x: 12, y: 7 };
  assert.equal(canTravelHome({ house: createHouseState(), depth: 6, cell, hunger: 3000 }).reason, 'no-house');
  assert.equal(canTravelHome({ house, depth: 6, cell, hunger: 100 }).reason, 'too-hungry');
  assert.equal(canTravelHome({ house, depth: 6, cell, hunger: 3000, watchers: 1 }).reason, 'enemies-near');

  const away = travelHome({ house, depth: 6, cell, hunger: 3000 });
  assert.equal(away.ok, true);
  assert.equal(away.hunger, 3000 - HOUSE_TRAVEL_HUNGER_COST);
  assert.deepEqual(away.house.anchor, { depth: 6, x: 12, y: 7 });
  assert.equal(validateHouseState(away.house), true);

  const back = returnFromHouse({ house: away.house });
  assert.equal(back.ok, true);
  assert.deepEqual(back.anchor, { depth: 6, x: 12, y: 7 });
  assert.equal(back.house.anchor, null, 'the way back is spent when it is walked');
  assert.equal(returnFromHouse({ house: back.house }).reason, 'no-anchor');
});

test('every piece has a place inside the plot, away from the doorway', () => {
  for (let seed = 500; seed <= 540; seed += 1) {
    const level = generateDungeon({ seed, depth: cityDepth });
    const plot = level.city.blocks.find(({ kind }) => kind === 'plot');
    assert.ok(plot, `seed ${seed} has a plot for sale`);
    const slots = houseSlots(plot);
    assert.equal(slots.length, HOUSE_FURNITURE_IDS.length, `seed ${seed} seats every piece`);
    const arrival = houseArrivalCell(plot);
    assert.equal(level.grid[arrival.y][arrival.x], '.', 'the hero lands on open floor');
    for (const slot of slots) {
      assert.equal(level.grid[slot.y][slot.x], '.', 'furniture stands on floor, not in a wall');
      assert.ok(
        Math.abs(slot.x - plot.door.x) + Math.abs(slot.y - plot.door.y) > 1,
        'nothing blocks the doorway',
      );
      assert.notDeepEqual(slot, arrival, 'and nothing stands where the stone puts the hero');
    }
    assert.equal(new Set(slots.map(({ x, y }) => `${x},${y}`)).size, slots.length);
  }
});

test('the stone is an item the deed hands over, never found and never sold', () => {
  const stone = lootById(HOME_STONE_ITEM_ID);
  assert.ok(stone);
  assert.equal(stone.randomDrop, false);
  assert.equal(stone.merchantStock, false);
  assert.deepEqual(stone.useEffect, { type: 'home-travel' });
  assert.equal(itemDetails(stone, 'ru').name, 'Камень возвращения');
  assert.equal(itemDetails(stone, 'en').name, 'Homing stone');
  assert.match(itemDetails(stone, 'ru').description, /Дорога домой/);
  assert.equal(houseRefusalText('no-gold', 'ru'), 'Не хватает реального золота');
  assert.equal(houseRefusalText('enemies-near', 'en'), 'Enemies are near');
  assert.equal(houseRefusalText('ready', 'ru'), '');
});

test('save v47 keeps the deed through descents, travel and migration', () => {
  assert.equal(SAVE_VERSION, 48);
  const run = createRun(4101);
  assert.deepEqual(run.house, { owned: false, furniture: [], anchor: null });
  assert.equal(validateRun(run), true);
  run.house = owned(['bed', 'chest'], { depth: 2, x: 4, y: 5 });
  assert.equal(validateRun(run), true);
  run.house = { owned: true, furniture: ['throne'], anchor: null };
  assert.equal(validateRun(run), false);

  run.house = owned(['bed']);
  const deeper = advanceRunFloor(run);
  assert.deepEqual(deeper.house, run.house, 'the deed follows the hero down');

  const travelled = travelRunToDepth(deeper, cityDepth, null);
  assert.equal(travelled.depth, cityDepth);
  assert.equal(validateRun(travelled), true);
  assert.throws(() => travelRunToDepth(deeper, DEEPEST_DEPTH + 1), /inside the dungeon/);

  const legacy = structuredClone(createRun(4102));
  legacy.version = 40;
  delete legacy.house;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, 48);
  assert.deepEqual(migrated.house, { owned: false, furniture: [], anchor: null });
  assert.equal(validateRun(migrated), true);
});

test('a live floor with water and chapter creatures is a valid save', () => {
  // The id rule knew only `monster-<depth>-<n>` and `-boss`, so any save made
  // while a chapter or water creature was alive was silently thrown away.
  const level = generateDungeon({ seed: 503, depth: 6 });
  const special = level.monsters.filter(({ instanceId }) => !/^monster-6-\d+$/.test(instanceId));
  assert.ok(special.length > 0, 'floor six carries a guardian and a chapter creature');
  const run = createRun(503, level);
  run.depth = 6;
  run.floor.monsters = level.monsters.map(({ instanceId, x, y }) => ({
    instanceId,
    x: x + 0.25,
    y,
    hp: 4,
    attackSequence: 0,
    effects: { burning: 0, wet: 0, chilled: 0, frozen: 0, poison: 0 },
  }));
  assert.equal(validateRun(run), true);
});

test('the runtime sells the plot, furnishes it and walks the stone both ways', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function purchaseHouse\(\)[\s\S]*grantItem\(HOME_STONE_ITEM_ID/);
  assert.match(runtime, /function installHouseFurniture\(furnitureId\)[\s\S]*installFurniture\(\{ house: run\.house/);
  assert.match(runtime, /function restAtHouse\(\)[\s\S]*houseRestDecision\(\)/);
  assert.match(runtime, /function useHomeStone\(\)[\s\S]*returnFromHouse\(\{ house: run\.house \}\)/);
  assert.match(runtime, /const arrival = houseArrivalCell\(cityHousePlot\(\)\);/);
  assert.match(runtime, /effect\?\.type === 'home-travel'/);
  const core = await readFile(new URL('../tools/dcss-rpg-core.js', import.meta.url), 'utf8');
  assert.match(
    core,
    /export function travelRunToDepth[\s\S]*house: createHouseState\(snapshot\.house\)/,
    'travel carries the deed',
  );
});

/**
 * The stone is a door, not an exit. It anchors the floor and the tile it left
 * and promises to put the hero back on them — and the floor memory added with
 * the endless descent broke exactly that: from floor fifteen the city is
 * fifteen floors away, further than the dungeon remembers, so the anchored
 * floor was thrown out and came back fresh. Monsters alive again, chests
 * unopened again. A promise and a loot exploit in one.
 */
test('the floor the stone anchored is remembered however far away it is', () => {
  let run = createRun(31, generateDungeon({ seed: 31, depth: 1 }));
  for (let step = 1; step < 15; step += 1) run = advanceRunFloor(run);
  assert.equal(run.depth, 15);
  run.floor.defeated = [generateDungeon({ seed: run.seed, depth: 15 }).monsters[0].instanceId];
  const left = [...run.floor.defeated];
  run.house = owned([], { depth: 15, x: run.hero.x, y: run.hero.y });

  const home = travelRunToDepth(run, cityDepth, null);
  assert.ok(Object.hasOwn(home.floors, '15'), 'этаж, с которого ушли домой, забыт');
  assert.equal(validateRun(home), true);

  const back = travelRunToDepth(home, 15, { x: run.hero.x, y: run.hero.y });
  assert.deepEqual(back.floor.defeated, left, 'вернулись на переделанный этаж');
  assert.equal(validateRun(back), true);

  // And an ordinary far floor with no anchor on it is still let go: the
  // exception is the promise, not a hole in the rule.
  const noAnchor = travelRunToDepth({ ...run, house: owned([]) }, cityDepth, null);
  assert.equal(Object.hasOwn(noAnchor.floors, '15'), false);
});

test('the way back is pulled from town, not from one particular room', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const body = runtime.match(/function useHomeStone\(\) \{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';
  assert.ok(body.length > 0);
  // Anywhere in the city with an anchor set returns the hero; standing in the
  // bedroom was friction with no decision in it.
  assert.match(body, /isCityDepth\(dungeon\.depth\) && run\.house\.anchor/);
  assert.match(body, /returnFromHouse\(\{ house: run\.house \}\)/);
  assert.match(body, /travelRunToDepth\(captureRun\(\), back\.anchor\.depth/);
  // And the item says it works both ways, or nobody finds out that it does.
  const ru = generatedItemDescription(lootById(HOME_STONE_ITEM_ID), 'ru').summary;
  assert.match(ru, /обратно/);
});
