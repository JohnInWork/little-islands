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

const COPY = Object.freeze({
  ru: Object.freeze({
    genericName: 'Древний сундук',
    unlockedName: 'Сундук',
    lockedName: 'Запертый сундук',
    trappedName: 'Сундук с ловушкой',
    cursedName: 'Проклятый сундук',
    mimicName: 'Живой сундук',
    generic: 'Старая крышка скрывает содержимое. Осмотр покажет больше.',
    unlockedClosed: 'Крышка не заперта. Содержимое пока не видно.',
    lockedClosed: 'На крышке тяжёлый замок. Можно потратить ключ, применить навык или рискнуть добычей.',
    unlocked: (reward) => `Замок отсутствует. Внутри примерно ${reward}◆.`,
    locked: (reward, tier) => `Замок ${tier}. Ключ сохранит ${reward}◆; взлом требует подходящего навыка.`,
    trapped: (reward, damage, tier) => `Механизм ${tier}: открытие нанесёт ${damage} урона. Внутри ${reward}◆.`,
    cursed: (reward, damage) => `Печать отнимет ${damage} здоровья. Внутри ${reward}◆.`,
    mimic: (reward, damage) => `Сундук дышит. Открытие: ${damage} урона и ${reward}◆; удар безопаснее, но портит добычу.`,
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
      attack: 'Живой сундук подавлен',
    }),
  }),
  en: Object.freeze({
    genericName: 'Ancient chest',
    unlockedName: 'Chest',
    lockedName: 'Locked chest',
    trappedName: 'Trapped chest',
    cursedName: 'Cursed chest',
    mimicName: 'Living chest',
    generic: 'An old lid conceals the contents. Inspection will reveal more.',
    unlockedClosed: 'The lid is not locked. Its contents are still hidden.',
    lockedClosed: 'A heavy lock guards the lid. Spend a key, use skill, or risk the loot.',
    unlocked: (reward) => `There is no lock. About ${reward}◆ rests inside.`,
    locked: (reward, tier) => `Lock ${tier}. A key preserves all ${reward}◆; picking requires enough skill.`,
    trapped: (reward, damage, tier) => `Mechanism ${tier}: opening deals ${damage} damage. It holds ${reward}◆.`,
    cursed: (reward, damage) => `The seal takes ${damage} health. It holds ${reward}◆.`,
    mimic: (reward, damage) => `The chest breathes. Open: ${damage} damage and ${reward}◆; striking is safer but ruins loot.`,
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
      attack: 'Living chest subdued',
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
export function createChestProfile({ seed = 0, depth, roomIndex, rewardShards } = {}) {
  if (
    !Number.isInteger(seed)
    || seed < 0
    || !Number.isInteger(depth)
    || depth < 1
    || !Number.isInteger(roomIndex)
    || roomIndex < 0
    || !Number.isInteger(rewardShards)
    || rewardShards < 1
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
  return Object.freeze({
    cacheVariant,
    lockTier: cacheVariant === 'locked' ? tier : 0,
    trapTier: cacheVariant === 'trapped' ? tier : 0,
    hazardDamage: ['trapped', 'cursed', 'mimic'].includes(cacheVariant) ? hazardBase : 0,
    rewardShards: Math.max(1, Math.round(rewardShards * rewardMultipliers[cacheVariant])),
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
    && Number.isInteger(find.rewardShards)
    && find.rewardShards >= 1
  );
  if (!structurallyValid) return false;
  if ((find.cacheVariant === 'locked') !== (find.lockTier >= 1)) return false;
  if ((find.cacheVariant === 'trapped') !== (find.trapTier >= 1)) return false;
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
    unlocked: copy.unlocked(find.rewardShards),
    locked: copy.locked(find.rewardShards, ['I', 'II', 'III'][find.lockTier - 1]),
    trapped: copy.trapped(find.rewardShards, find.hazardDamage, ['I', 'II', 'III'][find.trapTier - 1]),
    cursed: copy.cursed(find.rewardShards, find.hazardDamage),
    mimic: copy.mimic(find.rewardShards, find.hazardDamage),
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
    icon: 'item/misc/misc_box.png',
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
  shards,
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
    || !Number.isFinite(shards)
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

  const damagedLoot = ['smash', 'attack'].includes(actionId);
  const rewardShards = damagedLoot ? Math.ceil(find.rewardShards / 2) : find.rewardShards;
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
    rewardShards,
    destroyedShards: find.rewardShards - rewardShards,
    rewardPower: 0,
    noise: actionId === 'smash' ? 7 : actionId === 'attack' ? 5 : 0,
    consumed: Object.freeze(consumed),
    state: Object.freeze({
      hero: Object.freeze({ ...hero, hp: hero.hp - damage }),
      shards: shards + rewardShards,
      resolvedFindIds: Object.freeze([...resolvedFindIds, find.instanceId]),
    }),
  });
}

export function chestResultPresentation(result, language = 'ru') {
  const copy = COPY[language === 'en' ? 'en' : 'ru'];
  if (result?.reason === 'unsafe') return Object.freeze({ message: '', unsafe: copy.unsafe });
  if (!result?.ok) return null;
  return Object.freeze({
    message: copy.result[result.action] ?? copy.result.open,
    unsafe: copy.unsafe,
  });
}
