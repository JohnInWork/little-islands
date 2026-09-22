export const PROCEDURAL_ARTIFACT_VERSION = 1;
export const DEFAULT_ARTIFACT_RATE = 1;
export const MIN_ARTIFACT_RATE = 0;
export const MAX_ARTIFACT_RATE = 3;
export const CURSED_ARTIFACT_CHANCE = 0.2;

/**
 * An artefact is not something you trip over. It lives behind a cost: a lock
 * that wants a pick, a trap that wants a steady hand, a curse that takes
 * something on the way out, or a chest that turns out to be a mouth. A plain
 * unlocked cache never holds one, and neither does the open floor.
 */
export const ARTIFACT_CACHE_VARIANTS = Object.freeze(['locked', 'trapped', 'cursed', 'mimic']);

/** What the powers with a magnitude are worth. Named, not buried in the table. */
export const EXECUTE_THRESHOLD = 0.15;
export const THORNS_PERCENT = 22;
export const SATIETY_SHARE = 0.5;
export const QUICKENING_PERCENT = 18;

/** The first floor teaches; it does not hand out the run's best item. */
export const ARTIFACT_MIN_DEPTH = 2;

/** Keeps each road's artefact on its own floor instead of the same one twice. */
const ROAD_SALT = 7919;

/** The road length the per-cache odds below were measured on. */
const MEASURED_ROAD = 9;

/**
 * How much luck a whole road is allowed to hand out beyond its promise, and
 * the most any single cache may carry. Measured, not guessed: at this value a
 * clear majority of roads end with exactly the one artefact they were owed and
 * the average stays well under two — see the sweep in the artefact tests.
 */
const ARTIFACT_ROAD_LUCK = 0.38;
const ARTIFACT_LUCK_CAP = 0.14;

export function cacheCanHoldArtifact({ depth, cacheVariant } = {}) {
  return Number.isInteger(depth)
    && depth >= ARTIFACT_MIN_DEPTH
    && ARTIFACT_CACHE_VARIANTS.includes(cacheVariant);
}

const freezePower = (power) => Object.freeze({
  ...power,
  tags: Object.freeze([...power.tags]),
  suffix: Object.freeze({ ...power.suffix }),
  magic: Object.freeze({
    ...power.magic,
    ...(power.magic.immunity
      ? { immunity: Object.freeze([...power.magic.immunity]) }
      : {}),
  }),
});

const freezeCurse = (curse) => Object.freeze({
  ...curse,
  label: Object.freeze({ ...curse.label }),
  effect: Object.freeze({ ...curse.effect }),
  stats: Object.freeze({ ...curse.stats }),
  // A drawback that is a rule rather than a number carries it here, and reaches
  // the hero through the same aggregator every other magic field does.
  ...(curse.magic ? { magic: Object.freeze({ ...curse.magic }) } : {}),
});

/**
 * A major power is binary — it never rolls a magnitude — and it belongs to a
 * KIND of thing.
 *
 * That second half used to be missing, and it made the whole layer fake: flight
 * and invisibility were tagged `equipment`, which is everything, so a sword had
 * exactly three possible powers and so did a helmet, and two of the three were
 * the same on both. The generator was not combining anything; it was drawing
 * one of three slips out of a bag.
 *
 * Now a weapon does weapon things, armour does armour things, and the two
 * powers that are plainly about the wearer and not the tool — flying and going
 * unseen — live on jewellery, where a ring of invisibility makes sense and an
 * invisible sword does not.
 *
 * Every power here reaches a rule the runtime already owns. None of them is a
 * label with nothing behind it.
 */
