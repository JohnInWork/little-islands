import assert from 'node:assert/strict';
import test from 'node:test';

import { LOOT_CATALOG, MONSTER_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { createRun, generateDungeon, validateRun } from '../tools/dcss-rpg-core.js';
import { FINAL_BOSS_ID, FINAL_DEPTH } from '../tools/dcss-rpg-run.js';
import { HUNGER_MAX, HUNGER_TUNING } from '../tools/dcss-rpg-hunger.js';
import {
  DUAL_WIELD_OFFHAND_DAMAGE_SCALE,
  EQUIPMENT_STAT_KEYS,
  EQUIPMENT_SLOTS,
  HERO_BASE_MOVE_SPEED,
  HERO_LEVEL_HP_GAIN,
  MONSTER_MIN_SEPARATION,
  MIN_DAMAGE_RATIO,
  WEAPON_FAMILIES,
  WEAPON_LOADOUTS,
  allowedSlotsForItem,
  assertEquipmentCatalog,
  canMeleeAttack,
  canMonsterAdvance,
  canWeaponAttack,
  combatDamage,
  createMonsterStates,
  occupiedMonsterCells,
  deriveHeroStats,
  equipInventoryItem,
  isShieldItem,
  isTwoHandedItem,
  isWeaponItem,
  mitigateDamage,
  monsterThreatAtDepth,
  resolveHeroDamage,
  resolveWeaponLoadout,
  salvageInventoryItems,
  unequipItem,
  weaponCombatProfile,
} from '../tools/dcss-rpg-rules.js';

test('all equipment has real combat stats and starter HUD values use the same derivation', () => {
  assert.equal(assertEquipmentCatalog(LOOT_CATALOG), true);
  const weapons = LOOT_CATALOG.filter(({ slot }) => slot === 'hand1');
  assert.ok(weapons.every(({ weaponFamily }) => WEAPON_FAMILIES.includes(weaponFamily)));
  assert.ok(weapons.filter(({ weaponFamily }) => weaponFamily === 'axe').length >= 2);
  assert.ok(weapons.filter(({ weaponFamily }) => weaponFamily === 'sword').length >= 5);
  const run = createRun(19);
  const stats = deriveHeroStats(run.hero, run.equipment, run.items.map((item) => ({
    ...lootById(item.id),
    ...item,
  })));
  assert.deepEqual(stats, {
    attack: 4,
    defense: 5,
    maxHp: 100,
    moveSpeed: 1.08,
    attackSpeed: 1.05,
  });
  assert.equal(HERO_BASE_MOVE_SPEED, 2.85);
  assert.equal(HERO_LEVEL_HP_GAIN, 6);
  assert.equal(mitigateDamage(5, stats.defense), 3);
});

test('equipment exposes bounded movement and attack tempo modifiers', () => {
  assert.deepEqual(EQUIPMENT_STAT_KEYS, [
    'attack',
    'defense',
    'maxHp',
    'moveSpeed',
    'attackSpeed',
  ]);
  assert.ok(LOOT_CATALOG.some((item) => (item.stats?.moveSpeed ?? 0) > 0));
  assert.ok(LOOT_CATALOG.some((item) => (item.stats?.moveSpeed ?? 0) < 0));
  assert.ok(LOOT_CATALOG.some((item) => (item.stats?.attackSpeed ?? 0) > 0));
  assert.ok(LOOT_CATALOG.some((item) => (item.stats?.attackSpeed ?? 0) < 0));
});

test('hunger composes with the one derived-stat source without ever dealing damage', () => {
  const run = createRun(1924);
  const items = run.items.map((item) => ({ ...lootById(item.id), ...item }));
  const fed = deriveHeroStats({ ...run.hero, hunger: HUNGER_MAX }, run.equipment, items);
  const strong = deriveHeroStats({ ...run.hero, hunger: HUNGER_TUNING.strongAt }, run.equipment, items);
  const starving = deriveHeroStats({ ...run.hero, hunger: 0 }, run.equipment, items);

  assert.ok(strong.attack < fed.attack);
  assert.ok(strong.moveSpeed < fed.moveSpeed);
  assert.ok(starving.attack <= strong.attack);
  assert.ok(starving.defense < strong.defense);
  assert.ok(starving.attackSpeed < strong.attackSpeed);
  assert.equal(run.hero.hp, 100);
  assert.equal(starving.maxHp, fed.maxHp);
});

test('one-handed axe keeps shield guard and tempo while two-handed axes trade both for impact', () => {
  const handAxe = lootById('war-axe');
  const warAxe = lootById('executioner-axe');
  const buckler = lootById('wood-buckler');
  const handProfile = weaponCombatProfile(handAxe, buckler);
  const warProfile = weaponCombatProfile(warAxe, buckler);

  assert.equal(handAxe.hands, 1);
  assert.equal(isTwoHandedItem(handAxe), false);
  assert.equal(handProfile.style, 'blade');
  assert.equal(handProfile.guard, buckler.combat.guard);
  assert.ok(handProfile.cooldown < warProfile.cooldown);
  assert.ok(handProfile.attackDuration < warProfile.attackDuration);

  assert.equal(warAxe.hands, 2);
  assert.equal(isTwoHandedItem(warAxe), true);
  assert.equal(warProfile.style, 'heavy');
  assert.equal(warProfile.guard, 0);
  assert.ok(warProfile.damageScale > handProfile.damageScale);
});

test('one universal hand contract resolves single, shield, dual and two-handed loadouts', () => {
  const dagger = lootById('short-blade');
  const sword = lootById('long-sword');
  const shield = lootById('wood-buckler');
  const staff = lootById('skull-staff');

  assert.deepEqual(WEAPON_LOADOUTS, [
    'unarmed',
    'one-handed',
    'weapon-shield',
    'dual-wield',
    'two-handed',
  ]);
  assert.equal(isWeaponItem(sword), true);
  assert.equal(isShieldItem(shield), true);
  assert.deepEqual(allowedSlotsForItem(sword), ['hand1', 'hand2']);
  assert.deepEqual(allowedSlotsForItem(staff), ['hand1']);
  assert.equal(resolveWeaponLoadout(sword).mode, 'one-handed');
  assert.equal(resolveWeaponLoadout(sword, shield).mode, 'weapon-shield');
  assert.equal(resolveWeaponLoadout(sword, dagger).mode, 'dual-wield');
  assert.equal(resolveWeaponLoadout(staff, shield).mode, 'two-handed');
  assert.equal(resolveWeaponLoadout(null, dagger).mode, 'one-handed');
});

test('dual wield keeps each weapon visible in the loadout and adds a bounded off-hand strike', () => {
  const sword = lootById('long-sword');
  const dagger = lootById('short-blade');
  const profile = weaponCombatProfile(sword, dagger);

  assert.equal(profile.loadout, 'dual-wield');
  assert.equal(profile.guard, 0);
  assert.equal(profile.style, sword.combat.style);
  assert.equal(profile.secondary.style, dagger.combat.style);
  assert.equal(
    profile.secondary.damageScale,
    dagger.combat.damageScale * DUAL_WIELD_OFFHAND_DAMAGE_SCALE,
  );
});

test('a shield guards every one-handed family while two-handed weapons always ignore it', () => {
  const shield = lootById('wood-buckler');
  const axe = lootById('war-axe');
  const staff = lootById('skull-staff');

  assert.equal(weaponCombatProfile(axe, shield).loadout, 'weapon-shield');
  assert.equal(weaponCombatProfile(axe, shield).guard, shield.combat.guard);
  assert.equal(weaponCombatProfile(staff, shield).loadout, 'two-handed');
  assert.equal(weaponCombatProfile(staff, shield).guard, 0);
});

test('cloak, gloves and belt are real equipment families with visible variants', () => {
  assert.ok(['cloak', 'gloves', 'belt'].every((slot) => EQUIPMENT_SLOTS.includes(slot)));
  for (const slot of ['cloak', 'gloves', 'belt']) {
    const family = LOOT_CATALOG.filter((item) => item.slot === slot);
    assert.ok(family.length >= 4);
    assert.equal(new Set(family.map((item) => item.variant)).size, family.length);
  }
});

test('equipment has one owner and swapping or salvaging is atomic', () => {
  const run = createRun(23);
  const found = { id: 'long-sword', uid: 'found-sword', ...lootById('long-sword') };
  const state = {
    items: [...run.items.map((item) => ({ ...lootById(item.id), ...item })), found],
    inventory: [...run.inventory, found.uid],
    equipment: { ...run.equipment },
  };
  const equipped = equipInventoryItem(state, found.uid);
  assert.equal(equipped.ok, true);
  assert.equal(equipped.state.equipment.hand1, found.uid);
  assert.ok(equipped.state.inventory.includes('starter-blade'));
  assert.ok(!equipped.state.inventory.includes(found.uid));

  const forbidden = salvageInventoryItems(equipped.state, [found.uid]);
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.reward, 0);
  assert.deepEqual(forbidden.state, equipped.state);

  const unequipped = unequipItem(equipped.state, 'hand1');
  assert.equal(unequipped.ok, true);
  assert.equal(unequipped.state.equipment.hand1, null);
  assert.ok(unequipped.state.inventory.includes(found.uid));
  const salvaged = salvageInventoryItems(unequipped.state, [found.uid]);
  assert.equal(salvaged.ok, true);
  assert.ok(!salvaged.state.items.some((item) => item.uid === found.uid));
});

