import { ACTOR_EFFECTS, applyActorEffect, createActorEffects } from './dcss-rpg-effects.js';

export const VAMPIRISM_RATIO = 0.2;
/*
 * Потолок лечения вампиризмом — на секунду, и он растёт с глубиной.
 *
 * Сам по себе вампиризм не складывается: оружие одно, доля с удара одна. Но
 * лечит он от нанесённого урона, а урон и скорость атаки растут весь забег — и
 * в какой-то момент лечение в секунду обгоняет входящий урон. Это тот самый
 * бессмертный билд, которого Иван боялся: «может нарандомиться какой-то просто
 * максимально имбовый, бесконечный билд».
 *
 * Но и запирать силу навсегда нельзя. Иван: «при всём при этом игра должна
 * давать возможность делать очень крутые билды, просто не на раннем этапе».
 * Поэтому потолок не постоянный, а раздвигается вниз по дороге: на первых
 * этажах вампирский клинок — хорошее оружие, к восемнадцатому — та самая
 * непробиваемая машина, которую игрок собирал.
 *
 * Считается он на секунду, а не на удар, потому что ломает именно сочетание:
 * медленное оружие не теряет ничего, быстрое перестаёт превращать двадцать
 * процентов в бессмертие. Доля — от максимального здоровья, чтобы правило не
 * разъезжалось с ростом героя.
 */
export const VAMPIRISM_RATE_EARLY = 0.07;
export const VAMPIRISM_RATE_DEEP = 0.22;
/** Глубина, на которой потолок раскрывается полностью. */
export const VAMPIRISM_RATE_FULL_DEPTH = 18;

export function vampiricRate(depth = 1) {
  const этаж = Number.isFinite(depth) && depth > 0 ? depth : 1;
  const доля = Math.min(1, (этаж - 1) / Math.max(1, VAMPIRISM_RATE_FULL_DEPTH - 1));
  return VAMPIRISM_RATE_EARLY + (VAMPIRISM_RATE_DEEP - VAMPIRISM_RATE_EARLY) * доля;
}
export const INVISIBILITY_REVEAL_SECONDS = 3;

/**
 * Everything the hero's gear is, in one object.
 *
 * This is the only place worn equipment turns into rules, and it stays that way
 * on purpose: a power added to the artefact table reaches the game by being
 * read here and nowhere else. Never stored — derived from what is worn, so
 * taking a ring off cannot leave its power behind in a save.
 *
 * Flags are ORed: two rings of flight are one flight. Magnitudes are summed and
 * then capped, because two of a good thing is a nice find and four of it is a
 * different game.
 */
export const THORNS_CAP_PERCENT = 40;
export const QUICKENING_CAP_PERCENT = 30;
/**
 * Насколько быстрее ходит тот, кому достались эти сапоги.
 *
 * Задумывалось заклинанием, потом числом на любой вещи — Иван остановил и то
 * и другое: «нет, флагом. Это уникальное свойство типа сапоги, быстрой
 * скорости. Это артефакт, он очень крутой». Поэтому здесь одно число на всю
 * игру: свойство либо есть, либо нет, складывать нечего, и вторая пара
 * сапог ничего не прибавит.
 */
export const SWIFT_STEP_PERCENT = 20;
export const SATIETY_CAP_SHARE = 0.6;
/** What the brands and the tempo powers are worth where the fight reads them. */
export const BRAND_SECONDS = 4;
export const SUNDER_SECONDS = 3;
export const SUNDER_PERCENT = 35;
export const CLAMOUR_MULTIPLIER = 2;

/**
 * Every magic field this aggregator reads, and therefore every mechanic an
 * artefact power, an affix or a curse is allowed to promise.
 *
 * It is exported so the catalogues can be checked against the implementation
 * instead of against a hand-copied list — a whitelist typed out in a test is a
 * list that goes stale the first time somebody adds a power.
 */
export const MAGIC_MAGNITUDES = Object.freeze([
  'healOnKill', 'thorns', 'quickening', 'satiety', 'execute',
  'appetite', 'greed', 'bloodlust', 'riverborn',
]);

const MAGIC_FLAGS = Object.freeze([
  'swiftness',
  'flight',
  'invisibility',
  'vampirism',
  'conductor',
  'piercing',
  'sundering',
  'hushed',
  'secondWind',
  'anchored',
  'sense',
  // Drawbacks ride the same road as powers: one aggregator, not two.
  'gluttony',
  'clamour',
  'sodden',
  'sticky',
]);

