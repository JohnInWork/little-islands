import { ACTOR_EFFECTS } from './dcss-rpg-effects.js';
import { artifactCurseById, artifactCursePresentation } from './dcss-rpg-artifacts.js';
import { INVISIBILITY_REVEAL_SECONDS, VAMPIRISM_RATIO } from './dcss-rpg-magic.js';
import { spellById } from './dcss-rpg-spells.js';

export const ITEM_DESCRIPTION_VERSION = 3;

const freezeFact = (fact) => Object.freeze(fact);
const locale = (requested) => requested === 'en' ? 'en' : 'ru';
const signed = (value, suffix = '') => `${value >= 0 ? '+' : '−'}${Math.abs(value)}${suffix}`;

export const ITEM_STAT_DICTIONARY = Object.freeze({
  attack: Object.freeze({ icon: '⚔', percent: false, ru: 'атака', en: 'attack', weight: 4 }),
  defense: Object.freeze({ icon: '◆', percent: false, ru: 'защита', en: 'defence', weight: 3 }),
  maxHp: Object.freeze({ icon: '♥', percent: false, ru: 'здоровье', en: 'health', weight: 0.5 }),
  moveSpeed: Object.freeze({ icon: '↟', percent: true, ru: 'движение', en: 'move speed', weight: 100 }),
  attackSpeed: Object.freeze({ icon: '✦', percent: true, ru: 'темп атаки', en: 'attack tempo', weight: 100 }),
  intelligence: Object.freeze({ icon: '✧', percent: false, ru: 'интеллект', en: 'intelligence', weight: 4 }),
});

const SLOT_TYPES = Object.freeze({
  ru: Object.freeze({
    body: 'Доспех',
    head: 'Головной убор',
    boots: 'Сапоги',
    cloak: 'Плащ',
    gloves: 'Перчатки',
    belt: 'Пояс',
    ring1: 'Кольцо',
    ring2: 'Кольцо',
    amulet: 'Амулет',
    shield: 'Щит',
    focus: 'Фокус',
    consumable: 'Расходуемое',
  }),
  en: Object.freeze({
    body: 'Armour',
    head: 'Headwear',
    boots: 'Boots',
    cloak: 'Cloak',
    gloves: 'Gloves',
    belt: 'Belt',
    ring1: 'Ring',
    ring2: 'Ring',
    amulet: 'Amulet',
    shield: 'Shield',
    focus: 'Focus',
    consumable: 'Consumable',
  }),
});

const ITEM_KIND_TYPES = Object.freeze({
  ru: Object.freeze({
    potion: 'Зелье',
    scroll: 'Свиток',
    wand: 'Жезл',
    book: 'Книга',
    food: 'Еда',
    ingredient: 'Ингредиент',
    key: 'Ключ',
    tool: 'Инструмент',
    trap: 'Ловушка',
    currency: 'Золото',
  }),
  en: Object.freeze({
    potion: 'Potion',
    scroll: 'Scroll',
    wand: 'Wand',
    book: 'Book',
    food: 'Food',
    ingredient: 'Ingredient',
    key: 'Key',
    tool: 'Tool',
    trap: 'Trap',
    currency: 'Gold',
  }),
});

const WEAPON_TYPES = Object.freeze({
  ru: Object.freeze({
    dagger: Object.freeze({ 1: 'Одноручный клинок', 2: 'Двуручный клинок' }),
    sword: Object.freeze({ 1: 'Одноручный меч', 2: 'Двуручный меч' }),
    axe: Object.freeze({ 1: 'Одноручный топор', 2: 'Двуручный топор' }),
    staff: Object.freeze({ 1: 'Одноручный посох', 2: 'Двуручный посох' }),
    spear: Object.freeze({ 1: 'Одноручное древковое', 2: 'Двуручное древковое' }),
    blunt: Object.freeze({ 1: 'Одноручное тяжёлое', 2: 'Двуручное тяжёлое' }),
    bow: Object.freeze({ 1: 'Одноручный лук', 2: 'Двуручный лук' }),
  }),
  en: Object.freeze({
    dagger: Object.freeze({ 1: 'One-handed blade', 2: 'Two-handed blade' }),
    sword: Object.freeze({ 1: 'One-handed sword', 2: 'Two-handed sword' }),
    axe: Object.freeze({ 1: 'One-handed axe', 2: 'Two-handed axe' }),
    staff: Object.freeze({ 1: 'One-handed staff', 2: 'Two-handed staff' }),
    spear: Object.freeze({ 1: 'One-handed polearm', 2: 'Two-handed polearm' }),
    blunt: Object.freeze({ 1: 'One-handed heavy weapon', 2: 'Two-handed heavy weapon' }),
    bow: Object.freeze({ 1: 'One-handed bow', 2: 'Two-handed bow' }),
  }),
});

