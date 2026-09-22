import { CHASM_ICON_PATH } from './dcss-rpg-chasm.js';
import { chestContextPresentation } from './dcss-rpg-chests.js';
import { isLandmarkFind, landmarkContextPresentation } from './dcss-rpg-finds.js';

const ACTION_COPY = Object.freeze({
  ru: Object.freeze({
    open: 'Открыть',
    browse: 'Заглянуть',
    close: 'Закрыть',
    smash: 'Ударить',
    disarm: 'Обезвредить',
    extract: 'Извлечь',
    defile: 'Осквернить',
    'use-key': 'Ключ',
    'pick-lock': 'Взломать',
    heal: 'Исцелиться',
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
    forget: 'Забыть выученное',
    hire: 'Нанять',
    take: 'Подобрать',
  }),
  en: Object.freeze({
    open: 'Open',
    browse: 'Browse',
    close: 'Close',
    smash: 'Strike',
    disarm: 'Disarm',
    extract: 'Extract',
    defile: 'Defile',
    'use-key': 'Use key',
    'pick-lock': 'Pick lock',
    heal: 'Heal',
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
    forget: 'Unlearn it all',
    hire: 'Hire',
    take: 'Take',
    retire: 'End the run',
    enterPortal: 'Step through',
  }),
});

const GLYPHS = Object.freeze({
  heal: '❤',
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
  forget: '✦',
  hire: '⚔',
  take: '◆',
});

