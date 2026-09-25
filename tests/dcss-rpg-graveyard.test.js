import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXPECTED_LEVEL,
  GRAVEYARD_BRANCH,
  GRAVEYARD_CHANCE,
  SPOKEN_LESSONS,
  ghostLessons,
  ghostSpeech,
  graveyardCopy,
  graveyardOnFloor,
  graveyardWakes,
  killerCreature,
  killerKind,
} from '../tools/dcss-rpg-graveyard.js';

const grave = (source = {}) => ({
  version: 1,
  depth: 7,
  x: 4,
  y: 4,
  level: 8,
  killerId: 'orc-warrior',
  at: '2026-09-20',
  seed: 11,
  appearance: { bodyId: null, hairId: null },
  gear: [
    { slot: 'hand1', id: 'rusty-sword', materialId: null, affixIds: [] },
    { slot: 'body', id: 'worn-shirt', materialId: null, affixIds: [] },
    { slot: 'hand2', id: 'wood-buckler', materialId: null, affixIds: [] },
  ],
  ...source,
});

const ids = (bones, language) => ghostLessons({ bones, language }).map((lesson) => lesson.id);

test('кладбище есть только в катакомбах и только когда есть кого хоронить', () => {
  const bones = [grave()];
  const depth = Array.from({ length: 40 }, (_, index) => index + 1)
    .find((value) => graveyardWakes({ seed: 3, depth: value }));
  assert.ok(depth, 'ни один этаж не поднял кладбище — проверь шанс');

  assert.equal(graveyardOnFloor({ branch: GRAVEYARD_BRANCH, seed: 3, depth, bones }), bones[0]);
  for (const branch of ['deep', 'surface', 'vaults', 'hell']) {
    assert.equal(graveyardOnFloor({ branch, seed: 3, depth, bones }), null, branch);
  }
  // Иван выбрал именно это из трёх вариантов: без смерти места нет вовсе.
  assert.equal(graveyardOnFloor({ branch: GRAVEYARD_BRANCH, seed: 3, depth, bones: [] }), null);
  assert.equal(graveyardOnFloor({ branch: GRAVEYARD_BRANCH, seed: 3, depth }), null);
});

test('один и тот же этаж отвечает одинаково, а редкость держится около заданной', () => {
  for (const seed of [0, 1, 999, 4294967295]) {
    for (const depth of [1, 9, 18]) {
      assert.equal(graveyardWakes({ seed, depth }), graveyardWakes({ seed, depth }));
    }
  }
  let wakes = 0;
  const floors = 9;
  const runs = 4000;
  for (let seed = 0; seed < runs; seed += 1) {
    for (let depth = 1; depth <= floors; depth += 1) if (graveyardWakes({ seed, depth })) wakes += 1;
  }
  const share = wakes / (runs * floors);
  assert.ok(
    Math.abs(share - GRAVEYARD_CHANCE) < 0.02,
    `кладбище поднимается на ${(share * 100).toFixed(1)}% этажей вместо ${GRAVEYARD_CHANCE * 100}%`,
  );
  assert.equal(graveyardWakes({ seed: Number.NaN, depth: 3 }), false);
});

test('причина смерти разбирается по своей строке, а не угадывается', () => {
  assert.deepEqual(killerKind('wolf'), { kind: 'monster', id: 'wolf' });
  assert.deepEqual(killerKind('wolf@rabid'), { kind: 'monster', id: 'wolf' });
  assert.deepEqual(killerKind('wildlife:hell-hog'), { kind: 'wildlife', id: 'hell-hog' });
  assert.deepEqual(killerKind('trap:blade-trap'), { kind: 'trap', id: 'blade-trap' });
  assert.deepEqual(killerKind('spell:storm'), { kind: 'own-spell', id: 'storm' });
  assert.deepEqual(killerKind('potion:venom'), { kind: 'poison', id: 'venom' });
  assert.deepEqual(killerKind('hunger'), { kind: 'hunger', id: 'hunger' });
  assert.deepEqual(killerKind('chasm'), { kind: 'chasm', id: 'chasm' });
  assert.deepEqual(killerKind('equipment'), { kind: 'gear', id: 'equipment' });
  assert.deepEqual(killerKind(null), { kind: 'unknown', id: null });

  assert.equal(killerCreature('orc-warrior')?.id, 'orc-warrior');
  assert.equal(killerCreature('wildlife:hell-hog')?.id, 'hell-hog');
  assert.equal(killerCreature('hunger'), null);
  assert.equal(killerCreature('trap:blade-trap'), null);
});

test('совет опирается только на то, что есть в записи', () => {
  // Полностью снаряжённый герой по уровню этажа: про снаряжение сказать нечего.
  const ready = ids(grave({ level: EXPECTED_LEVEL(7) }));
  assert.ok(!ready.includes('noArmour'), ready.join(','));
  assert.ok(!ready.includes('noShield'), ready.join(','));
  assert.ok(!ready.includes('bareHanded'), ready.join(','));
  assert.ok(!ready.includes('underlevelled'), ready.join(','));

  const bare = ids(grave({ gear: [], level: 2 }));
  assert.deepEqual(
    bare.filter((id) => ['noArmour', 'noShield', 'bareHanded', 'underlevelled'].includes(id)),
    ['underlevelled', 'noArmour', 'bareHanded'],
  );
  // Щит упоминается только тогда, когда броня есть, а вторая рука пуста:
  // «надень щит» поверх «надень хоть что-нибудь» — это не совет, а шум.
  const armoured = ids(grave({
    gear: [{ slot: 'body', id: 'worn-shirt', materialId: null, affixIds: [] }],
  }));
  assert.ok(armoured.includes('noShield'));
  assert.ok(!armoured.includes('noArmour'));
});

