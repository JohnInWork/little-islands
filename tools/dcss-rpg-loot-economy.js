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
/**
 * The least food a floor may carry.
 *
 * Supplies used to take their chances in the same weighted lottery as swords,
 * which meant every content addition quietly re-rolled how much the dungeon
 * feeds you — and a place that favours weapons starved the hero through no
 * decision anybody made. Measured before this rule, over eighteen floors and
 * sixty seeds: the orc stronghold fed a fifth of what an average floor did.
 *
 * This is a floor, not a quota. A place that rolls its own supplies keeps
 * exactly what it rolled — the lottery is still a lottery, which is where a
 * lottery belongs. Only a floor that came up empty gets topped up, and the
 * cheapest drop it was going to hand out is what makes room.
 */
/**
 * How much of a floor's draw is food.
 *
 * Calibrated against the clock, not against a feeling: a whole road of eighteen
 * floors hands out about fifty minutes of the sixty-minute bar. A hero who
 * starts full therefore has roughly a hundred and ten minutes for a road that
 * costs somewhere near a hundred — so the second half is lived close to empty,
 * and clearing every room instead of walking round it is what tips it over.
 */
export const SUPPLY_POOL_SHARE = 0.032;

/**
 * Holds the larder's share of the draw steady.
 *
 * A weighted lottery gives food whatever slice is left over after everything
 * else, so two things quietly decided how much the dungeon fed you: how many
 * pieces of equipment the catalogue happened to hold, and how much a place
 * liked weapons. Adding forty-three items cut the ration on every floor in the
 * game, and the orc stronghold — which weights weapons up — fed a fifth of what
 * an average floor did.
 *
 * So supplies get a fixed share of the pool's weight, and the rest of the pool
 * divides what is left. A place can still prefer swords to books; it can no
 * longer prefer swords to bread.
 */
export function balanceSupplyWeights(pool, isSupply, share = SUPPLY_POOL_SHARE) {
  const supplies = pool.filter(isSupply);
  const rest = pool.filter((item) => !isSupply(item));
  if (supplies.length === 0 || rest.length === 0) return pool;
  const supplyWeight = supplies.reduce((sum, item) => sum + Math.max(0, item.weight ?? 1), 0);
  const restWeight = rest.reduce((sum, item) => sum + Math.max(0, item.weight ?? 1), 0);
  if (supplyWeight <= 0 || restWeight <= 0) return pool;
  // What the supply weights must be multiplied by to own `share` of the total.
  const scale = (share * restWeight) / ((1 - share) * supplyWeight);
  return pool.map((item) => (isSupply(item)
    ? { ...item, weight: Math.max(0.01, (item.weight ?? 1) * scale) }
    : item));
}

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


