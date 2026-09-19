import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  TAVERN_ASSET_PATHS,
  TAVERN_BED_PRICE,
  TAVERN_HIRE_MONSTER_IDS,
  TAVERN_KEEPER_ID,
  TAVERN_PROPS,
  bedOffer,
  mercenaryIdForHireMonster,
  tavernDoorSide,
  tavernHireMonsterId,
  tavernKeeperSpot,
  tavernLayout,
  tavernSeatedMercenaries,
  tavernSeats,
} from '../tools/dcss-rpg-tavern.js';
import { MERCENARIES } from '../tools/dcss-rpg-mercenaries.js';
import { monsterById } from '../tools/dcss-rpg-content.js';
import {
  CITY_DEPTH,
  CITY_RECRUITER_ID,
  cityTavernBlock,
  generateCityPlan,
} from '../tools/dcss-rpg-city.js';
import { MAP_HEIGHT, MAP_WIDTH, createRng, generateDungeon } from '../tools/dcss-rpg-core.js';

const room = (w, h) => ({ x: 10, y: 6, w, h });
const southDoor = ({ x, y, w, h }) => ({ x: x + Math.floor(w / 2), y: y + h, axis: 'y' });

/**
 * The whole point of the room is that you walk in and the counter is in front
 * of you. If the bar drifted to a side wall the tavern would read as a storage
 * room with a fire in it, so the rule is checked from all four doors.
 */
test('the bar always stands against the wall opposite the door', () => {
  const interior = room(5, 4);
  const doors = {
    south: { x: 12, y: 10, axis: 'y' },
    north: { x: 12, y: 5, axis: 'y' },
    west: { x: 9, y: 8, axis: 'x' },
    east: { x: 15, y: 8, axis: 'x' },
  };
  const far = {
    south: (bar) => assert.equal(bar.y, interior.y, 'south door puts the bar on the north wall'),
    north: (bar) => assert.equal(bar.y, interior.y + interior.h - 1),
    west: (bar) => assert.equal(bar.x, interior.x + interior.w - 1),
    east: (bar) => assert.equal(bar.x, interior.x),
  };
  for (const [side, door] of Object.entries(doors)) {
    assert.equal(tavernDoorSide({ interior, door }), side);
    const bar = tavernLayout({ interior, door }).find(({ kind }) => kind === 'bar');
    assert.ok(bar, `${side}: the room has a counter`);
    far[side](bar);
  }
});

/**
 * Two pieces on one cell is a layout bug the placer would hide by dropping the
 * second one silently — which is exactly how a tavern ends up with no pot on.
 */
test('nothing in the room stands where something else already does', () => {
  for (let w = 4; w <= 9; w += 1) {
    for (let h = 3; h <= 7; h += 1) {
      const interior = room(w, h);
      const door = southDoor(interior);
      const pieces = tavernLayout({ interior, door });
      const seats = tavernSeats({ interior, door });
      const keeper = tavernKeeperSpot({ interior, door });
      const cells = pieces.map(({ x, y }) => `${x},${y}`);
      assert.equal(new Set(cells).size, cells.length, `${w}x${h}: two props share a cell`);
      const seatKeys = new Set(seats.map(({ x, y }) => `${x},${y}`));
      assert.equal(seatKeys.size, seats.length, `${w}x${h}: two hires share a chair`);
      assert.ok(!seatKeys.has(`${keeper.x},${keeper.y}`), `${w}x${h}: the keeper sits in a guest's chair`);
      // Everything the room contains is inside the room.
      for (const { x, y } of [...pieces, ...seats, keeper]) {
        assert.ok(x >= interior.x && x < interior.x + interior.w, `${w}x${h}: ${x},${y} is outside`);
        assert.ok(y >= interior.y && y < interior.y + interior.h, `${w}x${h}: ${x},${y} is outside`);
      }
      // A tavern with nowhere to cook is a room with chairs.
      assert.ok(
        pieces.some(({ kind }) => TAVERN_PROPS[kind].interactionId === 'campfire'),
        `${w}x${h}: nothing to cook on`,
      );
    }
  }
});

/** A room too small to seat anybody is furnished as an ordinary building. */
test('a cupboard is not a tavern', () => {
  for (const [w, h] of [[3, 3], [4, 2], [1, 1]]) {
    const interior = room(w, h);
    const door = southDoor(interior);
    assert.deepEqual(tavernLayout({ interior, door }), []);
    assert.deepEqual(tavernSeats({ interior, door }), []);
    assert.equal(tavernKeeperSpot({ interior, door }), null);
  }
  assert.deepEqual(tavernLayout({ interior: null, door: null }), []);
});

