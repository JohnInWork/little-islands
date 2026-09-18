import { chestContextPresentation } from './dcss-rpg-chests.js';
import { isLandmarkFind, landmarkContextPresentation } from './dcss-rpg-finds.js';

const ACTION_COPY = Object.freeze({
  ru: Object.freeze({
    inspect: 'Осмотреть',
    open: 'Открыть',
    browse: 'Заглянуть',
    close: 'Закрыть',
    smash: 'Ударить',
    disarm: 'Обезвредить',
    extract: 'Извлечь',
    defile: 'Осквернить',
    'use-key': 'Ключ',
    'pick-lock': 'Взломать',
    attack: 'Атаковать',
    trade: 'Торговать',
    buy: 'Купить',
    install: 'Поставить',
    hunt: 'Охотиться',
    cook: 'Приготовить',
    rest: 'Отдохнуть',
    stash: 'Открыть сундук',
    pray: 'Молиться',
    offer: 'Пожертвовать',
    plunder: 'Ограбить',
    dig: 'Раскопать',
    drink: 'Испить',
    toss: 'Бросить',
    dive: 'Нырнуть',
    decipher: 'Разобрать',
    attune: 'Настроиться',
    break: 'Расколоть',
  }),
  en: Object.freeze({
    inspect: 'Inspect',
    open: 'Open',
    browse: 'Browse',
    close: 'Close',
    smash: 'Strike',
    disarm: 'Disarm',
    extract: 'Extract',
    defile: 'Defile',
    'use-key': 'Use key',
    'pick-lock': 'Pick lock',
    attack: 'Attack',
    trade: 'Trade',
    buy: 'Buy',
    install: 'Install',
    hunt: 'Hunt',
    cook: 'Cook',
    rest: 'Rest',
    stash: 'Open the chest',
    pray: 'Pray',
    offer: 'Offer',
    plunder: 'Plunder',
    dig: 'Dig out',
    drink: 'Drink',
    toss: 'Toss',
    dive: 'Dive',
    decipher: 'Decipher',
    attune: 'Attune',
    break: 'Break',
  }),
});

const GLYPHS = Object.freeze({
  inspect: '?',
  open: '+',
  browse: '▤',
  close: '−',
  smash: '✕',
  disarm: '✓',
  extract: '✦',
  defile: '!',
  'use-key': '⌑',
  'pick-lock': '⌁',
  attack: '⚔',
  trade: '●',
  buy: '●',
  install: '◆',
  hunt: '⚔',
  cook: '♨',
  rest: '☾',
  stash: '▤',
  pray: '✚',
  offer: '◆',
  plunder: '!',
  // One visual grammar across landmarks: restore, trade, risk, knowledge.
  dig: '◇',
  drink: '✚',
  attune: '✚',
  toss: '◆',
  dive: '!',
  break: '!',
  decipher: '◈',
});

