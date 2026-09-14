import { lootById, monsterById } from './dcss-rpg-content.js';
import { floorScaling, monsterTier } from './dcss-rpg-scaling.js';
import { deriveSkillModifiers } from './dcss-rpg-skills.js';

export const HERO_BASE_MOVE_SPEED = 2.85;
export const HERO_LEVEL_HP_GAIN = 6;
export const MIN_DAMAGE_RATIO = 0.35;
export const MONSTER_MIN_SEPARATION = 0.68;
export const EQUIPMENT_STAT_KEYS = Object.freeze([
  'attack',
  'defense',
  'maxHp',
  'moveSpeed',
  'attackSpeed',
]);

export const EQUIPMENT_SLOTS = Object.freeze([
  'cloak',
  'body',
  'head',
  'hand1',
  'hand2',
  'gloves',
  'belt',
  'boots',
  'ring1',
  'ring2',
  'amulet',
]);

export function createEmptyEquipment() {
  return Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null]));
}

export function allowedSlotsForItem(item) {
  if (!item?.slot) return [];
  if (item.slot === 'ring1' || item.slot === 'ring2') return ['ring1', 'ring2'];
  return [item.slot];
}

export function slotAcceptsItem(item, slot) {
  return EQUIPMENT_SLOTS.includes(slot) && allowedSlotsForItem(item).includes(slot);
}

function itemMap(items) {
  return items instanceof Map ? items : new Map(items.map((item) => [item.uid, item]));
}

const UNARMED_COMBAT = Object.freeze({
  style: 'unarmed',
  range: 1,
  cooldown: 0.76,
  attackDuration: 0.3,
  damageScale: 0.7,
  projectile: null,
  projectileSpeed: 0,
  guard: 0,
});

export function weaponCombatProfile(weapon, offhand = null) {
  const combat = weapon?.combat ?? UNARMED_COMBAT;
  const style = combat.style ?? UNARMED_COMBAT.style;
  return {
    style,
    range: combat.range ?? UNARMED_COMBAT.range,
    cooldown: combat.cooldown ?? UNARMED_COMBAT.cooldown,
    attackDuration: combat.attackDuration ?? UNARMED_COMBAT.attackDuration,
    damageScale: combat.damageScale ?? UNARMED_COMBAT.damageScale,
    projectile: combat.projectile ?? null,
    projectileSpeed: combat.projectileSpeed ?? 0,
    guard: style === 'blade' ? Math.max(0, offhand?.combat?.guard ?? 0) : 0,
  };
}

export function combatDamage(stats, combat) {
  const attack = Number.isFinite(stats?.attack) ? stats.attack : 1;
  const scale = Number.isFinite(combat?.damageScale) ? combat.damageScale : 1;
  return Math.max(1, Math.round(attack * scale));
}

export function deriveHeroStats(hero, equipment, items, skillOptions) {
  const byUid = itemMap(items);
  const bonus = { attack: 0, defense: 0, maxHp: 0, moveSpeed: 0, attackSpeed: 0 };
  for (const slot of EQUIPMENT_SLOTS) {
    const uid = equipment[slot];
    if (!uid) continue;
    const item = byUid.get(uid);
    if (!item) continue;
    bonus.attack += item.stats?.attack ?? 0;
    bonus.defense += item.stats?.defense ?? 0;
    bonus.maxHp += item.stats?.maxHp ?? 0;
    bonus.moveSpeed += item.stats?.moveSpeed ?? 0;
    bonus.attackSpeed += item.stats?.attackSpeed ?? 0;
  }
  if (hero.skills) {
    const skillBonus = deriveSkillModifiers(hero.skills, skillOptions);
    for (const key of EQUIPMENT_STAT_KEYS) bonus[key] += skillBonus[key];
  }
  return {
    attack: Math.max(1, 1 + hero.power + bonus.attack),
    defense: Math.max(0, bonus.defense),
    maxHp: Math.max(1, hero.maxHp + bonus.maxHp),
    moveSpeed: Math.max(0.65, 1 + bonus.moveSpeed),
    attackSpeed: Math.max(0.65, 1 + bonus.attackSpeed),
  };
}

export function mitigateDamage(amount, defense, guard = 0) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const armourReduced = amount - Math.max(0, defense) * 0.5 - Math.max(0, guard);
  return Math.max(1, Math.ceil(Math.max(armourReduced, amount * MIN_DAMAGE_RATIO)));
}

export function resolveHeroDamage({ hp, amount, defense = 0, guard = 0 }) {
  if (!Number.isFinite(hp) || hp < 0) throw new TypeError('Hero damage requires valid HP');
  const damage = mitigateDamage(amount, defense, guard);
  const nextHp = Math.max(0, hp - damage);
  return Object.freeze({ hp: nextHp, damage, dead: nextHp === 0 });
}

