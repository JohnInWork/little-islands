import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { MONSTER_CATALOG } from '../tools/dcss-rpg-content.js';
import {
  LEGACY_SAVE_KEYS,
  SAVE_KEY,
  SAVE_VERSION,
  advanceRunFloor,
  createRun,
  createRunStats,
  generateDungeon,
  hydrateDungeon,
  migrateLegacyRun,
  validateRun,
  validateRunStats,
} from '../tools/dcss-rpg-core.js';
import { PASSIVE_CREATURE_CATALOG } from '../tools/dcss-rpg-passive.js';
import {
  RUN_END_SOURCE_NAMES,
  formatRunDuration,
  runEndSourceName,
  runSummaryModel,
} from '../tools/dcss-rpg-run-summary.js';

test('every creature and hazard that can end a run has a bilingual name', () => {
  for (const monster of MONSTER_CATALOG) {
    assert.ok(RUN_END_SOURCE_NAMES[monster.id]?.ru && RUN_END_SOURCE_NAMES[monster.id]?.en, monster.id);
  }
  for (const creature of PASSIVE_CREATURE_CATALOG) {
    assert.ok(RUN_END_SOURCE_NAMES[`wildlife:${creature.id}`], creature.id);
  }
  for (const hazard of ['effect:burning', 'effect:poison', 'trap:blade-trap', 'potion:venom']) {
    assert.ok(RUN_END_SOURCE_NAMES[hazard], hazard);
  }
  assert.equal(runEndSourceName('goblin', 'en'), 'Goblin');
  assert.equal(runEndSourceName('goblin'), 'Гоблин');
  assert.equal(runEndSourceName('not-a-thing'), null);
  assert.equal(runEndSourceName(null), null);
});

test('durations format as minutes and seconds, or hours beyond sixty minutes', () => {
  assert.equal(formatRunDuration(0), '0:00');
  assert.equal(formatRunDuration(59.9), '0:59');
  assert.equal(formatRunDuration(754), '12:34');
  assert.equal(formatRunDuration(3723), '1:02:03');
  assert.equal(formatRunDuration(-5), '0:00');
  assert.equal(formatRunDuration(Number.NaN), '0:00');
});

test('the summary lists floor, time, kills, gold, level and seed, plus the cause of death', () => {
  const stats = { kills: 17, activeSeconds: 1300, killerId: 'ogre' };
  const dead = runSummaryModel({ status: 'dead', depthLabel: 'IV', stats, level: 5, gold: 88, seed: 4242, language: 'ru' });
  assert.equal(dead.title, 'Герой пал');
  assert.deepEqual(dead.rows.map(({ id }) => id), ['depth', 'time', 'kills', 'gold', 'level', 'seed', 'cause']);
  assert.deepEqual(dead.rows.map(({ value }) => value), ['IV', '21:40', '17', '88', '5', '4242', 'Огр']);
  assert.equal(dead.rows[0].label, 'Этаж');
  assert.equal(dead.restart, 'Начать новый забег');
  assert.match(dead.ariaLabel, /^Герой пал\. Этаж: IV\. Время: 21:40/);
  assert.ok(Object.isFrozen(dead) && Object.isFrozen(dead.rows));

  const victory = runSummaryModel({ status: 'victory', depthLabel: 'IX', stats, level: 12, gold: 300, seed: 7, language: 'en' });
  assert.equal(victory.title, 'Victory');
  assert.deepEqual(victory.rows.map(({ id }) => id), ['depth', 'time', 'kills', 'gold', 'level', 'seed'], 'no cause row on victory');
  assert.equal(victory.rows.find(({ id }) => id === 'kills').label, 'Kills');
  assert.equal(victory.restart, 'Start a new run');

  const unknownKiller = runSummaryModel({ status: 'dead', depthLabel: 'I', stats: { ...stats, killerId: 'mystery' }, level: 1, gold: 0, seed: 1, language: 'en' });
  assert.equal(unknownKiller.rows.at(-1).value, 'Unknown');
  const legacy = runSummaryModel({ status: 'dead', depthLabel: 'I', stats: null, level: 1, gold: 0, seed: 1 });
  assert.deepEqual(legacy.rows.map(({ value }) => value).slice(1, 3), ['0:00', '0']);
  assert.equal(legacy.rows.some(({ id }) => id === 'cause'), false, 'an old save without a killer omits the row');
  assert.throws(() => runSummaryModel({ status: 'playing', depthLabel: 'I', stats, level: 1, gold: 0, seed: 1 }), TypeError);
  assert.throws(() => runSummaryModel({ status: 'dead', depthLabel: '', stats, level: 1, gold: 0, seed: 1 }), TypeError);
});

