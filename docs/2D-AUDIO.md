# DNG Codex — звук

Все звуки игры — короткие записанные CC0-сэмплы: удары, ткань, монеты, дверь,
шаги, голоса существ. Синтезированных голосов нет: пока файл не декодирован,
событие молчит, а не подменяется писком. Каталог `public/assets/audio/`
(~1 МБ, моно MP3 44,1 кГц, пик −3 dBFS) с `LICENSE.md`, где каждый файл
сопоставлен оригиналу и автору.

## Контракт

Файл: `tools/dcss-rpg-audio.js` (чистый); загрузка файлов, буферы и master
gain — `tools/dcss.js`.

- `SOUND_SAMPLES` — карта `id → { files, gain }`. Несколько файлов = случайная
  вариация при каждом воспроизведении (`pickSampleFile(entry, roll)` берёт
  элемент по броску в [0; 1)). События: `hit-blade`, `hit-heavy`,
  `hit-projectile`, `hero-hurt`, `block`, `kill`, `pickup`, `gold`, `door`,
  `descend`, `spell-fire`, `spell-heal`, `spell-ice`, `spell-toggle`, `storm`,
  `sword-accent`, `level-up`, `eat`, `drink`, `read`, `trap`, `death`,
  `victory`, `ui-tap`, `ui-close`.
- `AMBIENT_SAMPLES` — петля подземелья на палитру главы (`slate`, `ochre`,
  `ice`, `ember`) со своим `gain`; неизвестная палитра падает в `slate`.
- `AUDIO_SAMPLE_ROOT` (`../assets/audio/` от `tools/dcss.html`),
  `AUDIO_SAMPLE_FILES` (уникальные файлы для предзагрузки),
  `audioSampleProblems()` — пути вида `sfx|ambience/<kebab>.mp3`, `gain` в
  (0; 1], без дублей внутри одной записи.
- Настройки: один документ `dng-codex:audio:v1` в localStorage
  (`{ volume: 0…1 шагом 0,1, muted }`), не входят в save забега. Мусор в
  хранилище заменяется значениями по умолчанию (70 %, звук включён).
- `audioMenuModel()` даёт RU/EN подписи для ряда в главном меню: mute,
  «Тише», текущий процент, «Громче».

## Адаптер

- Один AudioContext и один master gain; меню меняет только его.
  `playSound(id, { volume })` молчит, пока контекст не разблокирован жестом
  или громкость равна нулю; `volume` умножает `gain` записи (ранг ритма мечей,
  число целей молнии, двойной уровень).
- После первого жеста `preloadAudioSamples()` тянет все файлы `fetch` +
  `decodeAudioData` в кэш по имени файла; неудача запоминается как `null` и не
  повторяется. Файл, которого ещё нет в кэше, ставится на загрузку, а событие
  пропускается молча.
- Фон: `startAmbient(paletteId)` зацикливает петлю через отдельный gain
  (пауза приглушает, смерть и победа останавливают); если новая палитра
  использует ту же запись, меняется только уровень. Пока петля не
  декодирована, `startAmbient` ждёт загрузку и стартует сам, если запрос не
  был отменён `stopAmbient()`.
- Старые точки (`playLevelUpChime`, `playSwordRhythmAccent`,
  `playStormCrackle`) сохранили имена и сигнатуры, но играют записи
  `level-up`, `sword-accent`, `storm`.

## Как добавить звук

1. Файл только CC0/public domain: моно MP3 44,1 кГц, пик −3 dBFS, короткий,
   без музыки и «зала»; положить в `public/assets/audio/sfx/`, добавить строку
   в `public/assets/audio/LICENSE.md` (оригинал, автор, источник) и, если
   источник новый, в `THIRD_PARTY_ASSETS.md`.
2. Запись в `SOUND_SAMPLES` (`gain` 0,2…0,55; вариации массивом); прогнать
   `tests/dcss-rpg-audio.test.js` — он проверяет наличие файла, размер и строку
   в уведомлении.
3. Один вызов `playSound('id')` в точке события адаптера после того, как чистая
   команда подтвердила результат. Звук не решает исход и не выдаёт награды.
4. Runtime‑тесты, которые запускают функции адаптера в `vm`, получают заглушки
   `playSound`, `startAmbient`, `stopAmbient`, `setAmbientLevel`.

Не возвращать синтезированные голоса (игрок отверг их как «писки»), не
создавать второй AudioContext, не использовать `new Audio()` в обход master
gain.