export function equipInventoryItem(state, uid, requestedSlot = null) {
  const items = itemMap(state.items);
  const item = items.get(uid);
  const sourceIndex = state.inventory.indexOf(uid);
  if (!item || sourceIndex < 0) return { ok: false, reason: 'not-owned', state };

  const allowed = allowedSlotsForItem(item);
  if (allowed.length === 0) return { ok: false, reason: 'not-equipment', state };
  const slot = requestedSlot && allowed.includes(requestedSlot)
    ? requestedSlot
    : allowed.find((candidate) => !state.equipment[candidate]) ?? allowed[0];
  if (!slotAcceptsItem(item, slot)) return { ok: false, reason: 'wrong-slot', state };

  const inventory = state.inventory.filter((candidate) => candidate !== uid);
  const previousUid = state.equipment[slot];
  if (previousUid && previousUid !== uid) inventory.push(previousUid);
  if (inventory.length > 12) return { ok: false, reason: 'inventory-full', state };

  return {
    ok: true,
    equippedUid: uid,
    unequippedUid: previousUid ?? null,
    slot,
    state: {
      items: [...items.values()],
      inventory,
      equipment: { ...state.equipment, [slot]: uid },
    },
  };
}

export function unequipItem(state, slot) {
  if (!EQUIPMENT_SLOTS.includes(slot)) return { ok: false, reason: 'wrong-slot', state };
  const uid = state.equipment[slot];
  if (!uid) return { ok: false, reason: 'empty-slot', state };
  if (state.inventory.length >= 12) return { ok: false, reason: 'inventory-full', state };
  return {
    ok: true,
    uid,
    state: {
      items: [...state.items],
      inventory: [...state.inventory, uid],
      equipment: { ...state.equipment, [slot]: null },
    },
  };
}

export function salvageInventoryItems(state, uids) {
  const items = itemMap(state.items);
  const requested = new Set(uids);
  const owned = new Set(state.inventory);
  if ([...requested].some((uid) => !owned.has(uid))) {
    return { ok: false, reason: 'not-in-inventory', reward: 0, state };
  }
  let reward = 0;
  for (const uid of requested) {
    const item = items.get(uid);
    if (!item) return { ok: false, reason: 'missing-item', reward: 0, state };
    reward += 2 + item.rarity * 4;
    items.delete(uid);
  }
  return {
    ok: true,
    reward,
    state: {
      items: [...items.values()],
      inventory: state.inventory.filter((uid) => !requested.has(uid)),
      equipment: { ...state.equipment },
    },
  };
}

export function canMeleeAttack(grid, attacker, target) {
  const from = { x: Math.floor(attacker.x), y: Math.floor(attacker.y) };
  const to = { x: Math.floor(target.x), y: Math.floor(target.y) };
  const manhattan = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  if (manhattan !== 1) return false;
  return grid[from.y]?.[from.x] === '.' && grid[to.y]?.[to.x] === '.';
}

export function monsterCellKey(actor, tileSize = 64) {
  if (
    !actor ||
    !Number.isFinite(actor.x) ||
    !Number.isFinite(actor.y) ||
    !Number.isFinite(tileSize) ||
    tileSize <= 0
  ) {
    throw new TypeError('Monster cell requires a finite actor position and tile size');
  }
  return `${Math.floor(actor.x / tileSize)},${Math.floor(actor.y / tileSize)}`;
}

export function occupiedMonsterCells(monsters, tileSize = 64) {
  if (!Array.isArray(monsters)) throw new TypeError('Monster occupancy requires a list');
  return new Set(
    monsters
      .filter((monster) => monster && monster.dead === 0)
      .map((monster) => monsterCellKey(monster, tileSize)),
  );
}

export function canMonsterAdvance({
  monster,
  next,
  target,
  monsters,
  reservations,
  tileSize = 64,
}) {
  if (!monster || !next || !target || !Array.isArray(monsters) || !(reservations instanceof Set)) {
    throw new TypeError('Monster movement requires actors, a target and reservations');
  }
  const targetKey = monsterCellKey(target, tileSize);
  if (reservations.has(targetKey)) return false;
  for (const other of monsters) {
    if (!other || other === monster || other.dead !== 0) continue;
    if (monsterCellKey(other, tileSize) === targetKey) return false;
    const currentDistance = Math.hypot(monster.x - other.x, monster.y - other.y);
    const nextDistance = Math.hypot(next.x - other.x, next.y - other.y);
    const minimumDistance = tileSize * MONSTER_MIN_SEPARATION;
    if (nextDistance < minimumDistance && nextDistance <= currentDistance + 0.001) return false;
  }
  return true;
}

