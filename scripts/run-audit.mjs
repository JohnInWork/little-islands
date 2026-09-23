/**
 * Can a run be finished, and where does it break?
 *
 * Nobody had ever walked a whole run end to end, so this walks the generator
 * instead: for many seeds, every road and every floor from the city down to
 * the rune at twenty-four, it builds the floor exactly the way the game does
 * and asks the questions a stuck player would ask. It plays nothing — no
 * renderer, no DOM, no timing — so what it cannot see is listed at the end of
 * the report rather than guessed at.
 *
 * Usage:
 *   node scripts/run-audit.mjs [seedCount=40] [--json] [--chains=8] [--landings=400]
 *
 * `--chains` = seeds whose whole descent/branch-gate/backtrack chain is replayed
 * through the real save transitions; `--landings` = seeds for the cheap chasm
 * fall sweep (the one soft-lock too rare for 40 seeds).
 *
 * The module also exports the per-floor audit, so the regression test can run
 * the same checks over a handful of seeds.
 *
 * ── Passability, mirrored from the runtime (tools/dcss.js) ──────────────────
 * - `isHeroWalkable` (dcss.js ~l.4640): floor '.' and shallow water '~' are
 *   walkable; a chasm ':' only while flying; everything else ('#') is a wall.
 * - Closed doors 'D' are not walls: a hero path that meets one opens it
 *   (`updateHero` → `beginOpenDoor`, dcss.js ~l.17040) and `beginDoorTransition`
 *   (~l.11809) refuses only the city jail door while jailed. So 'D' counts as
 *   passable here.
 * - Hostile monsters block a cell but can be killed; bystanders are pushed
 *   aside (`heroBlockingActors`, ~l.5095). Neither is a structural wall.
 * - Environment props block nothing («Props block nothing — the hero walks
 *   through them», dcss-rpg-environment.js ~l.632).
 * - Finds (chests, graves, fountains) are walls ONLY for the tap router
 *   (`findPath` → `blockingFindCells`, dcss.js ~l.5048/5112); a stick/WASD
 *   step ignores them (`stepHeroToward`, ~l.5515). A find sitting in a
 *   one-cell corridor therefore breaks tap-to-move but not the floor: that is
 *   reported as a warning, not a soft-lock.
 * - Stairs: the arrival cell `dungeon.spawn` is the stair up (`onAscentStair`,
 *   ~l.4600), `dungeon.exit` is the stair down; on floors 18/24 the exit also
 *   carries the artefact / rune (`roadPrize`, ~l.1133). Chapter floors refuse
 *   the stair until the guardian dies (`canLeaveDungeonFloor`).
 * - A fall through a chasm lands on a random '.' cell of the floor below that
 *   holds no monster/find/event (`chasmLandingCell`, ~l.4710) — replicated
 *   exactly below, because a landing on an island would strand the hero.
 */

import { fileURLToPath } from 'node:url';

import {
  advanceRunFloor,
  createRun,
  enterBranchThroughGate,
  generateDungeon,
  guardianRemembered,
  hydrateDungeon,
  rememberGuardian,
  retreatRunFloor,
  switchRunBranch,
} from '../tools/dcss-rpg-core.js';
import {
  BEYOND_ROAD_DEPTH,
  CHAPTER_END_DEPTHS,
  FLOORS_PER_CHAPTER,
  GUARDIAN_LADDERS,
  SANCTUARY_COST,
  STORY_DEPTH,
  chapterGuardianForDepth,
  canLeaveDungeonFloor,
  goldRewardForMonster,
  roadEndingAt,
} from '../tools/dcss-rpg-run.js';
import { BRANCH_GATES, branchGateFor } from '../tools/dcss-rpg-branch-gates.js';
import { CITY_DEPTH } from '../tools/dcss-rpg-city.js';
import {
  LOOT_CATALOG,
  MONSTER_CATALOG,
  RUN_BRANCHES,
  lootById,
  monsterById,
  monsterSuitsBranch,
} from '../tools/dcss-rpg-content.js';
import { CHASM_CELL, chasmFallFloors, chasmLandingCell as runtimeChasmLanding } from '../tools/dcss-rpg-chasm.js';
import { lockpickCost } from '../tools/dcss-rpg-chests.js';
import { createDungeonEnvironment } from '../tools/dcss-rpg-environment.js';
import { isSecretFind } from '../tools/dcss-rpg-finds.js';
import { HUNGER_COST, HUNGER_MAX } from '../tools/dcss-rpg-hunger.js';
import { HOUSE_PRICE } from '../tools/dcss-rpg-house.js';
import { awardHeroExperience } from '../tools/dcss-rpg-progression.js';
import { RESPEC_RATES } from '../tools/dcss-rpg-respec.js';
import { createMonsterStates, isWeaponItem, mitigateDamage } from '../tools/dcss-rpg-rules.js';
import { effectiveLootDepth } from '../tools/dcss-rpg-scaling.js';
import { TAVERN_BED_PRICE } from '../tools/dcss-rpg-tavern.js';
import { trapsFromDungeon } from '../tools/dcss-rpg-traps.js';

/**
 * Soft-locks the audit has found and that are NOT fixed yet. They are listed so
 * the regression test stays green while the bug stays visible: each entry is
 * re-checked by the test, and the CLI only fails on soft-locks missing here.
 *
 * Found by `--landings=1000` (20 597 replayed jumps, 12 strandings ≈ 0.06 %).
 * All are the same bug: `chasmLandingCell` in tools/dcss.js (~l.4709) picks
 * any open '.' cell of the floor below, including cells on a chasm island cut
 * off from both stairs, and a hero without flight, a home stone or a portal is
 * stranded there. Fix: keep only cells reachable from `level.spawn`
 * (`walkableFrom` in dcss-rpg-chasm.js), ideally by moving the function into
 * dcss-rpg-chasm.js and importing it here instead of the mirror below. Then
 * delete these entries — the test will say so.
 */
export const KNOWN_SOFTLOCKS = Object.freeze([]);

/**
 * The twelve strandings the first audit found, kept as a regression list: the
 * landing rule now keeps only cells reachable from the stair up, so each of
 * these must land somewhere the hero can walk out of.
 */
export const FIXED_SOFTLOCKS = Object.freeze([
  { code: 'chasm-landing-stranded', seed: 483009368, branch: 'deep', depth: 7 },
  { code: 'chasm-landing-stranded', seed: 407009140, branch: 'vaults', depth: 14 },
  { code: 'chasm-landing-stranded', seed: 452009275, branch: 'vaults', depth: 21 },
  { code: 'chasm-landing-stranded', seed: 597009710, branch: 'vaults', depth: 21 },
  { code: 'chasm-landing-stranded', seed: 164008411, branch: 'hell', depth: 7 },
  { code: 'chasm-landing-stranded', seed: 295008804, branch: 'crypt', depth: 7 },
  { code: 'chasm-landing-stranded', seed: 407009140, branch: 'crypt', depth: 14 },
  { code: 'chasm-landing-stranded', seed: 407009140, branch: 'hell', depth: 14 },
  { code: 'chasm-landing-stranded', seed: 452009275, branch: 'crypt', depth: 21 },
  { code: 'chasm-landing-stranded', seed: 452009275, branch: 'hell', depth: 21 },
  { code: 'chasm-landing-stranded', seed: 597009710, branch: 'crypt', depth: 21 },
  { code: 'chasm-landing-stranded', seed: 597009710, branch: 'hell', depth: 21 },
].map(Object.freeze));

