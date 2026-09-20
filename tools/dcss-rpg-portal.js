/**
 * The way back to town, and the way back from it.
 *
 * Diablo and Path of Exile both solved this the same way and it has never
 * needed improving: you always have a town portal, it costs nothing, and it
 * has two mouths. You open one where you stand, step through it into the city,
 * do what you came to do, and step back through to exactly where you left off.
 * Once you are back, it closes.
 *
 * Ivan asked for that, and then asked the question the whole design turns on:
 * what happens if he walks into the city, puts the phone down, has a cup of
 * tea, and the game is closed? **He must not come back to a city with no way
 * home and forty floors to walk.** So the portal is not a thing on the floor
 * and not a thing in the renderer — it is two coordinates in the run, saved
 * with everything else. Reopen the game a week later and both mouths are still
 * standing where they were.
 *
 * Three rules follow from that and are enforced here rather than remembered:
 *
 * - **One portal, and a new one replaces it.** The first version refused a
 *   second while one stood open. Ivan cut that out — «мы делаем не душную
 *   игру» — and he is right that it costs nothing: a portal you replace is
 *   always one you walked away from yourself, on a floor you already left.
 *   The way back from *where you are standing* can never be taken away,
 *   because that is the portal you are opening.
 * - **The far floor is never forgotten.** The dungeon keeps only the floors
 *   near the hero; a floor with a portal on it is pinned, the way the house
 *   stone's floor is, so stepping back does not land on a floor that has
 *   quietly regenerated its monsters. Move the portal and the pin moves with
 *   it — the old floor was left behind on purpose.
 * - **Closing happens on arrival, not on departure.** The portal is spent by
 *   the hero standing on the far side of it, never before — so no failure in
 *   between can consume it.
 */

/** The blue ring. One picture, both mouths: it is one portal. */
export const PORTAL_PATH = 'dngn/gateways/portal.png';

/** The city is depth zero; a portal only ever leads back out of the dungeon. */
const CITY_DEPTH = 0;
const MAX_COORDINATE = 999;

const COPY = Object.freeze({
  ru: Object.freeze({
    name: 'Портал в город',
    cityName: 'Портал вниз',
    open: 'Открыть портал',
    enter: 'Войти',
    description: 'Синее кольцо держит проход. Шаг — и ты в городе.',
    cityDescription: ({ depth }) => `Проход на ${depth}-й этаж, туда, где ты его открыл.`,
    hint: 'Обратный проход закроется, когда ты им вернёшься.',
    replaced: 'Прежний портал закрылся',
    refusal: Object.freeze({
      'in-city': 'Ты и так в городе',
      'not-playing': 'Не сейчас',
      'no-room': 'Здесь негде его развернуть',
    }),
  }),
  en: Object.freeze({
    name: 'Town portal',
    cityName: 'Portal down',
    open: 'Open a portal',
    enter: 'Step through',
    description: 'A blue ring holds the way open. One step and you are in the city.',
    cityDescription: ({ depth }) => `The way back to floor ${depth}, where you opened it.`,
    hint: 'The way back closes once you have come back through it.',
    replaced: 'The old portal closed',
    refusal: Object.freeze({
      'in-city': 'You are in the city already',
      'not-playing': 'Not now',
      'no-room': 'No room to open one here',
    }),
  }),
});

export function portalCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

/** No portal is `null`; an open one is where its dungeon mouth stands. */
export function createPortalState(source = null) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const { depth, x, y } = source;
  if (![depth, x, y].every((value) => Number.isInteger(value))) return null;
  if (depth <= CITY_DEPTH || depth > MAX_COORDINATE) return null;
  if (x < 0 || y < 0 || x > MAX_COORDINATE || y > MAX_COORDINATE) return null;
  return Object.freeze({ depth, x, y });
}

export function validatePortalState(portal) {
  if (portal === null || portal === undefined) return true;
  if (typeof portal !== 'object' || Array.isArray(portal)) return false;
  if (Object.keys(portal).sort().join(',') !== 'depth,x,y') return false;
  if (!Number.isInteger(portal.depth) || portal.depth <= CITY_DEPTH || portal.depth > MAX_COORDINATE) {
    return false;
  }
  return [portal.x, portal.y].every((value) => (
    Number.isInteger(value) && value >= 0 && value <= MAX_COORDINATE
  ));
}

/**
 * Can one be opened here? Only the city says no, because the city is what a
 * portal is for. Standing in the dungeon is the whole requirement — there is
 * no cost, no cooldown and no stock to run out of.
 */
export function canOpenPortal({ depth = CITY_DEPTH, status = 'playing' } = {}) {
  if (status !== 'playing') return Object.freeze({ ok: false, reason: 'not-playing' });
  if (!Number.isInteger(depth) || depth <= CITY_DEPTH) return Object.freeze({ ok: false, reason: 'in-city' });
  return Object.freeze({ ok: true, reason: 'ready' });
}

/**
 * Opening one, which is also how you move one. Whatever stood before is gone;
 * `replaced` says so, because a ring vanishing off a floor you cannot see
 * deserves a word.
 */
export function openPortalAt({ depth, x, y, status = 'playing', portal = null } = {}) {
  const decision = canOpenPortal({ depth, status });
  if (!decision.ok) return Object.freeze({ ok: false, reason: decision.reason, portal });
  const next = createPortalState({ depth, x, y });
  if (!next) return Object.freeze({ ok: false, reason: 'no-room', portal });
  const previous = createPortalState(portal);
  // Re-opening one on the cell it already stands on is not a replacement,
  // whatever the bookkeeping says: nothing went out anywhere.
  const moved = previous
    && (previous.depth !== next.depth || previous.x !== next.x || previous.y !== next.y);
  return Object.freeze({
    ok: true,
    reason: moved ? 'replaced' : 'opened',
    portal: next,
    replaced: moved ? previous : null,
  });
}

/** Where a portal stands right now, on this floor, or nowhere. */
export function portalMouthOn(portal, depth) {
  const state = createPortalState(portal);
  if (!state) return null;
  if (depth === CITY_DEPTH) return { end: 'city' };
  return state.depth === depth ? { end: 'dungeon', x: state.x, y: state.y } : null;
}

/**
 * Both floors a portal touches. The dungeon forgets floors the hero has left
 * behind; these two it must not, or a hero who steps back through arrives on a
 * floor that has forgotten everything they did to it.
 */
export function portalAnchoredDepths(portal) {
  const state = createPortalState(portal);
  return state ? Object.freeze([state.depth]) : Object.freeze([]);
}
