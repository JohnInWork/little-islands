export const SPELL_STATE_VERSION = 1;
export const SPELL_SLOT_COUNT = 3;

const freezeSpell = (spell) => Object.freeze({
  ...spell,
  name: Object.freeze({ ...spell.name }),
  description: Object.freeze({ ...spell.description }),
  ...(spell.status ? { status: Object.freeze({ ...spell.status }) } : {}),
});

export const SPELL_CATALOG = Object.freeze([
  freezeSpell({
    id: 'ember-bolt',
    schoolId: 'pyromancy',
    kind: 'projectile',
    targetMode: 'nearest',
    icon: 'derived/icon/wand-fire.png',
    color: '#ee783f',
    minimumIntelligence: 3,
    cooldown: 4.2,
    range: 5.5,
    basePower: 7,
    name: { ru: 'Огненная стрела', en: 'Ember Bolt' },
    description: {
      ru: 'Поражает ближайшего видимого врага. Интеллект и Пиромантия усиливают урон.',
      en: 'Strikes the nearest visible enemy. Intelligence and Pyromancy increase its damage.',
    },
  }),
  freezeSpell({
    id: 'frost-lance',
    schoolId: 'cryomancy',
    kind: 'projectile',
    targetMode: 'actor',
    icon: 'derived/icon/wand-frost.png',
    color: '#77d4df',
    minimumIntelligence: 4,
    cooldown: 6.4,
    range: 6,
    basePower: 5,
    status: { id: 'chilled', baseDuration: 4, maximumDuration: 8 },
    name: { ru: 'Ледяное копьё', en: 'Frost Lance' },
    description: {
      ru: 'Выбери видимого врага. Наносит урон и надолго замедляет движение.',
      en: 'Choose a visible enemy. Deals damage and slows movement for several seconds.',
    },
  }),
  freezeSpell({
    id: 'storm-bolt',
    schoolId: 'storm-magic',
    kind: 'projectile',
    targetMode: 'actor',
    icon: 'derived/icon/wand-lightning.png',
    color: '#8fdff2',
    minimumIntelligence: 5,
    cooldown: 7.2,
    range: 6,
    basePower: 6,
    name: { ru: 'Грозовой разряд', en: 'Storm Bolt' },
    description: {
      ru: 'Выбери видимого врага. Грозовая магия проводит разряд через цепь мокрых целей.',
      en: 'Choose a visible enemy. Storm Magic conducts the bolt through a chain of wet targets.',
    },
  }),
  freezeSpell({
    id: 'mending-light',
    schoolId: 'cleansing',
    kind: 'heal',
    icon: 'derived/icon/wand-heal_wounds.png',
    color: '#8ed49a',
    minimumIntelligence: 4,
    cooldown: 12,
    basePower: 16,
    name: { ru: 'Свет исцеления', en: 'Mending Light' },
    description: {
      ru: 'Восстанавливает здоровье. Не расходуется, но долго перезаряжается.',
      en: 'Restores health. It is never consumed, but has a long cooldown.',
    },
  }),
  freezeSpell({
    /**
     * The learned way out of a binding, and the hardest to reach: it asks for
     * more intelligence than any spell but the Warden, so it is a build rather
     * than a purchase. Cleansing already answers for what the dungeon leaves on
     * the hero; this is the same school reaching one step further, to what the
     * dungeon leaves welded to them.
     */
    id: 'unbinding',
    schoolId: 'cleansing',
    kind: 'unbind',
    icon: 'derived/icon/scroll-remove_curse.png',
    color: '#e8dcc0',
    minimumIntelligence: 8,
    cooldown: 40,
    basePower: 1,
    name: { ru: 'Разрешение оков', en: 'Unbinding' },
    description: {
      ru: 'Снимает оковы со всего надетого. Долгий откат: это не выход, а вторая попытка.',
      en: 'Lifts every binding on worn gear. A long cooldown: not an escape, a second chance.',
    },
  }),
  freezeSpell({
    id: 'purging-light',
    schoolId: 'cleansing',
    kind: 'purge',
    icon: 'derived/icon/scroll-holy_word.png',
    color: '#e6dfa8',
    minimumIntelligence: 5,
    cooldown: 18,
    basePower: 6,
    name: { ru: 'Очистительный свет', en: 'Purging Light' },
    description: {
      ru: 'Снимает состояния и лечит. Чем выше «Очищение», тем больше снимает.',
      en: 'Strips conditions and heals. The higher your Cleansing, the more it takes off.',
    },
  }),
  freezeSpell({
    id: 'arcane-splinter',
    schoolId: 'arcana',
    kind: 'projectile',
    targetMode: 'nearest',
    icon: 'derived/icon/wand-magic_darts.png',
    color: '#b79ede',
    minimumIntelligence: 3,
    cooldown: 2.4,
    range: 5,
    basePower: 4,
    name: { ru: 'Аркановый осколок', en: 'Arcane Splinter' },
    description: {
      ru: 'Дешёвый и быстрый выстрел по ближайшему врагу. Растёт от интеллекта и Арканистики.',
      en: 'A cheap, quick shot at the nearest enemy. It grows with Intelligence and Arcana.',
    },
  }),
  freezeSpell({
    id: 'flight',
    schoolId: 'arcana',
    kind: 'sustained',
    icon: 'derived/icon/potion-flight.png',
    color: '#d7d4bb',
    minimumIntelligence: 6,
    cooldown: 0.5,
    magic: Object.freeze({ flight: true }),
    name: { ru: 'Полёт', en: 'Flight' },
    description: {
      ru: 'Включается повторным нажатием. Ловушки и опасный пол не мешают движению.',
      en: 'Toggle with another press. Traps and hazardous ground no longer impede movement.',
    },
  }),
  freezeSpell({
    id: 'raise-skeleton',
    schoolId: 'necromancy',
    kind: 'minion',
    icon: 'mon/undead/skeletons/skeleton_humanoid_small.png',
    color: '#cfc6ad',
    minimumIntelligence: 5,
    cooldown: 1.5,
    name: { ru: 'Поднять скелета', en: 'Raise Skeleton' },
    description: {
      ru: 'Слуга занимает слот и ходит с тобой. Падёт — вернётся сам, когда слот остынет.',
      en: 'The servant holds the slot and walks with you. Killed, it returns once the slot cools.',
    },
  }),
  freezeSpell({
    id: 'raise-ghoul',
    schoolId: 'necromancy',
    kind: 'minion',
    icon: 'mon/undead/ghoul.png',
    color: '#8fa06a',
    minimumIntelligence: 7,
    cooldown: 1.5,
    name: { ru: 'Поднять упыря', en: 'Raise Ghoul' },
    description: {
      ru: 'Тяжелее скелета и дольше возвращается. Держит удар, предназначенный тебе.',
      en: 'Heavier than a skeleton and slower to return. It takes the blow meant for you.',
    },
  }),
  freezeSpell({
    id: 'raise-warden',
    schoolId: 'necromancy',
    kind: 'minion',
    icon: 'mon/undead/skeletal_warrior.png',
    color: '#b9b4a0',
    minimumIntelligence: 9,
    cooldown: 1.5,
    name: { ru: 'Поднять стража', en: 'Raise Warden' },
    description: {
      ru: 'Тяжёлый слуга: держит коридор и возвращается дольше всех.',
      en: 'A heavy servant: it holds a corridor and takes the longest to return.',
    },
  }),
  freezeSpell({
    id: 'ember-burst',
    schoolId: 'pyromancy',
    kind: 'burst',
    icon: 'derived/icon/wand-fireball.png',
    color: '#f0873f',
    minimumIntelligence: 6,
    cooldown: 9,
    range: 2,
    basePower: 6,
    status: { id: 'burning', baseDuration: 3, maximumDuration: 6 },
    name: { ru: 'Огненная вспышка', en: 'Ember Burst' },
    description: {
      ru: 'Бьёт всех вокруг героя и поджигает их. Стены закрывают от вспышки.',
      en: 'Strikes everyone around the hero and sets them alight. Walls shield from it.',
    },
  }),
  freezeSpell({
    id: 'camp-call',
    schoolId: 'arcana',
    kind: 'camp',
    icon: 'dngn/altars/makhleb_flame1.png',
    color: '#d8bf68',
    minimumIntelligence: 8,
    cooldown: 150,
    name: { ru: 'Зов лагеря', en: 'Call of the Camp' },
    description: {
      ru: 'Разбивает лагерь без походного набора: костёр и спальник, а с навыком «Лагерь» — и свой сундук.',
      en: 'Pitches a camp without a kit: a fire and a bedroll, plus your own chest if you know Camping.',
    },
  }),
  freezeSpell({
    id: 'invisibility',
    schoolId: 'arcana',
    kind: 'sustained',
    icon: 'derived/icon/potion-invisibility.png',
    color: '#8fc8c5',
    minimumIntelligence: 7,
    cooldown: 0.5,
    magic: Object.freeze({ invisibility: true }),
    name: { ru: 'Невидимость', en: 'Invisibility' },
    description: {
      ru: 'Включается повторным нажатием. Атака временно раскрывает героя.',
      en: 'Toggle with another press. Attacking temporarily reveals the hero.',
    },
  }),

  // ── Криомантия ──────────────────────────────────────────────────────────
  // У школы было одно заклинание: лёд и огонь игрались одинаково, потому что
  // играть было нечем. Три ответа на три разных вопроса — толпа, один опасный,
  // и «меня сейчас убьют».
  freezeSpell({
    id: 'frost-burst',
    schoolId: 'cryomancy',
    kind: 'burst',
    icon: 'derived/icon/wand-cold.png',
    color: '#8fd8e6',
    minimumIntelligence: 6,
    cooldown: 9.5,
    range: 2,
    basePower: 5,
    status: { id: 'chilled', baseDuration: 5, maximumDuration: 9 },
    name: { ru: 'Морозная вспышка', en: 'Frost Burst' },
    description: {
      ru: 'Бьёт всех вокруг героя и студит их. Слабее огненной, но замедляет всю толпу.',
      en: 'Strikes everyone around the hero and chills them. Weaker than fire, but it slows the whole crowd.',
    },
  }),
  freezeSpell({
    /**
     * The one that stops a single dangerous thing. `frozen` is a full stop, so
     * the cooldown is long: this is a door closed for a few seconds, not a way
     * to keep anything held forever.
     */
    id: 'glaciate',
    schoolId: 'cryomancy',
    kind: 'projectile',
    targetMode: 'actor',
    icon: 'derived/icon/ring-ice.png',
    color: '#a8e4ef',
    minimumIntelligence: 8,
    cooldown: 14,
    range: 5.5,
    basePower: 4,
    status: { id: 'frozen', baseDuration: 2, maximumDuration: 4 },
    name: { ru: 'Оковы льда', en: 'Glaciate' },
    description: {
      ru: 'Выбери врага. Урон невелик, но цель встаёт намертво на пару секунд.',
      en: 'Choose an enemy. Little damage, but the target stops dead for a couple of seconds.',
    },
  }),
  freezeSpell({
    id: 'ice-armour',
    schoolId: 'cryomancy',
    kind: 'sustained',
    icon: 'item/ring/i-r-cold.png',
    color: '#bfe6f0',
    minimumIntelligence: 7,
    cooldown: 0.5,
    magic: Object.freeze({ iceArmour: true }),
    name: { ru: 'Ледяной доспех', en: 'Ice Armour' },
    description: {
      ru: 'Включается повторным нажатием. Пока держится, весь получаемый урон меньше на четверть.',
      en: 'Toggle with another press. While it holds, every blow you take lands a quarter lighter.',
    },
  }),

  // ── Магия бури ──────────────────────────────────────────────────────────
  freezeSpell({
    id: 'storm-burst',
    schoolId: 'storm-magic',
    kind: 'burst',
    icon: 'item/ring/i-magical-power.png',
    color: '#9fe2f5',
    minimumIntelligence: 7,
    cooldown: 10,
    range: 2.5,
    basePower: 7,
    name: { ru: 'Грозовая вспышка', en: 'Storm Burst' },
    description: {
      ru: 'Бьёт всех вокруг. По мокрым — вдвое: вода проводит, и буря этим живёт.',
      en: 'Strikes everyone around. Twice as hard on the wet: water conducts, and the storm lives on that.',
    },
  }),
  freezeSpell({
    id: 'thunderclap',
    schoolId: 'storm-magic',
    kind: 'burst',
    icon: 'derived/icon/scroll-noise.png',
    color: '#cfe9f7',
    minimumIntelligence: 6,
    cooldown: 12,
    range: 2,
    basePower: 2,
    status: { id: 'frozen', baseDuration: 1, maximumDuration: 3 },
    name: { ru: 'Раскат', en: 'Thunderclap' },
    description: {
      ru: 'Почти не ранит, но на секунду останавливает всех вокруг. Это не урон, это время.',
      en: 'It barely wounds, but for a second everything around stops. This is not damage, it is time.',
    },
  }),
  freezeSpell({
    /**
     * Not damage: distance. A monster shoved back is a monster that has to walk
     * the ground again, and the hero chooses what to do with the two seconds.
     */
    id: 'shove',
    schoolId: 'storm-magic',
    kind: 'shove',
    targetMode: 'actor',
    icon: 'derived/icon/potion-might.png',
    color: '#b9dff0',
    minimumIntelligence: 5,
    cooldown: 8,
    range: 4.5,
    basePower: 3,
    name: { ru: 'Толчок', en: 'Shove' },
    description: {
      ru: 'Выбери врага. Отбрасывает его на клетку от тебя и слегка ранит о стену.',
      en: 'Choose an enemy. Throws them a tile away from you and bruises them on the wall.',
    },
  }),

  // ── Пиромантия ──────────────────────────────────────────────────────────
  freezeSpell({
    /**
     * Fire that is spent on the hero rather than thrown: cold, poison and damp
     * burn off, and the burning costs health. A cure that hurts is still a cure.
     */
    id: 'cauterise',
    schoolId: 'pyromancy',
    kind: 'cauterise',
    icon: 'derived/icon/potion-curing.png',
    color: '#f09a55',
    minimumIntelligence: 5,
    cooldown: 14,
    basePower: 8,
    name: { ru: 'Прижечь', en: 'Cauterise' },
    description: {
      ru: 'Выжигает с себя холод, яд и сырость. Платишь здоровьем — лечения здесь нет.',
      en: 'Burns cold, poison and damp off yourself. You pay in health: there is no mending here.',
    },
  }),
  freezeSpell({
    id: 'kindle',
    schoolId: 'pyromancy',
    kind: 'sustained',
    icon: 'derived/icon/ring-fire.png',
    color: '#ef8a45',
    minimumIntelligence: 6,
    cooldown: 0.5,
    magic: Object.freeze({ kindled: true }),
    name: { ru: 'Запал', en: 'Kindle' },
    description: {
      ru: 'Включается повторным нажатием. Всякий, кто ударит тебя вплотную, загорается.',
      en: 'Toggle with another press. Anything that strikes you in melee catches fire.',
    },
  }),

  // ── Некромантия ─────────────────────────────────────────────────────────
  freezeSpell({
    /**
     * The necromancer stops being the one who raised a thing and forgot it: a
     * servant lives exactly as long as its master is willing to pay for it.
     */
    id: 'share-life',
    schoolId: 'necromancy',
    kind: 'share-life',
    icon: 'derived/icon/potion-blood.png',
    color: '#b06a7a',
    minimumIntelligence: 6,
    cooldown: 10,
    basePower: 10,
    name: { ru: 'Поделиться', en: 'Share Life' },
    description: {
      ru: 'Снимает здоровье с тебя и делит между призванными. Слуга живёт столько, сколько ты платишь.',
      en: 'Takes health off you and divides it among your servants. A servant lives as long as you pay for it.',
    },
  }),

  // ── Очищение ────────────────────────────────────────────────────────────
  freezeSpell({
    id: 'ward',
    schoolId: 'cleansing',
    kind: 'sustained',
    icon: 'derived/icon/amulet-warding.png',
    color: '#ded3a6',
    minimumIntelligence: 6,
    cooldown: 0.5,
    magic: Object.freeze({ warded: true }),
    name: { ru: 'Оберег', en: 'Ward' },
    description: {
      ru: 'Держит один удар целиком — и гаснет. Включать заново после каждого раза.',
      en: 'Holds one blow entirely, then goes out. Switch it on again after each one.',
    },
  }),
  freezeSpell({
    id: 'cleanse-ally',
    schoolId: 'cleansing',
    kind: 'cleanse-ally',
    icon: 'derived/icon/potion-cancel.png',
    color: '#c8dcb4',
    minimumIntelligence: 5,
    cooldown: 12,
    basePower: 4,
    name: { ru: 'Очистить слугу', en: 'Cleanse Ally' },
    description: {
      ru: 'Снимает состояния со спутников и призванных и немного их лечит. На себя не действует.',
      en: 'Strips conditions off companions and servants and mends them a little. It does nothing for you.',
    },
  }),

  // ── Арканы ──────────────────────────────────────────────────────────────
  freezeSpell({
    /**
     * A locked chest with no key is not a decision, it is a wall you walk past.
     * The price is what turns it into one: a long cooldown and an arcanist who
     * could have prepared something else in that slot.
     */
    id: 'unlock',
    schoolId: 'arcana',
    kind: 'unlock',
    icon: 'item/misc/runes/generic.png',
    color: '#c7b6e2',
    minimumIntelligence: 9,
    cooldown: 60,
    name: { ru: 'Отпереть', en: 'Unlock' },
    description: {
      ru: 'Снимает замок с того, к чему стоишь вплотную. Долгий откат: это вместо ключа, а не поверх него.',
      en: 'Takes the lock off whatever you are standing against. A long cooldown: it replaces a key, not adds to one.',
    },
  }),
  freezeSpell({
    /**
     * Where you land is not yours to choose — that is the whole spell. It is an
     * answer to "I am about to die here", and it costs you knowing where "there"
     * is going to be.
     */
    id: 'teleport',
    schoolId: 'arcana',
    kind: 'teleport',
    icon: 'derived/icon/scroll-teleportation.png',
    color: '#a99ade',
    minimumIntelligence: 7,
    cooldown: 25,
    name: { ru: 'Телепорт', en: 'Teleport' },
    description: {
      ru: 'Переносит в случайную точку этажа. Куда — не тебе решать, и в этом весь смысл.',
      en: 'Carries you to a random spot on the floor. Where is not yours to choose, and that is the point.',
    },
  }),
]);

