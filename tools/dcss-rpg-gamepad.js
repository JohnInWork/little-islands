/**
 * Два геймпада на один телевизор.
 *
 * Иван: «надо, чтобы мы вдвоём играли в неё на одном телике, вдвоём в одной
 * карте, на геймпадах DualShock 4 и DualSense 5».
 *
 * Второго героя в однопользовательский движок быстро не вставить: камера, ход,
 * бой, рюкзак и смерть — всё написано про одного. Зато в игре уже есть
 * спутник: он ходит по этажу, дерётся, отрисовывается и переживает спуск.
 * Второму игроку не нужен новый герой — ему нужно отобрать у спутника ИИ. Это
 * и есть кооп: один ведёт героя, второй — его напарника, оба на одном этаже и
 * на одном экране.
 *
 * Модуль намеренно ничего не знает ни про игру, ни про DOM. Он отвечает на три
 * вопроса и больше ни на что: куда наклонён стик, какие кнопки нажали **в этом
 * кадре** (а не держат), и кто из подключённых геймпадов чей.
 *
 * Про раскладку. Chrome отдаёт и DualShock 4, и DualSense в «стандартной»
 * раскладке, поэтому номера кнопок совпадают у обоих, и отдельной таблицы под
 * каждую приставку не нужно — нужна одна и проверка, что раскладка стандартная.
 * Если браузер отдал нестандартную (`mapping !== 'standard'`), крестовина и
 * стики всё равно читаются по тем же индексам: у обеих геймпадов они там же.
 */

/** Стандартная раскладка: номер кнопки → что это на коробке PlayStation. */
export const PAD_BUTTONS = Object.freeze({
  cross: 0,
  circle: 1,
  square: 2,
  triangle: 3,
  l1: 4,
  r1: 5,
  l2: 6,
  r2: 7,
  share: 8,
  options: 9,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
});

/**
 * Мёртвая зона стика.
 *
 * У DualSense стики отдают шум до 0.08 даже лёжа на столе, и герой без зоны
 * «шёл бы сам». Четверть хода — граница, за которой наклон точно намеренный.
 */
export const STICK_DEAD_ZONE = 0.35;

/** Как часто повторяется шаг, пока стик держат наклонённым, в секундах. */
export const STEP_REPEAT_SECONDS = 0.16;

const clamp = (value) => (Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0);

/**
 * Куда наклонён стик — одной из четырёх сторон.
 *
 * Игра ходит по клеткам, диагоналей у шага нет, поэтому наклон сводится к
 * стороне: побеждает та ось, которой наклонили сильнее. Крестовина считается
 * тем же стиком — ей пользуются те, кому так привычнее.
 */
export function padDirection(pad, deadZone = STICK_DEAD_ZONE) {
  if (!pad) return null;
  const buttons = pad.buttons ?? [];
  const held = (index) => buttons[index]?.pressed === true;
  if (held(PAD_BUTTONS.up)) return 'up';
  if (held(PAD_BUTTONS.down)) return 'down';
  if (held(PAD_BUTTONS.left)) return 'left';
  if (held(PAD_BUTTONS.right)) return 'right';
  const x = clamp(pad.axes?.[0]);
  const y = clamp(pad.axes?.[1]);
  if (Math.abs(x) < deadZone && Math.abs(y) < deadZone) return null;
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}

/** Набор нажатых сейчас кнопок — по именам, а не по номерам. */
export function padPressed(pad) {
  const buttons = pad?.buttons ?? [];
  const pressed = new Set();
  for (const [name, index] of Object.entries(PAD_BUTTONS)) {
    if (buttons[index]?.pressed === true) pressed.add(name);
  }
  return pressed;
}

/**
 * Кнопки, нажатые именно в этом кадре.
 *
 * Без этого одно нажатие «крестика» открывало бы рюкзак шестьдесят раз в
 * секунду: геймпад отдаёт состояние, а не событие, и удержание неотличимо от
 * нажатия, пока не сравнишь с прошлым кадром.
 */
export function padEdge(previous, current) {
  const fresh = new Set();
  for (const name of current) if (!previous.has(name)) fresh.add(name);
  return fresh;
}

/**
 * Кто чей: первый подключённый геймпад ведёт героя, второй — спутника.
 *
 * Порядок — по индексу в списке браузера, а не по времени подключения: так
 * после переподключения пары ролями они не меняются, и игрок не обнаруживает
 * посреди боя, что водит чужого.
 *
 * `null` на месте означает «этот игрок не подключён», а не «нет геймпадов»:
 * второй игрок может отвалиться, и герой обязан продолжать ходить.
 */
export function assignPads(list) {
  const pads = (Array.isArray(list) ? list : [])
    .filter((pad) => pad && pad.connected !== false);
  return Object.freeze({ hero: pads[0] ?? null, companion: pads[1] ?? null });
}

/** Читаемое имя геймпада для подсказки на экране. */
export function padLabel(pad) {
  if (!pad) return null;
  const id = typeof pad.id === 'string' ? pad.id : '';
  if (/dualsense|0ce6|0df2/i.test(id)) return 'DualSense';
  if (/dualshock|wireless controller|09cc|05c4/i.test(id)) return 'DualShock 4';
  return 'Геймпад';
}

/**
 * Состояние одного игрока за кадр: куда идти и что нажал только что.
 *
 * Повтор шага живёт здесь же, потому что он про ввод, а не про игру: пока стик
 * держат, шаг повторяется через `STEP_REPEAT_SECONDS`, а стоит сменить сторону —
 * шаг идёт сразу, без ожидания. Иначе поворот в бою стоил бы лишних полшага.
 */
export function createPadState() {
  return { pressed: new Set(), direction: null, repeatIn: 0 };
}

export function readPad(state, pad, delta, deadZone = STICK_DEAD_ZONE) {
  const pressed = padPressed(pad);
  const edge = padEdge(state.pressed, pressed);
  state.pressed = pressed;
  const direction = padDirection(pad, deadZone);
  let step = null;
  if (!direction) {
    state.direction = null;
    state.repeatIn = 0;
  } else if (direction !== state.direction) {
    state.direction = direction;
    state.repeatIn = STEP_REPEAT_SECONDS;
    step = direction;
  } else {
    state.repeatIn -= Number.isFinite(delta) ? delta : 0;
    if (state.repeatIn <= 0) {
      state.repeatIn = STEP_REPEAT_SECONDS;
      step = direction;
    }
  }
  return { step, direction, edge };
}
