import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MERCENARIES,
  canHire,
  hireMercenary,
  isMercenary,
  mercenaryById,
  mercenaryModel,
  mercenaryName,
} from '../tools/dcss-rpg-mercenaries.js';
import {
  COMPANION_LIMIT,
  companionDefinitionById,
  companionStats,
  createCompanionParty,
  validateCompanionState,
} from '../tools/dcss-rpg-companions.js';
import { monsterById } from '../tools/dcss-rpg-content.js';
import { CITY_RECRUITER_ID } from '../tools/dcss-rpg-city.js';
import { runEndSourceName } from '../tools/dcss-rpg-run-summary.js';

/**
 * The whole design is the ladder: a strong hire costs a lot and a weak one is
 * cheap, so taking one asks a question about this run — a sword arm now, or
 * your own gear and walk in alone. A flat price would make it a formality.
 */
test('strength and price rise together, with no bargains in the middle', () => {
  assert.ok(MERCENARIES.length >= 3);
  for (let index = 1; index < MERCENARIES.length; index += 1) {
    const cheaper = MERCENARIES[index - 1];
    const dearer = MERCENARIES[index];
    assert.ok(dearer.price > cheaper.price, `${dearer.id} не дороже предыдущего`);
    assert.ok(dearer.maxHp > cheaper.maxHp, `${dearer.id} не крепче`);
    assert.ok(dearer.damage > cheaper.damage, `${dearer.id} не сильнее`);
    // And no rung is a bargain: the price per point of health never collapses.
    const value = dearer.price / (dearer.maxHp + dearer.damage * 4);
    const previous = cheaper.price / (cheaper.maxHp + cheaper.damage * 4);
    assert.ok(value > previous * 0.8, `${dearer.id}: сильный оказался дешевле по цене за силу`);
  }
  // Each one says something, and says who it is.
  for (const hire of MERCENARIES) {
    assert.ok(hire.labels.ru && hire.labels.en, hire.id);
    assert.ok(hire.lines.ru.length > 10, `${hire.id}: нечего сказать`);
    assert.ok(hire.path.endsWith('.png'));
  }
});

test('every refusal names itself', () => {
  const rich = { mercenaryId: 'veteran', gold: 9999, party: [], partyLimit: 2 };
  assert.equal(canHire(rich).ok, true);
  assert.equal(canHire({ ...rich, gold: 0 }).reason, 'too-dear');
  assert.equal(canHire({ ...rich, party: [{ id: 'veteran' }] }).reason, 'already-hired');
  assert.equal(canHire({ ...rich, party: [{ id: 'drifter' }], partyLimit: 1 }).reason, 'party-full');
  assert.equal(canHire({ ...rich, mercenaryId: 'nobody' }).reason, 'unknown');
  // The panel turns each of those into a sentence rather than a grey button.
  const model = mercenaryModel({ gold: 100, party: [], partyLimit: 1, language: 'ru' });
  for (const row of model.rows) {
    if (row.ok) continue;
    assert.ok(row.reason.length > 0, `${row.id}: отказ молчит`);
  }
  assert.notDeepEqual(mercenaryModel({ language: 'en' }).copy, mercenaryModel({ language: 'ru' }).copy);
});

/**
 * A hire is a companion, and the party rules never learn there are two kinds:
 * wounds, orders, the limit and the save all read one lookup.
 */
test('a hire is a companion like any other', () => {
  const hired = hireMercenary({ mercenaryId: 'sellsword', gold: 9999, party: [], partyLimit: 2 });
  assert.equal(hired.ok, true);
  assert.deepEqual(hired.companion, { id: 'sellsword', hp: mercenaryById('sellsword').maxHp, mode: 'guard' });
  assert.equal(validateCompanionState(hired.companion), true, 'сохранение не примет наёмника');
  assert.equal(createCompanionParty([hired.companion]).length, 1);
  assert.ok(companionDefinitionById('sellsword'), 'один поиск не знает наёмника');
  assert.ok(companionDefinitionById('sheep'), 'и перестал знать зверя');
  const stats = companionStats({ creatureId: 'sellsword' });
  assert.equal(stats.maxHp, mercenaryById('sellsword').maxHp);
  assert.ok(mercenaryName('sellsword', 'ru').length > 0);
  assert.equal(isMercenary('sheep'), false);
  // The party can never exceed what the skill allows, whatever is hired.
  assert.ok(MERCENARIES.length > COMPANION_LIMIT.at(-1), 'нанять можно больше, чем увести');
});

test('every hire has a body to stand in and a name on the death screen', () => {
  for (const hire of MERCENARIES) {
    const ally = monsterById(`hired-${hire.id}`);
    assert.ok(ally, `${hire.id}: некому встать рядом`);
    assert.equal(ally.spawn, 'summon', `${hire.id} попадёт в общий пул`);
    assert.equal(ally.xp, 0, `${hire.id} даёт опыт за собственную смерть`);
    assert.ok(runEndSourceName(`hired-${hire.id}`, 'ru'), `${hire.id} без имени`);
  }
  // And somebody takes the hires: neutral, on the market, in every city.
  const recruiter = monsterById(CITY_RECRUITER_ID);
  assert.ok(recruiter);
  assert.equal(recruiter.neutral, true, 'вербовщика можно бить безнаказанно');
});

test('the runtime pays only once the hire is standing there', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const body = runtime.match(/function hireIntoParty\(mercenaryId\) \{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';
  assert.ok(body.length > 0, 'hireIntoParty пропала');
  // The companion is raised first, the purse is emptied second, and a failed
  // raise puts the party back — a purse that empties with nothing to show for
  // it is the worst bug a paid thing can have.
  assert.ok(body.indexOf('raiseCompanion(index)') < body.indexOf('gold -= result.price'));
  assert.match(body, /run\.companions = createCompanionParty\(run\.companions\.slice\(0, index\)\)/);
  // It is called from the panel, and the panel is fed by the one model.
  assert.match(runtime, /recruiter\(\{ action \}\)[\s\S]{0,200}?hireIntoParty\(/);
  assert.match(runtime, /mercenaryModel\(\{/);
});