export function isKnownSoftlock(entry) {
  return KNOWN_SOFTLOCKS.some((known) => known.code === entry.code && known.seed === entry.seed
    && known.branch === entry.branch && known.depth === entry.depth);
}

export const MAX_AUDIT_DEPTH = BEYOND_ROAD_DEPTH;
export const AUDIT_BRANCHES = RUN_BRANCHES;
/** Economy assumption: minutes of active (hunger-draining) play per floor. */
export const MINUTES_PER_FLOOR = 3;

// ── Grid helpers ─────────────────────────────────────────────────────────────

const WALKABLE = new Set(['.', '~', 'D']);
const key = (x, y) => `${x},${y}`;

export function isPassable(grid, x, y, { flying = false, blocked = null } = {}) {
  const cell = grid[y]?.[x];
  if (cell === undefined) return false;
  if (blocked?.has(key(x, y))) return false;
  if (cell === CHASM_CELL) return flying;
  return WALKABLE.has(cell);
}

/** Every cell a hero standing on `start` can walk to (4-way, like findGridPath). */
export function floodFrom(grid, start, options = {}) {
  const seen = new Set();
  if (!start || !isPassable(grid, start.x, start.y, { ...options, blocked: null })) return seen;
  const queue = [start];
  seen.add(key(start.x, start.y));
  for (let index = 0; index < queue.length; index += 1) {
    const { x, y } = queue[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (seen.has(k) || !isPassable(grid, nx, ny, options)) continue;
      seen.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/** Standing on it (stairs, loot) or, for things used from beside them, next to it. */
function reachable(component, cell, { adjacent = false } = {}) {
  if (component.has(key(cell.x, cell.y))) return true;
  if (!adjacent) return false;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if ((dx || dy) && component.has(key(cell.x + dx, cell.y + dy))) return true;
    }
  }
  return false;
}

/** Deep scan for NaN / Infinity / undefined in generated data (the grid is skipped). */
function badValues(value, path = 'level', out = [], depth = 0) {
  if (out.length > 8 || depth > 8) return out;
  if (value === undefined) out.push(`${path}=undefined`);
  else if (typeof value === 'number' && !Number.isFinite(value)) out.push(`${path}=${value}`);
  else if (Array.isArray(value)) value.forEach((item, index) => badValues(item, `${path}[${index}]`, out, depth + 1));
  else if (value && typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) {
      if (name === 'grid') continue;
      badValues(item, `${path}.${name}`, out, depth + 1);
    }
  }
  return out;
}

/** The runtime's own landing rule, imported rather than mirrored since it moved to dcss-rpg-chasm.js. */
export function chasmLandingCell(level, runSeed, depth) {
  return runtimeChasmLanding(level, runSeed, depth);
}

/**
 * The holes a hero walking from the stairs can stand beside, and how far each
 * drops (`chasmFallFloors` with the floor seed, exactly as `fallIntoChasm`
 * calls it). Returns the jumpable cells and the set of drop distances.
 */
export function jumpableChasms(level, onFoot = null) {
  if (!level?.grid?.some((row) => row.includes(CHASM_CELL))) return { cells: [], drops: new Set() };
  const reach = onFoot ?? floodFrom(level.grid, level.spawn);
  const cells = [];
  for (let y = 0; y < level.grid.length; y += 1) {
    for (let x = 0; x < level.grid[y].length; x += 1) {
      if (level.grid[y][x] !== CHASM_CELL) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(key(x + dx, y + dy)))) cells.push({ x, y });
    }
  }
  return { cells, drops: new Set(cells.map((cell) => chasmFallFloors(level.grid, cell, level.seed))) };
}

/** Which floor above can drop a hero onto this one: depth − 1 or depth − 2, or null. */
function fallSource(depth, levelAbove, levelTwoAbove) {
  if (levelAbove && jumpableChasms(levelAbove).drops.has(1)) return depth - 1;
  if (levelTwoAbove && jumpableChasms(levelTwoAbove).drops.has(2)) return depth - 2;
  return null;
}

// ── Floor audit ──────────────────────────────────────────────────────────────

function issue(list, severity, code, where, detail) {
  list.push({ severity, code, ...where, detail });
}

/**
 * Every structural check on one generated floor. Returns the level (or null if
 * it threw) and the issues found, each with its own seed/branch/depth repro.
 */
