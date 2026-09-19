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
import { STORY_DEPTH } from '../tools/dcss-rpg-run.js';

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
    // Ground is ground you can stand on; a brook is waded, not climbed.
    const open = cells.filter((cell) => cell !== SURFACE_WALL).length;
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
          assert.notEqual(plan.grid[y][x], SURFACE_WALL, `${room.x},${room.y} is not clear`);
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
    for (const depth of [1, 5, STORY_DEPTH]) {
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

/**
 * A road that stops at a wall it was supposed to go through is the worst thing
 * open country can produce: the map looks passable and is not. So the rule is
 * not "every clearing is reachable" but "there is one piece of ground". A patch
 * that cannot be joined without knocking a hut open is filled back in — better
 * rock than ground nobody can stand on.
 */
test('the ground of a floor is one piece, and no road stops halfway', async () => {
  const { surfaceProfile } = await import('../tools/dcss-rpg-surface-plan.js');
  for (const themeId of ['autumn-wood', 'sunburnt-steppe', 'wild-heath', 'green-hollow']) {
    for (let seed = 1; seed <= 90; seed += 1) {
      const plan = generateSurfacePlan({
        rng: createRng(seed),
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        roomCount: 10,
        profile: surfaceProfile(themeId),
      });
      const open = [];
      plan.grid.forEach((row, y) => row.forEach((cell, x) => {
        if (cell !== SURFACE_WALL) open.push({ x, y });
      }));
      const reached = reachableFrom(plan.grid, open[0]);
      assert.equal(reached.size, open.length, `${themeId} seed ${seed} leaves ground cut off`);
      // And the plan never describes a building that the repair filled in.
      for (const structure of plan.structures) {
        assert.equal(plan.grid[structure.interior.y][structure.interior.x], SURFACE_FLOOR);
      }
      for (const cave of plan.caves) {
        assert.equal(plan.grid[cave.y][cave.x], SURFACE_FLOOR);
      }
    }
  }
});

/** Two fields of grass are not the same place with a different tint. */
test('each place outside is built to its own shape', async () => {
  const { surfaceProfile, SURFACE_PROFILES } = await import('../tools/dcss-rpg-surface-plan.js');
  assert.notDeepEqual(surfaceProfile('sunburnt-steppe'), surfaceProfile('wild-heath'));
  assert.deepEqual(surfaceProfile('nowhere-at-all'), SURFACE_PROFILES.default);
  const cover = (themeId) => {
    let total = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const plan = generateSurfacePlan({
        rng: createRng(seed),
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        roomCount: 10,
        profile: surfaceProfile(themeId),
      });
      const cells = plan.grid.flat();
      total += 1 - cells.filter((cell) => cell !== SURFACE_WALL).length / cells.length;
    }
    return total / 40;
  };
  // A steppe is open with a few great mesas; a heath is a thousand small rocks.
  assert.ok(cover('wild-heath') > cover('sunburnt-steppe') + 0.04, 'the heath is not denser than the steppe');
});

/**
 * «Почему деревьев так мало — не похоже на лес». It was not a wood, it was a
 * field with groves in it: a handful of clumps and open grass between them.
 * A wood is the other way round — the trees are the map and the open ground is
 * the lanes left over. This is that in a number.
 */
