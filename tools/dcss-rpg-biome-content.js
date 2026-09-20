/**
 * A biome you can only see is a repaint. The shuffle already decides what a
 * floor looks like — surfaces, palette, weather, room plans — but until now the
 * frozen depths and the infernal core were populated by the same gnolls and
 * paid out the same loot, and a place with no inhabitants of its own is a
 * backdrop rather than a place.
 *
 * This is the other half: what lives there, and what is left lying there.
 *
 * Weights, never gates. The tier decides what CAN turn up on a floor; the biome
 * only decides what turns up OFTEN. Every multiplier here is greater than zero,
 * so no biome can take a monster or an item out of the game — a rule the guard
 * below enforces rather than trusts. Guarantees ("one on every floor", the
 * chapter boss, the promised book, the artefact) are placed, not rolled, so the
 * biome never touches them: see `guaranteedSpellBookPlacement`.
 */

/** What a monster IS. One tag per catalogue entry; the biome reads this. */
export const MONSTER_KINS = Object.freeze([
  'beast', 'humanoid', 'undead', 'demon', 'dragon', 'oddity',
]);

/** What a monster or an item is MADE OF, where that is the whole point of it. */
export const CONTENT_ELEMENTS = Object.freeze(['fire', 'ice']);

/** What an item is FOR, derived from fields the catalogue already carries. */
export const LOOT_CATEGORIES = Object.freeze([
  'weapon', 'armour', 'jewellery', 'book', 'scroll', 'potion', 'supply', 'tool',
]);

/** Nothing may be silenced, and nothing may drown out a floor. */
export const BIOME_WEIGHT_RANGE = Object.freeze([0.4, 2.4]);

const JEWELLERY_SLOTS = Object.freeze(['ring1', 'ring2', 'amulet']);
const WEAPON_SLOTS = Object.freeze(['hand1', 'hand2']);

export function lootCategory(item) {
  if (!item) return 'tool';
  switch (item.kind) {
    case 'book': return 'book';
    case 'scroll': case 'wand': return 'scroll';
    case 'potion': return 'potion';
    case 'food': case 'ingredient': return 'supply';
    default: break;
  }
  if (JEWELLERY_SLOTS.includes(item.slot)) return 'jewellery';
  if (WEAPON_SLOTS.includes(item.slot)) return 'weapon';
  if (item.slot) return 'armour';
  return 'tool';
}

/**
 * One table per place. Read it as a sentence about what the place was:
 * a burnt storehouse is full of the people who came to loot it; a buried
 * sanctum is full of what was buried and what it was buried with.
 */
