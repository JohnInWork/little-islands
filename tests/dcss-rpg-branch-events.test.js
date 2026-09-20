import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

import { BRANCH_EVENTS, branchEventFor } from '../tools/dcss-rpg-branch-events.js';
import { RUN_BRANCHES } from '../tools/dcss-rpg-content.js';
import { ACTOR_EFFECT_IDS } from '../tools/dcss-rpg-effects.js';
import { ENVIRONMENT_ROOM_THEMES } from '../tools/dcss-rpg-environment.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import {
  LANDMARK_CATALOG,
  LANDMARK_OUTCOME_KEYS,
  findById,
  isLandmarkFind,
  landmarkActionRules,
  resolveFindInteraction,
} from '../tools/dcss-rpg-finds.js';
import { requiredAssetPaths } from '../tools/dcss-rpg-required-assets.js';
import {
  environmentThemeFor,
  roomArchetypeById,
  roomArchetypeIdForFind,
} from '../tools/dcss-rpg-room-plans.js';

const preview = new URL('../public/assets/dcss-preview/', import.meta.url);
const stubRng = { int: (min) => min };

/**
 * «С какими-нибудь уникальными событиями» — every road has one landmark that
 * is only ever met there.
 */
test('every road has one event of its own, and no road has another road’s', () => {
  assert.equal(BRANCH_EVENTS.length, RUN_BRANCHES.length);
  for (const branch of RUN_BRANCHES) {
    const event = branchEventFor(branch);
    assert.ok(event, `${branch} has no event of its own`);
    assert.equal(event.branch, branch);
    assert.equal(event.wave, 'landmark');
    assert.equal(event.category, 'choice');
    assert.ok(event.weight > 1, `${event.id} would be as rare as a generic landmark`);
  }
  assert.equal(branchEventFor('nowhere'), null);
  // Ids and pictures are the player's way of telling them apart, so no two
  // landmarks anywhere may share either.
  assert.equal(new Set(LANDMARK_CATALOG.map(({ id }) => id)).size, LANDMARK_CATALOG.length);
  assert.equal(new Set(LANDMARK_CATALOG.map(({ path }) => path)).size, LANDMARK_CATALOG.length);
  // One verb means one thing across the whole game.
  const actions = LANDMARK_CATALOG.flatMap(({ outcomes }) => outcomes.map(({ id }) => id));
  assert.equal(new Set(actions).size, actions.length, 'two landmarks share an action id');
});

test('a road’s event is common on its own road and impossible on every other', () => {
  const floors = 60;
  for (const branch of RUN_BRANCHES) {
    const own = branchEventFor(branch).id;
    const strangers = BRANCH_EVENTS.filter((event) => event.branch !== branch).map(({ id }) => id);
    let mine = 0;
    let landmarkFloors = 0;
    for (let seed = 1; seed <= floors; seed += 1) {
      const level = generateDungeon({ seed, depth: 3 + (seed % 5), branch });
      const landmarks = level.finds.filter((find) => isLandmarkFind(find));
      assert.ok(landmarks.length <= 1, 'never two landmarks on one floor');
      if (landmarks.length === 0) continue;
      landmarkFloors += 1;
      const [landmark] = landmarks;
      assert.equal(
        strangers.includes(landmark.id),
        false,
        `${landmark.id} turned up on ${branch}`,
      );
      if (landmark.id === own) mine += 1;
    }
    assert.ok(landmarkFloors > floors * 0.6, `${branch} placed only ${landmarkFloors} landmarks`);
    const share = mine / landmarkFloors;
    assert.ok(share > 0.35 && share < 0.75, `${branch}: its own event took ${mine} of ${landmarkFloors}`);
  }
});

test('each event ships its picture, its room and a look for that room', () => {
  const loaded = requiredAssetPaths();
  for (const event of BRANCH_EVENTS) {
    assert.ok(existsSync(new URL(event.path, preview)), `${event.path} does not ship`);
    assert.ok(loaded.includes(event.path), `${event.path} is never loaded`);
    assert.ok(event.light?.color && event.light.radius > 0, `${event.id} is unlit and hard to see`);
    // A road's own landmark needs no per-theme skins: the road is the skin.
    assert.equal(event.skins, undefined, `${event.id} carries skins it cannot use`);

    const archetype = roomArchetypeById(roomArchetypeIdForFind(event.id));
    assert.ok(archetype, `${event.id} stands in whatever room it lands in`);
    assert.equal(archetype.content.findId, event.id);
    assert.equal(archetype.weight, 0, 'a landmark room is placed by its landmark, never at random');
    const look = environmentThemeFor(archetype, 'any-theme-at-all');
    const theme = ENVIRONMENT_ROOM_THEMES.find(({ id }) => id === look);
    assert.ok(theme, `${look} is not a room theme`);
    // Nothing decorative in the room may look like the thing you can touch.
    const decor = [...theme.features, ...theme.details].map(({ path }) => path);
    assert.equal(decor.includes(event.path), false, `${event.id} is also scenery in its own room`);
  }
  // Five events, five rooms, five looks: no two roads decorate alike.
  const looks = BRANCH_EVENTS.map((event) => environmentThemeFor(
    roomArchetypeById(roomArchetypeIdForFind(event.id)),
    'any-theme-at-all',
  ));
  assert.equal(new Set(looks).size, BRANCH_EVENTS.length);
});

