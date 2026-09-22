/*
 * Версия внешности выросла до двойки: у героя появилась борода, а у тела —
 * собственный голос. Сохранённая единица не выбрасывается, а дополняется:
 * человек, выбранный вчера, останется тем же человеком.
 */
export const PLAYER_APPEARANCE_VERSION = 2;
export const PLAYER_APPEARANCE_STORAGE_KEY = 'dng-codex:player-appearance:v1';

/**
 * Из чего собран герой.
 *
 * Тел было два — мужское и женское человеческие, — а в библиотеке лежат
 * десятки, и все они уже нарисованы под ту же куклу: броня, штаны и сапоги
 * ложатся слоями поверх любого из них. Иван спросил, всё ли это, чем можно
 * настроить героя; оказалось, что нет, и вот остальное.
 *
 * Кентавров, наг и котов здесь намеренно нет: у них нет человеческих ног, а
 * игра надевает поножи и сапоги отдельными слоями. Такое тело потребовало бы
 * своих правил экипировки, а не строчки в списке.
 *
 * `voice` стоит рядом с телом, а не выводится из его имени: раньше голос
 * угадывался по единственному женскому телу, и с приходом остальных это
 * сломалось бы молча.
 */
/**
 * Из чего собран герой.
 *
 * Тел было два — мужское и женское человеческие, — а в библиотеке лежат
 * десятки, и все они уже нарисованы под ту же куклу: броня, штаны и сапоги
 * ложатся слоями поверх любого из них. Иван спросил, всё ли это, чем можно
 * настроить героя; оказалось, что нет.
 *
 * Здесь только человекоподобные — по его слову: «не будем добавлять вампиров,
 * мумий, всяких кобольдов, драконов, демонов; только человекоподобные расы».
 * Кентавров, наг и котов не было бы и без этого: у них нет человеческих ног, а
 * игра надевает поножи и сапоги отдельными слоями, так что такое тело
 * потребовало бы своих правил экипировки, а не строчки в списке.
 *
 * `voice` стоит рядом с телом, а не выводится из его имени: раньше голос
 * угадывался по единственному женскому телу, и с приходом остальных это
 * сломалось бы молча.
 */
/**
 * Четыре тела: человек и эльф, он и она.
 *
 * Их было шестнадцать, и половина различалась одним оттенком кожи: эльф и
 * тёмный эльф, дварф и глубинный дварф, гном и полурослик. Иван: «у нас
 * слишком много рас в игре, они почти что все одинаковые, там только цветами
 * немного отличаются. <...> раз оставляем только человека и эльфа, то есть
 * мужчину и женщину, — четыре типа тела у нас будут, и всё».
 *
 * Сохранённая внешность с выброшенным телом не ломается и не теряется:
 * `validatePlayerAppearance` её отвергает, и герой выходит человеком —
 * `resolvePlayerAppearance` подставляет набор по умолчанию.
 */
export const PLAYER_BODY_OPTIONS = Object.freeze([
  Object.freeze({ id: 'human-m', layer: 'player/base/human_m.png', voice: 'male' }),
  Object.freeze({ id: 'human-f', layer: 'player/base/human_f.png', voice: 'female' }),
  Object.freeze({ id: 'elf-m', layer: 'player/base/elf_m.png', voice: 'male' }),
  Object.freeze({ id: 'elf-f', layer: 'player/base/elf_f.png', voice: 'female' }),
]);

/** Все причёски набора: раньше подключены были восемь из двадцати трёх. */
export const PLAYER_HAIR_OPTIONS = Object.freeze([
  Object.freeze({ id: 'none', layer: null }),
  Object.freeze({ id: 'brown-short', layer: 'player/hair/brown1.png' }),
  Object.freeze({ id: 'brown-long', layer: 'player/hair/brown2.png' }),
  Object.freeze({ id: 'black', layer: 'player/hair/elf_black.png' }),
  Object.freeze({ id: 'black-long', layer: 'player/hair/fem_black.png' }),
  Object.freeze({ id: 'red', layer: 'player/hair/fem_red.png' }),
  Object.freeze({ id: 'white', layer: 'player/hair/fem_white.png' }),
  Object.freeze({ id: 'gold', layer: 'player/hair/fem_yellow.png' }),
  Object.freeze({ id: 'brown-tails', layer: 'player/hair/pigtails_brown.png' }),
  Object.freeze({ id: 'red-tail', layer: 'player/hair/pigtail_red.png' }),
  Object.freeze({ id: 'gold-tails', layer: 'player/hair/pigtails_yellow.png' }),
  Object.freeze({ id: 'gold-ponytail', layer: 'player/hair/ponytail_yellow.png' }),
  Object.freeze({ id: 'red-knot', layer: 'player/hair/knot_red.png' }),
  Object.freeze({ id: 'grey-wave', layer: 'player/hair/aragorn.png' }),
  Object.freeze({ id: 'dark-long', layer: 'player/hair/arwen.png' }),
  Object.freeze({ id: 'dark-wave', layer: 'player/hair/boromir.png' }),
  Object.freeze({ id: 'curls', layer: 'player/hair/frodo.png' }),
  Object.freeze({ id: 'sand-curls', layer: 'player/hair/sam.png' }),
  Object.freeze({ id: 'brown-wave', layer: 'player/hair/merry.png' }),
  Object.freeze({ id: 'fair-long', layer: 'player/hair/legolas.png' }),
  Object.freeze({ id: 'dark-short', layer: 'player/hair/pj.png' }),
  Object.freeze({ id: 'blue-flame', layer: 'player/hair/djinn1.png' }),
  Object.freeze({ id: 'cyan-flame', layer: 'player/hair/djinn2.png' }),
  Object.freeze({ id: 'black-comb', layer: 'player/hair/tengu_comb.png' }),
]);

