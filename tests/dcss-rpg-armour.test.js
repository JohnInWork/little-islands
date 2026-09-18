import assert from 'node:assert/strict';
import test from 'node:test';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { EQUIPMENT_SLOTS, assertEquipmentCatalog } from '../tools/dcss-rpg-rules.js';
import { EQUIPMENT_VISUALS } from '../tools/dcss-rpg-equipment-visuals.js';
import { itemDetailLanguages, itemDetails } from '../tools/dcss-rpg-item-details.js';
import {
  ARMOUR_TRAITS,
  ARMOUR_TRAIT_CAPS,
  armourProfile,
  armourTraitText,
  focusedCooldown,
  frugalHungerSeconds,
  hasArmourMechanic,
  thornsDamage,
  validateArmourBlock,
} from '../tools/dcss-rpg-armour.js';

// Rings are one pool wearable in either hand's slot, so they count once.
const ARMOUR_SLOTS = EQUIPMENT_SLOTS.filter((slot) => slot !== 'hand1' && slot !== 'ring2');
const inSlot = (slot) => LOOT_CATALOG.filter((item) => (
  slot === 'ring1' ? String(item.slot).startsWith('ring') : item.slot === slot
));

test('every armour slot is a choice, not a column of numbers', () => {
  for (const slot of ARMOUR_SLOTS) {
    const pieces = inSlot(slot);
    assert.ok(pieces.length >= 3, `${slot} has only ${pieces.length} pieces`);
    assert.ok(
      pieces.some((item) => item.minDepth <= 3),
      `${slot} has nothing before the third floor`,
    );
    // One plain piece per slot is the baseline everything else is measured
    // against. Two plain pieces means the slot is still arithmetic.
    const plain = pieces.filter((item) => !hasArmourMechanic(item));
    assert.ok(plain.length <= 1, `${slot} has ${plain.length} pieces that do nothing: ${plain.map(({ id }) => id).join(', ')}`);
    for (const item of pieces) {
      const visual = EQUIPMENT_VISUALS[item.id];
      assert.ok(visual?.icon, `${item.id} has no icon`);
      for (const language of itemDetailLanguages) {
        assert.ok(itemDetails(item, language).name.length >= 3, `${item.id} ${language} name`);
      }
    }
  }
});

test('armour traits are a closed vocabulary the catalog enforces', () => {
  assert.deepEqual([...ARMOUR_TRAITS], ['quiet', 'surefooted', 'thorns', 'frugal', 'focused']);
  assert.equal(validateArmourBlock(undefined), true);
  assert.equal(validateArmourBlock({}), false);
  assert.equal(validateArmourBlock({ quiet: 10 }), true);
  assert.equal(validateArmourBlock({ quiet: 0 }), false);
  assert.equal(validateArmourBlock({ quiet: ARMOUR_TRAIT_CAPS.quiet + 1 }), false);
  assert.equal(validateArmourBlock({ invented: 3 }), false);
  assert.equal(validateArmourBlock({ quiet: 4, thorns: 2, frugal: 2 }), false, 'three traits on one piece is a grab bag');
  assert.equal(assertEquipmentCatalog(LOOT_CATALOG), true);
  // Every declared trait actually reads as a sentence in both languages.
  for (const trait of ARMOUR_TRAITS) {
    for (const language of itemDetailLanguages) {
      assert.ok(armourTraitText(trait, 10, language).length > 8, `${trait} ${language}`);
    }
  }
  assert.equal(armourTraitText('invented', 10, 'ru'), '');
});

test('a worn set adds up, and the caps bite before a rule disappears', () => {
  assert.deepEqual(armourProfile([]), {
    quiet: 0, surefooted: false, thorns: 0, frugal: 0, focused: 0,
  });
  // Two quiet pieces simply add up.
  assert.equal(armourProfile([lootById('shadow-scales'), lootById('green-boots')]).quiet, 12 + 10);
  // A third would carry the set past the ceiling, and the ceiling holds — which
  // is the point: a full quiet set makes the hero hard to notice, never unseen.
  const quietSet = [lootById('shadow-scales'), lootById('green-boots'), lootById('hush-amulet')];
  assert.ok(quietSet.reduce((sum, item) => sum + item.armour.quiet, 0) > ARMOUR_TRAIT_CAPS.quiet);
  assert.equal(armourProfile(quietSet).quiet, ARMOUR_TRAIT_CAPS.quiet);
  // One pair of boots is enough; a second pair cannot be worn and changes nothing.
  assert.equal(armourProfile([lootById('spider-boots')]).surefooted, true);
  assert.equal(armourProfile([lootById('iron-helm')]).surefooted, false);
});

test('each trait changes its own system and never switches it off', () => {
  const full = armourProfile([
    lootById('titan-belt'), lootById('living-vines'), lootById('hunter-belt'),
    lootById('ancient-crown'), lootById('runic-belt'), lootById('spiked-shield'),
  ]);
  // Hunger runs slower, but the seconds never stop being spent.
  assert.ok(frugalHungerSeconds(100, full) < 100);
  assert.ok(frugalHungerSeconds(100, full) > 0);
  assert.equal(frugalHungerSeconds(100, armourProfile([])), 100);
  assert.equal(frugalHungerSeconds(0, full), 0);
  // A spell comes back sooner, never for free.
  assert.ok(focusedCooldown(4, full) < 4);
  assert.equal(focusedCooldown(0.4, full), 0.5, 'a short spell never drops below the floor');
  assert.equal(focusedCooldown(4, armourProfile([])), 4);
  // Thorns answer a landed blow and nothing else.
  assert.ok(thornsDamage(full, 7) > 0);
  assert.equal(thornsDamage(full, 0), 0);
  assert.equal(thornsDamage(armourProfile([]), 7), 0);
  assert.ok(thornsDamage(full, 7) <= ARMOUR_TRAIT_CAPS.thorns);
});

test('a shield is worth a hand: three of them, and each guards differently', () => {
  const shields = inSlot('hand2').filter(({ offhandKind }) => offhandKind === 'shield');
  assert.ok(shields.length >= 4, `only ${shields.length} shields`);
  const guards = shields.map(({ combat }) => combat.guard);
  assert.ok(Math.max(...guards) > Math.min(...guards), 'every shield guards the same amount');
  // The tall one costs movement, the spiked one pays back, the small one is cheap.
  assert.ok(lootById('tower-shield').stats.moveSpeed < 0);
  assert.ok(lootById('spiked-shield').armour.thorns > lootById('wood-buckler').armour.thorns);
  assert.ok(lootById('wood-buckler').minDepth <= 1);
});

test('armour actually reaches the hero: every slot drops across a seed sweep', () => {
  const dropped = new Map();
  for (let seed = 1; seed <= 40; seed += 1) {
    for (let depth = 1; depth <= 9; depth += 1) {
      const dungeon = generateDungeon({ seed, depth });
      const pools = [dungeon.loot ?? [], ...(dungeon.chests ?? []).map((chest) => chest.items ?? [])];
      for (const pool of pools) {
        for (const entry of pool) {
          const slot = lootById(entry.itemId ?? entry.id)?.slot;
          if (slot) dropped.set(slot, (dropped.get(slot) ?? 0) + 1);
        }
      }
    }
  }
  for (const slot of ARMOUR_SLOTS) {
    assert.ok(dropped.get(slot) > 0, `${slot} never dropped across forty runs`);
  }
});
