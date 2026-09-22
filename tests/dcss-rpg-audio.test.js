import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

import {
  AMBIENT_SAMPLES,
  AUDIO_DEFAULTS,
  AUDIO_SAMPLE_FILES,
  AUDIO_SAMPLE_ROOT,
  AUDIO_SETTINGS_KEY,
  MUSIC_SAMPLES,
  SOUND_IDS,
  SOUND_SAMPLES,
  adjustAudioVolume,
  adjustMusicVolume,
  ambientSample,
  audioMenuModel,
  audioSampleProblems,
  createAudioSettings,
  effectiveVolume,
  effectiveMusicVolume,
  musicSample,
  toggleMusicMute,
  parseAudioSettings,
  pickSampleFile,
  serializeAudioSettings,
  soundSample,
  toggleAudioMute,
} from '../tools/dcss-rpg-audio.js';
import { DUNGEON_THEME_CATALOG } from '../tools/dcss-rpg-room-plans.js';
import { ATMOSPHERE_THEMES } from '../tools/dcss-rpg-visuals.js';

const GAME_EVENTS = [
  'hit-blade', 'hit-heavy', 'hit-projectile', 'hero-hurt', 'block', 'kill', 'pickup', 'gold',
  'door', 'chest', 'descend', 'spell-fire', 'spell-heal', 'spell-ice', 'spell-toggle', 'storm', 'sword-accent',
  'level-up', 'eat', 'drink', 'read', 'trap', 'death', 'victory', 'ui-tap', 'ui-close',
];

test('every game event maps to recorded samples with sane gains and variations', () => {
  assert.deepEqual(audioSampleProblems(), []);
  assert.equal(AUDIO_SAMPLE_ROOT, '../assets/audio/');
  for (const id of GAME_EVENTS) {
    assert.ok(SOUND_IDS.includes(id), id);
    assert.ok(Object.isFrozen(soundSample(id)) && Object.isFrozen(soundSample(id).files), id);
  }
  assert.equal(soundSample('nope'), null);
  for (const id of ['hit-blade', 'hit-heavy', 'hero-hurt', 'kill', 'death', 'eat', 'gold', 'ui-tap']) {
    assert.ok(soundSample(id).files.length >= 2, `${id} varies between plays`);
  }
  assert.ok(Object.values(SOUND_SAMPLES).every(({ gain }) => gain > 0 && gain <= 1));
  const kill = soundSample('kill');
  assert.equal(pickSampleFile(kill, 0), kill.files[0]);
  assert.equal(pickSampleFile(kill, 0.999), kill.files.at(-1));
  assert.equal(pickSampleFile(kill, Number.NaN), kill.files[0]);
  assert.equal(pickSampleFile(soundSample('door'), 0.7), 'sfx/door.mp3');
  assert.equal(pickSampleFile(null), null);
  assert.equal(new Set(AUDIO_SAMPLE_FILES).size, AUDIO_SAMPLE_FILES.length);
});

test('each chapter palette has an ambient loop and unknown palettes fall back to slate', () => {
  for (const paletteId of Object.keys(ATMOSPHERE_THEMES)) {
    assert.ok(AMBIENT_SAMPLES[paletteId], `ambient for ${paletteId}`);
  }
  for (const theme of DUNGEON_THEME_CATALOG) {
    assert.ok(AMBIENT_SAMPLES[theme.atmosphereId], `ambient for ${theme.atmosphereId}`);
  }
  assert.equal(ambientSample('unknown'), AMBIENT_SAMPLES.slate);
  assert.ok(Object.isFrozen(ambientSample('ember')));
  assert.ok(Object.values(AMBIENT_SAMPLES).every(({ gain }) => gain > 0 && gain <= 0.3), 'beds stay under the effects');
});