export function auditFloor({ seed, branch, depth, levelAbove = null, levelTwoAbove = null }) {
  const where = { seed, branch, depth };
  const issues = [];
  let level;
  try {
    level = generateDungeon({ seed, depth, branch });
  } catch (error) {
    issue(issues, 'crash', 'generate-throws', where, String(error?.message ?? error));
    return { level: null, issues, facts: null };
  }

  // Everything the runtime builds from a fresh floor must build too.
  let runFloor = null;
  try {
    runFloor = createRun(seed, level).floor;
  } catch (error) {
    issue(issues, 'crash', 'floor-state-throws', where, String(error?.message ?? error));
  }
  let monsterStates = [];
  try {
    monsterStates = createMonsterStates(level);
  } catch (error) {
    issue(issues, 'crash', 'monster-states-throw', where, String(error?.message ?? error));
  }
  try {
    createDungeonEnvironment(level);
  } catch (error) {
    issue(issues, 'crash', 'environment-throws', where, String(error?.message ?? error));
  }
  let traps = [];
  try {
    traps = trapsFromDungeon(level);
  } catch (error) {
    issue(issues, 'crash', 'traps-throw', where, String(error?.message ?? error));
  }

  const bad = badValues(level);
  if (bad.length) issue(issues, 'bug', 'nan-or-undefined', where, bad.slice(0, 4).join('; '));
  for (const state of monsterStates) {
    for (const field of ['hp', 'maxHp', 'damage', 'xp', 'speed', 'attackRate', 'vision', 'windup', 'pursuit']) {
      if (!Number.isFinite(state[field])) {
        issue(issues, 'bug', 'monster-stat-nan', where, `${state.instanceId} ${state.id}.${field}=${state[field]}`);
      }
    }
  }

  // Duplicate instance ids on the floor, and duplicate uids in its containers.
  const ids = [
    ...level.monsters, ...level.loot, ...level.finds, ...level.events, ...level.doors,
    ...level.merchants, ...level.passiveCreatures,
  ].map(({ instanceId }) => instanceId);
  const dupes = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (dupes.length) issue(issues, 'bug', 'duplicate-instance-id', where, [...new Set(dupes)].join(', '));
  const uids = [
    ...(runFloor?.chests ?? []).flatMap(({ items }) => items.map(({ uid }) => uid)),
    ...level.merchants.flatMap(({ stock }) => stock.map(({ record }) => record.uid)),
  ];
  const dupeUids = uids.filter((uid, index) => uids.indexOf(uid) !== index);
  if (dupeUids.length) issue(issues, 'bug', 'duplicate-uid', where, [...new Set(dupeUids)].join(', '));
  for (const entry of level.monsters) {
    if (!monsterById(entry.id)) issue(issues, 'bug', 'unknown-monster-id', where, `${entry.instanceId}=${entry.id}`);
  }
  for (const entry of level.loot) {
    if (!lootById(entry.id)) issue(issues, 'bug', 'unknown-loot-id', where, `${entry.instanceId}=${entry.id}`);
  }

  const grid = level.grid;
  const spawn = level.spawn;
  const onFoot = floodFrom(grid, spawn);
  const flying = floodFrom(grid, spawn, { flying: true });
  const trapCells = new Set(traps.map(({ x, y }) => key(x, y)));

  // 1. The arrival cell is the stair up: it must be floor, and not a trap.
  if (!isPassable(grid, spawn.x, spawn.y) || grid[spawn.y][spawn.x] === 'D') {
    issue(issues, 'softlock', 'spawn-not-floor', where, `spawn (${spawn.x},${spawn.y}) is '${grid[spawn.y]?.[spawn.x]}'`);
  }
  if (trapCells.has(key(spawn.x, spawn.y))) {
    issue(issues, 'softlock', 'spawn-on-trap', where, `spawn (${spawn.x},${spawn.y})`);
  }
  const hostileOnSpawn = level.monsters.find(({ x, y }) => x === spawn.x && y === spawn.y);
  if (hostileOnSpawn) {
    issue(issues, depth === CITY_DEPTH ? 'warn' : 'bug', 'monster-on-spawn', where, `${hostileOnSpawn.instanceId} ${hostileOnSpawn.id}`);
  }

  // 2. The stair down (and, in the city, every gate) must be reachable on foot.
  if (!reachable(onFoot, level.exit)) {
    issue(issues, 'softlock', 'exit-unreachable', where, `spawn (${spawn.x},${spawn.y}) → exit (${level.exit.x},${level.exit.y})`);
  }
  if (level.gates) {
    for (const [gateBranch, gate] of Object.entries(level.gates)) {
      if (!reachable(onFoot, gate)) {
        issue(issues, 'softlock', 'city-gate-unreachable', where, `${gateBranch} gate (${gate.x},${gate.y})`);
      }
    }
  }

  // The tap router treats visible finds as walls; stick movement does not.
  if (depth !== CITY_DEPTH) {
    const findWalls = new Set(level.finds.filter((find) => !isSecretFind(find)).map(({ x, y }) => key(x, y)));
    const tapped = floodFrom(grid, spawn, { blocked: findWalls });
    if (reachable(onFoot, level.exit) && !reachable(tapped, level.exit)) {
      issue(issues, 'warn', 'tap-route-blocked-by-find', where, 'exit only reachable by stepping over a find (stick/WASD works, tap does not)');
    }
  }

  // 3. Guardian, artefact and rune.
  if (depth >= 1) {
    const guardian = chapterGuardianForDepth(depth, branch);
    const ladder = GUARDIAN_LADDERS[branch];
    if (guardian) {
      const expected = ladder[(Math.floor((depth - 1) / FLOORS_PER_CHAPTER)) % ladder.length];
      const objective = level.objective;
      const boss = objective && level.monsters.find(({ instanceId }) => instanceId === objective.bossInstanceId);
      if (!objective) issue(issues, 'softlock', 'guardian-objective-missing', where, `expected ${expected}`);
      else if (objective.bossId !== expected) issue(issues, 'softlock', 'guardian-wrong', where, `${objective.bossId} ≠ ${expected}`);
      else if (!monsterById(objective.bossId)) issue(issues, 'softlock', 'guardian-unknown', where, objective.bossId);
      else if (!boss) issue(issues, 'softlock', 'guardian-not-spawned', where, `${objective.bossInstanceId} missing from level.monsters`);
      else if (!reachable(onFoot, boss, { adjacent: true })) {
        issue(issues, 'softlock', 'guardian-unreachable', where, `${boss.id} at (${boss.x},${boss.y})`);
      }
      const ending = roadEndingAt(depth);
      if (ending === 'road' && objective?.kind !== 'final-artifact') {
        issue(issues, 'softlock', 'artifact-missing', where, `objective.kind=${objective?.kind}`);
      }
      if (ending === 'road' && objective?.artifact
        && (objective.artifact.x !== level.exit.x || objective.artifact.y !== level.exit.y)) {
        issue(issues, 'bug', 'artifact-off-exit', where, 'the runtime draws the prize on the exit cell');
      }
      if (ending === 'beyond' && !objective) issue(issues, 'softlock', 'rune-guardian-missing', where, '');
    } else if (level.objective) {
      issue(issues, 'bug', 'unexpected-guardian', where, level.objective.bossId);
    }
  }

  // 4. Branch gate on this floor.
  const gate = depth >= 1 ? branchGateFor(branch, depth) : null;
  if (gate) {
    if (!level.branchGate) issue(issues, 'softlock', 'branch-gate-missing', where, `${gate.id} → ${gate.to}`);
    else if (!reachable(onFoot, level.branchGate, { adjacent: true })) {
      issue(issues, 'softlock', 'branch-gate-unreachable', where, `${gate.id} at (${level.branchGate.x},${level.branchGate.y})`);
    }
  }

  // 5. Content that exists must be reachable, or it is wasted (or a lie).
  const interactables = [
    ...(level.sanctuary ? [{ kind: 'sanctuary', ...level.sanctuary }] : []),
    ...level.merchants.map((m) => ({ kind: 'merchant', id: m.instanceId, x: m.x, y: m.y })),
    ...level.finds.map((f) => ({ kind: f.id === 'sealed-cache' ? 'chest' : 'find', id: `${f.instanceId}:${f.id}`, x: f.x, y: f.y })),
    ...level.events.map((e) => ({ kind: e.id === 'blade-trap' ? 'trap' : 'event', id: `${e.instanceId}:${e.id}`, x: e.x, y: e.y })),
    ...(depth === CITY_DEPTH
      ? level.monsters.map((m) => ({ kind: 'npc', id: `${m.instanceId}:${m.id}`, x: m.x, y: m.y }))
      : []),
  ];
  for (const thing of interactables) {
    if (thing.kind === 'trap') continue; // not reaching a trap is fine
    const cellChar = grid[thing.y]?.[thing.x];
    if (cellChar === '#' || cellChar === undefined) {
      issue(issues, 'bug', 'content-in-wall', where, `${thing.kind} ${thing.id ?? ''} at (${thing.x},${thing.y})`);
      continue;
    }
    if (!reachable(onFoot, thing, { adjacent: true })) {
      issue(issues, 'bug', `${thing.kind}-unreachable`, where,
        `${thing.id ?? thing.kind} at (${thing.x},${thing.y})${reachable(flying, thing, { adjacent: true }) ? ' (flight only)' : ' (not even flying)'}`);
    }
  }
  // Loot moved onto chasm islands is intentional (a prize for flight); loot a
  // flier cannot reach either, or the promised first drop off the floor, is not.
  let islandLoot = 0;
  for (const [index, entry] of level.loot.entries()) {
    if (reachable(onFoot, entry)) continue;
    if (grid[entry.y]?.[entry.x] === '#') {
      issue(issues, 'bug', 'content-in-wall', where, `loot ${entry.instanceId} at (${entry.x},${entry.y})`);
    } else if (index === 0) {
      issue(issues, 'bug', 'starter-loot-unreachable', where, `${entry.instanceId} ${entry.id}`);
    } else if (!reachable(flying, entry)) {
      issue(issues, 'bug', 'loot-unreachable', where, `${entry.instanceId} ${entry.id} at (${entry.x},${entry.y}) (not even flying)`);
    } else {
      islandLoot += 1;
    }
  }
  if (level.rareEncounter && !reachable(onFoot, level.rareEncounter, { adjacent: true })) {
    issue(issues, 'bug', 'rare-encounter-unreachable', where, `${level.rareEncounter.monsterId} at (${level.rareEncounter.x},${level.rareEncounter.y})`);
  }

  // 6. No two important things on one cell.
  const occupants = new Map();
  const put = (cell, label) => {
    if (!cell) return;
    const k = key(cell.x, cell.y);
    if (!occupants.has(k)) occupants.set(k, []);
    occupants.get(k).push(label);
  };
  put(level.spawn, 'spawn');
  put(level.exit, 'exit');
  put(level.sanctuary, 'sanctuary');
  put(level.branchGate, 'branch-gate');
  for (const [name, cell] of Object.entries(level.gates ?? {})) put(cell, `gate:${name}`);
  for (const m of level.merchants) put(m, `merchant:${m.instanceId}`);
  for (const f of level.finds) put(f, `find:${f.instanceId}:${f.id}`);
  for (const e of level.events) put(e, `event:${e.instanceId}:${e.id}`);
  for (const l of level.loot) put(l, `loot:${l.instanceId}`);
  for (const d of level.doors) put(d, `door:${d.instanceId}`);
  // A dormant mimic sits inside its own chest on purpose (room-content.js
  // `activationFindId`): that pairing is the design, not a collision.
  const dormantInFind = new Set(level.finds.flatMap((find) => level.monsters
    .filter((m) => m.activationFindId === find.instanceId && m.x === find.x && m.y === find.y)
    .map((m) => m.instanceId)));
  for (const m of level.monsters) if (!dormantInFind.has(m.instanceId)) put(m, `monster:${m.instanceId}:${m.id}`);
  for (const p of level.passiveCreatures) put(p, `passive:${p.instanceId}`);
  for (const [cell, labels] of occupants) {
    if (labels.length < 2) continue;
    // The city's arrival and departure cells ARE its deep/surface gates.
    const meaningful = labels.filter((label) => !(depth === CITY_DEPTH && /^(spawn|exit)$/.test(label)));
    if (meaningful.length < 2) continue;
    // The watch walks a beat from its post and steps aside for the hero, so a
    // post on a gate or on the shrine is untidy rather than blocking.
    const cityWatch = depth === CITY_DEPTH && meaningful.some((label) => /:city-(guard|captain)$/.test(label));
    issue(issues, cityWatch ? 'warn' : 'bug', cityWatch ? 'city-watch-post-on-landmark' : 'shared-cell', where,
      `(${cell}) ${meaningful.join(' + ')}`);
  }

  // 6b. A hole the hero can jump into on a guardian floor, or one whose
  // two-floor drop passes over a guardian floor. The runtime now closes both
  // (`chasmGuarded` refuses the jump while the stair is locked, and
  // `fallIntoChasm` stops a fall at the first guardian floor it would pass),
  // so this is reported as info: the layout still has the hole, the rules
  // no longer let it skip anyone.
  if (depth >= 1) {
    const { cells: jumpable, drops } = jumpableChasms(level, onFoot);
    if (jumpable.length > 0) {
      const skipped = [...drops].flatMap((floors) => Array.from({ length: floors }, (_, step) => depth + step))
        .filter((floor) => chapterGuardianForDepth(floor, branch));
      if (skipped.length > 0) {
        issue(issues, 'info', 'guardian-bypass-by-chasm', where,
          `jumpable chasm at (${jumpable[0].x},${jumpable[0].y}) drops ${[...drops].join('/')} floor(s), skipping the guardian of floor ${[...new Set(skipped)].join(', ')}`);
      }
    }
  }

  // 7. A fall from the floor above must not land the hero on an island.
  const source = depth >= 2 ? fallSource(depth, levelAbove, levelTwoAbove) : null;
  if (source !== null) {
    const landing = chasmLandingCell(level, seed, depth);
    if (!landing) {
      issue(issues, 'softlock', 'chasm-landing-none', where, 'no open cell to land on');
    } else if (!reachable(floodFrom(grid, landing), level.exit)) {
      issue(issues, 'softlock', 'chasm-landing-stranded', where,
        `jump from depth ${source} lands at (${landing.x},${landing.y}), cut off from the stairs`);
    }
  }

  return {
    level,
    issues,
    facts: { level, runFloor, monsterStates, traps, onFoot, islandLoot },
  };
}

