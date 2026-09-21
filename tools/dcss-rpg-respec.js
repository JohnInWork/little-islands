/**
 * Переиграть себя.
 *
 * Иван: «какой-нибудь мудрый старик или маг, он добрый, предлагает сбросить все
 * свои очки, которые ты вкачал, за деньги». И то же самое у городского жреца —
 * «у него дороже будет намного».
 *
 * Механика появилась не сама по себе: мы только что заставили игрока выбирать
 * два навыка на старте, ничего ещё не зная об игре. Без возможности переиграть
 * это наказание за незнание. Сброс за деньги превращает ошибку в расход, а
 * расход — нормальная часть игры.
 *
 * Три правила:
 *
 * - **Сбрасывается всё сразу.** И характеристики, и навыки. Иван: «все
 *   сбрасываем — да». Выборочный сброс — это микроменеджмент и свой экран;
 *   «заново» — решение, которое принимают целиком.
 * - **Возвращает к созданию, а не к нулю.** Герой откатывается туда, кем он
 *   вышел из ворот: с теми же двумя очками и теми же двумя навыками. Иначе
 *   сброс сжигал бы и выбранное при создании, и был бы не переигровкой, а
 *   штрафом.
 * - **Платят за потраченное.** Цена считается по числу вложенных очков, а не
 *   плоской суммой: на третьем уровне сброс по карману, на десятом — дорог, и
 *   это честно в обе стороны.
 */

import { ATTRIBUTE_BASE, ATTRIBUTE_IDS } from './dcss-rpg-attributes.js';
import { buildAttributes, buildSkillRanks } from './dcss-rpg-character-creation.js';
import { SKILL_STATE_VERSION } from './dcss-rpg-skills.js';

/**
 * Сколько стоит одно вложенное очко.
 *
 * Странник дешевле городского — и это не щедрость, а редкость: на старика в
 * подземелье надо наткнуться, а жрец в городе стоит на месте и ждёт. За
 * удобство платят.
 */
export const RESPEC_RATES = Object.freeze({
  sage: 60,
  priest: 100,
});

export const RESPEC_SOURCES = Object.freeze(Object.keys(RESPEC_RATES));

/**
 * Сколько очков герой вложил сверх того, с чем вышел.
 *
 * Выданные при создании ступени не считаются: их никто не покупал, и
 * возвращать их некуда. Всё остальное — и ранги, и характеристики — это
 * потраченные уровни, и они и есть предмет сделки.
 */
export function respecSpentPoints({ skills = null, attributes = null } = {}) {
  const granted = new Set(Array.isArray(skills?.granted) ? skills.granted : []);
  let вложено = 0;
  for (const [id, rank] of Object.entries(skills?.ranks ?? {})) {
    if (!Number.isInteger(rank) || rank < 1) continue;
    вложено += granted.has(id) ? Math.max(0, rank - 1) : rank;
  }
  const вхарактеристики = Number.isInteger(attributes?.spent) ? Math.max(0, attributes.spent) : 0;
  return вложено + вхарактеристики;
}

/** Цена сброса. Ноль вложенного — ноль цены, и сделки не будет. */
export function respecPrice({ spent = 0, source = 'sage' } = {}) {
  const rate = RESPEC_RATES[source];
  if (!rate) throw new TypeError(`Unknown respec source: ${source}`);
  if (!Number.isInteger(spent) || spent < 0) throw new TypeError('Respec needs a whole number of spent points');
  return spent * rate;
}

/**
 * Можно ли переиграть себя прямо сейчас.
 *
 * Отказ всегда назван: «нечего сбрасывать» и «не хватает золота» — разные
 * вещи, и серая кнопка без объяснения не говорит ни о той, ни о другой.
 */
export function canRespec({ skills = null, attributes = null, gold = 0, source = 'sage' } = {}) {
  const spent = respecSpentPoints({ skills, attributes });
  if (spent === 0) return Object.freeze({ ok: false, reason: 'nothing-spent', spent, price: 0 });
  const price = respecPrice({ spent, source });
  if (!Number.isFinite(gold) || gold < price) {
    return Object.freeze({ ok: false, reason: 'no-gold', spent, price });
  }
  return Object.freeze({ ok: true, reason: 'ready', spent, price });
}

/**
 * Каким герой становится после сброса.
 *
 * Возвращает только характеристики и навыки — уровень, опыт и вещи сделка не
 * трогает. Очки уровня возвращаются все до единого: это и есть то, за что
 * платили.
 */
export function respecHero({ level = 1, build = null } = {}) {
  if (!Number.isInteger(level) || level < 1) throw new TypeError('Respec needs a hero level');
  const ranks = { ...buildSkillRanks(build) };
  const granted = Object.keys(ranks);
  const skills = { version: SKILL_STATE_VERSION, points: level - 1, ranks };
  if (granted.length > 0) skills.granted = granted;
  const база = buildAttributes(build);
  const attributes = { spent: 0 };
  for (const id of ATTRIBUTE_IDS) attributes[id] = база[id] ?? ATTRIBUTE_BASE;
  return Object.freeze({ skills: Object.freeze(skills), attributes: Object.freeze(attributes) });
}
