# Dungeon Crawl Stone Soup — CC0 local library

Except for the explicitly documented `licensed/` subtree, the PNG files in this
directory are an unmodified local copy of the `mon`, `item`, `player` and `dngn`
directories from the official Dungeon Crawl Stone Soup tile export:

- Source: <https://github.com/crawl/tiles>
- Upstream snapshot: `releases/Nov-2015`
- License: CC0 1.0 / public-domain dedication, as documented by the upstream
  repository.

The upstream authors request acknowledgement of the artists and the Dungeon
Crawl Stone Soup project. The new 2D RPG loads a small active catalog from this
library; unused PNG files are not requested by the browser.

## The `licensed/` subtree

Art that is not CC0 lives there, one directory per pack, each with its own
`LICENSE.md` naming the author, the source and the terms. Nothing outside those
directories is covered by anything but the CC0 dedication above.

| Pack | Author | License |
| --- | --- | --- |
| `licensed/cmski-chests` | Cmski | free demo; use permitted, redistribution as a pack is not |
| `licensed/lpc-tavern` | bluecarrot16 and others | CC-BY-SA 3.0, credits in `CREDITS-tavern.txt` |
| `licensed/lpc-floors` | bluecarrot16 and others | CC-BY-SA 4.0, credits in `CREDITS-floors.txt` |

## The `derived/` subtree

Files made *from* the CC0 tiles above — recoloured, cropped or composited — so
that the DCSS copy itself stays unmodified. They carry the same CC0 dedication;
see [`derived/LICENSE.md`](derived/LICENSE.md).
