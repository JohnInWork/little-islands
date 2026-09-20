/**
 * Редкая встреча.
 *
 * Иван: «просто гуляя по верху можно встретить охотника и нанять его или
 * поторговать (редко встретить можно). Или например дракон, который очень
 * сильный, но безумно редко может заспавниться на ранних этапах».
 *
 * До сих пор всё, что стоит на этаже, приходило из одного места: бюджет
 * монстров, отфильтрованный потолком тира. Оттуда нельзя достать ни дракона
 * на третьем этаже (тир не пустит), ни мирного торговца (он не монстр). Нужен
 * второй, редкий канал — и это он.
 *
 * Три правила:
 *
 * - **Один бросок на этаж, и почти всегда пустой.** Шанс на то, что этаж
 *   несёт хоть что-то, — примерно один к шести. Дальше внутри броска уже
 *   решается, что именно, и дракон там — доля процента.
 * - **Редкая встреча не считается монстром.** Она не входит в бюджет, не
 *   смотрит на потолок тира и не отнимает место у обычного населения этажа.
 *   Всё, что она делает, — занимает одну свободную клетку подальше от входа.
 * - **У опасного есть примета.** Дракон, выпавший на третьем этаже, убьёт
 *   героя с одного удара, и это честно только если игрок увидел знак раньше,
 *   чем зубы: `omen` показывается при входе на этаж. Решение обойти — тоже
 *   решение, но его надо дать принять.
 *
 * Сами существа — обычные записи каталога с `unique: true`. Это значит, что
 * ни рендер, ни бой, ни экран смерти ничего про них знать не обязаны: они
 * работают ровно как всё остальное живое, просто попадают на этаж иначе.
 */

import { buildCreature } from './dcss-rpg-bestiary.js';

// Свои, а не одолженные у бестиария: «poison» — слишком общее слово, чтобы
// торчать из экспорта модуля, и проверка импортов адаптера на нём спотыкается.
const poison = (duration) => ({ id: 'poison', duration });
const burning = (duration) => ({ id: 'burning', duration });

/**
 * Шансы на этаж — **отдельные для каждого вида встречи, а не доли одного
 * броска**. Первый заход делил один бросок между всеми, и получалось вот что:
 * в аду на третьем этаже ни один именной ещё не доступен по глубине, поэтому
 * весь бросок доставался драконам — восемнадцать процентов этажей с драконом
 * вместо «безумно редко». Абсолютный шанс от состава пула не зависит.
 */
export const RARE_ENCOUNTER_CHANCE = Object.freeze({
  // Дракон: примерно один на восемьдесят этажей вверху и один на сорок внизу.
  beast: 0.012,
  beastPerDepth: 0.0006,
  // Странник: чуть реже, чем именной враг. Один-два на забег.
  wanderer: 0.08,
  // Именной враг: обычное содержимое редкой встречи.
  named: 0.14,
});

/** Ближе этого к точке входа редкая встреча не садится. */
export const RARE_ENCOUNTER_MIN_DISTANCE = 7;

const drake = (entry) => ({ kin: 'dragon', unique: true, large: true, ...entry });
/**
 * Странник: мирный человек, стоящий на этаже. Для этажа он обычный
 * нейтральный житель, для механики найма — тот, чей id начинается с `wild-`,
 * и этого достаточно: карточка, цена и отряд уже умеют с таким работать.
 */
const wanderer = (entry) => ({ kin: 'humanoid', unique: true, neutral: true, style: 'stalker', ...entry });
const named = (entry) => ({ kin: 'humanoid', unique: true, ...entry });

/**
 * Редкие существа. Нумерация профилей угрозы продолжает вторую волну
 * бестиария — иначе профили начали бы совпадать, а каталог этого не терпит.
 */
