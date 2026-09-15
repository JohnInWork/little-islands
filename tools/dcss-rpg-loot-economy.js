export const DEFAULT_LOOT_ABUNDANCE = 1;
export const MIN_LOOT_ABUNDANCE = 0.25;
export const MAX_LOOT_ABUNDANCE = 2.5;
export const MIN_FLOOR_LOOT = 2;
export const MAX_FLOOR_LOOT = 12;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function validateLootAbundance(value) {
  return Number.isFinite(value)
    && value >= MIN_LOOT_ABUNDANCE
    && value <= MAX_LOOT_ABUNDANCE;
}

export function floorLootEconomy({ baseCount, baseQualityBudget, abundance } = {}) {
  if (!Number.isInteger(baseCount) || baseCount < 1) {
    throw new TypeError('Loot economy requires a positive base count');
  }
  if (!Number.isFinite(baseQualityBudget) || baseQualityBudget <= 0) {
    throw new TypeError('Loot economy requires a positive quality budget');
  }
  if (!validateLootAbundance(abundance)) {
    throw new RangeError(
      `Loot abundance must be between ${MIN_LOOT_ABUNDANCE} and ${MAX_LOOT_ABUNDANCE}`,
    );
  }

  // The guaranteed visible equipment piece is not multiplied. This keeps even
  // very lean runs playable and turns abundance into a density control rather
  // than a switch that can accidentally create an empty floor.
  const count = clamp(
    1 + Math.round(Math.max(0, baseCount - 1) * abundance),
    MIN_FLOOR_LOOT,
    MAX_FLOOR_LOOT,
  );
  // More drops add only a small amount of power budget. Extra slots therefore
  // skew toward common utility instead of multiplying the whole power curve.
  const qualityBudget = Math.max(
    count,
    Math.round(baseQualityBudget * (0.9 + abundance * 0.1) * 100) / 100,
  );
  return Object.freeze({ abundance, baseCount, count, qualityBudget });
}

export function lootQualityCost(item) {
  const rarity = Number.isInteger(item?.rarity) ? clamp(item.rarity, 0, 3) : 0;
  return 1 + rarity * 1.75;
}

function weightedPick(rng, entries, weightOf) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, weightOf(entry)), 0);
  if (entries.length === 0 || total <= 0) throw new Error('Loot table has no positive entries');
  let roll = rng.next() * total;
  for (const entry of entries) {
    roll -= Math.max(0, weightOf(entry));
    if (roll < 0) return entry;
  }
  return entries.at(-1);
}

/**
 * Returns a deterministic sequence whose first entry is equipment. The budget
 * is shared by the entire floor; duplicates stay possible, but rapidly lose
 * weight so a larger amount mostly increases variety and consumables.
 */
export function createBalancedLootPicks({
  rng,
  pool,
  starterPool,
  count,
  qualityBudget,
} = {}) {
  if (!rng || typeof rng.next !== 'function') throw new TypeError('Loot picks require seeded RNG');
  if (!Array.isArray(pool) || pool.length === 0) throw new TypeError('Loot picks require a pool');
  if (!Array.isArray(starterPool) || starterPool.length === 0) {
    throw new TypeError('Loot picks require starter equipment');
  }
  if (!Number.isInteger(count) || count < 1) throw new TypeError('Loot pick count must be positive');
  if (!Number.isFinite(qualityBudget) || qualityBudget < count) {
    throw new RangeError('Quality budget must afford at least one point per item');
  }

  const picks = [];
  const seen = new Map();
  let remainingBudget = qualityBudget;

  for (let index = 0; index < count; index += 1) {
    const candidates = index === 0 ? starterPool : pool;
    const slotsAfter = count - index - 1;
    const affordable = candidates.filter(
      (item) => lootQualityCost(item) + slotsAfter <= remainingBudget + 0.0001,
    );
    const table = affordable.length > 0
      ? affordable
      : [...candidates].sort((left, right) => lootQualityCost(left) - lootQualityCost(right))
        .filter((item, _candidateIndex, values) => lootQualityCost(item) === lootQualityCost(values[0]));
    const picked = weightedPick(rng, table, (item) => {
      const duplicatePenalty = 1 + (seen.get(item.id) ?? 0) * 2.5;
      return Math.max(0.01, item.weight ?? 1) / duplicatePenalty;
    });
    picks.push(picked);
    seen.set(picked.id, (seen.get(picked.id) ?? 0) + 1);
    remainingBudget = Math.max(0, remainingBudget - lootQualityCost(picked));
  }

  return Object.freeze({
    picks: Object.freeze(picks),
    spentQuality: Math.round((qualityBudget - remainingBudget) * 100) / 100,
    qualityBudget,
  });
}
