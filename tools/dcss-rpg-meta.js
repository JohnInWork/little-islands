/**
 * What survives a run. The hero starts every run from nothing — that rule does
 * not change here — so this keeps a record, not an advantage: the best runs,
 * the totals, the milestones and the seed of the day.
 *
 * It lives in its own localStorage key, outside the save, so a lost run, a new
 * generator or a cleared save never erase the history.
 */

import {
  BONES_LIMIT,
  createBonesState,
  rememberBones,
  validateBonesRecord,
} from './dcss-rpg-bones.js';
import { createTrophyState } from './dcss-rpg-trophies.js';
import { DEEPEST_DEPTH, STORY_DEPTH } from './dcss-rpg-run.js';

export const META_KEY = 'dng-codex:meta:v1';
export const META_VERSION = 1;
export const BEST_RUN_LIMIT = 5;

/** Milestones are facts about what the player has done, never a head start. */
export const MILESTONES = Object.freeze([
  Object.freeze({
    id: 'first-blood',
    labels: Object.freeze({ ru: 'Первая кровь', en: 'First blood' }),
    hints: Object.freeze({ ru: 'Победить первого врага', en: 'Defeat your first enemy' }),
    reached: (run) => run.kills >= 1,
  }),
  Object.freeze({
    id: 'third-floor',
    labels: Object.freeze({ ru: 'Глубже', en: 'Deeper' }),
    hints: Object.freeze({ ru: 'Дойти до третьего этажа', en: 'Reach the third floor' }),
    reached: (run) => run.depth >= 3,
  }),
  Object.freeze({
    id: 'townsfolk',
    labels: Object.freeze({ ru: 'Городской житель', en: 'Townsfolk' }),
    hints: Object.freeze({ ru: 'Купить дом в городе', en: 'Buy a house in the city' }),
    reached: (run) => run.house === true,
  }),
  Object.freeze({
    id: 'outlaw',
    labels: Object.freeze({ ru: 'Вне закона', en: 'Outlaw' }),
    hints: Object.freeze({ ru: 'Попасть в розыск', en: 'Get yourself wanted' }),
    reached: (run) => run.wanted >= 1,
  }),
  Object.freeze({
    id: 'halfway',
    labels: Object.freeze({ ru: 'Половина пути', en: 'Halfway' }),
    hints: Object.freeze({ ru: 'Дойти до пятого этажа', en: 'Reach the fifth floor' }),
    reached: (run) => run.depth >= 5,
  }),
  Object.freeze({
    id: 'rich',
    labels: Object.freeze({ ru: 'Богач', en: 'Rich' }),
    hints: Object.freeze({ ru: 'Унести пятьсот реального золота', en: 'Carry five hundred real gold' }),
    reached: (run) => run.gold >= 500,
  }),
  Object.freeze({
    id: 'the-deep',
    labels: Object.freeze({ ru: 'Дно', en: 'The deep' }),
    hints: Object.freeze({
      ru: `Дойти до ${STORY_DEPTH}-го этажа`,
      en: `Reach floor ${STORY_DEPTH}`,
    }),
    reached: (run) => run.depth >= STORY_DEPTH,
  }),
  Object.freeze({
    id: 'victor',
    labels: Object.freeze({ ru: 'Победитель', en: 'Victor' }),
    hints: Object.freeze({ ru: 'Завершить забег победой', en: 'Finish a run in victory' }),
    reached: (run) => run.status === 'victory',
  }),
  // The road ends and the dungeon does not. This is the milestone that says so:
  // there is no screen anywhere else that admits there is more below.
  Object.freeze({
    id: 'past-the-map',
    labels: Object.freeze({ ru: 'За краем карты', en: 'Past the map' }),
    hints: Object.freeze({
      ru: `Спуститься ниже ${STORY_DEPTH}-го этажа`,
      en: `Go below floor ${STORY_DEPTH}`,
    }),
    reached: (run) => run.depth > STORY_DEPTH,
  }),
]);

export const MILESTONE_IDS = Object.freeze(MILESTONES.map(({ id }) => id));

const EMPTY_TOTALS = Object.freeze({ runs: 0, kills: 0, gold: 0, deepest: 0, victories: 0, seconds: 0 });

function boundedCount(value, limit = 1_000_000_000) {
  if (!Number.isInteger(value) || value < 0) return 0;
  return Math.min(limit, value);
}

