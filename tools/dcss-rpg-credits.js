/**
 * Кто это нарисовал, записал и под какой лицензией отдал.
 *
 * Экран авторов — не вежливость, а условие, на котором игра вообще может
 * продаваться. Часть графики лежит под CC-BY и CC-BY-SA: эти лицензии
 * разрешают и правку, и продажу, но требуют назвать автора там, где работу
 * видно, — то есть в самой игре, а не только в файле в репозитории.
 *
 * Поэтому каталог живёт здесь, рядом с остальными правилами: чистый модуль
 * без единого обращения к DOM, двуязычный, как всё, что видит игрок. Адаптер
 * только раскладывает его по карточкам.
 *
 * Строки лицензий и имена авторов взяты из `LICENSE.md` рядом с самими файлами
 * и сверяются с ними тестом: каталог, разошедшийся с настоящей лицензией, —
 * это ровно то нарушение, ради предотвращения которого он написан.
 */

/** Ветка, в которой лежит искусство не под CC0: одна папка на пакет. */
export const LICENSED_ASSET_ROOT = 'public/assets/dcss-preview/licensed';

/**
 * Раздел титров.
 *
 * `id` — ключ раздела, `packDir` — папка пакета, если раздел про неё (по ней
 * тест и сверяет каталог с диском). `license` — та же строка, что в файле,
 * дословно: лицензия не пересказывается своими словами.
 */
const section = ({ id, packDir = null, license = null, source = null, ru, en }) => Object.freeze({
  id,
  packDir,
  license,
  source,
  ru: Object.freeze(ru),
  en: Object.freeze(en),
});

