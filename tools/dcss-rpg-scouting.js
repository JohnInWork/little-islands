/**
 * Scouting techniques: what the hero notices and what notices the hero.
 * Darkvision widens both the fog radius and the distance at which creatures
 * read as present; stealth narrows enemy vision and the noise a deed makes;
 * secret search turns a patch of rubble into a stash. All three are pure
 * arithmetic over the skill capabilities, so the runtime only passes numbers.
 */

/** The radii the game uses without any skill; a rank only ever adds to them. */
export const BASE_REVEAL_RADIUS = 4;
export const BASE_SIGHT_RADIUS = 5.2;

const EMPTY_DARKVISION = Object.freeze({ rank: 0, radiusBonus: 0 });
const EMPTY_STEALTH = Object.freeze({ rank: 0, visionPercent: 0, noisePercent: 0 });
const EMPTY_SECRETS = Object.freeze({ rank: 0, radius: 0 });

function boundedInteger(value, min, max) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

export function darkvisionProfile(capabilities = {}) {
  const rank = boundedInteger(capabilities.darkvisionRank, 0, 3);
  const radiusBonus = boundedInteger(capabilities.darkvisionRadiusBonus, 0, 6);
  if (rank === 0 || radiusBonus === 0) return EMPTY_DARKVISION;
  return Object.freeze({ rank, radiusBonus });
}

export function heroRevealRadius(profile) {
  return BASE_REVEAL_RADIUS + Math.max(0, profile?.radiusBonus ?? 0);
}

export function heroSightRadius(profile) {
  return BASE_SIGHT_RADIUS + Math.max(0, profile?.radiusBonus ?? 0);
}

export function stealthProfile(capabilities = {}) {
  const rank = boundedInteger(capabilities.stealthRank, 0, 3);
  const visionPercent = boundedInteger(capabilities.stealthVisionPercent, 0, 60);
  const noisePercent = boundedInteger(capabilities.stealthNoisePercent, 0, 80);
  if (rank === 0 || visionPercent + noisePercent === 0) return EMPTY_STEALTH;
  return Object.freeze({ rank, visionPercent, noisePercent });
}

/** How far a creature actually sees while the hero moves quietly. */
export function stealthVisionRadius(vision, profile) {
  if (!Number.isFinite(vision) || vision <= 0) return 0;
  const percent = Math.max(0, Math.min(60, profile?.visionPercent ?? 0));
  return Math.max(1, vision * (1 - percent / 100));
}

/** How far a deed is heard. Rank three muffles a plundered altar to a whisper. */
export function stealthNoiseRadius(radius, profile) {
  if (!Number.isFinite(radius) || radius <= 0) return 0;
  const percent = Math.max(0, Math.min(80, profile?.noisePercent ?? 0));
  return radius * (1 - percent / 100);
}

export function secretSearchProfile(capabilities = {}) {
  const rank = boundedInteger(capabilities.secretSearchRank, 0, 3);
  const radius = boundedInteger(capabilities.secretSearchRadius, 0, 8);
  if (rank === 0 || radius === 0) return EMPTY_SECRETS;
  return Object.freeze({ rank, radius });
}

/**
 * The secrets within reach that are not known yet, nearest first. Returns
 * instance ids so the caller only has to remember strings.
 */
export function discoverSecrets({
  profile = EMPTY_SECRETS,
  hero,
  secrets = [],
  known = [],
} = {}) {
  if (!profile || profile.rank === 0 || !hero) return [];
  const seen = new Set(known);
  return secrets
    .filter((secret) => secret && !seen.has(secret.instanceId))
    .map((secret) => ({
      secret,
      distance: Math.abs(secret.x - hero.x) + Math.abs(secret.y - hero.y),
    }))
    .filter(({ distance }) => distance <= profile.radius)
    .sort((a, b) => a.distance - b.distance
      || String(a.secret.instanceId).localeCompare(String(b.secret.instanceId)))
    .map(({ secret }) => secret.instanceId);
}
