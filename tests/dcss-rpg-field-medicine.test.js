import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BANDAGE_ITEM_ID,
  FIELD_MEDICINE_HEAL_PERCENT,
  bandageRefusalText,
  fieldMedicineProfile,
  resolveBandage,
} from '../tools/dcss-rpg-field-medicine.js';
import { createActorEffects } from '../tools/dcss-rpg-effects.js';
import { lootById } from '../tools/dcss-rpg-content.js';
import { itemDetails } from '../tools/dcss-rpg-item-details.js';
import {
  SKILL_CAPABILITY_LIMITS,
  SKILL_SYSTEMS,
  createSkillState,
  deriveSkillCapabilities,
  isSkillReady,
  learnSkill,
} from '../tools/dcss-rpg-skills.js';

const capabilitiesAt = (rank) => {
  let state = createSkillState(8);
  for (let step = 0; step < rank; step += 1) {
    state = learnSkill({
      state, heroLevel: 8, runStatus: 'playing', skillId: 'field-medicine', expectedRank: step,
      attributes: { strength: 40, agility: 40, intelligence: 40 },
    }).state;
  }
  return deriveSkillCapabilities(state);
};

test('a dressing heals by rank and refuses without the skill', () => {
  const none = fieldMedicineProfile({});
  assert.equal(none.rank, 0);
  assert.equal(resolveBandage({ profile: none, hp: 10, maxHp: 60 }).reason, 'no-skill');

  const first = fieldMedicineProfile(capabilitiesAt(1));
  assert.equal(first.healPercent, FIELD_MEDICINE_HEAL_PERCENT[1]);
  const healed = resolveBandage({ profile: first, hp: 10, maxHp: 60 });
  assert.equal(healed.ok, true);
  assert.equal(healed.healed, 7, '12 percent of sixty, rounded');
  assert.equal(healed.hp, 17);
  assert.deepEqual([...healed.cleared], [], 'the first rank only closes wounds');

  assert.equal(resolveBandage({ profile: first, hp: 60, maxHp: 60 }).reason, 'nothing-to-treat');
  assert.equal(resolveBandage({ profile: first, hp: 10, maxHp: 0 }).reason, 'invalid');
  assert.equal(resolveBandage({ profile: first, hp: 59, maxHp: 60 }).healed, 1, 'a sliver of health is still worth a bandage');
});

test('practice turns a dressing against poison and fire', () => {
  const second = fieldMedicineProfile(capabilitiesAt(2));
  const third = fieldMedicineProfile(capabilitiesAt(3));
  assert.deepEqual([...second.treats], ['poison']);
  assert.deepEqual([...third.treats], ['poison', 'burning']);

  const effects = createActorEffects({ poison: 6, burning: 4, wet: 3 });
  const cured = resolveBandage({ profile: second, hp: 20, maxHp: 60, effects });
  assert.deepEqual([...cured.cleared], ['poison']);
  assert.equal(cured.effects.poison, 0);
  assert.equal(cured.effects.burning, 4, 'fire waits for the third rank');
  assert.equal(cured.effects.wet, 3, 'a dressing is not a towel');
  assert.equal(cured.healed, 12);

  const full = resolveBandage({ profile: third, hp: 60, maxHp: 60, effects });
  assert.equal(full.ok, true, 'a burning hero at full health still needs the bandage');
  assert.deepEqual([...full.cleared], ['poison', 'burning']);
  assert.equal(full.healed, 0);
});

test('bandages are a real item and the refusal says what is missing', () => {
  const bandage = lootById(BANDAGE_ITEM_ID);
  assert.ok(bandage, 'the bandages are in the catalog');
  assert.equal(bandage.slot, null);
  assert.deepEqual(bandage.useEffect, { type: 'bandage' });
  assert.equal(bandage.stack, 3);
  assert.equal(itemDetails(bandage, 'ru').name, 'Бинты');
  assert.equal(itemDetails(bandage, 'en').name, 'Bandages');
  assert.match(itemDetails(bandage, 'ru').description, /Перевязка ран/);
  assert.match(itemDetails(bandage, 'en').description, /Dresses wounds/);

  assert.equal(bandageRefusalText('no-skill', 'ru'), 'Нужен навык «Полевая медицина»');
  assert.equal(bandageRefusalText('nothing-to-treat', 'en'), 'Nothing to treat');
  assert.equal(bandageRefusalText('treated', 'ru'), '', 'a used bandage has nothing to explain');
});

test('Field medicine is a ready skill wired into the bag', async () => {
  assert.ok(SKILL_SYSTEMS.includes('medical-treatment'));
  assert.equal(isSkillReady('field-medicine'), true);
  assert.deepEqual(SKILL_CAPABILITY_LIMITS.fieldMedicineRank, [0, 3]);
  assert.equal(capabilitiesAt(3).fieldMedicineRank, 3);

  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(
    runtime,
    /effect\?\.type === 'bandage'[\s\S]*resolveBandage\(\{[\s\S]*profile: fieldMedicineProfile\(currentSkillCapabilities\(\)\)/,
  );
  assert.match(runtime, /hero\.effects = treatment\.effects;/, 'the cured states reach the hero');
});