export function canWeaponAttack(grid, attacker, target, combat, lineOfSight = true) {
  const from = { x: Math.floor(attacker.x), y: Math.floor(attacker.y) };
  const to = { x: Math.floor(target.x), y: Math.floor(target.y) };
  if (grid[from.y]?.[from.x] !== '.' || grid[to.y]?.[to.x] !== '.') return false;

  if (combat?.projectile) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    return distance > 0 && distance <= combat.range && lineOfSight;
  }
  if (combat?.style !== 'spear') return canMeleeAttack(grid, attacker, target);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.abs(dx) + Math.abs(dy);
  if ((dx !== 0 && dy !== 0) || distance < 1 || distance > combat.range) return false;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  for (let step = 1; step <= distance; step += 1) {
    if (grid[from.y + stepY * step]?.[from.x + stepX * step] !== '.') return false;
  }
  return true;
}

export function monsterThreatAtDepth(monster, depth, scaling = floorScaling(depth)) {
  if (!monster?.threat || !Number.isInteger(depth) || depth < 1) {
    throw new TypeError('Monster threat requires a definition and positive depth');
  }
  const monsterCurve = scaling.monsters;
  const bossCurve = monster.boss ? scaling.boss : null;
  return Object.freeze({
    moveSpeed: Math.max(1.45, monster.speed * monsterCurve.moveSpeedMultiplier),
    attackRate:
      monster.threat.attackRate *
      monsterCurve.attackRateMultiplier *
      (bossCurve?.attackRateMultiplier ?? 1),
    vision: monster.threat.vision + monsterCurve.visionBonus,
    windup: Math.max(0.08, monster.threat.windup - monsterCurve.windupReduction),
    pursuit: monster.threat.pursuit + monsterCurve.pursuitBonus,
  });
}

export function createMonsterStates(level, tileSize = 64) {
  const scaling = level.scaling ?? floorScaling(
    level.depth,
    level.scalingVersion,
    level.difficulty,
  );
  return level.monsters.map((spawn, index) => {
    const definition = monsterById(spawn.id);
    if (!definition) throw new Error(`Unknown monster definition: ${spawn.id}`);
    const threat = monsterThreatAtDepth(definition, level.depth, scaling);
    const bossHpMultiplier = definition.boss ? scaling.boss.hpMultiplier : 1;
    const bossDamageMultiplier = definition.boss ? scaling.boss.damageMultiplier : 1;
    const maxHp = Math.max(
      1,
      Math.round(definition.hp * scaling.monsters.hpMultiplier * bossHpMultiplier),
    );
    return {
      ...definition,
      tier: monsterTier(definition),
      spritePath: definition.path,
      instanceId: spawn.instanceId,
      x: ((spawn.state?.x ?? spawn.x) + 0.5) * tileSize,
      y: ((spawn.state?.y ?? spawn.y) + 0.5) * tileSize,
      hp: Math.min(maxHp, spawn.state?.hp ?? maxHp),
      maxHp,
      damage: Math.max(
        1,
        Math.round(definition.damage * scaling.monsters.damageMultiplier * bossDamageMultiplier),
      ),
      xp: Math.max(1, Math.round(definition.xp * scaling.monsters.xpMultiplier)),
      speed: threat.moveSpeed,
      attackRate: threat.attackRate,
      vision: threat.vision,
      windup: threat.windup,
      pursuit: threat.pursuit,
      hit: 0,
      dead: 0,
      phase: index * 1.7,
      route: [],
      repathCooldown: index * 0.04,
      attackCooldown: 0.18 + (index % 3) * 0.08,
      attackWindup: 0,
      attackTargetAngle: 0,
      attackTargetX: 0,
      attackTargetY: 0,
      attackRecovery: 0,
      alertFlash: 0,
      alerted: 0,
      facing: 1,
    };
  });
}

export function assertEquipmentCatalog(items) {
  for (const item of items) {
    if (!item.slot) continue;
    if (allowedSlotsForItem(item).length === 0) throw new Error(`Unsupported slot for ${item.id}`);
    if (
      !item.stats ||
      !EQUIPMENT_STAT_KEYS.every((key) => Number.isFinite(item.stats[key] ?? 0)) ||
      Object.keys(item.stats).some((key) => !EQUIPMENT_STAT_KEYS.includes(key))
    ) {
      throw new Error(`Missing equipment stats for ${item.id}`);
    }
    if (item.slot === 'hand1') {
      const combat = item.combat;
      if (
        !combat ||
        !['blade', 'heavy', 'spear', 'staff', 'bow'].includes(combat.style) ||
        !['range', 'cooldown', 'attackDuration', 'damageScale'].every(
          (key) => Number.isFinite(combat[key]) && combat[key] > 0,
        )
      ) {
        throw new Error(`Missing combat profile for ${item.id}`);
      }
    }
  }
  return true;
}