const COPY = Object.freeze({
  ru: Object.freeze({
    doorName: 'Каменная дверь',
    doorClosed: 'Закрыта.',
    doorOpen: 'Открыта.',
    crystalName: 'Живая кристальная жила',
    crystalClosed: '',
    crystalInspected: 'В камне мерцает кристалл. Даст золото и силу, и ничем не грозит.',
    stashName: 'Тайник под плитой',
    stashClosed: '',
    stashInspected: 'Плита лежит неровно: под ней пустота. Под ней золото, и она не кусается.',
    graveName: 'Древняя гробница',
    graveClosed: '',
    graveInspected: 'На плите видна тёмная печать. Внутри золото мёртвых, но печать ранит того, кто вскроет.',
    trapName: 'Механическая ловушка',
    trapClosed: 'Механизм взведён. Шагнёшь — сработает.',
    trapInspected: (tier, status) => `Сложность ${tier}. ${status}`,
    trapReady: 'Можно обезвредить.',
    events: Object.freeze({
      fountain: Object.freeze({
        name: 'Светлый источник',
        line: (value) => `Чистая вода. Напиться — ${value} здоровья, и промокнешь.`,
      }),
      'blood-altar': Object.freeze({
        name: 'Алтарь крови',
        /*
         * «Сила» здесь была враньём.
         *
         * Алтарь прибавляет к урону, а не к характеристике. Иван нажал, пошёл
         * смотреть лист персонажа и увидел ту же тройку силы: «в чём прикол,
         * не понимаю». Теперь названо то, что он и правда даёт.
         */
        line: (value) => `Дар за ожог: +${value} к урону навсегда, и пламя оставит след.`,
      }),
      sarcophagus: Object.freeze({
        name: 'Вскрытый саркофаг',
        line: (value) => `До него добрались раньше, но не всё унесли: ${value} золота.`,
      }),
    }),
    merchantName: 'Странствующий торговец',
    merchantDescription: '',
    portalName: 'Портал в город',
    portalCityName: 'Портал вниз',
    portalDescription: 'Синее кольцо держит проход. Шаг — и ты в городе.',
    portalCityDescription: (depth) => `Проход на ${depth}-й этаж, туда, где ты его открыл.`,
    portalHint: 'Обратный проход закроется, когда ты им вернёшься.',
    campfireName: 'Костёр',
    campfireUse: 'Огонь для еды: сырое мясо на нём становится сытным и безопасным.',
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
    // Дорог три, и кнопок три. Четвёртую — «домой, с тем, что уже унёс» —
    // Иван убрал сам («забег заканчивается только новым забегом»), а текст
    // остался обещать её ещё долго после того, как кнопка исчезла.
    gateDescription: 'Отсюда три дороги. Вниз в пещеры, за ворота под небо или вниз, в старые подвалы.',
    roadEndName: 'Конец написанной дороги',
    roadEndDescription: 'Страж пал, артефакт твой. Но лестница идёт дальше, и никто не знает, куда.',
    roadEndClaim: 'Забег закончен победой',
    stairUpName: 'Лестница наверх',
    stairUpDescription: 'Ведёт обратно в город. Этаж останется как есть и дождётся.',
    stairUpClimb: 'В город',
    roadEndDeeper: 'Обратно эта лестница уже не поднимет',
    beyondEndName: 'Конец неписаной дороги',
    beyondEndDescription: 'Дальше лестница идёт вниз без конца и без счёта. Эта руна — последнее, что здесь ещё кому-то принадлежит.',
    beyondEndTake: 'Забрать руну',
    beyondEndClaim: 'Забег закончен победой',
    sanctuaryName: 'Святилище',
    sanctuaryDescription: 'Камень, у которого останавливаются перед спуском. Берёт монеты, отдаёт силы.',
    sanctuaryOffer: (heal, price) => `+${heal} {heal} · −${price} {gold}`,
    sanctuaryFull: 'Нечего лечить',
    sanctuaryPoor: (price) => `Нужно ${price} {gold}`,
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
    cellDescription: (fine) => `За этой дверью отсиживаются те, кому нечем платить. Выкуп — ${fine} золота.`,
    deedName: 'Маклер',
    /*
     * Факт и одна живая строка — больше ничего.
     *
     * Здесь было три предложения про то, как он показывает дом, не торгуется и
     * уйдёт своей дорогой. Иван: «зачем продолжать вот этот бред? Давай просто
     * факты. Этот человек продаёт дом за столько-то. Всё, купить или не
     * купить». И про то, что работает: «у мага классная фраза — маленькая,
     * которую ты быстро читаешь».
     */
    deedDescription: (price) => `Продаёт этот дом. ${price} золота, и ключ твой.`,
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
    crystalInspected: 'A crystal glimmers within the stone. It yields gold and power, and costs nothing.',
    stashName: 'Stash under the flagstone',
    stashClosed: '',
    stashInspected: 'The flagstone sits crooked: there is a hollow beneath. Gold under it, and no teeth.',
    graveName: 'Ancient tomb',
    graveClosed: '',
    graveInspected: 'A dark seal marks the slab. The dead keep gold; the seal wounds whoever breaks it.',
    trapName: 'Mechanical trap',
    trapClosed: 'A detected mechanism blocks the safe route.',
    trapInspected: (tier, status) => `Difficulty ${tier}. ${status}`,
    trapReady: 'It can be disarmed.',
    events: Object.freeze({
      fountain: Object.freeze({
        name: 'Clear spring',
        line: (value) => `Clean water. A drink is ${value} health, and a soaking.`,
      }),
      'blood-altar': Object.freeze({
        name: 'Altar of blood',
        line: (value) => `A gift for a burn: +${value} attack for good, and the flame leaves its mark.`,
      }),
      sarcophagus: Object.freeze({
        name: 'Opened sarcophagus',
        line: (value) => `Someone got here first, but not everything left with them: ${value} gold.`,
      }),
    }),
    merchantName: 'Wandering merchant',
    merchantDescription: '',
    portalName: 'Town portal',
    portalCityName: 'Portal down',
    portalDescription: 'A blue ring holds the way open. One step and you are in the city.',
    portalCityDescription: (depth) => `The way back to floor ${depth}, where you opened it.`,
    portalHint: 'The way back closes once you have come back through it.',
    campfireName: 'Campfire',
    campfireUse: 'A fire to cook on: raw meat becomes filling and safe to eat.',
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
    gateDescription: 'Three roads from here. Caves below, open sky beyond the gate, or the old vaults under the town.',
    beyondEndName: 'The end of the unwritten road',
    beyondEndDescription: 'Below this the stair runs down without end and without count. This rune is the last thing here that still belongs to anyone.',
    beyondEndTake: 'Take the rune',
    beyondEndClaim: 'The run ends in victory',
    roadEndName: 'The end of the written road',
    roadEndDescription: 'The warden is down and the artefact is yours. But the stair keeps going, and nobody knows where.',
    roadEndClaim: 'The run ends in victory',
    stairUpName: 'Stairs up',
    stairUpDescription: 'Back to the city. The floor stays as it is and waits.',
    stairUpClimb: 'To the city',
    roadEndDeeper: 'This stair does not carry anyone back up',
    sanctuaryName: 'Sanctuary',
    sanctuaryDescription: 'A stone people stop at before going down. It takes coins and gives strength back.',
    sanctuaryOffer: (heal, price) => `+${heal} {heal} · −${price} {gold}`,
    sanctuaryFull: 'Nothing to heal',
    sanctuaryPoor: (price) => `Needs ${price} {gold}`,
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
    cellDescription: (fine) => `Behind this door sit the ones who could not pay. Buying out costs ${fine} gold.`,
    deedName: 'Broker',
    deedDescription: (price) => `Selling this house. ${price} gold and the key is yours.`,
    slotName: (piece) => `Space for: ${piece}`,
    slotDescription: (price) => `Price: ${price} gold.`,
    houseBedName: 'Your own bed',
    houseBedDescription: 'Your own bed under your own roof. You sleep here the way camp never lets you.',
    guards: Object.freeze({ 'city-guard': 'City guard', 'city-captain': 'Watch captain' }),
  }),
});

