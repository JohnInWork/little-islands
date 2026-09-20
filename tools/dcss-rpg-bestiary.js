/**
 * Вторая волна бестиария.
 *
 * Иван 20.09.2026, посмотрев статистику: «у нас как будто бы очень много
 * ассетов монстров — если это так, то надо больше разнообразия их в игре».
 * Это так: в паке 603 пригодных отдельных существа, в игре было 85.
 *
 * Но главная цифра была не эта. `monsterEligibleForFloor` пускает на этаж
 * только тех, чей тир не выше потолка этажа, а потолок на этажах 1–3 равен
 * единице — и тира 1 во всей игре было девять штук. Из них на конкретную
 * дорогу проходило **три-пять**. Начало любого забега тянуло из горсти
 * существ, сколько бы их ни лежало в каталоге. Поэтому волна не просто
 * «добавить монстров», а добавить их **снизу**: тиров 1–3 здесь больше, чем
 * тиров 7–9.
 *
 * Дороги набраны по тому, чем они являются:
 *
 * - **Поверхность** — то, что живёт само: звери, насекомые, сприганы, сатиры.
 * - **Спуск** — те, кто здесь копал: кобольды, гноллы, дворфы, тролли, великаны.
 * - **Хранилища** — всё сделанное: големы, элементали, призрачное оружие,
 *   стража и статуи. Ни одного живого существа, кроме нетопырей под сводом.
 * - **Катакомбы** — только мёртвые.
 * - **Ад** — только демоны.
 * - **any** — четыре вида паразитов, которым всё равно, где ползать.
 *
 * Числа не выписаны руками по одному: тир задаёт силу, повадка — форму.
 * Налётчик быстрый и хрупкий, громила медленный и толстый, охотник видит
 * далеко и идёт долго, колдун бьёт с замахом. Так у ста существ получаются
 * сто разных профилей угрозы, и ни один не совпадает с другим — это
 * требование каталога, и его проверяет тест.
 */

/** Сила по тиру: hp, урон и опыт, из которых повадка лепит конкретного зверя. */
const TIER_POWER = Object.freeze([
  null,
  Object.freeze({ hp: 5, damage: 4, xp: 4 }),
  Object.freeze({ hp: 9, damage: 6, xp: 9 }),
  Object.freeze({ hp: 15, damage: 9, xp: 15 }),
  Object.freeze({ hp: 21, damage: 12, xp: 25 }),
  Object.freeze({ hp: 28, damage: 15, xp: 40 }),
  Object.freeze({ hp: 36, damage: 17, xp: 58 }),
  Object.freeze({ hp: 44, damage: 20, xp: 80 }),
  Object.freeze({ hp: 53, damage: 25, xp: 108 }),
  Object.freeze({ hp: 62, damage: 30, xp: 140 }),
]);

/**
 * Четыре повадки. Это не косметика: от них зависит, как существо читается в
 * бою — успеешь отойти от замаха громилы, не успеешь от налётчика, а от
 * охотника не уйдёшь вовсе.
 */
const STYLES = Object.freeze({
  skirmisher: Object.freeze({
    shape: { hp: 0.72, damage: 0.9, speed: 1.3 },
    threat: { attackRate: 1.3, vision: 6.2, windup: 0.14, pursuit: 4.2 },
  }),
  brute: Object.freeze({
    shape: { hp: 1.36, damage: 1.1, speed: 0.82 },
    threat: { attackRate: 0.86, vision: 5.4, windup: 0.3, pursuit: 8 },
  }),
  stalker: Object.freeze({
    shape: { hp: 1, damage: 1, speed: 1.08 },
    threat: { attackRate: 1.06, vision: 7.6, windup: 0.2, pursuit: 9.5 },
  }),
  caster: Object.freeze({
    shape: { hp: 0.84, damage: 1.12, speed: 0.94 },
    threat: { attackRate: 0.96, vision: 8.4, windup: 0.26, pursuit: 6.4 },
  }),
});

export const BESTIARY_STYLES = Object.freeze(Object.keys(STYLES));

const round = (value, places) => Number(value.toFixed(places));

/**
 * Собирает запись каталога. `index` — порядковый номер существа; он входит в
 * каждое число профиля угрозы мелкой добавкой, поэтому двух одинаковых
 * профилей не бывает по построению, а не по везению.
 *
 * Экспортируется, потому что редкие встречи собирают своих существ тем же
 * способом и продолжают ту же нумерацию — иначе их профили начали бы
 * совпадать с профилями второй волны.
 */
