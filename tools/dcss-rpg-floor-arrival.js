/**
 * Заставка прибытия на этаж: крупная цифра и одна строка под ней.
 *
 * Раньше этаж сменялся мгновенно, и о переходе говорил только тост в углу.
 * Спуск — главное событие забега, и он заслуживает паузы: экран гаснет,
 * называет, куда пришёл герой, и открывает новый этаж. Модуль чистый — он
 * только решает, что написать; затемнением и паузой занимается адаптер.
 */

import { CITY_DEPTH } from './dcss-rpg-city.js';
import { FLOORS_PER_CHAPTER, STORY_DEPTH, chapterForDepth } from './dcss-rpg-run.js';

/** Как игра называет дороги игроку — те же слова, что у городских ворот. */
export const ROAD_NAMES = Object.freeze({
  deep: Object.freeze({ ru: 'Пещеры', en: 'The caves' }),
  surface: Object.freeze({ ru: 'За воротами', en: 'Beyond the gate' }),
  vaults: Object.freeze({ ru: 'Старые подвалы', en: 'The old vaults' }),
  crypt: Object.freeze({ ru: 'Склепы', en: 'The crypts' }),
  hell: Object.freeze({ ru: 'Ад', en: 'Hell' }),
});

const COPY = Object.freeze({
  ru: Object.freeze({
    city: 'Город',
    citySubtitle: 'Над подземельем',
    chapter: (n) => `Глава ${roman(n)}`,
    guardian: 'Логово стража',
    beyond: 'За концом дороги',
  }),
  en: Object.freeze({
    city: 'Town',
    citySubtitle: 'Above the dungeon',
    chapter: (n) => `Chapter ${roman(n)}`,
    guardian: 'The guardian’s lair',
    beyond: 'Past the end of the road',
  }),
});

export function roman(value) {
  if (!Number.isInteger(value) || value < 1 || value > 39) return String(value);
  const symbols = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let rest = value;
  let out = '';
  for (const [size, symbol] of symbols) {
    while (rest >= size) {
      out += symbol;
      rest -= size;
    }
  }
  return out;
}

/**
 * Что написать на заставке. `title` — крупно, `subtitle` — строкой под ним.
 * Страж стоит на последнем этаже каждой главы — это стоит знать заранее.
 */
export function floorArrivalModel({ depth, branch = 'deep', language = 'ru' } = {}) {
  const copy = COPY[language === 'en' ? 'en' : 'ru'];
  if (depth === CITY_DEPTH) {
    return Object.freeze({ title: copy.city, subtitle: copy.citySubtitle, guardian: false });
  }
  if (!Number.isInteger(depth) || depth < 1) throw new TypeError('Arrival depth must be a floor');
  const road = ROAD_NAMES[branch]?.[language === 'en' ? 'en' : 'ru'] ?? ROAD_NAMES.deep.ru;
  const guardian = depth % FLOORS_PER_CHAPTER === 0;
  const where = depth > STORY_DEPTH ? copy.beyond : copy.chapter(chapterForDepth(depth));
  const parts = [where, road];
  if (guardian) parts.push(copy.guardian);
  return Object.freeze({ title: roman(depth), subtitle: parts.join(' · '), guardian });
}
