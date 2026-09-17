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

## Active audio samples: CC0 packs from OpenGameArt

- Authors: Juhani Junkala / SubspaceAudio (512 retro sound effects),
  artisticdude (RPG Sound Pack), JaggedStone (Loopable Dungeon Ambience)
- Sources: [512 Sound Effects (8-bit style)](https://opengameart.org/content/512-sound-effects-8-bit-style),
  [RPG Sound Pack](https://opengameart.org/content/rpg-sound-pack),
  [Loopable Dungeon Ambience](https://opengameart.org/content/loopable-dungeon-ambience)
- Local files: 21 short effects in `public/assets/audio/sfx/` and one ambience
  loop in `public/assets/audio/ambience/`, converted to mono MP3
- License: CC0 1.0 for all three packs
- Local notice: `public/assets/audio/LICENSE.md` (maps every local file to its
  original)

The samples layer on top of the synthesised voices: `tools/dcss-rpg-audio.js`
maps sound ids to files, and a missing or undecodable file falls back to the
synth recipe, so the game stays playable without the directory.

Сэмплы лежат поверх синтезированных голосов: карта id → файл живёт в
`tools/dcss-rpg-audio.js`, а отсутствующий или нечитаемый файл откатывается на
синтез-рецепт, поэтому игра работает и без этого каталога.
