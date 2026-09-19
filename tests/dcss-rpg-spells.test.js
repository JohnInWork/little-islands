import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

import {
  ICE_ARMOUR_SOAK,
  SPELL_CATALOG,
  SPELL_SLOT_COUNT,
  SUSTAINED_MAGIC_FLAGS,
  createSpellState,
  knownSpellModel,
  learnSpell,
  prepareSpell,
  pyromancySpreadProfile,
  spellBarModel,
  spellDamage,
  spellHealing,
  spellMagic,
  spellSelfCost,
  spellStatus,
  spellUseAvailability,
  shareLifeAmount,
  toggleSustainedSpell,
  validateSpellState,
} from '../tools/dcss-rpg-spells.js';
import { createStartingMagic } from '../tools/dcss-rpg-build-presets.js';
import { LOOT_CATALOG } from '../tools/dcss-rpg-content.js';

test('spell state owns exactly three unique prepared slots and validates strictly', () => {
  const outcast = createStartingMagic();
  assert.equal(SPELL_SLOT_COUNT, 3);
  assert.equal(outcast.intelligence, 3, 'a new run starts below the healing threshold');
  assert.deepEqual(outcast.spells.knownSpellIds, []);
  assert.deepEqual(outcast.spells.preparedSpellIds, [null, null, null]);
  assert.equal(validateSpellState(outcast.spells), true);
  const starting = createStartingMagic('wanderer');
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
  const off = Object.fromEntries(SUSTAINED_MAGIC_FLAGS.map((flag) => [flag, false]));
  assert.deepEqual(spellMagic(flight.state, 7), { ...off, flight: true });
  const hidden = toggleSustainedSpell(flight.state, 'invisibility', 7);
  assert.deepEqual(spellMagic(hidden.state, 7), { ...off, flight: true, invisibility: true });
  const cleared = prepareSpell(hidden.state, 0, null);
  assert.deepEqual(cleared.state.activeSustainedSpellIds, ['invisibility']);
  assert.deepEqual(spellMagic(cleared.state, 7), { ...off, invisibility: true });
  assert.deepEqual(spellMagic(hidden.state, Number.NaN), off);
});

/**
 * The fold used to name flight and invisibility by hand, so a sustained spell
 * added afterwards granted nothing and said nothing about it. Every flag any
 * spell promises has to be a flag the fold knows.
 */
test('no sustained spell promises a power the fold would drop', () => {
  const promised = new Set(
    SPELL_CATALOG.filter(({ kind }) => kind === 'sustained')
      .flatMap((spell) => Object.keys(spell.magic ?? {})),
  );
  assert.ok(promised.size >= 5, 'the sustained spells promise something');
  for (const flag of promised) {
    assert.ok(SUSTAINED_MAGIC_FLAGS.includes(flag), `${flag} is granted but never folded`);
  }
  // And every sustained spell actually grants something.
  for (const spell of SPELL_CATALOG.filter(({ kind }) => kind === 'sustained')) {
    assert.ok(Object.keys(spell.magic ?? {}).length > 0, `${spell.id} toggles nothing`);
    const state = createSpellState({
      knownSpellIds: [spell.id],
      preparedSpellIds: [spell.id, null, null],
    });
    const on = toggleSustainedSpell(state, spell.id, spell.minimumIntelligence);
    assert.equal(on.ok, true, `${spell.id} cannot be switched on`);
    for (const flag of Object.keys(spell.magic)) {
      assert.equal(spellMagic(on.state, spell.minimumIntelligence)[flag], true, `${spell.id}: ${flag}`);
    }
  }
});

test('manual cast availability handles targets, healing, cooldown and intelligence', () => {
  const state = createStartingMagic('wanderer').spells;
  assert.equal(spellUseAvailability({ state: createStartingMagic().spells, slotIndex: 0, intelligence: 4, hasTarget: true }).reason, 'empty-slot');
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
  const empty = spellBarModel({ state: createStartingMagic().spells, intelligence: 3, language: 'ru' });
  assert.ok(empty.slots.every((slot) => slot.empty), 'a new run prepares nothing');
  const magic = createStartingMagic('wanderer');
  const bar = spellBarModel({ state: magic.spells, intelligence: magic.intelligence, language: 'ru' });
  assert.equal(bar.slots.length, 3);
  assert.equal(bar.slots[0].name, 'Огненная стрела');
  assert.equal(bar.slots[2].empty, true);
  assert.equal(spellBarModel({ state: magic.spells }).slots[0].intelligenceLocked, true);
  const known = knownSpellModel(magic.spells, magic.intelligence, 'en');
  assert.deepEqual(known.map(({ name }) => name), ['Ember Bolt', 'Mending Light']);
  assert.ok(known.every(({ preparedSlot }) => preparedSlot >= 0));
});