/**
 * The cheapest hire sits nearest the door on purpose: a player who walks in
 * with seventy coins should meet the man he can afford first, not last.
 */
test('the hires sit in price order, cheapest by the door', () => {
  const interior = room(6, 5);
  const door = southDoor(interior);
  const seated = tavernSeatedMercenaries({ interior, door });
  assert.equal(seated.length, MERCENARIES.length);
  assert.deepEqual(seated.map(({ mercenaryId }) => mercenaryId), MERCENARIES.map(({ id }) => id));
  const doorDistance = ({ x, y }) => Math.abs(x - door.x) + Math.abs(y - door.y);
  assert.ok(
    doorDistance(seated[0]) <= doorDistance(seated.at(-1)),
    'the drifter is not further from the door than the knight',
  );
});

/**
 * The seated man and the hire are the same person, and the catalogue is where
 * that stops being a claim: one entry per mercenary, with his own numbers.
 */
test('a man sitting at a table is the mercenary he will be if hired', () => {
  assert.deepEqual(TAVERN_HIRE_MONSTER_IDS, MERCENARIES.map(({ id }) => tavernHireMonsterId(id)));
  for (const hire of MERCENARIES) {
    const monsterId = tavernHireMonsterId(hire.id);
    assert.equal(mercenaryIdForHireMonster(monsterId), hire.id, 'the id round-trips');
    const seated = monsterById(monsterId);
    assert.ok(seated, `${monsterId} is not in the monster catalogue`);
    assert.equal(seated.path, hire.path, `${monsterId} does not look like the man you hire`);
    assert.equal(seated.hp, hire.maxHp, `${monsterId} does not fight like the man you hire`);
    assert.equal(seated.damage, hire.damage);
    assert.equal(seated.neutral, true, 'a man drinking is not an enemy');
    assert.equal(seated.spawn, 'city', 'hires belong to the city, never to a dungeon pool');
  }
  assert.equal(mercenaryIdForHireMonster('city-guard'), null);
  assert.equal(mercenaryIdForHireMonster(null), null);
});

/** The bed is money for a whole night, and every refusal says which one it is. */
test('the room upstairs is refused for a named reason', () => {
  const restMax = 2700;
  assert.equal(bedOffer({ gold: 999, rest: restMax, restMax }).reason, 'not-tired');
  assert.equal(bedOffer({ gold: TAVERN_BED_PRICE - 1, rest: 0, restMax }).reason, 'too-dear');
  const ready = bedOffer({ gold: TAVERN_BED_PRICE, rest: 0, restMax });
  assert.equal(ready.ok, true);
  assert.equal(ready.price, TAVERN_BED_PRICE);
  assert.ok(ready.text.includes(String(TAVERN_BED_PRICE)), 'the price is in the words');
  assert.notEqual(
    bedOffer({ gold: 0, rest: 0, restMax, language: 'en' }).text,
    bedOffer({ gold: 0, rest: 0, restMax, language: 'ru' }).text,
  );
});

/** Art the game asks for has to be art the game ships, and under a licence. */
test('the tavern ships its own sprites and says whose they are', async () => {
  assert.ok(TAVERN_ASSET_PATHS.length >= 30, 'a tavern is more than a table');
  // Two packs, two licences: the furniture is CC-BY-SA 3.0 and the boards under
  // it are 4.0. Nothing the tavern draws may come from anywhere but these.
  const packs = new Set(['licensed/lpc-tavern/', 'licensed/lpc-floors/']);
  for (const path of TAVERN_ASSET_PATHS) {
    assert.ok([...packs].some((pack) => path.startsWith(pack)), `${path} is outside both packs`);
    await access(new URL(`../public/assets/dcss-preview/${path}`, import.meta.url));
  }
  for (const file of ['lpc-tavern/LICENSE.md', 'lpc-tavern/CREDITS-tavern.txt',
    'lpc-floors/LICENSE.md', 'lpc-floors/CREDITS-floors.txt']) {
    await access(new URL(`../public/assets/dcss-preview/licensed/${file}`, import.meta.url));
  }
  // Animation is frames, not a promise: a prop with one frame never animates.
  for (const kind of ['fireplace', 'cauldron', 'torch']) {
    assert.ok(TAVERN_PROPS[kind].frames.length >= 3, `${kind} does not move`);
  }
});

