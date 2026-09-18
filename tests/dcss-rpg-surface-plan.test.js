import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SURFACE_FLOOR,
  SURFACE_WALL,
  generateSurfacePlan,
  reachableFrom,
} from '../tools/dcss-rpg-surface-plan.js';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  createRng,
  createRun,
  findGridPath,
  generateDungeon,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { FINAL_DEPTH } from '../tools/dcss-rpg-run.js';

const centre = (room) => ({
  x: Math.floor(room.x + room.width / 2),
  y: Math.floor(room.y + room.height / 2),
});

const plans = Array.from({ length: 160 }, (_entry, index) => generateSurfacePlan({
  rng: createRng(index + 1),
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  roomCount: 10,
}));

/**
 * A dungeon is carved out of rock and everything in it is a box on a corridor.
 * Open country is the other way round, and this is the difference in one line:
 * most of the map is ground you can already walk on.
 */
test('open country is open, and the rock is what was put into it', () => {
  for (const plan of plans) {
    const cells = plan.grid.flat();
    const open = cells.filter((cell) => cell === SURFACE_FLOOR).length;
    const cover = 1 - open / cells.length;
    // The border ring alone is a good tenth of a floor this size, so the band
    // is about what is left: open country with rock in it, not rock with paths.
    assert.ok(cover > 0.15 && cover < 0.5, `rock covers ${(cover * 100).toFixed(0)}%`);
    // The edge of the world is rock; nothing walks off the map.
    assert.ok(plan.grid[0].every((cell) => cell === SURFACE_WALL));
    assert.ok(plan.grid.at(-1).every((cell) => cell === SURFACE_WALL));
    assert.ok(plan.grid.every((row) => row[0] === SURFACE_WALL && row.at(-1) === SURFACE_WALL));
  }
});

test('every clearing, hut and cave can be walked to from the first one', () => {
  for (const plan of plans) {
    const reached = reachableFrom(plan.grid, centre(plan.rooms[0]));
    for (const room of plan.rooms) {
      const cell = centre(room);
      assert.ok(reached.has(`${cell.x},${cell.y}`), 'a place is walled off from the rest');
      // Rooms are open ground, not a rectangle drawn over rock.
      for (let y = room.y; y < room.y + room.height; y += 1) {
        for (let x = room.x; x < room.x + room.width; x += 1) {
          assert.equal(plan.grid[y][x], SURFACE_FLOOR, `${room.x},${room.y} is not clear`);
        }
      }
    }
  }
});

test('there are huts with doors, and caves hollowed into the hills', () => {
  let withCave = 0;
  for (const plan of plans) {
    assert.ok(plan.structures.length >= 1, 'a floor with no hut has no doorway either');
    // A hill raised later, or a trail worn through, can break into a hut and
    // leave its doorway a hole in a ruin — which is fine, and looks it. What
    // the floor needs is that at least one doorway is still a doorway.
    const intact = plan.structures.filter((structure) => {
      const { x, y } = structure.door;
      if (plan.grid[y][x] !== SURFACE_FLOOR) return false;
      const alongX = plan.grid[y][x - 1] === SURFACE_WALL && plan.grid[y][x + 1] === SURFACE_WALL;
      const alongY = plan.grid[y - 1][x] === SURFACE_WALL && plan.grid[y + 1][x] === SURFACE_WALL;
      return alongX || alongY;
    });
    assert.ok(intact.length >= 1, 'every doorway on this floor is a hole');
    for (const structure of plan.structures) {
      assert.ok(plan.rooms.some((room) => room.x === structure.interior.x && room.y === structure.interior.y));
    }
    if (plan.caves.length > 0) withCave += 1;
  }
  assert.ok(withCave > plans.length * 0.5, `only ${withCave} floors of ${plans.length} have a cave`);
});

