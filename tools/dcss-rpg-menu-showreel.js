/**
 * Что показывают за главным меню.
 *
 * Меню стояло на застывшем кадре того этажа, с которого игрок ушёл: если
 * забега ещё не было — на первом этаже спуска, всегда одном и том же. Иван:
 * «я бы хотел, чтобы меню было анимировано <...> на фоне я хочу, чтобы были
 * подземелья вот наши и чтобы там по ним как-нибудь клёво камера летала, а
 * потом оно сменяется на другое подземелье».
 *
 * Здесь считается только время и путь камеры. Само подземелье собирает и
 * рисует переходник — он один умеет и то и другое.
 *
 * Три правила, на которых это стоит:
 *
 * - **Показывают разное.** Пять видов, и подряд один и тот же не повторяется:
 *   зелёная земля, пепельные залы, катакомбы, мастерские хранилищ и ад. Это
 *   обещание игры, а не заставка: за меню видно, куда игрок пойдёт.
 * - **Смена прячется в затемнении.** Собрать новый этаж — работа на кадр-два,
 *   и на телефоне это заметно. Поэтому свет уходит раньше, чем меняется
 *   этаж, и возвращается уже на новом.
 * - **Камера летит, а не дёргается.** Путь — прямая между двумя точками по
 *   диагонали этажа, с плавным началом и концом; без этого на пиксельной
 *   картинке видно каждый шаг.
 */

/** Пять видов, в том порядке, в каком их показывают. */
export const SHOWREEL_SCENES = Object.freeze([
  Object.freeze({ id: 'meadow', branch: 'surface', depth: 3, seed: 4 }),
  Object.freeze({ id: 'ashen', branch: 'deep', depth: 5, seed: 11 }),
  Object.freeze({ id: 'crypt', branch: 'crypt', depth: 11, seed: 7 }),
  Object.freeze({ id: 'vaults', branch: 'vaults', depth: 9, seed: 3 }),
  Object.freeze({ id: 'hell', branch: 'hell', depth: 20, seed: 5 }),
]);

/** Сколько держится один вид и сколько длится затемнение на стыке. */
export const SHOWREEL_SCENE_SECONDS = 13;
export const SHOWREEL_FADE_SECONDS = 1.1;

/**
 * Где мы сейчас: какой вид, насколько он прошёл и сколько на экране темноты.
 *
 * Темнота считается от краёв отрезка: она гасит конец одного вида и начало
 * следующего, и именно в этой темноте переходник успевает собрать новый
 * этаж. `swap` — единственный кадр, на котором это нужно сделать.
 */
export function showreelFrame(elapsed, scenes = SHOWREEL_SCENES) {
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new TypeError('Showreel needs elapsed seconds');
  if (!Array.isArray(scenes) || scenes.length === 0) throw new TypeError('Showreel needs scenes');
  const длина = SHOWREEL_SCENE_SECONDS;
  const номер = Math.floor(elapsed / длина);
  const внутри = elapsed - номер * длина;
  const край = Math.min(внутри, длина - внутри);
  return Object.freeze({
    index: номер % scenes.length,
    scene: scenes[номер % scenes.length],
    progress: внутри / длина,
    // Единица — полная темнота, ноль — света не трогаем.
    fade: край >= SHOWREEL_FADE_SECONDS ? 0 : 1 - край / SHOWREEL_FADE_SECONDS,
    // Смена ровно на стыке: первый кадр нового отрезка.
    turn: номер,
  });
}

/** Плавное начало и конец: без него на пиксельной картинке видно каждый шаг. */
const гладко = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

/**
 * Путь камеры по этажу — по диагонали и через середину.
 *
 * Берутся крайние проходимые клетки, а не углы карты: за стенами смотреть не
 * на что, и камера, упёршаяся в чёрный край, выглядит поломкой. Отступ внутрь
 * ещё и держит в кадре стены по краям, а не пустоту за ними.
 */
export function showreelCameraPath(bounds, turn = 0) {
  if (!bounds || !Number.isFinite(bounds.minX) || !Number.isFinite(bounds.maxX)) {
    throw new TypeError('Showreel camera needs walkable bounds');
  }
  const отступ = 0.22;
  const x = (доля) => bounds.minX + (bounds.maxX - bounds.minX) * доля;
  const y = (доля) => bounds.minY + (bounds.maxY - bounds.minY) * доля;
  // Четыре диагонали по кругу: соседние виды не летят одинаково.
  const пути = [
    { from: { x: x(отступ), y: y(отступ) }, to: { x: x(1 - отступ), y: y(1 - отступ) } },
    { from: { x: x(1 - отступ), y: y(отступ) }, to: { x: x(отступ), y: y(1 - отступ) } },
    { from: { x: x(1 - отступ), y: y(1 - отступ) }, to: { x: x(отступ), y: y(отступ) } },
    { from: { x: x(отступ), y: y(1 - отступ) }, to: { x: x(1 - отступ), y: y(отступ) } },
  ];
  return пути[((turn % пути.length) + пути.length) % пути.length];
}

/** Где камера на этой доле пути. */
export function showreelCameraAt(path, progress) {
  const доля = гладко(Math.min(1, Math.max(0, progress)));
  return Object.freeze({
    x: path.from.x + (path.to.x - path.from.x) * доля,
    y: path.from.y + (path.to.y - path.from.y) * доля,
  });
}
