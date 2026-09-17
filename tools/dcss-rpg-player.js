export const BASE_PLAYER_LAYER = 'player/base/human_m.png';

export function composePlayerLayers({
  baseVisual = null,
  hairVisual = null,
  cloakVisual = null,
  bodyVisual = null,
  beltVisual = null,
  bootsVisual = null,
  glovesVisual = null,
  headVisual = null,
  hand1Visual = null,
  hand2Visual = null,
  twoHanded = false,
  hideHair = false,
} = {}) {
  return [
    cloakVisual?.layer,
    baseVisual?.layer ?? BASE_PLAYER_LAYER,
    // Trousers belong to the body item and sit under belt, boots and shirt.
    bodyVisual?.legsLayer,
    beltVisual?.layer,
    bootsVisual?.layer,
    bodyVisual?.layer,
    glovesVisual?.layer,
    hideHair ? null : hairVisual?.layer,
    headVisual?.layer,
    hand1Visual?.layer,
    twoHanded ? null : hand2Visual?.layer,
  ].filter(Boolean);
}

export function allPlayerFoundationAssetPaths() {
  return [BASE_PLAYER_LAYER];
}
