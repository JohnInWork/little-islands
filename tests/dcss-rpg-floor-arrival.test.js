import assert from 'node:assert/strict';
import test from 'node:test';

import { RUN_BRANCHES } from '../tools/dcss-rpg-content.js';
import { ROAD_NAMES, floorArrivalModel, roman } from '../tools/dcss-rpg-floor-arrival.js';

test('заставка называет этаж, главу и дорогу на обоих языках', () => {
  assert.deepEqual(
    { ...floorArrivalModel({ depth: 7, branch: 'crypt', language: 'ru' }) },
    { title: 'VII', subtitle: 'Глава II · Склепы', guardian: false },
  );
  assert.equal(floorArrivalModel({ depth: 1, branch: 'deep', language: 'en' }).subtitle, 'Chapter I · The caves');
  assert.equal(floorArrivalModel({ depth: 0, language: 'en' }).title, 'Town');
});

test('последний этаж главы предупреждает о страже, а за дорогой глав нет', () => {
  const lair = floorArrivalModel({ depth: 12, branch: 'deep' });
  assert.equal(lair.guardian, true);
  assert.match(lair.subtitle, /Логово стража$/);
  assert.match(floorArrivalModel({ depth: 20, branch: 'hell' }).subtitle, /^За концом дороги · Ад$/);
  assert.equal(roman(18), 'XVIII');
  assert.equal(roman(24), 'XXIV');
});

test('у каждой дороги есть имя', () => {
  for (const branch of RUN_BRANCHES) {
    assert.ok(ROAD_NAMES[branch]?.ru && ROAD_NAMES[branch]?.en, `${branch}: дорога без имени`);
  }
  assert.throws(() => floorArrivalModel({ depth: -1 }), TypeError);
});