const validFind = (target, id) => target?.kind === 'find'
  && target.id === id
  && Number.isFinite(target.rewardGold)
  && Number.isFinite(target.rewardPower)
  && Number.isFinite(target.riskDamage);

const commandAction = ({ id, enabled = true, hint = '', label = null, glyph = null }, command) => Object.freeze({
  id,
  command,
  // Most actions are a fixed verb with a fixed sign. A few — the hires — are
  // rows of a list, and carry their own name, price and sign with them.
  glyph: glyph ?? GLYPHS[id],
  enabled,
  hint,
  ...(label ? { label } : {}),
});

/**
 * Окно — только там, где есть выбор.
 *
 * Иван: «если я нажимаю на дверь и в ней только одна точка взаимодействия —
 * открыть, — то мы не предлагаем окно, оно сразу её открывает. Давай сделаем
 * игру максимально простой». Одно действие исполняется от касания, и окно
 * не появляется вовсе.
 *
 * `confirm` — исключение из правила: касание не должно бить живое и не должно
 * ронять героя в яму. Стражник назван Иваном прямо («это важная механика»),
 * зверь и провал — та же природа: удар и прыжок вниз.
 *
 * `terse` — обратное исключение: единственное недоступное действие отвечает
 * всплывающей строкой, а окно не открывается. Ставится по одному, а не всем
 * подряд, и вот почему. Костру сказать нечего, кроме «нужно сырое мясо», —
 * окно ради этой строки лишнее. А участок под дом на такой же отказ отвечает
 * «не хватает золота», и игрок остаётся без главного: что здесь продаётся и
 * почём. Иван: «я не понимаю, что я покупаю… модалку надо оставить». Поэтому
 * по умолчанию окно, и только помеченные молчат.
 */
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
    terse: true,
    matches: (target) => target?.kind === 'campfire' && Number.isInteger(target.rawMeatCount),
    present: ({ target, copy }) => ({
      name: copy.campfireName,
      description: copy.campfireUse,
      icon: 'dngn/altars/makhleb_flame1.png',
      accent: '#d88447',
      actions: [
        { id: 'cook', enabled: target.rawMeatCount > 0, hint: target.rawMeatCount > 0 ? '' : copy.campfireEmpty },
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
    /*
     * Дом покупают в окне, а не касанием.
     *
     * Единственное доступное действие игра выполняет сразу, без окна, — и
     * триста пятьдесят золота уходили от одного нажатия на кнопку действия.
     * Иван на первой версии: «я не понимаю, что я покупаю… модалку надо
     * оставить». Тем более теперь, когда напротив стоит человек: разговор
     * должен быть виден.
     */
    id: 'house-deed',
    confirm: true,
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
    /**
     * Святилище — обычное взаимодействие, а не своя кнопка.
     *
     * Оно лечило сразу по нажатию, поэтому вся его суть жила в значке: сердце,
     * цифра и монета. Иван: «непонятно, что можно исцелиться за три золотых —
     * на иконке непонятно, что я получаю и что теряю». Значок про это молчал и
     * молчать будет всегда, а окно — говорит: сколько здоровья и почём.
     */
    id: 'sanctuary',
    command: 'sanctuary',
    matches: (target) => target?.kind === 'sanctuary'
      && Number.isInteger(target.price)
      && Number.isInteger(target.heal),
    present: ({ target, copy }) => ({
      name: copy.sanctuaryName,
      description: copy.sanctuaryDescription,
      icon: target.icon,
      accent: '#d1c16e',
      actions: [{
        id: 'heal',
        enabled: target.heal > 0 && target.canPay === true,
        // Доступное действие обещает, отказанное объясняет — и то, и другое
        // цифрами: «+28 {heal} · −3{gold}» или «Нужно 3{gold}».
        hint: target.heal <= 0
          ? copy.sanctuaryFull
          : target.canPay === true
            ? copy.sanctuaryOffer(target.heal, target.price)
            : copy.sanctuaryPoor(target.price),
      }],
    }),
  }),
  defineInteraction({
    /*
     * Разговор с именным.
     *
     * Карточка ничего не решает сама: имя, реплика и ответы приходят готовыми
     * из `dcss-rpg-parley.js`, потому что у каждого именного они свои. Здесь
     * только рамка, в которую это вставляется.
     *
     * `confirm` обязателен. Единственный доступный ответ игра выполнила бы
     * сразу — и герой отдал бы меч, не увидев, что у него просили меч.
     */
    id: 'parley',
    confirm: true,
    command: 'parley',
    matches: (target) => target?.kind === 'parley'
      && typeof target.name === 'string'
      && typeof target.line === 'string'
      && Array.isArray(target.options)
      && target.options.length > 0,
    present: ({ target }) => ({
      name: target.name,
      description: target.line,
      icon: target.icon,
      accent: '#c98f5f',
      actions: target.options.map(({ id, label, enabled, hint }) => ({
        id,
        label,
        enabled: enabled !== false,
        hint: enabled === false ? hint ?? '' : '',
      })),
    }),
  }),
  defineInteraction({
    id: 'guard',
    confirm: true,
    command: 'provoke-guard',
    matches: (target) => target?.kind === 'guard'
      && typeof target.id === 'string'
      && typeof target.icon === 'string',
    present: ({ target, copy }) => ({
      name: copy.guards[target.id] ?? target.name ?? target.id,
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
     * Призрак прошлого героя — единственное существо в игре, которое говорит
     * о самом игроке.
     *
     * Он не сторожит добычу и не нападает, поэтому у него одно действие и
     * никакого выбора: коснулся — он рассказал, где и от чего кончился
     * прошлый забег. Имя, описание и подпись приходят с самим призраком:
     * они живут в правилах кладбища, а не в этой таблице.
     */
    id: 'graveyard-ghost',
    command: 'ghost-speak',
    matches: (target) => target?.kind === 'graveyard-ghost'
      && typeof target.name === 'string'
      && typeof target.summary === 'string'
      && typeof target.action === 'string',
    present: ({ target }) => ({
      name: target.name,
      description: target.summary,
      icon: target.icon,
      accent: '#9fc7d8',
      actions: [{ id: 'speak', label: target.action, glyph: '\u2026' }],
    }),
  }),
  defineInteraction({
    /**
     * Лестница наверх — шаг обратно в город, и его нельзя сделать нечаянно.
     *
     * Клетка, на которой герой появился, и есть эта лестница, и раньше шаг на
     * неё молча уводил наверх: игрок, обходя вход, терял этаж без единого
     * вопроса. Действие обычное, но помечено `confirm`: одним касанием с
     * этажа не уходят.
     */
    id: 'stair-up',
    confirm: true,
    command: 'stair-up',
    matches: (target) => target?.kind === 'stair-up' && typeof target.icon === 'string',
    present: ({ target, copy }) => ({
      name: copy.stairUpName,
      description: copy.stairUpDescription,
      icon: target.icon,
      accent: '#9fb0a8',
      actions: [{ id: 'climb', label: copy.stairUpClimb, glyph: '\u25B2' }],
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
          hint: target.canUnbind === true ? `${target.price} {gold}` : '',
        },
        /*
         * Вторая служба того же жреца: он снимает не только оковы с вещей, но
         * и выученное с головы. Иван: «добавить эту функцию в город у того же
         * мага, у которого ты сбрасываешь проклятие с вещей, но у него дороже
         * будет намного». Дороже — за то, что он всегда на месте, а на
         * бродячего Фаннара надо ещё наткнуться.
         */
        {
          id: 'forget',
          enabled: target.canForget === true,
          hint: target.forgetHint ?? '',
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
          label: `${row.name} · ${row.price} {gold}`,
          glyph: '🍲',
          enabled: row.affordable === true,
          hint: row.affordable ? row.hint ?? '' : row.reasonText,
        })),
        // The room upstairs: the only bed in the city that is neither the
        // hero's own nor a bedroll on a stone floor.
        ...(target.bed ? [{
          id: 'bed',
          label: `${copy.tavernBed} · ${target.bed.price} {gold}`,
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
        label: `${copy.tavernHire} · ${target.row.price} {gold}`,
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
    confirm: true,
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
  /*
   * Вещь на полу.
   *
   * До сих пор она подбиралась сама: герой проходил по клетке, и добыча
   * оказывалась в рюкзаке. Иван: «может быть такое, что игроку что-то выпало,
   * и он сразу это поднял, и он даже не успел понять, что случилось».
   *
   * Теперь это такое же взаимодействие, как открыть сундук или заговорить:
   * на кнопке — картинка самой вещи и её название, и подбирается она только
   * нажатием. Заодно это делает осмысленным отряд: зверь в режиме «носить»
   * по-прежнему таскает всё сам, и вот за это ему и платят едой.
   */
  defineInteraction({
    id: 'ground-loot',
    command: 'pick-up',
    matches: (target) => target?.kind === 'loot'
      && typeof target.icon === 'string'
      && typeof target.name === 'string',
    present: ({ target }) => ({
      name: target.name,
      description: target.description ?? '',
      icon: target.icon,
      accent: target.accent ?? '#c8b273',
      actions: [{ id: 'take', enabled: target.roomInPack !== false, hint: target.fullHint ?? '' }],
    }),
  }),
  /*
   * То, что стоит на этаже и что-то даёт.
   *
   * Фонтан, алтарь и вскрытый саркофаг срабатывали от того, что герой прошёл
   * по клетке: вещь исчезала, всплывала подпись «+11» с её же картинкой — и
   * Иван читал это как «одиннадцать гробниц». «Я вообще не понимаю, что это
   * значит. <...> Надо это исправлять, это прям плохо, то что я не понимаю,
   * что происходит в игре».
   *
   * Теперь у каждого своя карточка: что это, что будет и чем заплатишь.
   * Ловушка исключение — она на то и ловушка, что срабатывает сама.
   */
  defineInteraction({
    id: 'floor-event',
    /*
     * Окно показывается всегда, даже когда действие одно.
     *
     * Обычно единственное действие выполняется сразу — окно над одной кнопкой
     * лишний экран. Здесь наоборот: весь смысл в том, чтобы игрок прочитал,
     * что это и чем кончится, прежде чем трогать. Иван: «почему мы не можем
     * нормальную модалку сделать для всех таких случаев, чтобы игра объясняла,
     * что происходит».
     */
    confirm: true,
    command: 'floor-event',
    matches: (target) => target?.kind === 'event'
      && typeof target.id === 'string'
      && typeof target.icon === 'string'
      && typeof target.action === 'string',
    present: ({ target, copy }) => {
      const запись = copy.events[target.id];
      if (!запись) throw new TypeError(`No card for event ${target.id}`);
      return {
        name: запись.name,
        description: запись.line(target.value),
        icon: target.icon,
        accent: target.accent ?? '#8fb0c2',
        actions: [{ id: target.action, enabled: target.enabled !== false, hint: target.hint ?? '' }],
      };
    },
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
    confirm: true,
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
      actions: [{ id: target.open ? 'close' : 'open' }],
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
    present: ({ target, copy }) => ({
      name: copy.trapName,
      description: copy.trapInspected(
        ['I', 'II', 'III'][target.tier - 1],
        target.canDisarm ? copy.trapReady : target.unavailable,
      ),
      icon: 'dngn/traps/blade.png',
      accent: target.canDisarm ? '#8eaa9a' : '#c59663',
      actions: [
        { id: 'disarm', enabled: target.canDisarm, hint: target.canDisarm ? '' : target.unavailable },
      ],
    }),
  }),
  defineInteraction({
    id: 'chest',
    command: 'find-interact',
    matches: (target) => target?.kind === 'find' && target.id === 'sealed-cache',
    present: ({ target, actor, language }) => {
      const chest = chestContextPresentation({ find: target, actor, language });
      if (!chest) throw new TypeError('Invalid chest target');
      return chest;
    },
  }),
  defineInteraction({
    id: 'crystal-vein',
    command: 'find-interact',
    /*
     * Сначала объяснить, потом сделать.
     *
     * Единственное действие исполнялось от касания, и окно игрок не видел
     * вовсе: подошёл к саркофагу, нажал — и получил золото пополам с раной,
     * не поняв, за что. Иван: «когда мы с ним взаимодействуем, нам не сразу
     * что-то даётся, а мы видим модалку, которая объясняет, что это и что оно
     * даёт». Дверь и сундук остаются мгновенными — там нечего объяснять.
     */
    confirm: true,
    matches: (target) => validFind(target, 'crystal-vein'),
    present: ({ copy }) => ({
      name: copy.crystalName,
      description: copy.crystalInspected,
      icon: 'item/misc/misc_crystal.png',
      accent: '#7fc8d2',
      actions: [{ id: 'extract' }],
    }),
  }),
  defineInteraction({
    id: 'buried-stash',
    command: 'find-interact',
    confirm: true,
    matches: (target) => validFind(target, 'buried-stash'),
    present: ({ copy }) => ({
      name: copy.stashName,
      description: copy.stashInspected,
      icon: 'item/gold/07.png',
      accent: '#d8bf68',
      actions: [{ id: 'dig' }],
    }),
  }),
  defineInteraction({
    id: 'forgotten-grave',
    command: 'find-interact',
    confirm: true,
    matches: (target) => validFind(target, 'forgotten-grave'),
    present: ({ copy }) => ({
      name: copy.graveName,
      description: copy.graveInspected,
      icon: 'dngn/vaults/sarcophagus_sealed.png',
      accent: '#b45c58',
      actions: [{ id: 'defile' }],
    }),
  }),
  // One generic entry serves every landmark (the fountain now, a rune later):
  // names, availability and hints come from the find catalog and its rolled
  // outcomes, so a new landmark is a catalog entry plus action vocabulary.
  defineInteraction({
    id: 'landmark',
    command: 'find-interact',
    matches: (target) => target?.kind === 'find' && isLandmarkFind(target),
    present: ({ target, actor, language }) => {
      const landmark = landmarkContextPresentation({ find: target, actor, language });
      if (!landmark) throw new TypeError('Invalid landmark target');
      return landmark;
    },
  }),
]);

export function interactionDefinitionFor(target) {
  return INTERACTION_REGISTRY.find(({ matches }) => matches(target)) ?? null;
}

/**
 * Окно взаимодействия: оно само и есть осмотр.
 *
 * Иван: «у каждого интерактивного предмета будет просто кнопка — подходишь к
 * стражнику, и его кнопка, без подписи; а дальше, когда нажимаешь, будет окно.
 * Надо убрать осмотр у дверей и тд». Половина текста пряталась за действием
 * «Осмотреть»: лишнее нажатие ради строки, которая и так должна была стоять в
 * окне. Теперь описание полное сразу, а кнопки остались только те, что
 * действительно что-то делают.
 *
 * Одно исключение — сундук, и оно не про текст. Там осмотр прячет, ловушечный
 * ли сундук, проклятый или мимик, и открывает отдельные действия: это выбор
 * между «вскрыть вслепую» и «сначала посмотреть», а не строка описания. Убрать
 * его — значит выдавать мимика даром.
 */
export function contextActionModel({ target, actor = {}, language = 'ru' } = {}) {
  const locale = language === 'en' ? 'en' : 'ru';
  const definition = interactionDefinitionFor(target);
  if (!definition) throw new TypeError('Context actions require a registered target');
  const view = definition.present({
    target,
    actor,
    language: locale,
    copy: COPY[locale],
  });
  const actions = view.actions.map((candidate) => commandAction(candidate, definition.command));
  const labelled = actions.map((action) => ({
    ...action,
    label: action.label ?? ACTION_COPY[locale][action.id],
  }));
  return Object.freeze({
    interactionId: definition.id,
    // Спрашивать ли, даже когда действие всего одно.
    confirm: definition.confirm === true,
    // Отвечать ли отказ строкой вместо окна.
    terse: definition.terse === true,
    name: view.name,
    description: view.description,
    icon: view.icon,
    accent: view.accent,
    triggerLabel: locale === 'ru' ? `Взаимодействовать: ${view.name}` : `Interact: ${view.name}`,
    closeLabel: locale === 'ru' ? 'Закрыть действия' : 'Close actions',
    // Most actions are a fixed verb from the table. A few — the hires — are
    // a row of a list and carry their own name and price with them.
    actions: Object.freeze(labelled.map((action) => Object.freeze({ ...action }))),
  });
}
