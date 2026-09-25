import { cellStepDistance } from './dcss-rpg-geometry.js';

/**
 * Ящик всегда заперт — разница только в том, что внутри.
 *
 * Треть сундуков открывалась касанием, а запертый можно было снести кувалдой:
 * при таком выборе ни ключ, ни отмычка, ни навык «Взлом» ничего не значили.
 * Иван: «убираем, что сундук можно разбить и открыть <...> сундуки можно
 * только взламывать». Теперь замок есть у каждого, и снаружи все ящики
 * одинаковы: ловушку, проклятие и зубы выдаёт только открытая крышка.
 */
export const CHEST_VARIANTS = Object.freeze([
  'locked',
  'trapped',
  'cursed',
  'mimic',
]);

export const CHEST_RESOURCE_IDS = Object.freeze({
  key: 'iron-key',
  lockpick: 'lockpick-set',
  masterKey: 'master-key',
});

export const CHEST_VISUAL_SKINS = Object.freeze([
  Object.freeze({
    id: 'wooden',
    frames: Object.freeze(Array.from(
      { length: 4 },
      (_, index) => `licensed/cmski-chests/wooden/${index + 1}.png`,
    )),
  }),
  Object.freeze({
    id: 'pharaoh',
    frames: Object.freeze(Array.from(
      { length: 4 },
      (_, index) => `licensed/cmski-chests/pharaoh/${index + 1}.png`,
    )),
  }),
  Object.freeze({
    id: 'pirate',
    frames: Object.freeze(Array.from(
      { length: 4 },
      (_, index) => `licensed/cmski-chests/pirate/${index + 1}.png`,
    )),
  }),
  Object.freeze({
    id: 'jade-ruby',
    frames: Object.freeze(Array.from(
      { length: 4 },
      (_, index) => `licensed/cmski-chests/jade-ruby/${index + 1}.png`,
    )),
  }),
]);

export const CHEST_DEFAULT_PATH = CHEST_VISUAL_SKINS[0].frames[0];
export const CHEST_ASSET_PATHS = Object.freeze(
  CHEST_VISUAL_SKINS.flatMap(({ frames }) => frames),
);

const CHEST_VISUAL_SKINS_BY_ID = new Map(
  CHEST_VISUAL_SKINS.map((skin) => [skin.id, skin]),
);

export function chestFramesForSkin(id) {
  return CHEST_VISUAL_SKINS_BY_ID.get(id)?.frames ?? null;
}

const COPY = Object.freeze({
  ru: Object.freeze({
    unlockedName: 'Сундук',
    lockedName: 'Запертый сундук',
    locked: (tier) => `Замок ${tier}.`,
    mimicAwake: 'Это мимик!',
    noKey: 'Нужен железный ключ',
    noLockpickSkill: (tier) => `Нужен навык «Взлом» ${tier}`,
    noLockpicks: (amount) => `Нужно отмычек: ${amount}`,
    noDisarmSkill: (tier) => `Нужен навык «Сапёр» ${tier}`,
    unsafe: 'Слишком опасно при таком здоровье',
    result: Object.freeze({
      open: 'Сундук открыт',
      'use-key': 'Ключ повернулся в замке',
      'master-key': 'Замок открылся сам',
      'pick-lock': 'Замок аккуратно вскрыт',
      disarm: 'Механизм обезврежен, сундук открыт',
      smash: 'Сундук разбит',
    }),
  }),
  en: Object.freeze({
    unlockedName: 'Chest',
    lockedName: 'Locked chest',
    locked: (tier) => `Lock ${tier}.`,
    mimicAwake: 'It is a mimic!',
    noKey: 'An iron key is required',
    noLockpickSkill: (tier) => `Lockpicking ${tier} required`,
    noLockpicks: (amount) => `Lockpicks required: ${amount}`,
    noDisarmSkill: (tier) => `Trap disarming ${tier} required`,
    unsafe: 'Too dangerous at this health',
    result: Object.freeze({
      open: 'Chest opened',
      'use-key': 'The key turned in the lock',
      'master-key': 'The lock opened by itself',
      'pick-lock': 'The lock was picked cleanly',
      disarm: 'Mechanism disarmed and chest opened',
      smash: 'Chest smashed',
    }),
  }),
});

