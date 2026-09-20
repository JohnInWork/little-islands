import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PAD_BUTTONS,
  STEP_REPEAT_SECONDS,
  STICK_DEAD_ZONE,
  assignPads,
  createPadState,
  chooseTarget,
  padDirection,
  padDpadDirection,
  padEdge,
  padLabel,
  padPressed,
  hatDirection,
  padStickDirection,
  readPad,
  stepFor,
} from '../tools/dcss-rpg-gamepad.js';

const pad = ({ axes = [0, 0], held = [], id = 'Wireless Controller', connected = true } = {}) => ({
  id,
  connected,
  axes,
  buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: held.includes(index) })),
});

test('стик читается стороной, а не углом: диагоналей у шага нет', () => {
  assert.equal(padDirection(pad({ axes: [-1, 0] })), 'left');
  assert.equal(padDirection(pad({ axes: [0, 1] })), 'down');
  // Побеждает ось, которой наклонили сильнее.
  assert.equal(padDirection(pad({ axes: [0.9, -0.5] })), 'right');
  assert.equal(padDirection(pad({ axes: [0.5, -0.9] })), 'up');
  // Крестовина — тот же стик для тех, кому так привычнее.
  assert.equal(padDirection(pad({ held: [PAD_BUTTONS.up] })), 'up');
  assert.equal(padDirection(pad({ held: [PAD_BUTTONS.right] })), 'right');
});

test('шум стика не водит героя сам', () => {
  // DualSense отдаёт до 0.08 лёжа на столе.
  assert.equal(padDirection(pad({ axes: [0.08, -0.06] })), null);
  assert.equal(padDirection(pad({ axes: [STICK_DEAD_ZONE - 0.01, 0] })), null);
  assert.equal(padDirection(pad({ axes: [STICK_DEAD_ZONE, 0] })), 'right');
  assert.equal(padDirection(null), null);
});

test('нажатие отличается от удержания', () => {
  const before = padPressed(pad({ held: [PAD_BUTTONS.cross] }));
  const after = padPressed(pad({ held: [PAD_BUTTONS.cross, PAD_BUTTONS.circle] }));
  assert.deepEqual([...padEdge(before, after)], ['circle'], 'крестик держат, круг только что нажали');
  assert.deepEqual([...padEdge(after, after)], [], 'удержание не событие');
});

test('шаг повторяется, пока стик держат, и не ждёт при смене стороны', () => {
  const state = createPadState();
  const right = pad({ axes: [1, 0] });
  assert.equal(readPad(state, right, 0).step, 'right', 'первый шаг сразу');
  assert.equal(readPad(state, right, STEP_REPEAT_SECONDS / 2).step, null, 'слишком рано');
  assert.equal(readPad(state, right, STEP_REPEAT_SECONDS / 2).step, 'right', 'повтор по времени');
  // Поворот в бою не должен стоить лишних полшага.
  assert.equal(readPad(state, pad({ axes: [0, 1] }), 0).step, 'down', 'смена стороны — сразу');
  assert.equal(readPad(state, pad({ axes: [0, 0] }), 0).step, null, 'стик отпустили');
  assert.equal(readPad(state, pad({ axes: [0, 1] }), 0).step, 'down', 'после отпускания снова сразу');
});