export const PROCEDURAL_ARTIFACT_POWERS = Object.freeze([
  // — Weapons. What the tool does to what it hits. —
  freezePower({
    id: 'vampirism',
    tags: ['weapon'],
    suffix: { ru: 'Алой Жажды', en: 'of Crimson Thirst' },
    magic: { vampirism: true },
    weight: 5,
  }),
  freezePower({
    // Water already carries a shock between creatures standing in it; until now
    // only the dungeon could use that, never the hero.
    id: 'conductor',
    tags: ['weapon'],
    suffix: { ru: 'Грозовой Дуги', en: 'of the Storm Arc' },
    magic: { conductor: true },
    weight: 4,
  }),
  freezePower({
    // Marksmanship already knows how to pick the targets behind a target.
    id: 'piercing',
    tags: ['weapon'],
    suffix: { ru: 'Сквозного Хода', en: 'of the Clean Pass' },
    magic: { piercing: true },
    weight: 4,
  }),
  freezePower({
    // The blunt school already strips armour for a few seconds.
    id: 'sundering',
    tags: ['weapon'],
    suffix: { ru: 'Раскола', en: 'of Sundering' },
    magic: { sundering: true },
    weight: 4,
  }),
  freezePower({
    id: 'searing',
    tags: ['weapon'],
    suffix: { ru: 'Клеймящего Жара', en: 'of Searing' },
    magic: { brand: 'burning' },
    weight: 4,
  }),
  freezePower({
    id: 'freezing',
    tags: ['weapon'],
    suffix: { ru: 'Стылой Хватки', en: 'of the Cold Grip' },
    magic: { brand: 'chilled' },
    weight: 4,
  }),
  freezePower({
    id: 'venomous',
    tags: ['weapon'],
    suffix: { ru: 'Гадючьего Зуба', en: 'of the Viper Tooth' },
    magic: { brand: 'poison' },
    weight: 4,
  }),
  freezePower({
    // Not a bigger number: a rule. Anything already this close to dead dies.
    id: 'executioner',
    tags: ['weapon'],
    suffix: { ru: 'Палача', en: 'of the Headsman' },
    magic: { execute: EXECUTE_THRESHOLD },
    weight: 3,
  }),

  // — Armour and shields. What the dungeon fails to do to you. —
  freezePower({
    id: 'three-wards',
    tags: ['armour', 'shield'],
    suffix: { ru: 'Трёх Печатей', en: 'of the Three Seals' },
    magic: { immunity: ['burning', 'chilled', 'poison'] },
    weight: 3,
  }),
  freezePower({
    // The armour school already turns damage taken back on whoever dealt it.
    id: 'thorns',
    tags: ['armour', 'shield'],
    suffix: { ru: 'Терновой Оправы', en: 'of the Thorn Setting' },
    magic: { thorns: THORNS_PERCENT },
    weight: 4,
  }),
  freezePower({
    // And how far the noise of a footstep carries.
    id: 'hushed',
    tags: ['armour', 'shield'],
    suffix: { ru: 'Тихого Шага', en: 'of the Quiet Step' },
    magic: { hushed: true },
    weight: 4,
  }),
  freezePower({
    // Once a floor, and the floor has to be left for it to come back — so it
    // buys one mistake, never a habit.
    id: 'second-wind',
    tags: ['armour', 'shield'],
    suffix: { ru: 'Второго Дыхания', en: 'of Second Wind' },
    magic: { secondWind: true },
    weight: 2,
  }),
  freezePower({
    // The siren drags and the whip pulls; an anchored hero stays put.
    id: 'anchored',
    tags: ['armour', 'shield'],
    suffix: { ru: 'Якоря', en: 'of the Anchor' },
    magic: { anchored: true },
    weight: 3,
  }),

  // — Jewellery and foci. What is true about the wearer, not the tool. —
  /*
   * Свойство не привязано к одной вещи: оно про носящего.
   *
   * Иван: «это не обязательно должны быть сапоги быстрой скорости — это может
   * быть и кольцо, и плащ, а невидимость может быть и кольцом, и плащом, и
   * перчатками». Поэтому у каждой из этих сил несколько слотов, и находка
   * каждый раз выглядит иначе: плащ невидимости и кольцо невидимости — две
   * разные находки с одним обещанием.
   */
  freezePower({
    id: 'flight',
    tags: ['jewellery', 'cloak', 'boots'],
    suffix: { ru: 'Небес', en: 'of the Sky' },
    magic: { flight: true },
    weight: 5,
  }),
  freezePower({
    id: 'invisibility',
    tags: ['jewellery', 'cloak', 'gloves'],
    suffix: { ru: 'Забвения', en: 'of Oblivion' },
    magic: { invisibility: true },
    weight: 4,
  }),
  freezePower({
    // Hunger is a promise about the length of a run; this bends it, and on a
    // descent with no bottom that is worth more than a number.
    id: 'satiety',
    tags: ['jewellery', 'focus'],
    suffix: { ru: 'Сытости', en: 'of Plenty' },
    magic: { satiety: SATIETY_SHARE },
    weight: 4,
  }),
  freezePower({
    // Scouting already finds what the floor hid; this finds it without looking.
    id: 'sense',
    tags: ['jewellery', 'focus'],
    suffix: { ru: 'Чутья', en: 'of the Keen Sense' },
    magic: { sense: true },
    weight: 4,
  }),
  freezePower({
    /*
     * Сапоги, в которых ходят быстрее. Одни на всю игру.
     *
     * Задумывалось заклинанием грозовой школы, потом числом на любой вещи —
     * Иван остановил и то и другое: «нет, флагом. Это уникальное свойство
     * типа сапоги, быстрой скорости. Это артефакт, он очень крутой».
     *
     * Слотов у него три: сапоги, плащ и украшения. Слот — такой же тег, как
     * «броня», поэтому адресуется точно, а находка каждый раз выглядит
     * иначе.
     */
    id: 'swift-step',
    tags: ['boots', 'jewellery', 'cloak'],
    suffix: { ru: 'Лёгкого Шага', en: 'of the Light Step' },
    magic: { swiftness: true },
    weight: 4,
  }),
  freezePower({
    // Armour already knows how to shorten a spell's cooldown.
    id: 'quickening',
    tags: ['jewellery', 'focus'],
    suffix: { ru: 'Скорой Руки', en: 'of the Quick Hand' },
    magic: { quickening: QUICKENING_PERCENT },
    weight: 3,
  }),
  freezePower({
    id: 'three-wards-minor',
    tags: ['focus'],
    suffix: { ru: 'Трёх Печатей', en: 'of the Three Seals' },
    magic: { immunity: ['burning', 'chilled', 'poison'] },
    weight: 3,
  }),
]);