/**
 * Walks the real run-state transitions: city → gate → floor 1 → … → 24 with
 * `advanceRunFloor` (which re-validates the whole save each step), every
 * branch gate with `enterBranchThroughGate`, and the climb back up.
 */
export function auditTransitions(seed) {
  const issues = [];
  const cityLevel = generateDungeon({ seed, depth: CITY_DEPTH });
  for (const branch of Object.keys(cityLevel.gates ?? {})) {
    const where = { seed, branch, depth: CITY_DEPTH };
    try {
      let run = switchRunBranch(createRun(seed, cityLevel), branch);
      for (let depth = 1; depth <= MAX_AUDIT_DEPTH; depth += 1) {
        run = advanceRunFloor(run);
        if (run.depth !== depth) throw new Error(`advanced to ${run.depth}, expected ${depth}`);
      }
      for (let depth = MAX_AUDIT_DEPTH - 1; depth >= CITY_DEPTH; depth -= 1) run = retreatRunFloor(run);
    } catch (error) {
      issue(issues, 'crash', 'descent-chain-throws', where, String(error?.message ?? error));
    }
  }
  for (const gate of BRANCH_GATES) {
    const where = { seed, branch: gate.from, depth: gate.depth };
    try {
      const level = generateDungeon({ seed, depth: gate.depth, branch: gate.from });
      const run = enterBranchThroughGate(createRun(seed, level), gate.to);
      if (run.branch !== gate.to || run.depth !== gate.depth + 1) {
        throw new Error(`arrived at ${run.branch}/${run.depth}`);
      }
      let deeper = run;
      for (let depth = run.depth + 1; depth <= MAX_AUDIT_DEPTH; depth += 1) deeper = advanceRunFloor(deeper);
    } catch (error) {
      issue(issues, 'crash', 'branch-gate-transition-throws', where, `${gate.id}: ${String(error?.message ?? error)}`);
    }
  }
  // Backtracking past floor memory: the guardian floor is rebuilt from its seed
  // and the hero arrives on its exit — beside a living guardian, with the stair
  // down locked until it dies again.
  try {
    const where = { seed, branch: 'deep', depth: CHAPTER_END_DEPTHS[0] };
    let run = createRun(seed, generateDungeon({ seed, depth: 1 }));
    while (run.depth < CHAPTER_END_DEPTHS[0]) run = advanceRunFloor(run);
    const bossId = generateDungeon({ seed, depth: run.depth }).objective.bossInstanceId;
    // The runtime writes the kill into the floor and into the run's guardian
    // memory (`rememberGuardian`, dcss.js on the boss's death); so does this.
    run = {
      ...run,
      guardians: rememberGuardian(run.guardians, run.branch, run.depth),
      floor: { ...run.floor, defeated: [...run.floor.defeated, bossId] },
    };
    const far = CHAPTER_END_DEPTHS[0] + FLOORS_PER_CHAPTER + 1;
    while (run.depth < far) run = advanceRunFloor(run);
    while (run.depth > CHAPTER_END_DEPTHS[0]) run = retreatRunFloor(run);
    // `replaceFloor` puts a remembered guardian back into `floor.defeated`,
    // and `hydrateDungeon` leaves it out of the rebuilt floor's monsters.
    const remembered = guardianRemembered(run.guardians, run.branch, run.depth);
    const standing = hydrateDungeon(run).monsters.some((monster) => monster.instanceId === bossId);
    const locked = standing || !canLeaveDungeonFloor({
      depth: run.depth,
      status: run.status,
      guardianDefeated: run.floor.defeated.includes(bossId) || remembered,
    });
    if (locked) {
      issue(issues, 'design', 'guardian-revives-on-backtrack', where,
        `kill guardian on ${CHAPTER_END_DEPTHS[0]}, descend to ${far}, climb back: floor is rebuilt, hero arrives on the exit beside a living guardian and the stair down is locked again`);
    }
  } catch (error) {
    issue(issues, 'crash', 'backtrack-chain-throws', { seed, branch: 'deep', depth: CHAPTER_END_DEPTHS[0] }, String(error?.message ?? error));
  }
  return issues;
}

