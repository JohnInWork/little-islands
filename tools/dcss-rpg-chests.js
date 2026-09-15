export const CHEST_VARIANTS = Object.freeze([
  'unlocked',
  'locked',
  'trapped',
  'cursed',
  'mimic',
]);

export const CHEST_RESOURCE_IDS = Object.freeze({
  key: 'iron-key',
  lockpick: 'lockpick-set',
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
    genericName: 'Древний сундук',
    unlockedName: 'Сундук',
    lockedName: 'Запертый сундук',
    trappedName: 'Сундук с ловушкой',
    cursedName: 'Проклятый сундук',
    mimicName: 'Живой сундук',
    generic: '',
    unlockedClosed: 'Не заперт.',
    lockedClosed: 'Тяжёлый замок.',
    unlocked: 'Не заперт.',
    locked: (tier) => `Замок ${tier}.`,
    trapped: (tier) => `Механизм ${tier}.`,
    cursed: 'На крышке тёмная печать.',
    mimic: 'Сундук дышит.',
    mimicAwake: 'Это мимик!',
    noKey: 'Нужен железный ключ',
    noLockpickSkill: (tier) => `Нужен навык «Взлом» ${tier}`,
    noLockpicks: (amount) => `Нужно отмычек: ${amount}`,
    noDisarmSkill: (tier) => `Нужен навык «Сапёр» ${tier}`,
    unsafe: 'Слишком опасно при таком здоровье',
    result: Object.freeze({
      open: 'Сундук открыт',
      'use-key': 'Ключ повернулся в замке',
      'pick-lock': 'Замок аккуратно вскрыт',
      disarm: 'Механизм обезврежен, сундук открыт',
      smash: 'Сундук разбит',
      attack: 'Мимик пробудился',
    }),
  }),
  en: Object.freeze({
    genericName: 'Ancient chest',
    unlockedName: 'Chest',
    lockedName: 'Locked chest',
    trappedName: 'Trapped chest',
    cursedName: 'Cursed chest',
    mimicName: 'Living chest',
    generic: '',
    unlockedClosed: 'Unlocked.',
    lockedClosed: 'Heavy lock.',
    unlocked: 'Unlocked.',
    locked: (tier) => `Lock ${tier}.`,
    trapped: (tier) => `Mechanism ${tier}.`,
    cursed: 'A dark seal marks the lid.',
    mimic: 'The chest breathes.',
    mimicAwake: 'It is a mimic!',
    noKey: 'An iron key is required',
    noLockpickSkill: (tier) => `Lockpicking ${tier} required`,
    noLockpicks: (amount) => `Lockpicks required: ${amount}`,
    noDisarmSkill: (tier) => `Trap disarming ${tier} required`,
    unsafe: 'Too dangerous at this health',
    result: Object.freeze({
      open: 'Chest opened',
      'use-key': 'The key turned in the lock',
      'pick-lock': 'The lock was picked cleanly',
      disarm: 'Mechanism disarmed and chest opened',
      smash: 'Chest smashed',
      attack: 'The mimic awakened',
    }),
  }),
});

