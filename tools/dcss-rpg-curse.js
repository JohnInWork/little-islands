/**
 * Bound gear: the one curse that changes what wearing a thing means.
 *
 * Every other drawback is arithmetic you can walk away from — take the ring
 * off and the −18 health comes back. A binding curse cannot be taken off, so
 * picking the artefact up is a decision about the rest of the run and not just
 * about this floor. That only works if the way out costs something real, and
 * if the game says plainly what the ways out are.
 *
 * Three of them, deliberately different in kind:
 *
 * - **A scroll of unbinding.** Found, not bought. Luck.
 * - **A priest at the temple.** Bought, and dearly. Money, and a walk back to
 *   the city, which on a descent with no bottom is the expensive part.
 * - **The high dispel.** Learned. It asks for intelligence the early game does
 *   not have, so it is a build, not a purchase.
 *
 * What none of them is: free. A curse you can shrug off at the next altar is
 * not a curse, it is a delay.
 */

export const UNBINDING_SCROLL_ITEM_ID = 'unbinding-scroll';
export const UNBINDING_SPELL_ID = 'unbinding';

/**
 * What the priest asks, and he asks by the look of you.
 *
 * The temple stands in the city, so a price keyed to the floor would be the
 * same price forever — the city is depth zero. It is keyed to the hero's level
 * instead, which is the one measure of a run the priest can actually see, and
 * which rises with how much the hero is carrying.
 *
 * Deliberately steep. The temple is the reliable way out, and a reliable way
 * out has to be the expensive one or the scroll and the spell stop mattering.
 */
export const TEMPLE_BASE_PRICE = 120;
export const TEMPLE_PRICE_PER_LEVEL = 45;

export function templePrice(level = 1) {
  const rank = Number.isInteger(level) && level > 1 ? level : 1;
  return TEMPLE_BASE_PRICE + (rank - 1) * TEMPLE_PRICE_PER_LEVEL;
}

/** Is this particular item bound to whoever put it on? */
export function itemIsBound(item) {
  return item?.magic?.sticky === true;
}

/**
 * Which worn slots are stuck. Read from what is worn, never stored: an item
 * that stops being an artefact stops being bound, and no save can disagree.
 */
export function boundSlots(equipment, items) {
  const byUid = items instanceof Map ? items : new Map((items ?? []).map((item) => [item.uid, item]));
  return Object.freeze(Object.entries(equipment ?? {})
    .filter(([, uid]) => uid && itemIsBound(byUid.get(uid)))
    .map(([slot]) => slot));
}

export function heroIsBound(equipment, items) {
  return boundSlots(equipment, items).length > 0;
}

/**
 * Lifting the curse. It does not destroy the item and it does not take the
 * power away — the sword stays a good sword, it simply stops holding on. That
 * matters: a cure that also ruined the thing would make every bound artefact
 * worthless, and then the whole curse is just «do not pick this up».
 */
export function unbindItem(item) {
  if (!itemIsBound(item)) return Object.freeze({ ok: false, reason: 'not-bound', item });
  const magic = { ...item.magic };
  delete magic.sticky;
  return Object.freeze({
    ok: true,
    reason: 'unbound',
    item: {
      ...item,
      // The curse is spent, not hidden: the record loses it, so a reload cannot
      // bring the shackle back.
      artifactCurseId: null,
      magic: Object.keys(magic).length > 0 ? magic : undefined,
    },
  });
}

const COPY = Object.freeze({
  ru: Object.freeze({
    bound: 'Вещь не снимается: на ней оковы.',
    priestName: 'Жрец',
    priestIdle: 'Храм невелик: алтарь, свечи и человек, который видел достаточно проклятого железа.',
    priestClean: 'Ты чист. Оковы — это не то, что я стал бы желать даже вору.',
    priestOffer: (gold) => `Снять оковы — ${gold}●. Дорого, знаю. Дешевле было не надевать.`,
    priestPoor: 'Столько у тебя нет. Приходи с деньгами — или найди свиток.',
    lifted: 'Оковы спали',
    nothingBound: 'Снимать нечего',
    notEnoughGold: 'Не хватает золота',
  }),
  en: Object.freeze({
    bound: 'The item will not come off: it is bound.',
    priestName: 'Priest',
    priestIdle: 'A small temple: an altar, candles, and a man who has seen enough cursed iron.',
    priestClean: 'You are clean. Binding is not a thing I would wish on a thief.',
    priestOffer: (gold) => `Lifting a binding costs ${gold}●. Dear, I know. Not wearing it was cheaper.`,
    priestPoor: 'You do not carry that much. Come back with it — or find a scroll.',
    lifted: 'The binding is lifted',
    nothingBound: 'Nothing is bound',
    notEnoughGold: 'Not enough gold',
  }),
});

export function curseCopy(language = 'ru') {
  return COPY[language === 'en' ? 'en' : 'ru'];
}

/**
 * The priest's offer, decided in one place so the panel, the price and the
 * refusal can never disagree with each other.
 */
export function templeOffer({ equipment, items, gold = 0, level = 1, language = 'ru' } = {}) {
  const copy = curseCopy(language);
  const slots = boundSlots(equipment, items);
  const price = templePrice(level);
  if (slots.length === 0) {
    return Object.freeze({ ok: false, reason: 'nothing-bound', price, slots, copy, text: copy.priestClean });
  }
  if (gold < price) {
    return Object.freeze({ ok: false, reason: 'too-dear', price, slots, copy, text: copy.priestPoor });
  }
  return Object.freeze({ ok: true, reason: 'offered', price, slots, copy, text: copy.priestOffer(price) });
}
