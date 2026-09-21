import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { SOUND_SAMPLES, heroVoiceSound } from '../tools/dcss-rpg-audio.js';

const adapterUrl = new URL('../tools/dcss.js', import.meta.url);

/**
 * Звук, которого нет в каталоге, — это тишина без единой жалобы.
 *
 * `playSound` на неизвестное имя молча возвращает `false`. Так и вышло: монеты
 * звали `coins`, а сэмпл называется `gold`; падение в пропасть звало `hurt`,
 * а стон героя лежит под `hero-hurt`. Ни ошибки в консоли, ни красного теста —
 * просто ничего не слышно, и заметить это можно только ушами.
 */
test('каждый звук, который зовёт игра, есть в каталоге', async () => {
  const runtime = await readFile(adapterUrl, 'utf8');
  const зовут = [...new Set([...runtime.matchAll(/playSound\('([a-z0-9-]+)'/g)].map((m) => m[1]))];
  assert.ok(зовут.length > 15, `нашлось всего ${зовут.length} вызовов — разбор сломался`);
  const нет = зовут.filter((id) => !Object.hasOwn(SOUND_SAMPLES, id));
  assert.deepEqual(нет, [], `зовут несуществующие сэмплы: ${нет.join(', ')}`);
});

test('голос героя разложен на оба пола и оба имени есть в каталоге', () => {
  for (const id of ['hero-hurt', 'death']) {
    for (const voice of ['m', 'f']) {
      const sample = heroVoiceSound(id, voice);
      assert.ok(Object.hasOwn(SOUND_SAMPLES, sample), `${id}/${voice} → ${sample} нет в каталоге`);
    }
  }
});

/**
 * Охота звучит так же, как бой: бьют тем же оружием.
 *
 * У зверя было всё, кроме звука, — вспышка, волна, число урона, кровь. Иван
 * сказал прямо: «когда я охотился, звука не было, атаки, урона».
 */
test('удар по зверю звучит так же, как удар по монстру', async () => {
  const runtime = await readFile(adapterUrl, 'utf8');
  const удар = /playSound\(projectile \? 'hit-projectile' : style === 'heavy' \? 'hit-heavy' : 'hit-blade'\);/g;
  const сколько = [...runtime.matchAll(удар)].length;
  assert.equal(сколько, 2, 'строка удара должна стоять и у монстра, и у зверя');

  const зверь = runtime.slice(runtime.indexOf('function damageWildlife('));
  const тело = зверь.slice(0, зверь.indexOf('\n}\n'));
  assert.match(тело, /playSound\(projectile \?/, 'удар по зверю снова молчит');
  assert.match(тело, /if \(lethal\) playSound\('kill'\);/, 'добитый зверь обязан звучать');
});

/**
 * Перемещение без шагов.
 *
 * Портал, домашний камень и падение в провал звучали шагом по каменной
 * лестнице — единственным звуком перехода, который был в игре. Иван: «когда я
 * призвал портал, звук шагов почему-то был». Шаг честен для лестницы и только
 * для неё; всё, что переносит героя иначе, звучит иначе.
 */
test('шаг остаётся лестнице, а перенос звучит своим звуком', async () => {
  const { SOUND_SAMPLES } = await import('../tools/dcss-rpg-audio.js');
  assert.ok(SOUND_SAMPLES.portal, 'переносу нечем звучать');

  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const звук = (имя) => {
    const начало = runtime.indexOf(`function ${имя}(`);
    assert.ok(начало > 0, `нет функции ${имя}`);
    const тело = runtime.slice(начало, runtime.indexOf('\n}\n', начало));
    return [...тело.matchAll(/playSound\('([a-z-]+)'/g)].map(([, id]) => id);
  };
  // Портал — в обе стороны, и домашний камень вместе с ним.
  assert.ok(звук('stepThroughPortal').includes('portal'), 'шаг сквозь портал звучит шагом');
  assert.equal(звук('stepThroughPortal').includes('descend'), false);
  // А лестница остаётся лестницей.
  assert.ok(звук('descendFloor').includes('descend'), 'спуск потерял свой звук');
  assert.ok(звук('climbFloor').includes('descend'), 'подъём потерял свой звук');
});
