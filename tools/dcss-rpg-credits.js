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
 * Где прочитать саму лицензию.
 *
 * CC-BY и CC-BY-SA требуют не только имени автора, но и названия лицензии со
 * ссылкой на её текст. Имена в титрах были всегда, ссылок не было — этот
 * словарь их и даёт. MIT живёт не на сайте, а в файле уведомлений рядом с
 * игрой: её условие — чтобы текст путешествовал вместе с каждой копией.
 */
export const THIRD_PARTY_NOTICES_PATH = 'THIRD-PARTY-NOTICES.txt';

export const LICENSE_DEEDS = Object.freeze({
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY 3.0+': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC-BY-SA 3.0+': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC-BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'OFL 1.1': 'https://openfontlicense.org/open-font-license-official-text/',
  MIT: THIRD_PARTY_NOTICES_PATH,
});

/**
 * Раздел титров.
 *
 * `id` — ключ раздела, `packDir` — папка пакета, если раздел про неё (по ней
 * тест и сверяет каталог с диском). `license` — та же строка, что в файле,
 * дословно: лицензия не пересказывается своими словами.
 */
const section = ({ id, packDir = null, license = null, source = null, notice = null, ru, en }) => Object.freeze({
  id,
  packDir,
  license,
  licenseUrl: license ? LICENSE_DEEDS[license] ?? null : null,
  source,
  notice,
  ru: Object.freeze(ru),
  en: Object.freeze(en),
});

export const CREDITS_SECTIONS = Object.freeze([
  section({
    id: 'game',
    ru: { title: 'Автор', lines: Object.freeze(['Иван Кузнецов']) },
    en: { title: 'Author', lines: Object.freeze(['Ivan Kuznetsov']) },
  }),
  section({
    id: 'dcss',
    license: 'CC0 1.0',
    source: 'https://github.com/crawl/tiles',
    ru: {
      title: 'Тайлы подземелья',
      lines: Object.freeze(['Dungeon Crawl Stone Soup']),
    },
    en: {
      title: 'Dungeon tiles',
      lines: Object.freeze(['Dungeon Crawl Stone Soup']),
    },
  }),
  section({
    id: 'lpc-floors',
    packDir: 'lpc-floors',
    notice: 'assets/dcss-preview/licensed/lpc-floors/CREDITS-floors.txt',
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
    notice: 'assets/dcss-preview/licensed/lpc-tavern/CREDITS-tavern.txt',
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
    notice: 'assets/dcss-preview/licensed/lpc-village/CREDITS-decorations-medieval.txt',
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
    notice: 'assets/dcss-preview/licensed/lpc-lamps/README.txt',
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
        'Cmski, «Pixel Animated Chests»',
      ]),
    },
    en: {
      title: 'Chests',
      lines: Object.freeze([
        'Cmski, “Pixel Animated Chests”',
      ]),
    },
  }),
  section({
    id: '7soul-icons',
    packDir: '7soul-icons',
    license: 'CC0 1.0',
    source: 'https://opengameart.org/content/496-pixel-art-icons-for-medievalfantasy-rpg',
    ru: {
      title: 'Монета и ключи',
      lines: Object.freeze(['Henrique Lazarini (7Soul1)']),
    },
    en: {
      title: 'The coin and the keys',
      lines: Object.freeze(['Henrique Lazarini (7Soul1)']),
    },
  }),
  section({
    id: 'game-icons',
    packDir: 'game-icons',
    license: 'CC BY 3.0',
    source: 'https://game-icons.net',
    ru: {
      // CC BY требует назвать авторов — они и названы. Что каким значком
      // нарисовано, игроку знать незачем. Оттуда же и капкан на полу:
      // настоящего пиксельного капкана не нашлось нигде в свободном доступе.
      title: 'Значки интерфейса и капкан',
      lines: Object.freeze(['game-icons.net: Delapouite, Lorc, sbed, guard13007']),
    },
    en: {
      title: 'Interface icons and the trap',
      lines: Object.freeze(['game-icons.net: Delapouite, Lorc, sbed, guard13007']),
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
        'OpenGameArt: JaggedStone, Paul Wortmann, RandomMind, cynicmusic, '
          + 'Brandon75689, pauliuw, EmoPreben, Joth, Cleyton Kauffman; '
          + 'Kevin MacLeod — «Ancient Power of Serpents».',
      ]),
    },
    en: {
      title: 'Sound',
      lines: Object.freeze([
        'Kenney (kenney.nl); Still North Media — Ben Jaszczak and Brian Nelson; '
          + 'Galacti-Chron, voice by Sky Rae.',
        'Freesound: JoeDinesSound, Mythmazter, RMSound, Za-Games, TRP; Ogrebane.',
        'OpenGameArt: JaggedStone, Paul Wortmann, RandomMind, cynicmusic, '
          + 'Brandon75689, pauliuw, EmoPreben, Joth, Cleyton Kauffman; '
          + 'Kevin MacLeod — “Ancient Power of Serpents”.',
      ]),
    },
  }),
  section({
    // OFL требует, чтобы текст лицензии ехал вместе со шрифтом: он и едет,
    // рядом с файлом, а титры на него ссылаются.
    id: 'font',
    license: 'OFL 1.1',
    source: 'https://github.com/TakWolf/fusion-pixel-font',
    notice: 'assets/fonts/fusion-pixel-12px/OFL.txt',
    ru: {
      title: 'Шрифт',
      lines: Object.freeze(['Fusion Pixel Font — © 2022 TakWolf; на основе Ark Pixel, Cubic 11 и Galmuri.']),
    },
    en: {
      title: 'Font',
      lines: Object.freeze(['Fusion Pixel Font — © 2022 TakWolf; built on Ark Pixel, Cubic 11 and Galmuri.']),
    },
  }),
  section({
    id: 'code',
    license: 'MIT',
    source: 'https://threejs.org',
    notice: THIRD_PARTY_NOTICES_PATH,
    ru: {
      title: 'Код',
      lines: Object.freeze([
        'three.js — © 2010–2026 three.js authors.',
        'Флаги языков: flag-icons — © 2013 Panayiotis Lipiridis.',
      ]),
    },
    en: {
      title: 'Code',
      lines: Object.freeze([
        'three.js — © 2010–2026 three.js authors.',
        'Language flags: flag-icons — © 2013 Panayiotis Lipiridis.',
      ]),
    },
  }),
  section({
    // Магазины спрашивают, что игра делает с данными игрока. Ответ короткий,
    // и он должен быть в самой игре, а не только в описании на витрине.
    id: 'privacy',
    ru: {
      title: 'Приватность',
      lines: Object.freeze([
        'Игра ничего не собирает и никуда не отправляет. Сохранения, рекорды и '
          + 'настройки лежат только на этом устройстве, в памяти браузера. '
          + 'Стереть их можно в настройках.',
      ]),
    },
    en: {
      title: 'Privacy',
      lines: Object.freeze([
        'The game collects nothing and sends nothing anywhere. Saves, records '
          + 'and settings stay on this device, in the browser’s storage. '
          + 'You can erase them in Settings.',
      ]),
    },
  }),
]);