export function buildCreature(entry, index) {
  const { style, tier } = entry;
  const preset = STYLES[style];
  if (!preset) throw new TypeError(`Unknown bestiary style: ${style}`);
  const power = TIER_POWER[tier];
  if (!power) throw new TypeError(`Bestiary tier out of range: ${tier}`);
  const { shape, threat } = preset;
  return Object.freeze({
    id: entry.id,
    habitat: entry.habitat,
    kin: entry.kin,
    path: `mon/${entry.sprite}`,
    tier,
    hp: entry.hp ?? Math.max(2, Math.round(power.hp * shape.hp)),
    damage: entry.damage ?? Math.max(1, Math.round(power.damage * shape.damage)),
    speed: entry.speed ?? round(shape.speed - tier * 0.012, 2),
    xp: entry.xp ?? Math.max(1, Math.round(power.xp)),
    bloodColor: entry.bloodColor ?? BLOOD[entry.kin],
    ...(entry.flying ? { flying: true } : {}),
    ...(entry.large ? { large: true } : {}),
    ...(entry.element ? { element: entry.element } : {}),
    ...(entry.inflicts ? { inflicts: Object.freeze({ ...entry.inflicts }) } : {}),
    // Редкие встречи: `unique` держит существо вне обычного пула — его сажает
    // на этаж только бросок редкой встречи, и потолок тира ему не указ.
    ...(entry.unique ? { unique: true } : {}),
    ...(entry.neutral ? { neutral: true } : {}),
    ...(Number.isInteger(entry.minDepth) ? { minDepth: entry.minDepth } : {}),
    threat: Object.freeze({
      attackRate: round(threat.attackRate + tier * 0.012 + index * 0.0007, 4),
      vision: round(threat.vision + tier * 0.16 + (index % 9) * 0.02, 3),
      windup: round(threat.windup - tier * 0.009 + (index % 6) * 0.003, 4),
      pursuit: round(threat.pursuit + tier * 0.22 + (index % 12) * 0.04, 3),
    }),
  });
}

/** Цвет крови по роду. Механика не смотрит, смотрит только глаз. */
const BLOOD = Object.freeze({
  humanoid: '#71352d',
  beast: '#6f2f32',
  undead: '#6d6250',
  demon: '#7a2a2a',
  dragon: '#5c3b2e',
  oddity: '#4d5360',
});

const poison = (duration) => ({ id: 'poison', duration });
const burning = (duration) => ({ id: 'burning', duration });
const chilled = (duration) => ({ id: 'chilled', duration });

/**
 * Сам список. Порядок — по дорогам, внутри дороги по тиру: так видно, что у
 * каждой дороги есть чем занять и первый этаж, и восемнадцатый.
 */
