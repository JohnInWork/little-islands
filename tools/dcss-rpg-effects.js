export const ACTOR_EFFECT_IDS = Object.freeze(['burning', 'wet', 'chilled', 'frozen', 'poison']);

export const MAX_EFFECT_DURATION = 60;

/**
 * Every state says what it does to whoever is carrying it.
 *
 * A badge with a picture and a number tells the player that something is wrong
 * and nothing else — and «what does this icon mean» cannot be answered by
 * hovering on a phone. The sentence belongs with the rule, next to the numbers
 * it describes, so the two cannot drift apart.
 */
export const ACTOR_EFFECTS = Object.freeze({
  burning: Object.freeze({
    id: 'burning',
    icon: 'dngn/altars/makhleb_flame5.png',
    color: '#f07a38',
    damagePerPulse: 2,
    moveSpeed: 1,
    labels: Object.freeze({ ru: 'Горение', en: 'Burning' }),
    descriptions: Object.freeze({
      ru: 'Огонь отнимает здоровье, пока не погаснет. Вода тушит его сразу.',
      en: 'Fire takes health until it burns out. Water puts it out at once.',
    }),
  }),
  wet: Object.freeze({
    id: 'wet',
    icon: 'dngn/blue_fountain2.png',
    color: '#63b8ca',
    damagePerPulse: 0,
    moveSpeed: 0.96,
    labels: Object.freeze({ ru: 'Мокрый', en: 'Wet' }),
    descriptions: Object.freeze({
      ru: 'Двигаешься чуть медленнее. Огонь гаснет, а молния бьёт вдвое.',
      en: 'Slightly slower. Fire goes out on you, and lightning strikes twice as hard.',
    }),
  }),
  chilled: Object.freeze({
    id: 'chilled',
    icon: 'item/ring/i-ice.png',
    color: '#9edfe4',
    damagePerPulse: 0,
    moveSpeed: 0.74,
    labels: Object.freeze({ ru: 'Озноб', en: 'Chilled' }),
    descriptions: Object.freeze({
      ru: 'Движение сильно замедлено. На мокром холод держится дольше.',
      en: 'Movement is badly slowed, and cold lasts longer on someone wet.',
    }),
  }),
  frozen: Object.freeze({
    id: 'frozen',
    icon: 'item/ring/i-ice.png',
    color: '#d7ffff',
    damagePerPulse: 0,
    moveSpeed: 0,
    labels: Object.freeze({ ru: 'Заморозка', en: 'Frozen' }),
    descriptions: Object.freeze({
      ru: 'Не двинуться с места, пока лёд не отпустит.',
      en: 'You cannot move at all until the ice lets go.',
    }),
  }),
  poison: Object.freeze({
    id: 'poison',
    icon: 'item/ring/i-r-poison.png',
    color: '#86b84f',
    damagePerPulse: 1,
    moveSpeed: 1,
    labels: Object.freeze({ ru: 'Отравление', en: 'Poisoned' }),
    descriptions: Object.freeze({
      ru: 'Яд отнимает здоровье понемногу, пока не выйдет.',
      en: 'Venom takes health a little at a time until it runs out.',
    }),
  }),
});

function boundedDuration(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_EFFECT_DURATION, Math.max(0, value));
}

export function createActorEffects(source = {}) {
  return Object.fromEntries(ACTOR_EFFECT_IDS.map((id) => [id, boundedDuration(source?.[id])]));
}

export function validateActorEffects(effects) {
  if (!effects || typeof effects !== 'object' || Array.isArray(effects)) return false;
  if (Object.keys(effects).some((id) => !ACTOR_EFFECT_IDS.includes(id))) return false;
  return ACTOR_EFFECT_IDS.every(
    (id) => Number.isFinite(effects[id]) && effects[id] >= 0 && effects[id] <= MAX_EFFECT_DURATION,
  );
}

export function activeActorEffects(effects, language = 'ru') {
  const normalized = createActorEffects(effects);
  const locale = language === 'en' ? 'en' : 'ru';
  return ACTOR_EFFECT_IDS.filter((id) => normalized[id] > 0).map((id) => {
    const definition = ACTOR_EFFECTS[id];
    return Object.freeze({
      ...definition,
      duration: normalized[id],
      label: definition.labels[locale],
      description: definition.descriptions[locale],
    });
  });
}