/**
 * A cursed artefact is not the old hidden sanctity layer. It is an obvious,
 * rare risk/reward variant: one major power plus one visible drawback.
 *
 * Three of these were flat subtraction — less health, less speed, less defence
 * — which is the same design mistake the powers had: a number, not a decision.
 * A drawback is interesting when it changes how you play the floor, or when it
 * makes you weigh keeping the thing at all.
 *
 * The last one is different in kind and is the reason the others exist: a
 * `sticky` curse cannot be taken off. Wearing it is a commitment, and getting
 * out of it costs something real — see `dcss-rpg-curse.js`.
 */
export const PROCEDURAL_ARTIFACT_CURSES = Object.freeze([
  freezeCurse({
    id: 'frailty',
    label: { ru: 'Хрупкость', en: 'Frailty' },
    effect: { ru: '−18 здоровья', en: '−18 health' },
    stats: { maxHp: -18 },
    weight: 4,
  }),
  freezeCurse({
    id: 'burden',
    label: { ru: 'Тяжесть', en: 'Burden' },
    effect: { ru: '−14% скорости движения', en: '−14% move speed' },
    stats: { moveSpeed: -0.14 },
    weight: 4,
  }),
  freezeCurse({
    id: 'exposure',
    label: { ru: 'Уязвимость', en: 'Exposure' },
    effect: { ru: '−3 защиты', en: '−3 defence' },
    stats: { defense: -3 },
    weight: 3,
  }),
  freezeCurse({
    // Not a number: the run gets shorter. Food is a promise about how long you
    // may stay down, and this one halves it.
    id: 'gluttony',
    label: { ru: 'Прожорливость', en: 'Gluttony' },
    effect: { ru: 'голод вдвое быстрее', en: 'hunger runs twice as fast' },
    stats: {},
    magic: { gluttony: true },
    weight: 3,
  }),
  freezeCurse({
    // You are heard further than you are seen. Sneaking past a room stops
    // being an option, so the floor has to be fought instead of crossed.
    id: 'clamour',
    label: { ru: 'Шум', en: 'Clamour' },
    effect: { ru: 'тебя слышно вдвое дальше', en: 'heard twice as far' },
    stats: {},
    magic: { clamour: true },
    weight: 3,
  }),
  freezeCurse({
    // Permanently wet: lightning through water hurts more, fire hurts less.
    // A drawback that is an advantage in the right room is the best kind.
    id: 'sodden',
    label: { ru: 'Сырость', en: 'Sodden' },
    effect: { ru: 'всегда мокрый', en: 'never dries' },
    stats: {},
    magic: { sodden: true },
    weight: 3,
  }),
  freezeCurse({
    // The one that changes what wearing a thing means.
    id: 'binding',
    label: { ru: 'Оковы', en: 'Binding' },
    effect: { ru: 'нельзя снять', en: 'cannot be removed' },
    stats: {},
    magic: { sticky: true },
    weight: 2,
  }),
]);

