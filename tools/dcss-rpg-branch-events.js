/**
 * The thing that only happens on one road.
 *
 * Every road now has its own tiles, its own monsters and its own mouth. What
 * it did not have was its own *event*: whichever branch you walked, the same
 * three landmarks — altar, fountain, rune — turned up on the floor, so the
 * catacombs and hell offered the player exactly the same three bargains as
 * floor two of the descent. Ivan: «С какими-нибудь уникальными событиями».
 *
 * So each road keeps one landmark nobody else has. They are written in the
 * game's existing grammar — a landmark is a picture on the floor and a small
 * set of rolled outcomes — but the bargain is shaped differently every time,
 * and that shape is the road's character:
 *
 * - **Поверхность** mends you for free and punishes greed with thorns: the
 *   gentle road is gentle here too.
 * - **Спуск** is about the diggers who came before — it heals, it takes
 *   payment, and toppling it is heard down the whole shaft.
 * - **Хранилища** pay better than anywhere else in the game, for gold or for
 *   blood. Everything in the vaults is a transaction.
 * - **Катакомбы** offer only two choices instead of three. There is no middle
 *   way with the dead: pay for their peace, or take what is theirs.
 * - **Ад** is the only landmark in the game that cannot heal anyone. Three
 *   choices, none of them safe. That is the whole difference between hell and
 *   a hard floor.
 *
 * The shapes are exported raw and run through the finds module's own
 * `defineFind`, so everything downstream — asset preloading, the context card,
 * the outcome summary with real numbers, save validation — works on them
 * without knowing they are branch-locked at all.
 */

/**
 * A landmark that belongs to one road. `branch` locks where it can appear;
 * `weight` is how often it wins the floor against the three generic ones, so
 * a road's own landmark lands on about half its floors rather than a quarter.
 */
const BRANCH_EVENT_WEIGHT = 3;

const branchEvent = (definition) => ({
  category: 'choice',
  wave: 'landmark',
  weight: BRANCH_EVENT_WEIGHT,
  size: 72,
  screenOffsetY: -9,
  ...definition,
});