export const BIOME_CONTENT = Object.freeze({
  'ashen-vault': Object.freeze({
    kin: Object.freeze({ humanoid: 2, beast: 1.4, oddity: 1.2, demon: 0.7, dragon: 0.7, undead: 0.6 }),
    element: Object.freeze({ fire: 1.3, ice: 0.6 }),
    loot: Object.freeze({ tool: 1.5, weapon: 1.2, jewellery: 0.75, book: 0.6 }),
  }),
  'buried-sanctum': Object.freeze({
    kin: Object.freeze({ undead: 2, oddity: 1.5, demon: 0.9, humanoid: 0.7, dragon: 0.7, beast: 0.5 }),
    element: Object.freeze({ fire: 0.8, ice: 0.8 }),
    loot: Object.freeze({ book: 1.9, scroll: 1.6, jewellery: 1.3, weapon: 0.7, armour: 0.75 }),
  }),
  'frozen-depths': Object.freeze({
    kin: Object.freeze({ beast: 1.8, dragon: 1.4, undead: 1.1, humanoid: 0.9, oddity: 0.8, demon: 0.5 }),
    element: Object.freeze({ ice: 2.2, fire: 0.45 }),
    loot: Object.freeze({ armour: 1.6, potion: 1.2, weapon: 0.75, scroll: 0.7 }),
  }),
  'infernal-core': Object.freeze({
    kin: Object.freeze({ demon: 2.2, dragon: 1.6, undead: 1, humanoid: 0.8, oddity: 0.7, beast: 0.6 }),
    element: Object.freeze({ fire: 2.2, ice: 0.45 }),
    loot: Object.freeze({ weapon: 1.6, jewellery: 1.2, armour: 0.7, tool: 0.75, potion: 0.8 }),
  }),
  // Hell's own three. Gehenna is fire and nothing else; the acid pits favour
  // the things that ooze; the cinder waste is what is left after both.
  'gehenna-floor': Object.freeze({
    kin: Object.freeze({ demon: 2.2, dragon: 1.4, undead: 0.8, humanoid: 0.6, oddity: 0.6, beast: 0.5 }),
    element: Object.freeze({ fire: 2.2, ice: 0.45 }),
    loot: Object.freeze({ weapon: 1.5, jewellery: 1.2, armour: 0.8, potion: 0.8 }),
  }),
  'acid-pits': Object.freeze({
    kin: Object.freeze({ demon: 1.9, oddity: 1.7, beast: 0.9, undead: 0.8, humanoid: 0.6, dragon: 0.6 }),
    element: Object.freeze({ fire: 1.2, ice: 0.6 }),
    loot: Object.freeze({ potion: 1.6, tool: 1.2, weapon: 0.8, armour: 0.7 }),
  }),
  'cinder-waste': Object.freeze({
    kin: Object.freeze({ demon: 2.0, undead: 1.2, beast: 0.9, humanoid: 0.8, dragon: 0.8, oddity: 0.6 }),
    element: Object.freeze({ fire: 1.8, ice: 0.5 }),
    loot: Object.freeze({ weapon: 1.3, armour: 1.2, jewellery: 0.9, book: 0.7 }),
  }),
  'catacomb-tiers': Object.freeze({
    kin: Object.freeze({ undead: 2, oddity: 1.3, demon: 0.8, humanoid: 0.8, dragon: 0.7, beast: 0.5 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ book: 1.4, jewellery: 1.3, weapon: 0.8 }),
  }),
  'crystal-hollow': Object.freeze({
    kin: Object.freeze({ oddity: 1.8, dragon: 1.3, beast: 1.2, humanoid: 0.8, undead: 0.8, demon: 0.7 }),
    element: Object.freeze({ ice: 1.5, fire: 0.7 }),
    loot: Object.freeze({ jewellery: 1.8, armour: 1.2, tool: 0.7 }),
  }),
  'drowned-palace': Object.freeze({
    kin: Object.freeze({ humanoid: 1.5, oddity: 1.4, undead: 1.2, dragon: 0.8, beast: 0.8, demon: 0.6 }),
    element: Object.freeze({ ice: 1.3, fire: 0.6 }),
    loot: Object.freeze({ jewellery: 1.5, armour: 1.3, potion: 1.2, tool: 0.7 }),
  }),
  'bone-fields': Object.freeze({
    kin: Object.freeze({ undead: 2.2, beast: 1.1, oddity: 0.9, demon: 0.8, humanoid: 0.7, dragon: 0.6 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ book: 1.5, scroll: 1.3, weapon: 0.8 }),
  }),
  'flesh-deep': Object.freeze({
    kin: Object.freeze({ demon: 1.8, undead: 1.4, beast: 1.1, oddity: 0.9, dragon: 0.8, humanoid: 0.5 }),
    element: Object.freeze({ fire: 1.4, ice: 0.6 }),
    loot: Object.freeze({ potion: 1.6, scroll: 1.3, armour: 0.8 }),
  }),
  'overgrown-ruin': Object.freeze({
    kin: Object.freeze({ beast: 2, oddity: 1.2, humanoid: 1, dragon: 0.8, undead: 0.7, demon: 0.5 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ tool: 1.5, potion: 1.3, book: 0.7 }),
  }),
  'cobalt-mine': Object.freeze({
    kin: Object.freeze({ humanoid: 1.7, oddity: 1.3, beast: 1, dragon: 0.8, undead: 0.8, demon: 0.7 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ tool: 1.7, weapon: 1.3, book: 0.6 }),
  }),
  'magma-shelf': Object.freeze({
    kin: Object.freeze({ demon: 2.2, dragon: 1.7, undead: 0.9, humanoid: 0.8, beast: 0.7, oddity: 0.7 }),
    element: Object.freeze({ fire: 2.2, ice: 0.45 }),
    loot: Object.freeze({ weapon: 1.6, armour: 0.8, scroll: 0.8 }),
  }),
  'beast-lair': Object.freeze({
    kin: Object.freeze({ beast: 2.2, dragon: 1.2, humanoid: 0.8, oddity: 0.8, undead: 0.6, demon: 0.5 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ armour: 1.4, tool: 1.3, book: 0.6 }),
  }),
  'orc-stronghold': Object.freeze({
    kin: Object.freeze({ humanoid: 2.2, beast: 1.2, oddity: 0.9, demon: 0.8, undead: 0.7, dragon: 0.7 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ weapon: 1.7, armour: 1.3, book: 0.5 }),
  }),
  'funeral-hall': Object.freeze({
    kin: Object.freeze({ undead: 1.9, oddity: 1.4, humanoid: 0.9, demon: 0.8, dragon: 0.7, beast: 0.5 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ jewellery: 1.6, scroll: 1.4, weapon: 0.7 }),
  }),
  'deep-mine': Object.freeze({
    kin: Object.freeze({ humanoid: 1.6, oddity: 1.4, beast: 1.1, undead: 0.9, dragon: 0.7, demon: 0.6 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ tool: 1.8, weapon: 1.2, jewellery: 0.7 }),
  }),
  'autumn-wood': Object.freeze({
    kin: Object.freeze({ beast: 2.2, humanoid: 1.2, oddity: 0.9, dragon: 0.8, undead: 0.5, demon: 0.4 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ tool: 1.5, potion: 1.3, book: 0.6 }),
  }),
  'mire': Object.freeze({
    kin: Object.freeze({ beast: 2, oddity: 1.4, undead: 1.1, humanoid: 0.8, dragon: 0.7, demon: 0.5 }),
    element: Object.freeze({ ice: 1.2, fire: 0.5 }),
    loot: Object.freeze({ potion: 1.6, scroll: 1.2, weapon: 0.7 }),
  }),
  'flower-meadow': Object.freeze({
    kin: Object.freeze({ beast: 2, humanoid: 1.4, oddity: 1, dragon: 0.8, undead: 0.5, demon: 0.4 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ potion: 1.5, jewellery: 1.3, book: 0.7 }),
  }),
  'old-graveyard': Object.freeze({
    kin: Object.freeze({ undead: 2.1, oddity: 1.3, humanoid: 0.9, beast: 0.8, demon: 0.7, dragon: 0.6 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ book: 1.5, scroll: 1.4, weapon: 0.7 }),
  }),
  'abandoned-hamlet': Object.freeze({
    kin: Object.freeze({ humanoid: 2.2, beast: 1.2, oddity: 1, undead: 0.8, demon: 0.6, dragon: 0.6 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ tool: 1.6, weapon: 1.3, jewellery: 0.7 }),
  }),
  'sunburnt-steppe': Object.freeze({
    kin: Object.freeze({ beast: 2.1, humanoid: 1.4, dragon: 1, oddity: 0.8, undead: 0.5, demon: 0.4 }),
    element: Object.freeze({ fire: 1.5, ice: 0.5 }),
    loot: Object.freeze({ weapon: 1.4, tool: 1.3, book: 0.6 }),
  }),
  'wild-heath': Object.freeze({
    kin: Object.freeze({ beast: 1.9, oddity: 1.3, humanoid: 1.1, undead: 0.8, dragon: 0.7, demon: 0.5 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ tool: 1.5, armour: 1.3, jewellery: 0.7 }),
  }),
  'green-hollow': Object.freeze({
    kin: Object.freeze({ beast: 2.2, oddity: 1.4, dragon: 1, humanoid: 0.8, undead: 0.6, demon: 0.4 }),
    element: Object.freeze({ ice: 1.2, fire: 0.6 }),
    loot: Object.freeze({ potion: 1.6, armour: 1.2, weapon: 0.7 }),
  }),
  'snowfield': Object.freeze({
    kin: Object.freeze({ beast: 2, dragon: 1.3, undead: 1, humanoid: 0.9, oddity: 0.8, demon: 0.4 }),
    element: Object.freeze({ ice: 2, fire: 0.45 }),
    loot: Object.freeze({ armour: 1.6, potion: 1.2, book: 0.7 }),
  }),
  'thornwood': Object.freeze({
    kin: Object.freeze({ beast: 2.2, oddity: 1.3, dragon: 1, humanoid: 0.9, undead: 0.5, demon: 0.4 }),
    element: Object.freeze({  }),
    loot: Object.freeze({ armour: 1.4, tool: 1.3, scroll: 0.7 }),
  }),
  // ── Подвалы ─────────────────────────────────────────────────────────────
  // Рукотворное место предпочитает то, что в нём держали или чем работали.
  'sunken-labyrinth': Object.freeze({
    kin: Object.freeze({ oddity: 1.6, undead: 1.2, humanoid: 1.0, beast: 0.8, demon: 0.7, dragon: 0.6 }),
    element: Object.freeze({}),
    loot: Object.freeze({ tool: 1.6, book: 1.2, armour: 0.8 }),
  }),
  'iron-workshop': Object.freeze({
    kin: Object.freeze({ oddity: 1.8, humanoid: 1.3, undead: 0.9, demon: 0.8, beast: 0.7, dragon: 0.6 }),
    element: Object.freeze({}),
    loot: Object.freeze({ weapon: 1.7, tool: 1.4, armour: 1.1 }),
  }),
  'menagerie': Object.freeze({
    kin: Object.freeze({ beast: 2.0, dragon: 1.2, oddity: 1.0, humanoid: 0.9, undead: 0.7, demon: 0.6 }),
    element: Object.freeze({}),
    loot: Object.freeze({ armour: 1.3, tool: 1.2, book: 0.6 }),
  }),
  'marble-sanctum': Object.freeze({
    kin: Object.freeze({ undead: 1.6, humanoid: 1.2, oddity: 1.0, demon: 0.9, beast: 0.7, dragon: 0.7 }),
    element: Object.freeze({}),
    loot: Object.freeze({ jewellery: 1.8, book: 1.3, weapon: 0.8 }),
  }),
  'emerald-gallery': Object.freeze({
    kin: Object.freeze({ oddity: 1.5, dragon: 1.3, undead: 1.0, humanoid: 0.9, demon: 0.8, beast: 0.7 }),
    element: Object.freeze({}),
    loot: Object.freeze({ jewellery: 1.9, book: 1.2, armour: 0.8 }),
  }),
  'hive-vault': Object.freeze({
    kin: Object.freeze({ beast: 1.9, oddity: 1.2, demon: 0.9, humanoid: 0.8, undead: 0.7, dragon: 0.7 }),
    element: Object.freeze({}),
    loot: Object.freeze({ tool: 1.3, armour: 1.1, book: 0.7 }),
  }),
  'sand-archive': Object.freeze({
    kin: Object.freeze({ undead: 1.8, humanoid: 1.1, oddity: 1.0, demon: 0.8, beast: 0.7, dragon: 0.7 }),
    element: Object.freeze({}),
    loot: Object.freeze({ book: 2.0, jewellery: 1.2, weapon: 0.7 }),
  }),
  'zot-cells': Object.freeze({
    kin: Object.freeze({ oddity: 1.5, demon: 1.3, undead: 1.1, humanoid: 1.0, beast: 0.8, dragon: 0.8 }),
    element: Object.freeze({}),
    loot: Object.freeze({ weapon: 1.4, armour: 1.3, book: 0.8 }),
  }),
});

