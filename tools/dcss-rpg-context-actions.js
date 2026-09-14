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
});

const COPY = Object.freeze({
  ru: Object.freeze({
    doorName: 'Каменная дверь',
    doorClosed: 'Закрывает проход. За ней может ждать опасность или награда.',
    doorOpen: 'Проход открыт. Дверь можно закрыть, если проём свободен.',
    crystalName: 'Живая кристальная жила',
    crystalClosed: 'Кристалл пульсирует силой глубин.',
    crystalInspected: (shards, power) => `Извлечение даст ${shards}◆ и +${power} к силе.`,
    graveName: 'Проклятая гробница',
    graveClosed: 'Внутри есть ценности, но печать отвечает болью.',
    graveInspected: (shards, damage) => `Награда: ${shards}◆. Проклятие: −${damage} здоровья.`,
    trapName: 'Механическая ловушка',
    trapClosed: 'Обнаруженный механизм преграждает безопасный путь.',
    trapInspected: (tier, status) => `Сложность ${tier}. ${status}`,
    trapReady: 'Можно обезвредить.',
  }),
  en: Object.freeze({
    doorName: 'Stone door',
    doorClosed: 'Blocks the passage. Danger or treasure may wait beyond it.',
    doorOpen: 'The passage is open. The door can close if the threshold is clear.',
    crystalName: 'Living crystal vein',
    crystalClosed: 'The crystal pulses with power from the depths.',
    crystalInspected: (shards, power) => `Extraction grants ${shards}◆ and +${power} power.`,
    graveName: 'Cursed tomb',
    graveClosed: 'Valuables lie within, but the seal answers with pain.',
    graveInspected: (shards, damage) => `Reward: ${shards}◆. Curse: −${damage} health.`,
    trapName: 'Mechanical trap',
    trapClosed: 'A detected mechanism blocks the safe route.',
    trapInspected: (tier, status) => `Difficulty ${tier}. ${status}`,
    trapReady: 'It can be disarmed.',
  }),
});

const validFind = (target, id) => target.kind === 'find'
  && target.id === id
  && Number.isFinite(target.rewardShards)
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
      description: inspected
        ? copy.crystalInspected(target.rewardShards, target.rewardPower)
        : copy.crystalClosed,
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
      description: inspected
        ? copy.graveInspected(target.rewardShards, target.riskDamage)
        : copy.graveClosed,
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
    closeLabel: locale === 'ru' ? 'Закрыть действия' : 'Close actions',
    actions: Object.freeze(actions.map((action) => Object.freeze({
      ...action,
      label: ACTION_COPY[locale][action.id],
    }))),
  });
}
