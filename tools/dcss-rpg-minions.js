/**
 * Necromancy is a spell that stays. A raised servant is not a bolt the hero
 * throws: it is a slot on the spell bar that walks beside them. Kill it and the
 * slot goes dark for a while, then the servant rises again on its own.
 *
 * Everything here is arithmetic and geometry: what the servant is worth, where
 * it should stand and whom it should hit. The runtime moves the sprite.
 */

/** One blueprint per summoning spell; the spell id is the slot's identity. */
export const MINION_BLUEPRINTS = Object.freeze({
  'raise-skeleton': Object.freeze({
    spellId: 'raise-skeleton',
    monsterId: 'raised-skeleton',
    baseHp: 14,
    baseDamage: 5,
    respawnSeconds: 60,
    labels: Object.freeze({ ru: 'Скелет', en: 'Skeleton' }),
  }),
  'raise-ghoul': Object.freeze({
    spellId: 'raise-ghoul',
    monsterId: 'raised-ghoul',
    baseHp: 26,
    baseDamage: 8,
    respawnSeconds: 90,
    labels: Object.freeze({ ru: 'Упырь', en: 'Ghoul' }),
  }),
  'raise-warden': Object.freeze({
    spellId: 'raise-warden',
    monsterId: 'raised-warden',
    baseHp: 42,
    baseDamage: 11,
    respawnSeconds: 120,
    labels: Object.freeze({ ru: 'Страж', en: 'Warden' }),
  }),
});

export const MINION_SPELL_IDS = Object.freeze(Object.keys(MINION_BLUEPRINTS));

/** How close a servant keeps, and how far it will chase before coming back. */
export const MINION_FOLLOW_DISTANCE = 2;
export const MINION_LEASH_DISTANCE = 7;

const EMPTY_PROFILE = Object.freeze({ rank: 0, powerPercent: 0, respawnPercent: 0 });

/** What the school of Necromancy adds: tougher servants that return sooner. */
export const NECROMANCY_POWER_PERCENT = Object.freeze([0, 20, 45, 75]);
export const NECROMANCY_RESPAWN_PERCENT = Object.freeze([0, 15, 30, 50]);

function boundedRank(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(3, value));
}

export function necromancyProfile(capabilities = {}) {
  const rank = boundedRank(capabilities.necromancyRank);
  if (rank === 0) return EMPTY_PROFILE;
  return Object.freeze({
    rank,
    powerPercent: NECROMANCY_POWER_PERCENT[rank],
    respawnPercent: NECROMANCY_RESPAWN_PERCENT[rank],
  });
}

export function minionBlueprint(spellId) {
  return MINION_BLUEPRINTS[spellId] ?? null;
}

export function isMinionSpell(spellId) {
  return Object.hasOwn(MINION_BLUEPRINTS, spellId);
}

/**
 * A servant is worth what the caster knows. Intelligence raises it a little,
 * the school raises it a lot, and both are whole numbers the runtime can use.
 */
export function minionStats({ blueprint, intelligence = 0, profile = EMPTY_PROFILE } = {}) {
  if (!blueprint) return null;
  const mind = Number.isFinite(intelligence) ? Math.max(0, intelligence) : 0;
  const power = 1 + (profile?.powerPercent ?? 0) / 100;
  return Object.freeze({
    maxHp: Math.max(1, Math.round((blueprint.baseHp + mind) * power)),
    damage: Math.max(1, Math.round((blueprint.baseDamage + mind * 0.4) * power)),
    respawnSeconds: minionRespawnSeconds(blueprint, profile),
  });
}

export function minionRespawnSeconds(blueprint, profile = EMPTY_PROFILE) {
  if (!blueprint) return 0;
  const cut = 1 - (profile?.respawnPercent ?? 0) / 100;
  return Math.max(5, Math.round(blueprint.respawnSeconds * cut));
}

/** The slot's own state: a servant standing, or a wait until it stands again. */
export function createMinionSlot(spellId) {
  return { spellId, cooldown: 0 };
}

export function tickMinionSlot(slot, delta) {
  if (!slot || !Number.isFinite(delta) || delta < 0) return slot;
  if (slot.cooldown <= 0) return slot;
  return { ...slot, cooldown: Math.max(0, slot.cooldown - delta) };
}

/**
 * What a servant should do this moment. It fights what threatens the hero, not
 * whatever it can see: the leash is measured from the hero, so a servant never
 * wanders off to die alone.
 */
export function minionIntent({ minion, hero, enemies = [] } = {}) {
  if (!minion || !hero) return Object.freeze({ mode: 'hold', targetId: null });
  let target = null;
  let best = Number.POSITIVE_INFINITY;
  for (const enemy of enemies) {
    if (!enemy || enemy.dead > 0) continue;
    const fromHero = Math.hypot(enemy.x - hero.x, enemy.y - hero.y);
    if (fromHero > MINION_LEASH_DISTANCE) continue;
    const fromMinion = Math.hypot(enemy.x - minion.x, enemy.y - minion.y);
    if (fromMinion < best) {
      best = fromMinion;
      target = enemy;
    }
  }
  if (target) return Object.freeze({ mode: 'attack', targetId: target.instanceId });
  const fromHero = Math.hypot(minion.x - hero.x, minion.y - hero.y);
  if (fromHero > MINION_FOLLOW_DISTANCE) return Object.freeze({ mode: 'follow', targetId: null });
  return Object.freeze({ mode: 'hold', targetId: null });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    raised: (name) => `${name} поднят`,
    fell: (name) => `${name} пал`,
    returns: (seconds) => `Вернётся через ${seconds} с`,
    called: (name) => `${name} идёт к тебе`,
  }),
  en: Object.freeze({
    raised: (name) => `${name} rises`,
    fell: (name) => `${name} has fallen`,
    returns: (seconds) => `Back in ${seconds}s`,
    called: (name) => `${name} comes to you`,
  }),
});

export function minionCopy(spellId, language = 'ru') {
  const blueprint = minionBlueprint(spellId);
  if (!blueprint) return null;
  const table = COPY[language === 'en' ? 'en' : 'ru'];
  const name = blueprint.labels[language === 'en' ? 'en' : 'ru'];
  return Object.freeze({
    name,
    raised: table.raised(name),
    fell: table.fell(name),
    called: table.called(name),
    returns: (seconds) => table.returns(Math.max(1, Math.ceil(seconds))),
  });
}
