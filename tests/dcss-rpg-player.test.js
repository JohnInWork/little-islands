import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASE_PLAYER_LAYER,
  composePlayerLayerStack,
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

test('a two-handed main-hand layer defensively suppresses the off-hand layer', () => {
  assert.deepEqual(composePlayerLayers({
    hand1Visual: { layer: 'battleaxe.png' },
    hand2Visual: { layer: 'shield.png' },
    twoHanded: true,
  }), [BASE_PLAYER_LAYER, 'battleaxe.png']);
});

test('appearance layers stay independent from equipment and hair hides under a helmet', () => {
  assert.deepEqual(composePlayerLayers({
    baseVisual: { layer: 'human-f.png' },
    hairVisual: { layer: 'hair-red.png' },
    bodyVisual: { layer: 'iron-armour.png' },
  }), ['human-f.png', 'iron-armour.png', 'hair-red.png']);

  assert.deepEqual(composePlayerLayers({
    baseVisual: { layer: 'human-f.png' },
    hairVisual: { layer: 'hair-red.png' },
    headVisual: { layer: 'iron-helm.png' },
    hideHair: true,
  }), ['human-f.png', 'iron-helm.png']);
});

test('the layer stack carries what each worn thing is made of', () => {
  const plain = composePlayerLayerStack();
  assert.deepEqual(plain, [{ path: BASE_PLAYER_LAYER, filter: null }]);
  const dressed = composePlayerLayerStack({
    bodyVisual: { layer: 'body', filter: 'sepia(1)' },
    hand1Visual: { layer: 'sword' },
    bootsVisual: { layer: 'boots', filter: 'brightness(0.5)' },
  });
  assert.deepEqual(
    dressed.map(({ path, filter }) => `${path}:${filter ?? '-'}`),
    [`${BASE_PLAYER_LAYER}:-`, 'boots:brightness(0.5)', 'body:sepia(1)', 'sword:-'],
  );
  // The flat list stays exactly what it was: most callers only need the paths.
  assert.deepEqual(
    composePlayerLayers({
      bodyVisual: { layer: 'body', filter: 'sepia(1)' },
      hand1Visual: { layer: 'sword' },
      bootsVisual: { layer: 'boots', filter: 'brightness(0.5)' },
    }),
    [BASE_PLAYER_LAYER, 'boots', 'body', 'sword'],
  );
});
