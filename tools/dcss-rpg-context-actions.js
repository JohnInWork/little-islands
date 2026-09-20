import { CHASM_ICON_PATH } from './dcss-rpg-chasm.js';
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
    release: 'Отпустить',
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
    // Ответы, которые есть только на своей дороге. `feed` уже занят — этим же
    // словом кормят прирученного зверя, и для идола оно ровно то же самое.
    tend: 'Ухаживать',
    graft: 'Привить',
    uproot: 'Вырвать',
    heed: 'Внять',
    topple: 'Свалить',
    bow: 'Поклониться',
    tribute: 'Откупиться',
    pry: 'Отломать',
    kneel: 'Помянуть',
    rob: 'Вскрыть',
    listen: 'Выслушать',
    swear: 'Поклясться',
    defy: 'Дерзить',
    pay: 'Заплатить штраф',
    serve: 'Отбыть срок',
    goDeep: 'Вниз, в пещеры',
    goSurface: 'Наружу, за ворота',
    goVaults: 'Вниз, в старые подвалы',
    retire: 'Закончить забег',
    enterPortal: 'Войти',
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
    release: 'Release',
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
    tend: 'Tend',
    graft: 'Graft',
    uproot: 'Uproot',
    heed: 'Heed',
    topple: 'Topple',
    bow: 'Bow',
    tribute: 'Tribute',
    pry: 'Pry off',
    kneel: 'Kneel',
    rob: 'Rob',
    listen: 'Listen',
    swear: 'Swear',
    defy: 'Defy',
    pay: 'Pay the fine',
    serve: 'Serve your time',
    goDeep: 'Down into the caves',
    goSurface: 'Out through the gate',
    goVaults: 'Down into the old vaults',
    claim: 'Take the artefact',
    descend: 'Go deeper',
    unbind: 'Lift the binding',
    hire: 'Hire',
    retire: 'End the run',
    enterPortal: 'Step through',
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
  release: '↩',
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
  // The same four marks on a road's own landmark: restore, trade, risk, know.
  tend: '✚',
  heed: '✚',
  bow: '✚',
  graft: '◆',
  tribute: '◆',
  kneel: '◆',
  swear: '◆',
  uproot: '!',
  topple: '!',
  pry: '!',
  rob: '!',
  defy: '!',
  listen: '◈',
  pay: '◉',
  serve: '⌛',
  goDeep: '▼',
  goSurface: '▲',
  goVaults: '◫',
  retire: '◆',
  enterPortal: '◎',
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
    portalName: 'Портал в город',
    portalCityName: 'Портал вниз',
    portalDescription: 'Синее кольцо держит проход. Шаг — и ты в городе.',
    portalCityDescription: (depth) => `Проход на ${depth}-й этаж, туда, где ты его открыл.`,
    portalHint: 'Обратный проход закроется, когда ты им вернёшься.',
    campfireName: 'Костёр',
    campfireUse: 'Огонь для еды: сырое мясо на нём становится сытным и безопасным.',
    campfireBrew: (label) => `Можно сварить: ${label}.`,
    campBedName: 'Спальник',
    campBedClosed: '',
    campBedRested: 'Герой уже отдохнул здесь.',
    campBedHungry: 'Слишком голоден для сна',
    campBedFull: 'Отдыхать незачем',
    campStashName: 'Сундук лагеря',
    campStashClosed: '',
    campfireEmpty: 'Нужно сырое мясо.',
    creatures: Object.freeze({
      sheep: 'Овца',
      hog: 'Кабан',
      yak: 'Як',
      'cave-rodent': 'Пещерный грызун',
      'cave-toad': 'Пещерная жаба',
      'cave-turtle': 'Панцирная черепаха',
      'hell-hog': 'Огненный кабан',
      drifter: 'Бродяга',
      sellsword: 'Наёмный меч',
      veteran: 'Ветеран',
      'knight-errant': 'Странствующий рыцарь',
      hunter: 'Охотник',
      'free-blade': 'Вольный клинок',
    }),
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
    beyondEndName: 'Конец неписаной дороги',
    beyondEndDescription: 'Дальше лестница идёт вниз без конца и без счёта. Эта руна — последнее, что здесь ещё кому-то принадлежит.',
    beyondEndTake: 'Забрать руну',
    beyondEndClaim: 'Забег закончен победой',
    priestName: 'Жрец',
    chasmName: 'Провал',
    chasmDescription: (floors, cost) => floors === 1
      ? `Вниз на этаж. Падение стоит ${cost} здоровья.`
      : `Вниз на два этажа. Падение стоит ${cost} здоровья.`,
    chasmJump: 'Спрыгнуть',
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
    portalName: 'Town portal',
    portalCityName: 'Portal down',
    portalDescription: 'A blue ring holds the way open. One step and you are in the city.',
    portalCityDescription: (depth) => `The way back to floor ${depth}, where you opened it.`,
    portalHint: 'The way back closes once you have come back through it.',
    campfireName: 'Campfire',
    campfireUse: 'A fire to cook on: raw meat becomes filling and safe to eat.',
    campfireBrew: (label) => `Can be brewed: ${label}.`,
    campBedName: 'Bedroll',
    campBedClosed: '',
    campBedRested: 'The hero has already slept here.',
    campBedHungry: 'Too hungry to sleep',
    campBedFull: 'Nothing to sleep off',
    campStashName: 'Camp chest',
    campStashClosed: '',
    campfireEmpty: 'Raw meat required.',
    creatures: Object.freeze({
      sheep: 'Sheep',
      hog: 'Hog',
      yak: 'Yak',
      'cave-rodent': 'Cave rodent',
      'cave-toad': 'Cave toad',
      'cave-turtle': 'Snapping turtle',
      'hell-hog': 'Hell hog',
      drifter: 'Drifter',
      sellsword: 'Sellsword',
      veteran: 'Veteran',
      'knight-errant': 'Knight errant',
      hunter: 'Hunter',
      'free-blade': 'Free blade',
    }),
    guardDescription: (id) => (id === 'city-captain'
      ? '“Sheathe it, and I never saw your face.”'
      : '“Walk easy, stranger. This town is watched.”'),
    companionDescription: 'It has followed you since you fed it, and it fights beside you while it can.',
    companionOrder: (label) => `Order: ${label}.`,
    guardWanted: (label, fine) => `${label}. “Pay ${fine} or you sleep in a cell.”`,
    gateName: 'The fork',
    gateDescription: 'Four roads from here. Caves below, open sky beyond the gate, the old vaults under the town — or home, with what you already carry.',
    retireStake: (gold) => `You bank ${gold}●`,
    beyondEndName: 'The end of the unwritten road',
    beyondEndDescription: 'Below this the stair runs down without end and without count. This rune is the last thing here that still belongs to anyone.',
    beyondEndTake: 'Take the rune',
    beyondEndClaim: 'The run ends in victory',
    roadEndName: 'The end of the written road',
    roadEndDescription: 'The warden is down and the artefact is yours. But the stair keeps going, and nobody knows where.',
    roadEndClaim: 'The run ends in victory',
    roadEndDeeper: 'This stair does not carry anyone back up',
    priestName: 'Priest',
    chasmName: 'Chasm',
    chasmDescription: (floors, cost) => floors === 1
      ? `One floor down. The fall costs ${cost} health.`
      : `Two floors down. The fall costs ${cost} health.`,
    chasmJump: 'Jump down',
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
        ? `${copy.campfireUse} ${copy.campfireBrew(target.brewLabel)}`
        : copy.campfireUse,
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
      icon: 'dngn/gateways/enter_depths.png',
      accent: '#d8bf68',
      actions: [
        // Both roads are always open. They used to grey out the one the run was
        // already on — meant as «you are here», read as «you cannot go back»,
        // and a hero who climbed up out of the caves found no way down again.
        { id: 'goDeep' },
        { id: 'goSurface' },
        { id: 'goVaults' },
        // There used to be a fourth: walk away and bank the purse. Ivan took
        // it out — «забег заканчивается только новым забегом» — and with a run
        // paid for being played there is nothing left to cash in anyway.
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
     * victory and stops there; walking past it is the rest of the dungeon.
     *
     * И у той дороги теперь тоже есть конец. Четвёртый страж каждой ветки
     * стоит на двадцать четвёртом этаже, и за ним лежит руна этой ветки —
     * второй финал, к которому нельзя прийти, не отказавшись от первого.
     * Карточка одна на оба: разное в ней только имя, картинка приза и то,
     * что обещает кнопка.
     */
    id: 'road-end',
    command: 'road-end',
    matches: (target) => target?.kind === 'road-end',
    present: ({ target, copy }) => {
      const beyond = target.ending === 'beyond';
      return {
        name: beyond ? (target.prizeName || copy.beyondEndName) : copy.roadEndName,
        description: beyond ? copy.beyondEndDescription : copy.roadEndDescription,
        icon: target.prizeIcon || 'item/misc/misc_orb2.png',
        accent: beyond ? '#c7a24a' : '#d83e82',
        actions: [
          {
            id: 'claim',
            // Кнопка обещает ровно тот приз, который лежит на лестнице: на
            // двадцать четвёртом этаже это не артефакт, и говорить «Забрать
            // артефакт» там — врать игроку картинкой и словом сразу.
            ...(beyond ? { label: copy.beyondEndTake } : {}),
            hint: beyond ? copy.beyondEndClaim : copy.roadEndClaim,
          },
          { id: 'descend', hint: copy.roadEndDeeper },
        ],
      };
    },
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
     * The man behind the counter. He feeds you and he rents you a bed, and
     * that is the whole of him: «трактирщик продаёт еду, а не нанимает. К
     * наёмнику подходишь сам и договариваешься — у него своё действие».
     *
     * He used to be a hiring desk with four names on it, which made the four
     * people sitting at the tables decoration. Now the list of hires is the
     * room itself: you look at them, you walk over, you ask.
     */
    id: 'recruiter',
    command: 'recruiter',
    matches: (target) => target?.kind === 'recruiter' && Array.isArray(target.menu),
    present: ({ target, copy }) => ({
      name: copy.recruiterName,
      description: target.hireElsewhere ?? '',
      icon: 'mon/unique/donald.png',
      accent: '#c9a45f',
      actions: [
        ...target.menu.map((row) => ({
          id: `buy:${row.itemId}`,
          label: `${row.name} · ${row.price}●`,
          glyph: '🍲',
          enabled: row.affordable === true,
          hint: row.affordable ? row.hint ?? '' : row.reasonText,
        })),
        // The room upstairs: the only bed in the city that is neither the
        // hero's own nor a bedroll on a stone floor.
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
      name: copy.creatures[target.id] ?? target.id,
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
        // Always both, whatever the hero has learned. A companion you can
        // neither send away nor turn on is a companion you are stuck with —
        // and with no taming skills the panel had no actions in it at all.
        { id: 'release' },
        { id: 'attack' },
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
      name: copy.creatures[target.id] ?? target.id,
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
    /**
     * Both mouths of the town portal are the same object, so they are the
     * same card: one verb, «Войти», and a line saying where it comes out.
     * Which side you are on decides only what that line says.
     */
    id: 'portal',
    command: 'portal-step',
    matches: (target) => target?.kind === 'portal' && (target.end === 'city' || target.end === 'dungeon'),
    present: ({ target, copy }) => ({
      name: target.end === 'city' ? copy.portalCityName : copy.portalName,
      description: target.end === 'city'
        ? copy.portalCityDescription(target.depth ?? 1)
        : `${copy.portalDescription} ${copy.portalHint}`,
      icon: 'dngn/gateways/portal.png',
      accent: '#5aa8e0',
      actions: [{ id: 'enterPortal' }],
    }),
  }),
  defineInteraction({
    /**
     * A door onto another road.
     *
     * It is the only thing in the game that changes which dungeon you are in,
     * so it says what it is and where it goes, and the picture is that road's
     * own mouth — the player recognises a way out of here before reading it.
     */
    id: 'branch-gate',
    command: 'branch-gate',
    matches: (target) => target?.kind === 'branch-gate' && typeof target.to === 'string',
    present: ({ target }) => ({
      name: target.name,
      description: target.description,
      icon: target.path,
      accent: '#c06a4a',
      actions: [{ id: 'enterBranch', label: target.enter, glyph: '\u21B3', enabled: true }],
    }),
  }),
  defineInteraction({
    /**
     * Jumping in on purpose.
     *
     * The hole is a shaft with a floor under it, so falling in is a way down
     * — a rough one, paid for in health, that skips the stairs and sometimes
     * a whole level with them. Offering it as an action rather than letting
     * the player walk in by accident keeps both halves true: nobody falls
     * without choosing to, and choosing to is a real option.
     */
    id: 'chasm',
    command: 'chasm-jump',
    matches: (target) => target?.kind === 'chasm' && Number.isInteger(target.floors),
    present: ({ target, copy }) => ({
      name: copy.chasmName,
      description: copy.chasmDescription(target.floors, target.cost),
      icon: CHASM_ICON_PATH,
      accent: '#6f6a63',
      actions: [{
        id: 'jump',
        label: `${copy.chasmJump} · ${target.floors === 1 ? 'I' : 'II'}`,
        glyph: '\u2193',
        enabled: target.survivable === true,
        hint: target.survivable ? '' : target.hint ?? '',
      }],
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

/** Строка под названием: действие и его цена, либо действие и причина отказа. */
function triggerSummary(actions) {
  // «Осмотреть» есть почти у всего и не отвечает ни на «что я получу», ни на
  // «чего это стоит»: кнопка нужна не за этим.
  const useful = actions.filter(({ id }) => id !== 'inspect');
  const chosen = useful.find((action) => action.enabled) ?? useful[0] ?? actions[0];
  if (!chosen) return '';
  const label = typeof chosen.label === 'string' ? chosen.label.trim() : '';
  const hint = typeof chosen.hint === 'string' ? chosen.hint.trim() : '';
  if (!label) return hint;
  return hint ? `${label} · ${hint}` : label;
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
  const labelled = actions.map((action) => ({
    ...action,
    label: action.label ?? ACTION_COPY[locale][action.id],
  }));
  return Object.freeze({
    interactionId: definition.id,
    name: view.name,
    description: view.description,
    icon: view.icon,
    accent: view.accent,
    triggerLabel: locale === 'ru' ? `Взаимодействовать: ${view.name}` : `Interact: ${view.name}`,
    /**
     * Что написать на самой кнопке, под названием.
     *
     * Иван: «на иконке непонятно что я получаю и что теряю — надо просто на
     * кнопку взаимодействия писать, что это и что с ним можно сделать, а не
     * помещать всю инфу в маленькую кнопку». Значок называет предмет в лучшем
     * случае; цену и запрет он не называет никогда.
     *
     * Берётся первое доступное действие, а если доступного нет — первое вообще:
     * тогда подсказка и есть ответ на «почему нельзя», и это ровно та половина,
     * которой на кнопке не хватало.
     */
    triggerSummary: triggerSummary(labelled),
    closeLabel: locale === 'ru' ? 'Закрыть действия' : 'Close actions',
    // Most actions are a fixed verb from the table. A few — the hires — are
    // a row of a list and carry their own name and price with them.
    actions: Object.freeze(labelled.map((action) => Object.freeze({ ...action }))),
  });
}