/**
 * The city gets a tavern with people in it, and — the part that matters for
 * anyone mid-run — the blocks that existed before it keep the roles they had.
 */
test('the city keeps a tavern, and the older quarters keep their own roles', () => {
  for (const seed of [3, 7, 21, 104]) {
    const rng = createRng(seed);
    const plan = generateCityPlan({ rng: () => rng.next(), width: MAP_WIDTH, height: MAP_HEIGHT });
    const tavern = cityTavernBlock(plan);
    assert.ok(tavern, `seed ${seed}: no tavern`);
    assert.ok(tavern.door, 'a tavern has a door onto the street');
    assert.ok(tavern.interior.w >= 4 && tavern.interior.h >= 3, 'and a common room');

    // The tavern is the last role handed out, so the roles before it are the
    // ones the city always had, in the order it always had them.
    const roles = plan.blocks.map(({ kind }) => kind);
    const before = roles.slice(0, roles.indexOf('tavern'));
    assert.deepEqual(
      before,
      ['plaza', 'market', 'shop', 'shop', 'shop', 'shop', 'temple', 'barracks', 'jail', 'plot'],
      `seed ${seed}: an older quarter changed what it is`,
    );
  }

  const level = generateDungeon({ seed: 7, depth: CITY_DEPTH });
  const hires = level.monsters.filter(({ id }) => mercenaryIdForHireMonster(id));
  assert.equal(hires.length, MERCENARIES.length, 'four hires are drinking');
  const keeper = level.monsters.find(({ id }) => id === TAVERN_KEEPER_ID);
  assert.equal(TAVERN_KEEPER_ID, CITY_RECRUITER_ID, 'the recruiter is the keeper, not a second man');
  assert.ok(keeper, 'somebody is behind the counter');

  const tavern = cityTavernBlock({ blocks: level.city.blocks });
  const inside = ({ x, y }) => (
    x >= tavern.interior.x && x < tavern.interior.x + tavern.interior.w
    && y >= tavern.interior.y && y < tavern.interior.y + tavern.interior.h
  );
  for (const person of [...hires, keeper]) {
    assert.ok(inside(person), `${person.id} is not in the tavern`);
    assert.equal(level.grid[person.y][person.x], '.', `${person.id} stands in a wall`);
  }
});

/**
 * The inn belongs to the road out and nowhere else. A lit room with beer in it
 * is a thing you find on a track through woods and moor; it is not a thing
 * three hundred metres down in a burning core.
 */
test('a wayside inn stands on the road out, and only there', async () => {
  const { FLOORS_PER_INN } = await import('../tools/dcss-rpg-room-plans.js');
  let onTheRoadOut = 0;
  for (let seed = 1; seed <= 20; seed += 1) {
    for (let depth = 2; depth <= 20; depth += 1) {
      for (const branch of ['deep', 'surface', 'vaults']) {
        const level = generateDungeon({ seed, depth, branch });
        const inn = level.roomPlans.some(({ archetypeId }) => archetypeId === 'wayside-inn');
        if (!inn) continue;
        assert.equal(branch, 'surface', `seed ${seed} floor ${depth}: an inn underground`);
        assert.equal(depth % FLOORS_PER_INN, 0, 'an inn is a promise, not a dice roll');
        onTheRoadOut += 1;
      }
    }
  }
  assert.ok(onTheRoadOut > 50, 'the road out passes inns often enough to matter');
});

/**
 * An inn with nobody in it is a room with furniture. Out in the open the rooms
 * are clearings and clearings overlap — a merchant's alcove sharing ground with
 * the inn used to wipe the keeper and the hire when it cleared its own floor.
 */
test('every inn has a keeper behind the counter and one hire at the table', () => {
  let inns = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    for (let depth = 4; depth <= 24; depth += 4) {
      const level = generateDungeon({ seed, depth, branch: 'surface' });
      const plan = level.roomPlans.find(({ archetypeId }) => archetypeId === 'wayside-inn');
      if (!plan) continue;
      inns += 1;
      const room = level.rooms[plan.roomIndex];
      const people = level.monsters.filter(({ instanceId }) => instanceId.includes('-inn-'));
      assert.equal(people.length, 2, `seed ${seed} floor ${depth}: the inn is empty`);
      assert.equal(people.filter(({ id }) => id === TAVERN_KEEPER_ID).length, 1);
      assert.equal(people.filter(({ id }) => mercenaryIdForHireMonster(id)).length, 1);
      for (const person of people) {
        assert.equal(level.grid[person.y][person.x], '.', `${person.id} stands in a wall`);
        assert.ok(
          person.x >= room.x && person.x < room.x + room.width
          && person.y >= room.y && person.y < room.y + room.height,
          `${person.id} is not in the inn`,
        );
      }
      assert.equal(new Set(people.map(({ x, y }) => `${x},${y}`)).size, 2, 'two people, two chairs');
    }
  }
  assert.ok(inns > 20, 'the sample actually found inns');
});

