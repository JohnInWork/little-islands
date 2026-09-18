/**
 * Trophies: the first time you put down each guardian, and only the first time.
 *
 * Six guardians stand in this dungeon — three on the road down, three on the
 * road out — and until now the game never said so. You picked a road blind,
 * met whatever was there, and the fight paid the same as any other. The choice
 * of road was scenery.
 *
 * A trophy fixes that with the oldest trick the genre has: a reward that is
 * paid **once**. Hades does it with bounties tracked per weapon and per boss,
 * and the effect is not the gold — it is that after your first one you can see
 * where you have not been. Six names, six marks, and the empty marks are the
 * next run's reason to take the other road.
 *
 * Two lines it must not cross:
 *
 * - **Once means once.** A second kill pays nothing, or the grid stops pointing
 *   anywhere and becomes a grind.
 * - **It records, it does not arm you.** The gold lands in the stash like any
 *   other gold, and buys the same plain things. Nothing here makes the hero
 *   stronger on its own, because meta-progression that outgrows the skill is
 *   the failure mode every game in the genre warns about.
 */

import { BRANCH_CHAPTER_GUARDIANS } from './dcss-rpg-run.js';
import { runEndSourceName } from './dcss-rpg-run-summary.js';

/** What a first kill is worth, by the depth the guardian holds. */
export const TROPHY_BOUNTY = Object.freeze({ 3: 40, 6: 80, 9: 150 });

/**
 * Every guardian in the game, with the road it stands on. Derived from the run
 * contract rather than typed out again: one list of who stands where.
 */
export const GUARDIAN_TROPHIES = Object.freeze(
  Object.entries(BRANCH_CHAPTER_GUARDIANS).flatMap(([branch, guardians]) => (
    guardians.map((guardian) => Object.freeze({
      id: guardian.monsterId,
      branch,
      depth: guardian.depth,
      final: guardian.final === true,
      bounty: TROPHY_BOUNTY[guardian.depth] ?? 40,
    }))
  )),
);

const TROPHY_IDS = new Set(GUARDIAN_TROPHIES.map(({ id }) => id));

export function trophyFor(monsterId) {
  return GUARDIAN_TROPHIES.find(({ id }) => id === monsterId) ?? null;
}

/** The marks a store holds, with anything it does not recognise dropped. */
export function createTrophyState(source = null) {
  if (!Array.isArray(source)) return [];
  return [...new Set(source.filter((id) => TROPHY_IDS.has(id)))];
}

export function trophyTaken(taken, monsterId) {
  return createTrophyState(taken).includes(monsterId);
}

/**
 * Claims the mark for one guardian. The second time it says so and pays
 * nothing: that is the whole point of the grid.
 */
export function claimTrophy(taken, monsterId) {
  const state = createTrophyState(taken);
  const trophy = trophyFor(monsterId);
  if (!trophy) return Object.freeze({ ok: false, reason: 'not-a-guardian', bounty: 0, taken: state });
  if (state.includes(monsterId)) {
    return Object.freeze({ ok: false, reason: 'already-taken', bounty: 0, taken: state });
  }
  return Object.freeze({
    ok: true,
    reason: 'claimed',
    bounty: trophy.bounty,
    taken: [...state, monsterId],
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    title: 'Хранители',
    empty: 'Ещё ни одного',
    roads: Object.freeze({ deep: 'Вниз', surface: 'Наружу' }),
    floor: (depth) => `Этаж ${depth}`,
    claimed: (gold) => `Трофей: +${gold}●`,
  }),
  en: Object.freeze({
    title: 'Guardians',
    empty: 'None yet',
    roads: Object.freeze({ deep: 'Down', surface: 'Out' }),
    floor: (depth) => `Floor ${depth}`,
    claimed: (gold) => `Trophy: +${gold}●`,
  }),
});

export function trophyCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

/**
 * The grid, ready to draw: who, on which road, at what depth, taken or not.
 * The empty rows are the point — they are what the next run is for.
 */
export function trophyModel(taken, language = 'ru') {
  const state = createTrophyState(taken);
  const copy = trophyCopy(language);
  return Object.freeze({
    copy,
    taken: state.length,
    total: GUARDIAN_TROPHIES.length,
    rows: Object.freeze(GUARDIAN_TROPHIES.map((trophy) => Object.freeze({
      ...trophy,
      name: runEndSourceName(trophy.id, language),
      road: copy.roads[trophy.branch] ?? trophy.branch,
      floor: copy.floor(trophy.depth),
      taken: state.includes(trophy.id),
    }))),
  });
}