export const MAGIC_TRAIT_KEYS = Object.freeze([
  ...MAGIC_FLAGS, ...MAGIC_MAGNITUDES, 'immunity', 'brand',
]);

// Derived from owned equipment, never stored as a second source of truth.
export function equipmentMagic(equipment, items) {
  const byUid = items instanceof Map ? items : new Map(items.map((item) => [item.uid, item]));
  const immunity = new Set();
  const brands = new Set();
  const flags = Object.fromEntries(MAGIC_FLAGS.map((id) => [id, false]));
  let healOnKill = 0;
  let thorns = 0;
  let quickening = 0;
  let satiety = 0;
  let execute = 0;
  let appetite = 0;
  let greed = 0;
  let bloodlust = 0;
  let riverborn = 0;
  for (const uid of new Set(Object.values(equipment).filter(Boolean))) {
    const magic = byUid.get(uid)?.magic;
    if (!magic) continue;
    for (const id of magic.immunity ?? []) {
      if (Object.hasOwn(ACTOR_EFFECTS, id)) immunity.add(id);
    }
    if (typeof magic.brand === 'string' && Object.hasOwn(ACTOR_EFFECTS, magic.brand)) {
      brands.add(magic.brand);
    }
    healOnKill += Math.max(0, magic.healOnKill ?? 0);
    thorns += Math.max(0, magic.thorns ?? 0);
    quickening += Math.max(0, magic.quickening ?? 0);
    satiety += Math.max(0, magic.satiety ?? 0);
    appetite += Math.max(0, magic.appetite ?? 0);
    greed += Math.max(0, magic.greed ?? 0);
    bloodlust += Math.max(0, magic.bloodlust ?? 0);
    riverborn += Math.max(0, magic.riverborn ?? 0);
    // The deepest threshold wins rather than adding up: two executioners do not
    // make a weapon that kills anything under thirty percent.
    execute = Math.max(execute, Math.max(0, magic.execute ?? 0));
    for (const id of MAGIC_FLAGS) flags[id] ||= magic[id] === true;
  }
  return Object.freeze({
    ...flags,
    immunity: Object.freeze([...immunity]),
    // A weapon carries one brand; two branded weapons in two hands carry both.
    brands: Object.freeze([...brands]),
    healOnKill: Math.min(4, healOnKill),
    thorns: Math.min(THORNS_CAP_PERCENT, thorns),
    quickening: Math.min(QUICKENING_CAP_PERCENT, quickening),
    satiety: Math.min(SATIETY_CAP_SHARE, satiety),
    execute: Math.min(0.25, execute),
    // What a trade costs and what it pays. Both ends are capped: three greedy
    // rings should be a build, not a way out of the economy.
    appetite: Math.min(2, appetite),
    greed: Math.min(1, greed),
    bloodlust: Math.min(1, bloodlust),
    riverborn: Math.min(1, riverborn),
  });
}

export function wardActorEffects(effects, magic) {
  const next = createActorEffects(effects);
  const cleared = [];
  for (const id of magic.immunity) {
    if (next[id] > 0) cleared.push(id);
    next[id] = 0;
  }
  return Object.freeze({ effects: next, cleared: Object.freeze(cleared) });
}

export function applyWardedEffect(effects, id, duration, magic) {
  // Validate the intent even when a ward will block it.
  const attempt = applyActorEffect(effects, id, duration);
  if (!magic.immunity.includes(id)) return { ...attempt, blocked: null };
  return Object.freeze({
    ...wardActorEffects(effects, magic), applied: null, reaction: null, blocked: id,
  });
}

export function resolveKillRecovery({ hp, maxHp, magic, newlyDefeated }) {
  if (!newlyDefeated || hp <= 0) return Object.freeze({ hp, healed: 0 });
  const healed = Math.max(0, Math.min(magic.healOnKill, maxHp - hp));
  return Object.freeze({ hp: hp + healed, healed });
}

/**
 * Сколько вампиризм способен вернуть за секунду этому герою на этой глубине.
 *
 * `entryShare` — доля давления на входе в подземелье (первые этажи бьют
 * слабее и врагов там меньше, см. кривую сложности v4). Потолок меряется тем
 * давлением, что приходит, поэтому на входе он опускается той же долей:
 * иначе вампир с первого этажа лечился бы быстрее, чем по нему бьют.
 */
