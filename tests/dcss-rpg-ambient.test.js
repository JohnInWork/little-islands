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

/**
 * Мыслящий против зверя — и никак иначе.
 *
 * Стороны были одной кучей спрайтов, из которой брались двое подряд, и в дуэли
 * уникальный торговец добивал кобольда. Иван: «я бы хотел заложить правило, что
 * какой-то гуманоид, мыслящий — огр, орк, наёмник — против какого-то животного:
 * против волка, против вепря и так далее».
 *
 * Правило проверяется по спискам, а не по картинкам: победитель обязан приходить
 * из `sprites`, проигравший — из `quarry`, и перепутать их нельзя, потому что
 * пересечения у списков нет.
 */
test('в драке побеждает мыслящий, а падает зверь', async () => {
  const { AMBIENT_SCENES, ambientActors } = await import('../tools/dcss-rpg-ambient.js');
  for (const id of ['duel', 'brawl']) {
    const сцена = AMBIENT_SCENES.find((entry) => entry.id === id);
    assert.ok(сцена.sprites.length >= 3, `${id}: мыслящих меньше трёх`);
    assert.ok(сцена.quarry.length >= 3, `${id}: зверей меньше трёх`);
    const пересечение = сцена.sprites.filter((path) => сцена.quarry.includes(path));
    assert.deepEqual(пересечение, [], `${id}: кто-то и мыслящий, и зверь`);

    const пары = new Set();
    for (let variant = 0; variant < 24; variant += 1) {
      const actors = ambientActors(id, 1, variant);
      const winner = actors.find(({ key }) => key === 'winner');
      const loser = actors.find(({ key }) => key === 'loser');
      assert.ok(сцена.sprites.includes(winner.sprite), `${id}: победил не мыслящий`);
      assert.ok(сцена.quarry.includes(loser.sprite), `${id}: пал не зверь`);
      пары.add(`${winner.sprite}|${loser.sprite}`);
    }
    // Все сочетания, а не три: иначе игрок увидит одну и ту же драку.
    assert.equal(пары.size, сцена.sprites.length * сцена.quarry.length, `${id}: пары ходят парами`);
  }
});

/**
 * Уходящий шагает, а не скользит.
 *
 * Высота была постоянной, и победитель уезжал вбок, как картинка по стеклу.
 * Иван: «мне не нравится анимация, как уходит монстр, она не такая, как обычно
 * у NPC в игре, это даже кажется каким-то багом».
 */
test('победитель уходит шагом и гаснет у края света', async () => {
  const { AMBIENT_SCENES, ambientActors } = await import('../tools/dcss-rpg-ambient.js');
  const сцена = AMBIENT_SCENES.find(({ id }) => id === 'duel');
  const начало = сцена.phases[0].seconds + сцена.phases[1].seconds;
  const высоты = [];
  const прозрачность = [];
  // Семнадцать точек, а не двенадцать: ровное число попадает ровно на гребни
  // шага, и высота выглядит постоянной там, где она качается.
  const шаг = сцена.phases[2].seconds / 17;
  for (let i = 0; i < 17; i += 1) {
    const winner = ambientActors('duel', начало + i * шаг, 0).find(({ key }) => key === 'winner');
    высоты.push(Number(winner.lift.toFixed(3)));
    прозрачность.push(winner.opacity);
  }
  assert.ok(new Set(высоты).size > 4, 'уходящий скользит на постоянной высоте');
  assert.ok(Math.max(...высоты) > Math.min(...высоты) + 1.5, 'шаг не заметен');
  // Гаснет он в конце, а не посреди комнаты.
  assert.equal(прозрачность[0], 1, 'начал таять сразу же');
  assert.ok(прозрачность[11] > 0.9, 'растаял посреди освещённого пятна');
  assert.ok(прозрачность.at(-1) < 0.35, 'так и не ушёл');
});