const ROSTER = [
  // ── Странники: мирные, и с ними можно иметь дело ────────────────────────
  // «Просто гуляя по верху можно встретить охотника и нанять его» — вот он.
  wanderer({ id: 'wild-hunter', habitat: 'surface', sprite: 'unique/nessos.png', tier: 4, ru: 'Охотник', en: 'Hunter' }),
  // Нарочно не `any`: живой человек, спокойно стоящий посреди ада, — это не
  // колорит, а поломка мира. Дружелюбных в аду и в катакомбах не бывает.
  wanderer({ id: 'wild-free-blade', habitat: 'deep', sprite: 'unique/norris.png', tier: 6, ru: 'Вольный клинок', en: 'Free blade' }),

  // ── Драконы и гидры: то, что может встретиться слишком рано ─────────────
  drake({ id: 'storm-dragon', habitat: 'any', sprite: 'dragons/storm_dragon.png', tier: 8, style: 'stalker', ru: 'Штормовой дракон', en: 'Storm dragon' }),
  drake({ id: 'shadow-dragon', habitat: 'any', sprite: 'dragons/shadow_dragon.png', tier: 8, style: 'stalker', ru: 'Теневой дракон', en: 'Shadow dragon' }),
  drake({ id: 'quicksilver-dragon', habitat: 'any', sprite: 'dragons/quicksilver_dragon.png', tier: 8, style: 'skirmisher', ru: 'Ртутный дракон', en: 'Quicksilver dragon' }),
  drake({ id: 'swamp-dragon', habitat: 'surface', sprite: 'dragons/swamp_dragon.png', tier: 7, style: 'brute', inflicts: poison(9), ru: 'Болотный дракон', en: 'Swamp dragon' }),
  drake({ id: 'hydra', habitat: 'any', sprite: 'dragons/hydra1.png', tier: 7, style: 'brute', ru: 'Гидра', en: 'Hydra' }),
  drake({ id: 'xtahua', habitat: 'any', sprite: 'unique/xtahua.png', tier: 9, style: 'brute', element: 'fire', inflicts: burning(8), ru: 'Кстахуа', en: 'Xtahua' }),
  drake({ id: 'lernaean-hydra', habitat: 'any', sprite: 'unique/lernaean_hydra01.png', tier: 9, style: 'brute', ru: 'Лернейская гидра', en: 'Lernaean hydra' }),
  drake({ id: 'tiamat', habitat: 'vaults', sprite: 'unique/tiamat_red.png', tier: 9, style: 'caster', element: 'fire', ru: 'Тиамат', en: 'Tiamat' }),

  // ── Именные: поверхность ────────────────────────────────────────────────
  named({ id: 'nellie', habitat: 'surface', kin: 'beast', sprite: 'unique/nellie.png', tier: 3, style: 'brute', ru: 'Нелли', en: 'Nellie' }),
  named({ id: 'agnes', habitat: 'surface', sprite: 'unique/agnes.png', tier: 4, style: 'skirmisher', ru: 'Агнес', en: 'Agnes' }),
  named({ id: 'sonja', habitat: 'surface', sprite: 'unique/sonja.png', tier: 5, style: 'skirmisher', ru: 'Соня', en: 'Sonja' }),
  named({ id: 'erica', habitat: 'surface', sprite: 'unique/erica.png', tier: 5, style: 'caster', element: 'fire', ru: 'Эрика', en: 'Erica' }),
  named({ id: 'rupert', habitat: 'surface', sprite: 'unique/rupert.png', tier: 6, style: 'brute', ru: 'Руперт', en: 'Rupert' }),

  // ── Именные: спуск ──────────────────────────────────────────────────────
  named({ id: 'robin', habitat: 'deep', sprite: 'unique/robin.png', tier: 2, style: 'brute', ru: 'Робин', en: 'Robin' }),
  named({ id: 'ijyb', habitat: 'deep', sprite: 'unique/ijyb.png', tier: 2, style: 'skirmisher', ru: 'Ийиб', en: 'Ijyb' }),
  named({ id: 'sigmund', habitat: 'deep', sprite: 'unique/sigmund.png', tier: 3, style: 'caster', ru: 'Сигмунд', en: 'Sigmund' }),
  named({ id: 'blork-the-orc', habitat: 'deep', sprite: 'unique/blork_the_orc.png', tier: 3, style: 'brute', ru: 'Блорк Орк', en: 'Blork the orc' }),
  named({ id: 'urug', habitat: 'deep', sprite: 'unique/urug.png', tier: 5, style: 'brute', ru: 'Уруг', en: 'Urug' }),
  named({ id: 'snorg', habitat: 'deep', sprite: 'unique/snorg.png', tier: 6, style: 'brute', large: true, ru: 'Снорг', en: 'Snorg' }),
  named({ id: 'saint-roka', habitat: 'deep', sprite: 'unique/saint_roka.png', tier: 7, style: 'brute', ru: 'Святой Рока', en: 'Saint Roka' }),
  named({ id: 'polyphemus', habitat: 'deep', sprite: 'unique/polyphemus.png', tier: 7, style: 'brute', large: true, ru: 'Полифем', en: 'Polyphemus' }),

  // ── Именные: хранилища ──────────────────────────────────────────────────
  named({ id: 'frederick', habitat: 'vaults', sprite: 'unique/frederick.png', tier: 3, style: 'brute', ru: 'Фредерик', en: 'Frederick' }),
  named({ id: 'eustachio', habitat: 'vaults', sprite: 'unique/eustachio.png', tier: 4, style: 'caster', ru: 'Эустахио', en: 'Eustachio' }),
  named({ id: 'aizul', habitat: 'vaults', sprite: 'unique/aizul.png', tier: 6, style: 'caster', inflicts: poison(8), ru: 'Айзул', en: 'Aizul' }),
  named({ id: 'vashnia', habitat: 'vaults', sprite: 'unique/vashnia.png', tier: 7, style: 'stalker', ru: 'Вашния', en: 'Vashnia' }),
  named({ id: 'lamia', habitat: 'vaults', sprite: 'unique/lamia.png', tier: 8, style: 'caster', large: true, ru: 'Ламия', en: 'Lamia' }),

  // ── Именные: катакомбы ──────────────────────────────────────────────────
  named({ id: 'nergalle', habitat: 'crypt', sprite: 'unique/nergalle.png', tier: 3, style: 'caster', ru: 'Нергалль', en: 'Nergalle' }),
  named({ id: 'mara', habitat: 'crypt', kin: 'undead', sprite: 'unique/mara.png', tier: 4, style: 'caster', ru: 'Мара', en: 'Mara' }),
  named({ id: 'josephine', habitat: 'crypt', kin: 'undead', sprite: 'unique/josephine.png', tier: 5, style: 'caster', ru: 'Джозефина', en: 'Josephine' }),
  named({ id: 'murray', habitat: 'crypt', kin: 'undead', sprite: 'unique/murray.png', tier: 6, style: 'caster', ru: 'Мюррей', en: 'Murray' }),
  named({ id: 'jory', habitat: 'crypt', kin: 'undead', sprite: 'unique/jory.png', tier: 7, style: 'skirmisher', ru: 'Джори', en: 'Jory' }),
  named({ id: 'boris', habitat: 'crypt', kin: 'undead', sprite: 'unique/boris.png', tier: 8, style: 'caster', ru: 'Борис', en: 'Boris' }),
  named({ id: 'ereshkigal', habitat: 'crypt', kin: 'undead', sprite: 'unique/ereshkigal.png', tier: 9, style: 'caster', large: true, ru: 'Эрешкигаль', en: 'Ereshkigal' }),

  // ── Именные: ад ─────────────────────────────────────────────────────────
  named({ id: 'grinder', habitat: 'hell', kin: 'demon', sprite: 'unique/grinder.png', tier: 3, style: 'skirmisher', ru: 'Гриндер', en: 'Grinder' }),
  named({ id: 'purgy', habitat: 'hell', kin: 'demon', sprite: 'unique/purgy.png', tier: 4, style: 'skirmisher', ru: 'Пурги', en: 'Purgy' }),
  named({ id: 'ignacio', habitat: 'hell', kin: 'demon', sprite: 'unique/ignacio.png', tier: 7, style: 'skirmisher', ru: 'Игнасио', en: 'Ignacio' }),
  named({ id: 'geryon', habitat: 'hell', kin: 'demon', sprite: 'unique/geryon.png', tier: 7, style: 'brute', large: true, ru: 'Герион', en: 'Geryon' }),
  named({ id: 'giaggostuono', habitat: 'hell', kin: 'demon', sprite: 'unique/giaggostuono.png', tier: 8, style: 'brute', large: true, element: 'fire', inflicts: burning(7), ru: 'Гиаггостуоно', en: 'Giaggostuono' }),
  named({ id: 'azrael', habitat: 'hell', kin: 'demon', sprite: 'unique/azrael.png', tier: 8, style: 'caster', large: true, element: 'fire', inflicts: burning(9), ru: 'Азраэль', en: 'Azrael' }),
  named({ id: 'dispater', habitat: 'hell', kin: 'demon', sprite: 'unique/dispater.png', tier: 9, style: 'brute', large: true, ru: 'Диспатер', en: 'Dispater' }),
  named({ id: 'asmodeus', habitat: 'hell', kin: 'demon', sprite: 'unique/asmodeus.png', tier: 9, style: 'caster', large: true, element: 'fire', inflicts: burning(10), ru: 'Асмодей', en: 'Asmodeus' }),
  named({ id: 'cerebov', habitat: 'hell', kin: 'demon', sprite: 'unique/cerebov.png', tier: 9, style: 'brute', large: true, element: 'fire', inflicts: burning(10), ru: 'Церебов', en: 'Cerebov' }),
  named({ id: 'serpent-of-hell', habitat: 'hell', kin: 'demon', sprite: 'unique/serpent_of_hell-geh.png', tier: 9, style: 'brute', large: true, element: 'fire', inflicts: burning(9), ru: 'Змей ада', en: 'Serpent of hell' }),
];