/**
 * A dedicated sweep for the one soft-lock that is too rare for the per-floor
 * pass: a fall that lands on a chasm island. Cheap (generation only), so it
 * runs over many more seeds than the full audit.
 */
export function sweepChasmLandings(seedCount, branches = AUDIT_BRANCHES) {
  const issues = [];
  let falls = 0;
  for (let index = 0; index < seedCount; index += 1) {
    const seed = seedFor(index);
    for (const branch of branches) {
      const levels = [];
      for (let depth = 1; depth <= MAX_AUDIT_DEPTH; depth += 1) levels[depth] = generateDungeon({ seed, depth, branch });
      for (let depth = 2; depth <= MAX_AUDIT_DEPTH; depth += 1) {
        const source = fallSource(depth, levels[depth - 1], levels[depth - 2] ?? null);
        if (source === null) continue;
        falls += 1;
        const level = levels[depth];
        const landing = chasmLandingCell(level, seed, depth);
        if (landing && reachable(floodFrom(level.grid, landing), level.exit)) continue;
        issue(issues, 'softlock', 'chasm-landing-stranded', { seed, branch, depth },
          landing
            ? `jump from depth ${source} lands at (${landing.x},${landing.y}), cut off from the stairs`
            : 'no open cell to land on');
      }
    }
  }
  return { issues, falls };
}

/** Which roads a player can actually walk onto, starting from the city. */
export function reachableBranches(seed) {
  const city = generateDungeon({ seed, depth: CITY_DEPTH });
  const reached = new Map(Object.keys(city.gates ?? {}).map((branch) => [branch, 1]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const gate of BRANCH_GATES) {
      if (!reached.has(gate.from) || reached.has(gate.to)) continue;
      reached.set(gate.to, gate.depth + 1);
      changed = true;
    }
  }
  return reached; // branch → shallowest floor you can first stand on
}

// ── Economy ─────────────────────────────────────────────────────────────────

const FOOD_NUTRITION = new Map(
  LOOT_CATALOG.filter((item) => item.useEffect?.type === 'food').map((item) => [item.id, item.useEffect.nutrition]),
);

function stackOf(id, record = null) {
  if (Number.isInteger(record?.stack) && record.stack > 0) return record.stack;
  return lootById(id)?.stack ?? 1;
}

function tally(target, id, amount) {
  target[id] = (target[id] ?? 0) + amount;
}

/**
 * One seed's 1..lastDepth run on one road, played greedily: every monster
 * killed, every reachable pickup taken, chests opened with whatever the hero
 * holds. `lockRank` is the hero's Lockpicking rank (0 = none).
 */