/** Борода в наборе одна, поэтому выбор короткий: есть или нет. */
export const PLAYER_BEARD_OPTIONS = Object.freeze([
  Object.freeze({ id: 'none', layer: null }),
  Object.freeze({ id: 'dark', layer: 'player/beard/pj.png' }),
]);

/**
 * Каким голосом кричит герой.
 *
 * Голос угадывался по единственному женскому телу: `bodyId === 'human-f'`.
 * Пока тел было два, это работало; с приходом остальных эльфийка кричала бы
 * мужским голосом и никто бы не заметил. Теперь голос записан рядом с самим
 * телом и берётся оттуда.
 */
export function playerVoice(appearance) {
  return bodies.get(appearance?.bodyId)?.voice === 'female' ? 'female' : 'male';
}

const bodies = new Map(PLAYER_BODY_OPTIONS.map((option) => [option.id, option]));
const hairs = new Map(PLAYER_HAIR_OPTIONS.map((option) => [option.id, option]));
const beards = new Map(PLAYER_BEARD_OPTIONS.map((option) => [option.id, option]));

function freezeAppearance(appearance) {
  return Object.freeze({
    version: PLAYER_APPEARANCE_VERSION,
    bodyId: appearance.bodyId,
    hairId: appearance.hairId,
    beardId: appearance.beardId,
  });
}

export function createPlayerAppearance({
  bodyId = 'human-m',
  hairId = 'brown-short',
  beardId = 'none',
} = {}) {
  const appearance = { version: PLAYER_APPEARANCE_VERSION, bodyId, hairId, beardId };
  if (!validatePlayerAppearance(appearance)) throw new TypeError('Invalid player appearance');
  return freezeAppearance(appearance);
}

export function validatePlayerAppearance(appearance) {
  return Boolean(appearance)
    && typeof appearance === 'object'
    && !Array.isArray(appearance)
    && Object.keys(appearance).length === 4
    && appearance.version === PLAYER_APPEARANCE_VERSION
    && bodies.has(appearance.bodyId)
    && hairs.has(appearance.hairId)
    && beards.has(appearance.beardId);
}

/**
 * Внешность прошлой версии — не мусор.
 *
 * До бороды снимок состоял из трёх полей, и проверка отвергла бы его целиком:
 * игрок, собравший себе лицо, получил бы на его месте чужое. Единица
 * дополняется бородой «нет» и становится двойкой.
 */
function upgradeAppearance(parsed) {
  if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) return null;
  const поднято = {
    version: PLAYER_APPEARANCE_VERSION,
    bodyId: parsed.bodyId,
    hairId: parsed.hairId,
    beardId: 'none',
  };
  return validatePlayerAppearance(поднято) ? freezeAppearance(поднято) : null;
}

export function parsePlayerAppearance(raw) {
  if (typeof raw !== 'string' || raw.length > 2_000) return createPlayerAppearance();
  try {
    const parsed = JSON.parse(raw);
    if (validatePlayerAppearance(parsed)) return freezeAppearance(parsed);
    return upgradeAppearance(parsed) ?? createPlayerAppearance();
  } catch {
    return createPlayerAppearance();
  }
}

export function loadPlayerAppearance(storage = globalThis.localStorage) {
  try {
    return parsePlayerAppearance(storage?.getItem(PLAYER_APPEARANCE_STORAGE_KEY));
  } catch {
    return createPlayerAppearance();
  }
}

export function savePlayerAppearance(appearance, storage = globalThis.localStorage) {
  if (!validatePlayerAppearance(appearance)) throw new TypeError('Cannot save invalid appearance');
  try {
    storage?.setItem(PLAYER_APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    return true;
  } catch {
    return false;
  }
}

export function resolvePlayerAppearance(appearance) {
  const safe = validatePlayerAppearance(appearance) ? appearance : createPlayerAppearance();
  return Object.freeze({
    body: bodies.get(safe.bodyId),
    hair: hairs.get(safe.hairId),
    beard: beards.get(safe.beardId),
  });
}

export function cyclePlayerAppearance(appearance, kind, step) {
  if (!validatePlayerAppearance(appearance)) throw new TypeError('Invalid player appearance');
  const options = kind === 'body' ? PLAYER_BODY_OPTIONS
    : kind === 'hair' ? PLAYER_HAIR_OPTIONS
      : kind === 'beard' ? PLAYER_BEARD_OPTIONS : null;
  if (!options || !Number.isInteger(step) || step === 0) throw new TypeError('Invalid appearance cycle');
  const key = kind === 'body' ? 'bodyId' : kind === 'hair' ? 'hairId' : 'beardId';
  const current = options.findIndex((option) => option.id === appearance[key]);
  const index = (current + step % options.length + options.length) % options.length;
  return createPlayerAppearance({ ...appearance, [key]: options[index].id });
}

export function playerAppearancePosition(appearance) {
  const safe = validatePlayerAppearance(appearance) ? appearance : createPlayerAppearance();
  return Object.freeze({
    body: PLAYER_BODY_OPTIONS.findIndex((option) => option.id === safe.bodyId),
    hair: PLAYER_HAIR_OPTIONS.findIndex((option) => option.id === safe.hairId),
    beard: PLAYER_BEARD_OPTIONS.findIndex((option) => option.id === safe.beardId),
  });
}

export function allPlayerAppearanceAssetPaths() {
  return [...new Set([
    ...PLAYER_BODY_OPTIONS.map(({ layer }) => layer),
    ...PLAYER_HAIR_OPTIONS.map(({ layer }) => layer),
    ...PLAYER_BEARD_OPTIONS.map(({ layer }) => layer),
  ].filter(Boolean))].sort();
}
