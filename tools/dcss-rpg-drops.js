/**
 * Что остаётся от убитого.
 *
 * До сих пор с монстров падало только золото — прямо в кошелёк, без клетки и
 * без выбора. Всё, что лежит на этаже, клал генератор, и это значило вот что:
 * надев кольцо невидимости, можно было обойти этаж, забрать всё и не тронуть
 * никого. Иван: «какой-нибудь самый жёсткий лут может быть как раз-таки
 * именно с босса, и ты не можешь никак у него его забрать, кроме как не
 * убить. Это, по-моему, круто и должно быть в игре».
 *
 * Три правила, на которых это стоит:
 *
 * - **Роняют не все.** Крыса с мечом — шум, а не награда. Роняют стражи
 *   этажей, именные и небольшой список тех, у кого вещь есть по смыслу:
 *   у орка-рыцаря — его железо, у кузнечного голема — его перчатки.
 * - **Вещь не выше того, кто её нёс.** Тир существа задаёт потолок редкости
 *   (`dropBand`), и это проверяется тестом, а не совестью: иначе именной
 *   второго тира, встреченный на первом этаже, выдал бы вершину каталога и
 *   закончил бы игру на входе.
 * - **Жребий не переигрывается.** Шанс считается от сида забега, глубины и
 *   того, кто умер. Сохраниться перед ударом и перебрать выпадение нельзя —
 *   иначе это не шанс, а очередь.
 *
 * Модуль чистый: он говорит, что должно упасть. Положить это на пол, нарисовать
 * и записать в сохранение — дело переходника.
 */

/**
 * Потолок редкости по тиру. Страж этажа поднимает его на ступень: он и есть
 * то, ради чего на этот этаж шли.
 */
export function dropBand(tier, boss = false) {
  if (!Number.isFinite(tier)) return 0;
  const base = tier <= 3 ? 1 : tier <= 6 ? 2 : 3;
  return Math.min(3, base + (boss ? 1 : 0));
}

/** Сила артефакта достаётся только тому, кто её заслужил глубиной. */
export const ARTIFACT_DROP_TIER = 8;

/**
 * Именная добыча: кто — что. Шанс здесь не указан, потому что он единица:
 * страж этажа и именной роняют своё всегда, и в этом весь смысл — эту вещь
 * нельзя обойти по стеночке в кольце невидимости.
 */