const COPY = Object.freeze({
  ru: Object.freeze({
    unknownItem: 'эффект неизвестен',
    unknownEffect: 'Эффект неизвестен до использования или опознания',
    oneHand: 'Вторая рука свободна',
    twoHands: 'Занимает обе руки',
    range: 'Дальность',
    guard: 'Блок урона',
    projectile: 'Снаряд',
    tempoFast: 'Быстрый темп',
    tempoBalanced: 'Средний темп',
    tempoHeavy: 'Тяжёлый темп',
    immunity: 'Иммунитет',
    healOnKill: 'Лечение за убийство',
    combinedCap: 'макс. 4',
    flight: 'Полёт · ловушки и опасный пол безопасны',
    invisibility: `Невидимость · атака раскрывает на ${INVISIBILITY_REVEAL_SECONDS} с`,
    vampirism: `Вампиризм · лечение на ${VAMPIRISM_RATIO * 100}% урона`,
    artifactCurse: 'Проклятие',
    heal: 'Лечение',
    satiety: 'Сытость',
    minutes: 'мин',
    power: 'Сила до конца забега',
    camp: 'Разбивает лагерь',
    bandage: 'Перевязка ран',
    cleanse: 'Снимает все состояния',
    venom: 'Отравление',
    seconds: 'с',
    blink: (range) => `Скачок на выбранную клетку · дальность ${range}`,
    targetEffect: (effect, duration, range) => `Состояние «${effect}»: ${duration} с · дальность ${range}`,
    key: 'Открывает обычный замок · расходуется',
    lockpick: 'Взлом замка · нужен навык · расходуется',
    trap: 'Установка рядом · нужен Ловушечник I',
    gold: 'При подборе превращается в золото',
    cooking: 'Можно приготовить у костра',
    bookStudy: 'Случайный навык получает +1 ранг до конца забега',
    bookForget: 'Случайный действующий навык теряет 1 ранг до конца забега',
    bookBlank: 'Пустые страницы · эффекта нет',
    bookSpell: (spell) => `Обучает: ${spell.name.ru} · нужен интеллект ${spell.minimumIntelligence}`,
  }),
  en: Object.freeze({
    unknownItem: 'unknown effect',
    unknownEffect: 'Effect stays unknown until used or identified',
    oneHand: 'Off hand stays free',
    twoHands: 'Occupies both hands',
    range: 'Range',
    guard: 'Damage block',
    projectile: 'Projectile',
    tempoFast: 'Fast tempo',
    tempoBalanced: 'Balanced tempo',
    tempoHeavy: 'Heavy tempo',
    immunity: 'Immunity',
    healOnKill: 'Healing per kill',
    combinedCap: 'max 4',
    flight: 'Flight · traps and hazardous ground are safe',
    invisibility: `Invisibility · attacks reveal for ${INVISIBILITY_REVEAL_SECONDS}s`,
    vampirism: `Vampirism · heals for ${VAMPIRISM_RATIO * 100}% of damage`,
    artifactCurse: 'Curse',
    heal: 'Healing',
    satiety: 'Satiety',
    minutes: 'min',
    power: 'Run power',
    camp: 'Pitches a camp',
    bandage: 'Dresses wounds',
    cleanse: 'Clears all statuses',
    venom: 'Poison',
    seconds: 's',
    blink: (range) => `Blink to a chosen tile · range ${range}`,
    targetEffect: (effect, duration, range) => `Applies “${effect}”: ${duration}s · range ${range}`,
    key: 'Opens an ordinary lock · consumed',
    lockpick: 'Picks a lock · requires skill · consumed',
    trap: 'Place nearby · requires Trap setting I',
    gold: 'Turns into gold when collected',
    cooking: 'Can be cooked at a campfire',
    bookStudy: 'One random skill gains +1 rank for this run',
    bookForget: 'One random active skill loses 1 rank for this run',
    bookBlank: 'Blank pages · no effect',
    bookSpell: (spell) => `Teaches: ${spell.name.en} · requires intelligence ${spell.minimumIntelligence}`,
  }),
});

function formattedStatValue(definition, rawValue) {
  const precise = definition.percent ? rawValue * 100 : rawValue;
  return Math.round(precise * 10) / 10;
}

