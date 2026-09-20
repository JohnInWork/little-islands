/**
 * Кооп на двоих: правила отряда, а не одного героя.
 *
 * Иван: «мне надо, чтобы мы вдвоём с ним полноценно играли и развивали каждый
 * своего героя, но локально, на одном экране телевизора, на геймпадах».
 *
 * Предыдущий подход — отдать второму игроку спутника — упирался в то, что
 * спутник не герой: у него нет уровня, опыта и своего развития. Здесь героя
 * два, и они равны во всём: свой опыт, свой уровень, свой кошелёк, свой рюкзак,
 * своё здоровье. Общее — только этаж.
 *
 * Модуль намеренно не знает ни про холст, ни про геймпады, ни про DOM: он
 * отвечает на вопросы «сколько опыта до уровня», «кому досталось», «можно ли
 * поднять упавшего», «пора ли вниз». Всё остальное — дело клиента.
 *
 * Развитие нарочно своё, а не из основной игры: там уровень тянет за собой
 * навыки, характеристики и сохранение, а здесь нужен отдельный клиент, который
 * запускается и сразу играет. Кривая простая и честная — её видно целиком.
 */

/**
 * Как выглядят двое.
 *
 * Голое базовое тело — заготовка, а не герой, поэтому каждый собирается слоями.
 * Одежда разная намеренно: через полтора метра от телевизора игроки различают
 * друг друга силуэтом и цветом, а не именем.
 */
export const COOP_HERO_LOOKS = Object.freeze([
  Object.freeze([
    'player/base/human_m.png',
    'player/legs/pants_black.png',
    'player/body/leather_red.png',
    'player/hair/brown1.png',
  ]),
  Object.freeze([
    'player/base/human_f.png',
    'player/legs/leg_armour00.png',
    'player/body/leather_green.png',
    'player/hair/arwen.png',
  ]),
]);

export const COOP_ASSET_PATHS = Object.freeze([...new Set(COOP_HERO_LOOKS.flat())]);

/** Сколько опыта стоит следующий уровень. Растёт, но не отвесно. */
export function experienceForLevel(level) {
  if (!Number.isInteger(level) || level < 1) throw new RangeError('Уровень — целое от единицы');
  return Math.round(12 * level ** 1.45);
}

/** Уровень по накопленному опыту и остаток до следующего. */
export function levelFromExperience(xp) {
  const total = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  let level = 1;
  let spent = 0;
  while (level < MAX_LEVEL && total - spent >= experienceForLevel(level)) {
    spent += experienceForLevel(level);
    level += 1;
  }
  const need = level < MAX_LEVEL ? experienceForLevel(level) : 0;
  return Object.freeze({ level, into: total - spent, need });
}

export const MAX_LEVEL = 30;

/** Что даёт уровень. Немного и понятно: живучесть и удар. */
export const LEVEL_GAIN = Object.freeze({ maxHp: 6, attack: 2 });

/**
 * Голый герой против тех же монстров.
 *
 * В основной игре к первому этажу у героя есть броня, оружие и навыки; здесь
 * он выходит как есть, а монстры приходят с теми же числами. Замер показал
 * честную, но бессмысленную картину: двенадцать урона при тридцати четырёх
 * здоровья — три удара, и игрок лежит через четыре секунды после старта.
 * Поэтому запас больше, а чужой удар считается с поправкой ниже.
 */
export const HERO_BASE = Object.freeze({ maxHp: 62, attack: 9, defense: 2, speed: 2.9 });

/** Во столько раз слабее бьют монстры: поправка на отсутствие брони. */
export const MONSTER_DAMAGE_SCALE = 0.55;

/**
 * Герой отряда.
 *
 * `slot` — не украшение: по нему клиент решает, чей геймпад, чья половина
 * экрана и чей цвет. Два героя, различимые только по имени, на телевизоре
 * через полтора метра неразличимы вовсе.
 */
