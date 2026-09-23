import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BRIGHTNESS_STEPS,
  createDisplaySettings,
  displayMenuModel,
  stepBrightness,
} from '../tools/dcss-rpg-display.js';

test('яркость по умолчанию — картинка как нарисована, и без фильтра', () => {
  assert.equal(createDisplaySettings().brightness, 100);
  assert.equal(displayMenuModel(null).filter, null);
  assert.equal(createDisplaySettings({ brightness: 999 }).brightness, 100, 'чужое значение не принимается');
});

test('яркость ходит по лестнице и не выходит за её края', () => {
  let settings = createDisplaySettings();
  for (const expected of BRIGHTNESS_STEPS.slice(1)) {
    settings = stepBrightness(settings, 1);
    assert.equal(settings.brightness, expected);
  }
  assert.equal(stepBrightness(settings, 1).brightness, BRIGHTNESS_STEPS.at(-1));
  assert.equal(displayMenuModel(settings).canRaise, false);
  assert.equal(displayMenuModel(settings, 'en').groupLabel, 'Brightness');
  assert.equal(displayMenuModel({ brightness: 150 }).filter, 1.5);
  assert.equal(stepBrightness({ brightness: 100 }, -1).brightness, 100);
});
