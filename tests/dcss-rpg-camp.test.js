import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CAMP_ASSET_PATHS,
  CAMP_FIRE_OUT_PATH,
  CAMP_FIRE_SECONDS,
  CAMP_KIT_ITEM_ID,
  CAMP_REST_HUNGER_COST,
  CAMP_SAFE_DISTANCE,
  CAMP_SPELL_RANK,
  CAMP_SPELL_REST_PERCENT,
  CAMP_STASH_CONTAINER_ID,
  burnCampFire,
  CAMP_TENT_MAX_CELLS,
  campFeaturesForRank,
  campFireBurning,
  campLayout,
  campProfile,
  campRefusalText,
  canPitchCamp,
  createCampStash,
  createCampState,
  resolveCampRest,
  summonedCampProfile,
  validateCampRunState,
  validateCampState,
} from '../tools/dcss-rpg-camp.js';
import { spellById } from '../tools/dcss-rpg-spells.js';
import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';
import { CHEST_CONTAINER_CAPACITY, storeChestItem, takeChestItem } from '../tools/dcss-rpg-chest-containers.js';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import {
  advanceRunFloor,
  createRun,
  migrateLegacyRun,
  validateRun,
} from '../tools/dcss-rpg-core.js';
import { createGameCommand } from '../tools/dcss-rpg-game-commands.js';
import { itemDetails } from '../tools/dcss-rpg-item-details.js';
import { createSkillState, deriveSkillCapabilities, isSkillReady, learnSkill } from '../tools/dcss-rpg-skills.js';

function capabilitiesAt(rank) {
  let state = createSkillState(12);
  for (let step = 0; step < rank; step += 1) {
    const result = learnSkill({ state, heroLevel: 12, runStatus: 'playing', skillId: 'camping', expectedRank: step, attributes: { strength: 40, agility: 40, intelligence: 40 } });
    assert.equal(result.ok, true, `camping rank ${step + 1}: ${result.reason}`);
    state = result.state;
  }
  return deriveSkillCapabilities(state);
}

const openGrid = () => Array.from({ length: 11 }, () => Array(11).fill('.'));

test('the camp grows with the rank: fire, then bedroll, then chest', () => {
  assert.equal(isSkillReady('camping'), true);
  assert.deepEqual(campFeaturesForRank(0), []);
  assert.deepEqual(campFeaturesForRank(1), ['fire']);
  assert.deepEqual(campFeaturesForRank(2), ['fire', 'bedroll']);
  assert.deepEqual(campFeaturesForRank(3), ['fire', 'bedroll', 'chest']);
  assert.deepEqual(campProfile({}), { rank: 0, features: [], restPercent: 0, stashSlots: 0 });
  assert.deepEqual(campProfile(capabilitiesAt(1)), { rank: 1, features: ['fire'], restPercent: 0, stashSlots: 0 });
  assert.deepEqual(campProfile(capabilitiesAt(2)), { rank: 2, features: ['fire', 'bedroll'], restPercent: 25, stashSlots: 0 });
  assert.deepEqual(campProfile(capabilitiesAt(3)), {
    rank: 3,
    features: ['fire', 'bedroll', 'chest'],
    restPercent: 40,
    stashSlots: CHEST_CONTAINER_CAPACITY,
  });
});