export function simulateEconomy({ seed, branch = 'deep', lastDepth = STORY_DEPTH, lockRanks = [0, 1, 2, 3] }) {
  const baseRun = createRun(seed, generateDungeon({ seed, depth: 1, branch }));
  let hero = { ...baseRun.hero };
  const floors = [];
  const pockets = Object.fromEntries(lockRanks.map((rank) => [rank, { keys: 0, picks: 0, master: false, opened: 0, total: 0, blockedByTier: 0 }]));
  let gold = 0;
  let nutrition = HUNGER_MAX + 2 * (FOOD_NUTRITION.get('wild-fruit') ?? 0);
  let hungerSpent = 0;
  let sapperKits = 0;
  let trapCount = 0;
  const shelf = { gear: [], other: [] };
  // The best weapon the hero has seen so far, judged the way `combatDamage`
  // hits: (1 + power + attack) × damageScale. Armour: best defence per slot.
  let weapon = lootById('rusty-sword');
  const bestDefense = { body: lootById('worn-tunic')?.stats?.defense ?? 0 };
  const heroHit = (power, item = weapon) => Math.max(1, Math.round(
    (1 + power + (item?.stats?.attack ?? 0)) * (item?.combat?.damageScale ?? 1),
  ));
  const considerGear = (id) => {
    const item = lootById(id);
    if (!item?.slot) return;
    if (isWeaponItem(item) && heroHit(hero.power, item) > heroHit(hero.power)) weapon = item;
    if (!isWeaponItem(item) && (item.stats?.defense ?? 0) > (bestDefense[item.slot] ?? 0)) {
      bestDefense[item.slot] = item.stats.defense;
    }
  };
  for (let depth = 1; depth <= lastDepth; depth += 1) {
    const level = generateDungeon({ seed, depth, branch });
    const floor = createRun(seed, level).floor;
    const onFoot = floodFrom(level.grid, level.spawn);
    const states = createMonsterStates(level).filter((m) => !m.neutral && !m.spawn?.startsWith?.('summon'));
    const ordinary = states.filter((m) => !m.boss);
    const guardian = states.find((m) => m.instanceId === level.objective?.bossInstanceId) ?? null;
    const row = {
      depth,
      monsters: ordinary.length,
      avgMonsterHp: ordinary.reduce((sum, m) => sum + m.maxHp, 0) / Math.max(1, ordinary.length),
      avgMonsterDamage: ordinary.reduce((sum, m) => sum + m.damage, 0) / Math.max(1, ordinary.length),
      guardianHp: guardian?.maxHp ?? 0,
      guardianDamage: guardian?.damage ?? 0,
      xp: 0,
      goldKills: 0,
      goldFloor: 0,
      goldChests: 0,
      goldFinds: 0,
      food: 0,
      picks: 0,
      keys: 0,
      master: 0,
      chests: 0,
      chestTier: 0,
      traps: 0,
      sapper: 0,
      merchants: level.merchants.length,
      merchantPicks: 0,
      merchantFood: 0,
    };
    // Kills: XP through the real progression rule, gold through the runtime's.
    let strikes = 0;
    for (const monster of states) {
      row.xp += monster.xp;
      row.goldKills += goldRewardForMonster(monster);
      strikes += Math.ceil(monster.maxHp / heroHit(hero.power));
    }
    const awarded = awardHeroExperience({ hero, amount: row.xp, equipment: baseRun.equipment, items: baseRun.items });
    hero = awarded.hero;
    // Open-floor pickups the hero can walk to.
    const found = {};
    for (const entry of level.loot) {
      if (!reachable(onFoot, entry)) continue;
      const item = lootById(entry.id);
      if (item?.gold) row.goldFloor += Math.max(1, entry.amount ?? 1);
      else tally(found, entry.id, stackOf(entry.id));
      considerGear(entry.id);
    }
    row.food += Object.entries(found).reduce((sum, [id, count]) => sum + (FOOD_NUTRITION.get(id) ?? 0) * count, 0);
    row.picks = found['lockpick-set'] ?? 0;
    row.keys = found['iron-key'] ?? 0;
    row.master = found['master-key'] ?? 0;
    row.sapper = found['sapper-kit'] ?? 0;
    // Non-chest finds pay gold outright.
    for (const find of level.finds) {
      if (find.id !== 'sealed-cache' && Number.isInteger(find.rewardGold)) row.goldFinds += find.rewardGold;
    }
    // Traps on this floor.
    row.traps = level.events.filter(({ id }) => id === 'blade-trap').length;
    trapCount += row.traps;
    sapperKits += row.sapper;
    // What a trader here would sell that matters to the audit.
    for (const merchant of level.merchants) {
      for (const { record, price } of merchant.stock) {
        (lootById(record.id)?.slot ? shelf.gear : shelf.other).push(price);
        if (record.id === 'lockpick-set') row.merchantPicks += 1;
        if (FOOD_NUTRITION.has(record.id)) row.merchantFood += 1;
      }
    }
    // Chests, opened in floor order with whatever each pocket holds.
    const chests = level.finds.filter(({ id }) => id === 'sealed-cache');
    row.chests = chests.length;
    row.chestTier = chests.reduce((sum, chest) => sum + chest.lockTier, 0) / Math.max(1, chests.length);
    for (const rank of lockRanks) {
      const pocket = pockets[rank];
      pocket.picks += row.picks;
      pocket.keys += row.keys;
      pocket.master ||= row.master > 0;
      for (const chest of chests) {
        pocket.total += 1;
        const container = floor.chests.find(({ findId }) => findId === chest.instanceId);
        let opened = false;
        if (pocket.master) opened = true;
        else if (rank >= chest.lockTier && pocket.picks >= lockpickCost(rank)) {
          pocket.picks -= lockpickCost(rank);
          opened = true;
        } else if (pocket.keys > 0) {
          pocket.keys -= 1;
          opened = true;
        } else if (rank > 0 && rank < chest.lockTier) pocket.blockedByTier += 1;
        if (!opened) continue;
        pocket.opened += 1;
        for (const record of container?.items ?? []) {
          if (record.id === 'lockpick-set') pocket.picks += stackOf(record.id, record);
          if (record.id === 'iron-key') pocket.keys += stackOf(record.id, record);
          if (record.id === 'master-key') pocket.master = true;
          if (rank === lockRanks.at(-1)) {
            if (FOOD_NUTRITION.has(record.id)) row.food += FOOD_NUTRITION.get(record.id) * stackOf(record.id, record);
            considerGear(record.id);
          }
        }
        if (rank === lockRanks.at(-1)) row.goldChests += container?.gold ?? chest.rewardGold;
      }
    }
    // Hunger: a flat play time per floor plus what swinging costs.
    const spent = MINUTES_PER_FLOOR * 60 + strikes * HUNGER_COST.strike;
    hungerSpent += spent;
    nutrition += row.food;
    gold += row.goldKills + row.goldFloor + row.goldChests + row.goldFinds;
    const defense = Object.values(bestDefense).reduce((sum, value) => sum + value, 0);
    const heroAttack = heroHit(hero.power);
    floors.push({
      ...row,
      heroLevel: hero.level,
      heroMaxHp: hero.maxHp,
      heroAttack,
      heroDefense: defense,
      hitsToKillMonster: row.avgMonsterHp / heroAttack,
      hitsToDieToMonster: hero.maxHp / mitigateDamage(row.avgMonsterDamage, defense),
      hitsToKillGuardian: guardian ? guardian.maxHp / heroAttack : 0,
      hitsToDieToGuardian: guardian ? hero.maxHp / mitigateDamage(guardian.damage, defense) : 0,
      cumulativeGold: gold,
      nutritionLeft: nutrition - hungerSpent,
      hungerSpent,
    });
  }
  return { seed, branch, floors, pockets, trapCount, sapperKits, shelf };
}

// ── Catalog-wide checks ──────────────────────────────────────────────────────

export function catalogIssues(observed) {
  const issues = [];
  for (const item of LOOT_CATALOG) {
    if (item.gold || item.randomDrop === false) continue;
    const depth = effectiveLootDepth(item);
    if (depth > MAX_AUDIT_DEPTH) {
      issue(issues, 'content', 'item-too-deep', { seed: '-', branch: '-', depth }, `${item.id} effective minDepth ${depth} > ${MAX_AUDIT_DEPTH}`);
    } else if (depth > STORY_DEPTH) {
      issue(issues, 'content', 'item-past-story', { seed: '-', branch: '-', depth }, `${item.id} effective minDepth ${depth} > story depth ${STORY_DEPTH}`);
    }
    if (observed && !observed.items.has(item.id)) {
      issue(issues, 'content', 'item-never-generated', { seed: '-', branch: '-', depth }, `${item.id} (effective depth ${depth}) never on a floor, in a chest or on a shelf`);
    }
  }
  if (observed) {
    for (const monster of MONSTER_CATALOG) {
      const homes = RUN_BRANCHES.filter((branch) => monsterSuitsBranch(monster, branch));
      if (homes.length === 0) {
        issue(issues, 'content', 'monster-without-habitat', { seed: '-', branch: '-', depth: '-' }, `${monster.id} habitat=${monster.habitat}`);
        continue;
      }
      const seenIn = homes.filter((branch) => observed.monsters.get(branch)?.has(monster.id));
      if (seenIn.length > 0) continue;
      const special = monster.boss ? 'boss' : monster.unique ? 'unique' : monster.spawn ? `spawn=${monster.spawn}` : monster.chapter ? `chapter=${monster.chapter}` : null;
      issue(issues, special ? 'info' : 'content', 'monster-never-spawns', { seed: '-', branch: homes.join('/'), depth: '-' },
        `${monster.id} (tier ${monster.tier}${special ? `, ${special}` : ''}) never generated on any floor of ${homes.join('/')}`);
    }
  }
  return issues;
}

// ── Whole audit ─────────────────────────────────────────────────────────────

