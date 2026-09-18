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