export function createCoopHero({ slot, x = 0, y = 0, appearance = null } = {}) {
  if (slot !== 1 && slot !== 2) throw new RangeError('Место в отряде — 1 или 2');
  const stats = statsForLevel(1);
  return {
    slot,
    x,
    y,
    facing: 1,
    hp: stats.maxHp,
    xp: 0,
    gold: 0,
    pack: [],
    attackCooldown: 0,
    hitFlash: 0,
    downed: 0,
    revives: 0,
    kills: 0,
    appearance,
  };
}

/** Числа героя на его уровне: без экипировки, но честно растущие. */
export function statsForLevel(level) {
  const steps = Math.max(0, Math.min(MAX_LEVEL, level) - 1);
  return Object.freeze({
    maxHp: HERO_BASE.maxHp + steps * LEVEL_GAIN.maxHp,
    attack: HERO_BASE.attack + steps * LEVEL_GAIN.attack,
    defense: HERO_BASE.defense,
    speed: HERO_BASE.speed,
  });
}

/** Полные числа героя с учётом того, что он несёт в руках. */
export function coopHeroStats(hero) {
  const { level } = levelFromExperience(hero?.xp ?? 0);
  const base = statsForLevel(level);
  const carried = Array.isArray(hero?.pack) ? hero.pack : [];
  const bonus = carried.reduce((total, entry) => total + (entry?.attack ?? 0), 0);
  return Object.freeze({ ...base, level, attack: base.attack + bonus });
}

/**
 * Опыт достаётся тому, кто добил.
 *
 * Делить поровну заманчиво и неправильно: тогда второй игрок может не драться
 * вовсе и расти наравне, а весь смысл двух героев в том, что каждый свой.
 * Половину, впрочем, получает и напарник, если он рядом, — иначе выгодно
 * добивать чужое и невыгодно помогать.
 */
export const ASSIST_SHARE = 0.5;

export function awardKill({ killer, assist = null, xp = 0, gold = 0, nearby = false }) {
  const amount = Number.isFinite(xp) && xp > 0 ? Math.round(xp) : 0;
  killer.xp += amount;
  killer.gold += Number.isFinite(gold) && gold > 0 ? Math.round(gold) : 0;
  killer.kills += 1;
  if (assist && nearby) assist.xp += Math.round(amount * ASSIST_SHARE);
  return killer.xp;
}

/** Сколько секунд напарник поднимает упавшего, стоя рядом. */
export const REVIVE_SECONDS = 3;

/** Сколько здоровья у поднятого: половина, чтобы подъём не отменял падение. */
export const REVIVE_SHARE = 0.5;

/**
 * Упавший не выбывает: его поднимает второй.
 *
 * Это единственная причина, по которой вдвоём интереснее, чем вдвоём по
 * очереди: смерть одного становится задачей другого, а не концом вечера. Если
 * упали оба — забег кончился, и это честно: поднимать некому.
 */
export function tickRevive({ downed, helper, delta }) {
  if (!downed || downed.downed <= 0) return { reviving: false, progress: 0, revived: false };
  if (!helper || helper.downed > 0) return { reviving: false, progress: downed.revives, revived: false };
  const step = Number.isFinite(delta) ? Math.max(0, delta) : 0;
  const progress = downed.revives + step;
  if (progress < REVIVE_SECONDS) return { reviving: true, progress, revived: false };
  return { reviving: false, progress: 0, revived: true };
}

export function reviveHero(hero) {
  const { maxHp } = coopHeroStats(hero);
  hero.downed = 0;
  hero.revives = 0;
  hero.hp = Math.max(1, Math.round(maxHp * REVIVE_SHARE));
  return hero;
}

/** Отряд жив, пока жив хоть кто-то. */
export function partyAlive(party) {
  return party.some((hero) => hero.downed === 0);
}

/**
 * Вниз идут вместе.
 *
 * Спуск по первому пришедшему увёл бы одного игрока с этажа, где остался
 * второй, — и получилась бы игра в догонялки с лестницей. Поэтому лестница
 * ждёт обоих: стоять на ней должны оба, а упавший не считается стоящим.
 */
export function canDescend({ party, onStair }) {
  if (!Array.isArray(party) || party.length === 0) return false;
  return party.every((hero) => hero.downed === 0 && onStair(hero));
}
