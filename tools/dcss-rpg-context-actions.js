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
    tame: 'Приручить',
    feed: 'Покормить',
    treat: 'Перевязать',
    order: 'Приказ',
    cook: 'Приготовить',
    brew: 'Сварить',
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
    pay: 'Заплатить штраф',
    serve: 'Отбыть срок',
    goDeep: 'Вниз, в пещеры',
    goSurface: 'Наружу, за ворота',
    goVaults: 'Вниз, в старые подвалы',
    retire: 'Уйти с добычей',
    claim: 'Забрать артефакт',
    descend: 'Идти глубже',
    unbind: 'Снять оковы',
    hire: 'Нанять',
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
    tame: 'Tame',
    feed: 'Feed',
    treat: 'Bandage',
    order: 'Order',
    cook: 'Cook',
    brew: 'Brew',
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
    pay: 'Pay the fine',
    serve: 'Serve your time',
    goDeep: 'Down into the caves',
    goSurface: 'Out through the gate',
    goVaults: 'Down into the old vaults',
    claim: 'Take the artefact',
    descend: 'Go deeper',
    unbind: 'Lift the binding',
    hire: 'Hire',
    retire: 'Walk away with the haul',
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
  tame: '♥',
  feed: '◆',
  treat: '✚',
  order: '➤',
  cook: '♨',
  brew: '⚗',
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
  pay: '◉',
  serve: '⌛',
  goDeep: '▼',
  goSurface: '▲',
  goVaults: '◫',
  retire: '◆',
  claim: '◆',
  descend: '▼',
  unbind: '⛓',
  hire: '⚔',
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
    trapClosed: 'Механизм взведён. Шагнёшь — сработает.',
    trapInspected: (tier, status) => `Сложность ${tier}. ${status}`,
    trapReady: 'Можно обезвредить.',
    merchantName: 'Странствующий торговец',
    merchantDescription: '',
    campfireName: 'Костёр',
    campfireBrew: (label) => `Можно сварить: ${label}.`,
    campBedName: 'Спальник',
    campBedClosed: '',
    campBedRested: 'Герой уже отдохнул здесь.',
    campBedHungry: 'Слишком голоден для сна',
    campBedFull: 'Отдыхать незачем',
    campStashName: 'Сундук лагеря',
    campStashClosed: '',
    campfireEmpty: 'Нужно сырое мясо.',
    wildlife: Object.freeze({ sheep: 'Овца', hog: 'Кабан', yak: 'Як' }),
    // A guard is a person doing a job, not a rule printed on a card. He says
    // what a man in that job says to a stranger with a sword — and the captain,
    // who has said it a thousand times, says it shorter.
    guardDescription: (id) => (id === 'city-captain'
      ? '«Оружие в ножны, и я тебя не запомню.»'
      : '«Ходи спокойно, чужак. Здесь за порядком следят.»'),
    companionDescription: 'Идёт за тобой с тех пор, как ты его накормил, и дерётся рядом, пока цел.',
    companionOrder: (label) => `Приказ: ${label}.`,
    // The status is the city's word («Разыскивается», «Враг города») and will
    // not bend into a sentence; the guard's own words come after it.
    guardWanted: (label, fine) => `${label}. «Плати ${fine} — или ночуешь в камере.»`,
    gateName: 'Развилка',
    gateDescription: 'Отсюда четыре дороги. Вниз в пещеры, за ворота под небо, вниз в старые подвалы — или домой, с тем, что уже унёс.',
    retireStake: (gold) => `Унесёшь ${gold}●`,
    roadEndName: 'Конец написанной дороги',
    roadEndDescription: 'Страж пал, артефакт твой. Но лестница идёт дальше, и никто не знает, куда.',
    roadEndClaim: 'Забег закончен победой',
    roadEndDeeper: 'Обратно эта лестница уже не поднимет',
    priestName: 'Жрец',
    recruiterName: 'Трактирщик',
    tavernHire: 'Нанять',
    tavernBed: 'Ночлег',
    cellName: 'Дверь камеры',
    cellDescription: (fine) => `За этой дверью отсиживаются те, кому нечем платить. Выкуп — ${fine} реального золота.`,
    deedName: 'Участок на продажу',
    deedDescription: (price) => `Пустой участок за оградой. Хозяин просит ${price} реального золота и не торгуется.`,
    slotName: (piece) => `Место под предмет: ${piece}`,
    slotDescription: (price) => `Цена: ${price} золота.`,
    houseBedName: 'Своя кровать',
    houseBedDescription: 'Своя постель под своей крышей. Здесь высыпаешься так, как в лагере не выйдет.',
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
    campfireBrew: (label) => `Can be brewed: ${label}.`,
    campBedName: 'Bedroll',
    campBedClosed: '',
    campBedRested: 'The hero has already slept here.',
    campBedHungry: 'Too hungry to sleep',
    campBedFull: 'Nothing to sleep off',
    campStashName: 'Camp chest',
    campStashClosed: '',
    campfireEmpty: 'Raw meat required.',
    wildlife: Object.freeze({ sheep: 'Sheep', hog: 'Hog', yak: 'Yak' }),
    guardDescription: (id) => (id === 'city-captain'
      ? '“Sheathe it, and I never saw your face.”'
      : '“Walk easy, stranger. This town is watched.”'),
    companionDescription: 'It has followed you since you fed it, and it fights beside you while it can.',
    companionOrder: (label) => `Order: ${label}.`,
    guardWanted: (label, fine) => `${label}. “Pay ${fine} or you sleep in a cell.”`,
    gateName: 'The fork',
    gateDescription: 'Four roads from here. Caves below, open sky beyond the gate, the old vaults under the town — or home, with what you already carry.',
    retireStake: (gold) => `You bank ${gold}●`,
    roadEndName: 'The end of the written road',
    roadEndDescription: 'The warden is down and the artefact is yours. But the stair keeps going, and nobody knows where.',
    roadEndClaim: 'The run ends in victory',
    roadEndDeeper: 'This stair does not carry anyone back up',
    priestName: 'Priest',
    recruiterName: 'Innkeeper',
    tavernHire: 'Hire',
    tavernBed: 'A room',
    cellName: 'Cell door',
    cellDescription: (fine) => `Behind this door sit the ones who could not pay. Buying out costs ${fine} real gold.`,
    deedName: 'Plot for sale',
    deedDescription: (price) => `An empty plot behind the fence. The owner asks ${price} real gold and will not haggle.`,
    slotName: (piece) => `Space for: ${piece}`,
    slotDescription: (price) => `Price: ${price} gold.`,
    houseBedName: 'Your own bed',
    houseBedDescription: 'Your own bed under your own roof. You sleep here the way camp never lets you.',
    guards: Object.freeze({ 'city-guard': 'City guard', 'city-captain': 'Watch captain' }),
  }),
});

