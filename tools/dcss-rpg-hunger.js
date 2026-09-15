export const HUNGER_MAX = 60 * 60;
export const HUNGER_TUNING = Object.freeze({
  mildAt: 40 * 60,
  strongAt: 20 * 60,
  starvingAt: 5 * 60,
  autosaveEvery: 15,
});

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
  return STAGES.starving;
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