const SPELL_BY_ID = new Map(SPELL_CATALOG.map((spell) => [spell.id, spell]));

/** Every spell's picture: the bar and the book both draw from a loaded image. */
export const SPELL_ASSET_PATHS = Object.freeze([
  ...new Set(SPELL_CATALOG.map(({ icon }) => icon).filter(Boolean)),
]);

export function spellById(id) {
  return SPELL_BY_ID.get(id) ?? null;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function uniqueKnownIds(ids) {
  return Array.isArray(ids)
    && new Set(ids).size === ids.length
    && ids.every((id) => typeof id === 'string' && SPELL_BY_ID.has(id));
}

export function validateSpellState(state) {
  if (!isRecord(state) || Object.keys(state).length !== 4) return false;
  if (
    state.version !== SPELL_STATE_VERSION
    || !uniqueKnownIds(state.knownSpellIds)
    || !Array.isArray(state.preparedSpellIds)
    || state.preparedSpellIds.length !== SPELL_SLOT_COUNT
    || !Array.isArray(state.activeSustainedSpellIds)
  ) return false;
  const prepared = state.preparedSpellIds.filter(Boolean);
  if (
    new Set(prepared).size !== prepared.length
    || prepared.some((id) => !state.knownSpellIds.includes(id))
    || state.preparedSpellIds.some((id) => id !== null && typeof id !== 'string')
  ) return false;
  return new Set(state.activeSustainedSpellIds).size === state.activeSustainedSpellIds.length
    && state.activeSustainedSpellIds.every((id) => (
      prepared.includes(id) && spellById(id)?.kind === 'sustained'
    ));
}

export function createSpellState(source = {}) {
  const state = {
    version: SPELL_STATE_VERSION,
    knownSpellIds: [...(source.knownSpellIds ?? [])],
    preparedSpellIds: [...(source.preparedSpellIds ?? Array(SPELL_SLOT_COUNT).fill(null))],
    activeSustainedSpellIds: [...(source.activeSustainedSpellIds ?? [])],
  };
  if (!validateSpellState(state)) throw new TypeError('Invalid spell state');
  return Object.freeze({
    version: state.version,
    knownSpellIds: Object.freeze(state.knownSpellIds),
    preparedSpellIds: Object.freeze(state.preparedSpellIds),
    activeSustainedSpellIds: Object.freeze(state.activeSustainedSpellIds),
  });
}

export function learnSpell(state, spellId, intelligence) {
  if (!validateSpellState(state)) throw new TypeError('Invalid spell state');
  const spell = spellById(spellId);
  if (!spell) return Object.freeze({ ok: false, reason: 'unknown-spell', state });
  if (!Number.isFinite(intelligence) || intelligence < spell.minimumIntelligence) {
    return Object.freeze({
      ok: false,
      reason: 'intelligence-required',
      requiredIntelligence: spell.minimumIntelligence,
      state,
    });
  }
  if (state.knownSpellIds.includes(spellId)) {
    return Object.freeze({ ok: false, reason: 'already-known', state });
  }
  return Object.freeze({
    ok: true,
    reason: 'learned',
    spell,
    state: createSpellState({
      ...state,
      knownSpellIds: [...state.knownSpellIds, spellId],
    }),
  });
}

export function prepareSpell(state, slotIndex, spellId) {
  if (!validateSpellState(state)) throw new TypeError('Invalid spell state');
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= SPELL_SLOT_COUNT) {
    return Object.freeze({ ok: false, reason: 'invalid-slot', state });
  }
  if (spellId !== null && !state.knownSpellIds.includes(spellId)) {
    return Object.freeze({ ok: false, reason: 'not-known', state });
  }
  const preparedSpellIds = [...state.preparedSpellIds];
  if (spellId !== null) {
    const previousSlot = preparedSpellIds.indexOf(spellId);
    if (previousSlot >= 0) preparedSpellIds[previousSlot] = null;
  }
  const replacedSpellId = preparedSpellIds[slotIndex];
  preparedSpellIds[slotIndex] = spellId;
  const activeSustainedSpellIds = state.activeSustainedSpellIds.filter((id) => (
    id !== replacedSpellId && preparedSpellIds.includes(id)
  ));
  return Object.freeze({
    ok: true,
    reason: spellId === null ? 'cleared' : 'prepared',
    slotIndex,
    spellId,
    state: createSpellState({ ...state, preparedSpellIds, activeSustainedSpellIds }),
  });
}

