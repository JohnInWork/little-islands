import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attackContactRatio,
  attackCrossedContact,
  combatImpactProfile,
  heroAttackMotion,
  heroAttackTrail,
  monsterAttackMotion,
} from '../tools/dcss-rpg-combat-motion.js';

test('every combat style resolves once after anticipation and before recovery', () => {
  for (const style of ['unarmed', 'blade', 'heavy', 'spear', 'staff', 'bow']) {
    const duration = 0.7;
    let previous = duration;
    let contacts = 0;
    for (let frame = 0; frame < 30; frame += 1) {
      const next = Math.max(0, previous - 0.04);
      if (attackCrossedContact(previous, next, duration, style)) contacts += 1;
      previous = next;
    }
    assert.equal(contacts, 1, style);
    assert.ok(attackContactRatio(style) > 0.35 && attackContactRatio(style) < 0.7);
  }
});

test('contact detection survives a slow frame without resolving at attack start', () => {
  assert.equal(attackCrossedContact(0.6, 0.56, 0.6, 'heavy'), false);
  assert.equal(attackCrossedContact(0.6, 0, 0.6, 'heavy'), true);
  assert.equal(attackCrossedContact(0, 0, 0.6, 'heavy'), false);
});

test('hero motion has anticipation, contact and a bounded settled recovery', () => {
  const duration = 0.6;
  const anticipation = heroAttackMotion(duration * 0.72, duration, 'heavy');
  const contact = heroAttackMotion(duration * 0.4, duration, 'heavy');
  const settled = heroAttackMotion(0, duration, 'heavy');
  assert.equal(anticipation.stage, 'anticipation');
  assert.ok(anticipation.lunge < 0);
  assert.equal(contact.stage, 'contact');
  assert.ok(contact.lunge > 0);
  assert.deepEqual(settled, { progress: 1, stage: 'idle', lunge: 0, scaleX: 1, scaleY: 1, swing: 0 });
});

test('enemy tells pull back before lunging and recover without moving in reduced motion', () => {
  const early = monsterAttackMotion({ windup: 0.4, windupDuration: 0.5, recovery: 0, angle: 0 });
  const late = monsterAttackMotion({ windup: 0.04, windupDuration: 0.5, recovery: 0, angle: 0 });
  const recovery = monsterAttackMotion({ windup: 0, windupDuration: 0.5, recovery: 0.18, angle: 0 });
  assert.ok(early.dx < 0);
  assert.ok(late.dx > 0);
  assert.ok(recovery.dx > 0);
  assert.deepEqual(
    monsterAttackMotion({ windup: 0.04, windupDuration: 0.5, recovery: 0, angle: 0, reducedMotion: true }),
    { dx: 0, dy: 0, scaleX: 1, scaleY: 1 },
  );
});

test('weapon impacts share one readable hierarchy and heavy attacks stagger', () => {
  const blade = combatImpactProfile('blade');
  const heavy = combatImpactProfile('heavy');
  const boss = combatImpactProfile('heavy', { boss: true });
  assert.equal(blade.staggers, false);
  assert.equal(heavy.staggers, true);
  assert.ok(heavy.shake > blade.shake);
  assert.ok(boss.waveSize > heavy.waveSize);
  assert.ok(boss.hitStop <= 0.08);
});

test('pixel attack trails communicate distinct weapon silhouettes without unbounded geometry', () => {
  const blade = heroAttackTrail('blade', 0.5);
  const heavy = heroAttackTrail('heavy', 0.5);
  const masteredAxe = heroAttackTrail('heavy', 0.5, 3);
  const spear = heroAttackTrail('spear', 0.5);
  const staff = heroAttackTrail('staff', 0.5);
  assert.equal(blade.length, 5);
  assert.equal(heavy.length, 6);
  assert.equal(masteredAxe.length, 12);
  assert.ok(Math.max(...masteredAxe.map(({ y }) => Math.abs(y))) > Math.max(...heavy.map(({ y }) => Math.abs(y))));
  assert.ok(Math.max(...spear.map(({ x }) => x)) > Math.max(...blade.map(({ x }) => x)));
  assert.notDeepEqual(staff, spear);
  for (const point of [...blade, ...heavy, ...masteredAxe, ...spear, ...staff]) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(point.size >= 3 && point.size <= 7);
    assert.ok(point.alpha >= 0 && point.alpha <= 1);
  }
});
