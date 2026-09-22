import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  SHOWREEL_FADE_SECONDS,
  SHOWREEL_SCENES,
  SHOWREEL_SCENE_SECONDS,
  showreelCameraAt,
  showreelCameraPath,
  showreelFrame,
} from '../tools/dcss-rpg-menu-showreel.js';
import { RUN_BRANCHES } from '../tools/dcss-rpg-content.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';

/**
 * За меню показывают разное, а не один и тот же первый этаж.
 *
 * Иван: «на фоне я хочу, чтобы были подземелья вот наши и чтобы там по ним
 * как-нибудь клёво камера летала, а потом оно сменяется на другое подземелье».
 * Пять видов — это обещание игры: за меню видно, куда игрок пойдёт.
 */
test('виды за меню — разные места, и все они существуют', () => {
  assert.ok(SHOWREEL_SCENES.length >= 4, 'показывать нечего');
  const дороги = new Set(SHOWREEL_SCENES.map(({ branch }) => branch));
  assert.ok(дороги.size >= 4, `дорог всего ${дороги.size}`);
  const виды = new Set();
  for (const scene of SHOWREEL_SCENES) {
    assert.ok(RUN_BRANCHES.includes(scene.branch), `${scene.id}: нет такой дороги`);
    const dungeon = generateDungeon({ seed: scene.seed, depth: scene.depth, branch: scene.branch });
    assert.ok(dungeon.grid.length > 0);
    виды.add(dungeon.themeId);
  }
  assert.equal(виды.size, SHOWREEL_SCENES.length, `два вида показывают одно место: ${[...виды]}`);
});

/**
 * Смена прячется в темноте.
 *
 * Собрать новый этаж — работа на кадр-два, и на телефоне это видно. Поэтому
 * свет уходит до смены и возвращается уже на новом месте, а сама смена
 * приходится ровно на самый тёмный кадр.
 */
test('свет уходит до смены вида и возвращается после', () => {
  const длина = SHOWREEL_SCENE_SECONDS;
  assert.equal(showreelFrame(0).fade, 1, 'первый кадр отрезка не тёмный');
  assert.equal(showreelFrame(длина / 2).fade, 0, 'середина вида затемнена');
  assert.ok(showreelFrame(длина - 0.01).fade > 0.9, 'к смене не потемнело');
  assert.equal(showreelFrame(SHOWREEL_FADE_SECONDS).fade, 0);
  // Номер отрезка меняется там же, где темнота полная: строить новый этаж
  // безопасно ровно на этом кадре.
  assert.equal(showreelFrame(длина - 0.01).turn, 0);
  assert.equal(showreelFrame(длина + 0.01).turn, 1);
  // И порядок идёт по кругу, а не упирается в последний.
  assert.equal(showreelFrame(длина * SHOWREEL_SCENES.length + 1).index, 0);
  assert.throws(() => showreelFrame(-1), /elapsed/);
});

/**
 * Камера летит по этажу, а не по карте.
 *
 * Крайние проходимые клетки, а не углы сетки: за стенами смотреть не на что, и
 * камера, упёршаяся в чёрный край, выглядит поломкой. Соседние виды летят
 * разными диагоналями — иначе движение читается как одно и то же.
 */
test('путь камеры остаётся внутри этажа и не повторяется подряд', () => {
  const bounds = { minX: 4, maxX: 30, minY: 2, maxY: 22 };
  const пути = [0, 1, 2, 3].map((turn) => showreelCameraPath(bounds, turn));
  for (const { from, to } of пути) {
    for (const точка of [from, to]) {
      assert.ok(точка.x > bounds.minX && точка.x < bounds.maxX, `камера вышла за этаж по x: ${точка.x}`);
      assert.ok(точка.y > bounds.minY && точка.y < bounds.maxY, `камера вышла за этаж по y: ${точка.y}`);
    }
  }
  const направления = new Set(пути.map(({ from, to }) => `${Math.sign(to.x - from.x)}:${Math.sign(to.y - from.y)}`));
  assert.equal(направления.size, 4, 'все виды летят одинаково');
  // Начало и конец — это и есть концы пути, а середина посередине.
  const путь = пути[0];
  assert.deepEqual({ ...showreelCameraAt(путь, 0) }, { ...путь.from });
  assert.deepEqual({ ...showreelCameraAt(путь, 1) }, { ...путь.to });
  const середина = showreelCameraAt(путь, 0.5);
  assert.ok(Math.abs(середина.x - (путь.from.x + путь.to.x) / 2) < 0.001);
  // Плавно: первый шаг короче среднего, иначе на пиксельной картинке видно рывок.
  const шаг = (a, b) => Math.hypot(showreelCameraAt(путь, b).x - showreelCameraAt(путь, a).x, 0);
  assert.ok(шаг(0, 0.05) < шаг(0.475, 0.525), 'камера трогается рывком');
});

/** Показ живёт только в главном меню и отдаёт этаж обратно, когда уходит. */
test('показ занимает картинку только в меню и возвращает этаж забега', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /const showreelActive = \(\) => uiScreen === 'menu' && menuMode !== 'pause' && ready;/);
  // Пауза — не показ: место, где игрок стоит, из-под него не подменяют.
  assert.match(runtime, /function returnBorrowedFloor\(\)[\s\S]{0,400}replaceFloor\(run\.depth, \{ x: run\.hero\.x, y: run\.hero\.y \}\)/);
  // Возврат стоит на всех выходах из меню: и «Продолжить», и создание героя.
  const продолжить = runtime.slice(runtime.indexOf('function startGameFromMenu('));
  assert.match(продолжить.slice(0, продолжить.indexOf('\n}')), /returnBorrowedFloor\(\);/);
  const создание = runtime.slice(runtime.indexOf('function openCharacterCreation('));
  assert.match(создание.slice(0, создание.indexOf('\n}')), /returnBorrowedFloor\(\);/);
});
