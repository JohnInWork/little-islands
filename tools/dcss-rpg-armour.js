/**
 * Armour used to be a column of numbers. Every helmet in the game did the same
 * thing as every other helmet, only more of it, so choosing one was arithmetic
 * rather than a decision. A piece of armour earns its slot by doing something
 * the other pieces cannot.
 *
 * Five traits, one closed vocabulary. Each is a lever the runtime already has:
 * how far creatures notice the hero, whether water drags at their boots, what
 * an attacker gets back, how fast hunger runs and how soon a spell returns.
 *
 * Nothing here is a percentage of a percentage: the profile is what the hero is
 * wearing, folded once, with a ceiling on every line so a full set of one trait
 * cannot make a rule disappear.
 */

export const ARMOUR_TRAITS = Object.freeze(['quiet', 'surefooted', 'thorns', 'frugal', 'focused']);

/**
 * The ceiling matters more than the values. A hero in four quiet pieces should
 * be hard to notice, never invisible; a belt set should slow hunger, never stop
 * it. Every trait tops out well short of switching its system off.
 */
export const ARMOUR_TRAIT_CAPS = Object.freeze({
  quiet: 30,
  surefooted: 1,
  thorns: 8,
  frugal: 35,
  focused: 30,
});

const EMPTY_PROFILE = Object.freeze({
  quiet: 0,
  surefooted: false,
  thorns: 0,
  frugal: 0,
  focused: 0,
});

export function emptyArmourProfile() {
  return EMPTY_PROFILE;
}

/** True for a well-formed `armour` block on a catalog item. */
export function validateArmourBlock(armour) {
  if (armour === undefined) return true;
  if (!armour || typeof armour !== 'object' || Array.isArray(armour)) return false;
  const keys = Object.keys(armour);
  if (keys.length === 0 || keys.length > 2) return false;
  return keys.every((key) => {
    if (!ARMOUR_TRAITS.includes(key)) return false;
    const value = armour[key];
    return Number.isInteger(value) && value >= 1 && value <= ARMOUR_TRAIT_CAPS[key];
  });
}

/** What a piece of armour promises, whatever else it happens to add to defence. */
export function armourTraits(item) {
  return item?.armour && validateArmourBlock(item.armour) ? item.armour : null;
}

export function hasArmourMechanic(item) {
  if (!item) return false;
  if (armourTraits(item)) return true;
  if (item.magic && Object.keys(item.magic).length > 0) return true;
  return Number.isFinite(item.combat?.guard) && item.combat.guard > 0;
}

/**
 * Folds everything worn into one profile. Pieces add up, the caps bite, and
 * `surefooted` is a promise rather than a number: one pair of boots is enough.
 */
export function armourProfile(pieces = []) {
  let quiet = 0;
  let thorns = 0;
  let frugal = 0;
  let focused = 0;
  let surefooted = false;
  for (const piece of pieces) {
    const traits = armourTraits(piece);
    if (!traits) continue;
    quiet += traits.quiet ?? 0;
    thorns += traits.thorns ?? 0;
    frugal += traits.frugal ?? 0;
    focused += traits.focused ?? 0;
    if (traits.surefooted) surefooted = true;
  }
  if (quiet + thorns + frugal + focused === 0 && !surefooted) return EMPTY_PROFILE;
  return Object.freeze({
    quiet: Math.min(ARMOUR_TRAIT_CAPS.quiet, quiet),
    surefooted,
    thorns: Math.min(ARMOUR_TRAIT_CAPS.thorns, thorns),
    frugal: Math.min(ARMOUR_TRAIT_CAPS.frugal, frugal),
    focused: Math.min(ARMOUR_TRAIT_CAPS.focused, focused),
  });
}

/** Seconds of hunger actually spent for seconds actually lived. */
export function frugalHungerSeconds(seconds, profile = EMPTY_PROFILE) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return seconds * (1 - Math.min(ARMOUR_TRAIT_CAPS.frugal, profile?.frugal ?? 0) / 100);
}

/** How long a spell really takes to come back. */
export function focusedCooldown(cooldown, profile = EMPTY_PROFILE) {
  if (!Number.isFinite(cooldown) || cooldown <= 0) return 0;
  const cut = Math.min(ARMOUR_TRAIT_CAPS.focused, profile?.focused ?? 0) / 100;
  // A spell never becomes free: half a second is the floor, whatever the set.
  return Math.max(0.5, cooldown * (1 - cut));
}

/** What the attacker gets back for landing a blow. Nothing, if the set is bare. */
export function thornsDamage(profile = EMPTY_PROFILE, damageTaken = 0) {
  const thorns = Math.min(ARMOUR_TRAIT_CAPS.thorns, profile?.thorns ?? 0);
  if (thorns <= 0 || !Number.isFinite(damageTaken) || damageTaken <= 0) return 0;
  return thorns;
}

const COPY = Object.freeze({
  ru: Object.freeze({
    quiet: (value) => `Тихий шаг: враги замечают на ${value} % позже`,
    surefooted: () => 'Твёрдая поступь: вода не замедляет',
    thorns: (value) => `Шипы: бьющий получает ${value} в ответ`,
    frugal: (value) => `Бережливость: голод на ${value} % медленнее`,
    focused: (value) => `Сосредоточенность: откат заклинаний короче на ${value} %`,
  }),
  en: Object.freeze({
    quiet: (value) => `Quiet step: creatures notice ${value}% later`,
    surefooted: () => 'Sure-footed: water does not slow you',
    thorns: (value) => `Thorns: the attacker takes ${value} back`,
    frugal: (value) => `Frugal: hunger runs ${value}% slower`,
    focused: (value) => `Focused: spells return ${value}% sooner`,
  }),
});

export function armourTraitText(trait, value, language = 'ru') {
  const table = COPY[language === 'en' ? 'en' : 'ru'];
  return typeof table[trait] === 'function' ? table[trait](value) : '';
}