test('every event is a real bargain in both languages', () => {
  for (const event of BRANCH_EVENTS) {
    assert.ok(event.outcomes.length >= 2, `${event.id} is not a choice`);
    for (let depth = 1; depth <= 18; depth += 1) {
      const rolled = event.outcomes.map(({ id, roll }) => [id, roll(depth, stubRng)]);
      for (const [id, outcome] of rolled) {
        for (const key of Object.keys(outcome)) {
          assert.ok(LANDMARK_OUTCOME_KEYS.includes(key), `${event.id}.${id}.${key} is not an outcome`);
        }
        const gain = (outcome.heal ?? 0) + (outcome.healRatio ?? 0) + (outcome.rewardGold ?? 0)
          + (outcome.rewardPower ?? 0) + (outcome.rewardMaxHp ?? 0) + (outcome.cleanse ? 1 : 0);
        assert.ok(gain > 0, `${event.id}.${id} gives nothing back`);
        if (outcome.status) assert.ok(ACTOR_EFFECT_IDS.includes(outcome.status.id));
      }
      // Gold is not the only way to pay, but there is always an answer for a
      // hero who has none: an empty purse must never close a landmark entirely.
      assert.ok(
        rolled.some(([, outcome]) => (outcome.costGold ?? 0) === 0),
        `${event.id} is shut to a hero with no money at depth ${depth}`,
      );
      assert.ok(
        rolled.some(([, outcome]) => (outcome.costGold ?? 0) + (outcome.damage ?? 0) > 0),
        `${event.id} asks nothing of anyone`,
      );
    }
    for (const language of ['ru', 'en']) {
      const copy = event.copy[language];
      for (const key of ['name', 'summary', 'action', 'inspected', 'unsafe', 'nothingToHeal', 'goldRequired', 'result']) {
        assert.ok(copy[key], `${event.id}.${language}.${key}`);
      }
      assert.ok(copy.summary.length > 40, `${event.id}/${language}: the summary explains nothing`);
      assert.doesNotMatch(copy.inspected, /\d/, `${event.id} spoils numbers before the choice`);
      for (const { id } of event.outcomes) {
        assert.ok(copy.results[id], `${event.id}.${language}.results.${id}`);
      }
    }
    assert.notEqual(event.copy.ru.name, event.copy.en.name);
  }
});

/**
 * «Чтобы адская ветка была сложной, реально» — hell is not the same landmark
 * with bigger numbers. It is the only one in the game that cannot heal anyone,
 * and the catacombs are the only one that will not give you anything for free.
 */
test('hell heals nobody and the catacombs bargain in twos', () => {
  const hell = branchEventFor('hell');
  for (let depth = 1; depth <= 18; depth += 1) {
    for (const { id, roll } of hell.outcomes) {
      const outcome = roll(depth, stubRng);
      assert.equal((outcome.heal ?? 0) + (outcome.healRatio ?? 0), 0, `${id} heals in hell`);
      assert.equal(outcome.cleanse ?? false, false, `${id} cleanses in hell`);
    }
  }
  const crypt = branchEventFor('crypt');
  assert.equal(crypt.outcomes.length, 2, 'the dead offered a middle way');
  const generic = LANDMARK_CATALOG.filter(({ branch }) => !branch);
  assert.ok(generic.every(({ outcomes }) => outcomes.length === 3));
});

test('a road’s event resolves like any other landmark', () => {
  for (const event of BRANCH_EVENTS) {
    const level = (() => {
      for (let seed = 1; seed <= 400; seed += 1) {
        const dungeon = generateDungeon({ seed, depth: 5, branch: event.branch });
        const find = dungeon.finds.find((candidate) => candidate.id === event.id);
        if (find) return find;
      }
      throw new Error(`no ${event.id} on ${event.branch}`);
    })();
    assert.equal(isLandmarkFind(level), true, `${event.id} does not survive generation`);
    const hero = { x: level.x + 1, y: level.y, hp: 400, maxHp: 800, power: 3, effects: {} };
    const actor = { gold: 4000, vitals: { hp: hero.hp, maxHp: hero.maxHp, effects: {} } };
    const rules = landmarkActionRules({ find: level, actor });
    assert.deepEqual(rules.actions.map(({ id }) => id), event.outcomes.map(({ id }) => id));
    for (const { id } of event.outcomes) {
      const result = resolveFindInteraction({
        find: level,
        resolvedFindIds: [],
        runStatus: 'playing',
        hero,
        gold: 4000,
        action: id,
        actor,
      });
      assert.equal(result.ok, true, `${event.id}/${id}: ${result.reason}`);
      assert.ok(result.state.hero.hp >= 1, `${event.id}/${id} is lethal`);
      assert.equal(result.definition.id, event.id);
      assert.deepEqual(result.state.resolvedFindIds, [level.instanceId]);
    }
    assert.equal(findById(event.id).branch, event.branch);
  }
});
