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

## `mon/`

| file | from | change |
| --- | --- | --- |
| `boar.png` | `mon/animals/hog.png` | тёмная щетина вместо розовой кожи |

Кабан и домашняя свинья делили и картинку, и имя: обоих звали «Кабан» и обоих
рисовали одним спрайтом. Кабаньих спрайтов в библиотеке ровно два, и второй —
адский, так что выбирать было не из чего. Тон сдвинут в землю, светлота срезана
больше чем вдвое, насыщенность приглушена: та же туша, но дикая.

## `food/`

| file | from | change |
| --- | --- | --- |
| `roast.png` | `item/food/meat_ration.png` | темнее и румянее: кусок, снятый с огня |
| `stew.png` | — | нарисована с нуля |

Жаркое и варёное мясо делили одну картинку, хлеб и сытная похлёбка — другую.
Мясо разошлось перекраской, а с похлёбкой выбирать было не из чего: миски с
едой в библиотеке нет вовсе, а котелки трактира уже стоят у очага. Чаша
нарисована в тех же правилах, что месяц, домик и ремень: целые координаты,
обводка по контуру, одна ступень тени — и пар двумя завитками, чтобы горячее
читалось горячим.

## `books/` — добавлено

Ещё шесть обложек: неопознанных книг стало больше, чем разных переплётов, и
шесть пар снова смотрели одинаково.

| file | from |
| --- | --- |
| `amber.png` | `item/book/light_green.png` |
| `violet.png` | `item/book/metal_blue.png` |
| `jade.png` | `item/book/metal_cyan.png` |
| `brick.png` | `item/book/dark_blue.png` |
| `slate.png` | `item/book/parchment.png` |
| `moss.png` | `item/book/book_of_the_dead.png` |
