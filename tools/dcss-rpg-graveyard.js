/**
 * Кладбище: место, где прошлый забег объясняет нынешнему, на чём он кончился.
 *
 * Иван: «придумал новый ивент локация для спавна — кладбище, сделать там туман
 * сильнее и гробы, и пусть там ходит добрый НПС призрак игрока, которого убили,
 * и даёт совет, что делать, чтобы не повторить пред ошибку».
 *
 * Игра уже хранит последние четыре смерти (`dcss-rpg-bones.js`): этаж, уровень,
 * кто убил, во что был одет, как выглядел. До сих пор из этой записи поднимался
 * только сторож — призрак над находкой, который нападает, если находку взять.
 * Советчик — второе её применение, и он намеренно устроен наоборот: не трогает
 * героя вовсе, стоит у своей могилы и говорит.
 *
 * Три правила держат это вместе.
 *
 * - **Совет выводится, а не пишется.** В записи лежит `killerId`, а в каталогах
 *   — тир, стихия, скорость, погоня и зоркость того, кто убил. Из них следует,
 *   что именно надо было сделать иначе, и это про конкретную смерть, а не
 *   «будь осторожнее». Ни одна подсказка не появляется без данных под ней.
 * - **Нет смерти — нет кладбища.** Иван выбрал этот вариант из трёх: место
 *   существует только тогда, когда есть кому там стоять. Иначе пришлось бы
 *   ставить чужого призрака с общим советом, и обещание «это твой прошлый
 *   герой» перестало бы быть правдой с первого же раза.
 * - **Сторож остаётся.** Кладбище не отменяет призрака над находкой: у них
 *   разные места и разные роли, и игрок различает их по обстановке — тот стоит
 *   над добычей на обычном этаже, этот ходит между саркофагами в тумане.
 */

import { monsterById } from './dcss-rpg-content.js';
import { passiveCreatureById } from './dcss-rpg-passive.js';
import { runEndSourceName } from './dcss-rpg-run-summary.js';

/** Кладбище — часть катакомб: там уже свои гробницы, кости и надгробия. */
export const GRAVEYARD_BRANCH = 'crypt';

/**
 * Доля этажей катакомб, на которых кладбище действительно есть.
 *
 * Не «иногда», а «нечасто»: встреча с собой должна оставаться событием. У
 * сторожа этот шанс 0.25 на этаж, где запомнена смерть; здесь ниже, потому что
 * кладбище — целая комната, а не одно существо, и в катакомбах всего девять
 * этажей.
 */
export const GRAVEYARD_CHANCE = 0.22;

/** Картинки кладбища. Саркофаги и кости в библиотеке есть, рисовать нечего. */
export const GRAVEYARD_ASSET_PATHS = Object.freeze([
  'dngn/vaults/sarcophagus_sealed.png',
  'dngn/vaults/sarcophagus_pedestal_left.png',
  'dngn/vaults/sarcophagus_pedestal_right.png',
  'dngn/altars/yredelemnul.png',
]);

/**
 * Насколько гуще туман на кладбище, множителем к обычной дальности видимости.
 *
 * Иван просил «туман сильнее». Сильнее — значит видно ближе, а не темнее:
 * темнота у нас уже есть у света факела, и второй способ ничего не увидеть
 * читался бы как поломка, а не как погода.
 */
export const GRAVEYARD_SIGHT = 0.68;

/** Тот же приём, что у `ghostWakes`: решение от сида и этажа, а не от броска. */
export function graveyardWakes({ seed = 0, depth = 1, chance = GRAVEYARD_CHANCE } = {}) {
  if (!Number.isFinite(seed) || !Number.isFinite(depth)) return false;
  if (!(chance > 0)) return false;
  if (chance >= 1) return true;
  let value = (Math.imul(seed >>> 0, 0x85ebca6b) ^ Math.imul(depth + 7, 0x27d4eb2f)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0x165667b1);
  value = Math.imul(value ^ (value >>> 16), 0xd3a2646c);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296 < chance;
}

/**
 * Есть ли кладбище на этом этаже.
 *
 * Требует и ветку, и запомненную смерть. Запись берётся любая из четырёх — не
 * обязательно с этого этажа: кладбище хоронит прошлые забеги, а не прошлый
 * этаж, и привязка к глубине оставила бы фичу почти невидимой.
 */
