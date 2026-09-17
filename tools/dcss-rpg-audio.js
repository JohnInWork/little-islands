/**
 * Audio: every sound is synthesised from a small data recipe (oscillator and
 * noise voices with short envelopes), so the game ships no audio files and
 * nothing here depends on a licence. This module owns the recipes, the
 * persisted settings and the menu model; `dcss.js` only schedules voices.
 */

export const AUDIO_SETTINGS_KEY = 'dng-codex:audio:v1';
export const AUDIO_VOLUME_STEP = 0.1;
export const AUDIO_DEFAULTS = Object.freeze({ volume: 0.7, muted: false });

const VOICE_TYPES = Object.freeze(['sine', 'square', 'triangle', 'sawtooth', 'noise']);

const voice = (type, from, to, gain, duration, extra = {}) => Object.freeze({
  type,
  from,
  to,
  gain,
  duration,
  delay: 0,
  attack: 0.006,
  ...extra,
});

/**
 * Short effects. Gains stay tiny on purpose: everything mixes through one
 * master gain and the loudest layer of a hit should never clip a phone.
 */
export const SOUND_RECIPES = Object.freeze({
  'hit-blade': Object.freeze([
    voice('square', 520, 180, 0.03, 0.08),
    voice('noise', 3200, 900, 0.02, 0.06),
  ]),
  'hit-heavy': Object.freeze([
    voice('square', 240, 70, 0.04, 0.14),
    voice('noise', 1800, 400, 0.03, 0.12),
  ]),
  'hit-projectile': Object.freeze([
    voice('triangle', 900, 300, 0.022, 0.1),
    voice('noise', 2600, 700, 0.014, 0.08),
  ]),
  'hero-hurt': Object.freeze([
    voice('sawtooth', 200, 90, 0.03, 0.16),
    voice('noise', 1200, 300, 0.02, 0.12),
  ]),
  block: Object.freeze([
    voice('square', 1400, 700, 0.02, 0.05),
    voice('triangle', 700, 350, 0.018, 0.09, { delay: 0.02 }),
  ]),
  kill: Object.freeze([
    voice('square', 160, 50, 0.035, 0.22),
    voice('noise', 900, 200, 0.025, 0.18),
  ]),
  pickup: Object.freeze([
    voice('square', 660, 990, 0.022, 0.07),
    voice('square', 990, 1320, 0.02, 0.07, { delay: 0.07 }),
  ]),
  gold: Object.freeze([
    voice('triangle', 1320, 1320, 0.02, 0.06),
    voice('triangle', 1760, 1760, 0.02, 0.08, { delay: 0.05 }),
  ]),
  door: Object.freeze([
    voice('sawtooth', 140, 90, 0.028, 0.22),
    voice('noise', 500, 200, 0.018, 0.18),
  ]),
  descend: Object.freeze([
    voice('triangle', 330, 165, 0.03, 0.35),
    voice('triangle', 220, 110, 0.024, 0.45, { delay: 0.12 }),
  ]),
  'spell-fire': Object.freeze([
    voice('sawtooth', 300, 900, 0.026, 0.14),
    voice('noise', 2400, 600, 0.022, 0.16),
  ]),
  'spell-heal': Object.freeze([
    voice('sine', 523, 784, 0.026, 0.18),
    voice('sine', 784, 1046, 0.022, 0.2, { delay: 0.08 }),
  ]),
  'spell-ice': Object.freeze([
    voice('triangle', 1400, 2600, 0.022, 0.12),
    voice('sine', 2600, 1800, 0.018, 0.16, { delay: 0.06 }),
  ]),
  'spell-toggle': Object.freeze([
    voice('triangle', 440, 660, 0.024, 0.12),
  ]),
  eat: Object.freeze([
    voice('square', 220, 160, 0.022, 0.06),
    voice('square', 200, 140, 0.02, 0.06, { delay: 0.09 }),
  ]),
  drink: Object.freeze([
    voice('sine', 500, 900, 0.02, 0.12),
    voice('sine', 700, 1200, 0.018, 0.12, { delay: 0.06 }),
  ]),
  read: Object.freeze([
    voice('triangle', 880, 660, 0.02, 0.12),
    voice('triangle', 660, 990, 0.018, 0.14, { delay: 0.1 }),
  ]),
  trap: Object.freeze([
    voice('square', 90, 60, 0.04, 0.14),
    voice('noise', 2000, 500, 0.03, 0.1),
  ]),
  death: Object.freeze([
    voice('sawtooth', 220, 40, 0.04, 0.9),
    voice('noise', 800, 100, 0.03, 0.7),
  ]),
  victory: Object.freeze([
    voice('triangle', 523, 523, 0.03, 0.16),
    voice('triangle', 659, 659, 0.03, 0.16, { delay: 0.12 }),
    voice('triangle', 784, 784, 0.03, 0.16, { delay: 0.24 }),
    voice('triangle', 1046, 1046, 0.03, 0.42, { delay: 0.36 }),
  ]),
  'ui-tap': Object.freeze([
    voice('square', 1200, 1000, 0.012, 0.03),
  ]),
  'ui-close': Object.freeze([
    voice('square', 800, 500, 0.012, 0.05),
  ]),
});

