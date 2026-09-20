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
  assert.deepEqual(closedDoor.actions.map(({ id }) => id), ['open']);

  const openDoor = contextActionModel({ target: { kind: 'door', open: true }, language: 'en' });
  assert.equal(openDoor.name, 'Stone door');
  assert.equal(openDoor.description, 'Open.');
  assert.equal(openDoor.triggerLabel, 'Interact: Stone door');
  assert.deepEqual(openDoor.actions.map(({ id }) => id), ['close']);

  const crystal = contextActionModel({
    target: { kind: 'find', id: 'crystal-vein', rewardGold: 7, rewardPower: 1, riskDamage: 0 },
    language: 'ru',
  });
  assert.deepEqual(crystal.actions.map(({ id }) => id), ['extract']);

  const grave = contextActionModel({
    target: { kind: 'find', id: 'forgotten-grave', rewardGold: 12, rewardPower: 0, riskDamage: 9 },
    language: 'en',
  });
  assert.deepEqual(grave.actions.map(({ id }) => id), ['defile']);
});

test('ящик открывают одним действием, и оно ничего не выдаёт', () => {
  const target = {
    kind: 'find', id: 'sealed-cache', rewardGold: 9, rewardPower: 0, riskDamage: 0,
    cacheVariant: 'trapped', lockTier: 0, trapTier: 2, hazardDamage: 11,
    curseEffectId: null, curseDuration: 0,
  };
  const умелый = contextActionModel({ target, actor: { capabilities: { trapDisarmTier: 2 } }, language: 'ru' });
  const простак = contextActionModel({ target, actor: {}, language: 'ru' });
  // Ни имя, ни список действий не отличают ящик с ловушкой от обычного — и у
  // того, кто умеет её снять, тоже: умение работает молча, при открывании.
  assert.deepEqual(умелый.actions.map(({ id }) => id), ['open']);
  assert.deepEqual(простак.actions.map(({ id }) => id), ['open']);
  assert.equal(умелый.name, простак.name);
  assert.doesNotMatch(умелый.description, /9◆|11|награ|урон/i);
  assert.ok(умелый.actions.every(({ command }) => command === 'find-interact'));
  assert.ok(Object.isFrozen(умелый));
  assert.ok(умелый.actions.every(Object.isFrozen));
});

test('окно нужно только там, где есть выбор', () => {
  // Дверь, лавка, жила, тайник — одно действие: касание его и выполняет.
  const дверь = contextActionModel({ target: { kind: 'door', open: false }, language: 'ru' });
  assert.equal(дверь.actions.length, 1);
  assert.equal(дверь.confirm, false);

  // Стражник — исключение по слову Ивана: удар нельзя нанести одним касанием.
  const стражник = contextActionModel({
    target: { kind: 'guard', id: 'city-guard', icon: 'mon/guard.png', fine: 0, canPay: false, hint: '' },
    language: 'ru',
  });
  assert.equal(стражник.confirm, true);
});

test('interaction registry owns target matching and stable command families', () => {
  assert.deepEqual(INTERACTION_REGISTRY.map(({ id }) => id), [
    'campfire', 'camp-rest', 'camp-stash', 'house-deed', 'house-slot', 'house-rest', 'sanctuary',
    'guard',
    'city-gate', 'road-end', 'priest', 'recruiter', 'tavern-hire', 'jail-door', 'companion', 'wildlife', 'merchant', 'portal', 'branch-gate', 'chasm', 'door', 'trap', 'chest',
    'crystal-vein', 'buried-stash', 'forgotten-grave', 'landmark',
  ]);
  assert.equal(new Set(INTERACTION_REGISTRY.map(({ id }) => id)).size, INTERACTION_REGISTRY.length);
  assert.equal(interactionDefinitionFor({ kind: 'door', open: false }).command, 'door-transition');
  assert.equal(interactionDefinitionFor({ kind: 'find', id: 'sealed-cache' }).command, 'find-interact');
  assert.equal(interactionDefinitionFor({ kind: 'merchant', variantId: 'armourer' }).command, 'trade');
  assert.equal(interactionDefinitionFor({ kind: 'jail-door', fine: 60 }).command, 'jail-door');
  assert.equal(interactionDefinitionFor({ kind: 'city-gate', branch: 'deep' }).command, 'city-gate');
  assert.equal(interactionDefinitionFor({ kind: 'road-end' }).command, 'road-end');
  assert.equal(interactionDefinitionFor({ kind: 'priest' }).command, 'priest');
  assert.equal(interactionDefinitionFor({ kind: 'recruiter', menu: [] }).command, 'recruiter');
  assert.equal(interactionDefinitionFor({ kind: 'companion', id: 'hog', icon: 'x.png' }).command, 'companion-care');
  // One object with two mouths: the same card either side, and one verb.
  for (const end of ['city', 'dungeon']) {
    assert.equal(interactionDefinitionFor({ kind: 'portal', end }).command, 'portal-step');
    const model = contextActionModel({ target: { kind: 'portal', end, depth: 7 } });
    assert.deepEqual(model.actions.map(({ id }) => id), ['enterPortal']);
    assert.equal(model.actions[0].label, 'Войти');
  }
  assert.equal(interactionDefinitionFor({ kind: 'portal', end: 'nowhere' }), null);
  // Each side says where it comes out, and only the dungeon side warns.
  const back = contextActionModel({ target: { kind: 'portal', end: 'city', depth: 12 } });
  assert.match(back.description, /12-й этаж/);
  assert.equal(contextActionModel({ target: { kind: 'portal', end: 'dungeon' } }).description.includes('закроется'), true);
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

test('every creature that can stand beside the hero has a name, not an id', async () => {
  const [{ PASSIVE_CREATURE_CATALOG }, { MERCENARIES }] = await Promise.all([
    import('../tools/dcss-rpg-passive.js'),
    import('../tools/dcss-rpg-mercenaries.js'),
  ]);
  const ids = [
    ...PASSIVE_CREATURE_CATALOG.map(({ id }) => id),
    ...MERCENARIES.map(({ id }) => id),
  ];
  assert.ok(ids.length >= 11);
  for (const id of ids) {
    for (const [kind, extra] of [['wildlife', {}], ['companion', {}]]) {
      const model = contextActionModel({
        target: { kind, id, icon: 'mon/animals/sheep.png', ...extra },
        language: 'ru',
      });
      // Falling back to the id is how «cave-toad» got printed on the card in
      // Russian: the table quietly did not cover the animals that were added
      // to the dungeon later.
      assert.notEqual(model.name, id, `${kind}/${id} is shown to the player by its id`);
      assert.ok(/[А-Яа-я]/.test(model.name), `${kind}/${id}: «${model.name}» is not Russian`);
      const english = contextActionModel({ target: { kind, id, icon: 'mon/animals/sheep.png' }, language: 'en' });
      assert.notEqual(english.name, id, `${kind}/${id} has no English name`);
      assert.notEqual(english.name, model.name, `${kind}/${id} was never translated`);
    }
  }
});