export const SIGNATURE_DROPS = Object.freeze({
  // ── Стражи открытой земли ────────────────────────────────────────────────
  'grove-warden': Object.freeze({ id: 'bark-buckler' }),
  'moor-catoblepas': Object.freeze({ id: 'swamp-dragon-scales' }),
  'storm-raiju': Object.freeze({ id: 'sky-charm', powerId: 'quickening' }),
  // ── Стражи катакомб ──────────────────────────────────────────────────────
  'tomb-warden': Object.freeze({ id: 'plumed-helm' }),
  'bone-dragon': Object.freeze({ id: 'dire-flail', powerId: 'sundering' }),
  'ancient-lich': Object.freeze({ id: 'dead-book', powerId: 'sense' }),
  // ── Стражи ада ───────────────────────────────────────────────────────────
  'brimstone-fiend': Object.freeze({ id: 'firestarter' }),
  'shadow-fiend': Object.freeze({ id: 'shadow-scales', powerId: 'hushed' }),
  'ice-devil': Object.freeze({ id: 'ice-dragon-scales', powerId: 'three-wards' }),
  'hell-lord': Object.freeze({ id: 'sword-of-power', powerId: 'searing' }),
  balrug: Object.freeze({ id: 'scarlet-gloves', powerId: 'thorns' }),
  // ── Стражи хранилищ ──────────────────────────────────────────────────────
  'crystal-warden': Object.freeze({ id: 'kite-shield' }),
  'iron-golem': Object.freeze({ id: 'white-gauntlets' }),
  keyholder: Object.freeze({ id: 'gold-face', powerId: 'sense' }),
  dissolution: Object.freeze({ id: 'green-eye', powerId: 'sense' }),
  'nameless-thing': Object.freeze({ id: 'witch-mantle', powerId: 'hushed' }),
  'world-serpent': Object.freeze({ id: 'silver-dragon-hide', powerId: 'three-wards' }),
  // ── Стражи спуска ────────────────────────────────────────────────────────
  'ashen-guardian': Object.freeze({ id: 'horned-sallet' }),
  'sanctum-guardian': Object.freeze({ id: 'horned-helm' }),
  'depth-warden': Object.freeze({ id: 'titan-belt', powerId: 'anchored' }),
  lich: Object.freeze({ id: 'enchantress-dagger' }),
  'ice-dragon': Object.freeze({ id: 'quicksilver-dragon-scales' }),
  'golden-dragon': Object.freeze({ id: 'gold-dragon-scales', powerId: 'three-wards' }),

  // ── Именные ──────────────────────────────────────────────────────────────
  // Тир держит их в рамках: Робин второго тира встречается с первого этажа, и
  // вершина каталога с него закончила бы игру на входе.
  robin: Object.freeze({ id: 'spiked-club' }),
  ijyb: Object.freeze({ id: 'hunter-belt' }),
  natasha: Object.freeze({ id: 'hush-amulet' }),
  sigmund: Object.freeze({ id: 'bone-dirk' }),
  nellie: Object.freeze({ id: 'green-boots' }),
  agnes: Object.freeze({ id: 'iron-flail' }),
  frederick: Object.freeze({ id: 'iron-helm' }),
  nergalle: Object.freeze({ id: 'grey-mantle' }),
  grinder: Object.freeze({ id: 'wrapped-hands' }),
  sonja: Object.freeze({ id: 'duelist-rapier' }),
  erica: Object.freeze({ id: 'fire-ring' }),
  purgy: Object.freeze({ id: 'tide-cloak' }),
  josephine: Object.freeze({ id: 'runic-robe' }),
  // Двойник оставляет то, чем он и был: чужую голову на своих плечах.
  mara: Object.freeze({ id: 'mind-charm' }),
  rupert: Object.freeze({ id: 'giant-club' }),
  snorg: Object.freeze({ id: 'bruiser-fists' }),
  aizul: Object.freeze({ id: 'antidote-ring' }),
  vashnia: Object.freeze({ id: 'great-bow' }),
  polyphemus: Object.freeze({ id: 'great-mace' }),
  ignacio: Object.freeze({ id: 'black-whip' }),
  geryon: Object.freeze({ id: 'cross-pavise' }),
  boris: Object.freeze({ id: 'iron-crown', powerId: 'three-wards' }),
  lamia: Object.freeze({ id: 'amber-cloak', powerId: 'hushed' }),
  ereshkigal: Object.freeze({ id: 'gilded-greaves', powerId: 'anchored' }),
  giaggostuono: Object.freeze({ id: 'battleaxe', powerId: 'searing' }),
  azrael: Object.freeze({ id: 'blood-robe', powerId: 'thorns' }),
  dispater: Object.freeze({ id: 'bulwark', powerId: 'thorns' }),
  asmodeus: Object.freeze({ id: 'iron-quarterstaff', powerId: 'searing' }),
  cerebov: Object.freeze({ id: 'triple-sword', powerId: 'executioner' }),
  'serpent-of-hell': Object.freeze({ id: 'pearl-dragon-scales', powerId: 'three-wards' }),
  // Драконы редкой встречи: чешуя с того, с кого её и снимают.
  'storm-dragon': Object.freeze({ id: 'blue-dragon-scales' }),
  'shadow-dragon': Object.freeze({ id: 'shadow-scales' }),
  'quicksilver-dragon': Object.freeze({ id: 'quicksilver-dragon-scales' }),
  'swamp-dragon': Object.freeze({ id: 'swamp-dragon-scales' }),
  hydra: Object.freeze({ id: 'mottled-dragon-scales' }),
  xtahua: Object.freeze({ id: 'gold-dragon-scales', powerId: 'three-wards' }),
  'lernaean-hydra': Object.freeze({ id: 'living-vines', powerId: 'three-wards' }),
  tiamat: Object.freeze({ id: 'silver-scales', powerId: 'three-wards' }),
});

