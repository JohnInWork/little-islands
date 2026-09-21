/**
 * Разговор с именным.
 *
 * Именные монстры в игре уже были и уже попадались — они молча нападали.
 * Иван: «идея с тем, что с тобой будет кто-то взаимодействовать, то есть
 * кто-то деньги просить, иначе он тебя побьёт, кто-то ещё что-то, кто-то может
 * артефакт предлагать — это круто, этого надо побольше». Здесь и живёт то, что
 * они говорят, и чем кончается каждый ответ.
 *
 * Два правила, от которых зависит, будет игра честной или нет:
 *
 * - **Разговор — это ход.** Пока герой не ответил, именной не нападает. Иван:
 *   «не делать так, что у игрока идеальный забег, но его убил очень сильный
 *   враг просто из ниоткуда». Поэтому у сильного всегда есть разговор, и в
 *   разговоре всегда есть выход, который не бой.
 * - **Отказ дорог, но не смертелен.** Отказавшись, герой получает драку, на
 *   которую сам согласился, — а не казнь.
 *
 * Модуль чистый: он считает цену, собирает реплики и говорит, что меняется.
 * Снимать оружие, списывать золото и злить монстра — дело адаптера.
 */

import { canRespec } from './dcss-rpg-respec.js';

/** Сколько мытарь просит за проход. Растёт с глубиной: наглость по чину. */
export function parleyTollPrice(depth) {
  if (!Number.isInteger(depth) || depth < 0) throw new TypeError('Toll needs a floor depth');
  return 30 + depth * 12;
}

/** Сколько платит тот, кто покупает, а не отнимает. Заметно больше мытаря. */
export function parleyRewardGold(depth) {
  if (!Number.isInteger(depth) || depth < 0) throw new TypeError('Reward needs a floor depth');
  return 60 + depth * 18;
}

/** Насколько лечит благословение того, кого не тронули. */
export function parleyBlessingHeal(depth) {
  if (!Number.isInteger(depth) || depth < 0) throw new TypeError('Blessing needs a floor depth');
  return 20 + depth * 4;
}

/** Сколько просит тот, кто продаёт не глядя. Дороже мытаря: товар всё-таки. */
export function parleyWaresPrice(depth) {
  if (!Number.isInteger(depth) || depth < 0) throw new TypeError('Wares need a floor depth');
  return 120 + depth * 24;
}

/**
 * Бросок, который нельзя перебросить.
 *
 * Слепая покупка и пари решаются жребием, и жребий обязан быть один и тот же
 * при каждой загрузке: иначе игрок просто сохранится, купит, посмотрит и
 * перезагрузится, пока не выпадет хорошее. Тогда выбора нет — есть процедура.
 * Поэтому бросок выводится из сида забега, глубины и того, кто спрашивает.
 */
