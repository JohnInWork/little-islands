import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  SAVE_KEY,
  SAVE_VERSION,
  createRun,
  generateDungeon,
  hydrateDungeon,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import {
  PLAYER_TRAP_ITEM_ID,
  placePlayerTrap,
  playerTrapPlacementCells,
  triggerPlayerTrap,
} from '../tools/dcss-rpg-player-traps.js';

const grid = [
  [...'#####'],
  [...'#...#'],
  [...'#...#'],
  [...'#...#'],
  [...'#####'],
];
const revealedCells = [
  '1,1', '2,1', '3,1',
  '1,2', '2,2', '3,2',
  '1,3', '2,3', '3,3',
];

function command(overrides = {}) {
  return {
    runStatus: 'playing',
    depth: 1,
    hero: { x: 2, y: 2, hp: 100 },
    target: { x: 3, y: 3 },
    capabilities: { trapPlacementTier: 2 },
    itemCount: 2,
    grid,
    revealedCells,
    blockedCells: [],
    placedTraps: [],
    ownerId: 'hero',
    ...overrides,
  };
}

test('the player explicitly chooses one of eight visible free cells around the hero', () => {
  const cells = playerTrapPlacementCells({
    grid,
    hero: { x: 2, y: 2 },
    revealedCells,
    blockedCells: ['2,1'],
    placedTraps: [{ x: 1, y: 2 }],
  });
  assert.deepEqual(cells.map(({ x, y }) => `${x},${y}`), [
    '1,1', '3,1', '3,2', '1,3', '2,3', '3,3',
  ]);
  assert.equal(cells.some(({ x, y }) => x === 2 && y === 2), false);
  assert.equal(cells.every(({ x, y }) => Math.max(Math.abs(x - 2), Math.abs(y - 2)) === 1), true);
});

test('placement is atomic, deterministic and uses the exact target coordinates from the command', () => {
  const input = command();
  const before = structuredClone(input);
  const first = placePlayerTrap(input);
  const second = placePlayerTrap(input);
  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
  assert.equal(first.ok, true);
  assert.equal(first.consumed, 1);
  assert.equal(first.remainingItems, 1);
  assert.deepEqual({ x: first.trap.x, y: first.trap.y }, input.target);
  assert.equal(first.trap.tier, 2);
  assert.equal(first.trap.state, 'armed');
  assert.deepEqual(first.event, {
    type: 'player-trap-placed', trapId: 'placed-trap-1-0', ownerId: 'hero',
    x: 3, y: 3, tier: 2, itemId: PLAYER_TRAP_ITEM_ID, consumed: 1,
  });

  for (const invalid of [
    { target: { x: 2, y: 2 } },
    { target: { x: 4, y: 2 } },
    { target: { x: 3, y: 3 }, blockedCells: ['3,3'] },
    { target: { x: 3, y: 3 }, revealedCells: revealedCells.filter((cell) => cell !== '3,3') },
    { capabilities: { trapPlacementTier: 0 } },
    { itemCount: 0 },
    { runStatus: 'dead' },
    { placedTraps: [{ x: 1, y: 1 }] },
  ]) {
    const invalidCommand = command(invalid);
    const result = placePlayerTrap(invalidCommand);
    assert.equal(result.ok, false);
    assert.equal(result.consumed, 0);
    assert.deepEqual(result.placedTraps, invalidCommand.placedTraps);
  }
});

test('an enemy springs an armed trap once; rank controls damage and hold time', () => {
  const trap = placePlayerTrap(command()).trap;
  const input = { trap, target: { instanceId: 'monster-1-0', ownerId: 'monster:monster-1-0', hp: 50 } };
  const before = structuredClone(input);
  const result = triggerPlayerTrap(input);
  assert.deepEqual(input, before);
  assert.equal(result.ok, true);
  assert.equal(result.damage, 32);
  assert.equal(result.holdSeconds, 0.9);
  assert.equal(result.target.hp, 18);
  assert.equal(result.trap.state, 'spent');
  assert.equal(triggerPlayerTrap({ ...input, trap: result.trap }).reason, 'unarmed');
  assert.equal(triggerPlayerTrap({ ...input, target: { ...input.target, ownerId: 'hero' } }).reason, 'friendly');
});

