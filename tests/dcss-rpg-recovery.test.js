import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CALM_DELAY_SECONDS,
  CALM_PERCENT_PER_SECOND,
  calmRecovery,
} from '../tools/dcss-rpg-recovery.js';

test('wounds close slowly, and only in quiet', () => {
  const quiet = { hp: 40, maxHp: 100, seconds: 10, calmSeconds: CALM_DELAY_SECONDS + 1, hungerStageId: 'fed' };
  assert.equal(calmRecovery(quiet).healed, 4, '0.4% of the bar a second');
  assert.equal(calmRecovery({ ...quiet, calmSeconds: CALM_DELAY_SECONDS - 1 }).healed, 0, 'not straight after a blow');
  assert.equal(calmRecovery({ ...quiet, hungerStageId: 'strong' }).healed, 0, 'not on an empty stomach');
  assert.equal(calmRecovery({ ...quiet, hp: 100 }).healed, 0);
  assert.equal(calmRecovery({ ...quiet, hp: 0 }).healed, 0, 'the dead stay dead');
  assert.equal(calmRecovery({ ...quiet, hp: 99 }).healed, 1, 'never past the bar');
});

test('a full bar takes minutes of quiet, and short frames lose nothing', () => {
  assert.ok(100 / CALM_PERCENT_PER_SECOND >= 200, 'slower than any potion');
  let carry = 0;
  let healed = 0;
  for (let second = 0; second < 25; second += 1) {
    const step = calmRecovery({ hp: 40 + healed, maxHp: 100, seconds: 1, calmSeconds: 60, hungerStageId: 'mild', carry });
    healed += step.healed;
    carry = step.carry;
  }
  assert.equal(healed, 10, 'twenty-five one-second frames heal what one long frame would');
});
