/**
 * Стрела уходит, даже если стрелок пошёл.
 *
 * Иван, играя на телефоне: «взял лук, стреляю, начинаю двигаться — выстрел
 * отменяется, и это бесполезно». Так и было: любой шаг гасил начатую атаку
 * целиком. Для меча это правда — замахнулся и ушёл значит не ударил, — а для
 * лука нет: тетива уже натянута. На телефоне же ходят пальцем по полу, и
 * между «прицелился» и «выстрелил» почти всегда успевает влезть шаг.
 *
 * Теперь шаг стрелу не съедает, а отпускает: попадание считается тем же
 * путём, каким его посчитал бы доигравший замах.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { attackContactRatio, attackCrossedContact } from '../tools/dcss-rpg-combat-motion.js';

const runtimeUrl = new URL('../tools/dcss.js', import.meta.url);

test('шаг отпускает выстрел, а не отменяет его', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  const body = runtime.match(/function commitHeroPath\([\s\S]*?\n\}/)?.[0];
  assert.ok(body, 'не нашлась функция, которая ставит герою путь');
  assert.match(
    body,
    /pendingAttack\?\.combat\?\.projectile\)\s*resolvePendingHeroAttack\(/,
    'шаг снова просто гасит начатую атаку вместе с выстрелом',
  );
  // Ближний бой шаг по-прежнему отменяет: иначе от удара нельзя будет уйти.
  assert.match(body, /hero\.pendingAttack = null;/);
});

test('досрочный спуск тетивы попадает в тот же момент, что и доигранный замах', () => {
  const duration = 0.5;
  // Любой момент до контакта: шаг отпускает стрелу, и попадание засчитывается.
  for (const remaining of [duration, duration * 0.9, duration * 0.5]) {
    const threshold = duration * (1 - attackContactRatio('bow'));
    if (remaining <= threshold) continue;
    assert.equal(attackCrossedContact(remaining, 0, duration, 'bow'), true);
  }
  // А если стрела уже ушла, второй раз она не уходит.
  const after = duration * (1 - attackContactRatio('bow')) - 0.001;
  assert.equal(attackCrossedContact(after, 0, duration, 'bow'), false);
});