export function parleyRoll(seed, depth, monsterId) {
  if (!Number.isInteger(seed) || seed < 0) throw new TypeError('Parley roll needs a run seed');
  if (!Number.isInteger(depth) || depth < 0) throw new TypeError('Parley roll needs a floor depth');
  let value = (seed ^ Math.imul(depth + 1, 0x9e3779b1)) >>> 0;
  for (const code of String(monsterId)) {
    value = Math.imul(value ^ code.codePointAt(0), 0x85ebca6b) >>> 0;
  }
  value = Math.imul(value ^ (value >>> 15), 0xc2b2ae35) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

/** Что продаёт Эустахио, когда продаёт настоящее, и что — когда нет. */
export const PARLEY_WARES = Object.freeze({
  real: Object.freeze(['regeneration-ring', 'warding-ring', 'might-charm', 'vitality-amulet']),
  junk: 'blank-codex',
});

/** Что достаётся выигравшему пари. */
export const PARLEY_BET_PRIZE = 'mystery-potion';

const COPY = Object.freeze({
  ru: Object.freeze({
    'blork-the-orc': Object.freeze({
      name: 'Блорк Орк',
      line: 'Дорога моя. Плати или ложись.',
      pay: (price) => `Заплатить ${price}{gold}`,
      refuse: 'Отказать',
      poor: (price) => `Нужно ${price}{gold}`,
      paid: 'Блорк пересчитывает монеты и уходит с дороги.',
      refused: 'Блорк сплёвывает и берётся за дубину.',
    }),
    urug: Object.freeze({
      name: 'Уруг',
      line: 'Хорошее у тебя железо. Отдай.',
      give: (weapon) => `Отдать: ${weapon}`,
      fight: 'Драться',
      empty: 'В руках пусто',
      gave: (weapon) => `Уруг забирает ${weapon} и уходит довольный.`,
      refused: 'Уруг решает взять железо вместе с рукой.',
    }),
    'saint-roka': Object.freeze({
      name: 'Святой Рока',
      line: 'Иди своей дорогой, и я пойду своей.',
      leave: 'Разойтись миром',
      attack: 'Напасть',
      left: (heal) => `Рока поднимает руку вслед. Раны затягиваются: +${heal}{heal}`,
      attacked: 'Рока опускает булаву. Больше он не разговаривает.',
    }),
    'crazy-yiuf': Object.freeze({
      name: 'Безумный Юф',
      line: 'В какой руке камушек? Угадаешь — отдам хорошее.',
      left: 'Левая',
      right: 'Правая',
      away: 'Не играть',
      won: 'Юф разжимает ладонь и, ворча, отдаёт обещанное.',
      lost: 'Камушек был в другой. Юф перестаёт улыбаться.',
      walked: 'Юф пожимает плечами и убирает руки за спину.',
    }),
    eustachio: Object.freeze({
      name: 'Эустахио',
      line: 'Вещь. Хорошая. Не спрашивай откуда и не проси посмотреть.',
      buy: (price) => `Купить за ${price}{gold}`,
      pass: 'Пройти мимо',
      poor: (price) => `Нужно ${price}{gold}`,
      good: 'Под тряпкой оказалось настоящее. Эустахио уже далеко.',
      bad: 'Под тряпкой пустая книжица. Эустахио уже далеко.',
      passed: 'Эустахио пожимает плечами и заворачивает тряпку обратно.',
    }),
    fannar: Object.freeze({
      name: 'Фаннар',
      line: 'Могу вернуть тебе твой выбор. За плату.',
      forget: (price) => `Забыть выученное · ${price}{gold}`,
      leave: 'Оставить как есть',
      poor: (price) => `Нужно ${price}{gold}`,
      nothing: 'Забывать пока нечего',
      done: 'Фаннар кладёт ладонь на лоб, и выученное осыпается. Очки снова твои.',
      kept: 'Фаннар кивает: значит, всё было выбрано верно.',
    }),
    gastronok: Object.freeze({
      name: 'Гастроном',
      line: 'Съесть бы. Заплачу, у меня есть.',
      feed: (gold) => `Накормить · +${gold}{gold}`,
      deny: 'Не дать',
      empty: 'Нечем кормить',
      fed: (gold) => `Улитка жуёт и расплачивается: +${gold}{gold}`,
      denied: 'Улитка смотрит вслед так, что становится совестно.',
    }),
  }),
  en: Object.freeze({
    'blork-the-orc': Object.freeze({
      name: 'Blork the orc',
      line: 'My road. Pay up or lie down.',
      pay: (price) => `Pay ${price}{gold}`,
      refuse: 'Refuse',
      poor: (price) => `Needs ${price}{gold}`,
      paid: 'Blork counts the coins and steps off the road.',
      refused: 'Blork spits and reaches for his club.',
    }),
    urug: Object.freeze({
      name: 'Urug',
      line: 'Good iron you have. Hand it over.',
      give: (weapon) => `Hand over: ${weapon}`,
      fight: 'Fight',
      empty: 'Empty hands',
      gave: (weapon) => `Urug takes the ${weapon} and leaves, pleased.`,
      refused: 'Urug decides to take the iron with the arm attached.',
    }),
    'saint-roka': Object.freeze({
      name: 'Saint Roka',
      line: 'Go your way and I will go mine.',
      leave: 'Part in peace',
      attack: 'Attack',
      left: (heal) => `Roka raises a hand after you. Wounds close: +${heal}{heal}`,
      attacked: 'Roka lowers his mace. He is done talking.',
    }),
    'crazy-yiuf': Object.freeze({
      name: 'Crazy Yiuf',
      line: 'Which hand holds the pebble? Guess and it is yours.',
      left: 'Left',
      right: 'Right',
      away: 'Do not play',
      won: 'Yiuf opens his hand and grudgingly hands the prize over.',
      lost: 'The pebble was in the other one. Yiuf stops smiling.',
      walked: 'Yiuf shrugs and puts both hands behind his back.',
    }),
    eustachio: Object.freeze({
      name: 'Eustachio',
      line: 'A thing. A good one. Do not ask where from and do not ask to look.',
      buy: (price) => `Buy for ${price}{gold}`,
      pass: 'Walk on',
      poor: (price) => `Needs ${price}{gold}`,
      good: 'Under the rag it was the real thing. Eustachio is already gone.',
      bad: 'Under the rag, an empty little book. Eustachio is already gone.',
      passed: 'Eustachio shrugs and folds the rag back over it.',
    }),
    fannar: Object.freeze({
      name: 'Fannar',
      line: 'I can give your choice back. For a price.',
      forget: (price) => `Unlearn it all · ${price}{gold}`,
      leave: 'Leave it be',
      poor: (price) => `Needs ${price}{gold}`,
      nothing: 'Nothing to unlearn yet',
      done: 'Fannar lays a palm on your brow and the learning falls away. The points are yours again.',
      kept: 'Fannar nods: then it was all chosen well.',
    }),
    gastronok: Object.freeze({
      name: 'Gastronok',
      line: 'Could eat. I can pay, I have coin.',
      feed: (gold) => `Feed it · +${gold}{gold}`,
      deny: 'Refuse',
      empty: 'Nothing to feed it',
      fed: (gold) => `The snail chews and settles up: +${gold}{gold}`,
      denied: 'The snail watches you go in a way that stings.',
    }),
  }),
});

/**
 * Кто из именных разговаривает и о чём.
 *
 * `hostileOnRefusal` — злится ли он, если отказать. У мытаря и огра да: они
 * пришли за своим. У улитки нет — это шутка, а не засада, и убивать за отказ
 * покормить было бы не смешно.
 */
export const PARLEY_ENCOUNTERS = Object.freeze({
  'blork-the-orc': Object.freeze({ id: 'blork-the-orc', kind: 'toll', hostileOnRefusal: true }),
  urug: Object.freeze({ id: 'urug', kind: 'weapon', hostileOnRefusal: true }),
  'saint-roka': Object.freeze({ id: 'saint-roka', kind: 'passage', hostileOnRefusal: true }),
  gastronok: Object.freeze({ id: 'gastronok', kind: 'food', hostileOnRefusal: false }),
  // Проигранное пари — единственный случай, когда отказа не было, а драка есть:
  // Юф злится не на отказ, а на то, что его раскусили.
  'crazy-yiuf': Object.freeze({ id: 'crazy-yiuf', kind: 'bet', hostileOnRefusal: false }),
  eustachio: Object.freeze({ id: 'eustachio', kind: 'wares', hostileOnRefusal: false }),
  // Добрый: отказ его не задевает, и уходить ему тоже некуда — он бродит сам.
  fannar: Object.freeze({ id: 'fannar', kind: 'respec', hostileOnRefusal: false }),
});

export const PARLEY_IDS = Object.freeze(Object.keys(PARLEY_ENCOUNTERS));

export function parleyFor(monsterId) {
  return PARLEY_ENCOUNTERS[monsterId] ?? null;
}

const locale = (language) => (language === 'en' ? 'en' : 'ru');

/**
 * Что показать в окне разговора.
 *
 * Возвращает имя, реплику и список ответов. Недоступный ответ не исчезает, а
 * объясняется: «Нужно 90 монет» честнее, чем пустое место там, где у соседа
 * кнопка.
 */
export function parleyModel({
  monsterId,
  depth = 1,
  gold = 0,
  weaponName = '',
  foodCount = 0,
  skills = null,
  attributes = null,
  language = 'ru',
} = {}) {
  const encounter = parleyFor(monsterId);
  if (!encounter) throw new TypeError(`No parley for ${monsterId}`);
  if (!Number.isInteger(depth) || depth < 0) throw new TypeError('Parley needs a floor depth');
  const copy = COPY[locale(language)][monsterId];

  if (encounter.kind === 'toll') {
    const price = parleyTollPrice(depth);
    const canPay = Number.isFinite(gold) && gold >= price;
    return Object.freeze({
      id: monsterId,
      name: copy.name,
      line: copy.line,
      price,
      options: Object.freeze([
        Object.freeze({ id: 'pay', label: copy.pay(price), enabled: canPay, hint: canPay ? '' : copy.poor(price) }),
        Object.freeze({ id: 'refuse', label: copy.refuse, enabled: true, hint: '' }),
      ]),
    });
  }

  if (encounter.kind === 'weapon') {
    const armed = typeof weaponName === 'string' && weaponName.length > 0;
    return Object.freeze({
      id: monsterId,
      name: copy.name,
      line: copy.line,
      price: 0,
      options: Object.freeze([
        Object.freeze({
          id: 'give',
          label: armed ? copy.give(weaponName) : copy.give('—'),
          enabled: armed,
          hint: armed ? '' : copy.empty,
        }),
        Object.freeze({ id: 'refuse', label: copy.fight, enabled: true, hint: '' }),
      ]),
    });
  }

  if (encounter.kind === 'bet') {
    return Object.freeze({
      id: monsterId,
      name: copy.name,
      line: copy.line,
      price: 0,
      options: Object.freeze([
        Object.freeze({ id: 'left', label: copy.left, enabled: true, hint: '' }),
        Object.freeze({ id: 'right', label: copy.right, enabled: true, hint: '' }),
        Object.freeze({ id: 'refuse', label: copy.away, enabled: true, hint: '' }),
      ]),
    });
  }

  if (encounter.kind === 'wares') {
    const price = parleyWaresPrice(depth);
    const canPay = Number.isFinite(gold) && gold >= price;
    return Object.freeze({
      id: monsterId,
      name: copy.name,
      line: copy.line,
      price,
      options: Object.freeze([
        Object.freeze({ id: 'buy', label: copy.buy(price), enabled: canPay, hint: canPay ? '' : copy.poor(price) }),
        Object.freeze({ id: 'refuse', label: copy.pass, enabled: true, hint: '' }),
      ]),
    });
  }

  if (encounter.kind === 'respec') {
    const decision = canRespec({ skills, attributes, gold, source: 'sage' });
    return Object.freeze({
      id: monsterId,
      name: copy.name,
      line: copy.line,
      price: decision.price,
      options: Object.freeze([
        Object.freeze({
          id: 'forget',
          label: copy.forget(decision.price),
          enabled: decision.ok,
          hint: decision.reason === 'nothing-spent' ? copy.nothing
            : decision.reason === 'no-gold' ? copy.poor(decision.price) : '',
        }),
        Object.freeze({ id: 'refuse', label: copy.leave, enabled: true, hint: '' }),
      ]),
    });
  }

  if (encounter.kind === 'passage') {
    return Object.freeze({
      id: monsterId,
      name: copy.name,
      line: copy.line,
      price: 0,
      options: Object.freeze([
        Object.freeze({ id: 'leave', label: copy.leave, enabled: true, hint: '' }),
        Object.freeze({ id: 'refuse', label: copy.attack, enabled: true, hint: '' }),
      ]),
    });
  }

  const reward = parleyRewardGold(depth);
  const fed = Number.isInteger(foodCount) && foodCount > 0;
  return Object.freeze({
    id: monsterId,
    name: copy.name,
    line: copy.line,
    price: 0,
    options: Object.freeze([
      Object.freeze({ id: 'give', label: copy.feed(reward), enabled: fed, hint: fed ? '' : copy.empty }),
      Object.freeze({ id: 'refuse', label: copy.deny, enabled: true, hint: '' }),
    ]),
  });
}

/**
 * Чем кончился ответ.
 *
 * Возвращает только то, что меняется, — адаптер применяет. `leaves` значит,
 * что именной уходит с этажа: договорившись, он свою добычу получил, и стоять
 * у героя на пути ему больше незачем.
 */
export function resolveParley({
  monsterId,
  option,
  depth = 1,
  seed = 0,
  gold = 0,
  weaponName = '',
  foodCount = 0,
  skills = null,
  attributes = null,
  language = 'ru',
} = {}) {
  const encounter = parleyFor(monsterId);
  if (!encounter) throw new TypeError(`No parley for ${monsterId}`);
  const model = parleyModel({ monsterId, depth, gold, weaponName, foodCount, skills, attributes, language });
  const chosen = model.options.find(({ id }) => id === option);
  if (!chosen) throw new TypeError(`Unknown parley option ${option}`);
  const copy = COPY[locale(language)][monsterId];
  if (!chosen.enabled) return Object.freeze({ ok: false, reason: chosen.hint });

  if (encounter.kind === 'bet' && (option === 'left' || option === 'right')) {
    const выпало = parleyRoll(seed, depth, monsterId) < 0.5 ? 'left' : 'right';
    const угадал = option === выпало;
    return Object.freeze({
      ok: true,
      // Проигравший пари получает драку, на которую сам согласился, нажимая.
      hostile: !угадал,
      damageMultiplier: угадал ? 1 : 1.5,
      leaves: угадал,
      goldDelta: 0,
      heal: 0,
      takesWeapon: false,
      takesFood: false,
      grantsItemId: угадал ? PARLEY_BET_PRIZE : null,
      respec: false,
      message: угадал ? copy.won : copy.lost,
    });
  }

  if (option === 'forget') {
    return Object.freeze({
      ok: true,
      hostile: false,
      damageMultiplier: 1,
      // Он не торговец и никуда не уходит: побродит и останется на этаже.
      leaves: false,
      goldDelta: -model.price,
      heal: 0,
      takesWeapon: false,
      takesFood: false,
      grantsItemId: null,
      respec: true,
      message: copy.done,
    });
  }

  if (option === 'buy') {
    const бросок = parleyRoll(seed, depth, monsterId);
    const настоящее = бросок >= 0.5;
    const вещь = настоящее
      ? PARLEY_WARES.real[Math.min(
        PARLEY_WARES.real.length - 1,
        Math.floor((бросок - 0.5) * 2 * PARLEY_WARES.real.length),
      )]
      : PARLEY_WARES.junk;
    return Object.freeze({
      ok: true,
      hostile: false,
      damageMultiplier: 1,
      leaves: true,
      goldDelta: -model.price,
      heal: 0,
      takesWeapon: false,
      takesFood: false,
      grantsItemId: вещь,
      respec: false,
      message: настоящее ? copy.good : copy.bad,
    });
  }

  if (option === 'refuse') {
    return Object.freeze({
      ok: true,
      hostile: encounter.hostileOnRefusal,
      leaves: false,
      goldDelta: 0,
      heal: 0,
      takesWeapon: false,
      takesFood: false,
      grantsItemId: null,
      damageMultiplier: 1,
      respec: false,
      message: encounter.kind === 'passage' ? copy.attacked
        : encounter.kind === 'food' ? copy.denied
          : encounter.kind === 'bet' ? copy.walked
            : encounter.kind === 'wares' ? copy.passed
              : encounter.kind === 'respec' ? copy.kept
                : copy.refused,
    });
  }

  if (option === 'pay') {
    return Object.freeze({
      ok: true,
      hostile: false,
      leaves: true,
      goldDelta: -model.price,
      heal: 0,
      takesWeapon: false,
      takesFood: false,
      grantsItemId: null,
      damageMultiplier: 1,
      respec: false,
      message: copy.paid,
    });
  }

  if (option === 'leave') {
    const heal = parleyBlessingHeal(depth);
    return Object.freeze({
      ok: true,
      hostile: false,
      // Рока никуда не уходит: он и не мешал. Просто разговор окончен.
      leaves: false,
      goldDelta: 0,
      heal,
      takesWeapon: false,
      takesFood: false,
      grantsItemId: null,
      damageMultiplier: 1,
      respec: false,
      message: copy.left(heal),
    });
  }

  if (encounter.kind === 'weapon') {
    return Object.freeze({
      ok: true,
      hostile: false,
      leaves: true,
      goldDelta: 0,
      heal: 0,
      takesWeapon: true,
      takesFood: false,
      grantsItemId: null,
      damageMultiplier: 1,
      respec: false,
      message: copy.gave(weaponName),
    });
  }

  const reward = parleyRewardGold(depth);
  return Object.freeze({
    ok: true,
    hostile: false,
    leaves: true,
    goldDelta: reward,
    heal: 0,
    takesWeapon: false,
    takesFood: true,
    grantsItemId: null,
    damageMultiplier: 1,
    respec: false,
    message: copy.fed(reward),
  });
}