test('pitching names exactly what is missing, and the layout is stable', () => {
  const grid = openGrid();
  const profile = campProfile(capabilitiesAt(3));
  const cell = { x: 5, y: 5 };
  assert.equal(canPitchCamp({ profile: campProfile({}), kits: 1, grid, cell }).reason, 'no-skill');
  assert.equal(canPitchCamp({ profile, kits: 0, grid, cell }).reason, 'no-kit');
  assert.equal(canPitchCamp({ profile, kits: 1, grid, cell, camp: { x: 1, y: 1 } }).reason, 'already-pitched');
  assert.equal(canPitchCamp({ profile, kits: 1, grid, cell: { x: 99, y: 99 } }).reason, 'unsafe-ground');
  assert.equal(canPitchCamp({ profile, kits: 1, grid: [['#', '#'], ['#', '#']], cell: { x: 0, y: 0 } }).reason, 'unsafe-ground');
  assert.equal(
    canPitchCamp({ profile, kits: 1, grid, cell, threats: [{ x: cell.x + CAMP_SAFE_DISTANCE, y: cell.y }] }).reason,
    'enemies-near',
  );
  assert.equal(
    canPitchCamp({ profile, kits: 1, grid, cell, threats: [{ x: cell.x + CAMP_SAFE_DISTANCE + 1, y: cell.y }] }).ok,
    true,
    'a creature just out of reach does not stop the camp',
  );
  const crowded = openGrid();
  const occupied = [[5, 4], [6, 5], [5, 6], [4, 5], [6, 4], [6, 6], [4, 6], [4, 4]].map(([x, y]) => `${x},${y}`);
  assert.equal(canPitchCamp({ profile, kits: 1, grid: crowded, cell, occupied }).reason, 'no-room');

  const first = canPitchCamp({ profile, kits: 1, grid, cell });
  assert.equal(first.ok, true);
  assert.deepEqual(first.places, [
    { feature: 'fire', x: 5, y: 4 },
    { feature: 'bedroll', x: 6, y: 5 },
    { feature: 'chest', x: 5, y: 6 },
  ]);
  assert.deepEqual(canPitchCamp({ profile, kits: 1, grid, cell }).places, first.places, 'the same spot builds the same camp');
  assert.deepEqual(campLayout({ cell, features: ['fire'], grid: [['#']] }), [], 'nowhere to put it is no camp at all');
});

test('sleeping trades hunger for health, once per camp', () => {
  const grid = openGrid();
  const cell = { x: 5, y: 5 };
  const second = campProfile(capabilitiesAt(2));
  const camp = createCampState({
    cell,
    places: canPitchCamp({ profile: second, kits: 1, grid, cell }).places,
    rank: 2,
    restPercent: second.restPercent,
  });
  assert.equal(validateCampState(camp), true);
  assert.equal(validateCampState(null), true, 'a floor without a camp is valid');
  assert.equal(validateCampState({ x: 1, y: 1 }), false);
  assert.equal(validateCampState({ ...camp, places: [] }), false, 'one place per rank');
  assert.equal(validateCampState({ ...camp, restPercent: 140 }), false, 'comfort is a percentage');

  const rested = resolveCampRest({ camp, hp: 20, maxHp: 60, hunger: 3000 });
  assert.equal(rested.ok, true);
  assert.equal(rested.healed, 15);
  assert.equal(rested.hp, 35);
  assert.equal(rested.hunger, 3000 - CAMP_REST_HUNGER_COST);
  assert.equal(rested.camp.rested, true);
  assert.equal(resolveCampRest({ camp: rested.camp, hp: 20, maxHp: 60, hunger: 3000 }).reason, 'already-rested');
  assert.equal(resolveCampRest({ camp, hp: 20, maxHp: 60, hunger: 100 }).reason, 'too-hungry');
  assert.equal(resolveCampRest({ camp, hp: 60, maxHp: 60, hunger: 3000 }).reason, 'nothing-to-heal');
  assert.equal(
    resolveCampRest({ camp: { ...camp, restPercent: 0 }, hp: 20, maxHp: 60, hunger: 3000 }).reason,
    'no-bedroll',
    'a camp with only a fire has nowhere to sleep',
  );
  assert.equal(resolveCampRest({ camp: null, hp: 20, maxHp: 60, hunger: 3000 }).reason, 'no-camp');
  const third = campProfile(capabilitiesAt(3));
  const deeper = createCampState({ cell, places: camp.places, rank: 2, restPercent: third.restPercent });
  assert.equal(resolveCampRest({ camp: deeper, hp: 20, maxHp: 60, hunger: 3000 }).healed, 24, 'a better camp sleeps deeper');
});

