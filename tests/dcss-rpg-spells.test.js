import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  SPELL_CATALOG,
  SPELL_SLOT_COUNT,
  createSpellState,
  knownSpellModel,
  learnSpell,
  prepareSpell,
  pyromancySpreadProfile,
  spellBarModel,
  spellDamage,
  spellHealing,
  spellMagic,
  spellStatus,
  spellUseAvailability,
  toggleSustainedSpell,
  validateSpellState,
} from '../tools/dcss-rpg-spells.js';
import { createStartingMagic } from '../tools/dcss-rpg-build-presets.js';

test('spell state owns exactly three unique prepared slots and validates strictly', () => {
  const starting = createStartingMagic();
  assert.equal(SPELL_SLOT_COUNT, 3);
  assert.equal(starting.intelligence, 4);
  assert.deepEqual(starting.spells.preparedSpellIds, ['ember-bolt', 'mending-light', null]);
  assert.equal(validateSpellState(starting.spells), true);
  assert.equal(validateSpellState({ ...starting.spells, preparedSpellIds: ['ember-bolt'] }), false);
  assert.equal(validateSpellState({
    ...starting.spells,
    preparedSpellIds: ['ember-bolt', 'ember-bolt', null],
  }), false);
  assert.throws(() => createSpellState({ knownSpellIds: ['foreign-spell'] }));
});

test('books can teach a gated spell and preparing moves it between slots', () => {
  const state = createSpellState();
  const blocked = learnSpell(state, 'flight', 5);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'intelligence-required');
  assert.equal(blocked.requiredIntelligence, 6);

  const learned = learnSpell(state, 'flight', 6);
  assert.equal(learned.ok, true);
  const first = prepareSpell(learned.state, 0, 'flight');
  const moved = prepareSpell(first.state, 2, 'flight');
  assert.deepEqual(moved.state.preparedSpellIds, [null, null, 'flight']);
  assert.equal(prepareSpell(moved.state, 3, 'flight').reason, 'invalid-slot');
});

test('flight and invisibility are binary sustained powers that occupy prepared slots', () => {
  const state = createSpellState({
    knownSpellIds: ['flight', 'invisibility'],
    preparedSpellIds: ['flight', 'invisibility', null],
  });
  const flight = toggleSustainedSpell(state, 'flight', 7);
  assert.equal(flight.ok, true);
  assert.deepEqual(spellMagic(flight.state, 7), { flight: true, invisibility: false });
  const hidden = toggleSustainedSpell(flight.state, 'invisibility', 7);
  assert.deepEqual(spellMagic(hidden.state, 7), { flight: true, invisibility: true });
  const cleared = prepareSpell(hidden.state, 0, null);
  assert.deepEqual(cleared.state.activeSustainedSpellIds, ['invisibility']);
  assert.deepEqual(spellMagic(cleared.state, 7), { flight: false, invisibility: true });
  assert.deepEqual(spellMagic(hidden.state, Number.NaN), { flight: false, invisibility: false });
});

test('manual cast availability handles targets, healing, cooldown and intelligence', () => {
  const state = createStartingMagic().spells;
  assert.equal(spellUseAvailability({ state, slotIndex: 0, intelligence: 4, hasTarget: false }).reason, 'no-target');
  assert.equal(spellUseAvailability({ state, slotIndex: 0, intelligence: 4, hasTarget: true }).ok, true);
  assert.equal(spellUseAvailability({ state, slotIndex: 0, intelligence: 4, cooldown: 1 }).reason, 'cooldown');
  assert.equal(spellUseAvailability({
    state, slotIndex: 1, intelligence: 4, heroHp: 100, heroMaxHp: 100,
  }).reason, 'full-health');
  assert.equal(spellUseAvailability({
    state, slotIndex: 1, intelligence: 3, heroHp: 50, heroMaxHp: 100,
  }).reason, 'intelligence-required');
});

test('spell power and pyromancy spread are bounded and monotonic', () => {
  assert.ok(spellDamage('ember-bolt', 8, 3) > spellDamage('ember-bolt', 4, 0));
  assert.ok(spellHealing('mending-light', 8, 0) > spellHealing('mending-light', 4, 0));
  assert.deepEqual(pyromancySpreadProfile(0), { rank: 0, targets: 0, ratio: 0, radius: 0 });
  assert.deepEqual(pyromancySpreadProfile(3), { rank: 3, targets: 3, ratio: 0.55, radius: 2 });
  assert.deepEqual(pyromancySpreadProfile(99), pyromancySpreadProfile(3));
});

test('frost lance uses explicit actor targeting and a bounded chilled duration', () => {
  const frost = SPELL_CATALOG.find(({ id }) => id === 'frost-lance');
  assert.equal(frost.targetMode, 'actor');
  assert.equal(frost.status.id, 'chilled');
  assert.ok(spellDamage('frost-lance', 8, 0) > spellDamage('frost-lance', 4, 0));
  assert.deepEqual(spellStatus('frost-lance', 4), { id: 'chilled', duration: 4 });
  assert.deepEqual(spellStatus('frost-lance', 99), { id: 'chilled', duration: 8 });
  assert.equal(spellStatus('ember-bolt', 9), null);
});

test('storm bolt is an intelligence-gated manually targeted projectile', () => {
  const storm = SPELL_CATALOG.find(({ id }) => id === 'storm-bolt');
  assert.equal(storm.schoolId, 'storm-magic');
  assert.equal(storm.targetMode, 'actor');
  assert.equal(storm.minimumIntelligence, 5);
  assert.ok(spellDamage('storm-bolt', 8, 3) > spellDamage('storm-bolt', 5, 0));
});

test('runtime wires Cryomancy ranks into frost damage, freeze, shatter and monster control', () => {
  const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /usedSpell\.schoolId === 'cryomancy'/);
  assert.match(runtime, /cryomancyHitProfile\(\{/);
  assert.match(runtime, /selectCryomancyShatterTargets\(\{/);
  assert.match(runtime, /cryomancyShatterDamage\(projectile\.damage, cryomancy\)/);
  assert.match(runtime, /monster\.effects\.frozen > 0/);
  assert.match(runtime, /actorEffectModifiers\(monster\.effects, \{\s*cryomancyRank,/);
});

test('the spell catalog and both UI models are bilingual and data driven', () => {
  assert.equal(new Set(SPELL_CATALOG.map(({ id }) => id)).size, SPELL_CATALOG.length);
  const magic = createStartingMagic();
  const bar = spellBarModel({ state: magic.spells, intelligence: magic.intelligence, language: 'ru' });
  assert.equal(bar.slots.length, 3);
  assert.equal(bar.slots[0].name, 'Огненная стрела');
  assert.equal(bar.slots[2].empty, true);
  assert.equal(spellBarModel({ state: magic.spells }).slots[0].intelligenceLocked, true);
  const known = knownSpellModel(magic.spells, magic.intelligence, 'en');
  assert.deepEqual(known.map(({ name }) => name), ['Ember Bolt', 'Mending Light']);
  assert.ok(known.every(({ preparedSlot }) => preparedSlot >= 0));
});