export function toggleSustainedSpell(state, spellId, intelligence) {
  if (!validateSpellState(state)) throw new TypeError('Invalid spell state');
  const spell = spellById(spellId);
  if (!spell || spell.kind !== 'sustained') {
    return Object.freeze({ ok: false, reason: 'not-sustained', state });
  }
  if (!state.preparedSpellIds.includes(spellId)) {
    return Object.freeze({ ok: false, reason: 'not-prepared', state });
  }
  if (!Number.isFinite(intelligence) || intelligence < spell.minimumIntelligence) {
    return Object.freeze({
      ok: false,
      reason: 'intelligence-required',
      requiredIntelligence: spell.minimumIntelligence,
      state,
    });
  }
  const active = state.activeSustainedSpellIds.includes(spellId);
  return Object.freeze({
    ok: true,
    reason: active ? 'deactivated' : 'activated',
    active: !active,
    spell,
    state: createSpellState({
      ...state,
      activeSustainedSpellIds: active
        ? state.activeSustainedSpellIds.filter((id) => id !== spellId)
        : [...state.activeSustainedSpellIds, spellId],
    }),
  });
}

/**
 * Everything a sustained spell can grant. Written once here rather than as a
 * pair of lines inside the fold: the first two were flight and invisibility,
 * and every spell added after them would have been silently ignored.
 */
