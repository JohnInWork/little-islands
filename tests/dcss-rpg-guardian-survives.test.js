/**
 * Хранитель главы доживает до этажа.
 *
 * Полный проход забега — все дороги до конца, каждый этаж — нашёл то, чего не
 * видно, когда чинишь по кускам: на двух сидах из тридцати обещанный хранитель
 * не появлялся вовсе. Правило обещало его, цель этажа держала его имя, боец был
 * поставлен — и обстановка комнаты выносила его вместе с мебелью, если он
 * оказывался внутри трактира или лавки. Молча: ни одна проверка не спрашивала
 * «а он там?».
 *
 * Эти два сида зафиксированы поимённо. Они не «какие-нибудь» — они те самые.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createRun, hydrateDungeon, switchRunBranch, travelRunToDepth } from '../tools/dcss-rpg-core.js';
import { CITY_DEPTH } from '../tools/dcss-rpg-city.js';
import { chapterGuardianForDepth } from '../tools/dcss-rpg-run.js';
import { monsterById } from '../tools/dcss-rpg-content.js';

const floorAt = (seed, branch, depth) => {
  let snapshot = createRun(seed);
  snapshot.started = true;
  snapshot = travelRunToDepth(snapshot, CITY_DEPTH);
  snapshot = switchRunBranch(snapshot, branch);
  snapshot = travelRunToDepth(snapshot, depth);
  return hydrateDungeon(snapshot);
};

test('обещанный хранитель стоит на этаже, даже если попал в трактир', () => {
  // Сиды из полного прохода: на них хранителя съедала обстановка комнаты.
  for (const [seed, branch, depth] of [[31337, 'surface', 6], [777, 'surface', 24]]) {
    const level = floorAt(seed, branch, depth);
    const promised = chapterGuardianForDepth(depth, branch);
    assert.ok(promised, `${branch}/${depth}: правило не обещает хранителя`);
    assert.ok(level.objective, `сид ${seed} ${branch}/${depth}: у этажа нет цели`);
    assert.equal(level.objective.bossId, promised.monsterId);
    const seated = level.monsters.find(({ instanceId }) => instanceId === level.objective.bossInstanceId);
    assert.ok(seated, `сид ${seed} ${branch}/${depth}: хранителя вынесли с этажа`);
    assert.equal(seated.id, promised.monsterId);
    assert.ok(monsterById(seated.id)?.boss, `${seated.id} не помечен боссом`);
  }
});

test('каждая глава каждой дороги приводит своего хранителя', () => {
  for (const branch of ['deep', 'surface', 'vaults', 'crypt', 'hell']) {
    for (const depth of [6, 12, 18]) {
      const promised = chapterGuardianForDepth(depth, branch);
      const level = floorAt(4242, branch, depth);
      const seated = level.monsters.find(({ instanceId }) => instanceId === level.objective?.bossInstanceId);
      assert.ok(seated, `${branch}/${depth}: хранителя нет`);
      assert.equal(seated.id, promised.monsterId, `${branch}/${depth}: пришёл не тот`);
    }
  }
});
