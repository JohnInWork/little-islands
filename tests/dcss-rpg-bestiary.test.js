import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

import {
  BESTIARY_STYLES,
  BESTIARY_WAVE_TWO,
  BESTIARY_WAVE_TWO_IDS,
  BESTIARY_WAVE_TWO_NAMES,
} from '../tools/dcss-rpg-bestiary.js';
import { branchDifficulty } from '../tools/dcss-rpg-branch-gates.js';
import {
  MONSTER_CATALOG,
  MONSTER_HABITATS,
  RUN_BRANCHES,
  monsterSuitsBranch,
} from '../tools/dcss-rpg-content.js';
import { ACTOR_EFFECT_IDS } from '../tools/dcss-rpg-effects.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { floorScaling, monsterEligibleForFloor, monsterTier } from '../tools/dcss-rpg-scaling.js';
import { RUN_END_SOURCE_NAMES } from '../tools/dcss-rpg-run-summary.js';

const preview = new URL('../public/assets/dcss-preview/', import.meta.url);
const KINS = ['humanoid', 'beast', 'undead', 'oddity', 'demon', 'dragon'];

const poolFor = (branch, depth) => MONSTER_CATALOG.filter((monster) => (
  monsterEligibleForFloor(monster, floorScaling(depth, undefined, branchDifficulty(branch)))
  && monsterSuitsBranch(monster, branch)
));

test('каждое новое существо — законная запись каталога', () => {
  assert.ok(BESTIARY_WAVE_TWO.length >= 120, `во второй волне всего ${BESTIARY_WAVE_TWO.length}`);
  assert.equal(BESTIARY_WAVE_TWO_IDS.length, BESTIARY_WAVE_TWO.length);
  for (const creature of BESTIARY_WAVE_TWO) {
    assert.ok(MONSTER_HABITATS.includes(creature.habitat), `${creature.id} живёт нигде`);
    assert.ok(KINS.includes(creature.kin), `${creature.id}: род «${creature.kin}»`);
    assert.ok(Number.isInteger(creature.tier) && creature.tier >= 1 && creature.tier <= 9);
    assert.equal(monsterTier(creature), creature.tier);
    for (const key of ['hp', 'damage', 'xp']) {
      assert.ok(Number.isInteger(creature[key]) && creature[key] > 0, `${creature.id}.${key}`);
    }
    assert.ok(creature.speed > 0.3 && creature.speed < 2, `${creature.id}: скорость ${creature.speed}`);
    for (const key of ['attackRate', 'vision', 'windup', 'pursuit']) {
      assert.ok(creature.threat[key] > 0, `${creature.id}.threat.${key}`);
    }
    if (creature.inflicts) assert.ok(ACTOR_EFFECT_IDS.includes(creature.inflicts.id), creature.id);
    if (creature.element) assert.ok(['fire', 'ice'].includes(creature.element), creature.id);
    // Ничего из этого не всплывает само: существо без картинки роняет игру на
    // загрузке, существо без имени — экран смерти.
    assert.ok(existsSync(new URL(creature.path, preview)), `${creature.id}: нет ${creature.path}`);
    const name = RUN_END_SOURCE_NAMES[creature.id];
    assert.ok(name?.ru && name?.en, `${creature.id} без имени`);
    assert.notEqual(name.ru, name.en, `${creature.id}: имя не переведено`);
    assert.equal(name.ru, BESTIARY_WAVE_TWO_NAMES[creature.id].ru);
  }
  // Ни одного повтора: ни имени, ни картинки, ни профиля угрозы — последнее
  // требует сам каталог, и ломается оно молча.
  const ids = MONSTER_CATALOG.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length, 'два существа с одним id');
  // Внутри волны картинки не повторяются, и ни одна не отобрана у первой
  // волны. По каталогу целиком так утверждать нельзя: там несколько пар
  // делят спрайт намеренно — прирученная овца и дикая, наёмник в трактире и
  // он же нанятый, босс и его рядовой двойник.
  const fresh = BESTIARY_WAVE_TWO.map(({ path }) => path);
  assert.equal(new Set(fresh).size, fresh.length, 'две новые записи с одной картинкой');
  const taken = new Set(MONSTER_CATALOG
    .filter(({ id }) => !BESTIARY_WAVE_TWO_IDS.includes(id))
    .map(({ path }) => path));
  for (const path of fresh) assert.equal(taken.has(path), false, `${path} уже занята первой волной`);
  const threats = MONSTER_CATALOG.map(({ threat }) => JSON.stringify(threat));
  assert.equal(new Set(threats).size, threats.length, 'два одинаковых профиля угрозы');
});