export function createMetaState(source = null) {
  const totals = source?.totals ?? {};
  return {
    version: META_VERSION,
    totals: {
      runs: boundedCount(totals.runs),
      kills: boundedCount(totals.kills),
      gold: boundedCount(totals.gold),
      deepest: Math.min(99, boundedCount(totals.deepest)),
      victories: boundedCount(totals.victories),
      seconds: boundedCount(totals.seconds),
    },
    best: normalizedBest(source?.best),
    milestones: MILESTONE_IDS.filter((id) => Array.isArray(source?.milestones) && source.milestones.includes(id)),
    // Where past runs ended, so a later one can meet its own ghost. An older
    // store simply has none, which is a dungeon that has not killed anybody yet.
    bones: createBonesState(source?.bones),
    // Which guardians have been put down at least once. Optional for the same
    // reason bones are: an older store is one that had not met a guardian yet,
    // and bumping the version would throw away everybody's records to add a
    // field — `parseMeta` drops a store whose version it does not know.
    trophies: createTrophyState(source?.trophies),
  };
}

/** Remembers where this run fell. Victory leaves no body. */
/** The bones are spent once their ghost has been answered: one body, one visit. */
export function forgetBones(meta, depth) {
  const state = createMetaState(meta);
  return Object.freeze({
    ...state,
    bones: state.bones.filter((record) => record.depth !== depth),
  });
}

export function recordBones(meta, record) {
  const state = createMetaState(meta);
  return Object.freeze({ ...state, bones: rememberBones(state.bones, record) });
}

function normalizedRecord(record) {
  if (!record || typeof record !== 'object') return null;
  // A depth record is not clipped: the descent has no bottom, so neither does
  // the number it writes down.
  const depth = boundedCount(record.depth, DEEPEST_DEPTH);
  // Three ways to end, and the table keeps them apart: winning, walking away
  // with the purse, and dying. Anything else on disk is a death.
  const status = ['victory', 'retired'].includes(record.status) ? record.status : 'dead';
  return {
    depth,
    status,
    kills: boundedCount(record.kills),
    gold: boundedCount(record.gold),
    level: Math.max(1, Math.min(99, boundedCount(record.level))),
    seconds: boundedCount(record.seconds),
    seed: boundedCount(record.seed, 4_294_967_295),
    killerId: typeof record.killerId === 'string' && record.killerId.length <= 80 ? record.killerId : null,
    at: typeof record.at === 'string' && record.at.length <= 40 ? record.at : '',
  };
}

/**
 * Best is how deep you got, and only then how it ended.
 *
 * While the run had a bottom, «won» beat every number: there was one road and
 * finishing it was the top of the table. Now the road goes on, so a hero who
 * walked out of floor forty did something a victory on floor eighteen did not,
 * and a table that still put the victory first would be telling the player not
 * to bother going deeper.
 */
const RUN_RANK = Object.freeze({ victory: 0, retired: 1, dead: 2 });

export function compareRuns(left, right) {
  if (left.depth !== right.depth) return right.depth - left.depth;
  if (left.status !== right.status) return RUN_RANK[left.status] - RUN_RANK[right.status];
  if (left.kills !== right.kills) return right.kills - left.kills;
  if (left.gold !== right.gold) return right.gold - left.gold;
  return left.seconds - right.seconds;
}

function normalizedBest(source) {
  if (!Array.isArray(source)) return [];
  return source
    .map(normalizedRecord)
    .filter((record) => record !== null && record.depth > 0)
    .sort(compareRuns)
    .slice(0, BEST_RUN_LIMIT);
}

export function validateMetaState(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false;
  if (meta.version !== META_VERSION) return false;
  if (!meta.totals || typeof meta.totals !== 'object') return false;
  if (!Array.isArray(meta.best) || meta.best.length > BEST_RUN_LIMIT) return false;
  if (!Array.isArray(meta.milestones)) return false;
  // Bones are optional: a store written before the dungeon started remembering
  // deaths is still a valid store.
  if (meta.bones !== undefined) {
    if (!Array.isArray(meta.bones) || meta.bones.length > BONES_LIMIT) return false;
    if (!meta.bones.every((record) => validateBonesRecord(record))) return false;
  }
  if (meta.trophies !== undefined && !Array.isArray(meta.trophies)) return false;
  return meta.milestones.every((id) => MILESTONE_IDS.includes(id));
}

/**
 * One finished run goes into the history: it raises the totals, may enter the
 * table of best runs and may light up milestones. Nothing here is undone.
 */