test('two-handed weapons atomically clear both hands and off-hand gear swaps them out', () => {
  const run = createRun(2301);
  const axe = { id: 'executioner-axe', uid: 'test-two-handed', ...lootById('executioner-axe') };
  const state = {
    items: [...run.items.map((item) => ({ ...lootById(item.id), ...item })), axe],
    inventory: [...run.inventory, axe.uid],
    equipment: { ...run.equipment },
  };

  assert.equal(isTwoHandedItem(axe), true);
  const equipped = equipInventoryItem(state, axe.uid);
  assert.equal(equipped.ok, true);
  assert.equal(equipped.state.equipment.hand1, axe.uid);
  assert.equal(equipped.state.equipment.hand2, null);
  assert.deepEqual(equipped.unequippedUids, ['starter-blade', 'starter-buckler']);
  assert.ok(equipped.state.inventory.includes('starter-blade'));
  assert.ok(equipped.state.inventory.includes('starter-buckler'));

  const shielded = equipInventoryItem(equipped.state, 'starter-buckler');
  assert.equal(shielded.ok, true);
  assert.equal(shielded.state.equipment.hand1, null);
  assert.equal(shielded.state.equipment.hand2, 'starter-buckler');
  assert.ok(shielded.state.inventory.includes(axe.uid));
});

