# DNG Codex — выпуск раннего доступа

Как собрать и выложить игру на itch.io и GitHub Pages, что писать на странице и
что проверить перед публикацией. Версия берётся из `package.json` и показывается
в главном меню («Ранний доступ 0.1.0»); ссылка «Отзывы и ошибки» ведёт на
GitHub Issues репозитория.

## Сборка

```bash
npm run check          # тесты + vite build
npm run package:itch   # dist → release/dng-codex-itch.zip (< 1000 файлов)
```

`scripts/package-itch.mjs` копирует из `dist/` только те спрайты, которые игра
реально запрашивает (`tools/dcss-rpg-required-assets.js`), убирает
`tools/sprites.html` и упаковывает архив с `index.html` в корне. itch.io
отклоняет HTML-архивы больше 1000 файлов, полный `dist/` содержит ~3400.

GitHub Pages публикует полный `dist/` (лимита на число файлов нет).

## Настройки страницы itch.io

- Kind of project: HTML. Upload: `release/dng-codex-itch.zip`, галочка
  «This file will be played in the browser».
- Embed: viewport 430 × 932 (портрет), «Mobile friendly» включено,
  «Fullscreen button» включено, orientation: portrait, «Automatically start on
  page load» выключено (первый тап нужен для звука).
- Классификация: Role Playing, Roguelike; теги: pixel-art, dungeon-crawler,
  mobile, procedural-generation, early-access. Цена: бесплатно (с возможностью
  поддержать).
- Скриншоты: `screenshots/dungeon-mobile.png` (390×844) и
  `screenshots/dungeon-desktop.png` (844×390).

## Текст страницы

### Русский

**DNG Codex** — мобильная пиксельная roguelike-RPG. Девять этажей, три главы,
хранители на III, VI и IX и артефакт в самом низу. Герой сражается сам: ты
выбираешь путь, экипировку и риск.

Ранний доступ, бесплатно. Забег начинается с нуля — поношенная рубаха и ржавый
меч; всё остальное нужно найти: 50+ предметов с видимой экипировкой,
неопознанные зелья, свитки и книги, заклинания огня, льда и бури с ручным
прицелом, торговцы с конечным кошельком, сундуки, алтари, ловушки и охота.
Карта этажа, экран итогов, RU/EN, сохранение в браузере, работает как PWA.

**Управление.** Телефон: джойстик внизу или тап по клетке, кнопки рюкзака,
взаимодействия и заклинаний в зоне большого пальца. Компьютер: стрелки/WASD,
M — карта, Escape — закрыть окно.

**Что нового в каждой версии** — в разделе devlog; ошибки и идеи — по кнопке
«Отзывы и ошибки» в главном меню.

### English

**DNG Codex** is a mobile pixel-art roguelike RPG. Nine floors, three chapters,
guardians on III, VI and IX and an artifact at the bottom. The hero fights on
their own: you pick the route, the gear and the risk.

Free early access. Every run starts from nothing — a worn tunic and a rusty
sword; everything else must be found: 50+ items with visible equipment,
unidentified potions, scrolls and books, fire, ice and storm spells with manual
targeting, merchants with a finite purse, chests, altars, traps and hunting.
Floor map, run summary, RU/EN, browser saves, installable as a PWA.

**Controls.** Phone: the joystick at the bottom or a tap on a tile; bag,
interaction and spell buttons sit in the thumb zone. Desktop: arrows/WASD,
M for the map, Escape to close a window.

**Credits.** Tiles: Dungeon Crawl Stone Soup (CC0). Chests: Cmski (demo
licence). Sounds: recorded CC0 samples by Kenney, qubodup, Still North Media,
wolfwoot, artisticdude, rubberduck, BigSoundBank, Freesound contributors and
others — see THIRD_PARTY_ASSETS.md. Engine: Vite, Canvas and Three.js.

## Перед публикацией

1. `npm run check` зелёный; `npm run package:itch` собрал архив < 1000 файлов.
2. Версия в `package.json` поднята, в главном меню видна та же версия.
3. Скриншоты пересняты на QA-origin (меню с версией, забег с подсказкой, карта,
   экран итогов).
4. Архив загружен на itch.io как HTML с настройками выше; страница открыта на
   телефоне: звук после первого тапа, портрет без горизонтального скролла,
   fullscreen работает.
5. GitHub Pages зелёный на том же коммите; ссылка «Отзывы и ошибки» открывает
   Issues.
