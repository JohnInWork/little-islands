import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  RESPEC_RATES,
  canRespec,
  respecHero,
  respecPrice,
  respecSpentPoints,
} from '../tools/dcss-rpg-respec.js';
import { createArchetypeBuild } from '../tools/dcss-rpg-character-creation.js';
import { validateSkillState } from '../tools/dcss-rpg-skills.js';
import { validateAttributeState } from '../tools/dcss-rpg-attributes.js';
import { parleyModel, resolveParley } from '../tools/dcss-rpg-parley.js';

const прокачанный = () => ({
  skills: { version: 1, points: 0, ranks: { swords: 1, shield: 1, axes: 2 }, granted: ['swords', 'shield'] },
  attributes: { strength: 7, agility: 3, intelligence: 3, spent: 2 },
});

/**
 * Платят за вложенное, а не за прожитое.
 *
 * Выданные при создании ступени никто не покупал, и в счёт они не идут. Иначе
 * герой платил бы за то, что ему выдали даром, и сброс на первом уровне стоил
 * бы денег при пустом кармане.
 */
test('в цену идёт только вложенное сверх созданного', () => {
  const { skills, attributes } = прокачанный();
  assert.equal(respecSpentPoints({ skills, attributes }), 4);
  // Только что созданный герой не вложил ничего.
  assert.equal(respecSpentPoints({
    skills: { version: 1, points: 0, ranks: { swords: 1, shield: 1 }, granted: ['swords', 'shield'] },
    attributes: { strength: 5, agility: 3, intelligence: 3, spent: 0 },
  }), 0);
  assert.equal(respecSpentPoints({}), 0);
  // Вторая ступень выданного навыка куплена и считается.
  assert.equal(respecSpentPoints({
    skills: { version: 1, points: 0, ranks: { swords: 2 }, granted: ['swords'] },
    attributes: null,
  }), 1);
});

test('городской жрец дороже странника, и оба берут по очку', () => {
  assert.ok(RESPEC_RATES.priest > RESPEC_RATES.sage, 'удобство должно стоить дороже редкости');
  assert.equal(respecPrice({ spent: 4, source: 'sage' }), 4 * RESPEC_RATES.sage);
  assert.equal(respecPrice({ spent: 4, source: 'priest' }), 4 * RESPEC_RATES.priest);
  assert.equal(respecPrice({ spent: 0, source: 'sage' }), 0);
  assert.throws(() => respecPrice({ spent: 4, source: 'нет такого' }), TypeError);
  assert.throws(() => respecPrice({ spent: -1 }), TypeError);
});

test('отказ всегда назван: нечего сбрасывать и нечем платить — разные вещи', () => {
  const { skills, attributes } = прокачанный();
  assert.equal(canRespec({ skills, attributes, gold: 1000 }).ok, true);
  assert.equal(canRespec({ skills, attributes, gold: 10 }).reason, 'no-gold');
  assert.equal(canRespec({ skills: { version: 1, points: 4, ranks: {} }, attributes: null, gold: 1000 }).reason, 'nothing-spent');
});

/**
 * Сброс возвращает к созданию, а не к нулю.
 *
 * Иначе он сжигал бы и выбранное при создании — и был бы не переигровкой, а
 * штрафом за то, что игрок однажды что-то выбрал.
 */
test('после сброса герой тот, кем вышел, а очки снова в кармане', () => {
  const build = createArchetypeBuild('warrior');
  const после = respecHero({ level: 5, build });
  assert.equal(после.skills.points, 4, 'вернулись не все очки уровня');
  assert.deepEqual(после.skills.ranks, { swords: 1, shield: 1 });
  assert.deepEqual([...после.skills.granted], ['swords', 'shield']);
  assert.equal(после.attributes.strength, 5, 'очки создания сгорели вместе с прокачанными');
  assert.equal(после.attributes.spent, 0);
  assert.equal(validateSkillState(после.skills, 5, после.attributes.spent), true);
  assert.equal(validateAttributeState({ ...после.attributes }), true);

  // Забег без создания откатывается к голым тройкам и пустым навыкам.
  const голый = respecHero({ level: 3, build: null });
  assert.deepEqual(голый.skills.ranks, {});
  assert.equal(Object.hasOwn(голый.skills, 'granted'), false);
  assert.equal(голый.attributes.strength, 3);
  assert.equal(validateSkillState(голый.skills, 3, 0), true);
  assert.throws(() => respecHero({ level: 0 }), TypeError);
});