const POWER_BY_ID = new Map(PROCEDURAL_ARTIFACT_POWERS.map((power) => [power.id, power]));
const CURSE_BY_ID = new Map(PROCEDURAL_ARTIFACT_CURSES.map((curse) => [curse.id, curse]));

function stableHash(...parts) {
  let value = 0x811c9dc5;
  for (const character of parts.join('|')) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 0x01000193) >>> 0;
    value ^= value >>> 13;
  }
  return value >>> 0;
}

function createStableRng(seed) {
  let state = seed >>> 0 || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(random, entries) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight ?? 1), 0);
  if (entries.length === 0 || total <= 0) return null;
  let roll = random() * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight ?? 1);
    if (roll < 0) return entry;
  }
  return entries.at(-1) ?? null;
}

export function artifactPowerById(id) {
  return POWER_BY_ID.get(id) ?? null;
}

export function artifactCurseById(id) {
  return CURSE_BY_ID.get(id) ?? null;
}

export function artifactTags(item) {
  if (!item?.slot) return Object.freeze([]);
  const tags = new Set(['equipment', item.slot]);
  if (item.weaponFamily) tags.add('weapon');
  if (item.offhandKind === 'shield') tags.add('shield');
  if (item.offhandKind === 'focus') tags.add('focus');
  if (['body', 'head', 'boots', 'cloak', 'gloves', 'belt'].includes(item.slot)) {
    tags.add('armour');
  }
  if (['ring1', 'ring2', 'amulet'].includes(item.slot)) tags.add('jewellery');
  return Object.freeze([...tags]);
}

/**
 * Какие силы может нести эта вещь — и каких забег уже не выдаст.
 *
 * Иван: «суть в том, чтобы только по одному предмету на забег было с этим
 * уникальным свойством. Мы можем найти кольцо на невидимость и сапоги на
 * полёт, но не можем найти два кольца на невидимость или кольцо на
 * невидимость и сапоги на невидимость».
 *
 * Поэтому у забега есть память: раз выданная сила больше не выпадает нигде и
 * ни на чём. Два одинаковых обещания — это не две находки, а одна, найденная
 * дважды, и вторая обесценивает первую.
 */
export function eligibleArtifactPowers(item, usedPowerIds = []) {
  const tags = artifactTags(item);
  const used = new Set(Array.isArray(usedPowerIds) ? usedPowerIds : []);
  return PROCEDURAL_ARTIFACT_POWERS.filter((power) => (
    !used.has(power.id) && power.tags.some((tag) => tags.includes(tag))
  ));
}

export function guaranteedArtifactDepth(seed, roadLength = 3) {
  if (!Number.isInteger(seed) || seed < 0) throw new TypeError('Artifact schedule requires a seed');
  if (!Number.isInteger(roadLength) || roadLength < 1) {
    throw new TypeError('Artifact schedule requires a positive road length');
  }
  if (roadLength === 1) return 1;
  const firstEligibleDepth = Math.min(2, roadLength);
  // Every floor of the dungeon can hold the promised artifact: the city is not
  // one of them any more, it is the surface above the ladder.
  const span = roadLength - firstEligibleDepth + 1;
  return firstEligibleDepth + (stableHash('artifact-depth-v1', seed) % span);
}

