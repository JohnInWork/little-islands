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
 * Крестовина и стик делают разное, и это главное решение раскладки.
 *
 * Иван: «кнопок в игре мало — он только ходит и кастует; сделать игру чисто на
 * крестовине, а на стике — выбор окна, которое он хочет нажать, и нижней правой
 * кнопкой открывает». Так и есть: ходьба — это шаг по клетке, ей нужна
 * крестовина с её щелчком, а стик освобождается под то, чего в игре с тремя
 * кнопками всегда не хватает, — под сам интерфейс.
 */
export function padDpadDirection(pad) {
  const buttons = pad?.buttons ?? [];
  const held = (index) => buttons[index]?.pressed === true;
  if (held(PAD_BUTTONS.up)) return 'up';
  if (held(PAD_BUTTONS.down)) return 'down';
  if (held(PAD_BUTTONS.left)) return 'left';
  if (held(PAD_BUTTONS.right)) return 'right';
  return null;
}

/** Наклон стика стороной. Диагоналей нет: выбор идёт по четырём направлениям. */
export function padStickDirection(pad, deadZone = STICK_DEAD_ZONE) {
  const x = clamp(pad?.axes?.[0]);
  const y = clamp(pad?.axes?.[1]);
  if (Math.abs(x) < deadZone && Math.abs(y) < deadZone) return null;
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}

/** Куда наклонили хоть чем-нибудь: крестовина главнее, она точнее. */
export function padDirection(pad, deadZone = STICK_DEAD_ZONE) {
  if (!pad) return null;
  return padDpadDirection(pad) ?? padStickDirection(pad, deadZone);
}

/**
 * Какая кнопка интерфейса ближайшая в эту сторону.
 *
 * Выбор по списку («следующая, предыдущая») на экране, где кнопки стоят по
 * углам, читается как лотерея: игрок тянет стик вправо и попадает в кнопку
 * снизу слева. Поэтому выбор пространственный — берётся та, что действительно
 * лежит в ту сторону, и из них ближайшая.
 *
 * Сторона считается по вектору между центрами: смещение вдоль выбранной оси
 * должно быть больше, чем поперёк, иначе кнопка «сбоку-сверху» украдёт ход
 * вверх. Расстояние поперёк оси весит вдвое — из двух одинаково далёких
 * выигрывает та, что ближе к прямой линии взгляда.
 */
export function chooseTarget({ rects, from = null, direction }) {
  const list = Array.isArray(rects) ? rects.filter(Boolean) : [];
  if (list.length === 0 || !direction) return null;
  const current = from ? list.find(({ id }) => id === from) ?? null : null;
  if (!current) return list[0].id;
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  const across = axis === 'x' ? 'y' : 'x';
  let best = null;
  let bestCost = Infinity;
  for (const rect of list) {
    if (rect.id === current.id) continue;
    const along = (rect[axis] - current[axis]) * sign;
    const side = Math.abs(rect[across] - current[across]);
    if (along <= 0 || along < side) continue;
    const cost = along + side * 2;
    if (cost < bestCost) {
      bestCost = cost;
      best = rect.id;
    }
  }
  return best ?? current.id;
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