export const SOUND_IDS = Object.freeze(Object.keys(SOUND_RECIPES));

/**
 * Ambient beds per chapter palette: a couple of low drones, a filtered noise
 * floor and a slow swell. Everything loops for as long as the floor lasts.
 */
export const AMBIENT_RECIPES = Object.freeze({
  slate: Object.freeze({
    drones: Object.freeze([
      Object.freeze({ type: 'sine', frequency: 55, gain: 0.05 }),
      Object.freeze({ type: 'triangle', frequency: 82.5, gain: 0.018 }),
    ]),
    noise: Object.freeze({ gain: 0.012, cutoff: 260 }),
    swell: Object.freeze({ period: 9, depth: 0.35 }),
  }),
  ochre: Object.freeze({
    drones: Object.freeze([
      Object.freeze({ type: 'sine', frequency: 49, gain: 0.05 }),
      Object.freeze({ type: 'sine', frequency: 73.4, gain: 0.02 }),
    ]),
    noise: Object.freeze({ gain: 0.01, cutoff: 200 }),
    swell: Object.freeze({ period: 11, depth: 0.3 }),
  }),
  ice: Object.freeze({
    drones: Object.freeze([
      Object.freeze({ type: 'sine', frequency: 110, gain: 0.03 }),
      Object.freeze({ type: 'sine', frequency: 165, gain: 0.014 }),
    ]),
    noise: Object.freeze({ gain: 0.014, cutoff: 1200 }),
    swell: Object.freeze({ period: 7, depth: 0.45 }),
  }),
  ember: Object.freeze({
    drones: Object.freeze([
      Object.freeze({ type: 'sine', frequency: 65.4, gain: 0.05 }),
      Object.freeze({ type: 'sawtooth', frequency: 98, gain: 0.006 }),
    ]),
    noise: Object.freeze({ gain: 0.016, cutoff: 900 }),
    swell: Object.freeze({ period: 5, depth: 0.5 }),
  }),
});

export function soundRecipe(id) {
  return SOUND_RECIPES[id] ?? null;
}

export function ambientRecipe(paletteId) {
  return AMBIENT_RECIPES[paletteId] ?? AMBIENT_RECIPES.slate;
}

/** Bounds every recipe must respect; the test suite runs this over the catalog. */
export function soundRecipeProblems() {
  const problems = [];
  for (const [id, voices] of Object.entries(SOUND_RECIPES)) {
    if (!Array.isArray(voices) || voices.length === 0) problems.push(`${id}:empty`);
    for (const [index, entry] of (voices ?? []).entries()) {
      const where = `${id}[${index}]`;
      if (!VOICE_TYPES.includes(entry.type)) problems.push(`${where}:type`);
      for (const key of ['from', 'to']) {
        if (!Number.isFinite(entry[key]) || entry[key] < 30 || entry[key] > 8000) problems.push(`${where}:${key}`);
      }
      if (!Number.isFinite(entry.gain) || entry.gain <= 0 || entry.gain > 0.06) problems.push(`${where}:gain`);
      if (!Number.isFinite(entry.duration) || entry.duration < 0.02 || entry.duration > 1.2) problems.push(`${where}:duration`);
      if (!Number.isFinite(entry.delay) || entry.delay < 0 || entry.delay > 0.6) problems.push(`${where}:delay`);
      if (!Number.isFinite(entry.attack) || entry.attack <= 0 || entry.attack >= entry.duration) problems.push(`${where}:attack`);
    }
  }
  for (const [id, recipe] of Object.entries(AMBIENT_RECIPES)) {
    if (!Array.isArray(recipe.drones) || recipe.drones.length === 0) problems.push(`${id}:drones`);
    for (const drone of recipe.drones ?? []) {
      if (!VOICE_TYPES.includes(drone.type) || drone.type === 'noise') problems.push(`${id}:drone-type`);
      if (!Number.isFinite(drone.frequency) || drone.frequency < 30 || drone.frequency > 400) problems.push(`${id}:drone-frequency`);
      if (!Number.isFinite(drone.gain) || drone.gain <= 0 || drone.gain > 0.06) problems.push(`${id}:drone-gain`);
    }
    if (!Number.isFinite(recipe.noise?.gain) || recipe.noise.gain <= 0 || recipe.noise.gain > 0.03) problems.push(`${id}:noise`);
    if (!Number.isFinite(recipe.swell?.period) || recipe.swell.period < 3 || recipe.swell.period > 20) problems.push(`${id}:swell`);
    if (!Number.isFinite(recipe.swell?.depth) || recipe.swell.depth < 0 || recipe.swell.depth > 0.8) problems.push(`${id}:swell-depth`);
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
