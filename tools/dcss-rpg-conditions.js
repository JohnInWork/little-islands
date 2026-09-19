/**
 * Two rules the dungeon lives by this run, and only this run.
 *
 * Difficulty was a slider of numbers: the same nine floors, only harder. What a
 * roguelike actually replays on is a run with its own shape — something you can
 * say out loud before you start. So every seed draws two conditions, and they
 * are visible before the first step, not discovered on floor four.
 *
 * Each one gives and takes, because a condition that only takes is difficulty
 * wearing a hat. Crowded floors pay better. Blind halls are blind for the
 * monsters too. A poor seam holds better metal.
 *
 * Two hard rules, both enforced by tests rather than by good intentions:
 *
 * 1. **A condition may never touch a promise.** The gear on the first floor,
 *    the first spell book, the artefact, the chapter guardian and the run's
 *    food supply are owed to every run, whatever the dungeon feels like today.
 *    Nothing here reaches them — supplies especially, which rot the moment they
 *    depend on a weight (see the note in `dcss-rpg-biome-content.js`).
 * 2. **Two conditions may never touch the same knob.** They are multipliers on
 *    a shared world; stacking two onto one number makes a run nobody designed.
 *    The draw rejects any pair whose effects overlap — which is why conditions
 *    declare their effects as data instead of as code.
 */

/**
 * How many rules a run lives by — nought, for now.
 *
 * «Убрать условия забега из стартового меню. Пока все забеги с одинаковыми
 * условиями.» Two conditions on top of a game the player is still learning is
 * two variables they cannot separate from the dungeon itself. The catalogue,
 * the draw and the effects all stay exactly as they are and are still tested:
 * this is the one number that turns them back on, and «пока» is Ivan's word.
 */
export const CONDITIONS_PER_RUN = 0;

/** Every knob a condition may turn, and what it means to leave it alone. */
export const NEUTRAL_EFFECTS = Object.freeze({
  monsterCountScale: 1,
  eventScale: 1,
  waterChance: null,
  goldScale: 1,
  revealRadiusDelta: 0,
  monsterVisionDelta: 0,
  monsterSpeedScale: 1,
  heroSpeedScale: 1,
  hungerScale: 1,
  foodHealingScale: 1,
});

/**
 * The knobs a condition may never have, and the reason it may never have them.
 *
 * Food is drawn from the same pool as everything else, so ANY hand on the size
 * or the quality of a floor's loot moves the run's food supply with it. The
 * first draft of this catalogue had two such hands, and measured across 1200
 * runs the supply ran from 17 minutes to 66 against a baseline of 34 — the
 * bread's old failure, wearing a third hat. Conditions therefore bend danger,
 * sight, speed, water, mechanisms and gold; the loot layer is not theirs to
 * touch. What is scarce this run is a promise, not a mood.
 */
export const FORBIDDEN_KNOBS = Object.freeze(['lootCountDelta', 'qualityScale']);

const define = (id, ru, en, effects) => Object.freeze({
  id,
  name: Object.freeze({ ru: ru.name, en: en.name }),
  gives: Object.freeze({ ru: ru.gives, en: en.gives }),
  takes: Object.freeze({ ru: ru.takes, en: en.takes }),
  effects: Object.freeze({ ...effects }),
});

export const CONDITION_CATALOG = Object.freeze([
  define(
    'crowded',
    { name: 'Тесно', takes: 'Монстров заметно больше', gives: 'Каждый несёт больше золота' },
    { name: 'Crowded', takes: 'Many more monsters', gives: 'Each carries more gold' },
    { monsterCountScale: 1.4, goldScale: 1.6 },
  ),
  define(
    'still-halls',
    { name: 'Мёртвая тишина', takes: 'В подземелье почти нечего взять', gives: 'Зато монстров заметно меньше' },
    { name: 'Still halls', takes: 'Little coin down there', gives: 'But far fewer monsters' },
    { monsterCountScale: 0.62, goldScale: 0.7 },
  ),
  define(
    'swift-tide',
    { name: 'Всё спешит', takes: 'Монстры быстрее', gives: 'И герой быстрее' },
    { name: 'Swift tide', takes: 'Monsters move faster', gives: 'So does the hero' },
    { monsterSpeedScale: 1.18, heroSpeedScale: 1.18 },
  ),
  define(
    'deep-dark',
    { name: 'Глухая темнота', takes: 'Видно на клетку меньше', gives: 'Зато и тебя замечают позже' },
    { name: 'Deep dark', takes: 'One tile less sight', gives: 'They notice you later too' },
    { revealRadiusDelta: -1, monsterVisionDelta: -1.6 },
  ),
  define(
    'long-shadows',
    { name: 'Длинные тени', takes: 'Тебя замечают издалека', gives: 'Зато и видно на клетку дальше' },
    { name: 'Long shadows', takes: 'They see you from far off', gives: 'But you see one tile further' },
    { revealRadiusDelta: 1, monsterVisionDelta: 2.2 },
  ),
  define(
    'high-water',
    { name: 'Большая вода', takes: 'Затопленные залы почти везде', gives: 'Зато в воде тебя хуже видно' },
    { name: 'High water', takes: 'Flooded halls nearly everywhere', gives: 'But water hides you' },
    // Wading is already slow — the terrain says so. What water adds is cover.
    { waterChance: 1, monsterVisionDelta: -1.2 },
  ),
  define(
    'sprung',
    { name: 'Всё на взводе', takes: 'Механизмов и ловушек вдвое больше', gives: 'И стерегут они больше золота' },
    { name: 'Sprung', takes: 'Twice the mechanisms', gives: 'And they guard more gold' },
    { eventScale: 1.9, goldScale: 1.4 },
  ),
  define(
    'lean-year',
    { name: 'Голодный год', takes: 'Голод идёт в полтора раза быстрее', gives: 'Зато еда лечит вдвое' },
    { name: 'Lean year', takes: 'Hunger comes half again as fast', gives: 'But food heals twice over' },
    { hungerScale: 1.5, foodHealingScale: 2 },
  ),
]);

