# DNG Codex — выпуск

Как собрать игру для магазина, что написать на странице и что проверить перед
тем, как брать за неё деньги. Версия берётся из `package.json` и видна в
главном меню; ссылка «Отзывы и ошибки» ведёт на GitHub Issues.

## Решения, которые принимает Иван

Без них продажа не начнётся — код здесь ни при чём.

1. **Площадка.** Сборка готова для itch.io (HTML в браузере). Android и iOS
   потребуют обёртку (Capacitor) и аккаунты разработчика. Если выплаты из
   itch/Google/Apple недоступны, смотреть RuStore и VK Play.
2. **Бесплатная копия.** Пока репозиторий публичный, а GitHub Pages
   показывает игру целиком, платить за неё незачем. Варианты: сделать
   репозиторий приватным и снять Pages; или оставить на Pages демо.
3. **Цена.** Для премиального мобильного рогалика без рекламы и покупок
   внутри обычная цена — $2.99–4.99.
4. **Сундуки Cmski.** В игре демо-пак; для продажи купить полный пак или
   сохранить точный текст разрешения автора в
   `public/assets/dcss-preview/licensed/cmski-chests/LICENSE.md`.

## Сборка

```bash
npm run check          # тесты + vite build
npm run package:itch   # dist → release/dng-codex-itch.zip
```

`scripts/package-itch.mjs` кладёт в архив только то, что игра запрашивает по
адресу: всё остальное режется из атласа `assets/atlas/`. Итог — около 350
файлов и 11 МБ (itch.io принимает не больше 1000 файлов). Упаковщик сам
проверяет, что каждая картинка, названная в разметке и стилях, лежит в архиве.

## Кадры для страницы

`tools/dcss.html?shot=1` прячет весь интерфейс поверх подземелья — для
атмосферных кадров. Готовые кадры интерфейса лежат в `screenshots/store/`.
Подземелье тёмное: для кадров стоит поднять «Яркость» в настройках до 150%.

## Настройки страницы itch.io

- Kind of project: HTML. Upload: `release/dng-codex-itch.zip`, галочка
  «This file will be played in the browser».
- Embed: 430 × 932 (портрет), «Mobile friendly», «Fullscreen button»,
  orientation: portrait. «Automatically start on page load» выключено: первый
  тап нужен для звука.
- Genre: Role Playing. Теги: roguelike, dungeon-crawler, pixel-art, rpg,
  mobile, singleplayer, procedural-generation, fantasy. Тег turn-based не
  ставить: бой идёт в реальном времени.
- Pricing: платно, «No payments» выключено; при желании — минимальная цена и
  «pay what you want» сверху.
- Privacy policy: `https://<адрес игры>/privacy.html` (файл `public/privacy.html`).

## Текст страницы

### Русский

**DNG Codex** — пиксельный рогалик для телефона, в который играют одним
пальцем. Герой бьётся сам — ты решаешь, куда идти, что поднять, что
надеть, чему учиться и когда отступить.

- **Восемнадцать этажей в трёх главах**, страж в конце каждой, а за концом
  дороги — ещё шесть. Пять дорог: пещеры, земли за воротами, старые подвалы,
  склепы и ад.
- **Город над подземельем**: торговцы, таверна с наёмниками, храм и дом,
  который можно купить и обставить.
- **27 навыков по три ранга** и шесть школ магии: каждый ранг школы открывает
  новые заклинания, а найденная книга поднимает навык до конца забега.
- **140 предметов снаряжения**, видимых на герое, и 20 уникальных сил
  артефактов — полёт, невидимость, лёгкий шаг — каждая не больше одного раза
  за забег.
- **288 существ**, из них 73 уникальных: стражи глав, драконы, именные
  скитальцы, с некоторыми можно договориться.
- Голод, сон, охота и готовка у костра; запертые сундуки, мимики и ловушки.
- Русский и английский, после первой загрузки работает без сети, без рекламы
  и без покупок внутри. Игра ничего о вас не собирает.

**Управление.** Касание по полу или крестовина внизу экрана; на компьютере —
WASD или стрелки. Всё остальное — в справке «?» в главном меню.

### English

**DNG Codex** is a one-thumb pixel roguelike for your phone. The hero fights
on their own — you decide where to go, what to pick up, what to wear, what to
learn and when to fall back.

- **Eighteen floors in three chapters**, a guardian at the end of each, and six
  more past the end of the road. Five roads: the caves, the lands beyond the
  gate, the old vaults, the crypts and hell.
- **A town above the dungeon**: merchants, a tavern with hirelings, a temple
  and a house you can buy and furnish.
- **27 skills with three ranks each** and six schools of magic: every rank of a
  school opens new spells, and a book you find raises a skill for the rest of
  the run.
- **140 pieces of gear**, all visible on the hero, and 20 unique artifact
  powers — flight, invisibility, light step — each at most once per run.
- **288 creatures**, 73 of them unique: chapter guardians, dragons, named
  wanderers, and some you can bargain with.
- Hunger, sleep, hunting and cooking by the fire; locked chests, mimics and
  traps.
- Russian and English, plays offline once loaded, no ads and no in-app
  purchases. The game collects nothing about you.

**Controls.** Tap the floor or use the pad at the bottom; on desktop, WASD or
the arrows. Everything else is in the “?” help on the main menu.

**Credits.** Tiles: Dungeon Crawl Stone Soup (CC0). Floors, tavern, town and
lamps: Liberated Pixel Cup artists (CC-BY / CC-BY-SA). Chests: Cmski. Icons:
game-icons.net (CC BY 3.0) and 7Soul1 (CC0). Font: Fusion Pixel Font (OFL).
Sound and music: CC0 recordings by Kenney, Still North Media and many others.
The full list with licence links is on the in-game Credits screen.

## Перед публикацией

1. `npm run check` зелёный; `npm run package:itch` собрал архив без ошибок.
2. Версия в `package.json` поднята, в главном меню видна та же.
3. Архив проверен локально: `cd release/itch && python3 -m http.server`, игра
   открывается, меню → забег → рюкзак → карта без 404 в консоли.
4. На настоящем телефоне: звук после первого тапа, портрет без
   горизонтальной прокрутки, полноэкранный режим, кадры в секунду.
5. Страница itch.io открыта с телефона; ссылка на политику приватности
   работает.
