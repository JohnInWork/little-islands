/**
 * Хорошо это было или плохо — решается здесь, и только здесь.
 *
 * Иван: кристалл дал ему «+5», и он так и не понял, чего. А книга, прочитанная
 * из рюкзака, говорила о себе под окном рюкзака, и сказанного он не видел
 * вовсе. Два правила на всю игру:
 *
 * 1. Всякое «получил» и «потерял» называет, ЧТО: значок и слово, а не голое
 *    число. Строки ставят метки `{gold}`, `{heal}`, `{maxhp}`, `{attack}`,
 *    `{food}`, `{map}` — те же, что уже рисует переходник в карточках, — а
 *    картинку и слово подставляет он.
 * 2. Итог звучит и выглядит по тому, что он значит для героя: добыча, лечение,
 *    новый ранг — яркий ступенчатый «хлопок» и приятный звук; рана, яд,
 *    проклятие, забытое — красная встряска и резкий звук.
 *
 * Места, где что-то случилось, называют, ЧТО случилось (`kind`), а не как это
 * показывать. Тон, цвет и звук выбирает таблица ниже — одна на всю игру.
 * Модуль чистый: ни DOM, ни звука, только решение.
 */

export const FEEDBACK_TONES = Object.freeze(['good', 'bad', 'neutral']);

const spec = (tone, sound, accent) => Object.freeze({ tone, sound, accent });

/**
 * Что случилось → тон, звук из `SOUND_SAMPLES` и цвет вспышки.
 *
 * Звуки только из уже записанных: новый файл сюда не добавляется. Приятные —
 * монеты, лечение, находка, фанфара роста; резкие — капкан и тяжёлый удар.
 */
export const FEEDBACK_KINDS = Object.freeze({
  gold: spec('good', 'gold', 'gold'),
  heal: spec('good', 'spell-heal', 'green'),
  food: spec('good', 'eat', 'green'),
  // Постоянный рост — редкость, и звучит он как рост уровня.
  maxhp: spec('good', 'level-up', 'green'),
  buff: spec('good', 'level-up', 'gold'),
  'skill-up': spec('good', 'level-up', 'gold'),
  spell: spec('good', 'level-up', 'gold'),
  item: spec('good', 'pickup', 'gold'),
  // Снятое проклятие, очищение, отдых, возвращённые очки.
  restore: spec('good', 'spell-heal', 'green'),
  reveal: spec('good', 'spell-toggle', 'gold'),
  ally: spec('good', 'spell-heal', 'green'),
  // Свиток задел врагов: звук у заклинания уже свой.
  strike: spec('good', null, 'gold'),
  // Страж пал, дорога пройдена: звук победы у них уже свой.
  victory: spec('good', null, 'gold'),

  damage: spec('bad', 'hit-heavy', 'red'),
  trap: spec('bad', 'trap', 'red'),
  poison: spec('bad', 'hit-heavy', 'red'),
  curse: spec('bad', 'trap', 'red'),
  // Книга беспамятства: ранг ушёл.
  'skill-down': spec('bad', 'hit-heavy', 'red'),
  // Украли, отняли, потерял спутника, заплатил за пустышку.
  loss: spec('bad', 'hit-heavy', 'red'),
  // Разговор кончился дракой, засада за дверью.
  hostile: spec('bad', 'hit-heavy', 'red'),

  // «Нельзя» — не беда и не подарок: своя красная рамка у отказа уже есть.
  refused: spec('neutral', null, null),
  // И взял, и отдал: золото ценой раны.
  trade: spec('neutral', null, null),
  info: spec('neutral', null, null),
});

export const FEEDBACK_KIND_IDS = Object.freeze(Object.keys(FEEDBACK_KINDS));

/**
 * Какие метки что значат, когда о них говорит знак перед числом.
 * Порядок — порядок важности: постоянный рост важнее горсти монет.
 */
const GAIN_KIND = Object.freeze({
  maxhp: 'maxhp',
  attack: 'buff',
  heal: 'heal',
  food: 'food',
  gold: 'gold',
  map: 'reveal',
});

const LOSS_KIND = Object.freeze({
  heal: 'damage',
  maxhp: 'damage',
  attack: 'loss',
  food: 'loss',
  gold: 'loss',
  map: 'loss',
});

/** В строке итога ресурсы идут в этом порядке. */
export const DELTA_ORDER = Object.freeze(['attack', 'maxhp', 'heal', 'food', 'gold', 'map']);

const SIGNED_AMOUNT = /([+−-])\s*\d+%?\s*\{([a-z]+)\}/g;

/** Приросты и потери, прочитанные по меткам: «+5 {gold} · −3 {heal}». */
export function readSignedAmounts(text) {
  const gains = [];
  const losses = [];
  if (typeof text !== 'string') return Object.freeze({ gains, losses });
  for (const [, sign, id] of text.matchAll(SIGNED_AMOUNT)) {
    (sign === '+' ? gains : losses).push(id);
  }
  return Object.freeze({ gains: Object.freeze(gains), losses: Object.freeze(losses) });
}