export const SUSTAINED_MAGIC_FLAGS = Object.freeze([
  'flight', 'invisibility', 'iceArmour', 'kindled', 'warded',
]);

export function spellMagic(state, intelligence) {
  if (!validateSpellState(state)) throw new TypeError('Invalid spell state');
  const magic = Object.fromEntries(SUSTAINED_MAGIC_FLAGS.map((flag) => [flag, false]));
  if (!Number.isFinite(intelligence)) return Object.freeze(magic);
  for (const id of state.activeSustainedSpellIds) {
    const spell = spellById(id);
    if (!spell || intelligence < spell.minimumIntelligence) continue;
    for (const flag of SUSTAINED_MAGIC_FLAGS) magic[flag] ||= spell.magic?.[flag] === true;
  }
  return Object.freeze(magic);
}

/** How much a quarter of a blow is, when the ice armour holds. */
export const ICE_ARMOUR_SOAK = 0.25;

const DAMAGING_KINDS = Object.freeze(['projectile', 'burst', 'shove']);

/** Kinds the hero aims at one creature rather than at everything in reach. */
export const TARGETED_SPELL_KINDS = Object.freeze(['projectile', 'shove']);

export function spellDamage(spellId, intelligence, schoolRank = 0) {
  const spell = spellById(spellId);
  if (!spell || !DAMAGING_KINDS.includes(spell.kind) || !Number.isFinite(intelligence)) return 0;
  return Math.max(1, Math.round(spell.basePower + intelligence * 0.8 + schoolRank * 2.5));
}

