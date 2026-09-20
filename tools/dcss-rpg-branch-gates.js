/**
 * The doors between roads.
 *
 * Until now the only place a run could change roads was the city: three gates
 * in a wall, chosen before you set off. That makes the roads parallel rather
 * than connected — you pick one at the start and never meet the others.
 *
 * Ivan asked for the other shape: «из самого нижнего этажа этого спуска, когда
 * там ветка заканчивается, там идёт проход в ад <...> чтобы сверху был проход
 * в какие-нибудь катакомбы». So a road can end in another road, and a road can
 * have a side door partway along it. The descent finishes at the mouth of
 * hell; the open country has a stair down into the catacombs.
 *
 * Three rules hold it together:
 *
 * - **A gate is a place, not a menu.** It stands on the floor with its own
 *   picture — the library has a distinct mouth for every branch DCSS ever had
 *   — so the player sees «that is a way into somewhere else» before reading a
 *   word of it.
 * - **It leads somewhere harder.** Catacombs are a step up from open country;
 *   hell is a step up from everything. A gate never leads down into an easier
 *   place, because then it would be a shortcut rather than a decision.
 * - **Nothing is one-way by accident.** Every branch keeps its own stairs up
 *   and its own way back to the city, so walking through a gate is a choice
 *   about where to go next, never a door that locks behind you.
 */

/** Where each road's mouth is, and what it looks like standing there. */
export const BRANCH_GATES = Object.freeze([
  Object.freeze({
    id: 'hell-mouth',
    from: 'deep',
    to: 'hell',
    // The end of the written road. The warden falls, the road runs out, and
    // what is past it is not more of the same.
    depth: 18,
    path: 'dngn/gateways/enter_hell1.png',
    name: Object.freeze({ ru: 'Врата ада', en: 'The gate of hell' }),
    description: Object.freeze({
      ru: 'Дальше дороги нет. Есть только то, что за ней.',
      en: 'The road ends here. What is past it is not a road.',
    }),
    enter: Object.freeze({ ru: 'Войти в ад', en: 'Enter hell' }),
  }),
  Object.freeze({
    id: 'crypt-stair',
    from: 'surface',
    to: 'crypt',
    // Halfway along the open country: a graveyard with steps going down.
    depth: 9,
    path: 'dngn/gateways/enter_crypt.png',
    name: Object.freeze({ ru: 'Спуск в катакомбы', en: 'Stair to the catacombs' }),
    description: Object.freeze({
      ru: 'Под кладбищем есть ярусы. Их закладывали не для живых.',
      en: 'There are tiers under the graveyard. They were not built for the living.',
    }),
    enter: Object.freeze({ ru: 'Спуститься', en: 'Go down' }),
  }),
]);

export const BRANCH_GATE_PATHS = Object.freeze(BRANCH_GATES.map(({ path }) => path));

/** The gate this floor carries, or null. One floor never carries two. */
export function branchGateFor(branch, depth) {
  if (typeof branch !== 'string' || !Number.isInteger(depth)) return null;
  return BRANCH_GATES.find((gate) => gate.from === branch && gate.depth === depth) ?? null;
}

/** Every gate that leads INTO this road, for anything that needs the reverse. */
export function gatesInto(branch) {
  return Object.freeze(BRANCH_GATES.filter((gate) => gate.to === branch));
}

export function branchGateCopy(gate, language = 'ru') {
  if (!gate) return null;
  const key = language === 'en' ? 'en' : 'ru';
  return Object.freeze({
    name: gate.name[key],
    description: gate.description[key],
    enter: gate.enter[key],
  });
}

/**
 * How hard a road is, as a plain multiplier on what its monsters are worth
 * being. Ivan: «чтобы адская ветка была сложной, реально, чтобы сложно было,
 * чтобы там другие ветки были попроще <...> и логично их нужно расставить».
 *
 * The order is the order a player meets them: the open country is the gentle
 * one you can walk out of town into, the descent is the measure everything
 * else is judged against, the vaults and the catacombs ask more, and hell is
 * not a difficulty setting — it is a different game with the same controls.
 */
export const BRANCH_DIFFICULTY = Object.freeze({
  surface: 0.85,
  deep: 1,
  vaults: 1.15,
  crypt: 1.2,
  hell: 1.6,
});

export function branchDifficulty(branch) {
  return BRANCH_DIFFICULTY[branch] ?? 1;
}
