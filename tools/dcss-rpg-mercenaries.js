/**
 * Hired help: a companion you buy instead of one you tame.
 *
 * The party rules already exist and are good — a limit that grows with a skill,
 * three standing orders, wounds that carry between floors. What was missing was
 * any way to get a companion that is not a sheep you fed bread to. A mercenary
 * fills that with no new combat code at all: they are a companion definition
 * with a price on it.
 *
 * The price ladder is the whole design: **a strong one costs a lot and a weak
 * one is cheap**, so hiring is a question about this run — spend the purse on a
 * sword arm now, or on your own gear and walk in alone. A flat price would make
 * it a formality; a ladder makes it a decision about what the run needs.
 */

/** What a hire is worth, and what it costs. Strength and price rise together. */
export const MERCENARIES = Object.freeze([
  Object.freeze({
    id: 'drifter',
    price: 70,
    path: 'mon/unique/grum.png',
    maxHp: 26,
    damage: 4,
    defense: 0,
    speed: 0.98,
    size: 70,
    labels: Object.freeze({ ru: 'Бродяга', en: 'Drifter' }),
    short: Object.freeze({ ru: 'Бродяга', en: 'Drifter' }),
    lines: Object.freeze({
      ru: 'Дешевле не найдёшь. И лучше тоже не найдёшь, если честно.',
      en: 'You will not find cheaper. Nor better, if I am honest.',
    }),
  }),
  Object.freeze({
    id: 'sellsword',
    price: 200,
    path: 'mon/unique/edmund.png',
    maxHp: 46,
    damage: 8,
    defense: 1,
    speed: 1.02,
    size: 74,
    labels: Object.freeze({ ru: 'Наёмный меч', en: 'Sellsword' }),
    short: Object.freeze({ ru: 'Наёмник', en: 'Sellsword' }),
    lines: Object.freeze({
      ru: 'Плата вперёд, вопросов не задаю, вниз иду первым.',
      en: 'Coin up front, no questions, and I take the first step down.',
    }),
  }),
  Object.freeze({
    id: 'veteran',
    price: 460,
    path: 'mon/unique/maud.png',
    maxHp: 72,
    damage: 12,
    defense: 3,
    speed: 1,
    size: 76,
    labels: Object.freeze({ ru: 'Ветеранка', en: 'Veteran' }),
    short: Object.freeze({ ru: 'Ветеранка', en: 'Veteran' }),
    lines: Object.freeze({
      ru: 'Я была ниже восемнадцатого. Дорого — потому что вернулась.',
      en: 'I have been below the eighteenth. I cost what I cost because I came back.',
    }),
  }),
  Object.freeze({
    id: 'knight-errant',
    price: 980,
    path: 'mon/unique/wiglaf.png',
    maxHp: 104,
    damage: 17,
    defense: 5,
    speed: 0.96,
    size: 80,
    labels: Object.freeze({ ru: 'Странствующий рыцарь', en: 'Knight errant' }),
    // A button on a 320-pixel phone has no room for «Странствующий рыцарь»
    // and a price beside it, and a clipped word reads as a broken screen.
    short: Object.freeze({ ru: 'Рыцарь', en: 'Knight' }),
    lines: Object.freeze({
      ru: 'Столько стоит доспех. Человек внутри идёт бесплатно.',
      en: 'That is the price of the armour. The man inside comes free.',
    }),
  }),
]);

const BY_ID = new Map(MERCENARIES.map((hire) => [hire.id, hire]));

export function mercenaryById(id) {
  return BY_ID.get(id) ?? null;
}

export function isMercenary(id) {
  return BY_ID.has(id);
}

export const MERCENARY_ASSET_PATHS = Object.freeze(MERCENARIES.map(({ path }) => path));

/**
 * Whether this hire can be made right now. Every refusal names itself, because
 * a greyed-out button that says nothing is the thing players complain about.
 */
export function canHire({ mercenaryId, gold = 0, party = [], partyLimit = 1 } = {}) {
  const hire = mercenaryById(mercenaryId);
  if (!hire) return Object.freeze({ ok: false, reason: 'unknown', price: 0 });
  if (party.length >= partyLimit) {
    return Object.freeze({ ok: false, reason: 'party-full', price: hire.price });
  }
  if (party.some((member) => member?.id === mercenaryId)) {
    return Object.freeze({ ok: false, reason: 'already-hired', price: hire.price });
  }
  if (gold < hire.price) return Object.freeze({ ok: false, reason: 'too-dear', price: hire.price });
  return Object.freeze({ ok: true, reason: 'ready', price: hire.price });
}

export function hireMercenary(options = {}) {
  const decision = canHire(options);
  if (!decision.ok) return decision;
  const hire = mercenaryById(options.mercenaryId);
  return Object.freeze({
    ok: true,
    reason: 'hired',
    price: hire.price,
    companion: { id: hire.id, hp: hire.maxHp, mode: 'guard' },
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    title: 'Наёмники',
    hire: 'Нанять',
    idle: 'Здесь стоят те, кто ходит вниз за деньги.',
    'party-full': 'Больше никого не уведёшь',
    'already-hired': 'Уже с тобой',
    'too-dear': 'Не хватает золота',
    unknown: 'Такого здесь нет',
    hired: (name) => `${name} идёт с тобой`,
  }),
  en: Object.freeze({
    title: 'Hired swords',
    hire: 'Hire',
    idle: 'These are the ones who go down for money.',
    'party-full': 'You cannot lead any more',
    'already-hired': 'Already with you',
    'too-dear': 'Not enough gold',
    unknown: 'Not here',
    hired: (name) => `${name} goes with you`,
  }),
});

export function mercenaryCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

export function mercenaryName(id, language = 'ru') {
  const hire = mercenaryById(id);
  return hire ? hire.labels[language === 'en' ? 'en' : 'ru'] : null;
}

/** Everything the hiring panel draws, decided once so nothing can disagree. */
export function mercenaryModel({ gold = 0, party = [], partyLimit = 1, language = 'ru' } = {}) {
  const copy = mercenaryCopy(language);
  const locale = language === 'en' ? 'en' : 'ru';
  return Object.freeze({
    copy,
    title: copy.title,
    gold,
    rows: Object.freeze(MERCENARIES.map((hire) => {
      const decision = canHire({ mercenaryId: hire.id, gold, party, partyLimit });
      return Object.freeze({
        id: hire.id,
        name: hire.labels[locale],
        shortName: (hire.short ?? hire.labels)[locale],
        line: hire.lines[locale],
        path: hire.path,
        price: hire.price,
        maxHp: hire.maxHp,
        damage: hire.damage,
        ok: decision.ok,
        // The refusal is the text, not a colour: three different «no» need
        // three different sentences.
        reason: decision.ok ? '' : copy[decision.reason] ?? copy.unknown,
      });
    })),
  });
}