// Purging light mends as well as it cleans, so both kinds share the formula.
const HEALING_KINDS = Object.freeze(['heal', 'purge', 'cleanse-ally']);

export function spellHealing(spellId, intelligence, schoolRank = 0) {
  const spell = spellById(spellId);
  if (!spell || !HEALING_KINDS.includes(spell.kind) || !Number.isFinite(intelligence)) return 0;
  return Math.max(1, Math.round(spell.basePower + intelligence * 1.5 + schoolRank * 3));
}

const SELF_COST_KINDS = Object.freeze(['cauterise', 'share-life']);

export function spellSelfCost(spellId, schoolRank = 0) {
  const spell = spellById(spellId);
  if (!spell || !SELF_COST_KINDS.includes(spell.kind)) return 0;
  const rank = Math.max(0, Math.min(3, Number.isInteger(schoolRank) ? schoolRank : 0));
  return Math.max(2, spell.basePower - rank);
}

/** What `share-life` moves onto the servants for each point it takes off. */
export function shareLifeAmount(spellId, intelligence, schoolRank = 0) {
  const spell = spellById(spellId);
  if (spell?.kind !== 'share-life' || !Number.isFinite(intelligence)) return 0;
  const rank = Math.max(0, Math.min(3, Number.isInteger(schoolRank) ? schoolRank : 0));
  return Math.max(1, Math.round(spell.basePower + intelligence * 0.6 + rank * 4));
}

