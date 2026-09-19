import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

import {
  AMBIENT_DELAY,
  AMBIENT_NEEDS,
  AMBIENT_SCENES,
  AMBIENT_SCENE_IDS,
  AMBIENT_SIGHT_CHANCE,
  AMBIENT_SOUND_CHANCE,
  allAmbientAssetPaths,
  ambientActors,
  ambientLightScale,
  ambientLine,
  ambientPhaseAt,
  ambientSceneById,
  ambientSceneDuration,
  ambientSeenModel,
  ambientSmokeScale,
  rememberAmbientScene,
  scheduleAmbientScene,
  validateAmbientSeen,
} from '../tools/dcss-rpg-ambient.js';

const preview = new URL('../public/assets/dcss-preview/', import.meta.url);

test('every scene is complete, named in both languages and drawn from files that ship', () => {
  assert.equal(AMBIENT_SCENES.length, 12);
  assert.equal(new Set(AMBIENT_SCENE_IDS).size, AMBIENT_SCENES.length);
  for (const entry of AMBIENT_SCENES) {
    assert.ok(['sight', 'sound'].includes(entry.kind), `${entry.id}: neither seen nor heard`);
    assert.ok(AMBIENT_NEEDS.includes(entry.needs), `${entry.id}: unknown precondition ${entry.needs}`);
    assert.match(entry.colour, /^#[0-9a-f]{6}$/, `${entry.id}: no colour of its own`);
    assert.ok(entry.sound, `${entry.id} arrives silently — the ear is what makes the player look up`);
    assert.ok(entry.phases.length > 0);
    for (const phase of entry.phases) assert.ok(phase.seconds > 0, `${entry.id}/${phase.id}`);
    // Long enough to notice, short enough that nobody stands waiting for the end.
    const seconds = ambientSceneDuration(entry.id);
    assert.ok(seconds >= 2.5 && seconds <= 12, `${entry.id} runs ${seconds}s`);
    for (const language of ['ru', 'en']) {
      assert.ok(ambientLine(entry.id, language).length > 6, `${entry.id}: no ${language} line`);
    }
    assert.notEqual(ambientLine(entry.id, 'ru'), ambientLine(entry.id, 'en'), `${entry.id} was never translated`);
    for (const path of entry.sprites) {
      assert.ok(existsSync(new URL(path, preview)), `${entry.id}: ${path} does not ship`);
    }
  }
  assert.ok(allAmbientAssetPaths().length > 0);
  assert.equal(new Set(allAmbientAssetPaths()).size, allAmbientAssetPaths().length, 'no path fetched twice');
});

/**
 * The whole point is rarity. Measured rather than asserted from the constants,
 * because the thing that matters is how often a player actually meets one — and
 * because a future edit to the roll should have to look at this number.
 */
test('five floors in six show nothing at all, and no floor shows two things', () => {
  let floors = 0;
  let scenes = 0;
  const runs = [];
  for (let seed = 0; seed < 2000; seed += 1) {
    let perRun = 0;
    for (let depth = 1; depth <= 18; depth += 1) {
      floors += 1;
      const rolled = scheduleAmbientScene({ seed, depth, possible: AMBIENT_SCENE_IDS });
      if (!rolled) continue;
      scenes += 1;
      perRun += 1;
      assert.ok(ambientSceneById(rolled.id), `${rolled.id} is not in the catalogue`);
      assert.ok(rolled.at >= AMBIENT_DELAY.min && rolled.at <= AMBIENT_DELAY.max, 'never at the stairs');
    }
    runs.push(perRun);
  }
  const share = scenes / floors;
  assert.ok(share > 0.12 && share < 0.2, `${(share * 100).toFixed(1)}% of floors — meant to be about one in six`);
  assert.ok(share < AMBIENT_SIGHT_CHANCE + AMBIENT_SOUND_CHANCE, 'the two rolls are not independent tickets');
  const average = runs.reduce((total, count) => total + count, 0) / runs.length;
  assert.ok(average > 2 && average < 4, `${average.toFixed(2)} scenes per run`);
});

test('the same floor always stages the same scene, and an impossible one is never promised', () => {
  const first = scheduleAmbientScene({ seed: 4242, depth: 7, possible: AMBIENT_SCENE_IDS });
  const again = scheduleAmbientScene({ seed: 4242, depth: 7, possible: AMBIENT_SCENE_IDS });
  assert.deepEqual(first, again, 'a rebuilt floor must not change its mind');

  // A floor where nothing burns never promises a draught.
  for (let seed = 0; seed < 400; seed += 1) {
    const rolled = scheduleAmbientScene({ seed, depth: 3, possible: ['ghost', 'scream'] });
    if (rolled) assert.ok(['ghost', 'scream'].includes(rolled.id), rolled.id);
  }
  assert.equal(scheduleAmbientScene({ seed: 1, depth: 1, possible: [] }), null);
  assert.equal(scheduleAmbientScene({ seed: Number.NaN, depth: 1, possible: AMBIENT_SCENE_IDS }), null);

  // With only sights on offer the ear still gets its turn at nothing, not at a sight.
  let sounds = 0;
  for (let seed = 0; seed < 600; seed += 1) {
    if (scheduleAmbientScene({ seed, depth: 2, possible: ['scream'] })) sounds += 1;
  }
  assert.ok(sounds > 0 && sounds < 600 * 0.12, 'a lone sound scene keeps its own rarity');
});

test('nothing pops into view: every actor fades in, stays inside its box and fades out', () => {
  for (const entry of AMBIENT_SCENES.filter(({ kind }) => kind === 'sight')) {
    const seconds = ambientSceneDuration(entry.id);
    let sawSomebody = false;
    for (let step = 0; step <= 60; step += 1) {
      const elapsed = (step / 60) * seconds * 0.999;
      for (const actor of ambientActors(entry.id, elapsed, 3)) {
        sawSomebody = true;
        assert.ok(actor.opacity >= 0 && actor.opacity <= 1, `${entry.id}/${actor.key}: opacity ${actor.opacity}`);
        assert.ok(Number.isFinite(actor.u) && Number.isFinite(actor.v), `${entry.id}/${actor.key}: nowhere`);
        assert.ok(actor.v > -0.4 && actor.v < 1.4, `${entry.id}/${actor.key}: v ${actor.v} is out of the room`);
        assert.ok(actor.spark === true || typeof actor.sprite === 'string', `${entry.id}/${actor.key}: nothing to draw`);
      }
    }
    // The draught and the cave-in are things that happen to the room, not people
    // in it; everything else has to put somebody on screen.
    if (!['draught', 'cave-in', 'far-door'].includes(entry.id)) {
      assert.ok(sawSomebody, `${entry.id} stages nobody`);
      const opening = ambientActors(entry.id, 0.001, 3);
      const closing = ambientActors(entry.id, seconds * 0.999, 3);
      for (const actor of [...opening, ...closing]) {
        assert.ok(actor.opacity < 0.55, `${entry.id}/${actor.key} snaps in or out at ${actor.opacity}`);
      }
    }
  }
  assert.equal(ambientPhaseAt('ghost', -1), null);
  assert.equal(ambientPhaseAt('ghost', 999), null, 'a finished scene is over');
  assert.deepEqual(ambientActors('nothing-like-this', 1), []);
});

test('the draught takes the light all the way down, smokes, and gives it back', () => {
  const seconds = ambientSceneDuration('draught');
  const trace = [];
  for (let step = 0; step <= 80; step += 1) {
    const elapsed = (step / 80) * seconds * 0.999;
    trace.push({
      phase: ambientPhaseAt('draught', elapsed).id,
      light: ambientLightScale('draught', elapsed),
      smoke: ambientSmokeScale('draught', elapsed),
    });
  }
  assert.ok(trace.every(({ light }) => light >= 0 && light <= 1));
  assert.equal(Math.min(...trace.map(({ light }) => light)), 0, 'the room does go dark');
  assert.ok(trace.at(0).light > 0.9 && trace.at(-1).light > 0.9, 'and the fire comes back');

  // The beat Ivan asked for: while it is dark, the wicks are still smoking.
  const dark = trace.filter(({ phase }) => phase === 'smoke');
  assert.ok(dark.length > 0);
  assert.ok(dark.every(({ light }) => light === 0), 'smoke is the dark part');
  assert.ok(dark.every(({ smoke }) => smoke > 0.2), 'and it is never a dark room with nothing in it');
  assert.ok(dark.at(0).smoke > dark.at(-1).smoke, 'the smoke thins out before the fire returns');

  // Nobody else touches the lights.
  for (const entry of AMBIENT_SCENES.filter(({ id }) => id !== 'draught')) {
    assert.equal(ambientLightScale(entry.id, 1), 1, entry.id);
    assert.equal(ambientSmokeScale(entry.id, 1), 0, entry.id);
  }
});

test('what the player has seen is kept in catalogue order and shown as a collection', () => {
  assert.equal(validateAmbientSeen([]), true);
  assert.equal(validateAmbientSeen(['ghost', 'ghost']), false);
  assert.equal(validateAmbientSeen(['something-else']), false);
  assert.equal(validateAmbientSeen('ghost'), false);

  let seen = rememberAmbientScene([], 'drip');
  seen = rememberAmbientScene(seen, 'ghost');
  seen = rememberAmbientScene(seen, 'ghost');
  assert.deepEqual(seen, ['ghost', 'drip'], 'catalogue order, and no duplicates');
  assert.deepEqual(rememberAmbientScene(seen, 'not-a-scene'), seen);

  const model = ambientSeenModel(seen, 'ru');
  assert.equal(model.progress, '2 из 12');
  assert.equal(model.entries.length, 12);
  assert.equal(model.entries.filter(({ seen: known }) => known).length, 2);
  // Unseen scenes say only that they exist.
  const hidden = model.entries.find(({ id }) => id === 'bats');
  assert.equal(hidden.seen, false);
  assert.equal(hidden.text, 'Ещё не видел');
  assert.equal(ambientSeenModel([], 'en').progress, '0 of 12');
  assert.ok(ambientSeenModel([], 'en').empty.length > 0);
  assert.equal(ambientSeenModel(seen, 'en').empty, '');
});
