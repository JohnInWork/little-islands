import { markedMonsterName } from './dcss-rpg-monster-marks.js';
/**
 * Run summary: what the death/victory screen shows. Pure and bilingual; the
 * runtime only feeds persisted `run.stats`, the hero and the seed.
 */

export const RUN_END_STATUSES = Object.freeze(['dead', 'victory', 'retired']);

const pair = (ru, en) => Object.freeze({ ru, en });

/** RU/EN names for anything that can end a run: monsters, fauna, effects, traps. */
export const RUN_END_SOURCE_NAMES = Object.freeze({
  goblin: pair('Гоблин', 'Goblin'),
  'electric-eel': pair('Электрический угорь', 'Electric eel'),
  'tomb-revenant': pair('Гробничный ревенант', 'Tomb revenant'),
  siren: pair('Сирена', 'Siren'),
  'merfolk-impaler': pair('Мерфолк-копейщик', 'Merfolk impaler'),
  'spell:storm': pair('Собственная молния', 'Own lightning'),
  bat: pair('Летучая мышь', 'Bat'),
  'chest-mimic': pair('Мимик', 'Mimic'),
  'zombie-rat': pair('Зомби-крыса', 'Zombie rat'),
  gnoll: pair('Гнолл', 'Gnoll'),
  orc: pair('Орк', 'Orc'),
  spider: pair('Паук', 'Spider'),
  'orc-priest': pair('Орк-жрец', 'Orc priest'),
  wolf: pair('Волк', 'Wolf'),
  'orc-warrior': pair('Орк-воин', 'Orc warrior'),
  'city-guard': pair('Городской стражник', 'City guard'),
  'city-priest': pair('Жрец', 'Priest'),
  'city-recruiter': pair('Трактирщик', 'Innkeeper'),
  'tavern-drifter': pair('Бродяга', 'Drifter'),
  'tavern-sellsword': pair('Наёмный меч', 'Sellsword'),
  'tavern-veteran': pair('Ветеранка', 'Veteran'),
  'tavern-knight-errant': pair('Странствующий рыцарь', 'Knight errant'),
  'hired-drifter': pair('Бродяга', 'Drifter'),
  'hired-sellsword': pair('Наёмный меч', 'Sellsword'),
  'hired-veteran': pair('Ветеранка', 'Veteran'),
  'hired-knight-errant': pair('Странствующий рыцарь', 'Knight errant'),
  'crystal-warden': pair('Кристальный сторож', 'Crystal Warden'),
  'iron-golem': pair('Железный голем', 'Iron Golem'),
  keyholder: pair('Ключница', 'The Keyholder'),
  dissolution: pair('Растворение', 'Dissolution'),
  'nameless-thing': pair('Безымянное', 'The Nameless'),
  'world-serpent': pair('Мировой змей', 'World Serpent'),
  'raised-skeleton': pair('Поднятый скелет', 'Raised skeleton'),
  'raised-ghoul': pair('Поднятый упырь', 'Raised ghoul'),
  'raised-warden': pair('Поднятый страж', 'Raised warden'),
  'player-ghost': pair('Призрак героя', "Hero's ghost"),
  'grove-warden': pair('Хранитель рощи', 'Grove warden'),
  'moor-catoblepas': pair('Болотный катоблепас', 'Moor catoblepas'),
  'storm-raiju': pair('Грозовой райдзю', 'Storm raiju'),
  'moor-naga': pair('Болотная нага', 'Moor naga'),
  'wild-sheep': pair('Дикая овца', 'Wild sheep'),
  'jackal': pair('Шакал', 'Jackal'),
  'forest-adder': pair('Лесная гадюка', 'Forest adder'),
  'wild-boar': pair('Кабан', 'Wild boar'),
  'killer-bee': pair('Пчела-убийца', 'Killer bee'),
  'faun': pair('Фавн', 'Faun'),
  'field-scorpion': pair('Полевой скорпион', 'Field scorpion'),
  'black-bear': pair('Чёрный медведь', 'Black bear'),
  'dryad': pair('Дриада', 'Dryad'),
  'anaconda': pair('Анаконда', 'Anaconda'),
  'death-yak': pair('Смертояк', 'Death yak'),
  'polar-bear': pair('Белый медведь', 'Polar bear'),
  'griffon': pair('Грифон', 'Griffon'),
  'bull-elephant': pair('Слон-секач', 'Bull elephant'),
  'tamed-sheep': pair('Прирученная овца', 'Tamed sheep'),
  'tamed-cave-rodent': pair('Прирученный грызун', 'Tamed cave rodent'),
  'tamed-cave-toad': pair('Прирученная жаба', 'Tamed cave toad'),
  'tamed-cave-turtle': pair('Прирученная черепаха', 'Tamed shell turtle'),
  'tamed-hell-hog': pair('Прирученный адский боров', 'Tamed hell hog'),
  'tamed-hog': pair('Прирученный кабан', 'Tamed hog'),
  'tamed-yak': pair('Прирученный як', 'Tamed yak'),
  'city-captain': pair('Капитан стражи', 'Watch captain'),
  ghost: pair('Призрак', 'Ghost'),
  'zombie-hound': pair('Зомби-пёс', 'Zombie hound'),
  ogre: pair('Огр', 'Ogre'),
  'ashen-guardian': pair('Пепельный хранитель', 'Ashen guardian'),
  'sanctum-guardian': pair('Хранитель святилища', 'Sanctum guardian'),
  'depth-warden': pair('Страж глубин', 'Depth warden'),
  'orc-wizard': pair('Орк-колдун', 'Orc wizard'),
  vampire: pair('Вампир', 'Vampire'),
  'crimson-imp': pair('Багровый бес', 'Crimson imp'),
  'flying-skull': pair('Летающий череп', 'Flying skull'),
  'hell-hound': pair('Адская гончая', 'Hell hound'),
  'vampire-knight': pair('Рыцарь-вампир', 'Vampire knight'),
  'smoke-demon': pair('Дымный демон', 'Smoke demon'),
  wyvern: pair('Виверна', 'Wyvern'),
  lich: pair('Лич', 'Lich'),
  'ice-dragon': pair('Ледяной дракон', 'Ice dragon'),
  balrug: pair('Балруг', 'Balrug'),
  'golden-dragon': pair('Золотой дракон', 'Golden dragon'),
  'wildlife:sheep': pair('Овца', 'Sheep'),
  'wildlife:cave-rodent': pair('Пещерный грызун', 'Cave rodent'),
  'wildlife:cave-toad': pair('Пещерная жаба', 'Cave toad'),
  'wildlife:cave-turtle': pair('Панцирная черепаха', 'Shell turtle'),
  'wildlife:hell-hog': pair('Адский боров', 'Hell hog'),
  'wildlife:hog': pair('Кабан', 'Hog'),
  'wildlife:yak': pair('Як', 'Yak'),
  // Not a creature, but it is the thing that killed you, and a death screen
  // that says «неизвестно» teaches nothing.
  hunger: pair('Голод', 'Starvation'),
  'effect:burning': pair('Огонь', 'Fire'),
  'effect:poison': pair('Яд', 'Poison'),
  'trap:blade-trap': pair('Ловушка с лезвиями', 'Blade trap'),
  'potion:venom': pair('Ядовитое зелье', 'Venom potion'),
});