test('every sample ships on disk, stays small and is listed in the CC0 notice', async () => {
  const root = new URL('../public/assets/audio/', import.meta.url);
  const notice = await readFile(new URL('LICENSE.md', root), 'utf8');
  const thirdParty = await readFile(new URL('../THIRD_PARTY_ASSETS.md', import.meta.url), 'utf8');
  for (const file of AUDIO_SAMPLE_FILES) {
    const size = (await stat(new URL(file, root))).size;
    assert.ok(size > 500, `${file} is not empty`);
    /*
     * Потолки разные, потому что роли разные: удар длится полсекунды, гул —
     * две минуты, мелодия — дольше всех и всё же обязана оставаться петлёй, а
     * не саундтреком на десять мегабайт.
     */
    const потолок = file.startsWith('ambience/') ? 1_000_000
      : file.startsWith('music/') ? 2_000_000
        : 60_000;
    assert.ok(size < потолок, `${file} stays small`);
    assert.ok(notice.includes(`\`${file}\``), `${file} is listed in the notice`);
  }
  assert.match(notice, /CC0 1\.0/);
  assert.doesNotMatch(notice, /CC-BY|CC BY/, 'only public-domain samples ship');
  for (const author of ['Kenney', 'artisticdude', 'JaggedStone']) {
    assert.ok(notice.includes(author), `${author} in the notice`);
    assert.ok(thirdParty.includes(author), `${author} in THIRD_PARTY_ASSETS`);
  }
  assert.match(thirdParty, /public\/assets\/audio\/LICENSE\.md/);
});

