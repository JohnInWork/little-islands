import assert from 'node:assert/strict';
import test from 'node:test';

import { MONSTER_CATALOG, monsterById } from '../tools/dcss-rpg-content.js';
import { createRun, generateDungeon, hydrateDungeon, validateRun } from '../tools/dcss-rpg-core.js';
import { createActorEffects } from '../tools/dcss-rpg-effects.js';
import { findResultPresentation, resolveFindInteraction } from '../tools/dcss-rpg-finds.js';
import { createMonsterStates } from '../tools/dcss-rpg-rules.js';
import { floorScaling, monsterEligibleForFloor } from '../tools/dcss-rpg-scaling.js';
import {
  TOMB_MUMMY_BRANCHES,
  TOMB_MUMMY_CHANCE,
  TOMB_MUMMY_ID,
  TOMB_MUMMY_STAT_DEPTH,
  graveWakesMummy,
  tombMummyInstanceId,
} from '../tools/dcss-rpg-tomb.js';

/**
 * Иван: «осквернение гробницы может разбудить мумию». Проверяется, что это
 * решает сид, а не общий генератор; что доля честная; что мумия не водится
 * сама по себе; что она сильна на входе и переживает перезагрузку.
 */

const graveFloor = (() => {
  for (let seed = 1; seed <= 400; seed += 1) {
    const dungeon = generateDungeon({ seed, depth: 1 });
    const grave = dungeon.finds.find(({ id }) => id === 'forgotten-grave');
    if (grave?.mummyMonsterId) return { seed, dungeon, grave };
  }
  throw new Error('no grave with a mummy on the first floor of 400 seeds');
})();

test('мумию будит сид гробницы, а не бросок: ответ одинаков при каждом вызове', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const input = { seed, depth: 1 + (seed % 9), findInstanceId: `find-${1 + (seed % 9)}-${seed % 7}` };
    assert.equal(graveWakesMummy(input), graveWakesMummy({ ...input }));
  }
  assert.equal(graveWakesMummy({}), false, 'без сида мумии нет');
  assert.equal(graveWakesMummy({ seed: 1.5, depth: 1, findInstanceId: 'find-1-1' }), false);
});

test('из гробницы встаёт примерно одна мумия на одиннадцать', () => {
  let woke = 0;
  let total = 0;
  for (let seed = 1; seed <= 2000; seed += 1) {
    for (let depth = 1; depth <= 12; depth += 1) {
      for (let room = 1; room <= 6; room += 1) {
        total += 1;
        if (graveWakesMummy({ seed, depth, findInstanceId: `find-${depth}-${room}` })) woke += 1;
      }
    }
  }
  const rate = woke / total;
  assert.ok(Math.abs(rate - TOMB_MUMMY_CHANCE) < 0.01, `доля ${rate}`);
  assert.ok(TOMB_MUMMY_CHANCE >= 0.08 && TOMB_MUMMY_CHANCE <= 0.1);
});

test('мумия не водится: её нет ни в одном случайном пуле, только под своей гробницей', () => {
  const mummy = monsterById(TOMB_MUMMY_ID);
  assert.ok(mummy, 'мумия есть в каталоге');
  assert.equal(mummy.spawn, 'tomb');
  assert.equal(mummy.kin, 'undead');
  assert.ok(mummy.xp > 0, 'за мумию дают опыт');
  assert.equal(mummy.statFloorDepth, TOMB_MUMMY_STAT_DEPTH);
  for (let depth = 1; depth <= 30; depth += 1) {
    assert.equal(monsterEligibleForFloor(mummy, floorScaling(depth)), false, `этаж ${depth}`);
  }
  let seen = 0;
  for (const branch of ['deep', 'crypt', 'hell', 'surface']) {
    for (let seed = 1; seed <= 60; seed += 1) {
      for (let depth = 1; depth <= 6; depth += 1) {
        const dungeon = generateDungeon({ seed, depth, branch });
        const mummies = dungeon.monsters.filter(({ id }) => id === TOMB_MUMMY_ID);
        assert.ok(mummies.length <= 1);
        if (mummies.length === 0) continue;
        seen += 1;
        assert.ok(TOMB_MUMMY_BRANCHES.includes(branch), `${branch}: нежити здесь не место`);
        const [spawn] = mummies;
        const grave = dungeon.finds.find(({ instanceId }) => instanceId === spawn.activationFindId);
        assert.equal(grave?.id, 'forgotten-grave', 'мумия лежит только под гробницей');
        assert.equal(grave.mummyMonsterId, spawn.instanceId);
        assert.equal(spawn.instanceId, tombMummyInstanceId(depth));
        assert.ok(Math.max(Math.abs(spawn.x - grave.x), Math.abs(spawn.y - grave.y)) === 1, 'вплотную к плите');
        assert.equal(dungeon.grid[spawn.y][spawn.x], '.');
      }
    }
  }
  assert.ok(seen > 0, 'за сотни этажей мумия встала хоть раз');
  assert.deepEqual(TOMB_MUMMY_BRANCHES, ['deep', 'vaults', 'crypt']);
});