const COPY = Object.freeze({
  ru: Object.freeze({
    title: 'Авторы',
    close: 'Закрыть авторов',
    licenseLabel: 'Лицензия',
    noticeLabel: 'Полный список авторов',
    codeNoticeLabel: 'Тексты лицензий',
  }),
  en: Object.freeze({
    title: 'Credits',
    close: 'Close credits',
    licenseLabel: 'Licence',
    noticeLabel: 'Full credits',
    codeNoticeLabel: 'Licence texts',
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
    close: copy.close,
    sections: Object.freeze(CREDITS_SECTIONS.map((entry) => Object.freeze({
      id: entry.id,
      title: entry[locale].title,
      lines: entry[locale].lines,
      license: entry.license,
      licenseLabel: entry.license ? `${copy.licenseLabel}: ${entry.license}` : '',
      licenseUrl: entry.licenseUrl,
      source: entry.source,
      notice: entry.notice,
      noticeLabel: entry.notice
        // Паки LPC ведут к списку авторов, шрифт и код — к тексту лицензии.
        ? (/CREDITS|README/.test(entry.notice) ? copy.noticeLabel : copy.codeNoticeLabel)
        : '',
    }))),
  });
}

/** Пакеты, о которых титры обязаны рассказать: по ним сверяется каталог. */
export const CREDITED_PACK_DIRS = Object.freeze(
  CREDITS_SECTIONS.map(({ packDir }) => packDir).filter(Boolean),
);