function statFacts(item, language, excluded = new Set()) {
  return Object.entries(item.stats ?? {}).flatMap(([id, rawValue]) => {
    if (excluded.has(id)) return [];
    const definition = ITEM_STAT_DICTIONARY[id];
    if (!definition) throw new Error(`Missing item stat dictionary entry: ${id}`);
    if (!Number.isFinite(rawValue)) throw new TypeError(`Invalid ${id} stat on ${item.id}`);
    const value = formattedStatValue(definition, rawValue);
    const text = `${signed(value, definition.percent ? '%' : '')} ${definition[language]}`;
    return [freezeFact({ id: `stat:${id}`, kind: 'stat', icon: definition.icon, text, short: text })];
  });
}

function handednessFact(item, language) {
  if (item.slot !== 'hand1') return [];
  const text = item.hands === 2 ? COPY[language].twoHands : COPY[language].oneHand;
  return [freezeFact({
    id: item.hands === 2 ? 'hands:2' : 'hands:1',
    kind: 'rule',
    icon: item.hands === 2 ? 'Ⅱ' : 'Ⅰ',
    text,
    short: null,
  })];
}

function combatFacts(item, language) {
  if (!item.combat) return [];
  if (Number.isFinite(item.combat.guard) && item.combat.guard > 0) {
    const text = `${COPY[language].guard}: ${item.combat.guard}`;
    return [freezeFact({ id: 'combat:guard', kind: 'combat', icon: '▣', text, short: text })];
  }
  if (!Number.isFinite(item.combat.range) || !Number.isFinite(item.combat.cooldown)) {
    throw new TypeError(`Invalid combat description data on ${item.id}`);
  }
  const tempo = item.combat.cooldown <= 0.62
    ? COPY[language].tempoFast
    : item.combat.cooldown <= 0.9
      ? COPY[language].tempoBalanced
      : COPY[language].tempoHeavy;
  const projectile = item.combat.projectile ? ` · ${COPY[language].projectile}` : '';
  const text = `${COPY[language].range}: ${item.combat.range} · ${tempo}${projectile}`;
  return [freezeFact({
    id: 'combat:profile',
    kind: 'combat',
    icon: item.combat.projectile === 'arrow' ? '➶' : item.combat.projectile ? '✦' : '⚔',
    text,
    short: text,
  })];
}

function magicFacts(item, language) {
  if (!item.magic) return [];
  const allowed = new Set(['immunity', 'healOnKill', 'flight', 'invisibility', 'vampirism']);
  for (const key of Object.keys(item.magic)) {
    if (!allowed.has(key)) throw new Error(`Missing item magic dictionary entry: ${key}`);
  }
  const facts = [];
  for (const id of ['flight', 'invisibility', 'vampirism']) {
    if (!item.magic[id]) continue;
    const icon = id === 'flight' ? '↟' : id === 'invisibility' ? '◌' : '♦';
    facts.push(freezeFact({ id: `magic:${id}`, kind: 'artifact', icon, text: COPY[language][id], short: COPY[language][id] }));
  }
  for (const id of item.magic.immunity ?? []) {
    const effect = ACTOR_EFFECTS[id];
    if (!effect) throw new Error(`Unknown item immunity: ${id}`);
    const label = effect.labels[language];
    const text = `${COPY[language].immunity}: ${label}`;
    facts.push(freezeFact({ id: `magic:immunity:${id}`, kind: 'magic', icon: '◇', text, short: text }));
  }
  if (item.magic.healOnKill) {
    const text = `${COPY[language].healOnKill}: +${item.magic.healOnKill} · ${COPY[language].combinedCap}`;
    facts.push(freezeFact({ id: 'magic:heal-on-kill', kind: 'magic', icon: '♥', text, short: text }));
  }
  return facts;
}

function artifactCurseFacts(item, language) {
  const presentation = artifactCursePresentation(item, language);
  if (!presentation) return [];
  const text = `${COPY[language].artifactCurse}: ${presentation.label} · ${presentation.text}`;
  return [freezeFact({
    id: `artifact-curse:${presentation.id}`,
    kind: 'artifact-curse',
    icon: '!',
    text,
    short: text,
  })];
}