/**
 * The deeper the inn, the better the company: the people who get that far out
 * are not the people who take seventy coins to do it.
 */
test('the company at the fire gets harder the further out the inn is', () => {
  const tierAt = (depth) => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const level = generateDungeon({ seed, depth, branch: 'surface' });
      const hire = level.monsters.find(({ id }) => mercenaryIdForHireMonster(id));
      if (hire) return MERCENARIES.findIndex(({ id }) => id === mercenaryIdForHireMonster(hire.id));
    }
    return null;
  };
  const shallow = tierAt(4);
  const deep = tierAt(16);
  assert.equal(shallow, 0, 'the first inn keeps a drifter');
  assert.equal(deep, 3, 'the last one keeps a knight');
});

/** The inn is furnished by the same module the city's tavern is. */
test('an inn is composed, not scattered', async () => {
  const { createDungeonEnvironment } = await import('../tools/dcss-rpg-environment.js');
  for (let seed = 1; seed <= 30; seed += 1) {
    const level = generateDungeon({ seed, depth: 8, branch: 'surface' });
    const plan = level.roomPlans.find(({ archetypeId }) => archetypeId === 'wayside-inn');
    if (!plan) continue;
    const room = level.rooms[plan.roomIndex];
    const inside = createDungeonEnvironment(level).props.filter(({ gridX, gridY }) => (
      gridX >= room.x && gridX < room.x + room.width
      && gridY >= room.y && gridY < room.y + room.height
    ));
    assert.ok(inside.length >= 5, `seed ${seed}: the common room is bare`);
    const paths = inside.map(({ path }) => path);
    assert.ok(paths.every((path) => path.startsWith('licensed/lpc-tavern/')), 'a crypt statue got in');
    assert.ok(paths.some((path) => path.includes('bar')), 'an inn has a counter');
    assert.ok(paths.some((path) => path.includes('fireplace')), 'and a fire');
    // Nobody is standing under the furniture.
    const taken = new Set(level.monsters.map(({ x, y }) => `${x},${y}`));
    for (const prop of inside) assert.ok(!taken.has(`${prop.gridX},${prop.gridY}`), 'a barrel on the keeper');
    return;
  }
  assert.fail('no inn in the sample');
});

/**
 * A tavern standing on the moss of the moor it was built on is a table
 * somebody carried outside. Dungeon Crawl's library has no wooden floor at all,
 * so the pack brings its own, and the renderer has to actually ask for it.
 */
