import assert from 'node:assert/strict';
import test from 'node:test';

import { LOOT_CATALOG, MONSTER_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { createRun, generateDungeon } from '../tools/dcss-rpg-core.js';
import { FINAL_BOSS_ID, FINAL_DEPTH } from '../tools/dcss-rpg-run.js';
import {
  EQUIPMENT_STAT_KEYS,
  EQUIPMENT_SLOTS,
  HERO_BASE_MOVE_SPEED,
  HERO_LEVEL_HP_GAIN,
  MONSTER_MIN_SEPARATION,
  MIN_DAMAGE_RATIO,
  assertEquipmentCatalog,
  canMeleeAttack,
  canMonsterAdvance,
  canWeaponAttack,
  combatDamage,
  createMonsterStates,
  occupiedMonsterCells,
  deriveHeroStats,
  equipInventoryItem,
  mitigateDamage,
  monsterThreatAtDepth,
  resolveHeroDamage,
  salvageInventoryItems,
  unequipItem,
  weaponCombatProfile,
} from '../tools/dcss-rpg-rules.js';

test('all equipment has real combat stats and starter HUD values use the same derivation', () => {
  assert.equal(assertEquipmentCatalog(LOOT_CATALOG), true);
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
