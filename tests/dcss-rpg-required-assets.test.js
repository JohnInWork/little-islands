import assert from 'node:assert/strict';
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
test('no picture is drawn that was never asked for', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const loaded = new Set(requiredAssetPaths());
  // Asset paths in the adapter are written as plain relative strings.
  const drawn = [...runtime.matchAll(/'((?:[a-z0-9_\-.]+\/)+[a-z0-9_\-.]+\.png)'/gi)]
    .map(([, path]) => path);
  assert.ok(drawn.length > 0, 'the adapter names no pictures at all');
  const missing = [...new Set(drawn)].filter((path) => !loaded.has(path));
  assert.deepEqual(missing, [], `never loaded: ${missing.join(', ')}`);
});
