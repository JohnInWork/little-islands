/**
 * Onboarding: five first-floor hints, each shown once and dismissable. The
 * runtime only reports boolean signals; this module decides which hint (if
 * any) is due, tracks what the player has already seen and owns the copy.
 * The state lives in localStorage, never in the run save.
 */

export const ONBOARDING_KEY = 'dng-codex:onboarding:v1';

/**
 * Выключатель обучения.
 *
 * Иван 20.09.2026: «у нас есть обучение какое-то в начале игры — я бы его
 * убрал пока что, просто скрыл бы, чтобы в игре его не было».
 *
 * Именно скрыт, а не удалён: подсказки, их тексты, порядок и правила показа
 * целы и по-прежнему покрыты тестами, панель в разметке на месте. Чтобы
 * вернуть обучение, достаточно поставить здесь `true` — больше ничего.
 *
 * Правила ниже сознательно НЕ смотрят на этот флаг: `advanceOnboarding`
 * остаётся чистой функцией «что сейчас положено показать», а решение
 * показывать или нет принимает адаптер. Иначе выключатель пришлось бы
 * обходить в каждом тесте самих правил.
 */
export const ONBOARDING_ENABLED = false;

/** Every boolean the adapter reports; `depth` travels next to them as a number. */
export const ONBOARDING_SIGNALS = Object.freeze([
  'inGame',
  'moved',
  'enemyVisible',
  'engaged',
  'lootVisible',
  'pickedUp',
  'interactAvailable',
  'interacted',
  'exitRevealed',
  'descended',
  'inCity',
  'houseOwned',
]);

const hint = (id, showWhen, completeOn, glyph, where = 'first-floor') => Object.freeze({
  id,
  showWhen,
  completeOn,
  glyph,
  where,
});

/**
 * In priority order: the first unseen hint whose `showWhen` signal is true
 * wins. `where` says on which floor a hint may appear at all, because the
 * city is the one place a first-floor hint would never reach.
 */
export const ONBOARDING_HINTS = Object.freeze([
  hint('move', 'inGame', 'moved', '✥'),
  hint('enemy', 'enemyVisible', 'engaged', '⚔'),
  hint('loot', 'lootVisible', 'pickedUp', '◆'),
  hint('interact', 'interactAvailable', 'interacted', '✦'),
  hint('exit', 'exitRevealed', 'descended', '▼'),
  hint('city', 'inCity', 'houseOwned', '⌂', 'city'),
]);

export const ONBOARDING_HINT_IDS = Object.freeze(ONBOARDING_HINTS.map(({ id }) => id));

const HINT_COPY = Object.freeze({
  ru: Object.freeze({
    move: Object.freeze({
      title: 'Движение',
      text: 'Тяни джойстик внизу или тапни по клетке: герой сам пройдёт по пути.',
    }),
    enemy: Object.freeze({
      title: 'Враг рядом',
      text: 'Вплотную удары идут сами. Герой вдвое быстрее врага: отходи и бей снова. Еда лечит прямо в бою.',
    }),
    loot: Object.freeze({
      title: 'Добыча',
      text: 'Наступи на предмет, чтобы поднять. Рюкзак слева внизу: тап по вещи покажет, что она даёт.',
    }),
    interact: Object.freeze({
      title: 'Взаимодействие',
      text: 'Кнопка над рюкзаком берётся за то, что рядом: дверь, сундук, лестница. Одно дело — сразу, без окна.',
    }),
    exit: Object.freeze({
      title: 'Лестница найдена',
      text: 'Спуск ведёт ниже, а лестница, на которой ты появился, — обратно наверх. Плитка глубины: карта.',
    }),
    city: Object.freeze({
      title: 'Город',
      text: 'Здесь торгуют и следят за порядком. Пустой участок продаётся: ищи вывеску, она есть на карте.',
    }),
    dismiss: 'Понятно',
    skip: 'Не показывать',
    group: 'Подсказка',
  }),
  en: Object.freeze({
    move: Object.freeze({
      title: 'Moving',
      text: 'Drag the joystick at the bottom or tap a tile: the hero walks the path on their own.',
    }),
    enemy: Object.freeze({
      title: 'Enemy ahead',
      text: 'Up close the blows come on their own. You are twice as fast: back off, strike again. Food heals in a fight.',
    }),
    loot: Object.freeze({
      title: 'Loot',
      text: 'Step onto an item to pick it up. The bag is bottom-left: tap a thing to see what it does.',
    }),
    interact: Object.freeze({
      title: 'Interaction',
      text: 'The button above the bag takes what is near: a door, a chest, a stair. A lone action happens at once.',
    }),
    exit: Object.freeze({
      title: 'Stairs found',
      text: 'The descent leads down; the stair you arrived on leads back up. The depth tile opens the map.',
    }),
    city: Object.freeze({
      title: 'The city',
      text: 'Traders here, and a watch. The empty plot is for sale: look for the sign, it is on the map.',
    }),
    dismiss: 'Got it',
    skip: 'Hide hints',
    group: 'Hint',
  }),
});