const ROSTER = [
  // ── Паразиты: этим всё равно, где ползать ───────────────────────────────
  { id: 'giant-cockroach', habitat: 'any', kin: 'beast', sprite: 'animals/giant_cockroach.png', tier: 1, style: 'skirmisher', ru: 'Гигантский таракан', en: 'Giant cockroach' },
  { id: 'burrowing-worm', habitat: 'any', kin: 'beast', sprite: 'animals/worm.png', tier: 1, style: 'brute', ru: 'Земляной червь', en: 'Burrowing worm' },
  { id: 'giant-leech', habitat: 'any', kin: 'beast', sprite: 'animals/giant_leech.png', tier: 2, style: 'stalker', ru: 'Гигантская пиявка', en: 'Giant leech' },
  { id: 'jumping-spider', habitat: 'any', kin: 'beast', sprite: 'animals/jumping_spider.png', tier: 2, style: 'skirmisher', ru: 'Прыгающий паук', en: 'Jumping spider' },

  // ── Поверхность: то, что живёт само ─────────────────────────────────────
  { id: 'iguana', habitat: 'surface', kin: 'beast', sprite: 'animals/iguana.png', tier: 1, style: 'skirmisher', ru: 'Игуана', en: 'Iguana' },
  { id: 'giant-newt', habitat: 'surface', kin: 'beast', sprite: 'animals/giant_newt.png', tier: 1, style: 'skirmisher', ru: 'Гигантский тритон', en: 'Giant newt' },
  { id: 'worker-ant', habitat: 'surface', kin: 'beast', sprite: 'animals/worker_ant.png', tier: 1, style: 'brute', ru: 'Рабочий муравей', en: 'Worker ant' },
  { id: 'ball-python', habitat: 'surface', kin: 'beast', sprite: 'animals/ball_python.png', tier: 1, style: 'stalker', ru: 'Питон', en: 'Ball python' },
  { id: 'yellow-wasp', habitat: 'surface', kin: 'beast', sprite: 'animals/yellow_wasp.png', tier: 2, style: 'skirmisher', flying: true, inflicts: poison(4), ru: 'Жёлтая оса', en: 'Yellow wasp' },
  { id: 'soldier-ant', habitat: 'surface', kin: 'beast', sprite: 'animals/soldier_ant.png', tier: 2, style: 'brute', ru: 'Муравей-солдат', en: 'Soldier ant' },
  { id: 'scorpion', habitat: 'surface', kin: 'beast', sprite: 'animals/scorpion.png', tier: 2, style: 'stalker', inflicts: poison(5), ru: 'Скорпион', en: 'Scorpion' },
  { id: 'water-moccasin', habitat: 'surface', kin: 'beast', sprite: 'animals/water_moccasin.png', tier: 2, style: 'stalker', inflicts: poison(4), ru: 'Щитомордник', en: 'Water moccasin' },
  { id: 'blink-frog', habitat: 'surface', kin: 'beast', sprite: 'animals/blink_frog.png', tier: 3, style: 'skirmisher', ru: 'Мерцающая жаба', en: 'Blink frog' },
  { id: 'red-wasp', habitat: 'surface', kin: 'beast', sprite: 'animals/red_wasp.png', tier: 3, style: 'skirmisher', flying: true, inflicts: poison(6), ru: 'Красная оса', en: 'Red wasp' },
  { id: 'wolf-spider', habitat: 'surface', kin: 'beast', sprite: 'animals/wolf_spider.png', tier: 3, style: 'stalker', inflicts: poison(5), ru: 'Паук-волк', en: 'Wolf spider' },
  { id: 'harpy', habitat: 'surface', kin: 'humanoid', sprite: 'harpy.png', tier: 3, style: 'skirmisher', flying: true, ru: 'Гарпия', en: 'Harpy' },
  { id: 'spriggan', habitat: 'surface', kin: 'humanoid', sprite: 'spriggan/spriggan.png', tier: 3, style: 'skirmisher', ru: 'Сприган', en: 'Spriggan' },
  { id: 'spiny-frog', habitat: 'surface', kin: 'beast', sprite: 'animals/spiny_frog.png', tier: 4, style: 'brute', inflicts: poison(6), ru: 'Шипастая жаба', en: 'Spiny frog' },
  { id: 'hippogriff', habitat: 'surface', kin: 'beast', sprite: 'hippogriff.png', tier: 4, style: 'stalker', flying: true, large: true, ru: 'Гиппогриф', en: 'Hippogriff' },
  { id: 'satyr', habitat: 'surface', kin: 'humanoid', sprite: 'satyr.png', tier: 4, style: 'caster', ru: 'Сатир', en: 'Satyr' },
  { id: 'tarantella', habitat: 'surface', kin: 'beast', sprite: 'animals/tarantella.png', tier: 4, style: 'skirmisher', inflicts: poison(7), ru: 'Тарантелла', en: 'Tarantella' },
  { id: 'queen-bee', habitat: 'surface', kin: 'beast', sprite: 'animals/queen_bee.png', tier: 5, style: 'stalker', flying: true, inflicts: poison(7), ru: 'Пчелиная матка', en: 'Queen bee' },
  { id: 'spriggan-rider', habitat: 'surface', kin: 'humanoid', sprite: 'spriggan/spriggan_rider.png', tier: 5, style: 'skirmisher', ru: 'Сприган-наездник', en: 'Spriggan rider' },
  { id: 'basilisk', habitat: 'surface', kin: 'beast', sprite: 'animals/basilisk.png', tier: 5, style: 'stalker', large: true, ru: 'Василиск', en: 'Basilisk' },
  { id: 'spriggan-druid', habitat: 'surface', kin: 'humanoid', sprite: 'spriggan/spriggan_druid.png', tier: 5, style: 'caster', ru: 'Сприган-друид', en: 'Spriggan druid' },
  { id: 'manticore', habitat: 'surface', kin: 'beast', sprite: 'manticore.png', tier: 6, style: 'brute', large: true, ru: 'Мантикора', en: 'Manticore' },
  { id: 'queen-ant', habitat: 'surface', kin: 'beast', sprite: 'animals/queen_ant.png', tier: 6, style: 'brute', large: true, ru: 'Муравьиная царица', en: 'Queen ant' },
  { id: 'moth-of-wrath', habitat: 'surface', kin: 'beast', sprite: 'animals/moth_of_wrath.png', tier: 6, style: 'stalker', flying: true, ru: 'Мотылёк ярости', en: 'Moth of wrath' },
  { id: 'spriggan-berserker', habitat: 'surface', kin: 'humanoid', sprite: 'spriggan/spriggan_berserker.png', tier: 7, style: 'skirmisher', ru: 'Сприган-берсерк', en: 'Spriggan berserker' },
  { id: 'sphinx', habitat: 'surface', kin: 'beast', sprite: 'sphinx.png', tier: 7, style: 'caster', large: true, ru: 'Сфинкс', en: 'Sphinx' },

  // ── Спуск: те, кто здесь копал ──────────────────────────────────────────
  { id: 'kobold', habitat: 'deep', kin: 'humanoid', sprite: 'kobold.png', tier: 1, style: 'skirmisher', ru: 'Кобольд', en: 'Kobold' },
  { id: 'hobgoblin', habitat: 'deep', kin: 'humanoid', sprite: 'hobgoblin.png', tier: 1, style: 'brute', ru: 'Хобгоблин', en: 'Hobgoblin' },
  { id: 'big-kobold', habitat: 'deep', kin: 'humanoid', sprite: 'big_kobold.png', tier: 2, style: 'skirmisher', ru: 'Большой кобольд', en: 'Big kobold' },
  { id: 'gnoll-sergeant', habitat: 'deep', kin: 'humanoid', sprite: 'gnoll_sergeant.png', tier: 2, style: 'brute', ru: 'Гнолл-сержант', en: 'Gnoll sergeant' },
  { id: 'dwarf', habitat: 'deep', kin: 'humanoid', sprite: 'dwarf.png', tier: 2, style: 'stalker', ru: 'Дворф', en: 'Dwarf' },
  { id: 'gnoll-shaman', habitat: 'deep', kin: 'humanoid', sprite: 'gnoll_shaman.png', tier: 3, style: 'caster', ru: 'Гнолл-шаман', en: 'Gnoll shaman' },
  { id: 'deep-dwarf', habitat: 'deep', kin: 'humanoid', sprite: 'deep_dwarf.png', tier: 3, style: 'brute', ru: 'Глубинный дворф', en: 'Deep dwarf' },
  { id: 'highway-bandit', habitat: 'deep', kin: 'humanoid', sprite: 'human.png', tier: 3, style: 'skirmisher', ru: 'Разбойник', en: 'Highway bandit' },
  { id: 'wayward-elf', habitat: 'deep', kin: 'humanoid', sprite: 'elf.png', tier: 3, style: 'caster', ru: 'Заблудший эльф', en: 'Wayward elf' },
  { id: 'orc-knight', habitat: 'deep', kin: 'humanoid', sprite: 'orc_knight.png', tier: 4, style: 'brute', ru: 'Орк-рыцарь', en: 'Orc knight' },
  { id: 'two-headed-ogre', habitat: 'deep', kin: 'humanoid', sprite: 'two_headed_ogre.png', tier: 4, style: 'brute', large: true, ru: 'Двухголовый огр', en: 'Two-headed ogre' },
  { id: 'deep-troll', habitat: 'deep', kin: 'humanoid', sprite: 'deep_troll.png', tier: 4, style: 'stalker', large: true, ru: 'Глубинный тролль', en: 'Deep troll' },
  { id: 'formicid', habitat: 'deep', kin: 'humanoid', sprite: 'formicid.png', tier: 4, style: 'skirmisher', ru: 'Формицид', en: 'Formicid' },
  { id: 'ogre-mage', habitat: 'deep', kin: 'humanoid', sprite: 'ogre_mage.png', tier: 5, style: 'caster', large: true, ru: 'Огр-маг', en: 'Ogre mage' },
  { id: 'orc-sorcerer', habitat: 'deep', kin: 'humanoid', sprite: 'orc_sorcerer.png', tier: 5, style: 'caster', ru: 'Орк-колдун', en: 'Orc sorcerer' },
  { id: 'cyclops', habitat: 'deep', kin: 'humanoid', sprite: 'cyclops.png', tier: 5, style: 'brute', large: true, ru: 'Циклоп', en: 'Cyclops' },
  { id: 'hill-giant', habitat: 'deep', kin: 'humanoid', sprite: 'hill_giant.png', tier: 5, style: 'brute', large: true, ru: 'Холмовой великан', en: 'Hill giant' },
  { id: 'iron-troll', habitat: 'deep', kin: 'humanoid', sprite: 'iron_troll.png', tier: 6, style: 'brute', large: true, ru: 'Железный тролль', en: 'Iron troll' },
  { id: 'deep-troll-shaman', habitat: 'deep', kin: 'humanoid', sprite: 'deep_troll_shaman.png', tier: 6, style: 'caster', large: true, ru: 'Тролличий шаман', en: 'Troll shaman' },
  { id: 'stone-giant', habitat: 'deep', kin: 'humanoid', sprite: 'stone_giant.png', tier: 6, style: 'brute', large: true, ru: 'Каменный великан', en: 'Stone giant' },
  { id: 'deep-elf-knight', habitat: 'deep', kin: 'humanoid', sprite: 'deep_elf_knight.png', tier: 6, style: 'skirmisher', ru: 'Тёмный рыцарь', en: 'Deep elf knight' },
  { id: 'ettin', habitat: 'deep', kin: 'humanoid', sprite: 'ettin.png', tier: 7, style: 'brute', large: true, ru: 'Эттин', en: 'Ettin' },
  { id: 'fire-giant', habitat: 'deep', kin: 'humanoid', sprite: 'fire_giant.png', tier: 7, style: 'brute', large: true, element: 'fire', inflicts: burning(5), ru: 'Огненный великан', en: 'Fire giant' },
  { id: 'frost-giant', habitat: 'deep', kin: 'humanoid', sprite: 'frost_giant.png', tier: 7, style: 'brute', large: true, element: 'ice', inflicts: chilled(5), ru: 'Ледяной великан', en: 'Frost giant' },
  { id: 'deep-elf-sorcerer', habitat: 'deep', kin: 'humanoid', sprite: 'deep_elf_sorcerer.png', tier: 8, style: 'caster', ru: 'Тёмный колдун', en: 'Deep elf sorcerer' },
  { id: 'juggernaut', habitat: 'deep', kin: 'humanoid', sprite: 'juggernaut.png', tier: 8, style: 'brute', large: true, ru: 'Джаггернаут', en: 'Juggernaut' },
  { id: 'titan', habitat: 'deep', kin: 'humanoid', sprite: 'titan.png', tier: 9, style: 'brute', large: true, ru: 'Титан', en: 'Titan' },

  // Спуск — не только те, кто копал. В штольнях живёт и то, что было здесь
  // раньше: без этого дорога вниз становится сплошными орками и великанами,
  // и «погребённое святилище» перестаёт отличаться от «пепельного склада».
  { id: 'ooze', habitat: 'deep', kin: 'oddity', sprite: 'amorphous/ooze.png', tier: 2, style: 'brute', ru: 'Слизь', en: 'Ooze' },
  { id: 'cave-hound', habitat: 'deep', kin: 'beast', sprite: 'animals/hound.png', tier: 2, style: 'stalker', ru: 'Пещерная гончая', en: 'Cave hound' },
  { id: 'vampire-mosquito', habitat: 'deep', kin: 'beast', sprite: 'animals/vampire_mosquito.png', tier: 2, style: 'skirmisher', flying: true, ru: 'Кровяной комар', en: 'Vampire mosquito' },
  { id: 'black-mamba', habitat: 'deep', kin: 'beast', sprite: 'animals/black_mamba.png', tier: 3, style: 'stalker', inflicts: poison(7), ru: 'Чёрная мамба', en: 'Black mamba' },
  { id: 'trapdoor-spider', habitat: 'deep', kin: 'beast', sprite: 'animals/trapdoor_spider.png', tier: 3, style: 'stalker', inflicts: poison(5), ru: 'Паук-засадник', en: 'Trapdoor spider' },
  { id: 'cave-jelly', habitat: 'deep', kin: 'oddity', sprite: 'amorphous/jelly.png', tier: 3, style: 'brute', ru: 'Пещерный студень', en: 'Cave jelly' },
  { id: 'boulder-beetle', habitat: 'deep', kin: 'beast', sprite: 'animals/boulder_beetle.png', tier: 4, style: 'brute', large: true, ru: 'Валунный жук', en: 'Boulder beetle' },
  { id: 'ice-beast', habitat: 'deep', kin: 'beast', sprite: 'animals/ice_beast.png', tier: 4, style: 'brute', element: 'ice', inflicts: chilled(6), ru: 'Ледяная тварь', en: 'Ice beast' },
  { id: 'giant-eyeball', habitat: 'deep', kin: 'oddity', sprite: 'eyes/giant_eyeball.png', tier: 4, style: 'caster', ru: 'Гигантское око', en: 'Giant eyeball' },
  { id: 'orb-spider', habitat: 'deep', kin: 'beast', sprite: 'animals/orb_spider.png', tier: 5, style: 'stalker', inflicts: poison(8), ru: 'Паук-шаровик', en: 'Orb spider' },
  { id: 'elephant-slug', habitat: 'deep', kin: 'beast', sprite: 'animals/elephant_slug.png', tier: 5, style: 'brute', large: true, ru: 'Слизень-исполин', en: 'Elephant slug' },
  { id: 'horn-golem', habitat: 'deep', kin: 'oddity', sprite: 'nonliving/toenail_golem.png', tier: 5, style: 'brute', large: true, ru: 'Роговой голем', en: 'Horn golem' },
  { id: 'azure-jelly', habitat: 'deep', kin: 'oddity', sprite: 'amorphous/azure_jelly.png', tier: 6, style: 'brute', large: true, inflicts: chilled(6), ru: 'Лазурный студень', en: 'Azure jelly' },
  { id: 'eye-of-draining', habitat: 'deep', kin: 'oddity', sprite: 'eyes/eye_of_draining.png', tier: 6, style: 'caster', ru: 'Око истощения', en: 'Eye of draining' },

  // ── Хранилища: всё сделанное. Живых тут нет, кроме нетопырей под сводом ──
  { id: 'microbat', habitat: 'vaults', kin: 'beast', sprite: 'vault/microbat.png', tier: 1, style: 'skirmisher', flying: true, ru: 'Микронетопырь', en: 'Microbat' },
  { id: 'battlesphere', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/battlesphere.png', tier: 1, style: 'skirmisher', flying: true, ru: 'Боевая сфера', en: 'Battlesphere' },
  { id: 'phase-bat', habitat: 'vaults', kin: 'beast', sprite: 'vault/phase_bat.png', tier: 2, style: 'skirmisher', flying: true, ru: 'Фазовая мышь', en: 'Phase bat' },
  { id: 'megabat', habitat: 'vaults', kin: 'beast', sprite: 'vault/megabat.png', tier: 2, style: 'stalker', flying: true, ru: 'Крылан', en: 'Megabat' },
  { id: 'spectral-blade', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/spectral_sbl.png', tier: 2, style: 'skirmisher', flying: true, ru: 'Призрачный клинок', en: 'Spectral blade' },
  { id: 'guardian-golem', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/guardian_golem.png', tier: 3, style: 'brute', ru: 'Голем-страж', en: 'Guardian golem' },
  { id: 'gigabat', habitat: 'vaults', kin: 'beast', sprite: 'vault/gigabat.png', tier: 3, style: 'stalker', flying: true, large: true, ru: 'Гигантский нетопырь', en: 'Gigabat' },
  { id: 'spectral-spear', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/spectral_spear.png', tier: 3, style: 'skirmisher', flying: true, ru: 'Призрачное копьё', en: 'Spectral spear' },
  { id: 'deformed-thrall', habitat: 'vaults', kin: 'humanoid', sprite: 'vault/deformed_human.png', tier: 3, style: 'brute', ru: 'Изувеченный слуга', en: 'Deformed thrall' },
  { id: 'spectral-axe', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/spectral_axe.png', tier: 4, style: 'skirmisher', flying: true, ru: 'Призрачный топор', en: 'Spectral axe' },
  { id: 'flesh-golem', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/flesh_golem.png', tier: 4, style: 'brute', large: true, ru: 'Мясной голем', en: 'Flesh golem' },
  { id: 'earth-elemental', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/earth_elemental.png', tier: 4, style: 'brute', large: true, ru: 'Земляной элементаль', en: 'Earth elemental' },
  { id: 'ushabti', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/ushabti.png', tier: 4, style: 'stalker', ru: 'Ушебти', en: 'Ushabti' },
  { id: 'spectral-mace', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/spectral_mace.png', tier: 5, style: 'brute', flying: true, ru: 'Призрачная булава', en: 'Spectral mace' },
  { id: 'vault-sentinel', habitat: 'vaults', kin: 'humanoid', sprite: 'vault_sentinel.png', tier: 5, style: 'brute', ru: 'Страж хранилища', en: 'Vault sentinel' },
  { id: 'iron-elemental', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/iron_elemental.png', tier: 5, style: 'brute', large: true, ru: 'Железный элементаль', en: 'Iron elemental' },
  { id: 'water-elemental', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/water_elemental.png', tier: 5, style: 'stalker', large: true, inflicts: { id: 'wet', duration: 6 }, ru: 'Водный элементаль', en: 'Water elemental' },
  { id: 'air-elemental', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/air_elemental.png', tier: 6, style: 'skirmisher', flying: true, large: true, ru: 'Воздушный элементаль', en: 'Air elemental' },
  { id: 'electric-golem', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/electric_golem.png', tier: 6, style: 'brute', large: true, ru: 'Электрический голем', en: 'Electric golem' },
  { id: 'ironbrand-convoker', habitat: 'vaults', kin: 'humanoid', sprite: 'ironbrand_convoker.png', tier: 6, style: 'caster', ru: 'Железный призыватель', en: 'Ironbrand convoker' },
  { id: 'fire-elemental', habitat: 'vaults', kin: 'oddity', sprite: 'nonliving/fire_elemental.png', tier: 6, style: 'stalker', large: true, element: 'fire', inflicts: burning(5), ru: 'Огненный элементаль', en: 'Fire elemental' },
  { id: 'ironheart-preserver', habitat: 'vaults', kin: 'humanoid', sprite: 'ironheart_preserver.png', tier: 7, style: 'brute', ru: 'Железносердый хранитель', en: 'Ironheart preserver' },
  { id: 'crystal-statue', habitat: 'vaults', kin: 'oddity', sprite: 'statues/orange_crystal_statue.png', tier: 7, style: 'caster', large: true, ru: 'Кристальная статуя', en: 'Crystal statue' },
  { id: 'zot-statue', habitat: 'vaults', kin: 'oddity', sprite: 'vault/zot_statue.png', tier: 8, style: 'caster', large: true, ru: 'Статуя Зота', en: 'Zot statue' },
  { id: 'orb-guardian', habitat: 'vaults', kin: 'oddity', sprite: 'orb_guardian.png', tier: 8, style: 'brute', large: true, ru: 'Страж сферы', en: 'Orb guardian' },

  // ── Катакомбы: только мёртвые ───────────────────────────────────────────
  { id: 'crawling-corpse', habitat: 'crypt', kin: 'undead', sprite: 'undead/crawling_corpse.png', tier: 1, style: 'brute', ru: 'Ползущий труп', en: 'Crawling corpse' },
  { id: 'lost-soul', habitat: 'crypt', kin: 'undead', sprite: 'undead/lost_soul.png', tier: 1, style: 'skirmisher', flying: true, ru: 'Потерянная душа', en: 'Lost soul' },
  { id: 'bog-body', habitat: 'crypt', kin: 'undead', sprite: 'undead/bog_body.png', tier: 2, style: 'brute', ru: 'Болотный мертвец', en: 'Bog body' },
  { id: 'hungry-ghost', habitat: 'crypt', kin: 'undead', sprite: 'undead/hungry_ghost.png', tier: 2, style: 'stalker', flying: true, ru: 'Голодный призрак', en: 'Hungry ghost' },
  { id: 'necrophage', habitat: 'crypt', kin: 'undead', sprite: 'undead/necrophage.png', tier: 3, style: 'brute', inflicts: poison(6), ru: 'Некрофаг', en: 'Necrophage' },
  { id: 'wight', habitat: 'crypt', kin: 'undead', sprite: 'undead/wight.png', tier: 3, style: 'stalker', ru: 'Курганник', en: 'Wight' },
  { id: 'phantom', habitat: 'crypt', kin: 'undead', sprite: 'undead/phantom.png', tier: 3, style: 'skirmisher', flying: true, ru: 'Фантом', en: 'Phantom' },
  { id: 'drowned-soul', habitat: 'crypt', kin: 'undead', sprite: 'undead/drowned_soul.png', tier: 4, style: 'stalker', flying: true, inflicts: { id: 'wet', duration: 7 }, ru: 'Утопленная душа', en: 'Drowned soul' },
  { id: 'flayed-ghost', habitat: 'crypt', kin: 'undead', sprite: 'undead/flayed_ghost.png', tier: 4, style: 'caster', flying: true, ru: 'Ободранный призрак', en: 'Flayed ghost' },
  { id: 'jiangshi', habitat: 'crypt', kin: 'undead', sprite: 'undead/jiangshi.png', tier: 4, style: 'skirmisher', ru: 'Цзянши', en: 'Jiangshi' },
  { id: 'macabre-mass', habitat: 'crypt', kin: 'undead', sprite: 'undead/macabre_mass.png', tier: 5, style: 'brute', large: true, inflicts: poison(7), ru: 'Мертвецкая груда', en: 'Macabre mass' },
  { id: 'phantasmal-warrior', habitat: 'crypt', kin: 'undead', sprite: 'undead/phantasmal_warrior.png', tier: 5, style: 'skirmisher', flying: true, ru: 'Призрачный воин', en: 'Phantasmal warrior' },
  { id: 'stitched-horror', habitat: 'crypt', kin: 'undead', sprite: 'vault/cigotuvis_monster.png', tier: 5, style: 'stalker', large: true, inflicts: poison(6), ru: 'Сшитая тварь', en: 'Stitched horror' },
  { id: 'silent-spectre', habitat: 'crypt', kin: 'undead', sprite: 'undead/silent_spectre.png', tier: 6, style: 'stalker', flying: true, ru: 'Безмолвный спектр', en: 'Silent spectre' },
  { id: 'necromancer', habitat: 'crypt', kin: 'humanoid', sprite: 'necromancer.png', tier: 6, style: 'caster', ru: 'Некромант', en: 'Necromancer' },
  { id: 'vampire-mage', habitat: 'crypt', kin: 'undead', sprite: 'undead/vampire_mage.png', tier: 7, style: 'caster', ru: 'Вампир-маг', en: 'Vampire mage' },
  { id: 'anubis-guard', habitat: 'crypt', kin: 'undead', sprite: 'anubis_guard.png', tier: 7, style: 'brute', large: true, ru: 'Страж Анубиса', en: 'Anubis guard' },
  { id: 'deep-elf-death-mage', habitat: 'crypt', kin: 'humanoid', sprite: 'deep_elf_death_mage.png', tier: 8, style: 'caster', ru: 'Тёмный маг смерти', en: 'Deep elf death mage' },

  // ── Ад: только демоны, и ни одного слабого ──────────────────────────────
  { id: 'ufetubus', habitat: 'hell', kin: 'demon', sprite: 'demons/ufetubus.png', tier: 1, style: 'skirmisher', ru: 'Уфетубус', en: 'Ufetubus' },
  { id: 'white-imp', habitat: 'hell', kin: 'demon', sprite: 'demons/white_imp.png', tier: 1, style: 'skirmisher', flying: true, ru: 'Белый бес', en: 'White imp' },
  { id: 'dusk-imp', habitat: 'hell', kin: 'demon', sprite: 'demons/shadow_imp.png', tier: 2, style: 'stalker', flying: true, ru: 'Сумрачный бес', en: 'Shadow imp' },
  { id: 'quasit', habitat: 'hell', kin: 'demon', sprite: 'demons/quasit.png', tier: 2, style: 'skirmisher', ru: 'Квазит', en: 'Quasit' },
  { id: 'iron-imp', habitat: 'hell', kin: 'demon', sprite: 'demons/iron_imp.png', tier: 3, style: 'brute', ru: 'Железный бес', en: 'Iron imp' },
  { id: 'red-devil', habitat: 'hell', kin: 'demon', sprite: 'demons/red_devil.png', tier: 3, style: 'skirmisher', flying: true, element: 'fire', ru: 'Красный дьявол', en: 'Red devil' },
  { id: 'hellwing', habitat: 'hell', kin: 'demon', sprite: 'demons/hellwing.png', tier: 3, style: 'stalker', flying: true, ru: 'Адокрыл', en: 'Hellwing' },
  { id: 'orange-demon', habitat: 'hell', kin: 'demon', sprite: 'demons/orange_demon.png', tier: 4, style: 'brute', inflicts: poison(7), ru: 'Оранжевый демон', en: 'Orange demon' },
  { id: 'rust-devil', habitat: 'hell', kin: 'demon', sprite: 'demons/rust_devil.png', tier: 4, style: 'brute', ru: 'Ржавый дьявол', en: 'Rust devil' },
  { id: 'sixfirhy', habitat: 'hell', kin: 'demon', sprite: 'demons/sixfirhy.png', tier: 4, style: 'skirmisher', ru: 'Сиксфирхи', en: 'Sixfirhy' },
  { id: 'neqoxec', habitat: 'hell', kin: 'demon', sprite: 'demons/neqoxec.png', tier: 5, style: 'caster', ru: 'Некоксек', en: 'Neqoxec' },
  { id: 'sun-demon', habitat: 'hell', kin: 'demon', sprite: 'demons/sun_demon.png', tier: 5, style: 'brute', element: 'fire', inflicts: burning(6), ru: 'Солнечный демон', en: 'Sun demon' },
  { id: 'chaos-spawn', habitat: 'hell', kin: 'demon', sprite: 'demons/chaos_spawn1.png', tier: 5, style: 'skirmisher', ru: 'Отродье хаоса', en: 'Chaos spawn' },
  { id: 'soul-eater', habitat: 'hell', kin: 'demon', sprite: 'demons/soul_eater.png', tier: 6, style: 'stalker', flying: true, ru: 'Пожиратель душ', en: 'Soul eater' },
  { id: 'efreet', habitat: 'hell', kin: 'demon', sprite: 'demons/efreet.png', tier: 6, style: 'caster', element: 'fire', inflicts: burning(7), ru: 'Ифрит', en: 'Efreet' },
  { id: 'ynoxinul', habitat: 'hell', kin: 'demon', sprite: 'demons/ynoxinul.png', tier: 6, style: 'skirmisher', flying: true, ru: 'Иноксинул', en: 'Ynoxinul' },
  { id: 'green-death', habitat: 'hell', kin: 'demon', sprite: 'demons/green_death.png', tier: 7, style: 'caster', large: true, inflicts: poison(9), ru: 'Зелёная смерть', en: 'Green death' },
  { id: 'lorocyproca', habitat: 'hell', kin: 'demon', sprite: 'demons/lorocyproca.png', tier: 7, style: 'stalker', ru: 'Лороципрока', en: 'Lorocyproca' },
  { id: 'reaper', habitat: 'hell', kin: 'demon', sprite: 'demons/reaper.png', tier: 7, style: 'brute', large: true, ru: 'Жнец', en: 'Reaper' },
  { id: 'tormentor', habitat: 'hell', kin: 'demon', sprite: 'demons/tormentor.png', tier: 8, style: 'caster', ru: 'Мучитель', en: 'Tormentor' },
  { id: 'hell-sentinel', habitat: 'hell', kin: 'demon', sprite: 'demons/hell_sentinel.png', tier: 8, style: 'brute', large: true, ru: 'Адский часовой', en: 'Hell sentinel' },
  { id: 'hell-beast', habitat: 'hell', kin: 'demon', sprite: 'demons/hell_beast.png', tier: 9, style: 'brute', large: true, ru: 'Адская тварь', en: 'Hell beast' },
];

/** Вторая волна каталога: сто с лишним существ, готовых к `MONSTER_CATALOG`. */
export const BESTIARY_WAVE_TWO = Object.freeze(ROSTER.map(buildCreature));

/** Их имена для экрана смерти, в том же формате, что и у первой волны. */
export const BESTIARY_WAVE_TWO_NAMES = Object.freeze(Object.fromEntries(
  ROSTER.map(({ id, ru, en }) => [id, Object.freeze({ ru, en })]),
));

export const BESTIARY_WAVE_TWO_IDS = Object.freeze(ROSTER.map(({ id }) => id));