/**
 * The promise repeats. One artefact was owed per run while a run had an end;
 * now that the descent does not, the debt is owed once per road — floors one
 * to eighteen owe one, nineteen to thirty-six owe the next, and so on down.
 * A hero who never leaves is not walking through a desert, and a hero who
 * goes twice as deep does not get twice the luck: the schedule is a promise,
 * not a rate.
 */
export function artifactDepthOnRoad(seed, depth, roadLength = 3) {
  if (!Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Artifact schedule requires a positive depth');
  }
  const road = Math.floor((depth - 1) / roadLength);
  // A different draw for each road, from the same run seed: the second artefact
  // is not on the same floor of its road as the first was of hers.
  return road * roadLength + guaranteedArtifactDepth(seed + road * ROAD_SALT, roadLength);
}

/**
 * Does this floor owe the run an artefact? Any floor can be asked, including
 * the surface: the city is depth zero and its answer is simply no.
 */
export function owesArtifact(seed, depth, roadLength = 3) {
  if (!Number.isInteger(depth) || depth < ARTIFACT_MIN_DEPTH) return false;
  return depth === artifactDepthOnRoad(seed, depth, roadLength);
}

function validateRoll({ seed, depth, item, instanceId, rate }) {
  if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Artifact roll requires a seed and positive depth');
  }
  if (!item?.slot || typeof instanceId !== 'string' || instanceId.length === 0) {
    throw new TypeError('Artifact roll requires stable equipment identity');
  }
  if (!Number.isFinite(rate) || rate < MIN_ARTIFACT_RATE || rate > MAX_ARTIFACT_RATE) {
    throw new RangeError(`Artifact rate must be between ${MIN_ARTIFACT_RATE} and ${MAX_ARTIFACT_RATE}`);
  }
}

export function rollProceduralArtifact({
  seed,
  depth,
  item,
  instanceId,
  guaranteed = false,
  rate = DEFAULT_ARTIFACT_RATE,
  usedPowerIds = [],
} = {}) {
  validateRoll({ seed, depth, item, instanceId, rate });
  const random = createStableRng(stableHash(
    `artifact-v${PROCEDURAL_ARTIFACT_VERSION}`,
    seed,
    depth,
    instanceId,
    item.id,
  ));
  const chance = Math.min(0.32, (0.055 + Math.min(12, depth) * 0.012) * rate);
  if (!guaranteed && (rate === 0 || random() >= chance)) {
    return Object.freeze({ artifactPowerId: null, artifactCurseId: null });
  }
  const power = weightedPick(random, eligibleArtifactPowers(item, usedPowerIds));
  if (!power) return Object.freeze({ artifactPowerId: null, artifactCurseId: null });
  const curse = random() < CURSED_ARTIFACT_CHANCE
    ? weightedPick(random, PROCEDURAL_ARTIFACT_CURSES)
    : null;
  return Object.freeze({
    artifactPowerId: power.id,
    artifactCurseId: curse?.id ?? null,
  });
}

/**
 * The cache decides whether an artefact exists before choosing which of its
 * contents becomes one. Abundance cannot multiply the chance: one cache makes
 * at most one artefact, and only a cache that cost something to open.
 */
