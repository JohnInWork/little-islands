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
    icon: 'item/wand/i-fire.png',
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
    icon: 'item/wand/i-frost.png',
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
    icon: 'item/wand/i-lightning.png',
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
    icon: 'item/wand/i-heal_wounds.png',
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
    id: 'purging-light',
    schoolId: 'cleansing',
    kind: 'purge',
    icon: 'item/scroll/i-holy_word.png',
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
    icon: 'item/wand/i-magic_darts.png',
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
    icon: 'item/potion/i-flight.png',
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
    icon: 'item/wand/i-fireball.png',
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
    icon: 'item/potion/i-invisibility.png',
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
]);

const SPELL_BY_ID = new Map(SPELL_CATALOG.map((spell) => [spell.id, spell]));

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

export function spellMagic(state, intelligence) {
  if (!validateSpellState(state)) throw new TypeError('Invalid spell state');
  const magic = { flight: false, invisibility: false };
  if (!Number.isFinite(intelligence)) return Object.freeze(magic);
  for (const id of state.activeSustainedSpellIds) {
    const spell = spellById(id);
    if (!spell || intelligence < spell.minimumIntelligence) continue;
    magic.flight ||= spell.magic?.flight === true;
    magic.invisibility ||= spell.magic?.invisibility === true;
  }
  return Object.freeze(magic);
}

const DAMAGING_KINDS = Object.freeze(['projectile', 'burst']);

export function spellDamage(spellId, intelligence, schoolRank = 0) {
  const spell = spellById(spellId);
  if (!spell || !DAMAGING_KINDS.includes(spell.kind) || !Number.isFinite(intelligence)) return 0;
  return Math.max(1, Math.round(spell.basePower + intelligence * 0.8 + schoolRank * 2.5));
}

// Purging light mends as well as it cleans, so both kinds share the formula.
const HEALING_KINDS = Object.freeze(['heal', 'purge']);

export function spellHealing(spellId, intelligence, schoolRank = 0) {
  const spell = spellById(spellId);
  if (!spell || !HEALING_KINDS.includes(spell.kind) || !Number.isFinite(intelligence)) return 0;
  return Math.max(1, Math.round(spell.basePower + intelligence * 1.5 + schoolRank * 3));
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
  if (spell.kind === 'projectile' && !hasTarget) {
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