export function recordRunResult(meta, result) {
  const state = createMetaState(meta);
  const record = normalizedRecord(result);
  if (!record) return Object.freeze({ ok: false, reason: 'invalid-run', meta: state });
  const before = state.best[0] ?? null;
  const totals = {
    runs: state.totals.runs + 1,
    kills: state.totals.kills + record.kills,
    gold: state.totals.gold + record.gold,
    deepest: Math.max(state.totals.deepest, record.depth),
    victories: state.totals.victories + (record.status === 'victory' ? 1 : 0),
    seconds: state.totals.seconds + record.seconds,
  };
  const best = normalizedBest([...state.best, record]);
  const earned = MILESTONES
    .filter(({ id, reached }) => !state.milestones.includes(id) && reached({
      depth: record.depth,
      kills: record.kills,
      gold: record.gold,
      status: record.status,
      house: result?.house === true,
      wanted: boundedCount(result?.wanted, 3),
    }))
    .map(({ id }) => id);
  return Object.freeze({
    ok: true,
    reason: 'recorded',
    // A run is a record when nothing before it stood higher.
    isRecord: before === null || compareRuns(record, before) < 0,
    earned: Object.freeze(earned),
    meta: {
      version: META_VERSION,
      totals,
      best,
      milestones: MILESTONE_IDS.filter((id) => state.milestones.includes(id) || earned.includes(id)),
      bones: state.bones,
      trophies: state.trophies,
    },
  });
}

/** The seed everyone shares today, derived from the date and nothing else. */
export function dailySeed(date = new Date()) {
  const iso = dailyKey(date);
  let value = 0x811c9dc5;
  for (const character of iso) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}

export function dailyKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const COPY = Object.freeze({
  ru: Object.freeze({
    title: 'Записи',
    empty: 'Пока ни одного завершённого забега',
    close: 'Закрыть записи',
    open: 'Записи',
    best: 'Лучшие забеги',
    totals: 'Всего',
    milestones: 'Вехи',
    runs: 'Забегов',
    kills: 'Побед',
    gold: 'Реального золота',
    deepest: 'Глубже всего',
    victories: 'Побед в забеге',
    time: 'В подземелье',
    daily: (key) => `Сид дня: ${key}`,
    playDaily: 'Играть сид дня',
    record: 'Новый рекорд',
    floor: (depth) => `Этаж ${depth}`,
    victory: 'Победа',
  }),
  en: Object.freeze({
    title: 'Records',
    empty: 'No finished runs yet',
    close: 'Close records',
    open: 'Records',
    best: 'Best runs',
    totals: 'Totals',
    milestones: 'Milestones',
    runs: 'Runs',
    kills: 'Kills',
    gold: 'Real gold',
    deepest: 'Deepest',
    victories: 'Victories',
    time: 'In the dungeon',
    daily: (key) => `Seed of the day: ${key}`,
    playDaily: 'Play the daily seed',
    record: 'New record',
    floor: (depth) => `Floor ${depth}`,
    victory: 'Victory',
  }),
});

/** The sign a row carries: won it, walked out of it, or died in it. */
const RUN_MARKS = Object.freeze({ victory: '◆', retired: '▲', dead: '✝' });

export function metaCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

function formatSeconds(total) {
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
}

/** Everything the records screen draws, in one frozen model. */
export function metaModel(meta, language = 'ru', date = new Date()) {
  const state = createMetaState(meta);
  const copy = metaCopy(language);
  const locale = language === 'en' ? 'en' : 'ru';
  return Object.freeze({
    title: copy.title,
    close: copy.close,
    empty: state.best.length === 0 ? copy.empty : '',
    daily: copy.daily(dailyKey(date)),
    playDaily: copy.playDaily,
    dailySeed: dailySeed(date),
    best: Object.freeze(state.best.map((record, index) => Object.freeze({
      place: index + 1,
      // Every row says which floor, victory included: hiding the number behind
      // the word «victory» made the one ending you cannot compare to the rest.
      depth: copy.floor(record.depth),
      status: record.status,
      mark: RUN_MARKS[record.status] ?? '',
      kills: record.kills,
      gold: record.gold,
      time: formatSeconds(record.seconds),
      seed: record.seed,
      at: record.at,
    }))),
    totals: Object.freeze([
      { id: 'runs', label: copy.runs, value: String(state.totals.runs) },
      { id: 'kills', label: copy.kills, value: String(state.totals.kills) },
      { id: 'gold', label: copy.gold, value: String(state.totals.gold) },
      { id: 'deepest', label: copy.deepest, value: String(state.totals.deepest) },
      { id: 'victories', label: copy.victories, value: String(state.totals.victories) },
      { id: 'time', label: copy.time, value: formatSeconds(state.totals.seconds) },
    ].map((row) => Object.freeze(row))),
    milestones: Object.freeze(MILESTONES.map((milestone) => Object.freeze({
      id: milestone.id,
      label: milestone.labels[locale],
      hint: milestone.hints[locale],
      earned: state.milestones.includes(milestone.id),
    }))),
  });
}

export function serializeMeta(meta) {
  return JSON.stringify(createMetaState(meta));
}

export function parseMeta(raw) {
  try {
    const parsed = JSON.parse(raw);
    return validateMetaState(parsed) ? createMetaState(parsed) : createMetaState();
  } catch {
    return createMetaState();
  }
}
