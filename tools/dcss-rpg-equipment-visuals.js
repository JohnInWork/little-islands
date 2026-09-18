const visibleSlots = new Set([
  'cloak',
  'body',
  'belt',
  'boots',
  'gloves',
  'head',
  'hand1',
  'hand2',
]);

export const EQUIPMENT_VISUALS = Object.freeze({
  'short-blade': Object.freeze({
    icon: 'item/weapon/dagger.png',
    layer: 'player/hand1/short_sword_slant.png',
    offhandLayer: 'player/hand2/misc/dagger.png',
  }),
  'rusty-sword': Object.freeze({
    icon: 'item/weapon/short_sword3.png',
    layer: 'player/hand1/short_sword_slant3.png',
    offhandLayer: 'player/hand2/misc/short_sword_slant2.png',
    iconVariants: Object.freeze(['item/weapon/short_sword1.png', 'item/weapon/short_sword2.png']),
  }),
  // A body item may add `legsLayer`: trousers drawn under the shirt and boots.
  'worn-tunic': Object.freeze({
    icon: 'item/armour/robe1.png',
    layer: 'player/body/shirt_white1.png',
    legsLayer: 'player/legs/pants_brown.png',
    iconVariants: Object.freeze(['item/armour/robe2.png']),
  }),
  'bone-dirk': Object.freeze({
    icon: 'item/weapon/dagger3.png',
    layer: 'player/hand1/dagger_slant.png',
    offhandLayer: 'player/hand2/misc/dagger.png',
  }),
  'spriggan-knife': Object.freeze({
    icon: 'item/weapon/artefact/urand_spriggans_knife.png',
    layer: 'player/hand1/artefact/spriggans_knife.png',
    offhandLayer: 'player/hand2/misc/dagger.png',
  }),
  'oak-club': Object.freeze({
    icon: 'item/weapon/club.png',
    layer: 'player/hand1/club_slant.png',
    offhandLayer: 'player/hand2/misc/giant_club_plain.png',
    iconVariants: Object.freeze(['item/weapon/club2.png']),
  }),
  'iron-mace': Object.freeze({
    icon: 'item/weapon/mace1.png',
    layer: 'player/hand1/mace.png',
    offhandLayer: 'player/hand2/misc/great_mace.png',
    iconVariants: Object.freeze(['item/weapon/mace2.png', 'item/weapon/mace3.png']),
  }),
  'morning-star': Object.freeze({
    icon: 'item/weapon/morningstar2.png',
    layer: 'player/hand1/morningstar_two.png',
    iconVariants: Object.freeze(['item/weapon/morningstar1.png', 'item/weapon/morningstar3.png']),
  }),
  'hunting-spear': Object.freeze({
    icon: 'item/weapon/spear1.png',
    layer: 'player/hand1/spear.png',
    offhandLayer: 'player/hand2/misc/dagger.png',
  }),
  'war-pike': Object.freeze({
    icon: 'item/weapon/spear2.png',
    layer: 'player/hand1/spear_two.png',
  }),
  'short-bow': Object.freeze({
    icon: 'item/weapon/ranged/shortbow1.png',
    layer: 'player/hand1/bow_two.png',
    iconVariants: Object.freeze(['item/weapon/ranged/shortbow2.png', 'item/weapon/ranged/shortbow3.png']),
  }),
  'scimitar': Object.freeze({
    icon: 'item/weapon/scimitar1.png',
    layer: 'player/hand1/scimitar.png',
    iconVariants: Object.freeze(['item/weapon/scimitar3.png']),
  }),
  'double-sword': Object.freeze({
    icon: 'item/weapon/double_sword.png',
    layer: 'player/hand1/double_sword.png',
    iconVariants: Object.freeze(['item/weapon/double_sword2.png', 'item/weapon/double_sword3.png']),
  }),
  'triple-sword': Object.freeze({
    icon: 'item/weapon/triple_sword.png',
    layer: 'player/hand1/triple_sword.png',
    iconVariants: Object.freeze(['item/weapon/triple_sword2.png', 'item/weapon/triple_sword3.png']),
  }),
  'war-scythe': Object.freeze({
    icon: 'item/weapon/scythe1.png',
    layer: 'player/hand1/scythe.png',
    iconVariants: Object.freeze(['item/weapon/scythe2.png', 'item/weapon/scythe3.png']),
  }),
  'iron-flail': Object.freeze({
    icon: 'item/weapon/flail1.png',
    layer: 'player/hand1/flail_ball.png',
    iconVariants: Object.freeze(['item/weapon/flail2.png', 'item/weapon/flail3.png']),
  }),
  'eveningstar': Object.freeze({
    icon: 'item/weapon/eveningstar1.png',
    layer: 'player/hand1/eveningstar.png',
    iconVariants: Object.freeze(['item/weapon/eveningstar2.png', 'item/weapon/eveningstar3.png']),
  }),
  'dire-flail': Object.freeze({
    icon: 'item/weapon/dire_flail1.png',
    layer: 'player/hand1/flail_great.png',
    iconVariants: Object.freeze(['item/weapon/dire_flail2.png', 'item/weapon/dire_flail3.png']),
  }),
  'spiked-club': Object.freeze({
    icon: 'item/weapon/giant_spiked_club.png',
    layer: 'player/hand1/giant_club_spike.png',
    iconVariants: Object.freeze(['item/weapon/giant_spiked_club2.png', 'item/weapon/giant_spiked_club3.png']),
  }),
  'light-crossbow': Object.freeze({
    icon: 'item/weapon/ranged/hand_crossbow.png',
    layer: 'player/hand1/hand_crossbow.png',
    iconVariants: Object.freeze(['item/weapon/ranged/hand_crossbow3.png']),
  }),
  arbalest: Object.freeze({
    icon: 'item/weapon/ranged/arbalest1.png',
    layer: 'player/hand1/arbalest_two.png',
    iconVariants: Object.freeze(['item/weapon/ranged/arbalest2.png', 'item/weapon/ranged/arbalest3.png']),
  }),
  'hand-crossbow': Object.freeze({
    icon: 'item/weapon/ranged/hand_crossbow2.png',
    layer: 'player/hand1/hand_crossbow.png',
  }),
  sling: Object.freeze({
    icon: 'item/weapon/ranged/sling1.png',
    layer: 'player/hand1/sling.png',
    iconVariants: Object.freeze(['item/weapon/ranged/sling2.png']),
  }),
  greatsling: Object.freeze({
    icon: 'item/weapon/ranged/greatsling.png',
    layer: 'player/hand1/greatsling.png',
    iconVariants: Object.freeze(['item/weapon/ranged/greatsling2.png']),
  }),
  bullwhip: Object.freeze({
    icon: 'item/weapon/bullwhip.png',
    layer: 'player/hand1/whip.png',
    iconVariants: Object.freeze(['item/weapon/bullwhip2.png']),
  }),
  'barbed-whip': Object.freeze({
    icon: 'item/weapon/bullwhip3.png',
    layer: 'player/hand1/whip2.png',
  }),
  'long-sword': Object.freeze({
    icon: 'item/weapon/long_sword1.png',
    layer: 'player/hand1/long_sword_slant2.png',
    offhandLayer: 'player/hand2/misc/short_sword_slant2.png',
    iconVariants: Object.freeze(['item/weapon/long_sword3.png']),
  }),
  'duelist-rapier': Object.freeze({
    icon: 'item/weapon/rapier1.png',
    layer: 'player/hand1/rapier2.png',
    offhandLayer: 'player/hand2/misc/rapier2.png',
    iconVariants: Object.freeze(['item/weapon/rapier2.png', 'item/weapon/rapier3.png']),
  }),
  'iron-falchion': Object.freeze({
    icon: 'item/weapon/falchion2.png', layer: 'player/hand1/falchion2.png',
    iconVariants: Object.freeze(['item/weapon/falchion1.png', 'item/weapon/falchion3.png']),
  }),
  'dungeon-greatsword': Object.freeze({
    icon: 'item/weapon/greatsword1.png', layer: 'player/hand1/great_sword_slant2.png',
    iconVariants: Object.freeze(['item/weapon/greatsword3.png']),
  }),
  'sword-of-power': Object.freeze({
    icon: 'item/weapon/artefact/spwpn_sword_of_power.png',
    layer: 'player/hand1/artefact/sword_of_power.png',
  }),
  'executioner-axe': Object.freeze({
    icon: 'item/weapon/hand_axe1.png', layer: 'player/hand1/axe_executioner2.png',
    iconVariants: Object.freeze(['item/weapon/hand_axe3.png']),
  }),
  'apprentice-staff': Object.freeze({
    icon: 'item/staff/staff01.png', layer: 'player/hand1/quarterstaff.png',
    iconVariants: Object.freeze(['item/staff/staff02.png', 'item/staff/staff03.png']),
  }),
  'channeling-staff': Object.freeze({
    icon: 'item/staff/i-staff_channeling.png', layer: 'player/hand1/staff_mage.png',
  }),
  'skull-staff': Object.freeze({
    icon: 'item/staff/staff00.png', layer: 'player/hand1/staff_skull.png',
    iconVariants: Object.freeze(['item/staff/staff04.png', 'item/staff/staff05.png']),
  }),
  'war-axe': Object.freeze({
    icon: 'item/weapon/hand_axe2.png', layer: 'player/hand1/hand_axe2.png',
  }),
  'storm-trident': Object.freeze({
    icon: 'item/weapon/spear3.png', layer: 'player/hand1/trident_elec.png',
  }),
  firestarter: Object.freeze({
    icon: 'item/weapon/artefact/urand_firestarter.png',
    layer: 'player/hand1/artefact/firestarter.png',
  }),
  longbow: Object.freeze({
    icon: 'item/weapon/ranged/longbow1.png', layer: 'player/hand1/bow_three.png',
    iconVariants: Object.freeze(['item/weapon/ranged/longbow2.png', 'item/weapon/ranged/longbow3.png']),
  }),
  'heavy-leather': Object.freeze({
    icon: 'item/armour/leather_armour1.png', layer: 'player/body/leather_heavy.png',
  }),
  'black-plate': Object.freeze({
    icon: 'item/armour/plate1.png', layer: 'player/body/plate_black.png',
  }),
  'shadow-scales': Object.freeze({
    icon: 'item/armour/shadow_dragon_scale_mail.png',
    iconVariants: Object.freeze(['item/armour/shadow_dragon_scales.png']), layer: 'player/body/dragonarm_shadow.png',
  }),
  'runic-robe': Object.freeze({
    icon: 'item/armour/robe_art1.png', layer: 'player/body/robe_black_gold.png',
  }),
  'half-plate': Object.freeze({
    icon: 'item/armour/scale_mail1.png', layer: 'player/body/half_plate.png',
    iconVariants: Object.freeze(['item/armour/scale_mail2.png', 'item/armour/scale_mail3.png']),
  }),
  'blood-robe': Object.freeze({
    icon: 'item/armour/robe_art2.png', layer: 'player/body/robe_red_gold.png',
  }),
  'silver-scales': Object.freeze({
    icon: 'item/armour/silver_dragon_scale_mail.png', layer: 'player/body/dragonarm_white.png',
  }),
  'swamp-dragon-scales': Object.freeze({
    icon: 'item/armour/swamp_dragon_armour.png',
    layer: 'player/body/dragonarm_brown.png',
    iconVariants: Object.freeze(['item/armour/swamp_dragon_hide.png']),
  }),
  'mottled-dragon-scales': Object.freeze({
    icon: 'item/armour/mottled_dragon_armour.png',
    layer: 'player/body/dragonarm_magenta.png',
    iconVariants: Object.freeze(['item/armour/mottled_dragon_hide.png']),
  }),
  'blue-dragon-scales': Object.freeze({
    icon: 'item/armour/blue_dragon_scale_mail.png',
    layer: 'player/body/dragonarm_blue.png',
    iconVariants: Object.freeze(['item/armour/blue_dragon_scales.png']),
  }),
  'ice-dragon-scales': Object.freeze({
    icon: 'item/armour/ice_dragon_armour.png',
    layer: 'player/body/dragonarm_cyan.png',
    iconVariants: Object.freeze(['item/armour/ice_dragon_hide.png']),
  }),
  'gold-dragon-scales': Object.freeze({
    icon: 'item/armour/gold_dragon_armour.png',
    layer: 'player/body/dragonarm_gold.png',
    iconVariants: Object.freeze(['item/armour/gold_dragon_hide.png']),
  }),
  'quicksilver-dragon-scales': Object.freeze({
    icon: 'item/armour/quicksilver_dragon_scale_mail.png',
    layer: 'player/body/dragonarm_quicksilver.png',
    iconVariants: Object.freeze(['item/armour/quicksilver_dragon_scales.png']),
  }),
  'pearl-dragon-scales': Object.freeze({
    icon: 'item/armour/pearl_dragon_armour.png',
    layer: 'player/body/dragonarm_pearl.png',
    iconVariants: Object.freeze(['item/armour/pearl_dragon_hide.png']),
  }),
  'living-vines': Object.freeze({
    icon: 'item/armour/artefact/urand_vines.png', layer: 'player/body/vines.png',
  }),
  'iron-helm': Object.freeze({
    icon: 'item/armour/headgear/helmet1.png', layer: 'player/head/fhelm_gray3.png',
    iconVariants: Object.freeze(['item/armour/headgear/helmet2.png', 'item/armour/headgear/helmet3.png']),
  }),
  'horned-helm': Object.freeze({
    icon: 'item/armour/headgear/helmet_art1.png', layer: 'player/head/fhelm_horn2.png',
  }),
  'golden-viking': Object.freeze({
    icon: 'item/armour/headgear/helmet_art2.png', layer: 'player/head/viking_gold.png',
  }),
  'ancient-crown': Object.freeze({
    icon: 'item/armour/headgear/helmet_art3.png', layer: 'player/head/crown_gold2.png',
  }),
  jackboots: Object.freeze({
    icon: 'item/armour/boots2_jackboots.png', layer: 'player/boots/middle_gray.png',
  }),
  'green-boots': Object.freeze({
    icon: 'item/armour/boots4_green.png', layer: 'player/boots/middle_green.png',
  }),
  'spider-boots': Object.freeze({
    icon: 'item/armour/boots3_stripe.png', layer: 'player/boots/middle_brown2.png',
  }),
  'golden-boots': Object.freeze({
    icon: 'item/armour/boots1_brown.png', layer: 'player/boots/middle_gold.png',
  }),
  'travel-cloak': Object.freeze({
    icon: 'item/armour/cloak1_leather.png', layer: 'player/cloak/black.png',
  }),
  'tide-cloak': Object.freeze({
    icon: 'item/armour/cloak2.png', layer: 'player/cloak/blue.png',
    iconVariants: Object.freeze(['item/armour/cloak4.png']),
  }),
  'dragon-cloak': Object.freeze({
    icon: 'item/armour/cloak3.png', layer: 'player/cloak/dragonskin.png',
  }),
  'ratskin-cloak': Object.freeze({
    icon: 'item/armour/artefact/urand_ratskin_cloak.png', layer: 'player/cloak/ratskin.png',
  }),
  'leather-gloves': Object.freeze({
    icon: 'item/armour/glove1.png', layer: 'player/gloves/glove_black.png',
    iconVariants: Object.freeze(['item/armour/glove4.png']),
  }),
  'iron-gloves': Object.freeze({
    icon: 'item/armour/glove2.png', layer: 'player/gloves/glove_gray.png',
  }),
  'golden-gauntlets': Object.freeze({
    icon: 'item/armour/glove3.png', layer: 'player/gloves/glove_gold.png',
  }),
  'beast-claws': Object.freeze({
    icon: 'item/armour/glove5.png', layer: 'player/gloves/claws.png',
  }),
  'iron-belt': Object.freeze({
    icon: 'player/legs/belt_gray.png', layer: 'player/legs/belt_gray.png',
  }),
  'hunter-belt': Object.freeze({
    icon: 'player/legs/belt_redbrown.png', layer: 'player/legs/belt_redbrown.png',
  }),
  'runic-belt': Object.freeze({
    icon: 'player/body/belt1.png', layer: 'player/body/belt1.png',
  }),
  'titan-belt': Object.freeze({
    icon: 'player/body/belt2.png', layer: 'player/body/belt2.png',
  }),
  'regeneration-ring': Object.freeze({ icon: 'item/ring/tourmaline.png', layer: null }),
  'fire-ring': Object.freeze({ icon: 'item/ring/ruby.png', layer: null }),
  'ice-ring': Object.freeze({ icon: 'item/amulet/ring_cyan.png', layer: null }),
  'slaying-ring': Object.freeze({ icon: 'item/ring/artefact/urand_octoring.png', layer: null }),
  'antidote-ring': Object.freeze({ icon: 'item/amulet/ring_green.png', layer: null }),
  'vitality-amulet': Object.freeze({
    icon: 'item/amulet/artefact/urand_vitality.png', layer: null,
  }),
  'spirit-amulet': Object.freeze({ icon: 'item/amulet/i-spirit.png', layer: null }),
  'wood-buckler': Object.freeze({
    icon: 'item/armour/shields/buckler1.png', layer: 'player/hand2/buckler_green.png',
    iconVariants: Object.freeze(['item/armour/shields/buckler2.png', 'item/armour/shields/buckler3.png']),
  }),
  'round-shield': Object.freeze({
    icon: 'item/armour/shields/shield1.png', layer: 'player/hand2/shield_knight_gray.png',
    iconVariants: Object.freeze(['item/armour/shields/shield2.png']),
  }),
  'tower-shield': Object.freeze({
    icon: 'item/armour/shields/large_shield1.png', layer: 'player/hand2/lshield_quartered.png',
    iconVariants: Object.freeze(['item/armour/shields/large_shield2.png', 'item/armour/shields/large_shield3.png']),
  }),
  'spiked-shield': Object.freeze({
    icon: 'item/armour/shields/shield3.png', layer: 'player/hand2/shield_bullseye.png',
  }),
  // An amulet is not drawn on the hero; the paperdoll has no neck layer.
  'copper-charm': Object.freeze({ icon: 'item/amulet/celtic_red.png', layer: null }),
  'hush-amulet': Object.freeze({ icon: 'item/amulet/eye_cyan.png', layer: null }),
  'dead-book': Object.freeze({
    icon: 'item/book/book_of_the_dead.png', layer: 'player/hand2/misc/book_red.png',
  }),
});