const COPY = Object.freeze({
  ru: Object.freeze({
    dead: 'Герой пал',
    victory: 'Победа',
    retired: 'Ушёл живым',
    depth: 'Этаж',
    time: 'Время',
    kills: 'Убито врагов',
    gold: 'Реальное золото',
    level: 'Уровень',
    seed: 'Seed',
    cause: 'Причина',
    unknownCause: 'Неизвестно',
    restart: 'Начать новый забег',
  }),
  en: Object.freeze({
    dead: 'The hero fell',
    victory: 'Victory',
    retired: 'Walked away',
    depth: 'Floor',
    time: 'Time',
    kills: 'Kills',
    gold: 'Real gold',
    level: 'Level',
    seed: 'Seed',
    cause: 'Cause',
    unknownCause: 'Unknown',
    restart: 'Start a new run',
  }),
});

/**
 * What killed the hero, in words.
 *
 * A marked creature is written as `wolf@rabid`, because the killer id was
 * always a free-form string on the save and a new field for this would be a
 * save migration for one adjective. The mark is the half after the `@`, and an
 * id with no `@` is read exactly as it was before.
 */
export function runEndSourceName(sourceId, language = 'ru') {
  const locale = language === 'en' ? 'en' : 'ru';
  if (typeof sourceId !== 'string') return null;
  const [id, markId] = sourceId.split('@');
  const entry = RUN_END_SOURCE_NAMES[id];
  if (!entry) return null;
  return markId ? markedMonsterName(entry[locale], markId, locale) : entry[locale];
}

/** `m:ss` under an hour, `h:mm:ss` beyond; never negative or fractional. */
export function formatRunDuration(seconds) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const pad = (value) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

export function runSummaryModel({
  status,
  depthLabel,
  stats,
  level,
  gold,
  seed,
  language = 'ru',
} = {}) {
  if (!RUN_END_STATUSES.includes(status)) throw new TypeError('Run summary requires a terminal status');
  if (typeof depthLabel !== 'string' || depthLabel.length === 0) throw new TypeError('Run summary requires a depth label');
  if (!Number.isInteger(level) || level < 1) throw new TypeError('Run summary requires the hero level');
  if (!Number.isInteger(gold) || gold < 0) throw new TypeError('Run summary requires the gold total');
  if (!Number.isInteger(seed) || seed < 0) throw new TypeError('Run summary requires the run seed');
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = COPY[locale];
  const kills = Number.isInteger(stats?.kills) && stats.kills >= 0 ? stats.kills : 0;
  const activeSeconds = Number.isFinite(stats?.activeSeconds) && stats.activeSeconds >= 0 ? stats.activeSeconds : 0;
  const rows = [
    { id: 'depth', label: copy.depth, value: depthLabel },
    { id: 'time', label: copy.time, value: formatRunDuration(activeSeconds) },
    { id: 'kills', label: copy.kills, value: String(kills) },
    { id: 'gold', label: copy.gold, value: String(gold) },
    { id: 'level', label: copy.level, value: String(level) },
    { id: 'seed', label: copy.seed, value: String(seed) },
  ];
  if (status === 'dead' && typeof stats?.killerId === 'string' && stats.killerId.length > 0) {
    rows.push({ id: 'cause', label: copy.cause, value: runEndSourceName(stats.killerId, locale) ?? copy.unknownCause });
  }
  const frozenRows = Object.freeze(rows.map((row) => Object.freeze(row)));
  return Object.freeze({
    status,
    title: copy[status],
    rows: frozenRows,
    restart: copy.restart,
    ariaLabel: `${copy[status]}. ${frozenRows.map((row) => `${row.label}: ${row.value}`).join('. ')}`,
  });
}
