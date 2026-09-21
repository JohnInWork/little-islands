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
    gastronok: Object.freeze({
      name: 'Гастроном',
      line: 'Съесть бы чего. Заплачу, у меня есть.',
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
  gold = 0,
  weaponName = '',
  foodCount = 0,
  language = 'ru',
} = {}) {
  const encounter = parleyFor(monsterId);
  if (!encounter) throw new TypeError(`No parley for ${monsterId}`);
  const model = parleyModel({ monsterId, depth, gold, weaponName, foodCount, language });
  const chosen = model.options.find(({ id }) => id === option);
  if (!chosen) throw new TypeError(`Unknown parley option ${option}`);
  const copy = COPY[locale(language)][monsterId];
  if (!chosen.enabled) return Object.freeze({ ok: false, reason: chosen.hint });

  if (option === 'refuse') {
    return Object.freeze({
      ok: true,
      hostile: encounter.hostileOnRefusal,
      leaves: false,
      goldDelta: 0,
      heal: 0,
      takesWeapon: false,
      takesFood: false,
      message: encounter.kind === 'passage' ? copy.attacked
        : encounter.kind === 'food' ? copy.denied
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
    message: copy.fed(reward),
  });
}
