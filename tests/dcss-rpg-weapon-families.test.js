import assert from 'node:assert/strict';
import test from 'node:test';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { MERCHANT_VARIANTS, createMerchantStock } from '../tools/dcss-rpg-merchant.js';
import { RANGED_WEAPON_FAMILIES, REACH_STYLES, WEAPON_FAMILIES, canWeaponAttack } from '../tools/dcss-rpg-rules.js';
import { EQUIPMENT_VISUALS } from '../tools/dcss-rpg-equipment-visuals.js';
import { itemDetailLanguages, itemDetails } from '../tools/dcss-rpg-item-details.js';
import { RANGED_TRAITS, isRangedWeapon, rangedTraits, resolveRangedShot } from '../tools/dcss-rpg-ranged.js';
import { marksmanProfile, resolveMarksmanShot } from '../tools/dcss-rpg-marksmanship.js';
import { WHIP_REACH, isWhip, whipCopy, whipPull } from '../tools/dcss-rpg-whips.js';
import { attackContactRatio, heroAttackTrail } from '../tools/dcss-rpg-combat-motion.js';

const weapons = LOOT_CATALOG.filter((item) => item.slot === 'hand1');
const byFamily = (family) => weapons.filter((item) => item.weaponFamily === family);

test('every weapon family is stocked, drawn and readable in both languages', () => {
  assert.deepEqual(
    [...WEAPON_FAMILIES],
    ['dagger', 'sword', 'axe', 'blunt', 'spear', 'staff', 'bow', 'crossbow', 'sling', 'whip'],
  );
  for (const family of WEAPON_FAMILIES) {
    const stock = byFamily(family);
    assert.ok(stock.length >= 2, `${family} needs a choice, not one weapon`);
    // A family the hero can only meet at the bottom is a family they never meet.
    assert.ok(
      stock.some((item) => item.minDepth <= 3),
      `${family} never appears in the first three floors`,
    );
    for (const item of stock) {
      const visual = EQUIPMENT_VISUALS[item.id];
      assert.ok(visual?.icon && visual?.layer, `${item.id} is not drawn on the hero`);
      assert.equal(visual.icon, item.icon, `${item.id} icon disagrees with the catalog`);
      for (const language of itemDetailLanguages) {
        const details = itemDetails(item, language);
        assert.ok(details.slot.length >= 3, `${item.id} ${language} type label`);
      }
    }
  }
});

test('the three new families are not reskins of the ones that existed', () => {
  const [crossbow] = byFamily('crossbow').filter((item) => item.id === 'arbalest');
  const [bow] = byFamily('bow').filter((item) => item.id === 'longbow');
  const [sling] = byFamily('sling').filter((item) => item.id === 'sling');
  const [whip] = byFamily('whip');
  // The crossbow buys range and punch with cadence; the sling sells both for speed.
  assert.ok(crossbow.combat.range > bow.combat.range);
  assert.ok(crossbow.combat.cooldown > bow.combat.cooldown);
  assert.ok(sling.combat.cooldown < bow.combat.cooldown);
  assert.ok(sling.combat.damageScale < bow.combat.damageScale);
  assert.equal(whip.combat.range, WHIP_REACH);
  assert.equal(whip.combat.style, 'whip');
  assert.notEqual(attackContactRatio('whip'), attackContactRatio('spear'));
  assert.notDeepEqual(heroAttackTrail('whip', 0.5), heroAttackTrail('spear', 0.5));
});

test('every shooting family answers to Marksmanship, each in its own way', () => {
  const capabilities = { marksmanRank: 3, marksmanAimMs: 800, marksmanAimBonusPercent: 40, marksmanPierceTargets: 2 };
  const blade = LOOT_CATALOG.find((item) => item.weaponFamily === 'sword');
  assert.equal(isRangedWeapon(blade), false);
  assert.equal(marksmanProfile(blade, capabilities).rank, 0);

  const shots = {};
  for (const family of RANGED_WEAPON_FAMILIES) {
    const weapon = byFamily(family)[0];
    assert.ok(isRangedWeapon(weapon), `${family} must shoot`);
    const profile = marksmanProfile(weapon, capabilities);
    assert.equal(profile.rank, 3, `${family} ignores the skill`);
    shots[family] = resolveRangedShot({
      weapon,
      shot: resolveMarksmanShot({ profile, steadySeconds: 5 }),
    });
    assert.equal(shots[family].aimed, true);
  }
  // A held breath is worth most on a crossbow and least on a sling.
  assert.ok(shots.crossbow.bonusPercent > shots.bow.bonusPercent);
  assert.ok(shots.sling.bonusPercent < shots.bow.bonusPercent);
  // Only an arrow keeps going; only a stone breaks the step.
  assert.ok(shots.bow.pierceTargets > 0);
  assert.equal(shots.crossbow.pierceTargets, 0);
  assert.equal(shots.sling.pierceTargets, 0);
  assert.equal(shots.bow.staggerSeconds, 0);
  assert.ok(shots.sling.staggerSeconds > 0);
  assert.deepEqual(Object.keys(RANGED_TRAITS).sort(), [...RANGED_WEAPON_FAMILIES].sort());
});