export const BRANCH_EVENTS = Object.freeze([
  branchEvent({
    id: 'wild-shrine',
    branch: 'surface',
    // A stone disc swallowed by vine and flower: the only landmark that is
    // alive, on the only road with a sky over it.
    path: 'dngn/altars/fedhas.png',
    color: '#7fb861',
    glyph: '☘',
    light: Object.freeze({ color: '#86b063', radius: 1.8, beam: false }),
    outcomes: [
      { id: 'tend', roll: () => ({ healRatio: 0.35 }) },
      {
        id: 'graft',
        roll: (depth, rng) => ({
          costGold: 8 + depth * 3 + rng.int(0, 3),
          rewardMaxHp: 5 + depth,
        }),
      },
      {
        id: 'uproot',
        roll: (depth, rng) => ({
          rewardGold: 12 + depth * 4 + rng.int(0, 5),
          damage: 4 + depth * 2 + rng.int(0, 2),
          status: { id: 'poison', duration: 4 + Math.min(6, depth) },
          noise: 5,
        }),
      },
    ],
    copy: {
      ru: {
        name: 'Дикое святилище',
        summary: 'Камень, заросший лозой и цветом. Здесь всё ещё живо.',
        action: 'Подойти к святилищу',
        inspected: 'Цветы распустились сами — без солнца и без ухода.',
        unsafe: 'Слишком опасно при таком здоровье',
        nothingToHeal: 'Нечего лечить',
        goldRequired: 'Нужно',
        result: 'Святилище ответило герою',
        results: {
          tend: 'Зелень затянула раны героя',
          graft: 'Черенок прижился, герой стал выносливее',
          uproot: 'Корни вырваны, шипы отравили героя',
        },
      },
      en: {
        name: 'Wild shrine',
        summary: 'A stone swallowed by vine and blossom. It is still alive.',
        action: 'Approach the shrine',
        inspected: 'A slab under the vines. The flowers on it opened by themselves.',
        unsafe: 'Too dangerous at this health',
        nothingToHeal: 'Nothing to heal',
        goldRequired: 'Needs',
        result: 'The shrine answered the hero',
        results: {
          tend: 'The green growth closed the hero’s wounds',
          graft: 'The cutting took root and the hero grew hardier',
          uproot: 'The roots came out and the thorns poisoned the hero',
        },
      },
    },
  }),
  branchEvent({
    id: 'strangers-idol',
    branch: 'deep',
    // Someone dug this shaft before the hero did, and left this behind.
    path: 'dngn/statues/orcish_idol.png',
    color: '#d0913f',
    glyph: 'ᛒ',
    light: Object.freeze({ color: '#c08442', radius: 1.7, beam: false }),
    outcomes: [
      { id: 'heed', roll: (depth) => ({ heal: 6 + depth, cleanse: true }) },
      {
        id: 'feed',
        roll: (depth, rng) => ({
          costGold: 10 + depth * 3 + rng.int(0, 4),
          rewardPower: 1,
        }),
      },
      {
        id: 'topple',
        roll: (depth, rng) => ({
          rewardGold: 16 + depth * 5 + rng.int(0, 6),
          damage: 5 + depth * 2 + rng.int(0, 3),
          noise: 11,
        }),
      },
    ],
    copy: {
      ru: {
        name: 'Чужой идол',
        summary: 'Грубый истукан тех, кто рыл здесь до тебя.',
        action: 'Подойти к идолу',
        inspected: 'Истукан вырублен наспех. У подножия — стёртые следы чужих ладоней.',
        unsafe: 'Слишком опасно при таком здоровье',
        nothingToHeal: 'Нечего лечить',
        goldRequired: 'Нужно',
        result: 'Идол ответил герою',
        results: {
          heed: 'Идол снял с героя чужую хворь',
          feed: 'Подношение принято, рука героя стала твёрже',
          topple: 'Идол рухнул, и ствол услышал это до самого низа',
        },
      },
      en: {
        name: 'A stranger’s idol',
        summary: 'The rough idol of whoever dug here first.',
        action: 'Approach the idol',
        inspected: 'The idol was cut in a hurry. Worn handprints ring its base.',
        unsafe: 'Too dangerous at this health',
        nothingToHeal: 'Nothing to heal',
        goldRequired: 'Needs',
        result: 'The idol answered the hero',
        results: {
          heed: 'The idol lifted another’s sickness off the hero',
          feed: 'The offering was taken and the hero’s hand grew steadier',
          topple: 'The idol went over and the shaft heard it all the way down',
        },
      },
    },
  }),
  branchEvent({
    id: 'golden-idol',
    branch: 'vaults',
    // Cast gold with a cup held up. Everything in the vaults is a transaction,
    // and this one pays better than anything else in the game — either way.
    path: 'dngn/vaults/golden_statue_2.png',
    color: '#e6c05a',
    glyph: '⚱',
    light: Object.freeze({ color: '#d8b451', radius: 1.9, beam: false }),
    outcomes: [
      { id: 'bow', roll: () => ({ healRatio: 0.3, cleanse: true }) },
      {
        id: 'tribute',
        roll: (depth, rng) => ({
          costGold: 26 + depth * 6 + rng.int(0, 6),
          rewardMaxHp: 8 + depth * 2,
          rewardPower: 1,
        }),
      },
      {
        id: 'pry',
        roll: (depth, rng) => ({
          rewardGold: 30 + depth * 8 + rng.int(0, 9),
          damage: 7 + depth * 3 + rng.int(0, 3),
          noise: 13,
        }),
      },
    ],
    copy: {
      ru: {
        name: 'Золотой истукан',
        summary: 'Литое золото с кубком в поднятой руке. В хранилищах всё — сделка.',
        action: 'Подойти к истукану',
        inspected: 'Золото литое, не накладное. Кубок в руке пуст уже очень давно.',
        unsafe: 'Слишком опасно при таком здоровье',
        nothingToHeal: 'Нечего лечить',
        goldRequired: 'Нужно',
        result: 'Истукан ответил герою',
        results: {
          bow: 'Поклон принят, истукан очистил и подлечил героя',
          tribute: 'Кубок наполнен золотом, герой стал крепче и сильнее',
          pry: 'Рука отломана, хранилище подняло тревогу',
        },
      },
      en: {
        name: 'The golden idol',
        summary: 'Cast gold with a cup held high. In the vaults everything is a bargain.',
        action: 'Approach the idol',
        inspected: 'Solid gold, not gilt. The cup in its hand has been empty a very long time.',
        unsafe: 'Too dangerous at this health',
        nothingToHeal: 'Nothing to heal',
        goldRequired: 'Needs',
        result: 'The idol answered the hero',
        results: {
          bow: 'The bow was accepted; the idol cleansed and mended the hero',
          tribute: 'The cup was filled and the hero grew hardier and stronger',
          pry: 'The arm came away and the vault raised the alarm',
        },
      },
    },
  }),
  branchEvent({
    id: 'named-grave',
    branch: 'crypt',
    // Two choices, not three. There is no middle way with the dead.
    path: 'dngn/altars/yredelemnul.png',
    color: '#8f6fb0',
    glyph: '✝',
    light: Object.freeze({ color: '#7d61a4', radius: 1.6, beam: false }),
    outcomes: [
      {
        id: 'kneel',
        roll: (depth, rng) => ({
          costGold: 12 + depth * 3 + rng.int(0, 4),
          healRatio: 0.45,
          cleanse: true,
        }),
      },
      {
        id: 'rob',
        roll: (depth, rng) => ({
          rewardGold: 22 + depth * 6 + rng.int(0, 7),
          damage: 8 + depth * 3 + rng.int(0, 3),
          status: { id: 'poison', duration: 6 + Math.min(8, depth) },
          noise: 10,
        }),
      },
    ],
    copy: {
      ru: {
        name: 'Надгробие с именем',
        summary: 'Плита, на которой ещё читается имя. Середины с мёртвыми не бывает.',
        action: 'Подойти к надгробию',
        inspected: 'Буквы стёрлись не все. Имя читается, даты — нет.',
        unsafe: 'Слишком опасно при таком здоровье',
        nothingToHeal: 'Нечего лечить',
        goldRequired: 'Нужно',
        result: 'Надгробие ответило герою',
        results: {
          kneel: 'Плата за покой принята, мёртвый отпустил героя',
          rob: 'Могила вскрыта, трупный яд достался вместе с золотом',
        },
      },
      en: {
        name: 'A named gravestone',
        summary: 'A slab with a name still legible on it. There is no middle way with the dead.',
        action: 'Approach the gravestone',
        inspected: 'Not every letter is gone. The name can be read; the dates cannot.',
        unsafe: 'Too dangerous at this health',
        nothingToHeal: 'Nothing to heal',
        goldRequired: 'Needs',
        result: 'The gravestone answered the hero',
        results: {
          kneel: 'The price of peace was taken and the dead let the hero go',
          rob: 'The grave was opened and its rot came up with the gold',
        },
      },
    },
  }),
  branchEvent({
    id: 'stone-face',
    branch: 'hell',
    // The only landmark in the game with no healing anywhere in it. Three
    // choices, none of them safe: that is what makes hell hell rather than
    // a floor with bigger numbers.
    path: 'dngn/altars/xom5.png',
    color: '#c46a58',
    glyph: '◑',
    light: Object.freeze({ color: '#b4543f', radius: 2, beam: false }),
    outcomes: [
      {
        id: 'listen',
        roll: (depth, rng) => ({
          rewardGold: 10 + depth * 4 + rng.int(0, 5),
          noise: 14,
        }),
      },
      {
        id: 'swear',
        roll: (depth, rng) => ({
          costGold: 30 + depth * 7 + rng.int(0, 8),
          rewardPower: 2,
          status: { id: 'burning', duration: 5 + Math.min(6, depth) },
        }),
      },
      {
        id: 'defy',
        roll: (depth, rng) => ({
          damage: 12 + depth * 4 + rng.int(0, 4),
          rewardMaxHp: 12 + depth * 3,
        }),
      },
    ],
    copy: {
      ru: {
        name: 'Лик в камне',
        summary: 'Каменное лицо в стене. Оно не лечит никого.',
        action: 'Подойти к лику',
        inspected: 'Губы каменные, а двигаются. Смотрит оно не на героя, а сквозь него.',
        unsafe: 'Слишком опасно при таком здоровье',
        nothingToHeal: 'Нечего лечить',
        goldRequired: 'Нужно',
        result: 'Лик ответил герою',
        results: {
          listen: 'Лик сказал, где лежит золото, — и сказал это вслух',
          swear: 'Клятва принята, герой горит и бьёт сильнее',
          defy: 'Дерзость стоила крови, но герой стал живучее',
        },
      },
      en: {
        name: 'The face in the stone',
        summary: 'A stone face in the wall. It heals no one.',
        action: 'Approach the face',
        inspected: 'The lips are stone and they move. It is not looking at the hero but through them.',
        unsafe: 'Too dangerous at this health',
        nothingToHeal: 'Nothing to heal',
        goldRequired: 'Needs',
        result: 'The face answered the hero',
        results: {
          listen: 'The face said where the gold lay, and said it aloud',
          swear: 'The oath was taken; the hero burns and strikes harder',
          defy: 'Defiance cost blood and left the hero harder to kill',
        },
      },
    },
  }),
]);

export const BRANCH_EVENT_IDS = Object.freeze(BRANCH_EVENTS.map(({ id }) => id));

/** The road a landmark belongs to, or null when it belongs to all of them. */
export function branchEventFor(branch) {
  return BRANCH_EVENTS.find((event) => event.branch === branch) ?? null;
}