export function equipmentVisualForItem(item, renderedSlot = item?.slot) {
  const visual = item?.id ? EQUIPMENT_VISUALS[item.id] ?? null : null;
  if (!visual) return null;
  if (renderedSlot === 'hand2' && item.slot === 'hand1' && item.hands === 1) {
    if (!visual.layer) return null;
    return Object.freeze({
      ...visual,
      layer: visual.offhandLayer ?? `mirror:${visual.layer}`,
    });
  }
  return visual;
}

export function equipmentVisualProblems(items) {
  const problems = [];
  const ids = new Set();
  // Two items may never share a silhouette: the icon is how the player tells
  // one thing from another before opening anything.
  const claimed = new Map();
  for (const [id, visual] of Object.entries(EQUIPMENT_VISUALS)) {
    for (const path of [visual.icon, ...(visual.iconVariants ?? [])].filter(Boolean)) {
      if (claimed.has(path) && claimed.get(path) !== id) {
        problems.push(`${id}:sprite-shared-with-${claimed.get(path)}`);
      }
      claimed.set(path, id);
    }
  }
  for (const item of items) {
    if (!item?.slot) continue;
    ids.add(item.id);
    const visual = EQUIPMENT_VISUALS[item.id];
    if (!visual) {
      problems.push(`${item.id}:missing`);
      continue;
    }
    if (visual.icon !== item.icon) problems.push(`${item.id}:icon`);
    if (visibleSlots.has(item.slot) && !visual.layer) problems.push(`${item.id}:layer`);
  }
  for (const id of Object.keys(EQUIPMENT_VISUALS)) {
    if (!ids.has(id)) problems.push(`${id}:orphan`);
  }
  return problems.sort();
}

