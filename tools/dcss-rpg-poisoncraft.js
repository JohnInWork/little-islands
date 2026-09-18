/**
 * Poisoncraft: what a careful hand does with a vial. A coating rides the blade
 * for a few strikes, and a bait sits on the floor waiting for something hungry.
 *
 * Neither is a bigger number. Both are time bought: the venom works while the
 * hero is doing something else.
 */

export const POISON_VIAL_ITEM_ID = 'poison-vial';
export const POISON_BAIT_ITEM_ID = 'poison-bait';

/** How many strikes carry the coating, and how long the venom then works. */
export const COATING_HITS = Object.freeze([0, 3, 5, 8]);
export const COATING_SECONDS = Object.freeze([0, 4, 6, 8]);
/** A bait is slower to find but bites harder when it does. */
export const BAIT_SECONDS = Object.freeze([0, 6, 8, 10]);
export const BAIT_HOLD_SECONDS = 0.7;

const EMPTY_PROFILE = Object.freeze({ rank: 0, hits: 0, seconds: 0, baitSeconds: 0 });
const EMPTY_COATING = Object.freeze({ hits: 0, seconds: 0 });

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function poisonProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.poisoncraftRank);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    hits: COATING_HITS[rank],
    seconds: COATING_SECONDS[rank],
    baitSeconds: BAIT_SECONDS[rank],
  });
}

/** The charge the hero carries on their blade, as the save keeps it. */
export function createCoatingState(source = null) {
  if (!source || typeof source !== 'object') return null;
  const hits = Number.isInteger(source.hits) ? source.hits : 0;
  const seconds = Number.isFinite(source.seconds) ? source.seconds : 0;
  if (hits <= 0 || seconds <= 0) return null;
  return { hits: Math.min(99, hits), seconds: Math.min(60, Math.round(seconds)) };
}

export function validateCoatingState(coating) {
  if (coating === null || coating === undefined) return true;
  if (typeof coating !== 'object' || Array.isArray(coating)) return false;
  if (Object.keys(coating).sort().join(',') !== 'hits,seconds') return false;
  return Number.isInteger(coating.hits) && coating.hits > 0 && coating.hits <= 99
    && Number.isInteger(coating.seconds) && coating.seconds > 0 && coating.seconds <= 60;
}

/** Coating a blade: the skill, a weapon in hand, and a clean edge to paint. */
export function canCoat({ weapon = null, profile = EMPTY_PROFILE, coating = null, vials = 0 } = {}) {
  if (profile?.rank === 0) return Object.freeze({ ok: false, reason: 'rank-required' });
  if (!weapon?.slot) return Object.freeze({ ok: false, reason: 'no-weapon' });
  if (vials < 1) return Object.freeze({ ok: false, reason: 'no-vial', cost: 1 });
  if ((coating?.hits ?? 0) > 0) return Object.freeze({ ok: false, reason: 'already-coated' });
  return Object.freeze({ ok: true, reason: 'ready', cost: 1 });
}

export function coatWeapon(options = {}) {
  const decision = canCoat(options);
  if (!decision.ok) return decision;
  const profile = options.profile ?? EMPTY_PROFILE;
  return Object.freeze({
    ...decision,
    reason: 'coated',
    coating: { hits: profile.hits, seconds: profile.seconds },
  });
}

/** One strike spends one charge, and the blow reports what it carried. */
export function spendCoating(coating) {
  const current = createCoatingState(coating);
  if (!current) return Object.freeze({ applied: false, coating: null });
  const hits = current.hits - 1;
  return Object.freeze({
    applied: true,
    seconds: current.seconds,
    coating: hits > 0 ? { hits, seconds: current.seconds } : null,
  });
}

/** What a bait does to whatever steps on it. */
export function baitImpact(profile = EMPTY_PROFILE) {
  return Object.freeze({
    seconds: profile?.baitSeconds ?? 0,
    holdSeconds: BAIT_HOLD_SECONDS,
  });
}

export function canPlaceBait({ profile = EMPTY_PROFILE, baits = 0 } = {}) {
  if (profile?.rank === 0) return Object.freeze({ ok: false, reason: 'rank-required' });
  if (baits < 1) return Object.freeze({ ok: false, reason: 'no-bait', cost: 1 });
  return Object.freeze({ ok: true, reason: 'ready', cost: 1 });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    coat: 'Смазать клинок',
    'rank-required': 'Нужны «Ядовитые составы»',
    'no-weapon': 'Нужно оружие в руке',
    'no-vial': 'Нужен флакон яда',
    'no-bait': 'Нужна приманка',
    'already-coated': 'Клинок уже в яде',
    coated: 'Клинок в яде',
    spent: 'Яд сошёл с клинка',
    charge: (hits) => `Яд: ${hits}`,
  }),
  en: Object.freeze({
    coat: 'Coat the blade',
    'rank-required': 'Poisoncraft is required',
    'no-weapon': 'A weapon in hand is required',
    'no-vial': 'A vial of poison is required',
    'no-bait': 'A bait is required',
    'already-coated': 'The blade is already coated',
    coated: 'The blade drips',
    spent: 'The venom is gone from the blade',
    charge: (hits) => `Poison: ${hits}`,
  }),
});

export function poisonCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function poisonRefusalText(reason, language = 'ru') {
  const table = poisonCopy(language);
  return typeof table[reason] === 'string' ? table[reason] : '';
}
