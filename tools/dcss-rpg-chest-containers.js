import { rollCacheArtifact } from './dcss-rpg-artifacts.js';
import { rollMaterial } from './dcss-rpg-materials.js';
import { STORY_DEPTH } from './dcss-rpg-run.js';
import { LOOT_CATALOG, lootById } from './dcss-rpg-content.js';
import {
  materializeItemAffixes,
  rollItemAffixes,
  validateItemAffixIds,
} from './dcss-rpg-affixes.js';
import {
  materializeProceduralArtifact,
  validateProceduralArtifactState,
} from './dcss-rpg-artifacts.js';
import { effectiveLootDepth } from './dcss-rpg-scaling.js';
import { validateLootAbundance } from './dcss-rpg-loot-economy.js';
import {
  commandAccepted,
  commandRejected,
  gameEvent,
} from './dcss-rpg-game-commands.js';

export const CHEST_CONTAINER_CAPACITY = 8;
/** The camp stash reuses the whole container contract, but it has no floor. */
export const CAMP_STASH_CONTAINER_ID = 'camp-stash';

export function containerDepthOf(findId) {
  return findId === CAMP_STASH_CONTAINER_ID ? 1 : Number(String(findId).split('-')[1]);
}
/**
 * The bag.
 *
 * Twelve slots meant the hero came home to sell three times a floor — «мало»,
 * said Ivan, and asked for thirty and a skill that widens it. Thirty is the
 * bag everybody carries; `portering` adds six a rank on top, so the ceiling a
 * save is allowed to reach is thirty plus eighteen.
 */
export const HERO_BACKPACK_CAPACITY = 30;
export const MAX_BACKPACK_SLOTS = 18;
export const MAX_BACKPACK_CAPACITY = HERO_BACKPACK_CAPACITY + MAX_BACKPACK_SLOTS;

/** How much this particular hero can carry, skills included. */
export function backpackCapacity(capabilities = {}) {
  const bonus = Number.isFinite(capabilities.backpackSlots) ? capabilities.backpackSlots : 0;
  return HERO_BACKPACK_CAPACITY + Math.max(0, Math.min(MAX_BACKPACK_SLOTS, Math.round(bonus)));
}
export const CHEST_CONTAINER_COMMANDS = Object.freeze({
  take: 'chest-take',
  store: 'chest-store',
  takeGold: 'chest-take-gold',
});

const stableHash = (...parts) => {
  let value = 0x811c9dc5;
  for (const character of parts.join('|')) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 0x01000193) >>> 0;
    value ^= value >>> 13;
  }
  return value >>> 0;
};

const cloneRecord = (item) => ({
  id: item.id,
  uid: item.uid,
  ...(item.stack ? { stack: item.stack } : {}),
  ...(item.affixIds ? { affixIds: [...item.affixIds] } : {}),
  ...(item.artifactPowerId
    ? {
        artifactPowerId: item.artifactPowerId,
        artifactCurseId: item.artifactCurseId ?? null,
      }
    : item.slot || lootById(item.id)?.slot
      ? { artifactPowerId: null, artifactCurseId: null }
      : {}),
});

function validItemRecord(item) {
  const definition = lootById(item?.id);
  return Boolean(
    definition
    && typeof item.uid === 'string'
    && item.uid.length >= 1
    && item.uid.length <= 80
    && validateItemAffixIds(definition, item.affixIds, { required: Boolean(definition.slot) })
    && validateProceduralArtifactState(definition, item)
    && (item.stack === undefined || (
      Number.isInteger(item.stack)
      && item.stack >= 1
      && item.stack <= 999
    )),
  );
}

function itemRecord({ seed, depth, find, definition, index, artifact = null }) {
  const uid = `chest-${depth}-${find.roomIndex}-${index}`;
  if (!definition.slot) {
    const maximum = Math.max(1, Math.min(3, definition.stack ?? 1));
    return Object.freeze({
      id: definition.id,
      uid,
      stack: 1 + (stableHash(seed, depth, find.instanceId, index, definition.id) % maximum),
    });
  }
  // An artefact is a named thing: it keeps its own name and its own look, so it
  // is never made of anything.
  if (artifact?.artifactPowerId) {
    return Object.freeze({
      id: definition.id,
      uid,
      affixIds: Object.freeze([]),
      artifactPowerId: artifact.artifactPowerId,
      artifactCurseId: artifact.artifactCurseId ?? null,
    });
  }
  const materialId = rollMaterial({ seed, depth, instanceId: uid, item: definition });
  return Object.freeze({
    id: definition.id,
    uid,
    affixIds: Object.freeze([...rollItemAffixes({
      seed,
      depth,
      instanceId: uid,
      item: definition,
    })]),
    ...(materialId ? { materialId } : {}),
    artifactPowerId: null,
    artifactCurseId: null,
  });
}

function stablePick(pool, seed, depth, findId, salt, excludedIds = new Set()) {
  return [...pool]
    .filter(({ id }) => !excludedIds.has(id))
    .sort((left, right) => (
      stableHash('chest-content-v1', seed, depth, findId, salt, left.id)
      - stableHash('chest-content-v1', seed, depth, findId, salt, right.id)
    ))[0] ?? null;
}

