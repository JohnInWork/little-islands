/**
 * The complete list of sprite paths the game can request at runtime. The
 * adapter preloads exactly this list, and the itch.io packager copies only
 * these files out of the 3 383-image DCSS library, so both must agree here.
 */

import { CONTENT_PATHS } from './dcss-rpg-content.js';
import { allPlayerFoundationAssetPaths } from './dcss-rpg-player.js';
import { allEquipmentVisualAssetPaths } from './dcss-rpg-equipment-visuals.js';
import { allPlayerAppearanceAssetPaths } from './dcss-rpg-appearance.js';
import { allBiomeAssetPaths } from './dcss-rpg-visuals.js';
import { DISARMED_TRAP_PATH } from './dcss-rpg-trap-disarming.js';
import { allAmbientAssetPaths } from './dcss-rpg-ambient.js';
import { allEnvironmentAssetPaths } from './dcss-rpg-environment.js';
import { FIND_ASSET_PATHS } from './dcss-rpg-finds.js';
import { IDENTIFICATION_APPEARANCE_PATHS } from './dcss-rpg-identification.js';
import { PASSIVE_CREATURE_PATHS } from './dcss-rpg-passive.js';
import { MERCHANT_ACTOR_PATH, MERCHANT_ICON_PATH } from './dcss-rpg-merchant.js';
import { CAMP_ASSET_PATHS } from './dcss-rpg-camp.js';
import { CITY_ASSET_PATHS } from './dcss-rpg-city.js';
import { stashAssetPaths } from './dcss-rpg-stash.js';

/** Shallow water: the only liquid in the dungeon, animated between two frames. */
export const WATER_PATHS = Object.freeze(['dngn/water/shallow_water.png', 'dngn/water/shallow_water2.png']);

export const EFFECT_PATHS = Object.freeze([
  ...Array.from({ length: 6 }, (_, index) => `effect/magic_dart${index}.png`),
  'effect/orb_glow0.png',
  'effect/orb_glow1.png',
  ...Array.from({ length: 4 }, (_, index) => `effect/cloud_magic_trail${index}.png`),
]);

/** Every catalog-driven sprite; `extra` adds per-player visual overrides. */
export function requiredAssetPaths(extra = []) {
  return Object.freeze([...new Set([
    ...WATER_PATHS,
    ...allBiomeAssetPaths(),
    'dngn/doors/closed_door.png',
    'dngn/doors/open_door.png',
    DISARMED_TRAP_PATH,
    ...allPlayerFoundationAssetPaths(),
    ...allPlayerAppearanceAssetPaths(),
    ...allEquipmentVisualAssetPaths(),
    ...CONTENT_PATHS,
    ...IDENTIFICATION_APPEARANCE_PATHS,
    ...allAmbientAssetPaths(),
    ...allEnvironmentAssetPaths(),
    ...FIND_ASSET_PATHS,
    ...EFFECT_PATHS,
    ...PASSIVE_CREATURE_PATHS,
    ...CAMP_ASSET_PATHS,
    ...CITY_ASSET_PATHS,
    ...stashAssetPaths(),
    MERCHANT_ACTOR_PATH,
    MERCHANT_ICON_PATH,
    ...extra,
  ])]);
}
