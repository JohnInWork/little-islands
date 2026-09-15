import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  VISUAL_OVERRIDES_STORAGE_KEY,
  createVisualOverrides,
  loadVisualOverrides,
  parseVisualOverrides,
  removeVisualOverride,
  resolveVisualBinding,
  saveVisualOverrides,
  setVisualOverride,
  validateVisualOverrides,
  visualBindingKey,
  visualOverridePaths,
} from '../tools/dcss-rpg-visual-overrides.js';

test('visual bindings keep gameplay ids separate from local sprite paths', () => {
  const key = visualBindingKey('find', 'sealed-cache');
  const initial = createVisualOverrides();
  const changed = setVisualOverride(initial, key, {
    path: 'dngn/vaults/sarcophagus_sealed.png',
    scale: 1.35,
    offsetY: -6,
  });
  assert.equal(Object.keys(initial.bindings).length, 0);
  assert.deepEqual(resolveVisualBinding(changed, key, {
    path: 'item/misc/misc_box.png', scale: 1, offsetY: -7,
  }), {
    path: 'dngn/vaults/sarcophagus_sealed.png', scale: 1.35, offsetY: -6,
  });
  assert.deepEqual(resolveVisualBinding(removeVisualOverride(changed, key), key, {
    path: 'item/misc/misc_box.png', scale: 1, offsetY: -7,
  }), {
    path: 'item/misc/misc_box.png', scale: 1, offsetY: -7,
  });
});

test('visual override documents reject remote, escaping and malformed assignments', () => {
  const base = { version: 1, bindings: {} };
  for (const path of ['https://example.com/a.png', '../secret.png', '/absolute.png', 'mon/goblin.svg']) {
    assert.equal(validateVisualOverrides({
      ...base,
      bindings: { 'monster:goblin:world': { path, scale: 1, offsetY: 0 } },
    }), false, path);
  }
  assert.throws(() => visualBindingKey('unknown', 'goblin'));
  assert.throws(() => setVisualOverride(createVisualOverrides(), 'monster:goblin:world', {
    path: 'mon/goblin.png', scale: 8, offsetY: 0,
  }));
  assert.deepEqual(parseVisualOverrides('{broken'), createVisualOverrides());
});

test('browser storage round-trips one strict document without touching run saves', () => {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const document = setVisualOverride(createVisualOverrides(), 'monster:goblin:world', {
    path: 'mon/orc.png', scale: 1.1, offsetY: -2,
  });
  assert.equal(saveVisualOverrides(document, storage), true);
  assert.deepEqual(loadVisualOverrides(storage), document);
  assert.deepEqual([...data.keys()], [VISUAL_OVERRIDES_STORAGE_KEY]);
  assert.deepEqual(visualOverridePaths(document), ['mon/orc.png']);
});

test('generated workshop manifest exposes the full local sprite library', () => {
  const manifest = JSON.parse(readFileSync(
    new URL('../public/assets/dcss-preview/sprite-manifest.json', import.meta.url),
    'utf8',
  ));
  assert.equal(manifest.version, 1);
  assert.ok(manifest.count >= 3383);
  assert.equal(manifest.count, manifest.paths.length);
  assert.equal(new Set(manifest.paths).size, manifest.paths.length);
  assert.ok(manifest.paths.includes('dngn/traps/net.png'));
  assert.ok(manifest.paths.includes('mon/goblin.png'));
  assert.ok(manifest.paths.includes('item/weapon/long_sword1.png'));
  assert.ok(manifest.paths.includes('licensed/cmski-chests/wooden/1.png'));
});

test('workshop ships responsive search, compatibility filtering and import-export controls', () => {
  const html = readFileSync(new URL('../tools/sprites.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../tools/sprites.css', import.meta.url), 'utf8');
  const script = readFileSync(new URL('../tools/sprites.js', import.meta.url), 'utf8');
  assert.match(html, /id="entity-search"/);
  assert.match(html, /id="asset-search"/);
  assert.match(html, /id="compatible-only"/);
  assert.match(html, /id="import-bindings"/);
  assert.match(html, /id="export-bindings"/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /image-rendering: pixelated/);
  assert.match(script, /PAGE_SIZE = 120/);
  assert.match(script, /SEARCH_SYNONYMS/);
  assert.match(script, /assetPathSet\.has\(path\)/);
});

test('the game runtime resolves overrides for every rendered entity family', () => {
  const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  for (const family of ['monster', 'passive', 'loot', 'event', 'find', 'trap', 'system']) {
    assert.match(runtime, new RegExp(`runtimeVisual\\(\\s*'${family}'`), family);
  }
  assert.match(runtime, /visualOverridePaths\(visualOverrides\)/);
  assert.match(runtime, /wallTextureAt[\s\S]*doorPanelVisual\.path/);
  assert.match(runtime, /monster\.visualScale/);
  assert.match(runtime, /find\.definition\.visualScale/);
  assert.match(runtime, /displayItem\.visualScale/);
  assert.match(runtime, /findSpritePath\(find\)/);
  assert.match(runtime, /find\.resolvedAt = elapsed/);
});