export function rollCacheArtifact({
  seed,
  depth,
  findId,
  cacheVariant,
  items,
  guaranteed = false,
  rate = DEFAULT_ARTIFACT_RATE,
  roadLength = MEASURED_ROAD,
  usedPowerIds = [],
} = {}) {
  if (!Array.isArray(items)) throw new TypeError('Cache artifact roll requires container items');
  if (typeof findId !== 'string' || findId.length === 0) {
    throw new TypeError('Cache artifact roll requires a stable find id');
  }
  if (!cacheCanHoldArtifact({ depth, cacheVariant })) return null;
  const eligibleIndexes = items.flatMap((item, index) => item?.slot ? [index] : []);
  if (eligibleIndexes.length === 0 || rate === 0) return null;
  const random = createStableRng(stableHash(
    `artifact-cache-v${PROCEDURAL_ARTIFACT_VERSION}`,
    seed,
    depth,
    findId,
  ));
  // One artefact is promised per road; anything beyond it should feel like luck,
  // not like a schedule. So the odds are a share of one fixed budget spread
  // along the road, weighted toward its deep end — a longer road spreads the
  // same luck over more floors instead of quietly handing out more of it.
  const floorOnRoad = ((depth - 1) % roadLength) + 1;
  const eligibleFloors = Math.max(1, roadLength - ARTIFACT_MIN_DEPTH + 1);
  const rung = Math.max(1, floorOnRoad - ARTIFACT_MIN_DEPTH + 1);
  // Triangular: the shares rise with depth and sum to one across the road.
  const share = (2 * rung) / (eligibleFloors * (eligibleFloors + 1));
  const cacheChance = Math.min(ARTIFACT_LUCK_CAP, ARTIFACT_ROAD_LUCK * share * rate);
  if (!guaranteed && random() >= cacheChance) return null;
  /*
   * Вещь выбирается не вслепую: она должна суметь понести хоть одну силу,
   * которую забег ещё не выдавал. Иначе обещанный артефакт оказался бы
   * обычным сапогом — промах тем обиднее, что сундук за это уже взял плату.
   */
  const carriers = eligibleIndexes.filter(
    (index) => eligibleArtifactPowers(items[index], usedPowerIds).length > 0,
  );
  if (carriers.length === 0) return null;
  const itemIndex = carriers[Math.floor(random() * carriers.length)];
  const item = items[itemIndex];
  const instanceId = `${findId}-item-${itemIndex}`;
  return Object.freeze({
    itemIndex,
    ...rollProceduralArtifact({ seed, depth, item, instanceId, guaranteed: true, rate, usedPowerIds }),
  });
}

export function validateProceduralArtifactState(item, record = {}) {
  const powerId = record.artifactPowerId;
  const curseId = record.artifactCurseId;
  if (powerId === undefined || powerId === null) {
    return curseId === undefined || curseId === null;
  }
  const power = artifactPowerById(powerId);
  if (!power || !eligibleArtifactPowers(item).some(({ id }) => id === powerId)) return false;
  return curseId === undefined || curseId === null || Boolean(artifactCurseById(curseId));
}

export function materializeProceduralArtifact(item, record = item) {
  if (!item?.slot || !record?.artifactPowerId) return item;
  if (!validateProceduralArtifactState(item, record)) {
    throw new TypeError(`Invalid procedural artifact state on ${item.id}`);
  }
  const power = artifactPowerById(record.artifactPowerId);
  const curse = artifactCurseById(record.artifactCurseId);
  const stats = { ...(item.stats ?? {}) };
  for (const [key, value] of Object.entries(curse?.stats ?? {})) {
    stats[key] = (stats[key] ?? 0) + value;
  }
  const immunity = new Set([
    ...(item.magic?.immunity ?? []),
    ...(power.magic.immunity ?? []),
  ]);
  const magic = {
    ...(item.magic ?? {}),
    ...power.magic,
    // A drawback that is a rule travels the same road the power does, so one
    // aggregator sees both and nothing needs a second lookup at the curse.
    ...(curse?.magic ?? {}),
    ...(immunity.size > 0 ? { immunity: [...immunity] } : {}),
  };
  return {
    ...item,
    artifactPowerId: power.id,
    artifactCurseId: curse?.id ?? null,
    rarity: 3,
    stats,
    magic,
  };
}

export function proceduralArtifactName(item, baseName, requestedLanguage = 'ru') {
  if (!item?.artifactPowerId) return baseName;
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  const power = artifactPowerById(item.artifactPowerId);
  if (!power) return baseName;
  const powered = `${baseName} ${power.suffix[language]}`;
  if (!item.artifactCurseId) return powered;
  return language === 'ru' ? `Проклятие: ${powered}` : `Cursed ${powered}`;
}

export function artifactCursePresentation(item, requestedLanguage = 'ru') {
  const curse = artifactCurseById(item?.artifactCurseId);
  if (!curse) return null;
  const language = requestedLanguage === 'en' ? 'en' : 'ru';
  return Object.freeze({
    id: curse.id,
    label: curse.label[language],
    text: curse.effect[language],
  });
}
