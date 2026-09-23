/**
 * Яркость изображения — настройка игрока, а не правка картинки.
 *
 * Подземелье задумано тёмным, и на мониторе это атмосфера. На телефоне днём
 * средний кадр первого этажа — около 11 из 255: враг сливается с полом.
 * Картинку по умолчанию это не меняет — 100% остаётся как нарисовано, — но
 * игрок может поднять её сам. Хранится рядом с громкостью, не в сохранении
 * забега: это свойство экрана, а не героя.
 */

export const DISPLAY_SETTINGS_KEY = 'dng-codex:display:v1';
export const BRIGHTNESS_STEPS = Object.freeze([100, 125, 150, 175]);
export const DISPLAY_DEFAULTS = Object.freeze({ brightness: 100 });

export function createDisplaySettings(source = null) {
  const brightness = BRIGHTNESS_STEPS.includes(source?.brightness) ? source.brightness : DISPLAY_DEFAULTS.brightness;
  return Object.freeze({ brightness });
}

/** Шаг вверх или вниз по лестнице яркости; за краями лестницы ничего нет. */
export function stepBrightness(settings, direction) {
  const current = createDisplaySettings(settings);
  const index = BRIGHTNESS_STEPS.indexOf(current.brightness);
  const next = BRIGHTNESS_STEPS[Math.max(0, Math.min(BRIGHTNESS_STEPS.length - 1, index + Math.sign(direction)))];
  return createDisplaySettings({ brightness: next });
}

const COPY = Object.freeze({
  ru: Object.freeze({ group: 'Яркость', darker: 'Темнее', brighter: 'Светлее' }),
  en: Object.freeze({ group: 'Brightness', darker: 'Darker', brighter: 'Brighter' }),
});

export function displayMenuModel(settings, language = 'ru') {
  const current = createDisplaySettings(settings);
  const copy = COPY[language === 'en' ? 'en' : 'ru'];
  return Object.freeze({
    groupLabel: copy.group,
    valueText: `${current.brightness}%`,
    darkerLabel: copy.darker,
    brighterLabel: copy.brighter,
    canLower: current.brightness > BRIGHTNESS_STEPS[0],
    canRaise: current.brightness < BRIGHTNESS_STEPS.at(-1),
    // Множитель для CSS; при 100% фильтра нет вовсе — ноль лишней работы.
    filter: current.brightness === 100 ? null : current.brightness / 100,
  });
}
