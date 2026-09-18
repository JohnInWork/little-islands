import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CRIME_FINE,
  CRIME_WEIGHTS,
  JAIL_LOCK_TIER,
  MAX_WANTED,
  arrestHero,
  breakOut,
  canPickCell,
  createCrimeState,
  crimeFine,
  crimeRefusalText,
  isWanted,
  payFine,
  recordCrime,
  serveSentence,
  validateCrimeState,
  wantedLabel,
} from '../tools/dcss-rpg-crime.js';
import {
  SAVE_VERSION,
  advanceRunFloor,
  createRun,
  migrateLegacyRun,
  retreatRunFloor,
  validateRun,
} from '../tools/dcss-rpg-core.js';

test('a clean record is the default and every deed writes into it', () => {
  const clean = createCrimeState();
  assert.deepEqual(clean, { wanted: 0, jailed: false });
  assert.equal(isWanted(clean), false);
  assert.equal(crimeFine(clean), 0);
  assert.equal(wantedLabel(clean), '');

  const struck = recordCrime(clean, 'struck-guard');
  assert.equal(struck.ok, true);
  assert.equal(struck.crime.wanted, CRIME_WEIGHTS['struck-guard']);
  assert.equal(isWanted(struck.crime), true);
  assert.equal(crimeFine(struck.crime), CRIME_FINE[1]);

  const killed = recordCrime(struck.crime, 'killed-guard');
  assert.equal(killed.crime.wanted, MAX_WANTED, 'a strike plus a killing is the top of the ladder');
  assert.equal(wantedLabel(killed.crime), 'Враг города');

  const again = recordCrime(killed.crime, 'killed-guard');
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'already-hunted');
  assert.equal(again.crime.wanted, MAX_WANTED, 'the ceiling holds');
  assert.equal(recordCrime(clean, 'sneezed').ok, false, 'unknown deeds are not crimes');
});

test('the record only holds shapes the save will accept', () => {
  assert.equal(validateCrimeState(createCrimeState()), true);
  assert.equal(validateCrimeState({ wanted: 1, jailed: true }), true);
  assert.equal(validateCrimeState(null), false);
  assert.equal(validateCrimeState({ wanted: 1 }), false, 'both keys or nothing');
  assert.equal(validateCrimeState({ wanted: 1, jailed: true, bounty: 5 }), false);
  assert.equal(validateCrimeState({ wanted: MAX_WANTED + 1, jailed: false }), false);
  assert.equal(validateCrimeState({ wanted: 1.5, jailed: false }), false);
  assert.deepEqual(createCrimeState({ wanted: 99, jailed: 'yes' }), { wanted: MAX_WANTED, jailed: false });
});

test('the fine buys a clean record, and only gold that is actually there', () => {
  const crime = recordCrime(createCrimeState(), 'struck-guard').crime;
  const fine = crimeFine(crime);

  const poor = payFine({ crime, gold: fine - 1 });
  assert.equal(poor.ok, false);
  assert.equal(poor.reason, 'no-gold');
  assert.equal(poor.crime.wanted, crime.wanted, 'a refused payment changes nothing');
  assert.equal(crimeRefusalText('no-gold'), 'Не хватает золота на штраф');

  const paid = payFine({ crime, gold: fine + 40 });
  assert.equal(paid.ok, true);
  assert.equal(paid.gold, 40);
  assert.deepEqual(paid.crime, { wanted: 0, jailed: false });
  assert.equal(payFine({ crime: paid.crime, gold: 500 }).reason, 'not-wanted');
});

test('falling in the city is a cell, not a grave, and the cell has two doors out', () => {
  const crime = recordCrime(recordCrime(createCrimeState(), 'struck-guard').crime, 'killed-guard').crime;
  assert.equal(arrestHero({ crime: createCrimeState(), maxHp: 60 }).ok, false, 'the clean are not arrested');

  const arrest = arrestHero({ crime, maxHp: 60 });
  assert.equal(arrest.ok, true);
  assert.equal(arrest.hp, 21, 'the watch leaves the hero standing');
  assert.equal(arrest.crime.jailed, true);
  assert.equal(arrest.crime.wanted, crime.wanted, 'nothing is forgiven at the door of the cell');
  assert.equal(validateCrimeState(arrest.crime), true);

  // Serving it out always works, even for a hero with nothing in the purse.
  const broke = serveSentence({ crime: arrest.crime, gold: 12 });
  assert.equal(broke.ok, true);
  assert.equal(broke.fine, 12);
  assert.equal(broke.gold, 0);
  assert.deepEqual(broke.crime, { wanted: 0, jailed: false });

  const rich = serveSentence({ crime: arrest.crime, gold: crimeFine(arrest.crime) + 100 });
  assert.equal(rich.fine, crimeFine(arrest.crime), 'the city takes the fine and no more');
  assert.equal(serveSentence({ crime: createCrimeState(), gold: 10 }).reason, 'not-jailed');
});

test('picking the cell lock is a skill check and it costs the record', () => {
  const arrest = arrestHero({ crime: { wanted: 1, jailed: false }, maxHp: 40 });

  const clumsy = canPickCell({ crime: arrest.crime, lockpickTier: JAIL_LOCK_TIER - 1 });
  assert.equal(clumsy.ok, false);
  assert.equal(clumsy.reason, 'lock-too-good');
  assert.equal(breakOut({ crime: arrest.crime, lockpickTier: 0 }).crime.jailed, true, 'a failed try leaves the door shut');

  const out = breakOut({ crime: arrest.crime, lockpickTier: JAIL_LOCK_TIER });
  assert.equal(out.ok, true);
  assert.equal(out.crime.jailed, false);
  assert.equal(out.crime.wanted, 2, 'escaping is its own crime');
  assert.equal(breakOut({ crime: { wanted: 1, jailed: false }, lockpickTier: 3 }).reason, 'not-jailed');
});

test(`save v${SAVE_VERSION} carries the record down the stairs and back up`, () => {
  const run = createRun(7734);
  assert.deepEqual(run.crime, { wanted: 0, jailed: false });
  assert.equal(validateRun(run), true);

  run.crime = recordCrime(run.crime, 'struck-guard').crime;
  const deeper = advanceRunFloor(run);
  assert.equal(deeper.crime.wanted, 1, 'the street remembers a face through a staircase');
  const back = retreatRunFloor(deeper);
  assert.equal(back.crime.wanted, 1);
  assert.equal(validateRun(back), true);

  const broken = { ...run, crime: { wanted: 'many', jailed: false } };
  assert.equal(validateRun(broken), false, 'a damaged record is a damaged save');

  const legacy = createRun(11);
  legacy.version = 41;
  delete legacy.crime;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.deepEqual(migrated.crime, { wanted: 0, jailed: false }, 'old runs arrive innocent');
  assert.equal(validateRun(migrated), true);
});

test('the runtime answers to the record: hostile watch, closed shops, a cell instead of a grave', async () => {
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const uses = (needle, why) => assert.ok(source.includes(needle), why ?? needle);
  uses("from './dcss-rpg-crime.js'", 'the runtime uses the module, not its own arithmetic');
  uses('function noteCrime(');
  uses('isWanted(run.crime)', 'the wanted level steers the city');
  uses('arrestHero(', 'death in the city goes through the arrest');
  uses('function jailHero(');
  uses('function cityJailBlock(');
});
