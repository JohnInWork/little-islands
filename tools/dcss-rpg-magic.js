import { ACTOR_EFFECTS, applyActorEffect, createActorEffects } from './dcss-rpg-effects.js';

export const VAMPIRISM_RATIO = 0.2;
export const INVISIBILITY_REVEAL_SECONDS = 3;

// Derived from owned equipment, never stored as a second source of truth.
export function equipmentMagic(equipment, items) {
  const byUid = items instanceof Map ? items : new Map(items.map((item) => [item.uid, item]));
  const immunity = new Set();
  let healOnKill = 0;
  let flight = false;
  let invisibility = false;
  let vampirism = false;
  for (const uid of new Set(Object.values(equipment).filter(Boolean))) {
    const magic = byUid.get(uid)?.magic;
    for (const id of magic?.immunity ?? []) {
      if (Object.hasOwn(ACTOR_EFFECTS, id)) immunity.add(id);
    }
    healOnKill += Math.max(0, magic?.healOnKill ?? 0);
    flight ||= magic?.flight === true;
    invisibility ||= magic?.invisibility === true;
    vampirism ||= magic?.vampirism === true;
  }
  return Object.freeze({
    immunity: Object.freeze([...immunity]),
    healOnKill: Math.min(4, healOnKill),
    flight,
    invisibility,
    vampirism,
  });
}

export function wardActorEffects(effects, magic) {
  const next = createActorEffects(effects);
  const cleared = [];
  for (const id of magic.immunity) {
    if (next[id] > 0) cleared.push(id);
    next[id] = 0;
  }
  return Object.freeze({ effects: next, cleared: Object.freeze(cleared) });
}

export function applyWardedEffect(effects, id, duration, magic) {
  // Validate the intent even when a ward will block it.
  const attempt = applyActorEffect(effects, id, duration);
  if (!magic.immunity.includes(id)) return { ...attempt, blocked: null };
  return Object.freeze({
    ...wardActorEffects(effects, magic), applied: null, reaction: null, blocked: id,
  });
}

export function resolveKillRecovery({ hp, maxHp, magic, newlyDefeated }) {
  if (!newlyDefeated || hp <= 0) return Object.freeze({ hp, healed: 0 });
  const healed = Math.max(0, Math.min(magic.healOnKill, maxHp - hp));
  return Object.freeze({ hp: hp + healed, healed });
}

export function resolveVampiricRecovery({ hp, maxHp, damage, magic }) {
  if (!magic?.vampirism || hp <= 0 || damage <= 0) return Object.freeze({ hp, healed: 0 });
  const requested = Math.max(1, Math.floor(damage * VAMPIRISM_RATIO));
  const healed = Math.max(0, Math.min(requested, maxHp - hp));
  return Object.freeze({ hp: hp + healed, healed });
}

export function magicItemEffects(item, language = 'ru') {
  const ru = language !== 'en';
  const rows = (item.magic?.immunity ?? []).map((id) => ({
    icon: '◇',
    text: ru
      ? `Защита от состояния «${ACTOR_EFFECTS[id].labels.ru}». Снимает его при надевании; прямой урон врага остаётся.`
      : `Prevents the ${ACTOR_EFFECTS[id].labels.en.toLowerCase()} status. Clears it when equipped; enemy hit damage still applies.`,
  }));
  if (item.magic?.healOnKill) rows.push({
    icon: '♥',
    text: ru
      ? `Восстанавливает ${item.magic.healOnKill} здоровья за победу над врагом. Общий предел: 4 за победу.`
      : `Restores ${item.magic.healOnKill} health per enemy defeated. Combined cap: 4 per defeat.`,
  });
  if (item.magic?.flight) rows.push({
    icon: '↟',
    text: ru
      ? 'Полёт: ловушки и опасный пол не мешают движению.'
      : 'Flight: traps and hazardous ground do not block movement.',
  });
  if (item.magic?.invisibility) rows.push({
    icon: '◌',
    text: ru
      ? `Невидимость: враги теряют героя. Атака раскрывает его на ${INVISIBILITY_REVEAL_SECONDS} с.`
      : `Invisibility: enemies lose the hero. Attacking reveals them for ${INVISIBILITY_REVEAL_SECONDS}s.`,
  });
  if (item.magic?.vampirism) rows.push({
    icon: '♦',
    text: ru
      ? `Вампиризм: ${VAMPIRISM_RATIO * 100}% нанесённого оружием урона возвращается здоровьем.`
      : `Vampirism: ${VAMPIRISM_RATIO * 100}% of weapon damage dealt returns as health.`,
  });
  return rows;
}
