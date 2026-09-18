import {
  commandAccepted,
  commandRejected,
  gameEvent,
} from './dcss-rpg-game-commands.js';

export const RAW_MEAT_ITEM_ID = 'raw-meat';
export const COOKED_MEAT_ITEM_ID = 'cooked-meat';
export const SURVIVAL_COMMANDS = Object.freeze({
  hunt: 'hunt-wildlife',
  strike: 'strike-wildlife',
  cook: 'cook-meat',
});

function commandTargets(command, type, targetId) {
  return command?.type === type && command.actorId === 'hero' && command.targetId === targetId;
}

export function beginWildlifeHunt({ command, creature } = {}) {
  if (!creature?.instanceId || !commandTargets(command, SURVIVAL_COMMANDS.hunt, creature.instanceId)) {
    return commandRejected(command, 'invalid-target');
  }
  if (creature.defeated) return commandRejected(command, 'defeated');
  if (creature.hunted) return commandRejected(command, 'already-hunted');
  const state = {
    ...creature,
    hunted: true,
    hp: creature.maxHp,
  };
  return commandAccepted(command, { creature: state }, [
    gameEvent(command, 0, 'wildlife-alerted', {
      creatureId: creature.instanceId,
      response: creature.huntResponse,
    }),
  ]);
}

export function strikeWildlife({ command, creature, damage, items, inventory, meatUid } = {}) {
  if (!creature?.instanceId || !commandTargets(command, SURVIVAL_COMMANDS.strike, creature.instanceId)) {
    return commandRejected(command, 'invalid-target');
  }
  if (!creature.hunted) return commandRejected(command, 'not-hunted');
  if (creature.defeated || creature.hp <= 0) return commandRejected(command, 'defeated');
  if (!Number.isFinite(damage) || damage <= 0) return commandRejected(command, 'invalid-damage');

  const dealt = Math.min(creature.hp, Math.max(1, Math.ceil(damage - creature.defense)));
  const hp = Math.max(0, creature.hp - dealt);
  const defeated = hp === 0;
  const nextCreature = { ...creature, hp, defeated };
  const events = [gameEvent(command, 0, 'wildlife-damaged', {
    creatureId: creature.instanceId,
    damage: dealt,
    hp,
  })];
  if (defeated) {
    const loot = Array.isArray(items) && Array.isArray(inventory) && typeof meatUid === 'string'
      ? transactStackItems({
          items,
          inventory,
          produce: { id: RAW_MEAT_ITEM_ID, amount: creature.meatYield, uid: meatUid },
        })
      : Object.freeze({ ok: false, reason: 'no-inventory' });
    events.push(gameEvent(command, 1, 'wildlife-defeated', {
      creatureId: creature.instanceId,
      itemId: RAW_MEAT_ITEM_ID,
      amount: creature.meatYield,
      stored: loot.ok,
    }));
    return commandAccepted(command, {
      creature: nextCreature,
      ...(loot.ok ? loot.state : {}),
    }, events);
  }
  return commandAccepted(command, { creature: nextCreature }, events);
}

function cloneInventoryState(items, inventory) {
  if (!Array.isArray(items) || !Array.isArray(inventory)) {
    throw new TypeError('Stack transaction requires item and inventory arrays');
  }
  return {
    items: items.map((item) => ({ ...item })),
    inventory: [...inventory],
  };
}

function consumeStack(state, itemId, amount) {
  let remaining = amount;
  for (const uid of [...state.inventory]) {
    if (remaining <= 0) break;
    const index = state.items.findIndex((item) => item.uid === uid && item.id === itemId);
    if (index < 0) continue;
    const item = state.items[index];
    const stack = item.stack ?? 1;
    const consumed = Math.min(stack, remaining);
    remaining -= consumed;
    if (consumed < stack) item.stack = stack - consumed;
    else {
      state.items.splice(index, 1);
      state.inventory = state.inventory.filter((candidate) => candidate !== uid);
    }
  }
  return remaining === 0;
}

function addStack(state, itemId, amount, uid, inventoryLimit) {
  const existing = state.items.find(
    (item) => item.id === itemId && state.inventory.includes(item.uid),
  );
  if (existing) {
    existing.stack = Math.min(999, (existing.stack ?? 1) + amount);
    return true;
  }
  if (state.inventory.length >= inventoryLimit || state.items.some((item) => item.uid === uid)) {
    return false;
  }
  state.items.push({ id: itemId, uid, stack: amount });
  state.inventory.push(uid);
  return true;
}

/** Atomic inventory transaction used for both butchering rewards and cooking. */
export function transactStackItems({
  items,
  inventory,
  consume = null,
  produce,
  inventoryLimit = 12,
} = {}) {
  if (
    !produce || typeof produce.id !== 'string' || typeof produce.uid !== 'string'
    || !Number.isInteger(produce.amount) || produce.amount < 1 || produce.amount > 999
  ) return Object.freeze({ ok: false, reason: 'invalid-output' });
  if (!Number.isInteger(inventoryLimit) || inventoryLimit < 1) {
    return Object.freeze({ ok: false, reason: 'invalid-limit' });
  }
  const state = cloneInventoryState(items, inventory);
  if (consume) {
    if (typeof consume.id !== 'string' || !Number.isInteger(consume.amount) || consume.amount < 1) {
      return Object.freeze({ ok: false, reason: 'invalid-input' });
    }
    if (!consumeStack(state, consume.id, consume.amount)) {
      return Object.freeze({ ok: false, reason: 'missing-input' });
    }
  }
  if (!addStack(state, produce.id, produce.amount, produce.uid, inventoryLimit)) {
    return Object.freeze({ ok: false, reason: 'full' });
  }
  return Object.freeze({
    ok: true,
    state: Object.freeze({
      items: Object.freeze(state.items.map((item) => Object.freeze({ ...item }))),
      inventory: Object.freeze([...state.inventory]),
    }),
  });
}

/**
 * The fire always turns raw meat into something edible. A cook turns it into
 * a dish instead, which is the only thing the skill changes here.
 */
export function cookMeat({
  command,
  siteId,
  items,
  inventory,
  amount,
  outputUid,
  outputId = COOKED_MEAT_ITEM_ID,
} = {}) {
  if (!commandTargets(command, SURVIVAL_COMMANDS.cook, siteId)) {
    return commandRejected(command, 'invalid-target');
  }
  if (!Number.isInteger(amount) || amount < 1) return commandRejected(command, 'missing-meat');
  const cooked = typeof outputId === 'string' && outputId.length > 0 ? outputId : COOKED_MEAT_ITEM_ID;
  const transaction = transactStackItems({
    items,
    inventory,
    consume: { id: RAW_MEAT_ITEM_ID, amount },
    produce: { id: cooked, amount, uid: outputUid },
  });
  if (!transaction.ok) return commandRejected(command, transaction.reason);
  return commandAccepted(command, transaction.state, [
    gameEvent(command, 0, 'meat-cooked', {
      itemId: cooked,
      amount,
    }),
  ]);
}
