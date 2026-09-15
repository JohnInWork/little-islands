import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';

import {
  PLAYER_APPEARANCE_STORAGE_KEY,
  PLAYER_BODY_OPTIONS,
  PLAYER_HAIR_OPTIONS,
  allPlayerAppearanceAssetPaths,
  createPlayerAppearance,
  cyclePlayerAppearance,
  loadPlayerAppearance,
  parsePlayerAppearance,
  resolvePlayerAppearance,
  savePlayerAppearance,
} from '../tools/dcss-rpg-appearance.js';

test('simple appearance profile cycles only compatible humanoid layers', () => {
  const initial = createPlayerAppearance();
  const nextBody = cyclePlayerAppearance(initial, 'body', 1);
  const nextHair = cyclePlayerAppearance(initial, 'hair', 1);

  assert.equal(PLAYER_BODY_OPTIONS.length, 2);
  assert.ok(PLAYER_HAIR_OPTIONS.length >= 8);
  assert.notEqual(nextBody.bodyId, initial.bodyId);
  assert.notEqual(nextHair.hairId, initial.hairId);
  assert.match(resolvePlayerAppearance(nextBody).body.layer, /^player\/base\/human_[mf]\.png$/);
  assert.deepEqual(cyclePlayerAppearance(nextBody, 'body', 1), initial);
});

test('appearance persists outside the run save and malformed profiles fall back safely', () => {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const appearance = createPlayerAppearance({ bodyId: 'human-f', hairId: 'red' });
  assert.equal(savePlayerAppearance(appearance, storage), true);
  assert.deepEqual(loadPlayerAppearance(storage), appearance);
  assert.deepEqual([...data.keys()], [PLAYER_APPEARANCE_STORAGE_KEY]);
  assert.deepEqual(parsePlayerAppearance('{broken'), createPlayerAppearance());
});

test('every curated appearance layer ships in the local CC0 library', async () => {
  await Promise.all(allPlayerAppearanceAssetPaths().map((path) =>
    access(new URL(`../public/assets/dcss-preview/${path}`, import.meta.url))));
});