export function seedFor(index) {
  return (1_000_003 * (index + 1) + 7919) % 4_294_967_291;
}

export function runAudit({
  seedCount = 40, chainSeeds = 8, economy = true, branches = AUDIT_BRANCHES, landingSeeds = 0,
} = {}) {
  const issues = [];
  const observed = { items: new Set(), monsters: new Map(branches.map((b) => [b, new Set()])) };
  const seeds = Array.from({ length: seedCount }, (_, index) => seedFor(index));
  let floorsChecked = 0;
  for (const seed of seeds) {
    for (const branch of branches) {
      let above = null;
      let twoAbove = null;
      for (let depth = CITY_DEPTH; depth <= MAX_AUDIT_DEPTH; depth += 1) {
        const result = auditFloor({ seed, branch, depth, levelAbove: above, levelTwoAbove: twoAbove });
        floorsChecked += 1;
        issues.push(...result.issues);
        const level = result.level;
        if (level) {
          for (const m of level.monsters) observed.monsters.get(branch)?.add(m.id);
          for (const l of level.loot) observed.items.add(l.id);
          for (const merchant of level.merchants) for (const { record } of merchant.stock) observed.items.add(record.id);
          for (const chest of result.facts?.runFloor?.chests ?? []) for (const item of chest.items) observed.items.add(item.id);
        }
        twoAbove = above;
        above = level;
      }
    }
    if (seeds.indexOf(seed) < chainSeeds) issues.push(...auditTransitions(seed));
  }
  // Branch reachability and ladder coverage.
  const reach = reachableBranches(seeds[0]);
  for (const branch of RUN_BRANCHES) {
    if (!reach.has(branch)) {
      issue(issues, 'content', 'branch-unreachable', { seed: seeds[0], branch, depth: '-' }, 'no city gate and no branch gate leads here');
      continue;
    }
    const firstDepth = reach.get(branch);
    const ladder = GUARDIAN_LADDERS[branch];
    if (!ladder || ladder.length < CHAPTER_END_DEPTHS.length + 1) {
      issue(issues, 'softlock', 'ladder-short', { seed: '-', branch, depth: '-' }, `ladder has ${ladder?.length ?? 0} rungs`);
    }
    const unmet = ladder.filter((_id, rung) => (rung + 1) * FLOORS_PER_CHAPTER < firstDepth);
    if (unmet.length) {
      issue(issues, 'info', 'guardian-only-by-climbing', { seed: '-', branch, depth: firstDepth },
        `road first entered at floor ${firstDepth}; ${unmet.join(', ')} only met by climbing back up`);
    }
  }
  issues.push(...catalogIssues(observed));
  // The deeper landing sweep repeats the first seeds' falls; keep one copy each.
  const landings = landingSeeds > 0 ? sweepChasmLandings(landingSeeds, branches) : { issues: [], falls: 0 };
  const seen = new Set(issues.map((entry) => `${entry.code}|${entry.seed}|${entry.branch}|${entry.depth}`));
  issues.push(...landings.issues.filter((entry) => !seen.has(`${entry.code}|${entry.seed}|${entry.branch}|${entry.depth}`)));
  const economies = economy
    ? ['deep', 'surface', 'vaults'].filter((b) => branches.includes(b)).map((branch) => ({
      branch,
      runs: seeds.map((seed) => simulateEconomy({ seed, branch })),
    }))
    : [];
  return { seeds, floorsChecked, issues, economies, reach, landingSeeds, falls: landings.falls };
}

// ── Report ──────────────────────────────────────────────────────────────────

const SEVERITY_ORDER = ['crash', 'softlock', 'bug', 'design', 'warn', 'content', 'info'];

function groupIssues(issues) {
  const groups = new Map();
  for (const entry of issues) {
    const k = `${entry.severity}|${entry.code}`;
    if (!groups.has(k)) groups.set(k, { severity: entry.severity, code: entry.code, count: 0, examples: [] });
    const group = groups.get(k);
    group.count += 1;
    if (group.examples.length < 3) group.examples.push(entry);
  }
  return [...groups.values()].sort((a, b) => (
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || b.count - a.count
  ));
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const fmt = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : String(value));

function economyReport({ branch, runs }) {
  const lines = [];
  const depths = runs[0].floors.map(({ depth }) => depth);
  const at = (depth, field) => mean(runs.map((run) => run.floors[depth - 1][field]));
  lines.push(`### Economy — ${branch}, floors 1–${depths.at(-1)}, ${runs.length} seeds (full clear, ${MINUTES_PER_FLOOR} min/floor)`);
  lines.push('```');
  const header = ['fl', 'lvl', 'heroHP', 'atk', 'def', 'monHP', 'monDmg', 'hitsK', 'hitsD', 'guardHP', 'gHitsK', 'gHitsD', 'gold', 'food+', 'foodLeft', 'chest', 'tier', 'picks', 'keys', 'traps', 'kits'];
  lines.push(header.map((cell) => cell.padStart(7)).join(''));
  for (const depth of depths) {
    const cells = [
      depth, at(depth, 'heroLevel'), at(depth, 'heroMaxHp'), at(depth, 'heroAttack'), at(depth, 'heroDefense'),
      at(depth, 'avgMonsterHp'), at(depth, 'avgMonsterDamage'), at(depth, 'hitsToKillMonster'), at(depth, 'hitsToDieToMonster'),
      at(depth, 'guardianHp'), at(depth, 'hitsToKillGuardian'), at(depth, 'hitsToDieToGuardian'),
      at(depth, 'cumulativeGold'), at(depth, 'food') / 60, at(depth, 'nutritionLeft') / 60,
      at(depth, 'chests'), at(depth, 'chestTier'), at(depth, 'picks'), at(depth, 'keys'), at(depth, 'traps'), at(depth, 'sapper'),
    ];
    lines.push(cells.map((cell, index) => (index === 0 ? String(cell) : fmt(cell)).padStart(7)).join(''));
  }
  lines.push('```');
  const totalChests = mean(runs.map((run) => run.pockets[0].total));
  const openShare = (rank) => mean(runs.map((run) => run.pockets[rank].opened / Math.max(1, run.pockets[rank].total)));
  const blocked = (rank) => mean(runs.map((run) => run.pockets[rank].blockedByTier));
  lines.push(`- Chests per run: **${fmt(totalChests)}**. Opened with Lockpicking 0/1/2/3: **${[0, 1, 2, 3].map((rank) => `${fmt(openShare(rank) * 100, 0)}%`).join(' / ')}**; refused for lock tier (rank 1/2): ${fmt(blocked(1))} / ${fmt(blocked(2))} per run.`);
  lines.push(`- Lockpick sets on open floors per run: **${fmt(mean(runs.map((run) => run.floors.reduce((s, f) => s + f.picks, 0))))}** picks; iron keys: **${fmt(mean(runs.map((run) => run.floors.reduce((s, f) => s + f.keys, 0))))}**; master key found in ${fmt(mean(runs.map((run) => (run.floors.some((f) => f.master > 0) ? 1 : 0))) * 100, 0)}% of runs; lockpick sets on merchant shelves: ${fmt(mean(runs.map((run) => run.floors.reduce((s, f) => s + f.merchantPicks, 0))))}.`);
  lines.push(`- Traps per run: **${fmt(mean(runs.map((run) => run.trapCount)))}**; sapper kits found: **${fmt(mean(runs.map((run) => run.sapperKits)))}** (a kit disarms one trap; Traps rank 3 needs none).`);
  const lastFloor = depths.at(-1);
  const starveFloor = runs.map((run) => run.floors.find((f) => f.nutritionLeft < 0)?.depth ?? null);
  const starved = starveFloor.filter((d) => d !== null);
  lines.push(`- Food: start ${fmt((HUNGER_MAX + 2 * (FOOD_NUTRITION.get('wild-fruit') ?? 0)) / 60)} min (full bar + 2 starter fruit); found on floors+chests **${fmt(mean(runs.map((run) => run.floors.reduce((s, f) => s + f.food, 0))) / 60)} min**; spent **${fmt(at(lastFloor, 'hungerSpent') / 60)} min**. Runs that run out of food before floor ${lastFloor} without buying/cooking: **${starved.length}/${runs.length}**${starved.length ? ` (median floor ${starved.sort((a, b) => a - b)[Math.floor(starved.length / 2)]})` : ''}. Food on merchant shelves per run: ${fmt(mean(runs.map((run) => run.floors.reduce((s, f) => s + f.merchantFood, 0))))}.`);
  const goldAt = (depth) => at(depth, 'cumulativeGold');
  const shelfGear = runs.flatMap((run) => run.shelf.gear);
  const shelfOther = runs.flatMap((run) => run.shelf.other);
  lines.push(`- Merchant shelves in dungeon, floors 1–${lastFloor}: ${fmt(shelfGear.length / runs.length)} gear pieces/run at mean ${fmt(mean(shelfGear), 0)} gold (max ${Math.max(0, ...shelfGear)}), ${fmt(shelfOther.length / runs.length)} other items/run at mean ${fmt(mean(shelfOther), 0)} gold.`);
  const source = (field) => fmt(mean(runs.map((run) => run.floors.reduce((sum, f) => sum + f[field], 0))), 0);
  lines.push(`- Gold sources per run: kills ${source('goldKills')}, floor coins ${source('goldFloor')}, chests opened at Lockpicking 3 ${source('goldChests')}, other finds ${source('goldFinds')} (upper bound: every grave, idol and stash taken whatever its risk).`);
  lines.push(`- Gold (kills + floor coins + chests + finds, no selling): after floor 6 **${fmt(goldAt(6), 0)}**, 12 **${fmt(goldAt(12), 0)}**, 18 **${fmt(goldAt(Math.min(18, lastFloor)), 0)}**. House ${HOUSE_PRICE}; respec ${RESPEC_RATES.priest}/pt (priest), ${RESPEC_RATES.sage}/pt (sage); sanctuary ${SANCTUARY_COST}; tavern bed ${TAVERN_BED_PRICE}. House affordable by floor: ${depths.find((d) => goldAt(d) >= HOUSE_PRICE) ?? 'never'}.`);
  return lines;
}