test('a tavern has boards under it, in the city and on the road', async () => {
  const { TAVERN_FLOOR_PATHS, tavernFloorCells } = await import('../tools/dcss-rpg-tavern.js');
  assert.equal(TAVERN_FLOOR_PATHS.length, 4, 'one board repeated is a pattern, not a floor');
  for (const path of TAVERN_FLOOR_PATHS) {
    await access(new URL(`../public/assets/dcss-preview/${path}`, import.meta.url));
  }

  // The city's tavern is boarded, and nothing outside its walls is.
  const city = generateDungeon({ seed: 7, depth: CITY_DEPTH });
  const tavern = cityTavernBlock({ blocks: city.city.blocks });
  const cityBoards = tavernFloorCells(city);
  assert.equal(cityBoards.size, tavern.interior.w * tavern.interior.h);
  for (const cell of cityBoards) {
    const [x, y] = cell.split(',').map(Number);
    assert.ok(x >= tavern.interior.x && x < tavern.interior.x + tavern.interior.w, `${cell} is outside`);
    assert.ok(y >= tavern.interior.y && y < tavern.interior.y + tavern.interior.h, `${cell} is outside`);
  }
  // The street keeps its cobbles.
  assert.ok(!cityBoards.has(`${city.spawn.x},${city.spawn.y}`));

  // And so is every inn on the road out — and only the inn.
  let checked = 0;
  for (let seed = 1; seed <= 30 && checked < 3; seed += 1) {
    const level = generateDungeon({ seed, depth: 8, branch: 'surface' });
    const plan = level.roomPlans.find(({ archetypeId }) => archetypeId === 'wayside-inn');
    if (!plan) continue;
    checked += 1;
    const room = level.rooms[plan.roomIndex];
    const boards = tavernFloorCells(level);
    assert.equal(boards.size, room.width * room.height, `seed ${seed}: the inn is not fully boarded`);
    assert.ok(boards.has(`${room.x},${room.y}`));
    assert.ok(!boards.has(`${room.x - 1},${room.y}`), 'the boards stop at the wall');
  }
  assert.ok(checked > 0, 'the sample found an inn');

  // A floor nobody lays is a floor nobody sees: the renderer asks for these.
  const adapter = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(adapter, /boardedFloorCells = new Set\(\[\s*\.\.\.tavernFloorCells\(dungeon\)/);
  assert.match(
    adapter,
    /function floorTextureAt[\s\S]{0,600}boardedFloorCells\.has[\s\S]{0,120}TAVERN_FLOOR_PATHS/,
    'floorTextureAt never consults the boards',
  );
});

/** A dungeon with no tavern anywhere lays no boards at all. */
test('nothing else in the game gets a wooden floor by accident', async () => {
  const { tavernFloorCells } = await import('../tools/dcss-rpg-tavern.js');
  for (const branch of ['deep', 'vaults']) {
    for (let depth = 1; depth <= 12; depth += 1) {
      assert.equal(tavernFloorCells(generateDungeon({ seed: 5, depth, branch })).size, 0);
    }
  }
  assert.equal(tavernFloorCells(null).size, 0);
  assert.equal(tavernFloorCells({}).size, 0);
});

/**
 * Three grounds, and each one says what it is.
 *
 * The town stands on the surface and used to stand on brown cobbles, so
 * everything growing in it looked planted in stone. Boards then went down
 * indoors — and, by accident, on the square: the plaza carries an `interior`
 * like every other block, so the middle of the town came out floored in planks.
 * Ivan found it on his phone: «это центр города, деревянного пола там быть не
 * должно… сделай зелёную землю, чтобы деревья росли, центральный парк».
 */
test('the town has boards indoors, earth on the streets and grass on the square', async () => {
  const city = await import('../tools/dcss-rpg-city.js');
  const { generateDungeon } = await import('../tools/dcss-rpg-core.js');
  const { biomeThemeFor } = await import('../tools/dcss-rpg-visuals.js');

  const ground = biomeThemeFor('gate-town').floors;
  assert.ok(ground.every((path) => path.includes('dirt')), 'the town is paved again');
  assert.ok(ground.length >= 3, 'one tile repeated is a chequerboard');

  for (const seed of [1, 7, 91]) {
    const town = generateDungeon({ seed, depth: 0 });
    const boards = city.cityInteriorFloorCells(town.city);
    const green = city.cityGreenCells(town.city);
    assert.ok(boards.size > 40, `seed ${seed}: the town has no floors indoors`);
    assert.ok(green.size > 8, `seed ${seed}: the town has no green in it`);

    // Every building with a room inside it, not only the tavern.
    const housed = town.city.blocks.filter(({ interior, kind }) => interior
      && !city.CITY_OPEN_BLOCK_KINDS.includes(kind));
    assert.ok(housed.length >= 4, 'a town with no buildings');
    for (const block of housed) {
      const { x, y } = block.interior;
      assert.ok(boards.has(`${x},${y}`), `seed ${seed}: ${block.kind} stands on the street`);
    }

    // The square and the market are places, not rooms: no roof, no floor.
    for (const block of town.city.blocks.filter(({ kind }) => city.CITY_OPEN_BLOCK_KINDS.includes(kind))) {
      const { x, y } = block.interior ?? block.rect;
      assert.ok(!boards.has(`${x},${y}`), `seed ${seed}: the ${block.kind} was boarded over`);
      assert.ok(green.has(`${x},${y}`), `seed ${seed}: the ${block.kind} is not green`);
    }

    // Nothing is two things at once, and the street is neither.
    for (const key of green) assert.ok(!boards.has(key), `${key} is both lawn and floorboards`);
    assert.ok(!boards.has(`${town.gates.deep.x},${town.gates.deep.y}`), 'the gate is indoors');
    assert.ok(!green.has(`${town.gates.deep.x},${town.gates.deep.y}`), 'the gate is on the lawn');
  }
});