export function vampiricBudget(maxHp, depth = 1, entryShare = 1) {
  if (!Number.isFinite(maxHp) || maxHp <= 0) return 0;
  const share = Number.isFinite(entryShare) && entryShare > 0 ? Math.min(1, entryShare) : 1;
  return Math.max(1, Math.floor(maxHp * vampiricRate(depth) * share));
}

/**
 * Глоток крови.
 *
 * `budget` — сколько ещё разрешено вернуть в этой секунде; вызывающий копит его
 * сам и получает остаток обратно. Без бюджета (по умолчанию) правило работает
 * как прежде — это нужно тем, кто считает один удар в отрыве от времени.
 */
export function resolveVampiricRecovery({ hp, maxHp, damage, magic, budget = Infinity }) {
  if (!magic?.vampirism || hp <= 0 || damage <= 0) {
    return Object.freeze({ hp, healed: 0, budget });
  }
  const requested = Math.max(1, Math.floor(damage * VAMPIRISM_RATIO));
  const allowed = Math.min(requested, Math.max(0, Math.floor(budget)));
  const healed = Math.max(0, Math.min(allowed, maxHp - hp));
  return Object.freeze({ hp: hp + healed, healed, budget: budget - healed });
}

export function magicItemEffects(item, language = 'ru') {
  const ru = language !== 'en';
  const rows = (item.magic?.immunity ?? []).map((id) => ({
    icon: '◇',
    text: ru
      ? `Защита от состояния «${ACTOR_EFFECTS[id].labels.ru}». Снимает его при надевании; прямой урон врага остаётся.`
      : `Prevents the ${ACTOR_EFFECTS[id].labels.en.toLowerCase()} status. Clears it when equipped; enemy hit damage still applies.`,
  }));
  if (item.magic?.healOnKill) rows.push({
    icon: '♥',
    text: ru
      ? `Восстанавливает ${item.magic.healOnKill} здоровья за победу над врагом. Общий предел: 4 за победу.`
      : `Restores ${item.magic.healOnKill} health per enemy defeated. Combined cap: 4 per defeat.`,
  });
  if (item.magic?.flight) rows.push({
    icon: '↟',
    text: ru
      ? 'Полёт: ловушки и опасный пол не мешают движению.'
      : 'Flight: traps and hazardous ground do not block movement.',
  });
  if (item.magic?.invisibility) rows.push({
    icon: '◌',
    text: ru
      ? `Невидимость: враги теряют героя. Атака раскрывает его на ${INVISIBILITY_REVEAL_SECONDS} с.`
      : `Invisibility: enemies lose the hero. Attacking reveals them for ${INVISIBILITY_REVEAL_SECONDS}s.`,
  });
  if (item.magic?.vampirism) rows.push({
    icon: '♦',
    text: ru
      ? `Вампиризм: ${VAMPIRISM_RATIO * 100}% нанесённого оружием урона возвращается здоровьем.`
      : `Vampirism: ${VAMPIRISM_RATIO * 100}% of weapon damage dealt returns as health.`,
  });
  // A power the card cannot describe is a power the player will not buy: the
  // shop has to answer «что эта вещь делает» before the money changes hands.
  for (const row of extraMagicRows(item.magic ?? {}, ru)) rows.push(row);
  return rows;
}

/**
 * The traits added after the first three, described once. Both surfaces that
 * explain an item — the shop card and the item sheet — read this, so a new
 * power is described in one place and cannot be live in one and silent in the
 * other.
 */