test('the camping kit is a real item the dungeon and the merchants hand out', () => {
  const kit = lootById(CAMP_KIT_ITEM_ID);
  assert.ok(kit, 'the kit is in the catalog');
  assert.equal(kit.slot, null, 'it is carried, not worn');
  assert.deepEqual(kit.useEffect, { type: 'camp' });
  assert.notEqual(kit.randomDrop, false, 'the dungeon drops it');
  assert.notEqual(kit.merchantStock, false, 'merchants sell it');
  assert.equal(kit.minDepth, 1);
  assert.equal(itemDetails(kit, 'ru').name, 'Походный набор');
  assert.equal(itemDetails(kit, 'en').name, 'Camping kit');
  assert.match(itemDetails(kit, 'ru').description, /Разбивает лагерь/);
  assert.match(itemDetails(kit, 'en').description, /Pitches a camp/);
  assert.equal(LOOT_CATALOG.filter(({ id }) => id === CAMP_KIT_ITEM_ID).length, 1);
});

test('the camp chest is an ordinary container that belongs to the run, not the floor', () => {
  const stash = createCampStash();
  assert.deepEqual(stash, { findId: CAMP_STASH_CONTAINER_ID, opened: true, destroyed: false, gold: 0, items: [] });
  assert.equal(validateCampRunState({ stash }), true);
  assert.equal(validateCampRunState({}), false);
  assert.equal(validateCampRunState({ stash, extra: 1 }), false);

  const items = [{ id: 'healing-potion', uid: 'potion-1', stack: 1 }];
  const stored = storeChestItem({
    command: createGameCommand({ streamId: 'camp-test', sequence: 1, type: 'chest-store', targetId: CAMP_STASH_CONTAINER_ID }),
    container: stash,
    uid: 'potion-1',
    items,
    inventory: ['potion-1'],
  });
  assert.equal(stored.ok, true, `store: ${stored.reason}`);
  assert.equal(stored.state.container.items.length, 1);
  assert.deepEqual(stored.state.inventory, []);
  const taken = takeChestItem({
    command: createGameCommand({ streamId: 'camp-test', sequence: 2, type: 'chest-take', targetId: CAMP_STASH_CONTAINER_ID }),
    container: stored.state.container,
    uid: 'potion-1',
    items: stored.state.items,
    inventory: stored.state.inventory,
  });
  assert.equal(taken.ok, true, `take: ${taken.reason}`);
  assert.deepEqual(taken.state.inventory, ['potion-1']);
});

test('save v47 carries the stash down the stairs and leaves the camp behind', () => {
  const run = createRun(3808);
  assert.equal(run.floor.camp, null);
  assert.deepEqual(run.camp.stash.items, []);
  assert.equal(validateRun(run), true);
  run.camp.stash.items.push({ id: 'healing-potion', uid: 'stash-1', stack: 2 });
  run.camp.stash.gold = 12;
  run.floor.camp = createCampState({
    cell: { x: run.hero.x, y: run.hero.y },
    places: [{ feature: 'fire', x: run.hero.x, y: run.hero.y - 1 }],
    rank: 1,
    restPercent: 0,
  });
  assert.equal(validateRun(run), true);
  const next = advanceRunFloor(run);
  assert.equal(next.floor.camp, null, 'the camp stays on the old floor');
  assert.deepEqual(next.camp.stash.items, run.camp.stash.items, 'the chest travels with the hero');
  assert.equal(next.camp.stash.gold, 12);
  assert.notEqual(next.camp.stash.items, run.camp.stash.items, 'and it is a copy, not a shared reference');
  assert.equal(validateRun(next), true);
  assert.equal(validateRun({ ...run, camp: undefined }), false);
  assert.equal(validateRun({
    ...run,
    floor: { ...run.floor, camp: { x: -1, y: 0, rank: 1, restPercent: 0, rested: false, places: [] } },
  }), false);

  const legacy = structuredClone(createRun(3809));
  legacy.version = 37;
  delete legacy.camp;
  delete legacy.floor.camp;
  const migrated = migrateLegacyRun(legacy);
  assert.equal(migrated.version, 51);
  assert.equal(migrated.floor.camp, null);
  assert.deepEqual(migrated.camp.stash.items, []);
  assert.equal(validateRun(migrated), true);

  // A v38 camp knew only its rank; v39 gives it the comfort that rank always had.
  const camped = structuredClone(createRun(3810));
  camped.version = 38;
  camped.floor.camp = {
    x: camped.hero.x,
    y: camped.hero.y,
    rank: 3,
    rested: false,
    places: [
      { feature: 'fire', x: camped.hero.x, y: camped.hero.y - 1 },
      { feature: 'bedroll', x: camped.hero.x + 1, y: camped.hero.y },
      { feature: 'chest', x: camped.hero.x, y: camped.hero.y + 1 },
    ],
  };
  const movedIn = migrateLegacyRun(camped);
  assert.equal(movedIn.version, 51);
  assert.equal(movedIn.floor.camp.restPercent, 40);
  assert.equal(validateRun(movedIn), true);
});

