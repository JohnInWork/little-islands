import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASE_PLAYER_LAYER,
  composePlayerLayers,
} from '../tools/dcss-rpg-player.js';

test('an unequipped hero renders only the anatomical base layer', () => {
  assert.deepEqual(composePlayerLayers(), [BASE_PLAYER_LAYER]);
});

test('cloak, belt and gloves are independent visible equipment layers', () => {
  const dressedLayers = composePlayerLayers({
    cloakVisual: { layer: 'cloak.png' },
    bodyVisual: { layer: 'body.png' },
    beltVisual: { layer: 'belt.png' },
    glovesVisual: { layer: 'gloves.png' },
  });
  assert.deepEqual(dressedLayers, [
    'cloak.png',
    BASE_PLAYER_LAYER,
    'belt.png',
    'body.png',
    'gloves.png',
  ]);

  const bodyOnly = composePlayerLayers({
    bodyVisual: { layer: 'body.png' },
  });
  assert.deepEqual(bodyOnly, [BASE_PLAYER_LAYER, 'body.png']);
});