export const CREDITS_SECTIONS = Object.freeze([
  section({
    id: 'game',
    ru: {
      title: 'Игра',
      lines: Object.freeze([
        'DNG Codex — пиксельная 2D-рогалик-игра.',
        'Код и сборка: Иван Кузнецов.',
      ]),
    },
    en: {
      title: 'The game',
      lines: Object.freeze([
        'DNG Codex — a pixel 2D roguelike.',
        'Code and build: Ivan Kuznetsov.',
      ]),
    },
  }),
  section({
    id: 'dcss',
    license: 'CC0 1.0',
    source: 'https://github.com/crawl/tiles',
    ru: {
      title: 'Тайлы подземелья',
      lines: Object.freeze([
        'Dungeon Crawl Stone Soup — монстры, вещи, герой, стены и полы.',
        'Общественное достояние (CC0 1.0). Авторы просят упоминания — вот оно.',
      ]),
    },
    en: {
      title: 'Dungeon tiles',
      lines: Object.freeze([
        'Dungeon Crawl Stone Soup — monsters, items, the hero, walls and floors.',
        'Public domain (CC0 1.0). The authors ask to be acknowledged; here it is.',
      ]),
    },
  }),
  section({
    id: 'lpc-floors',
    packDir: 'lpc-floors',
    license: 'CC-BY-SA 4.0',
    source: 'https://opengameart.org/content/lpc-floors',
    ru: {
      title: '«[LPC] Floors» — полы',
      lines: Object.freeze([
        'bluecarrot16, Lanea Zimmerman (Sharm), William Thompson (William.Thompsonj), '
          + 'Hyptosis, SpiderDave, Cougarmint, Stephen Challener (Redshrike), Bonsaiheldin, '
          + 'Tyler Olsen (Roots), Jetrel, jestan, The Open Surge team, Gaurav Munjal, Reemax, '
          + 'Silveira Neto, bleutailfly, Casper Nilsson, NaRNeRZz, Buch, keith karnage, '
          + 'Arthur Carvalho, Guilherme Vieira (n2liquid), Chris Hamons.',
      ]),
    },
    en: {
      title: '“[LPC] Floors”',
      lines: Object.freeze([
        'bluecarrot16, Lanea Zimmerman (Sharm), William Thompson (William.Thompsonj), '
          + 'Hyptosis, SpiderDave, Cougarmint, Stephen Challener (Redshrike), Bonsaiheldin, '
          + 'Tyler Olsen (Roots), Jetrel, jestan, The Open Surge team, Gaurav Munjal, Reemax, '
          + 'Silveira Neto, bleutailfly, Casper Nilsson, NaRNeRZz, Buch, keith karnage, '
          + 'Arthur Carvalho, Guilherme Vieira (n2liquid), Chris Hamons.',
      ]),
    },
  }),
  section({
    id: 'lpc-tavern',
    packDir: 'lpc-tavern',
    license: 'CC-BY-SA 3.0',
    source: 'https://opengameart.org/content/lpc-tavern',
    ru: {
      title: '«[LPC] Tavern» — таверна',
      lines: Object.freeze([
        'bluecarrot16, Lanea Zimmerman (Sharm), William.Thompsonj, Jetrel, DCSS Contributors, '
          + 'Reemax, Hyptosis, Daniel Eddeland (Daneeklu), BenCreating, Evert, tapatilorenzo.',
      ]),
    },
    en: {
      title: '“[LPC] Tavern”',
      lines: Object.freeze([
        'bluecarrot16, Lanea Zimmerman (Sharm), William.Thompsonj, Jetrel, DCSS Contributors, '
          + 'Reemax, Hyptosis, Daniel Eddeland (Daneeklu), BenCreating, Evert, tapatilorenzo.',
      ]),
    },
  }),
  section({
    id: 'lpc-village',
    packDir: 'lpc-village',
    license: 'CC-BY-SA 3.0+',
    source: 'https://opengameart.org/content/lpc-medieval-village-decorations',
    ru: {
      title: '«[LPC] Medieval Village Decorations» — город',
      lines: Object.freeze([
        'bluecarrot16, Lanea Zimmerman (Sharm), Reemax (Tuomo Untinen), Xenodora, Johann C, '
          + 'Johannes Sjölund, Casper Nilsson, Daniel Cook, Rayane Félix (RayaneFLX), '
          + 'Wolthera van Hövell tot Westerflier (TheraHedwig), Hyptosis, mold, '
          + 'Zachariah Husiar (Zabin), Clint Bellanger, Jetrel, Nemisys, Guido Bos, Curt, '
          + 'Bertram, Daniel Eddeland (daneeklu).',
      ]),
    },
    en: {
      title: '“[LPC] Medieval Village Decorations”',
      lines: Object.freeze([
        'bluecarrot16, Lanea Zimmerman (Sharm), Reemax (Tuomo Untinen), Xenodora, Johann C, '
          + 'Johannes Sjölund, Casper Nilsson, Daniel Cook, Rayane Félix (RayaneFLX), '
          + 'Wolthera van Hövell tot Westerflier (TheraHedwig), Hyptosis, mold, '
          + 'Zachariah Husiar (Zabin), Clint Bellanger, Jetrel, Nemisys, Guido Bos, Curt, '
          + 'Bertram, Daniel Eddeland (daneeklu).',
      ]),
    },
  }),
  section({
    id: 'lpc-lamps',
    packDir: 'lpc-lamps',
    license: 'CC-BY 3.0+',
    source: 'https://opengameart.org/content/lpc-lamp-posts-rework',
    ru: {
      title: '«LPC Lamp Posts Rework» — фонари',
      lines: Object.freeze([
        'Curt, Lanea Zimmerman (Sharm), William.Thompsonj, mold. '
          + 'По мотивам «[LPC] Street Lamp» (Curt, Sharm, Hyptosis) и «[LPC] Misc» '
          + '(Sharm, William Thompson); сборку передал AntumDeluge.',
      ]),
    },
    en: {
      title: '“LPC Lamp Posts Rework”',
      lines: Object.freeze([
        'Curt, Lanea Zimmerman (Sharm), William.Thompsonj, mold. '
          + 'Reworked from “[LPC] Street Lamp” (Curt, Sharm, Hyptosis) and “[LPC] Misc” '
          + '(Sharm, William Thompson); assembled and submitted by AntumDeluge.',
      ]),
    },
  }),
  section({
    id: 'cmski-chests',
    packDir: 'cmski-chests',
    license: 'Cmski — demo pack',
    source: 'https://cmski.itch.io/animated-chests-pack-asset-pack-32x32',
    ru: {
      title: 'Сундуки',
      lines: Object.freeze([
        'Cmski, «Pixel Animated Chests». Автор разрешает использование в '
          + 'коммерческих проектах; перепродажа самих файлов запрещена.',
      ]),
    },
    en: {
      title: 'Chests',
      lines: Object.freeze([
        'Cmski, “Pixel Animated Chests”. The author permits commercial use; '
          + 'reselling the files themselves is not allowed.',
      ]),
    },
  }),
  section({
    id: '7soul-icons',
    packDir: '7soul-icons',
    license: 'CC0 1.0',
    source: 'https://opengameart.org/content/496-pixel-art-icons-for-medievalfantasy-rpg',
    ru: {
      title: 'Монета интерфейса',
      lines: Object.freeze([
        'Henrique Lazarini (7Soul1), «496 pixel art icons for medieval/fantasy RPG».',
        'Общественное достояние (CC0 1.0). Взята одна иконка — золотая монета.',
      ]),
    },
    en: {
      title: 'The interface coin',
      lines: Object.freeze([
        'Henrique Lazarini (7Soul1), “496 pixel art icons for medieval/fantasy RPG”.',
        'Public domain (CC0 1.0). One icon taken: the gold coin.',
      ]),
    },
  }),
  section({
    id: 'game-icons',
    license: 'CC BY 3.0',
    source: 'https://game-icons.net',
    ru: {
      title: 'Значки интерфейса',
      lines: Object.freeze([
        'game-icons.net — сплошные силуэты, нарисованные для инвентарей и панелей.',
        'Delapouite: рюкзак, снаряжение, внешность, звук, прицел, лестница, «i», очки навыков.',
        'Lorc: настройки, начать заново, записи, разум. sbed: череп. guard13007: пауза.',
      ]),
    },
    en: {
      title: 'Interface icons',
      lines: Object.freeze([
        'game-icons.net — solid silhouettes drawn for inventories and HUDs.',
        'Delapouite: backpack, gear, appearance, sound, crosshair, stairs, info, upgrade.',
        'Lorc: settings, restart, records, brain. sbed: skull. guard13007: pause.',
      ]),
    },
  }),
  section({
    id: 'audio',
    license: 'CC0 1.0',
    ru: {
      title: 'Звук',
      lines: Object.freeze([
        'Kenney (kenney.nl); Still North Media — Ben Jaszczak и Brian Nelson; '
          + 'Galacti-Chron, голос — Sky Rae.',
        'Freesound: JoeDinesSound, Mythmazter, RMSound, Za-Games, TRP; Ogrebane.',
        'Фон этажей и мелодии дорог — OpenGameArt: JaggedStone, Paul Wortmann, '
          + 'RandomMind, cynicmusic, Brandon75689, pauliuw, josepharaoh99, Joth, '
          + 'Cleyton Kauffman, Kevin MacLeod.',
        'Всё — общественное достояние (CC0 1.0); авторы названы из уважения.',
      ]),
    },
    en: {
      title: 'Sound',
      lines: Object.freeze([
        'Kenney (kenney.nl); Still North Media — Ben Jaszczak and Brian Nelson; '
          + 'Galacti-Chron, voice by Sky Rae.',
        'Freesound: JoeDinesSound, Mythmazter, RMSound, Za-Games, TRP; Ogrebane.',
        'Floor ambience and road themes from OpenGameArt: JaggedStone, '
          + 'Paul Wortmann, RandomMind, cynicmusic, Brandon75689, pauliuw, '
          + 'josepharaoh99, Joth, Cleyton Kauffman, Kevin MacLeod.',
        'All public domain (CC0 1.0); the authors are named out of courtesy.',
      ]),
    },
  }),
]);

