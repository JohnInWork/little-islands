/**
 * Что дали нажать — то обязано сработать.
 *
 * Кнопку «Открыть» игра предлагает по королевскому шагу: по диагонали дверь
 * считается соседней. Открывала же дверь по ладейному — сумма по осям, — и на
 * диагонали выходило два вместо одного. Нажатие молча не срабатывало.
 *
 * В городе это било сильнее всего: двери лавок стоят в стене вдоль улицы, и
 * подойти углом — самый естественный путь. Три лавки из четырёх не открывались
 * вовсе, а со стороны игрока это выглядело как «в магазинах не спавнятся
 * торговцы»: дверь есть, кнопка есть, торговца нет.
 *
 * Мера расстояния живёт в двух местах, и тест сторожит, чтобы она осталась
 * одной и той же.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { cellStepDistance } from '../tools/dcss-rpg-geometry.js';

const runtimeUrl = new URL('../tools/dcss.js', import.meta.url);

test('дверь открывается той же мерой, какой предлагается', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  const body = runtime.match(/function beginDoorTransition\([\s\S]*?\n\}/)?.[0];
  assert.ok(body, 'не нашлась функция открытия двери');
  assert.match(body, /cellStepDistance\(/, 'дверь снова меряет расстояние сама по себе');
  // Сумма по осям — это ладейный шаг, из-за которого диагональ не открывалась.
  assert.doesNotMatch(
    body,
    /Math\.abs\([^)]*\)\s*\+\s*\n?\s*Math\.abs\(/,
    'вернулась сумма по осям вместо королевского шага',
  );

  // И та же мера у самого предложения взаимодействия.
  const reach = runtime.match(/const open = run\.floor\.opened\.includes\(entry\.value\.instanceId\);[\s\S]{0,120}/)?.[0];
  assert.ok(reach, 'не нашлось правило досягаемости двери');
  assert.match(reach, /distance <= 1 : distance === 1/);
});

test('диагональ — соседняя клетка, и по ней дверь достаётся', () => {
  const дверь = { x: 27, y: 15 };
  // Ровно тот случай из города: герой у угла лавки.
  assert.equal(cellStepDistance({ x: 26, y: 16 }, дверь), 1);
  assert.equal(cellStepDistance({ x: 27, y: 16 }, дверь), 1);
  // А через клетку — уже не достать, и это правильно.
  assert.equal(cellStepDistance({ x: 25, y: 16 }, дверь), 2);
});