test('audio settings persist as one strict document with stepped volume', () => {
  assert.equal(AUDIO_SETTINGS_KEY, 'dng-codex:audio:v1');
  assert.deepEqual(createAudioSettings(), AUDIO_DEFAULTS);
  // Музыка живёт в том же документе: её ручка добавилась позже, и настройки,
  // записанные до неё, читаются как «музыка по умолчанию», а не как ноль.
  const по = (over) => ({ ...AUDIO_DEFAULTS, ...over });
  assert.deepEqual(createAudioSettings({ volume: 0.44, muted: 'yes' }), по({ volume: 0.4 }));
  assert.deepEqual(createAudioSettings({ volume: 7, muted: true }), по({ volume: 1, muted: true }));
  assert.deepEqual(parseAudioSettings('{"volume":0.3,"muted":true}'), по({ volume: 0.3, muted: true }));
  assert.deepEqual(parseAudioSettings('not json'), AUDIO_DEFAULTS);
  assert.deepEqual(parseAudioSettings('[1,2]'), AUDIO_DEFAULTS);
  assert.deepEqual(parseAudioSettings(null), AUDIO_DEFAULTS);
  assert.equal(
    serializeAudioSettings({ volume: 0.5, muted: false }),
    '{"volume":0.5,"muted":false,"musicVolume":0.7,"musicMuted":false}',
  );
  assert.deepEqual(adjustAudioVolume(по({ volume: 0.7 }), 0.1), по({ volume: 0.8 }));
  assert.deepEqual(adjustAudioVolume(по({ volume: 0.1 }), -0.3), по({ volume: 0 }));
  assert.deepEqual(adjustAudioVolume(по({ volume: 1, muted: true }), 0.1), по({ volume: 1, muted: true }));
  assert.deepEqual(toggleAudioMute(по({ volume: 0.6 })), по({ volume: 0.6, muted: true }));
  assert.equal(effectiveVolume({ volume: 0.6, muted: true }), 0);
  assert.equal(effectiveVolume({ volume: 0.6, muted: false }), 0.6);
  assert.ok(Object.isFrozen(createAudioSettings()));

  /*
   * Ручка музыки своя, но под общей.
   *
   * Иван: «так как у нас появилась музыка, надо отдельную настройку для неё —
   * громкость и мут». Отдельная — значит мелодию можно убрать, не выключая
   * ударов и шагов; под общей — значит «выключить звук» по-прежнему выключает
   * всё, иначе надпись на кнопке врёт.
   */
  assert.deepEqual(adjustMusicVolume(по({ musicVolume: 0.7 }), -0.2), по({ musicVolume: 0.5 }));
  assert.deepEqual(toggleMusicMute(по({})), по({ musicMuted: true }));
  assert.equal(effectiveMusicVolume(по({ musicVolume: 0.5 })), 0.5);
  assert.equal(effectiveMusicVolume(по({ musicVolume: 0.5, musicMuted: true })), 0);
  assert.equal(effectiveMusicVolume(по({ musicVolume: 0.5, muted: true })), 0, 'общий мут не глушит музыку');
  // Громкость звука при этом не трогается ни одной из музыкальных ручек.
  assert.equal(effectiveVolume(toggleMusicMute(по({ volume: 0.6 }))), 0.6);
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

test('the runtime plays only recorded buffers through one master gain and hooks the game events', async () => {
  const [runtime, html, css] = await Promise.all([
    readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.html', import.meta.url), 'utf8'),
    readFile(new URL('../tools/dcss.css', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(runtime, /createOscillator|createPeriodicWave/, 'no synthesised voices remain');
  assert.doesNotMatch(runtime, /gain\.connect\(audio\.destination\)/, 'every voice uses the master gain');
  assert.doesNotMatch(runtime, /new Audio\(/, 'no HTMLAudioElement side channel');
  assert.match(runtime, /function audioOutput\(/);
  assert.match(runtime, /function playSound\(id, \{ volume = 1 \} = \{\}\)/);
  assert.match(runtime, /const file = pickSampleFile\(sample, Math\.random\(\)\);/);
  assert.match(runtime, /if \(buffer === undefined\) loadAudioSample\(audio, file\);\s+return false;/, 'silence, not a substitute, while a file loads');
  assert.match(runtime, /const audioSampleRoot = new URL\(AUDIO_SAMPLE_ROOT, document\.baseURI\);/);
  assert.match(runtime, /levelUpAudio = new AudioContextConstructor\(\);\s+preloadAudioSamples\(levelUpAudio\);/);
  assert.match(runtime, /audio\.decodeAudioData\(bytes, resolve, reject\)/);
  assert.match(runtime, /source\.loop = true;[\s\S]*sampleGain\.connect\(gain\);/, 'the ambient loop goes through the ambient gain, so pause and mute apply');
  assert.match(runtime, /localStorage\.getItem\(AUDIO_SETTINGS_KEY\)/);
  assert.match(runtime, /serializeAudioSettings\(audioSettings\)/);
  for (const hook of [
    "playSound(projectile ? 'hit-projectile' : style === 'heavy' ? 'hit-heavy' : 'hit-blade')",
    "playSound('kill')",
    "playSound(fullyBlocked ? 'block' : heroVoice('hero-hurt'))",
    "playSound(heroVoice('death'))",
    "playSound('gold')",
    "playSound('pickup')",
    "playSound('door')",
    "playSound('chest')",
    "playSound('descend')",
    "playSound('spell-heal')",
    "playSound('spell-toggle')",
    "playSound('trap')",
    "playSound('victory')",
    "playSound('ui-tap')",
    "playSound('level-up', { volume: levelsGained > 1 ? 1.15 : 1 })",
    "playSound('sword-accent', { volume:",
    "playSound('storm', { volume:",
  ]) {
    assert.ok(runtime.includes(hook), hook);
  }
  assert.match(html, /id="main-menu-audio"[\s\S]*id="audio-mute"[\s\S]*id="audio-volume-down"[\s\S]*id="audio-volume-value"[\s\S]*id="audio-volume-up"/);
  assert.match(css, /\.main-menu-audio\s*{/);
});

/**
 * A woman cried out in a man's voice. The body is chosen in the appearance
 * editor and the game has drawn it from the start — it simply never listened to
 * it. Only the two sounds that are the hero's own voice change: a blade, a coin
 * and a door belong to the world and sound the same whoever is holding them.
 */
test('the hero is hurt and dies in her own voice', async () => {
  const { heroVoiceSound, SOUND_SAMPLES } = await import('../tools/dcss-rpg-audio.js');
  const { playerVoice, PLAYER_BODY_OPTIONS } = await import('../tools/dcss-rpg-appearance.js');

  assert.equal(playerVoice({ bodyId: 'human-f' }), 'female');
  assert.equal(playerVoice({ bodyId: 'human-m' }), 'male');
  assert.equal(playerVoice(null), 'male', 'an unknown body is not a crash');
  // Тел стало шестнадцать, и голос у каждого свой: проверяем, что женским
  // кричит не только человеческая женщина.
  assert.equal(playerVoice({ bodyId: 'elf-f' }), 'female');
  assert.ok(PLAYER_BODY_OPTIONS.length >= 8);
  for (const тело of PLAYER_BODY_OPTIONS) {
    assert.equal(playerVoice({ bodyId: тело.id }), тело.voice, `${тело.id}: голос не совпал с телом`);
  }
  assert.equal(
    PLAYER_BODY_OPTIONS.filter(({ voice }) => voice === 'female').length,
    PLAYER_BODY_OPTIONS.length / 2,
    'у каждой расы должны быть оба голоса',
  );

  assert.equal(heroVoiceSound('hero-hurt', 'female'), 'hero-hurt-f');
  assert.equal(heroVoiceSound('death', 'female'), 'death-f');
  assert.equal(heroVoiceSound('hero-hurt', 'male'), 'hero-hurt');
  assert.equal(heroVoiceSound('death', 'male'), 'death');
  // Everything else is the world, not the hero, and never changes.
  for (const soundId of ['kill', 'block', 'gold', 'door', 'trap', 'victory']) {
    assert.equal(heroVoiceSound(soundId, 'female'), soundId, `${soundId} is not a voice`);
  }

  // Both sets are real entries with real variation, so neither is a stub.
  for (const soundId of ['hero-hurt-f', 'death-f']) {
    assert.ok(SOUND_SAMPLES[soundId], `${soundId} is in the catalogue`);
    assert.ok(SOUND_SAMPLES[soundId].files.length >= 2, `${soundId} varies between plays`);
  }
  assert.equal(SOUND_SAMPLES['hero-hurt-f'].gain, SOUND_SAMPLES['hero-hurt'].gain, 'both voices sit at the same level');
  assert.equal(SOUND_SAMPLES['death-f'].gain, SOUND_SAMPLES.death.gain);

  // And the runtime asks the appearance, not a constant.
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.match(runtime, /heroVoiceSound\(soundId, playerVoice\(playerAppearance\)\)/);
});

/**
 * Мелодия — второй слой, и он обязан оставаться вторым.
 *
 * Гул можно слушать час и не заметить; мелодия повторяется слышно, и если она
 * окажется громче постели того же места, дорога начнёт звучать как заставка.
 * Поэтому у каждой темы потолок вдвое ниже, чем у гула, и это проверяется, а
 * не остаётся в комментарии.
 */
test('у города своя тема, а дорога без темы честно молчит', () => {
  assert.ok(MUSIC_SAMPLES.city, 'город стоит на ветке спуска — без своего ключа он играл бы пещеру');
  assert.notEqual(MUSIC_SAMPLES.city.files[0], MUSIC_SAMPLES.deep.files[0]);
  // Все шесть дорог и бой со стражем теперь звучат; молчание осталось правилом
  // для ключа, которого нет, и это по-прежнему null, а не чужая музыка.
  assert.equal(musicSample('нет такой дороги'), null, 'неизвестный ключ вернул чужую музыку');
  assert.equal(musicSample('нет такой дороги'), null);
  for (const [road, entry] of Object.entries(MUSIC_SAMPLES)) {
    assert.ok(entry.gain > 0 && entry.gain <= 0.1, `${road}: мелодия громче гула`);
    assert.ok(entry.files.every((file) => file.startsWith('music/')), `${road}: файл не из music/`);
  }
  assert.deepEqual(audioSampleProblems(), []);
});

/**
 * Город — место, а не ветка.
 *
 * `run.branch` на площади — та же `deep`, что и в пещере под ней: город лежит
 * в начале спуска и своей ветки не имеет. Пока мелодию просили по ветке, город
 * и подземелье звучали одинаково. Ключ спрашивается по глубине, и проверяется
 * это на самом адаптере: правило живёт там, где им пользуются.
 */
test('адаптер спрашивает мелодию у места, а не только у ветки', async () => {
  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  assert.ok(
    runtime.includes("return isCityDepth(run.depth) ? 'city' : run.branch;"),
    'адаптер больше не различает город и ветку под ним',
  );
  assert.equal(runtime.includes('startMusic(run.branch)'), false, 'где-то мелодию всё ещё просят у ветки');
  // Все три пробуждения звука — одно и то же правило, иначе слои разъедутся.
  // Четвёртое место — начало и конец боя со стражем: он тоже меняет ключ.
  assert.equal(runtime.split('startMusic(musicRoad())').length - 1, 4);
});

/** Авторы фона и мелодий названы в титрах, а не только в файле рядом с mp3. */
test('титры называют авторов фона и мелодий', async () => {
  const { CREDITS_SECTIONS } = await import('../tools/dcss-rpg-credits.js');
  const audio = CREDITS_SECTIONS.find((entry) => entry.id === 'audio');
  assert.ok(audio, 'в титрах нет раздела звука');
  const notice = await readFile(new URL('../public/assets/audio/LICENSE.md', import.meta.url), 'utf8');
  for (const author of [
    'RandomMind', 'cynicmusic', 'Brandon75689', 'pauliuw', 'Paul Wortmann', 'JaggedStone',
    'josepharaoh99', 'Joth', 'Cleyton Kauffman',
  ]) {
    assert.ok(notice.includes(author), `${author}: нет в лицензии рядом с файлами`);
    for (const locale of ['ru', 'en']) {
      assert.ok(
        audio[locale].lines.join(' ').includes(author),
        `${author}: не назван в титрах (${locale})`,
      );
    }
  }
});

/**
 * Бой со стражем — событие, а не дорога.
 *
 * Мелодия боя начинается там же, где появляется полоса стража: игрок видит
 * полосу и слышит смену — это одно и то же событие, и расходиться им нельзя.
 * Дальше она держится, пока страж жив, и не мигает от того, что он зашёл за
 * колонну: бой кончается смертью, а не потерей из виду.
 */
test('у боя со стражем своя тема, и она громче дорожных', async () => {
  assert.ok(MUSIC_SAMPLES.boss, 'боя со стражем нечем озвучить');
  for (const road of ['city', 'surface', 'deep', 'vaults', 'crypt', 'hell']) {
    assert.ok(MUSIC_SAMPLES[road], `${road}: дорога осталась без темы`);
    assert.ok(
      MUSIC_SAMPLES.boss.gain > MUSIC_SAMPLES[road].gain,
      `бой не громче дороги ${road}`,
    );
  }

  const runtime = await readFile(new URL('../tools/dcss.js', import.meta.url), 'utf8');
  // Ключ решает одна функция: и дорога, и бой приходят из неё.
  assert.match(runtime, /if \(bossMusicOn\) return 'boss';/);
  // Начинается по тому же условию, что полоса стража, и держится, пока он жив.
  assert.match(runtime, /const идёт = bossMusicOn\s*\n\s*\? Boolean\(boss\)/);
  assert.match(runtime, /refreshBossMusic\(\);\s*\n\s*const boss = activeBoss\(\);/);
  // Новый этаж начинается без чужого боя.
  assert.match(runtime, /bossMusicOn = false;\s*\n\s*startMusic\(musicRoad\(\)\);/);
});