function normalizeSeen(source) {
  const seen = new Set();
  if (Array.isArray(source)) {
    for (const id of source) if (ONBOARDING_HINT_IDS.includes(id)) seen.add(id);
  }
  return Object.freeze(ONBOARDING_HINT_IDS.filter((id) => seen.has(id)));
}

/** Strict, catalog-ordered state; unknown ids and foreign fields are dropped. */
export function createOnboardingState(source = null) {
  return Object.freeze({
    seen: normalizeSeen(source?.seen),
    dismissed: source?.dismissed === true,
  });
}

/** Reads the stored document; garbage or a foreign shape falls back to a fresh state. */
export function parseOnboardingState(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return createOnboardingState();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return createOnboardingState();
    return createOnboardingState(parsed);
  } catch {
    return createOnboardingState();
  }
}

export function serializeOnboardingState(state) {
  const normalized = createOnboardingState(state);
  return JSON.stringify({ seen: [...normalized.seen], dismissed: normalized.dismissed });
}

export function markOnboardingSeen(state, id) {
  const current = createOnboardingState(state);
  if (!ONBOARDING_HINT_IDS.includes(id) || current.seen.includes(id)) return current;
  return createOnboardingState({ seen: [...current.seen, id], dismissed: current.dismissed });
}

/** "Don't show again": every hint counts as seen and nothing is evaluated any more. */
export function dismissOnboarding(state) {
  const current = createOnboardingState(state);
  return createOnboardingState({ seen: ONBOARDING_HINT_IDS, dismissed: true });
  // `current` is normalised only so a garbage input still throws nothing.
}

export function onboardingComplete(state) {
  const current = createOnboardingState(state);
  return current.dismissed || current.seen.length === ONBOARDING_HINT_IDS.length;
}

/**
 * One evaluation step. Completion signals mark their hints as seen on any
 * floor (so the "stairs" hint does not return on a later run once the player
 * has descended); a hint is only shown on the first floor while the run is
 * playable. `changed` tells the adapter whether to persist.
 */
export function advanceOnboarding(state, signals = {}) {
  const current = createOnboardingState(state);
  if (current.dismissed) return Object.freeze({ state: current, hintId: null, changed: false });
  let next = current;
  for (const entry of ONBOARDING_HINTS) {
    if (!next.seen.includes(entry.id) && signals[entry.completeOn] === true) next = markOnboardingSeen(next, entry.id);
  }
  const changed = next.seen.length !== current.seen.length;
  const onFirstFloor = signals.depth === 1 && signals.inGame === true;
  const inCity = signals.inCity === true && signals.inGame === true;
  const reachable = (entry) => (entry.where === 'city' ? inCity : onFirstFloor);
  const due = ONBOARDING_HINTS.find((entry) => (
    !next.seen.includes(entry.id) && reachable(entry) && signals[entry.showWhen] === true
  )) ?? null;
  return Object.freeze({ state: next, hintId: due ? due.id : null, changed });
}

export function onboardingHintCopy(id, language = 'ru') {
  const copy = HINT_COPY[language === 'en' ? 'en' : 'ru'];
  const entry = ONBOARDING_HINTS.find((candidate) => candidate.id === id);
  if (!entry || !copy[id]) return null;
  return Object.freeze({
    id,
    glyph: entry.glyph,
    title: copy[id].title,
    text: copy[id].text,
    dismiss: copy.dismiss,
    skip: copy.skip,
    ariaLabel: `${copy.group}: ${copy[id].title}. ${copy[id].text}`,
  });
}

/** Catalog invariants for the test suite: ids, signals and phone-sized copy. */
export function onboardingProblems() {
  const problems = [];
  const ids = new Set();
  for (const entry of ONBOARDING_HINTS) {
    if (ids.has(entry.id)) problems.push(`${entry.id}:duplicate`);
    ids.add(entry.id);
    if (!ONBOARDING_SIGNALS.includes(entry.showWhen)) problems.push(`${entry.id}:showWhen`);
    if (!ONBOARDING_SIGNALS.includes(entry.completeOn)) problems.push(`${entry.id}:completeOn`);
    if (entry.showWhen === entry.completeOn) problems.push(`${entry.id}:same-signal`);
    if (!['first-floor', 'city'].includes(entry.where)) problems.push(`${entry.id}:where`);
    if (typeof entry.glyph !== 'string' || entry.glyph.length === 0) problems.push(`${entry.id}:glyph`);
    for (const language of ['ru', 'en']) {
      const copy = HINT_COPY[language][entry.id];
      if (!copy?.title || copy.title.length > 24) problems.push(`${entry.id}:${language}:title`);
      if (!copy?.text || copy.text.length > 110) problems.push(`${entry.id}:${language}:text`);
    }
  }
  return problems;
}