test('the runtime pitches from the bag and puts the camp on the floor', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function pitchCamp\(\)[\s\S]*canPitchCamp\(\{[\s\S]*run\.floor\.camp = createCampState\(/);
  assert.match(runtime, /effect\?\.type === 'camp'[\s\S]*const refusal = pitchCamp\(\);[\s\S]*showLootToast\(item, refusal\)/, 'a refused camp names what to fix');
  assert.match(runtime, /function applyCampProps\(\)[\s\S]*campPropsFor\(run\.floor\.camp\)/);
  assert.match(runtime, /fire: Object\.freeze\(\{[\s\S]*interactionId: 'campfire'/, 'the camp fire cooks like any other');
  assert.match(runtime, /bedroll: Object\.freeze\(\{[\s\S]*interactionId: 'camp-rest'/);
  assert.match(runtime, /chest: Object\.freeze\(\{[\s\S]*interactionId: 'camp-stash'/);
  assert.match(runtime, /'camp-rest'\(\) \{\s+closeContextActions\(\);\s+return restAtCamp\(\);/);
  assert.match(runtime, /'camp-stash'\(\) \{[\s\S]*openCampStashUi\(\)/);
  assert.match(runtime, /if \(findId === CAMP_STASH_CONTAINER_ID\) return run\.camp\.stash;/);
  assert.match(runtime, /if \(nextContainer\.findId === CAMP_STASH_CONTAINER_ID\) \{[\s\S]*run\.camp = \{ stash:/);
  assert.match(
    runtime,
    /dungeonEnvironment = createDungeonEnvironment\(dungeon\);[\s\S]*applyCampProps\(\);/,
    'a new floor rebuilds the placed props on top of its own',
  );
});

test('a refused camp explains itself in both languages', () => {
  assert.equal(campRefusalText('enemies-near', 'ru'), 'Рядом враги');
  assert.equal(campRefusalText('no-room', 'en'), 'Not enough room');
  assert.equal(campRefusalText('ready', 'ru'), '', 'a pitched camp has nothing to explain');
  assert.equal(campRefusalText('no-kit', 'de'), campRefusalText('no-kit', 'ru'), 'unknown languages fall back');
  const reasons = ['no-skill', 'no-kit', 'already-pitched', 'unsafe-ground', 'enemies-near', 'no-room'];
  for (const reason of reasons) {
    for (const language of ['ru', 'en']) {
      const text = campRefusalText(reason, language);
      assert.ok(text.length > 0 && text.length <= 32, `${reason}/${language} needs short copy`);
    }
  }
});

test('the runtime only counts watchers, not everything alive on the floor', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(
    runtime,
    /threats: monsters[\s\S]*?\.filter\(\(threat\) => hasLineOfSight\(world, threat, cell\)\)/,
    'a monster behind a wall must not forbid the camp',
  );
});

test('the bedroll and the camp chest count as adjacent the way the fire does', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(
    runtime,
    /const PROP_INTERACTION_KINDS = new Set\(\[\s+'campfire', 'camp-rest', 'camp-stash', 'house-deed', 'house-slot', 'house-rest',\s+\]\);/,
    'every camp prop lives on a grid cell, not on pixel coordinates',
  );
  assert.match(runtime, /const propTarget = PROP_INTERACTION_KINDS\.has\(entry\.kind\);/);
  assert.match(runtime, /if \(propTarget\) return distance <= 1;/);
});

test('closing the bag brings the interact button back without a step', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(
    runtime,
    /function closeInventory\(\)[\s\S]*updateInteractionUi\(\);\s+bagButton\.focus\(\);/,
    'a camp pitched from the bag must be usable the moment the bag closes',
  );
});

test('the camp chest names itself apart from dungeon chests', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /campTitle: 'Сундук лагеря',/);
  assert.match(runtime, /campTitle: 'Camp chest',/);
  assert.match(
    runtime,
    /const plainTitle = container\.findId === CAMP_STASH_CONTAINER_ID \? copy\.campTitle : copy\.title;/,
  );
});

test('the summoning spell brings its own camp, kit or no kit', () => {
  const noSkill = summonedCampProfile({});
  assert.equal(noSkill.rank, CAMP_SPELL_RANK, 'a mage who never camped still gets a bedroll');
  assert.deepEqual([...noSkill.features], ['fire', 'bedroll']);
  assert.equal(noSkill.restPercent, CAMP_SPELL_REST_PERCENT);
  assert.equal(noSkill.stashSlots, 0, 'the chest stays the skill’s reward');

  const master = summonedCampProfile(capabilitiesAt(3));
  assert.equal(master.rank, 3, 'a camper summons the camp they know how to build');
  assert.equal(master.restPercent, 40);
  assert.equal(master.stashSlots, 8);

  const grid = openGrid();
  const cell = { x: 5, y: 5 };
  assert.equal(canPitchCamp({ profile: noSkill, kits: 0, grid, cell }).reason, 'no-kit');
  const summoned = canPitchCamp({ profile: noSkill, kits: 0, grid, cell, needsKit: false });
  assert.equal(summoned.ok, true, 'the spell replaces the kit, not the safety rules');
  assert.equal(summoned.places.length, 2);
  assert.equal(
    canPitchCamp({ profile: noSkill, kits: 0, grid, cell, needsKit: false, threats: [{ x: 6, y: 6 }] }).reason,
    'enemies-near',
    'a spell cannot hide the camp from something that watches it',
  );
});

test('Call of the Camp is a real spell with a book to learn it from', () => {
  const spell = spellById('camp-call');
  assert.ok(spell, 'the spell is in the catalog');
  assert.equal(spell.kind, 'camp');
  assert.equal(spell.schoolId, 'arcana');
  assert.equal(spell.name.ru, 'Зов лагеря');
  assert.equal(spell.name.en, 'Call of the Camp');
  assert.ok(spell.minimumIntelligence >= 8, 'it is meant to be a late spell');
  assert.ok(spell.cooldown >= 60, 'and never a routine one');

  const book = lootById('book-of-camp-call');
  assert.ok(book, 'the book is in the catalog');
  assert.deepEqual(book.bookEffect, { type: 'learn-spell', spellId: 'camp-call' });
  assert.equal(itemDetails(book, 'ru').name, 'Книга зова лагеря');
  assert.equal(itemDetails(book, 'en').name, 'Book of the Camp Call');
});

test('the packager ships the camp’s own sprites', () => {
  const paths = requiredAssetPaths();
  for (const path of CAMP_ASSET_PATHS) {
    assert.ok(paths.includes(path), `${path} must reach the itch.io build`);
  }
  assert.ok(paths.includes(spellById('camp-call').icon), 'the spell icon too');
});

test('the runtime summons a camp from the spell bar', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /function summonCamp\(\) \{\s+return placeCamp\(summonedCampProfile\(currentSkillCapabilities\(\)\), \{ needsKit: false \}\);/);
  assert.match(runtime, /function pitchCamp\(\) \{\s+return placeCamp\(currentCampProfile\(\), \{ needsKit: true \}\);/);
  assert.match(
    runtime,
    /usedSpell\.kind === 'camp'[\s\S]*const refusal = summonCamp\(\);[\s\S]*rejectSpellUse\(slotIndex, 'camp-refused', refusal\)/,
    'a refused summon says why and keeps the cooldown',
  );
  assert.match(runtime, /restPercent: profile\.restPercent,/, 'the camp stores the comfort it was built with');
});

/**
 * A fire that never goes out turns a camp into a room: pitch it once and cook
 * for the rest of the run. Ivan asked for the opposite — «пусть он горит 1 или
 * 2 минуты, потом он в потухший превращается и использовать его нельзя» — so
 * the fire is a clock the camp carries, and when it runs out the wood is still
 * there and the cooking is not.
 */
test('the camp fire burns for two minutes, goes out once, and stays out', () => {
  const camp = createCampState({
    cell: { x: 5, y: 5 },
    places: [{ feature: 'fire', x: 5, y: 4 }, { feature: 'bedroll', x: 6, y: 5 }],
    rank: 2,
    restPercent: 40,
  });
  assert.equal(camp.fire, CAMP_FIRE_SECONDS);
  assert.equal(campFireBurning(camp), true);
  assert.equal(validateCampState(camp), true);

  // A minute in it is still a fire; nothing announces anything.
  let state = camp;
  let announcements = 0;
  for (let tick = 0; tick < 60; tick += 1) {
    const step = burnCampFire(state, 1);
    state = step.camp;
    if (step.wentOut) announcements += 1;
  }
  assert.equal(campFireBurning(state), true, 'a minute ate the whole fire');
  assert.equal(announcements, 0);

  // The rest of it, and the one moment worth saying out loud.
  for (let tick = 0; tick < 120; tick += 1) {
    const step = burnCampFire(state, 1);
    state = step.camp;
    if (step.wentOut) announcements += 1;
  }
  assert.equal(state.fire, 0);
  assert.equal(campFireBurning(state), false);
  assert.equal(announcements, 1, 'going out is announced once, not every frame after');

  // Everything else about the camp survives burning down — the bed still sleeps.
  assert.equal(state.places.length, 2);
  assert.equal(state.restPercent, 40);
  assert.equal(validateCampState(state), true);
  const rest = resolveCampRest({ camp: state, hp: 10, maxHp: 100, hunger: 3600 });
  assert.equal(rest.ok, true, 'a cold fire took the bedroll with it');
  assert.equal(rest.camp.fire, 0, 'sleeping relit the fire');

  // A camp with no fire in it has no clock to run down.
  const fireless = createCampState({
    cell: { x: 1, y: 1 },
    places: [{ feature: 'bedroll', x: 1, y: 2 }],
    rank: 1,
  });
  assert.equal(fireless.fire, 0);
  assert.equal(burnCampFire(fireless, 5).wentOut, false, 'a camp with no fire put one out');

  // And the clock is saved with everything else: a tea break does not relight it.
  const reloaded = JSON.parse(JSON.stringify(burnCampFire(camp, 30).camp));
  assert.equal(validateCampState(reloaded), true);
  assert.equal(reloaded.fire, CAMP_FIRE_SECONDS - 30);
  assert.equal(validateCampState({ ...camp, fire: -1 }), false);
  assert.equal(validateCampState({ ...camp, fire: CAMP_FIRE_SECONDS + 1 }), false);
  const { fire, ...withoutFire } = camp;
  assert.equal(validateCampState(withoutFire), false, 'a camp with no clock passes for a camp');
});

test('the runtime swaps the flame for cold wood and takes the cooking with it', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  // Cold wood is a prop with no light and no interaction: that is the whole of
  // «использовать его нельзя», and it needs no special case anywhere else.
  const visual = runtime.slice(runtime.indexOf("'fire-out': Object.freeze({"));
  const body = visual.slice(0, visual.indexOf('}),') + 3);
  assert.match(body, /path: CAMP_FIRE_OUT_PATH/);
  assert.match(body, /light: null/);
  assert.match(body, /interactionId: null/);
  // The picture is chosen by the clock, every time the props are built.
  assert.match(
    runtime,
    /CAMP_PROP_VISUALS\[feature === 'fire' && !burning \? 'fire-out' : feature\]/,
    'the camp draws the same fire whether or not it is lit',
  );
  // And the clock is wound by the world, not by the hero doing something.
  assert.match(runtime, /function updateWorld\(delta\) \{[\s\S]{0,200}updateCampFire\(delta\);/);
  const burn = runtime.slice(runtime.indexOf('function updateCampFire(delta) {'));
  const burnBody = burn.slice(0, burn.indexOf('\nfunction '));
  assert.match(burnBody, /applyCampProps\(\);/, 'the flame is still drawn after it went out');
  assert.ok(CAMP_ASSET_PATHS.includes(CAMP_FIRE_OUT_PATH), 'the cold wood does not ship');
});

/**
 * «Если коридор узкий в одну клетку? у нас все это продумано?» — не было.
 * Everything in a camp had always been one cell, so the layout asked a cell
 * only whether it was floor; a tent two cells across would have been drawn
 * standing through the corridor wall.
 *
 * The fix that stuck was not a rule but a size. Ivan picked the smallest of
 * the four tents — the height of the hero beside it — and a tent that fits its
 * own cell needs no clearance and no refusal: a corridor is a fine place to
 * sleep in one. This test is what keeps the two facts tied together, because
 * the size lives in the runtime and the layout lives here.
 */
test('the tent fits its own cell, so a one-cell corridor is a camp like any other', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const bedroll = runtime.slice(runtime.indexOf('  bedroll: Object.freeze({'));
  const size = Number(bedroll.slice(0, bedroll.indexOf('}),')).match(/size: (\d+)/)?.[1]);
  assert.ok(Number.isFinite(size), 'the tent has no size');
  const TILE = 64;
  assert.ok(
    size <= TILE * CAMP_TENT_MAX_CELLS,
    `a tent of ${size} no longer fits its cell: bring back the clearance rule before growing it`,
  );

  // A one-cell corridor: nothing is open except the way through.
  const corridor = ['#########', '.........', '#########'].map((row) => [...row]);
  const pitched = campLayout({ cell: { x: 4, y: 1 }, features: ['fire', 'bedroll'], grid: corridor });
  assert.equal(pitched.length, 2, 'a camp that fits was refused');
  for (const place of pitched) {
    assert.equal(corridor[place.y][place.x], '.', 'a camp piece was put in the wall');
    assert.equal(place.y, 1, 'a camp piece left the corridor');
  }
  const decision = canPitchCamp({
    profile: campProfile({ campRank: 2, campRestPercent: 25 }),
    kits: 1,
    grid: corridor,
    cell: { x: 4, y: 1 },
  });
  assert.equal(decision.ok, true);

  // Three pieces do not fit a corridor, and that refusal is the old one.
  const full = canPitchCamp({
    profile: campProfile({ campRank: 3, campRestPercent: 40, campStashSlots: 8 }),
    kits: 1,
    grid: corridor,
    cell: { x: 4, y: 1 },
  });
  assert.equal(full.reason, 'no-room');
  assert.ok(campRefusalText('no-room', 'ru').length > 0);

  // And a room still holds the whole camp.
  const room = ['########', '#......#', '#......#', '#......#', '########'].map((row) => [...row]);
  const inRoom = campLayout({ cell: { x: 4, y: 2 }, features: ['fire', 'bedroll', 'chest'], grid: room });
  assert.equal(inRoom.length, 3);
});
