const COMMAND_TYPE = /^[a-z][a-z0-9-]{1,47}$/;
const ENTITY_ID = /^[a-z][a-z0-9:-]{0,79}$/;

const clonePayload = (payload) => Object.freeze(structuredClone(payload ?? {}));

/**
 * Stable, serializable command envelope shared by every gameplay domain.
 * The runtime owns sequence allocation; pure rule modules only validate and
 * resolve the supplied command. This is deliberately transport-agnostic so the
 * same payload can later cross a Worker or multiplayer boundary.
 */
export function createGameCommand({
  streamId,
  sequence,
  type,
  actorId = 'hero',
  targetId = null,
  payload = {},
} = {}) {
  if (typeof streamId !== 'string' || streamId.length < 1 || streamId.length > 64) {
    throw new TypeError('Game command requires a stable stream id');
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 1_000_000_000) {
    throw new RangeError('Game command sequence must be a positive integer');
  }
  if (typeof type !== 'string' || !COMMAND_TYPE.test(type)) {
    throw new TypeError('Game command requires a kebab-case type');
  }
  if (typeof actorId !== 'string' || !ENTITY_ID.test(actorId)) {
    throw new TypeError('Game command requires a stable actor id');
  }
  if (targetId !== null && (typeof targetId !== 'string' || !ENTITY_ID.test(targetId))) {
    throw new TypeError('Game command target must be a stable entity id');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Game command payload must be an object');
  }
  return Object.freeze({
    id: `${streamId}:command:${sequence}`,
    streamId,
    sequence,
    type,
    actorId,
    targetId,
    payload: clonePayload(payload),
  });
}

export function gameEvent(command, index, type, payload = {}) {
  if (!command?.id || !Number.isInteger(index) || index < 0 || !COMMAND_TYPE.test(type)) {
    throw new TypeError('Game event requires a command, nonnegative index and type');
  }
  return Object.freeze({
    id: `${command.id}:event:${index}`,
    commandId: command.id,
    type,
    payload: clonePayload(payload),
  });
}

export function commandAccepted(command, state, events = []) {
  if (!command?.id || !state || typeof state !== 'object' || !Array.isArray(events)) {
    throw new TypeError('Accepted command requires state and events');
  }
  return Object.freeze({
    ok: true,
    commandId: command.id,
    state: Object.freeze(structuredClone(state)),
    events: Object.freeze(events.map((event) => Object.freeze({ ...event }))),
  });
}

export function commandRejected(command, reason) {
  if (!command?.id || typeof reason !== 'string' || reason.length < 1) {
    throw new TypeError('Rejected command requires a reason');
  }
  return Object.freeze({
    ok: false,
    commandId: command.id,
    reason,
    events: Object.freeze([]),
  });
}