export const CONDITION_IDS = Object.freeze(CONDITION_CATALOG.map(({ id }) => id));

const BY_ID = new Map(CONDITION_CATALOG.map((condition) => [condition.id, condition]));

export function conditionById(id) {
  return BY_ID.get(id) ?? null;
}

const touches = (condition) => Object.keys(condition.effects);

const overlap = (left, right) => touches(left).some((key) => touches(right).includes(key));

/**
 * Which two rules this run lives by. Drawn from the RUN seed, so the whole run
 * agrees without anything being stored, and so a shared seed — the daily one
 * above all — is the same dungeon under the same conditions for everyone.
 */
export function runConditions(seed, count = CONDITIONS_PER_RUN) {
  if (!Number.isInteger(seed) || seed < 0) return [];
  if (!Number.isInteger(count) || count <= 0) return [];
  const order = [...CONDITION_CATALOG];
  // Fisher-Yates on a stream of its own, so adding a condition to the catalogue
  // does not quietly re-deal every existing seed's other choices.
  let state = (seed ^ 0x5bf03635) >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  const drawn = [];
  for (const condition of order) {
    if (drawn.length === count) break;
    if (drawn.some((chosen) => overlap(chosen, condition))) continue;
    drawn.push(condition);
  }
  return Object.freeze(drawn.map(({ id }) => id).sort());
}

/** One record the whole game reads, so no consumer has to know what is in play. */
export function conditionEffects(ids = []) {
  const effects = { ...NEUTRAL_EFFECTS };
  for (const id of ids) {
    const condition = conditionById(id);
    if (!condition) continue;
    for (const [key, value] of Object.entries(condition.effects)) effects[key] = value;
  }
  return Object.freeze(effects);
}

/**
 * What a floor is actually made of once its run's conditions are applied. The
 * profile still governs — this only bends it — and it is one function so the
 * generator and everything that checks the generator read the same numbers.
 */
export function conditionedFloor(scaling, effects = NEUTRAL_EFFECTS) {
  return Object.freeze({
    monsterCount: Math.max(
      2,
      Math.round(scaling.encounters.monsterCount * effects.monsterCountScale),
    ),
    // Never below two: the trapped chest turns one mechanism into its trap, and
    // a scenario that cannot be built is a promise broken.
    eventCount: Math.max(2, Math.round(scaling.layout.eventCount * effects.eventScale)),
    // Untouched on purpose — see FORBIDDEN_KNOBS. Returned here anyway so that
    // one function answers "what did this floor actually get" for everything.
    lootCount: scaling.rewards.lootCount,
    qualityBudget: scaling.rewards.qualityBudget,
  });
}

export function conditionCopy(id, language = 'ru') {
  const condition = conditionById(id);
  if (!condition) return null;
  const key = language === 'en' ? 'en' : 'ru';
  return Object.freeze({
    name: condition.name[key],
    takes: condition.takes[key],
    gives: condition.gives[key],
  });
}

/** The guard: a catalogue that cannot be drawn from is a catalogue with a bug. */
export function conditionProblems() {
  const problems = [];
  const knobs = Object.keys(NEUTRAL_EFFECTS);
  for (const condition of CONDITION_CATALOG) {
    if (touches(condition).length < 2) problems.push(`${condition.id}:one-sided`);
    for (const key of touches(condition)) {
      if (FORBIDDEN_KNOBS.includes(key)) problems.push(`${condition.id}:forbidden-knob:${key}`);
      else if (!knobs.includes(key)) problems.push(`${condition.id}:unknown-knob:${key}`);
    }
    const partners = CONDITION_CATALOG.filter((other) => (
      other.id !== condition.id && !overlap(condition, other)
    ));
    if (partners.length === 0) problems.push(`${condition.id}:cannot-be-drawn-with-anything`);
  }
  return problems;
}