export function graveyardOnFloor({ branch, seed, depth, bones } = {}) {
  if (branch !== GRAVEYARD_BRANCH) return null;
  const buried = Array.isArray(bones) ? bones : [];
  if (buried.length === 0) return null;
  if (!graveyardWakes({ seed, depth })) return null;
  // Самая свежая смерть — та, о которой игрок ещё помнит сам.
  return buried[0] ?? null;
}

/** Комнаты, которые уже кем-то заняты: у них своя обстановка и свой смысл. */
const CLAIMED_ARCHETYPES = Object.freeze(new Set([
  'wayfarer-refuge', 'descent-chamber', 'treasure-vault', 'wayside-inn', 'merchant-alcove',
]));

/**
 * Какая комната становится кладбищем.
 *
 * Выбор от сида и глубины, а не от броска: этаж, собранный из того же
 * сохранения, обязан выглядеть так же. Стартовая комната, спуск, сокровищница,
 * трактир и лавка не годятся — у каждой своя работа, и кладбище поверх неё
 * читалось бы как сбой, а не как место.
 */
export function graveyardRoomIndex(level) {
  const rooms = Array.isArray(level?.rooms) ? level.rooms : [];
  if (rooms.length === 0) return null;
  const plans = Array.isArray(level.roomPlans) ? level.roomPlans : [];
  const claimed = new Set(
    plans.filter(({ archetypeId }) => CLAIMED_ARCHETYPES.has(archetypeId))
      .map(({ roomIndex }) => roomIndex),
  );
  const free = rooms.map((_, index) => index).filter((index) => index !== 0 && !claimed.has(index));
  if (free.length === 0) return null;
  const seed = Number.isInteger(level.seed) ? level.seed : 0;
  const depth = Number.isInteger(level.depth) ? level.depth : 1;
  let value = (Math.imul(seed >>> 0, 0x2545f491) ^ Math.imul(depth + 3, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x85ebca6b) >>> 0;
  return free[(value ^ (value >>> 13)) % free.length];
}

/**
 * Что стоит за `killerId`.
 *
 * Строка свободной формы, потому что убить может не только монстр: `hunger`,
 * `chasm`, `trap:<id>`, `wildlife:<id>`, `spell:storm`. Метка после `@` — это
 * прилагательное к существу («бешеный волк»), к разбору причины отношения не
 * имеет.
 */
const HAZARDS = Object.freeze({ hunger: 'hunger', chasm: 'chasm', equipment: 'gear', pack: 'gear' });

export function killerKind(killerId) {
  if (typeof killerId !== 'string' || killerId === '') return { kind: 'unknown', id: null };
  const [full] = killerId.split('@');
  const colon = full.indexOf(':');
  if (colon < 0) {
    return HAZARDS[full] ? { kind: HAZARDS[full], id: full } : { kind: 'monster', id: full };
  }
  const prefix = full.slice(0, colon);
  const id = full.slice(colon + 1);
  if (prefix === 'wildlife') return { kind: 'wildlife', id };
  if (prefix === 'trap') return { kind: 'trap', id };
  if (prefix === 'spell') return { kind: 'own-spell', id };
  if (prefix === 'potion') return { kind: 'poison', id };
  if (prefix === 'artifact') return { kind: 'artifact', id };
  return { kind: 'other', id: full };
}

/** Существо, которое убило, если это было существо. */
export function killerCreature(killerId) {
  const { kind, id } = killerKind(killerId);
  if (kind === 'monster') return monsterById(id) ?? null;
  if (kind === 'wildlife') return passiveCreatureById(id) ?? null;
  return null;
}

/**
 * Уровень, с которым на этот этаж приходят не в обрез.
 *
 * Цифра не выдумана: у сторожа уже есть потолок `2 + depth * 2`, то есть
 * настолько герой может быть сильным к этой глубине. Половина от потолка —
 * граница, ниже которой этаж бьёт больнее, чем герой успевает отвечать.
 */
export const EXPECTED_LEVEL = (depth) => 1 + Math.max(1, depth);

const SLOT_ARMOUR = 'body';
const SLOT_SHIELD = 'hand2';
const SLOT_WEAPON = 'hand1';

/**
 * Разбор смерти: по одному уроку на то, что в записи действительно есть.
 *
 * Возвращается упорядоченный список — от «вот кто это был» к «вот чего у тебя
 * не было». Порядок и есть приоритет: интерфейс показывает первые, а не все,
 * потому что совет из восьми пунктов — это не совет.
 */
export function ghostLessons({ bones, language = 'ru' } = {}) {
  if (!bones || typeof bones !== 'object') return [];
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = LESSONS[locale];
  const depth = Number.isInteger(bones.depth) ? bones.depth : 1;
  const level = Number.isInteger(bones.level) ? bones.level : 1;
  const gear = Array.isArray(bones.gear) ? bones.gear : [];
  const wears = (slot) => gear.some((piece) => piece.slot === slot);
  const { kind } = killerKind(bones.killerId);
  const creature = killerCreature(bones.killerId);
  const name = runEndSourceName(bones.killerId, locale);

  const lessons = [];
  const add = (id, text) => lessons.push(Object.freeze({ id, text }));

  if (kind === 'hunger') add('hunger', copy.hunger);
  else if (kind === 'chasm') add('chasm', copy.chasm);
  else if (kind === 'gear') add('gear', copy.gear);
  else if (kind === 'trap') add('trap', copy.trap);
  else if (kind === 'own-spell') add('ownSpell', copy.ownSpell);
  else if (kind === 'poison') add('poison', copy.poison);
  else if (name) add('killer', copy.killer(name));

  if (creature) {
    if (creature.element) add('element', copy.element(creature.element));
    const ailment = copy.ailments[creature.inflicts?.id];
    if (ailment) add('inflicts', ailment);
    if (creature.flying) add('flying', copy.flying);
    if (creature.large) add('large', copy.large);
    if ((creature.threat?.pursuit ?? 0) >= 6) add('relentless', copy.relentless);
    if ((creature.threat?.vision ?? 0) >= 8) add('farsighted', copy.farsighted);
    if ((creature.speed ?? 1) >= 1.3) add('swift', copy.swift);
  }

  if (level < EXPECTED_LEVEL(depth)) add('underlevelled', copy.underlevelled(level, depth));
  if (!wears(SLOT_ARMOUR)) add('noArmour', copy.noArmour);
  else if (!wears(SLOT_SHIELD)) add('noShield', copy.noShield);
  if (!wears(SLOT_WEAPON)) add('bareHanded', copy.bareHanded);

  return Object.freeze(lessons);
}

/** Сколько уроков призрак произносит вслух. Больше — уже не совет, а лекция. */
export const SPOKEN_LESSONS = 2;

/** Готовая речь: где это было и что с этим делать. */
export function ghostSpeech({ bones, language = 'ru' } = {}) {
  if (!bones) return null;
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = COPY[locale];
  const lessons = ghostLessons({ bones, language });
  if (lessons.length === 0) return null;
  return Object.freeze({
    where: copy.where(bones.depth, bones.level),
    lessons: Object.freeze(lessons.slice(0, SPOKEN_LESSONS).map(({ text }) => text)),
    parting: copy.parting,
  });
}

/** Стихий в игре ровно две; остальное — запасная формулировка, а не список. */
const ELEMENTS = Object.freeze({
  ru: Object.freeze({ fire: 'огнём', ice: 'холодом' }),
  en: Object.freeze({ fire: 'fire', ice: 'cold' }),
});

const LESSONS = Object.freeze({
  ru: Object.freeze({
    killer: (name) => `Меня добил ${name}. Не сходись с ним вплотную, пока не поймёшь его удар.`,
    hunger: 'Меня свалил не зверь, а голод. Еду береги строже, чем зелья.',
    chasm: 'Я шагнул в провал. Тьма у края — это не пол.',
    trap: 'Меня убила ловушка. Смотри под ноги там, где коридор слишком удобный.',
    ownSpell: 'Меня убила собственная молния. В воде она возвращается.',
    poison: 'Я выпил не то. Незнакомое зелье пьют сытым и здоровым, а не в бою.',
    element: (element) => `Он бьёт ${ELEMENTS.ru[element] ?? 'своей стихией'} — от этого спасает не броня, а расстояние.`,
    gear: 'Меня доконало собственное снаряжение. Проклятую вещь снимают до того, как станет некуда.',
    ailments: Object.freeze({
      burning: 'Он поджигает. Горящего добивает не он, а сам огонь — гаси сразу.',
      poison: 'Он травит. Яд считает время, а не удары: лечись до того, как добежишь до выхода.',
      chilled: 'Он холодит — замедленный не убегает. Отходи раньше, чем понадобится.',
      frozen: 'Он сковывает. Оцепеневшему не помогает ни щит, ни скорость, только расстояние.',
      wet: 'Он мочит. Мокрым нельзя бить молнией — вернётся в тебя.',
    }),
    flying: 'Он летает: ни пропасть, ни вода его не держат.',
    large: 'Он крупный — в узком коридоре его не обойти. Дерись там, где есть куда отступить.',
    relentless: 'Он не отстаёт. Убегать от него бесполезно, ищи дверь.',
    farsighted: 'Он видит дальше, чем светит факел. Подкрасться не выйдет.',
    swift: 'Он быстрее тебя. Первый удар должен быть твой.',
    underlevelled: (level, depth) => `Я спустился на ${depth}-й этаж ${level}-м уровнем. Этаж рос быстрее меня.`,
    noArmour: 'На мне не было брони. Любая лучше, чем никакой.',
    noShield: 'Вторая рука была пуста. Щит держит тот удар, который ты не успел увидеть.',
    bareHanded: 'Я дрался без оружия. Даже ржавый меч — это меч.',
  }),
  en: Object.freeze({
    killer: (name) => `${name} finished me. Do not close with it until you know its swing.`,
    hunger: 'No beast took me — hunger did. Guard food harder than potions.',
    chasm: 'I stepped into the pit. Dark at the edge is not floor.',
    trap: 'A trap killed me. Watch your feet where the corridor is too convenient.',
    ownSpell: 'My own lightning killed me. In water it comes back.',
    poison: 'I drank the wrong thing. An unknown potion is for a full stomach, not a fight.',
    element: (element) => `It strikes with ${ELEMENTS.en[element] ?? 'its element'} — distance saves you there, not armour.`,
    gear: 'My own gear finished me. A cursed thing comes off before there is nowhere left to go.',
    ailments: Object.freeze({
      burning: 'It sets you alight. What finishes a burning hero is the fire, not the beast — put it out at once.',
      poison: 'It poisons. Venom counts time, not blows: treat it before you run for the stair.',
      chilled: 'It chills — the slowed do not get away. Fall back earlier than you need to.',
      frozen: 'It locks you up. Neither shield nor speed helps the frozen, only distance.',
      wet: 'It soaks you. Do not call lightning while wet — it comes back.',
    }),
    flying: 'It flies: neither pit nor water holds it.',
    large: 'It is large — a narrow corridor gives you no way around. Fight where you can fall back.',
    relentless: 'It does not give up. Running is useless; look for a door.',
    farsighted: 'It sees further than the torch reaches. You will not sneak past.',
    swift: 'It is faster than you. The first blow has to be yours.',
    underlevelled: (level, depth) => `I went down to floor ${depth} at level ${level}. The floor grew faster than I did.`,
    noArmour: 'I wore no armour. Any is better than none.',
    noShield: 'My off hand was empty. A shield stops the blow you never saw.',
    bareHanded: 'I fought bare-handed. Even a rusty sword is a sword.',
  }),
});

const COPY = Object.freeze({
  ru: Object.freeze({
    name: 'Призрак прошлого героя',
    summary: 'Он не нападёт. Он уже своё отходил.',
    action: 'Поговорить с призраком',
    place: 'Кладбище',
    placeSummary: 'Саркофаги в тумане. Один из них — твой.',
    where: (depth, level) => `Я дошёл до ${depth}-го этажа. Был ${level}-го уровня.`,
    parting: 'Дальше иди сам. Я останусь здесь.',
    spoken: 'Призрак заговорил',
    silent: 'Призрак молчит',
  }),
  en: Object.freeze({
    name: 'The ghost of a past hero',
    summary: 'It will not attack. It has done its walking.',
    action: 'Speak to the ghost',
    place: 'The graveyard',
    placeSummary: 'Sarcophagi in the fog. One of them is yours.',
    where: (depth, level) => `I reached floor ${depth}. I was level ${level}.`,
    parting: 'Go on alone. I am staying here.',
    spoken: 'The ghost spoke',
    silent: 'The ghost is silent',
  }),
});

export function graveyardCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}