export function allEquipmentVisualAssetPaths() {
  return [...new Set(Object.values(EQUIPMENT_VISUALS).flatMap((visual) => [
    visual.icon,
    ...(visual.iconVariants ?? []),
    visual.layer,
    visual.offhandLayer,
    visual.legsLayer,
  ]).filter(Boolean))].sort();
}

function spriteHash(text) {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return (value ^ (value >>> 15)) >>> 0;
}

/**
 * Which of its silhouettes this particular thing is drawn with. The choice is a
 * hash of the instance, so it is stable across a reload and never stored: the
 * uid is already in the save, and one more field would be one more thing to
 * migrate.
 */
export function itemSpriteFor(item) {
  const variants = itemSpriteVariants(item);
  if (variants.length <= 1) return variants[0] ?? item?.icon ?? null;
  const identity = item?.uid ?? item?.instanceId ?? item?.id ?? '';
  return variants[spriteHash(`${identity}:${item?.id ?? ''}`) % variants.length];
}

/**
 * Every silhouette an item can be drawn with, its catalogue icon first. A form
 * that has alternates is not a different item — it is the same thing forged by
 * a different hand, so the shape stays inside its own family.
 */
export function itemSpriteVariants(item) {
  const visual = EQUIPMENT_VISUALS[item?.id];
  if (!visual?.icon) return [];
  return [visual.icon, ...(visual.iconVariants ?? [])];
}