/**
 * Thirteen spells added in one sitting is thirteen chances to forget the book,
 * the icon, the English name or the branch that does the work. These four tests
 * guard the classes rather than the instances: a fourteenth spell that forgets
 * any of it fails here without anyone remembering to write a test for it.
 */
test('no school is too thin to build a hero out of, and no spell is a dead end', () => {
  const schools = new Map();
  for (const spell of SPELL_CATALOG) {
    schools.set(spell.schoolId, (schools.get(spell.schoolId) ?? 0) + 1);
  }
  assert.equal(schools.size, 6, 'six schools');
  for (const [schoolId, count] of schools) {
    assert.ok(count >= 4, `${schoolId} carries only ${count} spells — nothing to specialise into`);
  }

  const taught = LOOT_CATALOG.filter((item) => item.bookEffect?.type === 'learn-spell');
  const spellIds = taught.map((book) => book.bookEffect.spellId);
  assert.deepEqual(
    [...spellIds].sort(),
    SPELL_CATALOG.map(({ id }) => id).sort(),
    'every spell is taught by exactly one book, and no book teaches a spell that is not there',
  );

  const preview = new URL('../public/assets/dcss-preview/', import.meta.url);
  for (const spell of SPELL_CATALOG) {
    assert.ok(existsSync(new URL(spell.icon, preview)), `${spell.id}: icon ${spell.icon} does not ship`);
    for (const field of ['name', 'description']) {
      assert.ok(spell[field].ru?.length > 3, `${spell.id}: no Russian ${field}`);
      assert.ok(spell[field].en?.length > 3, `${spell.id}: no English ${field}`);
      assert.notEqual(spell[field].ru, spell[field].en, `${spell.id}: ${field} was never translated`);
    }
  }
});

/**
 * A spell whose kind no branch matches costs its cooldown, plays its sound and
 * does nothing at all — the quietest bug this game can have, because the only
 * witness is a player who thinks the spell is weak.
 */
test('every spell kind the catalogue names is a branch the runtime actually has', () => {
  const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  for (const kind of new Set(SPELL_CATALOG.map(({ kind }) => kind))) {
    assert.ok(runtime.includes(`'${kind}'`), `no branch in dcss.js handles a '${kind}' spell`);
  }
});

test('the two spells paid for in blood take less as their school grows', () => {
  assert.equal(spellSelfCost('ember-bolt'), 0, 'an ordinary spell costs no health');
  for (const id of ['cauterise', 'share-life']) {
    assert.ok(spellSelfCost(id, 0) > spellSelfCost(id, 3), `${id} never gets cheaper`);
    assert.ok(spellSelfCost(id, 99) >= 2, `${id} can be cast for free`);
  }
  // Necromancy is a trade, and a trade nobody would take is not a spell.
  assert.ok(
    shareLifeAmount('share-life', 6, 0) > spellSelfCost('share-life', 0),
    'share-life gives the servants less than it takes off the hero',
  );
  assert.ok(shareLifeAmount('share-life', 9, 1) > shareLifeAmount('share-life', 6, 1));
  assert.ok(shareLifeAmount('share-life', 6, 3) > shareLifeAmount('share-life', 6, 0));
  assert.equal(shareLifeAmount('mending-light', 6, 0), 0, 'only the trade moves health across');
  assert.equal(shareLifeAmount('share-life', Number.NaN), 0);
});

/**
 * Both defensive sustains are promises about a blow that has already landed, so
 * they are worth nothing unless `damageHero` itself reads them.
 */
test('the ward and the ice armour reach the blow instead of only the HUD', () => {
  const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const damageHero = runtime.slice(runtime.indexOf('function damageHero('));
  const body = damageHero.slice(0, damageHero.indexOf('\nfunction '));
  assert.match(body, /magic\.warded/, 'the ward never sees the blow');
  assert.match(body, /ICE_ARMOUR_SOAK/, 'the ice armour never softens anything');
  assert.match(body, /toggleSustainedSpell/, 'the ward blocks and stays up forever');
  assert.ok(ICE_ARMOUR_SOAK > 0 && ICE_ARMOUR_SOAK < 1, 'a share of the blow, not all of it');
});