test('a wood is mostly trees, and the lanes through it still join up', async () => {
  const { surfaceProfile, THICKET_COVER, SURFACE_PROFILES } = await import('../tools/dcss-rpg-surface-plan.js');
  const wooded = Object.entries(SURFACE_PROFILES)
    .filter(([, profile]) => profile.massifKind === 'thicket')
    .map(([themeId]) => themeId);
  assert.ok(wooded.length >= 3, 'no wooded places to check');
  for (const themeId of wooded) {
    for (let seed = 1; seed <= 60; seed += 1) {
      const plan = generateSurfacePlan({
        rng: createRng(seed),
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        roomCount: 10,
        profile: surfaceProfile(themeId),
      });
      const share = plan.thicketWalls.length / (MAP_WIDTH * MAP_HEIGHT);
      assert.ok(
        share >= THICKET_COVER.min,
        `${themeId} seed ${seed}: ${share.toFixed(3)} of the map is trees — that is a field, not a wood`,
      );
      assert.ok(
        share <= THICKET_COVER.max,
        `${themeId} seed ${seed}: ${share.toFixed(3)} of the map is trees — there is no way through that`,
      );
      // Dense enough to be a wood is also dense enough to seal a pocket off.
      const open = [];
      plan.grid.forEach((row, y) => row.forEach((cell, x) => {
        if (cell !== SURFACE_WALL) open.push({ x, y });
      }));
      assert.equal(reachableFrom(plan.grid, open[0]).size, open.length, `${themeId} seed ${seed} is cut in two`);
    }
  }
});

/**
 * The repair fills in ground it could not join, and the clearings that stood on
 * it stop being clearings. Topping up before the repair therefore promised
 * places that were gone by the time anyone counted — and the floor was refused
 * outright with «could not place enough rooms».
 */
test('a floor outside always has places on it, however thick the wood', async () => {
  const { surfaceProfile, MIN_CLEARINGS, SURFACE_PROFILES } = await import('../tools/dcss-rpg-surface-plan.js');
  for (const themeId of Object.keys(SURFACE_PROFILES)) {
    for (let seed = 1; seed <= 120; seed += 1) {
      const plan = generateSurfacePlan({
        rng: createRng(seed),
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        roomCount: 10,
        profile: surfaceProfile(themeId),
      });
      assert.ok(
        plan.rooms.length >= MIN_CLEARINGS,
        `${themeId} seed ${seed} came out with ${plan.rooms.length} places`,
      );
      for (const room of plan.rooms) {
        for (let y = room.y; y < room.y + room.height; y += 1) {
          for (let x = room.x; x < room.x + room.width; x += 1) {
            // A brook may cross a glade — a wall may not stand in one.
            assert.notEqual(plan.grid[y][x], SURFACE_WALL, `${themeId} seed ${seed}: a place with a wall in it`);
          }
        }
      }
    }
  }
});

/** Nothing inanimate hides the hero: a trunk, a sarcophagus, a fallen column. */
test('the scenery standing in front of the hero thins out', async () => {
  const { sceneryOpacity } = await import('../tools/dcss-rpg-visuals.js');
  const hero = { x: 10, y: 10 };
  assert.ok(sceneryOpacity({ x: 10, y: 11 }, hero) < 0.4, 'the prop dead ahead still covers him');
  assert.ok(sceneryOpacity({ x: 9, y: 11 }, hero) < 1, 'the prop at his shoulder is untouched');
  assert.ok(sceneryOpacity({ x: 9, y: 11 }, hero) > sceneryOpacity({ x: 10, y: 11 }, hero));
  // Everything else is a tree, not a curtain: behind, beside and two rows off.
  assert.equal(sceneryOpacity({ x: 10, y: 9 }, hero), 1);
  assert.equal(sceneryOpacity({ x: 11, y: 10 }, hero), 1);
  assert.equal(sceneryOpacity({ x: 10, y: 12 }, hero), 1);
  assert.equal(sceneryOpacity({ x: 7, y: 11 }, hero), 1);
});

/**
 * «Воду добавь на поверхности — больше воды, реки и тд — на болотах например
 * это фишка». Water outside is not a flooded room: it is a watercourse drawn
 * across the map, and the place decides how much of it there is.
 */
