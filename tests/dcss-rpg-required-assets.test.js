import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';

/**
 * Every picture the game draws is a picture the game loads.
 *
 * `actorTextureFor` used to throw when a sprite's file had never been
 * preloaded, and it is called from inside the render — so one forgotten path
 * stopped the world on every frame from the moment it came into view, while
 * the bag and the stick kept working. That is a frozen game, and Ivan hit it
 * twice. The throw is gone, but the real cure is that nothing is forgotten:
 * the city's three gates were bare strings in the adapter, in no list at all,
 * and «наружу» only ever showed because nobody had walked up to it.
 */
const ASSET_ROOTS = new Set(['dngn', 'item', 'mon', 'player', 'effect', 'licensed', 'derived']);

test('no picture is drawn that was never asked for', async () => {
  const { readdir } = await import('node:fs/promises');
  const tools = new URL('../tools/', import.meta.url);
  const files = (await readdir(tools)).filter((name) => name.endsWith('.js'));
  const loaded = new Set(requiredAssetPaths());
  const shipped = new URL('../public/assets/dcss-preview/', import.meta.url);
  const missing = [];
  const absent = [];
  for (const name of files) {
    const source = await readFile(new URL(name, tools), 'utf8');
    // A whole asset path starts at one of the library's own top folders. A
    // module that builds its paths from a root prefix writes fragments —
    // `hearth/fireplace3.png` — and those are not paths until they are joined.
    for (const [, path] of source.matchAll(/'((?:[a-z0-9_\-.]+\/)+[a-z0-9_\-.]+\.png)'/gi)) {
      if (!ASSET_ROOTS.has(path.split('/')[0])) continue;
      if (!loaded.has(path)) missing.push(`${name}: ${path}`);
      if (!existsSync(new URL(path, shipped))) absent.push(`${name}: ${path}`);
    }
  }
  assert.ok(files.length > 40, 'the sweep found almost no modules');
  // Two different ways to be missing, and both end as a picture that is not there.
  assert.deepEqual(absent, [], `no such file: ${absent.join(', ')}`);
  assert.deepEqual(missing, [], `never loaded: ${missing.join(', ')}`);
});

/**
 * Every picture the world draws is a SQUARE picture.
 *
 * A billboard in the 3D layer is a `THREE.Sprite` scaled `size × size` — the
 * same number twice — and decorations are handed to it with no `scaleX` or
 * `scaleY`. So the texture is stretched to fill a square whatever shape the
 * file is, and a tall picture is squashed by exactly its own aspect ratio.
 *
 * Nobody noticed because Dungeon Crawl's own library is 32×32 throughout. The
 * licensed packs are not: the street lamps that went in yesterday are 32×96,
 * which is to say they stood in the city crushed to a third of their height,
 * and the market awnings are 32×128. Padding a cut to a square is free — the
 * added pixels are transparent — and it is the only place this can be fixed,
 * because the renderer cannot know which way a picture was meant to go.
 */
test('every picture the world loads is square, or it is drawn squashed', async () => {
  const { readFile: read } = await import('node:fs/promises');
  const shipped = new URL('../public/assets/dcss-preview/', import.meta.url);
  const squashed = [];
  for (const path of requiredAssetPaths()) {
    if (!path.endsWith('.png')) continue;
    const file = new URL(path, shipped);
    if (!existsSync(file)) continue;
    // The PNG header: width and height are two big-endian 32-bit numbers at a
    // fixed offset, so no image library is needed to read them.
    const header = (await read(file)).subarray(16, 24);
    const width = header.readUInt32BE(0);
    const height = header.readUInt32BE(4);
    if (width !== height) squashed.push(`${path} ${width}×${height}`);
  }
  assert.deepEqual(squashed, [], 'these are stretched into squares when drawn');
});
