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
  return composePlayerLayerStack({
    baseVisual,
    hairVisual,
    cloakVisual,
    bodyVisual,
    beltVisual,
    bootsVisual,
    glovesVisual,
    headVisual,
    hand1Visual,
    hand2Visual,
    twoHanded,
    hideHair,
  }).map(({ path }) => path);
}

/**
 * The same stack, but each layer keeps the recolouring of the thing it came
 * from. A worn item is made of something, and the hero should be seen wearing
 * that something rather than the sprite sheet's own colour.
 *
 * `composePlayerLayers` stays the flat list of paths, because most callers only
 * need to know what is drawn, not how.
 */
export function composePlayerLayerStack({
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
  const layer = (path, visual) => (path ? { path, filter: visual?.filter ?? null } : null);
  return [
    layer(cloakVisual?.layer, cloakVisual),
    layer(baseVisual?.layer ?? BASE_PLAYER_LAYER, baseVisual),
    // Trousers belong to the body item and sit under belt, boots and shirt.
    layer(bodyVisual?.legsLayer, bodyVisual),
    layer(beltVisual?.layer, beltVisual),
    layer(bootsVisual?.layer, bootsVisual),
    layer(bodyVisual?.layer, bodyVisual),
    layer(glovesVisual?.layer, glovesVisual),
    hideHair ? null : layer(hairVisual?.layer, hairVisual),
    layer(headVisual?.layer, headVisual),
    layer(hand1Visual?.layer, hand1Visual),
    twoHanded ? null : layer(hand2Visual?.layer, hand2Visual),
  ].filter(Boolean);
}

export function allPlayerFoundationAssetPaths() {
  return [BASE_PLAYER_LAYER];
}
