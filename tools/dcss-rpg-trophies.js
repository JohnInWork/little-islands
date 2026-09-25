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

import {
  GUARDIANS_ON_ROAD,
  GUARDIAN_LADDERS,
  STORY_DEPTH,
  guardianDepthForRung,
} from './dcss-rpg-run.js';
import { runEndSourceName } from './dcss-rpg-run-summary.js';

/**
 * What a first kill is worth, by how deep into the run the guardian stands —
 * first, second, third. Keyed by the rung rather than by the floor number, so
 * a longer chapter moves the guardians without moving the prices.
 */
export const TROPHY_BOUNTY = Object.freeze([40, 80, 150, 260]);
export const TROPHY_DEEPEST_BOUNTY = TROPHY_BOUNTY.at(-1);

/**
 * Every guardian in the game, with the road it stands on. Derived from the run
 * contract rather than typed out again: one list of who stands where.
 */
export const GUARDIAN_TROPHIES = Object.freeze(
  Object.entries(GUARDIAN_LADDERS).flatMap(([branch, ladder]) => (
    ladder.map((monsterId, rung) => Object.freeze({
      id: monsterId,
      branch,
      depth: guardianDepthForRung(rung),
      rung,
      final: guardianDepthForRung(rung) === STORY_DEPTH,
      // The fourth rung is past the written road, and the grid says so by
      // paying the most for it: it is the only mark you cannot take without
      // choosing to keep going after the warden fell.
      beyondRoad: rung >= GUARDIANS_ON_ROAD,
      bounty: TROPHY_BOUNTY[rung] ?? TROPHY_DEEPEST_BOUNTY,
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
    claimed: (gold) => `Трофей: +${gold} {gold}`,
  }),
  en: Object.freeze({
    title: 'Guardians',
    empty: 'None yet',
    roads: Object.freeze({ deep: 'Down', surface: 'Out' }),
    floor: (depth) => `Floor ${depth}`,
    claimed: (gold) => `Trophy: +${gold} {gold}`,
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