const validFind = (target, id) => target.kind === 'find'
  && target.id === id
  && Number.isFinite(target.rewardGold)
  && Number.isFinite(target.rewardPower)
  && Number.isFinite(target.riskDamage);

const commandAction = ({ id, enabled = true, hint = '', label = null, glyph = null }, command) => Object.freeze({
  id,
  command: id === 'inspect' ? 'inspect' : command,
  // Most actions are a fixed verb with a fixed sign. A few — the hires — are
  // rows of a list, and carry their own name, price and sign with them.
  glyph: glyph ?? GLYPHS[id],
  enabled,
  hint,
  ...(label ? { label } : {}),
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
      description: target.brewLabel
        ? copy.campfireBrew(target.brewLabel)
        : target.rawMeatCount > 0 ? '' : copy.campfireEmpty,
      icon: 'dngn/altars/makhleb_flame1.png',
      accent: '#d88447',
      actions: [
        { id: 'cook', enabled: target.rawMeatCount > 0, hint: target.rawMeatCount > 0 ? '' : copy.campfireEmpty },
        // Alchemy adds a second use for the same fire: a bottle instead of a meal.
        ...(target.brewLabel
          ? [{ id: 'brew', enabled: target.canBrew === true, hint: target.canBrew ? '' : target.brewHint ?? '' }]
          : []),
      ],
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
      // A wanted hero is told the price before being told they can swing.
      description: target.wantedLabel
        ? copy.guardWanted(target.wantedLabel, target.fine)
        : copy.guardDescription(target.id),
      icon: target.icon,
      accent: '#c9a45f',
      actions: [
        ...(target.wantedLabel && target.takesFine
          ? [{ id: 'pay', enabled: target.canPay === true, hint: target.canPay ? '' : target.hint ?? '' }]
          : []),
        { id: 'attack' },
      ],
    }),
  }),
  defineInteraction({
    // The city is the only place a run chooses its road, so the gate asks.
    id: 'city-gate',
    command: 'city-gate',
    matches: (target) => target?.kind === 'city-gate' && typeof target.branch === 'string',
    present: ({ target, copy }) => ({
      name: copy.gateName,
      description: copy.gateDescription,
      icon: 'dngn/gateways/stone_stairs_down.png',
      accent: '#d8bf68',
      actions: [
        // Both roads are always open. They used to grey out the one the run was
        // already on — meant as «you are here», read as «you cannot go back»,
        // and a hero who climbed up out of the caves found no way down again.
        { id: 'goDeep' },
        { id: 'goSurface' },
        { id: 'goVaults' },
        // The third road out of the gate is the one that keeps the purse — and
        // it says how much, because «go one floor deeper or bank what you have»
        // is only a decision if the player can see the stake without counting.
        {
          id: 'retire',
          enabled: target.canRetire === true,
          hint: target.canRetire === true ? copy.retireStake(target.purse ?? 0) : '',
        },
      ],
    }),
  }),
  defineInteraction({
    /**
     * The one place the dungeon asks instead of deciding.
     *
     * The warden at the end of the written road used to end the run by being
     * dead: you stepped on the stair and the credits rolled, whether or not
     * that was what you wanted. It is a door now. Taking the artefact is a
     * victory and stops there; walking past it is the rest of the dungeon,
     * which has no bottom and no second artefact waiting at a known depth.
     */
    id: 'road-end',
    command: 'road-end',
    matches: (target) => target?.kind === 'road-end',
    present: ({ target, copy }) => ({
      name: copy.roadEndName,
      description: copy.roadEndDescription,
      icon: 'item/misc/misc_orb2.png',
      accent: '#d83e82',
      actions: [
        { id: 'claim', hint: copy.roadEndClaim },
        { id: 'descend', hint: copy.roadEndDeeper },
      ],
    }),
  }),
  defineInteraction({
    /**
     * The temple: the reliable way out of a binding, and the expensive one.
     *
     * Everything the panel says — the price, whether there is anything to lift,
     * why not — comes from `templeOffer`, so the greyed-out button and the line
     * of speech above it can never disagree about the reason.
     */
    id: 'priest',
    command: 'priest',
    matches: (target) => target?.kind === 'priest',
    present: ({ target, copy }) => ({
      name: copy.priestName,
      description: target.text ?? '',
      icon: 'mon/deep_elf_high_priest.png',
      accent: '#d8bf68',
      actions: [
        {
          id: 'unbind',
          enabled: target.canUnbind === true,
          hint: target.canUnbind === true ? `${target.price}●` : '',
        },
      ],
    }),
  }),
  defineInteraction({
    /**
     * Hired help. The whole design is the price ladder: a strong one costs a
     * lot and a weak one is cheap, so hiring asks a question about this run —
     * a sword arm now, or your own gear and walk in alone.
     */
    id: 'recruiter',
    command: 'recruiter',
    matches: (target) => target?.kind === 'recruiter' && Array.isArray(target.rows),
    present: ({ target, copy }) => ({
      name: copy.recruiterName,
      description: target.idle ?? '',
      icon: 'mon/unique/donald.png',
      accent: '#c9a45f',
      actions: [
        ...target.rows.map((row) => ({
          id: `hire:${row.id}`,
          label: `${row.shortName ?? row.name} · ${row.price}●`,
          glyph: '⚔',
          enabled: row.ok === true,
          hint: row.ok ? `${row.maxHp} ♥ · ${row.damage} ⚔` : row.reason,
        })),
        // The keeper also rents the room upstairs. It is the only bed in the
        // city that is neither the hero's own nor a bedroll on a stone floor.
        ...(target.bed ? [{
          id: 'bed',
          label: `${copy.tavernBed} · ${target.bed.price}●`,
          glyph: '☾',
          enabled: target.bed.ok === true,
          hint: target.bed.ok ? '' : target.bed.text,
        }] : []),
      ],
    }),
  }),
  defineInteraction({
    /**
     * One hire, at one table. Walking up to a man and asking him is a different
     * thing from reading a list of four, and the tavern exists so that it is:
     * the price ladder is the same, but the question is about him.
     */
    id: 'tavern-hire',
    command: 'tavern-hire',
    matches: (target) => target?.kind === 'tavern-hire' && typeof target.mercenaryId === 'string' && target.row,
    present: ({ target, copy }) => ({
      name: target.row.name,
      description: target.row.line ?? '',
      icon: target.icon ?? target.row.path,
      accent: '#c9a45f',
      actions: [{
        id: `hire:${target.mercenaryId}`,
        label: `${copy.tavernHire} · ${target.row.price}●`,
        glyph: '⚔',
        enabled: target.row.ok === true,
        hint: target.row.ok ? `${target.row.maxHp} ♥ · ${target.row.damage} ⚔` : target.row.reason,
      }],
    }),
  }),
  defineInteraction({
    id: 'jail-door',
    command: 'jail-door',
    matches: (target) => target?.kind === 'jail-door' && Number.isInteger(target.fine),
    present: ({ target, copy }) => ({
      name: copy.cellName,
      description: copy.cellDescription(target.fine),
      icon: 'dngn/doors/closed_door.png',
      accent: '#8c8f9b',
      actions: [
        { id: 'serve' },
        { id: 'pick-lock', enabled: target.canPick === true, hint: target.canPick ? '' : target.hint ?? '' },
      ],
    }),
  }),
  defineInteraction({
    // The hero's own beast: fed, patched up and told what to do.
    id: 'companion',
    command: 'companion-care',
    matches: (target) => target?.kind === 'companion'
      && typeof target.id === 'string'
      && typeof target.icon === 'string',
    present: ({ target, copy }) => ({
      name: copy.wildlife[target.id] ?? target.id,
      description: target.modeLabel
        ? copy.companionOrder(target.modeLabel)
        : copy.companionDescription,
      icon: target.icon,
      accent: '#9ad3b8',
      actions: [
        ...(target.careKnown
          ? [{ id: 'feed', enabled: target.canFeed === true, hint: target.canFeed ? '' : target.feedHint ?? '' }]
          : []),
        ...(target.treatKnown
          ? [{ id: 'treat', enabled: target.canTreat === true, hint: target.canTreat ? '' : target.treatHint ?? '' }]
          : []),
        ...(target.orderKnown ? [{ id: 'order' }] : []),
      ],
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
      description: target.tameHint ?? '',
      icon: target.icon,
      accent: '#b69062',
      actions: [
        // A beast can be met with a blade or with bread; taming offers the bread.
        ...(target.tameKnown
          ? [{ id: 'tame', enabled: target.canTame === true, hint: target.canTame ? '' : target.tameHint ?? '' }]
          : []),
        { id: 'hunt' },
      ],
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
      // Most actions are a fixed verb from the table. A few — the hires — are
      // a row of a list and carry their own name and price with them.
      label: action.label ?? ACTION_COPY[locale][action.id],
    }))),
  });
}
