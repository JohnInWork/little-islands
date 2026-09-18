import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  READ_BOOK_COMMAND,
  bookOutcome,
  createBookStudy,
  readSkillBook,
  readSpellBook,
  validateBookStudy,
} from '../tools/dcss-rpg-books.js';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import {
  SAVE_KEY,
  SAVE_VERSION,
  advanceRunFloor,
  createRun,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { createGameCommand } from '../tools/dcss-rpg-game-commands.js';
import {
  BOOK_APPEARANCES,
  IDENTIFICATION_APPEARANCES,
  identifiableItemIds,
  itemAppearanceFor,
  itemIdentificationView,
} from '../tools/dcss-rpg-identification.js';
import { itemPresentation } from '../tools/dcss-rpg-item-details.js';
import {
  createSkillState,
  deriveSkillCapabilities,
  effectiveSkillRank,
} from '../tools/dcss-rpg-skills.js';
import { createSpellState } from '../tools/dcss-rpg-spells.js';

const command = (sequence, uid) => createGameCommand({
  streamId: 'run:books:1',
  sequence,
  type: READ_BOOK_COMMAND,
  targetId: uid,
});

const owned = (id, uid = `${id}-1`) => ({ ...lootById(id), uid });

test('three data-driven books cover mastery, amnesia and deliberately blank reading', () => {
  assert.deepEqual(
    ['practice-manual', 'tome-of-amnesia', 'blank-codex'].map((id) => bookOutcome(lootById(id))),
    [{ type: 'study' }, { type: 'forget' }, { type: 'blank' }],
  );
  for (const id of ['practice-manual', 'tome-of-amnesia', 'blank-codex']) {
    const item = lootById(id);
    assert.equal(item.kind, 'book');
    assert.equal(item.identification.group, 'book');
    assert.match(itemPresentation(item, 'ru').description, /навык|Пустые страницы/);
    assert.match(itemPresentation(item, 'en').description, /skill|Blank pages/);
  }
});

test('book study is strict, sorted and independent from earned skill points', () => {
  const study = createBookStudy({ rankAdjustments: { swords: 1, axes: -1 } });
  assert.deepEqual(study.rankAdjustments, { axes: -1, swords: 1 });
  assert.equal(validateBookStudy(study), true);
  assert.equal(validateBookStudy({ version: 1, rankAdjustments: { foreign: 1 } }), false);
  assert.equal(validateBookStudy({ version: 1, rankAdjustments: { swords: 0 } }), false);
});

test('a practice manual deterministically boosts one implemented skill without spending points', () => {
  const item = owned('practice-manual');
  const skills = createSkillState(1);
  const before = structuredClone(skills);
  const first = readSkillBook({
    command: command(1, item.uid), item, study: createBookStudy(), skills, heroLevel: 1,
  });
  const repeated = readSkillBook({
    command: command(1, item.uid), item, study: createBookStudy(), skills, heroLevel: 1,
  });
  assert.equal(first.ok, true);
  assert.deepEqual(first, repeated);
  assert.deepEqual(skills, before);
  const changed = first.events.find(({ type }) => type === 'skill-rank-adjusted');
  assert.equal(changed.payload.direction, 1);
  assert.equal(effectiveSkillRank(skills, changed.payload.skillId, first.state.study.rankAdjustments), 1);
  assert.ok(Object.values(deriveSkillCapabilities(skills, {
    rankAdjustments: first.state.study.rankAdjustments,
  })).some((value) => value > 0));
});

test('amnesia suppresses an active rank but never edits or refunds its trained source', () => {
  const item = owned('tome-of-amnesia');
  const skills = { version: 1, points: 0, ranks: { swords: 1 } };
  const result = readSkillBook({
    command: command(2, item.uid), item, study: createBookStudy(), skills, heroLevel: 2,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(skills, { version: 1, points: 0, ranks: { swords: 1 } });
  assert.deepEqual(result.state.study.rankAdjustments, { swords: -1 });
  assert.equal(effectiveSkillRank(skills, 'swords', result.state.study.rankAdjustments), 0);
});

test('a blank book is consumed as a real discovery but has no hidden mutation', () => {
  const item = owned('blank-codex');
  const study = createBookStudy({ rankAdjustments: { axes: 1 } });
  const result = readSkillBook({
    command: command(3, item.uid), item, study, skills: createSkillState(1), heroLevel: 1,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.state.study, study);
  assert.deepEqual(result.events.map(({ type }) => type), ['book-read', 'book-was-blank']);
});

test('spellbooks teach one permanent spell only when intelligence is high enough', () => {
  const item = owned('book-of-flight');
  const spells = createSpellState();
  assert.deepEqual(bookOutcome(item), { type: 'learn-spell', spellId: 'flight' });
  const blocked = readSpellBook({
    command: command(4, item.uid), item, spells, intelligence: 5,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'intelligence-required');
  assert.deepEqual(spells.knownSpellIds, []);

  const learned = readSpellBook({
    command: command(5, item.uid), item, spells, intelligence: 6,
  });
  assert.equal(learned.ok, true);
  assert.deepEqual(learned.state.spells.knownSpellIds, ['flight']);
  assert.deepEqual(learned.events.map(({ type }) => type), ['book-read', 'spell-learned']);
  assert.equal(readSkillBook({
    command: command(6, item.uid), item, study: createBookStudy(), skills: createSkillState(), heroLevel: 1,
  }).reason, 'not-a-skill-book');

  const frostBook = owned('book-of-frost');
  assert.deepEqual(bookOutcome(frostBook), { type: 'learn-spell', spellId: 'frost-lance' });
  const frost = readSpellBook({
    command: command(7, frostBook.uid),
    item: frostBook,
    spells,
    intelligence: 4,
  });
  assert.equal(frost.ok, true);
  assert.deepEqual(frost.state.spells.knownSpellIds, ['frost-lance']);

  const stormBook = owned('book-of-storms');
  assert.deepEqual(bookOutcome(stormBook), { type: 'learn-spell', spellId: 'storm-bolt' });
  const storm = readSpellBook({
    command: command(8, stormBook.uid),
    item: stormBook,
    spells,
    intelligence: 5,
  });
  assert.equal(storm.ok, true);
  assert.deepEqual(storm.state.spells.knownSpellIds, ['storm-bolt']);
});

test('every unknown family has its own seeded appearance pool without effect leakage', () => {
  assert.equal(BOOK_APPEARANCES.length >= 3, true);
  for (const group of ['potion', 'scroll', 'wand', 'book']) {
    const ids = identifiableItemIds(LOOT_CATALOG, group);
    assert.ok(ids.length > 0);
    assert.ok(ids.length <= IDENTIFICATION_APPEARANCES[group].length);
    const appearances = ids.map((id) => itemAppearanceFor(77, group, id, ids).id);
    assert.equal(new Set(appearances).size, ids.length);
    const source = owned(ids[0]);
    const hidden = itemIdentificationView({
      item: source,
      seed: 77,
      knowledge: { version: 1, identifiedItemIds: [] },
      identityIds: ids,
    });
    const copy = JSON.stringify(itemPresentation(hidden, 'ru'));
    assert.equal(hidden.id, `unidentified-${group}`);
    assert.equal(hidden.rarity, 0);
    assert.equal(Object.hasOwn(hidden, 'bookEffect'), false);
    assert.equal(Object.hasOwn(hidden, 'useEffect'), false);
    assert.match(copy, /эффект неизвестен/i);
  }
});

test('v34 saves book adjustments and migrates v25 without resetting command order', () => {
  const run = createRun(912);
  run.hero.skillStudy = createBookStudy({ rankAdjustments: { swords: 1 } });
  run.commandSequence = 17;
  assert.equal(SAVE_VERSION, 42);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v42');
  assert.equal(validateRun(run), true);
  assert.deepEqual(advanceRunFloor(run).hero.skillStudy, run.hero.skillStudy);

  const legacy = structuredClone(run);
  legacy.version = 25;
  legacy.contentVersion = 12;
  delete legacy.hero.skillStudy;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.commandSequence, 17);
  assert.deepEqual(migrated.hero.skillStudy, createBookStudy());
  assert.equal(validateRun(migrated), true);
});

test('runtime reads books through the shared command and applies study to every skill consumer', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /nextGameCommand\(READ_BOOK_COMMAND, item\.uid/);
  assert.match(runtime, /readSkillBook\(\{/);
  assert.match(runtime, /hero\.skillStudy = createBookStudy/);
  assert.match(runtime, /function currentSkillCapabilities\(\)/);
  assert.match(runtime, /rankAdjustments: hero\.skillStudy\.rankAdjustments/);
  assert.match(runtime, /selection\.item\.kind === 'book'/);
  assert.match(runtime, /'Читать' : 'Read'/);
});
