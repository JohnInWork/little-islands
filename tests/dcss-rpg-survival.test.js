import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { lootById } from '../tools/dcss-rpg-content.js';
import { contextActionModel } from '../tools/dcss-rpg-context-actions.js';
import { createDungeonEnvironment } from '../tools/dcss-rpg-environment.js';
import { createGameCommand, gameEvent } from '../tools/dcss-rpg-game-commands.js';
import { createRun, generateDungeon, migrateLegacyRun, validateRun } from '../tools/dcss-rpg-core.js';
import { createPassiveCreatureStates } from '../tools/dcss-rpg-passive.js';
import {
  COOKED_MEAT_ITEM_ID,
  RAW_MEAT_ITEM_ID,
  SURVIVAL_COMMANDS,
  beginWildlifeHunt,
  cookMeat,
  strikeWildlife,
  transactStackItems,
} from '../tools/dcss-rpg-survival.js';

const command = (sequence, type, targetId, payload = {}) => createGameCommand({
  streamId: 'run:77:1',
  sequence,
  type,
  targetId,
  payload,
});

const sheep = () => ({
  instanceId: 'passive-1-0',
  id: 'sheep',
  maxHp: 18,
  hp: 18,
  defense: 0,
  meatYield: 2,
  huntResponse: 'flee',
  hunted: false,
  defeated: false,
});

test('game commands and derived events have stable replay-friendly identities', () => {
  const input = command(3, SURVIVAL_COMMANDS.hunt, 'passive-1-0', { deliberate: true });
  assert.equal(input.id, 'run:77:1:command:3');
  assert.deepEqual(input.payload, { deliberate: true });
  assert.equal(gameEvent(input, 0, 'wildlife-alerted').id, `${input.id}:event:0`);
  assert.throws(() => command(0, SURVIVAL_COMMANDS.hunt, 'passive-1-0'), /positive integer/);
  assert.throws(() => command(1, 'Bad Type', 'passive-1-0'), /kebab-case/);
});

test('wildlife stays peaceful until one explicit hunt command', () => {
  const creature = sheep();
  const hunted = beginWildlifeHunt({
    command: command(1, SURVIVAL_COMMANDS.hunt, creature.instanceId),
    creature,
  });
  assert.equal(hunted.ok, true);
  assert.equal(hunted.state.creature.hunted, true);
  assert.equal(hunted.state.creature.hp, 18);
  assert.equal(creature.hunted, false, 'pure rule must not mutate the runtime actor');
  assert.deepEqual(hunted.events.map(({ type }) => type), ['wildlife-alerted']);

  const repeated = beginWildlifeHunt({
    command: command(2, SURVIVAL_COMMANDS.hunt, creature.instanceId),
    creature: hunted.state.creature,
  });
  assert.deepEqual(repeated.events, []);
  assert.equal(repeated.reason, 'already-hunted');
});

test('lethal hunting damage awards one stack of meat atomically', () => {
  const creature = { ...sheep(), hunted: true };
  const first = strikeWildlife({
    command: command(2, SURVIVAL_COMMANDS.strike, creature.instanceId),
    creature,
    damage: 100,
    items: [],
    inventory: [],
    meatUid: 'raw-meat-passive-1-0',
  });
  assert.equal(first.ok, true);
  assert.equal(first.state.creature.defeated, true);
  assert.deepEqual(first.state.items, [{ id: RAW_MEAT_ITEM_ID, uid: 'raw-meat-passive-1-0', stack: 2 }]);
  assert.equal(first.events.at(-1).payload.stored, true);

  const repeated = strikeWildlife({
    command: command(3, SURVIVAL_COMMANDS.strike, creature.instanceId),
    creature: first.state.creature,
    damage: 100,
    items: first.state.items,
    inventory: first.state.inventory,
    meatUid: 'raw-meat-passive-1-0',
  });
  assert.equal(repeated.ok, false);
  assert.equal(repeated.reason, 'defeated');
  assert.deepEqual(repeated.events, []);
});

