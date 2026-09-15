import { chestContextPresentation } from './dcss-rpg-chests.js';

const ACTION_COPY = Object.freeze({
  ru: Object.freeze({
    inspect: 'Осмотреть',
    open: 'Открыть',
    close: 'Закрыть',
    smash: 'Ударить',
    disarm: 'Обезвредить',
    extract: 'Извлечь',
    defile: 'Осквернить',
    'use-key': 'Ключ',
    'pick-lock': 'Взломать',
    attack: 'Атаковать',
    trade: 'Торговать',
    hunt: 'Охотиться',
    cook: 'Приготовить',
  }),
  en: Object.freeze({
    inspect: 'Inspect',
    open: 'Open',
    close: 'Close',
    smash: 'Strike',
    disarm: 'Disarm',
    extract: 'Extract',
    defile: 'Defile',
    'use-key': 'Use key',
    'pick-lock': 'Pick lock',
    attack: 'Attack',
    trade: 'Trade',
    hunt: 'Hunt',
    cook: 'Cook',
  }),
});

const GLYPHS = Object.freeze({
  inspect: '?',
  open: '+',
  close: '−',
  smash: '✕',
  disarm: '✓',
  extract: '✦',
  defile: '!',
  'use-key': '⌑',
  'pick-lock': '⌁',
  attack: '⚔',
  trade: '●',
  hunt: '⚔',
  cook: '♨',
});

const COPY = Object.freeze({
  ru: Object.freeze({
    doorName: 'Каменная дверь',
    doorClosed: 'Закрыта.',
    doorOpen: 'Открыта.',
    crystalName: 'Живая кристальная жила',
    crystalClosed: '',
    crystalInspected: 'В камне мерцает кристалл.',
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
    campfireEmpty: 'Нужно сырое мясо.',
    wildlife: Object.freeze({ sheep: 'Овца', hog: 'Кабан', yak: 'Як' }),
  }),
  en: Object.freeze({
    doorName: 'Stone door',
    doorClosed: 'Closed.',
    doorOpen: 'Open.',
    crystalName: 'Living crystal vein',
    crystalClosed: '',
    crystalInspected: 'A crystal glimmers within the stone.',
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
    campfireEmpty: 'Raw meat required.',
    wildlife: Object.freeze({ sheep: 'Sheep', hog: 'Hog', yak: 'Yak' }),
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
