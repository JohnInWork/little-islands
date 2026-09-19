import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BEST_RUN_LIMIT,
  META_KEY,
  META_VERSION,
  MILESTONES,
  MILESTONE_IDS,
  compareRuns,
  createMetaState,
  dailyKey,
  dailySeed,
  metaCopy,
  metaModel,
  parseMeta,
  recordRunResult,
  serializeMeta,
  validateMetaState,
} from '../tools/dcss-rpg-meta.js';
import { STORY_DEPTH } from '../tools/dcss-rpg-run.js';

const finished = (overrides = {}) => ({
  depth: 3,
  status: 'dead',
  kills: 10,
  gold: 60,
  level: 3,
  seconds: 300,
  seed: 77,
  killerId: 'gnoll',
  at: '2026-09-18',
  ...overrides,
});

test('the history starts empty and only accepts shapes it wrote itself', () => {
  const empty = createMetaState();
  assert.equal(empty.version, META_VERSION);
  assert.deepEqual(empty.best, []);
  assert.deepEqual(empty.milestones, []);
  assert.equal(validateMetaState(empty), true);
  assert.equal(validateMetaState(null), false);
  assert.equal(validateMetaState({ ...empty, version: 99 }), false);
  assert.equal(validateMetaState({ ...empty, milestones: ['not-a-milestone'] }), false);
  assert.equal(validateMetaState({ ...empty, best: new Array(BEST_RUN_LIMIT + 1).fill({}) }), false);
  // Damaged storage is history that never happened, not a crash.
  assert.deepEqual(parseMeta('{ broken'), empty);
  assert.deepEqual(parseMeta(serializeMeta(empty)), empty);
  assert.ok(META_KEY.startsWith('dng-codex:meta:'), 'the history has its own key, away from the save');
});

test('a finished run raises the totals and takes its place in the table', () => {
  const first = recordRunResult(createMetaState(), finished());
  assert.equal(first.ok, true);
  assert.equal(first.isRecord, true, 'the first finished run is the best one so far');
  assert.deepEqual(first.meta.totals, { runs: 1, kills: 10, gold: 60, deepest: 3, victories: 0, seconds: 300 });

  const worse = recordRunResult(first.meta, finished({ depth: 1, kills: 0, gold: 0, seed: 78 }));
  assert.equal(worse.isRecord, false);
  assert.equal(worse.meta.best.length, 2);
  assert.equal(worse.meta.best[0].depth, 3, 'the deeper run stays on top');
  assert.equal(worse.meta.totals.runs, 2);
  assert.equal(worse.meta.totals.deepest, 3, 'a shallower run cannot lower the deepest');

  // The table never grows past its limit.
  let meta = worse.meta;
  for (let index = 0; index < BEST_RUN_LIMIT + 3; index += 1) {
    meta = recordRunResult(meta, finished({ depth: 2, seed: 100 + index })).meta;
  }
  assert.equal(meta.best.length, BEST_RUN_LIMIT);
  const victory = recordRunResult(meta, finished({ depth: STORY_DEPTH, status: 'victory', seed: 9 }));
  assert.equal(victory.isRecord, true);
  assert.equal(victory.meta.best[0].status, 'victory');
  assert.equal(victory.meta.totals.victories, 1);

  /**
   * A comparator promises a sign, not a number. Depth is the score now: the
   * descent has no bottom, so the deepest run is the best one and how it ended
   * only separates runs that got equally far. Ranking a victory above every
   * depth would be the table telling the player not to go past the warden.
   */
  const shallow = (status) => ({ status, depth: 1, kills: 0, gold: 0, seconds: 0 });
  const deep = (status) => ({ status, depth: STORY_DEPTH * 2, kills: 99, gold: 999, seconds: 0 });
  assert.ok(compareRuns(deep('dead'), shallow('victory')) < 0, 'a deeper death outranks a shallow win');
  assert.ok(compareRuns(deep('retired'), shallow('victory')) < 0);
  const atDepth = (status) => ({ status, depth: 9, kills: 0, gold: 0, seconds: 0 });
  assert.ok(compareRuns(atDepth('victory'), atDepth('dead')) < 0, 'and at the same depth, winning leads');
  assert.ok(compareRuns(atDepth('victory'), atDepth('retired')) < 0);
  assert.ok(compareRuns(atDepth('retired'), atDepth('dead')) < 0);
  assert.ok(compareRuns(atDepth('dead'), atDepth('retired')) > 0);

  // A record from past the end of the road is written down whole, not clipped.
  const abyss = recordRunResult(victory.meta, finished({ depth: 240, status: 'retired', seed: 11 }));
  assert.equal(abyss.meta.best[0].depth, 240);
  assert.equal(abyss.meta.totals.deepest, 240);
});