const COPY = Object.freeze({
  ru: Object.freeze({
    doorName: 'Каменная дверь',
    doorClosed: 'Закрыта.',
    doorOpen: 'Открыта.',
    crystalName: 'Живая кристальная жила',
    crystalClosed: '',
    crystalInspected: 'В камне мерцает кристалл.',
    stashName: 'Тайник под плитой',
    stashClosed: '',
    stashInspected: 'Плита лежит неровно: под ней пустота.',
    graveName: 'Древняя гробница',
    graveClosed: '',
    graveInspected: 'На плите видна тёмная печать.',
    trapName: 'Механическая ловушка',
    trapClosed: 'Обнаруженный механизм преграждает безопасный путь.',
    trapInspected: (tier, status) => `Сложность ${tier}. ${status}`,
    trapReady: 'Можно обезвредить.',
    merchantName: 'Странствующий торговец',
    merchantDescription: '',
    campfireName: 'Костёр',
    campBedName: 'Спальник',
    campBedClosed: '',
    campBedRested: 'Герой уже отдохнул здесь.',
    campBedHungry: 'Слишком голоден для сна',
    campBedFull: 'Отдыхать незачем',
    campStashName: 'Сундук лагеря',
    campStashClosed: '',
    campfireEmpty: 'Нужно сырое мясо.',
    wildlife: Object.freeze({ sheep: 'Овца', hog: 'Кабан', yak: 'Як' }),
    guardDescription: 'Следит за порядком. Удар по нему делает героя преступником.',
    deedName: 'Участок на продажу',
    deedDescription: (price) => `Свой дом в городе. Цена: ${price} золота.`,
    slotName: (piece) => `Место под предмет: ${piece}`,
    slotDescription: (price) => `Цена: ${price} золота.`,
    houseBedName: 'Своя кровать',
    houseBedDescription: 'Сон дома восстанавливает больше, чем спальник в лагере.',
    guards: Object.freeze({ 'city-guard': 'Городской стражник', 'city-captain': 'Капитан стражи' }),
  }),
  en: Object.freeze({
    doorName: 'Stone door',
    doorClosed: 'Closed.',
    doorOpen: 'Open.',
    crystalName: 'Living crystal vein',
    crystalClosed: '',
    crystalInspected: 'A crystal glimmers within the stone.',
    stashName: 'Stash under the flagstone',
    stashClosed: '',
    stashInspected: 'The flagstone sits crooked: there is a hollow beneath.',
    graveName: 'Ancient tomb',
    graveClosed: '',
    graveInspected: 'A dark seal marks the slab.',
    trapName: 'Mechanical trap',
    trapClosed: 'A detected mechanism blocks the safe route.',
    trapInspected: (tier, status) => `Difficulty ${tier}. ${status}`,
    trapReady: 'It can be disarmed.',
    merchantName: 'Wandering merchant',
    merchantDescription: '',
    campfireName: 'Campfire',
    campBedName: 'Bedroll',
    campBedClosed: '',
    campBedRested: 'The hero has already slept here.',
    campBedHungry: 'Too hungry to sleep',
    campBedFull: 'Nothing to sleep off',
    campStashName: 'Camp chest',
    campStashClosed: '',
    campfireEmpty: 'Raw meat required.',
    wildlife: Object.freeze({ sheep: 'Sheep', hog: 'Hog', yak: 'Yak' }),
    guardDescription: 'Keeps the peace. Striking one makes the hero a criminal.',
    deedName: 'Plot for sale',
    deedDescription: (price) => `A house of your own in the city. Price: ${price} gold.`,
    slotName: (piece) => `Space for: ${piece}`,
    slotDescription: (price) => `Price: ${price} gold.`,
    houseBedName: 'Your own bed',
    houseBedDescription: 'Sleeping at home restores more than a bedroll in camp.',
    guards: Object.freeze({ 'city-guard': 'City guard', 'city-captain': 'Watch captain' }),
  }),
});

const validFind = (target, id) => target.kind === 'find'
  && target.id === id
  && Number.isFinite(target.rewardGold)
  && Number.isFinite(target.rewardPower)
  && Number.isFinite(target.riskDamage);

const commandAction = ({ id, enabled = true, hint = '' }, command) => Object.freeze({
  id,
  command: id === 'inspect' ? 'inspect' : command,
  glyph: GLYPHS[id],
  enabled,
  hint,
});

const defineInteraction = (definition) => Object.freeze(definition);

/**
 * The UI is a registry consumer. A new altar, sign or container adds one entry
 * with match + presentation and reuses a command family; the modal shell and
 * input/focus code do not gain another object-specific branch.
 */
