export const BASE_PLAYER_LAYER = 'player/base/human_m.png';

export function composePlayerLayers({
  cloakVisual = null,
  bodyVisual = null,
  beltVisual = null,
  bootsVisual = null,
  glovesVisual = null,
  headVisual = null,
  hand1Visual = null,
  hand2Visual = null,
} = {}) {
  return [
    cloakVisual?.layer,
    BASE_PLAYER_LAYER,
    beltVisual?.layer,
    bootsVisual?.layer,
    bodyVisual?.layer,
    glovesVisual?.layer,
    headVisual?.layer,
    hand1Visual?.layer,
    hand2Visual?.layer,
  ].filter(Boolean);
}

export function allPlayerFoundationAssetPaths() {
  return [BASE_PLAYER_LAYER];
}
