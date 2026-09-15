import assert from 'node:assert/strict';
import test from 'node:test';

import { EVENT_CATALOG, MONSTER_CATALOG } from '../tools/dcss-rpg-content.js';
import {
  ACTOR_EFFECTS,
  ACTOR_EFFECT_IDS,
  activeActorEffects,
  actorEffectModifiers,
  applyActorEffect,
  createActorEffects,
  monsterInfliction,
  tickActorEffects,
  validateActorEffects,
} from '../tools/dcss-rpg-effects.js';

test('actor effects have a complete pixel presentation in both languages', () => {
  assert.deepEqual(ACTOR_EFFECT_IDS, ['burning', 'wet', 'chilled', 'frozen', 'poison']);
  const all = Object.fromEntries(ACTOR_EFFECT_IDS.map((id) => [id, 5]));
  for (const language of ['ru', 'en']) {
    const presentation = activeActorEffects(all, language);
    assert.equal(presentation.length, ACTOR_EFFECT_IDS.length);
    assert.ok(
      presentation.every(
        ({ icon, color, label }) =>
          icon.endsWith('.png') && /^#[0-9a-f]{6}$/i.test(color) && label.length >= 3,
      ),
    );
  }
  assert.ok(Object.values(ACTOR_EFFECTS).every(({ damagePerPulse }) => damagePerPulse >= 0));
});

test('wetness and fire react atomically instead of coexisting', () => {
  let state = applyActorEffect(createActorEffects(), 'burning', 8).effects;
  const extinguished = applyActorEffect(state, 'wet', 9);
  assert.equal(extinguished.reaction, 'steam');
  assert.deepEqual(extinguished.cleared, ['burning']);
  assert.equal(extinguished.effects.burning, 0);
  assert.equal(extinguished.effects.wet, 9);

  state = applyActorEffect(createActorEffects(), 'wet', 9).effects;
  const dried = applyActorEffect(state, 'burning', 5);
  assert.equal(dried.reaction, 'steam');
  assert.equal(dried.applied, null);
  assert.equal(dried.effects.wet, 0);
  assert.equal(dried.effects.burning, 0);
});

test('wet cold lasts longer and produces a stronger bounded movement penalty', () => {
  const dryCold = applyActorEffect(createActorEffects(), 'chilled', 4).effects;
  const wet = applyActorEffect(createActorEffects(), 'wet', 8).effects;
  const wetCold = applyActorEffect(wet, 'chilled', 4).effects;
  assert.equal(dryCold.chilled, 4);
  assert.equal(wetCold.chilled, 6);
  assert.ok(actorEffectModifiers(wetCold).moveSpeed < actorEffectModifiers(dryCold).moveSpeed);
  assert.ok(actorEffectModifiers(wetCold).moveSpeed >= 0.5);
  assert.ok(
    actorEffectModifiers(dryCold, { cryomancyRank: 1 }).moveSpeed
      < actorEffectModifiers(dryCold).moveSpeed,
  );
  assert.equal(actorEffectModifiers(createActorEffects({ frozen: 1 })).moveSpeed, 0);
});

test('damage pulses and expiry are deterministic across frame sizes', () => {
  const initial = createActorEffects({ burning: 2, poison: 2 });
  const simulate = (step, count) => {
    let effects = initial;
    let damage = 0;
    for (let index = 0; index < count; index += 1) {
      const tick = tickActorEffects(effects, step);
      effects = tick.effects;
      damage += tick.damage;
    }
    return { effects, damage };
  };
  assert.deepEqual(simulate(0.25, 8), simulate(0.5, 4));
  assert.equal(simulate(0.25, 8).damage, 6);
  assert.deepEqual(simulate(0.25, 8).effects, createActorEffects());
  assert.throws(() => tickActorEffects(initial, 1.01), /delta/);
});

test('effect state validation rejects missing, unknown and unbounded values', () => {
  assert.equal(validateActorEffects(createActorEffects()), true);
  assert.equal(validateActorEffects({ burning: 1 }), false);
  assert.equal(validateActorEffects({ ...createActorEffects(), surprise: 2 }), false);
  assert.equal(validateActorEffects({ ...createActorEffects(), wet: Infinity }), false);
  assert.equal(validateActorEffects({ ...createActorEffects(), poison: 61 }), false);
});

test('elemental monsters and environmental events use the shared effect contract', () => {
  const inflicting = MONSTER_CATALOG.filter(({ inflicts }) => inflicts);
  assert.ok(inflicting.some(({ inflicts }) => inflicts.id === 'burning'));
  assert.ok(inflicting.some(({ inflicts }) => inflicts.id === 'chilled'));
  assert.ok(inflicting.some(({ inflicts }) => inflicts.id === 'poison'));
  assert.ok(inflicting.every((monster) => monsterInfliction(monster)));
  assert.equal(monsterInfliction(MONSTER_CATALOG.find(({ id }) => id === 'goblin')), null);
  assert.ok(EVENT_CATALOG.some(({ status }) => status?.id === 'wet'));
  assert.ok(EVENT_CATALOG.some(({ status }) => status?.id === 'burning'));
});
