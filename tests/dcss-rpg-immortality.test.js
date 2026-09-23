import assert from 'node:assert/strict';
import test from 'node:test';

import { MONSTER_CATALOG } from '../tools/dcss-rpg-content.js';
import { generateDungeon } from '../tools/dcss-rpg-core.js';
import { mitigateDamage } from '../tools/dcss-rpg-rules.js';
import {
  VAMPIRISM_RATE_DEEP,
  VAMPIRISM_RATE_EARLY,
  VAMPIRISM_RATE_FULL_DEPTH,
  vampiricBudget,
  vampiricRate,
} from '../tools/dcss-rpg-magic.js';

/**
 * Бессмертный билд.
 *
 * Иван: «очень боюсь того, что игроку может нарандомиться какой-то просто
 * максимально имбовый, бесконечный билд, что он просто всю игру за раз вот так
 * возьмёт и пройдёт». И следом: «при всём при этом игра должна давать
 * возможность делать очень крутые билды, просто не на раннем этапе».
 *
 * Вампиризм — единственное в игре, что лечит от нанесённого урона, а урон и
 * скорость атаки растут весь забег. Всё остальное уже упёрто в потолки: тернии
 * в сорок процентов, добивание берёт лучшее из двух, ускорение в тридцать,
 * лечение за убийство в четыре. И броня не делает неуязвимым — в формуле урона
 * стоит пол в тридцать пять процентов.
 *
 * Здесь проверяется то, что можно посчитать честно: потолок лечения против
 * настоящих чисел этажа. Полноценный забег это не заменяет — он измерил бы и
 * то, сколько монстр живёт под ударами, — но ловит саму арифметику.
 */

/** Сколько урона в секунду выдаёт один монстр, каких этот этаж и населяют. */
function ударЭтажа(depth) {
  const scaling = generateDungeon({ seed: 11, depth }).scaling;
  const пул = MONSTER_CATALOG.filter((monster) => (
    !monster.boss && monster.tier <= scaling.encounters.maxMonsterTier
  ));
  assert.ok(пул.length > 0, `этаж ${depth}: некому нападать`);
  const средний = пул.reduce((total, m) => total + m.damage, 0) / пул.length;
  const скорость = пул.reduce((total, m) => total + m.threat.attackRate, 0) / пул.length;
  const заУдар = средний * scaling.monsters.damageMultiplier;
  return {
    заУдар,
    вСекунду: заУдар * скорость * scaling.monsters.attackRateMultiplier,
  };
}

/** Здоровье героя, какого этот этаж ожидает. Оценка сверху, не снизу. */
const здоровьеГероя = (depth) => 100 + depth * 14;

test('потолок вампиризма раздвигается вниз по дороге, а не держит всю игру', () => {
  assert.ok(VAMPIRISM_RATE_EARLY < VAMPIRISM_RATE_DEEP, 'потолок не растёт');
  assert.equal(vampiricRate(1), VAMPIRISM_RATE_EARLY);
  assert.equal(vampiricRate(VAMPIRISM_RATE_FULL_DEPTH), VAMPIRISM_RATE_DEEP);
  // Глубже написанной дороги он не растёт: обещанное уже выдано.
  assert.equal(vampiricRate(40), VAMPIRISM_RATE_DEEP);
  for (let depth = 2; depth <= VAMPIRISM_RATE_FULL_DEPTH; depth += 1) {
    assert.ok(vampiricRate(depth) > vampiricRate(depth - 1), `этаж ${depth}: потолок не поднялся`);
  }
  // К концу дороги он раздвигается больше чем втрое: это и есть та награда за
  // собранный билд, ради которой потолок сделан растущим, а не постоянным.
  assert.ok(VAMPIRISM_RATE_DEEP / VAMPIRISM_RATE_EARLY >= 3, 'глубина почти ничего не добавляет');
  assert.ok(vampiricBudget(200, 1) >= 1, 'копилка пуста у живого героя');
  assert.equal(vampiricBudget(0, 1), 0);
});

/**
 * Стоять в ближнем бою и лечиться быстрее, чем бьют, нельзя ни на одном этаже.
 *
 * Это и есть ответ на страх Ивана — и именно поэтому потолок считается на
 * секунду, а не на удар. Он ограничивает не силу билда, а одно сочетание:
 * быстрое оружие, превращающее двадцать процентов с удара в непрерывный
 * поток. Между боями вампиризм лечит ровно столько же, сколько лечил.
 */
test('лечение никогда не обгоняет одного монстра своего этажа', () => {
  for (const depth of [1, 3, 6, 9, 12, 15, 18, 24]) {
    const удар = ударЭтажа(depth);
    const maxHp = здоровьеГероя(depth);
    // Броня у героя щедрая — и всё равно не спасает от того, что урон проходит.
    const броня = 6 + depth;
    const доля = mitigateDamage(удар.заУдар, броня) / удар.заУдар;
    const входящее = удар.вСекунду * доля;
    const лечение = vampiricBudget(maxHp, depth, generateDungeon({ seed: 11, depth }).scaling.entry.pressure);
    assert.ok(входящее > 0, `этаж ${depth}: по герою не попадают вовсе`);
    assert.ok(
      лечение < входящее,
      `этаж ${depth}: вампиризм лечит ${лечение} в секунду против ${входящее.toFixed(0)} входящих`,
    );
  }
});

/**
 * Но и запирать силу нельзя: потолок обязан оставаться заметным.
 *
 * Если он опустится настолько, что вампиризм перестанет что-то значить, мы
 * почините одну проблему и заведём другую — «крутой билд» станет невозможен, о
 * чём Иван и просил не забывать.
 */
test('потолок остаётся заметной величиной, а не формальностью', () => {
  // Вход в подземелье (этажи 1–3) нарочно тише — там и потолок ниже; заметным
  // он обязан быть с того этажа, где бой идёт в полную силу.
  for (const depth of [4, 9, 18]) {
    const maxHp = здоровьеГероя(depth);
    const доля = vampiricBudget(maxHp, depth) / maxHp;
    assert.ok(доля >= 0.06, `этаж ${depth}: вампиризм лечит всего ${(доля * 100).toFixed(0)}% в секунду`);
  }
  // На глубине он возвращает пятую часть полосы в секунду — этого хватает,
  // чтобы между боями восстанавливаться быстрее любого зелья.
  const глубоко = здоровьеГероя(18);
  assert.ok(vampiricBudget(глубоко, 18) / глубоко >= 0.2);
});