/**
 * То, ради чего волна и делалась. Узким местом был не размер каталога, а
 * потолок тира: на этажах 1-3 он равен единице, а существ тира 1 было девять
 * на всю игру — и на конкретную дорогу проходило три-пять. Проверяем не
 * «сколько записей в каталоге», а «сколько из них может выпасть игроку».
 */
test('на каждой дороге есть кем населить и первый этаж, и восемнадцатый', () => {
  for (const branch of RUN_BRANCHES) {
    const shallow = poolFor(branch, 1).length;
    const early = poolFor(branch, 5).length;
    const late = poolFor(branch, 14).length;
    assert.ok(shallow >= 6, `${branch}: на первом этаже всего ${shallow} видов`);
    assert.ok(early >= 12, `${branch}: на пятом этаже всего ${early} видов`);
    assert.ok(late >= 30, `${branch}: на четырнадцатом всего ${late} видов`);
    assert.ok(late > early && early > shallow, `${branch}: пул не растёт с глубиной`);
  }
});

test('забег по первым пяти этажам показывает не горстку существ', () => {
  for (const branch of RUN_BRANCHES) {
    const seen = new Set();
    for (let seed = 1; seed <= 30; seed += 1) {
      for (let depth = 1; depth <= 5; depth += 1) {
        for (const spawn of generateDungeon({ seed, depth, branch }).monsters) seen.add(spawn.id);
      }
    }
    assert.ok(seen.size >= 15, `${branch}: за тридцать забегов встретилось ${seen.size} видов`);
  }
});

/**
 * Урок «погребённого святилища»: если дорога вниз состоит почти целиком из
 * людей, то место, которое ослабляет людей и усиливает мертвецов, перестаёт
 * отличаться от места, которое делает наоборот. Доля рода — часть характера
 * дороги, и она ломается именно приростом каталога.
 */
test('ни одна живая дорога не состоит из одного рода', () => {
  for (const branch of ['deep', 'surface', 'crypt', 'hell']) {
    const pool = poolFor(branch, 18);
    const counts = {};
    for (const monster of pool) counts[monster.kin] = (counts[monster.kin] ?? 0) + 1;
    const top = Math.max(...Object.values(counts));
    assert.ok(
      top / pool.length <= 0.8,
      `${branch}: ${Math.round(top / pool.length * 100)}% пула — один род (${JSON.stringify(counts)})`,
    );
  }
  // Спуск отдельно: он про тех, кто копал, но и про то, что жило здесь раньше.
  const deep = poolFor('deep', 18);
  const humanoid = deep.filter(({ kin }) => kin === 'humanoid').length;
  assert.ok(humanoid / deep.length < 0.7, `спуск на ${Math.round(humanoid / deep.length * 100)}% из людей`);
  assert.ok(deep.some(({ kin }) => kin === 'beast') && deep.some(({ kin }) => kin === 'oddity'));
  // Хранилища — исключение по замыслу: там всё сделанное, и живых нет.
  const vaults = poolFor('vaults', 18);
  assert.ok(
    vaults.filter(({ kin }) => kin === 'oddity').length / vaults.length > 0.4,
    'хранилища перестали быть местом сделанных вещей',
  );
});

test('четыре повадки дают четыре разных зверя одной силы', () => {
  assert.deepEqual([...BESTIARY_STYLES].sort(), ['brute', 'caster', 'skirmisher', 'stalker']);
  // Повадка не записана в существо — она видна по его числам, и именно так её
  // читает игрок: от громилы успеваешь отойти, от налётчика нет, от охотника
  // не уходишь вовсе. Берём один тир и смотрим, что крайности разъехались.
  const tier = 4;
  const sameTier = BESTIARY_WAVE_TWO.filter((creature) => creature.tier === tier);
  assert.ok(sameTier.length >= 8, `в тире ${tier} всего ${sameTier.length} существ`);
  const best = (key, pick) => sameTier.reduce((a, b) => (pick(a[key], b[key]) ? a : b));
  const quickest = best('threat', (a, b) => a.attackRate > b.attackRate);
  const toughest = best('hp', (a, b) => a > b);
  assert.ok(quickest.hp < toughest.hp, 'самый быстрый оказался и самым толстым');
  assert.ok(quickest.speed > toughest.speed, 'громила бегает быстрее налётчика');
  assert.ok(quickest.threat.windup < toughest.threat.windup, 'у громилы замах короче');
  const longestChase = best('threat', (a, b) => a.pursuit > b.pursuit);
  assert.ok(
    longestChase.threat.pursuit > quickest.threat.pursuit * 1.5,
    'от налётчика и от охотника уходят одинаково долго',
  );
  const sharpestEye = best('threat', (a, b) => a.vision > b.vision);
  assert.ok(sharpestEye.threat.vision > toughest.threat.vision * 1.3, 'громила видит не хуже всех');
});