export const INTERACTION_REGISTRY = Object.freeze([
  defineInteraction({
    id: 'campfire',
    command: 'cook-meat',
    matches: (target) => target?.kind === 'campfire' && Number.isInteger(target.rawMeatCount),
    present: ({ target, copy }) => ({
      name: copy.campfireName,
      description: target.rawMeatCount > 0 ? '' : copy.campfireEmpty,
      icon: 'dngn/altars/makhleb_flame1.png',
      accent: '#d88447',
      actions: [{ id: 'cook', enabled: target.rawMeatCount > 0, hint: target.rawMeatCount > 0 ? '' : copy.campfireEmpty }],
    }),
  }),
  defineInteraction({
    // The bedroll and the chest are the camp's own furniture: they exist only
    // where the hero pitched one, and the ranks decide which of them are there.
    id: 'camp-rest',
    command: 'camp-rest',
    matches: (target) => target?.kind === 'camp-rest' && typeof target.reason === 'string',
    present: ({ target, copy }) => ({
      name: copy.campBedName,
      description: copy.campBedClosed,
      icon: 'item/armour/cloak2.png',
      accent: '#9db4c8',
      actions: [{
        id: 'rest',
        enabled: target.reason === 'rested',
        hint: target.reason === 'already-rested'
          ? copy.campBedRested
          : target.reason === 'too-hungry'
            ? copy.campBedHungry
            : target.reason === 'nothing-to-heal'
              ? copy.campBedFull
              : '',
      }],
    }),
  }),
  defineInteraction({
    id: 'camp-stash',
    command: 'camp-stash',
    matches: (target) => target?.kind === 'camp-stash',
    present: ({ copy }) => ({
      name: copy.campStashName,
      description: copy.campStashClosed,
      icon: 'licensed/cmski-chests/wooden/4.png',
      accent: '#c2a36a',
      actions: [{ id: 'stash' }],
    }),
  }),
  defineInteraction({
    id: 'house-deed',
    command: 'buy-house',
    matches: (target) => target?.kind === 'house-deed'
      && Number.isInteger(target.price)
      && typeof target.reason === 'string',
    present: ({ target, copy }) => ({
      name: copy.deedName,
      description: copy.deedDescription(target.price),
      icon: target.icon,
      accent: '#d8bf68',
      actions: [{
        id: 'buy',
        enabled: target.reason === 'ready',
        hint: target.reason === 'ready' ? '' : target.hint ?? '',
      }],
    }),
  }),
  defineInteraction({
    id: 'house-slot',
    command: 'install-furniture',
    matches: (target) => target?.kind === 'house-slot'
      && typeof target.furnitureId === 'string'
      && Number.isInteger(target.price)
      && typeof target.reason === 'string',
    present: ({ target, copy }) => ({
      name: copy.slotName(target.label),
      description: copy.slotDescription(target.price),
      icon: target.icon,
      accent: '#c8b184',
      actions: [{
        id: 'install',
        enabled: target.reason === 'ready',
        hint: target.reason === 'ready' ? '' : target.hint ?? '',
      }],
    }),
  }),
  defineInteraction({
    id: 'house-rest',
    command: 'house-rest',
    matches: (target) => target?.kind === 'house-rest' && typeof target.reason === 'string',
    present: ({ target, copy }) => ({
      name: copy.houseBedName,
      description: copy.houseBedDescription,
      icon: 'item/armour/cloak2.png',
      accent: '#9db4c8',
      actions: [{
        id: 'rest',
        enabled: target.reason === 'rested',
        hint: target.reason === 'rested' ? '' : target.hint ?? '',
      }],
    }),
  }),
  defineInteraction({
    id: 'guard',
    command: 'provoke-guard',
    matches: (target) => target?.kind === 'guard'
      && typeof target.id === 'string'
      && typeof target.icon === 'string',
    present: ({ target, copy }) => ({
      name: copy.guards[target.id] ?? target.id,
      description: copy.guardDescription,
      icon: target.icon,
      accent: '#c9a45f',
      actions: [{ id: 'attack' }],
    }),
  }),
  defineInteraction({
    id: 'wildlife',
    command: 'hunt-wildlife',
    matches: (target) => target?.kind === 'wildlife'
      && typeof target.id === 'string'
      && typeof target.icon === 'string',
    present: ({ target, copy }) => ({
      name: copy.wildlife[target.id] ?? target.id,
      description: '',
      icon: target.icon,
      accent: '#b69062',
      actions: [{ id: 'hunt' }],
    }),
  }),
  defineInteraction({
    id: 'merchant',
    command: 'trade',
    matches: (target) => target?.kind === 'merchant' && typeof target.variantId === 'string',
    present: ({ target, copy }) => ({
      name: target.name || copy.merchantName,
      description: copy.merchantDescription,
      icon: target.iconPath || 'dngn/shops/shop_gadgets.png',
      accent: '#d1b35c',
      actions: [{ id: 'trade' }],
    }),
  }),
  defineInteraction({
    id: 'door',
    command: 'door-transition',
    matches: (target) => target?.kind === 'door' && typeof target.open === 'boolean',
    present: ({ target, copy }) => ({
      name: copy.doorName,
      description: target.open ? copy.doorOpen : copy.doorClosed,
      icon: target.open ? 'dngn/doors/open_door.png' : 'dngn/doors/closed_door.png',
      accent: '#a99a72',
      actions: [{ id: 'inspect' }, { id: target.open ? 'close' : 'open' }],
    }),
  }),
  defineInteraction({
    id: 'trap',
    command: 'trap-disarm',
    matches: (target) => target?.kind === 'trap'
      && Number.isInteger(target.tier)
      && target.tier >= 1
      && target.tier <= 3
      && typeof target.canDisarm === 'boolean'
      && typeof target.unavailable === 'string',
    present: ({ target, copy, inspected }) => ({
      name: copy.trapName,
      description: inspected
        ? copy.trapInspected(['I', 'II', 'III'][target.tier - 1], target.canDisarm ? copy.trapReady : target.unavailable)
        : copy.trapClosed,
      icon: 'dngn/traps/blade.png',
      accent: target.canDisarm ? '#8eaa9a' : '#c59663',
      actions: [
        { id: 'inspect' },
        { id: 'disarm', enabled: target.canDisarm, hint: target.canDisarm ? '' : target.unavailable },
      ],
    }),
  }),
  defineInteraction({
    id: 'chest',
    command: 'find-interact',
    matches: (target) => target?.kind === 'find' && target.id === 'sealed-cache',
    present: ({ target, actor, inspected, language }) => {
      const chest = chestContextPresentation({ find: target, actor, inspected, language });
      if (!chest) throw new TypeError('Invalid chest target');
      return chest;
    },
  }),
  defineInteraction({
    id: 'crystal-vein',
    command: 'find-interact',
    matches: (target) => validFind(target, 'crystal-vein'),
    present: ({ target, copy, inspected }) => ({
      name: copy.crystalName,
      description: inspected ? copy.crystalInspected : copy.crystalClosed,
      icon: 'item/misc/misc_crystal.png',
      accent: '#7fc8d2',
      actions: [{ id: 'inspect' }, { id: 'extract' }],
    }),
  }),
  defineInteraction({
    id: 'buried-stash',
    command: 'find-interact',
    matches: (target) => validFind(target, 'buried-stash'),
    present: ({ target, copy, inspected }) => ({
      name: copy.stashName,
      description: inspected ? copy.stashInspected : copy.stashClosed,
      icon: 'item/gold/07.png',
      accent: '#d8bf68',
      actions: [{ id: 'inspect' }, { id: 'dig' }],
    }),
  }),
  defineInteraction({
    id: 'forgotten-grave',
    command: 'find-interact',
    matches: (target) => validFind(target, 'forgotten-grave'),
    present: ({ target, copy, inspected }) => ({
      name: copy.graveName,
      description: inspected ? copy.graveInspected : copy.graveClosed,
      icon: 'dngn/vaults/sarcophagus_sealed.png',
      accent: '#b45c58',
      actions: [{ id: 'inspect' }, { id: 'defile' }],
    }),
  }),
  // One generic entry serves every landmark (altar now, fountain/rune later):
  // names, availability and hints come from the find catalog and its rolled
  // outcomes, so a new landmark is a catalog entry plus action vocabulary.
  defineInteraction({
    id: 'landmark',
    command: 'find-interact',
    matches: (target) => target?.kind === 'find' && isLandmarkFind(target),
    present: ({ target, actor, inspected, language }) => {
      const landmark = landmarkContextPresentation({ find: target, actor, inspected, language });
      if (!landmark) throw new TypeError('Invalid landmark target');
      return landmark;
    },
  }),
]);

export function interactionDefinitionFor(target) {
  return INTERACTION_REGISTRY.find(({ matches }) => matches(target)) ?? null;
}

export function contextActionModel({ target, actor = {}, language = 'ru', inspected = false } = {}) {
  if (typeof inspected !== 'boolean') throw new TypeError('Context actions require inspect state');
  const locale = language === 'en' ? 'en' : 'ru';
  const definition = interactionDefinitionFor(target);
  if (!definition) throw new TypeError('Context actions require a registered target');
  const view = definition.present({
    target,
    actor,
    language: locale,
    inspected,
    copy: COPY[locale],
  });
  const actions = view.actions.map((candidate) => commandAction(candidate, definition.command));
  return Object.freeze({
    interactionId: definition.id,
    name: view.name,
    description: view.description,
    icon: view.icon,
    accent: view.accent,
    triggerLabel: locale === 'ru' ? `Взаимодействовать: ${view.name}` : `Interact: ${view.name}`,
    closeLabel: locale === 'ru' ? 'Закрыть действия' : 'Close actions',
    actions: Object.freeze(actions.map((action) => Object.freeze({
      ...action,
      label: ACTION_COPY[locale][action.id],
    }))),
  });
}