/**
 * Нумерация профилей начинается с 400: вторая волна бестиария занимает первые
 * полторы сотни, и пересечение здесь означало бы два существа с одинаковым
 * профилем угрозы — ровно то, что запрещает каталог.
 */
const THREAT_INDEX_OFFSET = 400;

export const RARE_MONSTERS = Object.freeze(
  ROSTER.map((entry, index) => buildCreature(entry, index + THREAT_INDEX_OFFSET)),
);

export const RARE_MONSTER_NAMES = Object.freeze(Object.fromEntries(
  ROSTER.map(({ id, ru, en }) => [id, Object.freeze({ ru, en })]),
));

export const RARE_MONSTER_IDS = Object.freeze(ROSTER.map(({ id }) => id));

/**
 * Когда именной враг становится честным противником. Тир говорит, какой он
 * силы; глубина, на которой он перестаёт быть приговором, выводится из неё.
 * Драконам это правило не писано — они нарочно могут выпасть с первого этажа,
 * и в этом весь смысл.
 */
const namedMinDepth = (tier) => Math.min(12, Math.max(1, (tier - 3) * 2));

/**
 * Приметы. Дракон на третьем этаже убивает героя с одного удара, и это
 * честно только тогда, когда игрок увидел знак раньше, чем зубы. Примета
 * показывается при входе на этаж и не говорит, кто именно здесь, — только
 * что уйти отсюда стоит рассмотреть всерьёз.
 */
