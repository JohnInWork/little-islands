/**
 * Передышка: здоровье понемногу возвращается, когда вокруг тихо.
 *
 * Своего восстановления у героя не было — только зелья, еда, фонтаны, лагерь
 * и алтарь, а алтари стали редкостью. Бот, игравший в игру, оставался на 14
 * здоровья из 104 до конца забега: лечиться нечем, а само не заживает. Иван:
 * «делай как лучше». Передышка медленная — полное восстановление займёт
 * около четырёх минут тишины, — поэтому зелье, еда и алтарь остаются
 * главным лечением, а раненый герой больше не заперт на краю смерти.
 *
 * Тихо — это: ни один враг не гонится за героем, по нему несколько секунд не
 * били, и он не голоден сильнее лёгкого голода.
 */

/** Сколько секунд тишины нужно, прежде чем раны начнут затягиваться. */
export const CALM_DELAY_SECONDS = 6;
/** Доля полной полосы здоровья за секунду тишины: 0.4% — 250 секунд на всё. */
export const CALM_PERCENT_PER_SECOND = 0.4;
/** Стадии голода, при которых передышка работает. */
export const CALM_HUNGER_STAGES = Object.freeze(['fed', 'mild']);

/**
 * Сколько вернуть за отрезок времени. Возвращает целые очки и остаток,
 * чтобы короткие кадры не теряли лечение на округлении.
 */
export function calmRecovery({
  hp,
  maxHp,
  seconds,
  calmSeconds,
  hungerStageId,
  carry = 0,
} = {}) {
  const idle = Object.freeze({ healed: 0, carry: 0 });
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0 || hp <= 0 || hp >= maxHp) return idle;
  if (!Number.isFinite(seconds) || seconds <= 0) return Object.freeze({ healed: 0, carry });
  if (!Number.isFinite(calmSeconds) || calmSeconds < CALM_DELAY_SECONDS) return idle;
  if (!CALM_HUNGER_STAGES.includes(hungerStageId)) return idle;
  const amount = (Number.isFinite(carry) ? carry : 0) + (maxHp * CALM_PERCENT_PER_SECOND * seconds) / 100;
  const healed = Math.min(Math.floor(amount), maxHp - hp);
  return Object.freeze({ healed, carry: healed === maxHp - hp ? 0 : amount - Math.floor(amount) });
}
