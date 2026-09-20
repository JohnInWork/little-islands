/**
 * Hunger, and what makes it a clock rather than a debuff.
 *
 * It used to bottom out and stop: at zero the hero simply kept walking at
 * −45 % attack forever. Nothing forced a decision, so food was something you
 * ate when you remembered to, and a supply run had no failure state at all.
 *
 * Three things changed that, and they are all here rather than in the adapter:
 *
 * - **Empty kills.** At zero the bar starts taking health, and it does not
 *   stop until something is eaten. That is the whole difference between a
 *   penalty and a clock.
 * - **The clock runs on what you do.** A second of walking costs a second; a
 *   swing and a spell cost more. A long fight is expensive, and going round a
 *   room is now worth something beyond the risk it avoids.
 * - **You cannot eat in reach of a monster.** Food is planning, not a button
 *   you press when the bar goes red.
 */
export const HUNGER_MAX = 60 * 60;
export const HUNGER_TUNING = Object.freeze({
  mildAt: 40 * 60,
  strongAt: 20 * 60,
  starvingAt: 5 * 60,
  autosaveEvery: 15,
});

/**
 * What an action costs the clock, in seconds, on top of the time it took.
 *
 * Deliberately small per action and large over a fight: thirty swings is close
 * to a minute of the bar, which is what makes «walk round that room» a real
 * answer rather than cowardice.
 */
export const HUNGER_COST = Object.freeze({
  strike: 1.5,
  spell: 4,
});

/**
 * Starving takes health, in a share of the hero's own maximum so it stays a
 * threat at every level, and slowly enough to be a warning rather than an
 * ambush: about a minute from full health to dead if it is ignored completely.
 */
export const STARVATION_TICK_SECONDS = 5;
export const STARVATION_DAMAGE_PERCENT = 8;

const STAGES = Object.freeze({
  fed: Object.freeze({
    id: 'fed',
    modifiers: Object.freeze({ attack: 1, defense: 1, moveSpeed: 1, attackSpeed: 1 }),
    labels: Object.freeze({ ru: 'Сыт', en: 'Fed' }),
    descriptions: Object.freeze({
      ru: 'Голод не влияет на характеристики.',
      en: 'Hunger does not affect your stats.',
    }),
  }),
  mild: Object.freeze({
    id: 'mild',
    modifiers: Object.freeze({ attack: 0.95, defense: 0.95, moveSpeed: 0.96, attackSpeed: 0.96 }),
    labels: Object.freeze({ ru: 'Лёгкий голод', en: 'Peckish' }),
    descriptions: Object.freeze({
      ru: 'Небольшое снижение боевого темпа и движения.',
      en: 'Slightly reduced combat tempo and movement.',
    }),
  }),
  strong: Object.freeze({
    id: 'strong',
    modifiers: Object.freeze({ attack: 0.82, defense: 0.8, moveSpeed: 0.86, attackSpeed: 0.86 }),
    labels: Object.freeze({ ru: 'Сильный голод', en: 'Hungry' }),
    descriptions: Object.freeze({
      ru: 'Атака, защита, движение и темп заметно снижены.',
      en: 'Attack, defence, movement and tempo are noticeably reduced.',
    }),
  }),
  starving: Object.freeze({
    id: 'starving',
    modifiers: Object.freeze({ attack: 0.55, defense: 0.5, moveSpeed: 0.7, attackSpeed: 0.65 }),
    labels: Object.freeze({ ru: 'Голодание', en: 'Starving' }),
    descriptions: Object.freeze({
      ru: 'Характеристики сильно снижены.',
      en: 'Stats are heavily reduced.',
    }),
  }),
  // An empty bar is a different thing from a nearly empty one, and the screen
  // has to say so: this is the state that is taking health right now.
  empty: Object.freeze({
    id: 'empty',
    modifiers: Object.freeze({ attack: 0.55, defense: 0.5, moveSpeed: 0.7, attackSpeed: 0.65 }),
    labels: Object.freeze({ ru: 'Голод убивает', en: 'Starving to death' }),
    descriptions: Object.freeze({
      ru: `Здоровье уходит: −${STARVATION_DAMAGE_PERCENT}% каждые ${STARVATION_TICK_SECONDS} с, пока не поешь.`,
      en: `Health is draining: −${STARVATION_DAMAGE_PERCENT}% every ${STARVATION_TICK_SECONDS}s until you eat.`,
    }),
  }),
});