/**
 * Обычные, у кого вещь есть по смыслу.
 *
 * Не награда за бой, а объяснение: у того, кто пришёл с оружием, оружие можно
 * забрать. Поэтому здесь предметы попроще и шанс, а не единица — иначе
 * каждый убитый орк превращался бы в лавку.
 */
export const CHANCE_DROPS = Object.freeze({
  'orc-warrior': Object.freeze({ id: 'war-axe', chance: 0.22 }),
  'orc-knight': Object.freeze({ id: 'half-plate', chance: 0.18 }),
  'orc-wizard': Object.freeze({ id: 'quarterstaff', chance: 0.2 }),
  'gnoll-sergeant': Object.freeze({ id: 'hunting-spear', chance: 0.22 }),
  'highway-bandit': Object.freeze({ id: 'scimitar', chance: 0.25 }),
  'deep-dwarf': Object.freeze({ id: 'iron-helm', chance: 0.2 }),
  'wayward-elf': Object.freeze({ id: 'short-bow', chance: 0.22 }),
  'vault-sentinel': Object.freeze({ id: 'round-shield', chance: 0.2 }),
  'bone-knight': Object.freeze({ id: 'ring-mail', chance: 0.2 }),
  'vampire-knight': Object.freeze({ id: 'iron-gloves', chance: 0.18 }),
  necromancer: Object.freeze({ id: 'skull-staff', chance: 0.16 }),
  'deep-elf-knight': Object.freeze({ id: 'elven-helm', chance: 0.18 }),
  'fire-giant': Object.freeze({ id: 'fire-ring', chance: 0.16 }),
  'frost-giant': Object.freeze({ id: 'ice-ring', chance: 0.16 }),
  'spriggan-berserker': Object.freeze({ id: 'bone-dirk', chance: 0.2 }),
  manticore: Object.freeze({ id: 'spiked-club', chance: 0.16 }),
  basilisk: Object.freeze({ id: 'antidote-ring', chance: 0.16 }),
  sphinx: Object.freeze({ id: 'mind-charm', chance: 0.18 }),
});

/**
 * Жребий, который нельзя перебросить.
 *
 * Тот же приём, что у разговоров: выпадение выводится из сида забега, глубины
 * и того, кто умер. Перезагрузка перед ударом вернёт ровно то же самое.
 */
export function dropRoll(seed, depth, instanceId) {
  if (!Number.isInteger(seed) || seed < 0) throw new TypeError('A drop needs a run seed');
  if (!Number.isInteger(depth) || depth < 0) throw new TypeError('A drop needs a floor depth');
  let value = (seed ^ Math.imul(depth + 3, 0x27d4eb2d)) >>> 0;
  for (const code of String(instanceId)) {
    value = Math.imul(value ^ code.codePointAt(0), 0x9e3779b1) >>> 0;
  }
  value = Math.imul(value ^ (value >>> 13), 0x85ebca6b) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

/**
 * Что упало с этого существа, или ничего.
 *
 * `monsterId` — вид, `instanceId` — тот самый убитый: жребий должен быть свой
 * у каждого, иначе два орка на этаже роняли бы одно и то же или оба ничего.
 */
export function dropForMonster({ monsterId, instanceId = '', seed = 0, depth = 1 } = {}) {
  const signature = SIGNATURE_DROPS[monsterId];
  if (signature) return signature;
  const запись = CHANCE_DROPS[monsterId];
  if (!запись) return null;
  return dropRoll(seed, depth, instanceId) < запись.chance
    ? Object.freeze({ id: запись.id, powerId: null })
    : null;
}

export const DROP_MONSTER_IDS = Object.freeze([
  ...Object.keys(SIGNATURE_DROPS),
  ...Object.keys(CHANCE_DROPS),
]);