export function createChestContainerStates({
  seed,
  depth,
  finds,
  lootAbundance = 1,
  resolvedFindIds = [],
  guaranteedArtifact = false,
} = {}) {
  if (
    !Number.isInteger(seed)
    || seed < 0
    || !Number.isInteger(depth)
    // Depth zero is the surface: it has no chests, and that is a valid floor.
    || depth < 0
    || !Array.isArray(finds)
    || !validateLootAbundance(lootAbundance)
    || !Array.isArray(resolvedFindIds)
  ) throw new TypeError('Chest containers require a generated floor');

  const resolved = new Set(resolvedFindIds);
  const eligible = LOOT_CATALOG.filter((item) => (
    !item.gold
    && item.id !== 'coin-cache'
    && item.randomDrop !== false
    && effectiveLootDepth(item) <= depth
    && (item.rarity ?? 0) <= Math.min(3, Math.floor((depth + 2) / 3))
  ));
  const equipment = eligible.filter((item) => Boolean(item.slot));
  const utility = eligible.filter((item) => !item.slot);

  return Object.freeze(finds
    .filter(({ id }) => id === 'sealed-cache')
    .map((find) => {
      if (
        typeof find.instanceId !== 'string'
        || !Number.isInteger(find.roomIndex)
        || find.roomIndex < 0
        || !Number.isInteger(find.rewardGold)
        || find.rewardGold < 0
      ) throw new TypeError('Chest container requires a stable find');

      if (resolved.has(find.instanceId)) {
        return Object.freeze({
          findId: find.instanceId,
          opened: true,
          destroyed: find.cacheVariant === 'mimic',
          gold: 0,
          items: Object.freeze([]),
        });
      }

      const desired = Math.max(1, Math.min(
        4,
        Math.round((depth >= 6 ? 3 : 2) * lootAbundance),
      ));
      const selected = [];
      const ids = new Set();
      const first = stablePick(equipment, seed, depth, find.instanceId, 'equipment', ids);
      if (first) {
        selected.push(first);
        ids.add(first.id);
      }
      const second = stablePick(utility, seed, depth, find.instanceId, 'utility', ids);
      if (second && selected.length < desired) {
        selected.push(second);
        ids.add(second.id);
      }
      for (let index = selected.length; index < desired; index += 1) {
        const next = stablePick(eligible, seed, depth, find.instanceId, `extra-${index}`, ids);
        if (!next) break;
        selected.push(next);
        ids.add(next.id);
      }

      // Whatever is inside is decided first; only then does the cache decide
      // whether one of those things is the run's artefact.
      const artifact = rollCacheArtifact({
        seed,
        depth,
        findId: find.instanceId,
        cacheVariant: find.cacheVariant,
        items: selected,
        guaranteed: guaranteedArtifact,
        roadLength: STORY_DEPTH,
      });
      return Object.freeze({
        findId: find.instanceId,
        opened: false,
        destroyed: false,
        gold: find.rewardGold,
        items: Object.freeze(selected.map((definition, index) => (
          itemRecord({
            seed,
            depth,
            find,
            definition,
            index,
            artifact: artifact?.itemIndex === index ? artifact : null,
          })
        ))),
      });
    }));
}

export function validateChestContainerStates(containers, { depth, findIds = null } = {}) {
  if (
    !Array.isArray(containers)
    || containers.length > 3
    || !Number.isInteger(depth)
    || depth < 0
  ) return false;
  const known = findIds ? new Set(findIds) : null;
  const ids = containers.map(({ findId } = {}) => findId);
  if (new Set(ids).size !== ids.length) return false;
  if (known && containers.length !== known.size) return false;
  return containers.every((container) => (
    container
    && typeof container.findId === 'string'
    && (container.findId === CAMP_STASH_CONTAINER_ID
      || new RegExp(`^find-${depth}-\\d+$`).test(container.findId))
    && (!known || known.has(container.findId))
    && typeof container.opened === 'boolean'
    && typeof container.destroyed === 'boolean'
    && (!container.destroyed || container.opened)
    && Number.isSafeInteger(container.gold)
    && container.gold >= 0
    && Array.isArray(container.items)
    && container.items.length <= CHEST_CONTAINER_CAPACITY
    && new Set(container.items.map(({ uid } = {}) => uid)).size === container.items.length
    && container.items.every(validItemRecord)
  ));
}

export function openChestContainer(container, { damaged = false, consumedByMimic = false } = {}) {
  if (!container || container.opened || !validateChestContainerStates([container], {
    depth: Number(container.findId?.split('-')[1]),
  })) return null;
  if (consumedByMimic) {
    return Object.freeze({
      ...container,
      opened: true,
      destroyed: true,
      gold: 0,
      items: Object.freeze([]),
    });
  }
  return Object.freeze({
    ...container,
    opened: true,
    destroyed: damaged,
    gold: damaged ? Math.ceil(container.gold / 2) : container.gold,
    items: Object.freeze((damaged
      ? container.items.filter((_item, index) => index % 2 === 0)
      : container.items
    ).map((item) => Object.freeze(cloneRecord(item)))),
  });
}