test('the same seed is the same country, and a different one is not', () => {
  const shape = (plan) => plan.grid.map((row) => row.join('')).join('\n');
  assert.equal(
    shape(generateSurfacePlan({ rng: createRng(42), width: MAP_WIDTH, height: MAP_HEIGHT })),
    shape(generateSurfacePlan({ rng: createRng(42), width: MAP_WIDTH, height: MAP_HEIGHT })),
  );
  assert.notEqual(
    shape(generateSurfacePlan({ rng: createRng(42), width: MAP_WIDTH, height: MAP_HEIGHT })),
    shape(generateSurfacePlan({ rng: createRng(43), width: MAP_WIDTH, height: MAP_HEIGHT })),
  );
  assert.throws(() => generateSurfacePlan({ width: MAP_WIDTH, height: MAP_HEIGHT }), /seeded RNG/);
  assert.throws(() => generateSurfacePlan({ rng: createRng(1), width: 10, height: 10 }), /room to breathe/);
});

/** Whatever it looks like, it is still a floor the rest of the game can use. */
test('a surface floor is a floor: reachable exit, valid run, no crashes', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    for (const depth of [1, 5, FINAL_DEPTH]) {
      const dungeon = generateDungeon({ seed, depth, branch: 'surface' });
      assert.ok(
        findGridPath(dungeon.grid, dungeon.spawn, dungeon.exit, { allowDoors: true }).length > 0,
        `seed ${seed} depth ${depth} has no way out`,
      );
      assert.ok(validateRun(createRun(seed, dungeon)));
      assert.ok(dungeon.rooms.length >= 6);
      // The caves below still look like caves: rooms joined by corridors.
      const below = generateDungeon({ seed, depth, branch: 'deep' });
      assert.notEqual(
        dungeon.grid.map((row) => row.join('')).join(''),
        below.grid.map((row) => row.join('')).join(''),
      );
    }
  }
});

/**
 * A tree stretched over a wall block is what "деревья плохо отображаются"
 * looks like: the cube lights and shadows a texture that was drawn to stand
 * on its own. Trees belong in the prop pass, with the statues and the bushes.
 */
test('nothing growing is painted onto a wall', async () => {
  const { BIOME_THEMES } = await import('../tools/dcss-rpg-visuals.js');
  const { ENVIRONMENT_ROOM_THEMES } = await import('../tools/dcss-rpg-environment.js');
  for (const theme of BIOME_THEMES) {
    for (const path of [...theme.walls, ...theme.accentWalls]) {
      assert.ok(!path.includes('dngn/trees/'), `${theme.id} paints a tree on a wall`);
    }
  }
  const outdoors = ENVIRONMENT_ROOM_THEMES.filter(({ id }) => (
    ['open-wood', 'mangrove-shallows', 'boneyard', 'ruined-yard'].includes(id)
  ));
  assert.equal(outdoors.length, 4, 'the outdoors ships four kinds of ground cover');
  assert.ok(
    outdoors.some(({ features, details }) => (
      [...features, ...details].some(({ path }) => path.includes('dngn/trees/'))
    )),
    'trees have to stand somewhere',
  );
  // And a graveyard has graves in it, not statuary borrowed from a hall.
  const boneyard = outdoors.find(({ id }) => id === 'boneyard');
  assert.ok(boneyard.features.some(({ path }) => path.includes('sarcophagus')));
});

/** Every place outside is decorated as a place outside. */
test('no crypt statue ever stands in a meadow', async () => {
  const { DUNGEON_THEME_CATALOG, ROOM_ARCHETYPE_CATALOG, environmentThemeFor } =
    await import('../tools/dcss-rpg-room-plans.js');
  const outdoors = new Set(['open-wood', 'mangrove-shallows', 'boneyard', 'ruined-yard']);
  for (const theme of DUNGEON_THEME_CATALOG.filter(({ branch }) => branch === 'surface')) {
    for (const archetype of ROOM_ARCHETYPE_CATALOG) {
      const look = environmentThemeFor(archetype, theme.id);
      assert.ok(outdoors.has(look), `${archetype.id} in ${theme.id} is decorated as ${look}`);
    }
  }
});