test('этаж с мумией тот же этаж: генерация повторяется, прочие существа на месте', () => {
  const again = generateDungeon({ seed: graveFloor.seed, depth: 1 });
  assert.deepEqual(again.monsters, graveFloor.dungeon.monsters);
  assert.deepEqual(again.finds, graveFloor.dungeon.finds);
  // Мумия кладётся последней и не отнимает ни одного id у обычных существ.
  assert.equal(graveFloor.dungeon.monsters.at(-1).id, TOMB_MUMMY_ID);
});

test('мумия на первом этаже сильна как на шестом, глубже растёт с этажом', () => {
  const mummy = monsterById(TOMB_MUMMY_ID);
  const spawn = graveFloor.dungeon.monsters.find(({ id }) => id === TOMB_MUMMY_ID);
  const [shallow] = createMonsterStates({ ...graveFloor.dungeon, monsters: [spawn] });
  const sixth = floorScaling(TOMB_MUMMY_STAT_DEPTH).monsters;
  assert.equal(shallow.maxHp, Math.round(mummy.hp * sixth.hpMultiplier));
  assert.equal(shallow.damage, Math.round(mummy.damage * sixth.damageMultiplier));
  assert.ok(shallow.damage >= 40, 'на входе два удара почти убивают свежего героя');
  const deep = generateDungeon({ seed: graveFloor.seed, depth: 12 });
  const [late] = createMonsterStates({ ...deep, monsters: [{ ...spawn, instanceId: 'monster-12-mummy' }] });
  assert.equal(late.maxHp, Math.round(mummy.hp * deep.scaling.monsters.hpMultiplier));
  assert.ok(late.maxHp > shallow.maxHp);
  // Обычное существо входа по-прежнему смягчено.
  const [gnoll] = createMonsterStates({ ...graveFloor.dungeon, monsters: [{ ...spawn, id: 'gnoll' }] });
  assert.ok(gnoll.damage < Math.round(monsterById('gnoll').damage * sixth.damageMultiplier));
});

test('осквернение будит мумию и объявляет её; без мумии гробница прежняя', () => {
  const find = { ...graveFloor.grave };
  const input = {
    find,
    resolvedFindIds: [],
    runStatus: 'playing',
    hero: { x: find.x + 1, y: find.y, hp: 100, maxHp: 100, power: 0 },
    gold: 0,
  };
  const woke = resolveFindInteraction(input);
  assert.equal(woke.ok, true);
  assert.equal(woke.awakensMummy, true);
  assert.deepEqual(woke.activatedMonsterIds, [find.mummyMonsterId]);
  assert.ok(woke.noise > 0);
  assert.equal(woke.rewardGold, find.rewardGold, 'золото гробница отдаёт и с мумией');
  assert.equal(findResultPresentation(woke, find, 'ru').message, 'Из гробницы поднимается мумия!');
  assert.equal(findResultPresentation(woke, find, 'en').message, 'A mummy rises from the tomb!');

  const { mummyMonsterId, ...plainGrave } = find;
  const quiet = resolveFindInteraction({ ...input, find: plainGrave });
  assert.equal(quiet.awakensMummy, false);
  assert.deepEqual(quiet.activatedMonsterIds, []);
  assert.notEqual(findResultPresentation(quiet, plainGrave, 'ru').message, 'Из гробницы поднимается мумия!');
});

test('бой с мумией переживает перезагрузку, убитая мумия не встаёт', () => {
  const { seed, dungeon, grave } = graveFloor;
  const spawn = dungeon.monsters.find(({ id }) => id === TOMB_MUMMY_ID);
  const base = createRun(seed, dungeon);
  const midFight = structuredClone(base);
  midFight.floor.resolvedFindIds = [grave.instanceId];
  midFight.floor.monsters = [{
    instanceId: spawn.instanceId,
    x: spawn.x,
    y: spawn.y,
    hp: 37,
    attackSequence: 2,
    effects: createActorEffects(),
  }];
  assert.equal(validateRun(midFight), true);
  const hydrated = hydrateDungeon(midFight);
  const saved = hydrated.monsters.find(({ instanceId }) => instanceId === spawn.instanceId);
  assert.equal(saved.state.hp, 37);
  const [restored] = createMonsterStates({ ...hydrated, monsters: [saved] });
  assert.equal(restored.hp, 37, 'раненая мумия возвращается раненой');

  const won = structuredClone(base);
  won.floor.resolvedFindIds = [grave.instanceId];
  won.floor.defeated = [spawn.instanceId];
  assert.equal(validateRun(won), true);
  assert.equal(hydrateDungeon(won).monsters.some(({ instanceId }) => instanceId === spawn.instanceId), false);
});

test('гробница в карточке предупреждает о мёртвых честно', async () => {
  const { interactionDefinitionFor } = await import('../tools/dcss-rpg-context-actions.js');
  assert.ok(interactionDefinitionFor({ kind: 'find', id: 'forgotten-grave', rewardGold: 1, riskDamage: 1, rewardPower: 0 }));
  const source = await import('node:fs').then(({ readFileSync }) => readFileSync(
    new URL('../tools/dcss-rpg-context-actions.js', import.meta.url),
    'utf8',
  ));
  assert.match(source, /graveInspected: '[^']*встаёт и сам мёртвый/);
  assert.match(source, /graveInspected: '[^']*sometimes the dead rise/);
  assert.equal(MONSTER_CATALOG.filter(({ id }) => id === TOMB_MUMMY_ID).length, 1);
});