export function spellStatus(spellId, intelligence) {
  const spell = spellById(spellId);
  if (!spell?.status || !Number.isFinite(intelligence)) return null;
  const bonus = Math.max(0, Math.floor((intelligence - spell.minimumIntelligence) / 2));
  return Object.freeze({
    id: spell.status.id,
    duration: Math.min(spell.status.maximumDuration, spell.status.baseDuration + bonus),
  });
}

export function pyromancySpreadProfile(rank) {
  const clamped = Math.max(0, Math.min(3, Number.isInteger(rank) ? rank : 0));
  if (clamped === 0) return Object.freeze({ rank: 0, targets: 0, ratio: 0, radius: 0 });
  return Object.freeze({
    rank: clamped,
    targets: clamped,
    ratio: [0, 0.35, 0.45, 0.55][clamped],
    radius: [0, 1.5, 1.75, 2][clamped],
  });
}

export function spellUseAvailability({
  state,
  slotIndex,
  intelligence,
  cooldown = 0,
  runStatus = 'playing',
  heroHp = 1,
  heroMaxHp = 1,
  hasTarget = true,
} = {}) {
  if (!validateSpellState(state)) return Object.freeze({ ok: false, reason: 'invalid-state' });
  if (runStatus !== 'playing') return Object.freeze({ ok: false, reason: 'not-playing' });
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= SPELL_SLOT_COUNT) {
    return Object.freeze({ ok: false, reason: 'invalid-slot' });
  }
  const spell = spellById(state.preparedSpellIds[slotIndex]);
  if (!spell) return Object.freeze({ ok: false, reason: 'empty-slot' });
  if (!Number.isFinite(intelligence) || intelligence < spell.minimumIntelligence) {
    return Object.freeze({
      ok: false,
      reason: 'intelligence-required',
      spell,
      requiredIntelligence: spell.minimumIntelligence,
    });
  }
  if (cooldown > 0) return Object.freeze({ ok: false, reason: 'cooldown', spell, cooldown });
  if (spell.kind === 'heal' && heroHp >= heroMaxHp) {
    return Object.freeze({ ok: false, reason: 'full-health', spell });
  }
  if (TARGETED_SPELL_KINDS.includes(spell.kind) && !hasTarget) {
    return Object.freeze({ ok: false, reason: 'no-target', spell });
  }
  return Object.freeze({ ok: true, reason: 'available', spell });
}

