const PERCENT_SCALE = 100;

function boundedInteger(value, min, max, fallback = 0) {
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function mix(value) {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
  return (mixed ^ (mixed >>> 15)) >>> 0;
}

function hashText(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * A combat roll belongs to the attack command, not the renderer. The attacker
 * sequence is persisted so reload/replay and a future authoritative server see
 * the same result without sharing mutable RNG state.
 */
export function shieldBlockRoll({ seed, depth, attackerId, attackSequence }) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('Shield block roll requires a uint32 run seed');
  }
  // Город — такой же этаж, только нулевой. Пока нижней границей была единица,
  // любой удар по герою в городе бросал исключение, кадр мира пропускался
  // целиком, и игра замирала на глазах у игрока, продолжая считать бой.
  if (!Number.isInteger(depth) || depth < 0 || depth > 999) {
    throw new RangeError('Shield block roll requires a floor depth from the city down');
  }
  if (typeof attackerId !== 'string' || attackerId.length < 1 || attackerId.length > 80) {
    throw new TypeError('Shield block roll requires a stable attacker ID');
  }
  if (!Number.isInteger(attackSequence) || attackSequence < 0 || attackSequence > 1_000_000_000) {
    throw new RangeError('Shield block roll requires a bounded attack sequence');
  }
  const value = mix(
    (seed >>> 0)
      ^ Math.imul(depth, 0x9e3779b1)
      ^ Math.imul(attackSequence + 1, 0x85ebca6b)
      ^ hashText(attackerId),
  );
  return value % PERCENT_SCALE;
}

export function shieldBlockProfile(combat, capabilities) {
  const hasShield = Number.isFinite(combat?.guard) && combat.guard > 0;
  const chancePercent = hasShield
    ? boundedInteger(capabilities?.shieldBlockChancePercent, 0, PERCENT_SCALE)
    : 0;
  const stunMs = chancePercent > 0
    ? boundedInteger(capabilities?.shieldBlockStunMs, 0, 10_000)
    : 0;
  return Object.freeze({
    enabled: chancePercent > 0,
    chancePercent,
    stunSeconds: stunMs / 1000,
  });
}

export function resolveShieldBlock({ combat, capabilities, roll }) {
  if (!Number.isInteger(roll) || roll < 0 || roll >= PERCENT_SCALE) {
    throw new RangeError('Shield block resolution requires a roll from 0 to 99');
  }
  const profile = shieldBlockProfile(combat, capabilities);
  const blocked = profile.enabled && roll < profile.chancePercent;
  return Object.freeze({
    ...profile,
    blocked,
    stunSeconds: blocked ? profile.stunSeconds : 0,
  });
}
