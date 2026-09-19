# [LPC] Tavern

- Source: <https://opengameart.org/content/lpc-tavern>
- Package: `lpc-tavern.zip`
- Imported: 2026-09-19
- License: **CC-BY-SA 3.0**

"[LPC] Tavern" by bluecarrot16, Lanea Zimmerman (Sharm), William.Thompsonj,
Jetrel, DCSS Contributors, Reemax, Hyptosis, Daniel Eddeland (Daneeklu),
BenCreating, Evert, tapatilorenzo. License: CC-BY-SA 3.0.

The full upstream credit chain — every submission these tiles were assembled
from, with its own author and license — is kept verbatim in
[`CREDITS-tavern.txt`](CREDITS-tavern.txt) beside this file. That file is the
attribution the license asks for; it travels with the art and is not edited.

## What is here, and what was changed

The three upstream sheets (`tavern-furniture.png`, `tavern-deco.png`,
`tavern-cooking.png`) are not shipped. Instead the tiles the game actually
draws were cut out of them as individual PNGs, because the renderer requests
one sprite per path and the itch packager copies only the files the catalog
names.

Two files are edited rather than merely cut:

- `hearth/fireplace1..6.png` — the stone surround of the fireplace with each
  of the six upstream fire frames composited into its opening, so the hearth
  is one animated prop instead of two props that have to be kept aligned.
- `deco/torch1..3.png` — the three torch frames padded onto a common 16×32
  canvas, anchored bottom-centre, so the flame flickers in place.

Both edits are modifications of CC-BY-SA 3.0 material and are themselves
CC-BY-SA 3.0.

These files are **not** covered by the CC0 dedication that applies to the
surrounding Dungeon Crawl Stone Soup library.