function clampTier(value) {
  return Math.max(1, Math.min(3, value));
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
  const pressure = clampTier(depth);
  const tables = {
    1: [
      ['unlocked', 30], ['locked', 32], ['trapped', 20], ['cursed', 12], ['mimic', 6],
    ],
    2: [
      ['unlocked', 18], ['locked', 30], ['trapped', 25], ['cursed', 17], ['mimic', 10],
    ],
    3: [
      ['unlocked', 10], ['locked', 28], ['trapped', 27], ['cursed', 21], ['mimic', 14],
    ],
  };
  let cursor = roll % 100;
  for (const [variant, weight] of tables[pressure]) {
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
  const cacheVariant = weightedVariant(hash, depth);
  const tier = clampTier(depth);
  const rewardMultipliers = {
    unlocked: 1,
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
    lockTier: cacheVariant === 'locked' ? tier : 0,
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
  if ((find.cacheVariant === 'locked') !== (find.lockTier >= 1)) return false;
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

export function lockpickCost(lockpickTier) {
  if (!Number.isInteger(lockpickTier) || lockpickTier < 1 || lockpickTier > 3) return 0;
  return lockpickTier === 1 ? 2 : 1;
}

function action(id, enabled = true, hint = '') {
  return Object.freeze({ id, enabled, hint });
}

export function chestActionRules({ find, actor } = {}) {
  if (!isChestFind(find)) throw new TypeError('Chest actions require a generated chest');
  const access = normalizedActor(actor);
  const locale = actor?.language === 'en' ? 'en' : 'ru';
  const copy = COPY[locale];
  const actions = [];
  if (find.cacheVariant === 'unlocked') actions.push(action('open'));
  if (find.cacheVariant === 'locked') {
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
    actions.push(action('smash'));
  }
  if (find.cacheVariant === 'trapped') {
    actions.push(action('open'));
    actions.push(action(
      'disarm',
      access.trapDisarmTier >= find.trapTier,
      access.trapDisarmTier >= find.trapTier ? '' : copy.noDisarmSkill(find.trapTier),
    ));
    actions.push(action('smash'));
  }
  if (find.cacheVariant === 'cursed') actions.push(action('open'), action('smash'));
  if (find.cacheVariant === 'mimic') actions.push(action('open'), action('attack'));
  return Object.freeze({ access: Object.freeze(access), actions: Object.freeze(actions) });
}

export function chestContextPresentation({ find, actor, inspected = false, language = 'ru' } = {}) {
  if (!isChestFind(find) || typeof inspected !== 'boolean') return null;
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
  const visibleVariant = inspected || ['unlocked', 'locked'].includes(find.cacheVariant)
    ? find.cacheVariant
    : 'generic';
  const names = {
    generic: copy.genericName,
    unlocked: copy.unlockedName,
    locked: copy.lockedName,
    trapped: copy.trappedName,
    cursed: copy.cursedName,
    mimic: copy.mimicName,
  };
  const descriptions = {
    generic: copy.generic,
    unlocked: copy.unlocked,
    locked: copy.locked(['I', 'II', 'III'][find.lockTier - 1]),
    trapped: copy.trapped(['I', 'II', 'III'][find.trapTier - 1]),
    cursed: copy.cursed,
    mimic: copy.mimic,
  };
  let visibleActions = rules.actions;
  if (!inspected && ['trapped', 'cursed'].includes(find.cacheVariant)) {
    visibleActions = rules.actions.filter(({ id }) => ['open', 'smash'].includes(id));
  }
  if (!inspected && find.cacheVariant === 'mimic') {
    visibleActions = rules.actions.filter(({ id }) => id === 'open');
  }
  const accent = {
    unlocked: '#b5a77d', locked: '#d9bd67', trapped: '#c59663', cursed: '#a96d9d', mimic: '#b45c58',
  }[find.cacheVariant];
  return Object.freeze({
    name: names[visibleVariant],
    description: inspected
      ? descriptions[find.cacheVariant]
      : find.cacheVariant === 'locked'
        ? copy.lockedClosed
        : find.cacheVariant === 'unlocked'
          ? copy.unlockedClosed
          : copy.generic,
    icon: typeof find.icon === 'string' && find.icon.length > 0
      ? find.icon
      : CHEST_DEFAULT_PATH,
    accent,
    actions: Object.freeze([
      action('inspect'),
      ...visibleActions,
    ]),
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
  if (Math.abs(hero.x - find.x) + Math.abs(hero.y - find.y) > 1) return rejected('distance');
  const rules = chestActionRules({ find, actor });
  const selected = rules.actions.find(({ id }) => id === actionId);
  if (!selected) return rejected('action');
  if (!selected.enabled) {
    if (actionId === 'use-key') return rejected('key-required');
    if (actionId === 'pick-lock') {
      return rejected(rules.access.lockpickTier < find.lockTier ? 'lockpick-skill-required' : 'lockpicks-required');
    }
    if (actionId === 'disarm') return rejected('disarm-skill-required');
    return rejected('unavailable');
  }

  let damage = 0;
  if (find.cacheVariant === 'trapped') {
    if (actionId === 'open') damage = find.hazardDamage;
    if (actionId === 'smash') damage = Math.ceil(find.hazardDamage / 2);
  }
  if (find.cacheVariant === 'cursed') {
    damage = actionId === 'smash' ? Math.ceil(find.hazardDamage / 2) : find.hazardDamage;
  }
  if (find.cacheVariant === 'mimic') {
    damage = actionId === 'attack' ? Math.ceil(find.hazardDamage / 2) : find.hazardDamage;
  }
  if (damage >= hero.hp) return rejected('unsafe');

  const awakensMimic = find.cacheVariant === 'mimic' && typeof find.mimicMonsterId === 'string';
  const damagedLoot = ['smash', 'attack'].includes(actionId) && !awakensMimic;
  const rewardGold = awakensMimic
    ? 0
    : damagedLoot
      ? Math.ceil(find.rewardGold / 2)
      : find.rewardGold;
  const status = find.cacheVariant === 'cursed'
    ? Object.freeze({
        id: find.curseEffectId,
        duration: actionId === 'smash' ? Math.max(1, Math.ceil(find.curseDuration / 2)) : find.curseDuration,
      })
    : null;
  const consumed = [];
  if (actionId === 'use-key') consumed.push(Object.freeze({ id: CHEST_RESOURCE_IDS.key, amount: 1 }));
  if (actionId === 'pick-lock') {
    consumed.push(Object.freeze({ id: CHEST_RESOURCE_IDS.lockpick, amount: lockpickCost(rules.access.lockpickTier) }));
  }
  return Object.freeze({
    ok: true,
    action: actionId,
    variant: find.cacheVariant,
    damage,
    rewardGold,
    destroyedGold: awakensMimic ? 0 : find.rewardGold - rewardGold,
    deferredRewardGold: awakensMimic ? find.rewardGold : 0,
    rewardPower: 0,
    noise: awakensMimic ? 8 : actionId === 'smash' ? 7 : actionId === 'attack' ? 5 : 0,
    status,
    activatedMonsterIds: Object.freeze(awakensMimic ? [find.mimicMonsterId] : []),
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
      : copy.result[result.action] ?? copy.result.open,
    unsafe: copy.unsafe,
  });
}
