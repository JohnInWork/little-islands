/**
 * Cleansing is the answer to everything the dungeon leaves on the hero: fire
 * that keeps burning, venom that keeps working, cold that keeps slowing.
 *
 * The ritual itself is a pinch of salt anyone can use. The school decides how
 * much it takes off and whether the hero is any better for it afterwards.
 */

export const CLEANSING_SALT_ITEM_ID = 'cleansing-salt';

/** What each rank can strip. Rank zero is the ritual without the schooling. */
export const CLEANSING_BY_RANK = Object.freeze([
  Object.freeze(['poison']),
  Object.freeze(['poison', 'burning']),
  Object.freeze(['poison', 'burning', 'chilled', 'frozen']),
  Object.freeze(['poison', 'burning', 'chilled', 'frozen', 'wet']),
]);

/** The school also mends what the condition cost, as a share of full health. */
export const CLEANSING_HEAL_PERCENT = Object.freeze([0, 0, 8, 15]);

const EMPTY_PROFILE = Object.freeze({
  rank: 0,
  cleared: CLEANSING_BY_RANK[0],
  healPercent: 0,
});

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function cleansingProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.cleansingRank);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    cleared: CLEANSING_BY_RANK[rank],
    healPercent: CLEANSING_HEAL_PERCENT[rank],
  });
}

/**
 * One ritual. It refuses when there is nothing to take off, so a pinch of salt
 * is never spent on a hero who is already clean.
 */
export function resolveCleansing({
  effects = {},
  hp = 1,
  maxHp = 1,
  profile = EMPTY_PROFILE,
} = {}) {
  const treatable = profile?.cleared ?? EMPTY_PROFILE.cleared;
  const cleared = treatable.filter((id) => (effects?.[id] ?? 0) > 0);
  if (cleared.length === 0) return Object.freeze({ ok: false, reason: 'nothing-to-clear' });
  const next = { ...effects };
  for (const id of cleared) next[id] = 0;
  const healed = Math.max(0, Math.round((maxHp * (profile?.healPercent ?? 0)) / 100));
  return Object.freeze({
    ok: true,
    reason: 'cleansed',
    effects: next,
    cleared: Object.freeze([...cleared]),
    healed: Math.min(healed, Math.max(0, maxHp - hp)),
    hp: Math.min(maxHp, hp + healed),
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    'nothing-to-clear': 'Очищать нечего',
    cleansed: 'Очищено',
    burning: 'Горение',
    poison: 'Отравление',
    chilled: 'Озноб',
    frozen: 'Заморозка',
    wet: 'Мокрота',
  }),
  en: Object.freeze({
    'nothing-to-clear': 'Nothing to cleanse',
    cleansed: 'Cleansed',
    burning: 'Burning',
    poison: 'Poison',
    chilled: 'Chill',
    frozen: 'Frost',
    wet: 'Damp',
  }),
});

export function cleansingCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function cleansingRefusalText(reason, language = 'ru') {
  const table = cleansingCopy(language);
  return typeof table[reason] === 'string' ? table[reason] : '';
}

/** A short line for the toast: what came off, and what came back. */
export function cleansingReport(result, language = 'ru') {
  if (!result?.ok) return cleansingRefusalText(result?.reason, language);
  const table = cleansingCopy(language);
  const names = result.cleared.map((id) => table[id] ?? id).join(', ');
  // Метка `{heal}` — сердце и слово у переходника, а не голое «+6».
  return result.healed > 0 ? `${names} · +${result.healed} {heal}` : names;
}