function validTransfer(command, container, type) {
  return Boolean(
    command?.type === type
    && command.targetId === container?.findId
    && container.opened
    && validateChestContainerStates([container], {
      depth: containerDepthOf(container.findId),
    }),
  );
}

function playerStateValid(items, inventory) {
  return Array.isArray(items)
    && Array.isArray(inventory)
    // The widest a bag can ever be: a save is checked against the ceiling, a
    // pick-up against the hero's own capacity.
    && inventory.length <= MAX_BACKPACK_CAPACITY
    && new Set(items.map(({ uid } = {}) => uid)).size === items.length
    && new Set(inventory).size === inventory.length
    && inventory.every((uid) => items.some((item) => item.uid === uid));
}

export function takeChestItem({
  command, container, uid, items, inventory, capacity = HERO_BACKPACK_CAPACITY,
} = {}) {
  if (!validTransfer(command, container, CHEST_CONTAINER_COMMANDS.take)) {
    return commandRejected(command, 'invalid');
  }
  if (!playerStateValid(items, inventory) || typeof uid !== 'string') {
    return commandRejected(command, 'invalid-state');
  }
  const stored = container.items.find((item) => item.uid === uid);
  if (!stored) return commandRejected(command, 'unknown-item');
  const definition = lootById(stored.id);
  const merge = !definition.slot
    ? items.find((item) => inventory.includes(item.uid) && item.id === stored.id && !item.affixIds)
    : null;
  if (!merge && inventory.length >= capacity) {
    return commandRejected(command, 'full');
  }
  if (!merge && items.some((item) => item.uid === stored.uid)) {
    return commandRejected(command, 'duplicate');
  }
  const nextItems = merge
    ? items.map((item) => item.uid === merge.uid
      ? { ...item, stack: (item.stack ?? 1) + (stored.stack ?? 1) }
      : { ...item })
    : [...items.map((item) => ({ ...item })), cloneRecord(stored)];
  const nextInventory = merge ? [...inventory] : [...inventory, stored.uid];
  const nextContainer = {
    ...container,
    items: container.items.filter((item) => item.uid !== uid).map(cloneRecord),
  };
  return commandAccepted(command, {
    container: nextContainer,
    items: nextItems,
    inventory: nextInventory,
  }, [gameEvent(command, 0, 'chest-item-taken', { uid, mergedInto: merge?.uid ?? null })]);
}

export function storeChestItem({ command, container, uid, items, inventory } = {}) {
  if (!validTransfer(command, container, CHEST_CONTAINER_COMMANDS.store)) {
    return commandRejected(command, 'invalid');
  }
  if (!playerStateValid(items, inventory) || typeof uid !== 'string') {
    return commandRejected(command, 'invalid-state');
  }
  if (container.destroyed) return commandRejected(command, 'destroyed');
  const item = items.find((candidate) => candidate.uid === uid);
  if (!item || !inventory.includes(uid)) return commandRejected(command, 'unknown-item');
  if (container.items.some((stored) => stored.uid === item.uid)) {
    return commandRejected(command, 'duplicate');
  }
  const definition = lootById(item.id);
  const merge = !definition.slot
    ? container.items.find((stored) => stored.id === item.id && !stored.affixIds)
    : null;
  if (!merge && container.items.length >= CHEST_CONTAINER_CAPACITY) {
    return commandRejected(command, 'full');
  }
  const storedRecord = cloneRecord(item);
  const nextStored = merge
    ? container.items.map((stored) => stored.uid === merge.uid
      ? { ...stored, stack: (stored.stack ?? 1) + (item.stack ?? 1) }
      : cloneRecord(stored))
    : [...container.items.map(cloneRecord), storedRecord];
  return commandAccepted(command, {
    container: { ...container, items: nextStored },
    items: items.filter((candidate) => candidate.uid !== uid).map((candidate) => ({ ...candidate })),
    inventory: inventory.filter((candidate) => candidate !== uid),
  }, [gameEvent(command, 0, 'chest-item-stored', { uid, mergedInto: merge?.uid ?? null })]);
}

export function takeChestGold({ command, container, gold } = {}) {
  if (!validTransfer(command, container, CHEST_CONTAINER_COMMANDS.takeGold)) {
    return commandRejected(command, 'invalid');
  }
  if (!Number.isSafeInteger(gold) || gold < 0) return commandRejected(command, 'invalid-state');
  if (container.gold < 1) return commandRejected(command, 'empty');
  const amount = container.gold;
  return commandAccepted(command, {
    container: { ...container, gold: 0, items: container.items.map(cloneRecord) },
    gold: gold + amount,
  }, [gameEvent(command, 0, 'chest-gold-taken', { amount })]);
}

export function materializeChestItem(record) {
  const definition = lootById(record?.id);
  if (!definition || !validItemRecord(record)) return null;
  return materializeProceduralArtifact(
    materializeItemAffixes(definition, record),
    record,
  );
}
