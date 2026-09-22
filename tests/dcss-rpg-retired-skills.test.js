import assert from 'node:assert/strict';
import test from 'node:test';

import { adoptRun, createRun, validateRun } from '../tools/dcss-rpg-core.js';
import { deriveSkillCapabilities } from '../tools/dcss-rpg-skills.js';
import { skillById } from '../tools/dcss-rpg-skill-content.js';

/**
 * Снятый навык не имеет права стоить игроку забега.
 *
 * Лагерь и ловушки перестали быть навыками — их получают все и сразу. Но у
 * того, кто уже вложил туда очки, сохранение остаётся с рангами несуществующих
 * навыков. Проверка забега такие ранги считает порчей и отвергает сейв целиком,
 * а загрузчик молча идёт к резервной копии, где ровно то же самое, — и вчерашний
 * герой исчезает, будто его не было. Именно это и случилось бы на телефоне.
 */

const прежние = ['camping', 'trap-setting', 'darkvision', 'alchemy', 'trap-sense', 'trap-disarming'];

test('снятые навыки больше не существуют в каталоге', () => {
  for (const id of прежние) {
    assert.equal(skillById(id) ?? null, null, `${id} всё ещё навык`);
  }
});

test('сейв с рангами снятых навыков принимается, а очки возвращаются', () => {
  const run = createRun(4242);
  const version = run.hero.skills.version;
  run.hero.level = 5;

  const чистый = { ...run, hero: { ...run.hero, skills: { version, points: 4, ranks: {} } } };
  assert.equal(validateRun(чистый), true, 'обычный сейв пятого уровня должен быть годен');

  const вчерашний = {
    ...run,
    hero: { ...run.hero, skills: { version, points: 1, ranks: { camping: 2, 'trap-setting': 1 } } },
  };
  assert.equal(validateRun(вчерашний), false, 'как есть сейв действительно негоден — ради этого и нужен приём');

  const принятый = adoptRun(вчерашний);
  assert.equal(validateRun(принятый), true, 'после приёма забег обязан загрузиться');
  assert.deepEqual(принятый.hero.skills.ranks, {}, 'ранги снятых навыков убраны');
  assert.equal(принятый.hero.skills.points, 4, 'все три вложенных очка вернулись игроку');
  assert.notEqual(принятый, вчерашний, 'приём не правит чужой объект на месте');
  assert.deepEqual(вчерашний.hero.skills.ranks, { camping: 2, 'trap-setting': 1 });
});

test('приём ничего не трогает там, где трогать нечего', () => {
  const run = createRun(4243);
  assert.equal(adoptRun(run), run, 'здоровый сейв возвращается тем же объектом');
  assert.equal(adoptRun(null), null);
  assert.equal(adoptRun({ hero: null }).hero, null);
});

test('лагерь доступен без всяких очков, а капканы — уже нет', () => {
  const run = createRun(4244);
  const умения = deriveSkillCapabilities(run.hero.skills);
  assert.ok(умения.campRank >= 3, `лагерь ранга ${умения.campRank}`);
  // Ставить капканы умел всякий; теперь это первый ранг «Ловушек». Иван:
  // «ставить ловушки можно на первом уровне этого навыка».
  assert.equal(умения.trapPlacementTier, 0, 'капканы всё ещё даром');
});

/**
 * Снятая сила артефакта — то же самое, только на вещи.
 *
 * Темнозрения в игре не стало, и вместе с навыком ушёл «Совиный Глаз»: сила,
 * которую проверка забега ищет в каталоге. Сейв с такой вещью в сумке негоден
 * целиком — а это чей-то живой забег. Поэтому сила слетает на приёме, а вещь
 * остаётся: без имени силы, но с тем же uid, на том же месте, надетая.
 */
test('сейв с силой, которой больше нет, принимается, а вещь остаётся', () => {
  const run = createRun(4245);
  const шлем = {
    id: 'worn-tunic',
    uid: 'owl-eye-tunic',
    affixIds: [],
    artifactPowerId: 'darkvision',
    artifactCurseId: null,
  };
  const вчерашний = {
    ...run,
    items: [...run.items, шлем],
    inventory: [...run.inventory, шлем.uid],
  };
  assert.equal(validateRun(вчерашний), false, 'как есть сейв действительно негоден');

  const принятый = adoptRun(вчерашний);
  assert.equal(validateRun(принятый), true, 'после приёма забег обязан загрузиться');
  const вещь = принятый.items.find(({ uid }) => uid === шлем.uid);
  assert.equal(вещь.artifactPowerId, null, 'сила всё ещё на вещи');
  assert.equal(вещь.id, 'worn-tunic', 'вещь потеряли вместе с силой');
  assert.ok(принятый.inventory.includes(шлем.uid), 'вещь пропала из рюкзака');
  assert.equal(вчерашний.items.at(-1).artifactPowerId, 'darkvision', 'приём правит чужой объект на месте');
});
