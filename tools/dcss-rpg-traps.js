// Existing event placements remain the authoritative source. Interpreting a
// blade-trap does not call RNG, move content or change saved event identities.
export function trapsFromDungeon(dungeon) {
  if (!Array.isArray(dungeon?.events)) throw new TypeError('Trap records require dungeon events');
  return dungeon.events.filter(({ id }) => id === 'blade-trap').map((event) => {
    if (typeof event.instanceId !== 'string' || !/^event-\d+-\d+$/.test(event.instanceId)
      || !Number.isInteger(event.x) || event.x < 0
      || !Number.isInteger(event.y) || event.y < 0
      || (dungeon.grid && dungeon.grid[event.y]?.[event.x] === undefined)) {
      throw new TypeError('Invalid trap event placement');
    }
    return Object.freeze({
      instanceId: event.instanceId,
      eventId: event.instanceId,
      x: event.x,
      y: event.y,
      kind: 'blade',
      tier: 1,
    });
  });
}

function validIds(ids) {
  return Array.isArray(ids) && ids.every((id) => typeof id === 'string' && /^event-\d+-\d+$/.test(id));
}

/** Exact reference validation belongs at hydration, using the complete generated
 * events before resolved ones are removed. Autosave only checks the cheap shape. */
export function validateDetectedTrapIds(ids, traps) {
  if (!validIds(ids) || new Set(ids).size !== ids.length || !Array.isArray(traps)) return false;
  const known = new Set(traps.map(({ instanceId }) => instanceId));
  return ids.every((id) => known.has(id));
}

export function validateDisarmedTrapIds(ids, traps, detectedTrapIds, resolvedEventIds) {
  if (!validateDetectedTrapIds(ids, traps)
    || !validIds(detectedTrapIds)
    || !validIds(resolvedEventIds)) return false;
  const detected = new Set(detectedTrapIds);
  const resolved = new Set(resolvedEventIds);
  return ids.every((id) => detected.has(id) && resolved.has(id));
}

function requireStateArrays(traps, detectedTrapIds, resolvedEventIds) {
  if (!Array.isArray(traps) || !validIds(detectedTrapIds) || !validIds(resolvedEventIds)) {
    throw new TypeError('Trap queries require records and event ID arrays');
  }
}

/** Pure, monotonic discovery. Origin and trap coordinates are integer grid cells;
 * radius is Manhattan distance. The supplied LOS must use the CURRENT door grid.
 * Already-known IDs survive even if resolved events were removed from runtime. */
export function discoverTraps({
  traps,
  origin,
  capabilities,
  detectedTrapIds = [],
  resolvedEventIds = [],
  hasLineOfSight,
}) {
  requireStateArrays(traps, detectedTrapIds, resolvedEventIds);
  if (!Number.isInteger(origin?.x) || origin.x < 0 || !Number.isInteger(origin?.y) || origin.y < 0
    || typeof hasLineOfSight !== 'function') throw new TypeError('Trap discovery requires a grid origin and LOS');
  const radius = capabilities?.trapDetectionRadius ?? 0;
  const tier = capabilities?.trapDetectionTier ?? 0;
  if (!Number.isInteger(radius) || radius < 0 || radius > 32
    || !Number.isInteger(tier) || tier < 0 || tier > 3) {
    throw new RangeError('Invalid trap detection capabilities');
  }
  const detected = new Set(detectedTrapIds);
  const resolved = new Set(resolvedEventIds);
  if (radius > 0 && tier > 0) {
    for (const trap of traps) {
      if (detected.has(trap.instanceId) || resolved.has(trap.eventId) || trap.tier > tier) continue;
      const distance = Math.abs(trap.x - origin.x) + Math.abs(trap.y - origin.y);
      if (distance <= radius && hasLineOfSight(origin, { x: trap.x, y: trap.y })) {
        detected.add(trap.instanceId);
      }
    }
  }
  return [...detected].sort();
}

/** Only known, unspent traps affect navigation. Hidden traps must never leak their
 * location by altering auto-paths. Triggered IDs stay in the normal event ledger. */
export function activeDetectedTrapCells({ traps, detectedTrapIds = [], resolvedEventIds = [] }) {
  requireStateArrays(traps, detectedTrapIds, resolvedEventIds);
  const detected = new Set(detectedTrapIds);
  const resolved = new Set(resolvedEventIds);
  return new Set(traps
    .filter((trap) => detected.has(trap.instanceId) && !resolved.has(trap.eventId))
    .sort((a, b) => a.instanceId < b.instanceId ? -1 : a.instanceId > b.instanceId ? 1 : 0)
    .map(({ x, y }) => `${x},${y}`));
}