const OMENS = Object.freeze({
  dragon: Object.freeze({
    ru: 'Пол выжжен полосой, а кости у стены крупнее, чем бывают у людей.',
    en: 'The floor is scorched in a stripe, and the bones by the wall are too big to be anyone’s.',
  }),
  great: Object.freeze({
    ru: 'Здесь очень тихо. Даже крысы ушли с этого этажа.',
    en: 'It is very quiet here. Even the rats have left this floor.',
  }),
});

const encounter = (monster, index) => {
  const dragon = monster.kin === 'dragon';
  const friendly = monster.neutral === true;
  return Object.freeze({
    id: `rare:${monster.id}`,
    kind: friendly ? 'wanderer' : dragon ? 'beast' : 'named',
    monsterId: monster.id,
    habitat: monster.habitat,
    // Именной ждёт своей глубины, дракон может прийти когда угодно.
    minDepth: dragon || friendly ? 1 : namedMinDepth(monster.tier),
    // Слабый именной перестаёт встречаться, когда перестаёт быть событием.
    maxDepth: !dragon && !friendly && monster.tier <= 4 ? 9 : null,
    // Дракон — один к сотне с лишним этажей; именной — обычное содержимое
    // редкого броска.
    weight: dragon ? 1 : 6,
    omen: friendly ? null : dragon ? OMENS.dragon : monster.tier >= 8 ? OMENS.great : null,
    order: index,
  });
};