test('an unaimed shot still carries the family, and a melee weapon carries none', () => {
  const sling = byFamily('sling')[0];
  const resting = resolveRangedShot({ weapon: sling, shot: null });
  assert.equal(resting.aimed, false);
  assert.equal(resting.bonusPercent, 0);
  assert.ok(resting.staggerSeconds > 0, 'a stone staggers with or without the skill');
  const club = LOOT_CATALOG.find((item) => item.weaponFamily === 'blunt');
  assert.deepEqual(rangedTraits(club), { aimScalePercent: 0, pierces: false, staggerSeconds: 0 });
  assert.equal(resolveRangedShot({ weapon: club, shot: { aimed: true, bonusPercent: 40, pierceTargets: 2 } }).bonusPercent, 0);
});

test('a whip drags what it catches, and only what it can drag', () => {
  const whip = byFamily('whip')[0];
  const club = LOOT_CATALOG.find((item) => item.weaponFamily === 'blunt');
  assert.ok(isWhip(whip));
  assert.equal(isWhip(club), false);
  assert.equal(whipPull({ weapon: club, attacker: { x: 5, y: 5 }, target: { x: 7, y: 5 } }).ok, false);

  const open = whipPull({
    weapon: whip,
    attacker: { x: 5.5, y: 5.5 },
    target: { x: 7.5, y: 5.5 },
    isFree: () => true,
  });
  assert.equal(open.ok, true);
  assert.deepEqual(open.cell, { x: 6, y: 5 });

  // Something already next to the hero has nowhere to come from.
  assert.equal(
    whipPull({ weapon: whip, attacker: { x: 5.5, y: 5.5 }, target: { x: 6.5, y: 5.5 }, isFree: () => true }).ok,
    false,
  );
  // A wall or another body in the way stops the yank instead of teleporting anyone.
  const blocked = whipPull({
    weapon: whip,
    attacker: { x: 5.5, y: 5.5 },
    target: { x: 7.5, y: 5.5 },
    isFree: () => false,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'blocked');
  // A boss standing right next to the hero is simply not a pull at all, so the
  // runtime never announces a refusal that nobody asked for.
  assert.equal(
    whipPull({ weapon: whip, attacker: { x: 5.5, y: 5.5 }, target: { x: 6.5, y: 5.5, boss: true }, isFree: () => true }).reason,
    'no-pull',
  );
  // Bosses hold their ground, and the refusal says so in both languages.
  const heavy = whipPull({
    weapon: whip,
    attacker: { x: 5.5, y: 5.5 },
    target: { x: 7.5, y: 5.5, boss: true },
    isFree: () => true,
  });
  assert.equal(heavy.reason, 'too-heavy');
  assert.ok(whipCopy('too-heavy', 'ru').length > 3);
  assert.ok(whipCopy('too-heavy', 'en').length > 3);
  assert.equal(whipCopy('nonsense', 'ru'), '');
});

test('a whip reaches down the same clear lane a spear does', () => {
  const room = Array.from({ length: 7 }, () => '.......'.split(''));
  const wall = Array.from({ length: 7 }, () => '.......'.split(''));
  wall[3][4] = '#';
  const whip = byFamily('whip')[0];
  const at = (x, y) => ({ x: x + 0.5, y: y + 0.5 });
  assert.equal(canWeaponAttack(room, at(3, 3), at(5, 3), whip.combat), true);
  // Nothing beyond the reach, and nothing through a wall in the lane.
  assert.equal(canWeaponAttack(room, at(3, 3), at(6, 3), whip.combat), false);
  assert.equal(canWeaponAttack(wall, at(3, 3), at(5, 3), whip.combat), false);
  // A lash still needs a lane: a blade's diagonal is not a whip's.
  assert.equal(canWeaponAttack(room, at(3, 3), at(5, 5), whip.combat), false);
  assert.deepEqual([...REACH_STYLES], ['spear', 'whip']);
});

test('a weapon nobody can find is not a weapon: every family reaches the hero', () => {
  const dropped = new Map();
  for (let seed = 1; seed <= 40; seed += 1) {
    for (let depth = 1; depth <= 9; depth += 1) {
      const dungeon = generateDungeon({ seed, depth });
      const pools = [dungeon.loot ?? [], ...(dungeon.chests ?? []).map((chest) => chest.items ?? [])];
      for (const pool of pools) {
        for (const entry of pool) {
          const family = lootById(entry.itemId ?? entry.id)?.weaponFamily;
          if (family) dropped.set(family, (dropped.get(family) ?? 0) + 1);
        }
      }
    }
  }
  for (const family of WEAPON_FAMILIES) {
    assert.ok(dropped.get(family) > 0, `${family} never dropped across forty runs`);
  }

  const stocked = new Set();
  for (let seed = 1; seed <= 20; seed += 1) {
    for (const variantId of Object.keys(MERCHANT_VARIANTS)) {
      for (const entry of createMerchantStock({ seed, depth: 9, roomIndex: 0, variantId })) {
        const family = lootById(entry.record.itemId ?? entry.record.id)?.weaponFamily;
        if (family) stocked.add(family);
      }
    }
  }
  for (const family of WEAPON_FAMILIES) {
    assert.ok(stocked.has(family), `${family} is never for sale`);
  }
});
