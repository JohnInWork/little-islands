import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ASSIST_SHARE,
  HERO_BASE,
  LEVEL_GAIN,
  MAX_LEVEL,
  REVIVE_SECONDS,
  awardKill,
  canDescend,
  coopHeroStats,
  createCoopHero,
  experienceForLevel,
  levelFromExperience,
  partyAlive,
  reviveHero,
  statsForLevel,
  tickRevive,
} from '../tools/dcss-rpg-coop.js';

test('кривая опыта растёт, но не отвесно, и уровень читается обратно', () => {
  const first = experienceForLevel(1);
  const tenth = experienceForLevel(10);
  assert.ok(first > 0 && tenth > first);
  // Десятый уровень дороже первого, но не в сто раз: вечер вдвоём должен
  // укладываться в вечер.
  assert.ok(tenth / first < 30, `десятый дороже первого в ${(tenth / first).toFixed(1)} раз`);

  assert.deepEqual(levelFromExperience(0), { level: 1, into: 0, need: first });
  assert.equal(levelFromExperience(first).level, 2);
  assert.equal(levelFromExperience(first - 1).level, 1);
  assert.equal(levelFromExperience(first + 3).into, 3);
  // Потолок не переступается ни от какого числа.
  assert.equal(levelFromExperience(1e9).level, MAX_LEVEL);
  assert.equal(levelFromExperience(1e9).need, 0);
  assert.equal(levelFromExperience(-5).level, 1);
  assert.throws(() => experienceForLevel(0), RangeError);
});

test('уровень действительно что-то даёт, и это видно в числах', () => {
  const one = statsForLevel(1);
  const five = statsForLevel(5);
  assert.deepEqual(one, {
    maxHp: HERO_BASE.maxHp, attack: HERO_BASE.attack, defense: HERO_BASE.defense, speed: HERO_BASE.speed,
  });
  assert.equal(five.maxHp, HERO_BASE.maxHp + 4 * LEVEL_GAIN.maxHp);
  assert.equal(five.attack, HERO_BASE.attack + 4 * LEVEL_GAIN.attack);
  // Выше потолка числа не растут.
  assert.deepEqual(statsForLevel(MAX_LEVEL + 10), statsForLevel(MAX_LEVEL));
});

test('два героя растут по отдельности, а не общим счётом', () => {
  const one = createCoopHero({ slot: 1 });
  const two = createCoopHero({ slot: 2 });
  assert.equal(one.hp, HERO_BASE.maxHp);
  assert.throws(() => createCoopHero({ slot: 3 }), RangeError);

  // Убил первый, второй рядом: опыт делится, но не поровну.
  awardKill({ killer: one, assist: two, xp: 100, gold: 7, nearby: true });
  assert.equal(one.xp, 100);
  assert.equal(one.gold, 7);
  assert.equal(two.xp, 100 * ASSIST_SHARE);
  assert.equal(two.gold, 0, 'золото достаётся тому, кто добил');

  // Второй далеко — не получает ничего: иначе выгодно не драться.
  awardKill({ killer: one, assist: two, xp: 100, nearby: false });
  assert.equal(two.xp, 50);
  assert.equal(one.kills, 2);
});

test('несомое добавляет удар, но не трогает чужого героя', () => {
  const one = createCoopHero({ slot: 1 });
  const two = createCoopHero({ slot: 2 });
  one.pack = [{ id: 'rusty-sword', attack: 4 }];
  assert.equal(coopHeroStats(one).attack, HERO_BASE.attack + 4);
  assert.equal(coopHeroStats(two).attack, HERO_BASE.attack);
  one.xp = experienceForLevel(1);
  assert.equal(coopHeroStats(one).level, 2);
  assert.equal(coopHeroStats(two).level, 1);
});

test('упавшего поднимает второй, и только пока сам стоит', () => {
  const fallen = createCoopHero({ slot: 1 });
  const helper = createCoopHero({ slot: 2 });
  fallen.downed = 1;

  assert.deepEqual(tickRevive({ downed: helper, helper: fallen, delta: 1 }),
    { reviving: false, progress: 0, revived: false }, 'стоящего поднимать не надо');

  let progress = 0;
  for (let step = 0; step < REVIVE_SECONDS - 1; step += 1) {
    const tick = tickRevive({ downed: fallen, helper, delta: 1 });
    assert.equal(tick.reviving, true);
    assert.equal(tick.revived, false);
    progress = tick.progress;
    fallen.revives = progress;
  }
  assert.equal(tickRevive({ downed: fallen, helper, delta: 1 }).revived, true);

  // Помощник сам упал — подъём останавливается, а не продолжается сам собой.
  helper.downed = 1;
  assert.deepEqual(tickRevive({ downed: fallen, helper, delta: 1 }),
    { reviving: false, progress: fallen.revives, revived: false });

  helper.downed = 0;
  fallen.xp = experienceForLevel(1) * 3;
  reviveHero(fallen);
  assert.equal(fallen.downed, 0);
  assert.equal(fallen.revives, 0);
  const { maxHp } = coopHeroStats(fallen);
  assert.ok(fallen.hp > 0 && fallen.hp < maxHp, 'подъём не отменяет падение');
});

test('отряд жив, пока жив хоть кто-то, а вниз идут вместе', () => {
  const one = createCoopHero({ slot: 1 });
  const two = createCoopHero({ slot: 2 });
  const party = [one, two];
  assert.equal(partyAlive(party), true);
  one.downed = 1;
  assert.equal(partyAlive(party), true);
  two.downed = 1;
  assert.equal(partyAlive(party), false);

  one.downed = 0;
  two.downed = 0;
  const stair = new Set();
  const onStair = (hero) => stair.has(hero.slot);
  assert.equal(canDescend({ party, onStair }), false);
  stair.add(1);
  assert.equal(canDescend({ party, onStair }), false, 'лестница ждёт обоих');
  stair.add(2);
  assert.equal(canDescend({ party, onStair }), true);
  // Упавший на лестнице не считается стоящим на ней.
  two.downed = 1;
  assert.equal(canDescend({ party, onStair }), false);
  assert.equal(canDescend({ party: [], onStair }), false);
});
