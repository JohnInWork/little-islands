# Derived from the CC0 library

Everything here is made from the Dungeon Crawl Stone Soup tiles in the parent
directory, which are CC0 1.0 / public domain. The edits are ours and are placed
under the same dedication: **CC0 1.0**.

The parent `LICENSE.md` says the DCSS copy is unmodified, and it stays that way
— which is exactly why edited files live here instead.

## `books/`

Six book covers, recoloured to an absolute hue from six library covers:

| file | from | hue |
| --- | --- | --- |
| `rust.png` | `item/book/turquoise.png` | rust |
| `ink.png` | `item/book/tan.png` | ink blue |
| `rose.png` | `item/book/metal_green.png` | rose |
| `wine.png` | `item/book/light_blue.png` | wine red |
| `emerald.png` | `item/book/purple.png` | emerald |
| `gold.png` | `item/book/red.png` | gilded |

Two unidentified books that look the same are not a puzzle, they are a bug: the
game needs one distinct cover per book type. The library holds twenty-four and
the game now has thirty spellbooks, so six were painted.

## `tools/`

| file | from | change |
| --- | --- | --- |
| `bandage.png` | `item/food/bread_ration.png` | recoloured to linen |

The library ships no bandage of any kind, and a bandage drawn as a scroll reads
as a spell. The ration is the right shape — a wrapped bundle — so it was
repainted white and lost its bread.

## `hud/`

| file | what |
| --- | --- |
| `home.png` | Домик для значка этажа в городе: там `romanDepth` отдаёт слово «ГОРОД», а места в значке — на одну-две римские цифры. |
| `moon.png` | Месяц для шкалы сна. Нарисован с нуля в палитре игры (`--bone`), без сглаживания: ничего похожего на «сон» в библиотеке нет, а вектор со стороны рядом с тридцатидвойками читался бы чужим. |

## `icon/`

Двадцать восемь значков заклинаний, эффектов и расходников, собранных из
угловых накладок библиотеки (`item/*/i-*.png`).

В DCSS такой файл — не иконка, а метка: игра кладёт её на угол картинки
предмета, поэтому содержимое размером 9–15 пикселей лежит в правом нижнем углу
холста 32×32, а остальное прозрачно. Мы использовали эти файлы как
самостоятельные значки — и они честно рисовались в углу кнопки, смещённые на
6–9 пикселей из тридцати двух. Иван: «почему то многие иконки не по центру в
кнопках».

Каждый обрезан по содержимому, увеличен ровно вдвое (целый множитель — пиксели
остаются квадратными) и положен в центр холста 32×32. Имя файла — папка
источника и название без префикса `i-`: `item/wand/i-fire.png` →
`icon/wand-fire.png`.

## `item/`

| file | what |
| --- | --- |
| `belt.png` | Пояс для пустого слота. В библиотеке предмета-пояса нет вовсе — в слоте лежал слой бумажной куклы `player/legs/belt_gray.png`: полоска 10×5 пикселей, растянутая на 54×77 и вылезавшая за кнопку. Нарисован в той же палитре, что месяц и домик. |