test('повадки убийцы попадают в совет только если они у него правда есть', () => {
  const speedy = killerCreature('wolf');
  assert.ok(speedy, 'волка нет в каталоге');
  const wolf = ids(grave({ killerId: 'wolf' }));
  assert.equal(wolf.includes('swift'), (speedy.speed ?? 1) >= 1.3);
  assert.equal(wolf.includes('flying'), Boolean(speedy.flying));
  assert.equal(wolf.includes('element'), Boolean(speedy.element));

  // Голод, пропасть и ловушка — не существа, и повадок у них нет никаких.
  for (const killerId of ['hunger', 'chasm', 'trap:blade-trap', 'spell:storm']) {
    const lessons = ids(grave({ killerId }));
    assert.ok(!lessons.includes('killer'), killerId);
    assert.ok(!lessons.some((id) => ['element', 'flying', 'large', 'swift'].includes(id)), killerId);
  }
  assert.ok(ids(grave({ killerId: 'hunger' })).includes('hunger'));
  assert.ok(ids(grave({ killerId: 'chasm' })).includes('chasm'));
});

test('призрак произносит начало списка, а не весь список', () => {
  const bones = grave({ killerId: 'wolf', gear: [], level: 1 });
  const all = ghostLessons({ bones });
  const speech = ghostSpeech({ bones });
  assert.ok(all.length > SPOKEN_LESSONS, `уроков всего ${all.length}`);
  assert.equal(speech.lessons.length, SPOKEN_LESSONS);
  assert.deepEqual(speech.lessons, all.slice(0, SPOKEN_LESSONS).map(({ text }) => text));
  assert.match(speech.where, /7/);
  assert.ok(speech.parting.length > 0);
  assert.equal(ghostSpeech({ bones: null }), null);
});

test('оба языка говорят об одном и том же', () => {
  const bones = grave({ killerId: 'wolf', gear: [], level: 1 });
  assert.deepEqual(ids(bones, 'ru'), ids(bones, 'en'));
  for (const language of ['ru', 'en']) {
    const speech = ghostSpeech({ bones, language });
    assert.equal(speech.lessons.length, SPOKEN_LESSONS);
    for (const line of [...speech.lessons, speech.where, speech.parting]) {
      assert.equal(typeof line, 'string');
      assert.ok(line.length > 0);
      assert.doesNotMatch(line, /undefined|\[object/);
    }
  }
  assert.deepEqual(Object.keys(graveyardCopy('ru')), Object.keys(graveyardCopy('en')));
});

/**
 * Призрак не только говорит — он ещё и стоит на кладбище.
 *
 * Правила речи были написаны и покрыты тестами задолго до того, как призрака
 * посадили в мир: слова есть, а сказать их некому. Эти два теста сторожат
 * вторую половину — что он появляется там и только там, где есть кладбище, и
 * что разговор с ним идёт через общий реестр, а не через отдельную ветку.
 */
test('реестр показывает призрака одним действием и его же словами', async () => {
  const { contextActionModel } = await import('../tools/dcss-rpg-context-actions.js');
  const copy = graveyardCopy('ru');
  const model = contextActionModel({
    target: {
      kind: 'graveyard-ghost',
      name: copy.name,
      summary: copy.summary,
      action: copy.action,
      icon: 'mon/undead/ghost.png',
    },
    language: 'ru',
  });
  assert.equal(model.interactionId, 'graveyard-ghost');
  assert.equal(model.name, copy.name);
  assert.equal(model.description, copy.summary);
  // Одно действие и никакого выбора: коснулся — он рассказал.
  assert.deepEqual(model.actions.map(({ id }) => id), ['speak']);
  assert.equal(model.actions[0].label, copy.action);
  assert.equal(model.actions[0].command, 'ghost-speak');
  // Разговор ничего не отнимает, но карточку призрак всё равно показывает:
  // одним касанием теперь только подбирают вещи с пола.
  assert.equal(model.instant, false);
});

test('рантайм сажает призрака на кладбище и не ставит там второго, злого', async () => {
  const { readFile } = await import('node:fs/promises');
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const body = runtime.match(/function placeGraveyardGhost\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(body, 'не нашлась посадка кладбищенского призрака');
  // Комната берётся та самая, что выбрали правила кладбища.
  assert.match(body, /activeGraveyardRoom/);
  assert.match(body, /activeGraveyardBones/);
  // Он мирный и помечен, чтобы его ни с кем не спутали.
  assert.match(body, /ghost\.neutral = true;/);
  assert.match(body, /ghost\.graveyardGhost = true;/);
  // Повторный вызов на том же этаже не оставляет двух призраков.
  assert.match(body, /monsters\.filter\(\(monster\) => !monster\.graveyardGhost\)/);

  // А сторож костей на кладбищенском этаже не появляется вовсе.
  const hostile = runtime.match(/function placeFloorGhost\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(hostile, 'не нашлась посадка призрака-сторожа');
  assert.match(hostile, /if \(activeGraveyardBones\) return;/);

  // Ударить кладбищенского можно, но драки не будет.
  assert.match(runtime, /if \(monster\.graveyardGhost\) monster\.provoked = false;/);
});