export function formatReport(result) {
  const lines = [];
  const groups = groupIssues(result.issues);
  lines.push(`# Run audit — ${result.seeds.length} seeds × ${AUDIT_BRANCHES.length} roads × floors ${CITY_DEPTH}–${MAX_AUDIT_DEPTH}`);
  lines.push('');
  lines.push(`Floors generated and checked: **${result.floorsChecked}**; chasm falls replayed: **${result.falls}** over ${result.landingSeeds} seeds.`);
  lines.push('');
  lines.push(`Roads reachable from the city (first floor you can stand on): ${[...result.reach].map(([b, d]) => `${b}@${d}`).join(', ')}.`);
  lines.push('');
  lines.push('## Findings (grouped, worst first)');
  lines.push('');
  if (groups.length === 0) lines.push('No issues.');
  lines.push('| severity | code | count | example repro (seed/branch/depth: detail) |');
  lines.push('|---|---|---:|---|');
  for (const group of groups) {
    const example = group.examples.map((e) => `${e.seed}/${e.branch}/${e.depth}: ${e.detail}`).join('<br>');
    lines.push(`| ${group.severity} | ${group.code} | ${group.count} | ${example.replaceAll('|', '\\|')} |`);
  }
  lines.push('');
  const blocking = result.issues.filter(({ severity }) => severity === 'crash' || severity === 'softlock');
  if (blocking.length > 0) {
    lines.push('## Every crash and soft-lock (full repro list)');
    lines.push('');
    for (const entry of blocking) {
      const known = isKnownSoftlock(entry) ? ' _(known, allowlisted)_' : ' **NEW**';
      lines.push(`- ${entry.severity} \`${entry.code}\` seed ${entry.seed}, ${entry.branch}, depth ${entry.depth}: ${entry.detail}${known}`);
    }
    lines.push('');
  }
  for (const economy of result.economies) {
    lines.push(...economyReport(economy));
    lines.push('');
  }
  lines.push('Columns: lvl/heroHP/atk/def = hero after clearing the floor (atk = 1 + power + best weapon found, def = best armour per slot found);');
  lines.push('monHP/monDmg = average ordinary monster after scaling (createMonsterStates); hitsK = hero swings per kill; hitsD = monster hits to kill the hero;');
  lines.push('g* = the same for the chapter guardian; gold = cumulative; food+ = minutes of food found; foodLeft = minutes of hunger left; tier = average chest lock tier.');
  lines.push('');
  lines.push('## Not verifiable with pure rules');
  lines.push('');
  lines.push('- Real-time combat: dodging, attack speed, windups, kiting, monster pathing and crowding — the hit counts above ignore all of it.');
  lines.push('- Hero builds: skills, spells, companions, affixes, materials and cooking are not in the economy model; "atk/def" is gear only.');
  lines.push('- Whether the runtime\'s dynamic actors (monsters stepping into doorways, mimics waking, thieves) can block a corridor for good.');
  lines.push('- Tap routing through fog of war, collision radii and camera/touch input on a real phone; FPS.');
  lines.push('- Save/reload mid-floor, floor memory eviction during long backtracks (only one backtrack chain is simulated).');
  return lines.join('\n');
}

// ── CLI ─────────────────────────────────────────────────────────────────────

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const seedCount = Number.parseInt(process.argv.slice(2).find((arg) => /^\d+$/.test(arg)) ?? '40', 10);
  const option = (name, fallback) => {
    const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
    return arg ? Number.parseInt(arg.split('=')[1], 10) : fallback;
  };
  const started = performance.now();
  const result = runAudit({ seedCount, chainSeeds: option('chains', 8), landingSeeds: option('landings', 400) });
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ...result, reach: Object.fromEntries(result.reach), economies: undefined }, null, 2));
  } else {
    console.log(formatReport(result));
    console.log(`\n_${fmt((performance.now() - started) / 1000)} s_`);
  }
  const unknown = result.issues.filter((entry) => (
    (entry.severity === 'crash' || entry.severity === 'softlock') && !isKnownSoftlock(entry)
  ));
  if (unknown.length > 0) console.error(`\n${unknown.length} crash/soft-lock case(s) not in KNOWN_SOFTLOCKS.`);
  process.exitCode = unknown.length > 0 ? 1 : 0;
}
