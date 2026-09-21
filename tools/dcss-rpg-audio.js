/**
 * Audio: every game sound is a short recorded CC0 sample (no synthesised
 * voices — players hear real impacts, cloth, coins and creatures). This module
 * owns the sample map, the persisted settings and the menu model; `dcss.js`
 * only loads files and plays buffers through one master gain.
 */

export const AUDIO_SETTINGS_KEY = 'dng-codex:audio:v1';
export const AUDIO_VOLUME_STEP = 0.1;
export const AUDIO_DEFAULTS = Object.freeze({ volume: 0.7, muted: false });

/** Relative to `tools/dcss.html`; the build copies `public/assets/audio` next to it. */
export const AUDIO_SAMPLE_ROOT = '../assets/audio/';

const sample = (files, gain) => Object.freeze({ files: Object.freeze([files].flat()), gain });

/**
 * Sound id → files and mix gain. Several files mean a random variation per
 * play. Files are peak-normalised to −3 dBFS, so the gain alone sets how loud
 * an event sits in the mix; nothing here may exceed 1.
 */
export const SOUND_SAMPLES = Object.freeze({
  'hit-blade': sample(['sfx/hit-blade-1.mp3', 'sfx/hit-blade-2.mp3', 'sfx/hit-blade-3.mp3'], 0.45),
  'hit-heavy': sample(['sfx/hit-heavy-1.mp3', 'sfx/hit-heavy-2.mp3', 'sfx/hit-heavy-3.mp3'], 0.5),
  'hit-projectile': sample(['sfx/hit-projectile-1.mp3', 'sfx/hit-projectile-2.mp3', 'sfx/hit-projectile-3.mp3'], 0.4),
  'hero-hurt': sample(['sfx/hero-hurt-1.mp3', 'sfx/hero-hurt-2.mp3', 'sfx/hero-hurt-3.mp3'], 0.45),
  block: sample(['sfx/block-1.mp3', 'sfx/block-2.mp3', 'sfx/block-3.mp3'], 0.35),
  kill: sample(['sfx/kill-1.mp3', 'sfx/kill-2.mp3', 'sfx/kill-3.mp3', 'sfx/kill-4.mp3'], 0.45),
  pickup: sample(['sfx/pickup-1.mp3', 'sfx/pickup-2.mp3'], 0.4),
  gold: sample(['sfx/gold-1.mp3', 'sfx/gold-2.mp3'], 0.4),
  door: sample('sfx/door.mp3', 0.45),
  chest: sample('sfx/chest.mp3', 0.4),
  descend: sample('sfx/descend.mp3', 0.5),
  'spell-fire': sample('sfx/spell-fire.mp3', 0.4),
  'spell-heal': sample('sfx/spell-heal.mp3', 0.4),
  'spell-ice': sample('sfx/spell-ice.mp3', 0.4),
  'spell-toggle': sample('sfx/spell-toggle.mp3', 0.3),
  storm: sample('sfx/storm.mp3', 0.5),
  'sword-accent': sample('sfx/sword-accent.mp3', 0.45),
  'level-up': sample('sfx/level-up.mp3', 0.45),
  eat: sample(['sfx/eat-1.mp3', 'sfx/eat-2.mp3'], 0.4),
  drink: sample('sfx/drink.mp3', 0.4),
  read: sample(['sfx/read-1.mp3', 'sfx/read-2.mp3'], 0.35),
  trap: sample('sfx/trap.mp3', 0.5),
  death: sample(['sfx/death-1.mp3', 'sfx/death-2.mp3'], 0.55),
  // The same two events in a woman's voice. Separate ids rather than a branch
  // inside one, so the preloader fetches both sets and a hero who changes
  // appearance mid-run never waits for a file.
  'hero-hurt-f': sample(['sfx/hero-hurt-f-1.mp3', 'sfx/hero-hurt-f-2.mp3', 'sfx/hero-hurt-f-3.mp3'], 0.45),
  'death-f': sample(['sfx/death-f-1.mp3', 'sfx/death-f-2.mp3'], 0.55),
  victory: sample('sfx/victory.mp3', 0.5),
  'ui-tap': sample(['sfx/ui-tap-1.mp3', 'sfx/ui-tap-2.mp3'], 0.25),
  'ui-close': sample('sfx/ui-close.mp3', 0.22),
  splash: sample(['sfx/splash-1.mp3', 'sfx/splash-2.mp3'], 0.35),
});

export const SOUND_IDS = Object.freeze(Object.keys(SOUND_SAMPLES));

/**
 * The two sounds that are the hero's own voice, and what they become when the
 * hero is a woman. Everything else — blades, coins, doors — belongs to the
 * world and sounds the same whoever is holding the sword.
 */