function effectFact(effect, language, source) {
  if (!effect) return null;
  if (effect.type === 'heal' && Number.isFinite(effect.amount) && effect.amount > 0) {
    const text = `${COPY[language].heal}: +${effect.amount}`;
    return freezeFact({ id: `${source}:heal`, kind: 'use', icon: '♥', text, short: text });
  }
  if (
    effect.type === 'food'
    && Number.isInteger(effect.nutrition)
    && effect.nutrition > 0
    && Number.isFinite(effect.healing)
    && effect.healing >= 0
  ) {
    const minutes = Math.ceil(effect.nutrition / 60);
    const healing = effect.healing > 0 ? ` · ${COPY[language].heal}: +${effect.healing}` : '';
    const text = `${COPY[language].satiety}: +${minutes} ${COPY[language].minutes}${healing}`;
    return freezeFact({ id: `${source}:food`, kind: 'use', icon: '◆', text, short: text });
  }
  if (effect.type === 'power' && Number.isFinite(effect.amount) && effect.amount > 0) {
    const text = `${COPY[language].power}: +${effect.amount}`;
    return freezeFact({ id: `${source}:power`, kind: 'use', icon: '⚔', text, short: text });
  }
  if (effect.type === 'camp') {
    const text = COPY[language].camp;
    return freezeFact({ id: `${source}:camp`, kind: 'use', icon: '\u2302', text, short: text });
  }
  if (effect.type === 'bandage') {
    const text = COPY[language].bandage;
    return freezeFact({ id: `${source}:bandage`, kind: 'use', icon: '\u271a', text, short: text });
  }
  if (effect.type === 'cleanse') {
    const text = COPY[language].cleanse;
    return freezeFact({ id: `${source}:cleanse`, kind: 'use', icon: '◇', text, short: text });
  }
  if (
    effect.type === 'venom'
    && Number.isFinite(effect.damage)
    && effect.damage > 0
    && Number.isFinite(effect.duration)
    && effect.duration > 0
  ) {
    const text = `−${effect.damage} ♥ · ${COPY[language].venom}: ${effect.duration}${COPY[language].seconds}`;
    return freezeFact({ id: `${source}:venom`, kind: 'use', icon: '☠', text, short: text });
  }
  if (
    effect.type === 'blink'
    && Number.isInteger(effect.range)
    && effect.range >= 1
    && effect.range <= 8
  ) {
    const text = COPY[language].blink(effect.range);
    return freezeFact({ id: `${source}:blink`, kind: 'use', icon: '✦', text, short: text });
  }
  if (
    effect.type === 'target-effect'
    && ACTOR_EFFECTS[effect.effectId]
    && Number.isFinite(effect.duration)
    && effect.duration > 0
    && Number.isInteger(effect.range)
    && effect.range >= 1
    && effect.range <= 8
  ) {
    const definition = ACTOR_EFFECTS[effect.effectId];
    const text = COPY[language].targetEffect(
      definition.labels[language],
      effect.duration,
      effect.range,
    );
    return freezeFact({
      id: `${source}:target-effect:${effect.effectId}`,
      kind: 'use',
      icon: effect.effectId === 'wet' ? '≈' : '✦',
      text,
      short: text,
    });
  }
  throw new Error(`Missing item use-effect dictionary entry: ${effect.type ?? 'unknown'}`);
}

function utilityFacts(item, language) {
  const facts = [];
  const potion = effectFact(item.potionEffect, language, 'potion');
  const use = effectFact(item.useEffect, language, 'use');
  if (potion) facts.push(potion);
  if (use) facts.push(use);
  if (item.bookEffect) {
    const taughtSpell = item.bookEffect.type === 'learn-spell'
      ? spellById(item.bookEffect.spellId)
      : null;
    const copyId = item.bookEffect.type === 'study'
      ? 'bookStudy'
      : item.bookEffect.type === 'forget'
        ? 'bookForget'
        : item.bookEffect.type === 'blank'
          ? 'bookBlank'
          : taughtSpell
            ? 'bookSpell'
          : null;
    if (!copyId) throw new Error(`Missing book-effect dictionary entry: ${item.bookEffect.type}`);
    const text = copyId === 'bookSpell'
      ? COPY[language][copyId](taughtSpell)
      : COPY[language][copyId];
    facts.push(freezeFact({
      id: `book:${item.bookEffect.type}`,
      kind: 'use',
      icon: item.bookEffect.type === 'study'
        ? '+'
        : item.bookEffect.type === 'forget'
          ? '−'
          : item.bookEffect.type === 'learn-spell'
            ? '✦'
            : '·',
      text,
      short: text,
    }));
  }
  if (item.interactionResource) {
    const text = COPY[language][item.interactionResource];
    if (!text) throw new Error(`Missing interaction-resource dictionary entry: ${item.interactionResource}`);
    facts.push(freezeFact({
      id: `resource:${item.interactionResource}`,
      kind: 'use',
      icon: item.interactionResource === 'key'
        ? '⌑'
        : item.interactionResource === 'cooking'
          ? '♨'
          : '⌁',
      text,
      short: text,
    }));
  }
  if (item.placeableTrap) {
    if (item.placeableTrap !== 'jaw') throw new Error(`Missing trap dictionary entry: ${item.placeableTrap}`);
    const text = COPY[language].trap;
    facts.push(freezeFact({ id: 'trap:jaw', kind: 'use', icon: '⌖', text, short: text }));
  }
  if (item.gold) {
    const text = COPY[language].gold;
    facts.push(freezeFact({ id: 'pickup:gold', kind: 'use', icon: '●', text, short: text }));
  }
  return facts;
}