export function extraMagicRows(magic, ru = true) {
  const rows = [];
  const say = (icon, text) => rows.push({ icon, text });
  if (magic.conductor) say('⌁', ru
    ? `Проводник: удар по стоящему в воде бьёт и всех остальных в той же воде.`
    : 'Conductor: striking a target in water shocks everything else standing in it.');
  if (magic.piercing) say('→', ru
    ? 'Сквозной ход: удар задевает того, кто стоит за целью.'
    : 'Clean pass: the blow also catches whoever stands behind the target.');
  if (magic.sundering) say('◱', ru
    ? `Раскол: удар снимает ${SUNDER_PERCENT}% защиты цели на ${SUNDER_SECONDS} с.`
    : `Sundering: a hit strips ${SUNDER_PERCENT}% of the target's defence for ${SUNDER_SECONDS}s.`);
  if (typeof magic.brand === 'string') {
    const name = ACTOR_EFFECTS[magic.brand]?.labels?.[ru ? 'ru' : 'en'] ?? magic.brand;
    say('✶', ru
      ? `Клеймо: удар накладывает состояние «${name}» на ${BRAND_SECONDS} с.`
      : `Brand: a hit inflicts ${name.toLowerCase()} for ${BRAND_SECONDS}s.`);
  }
  if (magic.execute) say('⚔', ru
    ? `Палач: добивает врага, у которого осталось меньше ${Math.round(magic.execute * 100)}% здоровья.`
    : `Headsman: finishes an enemy already below ${Math.round(magic.execute * 100)}% health.`);
  if (magic.thorns) say('✸', ru
    ? `Тернии: ${magic.thorns}% полученного в ближнем бою урона возвращается бьющему.`
    : `Thorns: ${magic.thorns}% of melee damage taken is returned to the attacker.`);
  if (magic.hushed) say('◌', ru
    ? 'Тихий шаг: шаги слышно вдвое ближе — мимо комнаты можно пройти.'
    : 'Quiet step: footsteps carry half as far — a room can be walked past.');
  if (magic.secondWind) say('♥', ru
    ? 'Второе дыхание: раз на этаж смертельный удар оставляет 1 здоровья.'
    : 'Second wind: once per floor a killing blow leaves 1 health.');
  if (magic.anchored) say('⚓', ru
    ? 'Якорь: героя нельзя притянуть и отбросить.'
    : 'Anchor: the hero cannot be dragged or pulled.');
  if (magic.satiety) say('☘', ru
    ? `Сытость: голод идёт на ${Math.round(magic.satiety * 100)}% медленнее.`
    : `Plenty: hunger runs ${Math.round(magic.satiety * 100)}% slower.`);
  if (magic.sense) say('◈', ru
    ? 'Чутьё: тайники и ловушки видно без поиска.'
    : 'Keen sense: caches and traps are visible without searching.');
  if (magic.quickening) say('✦', ru
    ? `Скорая рука: заклинания откатываются на ${magic.quickening}% быстрее.`
    : `Quick hand: spells come back ${magic.quickening}% sooner.`);
  if (magic.swiftness) say('»', ru
    ? `Лёгкий шаг: герой идёт на ${SWIFT_STEP_PERCENT}% быстрее.`
    : `Light step: the hero moves ${SWIFT_STEP_PERCENT}% faster.`);
  // The drawbacks say what they are in the same voice. A curse the card hides
  // is a card that lied.
  if (magic.appetite) say('✘', ru
    ? `Голод идёт на ${Math.round(magic.appetite * 100)}% быстрее.`
    : `Hunger runs ${Math.round(magic.appetite * 100)}% faster.`);
  if (magic.greed) say('◆', ru
    ? `Скупец: на ${Math.round(magic.greed * 100)}% больше золота — и враги замечают на столько же дальше.`
    : `Miser: ${Math.round(magic.greed * 100)}% more gold — and enemies spot you that much further off.`);
  if (magic.bloodlust) say('♦', ru
    ? `Ярость: +${Math.round(magic.bloodlust * 100)}% урона, пока здоровья меньше трети.`
    : `Fury: +${Math.round(magic.bloodlust * 100)}% damage while below a third health.`);
  if (magic.riverborn) say('≈', ru
    ? `Речной: +${Math.round(magic.riverborn * 100)}% урона, пока стоишь в воде.`
    : `River-born: +${Math.round(magic.riverborn * 100)}% damage while standing in water.`);
  if (magic.gluttony) say('✘', ru
    ? 'Прожорливость: голод идёт вдвое быстрее.'
    : 'Gluttony: hunger runs twice as fast.');
  if (magic.clamour) say('✘', ru
    ? `Шум: шаги слышно в ${CLAMOUR_MULTIPLIER} раза дальше.`
    : `Clamour: footsteps carry ${CLAMOUR_MULTIPLIER}× as far.`);
  if (magic.sodden) say('✘', ru
    ? 'Сырость: герой всегда мокрый — ток по воде бьёт больнее, огонь слабее.'
    : 'Sodden: always wet — lightning through water hurts more, fire less.');
  if (magic.sticky) say('⛓', ru
    ? 'Оковы: вещь нельзя снять. Освободит только снятие проклятия.'
    : 'Binding: the item cannot be removed. Only a lifting of the curse frees it.');
  return rows;
}