test('one-handed weapons can occupy both hand slots without duplicating one item', () => {
  const run = createRun(2304);
  const sword = { id: 'long-sword', uid: 'dual-test-sword', ...lootById('long-sword') };
  const state = {
    items: [...run.items.map((item) => ({ ...lootById(item.id), ...item })), sword],
    inventory: [...run.inventory, sword.uid],
    equipment: { ...run.equipment },
  };
  const withoutShield = unequipItem(state, 'hand2');
  assert.equal(withoutShield.ok, true);
  const equipped = equipInventoryItem(withoutShield.state, sword.uid);

  assert.equal(equipped.ok, true);
  assert.equal(equipped.slot, 'hand2');
  assert.equal(equipped.state.equipment.hand1, 'starter-blade');
  assert.equal(equipped.state.equipment.hand2, sword.uid);
  assert.equal(
    Object.values(equipped.state.equipment).filter((uid) => uid === sword.uid).length,
    1,
  );
});

test('a dual-wield loadout survives the existing save contract without a schema fork', () => {
  const run = createRun(2305);
  const previousOffhand = run.equipment.hand2;
  run.items.push({
    id: 'long-sword',
    uid: 'saved-offhand-sword',
    affixIds: [],
  });
  run.inventory.push(previousOffhand);
  run.equipment.hand2 = 'saved-offhand-sword';

  assert.equal(validateRun(run), true);
  const restored = structuredClone(run);
  assert.equal(validateRun(restored), true);
  assert.equal(restored.equipment.hand1, 'starter-blade');
  assert.equal(restored.equipment.hand2, 'saved-offhand-sword');
});

