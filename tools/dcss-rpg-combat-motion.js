const CONTACT_RATIOS = Object.freeze({
  unarmed: 0.42,
  blade: 0.44,
  heavy: 0.56,
  spear: 0.5,
  staff: 0.6,
  bow: 0.62,
});

const LUNGE_PIXELS = Object.freeze({
  unarmed: 8,
  blade: 13,
  heavy: 18,
  spear: 11,
  staff: 3,
  bow: 2,
});

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeOutCubic = (value) => 1 - (1 - clamp01(value)) ** 3;

export function attackContactRatio(style) {
  return CONTACT_RATIOS[style] ?? CONTACT_RATIOS.unarmed;
}

export function attackCrossedContact(previousRemaining, nextRemaining, duration, style) {
  if (
    !Number.isFinite(previousRemaining) ||
    !Number.isFinite(nextRemaining) ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) return false;
  const threshold = duration * (1 - attackContactRatio(style));
  return previousRemaining > threshold && nextRemaining <= threshold;
}

export function heroAttackMotion(remaining, duration, style, reducedMotion = false) {
  if (!Number.isFinite(remaining) || !Number.isFinite(duration) || duration <= 0 || remaining <= 0) {
    return Object.freeze({ progress: 1, stage: 'idle', lunge: 0, scaleX: 1, scaleY: 1, swing: 0 });
  }
  const progress = clamp01(1 - remaining / duration);
  const contact = attackContactRatio(style);
  const maximum = LUNGE_PIXELS[style] ?? LUNGE_PIXELS.unarmed;
  if (reducedMotion) {
    return Object.freeze({ progress, stage: progress < contact ? 'anticipation' : 'recovery', lunge: 0, scaleX: 1, scaleY: 1, swing: progress >= contact * 0.82 && progress <= contact + 0.16 ? 1 : 0 });
  }
  if (progress < contact) {
    const preparation = progress / contact;
    const pullback = Math.min(5, maximum * 0.3);
    const launch = clamp01((preparation - 0.62) / 0.38);
    const lunge = preparation < 0.62
      ? -pullback * Math.sin((preparation / 0.62) * Math.PI * 0.5)
      : -pullback + (maximum + pullback) * easeOutCubic(launch);
    return Object.freeze({
      progress,
      stage: 'anticipation',
      lunge,
      scaleX: 1 - 0.08 * preparation,
      scaleY: 1 + 0.06 * preparation,
      swing: easeOutCubic(launch),
    });
  }
  const recovery = clamp01((progress - contact) / (1 - contact));
  return Object.freeze({
    progress,
    stage: recovery < 0.34 ? 'contact' : 'recovery',
    lunge: maximum * (1 - easeOutCubic(recovery)),
    scaleX: 1 + 0.12 * (1 - recovery),
    scaleY: 1 - 0.09 * (1 - recovery),
    swing: 1 - easeOutCubic(Math.min(1, recovery * 2.7)),
  });
}

export function heroAttackTrail(style, progress, cleaveRank = 0) {
  const phase = clamp01(progress);
  if (style === 'spear') {
    return Object.freeze(
      Array.from({ length: 5 }, (_, index) => Object.freeze({
        x: 28 + index * 8,
        y: index % 2 === 0 ? 0 : 2,
        size: index < 2 ? 4 : 3,
        alpha: 0.34 + index * 0.11,
      })),
    );
  }
  if (style === 'staff' || style === 'bow') {
    const radius = 6 + Math.sin(phase * Math.PI) * 5;
    return Object.freeze(
      Array.from({ length: 4 }, (_, index) => {
        const angle = phase * Math.PI * 2 + index * Math.PI * 0.5;
        return Object.freeze({
          x: 25 + Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          size: index === 0 ? 4 : 3,
          alpha: 0.4 + index * 0.1,
        });
      }),
    );
  }
  const heavy = style === 'heavy';
  const rank = heavy && Number.isInteger(cleaveRank)
    ? Math.max(0, Math.min(3, cleaveRank))
    : 0;
  const count = heavy ? 6 + rank * 2 : style === 'unarmed' ? 3 : 5;
  const sweepSize = heavy ? 1.3 + rank * 0.16 : 1.72;
  const sweep = (heavy ? -sweepSize / 2 : -0.86) + phase * sweepSize;
  return Object.freeze(
    Array.from({ length: count }, (_, index) => {
      const angle = sweep - index * (heavy ? Math.max(0.06, 0.1 - rank * 0.01) : 0.13);
      const radius = (heavy ? 36 + rank * 2 : 31) + index * (heavy ? 2.2 : 2);
      return Object.freeze({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: heavy ? (index < 2 ? 7 : 5) : style === 'unarmed' ? 3 : 4,
        alpha: Math.max(0.24, 0.86 - index * 0.12),
      });
    }),
  );
}

export function monsterAttackMotion({ windup, windupDuration, recovery, angle = 0, reducedMotion = false }) {
  if (reducedMotion) return Object.freeze({ dx: 0, dy: 0, scaleX: 1, scaleY: 1 });
  let distance = 0;
  let scaleX = 1;
  let scaleY = 1;
  if (windup > 0 && windupDuration > 0) {
    const progress = clamp01(1 - windup / windupDuration);
    if (progress < 0.68) {
      const preparation = progress / 0.68;
      distance = -5 * easeOutCubic(preparation);
      scaleX = 1 - preparation * 0.07;
      scaleY = 1 + preparation * 0.08;
    } else {
      const strike = (progress - 0.68) / 0.32;
      distance = -5 + 21 * easeOutCubic(strike);
      scaleX = 0.93 + strike * 0.18;
      scaleY = 1.08 - strike * 0.16;
    }
  } else if (recovery > 0) {
    const progress = clamp01(1 - recovery / 0.18);
    distance = 16 * (1 - easeOutCubic(progress));
    scaleX = 1.11 - progress * 0.11;
    scaleY = 0.92 + progress * 0.08;
  }
  return Object.freeze({
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
    scaleX,
    scaleY,
  });
}

export function combatImpactProfile(style, { projectile = false, boss = false } = {}) {
  const heavy = style === 'heavy';
  return Object.freeze({
    particles: boss ? 22 : heavy ? 18 : projectile ? 12 : 14,
    waveSize: boss ? 70 : heavy ? 62 : projectile ? 46 : 52,
    shake: boss ? 6 : heavy ? 5 : projectile ? 2 : 3,
    hitStop: boss ? 0.075 : heavy ? 0.065 : projectile ? 0.035 : 0.048,
    staggers: heavy,
  });
}