test('water runs across open country, and the place decides how much', async () => {
  const { surfaceProfile, SURFACE_PROFILES, SURFACE_WATER, WATER_CELL } = await import('../tools/dcss-rpg-surface-plan.js');
  const wet = {};
  for (const themeId of Object.keys(SURFACE_PROFILES)) {
    let total = 0;
    for (let seed = 1; seed <= 80; seed += 1) {
      const plan = generateSurfacePlan({
        rng: createRng(seed),
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        roomCount: 10,
        profile: surfaceProfile(themeId),
      });
      const share = plan.waterCells.length / (MAP_WIDTH * MAP_HEIGHT);
      total += share;
      assert.ok(share <= SURFACE_WATER.max, `${themeId} seed ${seed}: ${share.toFixed(3)} of the floor is water`);
      // The manifest and the grid say the same thing.
      const onGrid = plan.grid.flat().filter((cell) => cell === WATER_CELL).length;
      assert.equal(onGrid, plan.waterCells.length, `${themeId} seed ${seed}: the water list is not the water`);
      // Water is waded, not climbed: it never cuts the floor in two.
      const open = [];
      plan.grid.forEach((row, y) => row.forEach((cell, x) => {
        if (cell !== SURFACE_WALL) open.push({ x, y });
      }));
      assert.equal(reachableFrom(plan.grid, open[0]).size, open.length, `${themeId} seed ${seed}: water cut the floor`);
      // Nothing anybody built is under water, and neither is the arrival.
      for (const structure of plan.structures) {
        for (let y = structure.rect.y; y < structure.rect.y + structure.rect.height; y += 1) {
          for (let x = structure.rect.x; x < structure.rect.x + structure.rect.width; x += 1) {
            assert.notEqual(plan.grid[y][x], WATER_CELL, `${themeId} seed ${seed}: a hut with a stream through it`);
          }
        }
      }
      const arrival = plan.rooms[0];
      for (let y = arrival.y; y < arrival.y + arrival.height; y += 1) {
        for (let x = arrival.x; x < arrival.x + arrival.width; x += 1) {
          assert.notEqual(plan.grid[y][x], WATER_CELL, `${themeId} seed ${seed}: the hero wakes ankle-deep`);
        }
      }
    }
    wet[themeId] = total / 80;
  }
  // A mire is water with trees in it; a burnt steppe is the place with none.
  assert.equal(wet['sunburnt-steppe'], 0, 'the burnt steppe found itself a brook');
  assert.ok(wet.mire > 0.1, `the mire is only ${(wet.mire * 100).toFixed(0)}% water`);
  assert.ok(wet.mire > wet['green-hollow'] * 2, 'the mire is not the wettest place outside');
  assert.ok(wet['green-hollow'] > wet['wild-heath'], 'the hollow is no wetter than the heath');
});

/** Water is the one pass that writes over finished ground; it must not litter. */
test('a channel that leads nowhere is not left lying about', async () => {
  const { surfaceProfile, WATER_CELL } = await import('../tools/dcss-rpg-surface-plan.js');
  for (const themeId of ['mire', 'green-hollow', 'autumn-wood']) {
    for (let seed = 1; seed <= 60; seed += 1) {
      const plan = generateSurfacePlan({
        rng: createRng(seed),
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        roomCount: 10,
        profile: surfaceProfile(themeId),
      });
      // Every water cell is reachable from the clearing the hero arrives in.
      const reached = reachableFrom(plan.grid, centre(plan.rooms[0]));
      plan.grid.forEach((row, y) => row.forEach((cell, x) => {
        if (cell !== WATER_CELL) return;
        assert.ok(reached.has(`${x},${y}`), `${themeId} seed ${seed}: landlocked water at ${x},${y}`);
      }));
    }
  }
});

/** A brook in the open runs clear; a bog stands and goes murky. */
test('a place says what its water looks like', async () => {
  const { waterTiles, WATER_TILES } = await import('../tools/dcss-rpg-visuals.js');
  assert.notDeepEqual(waterTiles('autumn-wood'), waterTiles('mire'));
  assert.deepEqual(waterTiles('mire'), WATER_TILES.still, 'a bog should stand dark');
  assert.deepEqual(waterTiles('green-hollow'), WATER_TILES.running, 'a hollow should run clear');
  // Underground keeps exactly the water it always had.
  assert.deepEqual(waterTiles('ashen-vault'), WATER_TILES.still);
  assert.deepEqual(waterTiles('nowhere-at-all'), WATER_TILES.still);
});