test('stack transactions never partially consume ingredients when output cannot fit', () => {
  const fullItems = Array.from({ length: 12 }, (_, index) => ({
    id: index === 0 ? RAW_MEAT_ITEM_ID : 'bread',
    uid: `item-${index}`,
    stack: index === 0 ? 2 : 1,
  }));
  const inventory = fullItems.map(({ uid }) => uid);
  const cooked = transactStackItems({
    items: fullItems,
    inventory,
    consume: { id: RAW_MEAT_ITEM_ID, amount: 2 },
    produce: { id: COOKED_MEAT_ITEM_ID, amount: 2, uid: 'cooked-output' },
  });
  assert.equal(cooked.ok, true, 'consuming the raw stack frees its own output slot');
  assert.equal(cooked.state.items.some(({ id }) => id === RAW_MEAT_ITEM_ID), false);
  assert.equal(cooked.state.items.find(({ id }) => id === COOKED_MEAT_ITEM_ID).stack, 2);

  const missing = transactStackItems({
    items: fullItems,
    inventory,
    consume: { id: RAW_MEAT_ITEM_ID, amount: 3 },
    produce: { id: COOKED_MEAT_ITEM_ID, amount: 3, uid: 'never-created' },
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'missing-input');
  assert.equal(fullItems[0].stack, 2, 'failure leaves caller state untouched');
});

test('campfire command cooks the whole requested stack and exposes concise RU/EN UI', () => {
  const input = [{ id: RAW_MEAT_ITEM_ID, uid: 'raw', stack: 3 }];
  const result = cookMeat({
    command: command(4, SURVIVAL_COMMANDS.cook, 'environment-1-0-0', { amount: 3 }),
    siteId: 'environment-1-0-0',
    items: input,
    inventory: ['raw'],
    amount: 3,
    outputUid: 'cooked',
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.state.items, [{ id: COOKED_MEAT_ITEM_ID, uid: 'cooked', stack: 3 }]);
  assert.equal(result.events[0].type, 'meat-cooked');

  const empty = contextActionModel({ target: { kind: 'campfire', rawMeatCount: 0 }, language: 'ru' });
  const ready = contextActionModel({ target: { kind: 'campfire', rawMeatCount: 3 }, language: 'en' });
  assert.equal(empty.name, 'Костёр');
  assert.equal(empty.actions[0].enabled, false);
  assert.equal(ready.name, 'Campfire');
  assert.equal(ready.actions[0].label, 'Cook');
  const animal = contextActionModel({
    target: { kind: 'wildlife', id: 'hog', icon: 'mon/animals/hog.png' },
    language: 'ru',
  });
  assert.equal(animal.name, 'Кабан');
  assert.equal(animal.actions[0].label, 'Охотиться');
});

test('each floor guarantees one real cooking prop without touching dungeon geometry', () => {
  for (let seed = 1; seed <= 120; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 1 });
    const before = dungeon.grid.map((row) => [...row]);
    const environment = createDungeonEnvironment(dungeon);
    const sites = environment.props.filter(({ interactionId }) => interactionId === 'campfire');
    assert.ok(sites.length >= 1);
    assert.equal(sites.every(({ id }) => id.startsWith('environment-1-')), true);
    assert.deepEqual(dungeon.grid, before);
  }
});

test('wildlife danger uses floor scaling and old wildlife safely rebases with the floor', () => {
  const shallow = generateDungeon({ seed: 818, depth: 1 });
  const deep = generateDungeon({ seed: 818, depth: 3 });
  const shallowState = createPassiveCreatureStates(shallow)[0];
  const deepState = createPassiveCreatureStates(deep)[0];
  assert.ok(deepState.maxHp > shallowState.maxHp);

  const run = createRun(818, shallow);
  run.commandSequence = 9;
  run.floor.passives = [{
    instanceId: shallowState.instanceId,
    x: shallowState.x / 64 - 0.5,
    y: shallowState.y / 64 - 0.5,
    wanderStep: 4,
    facing: 1,
    hunted: true,
    defeated: false,
    hp: Math.max(1, shallowState.maxHp - 2),
    attackSequence: 3,
  }];
  assert.equal(validateRun(run), true);

  const legacy = structuredClone(run);
  legacy.version = 24;
  legacy.contentVersion = 11;
  delete legacy.commandSequence;
  legacy.floor.passives = legacy.floor.passives.map(({
    hunted: _hunted, defeated: _defeated, hp: _hp, attackSequence: _attacks, ...state
  }) => state);
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.commandSequence, 0);
  assert.deepEqual(migrated.floor.passives, []);
  assert.equal(validateRun(migrated), true);
});

test('meat uses existing local sprites, concise generated descriptions and runtime commands', async () => {
  const raw = lootById(RAW_MEAT_ITEM_ID);
  const cooked = lootById(COOKED_MEAT_ITEM_ID);
  assert.equal(raw.randomDrop, false);
  assert.equal(cooked.useEffect.type, 'food');
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /beginWildlifeHunt/);
  assert.match(runtime, /strikeWildlife/);
  assert.match(runtime, /cookAtCampfire/);
  assert.match(runtime, /previewHuntNearSpawn/);
});