test('a two-handed swap fails without mutating state when two displaced items overflow the backpack', () => {
  const run = createRun(2302);
  const axe = { id: 'executioner-axe', uid: 'packed-two-handed', ...lootById('executioner-axe') };
  const fillers = Array.from({ length: 6 }, (_, index) => ({
    id: 'mystery-potion',
    uid: `two-hand-filler-${index}`,
    ...lootById('mystery-potion'),
  }));
  const state = {
    items: [...run.items.map((item) => ({ ...lootById(item.id), ...item })), axe, ...fillers],
    inventory: [...run.inventory, axe.uid, ...fillers.map(({ uid }) => uid)],
    equipment: { ...run.equipment },
  };
  assert.equal(state.inventory.length, 12);
  const before = structuredClone(state);
  const result = equipInventoryItem(state, axe.uid);
  assert.deepEqual(result, { ok: false, reason: 'inventory-full', state });
  assert.deepEqual(state, before);
});

test('monster state keeps its sprite separate from the mutable AI route', () => {
  const dungeon = generateDungeon({ seed: 12345, depth: 1 });
  const monsters = createMonsterStates(dungeon);
  assert.equal(monsters.length, dungeon.monsters.length);
  for (const monster of monsters) {
    assert.equal(typeof monster.spritePath, 'string');
    assert.ok(monster.spritePath.endsWith('.png'));
    assert.deepEqual(monster.route, []);
    assert.ok(monster.speed >= 1.45);
    assert.ok(monster.attackRate > 0);
    assert.ok(monster.vision >= 4);
    assert.ok(monster.windup >= 0.08);
    monster.route.push({ x: 1, y: 1 });
    assert.ok(monster.spritePath.endsWith('.png'));
  }
});

test('monsters reserve corridor cells and form a queue instead of passing through', () => {
  const front = { instanceId: 'front', x: 96, y: 96, dead: 0 };
  const rear = { instanceId: 'rear', x: 32, y: 96, dead: 0 };
  const side = { instanceId: 'side', x: 96, y: 160, dead: 0 };
  const monsters = [front, rear, side];
  const reservations = new Set();
  const occupied = occupiedMonsterCells(monsters, 64);

  assert.deepEqual(occupied, new Set(['1,1', '0,1', '1,2']));
  assert.equal(MONSTER_MIN_SEPARATION, 0.68);
  assert.equal(
    canMonsterAdvance({
      monster: rear,
      next: { x: 38, y: 96 },
      target: { x: 96, y: 96 },
      monsters,
      reservations,
      tileSize: 64,
    }),
    false,
  );

  reservations.add('2,1');
  assert.equal(
    canMonsterAdvance({
      monster: front,
      next: { x: 102, y: 96 },
      target: { x: 160, y: 96 },
      monsters,
      reservations,
      tileSize: 64,
    }),
    false,
  );
});

test('an old overlapping save can separate but cannot reserve one exit twice', () => {
  const first = { instanceId: 'first', x: 96, y: 96, dead: 0 };
  const second = { instanceId: 'second', x: 96, y: 96, dead: 0 };
  const monsters = [first, second];
  const reservations = new Set();
  const target = { x: 160, y: 96 };

  assert.equal(
    canMonsterAdvance({
      monster: first,
      next: { x: 102, y: 96 },
      target,
      monsters,
      reservations,
      tileSize: 64,
    }),
    true,
  );
  reservations.add('2,1');
  assert.equal(
    canMonsterAdvance({
      monster: second,
      next: { x: 102, y: 96 },
      target,
      monsters,
      reservations,
      tileSize: 64,
    }),
    false,
  );
});