export function actorEffectModifiers(effects, { cryomancyRank = 0 } = {}) {
  const normalized = createActorEffects(effects);
  const frostRank = Math.max(0, Math.min(3, Number.isInteger(cryomancyRank) ? cryomancyRank : 0));
  if (normalized.frozen > 0) return Object.freeze({ moveSpeed: 0 });
  let moveSpeed = 1;
  for (const id of ACTOR_EFFECT_IDS) {
    if (normalized[id] > 0) moveSpeed *= ACTOR_EFFECTS[id].moveSpeed;
  }
  if (normalized.wet > 0 && normalized.chilled > 0) moveSpeed *= 0.84;
  if (normalized.chilled > 0 && frostRank > 0) {
    moveSpeed *= [1, 0.84, 0.8, 0.76][frostRank];
  }
  return Object.freeze({ moveSpeed: Math.max(0.45, moveSpeed) });
}

export function applyActorEffect(effects, id, duration) {
  if (!ACTOR_EFFECT_IDS.includes(id)) throw new Error(`Unknown actor effect: ${id}`);
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_EFFECT_DURATION) {
    throw new TypeError('Actor effect duration is out of bounds');
  }

  const next = createActorEffects(effects);
  const cleared = [];
  let reaction = null;

  if (id === 'wet' && next.burning > 0) {
    next.burning = 0;
    cleared.push('burning');
    reaction = 'steam';
  } else if (id === 'burning' && next.wet > 0) {
    next.wet = 0;
    cleared.push('wet');
    reaction = 'steam';
    return Object.freeze({
      effects: next,
      applied: null,
      cleared: Object.freeze(cleared),
      reaction,
    });
  }

  const adjustedDuration = id === 'chilled' && next.wet > 0 ? duration * 1.5 : duration;
  next[id] = Math.max(next[id], boundedDuration(adjustedDuration));
  return Object.freeze({
    effects: next,
    applied: id,
    cleared: Object.freeze(cleared),
    reaction,
  });
}

/**
 * Clears the named effects, or all of them when nothing is named. Spells that
 * burn the cold out of a hero take only what they are aimed at: `applyActorEffect`
 * cannot do this — a duration of zero is out of its bounds by design, because
 * applying an effect for no time at all is a mistake, not a way to remove one.
 */
export function clearActorEffects(effects, ids = ACTOR_EFFECT_IDS) {
  for (const id of ids) {
    if (!ACTOR_EFFECT_IDS.includes(id)) throw new Error(`Unknown actor effect: ${id}`);
  }
  const next = createActorEffects(effects);
  const cleared = ACTOR_EFFECT_IDS.filter((id) => next[id] > 0 && ids.includes(id));
  for (const id of cleared) next[id] = 0;
  return Object.freeze({ effects: Object.freeze(next), cleared: Object.freeze(cleared) });
}

export function tickActorEffects(effects, delta) {
  if (!Number.isFinite(delta) || delta < 0 || delta > 1) {
    throw new TypeError('Actor effect tick requires a delta between zero and one second');
  }
  const before = createActorEffects(effects);
  const next = createActorEffects(before);
  const expired = [];
  let damage = 0;
  const pulses = {};

  for (const id of ACTOR_EFFECT_IDS) {
    if (before[id] <= 0) continue;
    next[id] = Math.max(0, before[id] - delta);
    const pulseCount = Math.max(0, Math.ceil(before[id]) - Math.ceil(next[id]));
    if (pulseCount > 0) {
      pulses[id] = pulseCount;
      damage += pulseCount * ACTOR_EFFECTS[id].damagePerPulse;
    }
    if (next[id] === 0) expired.push(id);
  }

  return Object.freeze({
    effects: next,
    damage,
    pulses: Object.freeze(pulses),
    expired: Object.freeze(expired),
    modifiers: actorEffectModifiers(next),
  });
}

export function monsterInfliction(monster) {
  const infliction = monster?.inflicts;
  if (!infliction) return null;
  if (
    !ACTOR_EFFECT_IDS.includes(infliction.id) ||
    !Number.isFinite(infliction.duration) ||
    infliction.duration <= 0 ||
    infliction.duration > MAX_EFFECT_DURATION
  ) {
    throw new Error(`Invalid monster effect for ${monster?.id ?? 'unknown monster'}`);
  }
  return Object.freeze({ id: infliction.id, duration: infliction.duration });
}
