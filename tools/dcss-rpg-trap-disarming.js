export const DISARMED_TRAP_PATH = 'dngn/traps/pressure_plate.png';

const COPY = Object.freeze({
  ru: Object.freeze({
    action: 'Обезвредить обнаруженную ловушку',
    success: 'Ловушка обезврежена',
    skillRequired: 'Нужен навык «Сапёр» I',
    tierRequired: (tier) => `Нужен навык «Сапёр» ${['I', 'II', 'III'][tier - 1]}`,
  }),
  en: Object.freeze({
    action: 'Disarm the detected trap',
    success: 'Trap disarmed',
    skillRequired: 'Trap disarming I required',
    tierRequired: (tier) => `Trap disarming ${['I', 'II', 'III'][tier - 1]} required`,
  }),
});

function validIds(ids) {
  return Array.isArray(ids)
    && ids.every((id) => typeof id === 'string' && /^event-\d+-\d+$/.test(id))
    && new Set(ids).size === ids.length;
}

function validTrap(trap) {
  return trap
    && typeof trap.instanceId === 'string'
    && /^event-\d+-\d+$/.test(trap.instanceId)
    && trap.eventId === trap.instanceId
    && Number.isInteger(trap.x)
    && trap.x >= 0
    && Number.isInteger(trap.y)
    && trap.y >= 0
    && Number.isInteger(trap.tier)
    && trap.tier >= 1
    && trap.tier <= 3;
}

const rejected = (reason, requiredTier = 0, effectiveTier = 0) =>
  Object.freeze({ ok: false, reason, requiredTier, effectiveTier });

export function trapDisarmPresentation({ trap, effectiveTier = 0, language = 'ru' } = {}) {
  if (!validTrap(trap) || !Number.isInteger(effectiveTier) || effectiveTier < 0 || effectiveTier > 3) {
    return null;
  }
  const copy = COPY[language === 'en' ? 'en' : 'ru'];
  const ready = effectiveTier >= trap.tier;
  return Object.freeze({
    action: copy.action,
    success: copy.success,
    unavailable: effectiveTier === 0 ? copy.skillRequired : copy.tierRequired(trap.tier),
    requiredTier: trap.tier,
    effectiveTier,
    ready,
  });
}

/**
 * A deterministic Pathos-like skill check: the player must know the mechanism,
 * stand beside it and meet its tier with learned skill or a future tool. Hidden
 * random rolls are intentionally absent so UI, replay and future networking all
 * resolve the same command from the same state.
 */
export function trapDisarmAvailability({
  trap,
  detectedTrapIds,
  resolvedEventIds,
  disarmedTrapIds,
  runStatus,
  hero,
  capabilities,
  toolTier = 0,
} = {}) {
  const skillTier = capabilities?.trapDisarmTier ?? 0;
  if (
    !validTrap(trap)
    || !validIds(detectedTrapIds)
    || !validIds(resolvedEventIds)
    || !validIds(disarmedTrapIds)
    || !hero
    || !Number.isInteger(hero.x)
    || !Number.isInteger(hero.y)
    || !Number.isFinite(hero.hp)
    || !Number.isInteger(skillTier)
    || skillTier < 0
    || skillTier > 3
    || !Number.isInteger(toolTier)
    || toolTier < 0
    || toolTier > 3
  ) return rejected('invalid');

  const effectiveTier = Math.max(skillTier, toolTier);
  if (runStatus !== 'playing' || hero.hp <= 0) return rejected('inactive', trap.tier, effectiveTier);
  if (disarmedTrapIds.includes(trap.instanceId)) return rejected('disarmed', trap.tier, effectiveTier);
  if (resolvedEventIds.includes(trap.eventId)) return rejected('resolved', trap.tier, effectiveTier);
  if (!detectedTrapIds.includes(trap.instanceId)) return rejected('undetected', trap.tier, effectiveTier);
  const distance = Math.abs(hero.x - trap.x) + Math.abs(hero.y - trap.y);
  if (distance !== 1) return rejected('distance', trap.tier, effectiveTier);
  if (effectiveTier === 0) return rejected('skill-required', trap.tier, effectiveTier);
  if (effectiveTier < trap.tier) return rejected('tier-required', trap.tier, effectiveTier);
  return Object.freeze({ ok: true, reason: 'available', requiredTier: trap.tier, effectiveTier });
}

export function disarmTrap(options = {}) {
  const availability = trapDisarmAvailability(options);
  if (!availability.ok) return Object.freeze({ ...availability, state: options });
  const { trap, resolvedEventIds, disarmedTrapIds } = options;
  return Object.freeze({
    ...availability,
    state: Object.freeze({
      resolvedEventIds: Object.freeze([...resolvedEventIds, trap.eventId].sort()),
      disarmedTrapIds: Object.freeze([...disarmedTrapIds, trap.instanceId].sort()),
    }),
    event: Object.freeze({
      type: 'trap-disarmed',
      trapId: trap.instanceId,
      tier: trap.tier,
      method: options.toolTier > (options.capabilities?.trapDisarmTier ?? 0) ? 'tool' : 'skill',
    }),
  });
}
