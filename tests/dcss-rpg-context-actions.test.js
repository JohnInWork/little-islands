import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INTERACTION_REGISTRY,
  contextActionModel,
  interactionDefinitionFor,
} from '../tools/dcss-rpg-context-actions.js';

test('one bilingual context model exposes object-specific actions', () => {
  const closedDoor = contextActionModel({ target: { kind: 'door', open: false }, language: 'ru' });
  assert.equal(closedDoor.name, 'Каменная дверь');
  assert.equal(closedDoor.description, 'Закрыта.');
  assert.equal(closedDoor.triggerLabel, 'Взаимодействовать: Каменная дверь');
  assert.deepEqual(closedDoor.actions.map(({ id }) => id), ['inspect', 'open']);

  const openDoor = contextActionModel({ target: { kind: 'door', open: true }, language: 'en' });
  assert.equal(openDoor.name, 'Stone door');
  assert.equal(openDoor.description, 'Open.');
  assert.equal(openDoor.triggerLabel, 'Interact: Stone door');
  assert.deepEqual(openDoor.actions.map(({ id }) => id), ['inspect', 'close']);

  const crystal = contextActionModel({
    target: { kind: 'find', id: 'crystal-vein', rewardGold: 7, rewardPower: 1, riskDamage: 0 },
    language: 'ru',
  });
  assert.deepEqual(crystal.actions.map(({ id }) => id), ['inspect', 'extract']);

  const grave = contextActionModel({
    target: { kind: 'find', id: 'forgotten-grave', rewardGold: 12, rewardPower: 0, riskDamage: 9 },
    language: 'en',
  });
  assert.deepEqual(grave.actions.map(({ id }) => id), ['inspect', 'defile']);
});

test('inspection reveals a hidden chest mechanism through the shared registry', () => {
  const target = {
    kind: 'find', id: 'sealed-cache', rewardGold: 9, rewardPower: 0, riskDamage: 0,
    cacheVariant: 'trapped', lockTier: 0, trapTier: 2, hazardDamage: 11,
    curseEffectId: null, curseDuration: 0,
  };
  const actor = { capabilities: { trapDisarmTier: 2 } };
  const hidden = contextActionModel({ target, actor, language: 'ru' });
  const inspected = contextActionModel({ target, actor, language: 'ru', inspected: true });
  assert.equal(hidden.description, '');
  assert.equal(inspected.description, 'Механизм II.');
  assert.doesNotMatch(inspected.description, /9◆|11|награ|урон/i);
  assert.deepEqual(hidden.actions.map(({ id }) => id), ['inspect', 'open', 'smash']);
  assert.deepEqual(inspected.actions.map(({ id }) => id), ['inspect', 'open', 'disarm', 'smash']);
  assert.ok(inspected.actions.every(({ command }) => command === 'inspect' || command === 'find-interact'));
  assert.ok(Object.isFrozen(inspected));
  assert.ok(inspected.actions.every(Object.isFrozen));
});

test('interaction registry owns target matching and stable command families', () => {
  assert.deepEqual(INTERACTION_REGISTRY.map(({ id }) => id), [
    'campfire', 'camp-rest', 'camp-stash', 'guard', 'wildlife', 'merchant', 'door', 'trap', 'chest',
    'crystal-vein', 'buried-stash', 'forgotten-grave', 'landmark',
  ]);
  assert.equal(new Set(INTERACTION_REGISTRY.map(({ id }) => id)).size, INTERACTION_REGISTRY.length);
  assert.equal(interactionDefinitionFor({ kind: 'door', open: false }).command, 'door-transition');
  assert.equal(interactionDefinitionFor({ kind: 'find', id: 'sealed-cache' }).command, 'find-interact');
  assert.equal(interactionDefinitionFor({ kind: 'merchant', variantId: 'armourer' }).command, 'trade');
});

test('world-object descriptions identify visible state without predicting outcomes', () => {
  const models = [
    contextActionModel({
      target: { kind: 'find', id: 'crystal-vein', rewardGold: 7, rewardPower: 1, riskDamage: 0 },
      language: 'ru',
      inspected: true,
    }),
    contextActionModel({
      target: { kind: 'find', id: 'forgotten-grave', rewardGold: 12, rewardPower: 0, riskDamage: 9 },
      language: 'ru',
      inspected: true,
    }),
    contextActionModel({ target: { kind: 'door', open: false }, language: 'en' }),
  ];

  assert.equal(models[1].name, 'Древняя гробница');
  for (const model of models) {
    assert.doesNotMatch(model.description, /reward|treasure|danger|награ|ценност|получ|\d+◆|−\d+/i);
  }
});

test('trap action states skill requirement without allowing an invalid command', () => {
  const locked = contextActionModel({
    target: {
      kind: 'trap', tier: 2, canDisarm: false, unavailable: 'Нужен навык «Сапёр» II',
    },
    language: 'ru',
    inspected: true,
  });
  assert.match(locked.description, /Сапёр/);
  assert.equal(locked.actions.find(({ id }) => id === 'disarm').enabled, false);
  const ready = contextActionModel({
    target: { kind: 'trap', tier: 2, canDisarm: true, unavailable: '' },
    language: 'en',
    inspected: true,
  });
  assert.equal(ready.actions.find(({ id }) => id === 'disarm').enabled, true);
  assert.match(ready.description, /can be disarmed/i);
});

test('malformed targets never reach the runtime action tray', () => {
  assert.throws(() => contextActionModel(), TypeError);
  assert.throws(() => contextActionModel({ target: { kind: 'door', open: 'yes' } }), TypeError);
  assert.throws(() => contextActionModel({
    target: { kind: 'find', id: 'unknown', rewardGold: 1, rewardPower: 0, riskDamage: 0 },
  }), TypeError);
});