const COPY = Object.freeze({
  ru: Object.freeze({
    title: 'Авторы',
    close: 'Закрыть авторов',
    intro: 'Игра стоит на чужой работе, и вот чьей. Полные тексты лицензий лежат '
      + 'рядом с самими файлами в репозитории.',
    licenseLabel: 'Лицензия',
  }),
  en: Object.freeze({
    title: 'Credits',
    close: 'Close credits',
    intro: 'The game stands on other people’s work. Here is whose. The full licence '
      + 'texts sit next to the files themselves in the repository.',
    licenseLabel: 'Licence',
  }),
});

export function creditsCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

/**
 * Готовая к отрисовке модель экрана: ни одного решения не остаётся адаптеру.
 */
export function creditsModel(language = 'ru') {
  const locale = language === 'en' ? 'en' : 'ru';
  const copy = COPY[locale];
  return Object.freeze({
    language: locale,
    title: copy.title,
    intro: copy.intro,
    close: copy.close,
    sections: Object.freeze(CREDITS_SECTIONS.map((entry) => Object.freeze({
      id: entry.id,
      title: entry[locale].title,
      lines: entry[locale].lines,
      license: entry.license,
      licenseLabel: entry.license ? `${copy.licenseLabel}: ${entry.license}` : '',
      source: entry.source,
    }))),
  });
}

/** Пакеты, о которых титры обязаны рассказать: по ним сверяется каталог. */
export const CREDITED_PACK_DIRS = Object.freeze(
  CREDITS_SECTIONS.map(({ packDir }) => packDir).filter(Boolean),
);