test('save v15 persists placed traps and migrates v14 without inventing a trap item', () => {
  const dungeon = generateDungeon({ seed: 71, depth: 1 });
  const run = createRun(71, dungeon);
  assert.equal(SAVE_VERSION, 43);
  assert.equal(SAVE_KEY, 'dng-codex:rpg:v43');
  // Runs start without tools now; this hero found one trap on the floor.
  run.items.push({ id: PLAYER_TRAP_ITEM_ID, uid: 'starter-hunter-trap', stack: 1 });
  run.inventory.push('starter-hunter-trap');
  assert.equal(run.items.some(({ id }) => id === PLAYER_TRAP_ITEM_ID), true);

  const legacy = structuredClone(run);
  legacy.version = 14;
  delete legacy.floor.placedTraps;
  legacy.inventory = legacy.inventory.filter((uid) => uid !== 'starter-hunter-trap');
  legacy.items = legacy.items.filter(({ uid }) => uid !== 'starter-hunter-trap');
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.deepEqual(migrated.floor.placedTraps, []);
  assert.equal(migrated.items.some(({ id }) => id === PLAYER_TRAP_ITEM_ID), false);
  assert.equal(validateRun(migrated), true);

  const blocked = [
    dungeon.exit,
    dungeon.sanctuary,
    ...dungeon.doors,
    ...dungeon.events,
    ...dungeon.finds,
    ...dungeon.loot,
    ...dungeon.monsters,
    ...dungeon.passiveCreatures,
  ].filter(Boolean).map(({ x, y }) => `${x},${y}`);
  const revealed = dungeon.grid.flatMap((row, y) =>
    row.map((cell, x) => cell === '.' ? `${x},${y}` : null).filter(Boolean));
  const target = playerTrapPlacementCells({
    grid: dungeon.grid,
    hero: run.hero,
    revealedCells: revealed,
    blockedCells: blocked,
  })[0];
  assert.ok(target);
  const placed = placePlayerTrap({
    ...command(),
    depth: run.depth,
    hero: { ...run.hero, hp: run.hero.hp },
    target,
    grid: dungeon.grid,
    revealedCells: revealed,
    blockedCells: blocked,
    capabilities: { trapPlacementTier: 1 },
    itemCount: 1,
  });
  assert.equal(placed.ok, true);
  run.floor.placedTraps = placed.placedTraps;
  assert.equal(validateRun(run), true);
  assert.doesNotThrow(() => hydrateDungeon(JSON.parse(JSON.stringify(run))));

  const corrupt = structuredClone(run);
  corrupt.floor.placedTraps[0].x = 0;
  corrupt.floor.placedTraps[0].y = 0;
  assert.equal(validateRun(corrupt), true, 'cheap validation does not regenerate the floor');
  assert.throws(() => hydrateDungeon(corrupt), /placed player trap/);
});

test('runtime uses a paused targeting screen and consumes only after an explicit tile command', async () => {
  const source = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8');
  assert.match(source, /uiScreen = 'trap-placement'/);
  assert.match(source, /performTrapPlacement\(cell\.x, cell\.y\)/);
  assert.match(source, /unprojectGround\(event\.clientX, event\.clientY\)/);
  assert.match(source, /const result = placePlayerTrap\(/);
  assert.ok(source.indexOf('const result = placePlayerTrap(') < source.indexOf('backpackItems.splice(itemIndex, 1)'));
  assert.match(html, /id="trap-placement-targets"/);
  assert.match(html, /id="cancel-trap-placement"/);
});
