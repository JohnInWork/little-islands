import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import { EVENT_CATALOG, MONSTER_CATALOG } from '../tools/dcss-rpg-content.js';
import {
  ACTOR_EFFECTS,
  ACTOR_EFFECT_IDS,
  activeActorEffects,
  actorEffectModifiers,
  applyActorEffect,
  clearActorEffects,
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

/**
 * Cauterise burns the cold and the poison out of a hero and leaves the fire it
 * is made of alone, so it needs to clear a named subset. The adapter tried to
 * do that with `applyActorEffect(effects, id, 0)` — which throws, because a
 * duration of zero is out of bounds on purpose: applying an effect for no time
 * at all is a typo, never an intention. Clearing belongs here.
 */
test('effects can be cleared by name, and clearing everything stays the default', () => {
  const chilled = createActorEffects({ burning: 3, chilled: 5, poison: 4, wet: 2 });
  const partial = clearActorEffects(chilled, ['chilled', 'poison', 'wet']);
  assert.deepEqual(partial.effects, { burning: 3, wet: 0, chilled: 0, frozen: 0, poison: 0 });
  assert.deepEqual([...partial.cleared].sort(), ['chilled', 'poison', 'wet']);

  const everything = clearActorEffects(chilled);
  assert.deepEqual(everything.effects, createActorEffects());
  assert.deepEqual([...everything.cleared].sort(), ['burning', 'chilled', 'poison', 'wet']);

  // Only what was actually burning is reported as cleared.
  assert.deepEqual(clearActorEffects(createActorEffects(), ['poison']).cleared, []);
  assert.throws(() => clearActorEffects(chilled, ['sleepy']), /Unknown actor effect/);
  assert.throws(() => applyActorEffect(createActorEffects(), 'poison', 0), /out of bounds/);
});

/**
 * And the shape of the answer: `clearActorEffects` returns the report, not the
 * effects. Assigning the report straight onto an actor leaves them carrying an
 * object no validator accepts — which is exactly what `cleanse-ally` did.
 */
test('nobody mistakes the clearing report for the effects it describes', async () => {
  const directory = new URL('../tools/', import.meta.url);
  const wrong = [];
  for (const file of (await readdir(directory)).filter((name) => name.endsWith('.js'))) {
    const source = await readFile(new URL(file, directory), 'utf8');
    for (const [line] of source.matchAll(/^.*clearActorEffects\([^;]*;.*$/gm)) {
      if (/effects\s*=\s*clearActorEffects\([^;]*\)\s*;/.test(line)) {
        wrong.push(`tools/${file}: ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(wrong, [], `\n${wrong.join('\n')}\n`);
});
