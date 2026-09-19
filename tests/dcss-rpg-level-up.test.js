import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  LEVEL_UP_PRESENTATION_MS,
  levelUpPresentation,
} from '../tools/dcss-rpg-level-up.js';

test('one earned level presents one freely spendable point in both languages', () => {
  assert.equal(LEVEL_UP_PRESENTATION_MS, 1450);
  assert.deepEqual(levelUpPresentation({
    level: 2, levelsGained: 1, skillPointsGained: 1, language: 'ru',
  }), {
    level: '2', points: '+1', announcement: 'Новый уровень 2. Получено 1 очко навыка.',
  });
  assert.deepEqual(levelUpPresentation({
    level: 2, levelsGained: 1, skillPointsGained: 1, language: 'en',
  }), {
    level: '2', points: '+1', announcement: 'Level 2. Gained 1 skill point.',
  });
});

test('multiple levels combine into one accurate celebration and zero gain stays silent', () => {
  assert.deepEqual(levelUpPresentation({
    level: 4, levelsGained: 3, skillPointsGained: 3, language: 'ru',
  }), {
    level: '4', points: '+3', announcement: 'Новый уровень 4. Получено 3 очка навыка.',
  });
  assert.equal(levelUpPresentation({ level: 4, levelsGained: 0, skillPointsGained: 0 }), null);
  for (const input of [
    { level: 2, levelsGained: 1, skillPointsGained: 0 },
    { level: 2, levelsGained: 1, skillPointsGained: 2 },
    { level: 1, levelsGained: 1, skillPointsGained: 1 },
    { level: NaN, levelsGained: 1, skillPointsGained: 1 },
  ]) assert.throws(() => levelUpPresentation(input));
});

test('runtime level-up feedback is event-driven, non-modal and pixel styled', async () => {
  const [html, css, runtime] = await Promise.all([
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /id="level-up-celebration"[\s\S]*aria-live="assertive"[\s\S]*hidden/);
  assert.match(html, /id="level-up-label">НОВЫЙ УРОВЕНЬ/);
  assert.doesNotMatch(html, /id="level-up-dialog"/);
  assert.match(css, /\.level-up-celebration\s*{[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.level-up-celebration\.visible \.level-up-mark/);
  assert.match(css, /animation:\s*level-up-arrival 1450ms steps\(10, end\)/);
  assert.match(runtime, /function showLevelUpCelebration\(progression\)/);
  assert.match(runtime, /itemDetailLanguage === 'ru' \? 'НОВЫЙ УРОВЕНЬ' : 'LEVEL UP'/);
  assert.match(runtime, /showLevelUpCelebration\(progression\)/);
  assert.doesNotMatch(runtime, /uiScreen = 'levelup'/);
  assert.match(runtime, /hud\.classList\.add\('skill-point-awarded'\)/);
  assert.match(runtime, /beginHitStop\(0\.09\)/);
  assert.match(runtime, /playLevelUpChime\(progression\.levelsGained\)/);
});

/**
 * «Когда игрок получает уровень, должно что-то происходить... должно быть
 * торжественно, прикольно.» It had a panel, a chime and one puff of sparks —
 * correct, and over before the player had looked up.
 */
test('a new level lights the floor the hero is standing on', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  const flare = runtime.slice(runtime.indexOf('function levelUpFlare('));
  const body = flare.slice(0, flare.indexOf('\nfunction showLevelUpCelebration'));
  assert.ok(body.length > 0, 'nothing happens');
  // A column of gold off the hero, using the drifting particles the game has.
  assert.match(body, /drift: true/);
  // Two rings at different speeds read as one thing expanding, not as a blink.
  assert.equal((body.match(/addImpactWave\(/g) ?? []).length, 2);
  // And the floor is genuinely brighter while it lasts.
  assert.match(runtime, /id: 'hero-level-up'/);
  assert.match(runtime, /radius: 1\.4 \+ levelUpGlow \* 2\.6/);
  assert.match(runtime, /function updateLevelUpGlow\(delta\)/);
  // Reduced motion keeps the panel and the chime and skips the spectacle.
  const show = runtime.slice(runtime.indexOf('function showLevelUpCelebration('));
  assert.match(show.slice(0, 1400), /if \(!reducedMotion\) \{[\s\S]*levelUpFlare\(progression\.levelsGained\)/);
});