/**
 * An unknown place — the city, or a theme added before its table — weighs
 * everything the same. A missing table must read as "no opinion", never as
 * "nothing lives here".
 */
export function biomeContent(themeId) {
  return BIOME_CONTENT[themeId] ?? null;
}

export function monsterBiomeWeight(monster, themeId) {
  const content = biomeContent(themeId);
  if (!content || !monster) return 1;
  const kin = content.kin[monster.kin] ?? 1;
  const element = monster.element ? content.element[monster.element] ?? 1 : 1;
  return kin * element;
}

/**
 * Food is not flavour. How much the dungeon feeds the hero is a promise about
 * the length of a run, and a promise that rests on pool weights rots with every
 * content addition — the lesson the bread already taught once. So supplies are
 * outside this system entirely: no biome may be the hungry one, and the guard
 * below refuses a table that tries.
 */
export function lootBiomeWeight(item, themeId) {
  const content = biomeContent(themeId);
  if (!content || !item) return 1;
  const category = lootCategory(item);
  if (category === 'supply') return 1;
  return (content.loot[category] ?? 1) * (item.element ? content.element[item.element] ?? 1 : 1);
}

/**
 * The guard. Content grows every week, and a monster added without a kin would
 * quietly stop caring about where it is — the failure mode that made the loot
 * pools rot three times. This turns it into a red test instead.
 */