test('milestones are facts about what happened, and never unlock a head start', () => {
  const run = recordRunResult(createMetaState(), finished({ depth: 5, gold: 500, kills: 1 }));
  assert.deepEqual([...run.earned].sort(), ['first-blood', 'halfway', 'rich', 'third-floor']);
  // The one milestone that admits the dungeon carries on below the story.
  const abyss = recordRunResult(run.meta, finished({ depth: STORY_DEPTH + 1 }));
  assert.ok(abyss.earned.includes('past-the-map'));
  assert.ok(abyss.earned.includes('the-deep'), 'the end of the road is the milestone before it');
  const again = recordRunResult(run.meta, finished({ depth: 5, gold: 500 }));
  assert.deepEqual(again.earned, [], 'a milestone is earned once');
  const town = recordRunResult(again.meta, finished({ house: true, wanted: 2 }));
  assert.deepEqual([...town.earned].sort(), ['outlaw', 'townsfolk']);
  // Nothing in a milestone hands the next run an item, a spell or a stat.
  for (const milestone of MILESTONES) {
    assert.deepEqual(Object.keys(milestone).sort(), ['hints', 'id', 'labels', 'reached']);
  }
  assert.equal(new Set(MILESTONE_IDS).size, MILESTONES.length);
});

test('the seed of the day is the same for everyone and changes at midnight UTC', () => {
  const morning = new Date('2026-09-18T01:00:00Z');
  const evening = new Date('2026-09-18T23:00:00Z');
  const tomorrow = new Date('2026-09-19T01:00:00Z');
  assert.equal(dailyKey(morning), '2026-09-18');
  assert.equal(dailySeed(morning), dailySeed(evening), 'one seed for the whole day');
  assert.notEqual(dailySeed(morning), dailySeed(tomorrow));
  assert.ok(Number.isInteger(dailySeed(morning)) && dailySeed(morning) >= 0);
});

test('the records screen model is complete in both languages', () => {
  const meta = recordRunResult(createMetaState(), finished({ depth: 4 })).meta;
  for (const language of ['ru', 'en']) {
    const model = metaModel(meta, language, new Date('2026-09-18T10:00:00Z'));
    assert.equal(model.title, metaCopy(language).title);
    assert.equal(model.empty, '', 'a finished run is not an empty table');
    assert.match(model.daily, /2026-09-18/);
    assert.equal(model.best.length, 1);
    assert.equal(model.best[0].place, 1);
    assert.equal(model.totals.length, 6);
    assert.ok(model.playDaily.length > 0, 'the seed of the day can be played');
    assert.ok(Number.isInteger(model.dailySeed));
    assert.equal(model.milestones.length, MILESTONES.length);
    assert.ok(model.milestones.every(({ label, hint }) => label.length > 0 && hint.length > 0));
    assert.ok(model.milestones.some(({ earned }) => earned === true));
  }
  assert.equal(metaModel(createMetaState(), 'ru').empty, metaCopy('ru').empty);
});

test('the runtime keeps the history beside the save, not inside it', async () => {
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const uses = (needle) => assert.ok(source.includes(needle), needle);
  uses("from './dcss-rpg-meta.js'");
  uses('function recordFinishedRun(');
  uses('localStorage.setItem(META_KEY, serializeMeta(metaState))');
  uses('const outcome = recordFinishedRun(result);');
  uses('function openRecords(');
  uses('playDailyButton.addEventListener');
  uses('restartRun(seed)');
  const markup = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  assert.ok(markup.includes('id="records-screen"'));
  assert.ok(markup.includes('id="open-records"'));
  // The run save must not carry any of this: the record outlives the run.
  const core = await readFile(new URL('../tools/dcss-rpg-core.js', import.meta.url), 'utf8');
  assert.ok(!core.includes('dcss-rpg-meta.js'), 'the save knows nothing about the history');
});
