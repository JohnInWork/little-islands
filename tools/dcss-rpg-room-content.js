import { chestFramesForSkin } from './dcss-rpg-chests.js';
import {
  MERCHANT_ACTOR_PATH,
  MERCHANT_ICON_PATH,
  createMerchantStock,
} from './dcss-rpg-merchant.js';
import { monsterById } from './dcss-rpg-content.js';

export const ROOM_ENCOUNTER_KINDS = Object.freeze([
  'unguarded',
  'guarded',
  'trapped',
  'cursed',
  'ambush',
  'mimic',
  'treasure-cache',
]);

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

function stableHash(seed, depth, roomIndex, salt = 0) {
  let value = (seed ^ Math.imul(depth + 1, 0x9e3779b1)) >>> 0;
  value ^= Math.imul(roomIndex + 1, 0x85ebca6b);
  value ^= salt >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

function stringSalt(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function cellKey(point) {
  return `${point.x},${point.y}`;
}

function roomContains(room, point) {
  return Boolean(
    point
    && point.x >= room.x
    && point.x < room.x + room.width
    && point.y >= room.y
    && point.y < room.y + room.height,
  );
}

function roomCells(level, room, anchor, occupied, salt) {
  const cells = [];
  for (let y = room.y + 1; y < room.y + room.height - 1; y += 1) {
    for (let x = room.x + 1; x < room.x + room.width - 1; x += 1) {
      const point = { x, y };
      if (level.grid[y]?.[x] !== '.' || occupied.has(cellKey(point))) continue;
      cells.push(point);
    }
  }
  return cells.sort((a, b) => {
    const aDistance = Math.abs(a.x - anchor.x) + Math.abs(a.y - anchor.y);
    const bDistance = Math.abs(b.x - anchor.x) + Math.abs(b.y - anchor.y);
    if (aDistance !== bDistance) return aDistance - bDistance;
    return stableHash(level.seed, level.depth, a.x + a.y * level.grid[0].length, salt)
      - stableHash(level.seed, level.depth, b.x + b.y * level.grid[0].length, salt);
  });
}

function occupiedCells(level) {
  return new Set([
    level.spawn,
    level.exit,
    level.sanctuary,
    level.objective?.boss,
    level.objective?.artifact,
    ...(level.doors ?? []),
    ...(level.monsters ?? []),
    ...(level.passiveCreatures ?? []),
    ...(level.loot ?? []),
    ...(level.events ?? []),
    ...(level.finds ?? []),
  ].filter(Boolean).map(cellKey));
}

function protectedMonsterIds(level) {
  return new Set([
    `monster-${level.depth}-0`,
    level.objective?.bossInstanceId,
    ...(level.surprises ?? []).flatMap(({ monsterIds = [] }) => monsterIds),
  ].filter(Boolean));
}

function availableMonsterIndexes(level, claimed, roomIndex, salt) {
  const protectedIds = protectedMonsterIds(level);
  return level.monsters
    .map((monster, index) => ({ monster, index }))
    // Water-bound creatures stay in their pool: they never guard vaults or turn into mimics.
    .filter(({ monster }) => !claimed.has(monster.instanceId) && !protectedIds.has(monster.instanceId) && !monsterById(monster.id)?.spawn)
    .sort((a, b) => (
      stableHash(level.seed, level.depth, roomIndex, salt ^ stringSalt(a.monster.instanceId))
      - stableHash(level.seed, level.depth, roomIndex, salt ^ stringSalt(b.monster.instanceId))
    ));
}

function relocateGuards({ level, monsters, occupied, claimed, plan, find, count, dormant }) {
  const encounterId = `encounter-${level.depth}-${plan.roomIndex}`;
  const selected = availableMonsterIndexes(level, claimed, plan.roomIndex, 0x47554152)
    .slice(0, count);
  for (const { monster } of selected) occupied.delete(cellKey(monster));
  const cells = roomCells(
    level,
    level.rooms[plan.roomIndex],
    find,
    occupied,
    dormant ? 0x414d4255 : 0x47554152,
  );
  const placedIds = [];
  selected.forEach(({ monster, index }, placementIndex) => {
    const position = cells[placementIndex];
    if (!position) {
      occupied.add(cellKey(monster));
      return;
    }
    claimed.add(monster.instanceId);
    placedIds.push(monster.instanceId);
    occupied.add(cellKey(position));
    monsters[index] = {
      ...monster,
      ...position,
      roomEncounterId: encounterId,
      guardingFindId: find.instanceId,
      ...(dormant ? { activationFindId: find.instanceId } : {}),
    };
  });
  return placedIds;
}

function materializeChestVault({ level, plan, monsters, events, finds, occupied, claimed }) {
  const findIndex = finds.findIndex(
    (candidate) => candidate.roomIndex === plan.roomIndex && candidate.id === 'sealed-cache',
  );
  if (findIndex < 0) return null;
  let find = finds[findIndex];
  const encounterId = `encounter-${level.depth}-${plan.roomIndex}`;
  const monsterIds = [];
  const trapEventIds = [];
  let kind = plan.variantId;
  let activation = 'immediate';

  if (plan.variantId === 'locked') {
    kind = 'guarded';
    const guardCount = plan.dangerBudget >= 6 ? 2 : 1;
    monsterIds.push(...relocateGuards({
      level,
      monsters,
      occupied,
      claimed,
      plan,
      find,
      count: guardCount,
      dormant: false,
    }));
    find = { ...find, guardMonsterIds: [...monsterIds] };
  } else if (plan.variantId === 'trapped') {
    const eventIndex = events.findIndex((event) => !roomContains(level.rooms[0], event));
    if (eventIndex >= 0) {
      const source = events[eventIndex];
      occupied.delete(cellKey(source));
      const [position] = roomCells(
        level,
        level.rooms[plan.roomIndex],
        find,
        occupied,
        0x54524150,
      );
      if (position) {
        occupied.add(cellKey(position));
        events[eventIndex] = {
          ...source,
          ...position,
          id: 'blade-trap',
          roomEncounterId: encounterId,
        };
        trapEventIds.push(source.instanceId);
      } else {
        occupied.add(cellKey(source));
      }
    }
  } else if (plan.variantId === 'mimic') {
    kind = 'mimic';
    activation = 'find';
    const [selected] = availableMonsterIndexes(level, claimed, plan.roomIndex, 0x4d494d49);
    if (selected) {
      const frames = chestFramesForSkin(plan.chestSkinId);
      occupied.delete(cellKey(selected.monster));
      claimed.add(selected.monster.instanceId);
      monsterIds.push(selected.monster.instanceId);
      monsters[selected.index] = {
        ...selected.monster,
        id: 'chest-mimic',
        x: find.x,
        y: find.y,
        spritePath: frames?.at(-1),
        roomEncounterId: encounterId,
        activationFindId: find.instanceId,
        vaultRewardGold: find.rewardGold,
      };
      find = {
        ...find,
        mimicMonsterId: selected.monster.instanceId,
        consumedByMimic: true,
      };
    }
  }

  finds[findIndex] = find;
  return deepFreeze({
    id: encounterId,
    roomPlanId: plan.id,
    roomIndex: plan.roomIndex,
    kind,
    variantId: plan.variantId,
    activation,
    findId: find.instanceId,
    surpriseId: null,
    monsterIds,
    trapEventIds,
    rewardLootIds: [],
  });
}

function materializeDoorVault(level, plan) {
  const surprise = (level.surprises ?? []).find(({ roomIndex }) => roomIndex === plan.roomIndex);
  if (!surprise) return null;
  return deepFreeze({
    id: `encounter-${level.depth}-${plan.roomIndex}`,
    roomPlanId: plan.id,
    roomIndex: plan.roomIndex,
    kind: surprise.type === 'mixed' ? 'ambush' : 'treasure-cache',
    variantId: plan.variantId,
    activation: 'door',
    findId: null,
    surpriseId: surprise.id,
    monsterIds: [...(surprise.monsterIds ?? [])],
    trapEventIds: [],
    rewardLootIds: [...(surprise.lootIds ?? [])],
  });
}

function materializeMerchant(level, plan, occupied) {
  const room = level.rooms[plan.roomIndex];
  // A service room is readable and safe. If the base floor budget happened to
  // seed ordinary hazards here, remove only those unclaimed ambient spawns.
  for (const collection of [level.monsters, level.events, level.finds]) {
    for (let index = collection.length - 1; index >= 0; index -= 1) {
      if (!roomContains(room, collection[index])) continue;
      occupied.delete(cellKey(collection[index]));
      collection.splice(index, 1);
    }
  }
  const anchor = {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  };
  const [position] = roomCells(level, room, anchor, occupied, 0x53484f50);
  if (!position) return null;
  occupied.add(cellKey(position));
  return deepFreeze({
    instanceId: `merchant-${level.depth}-${plan.roomIndex}`,
    id: 'merchant',
    roomIndex: plan.roomIndex,
    variantId: plan.variantId,
    actorPath: MERCHANT_ACTOR_PATH,
    iconPath: MERCHANT_ICON_PATH,
    ...position,
    stock: createMerchantStock({
      seed: level.seed,
      depth: level.depth,
      roomIndex: plan.roomIndex,
      variantId: plan.variantId,
    }),
  });
}

/**
 * Converts abstract RoomPlans into concrete actors and hazards without changing
 * the floor's total monster/event budgets. Existing spawns are reassigned to a
 * room instead of silently adding extra difficulty.
 */
export function materializeDungeonRoomContent(level) {
  if (
    !level
    || !Number.isInteger(level.seed)
    || !Number.isInteger(level.depth)
    || !Array.isArray(level.roomPlans)
    || !Array.isArray(level.monsters)
    || !Array.isArray(level.events)
    || !Array.isArray(level.finds)
  ) throw new TypeError('Room content requires a planned dungeon');

  const monsters = level.monsters.map((monster) => ({ ...monster }));
  const events = level.events.map((event) => ({ ...event }));
  const finds = level.finds.map((find) => ({ ...find }));
  const occupied = occupiedCells(level);
  const claimed = new Set();
  const encounters = [];
  const merchants = [];

  for (const plan of level.roomPlans) {
    if (plan.archetypeId === 'merchant-alcove') {
      const merchant = materializeMerchant({ ...level, monsters, events, finds }, plan, occupied);
      if (merchant) merchants.push(merchant);
      continue;
    }
    if (plan.archetypeId !== 'treasure-vault') continue;
    const encounter = materializeChestVault({
      level: { ...level, monsters },
      plan,
      monsters,
      events,
      finds,
      occupied,
      claimed,
    }) ?? materializeDoorVault(level, plan);
    if (encounter) encounters.push(encounter);
  }

  return deepFreeze({ monsters, events, finds, encounters, merchants });
}
