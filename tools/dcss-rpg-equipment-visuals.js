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
  }),
  // A body item may add `legsLayer`: trousers drawn under the shirt and boots.
  'worn-tunic': Object.freeze({
    icon: 'item/armour/robe1.png',
    layer: 'player/body/shirt_white1.png',
    legsLayer: 'player/legs/pants_brown.png',
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
  }),
  'iron-mace': Object.freeze({
    icon: 'item/weapon/mace1.png',
    layer: 'player/hand1/mace.png',
    offhandLayer: 'player/hand2/misc/great_mace.png',
  }),
  'morning-star': Object.freeze({
    icon: 'item/weapon/morningstar2.png',
    layer: 'player/hand1/morningstar_two.png',
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
  }),
  'light-crossbow': Object.freeze({
    icon: 'item/weapon/ranged/hand_crossbow.png',
    layer: 'player/hand1/hand_crossbow.png',
  }),
  arbalest: Object.freeze({
    icon: 'item/weapon/ranged/arbalest1.png',
    layer: 'player/hand1/arbalest_two.png',
  }),
  'hand-crossbow': Object.freeze({
    icon: 'item/weapon/ranged/hand_crossbow2.png',
    layer: 'player/hand1/hand_crossbow.png',
  }),
  sling: Object.freeze({
    icon: 'item/weapon/ranged/sling1.png',
    layer: 'player/hand1/sling.png',
  }),
  greatsling: Object.freeze({
    icon: 'item/weapon/ranged/greatsling.png',
    layer: 'player/hand1/greatsling.png',
  }),
  bullwhip: Object.freeze({
    icon: 'item/weapon/bullwhip.png',
    layer: 'player/hand1/whip.png',
  }),
  'barbed-whip': Object.freeze({
    icon: 'item/weapon/bullwhip3.png',
    layer: 'player/hand1/whip2.png',
  }),
  'long-sword': Object.freeze({
    icon: 'item/weapon/long_sword1.png',
    layer: 'player/hand1/long_sword_slant2.png',
    offhandLayer: 'player/hand2/misc/short_sword_slant2.png',
  }),
  'duelist-rapier': Object.freeze({
    icon: 'item/weapon/rapier1.png',
    layer: 'player/hand1/rapier2.png',
    offhandLayer: 'player/hand2/misc/rapier2.png',
  }),
  'iron-falchion': Object.freeze({
    icon: 'item/weapon/falchion2.png', layer: 'player/hand1/falchion2.png',
  }),
  'dungeon-greatsword': Object.freeze({
    icon: 'item/weapon/greatsword1.png', layer: 'player/hand1/great_sword_slant2.png',
  }),
  'sword-of-power': Object.freeze({
    icon: 'item/weapon/artefact/spwpn_sword_of_power.png',
    layer: 'player/hand1/artefact/sword_of_power.png',
  }),
  'executioner-axe': Object.freeze({
    icon: 'item/weapon/hand_axe1.png', layer: 'player/hand1/axe_executioner2.png',
  }),
  'apprentice-staff': Object.freeze({
    icon: 'item/staff/staff01.png', layer: 'player/hand1/quarterstaff.png',
  }),
  'channeling-staff': Object.freeze({
    icon: 'item/staff/i-staff_channeling.png', layer: 'player/hand1/staff_mage.png',
  }),
  'skull-staff': Object.freeze({
    icon: 'item/staff/staff00.png', layer: 'player/hand1/staff_skull.png',
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
  }),
  'heavy-leather': Object.freeze({
    icon: 'item/armour/leather_armour1.png', layer: 'player/body/leather_heavy.png',
  }),
  'black-plate': Object.freeze({
    icon: 'item/armour/plate1.png', layer: 'player/body/plate_black.png',
  }),
  'shadow-scales': Object.freeze({
    icon: 'item/armour/blue_dragon_scale_mail.png', layer: 'player/body/dragonarm_shadow.png',
  }),
  'runic-robe': Object.freeze({
    icon: 'item/armour/robe_art1.png', layer: 'player/body/robe_black_gold.png',
  }),
  'half-plate': Object.freeze({
    icon: 'item/armour/scale_mail1.png', layer: 'player/body/half_plate.png',
  }),
  'blood-robe': Object.freeze({
    icon: 'item/armour/robe_art2.png', layer: 'player/body/robe_red_gold.png',
  }),
  'silver-scales': Object.freeze({
    icon: 'item/armour/silver_dragon_scale_mail.png', layer: 'player/body/dragonarm_white.png',
  }),
  'living-vines': Object.freeze({
    icon: 'item/armour/artefact/urand_vines.png', layer: 'player/body/vines.png',
  }),
  'iron-helm': Object.freeze({
    icon: 'item/armour/headgear/helmet1.png', layer: 'player/head/fhelm_gray3.png',
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
  }),
  'dragon-cloak': Object.freeze({
    icon: 'item/armour/cloak3.png', layer: 'player/cloak/dragonskin.png',
  }),
  'ratskin-cloak': Object.freeze({
    icon: 'item/armour/artefact/urand_ratskin_cloak.png', layer: 'player/cloak/ratskin.png',
  }),
  'leather-gloves': Object.freeze({
    icon: 'item/armour/glove1.png', layer: 'player/gloves/glove_black.png',
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
  }),
  'round-shield': Object.freeze({
    icon: 'item/armour/shields/shield1.png', layer: 'player/hand2/shield_knight_gray.png',
  }),
  'tower-shield': Object.freeze({
    icon: 'item/armour/shields/large_shield1.png', layer: 'player/hand2/lshield_quartered.png',
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
    visual.layer,
    visual.offhandLayer,
    visual.legsLayer,
  ]).filter(Boolean))].sort();
}
