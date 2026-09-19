import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  TEMPLE_BASE_PRICE,
  UNBINDING_SCROLL_ITEM_ID,
  UNBINDING_SPELL_ID,
  boundSlots,
  heroIsBound,
  itemIsBound,
  templeOffer,
  templePrice,
  unbindItem,
} from '../tools/dcss-rpg-curse.js';
import { materializeProceduralArtifact } from '../tools/dcss-rpg-artifacts.js';
import { LOOT_CATALOG, lootById } from '../tools/dcss-rpg-content.js';
import { createEmptyEquipment, equipInventoryItem, unequipItem } from '../tools/dcss-rpg-rules.js';
import { equipmentMagic } from '../tools/dcss-rpg-magic.js';
import { spellById } from '../tools/dcss-rpg-spells.js';

const bind = (id, uid = id) => materializeProceduralArtifact(
  { ...lootById(id), uid },
  { uid, artifactPowerId: id === 'long-sword' ? 'vampirism' : 'thorns', artifactCurseId: 'binding' },
);

/**
 * Every other drawback is arithmetic you can walk away from: take the ring off
 * and the −18 health comes back. This one is a commitment, and it is only a
 * commitment if the game refuses every way out of it.
 */
test('a bound item will not come off, and will not be swapped off either', () => {
  const helm = bind('iron-helm', 'h');
  const other = { ...lootById('horned-helm'), uid: 'p' };
  const state = {
    items: [helm, other],
    inventory: ['p'],
    equipment: { ...createEmptyEquipment(), head: 'h' },
  };
  assert.equal(itemIsBound(helm), true);
  assert.equal(unequipItem(state, 'head').reason, 'bound');
  // Putting a second helmet on is the other way to take the first one off.
  assert.equal(equipInventoryItem(state, 'p').reason, 'bound');
  // …and it is the slot that is bound, not the hero: everything else is free.
  const free = { ...state, equipment: { ...state.equipment, body: 'p' }, inventory: [] };
  assert.deepEqual(boundSlots(free.equipment, free.items), ['head']);
  assert.equal(heroIsBound(free.equipment, free.items), true);
  assert.equal(heroIsBound(createEmptyEquipment(), free.items), false);
  // The aggregator carries it like any other trait, from what is worn.
  assert.equal(equipmentMagic(state.equipment, state.items).sticky, true);
});

/**
 * Lifting the curse frees the thing; it does not ruin it. A cure that also took
 * the power away would make every bound artefact worthless, and then the curse
 * is not a decision, it is just «do not pick this up».
 */
test('lifting a binding frees the item and leaves the artefact intact', () => {
  const sword = bind('long-sword', 's');
  const freed = unbindItem(sword);
  assert.equal(freed.ok, true);
  assert.equal(itemIsBound(freed.item), false);
  assert.equal(freed.item.artifactPowerId, 'vampirism', 'the sword is still the sword');
  assert.equal(freed.item.magic.vampirism, true);
  assert.equal(freed.item.artifactCurseId, null, 'and the shackle is spent, not hidden');
  // A second lifting is a refusal, not a second charge.
  assert.equal(unbindItem(freed.item).reason, 'not-bound');
  assert.equal(unbindItem({ ...lootById('iron-helm'), uid: 'x' }).reason, 'not-bound');
});

/**
 * Three ways out, deliberately different in kind: luck, money, and a build.
 * None of them is free, because a curse you can shrug off at the next altar is
 * not a curse but a delay.
 */
test('there are exactly three ways out, and each costs a different thing', () => {
  // Luck: found, never sold.
  const scroll = lootById(UNBINDING_SCROLL_ITEM_ID);
  assert.ok(scroll, 'the scroll exists');
  assert.equal(scroll.useEffect.type, 'unbind');
  assert.ok(scroll.minDepth >= 2, 'never on the teaching floor');

  // A build: the spell asks for more intelligence than almost anything else.
  const spell = spellById(UNBINDING_SPELL_ID);
  assert.ok(spell, 'the spell exists');
  assert.equal(spell.kind, 'unbind');
  assert.ok(spell.minimumIntelligence >= 8, 'a late spell, not an early one');
  assert.ok(LOOT_CATALOG.some((item) => item.bookEffect?.spellId === UNBINDING_SPELL_ID),
    'a spell with no book is a spell nobody can learn');

  // Money: steep, and steeper the further a run has come.
  assert.equal(templePrice(1), TEMPLE_BASE_PRICE);
  assert.ok(templePrice(6) > templePrice(1) * 2, 'the priest charges by the look of you');
});

test('the priest says the same thing his button does', () => {
  const helm = bind('iron-helm', 'h');
  const items = [helm];
  const equipment = { ...createEmptyEquipment(), head: 'h' };

  const clean = templeOffer({ equipment: createEmptyEquipment(), items, gold: 9999, level: 1 });
  assert.equal(clean.ok, false);
  assert.equal(clean.reason, 'nothing-bound');
  assert.ok(clean.text.length > 0, 'and he says why');

  const poor = templeOffer({ equipment, items, gold: 0, level: 1 });
  assert.equal(poor.ok, false);
  assert.equal(poor.reason, 'too-dear');
  assert.notEqual(poor.text, clean.text, 'two refusals, two reasons');

  const offer = templeOffer({ equipment, items, gold: 9999, level: 1 });
  assert.equal(offer.ok, true);
  assert.deepEqual([...offer.slots], ['head']);
  assert.match(offer.text, new RegExp(String(offer.price)), 'the price is said out loud');
  assert.notDeepEqual(
    templeOffer({ equipment, items, gold: 9999, level: 1, language: 'en' }).copy,
    offer.copy,
  );
});

test('the runtime pays and frees in the same breath', async () => {
  const runtime = readFileSync(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  // The money moves only after the shackle does — a purse that empties without
  // the curse coming off is the worst bug this feature could have.
  assert.match(runtime, /if \(liftBindings\(uids\) === 0\) return false;\s*\n\s*gold -= offer\.price;/);
  // All three cures go through the one function, so none of them can free a
  // thing the others would not.
  assert.match(runtime, /function liftBindings\(/);
  assert.match(runtime, /effect\?\.type === 'unbind'[\s\S]{0,600}?liftBindings\(/);
  assert.match(runtime, /usedSpell\.kind === 'unbind'[\s\S]{0,400}?liftBindings\(/);
});