const SPELL_COPY = Object.freeze({
  ru: Object.freeze({
    bar: 'Подготовленные заклинания',
    empty: 'Пустой слот',
    sustained: 'Постоянное',
    projectile: 'Боевое',
    heal: 'Лечение',
    purge: 'Очищение',
    burst: 'Взрыв',
    camp: 'Лагерь',
    minion: 'Слуга',
    unbind: 'Снятие оков',
    shove: 'Толчок',
    cauterise: 'Прижигание',
    'share-life': 'Жертва',
    'cleanse-ally': 'Очищение слуг',
    unlock: 'Отпирание',
    teleport: 'Перенос',
    intelligence: 'Интеллект',
    active: 'Включено',
    inactive: 'Выключено',
  }),
  en: Object.freeze({
    bar: 'Prepared spells',
    empty: 'Empty slot',
    sustained: 'Sustained',
    projectile: 'Offensive',
    heal: 'Healing',
    purge: 'Cleansing',
    burst: 'Burst',
    camp: 'Camp',
    minion: 'Servant',
    unbind: 'Unbinding',
    shove: 'Shove',
    cauterise: 'Cauterising',
    'share-life': 'Sacrifice',
    'cleanse-ally': 'Cleansing servants',
    unlock: 'Unlocking',
    teleport: 'Translocation',
    intelligence: 'Intelligence',
    active: 'Active',
    inactive: 'Inactive',
  }),
});