export const HUNGER_STAGE_IDS = Object.freeze(Object.keys(STAGES));

export function validateHunger(value) {
  return Number.isInteger(value) && value >= 0 && value <= HUNGER_MAX;
}

export function hungerStage(value) {
  if (!validateHunger(value)) return STAGES.fed;
  if (value > HUNGER_TUNING.mildAt) return STAGES.fed;
  if (value > HUNGER_TUNING.strongAt) return STAGES.mild;
  if (value > HUNGER_TUNING.starvingAt) return STAGES.strong;
  return value > 0 ? STAGES.starving : STAGES.empty;
}

export function hungerStatModifiers(value) {
  return hungerStage(value).modifiers;
}

export function advanceHunger(value, activeSeconds) {
  if (!validateHunger(value) || !Number.isInteger(activeSeconds) || activeSeconds < 0) {
    throw new TypeError('Hunger tick requires valid integer seconds');
  }
  return Math.max(0, value - activeSeconds);
}

/**
 * What starving costs, over a stretch of time. Returns whole points of damage
 * and the seconds left over, so the caller carries the remainder instead of
 * rounding it away — a tick that rounds down never fires on a fast frame.
 */
export function starvationToll({ hunger, maxHp, seconds } = {}) {
  const idle = Object.freeze({ damage: 0, remainder: 0 });
  if (!validateHunger(hunger) || hunger > 0) return idle;
  if (!Number.isFinite(maxHp) || maxHp < 1 || !Number.isFinite(seconds) || seconds <= 0) return idle;
  const ticks = Math.floor(seconds / STARVATION_TICK_SECONDS);
  if (ticks < 1) return Object.freeze({ damage: 0, remainder: seconds });
  const perTick = Math.max(1, Math.round((maxHp * STARVATION_DAMAGE_PERCENT) / 100));
  return Object.freeze({
    damage: perTick * ticks,
    remainder: seconds - ticks * STARVATION_TICK_SECONDS,
  });
}

/**
 * Есть можно всегда, в том числе в драке.
 *
 * Запрет держался на честной мысли: жевать паёк на замахе — не дело, и еда
 * не должна быть кнопкой «полечиться». Но на этом правиле лечиться в бою
 * оказалось нечем вовсе: зелье в забеге одно, а еда — вот она, в мешке, и
 * игра её не давала ровно в ту минуту, когда она нужна. Иван решил: «еда
 * лечит в бою».
 *
 * Функция остаётся: отказ может понадобиться снова (сон, вода, оковы), и
 * вызов уже стоит на месте.
 */
export function canEatNow() {
  return Object.freeze({ ok: true, reason: 'clear' });
}

export function consumeFood({ hunger, hp, maxHp, nutrition, healing = 0 } = {}) {
  if (
    !validateHunger(hunger)
    || !Number.isFinite(hp)
    || !Number.isFinite(maxHp)
    || hp < 0
    || maxHp < 1
    || hp > maxHp
    || !Number.isInteger(nutrition)
    || nutrition < 1
    || !Number.isFinite(healing)
    || healing < 0
  ) throw new TypeError('Food use requires valid hunger, health and nutrition');

  const nextHunger = Math.min(HUNGER_MAX, hunger + nutrition);
  const nextHp = Math.min(maxHp, hp + healing);
  if (nextHunger === hunger && nextHp === hp) {
    return Object.freeze({ ok: false, reason: 'full' });
  }
  return Object.freeze({
    ok: true,
    restored: nextHunger - hunger,
    healed: nextHp - hp,
    state: Object.freeze({ hunger: nextHunger, hp: nextHp }),
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    threatened: 'Не поесть в бою',
    starving: 'Голод убивает',
  }),
  en: Object.freeze({
    threatened: 'Not while something is on you',
    starving: 'Starving',
  }),
});

export function hungerCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function hungerPresentation(value, requestedLanguage = 'ru') {
  if (!validateHunger(value)) throw new TypeError('Hunger presentation requires valid hunger');
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  const stage = hungerStage(value);
  const minutes = Math.ceil(value / 60);
  return Object.freeze({
    id: stage.id,
    label: stage.labels[language],
    description: stage.descriptions[language],
    percent: Math.round((value / HUNGER_MAX) * 100),
    minutes,
    ariaLabel: language === 'ru'
      ? `Сытость: ${stage.labels.ru}, примерно ${minutes} мин.`
      : `Satiety: ${stage.labels.en}, about ${minutes} min.`,
  });
}
