/**
 * Sleep, and why it is mandatory without ever killing anybody.
 *
 * Hunger is already a clock that ends a run: the bar empties and takes health
 * until something is eaten. A second clock of that kind on top would not make
 * the game deeper — it would make the player manage two meters instead of
 * playing, which is the exact complaint that gets levelled at survival systems.
 *
 * So rest is a different kind of obligation. It does not gate SURVIVAL, it
 * gates LEARNING: skill points earned on the road pile up and cannot be spent
 * until the hero has slept on them. You never die of not sleeping, and you
 * always want to sleep, because otherwise you are carrying points you cannot
 * use. That turns the camp, the bed at home and a room over a tavern from
 * optional healing into the place a run goes to cash in what it learned.
 *
 * The softer half is readability: a hero who has been awake too long sees less
 * of what the floor hid. It costs no health and it never traps anybody — it
 * just makes the dungeon harder to read until the next bedroll.
 */

/** How long the hero stays sharp, in the same active seconds hunger counts. */
export const REST_MAX = 45 * 60;

export const REST_TUNING = Object.freeze({
  // Below this the floor starts to blur; below the second, it blurs more.
  wearyAt: 15 * 60,
  spentAt: 5 * 60,
});

const STAGES = Object.freeze({
  rested: Object.freeze({
    id: 'rested',
    searchPercent: 100,
    labels: Object.freeze({ ru: 'Выспался', en: 'Rested' }),
    descriptions: Object.freeze({
      ru: 'Ясная голова: очки навыков можно вкладывать.',
      en: 'A clear head: skill points can be spent.',
    }),
  }),
  weary: Object.freeze({
    id: 'weary',
    searchPercent: 70,
    labels: Object.freeze({ ru: 'Устал', en: 'Weary' }),
    descriptions: Object.freeze({
      ru: 'Тайники и ловушки замечаются хуже. Вкладывать очки уже нельзя.',
      en: 'Caches and traps are harder to notice. Points can no longer be spent.',
    }),
  }),
  spent: Object.freeze({
    id: 'spent',
    searchPercent: 40,
    labels: Object.freeze({ ru: 'Без сил', en: 'Spent' }),
    descriptions: Object.freeze({
      ru: 'Мир читается плохо. Нужен сон — в лагере, дома или на постоялом дворе.',
      en: 'The floor barely reads. Sleep is needed: a camp, a bed at home, or an inn.',
    }),
  }),
});

export const REST_STAGE_IDS = Object.freeze(Object.keys(STAGES));

export function validateRest(value) {
  return Number.isInteger(value) && value >= 0 && value <= REST_MAX;
}

export function restStage(value) {
  if (!validateRest(value)) return STAGES.rested;
  if (value > REST_TUNING.wearyAt) return STAGES.rested;
  if (value > REST_TUNING.spentAt) return STAGES.weary;
  return STAGES.spent;
}

export function advanceRest(value, activeSeconds) {
  if (!validateRest(value) || !Number.isInteger(activeSeconds) || activeSeconds < 0) {
    throw new TypeError('Rest tick requires valid integer seconds');
  }
  return Math.max(0, value - activeSeconds);
}

/**
 * The whole point: a tired hero keeps everything they earned and can spend
 * none of it. Nothing is lost and nothing is at risk — the points wait.
 */
export function canSpendSkillPoints(value) {
  return restStage(value).id === 'rested';
}

/** What a night is worth. Sleeping always fills it: a half-night is not a thing. */
export function sleep(value) {
  if (!validateRest(value)) return Object.freeze({ ok: false, reason: 'invalid', rest: REST_MAX });
  if (value >= REST_MAX) return Object.freeze({ ok: false, reason: 'already-rested', rest: value });
  return Object.freeze({ ok: true, reason: 'slept', rest: REST_MAX, restored: REST_MAX - value });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    needSleep: 'Сначала выспись',
    slept: 'Выспался',
  }),
  en: Object.freeze({
    needSleep: 'Sleep on it first',
    slept: 'Rested',
  }),
});

export function restCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function restPresentation(value, requestedLanguage = 'ru') {
  if (!validateRest(value)) throw new TypeError('Rest presentation requires a valid value');
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  const stage = restStage(value);
  const minutes = Math.ceil(value / 60);
  return Object.freeze({
    id: stage.id,
    label: stage.labels[language],
    description: stage.descriptions[language],
    percent: Math.round((value / REST_MAX) * 100),
    minutes,
    canSpendSkillPoints: stage.id === 'rested',
    ariaLabel: language === 'ru'
      ? `Бодрость: ${stage.labels.ru}, примерно ${minutes} мин.`
      : `Rest: ${stage.labels.en}, about ${minutes} min.`,
  });
}