function inferKind(value) {
  if (value === 'full') return 'refused';
  if (typeof value !== 'string') return 'info';
  const { gains, losses } = readSignedAmounts(value);
  if (gains.length > 0 && losses.length > 0) return 'trade';
  // Ключи таблиц стоят в порядке важности.
  const byPriority = (ids, table) => Object.keys(table).map((id) => (ids.includes(id) ? table[id] : null))
    .find(Boolean) ?? null;
  if (gains.length > 0) return byPriority(gains, GAIN_KIND) ?? 'info';
  if (losses.length > 0) return byPriority(losses, LOSS_KIND) ?? 'loss';
  return 'info';
}

/**
 * Единственное место, где итог становится хорошим, плохим или никаким.
 *
 * `kind` — что случилось, если место знает это само (книга подняла ранг,
 * вор унёс вещь). Без него решает сама строка: «+5 {gold}» — добыча,
 * «−14 {heal}» — рана, «full» — отказ, всё прочее — просто сведения.
 */
export function feedbackFor({ kind = null, value = null } = {}) {
  const id = kind && FEEDBACK_KINDS[kind] ? kind : inferKind(value);
  return Object.freeze({ kind: id, ...FEEDBACK_KINDS[id] });
}

/**
 * Изменения героя одной строкой с метками: «+1 {attack} · +5 {gold}».
 *
 * Без языка: слова подставит переходник по меткам, и одна и та же строка
 * читается по-русски и по-английски.
 */
export function formatDeltas(deltas = {}) {
  const parts = [];
  for (const id of DELTA_ORDER) {
    const amount = Math.round(Number(deltas?.[id]) || 0);
    if (amount > 0) parts.push(`+${amount} {${id}}`);
    else if (amount < 0) parts.push(`−${Math.abs(amount)} {${id}}`);
  }
  return parts.join(' · ');
}

/**
 * Что означает исход разговора.
 *
 * Разговор может кончиться чем угодно, и строка у него — живая речь, без
 * знаков перед числами для всего сразу. Поэтому исход читается по полям:
 * драка — плохо, подделка за деньги — потеря, вещь, золото, лечение — хорошо.
 */
export function parleyFeedbackKind(result, { junk = false } = {}) {
  if (!result || typeof result !== 'object') return 'info';
  if (junk) return 'loss';
  if (result.hostile) return 'hostile';
  if (result.grantsItemId) return 'item';
  if ((result.goldDelta ?? 0) > 0) return 'gold';
  if ((result.heal ?? 0) > 0) return 'heal';
  if (result.respec) return 'restore';
  if (result.revealsFloor) return 'reveal';
  return 'info';
}

/**
 * Короткие слова для тех итогов, что раньше говорили знаком: «!», «✓», «●●●».
 */
const COPY = Object.freeze({
  ru: Object.freeze({
    spent: 'Израсходован 1',
    trapDetected: 'Ловушка обнаружена',
    trapWarning: 'Ловушка под ногами',
    trapDisarmed: 'Ловушка обезврежена',
    doorBlocked: 'Дверь не закрыть: проём занят',
    ambush: 'Засада!',
    treasure: 'Здесь спрятано сокровище',
    strange: 'Здесь что-то не так',
    findGuarded: 'Находку стерегут!',
    wardHeld: 'Защита сработала',
    guardianDown: 'Страж повержен',
    roadPrize: 'Дорога пройдена!',
    homeStone: 'Дорога домой',
    dailySeed: (seed) => `Забег дня: ${seed}`,
    nothingFound: 'Ничего не нашлось',
    struck: (count) => (count > 0 ? `Задеты враги: ${count}` : 'Никого не задело'),
    held: (count) => (count > 0 ? `Скованы враги: ${count}` : 'Никого не сковало'),
    curseLifted: (count) => `Оковы сняты: ${count}`,
    identified: 'Опознано',
  }),
  en: Object.freeze({
    spent: '1 used',
    trapDetected: 'Trap detected',
    trapWarning: 'Trap underfoot',
    trapDisarmed: 'Trap disarmed',
    doorBlocked: 'Cannot close: the doorway is taken',
    ambush: 'Ambush!',
    treasure: 'Treasure is hidden here',
    strange: 'Something is off here',
    findGuarded: 'The find is guarded!',
    wardHeld: 'The ward held',
    guardianDown: 'Guardian defeated',
    roadPrize: 'The road is walked!',
    homeStone: 'The way home',
    dailySeed: (seed) => `Daily run: ${seed}`,
    nothingFound: 'Nothing turned up',
    struck: (count) => (count > 0 ? `Enemies hit: ${count}` : 'Nobody was hit'),
    held: (count) => (count > 0 ? `Enemies held: ${count}` : 'Nobody was held'),
    curseLifted: (count) => `Bindings lifted: ${count}`,
    identified: 'Identified',
  }),
});

export function feedbackCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}