export function biomeContentProblems({ monsters = [], loot = [], themeIds = [] } = {}) {
  const problems = [];
  const [low, high] = BIOME_WEIGHT_RANGE;
  for (const [themeId, content] of Object.entries(BIOME_CONTENT)) {
    for (const table of ['kin', 'element', 'loot']) {
      for (const [key, value] of Object.entries(content[table])) {
        if (!(value >= low && value <= high)) problems.push(`${themeId}:${table}:${key}:out-of-range`);
      }
    }
    for (const key of Object.keys(content.kin)) {
      if (!MONSTER_KINS.includes(key)) problems.push(`${themeId}:kin:${key}:unknown`);
    }
    for (const key of Object.keys(content.loot)) {
      if (!LOOT_CATEGORIES.includes(key)) problems.push(`${themeId}:loot:${key}:unknown`);
      if (key === 'supply') problems.push(`${themeId}:loot:supply:not-a-biome-axis`);
    }
    for (const key of Object.keys(content.element)) {
      if (!CONTENT_ELEMENTS.includes(key)) problems.push(`${themeId}:element:${key}:unknown`);
    }
  }
  for (const themeId of themeIds) {
    if (!BIOME_CONTENT[themeId]) problems.push(`${themeId}:no-content-table`);
  }
  for (const monster of monsters) {
    if (!MONSTER_KINS.includes(monster.kin)) problems.push(`${monster.id}:missing-kin`);
    if (monster.element && !CONTENT_ELEMENTS.includes(monster.element)) {
      problems.push(`${monster.id}:unknown-element`);
    }
  }
  for (const item of loot) {
    if (item.element && !CONTENT_ELEMENTS.includes(item.element)) {
      problems.push(`${item.id}:unknown-element`);
    }
  }
  return problems;
}
