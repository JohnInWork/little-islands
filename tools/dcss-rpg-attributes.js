/**
 * Three numbers that say what kind of hero this is.
 *
 * Until now a level gave exactly one thing — a skill point — and the only way
 * to spend it was to buy a rank. That makes every hero the same shape: a list
 * of purchases with no trunk to hang them on. Ivan asked for the trunk:
 * «три характеристики: сила, ловкость, интеллект. На новом уровне очки можно
 * вложить просто в характеристику, а не обязательно в навык. Первые уровни
 * навыков берутся свободно, дальше требуют характеристику по смыслу: топоры —
 * силу, и так далее».
 *
 * So there is one pool and two things to spend it on. A point put into a
 * skill buys a rank; a point put into an attribute raises it by one and can
 * never be taken back. Nothing is wasted either way, because an attribute is
 * what the later ranks of a skill ask for: the first rank of almost everything
 * is free, and the second and third want a number the hero had to grow.
 *
 * The three are deliberately ordinary. Strength swings and carries, agility
 * aims and slips past, intelligence knows and casts. A skill belongs to
 * exactly one of them, chosen by what the hand or the head actually does —
 * `SKILL_ATTRIBUTES` below is that list, and it covers every skill in the
 * catalogue, because a skill with no attribute would quietly be free forever.
 */

/** In the order they are shown, and the order they are read out loud. */
export const ATTRIBUTE_IDS = Object.freeze(['strength', 'agility', 'intelligence']);

/** Where everyone starts. The build preset may hand out more intelligence. */
export const ATTRIBUTE_BASE = 3;
/** Nobody needs more than this, and a save claiming more is a broken save. */
export const ATTRIBUTE_MAX = 40;

/**
 * What the second and third rank of an ordinary skill ask for. The first is
 * free — that is the half of Ivan's sentence that matters most, because a hero
 * who has chosen nothing yet must still be able to try things.
 */
export const DEFAULT_RANK_REQUIREMENTS = Object.freeze([0, 5, 7]);

export const ATTRIBUTE_COPY = Object.freeze({
  ru: Object.freeze({
    strength: Object.freeze({
      name: 'Сила',
      short: 'СИЛ',
      description: 'Тяжёлое оружие, щит, ноша и выносливость. Её просят мечи, топоры, копья и кузня.',
    }),
    agility: Object.freeze({
      name: 'Ловкость',
      short: 'ЛОВ',
      description: 'Точность, скорость и тихий шаг. Её просят кинжалы, лук, замки, ловушки и скрытность.',
    }),
    intelligence: Object.freeze({
      name: 'Интеллект',
      short: 'ИНТ',
      description: 'Знание и магия. Его просят все школы, алхимия, зачарование и лекарство.',
    }),
    raise: 'Поднять',
    pointsLeft: 'Очков',
    requires: (name, value) => `Нужно ${name} ${value}`,
    spent: 'Вложено',
  }),
  en: Object.freeze({
    strength: Object.freeze({
      name: 'Strength',
      short: 'STR',
      description: 'Heavy weapons, shields, load and stamina. Swords, axes, spears and the forge ask for it.',
    }),
    agility: Object.freeze({
      name: 'Agility',
      short: 'AGI',
      description: 'Aim, speed and a quiet step. Daggers, bows, locks, traps and stealth ask for it.',
    }),
    intelligence: Object.freeze({
      name: 'Intelligence',
      short: 'INT',
      description: 'Knowledge and magic. Every school, the forge and medicine ask for it.',
    }),
    raise: 'Raise',
    pointsLeft: 'Points',
    requires: (name, value) => `Requires ${name} ${value}`,
    spent: 'Invested',
  }),
});

/**
 * Which attribute each skill leans on.
 *
 * Every skill in the catalogue is here on purpose: a missing entry would mean
 * a skill whose higher ranks cost nothing but a point, and the test beside
 * this file refuses that. Magic is the one lopsided group, and it should be —
 * eight schools all draw on the same head.
 */
export const SKILL_ATTRIBUTES = Object.freeze({
  // Hands and shoulders.
  swords: 'strength',
  axes: 'strength',
  'blunt-weapons': 'strength',
  spears: 'strength',
  shield: 'strength',
  endurance: 'strength',
  portering: 'strength',
  'pack-leader': 'strength',

  // Fingers and feet.
  daggers: 'agility',
  marksmanship: 'agility',
  'whip-control': 'agility',
  mobility: 'agility',
  stealth: 'agility',
  lockpicking: 'agility',
  salvaging: 'agility',

  // Head.
  traps: 'agility',
  'secret-search': 'intelligence',
  appraisal: 'intelligence',
  'staff-channeling': 'intelligence',
  pyromancy: 'intelligence',
  cryomancy: 'intelligence',
  'storm-magic': 'intelligence',
  necromancy: 'intelligence',
  arcana: 'intelligence',
  cleansing: 'intelligence',
  cooking: 'intelligence',
  'field-medicine': 'intelligence',
  poisoncraft: 'intelligence',
  taming: 'intelligence',
});