function clampTier(value) {
  return Math.max(1, Math.min(3, value));
}

/**
 * How mean the chests on a floor are allowed to be.
 *
 * This used to be the floor number itself, so «tier three» began on floor
 * **three** and the nastiest table — the one with the mimic in it — was in force
 * for almost the whole run. Ivan met a mimic at the very start of a descent and
 * said what a mimic should be: rare, late and dangerous. It is the chapter that
 * measures pressure everywhere else in the game, so it measures it here too.
 */
const FLOORS_PER_PRESSURE_STEP = 6;

export function chestPressure(depth) {
  if (!Number.isInteger(depth) || depth < 1) return 1;
  return clampTier(Math.ceil(depth / FLOORS_PER_PRESSURE_STEP));
}

function stableHash(seed, depth, roomIndex, salt = 0) {
  let value = (seed ^ Math.imul(depth + 1, 0x9e3779b1) ^ Math.imul(roomIndex + 3, 0x85ebca6b) ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

export function chestVisualFrames({ seed = 0, depth, roomIndex, skinIds = null } = {}) {
  if (
    !Number.isInteger(seed)
    || seed < 0
    || !Number.isInteger(depth)
    || depth < 1
    || !Number.isInteger(roomIndex)
    || roomIndex < 0
  ) throw new TypeError('Chest visuals require stable floor data');
  const skins = skinIds == null
    ? CHEST_VISUAL_SKINS
    : Array.isArray(skinIds)
      ? skinIds.map((id) => CHEST_VISUAL_SKINS_BY_ID.get(id))
      : [];
  if (skins.length === 0 || skins.some((skin) => !skin)) {
    throw new TypeError('Chest visuals require known themed skin IDs');
  }
  const index = stableHash(seed >>> 0, depth, roomIndex, 0x43484553) % skins.length;
  return skins[index].frames;
}

function weightedVariant(roll, depth) {
  const pressure = chestPressure(depth);
  // No mimic in the first chapter at all. A creature that eats a hero for
  // opening a box has to be something the player has heard of before they meet
  // it, not the second thing that happens to them.
  //
  // Доля бывших незапертых ушла к простому запертому: ящик без начинки — это
  // по-прежнему самый частый ящик, просто теперь и он на замке.
  const tables = {
    1: [['locked', 66], ['trapped', 21], ['cursed', 13], ['mimic', 0]],
    2: [['locked', 48], ['trapped', 25], ['cursed', 21], ['mimic', 6]],
    3: [['locked', 38], ['trapped', 27], ['cursed', 21], ['mimic', 14]],
  };
  const table = tables[pressure];
  const span = table.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = roll % span;
  for (const [variant, weight] of table) {
    if (cursor < weight) return variant;
    cursor -= weight;
  }
  return 'locked';
}

/**
 * Chest identity uses its own stable hash instead of the shared find RNG. That
 * keeps rooms and later finds unchanged when new chest variants are added.
 */
export function createChestProfile({ seed = 0, depth, roomIndex, rewardGold } = {}) {
  if (
    !Number.isInteger(seed)
    || seed < 0
    || !Number.isInteger(depth)
    || depth < 1
    || !Number.isInteger(roomIndex)
    || roomIndex < 0
    || !Number.isInteger(rewardGold)
    || rewardGold < 1
  ) throw new TypeError('Chest profile requires stable floor data and reward');
  const hash = stableHash(seed >>> 0, depth, roomIndex);
  // Запертый ящик с обещанным артефактом внутри ничем не отличается от
  // прочих: даром больше не открывается ни один, и обещание не зависит от
  // того, что выпало.
  const cacheVariant = weightedVariant(hash, depth);
  /*
   * Замок крепнет с главой, а не с этажом.
   *
   * Был номер этажа, обрезанный до трёх: с третьего этажа каждый замок
   * требовал третьего ранга взлома, ранги 1 и 2 умирали на втором этаже, и
   * без мастерства герой открывал один сундук из десяти (аудит забега). Злость
   * самих ящиков давно меряется главой — так же теперь и замок: первый ранг
   * открывает первую главу, второй — вторую, третий — всё.
   */
  const tier = chestPressure(depth);
  const rewardMultipliers = {
    locked: 1.3,
    trapped: 1.45,
    cursed: 1.6,
    mimic: 1.8,
  };
  const hazardBase = 5 + depth * 4 + (stableHash(seed >>> 0, depth, roomIndex, 0x48415a44) % 5);
  const curseEffectId = cacheVariant === 'cursed'
    ? stableHash(seed >>> 0, depth, roomIndex, 0x43555253) % 2
      ? 'poison'
      : 'chilled'
    : null;
  return Object.freeze({
    cacheVariant,
    // Замок есть у всякого ящика — и у того, что кусается тоже.
    lockTier: tier,
    trapTier: cacheVariant === 'trapped' ? tier : 0,
    hazardDamage: ['trapped', 'cursed', 'mimic'].includes(cacheVariant) ? hazardBase : 0,
    rewardGold: Math.max(1, Math.round(rewardGold * rewardMultipliers[cacheVariant])),
    curseEffectId,
    curseDuration: cacheVariant === 'cursed' ? 4 + Math.min(6, depth) : 0,
  });
}

export function isChestFind(find) {
  const structurallyValid = Boolean(
    find
    && find.id === 'sealed-cache'
    && CHEST_VARIANTS.includes(find.cacheVariant)
    && Number.isInteger(find.lockTier)
    && find.lockTier >= 0
    && find.lockTier <= 3
    && Number.isInteger(find.trapTier)
    && find.trapTier >= 0
    && find.trapTier <= 3
    && Number.isInteger(find.hazardDamage)
    && find.hazardDamage >= 0
    && Number.isInteger(find.rewardGold)
    && find.rewardGold >= 1
    && (find.curseEffectId === null || ['poison', 'chilled'].includes(find.curseEffectId))
    && Number.isInteger(find.curseDuration)
    && find.curseDuration >= 0
    && find.curseDuration <= 10
  );
  if (!structurallyValid) return false;
  if (find.lockTier < 1) return false;
  if ((find.cacheVariant === 'trapped') !== (find.trapTier >= 1)) return false;
  if ((find.cacheVariant === 'cursed') !== (find.curseEffectId !== null && find.curseDuration > 0)) return false;
  const hazardous = ['trapped', 'cursed', 'mimic'].includes(find.cacheVariant);
  return hazardous ? find.hazardDamage >= 1 : find.hazardDamage === 0;
}

function normalizedActor(actor = {}) {
  const resources = actor.resources ?? {};
  const capabilities = actor.capabilities ?? {};
  return {
    keyCount: Number.isInteger(resources.keyCount) && resources.keyCount >= 0 ? resources.keyCount : 0,
    // Ключ от всех сундуков носят, а не тратят: он либо есть, либо нет.
    masterKey: resources.masterKey === true,
    lockpickCount: Number.isInteger(resources.lockpickCount) && resources.lockpickCount >= 0
      ? resources.lockpickCount
      : 0,
    lockpickTier: Number.isInteger(capabilities.lockpickTier) && capabilities.lockpickTier >= 0
      ? Math.min(3, capabilities.lockpickTier)
      : 0,
    trapDisarmTier: Number.isInteger(capabilities.trapDisarmTier) && capabilities.trapDisarmTier >= 0
      ? Math.min(3, capabilities.trapDisarmTier)
      : 0,
  };
}

/*
 * Одна отмычка на сундук — всегда.
 *
 * Прежде первый ранг Взлома ломал две отмычки, а второй и третий — одну.
 * Иван после игры: «одна отмычка на сундук, всегда». Ранг решает, какой
 * замок поддаётся, а не сколько железа уходит на каждый.
 */
export function lockpickCost(lockpickTier) {
  if (!Number.isInteger(lockpickTier) || lockpickTier < 1 || lockpickTier > 3) return 0;
  return 1;
}

function action(id, enabled = true, hint = '') {
  return Object.freeze({ id, enabled, hint });
}

export function chestActionRules({ find, actor } = {}) {
  if (!isChestFind(find)) throw new TypeError('Chest actions require a generated chest');
  const access = normalizedActor(actor);
  const locale = actor?.language === 'en' ? 'en' : 'ru';
  const copy = COPY[locale];
  /*
   * Ящик отпирают, а не изучают.
   *
   * Внутрь ведут два пути — железный ключ и отмычка, — и оба чего-то стоят.
   * Кувалда была третьим и бесплатным: она обесценивала и ключи, и навык.
   * Что внутри — ловушка, проклятие или зубы — выясняется только после того,
   * как замок поддался, поэтому список действий у всех ящиков одинаков.
   */
  const actions = [];
  // Ключ от всех сундуков отпирает любой замок и не расходуется. Пока он в
  // сумке, ни отмычки, ни железные ключи не нужны — и список это показывает.
  if (access.masterKey) {
    actions.push(action('master-key'));
    return Object.freeze({ access: Object.freeze(access), actions: Object.freeze(actions) });
  }
  actions.push(action('use-key', access.keyCount > 0, access.keyCount > 0 ? '' : copy.noKey));
  const requiredTier = find.lockTier;
  const cost = lockpickCost(access.lockpickTier);
  const skilled = access.lockpickTier >= requiredTier;
  const enoughPicks = access.lockpickCount >= cost;
  actions.push(action(
    'pick-lock',
    skilled && enoughPicks,
    !skilled ? copy.noLockpickSkill(requiredTier) : enoughPicks ? '' : copy.noLockpicks(cost),
  ));
  return Object.freeze({ access: Object.freeze(access), actions: Object.freeze(actions) });
}

export function chestContextPresentation({ find, actor, language = 'ru' } = {}) {
  if (!isChestFind(find)) return null;
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = COPY[locale];
  if (find.containerOpened === true) {
    return Object.freeze({
      name: find.containerDestroyed ? copy.result.smash : copy.unlockedName,
      description: '',
      icon: typeof find.icon === 'string' && find.icon.length > 0
        ? find.icon
        : CHEST_DEFAULT_PATH,
      accent: find.containerDestroyed ? '#a56c55' : '#d9bd67',
      actions: Object.freeze([action('browse')]),
    });
  }
  const rules = chestActionRules({ find, actor: { ...actor, language: locale } });
  // Нетронутый ящик всегда один и тот же запертый ящик: ловушку, проклятие и
  // зубы выдаёт только открытая крышка, а не имя и не цвет карточки.
  return Object.freeze({
    name: copy.lockedName,
    description: copy.locked(find.lockTier),
    icon: typeof find.icon === 'string' && find.icon.length > 0
      ? find.icon
      : CHEST_DEFAULT_PATH,
    accent: '#d9bd67',
    actions: Object.freeze([...rules.actions]),
  });
}

const rejected = (reason) => Object.freeze({ ok: false, reason });

export function resolveChestInteraction({
  find,
  resolvedFindIds,
  runStatus,
  hero,
  gold,
  action: actionId,
  actor,
} = {}) {
  if (
    !isChestFind(find)
    || typeof find.instanceId !== 'string'
    || !/^find-\d+-\d+$/.test(find.instanceId)
    || !Number.isInteger(find.x)
    || !Number.isInteger(find.y)
    || !Array.isArray(resolvedFindIds)
    || resolvedFindIds.some((id) => typeof id !== 'string')
    || !hero
    || !Number.isInteger(hero.x)
    || !Number.isInteger(hero.y)
    || !Number.isFinite(hero.hp)
    || !Number.isFinite(hero.power)
    || !Number.isFinite(gold)
    || typeof actionId !== 'string'
  ) return rejected('invalid');
  if (runStatus !== 'playing' || hero.hp <= 0) return rejected('inactive');
  if (resolvedFindIds.includes(find.instanceId)) return rejected('resolved');
  if (cellStepDistance(hero, find) > 1) return rejected('distance');
  const rules = chestActionRules({ find, actor });
  const selected = rules.actions.find(({ id }) => id === actionId);
  if (!selected) return rejected('action');
  if (!selected.enabled) {
    if (actionId === 'use-key') return rejected('key-required');
    if (actionId === 'pick-lock') {
      return rejected(rules.access.lockpickTier < find.lockTier ? 'lockpick-skill-required' : 'lockpicks-required');
    }
    return rejected('unavailable');
  }

  /*
   * Ловушку снимает умение, а не отдельная кнопка.
   *
   * Кнопка «Обезвредить» на нетронутом ящике сама же и выдавала, что он с
   * ловушкой, — а игру просили сделать простой: ящик открывают, и дальше он
   * либо кусает, либо нет. Умение при этом не обесценилось: кто разбирается в
   * механизмах, снимает крышку, а не получает по рукам. Просто теперь это
   * видно по итогу, а не по лишней кнопке.
   */
  const defused = find.cacheVariant === 'trapped'
    && rules.access.trapDisarmTier >= find.trapTier;
  // Замок поддался — крышка поднята, и дальше решает только то, что внутри.
  let damage = 0;
  if (find.cacheVariant === 'trapped' && !defused) damage = find.hazardDamage;
  if (find.cacheVariant === 'cursed') damage = find.hazardDamage;
  if (find.cacheVariant === 'mimic') damage = find.hazardDamage;
  if (damage >= hero.hp) return rejected('unsafe');

  const awakensMimic = find.cacheVariant === 'mimic' && typeof find.mimicMonsterId === 'string';
  // Добычу больше нечем испортить: кувалды нет, а замок ничего не ломает.
  const rewardGold = awakensMimic ? 0 : find.rewardGold;
  const status = find.cacheVariant === 'cursed'
    ? Object.freeze({ id: find.curseEffectId, duration: find.curseDuration })
    : null;
  const consumed = [];
  if (actionId === 'use-key') consumed.push(Object.freeze({ id: CHEST_RESOURCE_IDS.key, amount: 1 }));
  if (actionId === 'pick-lock') {
    consumed.push(Object.freeze({ id: CHEST_RESOURCE_IDS.lockpick, amount: lockpickCost(rules.access.lockpickTier) }));
  }
  // Ключ от всех сундуков не тратится: он и есть награда за то, что его нашли.
  return Object.freeze({
    ok: true,
    action: actionId,
    variant: find.cacheVariant,
    defused,
    damage,
    rewardGold,
    destroyedGold: 0,
    deferredRewardGold: awakensMimic ? find.rewardGold : 0,
    rewardPower: 0,
    noise: awakensMimic ? 8 : 0,
    status,
    activatedMonsterIds: Object.freeze(awakensMimic ? [find.mimicMonsterId] : []),
    struckMonsterIds: Object.freeze([]),
    consumed: Object.freeze(consumed),
    state: Object.freeze({
      hero: Object.freeze({ ...hero, hp: hero.hp - damage }),
      gold: gold + rewardGold,
      resolvedFindIds: Object.freeze([...resolvedFindIds, find.instanceId]),
    }),
  });
}

export function chestResultPresentation(result, language = 'ru') {
  const copy = COPY[language === 'en' ? 'en' : 'ru'];
  if (result?.reason === 'unsafe') return Object.freeze({ message: '', unsafe: copy.unsafe });
  if (!result?.ok) return null;
  return Object.freeze({
    message: result.variant === 'mimic'
      ? copy.mimicAwake
      : result.defused
        ? copy.result.disarm
        : copy.result[result.action] ?? copy.result.open,
    unsafe: copy.unsafe,
  });
}