test('первый геймпад ведёт героя, второй — спутника, и роли не меняются', () => {
  const one = pad({ id: 'DualSense Wireless Controller' });
  const two = pad({ id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)' });
  const assigned = assignPads([one, two]);
  assert.equal(assigned.hero, one);
  assert.equal(assigned.companion, two);
  // Дырки в списке браузера — норма: он отдаёт слоты, а не подключённых.
  assert.deepEqual(assignPads([null, one, null, two]), { hero: one, companion: two });
  // Второй игрок может отвалиться, герой обязан продолжать ходить.
  assert.deepEqual(assignPads([one]), { hero: one, companion: null });
  assert.deepEqual(assignPads([]), { hero: null, companion: null });
  assert.deepEqual(assignPads(null), { hero: null, companion: null });
  assert.equal(assignPads([pad({ connected: false }), one]).hero, one);
});

test('обе приставки узнаются по имени', () => {
  assert.equal(padLabel(pad({ id: 'DualSense Wireless Controller' })), 'DualSense');
  assert.equal(padLabel(pad({ id: 'Wireless Controller (Vendor: 054c Product: 09cc)' })), 'DualShock 4');
  assert.equal(padLabel(pad({ id: 'Xbox 360 Controller' })), 'Геймпад');
  assert.equal(padLabel(null), null);
});

test('крестовина ходит, стик выбирает — это разные руки', () => {
  const both = pad({ axes: [1, 0], held: [PAD_BUTTONS.up] });
  assert.equal(padDpadDirection(both), 'up', 'крестовина слышит только себя');
  assert.equal(padStickDirection(both), 'right', 'стик слышит только себя');
  // Общий вопрос «куда наклонили» отдаёт крестовину: она точнее.
  assert.equal(padDirection(both), 'up');
  assert.equal(padDpadDirection(pad({ axes: [1, 0] })), null);
  assert.equal(padStickDirection(pad({ held: [PAD_BUTTONS.up] })), null);
});

test('стик выбирает кнопку по стороне, а не по порядку в списке', () => {
  // Расстановка как на экране: рюкзак слева внизу, карта и пауза справа сверху.
  const rects = [
    { id: 'bag', x: 40, y: 600 },
    { id: 'map', x: 900, y: 40 },
    { id: 'pause', x: 900, y: 110 },
    { id: 'spell', x: 900, y: 600 },
  ];
  assert.equal(chooseTarget({ rects, from: 'bag', direction: 'right' }), 'spell', 'вправо — то, что справа');
  assert.equal(chooseTarget({ rects, from: 'spell', direction: 'up' }), 'pause', 'вверх — ближайшее сверху');
  assert.equal(chooseTarget({ rects, from: 'pause', direction: 'up' }), 'map');
  assert.equal(chooseTarget({ rects, from: 'map', direction: 'down' }), 'pause');
  // В пустую сторону выбор не срывается: остаёшься там, где был.
  assert.equal(chooseTarget({ rects, from: 'map', direction: 'up' }), 'map');
  // Без выбора берётся первая, без списка — ничего.
  assert.equal(chooseTarget({ rects, from: null, direction: 'down' }), 'bag');
  assert.equal(chooseTarget({ rects: [], direction: 'down' }), null);
  assert.equal(chooseTarget({ rects, from: 'bag', direction: null }), null);
});

test('кнопка сбоку не крадёт ход вверх', () => {
  // Соседняя по горизонтали стоит чуть выше — но это движение вбок, не вверх.
  const rects = [
    { id: 'here', x: 500, y: 400 },
    { id: 'beside', x: 900, y: 380 },
    { id: 'above', x: 520, y: 100 },
  ];
  assert.equal(chooseTarget({ rects, from: 'here', direction: 'up' }), 'above');
  assert.equal(chooseTarget({ rects, from: 'here', direction: 'right' }), 'beside');
});

test('крестовина, пришедшая осью, читается всеми восемью положениями', () => {
  // Часть DualShock 4 по Bluetooth приходит «нестандартной»: кнопок 12–15 нет
  // вовсе, а крестовина — одна ось. Диагонали сводятся к стороне: шаг по клетке.
  assert.equal(hatDirection(-1), 'up');
  assert.equal(hatDirection(-5 / 7), 'right');
  assert.equal(hatDirection(-3 / 7), 'right');
  assert.equal(hatDirection(-1 / 7), 'down');
  assert.equal(hatDirection(1 / 7), 'down');
  assert.equal(hatDirection(3 / 7), 'left');
  assert.equal(hatDirection(5 / 7), 'left');
  assert.equal(hatDirection(1), 'up');
  // Покой у шляпки лежит вне отрезка, и это не направление.
  assert.equal(hatDirection(3.2857), null);
  assert.equal(hatDirection(undefined), null);
  // Пад без кнопок крестовины всё равно ходит.
  const hatPad = { ...pad(), axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, -1] };
  assert.equal(padDpadDirection(hatPad), 'up');
});

test('зажатая крестовина шлёт шаг по расписанию, а не каждый кадр', () => {
  const state = createPadState();
  const frame = 1 / 60;
  assert.equal(stepFor(state, 'up', frame), 'up', 'первый шаг сразу');
  let sent = 0;
  for (let i = 0; i < 60; i += 1) if (stepFor(state, 'up', frame)) sent += 1;
  // За секунду удержания — единицы шагов, а не шестьдесят: игра ходит по клетке.
  assert.ok(sent >= 4 && sent <= 8, `за секунду ушло ${sent} шагов`);
  assert.equal(stepFor(state, null, frame), null);
  assert.equal(stepFor(state, 'up', frame), 'up', 'после отпускания снова сразу');
});