const FEMALE_VOICE = Object.freeze({ 'hero-hurt': 'hero-hurt-f', death: 'death-f' });

export function heroVoiceSound(soundId, voice) {
  return voice === 'female' ? FEMALE_VOICE[soundId] ?? soundId : soundId;
}

/** One recorded dungeon loop for every chapter palette; the gain differs a little. */
/**
 * Постель этажа: гул, на котором всё стоит.
 *
 * Палитр двадцать семь, и до сих пор все они играли один и тот же файл — в
 * подземелье, в лесу и в городе одинаково. Иван послушал новые записи и
 * сказал: «прям нравятся, они отличные». Теперь их четыре, и палитры разложены
 * по ним по смыслу: камень, пещера, холод, зелень. Громкость у каждой своя —
 * она и раньше была своя, менялся только файл.
 */
export const AMBIENT_SAMPLES = Object.freeze({
  slate: sample('ambience/stone-hall.mp3', 0.14),
  ochre: sample('ambience/stone-hall.mp3', 0.12),
  ice: sample('ambience/cold-cave.mp3', 0.1),
  ember: sample('ambience/stone-hall.mp3', 0.16),
  town: sample('ambience/green-wood.mp3', 0.1),
  bone: sample('ambience/stone-hall.mp3', 0.11),
  prism: sample('ambience/deep-cave.mp3', 0.09),
  verdigris: sample('ambience/deep-cave.mp3', 0.13),
  mold: sample('ambience/deep-cave.mp3', 0.12),
  viscera: sample('ambience/stone-hall.mp3', 0.17),
  moss: sample('ambience/green-wood.mp3', 0.11),
  cobalt: sample('ambience/deep-cave.mp3', 0.12),
  magma: sample('ambience/stone-hall.mp3', 0.18),
  loam: sample('ambience/stone-hall.mp3', 0.13),
  iron: sample('ambience/stone-hall.mp3', 0.15),
  sepia: sample('ambience/stone-hall.mp3', 0.12),
  coal: sample('ambience/stone-hall.mp3', 0.14),
  autumn: sample('ambience/green-wood.mp3', 0.09),
  bog: sample('ambience/deep-cave.mp3', 0.13),
  meadow: sample('ambience/green-wood.mp3', 0.08),
  dusk: sample('ambience/deep-cave.mp3', 0.11),
  hamlet: sample('ambience/green-wood.mp3', 0.1),
  bramble: sample('ambience/green-wood.mp3', 0.12),
  frost: sample('ambience/cold-cave.mp3', 0.08),
  scorch: sample('ambience/stone-hall.mp3', 0.1),
  heath: sample('ambience/green-wood.mp3', 0.09),
  verdant: sample('ambience/green-wood.mp3', 0.12),
});

/**
 * Мелодия поверх гула: по одной на дорогу, а не на палитру.
 *
 * Иван: «хотел бы какую-нибудь прям мелодию для каждой темы… простенькую,
 * чтобы запоминалась, но не сильную музыку». Тем в игре двадцать семь, и
 * двадцать семь мелодий не запомнит никто; дорог шесть, и каждая звучит
 * достаточно долго, чтобы её тема успела стать своей.
 *
 * Громкость вдвое ниже, чем у гула, и это не осторожность, а расчёт: дрон
 * можно слушать час и не заметить, а мелодия повторяется слышно. Тише и
 * длиннее — единственный способ, которым она не надоест к третьему этажу.
 */
export const MUSIC_SAMPLES = Object.freeze({
  // Город стоит на той же дороге, что и спуск под ним, а звучать обязан иначе:
  // ключ `city` не ветка, а место, и спрашивается он по глубине.
  city: sample('music/inn.mp3', 0.07),
  surface: sample('music/town.mp3', 0.06),
  deep: sample('music/cave.mp3', 0.06),
  // Хранилища, склепы и ад пока молчат: своей темы у них нет, а чужая — хуже
  // тишины. Молчание здесь — не заглушка, а решение: `musicSample` возвращает
  // null для дороги без темы, и второй слой просто не заводится.
});

export const AUDIO_SAMPLE_FILES = Object.freeze([...new Set([
  ...Object.values(SOUND_SAMPLES).flatMap(({ files }) => files),
  ...Object.values(AMBIENT_SAMPLES).flatMap(({ files }) => files),
  ...Object.values(MUSIC_SAMPLES).flatMap(({ files }) => files),
])]);

export function soundSample(id) {
  return SOUND_SAMPLES[id] ?? null;
}

/** Дорога без своей мелодии молчит: тишина честнее чужой темы. */
export function musicSample(branchId) {
  return MUSIC_SAMPLES[branchId] ?? null;
}

/** Unknown palettes fall back to the slate bed instead of silence. */
export function ambientSample(paletteId) {
  return AMBIENT_SAMPLES[paletteId] ?? AMBIENT_SAMPLES.slate;
}