function boundedAttribute(value) {
  if (!Number.isInteger(value)) return ATTRIBUTE_BASE;
  return Math.max(1, Math.min(ATTRIBUTE_MAX, value));
}

/**
 * The hero's three numbers plus a count of the points that bought them.
 *
 * The count is not a derived value: the base a run started from depends on the
 * build preset, so there is no way back from the totals alone, and the level's
 * bookkeeping — every point is either unspent, in a skill, or in an attribute
 * — needs an exact number.
 */
export function createAttributeState(source = {}) {
  return {
    strength: boundedAttribute(source.strength ?? ATTRIBUTE_BASE),
    agility: boundedAttribute(source.agility ?? ATTRIBUTE_BASE),
    intelligence: boundedAttribute(source.intelligence ?? ATTRIBUTE_BASE),
    spent: Number.isInteger(source.spent) && source.spent >= 0 ? source.spent : 0,
  };
}

export function validateAttributeState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
  if (Object.keys(state).sort().join(',') !== 'agility,intelligence,spent,strength') return false;
  if (!Number.isInteger(state.spent) || state.spent < 0 || state.spent > 998) return false;
  return ATTRIBUTE_IDS.every((id) => (
    Number.isInteger(state[id]) && state[id] >= 1 && state[id] <= ATTRIBUTE_MAX
  ));
}

export function cloneAttributeState(state) {
  return createAttributeState(state ?? {});
}

/** What a skill's rank asks for, or null when it asks for nothing. */
export function skillRankRequirement(definition, rank) {
  if (!definition || !Number.isInteger(rank) || rank < 0) return null;
  const attribute = SKILL_ATTRIBUTES[definition.id] ?? null;
  // A skill may carry its own ladder — the magic schools do — and then that
  // ladder wins, because it was authored for that school.
  const authored = definition.attributeRequirements ?? null;
  if (authored) {
    for (const id of ATTRIBUTE_IDS) {
      const value = authored[id]?.[rank];
      if (Number.isFinite(value) && value > 0) return Object.freeze({ attribute: id, value });
    }
    return null;
  }
  if (!attribute) return null;
  const value = DEFAULT_RANK_REQUIREMENTS[rank];
  return Number.isFinite(value) && value > 0 ? Object.freeze({ attribute, value }) : null;
}

/** Does the hero meet it? A missing requirement is met by everybody. */
export function meetsRequirement(requirement, attributes = {}) {
  if (!requirement) return true;
  return (attributes[requirement.attribute] ?? 0) >= requirement.value;
}

/**
 * Raising one. A point leaves the pool and never comes back — an attribute is
 * a decision about the hero, and undoing it would make it a menu instead.
 */
export function raiseAttribute({ attributes, points, attribute, runStatus = 'playing' } = {}) {
  const refuse = (reason) => Object.freeze({ ok: false, reason, attributes, points });
  if (runStatus !== 'playing') return refuse('not-playing');
  if (!validateAttributeState(attributes)) return refuse('invalid-state');
  if (!ATTRIBUTE_IDS.includes(attribute)) return refuse('unknown-attribute');
  if (!Number.isInteger(points) || points < 1) return refuse('no-points');
  if (attributes[attribute] >= ATTRIBUTE_MAX) return refuse('at-maximum');
  return Object.freeze({
    ok: true,
    reason: 'raised',
    attribute,
    attributes: createAttributeState({
      ...attributes,
      [attribute]: attributes[attribute] + 1,
      spent: attributes.spent + 1,
    }),
    points: points - 1,
  });
}

const REFUSAL_TEXT = Object.freeze({
  ru: Object.freeze({
    'not-playing': 'Не сейчас',
    'no-points': 'Нет очков',
    'at-maximum': 'Дальше некуда',
    'unknown-attribute': 'Такой характеристики нет',
    'invalid-state': 'Не сейчас',
  }),
  en: Object.freeze({
    'not-playing': 'Not now',
    'no-points': 'No points left',
    'at-maximum': 'Already at the maximum',
    'unknown-attribute': 'No such attribute',
    'invalid-state': 'Not now',
  }),
});

export function attributeRefusalText(reason, language = 'ru') {
  const table = REFUSAL_TEXT[language === 'en' ? 'en' : 'ru'];
  return table[reason] ?? '';
}

export function attributeCopy(language = 'ru') {
  return ATTRIBUTE_COPY[language === 'en' ? 'en' : 'ru'];
}
