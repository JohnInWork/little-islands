import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  AMBIENT_RECIPES,
  AUDIO_DEFAULTS,
  AUDIO_SETTINGS_KEY,
  SOUND_IDS,
  SOUND_RECIPES,
  adjustAudioVolume,
  ambientRecipe,
  audioMenuModel,
  createAudioSettings,
  effectiveVolume,
  parseAudioSettings,
  serializeAudioSettings,
  soundRecipe,
  soundRecipeProblems,
  toggleAudioMute,
} from '../tools/dcss-rpg-audio.js';
import { DUNGEON_THEME_CATALOG } from '../tools/dcss-rpg-room-plans.js';
import { ATMOSPHERE_THEMES } from '../tools/dcss-rpg-visuals.js';

test('every synthesised sound stays inside safe bounds and covers the game events', () => {
  assert.deepEqual(soundRecipeProblems(), []);
  for (const id of [
    'hit-blade', 'hit-heavy', 'hit-projectile', 'hero-hurt', 'block', 'kill', 'pickup', 'gold',
    'door', 'descend', 'spell-fire', 'spell-heal', 'spell-ice', 'spell-toggle', 'eat', 'drink',
    'read', 'trap', 'death', 'victory', 'ui-tap', 'ui-close',
  ]) {
    assert.ok(SOUND_IDS.includes(id), id);
    assert.ok(Object.isFrozen(soundRecipe(id)));
  }
  assert.equal(soundRecipe('nope'), null);
  assert.ok(Object.values(SOUND_RECIPES).every((voices) => voices.every((entry) => entry.gain <= 0.06)));
});

test('each chapter palette has an ambient bed and unknown palettes fall back to slate', () => {
  for (const paletteId of Object.keys(ATMOSPHERE_THEMES)) {
    assert.ok(AMBIENT_RECIPES[paletteId], `ambient for ${paletteId}`);
  }
  for (const theme of DUNGEON_THEME_CATALOG) {
    assert.ok(AMBIENT_RECIPES[theme.atmosphereId], `ambient for ${theme.atmosphereId}`);
  }
  assert.equal(ambientRecipe('unknown'), AMBIENT_RECIPES.slate);
  assert.ok(Object.isFrozen(ambientRecipe('ember')));
});

test('audio settings persist as one strict document with stepped volume', () => {
  assert.equal(AUDIO_SETTINGS_KEY, 'dng-codex:audio:v1');
  assert.deepEqual(createAudioSettings(), AUDIO_DEFAULTS);
  assert.deepEqual(createAudioSettings({ volume: 0.44, muted: 'yes' }), { volume: 0.4, muted: false });
  assert.deepEqual(createAudioSettings({ volume: 7, muted: true }), { volume: 1, muted: true });
  assert.deepEqual(parseAudioSettings('{"volume":0.3,"muted":true}'), { volume: 0.3, muted: true });
  assert.deepEqual(parseAudioSettings('not json'), AUDIO_DEFAULTS);
  assert.deepEqual(parseAudioSettings('[1,2]'), AUDIO_DEFAULTS);
  assert.deepEqual(parseAudioSettings(null), AUDIO_DEFAULTS);
  assert.equal(serializeAudioSettings({ volume: 0.5, muted: false }), '{"volume":0.5,"muted":false}');
  assert.deepEqual(adjustAudioVolume({ volume: 0.7, muted: false }, 0.1), { volume: 0.8, muted: false });
  assert.deepEqual(adjustAudioVolume({ volume: 0.1, muted: false }, -0.3), { volume: 0, muted: false });
  assert.deepEqual(adjustAudioVolume({ volume: 1, muted: true }, 0.1), { volume: 1, muted: true });
  assert.deepEqual(toggleAudioMute({ volume: 0.6, muted: false }), { volume: 0.6, muted: true });
  assert.equal(effectiveVolume({ volume: 0.6, muted: true }), 0);
  assert.equal(effectiveVolume({ volume: 0.6, muted: false }), 0.6);
  assert.ok(Object.isFrozen(createAudioSettings()));
});

test('the menu model is bilingual and reflects mute and bounds', () => {
  const ru = audioMenuModel({ volume: 0.7, muted: false }, 'ru');
  assert.equal(ru.groupLabel, 'Звук');
  assert.equal(ru.muteLabel, 'Выключить звук');
  assert.equal(ru.muteGlyph, '♪');
  assert.equal(ru.volumeText, '70%');
  assert.equal(ru.canLower, true);
  assert.equal(ru.canRaise, true);
  const en = audioMenuModel({ volume: 1, muted: true }, 'en');
  assert.equal(en.groupLabel, 'Sound');
  assert.equal(en.muteLabel, 'Unmute sound');
  assert.equal(en.muteGlyph, '×');
  assert.equal(en.volumeText, 'Off');
  assert.equal(en.canRaise, false);
  assert.equal(audioMenuModel({ volume: 0, muted: false }).canLower, false);
});

test('the runtime routes every voice through one master gain and hooks the game events', async () => {
  const [runtime, html, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(runtime, /gain\.connect\(audio\.destination\)/, 'legacy voices must use the master gain');
  assert.match(runtime, /function audioOutput\(/);
  assert.match(runtime, /function playSound\(id/);
  assert.match(runtime, /function startAmbient\(/);
  assert.match(runtime, /localStorage\.getItem\(AUDIO_SETTINGS_KEY\)/);
  assert.match(runtime, /serializeAudioSettings\(audioSettings\)/);
  for (const hook of [
    "playSound(projectile ? 'hit-projectile' : style === 'heavy' ? 'hit-heavy' : 'hit-blade')",
    "playSound('kill')",
    "playSound(fullyBlocked ? 'block' : 'hero-hurt')",
    "playSound('death')",
    "playSound('gold')",
    "playSound('pickup')",
    "playSound('door')",
    "playSound('descend')",
    "playSound('spell-heal')",
    "playSound('spell-toggle')",
    "playSound('trap')",
    "playSound('victory')",
    "playSound('ui-tap')",
  ]) {
    assert.ok(runtime.includes(hook), hook);
  }
  assert.match(html, /id="main-menu-audio"[\s\S]*id="audio-mute"[\s\S]*id="audio-volume-down"[\s\S]*id="audio-volume-value"[\s\S]*id="audio-volume-up"/);
  assert.match(css, /\.main-menu-audio\s*{/);
});
