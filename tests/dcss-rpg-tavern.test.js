import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
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
  for (const path of TAVERN_ASSET_PATHS) {
    assert.ok(path.startsWith('licensed/lpc-tavern/'), `${path} is outside the pack`);
    await access(new URL(`../public/assets/dcss-preview/${path}`, import.meta.url));
  }
  for (const file of ['LICENSE.md', 'CREDITS-tavern.txt']) {
    await access(new URL(`../public/assets/dcss-preview/licensed/lpc-tavern/${file}`, import.meta.url));
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
