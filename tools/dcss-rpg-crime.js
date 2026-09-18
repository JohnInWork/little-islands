/**
 * The city remembers what the hero does in it. Striking the watch or a trader
 * raises a wanted level that outlives the floor: go down, come back, and the
 * street still knows your face.
 *
 * Falling while wanted does not end the run. The watch drags the hero to a
 * cell, takes the fine out of their purse and lets them out with a clean
 * record. Picking the cell lock instead is faster and brings the record back.
 */

export const MAX_WANTED = 3;

/** What each deed adds to the wanted level. */
export const CRIME_WEIGHTS = Object.freeze({
  'struck-guard': 1,
  'killed-guard': 2,
  'struck-trader': 1,
});

/** The fine grows with the record; it is what the cell costs to walk out of. */
export const CRIME_FINE = Object.freeze([0, 60, 160, 320]);

const EMPTY_CRIME = Object.freeze({ wanted: 0, jailed: false });

function boundedWanted(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(MAX_WANTED, value));
}

export function createCrimeState(source = null) {
  if (!source) return { wanted: 0, jailed: false };
  return {
    wanted: boundedWanted(source.wanted),
    jailed: source.jailed === true,
  };
}

export function validateCrimeState(crime) {
  if (!crime || typeof crime !== 'object' || Array.isArray(crime)) return false;
  if (Object.keys(crime).sort().join(',') !== 'jailed,wanted') return false;
  if (!Number.isInteger(crime.wanted) || crime.wanted < 0 || crime.wanted > MAX_WANTED) return false;
  return typeof crime.jailed === 'boolean';
}

/** One deed, one record. Nothing here is undone by leaving the floor. */
export function recordCrime(crime = EMPTY_CRIME, deed) {
  const weight = CRIME_WEIGHTS[deed];
  if (!weight) return Object.freeze({ ok: false, reason: 'unknown', crime: createCrimeState(crime) });
  const before = createCrimeState(crime);
  const wanted = boundedWanted(before.wanted + weight);
  if (wanted === before.wanted) {
    return Object.freeze({ ok: false, reason: 'already-hunted', crime: before });
  }
  return Object.freeze({
    ok: true,
    reason: 'recorded',
    raised: wanted > before.wanted,
    crime: { wanted, jailed: false },
  });
}

export function crimeFine(crime = EMPTY_CRIME) {
  return CRIME_FINE[boundedWanted(crime?.wanted)] ?? 0;
}

export function isWanted(crime) {
  return boundedWanted(crime?.wanted) > 0;
}

/** Paying at the barracks: gold for a clean record, and nothing else changes. */
export function payFine({ crime = EMPTY_CRIME, gold = 0 } = {}) {
  const current = createCrimeState(crime);
  if (current.wanted === 0) return Object.freeze({ ok: false, reason: 'not-wanted', crime: current, gold });
  // Paying from inside a cell is the same transaction as paying at the desk.
  const fine = crimeFine(current);
  if (!Number.isInteger(gold) || gold < fine) {
    return Object.freeze({ ok: false, reason: 'no-gold', fine, crime: current, gold });
  }
  return Object.freeze({
    ok: true,
    reason: 'paid',
    fine,
    gold: gold - fine,
    crime: { wanted: 0, jailed: false },
  });
}

/**
 * The arrest replaces death, so it leaves the hero alive and in a cell with
 * their record intact. Nothing is taken yet: how they leave decides the cost.
 */
export function arrestHero({ crime = EMPTY_CRIME, maxHp = 1 } = {}) {
  const current = createCrimeState(crime);
  if (current.wanted === 0) return Object.freeze({ ok: false, reason: 'not-wanted' });
  return Object.freeze({
    ok: true,
    reason: 'arrested',
    hp: Math.max(1, Math.round(maxHp * 0.35)),
    crime: { wanted: current.wanted, jailed: true },
  });
}

/**
 * Serving it out: the purse pays whatever it can and the record is closed.
 * This is the way that always works, so a penniless hero is never stuck.
 */
export function serveSentence({ crime = EMPTY_CRIME, gold = 0 } = {}) {
  const current = createCrimeState(crime);
  if (!current.jailed) return Object.freeze({ ok: false, reason: 'not-jailed', crime: current, gold });
  const paid = Math.min(Math.max(0, gold), crimeFine(current));
  return Object.freeze({
    ok: true,
    reason: 'served',
    fine: paid,
    gold: Math.max(0, gold) - paid,
    crime: { wanted: 0, jailed: false },
  });
}

/**
 * Breaking out instead. The lock is an ordinary lockpicking check, it is over
 * in a moment, and the record grows: nobody escapes innocent.
 */
export const JAIL_LOCK_TIER = 2;

export function canPickCell({ crime = EMPTY_CRIME, lockpickTier = 0 } = {}) {
  const current = createCrimeState(crime);
  if (!current.jailed) return Object.freeze({ ok: false, reason: 'not-jailed' });
  if (!Number.isInteger(lockpickTier) || lockpickTier < JAIL_LOCK_TIER) {
    return Object.freeze({ ok: false, reason: 'lock-too-good', tier: JAIL_LOCK_TIER });
  }
  return Object.freeze({ ok: true, reason: 'ready', tier: JAIL_LOCK_TIER });
}

export function breakOut({ crime = EMPTY_CRIME, lockpickTier = 0 } = {}) {
  const decision = canPickCell({ crime, lockpickTier });
  if (!decision.ok) return Object.freeze({ ...decision, crime: createCrimeState(crime) });
  const current = createCrimeState(crime);
  return Object.freeze({
    ok: true,
    reason: 'escaped',
    crime: { wanted: boundedWanted(current.wanted + 1), jailed: false },
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    wanted: ['', 'Разыскивается', 'Опасный преступник', 'Враг города'],
    'not-wanted': 'Ты чист перед городом',
    'no-gold': 'Не хватает реального золота на штраф',
    'lock-too-good': 'Замок не по зубам',
    'not-jailed': 'Ты не в камере',
    'in-cell': 'Из камеры так не уйти',
    'already-hunted': 'Хуже уже не будет',
    arrested: 'Стража забрала тебя в камеру',
    escaped: 'Ты выбрался, и это заметили',
    served: 'Срок отбыт, город тебя отпустил',
    paid: 'Штраф уплачен',
    fine: (gold) => `Штраф: ${gold} реального золота`,
  }),
  en: Object.freeze({
    wanted: ['', 'Wanted', 'Dangerous criminal', 'Enemy of the city'],
    'not-wanted': 'The city has nothing on you',
    'no-gold': 'Not enough gold for the fine',
    'lock-too-good': 'This lock is beyond you',
    'not-jailed': 'You are not in a cell',
    'in-cell': 'Not from inside a cell',
    'already-hunted': 'It cannot get worse',
    arrested: 'The watch dragged you to a cell',
    escaped: 'You are out, and it was noticed',
    served: 'Your time is served; the city lets you go',
    paid: 'The fine is paid',
    fine: (gold) => `Fine: ${gold} gold`,
  }),
});

export function crimeCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function wantedLabel(crime, language = 'ru') {
  const table = crimeCopy(language);
  return table.wanted[boundedWanted(crime?.wanted)] ?? '';
}

export function crimeRefusalText(reason, language = 'ru') {
  const table = crimeCopy(language);
  return typeof table[reason] === 'string' ? table[reason] : '';
}