test('a moving corridor queue preserves order and minimum physical spacing', () => {
  const monsters = [
    { instanceId: 'front', x: 160, y: 96, dead: 0, route: [224, 288, 352] },
    { instanceId: 'middle', x: 96, y: 96, dead: 0, route: [160, 224, 288] },
    { instanceId: 'rear', x: 32, y: 96, dead: 0, route: [96, 160, 224] },
  ];
  let closest = Infinity;
  for (let frame = 0; frame < 48; frame += 1) {
    const reservations = new Set();
    for (const monster of monsters) {
      const routeX = monster.route[0];
      if (routeX === undefined) continue;
      const next = { x: Math.min(routeX, monster.x + 8), y: monster.y };
      const target = { x: routeX, y: monster.y };
      if (
        canMonsterAdvance({ monster, next, target, monsters, reservations, tileSize: 64 })
      ) {
        reservations.add(`${Math.floor(routeX / 64)},1`);
        monster.x = next.x;
        if (monster.x === routeX) monster.route.shift();
      }
    }
    closest = Math.min(
      closest,
      monsters[0].x - monsters[1].x,
      monsters[1].x - monsters[2].x,
    );
    assert.ok(monsters[0].x > monsters[1].x);
    assert.ok(monsters[1].x > monsters[2].x);
  }

  assert.ok(monsters[2].x > 32);
  assert.ok(closest >= 64 * MONSTER_MIN_SEPARATION);
});

test('monster health and damage create meaningful pressure by the final floor', () => {
  const spawn = { id: 'goblin', instanceId: 'danger-check', x: 2, y: 2 };
  const shallow = createMonsterStates({ depth: 1, monsters: [spawn] })[0];
  const deep = createMonsterStates({ depth: 3, monsters: [spawn] })[0];

  assert.ok(shallow.hp > MONSTER_CATALOG.find(({ id }) => id === 'goblin').hp);
  assert.ok(shallow.damage > MONSTER_CATALOG.find(({ id }) => id === 'goblin').damage);
  assert.ok(deep.hp > shallow.hp);
  assert.ok(deep.damage > shallow.damage);
});

test('the harder baseline prevents an unequipped hero from face-tanking the guardian', () => {
  const boss = createMonsterStates({
    depth: FINAL_DEPTH,
    monsters: [{ id: FINAL_BOSS_ID, instanceId: 'naked-run-check', x: 2, y: 2 }],
  })[0];
  const nakedEquipment = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null]));
  const naked = deriveHeroStats({ power: 4, maxHp: 118 }, nakedEquipment, []);
  const incoming = resolveHeroDamage({ hp: naked.maxHp, amount: boss.damage });
  const outgoing = combatDamage(naked, weaponCombatProfile(null));

  assert.ok(Math.ceil(naked.maxHp / incoming.damage) <= 3);
  assert.ok(Math.ceil(boss.maxHp / outgoing) >= 35);
});

test('every monster has a distinct threat profile that scales with depth', () => {
  const signatures = new Set();
  for (const monster of MONSTER_CATALOG) {
    assert.ok(['attackRate', 'vision', 'windup', 'pursuit'].every(
      (key) => Number.isFinite(monster.threat?.[key]) && monster.threat[key] > 0,
    ));
    signatures.add(JSON.stringify(monster.threat));
  }
  assert.equal(signatures.size, MONSTER_CATALOG.length);
  const goblin = MONSTER_CATALOG.find(({ id }) => id === 'goblin');
  const shallow = monsterThreatAtDepth(goblin, 1);
  const deep = monsterThreatAtDepth(goblin, 3);
  assert.ok(deep.moveSpeed > shallow.moveSpeed);
  assert.ok(deep.attackRate > shallow.attackRate);
  assert.ok(deep.vision > shallow.vision);
  assert.ok(deep.pursuit > shallow.pursuit);
  assert.ok(deep.windup < shallow.windup);
});