test('Фаннар называет цену и не обижается на отказ', () => {
  const { skills, attributes } = прокачанный();
  const модель = parleyModel({ monsterId: 'fannar', depth: 5, gold: 1000, skills, attributes });
  assert.equal(модель.price, respecPrice({ spent: 4, source: 'sage' }));
  assert.equal(модель.options[0].enabled, true);
  assert.match(модель.options[0].label, /\{gold\}/, 'цена без монеты — просто число');

  const бедный = parleyModel({ monsterId: 'fannar', depth: 5, gold: 0, skills, attributes });
  assert.equal(бедный.options[0].enabled, false);
  assert.ok(бедный.options[0].hint.length > 0);

  const пустой = parleyModel({ monsterId: 'fannar', depth: 5, gold: 1000, skills: null, attributes: null });
  assert.equal(пустой.options[0].enabled, false, 'сброс предложен тому, кому нечего сбрасывать');

  const сделка = resolveParley({ monsterId: 'fannar', option: 'forget', depth: 5, gold: 1000, skills, attributes });
  assert.equal(сделка.respec, true);
  assert.equal(сделка.goldDelta, -respecPrice({ spent: 4, source: 'sage' }));
  assert.equal(сделка.hostile, false);
  assert.equal(сделка.leaves, false, 'добрый старик ушёл с этажа');

  const отказ = resolveParley({ monsterId: 'fannar', option: 'refuse', depth: 5, gold: 1000, skills, attributes });
  assert.equal(отказ.hostile, false);
  assert.equal(отказ.respec, false);
});

test('адаптер применяет сброс и берёт билд забега, а не пустоту', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /if \(result\.respec\) applyRespec\(\);/);
  assert.match(runtime, /respecHero\(\{ level: hero\.level, build: run\.build \?\? null, gifts: hero\.attributeGifts \}\)/);
  // Карточка Фаннара должна знать, сколько вложено, иначе цена будет нулевой.
  assert.match(runtime, /skills: hero\.skills,\s*\n\s*attributes: hero\.attributes,/);
});

/**
 * Две службы одного жреца.
 *
 * Иван: «добавить эту функцию в город у того же мага, у которого ты сбрасываешь
 * проклятие с вещей, но у него дороже будет намного». Дороже — за то, что он
 * всегда на месте: на бродячего Фаннара надо ещё наткнуться.
 */
test('жрец снимает и оковы, и выученное, и второе дороже', async () => {
  const { contextActionModel } = await import('../tools/dcss-rpg-context-actions.js');
  const модель = contextActionModel({
    target: {
      kind: 'priest',
      canUnbind: true,
      price: 40,
      text: 'Оковы снимаются за плату.',
      canForget: true,
      forgetHint: '400 {gold}',
    },
    language: 'ru',
  });
  assert.deepEqual(модель.actions.map(({ id }) => id), ['unbind', 'forget']);
  assert.equal(модель.actions[1].enabled, true);
  assert.match(модель.actions[1].hint, /400/);

  const нечего = contextActionModel({
    target: {
      kind: 'priest', canUnbind: false, price: 0, text: '',
      canForget: false, forgetHint: 'Забывать пока нечего',
    },
    language: 'ru',
  });
  assert.equal(нечего.actions[1].enabled, false);
  assert.equal(нечего.actions[1].hint, 'Забывать пока нечего');

  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /if \(action\.id === 'forget'\) return payPriestForForgetting\(\);/);
  assert.match(runtime, /source: 'priest',/);
});