export function itemTypeLabel(item, requestedLanguage = 'ru') {
  const language = locale(requestedLanguage);
  if (item?.unidentified && item?.kind) {
    const type = ITEM_KIND_TYPES[language][item.kind];
    if (!type) throw new Error(`Missing unidentified item-kind dictionary entry: ${item.kind}`);
    return type;
  }
  if (item?.identification?.group === 'potion' || item?.potionEffect) {
    return language === 'ru' ? 'Зелье' : 'Potion';
  }
  if (item?.slot === 'hand1') {
    const family = WEAPON_TYPES[language][item.weaponFamily];
    if (!family) throw new Error(`Missing weapon-family dictionary entry: ${item.weaponFamily ?? 'unknown'}`);
    return family[item.hands === 2 ? 2 : 1];
  }
  if (item?.slot === 'hand2' && item.offhandKind) {
    const type = SLOT_TYPES[language][item.offhandKind];
    if (!type) throw new Error(`Missing off-hand dictionary entry: ${item.offhandKind}`);
    return type;
  }
  if (!item?.slot && item?.kind) {
    const type = ITEM_KIND_TYPES[language][item.kind];
    if (!type) throw new Error(`Missing item-kind dictionary entry: ${item.kind}`);
    return type;
  }
  return SLOT_TYPES[language][item?.slot] ?? SLOT_TYPES[language].consumable;
}

export function generatedItemDescription(item, requestedLanguage = 'ru') {
  if (!item?.id) throw new TypeError('Item description requires a stable item id');
  const language = locale(requestedLanguage);
  if (item.unidentified) {
    const fact = freezeFact({
      id: 'unknown:effect',
      kind: 'unknown',
      icon: '?',
      text: COPY[language].unknownEffect,
      short: COPY[language].unknownEffect,
    });
    return Object.freeze({
      version: ITEM_DESCRIPTION_VERSION,
      type: itemTypeLabel(item, language),
      summary: `${itemTypeLabel(item, language)} · ${COPY[language].unknownItem}`,
      facts: Object.freeze([fact]),
      primary: fact,
    });
  }

  const artifactCurse = artifactCurseById(item.artifactCurseId);
  const stats = statFacts(item, language, new Set(Object.keys(artifactCurse?.stats ?? {})));
  const utility = utilityFacts(item, language);
  const magic = magicFacts(item, language);
  const artifactCurses = artifactCurseFacts(item, language);
  const combat = combatFacts(item, language);
  const rules = handednessFact(item, language);
  const facts = [...magic, ...artifactCurses, ...utility, ...stats, ...combat, ...rules];
  if (facts.length === 0) {
    throw new Error(`Item has no describable gameplay data: ${item.id}`);
  }
  const type = itemTypeLabel(item, language);
  const summaryParts = [
    type,
    ...facts.filter(({ short }) => short).map(({ short }) => short),
  ];
  const primary = magic[0]
    ?? artifactCurses[0]
    ?? utility[0]
    ?? [...stats].sort((left, right) => {
      const leftId = left.id.slice('stat:'.length);
      const rightId = right.id.slice('stat:'.length);
      return ITEM_STAT_DICTIONARY[rightId].weight - ITEM_STAT_DICTIONARY[leftId].weight;
    })[0]
    ?? combat[0]
    ?? rules[0];
  return Object.freeze({
    version: ITEM_DESCRIPTION_VERSION,
    type,
    summary: summaryParts.join(' · '),
    facts: Object.freeze(facts),
    primary,
  });
}

export const itemDescriptionLanguages = Object.freeze(['ru', 'en']);