test('melee attacks are cardinal and cannot pass through a closed diagonal corner', () => {
  const grid = [
    ['.', '#', '.'],
    ['#', '.', '.'],
    ['.', '.', '.'],
  ];
  assert.equal(canMeleeAttack(grid, { x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }), false);
  assert.equal(canMeleeAttack(grid, { x: 1.5, y: 1.5 }, { x: 1.6, y: 1.6 }), false);
  assert.equal(canMeleeAttack(grid, { x: 1.5, y: 1.5 }, { x: 2.5, y: 1.5 }), true);
});

test('blade, spear and staff create three spatially distinct combat styles', () => {
  const blade = weaponCombatProfile(lootById('short-blade'), lootById('wood-buckler'));
  const spear = weaponCombatProfile(lootById('storm-trident'));
  const staff = weaponCombatProfile(lootById('skull-staff'));

  assert.deepEqual(
    { style: blade.style, range: blade.range, guard: blade.guard },
    { style: 'blade', range: 1, guard: 1 },
  );
  assert.deepEqual(
    { style: spear.style, range: spear.range, projectile: spear.projectile },
    { style: 'spear', range: 2, projectile: null },
  );
  assert.deepEqual(
    { style: staff.style, range: staff.range, projectile: staff.projectile },
    { style: 'staff', range: 4.5, projectile: 'arcane' },
  );
  assert.ok(blade.cooldown < spear.cooldown);
  assert.ok(spear.cooldown < staff.cooldown);
  assert.equal(isTwoHandedItem(lootById('storm-trident')), true);
  assert.equal(isTwoHandedItem(lootById('skull-staff')), true);
});

test('weapon reach respects cardinal lanes and ranged line of sight', () => {
  const openLane = [
    ['.', '.', '.', '.'],
    ['.', '.', '.', '.'],
    ['.', '.', '.', '.'],
  ];
  const blockedLane = [
    ['.', '#', '.', '.'],
    ['.', '.', '.', '.'],
    ['.', '.', '.', '.'],
  ];
  const from = { x: 0.5, y: 0.5 };
  const twoCellsRight = { x: 2.5, y: 0.5 };
  const diagonal = { x: 2.5, y: 2.5 };
  const blade = weaponCombatProfile(lootById('short-blade'));
  const spear = weaponCombatProfile(lootById('storm-trident'));
  const staff = weaponCombatProfile(lootById('skull-staff'));

  assert.equal(canWeaponAttack(openLane, from, twoCellsRight, blade), false);
  assert.equal(canWeaponAttack(openLane, from, twoCellsRight, spear), true);
  assert.equal(canWeaponAttack(blockedLane, from, twoCellsRight, spear), false);
  assert.equal(canWeaponAttack(openLane, from, diagonal, spear), false);
  assert.equal(canWeaponAttack(openLane, from, diagonal, staff, true), true);
  assert.equal(canWeaponAttack(openLane, from, diagonal, staff, false), false);
});

test('weapon tempo and guard alter outcomes without random rolls', () => {
  const stats = { attack: 10 };
  const blade = weaponCombatProfile(lootById('short-blade'), lootById('wood-buckler'));
  const spear = weaponCombatProfile(lootById('storm-trident'));
  const staff = weaponCombatProfile(lootById('skull-staff'));

  assert.equal(combatDamage(stats, blade), 9);
  assert.equal(combatDamage(stats, spear), 10);
  assert.equal(combatDamage(stats, staff), 9);
  assert.equal(mitigateDamage(8, 2, blade.guard), 6);
  assert.equal(mitigateDamage(8, 2, 0), 7);
  assert.equal(MIN_DAMAGE_RATIO, 0.35);
  assert.equal(mitigateDamage(20, 100, 10), 7);
});

test('repeated hits always reach a terminal hero death even behind extreme armour', () => {
  let hp = 100;
  let result = null;
  for (let hit = 0; hit < 15; hit += 1) {
    result = resolveHeroDamage({ hp, amount: 20, defense: 100, guard: 10 });
    hp = result.hp;
  }

  assert.deepEqual(result, { hp: 0, damage: 7, dead: true });
  assert.throws(() => resolveHeroDamage({ hp: -1, amount: 2 }), /valid HP/);
});
