# Third-party assets / Сторонние ассеты

## Active 2D game: Dungeon Crawl Stone Soup tiles

- Source: [crawl/tiles](https://github.com/crawl/tiles)
- Upstream snapshot: `releases/Nov-2015`
- Local library: 3,383 unmodified PNG files from `mon`, `item`, `player` and
  `dngn`
- License: CC0 1.0 / public-domain dedication, as documented upstream
- Local notice: `public/assets/dcss-preview/LICENSE.md`

The browser requests only images referenced by the active monster, item,
equipment and environment catalogs. The complete local library exists so future
content can reuse a coherent visual language without another download.

Локальная библиотека содержит полный согласованный набор для монстров,
предметов, paper-doll героя и подземелий. Игра не загружает все 3383 изображения
при старте — только файлы активного каталога.

The Dungeon Crawl Stone Soup artists and project are acknowledged for this
library. Its original notice is kept with the PNG files and is included in the
production asset directory.

Благодарим художников и проект Dungeon Crawl Stone Soup. Лицензионное уведомление
остаётся рядом с PNG-файлами и входит в каталог ассетов production-сборки.

## Active chest art: Cmski Pixel Animated Chests demo

- Author: Cmski
- Source: [Pixel Animated Chests](https://cmski.itch.io/animated-chests-pack-asset-pack-32x32)
- Package: `Tabletop Chests - Asset Pack 1.0 - DEMO`
- Local files: 16 integrated PNG frames in
  `public/assets/dcss-preview/licensed/cmski-chests/`
- License notice: `public/assets/dcss-preview/licensed/cmski-chests/LICENSE.md`

The pack permits use and modification inside commercial and non-commercial
games, but does not permit redistributing the artwork as a standalone asset
pack. These files are deliberately isolated from the surrounding CC0 library
so their different license remains unambiguous.

Набор разрешено использовать и изменять внутри игры, но нельзя распространять
отдельно как набор ассетов. Поэтому сундуки лежат в изолированном каталоге со
своим лицензионным уведомлением и не считаются частью CC0-библиотеки DCSS.

## Active audio samples: recorded CC0 sounds

- Authors: Kenney, Iwan "qubodup" Gabovitch, Vehicle (Jan Schupke), Still North
  Media, BMacZero, Jordan Irwin (AntumDeluge), wolfwoot, thebardofblasphemy,
  artisticdude, rubberduck, fvcalderan, Spring Spring, Joseph SARDIN
  (BigSoundBank), LordTomorrow, JaggedStone and five Freesound contributors
  (JoeDinesSound, Mythmazter, RMSound, Za-Games, TRP)
- Sources: OpenGameArt, Kenney.nl, Freesound (HQ previews), BigSoundBank — the
  exact page for every file is listed in the local notice
- Local files: 45 short effects in `public/assets/audio/sfx/` (several events
  carry 2–4 variations) and one ambience loop in `public/assets/audio/ambience/`,
  converted to mono MP3, peak −3 dBFS
- License: CC0 1.0 for every file
- Local notice: `public/assets/audio/LICENSE.md` (maps every local file to its
  original, author and source page)

Only recorded material ships: the synthesised voices were removed after
playtesting because they sounded like beeps. `tools/dcss-rpg-audio.js` maps
sound ids to files; a missing or undecodable file simply stays silent.

Только записанный материал: синтезированные голоса убраны после игрового теста
(«писки»). Карта id → файлы живёт в `tools/dcss-rpg-audio.js`; отсутствующий
или нечитаемый файл просто молчит.

## Code: three.js and flag-icons (MIT)

- three.js 0.186.0 — © 2010–2026 three.js authors, MIT.
- flag-icons — © 2013 Panayiotis Lipiridis, MIT (two language flags).
- The minifier strips licence comments from the bundle, so both MIT notices
  ship as `public/THIRD-PARTY-NOTICES.txt` and are linked from the in-game
  Credits screen.

Сборка вырезает лицензионные комментарии из кода, поэтому оба уведомления MIT
лежат отдельным файлом рядом с игрой, и экран «Авторы» на него ссылается.