/** Полная таблица редких встреч. */
export const RARE_ENCOUNTERS = Object.freeze(RARE_MONSTERS.map(encounter));

export const RARE_ENCOUNTER_KINDS = Object.freeze(['wanderer', 'beast', 'named']);

/** Что вообще может встретиться на этой дороге и этой глубине. */
export function rareEncountersFor(branch, depth) {
  if (typeof branch !== 'string' || !Number.isInteger(depth) || depth < 1) return Object.freeze([]);
  return Object.freeze(RARE_ENCOUNTERS.filter((entry) => (
    (entry.habitat === 'any' || entry.habitat === branch)
    && depth >= entry.minDepth
    && (entry.maxDepth === null || depth <= entry.maxDepth)
  )));
}

const isSeededRng = (rng) => Boolean(rng)
  && typeof rng.next === 'function'
  && typeof rng.int === 'function';

/** Шанс встретить чудовище не по глубине на этом этаже. */
export function beastChanceAt(depth) {
  const floor = Number.isInteger(depth) && depth >= 1 ? depth : 1;
  return RARE_ENCOUNTER_CHANCE.beast + floor * RARE_ENCOUNTER_CHANCE.beastPerDepth;
}

function weightedPick(rng, pool) {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let ticket = rng.next() * total;
  for (const entry of pool) {
    ticket -= entry.weight;
    if (ticket < 0) return entry;
  }
  return pool[pool.length - 1];
}

/**
 * Броски на этаж. Сначала — чудовище не по глубине, отдельным низким шансом;
 * если его нет, то именной враг. Порядок важен: иначе на дороге, где именных
 * ещё нет, весь шанс достался бы дракону.
 *
 * Поток случайности у этих бросков свой, и число обращений к нему не зависит
 * от исхода — поэтому добавить или убрать редкую встречу не сдвигает на этаже
 * ничего другого.
 */
export function rollRareEncounter({ rng, branch, depth } = {}) {
  if (!isSeededRng(rng)) throw new TypeError('Rare encounters require a seeded RNG');
  const beastTicket = rng.next();
  const wandererTicket = rng.next();
  const namedTicket = rng.next();
  const pickTicket = rng.next();
  const pool = rareEncountersFor(branch, depth);
  if (pool.length === 0) return null;
  const draw = (kind, ticket) => {
    const here = pool.filter((entry) => entry.kind === kind);
    if (here.length === 0) return null;
    return weightedPick({ next: () => ticket }, here);
  };
  if (beastTicket < beastChanceAt(depth)) {
    const beast = draw('beast', pickTicket);
    if (beast) return beast;
  }
  if (wandererTicket < RARE_ENCOUNTER_CHANCE.wanderer) {
    const friendly = draw('wanderer', pickTicket);
    if (friendly) return friendly;
  }
  if (namedTicket < RARE_ENCOUNTER_CHANCE.named) {
    const named = draw('named', pickTicket);
    if (named) return named;
  }
  return null;
}

export function rareEncounterById(id) {
  return RARE_ENCOUNTERS.find((entry) => entry.id === id) ?? null;
}