export function spellBarModel({ state, intelligence, cooldowns = {}, language = 'ru' } = {}) {
  if (!validateSpellState(state)) throw new TypeError('Spell bar requires valid state');
  const effectiveIntelligence = Number.isFinite(intelligence) ? intelligence : 0;
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = SPELL_COPY[locale];
  return Object.freeze({
    label: copy.bar,
    slots: Object.freeze(state.preparedSpellIds.map((spellId, index) => {
      const spell = spellById(spellId);
      if (!spell) return Object.freeze({ index, empty: true, label: copy.empty });
      const cooldown = Math.max(0, Number(cooldowns[spell.id]) || 0);
      const active = state.activeSustainedSpellIds.includes(spell.id);
      const intelligenceLocked = effectiveIntelligence < spell.minimumIntelligence;
      const status = spell.kind === 'sustained'
        ? `${copy[spell.kind]} · ${active ? copy.active : copy.inactive}`
        : copy[spell.kind];
      return Object.freeze({
        index,
        empty: false,
        id: spell.id,
        icon: spell.icon,
        color: spell.color,
        name: spell.name[locale],
        description: spell.description[locale],
        status,
        active,
        cooldown,
        cooldownProgress: spell.cooldown > 0 ? Math.min(1, cooldown / spell.cooldown) : 0,
        intelligenceLocked,
        requirement: `${copy.intelligence} ${spell.minimumIntelligence}`,
        label: `${spell.name[locale]}. ${status}. ${copy.intelligence} ${spell.minimumIntelligence}`,
      });
    })),
  });
}

export function knownSpellModel(state, intelligence, language = 'ru') {
  if (!validateSpellState(state)) throw new TypeError('Known spells require valid state');
  const effectiveIntelligence = Number.isFinite(intelligence) ? intelligence : 0;
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = SPELL_COPY[locale];
  return Object.freeze(state.knownSpellIds.map((id) => {
    const spell = spellById(id);
    return Object.freeze({
      id,
      icon: spell.icon,
      color: spell.color,
      name: spell.name[locale],
      description: spell.description[locale],
      kind: copy[spell.kind],
      requirement: `${copy.intelligence} ${spell.minimumIntelligence}`,
      intelligenceLocked: effectiveIntelligence < spell.minimumIntelligence,
      preparedSlot: state.preparedSpellIds.indexOf(id),
      active: state.activeSustainedSpellIds.includes(id),
    });
  }));
}