/** Picks a variation from a roll in [0, 1); the adapter passes Math.random(). */
export function pickSampleFile(entry, roll = 0) {
  const files = entry?.files ?? [];
  if (files.length === 0) return null;
  const index = Math.min(files.length - 1, Math.max(0, Math.floor((Number.isFinite(roll) ? roll : 0) * files.length)));
  return files[index];
}

const SAMPLE_FILE_PATTERN = /^(sfx|ambience|music)\/[a-z0-9-]+\.mp3$/;

/** Catalog invariants for the test suite: paths, gains and unique variations. */
export function audioSampleProblems() {
  const problems = [];
  const check = (where, entry) => {
    if (!Array.isArray(entry?.files) || entry.files.length === 0) problems.push(`${where}:files`);
    for (const file of entry?.files ?? []) {
      if (typeof file !== 'string' || !SAMPLE_FILE_PATTERN.test(file)) problems.push(`${where}:file:${file}`);
    }
    if (new Set(entry?.files ?? []).size !== (entry?.files ?? []).length) problems.push(`${where}:duplicate`);
    if (!Number.isFinite(entry?.gain) || entry.gain <= 0 || entry.gain > 1) problems.push(`${where}:gain`);
  };
  for (const [id, entry] of Object.entries(SOUND_SAMPLES)) {
    check(`sample:${id}`, entry);
    if (!entry.files.every((file) => file.startsWith('sfx/'))) problems.push(`sample:${id}:folder`);
  }
  for (const [id, entry] of Object.entries(AMBIENT_SAMPLES)) {
    check(`ambient:${id}`, entry);
    if (!entry.files.every((file) => file.startsWith('ambience/'))) problems.push(`ambient:${id}:folder`);
  }
  for (const [id, entry] of Object.entries(MUSIC_SAMPLES)) {
    check(`music:${id}`, entry);
    if (!entry.files.every((file) => file.startsWith('music/'))) problems.push(`music:${id}:folder`);
    // Мелодия обязана быть тише гула той же глубины, иначе она начнёт вести.
    if (entry.gain > 0.1) problems.push(`music:${id}:loud`);
  }
  return problems;
}

function clampVolume(value) {
  if (!Number.isFinite(value)) return AUDIO_DEFAULTS.volume;
  const stepped = Math.round(Math.min(1, Math.max(0, value)) / AUDIO_VOLUME_STEP) * AUDIO_VOLUME_STEP;
  return Math.round(stepped * 100) / 100;
}

export function createAudioSettings(source = null) {
  return Object.freeze({
    volume: clampVolume(source?.volume),
    muted: source?.muted === true,
  });
}

/** Reads the stored document; garbage or a foreign shape falls back to defaults. */
export function parseAudioSettings(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return createAudioSettings();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return createAudioSettings();
    return createAudioSettings(parsed);
  } catch {
    return createAudioSettings();
  }
}

export function serializeAudioSettings(settings) {
  const normalized = createAudioSettings(settings);
  return JSON.stringify({ volume: normalized.volume, muted: normalized.muted });
}

export function adjustAudioVolume(settings, delta) {
  const current = createAudioSettings(settings);
  return createAudioSettings({ volume: current.volume + delta, muted: current.muted });
}

export function toggleAudioMute(settings) {
  const current = createAudioSettings(settings);
  return createAudioSettings({ volume: current.volume, muted: !current.muted });
}

export function effectiveVolume(settings) {
  const current = createAudioSettings(settings);
  return current.muted ? 0 : current.volume;
}

const MENU_COPY = Object.freeze({
  ru: Object.freeze({
    group: 'Звук',
    mute: 'Выключить звук',
    unmute: 'Включить звук',
    quieter: 'Тише',
    louder: 'Громче',
    muted: 'Выкл',
  }),
  en: Object.freeze({
    group: 'Sound',
    mute: 'Mute sound',
    unmute: 'Unmute sound',
    quieter: 'Quieter',
    louder: 'Louder',
    muted: 'Off',
  }),
});

export function audioMenuModel(settings, language = 'ru') {
  const current = createAudioSettings(settings);
  const copy = MENU_COPY[language === 'en' ? 'en' : 'ru'];
  return Object.freeze({
    groupLabel: copy.group,
    muted: current.muted,
    muteLabel: current.muted ? copy.unmute : copy.mute,
    muteGlyph: current.muted ? '×' : '♪',
    volumePercent: Math.round(current.volume * 100),
    volumeText: current.muted ? copy.muted : `${Math.round(current.volume * 100)}%`,
    quieterLabel: copy.quieter,
    louderLabel: copy.louder,
    canLower: current.volume > 0,
    canRaise: current.volume < 1,
  });
}