test('run statistics are a strict persisted field of save v35', () => {
  assert.equal(SAVE_VERSION, 44);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v44');
  assert.equal(LEGACY_SAVE_KEYS[0], 'dng-codex:rpg:v43');
  assert.deepEqual(createRunStats(), { kills: 0, activeSeconds: 0, killerId: null });
  assert.deepEqual(createRunStats({ kills: 3, activeSeconds: 12.5, killerId: 'goblin', extra: 1 }), { kills: 3, activeSeconds: 12.5, killerId: 'goblin' });
  assert.deepEqual(createRunStats({ kills: -1, activeSeconds: 'x', killerId: 42 }), { kills: 0, activeSeconds: 0, killerId: null });
  assert.equal(validateRunStats({ kills: 0, activeSeconds: 0, killerId: null }), true);
  assert.equal(validateRunStats({ kills: 2, activeSeconds: 90.25, killerId: 'wildlife:hog' }), true);
  assert.equal(validateRunStats({ kills: 1.5, activeSeconds: 0, killerId: null }), false);
  assert.equal(validateRunStats({ kills: 0, activeSeconds: -1, killerId: null }), false);
  assert.equal(validateRunStats({ kills: 0, activeSeconds: 0, killerId: 'Bad Id!' }), false);
  assert.equal(validateRunStats({ kills: 0, activeSeconds: 0 }), false, 'the killer field must exist explicitly');
  assert.equal(validateRunStats(null), false);

  const run = createRun(5150);
  assert.deepEqual(run.stats, { kills: 0, activeSeconds: 0, killerId: null });
  assert.equal(validateRun(run), true);
  run.stats.kills = 4;
  run.stats.activeSeconds = 321;
  const next = advanceRunFloor(run);
  assert.deepEqual(next.stats, { kills: 4, activeSeconds: 321, killerId: null }, 'stats survive the descent');
  assert.equal(validateRun({ ...run, stats: { kills: 4 } }), false);
  assert.equal(validateRun({ ...run, stats: undefined }), false);
});

test('v34 saves gain empty statistics while keeping their merchant purses and containers', () => {
  const current = advanceRunFloor(advanceRunFloor(createRun(35034)));
  const dungeon = generateDungeon({ seed: current.seed, depth: current.depth });
  const legacy = structuredClone(current);
  legacy.version = 34;
  delete legacy.stats;
  legacy.floor.merchants[0].gold = 7;
  legacy.floor.merchants[0].purchasedEntryIds = [dungeon.merchants[0].stock[0].entryId];
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, 44);
  assert.deepEqual(migrated.stats, { kills: 0, activeSeconds: 0, killerId: null });
  assert.equal(migrated.floor.merchants[0].gold, 7, 'the persisted purse is not rebuilt');
  assert.deepEqual(migrated.floor.merchants[0].purchasedEntryIds, [dungeon.merchants[0].stock[0].entryId]);
  assert.deepEqual(migrated.floor.chests, legacy.floor.chests);
  assert.equal(validateRun(migrated), true);
  assert.doesNotThrow(() => hydrateDungeon(migrated));

  const older = createRun(35033);
  older.version = 33;
  delete older.stats;
  older.floor.merchantPurchases = [];
  delete older.floor.merchants;
  const fromOlder = migrateLegacyRun(older);
  assert.equal(fromOlder.version, 44);
  assert.deepEqual(fromOlder.stats, { kills: 0, activeSeconds: 0, killerId: null });
  assert.equal(validateRun(fromOlder), true);
});

test('the runtime counts kills and active seconds, remembers the killer and renders the summary', async () => {
  const [runtime, html, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  assert.match(runtime, /run\.floor\.defeated\.push\(monster\.instanceId\);\s+run\.stats\.kills \+= 1;/);
  assert.match(runtime, /hungerAccumulator -= activeSeconds;\s+run\.stats\.activeSeconds \+= activeSeconds;/);
  assert.match(runtime, /run\.stats\.killerId = typeof source === 'string' \? source : null;/);
  assert.match(runtime, /damageHero\(strikeDamage, \{ blocked: block\.blocked, source: monster\.id \}\)/);
  assert.match(runtime, /damageHero\(creature\.damage, \{ blocked: block\.blocked, source: `wildlife:\$\{creature\.id\}` \}\)/);
  assert.match(runtime, /source: tick\.pulses\.burning \? 'effect:burning' : 'effect:poison'/);
  assert.match(runtime, /runSummaryModel\(\{/);
  assert.match(html, /id="run-end-title"[\s\S]*<dl id="run-summary" class="run-summary"><\/dl>[\s\S]*id="restart-run"/);
  assert.doesNotMatch(html, /id="result-depth"/);
  assert.match(css, /\.run-summary\s*{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\)/s);
});
