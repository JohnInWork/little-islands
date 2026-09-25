/**
 * Одна вещь — одна картинка везде.
 *
 * Иван увидел шлем на полу золотым, на кнопке «что рядом» серебряным, а в
 * плашке «подобрал» — третьим шлемом. Причин было три, и все мелкие: пол
 * перекрашивал спрайт материалом, кнопка — нет; плашка брала иконку из
 * каталога, а не силуэт этого экземпляра; пол и рюкзак хешировали разные
 * имена одной вещи. Теперь картинку экземпляра отвечает только эта функция,
 * а пол, кнопка, плашка, рюкзак, карточка и слот надетого её лишь рисуют.
 *
 * Pure: no DOM, no renderer. The adapter passes the item already run through
 * identification, so an unknown potion stays an unknown potion here.
 */
import { itemSpriteFor } from './dcss-rpg-equipment-visuals.js';
import { materialFilter } from './dcss-rpg-materials.js';

/**
 * The picture of one item instance: which silhouette and how it is recoloured.
 * `filter` is a CSS/canvas filter string or null when the sprite is drawn as is.
 */
export function itemPicture(item) {
  if (!item) return null;
  return Object.freeze({
    path: itemSpriteFor(item) ?? item.icon ?? item.path ?? null,
    filter: materialFilter(item.materialId ?? null) ?? null,
  });
}

/**
 * Золото на полу — кучка, а не одна огромная монета.
 *
 * Монета анфас (`licensed/7soul-icons/coin-gold.png`) осталась значком
 * интерфейса: кошелёк, строки обещаний, плашка «+12». Но на полу она
 * растягивалась на всю клетку. Кучки из Dungeon Crawl нарисованы именно как
 * добыча на полу, и по ним видно, сколько там лежит.
 *
 * Ступени абсолютные, а не от глубины: горсть на полу стоит `4 + 2·глубина +
 * 0…4` (см. `generateDungeon`). Мелкая — до 10 монет (первый этаж целиком),
 * средняя — 11…21 (четвёртый–шестой целиком), крупная — от 22 (с девятого
 * этажа всегда). На втором–третьем и седьмом–восьмом ступени перемешаны —
 * там и сумма уже разная. Глубже кучка растёт вместе с суммой, и это то, что
 * игрок и должен видеть. Выбор картинок — Ивана: все кандидаты
 * собраны в `output/visual-choices/gold-piles.png`, менять только `path`.
 */
export const GOLD_PILE_TIERS = Object.freeze([
  Object.freeze({ id: 'small', below: 11, path: 'item/gold/03.png' }),
  Object.freeze({ id: 'medium', below: 22, path: 'item/gold/08.png' }),
  Object.freeze({ id: 'large', below: Infinity, path: 'item/gold/16.png' }),
]);

export const GOLD_PILE_PATHS = Object.freeze(GOLD_PILE_TIERS.map(({ path }) => path));

export function goldPileTier(amount) {
  const value = Number.isFinite(amount) ? amount : 0;
  return GOLD_PILE_TIERS.find(({ below }) => value < below) ?? GOLD_PILE_TIERS.at(-1);
}

export function goldPilePath(amount) {
  return goldPileTier(amount).path;
}

/**
 * How the item lies on the floor. Everything but gold is the item's own
 * picture, trimmed to its opaque pixels and fitted to the loot footprint; gold
 * is a pile tile drawn whole, because the pile's size inside the tile is the
 * whole point of choosing it by amount.
 */
export function floorPicture(item) {
  if (!item) return null;
  if (item.gold) {
    return Object.freeze({ path: goldPilePath(item.amount), filter: null, trim: false });
  }
  return Object.freeze({ ...itemPicture(item), trim: true });
}
