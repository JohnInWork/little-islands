import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PAD_BUTTONS,
  STEP_REPEAT_SECONDS,
  STICK_DEAD_ZONE,
  assignPads,
  createPadState,
  padDirection,
  padEdge,
  padLabel,
  padPressed,
  readPad,
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
